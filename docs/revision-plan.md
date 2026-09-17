# Revisión del borrador de planificación

Fecha: 2026-09-17. Revisión de documentos, no pruebas de aplicación.

## Cobertura

- Catálogo, scanner, búsqueda, carrito, descuentos: specs 002/004.
- Base local, aplicación de escritorio y velocidad: 001.
- Stock, entradas, mermas, conteos, mínimos y desconocidos: 003.
- Calculadora de fiambres y unidades base: 005.
- Persistencia, pagos, precios históricos, filtros y anulación: 006.
- Mes, total vendido, top productos, efectivo/tarjetas y reposición: 007.
- Instalación, respaldo, restore y mantenimiento mensual: 008.
- SQL, React y TypeScript: arquitectura y planes técnicos; sin aplicación creada.
- GitHub Spec Kit: CLI 1.0.7 instalado y scaffold local con integración Codex.

## Decisiones y límites de evidencia

- Electron prioriza TypeScript y empaquetado; no se lo declara más liviano que Tauri.
- Rendimiento tiene objetivos y datasets; falta medir cuando haya aplicación.
- HID teclado requiere modo y Enter configurados. No se promete identificar
  conexión/origen del dispositivo por teclado ni capturar fuera de la app.
- Balanza se lee manualmente en v1. Prefijos de etiquetas no habilitan parsing
  automático sin confirmar posiciones/decimales/checksum con etiquetas reales.
- Cantidades iniciales son necesarias para stock fiable; catálogo solo no alcanza.
- Pagos mixtos registran importes aplicados; efectivo recibido/vuelto no inflan ventas.
- Anulación repara ledger original y recalcula mes de la venta, no conciliación bancaria.
- Totalmente bonificada: total cero, sin pagos. No bloquear descuento del 100%.
- Bajo stock siempre es actual y no mezcla gramos con unidades.
- Documento comercial anterior conserva precio/alcance; nueva revisión comercial pendiente.

## Validación pendiente de implementación

Tests de dominio, SQLite real, E2E, benchmark, scanner físico, instalador y
restauración en Windows están planificados, no ejecutados. No hay compatibilidad
de hardware ni tiempos reales certificados todavía.
