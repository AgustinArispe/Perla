# Segunda pasada de QA — casos de borde

Fecha: 6 de octubre de 2026.

## Nuevos recorridos

### Cambio de precio con carrito abierto

El cajero escanea un producto a $1.000. Otro usuario lo cambia a $1.500 antes del cobro. La confirmación debe detenerse y mostrar «Actualizar precios». El cajero revisa el cambio explícitamente y escanea otra unidad inmediatamente: debe quedar un solo renglón, cantidad dos y total $3.000. Después de vender se vuelve a cambiar precio y nombre del catálogo; el detalle anterior debe conservar nombre y precio de $1.500.

Se detectaron y corrigieron dos problemas:

- El aviso del cambio aparecía sin la acción para corregir el carrito. Caja ahora mantiene un estado explícito de revisión requerido y bloquea el cobro hasta actualizar o corregir los artículos.
- La memoria rápida del scanner conservaba el precio anterior. La revisión explícita limpia esa memoria para que la siguiente lectura consulte el producto actualizado.

### Conexión caída antes de guardar

Se interrumpe la solicitud de cobro antes de llegar al servidor. «Consultar venta» comprueba que todavía no existe. Un doble clic en «Reintentar misma venta» debe guardar una sola operación. Se comprueba el detalle y se cierra la caja con el importe correspondiente.

Este caso complementa la prueba anterior de respuesta perdida después de guardar: distingue una venta que nunca llegó de una que sí se confirmó.

### Desactivar un usuario con sesión abierta

El jefe desactiva una cuenta que está conectada. Su siguiente consulta HTTP debe recibir 401, la recarga debe mostrar login y las credenciales de esa cuenta ya no deben permitir ingresar.

### Stock insuficiente

Con una sola unidad disponible, se intenta vender dos sin autorizar stock negativo. El rechazo debe conservar el carrito y la unidad de stock, sin crear comprobante. Al corregir la cantidad a uno, la venta debe completarse y dejar stock cero. Se verifica el cierre por el importe efectivo vendido.

## Aislamiento

Verificación final: 206 pruebas de lógica y 16 circuitos web correctos, tipos y lint correctos, compilación web correcta. Los cuatro nuevos escenarios pasaron junto con los doce anteriores después de aplicar las correcciones.

Los nuevos recorridos tienen servidor y base temporales separados de los siete escenarios anteriores. La configuración utiliza ocho puertos consecutivos; ejecutar con `BOCHA_WEB_TEST_PORT=3091` conserva disponible la demostración del puerto 3087.

Estos casos prueban los flujos desde Chromium, API y SQLite reales. No reemplazan la aceptación con lector e impresora físicos ni la revisión del hosting.

## Tercera pasada — respuestas inesperadas y datos desactualizados

Se agregaron nueve pruebas del cliente HTTP y dos circuitos web:

- Respuestas HTML, JSON cortado, sobres incompletos y estados HTTP incompatibles muestran un mensaje comprensible. No disparan otra solicitud automáticamente.
- Una respuesta 401 invalida la sesión aunque su contenido no sea JSON válido. Los errores de subida y descarga de archivos reciben el mismo tratamiento.
- La jornada completa guarda una venta y reemplaza la confirmación por un error HTML 502. Consultar la venta recupera la operación original sin duplicar el cobro.
- Desactivar un producto con carrito abierto invalida la memoria de códigos cuando el servidor rechaza la cotización. Retirarlo y volver a escanear no permite agregarlo como activo.
- Una consulta de clientes fallida presenta un aviso y Reintentar; no muestra un catálogo vacío ni un contador de cero clientes.
- La integración de bloqueo de intentos comprueba también el contrato de error 429 y su código AUTH_THROTTLED.

Verificación de esta pasada: **215 pruebas en 61 archivos y 18 circuitos web correctos**. TypeScript, lint y compilación web correctos. Se ejecutaron las suites de lógica y navegador por separado, sobre bases temporales; el histórico de demostración permanece intacto.

## Cuarta pasada — conflictos simultáneos

Se añadieron siete escenarios HTTP contra worker y SQLite reales: última unidad disputada entre ventas distintas, ediciones del mismo producto, borradores con igual revisión, devoluciones de la misma unidad, altas con código de barras repetido y venta/cierre simultáneos en ambos órdenes de inicio.

Se verifican los efectos durables: venta recuperada por su clave, existencias, producto consultado por código, devolución registrada y efectivo esperado en el cierre. Los conflictos no provocaron duplicaciones ni cambios parciales. No fue necesario modificar código de producción.

La suite completa de lógica/API pasó con **222 pruebas en 62 archivos**, y los **18 circuitos de navegador** también pasaron nuevamente; TypeScript y lint correctos. Todos los escenarios utilizaron bases temporales separadas de la demostración.
