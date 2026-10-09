# Clientes y cuenta corriente

## Objetivo
Identificar clientes de manera opcional y permitir ventas a cuenta con límite, saldo y cobros trazables, sin agregar pasos a la venta común.

## Reglas
- Clientes y cuenta corriente son funciones configurables y apagadas por defecto.
- Una venta común no exige cliente.
- La cuenta corriente exige cliente activo, autorización de crédito y límite disponible.
- Los cobros reducen deuda y no se contabilizan como ventas nuevas.
- El efectivo cobrado se vincula al turno de caja.
- El límite sólo puede cambiarlo Jefe o Administrador.
- Si se apaga el crédito, se bloquean nuevas ventas a cuenta pero se conservan consulta y cobro de saldos existentes.
