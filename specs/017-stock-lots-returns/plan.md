# Implementation Plan: Stock, lotes y devoluciones

**Branch**: `feature/web-frontend` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

## Strategy

Implementar en dos cortes compatibles. Primero, devoluciones parciales y motivos operativos sobre el stock actual. Segundo, lotes optativos y asignación FEFO. Así la lógica financiera queda estable antes de agregar selección física por lote.

## Data design

- `sale_returns`, `sale_return_items`, `sale_return_refunds` y eventos inmutables.
- vínculo opcional desde `stock_movements` y `cash_movements` a la devolución.
- `inventory_lots`, `lot_movements` y `sale_item_lots` para trazabilidad.
- saldo global sigue siendo la autoridad durante la transición; un producto reconciliado exige igualdad con sus lotes.

## Transaction boundaries

1. Validar venta, cantidades acumuladas, permisos, turno y revisiones.
2. Crear devolución e ítems con prorrateo determinista.
3. Registrar reintegro y salida de efectivo si corresponde.
4. Registrar destino de stock y reversión proporcional de costo.
5. Confirmar todo junto o revertir todo.

## UX

- Acciones de stock separadas y con verbos: Ingresar, Merma, Consumo, Contar.
- Devolución desde el detalle de venta, con selección de renglones y un resumen fijo.
- Lotes aparecen sólo si la función y el producto están habilitados.
- Formularios de una columna en celular, máximo cinco decisiones visibles por sección.

## Verification

- TDD para prorrateo y límites acumulados.
- Integración para transacción venta/stock/caja/costo.
- Concurrencia e idempotencia de devoluciones.
- Lotes FEFO, vencidos y reconciliación.
- Backup/restore, roles, función apagada y Playwright responsive.
