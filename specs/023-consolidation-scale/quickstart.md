# Recorrido de prueba

1. Activar Ubicaciones y crear dos locales.
2. Asignar una terminal a cada local.
3. Registrar ventas y existencias diferentes.
4. Abrir Resumen mensual como jefe.
5. Revisar «Locales y depósitos»: vendido, operaciones, ticket, stock bajo y mercadería en tránsito por ubicación.
6. Verificar que vendedor y supervisor no reciban el consolidado.

## Evidencia técnica

- Consulta con cinco ubicaciones, 4.000 productos y 20.000 saldos locales: p95 de 16,97 ms en la verificación del 5 de octubre de 2026.
- Venta web manipulada con otra ubicación: el servidor ignoró ese dato y usó la ubicación asignada a la terminal.
- Suite completa: 61 archivos y 203 pruebas; compilaciones de escritorio, web y API correctas.
- Recorridos web reales: 5 de 5 correctos.
