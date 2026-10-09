# 033 — Checklist de UI y UX

Estado: implementación local integrada. Verificación y límites: [ui-ux-verification.md](../../docs/ui-ux-verification.md). Las tareas pendientes mantienen su casilla abierta.

Diseño: [ui-ux-revision.md](ui-ux-revision.md). Pasos, archivos y comprobaciones: [plan integral](../../docs/superpowers/plans/2026-10-07-ui-ux-integral.md).

## Etapa 0 — Evidencia

- [x] T01 Registrar línea de base, reproducir anomalías y definir alcance de contadores, períodos y exportaciones.

## Etapa 1 — Componentes compartidos

- [x] T02 Unificar tokens, controles, encabezados, filtros, tablas, vacíos y métricas; validar una lista y un formulario completos.
- [x] T03 Corregir buscador de Caja y validar selectores, foco, respuestas tardías, scanner y ventanas.
- [x] T04 Simplificar Excel conservando filtros múltiples, alcance, orden y todas las coincidencias.

## Etapa 2 — Navegación

- [x] T05 Agrupar por tareas y conservar destinos antiguos, roles, funciones y Ayuda accesible.
- [ ] T06 Mantener filtros, entidad, ubicación y borrador al ir y volver entre módulos.

## Etapa 3 — Inicio y Resultados

- [ ] T07 Presentar prioridades y avisos con unidad, alcance y próxima acción.
- [x] T08 Reorganizar mensual/semanal, cifras, comparación, gráficos y reportes sin duplicaciones ni mezcla temporal.

## Etapa 4 — Venta y atención

- [x] T09 Simplificar Caja/cobro/fiado/peso conservando velocidad e integridad.
- [x] T10 Unificar historial, comprobantes, devoluciones, turnos y diferencias.

## Etapa 5 — Mercadería

- [x] T11 Pulir catálogo, alta, categorías/marcas, importación y precios.
- [x] T12 Ordenar stock, reposición, conteos, lotes y vencimientos.
- [x] T13 Separar existencias/traslados, mantener disponibilidad y validar flujo entre ubicaciones.

## Etapa 6 — Compras y cuentas

- [x] T14 Integrar recepción/proveedor/cuenta/pago sin perder contexto.
- [ ] T15 Clarificar clientes, cobros, pagos y obligaciones de Agenda.
- [x] T16 Simplificar promoción y comprobar su aplicación real al carrito.

## Etapa 7 — Administración y soporte

- [x] T17 Ordenar configuración/funciones/accesos con consecuencias concretas.
- [x] T18 Clarificar actividad, copias, ayuda y estados de carga/error/conexión.

## Etapa 8 — Cierre

- [ ] T19 Ejecutar matriz visual/funcional/roles/responsive; registrar exactitud y rendimiento; validar facilidad con personas o indicar que queda pendiente.
- [ ] T20 Retirar estilos reemplazados, actualizar documentación y entregar evidencia final.

Una tarea se marca completa solo después de ejecutar sus comprobaciones y registrar el resultado. Las capturas existentes son la línea de base, no pruebas de que el rediseño ya funciona.

## Pendientes de cierre

- T06: filtros de listas, mes, ubicación, página y borrador de compra comprobados; falta matriz general de entidad seleccionada y retorno entre todas las áreas.
- T07: Inicio y avisos reorganizados, con muestras breves y alcances explícitos. Los contratos de alertas no aportan todos los importes o referencias individuales; no se inventaron.
- T15: clientes/cobro y Agenda Cobrar/Pagar integrados. Agrupación adicional por contraparte y vencimiento requiere contrato validado antes de cambiar obligaciones.
- T19: pruebas funcionales y tamaños documentados; quedan zoom 200%, teclado virtual, evaluación humana y medición de rendimiento comparable.
- T20: documentación y evidencia entregadas; las capas CSS heredadas se conservan hasta revisar todos sus consumidores, sin borrarlas por nombre.
