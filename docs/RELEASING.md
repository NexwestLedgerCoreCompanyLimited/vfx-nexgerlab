# Releasing

1. Move the changelog entries under a new `## [x.y.z]` heading in `CHANGELOG.md`, and add the same section in `CHANGELOG.th.md`. Set the same date in `LICENSE` (Change Date is four years after the release) and the version under Licensed Work.
2. Set the same version in `package.json`.
3. Run `npm run release:check -- --version x.y.z`.
4. Wait for CI on all three systems.
5. Install the packaged app on each system you have and run the smoke test: open, export, reopen.
6. Tag `vx.y.z` and push. The workflow builds installers and creates a release for that version, marked Latest.

Installers are unsigned until signing is decided and paid for. The release notes say so.

`docs/release-evidence.json` records human gates. Do not mark them passed without observed sessions and named reviewers.

After an Electron upgrade, run `npm run golden` and review the changed hashes. Different V8 builds round a few pixels differently.
