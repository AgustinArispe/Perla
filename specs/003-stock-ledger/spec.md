# Feature Specification: Stock, ingresos y ajustes

**Feature Branch**: no creada; identificador `003-stock-ledger` independiente de Git.

**Created**: 2026-09-17

**Status**: Draft - para revisión de Agus; no implementado.

**Input**: Conocer existencias por unidad o gramos, registrar reposición, mermas y conteos, y señalar productos con poco stock.

## User Scenarios & Testing

### User Story 1 - Comenzar con un conteo real (Priority: P1)

El encargado registra cuánto hay de cada producto al comenzar el control.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Un producto tiene stock desconocido, **When** Se registra conteo inicial de 10 unidades, **Then** Se muestra balance 10 y queda un movimiento de apertura.

### User Story 2 - Registrar mercadería y correcciones (Priority: P1)

El encargado carga compras, merma o diferencia detectada al contar.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Un queso tiene 3.000 g en stock, **When** Se reciben 2 kg y luego se registra merma de 100 g, **Then** El balance pasa a 4.900 g con ambos motivos visibles.

### User Story 3 - Identificar faltantes para reponer (Priority: P2)

El encargado ve productos agotados o bajo su mínimo.

**Why this priority**: Mejora el control y la adopción sin bloquear la operación base.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Un producto activo tiene stock 3 y mínimo 5, **When** Se consulta la lista de reposición, **Then** Aparece con existencia, mínimo y unidad; desconocidos se muestran por separado.

### Edge Cases

- Repetición de un ingreso, conteos simultáneos y merma que supera existencia.

- Venta antes de conteo inicial; cambios de tracking.

- Anulación posterior a conteo físico: advertencia y movimiento trazable.

## Requirements

### Functional Requirements

- **FR-003-01**: Existencias unitarias enteras y productos por peso en gramos; UI convierte kilos sin cambiar unidad base.

- **FR-003-02**: Separar stock desconocido de stock cero contado y permitir marcar control de existencias por producto.

- **FR-003-03**: Registrar apertura, recepción, merma y ajuste con fecha y motivo; no sobreescribir balance sin movimiento.

- **FR-003-04**: Conteo ajusta por diferencia y registra expectedRevision para detectar edición concurrente.

- **FR-003-05**: Movimientos y actualización de balance son atómicos; operationKey evita duplicación por doble clic.

- **FR-003-06**: Al confirmar venta descontar sólo los productos inicializados; carrito no reserva stock.

- **FR-003-07**: Stock insuficiente exige aviso y confirmación con motivo antes de permitir balance negativo.

- **FR-003-08**: Al anular revertir movimientos de esa venta una sola vez; no inferir desde configuración actual.

- **FR-003-09**: Stock bajo incluye balance <= mínimo; sin stock, negativos y desconocidos tienen etiquetas distintas.

- **FR-003-10**: Importar stock inicial usa las mismas reglas, sólo tras un conteo real disponible.

### Key Entities

inventory_balances y stock_movements. quantity_base firmado. OPENING parte de un estado desconocido; recount produce ADJUSTMENT con diferencia. Tracking no elimina ledger.

## Success Criteria

### Measurable Outcomes

- **SC-003-01**: Balance coincide con suma de movimientos para todos los fixtures.

- **SC-003-02**: 100 reintentos de una operación producen un solo movimiento.

- **SC-003-03**: Lista de bajo stock aparece <= 1 s y nunca llama agotado al desconocido.

## Assumptions

- Un depósito lógico; sin proveedores, órdenes de compra, lotes o vencimientos en v1.

- Se permite venta con stock negativo únicamente por decisión explícita.

## Dependencies

- [001-desktop-core](../001-desktop-core/spec.md)

- [002-product-catalog](../002-product-catalog/spec.md)
