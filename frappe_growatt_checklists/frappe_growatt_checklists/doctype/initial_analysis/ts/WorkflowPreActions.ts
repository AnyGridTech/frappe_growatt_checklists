import type { Item, SerialNo, InitialAnalysis } from "@anygridtech/frappe-agt-types/agt/doctype";
import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";
import { WorkflowPreActions } from "@anygridtech/frappe-agt-types/agt/client/workflow/";

const preActions = {
  trigger_create_sn_into_db: async (frm: FrappeForm<InitialAnalysis> | FrappeForm<Record<string, any>>) => {
    try {
      // ============================================================
      // STEP 1: Obter serial_no do Ticket via get_value_from_any_doc
      // ============================================================
      const serial_no = await agt.utils.get_value_from_any_doc(frm, 'Ticket', 'ticket_docname', 'main_eqp_serial_no');
      if (!serial_no || typeof serial_no !== 'string' || !serial_no.trim()) {
        throw new Error("Serial number not provided or invalid. Cannot proceed with Serial No creation.");
      }
      const db_sn = await frappe.db
        .get_value<SerialNo>('Serial No', serial_no, ['serial_no', 'item_code', 'warehouse', 'company', 'status', 'workflow_state'])
        .then(r => r?.message)
        .catch(e => {
          console.error("Error fetching Serial No:", e);
          throw new Error("Failed to query Serial No from database: " + (e instanceof Error ? e.message : String(e)));
        });

      // ============================================================
      // STEP 3: Obter service_partner_company do Ticket
      // ============================================================
      const service_partner_company = await agt.utils.get_value_from_any_doc(frm, 'Ticket', 'ticket_docname', 'service_partner_company');
      if (!service_partner_company || typeof service_partner_company !== 'string' || !service_partner_company.trim()) {
        throw new Error("Service partner company not defined. Cannot proceed with Serial No creation.");
      }

      // ============================================================
      // STEP 4: Validar se Serial No já existe com dados válidos
      // ============================================================
      // ⚠️ CORREÇÃO: Verifica se serial_no E item_code existem (não apenas se há chaves)
      const hasValidSerialNo = (sn: any): boolean => {
        return !!(sn?.serial_no && sn?.item_code);
      };

      if (hasValidSerialNo(db_sn)) {
        // Serial No já existe - apenas atualiza workflow_state
        console.log(`Serial No '${db_sn!.serial_no}' already exists. Updating workflow state...`);
        
        await agt.utils.update_workflow_state({
          doctype: "Serial No",
          docname: db_sn!.serial_no,
          workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
          ignore_workflow_validation: true
        });

        console.log(`✅ Serial No '${db_sn!.serial_no}' workflow state updated successfully.`);
      } else {
        // ============================================================
        // STEP 5: Serial No não existe - criar novo registro
        // ============================================================
        console.log(`Serial No '${serial_no}' does not exist. Creating new record...`);

        // Buscar detalhes do Item
        const item = await frappe.db
          .get_value<Item>('Item', { item_code: frm.doc['main_eqp_item_code'] }, ['item_name', 'item_code'])
          .then(r => r?.message)
          .catch(e => {
            console.error("Error fetching Item:", e);
            throw new Error("Failed to query Item from database: " + (e instanceof Error ? e.message : String(e)));
          });

        // ⚠️ CORREÇÃO: Validação mais robusta do item
        if (!item || !item.item_code) {
          throw new Error(`Item not found or invalid for item code: ${frm.doc['main_eqp_item_code']}`);
        }

        // Preparar campos do Serial No
        const serialNoFields: Record<string, any> = {
          serial_no: { value: serial_no },
          item_code: { value: item.item_code },
          company: { value: service_partner_company },
          status: { value: "Active" }
        };

        // Criar novo Serial No
        const sn_docname = await agt.utils.doc.create_doc<SerialNo>(
          'Serial No', 
          { docname: "ticket_docname" }, 
          serialNoFields
        );

        // ⚠️ CORREÇÃO: Validar se a criação retornou um docname válido
        if (!sn_docname || typeof sn_docname !== 'string' || !sn_docname.trim()) {
          throw new Error("Failed to create Serial No - no valid document name returned.");
        }

        console.log(`✅ Serial No '${sn_docname}' created successfully.`);

        // Atualizar workflow_state do novo Serial No
        await agt.utils.update_workflow_state({
          doctype: "Serial No",
          docname: sn_docname,
          workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
          ignore_workflow_validation: true
        });

        console.log(`✅ Serial No '${sn_docname}' workflow state set successfully.`);
      }
    } catch (error) {
      // ⚠️ CORREÇÃO: Garantir que erros sejam propagados corretamente
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Error in trigger_create_sn_into_db:", errorMessage);
      
      // Lança o erro para interromper o workflow
      throw new Error(`Serial No PreAction Failed: ${errorMessage}`);
    }
  },

  orchestrator_redirect: async (frm: FrappeForm<Record<string, any>>) => {
    try {
      // Redireciona para o doctype Ticket, fechando o iframe do app frappe_iframe se necessário
      if (typeof window !== 'undefined') {
        const ticket_docname = frm?.doc['ticket_docname'];
        if (!ticket_docname) {
          console.warn("⚠️ ticket_docname not found. Skipping redirect.");
          return;
        }

        console.log(`🔄 Redirecting to Ticket: ${ticket_docname}`);

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Error in orchestrator_redirect:", errorMessage);
      // Não lança erro aqui pois redirect é não-crítico
    }
  }
};

// ============================================================
// ⚠️ CORREÇÃO CRÍTICA: Remover duplicação de chave
// Agora ambas as ações estão no mesmo objeto
// ============================================================
const wp: WorkflowPreActions = {
  [agt.metadata.doctype.initial_analysis.workflow_action.finish.name]: {
    "Create Serial No.": preActions.trigger_create_sn_into_db,
    "Orchestrator Pre Actions": preActions.orchestrator_redirect
  }
};

frappe.ui.form.on('Initial Analysis', 'before_load', async () => {
  if (!(globalThis as any).workflow_preactions) {
    (globalThis as any).workflow_preactions = {};
  }
  Object.assign((globalThis as any).workflow_preactions, wp);

});