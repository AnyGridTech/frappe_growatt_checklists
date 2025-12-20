// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
"use strict";
(() => {
  // frappe_growatt_checklists/doctype/proposed_dispatch/ts/FormEvents.ts
  var proposed_dispatch_utils = {
    validate: (form) => {
      const table = form.doc["proposed_dispatch_table"] || [];
      if (!Array.isArray(table) || table.length === 0) {
        frappe.msgprint({
          title: "Erro de Valida\xE7\xE3o",
          message: "Adicione pelo menos um item \xE0 tabela antes de finalizar.",
          indicator: "red"
        });
        frappe.validated = false;
        return;
      }
      for (const row of table) {
        if (!row.item_quantity || row.item_quantity < 1) {
          frappe.msgprint({
            title: "Erro de Valida\xE7\xE3o",
            message: "Cada item deve ter quantidade maior ou igual a 1.",
            indicator: "red"
          });
          frappe.validated = false;
          return;
        }
      }
    }
  };
  frappe.ui.form.on("Proposed Dispatch", {
    validate: (form) => {
      proposed_dispatch_utils.validate(form);
    }
  });
})();
