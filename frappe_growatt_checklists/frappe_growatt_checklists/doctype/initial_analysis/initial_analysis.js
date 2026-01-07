// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
"use strict";
(() => {
  // frappe_growatt_checklists/doctype/initial_analysis/ts/AutoTransitions.ts
  var AutoTransitions = {
    /**
     * Main entry point for auto-transitions
     * Checks all possible auto-transitions and executes them if conditions are met
     */
    run: async (form) => {
      await AutoTransitions.to_finished(form);
    },
    /**
     * Redirects to Ticket page with a loading modal
     * @param ticket_docname - The ticket document name to redirect to
     */
    redirect_to_ticket: async (ticket_docname) => {
      if (!ticket_docname) {
        console.warn("\u26A0\uFE0F No ticket docname provided, skipping redirect");
        return;
      }
      const redirectTitle = "Redirecting to Ticket";
      const redirectMessage = "You will be redirected to the ticket. It is important that you stay on that page to proceed to the next step.";
      console.log(`Preparing to redirect to Ticket: ${ticket_docname}`);
      const removeTabCloseHandler = agt.utils.dialog.prevent_tab_close();
      agt.utils.dialog.show_loading_modal(redirectTitle, redirectMessage);
      removeTabCloseHandler();
      setTimeout(() => {
        console.log(`Redirecting to ticket: ${ticket_docname}`);
        window.location.href = `/app/ticket/${ticket_docname}`;
      }, 100);
    },
    /**
     * Auto-transition to "Finished" state
     * Checks if all required conditions are met and triggers the transition
     */
    to_finished: async (form) => {
      const stateTarget = agt.metadata.doctype.initial_analysis.workflow_state.finished.name;
      if (!form.doc.name || form.doc.__islocal || form.doc.workflow_state === stateTarget) {
        return;
      }
      const validations = [
        { field: "ticket_docname", check: () => !!form.doc.ticket_docname },
        { field: "ext_fault_date", check: () => !!form.doc.ext_fault_date },
        { field: "ext_fault_code", check: () => !!form.doc.ext_fault_code },
        { field: "ext_fault_description", check: () => !!form.doc.ext_fault_description },
        {
          field: "ext_fault_customer_description",
          check: () => {
            const desc = form.doc.ext_fault_customer_description;
            return desc && desc.length >= 15;
          }
        },
        {
          field: "solution_description",
          check: () => {
            const desc = form.doc["solution_description"];
            return desc && desc.length >= 15;
          }
        },
        { field: "solution_select", check: () => !!form.doc["solution_select"] }
      ];
      for (const validation of validations) {
        if (!validation.check()) {
          console.log(`\u26A0\uFE0F Auto-transition to Finished blocked: validation failed for field '${validation.field}'`);
          return;
        }
      }
      console.log("\u2705 All validations passed for auto-transition to Finished");
      await AutoTransitions.force_workflow_transition(form, stateTarget);
    },
    /**
     * Forces workflow transition to a specific state after user confirmation
     * Shows a confirmation dialog and handles the transition process
     */
    force_workflow_transition: async (form, workflow_state) => {
      const modalTitle = "Confirm Workflow Transition";
      const confirmationMessage = `Are you sure you want to move the workflow to '${workflow_state}'? This action will bypass permission checks.`;
      const primaryActionLabel = "Yes, Continue";
      const secondaryActionLabel = "No, Cancel";
      const successMessage = `Workflow successfully transitioned to '${workflow_state}'`;
      const failureTitle = "Workflow Transition Failed";
      const failureMessage = `Failed to transition workflow to '${workflow_state}'. Please try again or contact your system administrator.`;
      const ticket_docname = form.doc.ticket_docname;
      agt.utils.dialog.show_confirmation_modal(
        modalTitle,
        confirmationMessage,
        primaryActionLabel,
        secondaryActionLabel,
        async () => {
          try {
            form.set_df_property("workflow_state", "read_only", 0);
            form.dirty();
            await form.save();
            console.log("Transitioning workflow...");
            await agt.utils.update_workflow_state({
              doctype: form.doc.doctype,
              docname: form.doc.name,
              workflow_state,
              ignore_workflow_validation: true
            });
            form.doc.workflow_state = workflow_state;
            frappe.show_alert({
              message: __(successMessage),
              indicator: "green"
            }, 5);
            console.log(`Ticket docname found: ${ticket_docname}`);
            if (ticket_docname) {
              await AutoTransitions.redirect_to_ticket(ticket_docname);
            } else {
              console.log(`No ticket docname found, reloading form instead`);
              form.reload_doc();
            }
          } catch (error) {
            console.error("Error forcing workflow transition:", error);
            frappe.msgprint({
              title: __(failureTitle),
              message: __(failureMessage),
              indicator: "red"
            });
          }
        }
      );
    }
  };

  // frappe_growatt_checklists/doctype/initial_analysis/ts/FormEvents.ts
  var initial_analysis_utils = {
    fields_listener: (_form) => {
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
        await AutoTransitions.run(form);
      },
      before_load: async (form) => {
        initial_analysis_utils.fields_listener(form);
      },
      validate: async (form) => {
        initial_analysis_utils.fields_listener(form);
      },
      before_workflow_action: async () => {
        await agt.workflow.validate();
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
