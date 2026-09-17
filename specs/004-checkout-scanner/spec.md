# Feature Specification: Caja rápida y scanner USB

**Feature Branch**: no creada; identificador `004-checkout-scanner` independiente de Git.

**Created**: 2026-09-17

**Status**: Draft - para revisión de Agus; no implementado.

**Input**: Operar el carrito con scanner y teclado, controlar el foco y aplicar descuentos sin perder ni duplicar lecturas.

## User Scenarios & Testing

### User Story 1 - Agregar productos con scanner (Priority: P1)

El cajero escanea cada artículo y ve la venta actualizarse.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Caja está lista con un producto unitario activo, **When** Se escanea cinco veces su código terminado en Enter, **Then** Se muestra cantidad cinco y total correcto; foco vuelve al escáner.

### User Story 2 - Corregir una venta sin perderse (Priority: P1)

El cajero cambia cantidades, quita artículos o aplica descuentos.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Hay dos artículos en la venta, **When** Se edita cantidad y se aplica 10% de descuento, **Then** Subtotal, descuento y total cambian; al salir de edición el foco vuelve a escaneo.

### User Story 3 - Recuperar una operación pendiente (Priority: P2)

El cajero reinicia y revisa el carrito que estaba preparando.

**Why this priority**: Mejora el control y la adopción sin bloquear la operación base.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Hay un borrador guardado sin venta confirmada, **When** Se reinicia, **Then** Se ofrece recuperarlo o descartarlo, sin cobro ni cambio de stock.

### Edge Cases

- Enter repetido con input vacío, código largo/inválido y scanner sin sufijo.

- React vuelve a renderizar mientras entra un código; lookup lento con códigos pendientes.

- Cambio de precio desde otra pantalla y caída antes del autosave final.

## Requirements

### Functional Requirements

- **FR-004-01**: Scanner HID teclado con sufijo Enter. Procesar códigos como texto mediante una cola ordenada.

- **FR-004-02**: Combinar productos UNIT repetidos con misma revisión/precio; productos KG abren calculadora de peso.

- **FR-004-03**: Buscar nombre o código, aumentar/restar unidades, editar cantidad y eliminar línea.

- **FR-004-04**: Mostrar subtotal, descuento y total por separado; porcentaje o monto fijo con validación y sin floats.

- **FR-004-05**: F2 escaneo, F4 descuento, F6 peso, F8 cobro, Esc cerrar edición/modal; Enter en scanner sólo agrega.

- **FR-004-06**: Controlar el foco por estados; respetar cantidades, peso y pagos, nunca robar foco durante una edición.

- **FR-004-07**: El beep del scanner no equivale a producto agregado; desconocidos e inactivos tienen mensajes explícitos.

- **FR-004-08**: Draft local autosave serializado con revisión cada 300 ms y flush en salida controlada; avisar si no se guardó.

- **FR-004-09**: Al enviar cobro, congelar carrito y detectar precio actualizado; no limpiar hasta confirmar persistencia.

- **FR-004-10**: En peso/cobro indicar captura suspendida. Enter en cobro nunca confirma la venta. Scanner genérico sólo se usa en READY_SCAN; con HID sin prefijo no se puede distinguir de la escritura manual en otros inputs.

### Key Entities

Carrito: lineId, productId, cantidad base, precio/revisión vistos y descuento. Draft no es venta ni reserva inventario. No guardar React state en tabla sales.

## Success Criteria

### Measurable Outcomes

- **SC-004-01**: Escaneo a línea visible p95 <= 100 ms en referencia definida.

- **SC-004-02**: 100 lecturas a 5/s generan exactamente 100 unidades.

- **SC-004-03**: Editar, quitar, aplicar descuento y volver a escanear se realiza sólo con teclado.

## Assumptions

- Modo HID no permite distinguir conexión ni origen scanner de teclado genéricamente.

- La prueba física es requisito de entrega aunque pasen tests de teclado.

## Dependencies

- [001-desktop-core](../001-desktop-core/spec.md)

- [002-product-catalog](../002-product-catalog/spec.md)

- [003-stock-ledger](../003-stock-ledger/spec.md)
