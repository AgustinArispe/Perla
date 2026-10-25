export const normalizeHelpSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\b(scanner|escaner|pistola|lector)\b/g, 'escanear')
    .replace(/\b(fiar|fiado)\b/g, 'cuenta')
    .replace(/\b(orden|ordenes)\b/g, 'orden')
    .replace(/\b(remito|remitos|albaran|albaranes)\b/g, 'remito')
    .replace(/\b(deposito|depositos|almacen|almacenes)\b/g, 'deposito')
    .replace(/\b(backup|backups|respaldo|respaldos|copias)\b/g, 'copia')
    .replace(/\b(facturas)\b/g, 'factura');

export function matchesHelpSearch(text: string, query: string): boolean {
  const content = normalizeHelpSearch(text);
  const words = new Set(content.split(/[^\p{L}\p{N}]+/u));
  return normalizeHelpSearch(query)
    .trim()
    .split(/\s+/)
    .every((term) =>
      term.length > 0 && term.length <= 2 ? words.has(term) : content.includes(term),
    );
}
