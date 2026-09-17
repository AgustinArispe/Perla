import { app, BrowserWindow, dialog } from 'electron';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { SystemStatusSchema } from '../shared/contracts';
import type { SystemStatus } from '../shared/contracts';
import { registerSystemIpc } from './ipc';

app.setName('ElBochaPOS');
const environment: SystemStatus['environment'] = process.env.BOCHA_TEST_USER_DATA
  ? 'test'
  : app.isPackaged
    ? 'production'
    : 'development';
app.setPath(
  'userData',
  process.env.BOCHA_TEST_USER_DATA ??
    join(app.getPath('appData'), environment === 'production' ? 'ElBochaPOS' : 'ElBochaPOS-dev'),
);
mkdirSync(app.getPath('userData'), { recursive: true });

let worker: Worker | undefined;
let status: SystemStatus;
const developmentUrl = process.env.ELECTRON_RENDERER_URL;
const rendererFile = join(__dirname, '../renderer/index.html');

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    show: process.env.BOCHA_TEST_USER_DATA === undefined,
    backgroundColor: '#fafbf9',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  if (!app.isPackaged && developmentUrl) void window.loadURL(developmentUrl);
  else void window.loadFile(rendererFile);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  void app
    .whenReady()
    .then(async () => {
      worker = new Worker(join(__dirname, 'database-worker.js'), {
        workerData: { databasePath: join(app.getPath('userData'), 'data', 'bocha.sqlite') },
      });
      const result: unknown = await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('SQLite no respondió al iniciar.')),
          15_000,
        );
        worker?.once('message', (message: unknown) => {
          clearTimeout(timer);
          resolve(message);
        });
        worker?.once('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
        worker?.once('exit', (code) => {
          clearTimeout(timer);
          reject(new Error(`SQL terminó al iniciar: ${code}`));
        });
      });
      status = SystemStatusSchema.parse({
        ...(result as object),
        applicationVersion: app.getVersion(),
        environment,
      });
      registerSystemIpc(status, rendererFile, app.isPackaged ? undefined : developmentUrl);
      worker.on('error', (error) => {
        console.error(error);
        dialog.showErrorBox(
          'El Bocha',
          'Se interrumpió la conexión con los datos. Cerrá y abrí la aplicación.',
        );
        app.quit();
      });
      createWindow();
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
    })
    .catch((error: unknown) => {
      console.error(error);
      dialog.showErrorBox(
        'No se pudo abrir El Bocha',
        'No se pudo iniciar la base de datos. Los datos existentes se conservan. Revisá el espacio disponible y los permisos.',
      );
      app.quit();
    });
}
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  worker?.postMessage('close');
});
