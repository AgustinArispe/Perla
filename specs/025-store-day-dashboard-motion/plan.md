# Plan

Usar Playwright contra la API y el worker reales, con una base temporal por grupo de escenarios. Configurar productos, promoción y cuentas desde el jefe; efectuar apertura, escaneo, peso, cobro y cierre desde los navegadores de ambos cajeros. Perder la respuesta de una confirmación ya guardada y recuperar por la clave original. Contrastar saldos, stock y reporte con el resultado calculado antes de ejecutar la prueba.

El cierre usa el saldo consultado para mostrar una diferencia provisional, sin reemplazar la validación transaccional de la API. El dashboard utiliza CSS para las barras y Web Animations API para la transición de texto. No requiere otra dependencia. Cancelar animaciones al cambiar los valores, desmontar o activar movimiento reducido.

Comprobar tipos, lint, suite web completa, geometría de celular, movimiento reducido y errores del navegador. Mantener la simulación local de cuatro meses durante las pruebas.
