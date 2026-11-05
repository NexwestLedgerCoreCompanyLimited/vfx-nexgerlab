import { tileColor, TILES, type GameMap } from './map';

export interface VoxelMesh {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

const LEVEL = 0.25;

/** One box per tile, with only the faces that can be seen. Height comes from the map. */
export function buildVoxelMesh(map: GameMap): VoxelMesh {
  const { width: w, height: h, tiles, heights } = map;
  const water = TILES.indexOf('water');
  const top = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    const i = y * w + x;
    return tiles[i] === water ? 0.25 : heights[i]! * LEVEL;
  };
  const position: number[] = [];
  const normal: number[] = [];
  const color: number[] = [];
  const index: number[] = [];
  const quad = (p: number[][], n: number[], c: number[]) => {
    const base = position.length / 3;
    for (const v of p) {
      position.push(...v);
      normal.push(...n);
      color.push(...c);
    }
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const z = top(x, y);
      const c = tileColor(tiles[y * w + x]!).map((v) => v / 255);
      const side = c.map((v) => v * 0.7);
      quad(
        [
          [x, z, y + 1],
          [x + 1, z, y + 1],
          [x + 1, z, y],
          [x, z, y],
        ],
        [0, 1, 0],
        c,
      );
      const west = top(x - 1, y);
      if (west < z)
        quad(
          [
            [x, west, y],
            [x, west, y + 1],
            [x, z, y + 1],
            [x, z, y],
          ],
          [-1, 0, 0],
          side,
        );
      const east = top(x + 1, y);
      if (east < z)
        quad(
          [
            [x + 1, east, y + 1],
            [x + 1, east, y],
            [x + 1, z, y],
            [x + 1, z, y + 1],
          ],
          [1, 0, 0],
          side,
        );
      const north = top(x, y - 1);
      if (north < z)
        quad(
          [
            [x + 1, north, y],
            [x, north, y],
            [x, z, y],
            [x + 1, z, y],
          ],
          [0, 0, -1],
          side,
        );
      const south = top(x, y + 1);
      if (south < z)
        quad(
          [
            [x, south, y + 1],
            [x + 1, south, y + 1],
            [x + 1, z, y + 1],
            [x, z, y + 1],
          ],
          [0, 0, 1],
          side,
        );
    }
  }
  return {
    positions: Float32Array.from(position),
    normals: Float32Array.from(normal),
    colors: Float32Array.from(color),
    indices: Uint32Array.from(index),
  };
}

const FLOAT = 5126;
const UINT = 5125;
const ARRAY_BUFFER = 34962;
const ELEMENT_BUFFER = 34963;

function bounds(values: Float32Array) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < values.length; i++) {
    min[i % 3] = Math.min(min[i % 3]!, values[i]!);
    max[i % 3] = Math.max(max[i % 3]!, values[i]!);
  }
  return { min, max };
}

/** A binary glTF 2.0 file with vertex colors, which Blender, Godot, Unity, and three.js can read. */
export function encodeGlb(mesh: VoxelMesh): Uint8Array {
  const parts = [mesh.positions, mesh.normals, mesh.colors, mesh.indices];
  const offsets: number[] = [];
  let total = 0;
  for (const part of parts) {
    offsets.push(total);
    total += part.byteLength;
  }
  const vertices = mesh.positions.length / 3;
  const view = (i: number, target: number) => ({
    buffer: 0,
    byteOffset: offsets[i],
    byteLength: parts[i]!.byteLength,
    target,
  });
  const json = {
    asset: { version: '2.0', generator: 'VFX NexgerLab' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'map' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3 }] }],
    buffers: [{ byteLength: total }],
    bufferViews: [
      view(0, ARRAY_BUFFER),
      view(1, ARRAY_BUFFER),
      view(2, ARRAY_BUFFER),
      view(3, ELEMENT_BUFFER),
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: FLOAT,
        count: vertices,
        type: 'VEC3',
        ...bounds(mesh.positions),
      },
      { bufferView: 1, componentType: FLOAT, count: vertices, type: 'VEC3' },
      { bufferView: 2, componentType: FLOAT, count: vertices, type: 'VEC3' },
      { bufferView: 3, componentType: UINT, count: mesh.indices.length, type: 'SCALAR' },
    ],
  };
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = (text.length + 3) & ~3;
  const out = new Uint8Array(12 + 8 + jsonLength + 8 + total);
  const data = new DataView(out.buffer);
  out.set(new TextEncoder().encode('glTF'));
  data.setUint32(4, 2, true);
  data.setUint32(8, out.length, true);
  data.setUint32(12, jsonLength, true);
  data.setUint32(16, 0x4e4f534a, true);
  out.fill(0x20, 20, 20 + jsonLength);
  out.set(text, 20);
  const bin = 20 + jsonLength;
  data.setUint32(bin, total, true);
  data.setUint32(bin + 4, 0x004e4942, true);
  parts.forEach((part, i) =>
    out.set(new Uint8Array(part.buffer, part.byteOffset, part.byteLength), bin + 8 + offsets[i]!),
  );
  return out;
}

export function encodeObj(mesh: VoxelMesh): string {
  const lines = ['# VFX NexgerLab voxel map, with vertex colors'];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const [x, y, z] = mesh.positions.subarray(i, i + 3);
    const [r, g, b] = mesh.colors.subarray(i, i + 3);
    lines.push(`v ${x} ${y} ${z} ${r!.toFixed(3)} ${g!.toFixed(3)} ${b!.toFixed(3)}`);
  }
  for (let i = 0; i < mesh.indices.length; i += 3) {
    lines.push(`f ${mesh.indices[i]! + 1} ${mesh.indices[i + 1]! + 1} ${mesh.indices[i + 2]! + 1}`);
  }
  return `${lines.join('\n')}\n`;
}
