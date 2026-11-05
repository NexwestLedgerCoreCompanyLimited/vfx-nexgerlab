# VFX NexgerLab Redesign on the pixelfx Engine

**Date:** 2026-11-05  
**Status:** Canvas approved by the owner on 2026-11-05. Decisions marked *builder call* were made while writing this document and are open to review.  
**Visual source of truth:** [design canvas](https://claude.ai/artifact/Gr7is8AcbNgmbDNkRNWuSE) (private to the owner)  
**Reference program:** [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx) 0.3.0, commit `a84159688af3ca37a4be05a0d422b94451b2e24e`

## 1. Intent

The owner wants VFX NexgerLab to feel like pixelfx: open the app and effects are already playing. Pick one, change it, and export it into a game. The app adds what pixelfx lacks: a desktop Studio with layers, a timeline, sprite attachment, versions, directions, normal maps, and bilingual use without code.

## 2. Goals

- Make the effect library the front door instead of an empty workspace.
- Reuse the pixelfx engine and its 244 effects rather than writing 19 effect families from scratch.
- Let a user export from the library in three clicks, without entering the Studio.
- Make character timing editable: wind-up, hit, freeze, and recovery.
- Open with a short original branded effect that uses the app's own visual language.

## 3. Non-goals and anti-goals

- No copy of the pixelfx gallery's look, name, logo, or the Patch Pixel font.
- No Claude Code skill, plugin, or developer code-snippet panel.
- No running of code from project files, presets, or imported archives.
- No claim that all effects are original, or that the MIT portions are under BSL.
- No promise of controls an effect does not expose.
- Failure even if it works: a splash that delays the user, or a library that spins the fans.

## 4. Verified facts about pixelfx

Measured on 2026-11-05 under Node 26 on macOS. Electron and other platforms are not yet measured.

| Check | Result |
|---|---|
| Upstream `tools/check.mjs` | 244 pass, 0 fail, 0 warnings |
| Repeat render of every frame of all 244 effects, same process | 0 byte differences |
| DOM, network, `Math.random`, or `Date` in `src/` | None found |
| Average frame cost | 0.89 ms; p95 2.23 ms; worst 5.6 ms (`explosions/nuke`) |
| Seek cost, longest checked effect (7.2 s) | 14 ms from `t = 0` |
| Minified bundle | 1.14 MB, 462 KB gzip, 37 ms to load |
| Stateful effects (`create`) | 132; the other 112 are pure `draw(p, t, o)` |
| Effects with `drawBack` | 161 |
| Effects with a character (`act`) | 73 |
| Palette support | 232 of 244; the 12 `moves/*` have none |
| Only `seed` and `palette` options | 76 of 244 |
| Text option | 6 effects; the bitmap font has no Thai glyphs |
| Frame rate | All 244 declare 30 fps |
| Custom sprite as `o.actor` | 73 of 73 run with a complete actor shape (first test used a partial shape); visual quality not reviewed |
| Node vs Electron pixels | Electron's V8 uses a different `sin`/`cos`, so 5 of 732 sampled frames differ by rounding; identical within one Electron build |

## 5. Licensing

- Code and effects under `src/` are MIT. Keep the MIT text and the notices for Patch, Hugo Duprez (Sprite Fusion), and rehan-remade (Hollow Crown).
- Keep credit comments at the top of adapted effect files. Do not strip them when vendoring.
- `gallery/fonts/PatchPixel-Regular.woff2` is not MIT. Do not copy `gallery/` at all.
- BSL 1.1 covers original VFX NexgerLab work only. Vendored MIT files stay MIT.
- Anyone may sell pixelfx itself, so BSL gives no protection to the library. Product value must come from the Studio.
- All marketing and docs must describe the effect library as based on pixelfx.

## 6. Experience

### Flow

Open app → splash → Home → Quick Look → Studio (optional) → Export.

Shortest path: click a tile, click **Export now**, click **Export**. This meets the spec's five-action limit.

### Splash

The prototype is `docs/design/splash-prototype.js`. Its `draw(t)` is a pure function of time.

| Time | Beat | What happens |
|---|---|---|
| 0.00–0.18 s | Seed | One lit pixel on the ink background |
| 0.18–0.70 s | Wind-up | Particles pull in, the orbit closes, four cubes step in at 12 fps |
| 0.70–0.79 s | Hit-stop | One 34 ms flash, then simulated time freezes with a 2 art-pixel shake |
| 0.79–1.25 s | Release | Logo resolves in mosaic steps; shock ring and sparks |
| 1.25–1.70 s | Settle | Wordmark types on; progress bar; status text |
| 1.70–2.00 s | Exit | Ordered dither dissolve to the Home background |

Rules:

- Any click or key skips to Home at once.
- Progress reflects real boot steps. Finishing early skips the remaining frames; finishing late holds the settled frame.
- Later launches start at 1.25 s and take 0.75 s.
- Reduced motion shows a static frame with no flash, shake, or dissolve.
- No sound. No network. The logo PNG keeps its transparency.

### Home

- Top bar: brand, Library / My Effects / Projects, offline status, language, Import Sprite, New.
- One input for search and Composer instructions, in Thai or English.
- Recent projects beside the input.
- Category chips with real counts, then a live grid of tiles.
- Tiles play only while visible. *Builder call:* step tiles at 15 fps and at 30 fps on hover.
- Reduced motion shows a still frame and plays on hover or focus.

### Quick Look

Stage, play/pause, speed ¼×, ½×, 1×, backdrop, palette, seed, mirror, and options from `meta.options`. Actions: Open in Studio, Export now, Save to My Effects.

### Studio

- Top: project, save state, undo/redo, language, Export.
- Left: Layers / Library / Sprites. Layers group by front of character, character, and behind character.
- Center: integer zoom, backdrop, onion skin, before/after, canvas, Composer.
- Right: Inspector. Act timing first when an effect has an act, then Basic, then collapsed Advanced.
- Bottom: transport, ruler, act lane, frame strip, front and back lanes.
- Composer shows understood actions and unsupported ones, and applying creates a new version.
- The Inspector hides any control the selected effect does not support and says why.

### Export

Formats: sheet + JSON, GIF, APNG, PNG sequence, game-pack ZIP. Controls: direction count, front/back split, normal map, act timing, and a preview of real output. Engine support stays unclaimed until tested in that engine.

## 7. Architecture

### Vendoring

- Copy `src/core` and `src/fx` to `src/engine/pixelfx/` at the pinned commit, with `LICENSE` and `NOTICE.md`.
- Treat the folder as third-party: no reformatting, excluded from lint, and allowed as JS.
- Copy `tools/check.mjs` logic into a project test rather than shipping upstream tools.
- Patches stay small, listed in `src/engine/pixelfx/PATCHES.md`, and preserve upstream file shape so updates remain possible.
- *Builder call:* vendor instead of an npm or GitHub dependency, because releases need a fixed, auditable copy and pixelfx is not on npm.

### Project data

`EffectLayer` replaces the planned emitter and shape layers in v0.1:

```ts
type EffectLayer = {
  id: string;
  kind: 'effect';
  effectId: string;        // checked against the bundled registry
  engineVersion: string;   // vendored pixelfx version
  options: Record<string, JsonValue>; // checked against meta.options
  seed: number;
  flip: boolean;
  angle: number;
  x: number;               // integer canvas position of the effect origin
  y: number;
  opacity: number;         // 0 to 1
  light: number;           // 0 to 2
  speed: number;           // fixed list: 0.25, 0.5, 1, 2
  startFrame: number;
  visible: boolean;
  blend: 'normal' | 'add' | 'screen' | 'multiply';
  placement: 'behind-sprite' | 'in-front-sprite' | 'standalone';
  tracks: { x?: NumberKeyframe[]; y?: NumberKeyframe[]; opacity?: NumberKeyframe[]; light?: NumberKeyframe[] };
  actOverrides?: ActOverrides;
};

type ActOverrides = {
  windupSeconds?: number;  // 0 to 2
  hits?: Array<{ index: number; stop?: number; amp?: number; shake?: number }>;
};
```

- Unknown `effectId` or option keys load as a visible missing-effect state, never as code.
- Effect behavior is pinned by `engineVersion`. Changing vendored effects needs a migration note and new goldens.

### Rendering

- The worker imports the vendored engine, so preview and export share one path.
- Color composes through `composite()` into `FrameRGBA`; `drawBack` and `draw` provide behind and front output.
- Canonical frames sit on a project FPS grid: `dt = speed / fps`. Same project, same FPS, same pixels.
- Playback speed changes how long a frame is held, not the simulated step.
- The worker keeps one live instance per layer. Forward steps are incremental. Backward seeks recreate the instance and replay.
- Effects are data-driven only through `meta.options`. Time-bound effects remain time-bound.

### Controls

Universal: seed, flip, angle (non-ground effects), light, speed, start frame, placement. Palette appears when `meta.options.palette` exists. Others are generated from `meta.options`: number to slider, ramp to palette picker, boolean to switch, string to text. Text fields warn when the input has glyphs the bitmap font lacks.

### Acts

`createAct` plays the performance. The act lane reads `actTiming()`. Editing changes `actOverrides`, and rendering applies them to a copy of `mod.act`. The stock dummy and target are preview aids. Each export must state whether they are included. Effect-only export stays the default.

### Sprites

The engine's actor shape expects more than a mask. v0.1 ships a tested allowlist:

- Any effect can attach to a sprite by anchor, behind or in front.
- `o.actor` with a user sprite is enabled only for effects that pass a per-effect test.
- Others keep the stock dummy preview and show a plain explanation.
- Character-following aura, glow, light, and recolor are new original modules in `src/engine/sprite-fx/`, driven by each imported frame's alpha and color, because pixelfx does not provide these for arbitrary frames.

### Directions

Use the painter's `angle` so rotation runs through the same pixels path. Effects face east, so the offset from the spec's south-first order is applied in one place. Classification is a reviewed `directionBehavior` table, defaulting ground and screen effects to `fixed`.

### Normal maps

v0.1 uses luminance from canonical RGBA only. pixelfx has no height data, so height mode moves to v0.2.

### Parts

`whole`, `behind`, `front`, and one part per layer. An effect is not split into sub-parts.

### Library data

- Categories: 21, with Thai names in the `effects` locale namespace.
- Thai name, description, and search tags for all 244 effects are a release requirement and need fluent review.
- The 19 spec families become Composer vocabulary mapped to effect IDs. Mapping tests fail on any family with no effect.
- Bundled effects are the library, so `assets/templates/*.vfxlab.json` is dropped.

## 8. Visual system

Canvas tokens replace the spec's: `canvas #0B1220`, `panel #101827`, `raised #172235`, `border #26344A`, `border.strong #3A4C6B`, `text #F3F7FC`, `muted #A9B7CB`, `cyan #32E6F2`, `violet #9B6CFF`, `magenta #F05CFF`.

- Radius 4–6 px. Primary buttons have stepped pixel corners.
- Glow only for focus. Effects supply the color.
- Inter + Noto Sans Thai for UI, JetBrains Mono for values, Pixelify Sans for the wordmark only.
- Panel transitions are at most 120 ms and off under reduced motion.

## 9. Scope changes to v0.1

Removed: writing 19 effect families, template JSON files, emitter and shape layers, height-mode normals.

Added: vendored engine, splash, Quick Look, act lane, sprite-fx modules, effect catalog in Thai.

Moved to v0.2 (*builder call, owner to confirm*): user-authored emitter and shape layers.

## 10. Risks

| Risk | Guard |
|---|---|
| An upstream update changes pixels | Pinned copy, goldens, explicit `engineVersion` |
| Hostile project file | Registry lookup and option validation; no dynamic import from project data |
| Live tiles load the CPU | Visible-only playback, 15 fps stepping, active tile cap, measured in Electron |
| Electron upgrades can shift a few pixels | Goldens are generated in the Electron worker; rerun and review them on each upgrade |
| Custom sprite crashes an effect | Per-effect allowlist from an automated test; catch errors per layer |
| Thai effect names drift | Key parity CI and fluent review gate |
| Users think BSL covers the library | README, notices, and About state the MIT portion plainly |

## 11. Acceptance

- Splash meets the timing, skip, repeat-launch, and reduced-motion rules at 1280×720.
- Home plays visible tiles with no sustained main-thread frame over 16 ms in the packaged app.
- All 244 effects pass the check test, and repeat renders match in an Electron worker.
- Three-click export writes a sheet whose pixels match the Quick Look frames.
- Project files never trigger code loading.
- `THIRD_PARTY_NOTICES.md` carries every required notice.

## Later scope change, 2026-11-05

The owner added characters, 2D and 3D maps, an MCP stdio server, wider file formats, English as the default, and the MineOffice license. `docs/vfx-nexgerlab-product-spec.md` and `DECISIONS.md` record these. They replace any non-goal above that conflicts.
