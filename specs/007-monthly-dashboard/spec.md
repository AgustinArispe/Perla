# Feature Specification: Dashboard mensual y ayuda para reposición

**Feature Branch**: `feature/users-roles`; incremento `007-monthly-dashboard`.

**Created**: 2026-09-17

**Status**: Implementado; aceptación del cliente y PC de referencia pendiente.

**Input**: Mostrar cuánto se vendió, productos destacados, efectivo frente a tarjeta y existencias bajas con recomendaciones comprensibles.

## User Scenarios & Testing

### User Story 1 - Ver cómo fue el mes (Priority: P1)

El jefe selecciona un mes y revisa total, cantidad de ventas y evolución.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Hay ventas completadas y anuladas en el mes, **When** Se abre el dashboard, **Then** Total neto excluye anuladas y muestra monto/cantidad anulado por separado.

### User Story 2 - Comparar formas de pago y productos (Priority: P1)

El jefe identifica medios de pago y artículos destacados.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Hay pagos mixtos y productos UNIT/KG, **When** Se consulta el resumen, **Then** Tarjeta agrupa débito/crédito por importe; unidades y kilos tienen rankings distintos.

### User Story 3 - Decidir qué reponer (Priority: P2)

El jefe ve lo que está bajo mínimo y sugerencias basadas en ventas.

**Why this priority**: Mejora el control y la adopción sin bloquear la operación base.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Un producto activo está bajo mínimo y tuvo ventas en el período, **When** Se abre la ayuda, **Then** Se explica existencia actual, mínimo y ventas, sin prometer una compra óptima.

### Edge Cases

- Pagos mixtos, todos los pagos efectivos recibidos con vuelto.

- Cambio de nombre/inactivación, un producto pesado vendido en gramos.

- Febrero, mes abierto y cambios del histórico por anulaciones posteriores.

## Requirements

### Functional Requirements

- **FR-007-01**: Selector de mes, total bruto, descuentos, vendido neto, operaciones y ticket promedio de ventas completadas.

- **FR-007-02**: Desglose importe aplicado por CASH, DEBIT, CREDIT, TRANSFER, OTHER y grupo tarjeta=DEBIT+CREDIT.

- **FR-007-03**: Mostrar porcentaje por importe y participación por cantidad de ventas sin confundir mixtos; una venta mixta puede contar en varios métodos.

- **FR-007-04**: Rankings por facturación neta, unidades y kg separados; nunca sumar 1 unidad con 1000 g.

- **FR-007-05**: Atribuir descuentos a líneas mediante allocation persistida y agrupar por product_id conservando historial.

- **FR-007-06**: Ventas diarias y comparación con mes anterior según períodos explícitos en modelo común.

- **FR-007-07**: Stock bajo/agotado/negativo actual, excluyendo desconocidos e inactivos; rótulo actual aunque mes sea pasado.

- **FR-007-08**: Ayuda determinista: destacar bajo mínimo y posición/venta del mes; no IA, demanda pronosticada ni rentabilidad sin costos.

- **FR-007-09**: Mes vacío muestra ceros y ausencia de datos; comparación con base cero no genera porcentajes infinitos.

- **FR-007-10**: Reportes recalculan anulaciones del mes original; mostrar criterio de exclusión y últimos cambios.

### Key Entities

No nuevas tablas de totales inicialmente; derivar de sales COMPLETED, items net_cents y payments amount_cents. Cache invalidada por venta/void; stock actual desde balances.

## Success Criteria

### Measurable Outcomes

- **SC-007-01**: Importes por método suman exactamente vendido neto en todos los fixtures.

- **SC-007-02**: Ranking por neto suma contribuciones que concilian con neto total.

- **SC-007-03**: Abrir mes con 100.000 ventas históricas demora <= 1 s; Caja mantiene metas.

## Assumptions

- Acceso exclusivo del jefe (OWNER), según ampliación de usuarios 009; supervisor y vendedor no consultan métricas mensuales.

- Ayuda de reposición sin lead time/costos/proveedores: no órdenes de compra automáticas.

- Exportación Excel y cierre diario son posteriores; dashboard no sustituye arqueo.

## Dependencies

- [002-product-catalog](../002-product-catalog/spec.md)

- [003-stock-ledger](../003-stock-ledger/spec.md)

- [006-sales-payments-history](../006-sales-payments-history/spec.md)
