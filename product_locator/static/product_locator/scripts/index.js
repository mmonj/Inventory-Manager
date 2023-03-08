const PRODUCT_LOCATOR = (function () {
  "use strict";

  const SCANNER = new Html5Qrcode("reader");
  const STORES = JSON.parse(document.getElementById("stores-list").textContent);

  function main() {
    document.getElementById("field-representative-container").hidden = true;
    document.getElementById("field-representative-select").disabled = true;

    document
      .getElementById("store-selector-form")
      .addEventListener("submit", handle_store_select_submission);

    populate_stores_select();
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
    main: main,
    init_scanner: init_scanner,
    pause_scanner: pause_scanner,
    resume_scanner: resume_scanner,
  };
})();

PRODUCT_LOCATOR.main();
