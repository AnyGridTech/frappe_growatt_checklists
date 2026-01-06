import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";
import { InitialAnalysis } from "@anygridtech/frappe-agt-types/agt/doctype";

/**
 * Auto-transitions for Initial Analysis doctype
 * This file contains logic for automatic workflow transitions based on field validations
 */

export const AutoTransitions = {
  /**
   * Main entry point for auto-transitions
   * Checks all possible auto-transitions and executes them if conditions are met
   */
  run: async (form: FrappeForm<InitialAnalysis>): Promise<void> => {
    await AutoTransitions.to_finished(form);
  },

  /**
   * Redirects to Ticket page with a loading modal
   * @param ticket_docname - The ticket document name to redirect to
   */
  redirect_to_ticket: async (ticket_docname: string): Promise<void> => {
    if (!ticket_docname) {
      console.warn("⚠️ No ticket docname provided, skipping redirect");
      return;
    }

    const redirectTitle = 'Redirecting to Ticket';
    const redirectMessage = 'You will be redirected to the ticket. It is important that you stay on that page to proceed to the next step.';

    console.log(`Preparing to redirect to Ticket: ${ticket_docname}`);

    // Handler to prevent browser tab close during redirect
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    // Add beforeunload handler to prevent tab close
    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Show large non-dismissible modal before redirecting
    const redirectDialog = new frappe.ui.Dialog({
      title: __(redirectTitle),
      size: 'large',
      fields: [
        {
          fieldtype: 'HTML',
          fieldname: 'redirect_message',
          label: '',
          options: `<div style="padding: 40px; text-align: center;">
            <p style="font-size: 18px; line-height: 1.8; font-weight: 500; color: #000; margin-bottom: 30px;">
              ${__(redirectMessage)}
            </p>
            <div style="margin-top: 30px;">
              <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem; border-width: 0.4rem;">
                <span class="sr-only">Loading...</span>
              </div>
            </div>
          </div>`
        }
      ],
      static: true
    });

    // Remove close button and ESC key functionality
    redirectDialog['$wrapper'].find('.modal-header .close').remove();
    redirectDialog['$wrapper'].find('.modal').attr('data-backdrop', 'static');
    redirectDialog['$wrapper'].find('.modal').attr('data-keyboard', 'false');
    redirectDialog.show();

    // Remove beforeunload handler to allow redirect
    window.removeEventListener('beforeunload', beforeUnloadHandler);

    // Wait 2 seconds before redirecting
    setTimeout(() => {
      console.log(`Timeout triggered, redirecting now...`);
      console.log(`Redirecting to ticket: ${ticket_docname}`);
      window.location.href = `/app/ticket/${ticket_docname}`;
    }, 100);
  },

  /**
   * Auto-transition to "Finished" state
   * Checks if all required conditions are met and triggers the transition
   */
  to_finished: async (form: FrappeForm<InitialAnalysis>): Promise<void> => {
    const stateTarget = agt.metadata.doctype.initial_analysis.workflow_state.finished.name;

    // Skip if document is not saved or is already in target state
    if (!form.doc.name || form.doc.__islocal || form.doc.workflow_state === stateTarget) {
      return;
    }

    // Define all required field validations
    const validations = [
      { field: 'ticket_docname', check: () => !!form.doc.ticket_docname },
      { field: 'main_eqp_purchase_invoice', check: () => !!form.doc['main_eqp_purchase_invoice'] },
      { field: 'main_eqp_serial_no_label_picture', check: () => !!form.doc['main_eqp_serial_no_label_picture'] },
      { field: 'ext_fault_date', check: () => !!form.doc.ext_fault_date },
      { field: 'ext_fault_code', check: () => !!form.doc.ext_fault_code },
      { field: 'ext_fault_description', check: () => !!form.doc.ext_fault_description },
      {
        field: 'ext_fault_customer_description',
        check: () => {
          const desc = form.doc.ext_fault_customer_description;
          return desc && desc.length >= 15;
        }
      },
      {
        field: 'solution_description',
        check: () => {
          const desc = form.doc['solution_description'];
          return desc && desc.length >= 15;
        }
      },
      { field: 'solution_select', check: () => !!form.doc['solution_select'] }
    ];

    // Check all conditions
    for (const validation of validations) {
      if (!validation.check()) {
        console.log(`⚠️ Auto-transition to Finished blocked: validation failed for field '${validation.field}'`);
        return;
      }
    }

    // All validations passed - trigger the transition
    console.log('✅ All validations passed for auto-transition to Finished');
    await AutoTransitions.force_workflow_transition(form, stateTarget);
  },

  /**
   * Forces workflow transition to a specific state after user confirmation
   * Shows a confirmation dialog and handles the transition process
   */
  force_workflow_transition: async (
    form: FrappeForm<InitialAnalysis>,
    workflow_state: string
  ): Promise<void> => {
    // Define localized strings
    const modalTitle = 'Confirm Workflow Transition';
    const confirmationMessage = `Are you sure you want to move the workflow to '${workflow_state}'? This action will bypass permission checks.`;
    const primaryActionLabel = 'Yes, Continue';
    const secondaryActionLabel = 'No, Cancel';
    const successMessage = `Workflow successfully transitioned to '${workflow_state}'`;
    const failureTitle = 'Workflow Transition Failed';
    const failureMessage = `Failed to transition workflow to '${workflow_state}'. Please try again or contact your system administrator.`;

    // Check if a confirmation dialog is already open
    if ($(`.modal.show .modal-title:contains("${modalTitle}")`).length > 0) {
      return;
    }

    // Create a custom modal dialog
    const dialog = new frappe.ui.Dialog({
      title: __(modalTitle),
      fields: [
        {
          fieldtype: 'HTML',
          fieldname: 'message',
          label: '',
          options: `<p>${__(confirmationMessage)}</p>`
        }
      ],
      primary_action_label: __(primaryActionLabel),
      secondary_action_label: __(secondaryActionLabel),
      primary_action: async function () {
        dialog.hide();

        const ticket_docname = form.doc.ticket_docname;

        try {
          form.set_df_property('workflow_state', 'read_only', 0);
          form.dirty();
          await form.save();

          // Force workflow transition ignoring permissions
          console.log('Transitioning workflow...');
          await agt.utils.update_workflow_state({
            doctype: form.doc.doctype,
            docname: form.doc.name,
            workflow_state: workflow_state,
            ignore_workflow_validation: true
          });

          // Update the form's workflow_state to prevent re-triggering
          form.doc.workflow_state = workflow_state;

          // Show success message
          frappe.show_alert({
            message: __(successMessage),
            indicator: "green"
          }, 5);

          console.log(`Ticket docname found: ${ticket_docname}`);

          if (ticket_docname) {
            // Use the independent redirect function
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
      },
      secondary_action: function () {
        dialog.hide();
      }
    });
    dialog.show();
  }
};
