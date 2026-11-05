# VFX NexgerLab Local Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publicly release VFX NexgerLab v0.1.0, a secure fully offline Electron VFX editor that opens on a live library of 244 vendored pixelfx effects, with an original opening effect, Quick Look, an act timeline, an honest English/Thai Effect Composer, sprite attachment, non-destructive versions, directional rendering, local normal maps, and game-ready exports.

**Architecture:** Electron main owns privileged filesystem/native operations; preload exposes a narrow typed bridge; React owns the editor UI; one OffscreenCanvas worker owns canonical frame rendering for preview and every export by driving vendored pixelfx. Pure TypeScript engine modules own schemas, the effect registry, history, Composer parsing, sprite effects, direction ordering, sheet layout, normal maps, and metadata so they can be tested without Electron.

**Tech Stack:** Electron 45.x, electron-vite 6.x, electron-builder 26.x, React 19.x, TypeScript 7.x, Vite 8.x, Zustand 5.x, Zod 4.x, i18next 26.x, react-i18next 17.x, Canvas 2D/OffscreenCanvas, vendored pixelfx 0.3.0 (MIT, commit `a84159688af3ca37a4be05a0d422b94451b2e24e`), Vitest, React Testing Library, Playwright, `pngjs`, `gifuct-js`, `gifenc`, `upng-js`, `fflate`.

**Spec:** `docs/superpowers/specs/2026-11-05-pixelfx-studio-redesign-design.md` (wins on conflict), `docs/vfx-nexgerlab-product-spec.md`; design canvas: https://claude.ai/artifact/Gr7is8AcbNgmbDNkRNWuSE; research context: `docs/research/pixellab-capability-inventory.md`

## Global Constraints

- Develop/build with Node.js >=24.22.0; lock exact npm versions after Task 1 compatibility checks and use `npm ci` thereafter.
- Product name is `VFX NexgerLab`; repository/package slug is `vfx-nexgerlab`; project schema filename is `project.vfxlab.json`.
- Original project code and design use Business Source License 1.1 (`BUSL-1.1`). The Additional Use Grant permits use, modification, and sharing for learning/open development and for creating games and game assets, expressly including paid/monetized games and individual/studio/client game work. Before the Change Date it forbids selling or commercially redistributing the software/modifications, offering them as paid tools or hosted services, or using them to create/operate a Competing Product; a game using rendered effects is not a Competing Product. Change License is Apache-2.0 and Change Date is four years after each version's release (for v0.1.0, 2030-10-31), after which commercial use follows Apache-2.0. Before then it is source-available, not OSI-approved open source. Third-party dependencies/fonts retain their own licenses; users own imported/exported work and may monetize it in games. Licensor is NEXWEST LEDGER CORE COMPANY LIMITED. `src/engine/pixelfx/` stays MIT and is excluded from the Licensed Work; keep its license, `NOTICE.md`, per-file credits, and the notices for Patch, Hugo Duprez, and rehan-remade. Never copy pixelfx `gallery/`, the Patch Pixel font, or Patch branding. Do not copy PixelLab code, branding, images, UI, pixels, or private behavior.
- Every edit, Composer action, render, save, import, and export works offline with no account, API key, token, metered operation, runtime API, external generation service, analytics, or tracking. Only an explicit user action may open an allowlisted HTTPS documentation link in the system browser.
- Effect layers hold data only: no dynamic import, `eval`, or code loading from project files, presets, or archives. Treat `src/engine/pixelfx/` as third-party: unformatted, unlinted, patched only through `PATCHES.md`.
- Do not add Pixi, GPU-only rendering, accounts, cloud sync, automatic update installation, or runtime service configuration.
- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; deny remote scripts, unexpected navigation, and new windows.
- Renderer smoothing is disabled; export uses the same canonical worker frames and never rescales a frame to fit a sheet cell.
- English and Thai are release locales; all user-visible strings use namespaced catalogs and ICU placeholders. The Composer locale namespace is `composer`.
- Use the supplied `logo.png` as the source brand asset; preserve the original and generate derivative icons as separate files.
- Use TDD: each behavior starts with a failing test, then the minimal implementation, then verification. Never claim an unrun test, OS build, release gate, or research result passed.
- Add root `research/`, dependency/build outputs, secrets, local logs, and OS metadata to `.gitignore`; retain raw REA/OpenAPI captures locally and publish only the reviewed research summary under `docs/research/`.
- Implementation, commits, public repository creation, push, issue templates, the `v0.1.0` tag, and the GitHub release are already owner-authorized; no further publishing confirmation is required. Signing-certificate purchases, Apple Developer enrollment, other purchases, and auto-update enablement are not authorized.

## Review Focus

- Malformed or hostile project or archive input, including unknown effect IDs and option keys: reject traversal, oversized data, unknown versions, and invalid references without overwriting known-good files or loading code; pinned by Tasks 2, 3, 4, and 9.
- Extreme numeric/timeline input: reject NaN/Infinity and bound frames, dimensions, speed, light, normal strength, and allocations; pinned by Tasks 2, 4, 5, and 9.
- Interrupted save/export or missing assets: preserve the last valid project, offer recovery, and cancel without partial success; pinned by Tasks 2, 3, 8, and 9.
- A custom sprite or option set that throws inside an effect: the layer shows an error state and the app, autosave, and other layers keep working; pinned by Tasks 5 and 7.
- Thai/long-locale text and mixed-language filenames, including Thai typed into a bitmap-font `text` option: retain readable layout and warn about missing glyphs; pinned by Tasks 1, 3, 6, and 10.

---

### Task 1: Secure Electron Shell, Opening Effect, Repository Governance, and EN/TH Foundation

**Files:**
- Create: `package.json`, `package-lock.json`, `electron.vite.config.ts`, `electron-builder.yml`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`, `vitest.config.ts`, `playwright.config.ts`, `.editorconfig`, `.gitignore`, `.nvmrc`
- Create: `src/main/index.ts`, `src/main/security.ts`, `src/main/services/preferences-service.ts`, `src/preload/index.ts`, `src/shared/contracts/ipc.ts`, `src/shared/models/preferences.ts`
- Create: `src/renderer/src/main.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/features/splash/splash-effect.ts`, `src/renderer/src/features/splash/splash-screen.tsx`, `src/renderer/src/features/home/home-screen.tsx`, `src/renderer/src/features/settings/language-menu.tsx`, `src/renderer/src/styles/tokens.css`, `src/renderer/src/styles/global.css`
- Create: `src/renderer/src/i18n/index.ts`, `src/renderer/src/locales/manifest.json`, `src/renderer/src/locales/en/{common,editor,timeline,export,settings,composer,effects,errors,help}.json`, matching `th/` catalogs
- Create: `assets/brand/logo-source.png`, `scripts/generate-icons.mjs`, generated icons under `assets/icons/`
- Create: `LICENSE`, `README.md`, `README.th.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `DECISIONS.md`, `THIRD_PARTY_NOTICES.md`, `docs/TRANSLATING.md`
- Create: `.github/ISSUE_TEMPLATE/translation-request.yml`, `.github/ISSUE_TEMPLATE/bug-report.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/pull_request_template.md`
- Test: `tests/e2e/app-shell.spec.ts`, `tests/e2e/splash.spec.ts`, `tests/unit/splash-effect.test.ts`, `tests/unit/i18n-parity.test.ts`, `tests/unit/security-config.test.ts`

**Interfaces:**
- Produces: `window.vfxlab.getAppInfo(): Promise<{name: 'VFX NexgerLab'; version: string}>`, `getPreferences(): Promise<Preferences>`, `setLanguage(language: 'en' | 'th'): Promise<Preferences>`.
- Produces: `Preferences = { schemaVersion: 1; language: 'en' | 'th'; reducedMotion: boolean; uiScale: number; hasSeenSplash: boolean }`.
- Produces: `SPLASH_TIMING = { charge: 180, hit: 700, free: 790, reveal: 1250, settle: 1700, end: 2000 }` and `drawSplash(ctx, logo, tMs)`, ported from `docs/design/splash-prototype.js` as a pure function of time.
- Produces: `<SplashScreen ready onDone />`: first launch from 0 ms, later launches from 1250 ms, static frame at 1690 ms under reduced motion.
- Produces: scripts `dev`, `build`, `typecheck`, `lint`, `format:check`, `test:unit`, `test:e2e`, `test:i18n`, `package`, `release:check`.
- Later tasks consume only typed methods exposed from `src/preload/index.ts`; no renderer code imports Node or Electron.

- [ ] **Step 1: Write failing shell, security, and locale tests**

Assert the splash reaches Home; any click or key skips immediately; a late `ready` holds the settled frame and an early `ready` skips remaining frames; repeated `drawSplash` calls at one time produce identical pixels; reduced motion has no flash, shake, or dissolve. Assert Home shows New and Import Sprite; switching English/ไทย changes the welcome heading without reload; `window.require`, `process`, and arbitrary `vfxlab` channels are absent; EN/TH keys and ICU placeholders match across `common`, `editor`, `timeline`, `export`, `settings`, `composer`, `effects`, `errors`, and `help`; translation issue YAML requires locale, language name, reviewer contact, and consent.

- [ ] **Step 2: Run the tests to verify the missing scaffold fails**

Run: `npm run test:e2e -- --grep "secure shell|language|splash"` and `npm run test:i18n`  
Expected: FAIL because the application, catalogs, and test scripts do not yet exist.

- [ ] **Step 3: Implement the secure shell and governance baseline**

Configure the exact security flags/CSP, typed preload DTOs, first-run language choice, local Inter, Noto Sans Thai, JetBrains Mono, and Pixelify Sans fonts, splash, Home shell, the design tokens from the redesign spec, and persistent preferences. Copy—not modify—the supplied logo to `assets/brand/logo-source.png`; generate icon derivatives and inspect 16/32/64 px legibility. Add `DECISIONS.md` recording the move to vendored pixelfx and the rejected write-from-scratch path. Add the canonical BSL 1.1 text with the Global Constraints parameters and the `src/engine/pixelfx/` exclusion, `BUSL-1.1` package metadata, clear allowed monetized-game examples versus prohibited software-sale/hosted-tool/competing-product examples and Apache-2.0 conversion in both READMEs, contribution terms, notices, and translation/bug issue forms. Pin observed compatible package versions and commit the lockfile.

- [ ] **Step 4: Verify shell, locales, production build, and icon output**

Run: `npm run typecheck && npm run lint && npm run test:i18n && npm run test:unit && npm run test:e2e -- --grep "secure shell|language|splash" && npm run build`  
Expected: all PASS; production build succeeds; no network request is needed to switch language or reach Home.

- [ ] **Step 5: Commit the independently testable app shell**

```bash
git add package.json package-lock.json electron.vite.config.ts electron-builder.yml tsconfig*.json vitest.config.ts playwright.config.ts .editorconfig .gitignore .nvmrc src assets scripts LICENSE README.md README.th.md CHANGELOG.md CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md DECISIONS.md THIRD_PARTY_NOTICES.md docs .github tests
git commit -m "feat: add secure bilingual Electron app shell"
```

### Task 2: Versioned Project Schema, Atomic Persistence, and Recovery

**Files:**
- Create: `src/shared/models/project.ts`, `src/shared/schemas/project.ts`, `src/shared/migrations/project-migrations.ts`, `src/shared/utils/id.ts`
- Create: `src/main/services/file-system-adapter.ts`, `src/main/services/project-service.ts`, `src/main/ipc/project-ipc.ts`
- Modify: `src/main/services/preferences-service.ts`, `src/preload/index.ts`, `src/shared/contracts/ipc.ts`
- Test: `tests/unit/project-schema.test.ts`, `tests/unit/project-store.test.ts`, `tests/fixtures/projects/{valid-v1,corrupt,unknown-version,missing-asset}/project.vfxlab.json`

**Interfaces:**
- Produces: `ProjectV1 = { schemaVersion: 1; id: string; name: string; canvas: CanvasSpec; timeline: TimelineSpec; seed: number; assets: AssetRef[]; layers: EffectLayer[]; spriteAttachments: SpriteAttachment[]; versions: VersionSnapshot[]; activeVersionId: string; presets: PresetDescriptor[]; composerHistory: ComposerTurn[]; createdAt: string; updatedAt: string }`.
- Produces: `EffectLayer` and `ActOverrides` exactly as defined in the redesign spec section 7; in v0.1 `ProjectV1.layers` holds only `EffectLayer`. A preset stores a list of `EffectLayer`.
- Bounds: canvas axes 16–1024; frames 1–600; FPS 1–60; `light` 0–2; `opacity` 0–1; `speed` in {0.25, 0.5, 1, 2}; `windupSeconds` 0–2; all numeric values finite; IDs are UUIDs; preset and Composer records are project-scoped.
- Produces: `createProject(input: NewProjectInput): Promise<ProjectHandle>`, `openProject(path?: string): Promise<ProjectHandle>`, `saveProject(handle: ProjectHandle, project: ProjectV1): Promise<void>`, `recoverProject(path: string): Promise<RecoveryChoice>`.
- Produces: `listRecentProjects(): Promise<RecentProject[]>`, capped at 10 valid entries; missing projects remain visible with an unavailable state until the user removes them.
- `FileSystemAdapter` exposes read/write/flush/rename/backup operations so interruption tests do not depend on real power loss.

- [ ] **Step 1: Write failing schema and interruption tests**

Cover valid EN/TH project names; `EffectLayer` round trips; out-of-range `light`, `opacity`, `speed`, and `windupSeconds`; a syntactically invalid `effectId`; NaN/Infinity; 0/601 frames; excessive canvas; unknown schema; malformed JSON; traversal-like asset paths; attachment frame/anchor validation; version lineage and Composer history round trips; project-scoped preset isolation; interrupted temp write/rename; corrupt primary with valid `.bak`; recent-project ordering/deduplication/removal/unavailable state; and proof that failed saves never replace the previous valid primary.

- [ ] **Step 2: Run schema and persistence tests to verify failure**

Run: `npm run test:unit -- project-schema project-store`  
Expected: FAIL because schema, adapter, and project service are not implemented.

- [ ] **Step 3: Implement schema, migrations boundary, and atomic project service**

Validate at parse and IPC boundaries; resolve asset references only inside the project directory; write temp + flush + rename; rotate the last valid primary to `.bak`; return explicit recovery choices rather than silently overwriting. Persist portable relative asset paths, immutable version lineage, local Composer turns, and project-scoped preset descriptors without credentials or absolute host paths. Update recent projects only after successful open/save. Autosave calls `saveProject` after a 1-second debounce in Task 6.

- [ ] **Step 4: Verify all corruption and recovery cases**

Run: `npm run test:unit -- project-schema project-store && npm run typecheck`  
Expected: PASS for valid/malformed/interrupted cases; no test writes outside a temporary workspace.

- [ ] **Step 5: Commit project persistence**

```bash
git add src/shared src/main src/preload tests/unit/project-schema.test.ts tests/unit/project-store.test.ts tests/fixtures/projects
git commit -m "feat: add recoverable versioned project storage"
```

### Task 3: Safe PNG/GIF/Sprite-Strip Import and Sprite Attachment Model

**Files:**
- Create: `src/shared/models/asset.ts`, `src/shared/schemas/asset.ts`, `src/shared/models/sprite-attachment.ts`, `src/engine/sprite-attachment.ts`, `src/main/services/asset-service.ts`, `src/main/ipc/asset-ipc.ts`, `src/renderer/src/features/assets/asset-library.tsx`, `src/renderer/src/features/assets/import-dialog.tsx`
- Modify: `src/shared/models/project.ts`, `src/shared/schemas/project.ts`, `src/preload/index.ts`, `src/shared/contracts/ipc.ts`
- Test: `tests/unit/asset-import.test.ts`, `tests/unit/sprite-attachment.test.ts`, `tests/e2e/asset-import.spec.ts`, fixtures under `tests/fixtures/assets/`

**Interfaces:**
- Consumes: `ProjectV1`, `ProjectHandle`, and atomic persistence from Task 2.
- Produces: `AssetFrame = { width: number; height: number; rgba: Uint8ClampedArray; durationMs: number }`.
- Produces: `AssetDescriptor = { id: string; originalName: string; hash: string; kind: 'png' | 'gif' | 'sprite-strip'; width: number; height: number; frameCount: number; fps?: number }`.
- Produces: `SpriteAttachment = { id: string; assetId: string; outputToSourceFrames: number[]; frameAnchors: Array<{sourceFrameIndex: number; pivot: Point; anchor: Point}>; behindPartIds: string[]; inFrontPartIds: string[] }`.
- Produces: `importAsset(project: ProjectHandle, input: ImportAssetInput): Promise<AssetDescriptor>`, `readAssetFrames(project: ProjectHandle, assetId: string): Promise<AssetFrame[]>`, `removeAsset(project: ProjectHandle, assetId: string): Promise<void>`.
- Produces: `resolveAttachmentFrame(attachment: SpriteAttachment, outputFrame: number): ResolvedSpriteFrame`, retaining explicit source-frame mapping, pivot/anchor, and behind/front part membership for every imported animation frame.

- [ ] **Step 1: Write failing decoder, attachment, and safety tests**

Cover PNG, animated GIF, horizontal strip with explicit frame count/FPS, mixed-language filenames, duplicate content hashes, malformed/truncated files, zero frames, >25 MiB input, >4096 px source rejection, missing content, deletion refused while referenced, output-to-source frame mapping at differing FPS, per-source-frame pivot/anchor edits, and stable behind/front attachment across all imported frames.

- [ ] **Step 2: Run asset and attachment tests to verify failure**

Run: `npm run test:unit -- asset-import sprite-attachment && npm run test:e2e -- --grep "asset import"`  
Expected: FAIL on missing import service/dialog and attachment model.

- [ ] **Step 3: Implement bounded decoding, content hashing, and attachment mapping**

Use pure JS PNG/GIF decoders; require explicit strip layout and frame/FPS settings; copy validated bytes into project `assets/` using a hash name; retain original Unicode name and import metadata; never trust a supplied path or extension. Add validated per-output-frame source mapping and per-source-frame anchors without altering original asset pixels. Use typed IPC and confirmation for destructive removal.

- [ ] **Step 4: Verify imports, attachment mapping, and Unicode round trips**

Run: `npm run test:unit -- asset-import sprite-attachment && npm run test:e2e -- --grep "asset import" && npm run typecheck`  
Expected: PASS; imported assets and attachment maps reopen offline; every imported frame resolves exactly once per output frame; malformed files produce localized errors without changing the project.

- [ ] **Step 5: Commit asset import and attachment data**

```bash
git add src tests/unit/asset-import.test.ts tests/unit/sprite-attachment.test.ts tests/e2e/asset-import.spec.ts tests/fixtures/assets
git commit -m "feat: import and attach animated sprite frames safely"
```

### Task 4: Vendored pixelfx Engine, Effect Registry, Timeline, and History

**Files:**
- Create: `src/engine/pixelfx/` (copy of upstream `src/core` and `src/fx` at the pinned commit, plus `LICENSE`, `NOTICE.md`, `PATCHES.md`), `scripts/vendor-pixelfx.mjs`
- Create: `src/engine/effect-registry.ts`, `src/engine/easing.ts`, `src/engine/timeline.ts`, `src/engine/commands.ts`, `src/engine/history.ts`
- Modify: `src/shared/models/project.ts`, `src/shared/schemas/project.ts`, `THIRD_PARTY_NOTICES.md`, ESLint/Prettier ignores, `tsconfig.web.json` (`allowJs` for the vendored folder)
- Test: `tests/unit/effect-library.test.ts`, `tests/unit/effect-registry.test.ts`, `tests/unit/timeline.test.ts`, `tests/unit/history.test.ts`

**Interfaces:**
- Produces: `listEffects(): EffectEntry[]`, `getEffect(id: string): EffectModule | undefined`, `CATEGORIES`, and `ENGINE_VERSION = '0.3.0+a841596'`. `EffectEntry = { id; category; meta; hasAct; hasBack; palettes: boolean }`.
- Produces: `validateEffectOptions(id: string, options: unknown): { ok: true; options: Record<string, JsonValue> } | { ok: false; reason: 'unknown-effect' | 'unknown-option' | 'bad-value' }`, checked against `meta.options` by value type; ramps must be hex color arrays.
- Produces: `optionControls(id: string): OptionControl[]`, mapping number to slider, ramp to palette, boolean to switch, string to text; `seed` and `palette` are excluded from the generated list because the Inspector shows them directly.
- Produces: `applyActOverrides(mod: EffectModule, overrides?: ActOverrides): EffectModule`, returning a copy and never mutating the vendored module.
- Produces: `sampleNumberTrack(track: NumberKeyframe[], frame: number): number`, supporting `linear` and `stepped` interpolation with exact endpoint behavior.
- Produces: `applyCommand(project: ProjectV1, command: EditorCommand): ProjectV1`, `undo(history: History): ProjectV1`, `redo(history: History): ProjectV1`; pointer-drag commands coalesce and history retains at least 100 entries.

- [ ] **Step 1: Write failing library, registry, and history tests**

`effect-library.test.ts` ports the upstream `tools/check.mjs` rules over all 244 effects: meta present, no drawing outside the canvas margin, one-shots end clean, loops have no seam, no unseeded randomness, and two renders of every frame are byte-identical. Registry tests assert 244 effects, 21 categories, `getEffect('../x')` is undefined, unknown effects and option keys are rejected, `Object.keys(mod)` is unchanged after `applyActOverrides`, and `moves/ground-pound` reports no palette. Timeline and history tests assert exact first/middle/last keyframes, zero-duration segments, 1 and 600 frames, 100+ undo entries, redo invalidation, and one undo for a whole slider drag.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:unit -- effect-library effect-registry timeline history`  
Expected: FAIL because the vendored engine and engine functions do not exist.

- [ ] **Step 3: Vendor pixelfx and implement the registry**

`scripts/vendor-pixelfx.mjs` fetches the pinned commit, copies only `src/core`, `src/fx`, `LICENSE`, and `NOTICE.md`, and fails if `gallery/` or a font file would be copied. The registry imports the vendored `effects` map statically. Add the three upstream notices to `THIRD_PARTY_NOTICES.md`.

- [ ] **Step 4: Implement timeline, commands, and history**

Store JSON project snapshots for history without duplicating binary assets; coalesce by command target + pointer gesture ID.

- [ ] **Step 5: Verify**

Run: `npm run test:unit -- effect-library effect-registry timeline history && npm run typecheck`  
Expected: PASS; all 244 effects pass; the build output contains no Patch Pixel font.

- [ ] **Step 6: Commit**

```bash
git add src/engine src/shared scripts/vendor-pixelfx.mjs THIRD_PARTY_NOTICES.md tests/unit/effect-library.test.ts tests/unit/effect-registry.test.ts tests/unit/timeline.test.ts tests/unit/history.test.ts
git commit -m "feat: vendor pixelfx engine with effect registry and history"
```

### Task 5: Canonical Canvas Worker for Effect Layers and Attached Sprites

**Files:**
- Create: `src/engine/render-types.ts`, `src/engine/layer-cursor.ts`, `src/engine/render-model.ts`, `src/renderer/src/workers/render.worker.ts`, `src/renderer/src/engine/canvas-renderer.ts`, `src/renderer/src/engine/render-client.ts`
- Test: `tests/e2e/render-determinism.spec.ts`, `tests/e2e/sprite-attachment-render.spec.ts`, `tests/unit/layer-cursor.test.ts`, `tests/unit/render-model.test.ts`, golden hashes under `tests/fixtures/golden/`

**Interfaces:**
- Consumes: `ProjectV1`, `EffectLayer`, `AssetFrame`, `ResolvedSpriteFrame`, and the registry and timeline functions from Tasks 2–4.
- Produces: `FrameRGBA = { width: number; height: number; pixels: Uint8ClampedArray }`.
- Produces: `LayerCursor` with `seek(frameIndex: number): void` and `draw(frame: PixelFrame, part: 'back' | 'front' | 'whole'): void`. It uses `createFx`, or `createAct` when a layer renders its act, stepping `dt = speed / fps`. Forward seeks step; backward seeks rebuild and replay from frame 0. Frames before `startFrame` draw nothing.
- Produces: `renderFrame(project: ProjectV1, frameIndex: number, assets: ReadonlyMap<string, AssetFrame[]>, options: RenderOptions): Promise<FrameRGBA>`.
- Produces: `renderSequence(request: SequenceRequest, onProgress: (done: number, total: number) => void, signal: AbortSignal): AsyncIterable<FrameRGBA>`.
- Produces: `RenderOptions = { partFilter: 'whole' | 'behind' | 'front' | { layerId: string }; includeStage: boolean; backdrop?: BackdropKind }`. `includeStage` adds the stock dummy, target, and backdrop for preview; export defaults to false.
- With `includeStage`, an acted effect plays through `createAct`, so wind-up, freezes, and `actOverrides` appear in the pixels and frame 0 is the start of the wind-up. Without it, the effect plays through `createFx`, matching upstream sprite sheets, and act timing travels in export metadata.
- Layer failures return `LayerError = { layerId; message }` beside the frame instead of rejecting.
- Layer placement is `behind-sprite | in-front-sprite | standalone`; blend modes are `normal | add | screen | multiply`.

- [ ] **Step 1: Write failing canonical-frame, attachment, and cancellation tests**

Assert transparent pixels, exact pivot/anchor, behind/front ordering, blend output, integer placement, no smoothing, same hash for repeated frames and shuffled requests, backward seek equal to forward play, `speed` and `startFrame` behavior, sequence output equal to single-frame output, stage excluded by default, a throwing effect yielding `LayerError` while other layers render, stable attachment during scrub/export, and stale or cancelled responses not replacing a newer project revision.

- [ ] **Step 2: Run render tests to verify failure**

Run: `npm run test:unit -- layer-cursor render-model && npm run test:e2e -- --grep "canonical renderer|sprite attachment"`  
Expected: FAIL because no renderer or worker exists.

- [ ] **Step 3: Implement one canonical worker renderer**

Render each layer to its own pixelfx frame, `composite()` it to RGBA, then blend layers on an OffscreenCanvas with smoothing disabled. Resolve each attached sprite and its anchor from `outputToSourceFrames`, then render behind parts, sprite, and front parts in that order. Keep one `LayerCursor` per layer keyed by project revision. Tag requests with project ID + revision + request ID; discard stale responses and stop promptly on abort.

- [ ] **Step 4: Verify golden pixels, attachment synchronization, and stale-response protection**

Run: `npm run test:unit -- layer-cursor render-model && npm run test:e2e -- --grep "canonical renderer|sprite attachment"`  
Expected: PASS in a real Electron worker; hashes match; cancellation produces no unhandled rejection or stale frame.

- [ ] **Step 5: Commit canonical rendering**

```bash
git add src/engine src/renderer/src/workers src/renderer/src/engine tests/e2e/render-determinism.spec.ts tests/e2e/sprite-attachment-render.spec.ts tests/unit/layer-cursor.test.ts tests/unit/render-model.test.ts tests/fixtures/golden
git commit -m "feat: render effect layers through a canonical worker"
```

### Task 6: Home Library, Quick Look, Studio, Act Lane, Local Composer, My Effects, and Versions

**Files:**
- Create: `src/renderer/src/features/home/effect-grid.tsx`, `src/renderer/src/features/home/tile-scheduler.ts`, `src/renderer/src/features/quick-look/quick-look.tsx`, `src/renderer/src/features/timeline/act-lane.tsx`
- Create: `src/renderer/src/features/editor/editor-screen.tsx`, `src/renderer/src/features/editor/use-editor-store.ts`, `src/renderer/src/features/canvas/preview-canvas.tsx`, `src/renderer/src/features/timeline/timeline-panel.tsx`, `src/renderer/src/features/layers/layers-panel.tsx`, `src/renderer/src/features/inspector/inspector-panel.tsx`, `src/renderer/src/features/assets/attachment-panel.tsx`
- Create: `src/engine/composer/vocabulary.ts`, `src/engine/composer/parser.ts`, `src/engine/composer/actions.ts`, `src/renderer/src/features/composer/composer-dock.tsx`, `src/renderer/src/features/composer/composer-history.tsx`
- Create: `src/main/services/preset-service.ts`, `src/renderer/src/features/my-effects/my-effects-panel.tsx`, `src/renderer/src/features/versions/version-panel.tsx`
- Modify: `src/renderer/src/App.tsx`, `src/shared/models/project.ts`, EN/TH catalogs including `composer`, `src/renderer/src/styles/global.css`
- Test: `tests/unit/tile-scheduler.test.ts`, `tests/unit/composer-parser.test.ts`, `tests/unit/composer-actions.test.ts`, `tests/unit/preset-service.test.ts`, `tests/unit/editor-store.test.ts`, `tests/e2e/home-library.spec.ts`, `tests/e2e/quick-look.spec.ts`, `tests/e2e/composer.spec.ts`, `tests/e2e/my-effects-versions.spec.ts`, `tests/e2e/editor-workflow.spec.ts`, `tests/e2e/accessibility.spec.ts`

**Interfaces:**
- Produces: `createTileScheduler({ maxActive: 24 })`, with tiles visible-only, stepped at 15 fps, 30 fps on hover or focus, and still under reduced motion. `maxActive` is a starting value to tune from measurement.
- Produces: `createProjectFromEffect(effectId: string, input: {name: string; language: 'en' | 'th'}): ProjectV1`, the single entry from a tile to Quick Look, Studio, or direct export. Canvas comes from `meta.size`, or `actBounds()` when the act is shown; FPS, frame count, and loop come from `meta`.
- Produces: `<ActLane layer onChange />` reading `actTiming()` and writing `ActOverrides` through history commands; it renders only when the effect has an act.
- Produces: `EditorState = { project?: ProjectV1; selectedLayerId?: string; currentFrame: number; playback: 'stopped' | 'playing'; zoom: number; dirty: boolean; renderRevision: number }` plus editor actions using existing history commands.
- Produces: `parseInstruction(input: string, language: 'en' | 'th', context: ComposerContext): ComposerParseResult`, where the result contains `recognizedActions: ComposerAction[]`, `unsupportedTerms: Array<{text: string; reason: string}>`, and supported-vocabulary references; parsing is local, deterministic, and makes no open-ended AI claim.
- `ComposerAction` covers explicit effect choice, color, timing, speed, light, intensity (mapped to `ActOverrides`), direction, and attachment operations. An action the selected effect cannot honor becomes an unsupported term with a reason, such as a palette request on a `moves/*` effect. `applyComposerTurn(project, turn)` validates actions, records original input + parse result + refinement parent in `composerHistory`, snapshots the active version, and returns a new non-destructive version; unsupported terms never silently become edits.
- Produces: `searchMyEffects(project: ProjectV1, query: string): PresetDescriptor[]`, searching localized name, family, tags, and description only within the active project; `savePreset`, `applyPreset`, `createVersion`, `branchVersion`, and `restoreVersion` preserve source snapshots and content-hashed assets.
- The Composer dock, attachment panel, searchable My Effects panel, and version panel are real keyboard-accessible workspace UI; the Composer is optional and never the only editing route. Autosave debounces for 1 second and never blocks playback.

- [ ] **Step 1: Write failing Composer, library/version, editor, and accessibility tests**

Cover Home category counts, search over English effect names and Thai category names (Thai effect names arrive in Task 7), visible-only tiles, tile to Quick Look to export in three clicks, Quick Look palette and backdrop changes, Inspector controls generated from `meta.options` with hidden-control explanations, act lane edits with undo, and a text option warning on missing glyphs. Cover EN/TH effect vocabulary, colors, timing, directions, refinements, exact action display, explicit unsupported terms, mixed supported/unsupported instructions, deterministic repeated parses, no-request offline operation, conversation history after reopen, and non-destructive version creation for initial application and each refinement. Also cover project-isolated My Effects search/apply, branch/restore, attachment controls across imported frames, playback/timeline/layers/undo/save/reopen, keyboard focus, reduced motion, 1280×720 layout, live EN/TH switching, and long Thai strings.

- [ ] **Step 2: Run Composer and editor tests to verify failure**

Run: `npm run test:unit -- tile-scheduler composer-parser composer-actions preset-service editor-store && npm run test:e2e -- --grep "Home|Quick Look|Composer|My Effects|versions|editor workflow|accessibility"`  
Expected: FAIL because Home, Quick Look, Composer, library/version UI, attachment controls, and workspace are not implemented.

- [ ] **Step 3: Implement the workspace, transparent local Composer, and project library**

Build every screen to the design canvas: Home, Quick Look, and Studio with its top bar, collapsible panels, canvas, timeline, act lane, inspector, attachment controls, and settings. Implement curated EN/TH vocabulary with stemming/synonym tables, explicit action schemas, and visible recognized/unsupported chips; show supported-vocabulary help and conversation-style refinement history. Applying a turn creates a labeled version before mutation and supports branch/restore. Save searchable presets under the active project `presets/`, render My Effects with family/tag filters, and keep advanced inspector sections collapsed without changing data.

- [ ] **Step 4: Verify complete local editor and Composer behavior**

Run: `npm run test:unit -- tile-scheduler composer-parser composer-actions preset-service editor-store && npm run test:e2e -- --grep "Home|Quick Look|Composer|My Effects|versions|editor workflow|accessibility" && npm run test:i18n && npm run build`  
Expected: PASS; unsupported vocabulary remains visible, every refinement is restorable, My Effects never leaks across projects, attachments survive reopen, no primary control clips at 1280×720, a full Home in the packaged app shows no sustained main-thread frame over 16 ms, and no unexpected network request occurs.

- [ ] **Step 5: Commit the usable editor and local Composer**

```bash
git add src tests/unit/tile-scheduler.test.ts tests/unit/composer-parser.test.ts tests/unit/composer-actions.test.ts tests/unit/preset-service.test.ts tests/unit/editor-store.test.ts tests/e2e/home-library.spec.ts tests/e2e/quick-look.spec.ts tests/e2e/composer.spec.ts tests/e2e/my-effects-versions.spec.ts tests/e2e/editor-workflow.spec.ts tests/e2e/accessibility.spec.ts
git commit -m "feat: add live library, Studio, and local Composer"
```

### Task 7: Thai Effect Catalog, Family Vocabulary, Sprite Effects, and Actor Allowlist

**Files:**
- Create: `src/renderer/src/locales/{en,th}/effects.json` (21 categories; name, description, and search terms for all 244 effects)
- Create: `src/engine/effect-families.ts`, `src/engine/sprite-fx/{aura,glow,light,recolor}.ts`, `src/engine/actor-adapter.ts`, `src/engine/actor-allowlist.json`, `scripts/build-actor-allowlist.mjs`
- Modify: `src/engine/composer/vocabulary.ts`, `src/engine/render-model.ts`, `src/renderer/src/features/home/effect-grid.tsx`, `src/renderer/src/features/assets/attachment-panel.tsx`
- Test: `tests/unit/effect-catalog.test.ts`, `tests/unit/effect-families.test.ts`, `tests/unit/sprite-fx.test.ts`, `tests/unit/actor-adapter.test.ts`, `tests/e2e/sprite-effects.spec.ts`, hashes in `tests/fixtures/golden/effects.json`

**Interfaces:**
- Produces: `EffectFamilyId = 'fire' | 'explosions' | 'smoke' | 'lightning' | 'energy-orbs' | 'magic-circles' | 'portals' | 'healing-beams' | 'shields' | 'shockwaves' | 'sword-slashes' | 'hit-sparks' | 'auras' | 'glow' | 'lighting' | 'recolors' | 'projectiles' | 'ice-spikes' | 'bubbling'`.
- Produces: `EFFECT_FAMILIES: Record<EffectFamilyId, string[]>`, mapping each family to effect IDs. `auras`, `glow`, `lighting`, and `recolors` may also map to sprite effects.
- Produces: `SpriteFx = { id: string; kind: 'aura' | 'glow' | 'light' | 'recolor'; color: string; strength: number; placement: 'behind-sprite' | 'in-front-sprite' }`, added to `ProjectV1.spriteAttachments[n].fx`; each module exports `renderSpriteFx(fx, spriteFrame, frameIndex, target)`, deterministic and driven by that frame's alpha and color.
- Produces: `spriteToActor(frame: AssetFrame, anchor: Point): Actor`, filling every field of the pixelfx actor shape, and `supportsCustomActor(effectId: string): boolean`, read from the generated allowlist.

- [ ] **Step 1: Write failing catalog, family, sprite, and actor tests**

Assert EN/TH catalog keys equal the 244 registry IDs and 21 categories with no empty values; every family maps to at least one valid ID; Thai search finds each family; aura, glow, light, and recolor output stays synchronized with every imported frame and preserves source alpha where specified; `spriteToActor` output carries all stock actor keys; every allowlisted effect runs a full duration with three differently shaped test sprites without throwing; a non-allowlisted effect shows the explanation and keeps the stock preview.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:unit -- effect-catalog effect-families sprite-fx actor-adapter && npm run test:e2e -- --grep "sprite effects"`  
Expected: FAIL because the catalog, modules, and allowlist do not exist.

- [ ] **Step 3: Write the catalogs and family map**

Translate names, descriptions, and search terms from each effect's `meta`; keep English source text in `en/effects.json`. Use `they` in place of upstream `he` in descriptions. Map the Composer vocabulary to `EFFECT_FAMILIES`.

- [ ] **Step 4: Implement sprite effects, the adapter, and the allowlist**

Sprite effects are original code. `scripts/build-actor-allowlist.mjs` runs each of the 73 acted effects with the test sprites and writes passing IDs. Patch vendored effects only when a small fix widens support, and list it in `PATCHES.md`. Generate start, middle, and end hashes for all 244 effects into `tests/fixtures/golden/effects.json` from the Electron worker.

- [ ] **Step 5: Verify every effect and attachment path**

Run: `npm run test:unit -- effect-catalog effect-families sprite-fx actor-adapter && npm run test:e2e -- --grep "sprite effects" && npm run test:i18n`  
Expected: PASS; the allowlist count is reported; EN/TH search finds every family; hashes match.

- [ ] **Step 6: Commit**

```bash
git add src scripts/build-actor-allowlist.mjs tests/unit/effect-catalog.test.ts tests/unit/effect-families.test.ts tests/unit/sprite-fx.test.ts tests/unit/actor-adapter.test.ts tests/e2e/sprite-effects.spec.ts tests/fixtures/golden/effects.json
git commit -m "feat: add Thai effect catalog and sprite-attached effects"
```

### Task 8: 1/4/8/16-Directional PNG Sequence and Sprite Sheet + JSON Export

**Files:**
- Create: `src/shared/models/direction.ts`, `src/shared/directions.ts`, `src/engine/directions.ts`, `src/engine/exporters/spritesheet.ts`, `src/engine/exporters/metadata.ts`, `src/shared/schemas/export-metadata.ts`, `src/renderer/src/features/export/export-service.ts`, `src/renderer/src/features/export/export-dialog.tsx`, `src/renderer/src/features/directions/direction-panel.tsx`, `src/main/services/export-service.ts`, `src/main/ipc/export-ipc.ts`
- Modify: `src/shared/models/project.ts`, `src/shared/schemas/project.ts`, `src/preload/index.ts`, `src/shared/contracts/ipc.ts`, EN/TH export/error/editor catalogs
- Test: `tests/unit/directions.test.ts`, `tests/unit/spritesheet.test.ts`, `tests/unit/export-metadata.test.ts`, `tests/e2e/export-png.spec.ts`, `tests/e2e/directional-export.spec.ts`

**Interfaces:**
- Produces: `DIRECTION_ORDER = { 1: ['S'], 4: ['S','W','N','E'], 8: ['S','SW','W','NW','N','NE','E','SE'], 16: ['S','SSW','SW','WSW','W','WNW','NW','NNW','N','NNE','NE','ENE','E','ESE','SE','SSE'] } as const`; this clockwise, south-first order is the sole stable order used by UI, file paths, sheet rows, and metadata.
- Produces: `DIRECTION_BEHAVIOR: Record<string, 'rotate-2d' | 'fixed'>` in `src/engine/directions.ts`, a reviewed table over all 244 IDs; ground-backed and full-screen effects default to `fixed`.
- Produces: `resolveDirectionFrame(project, frameIndex, direction, assets)` setting the layer `angle` through the painter only when `directionBehavior === 'rotate-2d'`. Upstream effects face east, so `angle = (90 + directionIndex * 360 / count)` degrees for the clockwise, south-first order; fixed effects remain unrotated, and no unseen-perspective reconstruction is claimed.
- `ProjectV1.directions = { count: 1 | 4 | 8 | 16; overrides: Partial<Record<Direction, DirectionOverride>> }`; validated per-direction overrides can replace transform, palette, timing, and layer visibility and win over automatic rotation. The direction panel edits overrides explicitly and can reset one direction non-destructively.
- Produces: `calculateSheetLayout(input: SheetLayoutInput): SheetLayout`, using direction-major rows in `DIRECTION_ORDER`, ascending frame columns, and uniform cells sized to the largest rendered frame across all directions with transparent no-rescale padding.
- Produces: `ExportMetadataV1` with schema version, frame rectangles/durations, FPS, loop, optional act timing from `actTiming()`, canvas, direction count/order, per-frame direction, pivot, anchor, layer/part names, and source project/version IDs. `exportProject` formats in this task are `png-sequence | spritesheet-json`.
- Main writes only within a user-selected export directory; overwrite requires explicit confirmation; cancellation removes incomplete temp outputs and preserves pre-existing files.

- [ ] **Step 1: Write failing direction, layout, metadata, UI, and cancellation tests**

Assert exact 1/4/8/16 arrays and subset consistency, stable paths/rows/metadata, a table entry for each of the 244 IDs, an east-facing effect pointing south at direction S, suitable 2D rotation around anchors, fixed-effect behavior, per-direction override precedence/reset/reopen, diagonal padding without rescale, odd/transparent frames, 1/600 frames, exact rectangles/durations, pivot/anchor/part names, mixed-language safe names, traversal rejection, overwrite refusal, disk failure, and partial-render cancellation.

- [ ] **Step 2: Run direction and export tests to verify failure**

Run: `npm run test:unit -- directions spritesheet export-metadata && npm run test:e2e -- --grep "PNG export|directional export"`  
Expected: FAIL because direction transforms/UI and exporters do not exist.

- [ ] **Step 3: Implement deterministic directions and canonical export**

Centralize direction ordering and validation; apply painter rotation and explicit overrides before canonical rendering. Add direction count/view/override controls to the actual editor and export dialog. Render once per requested frame/direction, encode those exact pixels, write direction-labelled PNG sequences, lay out uniform no-rescale sheets, generate Zod-validated metadata from the same direction constants, and write through temp paths with progress/cancellation.

- [ ] **Step 4: Verify every direction count, pixels, metadata, and rollback**

Run: `npm run test:unit -- directions spritesheet export-metadata && npm run test:e2e -- --grep "PNG export|directional export" && npm run typecheck`  
Expected: PASS for 1/4/8/16; ordering is byte-stable across repeated exports, overrides survive reopen, sheet pixels equal canonical previews, and pre-existing files survive cancellation/failure.

- [ ] **Step 5: Commit directional game-ready export**

```bash
git add src tests/unit/directions.test.ts tests/unit/spritesheet.test.ts tests/unit/export-metadata.test.ts tests/e2e/export-png.spec.ts tests/e2e/directional-export.spec.ts
git commit -m "feat: export ordered directional PNG sheets and metadata"
```

### Task 9: Local Normal Maps, GIF, APNG, and Attached Per-Part Game-Pack ZIP

**Files:**
- Create: `src/engine/normal-map.ts`, `src/renderer/src/features/normals/normal-preview.tsx`, `src/renderer/src/features/export/encoders/gif.ts`, `src/renderer/src/features/export/encoders/apng.ts`, `src/renderer/src/features/export/game-pack.ts`, `src/shared/schemas/game-pack-manifest.ts`
- Modify: `src/renderer/src/features/export/export-service.ts`, `src/renderer/src/features/export/export-dialog.tsx`, `src/renderer/src/features/assets/attachment-panel.tsx`, `src/shared/models/project.ts`, EN/TH export/editor catalogs
- Test: `tests/unit/normal-map.test.ts`, `tests/unit/gif-encoder.test.ts`, `tests/unit/apng-encoder.test.ts`, `tests/unit/game-pack.test.ts`, `tests/e2e/normal-map.spec.ts`, `tests/e2e/export-game-pack.spec.ts`

**Interfaces:**
- Produces: `generateNormalMap(frame: FrameRGBA, options: {strength: number}): FrameRGBA`, deriving height from canonical RGBA luminance. Height mode moves to v0.2. Strength is finite and bounded to 0–10; gradients use central differences with documented edge clamping, with no service or GPU dependency.
- Normal encoding is OpenGL-style +Y up: for image-coordinate height derivatives `(dx, dy)` with y increasing downward, `normal = normalize([-strength * dx, strength * dy, 1])`; zero gradient/strength yields neutral flat `(128,128,255)`, and output alpha exactly equals source alpha.
- Produces: synchronized `normalPreview` and optional normal PNG sequence/sheet outputs for every color frame and direction using identical canvas dimensions, frame rectangles, direction order, pivot, and anchor. The export dialog exposes strength, preview, and inclusion controls.
- Produces: `encodeGif(frames, durationsMs, signal)`, `encodeApng(frames, durationsMs, signal)`, and `buildGamePack(input): Promise<Uint8Array>`; packs contain `whole/`, `behind-sprite/`, `in-front-sprite/`, `parts/<stable-part-id>/`, `directions/<direction>/`, optional mirrored `normals/`, and `manifest.json`.
- Parts are whole, behind, front, and one per layer. Per-part export uses `RenderOptions.partFilter` plus the same `SpriteAttachment` frame mapping as preview, so each imported sprite frame retains its anchor and behind/front parts. GIF/APNG export whole composite frames; game-pack manifests reference every color/normal/part/direction file explicitly.

- [ ] **Step 1: Write failing normal-map, attachment-export, format, and archive tests**

Cover neutral flat normals, positive/negative x/y gradient signs, edge clamping, strength 0/min/max/out-of-range/NaN, exact alpha preservation, preview/export equality, and synchronized dimensions/rectangles across frames and 1/4/8/16 directions. Decode GIF/APNG for signatures, counts, timing, loop, transparency, documented GIF quantization, and APNG losslessness. Assert whole/behind/front/individual-part attachment pixels for every imported frame, direction/normal entries, manifest parity, safe fixed paths, duplicate rejection, and size limits.

- [ ] **Step 2: Run normal, encoder, and archive tests to verify failure**

Run: `npm run test:unit -- normal-map gif-encoder apng-encoder game-pack && npm run test:e2e -- --grep "normal map|game pack"`  
Expected: FAIL because normal generation/UI, encoders, and packaging do not exist.

- [ ] **Step 3: Implement local normals, bounded encoders, and attached game packs**

Derive luminance directly from canonical RGBA; generate normals with the documented gradient convention and integrate real normal preview/strength/export controls. Use selected pure JS encoders and `fflate`, preserve timing, and document GIF palette behavior. Render whole/behind/front/individual parts through the canonical renderer with existing attachment maps, generate optional normals from the corresponding frames, and build one manifest using Task 8 metadata and direction order rather than duplicate logic.

- [ ] **Step 4: Verify normals and all exported files by decoding them again**

Run: `npm run test:unit -- normal-map gif-encoder apng-encoder game-pack && npm run test:e2e -- --grep "normal map|game pack" && npm run build`  
Expected: PASS; flat/gradient/alpha fixtures match exactly, every color frame has the requested synchronized normal, all attached parts/directions are present, and every manifest entry resolves to a safe real file.

- [ ] **Step 5: Commit normal maps and all v0.1 export formats**

```bash
git add src tests/unit/normal-map.test.ts tests/unit/gif-encoder.test.ts tests/unit/apng-encoder.test.ts tests/unit/game-pack.test.ts tests/e2e/normal-map.spec.ts tests/e2e/export-game-pack.spec.ts
git commit -m "feat: export local normal maps and layered game packs"
```

### Task 10: Offline Release Acceptance, CI/CD, Public Repository, and v0.1.0 Release

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/dependabot.yml`, `scripts/verify-release.mjs`, `scripts/generate-release-notes.mjs`, `src/shared/schemas/release-evidence.ts`, `docs/RELEASING.md`
- Modify: `package.json`, `electron-builder.yml`, `README.md`, `README.th.md`, `CHANGELOG.md`, `THIRD_PARTY_NOTICES.md`
- Test: `tests/e2e/offline-first-run.spec.ts`, `tests/e2e/all-export-formats.spec.ts`, `tests/e2e/crash-recovery.spec.ts`, `tests/e2e/thai-export.spec.ts`, `tests/unit/release-verification.test.ts`

**Interfaces:**
- Consumes: all prior scripts, tests, app metadata, and export formats.
- Produces: `npm run release:check -- --version <tag-without-v>` validating package/tag/changelog equality, nonempty categorized notes, required locales, and absence of placeholders.
- Release notes contain Added/Changed/Fixed/Removed/Security/Documentation/Translations/Migration / Breaking Changes/Known Issues as applicable, PR/issue links, SHA-256 sums, prerelease/signing status, and explicit unmet research/platform gates.
- CI uses least-privilege pinned actions. CI matrix jobs build/test Windows x64 NSIS, macOS arm64/x64 DMG, and Linux x64 AppImage; local verification covers only the host and commands actually run. External usability/reviewer outcomes are recorded only from observed participants/reviewers.

- [ ] **Step 1: Write failing offline release-gate and critical-journey tests**

With networking disabled and a clean profile, assert first run splash → EN/TH choice → three-click export from a Home tile → Composer instruction → visible parsed actions/unsupported terms → refinement history/new version → live edit → import animated sprite → attach behind/front parts across frames → searchable My Effects save → save/reopen/autosave recovery → preview normals → export every format: PNG sequence, GIF, APNG, sheet + JSON, and game-pack ZIP. Exercise 1/4/8/16 for directional exports and verify per-part/normal outputs where those formats support them. Also assert Thai filenames, no external requests/service fields, and package/tag/changelog/locale failures. Add a release-evidence schema that leaves five-users-per-language usability and fluent EN/TH copy review explicitly pending until real evidence exists.

- [ ] **Step 2: Run the full local release candidate gate**

Run: `npm ci && npm run format:check && npm run lint && npm run typecheck && npm run test:unit && npm run test:i18n && npm run test:e2e && npm run build && npm run package && npm run release:check -- --version 0.1.0`  
Expected: FAIL only on remaining release/metadata/workflow gaps; any product failure returns to its owning task rather than being waived. This local command is not evidence that Windows/macOS/Linux matrix jobs passed.

- [ ] **Step 3: Implement CI, packaging, release verification, and honest documentation**

Use pinned action SHAs and separate Windows/macOS/Linux runner results; never label that matrix locally verified. Make signing secrets optional, never echo them, mark unsigned artifacts prerelease with installation warnings, and do not purchase or enroll in signing. Document offline Composer scope/vocabulary, the 244-effect library and its MIT origin, sprite effects, attachment, versions, directions, normals, exports, build/contribution/translation/security instructions in both READMEs. Record external usability targets (five new users per primary language, at least 4/5 success) and fluent-language review as pending gates unless observed evidence is supplied; automated UI tests are not substitutes.

- [ ] **Step 4: Repeat the complete gate and inspect only observed artifacts/results**

Run the Step 2 command again, then install/launch the produced artifact on the available host and repeat the complete offline Composer/attachment/save/reopen/all-format export smoke test. Inspect any CI matrix results that have actually run and report each OS/job separately; if CI has not run, leave it pending rather than treating the local gate as matrix evidence. Verify no secrets or unexpected requests in logs, state, diagnostics, archives, or packaged app and match SHA-256 files. Record external usability and reviewer evidence only if sessions actually occurred; otherwise keep those gates visibly unmet and make no success claim.

- [ ] **Step 5: Execute the already-authorized repository and release flow**

Review the diff and secret scan, create the public repository under `NexwestLedgerCoreCompanyLimited/vfx-nexgerlab`, push `main`, and open the release PR without another authorization request. Wait for the actual CI matrix and required automated gates, and require actual external usability/language-review evidence before merging, tagging `v0.1.0`, and publishing/inspecting the GitHub Release and every upload. Use the account-linked GitHub no-reply identity for the human author and add Claude's trailer only for genuine Claude contributions. Publish unsigned artifacts as prerelease with warnings; do not buy signing credentials or enable auto-update. Record the observed release URL and known issues; if a required gate remains unmet, report it and do not merge/tag/release or fabricate completion.

```bash
git add .github scripts docs package.json electron-builder.yml README.md README.th.md CHANGELOG.md THIRD_PARTY_NOTICES.md tests
git commit -m "chore: prepare v0.1.0 public release"
# Repository creation/push are owner-authorized; tag only after release gates pass:
# gh repo create NexwestLedgerCoreCompanyLimited/vfx-nexgerlab --public --source . --remote origin --push
# git tag -a v0.1.0 -m "VFX NexgerLab v0.1.0"
# git push origin v0.1.0
```

## Completion Checklist

- [ ] All 244 vendored effects work offline, pass the ported check suite, and match golden start/middle/end hashes; each of the 19 Composer families maps to real effects.
- [ ] Splash, Home, Quick Look, Studio, act lane, and Export match the approved canvas; three-click export works.
- [ ] MIT notices are complete, the Patch Pixel font is absent, and project files never trigger code loading.
- [ ] Local EN/TH Composer exposes recognized actions, supported vocabulary, unsupported terms, and refinement history; every application/refinement creates a restorable non-destructive version.
- [ ] Searchable project-scoped My Effects, immutable version branch/restore, and sprite attachment across every imported frame pass save/reopen and isolation tests.
- [ ] Preview and every export share canonical pixels; sprite aura/glow/light/recolor and behind/front/per-layer attachment outputs remain synchronized.
- [ ] 1/4/8/16 directional export uses the explicit stable order, suitable 2D rotation, per-direction overrides, exact metadata, and no-rescale padding.
- [ ] Local luminance normal maps pass neutral-flat, gradient-sign, strength, and alpha tests; preview/export normals synchronize with every frame/direction.
- [ ] Save/recovery, missing assets, missing effects, cancellation, timeline bounds, and hostile-input tests pass.
- [ ] English and Thai pass key/placeholder/layout/accessibility checks, including the `composer` namespace and long/mixed-language content.
- [ ] PNG sequence, GIF, APNG, sheet + JSON, and layered game pack are decoded and verified with parts, directions, normals, and manifest metadata.
- [ ] Offline first run through Composer, attachment, save/reopen, and every export format passes on the actual tested host; unrun OS matrix jobs are not claimed as locally verified.
- [ ] External five-users-per-language usability and fluent EN/TH review gates are supported by observed evidence or remain explicitly pending, never replaced by automated-test claims.
- [ ] README, BSL 1.1, notices, translation request, contributing, security, categorized changelog, checksums, and prerelease/signing warnings are present.
- [ ] Public repo/tag/release claims are made only after their URLs and artifacts are observed; publishing uses the existing owner authorization and no signing purchase occurs.
- [ ] No runtime API, external generation dependency, account, analytics, GPU-only path, auto-update, or untested platform/engine integration is advertised as shipped.
