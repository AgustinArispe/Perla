# 031 — Agenda de cobros y pagos

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

Existen cuentas, cobros, pagos parciales y créditos. Los contratos revisados no incluyen fecha de vencimiento de la obligación. Antigüedad de deuda y vencimiento son conceptos diferentes.

## Experiencia

- Clientes → Por cobrar; Proveedores → Por pagar. El jefe ve ambos grupos en Inicio, con enlace al pendiente exacto.
- Filtros Vencidos, Esta semana, Próximos y Sin fecha. Mostrar importe pendiente actual y fecha acordada; una deuda antigua sin fecha se mantiene Sin fecha.
- En la venta/compra a cuenta, fecha pactada opcional bajo Más opciones. Permitir pactar una fecha después desde la cuenta; conservar autor y cambios.
- Registrar cobro/pago abre el formulario existente con persona y obligación precargadas, propone saldo restante y permite parcial. Confirmación muestra la cuenta y el medio que se modifican.
- El resumen de semana distingue Por cobrar y Por pagar; no muestra una resta como dinero disponible garantizado.

## Reglas

- Fecha de vencimiento/compromiso nullable por obligación, no solo una fecha global por cliente. Deudas previas conservan null; no inventar acuerdos.
- Imputación a obligaciones concretas evita que un cobro parcial quite la alerta de todas las deudas. Importes derivados de saldos reales después de créditos, devoluciones y anulaciones.
- Cobro de deuda no aumenta ventas; pago de proveedor no agrega compras ni descuenta stock. Efectivo se concilia con turno solo mediante la operación existente.
- Al desactivar crédito/cuentas con pendientes, seguir permitiendo resolver compromisos según la política actual.
- No enviar recordatorios externos automáticamente. Cada aviso financiero hereda permisos y no expone datos a vendedores.

## Aceptación

1. Deuda $10.000 vencida y cobro $3.000 dejan aviso por $7.000; fecha anterior permanece.
2. Deuda de hace 60 días sin fecha no se marca vencida; puede fijarse fecha y quedar auditada.
3. Cobrar $7.000 en efectivo suma una sola entrada al turno y no vuelve a sumar ventas.
4. Pagos/fechas modificados desde dos equipos detectan conflicto y no duplican imputaciones.
5. Agenda, detalle de cuenta y Excel concilian saldos incluso con anticipos y devoluciones.
