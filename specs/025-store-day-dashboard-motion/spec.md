# 025 — Jornada de caja y movimiento del dashboard

## Objetivo

Verificar el circuito completo de una caja atendida por dos vendedores y supervisada por el jefe. Mejorar el cierre y dar continuidad visual al dashboard sin introducir demoras en la venta.

## Alcance

- Apertura, scanner como teclado, artículo por peso, promoción automática y pago combinado.
- Recuperación cuando el servidor confirma una venta pero se pierde la respuesta.
- Cancelación del carrito, cierre de mañana, apertura de tarde y devolución autorizada por el jefe.
- Conciliación de efectivo, stock e informe; cierre anterior conservado tras operar el siguiente turno.
- Vista previa de faltante, sobrante o ausencia de diferencia al ingresar el efectivo contado. La confirmación espera una consulta válida del saldo; el servidor conserva la decisión definitiva.
- Barras del dashboard con entrada progresiva, cifras con transición breve y detalle diario con respuesta al tacto.
- Valores financieros finales siempre visibles; preferencias de movimiento reducido y selección por teclado sin animación espacial.
- Bases de pruebas separadas para evitar contaminación de saldos y límites de login entre recorridos.

## Aceptación

- Recuperar un cobro incierto produce una sola venta y un solo descuento de stock.
- 3 artículos de $2.000 con 3×2 y 250 g de un artículo de $10.000/kg producen $6.500.
- Apertura de $10.000 y cobro de $3.250 en efectivo generan esperado de $13.250; contar $13.240 registra −$10.
- Segunda apertura de $10.000, cobro de $4.000 y reintegro de $2.000 generan esperado de $12.000.
- Venta neta conjunta: $8.500. Stock final: 16 unidades y 750 gramos.
- Controles y diálogo de cierre funcionan a 390 px sin desbordar la página.
- Movimiento reducido elimina la animación espacial; las cifras mantienen tamaño y lectura.
