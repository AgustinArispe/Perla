# Remitos modulares — primera versión

Para preparar un pedido sin cobrar y pagarlo después en caja, usar el módulo
independiente [Órdenes para caja](ordenes-para-caja.md). Se puede habilitar con
remitos internos desactivados. La migración posterior v37 agrega esa función:
el esquema actual tiene 62 tablas propias (61 al incorporar solo remitos v36).

Los remitos se activan en **Configuración → Funciones → Remitos**. Los tres
switches comienzan apagados y se administran por separado:

- **Remitos a clientes:** documento de entrega de una venta completada.
- **Remitos de proveedores:** constancia de una compra ya recibida; admite
  registrar el número de remito externo del proveedor.
- **Remitos internos:** documento de un traslado entre ubicaciones. Requiere
  Ubicaciones y traslados, que a su vez requiere Control de stock.

Proveedores requiere Proveedores y compras. La pantalla revisa las dependencias
antes de guardar y el servidor las valida también. Cambiar otras funciones
mediante una actualización parcial conserva la selección de remitos.

## Uso

En **Ventas y caja → Remitos**, elegir Nuevo remito, tipo y documento de origen.
Se muestran los últimos 30 orígenes disponibles; se puede buscar un número
anterior. Completar destinatario/proveedor, dirección, referencia y observaciones.
El remito documenta todos los renglones y cantidades originales. La emisión
asigna un número correlativo e incluye responsable y fecha de Buenos Aires.

El detalle permite imprimir o guardar como PDF desde el navegador. Conserva
nombre del negocio, artículos, cantidades, destinatario y direcciones como
instantánea: editar el catálogo o la configuración después no cambia lo emitido.
No muestra precios ni costos. El encabezado lo identifica como documento interno,
no válido como factura; no implementa emisión fiscal ni numeración fiscal.

En salidas a clientes se puede confirmar quién recibió. En compras y traslados
la recepción sigue perteneciendo a la operación de origen y su estado actual
se muestra junto al remito. Una anulación posterior del origen queda visible;
no se puede confirmar entrega de una venta anulada.

Anular un remito exige motivo. Para corregir contenido, anular y emitir otro
desde el mismo origen: el nuevo número referencia al remito anulado. El historial
conserva ambos. Solo puede existir un remito vigente por documento de origen.

## Desactivación y permisos

Apagar un tipo bloquea nuevas emisiones y la búsqueda de orígenes para ese tipo.
El jefe/administrador conserva consulta, impresión y cierre de documentos
anteriores. El supervisor solo accede a los tipos activos. El vendedor no tiene
acceso a esta primera versión del módulo. El servidor aplica estas restricciones
también a peticiones HTTP o IPC directas.

Si todos los tipos están apagados y no hay historial, el módulo desaparece del
menú. Si hay historial, el jefe conserva su acceso. No se eliminan documentos ni
se reinicia la numeración al desactivar o reactivar. Desactivar remitos internos
es independiente de continuar trabajando con traslados.

## Stock, cuentas y alcance

Esta versión documenta operaciones **ya registradas**. Ventas, compras y traslados
siguen siendo responsables de stock, lotes, costos, cobros y cuentas corrientes.
Emitir, confirmar, imprimir, reemplazar o anular un remito no vuelve a moverlos.
Anular el documento no revierte la operación comercial; eso se hace desde el
origen con sus controles existentes.

Todavía no incluye entrega previa a venta, selección parcial de renglones,
entregas fraccionadas, agrupación de remitos en facturas ni operaciones entre
empresas. Una venta con devoluciones previas requiere revisión y no admite una
emisión nueva de su cantidad original en esta versión.

## Almacenamiento y verificación

La migración 36 agrega **una tabla**, `delivery_notes`: el total pasa de 60 a
61 tablas propias. Los tres tipos comparten almacenamiento y tienen FK reales
al documento de origen. Los renglones se conservan en una instantánea JSON
inmutable para el documento impreso; la contabilidad de cantidades continúa en
las tablas de origen. Los cambios de estado guardan motivo, usuario y fecha y
participan de la auditoría de Application.

La emisión y los cambios se ejecutan en transacciones con claves de reintento,
revisión y restricciones de unicidad. El listado usa joins para obtener estados
y documentos reemplazados, sin una consulta adicional por cada fila. Backups,
restauración y las verificaciones de integridad incluyen la nueva tabla.

Pruebas del módulo: `npm test -- tests/integration/delivery-notes.test.ts`.
La suite web incorpora el proyecto `delivery-notes` en
`playwright.web.config.ts`; cubre activación, emisión, vista de impresión,
confirmación y desactivación con historial.

Verificación local del 23 de octubre de 2026: **436 pruebas aprobadas en
83 archivos**, incluidas 15 del módulo. TypeScript, lint y compilaciones de
API, web y escritorio correctos. Chromium ejecutó el circuito de la interfaz,
incluida vista móvil de 390 px y generación de PDF A4. Se usaron bases de
prueba; estos resultados no acreditan un despliegue ni una migración en Railway.
