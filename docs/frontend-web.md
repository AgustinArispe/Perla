# Frontend web

React y TypeScript conectados a la API real del POS. Pantallas: Caja, Productos, Stock, Histórico, Resumen mensual, Usuarios, Turnos, Actividad, Configuración y Copias de seguridad. Permisos idénticos al backend.

## Desarrollo

Con dependencias instaladas, compilar API y frontend. Configurar `BOCHA_BACKUP_KEY` y `BOCHA_PUBLIC_ORIGIN` siguiendo [la guía del backend](backend-web.md). Crear la cuenta inicial mediante la CLI privada con el servidor detenido. Ejecutar `npm run start:api`: sirve también la aplicación compilada desde el mismo origen.

Para trabajar con recarga automática: API con `BOCHA_PUBLIC_ORIGIN=http://localhost:5173` y frontend con `npm run dev:web`. El proxy apunta por defecto a `http://127.0.0.1:3000`; `BOCHA_API_URL` permite cambiarlo.

Docker de desarrollo: configurar `.env` a partir de `.env.example` con una clave aleatoria. `npm run docker:up` levanta frontend y API con una base persistente propia. Para crear la cuenta inicial, detener la API, ejecutar la CLI privada con `docker compose run --rm -T api node dist/api/cli.cjs owner:create --username jefe --name "Perla Negra" --password-stdin` y luego iniciar los servicios. La contraseña se entrega por entrada estándar. No usar estas credenciales ni esta clave en producción.

## Operación

El jefe crea una terminal en Configuración. Cada vendedor ingresa, elige terminal, abre caja y opera con el lector USB configurado para terminar cada lectura con Enter. F2 enfoca el scanner, F3 busca, F4 aplica descuento, F6 busca productos por kilo y F8 cobra. Los diálogos y campos de edición suspenden la captura.

Las ventas requieren conexión; ante una respuesta incierta se conserva la operación para verificar su resultado. Los importes usan centavos y los productos por kilo usan gramos. El cierre registra contado, esperado y diferencia. Copias de seguridad permite crear, descargar, subir, revisar y restaurar una copia cifrada. Restaurar requiere contraseña y cierra todas las sesiones.

## Verificación y entrega

`npm run check`, `npm run test:web` y la prueba del contenedor validan la entrega. Las pruebas web usan una base temporal y credenciales exclusivas de prueba; no configuran cuentas en producción.

Skills locales descargadas: [Emil](https://github.com/emilkowalski/skills), [Taste](https://github.com/Leonxlnx/taste-skill) e [Impeccable](https://github.com/pbakaus/impeccable). Sus carpetas están en `.agents/skills`; el catálogo de Codex las reconocerá en la próxima sesión. Se usaron directamente durante esta implementación.

El contenedor incluye la aplicación web. La publicación real necesita el servidor y dominio de producción definidos en la guía del backend.
