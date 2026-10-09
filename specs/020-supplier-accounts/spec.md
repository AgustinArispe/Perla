# Feature Specification: Caja y cuenta de proveedores

**Feature Branch**: `feature/web-frontend`  
**Created**: 2026-10-05  
**Status**: alcance aprobado en el roadmap modular.

## User Scenarios & Testing

### User Story 1 - Conocer cuánto se debe (P1)

La dueña abre un proveedor y ve saldo pendiente, compras adeudadas, pagos y crédito a favor sin hacer cálculos manuales.

**Independent Test**: recibir dos compras, registrar pagos parciales y comprobar saldo, estados e historial estable.

### User Story 2 - Registrar un pago una sola vez (P1)

La dueña registra importe, fecha y medio. El sistema lo aplica primero a las compras más antiguas y, si es efectivo, crea una salida ligada al turno abierto.

**Independent Test**: pagar por transferencia y efectivo, reintentar con la misma clave y comprobar una sola imputación y una sola salida de caja.

### User Story 3 - Corregir sin borrar historia (P2)

Al anular una compra pendiente se elimina la deuda; si ya tenía pagos, el importe pagado queda como crédito identificado del proveedor.

**Independent Test**: anular compras sin pago, con pago parcial y pagadas; verificar deuda, crédito, movimientos y cierre de caja.

## Requirements

- **FR-001**: `SUPPLIER_ACCOUNTS` es optativa, parte apagada y requiere `SUPPLIERS_PURCHASES`.
- **FR-002**: cada compra recibida mientras la función está activa crea una cuenta por pagar por su total dentro de la misma transacción.
- **FR-003**: compras anteriores a la activación no generan deuda retroactiva.
- **FR-004**: un pago exige proveedor, importe positivo, fecha, medio y clave idempotente.
- **FR-005**: sin imputación manual, aplicar el pago a pendientes más antiguos; nunca superar el saldo total.
- **FR-006**: permitir pagos parciales y conservar saldo por compra.
- **FR-007**: un pago en efectivo exige turno abierto y genera una única salida vinculada; otros medios no alteran efectivo esperado.
- **FR-008**: reintentar una operación no duplica pago, imputación ni movimiento de caja.
- **FR-009**: anular una compra cancela su saldo pendiente y convierte lo ya pagado en crédito; no borra pagos.
- **FR-010**: saldo, crédito, pendientes y pagos se consultan desde la ficha del proveedor.
- **FR-011**: vendedor no accede; supervisor, jefe y administrador pueden consultar y pagar.
- **FR-012**: no se puede desactivar la función ni Compras mientras existan saldos pendientes.
- **FR-013**: todos los importes se almacenan en centavos enteros y cambian de forma atómica.

## Success Criteria

- **SC-001**: saldo del proveedor coincide con la suma de pendientes después de compras, pagos y anulaciones.
- **SC-002**: 100% de reintentos conservan una sola operación financiera.
- **SC-003**: el efectivo esperado cambia exactamente una vez por cada pago efectivo.
- **SC-004**: ficha y formulario de pago funcionan a 360 px sin desplazamiento horizontal.

