# Mercadería — implementación y revisión

7 de octubre de 2026. Trabajo del subagente de mercadería integrado y completado por el coordinador en la versión local.

- Producto: alta contextual de categoría/marca mediante diálogo separado, con nombre, precio y resto del formulario conservados. Las opciones avanzadas siguen siendo optativas.
- Existencias: conteo muestra cantidad actual y diferencia firmada; mantiene revisión, clave de operación, recuperación de pendiente y validación del servidor. No cambia el cálculo del inventario.
- Reposición: disponibilidad, sugerencia y cantidad a pedir se distinguen; parámetros de la fórmula quedan bajo opciones avanzadas. Se preserva la entrada a Pedidos desde Compras.
- Ubicaciones: pestañas Existencias/Traslados, página recordada por ubicación y consulta del stock del origen. Una consulta todavía cargando no habilita el envío con un dato anterior; error permite reintentar.
- Integración: componentes embebidos evitan navegación y títulos duplicados; encabezados Stock/Turnos se conservan en el contenedor.

Revisión manual en la demo: selección de artículo para traslado muestra disponibilidad (43 unidades en el caso revisado); no se confirmó ni registró un traslado en la base de demostración. Capturas en `output/ui-ux-implementation/2026-10-07`.

Pruebas y límites consolidados en `ui-ux-verification.md`. No se atribuyen al turno todos los cambios previos del repositorio.
