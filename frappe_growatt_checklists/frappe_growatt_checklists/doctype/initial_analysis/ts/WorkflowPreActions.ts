import type { Item, SerialNo, InitialAnalysis } from "@anygridtech/frappe-agt-types/agt/doctype";
import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";
import { WorkflowPreActions } from "@anygridtech/frappe-agt-types/agt/client/workflow/";

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

        const sn_docname = await agt.utils.doc.create_doc<SerialNo>('Serial No', { docname: "ticket_docname" }, serialNoFields);
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


const wp: WorkflowPreActions = {
  [agt.metadata.doctype.initial_analysis.workflow_action.finish.name]: {
    "Create Serial No.": preActions.trigger_create_sn_into_db
  },
  [agt.metadata.doctype.initial_analysis.workflow_action.finish.name]: {
    "Orchestrator Pre Actions": async (frm: FrappeForm<Record<string, any>>) => {
      // Redireciona para o doctype Ticket, fechando o iframe do app frappe_iframe se necessário
      if (typeof window !== 'undefined') {
        const ticket_docname = frm?.doc['ticket_docname'];
        if (!ticket_docname) return;
        // Se estiver dentro de um iframe (frappe_iframe), envia mensagem para o parent
        if (window.self !== window.top) {
          window.parent.postMessage({
            action: 'frappe_iframe_close_and_redirect',
            target: `/app/ticket/${ticket_docname}`,
            docname: ticket_docname
          }, '*');
        } else {
          window.location.href = `/app/ticket/${ticket_docname}`;
        }
      }
    }
  }
};

frappe.ui.form.on('Initial Analysis', 'before_load', async () => {
  if (!(globalThis as any).workflow_preactions) {
    (globalThis as any).workflow_preactions = {};
  }
  Object.assign((globalThis as any).workflow_preactions, wp);

});