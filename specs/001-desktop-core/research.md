# Research: Base de escritorio y persistencia

**Date**: 2026-09-17

## Decision

Electron con preload limitado y worker para SQL. SQL explícito en SQLite, driver better-sqlite3; rebuild nativo y Windows son parte de la prueba inicial.

## Rationale

Abrir la aplicación local, mantener datos entre reinicios y preparar operaciones de negocio sin bloquear Caja. El flujo es local y comparte reglas de dinero e inventario con el
resto del proyecto, evitando dos fuentes distintas de cálculo.

## Alternatives considered

Tauri agrega Rust/WebView2; Next.js y FastAPI agregan procesos que no necesitamos en una PC.

## Evidence and practical limits

[Arquitectura y documentación primaria](../../docs/arquitectura.md#fuentes-verificadas).
[Scanner y balanza](../../docs/scanner-y-peso.md#fuentes-primarias).
No hay benchmarks medidos, app implementada ni scanner físico probado todavía.
La fuente de verdad de negocio son los requisitos de esta spec y el modelo común.
