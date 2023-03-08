const LOGGER_UI_HANDLERS = (function() {
  "use strict";

  const SCANNED_UPCS = new Set();
  const SCAN_SOUND = new Audio(window.__LOGGER_INFO__.scan_sound_path);
  // keeps track of previously scanned UPC to avoid ringing the scan tone too frequently
  const DUPLICATE_DELAY_MS = 2 * 1000
  const PREVIOUS_SCAN = {
    upc: "",
    time_scanned: 0  //unix time
  };

  function handle_manual_upc_submission(event) {
    event.preventDefault();
    document.getElementById("error-manual-upc").hidden = true;
  
    let manual_upc_input_node = document.getElementById("text-input-upc");
    handle_submit_upc(manual_upc_input_node.value, {is_scan_sound_play: false})
      .then(() => {
        manual_upc_input_node.value = "";
      })
      .catch((resp_json) => {
        if (resp_json.is_upc_already_scanned) {
          console.log("already scanned", manual_upc_input_node.value);
          manual_upc_input_node.value = "";
        }
  
        show_manual_upc_errors(resp_json.errors);
      });
  }

  async function handle_submit_upc(upc_number, options = { is_scan_sound_play: true, is_manual_submission: false }) {
    let ret = { errors: [] };
    const time_now = Date.now();
    
    if (upc_number === PREVIOUS_SCAN.upc && 
        time_now - PREVIOUS_SCAN.time_scanned < DUPLICATE_DELAY_MS && 
        !options.is_manual_submission ) {
      const error_msg = `Duplicate UPC ${upc_number} was submitted within a ${DUPLICATE_DELAY_MS/1000} second time window`;
      console.log(error_msg);
      ret.errors.push(error_msg)
      return Promise.reject(ret);
    }

    if (options.is_scan_sound_play) {
      SCAN_SOUND.play();
    }

    // if UPC already scanned, move list-item to top of list and give it flash animation
    if (SCANNED_UPCS.has(upc_number)) {
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

    return LOGGER_SCANNER.send_post_product_addition(upc_number)
      .then((resp_json) => {
        PREVIOUS_SCAN.upc = upc_number;
        PREVIOUS_SCAN.time_scanned = time_now;
        add_result_li_to_dom(scan_results, new_li, upc_number, resp_json);
        return resp_json;
      })
      .catch((resp_json) => {
        document.getElementById("spinner-loading-scan").classList.add("visually-hidden");
        console.log(resp_json);
        if (!resp_json.errors) {
          LOGGER_UTIL.show_alert_toast("Error", "An unexpected server error occurred.\nYou may try again.");
        }

        return Promise.reject(resp_json);
      });
  }

  function get_new_result_li_node(upc_number) {
    let scan_results = document.getElementById("scanner-results");
    let new_li = LOGGER_UTIL._element(/*html*/`
      <li class="list-group-item d-flex justify-content-between align-items-start collapse show" data-upc_number="${upc_number}">
        <div class="ms-2 me-auto product-container">
          <div class="fw-bold upc-container">${upc_number}</div>
          <div class="product-name"></div>
        </div>
        <div class="spinner-remove-product my-auto" hidden>
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
        <button class="button-remove-product btn btn-primary badge rounded-pill my-auto ms-2 py-2">Delete</button>
      </li>
    `);
  
    return [scan_results, new_li];
  }

  function add_result_li_to_dom(scan_results, new_li, upc_number, resp_json) {
    SCANNED_UPCS.add(upc_number);
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
    let _promise_send_post = LOGGER_SCANNER.send_post_product_addition(upc_number, {is_remove: true});
  
    LOGGER_UTIL.handle_list_item_removal_transition(_promise_send_post, list_item, {
      loading_indicator_element: loading_indicator_element,
      submit_button: submit_removal_button,
      action_on_removal: () => {
        SCANNED_UPCS.delete(upc_number);
      },
    });
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

    // prevent leaving page without confirmation
    window.onbeforeunload = function () {
      return true;
    };
  
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
  
      LOGGER_SCANNER.init_scanner();
  }

  return {
    handle_store_select_submission: handle_store_select_submission,
    handle_manual_upc_submission: handle_manual_upc_submission,
    handle_submit_upc: handle_submit_upc
  };
})();
