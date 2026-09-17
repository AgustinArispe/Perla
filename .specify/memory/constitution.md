# El Bocha POS Constitution

## Core Principles

### I. Caja rápida y comprensible

La aplicación DEBE operar sin internet y priorizar scanner y teclado. Fondo blanco,
verde de acento, texto principal mínimo 18 px, controles de cantidad de 22 px y
total mínimo 48 px en escritorio. No se mezcla el dashboard con el flujo de caja.
Ningún cálculo de informes o backup puede bloquear el hilo de la interfaz.

### II. Ventas, pagos y stock consistentes

Confirmar una venta DEBE guardar cabecera, detalle histórico, pagos y movimientos
de stock en una sola transacción. Los reintentos son idempotentes. Anulaciones y
ajustes mantienen motivo y trazabilidad. No se borran ventas confirmadas ni se
reescriben nombres, precios o cantidades históricos por editar el catálogo.

### III. Cálculos exactos y reglas compartidas

Dinero en centavos enteros; pesos en gramos enteros; cantidades unitarias enteras.
Se usan aritmética entera y redondeo definido, nunca floats para resultados de
venta. Una sola lógica de dominio valida cobro, descuentos y stock; la UI no
decide qué se persiste. Código de barras es texto y conserva ceros iniciales.

### IV. Datos locales recuperables

SQLite DEBE permanecer fuera del instalador y del repositorio. Migraciones
versionadas, foreign keys, backups consistentes y recuperación probada. Antes de
restaurar o migrar datos reales se genera un respaldo validado. Fallos de disco
no pueden mostrarse como ventas exitosas. La instancia de escritura es única.

### V. Entregas verificadas por comportamiento

Pruebas de dominio para importes y pesos; integración con SQLite real para
transacciones, stock, anulación, informes y restore; recorridos de teclado con
Playwright. Se prueba además el scanner físico y el instalador en Windows.
No se declara compatible un hardware que solamente fue simulado.

## Restricciones del proyecto

### VI. Identidad y permisos verificables

Operaciones de negocio requieren sesión activa y autorización en backend.
Vendedor sólo Caja; supervisor gestiona Productos/Stock/Histórico sin dashboard;
jefe administra todos los módulos y usuarios. Cancelar un carrito no anula una
venta cobrada. Responsables y cambios se conservan sin credenciales ni tokens.
Revocar cuentas/roles invalida sesiones; debe permanecer un jefe activo.

- Windows 11 x64 como objetivo inicial; PC con SSD y 8 GB RAM como referencia a validar.
- React, TypeScript strict, Vite, Electron; SQLite y consultas SQL parametrizadas.
- Sin ARCA, emisión fiscal, procesamiento de tarjetas ni conexión a POS bancario.
- Un comercio, una caja, una PC, un depósito lógico en el despliegue actual.
  Posible web futura: mantener reglas y permisos independientes de Electron;
  servidor, transporte, hosting y concurrencia multiusuario requieren otra entrega.
- Paquetes de aplicación resueltos y fijados en lockfile al comenzar implementación.
- Node.js 24 LTS para herramientas de desarrollo; el cliente no instala Node ni Python.

## Flujo de desarrollo

Constitution -> spec -> plan -> tasks -> implement -> converge por feature.
Cada spec incluye escenarios, supuestos y resultados verificables. Mantener el
modelo común de datos y contratos antes de extender módulos. La planificación
actual es un borrador para revisión de Agus: no autoriza publicación o instalación
en el cliente. No agregar dependencias ni automatismos innecesarios.

## Governance

Cambios de alcance se registran en docs/plan-desarrollo.md. Cambios de reglas de
dinero, stock o esquema requieren adaptar contratos, pruebas y migraciones.
Versionar esta constitución: major para reglas incompatibles, minor para nuevas
reglas, patch para aclaraciones. Revisar cumplimiento en cada entrega.

**Version**: 1.1.0 | **Ratified**: 2026-09-17 | **Last Amended**: 2026-09-17
