# Feature Specification: Fiambres y calculadora de peso

**Feature Branch**: no creada; identificador `005-weighted-products` independiente de Git.

**Created**: 2026-09-17

**Status**: Draft - para revisión de Agus; no implementado.

**Input**: Vender fiambres y otros productos por kilo ingresando el peso real, calculando importe y descontando gramos de stock.

## User Scenarios & Testing

### User Story 1 - Cobrar una porción por su peso (Priority: P1)

El cajero elige un fiambre y carga gramos leídos en la balanza.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Jamón cuesta $12.000/kg, **When** Se ingresa 250 g, **Then** La porción cuesta $3.000 y al confirmar la venta descuenta 250 g.

### User Story 2 - Corregir porciones por separado (Priority: P1)

El cajero agrega dos porciones del mismo fiambre y corrige sólo una.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Hay porciones de 250 g y 180 g, **When** La segunda se modifica a 200 g, **Then** Quedan líneas de 250 g y 200 g con sus importes recalculados.

### User Story 3 - Ingresar kilos sin ambigüedad (Priority: P2)

El cajero usa gramos o kilos con una unidad visible.

**Why this priority**: Mejora el control y la adopción sin bloquear la operación base.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** El modal está seleccionado en kilos, **When** Se escribe 0,250, **Then** Se interpreta como 250 g; la pantalla muestra unidad e importe antes de agregar.

### Edge Cases

- 0,0005 kg, 0 kg, >99.999 g, kilos sin unidad explícita.

- Cambiar el precio por kilo mientras se calcula y redondeos de porciones pequeñas.

- Etiqueta con precio pero sin gramos: no inventar peso dividiendo por precio actual.

## Requirements

### Functional Requirements

- **FR-005-01**: Producto KG tiene precio por kilo visible y calculadora de gramos por defecto.

- **FR-005-02**: Aceptar gramos enteros o kilos con hasta tres decimales; coma o punto decimal sin separadores ambiguos.

- **FR-005-03**: Calcular importe con redondeo half-up a centavos, la misma función de dominio en UI y persistencia.

- **FR-005-04**: Peso válido 1..99999 g. Rechazar cero, negativo y subgramos, no truncarlos silenciosamente.

- **FR-005-05**: Mostrar nombre, precio/kg, peso e importe antes de agregar; Enter confirma peso, Esc cancela sin movimiento.

- **FR-005-06**: No combinar porciones: cada pesaje es una línea distinta. UNIT sigue combinado según reglas de Caja.

- **FR-005-07**: Al vender o anular usar quantity_base en gramos; min_stock también expresa gramos.

- **FR-005-08**: Primera entrega usa peso manual desde balanza. Parser de etiquetas queda diseñado, desactivado hasta validar formato real.

- **FR-005-09**: No afirmar integración automática con balanza o lectura directa de peso por conectar scanner.

### Key Entities

sale_items.unit_snapshot=KG y quantity_base=gramos. Profiles de balanza se modelan en settings sólo cuando se habilite extensión, no generar patrones supuestos por prefijo.

## Success Criteria

### Measurable Outcomes

- **SC-005-01**: 250 g a $12.000/kg produce exactamente $3.000.

- **SC-005-02**: Todos los casos de cálculo UI y guardado coinciden a centavos.

- **SC-005-03**: Agregar y corregir dos pesajes requiere sólo teclado y mantiene porciones separadas.

## Assumptions

- Balanza disponible con display; peso leído manualmente hasta integración específica.

- Perfiles de código variable sólo se habilitan con al menos 10 etiquetas físicas verificadas.

## Dependencies

- [002-product-catalog](../002-product-catalog/spec.md)

- [003-stock-ledger](../003-stock-ledger/spec.md)

- [004-checkout-scanner](../004-checkout-scanner/spec.md)
