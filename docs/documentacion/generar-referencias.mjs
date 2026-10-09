// Regenera referencias exclusivamente desde el código; nunca abre una base del negocio.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const require = createRequire(resolve(root, 'package.json'));
const bundle = await build({
  stdin: { contents: `export * from './src/worker/db/migrations'; export * from './src/domain/permissions'; export * from './src/shared/excel';`, resolveDir: root, loader: 'ts' },
  write: false, bundle: true, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'sql', setup(b) {
    b.onResolve({ filter: /\.sql\?raw$/ }, a => ({ path: resolve(a.resolveDir, a.path.slice(0,-4)), namespace: 'sql' }));
    b.onLoad({ filter: /.*/, namespace: 'sql' }, async a => ({ contents: await readFile(a.path, 'utf8'), loader: 'text' }));
  }}],
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, mod, mod.exports);
const { MIGRATIONS, SCHEMA_VERSION, migrate, knownOperations, hasPermission, excelTitles, excelFilterKeys, excelMultipleKeys } = mod.exports;
const Database = require('better-sqlite3');
const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
migrate(db);
const escape = x => String(x ?? '—').replaceAll('|','\\|').replaceAll('\n',' ');
const link = p => `[${p}](../../${p})`;
const pre = title => `# ${title}\n\nReferencia generada desde el código del repositorio. Corte documental: 9 de octubre de 2026. Esquema ${SCHEMA_VERSION}. No contiene datos del comercio.\n\n[Volver al índice](README.md)\n\n`;
const tables = db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
let schema = pre('Diccionario completo de la base de datos');
schema += `Se reconstruyeron las ${MIGRATIONS.length} migraciones en SQLite en memoria. Se documentan ${tables.length} tablas con columnas, claves foráneas, índices y DDL final. La fila PK muestra la posición dentro de una clave primaria compuesta. Un NOT NULL=No no implica que una PK admita nulos en todos los modos de SQLite; leer también el DDL.\n\n`;
schema += tables.map(t=>`- [${t.name}](#${t.name.replaceAll('_','-')})`).join('\n')+'\n\n';
for(const t of tables){
 const quote = '"'+t.name.replaceAll('"','""')+'"';
 schema += `## ${t.name.replaceAll('_','-')}\n\nNombre SQL: \`${t.name}\`.\n\n| Columna | Tipo | NOT NULL | Predeterminado | PK |\n|---|---|---|---|---|\n`;
 for(const c of db.prepare(`PRAGMA table_info(${quote})`).all()) schema+=`| ${escape(c.name)} | ${c.type} | ${c.notnull?'Sí':'No'} | ${escape(c.dflt_value)} | ${c.pk || '—'} |\n`;
 const fks=db.prepare(`PRAGMA foreign_key_list(${quote})`).all();
 schema+='\n**Relaciones**\n\n'+(fks.length?fks.map(f=>`- \`${f.from}\` → \`${f.table}.${f.to}\`; al actualizar: ${f.on_update}; al borrar: ${f.on_delete}.`).join('\n'):'Sin claves foráneas declaradas.')+'\n\n';
 schema+='**Índices**\n\n';
 const indexes=db.prepare(`PRAGMA index_list(${quote})`).all();
 schema+=(indexes.length?indexes.map(i=>{
   const cols=db.prepare(`PRAGMA index_info("${i.name}")`).all().map(c=>c.name??'(expresión)').join(', ');
   const sql=db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(i.name)?.sql;
   return `- \`${i.name}\`: ${i.unique?'único':'no único'}; columnas: ${cols}; ${i.partial?'parcial':'completo'}.${sql?' SQL: `'+sql+'`':''}`;
 }).join('\n'):'Sin índices adicionales.')+'\n\n**Definición efectiva**\n\n```sql\n'+t.sql+';\n```\n\n';
}
schema+='## Secuencia de migraciones\n\n| Versión | Primera sentencia (orientación) |\n|---|---|\n';
for(const m of MIGRATIONS) schema+=`| ${m.version} | ${escape(m.sql.replace(/--[^\n]*/g,'').trim().split(';')[0].slice(0,150))} |\n`;
await mkdir(here,{recursive:true});
await writeFile(resolve(here,'referencia-base-datos.md'),schema);
db.close();
let api=pre('Referencia de rutas, permisos, filtros y contratos');
api+='## Interpretación\n\nLa tabla de permisos describe el conjunto base. El servicio también controla propiedad del registro, rol administrativo especial, revisión, estado de caja y módulos habilitados. Los adaptadores HTTP tienen operaciones internas que delegan en estos permisos: no se debe autorizar una URL solamente comparando su nombre con esta matriz.\n\n';
api+='## Matriz base de permisos\n\n| Operación | Vendedor | Supervisor | Jefe | Administrador |\n|---|---|---|---|---|\n';
for(const op of [...knownOperations].sort()) api+=`| \`${op}\` | ${['SELLER','SUPERVISOR','OWNER','ADMIN'].map(r=>hasPermission(r,op)?'Sí':'—').join(' | ')} |\n`;
const app=await readFile(resolve(root,'src/server/app.ts'),'utf8');
const routes=[...app.matchAll(/route\(\s*'(GET|POST|PUT|DELETE)',\s*'([^']+)',\s*'([^']+)'/g)].map(m=>({method:m[1],url:m[2],op:m[3]}));
for(const m of app.matchAll(/\['(GET|POST|PUT|DELETE)', '([^']+)', '([^']+)'\]/g)) routes.push({method:m[1],url:'/api/v1/'+m[2],op:m[3]});
for(const kind of ['products','sales','stock','sale-items','shifts','purchases']) routes.push({method:'GET',url:'/api/v1/exports/'+kind,op:'exports.'+kind});
api+=`\n## Rutas HTTP (${routes.length})\n\nFuente: ${link('src/server/app.ts')}. Incluye rutas literales y las dos familias registradas mediante bucles. Los archivos estáticos se sirven por separado.\n\n| Método | Ruta | Operación ejecutada |\n|---|---|---|\n`;
for(const r of routes.sort((a,b)=>a.url.localeCompare(b.url)||a.method.localeCompare(b.method))) api+=`| ${r.method} | \`${r.url}\` | \`${r.op}\` |\n`;
api+='\n## Exportación XLSX: datasets y filtros\n\nDentro de un filtro múltiple se aplica OR; entre filtros, AND. No se admite combinar simultáneamente la variante simple y múltiple de una misma clave.\n\n| Dataset | Título | Filtros simples admitidos | Variantes múltiples |\n|---|---|---|---|\n';
for(const [key,title] of Object.entries(excelTitles)) api+=`| \`${key}\` | ${title} | ${excelFilterKeys[key].map(x=>'`'+x+'`').join(', ')} | ${excelFilterKeys[key].filter(x=>excelMultipleKeys[x]).map(x=>'`'+excelMultipleKeys[x]+'`').concat(key==='customers'?['`statuses`']:[]).join(', ')||'—'} |\n`;
async function walk(dir){const out=[];for(const f of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,f.name);if(f.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
const contracts=(await walk(resolve(root,'src/shared'))).filter(x=>x.endsWith('.ts')).sort();
api+='\n## Subacciones de Control\n\n`POST /api/v1/control` recibe `{ area, action, input }`. La exportación usa `/api/v1/control/export` con las acciones de exportación admitidas. Inventario de nombres comparados explícitamente en cada servicio; sus esquemas y puertas de autorización permanecen en el archivo enlazado.\n\n| Área | Acciones declaradas | Servicio |\n|---|---|---|\n';
for(const area of ['workspace','replenishment','commercial','operations']){
 const file=`src/worker/control/${area}.ts`;
 const content=await readFile(resolve(root,file),'utf8');
 const actions=[...new Set([...content.matchAll(/(?:action\s*===\s*|case\s+)'([^']+)'/g)].map(m=>m[1]))].sort();
 api+=`| \`${area}\` | ${actions.map(x=>'`'+x+'`').join(', ')} | ${link(file)} |\n`;
}
api+='\n## Contratos compartidos y esquemas Zod\n\nLos nombres siguientes son exportaciones del código; la definición exacta enlazada conserva campos, restricciones y tipos compuestos. Las validaciones adicionales de servicio no se reducen a estos esquemas.\n\n';
for(const p of contracts){const content=await readFile(p,'utf8');const names=[...content.matchAll(/export\s+(?:const|type|interface|class|function)\s+(\w+)/g)].map(m=>m[1]);api+=`### ${relative(root,p).replaceAll('\\','/')}\n\n${link(relative(root,p).replaceAll('\\','/'))}\n\n${names.map(n=>'`'+n+'`').join(', ')}.\n\n`;}
await writeFile(resolve(here,'referencia-api-permisos.md'),api);
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
let inv=pre('Inventario de código, dependencias, comandos y pruebas');
inv+=`## Identificación\n\nPaquete: \`${pkg.name}\`. Producto: ${pkg.productName}. Versión: ${pkg.version}. Node: \`${pkg.engines.node}\`. npm: \`${pkg.engines.npm}\`.\n\n## Comandos declarados\n\n| Script npm | Comando |\n|---|---|\n`;
for(const [k,v]of Object.entries(pkg.scripts))inv+=`| \`${k}\` | \`${v}\` |\n`;
for(const group of ['dependencies','devDependencies','overrides']){inv+=`\n## ${group}\n\n| Dependencia | Versión declarada |\n|---|---|\n`;for(const[k,v]of Object.entries(pkg[group]??{}))inv+=`| ${k} | \`${typeof v==='object'?JSON.stringify(v):v}\` |\n`;}
const src=(await walk(resolve(root,'src'))).filter(p=>/\.(ts|tsx|css|sql|html)$/.test(p)).sort();
inv+=`\n## Archivos de implementación (${src.length})\n\nInventario de TS, TSX, CSS, SQL y HTML. Se excluyen artefactos compilados, imágenes y tipografías.\n\n`;
for(const p of src){const rp=relative(root,p).replaceAll('\\','/');const text=await readFile(p,'utf8');inv+=`- ${link(rp)} — ${text.split('\n').length} líneas.\n`;}
const tests=(await walk(resolve(root,'tests'))).filter(p=>/\.(test|spec)\.[cm]?[jt]sx?$/.test(p)).sort();
inv+=`\n## Archivos de pruebas (${tests.length})\n\nLos títulos son declaraciones estáticas encontradas en el código. No representan un conteo de casos ejecutados: existen parametrizaciones, bucles y selecciones por proyecto. Este inventario no certifica aprobación de pruebas en la fecha de documentación.\n\n`;
for(const p of tests){const rp=relative(root,p).replaceAll('\\','/');const content=await readFile(p,'utf8');const names=[...content.matchAll(/\b(?:test|it|describe)(?:\.(?:skip|only|todo))?\(\s*(['"`])([^\n]*?)\1/g)].map(m=>m[2]);inv+=`### ${rp}\n\n${link(rp)}\n\n`+(names.length?names.map(n=>'- '+n).join('\n'):'Ver casos y parametrizaciones en el archivo enlazado.')+'\n\n';}
inv+='## Especificaciones y planes de desarrollo\n\nLos estados de tareas son marcas documentales, no evidencia de ejecución actual. Una casilla completa no sustituye pruebas ni lectura del código.\n\n| Especificación | Artefactos disponibles | Tareas marcadas / total |\n|---|---|---|\n';
const specs=(await readdir(resolve(root,'specs'),{withFileTypes:true})).filter(x=>x.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name));
for(const spec of specs){
 const base=`specs/${spec.name}`;
 const files=await readdir(resolve(root,base));
 const artifacts=files.filter(f=>['spec.md','plan.md','tasks.md','data-model.md','quickstart.md','research.md'].includes(f));
 let progress='—';
 if(files.includes('tasks.md')){const body=await readFile(resolve(root,base,'tasks.md'),'utf8');const total=[...body.matchAll(/^- \[[ xX]\]/gm)].length;const done=[...body.matchAll(/^- \[[xX]\]/gm)].length;progress=`${done} / ${total}`;}
 inv+=`| ${spec.name} | ${artifacts.map(f=>link(base+'/'+f)).join(', ')} | ${progress} |\n`;
}
await writeFile(resolve(here,'referencia-inventario.md'),inv);
console.log(JSON.stringify({schemaVersion:SCHEMA_VERSION,tables:tables.length,migrations:MIGRATIONS.length,routes:routes.length,operations:knownOperations.length,sourceFiles:src.length,testFiles:tests.length,datasets:Object.keys(excelTitles).length}));
