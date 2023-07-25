import React, { useState } from "react";

import { PersonnelContactFieldset } from "./PersonnelContactFieldset";

interface ContactInterface {
  pk: number;
  first_name: string | null;
  last_name: string | null;
}

interface NewContactInterface extends Omit<ContactInterface, "pk"> {
  store_pk: number;
}

interface Props {
  store: {
    pk: number;
    name: string | null;
    contacts: ContactInterface[];
  };
}

export function StoreManagerFieldset(props: Props) {
  const [newContact, setNewContact] = useState<NewContactInterface | null>(null);

  function handleAddContactClick(): void {
    setNewContact(() => {
      return {
        first_name: "",
        last_name: "",
        store_pk: props.store.pk,
      };
    });
  }

  return (
    <li className="card my-3">
      <fieldset className="card-body">
        <h5 className="card-title text-center">{props.store.name}</h5>
        <div className="add-contact-container text-center mt-3">
          {props.store.contacts.length === 0 && !newContact && (
            <button
              onClick={handleAddContactClick}
              type="button"
              className="btn btn-secondary add-contact-btn"
              data-store_id="${store.id}">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="currentColor"
                className="bi bi-plus-circle-fill"
                viewBox="0 0 16 16"
                style={{ verticalAlign: "text-bottom" }}>
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"></path>
              </svg>
              &nbsp;Add New Contact
            </button>
          )}
        </div>
        {props.store.contacts.map((contact) => {
          return (
            <React.Fragment key={contact.pk}>
              <input type="hidden" name="contact-id" defaultValue={contact.pk} />
              <PersonnelContactFieldset
                first_name={contact.first_name}
                last_name={contact.last_name}
                first_name_formfield_name="contact-first-name"
                last_name_formfield_name="contact-last-name"
              />
            </React.Fragment>
          );
        })}

        {newContact !== null && (
          <>
            <input type="hidden" name="store-id" defaultValue={props.store.pk} />
            <PersonnelContactFieldset
              first_name={newContact.first_name}
              last_name={newContact.last_name}
              first_name_formfield_name="new-contact-first-name"
              last_name_formfield_name="new-contact-last-name"
            />
          </>
        )}
      </fieldset>
    </li>
  );
}
