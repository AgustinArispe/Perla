import { contextBridge, ipcRenderer } from 'electron';
import type { BochaApi } from '../shared/contracts';

// Sandboxed preload is bundled as a single script. No arbitrary IPC/SQL exposure.
const api: BochaApi = {
  system: { health: () => ipcRenderer.invoke('bocha:system-health') },
};
contextBridge.exposeInMainWorld('bocha', api);
