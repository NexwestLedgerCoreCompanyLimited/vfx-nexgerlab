import type { AssetFrame } from '../../../../shared/models/asset';

const MAX_SIDE = 4096;

/** JPEG, WebP, BMP, and AVIF decode here, inside the sandboxed renderer, rather than in the main process. */
export async function decodeImage(bytes: Uint8Array): Promise<AssetFrame> {
  const copy = new Uint8Array(bytes);
  const bitmap = await createImageBitmap(new Blob([copy]));
  try {
    if (bitmap.width > MAX_SIDE || bitmap.height > MAX_SIDE) throw new Error('too-large');
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const rgba = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    return { width: bitmap.width, height: bitmap.height, rgba, durationMs: 100 };
  } finally {
    bitmap.close();
  }
}

/** The bytes as a browser codec writes them, for JPEG and WebP export. */
export async function encodeWithCanvas(
  frame: { width: number; height: number; pixels: Uint8ClampedArray },
  type: 'image/jpeg' | 'image/webp',
): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(frame.width, frame.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(frame.pixels), frame.width, frame.height),
    0,
    0,
  );
  if (type === 'image/jpeg') {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, frame.width, frame.height);
  }
  const blob = await canvas.convertToBlob({ type, quality: type === 'image/webp' ? 1 : 0.95 });
  return new Uint8Array(await blob.arrayBuffer());
}
