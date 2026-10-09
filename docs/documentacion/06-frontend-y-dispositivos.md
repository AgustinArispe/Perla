# 06. Frontend, UX, escáner e impresión

[Volver al índice](README.md)

## 1. Estructura de la interfaz

El renderer React organiza las pantallas en `src/renderer/features`. `App.tsx` coordina sesión, funciones habilitadas y vista actual. `navigation.ts` define grupos y pestañas. Los componentes compartidos reúnen diálogos, iconos, herramientas de filtros, exportación y patrones de navegación.

La navegación agrupa trabajo diario, mercadería, negocio y administración. Proveedores se integra a Compras; los controles de existencias, reposición, conteos y vencimientos se agrupan en Stock; los resúmenes se agrupan en Resultados. Ayuda permanece en la zona inferior y la cuenta del usuario tiene su acceso propio. Esta organización intenta que el menú refleje tareas del comercio y no los nombres de tablas de la base.

El filtrado visual por permisos mejora la experiencia, pero no constituye seguridad. El backend vuelve a validar cada acción aunque alguien llame una ruta sin utilizar el menú.

## 2. Sistema visual actual

La marca visible es Perla Negra. La identidad combina azul profundo, superficies claras y acento latón/marrón. El texto operativo usa Manrope; Cinzel queda asociado a identidad de marca, para no dificultar lectura de tablas o importes. Los iconos y la embarcación son recursos de presentación, no indicadores de estado por sí solos.

Tokens comprobados en las capas actuales:

| Token | Valor | Uso previsto |
|---|---|---|
| `--canvas` | `#f5f4f0` | Fondo general |
| `--surface` | `#ffffff` | Superficies principales |
| `--surface-subtle` | `#f1f3f4` | Agrupación suave |
| `--ink` | `#17313d` | Texto principal |
| `--ink-soft` | `#586872` | Texto secundario |
| `--line` | `#d9dfe2` | Separaciones |
| `--navy-dark` | `#152b36` | Identidad y zonas de alto contraste |
| `--brass` | `#b38b47` | Detalles de marca |
| `--accent-action` | `#795824` | Acción primaria |
| `--accent-hover` | `#66491d` | Estado hover de acción |
| `--accent-soft` | `#f5ecdc` | Selección o apoyo de acento |
| `--accent-line` | `#d4b57c` | Borde de acento |

Los estilos se superponen entre tokens, PULSE, Perla y ajustes operativos. Por eso un valor encontrado en una hoja anterior puede quedar sobrescrito. Para modificar el producto hay que revisar el estilo calculado y el orden de importación, no agregar otra excepción al final sin entender el selector.

## 3. Criterios de uso

La interfaz busca una acción principal reconocible, campos alineados y espacios que separen decisiones. Un panel no necesita llenar todo el alto con leyendas. Los detalles secundarios pueden revelarse al abrir una fila, desplegar un bloque o pedir una exportación. El blanco ayuda cuando distingue tareas; un hueco accidental entre controles relacionados, en cambio, perjudica la lectura.

Los botones deberían compartir altura y alineación dentro de una misma fila. En cobro, cliente, medios y pagos parciales deben conservar proporciones legibles. El acento identifica selección y acción relevante, mientras rojo/verde se reservan para significados de error, resultado o estado. No se debe utilizar color como único portador de una diferencia crítica.

Estas pautas explican la intención y las capas existentes. No equivalen a afirmar que toda pantalla y todo tamaño haya pasado una auditoría visual completa en esta entrega documental.

## 4. Estado y consultas

TanStack React Query ayuda a consultar, cachear e invalidar datos del servidor. Cada módulo decide qué datos deben actualizarse luego de una mutación. Una venta afecta más que el carrito: existencias, turno, resultados y cuenta del cliente pueden necesitar una nueva consulta.

Caja utiliza `CheckoutController` y una suscripción explícita, desacoplando el flujo de interacción del ciclo de render. Sus estados actuales son `LOADING`, `SCAN`, `RECOVER`, `SEARCH`, `DISCOUNT`, `WEIGHT`, `EDIT`, `PAYMENT`, `CANCEL`, `BUSY`, `UNCERTAIN` y `ERROR`. El estado distingue carga, captura, diálogos, confirmación y resultado desconocido.

`UNCERTAIN` es especialmente importante: una operación puede haberse guardado aunque no se reciba respuesta. Reducir ese estado a “error, vuelva a cobrar” podría duplicar ventas. La UI ofrece recuperación consultando la operación pendiente.

## 5. Escritura de borradores

`DraftWriter` ordena las escrituras del borrador y expone si hay cambios sin guardar y un error de guardado. Los controladores de compras tienen mecanismos equivalentes. El objetivo es que varias ediciones rápidas no terminen guardando un estado anterior después del más reciente.

El checkout guarda información de recuperación con una clave local que incorpora el usuario (`bocha.checkout.pending.v1.<userId>`). Eso reduce cruces entre usuarios, pero sigue siendo almacenamiento del navegador de ese equipo. No debe utilizarse para secretos ni considerarse respaldo centralizado.

Al desarrollar un cambio, hay que probar desmontaje del componente, sesión vencida y respuestas tardías. El controlador utiliza generaciones de carga/cotización y banderas de disposición para descartar resultados que dejaron de corresponder al contexto actual.

## 6. Búsqueda y selección

Los selectores de producto y cliente deben distinguir texto escrito de selección confirmada. Si se cambia el texto después de elegir un registro, no es correcto seguir enviando invisiblemente el ID anterior. Las respuestas asíncronas también deben asociarse a la búsqueda que las originó para no mostrar resultados viejos sobre una consulta nueva.

Las pruebas de interacción existentes incluyen buscadores y circuitos de compras/clientes. Al modificar los componentes hay que revisar teclado, click, blur, foco, resultados vacíos y navegación móvil. Una respuesta correcta de la API no prueba que el usuario haya seleccionado el registro correcto.

## 7. Diálogos y foco

`Dialog` usa el elemento nativo `dialog` con `showModal()`, título accesible mediante `aria-labelledby`, botón de cierre y tamaños compact, regular y wide. Al abrir elige un foco explícito `data-dialog-focus` o el primer campo habilitado. Al desmontar devuelve el foco al elemento de origen si sigue en el documento.

Cuando está ocupado, bloquea el cierre por cancelación y deshabilita el botón. El uso de `Escape`, teclas de pago y Enter se decide en cada contexto; un Enter enviado por el scanner no debe actuar accidentalmente como confirmación monetaria.

Los diálogos largos necesitan desplazamiento del contenido y acciones alcanzables en pantallas bajas. El encabezado, el total y los botones no deben tapar campos o importes al hacer scroll. Los ajustes visuales recientes se concentraron en esas proporciones, especialmente cobro y pago dividido.

## 8. Cola de escaneo

`ScanQueue` procesa lecturas en orden. Cada lectura legítima repetida representa una intención de agregar un artículo, por lo que no se deben eliminar códigos repetidos sólo por llegar rápido. Si un producto requiere peso, se pausa la resolución hasta completar o cancelar esa porción.

El checkout dispone de caché breve de códigos: 2 segundos y hasta 256 entradas. Esto reduce búsquedas repetidas al escanear varias unidades rápidamente. El servidor vuelve a validar la versión al confirmar, por lo que la caché no es autoridad sobre el precio final.

El foco se administra según el estado. No hay motivo para robarlo continuamente a otro input con un temporizador: eso haría imposible editar un importe o un cliente. `scanner-focus` y las condiciones de captura evitan interferencias cuando se trabaja en otro campo.

## 9. Atajos operativos

| Tecla | Uso en el contexto habilitado |
|---|---|
| F2 | Volver al campo de escaneo |
| F3 | Abrir búsqueda de producto |
| F4 | Descuento manual |
| F6 | Buscar producto por kilo |
| F8 | Iniciar cobro; la confirmación depende del contexto del diálogo |
| Enter | Enviar el código del lector o aceptar un dato según el campo; no debe equivaler a venta automática |
| Escape | Cerrar o volver cuando no hay una operación ocupada que lo impida |

Los atajos sólo se disparan cuando la condición de captura y el modo permiten hacerlo. Una notebook puede requerir la tecla Fn para enviar F2–F8; eso depende de su configuración, no de la aplicación.

## 10. Preparación del lector físico

El modo previsto es USB HID Keyboard/Keyboard Wedge. Debe enviar el código completo y un Enter final. Conservar ceros iniciales y dígito de control. Evitar prefijos, Tab o cambios automáticos de simbología no acordados.

Procedimiento de aceptación:

1. Probar en un editor simple que cada escaneo produzca una línea completa.
2. Comparar varios códigos con el texto del envase.
3. En Caja, escanear un producto y comprobar artículo y precio.
4. Repetirlo varias veces y verificar la cantidad exacta.
5. Intercalar un producto por kilo y revisar que la cola espere la porción.
6. Probar código inexistente, producto inactivo y falta de stock.
7. Abrir cobro y escanear por error: verificar que no se confirme una venta inesperada.
8. Desconectar y reconectar; comprobar foco y continuidad.

La aplicación no puede certificar genéricamente “scanner conectado” sólo porque recibe teclas. Un teclado normal y un scanner HID pueden enviar la misma secuencia. El equipo físico debe probarse antes de afirmar compatibilidad de una marca/modelo.

## 11. Identificadores internos y etiquetas

El generador interno compone prefijo `200`, secuencia de nueve dígitos y dígito de control EAN-13. El cálculo alterna pesos 1 y 3 sobre los doce dígitos base. La secuencia se controla para evitar colisiones y la etiqueta utiliza el identificador persistido.

Este formato sirve como identificación interna. No afirma asignación global por GS1 y no contiene automáticamente el peso o precio. Tampoco hay un parser universal activado para cualquier etiqueta de balanza. Si un proveedor imprime un código con peso embebido, deben definirse y validar posiciones, escala, checksum y producto antes de integrarlo.

## 12. Impresión de comprobantes

`ReceiptService` crea una instantánea titulada explícitamente **COMPROBANTE DE VENTA — NO FISCAL** a partir de una venta completada. El documento conserva marca, detalle y formato. Los formatos son `THERMAL_58`, `THERMAL_80` y `A4`.

`ReceiptPrint` invoca `window.print()` y luego, si estaba pendiente, llama a `markPrinted`. Este comportamiento no recibe un acuse físico de la impresora. Incluso si el diálogo se cancela, el retorno de la función no necesariamente lo distingue. El estado debe entenderse como el registro que maneja la aplicación, y esta limitación debe tenerse presente al verificar una cola de impresión.

La salida depende del tamaño de papel, márgenes, escala y driver configurados. No se identificó una implementación de comandos ESC/POS directa que controle corte, cajón portamonedas o consulta de estado en todas las plataformas. La tabla de perfiles y el modo AUTO no deben convertirse en una promesa de ese hardware sin un circuito probado.

## 13. PDF y reportes

Los reportes tienen una composición HTML para impresión y guardado a PDF mediante el entorno. Esto permite encabezados, colores y tablas coherentes con la marca. El PDF resultante depende del motor de impresión y sus ajustes. No equivale a un servidor que archive automáticamente todos los PDF emitidos ni a una firma digital.

Al verificar un reporte impreso hay que mirar cortes de página, encabezados repetidos, totales, orientación, legibilidad de colores y ocultamiento de botones. Una captura de la pantalla no valida el documento paginado.

## 14. Responsive y accesibilidad

La web contempla navegación y formularios adaptados a celular. La prioridad móvil es alcanzar acciones y leer importes sin zoom obligatorio. Las tablas extensas pueden requerir desplazamiento interno o un detalle por registro; reducir todas las fuentes para hacerlas entrar no es una solución general.

Hay elementos semánticos, etiquetas, foco y estados accesibles, pero esta documentación no certifica cumplimiento integral de WCAG. Las pruebas deben abarcar teclado, lector de pantalla cuando sea necesario, contraste real de estados, tamaño táctil y preferencia de movimiento reducido. Las animaciones de indicadores no deben ocultar el valor definitivo ni bloquear una tarea frecuente.
