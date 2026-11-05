import { z } from 'zod';

export const GamePackFileSchema = z.strictObject({
  path: z.string(),
  kind: z.enum(['whole', 'behind', 'front', 'part', 'direction', 'normal']),
  part: z.string().optional(),
  direction: z.string().optional(),
});

export const GamePackManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  app: z.literal('VFX NexgerLab'),
  name: z.string(),
  metadata: z.literal('metadata.json'),
  files: z.array(GamePackFileSchema),
});
export type GamePackFile = z.infer<typeof GamePackFileSchema>;
