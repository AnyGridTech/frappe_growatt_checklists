// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
"use strict";
(() => {
  // frappe_growatt_checklists/doctype/initial_analysis/ts/FormEvents.ts
  var initial_analysis_utils = {
    fields_listener: (_form) => {
    },
    /**
     * Forces workflow transition to a specific state after user confirmation
     * @param form - The current form instance
     * @param workflow_state - The target workflow state to transition to
     */
    force_workflow_transition: async (form, workflow_state) => {
      const confirmDialog = frappe.confirm(
        __(`Are you sure you want to advance the workflow to '${workflow_state}'? This action will bypass permission checks.`),
        async () => {
          try {
            await agt.utils.update_workflow_state({
              doctype: form.doc.doctype,
              docname: form.doc.name,
              workflow_state,
              ignore_workflow_validation: true
            });
            frappe.show_alert({
              message: __(`Workflow successfully transitioned to '${workflow_state}'`),
              indicator: "green"
            }, 5);
            form.reload_doc();
          } catch (error) {
            console.error("Error forcing workflow transition:", error);
            frappe.msgprint({
              title: __("Workflow Transition Failed"),
              message: __(`Failed to transition workflow to '${workflow_state}'. Please try again or contact your system administrator.`),
              indicator: "red"
            });
          }
        },
        () => {
          console.log("Workflow transition cancelled by user");
        }
      );
      confirmDialog.set_primary_action(__("Yes, Continue"));
      confirmDialog.set_secondary_action_label(__("No, Cancel"));
    },
    /**
     * Verifica se as condições para avançar para "Finished" foram atendidas
     * @param form - O formulário atual
     * @returns true se todas as condições foram atendidas
     */
    check_finished_conditions: (form) => {
      const solution_description = form.doc["solution_description"] || "";
      const solution_select = form.doc["solution_select"];
      return solution_description.length >= 15 && !!solution_select;
    },
    /**
     * Verifica as condições e solicita transição para "Finished" se necessário
     * Esta função é chamada quando os campos relevantes mudam ou no refresh
     * @param form - O formulário atual
     */
    check_and_transition_to_finished: async (form) => {
      if (!form.doc.name || form.doc.__islocal) {
        return;
      }
      if (form.doc.workflow_state === "Finished") {
        return;
      }
      const conditions_met = initial_analysis_utils.check_finished_conditions(form);
      if (conditions_met) {
        await initial_analysis_utils.force_workflow_transition(form, "Finished");
      }
    }
  };
  frappe.ui.form.on(
    "Initial Analysis",
    {
      setup: async (form) => {
        await agt.corrections_tracker.run.run();
        initial_analysis_utils.fields_listener(form);
      },
      onload: async (form) => {
        initial_analysis_utils.fields_listener(form);
      },
      refresh: async (form) => {
        initial_analysis_utils.fields_listener(form);
        await initial_analysis_utils.check_and_transition_to_finished(form);
      },
      before_load: async (form) => {
        initial_analysis_utils.fields_listener(form);
      },
      validate: async (form) => {
        initial_analysis_utils.fields_listener(form);
      },
      before_workflow_action: async () => {
        await agt.workflow.validate();
      },
      // Event handler para quando solution_description muda
      solution_description: async (form) => {
        await initial_analysis_utils.check_and_transition_to_finished(form);
      },
      // Event handler para quando solution_select muda
      solution_select: async (form) => {
        await initial_analysis_utils.check_and_transition_to_finished(form);
      }
    }
  );

  // frappe_growatt_checklists/doctype/initial_analysis/ts/WorkflowPreActions.ts
  var preActions = {
    trigger_create_sn_into_db: async (frm) => {
      try {
        const serial_no = await agt.utils.get_value_from_any_doc(frm, "Ticket", "ticket_docname", "main_eqp_serial_no");
        if (!serial_no || typeof serial_no !== "string" || !serial_no.trim()) {
          throw new Error("Serial number not provided or invalid. Cannot proceed with Serial No creation.");
        }
        const db_sn = await frappe.db.get_value("Serial No", serial_no, ["serial_no", "item_code", "warehouse", "company", "status", "workflow_state"]).then((r) => r?.message).catch((e) => {
          console.error("Error fetching Serial No:", e);
          throw new Error("Failed to query Serial No from database: " + (e instanceof Error ? e.message : String(e)));
        });
        const service_partner_company = await agt.utils.get_value_from_any_doc(frm, "Ticket", "ticket_docname", "service_partner_company");
        if (!service_partner_company || typeof service_partner_company !== "string" || !service_partner_company.trim()) {
          throw new Error("Service partner company not defined. Cannot proceed with Serial No creation.");
        }
        const hasValidSerialNo = (sn) => {
          return !!(sn?.serial_no && sn?.item_code);
        };
        if (hasValidSerialNo(db_sn)) {
          console.log(`Serial No '${db_sn.serial_no}' already exists. Updating workflow state...`);
          await agt.utils.update_workflow_state({
            doctype: "Serial No",
            docname: db_sn.serial_no,
            workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
            ignore_workflow_validation: true
          });
          console.log(`\u2705 Serial No '${db_sn.serial_no}' workflow state updated successfully.`);
        } else {
          console.log(`Serial No '${serial_no}' does not exist. Creating new record...`);
          const item = await frappe.db.get_value("Item", { item_code: frm.doc["main_eqp_item_code"] }, ["item_name", "item_code"]).then((r) => r?.message).catch((e) => {
            console.error("Error fetching Item:", e);
            throw new Error("Failed to query Item from database: " + (e instanceof Error ? e.message : String(e)));
          });
          if (!item || !item.item_code) {
            throw new Error(`Item not found or invalid for item code: ${frm.doc["main_eqp_item_code"]}`);
          }
          const serialNoFields = {
            serial_no: { value: serial_no },
            item_code: { value: item.item_code },
            company: { value: service_partner_company },
            status: { value: "Active" }
          };
          const sn_docname = await agt.utils.doc.create_doc(
            "Serial No",
            { docname: "ticket_docname" },
            serialNoFields
          );
          if (!sn_docname || typeof sn_docname !== "string" || !sn_docname.trim()) {
            throw new Error("Failed to create Serial No - no valid document name returned.");
          }
          console.log(`\u2705 Serial No '${sn_docname}' created successfully.`);
          await agt.utils.update_workflow_state({
            doctype: "Serial No",
            docname: sn_docname,
            workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
            ignore_workflow_validation: true
          });
          console.log(`\u2705 Serial No '${sn_docname}' workflow state set successfully.`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("\u274C Error in trigger_create_sn_into_db:", errorMessage);
        throw new Error(`Serial No PreAction Failed: ${errorMessage}`);
      }
    },
    orchestrator_redirect: async (frm) => {
      try {
        if (typeof window !== "undefined") {
          const ticket_docname = frm?.doc["ticket_docname"];
          if (!ticket_docname) {
            console.warn("\u26A0\uFE0F ticket_docname not found. Skipping redirect.");
            return;
          }
          console.log(`\u{1F504} Redirecting to Ticket: ${ticket_docname}`);
          if (window.self !== window.top) {
            window.parent.postMessage({
              action: "frappe_iframe_close_and_redirect",
              target: `/app/ticket/${ticket_docname}`,
              docname: ticket_docname
            }, "*");
          } else {
            window.location.href = `/app/ticket/${ticket_docname}`;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("\u274C Error in orchestrator_redirect:", errorMessage);
      }
    }
  };
  var wp = {
    [agt.metadata.doctype.initial_analysis.workflow_action.finish.name]: {
      "Create Serial No.": preActions.trigger_create_sn_into_db,
      "Orchestrator Pre Actions": preActions.orchestrator_redirect
    }
  };
  frappe.ui.form.on("Initial Analysis", "before_load", async () => {
    if (!globalThis.workflow_preactions) {
      globalThis.workflow_preactions = {};
    }
    Object.assign(globalThis.workflow_preactions, wp);
  });

  // frappe_growatt_checklists/doctype/initial_analysis/ts/WorkflowValidations.ts
  var workflow_validations = [
    {
      workflow_action: agt.metadata.doctype.initial_analysis.workflow_action.finish.name,
      workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
      workflow_fields: [
        {
          name: "ticket_docname",
          depends_on: (frm) => {
            if (!frm.doc.ticket_docname) {
              return "The Ticket reference is missing. Cannot proceed without it.";
            }
            return void 0;
          }
        },
        {
          name: "main_eqp_purchase_invoice",
          depends_on: (frm) => {
            if (!frm.doc.main_eqp_purchase_invoice) {
              return "The purchase invoice must be attached to proceed with checklist creation.";
            }
            return void 0;
          }
        },
        {
          name: "main_eqp_serial_no_label_picture",
          depends_on: (frm) => {
            if (!frm.doc.main_eqp_serial_no_label_picture) {
              return "The serial number label must be attached to proceed with checklist creation.";
            }
            return void 0;
          }
        },
        {
          name: "ext_fault_date",
          depends_on: (frm) => {
            if (!frm.doc.ext_fault_date) {
              return "The failure date must be provided to proceed with checklist creation.";
            }
            return void 0;
          }
        },
        {
          name: "ext_fault_code",
          depends_on: (frm) => {
            if (!frm.doc.ext_fault_code) {
              return "The failure code must be provided to proceed with checklist creation.";
            }
            return void 0;
          }
        },
        {
          name: "ext_fault_description",
          depends_on: (frm) => {
            if (!frm.doc.ext_fault_description) {
              return "The failure description must be provided to proceed with checklist creation.";
            }
            return void 0;
          }
        },
        {
          name: "ext_fault_customer_description",
          depends_on: (frm) => {
            const desc = frm.doc.ext_fault_customer_description;
            if (!desc) {
              return "The customer's failure description must be provided to proceed with checklist creation.";
            }
            if (desc.length < 15) {
              return `The customer's failure description must have at least 15 characters (current: ${desc.length}).`;
            }
            return void 0;
          }
        },
        {
          name: "solution_description",
          depends_on: (frm) => {
            const desc = frm.doc.solution_description;
            if (!desc) {
              return "The solution description must be provided to proceed with checklist creation.";
            }
            if (desc.length < 15) {
              return `The solution description must have at least 15 characters (current: ${desc.length}).`;
            }
            return void 0;
          }
        },
        {
          name: "solution_select",
          depends_on: (frm) => {
            const solution = frm.doc.solution_select;
            if (!solution) {
              return "The solution must be selected to proceed with checklist creation.";
            }
            return void 0;
          }
        }
      ]
    }
  ];
  if (!globalThis.workflow_validations) {
    globalThis.workflow_validations = [];
  }
  globalThis.workflow_validations.push(...workflow_validations);
})();
