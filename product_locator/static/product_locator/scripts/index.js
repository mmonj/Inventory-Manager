const PRODUCT_LOCATOR = (function () {
  "use strict";

  const SCANNER = new Html5Qrcode("reader");
  const SCAN_SOUND = new Audio(__PRODUCT_LOCATOR__.scan_sound_path);
  const STORES = JSON.parse(document.getElementById("stores-list").textContent);

  const duplicate_scan_time_buffer_ms = 2000;
  const PREVIOUS_SCAN_INFO = {
    upc: null,
    time_scanned: 0,
  };

  function main() {
    document.getElementById("field-representative-container").hidden = true;
    document.getElementById("field-representative-select").disabled = true;

    document.getElementById("scanner-tab").addEventListener("click", resume_scanner);
    document.getElementById("keyboard-tab").addEventListener("click", pause_scanner);

    document.getElementById("form-manual-upc").action = __PRODUCT_LOCATOR__.new_location_action_url;
    document.getElementById("form-manual-upc").addEventListener("submit", (event) => {
      event.preventDefault();
      handle_get_product_location(document.getElementById("text-input-upc").value, false);
    });

    populate_stores_select();

    document
      .getElementById("store-selector-form")
      .addEventListener("submit", handle_store_select_submission);
  }

  const ESCAPE_NODE = document.createElement("textarea");
  function escape_html(html) {
    ESCAPE_NODE.textContent = html;
    return ESCAPE_NODE.innerHTML;
  }

  async function handle_get_product_location(upc, is_scan_sound_play = false) {
    if (is_scan_sound_play) {
      SCAN_SOUND.play();
    }

    const loading_spinner_node = document.getElementById("spinner-loading-scan");
    const scan_results = document.getElementById("scanner-results");
    scan_results.innerHTML = "";

    let product_data = [];
    try {
      loading_spinner_node.classList.remove("visually-hidden");
      product_data = await fetch_get_product_location(upc);
    } catch (resp) {
      loading_spinner_node.classList.add("visually-hidden");

      if (resp.status === 404) {
        scan_results.appendChild(
          LOGGER_UTIL._element(
            /*html*/ `<p class="text-center alert alert-warning opacity-75">The UPC ${upc} was not found</p>`
          )
        );
      } else {
        scan_results.appendChild(
          LOGGER_UTIL._element(
            /*html*/ `<p class="text-center alert alert-warning opacity-75">Server returned a ${resp.status} error</p>`
          )
        );
      }

      return;
    }

    loading_spinner_node.classList.add("visually-hidden");
    if (product_data.home_locations.length === 0) {
      scan_results.appendChild(
        LOGGER_UTIL._element(
          /*html*/ `<h5 class="text-center mt-3 text-white-50">No location found</h5>`
        )
      );
    }

    product_data.home_locations.forEach((location) => {
      const new_li = LOGGER_UTIL._element(/*html*/ `
        <li class="list-group-item d-flex justify-content-between align-items-start">
          <div class="ms-2 me-auto location-container">
            <div class="fw-bold location-name">${escape_html(location.name)}</div>
            <div class="fw-bold planogram-name">${escape_html(location.planogram)}</div>
            <div class="product-name">${escape_html(product_data.product.name)}</div>
          </div>
        </li>
      `);

      scan_results.appendChild(new_li);
    });
  }

  async function fetch_get_product_location(upc) {
    const params = new URLSearchParams();
    params.append("upc", upc);
    params.append("store_id", document.getElementById("scanner-store-indicator").dataset.store_id);

    const action_url = window.__PRODUCT_LOCATOR__.new_location_action_url + "?" + params.toString();

    let resp = await fetch(action_url, {
      method: "GET",
    });

    if (!resp.ok) {
      throw await resp;
    }

    return resp.json();
  }

  function populate_stores_select() {
    const store_select_node = document.getElementById("store-select");

    const temp_option_node = LOGGER_UTIL._element(/*html*/ `
      <option selected disabled value="">Pick a store</option>
    `);
    store_select_node.appendChild(temp_option_node);

    for (let store of STORES) {
      const new_option_node = LOGGER_UTIL._element(/*html*/ `
        <option value="${store.id}">Pick a store</option>
      `);
      new_option_node.innerText = store.name;
      store_select_node.appendChild(new_option_node);
    }
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

    init_scanner();
  }

  function init_scanner() {
    const config = {
      fps: 2,
      qrbox: qrboxFunction,
      videoConstraints: {
        facingMode: "environment",
        zoom: 2,
        advanced: [{ focusMode: { exact: "continuous" } }, { supportedFormats: ["upc_a"] }],
      },
    };

    SCANNER.start({ facingMode: "environment" }, config, (decoded_text, decode_data) => {
      const unix_now_time_ms = Date.now();
      if (
        decoded_text === PREVIOUS_SCAN_INFO.upc &&
        unix_now_time_ms - PREVIOUS_SCAN_INFO.time_scanned < duplicate_scan_time_buffer_ms
      ) {
        return;
      }

      PREVIOUS_SCAN_INFO.upc = decoded_text;
      PREVIOUS_SCAN_INFO.time_scanned = unix_now_time_ms;
      handle_get_product_location(decoded_text, true);
    });
  }

  function qrboxFunction(viewfinderWidth, viewfinderHeight) {
    let minEdgePercentage = 0.6;
    let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
    let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
    return {
      width: qrboxSize,
      height: qrboxSize,
    };
  }

  function pause_scanner() {
    if (SCANNER.getState() == Html5QrcodeScannerState.SCANNING) {
      console.log("Pausing scanner");
      SCANNER.pause();
    }
  }

  function resume_scanner() {
    if (SCANNER.getState() == Html5QrcodeScannerState.PAUSED) {
      console.log("Resuming scanner");
      SCANNER.resume();
    }
  }

  return {
    main: main,
    init_scanner: init_scanner,
    pause_scanner: pause_scanner,
    resume_scanner: resume_scanner,
    fetch_get_product_location: fetch_get_product_location,
  };
})();

PRODUCT_LOCATOR.main();
