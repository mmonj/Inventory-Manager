const LOGGER_UI_HANDLERS = (function() {
  "use strict";

  async function handle_list_item_removal_transition(_promise, list_item, options = {}) {
    options.submit_button && (options.submit_button.hidden = true);
    options.loading_indicator_element && (options.loading_indicator_element.hidden = false);
  
    try {
      let resp_json = await _promise;
  
      list_item.addEventListener("animationend", handle_collapse);
      list_item.addEventListener("hidden.bs.collapse", (event) => {
        if (event.target.classList.contains("remove-queued")) {
          list_item.remove();
          options.action_on_removal && options.action_on_removal();
        }
      });
  
      list_item.classList.add("remove-queued");
      list_item.classList.add("fade-zero");
    } catch (error_json) {
      console.log(error_json);
      show_alert_toast("Error", "An unexpected server error occurred.\nYou may try again.");
      options.submit_button && (options.submit_button.hidden = false);
      options.loading_indicator_element && (options.loading_indicator_element.hidden = true);
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
  
  function handle_manual_upc_submission(event) {
    event.preventDefault();
    document.getElementById("error-manual-upc").hidden = true;
  
    let upc_number_node = document.getElementById("text-input-upc");
    handle_submit_upc(upc_number_node.value, {is_scan_sound_play: false})
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
  
  function handle_submit_upc(upc_number, options={is_scan_sound_play: true}) {
    if (options.is_scan_sound_play) {
      window.__LOGGER_INFO__.scan_sound.play();
    }
  
    let ret = { errors: [] };
  
    if (window.__LOGGER_INFO__.scanned_upcs.has(upc_number)) {
      let existing_li_item = document.querySelector(
        `#scanner-results > li[data-upc_number='${upc_number}']`
      );
      existing_li_item.classList.add("flash-item");
      document.getElementById("scanner-results").prepend(existing_li_item);
  
      ret.is_upc_already_scanned = true;
      // ret.errors.push("This UPC has already been scanned in this session");
      return Promise.reject(ret);
    }
  
    document.getElementById("spinner-loading-scan").classList.remove("visually-hidden");
    let [scan_results, new_li] = get_new_result_li_node(upc_number);
  
    return LOGGER_SCANNER_HANDLERS.send_post_product_addition(upc_number)
      .then((resp_json) => {
        add_result_li_to_dom(scan_results, new_li, upc_number, resp_json);
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
  
  function get_new_result_li_node(upc_number) {
    let scan_results = document.getElementById("scanner-results");
    let new_li = document.createElement("li");
  
    new_li.dataset.upc_number = upc_number;
    new_li.setAttribute(
      "class",
      "list-group-item d-flex justify-content-between align-items-start collapse show"
    );
    new_li.innerHTML = `
      <div class="ms-2 me-auto product-container">
        <div class="fw-bold upc-container">${upc_number}</div>
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
  
  function add_result_li_to_dom(scan_results, new_li, upc_number, resp_json) {
    // event listener for opacity fade-to-zero animation-end
    new_li.addEventListener("animationend", (event) => {
      if (event.target.classList.contains("flash-item")) {
        event.target.classList.remove("flash-item");
      }
      if (!event.target.classList.contains("remove-queued")) {
        return;
      }
  
      event.target.classList.remove("d-flex");
      event.target.classList.remove("list-group-item");
      new bootstrap.Collapse(event.target);
    });
  
    new_li.addEventListener("hidden.bs.collapse", () => {
      new_li.remove();
      window.__LOGGER_INFO__.scanned_upcs.delete(upc_number);
    });
  
    window.__LOGGER_INFO__.scanned_upcs.add(upc_number);
    scan_results.prepend(new_li);
    new_li.querySelector("button").addEventListener("click", handle_remove_upc);
    new_li.querySelector(".product-name").innerText = resp_json.product_info.name;
    document.getElementById("spinner-loading-scan").classList.add("visually-hidden");
    document.getElementById("text-input-upc").value = "";
  }
  
  function handle_remove_upc(event) {
    let upc_number = event.target.parentElement.querySelector(".upc-container").innerText;
    let list_item = event.target.parentElement;
    let loading_indicator_element = list_item.querySelector(".spinner-remove-product");
    let submit_removal_button = list_item.querySelector(".button-remove-product");
  
    // send_post_product_addition returns Promise for JSON
    let _promise_send_post = LOGGER_SCANNER_HANDLERS.send_post_product_addition(upc_number, {is_remove: true});
  
    handle_list_item_removal_transition(_promise_send_post, list_item, {
      loading_indicator_element: loading_indicator_element,
      submit_button: submit_removal_button,
      action_on_removal: () => {
        window.__LOGGER_INFO__.scanned_upcs.delete(upc_number);
      },
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
    if (errors.length === 0) {
      return;
    }
    let error_message = errors.join("\n");
    document.getElementById("error-manual-upc").innerText = error_message;
    document.getElementById("error-manual-upc").hidden = false;
  }
  
  function handle_store_select_submission(event) {
    event.preventDefault();
  
    let store_select_node = document.getElementById("store-select");
  
    document.getElementById("page-title").hidden = true;
    document.getElementById("store-select-container").hidden = true;
    document.getElementById("scanner-container").hidden = false;
  
    let scanner_store_indicator_node = document.getElementById("scanner-store-indicator");
    scanner_store_indicator_node.dataset.store_id = store_select_node.value;
    scanner_store_indicator_node.dataset.store_name =
      store_select_node.options[store_select_node.selectedIndex].innerText;
    scanner_store_indicator_node.querySelector(".card-title").innerText =
      store_select_node.options[store_select_node.selectedIndex].innerText;
  
      LOGGER_SCANNER_HANDLERS.init_scanner();
  }
  
  function pause_scanner() {
    if (window.__LOGGER_INFO__.scanner.getState() == Html5QrcodeScannerState.SCANNING) {
      console.log("Pausing scanner");
      window.__LOGGER_INFO__.scanner.pause();
    }
  }
  
  function resume_scanner() {
    if (window.__LOGGER_INFO__.scanner.getState() == Html5QrcodeScannerState.PAUSED) {
      console.log("Resuming scanner");
      window.__LOGGER_INFO__.scanner.resume();
    }
  }

  return {
    pause_scanner: pause_scanner,
    resume_scanner: resume_scanner,
    handle_store_select_submission: handle_store_select_submission,
    handle_manual_upc_submission: handle_manual_upc_submission,
    handle_submit_upc: handle_manual_upc_submission,
  };
})();
