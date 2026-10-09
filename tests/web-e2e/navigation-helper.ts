import { expect, type Page } from '@playwright/test';

const destinations: Record<string, [string, string?]> = {
  'Resumen mensual': ['Resultados', 'Mensual'],
  'Resumen semanal': ['Resultados', 'Semanal'],
  Controles: ['Stock', 'Conteos'],
  Reposición: ['Stock', 'Reponer'],
  Revisión: ['Productos', 'Revisión'],
  Proveedores: ['Compras', 'Proveedores'],
  Histórico: ['Ventas', 'Historial'],
  Comprobantes: ['Ventas', 'Comprobantes'],
  Usuarios: ['Administración', 'Usuarios'],
  Configuración: ['Administración', 'Configuración'],
  Actividad: ['Administración', 'Actividad'],
  Backups: ['Administración', 'Copias'],
  Agenda: ['Cobros y pagos'],
};

/** Exercise the same visible navigation that an operator uses. */
export async function openModule(page: Page, destination: string) {
  const [group, area] = destinations[destination] ?? [destination];
  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await nav.waitFor({ state: 'attached' });
  if (!(await nav.isVisible()))
    await page.getByRole('button', { name: 'Expandir menú', exact: true }).click();
  await nav.getByRole('button', { name: group, exact: true }).click();
  if (area) {
    const tabs = page.locator(`main > [aria-label="Áreas de ${group}"]`);
    await expect(tabs).toBeVisible();
    await tabs.getByRole('button', { name: area, exact: true }).click();
  }
}
