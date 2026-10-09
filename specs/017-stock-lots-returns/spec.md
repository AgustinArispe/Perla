# Feature Specification: Stock, lotes y devoluciones

**Feature Branch**: `feature/web-frontend`  
**Created**: 2026-10-02  
**Status**: alcance aprobado en roadmap; preparado para implementación incremental.

## User Scenarios & Testing

### User Story 1 - Movimientos claros de mercadería (P1)

La dueña o un supervisor registra ingreso, merma, consumo interno, devolución o conteo eligiendo un motivo breve. Cada movimiento conserva responsable, fecha y vínculo con su documento cuando existe.

**Independent Test**: registrar cada motivo, reintentar con la misma clave y comprobar un solo movimiento y un balance exacto.

### User Story 2 - Devolver parte de una venta (P1)

Desde una venta se eligen renglones y cantidades, el destino físico —reingresa o merma— y el reintegro. La operación prorratea descuentos históricos, controla lo ya devuelto y actualiza venta, stock, costo y caja en una única transacción.

**Independent Test**: devolver parcialmente dos veces, impedir exceder lo vendido y comprobar importes, stock, efectivo y margen mensual.

### User Story 3 - Controlar lotes sólo donde aporta valor (P2)

Con Lotes activo, cada producto puede habilitar trazabilidad. Las recepciones crean lotes con vencimiento opcional y Caja propone primero el lote disponible que vence antes. Sin Lotes, el flujo actual no cambia.

**Independent Test**: recibir dos lotes, vender desde el que vence primero y verificar que un lote vencido o bloqueado no se asigne.

## Requirements

- **FR-001**: los movimientos manuales admiten motivos normalizados y una nota opcional; la API decide el signo permitido.
- **FR-002**: toda mutación es idempotente, con revisión optimista y auditoría del actor.
- **FR-003**: una devolución referencia venta, renglón, cantidad acumulada, pago original y turno de reintegro.
- **FR-004**: prorratear descuentos en centavos con suma exacta y resto determinista.
- **FR-005**: impedir devolver más cantidad o dinero que lo vendido, incluso con solicitudes concurrentes.
- **FR-006**: `RESTOCK` suma existencia; `WASTE` registra destino sin volver a ofrecer el producto.
- **FR-007**: revertir costo conocido y margen sólo por la proporción devuelta, preservando la fotografía original.
- **FR-008**: efectivo reintegrado requiere turno abierto y genera salida vinculada; otros medios quedan identificados sin alterar efectivo esperado.
- **FR-009**: Lotes es una función optativa dependiente de Stock; apagarla conserva historial y saldos por lote.
- **FR-010**: activar lotes para un producto con existencias exige distribuir el saldo real antes de vender con trazabilidad.
- **FR-011**: asignar por FEFO —primero vence, primero sale—; sin vencimiento se ubica después de los lotes vigentes fechados.
- **FR-012**: lotes vencidos, bloqueados o sin saldo no son vendibles; una excepción exige permiso y motivo.
- **FR-013**: compras pueden crear lotes dentro de la misma recepción, pero Compras y Lotes continúan siendo módulos independientes.
- **FR-014**: vendedor puede consultar y registrar una devolución de su flujo autorizado; supervisor, jefe y administrador pueden corregir y revisar.
- **FR-015**: backups incluyen devoluciones, reintegros, lotes y asignaciones.

## Edge Cases

- Venta anulada: no admite devoluciones nuevas.
- Conteo posterior: una devolución que reingresa exige reconocer el impacto, igual que la anulación completa.
- Producto sin stock: permite devolución financiera y registra que no hubo movimiento físico.
- Producto por peso: usa gramos enteros y permite devoluciones parciales.
- Promoción histórica: usa el neto congelado del renglón, sin recalcular reglas vigentes.
- Lote vencido devuelto: nunca vuelve a disponibilidad automática.

## Success Criteria

- **SC-001**: ninguna secuencia concurrente permite devolver más del 100% de una venta.
- **SC-002**: suma de reintegros y neto restante coincide exactamente con el total original.
- **SC-003**: stock global coincide con la suma de lotes cuando el producto está reconciliado.
- **SC-004**: con Lotes apagado, el tiempo de escaneo y cobro no aumenta de forma material.
- **SC-005**: devolución y recepción funcionan a 360 px y con teclado en escritorio.

## Out of Scope

- Órdenes de devolución al proveedor y notas de crédito fiscales.
- Lectura automática de balanzas o etiquetas GS1 con datos embebidos.
- Transferencias entre sucursales.
- Optimización global de lotes entre múltiples depósitos.
