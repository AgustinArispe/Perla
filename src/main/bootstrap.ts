import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import type { SystemStatus } from '../shared/contracts';
import { registerIpc } from './ipc';
import { WorkerClient } from './worker-client';

app.setName('PerlaNegraPOS');
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
let client: WorkerClient | undefined;
let shuttingDown = false;
const developmentUrl = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL;
const rendererFile = join(__dirname, '../renderer/index.html');

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    show: !process.env.BOCHA_TEST_USER_DATA,
    backgroundColor: '#f7f8f5',
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
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  if (developmentUrl) void window.loadURL(developmentUrl);
  else void window.loadFile(rendererFile);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  void app.whenReady().then(() => {
    client = new WorkerClient(
      join(__dirname, 'database-worker.js'),
      join(app.getPath('userData'), 'data', 'bocha.sqlite'),
      app.getVersion(),
      environment,
    );
    registerIpc(client, rendererFile, developmentUrl);
    void client.start();
    createWindow();
    app.on('activate', () => {
      if (!BrowserWindow.getAllWindows().length) createWindow();
    });
  });
  app.on('before-quit', (event) => {
    if (!shuttingDown && client) {
      event.preventDefault();
      shuttingDown = true;
      void client.stop().finally(() => app.quit());
    }
  });
}
app.on('window-all-closed', () => app.quit());
