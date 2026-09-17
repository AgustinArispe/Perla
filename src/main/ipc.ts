import { BrowserWindow, dialog, ipcMain } from 'electron';
import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isTrustedSender, validateRequest } from '../shared/requests';
import { DomainError, failure } from '../shared/errors';
import type { Result } from '../shared/contracts';
import type { WorkerClient } from './worker-client';

export function registerIpc(
  client: WorkerClient,
  rendererFile: string,
  developmentUrl?: string,
): void {
  ipcMain.handle(
    'bocha:request',
    async (event, envelope: unknown, ...extra: unknown[]): Promise<Result<unknown>> => {
      try {
        if (
          !isTrustedSender(
            event.senderFrame?.url,
            event.senderFrame === event.sender.mainFrame,
            pathToFileURL(rendererFile).href,
            developmentUrl,
          ) ||
          extra.length
        )
          throw new DomainError('VALIDATION', 'Solicitud no autorizada.');
        const request = validateRequest(envelope);
        if (request.operation === 'system.health') return client.health();
        if (request.operation === 'system.reconnect') return client.reconnect();
        if (request.operation === 'products.previewImport') {
          const permission = await client.call('internal.authorize', {
            operation: request.operation,
          });
          if (!permission.ok) return permission;
          const window = BrowserWindow.fromWebContents(event.sender);
          if (!window)
            throw new DomainError('VALIDATION', 'No se encontró la ventana de productos.');
          const selection = await dialog.showOpenDialog(window, {
            title: 'Elegir archivo de productos',
            properties: ['openFile'],
            filters: [{ name: 'Productos CSV', extensions: ['csv'] }],
          });
          const path = selection.filePaths[0];
          if (selection.canceled || !path) return { ok: true, value: null };
          if ((await stat(path)).size > 10 * 1024 * 1024)
            throw new DomainError('VALIDATION', 'El archivo supera 10 MB.');
          const bytes = await readFile(path);
          if (bytes.length > 10 * 1024 * 1024)
            throw new DomainError('VALIDATION', 'El archivo supera 10 MB.');
          let content: string;
          try {
            content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          } catch {
            throw new DomainError(
              'VALIDATION',
              'Guardá el archivo como CSV UTF-8 para conservar nombres y tildes.',
            );
          }
          return client.call('internal.importPreview', { content, sourceName: basename(path) });
        }
        return client.call(request.operation, request.payload);
      } catch (error) {
        console.error('Operación IPC fallida:', error);
        return failure(error);
      }
    },
  );
}
