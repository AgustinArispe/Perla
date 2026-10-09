# Plan técnico

1. Crear el esquema 022 con ubicación principal, asignaciones de terminal, saldos locales y ledger de traslados.
2. Mantener `inventory_balances` como saldo consolidado y ampliar `StockRepository` para escribir el saldo local y consolidado en la misma transacción.
3. Implementar contratos Zod y `LocationTransferService` con operaciones idempotentes.
4. Integrar permisos, funciones, aplicación, API web y puente de escritorio.
5. Construir la vista responsive de ubicaciones y traslados, con la función apagada por defecto.
6. Verificar migración, concurrencia lógica, backup, permisos y recorridos de interfaz.
