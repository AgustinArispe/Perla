# Recuperación desde la web

Fecha: 6 de octubre de 2026.

## Recorrido de aceptación

La prueba usa navegador, API, worker y SQLite reales en una base temporal, separada de la simulación de cuatro meses.

1. Crear un producto con 20 unidades y una caja con $10.000 iniciales.
2. Cobrar dos unidades a $2.000 y cerrar con $14.000, sin diferencia.
3. Mantener una sesión independiente de supervisor; comprobar que consulta productos y carece de permiso para administrar copias.
4. Crear y descargar una copia desde la pantalla de Backups.
5. Modificar el stock a 5 unidades después de crearla.
6. Subir el archivo descargado, revisar su fecha y confirmar con la contraseña del jefe. El diálogo se revisa también a 390 px de ancho.
7. Comprobar que la sesión del jefe se cierra y la sesión anterior del supervisor recibe 401.
8. Ingresar nuevamente: el stock vuelve a 18, la venta conserva nombre, cantidad e importe y el cierre conserva $14.000 esperados/contados y diferencia cero.
9. Verificar que se conserva una copia automática anterior a la restauración.

También se simula un error 503 al consultar las copias. La pantalla debe indicar que no pudo consultarlas, en lugar de informar que no existen; Reintentar debe recuperar la consulta.

## Alcance

Este recorrido verifica la recuperación de un archivo descargado en la misma instalación, con su clave de cifrado. La recuperación en otro servidor requiere conservar esa clave fuera del servidor, junto con copias externas; la prueba no acredita que el hosting ya tenga configurado ese almacenamiento.

Ejecutar `BOCHA_WEB_TEST_PORT=3091` y el comando de Playwright configurado para web mantiene libre el puerto 3087 de la demostración. Cada escenario dispone de su propia base temporal.
