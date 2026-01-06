import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";
import { WorkflowPreActions } from "@anygridtech/frappe-agt-types/agt/client/workflow/";

const preActions = {
  validate_dispatch_table: async (frm: FrappeForm<Record<string, any>>) => {
    try {
      // ============================================================
      // STEP 1: Validate dispatch table exists and has items
      // ============================================================
      const table = frm.doc['proposed_dispatch_table'] || [];
      
      if (!Array.isArray(table) || table.length === 0) {
        throw new Error("Cannot proceed: The dispatch table is empty. Please add at least one item.");
      }

      // ============================================================
      // STEP 2: Validate each row in the table
      // ============================================================
      for (let i = 0; i < table.length; i++) {
        const row = table[i];
        
        if (!row.item_name) {
          throw new Error(`Cannot proceed: Item name is missing for row ${i + 1}.`);
        }
        
        if (!row.item_quantity || row.item_quantity < 1) {
          throw new Error(`Cannot proceed: Item quantity must be at least 1 for row ${i + 1} (${row.item_name}).`);
        }
      }

      console.log(`✅ Dispatch table validated: ${table.length} items ready for dispatch`);

      // ============================================================
      // STEP 3: Show summary to user
      // ============================================================
      const totalQuantity = table.reduce((sum, row) => sum + (row.item_quantity || 0), 0);
      
      frappe.show_alert({
        message: `Dispatch validated: ${table.length} items (${totalQuantity} total units)`,
        indicator: "green"
      }, 3);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Error in validate_dispatch_table:", errorMessage);
      throw new Error(`Dispatch Validation Failed: ${errorMessage}`);
    }
  }
};

// Export workflow pre-actions configuration
const wp: WorkflowPreActions = {
  // TODO: Replace with actual workflow action name from metadata
  // [agt.metadata.doctype.proposed_dispatch.workflow_action.submit.name]: {
  "Approve": { // Temporary placeholder - update with actual workflow action
    "Validate Dispatch Table": preActions.validate_dispatch_table
  }
};

frappe.ui.form.on('Proposed Dispatch', 'before_load', async () => {
  if (!(globalThis as any).workflow_preactions) {
    (globalThis as any).workflow_preactions = {};
  }
  Object.assign((globalThis as any).workflow_preactions, wp);
});
