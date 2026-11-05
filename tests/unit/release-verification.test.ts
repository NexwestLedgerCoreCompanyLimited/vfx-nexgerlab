import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRelease, renderReleaseNotes } from '../../scripts/release-lib.mjs';
import { ReleaseEvidenceSchema } from '../../src/shared/schemas/release-evidence';

const changelog = (v: string, body: string) => `# Changelog\n\n## [${v}] - 2026-11-05\n\n${body}\n`;
const good = {
  version: '0.1.0',
  packageVersion: '0.1.0',
  changelog: changelog('0.1.0', '### Added\n\n- Library.\n\n### Known Issues\n\n- Unsigned.'),
  locales: ['en', 'th'],
};

describe('checkRelease', () => {
  it('passes a matching release', () => {
    expect(checkRelease(good)).toEqual([]);
  });

  it.each([
    ['version mismatch', { ...good, packageVersion: '0.2.0' }, /package/i],
    ['missing section', { ...good, changelog: '# Changelog\n' }, /changelog/i],
    ['empty section', { ...good, changelog: changelog('0.1.0', '') }, /empty/i],
    [
      'placeholder',
      { ...good, changelog: changelog('0.1.0', '### Added\n\n- TODO') },
      /placeholder/i,
    ],
    [
      'unknown category',
      { ...good, changelog: changelog('0.1.0', '### Stuff\n\n- x') },
      /category/i,
    ],
    ['missing locale', { ...good, locales: ['en'] }, /locale/i],
  ])('fails on %s', (_n, input, message) => {
    expect(checkRelease(input).join(' ')).toMatch(message);
  });
});

describe('renderReleaseNotes', () => {
  it('uses both changelogs and states unsigned status and pending gates', () => {
    const notes = renderReleaseNotes({
      thaiChangelog: '## [0.1.0]\n\n### เพิ่มใหม่\n\n- สวัสดี\n',
      version: '0.1.0',
      changelog: good.changelog,
      sums: 'abc  app.dmg',
      signed: false,
      pendingGates: ['Thai review'],
    });
    expect(notes).toContain('### Added');
    expect(notes).toContain('abc  app.dmg');
    expect(notes).toMatch(/unsigned/i);
    expect(notes).toContain('สวัสดี');
    expect(notes).toContain('Thai review');
  });
});

describe('release evidence', () => {
  it('starts with both human gates pending', () => {
    const e = ReleaseEvidenceSchema.parse({
      usability: { status: 'pending' },
      languageReview: { status: 'pending' },
    });
    expect(e.usability.status).toBe('pending');
  });

  it('needs five observed people per language before a pass', () => {
    expect(
      ReleaseEvidenceSchema.safeParse({
        usability: { status: 'passed', en: 2, th: 5, successes: 4 },
        languageReview: { status: 'pending' },
      }).success,
    ).toBe(false);
    expect(
      ReleaseEvidenceSchema.safeParse({
        usability: { status: 'passed', en: 5, th: 5, successes: 8 },
        languageReview: { status: 'pending' },
      }).success,
    ).toBe(true);
  });
});

describe('CLI', () => {
  it('exits with an error for a wrong version', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rel-'));
    writeFileSync(join(dir, 'x'), '');
    expect(() =>
      execFileSync('node', ['scripts/verify-release.mjs', '--version', '9.9.9'], { stdio: 'pipe' }),
    ).toThrow();
  });
});
