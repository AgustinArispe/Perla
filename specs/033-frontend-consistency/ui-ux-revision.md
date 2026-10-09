# 033 — Revisión integral de UI y UX

Fecha: 7 de octubre de 2026. Estado: propuesta ampliada; pendiente de implementar.

Esta revisión es la referencia vigente para la próxima implementación. Amplía y corrige `spec.md` con el registro de 185 imágenes y la indicación de Agus: mostrar menos decisiones simultáneas, admitir espacio en blanco y simplificar con criterio. La propuesta inicial y su plan permanecen archivados sin cambios en `output/auditoria-frontend/2026-10-07/plan/`.

## 1. Resultado buscado

La dueña que atiende sola debe poder vender, fiar, recibir mercadería, controlar stock y entender su negocio sin interpretar la estructura interna del software. El operador frecuente debe conservar velocidad, teclado y contexto. Jefe incluye las capacidades de Supervisor y Vendedor; agrupar pantallas no cambia permisos ni activa funciones del negocio.

La interfaz tendrá tres niveles:

1. **Actuar:** información imprescindible y próxima acción.
2. **Decidir:** contexto breve que evita equivocarse: disponible, saldo, período, estado, unidad y consecuencia.
3. **Profundizar:** composición, trazabilidad, filtros especializados, opciones poco frecuentes y explicación del cálculo.

El nivel 2 no se esconde si cambia una decisión. Saldo, vuelto, límite de cuenta, stock disponible, cobertura parcial de costos, errores y guardado pendiente se mantienen visibles cuando importan.

## 2. Evidencia, certeza y novedades

Fuentes: 73 pantallas/variantes, 102 ventanas/variantes y 10 referencias aportadas; snapshots DOM; lectura selectiva del frontend y contratos. Se revisaron imágenes representativas por familia y estados, no se hizo un nuevo test interactivo de cada combinación. Los subagentes aportaron análisis de navegación, flujos y diseño; dos entregaron hallazgos parciales y el coordinador completó su síntesis. Informes en `output/auditoria-frontend/2026-10-07/analisis/`.

| Hallazgo | Evidencia | Prioridad y tratamiento |
|---|---|---|
| Resultados de búsqueda de Caja sin composición legible: textos e importes pegados | `popups/caja-02-buscar-producto.jpg`; clases de ProductSearch sin estilo base localizado | P1 inmediata: componer filas y reproducir selección antes de cambiar su lógica |
| Menú de 23 destinos fragmenta tareas relacionadas | App.tsx y capturas de shell | P1: agrupación por tareas y conservación de accesos contextuales |
| Inicio mezcla cantidades y urgencias heterogéneas | `01-inicio.jpg`, `01-inicio-sidebar-colapsada.jpg` | P1: unidad, alcance, motivo y muestra concreta por prioridad |
| Agenda repite acciones sólidas y muestra obligaciones mínimas sin prioridad clara | `05-agenda.jpg` | P1: cobrar/pagar, agrupación por contraparte y fecha; detalle de obligaciones conservado |
| Mensual conserva bloques de poco contenido, exportaciones dominantes y mucho inventario | `17-resumen-mensual.jpg` y referencias | P1: composición por preguntas de negocio |
| La comparación en pantalla puede usar un mes histórico y su exportación solo pasar preset | PeriodComparison.tsx | Riesgo de exactitud: verificar antes de migrar; corregir con prueba si se confirma |
| Promoción nueva retrasa selección de alcance detrás de bloques grandes | `promociones-01-nueva.jpg` y 08–10 | P1: tipo compacto, alcance/beneficio juntos, programación bajo demanda |
| Actividad expone operaciones técnicas; ayuda no encuentra scanner | `21-actividad.jpg`, `23-ayuda-busqueda.txt` | P2: lenguaje comercial y sinónimos de búsqueda |
| Algunas capturas no permiten concluir dimensiones o superposiciones reales | Backups estrecho, popups fullPage de miles de píxeles | Reproducir en viewport conocido; no diagnosticar por miniatura |

No se declara P0 funcional por una revisión estática. Un fallo que cobre dos veces, cambie permisos o altere cifras elevará la prioridad y bloqueará su circuito si se reproduce.

### Avances a conservar

- Producto nuevo ya presenta lo esencial y agrupa extras.
- Configuración ya tiene pestañas; la captura panorámica anterior no refleja ese avance.
- Cliente y venta a cuenta ya están disponibles en Caja.
- Traslado ya muestra disponibilidad al seleccionar un artículo.
- Stock individual distingue cantidad contada y diferencia.
- Ventas netas ya no se duplican en comparación mensual; venta cubierta se omite con costo al 100%.
- Reposición del dashboard ya se limita a ocho filas. Se propone acotarla y reubicarla, no inventar un límite que no existía.
- Se conservan búsquedas, scanner, borradores, recuperaciones, Excel, multiselección y permisos acumulativos.

## 3. Enfoque elegido

**Migración incremental por tareas y componentes compartidos.** Primero corregir componentes que dañan varios circuitos, después componer pantallas completas. Cada etapa incluye responsive y evidencia antes/después.

Alternativas descartadas:

- Cambiar solo colores y radios es rápido, pero conserva la fragmentación y la jerarquía deficiente.
- Rehacer todo de una vez o convertir cada formulario en un asistente aumenta riesgo y clics; dificulta saber qué mejoró. Un flujo por pasos se justifica solo si hay decisiones dependientes que no pueden mostrarse con claridad juntas.

No se agrega un «modo simple» que esconda capacidades por rol. La simplicidad proviene de buenos valores iniciales, función opcional configurada y revelado progresivo. No se incorporan favoritos, personalización de columnas ni una nueva biblioteca de UI sin evidencia de necesidad.

## 4. Espacio, densidad y texto

| Situación | Composición inicial | Detalle bajo demanda | Uso del espacio |
|---|---|---|---|
| Caja | Scanner, carrito, total y Cobrar | Descuento manual, nota, cliente si no hay uno elegido | Compacta para trabajar; no separar demasiado nombre, cantidad e importe |
| Cobro | Total, medio, recibido/vuelto o deuda y Confirmar | Dividir pago; selección de cliente al solicitarla | Ventana proporcionada al caso, sin áreas vacías gigantes |
| Alta breve | Campos requeridos y los dependientes del tipo elegido | Opciones adicionales y datos poco usados | Formulario de 560–680 px como punto de partida; puede sobrar ancho exterior |
| Lista de trabajo | Búsqueda, filtro frecuente, acción principal, Excel y columnas de decisión | Filtros avanzados, trazabilidad, herramientas masivas | Ancho útil completo, filas cómodas y comparables; no tarjetas gigantes |
| Inicio | Vender y grupos de atención relevantes con muestra breve | Lista completa, responsable y detalle de cálculo | No igualar alturas mediante relleno; mantener orden de lectura |
| Resultados | Período, hasta cuatro cifras y evolución | Composición y exploración de períodos | Espacio entre preguntas distintas; datos relacionados próximos |
| Configuración | Un tema y sus controles | Dependencias, ayuda y diagnóstico | Se acepta una página corta sin llenar el fondo |
| Operación delicada | Entidad, importe/cantidad, consecuencia, confirmar/cancelar | Historial o cálculo de apoyo | Texto puntual de consecuencia y botones claramente separados |

Los números de campos/columnas son guías, no cuotas. Una lista de productos necesita comparar muchas filas; un alta no necesita exponer quince campos opcionales. Como inicio de diseño: 3–5 campos esenciales cuando el dominio lo permita; 4–6 columnas de decisión en escritorio; 3–5 ejemplos por resumen. Verificar con el contenido real.

Reglas:

- Etiquetas permanentes; no depender del placeholder. Eliminar subtítulos que repiten el título, no instrucciones necesarias.
- Botones expresan resultado: «Guardar producto», «Confirmar venta», «Registrar cobro», «Enviar traslado». «Contar stock» puede reemplazar «Contar» aislado.
- «Más filtros (3)» conserva chips/resumen de filtros activos. Cerrar filtros no los elimina.
- Agrupar opcionales por nombre concreto: «Stock inicial», «Datos de contacto», «Programación». No un único cajón interminable llamado Avanzado.
- Si la validación falla dentro de una sección plegada, abrirla, llevar foco al campo y conservar todo lo escrito.
- Acciones de fila neutrales, visibles también sin hover. Solo una acción sólida predominante por tarea activa.
- No hacer toda tarjeta clicable si contiene controles que ejecutan otras acciones. Acceso de detalle explícito.
- Paginación fuera del área de filas; omitir en cero resultados. Contador y rango coherentes con filtro.
- No truncar importes. Nombres largos pueden partir en dos líneas; identidad completa disponible en detalle.

## 5. Sistema visual

Adaptar PULSE a la identidad ya aprobada de Perla Negra. Mantener barco y marca; Cinzel solamente en la firma. Manrope para interfaz y números tabulares para cantidades. No incorporar motivos piratas dentro de tablas, formularios o gráficos.

Paleta propuesta: lienzo `#F5F4F0`, superficie `#FFFFFF`, tinta/primario `#17313D`, sidebar `#152B36`, secundario `#586872`, borde `#D9DFE2`, selección `#E8EFF3`, oro de firma `#E6C68B`. Semánticos: verde `#246B50`/`#EAF4EE`, ámbar `#875514`/`#FBF2DF`, rojo `#A33039`/`#FBEDEF`. Validar contrastes reales antes de fijarlos. El primario sólido pasa a navy; latón queda puntual, no en cada exportación o estado activo.

Escala propuesta: título 28–32 px en escritorio y 24–28 en móvil; sección 18–20; texto 14–16; metadatos 12–13. Espaciado 8/12/16/24/32. Controles 44 px y objetivos táctiles de al menos 44 px. Radios 8/12/14 según control/superficie/diálogo. Los valores finales se verifican a zoom 200% y con datos largos.

Panel exterior ancho completo donde corresponde; ancho de lectura limitado dentro de formularios y ayuda. En escritorio amplío se evita estirar cada input a 1500 px. Fronteras funcionales sutiles y sombras cortas; no borde decorativo por cada fragmento ni anulación global de bordes/foco.

Coolicons como familia única, con semántica consistente. Si dos destinos usan el mismo icono, el texto sigue diferenciándolos. Ninguna acción importante depende solo de un pictograma.

Movimiento: respuesta 100–160 ms; overlays 160–220 ms; entrada de gráfico hasta 220 ms ante cambio explícito de período. Sin contadores que recorran importes, cascadas de tarjetas ni animaciones al refrescar en segundo plano. Respetar movimiento reducido. Caja nunca espera una animación.

## 6. Navegación y permisos

Un nivel principal y uno interno. Conservar identificadores y enlazado durante la migración; no basta con cambiar el texto del menú.

| Destinos actuales | Destino propuesto | Área interna |
|---|---|---|
| Inicio | Inicio | Atención y continuidad |
| Caja | Caja | Venta y turno actual |
| Histórico, Comprobantes | Ventas | Historial / comprobantes pendientes |
| Productos, Revisión | Productos | Catálogo / precios y revisión; categorías/marcas como herramienta |
| Stock, Reposición, Controles (mercadería) | Stock | Existencias / Reponer / Conteos / Vencimientos |
| Compras, Proveedores, pedidos de Reposición | Compras | Recibir / Historial / Pedidos / Proveedores |
| Ubicaciones | Ubicaciones | Existencias / Traslados |
| Clientes | Clientes | Directorio y cuenta |
| Agenda | Cobros y pagos | Cobrar / Pagar; fechas y compromisos |
| Promociones | Promociones | Activas / programadas / finalizadas |
| Turnos, Controles (diferencias de caja) | Turnos | Historial / diferencias |
| Resumen mensual, Resumen semanal | Resultados | Mensual / resúmenes guardados; explorar período por separado |
| Configuración, Usuarios, Actividad, Backups | Administración | Negocio / Funciones / Terminales / Equipo y acceso / Actividad / Copias; impresión conserva acceso desde donde exista |
| Ayuda | Ayuda fija inferior | Búsqueda, tema y artículo |

Grupos: Trabajo diario (Inicio, Caja, Ventas); Mercadería (Productos, Stock, Compras, Ubicaciones); Negocio (Clientes, Cobros y pagos, Promociones, Turnos, Resultados); Administración al pie de grupos. Ayuda y cuenta permanecen alcanzables. Cuenta agrupa preferencia inicial, contraseña y salida. La etiqueta Administración evita que el supervisor pierda Actividad por entrar en un contenedor considerado exclusivo del jefe.

Jefe ve todos los accesos habilitados sin cambiar perfil. Supervisor conserva exactamente su alcance actual; Resultados sigue restringido. Vendedor conserva Caja, sus acciones autorizadas y Ayuda; la selección de cliente ocurre dentro de Caja sin exponer administración. Contenedor visible si hay al menos una sección permitida. Flags y permisos se evalúan por separado; el servidor sigue siendo la autoridad.

Al abrir desde Inicio/notificación se llega a entidad, pestaña, fecha y ubicación correctas. Volver recupera filtros, página y, cuando corresponda, scroll. Los enlaces/preferencias antiguos se traducen a la nueva ubicación sin quedar huérfanos. «Reponer» no duplica Pedidos: Stock prepara necesidades y Compras mantiene los pedidos creados, con enlace entre ambos.

## 7. Composición por módulo

| Módulo | Mostrar primero | Abrir cuando se necesita | Criterio de salida |
|---|---|---|---|
| Ingreso | Usuario, contraseña, Ingresar; error y recuperación claros | Ayuda de acceso | Sin cambios de seguridad; no filtrar información de cuentas |
| Inicio | Vender, borrador relevante y 3–5 grupos justificados | Todos los pendientes | Cada contador nombra unidad y abre su mismo alcance; sin emergencia falsa por precio antiguo |
| Caja | Escaneo, carrito y total | Cliente/fiado, descuento, peso, turno | Venta habitual sin pasos adicionales; lector no roba foco |
| Ventas / Histórico | Fecha, búsqueda, estado, total, acceso al detalle | Comprobante, devolución y anulación | Diferenciar cancelar carrito de anular venta completada |
| Comprobantes | Pendientes, venta y estado de impresión | Reintentar/ver documento | Cola continúa accesible; impresión no confunde ticket interno con factura fiscal |
| Productos | Nombre, precio, unidad, estado y búsqueda | Código completo, categoría/marca, historial, importación y etiquetas | Alta breve preservada; herramienta masiva no domina |
| Revisión | Motivo, precio, costo conocido y acción contextual | Recargo, método de costo y cálculo | Etiquetas comerciales; revisión de precios y sin movimiento distinguibles |
| Stock | Producto, disponible, mínimo/estado y ubicación cuando aplica | Movimiento, conteo, lotes e historial | Desconocido distinto de cero; unidades y kg no mezclados |
| Reposición | Disponible, sugerido y selección | Objetivo, en camino, calendario y cálculo | Alcance visible; propuesta no se presenta como pedido confirmado |
| Controles | Iniciar o retomar conteo; lote próximo/vencido | Historial y revisión de ajustes | Contado/registrado/diferencia legibles; aplicar es una acción explícita |
| Compras | Proveedor, búsqueda/escaneo, líneas, costo y total | Nota, pago, borrador y detalle de histórico | Recepción coherente con destino y deuda; no perder líneas al crear proveedor |
| Proveedores | Nombre, contacto útil y saldo según permiso | Cuenta, obligaciones y pagos | Un formulario de pago activo con importe/deuda claros |
| Ubicaciones | Ubicación y Existencias / Traslados | Detalle, entradas/salidas y recepción | Disponible en origen al ingresar cantidad; nunca tratar un depósito como negocio |
| Clientes | Buscar cliente y saldo según función/permiso | Cuenta, límite, movimientos y cobro | Mismo cliente disponible desde carrito y su cuenta |
| Cobros y pagos | Cobrar/Pagar y vencimiento, contraparte, saldo | Obligaciones y distribución | No compensar, redondear ni descartar deudas para simplificar la vista |
| Promociones | Tipo compacto, alcance y beneficio | Vigencia, prioridad y condiciones | Resumen «qué productos, qué beneficio, cuándo» antes de guardar; previsualización solo con datos disponibles |
| Turnos | Fecha, caja, responsable, estado y diferencia | Desglose de efectivo, movimientos, revisión | Diferencia pendiente no se confunde con cero; cierre abierto sigue como pendiente |
| Mensual | Período, métricas, evolución, pagos y destacados | Desglose, comparación avanzada y operación actual | Cada cifra principal una vez; filtros/fechas iguales en pantalla y archivo |
| Semanal | Período y resultado guardado | Versión, generación, cálculos y recálculo | Separar snapshot guardado de consulta actual |
| Configuración | Un tema por sección | Dependencias al cambiar función | Se explica exactamente qué cambia; conserva compromisos e históricos |
| Usuarios | Nombre, rol, estado de cuenta y acceso | Edición, cambio permitido y desbloqueo | Activo no se confunde con desbloqueado; jefe conserva todos sus flujos |
| Actividad | Acción comercial, usuario, fecha y entidad | IDs y detalle técnico | Traducción exhaustiva con fallback legible, no silencioso |
| Backups | Última copia, crear y lista breve | Revisar restauración / cargar copia | Advertencia de reemplazo y alcance siempre visibles antes de restaurar |
| Notificaciones | Tipo agrupado, fecha y acción relevante | Lista del grupo | Leído no equivale a resuelto; contador describe su significado |
| Ayuda | Búsqueda y tarea concreta | Procedimiento y ejemplos | Scanner/pistola/lector y fiar/a cuenta encuentran la tarea apropiada |

## 8. Resultados y Inicio: decisiones específicas

**Inicio** responde «qué requiere mi atención». Evitar una grilla de tarjetas de altura arbitraria: acceso Vender, resumen breve de grupos y una lista priorizada por reglas existentes. Fechas y diferencia monetaria distinguen turnos repetidos; cobrar/pagar se distinguen. Un precio viejo es revisión informativa, no alerta roja automática. Una página sin pendientes puede ser corta.

**Resultados mensual** responde «cuánto vendí, cómo cambió y de qué se compuso»:

```text
Resultados       [Mes + fechas efectivas]                  [Exportar]
[Ventas netas + comparación] [Ventas] [Ticket] [Margen conocido*]
[Evolución diaria — ancho útil — tabla de valores desplegable]
[Medios de pago]                     [5 productos destacados]
[Ver desglose de ventas]             [Ver rentabilidad*]
Inventario actual → Stock / Ubicaciones
```

El asterisco representa función habilitada y permiso, no una nota obligatoria en la UI. Cobertura parcial de costos se muestra junto al margen, incluso con detalle cerrado. No nombrar margen como ganancia neta; conservar la aclaración sobre gastos, impuestos y comisiones donde ayuda a interpretarlo.

Comparación utiliza períodos equivalentes y sus fechas efectivas. Si anterior es cero, mostrar «Sin base comparable» y valores, no porcentaje infinito. No mezclar fecha actual con un mes histórico. Gráfico: días sin ventas, futuros y no disponibles no se intercambian. Tabla accesible y formato argentino. Productos por unidad y kilo conservan criterios de orden distintos donde corresponda.

Medios de pago muestra importe y porcentaje del importe como primera lectura. Operaciones y porcentaje de operaciones van al detalle; un pago mixto puede aparecer en más de un medio. Tarjeta agregada no se repite debajo. Anulaciones, devoluciones y descuentos se describen conforme a sus reglas existentes dentro del desglose de ventas, sin redefinir fórmulas.

El stock actual no se presenta como stock al cierre del mes. Reposición y ubicaciones se consultan desde sus módulos; en Resultados solo acceso operativo con fecha de consulta. Inicio puede mostrar cinco prioridades y enlace completo; no ordenar por alfabeto y llamarlo prioridad sin verificar la regla.

## 9. Contratos comunes

**Buscadores:** compartir filas, foco, navegación y estados; conservar fuentes diferentes para cliente, proveedor y producto. Resultados pueden mostrar precio o disponibilidad según la tarea. No mostrar saldos a quien no puede consultarlos. No seleccionar una respuesta anterior cuando la consulta cambió; no afirmar que ocurre hoy sin prueba.

**Diálogos:** tallas por tarea, no «todos más grandes». Formulario breve alrededor de 560–680 px, exploración 800–960, detalle complejo hasta 1120 si cabe. Header y acción final alcanzables; un scroll de contenido, sin pie sobre filas. En móvil, formato casi completo con márgenes y teclado virtual contemplados. Escape, cierre, foco inicial/retorno y cambios sin guardar definidos. Ventanas delicadas preservan explicación de consecuencia.

**Excel:** en cada listado aplicable, botón rotulado «Excel» junto a Filtros. El diálogo abre con filtros de la pantalla; resumen y Descargar primero, «Ajustar filtros» después. Mantener multiselección de categorías, marcas, estados, ubicación y fechas según dataset. Exportar todas las coincidencias y orden, no solo la página. Cambiar filtros del archivo no altera silenciosamente la lista. No ofrecer categorías/estados que ese dataset no entiende. Resultados agrupa formatos/alcance; las secciones conservan herramienta rotulada secundaria. Permisos del archivo no se deducen de que se oculte el botón.

**Estados:** carga mantiene geometría y estado ocupado; error ofrece recuperación sin borrar trabajo; sin resultados propone limpiar filtros; vacío inicial permite primera acción; offline informa que confirmar venta requiere servidor. No mostrar éxito antes de respuesta ni fabricar cifras. No se agrega venta offline en este rediseño.

## 10. Prueba de facilidad y cierre

Validar por etapa en 390, 768, 1024, 1440 y 1920 px, más zoom 200%. Los 185 archivos no equivalen a estas pruebas: hay fullPage, referencias de diferentes anchos y posibles anomalías de captura.

Recorridos esenciales: vender tres artículos y cobrar efectivo; vender por peso; cliente y fiado; cobrar saldo; recibir compra; trasladar stock; retomar conteo; crear promo; consultar mes anterior y exportarlo con varios filtros. El jefe ejecuta todo sin cambiar rol. Supervisor/vendedor no ganan permisos.

Prueba moderada propuesta con una persona dueña/administradora poco habituada y un operador frecuente: pedir tareas concretas sin explicar el menú, registrar primer intento, dudas, retrocesos, errores y ayuda necesaria. Objetivo: tareas frecuentes encontradas desde Inicio en hasta dos elecciones de navegación y realizadas sin asistencia; contrastar contra versión actual. Son metas futuras, no resultados medidos. Si no hay personas disponibles, declarar pendiente la validación humana; QA del agente no la reemplaza.

Rechazar una etapa si agrega pasos al cobro habitual, oculta una consecuencia importante, pierde filtros/borradores, corta importes, cambia saldos, rompe Excel o permite acciones fuera del rol. Comparar velocidad con la misma base y condiciones; no prometer tiempos absolutos sin medir.

## 11. Límites

Trabajo futuro sobre GestionProductos local. No tocar MareaMac, datos históricos, seguridad, reglas contables ni facturación fiscal por una decisión estética. No aplicar ajustes de los borradores de auditoría. No instalar frameworks nuevos ni limpiar estilos globalmente sin trazar su uso. Mantener el material comercial y las capturas originales.

Este turno produce análisis y planificación. La implementación se realizará como una tarea posterior a partir del plan asociado.
