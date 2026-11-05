// Writes the license text of everything bundled into the app, because the packaged
// app holds only the compiled output, not these packages' own license files.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGES = [
  'react',
  'react-dom',
  'scheduler',
  'use-sync-external-store',
  'zustand',
  'zod',
  'i18next',
  'react-i18next',
  'html-parse-stringify',
  'pngjs',
  'gifuct-js',
  'js-binary-schema-parser',
  'gifenc',
  'fflate',
];
const FONTS = ['inter', 'noto-sans-thai', 'jetbrains-mono', 'pixelify-sans'];

const license = (dir) => {
  for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
    try {
      return readFileSync(join(dir, name), 'utf8').trim();
    } catch {
      // try the next spelling
    }
  }
  throw new Error(`No license file in ${dir}`);
};

const sections = [
  ['pixelfx (src/engine/pixelfx)', license('src/engine/pixelfx')],
  ...PACKAGES.map((name) => [name, license(join('node_modules', name))]),
  ...FONTS.map((name) => [`@fontsource/${name}`, license(join('node_modules/@fontsource', name))]),
];
const text = sections.map(
  ([name, body]) => `${'='.repeat(72)}\n${name}\n${'='.repeat(72)}\n\n${body}\n`,
);
writeFileSync('THIRD_PARTY_LICENSES.txt', `${text.join('\n')}`);
