import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  migrateProject,
  ProjectVersionError,
} from '../../src/shared/migrations/project-migrations';
import { ProjectSchema, type ProjectV1 } from '../../src/shared/schemas/project';

const fixture = (n: string) => join(__dirname, '../fixtures/projects', n, 'project.vfxlab.json');
const valid = (): ProjectV1 => JSON.parse(readFileSync(fixture('valid-v1'), 'utf8'));
const bad = (mutate: (p: ProjectV1) => void) => {
  const p = valid();
  mutate(p);
  return ProjectSchema.safeParse(p).success;
};
const A = '44444444-4444-4444-8444-444444444444';
const asset = {
  id: A,
  originalName: 'a.png',
  hash: 'a'.repeat(64),
  kind: 'png' as const,
  path: `assets/${'a'.repeat(64)}.png`,
  width: 24,
  height: 38,
  frameCount: 2,
};

describe('project schema', () => {
  it('round-trips a valid Thai project with effect layers', () => {
    const p = valid();
    expect(p.name).toContain('กองไฟ');
    expect(ProjectSchema.parse(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it.each([
    ['light high', (p: ProjectV1) => (p.layers[0]!.light = 2.1)],
    ['light low', (p: ProjectV1) => (p.layers[0]!.light = -0.1)],
    ['opacity', (p: ProjectV1) => (p.layers[0]!.opacity = 1.1)],
    ['speed', (p: ProjectV1) => (p.layers[0]!.speed = 3 as 1)],
    ['windup', (p: ProjectV1) => (p.layers[0]!.actOverrides = { windupSeconds: 2.5 })],
    ['effect id path', (p: ProjectV1) => (p.layers[0]!.effectId = '../../evil')],
    ['effect id url', (p: ProjectV1) => (p.layers[0]!.effectId = 'https://x.test/a.js')],
    ['NaN', (p: ProjectV1) => (p.layers[0]!.x = Number.NaN)],
    ['Infinity', (p: ProjectV1) => (p.layers[0]!.y = Number.POSITIVE_INFINITY)],
    ['non-integer x', (p: ProjectV1) => (p.layers[0]!.x = 1.5)],
    ['0 frames', (p: ProjectV1) => (p.timeline.frames = 0)],
    ['601 frames', (p: ProjectV1) => (p.timeline.frames = 601)],
    ['fps', (p: ProjectV1) => (p.timeline.fps = 61)],
    ['canvas', (p: ProjectV1) => (p.canvas.width = 1025)],
    ['small canvas', (p: ProjectV1) => (p.canvas.height = 15)],
    ['unknown active version', (p: ProjectV1) => (p.activeVersionId = A)],
    ['duplicate layer id', (p: ProjectV1) => p.layers.push({ ...p.layers[0]! })],
    ['extra field', (p: ProjectV1) => Object.assign(p, { token: 'x' })],
  ])('rejects %s', (_n, mutate) => {
    expect(bad(mutate as (p: ProjectV1) => void)).toBe(false);
  });

  it.each([
    '../secret.png',
    '/etc/passwd',
    'assets/../x.png',
    'assets\\x.png',
    'C:/x.png',
    'x.png',
  ])('rejects asset path %s', (path) => {
    expect(bad((p) => p.assets.push({ ...asset, path }))).toBe(false);
  });

  it('validates attachment references and frames', () => {
    const attachment = {
      id: '55555555-5555-4555-8555-555555555555',
      assetId: A,
      outputToSourceFrames: [0, 1, 1],
      frameAnchors: [{ sourceFrameIndex: 1, pivot: { x: 0, y: 0 }, anchor: { x: 1, y: 2 } }],
      behindPartIds: [],
      inFrontPartIds: [],
    };
    const withAsset = (p: ProjectV1) => p.assets.push(asset);
    expect(bad((p) => (withAsset(p), p.spriteAttachments.push(attachment)))).toBe(true);
    expect(bad((p) => p.spriteAttachments.push(attachment))).toBe(false);
    expect(
      bad(
        (p) => (
          withAsset(p),
          p.spriteAttachments.push({ ...attachment, outputToSourceFrames: [5] })
        ),
      ),
    ).toBe(false);
    expect(
      bad(
        (p) => (
          withAsset(p),
          p.spriteAttachments.push({
            ...attachment,
            frameAnchors: [{ ...attachment.frameAnchors[0]!, sourceFrameIndex: 9 }],
          })
        ),
      ),
    ).toBe(false);
  });

  it('keeps version lineage and Composer history', () => {
    const p = valid();
    const v = p.versions[0]!;
    const child = { ...v, id: A, parentId: v.id, label: 'Blue' };
    p.versions.push(child);
    p.composerHistory.push({
      id: '66666666-6666-4666-8666-666666666666',
      input: 'ไฟสีฟ้า',
      language: 'th',
      recognized: [],
      unsupported: [{ text: 'x', reason: 'no-palette' }],
      versionId: A,
      createdAt: p.createdAt,
    });
    expect(ProjectSchema.parse(p)).toEqual(p);
    expect(
      bad((q) => q.versions.push({ ...child, parentId: '77777777-7777-4777-8777-777777777777' })),
    ).toBe(false);
  });
});

describe('migrations', () => {
  it('reads version 1 and refuses unknown versions', () => {
    expect(migrateProject(valid()).schemaVersion).toBe(1);
    const raw = JSON.parse(readFileSync(fixture('unknown-version'), 'utf8'));
    expect(() => migrateProject(raw)).toThrow(ProjectVersionError);
  });
});
