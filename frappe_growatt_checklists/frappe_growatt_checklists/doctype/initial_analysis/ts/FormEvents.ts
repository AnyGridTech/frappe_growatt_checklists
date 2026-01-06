import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";
import { InitialAnalysis } from "@anygridtech/frappe-agt-types/agt/doctype";

/*
* This file handles the form events for the Initial Analysis doctype.
* Read more: https://docs.frappe.io/framework/user/en/api/form#form-events
* 
* Example usage of force_workflow_transition:
* 
* // In any form event handler:
* initial_analysis_utils.force_workflow_transition(
*   form, 
*   'Nome do Estado do Workflow'
* );
*/

export const initial_analysis_utils = {
  fields_listener: (_form: FrappeForm<InitialAnalysis>) => {
    // Implementação do fields_listener
    // Adicione aqui a lógica necessária para ouvir mudanças nos campos
  },
  
  /**
   * Forces workflow transition to a specific state after user confirmation
   * @param form - The current form instance
   * @param workflow_state - The target workflow state to transition to
   */
  force_workflow_transition: async (
    form: FrappeForm<InitialAnalysis>,
    workflow_state: string
  ): Promise<void> => {
    const confirmDialog = frappe.confirm(
      __(`Are you sure you want to advance the workflow to '${workflow_state}'? This action will bypass permission checks.`),
      async () => {
        try {
          // Force workflow transition ignoring permissions
          await agt.utils.update_workflow_state({
            doctype: form.doc.doctype,
            docname: form.doc.name,
            workflow_state: workflow_state,
            ignore_workflow_validation: true
          });

          // Show success message
          frappe.show_alert({
            message: __(`Workflow successfully transitioned to '${workflow_state}'`),
            indicator: "green"
          }, 5);

          // Reload form to reflect changes
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
        // User clicked "No", modal closes without action
        console.log("Workflow transition cancelled by user");
      }
    );

    // Set button labels
    confirmDialog.set_primary_action(__("Yes, Continue"));
    confirmDialog.set_secondary_action_label(__("No, Cancel"));
  },

  /**
   * Verifica se as condições para avançar para "Finished" foram atendidas
   * @param form - O formulário atual
   * @returns true se todas as condições foram atendidas
   */
  check_finished_conditions: (form: FrappeForm<InitialAnalysis>): boolean => {
    const solution_description = form.doc['solution_description'] || '';
    const solution_select = form.doc['solution_select'];
    
    // Verifica se solution_description tem pelo menos 15 caracteres
    // e se solution_select foi preenchido
    return solution_description.length >= 15 && !!solution_select;
  },

  /**
   * Verifica as condições e solicita transição para "Finished" se necessário
   * Esta função é chamada quando os campos relevantes mudam ou no refresh
   * @param form - O formulário atual
   */
  check_and_transition_to_finished: async (form: FrappeForm<InitialAnalysis>): Promise<void> => {
    // Não faz nada se o documento não foi salvo ainda
    if (!form.doc.name || form.doc.__islocal) {
      return;
    }

    // Verifica se já está no estado "Finished"
    if (form.doc.workflow_state === 'Finished') {
      return;
    }

    // Verifica se todas as condições foram atendidas
    const conditions_met = initial_analysis_utils.check_finished_conditions(form);
    
    if (conditions_met) {
      // Todas as condições foram atendidas, solicita a transição
      await initial_analysis_utils.force_workflow_transition(form, 'Finished');
    }
  }
};

frappe.ui.form.on("Initial Analysis", {
  setup: async (form: FrappeForm<InitialAnalysis>) => {
    // await agt.setup.run();
    // await agt.checklist.setup();
    await agt.corrections_tracker.run.run();
    initial_analysis_utils.fields_listener(form);
  },
  onload: async (form: FrappeForm<InitialAnalysis>) => {
    initial_analysis_utils.fields_listener(form);
  },
  refresh: async (form: FrappeForm<InitialAnalysis>) => {
    initial_analysis_utils.fields_listener(form);
    
    // Verifica condições após refresh (caso o usuário tenha fechado o modal anteriormente)
    await initial_analysis_utils.check_and_transition_to_finished(form);
  },
  before_load: async (form: FrappeForm<InitialAnalysis>) => {
    initial_analysis_utils.fields_listener(form);
  },
  validate: async (form: FrappeForm<InitialAnalysis>) => {
    initial_analysis_utils.fields_listener(form);
  },
  before_workflow_action: async () => {
    await agt.workflow.validate();
  },

  // Event handler para quando solution_description muda
  solution_description: async (form: FrappeForm<InitialAnalysis>) => {
    await initial_analysis_utils.check_and_transition_to_finished(form);
  },

  // Event handler para quando solution_select muda
  solution_select: async (form: FrappeForm<InitialAnalysis>) => {
    await initial_analysis_utils.check_and_transition_to_finished(form);
  }
},
);

