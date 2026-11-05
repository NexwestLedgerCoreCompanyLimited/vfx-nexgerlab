function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * (3 - 2 * t);

export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const u = fade(x - ix);
  const v = fade(y - iy);
  const top = hash(ix, iy, seed) * (1 - u) + hash(ix + 1, iy, seed) * u;
  const low = hash(ix, iy + 1, seed) * (1 - u) + hash(ix + 1, iy + 1, seed) * u;
  return top * (1 - v) + low * v;
}

/** Four octaves, normalized to about 0..1. */
export function fbm(x: number, y: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    sum += valueNoise(x * freq, y * freq, seed + i * 17) * amp;
    amp /= 2;
    freq *= 2;
  }
  return sum / 0.9375;
}

export const speck = hash;
