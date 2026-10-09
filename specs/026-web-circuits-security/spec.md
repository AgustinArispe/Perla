# Pruebas completas de web y seguridad

## Objetivo

Comprobar circuitos de negocio y límites de seguridad con navegadores, API y SQLite reales, sin modificar la base de demostración.

## Aceptación

- Simular un lector USB HID con eventos de teclado y sufijo Enter. Conservar códigos que comienzan con cero, escaneos repetidos y orden de una ráfaga con consultas demoradas.
- Rechazar productos inexistentes o inactivos; recuperar el lector después de fallos de conexión y mantener la edición dentro de los diálogos.
- Recuperar un borrador después de recargar, cobrarlo una sola vez y comprobar existencias y total en la base.
- Operar una jornada con dos cajeros y jefe: promoción, peso, efectivo/débito, respuesta de confirmación perdida, devolución y cierres.
- Crear un cliente desde la interfaz, habilitar un límite, vender a cuenta y registrar cobros parciales hasta saldar desde celular.
- Probar XSS almacenado, búsquedas con texto de inyección, CSRF/origen, roles, campos e importes manipulados y ocho confirmaciones simultáneas de una venta.
- Verificar cookies y cabeceras de producción, revocación de sesiones y políticas del navegador sin permitir eval.
- Mantener correctos los filtros de clientes, traslados y resumen por ubicación; rechazar parámetros extra.
- Ejecutar las pruebas existentes de compras, promociones, dashboard, devoluciones, lotes, ubicaciones, métricas, conciliación y backup.

## Ampliación de QA

- Cambio concurrente de precio: impedir cobro con datos anteriores y ofrecer revisión explícita; una lectura inmediatamente posterior usa el precio nuevo y suma al mismo renglón.
- Conservar nombre y precio históricos después de un nuevo cambio de catálogo.
- Conexión perdida antes de guardar: consultar ausencia y reintentar con doble clic sin duplicar.
- Usuario desactivado con sesión abierta: siguiente operación rechazada y acceso revocado.
- Stock insuficiente: rechazo sin efectos parciales, carrito conservado y cobro correcto después de corregir cantidad.
- Respuestas HTML o JSON inválido: error comprensible, sin reenvío automático; 401 invalida la sesión incluso con contenido ilegible.
- Venta guardada con confirmación HTML 502: consulta explícita recupera la misma venta sin duplicarla.
- Producto desactivado durante el carrito: retirar y reescanear no reutiliza el estado activo anterior.
- Consulta de clientes fallida: aviso y reintento, sin representar el fallo como una lista vacía.

## Límites

La simulación HID acredita el comportamiento de teclado dentro del navegador, no la lectura óptica de una etiqueta, el cable, la configuración física del lector ni la impresión en una impresora real. El hosting, TLS, firewall y almacenamiento externo deben verificarse en el entorno de despliegue.
