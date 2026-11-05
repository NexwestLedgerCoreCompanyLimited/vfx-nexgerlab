import type { Direction } from '../../shared/directions';
import type { FrameRGBA } from '../render-types';

export interface SheetLayoutInput {
  frameWidth: number;
  frameHeight: number;
  frames: number;
  directions: readonly Direction[];
}

export interface SheetCell {
  x: number;
  y: number;
  frame: number;
  direction: Direction;
}

export interface SheetLayout {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
  cells: SheetCell[];
}

export function calculateSheetLayout(input: SheetLayoutInput): SheetLayout {
  const { frameWidth: w, frameHeight: h, frames, directions } = input;
  const many = directions.length > 1;
  const columns = many
    ? frames
    : Math.min(frames, Math.max(1, Math.ceil(Math.sqrt((frames * h) / w))));
  const rows = many ? directions.length : Math.ceil(frames / columns);
  const cells: SheetCell[] = [];
  directions.forEach((direction, row) => {
    for (let frame = 0; frame < frames; frame++) {
      const col = frame % columns;
      cells.push({ x: col * w, y: (row + Math.floor(frame / columns)) * h, frame, direction });
    }
  });
  return {
    frameWidth: w,
    frameHeight: h,
    columns,
    rows,
    width: columns * w,
    height: rows * h,
    cells,
  };
}

/** Copies frames into cells. Frames are never scaled, so cell and frame sizes must match. */
export function packSheet(layout: SheetLayout, frames: FrameRGBA[]): FrameRGBA {
  const { width, height, frameWidth: w, frameHeight: h } = layout;
  const pixels = new Uint8ClampedArray(width * height * 4);
  frames.forEach((frame, i) => {
    if (frame.width !== w || frame.height !== h) throw new Error('Frame does not match its cell');
    const cell = layout.cells[i]!;
    for (let y = 0; y < h; y++) {
      pixels.set(
        frame.pixels.subarray(y * w * 4, (y + 1) * w * 4),
        ((cell.y + y) * width + cell.x) * 4,
      );
    }
  });
  return { width, height, pixels };
}
