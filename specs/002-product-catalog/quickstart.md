# Quickstart Validation: Catálogo y carga inicial de productos

**Estado**: estos comandos son de la futura implementación. Hoy no existe
package.json ni los tests; no se reportan como ejecutados.

## Prerequisites

001 implementada, Node 24 LTS, npm install según lockfile y dependencias de esta
feature entregadas. Usar DB temporal de pruebas, nunca la DB real del comercio.
Para desktop/scanner: instalador buildado y Windows 11 con scanner configurado.

## Commands and expected behavior

### Parsear 12.000,50 ARS con formato de importación explícito a 1200050 centavos y mantener 0123456789012 como texto.
```powershell
npx vitest run tests/unit/product-validation.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/unit/product-validation.test.ts`.
### Un duplicado en fila 1500 revierte el lote; repetir hash aplicado no duplica productos.
```powershell
npx vitest run tests/integration/catalog-import.test.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/integration/catalog-import.test.ts`.
### Editar precio, desactivar y buscar código/nombre con teclado; comprobar que el inactivo desaparece de Caja.
```powershell
npx playwright test tests/e2e/product-search.spec.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/e2e/product-search.spec.ts`.

## Manual acceptance

1. Administrar un producto: El catálogo cambia, las ventas anteriores conservan sus datos y el inactivo no se agrega a nuevas ventas.
2. Encontrar productos rápidamente: Se encuentra el artículo correcto con su precio y presentación.
3. Cargar el catálogo de forma segura: Se indican filas y motivos; no se aplica una carga parcialmente inválida.

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
