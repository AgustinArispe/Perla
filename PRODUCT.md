# El Bocha

## Platform
Web para el control interno de un almacén argentino. Puesto principal: PC de caja con lector USB que escribe como teclado.

## Usuarios y trabajo
Vendedor: vender y cancelar el carrito actual. Supervisor: caja, catálogo, stock e histórico. Jefe: todos los módulos, usuarios y resumen mensual.

## Alcance confirmado
Productos por unidad y peso, descuentos, pagos, stock, ventas históricas, caja, informes mensuales y recuperación mediante backups. Base SQL centralizada. Sin facturación fiscal ni integración con ARCA.

## Uso y voz
Operación rápida con teclado. Textos breves; botones y títulos describen la acción. Lectura clara con luz de día. Errores y confirmaciones explican solo lo necesario para resolver la operación.

## Stack
React, TypeScript, Vite y API Fastify con SQLite. Las ventas requieren conexión con el servidor.
