import React from "react";

interface Props {
  first_name: string | null;
  last_name: string | null;
  first_name_formfield_name: string;
  last_name_formfield_name: string;
}

export function PersonnelContactFieldset(props: Props) {
  return (
    <>
      <p>
        <label className="form-label">First Name</label>
        <input
          type="text"
          name={props.first_name_formfield_name}
          defaultValue={props.first_name ?? ""}
          className="form-control"
          required
        />
      </p>
      <p>
        <label className="form-label">Last Name</label>
        <input
          type="text"
          name={props.last_name_formfield_name}
          defaultValue={props.last_name ?? ""}
          className="form-control"
          required
        />
      </p>
    </>
  );
}
