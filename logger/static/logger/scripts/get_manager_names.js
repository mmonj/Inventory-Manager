(function () {
  const TERRITORY_LIST = JSON.parse(document.getElementById("territory_list").textContent);
  const FIELD_REP_SELECTION_NODE = document.getElementById("field-rep-selection");

  function main() {
    populate_field_rep_dropdown();
    FIELD_REP_SELECTION_NODE.addEventListener("change", (event) => {
      populate_store_list();
      listen_for_empty_required_inputs();
    });

    FIELD_REP_SELECTION_NODE.dispatchEvent(new Event("change"));
  }

  function populate_field_rep_dropdown() {
    TERRITORY_LIST.forEach((territory) => {
      FIELD_REP_SELECTION_NODE.append(...create_elements(/*html*/ `
        <option value="${territory.id}">${escape_html(territory.name)}</option>
      `));
    });
  }

  function populate_store_list(event) {
    const stores_card_container = document.getElementById("store-fields");
    stores_card_container.innerHTML = "";

    for (let territory of TERRITORY_LIST) {
      if (territory.id === parseInt(FIELD_REP_SELECTION_NODE.value)) {
        for (let store of territory.stores) {
          stores_card_container.append(...create_elements(/*html*/`
            <li class="card my-3">
              <fieldset class="card-body">
                <h5 class="card-title text-center">${escape_html(store.name)}</h5>
                ${get_managers_input_fields(store)}
              </fieldset>
            </li>
          `));
        }
        break;
      }
    }
  }

  function get_managers_input_fields(store) {
    if (store.contacts.length === 0) {
      return "";
    }

    let ret_html = "";
    for (let contact of store.contacts) {
      ret_html += /*html*/`
        <input type="hidden" name="contact-id" value="${contact.id}">
        <p>
          <label class="form-label">First Name</label>
          <input type="text" name="contact-first-name" value="${escape_html(contact.first_name)}" class="form-control" required>
        </p>
        <p>
          <label class="form-label">Last Name</label>
          <input type="text" name="contact-last-name" value="${escape_html(contact.last_name)}" class="form-control" required>
        </p>
      `;
    }

    return ret_html;
  }

  function listen_for_empty_required_inputs() {
    document.querySelectorAll("input[name][required]").forEach((elm) => {
      elm.addEventListener("input", (event) => {
        if (event.target.value === "") {
          event.target.classList.add("empty-required-field");
        }
        else {
          event.target.classList.remove("empty-required-field");
        }
      });
    });
  }

  function escape_html(html) {
    const escape = document.createElement('textarea');
    escape.textContent = html;
    return escape.innerHTML;
  }

  function create_elements(html_str) {
    var template = document.createElement("template");
    template.innerHTML = html_str.trim();
    return template.content.childNodes;
  }

  main();
})();
