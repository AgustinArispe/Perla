# Feature Specification: Proveedores y compras

**Feature Branch**: sin rama nueva; especificación en el checkout actual.

**Created**: 2026-10-01

**Status**: diseño aprobado; especificación lista para revisión documental.

**Input**: incorporar proveedores y recepción de compras como módulo configurable, con una experiencia rápida para una dueña que trabaja sola y capacidad para acompañar el crecimiento del negocio.

## User Scenarios & Testing

### User Story 1 - Mantener proveedores sin carga tediosa (Priority: P1)

La dueña o un supervisor crea, busca y actualiza proveedores. Para comenzar sólo necesita un nombre; teléfono, contacto, dirección y notas quedan disponibles en «Más datos».

**Why this priority**: una compra necesita identificar su origen, pero una ficha extensa impediría registrar rápidamente a un proveedor nuevo durante la recepción.

**Independent Test**: crear un proveedor sólo con nombre, encontrarlo por nombre o teléfono, completar datos adicionales y desactivarlo sin perder compras anteriores.

**Acceptance Scenarios**:

1. **Given** una persona con permiso de Proveedores y compras, **When** crea un proveedor con nombre, **Then** puede seleccionarlo de inmediato en una compra y completar el resto más adelante.
2. **Given** un proveedor existente, **When** se busca por nombre, contacto o teléfono, **Then** aparece con su estado y fecha de última compra.
3. **Given** un proveedor con compras, **When** se edita su nombre o contacto, **Then** sus documentos anteriores conservan la identificación histórica con la que fueron confirmados.
4. **Given** un proveedor inactivo, **When** se inicia una compra nueva, **Then** no se ofrece para seleccionar; sigue disponible en históricos.
5. **Given** un vendedor, **When** intenta consultar o modificar proveedores, **Then** el sistema rechaza el acceso.

### User Story 2 - Recibir mercadería con scanner o búsqueda (Priority: P1)

La dueña o un supervisor elige un proveedor, escanea o busca productos, indica cantidades y costo unitario, revisa el total y confirma la recepción una sola vez.

**Why this priority**: es el flujo que transforma una entrega física en costos y existencias confiables.

**Independent Test**: recibir una compra de productos por unidad y por peso, confirmar y comprobar el documento, los costos históricos y el stock correspondiente.

**Acceptance Scenarios**:

1. **Given** un producto con código conocido, **When** se escanea, **Then** se agrega a la compra; nuevos escaneos aumentan su cantidad sin crear renglones duplicados.
2. **Given** un producto sin código accesible, **When** se busca por nombre, código interno, marca o categoría, **Then** se puede agregar sin abandonar el borrador.
3. **Given** un producto por unidad, **When** se carga una cantidad, **Then** sólo acepta unidades enteras positivas.
4. **Given** un producto por peso, **When** se carga mercadería, **Then** permite ingresar gramos o kilogramos y muestra claramente la unidad y el costo por kilogramo.
5. **Given** una compra válida, **When** se confirma, **Then** el documento, sus renglones, los costos y los movimientos de stock aplicables quedan guardados juntos o no se guarda ninguno.
6. **Given** una respuesta perdida o un doble clic, **When** se reintenta la misma confirmación, **Then** se devuelve el resultado original sin duplicar compra, costo ni stock.
7. **Given** un costo distinto del anterior, **When** se confirma, **Then** se conserva el costo recibido y se ofrece revisar precios de venta; el sistema no los modifica por sí solo.

### User Story 3 - Continuar una compra sin perder trabajo (Priority: P1)

La persona puede interrumpir la carga, crear un proveedor o producto faltante, cambiar de pantalla o recargar el navegador y continuar el borrador.

**Why this priority**: durante una entrega real aparecen artículos o proveedores que todavía no están cargados; perder el avance genera doble trabajo y errores.

**Independent Test**: cargar varios renglones, crear un proveedor y un producto desde el flujo, recargar la aplicación y retomar con cantidades y costos intactos.

**Acceptance Scenarios**:

1. **Given** una compra en curso, **When** se crea un proveedor o producto desde ella, **Then** al volver se conserva el borrador y el nuevo registro queda seleccionado o disponible.
2. **Given** una compra no confirmada, **When** se recarga o se vuelve a ingresar, **Then** se recuperan proveedor, renglones, cantidades y costos.
3. **Given** un borrador recuperado con datos que cambiaron, **When** se intenta confirmar, **Then** se señalan sólo los renglones afectados y se conserva el resto del trabajo.
4. **Given** una compra en curso, **When** se elige descartarla, **Then** se solicita una confirmación clara y no se modifica stock ni costos.

### User Story 4 - Consultar y corregir compras con trazabilidad (Priority: P2)

La dueña o un supervisor consulta las recepciones por fecha, proveedor o estado, ve el detalle histórico y puede anular una recepción cuando su reversión es segura.

**Why this priority**: las compras afectan el valor y la cantidad de mercadería; las correcciones deben explicar qué pasó sin borrar evidencia.

**Independent Test**: filtrar una compra, abrir su detalle, anularla con motivo y comprobar que el documento queda vinculado a la corrección y que el stock se revierte una sola vez.

**Acceptance Scenarios**:

1. **Given** compras confirmadas, **When** se filtran por período, proveedor o estado, **Then** se muestran fecha, proveedor, total, responsable y estado.
2. **Given** una compra histórica, **When** se abre, **Then** se ven nombres, códigos, cantidades, costos y total tal como fueron confirmados aunque cambie el catálogo.
3. **Given** una recepción reversible, **When** una persona autorizada informa un motivo y confirma la anulación, **Then** se registra la corrección vinculada y se revierten una sola vez sus movimientos de stock.
4. **Given** una recepción cuyo stock ya fue consumido o corregido después, **When** se solicita anularla, **Then** el sistema bloquea la reversión automática, explica el conflicto y conserva el documento sin cambios.
5. **Given** una compra anulada, **When** se abre su detalle, **Then** se ven motivo, responsable, fecha y efecto de la anulación.

### User Story 5 - Usar Compras como función configurable (Priority: P2)

La dueña habilita o deshabilita Proveedores y compras sin afectar Caja ni borrar sus registros.

**Why this priority**: el sistema debe adaptarse a negocios chicos y crecer con ellos sin obligarlos a usar todas las herramientas.

**Independent Test**: habilitar Compras con Stock activo e inactivo, confirmar recepciones en ambos modos, deshabilitar el módulo y acceder a sus registros históricos desde Configuración.

**Acceptance Scenarios**:

1. **Given** Compras desactivado, **When** se usa el sistema, **Then** el menú y las acciones de nuevas compras no aparecen; Caja, Productos e históricos de ventas continúan funcionando.
2. **Given** compras históricas y el módulo desactivado, **When** la dueña elige «Ver registros» desde Funciones, **Then** puede consultarlas y exportarlas sin crear nuevas compras.
3. **Given** Stock desactivado, **When** se confirma una compra, **Then** se conserva el documento y sus costos sin inventar existencias ni movimientos.
4. **Given** Stock activo, **When** un producto tiene seguimiento de stock preparado, **Then** la recepción aumenta su existencia en la unidad correcta.
5. **Given** Stock activo y un producto que requiere conteo inicial, **When** se intenta confirmar, **Then** se conserva el borrador y se indica qué producto debe prepararse antes de recibirlo.

### Edge Cases

- Proveedor desactivado o eliminado lógicamente mientras otra persona lo usa en un borrador: conservar el borrador, bloquear la confirmación y permitir reemplazarlo.
- Producto desactivado, unidad de venta modificada o stock sin preparar durante la carga: señalar el renglón afectado sin descartar los demás.
- Un mismo producto se escanea muchas veces: aumentar cantidad con respuesta inmediata; mantener un único renglón y permitir edición manual.
- El mismo producto llega con dos costos dentro de una entrega: la primera versión requiere un costo unitario único por producto; la persona debe consolidarlo antes de confirmar.
- Costo cero, cantidad cero, valores negativos o superiores a límites razonables: rechazar y mantener el dato editable con una explicación concreta.
- Precio total con productos por peso: calcular con gramos enteros, costo monetario exacto y una regla de redondeo uniforme visible en el total.
- Cambio de permisos, vencimiento de sesión o función desactivada durante la edición: conservar el borrador local, rechazar la confirmación y pedir volver a validar acceso.
- Dos confirmaciones simultáneas del mismo borrador: registrar una sola recepción y devolver el mismo resultado a ambas solicitudes.
- Falla de almacenamiento durante la confirmación: no mostrar éxito ni aplicar una parte del stock; permitir consultar el resultado antes de reintentar.
- Intento de anulación después de ventas, conteos o ajustes que consumieron la cantidad recibida: no producir stock negativo ni reescribir movimientos posteriores.
- Restaurar un backup con Compras desactivado: recuperar configuración, documentos, costos, movimientos y trazabilidad de forma coherente.

## Requirements

### Functional Requirements

- **FR-001**: ofrecer Proveedores y compras como una función configurable, inicialmente desactivada en instalaciones que no la utilizaban.
- **FR-002**: permitir gestionar proveedores a supervisor, jefe y administrador; vendedor no puede ver datos ni acciones del módulo.
- **FR-003**: requerir sólo el nombre para crear un proveedor y admitir teléfono, persona de contacto, dirección y notas como datos opcionales agrupados.
- **FR-004**: permitir buscar proveedores por nombre, teléfono o contacto y mostrar estado y última compra sin exponer información innecesaria.
- **FR-005**: desactivar proveedores sin borrar compras ni cambiar sus copias históricas; proveedores inactivos no se usan en nuevas recepciones.
- **FR-006**: permitir una compra en borrador con proveedor, fecha de recepción, productos, cantidad y costo unitario; la fecha actual y el último costo conocido se sugieren y siempre se pueden revisar.
- **FR-007**: admitir productos por scanner y por búsqueda de nombre, código de barras, código interno, marca o categoría.
- **FR-008**: mantener un solo renglón por producto en cada compra; un escaneo repetido incrementa la cantidad.
- **FR-009**: expresar unidades en enteros y peso en gramos enteros; mostrar equivalencias comprensibles y calcular importes con precisión monetaria exacta.
- **FR-010**: validar antes de confirmar que proveedor y productos estén activos, cantidades y costos sean válidos y cualquier seguimiento de stock requerido esté preparado.
- **FR-011**: confirmar documento, detalle, copias históricas, costos y movimientos de stock en una sola operación indivisible.
- **FR-012**: exigir una identidad única de confirmación y devolver el resultado original ante reintentos; nunca duplicar efectos físicos o monetarios.
- **FR-013**: conservar en cada compra el nombre del proveedor y de los productos, códigos, unidad, cantidad, costo unitario, subtotal, total, fecha y responsable vigentes al confirmar.
- **FR-014**: registrar el costo recibido sin modificar automáticamente el precio de venta; después de confirmar se puede abrir una revisión de productos con cambios de costo.
- **FR-015**: cuando Stock esté activo, generar aumentos de existencia auditables para productos con seguimiento; cuando esté inactivo, registrar compra y costo sin crear cantidades ficticias.
- **FR-016**: impedir la confirmación si Stock está activo y un producto que debe controlarse aún necesita conteo inicial; conservar el borrador y ofrecer acceso a esa preparación.
- **FR-017**: guardar automáticamente el borrador y recuperarlo después de navegación, recarga o nuevo ingreso de la misma persona y terminal.
- **FR-018**: permitir crear proveedor o producto desde una compra sin perder su estado y volver al punto de carga.
- **FR-019**: mostrar antes de confirmar proveedor, cantidad de renglones, unidades o peso total, importe total y cualquier conflicto pendiente, con una sola acción principal «Recibir compra».
- **FR-020**: listar compras con filtros por período, proveedor y estado; mostrar fecha, proveedor, total, responsable y estado.
- **FR-021**: mostrar el detalle histórico completo de una compra sin recalcularlo a partir del catálogo actual.
- **FR-022**: permitir anulaciones sólo a supervisor, jefe o administrador, con motivo obligatorio y sin borrar ni editar el documento original.
- **FR-023**: una anulación segura debe registrar una operación vinculada y revertir una sola vez los movimientos originados por esa compra; si movimientos posteriores impiden una reversión coherente, debe bloquearse y explicar el siguiente paso.
- **FR-024**: mantener Compras independiente de cuentas corrientes, órdenes y recepciones parciales. En esta entrega las compras se consideran pagadas y no generan deudas.
- **FR-025**: al desactivar Compras, impedir nuevas operaciones y ocultar la navegación cotidiana; mantener consulta y exportación autorizada de registros anteriores desde Funciones.
- **FR-026**: registrar creación, confirmación, anulación y cambios de proveedor en la auditoría con responsable, fecha y referencia, sin credenciales ni datos secretos.
- **FR-027**: incluir proveedores, borradores confirmables, compras, costos, anulaciones y movimientos relacionados en backups y restauraciones consistentes.
- **FR-028**: mantener los formularios principales con hasta cinco entradas editables visibles por sección, acciones táctiles de al menos 44 px y uso completo a 360 px sin desplazamiento horizontal de página.
- **FR-029**: sostener búsqueda y escaneo fluidos con catálogos de 4.000 productos y consulta histórica paginada sin cargar todos los documentos de una vez.
- **FR-030**: no emitir comprobantes fiscales, facturas, órdenes bancarias ni comunicaciones automáticas al proveedor como parte de esta función.

### Key Entities

- **Proveedor**: origen de mercadería, estado y datos de contacto; puede quedar inactivo sin perder su historia.
- **Borrador de compra**: trabajo todavía editable de una persona y terminal, sin efectos sobre stock ni costos históricos.
- **Recepción de compra**: documento confirmado con proveedor, fecha, responsable, total, estado y copias históricas.
- **Detalle de compra**: producto, identificación, unidad, cantidad, costo unitario y subtotal confirmados.
- **Costo recibido**: valor histórico del producto originado por una recepción y disponible para análisis o revisión de precios.
- **Reversión de compra**: corrección vinculada al documento original, con motivo, actor, fecha y efectos físicos opuestos cuando son seguros.

## Success Criteria

### Measurable Outcomes

- **SC-001**: una persona de prueba crea un proveedor básico y lo selecciona en una compra en menos de 45 segundos, sin ayuda externa.
- **SC-002**: una recepción de 20 renglones ya existentes se completa por scanner y teclado en menos de 3 minutos en al menos 4 de 5 pruebas de uso.
- **SC-003**: 100% de fallas y reintentos simulados dejan compra, costos y stock completamente guardados una vez o completamente sin guardar.
- **SC-004**: 100% de compras de prueba conservan nombres, códigos, unidades, cantidades y costos históricos después de editar proveedor y productos.
- **SC-005**: 100% de anulaciones admitidas quedan vinculadas, con motivo y una única reversión; los casos inseguros se bloquean sin alterar el stock.
- **SC-006**: con 4.000 productos, el 95% de búsquedas habituales devuelve resultados utilizables en menos de un segundo y cada escaneo conocido actualiza el borrador dentro del objetivo de 100 ms en el equipo de referencia documentado.
- **SC-007**: a 360 px y 1366 px se completan alta rápida de proveedor, carga, revisión, confirmación y consulta sin controles principales inaccesibles ni desplazamiento horizontal de página.
- **SC-008**: apagar y reactivar el módulo preserva el 100% de documentos, costos y trazabilidad de las pruebas, tanto con Stock activo como inactivo.

## Assumptions

- La primera versión registra mercadería efectivamente recibida. Órdenes de compra, entregas parciales y conciliación con facturas requieren una ampliación posterior.
- Las compras se consideran pagadas. Cuentas corrientes, vencimientos y pagos parciales de proveedores pertenecen a otra etapa opcional.
- Un producto tiene un costo unitario por recepción; costos por lote o por entregas separadas requieren documentos separados.
- Existe un depósito lógico. Varias sucursales, ubicaciones y traspasos no forman parte de esta etapa.
- Compras requiere conexión al servidor para confirmar; un corte no se interpreta como recepción exitosa.
- La aplicación no calcula impuestos fiscales ni se integra con ARCA. Los importes sirven para gestión interna.
- La dueña, supervisor, jefe y administrador usan los permisos actuales; vendedor sigue limitado a Caja.
- La identidad visual vigente es Perla Negra y se aplica respetando el sistema PULSE. La referencia de color verde en la constitución es anterior y debe corregirse antes de implementar el frontend de esta función.

## Out of Scope

- Órdenes de compra y aprobaciones previas.
- Recepciones parciales o múltiples contra un mismo pedido.
- Facturas fiscales, IVA, percepciones, retenciones o integración con ARCA.
- Cuenta corriente, deuda, vencimientos o pagos parciales a proveedores.
- Comunicación automática por correo o mensajería.
- Modificación automática del precio de venta o márgenes obligatorios.
- Lotes, vencimientos y múltiples depósitos.
