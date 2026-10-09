# 029 — Productos sin movimiento y precios para revisar

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

Existe actualización masiva con vista previa y costos históricos; falta una lista que muestre qué merece revisión. updated_at del producto puede cambiar por editar el nombre, por lo que no representa necesariamente la última revisión de precio.

## Experiencia

- En Productos: vistas Sin movimiento y Precios para revisar, sin nuevos módulos principales. Filtros 30/60/90 días y categorías/marcas/ubicación.
- Sin movimiento muestra existencia, última venta y valor estimado al costo cuando se conoce; prioriza stock inmovilizado. Los artículos sin stock se pueden consultar aparte.
- Distinguir Nunca vendido de Sin ventas desde fecha y de Sin historial suficiente. Producto recién creado no queda señalado como abandonado.
- Precios para revisar agrupa Costo mayor al precio, Margen bajo, Costo actualizado, Precio sin revisar y Costo faltante. Umbrales de margen y antigüedad configurables por el jefe; valores iniciales sugeridos 20% y 60 días, no reglas universales de rentabilidad.
- Seleccionar artículos permite Actualizar precios o Preparar promoción, precargando la selección en los flujos existentes. Vista previa obligatoria antes de confirmar.
- Marcar precio revisado permite conservarlo sin alterarlo; registra autor/fecha y versión de costo/precio, de modo que un costo posterior reactive la revisión.

## Reglas

- Separar margen sobre venta de recargo sobre costo. El margen previsto usa precio y costo vigente, identifica origen/fecha del costo y aclara que no incluye gastos/impuestos/comisiones; nunca reemplaza margen histórico.
- Alertas sin costo muestran Costo faltante; no cero ni 100% de margen.
- Mantener última modificación efectiva de precio y última revisión como eventos propios. Para datos antiguos sin evento fiable: Fecha no disponible, no inventar historia.
- Solo OWNER/ADMIN acceden a recomendaciones comerciales, margen y actualización masiva. Gestión ordinaria de productos/stock mantiene permisos actuales del supervisor.
- Considerar anulaciones y devoluciones al medir movimiento; último despacho/traslado no cuenta como venta al cliente. Valorar existencias por ubicación sin sumar tránsito dos veces.

## Aceptación

1. Producto con 50 unidades, última venta hace 91 días y antigüedad de 5 meses aparece en 90 días; uno nuevo de ayer no.
2. Costo de $800 y precio $1.000 muestran margen previsto 20%, no 25%.
3. Editar nombre no reinicia antigüedad del precio. Revisar sin cambiar lo quita del pendiente; subir costo lo reactiva.
4. Selección de varias categorías respeta el mismo conjunto en pantalla y Excel.
5. Cambios concurrentes invalidan vista previa; las ventas históricas conservan precio/costo originales.
