import { WorkflowValidation } from "@anygridtech/frappe-agt-types/agt/client/workflow/before_workflow_action";

const workflow_validations: WorkflowValidation[] = [
  {
    workflow_action: agt.metadata.doctype.initial_analysis.workflow_action.finish.name,
    workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
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
        name: "main_eqp_purchase_invoice",
        depends_on: (frm) => {
          if (!frm.doc.main_eqp_purchase_invoice) {
            return "The purchase invoice must be attached to proceed with checklist creation.";
          }
          return undefined;
        }
      },
      {
        name: "main_eqp_serial_no_label_picture",
        depends_on: (frm) => {
          if (!frm.doc.main_eqp_serial_no_label_picture) {
            return "The serial number label must be attached to proceed with checklist creation.";
          }
          return undefined;
        }
      },
      {
        name: "ext_fault_date",
        depends_on: (frm) => {
          if (!frm.doc.ext_fault_date) {
            return "The failure date must be provided to proceed with checklist creation.";
          }
          return undefined;
        }
      },
      {
        name: "ext_fault_code",
        depends_on: (frm) => {
          if (!frm.doc.ext_fault_code) {
            return "The failure code must be provided to proceed with checklist creation.";
          }
          return undefined;
        }
      },
      {
        name: "ext_fault_description",
        depends_on: (frm) => {
          if (!frm.doc.ext_fault_description) {
            return "The failure description must be provided to proceed with checklist creation.";
          }
          return undefined;
        }
      },
      {
        name: "ext_fault_customer_description",
        depends_on: (frm) => {
          const desc = frm.doc.ext_fault_customer_description;
          if (!desc) {
            return "The customer's failure description must be provided to proceed with checklist creation.";
          }
          if (desc.length < 15) {
            return `The customer's failure description must have at least 15 characters (current: ${desc.length}).`;
          }
          return undefined;
        }
      },
      {
        name: "solution_description",
        depends_on: (frm) => {
          const desc = frm.doc.solution_description;
          if (!desc) {
            return "The solution description must be provided to proceed with checklist creation.";
          }
          if (desc.length < 15) {
            return `The solution description must have at least 15 characters (current: ${desc.length}).`;
          }
          return undefined;
        }
      },
      {
        name: "solution_select",
        depends_on: (frm) => {
          const solution = frm.doc.solution_select;
          if (!solution) {
            return "The solution must be selected to proceed with checklist creation.";
          }
          if (solution === "Deep Analysis") {
            return "The applied solution must be consistent with the case completion. 'Deep Analysis' cannot be used to finish the workflow.";
          }
          return undefined;
        }
      },
    ]
  },
];

// const checklistConfig = [
//   { group: 'Inverter', doctype: 'Checklist of Inverter', table_field: 'child_tracker_table', childname: 'child_tracker_workflow_state' },
//   { group: 'EV Charger', doctype: 'Checklist of EV Charger', table_field: 'child_tracker_table', childname: 'child_tracker_workflow_state' },
//   { group: 'Battery', doctype: 'Checklist of Battery', table_field: 'child_tracker_table', childname: 'child_tracker_workflow_state' },
//   { group: 'Smart Meter', doctype: 'Checklist of Smart Meter', table_field: 'child_tracker_table', childname: 'child_tracker_workflow_state' },
//   { group: 'Smart Energy Manager', doctype: 'Checklist of Smart Energy Manager', table_field: 'child_tracker_table', childname: 'child_tracker_workflow_state' },
//   { group: 'Datalogger', doctype: 'Checklist of Datalogger', table_field: 'child_tracker_table', childname: 'child_tracker_workflow_state' }
// ];


if (!(globalThis as any).workflow_validations) {
  (globalThis as any).workflow_validations = [];
} 

(globalThis as any).workflow_validations.push(...workflow_validations);