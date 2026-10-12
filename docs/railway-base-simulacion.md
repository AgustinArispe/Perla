# Base de simulación en Railway

Revisión: 12 de octubre de 2026. Estado: evaluación y procedimiento propuesto; no se subió una base ni se configuró Railway.

## Viabilidad

Sí: Railway puede ejecutar la API de Perla con SQLite en un volumen persistente. GitHub distribuye el código y, opcionalmente, un artefacto inicial de simulación. La base que cambia durante el uso debe residir en el volumen. Los [volúmenes de Railway](https://docs.railway.com/volumes) conservan archivos entre despliegues y están disponibles al arrancar, no durante el build ni el pre-deploy.

La base local `.data/five-month-local/pos.sqlite` mide 230.707.200 bytes, aproximadamente 220 MiB. GitHub [bloquea archivos mayores de 100 MiB en Git normal](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github). Publicarla requiere un artefacto comprimido dentro del límite, Git LFS o una release. El tamaño comprimido todavía no se midió.

## Estado del repositorio

- `.gitignore` excluye `.data/` y SQLite. `.dockerignore` también excluye los archivos SQLite.
- `Dockerfile` es para desarrollo; el destino de servidor es `Dockerfile.api`.
- `Dockerfile.api` sirve API y web compiladas, ejecuta como usuario `node` y utiliza `/data/bocha.sqlite` y `/data/backups`.
- El contenedor actual no copia una semilla ni la instala automáticamente.
- El script de generación crea otra simulación en un directorio nuevo. No garantiza reproducir exactamente el estado de la demo local actual.
- La lectura de estructura confirmó tablas `users`, `auth_sessions` y `auth_attempts`. Los datos de negocio son de simulación según el escenario informado, pero eso no convierte los accesos y sesiones en un artefacto listo para publicar.

## Procedimiento recomendado

1. Crear un snapshot consistente con la API de backup de SQLite; no copiar solamente el archivo principal mientras está en uso, porque puede tener escrituras pendientes en WAL.
2. Trabajar sobre la copia. Conservar relaciones y datos ficticios; retirar sesiones y material de autenticación reutilizable. Definir cuentas de acceso propias del entorno desplegado. Revisar auditoría y campos de texto para evitar incluir información añadida manualmente que no sea ficticia.
3. No incorporar `.env`, `backup.key`, backups cifrados ni credenciales locales al artefacto. Verificar integridad y relaciones de la copia, y registrar versión, tamaño y checksum.
4. Comprimir y distribuir la copia como artefacto de demo. Se recomienda release o almacenamiento de artefactos; un archivo comprimido en el repositorio es posible si queda bajo el límite. Git LFS requiere comprobar que el mecanismo de build obtiene el archivo real, no solamente el puntero.
5. Configurar Railway para construir con `Dockerfile.api` y montar un volumen en `/data`. Mantener una sola instancia escritora de esta base y comprobar permisos del volumen para el usuario `node`.
6. Configurar origen HTTPS, clave de backups propia y rutas en variables del servicio. Alinear el puerto de escucha con el configurado en Railway y la confianza en su proxy con la configuración real; no suponer que `PORT` se consume automáticamente, porque la aplicación lee `BOCHA_PORT`.
7. En el arranque, con exclusión mutua, instalar la semilla únicamente si la base de destino no existe. Verificar checksum e integridad y completar la instalación antes de iniciar la API. Si ya existe, conservarla. Una ruta existente pero inválida debe producir un error, no un reemplazo silencioso.
8. Crear los accesos del entorno mediante el mecanismo administrativo correspondiente, sin contraseñas en Git ni argumentos publicados. Probar salud, ingreso, reportes y persistencia después de reiniciar y redeplegar.

Un volumen ya existente conserva sus datos: un nuevo deploy no debe volver a sembrarlo. Reponer una demo desde cero es una operación separada, deliberada y con copia previa.

## Alternativas

| Opción | Ventaja | Costo o límite |
|---|---|---|
| Snapshot limpio como artefacto + instalación inicial | Reproduce la historia de la demo actual | Requiere preparar y revisar la copia |
| Generador versionado + instalación inicial | Menor peso en Git y datos regenerables | Hay que adaptar el generador para el destino y el arranque; puede diferir del estado local |
| Cargar snapshot una vez al volumen | Simple para una demo única | Es un paso operativo; vincular GitHub no realiza la carga automáticamente |

La recomendación para esta demo es snapshot limpio y carga inicial al volumen. Para una instalación comercial se prepara una base propia del comercio.

Referencias: [operación y variables de Perla](documentacion/08-operacion-y-despliegue.md), [volúmenes de Railway](https://docs.railway.com/volumes), [límites de GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).
