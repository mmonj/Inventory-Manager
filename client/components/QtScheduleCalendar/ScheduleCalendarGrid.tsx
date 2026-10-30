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
} from "@client/util/qtSurveyWorker/calendarMode";
import { formatTotalHours, toDateKey } from "@client/util/qtSurveyWorker/scheduleUtils";
import { TDaySummary } from "@client/util/qtSurveyWorker/scheduleView";

type TDateSelectionAction = Extract<TCalendarModeAction, { type: "selectDate" | "selectDates" }>;

interface Props {
  /** Drives only the green highlight, in every mode. It never decides what can be picked. */
  isDateSchedulable: (date: Date) => boolean;
  isDatePickable: (date: Date) => boolean;
  daySummaries: Map<string, TDaySummary>;
  calendarMode: TCalendarMode;
  onSelectDates: (action: TDateSelectionAction) => void;
}

export function ScheduleCalendarGrid(props: Props) {
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
    disabled: (date: Date) => !props.isDatePickable(date),
    modifiers: { selectable: props.isDateSchedulable },
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
