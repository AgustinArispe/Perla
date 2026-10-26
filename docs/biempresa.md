# BiEmpresa: unidades operativas con stock compartido

Módulo opcional, apagado inicialmente. No es un sistema de facturación ni una contabilidad multiempresa: no determina propiedad de mercadería, consignaciones, liquidaciones entre empresas ni obligaciones fiscales.

## Uso

1. Activar **BiEmpresa · unidades operativas** en Configuración → Funciones.
2. Cambiar los dos nombres en Configuración → BiEmpresa.
3. Asignar cada usuario a su unidad en Administración → Usuarios. Sin asignación explícita usa la principal. Cambiar un usuario invalida sus sesiones.
4. Al ingresar se muestra la unidad activa. La segunda usa una paleta dorada con acciones oscuras. No hay cambio libre de unidad desde Caja.

Las unidades comparten catálogo, precios, clientes, promociones, depósitos, stock y configuración. Las cajas siguen siendo las terminales y turnos existentes: no se duplican saldos ni se crean cajas automáticamente. No hay aislamiento de datos por unidad: los permisos existentes siguen vigentes y los responsables pueden consultar el consolidado.

## Trazabilidad

El servidor obtiene la unidad del usuario, nunca de un dato libre enviado por el cliente. Las ventas guardan identificador y nombre histórico inmutables. Cambiar nombres o asignaciones no reescribe documentos existentes. El histórico permite filtrar por unidad y exportar la selección a Excel; los reportes generales siguen consolidados.

Las órdenes conservan la unidad de quien las preparó, aunque las cobre alguien de otra unidad. La confirmación de cobro muestra esa unidad. Las devoluciones heredan la unidad de la venta original, no la de quien reintegra. Ventas, devoluciones y anulaciones usan los movimientos de stock existentes: no se agrega un segundo descuento de existencias.

## Desactivación

Se ocultan las opciones y la paleta especial; las ventas nuevas normales se registran en la principal. Las órdenes preparadas pendientes conservan su unidad original al cobrarse, incluso con el módulo apagado. El historial y su filtro permanecen disponibles si hubo operaciones de la segunda unidad. Las asignaciones se conservan para una futura reactivación.

## Esquema

Migración 38: una tabla `business_units`, dos registros y atributos de asignación en usuarios, ventas y órdenes. El esquema pasa de 62 a 63 tablas. No se duplica la base ni las tablas de stock. Las operaciones anteriores se atribuyen a la principal; no se infiere retroactivamente una empresa distinta.
