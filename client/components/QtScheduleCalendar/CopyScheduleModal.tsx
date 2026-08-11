import React from "react";

import { Button, Form, Modal, Spinner } from "react-bootstrap";

import { Context, interfaces, reverse } from "@reactivated";

import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { fetchByReactivated } from "@client/util/commonUtil";
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

/**
 * Minimal format: store address header, then a comma-joined list of job clients. Each
 * JobClient is swapped for its shorter BrandParentCompany display name when one was
 * resolved (see resolveDisplayNames below) - falls back to the raw JobClient string
 * otherwise (no matching brand record, or the lookup failed/hasn't resolved yet).
 */
function buildMinimalText(
  serviceOrders: TServiceOrder[],
  displayNamesByJobClient: Map<string, string>
): string {
  const groups = groupServiceOrdersByStoreAddress(serviceOrders);

  return groups
    .map(([addressLine, storeServiceOrders]) => {
      const jobClients = Array.from(
        new Set(
          storeServiceOrders.map((so) => displayNamesByJobClient.get(so.JobClient) ?? so.JobClient)
        )
      );
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

function buildCopyText(
  serviceOrders: TServiceOrder[],
  format: TCopyFormat,
  displayNamesByJobClient: Map<string, string>
): string {
  // non-physical-visit SOs (e.g. drive-time entries) don't represent a store to visit,
  // so they're excluded from both formats - matching Clear Date's IsPhysicalVisit filtering.
  const physicalVisitServiceOrders = serviceOrders.filter((so) => so.Address.IsPhysicalVisit);

  return format === "Minimal"
    ? buildMinimalText(physicalVisitServiceOrders, displayNamesByJobClient)
    : buildDetailedText(physicalVisitServiceOrders);
}

/**
 * Looks up a shorter display name for each distinct JobClient via the
 * qt_brand_client_display_name endpoint (BrandParentCompany.expanded_name ||
 * short_name || canonical_name for the record whose canonical_name matches the
 * JobClient exactly). A JobClient with no matching record (404) or a failed request is
 * simply omitted from the returned map - buildMinimalText falls back to the raw
 * JobClient string for anything missing.
 */
async function resolveDisplayNames(
  jobClients: string[],
  csrfToken: string
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    jobClients.map(async (jobClient) => {
      const url = `${reverse("survey_worker:qt_brand_client_display_name")}?job_client=${encodeURIComponent(jobClient)}`;
      try {
        const resp = await fetchByReactivated<interfaces.QtBrandClientDisplayName>(
          url,
          csrfToken,
          "GET"
        );
        if (!resp.ok) {
          return null;
        }
        const data = await resp.json();
        return [jobClient, data.display_name] as const;
      } catch {
        return null;
      }
    })
  );

  return new Map(entries.filter((entry) => entry !== null));
}

interface Props {
  show: boolean;
  onHide: () => void;
  serviceOrders: TServiceOrder[];
  date: Date | undefined;
}

export function CopyScheduleModal(props: Props) {
  const { show, onHide, serviceOrders, date } = props;
  const context = React.useContext(Context);
  const [format, setFormat] = React.useState<TCopyFormat>("Minimal");
  const [displayNamesByJobClient, setDisplayNamesByJobClient] = React.useState<Map<string, string>>(
    new Map()
  );
  const [isResolvingDisplayNames, setIsResolvingDisplayNames] = React.useState(false);

  // Resolve shorter display names for every distinct JobClient among the physical-visit SOs
  // shown here, each time the modal opens with a (possibly new) set of service orders - not
  // on every keystroke/format change, since the lookups don't depend on either.
  React.useEffect(() => {
    if (!show) {
      return;
    }

    const jobClients = Array.from(
      new Set(serviceOrders.filter((so) => so.Address.IsPhysicalVisit).map((so) => so.JobClient))
    );
    if (jobClients.length === 0) {
      setDisplayNamesByJobClient(new Map());
      return;
    }

    let isCancelled = false;
    setIsResolvingDisplayNames(true);
    void resolveDisplayNames(jobClients, context.csrf_token).then((resolved) => {
      if (!isCancelled) {
        setDisplayNamesByJobClient(resolved);
        setIsResolvingDisplayNames(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [show, serviceOrders, context.csrf_token]);

  const copyText = React.useMemo(
    () => buildCopyText(serviceOrders, format, displayNamesByJobClient),
    [serviceOrders, format, displayNamesByJobClient]
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
        <div className="d-flex align-items-center gap-3 mb-3">
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
          {isResolvingDisplayNames && format === "Minimal" && (
            <Spinner animation="border" role="status" size="sm" className="text-muted">
              <span className="visually-hidden">Resolving display names…</span>
            </Spinner>
          )}
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
