import { openModule } from './navigation-helper';
import { test, expect } from '@playwright/test';

test('web real: recibe una compra y conserva su detalle histórico', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();

  await openModule(page, 'Configuración');
  await page.getByRole('tab', { name: 'Funciones', exact: true }).click();
  await page.getByRole('switch', { name: 'Proveedores y compras' }).click();
  await page.getByRole('switch', { name: 'Cuenta de proveedores' }).click();
  await page.getByRole('switch', { name: 'Costos y rentabilidad' }).click();
  await page.getByRole('button', { name: 'Aplicar cambios' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar cambios' }).click();
  await expect(page.getByRole('switch', { name: 'Proveedores y compras' })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  await openModule(page, 'Productos');
  await page.getByRole('button', { name: /Nuevo producto/ }).click();
  await page.getByLabel('Nombre del producto').fill('Langostinos congelados');
  await page.getByLabel('Forma de venta').selectOption('KG');
  await page.getByLabel('Precio de venta').fill('1800,00');
  await page.getByLabel('Código de barras').fill('7799999000001');
  await page.getByText('Más opciones', { exact: true }).click();
  await page.getByLabel('Controlar stock').uncheck();
  await page.getByLabel('Costo de referencia (por kilo)').fill('850,00');
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const referenceCost = await page.evaluate(async () => {
    const products = await (
      await fetch('/api/v1/products?query=Langostinos%20congelados&limit=20')
    ).json();
    return (await (await fetch(`/api/v1/products/${products.value.items[0].id}/cost`)).json())
      .value;
  });
  expect(referenceCost).toMatchObject({ method: 'REFERENCE', unitCostCents: 85000 });

  await openModule(page, 'Compras');
  await openModule(page, 'Proveedores');
  await page.getByRole('button', { name: 'Nuevo proveedor' }).click();
  await page.getByRole('dialog').getByLabel('Nombre').fill('Puerto del Sur');
  await page.getByRole('button', { name: 'Guardar proveedor' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  await openModule(page, 'Compras');
  await page.getByRole('button', { name: 'Recibir', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Compras', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Proveedor', exact: true }).fill('Puerto del Sur');
  await expect(
    page.getByRole('listbox', { name: 'Proveedor', exact: true }).getByRole('option'),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Proveedor', exact: true }).press('Enter');
  await expect(
    page.locator('.supplier-picker').getByRole('button', { name: 'Cambiar', exact: true }),
  ).toBeFocused();
  const scanner = page.getByPlaceholder('Escanear código + Enter');
  await scanner.fill('7799999000001');
  await scanner.press('Enter');
  await expect(page.locator('.purchase-lines')).toContainText('Langostinos congelados');
  await page.getByLabel('Costo por kg').fill('900,00');
  await page.getByLabel('Costo por kg').blur();
  await expect(page.locator('.purchase-save-state')).toContainText('Borrador guardado');
  await page.reload();
  await openModule(page, 'Compras');
  await page.getByRole('button', { name: 'Recibir', exact: true }).click();
  await expect(page.locator('.purchase-lines')).toContainText('Langostinos congelados');
  await expect(page.locator('.supplier-picker')).toContainText('Puerto del Sur');
  await expect(page.getByRole('button', { name: 'Recibir compra' })).toBeEnabled();
  await page.getByRole('button', { name: 'Recibir compra' }).click();
  await expect(page.locator('.notice')).toContainText('recibida');

  await openModule(page, 'Proveedores');
  const supplierCard = page.locator('.supplier-card').filter({ hasText: 'Puerto del Sur' });
  await supplierCard.getByRole('button', { name: /Saldo/ }).click();
  await expect(page.getByRole('dialog')).toContainText('$ 900,00');
  await page.getByRole('button', { name: 'Registrar pago' }).click();
  await expect(page.getByRole('button', { name: 'Registrar pago', exact: true })).toHaveCount(0);
  await expect(page.locator('.commerce-allocation-summary')).toContainText('$ 900,00');
  await page.getByRole('button', { name: 'Confirmar pago' }).click();
  await expect(page.getByRole('dialog')).toContainText('Pago registrado');
  await expect(page.getByRole('dialog')).toContainText('$ 0,00');
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();

  await openModule(page, 'Compras');
  await page.getByRole('button', { name: 'Historial' }).click();
  await page.getByRole('button', { name: /Puerto del Sur/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Langostinos congelados');
  await expect(page.getByRole('dialog')).toContainText('$ 900,00');
  await page.getByLabel('Motivo de anulación').fill('Carga duplicada de prueba');
  await page.getByRole('button', { name: 'Anular compra' }).click();
  await expect(page.getByRole('dialog')).toContainText('Anulada por');
  await expect(page.getByRole('dialog')).toContainText('Carga duplicada de prueba');
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
  await openModule(page, 'Proveedores');
  await supplierCard.getByRole('button', { name: /Saldo/ }).click();
  await expect(page.getByRole('dialog')).toContainText('A nuestro favor');
  await expect(page.getByRole('dialog')).toContainText('$ 900,00');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
