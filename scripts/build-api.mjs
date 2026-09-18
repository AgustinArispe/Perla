import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
await build({
  entryPoints: ['src/server/index.ts', 'src/server/worker.ts', 'src/server/cli.ts'],
  outdir: 'dist/api',
  outExtension: { '.js': '.cjs' },
  bundle: true,
  platform: 'node',
  target: 'node24',
  packages: 'external',
  plugins: [
    {
      name: 'sqlite-migrations',
      setup(b) {
        b.onResolve({ filter: /\.sql\?raw$/ }, (a) => ({
          path: resolve(a.resolveDir, a.path.slice(0, -4)),
          namespace: 'sql',
        }));
        b.onLoad({ filter: /.*/, namespace: 'sql' }, async (a) => ({
          contents: await readFile(a.path, 'utf8'),
          loader: 'text',
        }));
      },
    },
  ],
});
