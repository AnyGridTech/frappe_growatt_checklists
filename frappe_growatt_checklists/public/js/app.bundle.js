// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
"use strict";
(() => {
  // public/ts/utils.ts
  var hasAdmin = frappe.user.has_role("System Manager") || frappe.user.has_role("Administrator") || frappe.user.has_role("Information Technology");
  var frappe_growatt_checklists_utils = {
    async update_related_forms() {
      const fields_record = cur_frm.fields_dict;
      const wci = agt.utils.table.row.find(cur_frm, "checklist_table_inverter", { or: { docstatus: [0] } });
      const wcc = agt.utils.table.row.find(cur_frm, "checklist_table_ev_charger", { or: { docstatus: [0] } });
      const wcb = agt.utils.table.row.find(cur_frm, "checklist_table_battery", { or: { docstatus: [0] } });
      const wcs = agt.utils.table.row.find(cur_frm, "checklist_table_smart_meter", { or: { docstatus: [0] } });
      const wcem = agt.utils.table.row.find(cur_frm, "checklist_table_smart_energy_manager", { or: { docstatus: [0] } });
      const wcd = agt.utils.table.row.find(cur_frm, "checklist_table_datalogger", { or: { docstatus: [0] } });
      const wsp = agt.utils.table.row.find(cur_frm, "checklist_table_service_protocol", { or: { docstatus: [0] } });
      const clean_dict = Object.entries(fields_record).filter(([_, v]) => v.value !== void 0).reduce((acc, [k, v]) => {
        acc[k] = v.value;
        return acc;
      }, {});
      const shared_users = frappe.model.get_shared("Initial Analysis", cur_frm.docname);
      wci?.forEach(async (row) => {
        await agt.utils.doc.update_doc("Checklist of Inverter", row.checklist_docname, clean_dict);
        await agt.utils.doc.share_doc("Checklist of Inverter", row.checklist_docname, shared_users);
      });
      wcc?.forEach(async (row) => {
        await agt.utils.doc.update_doc("Checklist of EV Charger", row.checklist_docname, clean_dict);
        await agt.utils.doc.share_doc("Checklist of EV Charger", row.checklist_docname, shared_users);
      });
      wcb?.forEach(async (row) => {
        await agt.utils.doc.update_doc("Checklist of Battery", row.checklist_docname, clean_dict);
        await agt.utils.doc.share_doc("Checklist of Battery", row.checklist_docname, shared_users);
      });
      wcs?.forEach(async (row) => {
        await agt.utils.doc.update_doc("Checklist of Smart Meter", row.checklist_docname, clean_dict);
        await agt.utils.doc.share_doc("Checklist of Smart Meter", row.checklist_docname, shared_users);
      });
      wcem?.forEach(async (row) => {
        await agt.utils.doc.update_doc("Checklist of Smart Energy Manager", row.checklist_docname, clean_dict);
        await agt.utils.doc.share_doc("Checklist of Smart Energy Manager", row.checklist_docname, shared_users);
      });
      wcd?.forEach(async (row) => {
        await agt.utils.doc.update_doc("Checklist of Datalogger", row.checklist_docname, clean_dict);
        await agt.utils.doc.share_doc("Checklist of Datalogger", row.checklist_docname, shared_users);
      });
      wsp?.forEach(async (row) => {
        await agt.utils.doc.update_doc("Service Protocol", row.checklist_docname, clean_dict);
        await agt.utils.doc.share_doc("Service Protocol", row.checklist_docname, shared_users);
      });
    },
    fields_listener(form) {
      frappe_growatt_checklists_utils.fields_handler(form);
      Object.keys(form.fields_dict).forEach((fn) => {
        const field = form.fields_dict[fn];
        if (field && field.df) {
          field.df["onchange"] = () => {
            frappe_growatt_checklists_utils.fields_handler(form);
          };
        }
      });
    },
    fields_handler: async function(form) {
      if (form.doc["opening_date"] === "" || form.doc["opening_date"] === void 0 || form.doc["opening_date"] === null) {
        form.doc["opening_date"] = frappe.datetime.now_date();
      }
      form.set_df_property("opening_date", "read_only", form.doc["opening_date"] ? 1 : 0);
      if (form.doc["opening_user"] === "" || form.doc["opening_user"] === void 0 || form.doc["opening_user"] === null) {
        form.doc["opening_user"] = frappe.session.user;
      }
      form.set_df_property("opening_user", "read_only", form.doc["opening_user"] ? 1 : 0);
      agt.utils.table.set_custom_properties(
        form,
        {
          hidden: false,
          cannot_delete_rows: !hasAdmin,
          cannot_add_rows: !hasAdmin,
          hide_add_row: !hasAdmin,
          hide_remove_row: !hasAdmin,
          hide_remove_all_rows: !hasAdmin,
          hide_row_check: !hasAdmin,
          hide_append_row: !hasAdmin,
          hide_shortcuts: !hasAdmin,
          hide_check: !hasAdmin,
          hide_config_columns: true,
          hide_grid_delete_row: !hasAdmin,
          hide_grid_move_row: !hasAdmin
        },
        "public_comment",
        "Adicionar Coment\xE1rio"
      );
      agt.utils.table.set_custom_properties(
        form,
        {
          hidden: false,
          cannot_delete_rows: !hasAdmin,
          cannot_add_rows: !hasAdmin,
          hide_add_row: !hasAdmin,
          hide_remove_row: !hasAdmin,
          hide_remove_all_rows: !hasAdmin,
          hide_row_check: !hasAdmin,
          hide_append_row: !hasAdmin,
          hide_shortcuts: !hasAdmin,
          hide_check: !hasAdmin,
          hide_config_columns: true,
          hide_grid_delete_row: !hasAdmin,
          hide_grid_move_row: !hasAdmin
        },
        "private_comment",
        "Adicionar Coment\xE1rio"
      );
      let defaultTableRow = { item_name: "", item_quantity: 1 };
      const mainEqpGroup = await agt.utils.get_value_from_any_doc(form, "Ticket", "ticket_docname", "main_eqp_group");
      if (mainEqpGroup === "Datalogger") {
        defaultTableRow.item_name = "Datalogger";
        defaultTableRow.item_quantity = 1;
      } else if (mainEqpGroup === "Inverter") {
        defaultTableRow.item_name = "Inverter";
        defaultTableRow.item_quantity = 1;
      }
      const workflowStates = agt.metadata.doctype.initial_analysis.workflow_state;
      const currentStateId = Object.values(workflowStates).find((state) => state.name === form.doc["workflow_state"])?.id || 0;
      const sectionStarting = [
        "section_checklist_links",
        "checklist_table_html",
        "section_eqp_failure"
      ];
      sectionStarting.forEach((f) => {
        form.set_df_property(f, "read_only", currentStateId >= 3 ? 1 : 0);
      });
      form.set_df_property("section_additional", "read_only", currentStateId >= 3 ? 1 : 0);
      const sectionPreAnalysis = [
        "section_pre_analysis",
        "section_pre_analysis_conclusion"
      ];
      sectionPreAnalysis.forEach((f) => {
        form.set_df_property(f, "read_only", currentStateId >= 3 ? 1 : 0);
      });
      const EqpFailure = [
        "ext_fault_date",
        "ext_fault_code",
        "ext_fault_description",
        "ext_fault_customer_description"
      ];
      EqpFailure.forEach((f) => {
        form.set_df_property(f, "read_only", currentStateId >= 3 ? 1 : 0);
      });
      form.set_df_property("ext_fault_description", "read_only", 1);
    },
    trigger_create_sn_into_db: async (form) => {
      if (form.doc.__islocal) return;
      const serial_no = await agt.utils.get_value_from_any_doc(form, "Ticket", "ticket_docname", "main_eqp_serial_no");
      if (!serial_no) {
        console.error("N\xFAmero de s\xE9rie n\xE3o fornecido");
        return;
      }
      const db_sn = await frappe.db.get_value("Serial No", serial_no, ["serial_no", "item_code", "warehouse", "company", "status", "workflow_state"]).catch((e) => {
        console.error("Erro ao buscar n\xFAmero de s\xE9rie:", e);
        return null;
      }).then((r) => r?.message);
      const hasKeys = (obj) => obj && typeof obj === "object" && Object.keys(obj).length > 0;
      const service_partner_company = await agt.utils.get_value_from_any_doc(form, "Ticket", "ticket_docname", "service_partner_company");
      if (!service_partner_company) {
        console.error("Empresa parceira de servi\xE7o n\xE3o definida");
        return;
      }
      if (db_sn && hasKeys(db_sn)) {
        try {
          await agt.utils.update_workflow_state({
            doctype: "Serial No",
            docname: db_sn.serial_no,
            workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
            ignore_workflow_validation: true
          });
          console.log("Estado de workflow do Serial No atualizado com sucesso:", db_sn.serial_no);
        } catch (error) {
          console.error("Error updating Serial No workflow state:", error);
          throw new Error("Error updating workflow state: " + (error instanceof Error ? error.message : String(error)));
        }
      } else {
        const item = await frappe.db.get_value("Item", { item_code: form.doc["main_eqp_item_code"] }, ["item_name", "item_code"]).catch((e) => {
          console.error("Erro ao buscar item:", e);
          return null;
        }).then((r) => r?.message);
        if (!item) {
          console.error("Item not found for code:", form.doc["main_eqp_item_code"]);
          throw new Error(`Item not found for code: ${form.doc["main_eqp_item_code"]}`);
        }
        try {
          console.log("Creating new Serial No:", serial_no);
          const serialNoFields = {};
          serialNoFields["serial_no"] = { value: serial_no };
          serialNoFields["item_code"] = { value: item.item_code };
          serialNoFields["company"] = { value: service_partner_company };
          serialNoFields["status"] = { value: "Active" };
          console.log("Fields for Serial No creation:", JSON.stringify(serialNoFields));
          const sn_docname = await agt.utils.doc.create_doc("Serial No", { docname: "inanly_docname" }, serialNoFields);
          if (!sn_docname) {
            throw new Error("Failed to create Serial No - no document name returned");
          }
          console.log("Serial No created successfully:", sn_docname);
          await agt.utils.update_workflow_state({
            doctype: "Serial No",
            docname: sn_docname,
            workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
            ignore_workflow_validation: true
          });
          console.log("Serial No workflow state updated successfully:", sn_docname);
        } catch (error) {
          console.error("Error creating or updating Serial No:", error);
          throw new Error("Error creating or updating Serial No: " + (error instanceof Error ? error.message : String(error)));
        }
      }
    },
    set_service_partner: async function(form) {
      async function decideServicePartner() {
        const service_partner_companies = await frappe_growatt_checklists_utils.GetServPartnerCompanies();
        return service_partner_companies?.filter((c) => c.name === "Growatt")[0];
      }
      if (form.doc.__islocal) return;
      const service_partner_company = form.doc["service_partner_company"];
      if (service_partner_company) return;
      const spc = await decideServicePartner();
      if (!spc) return;
      await agt.utils.doc.update_doc(form.doctype, form.docname, { service_partner_company: spc.name });
    },
    GetServPartnerCompanies: async function(name) {
      return await frappe.db.get_list("Company", {
        filters: {
          custom_service_partner: 1,
          name
        },
        fields: ["name", "abbr", "is_group"]
      });
    },
    share_doc_trigger: async function(form) {
      if (form.doc.__islocal) return;
      const mainCustomer = form.doc["main_customer_email"];
      if (mainCustomer) {
        const shared_users = [
          {
            creation: "",
            everyone: 0,
            name: "",
            owner: "",
            read: 1,
            share: 1,
            submit: 1,
            user: mainCustomer,
            write: 1
          }
        ];
        await agt.utils.doc.share_doc("Service Protocol", form.doc.name, shared_users);
      }
    }
  };

  // public/ts/setup.ts
  frappe.provide("agt.checklist.table");
  frappe.provide("agt.checklist.table.inverter");
  frappe.provide("agt.checklist.table.ev_charger");
  frappe.provide("agt.checklist.table.battery");
  frappe.provide("agt.checklist.table.smart_meter");
  frappe.provide("agt.checklist.table.smart_energy_manager");
  frappe.provide("agt.checklist.table.datalogger");
  frappe.provide("agt.checklist.table.child_tracker_table");
  var get_checklist_doctype = (checklist_tracker_name) => {
    if (checklist_tracker_name === "child_tracker_table") return "Checklist of Inverter";
    if (checklist_tracker_name === "child_tracker_table") return "Checklist of EV Charger";
    if (checklist_tracker_name === "child_tracker_table") return "Checklist of Battery";
    if (checklist_tracker_name === "child_tracker_table") return "Checklist of Smart Meter";
    if (checklist_tracker_name === "child_tracker_table") return "Checklist of Smart Energy Manager";
    if (checklist_tracker_name === "child_tracker_table") return "Checklist of Datalogger";
    return null;
  };
  var GetChecklistTrackerSetup = (checklist_tracker_name) => {
    return async () => {
      if (cur_frm.doc.__islocal) return;
      const checklist_doctype = get_checklist_doctype(checklist_tracker_name);
      if (!checklist_doctype) return;
      if (!cur_frm.fields_dict?.[checklist_tracker_name]) return;
      cur_frm.set_df_property(checklist_tracker_name, "cannot_add_rows", 1);
      cur_frm.set_df_property(checklist_tracker_name, "cannot_delete_rows", 1);
    };
  };
  agt.checklist.table.inverter.setup = GetChecklistTrackerSetup("child_tracker_table");
  agt.checklist.table.ev_charger.setup = GetChecklistTrackerSetup("child_tracker_table");
  agt.checklist.table.battery.setup = GetChecklistTrackerSetup("child_tracker_table");
  agt.checklist.table.smart_meter.setup = GetChecklistTrackerSetup("child_tracker_table");
  agt.checklist.table.smart_energy_manager.setup = GetChecklistTrackerSetup("child_tracker_table");
  agt.checklist.table.datalogger.setup = GetChecklistTrackerSetup("child_tracker_table");
  agt.corrections_tracker.table.mirror_child_tracker_table = async () => {
    if (cur_frm.doc.__islocal) return;
    if (!cur_frm.fields_dict?.["child_tracker_table"]) return;
    cur_frm.set_df_property("child_tracker_table", "cannot_add_rows", 1);
    cur_frm.set_df_property("child_tracker_table", "cannot_delete_rows", 1);
  };
  async function runSync(form) {
    if (form.doc.__islocal) return;
    const main_eqp_group = await agt.utils.get_value_from_any_doc(form, "Ticket", "ticket_docname", "main_eqp_serial_no");
    const cfg = checklistConfig.find((c) => c.group === main_eqp_group);
    if (!cfg) {
      console.warn(`Unmapped group: ${main_eqp_group}`);
      return;
    }
    const doctypes = [
      "Checklist of Inverter",
      "Checklist of EV Charger",
      "Checklist of Battery",
      "Checklist of Smart Meter",
      "Checklist of Smart Energy Manager",
      "Checklist of Datalogger"
    ];
    await agt.corrections_tracker.table.mirror_child_tracker_table(form, doctypes, "inanly_docname");
    const childTrackerField = form.fields_dict["child_tracker_html"];
    if (!childTrackerField?.$wrapper) return;
    agt.utils.form.render_doc_fields_table(
      childTrackerField.$wrapper,
      form.doc["child_tracker_table"],
      [
        {
          fieldname: "child_tracker_docname",
          label: "Link do Documento",
          formatter: (value, doc) => {
            if (!value || !doc["child_tracker_doctype"]) return String(value || "");
            const slug = String(doc["child_tracker_doctype"]).toLowerCase().replace(/\s+/g, "-");
            return `<a href="/app/${slug}/${encodeURIComponent(String(value))}" target="_blank">${String(value)} <i class="fa fa-external-link" style="font-size: 1.25em; color: var(--text-muted)"></i></a>`;
          }
        },
        {
          fieldname: "child_tracker_doctype",
          label: "Tipo de Documento",
          formatter: (value) => {
            if (!value) return String(value || "");
            const slug = String(value).toLowerCase().replace(/\s+/g, "-");
            return `<a href="/app/${slug}" target="_blank">${String(value)}</a>`;
          }
        },
        {
          fieldname: "child_tracker_workflow_state",
          label: "Status do Documento",
          // formatter: (value, doc, meta) => {
          formatter: (value, doc) => {
            if (!value) return String(value || "");
            const state = String(value);
            const stateColorMap = {
              "Draft": "orange",
              "Rascunho": "orange",
              "Submitted": "blue",
              "Submetido": "blue",
              "Approved": "green",
              "Aprovado": "green",
              "Rejected": "red",
              "Rejeitado": "red",
              "Cancelled": "grey",
              "Cancelado": "grey",
              "Finished": "green",
              "Conclu\xEDdo": "green",
              "Finalizado": "green",
              "An\xE1lise Preliminar": "purple",
              "Cliente: Corrigir Informa\xE7\xF5es": "orange",
              "Cliente: Finalizar Preenchimento": "orange",
              "Revis\xE3o": "yellow",
              "Checklist": "blue",
              "Proposta de Envio": "purple",
              "Declara\xE7\xE3o de Conformidade": "darkblue",
              "Garantia Aprovada": "green",
              "Cliente: A\xE7\xE3o Necess\xE1ria": "orange"
            };
            const doctype = doc["child_tracker_doctype"];
            if (doctype && window.frappe?.boot?.workflows) {
              try {
                const workflows = window.frappe.boot.workflows;
                const workflow = workflows[String(doctype)];
                if (workflow && workflow.states) {
                  const stateInfo = workflow.states.find((s) => s.state === state);
                  if (stateInfo && stateInfo.style) {
                    const colorClass = stateInfo.style.toLowerCase();
                    return `<span class="indicator-pill ${colorClass}">${state}</span>`;
                  }
                }
              } catch (e) {
                console.warn("Erro ao acessar workflow metadata:", e);
              }
            }
            const color = stateColorMap[state] || "blue";
            return `<span class="indicator-pill ${color}">${state}</span>`;
          }
        }
      ]
    );
  }
  var checklistConfig = [
    { group: "Inverter", doctype: "Checklist of Inverter", table_field: "child_tracker_table", childname: "inanly_docname" },
    { group: "EV Charger", doctype: "Checklist of EV Charger", table_field: "child_tracker_table", childname: "inanly_docname" },
    { group: "Battery", doctype: "Checklist of Battery", table_field: "child_tracker_table", childname: "inanly_docname" },
    { group: "Smart Meter", doctype: "Checklist of Smart Meter", table_field: "child_tracker_table", childname: "inanly_docname" },
    { group: "Smart Energy Manager", doctype: "Checklist of Smart Energy Manager", table_field: "child_tracker_table", childname: "inanly_docname" },
    { group: "Datalogger", doctype: "Checklist of Datalogger", table_field: "child_tracker_table", childname: "inanly_docname" }
  ];
  agt.checklist.setup = async () => {
    await agt.checklist.table.inverter.setup();
    await agt.checklist.table.ev_charger.setup();
    await agt.checklist.table.battery.setup();
    await agt.checklist.table.smart_meter.setup();
    await agt.checklist.table.smart_energy_manager.setup();
    await agt.checklist.table.datalogger.setup();
    await agt.checklist.tracker_table.all.setup();
    frappe.ui.form.on("Initial Analysis", {
      onload: async (form) => {
        await runSync(form);
        if (form.doc.workflow_state === agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name) {
          await frappe_growatt_checklists_utils.trigger_create_sn_into_db(form);
        }
      },
      refresh: async (form) => {
        await runSync(form);
        if (form.doc.workflow_state === agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name) {
          await frappe_growatt_checklists_utils.trigger_create_sn_into_db(form);
        }
      },
      before_save: async (form) => {
        if (form.doc.workflow_state === agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name) {
          await frappe_growatt_checklists_utils.trigger_create_sn_into_db(form);
        }
        await frappe_growatt_checklists_utils.share_doc_trigger(form);
      }
    });
    checklistConfig.forEach((config) => {
      frappe.ui.form.on(config.doctype, "onload", async (form) => {
        agt.utils.form.transport_values(form, "inanly_docname");
      });
    });
    frappe.ui.form.on("Compliance Statement", "onload", async (form) => {
      agt.utils.form.transport_values(form, "inanly_docname");
    });
  };
  if (!globalThis.workflow_validations) {
    globalThis.workflow_validations = [];
  }
})();
