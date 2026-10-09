# Perla Negra — Plan integral de UI y UX

> Para ejecutar: usar `executing-plans` o `subagent-driven-development`, con una entrega revisable por etapa. Este documento es planificación; ninguna casilla acredita una implementación.

**Goal:** que una dueña pueda operar y controlar su negocio con claridad, y que un operador habitual mantenga velocidad, con una interfaz consistente en PC y celular.

**Architecture:** migración incremental del frontend React. Consolidar componentes de interacción y composición, migrar tareas completas y retirar las reglas que quedan reemplazadas. Los permisos, datos, contratos monetarios y funciones opcionales conservan su autoridad actual.

**Tech Stack:** React, TypeScript, TanStack Query, CSS existente, Fastify/SQLite y Playwright/Vitest ya instalados. No requiere una nueva biblioteca de componentes o gráficos.

**Spec:** `specs/033-frontend-consistency/ui-ux-revision.md`.

Estado: propuesto, pendiente de implementar. Fecha: 7 de octubre de 2026. Sustituye como hoja de ejecución el plan inicial de consistencia; su copia permanece en el archivo de auditoría.

## Restricciones comunes

- Trabajar en `C:/Proyectos/GestionProductos`, sin modificar MareaMac.
- Preservar cambios locales ajenos, identidad Perla Negra, datos, seguridad, reglas de negocio y comprobantes históricos.
- Jefe incluye operación de Vendedor y Supervisor; no requiere cambiar perfil. Funciones del negocio y permisos siguen siendo independientes.
- Formularios progresivos sin pasos artificiales; conservar visible toda información que afecte la decisión.
- Excel conserva búsqueda, multiselección, orden, alcance y todas las coincidencias autorizadas.
- Espacio blanco deliberado; no rellenarlo con indicadores decorativos. Tablas densas donde sirven al trabajo, formularios tranquilos donde ayudan a decidir.
- No sumar una quinta hoja de overrides; migrar por responsabilidad entre tokens, componentes PULSE, marca Perla y composición operativa.
- Cada etapa incluye 390 y 1440 px como mínimo; la cobertura final agrega 768, 1024, 1920 y zoom 200%.
- No ejecutar pruebas de mutación contra la demo de cinco meses ni aplicar sus borradores de auditoría.
- Pruebas significativas sobre comportamiento, permisos, cifras y navegación; los valores CSS se verifican visualmente y por contraste, sin tests que solo repitan la implementación.

## Secuencia y dependencias

| Etapa | Entrega | Depende de | Impacto esperado |
|---|---|---|---|
| 0 | Línea de base y significado de datos | Registro actual | Evitar arreglar supuestos o mezclar períodos |
| 1 | Componentes consistentes y buscadores legibles | 0 | Mejorar muchos módulos a la vez |
| 2 | Navegación por tareas y conservación de contexto | 1 | Encontrar herramientas con menos exploración |
| 3 | Inicio y Resultados completos | 0–2 | Entender prioridades y negocio sin una página interminable |
| 4 | Caja, cobro, clientes y ventas | 1–2 | Cobrar rápido y con confianza |
| 5 | Productos, stock y ubicaciones | 1–2 | Controlar mercadería sin formularios intimidantes |
| 6 | Compras, cuentas, agenda y promociones | 1–2, 4–5 | Completar circuitos de administración con pocas decisiones por vez |
| 7 | Administración, ayuda y estados transversales | 1–2 | Completar el producto y sus casos menos frecuentes |
| 8 | Validación integral y cierre | Todas | Comprobar coherencia, exactitud, velocidad y facilidad |

El orden recomendado es el de la tabla. Etapas 4–7 pueden repartirse después de estabilizar componentes; evitar ediciones simultáneas en App, Dialog, EntityPicker, ExportButton y las hojas compartidas. Una persona integra los cambios comunes. No repartir por pantalla antes de acordar esos contratos.

## Etapa 0 — Confirmar lo que cambia y lo que se conserva

### T01. Registro reproducible y riesgos reales

Archivos de lectura: `output/auditoria-frontend/2026-10-07/{manifest.json,cobertura.md,README.md}`, `src/renderer/App.tsx`, `src/domain/permissions.ts`, `src/renderer/features/dashboard/{DashboardPage,PeriodComparison,LowStock}.tsx`, `src/shared/{reports,excel,features}.ts` y consultas de reportes/control relacionadas.

Crear: `docs/ui-ux-baseline.md`. Ampliar pruebas existentes solo cuando se reproduzca un defecto.

- [ ] Registrar por pantalla rol, funciones, ancho visible real, filtros, cantidad de filas, período y estado; diferenciar fullPage de viewport. Marcar capturas anómalas sin tratarlas como defectos confirmados.
- [ ] Reproducir búsqueda de Caja, selección con teclado, paginación de Ubicaciones y ancho de Backups a 984/1024 y 1440 px. Registrar pasos y resultado, no solo una impresión.
- [ ] Trazar qué cuentan Inicio, Reposición, Stock y campana: producto único, producto–ubicación, obligaciones o no leídos. Documentar denominador y alcance.
- [ ] Elegir un mes histórico con ventas y contrastar comparación visible contra exportación. Verificar qué fecha usan las métricas de stock dentro del resumen histórico. Si hay divergencia, escribir una prueba que la reproduzca antes de corregirla.
- [ ] Verificar alternativas por rol y función desactivada, conservación de históricos y enlaces desde avisos.
- [ ] Completar en una base de prueba la captura de importación CSV y los estados críticos que faltan; no inventar resultados para cerrar una lista de screenshots.

Salida: matriz de certeza (visual confirmado / código / interacción reproducida / pendiente) y contrato de fechas/unidades. No es necesario recapturar 185 imágenes para empezar; sí los componentes y estados que se usarán como referencia.

## Etapa 1 — Fundamentos y primera corrección útil

### T02. Contrato de composición y controles

Modificar: `DESIGN.md`, `src/renderer/styles/{tokens,pulse,perla,operational}.css`, `src/renderer/main.tsx` si cambia el orden responsable de carga.

Crear, solo donde los consumidores lo justifican: `src/renderer/components/{Button,PageHeader,FilterBar,SectionTabs,Pagination,EmptyState,MetricCard}.tsx`.

- [ ] Inventariar variantes de botón, campo, pestaña, fila, KPI y diálogo; asociar regla responsable antes de retirarla.
- [ ] Aplicar la paleta propuesta con contraste real, una tipografía operativa y numerales tabulares. Navegación navy y oro de firma; secundarias neutrales.
- [ ] Dar a Button variantes primary/secondary/quiet/danger; tamaños regular/compact; busy y disabled legibles. No usar animación para simular actividad.
- [ ] PageHeader separa título, contexto útil, herramientas y acción principal; en móvil cambia de fila sin reordenar la tarea.
- [ ] FilterBar presenta búsqueda y filtro frecuente; avanzados plegables con filtros activos visibles. Las pestañas navegan, no parecen confirmaciones.
- [ ] Pagination recibe página/tamaño/total y cambio; omite el control en vacío y no se superpone a las filas.
- [ ] MetricCard recibe un valor ya formateado, etiqueta, contexto y tono; no calcula resultados comerciales.
- [ ] Migrar una lista representativa (Productos) y un formulario corto; comparar todas las variantes antes de extenderlas.

Contratos propuestos para evitar que cada módulo invente un patrón:

```ts
type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
type ActionSize = 'regular' | 'compact';
// Button extiende ButtonHTMLAttributes<HTMLButtonElement>.
type ButtonPresentation = { variant?: ButtonVariant; size?: ActionSize; busy?: boolean };
type PaginationState = {
  page: number; pageSize: number; total: number;
  onPageChange: (page: number) => void;
};
// PageHeader y MetricCard son presentación: reciben contenido, no consultan la API.
```

Aceptación: misma tarea tiene misma jerarquía; una lista con cero/una/muchas filas funciona; importes grandes no desbordan; formulario corto deja aire sin estirar los campos. No se requiere llenar el viewport.

### T03. Buscadores y ventanas

Modificar: `components/{EntityPicker,Dialog}.tsx`, `features/checkout/{ProductSearch,scanner-focus}.ts*`, estilos asociados y consumidores que necesiten adoptar el contrato. Crear `tests/web-e2e/frontend-interactions.spec.ts` y habilitar su ejecución en la configuración apropiada.

- [ ] Corregir primero la presentación de `checkout-search-results`/`search-product`: filas completas, código secundario, precio alineado y estado seleccionado legible.
- [ ] Conservar las consultas de cada selector; compartir presentación y comportamiento cuando no imponga reglas erróneas entre productos, clientes y proveedores.
- [ ] Verificar flechas, Enter, hover, Escape y Tab con resultados cambiantes. El foco y la opción activa no deben depender de la posición accidental del mouse.
- [ ] Cubrir respuestas fuera de orden, consulta vacía, error y búsqueda sin resultados. Diferenciar carga y vacío. Enter durante carga no agrega una entidad antigua.
- [ ] Dialog adopta tallas por tarea y estructura de cabecera/contenido/acciones; asegurar que un selector abierto no quede recortado por su scroll.
- [ ] Verificar Escape por capas, foco inicial y retorno al origen; cambios sin guardar se conservan o se confirman según el flujo vigente.
- [ ] Adaptar pantalla pequeña y teclado virtual: cierre y confirmar alcanzables, sin botón pegado sobre la última fila.

Casos de aceptación: buscar arroz y agregar exactamente la opción resaltada; pasar de A a AB con latencia invertida; abrir cliente desde cobro y volver al mismo formulario; escanear mientras otro input tiene foco no agrega un producto. Error visible con Reintentar y sin borrar el texto.

### T04. Exportación fácil y coherente

Modificar: `components/{ExportButton,SavedViews}.tsx` y consumidores; `src/shared/excel.ts`/`src/server/excel.ts` solo si una discrepancia de alcance lo exige. Ampliar `tests/web-e2e/excel-export.spec.ts` y `tests/integration/excel-exports.test.ts` para riesgos confirmados.

- [ ] Botón Excel visible en barras de listados; no hacerlo protagonista ni esconderlo solo en un menú de tres puntos.
- [ ] Diálogo abre con resumen de filtros actuales, alcance y Descargar. Ajustar filtros despliega únicamente los pertinentes al dataset; mantener selección múltiple.
- [ ] Mantener vistas guardadas y filtros de archivo separados de los de la lista hasta una acción explícita.
- [ ] Resultados agrupa formato y sección; enlazar la misma definición de período que renderiza cada informe.
- [ ] Validar descarga con dos categorías, dos estados, búsqueda y orden; contar coincidencias de todas las páginas y revisar hojas/filtros del archivo.

Salida de etapa 1: componentes consistentes, buscadores legibles y una lista/formulario/ventana de referencia operativos. No migrar todo con estilos aún contradictorios.

## Etapa 2 — Menú por tareas y contexto

### T05. Agrupar navegación sin perder capacidades

Modificar: `src/renderer/App.tsx`, `features/settings/SettingsPage.tsx` y contenedores de Stock/Compras/Productos/Resultados. Crear `src/renderer/navigation.ts` para el mapa explícito de equivalencias, si evita mantenerlo dentro de App.

- [ ] Implementar el mapa de destinos de la spec: Ventas, Productos, Stock, Compras, Ubicaciones, Clientes, Cobros y pagos, Promociones, Turnos, Resultados y Administración, además de Inicio/Caja/Ayuda.
- [ ] Traducir cada destino anterior a su contenedor/pestaña. Conservar IDs de preferencias y vistas mediante adaptación, no borrarlos ni renombrarlos en la base.
- [ ] Mostrar Administración si existe al menos un área autorizada; no perder Actividad para Supervisor. Validar permisos de cada área con el backend.
- [ ] Llevar contraseña/salida/preferencia al menú de cuenta. Ayuda fija abajo; Caja estable y fácil de encontrar.
- [ ] Implementar colapso y menú móvil con foco, Escape y retorno. Evitar renderizar todo el árbol de subpestañas en la sidebar.

### T06. Volver al punto de trabajo

Modificar: App y callbacks de `ControlHome`, `NotificationBell`, `ReplenishmentPanel`, `LocationsPage`, `PurchaseWorkspace` y `DashboardPage`.

- [ ] Preservar entidad, pestaña, período, ubicación, filtros y borrador al navegar desde una prioridad o notificación.
- [ ] Volver recupera la lista y su filtro; no obliga a reconstruir la búsqueda.
- [ ] Reponer lleva necesidades a un pedido; pedido pasa a Compras/Pedidos. Mantener un dueño único del expediente, con acceso contextual desde Stock.
- [ ] Comprobar función desactivada con históricos/compromisos existentes: conservar los caminos autorizados vigentes y dar salida clara a enlaces que ya no aplican.

Pruebas: `tests/web-e2e/{modules,control-tools,notifications}.spec.ts`; ampliar `tests/unit/permissions.test.ts` solo si se modifica la adaptación de permisos. Casos por Jefe/Supervisor/Vendedor y funciones activas/pausadas. Resultado: Jefe vende y administra sin cambiar de rol; Supervisor no ve Resultados por entrar en un nuevo contenedor.

## Etapa 3 — Inicio y Resultados que se entienden de un vistazo

### T07. Inicio y avisos orientados a acciones

Modificar: `features/control/ControlHome.tsx`, `features/notifications/NotificationBell.tsx`; contratos/consultas de control solo si falta el dato necesario ya definido en T01.

- [ ] Encabezado compacto, Vender y continuidad del trabajo; agrupar pendientes por tarea con 3–5 ejemplos como máximo, sin tarjetas forzadas a igual altura.
- [ ] Separar vencido, próximo e informativo usando reglas comprobadas. No elevar precio desactualizado a urgencia sin política comercial explícita.
- [ ] Incluir fecha, caja, responsable y monto en diferencias. Separar cobrar de pagar y aclarar unidad/alcance de cada contador.
- [ ] Campana agrupa tipos y distingue no leído de resuelto. Abrir un aviso conserva contexto y muestra todos los registros del grupo.
- [ ] Estado sin pendientes breve, sin tabla/paginación vacía. Total positivo sin muestra debe ofrecer acceso y explicar alcance, no inventar registros.

### T08. Resumen mensual y semanal completos

Modificar: `features/dashboard/{DashboardPage,PeriodComparison,PaymentBreakdown,TopProducts,LowStock,LocationSummary,AnimatedValue,MonthlyReportPrint}.tsx` y `features/control/WeeklyPanel.tsx`.

- [ ] Cabecera única con mes/fechas y Exportar. Métricas: ventas netas con comparación, cantidad, ticket y margen conocido habilitado.
- [ ] Integrar comparación de mes en la métrica; Exploración de períodos abre una vista explícita con sus propias fechas. Su exportación conserva exactamente ese intervalo.
- [ ] Rentabilidad presenta detalle bajo demanda, manteniendo cobertura parcial visible y distinción con ganancia neta. No volver a introducir venta cubierta con 100% si no aporta.
- [ ] Gráfico usa ancho útil y dominio temporal explícito, alternativa tabular y teclado. Distinguir futuro, cero y falta de datos; exactitud antes que animación.
- [ ] Pagos en filas compactas con importe y participación; detalle de operaciones a demanda, con pagos mixtos contemplados. Cinco productos por criterio, sin sumar kg y unidades.
- [ ] Pasar la reposición extensa y depósitos a sus módulos. Si queda enlace de inventario, rotularlo actual y con fecha. Eliminar la repetición de tarjeta; ubicar descuentos/anulaciones/devoluciones en su desglose.
- [ ] Semanal comparte composición pero sigue siendo un informe guardado: versión/generación en detalle; recalcular no domina ni sobrescribe silenciosamente.
- [ ] Animar solo cambio explícito y feedback; no introducir espera ni rerender completo por cada cuadro.
- [ ] Revisar PDF y Excel de mes actual, anterior, vacío y costo parcial contra cifras visibles.

Pruebas: `tests/web-e2e/dashboard-navigation.spec.ts`, `tests/web-e2e/control-tools.spec.ts`, `tests/e2e/monthly-dashboard.spec.ts`, `tests/integration/monthly-reconciliation.test.ts`. No actualizar expectativas de dinero para que coincidan con un rediseño: investigar cualquier diferencia.

Salida: Inicio y Resultados completos, incluidos detalles y exportaciones. Capturas de la parte inferior también; no aceptar un primer viewport bonito con contenido secundario desordenado.

## Etapa 4 — Venta, cobro y atención al cliente

### T09. Caja y cobro cotidiano

Modificar: `features/checkout/{Checkout,PaymentDialog,DiscountDialog,WeightDialog,ProductSearch}.tsx` y `features/register/RegisterGate.tsx`.

- [ ] Mantener scanner, carrito y total juntos; usar misma escala monetaria. Resumen visible en escritorio y compacto en móvil sin tapar líneas ni teclado.
- [ ] Cliente elegido aparece en una línea; sin cliente mostrar Agregar cliente como acción secundaria. Para A cuenta se pide cliente sin salir del cobro, y se muestra crédito/saldo permitido.
- [ ] Cobro habitual muestra total, medio, recibido/vuelto y Confirmar. Pago dividido abre detalle solo al pedirlo; remanente siempre visible.
- [ ] Peso permite cantidad o importe según reglas existentes; mostrar equivalencia y total antes de agregar. Descuento manual no oculta promoción automática aplicada.
- [ ] Al fallar conexión/confirmación conservar carrito, cliente y medios. Prevenir envío doble y no iniciar una nueva venta hasta tener confirmación según el protocolo vigente.
- [ ] Diferenciar visualmente cancelar carrito de anular una venta ya registrada. Recuperación del borrador accesible sin advertencias permanentes.

### T10. Ventas, comprobantes y turnos

Modificar: `features/history/{SalesList,SaleDetail,ReturnDialog}.tsx`, `features/receipts/{ReceiptQueue,ReceiptPrint}.tsx`, `features/register/ShiftHistory.tsx`.

- [ ] Historial con filtros compartidos y detalle que distingue venta, pagos, devoluciones y comprobantes.
- [ ] Confirmación de devolución/anulación expone importe, productos y efecto en stock conforme al servidor; sin nuevas confirmaciones redundantes.
- [ ] Cola de comprobantes accesible desde Ventas; conservar reintento/estado de impresión. Documento interno no se renombra factura fiscal.
- [ ] Turnos presenta contado/esperado/diferencia y estados pendientes sin simular ceros. Revisión de diferencia incluye fecha y responsable.

Pruebas: `tests/web-e2e/{scanner-circuit,customer-credit-circuit,store-day,qa-edge-circuits}.spec.ts`. Recorridos: dos productos con scanner, uno por peso, promo, efectivo con vuelto, fiado y cobro posterior; fallos/duplicación en fixtures independientes. Comparar tiempos contra línea de base sin ocultar cambios mediante animación.

## Etapa 5 — Catálogo, stock y depósitos

### T11. Producto y precio

Modificar: `features/products/{ProductList,ProductForm,TaxonomyManager,ImportPreview,PriceBulkDialog}.tsx`, `features/control/CommercialPanel.tsx`.

- [ ] Conservar alta breve; campos de unidad/peso revelan solo opciones pertinentes. Código escaneado se conserva; generación interna mantiene sus reglas.
- [ ] Categoría/marca seleccionables sin abrir una administración extensa; alta contextual vuelve al formulario sin perder valores.
- [ ] Revisión agrupa motivo, costo conocido y precio; método técnico y recargo van al detalle. No reemplazar costo desconocido por cero.
- [ ] Importación muestra resumen válido/error, filas afectadas y confirmación clara; corrección conserva archivo/selección cuando sea posible. No agregar campos obligatorios de relleno.
- [ ] Precios masivos mantienen vista previa antes/después y alcance, sin aplicar al cerrar el diálogo.

### T12. Stock, reponer y contar

Modificar: `features/stock/{StockList,MovementForm,MovementHistory,LotManager}.tsx`, `features/control/{OperationsPanel,ReplenishmentPanel}.tsx`.

- [ ] Tabla de existencias con estado/ubicación inequívocos; movimiento, conteo, lotes e historial comparten composición de detalle.
- [ ] Iniciar conteo alineado con ubicación/categoría; borradores aparte. Conteo muestra registrado/contado/diferencia sin columnas decorativas ni cantidades lejos del producto.
- [ ] Revisar ajuste con signo y unidad antes de aplicar. No aplicar borradores usados para screenshots.
- [ ] Reponer prioriza disponible/sugerido/selección; en camino y cálculo se muestran cuando afectan la decisión o bajo demanda. Calendario desconocido se identifica.
- [ ] Vencimientos distingue próximo, vencido y bloqueado; no crear acciones preventivas de stock sin confirmación del negocio.

### T13. Ubicaciones y traslados

Modificar: `features/locations/LocationsPage.tsx`; extraer componentes `LocationInventory.tsx` y `TransferWorkspace.tsx` en esa misma carpeta si la división permite separar las dos tareas sin duplicar consultas.

- [ ] Selector de ubicación y pestañas Existencias/Traslados; paginación fuera de filas y un scroll de trabajo claro.
- [ ] Origen/destino, producto, disponible y cantidad juntos; al cambiar origen, invalidar/reconsultar disponibilidad antes de confirmar.
- [ ] Varias líneas con resumen visible; notas opcionales plegadas. Mantener validación servidor y estados en tránsito/recibido/cancelado.
- [ ] Mostrar entradas/salidas/pendientes propios de un depósito; no facturación de una empresa ficticia.

Pruebas: `tests/web-e2e/{control-tools,qa-edge-circuits}.spec.ts`, `tests/integration/{catalog-identification,catalog-import,control-operations,control-replenishment,locations-transfers,location-web-isolation}.test.ts` según cambios. Agregar a `frontend-interactions.spec.ts` cambio de origen con solicitud en vuelo, campos de cantidad y pie visible. Datos: 0/1/4000 productos, nombres largos, unidades y kg, stock desconocido/negativo, lotes vencidos.

## Etapa 6 — Compras, cuentas y promociones

### T14. Recibir y pagar al proveedor

Modificar: `features/purchases/{PurchaseWorkspace,PurchaseDraft,PurchaseHistory,PurchaseDetail,SupplierList,SupplierForm,SupplierAccountDialog}.tsx`.

- [ ] Proveedor, scanner/búsqueda, líneas, costo y total en un espacio continuo. Nuevo proveedor regresa a la compra conservando las líneas.
- [ ] Directorio/historial usan Excel y filtros comunes; exportar no domina una recepción vacía.
- [ ] Cuenta de proveedor muestra saldo y obligaciones; abrir pago convierte el formulario en la tarea activa, sin dos CTAs sólidos «Registrar/Confirmar» compitiendo.
- [ ] Importe, fecha y medio primero; distribución resumida y editada bajo demanda. No cambiar reglas de imputación o crédito a favor para simplificar la pantalla.

### T15. Cliente, cobros y pagos

Modificar: `features/customers/CustomerPage.tsx`, `features/control/AgendaPanel.tsx` y conexión con `checkout/PaymentDialog.tsx`.

- [ ] Directorio breve y cuenta a demanda; cliente seleccionado permanece en carrito/cobro.
- [ ] Agenda separa Cobrar/Pagar; agrupar por contraparte y vencimiento solo conservando identidad y condiciones de cada obligación. Si requiere nuevo agregado de datos, definirlo y probarlo antes del layout.
- [ ] Total resumido, próxima fecha y detalle de obligaciones; acciones de fila neutrales. No esconder importes mínimos ni compensar automáticamente saldos.
- [ ] Registrar cobro/pago confirma el importe elegido, actualiza saldo y vuelve al contexto conservado.

### T16. Crear una promoción comprensible

Modificar: `features/promotions/{PromotionPage,PromotionForm}.tsx`.

- [ ] Tipo como selector compacto; alcance y beneficio visibles antes de programación. Nombre sugerido editable, sin inventar una descripción que no corresponda a la regla.
- [ ] Mostrar solo campos necesarios para porcentaje, llevá/pagá, cantidad o combo; preservar compatibilidad con reglas actuales.
- [ ] Programación opcional con fechas efectivas y resumen cuando está configurada; prioridad/condiciones con explicación contextual.
- [ ] Resumen legible antes de guardar: productos/alcance, beneficio y vigencia. Si no existe cálculo de ejemplo fiable, mostrar la regla, no un ahorro fabricado.
- [ ] Guardar y verificar aplicación automática en carrito; no confundir promoción programada con vigente.

Pruebas: `tests/web-e2e/{purchases,customer-credit-circuit,promotions,control-tools}.spec.ts`, integraciones de supplier-accounts/customer-accounts/promotions si se tocan contratos. Casos con pago parcial, sobrepago permitido o rechazado según reglas, múltiples obligaciones y promo por peso/cantidad según soporte existente.

## Etapa 7 — Administración y ayuda que completan el producto

### T17. Configurar y administrar accesos

Modificar: `features/settings/{SettingsPage,FeaturesPanel}.tsx`, `features/auth/{Login,UserList,ChangePassword}.tsx`.

- [ ] Mantener configuración por tema y anchos de formulario; agrupar funciones por venta, mercadería, clientes y análisis.
- [ ] Switch claramente interactivo con estado textual. Al cambiar función, resumen exacto de dependencias y pendientes a conservar; no mostrar advertencias genéricas en cada fila.
- [ ] Usuarios distingue activo/inactivo de bloqueo de acceso. Desbloquear se ofrece con dato confirmado o dentro del detalle, sin asumir que Activo significa desbloqueado.
- [ ] Roles descritos brevemente, jefe con todos los flujos, sin exponer secretos ni cambiar políticas de contraseña/login por estética.

### T18. Actividad, copias, ayuda y estados

Modificar: `features/audit/AuditPage.tsx`, `features/control/StructuredActivityPanel.tsx`, `features/backups/BackupsPage.tsx`, `features/help/HelpPage.tsx`, errores/estados de componentes compartidos.

- [ ] Traducir operaciones conocidas a verbos comerciales y entidad legible; IDs técnicos en detalle. Para operación desconocida, fallback claro y acceso técnico conservado.
- [ ] Copias muestra estado/última copia/lista; restauración mantiene explicación concreta de reemplazo de datos y sesiones. Reproducir el ancho anómalo antes de corregirlo.
- [ ] Ayuda por tarea, índice adaptable y sinónimos explícitos scanner/escáner/lector/pistola, fiado/fiar/a cuenta. Resultados indican artículo y permiten abrir el apartado pertinente.
- [ ] Revisar vacíos, carga, error, conexión perdida, guardar y permisos en todas las familias. Cada error conserva trabajo y ofrece recuperación real.
- [ ] Revisar impresión de tickets/reportes con fondo apropiado, cortes de página y datos completos.

Pruebas: `tests/web-e2e/{security-circuit,backup-recovery,modules,notifications}.spec.ts` y nuevos casos de ayuda en `frontend-interactions.spec.ts`. La restauración se prueba únicamente con una base desechable del servidor de tests.

## Etapa 8 — Cierre visual, funcional y de facilidad

### T19. Una matriz de QA por circuitos

Crear: `docs/ui-ux-verification.md`; guardar evidencia nueva en una carpeta distinta del registro inicial, con fecha/etapa/rol/viewport. Ampliar `tests/web-e2e/frontend-consistency.spec.ts` para geometría/foco/navegación relevantes.

- [ ] Cubrir las 23 áreas originales y sus equivalencias nuevas, incluidos diálogos y parte inferior de páginas.
- [ ] Verificar 390/768/1024/1440/1920 y zoom 200%; teclado virtual, nombres largos, cifras grandes, cero resultados, estados fallidos y roles. Scroll horizontal solo dentro de una tabla que lo necesite, nunca del documento.
- [ ] Medir contraste 4,5:1 texto normal y 3:1 texto grande/controles relevantes; foco visible, labels y semántica. Color no es la única señal.
- [ ] Ejecutar una venta completa, un fiado/cobro, compra/pago, traslado/recepción, conteo/revisión, promo automática e informe/Excel con filtros múltiples en datos de prueba aislados.
- [ ] Comparar cifras y alcance con servidor y archivos; preservar centavos, unidades y tiempos. Validar idempotencia y recuperación ya existentes.
- [ ] Comparar escaneo/búsqueda/cobro antes y después con la misma máquina/base, varias repeticiones y latencia registrada. Investigar una regresión repetible; no declarar velocidad por sensación.
- [ ] Realizar prueba con personas si están disponibles: vender, fiar, reponer, cobrar saldo y consultar/exportar un mes anterior. Registrar dudas, retrocesos, asistencia y tiempo. Dejar explícita su ausencia si no se realiza.
- [ ] Revisar una pasada visual por lote, corregir hallazgos y confirmar. Registrar defectos restantes con prioridad; no declarar producto cerrado con pérdida de dinero, permisos, datos o flujos frecuentes.

Comandos previstos, a ejecutar cuando exista implementación (no son pruebas realizadas en este turno):

```powershell
npm run typecheck
npm run lint
npm run build:web
npm test
# Verificar antes que 3287–3294 estén libres. Los tests crean sus propias bases.
$env:BOCHA_WEB_TEST_PORT = '3287'
npm run test:web
Remove-Item Env:BOCHA_WEB_TEST_PORT
```

Para una comprobación dirigida, usar el proyecto de `playwright.web.config.ts` que posee el circuito. `playwright.local-ux.config.ts` inicia un servidor de pruebas en **3197**, no utiliza la demo de 3087 y solo selecciona cuatro suites; no equivale a la cobertura integral. Si se agregan archivos de test, verificar que los `testMatch/testIgnore` los ejecuten una sola vez en el entorno correcto.

Detector Impeccable: ejecutar una vez sobre los targets UI cambiados después de implementar, no durante esta planificación. Los hallazgos visuales se revisan con criterio de producto; no reemplaza pruebas de accesibilidad o flujos.

### T20. Consolidación y entrega

- [ ] Retirar estilos desplazados comprobando cada consumidor; no eliminar por nombre o tamaño de archivo solamente.
- [ ] Actualizar DESIGN.md, Ayuda y mapa de navegación con el resultado implementado.
- [ ] Registrar tareas ejecutadas y pendientes, capturas comparables y resultados exactos de pruebas.
- [ ] Entregar resumen de cambios y limitaciones. Mantener rollback de cada etapa mediante diffs/commits acotados cuando se trabaje con commits; nunca incluir cambios ajenos indiscriminadamente.

## Criterio de terminado

El usuario encuentra la próxima acción sin leer una pared de información; puede abrir detalles sin perder su trabajo. Las pantallas forman una familia, conservan espacio cuando sirve y muestran datos suficientes donde se comparan artículos. Caja mantiene velocidad y seguridad; cifras, archivos y permisos coinciden. Todas las áreas y ventanas relevantes funcionan con teclado y en celular, y los casos pendientes se informan con evidencia.

No se considera terminado por cambiar colores, reducir el número de tarjetas, hacer que compile o esconder información sin resolver dónde se consulta.
