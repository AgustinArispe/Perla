# Feature Specification: Usuarios y permisos

**Feature Branch**: feature/users-roles · **Created**: 2026-09-17
**Status**: implementación autorizada por Agus
**Input**: Usuarios vendedor, supervisor y jefe; posible migración a web.

## User Scenarios & Testing

### User Story 1 — Entrar con un perfil (Priority: P1)

Cada empleado inicia sesión con su cuenta y ve los módulos que puede usar.
**Independent Test**: iniciar como vendedor y comprobar que no modifica productos ni stock, incluso invocando operaciones directamente.
**Acceptance Scenarios**:
1. **Given** una cuenta activa, **When** ingresa sus credenciales, **Then** obtiene su perfil sin datos de contraseñas.
2. **Given** un vendedor, **When** intenta gestionar productos, stock, usuarios o informes, **Then** recibe un rechazo del backend.

### User Story 2 — Administrar usuarios (Priority: P1)

El jefe crea, edita, inactiva cuentas y restablece contraseñas.
**Independent Test**: crear supervisor y vendedor como jefe; cambiar rol y comprobar revocación de sesiones previas.
**Acceptance Scenarios**:
1. **Given** una instalación vacía, **When** se configura el primer jefe, **Then** no puede repetirse la configuración inicial.
2. **Given** el último jefe activo, **When** intenta inactivarlo o reducir su rol, **Then** se impide perder el acceso administrativo.

### User Story 3 — Operar con trazabilidad (Priority: P2)

Ventas y cambios de productos/stock identifican al responsable sin depender del nombre actual de la cuenta.
**Independent Test**: vender con dos cuentas, recuperar sólo la venta propia como vendedor y verificar el responsable histórico.
**Acceptance Scenarios**:
1. **Given** una venta propia, **When** el vendedor recupera un cierre incierto, **Then** obtiene su resultado sin acceso a ventas ajenas.
2. **Given** un cambio confirmado, **When** se revisa su registro interno, **Then** conserva usuario, nombre y fecha sin credenciales.

### Edge Cases

Sesión vencida/revocada; usuario inactivo; contraseña incorrecta; cinco intentos fallidos;
doble bootstrap; último jefe; revisiones viejas; reintentos sin doble auditoría;
borradores de distintos usuarios; datos previos sin responsable conocido.

## Requirements

- FR-009-01: Credenciales individuales; contraseñas protegidas y nunca retornadas ni registradas.
- FR-009-02: Jefe: todos los módulos y usuarios. Supervisor: Caja, Productos, Stock e Histórico; sin dashboard ni usuarios ni backup administrativo. Vendedor: sólo Caja y consulta mínima de productos activos necesaria para vender.
- FR-009-03: Vendedor cancela su carrito en curso; anular una venta cobrada exige supervisor/jefe y motivo. Stock negativo excepcional exige supervisor/jefe.
- FR-009-04: Permisos comprobados por operación en backend, con denegación por defecto.
- FR-009-05: Sesión con vencimiento de ocho horas, logout y revocación al cambiar cuenta/rol/contraseña.
- FR-009-06: Sólo jefe crea/edita/inactiva usuarios; no borrar cuentas con historial ni perder el último jefe activo.
- FR-009-07: Bootstrap local exclusivo de primera instalación, sin usuario/clave predeterminados.
- FR-009-08: Responsable histórico en ventas/eventos/movimientos y auditoría de cambios de catálogo/cuentas; datos legacy conservados con responsable desconocido.
- FR-009-09: Borrador aislado por usuario; cancelación valida revisión y no modifica ventas confirmadas.
- FR-009-10: UI de ingreso/configuración inicial y gestión de usuarios; navegación por rol. Caja y dashboard aún no implementados se identifican como pendientes.

### Key Entities

Usuario, sesión revocable, rol fijo, evento de auditoría y responsable histórico.

## Success Criteria

- SC-009-01: Todas las operaciones prohibidas de la matriz se rechazan aun sin usar la interfaz.
- SC-009-02: Un perfil revocado no realiza otra operación durable con la sesión anterior.
- SC-009-03: Dos usuarios conservan borradores separados; cancelar uno no afecta el otro.
- SC-009-04: Cada cambio durable realizado por el circuito público conserva responsable; reintentar un cierre no duplica su registro.

## Assumptions

Supervisor puede revisar histórico y anular ventas cobradas, sin métricas agregadas mensuales.
El jefe inicial se configura durante la instalación por Agus. Sin recuperación por email,
OAuth, MFA, multiempresa ni despliegue web en esta entrega. La posible web requiere
servidor, cookies seguras, protección CSRF/TLS y bootstrap privado; no se publica SQLite
ni Electron. Se conserva la arquitectura actual y se separa la autorización del transporte.
