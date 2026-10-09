# Compras, cuentas, promociones y administración — T14–T18

Implementación del 7 de octubre de 2026. Scope: compras/proveedores, clientes, agenda, promociones, funciones, usuarios, actividad y copias. Ayuda y estilos compartidos son integración del coordinador.

## Cambios

- Compras conserva scanner, líneas, recuperación del borrador y alta contextual del proveedor. Se retiró Excel del encabezado de recepción; sigue disponible en historial, proveedores y detalle. Datos opcionales del proveedor tienen una etiqueta concreta.
- Cuenta de proveedor conserva la tarea de pago única (Registrar pago desaparece al abrirla), importe/fecha/medio, distribución manual y validaciones. Muestra el resumen de la distribución automática calculada por el helper existente y ofrece recuperación de consulta.
- Clientes conserva cuenta a demanda, datos de contacto y crédito con su permiso. Nota opcional plegada; errores de cuenta tienen reintento, y lista vacía tiene texto específico. No se cambió la selección de cliente en Caja.
- Agenda ofrece Todos/Cobrar/Pagar, acciones neutrales, total del filtro calculado por servidor y obligaciones individuales con identidad intacta. No suma una página como total ni redondea mínimos. Oculta paginación sin filas; filtros y página se recuerdan por contexto de entrada.
- Promoción usa selector de tipo compacto; alcance y beneficio preceden programación. Nombre sugerido a partir de la regla, editable; programación resume estado y fechas. Toda selección de combo sigue editable, sin cortar a doce líneas. Carga, vacío y error de productos/categorías ofrecen salida. Se conserva cálculo y porcentajes actuales; no se inventó ahorro monetario.
- Funciones se agrupan por Ventas, Mercadería y compras, Clientes y Análisis. Confirmación enumera todas las diferencias reales y explica dependencias existentes. Clientes/cuenta y stock/ubicaciones se sincronizan con las restricciones vigentes del servidor. No se muestran cantidades de compromisos que la API no entrega; el servidor conserva su comprobación y error exacto.
- Usuarios distingue estado de cuenta de bloqueo por intentos. Acceso se consulta en un diálogo que explicita que no hay dato de bloqueo; restablecer sigue siendo explícito y conserva estado activo/inactivo. Roles explicados sin cambiar permisos ni contraseña.
- Actividad comparte etiquetas comerciales para operaciones conocidas; operación e identificador completo quedan en detalle, con fallback claro. Cambios estructurados conservan antes/después e incorporan detalle técnico y reintento.
- Copias conserva estado, lista, descarga y restauración autenticada. Subir explica que agregar el archivo no reemplaza datos; restauración mantiene consecuencias y recuperación por revisión vencida. Clase específica de ancho preparada para QA visual.

## Evidencia realizada

- `npm run typecheck`: pasó después de los cambios principales; última ejecución inició a las 14:08, resultado final registrado por coordinador si hubiera cambios simultáneos.
- ESLint dirigido a todos los módulos del scope y tres suites de comercio: pasó sin avisos.
- Vitest: ocho archivos / 22 pruebas pasaron: supplier-accounts, promotions, features, permissions unitarios y supplier-accounts, customer-accounts, business-features, promotions de integración.
- Vitest: control-commercial y control-operations, dos archivos / 17 pruebas pasaron.
- Suites web de compras, promociones y cliente/cobro adaptadas al helper de navegación nuevo. Agregan comprobación de nombre sugerido, ausencia de doble CTA de pago y resumen monetario exacto. Cliente/cobro abre Agregar cliente y comprueba revelado progresivo.

## Integración y pendientes

- Integrar `docs/ui-ux-commerce-styles.css` dentro de perla.css; es un bloque de trabajo, no una nueva hoja importada.
- Pendiente ejecución Playwright de las tres suites con servidor de tests aislado por el coordinador y validación visual 390/1440, anchos adicionales y zoom 200%. No se usó ni mutó la demo.
- Pendiente reproducir ancho real de Copias antes de atribuir un defecto; no se declara solucionada la anomalía de captura.
- Agenda mantiene lista individual. Una agregación global por contraparte/fecha necesita un contrato adicional; no se implementa una agregación engañosa de las 25 filas visibles.
- Las cuentas mantienen reglas de sobrepago existentes. No se reinterpreta crédito a favor ni se compensan saldos.
- Validación humana y medición comparativa de velocidad pendientes.
