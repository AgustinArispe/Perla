# Quickstart: Usuarios y permisos

Usar perfil temporal; no modificar la base del comercio.

```powershell
npm test
npm run check
npm run test:e2e
npm run docker:check
```

Primer arranque: crear jefe con nombre, usuario y contraseña. Jefe abre Usuarios,
crea supervisor/vendedor y cierra sesión. Supervisor gestiona productos/stock,
sin resumen mensual. Vendedor ve sólo Caja; hasta implementar su pantalla muestra
estado pendiente sin acceso a inventario. Verificar rechazos también por IPC directo.
