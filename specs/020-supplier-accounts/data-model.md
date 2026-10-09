# Data model: Caja y cuenta de proveedores

## Supplier payable

Una compra tiene como máximo una cuenta por pagar. Conserva total original, saldo actual y estado `OPEN`, `PAID` o `VOIDED`. El saldo nunca es negativo ni supera el original.

## Supplier payment

Operación inmutable con proveedor, fecha comercial, medio, importe, nota, autor y clave idempotente. Para efectivo conserva turno y movimiento de caja; para otros medios ambos son nulos.

## Payment allocation

Relaciona pago y compra con un importe positivo. La suma por pago coincide con el pago y la suma por compra nunca supera el total original.

## Supplier credit

Crédito inmutable vinculado a una compra anulada. Representa dinero ya abonado que no debe desaparecer; su aplicación o devolución queda para una ampliación explícita.

