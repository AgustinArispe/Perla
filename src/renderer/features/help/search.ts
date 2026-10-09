export const normalizeHelpSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\b(scanner|escaner|pistola|lector)\b/g, 'escanear')
    .replace(/\b(fiar|fiado)\b/g, 'cuenta');

export function matchesHelpSearch(text: string, query: string): boolean {
  const content = normalizeHelpSearch(text);
  return normalizeHelpSearch(query).trim().split(/\s+/).every((term) => content.includes(term));
}
