# Perla Negra — backend web

Backend implementado en TypeScript/Fastify, con SQLite central y migraciones hasta versión 23. La API, la base y la recuperación están conectadas a la interfaz React web. El alcance funcional aprobado hasta la etapa 023 está implementado. La publicación requiere configurar el servidor y el dominio reales.

## Alcance entregado

- Productos por unidad o kilogramo, códigos de barras, búsqueda, edición/inactivación e importación CSV con revisión previa.
- Stock inicial, conteos, ingresos, mermas, mínimos e historial; revisiones para evitar sobrescribir cambios de otro usuario.
- Borrador por usuario, descuentos, calculadora de peso, pagos combinados, efectivo recibido y vuelto.
- Ventas atómicas: cabecera, detalle histórico, pagos, stock y auditoría se confirman juntos. Los reintentos con la misma clave no duplican la venta.
- Histórico, detalle y anulación con reposición de stock. Las devoluciones de efectivo se registran en la caja abierta actual; un cierre anterior permanece intacto.
- Resumen mensual: importe vendido, medios de pago, productos más vendidos y alertas de stock.
- Categorías, marcas, etiquetas internas y cambios masivos de precios con historial.
- Promociones automáticas por porcentaje, cantidad, precio escalonado o combo; el servidor vuelve a calcularlas al cobrar.
- Proveedores, compras, costo promedio o de referencia, margen bruto y cuenta de proveedores.
- Clientes opcionales, límite de crédito, ventas a cuenta, cobros y movimientos históricos.
- Devoluciones parciales, reintegros, lotes, vencimientos y destino físico de la mercadería.
- Varias ubicaciones, terminal asignada, traslados en tránsito, recepción con diferencias y resumen consolidado por local.
- Notificaciones operativas y comparación de períodos.
- Usuarios y roles, terminales de caja, apertura, ingresos/retiros con motivo, cierre y diferencia de arqueo.
- Consulta de auditoría y exportaciones CSV compatibles con Excel.
- Copias cifradas, descarga/carga, restauración web y recuperación privada cuando la base no puede abrirse.

Sistema interno: no emite comprobantes fiscales, no integra ARCA ni procesa pagos bancarios.

## Arquitectura y límites

Un comercio, una o varias ubicaciones y **una instancia API activa**. SQLite vive en `/data/bocha.sqlite`, en disco local del servidor y volumen persistente; nunca en el navegador ni en una unidad de red. WAL, claves foráneas, `trusted_schema=OFF`, sincronización FULL y transacciones coordinan la persistencia. Un worker ejecuta SQL, scrypt y backups; la atención HTTP queda separada.

Un bloqueo de sistema sobre una base auxiliar impide iniciar otro servicio o una administración privada contra los mismos archivos. Se libera al cerrar o terminar el proceso. Durante la restauración conserva la exclusión aunque cambie el archivo principal.

La conexión es HTTPS del mismo origen. El navegador requiere conexión para confirmar una venta. Un timeout no significa que se haya cancelado: consultar la clave de operación y reintentar con la misma clave y datos. Cola máxima de 64 operaciones pendientes; solicitudes normales hasta 10 MiB, backups hasta 128 MiB, timeout de confirmación de 60 segundos. La cola conserva el lugar de una operación que venció hasta recibir su respuesta.

Para varios comercios o varias réplicas API, corresponde cambiar persistencia y aislamiento antes de escalar. Esta entrega no incluye sincronización offline.

## Seguridad implementada

| Control | Comportamiento |
|---|---|
| Sesión | Cookie `__Host-bocha` en producción: Secure, HttpOnly, SameSite=Strict, Path=/ y sin Domain. Token aleatorio de 256 bits; solo su hash en SQL. |
| Vigencia | 8 horas absolutas y 30 minutos de inactividad por defecto; ambos valores son configurables con límites seguros. La cookie y SQL usan la misma duración máxima. Nuevo ingreso revoca la sesión anterior del usuario. |
| Revocación | Cambios de cuenta/contraseña y restauración invalidan sesiones; se impide desactivar el último jefe o administrador activo. |
| Solicitudes | Origin y Host exactos; CSRF HMAC ligado a la sesión en cada escritura; cuerpos y filtros estrictos. Sin CORS abierto ni RPC público. |
| Permisos | Verificados en servidor; borrador y ventas del vendedor controlan propietario. Caja de la sesión y turno abierto se verifican al vender. |
| Contraseñas | scrypt N=131072, r=8, p=1, sal aleatoria y comparación de tiempo constante. Cuentas comunes: 8 caracteres, una mayúscula y un símbolo. Administrador: 16 caracteres, mayúscula, minúscula, número y símbolo. Los hashes no se pueden leer; una clave se restablece, nunca se revela. |
| Abuso | Límites por IP (300/minuto; login 5/minuto) y por cuenta. Cinco intentos fallidos bloquean un minuto; los siguientes dentro de 15 minutos escalan a 2, 4, 8 y hasta 15 minutos. Jefe o Administrador pueden destrabar una cuenta desde Usuarios, con auditoría. Proxy confiable configurado por IP/red explícita. |
| Datos | SQL parametrizado, importaciones acotadas, precios históricos, enteros en centavos y gramos; CSV neutraliza fórmulas. |
| HTTP | Cabeceras de Helmet, no-store, errores sin stack ni SQL; logs redactan cookies, credenciales y CSRF. Los ingresos exitosos quedan en auditoría. |
| Operación | Alta inicial y recuperación de acceso solo por CLI privada, contraseña por stdin; contenedor no root, filesystem de aplicación de solo lectura, capacidades eliminadas y API sin puerto público. |
| Backups | AES-256-GCM, clave externa, checksum, esquema/migraciones, integridad y claves foráneas verificados antes de alterar la base. |

Vendedor: Caja, catálogo activo necesario para vender y su turno. Supervisor: productos, stock, histórico y cierres; sin dashboard, administración de usuarios ni exportación global. Jefe: todos los módulos del comercio, backups y desbloqueo de cuentas. Administrador del sistema: todos los accesos, gestión de perfiles y contraseñas mediante restablecimiento; se crea desde la CLI privada con `admin:create`.

## Contrato para la interfaz

Prefijo `/api/v1`. JSON exitoso: `{ "ok": true, "value": ... }`; error: `{ "ok": false, "error": { "code": "...", "message": "...", "retryable": false } }`.

Errores principales: 400 datos inválidos; 401 sesión/credenciales; 403 permiso/origen/CSRF; 404 inexistente; 409 revisión/stock/idempotencia/backup; 429 límite; 503 servicio ocupado/disco; 500 fallo inesperado. Descargas de backup y exportaciones devuelven contenido binario/CSV, no el envoltorio JSON.

Después de login o al iniciar la pantalla, guardar **solo en memoria** `value.csrfToken`. Usar `credentials: 'same-origin'` y `x-csrf-token` en escrituras. La cookie se maneja automáticamente y nunca se expone en JSON. `GET /auth/session` permite recuperar el CSRF después de recargar o reiniciar el servidor. 401 exige ingresar nuevamente.

| Módulo | Rutas |
|---|---|
| Sesión | POST `/auth/login`, GET `/auth/session`, POST `/auth/logout`, `/auth/password`, `/auth/unlock-user`, `/auth/terminal` |
| Usuarios | GET/POST `/users` |
| Productos | GET/POST `/products`, GET `/products/:id`, POST `/products/active`, GET `/barcodes/:barcode`, POST `/products/import/preview` y `/products/import/apply` |
| Caja | GET/PUT `/checkout/draft`, POST `/checkout/cancel`, `/checkout/calculate-weight` |
| Ventas | GET/POST `/sales`, GET `/sales/by-key/:key`, `/sales/:id`, `/sales/:id/void-preview`; POST `/sales/void` |
| Devoluciones | GET `/sales/:id/return-preview`, `/sales/:id/returns`; POST `/sales/returns` |
| Stock | GET `/stock`, `/stock/low`, `/stock/:id`, `/stock/:id/movements`, `/stock/operations/:key`; POST `/stock/opening`, `/stock/count`, `/stock/movement` |
| Compras y proveedores | GET/POST `/suppliers`, `/purchases`; GET `/suppliers/:id/account`; POST `/supplier-payments` y `/purchases/void` |
| Clientes | GET/POST `/customers`; GET `/customers/:id/account`; POST `/customer-collections`, `/customers/credit` |
| Promociones y precios | GET/POST `/promotions`; POST `/sales/quote`, `/pricing/preview`, `/pricing/confirm` |
| Ubicaciones | GET/POST `/locations`; POST `/locations/terminal`; GET/POST `/transfers`; POST `/transfers/receive`, `/transfers/cancel` |
| Resumen | GET `/dashboard/monthly?month=AAAA-MM`, `/dashboard/comparison`, `/locations/summary?month=AAAA-MM` |
| Administración | GET/PUT `/settings`, GET/POST `/terminals`, GET `/terminals/active` |
| Turnos | GET `/cash/current?terminalId=UUID`, `/cash/shifts`, `/cash/detail?shiftId=UUID`; POST `/cash/open`, `/cash/close`, `/cash/movement` |
| Auditoría/exportación | GET `/audit`, `/exports/products`, `/exports/sales`, `/exports/stock` |
| Copias | GET/POST `/backups`, GET `/backups/:id/download`; POST `/backups/upload`, `/backups/:id/preview`, `/backups/restore` |
| Salud | GET `/health` (público, no revela datos del negocio) |

Los contratos de cuerpos están en `src/shared/requests.ts`, `catalog.ts`, `stock.ts`, `sales.ts`, `auth.ts`, `reports.ts`, `operations.ts` y `web.ts`; todos rechazan propiedades desconocidas. GET convierte `limit`/`offset` a números y `activeOnly`/`includeInactive` a booleanos. Productos, stock y ventas tienen límite por defecto 50; cursors vienen de la respuesta, sin modificarlos. Los filtros por fechas usan `AAAA-MM-DD`; fechas de venta se interpretan en Argentina.

Operaciones específicas web:

```json
{ "terminalId": "UUID" }
```

POST `/auth/terminal` selecciona una terminal activa. GET `/auth/session` devuelve `terminalId` para recuperar la selección; el detalle de venta incluye `terminalId` y `registerShiftId`. Después abrir caja:

```json
{ "terminalId": "UUID", "openingCashCents": 100000, "operationKey": "UUID" }
```

Calculadora POST `/checkout/calculate-weight`:

```json
{ "productId": "UUID", "weight": "0,250", "unit": "KG" }
```

También acepta `unit: "GRAM"` y peso entero; devuelve gramos, precio vigente, revisión e importe. El servidor vuelve a validar precio, revisión y stock al finalizar; la calculadora no confirma una venta.

Importación preview: `{ "sourceName": "productos.csv", "content": "CSV UTF-8..." }`. Confirmar con el contrato ApplyImportSchema. Descargar plantilla de `resources/productos-ejemplo.csv` desde la futura interfaz.

El scanner USB se configura como teclado USB HID y envía Enter al finalizar. No requiere controlador propio del backend. La interfaz captura el código como texto, conserva ceros iniciales, mantiene el foco al terminar y usa una caché breve para escaneos consecutivos. Los productos sin código comercial reciben un código interno válido e imprimible. Los lectores de balanza que codifican precio o peso dentro del código requieren configurar su formato antes de interpretarlos.

## Backups y recuperación

Una copia semanal los sábados según Buenos Aires, comprobada al iniciar y cada minuto; se conservan las últimas dos copias de esta programación. `BOCHA_AUTO_BACKUP_ENABLED=false` la desactiva; `BOCHA_AUTO_BACKUP_RETENTION` y `BOCHA_AUTO_BACKUP_TIMEZONE` ajustan cantidad y zona. Si el servidor permanece apagado todo el sábado, se espera al siguiente. La interfaz muestra «Semanal · sábados»; el formato conserva DAILY con la marca WEEKLY_SATURDAY. Manuales, PRE_RESTORE y DAILY antiguas sin marca no se eliminan con esa retención. La copia online captura un SQLite consistente; manifest y datos quedan cifrados juntos. Guardar periódicamente una descarga **fuera del servidor**. La clave debe conservarse por separado, fuera del repositorio y del servidor; sin ella no se puede recuperar una copia cifrada.

Los checkpoints internos previos a una migración se conservan como SQLite dentro del volumen privado (`migration-backups`); las copias descargables DAILY/MANUAL/PRE_RESTORE usan el formato cifrado. El volumen de datos del contenedor pertenece al usuario de la aplicación y su carpeta tiene permisos 700.

Restauración web:

1. Jefe descarga o carga una copia (`application/octet-stream`, hasta 128 MiB).
2. POST `/backups/:id/preview` con `{}`. Recibe `previewToken`; válido cinco minutos, ligado al usuario, archivo y estado de datos.
3. Resolver carritos pendientes. POST `/backups/restore` con `{ "previewToken": "...", "currentPassword": "..." }`.
4. Se crea copia previa, se valida el candidato, se cierra/checkpoint la base y se sustituye con journal durable. Si falla o hay un corte antes del commit, se recupera la anterior al iniciar.
5. Se revocan todas las sesiones; ingresar nuevamente con las cuentas de la copia recuperada. Los cambios posteriores a esa copia se reemplazan por su estado histórico.

Recuperación privada con base dañada/ausente: detener API, cargar copia cifrada al volumen y ejecutar `restore:offline`. El bloqueo comprueba que no haya otro servicio usando los archivos. Se valida antes del reemplazo y se preserva el original y WAL en `.offline-original`. Un corte se recupera mediante journal. Si existe un original previo preservado, archivarlo antes de otra recuperación.

La ubicación externa concreta para almacenamiento automático se configura al contratar el hosting; ahora están implementadas descarga y recuperación independiente del servidor. No se considera backup externo una segunda carpeta del mismo volumen.

## Desarrollo y despliegue

```powershell
npm run build:api
# Definir BOCHA_BACKUP_KEY (64 caracteres hex aleatorios) y, si corresponde, BOCHA_PUBLIC_ORIGIN.
npm run admin:api -- owner:create --username jefe --name "Perla Negra" --password-stdin
npm run start:api
```

El comando de alta recibe la contraseña por stdin, no como argumento. Ejecutarlo con el servicio detenido. Para desarrollo, origen por defecto `http://localhost:3000`, archivos `.data/web/`. `.data` y secretos se ignoran en Git. El frontend de desarrollo deberá usar proxy `/api` al servidor para conservar el mismo origen.

El perfil técnico se crea una sola vez desde el servidor, nunca desde una pantalla pública. Requiere una contraseña de 16 caracteres con mayúscula, minúscula, número y símbolo:

```powershell
$adminPassword = Read-Host 'Contraseña del administrador' -MaskInput
$adminPassword | docker compose -f compose.production.yaml run --rm -T api node dist/api/cli.cjs admin:create --username agus-admin --name "Agus" --password-stdin
Remove-Variable adminPassword
```

Si se pierde su acceso, usar `admin:recover --username agus-admin --password-stdin` con la misma política reforzada. `owner:recover` solo recupera perfiles Jefe y no puede modificar al Administrador.

Producción: copiar `.env.production.example` a `.env`, generar clave aleatoria, definir dominio/DNS y conservar clave externamente. Puertos públicos 80/443 para gateway; API solo red interna. La IP del gateway es `172.29.70.2`, único proxy confiable; adaptar ambos valores si esa red se superpone con la infraestructura.

```powershell
docker compose -f compose.production.yaml build api
$ownerPassword = Read-Host 'Contraseña del jefe' -MaskInput
$ownerPassword | docker compose -f compose.production.yaml run --rm -T api node dist/api/cli.cjs owner:create --username jefe --name "Perla Negra" --password-stdin
Remove-Variable ownerPassword
docker compose -f compose.production.yaml up -d
```

Caddy configura certificados y redirección HTTPS para un dominio con DNS correcto y puertos accesibles ([documentación](https://caddyserver.com/docs/automatic-https)). Esta tarea prepara y prueba los artefactos: **no publica un dominio ni configura infraestructura real**. El gateway sirve la API y la interfaz web desde el mismo origen.

Para recuperación de acceso: detener API y ejecutar `owner:recover --username jefe --password-stdin` mediante el mismo contenedor privado; revoca sesiones. Para recuperación de datos:

```powershell
docker compose -f compose.production.yaml stop api
docker compose -f compose.production.yaml run --rm -T api node dist/api/cli.cjs restore:offline --service-stopped --file /data/recuperacion.bocha
docker compose -f compose.production.yaml up -d api
```

No usar `down -v`: elimina el volumen. Mantener actualizaciones de dependencias, sistema operativo y controles de acceso del hosting durante mantenimiento.

## Evidencia de verificación

Pruebas reales de SQL/HTTP y worker: roles, CSRF/origin, límites de login con proxy falsificado, expiración/refresco/revocación, pesos, ventas concurrentes idempotentes, stock, arqueo, devolución después de cierre, descarga/carga y restauración con revocación.

Pruebas de backups: cifrado alterado/clave incorrecta, esquema/FK, invalidación de preview, carritos, rollback/reapertura, journal interrumpido, base corrupta/ausente y retención. Prueba Docker: aplicación de solo lectura/no root, CLI privada, login, CRUD, copia cifrada y persistencia tras reinicio.

Comandos: `npm run check`, `npm run test:e2e`, `docker build -f Dockerfile.api -t el-bocha-api:dev .`, `node scripts/smoke-api-container.mjs`. La prueba de contenedor utiliza datos, secretos y volumen temporales propios; no toca datos reales.

## Cierre funcional — 18/09/2026

- Arqueo verificado para faltantes, sobrantes y cierres sin diferencia. Las cajas abiertas no tienen diferencia hasta registrar el efectivo contado. Turnos muestra también el efectivo esperado del cierre.
- Filtros de turnos y auditoría corregidos al día argentino (UTC−3), incluyendo operaciones nocturnas.
- Exportación de productos ordenada por nombre normalizado, nombre e identificador como desempate estable entre partes. Columnas en español, precio en pesos con coma decimal, UTF-8 con BOM, separador punto y coma y protección contra fórmulas. El período selecciona productos modificados, no todo el catálogo independientemente de la fecha. Este archivo de consulta no es la plantilla de importación ni un backup.
- Ayuda incorporada a la web para todos los roles, con búsqueda y apartados según los módulos habilitados. No agrega permisos ni endpoints públicos.
- Desarrollo local: proxy limitado a `/api/`, evitando que intercepte el módulo de interfaz `api.ts`.
- Caja rápida: durante una venta, el scanner conserva por dos segundos los productos ya resueltos y evita consultas repetidas. Un cobro inmediato confirma la venta sin esperar un autosave pendiente; SQLite valida producto, precio, stock y pago en la transacción final. Referencia local con 4.000 productos: búsqueda por código p95 0,05 ms; venta con stock p95 1,01 ms. La latencia de red y el scanner físico deben medirse en la PC del comercio.
- Validación al 05/10/2026: `npm run check` (61 archivos, 203 pruebas, tipos, lint y compilaciones); `npm run test:web` (5 recorridos reales). El resumen de cinco ubicaciones con 4.000 productos y 20.000 saldos locales midió 16,97 ms p95 en el entorno de desarrollo.

Para publicar faltan datos de infraestructura: servidor, dominio, DNS, secretos de producción y ubicación externa de las copias. No deben trasladarse cuentas ni ventas de la demo al comercio real. La clave de cifrado debe conservarse fuera del servidor para recuperar las copias ante pérdida del equipo.
