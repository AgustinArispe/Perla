# Plan — Resumen semanal e historial comprensible

**Spec:** [spec.md](spec.md). **Tareas:** [tasks.md](tasks.md).

Implementar backend y datos antes de conectar la interfaz. Los nombres nuevos de tablas/operaciones se fijan al diseñar el contrato de esta etapa; mantener una sola lógica de dominio y validar payloads estrictos.

## Integración existente

- `src/worker/reports/queries.ts`
- `src/worker/reports/period.ts`
- `src/renderer/features/dashboard/DashboardPage.tsx`
- `src/renderer/features/dashboard/MonthlyReportPrint.tsx`
- `src/renderer/features/audit/AuditPage.tsx`
- `src/worker/operations/service.ts`
- `src/server/runtime.ts`

## Secuencia de entrega

1. Definir snapshot semanal versionado y auditoría permitida por tipo de entidad; preparar migraciones compatibles.
2. Reutilizar consultas existentes para semana, cobertura de costo y comparativos; probar conciliación.
3. Generar resúmenes en segundo plano con recuperación y sin bloquear confirmación de ventas.
4. Agregar vista semanal y PDF compacto/XLSX con versión y fecha de generación.
5. Enriquecer eventos nuevos en transacciones y mostrar antes/después desde detalle de entidad; conservar registros antiguos sin inventar datos.
6. Probar filtros, permisos, redacción de secretos, recalcular snapshot y presentación escritorio/móvil/impresión.

## Verificación

Crear pruebas de dominio donde haya cálculo, integración con SQLite real para permisos/transacciones y un circuito web representativo. En cada tarea escribir el escenario observable, verificar que falla por la ausencia del comportamiento y ejecutar la verificación después de implementarlo.

Revisar índices y planes de consultas con la demo de cinco meses; medir tiempos sin fijar cifras no verificadas. Ejecutar typecheck, lint de archivos tocados, pruebas focalizadas y builds web/API. Verificar escritorio y móvil en una pasada, corregir hallazgos y confirmar; conservar evidencia de los filtros y totales exportados. Incorporar cambios de esquema a backup/restore y probar restauración de una base anterior.

Una etapa se entrega cuando el circuito funciona de origen a resultado, con error recuperable, permiso verificado y exportación consistente. No habilitar botones que llevan a funciones todavía pendientes.
