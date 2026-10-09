# Perla Negra — Frontend Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar navegación, componentes y composición para que el sistema sea claro, profesional y agradable de operar.

**Architecture:** Migración incremental del frontend existente. Consolidar tokens, componentes compartidos y páginas de referencia antes de extender los patrones; retirar las reglas desplazadas en cada migración, sin sumar una quinta capa global de overrides.

**Tech Stack:** React, TypeScript, CSS existente, TanStack Query y Playwright. Reutilizar iconos y fuentes actuales.

**Spec:** `specs/033-frontend-consistency/spec.md`.

Estado: plan preparado; ninguna tarea de implementación ejecutada en este turno.

## Global Constraints

- Trabajar en la versión local de GestionProductos. No modificar MareaMac.
- El jefe mantiene todos los accesos de vendedor y supervisor.
- Preservar base de simulación, permisos, flags, contratos, escaneo, integridad de ventas y borradores.
- No agregar frameworks de UI o gráficos sin una necesidad demostrada.
- Conservar Excel con filtros múltiples y todas las coincidencias; no limitarlo a la página visible.
- Validar 390, 768, 1024, 1440 y 1920 px, y zoom 200%.
- No afirmar pruebas aprobadas sin ejecutarlas y registrar el resultado.
- Revisar cambios locales existentes antes de editar. No restaurar archivos, publicar ni crear commits indiscriminados.

## Skills por responsabilidad

- PULSE: contrato visual y continuidad con las referencias de Agus, adaptado a Perla Negra.
- Impeccable, enfoque operativo: auditoría de jerarquía, navegación, densidad, formularios y estados.
- Emil: comportamiento de componentes, foco, feedback y movimiento discreto.
- Taste: referencia secundaria contra soluciones genéricas. Su enfoque de landing pages no gobierna las tablas y flujos operativos.

## 1. Línea de base y contrato de componentes

Archivos: `DESIGN.md`, `src/renderer/main.tsx`, `src/renderer/styles/{tokens,pulse,perla,operational}.css`, `src/renderer/components/{Dialog,EntityPicker,ExportButton,SavedViews,Icon}.tsx`.

- [ ] Capturar las pantallas actuales con la misma base y rol; registrar viewport, zoom, filtros y scroll para comparaciones reproducibles.
- [ ] Inspeccionar estilos computados de botón, campo, pestaña, tabla, KPI y modal; registrar reglas duplicadas y responsable de cada variante antes de eliminarlas.
- [ ] Actualizar DESIGN.md con la dirección aprobada de la spec; centralizar colores semánticos, tipografía, espacios, radios, elevaciones y duración.
- [ ] Establecer responsabilidades: tokens define valores/base; pulse componentes reutilizables; perla únicamente firma de marca; operational composición operativa. Mover y retirar reglas por componente, preservando impresión.
- [ ] Crear o extraer en `src/renderer/components/` los componentes Button, PageHeader, FilterBar, SectionTabs, Pagination, EmptyState y MetricCard. Reutilizar Dialog y EntityPicker; no reemplazarlos a ciegas.
- [ ] Definir contratos: Button recibe variante/tamaño/estado; PageHeader separa título/contexto/herramientas/acción; Pagination recibe página/tamaño/total/callback y no aparece para cero resultados; MetricCard recibe valor ya formateado/etiqueta/contexto/tono.
- [ ] Verificar estados y contraste en escritorio/móvil, incluyendo importes largos, botones deshabilitados y campos en error. No escribir pruebas que solo repitan valores CSS.

Salida revisable: componentes y una pantalla de referencia que utilice todos sus estados. No migrar el resto con un contrato todavía contradictorio.

## 2. Inicio y Resultados como referencias completas

Archivos: `src/renderer/features/control/ControlHome.tsx`, `WeeklyPanel.tsx`; `src/renderer/features/dashboard/{DashboardPage,PeriodComparison,PaymentBreakdown,TopProducts,LowStock,LocationSummary,AnimatedValue}.tsx`.

- [ ] Reorganizar Inicio según prioridades y lista compacta de la spec. Verificar el significado de cada contador contra contratos/consultas; no combinar unidades incompatibles.
- [ ] Diseñar el caso de una muestra vacía con total positivo y el caso sin pendientes. Mostrar estado útil sin inventar filas.
- [ ] Reestructurar Resultados: cuatro indicadores cuando rentabilidad esté disponible, evolución, pagos/ranking y excepciones acotadas.
- [ ] Integrar comparación y detalle de rentabilidad sin duplicar importes. Separar la exploración de otros períodos de la consulta mensual.
- [ ] Corregir ancho/dominio del gráfico y distinguir días futuros, cero ventas y ausencia de datos. Conservar selección por teclado y tabla de importes.
- [ ] Hacer pagos compactos y limitar rankings/reposición a cinco elementos con acceso a todos. Mantener cifras exactas y filtros del destino.
- [ ] Unificar estilo semanal conservando versiones y recalcular; presentar metadatos bajo demanda.
- [ ] Organizar exportación del informe completo o sección con alcance visible y sin botones repetidos dominantes.

Pruebas: ampliar `tests/web-e2e/dashboard-navigation.spec.ts`, `tests/web-e2e/control-tools.spec.ts` y `tests/e2e/monthly-dashboard.spec.ts` para navegación con filtros, permisos y cifras conservadas. Capturas antes/después de ambas referencias a 390 y 1440 px, con datos, vacío y cobertura parcial de costos.

Salida revisable: Inicio y Resultados completos, no únicamente la primera pantalla visible.

## 3. Navegación y localización de herramientas

Archivos: `src/renderer/App.tsx`, `src/renderer/features/settings/SettingsPage.tsx`, componentes compartidos de la etapa 1.

- [ ] Aplicar el mapa de navegación de la spec sin renombrar identificadores internos usados por preferencias o vistas guardadas.
- [ ] Mapear destinos anteriores a la nueva pestaña/contenedor. Mantener enlaces de alertas hacia entidad, filtro y ubicación originales.
- [ ] Integrar Proveedores en Compras, controles de mercadería en Stock y diferencias de caja en Turnos; Resultados agrupa mensual/semanal.
- [ ] Plegar grupos y compactar cuenta; mantener Ayuda al pie. Menú móvil con cierre, Escape, foco y regreso al botón de apertura.
- [ ] Verificar permisos acumulativos con jefe, supervisor y vendedor, con funciones opcionales activadas y desactivadas. No implementar permisos nuevos a través de estilos.

Pruebas: `tests/web-e2e/modules.spec.ts`, `tests/web-e2e/control-tools.spec.ts`; comprobar apertura desde Inicio y notificaciones, preferencias de inicio existentes y ausencia de rutas huérfanas.

## 4. Circuitos de trabajo: stock, ubicaciones y compras

Archivos: `src/renderer/features/control/{OperationsPanel,ReplenishmentPanel,CommercialPanel}.tsx`, `src/renderer/features/stock/StockList.tsx`, `src/renderer/features/locations/LocationsPage.tsx`, `src/renderer/features/purchases/{PurchaseWorkspace,PurchaseDraft,PurchaseHistory,SupplierList,SupplierAccountDialog}.tsx`.

- [ ] Separar preparación, conteo y revisión; alinear campos/acciones y situar borradores fuera del formulario inicial.
- [ ] Unificar tabla, selección, filtros y pie de paginación. Verificar que el último renglón quede siempre visible, también al cambiar tamaño o zoom.
- [ ] Separar existencias y traslados. Mostrar stock de origen junto a la selección y confirmar cantidades con validación del servidor.
- [ ] Alinear proveedor, escaneo, productos y total de compra. Usar una sola tipografía monetaria; estados deshabilitados legibles.
- [ ] Auditar EntityPicker: selección con ratón/teclado, latencia, resultados antiguos, cierre y foco. Reproducir cualquier fallo antes de modificar lógica.
- [ ] Mantener borradores y recuperación. Exportar directorios e históricos desde sus barras, evitando acciones ajenas a la compra en edición.

Pruebas: `tests/web-e2e/purchases.spec.ts`, `tests/web-e2e/control-tools.spec.ts`, `tests/web-e2e/scanner-circuit.spec.ts`; agregar `tests/web-e2e/frontend-consistency.spec.ts` para pie visible y flujos de traslado. Probar scanner con Enter mientras otro campo y un diálogo tienen foco. Para mutaciones utilizar registros de prueba aislados; no alterar el histórico para acomodar la presentación.

## 5. Extensión a todos los módulos

Archivos: features de checkout, products, customers, promotions, history, register, auth, settings, audit, backups, notifications y help bajo `src/renderer/features/`; `ExportButton.tsx`, `SavedViews.tsx`, `Dialog.tsx`.

- [ ] Migrar encabezado/barra/listado/detalle de cada módulo a los componentes aprobados.
- [ ] Aplicar formularios progresivos con campos esenciales visibles y extras agrupados. Mostrar errores junto al campo sin ocultar decisiones necesarias.
- [ ] Estandarizar buscadores y exportación; los filtros activos se conservan al abrir/cerrar detalle y al descargar.
- [ ] Revisar carrito con cliente, venta a cuenta, medios de pago y cierre: acciones claras y ningún paso nuevo innecesario.
- [ ] Dividir Configuración por temas y mantener las dependencias de funciones. Aplicar las mismas reglas a acceso, cuenta, diálogos, ayuda y notificaciones.
- [ ] Aplicar movimiento discreto solamente a feedback, entrada de overlays y cambios explícitos. Reducir movimiento cuando se solicita y evitar retrasos en caja.

Pruebas: `tests/web-e2e/customer-credit-circuit.spec.ts`, `tests/web-e2e/excel-export.spec.ts`, `tests/web-e2e/promotions.spec.ts`, `tests/web-e2e/store-day.spec.ts`. Comprobar exportación completa con varios estados/categorías y búsqueda, navegación por teclado y no envío doble.

## 6. Cierre visual y funcional

- [ ] Ejecutar `npm run typecheck`, `npm run lint`, `npm run build:web` y los circuitos afectados con su configuración de entorno correspondiente.
- [ ] Para la demo local existente, ejecutar los tests compatibles con `npx playwright test --config playwright.local-ux.config.ts`; inspeccionar previamente sus proyectos y alcance para no mezclar fixtures de otros entornos.
- [ ] Revisar todas las pantallas a 390, 768, 1024, 1440 y 1920 px y a 200% de zoom. Cubrir también datos extremos, importes grandes, nombres largos, listas vacías, errores y carga.
- [ ] Verificar contraste/foco/etiquetas/teclado, más revisión visual manual. No considerar suficiente que compile.
- [ ] Comparar búsqueda, escaneo y cierre antes/después con la misma base. Investigar cualquier regresión repetible; no presentar un benchmark aislado como garantía general.
- [ ] Revisar impresión y Excel contra los mismos filtros/cifras mostrados, sin aplicar fondos oscuros masivos a tickets.
- [ ] Guardar evidencias y limitaciones en `docs/frontend-consistency-verification.md`; documentar solo verificaciones realmente ejecutadas.

## Criterio de terminado

Todos los módulos comparten ubicación y jerarquía de acciones. No hay contenido tapado por paginación ni scroll horizontal del documento. Las cifras tienen unidad y período claros; el tablero no repite KPIs y sus listas son acotadas. Excel conserva filtros y alcance. El jefe vende y administra sin cambiar de perfil. Los circuitos mantienen integridad y velocidad, y las capturas completas muestran una misma familia visual en escritorio y celular.

## Orden recomendado

1. Fundamentos compartidos.
2. Inicio y Resultados completos como patrón.
3. Navegación.
4. Operaciones y formularios.
5. Resto de módulos.
6. Verificación integral y retirada de estilos desplazados.

Las fases deben cerrar con una entrega revisable. No usar un cambio global de color como sustituto de la migración de composición e interacción.
