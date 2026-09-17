# Entrega 03 — Backend de ventas

17 de septiembre de 2026 · Electron + TypeScript + SQLite, esquema 4.

## Estado anterior

Escritorio offline, worker SQL, migraciones respaldadas, catálogo con CRUD y
CSV, stock por unidad/gramos y borrador recuperable. Productos y Stock tienen
pantallas operativas. Detalles de esas entregas: [catálogo](entrega-01-catalogo.md)
y [stock](entrega-02-stock.md).

## Agregado

- Cierre de venta con numeración interna y precios/nombres históricos.
- Cálculo exacto por unidad o kilo; cantidades de fiambre guardadas en gramos.
- Descuento porcentual o fijo, distribuido entre renglones sin perder centavos.
- Efectivo, débito, crédito, transferencia y otros; admite pagos mixtos y calcula vuelto.
- Venta totalmente bonificada sin pagos. Los pagos representan lo registrado por el cajero.
- Venta, detalle, pagos, evento, salida de stock y eliminación del borrador en una transacción.
- Reintentos con la misma clave recuperan la venta original; datos distintos provocan conflicto.
- Consulta por clave para recuperar una confirmación incierta después de reiniciar.
- Histórico paginado por fecha comercial argentina y estado; detalle con eventos y pagos.
- Anulación total con motivo y reposición por movimientos originales, una sola vez.
- Confirmación adicional si hubo un conteo posterior; conserva el ajuste y la trazabilidad.
- Fecha UTC y fecha/mes comercial de Buenos Aires; un instante compartido dentro de cada operación.
- Advertencia durable en `events.clockWarning` ante retroceso observable del reloj respecto de registros existentes.

Precios/revisiones y productos activos se revalidan antes de cobrar. Stock
insuficiente se rechaza salvo autorización explícita con motivo. Stock desconocido
permanece desconocido y no genera una salida inventada. La anulación devuelve lo
que la venta descontó aunque el producto después quede inactivo o sin control de stock.
No reserva stock al agregar productos a un carrito.

## Contrato de integración

`window.bocha.sales`: `complete`, `findByCheckoutKey`, `detail`, `list`,
`previewVoid` y `void`. Entradas estrictas validadas en IPC y worker;
respuestas `Result<T>`, sin exponer SQL ni archivos al renderer.

Si existe borrador, el cierre exige su revisión y contenido exactos. Se borra
sólo después del cierre exitoso. Un cierre sin borrador también está permitido
para integraciones internas cuando no hay otro borrador pendiente.

`amountCents` es el importe aplicado al total; `tenderedCents` corresponde sólo
a efectivo recibido. Su diferencia es el vuelto, separado de los ingresos.
Importes enteros en centavos, cálculos intermedios con BigInt y redondeo comercial.

Migración `004_sales.sql`: agrega ventas, renglones, pagos, eventos e índices;
vincula movimientos SALE/VOID mediante claves foráneas. Las existencias previas
se conservan. La numeración SQL de migraciones es independiente del número de spec.

## Evidencia

Windows de desarrollo, Node 24.13.0 / Electron 44.4.1; bases temporales de prueba.

- 54 pruebas unitarias/de integración correctas.
- Tipos, lint y compilación de escritorio/web correctos.
- 6 recorridos Playwright correctos, incluido cierre por IPC offline, reinicio,
  recuperación del resultado y anulación repetida.
- Docker: 54 pruebas y builds correctos en Linux.
- Ejecutable e instalador Windows regenerados; los 6 recorridos también pasan sobre el ejecutable empaquetado.
- Revisión independiente de código: observaciones sobre fecha/reloj corregidas y verificadas.

Pruebas destacadas: 100 reintentos sin duplicación; fallo después de escribir
stock revierte toda la venta y conserva el borrador; fallo al anular revierte
reposición y estado; cambio posterior de precio/nombre no altera el detalle;
porciones del mismo producto consumen stock acumulado; cruce de medianoche y
retroceso del reloj; paginación sin repeticiones y rechazo de cursor de otro filtro.

Fixture de escritorio: 1.000 g de queso a $10.000/kg; venta de 250 g,
descuento de $500, total $2.000; débito $1.000 + efectivo aplicado $1.000,
recibido $1.500, vuelto $500. Saldo 750 g; anulación devuelve a 1.000 g.

## Pendiente

Este incremento es backend. Falta conectar Caja, escaneo, calculadora de peso,
diálogo de cobro e Histórico a estas operaciones; el recorrido de teclado F8
todavía no está implementado. Dashboard mensual y backup/restauración de usuario
siguen pendientes. El aviso del reloj debe mostrarse al integrar las pantallas.

No puede detectar por sí solo una fecha inicial incorrecta ni saltos hacia adelante:
no hay un reloj externo. No corrige fechas guardadas automáticamente.
La devolución de dinero al cliente ocurre fuera de la aplicación.

Pendientes benchmarks con 100.000 ventas y la PC real, scanner físico, instalación
en comercio y aceptación completa de la spec 006. No se entrega ni instala en el
cliente desde este incremento de desarrollo.
