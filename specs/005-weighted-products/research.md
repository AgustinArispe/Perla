# Research: Fiambres y calculadora de peso

**Date**: 2026-09-17

## Decision

Gramos enteros, precio/kg en centavos y parseo decimal explícito. Componente modal con inputMode decimal según unidad seleccionada.

## Rationale

Vender fiambres y otros productos por kilo ingresando el peso real, calculando importe y descontando gramos de stock. El flujo es local y comparte reglas de dinero e inventario con el
resto del proyecto, evitando dos fuentes distintas de cálculo.

## Alternatives considered

Número decimal de kg almacenado como REAL introduce imprecisiones; inferir peso de precio altera stock.

## Evidence and practical limits

[Arquitectura y documentación primaria](../../docs/arquitectura.md#fuentes-verificadas).
[Scanner y balanza](../../docs/scanner-y-peso.md#fuentes-primarias).
No hay benchmarks medidos, app implementada ni scanner físico probado todavía.
La fuente de verdad de negocio son los requisitos de esta spec y el modelo común.
