# 10. Pruebas, limitaciones y evolución

[Volver al índice](README.md)

## 1. Qué significa “está probado”

La calidad se evalúa por evidencia de un circuito y una versión concretos. Que exista un archivo de prueba no demuestra que haya pasado hoy. Que un test de servicio pase no demuestra alineación visual de un diálogo. Que el scanner se simule con teclado no demuestra compatibilidad física con cualquier lector.

En este corte se inventariaron 93 archivos `.test` o `.spec`. El [inventario](referencia-inventario.md) enumera rutas y títulos declarados. El conteo no equivale a casos ejecutados ni a porcentaje de cobertura; hay parametrizaciones y varios escenarios por archivo.

Durante esta entrega documental se ejecutó la reconstrucción de las 29 migraciones en SQLite en memoria y la generación/validación de referencias. No se volvió a ejecutar toda la suite funcional, ni se hizo pentest, ni se conectó hardware. Los informes anteriores permanecen enlazados como antecedentes.

## 2. Capas de pruebas existentes

### Unitarias

Vitest cubre cálculos de peso, dinero, descuentos, pagos, costos, devoluciones, promociones, permisos, fechas de reporte, configuración y validación. También hay pruebas de controladores de checkout/compras, escritores de borrador, cola de escaneo, foco y almacenamiento de operaciones pendientes.

Esta capa permite encontrar rápidamente errores de redondeo, rangos, transiciones o reglas sin arrancar un navegador. Es especialmente útil para entradas pequeñas que de otro modo parecen correctas visualmente: un descuento que deja un centavo, un código con cero inicial o un kilo con tres decimales.

### Integración

Los tests abren bases aisladas y ejercitan servicios: importación, migraciones, ledger de stock, atomicidad de ventas, cuentas, lotes, promociones, compras, transferencias, aislamiento web, permisos, respaldos, CLI, lease y herramientas de Control.

Al probar una escritura se verifica su efecto en más de una tabla y su reversión si falla. También se cubren reintentos, conflictos de revisión y resultados. Los tests de exportación comprueban contenido y filtros, no sólo que exista un archivo con extensión `.xlsx`.

### Navegador web

Playwright recorre módulos, búsquedas, promociones, compras, notificaciones, resultados, control, Excel, día de tienda, backup/recuperación, scanner, seguridad, crédito a cliente y casos de borde. Los proyectos usan servidores y puertos separados para evitar que dinero, sesiones o rate limits de un escenario contaminen otro.

La configuración actual crea catorce escenarios/proyectos web, con un worker de pruebas y ejecución no completamente paralela. La base predeterminada de puertos comienza en 3087 y llega a offsets de +13. Si una demo ocupa esos puertos, hay que elegir otra base mediante `BOCHA_WEB_TEST_PORT`; no detener una instancia ajena sólo para que los tests arranquen.

### Escritorio y paquete

Los tests de Electron incluyen arranque, búsqueda de productos, stock, historial, ventas, usuarios y resumen mensual. Existe un script específico para probar el paquete. Ejecutar la web no valida automáticamente IPC, sandbox, ruta de datos o carga del módulo nativo de escritorio.

## 3. Comandos de calidad

| Comando | Qué verifica |
|---|---|
| `npm run typecheck` | Consistencia de tipos TypeScript |
| `npm run lint` | Reglas ESLint con cero advertencias permitidas |
| `npm test` | Build de API previo y suite Vitest de unidad/integración |
| `npm run test:watch` | Vitest en vigilancia para desarrollo |
| `npm run test:web` | Build web/API y circuitos Playwright web |
| `npm run test:e2e` | Build de escritorio y Playwright Electron |
| `npm run test:packaged` | Verificación específica de distribución empaquetada |
| `npm run check` | Tipos, lint, tests y builds de escritorio/web/API declarados en el script |
| `npm run format:check` | Consistencia de formato, no de comportamiento |

`check` no incluye por sí solo todos los circuitos de navegador, hardware o Docker. Un checklist de release debe añadir las pruebas que correspondan al destino de entrega.

## 4. Matriz de circuitos de aceptación

Los escenarios siguientes describen qué debe verificarse en una entrega. No se presentan como ejecutados en esta sesión.

| Circuito | Pasos esenciales | Invariantes a comprobar |
|---|---|---|
| Venta de contado | Abrir turno, escanear, cobrar, imprimir, cerrar | Una venta, pago exacto, stock descontado, efectivo coherente |
| Pago mixto | Efectivo + transferencia, revisar vuelto | Suma aplicada exacta, vuelto sólo efectivo |
| Producto por kilo | Elegir producto, cargar 250 g, editar porción | Base en gramos, total por kilo, línea corregible |
| Crédito de cliente | Crear básico, habilitar por jefe, fiar, cobrar parcial | Permisos, límite, deuda y movimientos de caja |
| Compra | Borrador, recepción con costo y lote | Stock/costo/cuenta se actualizan juntos |
| Pedido parcial | Crear, confirmar, recibir parte, recibir resto | Pendiente nunca negativo, compras vinculadas |
| Traslado | Despachar, recibir cantidad real o cancelar | Origen, tránsito y destino sin duplicación |
| Conteo | Dejar líneas sin contar, contar cero, venta concurrente, aplicar | Nulo distinto de cero, conflictos detectados |
| Devolución | Devolver parte de venta con descuento | Remanente y reintegro no exceden original |
| Anulación | Vista previa, estado cambiado, confirmación | Revalidación, eventos y reversión coherentes |
| Promoción | Umbral menor/igual/mayor, reglas simultáneas | Prioridad, consumo de cantidades y ahorro correcto |
| Excel | Búsqueda, varias categorías/estados, descarga | Todas las coincidencias, filtros registrados, tipos correctos |
| Backup | Crear, descargar, restaurar en entorno aislado | Integridad, clave, versión, sesiones revocadas |
| Corte de red | Perder respuesta después de confirmar | Recuperación por clave sin duplicar venta |
| Roles | Repetir rutas con vendedor/supervisor/jefe | Negación en backend, no sólo ocultamiento visual |
| Móvil | Carrito, cobro, cliente, filtros y cuenta | Acciones alcanzables, sin desbordes que oculten importes |

## 5. QA de lector y ritmo de atención

Una prueba útil no es sólo escanear un artículo una vez. Debe incluir ráfaga, códigos repetidos, artículo inactivo, código desconocido, peso intercalado, foco en otro campo, apertura de modal, pérdida de red y cierre de sesión.

El criterio es exactitud de unidades y ausencia de efectos inesperados. Si se envían diez lecturas válidas, deben llegar diez unidades o diez decisiones equivalentes de peso, según el producto. Una técnica de deduplicación por tiempo puede mejorar aparente fluidez y a la vez perder ventas legítimas; por eso la cola se prueba por secuencia y resultado.

La aceptación física necesita el scanner final, su configuración y el equipo de mostrador. La misma recomendación aplica a impresora, tamaño de papel y balanza. La simulación automatizada cubre la lógica, no el cable, driver o protocolo de todo fabricante.

## 6. Pruebas de integridad financiera

Para una venta se deben reconciliar bruto, descuentos, neto, pagos, deuda y vuelto. Para devoluciones se deben probar fracciones, varias devoluciones consecutivas y la última devolución que completa el remanente. Para costos debe distinguirse referencia inexistente de cero y comprobar que un cambio actual no reescriba el pasado.

Las pruebas temporales requieren fin de mes, febrero, cambio de año, zona horaria y devolución en un período distinto al de venta. La diferencia de criterio detectada entre neto y rentabilidad exige una decisión explícita antes de afirmar conciliación uniforme de todos los bloques.

## 7. Concurrencia y errores de infraestructura

Hay pruebas de atomicidad, concurrencia web, lease, recuperación y base. Aun así, una entrega debería ensayar dos cajas compitiendo por la última unidad, dos ediciones del mismo producto, cierre mientras se intenta cobrar y recepción repetida tras timeout.

También deben probarse disco sin espacio, permisos insuficientes, base ocupada, proceso interrumpido durante restauración y servidor reiniciado mientras se prepara una exportación. Las operaciones pendientes no deben desaparecer sólo para que la interfaz vuelva a estar limpia.

No se recomienda simular corrupción sobre la única copia de una base real. Los ensayos se ejecutan en un entorno aislado, conservando datos origen y un procedimiento repetible.

## 8. Rendimiento: qué se sabe y qué falta medir

El repositorio incluye pruebas de rendimiento de catálogo/caja, reportes mensuales, ubicaciones, compras y promociones. Los documentos históricos registran mediciones locales sobre miles de productos y ventas. Son observaciones de ese equipo y datos, no un SLA de hosting.

Una prueba de producción representativa debe combinar caja activa, consultas, Excel, trabajo semanal y respaldo. Medir sólo una consulta SQL rápida no demuestra latencia final con red, autenticación, render y dos personas trabajando.

SQLite y un worker serializado son adecuados para una arquitectura pequeña, pero la capacidad real depende del volumen y tipo de consulta. Antes de prometer muchas sucursales o decenas de cajas simultáneas hay que medir cola, memoria, CPU, tiempos p95/p99 y comportamiento ante fallos.

## 9. Antecedentes documentados

Los documentos existentes incluyen informes de día de tienda, seguridad web, casos de borde, backups, escala local, exportaciones y mejoras de interfaz. Entre las referencias útiles están:

- [Control del negocio](../control-implementation.md).
- [Exportación Excel](../excel-export.md).
- [Alta de clientes desde Caja](../customer-from-checkout.md).
- [Pruebas web y seguridad](../testing-web-security.md).
- [Verificación de día de tienda](../store-day-verification.md).
- [Verificación de backups en navegador](../backup-browser-verification.md).
- [Casos de borde QA](../qa-edge-cases.md).
- [Preparación de entrega](../release-readiness.md).
- [Ajustes de controles y acento](../ui-balanced-controls.md).

Sus fechas, cantidad de tests y builds corresponden a esas pasadas. Esta referencia no reemplaza sus resultados por un “todo aprobado” actual ni mezcla los conteos de diferentes días.

## 10. Limitaciones verificadas o no demostradas

| Tema | Situación del corte analizado |
|---|---|
| Fiscalidad | Comprobantes no fiscales; no se identificó integración de autorización fiscal |
| Banco/posnet | Registra medio e importe; no autoriza ni concilia automáticamente la transacción bancaria |
| Balanza | Peso ingresado/calculado; no integración genérica de hardware |
| Impresión | `window.print()` y marca de estado; sin confirmación física garantizada |
| Offline web | Recuperación local de pendientes; no operación multiusuario offline sincronizada |
| Mac | Proyecto separado; paridad con este checkout no verificada |
| Electron/web | Comparten núcleo; rutas y capacidades web requieren revisión de paridad |
| Multiempresa | No es aislamiento SaaS multi-tenant por organización |
| Escalado API | Una instancia activa por base con lease; no réplicas escritoras compartidas |
| Cifrado | Backups cifrados; base activa sin cifrado de contenido propio |
| Autenticación | Sin MFA o proveedor corporativo identificado |
| Backups antiguos | Validación actual requiere comprobar compatibilidad de versiones explícitamente |
| Métricas temporales | Neto y rentabilidad pueden tratar devoluciones de períodos distintos con criterios diferentes |
| Auditoría | Trazabilidad de aplicación; no evidencia inmutable contra acceso directo al archivo |
| Accesibilidad | Hay mecanismos de foco/semántica; no auditoría integral certificada |
| Dependencias | Versiones fijadas; no se hizo evaluación actual de vulnerabilidades en esta entrega |

## 11. Evolución recomendada, separada de lo implementado

**Prioridad operativa:** validar restauración entre versiones y definir una política consistente de devoluciones entre períodos en todos los bloques de métricas. Son temas donde una interpretación errónea puede afectar confianza en el producto.

**Prioridad de entrega:** ejecutar una matriz de paridad web/escritorio/Mac sobre las versiones que realmente se entregan; probar scanner e impresora reales; registrar instalación limpia y actualización. La marca y el menú similares no prueban equivalencia funcional.

**Prioridad de mantenimiento:** consolidar reglas visuales para reducir capas y excepciones, documentar contratos públicos de forma generable y ampliar observabilidad de trabajos/colas sin exponer datos personales.

**Prioridad de crecimiento:** medir carga concurrente representativa, formalizar respaldo externo y procedimiento de recuperación, y decidir cuándo una expansión necesita una arquitectura de datos distinta. No conviene introducir complejidad distribuida sólo por anticipación si la operación actual no la exige.

Estas recomendaciones no forman parte de una implementación realizada en esta tarea. Son conclusiones de la lectura del código que ayudan a planificar el siguiente trabajo.

## 12. Criterio de aceptación de una release

Una versión entregable debe identificar código y esquema, conservar respaldo previo, pasar controles de tipos/lint y pruebas pertinentes, demostrar los circuitos críticos del destino, revisar permisos y datos iniciales, y disponer de recuperación ensayada. La evidencia debe indicar fecha, entorno y límites.

El criterio no es “tiene muchas funcionalidades”. Es que el comercio pueda vender, recibir mercadería, controlar dinero y recuperarse de un error sin perder trazabilidad ni requerir que el operador entienda detalles internos.
