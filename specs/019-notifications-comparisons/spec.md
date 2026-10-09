# Feature Specification: Notificaciones y comparativos

**Feature Branch**: `feature/web-frontend`  
**Created**: 2026-10-05  
**Status**: alcance aprobado en el roadmap modular.

## User Scenarios & Testing

### User Story 1 - Ver avisos que requieren una acción (P1)

La dueña o supervisora abre una campana y encuentra avisos actuales de stock, lotes y caja, agrupados y con acceso directo a la tarea correspondiente.

**Independent Test**: provocar stock bajo, vencimientos y diferencia de caja; comprobar visibilidad por rol, contador pendiente, lectura y resolución al cambiar la condición.

### User Story 2 - Comparar períodos equivalentes (P1)

La dueña compara hoy, semana, mes o un rango personalizado contra el tramo anterior de igual duración, con fechas e importes claros.

**Independent Test**: registrar ventas y devoluciones en ambos períodos y comprobar totales, porcentaje y caso sin base anterior.

### User Story 3 - Mantener una interfaz tranquila (P2)

Los avisos aparecen en una bandeja compacta; no interrumpen Caja ni agregan trabajo al escaneo. En celular se consultan y abren con una mano.

**Independent Test**: operar Caja con y sin avisos, medir que la cotización no invoque consultas de notificaciones y recorrer la bandeja a 360 px.

## Requirements

- **FR-001**: generar avisos deterministas desde el estado actual; no crear uno por cada venta repetida.
- **FR-002**: distinguir leído de resuelto. Leer oculta el contador; resolver depende de que desaparezca la condición.
- **FR-003**: una variación material de una condición leída vuelve a marcarla pendiente mediante una firma estable.
- **FR-004**: supervisor ve stock y lotes; jefe/administrador agrega caja y observaciones comerciales. Ningún texto filtra costos a roles no autorizados.
- **FR-005**: Notificaciones es optativa y parte inicialmente apagada. Errores de cobro, sesión y guardado permanecen fuera de este interruptor.
- **FR-006**: cada aviso incluye severidad, momento, frase breve y destino permitido.
- **FR-007**: comparar `TODAY`, `WEEK`, `MONTH` y `CUSTOM`; el servidor decide fechas con zona `America/Argentina/Buenos_Aires`.
- **FR-008**: el período anterior tiene la misma cantidad de días y termina justo antes del actual.
- **FR-009**: ventas netas descuentan devoluciones y no vuelven a sumar cobros u otros movimientos.
- **FR-010**: cuando el período anterior es cero, devolver porcentaje nulo y mostrar `Sin base de comparación`.
- **FR-011**: sólo jefe/administrador accede a comparativos comerciales; el servidor aplica el permiso aunque no exista el botón.
- **FR-012**: las consultas de avisos e informes no participan del camino de escaneo ni de confirmación de ventas.

## Success Criteria

- **SC-001**: condiciones repetidas conservan una sola identidad y un contador estable.
- **SC-002**: 100% de avisos y comparativos respetan rol y funciones activas.
- **SC-003**: ventas, devoluciones, conteo y promedio concilian en ambos períodos.
- **SC-004**: campana y comparador funcionan a 360 px sin desplazamiento horizontal.

