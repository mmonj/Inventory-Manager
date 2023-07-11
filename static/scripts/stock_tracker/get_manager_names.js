(function () {
  const TERRITORY_LIST = JSON.parse(document.getElementById("territory_list").textContent);
  const FIELD_REP_SELECTION_NODE = document.getElementById("field-rep-selection");

  function main() {
    populate_field_rep_dropdown();
    FIELD_REP_SELECTION_NODE.addEventListener("change", (event) => {
      populate_store_list();
      listen_for_new_contact_button();

      document.querySelectorAll("input[name][required]").forEach((input_field) => {
        input_field.addEventListener("input", listen_for_empty_required_input);
      });
    });

    document.getElementById("manager-names-form").addEventListener("submit", handle_form_submission);

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
      return /*html*/`
        <div class="add-contact-container text-center mt-3">
          <button type="button" class="btn btn-secondary add-contact-btn" data-store_id="${store.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-plus-circle-fill" viewBox="0 0 16 16" style="vertical-align: text-bottom;">
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"></path>
            </svg>
            Add New Contact
          </button>
        </div>
      `;
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

  function listen_for_empty_required_input(event) {
    if (event.target.value === "") {
      event.target.classList.add("empty-required-field");
    }
    else {
      event.target.classList.remove("empty-required-field");
    }
  }

  function listen_for_new_contact_button() {
    document.querySelectorAll(".add-contact-btn").forEach((add_contact_btn) => {
      add_contact_btn.addEventListener("click", (event) => {
        const store_fieldset_node = event.target.closest(".card-body");
        const store_id = event.target.dataset.store_id;
        event.target.closest(".add-contact-container").remove();

        store_fieldset_node.append(...create_elements(/*html*/`
          <input type="hidden" name="store-id" value="${store_id}">
            <p>
              <label class="form-label">First Name</label>
              <input type="text" name="new-contact-first-name" value="" class="form-control" required>
            </p>
            <p>
              <label class="form-label">Last Name</label>
              <input type="text" name="new-contact-last-name" value="" class="form-control" required>
          </p>
        `));

        store_fieldset_node.querySelectorAll("input[name][required]").forEach((input_field) => {
          input_field.addEventListener("input", listen_for_empty_required_input);
        });

      });
    });
  }

  function handle_form_submission(event) {
    const submission_button = event.submitter;
    if (event.target.checkValidity()) {
      submission_button.disabled = true;
      submission_button.querySelector(".spinner-border").classList.remove("visually-hidden");
    }
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
