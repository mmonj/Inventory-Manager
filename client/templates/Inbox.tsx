import React from "react";

import { Badge, ListGroup } from "react-bootstrap";
import Markdown from "react-markdown";

import { Context, interfaces, reverse, templates } from "@reactivated";

import { faInbox } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { fetchByReactivated } from "@client/util/commonUtil";

type TMessageRecipient = templates.Inbox["message_recipients"][number];

function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function Template(props: templates.Inbox) {
  const context = React.useContext(Context);
  const [messageRecipients, setMessageRecipients] = React.useState(props.message_recipients);

  async function handleMarkRead(messageRecipient: TMessageRecipient) {
    if (messageRecipient.is_read) {
      return;
    }

    const resp = await fetchByReactivated<interfaces.MarkMessageRead>(
      reverse("root:mark_message_read", { message_recipient_id: messageRecipient.id }),
      context.csrf_token,
      "POST"
    );

    if (!resp.ok) {
      return;
    }

    const data = await resp.json();
    if (!data.success) {
      return;
    }

    setMessageRecipients((current) =>
      current.map((mr) =>
        mr.id === messageRecipient.id
          ? { ...mr, is_read: true, read_at: new Date().toISOString() }
          : mr
      )
    );
    context.setValue((current) => ({
      ...current,
      user: { ...current.user, unread_message_count: data.unread_message_count },
    }));
  }

  return (
    <Layout title="Inbox" navbar={<NavigationBar />} className="mw-rem-60 mx-auto px-2 mb-4">
      <h1 className="my-4">
        <FontAwesomeIcon icon={faInbox} className="me-2" />
        Inbox
      </h1>

      {messageRecipients.length === 0 && (
        <div className="text-muted text-center py-5">No messages.</div>
      )}

      <ListGroup>
        {messageRecipients.map((messageRecipient) => (
          <ListGroup.Item
            key={messageRecipient.id}
            action={!messageRecipient.is_read}
            onClick={() => void handleMarkRead(messageRecipient)}
            className={messageRecipient.is_read ? "" : "bg-body-tertiary"}
          >
            <div className="d-flex align-items-start justify-content-between gap-2">
              <div className="d-flex align-items-center gap-2">
                {!messageRecipient.is_read && (
                  <Badge bg="primary" pill>
                    New
                  </Badge>
                )}
                <span className="fw-semibold">{messageRecipient.message.title}</span>
              </div>
              <span className="text-muted small text-nowrap">
                {formatDateTime(messageRecipient.message.datetime_created)}
              </span>
            </div>
            <div className="text-muted small mb-2">
              From {messageRecipient.message.sender?.username ?? "system"}
            </div>
            <div className="border rounded p-3">
              <Markdown>{messageRecipient.message.body_md}</Markdown>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Layout>
  );
}
