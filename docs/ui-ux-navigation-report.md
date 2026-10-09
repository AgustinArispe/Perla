# Navegación y atención — T05, T06, T07

Implementación parcial, 7 de octubre de 2026.

## Contratos preservados

- Las secciones y valores de start_module conservan sus identificadores anteriores. navigation.ts traduce presentación; no modifica preferencias, vistas, permisos del servidor ni flags.
- Cada contenedor aparece sólo si hay una área autorizada. La matriz previa continúa aplicada por sección. Actividad mantiene Administración accesible para Supervisor; Resultados no se agrega a su alcance. Vendedor conserva Caja y Ayuda.
- Sidebar: Trabajo diario, Mercadería, Negocio, Administración. Selectores internos de Ventas, Productos, Stock, Compras, Turnos, Resultados y Administración. Ayuda fija inferior y cuenta con preferencia inicial, contraseña y salida.
- Checkout sigue usando leaveGuard. El enlace desde Configuración al historial de compras ahora también usa navegación protegida.
- Menú móvil enfoca una entrada al abrir, contiene Tab y Escape devuelve foco al botón de menú. La navegación devuelve foco al cierre móvil.
- Inicio limita cada muestra a cinco y omite grupos vacíos. El contador expresa registros/conteos/productos/necesidades según el contrato disponible, conserva detalles suministrados por servidor y explica grupos positivos sin muestra. No agrega fechas, unidades individuales, montos ni severidad ausentes del contrato.
- Campana agrupa por kind, rotula sin leer y leído y explica que lectura no resuelve causa. Mantiene avisos activos visibles, fecha y detalle del servidor. Error de markRead permite recuperación y no muestra éxito falso. Lotes abre Vencimientos; stock abre Existencias.

## Verificación realizada

- npm run typecheck: pasó.
- ESLint dirigido a cinco archivos modificados: pasó.
- Vitest navigation.test.ts y permissions.test.ts: 2 archivos, 5 pruebas pasaron. Casos: administración con sólo actividad, vendedor, supervisor sin resultados, todos los destinos históricos y matriz existente de permisos.
- No se ejecutaron circuitos web ni comprobaciones visuales de 390/1440, foco real y contraste. Los tests de navegación comprueban adaptación de accesos; no acreditan UI ni conservación de borradores.

## Pendientes y límites

- T06 no está completo: scroll y referencias contextuales anteriores se conservan, pero los módulos siguen desmontándose como antes y no se implementó restauración general de filtros/paginación o retorno al origen. Requiere contratos de estado de cada módulo.
- Compras/Pedidos transmite initial.view = orders a ReplenishmentPanel. Ese componente necesita adoptar este argumento; su contenido y tabs no se modificaron en esta entrega. No se creó un nuevo dueño de pedidos.
- Contenedores existentes conservan sus controles internos. Eliminar duplicación de pestañas de Compras/Controles/Reposición requiere migrar esos componentes coordinadamente.
- Los enlaces de notificación conservan alcance agregado del contrato destination; el contrato no proporciona entidad ni período exacto. No se fabricaron.
- El endpoint Inicio sólo proporciona id/name/detail/locationId por muestra; datos monetarios, caja y fechas estructuradas de diferencias requieren ampliación validada del contrato para cumplir todo T07.
- Preferencia inicial conserva backend y valores previos; el formulario movido a cuenta mantiene comportamiento previo y no incorpora consulta de la preferencia actual.

No se cambiaron CSS, datos, seguridad ni archivos de otros módulos. No se hicieron commits.

Nota de concurrencia: la última repetición de typecheck encontró errores JSX en WeeklyPanel.tsx (139 y 237–241), archivo fuera de esta entrega que otro agente estaba editando. El pase indicado arriba corresponde a la ejecución anterior. Repetir al estabilizar esas ediciones.
