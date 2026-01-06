
import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";

export const proposed_dispatch_utils = {
  validate: (form: FrappeForm<Record<string, any>>) => {
    const table = form.doc["proposed_dispatch_table"] || [];
    if (!Array.isArray(table) || table.length === 0) {
      frappe.msgprint({
        title: "Validation Error",
        message: "Add at least one item to the table before submitting.",
        indicator: "red",
      });
      frappe.validated = false;
      return;
    }
    for (const row of table) {
      if (!row.item_quantity || row.item_quantity < 1) {
        frappe.msgprint({
          title: "Validation Error",
          message: "Each item must have a quantity greater than or equal to 1.",
          indicator: "red",
        });
        frappe.validated = false;
        return;
      }
    }
  },
};

frappe.ui.form.on("Proposed Dispatch", {
  setup: async () => {
    await agt.corrections_tracker.run.run();
  },
  
  validate: (form: FrappeForm<Record<string, any>>) => {
    proposed_dispatch_utils.validate(form);
  },
  
  before_workflow_action: async () => {
    await agt.workflow.validate();
  }
});
