import { BrowserWindow, app, ipcMain, session } from 'electron';
import { join } from 'node:path';
import { IPC, type AppInfo } from '../shared/contracts/ipc';
import { LanguageSchema } from '../shared/models/preferences';
import { WEB_PREFERENCES } from './security';
import { createPreferencesService } from './services/preferences-service';

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
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  if (devUrl) void win.loadURL(devUrl);
  else void win.loadFile(join(__dirname, '../renderer/index.html'));
}

void app.whenReady().then(() => {
  const preferences = createPreferencesService(app.getPath('userData'), app.getLocale());
  const info: AppInfo = { name: 'VFX NexgerLab', version: app.getVersion() };
  ipcMain.handle(IPC.getAppInfo, () => info);
  ipcMain.handle(IPC.getPreferences, () => preferences.get());
  ipcMain.handle(IPC.setLanguage, (_e, language: unknown) =>
    preferences.setLanguage(LanguageSchema.parse(language)),
  );
  ipcMain.handle(IPC.markSplashSeen, () => preferences.markSplashSeen());
  denyNetwork();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
