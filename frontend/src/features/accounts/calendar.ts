export function calendarDays(month: string, weekStartsOn: 0|1 = 0) {
  const [year, number] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const offset = (first.getUTCDay() - weekStartsOn + 7) % 7;
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const date = new Date(Date.UTC(year, number - 1, index - offset + 1));
    return { key: date.toISOString().slice(0,10), day: date.getUTCDate(), current: date.getUTCMonth() === number - 1 };
  });
}
export function shiftMonth(month: string, offset: number) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year,number-1+offset,1)).toISOString().slice(0,7);
}
