import type { FrameRGBA } from '../../../engine/render-types';

/** Shows a frame at native size. CSS scales the canvas up with integer factors and no smoothing. */
export function paintFrame(canvas: HTMLCanvasElement, frame: FrameRGBA): void {
  if (canvas.width !== frame.width) canvas.width = frame.width;
  if (canvas.height !== frame.height) canvas.height = frame.height;
  const pixels = new Uint8ClampedArray(frame.pixels);
  canvas.getContext('2d')!.putImageData(new ImageData(pixels, frame.width, frame.height), 0, 0);
}
