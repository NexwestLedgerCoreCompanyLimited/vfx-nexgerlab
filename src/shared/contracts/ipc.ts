import type { Language, Preferences } from '../models/preferences';
import type { ProjectV1 } from '../schemas/project';

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
}

declare global {
  interface Window {
    vfxlab: VfxlabApi;
  }
}
