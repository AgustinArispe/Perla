# 09. Reportes, Excel y lectura de métricas

[Volver al índice](README.md)

## 1. Para qué sirven los resultados

Los reportes ayudan a responder cuánto se vendió, cómo varía el negocio, qué artículos concentran ventas, cómo se cobra, dónde falta mercadería y qué margen se conoce. Son herramientas de gestión. No sustituyen contabilidad, declaraciones fiscales ni conciliación bancaria.

Para comparar cifras hay que observar cuatro dimensiones: fecha de la operación, estado actual, unidad de medida y cobertura de datos. Dos números parecidos pueden medir cosas distintas. Un total de tarjetas no es efectivo disponible; un saldo de stock actual no es stock al cierre del mes seleccionado; una venta a cuenta no es un cobro inmediato.

## 2. Ventas netas, brutas y descuentos

En `MonthlyReports.totals` se suman las ventas completadas por fecha comercial. Las anuladas se cuentan y suman aparte. Se restan los componentes de devoluciones confirmadas cuya fecha comercial cae dentro del período.

Conceptualmente:

```text
Bruto del período = bruto de ventas completadas del período − bruto devuelto en el período
Descuentos del período = descuentos de esas ventas − descuentos asociados a esas devoluciones
Neto del período = total de esas ventas − neto de devoluciones del período
```

La cantidad de ventas cuenta ventas completadas; una devolución no se convierte en “menos una venta”. Por lo tanto el ticket promedio es neto del período dividido por cantidad de ventas completadas, con el redondeo implementado. Si no hay ventas, se devuelve cero. Un período con devoluciones de ventas anteriores necesita una interpretación especial: puede tener salida económica aunque no haya ventas nuevas que expliquen un promedio habitual.

## 3. Anulaciones

El estado VOIDED excluye una venta del neto de completadas. El importe anulado es información de control. No debe restarse otra vez de un neto que ya la excluyó.

La consulta observa el estado actual de ventas cuya fecha comercial corresponde al período. Si una venta de un mes anterior se anula después, el resumen consultado de ese mes puede cambiar. El resumen mensual es una consulta viva, no un cierre contable inmutable. Para conservar qué se informó se utilizan snapshots semanales o exportaciones archivadas con fecha y contexto.

## 4. Períodos comparables: dos mecanismos distintos

El resumen mensual, cuando consulta el mes en curso, corta en el día actual de Buenos Aires y compara contra los primeros días equivalentes del mes anterior, limitado por la duración de ese mes. Para un mes cerrado utiliza todo el mes y todo el anterior.

El componente de comparación por presets utiliza otra función. TODAY compara hoy contra el período inmediatamente anterior de igual duración. WEEK parte del lunes actual hasta hoy. MONTH parte del primer día del mes hasta hoy. CUSTOM usa el rango indicado. El período anterior es el intervalo inmediatamente precedente de igual cantidad de días, no necesariamente el mismo tramo del mes anterior.

Ejemplo ilustrativo: del 1 al 7 de octubre, la comparación mensual puede mirar del 1 al 7 de septiembre; la comparación genérica de siete días mira del 24 al 30 de septiembre. Es válido que produzcan variaciones distintas. La interfaz y una exportación deben mostrar fechas, no sólo decir “anterior”.

Los rangos personalizados se limitan a entre 1 y 366 días. Si no hay neto anterior que permita dividir, la variación se representa como ausente, no como crecimiento infinito.

## 5. Evolución diaria

La serie diaria agrega ventas completadas y resta devoluciones según la fecha comercial de cada una. Genera los días hasta el corte para mostrar también días sin venta. Las barras deben interpretarse con esa base y no como conteo de tickets por altura si el gráfico muestra dinero.

Un día sin venta puede ser cierre habitual, ausencia de carga, falla operativa o realidad comercial. El gráfico no conoce la causa por sí solo. Para reposición sí existe calendario de apertura; eso no significa que todos los gráficos apliquen automáticamente ese calendario.

## 6. Medios de pago

Se suman pagos de ventas completadas por método y se descuentan reintegros del método registrados en el período. Los medios son efectivo, débito, crédito, transferencia y otro. Tarjeta agrupa débito y crédito cuando se presenta una cifra conjunta.

Una venta dividida participa en más de un medio. Por eso sumar los conteos de ventas por medio puede superar la cantidad de ventas distintas. Los porcentajes de importe y de cantidad responden a preguntas diferentes.

El saldo dejado a cuenta no es un pago inmediato de esos medios. El posterior cobro de una cuenta tiene su propio circuito. El desglose de pagos de ventas del mes no es un libro completo de todos los ingresos y egresos del negocio, ni una conciliación de caja. Esto explica por qué no siempre se puede forzar que la suma de barras sea idéntica al neto vendido en escenarios con crédito y devoluciones.

### Aviso de caída semanal

La notificación de caída usa su propia consulta: compara ventas completadas de la semana/preset con el intervalo anterior, exige al menos cinco ventas en ese período anterior y dispara si el importe actual queda por debajo del 70 % del previo. Esa consulta no resta las devoluciones de la misma forma que `MonthlyReports.totals`. Es un aviso orientativo para abrir el comparativo, no otra fuente de cierre económico. Si se unifican métricas en el futuro, esta diferencia también debe revisarse.

## 7. Margen bruto conocido

El margen se calcula sobre ventas con costo histórico disponible:

```text
Margen bruto conocido = venta neta cubierta por costo − costo conocido de mercadería vendida
Cobertura = venta neta cubierta por costo / neto considerado en la consulta
```

No incluye gastos de alquiler, sueldos, impuestos, comisiones bancarias, fletes no incorporados al costo ni otros gastos generales. No debe llamarse utilidad neta o “lo que ganó la dueña”. El porcentaje de margen sobre precio tampoco es igual al recargo sobre costo: vender a 150 algo que cuesta 100 tiene recargo 50 %, pero margen 33,33 % del precio.

Las líneas sin costo reducen la cobertura y deben revisarse. Cargar un costo después no reescribe automáticamente las instantáneas de ventas anteriores. El tablero puede desglosar por producto o categoría para localizar faltantes o márgenes problemáticos.

## 8. Diferencia temporal observada en rentabilidad

En el código actual, `period()` y el desglose de rentabilidad agrupan las ventas por fecha original, pero descuentan devoluciones asociadas a esas líneas sin acotar todas ellas por la fecha de devolución dentro de ese mismo período. En cambio, los totales de neto descuentan devoluciones por la fecha de devolución.

Esto significa que una devolución en octubre de una venta de septiembre puede influir en el neto de octubre y ajustar la rentabilidad atribuida a la venta de septiembre. La cobertura y el margen pueden no reconciliarse como si ambos usaran exactamente el mismo criterio de devengamiento.

Esta documentación describe el comportamiento observado; no lo presenta como una norma contable. Antes de usar estos resultados como cierre económico formal hay que definir un criterio temporal único y verificar pruebas de devoluciones entre meses. El capítulo de evolución lo identifica como punto técnico a revisar, sin alterar el código en esta entrega.

## 9. Rankings

Se ofrecen ordenamientos por facturación neta, unidades y kilos. No se deben sumar unidades de productos UNIT y gramos de KG como si fueran la misma magnitud. Separar esos rankings evita que una porción en gramos parezca “más unidades” que cientos de artículos envasados.

Los paneles muestran subconjuntos para conservar legibilidad; ciertas consultas limitan resultados de presentación. Las exportaciones de resumen y secciones tienen rutas específicas para ampliar el detalle dentro de los máximos permitidos. Un listado de “más vendidos” no es necesariamente todo el catálogo.

## 10. Reposición y ubicación en el tablero

La reposición consulta la situación actual de existencias y la relaciona con ventas del mes elegido. No reconstruye automáticamente cuánto stock había al final de ese mes. La etiqueta y los filtros deben permitir reconocer esa mezcla de stock actual e historia de ventas.

El tablero limita la muestra y deriva al módulo de Stock para el trabajo completo. Una lista de cientos de faltantes no es una buena pantalla de resumen. La información de ubicaciones expresa unidades/kilos, faltantes y tránsito; las ventas de una ubicación se interpretan según terminal y operación, no como contabilidad independiente de una empresa distinta.

## 11. Resumen semanal y versiones

El módulo comercial calcula semanas y puede guardar snapshots. Consultar un snapshot recupera su versión y fecha de generación. Consultar en vivo calcula la situación actual del período. Recalcular conserva una nueva versión en lugar de reemplazar silenciosamente la anterior.

La recuperación automática busca semanas pendientes y procesa una por ciclo. No debe esperarse que cientos de semanas aparezcan al instante al arrancar. Tampoco debe prometerse que la tarea no afecta la caja bajo cualquier carga: comparte recursos y requiere medición de contención en escenarios exigentes.

El Excel semanal informa fechas, versión, origen y generación junto con las cifras. Eso ayuda a explicar por qué un documento guardado hace unos días difiere de una consulta recalculada luego de anulaciones o devoluciones.

## 12. Excel: diseño y alcance

Se usa ExcelJS para generar `.xlsx` real. Hay encabezados, formato numérico, filtros, filas alternadas y una hoja que conserva filtros aplicados. Los códigos se exportan como texto; importes como números en pesos y cantidades por peso en kilos. La planilla puede ordenarse o filtrarse después sin perder el tipo monetario.

Los 24 datasets principales son: usuarios, productos, stock, clientes, proveedores, promociones, ventas, compras, turnos, actividad, inventario por ubicación, traslados, resumen mensual, medios de pago, ranking, reposición, rentabilidad, ubicaciones, comparación, cuenta de cliente, cuenta de proveedor, movimientos de stock, detalle de venta y detalle de compra.

Existen además exportaciones del módulo Control, como reposición, revisión comercial, operaciones, actividad estructurada y resumen semanal. No se incluyen en el conteo de los 24 datasets de `excelTitles` porque usan otro contrato y endpoint.

## 13. Filtros simples y múltiples

El diálogo parte de los filtros de la pantalla. Permite elegir varias categorías, marcas, estados, roles, terminales, ubicaciones u operaciones según el dataset. No todas las combinaciones tienen sentido en todos los módulos, por lo que el esquema rechaza filtros ajenos.

La lógica es OR dentro de una selección y AND entre selecciones. Por ejemplo, categorías “Lácteos” o “Fiambres”, marcas A o B y estado activo incluye los productos activos que pertenezcan a una de esas categorías y a una de esas marcas. No incluye todo producto de marca A ignorando categoría.

Se rechazan opciones duplicadas y combinaciones simultáneas de clave simple y múltiple del mismo filtro. Fechas deben tener orden válido. Las selecciones vacías se interpretan según el diálogo y contrato; para inventario se necesita una ubicación válida o conjunto explícito. La referencia generada lista las claves exactas aceptadas por cada dataset.

## 14. Todas las coincidencias, no sólo la página

La exportación recorre páginas o utiliza consultas de reporte para reunir coincidencias. La pantalla puede mostrar 50 registros mientras el archivo contiene cientos. El máximo principal es 50.000 filas sumadas entre hojas. Si se supera, el servidor pide acotar; no corta silenciosamente y presenta el resultado como completo.

Se prepara un Excel a la vez en el runtime. Si otro está en proceso, aparece un error temporal. Esa protección cuida memoria y evita compresiones simultáneas; no significa que una planilla grande no tenga costo de CPU y lectura SQL.

## 15. Vistas guardadas

Las vistas guardan nombre, módulo y filtros por usuario. Las fechas pueden ser fijas o relativas a semana/mes según el contrato. Una vista de selección múltiple debe recuperar ese conjunto cuando abre la exportación; no reducirlo silenciosamente al primer valor.

Las vistas son privadas del usuario y se controlan con revisión. No conceden permiso sobre un módulo deshabilitado ni deben utilizarse para saltar validación del filtro. Un cambio en categorías, usuarios o funciones puede exigir revisar la selección guardada.

## 16. Excel, CSV y PDF tienen propósitos distintos

XLSX conserva tipos, presentación y filtros para análisis. CSV es intercambio tabular simple y tiene rutas históricas específicas, además del importador de catálogo. PDF o impresión conservan una presentación para compartir o archivar visualmente. Ninguno reemplaza un backup recuperable de SQLite.

Para entregar información a un tercero conviene incluir período, fecha de generación, filtros y significado de las cifras. Para migrar el sistema completo se necesita base/copia válida y versión compatible; un Excel de productos no restaura ventas, sesiones, cuentas, lotes y auditoría.

## 17. Ejemplo de lectura integrada

Una venta de $20.000 con $5.000 a cuenta y $15.000 en efectivo aumenta ventas por $20.000, caja por $15.000 y deuda del cliente por $5.000. Cobrar esos $5.000 al día siguiente aumenta efectivo y reduce deuda, sin crear otra venta. Si el costo histórico conocido era $12.000, el margen bruto de esa venta antes de devoluciones es $8.000; todavía no es utilidad después de gastos.

Este ejemplo resume por qué Caja, Clientes y Resultados deben leerse juntos, pero no sumarse indiscriminadamente. El programa aporta esos vínculos para que el negocio pueda controlar sin duplicar registros.
