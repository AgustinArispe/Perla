# Feature Specification: Backups, instalación y mantenimiento

**Feature Branch**: no creada; identificador `008-backup-installation` independiente de Git.

**Created**: 2026-09-17

**Status**: Plan de escritorio archivado tras decisión de migrar a web (2026-09-18). Backups/recuperación implementados en [011](../011-web-backup-recovery/spec.md); servidor/despliegue en [010](../010-web-api-security/spec.md).

**Input**: Entregar una aplicación instalable, proteger datos con respaldos validados y mantenerla sin exigir conocimientos técnicos al comercio.

## User Scenarios & Testing

### User Story 1 - Guardar un respaldo externo (Priority: P1)

El encargado elige un pendrive y guarda una copia de los datos.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** La app tiene productos, ventas y stock y hay operaciones recientes, **When** Se crea un backup, **Then** El archivo es consistente, verificable y la app muestra éxito sólo tras validar.

### User Story 2 - Recuperar la información (Priority: P1)

Agus selecciona una copia y revisa su fecha antes de restaurar.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Hay una copia compatible e íntegra, **When** Se confirma restauración sin venta pendiente, **Then** Se guarda respaldo previo, se restaura y la app reinicia con datos consistentes.

### User Story 3 - Instalar y actualizar sin perder datos (Priority: P1)

Agus instala la app y actualiza durante el mantenimiento.

**Why this priority**: Es necesario para operar y preservar datos.

**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.

**Acceptance Scenarios**:

1. **Given** Hay datos en la PC y una actualización compatible, **When** Se instala la nueva versión, **Then** El acceso directo funciona y la base conserva productos, stock, ventas y pagos.

### Edge Cases

- Disco lleno, destino desconectado durante escritura y snapshot corrupto.

- Restore versión futura y backup sin manifest.

- Proceso se corta entre swap y reapertura: recuperación con archivo previo.

## Requirements

### Functional Requirements

- **FR-008-01**: Instalador Windows x64, recursos locales y acceso directo; cliente no ejecuta npm, Python ni terminal.

- **FR-008-02**: Ruta de DB estable y separada; upgrade/desinstalación no elimina datos sin decisión explícita.

- **FR-008-03**: Backup mediante API SQLite online del driver, no copiar sólo .db mientras WAL está abierto.

- **FR-008-04**: Validar integrity_check y foreign_key_check; manifest con version, fecha UTC, schema y SHA-256 del snapshot.

- **FR-008-05**: Destino externo elegido por diálogo nativo; escribir temporal, validar y renombrar. Error/pendrive ausente no muestra éxito.

- **FR-008-06**: Copia local diaria al primer inicio del día y previo update/restore; conservar 14 copias exitosas diarias, no eliminar archivo elegido externo.

- **FR-008-07**: Restore exige revisión, bloquea escrituras y no acepta carrito activo sin resolver; verifica schema y hash antes de tocar base actual.

- **FR-008-08**: Cerrar workers/conexiones y resolver WAL/SHM antes de swap; guardar respaldo previo y rollback si reapertura falla.

- **FR-008-09**: Incluir guía breve, prueba scanner, práctica de caja y procedimiento mensual de backup/actualización.

- **FR-008-10**: No iniciar updates durante venta, no remoto oculto ni subida de DB del comercio a GitHub.

### Key Entities

backup_runs y settings de destino/retención. Manifest declara appVersion, schemaVersion, timestampUtc, dbSha256. El snapshot no guarda datos bajo Program Files.

## Success Criteria

### Measurable Outcomes

- **SC-008-01**: Restauración reproduce exactamente productos, movimientos, pagos y ventas de la prueba.

- **SC-008-02**: Instalar/actualizar en Windows limpia sin Node/Python permite vender offline.

- **SC-008-03**: Todos los backups entregados pasan hash, integrity_check y foreign_key_check.

## Assumptions

- Agus realiza instalación y mantenimiento mensual; no autoactualización remota inicial.

- La copia local no protege de pérdida de PC: la guía incluye un destino externo.

## Dependencies

- [001-desktop-core](../001-desktop-core/spec.md)

- [002-product-catalog](../002-product-catalog/spec.md)

- [003-stock-ledger](../003-stock-ledger/spec.md)

- [006-sales-payments-history](../006-sales-payments-history/spec.md)

- [007-monthly-dashboard](../007-monthly-dashboard/spec.md)
