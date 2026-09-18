# Interface Contract: Dashboard mensual y ayuda para reposición

API implementada: `dashboard.monthly(month:string): Promise<Result<MonthlyReport>>`. IPC `dashboard.monthly` con objeto estricto `{month}`; requiere OWNER. DTO definido en `src/shared/reports.ts`. Búsqueda sobre business_date/local_month, no fechas UTC truncadas.

## Payloads and errors

[DTOs y catálogo común](../../../docs/contratos.md). Todas las funciones de negocio
retornan Promise de Result discriminado. El worker valida enteros seguros, IDs,
enumeraciones y campos obligatorios antes de escribir. No retornar excepción sin
normalizar a la interfaz; conservar código técnico en log local.

Mutaciones con operationKey/checkoutKey y expectedRevision cuando corresponde.
Errores de catálogo, revisión o stock no se reintentan automáticamente con datos
distintos. Disk full o worker caído no se presentan como éxito. Los diálogos de
archivo son responsabilidad del main, nunca una ruta arbitraria de la UI.
