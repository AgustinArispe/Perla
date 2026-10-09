# Feature Specification: Costos y rentabilidad comprensible

**Feature Branch**: `feature/web-frontend`  
**Created**: 2026-10-02  
**Status**: diseño aprobado en roadmap; listo para implementación.

## User Scenarios & Testing

### User Story 1 - Conservar el costo real al vender (P1)

Al confirmar una venta, el sistema guarda para cada renglón el costo vigente, su método y la fecha de referencia. Una compra futura, un cambio manual o una anulación no reescriben esa fotografía.

**Independent Test**: recibir mercadería, vender, recibir a otro costo y comprobar que la primera venta mantiene su costo mientras la siguiente usa el nuevo promedio.

1. Un producto con stock usa costo promedio ponderado por cantidad disponible y recibida.
2. Un producto sin seguimiento usa un costo de referencia manual identificado como estimación.
3. Un producto sin costo se guarda como «Sin costo»; nunca como cero.
4. Una venta anulada queda fuera de los totales de margen sin borrar su fotografía.

### User Story 2 - Ver un margen honesto (P1)

La dueña ve venta neta, costo de mercadería conocido, margen bruto y cobertura del cálculo para el mes. El sistema aclara que el margen bruto no descuenta gastos, impuestos ni comisiones.

**Independent Test**: combinar ventas con costo completo, parcial y faltante y comprobar importes y cobertura exactos.

1. El costo y margen sólo incluyen renglones con costo conocido.
2. La cobertura se calcula sobre el importe neto de los renglones con costo conocido.
3. Con cobertura incompleta el tablero muestra «Cobertura parcial» y no presenta un margen total ficticio.
4. Sólo jefe y administrador acceden a métricas globales de rentabilidad.

### User Story 3 - Mantener costos sin complejidad (P2)

En Productos, la dueña puede cargar o actualizar un costo de referencia para artículos sin stock. En productos con stock ve el promedio vigente como dato calculado y no lo edita manualmente.

**Independent Test**: guardar costo de referencia, vender y ver la estimación congelada; luego cambiarlo y verificar que sólo afecta ventas posteriores.

1. El costo se ingresa en pesos por unidad o kilogramo según el producto.
2. Cada modificación conserva fecha, responsable y valor anterior.
3. El supervisor puede mantener costos de producto, pero no ver el dashboard global.

## Requirements

- **FR-001**: almacenar tasas de costo en microcentavos por unidad base; dinero presentado y totales persistidos permanecen en centavos enteros.
- **FR-002**: calcular promedio ponderado con existencias positivas anteriores y cantidad recibida; redondear la división al entero más cercano, empates hacia arriba.
- **FR-003**: para kilogramos, convertir costo por kilogramo a una tasa por gramo sin usar coma flotante.
- **FR-004**: una recepción actualiza el costo ponderado sólo para un producto con seguimiento de stock; productos sin seguimiento aceptan costo de referencia manual.
- **FR-005**: cada `sale_item` guarda método `WEIGHTED_AVERAGE`, `REFERENCE` o ausencia, tasa, costo total y fecha de referencia.
- **FR-006**: cerrar venta, fotografiar costos y descontar stock ocurre en la misma transacción idempotente.
- **FR-007**: ventas anteriores no se recalculan por compras o ediciones posteriores.
- **FR-008**: una anulación segura de compra restaura el estado de costo previo si no existe otro evento de costo posterior; si existe, bloquea la anulación y explica el conflicto.
- **FR-009**: permitir guardar costo de referencia con revisión optimista, responsable y auditoría.
- **FR-010**: el resumen mensual muestra venta neta, costo conocido, margen bruto conocido, venta cubierta y cobertura en puntos básicos.
- **FR-011**: los desgloses por producto y categoría muestran los mismos datos y no combinan importes sin costo como si fueran costo cero.
- **FR-012**: el detalle de venta muestra costo y margen por renglón sólo a supervisor, jefe y administrador; vendedor no recibe estos datos.
- **FR-013**: el dashboard global continúa restringido a jefe y administrador.
- **FR-014**: la función `COSTS_MARGIN` se puede ocultar sin borrar estados, eventos ni fotografías históricas; las operaciones internas siguen preservando el historial.
- **FR-015**: backups y restauraciones incluyen estados, eventos y fotografías de costo.
- **FR-016**: informes y exportaciones llaman «Margen bruto» al resultado y aclaran su alcance; nunca «ganancia».

## Edge Cases

- Stock anterior cero o negativo: el nuevo promedio parte únicamente de la cantidad recibida.
- Stock positivo sin costo previo: la recepción establece costo sólo sobre la mercadería conocida y el estado queda con cobertura de inventario parcial; no inventa costo para unidades anteriores.
- Costo o cantidad que excede un entero seguro: rechazar toda la operación.
- Compra recibida con Stock desactivado: conserva costo de compra pero no altera promedio ponderado.
- Producto cambia entre unidad y peso: las ventas y compras históricas mantienen su unidad; el estado vigente se invalida hasta establecer un costo compatible.
- Anulación de venta: excluye sus importes del informe, sin modificar promedios vigentes.

## Success Criteria

- **SC-001**: 100% de pruebas de promedio, peso y redondeo producen resultados enteros reproducibles.
- **SC-002**: 100% de ventas conservan la fotografía de costo después de cambios posteriores.
- **SC-003**: ningún informe muestra 100% de margen cuando existe un renglón sin costo.
- **SC-004**: el resumen de 100.000 ventas mensuales responde de forma paginada/agregada sin cargar detalles completos en memoria.
- **SC-005**: el flujo completo funciona a 360 px y 1366 px sin desbordamiento horizontal.

## Out of Scope

- Gastos operativos, impuestos, comisiones bancarias y ganancia neta.
- FIFO/LIFO, lotes, vencimientos y múltiples depósitos.
- Revalorización retroactiva automática.
- Contabilidad fiscal o integración con ARCA.
