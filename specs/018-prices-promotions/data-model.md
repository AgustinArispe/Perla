# Data model: Precios y promociones

## Price change batch

Cabecera idempotente con actor, filtro, modo, valor y fecha. Ítems con producto, revisión esperada, precio anterior y nuevo. El lote se confirma completo y nunca se edita.

## Promotion

Identidad, nombre, tipo, estado, prioridad, vigencia, revisión y parámetros validados. Objetivos por producto/categoría/marca. Combos agregan componentes con cantidad requerida. Pausar/finalizar crea nueva revisión efectiva y conserva las anteriores.

## Sale promotion allocation

Venta, promoción/versión, nombre histórico, renglón, cantidad consumida y descuento exacto. La suma de asignaciones coincide con el descuento promocional guardado.

## Invariants

- nuevo precio entre 1 y el máximo monetario;
- precio esperado y revisión coinciden para todos los ítems del lote;
- ahorro promocional nunca es negativo ni supera el bruto consumido;
- cantidad consumida acumulada por renglón no supera la cantidad vendida;
- suma de descuentos por renglón coincide con ahorro total;
- una venta confirmada nunca se repricinga.
