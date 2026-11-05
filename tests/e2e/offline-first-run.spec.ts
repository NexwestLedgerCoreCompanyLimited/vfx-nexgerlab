import { expect, test } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, stubFolderPicker } from '../helpers/app';
import { pngBytes } from '../helpers/images';

test('offline first run goes from splash to every kind of output with no outside request', async () => {
  test.setTimeout(180_000);
  const parent = mkdtempSync(join(tmpdir(), 'off-'));
  const exportDir = mkdtempSync(join(tmpdir(), 'off-x-'));
  const sprite = join(mkdtempSync(join(tmpdir(), 'off-s-')), 'ฮีโร่.png');
  writeFileSync(
    sprite,
    pngBytes(16, 24, () => [120, 130, 140, 255]),
  );
  const { app, page } = await launch();
  const external: string[] = [];
  app.context().on('request', (r) => {
    if (/^(https?|wss?):/.test(r.url())) external.push(r.url());
  });
  await stubFolderPicker(app, [parent, sprite, exportDir]);

  await page.locator('canvas').first().click();
  await page.getByRole('button', { name: 'ไทย', exact: true }).click();
  await page.getByRole('searchbox').fill('กองไฟ');
  await page.locator('.tile').first().click();
  await page.getByRole('button', { name: 'เปิดใน Studio' }).click();
  await page.getByRole('button', { name: 'หยุดเล่น' }).click();

  const composer = page.getByRole('textbox', { name: 'บอกสิ่งที่อยากให้เอฟเฟกต์ทำ' });
  await composer.fill('สีฟ้า มังกร');
  await expect(page.getByText(/ไม่รู้จักคำนี้/)).toBeVisible();
  await page.getByRole('button', { name: 'ใช้เป็นเวอร์ชันใหม่' }).click();

  await page.getByRole('tab', { name: 'สไปรต์' }).click();
  await page.getByRole('button', { name: 'นำเข้าสไปรต์' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'นำเข้า' }).click();
  await page.getByRole('button', { name: 'ติดกับเอฟเฟกต์' }).click();
  await page.getByRole('button', { name: 'เพิ่มออร่า' }).click();
  await expect(page.getByRole('status')).toHaveText('บันทึกแล้ว', { timeout: 6000 });

  await page.getByRole('button', { name: 'ส่งออก', exact: true }).click();
  await page.getByRole('button', { name: /ชุดพร้อมใช้ ZIP/ }).click();
  await page.getByRole('button', { name: 'เลือกโฟลเดอร์แล้วส่งออก' }).click();
  await expect(page.getByRole('status')).toContainText('ส่งออกแล้ว', { timeout: 60_000 });

  expect(external).toEqual([]);
  const projects = readdirSync(parent);
  const file = readFileSync(join(parent, projects[0]!, 'project.vfxlab.json'), 'utf8');
  expect(file).not.toMatch(/\/Users\/|\/tmp\/|token|apiKey/i);
  expect(existsSync(join(exportDir, `${projects[0]}.zip`))).toBe(true);
  await app.close();
});
