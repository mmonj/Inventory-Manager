import React from "react";

interface Props {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AdminerItem(props: Props) {
  return (
    <div className="col-sm-6">
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">{props.title}</h5>
          <p className="card-text">{props.description}</p>
          {props.children}
        </div>
      </div>
    </div>
  );
}
