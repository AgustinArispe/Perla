# Cobertura del registro visual

Esta matriz cuenta archivos, no pruebas funcionales ni todas las combinaciones posibles de estado.
Las páginas largas se capturaron completas. Las ventanas se registraron a tamaño de pantalla;
en formularios largos también hay capturas de secciones inferiores.

| Módulo | Pantallas / variantes | Ventanas / variantes |
|---|---:|---:|
| Ingreso | 1 | 0 |
| Inicio | 2 | 0 |
| Reposición | 6 | 0 |
| Revisión | 3 | 0 |
| Controles | 6 | 3 |
| Agenda | 1 | 2 |
| Resumen semanal | 2 | 0 |
| Caja | 2 | 16 |
| Productos | 1 | 12 |
| Stock | 1 | 7 |
| Compras | 5 | 4 |
| Proveedores | 1 | 9 |
| Ubicaciones | 3 | 9 |
| Clientes | 1 | 6 |
| Promociones | 3 | 10 |
| Histórico | 1 | 5 |
| Comprobantes | 2 | 0 |
| Resumen mensual | 5 | 8 |
| Configuración | 5 | 3 |
| Usuarios | 1 | 4 |
| Turnos | 1 | 2 |
| Actividad | 2 | 1 |
| Backups | 2 | 1 |
| Ayuda | 15 | 0 |
| Notificaciones | 1 | 0 |

## Pendiente de capturar

- Vista previa de importación CSV: el selector de archivos del navegador integrado no abrió. Se conserva `import-preview-demo.csv` para retomarla, sin haber importado datos.
- Apertura de una caja nueva y alta inicial del administrador: requieren otro estado de la base; se preservaron los turnos abiertos y la instalación actual.
- Confirmaciones posteriores a operaciones definitivas (venta nueva, recepción de compra, restauración real, etc.): no se ejecutaron operaciones para fabricar estas vistas.
- Estados sin conexión, errores de servidor y todas las variantes por rol: esta pasada corresponde al jefe conectado a la base de demostración.
- Comparativa móvil y pantallas amplias: las nuevas capturas usan el tamaño normal del navegador integrado, 984 × 712; las referencias aportadas por Agus tienen otros tamaños.

Las pestañas sin resultados también están documentadas. No confundir un estado vacío con un fallo.
