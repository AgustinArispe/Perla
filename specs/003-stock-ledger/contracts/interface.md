# Interface Contract: Stock, ingresos y ajustes

stock.opening, record, count, listLow y movements. Servicio interno aplica movimientos dentro de una transacción provista por sales.complete; no inicia una segunda transacción independiente.

Implementado además `stock.get`, `stock.search` y `stock.operation`. Mutaciones
requieren expectedProductRevision y expectedRevision del balance. Cantidad null
para desconocido/sin control. Record expone sólo RECEIPT/WASTE, con signo validado.
Un saldo negativo requiere allowNegative explícito y motivo. El mismo key/payload
devuelve el resultado original; reutilizarlo para otros datos produce conflicto.
La UI conserva la intención pendiente antes del envío y consulta operation antes
de reintentar o descartar tras un resultado incierto, incluso después de reiniciar.

## Payloads and errors

[DTOs y catálogo común](../../../docs/contratos.md). Todas las funciones de negocio
retornan Promise de Result discriminado. El worker valida enteros seguros, IDs,
enumeraciones y campos obligatorios antes de escribir. No retornar excepción sin
normalizar a la interfaz; conservar código técnico en log local.

Mutaciones con operationKey/checkoutKey y expectedRevision cuando corresponde.
Errores de catálogo, revisión o stock no se reintentan automáticamente con datos
distintos. Disk full o worker caído no se presentan como éxito. Los diálogos de
archivo son responsabilidad del main, nunca una ruta arbitraria de la UI.
