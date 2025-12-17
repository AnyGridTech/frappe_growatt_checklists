import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";
import { InitialAnalysis } from "@anygridtech/frappe-agt-types/agt/doctype";

/*
* This file handles the form events for the Initial Analysis doctype.
* Read more: https://docs.frappe.io/framework/user/en/api/form#form-events
*/

export const initial_analysis_utils = {
  fields_listener: (_form: FrappeForm<InitialAnalysis>) => {
    // Implementação do fields_listener
    // Adicione aqui a lógica necessária para ouvir mudanças nos campos
  }
};

frappe.ui.form.on("Initial Analysis", {
  setup: async (form: FrappeForm<InitialAnalysis>) => {
    await agt.setup.run();
    initial_analysis_utils.fields_listener(form);
  },
  onload: async (form: FrappeForm<InitialAnalysis>) => {
    initial_analysis_utils.fields_listener(form);
  },
  refresh: async (form: FrappeForm<InitialAnalysis>) => {
    initial_analysis_utils.fields_listener(form);
  },
  before_load: async (form: FrappeForm<InitialAnalysis>) => {
    initial_analysis_utils.fields_listener(form);
  },
  validate: async (form: FrappeForm<InitialAnalysis>) => {
    initial_analysis_utils.fields_listener(form);
  }
},
);

