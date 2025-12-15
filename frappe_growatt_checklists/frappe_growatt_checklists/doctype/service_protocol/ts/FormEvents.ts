import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";
import { ServiceProtocol } from "@anygridtech/frappe-agt-types/agt/doctype";

/*
* This file handles the form events for the Service Protocol doctype.
* Read more: https://docs.frappe.io/framework/user/en/api/form#form-events
*/

export const service_protocol_utils = {
  fields_listener: (_form: FrappeForm<ServiceProtocol>) => {
    // Implementação do fields_listener
    // Adicione aqui a lógica necessária para ouvir mudanças nos campos
  }
};

frappe.ui.form.on("Service Protocol", {
  setup: async (form: FrappeForm<ServiceProtocol>) => {
    await agt.setup.run();
    service_protocol_utils.fields_listener(form);
  },
  onload: async (form: FrappeForm<ServiceProtocol>) => {
    service_protocol_utils.fields_listener(form);
  },
  refresh: async (form: FrappeForm<ServiceProtocol>) => {
    service_protocol_utils.fields_listener(form);
  },
  before_load: async (form: FrappeForm<ServiceProtocol>) => {
    service_protocol_utils.fields_listener(form);
  },
  validate: async (form: FrappeForm<ServiceProtocol>) => {
    service_protocol_utils.fields_listener(form);
  }
},
);
