import { expect, it } from 'vitest';
import { ScanQueue } from '../../src/domain/scan-queue';
it('cola preserva orden, repetidos son legítimos y un error no pierde lo que sigue', async () => {
  const captured: string[] = [];
  let release: () => void = () => {};
  const first = new Promise<void>((resolve) => (release = resolve));
  const queue = new ScanQueue(async (code, current) => {
    if (code === 'A') await first;
    if (!current()) return;
    if (code === 'BAD') throw new Error('Desconocido');
    captured.push(code);
  });
  const a = queue.enqueue('A');
  const b = queue.enqueue('B');
  release();
  await Promise.all([a, b]);
  await queue.enqueue('B');
  await expect(queue.enqueue('BAD')).rejects.toThrow('Desconocido');
  await queue.enqueue('C');
  expect(captured).toEqual(['A', 'B', 'B', 'C']);
  expect(queue.pending).toBe(0);
});
it('cancelar descarta cola y lookup en curso sin agregar después de salir', async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const added: string[] = [];
  const queue = new ScanQueue(async (code, current) => {
    await gate;
    if (current()) added.push(code);
  });
  const a = queue.enqueue('A'),
    b = queue.enqueue('B');
  queue.cancel();
  release();
  await Promise.all([a, b]);
  expect(added).toEqual([]);
});
