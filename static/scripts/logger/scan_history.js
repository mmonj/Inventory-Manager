const LOGGER_SCAN_HISTORY = (function () {
  "use strict";

  let TERRITORY_LIST = null;

  (function () {
    if (document.getElementById("territory_list")) {
      TERRITORY_LIST = JSON.parse(document.getElementById("territory_list").textContent);

      $("#store-select").select2();
      $(document).on('select2:open', () => {
        document.querySelector('.select2-search__field').focus();
      });

      LOGGER_UTIL.handle_populate_initial_dropdown_values(TERRITORY_LIST);
      document.getElementById("field-representative-select").addEventListener("change", (event) => {
        LOGGER_UTIL.handle_field_rep_change(event, TERRITORY_LIST);
      });
    }

    document.querySelectorAll(".form-unsubmit-product").forEach((unsubmit_form) => {
      unsubmit_form.addEventListener("submit", (event) => {
        event.preventDefault();
        handle_unsubmit_product(
          event.target.action,
          event.target.method,
          event.target.parentElement
        );
      });
    });
  })();

  function handle_unsubmit_product(action_url, method, product_list_item) {
    let submit_removal_button = product_list_item.querySelector(".button-remove-product");
    let loading_indicator_element = product_list_item.querySelector(".spinner-remove-product");

    let _promise_send_post_uncarry = send_post_uncarry(action_url, method);

    LOGGER_UTIL.handle_list_item_removal_transition(
      _promise_send_post_uncarry,
      product_list_item,
      {
        loading_indicator_element: loading_indicator_element,
        submit_button: submit_removal_button,
      }
    );
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
})();
