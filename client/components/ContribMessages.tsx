import React, { useContext } from "react";

import { Context } from "@reactivated";

export function ContribMessages() {
  const djangoContext = useContext(Context);
  const messages = djangoContext.messages;

  if (messages.length === 0) {
    return null;
  }

  return (
    <section>
      {messages.length > 0 && (
        <ul className="list-group fw-semibold text-center" style={{ listStyle: "none" }}>
          {messages.map((message, idx) => (
            <li key={idx} className={`alert alert-${message.level_tag as string}`}>
              {message.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
