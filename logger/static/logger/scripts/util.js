const LOGGER_UTILS = (function() {
  "use strict";

  // create element node from string
  function _element(html_str) {
    var template = document.createElement("template");
    template.innerHTML = html_str.trim();
    return template.content.childNodes[0];
  }
  
  function handle_field_rep_change(event, territory_info) {
    let new_field_rep_id = event.target.value;
    let store_select_node = document.getElementById("store-select");
    store_select_node.innerHTML = "";
    update_store_select_options(new_field_rep_id, store_select_node, territory_info);
  }

  function handle_populate_initial_dropdown_values(territory_info) {
    let field_rep_select_node = document.getElementById("field-representative-select");
    for (let territory of territory_info.territory_list) {
      field_rep_select_node.appendChild(_element(/*html*/`
        <option value="${territory.field_rep_id}">${territory.field_rep_name}</option>
      `));
    }
    update_store_select_options(
      field_rep_select_node.options[field_rep_select_node.selectedIndex].value,
      document.getElementById("store-select"),
      territory_info
    );
  }

  function update_store_select_options(new_field_rep_id, store_select_node, territory_info) {
    store_select_node.appendChild(_element(/*html*/`
      <option disabled selected value="">Search Stores</option>
    `));

    for (let territory of territory_info.territory_list) {
      if (territory.field_rep_id == new_field_rep_id) {
        for (let store_info of territory.stores) {
          let new_option_node = _element(`<option value="${store_info.store_id}"></option>`);
          new_option_node.innerText = store_info.store_name;
          store_select_node.appendChild(new_option_node);
        }
        return;
      }
    }
  }

  return {
    _element: _element,
    handle_field_rep_change: handle_field_rep_change, 
    handle_populate_initial_dropdown_values: handle_populate_initial_dropdown_values,
  };
})();
