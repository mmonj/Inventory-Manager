function handle_manual_upc_submission(event) {
  event.preventDefault();
  document.getElementById("error-manual-upc").hidden = true;

  let upc_number_node = document.getElementById("text-input-upc");
  handle_submit_upc(upc_number_node.value, (is_scan_sound_play = false))
    .then(() => {
      upc_number_node.value = "";
    })
    .catch((resp_json) => {
      if (resp_json.is_upc_already_scanned) {
        upc_number_node.value = "";
        console.log("already scanned");
      }

      show_manual_upc_errors(resp_json.errors);
    });
}

function handle_submit_upc(upc_number, is_scan_sound_play = true) {
  if (is_scan_sound_play) {
    window.LOGGER_INFO.scan_sound.play();
  }

  let ret = { errors: [] };

  if (window.LOGGER_INFO.scanned_upcs.has(upc_number)) {
    ret.is_upc_already_scanned = true;
    ret.errors.push("This UPC has already been scanned in this session");
    return Promise.reject(ret);
  }

  let [scan_results, new_li] = show_upc_submission_loading(upc_number);

  return send_post_product_addition(upc_number)
    .then((resp_json) => {
      window.LOGGER_INFO.scanned_upcs.add(upc_number);
      scan_results.prepend(new_li);
      new_li.querySelector("button").addEventListener("click", handle_remove_upc);
      new_li.querySelector(".product-name").innerText = resp_json.product_info.name;
      document.getElementById("spinner-loading-scan").classList.add("visually-hidden");
      document.getElementById("text-input-upc").value = "";
      return resp_json;
    })
    .catch((resp_json) => {
      document.getElementById("spinner-loading-scan").classList.add("visually-hidden");
      console.log(resp_json);
      if (!resp_json.errors) {
        show_alert_toast("Error", "An unexpected server error occurred.\nYou may try again.");
      }

      return Promise.reject(resp_json);
    });
}

function handle_remove_upc(event) {
  let upc_number = event.target.parentElement.querySelector(".upc-container").innerText;
  let list_item = event.target.parentElement;
  list_item.querySelector(".button-remove-product").hidden = true;
  list_item.querySelector(".spinner-remove-product").hidden = false;

  send_post_product_addition(upc_number, (is_remove = true))
    .then((resp_json) => {
      list_item.classList.add("shrink-zero");
    })
    .catch((resp_json) => {
      console.log(resp_json);
      show_alert_toast("Error", "An unexpected server error occurred.\nYou may try again.");
      list_item.querySelector(".button-remove-product").hidden = false;
      list_item.querySelector(".spinner-remove-product").hidden = true;
    });

  // event listener for opacity fade-to-zero animation-end
  list_item.addEventListener("animationend", () => {
    list_item.classList.remove("d-flex");
    list_item.classList.remove("list-group-item");
    new bootstrap.Collapse(list_item);
  });

  list_item.addEventListener("hidden.bs.collapse", () => {
    list_item.remove();
    window.LOGGER_INFO.scanned_upcs.delete(upc_number);
  });
}

function show_alert_toast(title, message) {
  const toast_node = document.getElementById("alert-toast");
  toast_node.querySelector("._toast-title").innerText = title;
  toast_node.querySelector(".toast-body").innerText = message;

  const _toast = new bootstrap.Toast(toast_node);
  _toast.show();
}

function show_manual_upc_errors(errors) {
  if (!errors) {
    return;
  }
  let error_message = errors.join("\n");
  document.getElementById("error-manual-upc").innerText = error_message;
  document.getElementById("error-manual-upc").hidden = false;
}

function show_upc_submission_loading(decoded_text) {
  document.getElementById("spinner-loading-scan").classList.remove("visually-hidden");

  let scan_results = document.getElementById("scanner-results");
  let new_li = document.createElement("li");

  new_li.setAttribute(
    "class",
    "list-group-item d-flex justify-content-between align-items-start collapse show"
  );
  new_li.innerHTML = `
    <div class="ms-2 me-auto product-container">
      <div class="fw-bold upc-container">${decoded_text}</div>
      <div class="product-name"></div>
    </div>
    <div class="spinner-remove-product my-auto" hidden>
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
    <button class="button-remove-product btn badge bg-primary rounded-pill my-auto ms-2 py-2">Delete</button>
  `;

  return [scan_results, new_li];
}

function populate_initial_dropdown_values() {
  let field_rep_select_node = document.getElementById("field-representative-select");
  for (let field_rep_info of window.LOGGER_INFO.field_rep_stores_info.field_reps_list) {
    let new_option_node = document.createElement("option");
    new_option_node.setAttribute("name", field_rep_info.field_rep_id);
    new_option_node.setAttribute("value", field_rep_info.field_rep_name);
    new_option_node.innerText = field_rep_info.field_rep_name;

    field_rep_select_node.appendChild(new_option_node);
  }
  update_store_select_options(field_rep_select_node.value, document.getElementById("store-select"));
}

function handle_field_rep_change(event) {
  let new_field_rep_name = event.target.value;
  let store_select_node = document.getElementById("store-select");
  store_select_node.innerHTML = "";
  update_store_select_options(new_field_rep_name, store_select_node);
}

function update_store_select_options(new_field_rep_name, store_select_node) {
  let disabled_placeholder_option = document.createElement("option");
  disabled_placeholder_option.disabled = true;
  disabled_placeholder_option.selected = true;
  disabled_placeholder_option.value = "";
  disabled_placeholder_option.innerText = "Search Stores";
  store_select_node.appendChild(disabled_placeholder_option);

  for (let field_rep_info of window.LOGGER_INFO.field_rep_stores_info.field_reps_list) {
    if (field_rep_info.field_rep_name === new_field_rep_name) {
      for (let store_info of field_rep_info.stores) {
        let new_option_node = document.createElement("option");
        new_option_node.setAttribute("name", store_info.store_id);
        new_option_node.setAttribute("value", store_info.store_name);
        new_option_node.innerText = store_info.store_name;

        store_select_node.appendChild(new_option_node);
      }
      return;
    }
  }
}

function handle_store_select_submission(event) {
  event.preventDefault();

  let store_select_node = document.getElementById("store-select");

  document.getElementById("store-select-container").hidden = true;
  document.getElementById("scanner-container").hidden = false;

  let scanner_store_indicator_node = document.getElementById("scanner-store-indicator");
  scanner_store_indicator_node.dataset.store_id =
    store_select_node.options[store_select_node.selectedIndex].getAttribute("name");
  scanner_store_indicator_node.dataset.store_name = store_select_node.value;
  scanner_store_indicator_node.querySelector(".card-title").innerText = store_select_node.value;

  init_scanner();
}

function pause_scanner() {
  if (window.LOGGER_INFO.scanner.getState() == Html5QrcodeScannerState.SCANNING) {
    console.log("Pausing scanner");
    window.LOGGER_INFO.scanner.pause();
  }
}

function resume_scanner() {
  if (window.LOGGER_INFO.scanner.getState() == Html5QrcodeScannerState.PAUSED) {
    console.log("Resuming scanner");
    window.LOGGER_INFO.scanner.resume();
  }
}
