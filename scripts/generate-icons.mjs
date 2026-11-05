// Builds app icons and the UI logo from the source artwork. The source stays untouched.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const source = PNG.sync.read(readFileSync('assets/brand/logo-source.png'));

function boxResize(src, w, h) {
  const out = new Float64Array(w * h * 4);
  const weight = new Float64Array(w * h);
  for (let y = 0; y < src.height; y++) {
    const dy = Math.min(h - 1, Math.floor((y * h) / src.height));
    for (let x = 0; x < src.width; x++) {
      const dx = Math.min(w - 1, Math.floor((x * w) / src.width));
      const i = (y * src.width + x) * 4;
      const a = src.data[i + 3] / 255;
      const o = (dy * w + dx) * 4;
      out[o] += src.data[i] * a;
      out[o + 1] += src.data[i + 1] * a;
      out[o + 2] += src.data[i + 2] * a;
      out[o + 3] += a;
      weight[dy * w + dx] += 1;
    }
  }
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) {
    const a = out[i * 4 + 3];
    for (let c = 0; c < 3; c++) png.data[i * 4 + c] = a ? out[i * 4 + c] / a : 0;
    png.data[i * 4 + 3] = weight[i] ? (a / weight[i]) * 255 : 0;
  }
  return png;
}

function squareIcon(size) {
  const w = size;
  const h = Math.round((size * source.height) / source.width);
  const art = boxResize(source, w, h);
  const png = new PNG({ width: size, height: size });
  art.bitblt(png, 0, 0, w, h, 0, Math.floor((size - h) / 2));
  return png;
}

mkdirSync('assets/icons', { recursive: true });
for (const size of [16, 32, 64, 256, 512, 1024]) {
  writeFileSync(`assets/icons/icon-${size}.png`, PNG.sync.write(squareIcon(size)));
}
mkdirSync('src/renderer/src/assets', { recursive: true });
writeFileSync('src/renderer/src/assets/logo.png', PNG.sync.write(boxResize(source, 768, 512)));
