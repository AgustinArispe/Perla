# Implementation Plan: Costos y rentabilidad comprensible

**Branch**: `feature/web-frontend` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

## Summary

Agregar un libro de costos por producto y fotografías inmutables en `sale_items`. Las compras con stock actualizan el promedio ponderado dentro de su transacción; Productos mantiene referencias manuales para artículos sin stock. El informe mensual agrega margen y cobertura con consultas SQL enteras, y el frontend lo presenta en dashboard, detalle de venta y reporte imprimible.

## Technical Context

- TypeScript strict, React/Vite, Fastify/worker, SQLite STRICT.
- Tasas: microcentavos por unidad base (`UNIT`: unidad; `KG`: gramo).
- Redondeo: división entera al más cercano, empates hacia arriba.
- Persistencia: migración 015; estado actual, eventos append-only y snapshots en venta.
- Seguridad: mantenimiento para supervisor/jefe/admin; tablero sólo jefe/admin.

## Components

1. `domain/costs.ts`: conversiones, promedio y costo de renglón sin floats.
2. `worker/costs/service.ts`: estado vigente, referencia manual, actualización por compra y reversión segura.
3. `sales/service.ts`: snapshot atómico de costo al confirmar.
4. `reports/queries.ts`: agregados de rentabilidad y cobertura.
5. Contratos/API/UI: edición compacta y tarjetas de margen.

## Verification

- Unitarias para matemática y límites.
- Integración SQLite para compra → ventas → nueva compra → anulación.
- Permisos/API y backup/restore.
- Playwright de referencia manual y dashboard responsive.
