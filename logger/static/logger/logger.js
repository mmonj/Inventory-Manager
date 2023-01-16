document.addEventListener("DOMContentLoaded", () => {
  window.LOGGER_INFO = {};
  window.LOGGER_INFO.scan_sound = new Audio(scan_sound_file);
  window.LOGGER_INFO.field_rep_stores_info = JSON.parse(document.getElementById('field-rep-stores-info').textContent);
  
  $("#store-select").select2();
  populate_initial_dropdown_values();

  document.getElementById('field-representative-select').addEventListener('change', (event) => {
    let new_field_rep_name = event.target.value;
    let store_select_node = document.getElementById('store-select');
    store_select_node.innerHTML = '';

    update_store_select_options(new_field_rep_name, store_select_node);
  });

  document.getElementById('store-selector-form').addEventListener('submit', (event) => {
    event.preventDefault();

    let store_select_node = document.getElementById('store-select');

    document.getElementById('store-select-container').setAttribute('hidden', '');
    document.getElementById('scanner-container').removeAttribute('hidden');
    
    let scanner_store_indicator_node = document.getElementById('scanner-store-indicator');
    scanner_store_indicator_node.dataset.store_id = store_select_node.options[store_select_node.selectedIndex].getAttribute('name');
    scanner_store_indicator_node.dataset.store_name = store_select_node.value;
    scanner_store_indicator_node.querySelector('.card-title').innerText = store_select_node.value;

    init_scanner();
  });
});

function populate_initial_dropdown_values() {
  let field_rep_select_node = document.getElementById('field-representative-select');
  for (let field_rep_info of window.LOGGER_INFO.field_rep_stores_info.field_reps_list) {
    let new_option_node = document.createElement('option');
    new_option_node.setAttribute('name', field_rep_info.field_rep_id);
    new_option_node.setAttribute('value', field_rep_info.field_rep_name);
    new_option_node.innerText = field_rep_info.field_rep_name;

    field_rep_select_node.appendChild(new_option_node);
  }
  update_store_select_options(field_rep_select_node.value, document.getElementById('store-select'));
}

function update_store_select_options(new_field_rep_name, store_select_node) {
  let disabled_placeholder_option = document.createElement('option');
  disabled_placeholder_option.disabled = true;
  disabled_placeholder_option.selected = true;
  disabled_placeholder_option.value = "";
  disabled_placeholder_option.innerText = 'Search Stores';
  store_select_node.appendChild(disabled_placeholder_option);

  for (let field_rep_info of window.LOGGER_INFO.field_rep_stores_info.field_reps_list) {
    if (field_rep_info.field_rep_name === new_field_rep_name) {
      for (let store_info of field_rep_info.stores) {
        let new_option_node = document.createElement('option');
        new_option_node.setAttribute('name', store_info.store_id)
        new_option_node.setAttribute('value', store_info.store_name);
        new_option_node.innerText = store_info.store_name;

        store_select_node.appendChild(new_option_node);
      }
      return;
    }
  }
}

function on_scan(decoded_text, decoded_result) {
  if (window.LOGGER_INFO.scanned_upcs.has(decoded_text)) {
    return;
  }

  window.LOGGER_INFO.scanned_upcs.add(decoded_text);
  window.LOGGER_INFO.scan_sound.play();
  append_to_scan_results(decoded_text);
}

function append_to_scan_results(upc_number) {
  let scan_results = document.getElementById("scanner-results");
  let new_li = document.createElement("li");
  scan_results.appendChild(new_li);

  new_li.setAttribute(
    "class",
    "list-group-item d-flex justify-content-between align-items-start collapse show"
  );
  new_li.innerHTML = `
    <div class="ms-2 me-auto product-container">
      <div class="fw-bold upc-container">${upc_number}</div>
      <div class="product-name"></div>
    </div>
    <button class="btn badge bg-primary rounded-pill my-auto">Remove</button>
  `;

  new_li.querySelector("button").addEventListener("click", handle_remove_upc);
  send_upc(upc_number).then((resp_json) => {
    new_li.querySelector(".product-name").innerText = resp_json.name;
  });
}

function handle_remove_upc(event) {
  let upc_number = event.target.parentElement.querySelector(".upc-container").innerText;
  let list_item = event.target.parentElement;

  list_item.classList.add("shrink-zero");

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

function send_upc(upc) {
  let payload_data = {
    upc: upc,
  };

  return fetch("/logger/log_upc", {
    method: "POST",
    headers: { "X-CSRFToken": document.head.querySelector("meta[name=csrf_token]").content },
    body: JSON.stringify(payload_data),
  }).then((response) => response.json());
}

function qrboxFunction(viewfinderWidth, viewfinderHeight) {
  let minEdgePercentage = 0.4;
  let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
  let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
  return {
    width: qrboxSize,
    height: qrboxSize,
  };
}

function init_scanner() {
  const scanner = new Html5Qrcode("reader");
  window.LOGGER_INFO.scanned_upcs = new Set();

  const config = { fps: 0.5, qrbox: qrboxFunction };
  scanner.start({ facingMode: "environment" }, config, on_scan);
}
