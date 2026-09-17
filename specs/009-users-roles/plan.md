# Implementation Plan: Usuarios y permisos

**Branch**: feature/users-roles · **Date**: 2026-09-17 · **Spec**: [spec.md](spec.md)
**Goal**: cuentas reales, autorización backend y gestión por jefe.
**Architecture**: AuthService valida sesiones opacas y roles sin conocer Electron.
El main conserva el token en memoria; el renderer recibe sólo el perfil. Un
dispatcher del worker centraliza autorización y auditoría antes de ejecutar servicios.
**Tech Stack**: TypeScript, React, SQLite, Zod, crypto scrypt de Node/Electron.

## Global Constraints

Sin credenciales predeterminadas, bypass de pruebas, tokens en renderer/localStorage,
ni permisos decididos por datos de usuario enviados en una venta. Mantener transacciones,
snapshots, idempotencia y operación offline. El despliegue web queda pendiente.

## Constitution Check

Compatible con escritorio/offline y controles compartidos. Registrar ampliación de roles
y posible web en constitución y plan común; esta entrega no cambia el transporte a HTTP.

## Project Structure

- shared/auth.ts: DTOs estrictos; domain/permissions.ts: matriz y denegación por defecto.
- worker/auth/password.ts: hash/verificación; worker/auth/service.ts: cuentas y sesiones.
- worker/application.ts: operaciones autorizadas, auditoría y aislamiento de borradores.
- migrations/005_users.sql: usuarios, sesiones, intentos, auditoría, responsables y borradores.
- main/worker-client.ts e ipc.ts: token privado y login/logout sin filtrarlo al renderer.
- renderer/features/auth: ingreso y administración; App: gate y módulos por perfil.
- tests/unit/permissions.test.ts, integration/auth-roles.test.ts, e2e/users-roles.spec.ts.

## Tasks and verification

Ver [tasks.md](tasks.md). Ejecutar implementación secuencial con ciclos test rojo/verde
y revisión de código independiente según requesting-code-review. Cada tarea incluye
su verificación; no se presupone aceptación del scanner ni hosting web.
