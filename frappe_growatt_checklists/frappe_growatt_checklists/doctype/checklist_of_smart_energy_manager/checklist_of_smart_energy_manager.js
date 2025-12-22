// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
"use strict";
(() => {
  // frappe_growatt_checklists/doctype/checklist_of_smart_energy_manager/ts/FormEvents.ts
  frappe.ui.form.on(cur_frm.doc.doctype, "setup", async () => {
    await agt.checklist.setup();
    await agt.corrections_tracker.run.run();
  });
})();
