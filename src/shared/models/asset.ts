export interface AssetFrame {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  durationMs: number;
}

export interface StripLayout {
  frameCount: number;
  fps: number;
}
