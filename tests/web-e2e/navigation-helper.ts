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
  Usuarios: ['Configuración', 'Usuarios'],
  Configuración: ['Configuración', 'Configuración'],
  Actividad: ['Configuración', 'Actividad'],
  Backups: ['Configuración', 'Copias'],
  Agenda: ['Cobros y pagos'],
};

/** Exercise the same visible navigation that an operator uses. */
export async function openModule(page: Page, destination: string) {
  const [group, area] = destinations[destination] ?? [destination];
  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await nav.waitFor({ state: 'attached' });
  if (!(await nav.isVisible()))
    await page.getByRole('button', { name: 'Expandir menú', exact: true }).click();
  if (!(await nav.getByRole('button', { name: group, exact: true }).isVisible())) {
    // Collapsed groups omit their links; match the section from the destination.
    const sectionTitle = ['Inicio', 'Caja', 'Ventas'].includes(group)
      ? 'Trabajo diario'
      : ['Productos', 'Stock', 'Compras', 'Ubicaciones'].includes(group)
        ? 'Mercadería'
        : group === 'Configuración'
          ? 'Administración'
          : 'Negocio';
    const compactSection = nav.getByRole('button', {
      name: `Abrir sección ${sectionTitle}`,
      exact: true,
    });
    if (await compactSection.isVisible()) await compactSection.click();
    else
      await nav
        .getByRole('button', { name: `Desplegar sección ${sectionTitle}`, exact: true })
        .click();
  }
  await nav.getByRole('button', { name: group, exact: true }).click();
  if (area) {
    const tabs = page.locator(`main [aria-label="Áreas de ${group}"]`);
    await expect(tabs).toBeVisible();
    await tabs.getByRole('button', { name: area, exact: true }).click();
  }
}
