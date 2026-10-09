# Verificación de UI/UX — 7 de octubre de 2026

## Alcance

Versión local de Perla Negra en http://localhost:3087. Coordinación por tareas: componentes compartidos, navegación, resultados, mercadería, módulos comerciales y revisión independiente. Integración y QA final a cargo del coordinador. Se conservan la base de cinco meses y la aplicación separada para Mac.

## Cambios comprobados

- Navegación agrupada por tareas, Ayuda al pie y menú de cuenta; áreas internas para evitar destinos repetidos.
- Controles y diálogos coherentes; paleta navy/blanco/marfil con oro puntual y estados semánticos.
- Resultados sin cifras principales repetidas, comparación contextual, períodos opcionales, detalle progresivo y existencias actuales separadas de las cifras históricas.
- Formularios con menos campos iniciales; cuenta de cliente en cobro; compra recuperable; promoción con regla legible.
- Excel con alcance explícito, filtros heredados y ajuste múltiple opcional.
- Producto conserva datos al crear categorías/marcas; conteo distingue existencia y diferencia; traslado consulta disponibilidad del origen.
- Ayuda reconoce sinónimos y encuentra respuestas para «caja scanner».

## Defectos encontrados durante integración

1. Ayuda encontraba el tema pero ocultaba sus secciones al combinar «caja» y «scanner». Corregido y cubierto con prueba pura y circuito web.
2. Elegir proveedor con Enter desmontaba el buscador y dejaba foco en body. Reproducido en Chrome y en prueba de compras antes de corregir. Ahora foco en Cambiar; quitar vuelve al buscador. Comprobado manualmente en el frontend recompilado.
3. Las pruebas antiguas asumían módulos independientes y acceso directo a recuperación tras recargar. Se actualizaron para la navegación por áreas; no se relajó el login. Los circuitos usan bases aisladas por proyecto para no acumular intentos de acceso entre escenarios.

## Evidencia visual

Capturas nuevas: `output/ui-ux-implementation/2026-10-07`. Línea de base conservada: `output/auditoria-frontend/2026-10-07`.

Revisión manual de dashboard en 768, 1024, 1440 y 1920; ancho del documento dentro del viewport. Revisión previa de ubicaciones y traslado en 390. Formularios de producto y configuración revisados en escritorio. Los circuitos automatizados también cubren celular, teclado, errores y retorno de foco.

Dashboard final también revisado y capturado en 390. Contraste calculado de tokens vigentes: texto/white 13,61:1; texto secundario/white 5,77:1 y lienzo 5,24:1; blanco/acción navy 13,61:1; oro/navy 8,96:1; verde/fondo positivo 5,67:1. Son pares del sistema, no una medición exhaustiva de todos los elementos renderizados.

## Límites de esta verificación

- No se realizó prueba con personas usuarias; facilidad de uso sigue pendiente de validación humana.
- No se verificó zoom real 200%, teclado virtual ni cada diálogo en los cinco tamaños. El envío de atajos no cambió el zoom observable y no se contó como prueba.
- No se midió rendimiento antes/después con repeticiones equivalentes; no se afirma mejora cuantificada de velocidad.
- No se conectaron lector USB ni impresora físicos; el lector se simula por ráfagas de teclado y sufijo Enter.
- No se ejecutó la aplicación empaquetada de Mac ni se cambió su versión.
- Esta entrega no equivale a una auditoría de seguridad completa ni a validación visual exhaustiva de todas las áreas.

## Resultados de comandos

- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm run build:web`: exit 0; última compilación en `tmp/ui-ux-build-final.log`. Advertencia de tamaño de chunk (sin afirmar optimización del bundle).
- `npm test -- --maxWorkers=2`: 72 archivos, 262 pruebas aprobadas; 65,95 segundos. Log `tmp/ui-ux-unit-final.log`. La ejecución se hizo sin circuitos web concurrentes; no se modificó la seguridad para evitar el timeout de una ejecución anterior bajo carga.
- Circuitos web: última suite completa 21 aprobados/2 fallidos por expectativas de selectores/título anteriores; corregidos los selectores, repetición dirigida 4 aprobados (incluye los dos casos fallidos). Quedan los 23 escenarios distintos aprobados entre ambas ejecuciones; no se presenta como una única ejecución completa sin fallos. Logs `tmp/ui-ux-web-tests-final.log` y `tmp/ui-ux-web-targeted.log`.
- Prueba RED de foco de proveedor: 1 fallo esperado en `tmp/ui-ux-focus-red.log`; prueba de compras GREEN en la suite posterior, más confirmación manual en Chrome.
- Excel real de productos/usuarios comprobó archivo, importes, búsqueda y estados múltiples; integración de exportaciones comprueba categorías múltiples y estados. No se hizo una descarga visual manual con categorías múltiples en cada módulo.
- Detector Impeccable sobre resultados/compras/control/estilos operativos: sin hallazgos automáticos. No reemplaza revisión visual ni accesibilidad exhaustiva.

Los servidores de tests usaron bases desechables y puertos distintos de 3087. La demo local queda disponible. No se hicieron commits, publicación ni cambios en MareaMac.
