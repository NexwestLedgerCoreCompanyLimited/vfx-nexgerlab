<p align="center"><img src="docs/images/logo.png" width="180" alt="VFX NexgerLab logo"></p>

<h1 align="center">VFX NexgerLab</h1>

<p align="center">An offline studio for pixel art VFX, animated characters, and game maps, that AI tools can drive.</p>

<p align="center">
  <a href="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest"><b>Download</b></a>
  ·
  <a href="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/actions/workflows/ci.yml"><img src="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest"><img src="https://img.shields.io/github/v/release/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-BSL%201.1-blue" alt="License: BSL 1.1"></a>
</p>

<p align="center">English · <a href="README.th.md">ไทย</a></p>

<p align="center"><img src="docs/images/tour.gif" width="800" alt="A tour of the app"></p>

## See it in action

The pictures show the real app with example projects.

|                                                   |                                                   |
| :------------------------------------------------ | :------------------------------------------------ |
| **Live library**                                  | **Quick Look**                                    |
| ![Live library](docs/images/screens/home.gif)     | ![Quick Look](docs/images/screens/quick-look.gif) |
| **Studio**                                        | **Export**                                        |
| ![Studio](docs/images/screens/studio.gif)         | ![Export](docs/images/screens/export.gif)         |
| **Characters**                                    | **Maps**                                          |
| ![Characters](docs/images/screens/characters.gif) | ![Maps](docs/images/screens/maps.gif)             |
| **Connect AI**                                    | **Opening effect**                                |
| ![Connect AI](docs/images/screens/connect.gif)    | ![Opening effect](docs/images/screens/splash.gif) |

## What it does

- **Effects:** a live library of 244 effects in 21 categories. Change palette, speed, seed, light, and options without code.
- **Characters:** describe a role, a color, and a weapon, and get eight animations in 1, 4, 8, or 16 directions.
- **Maps:** seeded 2D top-down, side-scroller, isometric, and 3D voxel maps, with tile painting and Wang tilesets.
- **Sprites:** attach effects to your own art, and add aura, glow, light, or recolor frame by frame.
- **AI:** a local MCP stdio server lets AI clients create effects, characters, tilesets, maps, and projects.
- **Languages:** English first, and Thai in full.
- **Private:** runs offline, with no account, no API key, and no tracking.

The generators are deterministic code, not image AI. They give repeatable results within their range, and they tell you when they do not know a word.

### File formats

|               | Formats                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------ |
| Import        | PNG, GIF, JPEG, WebP, BMP, AVIF, Aseprite                                                         |
| Export images | Sheet + JSON, PNG, JPEG, BMP, TGA, GIF, APNG, animated WebP, Aseprite, game pack ZIP, normal maps |
| Export maps   | PNG, Tiled JSON, Wang tileset, GLB, OBJ                                                           |

Photoshop, video, and engine-specific project files are not supported.

### Connect an AI client

Open **Connect AI** in the app and copy the settings into your client's MCP configuration. Files go to `~/VFX NexgerLab/MCP output`. The server uses no network and writes only inside that folder.

Tools: `list_effects`, `list_palettes`, `render_effect`, `compose_effect`, `create_character`, `create_map`, `create_tileset`, `create_project`.

## Download

Get the installer from [Releases](https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest). Each version has its own release, and the newest is marked Latest. Installers are unsigned, so macOS and Windows warn you first.

- macOS: [Apple silicon](https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest/download/VFX-NexgerLab-mac-arm64.dmg), [Intel](https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest/download/VFX-NexgerLab-mac-x64.dmg)
- Windows: [x64](https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest/download/VFX-NexgerLab-win-x64.exe)
- Linux: [AppImage](https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab/releases/latest/download/VFX-NexgerLab-linux-x86_64.AppImage)

## What has been tested

- Unit tests and Electron end-to-end tests, including all 244 effects against recorded pixels, and the MCP server through a real subprocess.
- CI runs the end-to-end tests and packaging on macOS, Windows, and Linux.
- The packaged macOS app, opened and run through an export.
- Exported files are checked by decoding them in tests. GLB and Tiled files are checked for structure.
- Not yet: installers on real Windows and Linux machines, import into real game engines, Blender, Tiled, or Aseprite, real AI clients beyond the protocol test, human usability testing, and a fluent review of the Thai text.

## Development

```bash
npm ci
npm run dev
```

Electron cannot start inside some coding sandboxes, so run `npm run test:e2e` in a normal terminal.

## Project docs

[Product spec](docs/vfx-nexgerlab-product-spec.md) · [Decisions](DECISIONS.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Translating](docs/TRANSLATING.md) · [Releasing](docs/RELEASING.md) · [Security](SECURITY.md)

## Legal

VFX NexgerLab is licensed by NEXWEST LEDGER CORE COMPANY LIMITED under the [Business Source License 1.1](LICENSE). It is free to use and the source is public, but it is not open source.

| You may                                                    | You may not                                    |
| :--------------------------------------------------------- | :--------------------------------------------- |
| Use it to make money, such as on your own paid games       | Sell it, or a changed version of it            |
| Charge clients for your work and for what you make with it | Rent it out, or charge mainly for access to it |
| Change anything, and build on it                           | Pay-to-download, bundle, or resell it          |
| Share it for free under the same license                   |                                                |
| Sell the effects, characters, maps, and games you make     |                                                |

**Each version becomes Apache License 2.0 four years after it is released.** For version 0.2.0 that happens on 2030-11-05.

Read [LICENSE](LICENSE) for the exact terms. This summary is a guide, and the license text is what counts. The effect engine in `src/engine/pixelfx/` comes from [pixelfx](https://github.com/patch-gg/pixelfx) and stays under the MIT License. See [NOTICE.md](NOTICE.md).

## Made by

<a href="https://github.com/NexwestLedgerCoreCompanyLimited"><img src="https://github.com/NexwestLedgerCoreCompanyLimited.png" alt="" width="72" align="left"></a>

**[Nai Natthawut](https://github.com/NexwestLedgerCoreCompanyLimited)**, founder of [NEXWEST LEDGER CORE](https://nexwest.co.th). Built in Thailand, with Claude.

<br clear="left">
