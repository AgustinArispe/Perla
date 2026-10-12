# Implementación del frontend — 12 de octubre de 2026

## Cambios entregados

Resultados incorpora gráfico diario con eje cero y movimientos negativos, comparación opcional con fechas reales, detalle accesible y acceso al histórico del día conservando el mes al volver. La dona usa los cinco productos principales y Otros del universo completo. El ranking conserva unidades y kilos separados; cuando hay negativos muestra importes con signo. Pagos muestra reembolsos y participaciones sobre pagos netos.

Las cabeceras y pestañas comparten orden y estilo. Productos agrupa mantenimiento y actualiza las revisiones de las filas seleccionadas después de editar; la selección continúa entre búsquedas y páginas. Stock aclara acciones y estados. Reponer corrige paginación de 25 filas, ofrece calendario y resumen de selección. Ubicaciones mantiene el pie fuera del área de filas y permite filtrar traslados por recibir.

Caja prioriza el lector; recepción de compras compacta proveedor y conserva borrador. Cuentas explican por cobrar, por pagar y crédito a favor. Agenda simplifica filtros; Promociones explica condición y alcance, incluidos umbrales diferentes para unidades y kilos; Turnos destaca diferencias y conserva los importes secundarios en detalle. Inicio contextualiza días sin actividad. Ingreso permite mostrar contraseña y anuncia errores. Configuración permite navegar pestañas con flechas, Home y End sin perder foco en el lector.

## Definiciones de datos

- Neto, productos y margen del resumen mensual se calculan por fecha del movimiento: venta completada positiva, devolución confirmada negativa. Una devolución de octubre de una venta de septiembre pertenece a octubre. Una devolución posterior no reescribe septiembre.
- Se conservan nombre, categoría y costo históricos de cada línea. Anulación y devolución son operaciones distintas.
- Cobertura de costo usa importe absoluto de movimientos como denominador; neto cubierto, costo y margen conservan signo. Margen bruto conocido no es ganancia neta.
- La serie diaria anterior conserva las fechas y duración de su mes. Los días sin equivalente aparecen como tales; la comparación del indicador sigue siendo contra el tramo anterior equivalente.
- La dona usa importe neto del universo completo, Top 5 + Otros. No dibuja porcentajes cuando existen valores negativos. Unidades y kilos no se suman en una misma medida.
- Participación de medios = importe del medio / total de pagos netos. El total puede diferir del vendido por ventas a cuenta. Cobros posteriores de deuda quedan fuera. Con importes negativos o total no positivo, se omiten porcentajes y se conserva el signo.
- Excel y el informe imprimible adoptan estas definiciones. El contrato añade `definitionVersion: 2`; los informes guardados existentes se leen sin modificarlos.
- El acceso al histórico filtra ventas completadas del día; sus filas no incluyen por sí solas devoluciones del día provenientes de ventas anteriores. El gráfico mantiene su alcance de movimientos explícito.

## Verificación

- Suite global: **78 archivos, 288 pruebas aprobadas**, con dos workers. Un primer intento con concurrencia por defecto excedió el timeout de una prueba de seguridad; pasó aislada y en la suite completa posterior. No se cambió el timeout ni se debilitó el control.
- TypeScript, ESLint, compilación web, API y Electron: aprobados.
- Circuitos web en bases aisladas: selección Excel entre búsquedas, alta de producto, lector, venta y pago mixto, compra, promociones, cuentas, inicio, menú y permisos. Resultados cubre teclado, celular, mes vacío, comparación febrero/enero y negativos fuera del Top 5.
- Revisión visual de capturas de Resultados, Productos, Stock, Configuración, Usuarios, Turnos, actividad y respaldos en escritorio y celular. Las capturas se generan en `tmp/frontend-*.png` y `test-results/`, excluidos de Git. Son escenarios de prueba, no movimientos creados en la demo.
- Contraste medido: textos del gráfico `#586872` sobre blanco 5,8:1; pestaña activa `#66491d` sobre `#f5ecdc` 7,1:1; acción blanca sobre `#795824` 6,5:1. Los valores exactos se calculan con luminancia relativa WCAG.

El servidor local sigue en http://localhost:3087/. No se resembró ni se borró la base de cinco meses; las pruebas usaron bases temporales y puertos 3487–3502. La rama existente `codex/desarrollo` se conservó para cumplir la publicación solicitada.

## Límites de esta revisión

La verificación responsive incluye escritorio y celular, más los anchos intermedios del caso de Resultados. No constituye una certificación exhaustiva de accesibilidad de todos los diálogos a zoom 200%. La selección directamente en el catálogo se conserva; los demás exportadores mantienen su selector existente. Esta entrega no cambia ese contrato general de exportación.
