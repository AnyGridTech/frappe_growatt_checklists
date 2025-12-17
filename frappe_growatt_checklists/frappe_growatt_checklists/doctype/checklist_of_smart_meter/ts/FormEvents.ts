/*
* This file handles the form events for the Initial Analysis doctype.
* Read more: https://docs.frappe.io/framework/user/en/api/form#form-events
*/

frappe.ui.form.on(cur_frm.doc.doctype, 'setup', async () => {
  await agt.checklist.setup();
  await agt.corrections_tracker.run.run();
}); 