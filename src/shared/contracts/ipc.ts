import type { Language, Preferences } from '../models/preferences';

export const IPC = {
  getAppInfo: 'app:get-info',
  getPreferences: 'preferences:get',
  setLanguage: 'preferences:set-language',
  markSplashSeen: 'preferences:mark-splash-seen',
} as const;

export interface AppInfo {
  name: 'VFX NexgerLab';
  version: string;
}

export interface VfxlabApi {
  getAppInfo(): Promise<AppInfo>;
  getPreferences(): Promise<Preferences>;
  setLanguage(language: Language): Promise<Preferences>;
  markSplashSeen(): Promise<Preferences>;
}

declare global {
  interface Window {
    vfxlab: VfxlabApi;
  }
}
