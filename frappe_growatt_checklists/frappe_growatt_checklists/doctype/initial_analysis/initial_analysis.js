// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
"use strict";
(() => {
  // frappe_growatt_checklists/doctype/initial_analysis/ts/FormEvents.ts
  var initial_analysis_utils = {
    fields_listener: (_form) => {
    }
  };
  frappe.ui.form.on(
    "Initial Analysis",
    {
      setup: async (form) => {
        await agt.setup.run();
        initial_analysis_utils.fields_listener(form);
      },
      onload: async (form) => {
        initial_analysis_utils.fields_listener(form);
      },
      refresh: async (form) => {
        initial_analysis_utils.fields_listener(form);
      },
      before_load: async (form) => {
        initial_analysis_utils.fields_listener(form);
      },
      validate: async (form) => {
        initial_analysis_utils.fields_listener(form);
      }
    }
  );

  // frappe_growatt_checklists/doctype/initial_analysis/ts/WorkflowPreActions.ts
  var preActions = {
    trigger_create_sn_into_db: async (frm) => {
      try {
        const serial_no = await agt.utils.get_value_from_any_doc(frm, "Ticket", "ticket_docname", "main_eqp_serial_no");
        if (!serial_no) throw new Error("N\xFAmero de s\xE9rie n\xE3o fornecido");
        const db_sn = await frappe.db.get_value("Serial No", serial_no, ["serial_no", "item_code", "warehouse", "company", "status", "workflow_state"]).then((r) => r?.message).catch((e) => {
          throw new Error("Erro ao buscar n\xFAmero de s\xE9rie: " + (e instanceof Error ? e.message : String(e)));
        });
        const service_partner_company = await agt.utils.get_value_from_any_doc(frm, "Ticket", "ticket_docname", "service_partner_company");
        if (!service_partner_company) throw new Error("Empresa parceira de servi\xE7o n\xE3o definida");
        const hasKeys = (obj) => obj && typeof obj === "object" && Object.keys(obj).length > 0;
        if (db_sn && hasKeys(db_sn)) {
          await agt.utils.update_workflow_state({
            doctype: "Serial No",
            docname: db_sn.serial_no,
            workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
            ignore_workflow_validation: true
          });
        } else {
          const item = await frappe.db.get_value("Item", { item_code: frm.doc["main_eqp_item_code"] }, ["item_name", "item_code"]).then((r) => r?.message).catch((e) => {
            throw new Error("Erro ao buscar item: " + (e instanceof Error ? e.message : String(e)));
          });
          if (!item) throw new Error(`Item n\xE3o encontrado para o c\xF3digo: ${frm.doc["main_eqp_item_code"]}`);
          const serialNoFields = {
            serial_no: { value: serial_no },
            item_code: { value: item.item_code },
            company: { value: service_partner_company },
            status: { value: "Active" }
          };
          const sn_docname = await agt.utils.doc.create_doc("Serial No", { docname: "ticket_docname" }, serialNoFields);
          if (!sn_docname) throw new Error("Falha ao criar Serial No - nenhum nome de documento retornado");
          await agt.utils.update_workflow_state({
            doctype: "Serial No",
            docname: sn_docname,
            workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
            ignore_workflow_validation: true
          });
        }
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error));
      }
    }
  };
  var wp = {
    [agt.metadata.doctype.initial_analysis.workflow_action.finish.name]: {
      "Create Serial No.": preActions.trigger_create_sn_into_db
    },
    [agt.metadata.doctype.initial_analysis.workflow_action.finish.name]: {
      "Orchestrator Pre Actions": async (frm) => {
        if (typeof window !== "undefined") {
          const ticket_docname = frm?.doc["ticket_docname"];
          if (!ticket_docname) return;
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
      }
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
          name: "main_eqp_purchase_invoice",
          depends_on: (frm) => {
            const main_eqp_purchase_invoice = frm.doc.main_eqp_purchase_invoice;
            if (!main_eqp_purchase_invoice)
              return `A nota fiscal deve ser anexada para prosseguir com a cria\xE7\xE3o do checklist.`;
            return void 0;
          }
        },
        {
          name: "main_eqp_serial_no_label_picture",
          depends_on: (frm) => {
            const main_eqp_serial_no_label_picture = frm.doc.main_eqp_serial_no_label_picture;
            if (!main_eqp_serial_no_label_picture)
              return `A etiqueta do n\xFAmero de s\xE9rie deve ser anexada para prosseguir com a cria\xE7\xE3o do checklist.`;
            return void 0;
          }
        },
        {
          name: "ext_fault_date",
          depends_on: (frm) => {
            const ext_fault_date = frm.doc.ext_fault_date;
            if (!ext_fault_date)
              return "A data da falha deve ser informada para prosseguir com a cria\xE7\xE3o do checklist.";
            return void 0;
          }
        },
        {
          name: "ext_fault_code",
          depends_on: (frm) => {
            const ext_fault_code = frm.doc.ext_fault_code;
            if (!ext_fault_code)
              return "O c\xF3digo da falha deve ser informado para prosseguir com a cria\xE7\xE3o do checklist.";
            return void 0;
          }
        },
        {
          name: "ext_fault_description",
          depends_on: (frm) => {
            const ext_fault_description = frm.doc.ext_fault_description;
            if (!ext_fault_description)
              return "A descri\xE7\xE3o da falha deve ser informada para prosseguir com a cria\xE7\xE3o do checklist.";
            return void 0;
          }
        },
        {
          name: "ext_fault_customer_description",
          depends_on: (frm) => {
            const ext_fault_customer_description = frm.doc.ext_fault_customer_description;
            if (!ext_fault_customer_description || ext_fault_customer_description.length < 15)
              return `A descri\xE7\xE3o do label(${ext_fault_customer_description}) deve ter no m\xEDnimo 15 caracteres para prosseguir com a cria\xE7\xE3o do checklist.`;
            return void 0;
          }
        },
        {
          name: "solution_description",
          depends_on: (frm) => {
            const solution_description = frm.doc.solution_description;
            if (!solution_description || solution_description.length < 15)
              return `A descri\xE7\xE3o da solu\xE7\xE3o(${solution_description}) deve ter no m\xEDnimo 15 caracteres para prosseguir com a cria\xE7\xE3o do checklist.`;
            return void 0;
          }
        },
        {
          name: "solution_select",
          depends_on: (frm) => {
            const solution_select = frm.doc.solution_select;
            if (!solution_select)
              return "A solu\xE7\xE3o deve ser selecionada para prosseguir com a cria\xE7\xE3o do checklist.";
            if (solution_select === "Abertura de Checklist")
              return "A solu\xE7\xE3o aplicada deve ser condizente com a finaliza\xE7\xE3o do caso.";
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
