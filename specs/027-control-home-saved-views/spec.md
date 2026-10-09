# 027 — Inicio por perfil y vistas guardadas

## Reglas comunes

- Fecha de diseño: 2026-10-07. Estado: planificado; no representa funcionalidad implementada.
- Alcance autorizado: las diez mejoras de control propuestas y simplificación de UX. Las decisiones de detalle documentadas son criterios de implementación para revisión.
- Mantener React/TypeScript, Fastify/worker y SQLite; ampliar servicios existentes. Identidad Perla Negra de DESIGN.md. La copia Mac independiente no se modifica en esta entrega.
- Permisos y funciones habilitadas se verifican en backend, además de la interfaz. Una preferencia visual nunca concede permisos.
- Dinero en centavos, peso en gramos; operaciones de negocio transaccionales, idempotentes y con control de revisión. No sobrescribir datos históricos.
- Campos indispensables primero; opciones avanzadas a pedido. Una acción principal por tarea, texto puntual, controles táctiles y teclado. Ayuda extensa en Ayuda.
- Toda lista de control tiene paginación y exportación XLSX con los mismos filtros, selección múltiple cuando corresponda y hoja Filtros. Exportar nunca cambia el negocio.
- Ocultar un módulo no oculta compromisos pendientes ni borra datos. Su estado de solo consulta/resolución respeta las dependencias actuales.
- Validación con SQLite real, API autorizada y circuitos web en escritorio y 390 px. No afirmar rendimiento ni compatibilidad con scanner físico sin medirlos.

## Problema y base actual

App.tsx concentra navegación de módulos y abre Caja para usuarios web. NotificationBell lleva al módulo general, sin producto, lote ni cierre concreto. Ya existen filtros y ExportButton, pero no vistas guardadas persistentes.

## Experiencia

- Vendedor: acceso directo a Caja y tareas de su turno. Supervisor: inicio operativo con stock, recepción y lotes; sin indicadores comerciales. Jefe/admin: inicio con pendientes de mercadería, precios, dinero y caja, respetando módulos habilitados.
- En el inicio mostrar como máximo cinco pendientes ordenados por urgencia y fecha; cada grupo informa el total y ofrece Ver todos. Resumen mensual sigue siendo el lugar de análisis detallado.
- Acciones llevan al registro exacto o a la lista prefiltrada; Volver conserva búsqueda, filtros, página y posición. No usar contadores recortados como si fueran el total real.
- Solo se carga información del perfil autorizado. La caja no espera consultas del inicio ni refresca todo el catálogo por abrir un aviso.
- Guardar vista requiere únicamente nombre. Ejemplos: Para reponer del depósito; Clientes con saldo. Alcance privado por usuario; sincronizada entre PC y celular. No compartir vistas en esta etapa.
- Fechas relativas se recalculan al abrir (Esta semana); fechas fijas mantienen el rango. Exportar usa la selección efectiva, no un rango antiguo invisible.
- Una vista conserva filtros y orden, nunca resultados, secretos, sesiones ni IDs de cursor. Si perdió permiso o se desactivó una función, informar y ofrecer volver, sin ejecutar consultas prohibidas.
- Registrar un aviso como leído no lo resuelve. Su condición real debe desaparecer; no repetirlo por cada venta.

## Contratos y persistencia

- Centro de pendientes devuelve grupos con total completo, muestra limitada, fecha de cálculo, causa, entidad y acción tipada; no URLs ni nombres de operaciones arbitrarios.
- Reutilizar NotificationService; separar información financiera reservada del contenido operativo.
- Tabla saved_views: id, user_id, module, name, filter_schema_version, filters_json, sort_json, revision, created_at_utc, updated_at_utc. Límite inicial 30 por usuario y validación por contrato de cada módulo; nombres de hasta 60 caracteres.
- Consultar/editar/eliminar una vista requiere ser su propietario; borrar una vista no afecta movimientos del negocio.
- Inicio permite preferencia de acceso propia entre páginas autorizadas, sin alterar permisos. Cambiar de módulo preserva los mecanismos actuales de protección de carritos/borradores.

## Aceptación

1. Un jefe abre un aviso de faltante y ve el artículo/ubicación señalado; vuelve al inicio sin perder contexto.
2. Un supervisor no recibe importes de ventas/margen ni en JSON ni por exportación, aunque intente invocar la consulta.
3. Dos usuarios guardan vistas con el mismo nombre y solo acceden a las propias; otro dispositivo recupera la vista.
4. Una vista con dos categorías y dos estados genera el mismo conjunto que la búsqueda manual y el Excel.
5. Con 100 faltantes se ven cinco pendientes y un total correcto; error de consulta se muestra con Reintentar, no como Todo al día.
