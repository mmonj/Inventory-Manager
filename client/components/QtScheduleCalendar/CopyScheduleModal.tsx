import React from "react";

import { Button, Form, Modal } from "react-bootstrap";

import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { TServiceOrder, formatWeekdayShortDate } from "@client/util/qtSurveyWorker/scheduleUtils";

const COPY_FORMAT_OPTIONS = ["Minimal", "Detailed"] as const;
type TCopyFormat = (typeof COPY_FORMAT_OPTIONS)[number];

function getStoreAddressLine(so: TServiceOrder): string {
  return `${so.Address.StreetAddress} ${so.Address.City}, ${so.Address.State} ${so.Address.PostalCode}`;
}

/** Groups service orders by store address, preserving first-seen store order. */
function groupServiceOrdersByStoreAddress(
  serviceOrders: TServiceOrder[]
): [string, TServiceOrder[]][] {
  const byAddress = new Map<string, TServiceOrder[]>();

  for (const so of serviceOrders) {
    const addressLine = getStoreAddressLine(so);
    const existing = byAddress.get(addressLine);
    if (existing === undefined) {
      byAddress.set(addressLine, [so]);
    } else {
      existing.push(so);
    }
  }

  return Array.from(byAddress.entries());
}

/** Minimal format: store address header, then a comma-joined list of job clients. */
function buildMinimalText(serviceOrders: TServiceOrder[]): string {
  const groups = groupServiceOrdersByStoreAddress(serviceOrders);

  return groups
    .map(([addressLine, storeServiceOrders]) => {
      const jobClients = Array.from(new Set(storeServiceOrders.map((so) => so.JobClient)));
      return `${addressLine}\n- ${jobClients.join(", ")}`;
    })
    .join("\n\n");
}

/** Detailed format: store address header, then one line per service order (description + id). */
function buildDetailedText(serviceOrders: TServiceOrder[]): string {
  const groups = groupServiceOrdersByStoreAddress(serviceOrders);

  return groups
    .map(([addressLine, storeServiceOrders]) => {
      const lines = storeServiceOrders.map(
        (so) => `- ${so.ServiceOrderDescription} (${so.ServiceOrderId})`
      );
      return `Store: ${addressLine}\n${lines.join("\n")}`;
    })
    .join("\n\n");
}

function buildCopyText(serviceOrders: TServiceOrder[], format: TCopyFormat): string {
  // non-physical-visit SOs (e.g. drive-time entries) don't represent a store to visit,
  // so they're excluded from both formats - matching Clear Date's IsPhysicalVisit filtering.
  const physicalVisitServiceOrders = serviceOrders.filter((so) => so.Address.IsPhysicalVisit);

  return format === "Minimal"
    ? buildMinimalText(physicalVisitServiceOrders)
    : buildDetailedText(physicalVisitServiceOrders);
}

interface Props {
  show: boolean;
  onHide: () => void;
  serviceOrders: TServiceOrder[];
  date: Date | undefined;
}

export function CopyScheduleModal(props: Props) {
  const { show, onHide, serviceOrders, date } = props;
  const [format, setFormat] = React.useState<TCopyFormat>("Minimal");

  const copyText = React.useMemo(
    () => buildCopyText(serviceOrders, format),
    [serviceOrders, format]
  );

  async function handleCopy() {
    await navigator.clipboard.writeText(copyText);
    onHide();
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Copy Schedule{date !== undefined && ` for ${formatWeekdayShortDate(date)}`}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex gap-3 mb-3">
          {COPY_FORMAT_OPTIONS.map((option) => (
            <Form.Check
              key={option}
              type="radio"
              id={`copy-schedule-format-${option}`}
              name="copy-schedule-format"
              label={option}
              checked={format === option}
              onChange={() => setFormat(option)}
            />
          ))}
        </div>
        <Form.Control
          as="textarea"
          readOnly
          value={copyText}
          rows={14}
          className="font-monospace small"
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => void handleCopy()}>
          <FontAwesomeIcon icon={faCopy} className="me-1" />
          Copy
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
