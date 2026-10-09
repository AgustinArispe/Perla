# Diseño aprobado — Proveedores y compras

**Fecha**: 2026-10-01  
**Estado**: aprobado conceptualmente por Agus; formalizado para revisión documental.

## Propósito

Incorporar una forma simple de registrar proveedores y mercadería realmente recibida. El flujo debe servirle a una dueña que trabaja sola y sostener más volumen y personal sin reemplazar el sistema.

## Decisiones aprobadas

- El módulo se habilita desde Configuración > Funciones.
- La primera entrega registra recepciones confirmadas. No mezcla pedidos, facturas y entregas parciales.
- Un proveedor se crea sólo con nombre; contacto, teléfono, dirección y notas son opcionales.
- La compra se arma con scanner o búsqueda y conserva un borrador recuperable.
- Cada renglón registra cantidad y costo unitario; unidades y gramos se manejan como enteros.
- Confirmar guarda documento, costos y movimientos de stock aplicables como una sola operación.
- El reintento de una confirmación devuelve el mismo resultado y no duplica efectos.
- Con Stock apagado se conservan compra y costos sin inventar existencias.
- El costo recibido no cambia automáticamente el precio de venta; se ofrece una revisión posterior.
- El histórico conserva proveedor, producto, código, cantidad y costo originales.
- Una compra se corrige mediante anulación vinculada y con motivo. No se borra ni se reescribe.
- Supervisor, jefe y administrador operan el módulo. Vendedor permanece limitado a Caja.
- En esta etapa las compras se consideran pagadas. Cuenta corriente y pagos parciales quedan para una ampliación independiente.

## Experiencia principal

1. Elegir o crear proveedor.
2. Escanear o buscar productos.
3. Revisar cantidades y costos.
4. Confirmar con «Recibir compra».
5. Ver resultado y, si cambió un costo, abrir «Revisar precios».

El formulario muestra sólo lo necesario para el paso actual. Crear un proveedor o producto no descarta lo cargado. En celular, la revisión usa bloques apilados y mantiene la acción principal accesible.

## Integridad operativa

Una recepción sólo se considera terminada cuando el documento y todos sus efectos están confirmados. Una caída de conexión no equivale a éxito. Antes de reintentar se consulta el resultado de la misma operación.

La anulación automática se permite únicamente cuando puede revertir los movimientos originados por la compra sin producir inconsistencias. Cuando hubo consumos o correcciones posteriores, se conserva el documento y se deriva a un ajuste controlado.

## Alcance posterior

- Pedidos y aprobaciones de compra.
- Recepciones parciales.
- Cuenta corriente y vencimientos de proveedores.
- Pagos parciales.
- Lotes, vencimientos y múltiples depósitos.
- Tratamiento fiscal e integración con ARCA.

La especificación verificable está en `specs/015-suppliers-purchases/spec.md`.
