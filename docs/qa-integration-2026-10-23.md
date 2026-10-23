# Integración y verificación — 23 de octubre de 2026

Se integró la consolidación del esquema v35 (84 → 60 tablas) y la programación
semanal de backups con el commit remoto `0a89cd2`, que mantiene la creación y
el listado de copias con procesamiento por streams. La programación espera el
listado asíncrono y conserva la validación de la marca semanal autenticada.
Se conservaron las pruebas de backups históricos y de invalidación de caché
cuando se altera el archivo cifrado.

También se recuperaron del chat «Editar Perla» los cambios de errores HTTP
(500 para errores internos, sin revelar detalles), rechazo del arranque si
el worker termina antes de estar disponible, sus pruebas y la separación de
los escenarios de seguridad por cuenta y red compartida. Se actualizaron
Fastify a 5.12.7 e ip-address a 10.7.4.

## Resultados sobre la versión combinada

Entorno Linux, Node 24.19.0. Bases temporales, sin tocar datos de producción.

| Comprobación | Resultado |
| --- | --- |
| `npm test -- --maxWorkers=1` | 421 pruebas aprobadas, 82 archivos, 146,51 segundos |
| `npm run typecheck` | Correcto |
| `npm run lint` | Correcto |
| `npm run build` | Correcto |
| `npm run build:web` | Correcto |
| API compilada por `npm test` | Correcto |
| `npm audit --omit=dev` | 0 vulnerabilidades conocidas |
| `git diff --check` | Correcto |
| `npm run benchmark:queries` | Correcto; equivalencia de resultados comprobada |

La base sintética de consultas contiene 4.004 productos, 24.000 ventas y
96.000 líneas. Tiene 60 tablas propias, `integrity_check=ok` y ninguna
violación de claves foráneas. Medianas locales: catálogo 0,33 ms, búsqueda
8,09 ms, inicio 17,74 ms, precios 87,24 ms y mensual 90,84 ms. No representan
tiempos de red ni mediciones del servicio de Railway.

Las pruebas incluyen migraciones desde versiones anteriores, rollback,
restauración online/offline, retención semanal, desactivación, permisos,
ventas, compras, stock y cuentas. No se ejecutó la suite de navegador
(Chromium no está instalado), ni empaquetado Windows ni pruebas Docker.
La API de GitHub no está accesible desde este entorno para consultar CI;
los comandos Git de lectura sí funcionan. La publicación y el estado de
Railway deben distinguirse del resultado local: este informe no acredita
que el servicio publicado haya aplicado las migraciones.
