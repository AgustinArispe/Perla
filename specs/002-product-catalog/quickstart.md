# Quickstart Validation: Catálogo y carga inicial de productos

**Estado**: comandos disponibles y pruebas ejecutadas para el catálogo. [Evidencia](../../docs/entrega-01-catalogo.md).

## Prerequisites

Base 001 disponible, Node 24 LTS y `npm run setup` según lockfile. Usar DB temporal de pruebas, nunca la DB real del comercio.
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
### Editar precio, desactivar y buscar con teclado; comprobar que la consulta de activos excluye el inactivo.
```powershell
npm run build
npx playwright test tests/e2e/product-search.spec.ts
```
Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `tests/e2e/product-search.spec.ts`.

## Manual acceptance

Las ventas históricas, el carrito de Caja y los movimientos de stock todavía no
están implementados. La aceptación que cruza esos módulos queda pendiente.

1. Administrar un producto: El catálogo cambia, las ventas anteriores conservan sus datos y el inactivo no se agrega a nuevas ventas.
2. Encontrar productos rápidamente: Se encuentra el artículo correcto con su precio y presentación.
3. Cargar el catálogo de forma segura: Se indican filas y motivos; no se aplica una carga parcialmente inválida.

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
