# Releasing

1. Move the changelog entries under a new `## [x.y.z]` heading.
2. Set the same version in `package.json`.
3. Run `npm run release:check -- --version x.y.z`.
4. Wait for CI on all three systems.
5. Install the packaged app on each system you have and run the smoke test: open, export, reopen.
6. Tag `vx.y.z` and push. The workflow builds installers and creates a prerelease.

Installers are unsigned, so releases stay prereleases until signing is decided and paid for.

`docs/release-evidence.json` records human gates. Do not mark them passed without observed sessions and named reviewers.

After an Electron upgrade, run `npm run golden` and review the changed hashes. Different V8 builds round a few pixels differently.
