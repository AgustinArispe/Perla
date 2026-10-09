from pathlib import Path
import hashlib
import html
import json
import re
import struct

ROOT = Path(__file__).resolve().parent
MODULES = ['Ingreso', 'Inicio', 'Reposición', 'Revisión', 'Controles', 'Agenda',
           'Resumen semanal', 'Caja', 'Productos', 'Stock', 'Compras', 'Proveedores',
           'Ubicaciones', 'Clientes', 'Promociones', 'Histórico', 'Comprobantes',
           'Resumen mensual', 'Configuración', 'Usuarios', 'Turnos', 'Actividad',
           'Backups', 'Ayuda', 'Notificaciones']
POPUPS = dict(zip(['productos','stock','proveedores','clientes','ubicaciones','promociones',
                  'compras','historico','caja','configuracion','usuarios','turnos','actividad',
                  'backups','controles','agenda','resumen'],
                 ['Productos','Stock','Proveedores','Clientes','Ubicaciones','Promociones',
                  'Compras','Histórico','Caja','Configuración','Usuarios','Turnos','Actividad',
                  'Backups','Controles','Agenda','Resumen mensual']))

def dimensions(data):
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return struct.unpack('>II', data[16:24])
    assert data[:2] == b'\xff\xd8', 'Formato de imagen inesperado'
    i = 2
    while i < len(data):
        if data[i] != 255:
            i += 1
            continue
        while data[i] == 255:
            i += 1
        marker = data[i]
        i += 1
        if marker in [0xD8,0xD9,0x01] or 0xD0 <= marker <= 0xD7:
            continue
        length = struct.unpack('>H', data[i:i+2])[0]
        if marker in [0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF]:
            height, width = struct.unpack('>HH', data[i+3:i+7])
            return width, height
        i += length
    raise ValueError('Sin dimensiones JPEG')

items = []
for folder, kind in [('pantallas','Pantalla'),('popups','Ventana'),('referencias','Referencia')]:
    for path in sorted((ROOT/folder).iterdir()):
        if path.suffix.lower() not in ['.jpg','.png']:
            continue
        data = path.read_bytes()
        width, height = dimensions(data)
        assert width > 0 and height > 0 and len(data) > 1000
        stem = path.stem
        dom = ROOT/'dom'/f'{stem}.txt'
        if folder == 'pantallas':
            module = MODULES[int(stem[:2])]
        elif folder == 'popups':
            module = POPUPS[stem.split('-')[0]]
        else:
            module = 'Referencias de Agus'
        title = re.sub(r'^\d+-|^[a-z]+-\d+-', '', stem).replace('-', ' ').capitalize()
        items.append(dict(file=path.relative_to(ROOT).as_posix(), title=title, module=module,
                          type=kind, width=width, height=height, bytes=len(data),
                          sha256=hashlib.sha256(data).hexdigest(),
                          dom=dom.relative_to(ROOT).as_posix() if dom.exists() else None))

for item in items:
    if item['dom']:
        snapshot = (ROOT/item['dom']).read_text(encoding='utf-8-sig')
        assert 'Cargando' not in snapshot, item['file']

manifest = dict(date='2026-10-07', product='Perla Negra', url='http://localhost:3087/',
                purpose='Registro visual previo al rediseño', planStatus='Pendiente de ampliar e implementar',
                viewport=dict(width=984,height=712,devicePixelRatio=1), items=items)
(ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')

rows = []
for module in MODULES:
    relevant = [i for i in items if i['module']==module]
    panels = sum(i['type']=='Pantalla' for i in relevant)
    windows = sum(i['type']=='Ventana' for i in relevant)
    rows.append(f'| {module} | {panels} | {windows} |')
(ROOT/'cobertura.md').write_text('''# Cobertura del registro visual

Esta matriz cuenta archivos, no pruebas funcionales ni todas las combinaciones posibles de estado.
Las páginas largas se capturaron completas. Las ventanas se registraron a tamaño de pantalla;
en formularios largos también hay capturas de secciones inferiores.

| Módulo | Pantallas / variantes | Ventanas / variantes |
|---|---:|---:|
'''+ '\n'.join(rows)+'''

## Pendiente de capturar

- Vista previa de importación CSV: el selector de archivos del navegador integrado no abrió. Se conserva `import-preview-demo.csv` para retomarla, sin haber importado datos.
- Apertura de una caja nueva y alta inicial del administrador: requieren otro estado de la base; se preservaron los turnos abiertos y la instalación actual.
- Confirmaciones posteriores a operaciones definitivas (venta nueva, recepción de compra, restauración real, etc.): no se ejecutaron operaciones para fabricar estas vistas.
- Estados sin conexión, errores de servidor y todas las variantes por rol: esta pasada corresponde al jefe conectado a la base de demostración.
- Comparativa móvil y pantallas amplias: las nuevas capturas usan el tamaño normal del navegador integrado, 984 × 712; las referencias aportadas por Agus tienen otros tamaños.

Las pestañas sin resultados también están documentadas. No confundir un estado vacío con un fallo.
''',encoding='utf-8')

counts = {k:sum(i['type']==k for i in items) for k in ['Pantalla','Ventana','Referencia']}
readme = f'''# Auditoría visual · Perla Negra

Fecha: 7 de octubre de 2026. Versión local: http://localhost:3087/.

## Abrir el material

- [Galería de capturas](index.html): abrila en un navegador. Funciona sin internet ni servidor; permite buscar, filtrar y abrir cada imagen a tamaño completo.
- [Cobertura y pendientes](cobertura.md).
- [Propuesta de diseño archivada](plan/propuesta-diseno.md).
- [Plan de implementación por etapas archivado](plan/implementacion-por-etapas.md).
- [Inventario de archivos](manifest.json): dimensiones, tamaño, huella SHA-256 y contexto de cada captura.

## Material guardado

- **{counts['Pantalla']} pantallas y variantes**: ingreso, los 23 módulos, pestañas, búsquedas, detalles, ayuda y notificaciones.
- **{counts['Ventana']} ventanas y variantes**: altas, edición, selectores, cobro, fiado, descuentos, peso, devoluciones, cierres, reportes y exportaciones.
- **{counts['Referencia']} referencias originales de Agus**.
- Carpeta `dom/`: contexto textual de las nuevas capturas para recuperar campos, botones y estados en el análisis.

Total: **{len(items)} imágenes**. Las nuevas capturas corresponden al navegador con área visible de 984 × 712 y escala de dispositivo 1; las páginas largas se guardaron completas.

## Estado de la propuesta

**Pendiente.** Se archivó la propuesta existente y su plan de seis etapas sin ejecutar el rediseño.
Este registro amplía la evidencia para revisar el alcance antes de cambiar el frontend.
Las copias conservan el contenido de los originales en `specs/033-frontend-consistency/spec.md`
y `docs/superpowers/plans/2026-10-07-frontend-consistency.md`.

## Alcance y efectos de la exploración

Se usó la base local de demostración de cinco meses y el perfil jefe. No se confirmaron ventas nuevas,
compras, pagos, traslados, ajustes de stock, cambios de usuarios, restauraciones ni cambios de configuración.

Algunos recorridos crean registros de trabajo al abrirlos:

- **Conteo de Congelados / Salón de ventas:** quedó un borrador recuperable de 166 artículos. Se usó una diferencia ficticia para registrar la revisión; al terminar se dejó Hamburguesas x4 en **105 unidades, diferencia 0**, guardada solamente en el borrador. No se aplicó al stock. Las capturas anteriores conservan el ejemplo de diferencia, no el estado final.
- **Pedido n.º 1:** quedó un borrador de 11 unidades de Aceite de girasol / Buenos Sabores, sin confirmar. Es material de esta exploración, no una compra real.
- **Comprobante de la venta n.º 13813:** abrir la vista de impresión agregó un registro a la cola. No se imprimió ni se modificó la venta.
- La selección de Ana Torres se usó para mostrar el fiado y se quitó antes de salir del cobro. Se conservó el carrito existente sin confirmar ni cancelar.

## Próximo análisis pendiente

- [ ] Revisar el inventario y sumar la vista previa de importación y los estados que faltan.
- [ ] Comparar con las referencias PULSE y los criterios de Agus; mantener la identidad Perla Negra.
- [ ] Definir un contrato común de títulos, acciones, filtros, botones, tablas, tarjetas, paginación y ventanas.
- [ ] Corregir la densidad y prioridades de Inicio, controles y resúmenes; evitar cifras repetidas y paneles desproporcionados.
- [ ] Revisar buscadores, selección por teclado, foco, escáner y disponibilidad de stock durante los traslados.
- [ ] Ordenar navegación, configuración, clientes, proveedores, depósitos y flujos de caja; conservar permisos acumulativos del jefe.
- [ ] Revisar contraste y función de los colores, estados deshabilitados, formularios extensos y secciones inferiores de ventanas.
- [ ] Mantener Excel cerca de la información que exporta, con filtros múltiples y todas las coincidencias.
- [ ] Validar móviles, tabletas, pantallas amplias, zoom y tamaños táctiles en una pasada específica.
- [ ] Ampliar la propuesta y el plan por etapas con el análisis del material faltante antes de implementar.

Este registro es evidencia visual; no reemplaza pruebas funcionales, de seguridad o de accesibilidad.
'''
(ROOT/'README.md').write_text(readme,encoding='utf-8')

cards = []
for n, item in enumerate(items):
    esc = html.escape
    domlink = f'<a href="{esc(item["dom"])}">Contexto</a>' if item['dom'] else ''
    cards.append(f'''<article data-module="{esc(item['module'])}" data-kind="{item['type']}" data-search="{esc((item['module']+' '+item['title']+' '+item['file']).lower())}">
    <a class="image" href="{esc(item['file'])}" target="_blank" rel="noopener"><img src="{esc(item['file'])}" alt="{esc(item['module']+' · '+item['title'])}" loading="lazy" width="{item['width']}" height="{item['height']}"></a>
    <div class="caption"><span>{item['type']} · {esc(item['module'])}</span><h2>{esc(item['title'])}</h2><small>{item['width']} × {item['height']} px</small><div class="links"><a href="{esc(item['file'])}" target="_blank" rel="noopener">Abrir imagen ↗</a>{domlink}</div></div></article>''')
opts = ''.join(f'<option>{html.escape(m)}</option>' for m in MODULES+['Referencias de Agus'])
page = '''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Registro visual · Perla Negra</title>
<style>
:root{color-scheme:light;--navy:#172f3c;--ink:#163044;--muted:#576878;--gold:#906b31}*{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:var(--ink);font:15px/1.5 system-ui,sans-serif}header{background:var(--navy);color:#fff;padding:36px max(24px,calc((100vw - 1480px)/2));}header p{color:#d4e0e5;max-width:760px}h1{font-size:30px;letter-spacing:-1px;margin:6px 0}header .eyebrow{color:#e6c994;letter-spacing:2px;font-size:12px;text-transform:uppercase}header a{color:#f0d3a2}header nav{display:flex;flex-wrap:wrap;gap:12px 24px}main{max-width:1536px;padding:24px;margin:auto}.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;position:sticky;top:0;background:#f3f1ebf5;padding:16px 0;z-index:1}label{display:grid;gap:5px;font-size:12px;font-weight:600}.search{flex:1;min-width:220px}input,select{font:inherit;font-size:15px;border:1px solid #bfc6ca;border-radius:9px;padding:11px;background:#fff;color:var(--ink)}input:focus,select:focus,a:focus-visible{outline:3px solid #b99048;outline-offset:3px}.counter{color:var(--muted);margin:6px 0 20px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}article{background:#fff;border:1px solid #d8dce0;border-radius:12px;overflow:hidden;box-shadow:0 2px 5px #172f3c08}article[hidden]{display:none}.image{display:block;height:215px;overflow:hidden;background:#e9edf0}.image img{width:100%;height:auto;display:block}.caption{padding:16px}.caption span{color:var(--gold);font-size:12px;font-weight:600}h2{font-size:16px;margin:6px 0 12px;text-transform:none}small{color:var(--muted)}.links{display:flex;gap:20px;margin-top:14px;font-size:13px}a{color:var(--ink)}.notice{padding:14px 18px;background:#e9e4d8;border-radius:10px;margin:8px 0 10px}footer{color:var(--muted);padding:32px 0}.empty{padding:40px;text-align:center}.skip{position:absolute;left:-999px}.skip:focus{left:12px;top:12px;background:white;padding:8px;z-index:4}@media(max-width:520px){header{padding:28px 20px}main{padding:16px}h1{font-size:26px}.toolbar label{flex:1;min-width:140px}}
</style><a class="skip" href="#captures">Ir a las capturas</a><header><div class="eyebrow">Perla Negra · 7 octubre 2026</div><h1>Registro visual del producto</h1><p>Las pantallas actuales, sus ventanas y tus referencias, reunidas para preparar el próximo pulido.</p><nav><a href="README.md">Índice y alcance</a><a href="cobertura.md">Cobertura y pendientes</a><a href="plan/propuesta-diseno.md">Propuesta</a><a href="plan/implementacion-por-etapas.md">Plan por etapas</a></nav></header><main><div class="notice">Rediseño pendiente. Este archivo documenta la versión actual; el plan se ampliará con el análisis de estas capturas.</div><div class="toolbar"><label class="search">Buscar captura<input id="search" type="search" placeholder="Cobro, stock, Excel, configuración…"></label><label>Módulo<select id="module"><option value="">Todos los módulos</option>__OPTIONS__</select></label><label>Tipo<select id="kind"><option value="">Todos</option><option>Pantalla</option><option>Ventana</option><option>Referencia</option></select></label></div><p class="counter" id="count" aria-live="polite"></p><section id="captures" class="grid" aria-label="Capturas">__CARDS__</section><p id="empty" class="empty" hidden>No hay capturas con esos filtros.</p><footer>Registro local · Imágenes originales · Abrí cada captura para verla completa. Las nuevas capturas usan un área visible de 984 × 712. Las excepciones y los borradores de exploración están detallados en el índice.</footer></main><script>
const search=document.querySelector('#search'),module=document.querySelector('#module'),kind=document.querySelector('#kind'),cards=[...document.querySelectorAll('article')];
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function filter(){let count=0;for(const card of cards){const match=(!module.value||card.dataset.module===module.value)&&(!kind.value||card.dataset.kind===kind.value)&&normalize(card.dataset.search).includes(normalize(search.value));card.hidden=!match;if(match)count++;}document.querySelector('#count').textContent=`${count} de ${cards.length} capturas`;document.querySelector('#empty').hidden=count>0;}
[search,module,kind].forEach(el=>el.addEventListener('input',filter));filter();
</script></html>'''.replace('__OPTIONS__',opts).replace('__CARDS__','\n'.join(cards))
(ROOT/'index.html').write_text(page,encoding='utf-8')
print(json.dumps(dict(counts=counts,total=len(items),sizeMiB=round(sum(i['bytes'] for i in items)/1024**2,2)),ensure_ascii=False))
