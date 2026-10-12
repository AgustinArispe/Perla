import { PageHeading } from '../../components/PageHeader';
import { useState } from 'react';
import type { Role } from '../../../shared/auth';
import { matchesHelpSearch, normalizeHelpSearch } from './search';

type Topic = {
  id: string;
  title: string;
  roles?: Role[];
  sections: { title: string; text: string }[];
};
const managers: Role[] = ['SUPERVISOR', 'OWNER', 'ADMIN'];
export const helpTopics: Topic[] = [
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
        text: 'Usá +, − o el campo de cantidad para cambiar unidades. Quitar elimina un renglón. Para pescado y otros productos por kilo, usá Producto por kilo (F6). Ingresá el peso o el importe de la porción; revisá la cantidad calculada antes de agregarla. 0,250 kg equivale a 250 gramos.',
      },
      {
        title: 'Descuentos y cobro',
        text: 'Cambiar descuento (F4) permite aplicar un porcentaje o un monto a toda la venta. Cobrar (F8) abre los medios de pago. Podés combinar, por ejemplo, efectivo y débito. En efectivo recibido escribí lo que entrega el cliente: el sistema calcula el vuelto. Confirmar venta guarda la operación y descuenta el stock; abrir la ventana de cobro todavía no confirma nada.',
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
        text: 'En Clientes abrí Ver cuenta y registrá un cobro total o parcial. El sistema lo aplica a las ventas más antiguas. Efectivo necesita una caja abierta y aumenta el efectivo esperado; otros medios no modifican el cajón. El cobro reduce deuda y no crea otra venta.',
      },
      {
        title: 'Devoluciones y anulaciones',
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
        text: 'Elegí el mes para ver el total vendido, cantidad de ventas, ticket promedio y reparto por medio de pago. El neto considera los descuentos y excluye las ventas anuladas. Una venta con pagos combinados reparte su importe entre los medios utilizados.',
      },
      {
        title: 'Comparar períodos',
        text: 'Elegí Hoy, Semana, Mes o Rango para comparar ventas netas con el tramo anterior de igual cantidad de días. Sin base de comparación significa que el período anterior no tuvo ventas; no representa una caída ni un crecimiento.',
      },
      {
        title: 'Notificaciones',
        text: 'La campana reúne avisos vigentes de stock, vencimientos y caja. Abrir un aviso lo marca como leído y lleva a la tarea correspondiente. El aviso se resuelve cuando cambia la situación real; si vuelve a empeorar, aparece otra vez como pendiente.',
      },
      {
        title: 'Productos y reposición',
        text: 'El ranking ayuda a identificar los productos más vendidos. Las alertas de stock ayudan a planificar la reposición. El total vendido es facturación interna, no ganancia.',
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
        text: 'El vendedor usa Caja y esta ayuda. El supervisor también administra productos y stock y consulta histórico, turnos y actividad; no accede al resumen mensual. El jefe tiene acceso a todos los módulos y puede crear, editar o desactivar usuarios. Cada persona debe usar su propia cuenta.',
      },
      {
        title: 'Terminales y medios de pago',
        text: 'Configuración permite cambiar el nombre del negocio, habilitar medios de pago y administrar terminales. Cada terminal representa una caja y puede tener un solo turno abierto. Usá nombres distintos y reconocibles.',
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
        text: 'Perla ayuda a Perla Negra a registrar ventas y existencias para uso interno. No emite facturas ni comprobantes fiscales ni se integra con ARCA. Los datos de la demo son ficticios y están destinados a pruebas.',
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
];

export function HelpPage({ role }: { role: Role }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('caja');
  const allowed = helpTopics.filter((t) => !t.roles || role === 'ADMIN' || t.roles.includes(role));
  const query = normalizeHelpSearch(search).trim();
  const topics = allowed.filter((t) =>
    matchesHelpSearch(
      `${t.title} ${t.sections.map((s) => `${s.title} ${s.text}`).join(' ')}`,
      query,
    ),
  );
  const activeTopic = topics.find((topic) => topic.id === selected) ?? topics[0];
  const visibleSections =
    activeTopic && query && !matchesHelpSearch(activeTopic.title, query)
      ? activeTopic.sections.filter((section) =>
          matchesHelpSearch(`${activeTopic.title} ${section.title} ${section.text}`, query),
        )
      : activeTopic?.sections;
  return (
    <div className="admin-workspace help-workspace">
      <PageHeading className="page-heading">
        <h1>Ayuda</h1>
      </PageHeading>
      <section className="panel help-page">
        <label className="field">
          Buscar en la ayuda
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Stock, vuelto, cierre…"
          />
        </label>
        <nav className="help-index" aria-label="Temas de ayuda">
          {topics.map((t) => (
            <button
              type="button"
              className={activeTopic?.id === t.id ? 'selected' : ''}
              aria-pressed={activeTopic?.id === t.id}
              onClick={() => setSelected(t.id)}
              key={t.id}
            >
              {t.title}
            </button>
          ))}
        </nav>
        {!topics.length && (
          <div className="admin-empty" role="status">
            <p>No hay temas para esa búsqueda. Probá con otra palabra o volvé a todos los temas.</p>
            <button className="button secondary small" onClick={() => setSearch('')}>
              Limpiar búsqueda
            </button>
          </div>
        )}
        {activeTopic && (
          <article id={`ayuda-${activeTopic.id}`}>
            <h2>{activeTopic.title}</h2>
            {visibleSections?.map((s) => (
              <section key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </section>
            ))}
          </article>
        )}
      </section>
    </div>
  );
}
