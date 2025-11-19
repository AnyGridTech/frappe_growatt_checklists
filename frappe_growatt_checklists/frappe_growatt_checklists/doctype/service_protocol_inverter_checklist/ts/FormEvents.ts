import { ChecklistInverter } from "erpnext";
import { FrappeForm } from "../../../../types/frappe/frappe-core";

// frappe.ui.form.on(cur_frm.doc.doctype, 'onload', async () => {
//   await growatt.checklists.run();
//   await growatt.corrections_tracker.run();
// });

const allowRoles = frappe.user.has_role(['Information Technology User', 'Administrator', 'System Manager']);

frappe.ui.form.on(cur_frm.doc.doctype, {
  setup: async (frm: FrappeForm) => {
    await growatt.checklists.run();
    await growatt.corrections_tracker.run();
  },
  onload: async (frm: FrappeForm) => {
    fields_listener(frm);
  },
  refresh: async (frm: FrappeForm) => {
    fields_listener(frm);
  },
  validate: async (frm: FrappeForm) => {
    fields_listener(frm);
  },
});

function fields_listener(frm: FrappeForm) {
  fields_handler(frm);
  Object.keys(frm.fields_dict).forEach((fn) => {
    const field = frm.fields_dict[fn];
    const perms = frm.fields_dict[fn].df.permlevel;
    if (field.df) {
      field.df['onchange'] = () => {
        fields_handler(frm);
      };
    }
  });
}
async function fields_handler(frm: FrappeForm) {

  // take values from service protocol
  const main_eqp_type = await growatt.utils.get_value_from_any_doc(frm, 'Ticket', 'ticket_docname', 'main_eqp_type');
  const main_eqp_has_battery = await growatt.utils.get_value_from_any_doc(frm, 'Service Protocol', 'sp_docname', 'main_eqp_has_battery');
  const main_eqp_has_sem = await growatt.utils.get_value_from_any_doc(frm, 'Service Protocol', 'sp_docname', 'main_eqp_has_sem');
  const main_eqp_has_sm = await growatt.utils.get_value_from_any_doc(frm, 'Service Protocol', 'sp_docname', 'main_eqp_has_sm');
  const main_eqp_phase = await growatt.utils.get_value_from_any_doc(frm, 'Service Protocol', 'sp_docname', 'main_eqp_phase');
  const main_eqp_has_neutral = await growatt.utils.get_value_from_any_doc(frm, 'Service Protocol', 'sp_docname', 'main_eqp_has_neutral');
  const main_eqp_has_transformer = await growatt.utils.get_value_from_any_doc(frm, 'Service Protocol', 'sp_docname', 'main_eqp_has_transformer');
  //
  const workflowStates = growatt.namespace.checklist.workflow_state;
  const currentStateId = Object.values(workflowStates).find(state => state.name === frm.doc.workflow_state)?.id ?? 0;


  growatt.utils.child_table_custom_add_row(frm, 'inverter_mppt_continuity_test_video', 'Adicionar Vídeo');
  growatt.utils.child_table_custom_add_row(frm, 'inverter_dc_strings_opencircuit_voltage_picture', 'Adicionar Foto');
  growatt.utils.child_table_custom_add_row(frm, 'inverter_dc_voltage_positive_pe_picture', 'Adicionar Foto');
  growatt.utils.child_table_custom_add_row(frm, 'inverter_dc_voltage_negative_pe_picture', 'Adicionar Foto');
  growatt.utils.child_table_custom_add_row(frm, 'inverter_dc_connectors_picture', 'Adicionar Foto');
  growatt.utils.child_table_custom_add_row(frm, 'batteries_table', 'Adicionar Bateria');

  if (frm.doc.__islocal) {
    Object.keys(frm.fields_dict).forEach((fn) => frm.set_df_property(fn, 'hidden', 1));
  }

  const sectionMain = [
    'section_main',
    'section_eqp',
    'section_additional',
    'section_eqp_failure',
    'section_pre_analysis',
    'section_environment',
    'section_finishment',
  ];
  const hide_main = (frm.doc.__islocal) ? true : false;
  sectionMain.forEach(f => {
    frm.set_df_property(f, 'hidden', hide_main);
  });

  const sectionCAMeasurements = [
    'section_ca_output_measurements',
  ];
  const hide_ca_measurements = (main_eqp_type === "ONGRID");
  sectionCAMeasurements.forEach(f => frm.set_df_property(f, 'hidden', hide_ca_measurements));

  // Monophase-only fields
  const monophaseFields = [
    'inverter_voltage_r_s_picture',
    'inverter_voltage_s_pe_picture',
    'inverter_voltage_s_ne_picture',
    'transformer_voltage_r_s_picture',
    'transformer_voltage_s_ne_picture',
    'transformer_voltage_s_pe_picture',
    'inverter_output_voltage_r_s_picture',
    'inverter_output_voltage_s_ne_picture',
    'inverter_output_voltage_s_pe_picture',
  ];

  // Triphase-only fields
  const triphaseFields = [
    'inverter_voltage_s_t_picture',
    'inverter_voltage_t_r_picture',
    'inverter_voltage_t_pe_picture',
    'inverter_voltage_t_ne_picture',
    'transformer_voltage_s_t_picture',
    'transformer_voltage_t_r_picture',
    'transformer_voltage_t_ne_picture',
    'transformer_voltage_t_pe_picture',
    'inverter_output_voltage_s_t_picture',
    'inverter_output_voltage_t_r_picture',
    'inverter_output_voltage_t_ne_picture',
    'inverter_output_voltage_t_pe_picture',
  ];

  if (main_eqp_phase === "Single-Phase") {
    frm.set_df_property('main_eqp_grid_connection_type', 'options', ['', 'Monofásico', 'Bifásico']);
    frm.set_df_property('main_eqp_grid_connection_type', 'read_only', 0);
  } else if (main_eqp_phase === "Three-Phase") {
    frm.set_value('main_eqp_grid_connection_type', 'Trifásico');
    frm.set_df_property('main_eqp_grid_connection_type', 'read_only', 1);
  }

  const isMonophase = main_eqp_phase === "Monofásico" || main_eqp_phase === "Single-Phase";
  const isTriphase = main_eqp_phase === "Trifásico" || main_eqp_phase === "Three-Phase";
  monophaseFields.forEach(f => frm.set_df_property(f, 'hidden', !isMonophase));
  triphaseFields.forEach(f => frm.set_df_property(f, 'hidden', !isTriphase));

  const sectionBatteries = [
    'section_batteries',
    'section_battery_settings',
  ];

  // const hide_bat = (frm.doc.main_eqp_has_battery && (frm.doc.main_eqp_type !== 'HIBRIDO' && frm.doc.main_eqp_type !== 'OFFGRID')) ? false : true;
  const hide_bat = (main_eqp_has_battery && (main_eqp_type !== 'HYBRID' && main_eqp_type !== 'OFFGRID')) ? false : true;

  growatt.utils.set_field_properties(
    frm,
    Object.fromEntries(sectionBatteries.map(f => [f, { hidden: hide_bat }]))
  );

  const sectionSmartMeter = [
    'section_smart_meter',
  ];
  const hide_sm = main_eqp_has_sm ? false : true;
  growatt.utils.set_field_properties(
    frm,
    Object.fromEntries(sectionSmartMeter.map(f => [f, { hidden: hide_sm }]))
  );

  const sectionSme = [
    'section_sme',
  ];
  const hide_sem = main_eqp_has_sem ? false : true;
  growatt.utils.set_field_properties(
    frm,
    Object.fromEntries(sectionSme.map(f => [f, { hidden: hide_sem }]))
  );

  const sectionTransformer = [
    'section_transformer',
  ];
  const hide_trafo = main_eqp_has_transformer ? false : true;
  growatt.utils.set_field_properties(
    frm,
    Object.fromEntries(sectionTransformer.map(f => [f, { hidden: hide_trafo }]))
  );

  const neutralFields = [
    'colbreak_transformer_3',
    'colbreak_ca_output_measurements_3',
    'colbreak_ca_input_measurements_3',
  ];

  const hide_neutral = main_eqp_has_neutral ? false : true;
  growatt.utils.set_field_properties(
    frm,
    Object.fromEntries(neutralFields.map(f => [f, { hidden: hide_neutral }]))
  );

  const all_read_only = currentStateId >= 4;

  if (all_read_only) {
    Object.keys(frm.fields_dict).forEach(fn => frm.set_df_property(fn, 'read_only', all_read_only));
  }
}