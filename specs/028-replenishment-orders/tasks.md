# Tareas — Reposición sugerida y pedidos a proveedores

Estado: implementado; ver detalles y límites de verificación en docs/control-implementation.md.

- [x] T01 Crear contratos/migración de pedidos y vínculos de recepción, con pruebas de estados y recepción parcial idempotente.
- [x] T02 Implementar cálculo por producto/ubicación y horizonte, distinguiendo sin datos, mínimo, pedidos confirmados y tránsito.
- [x] T03 Probar objetivo/disponible/pedidos con unidades, kilos, devoluciones, inactivos, lotes bloqueados y doble conteo.
- [x] T04 Integrar Preparar compra por proveedor con explicación breve y cantidades editables; agregar exportación.
- [x] T05 Conectar pedido a recepción existente y revalidar saldo ante cambios concurrentes.
- [ ] T06 Medir sugerencias sobre la base de 4.000 artículos mientras se confirman ventas; documentar tiempos y corregir contención.

Medición local: 4.000 productos y 13.813 ventas, 35,7–45,9 ms por consulta. T06 conserva pendiente la prueba combinada de carga concurrente sostenida.
