export interface FrameRGBA {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export type BackdropKind = 'dark' | 'ground' | 'sky' | 'light' | 'black';
export type PartFilter = 'whole' | 'behind' | 'front' | { layerId: string };

export interface RenderOptions {
  partFilter: PartFilter;
  /** Adds the stock character, target, and backdrop for preview. Exports leave them out. */
  includeStage: boolean;
  backdrop?: BackdropKind;
}

export interface LayerError {
  layerId: string;
  message: string;
}

export interface RenderResult {
  frame: FrameRGBA;
  errors: LayerError[];
}
