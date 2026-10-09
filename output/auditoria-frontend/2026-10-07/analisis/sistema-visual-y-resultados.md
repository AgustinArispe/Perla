# Sistema visual y resultados — síntesis contrastada

Fecha: 7 de octubre de 2026. Análisis para planificación; no implementación.

El subagente visual envió hallazgos parciales antes de alcanzar su límite de uso. El coordinador completó esta síntesis con capturas y lectura de `DashboardPage`, `PeriodComparison`, `LowStock`, `PaymentBreakdown`, `ExportButton` y las referencias PULSE. Las mediciones de contraste y la interacción quedan para la ejecución.

## Qué cambió respecto de la primera propuesta

- El valor de ventas netas ya no se repite en Ritmo del negocio cuando está seleccionado Mes. `PeriodComparison` lo condiciona explícitamente. Persiste un contenedor alto con poco contenido.
- El panel de margen ya omite venta cubierta cuando hay cobertura de costos del 100%. Debe conservarla cuando la cobertura sea parcial; no es una repetición inútil en ese caso.
- Reposición ya limita la tabla a ocho filas; no se renderizan 852 artículos en el panel. El problema es su protagonismo, el detalle por fila y la prioridad de la muestra, no la ausencia de límite.
- Configuración ya usa pestañas. Evitar repetir una corrección basada en la captura antigua con zoom reducido.

## Hallazgos actuales

| Antes, observado | Después, propuesto | Evidencia / motivo |
|---|---|---|
| Mensual distribuye cifras y acciones de informe a través de muchas secciones. | Una cabecera del período, cuatro métricas como máximo, evolución diaria, pagos y cinco productos. Detalles de margen y operación a demanda. | `pantallas/17-resumen-mensual.jpg`, referencias 6–10. Se debe poder entender ventas y tendencia sin recorrer la reposición completa. |
| Ritmo del negocio conserva caja propia casi vacía para Mes. | Comparación al lado de Ventas netas; «Explorar períodos» para Hoy/Semana/Rango, claramente separado del mes elegido. | `PeriodComparison.tsx` y captura 17. Menos contenedores para la misma pregunta. |
| Exportar Excel aparece repetido en siete secciones, más PDF en cabecera. | Exportar en cabecera, con formato y alcance explícitos; herramientas locales de sección discretas y rotuladas. | `17-resumen-mensual.jpg`, DOM. Listados comunes conservan Excel visible en su barra. |
| Exportación de comparación recibe `preset` sin el mes histórico; la pantalla puede usar `monthlyReport`. | Pantalla y exportación derivan el mismo intervalo y alcance explícitos. | `PeriodComparison.tsx`. Riesgo concreto de divergencia; no afirmar Excel incorrecto sin descargar y contrastar un mes anterior. Resolver antes de agrupar botones. |
| Medios de pago dedica mucha altura a cuatro filas y dos porcentajes por medio. | Medio, importe y porcentaje del importe; cantidad de operaciones y su porcentaje en detalle. | `PaymentBreakdown.tsx`. En pago combinado, no sumar porcentajes de operaciones como si fueran excluyentes. |
| Gráfico ocupa un panel amplio pero las barras se concentran en una parte. | Dominio temporal visible y ancho bien aprovechado; días transcurridos o mes completo con futuros explícitos. | Captura 17 y referencias. La captura no prueba ausencia de ventas: distinguir cero, futuro y dato faltante según contrato. |
| Reposición presenta productos, mínimo, venta mensual, estado y puesto de facturación. | En Resultados, breve acceso a «Inventario actual» separado del mes; listas de acción viven en Stock. Inicio presenta prioridades justificadas. | `LowStock.tsx`. No mezclar existencias actuales con datos históricos del mes sin explicarlo. |
| Inventario por ubicación compite con las ventas y repite facturación del salón. | Resumen operativo en Ubicaciones; acceso secundario desde Resultados. Depósitos muestran existencias, entradas/salidas y tránsito. | `17-resumen-mensual.jpg`, referencias 9–10. No tratar cada depósito como empresa. |
| Cifra Tarjeta reaparece al final después de medios de pago; anulaciones quedan en franja separada. | Quitar repetición de tarjeta; anulaciones/descuentos dentro del desglose de ventas con texto breve y definición. | Captura 17. Conservar datos y fórmulas. |
| Latón/marrón identifica tanto confirmación como utilidades y estados. | Primario navy consistente, oro como firma, semánticos para significado. Secundarios neutrales y pestañas inequívocas. | Agenda, Excel, switches de funciones y caja. No usar color como única señal. |
| Totales de compra pueden usar una tipografía distinta. | Manrope y números tabulares en todas las cantidades; Cinzel solo en marca. | Referencia de Compras y DESIGN.md. La marca no debe degradar lectura monetaria. |

## Jerarquía mensual propuesta

1. **Período y alcance.** Mes, fechas efectivas, Exportar. Una sola autoridad para los filtros del informe.
2. **Resultado.** Ventas netas y cambio respecto del período comparable; ventas completadas; ticket promedio; margen bruto conocido si está habilitado. En móvil, dos columnas cuando caben los importes, una si no.
3. **Evolución.** Gráfico diario con valores accesibles, selección por teclado y tabla desplegable. No exigir hover para conocer importes.
4. **Composición.** Medios de pago y cinco productos destacados; cambiar criterio no debe comparar kilos con unidades como una misma magnitud.
5. **Profundizar.** Desglose de ventas y rentabilidad; cobertura parcial visible antes de abrir detalle. Inventario actual enlazado con su fecha, fuera del alcance histórico.

Semanal guardado comparte jerarquía, pero conserva fecha de generación, versión y estado de informe guardado. Recalcular es una acción de gestión secundaria; nunca actualizar silenciosamente el informe histórico.

## Principios visuales verificables

- Blanco útil: formularios cortos pueden dejar espacio libre; no agregar métricas o ilustraciones de relleno. Mantener juntas las partes de una misma decisión.
- Tabla útil: no reducir automáticamente a tres filas ni convertir miles de productos en tarjetas. Usar filas comparables, altura cómoda y detalle progresivo.
- Ancho útil: panel exterior ocupa la grilla; el formulario interior puede medir 560–680 px. Las cifras usan ancho suficiente; no forzar el mismo número de columnas en todos los dispositivos.
- Color: proporción de superficies claras dominante, navegación naval estable y acentos escasos. El verde sigue siendo válido para estado correcto; no hacer todos los estados dorados.
- Animación: respuesta de pulsación, aparición de ventanas y cambio de período; movimiento reducido; ninguna espera añadida al proceso de caja.
- Texto: eliminar redundancias, conservar etiquetas, unidades y explicaciones de consecuencias. Los números grandes sin período o denominador no se vuelven más claros por tener menos texto.

La paleta y los tamaños finales se validarán como pares reales de fondo/texto y con nombres/importes largos. Las capturas fullPage se reescalan al abrirlas: una miniatura estrecha no acredita un fallo de tamaño de fuente o de viewport.
