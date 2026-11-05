import { randomUUID } from 'node:crypto';
import { open, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  PreferencesSchema,
  defaultPreferences,
  type Language,
  type Preferences,
} from '../../shared/models/preferences';

export function createPreferencesService(dir: string) {
  const file = join(dir, 'preferences.json');
  let cached: Preferences | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  async function get(): Promise<Preferences> {
    if (cached) return cached;
    try {
      cached = PreferencesSchema.parse(JSON.parse(await readFile(file, 'utf8')));
    } catch {
      cached = defaultPreferences();
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

  // the splash and the language chooser can write together, and neither may lose the other's change
  function update(patch: Partial<Preferences>): Promise<Preferences> {
    const next = queue.then(async () => save({ ...(await get()), ...patch }));
    queue = next.catch(() => undefined);
    return next;
  }

  return {
    get,
    setLanguage: (language: Language) => update({ language, hasChosenLanguage: true }),
    markSplashSeen: () => update({ hasSeenSplash: true }),
  };
}
