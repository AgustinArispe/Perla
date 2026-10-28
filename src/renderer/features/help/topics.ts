import type { Role } from '../../../shared/auth';
import { matchesHelpSearch } from './search';

export type Topic = {
  id: string;
  title: string;
  keywords?: string;
  roles?: Role[];
  sections: { title: string; text: string; roles?: Role[] }[];
};
const managers: Role[] = ['SUPERVISOR', 'OWNER', 'ADMIN'];
export const helpTopics: Topic[] = [
  {
    id: 'biempresa',
    title: 'BiEmpresa y stock compartido',
    keywords: 'unidades empresas unidad dorado compartido',
    sections: [
      {
        title: 'Identificar la unidad',
        text: 'Con BiEmpresa activo, cada usuario trabaja en su unidad asignada. El encabezado muestra su nombre y la segunda unidad usa colores dorados. No cambia tu rol ni oculta ventas a los responsables. El catálogo y el stock son compartidos; no se genera una segunda salida de mercadería.',
      },
      {
        title: 'Órdenes e historial',
        text: 'Al cobrar una orden se conserva la unidad de quien la preparó, aunque el cajero trabaje en otra. Revisá la unidad indicada antes de cobrar. Los nombres históricos no se modifican al renombrar una unidad. Las devoluciones pertenecen a la unidad de la venta original.',
      },
      {
        title: 'Activar y configurar',
        roles: ['OWNER', 'ADMIN'],
        text: 'Activá BiEmpresa en Configuración → Funciones, poné los nombres en Configuración → BiEmpresa y asigná las cuentas desde Administración → Usuarios. Cambiar una cuenta cierra sus sesiones. Al pausar el módulo, las ventas nuevas normales pertenecen a la principal; las órdenes pendientes conservan su unidad. El histórico permite filtrar y exportar por unidad y los reportes generales siguen consolidados. No incluye facturación fiscal ni contabilidad o propiedad de mercadería entre empresas.',
      },
    ],
  },
  {
    id: 'primeros-pasos',
    title: 'Primeros pasos y circuitos de trabajo',
    keywords: 'inicio empezar ferretería mostrador pedido especialista',
    sections: [
      {
        title: 'Elegir cómo trabajar',
        text: 'Para vender y entregar en el momento, usá Caja. Si una persona prepara y otra cobra, usá Órdenes para caja. Si necesitás documentar una entrega ya registrada, usá Remitos. Para mover mercadería entre depósitos, usá Ubicaciones y traslados. Son circuitos distintos y sus funciones se pueden activar por separado.',
      },
      {
        title: 'Preparar en mostrador y pagar después',
        text: 'En una ferretería, por ejemplo, el especialista carga artículos y cantidades en Órdenes para caja y entrega el número o la impresión al cliente. El cajero busca ese número en Caja y confirma el pago. Preparar la orden no cobra ni descuenta o reserva stock; la venta se registra al cobrar.',
      },
      {
        title: 'Si no aparece una herramienta',
        text: 'Las opciones dependen de tu perfil y de las funciones que haya activado el jefe. Una herramienta desactivada puede seguir apareciendo para consultar su historial o resolver pendientes. La ayuda explica también cómo funcionan los módulos opcionales; leerla no los activa ni concede permisos.',
      },
      {
        title: 'Antes de empezar a operar',
        roles: ['OWNER'],
        text: 'Revisá el nombre del negocio y los medios de pago en Configuración. Creá cuentas individuales y terminales para quienes cobran. Activá solo los módulos que vas a usar, cargá productos y precios y, si controlás stock, realizá el conteo inicial. Probá un circuito completo antes de usar datos reales.',
      },
    ],
  },
  {
    id: 'inicio',
    title: 'Inicio y accesos de trabajo',
    roles: managers,
    sections: [
      {
        title: 'Revisar el día',
        text: 'Inicio propone un próximo paso según los controles activos: primero vencimientos y diferencias de caja, después las órdenes pendientes o la atención en Caja. Las revisiones de reposición, cuentas y precios están plegadas en Planificar el resto; no significa que debas resolverlas todas hoy. También muestra ventas del día y de la semana, cajas y saldos abiertos según tus permisos. Un aviso no registra por sí solo una compra, ajuste, cobro ni pago.',
      },
      {
        title: 'Elegir dónde empezar',
        text: 'La preferencia de espacio de trabajo permite elegir una pantalla inicial disponible para tu perfil. Cambiar el inicio no modifica permisos ni activa funciones. Si el módulo elegido deja de estar disponible, usá el menú para volver a una herramienta habilitada.',
      },
      {
        title: 'Actualizar antes de actuar',
        text: 'Si tenés la pantalla abierta hace tiempo o varias personas están operando, actualizá antes de confirmar una corrección. El detalle y los controles del servidor verifican los cambios simultáneos; no repitas una operación solo porque un indicador tardó en actualizarse.',
      },
    ],
  },
  {
    id: 'avisos',
    title: 'Avisos y notificaciones',
    roles: managers,
    keywords: 'campana alertas leído vencimientos stock caja',
    sections: [
      {
        title: 'Abrir un aviso',
        text: 'La campana reúne avisos vigentes de stock, vencimientos y caja cuando Notificaciones está activa. Abrir un aviso lo marca como leído y lleva a la tarea relacionada, siempre dentro de los módulos y permisos disponibles para tu perfil.',
      },
      {
        title: 'Leído no significa resuelto',
        text: 'Un aviso se resuelve cuando cambia la situación real, por ejemplo después de reponer o revisar el stock. Marcarlo como leído no registra esa corrección. Si la situación vuelve a empeorar, puede aparecer otra vez como pendiente.',
      },
    ],
  },
  {
    id: 'caja',
    title: 'Caja y ventas',
    sections: [
      {
        title: 'Abrir la caja',
        text: 'Elegí la terminal que vas a usar e ingresá el efectivo que hay antes de empezar. Es el fondo para dar cambio, no una venta. Si ya hay un turno abierto a tu nombre, podés continuar en él.',
      },
      {
        title: 'Escanear y buscar',
        text: 'El lector USB funciona como un teclado. Configuralo para que envíe Enter después de cada código. Escaneá en el campo de código: si el producto ya está en el carrito, suma una unidad. F2 vuelve al escaneo y F3 abre la búsqueda por nombre o código. Mientras escribís en otro campo o abrís una ventana, el escaneo queda suspendido.',
      },
      {
        title: 'Cantidades y productos por peso',
        text: 'Usá + y − para cambiar unidades o tocá la cantidad para escribirla directamente en el carrito. Enter guarda y Escape cancela la edición. Mientras editás, el escaneo y el cobro quedan suspendidos. Quitar elimina un renglón y Deshacer permite recuperarlo antes del siguiente cambio en el carrito. Para productos por kilo, usá Producto por kilo (F6). Ingresá el peso o el importe de la porción; revisá la cantidad calculada antes de agregarla. 0,250 kg equivale a 250 gramos.',
      },
      {
        title: 'Descuentos y cobro',
        text: 'Cambiar descuento (F4) permite aplicar un porcentaje o un monto a toda la venta. Cobrar (F8) abre los medios de pago. En efectivo, escribí lo que entrega el cliente o usá Justo y los importes rápidos: el vuelto se destaca en pantalla. Agregar otro medio permite combinar pagos; ajustá el primer importe y usá Completar saldo aquí en el otro para cubrir lo que falta. El dinero recibido no se suma dos veces: se registra el importe aplicado y se calcula el vuelto aparte. Confirmar venta (F8) guarda la operación y descuenta stock si lo controlás. Escape vuelve al carrito sin cobrar. El mismo panel se usa al cobrar órdenes preparadas.',
      },
      {
        title: 'Cancelar y recuperar un carrito',
        text: 'Cancelar venta en curso descarta la compra que todavía no se cobró. No borra una venta ya confirmada. Si salís y volvés a entrar, Recuperar carrito retoma la venta guardada a tu nombre. Revisá los cambios de precios que pueda mostrar el sistema.',
      },
      {
        title: 'Si se corta la conexión',
        text: 'No vuelvas a cobrar al cliente porque tarde en responder. Revisá el estado de la operación y usá el reintento que ofrece la pantalla. Una venta requiere conexión con el servidor; el sistema no confirma ventas sin conexión. Si no podés verificar qué pasó, consultá al supervisor antes de repetirla.',
      },
    ],
  },
  {
    id: 'turnos',
    title: 'Efectivo y cierre de caja',
    sections: [
      {
        title: 'Ingresos y retiros',
        text: 'Ingreso / retiro registra dinero que entra o sale de la caja sin ser una venta. Escribí el importe y el motivo. Las ventas en tarjeta o transferencia no aumentan el efectivo del cajón.',
      },
      {
        title: 'Efectivo esperado',
        text: 'Es el efectivo inicial más lo cobrado en efectivo y los ingresos, menos los retiros y reintegros. Se cuenta el importe de la venta en efectivo, no el billete recibido antes de entregar el vuelto.',
      },
      {
        title: 'Diferencia al cerrar',
        text: 'Antes de cerrar, finalizá o cancelá la venta en curso. Contá el dinero físico e ingresalo en Efectivo contado. La diferencia es contado menos esperado: si es negativa falta dinero; si es positiva sobra. Una caja abierta muestra Pendiente de cierre porque todavía no se registró el conteo. El cierre guardado no cambia si después se anula una venta.',
      },
    ],
  },
  {
    id: 'ordenes-caja',
    title: 'Órdenes para caja',
    keywords:
      'pedido preparado orden de venta orden de compra OC especialista ferretería mostrador nota de pedido',
    sections: [
      {
        title: 'Preparar una orden sin cobrar',
        text: 'En Ventas y caja → Órdenes para caja, completá Cliente o referencia, agregá artículos, indicá las cantidades y elegí Enviar orden a caja. Podés hacerlo con perfil Vendedor, sin terminal asignada ni caja abierta. El número identifica el pedido; la orden impresa indica Pendiente de pago y no acredita que se haya cobrado.',
      },
      {
        title: 'Recuperar y cobrar la orden',
        text: 'En Caja, con terminal y turno abiertos y el carrito de venta normal vacío, elegí Cobrar orden preparada. Buscá el número, revisá el cliente, los productos y el total y elegí Cobrar orden. Confirmar el pago registra una única venta, sus pagos y la salida de stock. El comprobante se genera si Comprobantes está activo. Este circuito requiere el cobro completo y no admite dejar la orden a cuenta.',
      },
      {
        title: 'Precios, ubicación y disponibilidad',
        text: 'La orden conserva los artículos, cantidades, precios y promociones de la preparación. Si el producto, su precio o la promoción cambian, cancelá y prepará otra orden: no se cambia silenciosamente el total. La primera versión usa la ubicación principal y la caja debe operar allí. Preparar no reserva mercadería; el stock disponible se comprueba al cobrar.',
      },
      {
        title: 'Cobro pendiente de confirmar',
        text: 'Si se pierde la respuesta del pago, no prepares otra orden ni generes una venta nueva. Usá Consultar resultado o Reintentar mismo cobro. El navegador conserva la solicitud pendiente para recuperarla después de una recarga. Una orden ya cobrada muestra la venta asociada y no permite registrar un segundo pago.',
      },
      {
        title: 'Cancelar una orden',
        text: 'Solo se cancelan órdenes pendientes de cobro, con un motivo. Un vendedor puede cancelar las que preparó; un supervisor o jefe también puede cancelar las de otras personas. Una orden cobrada se corrige desde la venta con los permisos correspondientes; no se vuelve a poner pendiente.',
      },
      {
        title: 'Activar o desactivar la preparación',
        roles: ['OWNER'],
        text: 'En Configuración → Funciones → Preparación y cobro, activá Órdenes para caja. Es independiente de Remitos internos, Remitos a clientes y Remitos de proveedores: podés dejar los tres apagados. Al desactivar nuevas preparaciones, las órdenes pendientes siguen disponibles para cobrar o cancelar y el historial se conserva.',
      },
      {
        title: 'Orden de cliente, compra y factura',
        text: 'La orden de este circuito es un pedido de un cliente para pagar en caja. Aunque en el negocio la llamen orden de compra, no es un pedido a un proveedor. Una orden no registra un pago, un remito documenta mercadería y el comprobante de venta registra el cobro confirmado. Los documentos actuales son internos y no fiscales; la emisión fiscal mediante ARCA todavía no está disponible.',
      },
    ],
  },
  {
    id: 'remitos',
    title: 'Remitos',
    roles: managers,
    keywords:
      'entrega despacho remisión albarán transporte depósito proveedor factura imprimir PDF',
    sections: [
      {
        title: 'Elegir el tipo de remito',
        text: 'En Ventas y caja → Remitos, elegí Nuevo remito. Salida a cliente documenta una venta completada; Entrada de proveedor documenta una compra ya recibida; Traslado interno documenta un traslado entre ubicaciones. Seleccioná el origen entre los últimos 30 disponibles o buscá un número anterior. El documento incluye todos los renglones y cantidades originales; esta versión no permite entregas parciales.',
      },
      {
        title: 'Emitir e imprimir',
        text: 'Completá el destinatario o proveedor, la dirección, la referencia externa y las observaciones. En entradas podés guardar el número de remito del proveedor. Al emitir se asigna un número correlativo y se conservan los datos de ese momento. Ver e imprimir permite imprimir o guardar PDF desde el navegador; cambiar después el catálogo o la dirección no modifica lo ya emitido. El remito no muestra precios ni costos y no es válido como factura.',
      },
      {
        title: 'Stock y confirmación de entrega',
        text: 'Emitir, imprimir o confirmar un remito no vuelve a mover stock ni genera otro cobro. Las existencias pertenecen a la venta, compra o traslado de origen. En salidas a clientes podés registrar quién recibió; en compras y traslados, la recepción se registra desde el origen. El detalle muestra el estado actual del documento relacionado, incluida una anulación posterior.',
      },
      {
        title: 'Corregir o anular un remito',
        text: 'El contenido emitido no se edita. Anulá el documento con un motivo y, si el origen sigue vigente, emití uno nuevo desde esa misma operación. El número nuevo referencia al anterior y el historial conserva ambos. Anular el remito no revierte la venta, compra ni traslado: para corregir mercadería o dinero usá la operación de origen.',
      },
      {
        title: 'Permisos e historial',
        text: 'El supervisor puede consultar y gestionar los tipos de remito activos. El jefe y administrador conservan consulta, impresión y cierre de documentos anteriores aunque el tipo esté desactivado. El vendedor no tiene acceso al módulo de remitos; sí puede preparar órdenes para caja si esa función está activa.',
      },
      {
        title: 'Apagar internos y conservar otros circuitos',
        roles: ['OWNER'],
        text: 'En Configuración → Funciones → Remitos hay tres controles separados: Remitos a clientes, Remitos de proveedores y Remitos internos. Apagar internos no desactiva los remitos externos, las órdenes para caja ni los traslados. Remitos de proveedores requiere Proveedores y compras; Remitos internos requiere Ubicaciones y traslados. Apagar un tipo bloquea nuevas emisiones y conserva sus documentos.',
      },
      {
        title: 'No encuentro el origen para emitir',
        text: 'Comprobá el tipo, el número y que la operación esté vigente. Solo puede haber un remito vigente por origen: buscá el existente en el historial antes de emitir otro. Una venta con devoluciones previas requiere revisión y no admite una nueva emisión por la cantidad original. Los circuitos de entregas previas a la venta, facturación agrupada y operaciones entre empresas todavía no están incluidos.',
      },
    ],
  },
  {
    id: 'comprobantes',
    title: 'Comprobantes e impresión',
    keywords: 'ticket recibo reimprimir impresora fiscal ARCA AFIP factura',
    sections: [
      {
        title: 'Comprobante de una venta cobrada',
        text: 'Cuando Comprobantes está activo, una venta confirmada puede generar su comprobante interno para imprimir. Las órdenes para caja también generan ese comprobante después de cobrar. No confundas la orden pendiente de pago o el remito con el comprobante de la venta. Perla todavía no emite facturas fiscales ni solicita autorización a ARCA.',
      },
      {
        title: 'Imprimir o guardar en PDF',
        text: 'Abrí la vista de impresión y usá Imprimir. Elegí la impresora y el tamaño de papel que corresponda, o Guardar como PDF si el navegador lo ofrece. Revisá la vista previa antes de confirmar. Reimprimir un documento no registra otra venta ni otro movimiento de mercadería.',
      },
      {
        title: 'Cola de comprobantes',
        roles: managers,
        text: 'En Ventas → Comprobantes se muestran emisiones pendientes. Abrí el documento y usá Imprimir. Si la impresora falla, verificá la venta en el histórico antes de repetir un cobro; el problema de impresión no significa que la operación comercial haya fallado.',
      },
    ],
  },
  {
    id: 'productos',
    title: 'Productos',
    roles: managers,
    sections: [
      {
        title: 'Crear y editar',
        text: 'Nuevo producto permite cargar el nombre, código interno, código de barras, categoría y precio en pesos. Elegí Unidad o Kilogramo según cómo se vende. Cada producto necesita un código interno único; el código de barras también debe ser único si lo cargás.',
      },
      {
        title: 'Activar e inactivar',
        text: 'Un producto inactivo deja de estar disponible para nuevas ventas. Su información permanece en el catálogo y en las ventas anteriores. Cambiar el nombre o precio actual tampoco modifica el detalle de las ventas ya guardadas.',
      },
      {
        title: 'Importar una lista',
        text: 'Importar productos permite revisar un archivo CSV antes de aplicar la carga. Corregí los errores que aparezcan y confirmá el conteo físico si el archivo trae existencias iniciales. La exportación para consulta tiene columnas en español y precios en pesos; no es una copia de seguridad ni la plantilla de importación.',
      },
      {
        title: 'Categorías, marcas y códigos propios',
        text: 'Las categorías y marcas ayudan a buscar, revisar precios y agrupar productos. Si un artículo no tiene código comercial, podés generar un código interno desde su ficha. Antes de imprimir etiquetas, verificá que el código corresponda al producto correcto y que no se repita en otro artículo.',
      },
      {
        title: 'Etiquetas de productos',
        text: 'Activá Etiquetas si necesitás identificar artículos con códigos propios. Las etiquetas de productos y los comprobantes de venta son documentos distintos. Imprimir una etiqueta no cambia el precio, las existencias ni registra una venta.',
      },
    ],
  },
  {
    id: 'stock',
    title: 'Stock',
    roles: managers,
    sections: [
      {
        title: 'Estados de las existencias',
        text: 'Sin conteo significa que todavía no se cargó una cantidad inicial; no significa cero. Agotado indica cero. Bajo mínimo indica que hay menos que el mínimo configurado. Negativo indica una venta autorizada por encima de lo disponible. Sin control corresponde a productos que no llevan stock.',
      },
      {
        title: 'Contar, ingresar y registrar una merma',
        text: 'Contar reemplaza la existencia por la cantidad que verificaste físicamente. Un ingreso de proveedor suma unidades o kilos. Una merma resta pérdidas o productos dañados. Registrá siempre el motivo. Las ventas y anulaciones generan sus propios movimientos: no hace falta descontarlas manualmente.',
      },
      {
        title: 'Autorizaciones y cambios simultáneos',
        text: 'Si no hay stock suficiente, revisá las existencias antes de vender. Una autorización de stock negativo exige el permiso correspondiente y un motivo. Si otro usuario cambió el producto o su stock, actualizá la pantalla y revisá el nuevo valor antes de guardar.',
      },
      {
        title: 'Lotes y vencimientos',
        text: 'Si Lotes está habilitado, abrí Lotes en el producto y activá su control. La primera vez distribuí la existencia actual. En las compras siguientes ingresá el código del proveedor y, si corresponde, el vencimiento. Caja descuenta primero lo que vence antes. Un lote bloqueado o vencido no queda disponible para vender.',
      },
    ],
  },
  {
    id: 'compras',
    title: 'Proveedores y compras',
    roles: managers,
    sections: [
      {
        title: 'Recibir mercadería',
        text: 'Elegí el proveedor, escaneá o buscá los productos e ingresá el costo de compra. El borrador se guarda solo. Al confirmar, la compra queda en el historial y, si usás control de stock, suma las cantidades recibidas.',
      },
      {
        title: 'Costos e historial',
        text: 'El sistema sugiere el último costo registrado para cada producto. El costo de compra no cambia el precio de venta. En Historial podés consultar quién recibió la mercadería, los costos de ese momento y el total.',
      },
      {
        title: 'Anular una compra',
        text: 'Una compra solo se anula automáticamente si el stock recibido todavía puede revertirse con seguridad. El motivo, la fecha y la persona responsable quedan registrados. Si hubo movimientos posteriores, revisá el stock antes de corregirlo.',
      },
      {
        title: 'Cuenta y pagos del proveedor',
        text: 'Cuando Cuenta de proveedores está activa, cada compra nueva queda pendiente. Abrí Proveedores, tocá el saldo y registrá pagos totales o parciales. El sistema los aplica primero a las compras más antiguas. Un pago en efectivo necesita una caja abierta y descuenta ese importe del efectivo esperado; transferencia o tarjeta no modifican el cajón.',
      },
    ],
  },
  {
    id: 'promociones',
    title: 'Promociones',
    roles: ['OWNER'],
    sections: [
      {
        title: 'Crear una promoción',
        text: 'Elegí Porcentaje, Llevá X pagá Y, Precio por cantidad o Combo. Después indicá el beneficio y los productos, categorías o marcas incluidos. Podés activarla en el momento, programarla o dejarla como borrador.',
      },
      {
        title: 'Aplicación en Caja',
        text: 'Cuando el carrito cumple las condiciones, la promoción se aplica sola y muestra el ahorro antes de cobrar. Si cargás un descuento manual, ese descuento reemplaza las promociones automáticas de esa venta.',
      },
      {
        title: 'Historial y cambios',
        text: 'Cada venta conserva el nombre, la versión y el importe de la promoción que recibió. Pausar o editar una promoción no modifica ventas anteriores. Antes de confirmar el pago, Caja vuelve a revisar el total para evitar cobrar una oferta que acaba de cambiar.',
      },
    ],
  },
  {
    id: 'reposicion',
    title: 'Reposición y pedidos a proveedores',
    roles: managers,
    keywords:
      'comprar faltantes sugerencias abastecimiento orden de compra OC proveedor calendario',
    sections: [
      {
        title: 'Revisar sugerencias',
        text: 'En Reposición → Sugerencias, revisá la ubicación, el período de análisis y los artículos sugeridos. La propuesta considera ventas, existencias vendibles, calendario y pedidos confirmados dentro del horizonte. El detalle del cálculo ayuda a entender la cantidad sugerida; revisá demanda y entregas antes de pedir.',
      },
      {
        title: 'Preparar y confirmar un pedido al proveedor',
        text: 'Seleccioná los artículos y elegí Preparar pedido. Se agrupan en borradores por proveedor. Confirmar pedido registra mercadería en camino, no una recepción ni una salida de dinero. En Reposición → Pedidos podés consultar el estado y revisar la fecha esperada de llegada.',
      },
      {
        title: 'Recepciones parciales y pendientes',
        text: 'Abrí el pedido e indicá la cantidad que recibís ahora y el costo correspondiente. Recibir mercadería registra la recepción; el pedido puede quedar Recibido en parte hasta completar las cantidades. Cancelar el resto cierra lo que ya no esperás recibir y conserva lo recibido. No vuelvas a cargar la misma llegada como una compra separada.',
      },
      {
        title: 'Calendario y fechas atrasadas',
        text: 'Configurá los días de apertura y los cierres que correspondan a la ubicación. Si una llegada se atrasó, confirmá la nueva fecha o revisá el pendiente; la sugerencia depende de cuándo se espera tener disponible esa mercadería. El pedido a proveedor no es la orden que un cliente lleva a caja para pagar.',
      },
      {
        title: 'Activación',
        roles: ['OWNER'],
        text: 'Reposición y pedidos requiere Control de stock y Proveedores y compras. Antes de desactivarlo, recibí o cancelá los pedidos pendientes. El sistema conserva el historial y valida las dependencias al guardar la configuración.',
      },
    ],
  },
  {
    id: 'conteos',
    title: 'Conteos y controles de mercadería',
    roles: managers,
    keywords: 'inventario diferencias conteo físico ajuste vencimientos merma',
    sections: [
      {
        title: 'Hacer un conteo por ubicación',
        text: 'En Stock → Conteos, elegí la ubicación y el alcance e iniciá el conteo. Registrá lo que verificaste físicamente para cada artículo, respetando unidades o kilos. Un renglón sin contar no equivale a cero. Podés volver a un conteo pendiente para continuar la tarea.',
      },
      {
        title: 'Revisar y aplicar diferencias',
        text: 'Antes de Aplicar ajustes, revisá los renglones seleccionados y el cambio que producen. La aplicación modifica las existencias y registra el responsable y el motivo. Si hubo movimientos simultáneos, actualizá y revisá los avisos antes de confirmar; no reemplaces las cantidades sin comprobar qué pasó.',
      },
      {
        title: 'Vencimientos y lotes bloqueados',
        text: 'En Stock → Vencimientos, revisá los lotes que requieren atención. Bloquear evita que se vendan, pero no registra una pérdida física. Si la mercadería se dañó o se descartó, corresponde registrar la merma con los controles del producto y del lote.',
      },
    ],
  },
  {
    id: 'revision',
    title: 'Revisión de productos y precios',
    roles: managers,
    keywords: 'rotación inmovilizado rentabilidad costo recargo margen precios revisar',
    sections: [
      {
        title: 'Precios para revisar',
        text: 'En Productos → Revisión podés detectar artículos con precio desactualizado, costo sin registrar u otras señales de atención. Abrí el detalle antes de decidir un cambio. Revisar un artículo no modifica automáticamente su precio ni las ventas anteriores.',
      },
      {
        title: 'Margen y recargo no son lo mismo',
        text: 'El recargo compara la diferencia de precio y costo con el costo; el margen compara esa diferencia con el precio de venta. Si un artículo cuesta $100 y se vende a $150, el recargo es 50% y el margen es aproximadamente 33,33%. Ninguno incluye por sí solo gastos, impuestos o comisiones.',
      },
      {
        title: 'Rotación y mercadería inmovilizada',
        text: 'La revisión de rotación ayuda a identificar productos con existencia y pocas salidas en el período. Es una señal para analizar, no una orden automática de liquidación o compra. Revisá temporada, fechas y calidad de los datos antes de decidir.',
      },
      {
        title: 'Aplicar cambios de precio',
        roles: ['OWNER'],
        text: 'Cuando uses una actualización de precios, revisá la propuesta, la selección de productos y el resultado antes de confirmar. La aplicación registra el cambio; las ventas anteriores conservan sus precios. Si faltan costos conocidos, no interpretes esos artículos como si su costo fuera cero.',
      },
    ],
  },
  {
    id: 'agenda',
    title: 'Agenda de cobros y pagos',
    roles: managers,
    keywords: 'vencimiento deuda vencida cobrar pagar tesorería saldo',
    sections: [
      {
        title: 'Consultar pendientes',
        text: 'Cobros y pagos reúne las obligaciones de clientes y proveedores habilitadas para el negocio. Filtrá el tipo y el vencimiento para separar vencidos, próximos y sin fecha. Consultar un saldo no registra un movimiento de dinero.',
      },
      {
        title: 'Cambiar un vencimiento',
        text: 'Revisá la obligación antes de guardar una nueva fecha y dejá un motivo. El historial conserva quién cambió el vencimiento. Cambiar la fecha no modifica el importe ni cancela la deuda.',
      },
      {
        title: 'Cobrar o pagar',
        text: 'Abrí el pendiente y registrá el movimiento por el circuito de cuenta corriente correspondiente. Revisá importe, persona o proveedor y medio de pago. El efectivo requiere una caja abierta; otros medios no cambian el dinero del cajón. Una cobranza de deuda no es una venta nueva y un pago al proveedor no es otra compra.',
      },
    ],
  },
  {
    id: 'semanal',
    title: 'Resumen semanal',
    roles: ['OWNER'],
    keywords: 'resultados informe semana versión parcial recalcular Excel imprimir',
    sections: [
      {
        title: 'Consultar la semana',
        text: 'En Resultados → Semanal, elegí la semana para revisar ventas netas, operaciones, margen conocido y pendientes. El informe indica el período, cuándo se generó y si es parcial. Los cobros de deuda no se cuentan como ventas nuevas.',
      },
      {
        title: 'Consulta en vivo y versiones',
        text: 'Una consulta en vivo refleja los datos actuales. Una versión guardada conserva el resultado calculado para esa semana; por eso puede diferir de una consulta posterior si hubo nuevas operaciones o correcciones. Recalcular genera una nueva versión sin borrar la trazabilidad anterior.',
      },
      {
        title: 'Exportar e imprimir',
        text: 'Podés descargar o imprimir el resumen para revisarlo fuera del sistema. Comprobá las fechas y la versión antes de comparar dos informes. La exportación es una consulta de resultados; no reemplaza una copia de seguridad de la base.',
      },
    ],
  },
  {
    id: 'clientes',
    title: 'Clientes y cuenta corriente',
    sections: [
      {
        title: 'Identificar una venta',
        text: 'En Cobrar podés elegir un cliente sin cambiar el medio de pago. Es opcional: la venta habitual puede seguir como Consumidor final.',
      },
      {
        title: 'Vender a cuenta',
        text: 'Dejar a cuenta aparece únicamente para clientes autorizados y muestra el límite disponible. Al confirmar, la venta queda registrada y el importe pasa a saldo pendiente; no se cuenta como efectivo ni tarjeta recibida.',
      },
      {
        title: 'Registrar un cobro',
        roles: managers,
        text: 'En Clientes abrí Ver cuenta y registrá un cobro total o parcial. El sistema lo aplica a las ventas más antiguas. Efectivo necesita una caja abierta y aumenta el efectivo esperado; otros medios no modifican el cajón. El cobro reduce deuda y no crea otra venta.',
      },
      {
        title: 'Devoluciones y anulaciones',
        roles: managers,
        text: 'Una devolución cancela primero el saldo pendiente y reintegra sólo la parte que ya se había cobrado. Una anulación conserva la trazabilidad y cualquier crédito a favor del cliente.',
      },
    ],
  },
  {
    id: 'historico',
    title: 'Histórico y anulaciones',
    roles: managers,
    sections: [
      {
        title: 'Consultar una venta',
        text: 'Filtrá por fechas y estado. Ver detalle muestra los productos, cantidades, precios guardados, descuento y pagos de esa venta. Las fechas corresponden al horario de Argentina.',
      },
      {
        title: 'Anular una venta confirmada',
        text: 'La anulación conserva la operación original y registra el motivo. Reintegra el stock; si hubo un conteo posterior, revisá el aviso antes de continuar. Si devuelve efectivo, el reintegro se registra en la caja abierta correspondiente. No cambia el arqueo de una caja que ya se cerró.',
      },
      {
        title: 'Devolver parte de una venta',
        text: 'En el detalle de la venta elegí Registrar devolución. Indicá la cantidad, si vuelve a la venta o queda como merma, el medio del reintegro y el motivo. El sistema conserva lo ya devuelto y no permite superar la cantidad original. Un reintegro en efectivo necesita una caja abierta.',
      },
      {
        title: 'Revisar turnos y actividad',
        text: 'Turnos muestra las aperturas, cierres, efectivo esperado, contado y diferencia. Ver caja permite consultar los movimientos. Actividad registra quién hizo cada operación para facilitar el seguimiento.',
      },
    ],
  },
  {
    id: 'resumen',
    title: 'Resumen mensual',
    roles: ['OWNER'],
    sections: [
      {
        title: 'Ventas y medios de pago',
        text: 'Elegí el mes para ver el total vendido, cantidad de ventas, ticket promedio y reparto por medio de pago. Las ventas netas consideran descuentos, devoluciones y anulaciones según el período consultado. Una venta con pagos combinados reparte su importe entre los medios utilizados. No confundas el total vendido con el efectivo recibido o la ganancia.',
      },
      {
        title: 'Comparar períodos',
        text: 'Elegí Hoy, Semana, Mes o Rango para comparar ventas netas con el tramo anterior de igual cantidad de días. Sin base de comparación significa que el período anterior no tuvo ventas; no representa una caída ni un crecimiento.',
      },
      {
        title: 'Productos y reposición',
        text: 'En productos y categorías podés elegir Top 5, 10, 15, 25 o 50. El límite de cada tarjeta es independiente; productos también permite ordenar por importe, unidades o kilos. Exportar Top genera un Excel del mes, orden y cantidad elegidos. Los porcentajes de cada dona corresponden a esa selección, no a todo el período; los totales generales conservan todas las operaciones. Las categorías son las registradas al vender y contemplan devoluciones. Si hay netos negativos se muestra el ranking sin dona. El total vendido es facturación interna, no ganancia.',
      },
      {
        title: 'Margen bruto y cobertura',
        text: 'Si está habilitado Costos y rentabilidad, el margen bruto resta el costo conocido de la mercadería a la venta cubierta. La cobertura indica cuánto de lo vendido tiene costo registrado. No incluye gastos, impuestos ni comisiones. Un producto sin costo queda identificado y no se toma como costo cero.',
      },
      {
        title: 'Cómo se forma el costo',
        text: 'Los productos con stock calculan un promedio al recibir compras. Los productos sin control de stock usan el costo de referencia cargado en su ficha. Cada venta conserva el costo de ese momento: cambiarlo después no modifica meses anteriores.',
      },
    ],
  },
  {
    id: 'administracion',
    title: 'Usuarios y configuración',
    roles: ['OWNER'],
    sections: [
      {
        title: 'Permisos',
        text: 'El vendedor usa Caja, puede preparar órdenes para caja cuando esa función está habilitada y consulta esta ayuda. El supervisor también administra productos, stock, compras, traslados y remitos habilitados y consulta histórico, turnos y actividad; no accede al resumen mensual. El jefe administra las funciones del negocio y los usuarios. Cada persona debe usar su propia cuenta: tener permiso no activa por sí solo un módulo apagado.',
      },
      {
        title: 'Terminales y medios de pago',
        text: 'Configuración permite cambiar el nombre del negocio, habilitar medios de pago y administrar terminales. Cada terminal representa una caja y puede tener un solo turno abierto. Usá nombres distintos y reconocibles.',
      },
      {
        title: 'Módulos opcionales y dependencias',
        text: 'En Configuración → Funciones, elegí las herramientas que necesita el negocio y revisá Aplicar cambios antes de confirmar. Órdenes para caja y los tres tipos de remitos tienen controles independientes. Cuenta corriente requiere Clientes; Cuenta de proveedores requiere Proveedores y compras; Ubicaciones y traslados requiere Control de stock; Reposición requiere Stock y Compras. La pantalla muestra los cambios relacionados y el servidor vuelve a validarlos.',
      },
      {
        title: 'Desactivar sin perder pendientes',
        text: 'Desactivar una función no borra sus documentos. Algunos módulos exigen resolver pendientes antes de apagarse: por ejemplo, traslados en tránsito, pedidos de reposición o saldos abiertos de determinadas cuentas. Órdenes para caja permite terminar los pedidos ya preparados; los remitos conservan acceso histórico para el jefe. Leé el aviso específico antes de aplicar los cambios.',
      },
      {
        title: 'Volver a activar Control de stock',
        text: 'Después de trabajar con el control desactivado, realizá un conteo físico al reactivarlo. Las operaciones del período sin control no deben interpretarse como si hubieran mantenido actualizadas las existencias. Revisá también ubicaciones, lotes y módulos dependientes antes de volver a operar.',
      },
      {
        title: 'Exportaciones',
        text: 'Elegí las fechas y descargá el CSV que necesitás. Productos incluye los modificados en el período, ordenados alfabéticamente. El precio se expresa en pesos. Si Excel muestra todo en una columna, usá Datos → Desde texto/CSV, codificación UTF-8 y separador punto y coma. Para listas grandes descargá también las partes siguientes.',
      },
    ],
  },
  {
    id: 'backups',
    title: 'Copias de seguridad',
    roles: ['OWNER'],
    sections: [
      {
        title: 'Crear y guardar una copia',
        text: 'Crear copia guarda una copia cifrada de la base de datos. Descargar permite conservar el archivo .backup en otro dispositivo o ubicación segura. Las copias anteriores con extensión .bocha también se pueden restaurar. Un CSV sirve para consultar información; no recupera el sistema completo.',
      },
      {
        title: 'Copias automáticas semanales',
        text: 'La programación predeterminada crea una copia los sábados según el horario de Buenos Aires y conserva las dos últimas copias de esa programación. Si el servicio estuvo apagado todo el sábado, espera al siguiente. Las copias manuales, previas a restaurar y automáticas antiguas sin la marca semanal no se eliminan por esta retención. El administrador del servidor puede desactivar la programación o ajustar la cantidad conservada; no se cambia desde los switches de Funciones.',
      },
      {
        title: 'Dónde quedan guardadas',
        text: 'Las copias del servidor no son una descarga automática en tu PC. Guardá periódicamente una descarga fuera del servidor para poder recuperarte si se pierde ese almacenamiento. La clave de respaldo debe quedar bajo custodia del administrador, separada de las copias: sin ella no se pueden recuperar los archivos cifrados.',
      },
      {
        title: 'Restaurar',
        text: 'Subí o elegí una copia y revisala antes de restaurar. La restauración reemplaza los datos actuales por los de esa copia y cierra todas las sesiones. Coordiná con quienes estén usando la caja y guardá una copia actual antes de hacerlo. Se necesita tu contraseña y la clave de respaldo conservada por el administrador del servidor.',
      },
    ],
  },
  {
    id: 'cuenta',
    title: 'Cuenta y alcance',
    sections: [
      {
        title: 'Contraseña y sesión',
        text: 'Cambiar contraseña permite actualizar tu clave personal. Cerrar sesión protege tu cuenta al dejar la PC. Si olvidás la contraseña, pedí al jefe que gestione el acceso; la recuperación de la cuenta del jefe la realiza el administrador del sistema.',
      },
      {
        title: 'Control interno',
        text: 'Perla registra ventas, compras y existencias para la gestión del negocio. Sus comprobantes, órdenes y remitos son internos: no emite facturas fiscales ni se integra con ARCA. Si trabajás en una demo, verificá su identificación antes de cargar datos reales. Los circuitos entre varias empresas y la facturación fiscal todavía no forman parte de esta versión.',
      },
      {
        title: 'Qué es Perla',
        text: 'Perla es el programa de gestión. Perla Negra es el comercio que lo utiliza. La perla del símbolo representa lo valioso de cada negocio; su forma marina acompaña el movimiento cotidiano de ventas, productos y personas.',
      },
    ],
  },
  {
    id: 'ubicaciones',
    title: 'Ubicaciones y traslados',
    keywords: 'depósitos almacenes envío tránsito recepción sucursales',
    roles: managers,
    sections: [
      {
        title: 'Despachar mercadería',
        text: 'Elegí el origen y el destino, agregá los productos y confirmá el despacho. Las cantidades salen del stock de origen y quedan En tránsito hasta que el destino las reciba.',
      },
      {
        title: 'Recibir y registrar diferencias',
        text: 'Al llegar la mercadería, escribí la cantidad realmente recibida de cada producto. Si falta algo, la diferencia queda guardada en el traslado y solo lo recibido se suma al destino.',
      },
      {
        title: 'Cancelar un envío',
        text: 'Un traslado puede cancelarse mientras continúa En tránsito. El sistema repone el origen y conserva el motivo en el historial. Un traslado recibido ya no se puede cancelar.',
      },
    ],
  },
  {
    id: 'problemas',
    title: 'Resolver problemas frecuentes',
    keywords: 'error problema conexión lento duplicado pendiente no aparece bloqueado',
    sections: [
      {
        title: 'La pantalla tarda o perdió conexión',
        text: 'Esperá la respuesta o usá Actualizar o Reintentar cuando la pantalla lo permita. Una consulta fallida no significa que no haya datos. Si estabas confirmando una venta o un cobro, verificá primero su resultado antes de repetir la operación. Perla necesita conexión con el servidor para confirmar cambios.',
      },
      {
        title: 'No aparece Cobrar orden preparada',
        text: 'Comprobá que estás en Caja, que hay una terminal y turno disponibles y que el carrito normal está vacío. El botón aparece al habilitar Órdenes para caja o cuando existen órdenes pendientes o un cobro local por verificar. Usá el número de orden, no el de un remito. Una orden ya cobrada o cancelada no puede cobrarse otra vez.',
      },
      {
        title: 'Los datos cambiaron mientras trabajaba',
        text: 'Otra persona puede haber cambiado un producto, el stock o la configuración. Actualizá y revisá el dato vigente antes de guardar. En órdenes ya preparadas, si cambió el precio o la promoción corresponde cancelar y preparar una nueva; no cambies los importes solo para forzar un cobro.',
      },
      {
        title: 'El lector no agrega productos',
        text: 'Volvé al campo de código con F2, comprobá que el dispositivo envíe Enter y cerrá las ventanas que puedan estar capturando la escritura. Probá con un código conocido. Si aparece un producto equivocado, revisá el código de barras y el código interno en su ficha con un supervisor.',
      },
      {
        title: 'La impresión no salió',
        text: 'Comprobá impresora, papel y la vista previa del navegador. Guardar PDF permite conservar el documento si no tenés una impresora disponible. Una impresora detenida no deshace un cobro: consultá la operación confirmada antes de intentar otra venta.',
      },
      {
        title: 'Cómo pedir asistencia',
        text: 'Indicá el módulo, el número de orden, venta o remito, la hora aproximada y el mensaje que apareció. Explicá si estabas consultando o confirmando un cambio. No compartas contraseñas, claves de respaldo ni archivos de clientes en canales públicos.',
      },
    ],
  },
];

export function helpTopicsForRole(role: Role): Topic[] {
  const allowed = (roles?: Role[]) => !roles || role === 'ADMIN' || roles.includes(role);
  return helpTopics
    .filter((topic) => allowed(topic.roles))
    .map((topic) => ({
      ...topic,
      sections: topic.sections.filter((section) => allowed(section.roles)),
    }))
    .filter((topic) => topic.sections.length > 0);
}

export function searchHelpTopics(role: Role, query: string): Topic[] {
  return helpTopicsForRole(role)
    .filter((topic) =>
      matchesHelpSearch(
        [
          topic.title,
          topic.keywords ?? '',
          ...topic.sections.map((section) => section.title + ' ' + section.text),
        ].join(' '),
        query,
      ),
    )
    .map((topic) => {
      if (!query.trim() || matchesHelpSearch(topic.title + ' ' + (topic.keywords ?? ''), query))
        return topic;
      const sections = topic.sections.filter((section) =>
        matchesHelpSearch(topic.title + ' ' + section.title + ' ' + section.text, query),
      );
      return { ...topic, sections: sections.length ? sections : topic.sections };
    });
}
