import React from "react";

import { Card } from "react-bootstrap";
import {
  DayContentProps,
  DayPicker,
  DayPickerMultipleProps,
  DayPickerSingleProps,
} from "react-day-picker";

import {
  TCalendarMode,
  TCalendarModeAction,
  getDatePickerSelection,
  isDatePickable,
} from "@client/util/qtSurveyWorker/calendarMode";
import { formatTotalHours, toDateKey } from "@client/util/qtSurveyWorker/scheduleUtils";

interface ICalendarDaySummary {
  serviceOrderCount: number;
  totalHours: number;
}

type TDateSelectionAction = Extract<TCalendarModeAction, { type: "selectDate" | "selectDates" }>;

interface Props {
  isTodayAllowed: boolean;
  schedulableDateKeys: Set<string>;
  daySummaries: Map<string, ICalendarDaySummary>;
  calendarMode: TCalendarMode;
  onSelectDates: (action: TDateSelectionAction) => void;
}

export function ScheduleCalendarGrid(props: Props) {
  // Whether the date isn't in the past - the one floor every mode shares. Today has its own
  // eligibility rule (the service's own same-day cutoff) instead of the plain date comparison.
  function isNotInPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = toDateKey(date) === toDateKey(today);
    return isToday ? props.isTodayAllowed : date >= today;
  }

  // Purely informational: does at least one Unscheduled SO's window cover this day (after the
  // Job Client filter and search, but not narrowed to the picked auto-schedule dates).
  // Drives only the green "selectable" highlight, in every mode - it's a signal, not a
  // selection gate, so it never affects whether the date can actually be clicked.
  function isSchedulable(date: Date): boolean {
    return isNotInPast(date) && props.schedulableDateKeys.has(toDateKey(date));
  }

  function isSelectable(date: Date): boolean {
    return isDatePickable(props.calendarMode, {
      date,
      isPast: !isNotInPast(date),
      isSchedulable: props.schedulableDateKeys.has(toDateKey(date)),
    });
  }

  function renderDayContent(dayProps: DayContentProps) {
    const summary = props.daySummaries.get(toDateKey(dayProps.date));

    return (
      <div
        className="d-flex flex-column align-items-start justify-content-start h-100 w-100"
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

  const datePickerSelection = getDatePickerSelection(props.calendarMode);
  const selectionProps: DayPickerSingleProps | DayPickerMultipleProps =
    datePickerSelection.mode === "single"
      ? {
          mode: "single",
          selected: datePickerSelection.selected,
          onSelect: (date) => props.onSelectDates({ type: "selectDate", date }),
        }
      : {
          mode: "multiple",
          selected: datePickerSelection.selected,
          max: datePickerSelection.max,
          onSelect: (dates) => props.onSelectDates({ type: "selectDates", dates: dates ?? [] }),
        };
  const sharedDayPickerProps = {
    disabled: (date: Date) => !isSelectable(date),
    modifiers: { selectable: isSchedulable },
    modifiersClassNames: { selectable: "qt-day-selectable" },
    components: { DayContent: renderDayContent },
    showOutsideDays: true,
    fixedWeeks: true,
  };

  return (
    <Card className="qt-schedule-calendar">
      <Card.Body className="d-flex justify-content-center overflow-x-auto">
        <div className="w-100" style={{ maxWidth: "calc(var(--rdp-cell-size) * 7)" }}>
          <DayPicker {...selectionProps} {...sharedDayPickerProps} />
        </div>
      </Card.Body>
    </Card>
  );
}

export type { ICalendarDaySummary };
