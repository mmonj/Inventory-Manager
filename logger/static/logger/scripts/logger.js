document.addEventListener("DOMContentLoaded", () => {
  window.__LOGGER_INFO__.scanner = new Html5Qrcode("reader");
  window.__LOGGER_INFO__.scanned_upcs = new Set();
  window.__LOGGER_INFO__.scan_sound = new Audio(window.__LOGGER_INFO__.scan_sound_path);
  window.__LOGGER_INFO__.territory_info = JSON.parse(
    document.getElementById("territory-info").textContent
  );

  $("#store-select").select2();
  populate_initial_dropdown_values();

  document
    .getElementById("field-representative-select")
    .addEventListener("change", handle_field_rep_change);
  document
    .getElementById("store-selector-form")
    .addEventListener("submit", handle_store_select_submission);
  document
    .getElementById("form-manual-upc")
    .addEventListener("submit", handle_manual_upc_submission);
});

async function send_post_product_addition(upc, is_remove = false) {
  let payload_data = {
    upc: upc,
    store_id: document.getElementById("scanner-store-indicator").dataset.store_id,
    store_name: document.getElementById("scanner-store-indicator").dataset.store_name,
    is_remove: is_remove,
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

function qrboxFunction(viewfinderWidth, viewfinderHeight) {
  let minEdgePercentage = 0.6;
  let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
  let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
  return {
    width: qrboxSize,
    height: qrboxSize,
  };
}

function init_scanner() {
  const config = {
    fps: 0.5,
    qrbox: qrboxFunction,
    formatsToSupport: [Html5QrcodeSupportedFormats.UPC_A],
  };
  window.__LOGGER_INFO__.scanner.start({ facingMode: "environment" }, config, handle_submit_upc);
}
