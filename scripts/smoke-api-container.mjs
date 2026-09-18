import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
// Native HTTP permits the explicit Host used to test the HTTPS gateway's forwarded request.
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const r = request(
      url,
      { method: options.method ?? 'GET', headers: options.headers },
      (response) => {
        const chunks = [];
        response.on('data', (c) => chunks.push(c));
        response.on('end', () =>
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode,
              headers: response.headers,
            }),
          ),
        );
      },
    );
    r.on('error', reject);
    r.end(options.body);
  });
}
const id = randomUUID(),
  name = `bocha-api-test-${id}`,
  volume = `bocha-api-test-${id}`,
  directory = mkdtempSync(join(tmpdir(), 'bocha-docker-')),
  envFile = join(directory, 'server.env');
writeFileSync(
  envFile,
  `BOCHA_PUBLIC_ORIGIN=https://pos.test\nBOCHA_BACKUP_KEY=${randomBytes(32).toString('hex')}\n`,
  { mode: 0o600 },
);
function docker(args, input) {
  const r = spawnSync('docker', args, { input, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || 'Docker falló.');
  return r.stdout.trim();
}
try {
  docker(['volume', 'create', volume]);
  docker(
    [
      'run',
      '--rm',
      '-i',
      '--env-file',
      envFile,
      '-v',
      volume + ':/data',
      'el-bocha-api:dev',
      'node',
      'dist/api/cli.cjs',
      'owner:create',
      '--username',
      'owner',
      '--name',
      'Prueba',
      '--password-stdin',
    ],
    'Prueba-Container-Bocha-2026!',
  );
  docker([
    'run',
    '-d',
    '--name',
    name,
    '--read-only',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges:true',
    '--tmpfs',
    '/tmp',
    '--env-file',
    envFile,
    '-v',
    `${volume}:/data`,
    '-p',
    '127.0.0.1::3000',
    'el-bocha-api:dev',
  ]);
  const port = docker(['port', name, '3000/tcp']).split(':').at(-1);
  let url = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      ready = (await fetch(url + '/api/v1/health')).ok;
    } catch {
      /* El servicio todavía está iniciando. */
    }
    if (ready) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error('API no está lista.');
  if (docker(['exec', name, 'node', '-e', 'console.log(process.getuid())']) === '0')
    throw new Error('El servicio no debe correr como root.');
  const unsafe = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      name,
      'node',
      'dist/api/cli.cjs',
      'owner:recover',
      '--username',
      'owner',
      '--password-stdin',
    ],
    { input: 'Prueba-Container-Bocha-2026!', encoding: 'utf8' },
  );
  if (unsafe.status === 0 || !unsafe.stderr.includes('está siendo utilizada'))
    throw new Error('La administración concurrente debe bloquearse.');

  const login = async () => {
    const r = await fetch(url + '/api/v1/auth/login', {
      method: 'POST',
      headers: { host: 'pos.test', origin: 'https://pos.test', 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'Prueba-Container-Bocha-2026!' }),
    });
    if (!r.ok) throw new Error('Login falló: ' + r.status + ' ' + (await r.text()));
    const setCookie = r.headers.get('set-cookie');
    if (
      !setCookie.startsWith('__Host-bocha=') ||
      !['HttpOnly', 'Secure', 'SameSite=Strict'].every((attribute) => setCookie.includes(attribute))
    )
      throw new Error('Cookie de producción insegura.');
    const data = await r.json();
    return {
      host: 'pos.test',
      origin: 'https://pos.test',
      cookie: r.headers.get('set-cookie').split(';')[0],
      'x-csrf-token': data.value.csrfToken,
      'content-type': 'application/json',
    };
  };
  let headers = await login();
  const product = await fetch(url + '/api/v1/products', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sku: 'TEST',
      barcode: '00123',
      name: 'Producto prueba',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 10000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    }),
  });
  if (!product.ok) throw new Error('CRUD falló.');
  const backup = await fetch(url + '/api/v1/backups', { method: 'POST', headers, body: '{}' });
  if (!backup.ok) throw new Error('Backup falló.');
  const backupData = await backup.json();
  const download = await fetch(url + `/api/v1/backups/${backupData.value.id}/download`, {
    headers,
  });
  if (
    !download.ok ||
    Buffer.from(await download.arrayBuffer())
      .subarray(0, 8)
      .toString() !== 'BOCHABK1'
  )
    throw new Error('Backup cifrado inválido.');
  docker(['restart', name]);
  url = 'http://127.0.0.1:' + docker(['port', name, '3000/tcp']).split(':').at(-1);
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(url + '/api/v1/health')).ok) break;
    } catch {
      /* El servicio todavía está iniciando. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  headers = await login();
  const products = await fetch(url + '/api/v1/products', { headers });
  if (!products.ok || (await products.json()).value.items.length !== 1)
    throw new Error('Persistencia después del reinicio falló.');
  console.log(
    'Docker API: usuario no root, login, CRUD, backup cifrado y persistencia verificados.',
  );
} finally {
  spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
  spawnSync('docker', ['volume', 'rm', volume], { stdio: 'ignore' });
  rmSync(directory, { recursive: true, force: true });
}
