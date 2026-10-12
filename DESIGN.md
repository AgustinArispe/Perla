# Perla Negra · identidad visual

## Dirección vigente — 12 de octubre de 2026

Las cabeceras presentan primero el título y las acciones, luego las pestañas del módulo. `PageHeading` comparte este orden mediante el contexto del workspace y solo inserta pestañas junto a un h1; los encabezados internos no las repiten. La tipografía operativa sigue siendo Manrope, con cifras tabulares. Las decisiones siguientes prevalecen sobre las referencias históricas de este documento.

Resultados usa cuatro indicadores compactos, gráfico diario con escala y eje cero, comparación opcional del mes anterior y detalle accesible por teclado. Los meses conservan sus fechas reales, incluso cuando tienen distinta duración. La dona representa Top 5 + Otros del universo completo por facturación neta; cuando hay movimientos negativos se muestran importes con signo en lugar de sectores. Los medios de pago muestran pagos netos y reembolsos, separados de cobros de deuda. Excel y el informe imprimible usan el mismo alcance.

Los listados agrupan filtros y acciones secundarias; Productos conserva selección entre búsquedas y páginas. Stock distingue cero, sin conteo y sin control; Reponer ofrece calendario accionable y resumen de selección. Caja mantiene el lector como entrada principal y el total estable. Cuentas explican la dirección de sus saldos; Turnos destaca diferencias; Promociones explica regla, alcance y vigencia. Inicio contextualiza los días sin actividad y el ingreso permite mostrar la contraseña.

Las capas `results.css`, `merchandise.css`, `commerce.css` y `admin.css` están acotadas a sus áreas. El navy conserva navegación y cifras principales; latón identifica acciones y selección. Se mantienen permisos, atajos, borradores, informes guardados y preferencias del menú.

## Inicio operativo — 10 de octubre de 2026

El inicio combina un resumen de ventas de hoy y semana, pendientes desplegables, cajas y saldos abiertos. Navy destaca el resultado, latón las acciones y cantidades que requieren atención; el resto conserva superficies claras y aire. Los datos principales se ven sin desplegar listas; el detalle se consulta al pedirlo. Las métricas respetan permisos y módulos habilitados, explican su período y no mezclan saldos actuales con ventas. En móvil las columnas se apilan y los importes pueden ocupar más de una línea.

## Marca del producto Perla — 9 de octubre de 2026

Perla es el nombre elegido para el software; Perla Negra identifica al comercio. La [documentación de marca](docs/documentacion/01-producto-y-alcance.md#9-perla-nombre-identidad-y-significado-de-marca) recoge el significado del nombre y del símbolo, la paleta y la historia: «Cada negocio tiene algo valioso. Perla te ayuda a cuidarlo, ordenarlo y hacerlo crecer».

La [propuesta gráfica v9](output/branding/perla-logo-grafico-v9.png) combina una cinta marina abierta con una perla dorada y lettering futurista. Las letras fueron generadas dentro de la imagen: no corresponden a una fuente identificada ni a Manrope o Cinzel. Se incorpora en el ingreso como marca completa. En navegación y reporte mensual, el símbolo tiene una adaptación vectorial completa, sin recorte ni recuadro: marfil y latón sobre el menú oscuro, tinta y latón sobre superficies claras. Perla identifica el producto; Perla Negra identifica el comercio, incluso en los comprobantes. El favicon traduce la forma y los colores del símbolo a un formato vectorial pequeño. En pantalla se conserva Manrope para los textos operativos, sin intentar recrear el lettering original con una tipografía diferente.

## Dirección vigente — 1 de octubre de 2026

### Revisión operativa — 7 de octubre de 2026

El lienzo operativo pasa a #F5F4F0 y las superficies a blanco. La acción principal usa latón oscuro #795824 con texto blanco; el oro identifica marca y las selecciones usan un fondo latón suave #F5ECDC. El navy conserva navegación y totales. Verde, rojo y ámbar comunican estados, siempre acompañados por texto. Los números de operación usan Manrope tabular, sin tipografía ornamental. Los controles comparten foco visible, altura y variantes; los diálogos usan tallas compacta, regular y amplia según la tarea.

La navegación se organiza en Trabajo diario, Mercadería, Negocio y Administración. Ayuda queda al pie; sesión y contraseña se agrupan en Mi cuenta. Productos, Stock, Compras, Turnos y Resultados tienen áreas internas, sin duplicar encabezados dentro de cada vista.

Resultados presenta vendido neto, ventas, ticket promedio y margen conocido cuando corresponde. Comparación mensual junto al resultado, exploración de otros períodos opcional; detalle de margen y desglose cerrados inicialmente. Medios de pago y cinco productos principales son legibles; existencias actuales se consultan aparte del informe histórico. Excel hereda los filtros, exporta todas las coincidencias y permite ajustar selecciones múltiples bajo demanda.

Los formularios muestran primero lo imprescindible. Crear categoría o marca no descarta el producto; contar stock muestra existencia y diferencia; un traslado consulta disponibilidad del origen. Los selectores bloquean resultados todavía cargando, admiten teclado y conservan un destino de foco tras elegir.

La marca correcta es **Perla Negra**, pescados y mariscos. El original se conserva en `src/renderer/assets/perla-negra-logo.png`. El rediseño web vive en `src/renderer/assets/perla-negra-symbol.png`: barco de velas simplificadas, ola y perla, en marfil con transparencia. Se utiliza completo, sin recortar ni ampliar, en ingreso, navegación y reportes. El nombre se compone como texto para conservar nitidez. Cinzel 600 se reserva al nombre de marca y Manrope a la operación.

Azul tinta #152B36 en navegación, azul mar #223C49 en totales, marfil #F2EFE8 en lienzo, blanco cálido #FFFEFA en superficies, latón #795824 en acciones y oro #E6C68B sobre azul. El símbolo marfil se integra directamente sobre la navegación oscura, sin recuadro. Verde solo para estados positivos. La marca aparece en ingreso, sidebar y reportes; el vocabulario operativo sigue siendo directo y propio de pescados y mariscos.

La capa de marca es perla.css. En móvil el contenido ocupa todo el ancho y el menú se superpone. No mover paneles informativos en hover. Respuesta de botones de 100–140 ms y confirmación de venta de 220 ms, respetando movimiento reducido. El dashboard resalta el mejor día con datos reales y las cifras largas nunca se recortan.

Migración 012: actualiza solo los nombres anteriores por defecto a Perla Negra. Los nombres personalizados y los comprobantes históricos se conservan. Los identificadores técnicos antiguos de archivos y datos permanecen para conservar compatibilidad.

## Referencia histórica de PULSE

La tipografía operativa vigente se centraliza en `src/renderer/styles/typography.css`: Manrope 500 para lectura y campos, 600 para acciones y etiquetas, 700 para títulos y énfasis. Navegación, contenido y diálogos comparten la familia. Los importes conservan numerales tabulares y los códigos conservan su tratamiento técnico.

### Secciones del menú lateral

Trabajo diario, Mercadería, Negocio y Administración tienen encabezados desplegables independientes. El encabezado completo es un botón con flecha, foco visible y `aria-expanded`. Cada usuario conserva sus preferencias en este navegador. Si se cierra el grupo activo, el encabezado muestra el nombre de la pantalla en dorado. Navegar desde otro circuito conserva el estado elegido: sólo tocar el encabezado abre o cierra el grupo. El modo compacto muestra únicamente los cuatro iconos de sección, con superficies navy y detalles dorados. Tocar un icono expande el sidebar y abre esa sección; las demás conservan su preferencia. El menú móvil conserva los mismos grupos.

La primera versión usó PULSE como base: precisa, luminosa y profesional, con energía contenida. Este registro explica decisiones heredadas; la dirección vigente es la identidad Perla Negra definida arriba.

Manrope 400–700. Títulos de página de 32 px sin tarjeta contenedora ni subtítulo redundante. Cifras, precios y cantidades usan numerales tabulares. El texto evita negro absoluto y mantiene alta legibilidad bajo luz de día.

La geometría sigue radios de 8 px en controles, 12 px en superficies y 14 px en diálogos y métricas. Un borde azul frío define cada objeto; las sombras son cortas y discretas. El lienzo, los blancos y el navy dominan la pantalla. El verde sólido aparece en la acción principal de cada zona y en indicadores pequeños, no como fondo decorativo general.

La sidebar blanca tiene filas de 44 px, iconos Coolicons y estado activo azul pálido con un punto verde. Colapsada conserva icono e indicador. En móvil funciona como drawer sobre scrim navy y deja el contenido sin desbordamiento horizontal.

Campos y botones miden 44 px. El foco combina borde navy y halo suave. Las tablas usan headers azul pálido, filas blancas y separación fría. Las superficies interactivas se elevan 1 px en hover; las acciones de escáner y teclado responden sin animación visible. `prefers-reduced-motion` reduce toda transición al mínimo.

La Caja prioriza escáner, carrito y total. El escáner conserva un foco muy visible y el panel de cobro usa el acento verde. Productos, stock, histórico y administración comparten la misma barra de herramientas, densidad y lenguaje de estados. Los formularios muestran primero lo indispensable y dejan opciones avanzadas detrás de una expansión clara.

El Resumen mensual usa número grande, etiqueta clara y contexto breve. Gráficos navy, verdes y semánticos mantienen siempre una lectura textual. Los reportes impresos traducen la misma jerarquía a fondo blanco.

Los diálogos preservan la página de origen bajo un scrim navy. Tienen header y acciones alcanzables, cierre explícito, Escape, foco protegido y retorno al disparador. En móvil respetan márgenes de 8–16 px y scroll interno.

La referencia reutilizable vive en la skill personal `pulse-visual-language`; marca, vocabulario y flujos pertenecen a Perla Negra y no se copian del CRM fuente.
