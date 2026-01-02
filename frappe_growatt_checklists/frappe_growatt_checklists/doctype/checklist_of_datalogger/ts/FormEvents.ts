import { ChecklistDatalogger } from "@anygridtech/frappe-agt-types/agt/doctype";
import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";


// frappe.ui.form.on(cur_frm.doc.doctype, 'onload', async () => {
//   await growatt.checklists.run();
//   await growatt.corrections_tracker.run();
// });

// const allowRoles = frappe.user.has_role(['Information Technology User', 'Administrator', 'System Manager']);

// frappe.ui.form.on(cur_frm.doc.doctype, 'setup', async () => {
//     await agt.setup.run();
// });

frappe.ui.form.on(cur_frm.doc.doctype, {
  setup: async () => {
    await agt.checklist.setup();
    await agt.corrections_tracker.run.run();
  },
  onload: async (form: FrappeForm<ChecklistDatalogger>) => {
    fields_listener(form);
  },
  refresh: async (form: FrappeForm<ChecklistDatalogger>) => {
    fields_listener(form);
  },
  validate: async (form: FrappeForm<ChecklistDatalogger>) => {
    fields_listener(form);
  },
});

function fields_listener(form: FrappeForm<ChecklistDatalogger>) {
  fields_handler(form);
  Object.keys(form.fields_dict).forEach((fn) => {
    const field = form.fields_dict[fn];
    if (field && field.df) {
      field.df['onchange'] = () => {
        fields_handler(form);
      };
    }
  });
}

async function fields_handler(form: FrappeForm<ChecklistDatalogger>) {

  // Take values from other doctypes for general uses, such as hiding/showing fields
  const main_eqp_purchase_invoice = await agt.utils.get_target_field_by_field_match(form, 'Initial Analysis', 'ticket_docname', 'ticket_docname', 'main_eqp_purchase_invoice' );
  const main_eqp_has_battery = await agt.utils.get_target_field_by_field_match(form, 'Initial Analysis', 'ticket_docname', 'ticket_docname', 'main_eqp_has_battery' );
  const main_eqp_has_sem = await agt.utils.get_target_field_by_field_match( form, 'Initial Analysis', 'ticket_docname', 'ticket_docname', 'main_eqp_has_sem' );
  const main_eqp_has_sm = await agt.utils.get_target_field_by_field_match( form, 'Initial Analysis', 'ticket_docname', 'ticket_docname', 'main_eqp_has_sm' );
  const main_eqp_has_neutral = await agt.utils.get_target_field_by_field_match( form, 'Initial Analysis', 'ticket_docname', 'ticket_docname', 'main_eqp_has_neutral' );
  const main_eqp_has_transformer = await agt.utils.get_target_field_by_field_match( form, 'Initial Analysis', 'ticket_docname', 'ticket_docname', 'main_eqp_has_transformer' );
// Now set the values taken once in the form collectively
  const valuesToSet = {
    main_eqp_purchase_invoice,
    main_eqp_has_battery,
    main_eqp_has_sem,
    main_eqp_has_sm,
    main_eqp_has_neutral,
    main_eqp_has_transformer
  };
  
  Object.entries(valuesToSet).forEach(([field, value]) => {
    form.set_value(field, value);
  });
}