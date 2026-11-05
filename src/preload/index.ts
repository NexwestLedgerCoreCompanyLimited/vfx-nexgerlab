import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type VfxlabApi } from '../shared/contracts/ipc';

const api: VfxlabApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC.getAppInfo),
  getPreferences: () => ipcRenderer.invoke(IPC.getPreferences),
  setLanguage: (language) => ipcRenderer.invoke(IPC.setLanguage, language),
  markSplashSeen: () => ipcRenderer.invoke(IPC.markSplashSeen),
  createProject: (name) => ipcRenderer.invoke(IPC.createProject, name),
  openProject: (path) => ipcRenderer.invoke(IPC.openProject, path),
  saveProject: (path, project) => ipcRenderer.invoke(IPC.saveProject, path, project),
  recoverProject: (path) => ipcRenderer.invoke(IPC.recoverProject, path),
  applyBackup: (path) => ipcRenderer.invoke(IPC.applyBackup, path),
  listRecentProjects: () => ipcRenderer.invoke(IPC.listRecentProjects),
  removeRecentProject: (path) => ipcRenderer.invoke(IPC.removeRecentProject, path),
  pickAssetFile: () => ipcRenderer.invoke(IPC.pickAssetFile),
  importAsset: (handle, strip) => ipcRenderer.invoke(IPC.importAsset, handle, strip),
  readAssetFrames: (path, ref) => ipcRenderer.invoke(IPC.readAssetFrames, path, ref),
  removeAsset: (path, project, id) => ipcRenderer.invoke(IPC.removeAsset, path, project, id),
  exportBegin: () => ipcRenderer.invoke(IPC.exportBegin),
  exportWrite: (session, path, bytes) => ipcRenderer.invoke(IPC.exportWrite, session, path, bytes),
  exportCommit: (session, overwrite) => ipcRenderer.invoke(IPC.exportCommit, session, overwrite),
  exportAbort: (session) => ipcRenderer.invoke(IPC.exportAbort, session),
  exportName: (name) => ipcRenderer.invoke(IPC.exportName, name),
  getMcpConfig: () => ipcRenderer.invoke(IPC.getMcpConfig),
  readPickedAsset: () => ipcRenderer.invoke(IPC.readPickedAsset),
  importAssetBytes: (handle, name, bytes, strip) =>
    ipcRenderer.invoke(IPC.importAssetBytes, handle, name, bytes, strip),
};

contextBridge.exposeInMainWorld('vfxlab', api);
