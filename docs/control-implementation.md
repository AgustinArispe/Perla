# Control del negocio — implementación local

## Entregado

- Inicio con hasta cinco grupos de pendientes, totales y destinos al registro y ubicación correspondientes.
- Vistas privadas por usuario, fechas relativas y filtros de Excel reutilizables. Las vistas con selección múltiple abren la exportación con todos sus filtros.
- Reposición por ubicación, calendario de apertura, unidades de compra, pedidos y recepción parcial. Reutiliza compras, costos, lotes y cuentas de proveedores.
- Revisión de precios y productos sin movimiento. Marcar revisado conserva el precio; una modificación posterior del costo vuelve a generar el pendiente.
- Conteos recuperables con scanner como teclado, cantidades no contadas diferenciadas del cero y validación de cambios de stock antes de aplicar.
- Vencimientos paginados y revisión de diferencias de caja sin reescribir el cierre original.
- Agenda de cobros y pagos, fechas acordadas, historial e imputación parcial a una obligación específica.
- Resumen semanal con versiones conservadas, recuperación de semanas faltantes, Excel e impresión a PDF.
- Auditoría de antes/después con campos permitidos, sin contraseñas ni tokens; acceso desde productos, ventas y Actividad.
- Roles acumulativos: Vendedor → Supervisor → Jefe. Administrador conserva todos los permisos del jefe. Las funciones habilitadas del negocio se validan aparte de los permisos.

## Datos y verificación

La instancia local conserva `.data/five-month-local/pos.sqlite`. Antes de migrar se creó `before-control-2026-10-07.sqlite`; el esquema llegó a la versión 29 sin reemplazar la simulación.

Verificación automática: pruebas de servicios, permisos, aislamiento de usuarios, idempotencia, recepción parcial, lotes, conflictos, pagos dirigidos, conciliación semanal, versiones inmutables y exportación sin mutaciones. Pruebas de navegador adicionales cubren escritorio/celular, cuentas corrientes, compras y una descarga XLSX real con filtros múltiples guardados y recuperados.

Medición de reposición, solo lectura, sobre 4.000 productos y 13.813 ventas: 45,9 / 38,1 / 35,7 / 36,0 / 36,6 ms. Es una medición local de la consulta, no una promesa de latencia de red ni una prueba de carga concurrente.

## Límites de la verificación

El lector físico y una impresora deben verificarse con el hardware del comercio. Las pruebas simulan entrada de teclado y Enter. La generación automática de resúmenes se limita a una semana pendiente por ciclo; usa consultas síncronas y todavía requiere medir contención bajo carga concurrente sostenida antes de garantizar que no afecta la caja.

Las fechas de pago se acuerdan desde Agenda para mantener la venta y recepción simples. Las obligaciones previas conservan fecha vacía; no se les inventa un vencimiento.
