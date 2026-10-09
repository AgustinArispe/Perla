# Tareas — Resumen semanal e historial comprensible

Estado: implementación parcial; los ítems pendientes requieren integración o verificación de los circuitos completos.

- [x] T01 Definir snapshot semanal versionado y auditoría permitida por tipo de entidad; preparar migraciones compatibles.
- [x] T02 Reutilizar consultas existentes para semana, cobertura de costo y comparativos; probar conciliación.
- [ ] T03 Generar resúmenes en segundo plano con recuperación y sin bloquear confirmación de ventas.
- [x] T04 Agregar vista semanal y PDF compacto/XLSX con versión y fecha de generación.
- [x] T05 Enriquecer eventos nuevos en transacciones y mostrar antes/después desde detalle de entidad; conservar registros antiguos sin inventar datos.
- [ ] T06 Probar filtros, permisos, redacción de secretos, recalcular snapshot y presentación escritorio/móvil/impresión.

Recuperación automática limitada a una semana por ciclo de 60 segundos. T03 requiere validar la contención bajo carga; la generación usa consultas síncronas. T06 conserva pendiente la comprobación física de impresión.
