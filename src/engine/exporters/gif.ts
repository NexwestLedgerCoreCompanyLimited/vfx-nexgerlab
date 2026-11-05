import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import type { FrameRGBA } from '../render-types';

const COLORS = 255; // one index stays free for transparency
const ALPHA_CUTOFF = 128; // GIF has on/off transparency, so soft glow is cut here
const CLEAR_FRAME = 2;

/** GIF is lossy here: 256 colors per frame and hard-edged transparency. APNG keeps every pixel. */
export function encodeGif(frames: FrameRGBA[], durationsMs: number[], loop: boolean): Uint8Array {
  if (frames.length === 0) throw new Error('No frames to encode');
  const gif = GIFEncoder();
  frames.forEach((frame, i) => {
    const { width, height, pixels } = frame;
    const palette = quantize(pixels, COLORS).slice(0, COLORS);
    const index = applyPalette(pixels, palette);
    const transparentIndex = palette.length;
    for (let p = 0; p < index.length; p++) {
      if (pixels[p * 4 + 3]! < ALPHA_CUTOFF) index[p] = transparentIndex;
    }
    gif.writeFrame(index, width, height, {
      palette: [...palette, [0, 0, 0]],
      delay: durationsMs[i]!,
      repeat: loop ? 0 : -1,
      transparent: true,
      transparentIndex,
      dispose: CLEAR_FRAME,
    });
  });
  gif.finish();
  return gif.bytes();
}
