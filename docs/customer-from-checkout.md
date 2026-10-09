# Crear clientes desde Caja

- Caja → Elegir cliente → Nuevo cliente.
- Al cobrar: Agregar cliente → Nuevo cliente.
- Nombre obligatorio; contacto opcional. Guardar selecciona el cliente para la venta actual.
- Cancelar vuelve al selector o al cobro y conserva el carrito.
- El vendedor puede crear datos básicos. Solamente jefe y administrador habilitan cuenta corriente y definen el límite.
- Reutiliza el alta existente y la autorización del servidor. No modifica el historial de ventas ni la base de demostración.

## Verificación

Integración: alta por vendedor, rechazo de edición y de habilitación de crédito.
Web: cancelar el alta con carrito cargado, crear desde el cobro, vender a cuenta y cobrar el saldo en dos pagos desde celular.
Regresión: escáner simulado y circuito de seguridad web.
`nResultado: 6 pruebas de integración/permisos y 4 circuitos web aprobados. Typecheck, lint y compilación web/API aprobados.
