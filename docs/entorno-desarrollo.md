# Entorno de desarrollo

[Comprobaciones realizadas](verificacion-entorno.md).

## Arranque rápido

En PowerShell, desde `C:\Proyectos\GestionProductos`:

```powershell
# Aplicación de escritorio, con SQLite real y recarga automática
npm run dev

# Alternativa: interfaz React en Docker
npm run docker:up
# Abrir http://localhost:5173
```

La pantalla inicial enumera los módulos pendientes. En escritorio muestra el estado
de la conexión real a SQLite; el navegador muestra una vista previa sin acceso a
la base. Caja, catálogo, stock, productos por peso, histórico, dashboard y backups
siguen pendientes en sus respectivas specs.

## Herramientas y dependencias

- Node 24 LTS, npm 11, Git y Docker Desktop con motor Linux y Compose.
- React 19, TypeScript strict y Vite 7; Electron 44 para escritorio Windows x64.
- SQLite mediante better-sqlite3 13, SQL explícito y migraciones versionadas.
- Zod para contratos, TanStack Query para consultas y Zustand para el futuro carrito.
- Vitest, Playwright, ESLint, Prettier y electron-builder.
- GitHub Spec Kit 1.0.7 ya instalado en `.tools/spec-kit`; [uso y reinstalación](spec-kit.md).

Versiones exactas en `package.json` y `package-lock.json`. Vite 7 mantiene la
compatibilidad declarada por electron-vite 5; no actualizar paquetes de compilación
por separado sin revisar sus dependencias compatibles. La imagen Node tiene versión
y digest fijados. Cambiar `.nvmrc` y Dockerfile juntos al actualizar Node.

Para reconstruir las dependencias en esta PC:

```powershell
.\scripts\setup.ps1
# Si sólo necesitás escritorio y Docker no está abierto:
.\scripts\setup.ps1 -SkipDockerCheck
# Sólo dependencias, desde cualquier terminal:
npm run setup
```

La instalación comprueba SQLite en Node y Electron. better-sqlite3 13 usa Node-API
y trae binarios para Windows x64 y Linux x64, evitando recompilar en estos entornos.
No se requiere Visual Studio ni un servidor SQL separado. El primer arranque puede
descargar Electron; las descargas requieren internet, la aplicación final funciona offline.
[Cambio oficial del driver](https://github.com/WiseLibs/better-sqlite3/releases/tag/v13.0.0).

El proyecto desactiva los scripts automáticos de dependencias y ejecuta una
comprobación explícita propia después de instalar. Esto evita que `npm ci` intente
recompilar SQLite por un [defecto documentado de npm](https://github.com/npm/cli/pull/9859).
Usar `npm run setup` o `scripts/setup.ps1` para instalar y comprobar en un solo paso.

## Docker

```powershell
docker compose up --build -d --wait web
docker compose logs -f web
npm run docker:check
npm run docker:down
```

`web` publica Vite en `127.0.0.1:5173`, con recarga al editar archivos. Usa polling
para detectar cambios desde Windows. `check` corre tipos, lint, pruebas SQLite y
compilaciones. Cada servicio usa su propio volumen de `node_modules` Linux; las
dependencias Windows permanecen en el host. El entrypoint compara el lockfile y
actualiza el volumen cuando cambian las dependencias.

Electron usa su propio Vite en `127.0.0.1:5174`, para poder correr junto a Docker.

Docker se usa para desarrollo y comprobaciones. Electron, scanner USB y empaquetado
se ejecutan en Windows. El cliente recibirá un instalador de escritorio y no tendrá
que instalar Docker ni Node. El scanner HID se prueba como teclado con sufijo Enter;
[configuración y pruebas físicas pendientes](scanner-y-peso.md).

## Comprobaciones

```powershell
npm run check           # tipos, lint, SQLite y builds
npm run format:check
npm run native:check    # SQLite en Node y Electron
npm run test:e2e        # abre Electron dos veces con base temporal
```

Los tests verifican persistencia, migración aplicada una sola vez, rollback de una
transacción fallida, apertura del escritorio y aislamiento de renderer. Las pruebas
usan carpetas temporales y no modifican los datos del comercio. No requieren descargar
Chromium de Playwright: el test de escritorio usa el Chromium incluido en Electron.
El workflow GitHub Actions verifica Windows y Docker al subir el repositorio.

## Datos locales

| Entorno | Ruta |
|---|---|
| Desarrollo | `%APPDATA%\ElBochaPOS-dev\data\bocha.sqlite` |
| Aplicación empaquetada | `%APPDATA%\ElBochaPOS\data\bocha.sqlite` |
| Tests | Carpeta temporal aislada y eliminada al terminar |

SQLite se abre en un worker para no bloquear la interfaz. WAL, claves foráneas,
`synchronous=FULL` y espera de bloqueo de 5 segundos están configurados. La migración
inicial incluye únicamente configuración y registro de versiones; las tablas de
negocio se agregarán con las specs correspondientes. No hay productos ficticios ni
ventas de prueba en las bases del comercio.

## Empaquetado Windows

```powershell
npm run pack:win        # release/win-unpacked/El Bocha POS.exe
npm run test:packaged   # abre el ejecutable empaquetado y comprueba SQLite
npm run dist:win        # genera instalador NSIS en release/
```

El empaquetado incluye el worker y los binarios SQLite fuera del archivo ASAR.
La entrega comercial requerirá completar los módulos, identidad visual, prueba
en la PC de caja y restauración de backups. Este scaffold no es una versión para
operar el almacén ni un instalador firmado para distribución pública.

## Fuentes técnicas

[electron-vite](https://electron-vite.org/guide/),
[módulos nativos de Electron](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules),
[Docker Compose](https://docs.docker.com/compose/).
