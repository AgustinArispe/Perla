# Perla Negra POS

Sistema de ventas y stock para Perla Negra, pescados y mariscos, con backend web centralizado.
API, base de datos, roles, stock, ventas, cierres y backups cifrados implementados.
[Contrato web, seguridad, despliegue y recuperación](docs/backend-web.md).
Frontend web conectado: Caja, Productos, Stock, Compras, Proveedores, Promociones,
Clientes, Histórico, Resumen mensual, Ubicaciones, Usuarios, Turnos, Actividad,
Configuración y Copias de seguridad.
[Uso, desarrollo y verificación del frontend](docs/frontend-web.md).

## Aplicaciones disponibles

La misma lógica de negocio funciona en web y en la aplicación de escritorio. Incluye
catálogo, códigos propios o comerciales, precios y promociones, stock por ubicación,
lotes, compras y proveedores, clientes y cuenta corriente, ventas, devoluciones,
turnos, informes, usuarios, auditoría y backups cifrados.

[Entrega, pruebas y próximos pasos](docs/entrega-01-catalogo.md).
[Entrega de Stock y pruebas de recuperación](docs/entrega-02-stock.md).
[Entrega del backend de Ventas](docs/entrega-03-backend-ventas.md).
[Usuarios, permisos y sesiones](docs/entrega-04-usuarios.md).
[Caja e Histórico conectados](docs/entrega-05-caja-historico.md).
[Resumen mensual y medición SQL](docs/entrega-06-resumen-mensual.md).

Primer arranque: configurar cuenta de jefe. El jefe crea vendedores y supervisores
desde Usuarios. Los permisos se verifican en backend; no hay contraseña predeterminada.

## Desarrollo

```powershell
npm run dev         # Electron + React + SQLite en Windows
npm run docker:up   # React en http://localhost:5173
npm run check       # tipos, lint, tests y compilación
npm run test:e2e    # prueba de escritorio
```

En Productos: **F2** busca, **F3** crea, **Ctrl + S** guarda y **Esc** vuelve.
La app arranca con el catálogo vacío; los productos se cargan manualmente o desde
un CSV UTF-8. [Ejemplo de formato](resources/productos-ejemplo.csv).
Docker permite ejecutar la aplicación web completa con API y almacenamiento persistente.

[Instalación, Docker, comandos y empaquetado](docs/entorno-desarrollo.md).

## Documentación

- [Documentación integral del sistema — manual, arquitectura, reglas, base de datos, API, seguridad y operación (octubre 2026)](docs/documentacion/README.md)
- [Leer toda la documentación en HTML](docs/documentacion/DOCUMENTACION-COMPLETA.html)
- [Plan e índice de specs](docs/plan-desarrollo.md)
- [Arquitectura propuesta](docs/arquitectura.md)
- [Modelo de datos](docs/modelo-datos.md)
- [Scanner y balanza](docs/scanner-y-peso.md)
- [Contratos comunes](docs/contratos.md)
- [Spec Kit instalado y uso](docs/spec-kit.md)
- [Presupuesto comercial](output/pdf/Perla-Negra-Presupuesto.pdf)

Stack: React + TypeScript + Vite + Electron + Fastify + SQLite. La instalación web
central admite varias cajas y ubicaciones con una única instancia de API; la aplicación
de escritorio conserva el uso local. Stock por unidad o gramos, ventas con medios de pago,
promociones e informes mensuales.
No emite comprobantes fiscales ni procesa pagos bancarios.
