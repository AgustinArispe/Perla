# El Bocha POS Constitution

## Core Principles

### I. Caja rápida y comprensible

La aplicación DEBE priorizar scanner y teclado en navegador. Confirmar ventas
requiere conexión al servidor; un corte no se interpreta como confirmación. Fondo blanco,
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

### IV. Datos centrales recuperables

SQLite DEBE permanecer en volumen persistente del servidor, fuera del repositorio
y del navegador. La instancia API activa es única. Migraciones
versionadas, foreign keys, backups consistentes y recuperación probada. Antes de
restaurar o migrar datos reales se genera un respaldo validado. Fallos de disco
no pueden mostrarse como ventas exitosas. Backups cifrados y clave externa;
una copia descargada fuera del servidor permite recuperar una base dañada.
La administración privada y recuperación DEBEN comprobar exclusión del servicio.

### V. Entregas verificadas por comportamiento

Pruebas de dominio para importes y pesos; integración con SQLite real para
transacciones, stock, anulación, informes y restore; recorridos de teclado con
Playwright. HTTP real, worker, permisos, restauración interrumpida y contenedor
de producción se verifican antes de declarar backend terminado.
El scanner físico se valida durante instalación/adopción del comercio.
No se declara compatible un hardware que solamente fue simulado.

## Restricciones del proyecto

### VI. Identidad y permisos verificables

Operaciones de negocio requieren sesión activa y autorización en backend.
Vendedor sólo Caja; supervisor gestiona Productos/Stock/Histórico sin dashboard;
jefe administra todos los módulos y usuarios. Cancelar un carrito no anula una
venta cobrada. Responsables y cambios se conservan sin credenciales ni tokens.
Revocar cuentas/roles invalida sesiones; debe permanecer un jefe activo.

### VII. Seguridad web verificable

HTTPS del mismo origen, cookies HttpOnly/Secure/SameSite, CSRF y Origin exacto.
La API DEBE validar contratos, permisos y propietario; limitar abuso y redactar
credenciales. Aprovisionamiento y recuperación de acceso sólo por CLI privada.
La sesión vence a las 8 horas o 30 minutos de inactividad; cambios de cuenta
y restauraciones revocan sesiones. No se exponen SQL ni RPC arbitrarios.

- PC de caja con navegador moderno; operación local de teclado/scanner USB HID.
- React, TypeScript strict y Vite; Node/Fastify, worker, SQLite y SQL parametrizado.
- Electron se conserva como versión previa; la interfaz web es la siguiente etapa.
- Sin ARCA, emisión fiscal, procesamiento de tarjetas ni conexión a POS bancario.
- Un comercio, un depósito lógico y varias terminales/usuarios con servidor central.
  Escalar a varias API/comercios requiere revisar persistencia y aislamiento.
- Paquetes de aplicación resueltos y fijados en lockfile al comenzar implementación.
- Node.js 24 LTS para herramientas de desarrollo; el cliente no instala Node ni Python.

## Flujo de desarrollo

Constitution -> spec -> plan -> tasks -> implement -> converge por feature.
Cada spec incluye escenarios, supuestos y resultados verificables. Mantener el
modelo común de datos y contratos antes de extender módulos. La planificación
web fue autorizada por Agus; backend se implementa antes del frontend. Preparar
despliegue no equivale a publicar un dominio ni configurar hosting real.
No agregar dependencias ni automatismos innecesarios.

## Governance

Cambios de alcance se registran en docs/plan-desarrollo.md. Cambios de reglas de
dinero, stock o esquema requieren adaptar contratos, pruebas y migraciones.
Versionar esta constitución: major para reglas incompatibles, minor para nuevas
reglas, patch para aclaraciones. Revisar cumplimiento en cada entrega.

**Version**: 2.0.0 | **Ratified**: 2026-09-17 | **Last Amended**: 2026-09-18
