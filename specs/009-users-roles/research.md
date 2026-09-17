# Research: Usuarios y permisos

## Decisiones

Sesiones opacas revocables en SQLite: evitan JWT con permisos viejos y soportan
varias sesiones independientes sin usuario global. En escritorio el token permanece
en main; web futura usará contexto de sesión por petición y cookie segura.

scrypt incorporado al runtime, N=131072/r=8/p=1, salt aleatorio y comparación constante;
no se agrega una dependencia nativa para hashing. Ver [Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html)
y [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Costo de login separado del recorrido de venta; nunca ejecutar hashing en renderer.

Alternativas: permisos sólo UI son insuficientes; JWT agrega complejidad de revocación;
proveedor externo impide operación offline. Se eligen cuentas locales y autorización
independiente del transporte sin prometer que esto ya sea un servidor web.
