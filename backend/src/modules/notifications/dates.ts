export const DAY_MS = 86_400_000;
/** A Brazilian civil day, stored as a UTC date marker (not a shifted due date). */
export function businessDay(instant = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return new Date(`${part('year')}-${part('month')}-${part('day')}`);
}
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
