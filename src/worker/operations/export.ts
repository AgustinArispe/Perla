import type Database from 'better-sqlite3';
import { DomainError } from '../../shared/errors';
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function exportCsv(
  db: Database.Database,
  operation: string,
  input: { fromDate: string; toDate: string; limit: number; offset: number },
) {
  const queries: Record<string, string> = {
    'exports.products':
      'SELECT id,sku,barcode,name,category,sale_unit,price_cents,active,revision FROM products WHERE substr(updated_at_utc,1,10)>=? AND substr(updated_at_utc,1,10)<=? ORDER BY id LIMIT ? OFFSET ?',
    'exports.sales':
      'SELECT number,status,business_date,subtotal_cents,discount_cents,total_cents,actor_name,terminal_id,register_shift_id FROM sales WHERE business_date>=? AND business_date<=? ORDER BY number LIMIT ? OFFSET ?',
    'exports.stock':
      'SELECT sequence,product_id,delta_base,balance_after_base,kind,reason,business_date FROM stock_movements WHERE business_date>=? AND business_date<=? ORDER BY sequence LIMIT ? OFFSET ?',
  };
  const sql = queries[operation];
  if (!sql) throw new DomainError('VALIDATION', 'La exportación no existe.');
  const stmt = db.prepare(sql);
  const columns = stmt.columns().map((c) => c.name);
  const rows = stmt.all(input.fromDate, input.toDate, input.limit, input.offset) as Record<
    string,
    unknown
  >[];
  return {
    filename: operation.slice(8) + '-' + input.fromDate + '-' + input.toDate + '.csv',
    mimeType: 'text/csv; charset=utf-8',
    content:
      '\uFEFF' +
      [
        columns.map(csvCell).join(';'),
        ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(';')),
      ].join('\r\n') +
      '\r\n',
  };
}
