# Research: Dashboard mensual y ayuda para reposición

**Date**: 2026-09-17

## Decision

Agregaciones SQL parametrizadas y DTO único MonthlyReport; consultas independientes dentro de una lectura coherente; gráficos sobrios y tabla accionable.

## Rationale

Mostrar cuánto se vendió, productos destacados, efectivo frente a tarjeta y existencias bajas con recomendaciones comprensibles. El flujo es local y comparte reglas de dinero e inventario con el
resto del proyecto, evitando dos fuentes distintas de cálculo.

## Alternatives considered

Traer todas las ventas al browser bloquea y complica conciliación; ranking único de cantidades mezclaría gramos y artículos.

## Evidence and practical limits

[Arquitectura y documentación primaria](../../docs/arquitectura.md#fuentes-verificadas).
[Scanner y balanza](../../docs/scanner-y-peso.md#fuentes-primarias).
No hay benchmarks medidos, app implementada ni scanner físico probado todavía.
La fuente de verdad de negocio son los requisitos de esta spec y el modelo común.
