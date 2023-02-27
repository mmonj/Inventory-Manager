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

  async function handle_list_item_removal_transition(_promise, list_item, options = {}) {
    if (options.submit_button) {
      options.submit_button.hidden = true;
    }
    // options.submit_button && (options.submit_button.hidden = true);
    if (options.loading_indicator_element) {
      options.loading_indicator_element.hidden = false;
    }
    // options.loading_indicator_element && (options.loading_indicator_element.hidden = false);
  
    try {
      let resp_json = await _promise;
  
      list_item.addEventListener("animationend", handle_collapse);
      list_item.addEventListener("hidden.bs.collapse", (event) => {
        if (event.target.classList.contains("remove-queued")) {
          list_item.remove();
          if (options.action_on_removal) {
            options.action_on_removal();
          }
          // options.action_on_removal && options.action_on_removal();
        }
      });
  
      list_item.classList.add("remove-queued");
      list_item.classList.add("fade-zero");
    } catch (error_json) {
      console.log(error_json);
      show_alert_toast("Error", "An unexpected server error occurred.\nYou may try again.");

      if (options.submit_button) {
        options.submit_button.hidden = false;
      }
      // options.submit_button && (options.submit_button.hidden = false);
      if (options.loading_indicator_element) {
        options.loading_indicator_element.hidden = true;
      }
      // options.loading_indicator_element && (options.loading_indicator_element.hidden = true);
      list_item.classList.remove("remove-queued");
    }
  }
  
  function handle_collapse(event) {
    if (event.target.classList.contains("flash-item")) {
      event.target.classList.remove("flash-item");
    }
    if (!event.target.classList.contains("remove-queued")) {
      return;
    }
  
    event.target.classList.remove("d-flex");
    event.target.classList.remove("list-group-item");
    new bootstrap.Collapse(event.target);
  }

  return {
    _element: _element,
    handle_field_rep_change: handle_field_rep_change, 
    handle_populate_initial_dropdown_values: handle_populate_initial_dropdown_values,
    handle_collapse: handle_collapse,
    handle_list_item_removal_transition: handle_list_item_removal_transition
  };
})();
