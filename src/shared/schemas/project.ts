import { z } from 'zod';

const finite = z.number().refine(Number.isFinite, 'must be finite');
const int = z.number().int();
const id = z.uuid();
const timestamp = z.iso.datetime();
const hex = /^#[0-9a-f]{6}$/i;

export const MAX_CANVAS = 1024;
export const MAX_FRAMES = 600;
export const LAYER_SPEEDS = [0.25, 0.5, 1, 2] as const;

const JsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string().max(200), finite, z.boolean(), z.null(), z.array(JsonValue).max(64)]),
);
export type JsonValue = string | number | boolean | null | JsonValue[];

export const NumberKeyframeSchema = z.strictObject({
  frame: int.min(0).max(MAX_FRAMES),
  value: finite,
  easing: z.enum(['linear', 'stepped']),
});
export type NumberKeyframe = z.infer<typeof NumberKeyframeSchema>;
const track = z.array(NumberKeyframeSchema).max(MAX_FRAMES).optional();

export const ActOverridesSchema = z.strictObject({
  windupSeconds: finite.min(0).max(2).optional(),
  hits: z
    .array(
      z.strictObject({
        index: int.min(0).max(32),
        stop: finite.min(0).max(2).optional(),
        amp: finite.min(0).max(16).optional(),
        shake: finite.min(0).max(4).optional(),
      }),
    )
    .max(32)
    .optional(),
});
export type ActOverrides = z.infer<typeof ActOverridesSchema>;

export const EffectLayerSchema = z.strictObject({
  id,
  kind: z.literal('effect'),
  effectId: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/),
  engineVersion: z.string().min(1).max(64),
  options: z.record(z.string().max(64), JsonValue),
  seed: int.min(0).max(0xffffffff),
  flip: z.boolean(),
  angle: finite,
  x: int.min(-4096).max(4096),
  y: int.min(-4096).max(4096),
  opacity: finite.min(0).max(1),
  light: finite.min(0).max(2),
  speed: z.literal(LAYER_SPEEDS),
  startFrame: int.min(0).max(MAX_FRAMES),
  visible: z.boolean(),
  blend: z.enum(['normal', 'add', 'screen', 'multiply']),
  placement: z.enum(['behind-sprite', 'in-front-sprite', 'standalone']),
  tracks: z.strictObject({ x: track, y: track, opacity: track, light: track }),
  actOverrides: ActOverridesSchema.optional(),
  actorAssetId: id.optional(),
});
export type EffectLayer = z.infer<typeof EffectLayerSchema>;

const PointSchema = z.strictObject({ x: finite, y: finite });

export const SpriteFxSchema = z.strictObject({
  id,
  kind: z.enum(['aura', 'glow', 'light', 'recolor']),
  color: z.string().regex(hex),
  strength: finite.min(0).max(1),
  placement: z.enum(['behind-sprite', 'in-front-sprite']),
});
export type SpriteFx = z.infer<typeof SpriteFxSchema>;

export const SpriteAttachmentSchema = z.strictObject({
  id,
  assetId: id,
  outputToSourceFrames: z.array(int.min(0)).min(1).max(MAX_FRAMES),
  frameAnchors: z
    .array(
      z.strictObject({ sourceFrameIndex: int.min(0), pivot: PointSchema, anchor: PointSchema }),
    )
    .max(MAX_FRAMES),
  behindPartIds: z.array(id),
  inFrontPartIds: z.array(id),
  fx: z.array(SpriteFxSchema).max(16).optional(),
});
export type SpriteAttachment = z.infer<typeof SpriteAttachmentSchema>;

const safeAssetPath = z
  .string()
  .max(512)
  .refine(
    (p) =>
      /^assets\/[^/\\:]+$/.test(p) && p.split('/').every((part) => part !== '..' && part !== '.'),
    'must stay inside assets/',
  );

export const AssetRefSchema = z.strictObject({
  id,
  originalName: z.string().min(1).max(255),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  kind: z.enum(['png', 'gif', 'sprite-strip']),
  path: safeAssetPath,
  width: int.min(1).max(4096),
  height: int.min(1).max(4096),
  frameCount: int.min(1).max(MAX_FRAMES),
  fps: int.min(1).max(60).optional(),
});
export type AssetRef = z.infer<typeof AssetRefSchema>;

export const VersionSnapshotSchema = z.strictObject({
  id,
  parentId: id.optional(),
  label: z.string().min(1).max(120),
  createdAt: timestamp,
  layers: z.array(EffectLayerSchema).max(64),
  spriteAttachments: z.array(SpriteAttachmentSchema),
});
export type VersionSnapshot = z.infer<typeof VersionSnapshotSchema>;

export const PresetDescriptorSchema = z.strictObject({
  id,
  name: z.string().min(1).max(120),
  tags: z.array(z.string().max(40)).max(32),
  layers: z.array(EffectLayerSchema).max(64),
});
export type PresetDescriptor = z.infer<typeof PresetDescriptorSchema>;

export const ComposerTurnSchema = z.strictObject({
  id,
  input: z.string().max(500),
  language: z.enum(['en', 'th']),
  recognized: z.array(JsonValue),
  unsupported: z.array(z.strictObject({ text: z.string().max(200), reason: z.string().max(64) })),
  parentTurnId: id.optional(),
  versionId: id,
  createdAt: timestamp,
});
export type ComposerTurn = z.infer<typeof ComposerTurnSchema>;

export const DirectionOverrideSchema = z.strictObject({
  angle: finite.optional(),
  palette: z.array(z.string().regex(hex)).min(1).max(32).optional(),
  speed: z.literal(LAYER_SPEEDS).optional(),
  hiddenLayers: z.array(id).optional(),
});
export type DirectionOverride = z.infer<typeof DirectionOverrideSchema>;

const unique = (ids: string[]) => new Set(ids).size === ids.length;

export const ProjectSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id,
    name: z.string().min(1).max(120),
    canvas: z.strictObject({
      width: int.min(16).max(MAX_CANVAS),
      height: int.min(16).max(MAX_CANVAS),
      background: z.union([z.literal('transparent'), z.string().regex(hex)]),
    }),
    timeline: z.strictObject({
      frames: int.min(1).max(MAX_FRAMES),
      fps: int.min(1).max(60),
      loop: z.boolean(),
    }),
    seed: int.min(0).max(0xffffffff),
    assets: z.array(AssetRefSchema).max(512),
    layers: z.array(EffectLayerSchema).max(64),
    spriteAttachments: z.array(SpriteAttachmentSchema).max(64),
    versions: z.array(VersionSnapshotSchema).min(1).max(512),
    activeVersionId: id,
    presets: z.array(PresetDescriptorSchema).max(512),
    composerHistory: z.array(ComposerTurnSchema).max(2048),
    directions: z
      .strictObject({
        count: z.literal([1, 4, 8, 16]),
        overrides: z.partialRecord(z.string().regex(/^[NSEW]{1,3}$/), DirectionOverrideSchema),
      })
      .optional(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .superRefine((p, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (!unique(p.layers.map((l) => l.id))) fail('duplicate layer id');
    if (!unique(p.assets.map((a) => a.id))) fail('duplicate asset id');
    const versions = new Set(p.versions.map((v) => v.id));
    if (versions.size !== p.versions.length) fail('duplicate version id');
    if (!versions.has(p.activeVersionId)) fail('unknown active version');
    for (const v of p.versions) if (v.parentId && !versions.has(v.parentId)) fail('unknown parent');
    for (const t of p.composerHistory) if (!versions.has(t.versionId)) fail('unknown turn version');
    const assets = new Map(p.assets.map((a) => [a.id, a]));
    for (const a of p.spriteAttachments) {
      const asset = assets.get(a.assetId);
      if (!asset) {
        fail('attachment references an unknown asset');
        continue;
      }
      const inRange = (i: number) => i < asset.frameCount;
      if (!a.outputToSourceFrames.every(inRange)) fail('attachment frame out of range');
      if (!a.frameAnchors.every((f) => inRange(f.sourceFrameIndex)))
        fail('anchor frame out of range');
    }
  });
export type ProjectV1 = z.infer<typeof ProjectSchema>;
