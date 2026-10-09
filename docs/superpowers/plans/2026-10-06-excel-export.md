# Exportación contextual a Excel

Crear un servicio de lectura que reutilice consultas y permisos existentes, recorra todas las páginas y genere XLSX en el worker. Máximo 50.000 filas; abortar con mensaje para acotar filtros, nunca truncar. Capturar lectura consistente antes de serializar.

Botón Excel reutilizable con diálogo breve, filtros actuales precargados y opciones pertinentes a cada módulo. Incluir catálogo, existencias, movimientos, clientes/cuentas, proveedores/cuentas, promociones, compras, ventas, turnos, actividad, ubicaciones/traslados y cada sección del dashboard.

Números y monedas como números; códigos como texto; ninguna fórmula construida con contenido de usuarios. Hoja Filtros con negocio/fecha/filtros. Validar paginación, permisos, módulo apagado, fórmulas maliciosas, datos vacíos, descarga web y 4.000 artículos. Conservar base local y recargar servicio.
