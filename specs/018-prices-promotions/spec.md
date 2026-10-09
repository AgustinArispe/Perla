# Feature Specification: Precios y promociones automáticas

**Feature Branch**: `feature/web-frontend`  
**Created**: 2026-10-02  
**Status**: alcance aprobado en el roadmap modular.

## User Scenarios & Testing

### User Story 1 - Actualizar precios en conjunto (P1)

La dueña filtra productos por búsqueda, categoría o marca, elige artículos, aplica porcentaje o precio explícito, revisa antes/después y confirma una sola operación auditable.

**Independent Test**: cambiar 100 precios, simular una revisión concurrente y comprobar que no exista una aplicación parcial ni se sobrescriba un cambio posterior.

### User Story 2 - Crear promociones simples (P1)

La dueña crea una promoción desde una plantilla: porcentaje, X por Y, precio desde cantidad o combo. Define productos, beneficio, vigencia y ve un ejemplo antes de activar.

**Independent Test**: crear cada plantilla, consultar su estado por fecha y comprobar validaciones de cantidades, ahorro y solapamiento.

### User Story 3 - Aplicar la mejor promoción en Caja (P1)

Caja aplica ofertas activas al escanear o cambiar cantidades, muestra el ahorro y conserva el detalle histórico. El servidor vuelve a calcular todo al cobrar.

**Independent Test**: combinar ofertas competidoras, resolver prioridad/ahorro de modo estable, reintentar cobro y comprobar totales, historial, devolución y rendimiento con 4.000 productos.

## Requirements

- **FR-001**: toda actualización masiva muestra alcance, antes/después y revisiones esperadas antes de confirmar.
- **FR-002**: un lote de precios se aplica completo o no modifica ningún producto; es idempotente y auditable.
- **FR-003**: soportar `PERCENT`, `X_FOR_Y`, `QUANTITY_PRICE` y `COMBO_PRICE` con dinero/cantidades enteras.
- **FR-004**: promociones tienen borrador, activa, pausada y finalizada; vigencia usa hora de Argentina decidida por servidor.
- **FR-005**: por defecto una unidad no recibe dos promociones; cantidades no consumidas pueden participar de otra.
- **FR-006**: mayor prioridad gana; a igual prioridad se elige mayor ahorro y luego identificador estable.
- **FR-007**: prorratear el ahorro en centavos entre renglones con suma exacta y guardar promoción, versión y descuento histórico.
- **FR-008**: el descuento manual reemplaza las promociones automáticas sólo después de mostrar la comparación.
- **FR-009**: confirmar venta revalida productos, promociones, vigencia y total; si cambió, conserva carrito y exige revisión.
- **FR-010**: Promociones es optativa; al apagarla las nuevas ventas no reciben ofertas y el histórico permanece legible.
- **FR-011**: el cálculo de Caja no agrega consultas proporcionales a los 4.000 productos y mantiene índices por producto/alcance.
- **FR-012**: sólo jefe y administrador gestionan precios/promociones; vendedor y supervisor pueden ver la oferta aplicada en Caja según su flujo.

## Edge Cases

- Vigencia empieza o termina mientras el cobro está abierto: el servidor devuelve revisión del total, sin cobrar.
- Dos combos compiten por el mismo producto: se respeta prioridad y desempate estable.
- Producto por peso: X por Y no aplica; precio desde cantidad usa gramos enteros.
- Precio actualizado después de preparar el lote: conflicto total, sin cambios parciales.
- Devolución: usa descuentos históricos del renglón, sin recalcular promociones actuales.

## Success Criteria

- **SC-001**: venta, suma de líneas, ahorro y pagos concilian exactamente en todos los casos.
- **SC-002**: aplicar o pausar una promoción nunca modifica ventas anteriores.
- **SC-003**: agregar un producto con 4.000 artículos y 100 promociones activas mantiene la meta actual de Caja.
- **SC-004**: alta y revisión funcionan a 360 px y presentan como máximo cinco decisiones visibles por sección.
