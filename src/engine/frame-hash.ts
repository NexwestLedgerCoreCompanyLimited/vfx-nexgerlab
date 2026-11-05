/** FNV-1a, so Node and Chromium tests can compare frames without a crypto API. */
export function hashPixels(pixels: Uint8ClampedArray | Uint8Array): string {
  let h = 0x811c9dc5;
  let g = 0xcbf29ce4;
  for (let i = 0; i < pixels.length; i++) {
    h = Math.imul(h ^ pixels[i]!, 0x01000193);
    g = Math.imul(g ^ pixels[pixels.length - 1 - i]!, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0') + (g >>> 0).toString(16).padStart(8, '0');
}
