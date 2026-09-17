# Quickstart Validation: Backups, instalación y mantenimiento

**Estado**: estos comandos son de la futura implementación. Hoy no existe
package.json ni los tests; no se reportan como ejecutados.

## Prerequisites

001 implementada, Node 24 LTS, npm install según lockfile y dependencias de esta
feature entregadas. Usar DB temporal de pruebas, nunca la DB real del comercio.
Para desktop/scanner: instalador buildado y Windows 11 con scanner configurado.

## Commands and expected behavior

### Rechazar hash alterado y schema superior; nombre de entrada ZIP no puede escapar del staging.
```powershell
npx vitest run tests/unit/backup-manifest.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/unit/backup-manifest.test.ts`.
### Generar snapshot con WAL activo, restaurar y conciliar todas las tablas; simular fallo al reabrir y recuperar previo.
```powershell
npx vitest run tests/integration/backup-restore.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/integration/backup-restore.test.ts`.
### Instalar, vender offline, actualizar y abrir histórico en máquina limpia; validar scanner físico y backup externo.
```powershell
npx playwright test tests/e2e/installed-app.spec.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/e2e/installed-app.spec.ts`.

## Manual acceptance

1. Guardar un respaldo externo: El archivo es consistente, verificable y la app muestra éxito sólo tras validar.
2. Recuperar la información: Se guarda respaldo previo, se restaura y la app reinicia con datos consistentes.
3. Instalar y actualizar sin perder datos: El acceso directo funciona y la base conserva productos, stock, ventas y pagos.

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
