import { WorkflowValidation } from "@anygridtech/frappe-agt-types/agt/client/workflow/before_workflow_action";

const workflow_validations: WorkflowValidation[] = [
  {
    workflow_action: agt.metadata.doctype.initial_analysis.workflow_action.request_checklist.name,
    workflow_state: agt.metadata.doctype.initial_analysis.workflow_state.holding_action.name,
    workflow_fields: [
      {
        name: "main_eqp_purchase_invoice",
        depends_on: (frm) => {
          const main_eqp_purchase_invoice = frm.doc.main_eqp_purchase_invoice;
          if (!main_eqp_purchase_invoice)
            return `A nota fiscal deve ser anexada para prosseguir com a criação do checklist.`;
          return undefined;
        }
      },
      {
        name: "main_eqp_serial_no_label_picture",
        depends_on: (frm) => {
          const main_eqp_serial_no_label_picture = frm.doc.main_eqp_serial_no_label_picture;
          if (!main_eqp_serial_no_label_picture)
            return `A etiqueta do número de série deve ser anexada para prosseguir com a criação do checklist.`;
          return undefined;
        }
      },
      {
        name: "ext_fault_date",
        depends_on: (frm) => {
          const ext_fault_date = frm.doc.ext_fault_date;
          if (!ext_fault_date)
            return "A data da falha deve ser informada para prosseguir com a criação do checklist.";
          return undefined;
        }
      },
      {
        name: "ext_fault_code",
        depends_on: (frm) => {
          const ext_fault_code = frm.doc.ext_fault_code;
          if (!ext_fault_code)
            return "O código da falha deve ser informado para prosseguir com a criação do checklist.";
          return undefined;
        }
      },
      {
        name: "ext_fault_description",
        depends_on: (frm) => {
          const ext_fault_description = frm.doc.ext_fault_description;
          if (!ext_fault_description)
            return "A descrição da falha deve ser informada para prosseguir com a criação do checklist.";
          return undefined;
        }
      },
      {
        name: "ext_fault_customer_description",
        depends_on: (frm) => {
          const ext_fault_customer_description = frm.doc.ext_fault_customer_description;
          if (!ext_fault_customer_description || ext_fault_customer_description.length < 15)
            return `A descrição do label(${ext_fault_customer_description}) deve ter no mínimo 15 caracteres para prosseguir com a criação do checklist.`;
          return undefined;
        }
      },
      {
        name: "solution_description",
        depends_on: (frm) => {
          const solution_description = frm.doc.solution_description;
          if (!solution_description || solution_description.length < 15)
            return `A descrição da solução(${solution_description}) deve ter no mínimo 15 caracteres para prosseguir com a criação do checklist.`;
          return undefined;
        }
      },
      {
        name: "solution_select",
        depends_on: (frm) => {
          const solution_select = frm.doc.solution_select;
          if (!solution_select)
            return "A solução deve ser selecionada para prosseguir com a criação do checklist.";
          if (solution_select === "Abertura de Checklist")
            return "A solução aplicada deve ser condizente com a finalização do caso.";
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