function handle_field_rep_change(event, territory_info) {
  let new_field_rep_name = event.target.value;
  let store_select_node = document.getElementById("store-select");
  store_select_node.innerHTML = "";
  update_store_select_options(new_field_rep_name, store_select_node, territory_info);
}

function populate_initial_dropdown_values(territory_info) {
  let field_rep_select_node = document.getElementById("field-representative-select");
  for (let territory of territory_info.territory_list) {
    let new_option_node = document.createElement("option");
    new_option_node.setAttribute("value", territory.field_rep_id);
    new_option_node.innerText = territory.field_rep_name;

    field_rep_select_node.appendChild(new_option_node);
  }
  update_store_select_options(
    field_rep_select_node.options[field_rep_select_node.selectedIndex].innerText,
    document.getElementById("store-select"),
    territory_info
  );
}

function update_store_select_options(new_field_rep_name, store_select_node, territory_info) {
  let disabled_placeholder_option = document.createElement("option");
  disabled_placeholder_option.disabled = true;
  disabled_placeholder_option.selected = true;
  disabled_placeholder_option.value = "";
  disabled_placeholder_option.innerText = "Search Stores";
  store_select_node.appendChild(disabled_placeholder_option);

  for (let territory of territory_info.territory_list) {
    if (territory.field_rep_name === new_field_rep_name) {
      for (let store_info of territory.stores) {
        let new_option_node = document.createElement("option");
        new_option_node.setAttribute("value", store_info.store_id);
        new_option_node.innerText = store_info.store_name;

        store_select_node.appendChild(new_option_node);
      }
      return;
    }
  }
}
