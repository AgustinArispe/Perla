# Research: Ventas, medios de pago e histórico

**Date**: 2026-09-17

## Decision

Sales service coordinador transaccional y snapshots; historial paginado por cursor; anulación como evento con motivo y contramovimientos.

## Rationale

Confirmar cobro, registrar venta y stock atómicamente, conservar precios históricos y permitir consulta/anulación trazable. El flujo es local y comparte reglas de dinero e inventario con el
resto del proyecto, evitando dos fuentes distintas de cálculo.

## Alternatives considered

Guardar detalles después de cabecera permitiría ventas parciales; tabla payment_method única impediría pagos mixtos.

## Evidence and practical limits

[Arquitectura y documentación primaria](../../docs/arquitectura.md#fuentes-verificadas).
[Scanner y balanza](../../docs/scanner-y-peso.md#fuentes-primarias).
No hay benchmarks medidos, app implementada ni scanner físico probado todavía.
La fuente de verdad de negocio son los requisitos de esta spec y el modelo común.
