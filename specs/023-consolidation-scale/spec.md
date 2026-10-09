# 023 — Consolidación y escalabilidad

## Objetivo

Dar a la dueña una vista consolidada y comparable de todos sus locales, manteniendo aislado el stock operativo de cada ubicación y midiendo el rendimiento antes de cambiar la arquitectura.

## Alcance

- Resumen mensual por ubicación con ventas netas, cantidad de ventas, ticket promedio, productos bajo mínimo y mercadería en tránsito.
- Total consolidado calculado desde las mismas operaciones confirmadas.
- Acceso al resumen únicamente para jefe y administrador.
- Las ventas quedan ligadas a la ubicación confiable de la terminal.
- Índices específicos para consultas por ubicación, fecha y saldos.
- Pruebas con 4.000 productos y varias ubicaciones para Caja, consolidación y aislamiento.

## Fuera de alcance

- Varias empresas dentro de la misma base.
- Varias instancias de API escribiendo al mismo archivo SQLite.
- Replicación entre servidores o funcionamiento offline entre sucursales.

## Aceptación

- Una venta de una terminal descuenta únicamente su ubicación.
- El consolidado coincide con la suma exacta de cada ubicación.
- Supervisor y vendedor no pueden consultar indicadores consolidados.
- Las consultas medidas quedan dentro de límites explícitos con 4.000 productos.
