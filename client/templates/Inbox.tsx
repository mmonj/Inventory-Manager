import React from "react";

import classNames from "classnames";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { Badge, ListGroup } from "react-bootstrap";
import Markdown from "react-markdown";

import { Context, interfaces, reverse, templates } from "@reactivated";

import { faInbox } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";
import { LoadMoreButton } from "@client/components/LoadMoreButton";
import { PushNotificationToggle } from "@client/components/PushNotificationToggle";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { useFetch } from "@client/hooks/useFetch";
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
  const messageRecipientsPaginationState = useFetch<interfaces.GetInboxMessages>();
  // page 1 is already rendered server-side via props.message_recipients, so the next page to
  // fetch via "Load more" starts at 2 - same pattern as StockTrackerScanHistory.tsx.
  const [nextPageNumber, setNextPageNumber] = React.useState(2);
  const [hasNext, setHasNext] = React.useState(props.has_next);
  const paginationErrorMessage = React.useRef<HTMLDivElement>(null);

  async function handleLoadMoreMessages() {
    const [isSuccess, result] = await messageRecipientsPaginationState.fetchData(() =>
      fetchByReactivated<interfaces.GetInboxMessages>(
        `${reverse("root:get_inbox_messages")}?page=${nextPageNumber}`,
        context.csrf_token,
        "GET"
      )
    );

    if (isSuccess) {
      setMessageRecipients((current) => [...current, ...result.message_recipients]);
      setNextPageNumber((current) => current + 1);
      setHasNext(result.has_next);
    } else {
      paginationErrorMessage.current?.scrollIntoView();
    }
  }

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
    <LazyMotion features={domAnimation}>
      <Layout title="Inbox" navbar={<NavigationBar />} className="mw-rem-60 mx-auto px-2 mb-4">
        <div className="d-flex align-items-center justify-content-between my-4">
          <h1 className="mb-0">
            <FontAwesomeIcon icon={faInbox} className="me-2" />
            Inbox
          </h1>
          <PushNotificationToggle />
        </div>

        {messageRecipients.length === 0 && (
          <div className="text-muted text-center py-5">No messages.</div>
        )}

        <ListGroup as="div">
          <AnimatePresence initial={false}>
            {messageRecipients.map((messageRecipient) => (
              <m.div
                key={messageRecipient.id}
                layout
                // react-doctor-disable-next-line react-doctor/no-layout-property-animation
                initial={{ opacity: 0, height: 0 }}
                // react-doctor-disable-next-line react-doctor/no-layout-property-animation
                animate={{ opacity: 1, height: "auto" }}
                // react-doctor-disable-next-line react-doctor/no-layout-property-animation
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => void handleMarkRead(messageRecipient)}
                className={classNames("list-group-item overflow-hidden", {
                  "list-group-item-action": !messageRecipient.is_read,
                  "bg-body-tertiary": !messageRecipient.is_read,
                })}
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
              </m.div>
            ))}
          </AnimatePresence>
        </ListGroup>

        {messageRecipients.length > 0 && (
          <LoadMoreButton
            ref={paginationErrorMessage}
            label="messages"
            isLoading={messageRecipientsPaginationState.isLoading}
            isError={messageRecipientsPaginationState.isError}
            errorMessages={messageRecipientsPaginationState.errorMessages}
            hasNext={hasNext}
            onClick={() => void handleLoadMoreMessages()}
          />
        )}
      </Layout>
    </LazyMotion>
  );
}
