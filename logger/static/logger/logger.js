document.addEventListener("DOMContentLoaded", () => {
  window.LOGGER_INFO = {};
  window.LOGGER_INFO.scanned_upcs = new Set();
  window.LOGGER_INFO.scan_sound = new Audio(scan_sound_file);
  window.LOGGER_INFO.field_rep_stores_info = JSON.parse(
    document.getElementById("field-rep-stores-info").textContent
  );

  $("#store-select").select2();
  populate_initial_dropdown_values();

  document.getElementById("field-representative-select").addEventListener("change", (event) => {
    let new_field_rep_name = event.target.value;
    let store_select_node = document.getElementById("store-select");
    store_select_node.innerHTML = "";

    update_store_select_options(new_field_rep_name, store_select_node);
  });

  document.getElementById("store-selector-form").addEventListener("submit", (event) => {
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
  });
});

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

function on_scan(decoded_text, decoded_result) {
  if (window.LOGGER_INFO.scanned_upcs.has(decoded_text)) {
    return;
  }
  
  window.LOGGER_INFO.scan_sound.play();
  document.getElementById('loading-spinner').classList.remove('visually-hidden');

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
    <button class="btn badge bg-primary rounded-pill my-auto">Remove</button>
  `;

  send_upc(decoded_text)
    .then((resp_json) => {
      window.LOGGER_INFO.scanned_upcs.add(decoded_text);
      scan_results.prepend(new_li);
      new_li.querySelector("button").addEventListener("click", handle_remove_upc);
      new_li.querySelector(".product-name").innerText = resp_json.product_info.name;
      document.getElementById('loading-spinner').classList.add('visually-hidden');
    })
    .catch((resp_json) => {
      document.getElementById('loading-spinner').classList.add('visually-hidden');
      console.log(resp_json);
    });
}

async function send_upc(upc) {
  let payload_data = {
    upc: upc,
  };

  let resp = await fetch("/logger/log_upc", {
    method: "POST",
    headers: { "X-CSRFToken": document.head.querySelector("meta[name=csrf_token]").content },
    body: JSON.stringify(payload_data),
  });

  if (!resp.ok) {
    throw await resp.json();
  }

  return resp.json();
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

  const config = { fps: 0.5, qrbox: qrboxFunction };
  scanner.start({ facingMode: "environment" }, config, on_scan);
}
