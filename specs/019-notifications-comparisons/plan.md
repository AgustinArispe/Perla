# Implementation Plan: Notificaciones y comparativos

**Branch**: `feature/web-frontend` | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

## Strategy

Agregar un servicio de lectura que deriva avisos vigentes desde stock, lotes y turnos, y guarda sólo la firma leída por usuario. Agregar un servicio de comparación de rangos sobre ventas y devoluciones. Ambos quedan fuera del recorrido crítico de Caja.

## Data design

- `notification_reads`: usuario, clave estable, firma leída y fecha.
- `business_features.NOTIFICATIONS`, apagada inicialmente.
- Los avisos no se duplican en una tabla de eventos: se calculan desde las fuentes autoritativas y desaparecen al resolverse.

## Service boundaries

- `NotificationService.list`: consulta condiciones permitidas por rol y funciones, construye avisos y cruza firmas leídas.
- `NotificationService.markRead`: valida que la clave y firma sigan activas para ese usuario antes de guardar.
- `ComparisonReports.compare`: resuelve fechas locales, suma ventas menos devoluciones y devuelve actual/anterior.

## UX

- Campana en la barra superior con contador y bandeja de tarjetas breves.
- Cada tarjeta abre Stock, Turnos o Resumen mensual según permisos.
- Comparador dentro del dashboard con Hoy, Semana, Mes y Rango; una tarjeta muestra diferencia e intervalo anterior.

## Verification

Pruebas unitarias de fechas; integración de firmas, permisos, ventas/devoluciones y función apagada; recorrido web real en escritorio y celular; verificación completa del proyecto.

