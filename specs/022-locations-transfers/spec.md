# 022 — Ubicaciones y traslados

## Objetivo

Permitir que Perla Negra crezca desde un único local hacia varios depósitos o sucursales sin agregar complejidad al uso actual.

## Reglas de negocio

- Toda instalación tiene una «Ubicación principal» creada por migración. Mientras el módulo esté apagado, permanece invisible.
- Cada terminal pertenece a una ubicación. Las terminales existentes quedan en la ubicación principal.
- El stock consolidado conserva la compatibilidad con Caja, informes y backups; además se guarda el saldo por ubicación.
- Un traslado confirmado descuenta el origen y queda `IN_TRANSIT`.
- La recepción acredita únicamente la cantidad recibida. La diferencia queda registrada y no vuelve a aparecer como disponible.
- Un traslado en tránsito puede cancelarse antes de recibirlo; la cancelación repone el origen.
- Despachar, recibir y cancelar son idempotentes por clave de operación.
- No se permiten traslados entre la misma ubicación, cantidades no positivas, productos sin stock controlado ni saldos insuficientes.
- El costo vigente del producto se conserva como fotografía del renglón. La transferencia interna no altera el costo consolidado.
- El historial continúa disponible aunque se desactive la función. No se puede desactivar mientras haya traslados en tránsito.

## Permisos

- Jefe/administrador: crea y edita ubicaciones, asigna terminales y ve el consolidado.
- Supervisor, jefe y administrador: prepara, despacha, recibe, cancela y consulta traslados.
- Vendedor: no accede al módulo.

## Experiencia

- La función «Ubicaciones y traslados» se activa desde Configuración y depende de Control de stock.
- La pantalla muestra ubicación, saldo y mercadería en tránsito con textos breves.
- El formulario de traslado se divide en origen/destino, productos y confirmación.
- En celular se presentan fichas de una columna y acciones grandes.

## Aceptación

- Una base existente migra sus saldos y terminales a la ubicación principal sin diferencias.
- Los reintentos no duplican movimientos.
- Despacho, recepción con diferencia y cancelación mantienen saldos e historial correctos.
- Backups incluyen ubicaciones, asignaciones, saldos y traslados.
- Módulo apagado conserva el flujo actual y rechaza nuevas operaciones de traslado en servidor.
