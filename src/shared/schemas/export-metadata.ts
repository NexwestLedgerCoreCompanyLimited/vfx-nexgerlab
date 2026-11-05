import { z } from 'zod';

const Rect = z.strictObject({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });
const Size = z.strictObject({ w: z.number(), h: z.number() });

export const ExportMetadataSchema = z.strictObject({
  frames: z.array(
    z.strictObject({
      filename: z.string(),
      frame: Rect,
      rotated: z.literal(false),
      trimmed: z.literal(false),
      spriteSourceSize: Rect,
      sourceSize: Size,
      duration: z.number().int().positive(),
      direction: z.string(),
      index: z.number().int().min(0),
    }),
  ),
  meta: z.strictObject({
    app: z.literal('VFX NexgerLab'),
    version: z.literal('1'),
    image: z.string(),
    format: z.literal('RGBA8888'),
    size: Size,
    scale: z.literal('1'),
    vfxlab: z.strictObject({
      schemaVersion: z.literal(1),
      fps: z.number(),
      loop: z.boolean(),
      frames: z.number().int(),
      canvas: z.tuple([z.number(), z.number()]),
      pivot: z.tuple([z.number(), z.number()]),
      anchor: z.tuple([z.number(), z.number()]),
      directions: z.strictObject({ count: z.number(), order: z.array(z.string()) }),
      layers: z.array(z.strictObject({ id: z.string(), effectId: z.string() })),
      source: z.strictObject({ projectId: z.string(), versionId: z.string() }),
      act: z
        .strictObject({
          windup: z.number(),
          recovery: z.number(),
          hits: z.array(
            z.strictObject({
              t: z.number(),
              freeze: z.number(),
              shake: z.number(),
              amp: z.number(),
            }),
          ),
        })
        .optional(),
    }),
  }),
});
export type ExportMetadataV1 = z.infer<typeof ExportMetadataSchema>;
