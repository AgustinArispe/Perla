# Plan — Reposición sugerida y pedidos a proveedores

**Spec:** [spec.md](spec.md). **Tareas:** [tasks.md](tasks.md).

Implementar backend y datos antes de conectar la interfaz. Los nombres nuevos de tablas/operaciones se fijan al diseñar el contrato de esta etapa; mantener una sola lógica de dominio y validar payloads estrictos.

## Integración existente

- `src/worker/stock/repository.ts`
- `src/worker/purchases/service.ts`
- `src/shared/purchases.ts`
- `src/renderer/features/purchases/PurchaseWorkspace.tsx`
- `src/renderer/features/stock/StockList.tsx`
- `src/server/excel.ts`

## Secuencia de entrega

1. Crear contratos/migración de pedidos y vínculos de recepción, con pruebas de estados y recepción parcial idempotente.
2. Implementar cálculo por producto/ubicación y horizonte, distinguiendo sin datos, mínimo, pedidos confirmados y tránsito.
3. Probar objetivo/disponible/pedidos con unidades, kilos, devoluciones, inactivos, lotes bloqueados y doble conteo.
4. Integrar Preparar compra por proveedor con explicación breve y cantidades editables; agregar exportación.
5. Conectar pedido a recepción existente y revalidar saldo ante cambios concurrentes.
6. Medir sugerencias sobre la base de 4.000 artículos mientras se confirman ventas; documentar tiempos y corregir contención.

## Verificación

Crear pruebas de dominio donde haya cálculo, integración con SQLite real para permisos/transacciones y un circuito web representativo. En cada tarea escribir el escenario observable, verificar que falla por la ausencia del comportamiento y ejecutar la verificación después de implementarlo.

Revisar índices y planes de consultas con la demo de cinco meses; medir tiempos sin fijar cifras no verificadas. Ejecutar typecheck, lint de archivos tocados, pruebas focalizadas y builds web/API. Verificar escritorio y móvil en una pasada, corregir hallazgos y confirmar; conservar evidencia de los filtros y totales exportados. Incorporar cambios de esquema a backup/restore y probar restauración de una base anterior.

Una etapa se entrega cuando el circuito funciona de origen a resultado, con error recuperable, permiso verificado y exportación consistente. No habilitar botones que llevan a funciones todavía pendientes.
