# Verificación del entorno de desarrollo · 17/09/2026

PC de desarrollo Windows x64. Node 24.13.0, npm 11.6.2, Docker Desktop
4.69.0 / Engine 29.4.0. SQLite embebido 3.53.4. Versiones de aplicación en lockfile.

| Comprobación | Resultado |
|---|---|
| `scripts/setup.ps1` | Reinstalación limpia, SQLite en Node/Electron y TypeScript correctos |
| `npm run check` | Tipos, lint, 2 tests SQLite y builds de escritorio/web correctos |
| `npm run format:check` | Sin cambios de formato pendientes |
| `docker compose up --build -d --wait web` | Imagen compilada y servicio healthy en localhost:5173 |
| `docker compose --profile tools run --rm check` | Tipos, lint, 2 tests SQLite y ambos builds correctos en Linux |
| Vista React en Edge | 6 módulos visibles, sin errores de consola; HMR probado editando desde Windows |
| `electron-vite dev` | Vite en 5174, preload aislado y SQLite en worker funcionando |
| `npm run test:e2e` | 1 test correcto: dos aperturas offline con base temporal |
| `npm run pack:win` / `npm run test:packaged` | Ejecutable Windows generado y test de apertura/SQLite correcto |
| `npm run dist:win` | Instalador NSIS de prueba generado en release/ |
| `scripts/verify-planning.py` | 8 features; enlaces, IDs y estados correctos |

Se verificó el instalador generado mediante su ejecutable empaquetado; no se ejecutó
una instalación en la PC del cliente. Scanner físico, rendimiento de Caja, stock,
cobros, reportes, actualización y restauración de backups requieren implementar
y validar sus specs. El scaffold no completa la aceptación de la feature 001.

La instalación controla los scripts de dependencias por el defecto de npm que
recompila SQLite en `npm ci`. `setup.ps1` y `npm run setup` ejecutan la comprobación
propia luego de instalar. El workflow de GitHub Actions está creado y pendiente
de ejecutarse cuando exista un repositorio remoto.
