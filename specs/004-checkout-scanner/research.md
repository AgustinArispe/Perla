# Research: Caja rápida y scanner USB

**Date**: 2026-09-17

## Decision

State machine de foco, ScanQueue y carrito Zustand; importes derivados del módulo puro de dominio compartido con backend.

## Rationale

Operar el carrito con scanner y teclado, controlar el foco y aplicar descuentos sin perder ni duplicar lecturas. El flujo es local y comparte reglas de dinero e inventario con el
resto del proyecto, evitando dos fuentes distintas de cálculo.

## Alternatives considered

Polling de focus y detección exclusiva por intervalo de teclas fallan durante edición; captura global HID/SDK fuera de v1.

## Evidence and practical limits

[Arquitectura y documentación primaria](../../docs/arquitectura.md#fuentes-verificadas).
[Scanner y balanza](../../docs/scanner-y-peso.md#fuentes-primarias).
No hay benchmarks medidos, app implementada ni scanner físico probado todavía.
La fuente de verdad de negocio son los requisitos de esta spec y el modelo común.
