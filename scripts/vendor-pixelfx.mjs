// Copies the pinned pixelfx commit into src/engine/pixelfx.
// Usage: node scripts/vendor-pixelfx.mjs <path to a clone of patch-gg/pixelfx>
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const COMMIT = 'a84159688af3ca37a4be05a0d422b94451b2e24e';
const TARGET = 'src/engine/pixelfx';
const FORBIDDEN = /\.(woff2?|ttf|otf)$|^gallery$/i;

const clone = process.argv[2];
if (!clone) throw new Error('Give the path to a pixelfx clone');
const head = execFileSync('git', ['-C', clone, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (head !== COMMIT) throw new Error(`Expected ${COMMIT}, found ${head}`);

function assertClean(dir) {
  for (const name of readdirSync(dir)) {
    if (FORBIDDEN.test(name)) throw new Error(`Refusing to vendor ${join(dir, name)}`);
    if (statSync(join(dir, name)).isDirectory()) assertClean(join(dir, name));
  }
}

for (const dir of ['src/core', 'src/fx']) {
  assertClean(join(clone, dir));
  mkdirSync(join(TARGET, dir), { recursive: true });
  cpSync(join(clone, dir), join(TARGET, dir), { recursive: true });
}
for (const file of ['LICENSE', 'NOTICE.md']) cpSync(join(clone, file), join(TARGET, file));
if (existsSync(join(TARGET, 'gallery'))) throw new Error('gallery must not be vendored');
console.log(`Vendored pixelfx ${COMMIT}`);
