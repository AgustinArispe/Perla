# 033 — Perla Negra: claridad operativa y consistencia visual

Estado: propuesta de diseño para revisión. No implementada.
Fecha: 7 de octubre de 2026.

## Objetivo

Convertir el frontend en una herramienta coherente, clara y agradable para atender y administrar un comercio. La dueña puede realizar todas las tareas sin cambiar de perfil. La identidad de Perla Negra se conserva mediante su marca, azul profundo y acentos de latón; la precisión de composición proviene de las referencias PULSE del usuario.

La calidad debe percibirse en la ubicación de las acciones, la lectura de los datos, las proporciones, los estados y la respuesta a cada interacción.

## Evidencia y alcance de la revisión

Se analizaron las diez capturas aportadas y la estructura local de estilos, Inicio, Controles y Resumen mensual. No se realizó una nueva prueba interactiva de todos los módulos. Las observaciones sobre selección de buscadores y consistencia de cifras son verificaciones pendientes, no defectos funcionales confirmados por esta revisión.

Hallazgos visibles:

- Inicio: tarjetas de altura muy distinta dejan grandes vacíos; cantidades de problemas heterogéneos aparecen como si tuvieran la misma urgencia. Cobros y pagos muestra un total sin una muestra que lo explique.
- Controles: botón de inicio estirado, controles pegados al contenido, pestañas con aspecto de acciones y paginación vacía.
- Compras: buscadores pegados, total con tipografía distinta, área vacía separada del flujo y exportación compitiendo con recibir una compra.
- Ubicaciones: paginación visualmente superpuesta a filas y desplazamientos anidados que necesitan verificación; listados largos sin una clara separación de tareas.
- Semanal: metadatos técnicos prominentes, exceso de altura y acciones de mantenimiento del informe con la misma presencia que descargarlo.
- Mensual: comparación dentro de una tarjeta casi vacía; exportaciones repetidas; gráfico concentrado en un extremo; medios de pago demasiado separados; reposición y depósitos ocupan gran parte del recorrido.
- Global: demasiados destinos en la navegación, patrón irregular de encabezados y controles, marrón en demasiadas acciones, textos secundarios débiles y cantidades con tratamientos diferentes.

La carga de CSS en `src/renderer/main.tsx` es tokens → pulse → perla → operational. Esos archivos suman 9.009 líneas en la revisión. El tamaño no prueba un error por sí mismo, pero la superposición y los layouts locales requieren una migración hacia responsabilidades claras.

## Dirección visual

Lectura de diseño: producto operativo contemporáneo, sobrio y luminoso, con carácter marítimo en la marca y los acentos.

### Paleta propuesta

| Función | Color propuesto | Aplicación |
| --- | --- | --- |
| Fondo | `#F5F4F0` | Lienzo claro, menos beige dominante |
| Superficie | `#FFFFFF` | Formularios, listas, tarjetas |
| Tinta | `#17313D` | Texto principal y acciones primarias |
| Navegación | `#152B36` | Sidebar y marca |
| Texto secundario | `#586872` | Contexto y metadatos legibles |
| Borde | `#D9DFE2` | Delimitación funcional discreta |
| Selección | `#E8EFF3` | Selecciones, pestañas y hover |
| Firma dorada | `#E6C68B` | Marca sobre azul, puntos de énfasis |
| Latón | `#826128` | Acento puntual; no todos los botones |
| Verde | `#246B50` sobre `#EAF4EE` | Confirmaciones y estados correctos |
| Ámbar | `#875514` sobre `#FBF2DF` | Atención requerida |
| Rojo | `#A33039` sobre `#FBEDEF` | Errores, vencidos y acciones destructivas |

Estos valores son una propuesta: comprobar contraste sobre los pares realmente utilizados. No introducir texturas piratas, fondos decorativos ni degradados para ocupar vacíos. La marca puede conservar Cinzel; todas las cifras, formularios y acciones usan Manrope.

### Reglas de composición

- Título 28–32 px; secciones 18–20; cuerpo 15; controles 14; metadatos 12–13. Números tabulares, métricas 28–36 según espacio. Sin importes en serif.
- Espaciado de 4 px, con 8/12/16/24/32 como valores principales. Márgenes de página 24–32 en escritorio y 16 en móvil.
- Campos y botones de acción 44 px. Variantes compactas en filas solo con área táctil suficiente en móvil.
- Radios: controles 8, superficies 12, diálogos 14. Suavizado progresivo si el navegador lo soporta, sin recortes que dañen el foco.
- Sombras pequeñas para superficies; mayor elevación solo para overlays. No levantar tarjetas de información al pasar el cursor si no son interactivas.
- Un encabezado compartido: título a la izquierda, contexto y herramientas alineados, acción principal identificable. Sin tarjeta decorativa alrededor del título.
- Una sola acción sólida por zona de trabajo. Secundarios neutrales; utilidades discretas; peligro rojo. Pestañas se distinguen de botones de ejecución.
- Ancho completo para tablas y espacios operativos; ancho de lectura limitado dentro de formularios o ayuda. No estirar cada campo hasta ocupar toda la pantalla.
- Un desplazamiento principal por página. Scroll local solo para tablas anchas, listas virtualizadas justificadas y contenido de diálogos.

## Navegación propuesta

Mantener las rutas internas y permisos existentes durante la migración. Los nombres de agrupación no deben impedir enlaces directos desde notificaciones.

| Grupo | Destino principal | Contenido interno |
| --- | --- | --- |
| Operación | Inicio | Prioridades y accesos de trabajo |
| Operación | Caja | Venta actual y acciones del turno |
| Operación | Ventas | Historial y comprobantes vinculados a cada venta |
| Mercadería | Productos | Catálogo, categorías, marcas y revisión de precios |
| Mercadería | Stock | Existencias, reposición, conteos y vencimientos |
| Mercadería | Ubicaciones | Stock por ubicación y traslados |
| Mercadería | Compras | Recepción, historial, pedidos y proveedores |
| Gestión | Clientes | Clientes y cuentas corrientes |
| Gestión | Promociones | Promociones y aplicación |
| Gestión | Agenda | Cobros y pagos pendientes |
| Gestión | Turnos | Historial, cierres y diferencias |
| Gestión | Resultados | Resumen mensual y resumen semanal guardado |
| Administración | Configuración | Negocio, funciones, terminales, impresión, usuarios, actividad y backups según permiso |

Ayuda queda fija abajo. Cambiar contraseña y cerrar sesión pasan a un menú de cuenta accesible, liberando altura. El sidebar se colapsa, recuerda su estado y ofrece nombres accesibles en modo iconos. Móvil usa un menú overlay que devuelve el foco al cerrarse. Los grupos pueden plegarse; el actual permanece abierto.

El jefe mantiene todos los accesos de vendedor y supervisor. Los módulos desactivados siguen las reglas existentes de conservación de pendientes e históricos. El cambio de navegación no redefine permisos.

## Pantallas de referencia

### Inicio: qué hacer ahora

Encabezado compacto y acción Vender siempre disponible para el jefe. Un resumen de pendientes por tipo precede una lista priorizada. Mostrar hasta tres ejemplos por grupo y un acceso al listado completo. No usar una cuadrícula de tarjetas cuya altura variable produzca huecos enormes.

Separar vencido de próximo a vencer, diferencias de caja de revisiones informativas y cobros de pagos. Las prioridades salen de reglas existentes; cualquier nueva regla exige definición y prueba. No presentar todos los productos con precios antiguos como una emergencia.

Precisar la unidad de los contadores: productos únicos, registros producto–ubicación, turnos o movimientos. Los valores 1.845 y 852 de las capturas pueden tener alcances distintos; revisar sus consultas antes de intentar igualarlos. Mostrar fecha y responsable en diferencias de caja para distinguir turnos de la misma persona.

La preferencia de página inicial se mueve a la cuenta. Si no hay pendientes, mostrar un estado breve sin tarjetas ni paginación vacías.

### Resultados: responder preguntas del negocio

Mensual y semanal comparten estructura visual, manteniendo la distinción entre consulta actual e informe semanal guardado.

Orden mensual:

1. Título, mes y herramientas de informe en una barra coherente.
2. Ventas netas, cantidad de ventas, ticket promedio y margen bruto conocido, cada cifra una vez. El margen se omite si la función está desactivada y aclara cobertura parcial cuando corresponde.
3. Evolución diaria ocupando el ancho útil. Comparación del mismo período junto a la métrica correspondiente. El mes del encabezado gobierna el informe; el explorador Hoy/Semana/Rango se abre como vista separada claramente titulada para evitar mezclar períodos.
4. Medios de pago compactos y cinco productos destacados. Importes y porcentajes alineados; rankings con acceso a detalle.
5. Excepciones útiles: hasta cinco prioridades de reposición y anulaciones. Descuentos en el detalle de ventas; tarjeta se consulta dentro de medios de pago, sin repetición al final.
6. Acceso secundario al inventario por ubicación. Los depósitos muestran existencias y traslados en Ubicaciones; no aparecen como negocios con facturación independiente.

Rentabilidad detalla costo conocido, cobertura y composición sin duplicar el importe principal. Mantener la aclaración puntual de que margen bruto no incluye gastos, impuestos ni comisiones.

Gráfico con dominio temporal explícito: días transcurridos o mes completo con días futuros diferenciados. Distinguir día sin ventas de dato ausente. Ejes y valores legibles, tooltip accesible por foco y alternativa tabular. Animación breve al cambiar período; no reiniciarla al mover el cursor ni al refrescar datos en segundo plano.

Semanal usa fechas como «28 sept – 4 oct». La versión y fecha de generación aparecen en contexto secundario. Recalcular conservando versión es una acción secundaria diferenciada de Excel/PDF.

### Stock y controles

Conteos: ubicación y categoría, botón alineado «Iniciar conteo» y borradores separados debajo. Durante el conteo: producto, existencia registrada, cantidad contada y diferencia clara. Revisión final antes de aplicar ajustes. No paginar un vacío ni comprimir el formulario en una fila ilegible.

Existencias y reposición comparten filtros, densidad de tabla, selección, exportación y paginación. Los listados extensos permanecen en su módulo; Inicio y Resultados presentan una selección acotada.

### Ubicaciones

Selector compacto de ubicación y dos áreas distinguibles: Existencias y Traslados. Evitar apilar dos listados extensos en una sola pantalla.

Nuevo traslado: origen → destino, selector de producto con stock disponible en origen, cantidad y resumen. El stock consultado debe indicar si está cargando o no disponible. Verificar cantidades al confirmar con el servidor; la interfaz no garantiza disponibilidad por sí sola. Historial con filtros de estado y fechas, filas claras y paginación fuera del área que puede cubrir productos.

### Compras y proveedores

La recepción mantiene proveedor, productos y total juntos. Escaneo y búsqueda tienen espacios y estados definidos; el lector conserva su flujo rápido. El total usa la misma tipografía del resto del sistema y permanece visible en escritorio. En móvil, resumen compacto sin tapar campos ni teclado.

Proveedores se ubica dentro de Compras, accesible mediante pestaña y enlaces contextuales. El directorio muestra nombre, contacto y saldo donde corresponda; detalles y cuenta se abren bajo demanda. Exportar se ofrece en directorio/historial, no como protagonista de un formulario vacío.

### Resto del producto

- Productos: tabla y filtros compartidos; formulario básico primero y opciones adicionales progresivas.
- Clientes: selección desde carrito, estado de cuenta y cobro coherentes; preservar venta fiada y permisos.
- Promociones: vigencia, alcance y estado reconocibles; detalle y edición progresivos.
- Ventas/turnos/usuarios: encabezados, filtros, estados, detalle y exportación uniformes.
- Configuración: navegación por tema, formularios de ancho legible y dependencias de funciones explicadas solo al cambiar una opción afectada.
- Acceso, recuperación, notificaciones, ayuda y diálogos: mismos tokens y estados, sin rediseñar los mecanismos de seguridad.

## Excel y filtros

En listados, botón «Excel» siempre en el extremo de herramientas de la barra, junto a filtros y vistas guardadas. El diálogo hereda búsqueda, multiselección de categorías/estados/marcas, ubicación, orden y período aplicables. Permite revisarlos antes de descargar. Exporta todas las coincidencias, no únicamente la página visible, y conserva alcance de permisos y límites existentes.

En Resultados, un acceso «Exportar» permite elegir informe completo o sección y formato. El alcance elegido se muestra explícito. Las descargas por sección siguen disponibles desde su menú de herramientas, evitando una colección de botones dorados. No retirar capacidades de exportación existentes.

## Interacciones, móviles y accesibilidad

- Picker único reutilizable: nombre/código coherente, teclado arriba/abajo/Enter/Escape, selección inequívoca, respuestas antiguas descartadas y foco devuelto. Verificar antes qué fallos siguen presentes.
- El lector no roba texto a campos, buscadores o diálogos. Escanear/agregar/cobrar no espera una animación.
- Hover/press 120–160 ms; paneles y diálogos 160–220 ms. Respetar movimiento reducido. No animar contadores monetarios en cada actualización.
- Estados vacío/cargando/error/guardando/completado y sin permiso diseñados, con recuperación posible y sin éxito simulado.
- Foco visible; estados con texto además de color; contraste mínimo 4,5:1 para texto normal y 3:1 para controles relevantes/texto grande.
- Validar 390, 768, 1024, 1440 y 1920 px, y zoom 200%. Sin overflow horizontal del documento ni importes cortados. Tablas anchas pueden desplazarse dentro de su región.

## Límites

Trabajar en la versión local de GestionProductos. No modificar MareaMac, la base de simulación, documentos comerciales ni reglas de negocio para favorecer una captura. No agregar frameworks de UI o gráficos sin una necesidad demostrada. Preservar el CSS de impresión y los comprobantes históricos. La propuesta requiere ejecución y verificación posterior; este documento no acredita pruebas nuevas.
