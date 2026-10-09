"""Render documental portátil; usa markdown-it-py disponible en el entorno de documentación."""
from pathlib import Path
from html import escape
import re
import unicodedata
from markdown_it import MarkdownIt

root = Path(__file__).resolve().parent
files = sorted(root.glob('[0-9][0-9]-*.md')) + [root / f for f in ('referencia-base-datos.md', 'referencia-api-permisos.md', 'referencia-inventario.md')]
md = MarkdownIt('commonmark', {'html': False}).enable('table')
def slug(text):
    return re.sub(r'[^\w\- ]', '', unicodedata.normalize('NFC', text).lower()).replace(' ', '-')

sections, toc, ids, local_anchors = [], [], set(), []
for path in files:
    source = path.read_text(encoding='utf-8')
    source = re.sub(r'\[Volver al índice\]\(README.md\)\s*', '', source)
    tokens = md.parse(source)
    prefix = path.stem
    title = source.splitlines()[0].removeprefix('# ')
    toc.append(f'<a href="#{prefix}">{escape(title)}</a>')
    ids.add(prefix)
    # IDs estables y únicos para títulos internos y referencias de tablas.
    used = {}
    for i, token in enumerate(tokens):
        if token.type == 'heading_open':
            base = prefix + '--' + slug(tokens[i + 1].content)
            n = used.get(base, 0)
            used[base] = n + 1
            heading_id = base + (f'-{n}' if n else '')
            token.attrSet('id', heading_id)
            ids.add(heading_id)
        if token.children:
            for child in token.children:
                if child.type != 'link_open':
                    continue
                href = child.attrGet('href') or ''
                if href.startswith('#'):
                    href = '#' + prefix + '--' + href[1:]
                elif href.endswith('.md') and '/' not in href and (root / href).exists():
                    href = '#' + Path(href).stem if href != 'README.md' else '#portada'
                child.attrSet('href', href)
                if href.startswith('#'):
                    local_anchors.append(href[1:])
    rendered = md.renderer.render(tokens, md.options, {})
    sections.append(f'<section class="chapter" id="{prefix}">{rendered}<p class="source"><a href="{path.name}">Abrir este capítulo en Markdown</a> · <a href="#portada">Volver al inicio</a></p></section>')

ids.add('portada')
missing = sorted(set(local_anchors) - ids)
if missing:
    raise RuntimeError('Anclas HTML inexistentes: ' + ', '.join(missing))

css = '''
:root{--ink:#17313d;--muted:#586872;--accent:#795824;--line:#d9dfe2;--paper:#fff;--canvas:#f5f4f0}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}body{margin:0;background:var(--canvas);color:var(--ink);font:16px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif}
nav{position:fixed;inset:0 auto 0 0;width:285px;background:#152b36;color:#f4efe4;padding:28px 20px;overflow:auto}nav .brand{font:700 22px Georgia,serif;letter-spacing:.6px}nav small{display:block;color:#d7c6a4;margin:4px 0 28px}nav a{display:block;color:#e2e9ec;text-decoration:none;padding:9px 10px;margin:3px 0;border-radius:7px;font-size:13px;line-height:1.5}nav a:hover,nav a:focus{background:#304752;color:#f4d49c;outline-color:#f4d49c}
main{margin-left:285px;padding:48px clamp(24px,5vw,96px);max-width:1650px}.cover{border-top:5px solid var(--accent);background:white;padding:42px;border-radius:0 0 12px 12px;margin-bottom:32px;box-shadow:0 3px 14px #17313d08}.eyebrow{color:var(--accent);letter-spacing:.13em;font-size:12px;font-weight:700;text-transform:uppercase}h1{font-size:clamp(27px,3vw,38px);line-height:1.22;letter-spacing:-.025em;margin:10px 0 24px}h2{font-size:24px;line-height:1.3;margin:44px 0 18px;border-bottom:1px solid var(--line);padding-bottom:12px}h3{font-size:19px;margin:30px 0 12px}p{margin:0 0 17px}a{color:var(--accent);text-underline-offset:3px}li{margin:5px 0}.chapter{background:white;border:1px solid var(--line);border-radius:12px;margin:28px 0;padding:clamp(22px,4vw,48px);overflow-wrap:anywhere}.chapter>h1{border-left:4px solid var(--accent);padding-left:18px}table{width:100%;border-collapse:collapse;margin:24px 0;font-size:13px;line-height:1.5;table-layout:auto}th{text-align:left;background:#edf1f2;color:var(--ink);font-weight:650}th,td{border:1px solid var(--line);padding:10px 12px;vertical-align:top}tr:nth-child(even) td{background:#fafaf8}code{font:12px/1.5 ui-monospace,Consolas,monospace;background:#f1f3f4;padding:2px 4px;border-radius:3px;overflow-wrap:anywhere}pre{background:#f1f3f4;border:1px solid var(--line);border-left:3px solid #b38b47;padding:18px;overflow:auto;border-radius:7px;line-height:1.5}pre code{background:transparent;padding:0;white-space:pre-wrap}.source{font-size:12px;color:var(--muted);border-top:1px solid var(--line);margin-top:38px;padding-top:18px}.meta{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}.meta span{background:#f5ecdc;border:1px solid #eadac0;border-radius:6px;padding:8px 12px;font-size:13px}.note{color:var(--muted);font-size:14px}.print-button{border:0;border-radius:7px;background:var(--accent);color:white;padding:11px 18px;font:600 14px system-ui;cursor:pointer}.print-button:focus{outline:3px solid #d4b57c;outline-offset:3px}
@media(max-width:900px){nav{position:static;width:auto;max-height:320px}main{margin:0;padding:18px}.cover{padding:24px}.chapter{padding:22px}table{display:block;overflow:auto}h2{font-size:21px}}
@media print{@page{size:A4;margin:18mm}nav,.print-button,.source{display:none}body{font-size:10pt;background:white}main{margin:0;padding:0;max-width:none}.cover{box-shadow:none;padding:10mm 0;break-after:page}.chapter{border:0;border-radius:0;padding:0;margin:0;break-before:page}h1{font-size:23pt}h2{font-size:16pt;break-after:avoid}h3{break-after:avoid}table{font-size:8pt}tr,pre{break-inside:avoid}a{color:inherit}thead{display:table-header-group}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
'''
html = f'''<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Documentación funcional, técnica y operativa de Perla Negra POS"><title>Perla Negra POS · Documentación integral</title><style>{css}</style></head><body>
<nav aria-label="Índice de documentación"><div class="brand">PERLA NEGRA</div><small>Sistema de ventas y gestión</small><a href="#portada">Presentación</a>{''.join(toc)}</nav>
<main><header class="cover" id="portada"><div class="eyebrow">Documentación integral · Octubre 2026</div><h1>Todo el sistema,<br>explicado en detalle.</h1><p>Perla Negra POS: manual funcional, reglas de negocio, arquitectura, datos, seguridad, instalación, mantenimiento y pruebas.</p><div class="meta"><span>11 capítulos</span><span>86 tablas</span><span>125 rutas HTTP</span><span>29 migraciones</span></div><p><strong>Producto de Luis Agustín Arispe.</strong> Código local analizado al 9 de octubre de 2026. Paquete 0.1.0, esquema 29.</p><p class="note">Esta edición distingue comportamiento implementado, evidencia histórica y limitaciones. No contiene credenciales ni datos personales del negocio. Usá Ctrl+F o Cmd+F para buscar en todo el documento.</p><button class="print-button" onclick="window.print()">Imprimir / Guardar PDF</button> <a href="README.md">Índice de archivos</a></header>
{''.join(sections)}
<footer class="note">Fin de la documentación · Referencias generadas desde el código y migraciones en memoria.</footer></main></body></html>'''
(root / 'DOCUMENTACION-COMPLETA.html').write_text(html, encoding='utf-8')
print(f'HTML: {len(html):,} caracteres; {len(ids)} anclas únicas; {len(local_anchors)} enlaces internos verificados.')
