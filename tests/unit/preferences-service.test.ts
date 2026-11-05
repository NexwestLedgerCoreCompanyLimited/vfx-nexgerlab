import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPreferencesService } from '../../src/main/services/preferences-service';

const dir = () => mkdtempSync(join(tmpdir(), 'prefs-'));

describe('preferences service', () => {
  it('starts in English on every system', async () => {
    const s = createPreferencesService(dir());
    expect(await s.get()).toMatchObject({
      language: 'en',
      hasChosenLanguage: false,
      hasSeenSplash: false,
    });
  });

  it('falls back to defaults on a corrupt file and leaves no temp file after saving', async () => {
    const d = dir();
    writeFileSync(join(d, 'preferences.json'), '{broken');
    const s = createPreferencesService(d);
    expect((await s.get()).language).toBe('en');
    await s.setLanguage('th');
    expect(JSON.parse(readFileSync(join(d, 'preferences.json'), 'utf8')).language).toBe('th');
    expect(readdirSync(d)).toEqual(['preferences.json']);
  });

  it('rejects values outside the schema', async () => {
    const d = dir();
    writeFileSync(
      join(d, 'preferences.json'),
      JSON.stringify({ schemaVersion: 1, language: 'fr' }),
    );
    expect((await createPreferencesService(d).get()).language).toBe('en');
  });

  it('records the choice and the splash', async () => {
    const d = dir();
    const s = createPreferencesService(d);
    await s.setLanguage('en');
    await s.markSplashSeen();
    expect(await createPreferencesService(d).get()).toMatchObject({
      hasChosenLanguage: true,
      hasSeenSplash: true,
    });
  });
});
