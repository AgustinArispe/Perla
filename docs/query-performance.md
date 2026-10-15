# Consultas SQLite: diagnóstico y verificación

La [revisión de esquema v31](schema-audit.md) incorpora una segunda mejora de
Inicio. El benchmark actual incluye `homeBeforeSummaryOptimization` para medir
la ruta de v30 sobre los mismos datos que la ruta optimizada `home`.

La migración 030 agrega índices, sin modificar artículos, usuarios, contraseñas,
ventas ni cálculos. Usa el mecanismo existente de respaldo e integridad previo a
migrar una base persistente. Se aplica automáticamente al iniciar la nueva versión;
el primer arranque necesita tiempo y espacio para ese respaldo y los índices.

## Cuello de botella

Inicio obtiene las alertas de Revisión de precios. Esa revisión calcula, para cada
artículo, la última versión y fecha del historial de precios. Sin índices por
`product_id`, esas subconsultas recorren repetidamente el historial completo.

Se agregan índices por artículo/versión y artículo/fecha. Son distintos porque el
orden de inserción no necesariamente coincide con el cronológico. También se
indexan estado/fecha de ventas y devoluciones, usados por indicadores y reportes.
No se cambian permisos, conciliaciones, filtros ni el descuento de devoluciones.

## Reproducir

```sh
npm run benchmark:queries -- --baseline
npm run benchmark:queries
```

Cada ejecución crea su propia base sintética en `.data/query-benchmarks/run-*`.
Nunca abre la base activa ni usa credenciales reales. `--baseline` elimina los
cuatro índices nuevos únicamente en esa base descartable. Los datos generados y
resultados quedan fuera de Git; `results.json` guarda muestras, mediana, máximo,
versión de Node y plan de consulta.

La carga incluye 4.004 artículos, 24.000 ventas, 96.000 líneas de venta y 8.008
eventos de precios. Cada operación se ejecuta cinco veces y verifica conteos.
Estos tiempos miden el servicio y SQLite localmente: no incluyen red, descarga de
JavaScript, renderizado, límites de Railway ni una medición de la base real.

Medianas locales del 15/10/2026 con Node 24.19.0, en milisegundos:

| Operación           | Sin índices nuevos | Con índices nuevos |
| ------------------- | -----------------: | -----------------: |
| Inicio              |           1.127,83 |              92,37 |
| Revisión de precios |           1.057,90 |              82,34 |
| Reporte mensual     |              65,66 |              50,60 |

Los tiempos varían según la máquina y la carga; no son un compromiso de latencia
en producción. Catálogo y búsqueda no mostraron un cuello de botella comparable
en esta prueba (medianas menores a 8 ms), y no se alteraron sus consultas.

## Regresiones

`tests/integration/query-indexes.test.ts` verifica actualización desde v29,
conservación de datos y resultados comerciales, idempotencia, integridad y planes
que buscan por índice sin escanear las tablas. La suite general verifica también
reportes, devoluciones, stock y permisos.
