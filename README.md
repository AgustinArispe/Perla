# El Bocha POS

Aplicación de escritorio de control interno para un almacén en Argentina.
Estado: entorno de desarrollo y scaffold de escritorio preparados. Los módulos de
negocio siguen pendientes en las specs.

## Desarrollo

```powershell
npm run dev         # Electron + React + SQLite en Windows
npm run docker:up   # React en http://localhost:5173
npm run check       # tipos, lint, tests y compilación
npm run test:e2e    # prueba de escritorio
```

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
