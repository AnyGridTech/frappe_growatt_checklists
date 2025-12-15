// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
"use strict";
(() => {
  // public/ts/setup.ts
  frappe.provide("growatt.checklist_table");
  frappe.provide("growatt.checklist_table_inverter");
  frappe.provide("growatt.checklist_table_ev_charger");
  frappe.provide("growatt.checklist_table_battery");
  frappe.provide("growatt.checklist_table_smart_meter");
  frappe.provide("growatt.checklist_table_smart_energy_manager");
  frappe.provide("growatt.checklist_table_datalogger");
  frappe.provide("growatt.child_tracker_table");
  var get_checklist_doctype = (checklist_tracker_name) => {
    if (checklist_tracker_name === "child_tracker_table") return "Service Protocol Inverter Checklist";
    if (checklist_tracker_name === "child_tracker_table") return "Service Protocol EV Charger Checklist";
    if (checklist_tracker_name === "child_tracker_table") return "Service Protocol Battery Checklist";
    if (checklist_tracker_name === "child_tracker_table") return "Service Protocol Smart Meter Checklist";
    if (checklist_tracker_name === "child_tracker_table") return "Service Protocol Smart Energy Manager Checklist";
    if (checklist_tracker_name === "child_tracker_table") return "Service Protocol Datalogger Checklist";
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
  growatt.checklist_table_inverter.setup = GetChecklistTrackerSetup("child_tracker_table");
  growatt.checklist_table_ev_charger.setup = GetChecklistTrackerSetup("child_tracker_table");
  growatt.checklist_table_battery.setup = GetChecklistTrackerSetup("child_tracker_table");
  growatt.checklist_table_smart_meter.setup = GetChecklistTrackerSetup("child_tracker_table");
  growatt.checklist_table_smart_energy_manager.setup = GetChecklistTrackerSetup("child_tracker_table");
  growatt.checklist_table_datalogger.setup = GetChecklistTrackerSetup("child_tracker_table");
  growatt.child_tracker_table.setup = async () => {
    if (cur_frm.doc.__islocal) return;
    if (!cur_frm.fields_dict?.child_tracker_table) return;
    cur_frm.set_df_property("child_tracker_table", "cannot_add_rows", 1);
    cur_frm.set_df_property("child_tracker_table", "cannot_delete_rows", 1);
  };
  async function runSync(frm) {
    if (frm.doc.__islocal) return;
    const cfg = checklistConfig.find((c) => c.group === frm.doc.main_eqp_group);
    if (!cfg) {
      console.warn(`Unmapped group: ${frm.doc.main_eqp_group}`);
      return;
    }
    const doctypes = [
      "Service Protocol Inverter Checklist",
      "Service Protocol EV Charger Checklist",
      "Service Protocol Battery Checklist",
      "Service Protocol Smart Meter Checklist",
      "Service Protocol Smart Energy Manager Checklist",
      "Service Protocol Datalogger Checklist"
    ];
    await growatt.child_tracker.mirror_child_tracker_table(frm, doctypes, "sp_docname");
    growatt.utils.render_doc_fields_table(
      frm.fields_dict.child_tracker_html.$wrapper,
      frm.doc.child_tracker_table,
      [
        {
          fieldname: "child_tracker_docname",
          label: "Link do Documento",
          formatter: (value, doc) => {
            if (!value || !doc.child_tracker_doctype) return String(value || "");
            const slug = String(doc.child_tracker_doctype).toLowerCase().replace(/\s+/g, "-");
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
          formatter: (value, doc, meta) => {
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
            const doctype = doc.child_tracker_doctype;
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
    { group: "Inverter", doctype: "Service Protocol Inverter Checklist", table_field: "child_tracker_table", childname: "sp_docname" },
    { group: "EV Charger", doctype: "Service Protocol EV Charger Checklist", table_field: "child_tracker_table", childname: "sp_docname" },
    { group: "Battery", doctype: "Service Protocol Battery Checklist", table_field: "child_tracker_table", childname: "sp_docname" },
    { group: "Smart Meter", doctype: "Service Protocol Smart Meter Checklist", table_field: "child_tracker_table", childname: "sp_docname" },
    { group: "Smart Energy Manager", doctype: "Service Protocol Smart Energy Manager Checklist", table_field: "child_tracker_table", childname: "sp_docname" },
    { group: "Datalogger", doctype: "Service Protocol Datalogger Checklist", table_field: "child_tracker_table", childname: "sp_docname" }
  ];
  agt.checklist_table.setup = async () => {
    await agt.checklist_table_inverter.setup();
    await agt.checklist_table_ev_charger.setup();
    await agt.checklist_table_battery.setup();
    await agt.checklist_table_smart_meter.setup();
    await agt.checklist_table_smart_energy_manager.setup();
    await agt.checklist_table_datalogger.setup();
    await agt.child_tracker_table.setup();
    frappe.ui.form.on("Service Protocol", {
      onload: async (frm) => {
        await runSync(frm);
        if (frm.doc.workflow_state === growatt.namespace.service_protocol.workflow_state.holding_action.name) {
          await growatt.service_protocol.utils.trigger_create_sn_into_db(frm);
        }
      },
      refresh: async (frm) => {
        await runSync(frm);
        if (frm.doc.workflow_state === growatt.namespace.service_protocol.workflow_state.holding_action.name) {
          await growatt.service_protocol.utils.trigger_create_sn_into_db(frm);
        }
      },
      before_save: async (frm) => {
        if (frm.doc.workflow_state === growatt.namespace.service_protocol.workflow_state.holding_action.name) {
          await growatt.service_protocol.utils.trigger_create_sn_into_db(frm);
        }
        await agt.service_protocol.utils.share_doc_trigger(frm);
      }
    });
    checklistConfig.forEach((config) => {
      frappe.ui.form.on(config.doctype, "onload", async (form) => {
        agt.utils.form.transport_values(form, "sp_docname");
      });
    });
    frappe.ui.form.on("Compliance Statement", "onload", async (form) => {
      agt.utils.form.transport_values(form, "sp_docname");
    });
  };
  if (!globalThis.workflow_validations) {
    globalThis.workflow_validations = [];
  }

  // public/ts/utils.ts
  var hasAdmin = frappe.user.has_role("System Manager") || frappe.user.has_role("Administrator") || frappe.user.has_role("Information Technology");
})();
