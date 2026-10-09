# Validación: Costos y rentabilidad

## Uso

1. Activar **Costos y rentabilidad** desde Configuración > Funciones.
2. Para productos sin control de stock, cargar el costo de referencia desde Productos.
3. Para productos con stock, recibir una compra: el sistema calcula el promedio automáticamente.
4. Las ventas nuevas guardan el costo vigente de cada renglón.
5. Jefe y administrador ven margen bruto y cobertura en Resumen mensual; supervisores ven costos en el detalle de una venta; vendedores no reciben esos datos.

## Reglas visibles

- «Sin costo» significa que el sistema no dispone de un valor confiable; nunca se interpreta como costo cero.
- «Cobertura parcial» identifica qué parte de la venta neta tiene costo conocido.
- El margen mostrado es bruto: todavía no descuenta gastos, impuestos ni comisiones.
- Una compra posterior no modifica el costo histórico de una venta cerrada.

## Evidencia de cierre — 2026-10-02

- `npm run check`: TypeScript, lint, 45 archivos y 162 pruebas, escritorio, web y API aprobados.
- `npm run test:web`: 3 recorridos reales en navegador aprobados, incluidos roles, venta y compra/costo.
- Backup cifrado verificado con restauración explícita de estado, evento y fotografía de costo.
- Base local revisada en versión 13: las migraciones 14 y 15 están pendientes y se aplican en orden al próximo inicio.
- `git diff --check`: sin errores de espacios; sólo avisos esperados de fin de línea en Windows.

## Observaciones de compilación

Vite informa un aviso no bloqueante por el tamaño del paquete web y dos anotaciones internas de Zod. No afectan el funcionamiento; la división del paquete queda como optimización posterior.
