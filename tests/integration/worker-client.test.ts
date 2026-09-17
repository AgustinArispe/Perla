import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, it } from 'vitest';
import { WorkerClient } from '../../src/main/worker-client';
it('token permanece en main y un error de contraseña no destruye la sesión', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-worker-auth-'));
  const script = join(directory, 'worker.cjs');
  writeFileSync(
    script,
    `const {parentPort}=require('node:worker_threads');parentPort.postMessage({type:'ready',result:{ok:true,value:{database:'ready',schemaVersion:5,sqliteVersion:'test'}}});parentPort.on('message',m=>{if(m==='close'){parentPort.close();return;}const op=m.request.operation;let result=op==='auth.login'?{ok:true,value:{sessionToken:'a'.repeat(64),user:{id:'123e4567-e89b-42d3-a456-426614174000',username:'jefe',name:'Jefe',role:'OWNER',active:true,revision:1,createdAt:'now',updatedAt:'now'}}}:op==='auth.changePassword'?{ok:false,error:{code:'UNAUTHENTICATED',message:'Contraseña actual incorrecta',retryable:false}}:{ok:true,value:{authenticated:m.sessionToken==='a'.repeat(64)}};setTimeout(()=>parentPort.postMessage({type:'response',id:m.id,result}),20);});`,
  );
  const client = new WorkerClient(script, 'unused', 'test', 'test');
  try {
    await client.start();
    const login = await client.call('auth.login', null);
    expect(login).toMatchObject({ ok: true, value: { name: 'Jefe' } });
    expect(JSON.stringify(login)).not.toContain('sessionToken');
    await client.call('auth.changePassword', null);
    expect(await client.call('auth.status', null)).toEqual({
      ok: true,
      value: { authenticated: true },
    });
  } finally {
    await client.stop();
    rmSync(directory, { recursive: true, force: true });
  }
});

it('agrupa reconexiones concurrentes en un único worker y rechaza operaciones durante el cambio', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-worker-client-'));
  const script = join(directory, 'worker.cjs');
  const log = join(directory, 'starts.txt');
  writeFileSync(
    script,
    `
    const { parentPort, workerData } = require('node:worker_threads');
    require('node:fs').appendFileSync(workerData.databasePath, 'start\\n');
    setTimeout(() => parentPort.postMessage({ type: 'ready', result: { ok: true, value: { database: 'ready', schemaVersion: 2, sqliteVersion: 'test' } } }), 30);
    parentPort.on('message', message => {
      if (message === 'close') { setTimeout(() => parentPort.close(), 30); return; }
      parentPort.postMessage({ type: 'response', id: message.id, result: { ok: true, value: 'answered' } });
    });
  `,
  );
  const client = new WorkerClient(script, log, 'test', 'test');
  try {
    await client.start();
    const first = client.reconnect();
    const second = client.reconnect();
    expect(second).toBe(first);
    const blocked = await client.call('system.health', null);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe('DB_BUSY');
    expect((await Promise.all([first, second])).every((result) => result.ok)).toBe(true);
    expect(readFileSync(log, 'utf8').trim().split('\n')).toHaveLength(2);
    expect(await client.call('system.health', null)).toEqual({ ok: true, value: 'answered' });
  } finally {
    await client.stop();
    rmSync(directory, { recursive: true, force: true });
  }
});
