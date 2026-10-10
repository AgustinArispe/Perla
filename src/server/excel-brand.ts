import type ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function brandWorkbook(
  book: ExcelJS.Workbook,
  details: { title: string; business: string; scope: string; rows: number },
) {
  book.creator = 'Perla';
  book.title = `${details.title} · ${details.business}`;
  const cover = book.addWorksheet('Perla', { views: [{ showGridLines: false }] });
  cover.columns = [
    { width: 4 },
    { width: 18 },
    { width: 4 },
    { width: 27 },
    { width: 24 },
    { width: 24 },
    { width: 4 },
  ];
  for (let row = 1; row <= 20; row++) cover.getRow(row).height = 24;
  const logo = book.addImage({
    buffer: readFileSync(join(__dirname, 'assets/perla-symbol.png')) as never,
    extension: 'png',
  });
  cover.addImage(logo, { tl: { col: 1, row: 1 }, ext: { width: 94, height: 94 } });
  cover.mergeCells('D2:F3');
  cover.getCell('D2').value = 'Perla';
  cover.getCell('D2').font = { name: 'Calibri', size: 32, bold: true, color: { argb: 'FF152B36' } };
  cover.getCell('D2').alignment = { vertical: 'middle' };
  cover.mergeCells('D4:F4');
  cover.getCell('D4').value = 'Tu negocio en orden';
  cover.getCell('D4').font = { name: 'Calibri', size: 13, color: { argb: 'FF795824' } };
  cover.mergeCells('B7:F8');
  cover.getCell('B7').value = details.title;
  cover.getCell('B7').font = { name: 'Calibri', size: 24, bold: true, color: { argb: 'FFFFFFFF' } };
  cover.getCell('B7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF152B36' } };
  cover.getCell('B7').alignment = { vertical: 'middle', indent: 1, wrapText: true };
  const rows = [
    ['Comercio', details.business],
    [
      'Generado',
      new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
    ],
    ['Alcance', details.scope],
    ['Filas de información', details.rows],
  ];
  rows.forEach(([label, value], index) => {
    const row = index + 11;
    cover.mergeCells(`B${row}:C${row}`);
    cover.getCell(`B${row}`).value = label;
    cover.getCell(`B${row}`).font = {
      name: 'Calibri',
      size: 12,
      bold: true,
      color: { argb: 'FF795824' },
    };
    cover.mergeCells(`D${row}:F${row}`);
    cover.getCell(`D${row}`).value = value;
    cover.getCell(`D${row}`).font = { name: 'Calibri', size: 12, color: { argb: 'FF152B36' } };
    cover.getCell(`D${row}`).alignment = { wrapText: true, vertical: 'middle' };
    cover.getRow(row).height = index === 2 ? 42 : 28;
  });
  cover.mergeCells('B17:F18');
  cover.getCell('B17').value =
    'Las hojas siguientes contienen los datos exportados. Los filtros y el alcance se conservan para facilitar su revisión.';
  cover.getCell('B17').font = { name: 'Calibri', size: 11, color: { argb: 'FF596970' } };
  cover.getCell('B17').alignment = { wrapText: true, vertical: 'middle' };
  cover.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    printArea: 'A1:G20',
  };
}
export function styleExcelSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }];
  sheet.getRow(1).height = 30;
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF152B36' } };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FFB38B47' } } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    row.height = 24;
    row.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF152B36' } };
      cell.alignment = { vertical: 'middle' };
      if (index % 2 === 0)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F4ED' } };
    });
  });
  sheet.pageSetup = {
    paperSize: 9,
    orientation: sheet.columnCount > 6 ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: '1:1',
  };
  sheet.headerFooter = {
    oddHeader: '&LPerla · Gestión para tu comercio',
    oddFooter: '&LPerla&R Página &P de &N',
  };
}
