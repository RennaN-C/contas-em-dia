export const DAY_MS = 86_400_000;
/** Same civil UTC dates as accounts; never use host-local date arithmetic. */
export function utcDay(now = new Date()): Date {
  return new Date(now.toISOString().slice(0, 10));
}
export function addDays(date: Date, days: number): Date {
  return new Date(utcDay(date).getTime() + days * DAY_MS);
}
export function weekStart(now = new Date()): Date {
  const day = utcDay(now);
  return addDays(day, -((day.getUTCDay() + 6) % 7));
}
