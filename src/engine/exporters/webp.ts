const FOURCC = (b: Uint8Array, at: number) => String.fromCharCode(...b.subarray(at, at + 4));
const INFINITE = 0;
const HAS_ANIMATION_AND_ALPHA = 0x12;

function chunk(tag: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + data.length + (data.length & 1));
  out.set(new TextEncoder().encode(tag));
  new DataView(out.buffer).setUint32(4, data.length, true);
  out.set(data, 8);
  return out;
}

const u24 = (out: Uint8Array, at: number, v: number) => {
  out[at] = v & 255;
  out[at + 1] = (v >> 8) & 255;
  out[at + 2] = (v >> 16) & 255;
};

/** The image chunks inside a still WebP, which is what an ANMF frame holds. */
function imageChunks(file: Uint8Array): Uint8Array {
  if (file.length < 20 || FOURCC(file, 0) !== 'RIFF' || FOURCC(file, 8) !== 'WEBP')
    throw new Error('Not a WebP image');
  const parts: Uint8Array[] = [];
  const v = new DataView(file.buffer, file.byteOffset, file.byteLength);
  for (let at = 12; at + 8 <= file.length;) {
    const size = v.getUint32(at + 4, true);
    const end = at + 8 + size + (size & 1);
    if (['ALPH', 'VP8 ', 'VP8L'].includes(FOURCC(file, at)))
      parts.push(file.subarray(at, Math.min(end, file.length)));
    at = end;
  }
  if (parts.length === 0) throw new Error('Not a WebP image');
  return join(parts);
}

function join(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Joins still WebP files, as a canvas encodes them, into one animated WebP. */
export function assembleAnimatedWebp(
  stills: Uint8Array[],
  durationsMs: number[],
  width: number,
  height: number,
  loop: boolean,
): Uint8Array {
  const vp8x = new Uint8Array(10);
  vp8x[0] = HAS_ANIMATION_AND_ALPHA;
  u24(vp8x, 4, width - 1);
  u24(vp8x, 7, height - 1);
  const anim = new Uint8Array(6);
  new DataView(anim.buffer).setUint16(4, loop ? INFINITE : 1, true);
  const frames = stills.map((still, i) => {
    const image = imageChunks(still);
    const data = new Uint8Array(16 + image.length);
    u24(data, 6, width - 1);
    u24(data, 9, height - 1);
    u24(data, 12, durationsMs[i]!);
    data.set(image, 16);
    return chunk('ANMF', data);
  });
  const body = join([
    new TextEncoder().encode('WEBP'),
    chunk('VP8X', vp8x),
    chunk('ANIM', anim),
    ...frames,
  ]);
  const out = new Uint8Array(8 + body.length);
  out.set(new TextEncoder().encode('RIFF'));
  new DataView(out.buffer).setUint32(4, body.length, true);
  out.set(body, 8);
  return out;
}
