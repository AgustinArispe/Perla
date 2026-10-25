import { expect, type Page } from '@playwright/test';
import { navigation } from '../../src/renderer/navigation';

/** Navigate through the same authorized sidebar controls used by the operator. */
export async function openModule(page: Page, destination: string) {
  const preferred = destination === 'Controles' ? 'Conteos' : undefined;
  const entry =
    navigation.find((item) =>
      item.areas.some(
        ([target, label]) => target === destination && (!preferred || label === preferred),
      ),
    ) ?? navigation.find((item) => item.title === destination);
  if (!entry) throw new Error('Destino sin navegación: ' + destination);
  const area =
    entry.areas.find(
      ([target, label]) => target === destination && (!preferred || label === preferred),
    ) ?? entry.areas[0]!;
  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await nav.waitFor({ state: 'attached' });
  if (!(await nav.isVisible()))
    await page.getByRole('button', { name: 'Expandir menú', exact: true }).click();
  const parent = nav.getByRole('button', { name: entry.title, exact: true });
  if (!(await parent.isVisible())) {
    const compact = nav.getByRole('button', { name: 'Abrir sección ' + entry.group, exact: true });
    if (await compact.isVisible()) await compact.click();
    else
      await nav
        .getByRole('button', { name: 'Desplegar sección ' + entry.group, exact: true })
        .click();
  }
  await parent.click();
  const options = nav.getByRole('button', {
    name: 'Ocultar opciones de ' + entry.title,
    exact: true,
  });
  if (await options.isVisible()) {
    const child = nav.getByRole('button', { name: entry.title + ': ' + area[1], exact: true });
    if (await nav.isVisible()) await child.click();
    else {
      // Mobile closes the drawer when the parent opens its default area.
      const tabs = page.locator('main [aria-label="Áreas de ' + entry.title + '"]');
      await expect(tabs).toBeVisible();
      await tabs.getByRole('button', { name: area[1], exact: true }).click();
    }
  } else if (entry.areas.length > 1 && area !== entry.areas[0]) {
    const tabs = page.locator('main [aria-label="Áreas de ' + entry.title + '"]');
    if (await tabs.isVisible())
      await tabs.getByRole('button', { name: area[1], exact: true }).click();
  }
}
