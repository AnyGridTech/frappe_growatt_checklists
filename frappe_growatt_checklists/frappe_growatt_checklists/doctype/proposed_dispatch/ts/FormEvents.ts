
import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";

export const proposed_dispatch_utils = {
  validate: (form: FrappeForm<Record<string, any>>) => {
    const table = form.doc["proposed_dispatch_table"] || [];
    if (!Array.isArray(table) || table.length === 0) {
      frappe.msgprint({
        title: "Erro de Validação",
        message: "Adicione pelo menos um item à tabela antes de finalizar.",
        indicator: "red",
      });
      frappe.validated = false;
      return;
    }
    for (const row of table) {
      if (!row.item_quantity || row.item_quantity < 1) {
        frappe.msgprint({
          title: "Erro de Validação",
          message: "Cada item deve ter quantidade maior ou igual a 1.",
          indicator: "red",
        });
        frappe.validated = false;
        return;
      }
    }
  },
};

frappe.ui.form.on("Proposed Dispatch", {
  validate: (form: FrappeForm<Record<string, any>>) => {
    proposed_dispatch_utils.validate(form);
  },
});
