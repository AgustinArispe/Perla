# Research: Catálogo y carga inicial de productos

**Date**: 2026-09-17

## Decision

Repositorio SQL con normalización de búsqueda y caché invalidada tras guardar/importar. PreviewImport usa token asociado al archivo validado y su hash.

## Rationale

Administrar productos unitarios y por kilo, con búsqueda rápida y una carga inicial revisable de aproximadamente 2.000 artículos. El flujo es local y comparte reglas de dinero e inventario con el
resto del proyecto, evitando dos fuentes distintas de cálculo.

## Alternatives considered

CRUD HTTP innecesario; importación directa sin preview arriesga precios/códigos. Barcode obligatorio excluiría fiambres.

## Evidence and practical limits

[Arquitectura y documentación primaria](../../docs/arquitectura.md#fuentes-verificadas).
[Scanner y balanza](../../docs/scanner-y-peso.md#fuentes-primarias).
No hay benchmarks medidos, app implementada ni scanner físico probado todavía.
La fuente de verdad de negocio son los requisitos de esta spec y el modelo común.
