import React from "react";

import { Card } from "react-bootstrap";
import { DayContentProps, DayPicker } from "react-day-picker";

import { formatTotalHours, toDateKey } from "@client/util/qtSurveyWorker/scheduleUtils";

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
  swapMode: boolean;
  swapSelectedDates: Date[];
  onSelectSwapDates: (dates: Date[] | undefined) => void;
  autoScheduleMode: boolean;
  autoScheduleSelectedDates: Date[];
  onSelectAutoScheduleDates: (dates: Date[] | undefined) => void;
}

const SUNDAY_DAY_OF_WEEK = 0;

export function ScheduleCalendarGrid(props: Props) {
  function isAllowed(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (props.maxSelectableDate === null || date > props.maxSelectableDate) {
      return false;
    }

    const isBaseAllowed =
      toDateKey(date) === toDateKey(today) ? props.isTodayAllowed : date > today;
    if (!isBaseAllowed) {
      return false;
    }

    // auto-scheduling is never allowed on Sundays - mirrors the backend's
    // get_auto_schedule_dates_error check
    if (props.autoScheduleMode && date.getDay() === SUNDAY_DAY_OF_WEEK) {
      return false;
    }

    return true;
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
        {props.swapMode ? (
          <DayPicker
            mode="multiple"
            max={2}
            selected={props.swapSelectedDates}
            onSelect={props.onSelectSwapDates}
            disabled={(date) => !isAllowed(date)}
            modifiers={{ selectable: isAllowed }}
            modifiersClassNames={{ selectable: "qt-day-selectable" }}
            components={{ DayContent: renderDayContent }}
            showOutsideDays
            fixedWeeks
          />
        ) : props.autoScheduleMode ? (
          <DayPicker
            mode="multiple"
            selected={props.autoScheduleSelectedDates}
            onSelect={props.onSelectAutoScheduleDates}
            disabled={(date) => !isAllowed(date)}
            modifiers={{ selectable: isAllowed }}
            modifiersClassNames={{ selectable: "qt-day-selectable" }}
            components={{ DayContent: renderDayContent }}
            showOutsideDays
            fixedWeeks
          />
        ) : (
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
        )}
      </Card.Body>
    </Card>
  );
}

export type { ICalendarDaySummary };
