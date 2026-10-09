# Data model: Notificaciones y comparativos

## Notification read

Clave primaria `(user_id, notification_key)`, firma exacta del estado observado y fecha de lectura. Si el aviso conserva clave pero cambia firma, vuelve a estar pendiente. La desaparición del estado fuente lo resuelve sin borrar el historial de lectura.

## Active notification

Proyección sin persistencia con clave, firma, tipo, severidad, título, detalle, momento y destino. Nunca contiene costos ni márgenes.

## Period comparison

Preset, fechas actuales y anteriores, totales netos, cantidad de ventas, ticket promedio y cambio en puntos básicos. Todas las sumas monetarias usan centavos enteros.

