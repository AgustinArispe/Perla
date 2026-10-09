# Identificación interna y etiquetas

## Objetivo

Hacer que todo producto pueda escanearse en caja sin agregar trabajo innecesario: conservar el código de fábrica cuando existe y generar un código interno válido cuando no existe. Las etiquetas internas quedan registradas hasta su impresión.

## Alcance

- Cada producto conserva `barcode` como código de fabricante cuando lo tiene.
- Se agrega `internal_barcode`, opcional y único, para la identificación creada por El Bocha.
- Al crear un producto sin `barcode`, el backend genera un EAN-13 interno con prefijo `200`, nueve dígitos derivados de una secuencia persistente y dígito verificador GS1.
- El sistema nunca reemplaza ni modifica un código de fabricante.
- La búsqueda por escáner resuelve primero el código de fabricante y luego el interno. Si ambos coincidieran, el código de fabricante conserva prioridad y la base impide que un valor pueda repetirse entre ambas columnas.
- Un producto creado con código interno genera una etiqueta pendiente. Una reimpresión crea una nueva etiqueta pendiente; las anteriores quedan en el historial.
- Jefe y supervisor pueden ver, generar y marcar etiquetas como impresas. Vendedor no accede a esas operaciones.

## Modelo de datos

Migración 009:

- `products.internal_barcode TEXT UNIQUE`
- `barcode_sequences(namespace TEXT PRIMARY KEY, next_value INTEGER NOT NULL)` para reservar números internos dentro de una transacción.
- `product_labels(id, product_id, barcode, status, created_at_utc, printed_at_utc, actor_user_id, actor_name)` donde `status` es `PENDING` o `PRINTED`.

Las restricciones de escritura validan que `barcode` e `internal_barcode` no sean iguales y que ninguno exista en la columna opuesta. Esto mantiene una identificación inequívoca aun con datos importados o editados manualmente.

## Contratos y flujo

`Product` expone `internalBarcode`. El input de guardado acepta `generateInternalBarcode`; solo se permite al crear. Si no hay código de fabricante y no se solicita generar uno, la validación rechaza el alta.

Operaciones nuevas:

- `products.generateInternalBarcode`: reserva y devuelve una propuesta válida para mostrarla antes de guardar.
- `products.labels`: lista etiquetas pendientes o históricas.
- `products.createLabel`: genera una etiqueta para un producto existente con código interno.
- `products.markLabelPrinted`: cierra una etiqueta pendiente como impresa.

El alta normal solicita la propuesta de código al elegir “Generar código interno” y la envía en el guardado. La operación de guardado vuelve a validar y reserva de forma atómica si el cliente no envió una propuesta, evitando colisiones entre terminales.

## Experiencia de uso

El formulario de producto muestra un bloque “Identificación”. Al escanear un código de fabricante se conserva ese valor. Si el producto no tiene, el botón “Generar código interno” completa el campo con la propuesta y muestra que se creará una etiqueta.

La lista de productos muestra el código que se usa en caja: primero el de fábrica; cuando no existe, el interno con la marca “Interno”. Desde el detalle se puede elegir “Crear etiqueta”. La vista de etiquetas muestra producto, código, fecha y acciones de imprimir/marcar impresa, con una hoja imprimible diseñada para hoja A4; no se integra todavía con una impresora térmica concreta.

## Errores

- Un código repetido informa qué debe corregirse, sin revelar datos del producto ajeno al usuario autorizado.
- Si el producto no tiene ningún código y no se pidió generación, no se guarda.
- Una etiqueta ya impresa no vuelve a marcarse; para imprimir de nuevo se crea otra etiqueta.
- Las operaciones son transaccionales y se auditan como el resto de mutaciones de catálogo.

## Pruebas

- Unitarias para cálculo y validación de EAN-13, incluidos ceros iniciales y dígito verificador.
- Integración para unicidad cruzada, generación concurrente y búsqueda por ambos códigos.
- Integración para ciclo de etiqueta pendiente, marcada como impresa y reimpresión.
- Permisos para vendedor, supervisor y jefe.
- Pruebas de UI para alta sin código y vista de etiquetas.
