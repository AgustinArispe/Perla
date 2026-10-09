# Implementation Plan: Precios y promociones automáticas

**Branch**: `feature/web-frontend` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

## Strategy

Dos cortes compatibles. Primero, lotes de precios con preview, revisiones e idempotencia. Segundo, promociones versionadas con un motor puro y determinista compartido por vista previa y confirmación. La Caja conserva respuesta local inmediata y obtiene cotización autoritativa antes de cobrar.

## Data design

- `price_change_batches`, `price_change_items` y eventos inmutables.
- `promotions`, versiones, objetivos por producto/categoría/marca y componentes de combo.
- `sale_promotions` y asignaciones por renglón para guardar nombre, versión, cantidad consumida y ahorro.
- `business_features.PROMOTIONS`, apagada inicialmente.

## Calculation boundary

1. Resolver reglas vigentes una vez para los productos del carrito mediante índices.
2. Generar aplicaciones posibles con cantidades disponibles.
3. Ordenar por prioridad, ahorro y clave estable; consumir cantidades sin superposición.
4. Prorratear cada ahorro con resto determinista.
5. Aplicar descuento manual como alternativa, validar pagos y guardar fotografía histórica en una transacción.

## UX

- Acción `Actualizar precios` desde Productos con filtro, selección y preview antes/después.
- Módulo Promociones con Activas, Programadas y Finalizadas; alta en tres bloques cortos.
- Caja muestra etiqueta de oferta y `Ahorrás` sin agregar campos al cajero.
- En celular, formularios de una columna y resumen fijo antes de confirmar.

## Verification

TDD del motor, conflictos e importes; integración con venta/devolución/reportes/backup; rendimiento con 4.000 productos; web real en escritorio y 360 px; módulo apagado.
