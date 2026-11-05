import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function freshProfile(): string {
  return mkdtempSync(join(tmpdir(), 'vfxlab-'));
}

export async function launch(profile = freshProfile(), env: Record<string, string> = {}) {
  const app: ElectronApplication = await electron.launch({
    args: ['.', `--user-data-dir=${profile}`],
    env: { ...(process.env as Record<string, string>), ...env },
  });
  const page: Page = await app.firstWindow();
  return { app, page, profile };
}
