# 07. API, permisos y seguridad

[Volver al índice](README.md)

## 1. Superficie HTTP

La API utiliza el prefijo `/api/v1`. Hay 125 rutas registradas en el corte documental, incluidas las familias generadas mediante bucles. La [referencia completa](referencia-api-permisos.md) relaciona método, URL y operación interna. La API es propia del producto; no se identificó un esquema OpenAPI que sustituya automáticamente a los contratos TypeScript/Zod.

La respuesta habitual es una unión discriminada:

```json
{"ok":true,"value":{"dato":"resultado"}}
```

```json
{"ok":false,"error":{"code":"VALIDATION","message":"Revisá los datos.","retryable":false}}
```

Las descargas de Excel, CSV y backups devuelven contenido binario o texto con su MIME y `Content-Disposition`. No debe intentarse parsearlas todas como JSON. Los códigos HTTP se derivan de la categoría de error, con tratamiento específico para sesión, permiso, validación, conflictos y errores internos.

## 2. Familias de endpoints

| Familia | Finalidad |
|---|---|
| `auth` | Ingreso, sesión, salida, contraseña, desbloqueo y terminal |
| `products`, `barcodes` | Catálogo, clasificación, etiquetas, identificadores, importación y costo |
| `checkout`, `sales` | Borrador, cálculo de peso, cotización, venta, recuperación, anulación y devoluciones |
| `receipts` | Documentos de venta y marca de impresión |
| `stock`, `lots` | Existencias, operaciones, movimientos y partidas |
| `suppliers`, `purchases` | Proveedores, recepción, borradores e historial |
| `customers`, `customer-collections` | Clientes, crédito, cuenta e imputaciones de cobros |
| `supplier-payments` | Pagos de obligaciones con proveedores |
| `locations`, `transfers` | Lugares, saldos y circuito de traslado |
| `pricing`, `promotions` | Actualización masiva y reglas promocionales |
| `dashboard`, `notifications` | Resultados, comparaciones y avisos |
| `control` | Vistas, pendientes, reposición, revisión comercial, conteos y agenda |
| `settings`, `terminals`, `cash` | Configuración, cajas y turnos |
| `users`, `audit` | Administración y trazabilidad |
| `exports`, `backups` | Extracción de datos y continuidad |

## 3. Contratos y validación

Los esquemas de `src/shared` definen forma y límites de solicitudes. Muchos son objetos estrictos: campos desconocidos se rechazan en lugar de ignorarse de manera ambigua. UUID, revisiones, cantidades, fechas, importes y enums tienen validaciones específicas.

La validación de formato no alcanza para autorizar una operación. Un UUID válido puede pertenecer a otro usuario o a una caja cerrada. Por eso los servicios verifican propiedad, estado, dependencias, existencia y revisión después de parsear el esquema.

Los límites se mantienen en varias capas: tamaño del cuerpo HTTP, rangos del esquema, límites de consulta, máximo de filas de exportación y restricciones SQLite. No siempre tienen el mismo valor: subir un archivo de backup tiene un límite HTTP distinto del límite interno de su contenido descomprimido.

## 4. Autenticación y contraseñas

Las contraseñas se guardan como hashes scrypt, no como texto recuperable. La implementación usa `N=131072`, `r=8`, `p=1`, límite de memoria de 256 MiB, salt aleatorio y comparación de tiempo constante. El formato incluye algoritmo y parámetros. Un administrador puede restablecer acceso mediante procedimientos autorizados, pero no leer la contraseña original.

Los usuarios se normalizan a minúsculas, tienen de 3 a 40 caracteres y admiten letras, números, punto, guion y guion bajo. El esquema común exige contraseña de 8 a 128 caracteres, mayúscula y símbolo y rechaza ciertas repeticiones triviales. El administrador técnico tiene una política más exigente: al menos 16 caracteres y combinación de mayúscula, minúscula, dígito y símbolo según `AdminPasswordSchema`.

El hash de comparación ficticio ayuda a evitar respuestas claramente distintas por inexistencia del usuario, aunque esto no sustituye una evaluación especializada de todos los canales laterales. La intensidad de scrypt consume recursos; el límite de intentos protege también la disponibilidad.

## 5. Sesiones

Se generan tokens aleatorios de 32 bytes expresados como 64 caracteres hexadecimales. En la base se guarda su SHA-256, no el token original. La sesión conserva usuario, revisión, vencimiento y última actividad.

En el runtime web la configuración predeterminada es 30 minutos de inactividad y 8 horas de vida máxima. Son configurables dentro de límites: inactividad 5–240 minutos y máximo 1–24 horas; la vida máxima no puede ser menor que la inactividad. Se exige una sola sesión por usuario en este runtime. No se debe trasladar esa política a otro constructor de `AuthService` sin revisar sus opciones.

Una cuenta desactivada o con revisión diferente invalida su sesión. Cambiar contraseña, restaurar una base y los procedimientos privados de recuperación tienen efectos de revocación. La cookie se elimina en las respuestas que corresponden. El frontend limpia su token CSRF al perder la sesión.

## 6. Cookies, origen y CSRF

En producción se utiliza la cookie `__Host-bocha`; en desarrollo, `bocha_session`. Se configuran `HttpOnly`, `SameSite=Strict`, `Path=/` y `Secure` en producción. HttpOnly evita que el JavaScript ordinario lea la cookie, pero no elimina el impacto de un XSS capaz de operar con la sesión.

El servidor valida el Host contra el origen configurado. En escrituras verifica Origin y exige un token CSRF, con excepción del ingreso según su ruta. El token se deriva mediante HMAC de la sesión y una clave del proceso; se compara de manera constante. Un cambio de proceso puede requerir recuperar la sesión/CSRF antes de reintentar.

Esta política exige que frontend, proxy y `BOCHA_PUBLIC_ORIGIN` coincidan. Cambiar sólo el dominio visible o el puerto puede causar rechazos legítimos. No conviene resolverlo desactivando CSRF o permitiendo cualquier origen.

## 7. Roles acumulativos

| Perfil | Capacidades generales |
|---|---|
| Vendedor (`SELLER`) | Atender, operar su caja autorizada, buscar productos, vender, emitir comprobante y crear cliente básico |
| Supervisor (`SUPERVISOR`) | Lo anterior más gestión operativa: catálogo, stock, compras, devoluciones, cuentas y movimientos según funciones |
| Jefe (`OWNER`) | Lo anterior más configuración, usuarios permitidos, estadísticas, promociones, crédito, precios masivos, ubicaciones y respaldo |
| Administrador (`ADMIN`) | Conjunto operativo del jefe y condición administrativa especial para mantenimiento protegido |

La matriz contiene 115 operaciones base y se genera directamente de `permissions.ts`. Operaciones desconocidas se rechazan. El permiso del jefe incorpora todos los del supervisor y vendedor, por lo que puede atender un negocio de una sola persona.

La matriz no elimina restricciones de recurso. Un vendedor no puede operar un turno abierto por otro vendedor. La sesión web no puede enviar una terminal distinta para eludir su selección. Los servicios de Control, exportaciones y backups tienen puertas adicionales. OWNER no equivale a poder crear o manipular libremente la identidad del administrador del sistema.

## 8. Alta rápida de clientes: autorización diferenciada

`customers.save` está en la base de permisos del vendedor para permitir un alta desde Caja. La aplicación distingue alta y edición: un vendedor no recibe por ello permiso general para actualizar clientes existentes. `customers.setCredit` queda en el nivel de jefe/administrador.

El contrato de datos básicos no admite inyectar campos de crédito como parte del mismo formulario. Este es un ejemplo importante de defensa en profundidad: la interfaz no muestra el control, el esquema rechaza campos ajenos y el servicio verifica la acción y rol.

## 9. Protección HTTP y límites

Fastify utiliza Helmet y configuración de cabeceras, validación de entrada y tratamiento de errores. El límite habitual de cuerpo es 10 MiB; la carga de backup admite 128 MiB. El timeout de solicitud es 30 segundos y el de conexión 10 segundos.

El rate limit general actual es 1000 solicitudes por minuto. La clave combina IP y, cuando hay sesión, una derivación de su token. El ingreso tiene un límite específico de cinco solicitudes por minuto por combinación de IP y usuario normalizado. Además existe control de intentos por usuario: a partir de cinco fallos se bloquea progresivamente 1, 2, 4, 8 y hasta 15 minutos dentro de la lógica de ventana del servicio.

Estos valores son los del código actual; documentos anteriores mencionaban 300 solicitudes por minuto y no deben utilizarse como referencia de esta versión. El límite no es una defensa absoluta frente a ataques distribuidos ni sustituye la configuración del proxy y hosting.

## 10. Protección de archivos y proceso

El servidor estático sólo sirve extensiones conocidas dentro de la raíz del frontend. Las rutas `/api/` inexistentes no devuelven el HTML de la aplicación. Se rechazan escapes del directorio y URL inválidas. No se publica el árbol entero del repositorio ni la carpeta de base de datos.

El despliegue de contenedor contempla usuario no privilegiado, sistema de archivos de sólo lectura, eliminación de capabilities, `no-new-privileges` y volumen persistente para datos. El proxy confiable se configura mediante redes CIDR explícitas, no mediante confianza indiscriminada en cabeceras de cualquier cliente.

Electron niega ventanas nuevas, navegación no prevista y permisos, y valida el emisor IPC. El preload limita la superficie expuesta. Una vulnerabilidad en una dependencia o en una función nueva aún puede romper estas garantías; deben conservarse las barreras al evolucionar.

## 11. Exportaciones y datos sensibles

Excel requiere sesión y autorización. El vendedor no puede extraer información administrativa por enviar directamente una solicitud. Supervisores y jefes pueden tener diferente alcance: que un supervisor exporte stock no implica que pueda descargar estadísticas exclusivas del jefe.

Los textos se escriben como texto y los códigos de barras conservan su naturaleza de cadena; no se convierten en fórmulas por comenzar con caracteres especiales. Las exportaciones de usuarios no incluyen contraseñas ni hashes. La auditoría estructurada selecciona campos de negocio para evitar registrar secretos.

Un XLSX descargado deja de estar protegido por los permisos de la aplicación. El comercio debe guardarlo y compartirlo con criterio. Esta consideración no modifica el comportamiento del programa, pero forma parte de una operación responsable.

## 12. Errores y resultados inciertos

Se distinguen validación, no encontrado, inactivo, no autenticado, prohibido, revisión incompatible, idempotencia incompatible, stock insuficiente, base ocupada, disco lleno, respaldo inválido y error interno, entre otras categorías de contrato.

`SQLITE_FULL` se presenta como falta de espacio; `SQLITE_BUSY`/`LOCKED` como datos ocupados; corrupción o archivo ilegible como necesidad de preservar y recuperar. Las restricciones SQL tienen un mensaje genérico que puede requerir diagnóstico adicional. No se devuelve automáticamente el stack o SQL privado al usuario final.

`retryable=true` indica que puede haber un camino de reintento; no autoriza a generar una nueva operación monetaria con otra clave. Ante pérdida de respuesta se debe resolver primero si la solicitud anterior produjo efectos.

## 13. Respaldos y secretos

Los backups se cifran con AES-256-GCM y una clave de 32 bytes suministrada por configuración. La clave no va dentro del mismo archivo como un secreto recuperable. Perderla puede volver inútiles los respaldos. La aplicación identifica la clave mediante una huella, no exponiendo su valor.

La base activa no usa SQLCipher en esta implementación. La protección del disco, permisos del sistema operativo y acceso del servidor siguen siendo necesarios. Tampoco se identificaron MFA, rotación automática de claves de backup, integración corporativa de identidad ni auditoría externa inmutable.

## 14. Alcance de la seguridad documentada

Lo anterior describe mecanismos comprobados en el código, no un pentest ni una certificación. Antes de una puesta en producción nueva deben verificarse actualización de dependencias, HTTPS, restauración, permisos reales, cuentas iniciales, origen, límites, directorios y exposición de red. Una prueba funcional de login no prueba todo el modelo de amenazas.
