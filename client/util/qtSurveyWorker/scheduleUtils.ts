export function formatJobTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = (minutes / 60).toFixed(1);
  return `${hours} hr${parseFloat(hours) !== 1 ? "s" : ""}`;
}

export function formatDateRange(start: string, end: string): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startDate = new Date(start).toLocaleDateString(undefined, options);
  const endDate = new Date(end).toLocaleDateString(undefined, options);
  return `${startDate} - ${endDate}`;
}
