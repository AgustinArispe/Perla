# Navegación, claridad y carga cognitiva

Fecha: 7 de octubre de 2026. Estado: análisis y propuesta; sin implementación.

## Alcance y método

Revisión independiente de capturas, contexto DOM y código de lectura. Se consultaron Impeccable (`SKILL.md`, referencias `operate`, `shape` y `critique`), PRODUCT.md, DESIGN.md, la spec 033 y el registro de capturas. Esta es una evaluación parcial dentro de la auditoría coordinada; no se ejecutó el comando integral `critique`, detector ni una nueva prueba de interacción. No son resultados de tests de usabilidad.

Se observaron visualmente Inicio, Reposición, Revisión, Controles, Agenda, Configuración, Funciones, Usuarios, Actividad, Backups, Ayuda, Notificaciones y cuatro diálogos críticos. El código confirma las agrupaciones actuales y la herencia de permisos. No se modificaron código, configuración ni datos.

## Diagnóstico

El usuario tiene que entender demasiada estructura interna antes de actuar. «Reposición», «Controles», «Revisión», «Stock», «Agenda» y «Actividad» son destinos separados, aunque varios representan pasos dentro del mismo trabajo. La navegación traduce la construcción por módulos en una lista de opciones. La dueña necesita reconocer tareas: vender, recibir mercadería, cobrar una deuda, revisar qué falta y entender cómo va el negocio.

El espacio en blanco no es un defecto por sí mismo. El problema visible en Inicio es que los huecos proceden de tarjetas de alturas incompatibles y no de una jerarquía deliberada. Una pantalla breve de configuración puede terminar a mitad de altura y sentirse completa. Una pantalla operativa puede mostrar veinte filas si esas filas son precisamente el trabajo; no hay que reemplazar toda tabla por tarjetas enormes ni esconder resultados útiles para aparentar simpleza.

Fortalezas que conviene preservar: identidad naval reconocible, nombres de acciones mayormente directos, Ayuda fija abajo, selector de módulos opcionales, borradores recuperables, estado de conexión, confirmación final en ajustes y restauración. El formulario de alta de usuario ya muestra un conjunto básico razonable; no necesita convertirse en un asistente de múltiples pasos.

## Evidencia y cambios propuestos

| Prioridad | Evidencia | Hallazgo y consecuencia | Cambio concreto | Certeza |
|---|---|---|---|---|
| P1 | `pantallas/01-inicio.jpg` y `src/renderer/App.tsx` | Más de veinte destinos; tareas relacionadas repartidas entre grupos. Los módulos administrativos empujan otros destinos fuera de la vista. | Agrupar por tareas, conservar enlaces directos y contexto. Menú de cuenta para contraseña/salida. | Visible y confirmado en código. |
| P1 | `01-inicio.jpg` | 1 vencimiento, 1.845 reposiciones y 3.776 precios comparten el lenguaje «pendiente». Parece que todo es urgente. | Prioridades con motivo, unidad y alcance. Revisiones informativas separadas de acciones vencidas. No inventar prioridad mediante color. | Visible; la regla exacta de prioridad requiere revisar consultas. |
| P1 | `01-inicio.jpg` | Cobros/pagos informa 768 pendientes sin ejemplo; Martín/Lucía se repiten sin fecha del turno ni monto. | Separar cobros de pagos, mostrar próximos vencimientos; identificar cada diferencia con fecha, caja y monto. | Visible. |
| P1 | `02-reposicion.jpg` | Tabla larga de 25 filas muy altas; «Objetivo», «En camino», «Motivo», cantidades y detalles compiten en 700 px útiles. Hay aviso de calendario sin configurar. | Columnas iniciales producto, disponible y sugerido; cálculo bajo demanda. Contexto de ubicación/cobertura visible. Configurar calendario desde aviso breve; no presentar cálculo por mínimo como demanda estimada. | Visible; exactitud del cálculo no evaluada. |
| P1 | `03-revision.jpg` | Precio/costo, margen/recargo y origen técnico `WEIGHTED_AVERAGE` aparecen simultáneamente en cada fila. | Foco en precio, costo conocido y motivo de revisión; método de costo y recargo en detalle. Cambiar etiquetas técnicas por lenguaje comercial. | Visible, también en DOM. |
| P1 | `04-controles.jpg` | Botón «Iniciar conteo» estirado, formulario pegado a borradores, paginación vacía. «Con diferencias» no identifica cajas. | Formulario corto de inicio, borradores como bloque separado, sin paginación si no hay resultados. Mover diferencias a Turnos y dejar acceso contextual. | Visible. |
| P1 | `05-agenda.jpg` | 25 acciones sólidas «Registrar cobro» y abundantes importes de centavos, todos sin fecha acordada. Obliga a revisar elementos de igual peso. | Vista Cobrar/Pagar, agrupación por vencimiento y contraparte, una acción neutra por fila. Mostrar saldo agregado con detalle de obligaciones. No descartar centavos ni compensarlos automáticamente. | Visible; agrupación y orden actuales necesitan confirmar semántica del endpoint. |
| P1 | `24-notificaciones.jpg` y su DOM | Un aviso informativo de tendencia precede a una larga secuencia de faltantes de azúcar; la campana muestra 27 «pendientes». | Agrupar por tipo, ordenar por urgencia definida y diferenciar leído de resuelto. Ejemplo «20 productos sin stock → Revisar reposición». Lista completa en vista dedicada. | Visible y código confirma contador no leído. |
| P1 | `23-ayuda-busqueda.txt` | «scanner» da cero resultados aunque la ayuda contiene lector USB y escaneo. | Búsqueda por sinónimos y variantes de acentuación; resultados por tarea. Sinónimos de dominio mantenidos explícitamente. | Confirmado por DOM guardado, no solo hipótesis. |
| P2 | `18-configuracion.jpg` | Negocio ya usa pestañas y formulario acotado. La captura histórica panorámica no representa este estado. | Conservar estructura por tema; mejorar alineación y jerarquía, sin rehacer un problema ya parcialmente resuelto. | Visible. |
| P2 | `18-configuracion-funciones.jpg` | 15 tarjetas activas de igual apariencia, con controles que se confunden visualmente con badges. | Agrupar por tarea — venta, mercadería, clientes, análisis — y usar switch con estado inequívoco. Dependencias solo al cambiar algo afectado. | Visible. |
| P1 | `popups/configuracion-03-confirmar-funciones.jpg` | La confirmación habla genéricamente de funciones pausadas; no enumera qué módulos cambia. | Resumen concreto: qué se pausa, qué depende, qué pendientes siguen accesibles. Mantener una confirmación final en cambios de impacto. | Visible; la lista exacta debe derivarse del cálculo vigente. |
| P2 | `19-usuarios.jpg` | «Destrabar» se repite en usuarios marcados activos; no se explica si están bloqueados. Dos filtros y vistas consumen casi tanto espacio como cuatro usuarios. | Separar estado de cuenta de estado de acceso; destrabar solo con bloqueo confirmado, o mover a detalle si no hay dato disponible. Filtros secundarios plegables cuando no aportan a la tarea. | Visible; «activo» no prueba que acceso esté desbloqueado. |
| P1 | `21-actividad.jpg` | Se exponen `transfers.receive`, `transfers.dispatch` e identificadores. Título entre herramientas y pestañas en orden distinto al resto. | «Traslado recibido» + usuario, fecha y referencia legible. Detalle técnico detrás de expansión. Header compartido. | Visible. |
| P2 | `22-backups.jpg` | Contenido de ~320 px a la izquierda en un lienzo de 984, mientras la restauración se captura con shell normal. | Reproducir en viewport controlado antes de tocar CSS; no usar esta sola imagen para diagnosticar un defecto responsive. | Anomalía de captura/estado, causa no confirmada. |
| P2 | `23-ayuda.jpg` | Navegación global + índice + artículo dejan ~350 px de texto en el viewport analizado. Se muestran todos los subtítulos de un tema. | En anchos intermedios índice plegable; artículo de ancho cómodo. En móvil tema y tareas como selectores. Mantener búsqueda y acceso contextual. | Visible. |
| P1 | `popups/controles-03-confirmar-diferencias.jpg` | Ajuste 105 → 0 se resume en una frase con poca jerarquía. | Tabla breve producto / registrado / contado / ajuste con cantidad claramente visible, motivo y CTA que exprese alcance. Conservar revisión, no exigir dobles confirmaciones rutinarias. | Visible; no se evaluó aplicación real. |
| P2 | `popups/backups-01-revisar-restauracion.jpg` | La advertencia relevante explica reemplazo de datos, cierre de sesiones y copia previa. | Preservar texto de consecuencia en esta tarea poco frecuente y de alto impacto; no eliminarlo por «menos texto». | Visible; conducta real no testada aquí. |

P1: causa confusión considerable o puede afectar una decisión importante. P2: fricción con alternativa disponible. No se acredita ningún bloqueo funcional P0 en esta revisión estática.

## Arquitectura recomendada

Mantener las rutas/destinos existentes internamente durante la transición. La agrupación visual no debe resetear filtros, borrar borradores ni alterar permisos. Los enlaces de Inicio, avisos y Ayuda deben abrir la pestaña y el registro precisos, y Volver debe recuperar filtros/scroll del origen.

| Grupo | Destino | Áreas internas |
|---|---|---|
| Trabajo diario | Inicio | Prioridades, accesos, continuidad de borradores |
| Trabajo diario | Caja | Venta, cliente, cobro, turno actual |
| Trabajo diario | Ventas | Historial, devolución/anulación según permiso, comprobantes y cola pendiente |
| Mercadería | Productos | Catálogo, categorías/marcas, precios, sin movimiento |
| Mercadería | Stock | Existencias, reponer, conteos, vencimientos |
| Mercadería | Compras | Recibir, historial, pedidos, proveedores |
| Mercadería | Ubicaciones | Existencias por ubicación y traslados |
| Negocio | Clientes | Directorio, cuenta y cobros |
| Negocio | Cobros y pagos | Agenda por fecha, obligaciones y movimientos relacionados |
| Negocio | Promociones | Activas, programadas, finalizadas |
| Negocio | Turnos | Abiertos/cerrados, diferencias y revisión |
| Negocio | Resultados | Consulta mensual y resúmenes guardados |
| Administración | Configuración | Negocio, funciones, terminales/impresión, equipo/accesos, actividad, copias |
| Fijo inferior | Ayuda y cuenta | Ayuda, preferencia de inicio, contraseña y salida |

Este mapa reduce destinos sin eliminar capacidades. No mostrar a la vez un árbol completo con todas sus subpestañas. Un nivel principal y un nivel interno como máximo. El grupo actual permanece abierto; los otros pueden plegarse. Caja e Inicio permanecen fáciles de encontrar. La dueña debe poder llegar a Vender desde cualquier módulo con un acceso estable.

**Tradeoff Proveedores:** dentro de Compras es coherente con recibir/pagar; quien trabaja diariamente con proveedores puede necesitar un acceso directo fijo. Primera implementación: pestaña visible en Compras y acceso desde la selección de proveedor/cuenta. Medir localización antes de agregar personalización o favoritos; no duplicar destinos por defecto.

**Tradeoff Configuración:** reunir administración reduce ruido pero escondería Actividad al supervisor si el contenedor se tratara como exclusivo del jefe. Renderizar una entrada de Administración con sus áreas permitidas o conservar Actividad como acceso secundario para ese rol. Permiso del contenedor = posee al menos una sección autorizada. No ampliar permisos del supervisor para justificar una agrupación visual.

**Tradeoff Reposición:** tiene entidad como trabajo recurrente. Puede estar en Stock como pestaña «Reponer» y abrir desde Inicio; si la prueba con operadores muestra que tarda en encontrarse, conservar un acceso directo en Mercadería. El objetivo no es alcanzar un número arbitrario de elementos de menú.

## Roles acumulativos y módulos configurables

`src/domain/permissions.ts` confirma Vendedor ⊂ Supervisor ⊂ Jefe y ADMIN con los permisos de OWNER. `App.tsx` usa además una lista de destinos por rol y filtros de funciones. La refactorización debe revisar ambas capas; ocultar un menú no es autorización.

- Jefe: venta, cobro, apertura/cierre, stock, recepción y toda administración, sin cambiar perfil ni activar «modo vendedor».
- Supervisor: operación, mercadería y áreas que ya autoriza el backend. No resumen mensual ni margen global si no tiene permiso. Actividad sigue alcanzable.
- Vendedor: Caja y Ayuda; selección de cliente y venta a cuenta según autorización/función vigente desde Caja, sin exponer toda administración de clientes.
- Configurar una función afecta el negocio; elegir página inicial o colapsar menú es preferencia personal. No mezclar ambos conceptos.
- Desactivar un módulo no elimina históricos ni vuelve inaccesibles compromisos pendientes permitidos. Definir destinos de continuidad para enlaces antiguos.

## Densidad y revelado progresivo por tarea

No se fija una cuota universal de tarjetas, columnas o campos. Cada pantalla debe dejar clara una pregunta y una acción. Los siguientes límites son puntos de partida verificables, no mandatos ciegos.

| Contexto | Visible al entrar | Bajo demanda | Espacio deliberado |
|---|---|---|---|
| Inicio | Acción Vender y 3–5 grupos relevantes con alcance claro | Todos los pendientes y detalle de cada grupo | Bloques de igual lógica, sin estirarlos para igualar alturas; si hay poco trabajo, página breve |
| Alta simple | 3–5 datos indispensables cuando el dominio lo permita | Datos fiscales/contacto adicional, configuración avanzada | Ancho de formulario limitado dentro del panel, etiquetas y separación suficiente |
| Lista para trabajar | Búsqueda, filtro principal, acción primaria, 4–6 columnas útiles | Filtros adicionales, detalle técnico, columnas secundarias | Filas de densidad cómoda; no crear tarjetas enormes de una línea |
| Conteo | Ubicación, avance, búsqueda, producto, cantidad contada y diferencia | Método del ajuste, historial, revisión final | Separar captura de cantidades de explicación; no separar cantidad del producto |
| Reponer | Disponible y sugerido, selección y total elegido | Cómo se calculó, calendario, en camino cuando afecta el cálculo | Fila compacta comparativa; detalles no repetidos en 25 filas |
| Agenda | Cobrar/Pagar, vencimiento y saldo por contraparte | Obligaciones y distribución del pago | Separación por fecha, filas consistentes; no un botón sólido por fila |
| Configuración | Una sección con pocos controles relacionados | Dependencias, datos avanzados y diagnóstico | Puede sobrar espacio al costado/abajo; no estirar campos para llenarlo |
| Ayuda | Buscar, tema elegido y tareas de ese tema | Procedimiento detallado, ejemplos y atajos | Medida de lectura cómoda; índice secundario adaptable |
| Decisión de riesgo | Entidad, importe/cantidad, consecuencia y confirmación | Detalle adicional si existe | Dejar aire alrededor de la consecuencia; aquí una explicación breve es necesaria |

Lo ocultable es contexto secundario, no saldo, disponibilidad, vencimiento, monto final, estado de guardado, error ni consecuencia irreversible. Un accordion no debe convertirse en el escondite de la tarea siguiente. Los filtros activos se mantienen visibles como resumen/chips aunque se cierre su panel.

## Pasos de implementación y aceptación

1. **Inventariar las tareas y permisos reales.** Matriz destino/rol/función, enlaces de avisos, estados y persistencia. Probar el recorrido como dueña que atiende sola. Aceptación: ninguna operación del vendedor/supervisor queda perdida para Jefe; no se agregan permisos al reubicar contenido.
2. **Definir contratos compartidos.** Header, tabs, toolbar, botón primario/secundario, acción de fila, vacío, paginación y volver. Aceptación: mismo patrón en Inicio, Controles, Agenda, Configuración y Actividad; no paginación en vacío; un CTA sólido por tarea, salvo contextos justificados.
3. **Migrar navegación por etapas.** Primero alias visuales y pestañas, luego retirar duplicados; registrar equivalencias. Aceptación: usuario identifica Vender, cobrar deuda, reponer y cerrar caja sin buscar entre grupos ajenos. Probar enlaces directos y retorno con filtros/borradores.
4. **Rehacer Inicio y avisos.** Definir unidades de conteo, muestras, orden y estado leído/resuelto. Aceptación: cada contador puede explicarse desde la consulta y abre el mismo alcance; no mezclar productos únicos con producto–ubicación; los avisos agrupados permiten abrir todos los registros.
5. **Ordenar control de mercadería y agenda.** Reposición, revisión, conteos y vencimientos con trabajo principal visible y explicación progresiva. Aceptación: elegir qué reponer, continuar conteo y registrar cobro no requieren leer campos técnicos; los valores se conservan al abrir/cerrar detalles.
6. **Completar administración y ayuda.** Configuración por temas, resumen de dependencia, roles explicados en una línea, bloqueo explícito, actividad legible, backups claros y sinónimos de ayuda. Aceptación: «scanner», «pistola», «escáner», «fiar», «fiado», «a cuenta» llevan a la tarea correcta; restauración sigue informando reemplazo/cierre; estado de cuenta no se confunde con bloqueo.
7. **Validar recorridos y tamaños.** Desktop, celular y zoom 200%, teclado y foco; estados vacío/cargando/error/sin permiso, 0/1/muchos resultados. Aceptación: no documento con overflow horizontal, popup con cierre y acciones alcanzables, controles táctiles de 44 px, retorno de foco correcto, contraste AA medido. La anomalía de Backups se reproduce o se descarta antes de reportarla como corregida.

Como validación con personas: asignar tareas concretas a una dueña con poca experiencia y a un cajero habitual. Observar dónde dudan o vuelven atrás. No confundir menos clics con mejor experiencia: un paso adicional que evita confundir cobrar con pagar puede ser correcto; abrir tres paneles para ver el saldo no lo sería.

## Preguntas de verificación pendientes

- ¿Los 1.845 pendientes de Inicio son productos únicos, producto–ubicación u otra unidad? No igualarlos artificialmente a 852 de la reposición filtrada.
- ¿La Agenda debe agrupar por persona/proveedor o cada obligación tiene condiciones que necesitan conservarse separadas? Mostrar total y conservar desglose.
- ¿«Pendientes» de campana corresponde a no leídos, sin resolver o mezcla? El componente usa `unreadCount`; la etiqueta debería reflejarlo.
- ¿El estrechamiento de Backups es reproducible a 984 px o una captura en estado transitorio?
- ¿Al navegar desde un aviso se preserva el origen, filtros y foco? No puede deducirse de capturas.

No hace falta interrumpir al usuario para contestar estas preguntas: corresponden a inspección de contratos y pruebas durante la primera etapa.
