import React from "react";

import classNames from "classnames";
import { AnimatePresence } from "motion/react";
import {
  Alert,
  Button,
  Card,
  Form,
  ListGroup,
  Spinner,
  Toast,
  ToastContainer,
} from "react-bootstrap";

import { Context, interfaces, reverse, templates } from "@reactivated";

import { faFilter, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { ErrorToastStack } from "@client/components/ErrorToastStack";
import {
  ICalendarDaySummary,
  JobClientFilterModal,
  ScheduleCalendarGrid,
  ScheduledServiceOrderListItem,
  UnscheduledServiceOrderListItem,
} from "@client/components/QtScheduleCalendar";
import { NavigationBar } from "@client/components/qtSurveyWorker/NavigationBar";
import { useErrorToasts } from "@client/hooks/useErrorToasts";
import { fetchByReactivated } from "@client/util/commonUtil";
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
  const executeAutoScheduleFetch = useFetch<interfaces.QtExecuteAutoSchedule>();
  const executeBulkUnscheduleFetch = useFetch<interfaces.QtExecuteBulkUnschedule>();
  const errorToasts = useErrorToasts();

  // guard against a duplicate initial fetch if the mount effect below somehow fires twice
  // to work around hydration remounts
  const hasFetchedInitialSchedule = React.useRef(false);

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
  const [showJobClientFilter, setShowJobClientFilter] = React.useState(false);
  const [selectedJobClients, setSelectedJobClients] = React.useState<Set<string>>(new Set());
  const [isAutoScheduleMode, setIsAutoScheduleMode] = React.useState(false);
  const [autoScheduleSelectedDates, setAutoScheduleSelectedDates] = React.useState<Date[]>([]);
  const [autoScheduleSelectedSoIds, setAutoScheduleSelectedSoIds] = React.useState<Set<number>>(
    new Set()
  );
  const [isBulkUnscheduleMode, setIsBulkUnscheduleMode] = React.useState(false);
  const [bulkUnscheduleSelectedDates, setBulkUnscheduleSelectedDates] = React.useState<Date[]>([]);

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;

  React.useEffect(() => {
    setLocalSchedule(fetchRepSchedule.data?.rep_sync_data.schedule ?? null);

    if (fetchRepSchedule.data !== null) {
      setScheduleFreshnessToast({ isCached: fetchRepSchedule.data.is_cached, show: true });
    }
  }, [fetchRepSchedule.data]);

  async function fetchScheduleForRep(repId: number, forceFresh = false) {
    const baseUrl = reverse("survey_worker:qt_view_rep_schedule", { rep_id: repId });
    // forceFresh overrides the URL's use_cache param - used right after a server-side mutation
    // (e.g. auto-scheduling) where a cached/recently-modified response would be stale.
    const useCache = forceFresh
      ? "off"
      : new URLSearchParams(window.location.search).get("use_cache");
    const url = useCache !== null ? `${baseUrl}?use_cache=${useCache}` : baseUrl;

    await fetchRepSchedule.fetchData(() =>
      fetchByReactivated<interfaces.QtViewRepDetail>(url, context.csrf_token, "GET")
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
    if (hasFetchedInitialSchedule.current) {
      return;
    }

    const lastSelectedRepId = localStorage.getItem(LAST_SELECTED_REP_ID_KEY);
    if (lastSelectedRepId === null || lastSelectedRepId === "") {
      return;
    }

    const storedId = parseInt(lastSelectedRepId, 10);
    if (isNaN(storedId) || !props.rep_details.some((rep) => rep.id === storedId)) {
      return;
    }

    hasFetchedInitialSchedule.current = true;
    setSelectedRepId(storedId);
    void fetchScheduleForRep(storedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const schedule = localSchedule;

  // memoized so a re-render without a real schedule change doesn't produce a new array
  // reference each time - downstream useMemo/useEffect hooks key off this by reference
  const serviceOrders: TServiceOrder[] = React.useMemo(
    () => schedule?.ServiceOrders ?? [],
    [schedule]
  );

  const allJobClients = React.useMemo(
    () => Array.from(new Set(serviceOrders.map((so) => so.JobClient))).sort(),
    [serviceOrders]
  );

  React.useEffect(() => {
    setSelectedJobClients(new Set(allJobClients));
  }, [allJobClients]);

  function rescheduleServiceOrdersLocally(serviceOrderIds: Iterable<number>, date: Date | string) {
    setLocalSchedule((current) => withServiceOrdersRescheduled(current, serviceOrderIds, date));
  }

  async function handleScheduleServiceOrder(so: TServiceOrder, date: Date) {
    if (selectedRepId === null) {
      return;
    }

    const [isSuccess, result, errorMessages] = await scheduleServiceOrderFetch.fetchData(() =>
      fetchByReactivated<interfaces.QtScheduleServiceOrder>(
        reverse("survey_worker:qt_schedule_service_order"),
        context.csrf_token,
        "POST",
        new URLSearchParams({
          rep_id: selectedRepId.toString(),
          service_order_id: so.ServiceOrderId.toString(),
          date: toDateKey(date),
        }),
        "application/x-www-form-urlencoded"
      )
    );

    if (!isSuccess) {
      errorToasts.showError("Failed to schedule service order", errorMessages);
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

    const [isSuccess, result, errorMessages] = await unscheduleServiceOrderFetch.fetchData(() =>
      fetchByReactivated<interfaces.QtUnscheduleServiceOrder>(
        reverse("survey_worker:qt_unschedule_service_order"),
        context.csrf_token,
        "POST",
        new URLSearchParams({
          rep_id: selectedRepId.toString(),
          service_order_id: so.ServiceOrderId.toString(),
        }),
        "application/x-www-form-urlencoded"
      )
    );

    if (!isSuccess) {
      errorToasts.showError("Failed to unschedule service order", errorMessages);
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

    // only physical-visit SOs are swappable between dates
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

    const [isSuccess, result, errorMessages] = await swapServiceOrdersFetch.fetchData(() =>
      fetchByReactivated<interfaces.QtSwapServiceOrders>(
        reverse("survey_worker:qt_swap_service_orders"),
        context.csrf_token,
        "POST",
        new URLSearchParams({
          rep_id: selectedRepId.toString(),
          date_a: dateAKey,
          date_b: dateBKey,
          service_order_ids_a: serviceOrderIdsA.join(","),
          service_order_ids_b: serviceOrderIdsB.join(","),
        }),
        "application/x-www-form-urlencoded"
      )
    );

    if (!isSuccess) {
      errorToasts.showError("Failed to swap service orders", errorMessages);
      return;
    }

    const failures = result.results.filter((r) => !r.success);
    const succeeded = result.results.filter((r) => r.success).map((r) => r.service_order_id);
    // split the flat results back into each date's group, since the server doesn't tag them
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

      // drop SOs whose scheduling window has already closed
      const rangeEnd = new Date(so.DateScheduleRangeEnd);
      if (rangeEnd < today) {
        return false;
      }

      // if a calendar date is picked, only show SOs eligible for that date
      if (selectedDate !== undefined) {
        const rangeStart = new Date(so.DateScheduleRangeStart);
        if (selectedDate < rangeStart || selectedDate > rangeEnd) {
          return false;
        }
      }

      if (!selectedJobClients.has(so.JobClient)) {
        return false;
      }

      return true;
    });
  }, [serviceOrders, schedule, selectedDate, selectedJobClients]);
  const groupedUnscheduledServiceOrders = React.useMemo(
    () => sortServiceOrdersBy(unscheduledServiceOrders, unscheduledOrderBy),
    [unscheduledServiceOrders, unscheduledOrderBy]
  );

  const visibleUnscheduledSoIds = React.useMemo(
    () => new Set(unscheduledServiceOrders.map((so) => so.ServiceOrderId)),
    [unscheduledServiceOrders]
  );

  // only SOs currently visible in the Unscheduled list count as selected -
  // dropping a SO out of view (via date/job-client filtering) also drops its selection
  React.useEffect(() => {
    setAutoScheduleSelectedSoIds((current) => {
      const next = new Set([...current].filter((id) => visibleUnscheduledSoIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleUnscheduledSoIds]);

  // the "Enable Auto-Scheduling" checkbox is hidden with no unscheduled SOs to select -
  // exit auto-schedule mode if it was on when the list emptied out from under it
  React.useEffect(() => {
    if (unscheduledServiceOrders.length === 0) {
      setIsAutoScheduleMode(false);
    }
  }, [unscheduledServiceOrders]);

  function toggleAutoScheduleSoSelected(soId: number) {
    setAutoScheduleSelectedSoIds((current) => {
      const next = new Set(current);
      if (next.has(soId)) {
        next.delete(soId);
      } else {
        next.add(soId);
      }
      return next;
    });
  }

  async function handleExecuteAutoSchedule() {
    if (
      selectedRepId === null ||
      autoScheduleSelectedSoIds.size === 0 ||
      autoScheduleSelectedDates.length === 0
    ) {
      return;
    }

    // only physical-visit SOs are eligible for auto-scheduling
    const serviceOrderIds = serviceOrders
      .filter(
        (so) => autoScheduleSelectedSoIds.has(so.ServiceOrderId) && so.Address.IsPhysicalVisit
      )
      .map((so) => so.ServiceOrderId);
    const dateKeys = autoScheduleSelectedDates.map((date) => toDateKey(date));

    if (serviceOrderIds.length === 0) {
      alert("None of the selected service orders are physical-visit service orders.");
      return;
    }

    if (
      !confirm(
        `This will auto-schedule ${serviceOrderIds.length} service order(s) and may take up ` +
          `to a minute or two depending on how many are being scheduled. Continue?`
      )
    ) {
      return;
    }

    const [isSuccess, result, errorMessages] = await executeAutoScheduleFetch.fetchData(() =>
      fetchByReactivated<interfaces.QtExecuteAutoSchedule>(
        reverse("survey_worker:qt_execute_auto_schedule"),
        context.csrf_token,
        "POST",
        new URLSearchParams({
          rep_id: selectedRepId.toString(),
          service_order_ids: serviceOrderIds.join(","),
          dates: dateKeys.join(","),
        }),
        "application/x-www-form-urlencoded"
      )
    );

    if (!isSuccess) {
      errorToasts.showError("Failed to auto-schedule service orders", errorMessages);
      return;
    }

    if (!result.success) {
      alert(`Failed to auto-schedule service orders: ${result.error_message}`);
      return;
    }

    setAutoScheduleSelectedSoIds(new Set());
    setAutoScheduleSelectedDates([]);
    setIsAutoScheduleMode(false);

    // the server computed the actual assignment - refetch rather than guessing it locally;
    // force-bypass the cache/freshness-delta since we just mutated the schedule server-side
    await fetchScheduleForRep(selectedRepId, true);

    if (result.unscheduled_service_order_ids.length > 0) {
      alert(
        `${result.unscheduled_service_order_ids.length} service order(s) could not be ` +
          `auto-scheduled because they didn't fit within the selected dates' remaining ` +
          `capacity: ${result.unscheduled_service_order_ids.join(", ")}`
      );
    }
  }

  async function handleExecuteBulkUnschedule() {
    if (selectedRepId === null || bulkUnscheduleSelectedDates.length === 0) {
      return;
    }

    const dateKeys = bulkUnscheduleSelectedDates.map((date) => toDateKey(date));

    if (
      !confirm(
        `This will unschedule every physical-visit service order on ${dateKeys.length} ` +
          `selected date(s) and may take a while depending on how many there are. Continue?`
      )
    ) {
      return;
    }

    const [isSuccess, result, errorMessages] = await executeBulkUnscheduleFetch.fetchData(() =>
      fetchByReactivated<interfaces.QtExecuteBulkUnschedule>(
        reverse("survey_worker:qt_execute_bulk_unschedule"),
        context.csrf_token,
        "POST",
        new URLSearchParams({
          rep_id: selectedRepId.toString(),
          dates: dateKeys.join(","),
        }),
        "application/x-www-form-urlencoded"
      )
    );

    if (!isSuccess) {
      errorToasts.showError("Failed to bulk-unschedule service orders", errorMessages);
      return;
    }

    setBulkUnscheduleSelectedDates([]);
    setIsBulkUnscheduleMode(false);

    // the server unscheduled whatever it could - refetch rather than guessing it locally;
    // force-bypass the cache/freshness-delta since we just mutated the schedule server-side
    await fetchScheduleForRep(selectedRepId, true);

    const failures = result.results.filter((r) => !r.success);
    if (result.aborted_early || failures.length > 0) {
      alert(
        (result.aborted_early
          ? "Bulk-unschedule stopped early after too many consecutive failures. "
          : "") +
          (failures.length > 0
            ? `${failures.length} service order(s) failed to unschedule: ${failures
                .map((f) => f.service_order_id)
                .join(", ")}`
            : "")
      );
    }
  }

  const isTodayAllowed = React.useMemo(() => {
    if (schedule === null) {
      return false;
    }

    const todayKey = toDateKey(new Date());
    return schedule.AllowSchedulingDates.some((isoStr) => toDateKey(new Date(isoStr)) === todayKey);
  }, [schedule]);

  // the furthest-out due date across all SOs caps how far ahead the calendar allows selection
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

    const [isSuccess, result, errorMessages] = await clearScheduledDateFetch.fetchData(() =>
      fetchByReactivated<interfaces.QtClearScheduledDate>(
        reverse("survey_worker:qt_clear_scheduled_date"),
        context.csrf_token,
        "POST",
        new URLSearchParams({
          rep_id: selectedRepId.toString(),
          service_order_ids: serviceOrderIds.join(","),
        }),
        "application/x-www-form-urlencoded"
      )
    );

    if (!isSuccess) {
      errorToasts.showError("Failed to clear date", errorMessages);
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
      <ToastContainer
        position="top-end"
        containerPosition="fixed"
        className="p-3"
        style={{ zIndex: 1100 }}
      >
        <Toast
          show={context.user.is_superuser && scheduleFreshnessToast?.show === true}
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
              : "Fetched fresh schedule data."}
          </Toast.Body>
        </Toast>

        <ErrorToastStack toasts={errorToasts.toasts} onDismiss={errorToasts.dismiss} />
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
        <Alert variant="danger" className="d-flex">
          <FontAwesomeIcon icon={faTriangleExclamation} className="fs-3 me-3 flex-shrink-0" />
          <div>
            <Alert.Heading as="h4" className="fw-bold">
              Failed to fetch schedule
            </Alert.Heading>
            <ListGroup variant="flush" className="mb-2">
              {fetchRepSchedule.errorMessages.map((message, idx) => (
                <ListGroup.Item key={idx} variant="danger" className="px-0 py-1 border-0">
                  {message}
                </ListGroup.Item>
              ))}
            </ListGroup>
            <hr />
            <p className="mb-0">
              Try refreshing the page, or select a different rep from the dropdown above.
            </p>
          </div>
        </Alert>
      )}

      {selectedRepId !== null && schedule !== null && (
        <div className="row g-4">
          <div className="col-md-5">
            <Card>
              <Card.Header className="bg-secondary text-white d-flex align-items-center justify-content-between">
                <span>{unscheduledServiceOrders.length} Unscheduled Service Orders</span>
                <div className="d-flex align-items-center gap-2">
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={() => setShowJobClientFilter(true)}
                  >
                    <FontAwesomeIcon icon={faFilter} className="me-1" />
                    Filter
                  </Button>
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
                </div>
              </Card.Header>
              <div className="px-3 pt-3 d-flex align-items-center justify-content-end">
                {isAutoScheduleMode && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted small text-nowrap">
                      {autoScheduleSelectedSoIds.size}/{visibleUnscheduledSoIds.size} currently
                      selected
                    </span>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() =>
                        setAutoScheduleSelectedSoIds(
                          (current) => new Set([...current, ...visibleUnscheduledSoIds])
                        )
                      }
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() =>
                        setAutoScheduleSelectedSoIds(
                          (current) =>
                            new Set([...current].filter((id) => !visibleUnscheduledSoIds.has(id)))
                        )
                      }
                    >
                      Deselect All
                    </Button>
                  </div>
                )}
              </div>
              <ListGroup variant="flush">
                {unscheduledServiceOrders.length === 0 && (
                  <ListGroup.Item className="text-muted">
                    No unscheduled service orders.
                  </ListGroup.Item>
                )}
                <AnimatePresence initial={false}>
                  {groupedUnscheduledServiceOrders.map((so) => (
                    <UnscheduledServiceOrderListItem
                      key={so.ServiceOrderId}
                      so={so}
                      checkbox={
                        isAutoScheduleMode ? (
                          <Form.Check
                            type="checkbox"
                            checked={autoScheduleSelectedSoIds.has(so.ServiceOrderId)}
                            onChange={() => toggleAutoScheduleSoSelected(so.ServiceOrderId)}
                          />
                        ) : undefined
                      }
                      action={
                        isAutoScheduleMode ? null : (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={
                              selectedDate === undefined || scheduleServiceOrderFetch.isLoading
                            }
                            className="text-nowrap"
                            style={{ width: "9.5rem" }}
                            onClick={() =>
                              selectedDate !== undefined &&
                              handleScheduleServiceOrder(so, selectedDate)
                            }
                          >
                            {selectedDate !== undefined
                              ? `Schedule on ${formatShortDate(selectedDate)}`
                              : "Select a date"}
                          </Button>
                        )
                      }
                    />
                  ))}
                </AnimatePresence>
              </ListGroup>
            </Card>
          </div>

          <div className="col-md-7">
            <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-sm-between gap-2 mb-2">
              <div className="d-flex align-items-center flex-wrap gap-3">
                <Form.Check
                  type="checkbox"
                  id="swap-jobs-checkbox"
                  label="Swap Jobs"
                  checked={isSwapMode}
                  disabled={isAutoScheduleMode || isBulkUnscheduleMode}
                  onChange={(event) => {
                    setIsSwapMode(event.target.checked);
                    setSwapSelectedDates([]);
                  }}
                />
                {unscheduledServiceOrders.length > 0 && (
                  <Form.Check
                    type="checkbox"
                    id="enable-auto-scheduling-checkbox"
                    label="Enable Auto-Scheduling"
                    checked={isAutoScheduleMode}
                    disabled={isBulkUnscheduleMode || isSwapMode}
                    onChange={(event) => {
                      const isChecked = event.target.checked;
                      setIsAutoScheduleMode(isChecked);
                      setAutoScheduleSelectedSoIds(new Set());
                      setAutoScheduleSelectedDates([]);
                      if (isChecked) {
                        setIsSwapMode(false);
                        setSwapSelectedDates([]);
                        setIsBulkUnscheduleMode(false);
                        setBulkUnscheduleSelectedDates([]);
                        setSelectedDate(undefined);
                      }
                    }}
                  />
                )}
                <Form.Check
                  type="checkbox"
                  id="enable-bulk-unschedule-checkbox"
                  label="Enable Bulk-Unschedule"
                  checked={isBulkUnscheduleMode}
                  disabled={isAutoScheduleMode || isSwapMode}
                  onChange={(event) => {
                    const isChecked = event.target.checked;
                    setIsBulkUnscheduleMode(isChecked);
                    setBulkUnscheduleSelectedDates([]);
                    if (isChecked) {
                      setSelectedDate(undefined);
                    }
                  }}
                />
              </div>
              <div className="d-flex align-items-center flex-wrap gap-2 mt-2">
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
                {isAutoScheduleMode && (
                  <ButtonWithSpinner
                    type="button"
                    className={classNames("btn btn-primary btn-sm", {
                      disabled:
                        (autoScheduleSelectedSoIds.size === 0 ||
                          autoScheduleSelectedDates.length === 0) &&
                        !executeAutoScheduleFetch.isLoading,
                    })}
                    fetchState={executeAutoScheduleFetch}
                    spinnerVariant="dark"
                    onClick={() => void handleExecuteAutoSchedule()}
                  >
                    Execute Auto-Schedule for Selected
                  </ButtonWithSpinner>
                )}
                {isBulkUnscheduleMode && (
                  <ButtonWithSpinner
                    type="button"
                    className={classNames("btn btn-danger btn-sm", {
                      disabled:
                        bulkUnscheduleSelectedDates.length === 0 &&
                        !executeBulkUnscheduleFetch.isLoading,
                    })}
                    fetchState={executeBulkUnscheduleFetch}
                    spinnerVariant="dark"
                    onClick={() => void handleExecuteBulkUnschedule()}
                  >
                    Execute Bulk-Unschedule
                  </ButtonWithSpinner>
                )}
              </div>
            </div>

            {isSwapMode && (
              <Alert variant="warning" className="mb-0 py-2 rounded-bottom-0">
                <div className="mb-1">
                  Select two calendar dates to swap all physical-visit service orders between them,
                  then click &quot;Execute Swap&quot;.
                </div>
                <strong>({swapSelectedDates.length}/2 dates selected)</strong>
              </Alert>
            )}

            {isAutoScheduleMode && (
              <Alert variant="warning" className="mb-0 py-2 rounded-bottom-0">
                <div className="mb-1">
                  Check off service orders in the Unscheduled list below, then pick one or more
                  dates on the calendar. Clicking &quot;Execute Auto-Schedule for Selected&quot;
                  will automatically assign the selected service orders to those dates.
                </div>
                <strong>
                  {autoScheduleSelectedSoIds.size} SO(s), {autoScheduleSelectedDates.length} date(s)
                  selected
                </strong>
              </Alert>
            )}

            {isBulkUnscheduleMode && (
              <Alert variant="warning" className="mb-0 py-2 rounded-bottom-0">
                <div>
                  Select one or more calendar dates to unschedule every physical-visit service order
                  currently scheduled on them, then click &quot;Execute Bulk-Unschedule&quot;.
                </div>
                <strong>({bulkUnscheduleSelectedDates.length} date(s) selected)</strong>
              </Alert>
            )}

            <ScheduleCalendarGrid
              isTodayAllowed={isTodayAllowed}
              maxSelectableDate={maxSelectableDate}
              selectedDate={selectedDate}
              daySummaries={daySummaries}
              onSelectDate={setSelectedDate}
              swapMode={isSwapMode}
              swapSelectedDates={swapSelectedDates}
              onSelectSwapDates={(dates) => setSwapSelectedDates(dates ?? [])}
              autoScheduleMode={isAutoScheduleMode}
              autoScheduleSelectedDates={autoScheduleSelectedDates}
              onSelectAutoScheduleDates={(dates) => setAutoScheduleSelectedDates(dates ?? [])}
              bulkUnscheduleMode={isBulkUnscheduleMode}
              bulkUnscheduleSelectedDates={bulkUnscheduleSelectedDates}
              onSelectBulkUnscheduleDates={(dates) => setBulkUnscheduleSelectedDates(dates ?? [])}
            />

            {!isSwapMode &&
              !isBulkUnscheduleMode &&
              selectedDateKey !== null &&
              selectedDate !== undefined && (
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
                        serviceOrdersForSelectedDate.length === 0 ||
                        clearScheduledDateFetch.isLoading
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
                    <AnimatePresence initial={false}>
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
                    </AnimatePresence>
                  </ListGroup>
                </Card>
              )}
          </div>
        </div>
      )}

      <JobClientFilterModal
        show={showJobClientFilter}
        onHide={() => setShowJobClientFilter(false)}
        jobClients={allJobClients}
        selectedJobClients={selectedJobClients}
        onChange={setSelectedJobClients}
      />
    </Layout>
  );
}
