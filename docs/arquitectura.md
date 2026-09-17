# Arquitectura propuesta

Fecha: 2026-09-17. Estado: borrador para revisión de Agus.

Scaffold instalado: [entorno de desarrollo](entorno-desarrollo.md). Docker es una
herramienta de desarrollo para la UI y checks; el escritorio se ejecuta en Windows.
better-sqlite3 13 usa binarios Node-API compartidos entre Node y Electron: el setup
comprueba ambos runtimes y no recompila este driver.

## Decisión

React + TypeScript strict + Vite para UI; Electron para escritorio Windows;
servicios de negocio en TypeScript; SQLite con `better-sqlite3` y SQL explícito.
UI por features, CSS con tokens propios y primitives accesibles de Radix cuando
corresponda, sin un framework pesado de dashboard. Zustand para carrito y estado
de caja; TanStack Query para datos persistidos. Vitest y Playwright para verificar.
Node 24 LTS para desarrollo. Fijar versiones exactas compatibles al scaffold.

No usar Next.js: no necesitamos SSR ni servidor web en producción. No mantener
FastAPI en esta versión: empaquetar un runtime extra y coordinar sus procesos no
aporta valor para una única PC. No se abre un puerto HTTP en producción.

Comparadas: Tauri + React consume menos recursos de empaquetado, pero agrega Rust
y requisitos de WebView2 en Windows. Electron facilita un stack TypeScript y una
entrega predecible. Su tamaño de instalador es mayor: velocidad operativa se mide
en la PC objetivo, no se deduce del tamaño. Preact es alternativa si una medición
identifica al renderizado como cuello de botella; no se añade esa variación ahora.

## Procesos

```text
React renderer (sandbox; sin Node, filesystem ni SQL)
  -> preload: window.bocha, funciones tipadas limitadas
  -> main Electron: IPC validado, diálogos de archivo, ciclo de vida
  -> worker de datos: comandos serializados, dominio, SQL y backups
  -> SQLite local
```

El worker posee la conexión de escritura. Evita que el API síncrono de SQLite
bloquee el main o el renderer. Una operación transaccional no hace awaits internos.
Mensajes con requestId y respuesta discriminada. Validar payload y emisor IPC;
no exponer ipcRenderer ni un `executeSql` genérico. Sin contenido remoto, permisos
de navegación o llamadas shell desde renderer. CSP local, contextIsolation y sandbox.

Datos bajo `app.getPath('userData')/data/bocha.sqlite`; borradores y settings allí.
El nombre de aplicación será estable `ElBochaPOS` para mantener ruta entre updates.
DB de desarrollo y prueba separada de producción. Windows 11 x64 objetivo inicial.

## Persistencia y rendimiento

Foreign keys ON, WAL, synchronous FULL, busy_timeout 5000 ms. Priorizar la
durabilidad de una venta frente a ahorrar un fsync. Validar la versión SQLite
embebida y el historial de correcciones WAL al fijar el driver. No DB en carpeta
de red, OneDrive o pendrive: exportar una copia consistente hacia ese destino.

Índice UNIQUE de barcode y SKU; caché de catálogo y búsqueda indexada, refrescada
al editar/importar. Límite inicial 2.000 productos, prueba de carga 10.000, 100.000
ventas, hasta 200 líneas por venta. No descargar histórico completo para reportar.
Lecturas paginadas y agregaciones SQL; si reportes pesados perjudican Caja, usar
conexión read-only en worker de informes con snapshot de lectura coherente.

Objetivos propuestos, todavía no medidos: escaneo a línea visible p95 <= 100 ms;
búsqueda p95 <= 150 ms; confirmar venta p95 <= 300 ms; dashboard mensual <= 1 s;
inicio frío <= 3 s. Medir con Windows 11, SSD, 8 GB RAM, 2.000 productos y 100.000
ventas; reportar también modelo CPU. Prueba scanner: 100 códigos a 5 lecturas/s,
cero pérdidas ni duplicados. Los fallos de disco no se ocultan tras animaciones.

## Estructura prevista

```text
src/main/             boot, ipc, preload, permisos, backup, installer hooks
src/worker/           protocolo, conexión, servicios, repositorios, migraciones
src/domain/           money, quantities, discounts, sale, inventory
src/shared/           DTOs, validación de contratos, códigos de error
src/renderer/         shell, tokens CSS, componentes, features
src/renderer/features/{products,stock,checkout,weight,history,dashboard,settings}/
tests/{unit,integration,e2e,performance}/
resources/            iconos y assets incluidos, sin CDN
specs/                documentos Spec Kit
```

## Fuentes verificadas

- [Vite](https://vite.dev/guide/) y [Node LTS](https://nodejs.org/en/about/previous-releases).
- [Electron: seguridad](https://www.electronjs.org/docs/latest/tutorial/security),
  [rendimiento](https://www.electronjs.org/docs/latest/tutorial/performance).
- [SQLite WAL](https://www.sqlite.org/wal.html), [backup](https://www.sqlite.org/backup.html).
- [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md).
- [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/).
