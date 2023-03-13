const LOGGER_SCANNER = (function () {
  "use strict";

  const TERRITORY_LIST = JSON.parse(document.getElementById("territory_list").textContent);
  const SCANNER = new Html5Qrcode("reader");
  const DUPLICATE_SCAN_DELAY_MS = 2 * 1000;
  const PREVIOUS_SCAN_INFO = {
    upc: "",
    time_scanned: 0, //unix time
  };

  (function () {
    $("#store-select").select2();
    LOGGER_UTIL.handle_populate_initial_dropdown_values(TERRITORY_LIST);

    document.getElementById("field-representative-select").addEventListener("change", (event) => {
      LOGGER_UTIL.handle_field_rep_change(event, TERRITORY_LIST);
    });
    document
      .getElementById("store-selector-form")
      .addEventListener("submit", LOGGER_UI_HANDLERS.handle_store_select_submission);
    document
      .getElementById("form-manual-upc")
      .addEventListener("submit", LOGGER_UI_HANDLERS.handle_manual_upc_submission);

    document.getElementById("scanner-tab").addEventListener("click", resume_scanner);
    document.getElementById("keyboard-tab").addEventListener("click", pause_scanner);
  })();

  async function send_post_product_addition(upc, options = { is_remove: false }) {
    let payload_data = {
      upc: upc,
      store_id: document.getElementById("scanner-store-indicator").dataset.store_id,
      store_name: document.getElementById("scanner-store-indicator").dataset.store_name,
      is_remove: options.is_remove,
    };

    let resp = await fetch(window.__LOGGER_INFO__.upc_submit_action_url, {
      method: "POST",
      headers: { "X-CSRFToken": document.head.querySelector("meta[name=csrf_token]").content },
      body: JSON.stringify(payload_data),
    });

    if (!resp.ok) {
      throw await resp.json();
    }

    return resp.json();
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
        unix_now_time_ms - PREVIOUS_SCAN_INFO.time_scanned < DUPLICATE_SCAN_DELAY_MS
      ) {
        console.log(
          `Duplicate UPC ${decoded_text} was submitted within a ${
            DUPLICATE_SCAN_DELAY_MS / 1000
          } second time window`
        );
        return;
      }

      PREVIOUS_SCAN_INFO.upc = decoded_text;
      PREVIOUS_SCAN_INFO.time_scanned = unix_now_time_ms;
      LOGGER_UI_HANDLERS.handle_submit_upc(decoded_text);
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
    init_scanner: init_scanner,
    resume_scanner: resume_scanner,
    pause_scanner: pause_scanner,
    send_post_product_addition: send_post_product_addition,
  };
})();
