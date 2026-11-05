// node scripts/generate-release-notes.mjs --version 0.1.0 --sums SHA256SUMS.txt
import { readFileSync } from 'node:fs';
import { renderReleaseNotes } from './release-lib.mjs';

const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const evidence = JSON.parse(readFileSync('docs/release-evidence.json', 'utf8'));
const pendingGates = [];
if (evidence.usability.status === 'pending')
  pendingGates.push('Usability study with five people per language');
if (evidence.languageReview.status === 'pending')
  pendingGates.push('Fluent review of English and Thai copy');
console.log(
  renderReleaseNotes({
    version: arg('--version'),
    changelog: readFileSync('CHANGELOG.md', 'utf8'),
    thaiChangelog: readFileSync('CHANGELOG.th.md', 'utf8'),
    sums: readFileSync(arg('--sums'), 'utf8'),
    signed: false,
    pendingGates,
  }),
);
