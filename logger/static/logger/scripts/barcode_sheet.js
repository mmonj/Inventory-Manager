(function () {
  "use strict";
  
  function main() {
    handle_landing_page_sheet_type();
    document.addEventListener("copy", modify_clipboard_text);

    document.querySelectorAll(".sheet-type-change").forEach((sheet_type_change_node) => {
      sheet_type_change_node.addEventListener("click", (event) => {
        const new_url = (new URL(window.location));
        new_url.searchParams.set("sheet-type", event.target.dataset.sheet_type);
        window.location.href = new_url.href;
      })
    })
    document.querySelectorAll(".upc-section").forEach((upc_section_node) => {
      upc_section_node.addEventListener("click", select_text);
    });
    
    update_items_shown_counter();
  }

  function select_text(event) {
    const range = document.createRange();

    let upc_number_node = event.target;
    if (upc_number_node.classList.contains("upc-section")) {
      upc_number_node = upc_number_node.parentElement;
    }

    range.selectNodeContents(upc_number_node);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }

  function set_sheet_view(sheet_type_change_button) {
    document.getElementById("sheet-type-main-button").innerText = sheet_type_change_button.dataset.sheet_type_verbose;

    // add .active class to dropdown selection
    document.querySelectorAll(".sheet-type-change").forEach((elm) => {
      elm.classList.remove("active");
    })
    sheet_type_change_button.classList.add("active");

    const is_carried_target = sheet_type_change_button.dataset.is_carried;

    document.querySelectorAll(".product-container").forEach((product_container) => {
      let is_hidden = false;
      if (is_carried_target !== undefined && product_container.dataset.is_carried !== is_carried_target) {
        is_hidden = true;
      }

      product_container.hidden = is_hidden;
    })
  }

  function handle_landing_page_sheet_type() {
    const sheet_type = (new URL(document.location)).searchParams.get("sheet-type");
    const sheet_type_change_button = document.querySelector(`[data-sheet_type="${sheet_type}"]`)
    set_sheet_view(sheet_type_change_button);
  }

  function modify_clipboard_text(event) {
    const selected_text = window.getSelection().toString();
    const modified_text = selected_text.replace(/\s/g, "");
    if (modified_text.length != 12 && !isnumeric(modified_text)) {
      return;
    }

    event.clipboardData.setData("text/plain", modified_text);
    event.preventDefault();
  }

  function update_items_shown_counter() {
    const items_shown_node = document.getElementById("item-count-indicator");
    let counter = 0;
    let result_indicator_text = '';
    document.querySelectorAll(".product-container").forEach((elm, idx) => {
      if (!elm.hidden) {
        counter += 1;
      }
      result_indicator_text = `${counter} items shown / ${idx + 1} total`;
    });

    items_shown_node.innerText = result_indicator_text;
  }

  function isnumeric(text) {
    return text.length > 0 && !isNaN(text);
  }

  main();
})();
