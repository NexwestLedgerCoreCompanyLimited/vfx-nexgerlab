import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { PNG } from 'pngjs';

export function pngBytes(w: number, h: number, paint: (x: number, y: number) => number[]): Buffer {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) png.data.set(paint(x, y), (y * w + x) * 4);
  }
  return PNG.sync.write(png);
}

export function gifBytes(w: number, h: number, colors: number[][], delay = 100): Buffer {
  const gif = GIFEncoder();
  for (const c of colors) {
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) rgba.set(c, i * 4);
    const palette = quantize(rgba, 16);
    gif.writeFrame(applyPalette(rgba, palette), w, h, { palette, delay });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}
