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
    'exports.products': `SELECT name AS "Producto",sku AS "Código interno",barcode AS "Código de barras",internal_barcode AS "Código generado",category AS "Categoría",
      CASE sale_unit WHEN 'KG' THEN 'Kilogramo' ELSE 'Unidad' END AS "Venta por",
      REPLACE(printf('%.2f',price_cents/100.0),'.',',') AS "Precio (ARS)",
      CASE active WHEN 1 THEN 'Activo' ELSE 'Inactivo' END AS "Estado"
      FROM products WHERE substr(updated_at_utc,1,10)>=? AND substr(updated_at_utc,1,10)<=?
      ORDER BY search_name,name,id LIMIT ? OFFSET ?`,
    'exports.sales': `SELECT number AS "Venta",business_date AS "Fecha",CASE status WHEN 'COMPLETED' THEN 'Completada' ELSE 'Anulada' END AS "Estado",
      REPLACE(printf('%.2f',subtotal_cents/100.0),'.',',') AS "Subtotal (ARS)",REPLACE(printf('%.2f',discount_cents/100.0),'.',',') AS "Descuento (ARS)",REPLACE(printf('%.2f',total_cents/100.0),'.',',') AS "Total (ARS)",
      actor_name AS "Vendedor",terminal_id AS "Terminal",register_shift_id AS "Turno" FROM sale_orders WHERE business_date>=? AND business_date<=? ORDER BY business_date,number LIMIT ? OFFSET ?`,
    'exports.stock':
      'SELECT sequence AS "Movimiento",product_id AS "Producto",delta_base AS "Cambio",balance_after_base AS "Existencia luego",kind AS "Tipo",reason AS "Motivo",business_date AS "Fecha" FROM stock_movements WHERE business_date>=? AND business_date<=? ORDER BY sequence LIMIT ? OFFSET ?',
    'exports.sale-items': `SELECT s.number AS "Venta",s.business_date AS "Fecha",s.status AS "Estado",i.position + 1 AS "Renglón",i.sku AS "Código interno",i.barcode AS "Código de barras",i.name AS "Producto",
      CASE i.unit WHEN 'KG' THEN 'Kilogramo' ELSE 'Unidad' END AS "Venta por",i.quantity_base AS "Cantidad base",REPLACE(printf('%.2f',i.unit_price_cents/100.0),'.',',') AS "Precio unitario (ARS)",REPLACE(printf('%.2f',i.discount_cents/100.0),'.',',') AS "Descuento (ARS)",REPLACE(printf('%.2f',i.net_cents/100.0),'.',',') AS "Importe neto (ARS)"
      FROM sale_order_items i JOIN sale_orders s ON s.id=i.sale_id WHERE s.business_date>=? AND s.business_date<=? ORDER BY s.business_date,s.number,i.position LIMIT ? OFFSET ?`,
    'exports.shifts': `SELECT substr(rs.opened_at_utc,1,19) AS "Apertura",substr(rs.closed_at_utc,1,19) AS "Cierre",t.name AS "Terminal",rs.status AS "Estado",
      REPLACE(printf('%.2f',rs.opening_cash_cents/100.0),'.',',') AS "Fondo inicial (ARS)",REPLACE(printf('%.2f',COALESCE(rs.expected_cash_cents,0)/100.0),'.',',') AS "Esperado (ARS)",REPLACE(printf('%.2f',COALESCE(rs.counted_cash_cents,0)/100.0),'.',',') AS "Contado (ARS)",REPLACE(printf('%.2f',COALESCE(rs.difference_cents,0)/100.0),'.',',') AS "Diferencia (ARS)"
      FROM register_shifts rs JOIN terminals t ON t.id=rs.terminal_id WHERE substr(rs.opened_at_utc,1,10)>=? AND substr(rs.opened_at_utc,1,10)<=? ORDER BY rs.opened_at_utc,rs.id LIMIT ? OFFSET ?`,
    'exports.purchases': `SELECT p.number AS "Compra",p.business_date AS "Fecha",p.supplier_name AS "Proveedor",
      CASE p.status WHEN 'RECEIVED' THEN 'Recibida' ELSE 'Anulada' END AS "Estado",
      REPLACE(printf('%.2f',p.total_cents/100.0),'.',',') AS "Total (ARS)",p.actor_name AS "Registrada por",
      COUNT(i.id) AS "Productos"
      FROM purchases p LEFT JOIN purchase_items i ON i.purchase_id=p.id
      WHERE p.business_date>=? AND p.business_date<=?
      GROUP BY p.id ORDER BY p.business_date,p.number LIMIT ? OFFSET ?`,
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
