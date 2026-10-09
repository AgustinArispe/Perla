# Implementation Plan: Caja y cuenta de proveedores

**Branch**: `feature/web-frontend` | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

## Strategy

Agregar una cuenta por pagar por compra, pagos idempotentes e imputaciones explícitas. La recepción crea deuda sólo si la función está activa. El servicio financiero se integra con Caja mediante un movimiento enlazado, dentro de la misma transacción SQLite.

## Data design

- `supplier_payables`: total original, saldo y estado por compra.
- `supplier_payments`: cabecera inmutable del pago y vínculo opcional con turno/movimiento de caja.
- `supplier_payment_allocations`: distribución exacta de cada pago.
- `supplier_credits`: crédito originado por anular una compra que ya tenía pagos.
- `register_movements.supplier_payment_id`: vínculo único entre pago efectivo y salida.

## Service boundaries

- `SupplierAccountService.recordPurchase`: abre la deuda en la transacción de recepción.
- `SupplierAccountService.pay`: valida saldo, distribuye FIFO y crea el egreso efectivo cuando corresponde.
- `SupplierAccountService.reversePurchase`: cancela pendiente y registra crédito por lo pagado.
- `SupplierAccountService.detail`: proyecta saldo, crédito, compras y pagos para la ficha.

## UX

La lista de proveedores muestra saldo sólo con la función activa. La ficha usa dos secciones, Pendientes y Movimientos, y una acción principal `Registrar pago`. El formulario muestra como máximo importe, fecha, medio, caja cuando sea efectivo y nota opcional.

## Verification

Pruebas de dominio e integración para FIFO, parciales, idempotencia, caja y anulación; API y recorrido web en celular; verificación integral del proyecto.

