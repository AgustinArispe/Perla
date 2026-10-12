# Plan de mejora integral del frontend — Perla

Fecha: 2026-10-12. Estado: implementación entregada. El [registro de cambios y verificación](../../ui-ux-frontend-results-2026-10-12.md) documenta lo aplicado, los circuitos probados y los límites de la revisión.

**Objetivo:** mejorar la lectura y operación de todos los paneles, empezando por Resultados, con gráficos útiles, cifras conciliables y patrones consistentes.

**Arquitectura:** iteración sobre React/TypeScript y consultas existentes. Extraer componentes pequeños al validar dos usos reales; evitar una abstracción universal de tablas. Resultados es el piloto visual. Corregir contratos semánticos antes de nuevas participaciones.

**Stack:** React, TypeScript, React Query, CSS y SVG accesible; SQLite y reportes existentes. No se necesita inicialmente una nueva librería de gráficos.

**Especificación:** [Auditoría y diseño](../specs/2026-10-12-frontend-results-design.md).

**Restricciones globales:** preservar permisos, atajos, borradores, selección Excel, preferencias del sidebar, límites de módulos e informes históricos versionados. No modificar/resembrar `.data/five-month-local/pos.sqlite` ni divulgar claves. Pruebas con bases aisladas y puertos distintos del servidor demo 3087. No implementar sobre datos reales para preparar capturas.

## Orden y dependencias

1. Contrato de cifras y baseline.
2. Base visual acotada y Resultados completo: primera entrega revisable.
3. Productos, Stock, Reponer y Ubicaciones.
4. Caja y Compras.
5. Cuentas, históricos, promociones y turnos.
6. Inicio, ingreso, administración, diálogos y verificación integral.

No migrar todas las pantallas de una vez. Cada etapa debe cerrar su circuito funcional, revisión visual y regresiones relevantes. Las mejoras puramente cosméticas de login no retrasan Resultados.

## Tarea 1 — Baseline y definición de reportes

Archivos: `src/shared/reports.ts`, `src/worker/reports/queries.ts`, `src/worker/reports/month.ts`, `src/worker/reports/period.ts`, `docs/ui-ux-results-report.md`.

- [x] Capturar estado real a zoom 100%, inventariar rutas/roles/diálogos no visibles en las 19 capturas y registrar datos de prueba utilizados.
- [x] Documentar neto, ranking, margen, cobertura, pagos y comparación: fecha del movimiento, signo, denominador y tratamiento de devoluciones.
- [x] Añadir regresión para venta septiembre/devolución octubre y devolución posterior a un mes cerrado; comprobar desacuerdo actual antes de corregirlo.
- [x] Alinear ranking/rentabilidad/cobertura al período de movimientos para el resumen mensual; preservar costos históricos y separar devolución de anulación.
- [x] Tratar pagos negativos y ceros con actividad; documentar cuenta corriente y cobros posteriores fuera del alcance de pagos de ventas.
- [x] Añadir serie diaria anterior al contrato, con fechas reales y alcance explícito. Preservar diferencia entre comparación mensual y tramo anterior de igual duración.
- [x] Revisar impacto en exportaciones y reportes guardados. No reescribir snapshots existentes; versionar si cambia su definición.

Pruebas: ampliar `tests/integration/monthly-reconciliation.test.ts`, `tests/unit/report-periods.test.ts` y los casos de devoluciones existentes. Verificar ranking completo y rendimiento en `tests/integration/monthly-performance.test.ts`. Aceptación: totales diarios y productos concilian bajo el mismo alcance; cobertura no mezcla universos temporales.

## Tarea 2 — Base compartida mínima

Archivos: `src/renderer/components/`, `src/renderer/App.tsx`, `src/renderer/styles/tokens.css`, `src/renderer/styles/operational.css`, `src/renderer/styles/typography.css`, `DESIGN.md`.

- [x] Definir cabecera, pestañas, barra de filtros y acciones, números/estados y espaciado; probar con Resultados y Productos antes de extender.
- [x] Crear solo primitivas necesarias, por ejemplo `PageHeader.tsx` y `ListToolbar.tsx`; reutilizar `Icon`, `Dialog`, `ExportButton`, `SavedViews` y `EntityPicker`.
- [x] Establecer alturas/densidad por listado y operación; no reducir toda la tipografía para acomodar controles.
- [x] Separar en DESIGN.md las decisiones vigentes de notas históricas para evitar recuperar estilos obsoletos.

Aceptación: ambos pilotos tienen cabeceras y controles coherentes, teclado intacto y adaptación a ancho reducido. No cambiar permisos ni fuentes.

## Tarea 3 — Resultados: gráfico diario y estructura

Modificar: `src/renderer/features/dashboard/DashboardPage.tsx`, `PeriodComparison.tsx`, `AnimatedValue.tsx` cuando corresponda. Crear: `DailySalesChart.tsx`, `src/renderer/styles/results.css` e importación explícita en `src/renderer/main.tsx`.

- [x] Usar título Resultados, período claro, cuatro indicadores compactos y exportación agrupada.
- [x] Extraer gráfico diario con eje cero y negativos hacia abajo, escala legible, guías suaves y etiquetas adaptativas.
- [x] Incorporar comparación opcional después de Tarea 1; resolver meses de distinta longitud sin fechas falsas.
- [x] Conservar tabla alternativa, interacción por teclado, selección, anuncio accesible y movimiento reducido.
- [x] Agregar acceso al histórico del día preservando contexto de regreso; verificar si el filtro histórico incluye las devoluciones mostradas y explicitarlo cuando difiera.
- [x] Retirar reglas del gráfico sustituidas en `pulse.css`, `perla.css` y `operational.css`; no depender de overrides acumulados.

Aceptación: mes vacío, parcial, completo y con negativos se interpretan sin leer una nota correctiva; no hay barras fuera de escala ni días futuros.

## Tarea 4 — Resultados: dona, ranking, pagos y exportación

Modificar: `TopProducts.tsx`, `PaymentBreakdown.tsx`, `MonthlyReportPrint.tsx` y exportadores afectados por el contrato. Crear componente `ProductShareChart.tsx` y utilidades puras de agregación en el directorio dashboard si resultan necesarias.

- [x] Construir Top 5 + Otros desde el universo completo conciliado; orden estable, denominador visible y suma verificable.
- [x] Mostrar dona con leyenda accesible y ranking horizontal. Unidades y kilos permanecen separados; negativos cambian a representación con signo, cero a estado vacío.
- [x] Mostrar medios de pago con barras e importes, incluyendo reembolsos; no llamar «sin ventas» a un medio con actividad compensada.
- [x] Mantener margen/costos y desglose en segundo nivel; mostrar calidad/cobertura sin confundirlo con ganancia neta.
- [x] Alinear Excel/PDF con período, orden y definición vigentes, sin degradar identidad de marca ni selección de filas.
- [x] Añadir pruebas para seis o más productos, Otros dominante, empates, cero, negativos, mezcla unidades/kilos, pagos mixtos y ventas a cuenta.

Verificar `tests/unit/dashboard-comparison-export.test.ts` y `tests/web-e2e/dashboard-navigation.spec.ts`. Aceptación: gráficos, leyendas y exportaciones coinciden; se accede a valores sin mouse.

## Tarea 5 — Mercadería y logística

Archivos: `features/products/ProductList.tsx`, `ProductForm.tsx`, `features/stock/StockList.tsx`, `features/control/ReplenishmentPanel.tsx`, `features/locations/LocationsPage.tsx` y sus componentes de inventario/traslados. Rutas relativas a `src/renderer/`.

- [x] Productos: acción principal clara, mantenimiento agrupado, toolbar compacta y selección persistente entre búsquedas/páginas con contador y limpieza explícita.
- [x] Stock: acciones comprensibles por fila; cantidades/unidades y estados consistentes; distinguir «sin control» de cero.
- [x] Reponer: filtros juntos, aviso de calendario accionable, cantidades editadas preservadas, resumen de selección y siguiente paso disponible hacia pedidos/exportación.
- [x] Ubicaciones: pie fuera del área de filas, sin registros tapados; traslado contextual y ubicación visible.
- [x] Traslados: filtro Por recibir, acciones junto a estado y recorrido; total global solo si el contrato lo devuelve.
- [x] Revisar formularios de alta/edición de producto y búsquedas con teclado, sin perder carga rápida ni foco de lector.

Aceptación: seleccionar A, buscar B, seleccionar B, paginar y exportar conserva A+B exactamente. Pruebas relevantes: `excel-export.spec.ts`, `frontend-interactions.spec.ts`, `control-tools.spec.ts` y pruebas de aislamiento/traslados existentes.

## Tarea 6 — Venta y recepción de compras

Archivos: `features/checkout/Checkout.tsx`, `ProductSearch.tsx`, `PaymentDialog.tsx`, `WeightDialog.tsx`, `features/purchases/PurchaseWorkspace.tsx`, `PurchaseDraft.tsx`, `SupplierForm.tsx`.

- [x] Mantener entrada por lector dominante y prueba de conexión secundaria; mejorar feedback al agregar/repetir producto.
- [x] Total y acción final estables; vacío útil y carrito amplio. No introducir gráficos en el flujo de cobro.
- [x] Recepción: proveedor compacto, búsqueda/escaneo con funciones claras, borrador y resumen consistentes con Caja.
- [x] Revisar todos los diálogos: altura, scroll, foco inicial/restaurado, errores en campo, botones y atajos.

Aceptación: completar venta y compra por teclado, incluyendo peso, descuento y pago mixto; borradores sobreviven navegación según comportamiento existente. Pruebas: `scanner-circuit.spec.ts`, `store-day.spec.ts`, `purchases.spec.ts`, `customer-credit-circuit.spec.ts`.

## Tarea 7 — Gestión comercial e históricos

Archivos: `features/history/SalesList.tsx`, `features/purchases/PurchaseHistory.tsx`, `SupplierList.tsx`, `features/customers/CustomerPage.tsx`, `features/control/AgendaPanel.tsx`, `features/promotions/PromotionPage.tsx`, `features/register/ShiftHistory.tsx`.

- [x] Unificar históricos como listas/tablas compactas y alineadas; filtros y exportación en posición común.
- [x] Clientes/proveedores: cuenta como acceso relevante, dirección del saldo explícita y contacto discreto. Nuevos filtros requieren soporte del contrato; no limitar resultados a la página cargada.
- [x] Agenda: eliminar duplicación de tipo de cuenta, ordenar controles y mantener totales de todo el filtro. Conservar protección contra actualizaciones concurrentes al acordar fechas/cobrar.
- [x] Promociones: quitar contadores repetidos y explicar alcance/regla/vigencia en lenguaje de negocio.
- [x] Turnos: destacar diferencias y estado; datos secundarios en detalle, conservando acceso a inicial/esperado/contado.

Aceptación: ninguna mejora oculta deuda, diferencias o acciones por rol. Selección/exportación sigue el mismo criterio que Productos. Pruebas: circuitos de cuentas/control, promociones y exportación.

## Tarea 8 — Inicio, ingreso, navegación y pantallas no capturadas

Archivos: `features/control/ControlHome.tsx`, `features/auth/Login.tsx`, `src/renderer/App.tsx`, `components/SidebarGroup.tsx`; inspeccionar `features/settings`, `auth/UserList.tsx`, `audit`, `backups` y `help`.

- [x] Inicio: contexto para días sin actividad y prioridad de alertas basada en datos; conservar resumen y accesos útiles ya implementados.
- [x] Ingreso: foco, visibilidad de contraseña, carga y errores; conservar identidad y composición.
- [x] Evitar etiqueta Administración repetida si la tarea interna corresponde a Configuración; mantener colapso persistente y modo compacto por secciones.
- [x] Auditar en navegador ajustes, usuarios, auditoría, respaldos, ayuda y cuentas detalladas antes de definir cambios puntuales. Aplicar patrones comunes cuando mejoren la tarea, no por uniformidad superficial.

Aceptación: permisos, módulos desactivados, sidebar y rutas funcionan en ambos tamaños. Pruebas: `home-summary.spec.ts`, `sidebar-groups.spec.ts`, `modules.spec.ts`, `security-circuit.spec.ts` y respaldo solo en fixtures aislados.

## Tarea 9 — Verificación y cierre

- [ ] Registrar capturas antes/después por etapa a 1920×1080 y 1366×768; comprobar 1024, 768, 390 px y zoom 200%.
- [ ] Verificar teclado, foco, contraste medido, nombres accesibles, reduced-motion, datos extensos, negativos, errores y vacíos.
- [x] Confirmar que no hay scroll anidado accidental, pie sobre filas ni botones fuera del viewport.
- [x] Ejecutar checks después de cambios funcionales, usando bases temporales; no ejecutar suites contra la demo local.

Comandos de referencia, adaptando pruebas al lote modificado:

```powershell
npm run typecheck
npm run lint
node scripts/run-tests.mjs tests/unit/report-periods.test.ts tests/unit/dashboard-comparison-export.test.ts tests/integration/monthly-reconciliation.test.ts tests/integration/monthly-performance.test.ts
npm run build:web
npm run build:api
$env:BOCHA_WEB_TEST_PORT = '3487'
npx playwright test --config playwright.web.config.ts --project=dashboard
```

El runner web levanta escenarios en varios puertos consecutivos: comprobar previamente que 3487–3502 estén libres. Elegir proyectos adicionales según cada tarea. Al cierre ejecutar los checks globales requeridos por el repositorio y documentar cualquier fallo real, sin declarar éxito basándose solo en capturas.

Entregables: código por etapas, pruebas de semántica y circuitos, capturas revisadas y documentación vigente. Esta planificación no constituye implementación ni publicación en GitHub.
