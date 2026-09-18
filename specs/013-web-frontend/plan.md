# Implementation Plan

**Goal:** frontend web completo del POS.
**Architecture:** extender los módulos existentes; adaptar BochaApi a HTTP sin cambiar el controlador transaccional de caja. Componentes separados para operación de caja, administración y recuperación. Archivos estáticos servidos desde el mismo proceso web.
**Tech Stack:** React 19, TypeScript, Vite, TanStack Query, Fastify y SQLite.
**Spec:** [spec.md](spec.md).

## Constraints
No credenciales en localStorage. CSRF en memoria. No reintentos automáticos de escrituras. Operaciones inciertas conservan payload y clave. No animaciones de escaneo. Permisos verificados por servidor.

## Deliverables
Adaptador HTTP, navegación, módulos completos, estilos coherentes, contenedor y pruebas del navegador. Ver [tasks.md](tasks.md).
