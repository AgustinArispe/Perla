# Tareas — Conteos guiados, vencimientos y revisión de caja

Estado: implementado; los controles tienen paginación y validación de servicios y presentación web.

- [x] T01 Crear sesiones y líneas de conteo con revisión de stock y recuperación; integrar ledger existente.
- [x] T02 Probar cantidades vacías/cero, concurrencia, pérdida de respuesta y reconciliación de lotes.
- [x] T03 Construir conteo por scanner/teclado con revisión de diferencias y acciones alcanzables en móvil.
- [x] T04 Agregar lista paginada de vencimientos y destinos a lote/ubicación exactos.
- [x] T05 Agregar revisión de cierres con nota y estados pendiente/revisado, sin alterar movimientos.
- [x] T06 Verificar agrupación de faltantes/sobrantes y exportación de todos los filtros.

Evidencia: `tests/integration/control-operations.test.ts` verifica recuperación de borrador, diferencias, conflicto de stock posterior, replay de grupo aplicado, conciliación de ledger por lote, destinos exactos y revisión inmutable de cierres. T03/T04 implementados con páginas de 25 registros. La entrada del scanner se simula como teclado; queda verificar el hardware real.
