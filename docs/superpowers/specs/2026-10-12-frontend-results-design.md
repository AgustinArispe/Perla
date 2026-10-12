# Revisión del frontend de Perla — 12 de octubre de 2026

Estado: propuesta de diseño; no implementada. Alcance: las 19 capturas entregadas por Agus y contraste con el código actual. Continúa el trabajo de octubre; no propone rehacer lo ya resuelto.

## Diagnóstico

Perla ya tiene una identidad reconocible: azul petróleo, latón, fondo cálido, Manrope y navegación por secciones. El problema principal está en la composición: controles dispersos, filas que separan demasiado sus datos y acciones, demasiados contenedores equivalentes y poca interpretación de los números. La mejora debe permitir decidir y operar más rápido.

Tres composiciones bastan: **análisis** (Resultados/Inicio), **listado** (catálogo, históricos y cuentas) y **operación** (Caja/recibir compra). Compartir patrones no significa convertir todas las pantallas en el mismo tablero.

## Evidencia y límites

- Inspección visual: capturas 1–19. Las capturas 9 y 19 repiten Reponer.
- Inspección de código: dashboard, consultas y contratos de reportes, componentes compartidos, estilos y pantallas operativas.
- Revisión independiente de diseño y revisión independiente técnica, sintetizadas después de sus respectivos análisis.
- Detector de Impeccable sobre `src/renderer/features/dashboard`: salida `[]`, exit 0. No demuestra exactitud de cifras, accesibilidad ni calidad visual.
- No se hizo verificación nueva en navegador ni se ejecutaron pruebas funcionales en esta revisión documental. El tamaño real de fuentes y contraste deben medirse en la implementación.
- Modales, administración, ayuda, cuentas detalladas, errores, carga y todas las variantes por rol requieren inspección visual adicional. No se dan por auditados por aparecer sus archivos.
- No hacen falta preguntas para preparar esta propuesta: prioridades, identidad y alcance se desprenden del pedido y del producto existente.

## Resultados: primera entrega

Debe responder: cuánto vendimos, cómo viene el período, qué productos explican el resultado y cómo se distribuyen los pagos de esas ventas.

Composición propuesta para escritorio:

```text
Resultados                           Período · Comparar · Exportar
Vendido neto       Ventas       Ticket promedio       Margen conocido
Ventas por día: gráfico amplio, ejes, comparación opcional y detalle
Productos: dona + ranking de barras          Medios de pago: barras
Detalle del margen / desglose / acceso al histórico
```

### Indicadores y período

- Usar Resultados como título, consistente con el menú. El mes es contexto, no otro nombre de pantalla.
- Mantener cuatro indicadores, con cifras legibles y altura menor. Variación con signo y texto, sin depender solamente del color.
- Conservar «margen conocido», cobertura de costos y aclaración de que no es ganancia neta.
- Unificar la ubicación del selector mensual y la exploración de períodos. Mostrar expresamente qué intervalo anterior se compara: mes anterior comparable o tramo anterior de igual duración.
- Diferenciar fecha de generación de informe de última actividad. Revisar qué eventos actualizan `lastChangedAt`, especialmente devoluciones.

### Ventas diarias

- Barras con ancho y separación consistentes; 3–5 marcas de escala, guías suaves y valores abreviados en miles/millones. Valor exacto en detalle.
- Eje cero real: los netos negativos bajan. El código actual representa la magnitud absoluta hacia arriba, aunque agrega signo y una nota.
- Tooltip disponible con mouse, teclado y toque: fecha, neto y cantidad de ventas. Tabla alternativa y selección accesible se conservan.
- Diferenciar visualmente mejor día y día seleccionado. Seleccionar un día permite ir al histórico correspondiente sin perder el período de regreso.
- Mostrar solamente días transcurridos en el mes actual. Cero no significa local cerrado; esa distinción requiere calendario configurado.
- Comparación opcional con serie anterior, alineada por día ordinal y rotulada. No inventar ceros para el día 31 de un mes que tiene 30. Hoy el contrato solo contiene la serie actual: ampliar antes de ofrecer esta función.
- No superponer importes y cantidad de operaciones con dos escalas difíciles de interpretar.

### Dona y productos más vendidos

- Agregar la dona pedida: Top 5 + Otros, con leyenda de nombre, importe y porcentaje; junto a un ranking de barras horizontales para comparar productos de valores similares.
- No normalizar únicamente el Top 5 a 100% aparentando representar todo el negocio. En las capturas estos cinco productos suman cerca de un millón frente a 14,4 millones vendidos; Otros ocupará una proporción grande y debe mantenerse así.
- El backend ya devuelve el ranking completo; el recorte a cinco ocurre en `TopProducts.tsx`.
- Default: participación por importe. Mantener rankings por unidades y kilos como universos independientes. No sumar kilos y unidades.
- Categorías es una mejora posterior útil si Otros domina. Requiere agregado completo: el desglose de rentabilidad por categoría tiene límites y no sirve automáticamente como universo completo.
- Si hay valores negativos, la dona no puede representar correctamente ese universo. Mostrar barras con signo y explicación en ese caso; nunca aplicar valor absoluto ni ocultar devoluciones para dibujar sectores.
- Empates con orden estable; cero total produce un estado vacío útil, sin porcentajes ficticios.

### Corrección de datos previa a los gráficos

`src/worker/reports/queries.ts` aplica dos criterios temporales: totales y serie diaria descuentan devoluciones por fecha de devolución; ranking y rentabilidad descuentan todas las devoluciones contra las ventas originales del período. Ejemplo: venta de septiembre devuelta en octubre puede seguir sumando en el total de septiembre y desaparecer de su ranking.

Dirección propuesta: usar movimientos del período para la vista denominada resultado mensual, incluyendo devoluciones del período vinculadas a ventas anteriores. Alinear ranking, margen y cobertura con ese alcance, conservando identificación y costo histórico de las líneas. Revisar el efecto sobre informes y exportaciones antes de cambiar consultas. Los reportes guardados/versionados no se reescriben silenciosamente.

La dona solo se habilita cuando su universo y denominador están conciliados y sus importes son no negativos. Mientras tanto, no presentar participación del neto mensual utilizando un ranking de otra definición.

### Medios de pago

- Preferir barras horizontales con importe y texto porcentual; cuatro medios se comparan mejor así y no hace falta otra dona.
- Corregir `PaymentBreakdown.tsx`: filtra positivos y ceros, dejando fuera los negativos. Cero neto tampoco implica ausencia de movimientos.
- Nombrar el alcance: pagos asociados a ventas y sus reembolsos. Las ventas a cuenta pueden estar en el total vendido sin estar en pagos; cobros posteriores de deuda no están incluidos en esta consulta.
- No forzar porcentajes a 100% del neto vendido ni fabricar un residual. Si se agrega «A cuenta», calcularlo desde datos explícitos, considerando devoluciones, y conciliarlo.
- Para composición positiva, indicar el denominador de pagos; con negativos, usar barras divergentes y montos, sin porcentajes circulares engañosos.

## Revisión de todos los paneles

| Panel / captura | Mejora propuesta | Prioridad |
|---|---|---|
| Ingreso / 1 | Conservar composición; revisar foco aparentemente doble, mostrar contraseña, errores y estado de envío. Identificar comercio. | Baja |
| Inicio / 2 | Contextualizar cero ventas y última actividad; priorizar alertas por vencimiento/impacto verificable; evitar que miles de pendientes parezcan igualmente urgentes. | Media |
| Resultados / 3–4 | Aplicar diseño y conciliación descritos arriba. | Máxima |
| Caja / 5 | Escaneo como entrada principal; prueba de lector secundaria; feedback inmediato; total estable. Preservar espacio para carrito, sin rellenarlo con gráficos. | Alta |
| Ventas / 6 | Tabla compacta, período rápido, fecha/hora, estado y total alineados; resumen del filtro y exportación coherente. | Media |
| Productos / 7 | Nuevo producto principal; agrupar mantenimiento/importación/etiquetas; búsqueda dominante y toolbar compacta. Selección persistente al buscar y paginar. | Alta |
| Stock / 8 | Acciones claras: ingreso, conteo, movimientos y lotes; distinguir cero, bajo mínimo y sin control. | Alta |
| Reponer / 9, 19 | Unificar ubicación/cobertura/búsqueda; aviso accionable para calendario; selección y cantidades visibles; siguiente paso hacia pedido cuando exista el flujo. Fórmula bajo demanda. | Alta |
| Recibir compra / 10 | Patrón de operación similar a Caja; proveedor sin etiquetas duplicadas; alta rápida integrada; resumen más compacto y tipografía numérica consistente. | Alta |
| Proveedores / 11 | Tabla alineada; cuenta como acción relevante; saldo con sentido explícito; vencido/contacto solo si están disponibles. | Media |
| Ubicaciones / 12 | Selector compacto; quitar superposición visual del pie y último registro; paginación fuera del área desplazable; traslado contextual. | Alta |
| Traslados / 13 | Filtro Por recibir visible; origen/destino, cantidad, fecha y acciones cercanos; reducir scroll anidado. No presentar conteo de página como total global. | Alta |
| Clientes / 14 | Patrón común de listado; indicar Debe/A favor/Al día según contrato; reducir repetición de datos ausentes; cuenta como acción principal. | Media |
| Cobros y pagos / 15 | Un solo selector Cobrar/Pagar/Todos; filtros juntos, totales del filtro y obligaciones ordenadas por vencimiento. Mantener separación entre monto de página y total filtrado. | Alta |
| Promociones / 16 | Eliminar contadores duplicados; regla, vigencia y alcance legibles; reemplazar «1 objetivo» por descripción concreta. | Media |
| Turnos / 17 | Priorizar caja, operador, estado y diferencia; cifras auxiliares en detalle o modo ampliado; destacar desvíos. | Media |
| Historial de compras / 18 | Reemplazar tarjetas repetidas por tabla/lista común compacta; fecha/proveedor/estado/total y acceso a detalle claros. | Media |
| Sidebar / 18–19 | Mantener secciones colapsables; evitar Administración > Administración si la opción corresponde a Configuración. Preservar preferencias y modo de iconos por sección. | Media |

## Bases compartidas

1. Cabecera consistente: título, contexto útil, acción principal; pestañas en la misma posición debajo.
2. Toolbar adaptable: búsqueda, filtros, vistas y exportación; evitar segunda fila solo para Exportar en escritorio ancho. Filtros secundarios bajo demanda con chips activos.
3. Selección directamente en las filas exportables. Contador, revisar selección, limpiar y exportar; persistencia entre búsquedas/páginas dentro del mismo conjunto. Cambiar de contexto incompatible debe explicitar el alcance.
4. Tablas con encabezados y números alineados, cifras tabulares, alturas coherentes y acciones próximas. Evitar microtexto para ganar densidad. Objetivo inicial: texto de datos alrededor de 14–16 px y controles táctiles de al menos 44 px; validar a zoom 100%.
5. Estados semánticos con texto; latón para acción/selección y acentos puntuales, no para cada cifra. Paleta de gráficos acotada y distinguible; Otros neutro.
6. Mantener Manrope, marca y fondo actuales. No agregar fuentes ni efectos ornamentales. Transiciones cortas, movimiento reducido y lectura inmediata sin esperar contadores animados.
7. Vacíos, carga, error, datos parciales y permisos son estados de diseño. No insertar métricas que el backend no sostiene.
8. Limpiar reglas sustituidas: la cascada actual es tokens → pulse → perla → operational → typography → home. Evitar una nueva capa de overrides para cada pantalla.

## Criterios de aceptación

- Resultados concilia con movimientos del período, tabla alternativa y exportaciones; devoluciones entre meses, netos negativos y cuenta corriente tienen casos explícitos.
- Se entiende período, comparación y alcance de una participación sin descargar archivos.
- Gráficos operables con teclado y sin depender de hover/color; contraste medido y foco visible.
- Tablas y listas no cortan la última fila ni ocultan acciones bajo paginación; no hay overflow horizontal global.
- Seleccionar, buscar otra cosa, seleccionar y exportar genera exactamente el conjunto elegido, sin duplicados ni pérdida al paginar.
- Verificación en 1920×1080, 1366×768, 1024, 768 y 390 px; zoom 200%, sidebar expandido/colapsado y roles relevantes.
- Casos: vacío, una fila, miles de filas, nombres largos, montos altos, fechas parciales, errores, carga, módulos desactivados y ausencia de costos/calendario.

## Fuera del alcance de esta entrega documental

No se modifica frontend, cálculos, base de datos ni infraestructura. No se estima paridad con Ábaco ni se agregan módulos fiscales. La implementación se organiza en el plan asociado y requiere validar cada etapa antes de extender patrones a todo el sistema.
