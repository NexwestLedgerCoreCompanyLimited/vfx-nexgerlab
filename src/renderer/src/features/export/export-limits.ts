const MAX_PREVIEW_PIXELS = 64_000_000;

/** A preview holds every frame of every direction in memory at once. */
export function exportTooLarge(size: {
  width: number;
  height: number;
  frames: number;
  count: number;
}): boolean {
  return size.width * size.height * size.frames * size.count > MAX_PREVIEW_PIXELS;
}
