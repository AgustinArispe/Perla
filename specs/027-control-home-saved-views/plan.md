# Plan — Inicio por perfil y vistas guardadas

**Spec:** [spec.md](spec.md). **Tareas:** [tasks.md](tasks.md).

Implementar backend y datos antes de conectar la interfaz. Los nombres nuevos de tablas/operaciones se fijan al diseñar el contrato de esta etapa; mantener una sola lógica de dominio y validar payloads estrictos.

## Integración existente

- `src/renderer/App.tsx`
- `src/renderer/features/notifications/NotificationBell.tsx`
- `src/worker/notifications/service.ts`
- `src/renderer/components/ExportButton.tsx`
- `src/shared/requests.ts`
- `src/domain/permissions.ts`

## Secuencia de entrega

1. Crear contratos y migración de vistas privadas con revisión y validación por módulo; probar aislamiento entre usuarios.
2. Crear consulta de pendientes con totales completos y muestras acotadas, permisos y funciones; probar errores y ausencia de filtraciones.
3. Agregar destinos tipados con entidad/filtros y retorno; probar que un aviso abre su registro y conserva el carrito.
4. Implementar inicio por perfil con máximo cinco pendientes y acceso Ver todos; conservar navegación de módulos y Ayuda al pie.
5. Agregar Guardar vista y Mis vistas en las barras existentes; conectar filtros efectivos con Excel.
6. Verificar recorrido jefe/supervisor/vendedor, fechas relativas, móvil, foco y funciones deshabilitadas.

## Verificación

Crear pruebas de dominio donde haya cálculo, integración con SQLite real para permisos/transacciones y un circuito web representativo. En cada tarea escribir el escenario observable, verificar que falla por la ausencia del comportamiento y ejecutar la verificación después de implementarlo.

Revisar índices y planes de consultas con la demo de cinco meses; medir tiempos sin fijar cifras no verificadas. Ejecutar typecheck, lint de archivos tocados, pruebas focalizadas y builds web/API. Verificar escritorio y móvil en una pasada, corregir hallazgos y confirmar; conservar evidencia de los filtros y totales exportados. Incorporar cambios de esquema a backup/restore y probar restauración de una base anterior.

Una etapa se entrega cuando el circuito funciona de origen a resultado, con error recuperable, permiso verificado y exportación consistente. No habilitar botones que llevan a funciones todavía pendientes.
