# Control sencillo y crecimiento del producto

Fecha: 7 de octubre de 2026. Estado: diseño y planificación; no implementado.

## Decisión de producto

Las mejoras aprobadas se incorporan como tareas dentro de los módulos actuales, con un Inicio por perfil como acceso. Cada pendiente informa qué pasa y abre la acción correcta con filtros y entidad precargados. Las acciones que alteran dinero, stock o precios siempre muestran una revisión y requieren confirmación de la persona que opera.

Se evaluaron tres formas: agregar módulos para cada herramienta, ampliar solo los reportes o conectar pendientes con acciones existentes. Se elige la tercera porque permite encontrar y resolver el problema sin conocer la estructura del sistema. Los módulos siguen disponibles para el uso habitual.

## Lo existente y lo nuevo

| Mejora | Base comprobada | Trabajo pendiente |
|---|---|---|
| Compra sugerida | Faltantes, compras recibidas, traslados | Demanda/cobertura, pedidos pendientes y recepción parcial |
| Sin movimiento | Ventas, productos y existencias | Rotación por período/ubicación y acciones de revisión |
| Precios para revisar | Costos y actualización masiva con vista previa | Reglas de revisión y eventos de precio/revisión |
| Conteo rápido | Conteo individual y movimientos auditados | Sesión por categoría/ubicación, scanner y conflictos |
| Diferencias de caja | Esperado, contado y diferencia por turno | Vista de excepciones, agrupaciones y revisión con nota |
| Vencimientos | Lotes con fecha y avisos agregados | Lista acotada, ubicación y acceso al lote exacto |
| Cobros y pagos | Cuentas y pagos/cobros parciales | Fechas pactadas, agenda conjunta y precarga de obligaciones |
| Resumen semanal | Dashboard mensual/comparativos/PDF | Vista semanal y snapshot recuperable |
| Filtros guardados | Filtros y XLSX múltiple | Vistas privadas sincronizadas entre dispositivos |
| Historial claro | Auditoría y cambios de precios | Antes/después permitido y accesos desde cada entidad |

## UX por perfil

- Vendedor: Caja como inicio, scanner listo, cliente opcional, cobro y su turno. Sin tarjetas comerciales ni nuevos formularios ajenos a la venta.
- Supervisor: tareas operativas autorizadas, stock/lotes/recepciones; sin dashboard ni recomendaciones de margen.
- Jefe/admin: cinco pendientes priorizados con total por grupo y acceso Ver todos; análisis detallado bajo Resumen mensual. Accesos frecuentes a vender, comprar, contar, cobrar y pagar según funciones habilitadas.
- Preferencia de inicio por usuario entre páginas autorizadas. La configuración del negocio habilita funciones; el rol autoriza acciones.

## Ejemplos de recorridos

1. Quedan pocos productos → Revisar reposición → ajustar cantidades → preparar pedido → recibir mercadería al llegar.
2. Subió un costo → Revisar precios → seleccionar artículos → ver antes/después → confirmar.
3. Hay una cuenta pendiente → Ver deuda → registrar cobro parcial → ver saldo restante y entrada de caja, si fue efectivo.
4. Revisar góndola → Hacer conteo → escanear/contar → revisar diferencias → confirmar ajustes válidos.

Todos vuelven al punto de origen con filtros conservados. Un fallo no vacía lo ingresado y un reintento no duplica la operación.

## Entregas y dependencias

1. **027 — Inicio y vistas guardadas:** acceso, destinos concretos y reglas de UX. Inicialmente muestra solo tareas existentes; agrega nuevas a medida que están listas.
2. **028 — Reposición/pedidos** y **029 — Rotación/precios:** herramientas para comprar y revisar mercadería. 029 no depende del pedido, pero ambas consumen la navegación de 027.
3. **030 — Conteos, vencimientos y caja:** recorridos operativos guiados y revisión de excepciones.
4. **031 — Agenda:** fechas pactadas y control de cobros/pagos, sobre las cuentas ya implementadas.
5. **032 — Semana e historial:** síntesis de control y evidencia comprensible; auditoría nueva se incorpora desde las primeras etapas con el mismo contrato, evitando perder cambios mientras se completa la vista final.

Cada spec tiene plan, tareas pendientes y escenarios de aceptación. No se publican automatismos ni se generan compras/pagos sin intervención del usuario.

## Criterios de sencillez y entrega

- Un pendiente abre su entidad o lista filtrada en una acción. Una vista guardada se recupera sin reingresar filtros.
- Una acción principal por sección; hasta cinco campos iniciales como objetivo, con campos condicionales solo cuando corresponden. No dividir formularios simples en asistentes innecesarios.
- Listas paginadas, totales completos, cantidades/unidades legibles, errores con recuperación y acciones de 44 px en celular.
- Mantener campos numéricos claros: cantidad contada, importe recibido y precio por kilo no comparten etiquetas ambiguas.
- Un estado vacío indica ausencia real de datos; un error o una función apagada nunca se presenta como Todo al día.
- Referencia visual vigente: tinta, marfil y latón; reutilizar componentes actuales. La jerarquía y la continuidad de la tarea tienen prioridad sobre animaciones.
- Medir acceso a pendientes, recuperación de filtros, errores por operación y tiempos de caja con pruebas locales, sin incorporar seguimiento externo.
- Validar con dos cajas, permisos diferenciados, cinco meses de historia, productos nuevos/sin movimiento/inactivos, devoluciones, lotes y varios depósitos.

## Fuentes revisadas

`src/renderer/App.tsx`, `src/worker/notifications/service.ts`, `src/shared/customers.ts`, `src/shared/supplier-accounts.ts`, `src/shared/purchases.ts`, `src/renderer/features/stock/MovementForm.tsx`, `src/renderer/features/products/PriceBulkDialog.tsx`, `src/renderer/features/register/ShiftHistory.tsx`, `src/renderer/features/audit/AuditPage.tsx`, `src/domain/permissions.ts` y las specs 014–026.
