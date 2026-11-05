<p align="center"><img src="docs/images/logo.png" width="180" alt="VFX NexgerLab logo"></p>

<h1 align="center">VFX NexgerLab</h1>

<p align="center">An offline pixel art VFX studio. Pick a live effect, change it, and export it into your game.</p>

<p align="center">
  <a href="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest">Download</a>
  ·
  <a href="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/actions/workflows/ci.yml"><img src="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest"><img src="https://img.shields.io/github/v/release/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab?include_prereleases" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-BSL%201.1-blue" alt="License: BSL 1.1"></a>
</p>

<p align="center">English · <a href="README.th.md">ไทย</a></p>

<p align="center"><img src="docs/images/tour.gif" width="800" alt="A tour of the app: opening effect, live library, Quick Look, and Studio"></p>

## What it does

- Opens on a live library of 244 effects in 21 categories.
- Changes palette, speed, seed, light, and options without code.
- Edits character timing: wind-up, freeze on hit, and screen shake.
- Attaches effects to your own sprites, and adds aura, glow, light, or recolor frame by frame.
- Reads simple instructions in Thai or English, and shows what it could not use.
- Exports sprite sheet + JSON, PNG sequence, GIF, APNG, and game pack ZIP, with 1, 4, 8, or 16 directions and normal maps.
- Runs offline, with no account, no API key, and no tracking.

## Download

Get the installer from [Releases](https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest). Builds are unsigned prereleases, so macOS and Windows will warn you first.

## What has been tested

- Unit tests and Electron end-to-end tests on macOS, including all 244 effects against recorded pixels.
- The packaged macOS app, opened and run through an export.
- Not yet: Windows and Linux on real machines, import into real game engines, human usability testing, and a fluent review of the Thai text.

## Development

```bash
npm ci
npm run dev
```

Electron cannot start inside some coding sandboxes, so run `npm run test:e2e` in a normal terminal.

## Project docs

[Product spec](docs/vfx-nexgerlab-product-spec.md) · [Decisions](DECISIONS.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Translating](docs/TRANSLATING.md) · [Releasing](docs/RELEASING.md) · [Security](SECURITY.md)

## Legal

The app is under the Business Source License 1.1. You can use it to make games, including paid games, and you own what you export. You cannot sell the software, offer it as a paid service, or build a competing tool with it. Each version becomes Apache-2.0 four years after its release. It is source-available, not open source.

The effect engine and library in `src/engine/pixelfx/` come from [pixelfx](https://github.com/patch-gg/pixelfx) by Patch and stay under the MIT License. See [third-party notices](THIRD_PARTY_NOTICES.md).

## Made by

<a href="https://github.com/NexwestLedgerCoreCompanyLimited"><img src="https://github.com/NexwestLedgerCoreCompanyLimited.png" width="64" alt="Nai Natthawut"></a>

Nai Natthawut, NEXWEST LEDGER CORE COMPANY LIMITED
