import { ipcMain } from 'electron';
import { pathToFileURL } from 'node:url';
import { IPC } from '../shared/contracts';
import type { Result, SystemStatus } from '../shared/contracts';

export function registerSystemIpc(
  status: SystemStatus,
  rendererFile: string,
  developmentUrl?: string,
): void {
  ipcMain.handle(IPC.systemHealth, (event, ...args: unknown[]): Result<SystemStatus> => {
    const url = event.senderFrame?.url;
    const expected = developmentUrl ? new URL(developmentUrl).origin : null;
    const trusted =
      url &&
      (expected ? new URL(url).origin === expected : url === pathToFileURL(rendererFile).href);
    if (!trusted || event.senderFrame !== event.sender.mainFrame || args.length !== 0) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION',
          message: 'Solicitud no autorizada o inválida.',
          retryable: false,
        },
      };
    }
    return { ok: true, value: status };
  });
}
