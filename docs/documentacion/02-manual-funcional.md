# 02. Manual funcional completo

[Volver al índice](README.md)

Los nombres de navegación corresponden a la organización actual. La visibilidad depende del rol y de las funciones activadas. Una pantalla que no aparece puede estar deshabilitada o fuera del permiso del usuario; no significa necesariamente que sus datos se hayan borrado.

## 1. Ingreso, cuenta y jornada

Cada persona entra con su usuario y contraseña. Los perfiles son vendedor, supervisor, jefe y administrador del sistema. Conviene asignar una cuenta a cada responsable para que ventas, cierres y movimientos tengan autor identificable. La cuenta administrativa técnica no reemplaza el usuario cotidiano de la dueña o del jefe.

En la web, la sesión puede vencer por inactividad, duración máxima o cambios de la cuenta. Un nuevo ingreso del mismo usuario reemplaza su sesión anterior bajo la configuración del runtime web. Si dos empleados necesitan atender simultáneamente, deben utilizar usuarios distintos y las terminales correspondientes.

Antes de vender se elige una terminal disponible. Abrir caja registra el efectivo inicial: es fondo para cambio, no una venta. El turno permite reunir los movimientos de esa jornada de atención. Cambiar una terminal o cerrar un turno no debe hacerse mientras se ignora el resultado de un cobro pendiente.

## 2. Inicio: tareas que necesitan atención

Inicio organiza pendientes en grupos con un total y una muestra limitada. Las categorías incluyen vencimientos, reposición, diferencias de caja, obligaciones de cobro/pago y revisión de precios. El usuario entra al módulo correspondiente para trabajar el conjunto completo. El panel no pretende mostrar miles de productos en una sola lista.

“Vender” lleva a Caja. El acceso a conteos inicia la revisión de inventario cuando está habilitada. El total de un grupo es una cantidad de pendientes, no necesariamente dinero ni operaciones nuevas del día. Una muestra breve no significa que los restantes registros hayan desaparecido.

Una buena rutina del jefe es comenzar por obligaciones urgentes, revisar faltantes importantes y atender la caja. El análisis comercial completo puede hacerse en otro momento. Esta separación reduce la cantidad de decisiones que el operador debe tomar al abrir el programa.

### Notificaciones y preferencias

La campana muestra avisos generados a partir del estado del negocio: stock bajo o agotado, lotes próximos a vencer o vencidos y, para jefe/administrador, diferencias de caja y una caída semanal que cumple las condiciones del servicio. No es un canal de mensajes externos ni un sistema de correo automático.

La lectura es individual por usuario y se asocia a una firma de la condición. Si cambia el dato que originó el aviso, puede volver a mostrarse como no leído. Marcar un aviso leído no repone stock, no descarta un lote y no resuelve una diferencia de caja: sólo registra que se vio. Inicio y la campana utilizan consultas y muestras diferentes; sus cantidades no tienen por qué coincidir una a una.

Las preferencias del espacio de trabajo permiten guardar la sección inicial dentro de las opciones autorizadas. Las vistas guardadas conservan filtros privados por usuario; el servicio limita a treinta vistas por persona. Elegir una vista facilita volver a una búsqueda habitual, pero no concede acceso a funciones o datos fuera del rol.

## 3. Caja: identificar y agregar productos

### Escaneo

Con el campo de código enfocado, el lector envía el identificador y termina con Enter. El programa busca ese código en el catálogo. Si el producto está activo y puede venderse, lo agrega o inicia el ingreso de peso. Un producto desconocido requiere buscarlo o cargarlo mediante el circuito autorizado; no se inventa una descripción o un precio.

Los códigos se conservan como texto, incluidos sus ceros iniciales. El lector debe estar configurado como teclado USB HID. El sonido del lector indica que pudo decodificar una etiqueta; la interfaz confirma si el sistema encontró el producto.

### Búsqueda y cantidades

La búsqueda permite seleccionar por nombre o identificador. En una venta por unidades, repetir un producto puede aumentar su cantidad. Las porciones por peso mantienen su identidad de línea para que una porción se pueda corregir sin alterar otra. Quitar una línea modifica el carrito, todavía no una venta confirmada.

El precio del catálogo se copia al borrador junto con su revisión. Si alguien modifica ese producto mientras se prepara la venta, el servidor puede exigir revisar la operación antes de confirmar. No conviene tratar esa advertencia como un error que debe saltarse: protege al negocio de cobrar con una versión incompatible.

### Productos por kilo

Se ingresa el peso leído de la balanza o el importe de una porción usando el diálogo correspondiente. Debe observarse explícitamente la unidad mostrada: gramos y kilos no son intercambiables. Para un producto de $12.000 por kilo, 250 gramos representan $3.000. La existencia de ese producto también se controla en una unidad base equivalente a gramos.

La calculadora ayuda a cargar la porción, pero no recibe automáticamente el peso de cualquier balanza. Una integración de balanza exige otro protocolo y pruebas del equipo real.

## 4. Carrito, promociones y descuento

El carrito muestra productos, cantidades, subtotal, descuentos y total. Las promociones se calculan en función de los productos y cantidades presentes. Agregar o quitar una unidad puede cambiar la promoción aplicable. El sistema conserva en la venta qué promociones participaron y sus importes.

El descuento manual permite porcentaje o importe fijo según el formulario. Debe distinguirse del ahorro por promoción. La cotización del servidor determina el resultado final; no se acepta que el navegador decida libremente cuánto cobrar o cuánto descontar.

Cancelar la venta en curso descarta el borrador del carrito. Anular una venta ya confirmada es otra acción, con consecuencias de stock y dinero y mayores permisos. Esta distinción es importante al capacitar al usuario.

## 5. Cliente desde Caja

Se puede elegir un cliente existente desde el carrito o desde el cobro. También se puede crear uno desde esos lugares: nombre obligatorio y contacto opcional. Al guardar se selecciona para la operación actual. Cancelar la creación vuelve al contexto anterior y conserva el carrito.

El vendedor puede crear los datos básicos necesarios para atender. No puede aprovechar ese formulario para habilitar crédito, cambiar su límite o editar arbitrariamente la ficha de otro cliente. El jefe o administrador habilita la cuenta corriente y define el límite desde el módulo correspondiente.

Asociar un cliente a una venta no obliga a fiarla. Puede pagar de contado y quedar identificado. Para dejar saldo a cuenta, el cliente debe estar activo, tener crédito habilitado y disponibilidad suficiente. Una ficha recién creada no debe interpretarse como autorización automática para fiar.

## 6. Cobrar una venta

1. Revisar el total calculado.
2. Elegir el cliente si la venta debe identificarse o quedar a cuenta.
3. Seleccionar el medio de pago.
4. Si se recibe efectivo, ingresar lo entregado por el cliente y revisar el vuelto.
5. Si se combinan medios, dividir el pago y completar los importes de cada parte.
6. Comprobar que el importe aplicado cubra el total que se paga en el momento.
7. Confirmar expresamente la venta.

Los medios configurables son efectivo, débito, crédito, transferencia y otro. “Crédito” en esa lista se refiere a tarjeta de crédito; “dejar a cuenta” corresponde a la cuenta corriente del cliente. No son equivalentes.

Sólo efectivo admite monto entregado y vuelto. Los pagos se registran por lo aplicado a la venta, no por el efectivo bruto antes de devolver cambio. Dividir el pago no permite que la suma quede corta o exceda el total exigido por el servidor.

Si se corta la conexión al confirmar, no debe generarse otra venta a ciegas. El programa conserva una clave de operación para consultar si la anterior se confirmó. Una respuesta que no llegó al navegador puede corresponder a una venta correctamente guardada en el servidor.

## 7. Borradores y recuperación

Los borradores permiten conservar una venta o una compra que todavía se está preparando. El frontend mantiene su estado y envía escrituras ordenadas; también existen datos locales de recuperación para situaciones pendientes. La recuperación no transforma al navegador en una caja offline autónoma.

Cuando aparece una operación pendiente, la tarea es resolver su estado: recuperar el resultado, reintentar de forma idempotente o descartar el borrador cuando se haya confirmado que no produjo efectos. Borrar manualmente el almacenamiento del navegador puede perder esa ayuda; por eso no es una primera solución recomendable ante una duda de cobro.

## 8. Ingresos, retiros y cierre de caja

Un ingreso o retiro de efectivo debe registrarse con su motivo. Esto permite explicar por qué el dinero físico no coincide sólo con las ventas en efectivo. Las transferencias y tarjetas se controlan en sus medios, pero no aumentan por sí mismas el efectivo del cajón.

Al cerrar se cuenta lo que hay y se compara con el esperado. El cierre conserva el resultado y la diferencia. La revisión posterior de una diferencia agrega una explicación o estado de revisión; no reescribe el importe original para que deje de verse el desvío.

Un terminal con turno abierto no puede desactivarse como si no estuviera trabajando. El responsable debe cerrar o resolver el turno primero. El historial permite consultar quién abrió y cerró, el fondo inicial, los movimientos y el resultado.

## 9. Ventas, detalle, anulaciones y devoluciones

El historial permite filtrar por fechas y estado, recorrer páginas y abrir el detalle. El detalle conserva nombres, unidades, precios y costos relevantes del momento de la venta, además de sus pagos y eventos. Cambiar hoy el nombre o precio del producto no debe reemplazar el comprobante histórico.

**Anulación:** invalida una venta mediante una operación registrada. Se revisa una vista previa y se confirma con las condiciones requeridas. Reversa los efectos permitidos por el circuito, en lugar de eliminar sus filas históricas. Si el estado cambió, la confirmación debe recalcularse.

**Devolución:** permite seleccionar cantidades de líneas vendidas. No puede devolverse más que lo vendido menos lo ya devuelto. El importe devuelto respeta el precio y descuento originales; no toma el precio actual del catálogo. El destino de la mercadería y el tratamiento del dinero se resuelven en el flujo de devolución. Si existe saldo a cuenta, parte de la devolución puede reducir esa deuda antes de producir un reintegro efectivo.

Una devolución de mercadería dañada no debe usarse para aumentar stock vendible sin revisar su destino. En productos con lotes, también importa qué partida se está recuperando.

## 10. Comprobantes y reimpresión

El sistema genera comprobantes en formatos térmicos de 58 y 80 mm y en A4. El comprobante se construye con una instantánea de la operación y conserva su estado de impresión. La cola permite volver a encontrar documentos pendientes.

La impresión utiliza el diálogo del sistema/navegador. Desde allí puede elegirse una impresora o guardar como PDF cuando el entorno lo permite. Registrar el intento o marcar un comprobante como impreso no constituye una confirmación física de que salió el papel: una impresora puede no tener papel o el usuario puede cancelar el diálogo.

La reimpresión debe distinguirse de una venta nueva. El documento sigue representando la misma operación. La presencia de un formato A4 similar a una factura no lo convierte en una factura fiscal autorizada.

## 11. Productos, categorías y marcas

El catálogo contiene nombre, SKU, identificadores, unidad de venta, precio, estado y configuración de stock, entre otros campos del contrato. Categoría y marca son clasificaciones diferentes: “Lácteos” agrupa un rubro; una marca identifica un fabricante o línea comercial. Se usan para buscar, filtrar, exportar y analizar.

Un producto puede desactivarse cuando deja de venderse. Desactivarlo es preferible a borrar su identidad, porque ventas, compras y movimientos históricos siguen referenciándolo. El precio se cambia mediante revisión controlada, y el stock se modifica por movimientos, no reemplazando un número sin explicación.

Si el artículo trae código, se registra el leído del envase. Si no lo trae, el sistema puede proponer un código interno y generar una etiqueta. Ese código identifica el producto dentro de la instalación; no es una alta automática en un registro comercial internacional ni descarga datos del fabricante.

### Importación masiva

La importación utiliza CSV UTF-8, con vista previa de altas, modificaciones, cambios de precio y aperturas de stock. Las columnas actuales son `sku`, `barcode`, `nombre`, `precio_ars`, `unidad`, `activo`, `categoria`, `marca`, `stock_inicial` y `stock_minimo`. También existe compatibilidad con una plantilla anterior sin marca.

Antes de aplicar deben corregirse filas inválidas y revisar los cambios. El archivo admite separador punto y coma o coma según su encabezado y los importes se interpretan con las reglas locales del importador. La vista previa tiene una vigencia limitada y no autoriza a aplicar sobre datos que cambiaron sin validar sus revisiones.

Exportar XLSX e importar CSV son capacidades distintas. No se debe prometer que cualquier planilla descargada pueda volver a importarse sin ajustarse a la plantilla.

## 12. Revisión comercial de productos

La revisión ayuda a encontrar costos faltantes, costos superiores al precio, margen bajo, costos actualizados y precios que llevan tiempo sin revisar. También permite identificar productos nunca vendidos o sin ventas recientes, diferenciando casos donde todavía no hay historial suficiente.

Marcar un artículo como revisado no aumenta automáticamente su precio. Registra que el responsable lo evaluó. Un cambio posterior del costo puede volver a generar la necesidad de revisión. Las decisiones se conservan con información de auditoría.

Las actualizaciones masivas de precios tienen una etapa de vista previa y confirmación. El jefe debe mirar alcance, selección e importes resultantes antes de confirmar. No conviene usar la herramienta para modificar todo el catálogo cuando se pretendía actualizar una categoría filtrada.

## 13. Stock y movimientos

La pantalla distingue sin conteo, agotado, bajo mínimo, negativo, disponible y sin control. “Sin conteo” no equivale a cero: significa que no hay una base fiable para el seguimiento. El mínimo es una referencia de reposición, no una prohibición de venta.

Las entradas y salidas se registran por tipo y motivo. Un ingreso por compra debe utilizar el circuito de recepción para conservar también proveedor y costo. Una merma representa una pérdida de mercadería. Un ajuste corrige una diferencia identificada. El historial permite reconstruir por qué cambió la existencia.

Un saldo negativo requiere el tratamiento explícito previsto por la operación, incluyendo motivo cuando corresponde. La existencia de esa posibilidad sirve para registrar una realidad excepcional; no convierte un inventario negativo en una situación normal o deseable.

## 14. Conteos recuperables

Se elige la ubicación y, cuando corresponde, la categoría a contar. El conteo se guarda como sesión recuperable. Las líneas no contadas permanecen distintas de las contadas en cero. Escanear ayuda a localizar artículos, pero la cantidad debe representar el recuento físico.

Al aplicar, se comprueba que el inventario observado no haya cambiado de manera incompatible desde el inicio. Si se vendió o recibió mercadería durante el conteo, puede aparecer un conflicto que debe revisarse. Esto evita que un recuento viejo sobrescriba movimientos nuevos.

El criterio operativo es trabajar por sectores o momentos de menor movimiento. Un conteo no debe convertirse en un reemplazo global de existencias sin entender qué mercadería se contó y cuál quedó fuera.

## 15. Lotes y vencimientos

El seguimiento por lotes permite registrar partida, fecha de vencimiento, estado y cantidad. La habilitación sobre un producto con stock exige reconciliar las cantidades para que las partidas correspondan con el total existente.

En ventas, la asignación automática prioriza los lotes que vencen antes entre los disponibles y habilitados. Los bloqueados o vencidos quedan fuera de esa asignación. Los lotes sin fecha se ordenan detrás de los fechados. Esa lógica ayuda al control, pero el empleado debe retirar físicamente la mercadería del lote correspondiente.

La vista de vencimientos se filtra por período y ubicación y se pagina. Desde un resultado se abre el lote para revisar la situación. Bloquear una partida no equivale a eliminar sus unidades físicas: requiere después la decisión comercial o movimiento que corresponda.

## 16. Proveedores y recepción de compras

Un proveedor conserva identidad y datos de contacto operativos. Puede desactivarse sin borrar sus compras y deudas previas. Desde Compras se selecciona el proveedor, se agregan productos por búsqueda o escaneo, se indican cantidades y costos y se revisa el total.

La recepción confirmada registra la entrada de mercadería y el costo. Puede incorporar lotes y ubicación según las funciones activas. El borrador permite preparar la carga sin aumentar existencias antes de recibirla. Una compra recibida tiene una clave propia para resolver reintentos sin duplicar el ingreso.

El costo sugerido o último costo es una ayuda; debe cotejarse con la compra actual. Anular una compra puede afectar existencias, costos y cuenta del proveedor, por lo que el sistema utiliza validación y vista previa en lugar de permitir borrar arbitrariamente el documento.

## 17. Pedidos y reposición

La reposición evalúa una ubicación, sus existencias, ventas observadas, calendario de apertura, mínimos, pedidos esperados y múltiplos de compra. Presenta sugerencias que el responsable puede revisar. Una propuesta de compra no es una orden enviada automáticamente a un proveedor.

El pedido pasa por preparación y confirmación, y puede tener fecha esperada. Se registran recepciones parciales, cantidades recibidas y cantidades pendientes. Recibir un pedido reutiliza el circuito de compras para que las existencias, costos, lotes y obligaciones mantengan una misma lógica.

Los pedidos vencidos o sin fecha y los traslados en tránsito se muestran como información para decidir. El cálculo no presupone que toda mercadería en camino llegará dentro del horizonte elegido. También indica existencias de otras ubicaciones para considerar un traslado antes de comprar.

## 18. Ubicaciones y traslados

Cada ubicación es un lugar de mercadería. Una terminal puede estar asignada al salón de ventas mientras una cámara o depósito conserva reserva. Una ubicación no se trata como una empresa con facturación propia independiente de toda la instalación.

Al preparar un traslado se eligen origen, destino y artículos, revisando lo disponible en origen. Despachar mueve la mercadería a un estado en tránsito; recibir registra lo que efectivamente llegó y sus diferencias según el contrato. Cancelar sigue un circuito específico de reversión. No debe repetirse el despacho para “forzar” que aparezca la recepción.

El historial conserva cada envío y sus productos. Un filtro por estado permite distinguir recibido, cancelado y en tránsito. La exportación del stock por varias ubicaciones identifica el lugar de cada existencia, para no confundir unidades de distintos depósitos.

## 19. Clientes y cuentas corrientes

El cliente puede existir sólo para identificar ventas, o tener crédito habilitado con un límite. La disponibilidad depende de sus obligaciones pendientes. Un cobro reduce deuda y conserva cómo se imputó. Los pagos parciales permiten seguir una cuenta sin exigir que el cliente cancele todo junto.

El jefe controla el límite y la habilitación. La pantalla de cuenta detalla obligaciones, cobros y posibles créditos. Desactivar una ficha no debe usarse para esconder una deuda. La agenda permite acordar cuándo se espera cobrar, sin inventar fechas para operaciones históricas que nunca las tuvieron.

## 20. Cuentas de proveedores y agenda

Una compra puede originar una obligación hacia el proveedor. Los pagos se registran con su importe y aplicación. La cuenta permite distinguir cuánto se compró, cuánto se pagó y qué saldo resta. La anulación de una compra debe tratar también las imputaciones y créditos relacionados.

La agenda reúne cobros a clientes y pagos a proveedores, con filtros de obligaciones vencidas, de la semana, siguientes y sin fecha. Se puede acordar una fecha, revisar su historial e imputar un pago a una obligación específica. Una fecha modificada no borra la trazabilidad del acuerdo anterior.

## 21. Promociones

Las promociones pueden reducir un porcentaje, ofrecer llevar X y pagar Y, fijar un precio a partir de una cantidad o formar un combo con componentes. Se define su alcance, vigencia y prioridad con las validaciones del formulario.

El motor las aplica al carrito; el usuario no necesita recordar cada regla en el mostrador. Las cantidades consumidas por una promoción no vuelven a utilizarse indiscriminadamente en otra. La prioridad configurada importa y el algoritmo no se presenta como un optimizador global de todas las combinaciones posibles.

Antes de usar una promoción en producción conviene probar: cantidad menor al umbral, cantidad exacta, cantidad superior, repetición de productos y convivencia con descuento manual. Una promoción mal configurada puede ser técnicamente válida y comercialmente inconveniente.

## 22. Resultados y exportaciones

El resumen mensual muestra ventas netas, cantidad de ventas, ticket promedio, evolución diaria, medios de pago, productos destacados, margen y situación de mercadería. El resumen semanal conserva versiones para comparar lo que se informó en un momento con un recálculo posterior.

El botón Exportar Excel toma los filtros del contexto y permite ajustarlos, incluidas selecciones múltiples donde corresponden. Exporta todas las coincidencias hasta el límite permitido, no sólo la página visible. La hoja de filtros explica qué se incluyó. El capítulo 09 detalla cada fórmula y las diferencias entre ventas, efectivo, crédito y rentabilidad.

## 23. Administración y ayuda

Configuración administra nombre del negocio, moneda soportada por el sistema, medios habilitados, terminales y funciones. Los cambios usan revisión para detectar que otro usuario modificó la configuración simultáneamente.

Usuarios permite administrar perfiles según la jerarquía autorizada. Actividad muestra acciones y, para las operaciones que lo registran, el estado anterior y posterior con campos permitidos. Los eventos históricos que no tenían desglose no adquieren mágicamente información retroactiva.

Copias permite generar, descargar, cargar, inspeccionar y restaurar respaldos mediante el circuito protegido. Restaurar vuelve el conjunto de datos al momento del respaldo; no es una forma de importar algunos productos. Ayuda reúne explicaciones buscables; Mi cuenta concentra acciones de la sesión y contraseña.

## 24. Circuito diario recomendado

Al abrir: iniciar sesión, seleccionar terminal, abrir turno y revisar pendientes urgentes. Durante la atención: escanear o buscar, verificar cantidades y cobrar; registrar ingresos, retiros y cobros de cuenta con su circuito. Al recibir mercadería: cargar la compra en la ubicación correcta, verificar costo y lotes. Al terminar: resolver operaciones pendientes, contar efectivo, cerrar turno y revisar diferencias. Periódicamente: contar sectores, revisar vencimientos, precios, deudas y resultados, y comprobar que existan respaldos recuperables.
