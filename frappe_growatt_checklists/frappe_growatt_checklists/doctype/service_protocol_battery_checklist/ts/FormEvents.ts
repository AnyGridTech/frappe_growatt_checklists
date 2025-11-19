import { ChecklistBattery } from "erpnext";
import { FrappeForm } from "../../../../types/frappe/frappe-core";

/*
* This file handles the form events for the Service Protocol doctype.
* Read more: https://docs.frappe.io/framework/user/en/api/form#form-events
*/

frappe.ui.form.on(cur_frm.doc.doctype, 'setup', async () => {
  await growatt.checklists.run();
  await growatt.corrections_tracker.run();
});