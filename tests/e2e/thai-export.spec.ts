import { expect, test } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, stubFolderPicker } from '../helpers/app';

test('Thai export keeps the file name and works entirely in Thai', async () => {
  const out = mkdtempSync(join(tmpdir(), 'th-'));
  const { app, page } = await launch();
  await stubFolderPicker(app, [out]);
  await page.locator('canvas').first().click();
  await page.getByRole('button', { name: 'ไทย', exact: true }).click();
  await page.getByRole('searchbox').fill('เหรียญหมุน');
  await page.locator('.tile').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('เหรียญหมุน');
  await page.getByRole('button', { name: 'ส่งออกเลย' }).click();
  await page.getByRole('button', { name: 'เลือกโฟลเดอร์แล้วส่งออก' }).click();
  await expect(page.getByRole('status')).toContainText('ส่งออกแล้ว 2 ไฟล์', { timeout: 20_000 });
  expect(existsSync(join(out, 'เหรียญหมุน.png'))).toBe(true);
  expect(JSON.parse(readFileSync(join(out, 'เหรียญหมุน.json'), 'utf8')).meta.image).toBe(
    'เหรียญหมุน.png',
  );
  await app.close();
});
