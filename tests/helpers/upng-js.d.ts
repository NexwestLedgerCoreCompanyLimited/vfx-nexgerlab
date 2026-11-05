declare module 'upng-js' {
  const UPNG: {
    encode(
      frames: ArrayBuffer[],
      w: number,
      h: number,
      colors: number,
      delays?: number[],
    ): ArrayBuffer;
    decode(buffer: ArrayBuffer): {
      width: number;
      height: number;
      frames: Array<{ delay: number }>;
    };
    toRGBA8(image: unknown): ArrayBuffer[];
  };
  export default UPNG;
}
