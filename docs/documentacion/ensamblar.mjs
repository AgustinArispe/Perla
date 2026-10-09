// Ensambla y valida documentación local. No inicia servicios ni modifica datos del negocio.
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url));
const files=(await readdir(here)).filter(f=>/^\d\d-.*\.md$/.test(f)).sort().concat(['referencia-base-datos.md','referencia-api-permisos.md','referencia-inventario.md']);
const docs=await Promise.all(files.map(async file=>({file,text:await readFile(resolve(here,file),'utf8')})));
const broken=[];
for(const {file,text} of docs.concat([{file:'README.md',text:await readFile(resolve(here,'README.md'),'utf8')}])){
 for(const m of text.matchAll(/\]\(([^)]+)\)/g)){
  const target=m[1].replace(/^<|>$/g,'').split('#')[0];
  if(!target||/^(https?:|mailto:)/.test(target)||/^DOCUMENTACION-COMPLETA\./.test(target)) continue;
  try{await access(resolve(here,target));}catch{broken.push({file,target});}
 }
}
if(broken.length)throw new Error('Enlaces rotos: '+JSON.stringify(broken));
const prefix=f=>f.replace(/\.md$/,'');
let combined='# Perla Negra POS — documentación completa\n\nAutor del producto: Luis Agustín Arispe. Corte documental: 9 de octubre de 2026. Paquete 0.1.0; esquema SQLite 29.\n\nEsta edición reúne el manual funcional, arquitectura, reglas, seguridad, operación y referencias exhaustivas del código local. No contiene credenciales ni datos personales del negocio. Las pruebas históricas se distinguen de las verificaciones realizadas para esta documentación.\n\n[Índice por archivos](README.md)\n\n## Contenido\n\n';
for(const d of docs)combined+=`- [${d.text.split('\n')[0].replace(/^# /,'')}](#${prefix(d.file)})\n`;
for(const d of docs){
 let body=d.text.replace(/\[Volver al índice\]\(README.md\)\s*/,'');
 // Conserva enlaces a capítulos en sus archivos originales; cada capítulo tiene un ancla estable en el consolidado.
 combined+=`\n\n---\n\n<a id="${prefix(d.file)}"></a>\n\n${body.trim()}\n`;
}
await writeFile(resolve(here,'DOCUMENTACION-COMPLETA.md'),combined);
const result=spawnSync('python',[resolve(here,'renderizar.py')],{cwd:here,encoding:'utf8'});
if(result.status!==0)throw new Error(result.stderr||result.stdout||'No se pudo renderizar HTML.');
const stats={chapters:docs.filter(d=>/^\d/.test(d.file)).length,references:3,wordsNarrative:docs.filter(d=>/^\d/.test(d.file)).reduce((s,d)=>s+d.text.split(/\s+/).length,0),wordsTotal:combined.split(/\s+/).length,localLinksChecked:true};
await writeFile(resolve(here,'verificacion-documental.json'),JSON.stringify({date:'2026-10-09',scope:'Documentación: migraciones en memoria, referencias estáticas, enlaces locales y ensamblado. Sin ejecutar suite funcional completa.',...stats},null,2)+'\n');
console.log(JSON.stringify(stats));
console.log(result.stdout.trim());
