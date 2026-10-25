import { describe, expect, it } from 'vitest';
import {
  helpTopics,
  helpTopicsForRole,
  searchHelpTopics,
} from '../../src/renderer/features/help/topics';

describe('ayuda operativa actualizada', () => {
  it('mantiene identificadores únicos y contenido para cada tema', () => {
    expect(new Set(helpTopics.map((t) => t.id)).size).toBe(helpTopics.length);
    for (const topic of helpTopics) {
      expect(topic.sections.length).toBeGreaterThan(0);
      expect(new Set(topic.sections.map((s) => s.title)).size).toBe(topic.sections.length);
      for (const section of topic.sections) expect(section.text.trim().length).toBeGreaterThan(30);
    }
  });
  it('el vendedor encuentra preparación y cobro sin recibir instrucciones de administración', () => {
    const topics = helpTopicsForRole('SELLER');
    expect(topics.map((t) => t.id)).toEqual(
      expect.arrayContaining(['caja', 'ordenes-caja', 'comprobantes', 'problemas']),
    );
    expect(topics.map((t) => t.id)).not.toEqual(
      expect.arrayContaining(['administracion', 'backups', 'remitos']),
    );
    const orders = topics.find((t) => t.id === 'ordenes-caja')!;
    expect(orders.sections.map((s) => s.title)).toContain('Recuperar y cobrar la orden');
    expect(orders.sections.map((s) => s.title)).not.toContain(
      'Activar o desactivar la preparación',
    );
    expect(topics.find((t) => t.id === 'clientes')?.sections.map((s) => s.title)).not.toContain(
      'Registrar un cobro',
    );
  });
  it('supervisor y jefe ven instrucciones acordes a sus permisos', () => {
    const supervisor = helpTopicsForRole('SUPERVISOR');
    expect(supervisor.find((t) => t.id === 'remitos')).toBeDefined();
    expect(supervisor.find((t) => t.id === 'remitos')?.sections.map((s) => s.title)).not.toContain(
      'Apagar internos y conservar otros circuitos',
    );
    expect(supervisor.find((t) => t.id === 'backups')).toBeUndefined();
    expect(
      helpTopicsForRole('OWNER')
        .find((t) => t.id === 'remitos')
        ?.sections.map((s) => s.title),
    ).toContain('Apagar internos y conservar otros circuitos');
    expect(helpTopicsForRole('ADMIN')).toEqual(helpTopicsForRole('OWNER'));
  });
  it.each(['ordenes para caja', 'ÓRDENES PARA CAJA', 'pedido especialista', 'OC'])(
    'encuentra el circuito preparado al buscar %s',
    (query) => {
      expect(searchHelpTopics('SELLER', query).map((t) => t.id)).toContain('ordenes-caja');
    },
  );
  it('encuentra remitos internos y explica su desactivación independiente', () => {
    expect(searchHelpTopics('SUPERVISOR', 'almacén').map((t) => t.id)).toContain('ubicaciones');
    const topic = searchHelpTopics('OWNER', 'remitos internos').find((t) => t.id === 'remitos');
    expect(topic).toBeDefined();
    expect(topic?.sections.some((s) => s.text.includes('Apagar internos no desactiva'))).toBe(true);
    expect(searchHelpTopics('SELLER', 'albarán').map((t) => t.id)).not.toContain('remitos');
  });
  it('busca respaldos semanales con vocabulario habitual y no los expone al vendedor', () => {
    expect(searchHelpTopics('OWNER', 'backups sábados').map((t) => t.id)).toContain('backups');
    expect(searchHelpTopics('OWNER', 'respaldos semanales').map((t) => t.id)).toContain('backups');
    expect(searchHelpTopics('SELLER', 'backups sábados')).toEqual([]);
  });
  it('conserva la búsqueda puntual de caja y no muestra artículos vacíos', () => {
    const topics = searchHelpTopics('OWNER', 'vuelto');
    expect(topics.find((t) => t.id === 'caja')?.sections.map((s) => s.title)).toEqual([
      'Descuentos y cobro',
    ]);
    expect(
      searchHelpTopics('OWNER', 'caja scanner')
        .find((t) => t.id === 'caja')
        ?.sections.map((s) => s.title),
    ).toEqual(['Escanear y buscar']);
    for (const topic of searchHelpTopics('OWNER', 'función historial'))
      expect(topic.sections.length).toBeGreaterThan(0);
    expect(searchHelpTopics('OWNER', 'zzzinexistente999')).toEqual([]);
  });
  it('distingue documentos internos de factura fiscal sin prometer ARCA', () => {
    const sections = helpTopicsForRole('SELLER').find((t) => t.id === 'comprobantes')!.sections;
    expect(sections.some((s) => s.text.includes('todavía no emite facturas fiscales'))).toBe(true);
  });
});
