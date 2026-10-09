# Auditoría visual · Perla Negra

Fecha: 7 de octubre de 2026. Versión local: http://localhost:3087/.

## Abrir el material

- [Galería de capturas](index.html): abrila en un navegador. Funciona sin internet ni servidor; permite buscar, filtrar y abrir cada imagen a tamaño completo.
- [Cobertura y pendientes](cobertura.md).
- [Propuesta de diseño archivada](plan/propuesta-diseno.md).
- [Plan de implementación por etapas archivado](plan/implementacion-por-etapas.md).
- [Inventario de archivos](manifest.json): dimensiones, tamaño, huella SHA-256 y contexto de cada captura.

## Material guardado

- **73 pantallas y variantes**: ingreso, los 23 módulos, pestañas, búsquedas, detalles, ayuda y notificaciones.
- **102 ventanas y variantes**: altas, edición, selectores, cobro, fiado, descuentos, peso, devoluciones, cierres, reportes y exportaciones.
- **10 referencias originales de Agus**.
- Carpeta `dom/`: contexto textual de las nuevas capturas para recuperar campos, botones y estados en el análisis.

Total: **185 imágenes**. Las nuevas capturas corresponden al navegador con área visible de 984 × 712 y escala de dispositivo 1; las páginas largas se guardaron completas.

## Estado de la propuesta

Actualización posterior: ya está preparado el [análisis integral y plan ampliado](analisis/README.md), con nueve etapas y veinte tareas. Las copias enlazadas arriba conservan la propuesta inicial; para implementar, usar la revisión indicada en ese nuevo índice.

**Pendiente.** Se archivó la propuesta existente y su plan de seis etapas sin ejecutar el rediseño.
Este registro amplía la evidencia para revisar el alcance antes de cambiar el frontend.
Las copias conservan el contenido de los originales en `specs/033-frontend-consistency/spec.md`
y `docs/superpowers/plans/2026-10-07-frontend-consistency.md`.

## Alcance y efectos de la exploración

Se usó la base local de demostración de cinco meses y el perfil jefe. No se confirmaron ventas nuevas,
compras, pagos, traslados, ajustes de stock, cambios de usuarios, restauraciones ni cambios de configuración.

Algunos recorridos crean registros de trabajo al abrirlos:

- **Conteo de Congelados / Salón de ventas:** quedó un borrador recuperable de 166 artículos. Se usó una diferencia ficticia para registrar la revisión; al terminar se dejó Hamburguesas x4 en **105 unidades, diferencia 0**, guardada solamente en el borrador. No se aplicó al stock. Las capturas anteriores conservan el ejemplo de diferencia, no el estado final.
- **Pedido n.º 1:** quedó un borrador de 11 unidades de Aceite de girasol / Buenos Sabores, sin confirmar. Es material de esta exploración, no una compra real.
- **Comprobante de la venta n.º 13813:** abrir la vista de impresión agregó un registro a la cola. No se imprimió ni se modificó la venta.
- La selección de Ana Torres se usó para mostrar el fiado y se quitó antes de salir del cobro. Se conservó el carrito existente sin confirmar ni cancelar.

## Próximo análisis pendiente

- [ ] Revisar el inventario y sumar la vista previa de importación y los estados que faltan.
- [ ] Comparar con las referencias PULSE y los criterios de Agus; mantener la identidad Perla Negra.
- [ ] Definir un contrato común de títulos, acciones, filtros, botones, tablas, tarjetas, paginación y ventanas.
- [ ] Corregir la densidad y prioridades de Inicio, controles y resúmenes; evitar cifras repetidas y paneles desproporcionados.
- [ ] Revisar buscadores, selección por teclado, foco, escáner y disponibilidad de stock durante los traslados.
- [ ] Ordenar navegación, configuración, clientes, proveedores, depósitos y flujos de caja; conservar permisos acumulativos del jefe.
- [ ] Revisar contraste y función de los colores, estados deshabilitados, formularios extensos y secciones inferiores de ventanas.
- [ ] Mantener Excel cerca de la información que exporta, con filtros múltiples y todas las coincidencias.
- [ ] Validar móviles, tabletas, pantallas amplias, zoom y tamaños táctiles en una pasada específica.
- [ ] Ampliar la propuesta y el plan por etapas con el análisis del material faltante antes de implementar.

Este registro es evidencia visual; no reemplaza pruebas funcionales, de seguridad o de accesibilidad.
