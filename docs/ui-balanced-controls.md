# Proporciones y acento · 7 de octubre de 2026

## Cambios

- Cobro: cliente y alta en una fila; cuenta corriente a todo el ancho.
- Medios de pago: columnas iguales según la cantidad habilitada, sin una columna vacía.
- Pagos divididos: importes de igual ancho y acción Quitar al pie de los campos.
- Celular: controles apilados, medios en dos columnas y última opción impar de ancho completo.
- Filtros: acciones de 44 px alineadas al pie de los campos. Conteos, vencimientos y diferencias usan la barra compartida.
- Acciones principales en latón oscuro; selección y hover con latón suave. Navegación y totales mantienen navy.
- Contraste blanco/latón: 6,49:1. Foco visible sin desplazar controles.

## Verificación

Se comprueban dimensiones de medios de pago, alineación de cliente/alta, proporciones de pagos divididos y altura/alineación del inicio de conteo. El circuito conserva alta, venta a cuenta, cobros parciales y uso móvil. Regresión de búsquedas, filtros de Excel y alta de categorías/marcas.

Capturas: output/ui-ux-implementation/2026-10-07/payment-balanced-desktop.png, payment-balanced-mobile.png y stock-controls-balanced.png.
Resultado: seis circuitos web distintos aprobados (cinco en la pasada final y el circuito de controles en una confirmación independiente). Typecheck, lint y compilación web aprobados. Detector mecánico sin hallazgos.
