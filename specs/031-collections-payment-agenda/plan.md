# Plan — Agenda de cobros y pagos

**Spec:** [spec.md](spec.md). **Tareas:** [tasks.md](tasks.md).

Implementar backend y datos antes de conectar la interfaz. Los nombres nuevos de tablas/operaciones se fijan al diseñar el contrato de esta etapa; mantener una sola lógica de dominio y validar payloads estrictos.

## Integración existente

- `src/shared/customers.ts`
- `src/shared/supplier-accounts.ts`
- `src/worker/customers/service.ts`
- `src/worker/supplier-accounts/service.ts`
- `src/renderer/features/customers/CustomerPage.tsx`
- `src/renderer/features/purchases/SupplierAccountDialog.tsx`
- `src/worker/notifications/service.ts`

## Secuencia de entrega

1. Agregar vencimiento nullable por obligación con revisión, motivo de cambio y migración compatible.
2. Crear consultas por fecha/estado con saldos derivados e índices; probar Sin fecha frente a Vencido.
3. Precargar obligaciones en cobro/pago y mantener imputación/idempotencia de servicios existentes.
4. Agregar vistas Por cobrar/Por pagar y accesos desde Inicio; integrar Excel y vistas guardadas.
5. Probar pagos parciales, créditos, anticipos, anulaciones y funciones en modo solo pendientes.
6. Verificar permisos de todos los perfiles y conciliación con turnos e histórico.

## Verificación

Crear pruebas de dominio donde haya cálculo, integración con SQLite real para permisos/transacciones y un circuito web representativo. En cada tarea escribir el escenario observable, verificar que falla por la ausencia del comportamiento y ejecutar la verificación después de implementarlo.

Revisar índices y planes de consultas con la demo de cinco meses; medir tiempos sin fijar cifras no verificadas. Ejecutar typecheck, lint de archivos tocados, pruebas focalizadas y builds web/API. Verificar escritorio y móvil en una pasada, corregir hallazgos y confirmar; conservar evidencia de los filtros y totales exportados. Incorporar cambios de esquema a backup/restore y probar restauración de una base anterior.

Una etapa se entrega cuando el circuito funciona de origen a resultado, con error recuperable, permiso verificado y exportación consistente. No habilitar botones que llevan a funciones todavía pendientes.
