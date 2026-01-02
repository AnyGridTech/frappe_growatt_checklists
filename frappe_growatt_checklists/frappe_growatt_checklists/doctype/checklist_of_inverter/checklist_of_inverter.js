// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
"use strict";
(() => {
  // frappe_growatt_checklists/doctype/checklist_of_inverter/ts/FormEvents.ts
  frappe.ui.form.on(cur_frm.doc.doctype, {
    setup: async () => {
      await agt.checklist.setup();
      await agt.corrections_tracker.run.run();
    },
    onload: async (form) => {
      fields_listener(form);
    },
    refresh: async (form) => {
      fields_listener(form);
    },
    validate: async (form) => {
      fields_listener(form);
    }
  });
  function fields_listener(form) {
    fields_handler(form);
    Object.keys(form.fields_dict).forEach((fn) => {
      const field = form.fields_dict[fn];
      if (field && field.df) {
        field.df["onchange"] = () => {
          fields_handler(form);
        };
      }
    });
  }
  async function fields_handler(form) {
    const main_eqp_type = await agt.utils.get_value_from_any_doc(form, "Ticket", "ticket_docname", "main_eqp_type");
    const main_eqp_phase = await agt.utils.get_value_from_any_doc(form, "Ticket", "ticket_docname", "main_eqp_phase");
    const main_eqp_has_battery = await agt.utils.get_value_from_any_doc(form, "Initial Analysis", "inanly_docname", "main_eqp_has_battery");
    const main_eqp_has_sem = await agt.utils.get_value_from_any_doc(form, "Initial Analysis", "inanly_docname", "main_eqp_has_sem");
    const main_eqp_has_sm = await agt.utils.get_value_from_any_doc(form, "Initial Analysis", "inanly_docname", "main_eqp_has_sm");
    const main_eqp_has_neutral = await agt.utils.get_value_from_any_doc(form, "Initial Analysis", "inanly_docname", "main_eqp_has_neutral");
    const main_eqp_has_transformer = await agt.utils.get_value_from_any_doc(form, "Initial Analysis", "inanly_docname", "main_eqp_has_transformer");
    const workflowStates = agt.metadata.doctype.checklist.workflow_state;
    const currentStateId = Object.values(workflowStates).find((state) => state.name === form.doc.workflow_state)?.id ?? 0;
    agt.utils.table.custom_add_row_button(form, "inverter_mppt_continuity_test_video", "Add Video");
    agt.utils.table.custom_add_row_button(form, "inverter_dc_strings_opencircuit_voltage_picture", "Add Photo");
    agt.utils.table.custom_add_row_button(form, "inverter_dc_voltage_positive_pe_picture", "Add Photo");
    agt.utils.table.custom_add_row_button(form, "inverter_dc_voltage_negative_pe_picture", "Add Photo");
    agt.utils.table.custom_add_row_button(form, "inverter_dc_connectors_picture", "Add Photo");
    agt.utils.table.custom_add_row_button(form, "batteries_table", "Add Battery");
    if (form.doc.__islocal) {
      Object.keys(form.fields_dict).forEach((fn) => form.set_df_property(fn, "hidden", 1));
    }
    const sectionMain = [
      "section_main",
      "section_eqp",
      "section_additional",
      "section_eqp_failure",
      "section_pre_analysis",
      "section_environment",
      "section_finishment"
    ];
    const hide_main = form.doc.__islocal ? true : false;
    sectionMain.forEach((f) => {
      form.set_df_property(f, "hidden", hide_main);
    });
    const sectionCAMeasurements = [
      "section_ca_output_measurements"
    ];
    const hide_ca_measurements = main_eqp_type === "ONGRID";
    sectionCAMeasurements.forEach((f) => form.set_df_property(f, "hidden", hide_ca_measurements));
    const monophaseFields = [
      "inverter_voltage_r_s_picture",
      "inverter_voltage_s_pe_picture",
      "inverter_voltage_s_ne_picture",
      "transformer_voltage_r_s_picture",
      "transformer_voltage_s_ne_picture",
      "transformer_voltage_s_pe_picture",
      "inverter_output_voltage_r_s_picture",
      "inverter_output_voltage_s_ne_picture",
      "inverter_output_voltage_s_pe_picture"
    ];
    const triphaseFields = [
      "inverter_voltage_s_t_picture",
      "inverter_voltage_t_r_picture",
      "inverter_voltage_t_pe_picture",
      "inverter_voltage_t_ne_picture",
      "transformer_voltage_s_t_picture",
      "transformer_voltage_t_r_picture",
      "transformer_voltage_t_ne_picture",
      "transformer_voltage_t_pe_picture",
      "inverter_output_voltage_s_t_picture",
      "inverter_output_voltage_t_r_picture",
      "inverter_output_voltage_t_ne_picture",
      "inverter_output_voltage_t_pe_picture"
    ];
    if (main_eqp_phase === "Single-Phase") {
      form.set_df_property("main_eqp_grid_connection_type", "options", ["", "Monof\xE1sico", "Bif\xE1sico"]);
      form.set_df_property("main_eqp_grid_connection_type", "read_only", 0);
    } else if (main_eqp_phase === "Three-Phase") {
      form.set_value("main_eqp_grid_connection_type", "Trif\xE1sico");
      form.set_df_property("main_eqp_grid_connection_type", "read_only", 1);
    }
    const isMonophase = main_eqp_phase === "Monof\xE1sico" || main_eqp_phase === "Single-Phase";
    const isTriphase = main_eqp_phase === "Trif\xE1sico" || main_eqp_phase === "Three-Phase";
    monophaseFields.forEach((f) => form.set_df_property(f, "hidden", !isMonophase));
    triphaseFields.forEach((f) => form.set_df_property(f, "hidden", !isTriphase));
    const sectionBatteries = [
      "section_batteries",
      "section_battery_settings"
    ];
    const hide_bat = main_eqp_has_battery && (main_eqp_type !== "HYBRID" && main_eqp_type !== "OFFGRID") ? false : true;
    agt.utils.form.field.set_properties(
      form,
      Object.fromEntries(sectionBatteries.map((f) => [f, { hidden: hide_bat }]))
    );
    const sectionSmartMeter = [
      "section_smart_meter"
    ];
    const hide_sm = main_eqp_has_sm ? false : true;
    agt.utils.form.field.set_properties(
      form,
      Object.fromEntries(sectionSmartMeter.map((f) => [f, { hidden: hide_sm }]))
    );
    const sectionSme = [
      "section_sme"
    ];
    const hide_sem = main_eqp_has_sem ? false : true;
    agt.utils.form.field.set_properties(
      form,
      Object.fromEntries(sectionSme.map((f) => [f, { hidden: hide_sem }]))
    );
    const sectionTransformer = [
      "section_transformer"
    ];
    const hide_trafo = main_eqp_has_transformer ? false : true;
    agt.utils.form.field.set_properties(
      form,
      Object.fromEntries(sectionTransformer.map((f) => [f, { hidden: hide_trafo }]))
    );
    const neutralFields = [
      "colbreak_transformer_3",
      "colbreak_ca_output_measurements_3",
      "colbreak_ca_input_measurements_3"
    ];
    const hide_neutral = main_eqp_has_neutral ? false : true;
    agt.utils.form.field.set_properties(
      form,
      Object.fromEntries(neutralFields.map((f) => [f, { hidden: hide_neutral }]))
    );
    const all_read_only = currentStateId >= 4;
    if (all_read_only) {
      Object.keys(form.fields_dict).forEach((fn) => form.set_df_property(fn, "read_only", all_read_only));
    }
  }
})();
