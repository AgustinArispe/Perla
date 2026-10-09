# Mercado: base local de simulación

La simulación representa cuatro meses hasta el día de generación, con apertura de lunes a sábado, una caja y dos turnos sucesivos. Los datos son ficticios. Los precios y los identificadores EAN no representan un catálogo comercial ni códigos registrados ante GS1.

## Uso

`npm run demo:market:seed` crea una base nueva en una carpeta única dentro de `.data/`. No modifica las bases anteriores. Guarda la configuración de la última simulación en `.data/market-demo.json` y un resumen de cantidades y verificaciones junto a la base.

`npm run demo:market:start` levanta esa base en http://localhost:3087 usando la web y API compiladas en `dist/`. Detener y volver a iniciar conserva el historial y los cambios realizados durante las pruebas.

## Escenario

- Catálogo de almacén, bebidas, lácteos, limpieza, congelados, panadería, verdulería y fiambrería.
- EAN-13 sintéticos válidos para artículos envasados; identificación interna automática para artículos por kilo.
- Lucía atiende la mañana y Martín la tarde. Diego trabaja en fiambrería con el rol de supervisor disponible, que permite stock y productos y excluye el dashboard. Andrea tiene el rol de jefe. El sistema no tiene un rol exclusivo de fiambrería.
- Compras iniciales y reposiciones según existencias; costos y pagos parciales a proveedores.
- Ventas con efectivo, débito, crédito, transferencia, pagos combinados, descuentos y promociones.
- Cierres con retiros de recaudación y diferencias ocasionales; anulaciones y devoluciones.
- Clientes habituales con cuenta corriente y cobros semanales, comprobantes, lotes y mermas.
- Actualizaciones mensuales de precios con conservación de precios históricos.
- Caja actual abierta y carrito preparado para cobrar, productos con stock bajo y un lote próximo a vencer.
- Respaldo cifrado final y comprobaciones de integridad, relaciones, stock, pagos, calendario y reportes.

La generación usa las operaciones del servidor con un reloj simulado dentro del proceso de carga. La aplicación que se abre después utiliza la fecha actual. No se modifican relojes ni reglas del servidor para ejecutar la web.

## Accesos de demostración

El jefe mantiene la contraseña de prueba informada en el chat. Las cuentas `caja1`, `caja2` y `fiambreria` utilizan `Mercado2026!`. Son accesos locales para esta base ficticia.
