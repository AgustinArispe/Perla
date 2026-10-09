# UI/UX 033 — Línea de base

Fecha: 7 octubre 2026. Implementación iniciada sobre la rama existente `feature/web-frontend`, en la versión local indicada por Agus. Los cambios anteriores se conservan; no se crean commits mezclados.

Registro inicial: `output/auditoria-frontend/2026-10-07`. La revisión estática y las imágenes confirman resultados de búsqueda de Caja sin composición, exceso de destinos y pesos visuales repetidos. El comportamiento de selección y de dimensiones se valida con pruebas y revisión del navegador.

## Fechas y contadores

- Mensual contiene fechas efectivas y comparación del mes anterior en `MonthlyReport.period`. `ComparisonRequest CUSTOM` compara el intervalo inmediatamente anterior de igual duración. No son la misma comparación: el KPI mensual usa MonthlyReport; el explorador usa la respuesta CUSTOM y exporta ese mismo intervalo.
- Excel de comparación hasta ahora recibía preset MONTH aunque la pantalla pudiera presentar MonthlyReport de un mes pasado. Se agrega regresión antes de corregir su alcance.
- La campana usa no leídos; no debe rotularlos como incidencias sin resolver.
- Listas de stock actuales y datos comerciales históricos tienen fechas distintas. La nueva composición los separa explícitamente.
- No se igualan contadores de Inicio y Stock sin verificar el conjunto de registros/ubicaciones que cuentan.

## Seguridad del trabajo

La demo en 3087 conserva su base de cinco meses. Tests web usan servidores propios y bases desechables. Puertos 3287–3294 reservados al agente de componentes durante su ejecución; las verificaciones adicionales se programan al terminar o con otro rango libre.

Los archivos visuales pueden ser fullPage y por ello muy altos. No se utiliza el tamaño de una miniatura como prueba de ancho de campo o del modal. Se revisa el resultado construido en dimensiones controladas.

## Evidencia inicial

La búsqueda de ayuda por scanner/fiado y términos invertidos falló en tres pruebas de regresión. Se corrigió con normalización/sinónimos compartidos entre filtro de temas y secciones; las tres pruebas pasan. El resto de la implementación se registra en informes por responsabilidad y en la verificación final.
