import { BrowserWindow, app, dialog, ipcMain, session } from 'electron';
import { join } from 'node:path';
import { IPC, type AppInfo } from '../shared/contracts/ipc';
import { LanguageSchema } from '../shared/models/preferences';
import { registerAssetIpc } from './ipc/asset-ipc';
import { registerExportIpc } from './ipc/export-ipc';
import { registerMcpIpc } from './ipc/mcp-ipc';
import { registerProjectIpc } from './ipc/project-ipc';
import { WEB_PREFERENCES } from './security';
import { nodeFileSystem } from './services/file-system-adapter';
import { createPreferencesService } from './services/preferences-service';
import { createProjectService } from './services/project-service';

const devUrl = process.env.ELECTRON_RENDERER_URL;

function denyNetwork(): void {
  const allowed = devUrl ? [devUrl, devUrl.replace(/^http/, 'ws')] : [];
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const local = /^(file|blob|data|devtools):/.test(details.url);
    callback({ cancel: !local && !allowed.some((url) => details.url.startsWith(url)) });
  });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    backgroundColor: '#0B1220',
    autoHideMenuBar: true,
    webPreferences: { ...WEB_PREFERENCES, preload: join(__dirname, '../preload/index.js') },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('will-prevent-unload', (event) => {
    const leave = dialog.showMessageBoxSync(win, {
      type: 'warning',
      message: 'You have unsaved changes.',
      buttons: ['Leave without saving', 'Keep working'],
      defaultId: 1,
      cancelId: 1,
    });
    if (leave === 0) event.preventDefault();
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit') return;
    dialog.showErrorBox(
      'VFX NexgerLab stopped',
      'The window will reload. Unsaved changes may be lost.',
    );
    win.webContents.reload();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  if (devUrl) void win.loadURL(devUrl);
  else void win.loadFile(join(__dirname, '../renderer/index.html'));
}

void app.whenReady().then(() => {
  const preferences = createPreferencesService(app.getPath('userData'));
  const info: AppInfo = { name: 'VFX NexgerLab', version: app.getVersion() };
  ipcMain.handle(IPC.getAppInfo, () => info);
  ipcMain.handle(IPC.getPreferences, () => preferences.get());
  ipcMain.handle(IPC.setLanguage, (_e, language: unknown) =>
    preferences.setLanguage(LanguageSchema.parse(language)),
  );
  ipcMain.handle(IPC.markSplashSeen, () => preferences.markSplashSeen());
  const assertKnown = registerProjectIpc(
    createProjectService({
      fs: nodeFileSystem,
      recentFile: join(app.getPath('userData'), 'recent-projects.json'),
    }),
  );
  registerAssetIpc(assertKnown);
  registerExportIpc();
  registerMcpIpc();
  denyNetwork();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
