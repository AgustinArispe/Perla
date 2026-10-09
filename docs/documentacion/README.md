# Perla Negra POS — documentación integral

**Documento funcional, técnico y operativo del programa**  
**Autor del producto:** Luis Agustín Arispe · **Corte documental:** 9 de octubre de 2026  
**Código analizado:** repositorio local `GestionProductos` · **Paquete:** `perla-negra-pos` 0.1.0 · **Esquema SQLite:** 29

Esta documentación explica qué es el sistema, qué puede hacer un comercio con él, cómo se relacionan sus módulos y cómo está implementado. Incluye tanto la operación diaria como los aspectos necesarios para desarrollar, desplegar, respaldar y mantener el producto. Está basada en el código disponible en este repositorio en la fecha indicada, incluidos cambios locales todavía no integrados en un commit.

No es una promesa de funcionalidades futuras ni una certificación de seguridad. Cuando una capacidad depende de configuración, permisos, plataforma o equipamiento, se indica expresamente. Los informes de pruebas anteriores se presentan como antecedentes; escribir esta documentación no equivale a ejecutar nuevamente toda la suite.

## Lectura completa

- [Documento completo en un solo archivo](DOCUMENTACION-COMPLETA.md).
- [Versión HTML navegable, con búsqueda del navegador e impresión](DOCUMENTACION-COMPLETA.html).
- [Nombre Perla, significado del logo, paleta y tipografía](01-producto-y-alcance.md#9-perla-nombre-identidad-y-significado-de-marca): narrativa del producto, archivos de diseño y origen del lettering.

## Índice por capítulos

| Capítulo | Contenido | Para quién |
|---|---|---|
| [01. Producto y alcance](01-producto-y-alcance.md) | Identidad, problema que resuelve, conceptos, plataformas y límites | Dueño, analista, comercial, desarrollador |
| [02. Manual funcional completo](02-manual-funcional.md) | Todos los módulos, circuitos diarios, acciones y decisiones | Dueño, supervisor, operador |
| [03. Reglas de negocio y consistencia](03-reglas-de-negocio.md) | Dinero, peso, stock, ventas, costos, promociones, cuentas y concurrencia | Analista, desarrollador, QA |
| [04. Arquitectura e implementación](04-arquitectura.md) | Capas, procesos, archivos, transporte web y Electron | Desarrollador, mantenimiento |
| [05. Persistencia y modelo de datos](05-persistencia.md) | Familias de tablas, relaciones, migraciones, historial y unidades | Desarrollador, datos, soporte |
| [06. Frontend, UX, escáner e impresión](06-frontend-y-dispositivos.md) | Componentes, estado, diseño, teclado, recuperación y periféricos | Frontend, UX, QA, soporte |
| [07. API, permisos y seguridad](07-api-y-seguridad.md) | Contratos, autenticación, autorización, validaciones y límites | Backend, integraciones, seguridad |
| [08. Instalación, despliegue y mantenimiento](08-operacion-y-despliegue.md) | Entornos, configuración, comandos, backups, restauración y diagnóstico | Operaciones, responsable técnico |
| [09. Reportes, Excel y lectura de métricas](09-reportes-y-exportaciones.md) | Fórmulas, períodos, filtros, versiones, interpretación y cautelas | Dueño, analista, QA |
| [10. Pruebas, limitaciones y evolución](10-calidad-y-evolucion.md) | Estrategia QA, circuitos completos, deuda y recomendaciones | QA, desarrollador, responsable del producto |
| [11. Glosario y guía de mantenimiento del código](11-glosario-y-mantenimiento.md) | Términos, ejemplos, cómo cambiar una funcionalidad y mantener esta documentación | Todo el equipo |

## Referencias exhaustivas generadas desde el código

| Referencia | Alcance comprobado durante la generación |
|---|---|
| [Diccionario completo de la base de datos](referencia-base-datos.md) | 86 tablas, sus columnas, relaciones, índices y SQL efectivo; 29 migraciones |
| [Rutas, permisos y contratos](referencia-api-permisos.md) | 125 rutas HTTP, 115 operaciones de la matriz base, 24 datasets XLSX y exportaciones de contratos compartidos |
| [Inventario de implementación y pruebas](referencia-inventario.md) | 214 archivos TS/TSX/CSS/SQL/HTML de implementación, 93 archivos de pruebas, scripts y dependencias |

Estas cantidades describen el corte documental. Las operaciones internas, subacciones de Control y permisos adicionales del servicio no se reducen al conteo de la matriz base. Los 93 archivos de pruebas tampoco equivalen a 93 casos: muchos archivos contienen varios casos o parametrizaciones.

## Cómo recorrerla

**Para aprender a usar el producto:** empezar por 01 y 02, seguir con 09 para interpretar resultados y consultar 06 para el lector y las impresoras.

**Para continuar el desarrollo:** leer 03, 04, 05 y 07; usar las referencias para localizar contratos y tablas; cerrar con 10 y 11.

**Para instalar o recuperar una instancia:** leer 08 completo antes de operar sobre la base. No mezclar una base real con scripts de simulación o entornos de prueba.

**Para evaluar el alcance comercial:** leer 01 y los límites de 10. El programa registra y controla operaciones; los comprobantes impresos no constituyen una integración de facturación fiscal.

## Criterio de fuentes y vigencia

La fuente principal es `src/`, junto con configuraciones de raíz, scripts y pruebas. Los documentos anteriores de `docs/` aportan decisiones, escenarios e informes históricos. Ante una diferencia, esta documentación señala el comportamiento observado en el código actual; para una implementación posterior vuelve a prevalecer el código y sus pruebas.

El producto tuvo nombres anteriores, entre ellos El Bocha y El Perla. Por compatibilidad todavía aparecen identificadores `bocha`, `BOCHA_*`, `ElBochaPOS` y prefijos de archivos. Eso no significa que haya varios negocios cargados ni una arquitectura multiempresa. La marca visible actual es **Perla Negra**, con identidad de pescados y mariscos; el motor también contempla ventas de un mercado, despensa o comercio con unidades y productos por peso.

La distribución Mac mencionada en el desarrollo se preparó como proyecto separado. Este documento describe el repositorio local analizado; no certifica que aquella copia tenga todos los cambios presentes aquí.

## Verificación de esta entrega documental

Las referencias de base de datos se reconstruyen ejecutando las migraciones en una base **en memoria**. No se abre ni se modifica la base del negocio. La generación también lee contratos, rutas, permisos, dependencias e inventario de pruebas directamente del código. Los enlaces locales y la estructura del documento se comprueban al ensamblar la versión completa.

Para regenerar referencias: `node docs/documentacion/generar-referencias.mjs`. Para ensamblar la lectura completa: `node docs/documentacion/ensamblar.mjs`.

No se incluyen contraseñas, cookies, claves de backup, contenido de `.env` ni registros personales de clientes. Los ejemplos de operación utilizan datos ilustrativos.
