document.addEventListener("DOMContentLoaded", () => {
  window.__SCAN_HISTORY__ = {};
  if (document.getElementById("territory-info")) {
    window.__SCAN_HISTORY__.territory_info = JSON.parse(
      document.getElementById("territory-info").textContent
    );

    $("#store-select").select2();
    populate_initial_dropdown_values(window.__SCAN_HISTORY__.territory_info);
    document.getElementById("field-representative-select").addEventListener("change", (event) => {
      handle_field_rep_change(event, window.__LOGGER_INFO__.territory_info);
    });
  }

  document.querySelectorAll(".form-unsubmit-product").forEach((unsubmit_form) => {
    unsubmit_form.addEventListener("submit", (event) => {
      event.preventDefault();
      handle_unsubmit_product(event.target.action, event.target.method, event.target.parentElement);
    });
  });
});

function handle_unsubmit_product(action_url, method, product_list_item) {
  let submit_removal_button = product_list_item.querySelector(".button-remove-product");
  let loading_indicator_element = product_list_item.querySelector(".spinner-remove-product");

  let _promise_send_post_uncarry = send_post_uncarry(action_url, method);

  handle_list_item_removal_transition(_promise_send_post_uncarry, product_list_item, {
    loading_indicator_element: loading_indicator_element, 
    submit_button: submit_removal_button
  });
}

async function send_post_uncarry(action_url, method) {
  let resp = await fetch(action_url, {
    method: method,
    headers: { "X-CSRFToken": document.head.querySelector("meta[name=csrf_token]").content },
  });

  if (!resp.ok) {
    throw await resp.json();
  }

  return resp.json();
}
