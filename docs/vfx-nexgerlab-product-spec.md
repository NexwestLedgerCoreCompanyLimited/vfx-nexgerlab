# VFX NexgerLab Product Specification

**Status:** Proposed for implementation  
**Product:** VFX NexgerLab  
**Repository name:** `vfx-nexgerlab`  
**License:** Business Source License 1.1 (`BUSL-1.1`)  
**Primary UI languages:** English (`en`) and Thai (`th`)  
**Research basis:** `docs/research/pixellab-capability-inventory.md`

## 1. Vision

A beautiful, approachable, free desktop VFX editor for game developers, powered entirely by VFX NexgerLab's own deterministic procedural engine. A new user can describe an effect in English or Thai, attach it to a sprite, refine it with live controls, and export an engine-ready animation without an account, API key, cloud GPU, or external generation service. Advanced users get non-destructive layers, particles, keyframes, directional rendering, normal maps, and detailed manual control beyond a chat-only workflow.

**Product principle:** our own local VFX engine, with no PixelLab API or external AI dependency.

## 2. Goals and non-goals

### Goals

- Free use for game development, including monetized games, under BSL 1.1; public modifiable source with restrictions on commercial software redistribution and competing products, then automatic transition to Apache-2.0 four years after each version's release.
- Match or exceed the documented PixelLab VFX workflow and export capabilities using original technology.
- Windows, macOS, and Linux desktop support.
- One coherent workspace rather than a catalogue of disconnected tools.
- Deterministic, pixel-perfect preview/export with reusable effect assets.
- English and Thai shipped together; community-driven additional locales.
- Public GitHub development with explicit, categorized release notes.

### Non-goals for v0.1.0

- No PixelLab API, external AI provider, bundled AI key, proxy service, credit resale, or private/web-scraped API.
- No clone of PixelLab's non-VFX image, map, character, Game Builder, or MCP catalogue.
- No claim of unrestricted open-ended generative-AI understanding: the local composer exposes its supported vocabulary and parsed actions honestly.
- No accounts, cloud sync, multiplayer collaboration, or automatic update installation.
- No full raster/paint program, skeletal character animator, or video editor.
- No promise that directional rotation reconstructs unseen perspectives; per-direction overrides are available when needed.

## 3. Primary users and critical journeys

### New indie developer

Open app → select English/ไทย → describe “fire breath for 2 seconds” or “ระเบิดเป็นวงกว้าง” → inspect the parsed effect → adjust palette and timing → preview → export GIF or sprite sheet + JSON.

### Sprite-focused game developer

Import PNG/GIF/sprite strip → set frame count/FPS → attach aura behind and sparks in front → set pivot/anchor → loop preview → export layers, normal maps, and metadata.

### Advanced VFX creator

Add emitter/sprite/shape layers → edit seeded particles and keyframes → compare versions → save reusable presets in My Effects → export per-part and directional sheets with engine metadata.

### Local composer user

Open Composer → type an English or Thai instruction → see recognized effect, parts, colors, timing, and unsupported terms → apply as a new non-destructive version → refine through instructions or exact controls. No network request or hidden AI claim.

## 4. Release scope

### v0.1.0 — Complete Local VFX Studio

- Welcome screen: New Effect, Import Sprite, Open Example; first-run English/ไทย choice.
- Project create/open/save/save-as, recent projects, dirty state, atomic autosave, backup recovery.
- Canvas sizes 16–1024 px per axis, transparent/solid background, integer nearest-neighbor zoom.
- PNG import; GIF and horizontal PNG strip import with explicit frame/FPS settings.
- Sprite, emitter, and shape layers; visibility, opacity, order, behind/front placement, blend modes.
- Deterministic particles: seed, burst/rate, lifetime, position, velocity, gravity, size, rotation, color, opacity.
- Timeline: frame count 1–600, FPS 1–60, loop, play/pause, scrub, frame step, onion skin.
- Keyframes for transform, opacity, scale, color, and emitter properties; linear and stepped easing initially.
- Pivot and effect anchor; sprite attachment across imported animation frames; checkerboard and solid preview backgrounds.
- Live local controls for size, speed, colors, timing, intensity, count, spread, and direction without regeneration.
- Local English/Thai Effect Composer with visible parsed actions, conversation-style refinement history, supported-vocabulary help, and non-destructive application.
- Original procedural effect families: fire, explosions, smoke, lightning, energy orbs, magic circles, portals, healing beams, shields, shockwaves, sword slashes, hit sparks, auras, glow, lighting, recolors, projectiles, ice spikes, and bubbling effects.
- Character-attached aura, glow, light, and recolor behavior synchronized with sprite frames.
- Undo/redo with pointer-drag coalescing and at least 100 history entries.
- Version snapshots and duplicate/branch; project-scoped presets and a searchable local My Effects library.
- Directional export at 1/4/8/16 directions with explicit direction ordering, automatic 2D rotation for suitable effects, padding, and per-direction overrides.
- Locally generated normal maps from effect height/luminance with strength control, preview, and synchronized export.
- Export PNG sequence, GIF, APNG, uniform-grid PNG sheet + JSON, and layered game-pack ZIP.
- Game packs include whole effect, behind-sprite, in-front-sprite, individual parts, directions, optional normal maps, and manifest.
- Export metadata: schema version, frame rectangles, durations, FPS, loop, canvas, direction order, pivot, anchor, layer/part names, source project version.
- No-rescale padding policy; crop/pad controls are explicit.
- Fully offline operation except opening user-initiated documentation links.
- English and Thai UI, accessible keyboard navigation, reduced motion, UI scaling, and remappable shortcuts.

### v0.2.0 — Engine and interoperability expansion

- Godot and Phaser export presets after real-engine import tests.
- Expanded easing/curves, custom particle shapes, and additional procedural effect modules.
- Project style kits and shared cross-project effect-library synchronization.

### v0.3.0 — Editor integrations

- Unity importer package and metadata preset validated in a real Unity project.
- Aseprite/Pixelorama file interchange research and implementation.
- Optional locally installed model/plugin adapters only when they remain offline and require no external provider.

### Later / community-driven

- Collaborative projects, local plugin API, additional engine importers, and advanced normal-map generation.
- Additional languages through reviewed community contributions.

## 5. User experience and visual system

### Workspace

- **Top bar:** product mark, project name, save/recovery state, undo/redo, job queue when relevant, language, settings.
- **Left panel:** Assets, Layers, Templates; collapsible and keyboard accessible.
- **Center:** pixel-perfect canvas, zoom, before/after, direction view, playback controls.
- **Right panel:** contextual Inspector with Basic controls first and Advanced sections collapsed by default.
- **Bottom:** timeline, filmstrip, layer tracks, anchor controls, status/progress.
- **Composer dock:** optional local instruction panel; never the only way to create or edit an effect. It exposes recognized actions and unsupported terms rather than implying cloud AI.

A command palette is optional after core usability testing, not an MVP dependency.

### Visual language derived from the supplied logo

- Dark neutral background with cyan/violet accents; restrained glow only for focus/selection.
- Suggested tokens: `bg.canvas #080D18`, `bg.panel #101827`, `bg.raised #172235`, `accent.cyan #32E6F2`, `accent.violet #9B6CFF`, `text.primary #F3F7FC`, `text.muted #9AAAC0`, `border #26344A`, `danger #FF667D`, `warning #F6C85F`, `success #45D69E`.
- 8 px spacing grid, 10–14 px panel radius, clear 1 px boundaries, minimal shadows.
- UI font: Inter + Noto Sans Thai with local OFL-licensed font files and notices; monospace for values/timecode.
- Logo remains original artwork. Generate required app/icon sizes from the source without redrawing the brand; preserve transparency and verify small-size legibility.

### Usability and accessibility

- First successful export achievable in at most five primary actions after choosing a template.
- Basic mode hides advanced emitter/track controls; user can reveal them without changing data.
- WCAG AA contrast for text and interactive states; visible focus; no meaning conveyed by color alone.
- Minimum 1280×720 supported without clipped primary controls; panels collapse at narrower widths.
- Localized keyboard-shortcut labels; no language-specific hardcoded key bindings.
- Reduced-motion mode disables UI transitions, not the user's VFX playback unless explicitly paused.

## 6. Architecture

### Stack

- Electron 45.x, electron-vite 6.x, electron-builder 26.x.
- React 19.x, TypeScript 7.x, Vite 8.x, Zustand 5.x, Zod 4.x.
- i18next 26.x and react-i18next 17.x with ICU-compatible formatting.
- Canvas 2D + OffscreenCanvas in a Web Worker for canonical frame rendering; no GPU dependency.
- Vitest, React Testing Library, Playwright Electron E2E.
- Node.js >=24.22.0 for development/build. Exact package versions are locked only after scaffold compatibility tests; no independent major upgrades.

The versions above were observed on npm on 2026-10-30. The lockfile and compatibility test results, not this spec, define the actual shipped dependency graph.

### Process boundaries

- **Main:** file dialogs, project persistence, local asset reads, ZIP/filesystem writes, and native menus. It has no provider or generation-service integration.
- **Preload:** narrow typed IPC bridge only; no general Node or arbitrary channel exposure.
- **Renderer:** React UI, editor state, canonical render worker, preview, and export encoding.
- **Shared:** versioned project types/schemas, IPC DTOs, direction ordering, and metadata contracts.
- **Engine:** platform-neutral deterministic simulation, timeline, keyframes, history commands, effect families, local instruction parsing, sheet layout, normal maps, and metadata. No Electron or DOM imports in pure modules.

### Canonical render contract

`renderFrame(project, frameIndex, assets, options)` is the only frame renderer used by preview and export. It uses fixed-step simulation and a seeded PRNG. A project with the same schema, seed, assets, and frame index must produce the same canonical pixels regardless of playback speed or export format.

Preview uses integer nearest-neighbor scaling with smoothing disabled. Export uses the same frame pixels; it must not rerender through a separate GPU path. Directional and normal-map outputs are deterministic transforms of canonical project/frame state.

### Project storage

A project is a user-selected directory containing:

```text
ProjectName/
  project.vfxlab.json
  project.vfxlab.json.bak
  assets/
  presets/
  exports/
```

- JSON has `schemaVersion`, stable IDs, canvas/timeline, asset references, layers, keyframes, seed, and version lineage.
- Binary assets are content-hashed; original filenames and import metadata remain in JSON.
- Save uses temporary file + flush + atomic rename; the previous valid JSON becomes `.bak`.
- Autosave debounces by 1 second and never blocks playback.
- ZIP is an exchange/export format, not the live autosave format. Archive extraction rejects traversal and oversized entries.
- Project files contain only portable project-relative asset paths; no credentials, account data, or absolute host paths.

## 7. Security, privacy, and reliability

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; no remote module and no arbitrary `webContents` navigation.
- Strict CSP; no remote scripts; new windows denied; user-initiated external documentation links use an HTTPS allowlist and show their destination.
- Zod validation at IPC, project import, asset decode, and export metadata boundaries.
- The application has no token fields, analytics, tracking, cloud proxy, or runtime API dependency. Network access is denied for app content; only an explicit documentation-link action may open the system browser.
- Diagnostics are local, redacted, and explicitly exportable by the user.
- Every effect, import, save, render, and export works with networking disabled and without sign-in or metered operations.
- User confirmation before deleting projects/assets, overwriting exports, or discarding recovery data.

## 8. Internationalization and community translation

- `en` is the source locale; `th` is a required release locale, not a fallback-afterthought.
- First run offers English and ไทย; settings can change language immediately without restart.
- Namespaced JSON catalogs: `common`, `editor`, `timeline`, `export`, `settings`, `composer`, `errors`, `help`.
- No concatenated translated phrases; use ICU placeholders/plurals and localized dates/numbers.
- English fallback per missing key in development; CI rejects missing keys/placeholders in release locales.
- Tests cover key parity, placeholder parity, Thai rendering, long strings, mixed-language filenames, and pseudo-localization.
- `.github/ISSUE_TEMPLATE/translation-request.yml` collects locale code, language name, translator/reviewer contact, and contribution consent.
- `docs/TRANSLATING.md` explains catalogs, placeholders, glossary, review, and PR route. Maintainers may convert an issue submission into a PR; no language ships without core coverage and a reviewer.
- New locale PRs update `locales/manifest.json`, `THIRD_PARTY_NOTICES.md` if fonts change, and release notes under `Translations`.

## 9. GitHub, attribution, and licensing

- Proposed remote under the currently active account: `https://github.com/NexwestLedgerCoreCompanyLimited/vfx-nexgerlab` (not created by this planning task).
- Public repository; `main` protected; squash merges; Conventional Commits; GitHub Issues/PRs.
- Required root files: `LICENSE`, `README.md`, `README.th.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `THIRD_PARTY_NOTICES.md`.
- Original project code/design/templates use Business Source License 1.1 (`BUSL-1.1`), copyright `2026 JawNai and VFX NexgerLab contributors`.
- Licensor: JawNai / NexwestLedgerCoreCompanyLimited. Licensed Work: VFX NexgerLab source code, original design, and bundled original templates. Change Date: four years after each version's release; `2030-10-31` for v0.1.0. Change License: Apache License 2.0.
- Additional Use Grant permits use, copying, modification, and sharing of the Licensed Work and modifications under BSL 1.1 for learning, research, open development, and game development. This expressly includes individual, studio, and client work that creates video games or game assets for paid games, advertising-supported games, in-app purchases, subscriptions, sponsorship, and other game monetization.
- Before the Change Date, no one may sell, rent, license, sublicense, or charge for the software or its modified versions; offer it as a paid hosted service; commercially redistribute it as a development tool; or use it or its derivatives to create or operate a Competing Product. “Competing Product” means software or a service whose primary purpose is creating, editing, rendering, or exporting visual effects or substantially similar development tooling; a game containing rendered effects is not a Competing Product.
- Public source, issues, pull requests, forks, and modifications are welcome under the same BSL restrictions. Before each version's Change Date describe the project as source-available, not OSI-approved open source. No trademark rights are granted.
- Users retain ownership of imported assets and rendered exports; BSL does not relicense those outputs and expressly permits their use in monetized games. The restriction applies to commercial exploitation of the software/derivative software, not to games or assets made with it.
- Third-party dependencies and fonts retain their own licenses and notices. Contributions are accepted under BSL 1.1 including its future Change License; no claim of unconditional commercial rights is made.
- Human GitHub author uses the account-linked or GitHub-provided no-reply address. Current account identity: `Nai Natthawut` / `NexwestLedgerCoreCompanyLimited`.
- Add `Co-authored-by: Claude <noreply@anthropic.com>` only when Claude actually contributed. GitHub only links/counts a co-author when the trailer email is associated with a GitHub account; a clickable Claude profile is not guaranteed. Do not fabricate a linked identity or contribution.

## 10. Releases and CI

### Versioning

Semantic Versioning tags `vMAJOR.MINOR.PATCH`. During 0.x, any breaking project-format change still requires a migration and prominent release note. Every release corresponds to a nonempty `CHANGELOG.md` section and a Git tag matching `package.json`.

### Required release-note categories

- Added
- Changed
- Fixed
- Removed
- Security
- Documentation
- Translations
- Migration / Breaking Changes
- Known Issues

Each entry states the user-visible system added/changed, links the PR/issue, and avoids raw commit dumps. Release artifacts include SHA-256 checksums and third-party notices.

### CI/CD

- Pull requests: format/lint, typecheck, unit/schema/i18n tests, build, critical Electron E2E, dependency and secret scanning.
- Matrix build on Windows/macOS/Linux runners; actions pinned by commit SHA; least-privilege token permissions.
- Tag pipeline verifies changelog/version, reruns release tests, builds installers, publishes notes and artifacts.
- Initial unsigned artifacts must be marked prerelease with installation warnings. A stable release requires an explicit signing/notarization decision; purchasing certificates or Apple Developer membership is not assumed.
- In-app update installation is deferred until signed update metadata and rollback behavior are tested.

## 11. Verification and acceptance gates

### Domain correctness

- Deterministic frame golden tests across repeated playback/export, worker scheduling, and every bundled effect family.
- Composer tests for English/Thai effect vocabulary, colors, timing, directions, refinement, and explicit unsupported terms.
- Exact sheet rectangles, frame durations, 1/4/8/16 direction order, per-direction overrides, pivot/anchor, and no-rescale behavior.
- Normal-map fixtures verify neutral flat normals, correct gradient signs, strength bounds, alpha preservation, and synchronized frame/direction dimensions.
- Imported sprites remain synchronized across frames and appear correctly in whole/behind/front/per-part exports.
- Corrupt JSON, missing assets, unknown schema versions, interrupted save, recovery, and path traversal tests.
- Particle upper bounds, long timelines, zero/negative/NaN inputs, 1/600 frames, extreme zoom, and cancellation tests.

### End-to-end

- Offline local instruction → parsed effect → edit → preview → save → reopen → export GIF, APNG, and sheet + JSON.
- Import sprite → attach behind/front effects → autosave/recover → export game pack with parts, directions, and normal maps.
- English/Thai switch without restart; no clipped primary flow at 1280×720.
- No credentials, external requests, analytics identifiers, or service configuration in project files, renderer state, logs, diagnostics, or archives.
- Automated tests must never call PixelLab or another generation provider.

### Usability

- Five new users per primary language can create/export a basic effect without external help; target at least 4/5 success. This remains an external research gate until participants are actually observed; automated UI tests are not presented as a substitute.
- First-run and export copy reviewed by a native/fluent Thai reviewer and an English reviewer; record what was reviewed and by whom.

## 12. Major risks and decisions

| Risk | Decision / mitigation |
|---|---|
| Capability parity mistaken for copied output | Implement the documented VFX workflows with original procedural code and assets; compare capabilities, not proprietary pixels |
| Open-ended instruction expectation | Show supported vocabulary, parsed actions, and unsupported terms; never advertise unrestricted AI understanding |
| Preview/export divergence | One canonical Canvas 2D renderer |
| Pixel-art blur/cropping | Nearest-neighbor scaling, integer placement, no-rescale padding |
| Excessive particle/export memory | Schema limits, particle caps, bounded frame processing, cancellation, and local failure recovery |
| Effect-family quality regressions | Golden frames plus real preview/export inspection for every family |
| Thai/community translation drift | Key/placeholder CI, glossary, reviewer gate |
| Unsigned installers | Prerelease labels until signing/notarization is funded and tested |
| Co-author not linked to Claude profile | Honest trailer only; never invent a GitHub-linked email |

## 13. Execution assumptions

- The attached `logo.png` is approved for use in this project.
- The active GitHub account is the intended repository owner.
- The owner authorized implementation, commits, public repository creation, push, issue templates, and a GitHub release in the execution request; no purchase or signing enrollment is authorized.
- PixelLab facts describe public capability research reviewed on 2026-10-30; its service is not a runtime dependency and no further provider implementation is planned.
