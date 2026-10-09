import { ComparisonRequestSchema, type ComparisonRequest } from '../../shared/reports';

const argentinaDate = (now: Date) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
const parseDate = (value: string) => new Date(`${value}T12:00:00Z`);
const formatDate = (value: Date) => value.toISOString().slice(0, 10);
const addDays = (value: string, delta: number) => {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + delta);
  return formatDate(date);
};

export function comparisonPeriods(raw: ComparisonRequest, now = new Date()) {
  const input = ComparisonRequestSchema.parse(raw);
  const today = argentinaDate(now);
  let from: string;
  let to: string;
  if (input.preset === 'CUSTOM') {
    from = input.from!;
    to = input.to!;
  } else {
    to = today;
    if (input.preset === 'TODAY') from = today;
    else if (input.preset === 'MONTH') from = `${today.slice(0, 7)}-01`;
    else {
      const day = parseDate(today).getUTCDay();
      from = addDays(today, -(day === 0 ? 6 : day - 1));
    }
  }
  const duration = Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000) + 1;
  if (duration < 1 || duration > 366) throw new Error('El rango debe tener entre 1 y 366 días.');
  return {
    from,
    to,
    previousFrom: addDays(from, -duration),
    previousTo: addDays(from, -1),
  };
}

