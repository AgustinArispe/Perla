# 01. Producto y alcance

[Volver al índice](README.md)

## 1. Qué es Perla Negra POS

Perla Negra POS es un sistema de punto de venta y gestión comercial para un negocio minorista. Reúne la venta de mostrador, el control de mercadería, las compras, las cuentas de clientes y proveedores y la lectura de resultados. Su objetivo es que una operación cotidiana deje información útil sin obligar al operador a mantener planillas paralelas para cada parte del negocio.

La unidad central del programa es la operación comercial: una venta, una recepción de compra, un movimiento de stock, un traslado, un cobro o un cierre de caja. Cada operación puede afectar varios módulos. Una venta confirmada, por ejemplo, conserva sus precios e importes, registra el medio de pago, descuenta existencias cuando corresponde, utiliza el costo conocido para los resultados y puede originar una deuda del cliente o un comprobante para imprimir.

El sistema está pensado para crecer desde una persona que atiende y administra hasta un comercio con empleados, más de una terminal y varias ubicaciones de mercadería. El jefe conserva las capacidades de vendedor y supervisor. No necesita otra cuenta de vendedor para atender su propia caja. Esa acumulación de capacidades no elimina los controles de una operación: también debe seleccionar una terminal válida, abrir su turno y respetar los límites de crédito y estados de inventario.

## 2. Qué problemas organiza

### Venta y atención

Permite identificar productos por búsqueda o código, registrar unidades y porciones por peso, aplicar promociones, cobrar mediante uno o varios medios y recuperar operaciones ante errores de comunicación. Reduce la dependencia de memorizar precios y de calcular manualmente descuentos y vuelto.

### Mercadería y reposición

Distingue la existencia conocida de un producto sin conteo inicial. Registra entradas, salidas, ventas, devoluciones, ajustes y traslados. Los mínimos, el historial de demanda y los pedidos pendientes ayudan a decidir qué comprar o mover entre depósitos. El sistema no puede conocer la mercadería física que nunca se registró; el conteo y la disciplina de carga siguen siendo parte del trabajo.

### Control económico

Relaciona precios, costos, descuentos, cuentas pendientes y ventas. Presenta margen bruto conocido y cobertura de costos para no mostrar como ganancia un importe para el que falta información. Separa una venta a cuenta de su cobro posterior: vender y recibir efectivo no son el mismo hecho.

### Continuidad y trazabilidad

Conserva borradores, identificadores para evitar duplicaciones, revisiones de registros, eventos e historial. Incluye respaldo y restauración. Una corrección importante se expresa mediante un movimiento o reversión, no borrando indiscriminadamente el pasado.

## 3. Conceptos que no deben confundirse

| Concepto | Significado dentro del producto |
|---|---|
| Producto | Identidad del artículo, unidad de venta, precio, clasificación y configuración de seguimiento |
| SKU | Identificador interno del catálogo; puede ser distinto del código de barras |
| Código de barras | Texto que identifica un producto para buscarlo; no contiene necesariamente precio, marca o stock |
| Terminal | Puesto de atención, por ejemplo Caja 1; no es una empresa ni un depósito |
| Turno de caja | Apertura, operaciones y cierre de una terminal con un responsable |
| Ubicación | Lugar donde existe mercadería: salón, depósito, cámara de frío u otro local |
| Lote | Partida identificable de un producto, con existencia y eventual vencimiento |
| Venta | Operación confirmada con líneas, precios, cantidades, descuentos y pagos o saldo a cuenta |
| Borrador | Operación todavía no confirmada; no es una venta ni una compra recibida |
| Compra recibida | Mercadería efectivamente registrada como ingresada, con sus costos y proveedor |
| Pedido de reposición | Necesidad encargada o planificada; puede recibirse parcialmente y no equivale a stock disponible |
| Cuenta corriente | Obligaciones pendientes y sus imputaciones; no es un medio de pago bancario |
| Comprobante | Representación imprimible de una operación del sistema; no presupone autorización fiscal |
| Resumen | Consulta calculada o versión guardada de resultados, según el módulo |

## 4. Plataformas y alcance de esta versión

El repositorio contiene dos caminos de ejecución. La web utiliza un navegador, un servidor Fastify y un hilo worker de Node que accede a SQLite. Electron incluye un renderer React y un puente IPC hacia un worker local. Comparten una parte importante del dominio, contratos y servicios.

La experiencia web concentra la implementación de terminales conectadas, sesión HTTP, exportaciones XLSX y backups del servidor. Electron tiene su propio arranque, almacenamiento y transporte. Compartir interfaz no permite asumir que cada capacidad agregada al servidor está disponible automáticamente en la aplicación local. El inventario técnico identifica esta diferencia para evitar promesas de paridad sin verificar.

El empaquetado de este repositorio está configurado para Windows x64 con NSIS. La preparación de una aplicación Mac se trató como una versión separada. Tampoco hay aquí un sistema de sincronización entre bases locales de varias computadoras: dos cajas web trabajan contra la misma instancia; dos bases independientes no se fusionan solas.

## 5. Mapa general de módulos

| Área | Funciones principales |
|---|---|
| Inicio | Pendientes y acceso a tareas: vender, revisar existencias, vencimientos, diferencias, pagos y precios |
| Caja | Apertura, identificación de productos, carrito, peso, descuentos, cliente, cobro y cierre |
| Ventas | Historial, detalle, anulaciones, devoluciones y comprobantes |
| Productos | Catálogo, categorías, marcas, identificadores, importación, etiquetas y revisión comercial |
| Stock | Existencias, movimientos, mínimos, conteos y vencimientos |
| Compras | Recepción, borradores, historial, proveedores y pedidos de reposición |
| Ubicaciones | Existencias por lugar, asignación de terminales y transferencias |
| Clientes | Datos básicos, disponibilidad de crédito, deuda, cobros y estados |
| Cobros y pagos | Agenda de obligaciones, fechas acordadas, historial y pagos parciales |
| Promociones | Porcentaje, X por Y, precio por cantidad y combos |
| Turnos | Historial de cajas, efectivo esperado, contado y revisión de diferencias |
| Resultados | Resumen mensual, comparaciones, márgenes, rankings y resumen semanal versionado |
| Administración | Negocio, funciones, terminales, usuarios, actividad y copias |
| Ayuda y cuenta | Explicaciones operativas, búsqueda de ayuda y gestión de la sesión |

## 6. Configuración modular

Hay quince funciones configurables: reposición, control de stock, resumen mensual, comprobantes, etiquetas, proveedores y compras, costos y margen, devoluciones, lotes, promociones, notificaciones, cuentas de proveedores, clientes, crédito a clientes y ubicaciones/traslados.

Esto permite reducir la complejidad visible para un comercio que comienza. La configuración no se interpreta como eliminación de datos. Existen dependencias y bloqueos cuando quedan obligaciones o movimientos en curso. Deshabilitar una función tampoco concede permisos a otro rol. Son dos decisiones distintas: qué utiliza el negocio y qué puede hacer la persona que inició sesión.

## 7. Qué no debe venderse como capacidad ya resuelta

No se identificó una integración de facturación fiscal con ARCA/AFIP, emisión de CAE, liquidación tributaria, conexión directa a una balanza, autorización de tarjetas mediante un adquirente, conciliación automática de bancos, catálogo universal por código de barras, tienda online sincronizada ni sincronización offline de múltiples bases. Registrar “Débito” es clasificar un pago recibido por el comercio; no procesa por sí mismo la transacción del posnet.

Tampoco se presenta como contabilidad general de doble partida, cálculo de utilidad final, liquidación de sueldos ni SaaS multiempresa. Las ubicaciones corresponden a mercadería dentro de la instancia. El tratamiento de datos personales, el hospedaje contratado, las obligaciones fiscales y la política comercial del negocio deben definirse al desplegar una instalación real.

## 8. Principio de adopción

La puesta en marcha puede ser gradual: catálogo y caja primero; stock contado después; compras y costos para mejorar márgenes; clientes a cuenta si el comercio fía; ubicaciones y reposición cuando el volumen lo justifica. El diseño modular ayuda a ese proceso, pero cada activación debe acompañarse de datos iniciales fiables y una explicación corta al usuario.

El valor del sistema está en convertir cada acción rutinaria en información consistente. Un tablero vistoso con costos ausentes o stock ficticio no reemplaza una buena carga inicial. Por eso el programa diferencia estados desconocidos, conserva revisiones y ofrece circuitos de conteo y recuperación.

## 9. Perla: nombre, identidad y significado de marca

### Marca del producto y marca del comercio

**Perla** es el nombre elegido para el producto de gestión comercial. **Perla Negra** es la identidad del comercio de pescados y mariscos que utiliza el sistema. Esta definición de marca, trabajada el 9 de octubre de 2026, permite presentar el software a distintos comercios con una identidad propia.

Los capítulos técnicos describen la implementación existente, que todavía utiliza el nombre Perla Negra POS. Documentar la marca Perla no implica que ya se hayan reemplazado nombres, logos, pantallas o identificadores en la aplicación. La disponibilidad comercial del nombre y del dominio sigue sin verificarse.

La presentación propuesta es **«Perla — Gestión para tu comercio»**. Como frase breve de comunicación se propone **«Tu negocio en orden»**.

### Qué significa el nombre

Perla representa lo valioso que hay dentro de cada negocio: el trabajo de sus personas, sus productos, sus clientes y todo lo que construyen día a día. El software ayuda a cuidar ese valor mediante información clara y procesos cotidianos ordenados.

Una perla se forma de a poco, por capas. Como metáfora de marca, ese proceso conecta con un comercio que crece con tiempo, constancia y decisiones cotidianas. El nombre es corto, cercano y fácil de incorporar al lenguaje de trabajo: «cargalo en Perla» o «revisalo en Perla».

La historia de marca acordada se expresa así:

> Cada negocio tiene algo valioso. Perla te ayuda a cuidarlo, ordenarlo y hacerlo crecer.

La sensación que se busca transmitir es: **«Mi negocio está en orden y puedo avanzar con tranquilidad»**. Es una intención de comunicación y experiencia, no una garantía automática de resultados comerciales.

### Qué representa el logo

El símbolo combina una perla con una forma abierta y ondulante inspirada en el mar. Su dirección visual surgió de la búsqueda de ligereza y movimiento suspendido, tomando como referencia expresiva los pliegues del emblema de Qatar 2022. La propuesta de Perla desarrolla una cinta marina abierta y asimétrica, con la perla en su espacio interior.

| Elemento | Significado propuesto |
|---|---|
| Perla central | El negocio y su valor: personas, relaciones, productos y trabajo acumulado. Es el punto de atención que el sistema acompaña. |
| Forma del mar | El movimiento diario de ventas, mercadería, compras y dinero. |
| Curvas abiertas | Libertad, adaptación y capacidad de acompañar distintas etapas del comercio. |
| Perla suspendida | Equilibrio y tranquilidad para manejar la actividad cotidiana con orden. |
| Azul profundo | Serenidad, confianza y estabilidad. |
| Dorado | El valor del negocio y el protagonismo de la perla. |
| Letras de carácter tecnológico | La identidad del producto como herramienta de software contemporánea. |

Estos significados constituyen la narrativa de marca elegida; no se presupone que todas las personas interpreten espontáneamente cada forma o color del mismo modo.

### Paleta y tratamiento visual

La paleta de referencia conserva los colores trabajados en el proyecto:

| Color | Valor de referencia | Uso de marca |
|---|---|---|
| Azul tinta | `#152B36` | Símbolo y nombre; base de la identidad. |
| Azul mar | `#223C49` | Color de apoyo heredado del sistema visual. |
| Dorado latón | `#B38B47` | Perla y acentos que destacan el valor. |
| Marfil | `#F2EFE8` | Interior del pliegue y detalles claros. |
| Blanco | `#FFFFFF` | Fondo principal y espacio alrededor del logo. |

Estos códigos son los valores de diseño indicados durante la generación; el PNG puede contener variaciones tonales y píxeles de suavizado. Para una futura versión vectorial se deberán fijar los rellenos con estos valores.

La dirección más reciente prioriza formas simples y una perla gráfica con un detalle de luz recortado. Se descartó el acabado nacarado realista porque sus brillos y volumen transmitían una estética anterior a la buscada. El objetivo visual es una marca actual, con movimiento libre y pocos elementos.

### Tipografía del logo: qué se utilizó realmente

El nombre **Perla** está dibujado dentro de una imagen generada con la herramienta de generación de imágenes. **No se utilizó ni se identificó una fuente tipográfica comercial o instalada con un nombre concreto.** No existe un archivo de fuente asociado a estas letras ni un alfabeto completo definido por esta exploración.

La dirección tipográfica solicitada fue un lettering de aspecto futurista y profesional: construcción geométrica, trazos de peso medio, curvas suavizadas, proporciones algo extendidas y terminaciones con cortes angulares. La «P» abierta y los recortes de las letras aportan carácter tecnológico; las curvas mantienen relación con el movimiento del símbolo. El texto se presenta como «Perla», con inicial mayúscula.

La versión de letras futuristas recibió la aprobación del autor del producto durante la exploración. Las siguientes iteraciones ajustaron el protagonismo y el acabado de la perla. El último archivo es una propuesta de trabajo; todavía no se registró una aprobación explícita del conjunto definitivo.

Este lettering es distinto de las fuentes de la interfaz existente: **Manrope** se usa en la operación del sistema y **Cinzel 600** se reserva a la identidad de Perla Negra documentada en el diseño actual. Ninguna de las dos debe presentarse como la fuente del nuevo logo Perla.

Para producir una identidad reproducible se deberá vectorizar y ajustar el lettering, revisar espaciado y legibilidad a tamaños pequeños, y conservar el resultado como trazados. Si se desea una familia tipográfica para títulos, web o piezas comerciales, habrá que seleccionarla por separado y comprobar su licencia. La generación de esta imagen no permite atribuir exclusividad tipográfica ni disponibilidad registral.

### Archivos de la exploración

- [Propuesta gráfica más reciente, v9](../../output/branding/perla-logo-grafico-v9.png): perla dorada con detalle claro y lettering futurista.
- [Referencia de tipografía futurista, v7](../../output/branding/perla-logo-futurista-v7.png): versión en la que se aprobó la dirección de las letras.
- [Exploración de perla nacarada, v8](../../output/branding/perla-logo-perla-protagonista-v8.png): antecedente reemplazado por la búsqueda de un acabado más actual.

Los entregables actuales son imágenes PNG. No son archivos vectoriales ni fuentes instalables. Se conservan en `output/branding/`; su incorporación a la aplicación y la preparación de variantes para fondos oscuros, iconos o impresión son trabajos posteriores.
