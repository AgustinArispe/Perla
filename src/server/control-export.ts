import ExcelJS from 'exceljs';
import { DomainError } from '../shared/errors';
import { brandWorkbook, styleExcelSheet } from './excel-brand';
import { previewExportRows, selectExportRows } from './export-selection';
type Sheet = { name: string; columns: string[]; rows: (unknown[] | Record<string, unknown>)[] };
export function previewControlExcel(
  raw: unknown,
  page: { sheet: number; offset: number; limit: number },
) {
  const value = raw as { sheets: Sheet[] };
  return previewExportRows(
    value.sheets.filter((sheet) => sheet.name !== 'Filtros'),
    'control',
    page,
  );
}
export async function controlExcel(raw: unknown, selection?: string[], business = '') {
  const value = raw as { title?: string; sheets?: Sheet[] };
  if (!Array.isArray(value?.sheets) || !value.sheets.length)
    throw new DomainError('VALIDATION', 'No hay datos para exportar.');
  const book = new ExcelJS.Workbook();
  const data = selectExportRows(
    value.sheets.filter((sheet) => sheet.name !== 'Filtros'),
    'control',
    selection,
  );
  const sheets = [...data, ...value.sheets.filter((sheet) => sheet.name === 'Filtros')];
  brandWorkbook(book, {
    title: value.title ?? data[0]?.name ?? 'Información del comercio',
    business,
    scope: selection
      ? 'Solo filas elegidas dentro de los filtros aplicados'
      : 'Todos los resultados de los filtros aplicados',
    rows: data.reduce((n, s) => n + s.rows.length, 0),
  });
  book.created = new Date();
  let total = 0;
  for (const sheet of sheets) {
    total += sheet.rows.length;
    if (total > 50000)
      throw new DomainError('VALIDATION', 'Acotá los filtros a menos de 50.000 filas.');
    const ws = book.addWorksheet(sheet.name.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31));
    ws.addRow(sheet.columns);
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203B47' } };
    ws.getRow(1).height = 28;
    for (const row of sheet.rows)
      ws.addRow(
        (Array.isArray(row) ? row : sheet.columns.map((k) => row[k])).map((v) =>
          typeof v === 'string' && /^[=+@-]/.test(v) ? "'" + v : (v ?? null),
        ),
      );
    ws.columns.forEach((col, i) => {
      col.width = Math.min(48, Math.max(18, (sheet.columns[i]?.length ?? 14) + 4));
    });
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: ws.rowCount, column: sheet.columns.length },
    };
    styleExcelSheet(ws);
  }
  return {
    filename: `Perla-${new Date().toISOString().slice(0, 10)}.xlsx`,
    base64: Buffer.from(await book.xlsx.writeBuffer()).toString('base64'),
  };
}
