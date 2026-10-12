# Containdt: comparación con Perla

Fecha de revisión: 12 de octubre de 2026. Fuente: [sitio comercial de Containdt](https://containdt.com.ar/#capacidades). Alcance: propuesta publicada; no se creó una cuenta, no se probó el sistema ni se verificaron sus integraciones o adopción comercial.

## Evaluación

Containdt es un competidor directo potencial. Su propuesta combina gestión comercial y administración fiscal para negocios argentinos. La amplitud anunciada supera el alcance actual de Perla en facturación fiscal, integración con tiendas online y acceso del contador. Esto acredita una oferta comercial, no superioridad funcional comprobada.

Publicitan ARCA, Tiendanube y Mercado Libre disponibles; MercadoPago en desarrollo. Ofrecen inventario, servicios, presupuestos, cuentas, turnos, empleados, bancos, varias empresas y reportes. El contador tiene acceso de lectura gratuito. Publican planes de USD 25 y USD 50 al mes, pagaderos en pesos, y prueba de 14 días; emisión ARCA desde la aplicación en el plan PyME. También ofrecen servicio con contador a precio consultado. [Capacidades](https://containdt.com.ar/#capacidades), [planes](https://containdt.com.ar/#precios).

## Comparación con el producto actual

| Área | Situación de Perla | Implicación |
|---|---|---|
| Ventas, compras, stock y cuentas | Implementación operativa, con pruebas de circuitos | Base para competir, pendiente de validar adopción en comercios |
| Facturación fiscal | Comprobantes internos; sin integración de CAE/ARCA | Brecha importante cuando el cliente exige facturar desde caja |
| Tienda online | Sin conectores identificados | Limita la oferta para negocios que combinan local y comercio electrónico |
| Multiempresa | Una instancia de negocio con ubicaciones de mercadería | Una ubicación no equivale a una empresa con identidad fiscal propia |
| Rentabilidad | Margen bruto conocido y cobertura de costos | No presentarlo como utilidad final ni contabilidad completa |
| Mostrador y mercadería | Lector, kilos, pagos mixtos, lotes, vencimientos, traslados y diferencias | Posible especialización comercial; no se verificó si el competidor ofrece igual profundidad |

La referencia de alcance interno es [Producto y alcance](documentacion/01-producto-y-alcance.md), complementada por la [implementación de Resultados del 12 de octubre](ui-ux-frontend-results-2026-10-12.md).

## Lectura comercial

La combinación de software y contador podría favorecer recomendaciones desde estudios contables. Es una inferencia estratégica: no se comprobó que tengan acuerdos activos ni un canal consolidado. La ayuda para cargar datos reduce una dificultad frecuente al adoptar un sistema.

Perla necesita una razón concreta de elección. La hipótesis inicial es especializar su experiencia en comercios físicos con venta por peso y mercadería perecedera, aprovechando el caso de Perla Negra. Conviene validar esa hipótesis con usuarios antes de extenderla a otros rubros.

## Prioridades propuestas

1. Definir el primer segmento comercial y su circuito crítico.
2. Evaluar ARCA como siguiente integración importante para comercios que necesitan facturación fiscal desde la venta.
3. Medir tiempos y errores reales en venta, recepción y cierre de caja.
4. Preparar demo, migración desde Excel, puesta en marcha y soporte con alcance explícito.
5. Evaluar multiempresa, gastos y reportes administrativos según demanda comprobada.

Estas prioridades orientan decisiones; no constituyen compromiso de implementación ni alteran el roadmap por sí solas.

## Próxima comparación funcional

Probar un circuito completo en ambos productos: alta e importación, venta por unidad y peso, pago mixto, cuenta corriente y pago parcial, devolución de una venta de otro período, compra con cambio de costo, movimiento de stock y cierre con diferencia. Comparar velocidad, permisos, consistencia de cifras, recuperación de errores y soporte. No contactar al competidor ni registrarse automáticamente como parte de esta revisión.
