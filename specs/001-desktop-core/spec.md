# Feature Specification: Base de escritorio y persistencia

**Feature Branch**: `feature/desktop-catalog`; incluye base 001 y catálogo 002.

**Created**: 2026-09-17

**Status**: En desarrollo. Persistencia y aislamiento implementados; aceptación completa pendiente de Caja y pruebas de recuperación/rendimiento en PC de referencia.

**Input**: Abrir la aplicación local, mantener datos entre reinicios y preparar operaciones de negocio sin bloquear Caja.

## User Scenarios & Testing

### User Story 1 - Abrir la caja sin internet (Priority: P1)

El cajero abre el acceso directo y encuentra la pantalla de Caja disponible.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** La PC está sin red y la app instalada, **When** Se abre el acceso directo, **Then** Caja aparece sin navegador, terminal ni configuración manual.

### User Story 2 - Mantener los datos entre sesiones (Priority: P1)

Agus instala una actualización y los datos del comercio permanecen disponibles.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Hay una base con datos de una versión anterior, **When** Se actualiza la aplicación y se reinicia, **Then** Los datos siguen disponibles y el esquema tiene una migración trazable.

### User Story 3 - Resolver un fallo sin registrar éxito falso (Priority: P1)

El cajero recibe un error claro ante una operación que no pudo guardarse.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** La PC no tiene espacio o el servicio local no responde, **When** Se intenta persistir, **Then** La app informa el fallo, conserva la operación pendiente y permite recuperación.

### Edge Cases

- Doble lanzamiento y worker que se cae durante una solicitud.

- Migración fallida, DB de versión futura, archivo corrupto y disco lleno.

- Reiniciar tras commit exitoso sin haber recibido la respuesta.

## Requirements

### Functional Requirements

- **FR-001-01**: Operación offline y una única instancia de escritura; segundo lanzamiento enfoca la ventana existente.

- **FR-001-02**: Separar interfaz, lógica de negocio y acceso a datos; los informes no congelan la pantalla.

- **FR-001-03**: Guardar datos fuera de la carpeta de instalación, con entornos de desarrollo y producción separados.

- **FR-001-04**: Versionar migraciones y bloquear una versión de app que no soporte el esquema encontrado.

- **FR-001-05**: Exponer sólo operaciones de negocio validadas a la interfaz, sin acceso arbitrario a archivos ni consultas.

- **FR-001-06**: Pantallas claras por módulo, fondo blanco y tamaños definidos en la constitución.

- **FR-001-07**: Informar errores de persistencia y conservar el último borrador recuperable.

### Key Entities

schema_migrations, app_settings y checkout_drafts. UUID internos, números de venta visibles correlativos. Guardar ruta estable userData; DB no se mueve por instalar.

## Success Criteria

### Measurable Outcomes

- **SC-001-01**: Inicio frío <= 3 s en la PC de referencia.

- **SC-001-02**: El 100% de operaciones fallidas evaluadas evita mostrar éxito.

- **SC-001-03**: Actualizar y reiniciar preserva todos los datos de la prueba.

## Assumptions

- Una PC Windows 11 x64, un comercio y un depósito lógico.

- Electron recomendado para mantener desarrollo TypeScript; no servicios externos.

## Dependencies
