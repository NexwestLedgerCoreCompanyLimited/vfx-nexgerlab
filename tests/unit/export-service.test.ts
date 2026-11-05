import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createExportSession, safeExportName } from '../../src/main/services/export-service';

const dir = () => mkdtempSync(join(tmpdir(), 'exp-'));

describe('safeExportName', () => {
  it('keeps Thai and removes path characters', () => {
    expect(safeExportName('กองไฟ/ฟ้า')).toBe('กองไฟ ฟ้า');
    expect(safeExportName('..')).toBe('effect');
  });
});

describe('export session', () => {
  it('writes through a temp folder and moves files in on commit', async () => {
    const d = dir();
    const s = await createExportSession(d);
    await s.write('heal.png', new Uint8Array([1]));
    expect(existsSync(join(d, 'heal.png'))).toBe(false);
    expect(await s.commit(false)).toEqual({ status: 'ok', files: ['heal.png'] });
    expect(readdirSync(d)).toEqual(['heal.png']);
  });

  it('creates subfolders for sequences', async () => {
    const d = dir();
    const s = await createExportSession(d);
    await s.write('S/0001.png', new Uint8Array([1]));
    await s.commit(false);
    expect(existsSync(join(d, 'S/0001.png'))).toBe(true);
  });

  it('refuses to overwrite without confirmation and keeps the old file', async () => {
    const d = dir();
    writeFileSync(join(d, 'heal.png'), 'old');
    const s = await createExportSession(d);
    await s.write('heal.png', new Uint8Array([1]));
    expect(await s.commit(false)).toEqual({ status: 'exists', files: ['heal.png'] });
    expect(readFileSync(join(d, 'heal.png'), 'utf8')).toBe('old');
    expect(await s.commit(true)).toEqual({ status: 'ok', files: ['heal.png'] });
    expect(readFileSync(join(d, 'heal.png'))[0]).toBe(1);
  });

  it('removes partial output on abort and leaves existing files alone', async () => {
    const d = dir();
    writeFileSync(join(d, 'keep.png'), 'x');
    const s = await createExportSession(d);
    await s.write('new.png', new Uint8Array([1]));
    await s.abort();
    expect(readdirSync(d)).toEqual(['keep.png']);
  });

  it.each(['../evil.png', '/etc/x.png', 'a/../../b.png', 'a\\b.png', ''])(
    'rejects the path %s',
    async (path) => {
      const s = await createExportSession(dir());
      await expect(s.write(path, new Uint8Array([1]))).rejects.toThrow();
    },
  );
});
