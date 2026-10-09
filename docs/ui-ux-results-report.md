# Resultados mensuales y semanales — T08

## Cambios

Resumen mensual con cabecera única de mes y exportación agrupada (Excel del resumen, pagos, productos y margen; PDF). Máximo cuatro métricas: vendido neto con comparación mensual, ventas, ticket y margen conocido cuando la función está habilitada. Cobertura parcial visible; el margen sigue distinguiéndose de la ganancia neta. Detalle de costos, productos y categorías bajo demanda.

Exploración explícita de períodos con fechas propias. Al abrir desde un mes histórico usa sus fechas exactas, consulta CUSTOM y exporta el mismo tramo. Los presets de exploración también exportan las fechas resueltas, evitando volver a resolver Hoy/Semana/Mes al descargar. La comparación del KPI mensual sigue usando mes calendario anterior; la exploración indica que compara con el tramo inmediatamente anterior de igual duración.

Pagos en filas con importe y participación, operaciones desplegables y explicación de pagos mixtos. Ranking de cinco productos por criterio, conservando unidades y kilos separados. Descuentos/anulaciones en desglose. Se retiraron las tarjetas de reposición y depósitos del resumen histórico; queda acceso secundario al inventario actual con fecha. El PDF también identifica explícitamente la reposición actual.

Gráfico con ancho completo, teclado y tabla diaria incluso en meses vacíos. Dominio temporal visible, días futuros fuera del informe en mes actual, ceros provistos por el servidor conservados. Días con neto negativo usan altura absoluta, signo y explicación; las cifras exactas permanecen en botones y tabla. Valores monetarios finales sin animación inicial ni importes intermedios.

Semanal conserva consulta guardada/en vivo, versiones, exportación de versión seleccionada y recálculo que crea otra versión. Metadatos, versiones y recálculo se despliegan bajo demanda; cuatro métricas con ticket y cobertura contextual en margen. Pendientes siguen siendo los guardados al generar.

## Verificación

- Regresión nueva `dashboard-comparison-export.test.ts` falló antes del cambio: recibía preset MONTH en vez de febrero histórico y fechas exactas. Pasa después.
- Vitest de regresión, períodos y conciliación mensual: 3 archivos, 5 pruebas aprobadas. Sin cambiar expectativas monetarias.
- Typecheck y ESLint específico de archivos modificados aprobados.
- Build web aprobado y prueba Playwright dashboard aprobada en puertos temporales 4087–4094: mes elegido, exploración histórica, teclado, valores, 390/1440 px, sin overflow; semanal guardado, cuatro métricas y recálculo visible solo bajo demanda sin ejecutarlo.
- Capturas completas revisadas: `tmp/results-1440.png`, `tmp/results-390.png`, `tmp/weekly-1440.png`, `tmp/weekly-390.png`. Se detectó y corrigió contraste del neto (heredaba verde oscuro sobre navy). Dominio temporal del gráfico queda visible.
- Se comunicaron dos hallazgos externos al ownership: botón de colapso flotante sobre contenido móvil y texto de sidebar ausente en captura semanal inmediatamente posterior al cambio de ancho.
- La prueba Electron mensual quedó adaptada a navegación nueva y pagos/desglose; no se ejecutó en esta subetapa. La conciliación monetaria de integración sí se ejecutó. PDF conserva datos y JSX verificado por typecheck; impresión física no probada.

## Alcance y recuperación

No se modificaron consultas de negocio ni datos demo. Las pruebas de conciliación usan bases temporales. Durante edición se truncó accidentalmente pulse.css por un error de codificación; se recuperó la copia exacta anterior desde un archivo leído en MareaMac, verificando que su minificación de 16.517 caracteres estaba íntegra en el bundle Electron previo. MareaMac no recibió cambios. Tras recuperar, se editó únicamente el bloque de composición mensual/semanal de pulse.css.
