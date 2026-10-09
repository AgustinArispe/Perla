# 024 — Consulta del dashboard con historial real

## Objetivo

Consultar meses anteriores y el detalle de cada día sin mezclar períodos ni depender de un tooltip que no funciona al tocar la pantalla.

## Alcance

- Navegación al mes anterior, siguiente y actual, con límite en el mes vigente del negocio.
- La comparación «Mes» utiliza el mismo informe mensual seleccionado, incluyendo sus fechas y período anterior. Hoy, Semana y Rango mantienen sus consultas independientes.
- Selección de un día por mouse, teclado o tacto para ver ventas, importe neto y ticket promedio.
- Al cambiar de mes se limpia la selección del día y vuelve a la comparación mensual.
- Controles de gráfico alcanzables en celular y desplazamiento interno sin desbordar la página.
- Menos encabezados y datos repetidos; identidad vigente de Perla Negra.

## Aceptación

- Elegir un mes histórico sin ventas muestra cero tanto en el resumen como en la comparación mensual, aunque haya ventas actuales.
- La navegación resuelve correctamente diciembre/enero y no avanza desde el mes actual.
- Enter selecciona una barra; su detalle muestra los importes del informe.
- Pantalla de 390 px sin desbordamiento horizontal global y días con blancos táctiles de al menos 44 px.
- La simulación de cuatro meses permanece disponible mientras se ejecutan pruebas en una base temporal y puerto independiente.
