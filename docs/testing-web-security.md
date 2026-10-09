# Informe de pruebas — web y seguridad

Fecha: 6 de octubre de 2026. Entorno local: Windows x64, Node 24.13.0, Chromium de Playwright.

## Resultado

| Verificación | Resultado |
| --- | --- |
| Lógica, API, persistencia y seguridad: 62 archivos | 222 pruebas correctas |
| Circuitos reales en navegador | 18 correctos |
| Tipos TypeScript | Correctos |
| Lint del proyecto | Correcto |
| Compilación web y API | Correctas |
| Auditoría de dependencias de producción | 0 vulnerabilidades conocidas |

Las bases temporales de pruebas están separadas de la demostración. No se restauró, reinicializó ni cargó información de pruebas en el histórico de cuatro meses.

## Circuitos de navegador

1. Catálogo, terminal, venta escaneada, comprobante y consulta histórica.
2. Accesos visibles de vendedor y supervisor.
3. Notificaciones de stock bajo y comparación de períodos desde celular.
4. Creación de promoción y aplicación del ahorro al carrito.
5. Recepción de compra e inmutabilidad de su detalle histórico.
6. Dashboard por mes y día, teclado, celular y movimiento reducido.
7. Jornada completa con dos cajeros y jefe: apertura, promoción 3×2, peso, efectivo/débito, vuelto, confirmación perdida, recuperación sin duplicación, cancelación, devolución y dos cierres.
8. Error al consultar backups y recuperación mediante Reintentar.
9. Crear, descargar, subir y restaurar una copia; recuperar stock/venta/cierre, revocar sesiones y conservar una copia previa.
10. Lector USB HID simulado: doce escaneos rápidos y alternados con una consulta demorada, repeticiones, ceros iniciales, producto desconocido/inactivo, error de conexión, Enter vacío, edición de cantidades, foco en búsqueda, recarga/recuperación del carrito y cobro único.
11. Seguridad desde navegador: texto XSS almacenado, búsqueda con texto de inyección, origen/CSRF inválidos, rutas privadas, permisos por HTTP, precios/cantidades/campos manipulados y ocho confirmaciones concurrentes de una misma venta.
12. Cliente creado desde la interfaz, límite de cuenta, venta a crédito, dos cobros parciales y saldo cancelado desde celular.
13. Precio cambiado con carrito abierto: revisión explícita, lectura inmediata al precio nuevo y nombre/precio históricos preservados después de otra modificación.
14. Conexión interrumpida antes de guardar: comprobar ausencia y reintentar con doble clic sin duplicar la venta.
15. Usuario desactivado con sesión abierta: operación HTTP rechazada, salida al login e imposibilidad de volver a ingresar.
16. Stock insuficiente: rechazo sin cambiar existencias ni perder carrito; corregir cantidad y completar venta/cierre.
17. Consulta de clientes fallida: mostrar el error sin informar cero clientes y recuperar la lista mediante Reintentar.
18. Producto desactivado con carrito abierto: rechazar cobro, retirar el renglón y volver a escanear sin reutilizar el estado activo anterior.

La segunda pasada detectó y corrigió la falta de una acción visible para actualizar precios y el uso de un precio anterior en la memoria rápida del scanner. Detalle: [QA de casos de borde](qa-edge-cases.md).

La tercera pasada verificó respuestas HTML de un proxy, JSON cortado y contratos incompletos, sin reenvíos automáticos. La jornada completa ahora simula una venta guardada cuya confirmación devuelve HTML con estado 502; consultar la venta recupera el comprobante sin duplicarla. Una respuesta 401 ilegible también invalida la sesión en pantalla. La subida y descarga de archivos usan el mismo manejo de respuestas de error.

## Cobertura de lógica y API

- Contraseñas, bloqueo de intentos, desbloqueo autorizado, revocación y vencimiento de sesiones; respuestas públicas sin hashes ni tokens privados.
- Cookie de producción `__Host-`, Secure, HttpOnly, SameSite y Path; CSP sin permitir eval, protección de framing y respuesta sin caché.
- Roles y funciones optativas, aislamiento de ubicación y terminal, validación estricta e idempotencia.
- Identificación de fábrica/interna, ceros de código, generación de códigos internos únicos y etiquetas.
- Descuentos, precios históricos, dinero en centavos, peso, pagos, stock y reversión atómica de operaciones fallidas.
- Compras y proveedores, costos/margen, cuentas de clientes/proveedores, lotes y vencimientos, devoluciones, traslados y conciliación mensual.
- Backups cifrados: corrupción, clave incorrecta, manipulación, tamaño máximo, vistas previas vencidas, carritos pendientes, recuperación interrumpida y retención diaria.
- Pruebas de volumen con 4.000 productos; el informe mensual sobre 100.000 ventas y 2.000 productos registró 1.197 ms en la ejecución local. Ese tiempo no incluye la red ni es una garantía para el equipo del comercio.

## Cuarta pasada: conflictos simultáneos

Siete escenarios nuevos envían solicitudes HTTP simultáneas a la API con worker y SQLite reales:

- Dos ventas distintas intentan vender la última unidad: una sola venta, stock cero y un único ingreso de efectivo.
- Dos ediciones parten de la misma revisión del producto: una se guarda y la otra recibe conflicto, sin sobrescribir el cambio ganador.
- Dos borradores parten de revisión cero: se conserva un único carrito y no cambia el stock.
- Dos devoluciones con claves diferentes intentan devolver la misma unidad: un único reintegro de stock y efectivo.
- Dos altas comparten código de barras: queda un solo producto identificable por ese código.
- Venta y cierre simultáneos, iniciando primero cada una de las dos operaciones: el arqueo incluye la venta si se confirma antes del cierre; si cierra primero, la venta se rechaza sin descontar stock. Una nueva venta con la caja ya cerrada también se rechaza.

Los siete escenarios pasaron sin requerir cambios de producción. Las pruebas acreditan la serialización y las transacciones del servidor actual; no simulan varios servidores escribiendo sobre una base compartida.

## Correcciones encontradas por las pruebas

- Los diálogos ahora enfocan su campo de edición, respetando un foco explícito cuando existe.
- Al cerrar el comprobante se renueva el contexto de escritura del scanner: mostrar foco ya no basta para dar la lectura por operativa. La regresión envía el siguiente código con teclado, sin tocar el campo.
- Las fuentes se sirven como archivos y Zod valida sin generación dinámica de código; no se debilita la CSP para hacerlos funcionar.
- Clientes, traslados y resumen por ubicación admiten sus filtros conocidos y siguen rechazando parámetros extra.
- Lint excluye la carpeta de bases de demostración y sus archivos generados; el código fuente sigue revisándose.
- El flujo de CI incluye auditoría de dependencias de producción.

## Ejecución

Ejecutar `npm test` para lógica/API. Luego `npm run test:web` con `BOCHA_WEB_TEST_PORT=3091` para los circuitos web sin ocupar la demo del puerto 3087. Las pruebas usan ocho servidores con bases independientes.

Se observó un timeout de retención diaria al ejecutar simultáneamente la suite de lógica y el arranque de siete servidores de navegador. La suite de lógica pasó completa al ejecutarse separadamente, conservando el límite original del test; no se aumentó ni se suprimió la prueba.

## Verificaciones en el entorno real

- Lector físico: lectura óptica, etiquetas, cable, modo USB HID, distribución de teclado y sufijo Enter. La simulación prueba los eventos del navegador, no el hardware.
- Impresora física: ancho, corte y salida del comprobante. La prueba web no acredita una impresión en papel.
- Hosting: HTTPS/TLS real, dominio, proxy/firewall, secretos y backup externo con recuperación desde otra máquina. No se realizó una prueba de penetración externa ni se publicó la demo.
- Navegadores: la automatización se ejecutó en Chromium y con ancho móvil de 390 px; falta aceptación en dispositivos reales y Safari/Firefox.

Estos resultados acreditan los casos listados. No equivalen a una garantía de ausencia de vulnerabilidades ni a cobertura de todas las combinaciones posibles.
