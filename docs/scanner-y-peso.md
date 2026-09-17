# Scanner USB y productos por peso

Investigación 2026-09-17. Propuesta de implementación; no se probó hardware físico.

## Qué se necesita

- Lector USB que soporte **USB HID Keyboard / Keyboard Wedge**, EAN-13, EAN-8 y
  UPC-A; Code 128 para códigos internos si se usan. Manual del modelo disponible.
- Puerto USB en la PC; cable correspondiente y base si el equipo la requiere.
- Configuración de sufijo **Enter / CR**, sin Tab, sin prefijos ni Code ID.
- Misma disposición de teclado en scanner y Windows; conservar dígito de control
  y ceros iniciales, desactivar conversión UPC a EAN salvo decisión explícita.
- En este modo el scanner envía pulsaciones: no se necesita integrar SDK fabricante
  en la app. Un equipo configurado en COM/CDC/SNAPI sí requiere otro adaptador;
  no confundir modos aunque el conector sea USB.

No elegir marca ni comprar hardware antes de verificar el lector disponible. Un
imager 2D USB HID sirve también para códigos 1D si el fabricante declara soporte;
la lectura de QR no es necesaria para el alcance actual.

## Puesta en marcha

1. Conectar, seleccionar modo USB HID con códigos de configuración del manual.
2. Configurar Enter final, simbologías y layout de teclado.
3. Abrir Bloc de notas y escanear tres productos: un código completo por línea.
4. Comparar el código leído con etiqueta: 0 inicial, dígito final y longitud.
5. En pantalla de diagnóstico, mostrar cadena recibida, longitud y tecla final.
   No afirmar "scanner conectado" por recibir un teclado: HID no distingue
   confiablemente scanner y teclado ni permite verificar la conexión genérica.
6. En Caja, repetir un mismo producto cinco veces: cantidad cinco, sin deduplicar
   lecturas legítimas por velocidad. Probar 100 lecturas a 5/s y desconectar/reconectar.
7. Ajustar demora entre teclas con el manual sólo si la PC pierde caracteres.

## Implementación de Caja

`ScanInput` visible, controlado por ref. `onKeyDown Enter` entrega código a
`ScanQueue`; limpiar entrada al encolar. Procesar en orden; resolver catálogo
desde caché/index UNIQUE; agregar unidad o abrir peso. Código como string, trim
de delimitadores externos, sin Number(). No eliminar ceros ni completar EAN
automáticamente. Un SKU escrito manualmente puede resolverse con búsqueda.

Estados: READY_SCAN, EDITING_QUANTITY, SEARCHING, ENTERING_WEIGHT, PAYMENT,
CONFIRMING, ERROR, RECOVERING. En READY_SCAN: foco inicial, al volver de botón
de carrito, al terminar edición y al cerrar un modal. F2 y Esc vuelven a scan.
En otros estados respetar input enfocado e indicar captura suspendida. Enter
en scanner o en cobro jamás confirma una venta. Finalizar con F8 y una acción de
confirmación explícita separada de Enter; inputs de gramos usan su propio Enter.
Con HID genérico no se puede garantizar que un escaneo hecho por error en ese
input no sea tratado como tecleo: validar rango y enseñar a escanear sólo con
Caja lista. Un código numérico corto podría parecer un peso; captura global con
prefijo o integración de dispositivo requiere otra configuración y prueba.
No un loop que llame focus cada 50 ms.

Mientras se confirma, conservar scans pendientes no aplicados y mostrar aviso;
no cargarlos silenciosamente en la siguiente venta. Si un producto requiere peso,
pausar cola y pedir confirmación del peso antes de continuar. No usar intervalos
entre teclas como única prueba de que "vino de scanner". Para captura global sin
foco, se puede configurar prefijo F9 en un modelo probado y state machine propia;
es alternativa posterior, no requisito inicial.

Un error de código desconocido se anuncia visible y con sonido distinto opcional;
no agrega una línea a precio cero. El beep del lector confirma decodificación,
no confirma que el producto esté en el catálogo. Productos inactivos no se venden.

## Calculadora de fiambres

El producto tiene sale_unit KG y precio por kilo. Elegirlo -> modal con precio/kg,
gramos o kilos explícitos, importe calculado grande y acción Agregar. Default gramos.
Ejemplo $12.000/kg × 250 g = $3.000. Aceptar coma decimal en kilos hasta 3 cifras:
`0,250 kg` -> 250 g. En gramos, sólo enteros positivos. No cambiar automáticamente
la interpretación de `250` a kilos. Cero, negativos y >99.999 g se rechazan.

Stock descuenta gramos. Dos porciones del mismo fiambre quedan como líneas
separadas para poder corregir cada pesaje; mostrarlas 250 g / 180 g. Productos
UNIT repetidos se combinan sólo si tienen mismo producto, precio y revisión.
La calculadora no inventa el peso: inicialmente se lee la balanza y se carga a mano.
Conectar una balanza directamente es otra integración con protocolo específico.

## Etiquetas de balanza

GS1 Argentina documenta códigos restringidos de medida variable en 20..29 y
ejemplos 29 para peso / 27 para precio. Eso NO identifica universalmente posiciones,
decimales ni códigos de producto en cada balanza. La nota consultada es histórica:
usar como contexto y verificar etiquetas reales antes de habilitar un parser.

Diseñar profiles configurables: prefijo, longitud, posiciones PLU/dato, modo
WEIGHT/PRICE, escala decimal y checksum. Sólo activar profile después de probar
al menos 10 etiquetas con peso/importes conocidos. Deshabilitado por defecto.
Formato desconocido abre búsqueda/calculadora. Precio embebido sin peso no debe
inferir stock exacto dividiendo por el precio actual: pedir gramos reales o dejar
ese profile fuera de la entrega. Primero ingreso manual fiable, después etiquetas.

## Fuentes primarias

- [Zebra USB Interface y parámetros](https://docs.zebra.com/us/en/scanners/general/ds4-series/ds4678-prg/c-param-desc-usb-interface.html).
- [Zebra guía: prefijos/sufijos y Enter](https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/guide/product/rs507-prg-en.pdf).
- [Zebra SDK: modos de comunicación](https://techdocs.zebra.com/dcs/scanners/sdk-windows/setup/).
- [GS1 Argentina: medida variable](https://www.gs1.org.ar/boletinesGS1/49/pan3.htm).
