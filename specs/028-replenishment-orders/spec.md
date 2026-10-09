# 028 — Reposición sugerida y pedidos a proveedores

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

Stock y dashboard muestran faltantes y compras recibidas. No existe un pedido confirmado pendiente de recepción; un borrador de compra no prueba que haya mercadería en camino. Antes de descontar lo pedido en una sugerencia hay que registrar ese compromiso.

## Experiencia

- Stock incorpora Preparar compra. Primera vista: ubicación, cobertura y lista sugerida con cantidades editables. Proveedor habitual se propone cuando hay evidencia; los productos sin proveedor quedan juntos para asignarlos.
- Mostrar motivo por fila: Bajo mínimo, Se vende seguido, Sin historial o Pedido en camino. Detalle del cálculo bajo expansión.
- Agrupar por proveedor y generar pedido interno o descargar XLSX. No enviar mensajes ni compras externas automáticamente.
- Un pedido no incrementa stock ni genera deuda. Recibir mercadería abre el flujo existente con cantidades/costos propuestos, admite recepción parcial y descuenta solo lo recibido del pendiente.
- Volver a abrir el mismo faltante muestra el pedido pendiente para evitar duplicarlo.

## Reglas

- Ventana inicial de referencia: 28 días; cobertura inicial: 7 días de apertura, editables. Calendario de apertura configurable con lunes-sábado preseleccionados para la demo; no asumirlo para todos los negocios.
- Demanda neta por producto y ubicación con ventas completadas y devoluciones neteadas; incluir días abiertos sin ventas, limitar antigüedad a evidencia disponible. Mostrar cobertura de datos y no prometer demanda perdida por días sin stock.
- objetivo = máximo(mínimo configurado, demanda diaria × días de cobertura); sugerido = máximo(0, objetivo - disponible vendible - entradas confirmadas pertinentes). Redondeo por unidad de compra, si está definida; nunca sumar kilos y unidades.
- Solo restar entregas confirmadas previstas dentro del horizonte. Pedidos sin fecha se muestran aparte para revisión; retrasados requieren confirmar llegada. Traslados entrantes se consideran una sola vez en el destino.
- Mercadería vencida/bloqueada no es disponible vendible. Stock sin contar se marca Revisar conteo, no se trata como cero. Artículos inactivos quedan fuera de reposición por defecto.
- No usar inventario de otro depósito como disponibilidad local. Si sobra en otro, ofrecer Revisar traslado antes de comprar; no descontar ese stock hasta registrar el movimiento.
- Sin ventas suficientes, sugerir por mínimo conocido; si faltan ambos datos, pedir cantidad manual con motivo visible.

## Datos nuevos

Pedido con proveedor, ubicación destino, estados DRAFT/ORDERED/PARTIAL/RECEIVED/CANCELLED, fecha prevista opcional, autor y revisión. Líneas con cantidad pedida/recibida/cancelada, unidad y costo estimado separado del costo recibido. Vínculo entre línea y recepción; claves de idempotencia.

Estados y saldos se derivan de transacciones: cancelar el resto no anula compras recibidas. Recepción por encima del saldo exige revisión explícita de cantidades. Configuración opcional Reposición sugerida depende de Stock; registrar pedidos/recepciones depende además de Compras.

## Aceptación

1. Disponible 3, objetivo 20 y pedido confirmado 5: sugerir 12; el borrador de otro pedido no reduce la sugerencia.
2. Recibir 2 de esas 5 deja 3 pendientes, aumenta stock en 2 y crea una única compra/deuda al reintentar.
3. Dos cajas venden mientras se prepara el pedido: revalidar cantidades al confirmar la selección, sin bloquear Caja.
4. Depósito con 40 unidades y local con 0: no ocultar el faltante del local; ofrecer traslado.
5. Costos del Excel son estimaciones identificadas; recibir usa costos confirmados y reglas actuales de lotes/cuentas.
