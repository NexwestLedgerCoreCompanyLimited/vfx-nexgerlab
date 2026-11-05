import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type VfxlabApi } from '../shared/contracts/ipc';

const api: VfxlabApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC.getAppInfo),
  getPreferences: () => ipcRenderer.invoke(IPC.getPreferences),
  setLanguage: (language) => ipcRenderer.invoke(IPC.setLanguage, language),
  markSplashSeen: () => ipcRenderer.invoke(IPC.markSplashSeen),
};

contextBridge.exposeInMainWorld('vfxlab', api);
