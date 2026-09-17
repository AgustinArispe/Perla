# Entrega 04 — Usuarios y permisos

17 de septiembre de 2026 · esquema SQLite 5 · incremento sobre backend de ventas.

## Perfiles

| Módulo/acción | Vendedor | Supervisor | Jefe |
|---|---|---|---|
| Caja, búsqueda de productos activos y cancelar carrito propio | Sí | Sí | Sí |
| Productos y Stock | No | Sí | Sí |
| Histórico y anular venta cobrada con motivo | No | Sí | Sí |
| Dashboard mensual | No | No | Sí |
| Crear/editar/inactivar usuarios | No | No | Sí |
| Backup y configuración administrativa | No | No | Sí |

La matriz define permisos; no significa que todas esas pantallas ya estén
implementadas. Caja/Historico/dashboard se conectan en incrementos siguientes.

## Disponible

Primer arranque permite crear un jefe con una contraseña elegida durante la
instalación. No hay credenciales predeterminadas. El jefe abre Usuarios para
crear perfiles, editar rol/nombre, inactivar cuentas o cambiar contraseña.
No se permite quitar el último jefe activo ni borrar cuentas físicamente.

Ingreso y cierre de sesión; cambio de contraseña propia. Sesiones de ocho horas,
revocadas al cambiar cuenta/rol/contraseña. Cinco intentos incorrectos bloquean
temporalmente el ingreso; el registro de intentos lleno también rechaza nuevos
intentos en lugar de desactivar la protección.

Contraseñas protegidas mediante scrypt con salt aleatorio; tokens de sesión
guardados como hash en SQLite. En escritorio el token queda en memoria de main,
no en el renderer ni localStorage. Las respuestas de login sólo incluyen perfil.
Un error al escribir la contraseña actual conserva la sesión válida.

Los permisos se comprueban en el dispatcher del worker, incluso al llamar IPC
sin pasar por botones. Operaciones nuevas no reciben permiso automáticamente.
El vendedor recupera sólo sus propios cierres; no consulta listados globales.
La anulación cobrada y la autorización de stock negativo corresponden a supervisor/jefe.

Borradores separados por usuario. Cancelarlos valida revisión y no afecta una
venta cobrada. La migración adopta el borrador previo para el primer jefe sin
perder existencias. Los datos históricos previos quedan con responsable desconocido.

Ventas, eventos y movimientos conservan identidad/nombre del responsable.
Auditoría de catálogo, cuentas, borrador y cambios durables en la misma transacción;
no incluye credenciales. Reintentos de una venta no duplican auditoría.

## Evidencia y límites

63 pruebas unitarias/de integración correctas; tipos, lint y builds correctos.
Incluyen permisos, último jefe, revocación/vencimiento, bloqueo, capacidad de
intentos, aislamiento de borradores, responsable histórico, fallo de auditoría
con rollback y actualización de esquema 4 con stock/borrador conservados.

Siete recorridos Playwright correctos, incluido bootstrap, creación de perfiles,
logout/login y rechazos de vendedor/supervisor por IPC. Verificación visual de
ingreso y Usuarios realizada. Docker: 63 pruebas y builds correctos en Linux.
Revisión independiente: corregidos límite de intentos y conservación de sesión
ante contraseña actual incorrecta. El instalador se regenerará con la conexión
de módulos siguiente; el paquete previo aún corresponde a la entrega 03.

La autenticación no depende de Electron; todavía no hay servidor HTTP, hosting,
cookies web ni protección CSRF/TLS. El bootstrap se usa localmente durante la
instalación; en una web deberá aprovisionarse de manera privada. Sin recuperación
por email, MFA ni multiempresa. Usuarios e inventario siguen locales a esta PC.

[Spec y permisos](../specs/009-users-roles/spec.md) · [Decisiones y fuentes](../specs/009-users-roles/research.md).
