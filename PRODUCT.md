# Perla Negra

## Platform
Web para el control interno de Perla Negra, pescados y mariscos. Puesto principal: PC de caja con lector USB que escribe como teclado; la dueña también debe poder gestionar desde el celular.

## Usuarios y trabajo
Vendedor: vender y cancelar el carrito actual. Supervisor: caja, catálogo, stock e histórico. Jefe: todos los módulos, usuarios y resumen mensual.

## Alcance confirmado
Productos por unidad y peso, descuentos, pagos, stock, ventas históricas, caja, informes mensuales y recuperación mediante backups. Base SQL centralizada. Sin facturación fiscal ni integración con ARCA.

## Uso y voz
Operación rápida con teclado. Textos breves; botones y títulos describen la acción. Lectura clara con luz de día. Errores y confirmaciones explican solo lo necesario para resolver la operación.

## Stack
React, TypeScript, Vite y API Fastify con SQLite. Las ventas requieren conexión con el servidor.

## Ampliación aprobada — 1 de octubre de 2026

Funciones configurables por negocio, compras/proveedores, costos y margen bruto, stock/lotes, precios/promociones automáticas, notificaciones, caja y comparativos. Clientes con cuenta corriente es opcional y empieza apagado. Preparar crecimiento hacia varias ubicaciones sin exponer complejidad innecesaria a un negocio atendido por su dueña.

La configuración del negocio y los permisos personales son independientes. Desactivar conserva históricos y contempla compromisos pendientes. Formularios con pocos campos iniciales y opciones adicionales cuando hacen falta.

[Roadmap y decisiones implementadas](docs/roadmap-modular.md). Las etapas 014–023 están entregadas y verificadas; cada función opcional conserva sus reglas de permisos y dependencias.
