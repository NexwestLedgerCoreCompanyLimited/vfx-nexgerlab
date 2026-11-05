# Third-party notices

VFX NexgerLab is licensed under BSL 1.1, except for the material below, which keeps its own license.

## pixelfx

`src/engine/pixelfx/` is a copy of [pixelfx](https://github.com/patch-gg/pixelfx) at commit `a84159688af3ca37a4be05a0d422b94451b2e24e`. It stays under the MIT License and is not part of the BSL Licensed Work. Anyone may use the original under MIT.

- Copyright (c) 2026 Patch
- Copyright (c) 2026 Hugo Duprez. `src/core/sim.js` and effects that say so in their first lines adapt Sprite Fusion's open-source pixel art VFX.
- Copyright (c) 2026 rehan-remade. `src/core/act.js` adapts how Hollow Crown plays its skills.

The full MIT text is in `src/engine/pixelfx/LICENSE`, and details are in `src/engine/pixelfx/NOTICE.md`. The Patch Pixel font is not included.

## Fonts

All SIL Open Font License 1.1, bundled through Fontsource.

| Font           | Used for            | Copyright holder                   |
| -------------- | ------------------- | ---------------------------------- |
| Inter          | UI text             | The Inter Project Authors          |
| Noto Sans Thai | Thai UI text        | The Noto Project Authors           |
| JetBrains Mono | Values and timecode | The JetBrains Mono Project Authors |
| Pixelify Sans  | Wordmark            | The Pixelify Sans Project Authors  |

Full license texts ship in each `@fontsource` package.

## Runtime libraries

React, React DOM, Zustand, Zod, i18next, react-i18next, pngjs, gifuct-js, gifenc, and fflate are MIT licensed. Their license texts ship in each package. Electron is MIT licensed and bundles Chromium, whose notices ship with the app as `LICENSES.chromium.html`.
