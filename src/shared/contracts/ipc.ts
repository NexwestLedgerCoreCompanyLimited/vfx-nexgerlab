import type { Language, Preferences } from '../models/preferences';
import type { AssetFrame, StripLayout } from '../models/asset';
import type { AssetRef, ProjectV1 } from '../schemas/project';

export const IPC = {
  getAppInfo: 'app:get-info',
  getPreferences: 'preferences:get',
  setLanguage: 'preferences:set-language',
  markSplashSeen: 'preferences:mark-splash-seen',
  createProject: 'project:create',
  openProject: 'project:open',
  saveProject: 'project:save',
  recoverProject: 'project:recover',
  applyBackup: 'project:apply-backup',
  listRecentProjects: 'project:list-recent',
  removeRecentProject: 'project:remove-recent',
  pickAssetFile: 'asset:pick',
  importAsset: 'asset:import',
  readAssetFrames: 'asset:read-frames',
  removeAsset: 'asset:remove',
  exportBegin: 'export:begin',
  exportWrite: 'export:write',
  exportCommit: 'export:commit',
  exportAbort: 'export:abort',
  exportName: 'export:name',
  getMcpConfig: 'mcp:get-config',
  readPickedAsset: 'asset:read-picked',
  importAssetBytes: 'asset:import-bytes',
} as const;

export interface AppInfo {
  name: 'VFX NexgerLab';
  version: string;
}

export interface ProjectHandle {
  path: string;
  project: ProjectV1;
  missingAssets: string[];
}

export type RecoveryChoice =
  | { kind: 'primary-ok' }
  | { kind: 'backup-available'; projectName: string; updatedAt: string }
  | { kind: 'unrecoverable' };

export interface RecentProject {
  path: string;
  name: string;
  openedAt: string;
  available: boolean;
}

export interface McpConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
  outputDir: string;
}

export interface VfxlabApi {
  getAppInfo(): Promise<AppInfo>;
  getPreferences(): Promise<Preferences>;
  setLanguage(language: Language): Promise<Preferences>;
  markSplashSeen(): Promise<Preferences>;
  createProject(name: string): Promise<ProjectHandle | undefined>;
  openProject(path?: string): Promise<ProjectHandle | undefined>;
  saveProject(path: string, project: ProjectV1): Promise<void>;
  recoverProject(path: string): Promise<RecoveryChoice>;
  applyBackup(path: string): Promise<ProjectHandle>;
  listRecentProjects(): Promise<RecentProject[]>;
  removeRecentProject(path: string): Promise<void>;
  pickAssetFile(): Promise<boolean>;
  importAsset(handle: ProjectHandle, strip?: StripLayout): Promise<AssetRef>;
  readAssetFrames(path: string, ref: AssetRef): Promise<AssetFrame[]>;
  removeAsset(path: string, project: ProjectV1, assetId: string): Promise<void>;
  exportBegin(): Promise<string | undefined>;
  exportWrite(session: string, path: string, bytes: Uint8Array): Promise<void>;
  exportCommit(
    session: string,
    overwrite: boolean,
  ): Promise<{ status: 'ok' | 'exists'; files: string[] }>;
  exportAbort(session: string): Promise<void>;
  exportName(name: string): Promise<string>;
  getMcpConfig(): Promise<McpConfig>;
  readPickedAsset(): Promise<{ name: string; bytes: Uint8Array }>;
  importAssetBytes(
    handle: ProjectHandle,
    name: string,
    bytes: Uint8Array,
    strip?: StripLayout,
  ): Promise<AssetRef>;
}

declare global {
  interface Window {
    vfxlab: VfxlabApi;
  }
}
