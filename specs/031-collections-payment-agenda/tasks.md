# Tareas — Agenda de cobros y pagos

Estado: implementado y verificado con pruebas de servicios y circuitos web de cuentas corrientes.

- [x] T01 Agregar vencimiento nullable por obligación con revisión, motivo de cambio y migración compatible.
- [x] T02 Crear consultas por fecha/estado con saldos derivados e índices; probar Sin fecha frente a Vencido.
- [x] T03 Precargar obligaciones en cobro/pago y mantener imputación/idempotencia de servicios existentes.
- [x] T04 Agregar vistas Por cobrar/Por pagar y accesos desde Inicio; integrar Excel y vistas guardadas.
- [x] T05 Probar pagos parciales, créditos, anticipos, anulaciones y funciones en modo solo pendientes.
- [x] T06 Verificar permisos de todos los perfiles y conciliación con turnos e histórico.

Decisión de simplificación: la fecha acordada se registra desde la agenda después de crear la venta o compra. El checkout y la recepción no agregan campos nuevos. Las obligaciones existentes conservan fecha null y los cambios quedan auditados.

Evidencia: `tests/integration/control-operations.test.ts` comprueba Sin fecha frente a Vencido, conflicto de fecha/saldo e imputación parcial a la obligación elegida sin alterar otra deuda. Los formularios existentes se precargan por obligación y conservan claves de reintento. Las pruebas existentes de clientes y proveedores siguen pasando.
