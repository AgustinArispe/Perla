# Feature Specification: Catálogo y carga inicial de productos

**Feature Branch**: no creada; identificador `002-product-catalog` independiente de Git.

**Created**: 2026-09-17

**Status**: Draft - para revisión de Agus; no implementado.

**Input**: Administrar productos unitarios y por kilo, con búsqueda rápida y una carga inicial revisable de aproximadamente 2.000 artículos.

## User Scenarios & Testing

### User Story 1 - Administrar un producto (Priority: P1)

El encargado da de alta un producto, modifica su precio o lo desactiva.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Existe un producto vendido antes, **When** Se cambia el precio o se desactiva, **Then** El catálogo cambia, las ventas anteriores conservan sus datos y el inactivo no se agrega a nuevas ventas.

### User Story 2 - Encontrar productos rápidamente (Priority: P1)

El cajero busca por nombre, SKU o código de barras.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Hay 2.000 productos con nombres similares y códigos con cero inicial, **When** Se busca un código exacto o parte del nombre, **Then** Se encuentra el artículo correcto con su precio y presentación.

### User Story 3 - Cargar el catálogo de forma segura (Priority: P2)

Agus revisa un archivo antes de aplicar la carga inicial.

**Why this priority**: Mejora el control y la adopción sin bloquear la operación base.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** El archivo tiene un código repetido y filas con precio inválido, **When** Se revisa la carga, **Then** Se indican filas y motivos; no se aplica una carga parcialmente inválida.

### Edge Cases

- Nombres con tildes, precio con coma decimal y barcode vacío.

- Barcode duplicado dentro del archivo y contra catálogo.

- Producto modificado mientras el cajero lo tiene en carrito.

## Requirements

### Functional Requirements

- **FR-002-01**: Cada producto tiene SKU único, nombre, precio, estado, unidad UNIT o KG, código opcional y fechas.

- **FR-002-02**: El código es texto, único cuando existe; no perder ceros iniciales. Productos sin barcode se buscan por SKU/nombre.

- **FR-002-03**: Permitir alta, modificación e inactivación; impedir borrado físico de productos con historial.

- **FR-002-04**: Guardar precio por artículo para UNIT y por kilo para KG; impedir cambio de unidad cuando ya hay movimientos o ventas.

- **FR-002-05**: Buscar nombre sin distinguir acentos/mayúsculas, código y SKU; Caja sólo ofrece activos.

- **FR-002-06**: Carga inicial CSV UTF-8 con columnas explícitas sku, barcode, nombre, precio_ars, unidad, activo, categoria, stock_inicial, stock_minimo.

- **FR-002-07**: Previsualizar errores por fila, duplicados, altas y cambios; aplicar sólo con validación completa y una transacción.

- **FR-002-08**: Archivo sin stock_inicial mantiene existencias desconocidas; no inventar cantidades para el dashboard.

- **FR-002-09**: Registrar hash/lote aplicado; confirmar cambios de precio existentes; invalidez o reintento no duplica filas ni movimientos.

### Key Entities

products e import_batches. SKU, barcode y revision únicos/validados. Stock inicial usa servicio de inventario de 003 dentro de la misma transacción; sin 003 sólo cargar catálogo sin cantidades.

## Success Criteria

### Measurable Outcomes

- **SC-002-01**: Búsqueda p95 <= 150 ms con 2.000 productos.

- **SC-002-02**: Cargar y buscar 2.000 filas sin códigos ni precios alterados.

- **SC-002-03**: Cada fila inválida tiene ubicación y causa antes de persistir.

## Assumptions

- No usar un buscador remoto ni un proveedor de precios.

- CSV es una herramienta de carga inicial de Agus; no se requiere exportación a Excel.

## Dependencies

- [001-desktop-core](../001-desktop-core/spec.md)
