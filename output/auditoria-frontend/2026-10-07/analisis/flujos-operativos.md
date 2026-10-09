# Flujos operativos — síntesis contrastada

Fecha: 7 de octubre de 2026. Análisis para planificación; no implementación.

El subagente de flujos entregó hallazgos parciales antes de alcanzar su límite de uso. Este documento fue completado por el agente coordinador, contrastando imágenes, snapshots y código. No se acredita una nueva prueba de interacción ni un test con personas.

## Hallazgos y decisiones

| Antes, observado | Después, propuesto | Por qué y evidencia |
|---|---|---|
| Búsqueda de Caja presenta botones muy compactos, con nombre, código e importe pegados. | Resultados como filas de selección: nombre destacado, código secundario, precio alineado, selección inequívoca y lista con altura acotada. | `popups/caja-02-buscar-producto.jpg`. `ProductSearch.tsx` usa `checkout-search-results` y `search-product`; en las hojas revisadas solo aparece la regla de seleccionado para esta última. Falta de composición visible confirmada; elección errónea por teclado requiere reproducción. |
| Selectores generales y búsqueda de Caja tienen composiciones distintas. | Compartir presentación y contrato de interacción, conservando adaptadores de datos y reglas propias de cada contexto. | `EntityPicker.tsx` ya implementa búsqueda, estados y flechas/Enter/Escape. No reemplazarlo sin reproducir el fallo comunicado por Agus. |
| Cobro muestra búsqueda de cliente como bloque grande incluso para consumidor final. | Total, medio, recibido/vuelto y confirmar visibles. Cliente seleccionado en una línea; para venta anónima, acción explícita «Agregar cliente». «A cuenta» descubre selección de cliente cuando corresponda. | `caja-09-cobrar-efectivo.jpg`, `caja-15-cliente-en-cobro.jpg`, `caja-16-venta-a-cuenta.jpg`. No hacer obligatorio seleccionar cliente ni introducir pasos al cobro normal. |
| Dividir pago agrega complejidad que no necesita la venta corriente. | Conservarlo bajo una acción secundaria. Una vez activado, mostrar asignado, restante y medios; no ocultar desequilibrios. | `caja-11-pago-dividido.jpg`. Cliente, fiado, importe recibido y cancelación deben mantener borrador y foco. |
| Nuevo producto ya parte de nombre, unidad, precio y código, con extras plegados. | Conservar estructura y mejorar etiquetas, alineación y captura por scanner; categoría/marca y stock inicial según opciones relevantes. | `productos-01-nuevo.jpg`, DOM correspondiente. No convertir un formulario corto en asistente de varias pantallas. |
| Traslado ya muestra «Disponible: 43 u.» al seleccionar arroz. | Mantener disponibilidad al lado de cantidad; distinguir total registrado y realmente transferible si el contrato lo hace. Resumen de origen/destino y confirmación alcanzable con varias líneas. | `ubicaciones-06-traslado-stock-disponible.jpg`. Carga, cambio de origen y concurrencia necesitan pruebas; la cifra visible no garantiza reserva de stock. |
| Ubicaciones apila existencias y traslados; aumenta desplazamientos y pierde foco de tarea. | Pestañas Existencias / Traslados con selector y filtros propios. Una ubicación es un lugar de mercadería, con entradas/salidas y pendientes. | `12-ubicaciones.jpg`, `12-ubicaciones-traslados.jpg`. Conservar filtros al volver y al exportar. |
| Pago a proveedor mantiene «Registrar pago» dominante arriba cuando el formulario ya está abierto; la distribución agrega otra sección. | Al abrir Nuevo pago, centrar la tarea en importe, fecha, medio y un solo Confirmar. Mostrar distribución resumida; editarla bajo demanda y conservar el detalle por obligación. | `proveedores-04-registrar-pago.jpg`, `proveedores-09-pago-distribucion-inferior.jpg`. No asumir una regla de imputación nueva. |
| Nueva promoción ocupa gran parte del primer viewport con plantillas y nombre; el alcance queda abajo. | Selector compacto de tipo, productos/categorías/marcas y beneficio dentro del mismo contexto. Nombre sugerido editable. Fechas, condiciones y prioridad en un apartado secundario con resumen siempre visible si está configurado. | `promociones-01-nueva.jpg`, variantes 02–10. La vista previa debe expresar condición y beneficio, no solo «10% de ahorro». |
| Confirmación de diferencias puede presentar un cambio importante con poco contraste de jerarquía. | Producto, registrado, contado y ajuste en columnas legibles, con signo y unidad. Una confirmación específica mantiene la consecuencia visible. | `controles-03-confirmar-diferencias.jpg`. No eliminar validación ni aplicar cambios al cerrar un modal. |
| Directorios y listados usan varias alturas y jerarquías de herramientas. | Mismo patrón de título, búsqueda, filtros, Excel, filas, acciones y paginación; detalle secundario en panel o página según complejidad. | Capturas de productos, proveedores, clientes, histórico y turnos. Mantener exportación fácil de localizar; discreto no significa escondido. |

## Contrato de interacción a validar

- Selección: el elemento resaltado es el que agrega Enter; el hover no desplaza involuntariamente una selección hecha con teclado. No agregar dos veces por un mismo Enter.
- Búsqueda: consultas A y AB respondidas en orden inverso nunca dejan resultados A para el texto AB; carga y error no se muestran como lista vacía.
- Foco: abrir un selector enfoca búsqueda; Escape cierra primero el selector, después el diálogo; al volver se recupera el disparador. El scanner queda suspendido mientras se escribe en otro campo.
- Dinero: no confundir saldo total con importe que se va a cobrar/pagar. Mantener centavos exactos, vuelto, deuda residual y límites existentes.
- Datos: stock desconocido no equivale a cero; fecha ausente no significa vencido; sin costo no implica margen 100%; sin selección no implica seleccionar todos.
- Movimiento: no esperar animaciones para buscar, escanear, agregar o confirmar. Evitar autoanimar importes cada vez que vuelve una consulta.
- Confirmaciones: una confirmación comprensible para ajustes, anulaciones y pagos; no agregar confirmaciones repetidas a altas o cambios reversibles.
- Detalle: usar expansión para información breve, diálogo para tareas acotadas y página/panel para expedientes extensos. Evitar diálogos anidados como estructura por defecto.

## Comprobaciones que faltan

Reproducir selección errónea, respuesta tardía, corte de conexión, doble envío y recuperación del borrador en base aislada. Verificar el alta/importación CSV, diálogos largos y teclado móvil. Las imágenes registran apariencia y estados visitados, no prueban estas propiedades.

Rutas principales: `src/renderer/components/{EntityPicker,Dialog,ExportButton}.tsx`; `features/checkout/{Checkout,ProductSearch,PaymentDialog,WeightDialog}.tsx`; `features/products/ProductForm.tsx`; `features/purchases/{PurchaseDraft,SupplierAccountDialog}.tsx`; `features/locations/LocationsPage.tsx`; `features/promotions/PromotionForm.tsx`.
