import { createHash } from 'node:crypto';
import { DomainError } from '../shared/errors';
import type { ExcelPreview } from '../shared/excel';
import { formatMoney } from '../domain/values';

export interface ExportSheet {
  name: string;
  columns: string[];
  rows: (unknown[] | Record<string, unknown>)[];
}
function cells(sheet: ExportSheet, row: ExportSheet['rows'][number]) {
  return Array.isArray(row) ? row : sheet.columns.map((column) => row[column.split('|')[0]!]);
}
function keyed(sheets: ExportSheet[], source: string) {
  const total = sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
  if (total > 50000)
    throw new DomainError('VALIDATION', 'Acotá los filtros a menos de 50.000 filas.');
  return sheets.map((sheet) => {
    const occurrences = new Map<string, number>();
    return sheet.rows.map((row) => {
      const values = cells(sheet, row);
      const identity = Array.isArray(row) ? null : [row.id, row.productId, row.locationId];
      const content = JSON.stringify([source, sheet.name, identity, values]);
      const occurrence = occurrences.get(content) ?? 0;
      occurrences.set(content, occurrence + 1);
      return {
        row,
        values,
        key: createHash('sha256').update(content).update(String(occurrence)).digest('hex'),
      };
    });
  });
}
export function selectExportRows<T extends ExportSheet>(
  sheets: T[],
  source: string,
  selection?: string[],
): T[] {
  const rows = keyed(sheets, source);
  if (!selection) return sheets;
  const wanted = new Set(selection);
  const found = new Set<string>();
  const result = sheets.map((sheet, index) => ({
    ...sheet,
    rows: rows[index]!.filter((item) => {
      if (!wanted.has(item.key)) return false;
      found.add(item.key);
      return true;
    }).map((item) => item.row),
  }));
  if (found.size !== wanted.size)
    throw new DomainError(
      'VALIDATION',
      'Algunas filas cambiaron o ya no coinciden con los filtros. Volvé a revisar la selección.',
    );
  return result.filter((sheet) => sheet.rows.length) as T[];
}
export function previewExportRows(
  sheets: ExportSheet[],
  source: string,
  page: { sheet: number; offset: number; limit: number },
  initialIds: string[] = [],
): ExcelPreview {
  const rows = keyed(sheets, source);
  const sheet = sheets[page.sheet];
  if (!sheet) throw new DomainError('VALIDATION', 'La hoja elegida no existe.');
  const initial = new Set(initialIds);
  return {
    sheets: sheets.map((sheet) => ({ name: sheet.name, total: sheet.rows.length })),
    sheet: page.sheet,
    columns: sheet.columns.map((column) => column.split('|')[1] ?? column),
    total: sheet.rows.length,
    suggestedSelection: rows.flatMap((items) =>
      items
        .filter(({ row }) => !Array.isArray(row) && initial.has(String(row.id ?? row.productId)))
        .map(({ key }) => key),
    ),
    items: rows[page.sheet]!.slice(page.offset, page.offset + page.limit).map(
      ({ row, values, key }) => ({
        key,
        cells: values.map((value, index) => {
          if (value === null || value === undefined) return '—';
          const type = sheet.columns[index]?.split('|')[2];
          if (type === 'money') return formatMoney(Number(value));
          if (type === 'percent') return `${(Number(value) / 100).toLocaleString('es-AR')} %`;
          if (
            type === 'quantity' &&
            !Array.isArray(row) &&
            (row.unit === 'KG' || row.saleUnit === 'KG')
          )
            return `${Number(value) / 1000} kg`;
          if (typeof value === 'boolean') return value ? 'Sí' : 'No';
          if (value === 'UNIT') return 'Unidad';
          if (value === 'KG') return 'Kilogramo';
          return String(value);
        }),
      }),
    ),
  };
}
