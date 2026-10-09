# 08. Instalación, despliegue y mantenimiento

[Volver al índice](README.md)

## 1. Entornos separados

Antes de ejecutar un comando hay que identificar qué entorno se está operando: desarrollo, pruebas automatizadas, demostración o negocio real. Cada uno necesita directorio de base y backups propio. Una variable de entorno equivocada puede hacer que un servidor correcto abra la base incorrecta.

El servidor web predeterminado usa `.data/web/bocha.sqlite`; la demostración de cinco meses tiene su script y directorio `.data/five-month-local`. Electron usa `userData` con el nombre histórico de aplicación. Los tests crean entornos propios. Ninguno debe reutilizar a ciegas la base de producción.

Las instrucciones de este capítulo son procedimientos documentados, no acciones ejecutadas durante esta entrega. No se inició un servidor público ni se restauró o sembró ninguna base al generar la documentación.

## 2. Requisitos de desarrollo

El proyecto declara Node `>=24 <25` y npm `>=11 <12`. El checkout incluye `package-lock.json`; se recomienda instalar con el procedimiento del proyecto para reproducir versiones. El componente SQLite es nativo y debe corresponder a sistema operativo, arquitectura y ABI del runtime.

Comprobaciones iniciales:

```powershell
node --version
npm --version
```

Instalación reproducible:

```powershell
npm run setup
```

Ese script ejecuta `npm ci --ignore-scripts` y después el instalador nativo controlado por el proyecto. No copiar `node_modules` de Windows a Mac, de Node a Electron o entre arquitecturas como mecanismo de instalación.

## 3. Construcción por destino

```powershell
npm run typecheck
npm run build:web
npm run build:api
```

La web compilada queda en `dist/web`; API, worker y CLI en `dist/api`. El servidor sólo registra la entrega del frontend si encuentra su `index.html`. Compilar únicamente el backend puede dejar una API saludable sin interfaz, o una interfaz de una compilación anterior.

Para Electron:

```powershell
npm run dev
npm run build
```

La construcción de escritorio no sustituye la de web. Del mismo modo, instalar una nueva copia de aplicación no significa migrar automáticamente una distribución Mac separada que no se construyó desde este checkout.

## 4. Variables del servidor

| Variable | Predeterminado / requisito | Explicación |
|---|---|---|
| `NODE_ENV` | Producción sólo con `production` | Activa exigencias de HTTPS y cookie segura |
| `BOCHA_PUBLIC_ORIGIN` | `http://localhost:3000` fuera de producción; obligatorio en producción | Origen exacto, sin path, credenciales ni comodines |
| `BOCHA_HOST` | `127.0.0.1` | Dirección de escucha |
| `BOCHA_PORT` | `3000` | Puerto entero de 1 a 65535 |
| `BOCHA_DATABASE_PATH` | `.data/web/bocha.sqlite` | Archivo de negocio |
| `BOCHA_BACKUP_DIRECTORY` | `.data/web/backups` | Directorio de copias cifradas |
| `BOCHA_BACKUP_KEY` | Obligatorio | 32 bytes aleatorios expresados en 64 caracteres hexadecimales; no admite clave cero |
| `BOCHA_TRUST_PROXY` | Sin confianza en proxy por defecto | Lista de CIDR explícitos y separados por coma |
| `BOCHA_SESSION_IDLE_MINUTES` | `30` | Entre 5 y 240 |
| `BOCHA_SESSION_MAX_HOURS` | `8` | Entre 1 y 24; mayor o igual al intervalo de inactividad |
| `BOCHA_API_URL` | `http://127.0.0.1:3000` en Vite | Destino del proxy de desarrollo, no URL pública del navegador |
| `BOCHA_USE_POLLING` | Inactivo salvo `1` | Observación de archivos para entornos donde la vigilancia normal falla |

El servidor lee `process.env`; `npm run start:api` no incorpora por sí solo un cargador genérico de `.env`. Se deben suministrar variables desde el entorno, desde Compose o mediante las opciones del runtime. Los ejemplos `.env.example` y `.env.production.example` son plantillas, no credenciales reales.

La clave de backup debe conservarse en un lugar seguro fuera del mismo disco de los respaldos. No imprimirla en logs, pegarla en un ticket o guardarla dentro de esta documentación. Generarla de nuevo en cada reinicio impediría leer copias anteriores.

## 5. Arranque web local

Con variables configuradas y builds actualizados:

```powershell
npm run start:api
```

Si se usa un archivo de entorno preparado para esa instancia, Node permite arrancar explícitamente con él:

```powershell
node --env-file=.env dist/api/index.cjs
```

El contenido del archivo debe corresponder a la instancia que se quiere iniciar. Antes de reutilizar uno existente, revisar nombres de variables y destino de datos sin publicar sus secretos. La ruta relativa se resuelve desde el directorio de trabajo.

Para desarrollo con recarga de frontend, `npm run dev:web` abre Vite en puerto 5173, con escucha `0.0.0.0`, puerto estricto y proxy `/api/`. La API suele escuchar en 3000, pero su origen público debe coincidir con el origen que usa el navegador de Vite. `changeOrigin:false` conserva el contexto de la solicitud; una configuración incoherente puede ser rechazada por Host/Origin.

Una instancia compilada que sirve frontend y API desde el mismo puerto es más simple para una demostración estable que combinar Vite y un túnel con orígenes distintos.

## 6. Base de demostración existente

`npm run demo:market:start` utiliza `scripts/start-five-month-demo.mjs`. Ese script fija localhost:3087, escucha en 127.0.0.1, usa `.data/five-month-local/pos.sqlite` y lee una clave local de su directorio. Requiere que esa base, la clave y los builds ya existan.

`npm run demo:market:seed` es una herramienta para generar simulación. No debe ejecutarse contra una instancia comercial ni utilizarse como rutina de mantenimiento. Antes de regenerar una demo hay que leer las opciones del script, conservar cualquier evidencia que se quiera mantener y verificar la ruta de salida.

El contenido generado representa historia ficticia de uso. No incluye una garantía automática de que cada saldo coincida con una operación física real. Sirve para demostración, recorridos y pruebas con volumen.

## 7. Acceso desde otra computadora o celular

`127.0.0.1` sólo acepta conexiones locales. Para usar otro equipo de la red se necesita dirección de escucha apropiada, puerto accesible y origen configurado con la dirección o dominio que realmente utiliza el navegador. El firewall y la segmentación de red también influyen.

Un túnel público temporal agrega otra URL. No basta con arrancarlo: la política exacta de origen de la API debe corresponder al dominio del túnel. Debe cerrarse cuando termina la prueba. Esta documentación no activa ningún túnel ni publica credenciales.

Para producción se utiliza HTTPS y un dominio estable. Una URL temporal de prueba no es un esquema de hosting permanente, ni un respaldo de la máquina que mantiene el servidor funcionando.

## 8. Primera cuenta y administración privada

No hay una contraseña universal de jefe que pueda deducirse del programa. La primera cuenta se crea con el circuito correspondiente. La CLI web admite `owner:create`, `owner:recover`, `admin:create`, `admin:recover`, `backup:create` y `restore:offline`.

Sintaxis de creación, con contraseña suministrada mediante entrada estándar por un procedimiento seguro:

```text
node dist/api/cli.cjs owner:create --username jefe --name "Responsable del comercio" --password-stdin
node dist/api/cli.cjs admin:create --username administrador --name "Mantenimiento" --password-stdin
```

La opción `--password-stdin` no implementa por sí misma un prompt oculto; la CLI lee la entrada estándar. El operador debe proporcionar esa entrada sin poner la contraseña en argumentos, archivos compartidos o historial visible. Los ejemplos muestran sintaxis y no incluyen una contraseña de uso real.

La CLI obtiene el mismo lease de base: hay que detener la instancia que la usa antes de ejecutar mantenimiento exclusivo. `owner:recover` y `admin:recover` restablecen acceso y revocan sesiones, con registro de auditoría. No “descifran” la contraseña anterior. Crear administrador exige política reforzada y verifica que no exista ya la identidad administrativa prevista.

## 9. Empaquetado Windows

```powershell
npm run pack:win
npm run dist:win
```

El primer comando prepara el directorio distribuible; el segundo genera instalador NSIS x64. La configuración usa `asar`, mantiene el módulo SQLite nativo fuera del empaquetado cerrado cuando corresponde, incluye icono de Perla Negra y conserva el identificador histórico de aplicación.

El instalador es asistido, por usuario, con elección de directorio y acceso directo según `electron-builder.yml`. Construir un instalador no prueba automáticamente instalación limpia, actualización desde una versión anterior o comportamiento de un antivirus. Existe un circuito específico de prueba empaquetada que debe ejecutarse para una entrega.

## 10. Contenedores y producción

`Dockerfile.api` utiliza Node 24.13.0 sobre bookworm-slim, construcción por etapas y usuario `node`. La etapa final contiene API y frontend construidos, utiliza `/data` para persistencia y expone el puerto de aplicación. El healthcheck comprueba la ruta de salud.

`compose.production.yaml` configura dos servicios: API y gateway Caddy. La API tiene filesystem de sólo lectura, volumen de datos, tmpfs, límites de memoria/CPU, capabilities eliminadas y protección de privilegios. El gateway expone 80/443 y conserva datos/configuración de Caddy. El proxy tiene dirección interna fija en una red explícita y la API confía sólo en su CIDR configurado.

Comando de construcción/arranque una vez preparado dominio y archivo de entorno:

```powershell
docker compose --env-file .env.production -f compose.production.yaml up --build -d
```

Para revisar:

```powershell
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml logs --tail 100 api
```

Para detener sin eliminar volúmenes:

```powershell
docker compose --env-file .env.production -f compose.production.yaml down
```

No agregar `-v` a una operación rutinaria: eliminar volúmenes puede destruir los datos persistentes. La configuración disponible no equivale a un despliegue verificado hoy. Los antecedentes de QA de contenedores y cualquier bloqueo del entorno se consultan como evidencia histórica, no como estado actual certificado.

## 11. Salud y monitoreo

`/api/v1/health` permite comprobar disponibilidad de la aplicación según su implementación. Una respuesta saludable no prueba que una impresora funcione, que exista espacio suficiente para meses de crecimiento o que un respaldo externo pueda restaurarse.

Monitoreo operativo recomendado: disponibilidad HTTPS, espacio y errores de disco, crecimiento de SQLite y backups, reinicios del proceso, fallos de copia, tiempo de respuesta de caja y exportaciones, y antigüedad de la última prueba de recuperación. Hay que conservar los logs sin exponer cookies, Authorization o token CSRF; Fastify redacta esos campos configurados.

## 12. Diseño del backup

El contenedor de copia utiliza encabezado `BOCHABK1`, nonce, etiqueta de autenticación y contenido cifrado AES-256-GCM. Dentro se almacena un manifiesto y una base comprimida con deflate. El manifiesto incluye identificador, fecha, tipo, versión de aplicación y esquema, huella de clave y SHA-256 de la base.

Antes de aceptar la copia se comprueba autenticidad del cifrado, descompresión limitada, hash, integridad SQLite, claves foráneas, esquema y migraciones. Se usa `db.backup()` para crear la instantánea consistente. Los archivos se escriben con permisos restringidos y se sincronizan antes de reemplazos críticos cuando la plataforma lo permite.

El límite interno predeterminado es 512 MiB; la carga HTTP y recuperación CLI limitan archivo a 128 MiB. No son capacidades ilimitadas ni equivalentes. Debe verificarse qué límite alcanza primero una instancia que crece.

## 13. Frecuencia y conservación

Se crea como máximo una copia diaria del tipo DAILY por día UTC cuando la tarea se ejecuta. Se conservan las 14 diarias más recientes según la lógica del servicio. Las manuales y PRE_RESTORE tienen otro propósito y no deben suponerse sujetas automáticamente a la misma purga.

Una copia en el mismo equipo protege frente a determinados errores lógicos, pero no frente a perder ese equipo. Debe existir una política adicional de copia externa de archivos cifrados y custodia de clave. Esa transferencia externa no aparece como un servicio automático universal ya resuelto por la aplicación.

## 14. Restauración desde la interfaz

1. Identificar la instancia y detener la operación comercial de los usuarios.
2. Resolver carritos u operaciones pendientes.
3. Seleccionar o cargar la copia correcta.
4. Inspeccionar sus datos y obtener una vista previa válida.
5. Confirmar con el usuario autorizado y contraseña actual.
6. Dejar que el sistema cree PRE_RESTORE y realice el reemplazo.
7. Volver a iniciar sesión y verificar datos clave.

La vista previa vence a los cinco minutos y está vinculada al archivo y al estado observado de la base. Si cambian, se exige inspección nueva. Existe un journal de restauración y archivos candidatos/originales para recuperar una interrupción durante el reemplazo. Después de restaurar se revocan sesiones e intentos de autenticación.

El servicio controla explícitamente borradores de checkout; no debe inferirse de ello una inspección universal de toda actividad humana en curso. El procedimiento operativo debe coordinar a los usuarios aunque una validación técnica concreta ya exista.

## 15. Restauración offline

Si no se puede ingresar al sistema, existe el procedimiento privado:

```text
node dist/api/cli.cjs restore:offline --service-stopped --file RUTA_A_LA_COPIA
```

Requiere configuración correcta, clave correspondiente y servicio detenido. La bandera no detiene el servicio automáticamente: declara una precondición que el operador debe cumplir, y el lease aporta otro control. El procedimiento preserva original y utiliza su propio journal para recuperación.

No reemplazar archivos manualmente mientras otro proceso escribe. No borrar `-wal`, `-shm`, journals o archivos de recuperación para hacer desaparecer un error sin entender en qué fase quedó el procedimiento.

## 16. Compatibilidad de backups: límite observado

La validación reconstruye un esquema esperado para la versión declarada, pero también compara la cantidad del historial con `MIGRATIONS.length` del ejecutable actual. En el código analizado esto impide asumir que toda copia de una versión anterior será aceptada automáticamente por la última versión. La compatibilidad debe probarse con un backup real de la versión origen antes de una actualización.

La alternativa operativa debe definirse con el responsable técnico: conservar ejecutable compatible, restaurar en entorno aislado y actualizar mediante el camino validado. No se debe editar el manifiesto cifrado, quitar checks ni saltar validaciones para forzar una restauración.

## 17. Actualización de una instalación

Antes: registrar versión, guardar backup comprobado y clave, revisar cambios de esquema y detener la operación. Durante: desplegar código compatible, permitir la migración y comprobar arranque. Después: verificar usuario, terminal, catálogo, una consulta de venta histórica, stock, cuentas y una operación de prueba acordada.

Si hay que retroceder, restaurar una copia compatible con el ejecutable anterior. Volver sólo el JavaScript a una versión que no conoce el esquema nuevo no es un rollback válido. Las migraciones rechazan bases más nuevas por ese motivo.

## 18. Diagnóstico de problemas frecuentes

| Síntoma | Revisar antes de intervenir |
|---|---|
| No inicia API | Node, builds, variables obligatorias, origen válido, clave y acceso a directorios |
| Dice que la base está en uso | Otro servidor o CLI activo; lease; no borrar el bloqueo sin comprobar proceso |
| Health responde pero no hay página | Existencia y vigencia de `dist/web/index.html` |
| 403 al usar otra URL | Host, Origin, cookie, CSRF y `BOCHA_PUBLIC_ORIGIN` coherentes |
| Sesión cae en otro equipo | Política de una sesión por usuario; usar cuentas individuales |
| Error del módulo SQLite | ABI, plataforma, arquitectura e instalación nativa |
| Stock no permite vender | Inicialización, cantidad, ubicación, lotes y función activa |
| Confirmación quedó pendiente | Consultar por clave; no volver a crear la venta indiscriminadamente |
| Excel pide acotar | Límite de filas; combinar filtros; no esperar recorte silencioso |
| Backup rechazado | Clave, versión, integridad, tamaño y compatibilidad del historial |
| Impresión marcada pero sin papel | Diálogo/driver/impresora; el estado no certifica salida física |

Registrar contexto, hora, operación e identificador permite reproducir mejor que una captura aislada. Nunca incluir contraseña o clave de backup en ese diagnóstico.
