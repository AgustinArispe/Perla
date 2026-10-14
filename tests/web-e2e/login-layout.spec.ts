import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`contraseña editable y botón Mostrar proporcionado a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const password = page.getByLabel('Contraseña', { exact: true });
    const toggle = page.getByRole('button', { name: 'Mostrar contraseña' });
    await expect(password).toBeVisible();
    const inputBox = await password.boundingBox();
    const buttonBox = await toggle.boundingBox();
    expect(inputBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(inputBox!.width).toBeGreaterThan(150);
    expect(buttonBox!.width).toBeLessThan(120);
    expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(buttonBox!.x);
    await password.click();
    await page.keyboard.type('Prueba-Web-Bocha-2026!');
    await expect(password).toHaveValue('Prueba-Web-Bocha-2026!');
    await toggle.click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('textbox', { name: 'Usuario', exact: true }).fill('jefe');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ingresar al sistema' })).toHaveCount(0);
  });
}
