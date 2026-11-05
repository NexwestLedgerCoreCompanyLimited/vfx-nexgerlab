import { randomUUID } from 'node:crypto';
import { open, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  PreferencesSchema,
  defaultPreferences,
  type Language,
  type Preferences,
} from '../../shared/models/preferences';

export function createPreferencesService(dir: string, systemLocale: string) {
  const file = join(dir, 'preferences.json');
  let cached: Preferences | undefined;

  async function get(): Promise<Preferences> {
    if (cached) return cached;
    try {
      cached = PreferencesSchema.parse(JSON.parse(await readFile(file, 'utf8')));
    } catch {
      cached = defaultPreferences(systemLocale);
    }
    return cached;
  }

  async function save(next: Preferences): Promise<Preferences> {
    const tmp = `${file}.${randomUUID()}.tmp`;
    try {
      const handle = await open(tmp, 'w');
      await handle.writeFile(JSON.stringify(next, null, 2));
      await handle.sync();
      await handle.close();
      await rename(tmp, file);
    } catch (error) {
      await rm(tmp, { force: true });
      throw error;
    }
    cached = next;
    return next;
  }

  return {
    get,
    setLanguage: async (language: Language) =>
      save({ ...(await get()), language, hasChosenLanguage: true }),
    markSplashSeen: async () => save({ ...(await get()), hasSeenSplash: true }),
  };
}
