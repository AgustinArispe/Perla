import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
const directory=resolve('.data/five-month-local');
const child=spawn(process.execPath,['dist/api/index.cjs'],{stdio:'inherit',env:{...process.env,NODE_ENV:'test',BOCHA_PUBLIC_ORIGIN:'http://localhost:3087',BOCHA_HOST:'127.0.0.1',BOCHA_PORT:'3087',BOCHA_DATABASE_PATH:resolve(directory,'pos.sqlite'),BOCHA_BACKUP_DIRECTORY:resolve(directory,'backups'),BOCHA_BACKUP_KEY:readFileSync(resolve(directory,'backup.key')).toString('hex')}});
process.on('SIGINT',()=>child.kill()); process.on('SIGTERM',()=>child.kill());child.on('exit',code=>{process.exitCode=code??0;});
