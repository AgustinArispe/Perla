# Feature Specification: Ventas, medios de pago e histórico

**Feature Branch**: no creada; identificador `006-sales-payments-history` independiente de Git.

**Created**: 2026-09-17

**Status**: Draft - para revisión de Agus; no implementado.

**Input**: Confirmar cobro, registrar venta y stock atómicamente, conservar precios históricos y permitir consulta/anulación trazable.

## User Scenarios & Testing

### User Story 1 - Cerrar una venta con forma de pago (Priority: P1)

El cajero cobra en efectivo, tarjeta o una combinación y registra la venta.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Venta total $10.000, **When** Se carga tarjeta $6.000 y efectivo aplicado $4.000, recibido $5.000, **Then** Se registra total $10.000, vuelto $1.000 y efectivo del reporte $4.000.

### User Story 2 - Revisar una venta antigua (Priority: P1)

El encargado filtra por fechas y abre su detalle.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** El producto vendido luego cambia de nombre/precio, **When** Se consulta la venta, **Then** Detalle conserva el nombre, precio, cantidades y forma de pago originales.

### User Story 3 - Anular sin duplicar reposición (Priority: P2)

El encargado anula una venta equivocada con motivo.

**Why this priority**: Mejora el control y la adopción sin bloquear la operación base.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** La venta descontó stock al confirmar, **When** Se anula y se repite la solicitud, **Then** Queda anulada, conserva detalle y repone sólo una vez los movimientos originales.

### Edge Cases

- Doble clic, timeout tras commit, disco lleno antes de commit.

- Venta 100% bonificada; descuentos por centavos y pagos mixtos.

- Anulación de producto inactivo, stock recalculado y límite de mes a medianoche.

## Requirements

### Functional Requirements

- **FR-006-01**: Persistir venta, snapshots, descuento, pagos, stock, evento y eliminación de draft en una transacción.

- **FR-006-02**: Registrar CASH, DEBIT, CREDIT, TRANSFER u OTHER; permitir mixto con suma aplicada igual al total.

- **FR-006-03**: Efectivo recibido >= aplicado; calcular vuelto. No sumar recibido ni vuelto al total del dashboard.

- **FR-006-04**: Checkout key estable y hash: reintento idéntico devuelve la misma venta; contenido distinto produce conflicto.

- **FR-006-05**: Revalidar producto, precio, revisión y stock al guardar; error devuelve carrito pendiente sin éxito falso.

- **FR-006-06**: Histórico paginado con filtros por fecha y estado; detalle incluye totales y pagos preservados.

- **FR-006-07**: Anulación completa con motivo: no borrar, restituir stock por ledger original una sola vez y excluirla de netos.

- **FR-006-08**: Fecha comercial en Buenos Aires y timestamps UTC; avisar clock drift observable, no usar timezone accidental.

- **FR-006-09**: Carrito sólo se limpia tras commit confirmado. Si resultado incierto, recuperar venta por checkout key.

- **FR-006-10**: Ventas con descuento 100% llevan total cero y ningún pago; no aceptar montos negativos o pagos incompletos.

### Key Entities

sales, sale_items, sale_payments, sale_events y movimientos relacionados. number correlativo visible UNIQUE; checkout_key UNIQUE; detalle almacena price, name, barcode, SKU y unidad.

## Success Criteria

### Measurable Outcomes

- **SC-006-01**: 100 reintentos del mismo cierre producen una venta y un descuento de stock.

- **SC-006-02**: Confirmación p95 <= 300 ms en referencia definida.

- **SC-006-03**: Cada fixture concilia subtotal-descuento=total=suma pagos aplicados; total cero sin pagos.

## Assumptions

- Registro de pago manual; terminal bancaria y reembolsos fuera de la app.

- No devoluciones parciales ni gestión de caja física por turno en v1.

## Dependencies

- [001-desktop-core](../001-desktop-core/spec.md)

- [002-product-catalog](../002-product-catalog/spec.md)

- [003-stock-ledger](../003-stock-ledger/spec.md)

- [004-checkout-scanner](../004-checkout-scanner/spec.md)

- [005-weighted-products](../005-weighted-products/spec.md)
