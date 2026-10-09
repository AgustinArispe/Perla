# Feature Specification: Funciones configurables por negocio

**Feature Branch**: sin rama nueva; especificación en el checkout actual.

**Created**: 2026-10-01

**Status**: propuesta de diseño; pendiente de implementación y pruebas.

**Input**: Agus aprobó ampliar compras, costos, stock, lotes, precios, proveedores, promociones, notificaciones, caja, métricas y crecimiento. Cuenta corriente de clientes será opcional. Configuración debe permitir elegir funciones sin romper otras, con pantallas sencillas y pocos campos visibles.

## User Scenarios & Testing

### User Story 1 - Elegir las funciones del negocio (Priority: P1)

La dueña entra en Configuración > Funciones y activa únicamente las herramientas que necesita.

**Why this priority**: Las ampliaciones deben adaptarse a un negocio atendido por una persona y seguir sirviendo cuando incorpore personal.

**Independent Test**: con Caja, Catálogo y Stock existentes, habilitar y deshabilitar Stock, comprobar su efecto en Caja, menú y consultas; no requiere construir Compras.

**Acceptance Scenarios**:

1. **Given** un negocio existente, **When** recibe esta ampliación, **Then** conserva sus funciones, permisos y registros actuales; ninguna función nueva se activa por sorpresa.
2. **Given** un jefe o administrador, **When** abre Funciones, **Then** ve nombres de negocio, estado y una frase breve de utilidad, agrupados por actividad.
3. **Given** un vendedor o supervisor, **When** intenta cambiar las funciones, **Then** el sistema rechaza el cambio y conserva la configuración.
4. **Given** una función aún no entregada, **When** se consulta la configuración, **Then** no aparece como un interruptor disponible ni se puede activar por otro acceso.
5. **Given** una función activa, **When** accede una persona sin permiso, **Then** no obtiene acceso a sus datos por tenerla habilitada en el negocio.

### User Story 2 - Aplicar cambios compatibles (Priority: P1)

La dueña recibe un resumen de las funciones relacionadas y aplica el conjunto de cambios en una sola confirmación.

**Why this priority**: Ocultar una pantalla no resuelve las dependencias entre ventas, existencias y dinero.

**Independent Test**: probar dependencias y bloqueo de operaciones pendientes usando perfiles de configuración; no requiere desarrollar todos los módulos futuros.

**Acceptance Scenarios**:

1. **Given** Stock apagado, **When** la dueña solicita Lotes, **Then** ve «También se activará Stock» y confirma ambos cambios juntos.
2. **Given** Lotes activo, **When** solicita apagar Stock, **Then** el sistema identifica Lotes y ofrece desactivar ambos juntos; nunca mantiene Lotes operativo sin Stock.
3. **Given** un cambio con un requisito operativo pendiente, **When** se previsualiza, **Then** se explica qué resolver y se ofrece acceso a esa tarea; no se guarda una configuración parcial.
4. **Given** dos personas editando funciones, **When** una guarda antes que la otra, **Then** la segunda debe revisar el estado actualizado antes de aplicar su propuesta.
5. **Given** una venta y un cambio de funciones simultáneos, **When** se confirman, **Then** la venta se registra completa con una configuración válida o conserva el carrito y solicita revisar; nunca queda parcialmente registrada.

### User Story 3 - Apagar y recuperar sin perder información (Priority: P1)

La dueña puede dejar de usar una función, consultar sus registros anteriores y retomarla luego con una transición segura.

**Why this priority**: Personalizar no puede borrar deudas, existencias, promociones aplicadas ni movimientos históricos.

**Independent Test**: desactivar una función con registros, consultar su histórico autorizado, reactivarla y restaurar una copia de seguridad que la contiene.

**Acceptance Scenarios**:

1. **Given** promociones desactivadas, **When** se consulta una venta anterior, **Then** se conserva el descuento y su explicación tal como se cobró.
2. **Given** compras históricas y Compras desactivado, **When** la dueña entra en Funciones > Compras > Ver registros, **Then** puede consultarlos y exportarlos sin crear nuevas compras.
3. **Given** una deuda pendiente, **When** se solicita apagar su cuenta corriente, **Then** se impiden nuevas operaciones a crédito y se conserva un modo «Solo pendientes» para cobrar/pagar y corregir esos compromisos. El cierre definitivo requiere saldo cero y documentos resueltos.
4. **Given** Stock desactivado y ventas posteriores, **When** se reactiva, **Then** cada producto afectado requiere conteo actual antes de mostrar una existencia válida. No se descuenta retrospectivamente sobre saldos antiguos.
5. **Given** un respaldo con funciones e históricos, **When** se restaura, **Then** se recuperan sus estados y datos juntos, se invalidan sesiones y se recargan las funciones al ingresar.
6. **Given** una venta previa a la desactivación, **When** se solicita una anulación autorizada, **Then** se corrigen sus efectos originales mediante operaciones vinculadas y auditadas; apagar un módulo no impide corregir una venta ni habilita ajustes arbitrarios.

### User Story 4 - Trabajar con una interfaz proporcional (Priority: P2)

Cada persona encuentra las acciones correspondientes a su trabajo y a las funciones activas, en computadora o celular.

**Why this priority**: La cantidad de funciones disponibles no debe convertirse en cantidad de campos obligatorios.

**Independent Test**: recorrer Caja, Productos, Ayuda y Configuración con perfiles básico/completo y roles vendedor/supervisor/jefe.

**Acceptance Scenarios**:

1. **Given** Compras y Lotes apagados, **When** se crea un producto, **Then** no se muestran campos de proveedor, compra o lote.
2. **Given** un negocio básico, **When** se abre Caja, **Then** se puede escanear, cobrar y comenzar otra venta sin completar cliente, proveedor, costo o lote.
3. **Given** un cambio de funciones mientras otra terminal está abierta, **When** esa terminal vuelve a operar, **Then** actualiza sus herramientas; un borrador se conserva y cualquier cambio de total requiere revisión antes de cobrar.
4. **Given** acceso móvil a 360 px de ancho, **When** la dueña configura funciones, **Then** puede completar el flujo sin desplazamiento horizontal de la página y con acciones táctiles de al menos 44 px.

### Edge Cases

- Función desconocida, retirada o presente en una copia creada con una versión más nueva: rechazar activación/restauración incompatible, sin eliminar datos.
- Doble confirmación o respuesta perdida: el cambio se aplica una vez; reabrir configuración muestra el estado real.
- Dependencias circulares o prerrequisitos no disponibles: la configuración no se ofrece como válida.
- Promoción vencida o desactivada con el cobro abierto: conservar carrito y solicitar revisión si cambia el total.
- Venta con respuesta pendiente: consultar su resultado antes de permitir un reenvío con otras reglas.
- Cambio de permisos o sesión vencida durante edición: rechazar al confirmar y mantener el trabajo editable cuando corresponda.
- Rehabilitar costos/lotes/stock con datos incompletos: exigir preparación únicamente donde sea necesaria; no inventar costos, cantidades ni fechas.
- Desactivar notificaciones comerciales no oculta errores de cobro, bloqueo de sesión ni fallos de guardado.
- Usuarios sin permiso de costos no reciben esos valores en consultas, reportes, exportaciones ni avisos.

## Requirements

### Functional Requirements

- **FR-001**: mantener un núcleo obligatorio: acceso y permisos, catálogo mínimo, venta/pagos, registro histórico, integridad de caja, configuración, auditoría y recuperación. Sus pantallas respetan roles; sus garantías no tienen interruptor.
- **FR-002**: admitir funciones opcionales disponibles, con nombre, descripción de una oración, dependencias, estado y reglas de preparación/salida. Las funciones futuras del roadmap no deben aparecer como entregadas.
- **FR-003**: permitir cambiar funciones solo a jefe/administrador y registrar quién cambió qué, cuándo y con qué resultado.
- **FR-004**: distinguir disponibilidad del módulo, habilitación del negocio, permiso del usuario y estado operativo del registro; se deben cumplir todas para iniciar una acción.
- **FR-005**: mostrar el impacto completo antes de confirmar cambios relacionados; activación/desactivación se guarda toda o no se guarda.
- **FR-006**: comprobar configuración y permisos al ejecutar cada operación; enlaces directos, exportaciones, trabajos automáticos y terminales antiguas respetan las mismas reglas.
- **FR-007**: los cambios no borran datos históricos ni recalculan ventas, costos o beneficios comerciales ya confirmados.
- **FR-008**: desactivar elimina nuevas operaciones y navegación cotidiana de la función. Sus registros autorizados siguen accesibles desde Funciones y documentos vinculados; las correcciones de operaciones previas conservan trazabilidad.
- **FR-009**: admitir estados de transición explícitos: preparación, activo, solo pendientes y desactivado. No todas las funciones necesitan todos los estados; ninguna transición se resuelve silenciosamente.
- **FR-010**: bloquear la salida de funciones cuando pendientes físicos o financieros no puedan resolverse en modo consulta; indicar documento y acción requerida. Solo pendientes permite liquidar compromisos previos, sin generar nuevos.
- **FR-011**: mantener independientes las dependencias obligatorias y las mejoras opcionales: Compras puede registrar gastos de mercadería con Stock apagado; habilitar avisos no obliga a usar lotes, cuentas o métricas.
- **FR-012**: definir dependencias obligatorias de módulos futuros en su propia spec antes de habilitarlos: Lotes requiere Stock; Rentabilidad requiere Costos e Informes; cuenta de proveedores requiere Proveedores y Compras; cuenta de clientes requiere Clientes; traspasos requiere Stock y varias ubicaciones.
- **FR-013**: actualizar menús, acciones, formularios, Ayuda y notificaciones según las funciones y permisos; no ofrecer botones que luego fracasan por una función apagada.
- **FR-014**: conservar borradores ante cambios; antes de confirmar dinero o stock verificar su vigencia y explicar solo el cambio que afecta la operación.
- **FR-015**: recuperar funciones y datos coherentemente desde backup; activar un módulo no inicia importaciones, compras, cobros o comunicaciones externas.
- **FR-016**: al desactivar Stock marcar el inicio del período sin seguimiento; al reactivar, exigir conteos actuales para los productos afectados antes de usarlos como saldo confiable. Anulaciones de ventas anteriores deben respetar los conteos posteriores.
- **FR-017**: las configuraciones nuevas parten de un perfil básico editable. La instalación actual conserva su estado. Los perfiles son ayudas iniciales y nunca reemplazan decisiones guardadas sin previsualización.
- **FR-018**: limitar formularios principales a los datos necesarios para su acción, con un objetivo de hasta cinco entradas editables visibles por sección; grillas repetibles de productos quedan aparte. Campos adicionales aparecen bajo «Más opciones» o al elegir el caso que los requiere.
- **FR-019**: mantener una acción principal por tarea, nombres concretos, ayudas de una oración junto al punto de duda y errores accionables. Las etiquetas de campos no se sustituyen por placeholders.
- **FR-020**: el comportamiento de escaneo y cobro mantiene su rapidez con funciones apagadas o activas; validar resultados y tiempos con catálogos de 4.000 artículos.
- **FR-021**: visibilidad de un panel informativo se puede personalizar sin detener el registro contable/operativo del que dependen las ventas. En este incremento el turno requerido por la caja sigue siendo parte del núcleo.

### Key Entities

- **Función disponible**: capacidad entregada, dependencias y reglas de ciclo de vida.
- **Configuración del negocio**: selección vigente, revisión y estados de preparación/pendientes.
- **Propuesta de cambio**: selección solicitada, efectos relacionados, requisitos y confirmación.
- **Registro del cambio**: actor, fecha, estado anterior/nuevo y motivo cuando corresponda.
- **Perfil inicial**: selección orientativa para comenzar, editable por el negocio.
- **Permiso**: acción autorizada para una persona, independiente de las funciones contratadas o habilitadas.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% de combinaciones incompatibles del catálogo de funciones de prueba son rechazadas sin cambios parciales.
- **SC-002**: 100% de intentos de iniciar operaciones deshabilitadas o sin permiso son rechazados, incluidos accesos directos.
- **SC-003**: apagar/reactivar y restaurar una copia preserva importes históricos, saldos financieros y cantidad de registros en todos los escenarios de aceptación.
- **SC-004**: una dueña de prueba activa una función sin dependencias en menos de un minuto y completa las tareas básicas de Caja sin instrucciones adicionales en al menos 4 de 5 pruebas de uso.
- **SC-005**: a 360 px y 1366 px se completan configuración, revisión de impacto y consulta histórica sin contenido o botones principales inaccesibles.
- **SC-006**: con 4.000 productos, en equipo y conexión de referencia documentados, el 95% de escaneos ya conocidos se refleja en menos de 100 ms y el 95% de cierres confirmados permite otra venta en menos de 1 segundo. Se informan resultados medidos; no son mediciones actuales.
- **SC-007**: doble envío, cambio concurrente y pérdida de respuesta no duplican cambios ni vacían carritos sin confirmación persistida.

## Assumptions

- Primera aplicación: Perla Negra, atendida por su dueña; personalización reutilizable para otros comercios.
- Una instalación y base por negocio por ahora. Personalización no implica compartir datos entre clientes.
- Las funciones comerciales requieren conexión para confirmar operaciones; no se promete cobro offline.
- Las nuevas funciones se entregan progresivamente, inicialmente desactivadas. La gestión de módulos es el primer incremento.
- Supervisor administra catálogo/stock; jefe y administrador ven información financiera sensible. La ampliación de permisos comerciales se especificará por módulo.
- Este documento define el producto; contratos, migraciones y tareas se detallan en la fase plan de Spec Kit.
- La identidad de Perla Negra sigue DESIGN.md y la instrucción vigente del usuario. La paleta antigua de la constitución requiere actualización antes de implementar; varias ubicaciones también exige revisar su alcance actual de un depósito.
