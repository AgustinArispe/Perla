# Órdenes para caja

Circuito de mostrador: un especialista prepara el pedido y emite una orden
numerada sin cobrar. El cliente lleva ese número o la impresión a caja. El
cajero recupera la orden y confirma el pago con los medios de pago habituales.

Se activa en **Configuración → Funciones → Preparación y cobro → Órdenes para
caja**. Es independiente de los tres switches de remitos. Por ejemplo, se
pueden mantener **Remitos internos apagados** y usar las órdenes con normalidad.

## Preparación

En **Ventas y caja → Órdenes para caja**, ingresar cliente o referencia, artículos,
cantidades y observaciones, y elegir Enviar orden a caja. El especialista puede
trabajar con perfil Vendedor sin terminal asignada ni turno de caja abierto.
Las cantidades se expresan en unidades o kilos según el producto.

La orden guarda responsable, fecha, artículos, precios y promociones cotizados.
La impresión indica su número y «Pendiente de pago». Prepararla no registra una
venta, ingreso, deuda, salida ni reserva de stock. Esta primera versión utiliza
la ubicación principal; caja debe estar asignada a esa misma ubicación.

## Cobro

En **Caja → Cobrar orden preparada**, buscar por número, revisar el pedido y
elegir Cobrar orden. Se requiere caja abierta en web. El carrito de venta normal
debe estar vacío para abrir este circuito; la operación tampoco borra borradores
existentes del usuario en el servidor.

El cobro completo confirma en una transacción la venta, sus pagos, los movimientos
de stock y lotes correspondientes y el estado Cobrada de la orden. La orden
conserva el vínculo con la venta, fecha y cajero. La generación del comprobante
actual sigue el switch Comprobantes. El comprobante es **no fiscal**; esta entrega
no implementa autorización ni factura fiscal ARCA.

No se puede cobrar dos veces una orden ni cambiar sus renglones desde el cobro.
Los cambios de precio, producto o promociones requieren cancelar y preparar otra
orden; no se recalcula silenciosamente el total entregado al cliente. No se admite
venta a cuenta en este circuito inicial. La disponibilidad de stock se comprueba
al cobrar, por lo que una preparación no garantiza disponibilidad futura.

Antes de enviar el cobro, el navegador conserva la solicitud pendiente. Si se
pierde la respuesta o se recarga la página, permite consultar el resultado o
reintentar con la misma clave. Un cobro ya confirmado se recupera sin registrar
otra venta. Si falla la confirmación final de la orden, se revierten también los
pagos, venta y stock de esa transacción.

## Desactivación e historial

Desactivar Órdenes para caja bloquea nuevas preparaciones; las órdenes pendientes
siguen disponibles para cobrar o cancelar. No obliga a activar remitos internos
ni externos. Los vendedores pueden cancelar sus propias órdenes pendientes;
supervisores y jefes pueden cancelar las de otros. Una orden cobrada se corrige
desde la venta, no se vuelve a poner pendiente.

La migración 37 agrega una tabla compartida `prepared_orders`, con estados
READY/PAID/CANCELLED, instantáneas inmutables y referencia real a la venta. El
esquema actual, incluyendo remitos v36, tiene **62 tablas propias**. Los respaldos
y la restauración incluyen ambas tablas nuevas.

Las pruebas de integración están en `tests/integration/prepared-orders.test.ts`.
La prueba web `tests/web-e2e/prepared-orders.spec.ts` usa especialista y cajero
en sesiones diferentes, prepara sin terminal, apaga nuevas preparaciones y
cobra con remitos internos desactivados. También simula la pérdida de la
respuesta del cobro y la recarga antes de recuperar una única venta confirmada.

## Verificación local — 24 de octubre de 2026

- `npm test -- --maxWorkers=1`: **446 pruebas aprobadas en 84 archivos**,
  incluidas 10 de órdenes para caja; 164,52 segundos.
- TypeScript, lint y compilaciones de API, web y escritorio: correctos.
- Chromium: pasaron por separado el circuito de remitos y el de órdenes;
  cada proyecto usa su propia base para mantener aislamiento.
- La prueba de órdenes confirma preparación por un vendedor sin terminal,
  remitos internos apagados, cobro de una orden pendiente tras desactivar
  nuevas preparaciones y recuperación ante respuesta perdida sin duplicados.

Se utilizaron bases temporales. Los cambios de esta entrega permanecen en la
copia de trabajo; estas comprobaciones no implican publicación en GitHub ni
despliegue o migración de datos en Railway.
