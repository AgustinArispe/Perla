# Interface Contract: Caja rápida y scanner USB

products.findByBarcode y search; checkout.saveDraft/getDraft; handoff a sales.complete en 006. Cola usa orden de captura y puede detenerse ante entrada de peso.

## Payloads and errors

[DTOs y catálogo común](../../../docs/contratos.md). Todas las funciones de negocio
retornan Promise de Result discriminado. El worker valida enteros seguros, IDs,
enumeraciones y campos obligatorios antes de escribir. No retornar excepción sin
normalizar a la interfaz; conservar código técnico en log local.

Mutaciones con operationKey/checkoutKey y expectedRevision cuando corresponde.
Errores de catálogo, revisión o stock no se reintentan automáticamente con datos
distintos. Disk full o worker caído no se presentan como éxito. Los diálogos de
archivo son responsabilidad del main, nunca una ruta arbitraria de la UI.
