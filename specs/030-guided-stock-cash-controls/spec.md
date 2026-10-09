# 030 — Conteos guiados, vencimientos y revisión de caja

## Reglas comunes

- Fecha de diseño: 2026-10-07. Estado: planificado; no representa funcionalidad implementada.
- Alcance autorizado: las diez mejoras de control propuestas y simplificación de UX. Las decisiones de detalle documentadas son criterios de implementación para revisión.
- Mantener React/TypeScript, Fastify/worker y SQLite; ampliar servicios existentes. Identidad Perla Negra de DESIGN.md. La copia Mac independiente no se modifica en esta entrega.
- Permisos y funciones habilitadas se verifican en backend, además de la interfaz. Una preferencia visual nunca concede permisos.
- Dinero en centavos, peso en gramos; operaciones de negocio transaccionales, idempotentes y con control de revisión. No sobrescribir datos históricos.
- Campos indispensables primero; opciones avanzadas a pedido. Una acción principal por tarea, texto puntual, controles táctiles y teclado. Ayuda extensa en Ayuda.
- Toda lista de control tiene paginación y exportación XLSX con los mismos filtros, selección múltiple cuando corresponda y hoja Filtros. Exportar nunca cambia el negocio.
- Ocultar un módulo no oculta compromisos pendientes ni borra datos. Su estado de solo consulta/resolución respeta las dependencias actuales.
- Validación con SQLite real, API autorizada y circuitos web en escritorio y 390 px. No afirmar rendimiento ni compatibilidad con scanner físico sin medirlos.

## Problema y base actual

Ya existe conteo individual con diferencia y revisión, lotes/vencimientos y diferencias de cierre. Falta un circuito de conteo por selección, seguimiento de revisiones y destinos exactos desde avisos.

## Experiencia

- Stock → Hacer conteo: elegir ubicación y categoría, escanear o buscar, ingresar cantidad física. Listado acotado con progreso y borrador recuperable. Un escaneo identifica un artículo, no modifica stock.
- Antes de aplicar: mostrar solo diferencias; no contado se conserva distinto de cero. Confirmar requiere motivo de ajuste y registra autor/fecha.
- Si hubo ventas/traslados desde el conteo de una fila, marcar Revisar y volver a contar; no ajustar con una diferencia vieja ni bloquear todas las cajas.
- Stock → Vencimientos: Vencidos, Esta semana, Este mes. Abrir lote exacto, ubicación y cantidad; acciones existentes autorizadas para bloquear/revisar/registrar merma. Nunca convertir vencimiento en merma automática.
- Turnos → Con diferencias: mostrar fecha, responsable, caja, esperado, contado y faltante/sobrante. Resumen separa sumas de faltantes y sobrantes para evitar que se cancelen engañosamente.
- Jefe agrega nota y marca Revisado; esto no modifica diferencia ni movimiento original. Ver repetición por caja/operador como ayuda de revisión, no como acusación automática.

## Datos y límites

Sesiones de conteo con ubicación, alcance, revisión y líneas con cantidad contada nullable, fecha de conteo, revisión de stock observada y estado. Aplicación atómica por grupo explícito con clave idempotente; registros ya aplicados no se aplican de nuevo.

Inventario por lotes requiere reparto/reconciliación compatible con el servicio actual; no sobrescribir totales por fuera del ledger. El borrador debe sobrevivir a recarga. Cualquier reposición de sesión recuperada revalida permisos, productos, ubicación y revisiones.

Revisión de cierre: shift_id, actor, nota, fecha y revisión; autorizada a jefe/admin. Supervisor conserva acceso al detalle de turnos permitido, sin nuevos informes agregados comerciales.

## Aceptación

1. Contar 10 frente a 12 propone -2; dejar vacío nunca propone -12.
2. Venta posterior al conteo impide aplicar esa fila y conserva el resto del borrador.
3. Reintento tras pérdida de respuesta crea un solo ajuste, con conciliación de lotes.
4. Cierre con -$100 y otro con +$100 muestran faltantes $100 y sobrantes $100; marcar revisado no cambia esos datos.
5. Aviso de lote abre ese lote, no la lista general de Stock. Manejar 100 vencimientos con paginación.
