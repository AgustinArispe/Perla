"""Genera documentos de planificación, no código de la aplicación."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
DATE='2026-09-17'
features=[
dict(slug='001-desktop-core',title='Base de escritorio y persistencia',module='core',deps=[],
 summary='Abrir la aplicación local, mantener datos entre reinicios y preparar operaciones de negocio sin bloquear Caja.',
 stories=[
 ('Abrir la caja sin internet','P1','El cajero abre el acceso directo y encuentra la pantalla de Caja disponible.',
  'La PC está sin red y la app instalada','Se abre el acceso directo','Caja aparece sin navegador, terminal ni configuración manual'),
 ('Mantener los datos entre sesiones','P1','Agus instala una actualización y los datos del comercio permanecen disponibles.',
  'Hay una base con datos de una versión anterior','Se actualiza la aplicación y se reinicia','Los datos siguen disponibles y el esquema tiene una migración trazable'),
 ('Resolver un fallo sin registrar éxito falso','P1','El cajero recibe un error claro ante una operación que no pudo guardarse.',
  'La PC no tiene espacio o el servicio local no responde','Se intenta persistir','La app informa el fallo, conserva la operación pendiente y permite recuperación')],
 requirements=[
 'Operación offline y una única instancia de escritura; segundo lanzamiento enfoca la ventana existente.',
 'Separar interfaz, lógica de negocio y acceso a datos; los informes no congelan la pantalla.',
 'Guardar datos fuera de la carpeta de instalación, con entornos de desarrollo y producción separados.',
 'Versionar migraciones y bloquear una versión de app que no soporte el esquema encontrado.',
 'Exponer sólo operaciones de negocio validadas a la interfaz, sin acceso arbitrario a archivos ni consultas.',
 'Pantallas claras por módulo, fondo blanco y tamaños definidos en la constitución.',
 'Informar errores de persistencia y conservar el último borrador recuperable.'],
 edges=['Doble lanzamiento y worker que se cae durante una solicitud.','Migración fallida, DB de versión futura, archivo corrupto y disco lleno.','Reiniciar tras commit exitoso sin haber recibido la respuesta.'],
 outcomes=['Inicio frío <= 3 s en la PC de referencia.','El 100% de operaciones fallidas evaluadas evita mostrar éxito.','Actualizar y reiniciar preserva todos los datos de la prueba.'],
 assumptions=['Una PC Windows 11 x64, un comercio y un depósito lógico.','Electron recomendado para mantener desarrollo TypeScript; no servicios externos.'],
 decision='Electron con preload limitado y worker para SQL. SQL explícito en SQLite, driver better-sqlite3; rebuild nativo y Windows son parte de la prueba inicial.',
 alternatives='Tauri agrega Rust/WebView2; Next.js y FastAPI agregan procesos que no necesitamos en una PC.',
 files=['src/main/bootstrap.ts','src/main/preload.ts','src/main/ipc.ts','src/worker/index.ts','src/worker/db/connection.ts','src/worker/db/migrations.ts','src/shared/contracts.ts','src/renderer/App.tsx','src/renderer/styles/tokens.css'],
 model='schema_migrations, app_settings y checkout_drafts. UUID internos, números de venta visibles correlativos. Guardar ruta estable userData; DB no se mueve por instalar.',
 contract='system.health(): versión de app, versión de esquema y estado del worker. Todas las operaciones usan el Result común y validan el emisor IPC.',
 tests=[('unit','ipc-validation','Rechazar un canal desconocido y un payload no válido sin ejecutar SQL.'),('integration','migrations','Migrar una DB fixture; fallar a mitad y verificar rollback y versión anterior.'),('e2e','desktop-startup','Abrir offline dos veces y verificar una ventana; render sigue respondiendo con worker ocupado.')]),
dict(slug='002-product-catalog',title='Catálogo y carga inicial de productos',module='products',deps=['001-desktop-core'],
 summary='Administrar productos unitarios y por kilo, con búsqueda rápida y una carga inicial revisable de aproximadamente 2.000 artículos.',
 stories=[
 ('Administrar un producto','P1','El encargado da de alta un producto, modifica su precio o lo desactiva.',
  'Existe un producto vendido antes','Se cambia el precio o se desactiva','El catálogo cambia, las ventas anteriores conservan sus datos y el inactivo no se agrega a nuevas ventas'),
 ('Encontrar productos rápidamente','P1','El cajero busca por nombre, SKU o código de barras.',
  'Hay 2.000 productos con nombres similares y códigos con cero inicial','Se busca un código exacto o parte del nombre','Se encuentra el artículo correcto con su precio y presentación'),
 ('Cargar el catálogo de forma segura','P2','Agus revisa un archivo antes de aplicar la carga inicial.',
  'El archivo tiene un código repetido y filas con precio inválido','Se revisa la carga','Se indican filas y motivos; no se aplica una carga parcialmente inválida')],
 requirements=[
 'Cada producto tiene SKU único, nombre, precio, estado, unidad UNIT o KG, código opcional y fechas.',
 'El código es texto, único cuando existe; no perder ceros iniciales. Productos sin barcode se buscan por SKU/nombre.',
 'Permitir alta, modificación e inactivación; impedir borrado físico de productos con historial.',
 'Guardar precio por artículo para UNIT y por kilo para KG; impedir cambio de unidad cuando ya hay movimientos o ventas.',
 'Buscar nombre sin distinguir acentos/mayúsculas, código y SKU; Caja sólo ofrece activos.',
 'Carga inicial CSV UTF-8 con columnas explícitas sku, barcode, nombre, precio_ars, unidad, activo, categoria, stock_inicial, stock_minimo.',
 'Previsualizar errores por fila, duplicados, altas y cambios; aplicar sólo con validación completa y una transacción.',
 'Archivo sin stock_inicial mantiene existencias desconocidas; no inventar cantidades para el dashboard.',
 'Registrar hash/lote aplicado; confirmar cambios de precio existentes; invalidez o reintento no duplica filas ni movimientos.'],
 edges=['Nombres con tildes, precio con coma decimal y barcode vacío.','Barcode duplicado dentro del archivo y contra catálogo.','Producto modificado mientras el cajero lo tiene en carrito.'],
 outcomes=['Búsqueda p95 <= 150 ms con 2.000 productos.','Cargar y buscar 2.000 filas sin códigos ni precios alterados.','Cada fila inválida tiene ubicación y causa antes de persistir.'],
 assumptions=['No usar un buscador remoto ni un proveedor de precios.','CSV es una herramienta de carga inicial de Agus; no se requiere exportación a Excel.'],
 decision='Repositorio SQL con normalización de búsqueda y caché invalidada tras guardar/importar. PreviewImport usa token asociado al archivo validado y su hash.',
 alternatives='CRUD HTTP innecesario; importación directa sin preview arriesga precios/códigos. Barcode obligatorio excluiría fiambres.',
 files=['src/worker/products/service.ts','src/worker/products/repository.ts','src/worker/products/import.ts','src/renderer/features/products/ProductList.tsx','src/renderer/features/products/ProductForm.tsx','src/renderer/features/products/ImportPreview.tsx','src/worker/db/migrations/002_products.sql'],
 model='products e import_batches. SKU, barcode y revision únicos/validados. Stock inicial usa servicio de inventario de 003 dentro de la misma transacción; sin 003 sólo cargar catálogo sin cantidades.',
 contract='products.findByBarcode, search, save, setActive, previewImport y applyImport del contrato común. Cantidad existente no es un campo editable del formulario de productos.',
 tests=[('unit','product-validation','Parsear 12.000,50 ARS con formato de importación explícito a 1200050 centavos y mantener 0123456789012 como texto.'),('integration','catalog-import','Un duplicado en fila 1500 revierte el lote; repetir hash aplicado no duplica productos.'),('e2e','product-search','Editar precio, desactivar y buscar código/nombre con teclado; comprobar que el inactivo desaparece de Caja.')]),
dict(slug='003-stock-ledger',title='Stock, ingresos y ajustes',module='stock',deps=['001-desktop-core','002-product-catalog'],
 summary='Conocer existencias por unidad o gramos, registrar reposición, mermas y conteos, y señalar productos con poco stock.',
 stories=[
 ('Comenzar con un conteo real','P1','El encargado registra cuánto hay de cada producto al comenzar el control.',
  'Un producto tiene stock desconocido','Se registra conteo inicial de 10 unidades','Se muestra balance 10 y queda un movimiento de apertura'),
 ('Registrar mercadería y correcciones','P1','El encargado carga compras, merma o diferencia detectada al contar.',
  'Un queso tiene 3.000 g en stock','Se reciben 2 kg y luego se registra merma de 100 g','El balance pasa a 4.900 g con ambos motivos visibles'),
 ('Identificar faltantes para reponer','P2','El encargado ve productos agotados o bajo su mínimo.',
  'Un producto activo tiene stock 3 y mínimo 5','Se consulta la lista de reposición','Aparece con existencia, mínimo y unidad; desconocidos se muestran por separado')],
 requirements=[
 'Existencias unitarias enteras y productos por peso en gramos; UI convierte kilos sin cambiar unidad base.',
 'Separar stock desconocido de stock cero contado y permitir marcar control de existencias por producto.',
 'Registrar apertura, recepción, merma y ajuste con fecha y motivo; no sobreescribir balance sin movimiento.',
 'Conteo ajusta por diferencia y registra expectedRevision para detectar edición concurrente.',
 'Movimientos y actualización de balance son atómicos; operationKey evita duplicación por doble clic.',
 'Al confirmar venta descontar sólo los productos inicializados; carrito no reserva stock.',
 'Stock insuficiente exige aviso y confirmación con motivo antes de permitir balance negativo.',
 'Al anular revertir movimientos de esa venta una sola vez; no inferir desde configuración actual.',
 'Stock bajo incluye balance <= mínimo; sin stock, negativos y desconocidos tienen etiquetas distintas.',
 'Importar stock inicial usa las mismas reglas, sólo tras un conteo real disponible.'],
 edges=['Repetición de un ingreso, conteos simultáneos y merma que supera existencia.','Venta antes de conteo inicial; cambios de tracking.','Anulación posterior a conteo físico: advertencia y movimiento trazable.'],
 outcomes=['Balance coincide con suma de movimientos para todos los fixtures.','100 reintentos de una operación producen un solo movimiento.','Lista de bajo stock aparece <= 1 s y nunca llama agotado al desconocido.'],
 assumptions=['Un depósito lógico; sin proveedores, órdenes de compra, lotes o vencimientos en v1.','Se permite venta con stock negativo únicamente por decisión explícita.'],
 decision='Ledger inmutable y balance materializado en la misma transacción. La reconciliación audita suma de deltas; no triggers opacos para la lógica de negocio.',
 alternatives='Un campo editable stock no permite explicar faltantes; event sourcing completo es innecesario.',
 files=['src/domain/inventory.ts','src/worker/stock/service.ts','src/worker/stock/repository.ts','src/renderer/features/stock/StockList.tsx','src/renderer/features/stock/MovementForm.tsx','src/worker/db/migrations/003_inventory.sql'],
 model='inventory_balances y stock_movements. quantity_base firmado. OPENING parte de un estado desconocido; recount produce ADJUSTMENT con diferencia. Tracking no elimina ledger.',
 contract='stock.opening, record, count, listLow y movements. Servicio interno aplica movimientos dentro de una transacción provista por sales.complete; no inicia una segunda transacción independiente.',
 tests=[('unit','stock-units','Convertir 2,500 kg a 2500 g; rechazar fracción de unidades y cero en merma.'),('integration','stock-ledger','Apertura 3000, recepción 2000 y merma -100 resultan 4900; fallo SQL revierte balance y movimiento.'),('e2e','stock-count','Registrar conteo, reposición y mínimo; verificar alertas distintas para desconocido, agotado y bajo mínimo.')]),
dict(slug='004-checkout-scanner',title='Caja rápida y scanner USB',module='checkout',deps=['001-desktop-core','002-product-catalog','003-stock-ledger'],
 summary='Operar el carrito con scanner y teclado, controlar el foco y aplicar descuentos sin perder ni duplicar lecturas.',
 stories=[
 ('Agregar productos con scanner','P1','El cajero escanea cada artículo y ve la venta actualizarse.',
  'Caja está lista con un producto unitario activo','Se escanea cinco veces su código terminado en Enter','Se muestra cantidad cinco y total correcto; foco vuelve al escáner'),
 ('Corregir una venta sin perderse','P1','El cajero cambia cantidades, quita artículos o aplica descuentos.',
  'Hay dos artículos en la venta','Se edita cantidad y se aplica 10% de descuento','Subtotal, descuento y total cambian; al salir de edición el foco vuelve a escaneo'),
 ('Recuperar una operación pendiente','P2','El cajero reinicia y revisa el carrito que estaba preparando.',
  'Hay un borrador guardado sin venta confirmada','Se reinicia','Se ofrece recuperarlo o descartarlo, sin cobro ni cambio de stock')],
 requirements=[
 'Scanner HID teclado con sufijo Enter. Procesar códigos como texto mediante una cola ordenada.',
 'Combinar productos UNIT repetidos con misma revisión/precio; productos KG abren calculadora de peso.',
 'Buscar nombre o código, aumentar/restar unidades, editar cantidad y eliminar línea.',
 'Mostrar subtotal, descuento y total por separado; porcentaje o monto fijo con validación y sin floats.',
 'F2 escaneo, F4 descuento, F6 peso, F8 cobro, Esc cerrar edición/modal; Enter en scanner sólo agrega.',
 'Controlar el foco por estados; respetar cantidades, peso y pagos, nunca robar foco durante una edición.',
 'El beep del scanner no equivale a producto agregado; desconocidos e inactivos tienen mensajes explícitos.',
 'Draft local autosave serializado con revisión cada 300 ms y flush en salida controlada; avisar si no se guardó.',
 'Al enviar cobro, congelar carrito y detectar precio actualizado; no limpiar hasta confirmar persistencia.',
 'En peso/cobro indicar captura suspendida. Enter en cobro nunca confirma la venta. Scanner genérico sólo se usa en READY_SCAN; con HID sin prefijo no se puede distinguir de la escritura manual en otros inputs.'],
 edges=['Enter repetido con input vacío, código largo/inválido y scanner sin sufijo.','React vuelve a renderizar mientras entra un código; lookup lento con códigos pendientes.','Cambio de precio desde otra pantalla y caída antes del autosave final.'],
 outcomes=['Escaneo a línea visible p95 <= 100 ms en referencia definida.','100 lecturas a 5/s generan exactamente 100 unidades.','Editar, quitar, aplicar descuento y volver a escanear se realiza sólo con teclado.'],
 assumptions=['Modo HID no permite distinguir conexión ni origen scanner de teclado genéricamente.','La prueba física es requisito de entrega aunque pasen tests de teclado.'],
 decision='State machine de foco, ScanQueue y carrito Zustand; importes derivados del módulo puro de dominio compartido con backend.',
 alternatives='Polling de focus y detección exclusiva por intervalo de teclas fallan durante edición; captura global HID/SDK fuera de v1.',
 files=['src/domain/money.ts','src/domain/discounts.ts','src/renderer/features/checkout/CheckoutPage.tsx','src/renderer/features/checkout/ScanInput.tsx','src/renderer/features/checkout/scanQueue.ts','src/renderer/features/checkout/focusMachine.ts','src/renderer/features/checkout/cartStore.ts','src/worker/checkout/drafts.ts'],
 model='Carrito: lineId, productId, cantidad base, precio/revisión vistos y descuento. Draft no es venta ni reserva inventario. No guardar React state en tabla sales.',
 contract='products.findByBarcode y search; checkout.saveDraft/getDraft; handoff a sales.complete en 006. Cola usa orden de captura y puede detenerse ante entrada de peso.',
 tests=[('unit','scan-queue','Simular resoluciones invertidas: el orden de captura queda preservado y el código repetido suma legítimamente.'),('integration','checkout-draft','Guardar revisión, rechazar stale write y recuperar sin crear una venta ni movimiento.'),('e2e','scanner-focus','Escanear 100 lecturas, editar cantidad, abrir descuento y cerrar con Esc; Enter de captura no pulsa Finalizar venta.')]),
dict(slug='005-weighted-products',title='Fiambres y calculadora de peso',module='weight',deps=['002-product-catalog','003-stock-ledger','004-checkout-scanner'],
 summary='Vender fiambres y otros productos por kilo ingresando el peso real, calculando importe y descontando gramos de stock.',
 stories=[
 ('Cobrar una porción por su peso','P1','El cajero elige un fiambre y carga gramos leídos en la balanza.',
  'Jamón cuesta $12.000/kg','Se ingresa 250 g','La porción cuesta $3.000 y al confirmar la venta descuenta 250 g'),
 ('Corregir porciones por separado','P1','El cajero agrega dos porciones del mismo fiambre y corrige sólo una.',
  'Hay porciones de 250 g y 180 g','La segunda se modifica a 200 g','Quedan líneas de 250 g y 200 g con sus importes recalculados'),
 ('Ingresar kilos sin ambigüedad','P2','El cajero usa gramos o kilos con una unidad visible.',
  'El modal está seleccionado en kilos','Se escribe 0,250','Se interpreta como 250 g; la pantalla muestra unidad e importe antes de agregar')],
 requirements=[
 'Producto KG tiene precio por kilo visible y calculadora de gramos por defecto.',
 'Aceptar gramos enteros o kilos con hasta tres decimales; coma o punto decimal sin separadores ambiguos.',
 'Calcular importe con redondeo half-up a centavos, la misma función de dominio en UI y persistencia.',
 'Peso válido 1..99999 g. Rechazar cero, negativo y subgramos, no truncarlos silenciosamente.',
 'Mostrar nombre, precio/kg, peso e importe antes de agregar; Enter confirma peso, Esc cancela sin movimiento.',
 'No combinar porciones: cada pesaje es una línea distinta. UNIT sigue combinado según reglas de Caja.',
 'Al vender o anular usar quantity_base en gramos; min_stock también expresa gramos.',
 'Primera entrega usa peso manual desde balanza. Parser de etiquetas queda diseñado, desactivado hasta validar formato real.',
 'No afirmar integración automática con balanza o lectura directa de peso por conectar scanner.'],
 edges=['0,0005 kg, 0 kg, >99.999 g, kilos sin unidad explícita.','Cambiar el precio por kilo mientras se calcula y redondeos de porciones pequeñas.','Etiqueta con precio pero sin gramos: no inventar peso dividiendo por precio actual.'],
 outcomes=['250 g a $12.000/kg produce exactamente $3.000.','Todos los casos de cálculo UI y guardado coinciden a centavos.','Agregar y corregir dos pesajes requiere sólo teclado y mantiene porciones separadas.'],
 assumptions=['Balanza disponible con display; peso leído manualmente hasta integración específica.','Perfiles de código variable sólo se habilitan con al menos 10 etiquetas físicas verificadas.'],
 decision='Gramos enteros, precio/kg en centavos y parseo decimal explícito. Componente modal con inputMode decimal según unidad seleccionada.',
 alternatives='Número decimal de kg almacenado como REAL introduce imprecisiones; inferir peso de precio altera stock.',
 files=['src/domain/quantities.ts','src/domain/weightedPrice.ts','src/renderer/features/weight/WeightDialog.tsx','src/renderer/features/weight/weightInput.ts','src/shared/scaleProfiles.ts'],
 model='sale_items.unit_snapshot=KG y quantity_base=gramos. Profiles de balanza se modelan en settings sólo cuando se habilite extensión, no generar patrones supuestos por prefijo.',
 contract='calculateWeightedPrice(priceCentsPerKg:number, grams:number): number; parseWeight(input:string, unit:"g"|"kg"): number o error; resultado es cantidad base para SaleLineInput.',
 tests=[('unit','weighted-price','12345 centavos/kg por 333 g redondea a 4111 centavos; 1200000 por 250 g resulta 300000.'),('integration','weighted-stock','Venta con dos porciones 250+180 reduce 430 g; anulación devuelve exactamente 430 una vez.'),('e2e','weight-dialog','Ingresar 0,250 kg, agregar una segunda porción, corregirla y cancelar una tercera sin tocar carrito.')]),
dict(slug='006-sales-payments-history',title='Ventas, medios de pago e histórico',module='sales',deps=['001-desktop-core','002-product-catalog','003-stock-ledger','004-checkout-scanner','005-weighted-products'],
 summary='Confirmar cobro, registrar venta y stock atómicamente, conservar precios históricos y permitir consulta/anulación trazable.',
 stories=[
 ('Cerrar una venta con forma de pago','P1','El cajero cobra en efectivo, tarjeta o una combinación y registra la venta.',
  'Venta total $10.000','Se carga tarjeta $6.000 y efectivo aplicado $4.000, recibido $5.000','Se registra total $10.000, vuelto $1.000 y efectivo del reporte $4.000'),
 ('Revisar una venta antigua','P1','El encargado filtra por fechas y abre su detalle.',
  'El producto vendido luego cambia de nombre/precio','Se consulta la venta','Detalle conserva el nombre, precio, cantidades y forma de pago originales'),
 ('Anular sin duplicar reposición','P2','El encargado anula una venta equivocada con motivo.',
  'La venta descontó stock al confirmar','Se anula y se repite la solicitud','Queda anulada, conserva detalle y repone sólo una vez los movimientos originales')],
 requirements=[
 'Persistir venta, snapshots, descuento, pagos, stock, evento y eliminación de draft en una transacción.',
 'Registrar CASH, DEBIT, CREDIT, TRANSFER u OTHER; permitir mixto con suma aplicada igual al total.',
 'Efectivo recibido >= aplicado; calcular vuelto. No sumar recibido ni vuelto al total del dashboard.',
 'Checkout key estable y hash: reintento idéntico devuelve la misma venta; contenido distinto produce conflicto.',
 'Revalidar producto, precio, revisión y stock al guardar; error devuelve carrito pendiente sin éxito falso.',
 'Histórico paginado con filtros por fecha y estado; detalle incluye totales y pagos preservados.',
 'Anulación completa con motivo: no borrar, restituir stock por ledger original una sola vez y excluirla de netos.',
 'Fecha comercial en Buenos Aires y timestamps UTC; avisar clock drift observable, no usar timezone accidental.',
 'Carrito sólo se limpia tras commit confirmado. Si resultado incierto, recuperar venta por checkout key.',
 'Ventas con descuento 100% llevan total cero y ningún pago; no aceptar montos negativos o pagos incompletos.'],
 edges=['Doble clic, timeout tras commit, disco lleno antes de commit.','Venta 100% bonificada; descuentos por centavos y pagos mixtos.','Anulación de producto inactivo, stock recalculado y límite de mes a medianoche.'],
 outcomes=['100 reintentos del mismo cierre producen una venta y un descuento de stock.','Confirmación p95 <= 300 ms en referencia definida.','Cada fixture concilia subtotal-descuento=total=suma pagos aplicados; total cero sin pagos.'],
 assumptions=['Registro de pago manual; terminal bancaria y reembolsos fuera de la app.','No devoluciones parciales ni gestión de caja física por turno en v1.'],
 decision='Sales service coordinador transaccional y snapshots; historial paginado por cursor; anulación como evento con motivo y contramovimientos.',
 alternatives='Guardar detalles después de cabecera permitiría ventas parciales; tabla payment_method única impediría pagos mixtos.',
 files=['src/domain/sale.ts','src/domain/payment.ts','src/worker/sales/service.ts','src/worker/sales/repository.ts','src/renderer/features/checkout/PaymentDialog.tsx','src/renderer/features/history/SalesList.tsx','src/renderer/features/history/SaleDetail.tsx','src/worker/db/migrations/006_sales.sql'],
 model='sales, sale_items, sale_payments, sale_events y movimientos relacionados. number correlativo visible UNIQUE; checkout_key UNIQUE; detalle almacena price, name, barcode, SKU y unidad.',
 contract='sales.complete(CheckoutInput), findByCheckoutKey, list, detail y void. complete devuelve SaleDetail y errores recuperables; genera discount allocations y change en el worker.',
 tests=[('unit','payment-discount','Mixto 600000 tarjeta + 400000 efectivo recibido 500000 da change=100000; repartir descuento deja suma exacta.'),('integration','sale-atomicity','Inyectar fallo tras cabecera antes de stock: cero venta/pagos/movimientos; repetir key tras commit devuelve mismo id.'),('e2e','sales-history','Cerrar con F8, confirmar mixto, cambiar precio, filtrar histórico y anular con motivo; stock vuelve una vez.')]),
dict(slug='007-monthly-dashboard',title='Dashboard mensual y ayuda para reposición',module='dashboard',deps=['002-product-catalog','003-stock-ledger','006-sales-payments-history'],
 summary='Mostrar cuánto se vendió, productos destacados, efectivo frente a tarjeta y existencias bajas con recomendaciones comprensibles.',
 stories=[
 ('Ver cómo fue el mes','P1','El encargado selecciona un mes y revisa total, cantidad de ventas y evolución.',
  'Hay ventas completadas y anuladas en el mes','Se abre el dashboard','Total neto excluye anuladas y muestra monto/cantidad anulado por separado'),
 ('Comparar formas de pago y productos','P1','El encargado identifica medios de pago y artículos destacados.',
  'Hay pagos mixtos y productos UNIT/KG','Se consulta el resumen','Tarjeta agrupa débito/crédito por importe; unidades y kilos tienen rankings distintos'),
 ('Decidir qué reponer','P2','El encargado ve lo que está bajo mínimo y sugerencias basadas en ventas.',
  'Un producto activo está bajo mínimo y tuvo ventas en el período','Se abre la ayuda','Se explica existencia actual, mínimo y ventas, sin prometer una compra óptima')],
 requirements=[
 'Selector de mes, total bruto, descuentos, vendido neto, operaciones y ticket promedio de ventas completadas.',
 'Desglose importe aplicado por CASH, DEBIT, CREDIT, TRANSFER, OTHER y grupo tarjeta=DEBIT+CREDIT.',
 'Mostrar porcentaje por importe y participación por cantidad de ventas sin confundir mixtos; una venta mixta puede contar en varios métodos.',
 'Rankings por facturación neta, unidades y kg separados; nunca sumar 1 unidad con 1000 g.',
 'Atribuir descuentos a líneas mediante allocation persistida y agrupar por product_id conservando historial.',
 'Ventas diarias y comparación con mes anterior según períodos explícitos en modelo común.',
 'Stock bajo/agotado/negativo actual, excluyendo desconocidos e inactivos; rótulo actual aunque mes sea pasado.',
 'Ayuda determinista: destacar bajo mínimo y posición/venta del mes; no IA, demanda pronosticada ni rentabilidad sin costos.',
 'Mes vacío muestra ceros y ausencia de datos; comparación con base cero no genera porcentajes infinitos.',
 'Reportes recalculan anulaciones del mes original; mostrar criterio de exclusión y últimos cambios.'],
 edges=['Pagos mixtos, todos los pagos efectivos recibidos con vuelto.','Cambio de nombre/inactivación, un producto pesado vendido en gramos.','Febrero, mes abierto y cambios del histórico por anulaciones posteriores.'],
 outcomes=['Importes por método suman exactamente vendido neto en todos los fixtures.','Ranking por neto suma contribuciones que concilian con neto total.','Abrir mes con 100.000 ventas históricas demora <= 1 s; Caja mantiene metas.'],
 assumptions=['Ayuda de reposición sin lead time/costos/proveedores: no órdenes de compra automáticas.','Exportación Excel y cierre diario son posteriores; dashboard no sustituye arqueo.'],
 decision='Agregaciones SQL parametrizadas y DTO único MonthlyReport; consultas independientes dentro de una lectura coherente; gráficos sobrios y tabla accionable.',
 alternatives='Traer todas las ventas al browser bloquea y complica conciliación; ranking único de cantidades mezclaría gramos y artículos.',
 files=['src/worker/reports/month.ts','src/worker/reports/queries.ts','src/renderer/features/dashboard/DashboardPage.tsx','src/renderer/features/dashboard/PaymentBreakdown.tsx','src/renderer/features/dashboard/TopProducts.tsx','src/renderer/features/dashboard/LowStock.tsx'],
 model='No nuevas tablas de totales inicialmente; derivar de sales COMPLETED, items net_cents y payments amount_cents. Cache invalidada por venta/void; stock actual desde balances.',
 contract='reports.month(month:string): MonthlyReport según docs/contratos.md. Búsqueda sobre business_date/local_month, no fechas UTC truncadas.',
 tests=[('unit','month-boundaries','Mes actual compara mismos días del mes anterior; febrero trunca último día y base cero responde sin porcentaje.'),('integration','monthly-reconciliation','Fixture mixto y anulado: métodos y netos de productos concilian; KG y UNIT van separados.'),('e2e','monthly-dashboard','Cambiar mes, abrir vacío y revisar rótulo Stock actual; completar/anular una venta invalida el resumen.')]),
dict(slug='008-backup-installation',title='Backups, instalación y mantenimiento',module='backup',deps=['001-desktop-core','002-product-catalog','003-stock-ledger','006-sales-payments-history','007-monthly-dashboard'],
 summary='Entregar una aplicación instalable, proteger datos con respaldos validados y mantenerla sin exigir conocimientos técnicos al comercio.',
 stories=[
 ('Guardar un respaldo externo','P1','El encargado elige un pendrive y guarda una copia de los datos.',
  'La app tiene productos, ventas y stock y hay operaciones recientes','Se crea un backup','El archivo es consistente, verificable y la app muestra éxito sólo tras validar'),
 ('Recuperar la información','P1','Agus selecciona una copia y revisa su fecha antes de restaurar.',
  'Hay una copia compatible e íntegra','Se confirma restauración sin venta pendiente','Se guarda respaldo previo, se restaura y la app reinicia con datos consistentes'),
 ('Instalar y actualizar sin perder datos','P1','Agus instala la app y actualiza durante el mantenimiento.',
  'Hay datos en la PC y una actualización compatible','Se instala la nueva versión','El acceso directo funciona y la base conserva productos, stock, ventas y pagos')],
 requirements=[
 'Instalador Windows x64, recursos locales y acceso directo; cliente no ejecuta npm, Python ni terminal.',
 'Ruta de DB estable y separada; upgrade/desinstalación no elimina datos sin decisión explícita.',
 'Backup mediante API SQLite online del driver, no copiar sólo .db mientras WAL está abierto.',
 'Validar integrity_check y foreign_key_check; manifest con version, fecha UTC, schema y SHA-256 del snapshot.',
 'Destino externo elegido por diálogo nativo; escribir temporal, validar y renombrar. Error/pendrive ausente no muestra éxito.',
 'Copia local diaria al primer inicio del día y previo update/restore; conservar 14 copias exitosas diarias, no eliminar archivo elegido externo.',
 'Restore exige revisión, bloquea escrituras y no acepta carrito activo sin resolver; verifica schema y hash antes de tocar base actual.',
 'Cerrar workers/conexiones y resolver WAL/SHM antes de swap; guardar respaldo previo y rollback si reapertura falla.',
 'Incluir guía breve, prueba scanner, práctica de caja y procedimiento mensual de backup/actualización.',
 'No iniciar updates durante venta, no remoto oculto ni subida de DB del comercio a GitHub.'],
 edges=['Disco lleno, destino desconectado durante escritura y snapshot corrupto.','Restore versión futura y backup sin manifest.','Proceso se corta entre swap y reapertura: recuperación con archivo previo.'],
 outcomes=['Restauración reproduce exactamente productos, movimientos, pagos y ventas de la prueba.','Instalar/actualizar en Windows limpia sin Node/Python permite vender offline.','Todos los backups entregados pasan hash, integrity_check y foreign_key_check.'],
 assumptions=['Agus realiza instalación y mantenimiento mensual; no autoactualización remota inicial.','La copia local no protege de pérdida de PC: la guía incluye un destino externo.'],
 decision='Snapshot SQLite y manifest en paquete ZIP, validación y swap con conexiones cerradas. Electron builder NSIS; prueba temprana del binding nativo.',
 alternatives='Copiar .db vivo pierde datos en WAL; backup sólo en misma PC no protege fallo de disco. Firma de instalador depende certificado y se gestiona en release.',
 files=['src/main/backups/dialogs.ts','src/worker/backups/snapshot.ts','src/main/backups/restore.ts','src/renderer/features/settings/BackupPage.tsx','electron-builder.yml','docs/operacion/guia-caja.md','docs/operacion/mantenimiento.md'],
 model='backup_runs y settings de destino/retención. Manifest declara appVersion, schemaVersion, timestampUtc, dbSha256. El snapshot no guarda datos bajo Program Files.',
 contract='backups.create, inspectRestore y restore. previewToken ligado al hash del archivo; restore no recibe una ruta arbitraria del renderer.',
 tests=[('unit','backup-manifest','Rechazar hash alterado y schema superior; nombre de entrada ZIP no puede escapar del staging.'),('integration','backup-restore','Generar snapshot con WAL activo, restaurar y conciliar todas las tablas; simular fallo al reabrir y recuperar previo.'),('e2e','installed-app','Instalar, vender offline, actualizar y abrir histórico en máquina limpia; validar scanner físico y backup externo.')])
]

def write(path,body):
    path=ROOT/path;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(body.strip()+'\n',encoding='utf-8')

for feature in features:
    f=feature;folder=Path('specs')/f['slug'];num=f['slug'][:3]
    spec=[f"# Feature Specification: {f['title']}",f"**Feature Branch**: no creada; identificador `{f['slug']}` independiente de Git.",f"**Created**: {DATE}","**Status**: Draft - para revisión de Agus; no implementado.",f"**Input**: {f['summary']}","## User Scenarios & Testing"]
    for i,(head,priority,story,given,when,then) in enumerate(f['stories'],1):
        spec.extend([f"### User Story {i} - {head} (Priority: {priority})",story,f"**Why this priority**: {'Es necesario para operar y preservar datos.' if priority=='P1' else 'Mejora el control y la adopción sin bloquear la operación base.'}",f"**Independent Test**: sobre las dependencias entregadas, ejecutar el escenario siguiente y observar el resultado sin requerir el resto de historias de esta feature.","**Acceptance Scenarios**:",f"1. **Given** {given}, **When** {when}, **Then** {then}."])
    spec.extend(['### Edge Cases']+['- '+x for x in f['edges']]+['## Requirements','### Functional Requirements'])
    spec.extend([f"- **FR-{num}-{i:02}**: {x}" for i,x in enumerate(f['requirements'],1)])
    spec.extend(['### Key Entities',f['model'],'## Success Criteria','### Measurable Outcomes']+[f"- **SC-{num}-{i:02}**: {x}" for i,x in enumerate(f['outcomes'],1)]+['## Assumptions']+['- '+x for x in f['assumptions']])
    spec.extend(['## Dependencies']+[f"- [{d}](../{d}/spec.md)" for d in f['deps']])
    write(folder/'spec.md','\n\n'.join(spec))
    tests=[f"tests/{kind}/{name}.{'spec.ts' if kind=='e2e' else 'test.ts'}" for kind,name,scenario in f['tests']]
    plan=f"""# Implementation Plan: {f['title']}

**Branch**: sin crear | **Date**: {DATE} | **Spec**: [spec.md](spec.md)
**Input**: `{folder.as_posix()}/spec.md`
**Estado**: borrador de diseño, no se ejecutaron tareas de aplicación.

## Summary

{f['summary']}

{f['decision']}

## Technical Context

- **Language/Version**: TypeScript strict; Node.js 24 LTS como herramienta de desarrollo.
- **Primary Dependencies**: React, Vite, Electron, better-sqlite3, Zustand, TanStack Query y validación de DTOs. Versiones exactas se fijan en lockfile en 001 tras verificar compatibilidad nativa.
- **Storage**: SQLite local, SQL parametrizado y migraciones versionadas.
- **Testing**: Vitest para dominio/integración; Playwright para teclado/UI; Windows físico para scanner/instalación.
- **Target Platform**: Windows 11 x64, PC de referencia SSD/8 GB RAM.
- **Project Type**: aplicación de escritorio offline, un comercio y una caja.
- **Performance Goals**: [metas y dataset común](../../docs/arquitectura.md#persistencia-y-rendimiento).
- **Constraints**: [constitución](../../.specify/memory/constitution.md); sin operaciones fiscales ni procesamiento bancario.
- **Scale/Scope**: 2.000 productos inicialmente; prueba con 10.000 productos y 100.000 ventas.

## Constitution Check

- [x] Reglas de dinero entero, cantidades base y snapshots aplicadas.
- [x] UI local separada del acceso SQL; sin servidor HTTP ni acceso SQL desde renderer.
- [x] Operaciones durables/idempotentes planificadas y errores observables.
- [x] Validación automática y física definida, sin afirmar pruebas no ejecutadas.
- [x] Diseño no incluye ampliaciones fuera del alcance declarado.
Revisión previa y posterior al diseño: cumple sin excepciones propuestas.

## Project Structure

### Documentation (this feature)

spec.md, plan.md, research.md, data-model.md, contracts/interface.md,
quickstart.md, tasks.md y checklists/requirements.md.

### Source Code (repository root)

{chr(10).join('- `'+p+'`' for p in f['files'])}

### Verification files

{chr(10).join('- `'+p+'`' for p in tests)}

## Phase 0: Research

[Decisiones y alternativas](research.md); [arquitectura común](../../docs/arquitectura.md),
[scanner/peso](../../docs/scanner-y-peso.md). Las hipótesis de hardware se mantienen
como condiciones de verificación de entrega, no se inventa compatibilidad.

## Phase 1: Data, Contracts and Validation

[Datos](data-model.md), [contrato](contracts/interface.md), [validación](quickstart.md).
El diseño global en docs/modelo-datos.md y docs/contratos.md evita duplicar reglas
de stock y dinero. Confirmar una venta y sus movimientos es una sola transacción.

## Delivery Order

Dependencias: {', '.join(f['deps']) or 'ninguna'}.
Ejecutar las tareas de tests, implementación y validación por historia; revisar el
resultado antes del siguiente módulo. No ejecutar código de aplicación durante
la revisión de este plan. Commits locales pequeños por comportamiento probado.
"""
    write(folder/'plan.md',plan)
    write(folder/'research.md',f"""# Research: {f['title']}

**Date**: {DATE}

## Decision

{f['decision']}

## Rationale

{f['summary']} El flujo es local y comparte reglas de dinero e inventario con el
resto del proyecto, evitando dos fuentes distintas de cálculo.

## Alternatives considered

{f['alternatives']}

## Evidence and practical limits

[Arquitectura y documentación primaria](../../docs/arquitectura.md#fuentes-verificadas).
[Scanner y balanza](../../docs/scanner-y-peso.md#fuentes-primarias).
No hay benchmarks medidos, app implementada ni scanner físico probado todavía.
La fuente de verdad de negocio son los requisitos de esta spec y el modelo común.
""")
    write(folder/'data-model.md',f"""# Data Model: {f['title']}

{f['model']}

## Common invariants

[Modelo de datos completo](../../docs/modelo-datos.md). Precio y pagos en centavos
enteros, peso en gramos, código como texto. Foreign keys activas. Ninguna operación
del renderer puede eludir las reglas de servicio/validación. No cambiar la unidad
de un producto ya utilizado. ID UUID interno y número correlativo visible para ventas.

## State transitions

Producto: active/inactive. Inventario: desconocido -> conteo real -> balance con
movimientos. Carrito: borrador -> confirmación pendiente -> venta COMPLETED o error
recuperable. Venta: COMPLETED -> VOIDED con motivo; no borrado ni segunda reposición.
Backup: staging -> validado -> archivo final; restore bloquea escrituras y permite rollback.
Aplicar sólo las transiciones que corresponden a esta feature.
""")
    write(folder/'contracts/interface.md',f"""# Interface Contract: {f['title']}

{f['contract']}

## Payloads and errors

[DTOs y catálogo común](../../../docs/contratos.md). Todas las funciones de negocio
retornan Promise de Result discriminado. El worker valida enteros seguros, IDs,
enumeraciones y campos obligatorios antes de escribir. No retornar excepción sin
normalizar a la interfaz; conservar código técnico en log local.

Mutaciones con operationKey/checkoutKey y expectedRevision cuando corresponde.
Errores de catálogo, revisión o stock no se reintentan automáticamente con datos
distintos. Disk full o worker caído no se presentan como éxito. Los diálogos de
archivo son responsabilidad del main, nunca una ruta arbitraria de la UI.
""")
    steps=[]
    for path,(kind,name,scenario) in zip(tests,f['tests']):
        command=f'npx playwright test {path}' if kind=='e2e' else f'npx vitest run {path}'
        steps.extend([f'### {scenario}',f'```powershell\n{command}\n```',f'Resultado esperado: el escenario termina con las invariantes y el resultado definidos, sin datos parciales. Test file: `{path}`.'])
    write(folder/'quickstart.md',f"""# Quickstart Validation: {f['title']}

**Estado**: estos comandos son de la futura implementación. Hoy no existe
package.json ni los tests; no se reportan como ejecutados.

## Prerequisites

001 implementada, Node 24 LTS, npm install según lockfile y dependencias de esta
feature entregadas. Usar DB temporal de pruebas, nunca la DB real del comercio.
Para desktop/scanner: instalador buildado y Windows 11 con scanner configurado.

## Commands and expected behavior

{chr(10).join(steps)}

## Manual acceptance

{chr(10).join(f'{i}. {s[0]}: {s[5]}.' for i,s in enumerate(f['stories'],1))}

Cuando corresponda usar hardware físico; teclado simulado verifica la lógica de
captura pero no compatibilidad del lector, cable, layout ni balanza.
""")
    task_lines=[f"# Tasks: {f['title']}",f"**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)","**Estado**: pendientes; tareas de aplicación no ejecutadas.","## Global Constraints",'Leer constitución, modelo y contratos comunes antes de modificar fuentes. No cambiar reglas de importes o stock sólo en UI. Dependencias: '+(', '.join(f['deps']) or 'ninguna')+'.',"## Foundation"]
    task_lines.append(f"- [ ] T{num}01 Preparar los archivos de esta feature definidos en plan.md, el contrato IPC validado y fixtures de datos; verificar integración con las dependencias.")
    for i,((head,priority,story,given,when,then),(kind,name,scenario),test_path) in enumerate(zip(f['stories'],f['tests'],tests),1):
        task_lines.extend([f"## User Story {i}: {head}",f"- [ ] T{num}{i*3+1:02} [US{i}] Crear test `{test_path}` para: {scenario} Ejecutarlo antes de implementar y confirmar fallo por comportamiento faltante.",f"- [ ] T{num}{i*3+2:02} [US{i}] Implementar el comportamiento en los archivos de plan.md; contrato: {f['contract']}",f"- [ ] T{num}{i*3+3:02} [US{i}] Ejecutar comando de quickstart.md, comprobar escenario Given/When/Then de US{i}, y crear commit local por comportamiento probado."])
    task_lines.extend(['## Integration and acceptance',f"- [ ] T{num}20 Verificar todos los FR-{num}, casos límite y metas SC-{num} de spec.md con DB temporal y fixtures; registrar números medidos, no supuestos.",f"- [ ] T{num}21 Revisar contrato, migración y reintentos con las features dependientes; documentar el resultado y defectos pendientes en el registro de entrega.","## Dependencies and sequencing",'Foundation -> US1 -> US2 -> US3 -> integración. Tests pueden redactarse de forma independiente; schema/contratos y mutaciones requieren ejecución ordenada. No hay delegación automática prevista.','## Acceptance evidence','Registrar versión, comando, resultado, fixture/PC y limitaciones. Completar un checkbox sólo con evidencia de esa tarea.'])
    write(folder/'tasks.md','\n\n'.join(task_lines))
    write(folder/'checklists/requirements.md',f"""# Specification Quality Checklist: {f['title']}

**Purpose**: revisión de completitud del diseño, no resultados de tests.
**Created**: {DATE} | **Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Historias y requisitos describen valor y comportamiento observable.
- [x] Implementación separada en plan y contratos.
- [x] Secciones obligatorias y dependencias completas.

## Requirement Completeness

- [x] Reglas monetarias, unidad y estados referencian una definición común.
- [x] Requisitos identificados y verificables; casos límite definidos.
- [x] Metas medibles y condiciones de benchmark explícitas.
- [x] Supuestos documentados; sin preguntas pendientes al usuario.

## Feature Readiness

- [x] Cada historia tiene escenario de aceptación y guía de validación.
- [x] Hay archivos y tareas pendientes para las entregas.
- [ ] Revisión de Agus.
- [ ] Validación de aplicación y hardware cuando se implemente.
""")

write(Path('.specify/feature.json'),json.dumps({'feature_directory':'specs/001-desktop-core'},indent=2))
print(f'Generated {len(features)} features, each with spec, plan, research, data-model, contract, quickstart, tasks and checklist.')
