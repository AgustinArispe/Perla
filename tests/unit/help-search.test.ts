import { describe, expect, it } from 'vitest';
import { matchesHelpSearch } from '../../src/renderer/features/help/search';

describe('búsqueda de ayuda por vocabulario del comercio', () => {
  it('encuentra el lector por scanner, escáner o pistola', () => {
    const article = 'Escanear y buscar. El lector USB funciona como un teclado.';
    for (const term of ['scanner', 'escáner', 'pistola', 'lector', 'SCANNER USB']) {
      expect(matchesHelpSearch(article, term), term).toBe(true);
    }
  });
  it('encuentra cuenta corriente por fiar o fiado', () => {
    for (const term of ['fiar', 'fiado', 'cuenta corriente']) {
      expect(matchesHelpSearch('Clientes y cuenta corriente. Límite de crédito.', term)).toBe(true);
    }
  });
  it('combina términos sin depender de su orden y conserva búsquedas distintas', () => {
    expect(matchesHelpSearch('El lector USB envía Enter.', 'usb scanner')).toBe(true);
    expect(matchesHelpSearch('Stock y vencimientos', 'scanner')).toBe(false);
    expect(matchesHelpSearch('Stock y vencimientos', '')).toBe(true);
    expect(matchesHelpSearch('Cantidad y código de barras', 'CODIGO')).toBe(true);
  });
  it('normaliza órdenes, remitos, depósitos y copias, sin confundir OC con stock', () => {
    expect(matchesHelpSearch('Órdenes para caja', 'orden caja')).toBe(true);
    expect(matchesHelpSearch('Remitos internos entre depósitos', 'albarán almacén')).toBe(true);
    expect(matchesHelpSearch('Copias semanales', 'backups')).toBe(true);
    expect(matchesHelpSearch('Stock y productos', 'OC')).toBe(false);
    expect(matchesHelpSearch('OC: orden de cliente', 'oc')).toBe(true);
  });
});
