const LOGGER_SCANNER = (function () {
  "use strict";

  const TERRITORY_INFO = JSON.parse(document.getElementById("territory-info").textContent);
  const SCANNER = new Html5Qrcode("reader");

  (function () {
    $("#store-select").select2();
    LOGGER_UTIL.handle_populate_initial_dropdown_values(TERRITORY_INFO);

    document.getElementById("field-representative-select").addEventListener("change", (event) => {
      LOGGER_UTIL.handle_field_rep_change(event, TERRITORY_INFO);
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
        advanced: [
          { focusMode: { exact: "continuous" } },
          { supportedFormats: ["upc_a"] }
        ],
      },
    };

    SCANNER.start({ facingMode: "environment" }, config, (decoded_text, decode_data) => {
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
