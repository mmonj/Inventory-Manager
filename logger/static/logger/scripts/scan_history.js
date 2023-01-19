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

  document.querySelectorAll(".product-list-item").forEach((product_list_item) => {
    product_list_item.addEventListener("animationend", (event) => {
      if (!event.target.classList.contains("remove-queued")) {
        return;
      }

      event.target.classList.remove("list-group-item");
      new bootstrap.Collapse(event.target);
    });

    product_list_item.addEventListener("hidden.bs.collapse", (event) => {
      if (!event.target.classList.contains("remove-queued")) {
        return;
      }
      event.target.remove();
    });
  });
});

function handle_unsubmit_product(action_url, method, product_list_item) {
  product_list_item.querySelector(".button-remove-product").hidden = true;
  product_list_item.querySelector(".spinner-remove-product").hidden = false;
  product_list_item.classList.add("remove-queued");

  send_post_uncarry(action_url, method)
    .then((resp_json) => {
      product_list_item.classList.add("fade-zero");
      console.log("success");
    })
    .catch((resp_json) => {
      console.log(resp_json);
      show_alert_toast("Error", "An unexpected server error occurred.\nYou may try again.");
      product_list_item.querySelector(".button-remove-product").hidden = false;
      product_list_item.querySelector(".spinner-remove-product").hidden = true;
      product_list_item.classList.remove("remove-queued");
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
