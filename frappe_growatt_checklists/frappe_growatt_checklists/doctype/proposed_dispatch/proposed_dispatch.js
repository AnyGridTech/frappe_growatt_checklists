// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
"use strict";
(() => {
  // frappe_growatt_checklists/doctype/proposed_dispatch/ts/FormEvents.ts
  var proposed_dispatch_utils = {
    validate: (form) => {
      const table = form.doc["proposed_dispatch_table"] || [];
      if (!Array.isArray(table) || table.length === 0) {
        frappe.msgprint({
          title: "Validation Error",
          message: "Add at least one item to the table before submitting.",
          indicator: "red"
        });
        frappe.validated = false;
        return;
      }
      for (const row of table) {
        if (!row.item_quantity || row.item_quantity < 1) {
          frappe.msgprint({
            title: "Validation Error",
            message: "Each item must have a quantity greater than or equal to 1.",
            indicator: "red"
          });
          frappe.validated = false;
          return;
        }
      }
    }
  };
  frappe.ui.form.on("Proposed Dispatch", {
    setup: async () => {
      await agt.corrections_tracker.run.run();
    },
    validate: (form) => {
      proposed_dispatch_utils.validate(form);
    },
    before_workflow_action: async () => {
      await agt.workflow.validate();
    }
  });

  // frappe_growatt_checklists/doctype/proposed_dispatch/ts/WorkflowPreActions.ts
  var preActions = {
    validate_dispatch_table: async (frm) => {
      try {
        const table = frm.doc["proposed_dispatch_table"] || [];
        if (!Array.isArray(table) || table.length === 0) {
          throw new Error("Cannot proceed: The dispatch table is empty. Please add at least one item.");
        }
        for (let i = 0; i < table.length; i++) {
          const row = table[i];
          if (!row.item_name) {
            throw new Error(`Cannot proceed: Item name is missing for row ${i + 1}.`);
          }
          if (!row.item_quantity || row.item_quantity < 1) {
            throw new Error(`Cannot proceed: Item quantity must be at least 1 for row ${i + 1} (${row.item_name}).`);
          }
        }
        console.log(`\u2705 Dispatch table validated: ${table.length} items ready for dispatch`);
        const totalQuantity = table.reduce((sum, row) => sum + (row.item_quantity || 0), 0);
        frappe.show_alert({
          message: `Dispatch validated: ${table.length} items (${totalQuantity} total units)`,
          indicator: "green"
        }, 3);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("\u274C Error in validate_dispatch_table:", errorMessage);
        throw new Error(`Dispatch Validation Failed: ${errorMessage}`);
      }
    }
  };
  var wp = {
    // TODO: Replace with actual workflow action name from metadata
    // [agt.metadata.doctype.proposed_dispatch.workflow_action.submit.name]: {
    "Approve": {
      // Temporary placeholder - update with actual workflow action
      "Validate Dispatch Table": preActions.validate_dispatch_table
    }
  };
  frappe.ui.form.on("Proposed Dispatch", "before_load", async () => {
    if (!globalThis.workflow_preactions) {
      globalThis.workflow_preactions = {};
    }
    Object.assign(globalThis.workflow_preactions, wp);
  });

  // frappe_growatt_checklists/doctype/proposed_dispatch/ts/WorkflowValidations.ts
  var workflow_validations = [
    {
      // workflow_action: agt.metadata.doctype.proposed_dispatch.workflow_action.submit.name,
      workflow_action: "Approve",
      // workflow_state: agt.metadata.doctype.proposed_dispatch.workflow_state.draft.name,
      workflow_state: "Active",
      workflow_fields: [
        {
          name: "ticket_docname",
          depends_on: (frm) => {
            if (!frm.doc.ticket_docname) {
              return "The Ticket reference is missing. Cannot proceed without it.";
            }
            return void 0;
          }
        },
        {
          name: "proposed_dispatch_table",
          depends_on: (frm) => {
            const table = frm.doc.proposed_dispatch_table || [];
            if (!Array.isArray(table) || table.length === 0) {
              return "At least one item must be added to the dispatch table before proceeding.";
            }
            for (let i = 0; i < table.length; i++) {
              const row = table[i];
              if (!row.item_name) {
                return `Item name is required for row ${i + 1}.`;
              }
              if (!row.item_quantity || row.item_quantity < 1) {
                return `Item quantity must be at least 1 for row ${i + 1}.`;
              }
            }
            return void 0;
          }
        }
      ]
    }
  ];
  if (!globalThis.workflow_validations) {
    globalThis.workflow_validations = [];
  }
  globalThis.workflow_validations.push(...workflow_validations);
})();
