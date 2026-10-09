# Plan — Conteos guiados, vencimientos y revisión de caja

**Spec:** [spec.md](spec.md). **Tareas:** [tasks.md](tasks.md).

Implementar backend y datos antes de conectar la interfaz. Los nombres nuevos de tablas/operaciones se fijan al diseñar el contrato de esta etapa; mantener una sola lógica de dominio y validar payloads estrictos.

## Integración existente

- `src/renderer/features/stock/StockList.tsx`
- `src/renderer/features/stock/MovementForm.tsx`
- `src/renderer/features/stock/LotManager.tsx`
- `src/renderer/features/register/ShiftHistory.tsx`
- `src/worker/stock/service.ts`
- `src/worker/lots/service.ts`
- `src/worker/operations/cash.ts`

## Secuencia de entrega

1. Crear sesiones y líneas de conteo con revisión de stock y recuperación; integrar ledger existente.
2. Probar cantidades vacías/cero, concurrencia, pérdida de respuesta y reconciliación de lotes.
3. Construir conteo por scanner/teclado con revisión de diferencias y acciones alcanzables en móvil.
4. Agregar lista paginada de vencimientos y destinos a lote/ubicación exactos.
5. Agregar revisión de cierres con nota y estados pendiente/revisado, sin alterar movimientos.
6. Verificar agrupación de faltantes/sobrantes y exportación de todos los filtros.

## Verificación

Crear pruebas de dominio donde haya cálculo, integración con SQLite real para permisos/transacciones y un circuito web representativo. En cada tarea escribir el escenario observable, verificar que falla por la ausencia del comportamiento y ejecutar la verificación después de implementarlo.

Revisar índices y planes de consultas con la demo de cinco meses; medir tiempos sin fijar cifras no verificadas. Ejecutar typecheck, lint de archivos tocados, pruebas focalizadas y builds web/API. Verificar escritorio y móvil en una pasada, corregir hallazgos y confirmar; conservar evidencia de los filtros y totales exportados. Incorporar cambios de esquema a backup/restore y probar restauración de una base anterior.

Una etapa se entrega cuando el circuito funciona de origen a resultado, con error recuperable, permiso verificado y exportación consistente. No habilitar botones que llevan a funciones todavía pendientes.
