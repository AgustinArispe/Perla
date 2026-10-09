# 03. Reglas de negocio y consistencia

[Volver al índice](README.md)

## 1. Unidades y representación monetaria

Los importes de negocio se representan como enteros en centavos. `$1.250,50` se almacena como `125050`. Evitar importes binarios fraccionarios reduce errores como que varias líneas sumen un centavo distinto al total esperado. Las operaciones que multiplican o prorratean utilizan `BigInt` en partes centrales del dominio y verifican el rango antes de regresar a `number`.

El límite monetario definido en `src/domain/values.ts` es `9_999_999_999` centavos. Las cantidades base tienen límite `1_000_000_000`, aunque cada circuito puede imponer restricciones adicionales. Los productos `UNIT` usan unidades enteras; `KG` utiliza gramos como cantidad base. La calculadora y las líneas de venta por peso limitan una porción a 99.999 gramos. No debe extrapolarse ese límite de venta a toda cantidad de inventario sin leer el contrato específico.

Los porcentajes suelen expresarse en puntos básicos: `10000` representa 100 %, `1250` representa 12,50 %. Esto permite validar descuentos sin depender de una cadena formateada. Para mostrar se emplea formato `es-AR`, moneda ARS, separador de miles y coma decimal. El texto de pantalla no es el formato interno de las operaciones.

## 2. Cálculo de una venta

`calculateSale` admite de 1 a 200 líneas y valida unidad, cantidad y precio. Para unidades, bruto de línea = precio en centavos × cantidad. Para kilos, bruto = precio por kilo × gramos / 1000, redondeado al centavo con la regla del código. La suma forma el subtotal.

El descuento puede ser inexistente, fijo o porcentual. No puede superar el subtotal. Cuando debe distribuirse un descuento total entre líneas, se calcula la parte proporcional entera y se distribuyen los centavos restantes por el mayor resto, con desempate determinista por posición. Así, la suma de descuentos por línea coincide con el descuento de la venta. Esto importa para devolver después una parte sin perder o inventar centavos.

Una cotización no es una confirmación. La confirmación vuelve a comprobar catálogo, revisiones, promociones, stock, pagos y cliente. Los datos enviados por el navegador se consideran una solicitud; el servidor no confía en un total escrito por el cliente.

## 3. Precio, costo y clasificación históricos

Una línea vendida conserva instantáneas: nombre, SKU, código, unidad, precio, cantidad, descuentos, neto y, cuando existe, costo y método. También guarda clasificación relevante como el nombre de categoría para análisis histórico.

Este diseño evita que actualizar el catálogo altere el significado de una venta anterior. Una categoría histórica no siempre coincide con la categoría que hoy tiene el producto. Un reporte debe decidir si quiere clasificar por el momento de la venta o por la clasificación actual; el código usa instantáneas en determinados desgloses de rentabilidad.

La ausencia de costo se representa como falta de información, no como costo cero. Si se vendió un producto sin costo conocido, no puede calcularse su ganancia como si todo el precio fuera margen.

## 4. Confirmación, transacciones e idempotencia

La atomicidad significa que los efectos de una operación se confirman juntos o se revierten juntos. Una venta no debe quedar con cabecera guardada y stock sin descontar por una excepción intermedia. Los servicios utilizan transacciones SQLite; las escrituras sensibles recurren a transacciones inmediatas para obtener el control de escritura antes de avanzar.

La idempotencia evita que un reintento duplique efectos. Una venta utiliza `checkoutKey`; las compras, movimientos y otros circuitos usan claves equivalentes. Se conserva la clave junto con un hash de la solicitud o resultado según el servicio. Repetir la misma operación recupera su resultado; reutilizar la clave con contenido incompatible produce conflicto en los circuitos que comparan ese hash.

Ejemplo: se confirma una venta, el servidor la guarda y la conexión se interrumpe antes de responder. El navegador consulta por la misma clave. Si existía, recupera esa venta. Crear otra clave y volver a cobrar produciría otra operación legítima desde la perspectiva del sistema; por eso la recuperación necesita conservar la identidad original.

No toda acción de lectura o todo registro del programa usa idéntico mecanismo. Los contratos distinguen `operationKey`, revisiones, claves de checkout y tokens de vista previa. No deben intercambiarse.

## 5. Concurrencia y revisión optimista

Muchos registros tienen `revision` y las modificaciones reciben `expectedRevision`. Si un formulario cargó la revisión 4 y otra persona ya guardó la revisión 5, no se aplica silenciosamente el contenido viejo. Se rechaza con conflicto y se solicita recuperar el estado actual.

La revisión se utiliza en productos, configuración, clientes, terminales, existencias, promociones, pedidos y otros objetos según su contrato. En operaciones que abarcan muchas filas, una vista previa o un hash de estado protege el conjunto. No reemplaza una transacción: la revisión detecta la decisión desactualizada y la transacción preserva integridad al escribir.

## 6. Pagos y efectivo

`validatePayments` valida hasta 20 partes y exige que sus importes aplicados sumen exactamente el total que recibe. Sólo `CASH` admite `tenderedCents`; si el dinero recibido es menor al aplicado, se rechaza. El vuelto es recibido menos aplicado. En medios no efectivos, el vuelto es cero y no se admite monto entregado separado.

Cuando existe crédito a cliente, el circuito distingue el componente pagado ahora del componente dejado a cuenta. La suma económica de ambos debe cubrir la venta conforme a `SalesService`; no se permite convertir una diferencia sin pagar en un descuento implícito.

El efectivo esperado del turno se construye con fondo inicial, pagos efectivos vinculados, ingresos, retiros y reintegros registrados. Los cobros en efectivo de cuenta corriente y pagos efectivos a proveedores se vinculan a movimientos del turno dentro de transacciones. El servicio exige una transacción activa en esas integraciones para evitar que una cuenta cambie sin que cambie la caja, o viceversa.

## 7. Inventario y estados

La función `stockState` tiene este orden de evaluación:

1. Si no se controla: `DISABLED`.
2. Si no se inicializó: `UNKNOWN`.
3. Si cantidad < 0: `NEGATIVE`.
4. Si cantidad = 0: `OUT`.
5. Si cantidad ≤ mínimo: `LOW`.
6. En otro caso: `OK`.

El orden evita llamar “agotado” a un producto que nunca se contó. El saldo base y el historial de movimientos permiten explicar el resultado. Una operación verifica rangos y rechaza stock insuficiente cuando no se habilitó expresamente el comportamiento negativo correspondiente.

Activar seguimiento de stock sobre información antigua no vuelve fiable el saldo por sí solo. La desactivación global del control invalida la inicialización de productos controlados para exigir revisión al retomarlo. Es preferible una advertencia “sin conteo” a un saldo presentado como exacto después de vender durante un período sin seguimiento.

## 8. Ubicaciones, lotes y transferencias

Las existencias por ubicación resuelven dónde está cada producto. Los saldos de lote por ubicación agregan la dimensión de partida. No deben sumarse indistintamente una tabla global y una tabla por lugar: pueden representar perspectivas del mismo inventario.

Un despacho descuenta o reserva materialmente la salida de origen mediante los movimientos definidos y conserva el envío en tránsito. Recibir acredita el destino con las cantidades aceptadas. Cancelar genera la reversión permitida por su estado. Se mantienen eventos, líneas y asignaciones de lotes para rastrear el traslado.

Para ventas de productos con lotes se seleccionan partidas activas, con cantidad positiva y no vencidas en la ubicación. El orden es vencimiento más próximo, fecha de creación e identificador como desempate; los lotes sin vencimiento van después. Esa estrategia se conoce como FEFO, “primero vence, primero sale”. La política no lee etiquetas físicas por sí sola.

Los conteos de productos con lotes necesitan reconciliar el detalle y el saldo agregado. Corregir sólo uno dejaría stock que el motor de venta no podría asignar a una partida válida.

## 9. Compras y costos

Una compra recibida conserva proveedor, líneas, cantidades, costo unitario, total y eventos. Su entrada actualiza el inventario cuando corresponde y participa del cálculo de costos. Un pedido todavía no recibido no debe afectar como disponible ese stock.

El costo se maneja con una tasa en microcentavos por cantidad base (`COST_SCALE = 1_000_000`). Para kilo se convierte el costo por kilo a costo por gramo; así se evitan pérdidas de precisión al vender porciones pequeñas. La conversión a centavos de una línea ocurre con redondeo controlado.

El promedio ponderado calcula `(cantidad anterior × costo anterior + cantidad recibida × costo recibido) / cantidad total`. Si no hay cantidad anterior positiva o no hay costo previo, se toma la referencia de la recepción conforme a la función de dominio. Una existencia anterior negativa no actúa como un peso negativo que distorsione el promedio.

Existen estados y eventos de costo. Fijar una referencia es distinto de registrar una compra. Las ventas conservan el costo conocido al confirmarse; cambiar el costo hoy no recalcula automáticamente su margen histórico. Anular una recepción requiere tratar cómo se compensa su efecto y qué movimientos posteriores impiden una reversión simple.

## 10. Promociones y precedencia

El motor recibe líneas de precio y reglas elegibles. Agrupa prioridades de mayor a menor. Dentro de una prioridad calcula candidatos y selecciona el de mayor descuento; usa identificador como desempate estable. Consume la cantidad utilizada y vuelve a evaluar las reglas restantes sobre lo disponible.

Tipos implementados:

- `PERCENT`: descuento proporcional sobre productos elegibles.
- `X_FOR_Y`: grupos de unidades en los que se llevan X y se pagan Y; se limita a productos vendidos por unidad en el cálculo.
- `QUANTITY_PRICE`: precio especial cuando se alcanza un umbral de cantidad.
- `COMBO_PRICE`: precio total para conjuntos de componentes y sus cantidades.

Se descartan candidatos que no generan ahorro positivo. El descuento se distribuye por líneas para conservar detalle y soportar devoluciones. Las asignaciones guardan promoción, revisión, línea, cantidad e importe. El algoritmo es determinista, pero no explora todas las combinaciones posibles para hallar un máximo global. Configurar prioridades equivale a una decisión comercial explícita.

## 11. Devoluciones y anulaciones

Una devolución parcial parte de la venta original, sus cantidades y devoluciones previas. Calcula el neto reintegrable sin superar el remanente. Conserva líneas, eventos, reintegro y tratamiento de stock/lotes. Los centavos se distribuyen de forma que varias devoluciones parciales no excedan el importe original.

Si hay deuda de cliente, se aplica primero la compensación que define el servicio y se calcula el reintegro restante. Cuando el reintegro es efectivo, se integra a un turno válido. No se da por hecho que todo el total devuelto tenga que salir en efectivo: parte puede cancelar una cuenta pendiente.

La anulación cambia el estado e incorpora su evento y motivo. No borra la venta. Los informes excluyen ventas anuladas de los importes de ventas completadas y muestran la información de anulación por separado. El estado actual puede modificar la lectura de un período pasado; el resumen semanal guardado preserva una versión anterior si ya existía.

## 12. Cuentas e imputaciones

Una cuenta de cliente se compone de obligaciones (`customer_receivables`), cobros, imputaciones y créditos. Una cuenta de proveedor utiliza obligaciones de compras, pagos, imputaciones y créditos. El saldo no debe mantenerse como un número aislado sin su origen.

Imputar significa asignar parte de un cobro o pago a una obligación concreta. Un pago parcial puede dejar remanente. Los contratos permiten orientar el pago a una obligación desde Agenda. La corrección de ventas y compras conserva el efecto sobre lo ya imputado y los créditos resultantes según el servicio.

La habilitación de crédito y su límite son decisiones del jefe/administrador. La venta verifica cliente activo, función habilitada y disponibilidad, incluso si el botón había quedado visible en un navegador con información vieja.

## 13. Reposición: cálculo explicable

El servicio toma una ubicación, una fecha de corte, días de referencia y días de cobertura. Cuando hay calendario configurado, calcula días abiertos observados excluyendo cierres declarados. La demanda histórica descuenta devoluciones registradas en el período consultado.

La disponibilidad considera existencia inicializada y descuenta cantidades bloqueadas o vencidas de lotes. La demanda diaria se estima dividiendo demanda neta no negativa por días abiertos observados. El objetivo es el mayor entre mínimo y demanda diaria × cobertura, redondeado hacia arriba.

La sugerencia descuenta disponibilidad y entradas de pedidos con fecha dentro del horizonte; luego redondea al múltiplo de compra. Si no existe inventario conocido o no hay mínimo ni historia suficiente, puede devolver una sugerencia indeterminada en lugar de fabricar un cero. Los pedidos sin fecha, vencidos y traslados sin ETA se presentan por separado. Las existencias de otras ubicaciones informan una alternativa de traslado.

No es una predicción estadística avanzada ni conoce estacionalidad futura, feriados no cargados o promociones que todavía no se realizaron. Es una propuesta basada en reglas y datos observados, revisable por el responsable.

## 14. Conteos, revisiones y agenda

Las sesiones de conteo tienen líneas propias, revisiones y estado. Guardar una línea no aplica inmediatamente un ajuste global. Al cerrar el circuito se validan revisiones y se escriben movimientos. El valor no contado se mantiene separado de cero.

La revisión de diferencia de caja conserva el cierre original y agrega su historial. Las fechas de cobro/pago se guardan con historial de cambios. Los controles comerciales registran qué se revisó, y los eventos de costo pueden invalidar la vigencia de una revisión previa. Los resultados de operaciones de Control permiten recuperar acciones idempotentes.

## 15. Funciones y dependencias

La configuración usa una revisión global y cambios transaccionales. Reposición requiere control de stock y compras; cuentas de proveedores requiere compras; crédito a clientes requiere clientes; ubicaciones y traslados requiere control de stock. Se valida además el estado del negocio antes de deshabilitar.

Ejemplos de bloqueo: pedidos confirmados/parciales pendientes al quitar reposición, traslados en tránsito al quitar ubicaciones, obligaciones pendientes de clientes o proveedores al quitar sus módulos relacionados. Los permisos de consulta de historia al desactivar ciertas funciones son restringidos y se tratan expresamente en el servicio.

## 16. Fechas, días comerciales y tiempo

Se conservan instantes UTC y claves de fecha comercial/mes local. Los reportes usan períodos definidos con la zona de Buenos Aires. La fecha comercial hace que una venta se agrupe por el día del negocio sin depender de cómo formatee la fecha cada navegador.

Algunas tareas técnicas usan otro criterio: la copia diaria agrupa por día UTC en su implementación. No debe suponerse que todo cambio de fecha del programa sucede a la medianoche argentina. El reloj del servidor importa para vigencias, vencimiento de sesiones, promociones y respaldos.

## 17. Reglas transversales para nuevas funciones

Cualquier desarrollo que cambie dinero o inventario debería resolver: permiso, función habilitada, validación de entrada, versión esperada, clave idempotente, transacción, auditoría, recuperación tras respuesta perdida y presentación comprensible del error. Un botón visible no satisface ninguno de estos controles por sí solo. Los límites específicos y nombres exactos están en los contratos y en el diccionario de base enlazados desde el índice.
