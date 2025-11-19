import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";

/*
* This file handles the form events for the Service Protocol doctype.
* Read more: https://docs.frappe.io/framework/user/en/api/form#form-events
*/

frappe.ui.form.on("Service Protocol", {
  setup: async (frm: FrappeForm) => {
    await agt.setup.run();
    agt.service_protocol.utils.fields_listener(frm);
  },
  onload: async (frm: FrappeForm) => {
    agt.service_protocol.utils.fields_listener(frm);
  },
  refresh: async (frm: FrappeForm) => {
    agt.service_protocol.utils.fields_listener(frm);
  },
  before_load: async (frm: FrappeForm) => {
    agt.service_protocol.utils.fields_listener(frm);
  },
  validate: async (frm: FrappeForm) => {
    agt.service_protocol.utils.fields_listener(frm);
  }
},
);
