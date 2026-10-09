# Comprobantes no fiscales e impresión

## Objetivo

Permitir entregar un detalle impreso de cada venta sin implementar facturación fiscal ni integración con ARCA. El comprobante es una representación inmutable de una venta ya confirmada y debe indicar en forma visible que no es fiscal.

## Límites

Este módulo no emite factura, ticket fiscal, CAE ni interactúa con ARCA. Se denomina siempre `Comprobante de venta — No fiscal`. Las ventas se confirman antes de toda acción de impresión: no hay impresora o error que pueda revertir o bloquear una venta.

## Datos

Migración 010 crea:

- `printer_profiles`: terminal, nombre, formato (`THERMAL_58`, `THERMAL_80`, `A4`), modo (`MANUAL`, `AUTO`), encabezado, pie, activo y revisión.
- `sale_receipts`: una instantánea inmutable por emisión de comprobante: venta, número de venta, contenido JSON renderizable, formato solicitado, estado (`PENDING`, `PRINTED`), motivo de reimpresión, usuario y fechas.

Al completar una venta se crea un comprobante pendiente si la terminal tiene un perfil de impresión automática activo. En modo manual el comprobante se crea cuando el cajero elige imprimir. Una venta anulada no modifica sus comprobantes ya emitidos; se puede emitir un comprobante de anulación en una fase posterior.

## Operaciones

- Listar y guardar perfiles de impresora: solo jefe.
- Consultar configuración efectiva de impresión de una terminal: cajero autenticado.
- Crear comprobante para una venta: cajero para su propia venta; jefe y supervisor para cualquier venta.
- Listar pendientes e histórico: jefe y supervisor.
- Marcar como impreso: cajero de su propio comprobante; jefe y supervisor cualquiera.

La aplicación web renderiza la instantánea a HTML apto para impresión y abre el diálogo nativo del navegador. En escritorio también se usa la misma plantilla y diálogo. La integración USB/ESC-POS silenciosa se implementará con un agente local posterior, que consume el mismo registro pendiente.

## Contenido

Nombre del negocio, texto `COMPROBANTE DE VENTA — NO FISCAL`, número de venta, fecha/hora, terminal, cajero, productos, cantidades, descuentos, medios de pago, total y pie configurable. No contiene datos o leyendas fiscales.

## Pruebas

- Venta confirmada sin impresora queda válida.
- Perfil automático crea una única emisión pendiente junto con la venta.
- Reimpresión crea una nueva emisión y no muta la anterior.
- Restricciones de rol y propiedad de venta.
- HTML de comprobante contiene datos históricos y leyenda no fiscal.
