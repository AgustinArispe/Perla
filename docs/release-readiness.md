# Estado de preparación de entrega

Fecha: 5 de octubre de 2026.

## Aplicación de escritorio

- Instalador: `release/Perla Negra POS Setup 0.1.0.exe`.
- Nombre visible y descripción del ejecutable: **Perla Negra POS**.
- Ícono propio incluido en el ejecutable y en el acceso directo.
- Tamaño: 119,24 MiB.
- SHA-256: `BC420B97062FD5758172ADA1968B80ECD1D383BA59B1FB7AB4D71F5B3C247248`.
- Suite ejecutada contra el programa empaquetado: 9 de 9 recorridos correctos.

Los recorridos cubren arranque y persistencia, catálogo, importación, caja, scanner,
productos por peso, pagos combinados, comprobante, histórico, stock, reinicio,
dashboard y permisos.

## Aplicación web y API

- Suite general: 61 archivos y 203 pruebas correctas.
- Recorridos web reales: 5 de 5 correctos.
- Compilaciones web, API y escritorio correctas.
- Auditoría de dependencias de producción: 0 vulnerabilidades conocidas.
- Configuración de Compose válida al proporcionar dominio y clave de backup.

## Ampliación verificada — 6 de octubre de 2026

- Jornada completa con dos cajeros y jefe: pagos combinados, promoción, producto por peso, respuesta de cobro perdida, devolución y cierres.
- Dashboard: navegación mensual, detalle por día, teclado, celular y movimiento reducido.
- Recuperación desde copia descargada/subida: venta, stock, cierre, invalidación de sesiones y conservación de copia previa.
- Error de consulta de backups: mensaje diferenciado de lista vacía y reintento comprobado.
- Los siete recorridos web anteriores pasaron en la ejecución conjunta; los dos nuevos recorridos de backups pasaron después de ajustar la expectativa del reintento a la copia diaria existente.
- Tipos, lint de los archivos modificados y compilación web correctos.

Evidencia: [jornada](store-day-verification.md) y [recuperación web](backup-browser-verification.md). La simulación de cuatro meses sigue disponible en el puerto 3087 y no se restauró ni reinicializó durante estas pruebas.

## Revisión integral de web — 6 de octubre de 2026

- 61 archivos de lógica/API: 206 pruebas correctas.
- 12 circuitos reales de navegador correctos, incluyendo scanner por eventos HID, recuperación de cobro y cuenta corriente desde celular.
- Correcciones de foco del scanner/diálogos, compatibilidad con CSP y filtros de clientes/traslados/resumen por ubicación.
- Tipos, lint completo y compilación web/API correctos; auditoría de producción sin vulnerabilidades conocidas.
- La web local se reinició con la misma base de simulación para aplicar las correcciones de API.

Cobertura, resultados y límites: [informe integral](testing-web-security.md).

## Verificación de contenedor pendiente en esta PC

Docker Desktop 4.69 no logra iniciar su motor por un socket local roto del módulo
`dockerInference`. El error ocurre antes de construir el proyecto y no proviene del
Dockerfile ni de Compose. La imagen debe volver a verificarse después de reparar o
actualizar Docker Desktop. No se aplicó un restablecimiento de fábrica para evitar
eliminar imágenes, volúmenes o configuraciones de otros proyectos.
