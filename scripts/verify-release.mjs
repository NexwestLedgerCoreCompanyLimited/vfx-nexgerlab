// npm run release:check -- --version 0.1.0
import { readFileSync, readdirSync } from 'node:fs';
import { checkRelease } from './release-lib.mjs';

const flag = process.argv.indexOf('--version');
const version = process.argv[flag + 1];
if (flag === -1 || !version) throw new Error('Pass --version <version>');
const problems = checkRelease({
  version,
  packageVersion: JSON.parse(readFileSync('package.json', 'utf8')).version,
  changelog: readFileSync('CHANGELOG.md', 'utf8'),
  locales: readdirSync('src/renderer/src/locales', { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name),
});
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Release ${version} is ready`);
