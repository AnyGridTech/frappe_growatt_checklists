// import { format } from "path";
import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";
import { Item, SerialNo, Company, ServiceProtocol } from "@anygridtech/frappe-agt-types/agt/doctype";

// const hasCustomer = frappe.user.has_role('Customer');
// const hasStandardEmployee = frappe.user.has_role('Standard Employee');
// const hasSupport = frappe.user.has_role('Support User') || frappe.user.has_role('Support Manager');
const hasAdmin = frappe.user.has_role('System Manager') || frappe.user.has_role('Administrator') || frappe.user.has_role('Information Technology');

const service_protocol_utils = {
  async update_related_forms(): Promise<void> {
    const fields_record = cur_frm.fields_dict;
    const wci = agt.utils.table.row.find(cur_frm, 'checklist_table_inverter', { or: { docstatus: [0] } });
    const wcc = agt.utils.table.row.find(cur_frm, 'checklist_table_ev_charger', { or: { docstatus: [0] } });
    const wcb = agt.utils.table.row.find(cur_frm, 'checklist_table_battery', { or: { docstatus: [0] } });
    const wcs = agt.utils.table.row.find(cur_frm, 'checklist_table_smart_meter', { or: { docstatus: [0] } });
    const wcem = agt.utils.table.row.find(cur_frm, 'checklist_table_smart_energy_manager', { or: { docstatus: [0] } });
    const wcd = agt.utils.table.row.find(cur_frm, 'checklist_table_datalogger', { or: { docstatus: [0] } });
    const wsp = agt.utils.table.row.find(cur_frm, 'checklist_table_service_protocol', { or: { docstatus: [0] } });

    const clean_dict = Object.entries(fields_record)
      .filter(([_, v]) => v.value !== undefined)
      .reduce((acc, [k, v]) => {
        acc[k] = v.value;
        return acc;
      }, {} as Record<string, any>);

    const shared_users = frappe.model.get_shared('Initial Analysis', cur_frm.docname);
    wci?.forEach(async row => {
      await agt.utils.doc.update_doc('Checklist of Inverter', row.checklist_docname, clean_dict);
      await agt.utils.doc.share_doc('Checklist of Inverter', row.checklist_docname, shared_users);
    });
    wcc?.forEach(async row => {
      await agt.utils.doc.update_doc('Checklist of EV Charger', row.checklist_docname, clean_dict);
      await agt.utils.doc.share_doc('Checklist of EV Charger', row.checklist_docname, shared_users);
    });
    wcb?.forEach(async row => {
      await agt.utils.doc.update_doc('Checklist of Battery', row.checklist_docname, clean_dict);
      await agt.utils.doc.share_doc('Checklist of Battery', row.checklist_docname, shared_users);
    });
    wcs?.forEach(async row => {
      await agt.utils.doc.update_doc('Checklist of Smart Meter', row.checklist_docname, clean_dict);
      await agt.utils.doc.share_doc('Checklist of Smart Meter', row.checklist_docname, shared_users);
    });
    wcem?.forEach(async row => {
      await agt.utils.doc.update_doc('Checklist of Smart Energy Manager', row.checklist_docname, clean_dict);
      await agt.utils.doc.share_doc('Checklist of Smart Energy Manager', row.checklist_docname, shared_users);
    });
    wcd?.forEach(async row => {
      await agt.utils.doc.update_doc('Checklist of Datalogger', row.checklist_docname, clean_dict);
      await agt.utils.doc.share_doc('Checklist of Datalogger', row.checklist_docname, shared_users);
    });
    wsp?.forEach(async row => {
      await agt.utils.doc.update_doc('Service Protocol', row.checklist_docname, clean_dict);
      await agt.utils.doc.share_doc('Service Protocol', row.checklist_docname, shared_users);
    });
  },
  fields_listener(frm: FrappeForm<ServiceProtocol>) {
    service_protocol_utils.fields_handler(frm);
    Object.keys(frm.fields_dict).forEach((fn) => {
      const field = frm.fields_dict[fn];
      if (field && field.df) {
        field.df['onchange'] = () => {
          service_protocol_utils.fields_handler(frm);
        };
      }
    });
  },
  fields_handler: async function (form: FrappeForm<ServiceProtocol>) {

    if (form.doc['opening_date'] === "" || form.doc['opening_date'] === undefined || form.doc['opening_date'] === null) {
      form.doc['opening_date'] = frappe.datetime.now_date();
    }
    form.set_df_property('opening_date', 'read_only', form.doc['opening_date'] ? 1 : 0);

    if (form.doc['opening_user'] === "" || form.doc['opening_user'] === undefined || form.doc['opening_user'] === null) {
      form.doc['opening_user'] = frappe.session.user;
    }
    form.set_df_property('opening_user', 'read_only', form.doc['opening_user'] ? 1 : 0);

    agt.utils.form.set_button_primary_style(form, 'add_child_button');

    agt.utils.table.set_custom_properties(
      form, {
      hidden: false,
      cannot_delete_rows: !hasAdmin,
      cannot_add_rows: !hasAdmin,
      hide_add_row: !hasAdmin,
      hide_remove_row: !hasAdmin,
      hide_remove_all_rows: !hasAdmin,
      hide_row_check: !hasAdmin,
      hide_append_row: !hasAdmin,
      hide_shortcuts: !hasAdmin,
      hide_check: !hasAdmin,
      hide_config_columns: true,
      hide_grid_delete_row: !hasAdmin,
      hide_grid_move_row: !hasAdmin,
    },
      'public_comment',
      'Adicionar Comentário',
    );

    agt.utils.table.set_custom_properties(
      form, {
      hidden: false,
      cannot_delete_rows: !hasAdmin,
      cannot_add_rows: !hasAdmin,
      hide_add_row: !hasAdmin,
      hide_remove_row: !hasAdmin,
      hide_remove_all_rows: !hasAdmin,
      hide_row_check: !hasAdmin,
      hide_append_row: !hasAdmin,
      hide_shortcuts: !hasAdmin,
      hide_check: !hasAdmin,
      hide_config_columns: true,
      hide_grid_delete_row: !hasAdmin,
      hide_grid_move_row: !hasAdmin,
    },
      'private_comment',
      'Adicionar Comentário',
    );

    // Definir valores padrão baseados no main_eqp_group
    let defaultTableRow = { item_name: '', item_quantity: 1 };

    // if (frm.doc.main_eqp_group === 'Datalogger') {
    //   defaultTableRow.item_name = 'Datalogger';
    //   defaultTableRow.item_quantity = 1;
    // } else if (frm.doc.main_eqp_group === 'Inverter') {
    //   defaultTableRow.item_name = 'Inverter';
    //   defaultTableRow.item_quantity = 1;
    // }

    const mainEqpGroup = await agt.utils.get_value_from_any_doc(form, 'Ticket', 'ticket_docname', 'main_eqp_group');
    if (mainEqpGroup === 'Datalogger') {
      defaultTableRow.item_name = 'Datalogger';
      defaultTableRow.item_quantity = 1;
    } else if (mainEqpGroup === 'Inverter') {
      defaultTableRow.item_name = 'Inverter';
      defaultTableRow.item_quantity = 1;
    }

    // growatt.utils.set_table_custom_properties(
    //   frm,
    //   {
    //     hidden: false,
    //     cannot_delete_rows: !hasAdmin && !hasSupport,
    //     cannot_add_rows: !hasAdmin && !hasSupport,
    //     hide_add_row: !hasAdmin && !hasSupport,
    //     hide_remove_row: !hasAdmin && !hasSupport,
    //     hide_remove_all_rows: !hasAdmin && !hasSupport,
    //     hide_row_check: !hasAdmin && !hasSupport,
    //     hide_append_row: !hasAdmin && !hasSupport,
    //     hide_shortcuts: !hasAdmin && !hasSupport,
    //     hide_check: !hasAdmin && !hasSupport,
    //     hide_config_columns: true,
    //     hide_grid_delete_row: !hasAdmin && !hasSupport,
    //     hide_grid_move_row: !hasAdmin && !hasSupport,
    //   },
    //   'proposed_dispatch_table',
    //   'Adicionar Equipamento/Periférico',
    //   [defaultTableRow],
    //   true
    // );

    // setup const to grab workflow state by number
    const workflowStates = agt.metadata.doctype.service_protocol.workflow_state;
    const currentStateId = Object.values(workflowStates).find(state => state.name === form.doc['workflow_state'])?.id || 0;
    // add_child_button, child_table, checklist_table_html, section_eqp_failure
    const sectionStarting = [
      'add_child_button',
      'child_table_html',
      'section_checklist_links',
      'checklist_table_html',
      'section_eqp_failure',
    ];
    sectionStarting.forEach(f => {
      // form.set_df_property(f, 'hidden', (form.doc.__islocal || currentStateId <= 0) ? 1 : 0);
      form.set_df_property(f, 'read_only', currentStateId >= 3 ? 1 : 0);
    });
    // section_additional
    // form.set_df_property('section_additional', 'hidden', form.doc.main_eqp_model ? 0 : 1);
    form.set_df_property('section_additional', 'read_only', currentStateId >= 3 ? 1 : 0);
    // const snVisible = growatt.utils.sn_regex.test(form.doc.main_eqp_serial_no || '');
    // form.set_df_property('main_eqp_model_ref', 'hidden', snVisible ? 0 : 1);
    // section_pre_analysis
    const sectionPreAnalysis = [
      'section_pre_analysis',
      'section_pre_analysis_conclusion',
    ];
    sectionPreAnalysis.forEach(f => {
      // form.set_df_property(f, 'hidden', (form.doc.__islocal || currentStateId <= 2) ? 1 : 0);
      form.set_df_property(f, 'read_only', currentStateId >= 3 ? 1 : 0);
    });
    // ext_fault_date, ext_fault_code, ext_fault_description, ext_fault_customer_description
    const EqpFailure = [
      'ext_fault_date',
      'ext_fault_code',
      'ext_fault_description',
      'ext_fault_customer_description'
    ];
    EqpFailure.forEach(f => {
      // form.set_df_property(f, 'reqd', currentStateId >= 2 ? 1 : 0);
      form.set_df_property(f, 'read_only', currentStateId >= 3 ? 1 : 0);
    });
    form.set_df_property('ext_fault_description', 'read_only', 1);
  },

  trigger_create_sn_into_db: async (frm: FrappeForm<ServiceProtocol>) => {
    if (frm.doc.__islocal) return;
    const serial_no = frm.doc.main_eqp_serial_no!;
    if (!serial_no) {
      console.error("Número de série não fornecido");
      return;
    }

    const db_sn = await frappe.db
      .get_value<SerialNo>('Serial No', serial_no, ['serial_no', 'item_code', 'warehouse', 'company', 'status', 'workflow_state'])
      .catch(e => {
        console.error("Erro ao buscar número de série:", e);
        return null;
      })
      .then(r => r?.message);

    const hasKeys = (obj: any) => obj && typeof obj === "object" && Object.keys(obj).length > 0;
    // const isEmptyObj = (obj: any) => obj && typeof obj === "object" && Object.keys(obj).length === 0;
    const service_partner_company = frm.doc.service_partner_company;
    if (!service_partner_company) {
      console.error("Empresa parceira de serviço não definida");
      return;
    }

    // If db_sn is not defined or is empty, we will create a new record

    if (db_sn && hasKeys(db_sn)) {
      // Serial Number found and has properties - update workflow state
      try {
        await agt.utils.update_workflow_state({
          doctype: "Serial No",
          docname: db_sn.serial_no,
          workflow_state: agt.metadata.doctype.service_protocol.workflow_state.holding_action.name,
          ignore_workflow_validation: true
        });
        console.log("Estado de workflow do Serial No atualizado com sucesso:", db_sn.serial_no);
      } catch (error) {
        console.error("Error updating Serial No workflow state:", error);
        throw new Error("Error updating workflow state: " + (error instanceof Error ? error.message : String(error)));
      }
    } else {
      // Serial Number not found or empty - create new
      const item = await frappe.db
        .get_value<Item>('Item', { item_code: frm.doc['main_eqp_item_code']! }, ['item_name', 'item_code'])
        .catch(e => {
          console.error("Erro ao buscar item:", e);
          return null;
        })
        .then(r => r?.message);

      if (!item) {
        console.error("Item not found for code:", frm.doc['main_eqp_item_code']);
        throw new Error(`Item not found for code: ${frm.doc['main_eqp_item_code']}`);
      }

      try {
        console.log("Creating new Serial No:", serial_no);

        // Create object with fields to create a Serial No
        // We need to create an object that emulates the structure of form.fields_dict
        const serialNoFields: Record<string, any> = {};

        // Set each field with the expected structure {value: fieldValue}
        serialNoFields['serial_no'] = { value: serial_no };
        serialNoFields['item_code'] = { value: item.item_code };
        serialNoFields['company'] = { value: service_partner_company };
        serialNoFields['status'] = { value: "Active" };

        console.log("Fields for Serial No creation:", JSON.stringify(serialNoFields));

        const sn_docname = await agt.utils.doc.create_doc<SerialNo>('Serial No', { docname: "sp_docname" }, serialNoFields);
        if (!sn_docname) {
          throw new Error("Failed to create Serial No - no document name returned");
        }

        console.log("Serial No created successfully:", sn_docname);

        // Update the workflow state for the newly created Serial No
        await agt.utils.update_workflow_state({
          doctype: "Serial No",
          docname: sn_docname,
          workflow_state: agt.metadata.doctype.service_protocol.workflow_state.holding_action.name,
          ignore_workflow_validation: true
        });
        console.log("Serial No workflow state updated successfully:", sn_docname);
      } catch (error) {
        console.error("Error creating or updating Serial No:", error);
        throw new Error("Error creating or updating Serial No: " + (error instanceof Error ? error.message : String(error)));
      }
    }
  },

  set_service_partner: async function (form: FrappeForm<ServiceProtocol>) {
    async function decideServicePartner() {
      const service_partner_companies = await service_protocol_utils.GetServPartnerCompanies();
      return service_partner_companies?.filter((c: Company) => c.name === "Growatt")[0];
    }
    // if (form.doc.workflow_state === growatt.namespace.ticket.workflow_state.active.name) return;
    if (form.doc.__islocal) return;
    const service_partner_company = form.doc['service_partner_company'];
    if (service_partner_company) return;
    const spc = await decideServicePartner();
    if (!spc) return;
    await agt.utils.doc.update_doc(form.doctype, form.docname, { service_partner_company: spc.name });
  },

  GetServPartnerCompanies: async function (name?: string) {
    return await frappe.db.get_list<Company>('Company', {
      filters: {
        custom_service_partner: 1,
        name
      },
      fields: ['name', 'abbr', 'is_group']
    });
  },

  share_doc_trigger: async function (frm: FrappeForm) {
    if (frm.doc.__islocal) return;
    const mainCustomer = frm.doc['main_customer_email'];
    if (mainCustomer) {
      const shared_users = [
        {
          creation: '',
          everyone: 0,
          name: '',
          owner: '',
          read: 1,
          share: 1,
          submit: 1,
          user: mainCustomer,
          write: 1
        }
      ];
      await agt.utils.doc.share_doc('Service Protocol', frm.doc.name, shared_users);
    }
  },
};
export { service_protocol_utils };
