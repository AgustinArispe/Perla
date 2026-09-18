import { MonthSchema } from '../../shared/reports';
const days = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
export function monthPeriods(raw: string, now = new Date()) {
  const month = MonthSchema.parse(raw);
  const [y, m] = month.split('-').map(Number) as [number, number];
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const open = today.slice(0, 7) === month;
  const day = open ? Number(today.slice(8)) : days(y, m);
  const py = m === 1 ? y - 1 : y,
    pm = m === 1 ? 12 : m - 1;
  const previous = `${String(py).padStart(4, '0')}-${String(pm).padStart(2, '0')}`;
  return {
    from: `${month}-01`,
    to: `${month}-${String(day).padStart(2, '0')}`,
    previousFrom: `${previous}-01`,
    previousTo: `${previous}-${String(open ? Math.min(day, days(py, pm)) : days(py, pm)).padStart(2, '0')}`,
    open,
  };
}
