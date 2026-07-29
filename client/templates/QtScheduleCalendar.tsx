import React from "react";

import { Button, Card, Form, ListGroup, Spinner } from "react-bootstrap";
import { DayContentProps, DayPicker } from "react-day-picker";

import { faBuilding } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Context, interfaces, reverse, templates } from "@reactivated";

import { NavigationBar } from "@client/components/qtSurveyWorker/NavigationBar";
import { getFormattedEstimatedTime } from "@client/util/commonUtil";

import { Layout } from "../components/Layout";
import { useFetch } from "../hooks/useFetch";

type TSchedule = NonNullable<interfaces.QtViewRepDetail["rep_sync_data"]["schedule"]>;
type TServiceOrder = TSchedule["ServiceOrders"][number];

function formatTotalHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(2);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatWindow(so: TServiceOrder): string {
  const start = formatShortDate(new Date(so.DateScheduleRangeStart));
  const end = formatShortDate(new Date(so.DateScheduleRangeEnd));
  return `${start} - ${end}`;
}

interface ServiceOrderListItemProps {
  so: TServiceOrder;
  action: React.ReactNode;
}

function StoreAddressBlock(props: { so: TServiceOrder }) {
  const { so } = props;

  return (
    <div className="d-flex gap-2">
      <FontAwesomeIcon
        icon={faBuilding}
        size="2x"
        className={so.Address.IsPhysicalVisit ? "text-info" : "text-secondary"}
      />
      <div>
        <div className="fw-semibold">{so.Address.StoreName}</div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${so.Address.MapLink}`}
          target="_blank"
          rel="noreferrer"
          className="text-muted small d-block text-decoration-none"
        >
          <div>{so.Address.StreetAddress}</div>
          <div>
            {so.Address.City}, {so.Address.State} {so.Address.PostalCode}
          </div>
        </a>
        {so.Address.Phone !== null && <div className="text-muted small">{so.Address.Phone}</div>}
        <div className="fw-semibold small">Window: {formatWindow(so)}</div>
      </div>
    </div>
  );
}

function UnscheduledServiceOrderListItem(props: ServiceOrderListItemProps) {
  const { so } = props;

  return (
    <ListGroup.Item className="d-flex justify-content-between align-items-start gap-4">
      <div className="fw-semibold" style={{ width: "28%" }}>
        {so.JobId} {so.ServiceOrderDescription} ({so.ServiceOrderId})
      </div>

      <div style={{ width: "28%" }}>
        <StoreAddressBlock so={so} />
      </div>

      <div className="text-info small text-end" style={{ width: "15%" }}>
        {getFormattedEstimatedTime(so.EstimatedTime)}
        <br />
        Estimated
      </div>

      <div className="flex-shrink-0">{props.action}</div>
    </ListGroup.Item>
  );
}

function ScheduledServiceOrderListItem(props: ServiceOrderListItemProps) {
  const { so } = props;

  return (
    <ListGroup.Item className="d-flex justify-content-between align-items-start gap-2">
      <div>
        <div className="fw-semibold">
          {so.JobId} {so.ServiceOrderDescription} ({so.ServiceOrderId})
        </div>
        <StoreAddressBlock so={so} />
      </div>

      <div className="d-flex flex-column align-items-end gap-1 flex-shrink-0">
        <span className="text-info small">{getFormattedEstimatedTime(so.EstimatedTime)} Est.</span>
        {props.action}
      </div>
    </ListGroup.Item>
  );
}

function getStoreGroupKey(so: TServiceOrder): string {
  return `Physical Visit: ${so.Address.IsPhysicalVisit.toString()} + ${so.DateScheduleRangeEnd} ${
    so.ServiceOrderDescription
  } ${so.Address.Latitude} ${so.Address.Longitude}`;
}

function groupByStore(serviceOrders: TServiceOrder[]): TServiceOrder[] {
  return [...serviceOrders].sort((a, b) => getStoreGroupKey(a).localeCompare(getStoreGroupKey(b)));
}

interface ICalendarDaySummary {
  serviceOrderCount: number;
  totalHours: number;
}

interface Props {
  isTodayAllowed: boolean;
  maxSelectableDate: Date | null;
  selectedDate: Date | undefined;
  daySummaries: Map<string, ICalendarDaySummary>;
  onSelectDate: (date: Date | undefined) => void;
}

function ScheduleCalendarGrid(props: Props) {
  function isAllowed(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (props.maxSelectableDate === null || date > props.maxSelectableDate) {
      return false;
    }

    if (toDateKey(date) === toDateKey(today)) {
      return props.isTodayAllowed;
    }

    return date > today;
  }

  function renderDayContent(dayProps: DayContentProps) {
    const summary = props.daySummaries.get(toDateKey(dayProps.date));

    return (
      <div
        className="d-flex flex-column align-items-start justify-content-center"
        style={{ textAlign: "left" }}
      >
        <div className="mb-1 fw-bold">{dayProps.date.getDate()}</div>
        {summary && (
          <div>
            <div>{summary.serviceOrderCount} SOs</div>
            <div>{formatTotalHours(summary.totalHours)}h</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="qt-schedule-calendar">
      <Card.Body className="d-flex justify-content-center">
        <DayPicker
          mode="single"
          selected={props.selectedDate}
          onSelect={props.onSelectDate}
          disabled={(date) => !isAllowed(date)}
          modifiers={{ selectable: isAllowed }}
          modifiersClassNames={{ selectable: "qt-day-selectable" }}
          components={{ DayContent: renderDayContent }}
          showOutsideDays
          fixedWeeks
        />
      </Card.Body>
    </Card>
  );
}

const LAST_SELECTED_REP_ID_KEY = "calendar-rep-id-last-used";

export default function Template(props: templates.QtScheduleCalendar) {
  const context = React.useContext(Context);
  const fetchRepSchedule = useFetch<interfaces.QtViewRepDetail>();

  const [selectedRepId, setSelectedRepId] = React.useState<number | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;

  async function fetchScheduleForRep(repId: number) {
    const baseUrl = reverse("survey_worker:qt_view_rep_schedule", { rep_id: repId });
    const useCache = new URLSearchParams(window.location.search).get("use_cache");
    const url = useCache !== null ? `${baseUrl}?use_cache=${useCache}` : baseUrl;

    await fetchRepSchedule.fetchData(() =>
      fetch(url, {
        method: "GET",
        headers: {
          "X-CSRFToken": context.csrf_token,
          Accept: "application/json",
        },
      })
    );
  }

  async function handleSelectRep(event: React.ChangeEvent<HTMLSelectElement>) {
    const repId = Number(event.target.value);
    setSelectedDate(undefined);

    if (repId < 0) {
      setSelectedRepId(null);
      return;
    }

    setSelectedRepId(repId);
    localStorage.setItem(LAST_SELECTED_REP_ID_KEY, repId.toString());

    await fetchScheduleForRep(repId);
  }

  // load last selected rep ID on mount and auto-fetch their schedule
  React.useEffect(() => {
    const lastSelectedRepId = localStorage.getItem(LAST_SELECTED_REP_ID_KEY);
    if (lastSelectedRepId === null || lastSelectedRepId === "") {
      return;
    }

    const storedId = parseInt(lastSelectedRepId, 10);
    if (isNaN(storedId) || !props.rep_details.some((rep) => rep.id === storedId)) {
      return;
    }

    setSelectedRepId(storedId);
    void fetchScheduleForRep(storedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const schedule = fetchRepSchedule.data?.rep_sync_data.schedule ?? null;

  const serviceOrders: TServiceOrder[] = schedule?.ServiceOrders ?? [];

  const unscheduledServiceOrders = React.useMemo(() => {
    if (schedule === null) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return serviceOrders.filter((so) => {
      if (so.DateScheduled !== schedule.UnscheduledDate) {
        return false;
      }

      const rangeEnd = new Date(so.DateScheduleRangeEnd);
      if (rangeEnd < today) {
        return false;
      }

      if (selectedDate !== undefined) {
        const rangeStart = new Date(so.DateScheduleRangeStart);
        if (selectedDate < rangeStart || selectedDate > rangeEnd) {
          return false;
        }
      }

      return true;
    });
  }, [serviceOrders, schedule, selectedDate]);
  const groupedUnscheduledServiceOrders = React.useMemo(
    () => groupByStore(unscheduledServiceOrders),
    [unscheduledServiceOrders]
  );

  const isTodayAllowed = React.useMemo(() => {
    if (schedule === null) {
      return false;
    }

    const todayKey = toDateKey(new Date());
    return schedule.AllowSchedulingDates.some((isoStr) => toDateKey(new Date(isoStr)) === todayKey);
  }, [schedule]);

  const maxSelectableDate = React.useMemo(() => {
    if (serviceOrders.length === 0) {
      return null;
    }

    const endDates = serviceOrders.map((so) => new Date(so.DateScheduleRangeEnd));
    return new Date(Math.max(...endDates.map((date) => date.getTime())));
  }, [serviceOrders]);

  const daySummaries = React.useMemo(() => {
    const summaries = new Map<string, ICalendarDaySummary>();

    for (const so of serviceOrders) {
      if (schedule !== null && so.DateScheduled === schedule.UnscheduledDate) {
        continue;
      }

      const dateKey = toDateKey(new Date(so.DateScheduled));
      const existing = summaries.get(dateKey) ?? { serviceOrderCount: 0, totalHours: 0 };
      existing.serviceOrderCount += 1;
      existing.totalHours += so.EstimatedTime;
      summaries.set(dateKey, existing);
    }

    return summaries;
  }, [serviceOrders, schedule]);

  const serviceOrdersForSelectedDate = React.useMemo(() => {
    if (selectedDateKey === null) {
      return [];
    }

    return serviceOrders.filter((so) => {
      if (schedule !== null && so.DateScheduled === schedule.UnscheduledDate) {
        return false;
      }
      return toDateKey(new Date(so.DateScheduled)) === selectedDateKey;
    });
  }, [serviceOrders, selectedDateKey, schedule]);
  const groupedServiceOrdersForSelectedDate = React.useMemo(
    () => groupByStore(serviceOrdersForSelectedDate),
    [serviceOrdersForSelectedDate]
  );

  return (
    <Layout
      title="Schedule"
      navbar={<NavigationBar />}
      className="mw-rem-90 mx-auto px-2"
      extraStyles={["styles/react-day-picker.css"]}
    >
      <h1 className="my-4">Schedule Calendar</h1>

      <Form.Group className="mb-4" style={{ maxWidth: "24rem" }}>
        <Form.Label>Select Rep</Form.Label>
        <Form.Select
          value={selectedRepId ?? -1}
          onChange={handleSelectRep}
          disabled={fetchRepSchedule.isLoading}
        >
          <option value={-1}>Select a rep...</option>
          {props.rep_details.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.username}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {fetchRepSchedule.isLoading && (
        <div className="d-flex align-items-center gap-2">
          <span>Loading schedule...</span>
          <Spinner animation="border" role="status" size="sm">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}
      {fetchRepSchedule.isError && (
        <div className="text-danger">
          Failed to fetch schedule: {fetchRepSchedule.errorMessages.join(", ")}
        </div>
      )}

      {selectedRepId !== null && schedule !== null && (
        <div className="row g-4">
          <div className="col-md-5">
            <Card>
              <Card.Header className="bg-secondary text-white">
                {unscheduledServiceOrders.length} Unscheduled Service Orders
              </Card.Header>
              <ListGroup variant="flush">
                {unscheduledServiceOrders.length === 0 && (
                  <ListGroup.Item className="text-muted">
                    No unscheduled service orders.
                  </ListGroup.Item>
                )}
                {groupedUnscheduledServiceOrders.map((so) => (
                  <UnscheduledServiceOrderListItem
                    key={so.ServiceOrderId}
                    so={so}
                    action={
                      <Button
                        variant="primary"
                        size="sm"
                        disabled
                        className="text-nowrap"
                        style={{ width: "9.5rem" }}
                      >
                        {selectedDate !== undefined
                          ? `Schedule on ${formatShortDate(selectedDate)}`
                          : "Select a date"}
                      </Button>
                    }
                  />
                ))}
              </ListGroup>
            </Card>
          </div>

          <div className="col-md-7">
            <ScheduleCalendarGrid
              isTodayAllowed={isTodayAllowed}
              maxSelectableDate={maxSelectableDate}
              selectedDate={selectedDate}
              daySummaries={daySummaries}
              onSelectDate={setSelectedDate}
            />

            {selectedDateKey !== null && (
              <Card className="mt-4">
                <Card.Header className="bg-primary text-white">
                  {serviceOrdersForSelectedDate.length} Service Order
                  {serviceOrdersForSelectedDate.length === 1 ? "" : "s"} Scheduled on{" "}
                  {selectedDateKey}
                </Card.Header>
                <ListGroup variant="flush">
                  {serviceOrdersForSelectedDate.length === 0 && (
                    <ListGroup.Item className="text-muted">
                      No service orders scheduled on this date.
                    </ListGroup.Item>
                  )}
                  {groupedServiceOrdersForSelectedDate.map((so) => (
                    <ScheduledServiceOrderListItem
                      key={so.ServiceOrderId}
                      so={so}
                      action={
                        <Button variant="danger" size="sm" disabled>
                          Unschedule
                        </Button>
                      }
                    />
                  ))}
                </ListGroup>
              </Card>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
