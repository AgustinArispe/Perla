# El Bocha POS

Aplicación de escritorio de control interno para un almacén en Argentina.
Estado: catálogo y control de stock disponibles. Alta/edición/inactivación,
búsqueda, importación CSV, conteos, ingresos, mermas e historial de movimientos.
Backend de ventas disponible: pagos, descuentos, persistencia, consulta y anulación
con stock atómico. Pantallas de Caja e Histórico y dashboard siguen pendientes.

[Entrega, pruebas y próximos pasos](docs/entrega-01-catalogo.md).
[Entrega de Stock y pruebas de recuperación](docs/entrega-02-stock.md).
[Entrega del backend de Ventas](docs/entrega-03-backend-ventas.md).

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
La vista Docker sirve para desarrollar la interfaz; los datos se guardan desde
la aplicación de escritorio.

[Instalación, Docker, comandos y empaquetado](docs/entorno-desarrollo.md).

## Documentación

- [Plan e índice de specs](docs/plan-desarrollo.md)
- [Arquitectura propuesta](docs/arquitectura.md)
- [Modelo de datos](docs/modelo-datos.md)
- [Scanner y balanza](docs/scanner-y-peso.md)
- [Contratos comunes](docs/contratos.md)
- [Spec Kit instalado y uso](docs/spec-kit.md)
- [Presupuesto comercial](output/pdf/El-Bocha-Presupuesto.pdf)

Stack: React + TypeScript + Vite + Electron + SQLite. Una PC, operación
offline, stock por unidad o gramos, ventas con medios de pago y dashboard mensual.
No emite comprobantes fiscales ni procesa pagos bancarios.
