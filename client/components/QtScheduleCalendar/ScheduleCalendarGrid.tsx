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
  schedulableDateKeys: Set<string>;
  selectedDate: Date | undefined;
  daySummaries: Map<string, ICalendarDaySummary>;
  onSelectDate: (date: Date | undefined) => void;
  swapMode: boolean;
  swapSelectedDates: Date[];
  onSelectSwapDates: (dates: Date[] | undefined) => void;
  autoScheduleMode: boolean;
  autoScheduleSelectedDates: Date[];
  onSelectAutoScheduleDates: (dates: Date[] | undefined) => void;
  bulkUnscheduleMode: boolean;
  bulkUnscheduleSelectedDates: Date[];
  onSelectBulkUnscheduleDates: (dates: Date[] | undefined) => void;
}

const SUNDAY_DAY_OF_WEEK = 0;

export function ScheduleCalendarGrid(props: Props) {
  // Whether the date isn't in the past - the one floor every mode shares. Today has its own
  // eligibility rule (the service's own same-day cutoff) instead of the plain date comparison.
  function isNotInPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = toDateKey(date) === toDateKey(today);
    return isToday ? props.isTodayAllowed : date >= today;
  }

  // Purely informational: does at least one visible Unscheduled SO's window cover this day.
  // Drives only the green "selectable" highlight, in every mode - it's a signal, not a
  // selection gate, so it never affects whether the date can actually be clicked.
  function isSchedulable(date: Date): boolean {
    return isNotInPast(date) && props.schedulableDateKeys.has(toDateKey(date));
  }

  // Whether the date can actually be selected/clicked. Single-select, Swap Jobs, and
  // Bulk-Unschedule all need non-green dates selectable too - you might pick an earlier date
  // with nothing new schedulable on it specifically to view/unschedule/swap what's already
  // there. Auto-Schedule is the one mode that's genuinely only about placing new unscheduled
  // work, so it alone is restricted to schedulable (and non-Sunday, per the backend's
  // get_auto_schedule_dates_error) dates.
  function isSelectable(date: Date): boolean {
    if (!isNotInPast(date)) {
      return false;
    }

    if (props.autoScheduleMode) {
      return props.schedulableDateKeys.has(toDateKey(date)) && date.getDay() !== SUNDAY_DAY_OF_WEEK;
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
      <Card.Body className="d-flex justify-content-center overflow-x-auto">
        <div className="w-100" style={{ maxWidth: "calc(var(--rdp-cell-size) * 7)" }}>
          {props.swapMode ? (
            <DayPicker
              mode="multiple"
              max={2}
              selected={props.swapSelectedDates}
              onSelect={props.onSelectSwapDates}
              disabled={(date) => !isSelectable(date)}
              modifiers={{ selectable: isSchedulable }}
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
              disabled={(date) => !isSelectable(date)}
              modifiers={{ selectable: isSchedulable }}
              modifiersClassNames={{ selectable: "qt-day-selectable" }}
              components={{ DayContent: renderDayContent }}
              showOutsideDays
              fixedWeeks
            />
          ) : props.bulkUnscheduleMode ? (
            <DayPicker
              mode="multiple"
              selected={props.bulkUnscheduleSelectedDates}
              onSelect={props.onSelectBulkUnscheduleDates}
              disabled={(date) => !isSelectable(date)}
              modifiers={{ selectable: isSchedulable }}
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
              disabled={(date) => !isSelectable(date)}
              modifiers={{ selectable: isSchedulable }}
              modifiersClassNames={{ selectable: "qt-day-selectable" }}
              components={{ DayContent: renderDayContent }}
              showOutsideDays
              fixedWeeks
            />
          )}
        </div>
      </Card.Body>
    </Card>
  );
}

export type { ICalendarDaySummary };
