import type { FastifyInstance } from 'fastify';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
export function registerFrontend(app: FastifyInstance, directory: string) {
  const root = resolve(directory);
  if (!existsSync(resolve(root, 'index.html'))) return;
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
  };
  app.get('/*', async (req, reply) => {
    const url = req.url.split('?')[0] ?? '/';
    if (url.startsWith('/api/'))
      return reply.code(404).send({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Ruta inexistente.', retryable: false },
      });
    let decoded: string;
    try {
      decoded = decodeURIComponent(url);
    } catch {
      return reply.code(400).send();
    }
    const path = resolve(root, decoded === '/' ? 'index.html' : '.' + decoded);
    if (!path.startsWith(root + sep) || !types[extname(path)] || !existsSync(path))
      return reply.code(404).send();
    return reply.type(types[extname(path)]!).send(readFileSync(path));
  });
}
