import { ChecklistTracker } from "@anygridtech/frappe-agt-types/agt/doctype";
import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";

frappe.provide("growatt.checklist_table");
frappe.provide("growatt.checklist_table_inverter");
frappe.provide("growatt.checklist_table_ev_charger");
frappe.provide("growatt.checklist_table_battery");
frappe.provide("growatt.checklist_table_smart_meter");
frappe.provide("growatt.checklist_table_smart_energy_manager");
frappe.provide("growatt.checklist_table_datalogger");
frappe.provide("growatt.child_tracker_table");

const get_checklist_doctype = (checklist_tracker_name: string) => {
  if (checklist_tracker_name === "child_tracker_table") return "Checklist of Inverter";
  if (checklist_tracker_name === "child_tracker_table") return "Checklist of EV Charger";
  if (checklist_tracker_name === "child_tracker_table") return "Checklist of Battery";
  if (checklist_tracker_name === "child_tracker_table") return "Checklist of Smart Meter";
  if (checklist_tracker_name === "child_tracker_table") return "Checklist of Smart Energy Manager";
  if (checklist_tracker_name === "child_tracker_table") return "Checklist of Datalogger";
  return null;
};

const GetChecklistTrackerSetup = (checklist_tracker_name: string) => {
  return async () => {
    if (cur_frm.doc.__islocal) return;
    const checklist_doctype = get_checklist_doctype(checklist_tracker_name);
    if (!checklist_doctype) return;

    // Check if the checklist tracker field exists.
    if (!cur_frm.fields_dict?.[checklist_tracker_name]) return;

    cur_frm.set_df_property(checklist_tracker_name, 'cannot_add_rows', 1);
    cur_frm.set_df_property(checklist_tracker_name, 'cannot_delete_rows', 1);
  }
}

growatt.checklist_table_inverter.setup = GetChecklistTrackerSetup("child_tracker_table");
growatt.checklist_table_ev_charger.setup = GetChecklistTrackerSetup("child_tracker_table");
growatt.checklist_table_battery.setup = GetChecklistTrackerSetup("child_tracker_table");
growatt.checklist_table_smart_meter.setup = GetChecklistTrackerSetup("child_tracker_table");
growatt.checklist_table_smart_energy_manager.setup = GetChecklistTrackerSetup("child_tracker_table");
growatt.checklist_table_datalogger.setup = GetChecklistTrackerSetup("child_tracker_table");

// Setup para a nova tabela child_tracker_table
agt.corrections_tracker.table.mirror_child_tracker_table = async () => {
  if (cur_frm.doc.__islocal) return;

  // Verificar se o campo child_tracker_table existe
  if (!cur_frm.fields_dict?.['child_tracker_table']) return;

  cur_frm.set_df_property('child_tracker_table', 'cannot_add_rows', 1);
  cur_frm.set_df_property('child_tracker_table', 'cannot_delete_rows', 1);
};

/**
 * Sync checklist tables with the Initial Analysis form.
 * This function is triggered on the 'onload' event of the Initial Analysis form.
 */
async function runSync(frm: FrappeForm) {
  if (frm.doc.__islocal) return;

  const cfg = checklistConfig.find(c => c.group === frm.doc['main_eqp_group']);
  if (!cfg) {
    console.warn(`Unmapped group: ${frm.doc['main_eqp_group']}`);
    return;
  }

  const doctypes = [
    'Checklist of Inverter',
    'Checklist of EV Charger',
    'Checklist of Battery',
    'Checklist of Smart Meter',
    'Checklist of Smart Energy Manager',
    'Checklist of Datalogger',
  ];

  // Espelhar todos os documentos relacionados pelo sp_docname
  await agt.corrections_tracker.table.mirror_child_tracker_table(frm, doctypes, 'sp_docname');

  growatt.utils.render_doc_fields_table(
    frm.fields_dict.child_tracker_html.$wrapper,
    frm.doc.child_tracker_table,
    [
      {
        fieldname: 'child_tracker_docname',
        label: 'Link do Documento',
        formatter: (value, doc) => {
          if (!value || !doc.child_tracker_doctype) return String(value || '');
          const slug = String(doc.child_tracker_doctype).toLowerCase().replace(/\s+/g, '-');
          return `<a href="/app/${slug}/${encodeURIComponent(String(value))}" target="_blank">${String(value)} <i class="fa fa-external-link" style="font-size: 1.25em; color: var(--text-muted)"></i></a>`;
        }
      },
      {
        fieldname: 'child_tracker_doctype',
        label: 'Tipo de Documento',
        formatter: (value) => {
          if (!value) return String(value || '');
          const slug = String(value).toLowerCase().replace(/\s+/g, '-');
          return `<a href="/app/${slug}" target="_blank">${String(value)}</a>`;
        }
      },
      {
        fieldname: 'child_tracker_workflow_state',
        label: 'Status do Documento',
        formatter: (value, doc, meta) => {
          if (!value) return String(value || '');

          const state = String(value);

          // Mapeamento de cores baseado nos estados mais comuns do workflow
          const stateColorMap: Record<string, string> = {
            'Draft': 'orange',
            'Rascunho': 'orange',
            'Submitted': 'blue',
            'Submetido': 'blue',
            'Approved': 'green',
            'Aprovado': 'green',
            'Rejected': 'red',
            'Rejeitado': 'red',
            'Cancelled': 'grey',
            'Cancelado': 'grey',
            'Finished': 'green',
            'Concluído': 'green',
            'Finalizado': 'green',
            'Análise Preliminar': 'purple',
            'Cliente: Corrigir Informações': 'orange',
            'Cliente: Finalizar Preenchimento': 'orange',
            'Revisão': 'yellow',
            'Checklist': 'blue',
            'Proposta de Envio': 'purple',
            'Declaração de Conformidade': 'darkblue',
            'Garantia Aprovada': 'green',
            'Cliente: Ação Necessária': 'orange'
          };

          // Tenta primeiro usar os metadados do workflow do Frappe
          const doctype = doc.child_tracker_doctype;
          if (doctype && (window as any).frappe?.boot?.workflows) {
            try {
              const workflows = (window as any).frappe.boot.workflows as Record<string, any>;
              const workflow = workflows[String(doctype)];

              if (workflow && workflow.states) {
                const stateInfo = workflow.states.find((s: any) => s.state === state);
                if (stateInfo && stateInfo.style) {
                  const colorClass = stateInfo.style.toLowerCase();
                  return `<span class="indicator-pill ${colorClass}">${state}</span>`;
                }
              }
            } catch (e) {
              console.warn('Erro ao acessar workflow metadata:', e);
            }
          }

          // Fallback: usa o mapeamento manual de cores
          const color = stateColorMap[state] || 'blue';
          return `<span class="indicator-pill ${color}">${state}</span>`;
        }
      }
    ]
  );
}

const checklistConfig = [
  { group: 'Inverter', doctype: 'Checklist of Inverter', table_field: 'child_tracker_table', childname: 'sp_docname' },
  { group: 'EV Charger', doctype: 'Checklist of EV Charger', table_field: 'child_tracker_table', childname: 'sp_docname' },
  { group: 'Battery', doctype: 'Checklist of Battery', table_field: 'child_tracker_table', childname: 'sp_docname' },
  { group: 'Smart Meter', doctype: 'Checklist of Smart Meter', table_field: 'child_tracker_table', childname: 'sp_docname' },
  { group: 'Smart Energy Manager', doctype: 'Checklist of Smart Energy Manager', table_field: 'child_tracker_table', childname: 'sp_docname' },
  { group: 'Datalogger', doctype: 'Checklist of Datalogger', table_field: 'child_tracker_table', childname: 'sp_docname' }
];

agt.checklist_table.setup = async () => {
  await agt.checklist_table_inverter.setup();
  await agt.checklist_table_ev_charger.setup();
  await agt.checklist_table_battery.setup();
  await agt.checklist_table_smart_meter.setup();
  await agt.checklist_table_smart_energy_manager.setup();
  await agt.checklist_table_datalogger.setup();
  await agt.child_tracker_table.setup();

  frappe.ui.form.on('Initial Analysis', {
    onload: async (frm: FrappeForm) => {
      // await trigger_sidebar(frm);
      await runSync(frm);
      if (frm.doc.workflow_state === agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name) {
        await agt.initial_analysis.utils.trigger_create_sn_into_db(frm);
      }
    },
    refresh: async (frm: FrappeForm) => {
      // await trigger_sidebar(frm);
      await runSync(frm);
      if (frm.doc.workflow_state === agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name) {
        await agt.initial_analysis.utils.trigger_create_sn_into_db(frm);
      }
    },
    before_save: async (frm: FrappeForm) => {
      if (frm.doc.workflow_state === agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name) {
        await agt.initial_analysis.utils.trigger_create_sn_into_db(frm);
      }
      await agt.initial_analysis.utils.share_doc_trigger(frm);
    }
  });

  checklistConfig.forEach(config => {
    frappe.ui.form.on(config.doctype, 'onload', async (form: FrappeForm) => {
      agt.utils.form.transport_values(form, "sp_docname");
    });
  });

  frappe.ui.form.on("Compliance Statement", 'onload', async (form: FrappeForm) => {
    agt.utils.form.transport_values(form, "sp_docname");
  });
};

// Workflow gate
if (!(globalThis as any).workflow_validations) {
  (globalThis as any).workflow_validations = [];
}
