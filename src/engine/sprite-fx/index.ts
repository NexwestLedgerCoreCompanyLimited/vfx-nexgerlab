import type { AssetFrame } from '../../shared/models/asset';
import type { SpriteFx } from '../../shared/schemas/project';
import { aura } from './aura';
import { glow } from './glow';
import type { SpriteFxLayer } from './layer';
import { light } from './light';
import { recolor } from './recolor';

export type { SpriteFxLayer } from './layer';

export function renderSpriteFx(
  fx: SpriteFx,
  sprite: AssetFrame,
  frameIndex: number,
): SpriteFxLayer {
  switch (fx.kind) {
    case 'aura':
      return aura(fx, sprite, frameIndex);
    case 'glow':
      return glow(fx, sprite);
    case 'light':
      return light(fx, sprite);
    case 'recolor':
      return recolor(fx, sprite);
  }
}
