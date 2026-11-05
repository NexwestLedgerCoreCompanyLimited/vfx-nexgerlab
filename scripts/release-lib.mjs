const CATEGORIES = [
  'Added',
  'Changed',
  'Fixed',
  'Removed',
  'Security',
  'Documentation',
  'Translations',
  'Migration / Breaking Changes',
  'Known Issues',
];
const PLACEHOLDER = /\b(TODO|TBD|FIXME)\b|\[YOUR/;

export function changelogSection(changelog, version) {
  const start = changelog.indexOf(`## [${version}]`);
  if (start === -1) return undefined;
  const rest = changelog.slice(start + 1);
  const end = rest.indexOf('\n## [');
  return changelog.slice(start, end === -1 ? undefined : start + 1 + end).trim();
}

/** Returns what stops this release. An empty list means it may go. */
export function checkRelease({ version, packageVersion, changelog, locales }) {
  const problems = [];
  if (version !== packageVersion)
    problems.push(`package.json is ${packageVersion}, tag is ${version}`);
  for (const code of ['en', 'th']) {
    if (!locales.includes(code)) problems.push(`Missing locale ${code}`);
  }
  const section = changelogSection(changelog, version);
  if (!section) return [...problems, `CHANGELOG has no section for ${version}`];
  const headings = [...section.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
  if (headings.length === 0 || !/^- /m.test(section))
    problems.push(`CHANGELOG section ${version} is empty`);
  for (const heading of headings) {
    if (!CATEGORIES.includes(heading)) problems.push(`Unknown CHANGELOG category: ${heading}`);
  }
  if (PLACEHOLDER.test(section)) problems.push('CHANGELOG section contains a placeholder');
  return problems;
}

export function renderReleaseNotes({ version, changelog, sums, signed, pendingGates }) {
  const parts = [
    changelogSection(changelog, version)?.split('\n').slice(1).join('\n').trim() ?? '',
  ];
  if (!signed) {
    parts.push(
      '## Installation warning\n\nThis prerelease is unsigned. macOS and Windows will warn you before opening it.',
    );
  }
  if (pendingGates.length) {
    parts.push(`## Not yet verified\n\n${pendingGates.map((g) => `- ${g}`).join('\n')}`);
  }
  parts.push(`## SHA-256\n\n\`\`\`\n${sums.trim()}\n\`\`\``);
  return `${parts.join('\n\n')}\n`;
}
