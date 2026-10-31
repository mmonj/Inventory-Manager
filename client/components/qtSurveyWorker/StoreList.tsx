import React from "react";

import { Accordion, Alert, Badge, Button, Card } from "react-bootstrap";

import { SurveyWorkerQtraxWebsiteTypedefsTServiceOrder } from "@reactivated";

import { faClock, faExternalLinkAlt, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { encodeQtAddress, getFormattedEstimatedTime } from "@client/util/commonUtil";
import {
  formatDateRange,
  formatLastSeen,
  formatWeekdayShortDate,
} from "@client/util/qtSurveyWorker/scheduleUtils";
import {
  TVisitPlanStoreControls,
  VisitPlanOutcomeControls,
} from "@client/components/qtSurveyWorker/VisitPlanOutcomeControls";
import {
  TTerritoryRecentlySeenStore,
  TTerritoryStore,
  TTerritoryStoreEntry,
  TVisitPlanView,
  getStoreEstimatedTime,
} from "@client/util/qtSurveyWorker/territoryView";

interface Props {
  stores: Record<number, TTerritoryStore>;
  // schedule.UnscheduledDate sentinel value. A service order's DateScheduled equal to this means it
  // hasn't been scheduled yet (DateScheduled is never null/empty, scheduled or not).
  unscheduledDate?: string;
  // Stores with zero SOs in the current schedule (none, not just unscheduled ones)
  // Rendered as their own section.
  recentlySeenStores?: TTerritoryRecentlySeenStore[];
  // True for the combined territory: each store and service order says which rep it's for
  showRepNames?: boolean;
  // Only in a visit plan: the cards are grouped into Remaining, Skipped and Visited instead
  visitPlan?: { view: TVisitPlanView; controls: TVisitPlanStoreControls } | null;
}

function RepBadges({ repUsernames }: { repUsernames: string[] }) {
  return (
    <div className="d-flex flex-wrap gap-1 mb-2">
      {repUsernames.map((repUsername) => (
        <Badge key={repUsername} bg="info" className="text-dark fw-normal">
          {repUsername}
        </Badge>
      ))}
    </div>
  );
}

function formatScheduledStatus(
  serviceOrder: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
  unscheduledDate: string | undefined
): string {
  if (unscheduledDate === undefined || serviceOrder.DateScheduled === unscheduledDate) {
    return "Unscheduled";
  }
  return `Scheduled on ${formatWeekdayShortDate(new Date(serviceOrder.DateScheduled))}`;
}

function ServiceOrderStoreCard({
  store,
  unscheduledDate,
  showRepNames,
  outcomeControls,
}: {
  store: TTerritoryStore;
  unscheduledDate: string | undefined;
  showRepNames: boolean;
  outcomeControls?: React.ReactNode;
}) {
  const { address, serviceOrders } = store;
  const totalHours = getStoreEstimatedTime(store);

  return (
    <Accordion.Item eventKey={address.SiteId.toString()} className="mb-3 border-0 shadow-sm">
      <Accordion.Header className="bg-white">
        <div className="w-100 pe-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h5 className="mb-0 text-primary fw-bold">{address.StoreName || "(Unnamed Store)"}</h5>
            <Badge bg="primary" pill className="ms-2">
              {serviceOrders.length} {serviceOrders.length === 1 ? "ticket" : "tickets"}
            </Badge>
          </div>
          {showRepNames && (
            <RepBadges
              repUsernames={[
                ...new Set(serviceOrders.map((serviceOrder) => serviceOrder.repUsername)),
              ].sort()}
            />
          )}
          <div className="d-flex align-items-center text-muted small mb-1">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
            <span>
              {address.StreetAddress}, {address.City}, {address.State} {address.PostalCode}
            </span>
          </div>
          <div className="d-flex align-items-center text-muted small">
            <FontAwesomeIcon icon={faClock} className="me-2" />
            <span>
              Total Time: <strong>{getFormattedEstimatedTime(totalHours)}</strong>
            </span>
          </div>
          {store.lastSeen !== undefined && (
            <div className="d-flex align-items-center text-muted small mt-1">
              <FontAwesomeIcon icon={faClock} className="me-2" />
              <span>
                Last Seen: <strong>{formatLastSeen(store.lastSeen)}</strong>
              </span>
            </div>
          )}
        </div>
      </Accordion.Header>
      {outcomeControls !== undefined && (
        <div className="store-card-outcome-controls bg-white">{outcomeControls}</div>
      )}
      <Accordion.Body className="bg-light">
        <div className="mb-3 d-flex justify-content-end">
          <Button
            href={"https://www.google.com/maps/search/?api=1&query=" + encodeQtAddress(address)}
            target="_blank"
            rel="noreferrer"
            variant="outline-primary"
            size="sm"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} className="me-1" />
            Open in Maps
          </Button>
        </div>

        <div>
          {serviceOrders.map((serviceOrder, serviceOrderIndex) => (
            <Card key={serviceOrderIndex} className="mb-3 border-0 shadow-sm">
              <Card.Body className="p-3">
                <div className="row g-2">
                  <div className="col-md-6">
                    {showRepNames && (
                      <div className="mb-2">
                        <small className="text-muted d-block">Field Rep</small>
                        <span className="fw-semibold">{serviceOrder.repUsername}</span>
                      </div>
                    )}
                    <div className="mb-2">
                      <small className="text-muted d-block">Service Order ID</small>
                      <span className="fw-semibold">{serviceOrder.ServiceOrderId}</span>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted d-block">Description</small>
                      <span>{serviceOrder.ServiceOrderDescription}</span>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted d-block">Status</small>
                      <Badge
                        bg={
                          unscheduledDate !== undefined &&
                          serviceOrder.DateScheduled !== unscheduledDate
                            ? "primary"
                            : "secondary"
                        }
                        className="fw-normal"
                      >
                        {formatScheduledStatus(serviceOrder, unscheduledDate)}
                      </Badge>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-2">
                      <small className="text-muted d-block">Estimated Time</small>
                      <Badge bg="success" className="fw-normal">
                        <FontAwesomeIcon icon={faClock} className="me-1" />
                        {getFormattedEstimatedTime(serviceOrder.EstimatedTime)}
                      </Badge>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted d-block">Date Range</small>
                      <span className="text-secondary">
                        {formatDateRange(
                          serviceOrder.DateScheduleRangeStartOriginal,
                          serviceOrder.DateScheduleRangeEndOriginal
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
}

function RecentlySeenStoreCard({
  store,
  showRepNames,
  outcomeControls,
}: {
  store: TTerritoryRecentlySeenStore;
  showRepNames: boolean;
  outcomeControls?: React.ReactNode;
}) {
  return (
    <Accordion.Item eventKey={store.id.toString()} className="mb-3 border-0 shadow-sm opacity-75">
      <Accordion.Header className="bg-body-secondary">
        <div className="w-100 pe-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h5 className="mb-0 text-secondary fw-bold">{store.name || "(Unnamed Store)"}</h5>
            <Badge bg="secondary" pill className="ms-2">
              No Current Tickets
            </Badge>
          </div>
          {showRepNames && <RepBadges repUsernames={[store.repUsername]} />}
          <div className="d-flex align-items-center text-muted small mb-1">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
            <span>
              {store.address_1}, {store.city}, {store.state} {store.zip_code}
            </span>
          </div>
          <div className="d-flex align-items-center text-muted small">
            <FontAwesomeIcon icon={faClock} className="me-2" />
            <span>
              Last Seen: <strong>{formatLastSeen(store.last_seen)}</strong>
            </span>
          </div>
        </div>
      </Accordion.Header>
      {outcomeControls !== undefined && (
        <div className="store-card-outcome-controls bg-body-secondary">{outcomeControls}</div>
      )}
      <Accordion.Body className="bg-body-secondary">
        <div className="d-flex justify-content-end mb-3">
          <Button
            href={
              "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(
                `${store.address_1} ${store.city} ${store.state} ${store.zip_code}`
              )
            }
            target="_blank"
            rel="noreferrer"
            variant="outline-primary"
            size="sm"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} className="me-1" />
            Open in Maps
          </Button>
        </div>
        <p className="text-muted mb-0">
          No pending tickets are currently available for this store.
        </p>
      </Accordion.Body>
    </Accordion.Item>
  );
}

function NoStoresFound() {
  return (
    <Card className="shadow-sm border-0 text-center py-5">
      <Card.Body>
        <div className="mb-3">
          <i className="fs-1">🏪</i>
        </div>
        <h4 className="mb-2">No Stores Found</h4>
        <p className="text-muted">Try adjusting your filters to see more results.</p>
      </Card.Body>
    </Card>
  );
}

function GroupHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3">
      <h3 className="h5 text-secondary">
        {title}{" "}
        <Badge bg="secondary" pill>
          {count}
        </Badge>
      </h3>
    </div>
  );
}

function VisitPlanStoreGroup({
  title,
  storeEntries,
  unscheduledDate,
  showRepNames,
  controls,
}: {
  title: string;
  storeEntries: TTerritoryStoreEntry[];
  unscheduledDate: string | undefined;
  showRepNames: boolean;
  controls: TVisitPlanStoreControls;
}) {
  return (
    <>
      <GroupHeading title={title} count={storeEntries.length} />
      <Accordion className="mb-4">
        {storeEntries.map((storeEntry) => {
          const outcomeControls = (
            <VisitPlanOutcomeControls siteId={storeEntry.siteId} controls={controls} />
          );
          return storeEntry.kind === "withServiceOrders" ? (
            <ServiceOrderStoreCard
              key={storeEntry.siteId}
              store={storeEntry.store}
              unscheduledDate={unscheduledDate}
              showRepNames={showRepNames}
              outcomeControls={outcomeControls}
            />
          ) : (
            <RecentlySeenStoreCard
              key={storeEntry.siteId}
              store={storeEntry.store}
              showRepNames={showRepNames}
              outcomeControls={outcomeControls}
            />
          );
        })}
      </Accordion>
    </>
  );
}

export function StoreList({
  stores,
  unscheduledDate,
  recentlySeenStores = [],
  showRepNames = false,
  visitPlan = null,
}: Props) {
  const storeCount = Object.keys(stores).length;

  if (visitPlan !== null) {
    const { view, controls } = visitPlan;
    return (
      <div>
        {view.isAllDone && (
          <Alert variant="success" className="text-center fw-semibold">
            All stores visited or skipped
          </Alert>
        )}
        {view.remaining.length === 0 &&
          view.skipped.length === 0 &&
          view.visited.length === 0 &&
          view.unmarkableStores.length === 0 &&
          !view.isAllDone && <NoStoresFound />}
        {view.remaining.length > 0 && (
          <VisitPlanStoreGroup
            title="Remaining"
            storeEntries={view.remaining}
            unscheduledDate={unscheduledDate}
            showRepNames={showRepNames}
            controls={controls}
          />
        )}
        {view.skipped.length > 0 && (
          <VisitPlanStoreGroup
            title="Skipped"
            storeEntries={view.skipped}
            unscheduledDate={unscheduledDate}
            showRepNames={showRepNames}
            controls={controls}
          />
        )}
        {view.visited.length > 0 && (
          <VisitPlanStoreGroup
            title="Visited"
            storeEntries={view.visited}
            unscheduledDate={unscheduledDate}
            showRepNames={showRepNames}
            controls={controls}
          />
        )}
        {view.unmarkableStores.length > 0 && (
          <>
            <GroupHeading title="Can't Be Marked" count={view.unmarkableStores.length} />
            <p className="text-secondary small">
              These stores have no site id yet, so they can&apos;t be marked visited or skipped.
            </p>
            <Accordion className="mb-4">
              {view.unmarkableStores.map((store) => (
                <RecentlySeenStoreCard key={store.id} store={store} showRepNames={showRepNames} />
              ))}
            </Accordion>
          </>
        )}
      </div>
    );
  }

  if (storeCount === 0 && recentlySeenStores.length === 0) {
    return <NoStoresFound />;
  }

  return (
    <div>
      {storeCount > 0 && (
        <>
          <GroupHeading title="Store List" count={storeCount} />
          <Accordion className="mb-4">
            {Object.values(stores).map((store) => (
              <ServiceOrderStoreCard
                key={store.address.SiteId}
                store={store}
                unscheduledDate={unscheduledDate}
                showRepNames={showRepNames}
              />
            ))}
          </Accordion>
        </>
      )}

      {recentlySeenStores.length > 0 && (
        <>
          <GroupHeading title="No Current Tickets" count={recentlySeenStores.length} />
          <Accordion>
            {recentlySeenStores.map((store) => (
              <RecentlySeenStoreCard key={store.id} store={store} showRepNames={showRepNames} />
            ))}
          </Accordion>
        </>
      )}
    </div>
  );
}
