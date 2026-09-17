# Research: Stock, ingresos y ajustes

**Date**: 2026-09-17

## Decision

Ledger inmutable y balance materializado en la misma transacción. La reconciliación audita suma de deltas; no triggers opacos para la lógica de negocio.

## Rationale

Conocer existencias por unidad o gramos, registrar reposición, mermas y conteos, y señalar productos con poco stock. El flujo es local y comparte reglas de dinero e inventario con el
resto del proyecto, evitando dos fuentes distintas de cálculo.

## Alternatives considered

Un campo editable stock no permite explicar faltantes; event sourcing completo es innecesario.

## Evidence and practical limits

[Arquitectura y documentación primaria](../../docs/arquitectura.md#fuentes-verificadas).
[Scanner y balanza](../../docs/scanner-y-peso.md#fuentes-primarias).
No hay benchmarks medidos, app implementada ni scanner físico probado todavía.
La fuente de verdad de negocio son los requisitos de esta spec y el modelo común.
