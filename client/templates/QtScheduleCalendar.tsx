import React from "react";

import classNames from "classnames";
import { Button, Card, Form, ListGroup, Spinner, Toast, ToastContainer } from "react-bootstrap";

import { Context, interfaces, reverse, templates } from "@reactivated";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import {
  ICalendarDaySummary,
  ScheduleCalendarGrid,
  ScheduledServiceOrderListItem,
  UnscheduledServiceOrderListItem,
} from "@client/components/QtScheduleCalendar";
import { NavigationBar } from "@client/components/qtSurveyWorker/NavigationBar";
import {
  TSchedule,
  TServiceOrder,
  TUnscheduledOrderBy,
  UNSCHEDULED_ORDER_BY_OPTIONS,
  formatShortDate,
  formatWeekdayShortDate,
  groupByStore,
  sortServiceOrdersBy,
  toDateKey,
  withServiceOrdersRescheduled,
} from "@client/util/qtSurveyWorker/scheduleUtils";

import { Layout } from "../components/Layout";
import { useFetch } from "../hooks/useFetch";

import "@client/scss/react-day-picker.scss";

const LAST_SELECTED_REP_ID_KEY = "calendar-rep-id-last-used";

export function Template(props: templates.QtScheduleCalendar) {
  const context = React.useContext(Context);
  const fetchRepSchedule = useFetch<interfaces.QtViewRepDetail>();
  const scheduleServiceOrderFetch = useFetch<interfaces.QtScheduleServiceOrder>();
  const unscheduleServiceOrderFetch = useFetch<interfaces.QtUnscheduleServiceOrder>();
  const swapServiceOrdersFetch = useFetch<interfaces.QtSwapServiceOrders>();
  const clearScheduledDateFetch = useFetch<interfaces.QtClearScheduledDate>();

  const [selectedRepId, setSelectedRepId] = React.useState<number | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [localSchedule, setLocalSchedule] = React.useState<TSchedule | null>(null);
  const [scheduleFreshnessToast, setScheduleFreshnessToast] = React.useState<{
    isCached: boolean;
    show: boolean;
  } | null>(null);
  const [isSwapMode, setIsSwapMode] = React.useState(false);
  const [swapSelectedDates, setSwapSelectedDates] = React.useState<Date[]>([]);
  const [unscheduledOrderBy, setUnscheduledOrderBy] =
    React.useState<TUnscheduledOrderBy>("Location");

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;

  React.useEffect(() => {
    setLocalSchedule(fetchRepSchedule.data?.rep_sync_data.schedule ?? null);

    if (fetchRepSchedule.data !== null) {
      setScheduleFreshnessToast({ isCached: fetchRepSchedule.data.is_cached, show: true });
    }
  }, [fetchRepSchedule.data]);

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

  const schedule = localSchedule;

  const serviceOrders: TServiceOrder[] = schedule?.ServiceOrders ?? [];

  function rescheduleServiceOrdersLocally(serviceOrderIds: Iterable<number>, date: Date | string) {
    setLocalSchedule((current) => withServiceOrdersRescheduled(current, serviceOrderIds, date));
  }

  async function handleScheduleServiceOrder(so: TServiceOrder, date: Date) {
    if (selectedRepId === null) {
      return;
    }

    const [isSuccess, result] = await scheduleServiceOrderFetch.fetchData(() =>
      fetch(reverse("survey_worker:qt_schedule_service_order"), {
        method: "POST",
        headers: {
          "X-CSRFToken": context.csrf_token,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          rep_id: selectedRepId.toString(),
          service_order_id: so.ServiceOrderId.toString(),
          date: toDateKey(date),
        }),
      })
    );

    if (!isSuccess) {
      alert("Failed to schedule service order: request failed.");
      return;
    }

    if (!result.success) {
      alert(`Failed to schedule service order: ${result.error_message}`);
      return;
    }

    rescheduleServiceOrdersLocally([so.ServiceOrderId], date);
  }

  async function handleUnscheduleServiceOrder(so: TServiceOrder) {
    if (selectedRepId === null || schedule === null) {
      return;
    }

    if (!confirm(`Unschedule service order ${so.ServiceOrderId}?`)) {
      return;
    }

    const [isSuccess, result] = await unscheduleServiceOrderFetch.fetchData(() =>
      fetch(reverse("survey_worker:qt_unschedule_service_order"), {
        method: "POST",
        headers: {
          "X-CSRFToken": context.csrf_token,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          rep_id: selectedRepId.toString(),
          service_order_id: so.ServiceOrderId.toString(),
        }),
      })
    );

    if (!isSuccess) {
      alert("Failed to unschedule service order: request failed.");
      return;
    }

    if (!result.success) {
      alert("Failed to unschedule service order.");
      return;
    }

    rescheduleServiceOrdersLocally([so.ServiceOrderId], schedule.UnscheduledDate);
  }

  function getPhysicalVisitServiceOrderIdsForDate(dateKey: string): number[] {
    return serviceOrders
      .filter(
        (so) => so.Address.IsPhysicalVisit && toDateKey(new Date(so.DateScheduled)) === dateKey
      )
      .map((so) => so.ServiceOrderId);
  }

  async function handleExecuteSwap() {
    if (selectedRepId === null || swapSelectedDates.length !== 2) {
      return;
    }

    const [dateA, dateB] = swapSelectedDates;
    const dateAKey = toDateKey(dateA);
    const dateBKey = toDateKey(dateB);

    const serviceOrderIdsA = getPhysicalVisitServiceOrderIdsForDate(dateAKey);
    const serviceOrderIdsB = getPhysicalVisitServiceOrderIdsForDate(dateBKey);

    if (serviceOrderIdsA.length === 0 && serviceOrderIdsB.length === 0) {
      alert("Neither selected date has any physical-visit service orders to swap.");
      return;
    }

    if (
      !confirm(
        `Swap ${serviceOrderIdsA.length} service order(s) on ${dateAKey} with ${serviceOrderIdsB.length} service order(s) on ${dateBKey}?`
      )
    ) {
      return;
    }

    const [isSuccess, result] = await swapServiceOrdersFetch.fetchData(() =>
      fetch(reverse("survey_worker:qt_swap_service_orders"), {
        method: "POST",
        headers: {
          "X-CSRFToken": context.csrf_token,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          rep_id: selectedRepId.toString(),
          date_a: dateAKey,
          date_b: dateBKey,
          service_order_ids_a: serviceOrderIdsA.join(","),
          service_order_ids_b: serviceOrderIdsB.join(","),
        }),
      })
    );

    if (!isSuccess) {
      alert("Failed to swap service orders: request failed.");
      return;
    }

    const failures = result.results.filter((r) => !r.success);
    const succeeded = result.results.filter((r) => r.success).map((r) => r.service_order_id);
    const movedToB = succeeded.filter((id) => serviceOrderIdsA.includes(id));
    const movedToA = succeeded.filter((id) => serviceOrderIdsB.includes(id));

    rescheduleServiceOrdersLocally(movedToB, dateB);
    rescheduleServiceOrdersLocally(movedToA, dateA);

    if (failures.length > 0) {
      alert(
        `Swap completed with ${failures.length} failure(s): ${failures
          .map((f) => `SO ${f.service_order_id}: ${f.error_message}`)
          .join(", ")}`
      );
    }

    setIsSwapMode(false);
    setSwapSelectedDates([]);
  }

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
    () => sortServiceOrdersBy(unscheduledServiceOrders, unscheduledOrderBy),
    [unscheduledServiceOrders, unscheduledOrderBy]
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

  async function handleClearScheduledDate() {
    if (selectedRepId === null || schedule === null || serviceOrdersForSelectedDate.length === 0) {
      return;
    }

    const serviceOrderIds = serviceOrdersForSelectedDate.map((so) => so.ServiceOrderId);

    if (
      !confirm(
        `Unschedule all ${serviceOrderIds.length} service order(s) on ${formatWeekdayShortDate(
          selectedDate!
        )}?`
      )
    ) {
      return;
    }

    const [isSuccess, result] = await clearScheduledDateFetch.fetchData(() =>
      fetch(reverse("survey_worker:qt_clear_scheduled_date"), {
        method: "POST",
        headers: {
          "X-CSRFToken": context.csrf_token,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          rep_id: selectedRepId.toString(),
          service_order_ids: serviceOrderIds.join(","),
        }),
      })
    );

    if (!isSuccess) {
      alert("Failed to clear date: request failed.");
      return;
    }

    const succeeded = result.results.filter((r) => r.success).map((r) => r.service_order_id);
    const failures = result.results.filter((r) => !r.success);

    rescheduleServiceOrdersLocally(succeeded, schedule.UnscheduledDate);

    if (failures.length > 0) {
      alert(
        `Cleared date with ${failures.length} failure(s): ${failures
          .map((f) => `SO ${f.service_order_id}`)
          .join(", ")}`
      );
    }
  }

  return (
    <Layout title="Schedule" navbar={<NavigationBar />} className="mw-rem-90 mx-auto px-2 mb-4">
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1100 }}>
        <Toast
          show={scheduleFreshnessToast?.show === true}
          onClose={() =>
            setScheduleFreshnessToast((current) => current && { ...current, show: false })
          }
          delay={4000}
          autohide
          bg={scheduleFreshnessToast?.isCached === true ? "warning" : "success"}
        >
          <Toast.Header closeButton={true}>
            <strong className="me-auto">Schedule Data</strong>
          </Toast.Header>
          <Toast.Body
            className={classNames({
              "text-dark": scheduleFreshnessToast?.isCached === true,
              "text-white": scheduleFreshnessToast?.isCached !== true,
            })}
          >
            {scheduleFreshnessToast?.isCached === true
              ? "Showing cached schedule data."
              : "Showing freshly fetched schedule data."}
          </Toast.Body>
        </Toast>
      </ToastContainer>

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
              <Card.Header className="bg-secondary text-white d-flex align-items-center justify-content-between">
                <span>{unscheduledServiceOrders.length} Unscheduled Service Orders</span>
                <Form.Select
                  size="sm"
                  className="w-auto"
                  value={unscheduledOrderBy}
                  onChange={(event) =>
                    setUnscheduledOrderBy(event.target.value as TUnscheduledOrderBy)
                  }
                >
                  {UNSCHEDULED_ORDER_BY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      Order By: {option}
                    </option>
                  ))}
                </Form.Select>
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
                        disabled={selectedDate === undefined || scheduleServiceOrderFetch.isLoading}
                        className="text-nowrap"
                        style={{ width: "9.5rem" }}
                        onClick={() =>
                          selectedDate !== undefined && handleScheduleServiceOrder(so, selectedDate)
                        }
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
            <div className="d-flex align-items-center justify-content-between mb-2">
              <Form.Check
                type="checkbox"
                id="swap-jobs-checkbox"
                label="Swap Jobs"
                checked={isSwapMode}
                onChange={(event) => {
                  setIsSwapMode(event.target.checked);
                  setSwapSelectedDates([]);
                }}
              />
              {isSwapMode && (
                <ButtonWithSpinner
                  type="button"
                  className={classNames("btn btn-warning btn-sm", {
                    disabled: swapSelectedDates.length !== 2 && !swapServiceOrdersFetch.isLoading,
                  })}
                  spinnerVariant="black"
                  fetchState={swapServiceOrdersFetch}
                  onClick={() => swapSelectedDates.length === 2 && handleExecuteSwap()}
                >
                  Execute Swap
                </ButtonWithSpinner>
              )}
            </div>

            <ScheduleCalendarGrid
              isTodayAllowed={isTodayAllowed}
              maxSelectableDate={maxSelectableDate}
              selectedDate={selectedDate}
              daySummaries={daySummaries}
              onSelectDate={setSelectedDate}
              swapMode={isSwapMode}
              swapSelectedDates={swapSelectedDates}
              onSelectSwapDates={(dates) => setSwapSelectedDates(dates ?? [])}
            />

            {!isSwapMode && selectedDateKey !== null && selectedDate !== undefined && (
              <Card className="mt-4">
                <Card.Header className="bg-primary text-white d-flex align-items-center justify-content-between">
                  <span>
                    {serviceOrdersForSelectedDate.length} Service Order
                    {serviceOrdersForSelectedDate.length === 1 ? "" : "s"} Scheduled on{" "}
                    {formatWeekdayShortDate(selectedDate)}
                  </span>
                  <Button
                    variant="outline-light"
                    size="sm"
                    disabled={
                      serviceOrdersForSelectedDate.length === 0 || clearScheduledDateFetch.isLoading
                    }
                    onClick={() => void handleClearScheduledDate()}
                  >
                    Clear Date
                  </Button>
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
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={unscheduleServiceOrderFetch.isLoading}
                          onClick={() => handleUnscheduleServiceOrder(so)}
                        >
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
