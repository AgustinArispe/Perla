# Evolución modular de Perla Negra

Fecha: 2026-10-05. Alcance aprobado por Agus e implementado en entregas verificadas.

## Criterio de producto

El programa debe servir a una dueña que atiende sola y acompañar la incorporación de personal, más cajas y sucursales. La complejidad aparece cuando el negocio la necesita. Configuración > Funciones controla qué se usa; los permisos controlan quién lo usa. Marca y configuración pertenecen al negocio, no a una variante diferente del código.

Núcleo permanente: acceso, catálogo mínimo, ventas/pagos, históricos, trazabilidad, garantías de caja y recuperación. Apagar una herramienta no desactiva esas garantías. Los módulos optativos ocultan navegación, campos y acciones nuevas, pero conservan registros y correcciones de operaciones previas.

## Situación revisada

- Stock ya incluye apertura, conteo, ingreso, merma, movimientos, mínimos y reversión por anulación. Ampliar clasificación y conexiones con compras, devoluciones, lotes y traslados.
- Caja ya incluye turnos, efectivo inicial, entradas/retiros, cierre, esperado, contado y diferencia. Ampliar conceptos, documentos vinculados y conciliación por medio de pago.
- Dashboard ya incluye ventas, ticket promedio, medios de pago, ranking, stock bajo y comparación con el mes anterior. Ampliar períodos y rentabilidad cuando existan costos confiables.
- Productos ya tienen categorías, marcas y precios. Faltan costos, cambios masivos de precios y promociones automáticas.
- Configuración actual maneja nombre, medios de pago y terminales. Aún no hay un ciclo de activación/desactivación de módulos.

## Orden y división en specs

Los números 015–023 ordenan las entregas. Las etapas 014–023 están implementadas y verificadas. Cada ampliación futura pasará por el mismo proceso antes de habilitarse.

| Entrega | Spec prevista | Resultado | Requisitos principales |
|---|---|---|---|
| 1 | [014 Funciones por negocio](../specs/014-business-modules/spec.md) | Activación, dependencias, permisos, historial y salida segura | Base actual |
| 2 | 015 Proveedores y compras | Registrar mercadería recibida, costos y pagos simples | 014; Stock opcional |
| 3 | 016 Costos y rentabilidad | Costo histórico por venta y margen bruto | 015 o costos manuales; Informes |
| 4 | 017 Stock, lotes y devoluciones | Motivos, vencimientos y reversión física/financiera correcta | 014; Stock; Compras mejora recepción |
| 5 | 018 Precios y promociones | Cambios masivos y ofertas automáticas en Caja | 014; Catálogo y Ventas |
| 6 | 019 Notificaciones y comparativos | Avisos accionables y comparación de períodos | 014; fuentes activas e Informes |
| 7 | 020 Caja y pagos a proveedores | Salida de dinero vinculada y saldos pendientes | 015; Caja; cuenta de proveedores opcional |
| 8 | [021 Clientes y cuenta corriente](../specs/021-customers-credit/spec.md) | Venta a cuenta, cobros y saldos | 014; Clientes; apagado por defecto |
| 9 | [022 Ubicaciones y traslados](../specs/022-locations-transfers/spec.md) | Depósitos/sucursales, stock y acceso por ubicación | 014; Stock para traslados |
| 10 | [023 Consolidación y escalabilidad](../specs/023-consolidation-scale/spec.md) | Indicadores por local y pruebas de concurrencia/aislamiento | 022; Informes |

Las dependencias de negocio mandan sobre los números: la estructura de ubicaciones se prepara en cada modelo nuevo; el uso de múltiples locales llega después. No se implementa una plataforma multiempresa compartida por asumir que habrá varios negocios.

## Configuración: experiencia y reglas

Una página «Funciones» con grupos Venta, Mercadería y Administración. Cada fila presenta icono, nombre, una frase de utilidad y estado. No hay una lista gigante de parámetros. Solo funciones entregadas aparecen como activables.

Al tocar un interruptor se calcula el impacto. Un cambio simple se guarda directamente con confirmación visible; si necesita otras funciones o hay pendientes, se presenta una revisión breve y una sola acción «Aplicar cambios». No se activan requisitos sin explicarlo. No se desactivan dependientes en secreto.

Ejemplos:

- «Lotes necesita Stock. Se activarán ambos».
- «Quedan 3 pagos pendientes. Podés terminar de pagarlos sin registrar nuevas compras a cuenta».
- «Volviste a activar Stock. Contá las existencias para retomar el control».

| Función | Dependencia obligatoria | Integración opcional |
|---|---|---|
| Compras | Proveedores; registro de costo de compra | Stock, lotes, cuenta de proveedores |
| Rentabilidad | Costos e Informes | Compras y Stock para costo promedio |
| Lotes y vencimientos | Stock | Compras para carga automática de lotes |
| Promociones | Catálogo y Ventas del núcleo | Categorías/marcas como filtros de selección |
| Notificaciones comerciales | Ningún módulo comercial adicional | Avisos de las funciones habilitadas y autorizadas |
| Cuenta de proveedores | Proveedores y Compras | Caja para pagos en efectivo |
| Cuenta de clientes | Clientes y Ventas | Caja para cobrar saldos |
| Traspasos | Stock y varias ubicaciones | Lotes si están habilitados |
| Comparativos comerciales | Informes | Rentabilidad si hay costos confiables |

Estados de ciclo de vida: preparación, activo, solo pendientes cuando hay compromisos, desactivado con consulta histórica. El interruptor no borra datos. Desactivar Lotes detiene nuevas asignaciones por lote y conserva el stock global; reactivar exige distribuir existencias actuales entre lotes antes de prometer trazabilidad. Desactivar Stock invalida la continuidad de existencias; reactivar requiere conteo. Operaciones pasadas se corrigen por movimientos vinculados, teniendo en cuenta ajustes posteriores.

Los carritos abiertos se conservan; antes de cobrar se verifica configuración, precios y promociones vigentes. Si el importe cambia, se explica y se vuelve a confirmar. Consultar una venta ya confirmada por su clave funciona incluso si desde entonces se apagó un módulo.

## 015 — Proveedores y compras fáciles

Lista de proveedores con nombre, contacto y última compra; saldo aparece solo con cuentas habilitadas. Alta rápida: nombre obligatorio, teléfono opcional. Datos fiscales, domicilio y notas quedan en «Más datos».

«Nueva compra»: elegir proveedor, escanear/buscar mercadería, indicar cantidad y costo de cada renglón, confirmar recepción. Fecha actual y último costo son sugerencias editables; no se confirma mercadería aún no recibida. «Pagado» o «Pendiente» aparece si se usan cuentas; el registro de pago no procesa una transferencia bancaria.

Una recepción confirma documento, costo, movimiento de stock/lote cuando corresponde y deuda/pago vinculado en una operación indivisible. Reintentar no duplica. Registrar compra no cambia el precio de venta; ofrecer «Revisar precios» luego de guardar.

Stock apagado: conserva compra y costo sin simular cantidades. Lotes apagado: no pide vencimiento. Sin cuenta corriente: registrar únicamente compras pagadas; no esconder una deuda pendiente para simplificar la pantalla.

Primera entrega: recepción completa, borrador y corrección por reversión controlada. Recepciones parciales/órdenes pendientes requieren una ampliación específica. No mezclar desde el inicio una orden, factura del proveedor y entrega como si fueran el mismo evento.

## 016 — Costos y rentabilidad comprensible

Mostrar «Margen bruto», basado en venta neta de descuentos menos costo de mercadería. No presentarlo como ganancia final: gastos, impuestos y comisiones requieren datos propios.

Para stock controlado, proponer costo promedio ponderado por producto y ubicación. Una compra actualiza el costo para operaciones posteriores; cada venta conserva costo y método usados. Para stock sin seguimiento, permitir costo de referencia manual con fecha y marcarlo como estimación. Si falta costo, mostrar «Sin costo» y cobertura del cálculo; nunca convertirlo a cero ni mostrar un 100% de margen ficticio.

Dinero y cantidades mantienen precisión entera; valores intermedios del costo promedio deben conservar precisión suficiente y tener una regla explícita de redondeo antes de construir el modelo. Una venta posterior a falta de stock puede tener costo provisional; no cambiar márgenes históricos silenciosamente al llegar la compra.

Vista principal: venta neta, costo, margen bruto y cobertura de costos. Desglose por producto/categoría al abrir detalle. Solo jefe/administrador ve márgenes globales. Quien puede cargar compras puede conocer su costo de compra, pero no obtiene acceso automático al dashboard.

## 017 — Stock, lotes y devoluciones

Mantener acciones claras: «Ingresar mercadería», «Registrar merma», «Contar stock», «Ver movimientos». Añadir consumo interno y devoluciones con motivo elegible; no exigir escribir la misma explicación repetidamente.

Lotes se activa por negocio y luego por producto. Pedir vencimiento solo donde se controla; el código de lote interno puede generarse. Sugerir salida del lote que vence primero, respetar cantidad disponible y no incluir lotes vencidos/bloqueados como vendibles. Elegir manualmente otro lote exige permiso y motivo, sin invadir el flujo del cajero cuando existe una asignación válida.

Activar lotes sobre mercadería existente exige identificar los lotes/conteos actuales. No inventar trazabilidad previa. Un producto vencido no se convierte en merma automáticamente: una persona registra lo que ocurrió.

Devolución parcial: elegir venta y renglones, cantidad devuelta, destino «Reingresa» o «Merma» y reintegro. Validar cantidad acumulada contra lo vendido, prorratear descuentos/promos históricos y conservar el vínculo con el pago y el turno del reintegro. Nunca reingresar automáticamente pescado devuelto si su estado físico no lo permite. Costos, lotes y saldos financieros se revierten con una única operación, o no cambian.

## 018 — Precios y promociones automáticas

Actualización de precios: elegir productos por búsqueda/categoría/marca, indicar porcentaje o precio, ver antes/después y confirmar. Mostrar cuántos artículos cambian. Revalidar ediciones concurrentes. Guardar autor, fecha y precio anterior; para revertir, generar otro cambio sin sobrescribir ediciones posteriores.

Pantalla propia «Promociones» con activas, programadas y finalizadas. Crear desde plantillas:

- Descuento porcentual sobre artículos elegidos.
- X por Y unidades del mismo producto, por ejemplo 3×2.
- Precio especial desde una cantidad, con unidad o peso explícito.
- Combo de productos con cantidades y precio final.

Tres secciones cortas: «Tipo de promoción», «Productos y beneficio», «Vigencia». Nombre sugerido y fechas opcionales con vigencia desde ahora. Mostrar un ejemplo calculado antes de activar. Reservar límites/repeticiones/prioridad para «Más opciones»; no crear un editor genérico de reglas.

Caja aplica automáticamente la promoción al escanear, cambiar cantidad o quitar un artículo. Mostrar una etiqueta breve junto a los renglones afectados y «Ahorrás $…» en el resumen. El cajero no necesita acordarse de ninguna oferta.

Reglas propuestas para la primera versión:

- Por defecto, promociones no acumulables sobre las mismas unidades. Diferentes cantidades no consumidas pueden participar de otras ofertas.
- Prioridad explícita para resolver combos que compiten; misma prioridad elige el mayor ahorro inmediato y desempata de forma estable. El asistente de creación advierte el solapamiento y muestra ejemplos. No prometer que esa política obtiene siempre el óptimo global entre combos.
- El descuento manual global es una alternativa al conjunto de promociones automáticas, con comparación del total antes de reemplazarlas. Acumulación avanzada queda para una regla posterior.
- 3×2 opera sobre unidades enteras; peso usa umbrales y cantidades en gramos. El excedente y la repetición de combos deben aparecer en el ejemplo de la plantilla.
- Definir prorrateo de cada ahorro en las líneas, con suma exacta al total. Guardar nombre, versión, cantidades y descuento aplicado como historia de la venta.
- Vigencia según hora del negocio confirmada por servidor. Si cambia el total entre vista previa y confirmación, conservar el carrito y pedir revisar. La confirmación final valida todas las promociones, no confía en el descuento enviado por la pantalla.
- Una promoción pausada conserva sus ventas previas. Desactivar Promociones retira beneficios de nuevas confirmaciones, con revisión de carritos abiertos.

## 019 — Notificaciones y comparativos

Campana con cantidad pendiente y lista breve: aviso, momento y una acción. Ejemplos: «Quedan 2 kg de salmón · Ver stock», «Tres lotes próximos a vencer · Revisar», «Hay una diferencia de caja · Ver cierre».

Agrupar repetidos y actualizar un aviso existente. Leído no significa resuelto: se resuelve cuando cambia la condición. No generar una notificación nueva por cada venta del mismo producto bajo mínimo. Separar alertas operativas deterministas de observaciones comerciales; ventas bajas requiere comparación suficiente, período equivalente y nunca aparece para vendedor/supervisor sin permisos de informes. Avisos de seguridad/errores de guardado permanecen aunque se apague la campana comercial.

El supervisor recibe avisos de stock/lotes; jefe agrega caja, pagos e informes. Los avisos heredan permisos y funciones; no filtran costos por el texto. Sin correo, WhatsApp ni push externo en esta primera etapa.

Comparativos: hoy, semana, mes y rango. Período actual incompleto se compara con igual tramo anterior. Mostrar fechas, importe y porcentaje; con base cero usar «Sin base de comparación». No mezclar kilos y unidades. En ventas a crédito, distinguir venta devengada y dinero cobrado; cobrar deuda no vuelve a sumar una venta.

## 020 — Caja y cuenta de proveedores

En la ficha del proveedor, encabezado con saldo y acciones «Nueva compra» y «Registrar pago»; pestañas Compras y Movimientos. Cargar pago requiere importe, fecha y medio. Imputación sugerida a los pendientes más antiguos, editable; impedir sobreamortizaciones silenciosas y permitir anticipos únicamente con saldo identificado.

Un pago en efectivo desde el turno abierto crea una única salida vinculada. Si ya estaba registrado como retiro, se concilia el registro existente en vez de duplicar el egreso. Transferencia/débito no descuenta efectivo de caja. Pagos parciales conservan saldo. Anular una compra ya pagada produce crédito/devolución del proveedor según el caso, no hace desaparecer el pago.

Cierre mantiene efectivo esperado, contado y diferencia; tarjetas/transferencias muestran total registrado y ajustes de conciliación identificados. No tratar una venta con tarjeta como efectivo esperado ni como confirmación bancaria real.

## 021 — Clientes y cuenta corriente opcional

Apagado por defecto. Clientes puede funcionar como libreta/historial sin crédito. Alta mínima: nombre; contacto opcional. Venta habitual no obliga a identificar una persona.

Con crédito habilitado, Caja permite «A cuenta» para un cliente autorizado y con límite disponible. Límite y saldo se validan al confirmar, también con ventas concurrentes. Crédito es un saldo pendiente, no otro medio de dinero recibido. Supervisor no modifica límites por defecto; jefe/admin los administra.

Ficha con saldo y «Registrar cobro». Cobro parcial reduce deuda e ingresa efectivo al turno solo si ese fue el medio. No aumenta ventas mensuales. Devoluciones revierten primero deuda pendiente y luego restituyen importes efectivamente cobrados, con trazabilidad y límites contra el documento original.

No se puede apagar y ocultar saldos pendientes: modo «Solo pendientes» admite cobrarlos sin nuevas ventas a cuenta.

## 022–023 — Crecimiento sin complejidad anticipada

Primero conservar servidor central e instancia única para la base actual. Medir contención antes de cambiar motor; no desplegar varias API sobre el mismo SQLite por añadir sucursales.

Los modelos nuevos distinguen negocio, ubicación, terminal y turno. Primeras pantallas usan una ubicación predeterminada invisible. Antes de habilitar varias ubicaciones, migrar también datos existentes, permisos, consultas, backups e históricos con pruebas de aislamiento.

Traslado: origen prepara y despacha; mercadería figura en tránsito; destino recibe. Reintentos, diferencias y cancelación se registran sin duplicar stock. Lotes/costos viajan con el movimiento. Reporte consolidado solo del jefe y respetando alcance autorizado. Varios negocios en una plataforma compartida será otra arquitectura con aislamiento explícito.

## Reglas visuales y de uso para todas las entregas

- Identidad Perla Negra: tinta, marfil, latón y superficies claras, usando DESIGN.md vigente.
- Máximo cinco entradas editables visibles por sección como objetivo; filas de productos y campos condicionales necesarios quedan aparte. No convertir formularios breves en asistentes largos innecesarios.
- Una acción principal por tarea. Verbos concretos: «Recibir compra», «Guardar promoción», «Registrar pago».
- Estados vacíos con una acción útil; sin párrafos explicando una pantalla evidente.
- La ayuda extensa vive en Ayuda. Microayuda puntual cuando evita un error real de dinero, stock o fecha.
- Totales y saldo legibles; campos etiquetados, foco claro, errores vinculados y contrastes accesibles.
- En celular, fichas/listas adaptadas, acciones alcanzables y formularios de una columna. Tablas complejas pueden tener un área de scroll propia; nunca desbordar toda la página.
- Crear proveedor/producto sin perder una compra en curso. Cerrar un modal devuelve al punto de trabajo.
- La dueña puede preparar configuraciones desde celular; Caja conserva la velocidad del scanner y teclado de PC.

## Criterio técnico para el próximo plan

Un catálogo central de capacidades y dependencias; configuración versionada; comprobación central de permisos y funciones al despachar operaciones. La vista usa el mismo estado efectivo y no interpreta por su cuenta reglas diferentes.

Aplicar la configuración y las operaciones en transacciones coherentes; guardar revisión de reglas en la venta. La consulta por clave idempotente de una operación confirmada debe recuperar su resultado original antes de exigir una nueva evaluación de módulos.

No sumar consultas por cada interruptor en cada escaneo. Preparar un estado efectivo cacheado por revisión, índices de promociones por producto y cálculos deterministas; al cobrar revalidar contra el estado autoritativo. Tareas de avisos e informes quedan fuera del recorrido crítico de caja.

Las migraciones se instalan completas aunque un módulo esté apagado: activar funciones no ejecuta cambios estructurales improvisados. Cada backup incluye esquema, configuración, históricos y movimientos; restauración valida compatibilidad y dependencias antes de abrir el negocio.

## Condiciones para aceptar cada entrega

Permisos y funciones probados en interfaz y servidor; duplicados y concurrencia resueltos; importes y cantidades exactos; histórico estable; backup/restauración probado. Flujo completo de usuario en PC y celular, incluyendo casos sin datos, con datos previos y con módulo apagado. Medir Caja con 4.000 productos y promociones antes de declarar rapidez.

Probar perfiles representativos y todas las aristas de dependencia: básico, venta sin stock, venta con stock, compras sin stock, compras/lotes, promociones, cuentas y configuración completa. Ampliar con combinaciones de pares y casos de transición; no conformarse con una única instalación con todo encendido.

La constitución aún menciona el nombre/paleta antiguos y un único depósito. Registrar su evolución antes de implementar estos cambios; no interpretar la aprobación del roadmap como que ya se pueden habilitar varias sucursales.
