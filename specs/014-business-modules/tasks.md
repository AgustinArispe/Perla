# Etapa 1 — Funciones configurables

- [x] Definir las cuatro funciones opcionales entregadas y sus operaciones protegidas.
- [x] Guardar el estado por negocio con revisión para evitar cambios simultáneos.
- [x] Aplicar permisos de jefe/administrador y bloquear endpoints directos al pausar una función.
- [x] Conservar el historial de stock y requerir un nuevo conteo luego de reactivarlo.
- [x] Mostrar Funciones del negocio en Configuración y adaptar navegación y etiquetas.
- [x] Cubrir persistencia, permisos, endpoints y flujo de venta con pruebas automatizadas.

## Uso operativo

Al pausar **Control de stock**, se preservan sus movimientos anteriores y las ventas siguen
operando sin descontar existencias. Al reactivarlo, cada producto con seguimiento queda pendiente
de conteo antes de mostrar una existencia actual.
