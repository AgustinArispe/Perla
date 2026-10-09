# Revisión de integración UI033

## Cierre de los dos hallazgos — coordinador

Las dos observaciones de esta revisión se corrigieron posteriormente. Ayuda combina título de tema y sección al filtrar; el circuito «caja scanner» muestra Escanear y buscar. EntityPicker conserva foco en Cambiar al elegir proveedor con Enter y vuelve al buscador al quitarlo. El segundo defecto se reprodujo en Chrome y con una prueba de compras fallida antes del cambio, y se volvió a comprobar en la demo recompilada. El informe original de abajo registra el estado revisado por el subagente; los resultados globales y límites están en ui-ux-verification.md.

7 de octubre de 2026. Revisión independiente del código y pruebas declaradas; sin editar implementación, ejecutar builds concurrentes ni modificar demo. QA global y reproducción en navegador corresponden al coordinador.

## Verdict

Sin hallazgos Critical ni Important confirmados. Integración aprobable con dos observaciones Minor. No equivale a aprobación visual integral ni cierre de todos los pendientes del plan.

## Hallazgos

### Minor — Ayuda puede encontrar un tema y ocultar todas sus respuestas

`src/renderer/features/help/HelpPage.tsx:283` busca todos los términos en el título y todas las secciones concatenadas; `:288` vuelve a exigir todos esos términos en cada sección aislada. Consulta concreta: **caja scanner**. El tema Caja y ventas coincide por «caja» en el título y «Escanear» en la sección Escanear y buscar (scanner se normaliza a escanear); ninguna sección aislada contiene ambos términos. Se muestra el título del tema con cero respuestas y tampoco el mensaje Sin resultados. Mostrar las secciones coincidentes con términos que no provengan del título, o conservar el tema completo cuando no haya una sección individual coincidente. Evidencia: contenido de helpTopics :15–42 y algoritmo puro search.ts. No requiere cambiar permisos.

### Minor — EntityPicker no define destino de foco al seleccionar con Enter

`src/renderer/components/EntityPicker.tsx:46` choose cierra el selector y ejecuta onChange. Cuando el padre aplica value, la rama `value && !open` (:62) desmonta el input que tenía foco y presenta Cambiar/Quitar, sin ref ni efecto para enfocar un control superviviente. En consumidores como PaymentDialog la selección con Enter elimina el control activo y puede dejar la próxima navegación Tab sin punto de continuación útil. Restaurar foco a Cambiar o al siguiente campo que decida el consumidor. Confirmado el desmontaje por código; el destino exacto del foco del navegador requiere reproducción web. No se declara pérdida de datos ni bloqueo de la operación.

## Contratos comprobados

- App conserva filtros de rol y flags antes de construir navegación, y currentSection cae a Caja si el destino perdió autorización. Los targets repetidos se discriminan con activeArea; no se hallaron IDs DOM repetidos derivados de ellos. Las pruebas navigation.test.ts comprueban adaptación y cobertura de destinos, pero no ejecución real de rutas ni menú móvil.
- Compras/Pedidos sí está integrado actualmente: App.tsx:612 pasa view=orders y ReplenishmentPanel.tsx:54 lo adopta. El pendiente del informe de navegación ya quedó obsoleto.
- navigate llama leaveGuard antes de cambiar área; openArea sólo cambia subárea al obtener true. El historial abierto desde Configuración usa la misma protección. Referencias iniciales en OperationsPanel mantienen lote/turno/ubicación. No se atribuyen a esta entrega problemas hipotéticos anteriores de restauración general de estado.
- EntityPicker y ProductSearch bloquean Enter durante isFetching y acotan índice al largo actual. ProductSearch genera IDs por instancia. No se confirmó selección de un resultado perteneciente a otra consulta.
- Dialog mantiene cancel condicionado por busy, retorno a opener conectado, scroll auto heredado de tokens.css y cabecera sticky. operational.css añade acciones sticky, tallas y límite de viewport. La geometría final requiere QA visual.
- PeriodComparison exporta CUSTOM con las fechas resueltas del resultado; el mes histórico inicia fechas exactas y DashboardPage monta por key=month. dashboard-comparison-export.test.ts cubre mes histórico y preset resuelto con importes exactos. No se detectó un cambio de cálculo monetario en estos componentes.
- ExportButton conserva objeto de filtros al editar preset y transforma filtros simples a múltiples. Ocultamiento inicial no elimina campos ni filtros del estado.
- PaymentDialog conserva validatePayments, parseArs y payload de venta/cuenta, y disclosure de cliente está condicionado por sus flags. FeaturesPanel sincroniza las dependencias declaradas y lista todos los cambios reales; save mantiene expectedRevision y errores del servidor.

## Límites

No ejecuté pruebas, builds ni navegación real para no competir con QA global. No comprobé visualmente 390/768/1024/1440/1920 ni zoom 200%, ni invertí latencias. Los dos hallazgos son acotados al código actual; el resto de git diff no se atribuye al turno. Los informes previos distinguen pruebas dirigidas de pendientes integrales y deben conservar esa distinción.
