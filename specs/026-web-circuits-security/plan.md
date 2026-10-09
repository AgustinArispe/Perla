# Plan de verificación

1. Ejecutar pruebas existentes y auditoría; identificar huecos entre lógica de negocio, transporte HTTP y operación desde navegador.
2. Añadir circuitos HID, seguridad y cuenta corriente con bases y puertos exclusivos por escenario; conservar la demo del puerto 3087.
3. Ante cada fallo, comprobar si pertenece al producto o a la preparación de la prueba. Registrar errores de contratos y eventos de teclado, corregir la causa y retirar la instrumentación de diagnóstico.
4. Verificar tipos, lint, compilación, suite de lógica y todos los circuitos web después de las correcciones.
5. Documentar cobertura y pruebas físicas/de despliegue aún necesarias. Incorporar la auditoría de dependencias al flujo de CI existente.

## Decisiones

- El lector se prueba como USB HID con eventos reales de teclado; no se simula colocando directamente valores del carrito.
- Se conserva `script-src 'self'` sin permitir eval: Zod usa validación sin generación dinámica y las fuentes se sirven como archivos locales.
- Las rutas con filtros pasan a sus esquemas estrictos; aceptar filtros conocidos no implica aceptar campos arbitrarios.
- Se renueva el contexto de edición del scanner al cerrar el comprobante; la regresión envía el próximo código sin clics en el campo.
- Los controles de permisos se prueban por HTTP, además de comprobar lo que muestra la interfaz.
- La suite de lógica se ejecuta separada del arranque masivo de navegadores para evitar competencia de CPU/disco en la prueba de retención diaria; no se relajan sus límites de tiempo.
