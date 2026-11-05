import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function freshProfile(): string {
  return mkdtempSync(join(tmpdir(), 'vfxlab-'));
}

export async function launch(profile = freshProfile(), env: Record<string, string> = {}) {
  const app: ElectronApplication = await electron.launch({
    // set VFXLAB_APP to test a packaged app instead of the build folder
    ...(process.env.VFXLAB_APP
      ? { executablePath: process.env.VFXLAB_APP, args: [`--user-data-dir=${profile}`] }
      : { args: ['.', `--user-data-dir=${profile}`] }),
    env: { ...(process.env as Record<string, string>), ...env },
  });
  await app.evaluate(({ dialog }) => {
    // tests close dirty windows; a real message box would block app.close()
    dialog.showMessageBoxSync = (() => 0) as typeof dialog.showMessageBoxSync;
  });
  const page: Page = await app.firstWindow();
  return { app, page, profile };
}

/** Opens the render test bench, which reaches the real worker from a real Electron window. */
export async function bench() {
  const { app, page } = await launch();
  const url = await app.evaluate(({ app: a }) => `file://${a.getAppPath()}/out/renderer/e2e.html`);
  await page.goto(url);
  await page.waitForFunction(() => 'bench' in window);
  return { app, page };
}

/** page.evaluate without Playwright's deep argument types, which do not terminate on recursive JSON. */
export function run<T>(page: Page, fn: (arg: never) => T | Promise<T>, arg: unknown): Promise<T> {
  return page.evaluate(fn as never, arg as never) as Promise<T>;
}

/** Skips the splash and picks English, landing on Home. */
export async function home(page: Page) {
  await page.locator('canvas').first().click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.locator('.home').waitFor();
}

export async function stubFolderPicker(app: ElectronApplication, paths: string[]) {
  await app.evaluate(({ dialog }, list) => {
    let call = 0;
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: [list[Math.min(call++, list.length - 1)]!],
    })) as typeof dialog.showOpenDialog;
  }, paths);
}
