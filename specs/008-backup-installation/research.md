# Research: Backups, instalación y mantenimiento

**Date**: 2026-09-17

## Decision

Snapshot SQLite y manifest en paquete ZIP, validación y swap con conexiones cerradas. Electron builder NSIS; prueba temprana del binding nativo.

## Rationale

Entregar una aplicación instalable, proteger datos con respaldos validados y mantenerla sin exigir conocimientos técnicos al comercio. El flujo es local y comparte reglas de dinero e inventario con el
resto del proyecto, evitando dos fuentes distintas de cálculo.

## Alternatives considered

Copiar .db vivo pierde datos en WAL; backup sólo en misma PC no protege fallo de disco. Firma de instalador depende certificado y se gestiona en release.

## Evidence and practical limits

[Arquitectura y documentación primaria](../../docs/arquitectura.md#fuentes-verificadas).
[Scanner y balanza](../../docs/scanner-y-peso.md#fuentes-primarias).
No hay benchmarks medidos, app implementada ni scanner físico probado todavía.
La fuente de verdad de negocio son los requisitos de esta spec y el modelo común.
