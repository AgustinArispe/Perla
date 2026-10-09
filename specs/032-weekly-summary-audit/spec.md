# 032 — Resumen semanal e historial comprensible

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

Hay dashboard mensual, comparativos, PDF mensual, auditoría de operaciones y eventos específicos de precios. Auditoría muestra etiquetas y una referencia corta, sin cambios antes/después. No debe prometerse un histórico detallado que nunca fue registrado.

## Experiencia

- Resumen mensual incorpora acceso Semana con síntesis: ventas netas, operaciones, margen bruto conocido/cobertura y hasta cinco pendientes destacados. Cada cifra se define una vez; detalles se expanden.
- Al empezar una semana, preparar el resumen de la última semana completa con sus fechas y acceso permanente por selector. También permitir Semana en curso identificada como parcial.
- Descarga PDF legible de una o dos páginas y XLSX con filtros; imprimir mantiene marca y cifras legibles. No envío por correo/WhatsApp sin una autorización y una integración específicas.
- Actividad traduce operaciones: Precio de X pasó de A a B; se ajustó stock con motivo; se anuló venta con referencia. Filtros por persona, operación, entidad y fechas.
- El historial se abre también desde producto, venta o turno, sin obligar al usuario a localizar códigos internos.

## Datos y reglas

- Resumen derivado de los servicios de informes actuales; no crear una segunda fórmula de ventas/margen. Comparaciones usan períodos equivalentes y fecha argentina. Devoluciones incluidas según definición vigente; crédito vendido separado de dinero cobrado.
- Snapshot semanal versionado e idempotente por negocio/período/versión. Generar en tarea del servidor, fuera del camino de confirmar venta; recuperar semanas pendientes al iniciar tras una interrupción. Identificar fecha de generación. Datos operativos como stock son una foto al generar, no historia reconstruida ficticiamente.
- Si aparece un ajuste posterior que cambia una semana, permitir Recalcular conservando versión anterior e indicar fecha. Consultas en vivo y snapshot deben estar claramente identificados.
- Auditoría estructurada solo incluye campos de negocio permitidos; nunca contraseña, hash, token, cookie, payload completo o contacto innecesario. Cambios antiguos sin detalle se muestran como Registro anterior sin desglose.
- Para nuevos cambios, registrar antes/después, entidad, motivo, usuario y fecha dentro de la transacción correspondiente. No permitir reescribir los eventos.
- Resumen solo OWNER/ADMIN; la visibilidad de eventos sigue permisos sobre la entidad, incluso al exportar. Desactivar Resumen mensual también retira el resumen semanal.

## Aceptación

1. Venta neta semanal concilia con histórico filtrado; pagos de deudas no se cuentan como ventas nuevas.
2. Semana incompleta no se compara como si fuese una semana entera; mostrar fechas exactas y Sin base cuando corresponda.
3. Reintentar generación no duplica snapshots; reiniciar el servidor permite recuperar la semana pendiente.
4. Cambio de precio deja antes/después y autor sin datos de acceso; editar nombre no inventa un cambio de precio.
5. PDF con importes grandes no corta cifras; Excel y pantalla concilian con la misma versión y filtros.
