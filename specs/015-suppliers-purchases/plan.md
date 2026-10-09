# Implementation Plan: Proveedores y compras

**Branch**: `feature/web-frontend` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

**Input**: recepción de compras configurable, con proveedores, costos históricos, stock opcional, borradores, anulaciones seguras y uso móvil.

## Summary

Agregar el módulo `SUPPLIERS_PURCHASES` sobre la arquitectura web existente. Un nuevo servicio de compras validará proveedor, catálogo, cantidades y revisiones; confirmará compra, costos y movimientos de stock en una transacción SQLite idempotente. React expondrá una experiencia compacta con lista de proveedores, carga por scanner/búsqueda, borrador recuperable e histórico.

## Technical Context

**Language/Version**: TypeScript 6 strict; Node.js 24 LTS; React 19.

**Primary Dependencies**: Fastify 5, Zod 4, better-sqlite3 13, TanStack Query 5, Zustand 5, Vite 7. No se agregan paquetes.

**Storage**: SQLite con foreign keys, WAL, migraciones versionadas y volumen persistente.

**Testing**: Vitest para dominio/integración/API, Playwright para recorridos web y teclado.

**Target Platform**: servidor Linux/Windows con navegador moderno; escritorio de caja y móvil desde 360 px.

**Project Type**: aplicación web monolítica modular, API del mismo origen y cliente React.

**Performance Goals**: escaneo conocido reflejado en menos de 100 ms en el cliente; búsqueda útil p95 menor a 1 s con 4.000 productos; confirmación libera una nueva compra en menos de 1 s en el entorno de referencia.

**Constraints**: dinero en centavos, peso en gramos, cantidades enteras, confirmación online, una instancia API, un depósito lógico, sin fiscalidad ni cuenta corriente.

**Scale/Scope**: un comercio, decenas de usuarios, 4.000 productos y al menos 100.000 compras históricas paginadas.

## Constitution Check

_GATE: aprobado antes y después del diseño._

- **Caja rápida y comprensible**: Compras no se integra al hot path de Caja; scanner y teclado usan la búsqueda indexada existente.
- **Consistencia**: compra, detalle, costos y stock se confirman o revierten como una unidad; reintentos son idempotentes.
- **Exactitud**: importes, cantidades y gramos son enteros; el dominio comparte una sola regla de subtotal y redondeo.
- **Datos recuperables**: migración versionada, foreign keys, tablas incluidas automáticamente en backup SQLite y restore probado.
- **Verificación**: pruebas de dominio, transacción real, API, roles, restore y recorrido web.
- **Permisos**: vendedor queda excluido; supervisor, jefe y administrador operan compras; sólo jefe/administrador configuran funciones.
- **Seguridad web**: se reutilizan sesión, CSRF, SameSite, Origin exacto, autorización backend y contratos estrictos.
- **Identidad**: PULSE/Perla Negra con tinta, marfil y latón, contraste de día y comportamiento responsive.

No quedan violaciones ni aclaraciones pendientes.

## Project Structure

### Documentation

```text
specs/015-suppliers-purchases/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/purchases-api.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
src/
├── domain/
│   ├── features.ts
│   └── purchases.ts
├── shared/
│   ├── purchases.ts
│   ├── features.ts
│   ├── contracts.ts
│   ├── requests.ts
│   └── operations.ts
├── worker/
│   ├── db/migrations/014_suppliers_purchases.sql
│   ├── purchases/repository.ts
│   ├── purchases/service.ts
│   ├── stock/repository.ts
│   ├── features/service.ts
│   ├── operations/export.ts
│   └── application.ts
├── server/app.ts
├── main/preload.ts
└── renderer/
    ├── App.tsx
    ├── web-client.ts
    └── features/purchases/
        ├── PurchaseWorkspace.tsx
        ├── SupplierList.tsx
        ├── SupplierForm.tsx
        ├── PurchaseDraft.tsx
        ├── PurchaseHistory.tsx
        ├── PurchaseDetail.tsx
        ├── controller.ts
        └── pending.ts

tests/
├── unit/purchases.test.ts
├── unit/purchase-controller.test.ts
├── integration/purchases.test.ts
├── integration/purchases-api.test.ts
├── integration/purchases-backup.test.ts
└── web-e2e/purchases.spec.ts
```

**Structure Decision**: se extiende el monolito modular existente. Contratos compartidos delimitan navegador, API y worker; la lógica de negocio permanece en `domain/` y `worker/`, nunca en React.

## Design Decisions

1. **Recepción, no orden**: `purchases` representa mercadería físicamente recibida y pagada.
2. **Idempotencia documental**: `receiptKey` único más `payloadHash`; reusar la clave con otro contenido devuelve conflicto.
3. **Borrador por usuario**: se persiste por usuario y conserva su propia revisión optimista.
4. **Snapshot histórico**: proveedor y producto se copian al confirmar.
5. **Costo histórico**: cada renglón confirmado es una observación de costo; el último costo se consulta, no se copia al producto.
6. **Stock opcional**: el estado de `STOCK_CONTROL` se toma al comenzar la transacción. Si está activo, todos los productos rastreados deben estar preparados y se generan movimientos `RECEIPT`; si está apagado no se generan movimientos.
7. **Anulación conservadora**: sólo se revierte automáticamente cuando cada movimiento de recepción sigue siendo reversible sin saldo negativo ni conteos/ajustes posteriores incompatibles.
8. **Paginación estable**: proveedores por nombre/id y compras por fecha/número/id mediante cursor opaco.

## Delivery Phases

1. Contratos, migración, dominio y feature flag.
2. Proveedores y borrador recuperable.
3. Confirmación atómica, costo y stock.
4. Histórico, detalle, anulación y exportación.
5. Rutas web/IPC y frontend responsive.
6. Backup, rendimiento, accesibilidad y recorrido E2E.

## Post-Design Constitution Check

El modelo de datos, los contratos y las pruebas planeadas cubren todas las reglas obligatorias. La actualización de identidad a Perla Negra quedó registrada en la constitución v2.1.0. No se incorporan servicios externos ni nuevas dependencias.

## Complexity Tracking

Sin excepciones: se reutilizan patrones y límites existentes.
