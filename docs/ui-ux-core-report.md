# UI core — implementación 7 de octubre de 2026

## Alcance y contratos

- `src/renderer/components/Dialog.tsx`: suma `size?: compact | regular | wide`; `wide` sigue compatible. Mantiene Escape condicionado por busy y devuelve foco al elemento que abrió el diálogo si sigue conectado. Las acciones conservan markup actual.
- `src/renderer/components/EntityPicker.tsx`: conserva API genérica/query/load/detail/onChange. Label permanente; Cambiar enfoca búsqueda; Tab fuera cierra; Escape solo cierra selector; opción activa acotada ante cambios de resultados, scroll de teclado y Enter bloqueado durante carga. Consulta/selección no cambia reglas de negocio.
- `src/renderer/features/checkout/ProductSearch.tsx`: filas nombre/código/precio, importe sin truncar; IDs por instancia, aria-autocomplete/busy, índice acotado, scroll activo, selección teclado/ratón y botón Reintentar manteniendo query. Carga, error y vacío diferenciados. API activa/KG/límite20 y scanner preservados.
- `src/renderer/components/ExportButton.tsx`: resumen de alcance + Descargar; Ajustar filtros abre todos los campos pertinentes sin cambiar filtros lista. Multiselección, taxonomía, roles, ubicaciones, fechas, cajas, estados, ranking y vistas conservados. Validación abre campos ocultos y enfoca error. Cambiar preset conserva resto de filtros (antes reemplazaba objeto).
- `src/renderer/components/SavedViews.tsx`: explica que vista múltiple abre Excel; loading status accesible. Contratos save/apply/delete preservados.
- `src/renderer/styles/operational.css`: compone selectores y tallas 560/680/920; cabecera/acciones alcanzables, precios tabulares, Excel neutral. Reglas dentro de capa operational existente; primario/foco usa primary. No se agregó otra hoja/capa.
- `tests/web-e2e/frontend-interactions.spec.ts`: tests de resumen/revelado/conservación y búsqueda con teclado/error/reintento/foco. Config web existente lo ejecuta en modules (no requiere habilitación extra).
- `tests/web-e2e/excel-export.spec.ts`: desplegar Ajustar filtros antes de editar/inspeccionar; Administración→Usuarios adapta ruta nueva. Mantiene expectativas de dinero/filas/archivo.

No se crearon Button/PageHeader/FilterBar/SectionTabs/Pagination/EmptyState/MetricCard sin un consumidor demostrado; el plan pide crearlos solo si útiles. Estas tareas permanecen abiertas para una migración representativa justificada por el coordinador.

## Verificación

- Antes de implementar: nuevo test Excel falló correctamente al esperar filtros inicialmente ocultos.
- Typecheck pasó tras edición core y de nuevo con cambios concurrentes.
- ESLint dirigido a cinco componentes y dos suites pasó.
- Build web pasó antes y después; dos intentos intermedios bloquearon por edición concurrente WeeklyPanel:139, ya corregida por su dueño.
- Primera pasada dirigida: 1 nuevo test Excel pasó; exportación real llegó hasta navegación Usuarios antigua (se adaptó); Caja fixture no esperó fin login (se corrigió). Segunda pasada pendiente al escribir este informe.

## Pendientes de alcance amplio

QA visual de zoom200/390/768/1024/1440/1920, latencia invertida, selector dentro de cada familia de modal, foco scanner y rendimiento medido, pruebas con personas y XLSX dos categorías pendientes de matriz integral. No se declara QA integral ni cierre de todo T02–T04 solo por compilación.

Sin cambios en demo, backend, fórmulas, permisos, App, dashboard ni otros features. Sin commits/reverts.

## Integración de navegación

A pedido del coordinador, operational comparte segmented-control entre control-surface y page-content, y añade account-menu con lectura/acciones de 44px y posición fuera de sidebar colapsada. En móvil pestañas permiten scroll dentro de su propia barra y cuenta tiene scroll si supera altura disponible.

La prueba de Caja confirma que su consumidor restaura foco al scanner al cerrar (comportamiento existente y esperado por scanner-circuit); el retorno genérico de Dialog queda condicionado por esa decisión legítima del consumidor.

## Resultado dirigido actualizado

La exportación real XLSX de Productos y Usuarios y el test de conservación/revelado pasaron. Caja pasó búsqueda, selección B por flecha+Enter, error, query preservada, Reintentar y Escape; última expectativa se adaptó al retorno correcto al scanner en lugar del botón opener. La ejecución final está en curso.

### Verificación final

`BOCHA_WEB_TEST_PORT=3287 npx playwright test frontend-interactions.spec.ts excel-export.spec.ts --config=playwright.web.config.ts --project=modules`: **3 passed (29.4s)**. Se usaron servidores/base desechables de test en 3287–3294; los puertos quedaron liberados. El XLSX conservó búsqueda, estados múltiples, filas e importe123,45; vista guardada y exportación Usuarios también comprobadas. Test Caja verifica exactamente segundo producto seleccionado y foco scanner al cerrar.

`npm run typecheck`: pasó en última ejecución. ESLint dirigido: pasó. Último build web pasó con estilos comunes de tabs/cuenta incluidos. Sigue pendiente QA visual integral, latencia invertida/múltiples categorías y suite completa de scanner (scanner no se modificó).
