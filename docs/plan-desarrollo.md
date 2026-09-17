# Plan de desarrollo - El Bocha POS

**Fecha**: 2026-09-17. **Estado**: desarrollo en curso; aceptación final pendiente.
**Responsable**: Luis Agustín Arispe. **Horizonte propuesto**: ocho semanas.

## Propuesta

Aplicación de escritorio offline, orientada a una PC de caja, con React,
TypeScript, Vite, Electron y SQLite. La velocidad se prioriza en escaneo, búsqueda,
confirmación y recuperación. La UI será blanca, con verde como acento, texto y
números grandes y navegación por secciones. El entorno y un scaffold mínimo ya
están preparados; Catálogo y Stock están implementados. Backend de ventas, pagos
y anulación implementado; pantallas de Caja/peso e Histórico, dashboard y backup
de usuario pendientes. [Guía de desarrollo](entorno-desarrollo.md).

La elección de Electron favorece instalación y desarrollo con TypeScript; el
instalador ocupa más que Tauri. Si el hardware objetivo no alcanza las metas,
se mide el cuello de botella antes de cambiar de stack. Sin Next.js ni FastAPI
en esta propuesta. SQL es el lenguaje de consultas; SQLite es el motor local.

## Specs separadas

Cada carpeta contiene spec.md, plan.md, research.md, data-model.md, contracts/,
quickstart.md, tasks.md y checklists/requirements.md, con formato Spec Kit.

| Orden | Spec | Entrega comprobable | Depende de |
|---|---|---|---|
| 1 | [001 Base de escritorio](../specs/001-desktop-core/spec.md) | App offline, worker, SQL, migraciones, UI y errores | Ninguna |
| 2 | [002 Catálogo](../specs/002-product-catalog/spec.md) | CRUD, búsqueda, SKU/barcode y carga validada | 001 |
| 3 | [003 Stock](../specs/003-stock-ledger/spec.md) | Conteos, ingresos, mermas, ajustes y mínimos | 001, 002 |
| 4 | [004 Caja/scanner](../specs/004-checkout-scanner/spec.md) | Carrito, foco, teclado, descuentos y draft | 001, 002, 003 |
| 5 | [005 Fiambres/peso](../specs/005-weighted-products/spec.md) | Precio/kg, ingreso gramos y porciones separadas | 002, 003, 004 |
| 6 | [006 Ventas y pagos](../specs/006-sales-payments-history/spec.md) | Commit atómico, efectivo/tarjetas, histórico y anulación | 001..005 |
| 7 | [007 Dashboard mensual](../specs/007-monthly-dashboard/spec.md) | Totales, pagos, rankings y stock bajo actual | 002, 003, 006 |
| 8 | [008 Instalación/backup](../specs/008-backup-installation/spec.md) | Instalador, snapshot, restore y mantenimiento | 001, 002, 003, 006, 007 |
| 9 | [009 Usuarios/permisos](../specs/009-users-roles/spec.md) | Ingreso, perfiles, administración por jefe y trazabilidad | 001, 002, 003, 006 |

Los números son identificadores de specs. La implementación local está en
`feature/users-roles` (incrementos previos en `feature/desktop-catalog`). No se creó/publicó un repositorio remoto de GitHub.

Se adelanta el backend 006 por pedido de Agus, reutilizando borrador y cantidades
base antes de desarrollar las pantallas 004/005. [Entrega y límites](entrega-03-backend-ventas.md).

Ampliación pedida: usuarios vendedor/supervisor/jefe, creación de cuentas por jefe,
restricción de dashboard a jefe y posible despliegue web. Se implementa 009 antes
de conectar Caja e Histórico. Se conserva escritorio/SQLite y se desacopla la
autorización del transporte; esta etapa no incluye publicación web.

## Reglas que afectan todos los módulos

1. Dinero en centavos, pesos en gramos, unidades enteras. Precio histórico por
   kilo o artículo se guarda en cada línea. Barcode nunca se convierte a número.
2. Confirmar venta y descontar stock es una transacción; reintentos no duplican.
   No vaciar carrito antes de saber que se guardó. Ventas anuladas no se borran.
3. Efectivo, débito, crédito, transferencia y otros; pago mixto. Registrar la forma
   de cobro no integra una terminal ni procesa una tarjeta. Vuelto no es venta.
4. Stock necesita conteo inicial real. Sin cantidades disponibles, mostrar
   desconocido, no agotado. La carga de catálogo no implica contar mercadería.
5. Dashboard separa vendidos en unidades de vendidos en kg y factura neta por
   producto; no sumar unidades y gramos en un ranking engañoso.
6. Base y recursos locales; sin internet para operar. Respaldo externo y restore
   probado forman parte de la entrega. Sin ARCA ni comprobantes fiscales.

## Flujo de trabajo del negocio

Abrir Caja -> escanear/buscar -> corregir cantidad o ingresar gramos -> revisar
subtotal/descuento/total -> registrar cobro y vuelto -> confirmar -> siguiente
venta. El scanner está activo en Caja lista; formularios y modales tienen sus
propias entradas. Entrar a Stock para recepcionar mercadería o realizar conteo.
Entrar a Histórico para revisar/anular y a Dashboard para analizar un mes.

## Dashboard útil para el encargado

- Vendido bruto, descuentos, neto, operaciones y ticket promedio.
- Evolución diaria y comparación con el mes anterior, indicando el período.
- Efectivo frente a tarjeta por importe aplicado, con desglose débito/crédito.
  Transferencias y otros separados; mixtos no se cuentan como ventas duplicadas.
- Top por facturación neta, top unidades y top kg. Inactivos mantienen su historial.
- Stock actual bajo mínimo, agotado y negativo; existencias desconocidas aparte.
- Ayuda de reposición: productos bajos y cómo se vendieron en el mes elegido.
  Reglas explícitas, sin IA, promesas de pronóstico o márgenes sin costo de compra.

## Calendario de ocho semanas

Estimación de planificación, no nuevo compromiso comercial. Se ajusta tras revisión
de alcance y prueba de PC/scanner; el stock/dashboard suman trabajo al POS inicial.

| Semana | Trabajo | Evidencia de salida |
|---|---|---|
| 1 | Revisar specs, scaffold de escritorio/SQL, prueba temprana instalador y binding nativo | Abrir offline en Windows; medir arranque; conservar DB al reinstalar |
| 2 | Catálogo, búsqueda y preview de carga; prototipo de lectura con scanner real | Barcode exacto con Enter; archivo de prueba de 2.000 filas validado |
| 3 | Stock por unidad/gramos, recepción, apertura y conteo | Ledger concilia; desconocido separado de cero |
| 4 | Carrito, scanner, foco y descuentos | 100 lecturas sin pérdidas; circuito de teclado completo |
| 5 | Fiambres, pagos y persistencia atómica | Pesajes exactos; mixto con vuelto; reintentos sin doble venta |
| 6 | Histórico, anulación y dashboard; iniciar carga real del catálogo | Totales por pago/producto concilian; venta histórica no cambia |
| 7 | Completar carga inicial, backups/restore y pruebas con mercadería real | 2.000 productos revisados; copia externa y recuperación probada |
| 8 | Pruebas finales, instalación, práctica y guía de uso | Cajero opera; benchmark en equipo; checklist de entrega firmado internamente |

Carga estimada: **12 a 20 horas para aproximadamente 2.000 productos** distribuidas
entre semanas 6 y 7, según estado de datos. Conteo inicial de existencias y
configuración de etiquetas de balanza son actividades distintas; no se presume
que entren automáticamente en ese tiempo. Habilitar stock por grupos contados
permite arrancar sin inventar cantidades en productos todavía sin conteo.

## Checklist de entrega

- [ ] PC y sistema Windows objetivo verificados, instalación y update probados.
- [ ] Scanner físico HID, layout y Enter configurados; códigos con cero inicial.
- [ ] Caja completa sólo con scanner/teclado y números legibles en el puesto.
- [ ] Precio por kilo, gramos, descuentos, efectivo y pagos mixtos correctos.
- [ ] Venta, pagos y stock atómicos, recuperación de resultado incierto comprobada.
- [ ] Catálogo cargado y precios revisados; conteos de stock identificados.
- [ ] Histórico inmutable por edición de catálogo, anulaciones trazables.
- [ ] Reportes concilian y señalan pagos mixtos y stock actual correctamente.
- [ ] Backup externo y restore con fallos simulados verificados.
- [ ] Guía, práctica inicial y procedimiento de mantenimiento mensual disponibles.

## Alcance comercial a revisar

Presupuesto vigente: USD 1.000 desarrollo/instalación, USD 250 carga inicial,
USD 80/mes mantenimiento. Pagos USD 500 / 250 / 500 con períodos negociables.
Stock, productos por peso y dashboard son ampliaciones pedidas después del
presupuesto. Este plan los incluye como alcance técnico propuesto; no altera
precios ni condiciones del PDF ni da por acordado que absorban ese costo.

Fuera de v1: varias cajas, nube, facturación fiscal, procesamiento bancario,
devoluciones parciales, proveedores/compras, lotes/vencimientos, arqueo/cierre
diario, exportación Excel e integración directa a balanza. Lectura de etiquetas
de balanza es extensión condicionada a muestras verificadas, no universal.

## Documentos para revisar

Primero [arquitectura](arquitectura.md), [modelo de datos](modelo-datos.md) y
[scanner/peso](scanner-y-peso.md). Después spec/plan/tasks de cada módulo en orden.
[Spec Kit y selección de feature](spec-kit.md). Todos los supuestos tienen defaults
explícitos; no se requiere responder preguntas para revisar este borrador.
