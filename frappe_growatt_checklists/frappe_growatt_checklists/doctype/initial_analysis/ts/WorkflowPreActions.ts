import type { Item, SerialNo, ChecklistTracker, InitialAnalysis } from "@anygridtech/frappe-agt-types/agt/doctype";
import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";
import { WorkflowPreActions } from "@anygridtech/frappe-agt-types/agt/client/workflow/";

const preActionsChecklistConfig = [
  { group: "Inverter", doctype: "Checklist of Inverter", table_field: "child_tracker_table" },
  { group: "EV Charger", doctype: "Checklist of EV Charger", table_field: "child_tracker_table" },
  { group: "Battery", doctype: "Checklist of Battery", table_field: "child_tracker_table" },
  { group: "Smart Meter", doctype: "Checklist of Smart Meter", table_field: "child_tracker_table" },
  { group: "Smart Energy Manager", doctype: "Checklist of Smart Energy Manager", table_field: "child_tracker_table" },
  { group: "Datalogger", doctype: "Checklist of Datalogger", table_field: "child_tracker_table" },
];

const preActions = {
  trigger_create_sn_into_db: async (frm: FrappeForm<InitialAnalysis> | FrappeForm<Record<string, any>>) => {
    try {
      // const serial_no = frm.doc.main_eqp_serial_no;
      const serial_no = await agt.utils.get_value_from_any_doc(frm, 'Ticket', 'ticket_docname', 'main_eqp_serial_no');
      if (!serial_no) throw new Error("Número de série não fornecido");

      const db_sn = await frappe.db
        .get_value<SerialNo>('Serial No', serial_no, ['serial_no', 'item_code', 'warehouse', 'company', 'status', 'workflow_state'])
        .then(r => r?.message)
        .catch(e => { throw new Error("Erro ao buscar número de série: " + (e instanceof Error ? e.message : String(e))); });

      // const service_partner_company = frm.doc.service_partner_company;
      const service_partner_company = await agt.utils.get_value_from_any_doc(frm, 'Ticket', 'ticket_docname', 'service_partner_company');
      if (!service_partner_company) throw new Error("Empresa parceira de serviço não definida");

      const hasKeys = (obj: any) => obj && typeof obj === "object" && Object.keys(obj).length > 0;

      if (db_sn && hasKeys(db_sn)) {
        await agt.utils.update_workflow_state({
          doctype: "Serial No",
          docname: db_sn.serial_no,
          workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
          ignore_workflow_validation: true
        });
      } else {
        const item = await frappe.db
          .get_value<Item>('Item', { item_code: frm.doc['main_eqp_item_code'] }, ['item_name', 'item_code'])
          .then(r => r?.message)
          .catch(e => { throw new Error("Erro ao buscar item: " + (e instanceof Error ? e.message : String(e))); });

        if (!item) throw new Error(`Item não encontrado para o código: ${frm.doc['main_eqp_item_code']}`);
        const serialNoFields: Record<string, any> = {
          serial_no: { value: serial_no },
          item_code: { value: item.item_code },
          company: { value: service_partner_company },
          status: { value: "Active" }
        };

        const sn_docname = await agt.utils.doc.create_doc<SerialNo>('Serial No', { docname: "inanly_docname" }, serialNoFields);
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
  },
  create_checklist: async (frm: FrappeForm<InitialAnalysis> | FrappeForm<Record<string, any>>) => {
    try {
      const swa = frm.states.frm.selected_workflow_action;
      const ws = frm.doc.workflow_state;
      const swa_request_checklist = agt.metadata.doctype.initial_analysis.workflow_action.request_checklist.name;
      const ws_preliminary_assessment = agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name;

      if (ws !== ws_preliminary_assessment || !ws || swa !== swa_request_checklist || !swa)
        throw new Error(`Não foi possível criar checklist: critérios do workflow não atendidos.`);

      // const main_eqp_group = frm.doc.main_eqp_group;
      const main_eqp_group = await agt.utils.get_value_from_any_doc(frm, 'Ticket', 'ticket_docname', 'main_eqp_group');
      const pair = preActionsChecklistConfig.find(c => c.group === main_eqp_group);
      if (!pair) throw new Error(`Grupo do equipamento não é '${main_eqp_group}'`);
      const { doctype, table_field: fieldname } = pair;

      const trackerRows = frm.doc[fieldname as keyof typeof frm.doc] as ChecklistTracker[];
      if (trackerRows?.length) {
        const not_rejected = trackerRows.filter(cit =>
          cit.child_tracker_workflow_state !== agt.metadata.doctype.initial_analysis.workflow_state.rejected.name &&
          cit.child_tracker_doctype === doctype
        );
        if (not_rejected?.length && not_rejected.length > 0) {
          const available_list_html = not_rejected.map(cit => `<li> ${cit.child_tracker_docname || cit.name || 'Sem nome'} </li>`).join("");
          const firstItem = not_rejected[0];
          const docname = firstItem?.child_tracker_docname || firstItem?.name;
          if (docname) {
            // Redireciona para o checklist já aberto
            const url = agt.utils.build_doc_url(doctype, docname);
            agt.utils.redirect_after_create_doc(false, url, docname, doctype);
          }
          throw new Error(`Já existe um ou mais checklists abertos para esse protocolo: <br><ul>${available_list_html}</ul>`);
        }
      }

      const docname = await agt.utils.doc.create_doc(doctype, { docname: "inanly_docname" }, frm.fields_dict);
      if (!docname) throw new Error(`Falha ao criar checklist '${doctype}'`);

      const checklist_doc = await frappe.db.get_value(doctype, docname, ['workflow_state']);
      const workflow_state = checklist_doc?.message?.workflow_state || 'Draft';

      await agt.utils.table.row.add_one(frm, fieldname, {
        child_tracker_docname: docname,
        child_tracker_doctype: doctype,
        child_tracker_workflow_state: workflow_state
      });
      frm.dirty();
      await frm.save();
      const url = agt.utils.build_doc_url(doctype, docname);
      agt.utils.redirect_after_create_doc(true, url, docname, doctype);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  },

  create_proposed_dispatch: async (frm: FrappeForm<InitialAnalysis> | FrappeForm<Record<string, any>>) => {
    try {
      const swa = frm.states.frm.selected_workflow_action;
      const swa_request_dispatch = "Solicitar Proposta de Envio";
      if (swa !== swa_request_dispatch)
        throw new Error("A ação selecionada não permite criar uma Proposta de Envio.");

      const dt_name = "Proposed Dispatch";
      const existingDispatches = await frappe.db.get_list(dt_name, {
        filters: { ticket_docname: frm.doc.name },
        fields: ["name"],
      });
      if (existingDispatches?.length) {
        const existing_list_html = existingDispatches.map(ticket => `<li>${ticket.name}</li>`).join("");
        const url = agt.utils.build_doc_url(dt_name, existingDispatches[0].name);
        agt.utils.redirect_after_create_doc(false, url, existingDispatches[0].name, dt_name);
        throw new Error(`Já existe uma Proposta de Envio vinculada a este Ticket: <br><ul>${existing_list_html}</ul>`);
      }

      const docname = await agt.utils.doc.create_doc(dt_name, { ticket_docname: "ticket_docname" }, frm.fields_dict);
      if (!docname) throw new Error("Falha ao criar Proposta de Envio.");

      // const main_eqp_group = frm.doc.main_eqp_group;
      const main_eqp_group = await agt.utils.get_value_from_any_doc(frm, 'Ticket', 'ticket_docname', 'main_eqp_group');
      if (!main_eqp_group) throw new Error("Grupo do equipamento principal não definido.");

      await agt.utils.table.row.add_one(frm, "proposed_dispatch_table", {
        item_name: main_eqp_group,
        item_quantity: 1
      });
      frm.dirty();
      await frm.save();
      const url = agt.utils.build_doc_url(dt_name, docname);
      agt.utils.redirect_after_create_doc(true, url, docname, dt_name);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }
};

const wp: WorkflowPreActions = {
  [agt.metadata.doctype.initial_analysis.workflow_action.request_checklist.name]: {
    "Create Serial No.": preActions.trigger_create_sn_into_db,
    "Create Checklist": preActions.create_checklist
  },
  ["Solicitar Proposta de Envio"]: {
    "Create Proposed Dispatch": preActions.create_proposed_dispatch
  }
};

frappe.ui.form.on('Initial Analysis', 'before_load', async () => {
  if (!(globalThis as any).workflow_preactions) {
    (globalThis as any).workflow_preactions = {};
  }
  Object.assign((globalThis as any).workflow_preactions, wp);

});