# Exportación a Excel

El botón **Exportar Excel**, junto a la búsqueda y los filtros de cada listado, abre los filtros del panel. Se conservan los filtros actuales y se puede ajustarlos antes de descargar.

## Alcance

- Catálogo, stock, clientes, proveedores y promociones.
- Usuarios con búsqueda, estado y rol; se exportan datos de perfil, sin credenciales.
- Ventas y compras con sus detalles; turnos y actividad.
- Cuenta de cada cliente o proveedor, con pendientes, pagos y créditos.
- Movimientos de stock, inventario de una ubicación y traslados con filtro por estado.
- Resumen mensual completo o por sección: medios de pago, productos más vendidos, reposición, margen y mercadería por ubicación.
- Comparación entre períodos.

Se exportan todas las filas coincidentes, aunque la pantalla muestre solamente una página o los primeros resultados. La reposición refleja el stock actual; las ventas asociadas corresponden al mes elegido.

## Archivo

XLSX con encabezados fijos, filtros de Excel, filas alternadas y hoja de filtros aplicados. Precios y saldos son números en pesos; las cantidades de productos por peso se expresan en kilos. Los códigos de barras conservan sus ceros iniciales. Los textos se escriben como texto, nunca como fórmulas.

## Acceso y límites

El servidor verifica el usuario, los permisos y las funciones habilitadas. Los vendedores no exportan información administrativa; el supervisor no exporta estadísticas. La descarga requiere la protección de sesión y CSRF habitual.

Máximo de 50.000 filas sumadas entre hojas. Si se supera, se pide acotar los filtros; nunca se recorta el archivo silenciosamente. Se prepara un archivo a la vez para cuidar la memoria y permitir que otras operaciones continúen durante la compresión del archivo.

## Selección múltiple

Se pueden combinar varias categorías, marcas, estados, roles, cajas y ubicaciones según el panel. Cada selector tiene casillas; los listados largos también tienen búsqueda. Quitar la selección incluye todas las opciones, salvo en el inventario, donde se debe elegir al menos una ubicación.

Dentro de un filtro las opciones se suman (categoría A **o** B); entre filtros se cruzan (esas categorías **y** las marcas elegidas **y** los estados elegidos). El Excel registra los nombres de todas las opciones en la hoja Filtros. Al exportar varias ubicaciones, cada existencia identifica su ubicación.
