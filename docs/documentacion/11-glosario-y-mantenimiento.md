# 11. Glosario y guía de mantenimiento del código

[Volver al índice](README.md)

## 1. Glosario funcional y técnico

| Término | Explicación |
|---|---|
| POS | Punto de venta: circuito de atención y cobro |
| API | Interfaz por la que el frontend solicita datos o acciones al backend |
| IPC | Comunicación entre procesos de Electron |
| Renderer | Proceso que dibuja la interfaz React |
| Worker | Proceso/hilo de trabajo que ejecuta operaciones fuera del hilo principal correspondiente |
| Runtime | Coordinador de servicios y ciclo de vida de la instancia |
| Contrato | Forma y reglas acordadas para una solicitud o respuesta |
| Zod | Biblioteca que valida valores reales además del tipado de compilación |
| DTO | Estructura de datos transferida entre capas |
| SQLite | Motor de base relacional almacenada principalmente en un archivo |
| WAL | Registro auxiliar de escritura de SQLite |
| Migración | Cambio versionado del esquema de base |
| FK | Clave foránea: vínculo con otro registro |
| STRICT | Modo de tabla SQLite que impone reglas de tipo más estrictas |
| Transacción | Grupo de cambios que se confirma o revierte como unidad |
| Idempotencia | Poder repetir una solicitud reconocida sin duplicar su efecto |
| Revisión optimista | Detectar que un registro cambió desde que se leyó antes de guardarlo |
| Hash | Huella calculada de un contenido; no es lo mismo que cifrado reversible |
| Snapshot | Copia del estado relevante en un momento |
| Lease | Control de exclusividad para impedir instancias incompatibles sobre la base |
| Ledger | Historial de movimientos usado para explicar saldos |
| Imputación | Asignación de un pago/cobro a una obligación |
| Saldo disponible de crédito | Parte del límite que todavía puede utilizar el cliente, según sus obligaciones |
| Margen bruto | Venta cubierta menos costo conocido de la mercadería correspondiente |
| Cobertura de costos | Porción de ventas para la que se conoce costo |
| Recargo | Aumento respecto del costo, distinto del margen sobre precio |
| FEFO | Salida priorizando el lote que vence primero |
| SKU | Código interno del producto |
| EAN-13 | Identificador numérico de trece dígitos con control; su estructura no implica registro global propio |
| USB HID | Modo en que el scanner se comporta como un teclado |
| CSRF | Ataque que intenta ejecutar una acción autenticada desde un contexto no autorizado |
| HttpOnly | Atributo de cookie que impide lectura ordinaria desde JavaScript |
| SameSite | Regla del navegador para envío de cookies entre sitios |
| RBAC | Permisos organizados por roles |
| TLS/HTTPS | Protección del transporte entre cliente y servidor/proxy |
| AES-GCM | Cifrado autenticado empleado para respaldos |
| CI | Ejecución automatizada de controles al integrar cambios |
| E2E | Prueba de un circuito completo desde una interfaz o entrada realista |
| p95/p99 | Tiempo por debajo del que se ubica 95 %/99 % de las mediciones; no el promedio |

## 2. Dónde empezar según el cambio

| Necesidad | Archivos/capas a revisar primero |
|---|---|
| Corregir suma, descuento o vuelto | `src/domain/sale.ts`, `payment.ts`, pruebas unitarias y confirmación de venta |
| Cambiar campos de producto | `src/shared/catalog.ts`, repositorio/productos, formulario, importador y exportación |
| Agregar un medio de pago | Contratos, validación, configuración, cobro, cierre, reportes, Excel y comprobantes |
| Cambiar permisos | `src/domain/permissions.ts`, restricciones de servicio, navegación y pruebas negativas |
| Agregar una función opcional | Contratos/features, migración, dependencias, gates de servicio y menú |
| Corregir una búsqueda | Contrato, consulta SQL, normalización, paginación y selección del frontend |
| Cambiar stock | Dominio de inventario, servicios de stock, ubicaciones, lotes y circuitos que mueven mercadería |
| Agregar reporte | Consultas y período, contrato, vista, exportación, impresión y reconciliación |
| Modificar copia/restauración | Servicio de backup, CLI/runtime, esquema esperado y pruebas de interrupción |
| Mejorar diálogo | Componente compartido, CSS calculado, foco, teclado, tamaño móvil y estados busy/error |
| Cambiar navegación | `navigation.ts`, estado de App, funciones y test de navegación |

## 3. Ejemplo: agregar un campo comercial

Supongamos que se necesita un dato adicional en proveedores. Primero se define qué representa, si es obligatorio, cuánto mide y quién puede leerlo o modificarlo. Después se agrega una migración si debe persistirse; no se edita una migración aplicada. Se actualiza el contrato y la conversión de fila a objeto.

El servicio valida el campo en altas y ediciones, incluyendo `expectedRevision`. El formulario debe mostrarlo sólo donde ayude a decidir; no añadirlo a todos los paneles por defecto. Si importa en exportación, se agrega a su columna y pruebas. Si es sensible, se define si entra a auditoría o debe excluirse. Finalmente se prueba guardar, recuperar, editar con conflicto y exportar según roles.

Este recorrido evita el cambio incompleto típico: agregar un input que parece funcionar pero se pierde al recargar o se filtra en un Excel a un perfil indebido.

## 4. Ejemplo: cambiar una regla de stock

Una regla de existencia puede afectar ventas, compras, devoluciones, traslados, conteos, lotes y reposición. Antes de tocarla se identifica su invariante: qué total debe conservarse y qué operaciones legítimas lo modifican. Se prepara un caso pequeño con saldo inicial conocido y se recorre el ciclo completo.

No conviene corregir una pantalla calculando otro saldo local que contradiga el servidor. La UI puede cambiar la presentación, pero la autoridad sobre movimientos y cantidades pertenece al servicio y la transacción. Los reportes y Excel deben utilizar el mismo significado.

## 5. Ejemplo: agregar una ruta web

Una ruta nueva necesita contrato de entrada, operación, autorización y política de función. Se define su método y si es lectura o escritura. Se implementa con el mecanismo de respuesta y errores del producto, conservando CSRF y límites.

Si requiere acceso en Electron, se agrega al contrato y puente autorizado de escritorio, no se asume que la ruta HTTP aparecerá automáticamente allí. Si devuelve una descarga, debe conservar MIME y manejo binario. Los tests incluyen usuario autorizado, usuario prohibido, campos extra, revisión vieja e idempotencia cuando hay efectos.

## 6. Estados y transiciones de referencia

| Entidad | Estados/semántica presentes |
|---|---|
| Venta | `COMPLETED`, `VOIDED`; borrador en tabla separada |
| Compra | `RECEIVED`, `VOIDED`; borrador separado |
| Turno | `OPEN`, `CLOSED` |
| Traslado | `IN_TRANSIT`, `RECEIVED`, `CANCELLED` |
| Pedido | `DRAFT`, `ORDERED`, `PARTIAL`, `RECEIVED`, `CANCELLED` |
| Conteo de Control | `DRAFT`, `APPLIED` |
| Comprobante | `PENDING`, `PRINTED` |
| Lote | `ACTIVE`, `BLOCKED`; vencimiento se deriva también de fecha |
| Devolución | `CONFIRMED`, con líneas y reintegro |
| Producto/cliente/proveedor | Activo/inactivo con relaciones históricas conservadas |

Esta tabla no autoriza cualquier transición entre estados. Cada servicio decide precondiciones y efectos. Un PATCH genérico de `status` que omita movimientos rompería el circuito.

## 7. Pautas para soporte y diagnóstico

Pedir módulo, usuario/rol, fecha aproximada, identificador de operación y secuencia de pasos. Distinguir “no aparece”, “no deja guardar”, “se guardó dos veces” y “no llegó respuesta”. Son problemas diferentes. No solicitar la contraseña del usuario para entender un error que puede reproducirse con una cuenta de prueba autorizada.

Conservar logs pertinentes y una copia de datos cuando sea necesario, limitando acceso a información personal. Reproducir en una copia antes de reparar. Si el problema afecta dinero o stock, comprobar también sus contrapartes: turno, lote, cuenta o compra. Dar una solución visual sin reconciliar efectos puede ocultar el error.

## 8. Documentación que debe cambiar con el código

Al agregar una migración, regenerar el diccionario. Al agregar rutas o permisos, regenerar API y revisar explicación de roles. Al cambiar fórmulas, actualizar el capítulo de reportes con ejemplos y límites. Al modificar entorno, mantener la tabla de configuración y los comandos. Al modificar navegación, actualizar el manual para que describa el acceso actual.

La generación usa `src/` y manifiestos. No lee `.env`, datos del negocio ni backups. Ejecuta migraciones exclusivamente en SQLite en memoria. La fecha de corte del generador es explícita y debe actualizarse en una nueva edición; de lo contrario los conteos nuevos quedarían atribuidos erróneamente al corte anterior.

## 9. Cómo se construye esta documentación

`generar-referencias.mjs` compila en memoria las exportaciones necesarias para utilizar migraciones, permisos y filtros reales. Recorre tablas e índices mediante PRAGMA, analiza rutas registradas e inventaría exports y archivos de prueba. No es un generador semántico de toda regla posible: los capítulos explicativos complementan esa extracción.

`ensamblar.mjs` reúne capítulos y referencias en un único Markdown, valida destinos de enlaces locales y produce HTML mediante el renderizador documental. El HTML está pensado para leer, buscar e imprimir sin depender de la aplicación en marcha. Los diagramas conservan su definición en la versión Markdown; la edición HTML ofrece una representación de lectura y acceso a los originales cuando el renderizador no ejecuta Mermaid.

## 10. Principios de continuidad del producto

Mantener la experiencia simple no significa quitar validaciones esenciales. El programa debe pedir poca información en la operación frecuente y conservar internamente suficiente precisión para explicar dinero, mercadería y decisiones. Las opciones avanzadas se muestran cuando aportan valor, y los permisos se aplican en el servidor.

Antes de agregar otra pantalla conviene preguntarse qué decisión facilita, de dónde sale el dato, qué circuito modifica y cómo se recupera de una interrupción. Esa relación entre interfaz sencilla y lógica consistente es lo que permite que el sistema acompañe a un negocio pequeño mientras aumenta su complejidad.
