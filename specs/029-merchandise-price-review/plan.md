# Plan — Productos sin movimiento y precios para revisar

**Spec:** [spec.md](spec.md). **Tareas:** [tasks.md](tasks.md).

Implementar backend y datos antes de conectar la interfaz. Los nombres nuevos de tablas/operaciones se fijan al diseñar el contrato de esta etapa; mantener una sola lógica de dominio y validar payloads estrictos.

## Integración existente

- `src/worker/pricing/service.ts`
- `src/worker/costs/service.ts`
- `src/worker/products/repository.ts`
- `src/renderer/features/products/ProductList.tsx`
- `src/renderer/features/products/PriceBulkDialog.tsx`
- `src/renderer/features/promotions/PromotionForm.tsx`

## Secuencia de entrega

1. Definir eventos de revisión de precio y consultas de rotación/precios con permisos de jefe.
2. Implementar cálculo de última venta/antigüedad y costo vigente con etiquetas de información insuficiente.
3. Probar productos nuevos, nunca vendidos, devoluciones, sin costo y diferencia margen/recargo.
4. Agregar vistas y acciones precargadas en Productos, reusando actualización/promoción existentes.
5. Conectar filtros guardados y exportación, con las razones de revisión en columnas.
6. Verificar que revisar un precio no lo cambia y que costos nuevos reabren el pendiente.

## Verificación

Crear pruebas de dominio donde haya cálculo, integración con SQLite real para permisos/transacciones y un circuito web representativo. En cada tarea escribir el escenario observable, verificar que falla por la ausencia del comportamiento y ejecutar la verificación después de implementarlo.

Revisar índices y planes de consultas con la demo de cinco meses; medir tiempos sin fijar cifras no verificadas. Ejecutar typecheck, lint de archivos tocados, pruebas focalizadas y builds web/API. Verificar escritorio y móvil en una pasada, corregir hallazgos y confirmar; conservar evidencia de los filtros y totales exportados. Incorporar cambios de esquema a backup/restore y probar restauración de una base anterior.

Una etapa se entrega cuando el circuito funciona de origen a resultado, con error recuperable, permiso verificado y exportación consistente. No habilitar botones que llevan a funciones todavía pendientes.
