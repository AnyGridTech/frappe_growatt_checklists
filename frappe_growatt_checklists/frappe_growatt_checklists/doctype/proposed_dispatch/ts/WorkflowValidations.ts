import { WorkflowValidation } from "@anygridtech/frappe-agt-types/agt/client/workflow/before_workflow_action";

const workflow_validations: WorkflowValidation[] = [
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
          return undefined;
        }
      },
      {
        name: "proposed_dispatch_table",
        depends_on: (frm) => {
          const table = frm.doc.proposed_dispatch_table || [];
          
          if (!Array.isArray(table) || table.length === 0) {
            return "At least one item must be added to the dispatch table before proceeding.";
          }
          
          // Validate each row
          for (let i = 0; i < table.length; i++) {
            const row = table[i];
            
            if (!row.item_name) {
              return `Item name is required for row ${i + 1}.`;
            }
            
            if (!row.item_quantity || row.item_quantity < 1) {
              return `Item quantity must be at least 1 for row ${i + 1}.`;
            }
          }
          
          return undefined;
        }
      }
    ]
  }
];

if (!(globalThis as any).workflow_validations) {
  (globalThis as any).workflow_validations = [];
} 

(globalThis as any).workflow_validations.push(...workflow_validations);
