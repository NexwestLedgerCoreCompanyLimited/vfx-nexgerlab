# PixelLab Capability Inventory for VFX NexgerLab

**Review date:** 2026-10-30  
**Method:** Read-only public research; REA `rea-agents@6.7.0` browser scenarios; official documentation, `llms.txt` / `llms-full.txt`, and OpenAPI v2. No login, generation, uploads, purchases, private APIs, or proprietary source extraction.

## Executive conclusion

PixelLab is a connected game-asset platform, not only a VFX generator. Its verified public workflow spans concept/reference input, generation, variation review, editing/inpainting, rotations and animation, reusable asset libraries, and engine-oriented export. VFX NexgerLab should learn from this continuity without cloning PixelLab branding, proprietary implementation, or its entire catalogue.

The recommended product boundary is a free, local-first VFX editor with optional provider integrations. PixelLab must not become a required backend for core editing or export.

## REA evidence

| Target | REA Evidence ID | Result |
|---|---|---|
| `https://www.pixellab.ai/pixel-art-vfx-generator` | `ev_9f4ab3916d2b8fe9ae867e86a1b0018172ace81974a3227087e4369449856080` | Completed launched-browser scenario; DOM, accessibility, URL captured |
| `https://www.pixellab.ai/docs` | `ev_30e8c28bceb822d155218b7c27443c15455340947c0f235200dc82743f49b56d` | Completed launched-browser scenario; DOM, accessibility, URL captured |

The complete evidence records are retained locally in `research/rea-pixellab-vfx-evidence.json` and `research/rea-pixellab-docs-evidence.json`. Both owned browser processes were terminated by REA after capture. The evidence describes the selected public pages and capture window, not authenticated behavior or all runtime execution.

## Coverage

- 69 public documentation URLs reviewed: 67 pages inlined in `llms-full.txt` and two additional navigation pages.
- Current API v2 inventory reviewed: 102 paths and 113 operations (73 POST, 26 GET, 12 DELETE, 2 PATCH).
- Downloaded OpenAPI cross-check: 102 paths, 113 operations, 275 schemas; SHA-256 `e7bdfc6e50fc4fdeea424cf92841b5509e01e8acf8975e7dae44bcab34730e4a`.
- Official product, pricing, VFX, MCP, Game Builder, enterprise, terms, privacy, and refund pages reviewed.
- VFX, jobs, uploads, exports, errors, and selected schemas inspected in OpenAPI.
- Not reproduced: all 275 OpenAPI schemas and every enum. Exact integration fields must be read from the versioned OpenAPI source during implementation.

## Product surfaces and access systems

| Surface | Verified functionality |
|---|---|
| Simple Web Creator | Streamlined image generation on desktop/mobile with fewer controls than editor integrations |
| Character Creator | Text/reference characters, 4/8 directions, animation preview, sheets and frame export |
| PixelLab Pixelorama | Browser Pixelorama editor with PixelLab AI tools; desktop only |
| Aseprite extension | PixelLab tools in Aseprite; installation guide specifies Aseprite 1.3.7 minimum and no extension support in trial |
| Map Workshop | Manual top-down tile painting, generated matching Wang tilesets, saved maps |
| VFX Creator | Chat-driven animated effects, optional animated sprite, live sliders, My Effects, browser exports |
| Game Builder | Chat-driven Phaser 4 + TypeScript projects, preview, PixelLab asset sync, deployment to `pixellab.run` |
| REST API | Bearer-authenticated generation, editing, animation, VFX, tile, UI, font, dialogue, library, and export operations |
| MCP | Remote HTTP MCP for AI clients; asset generation, VFX workbench, uploads, Game Builder and sandbox tools |
| Enterprise | Dedicated queue, organization pool, team management, priority support, invoicing, SAML 2.0 SSO |

## Functional inventory

### Generation and conversion

- PixFlux, Pixen, BitForge, Pro, Pro Flash, large-image, style-reference, depth-guided, and pose-guided generation.
- Image-to-pixel-art conversion from photos, drawings, renders, GIFs, or AI images, with palette/transparency options.
- Texture generation, multi-image experiments, prompt enhancement, and image-to-text.
- Controls include prompt/negative prompt, camera, direction, projection, outline, shading, detail, guidance, palettes, init images, seeds, background removal, dithering, and tile settings.

### Editing and cleanup

- Instruction/reference edits; masked inpainting; crop-to-mask and selection workflows.
- Reshape, AI resize, re-pose, try-on, outfit transfer, background removal, palette reduction, unzoom, pixel-art correction.
- OpenGL-convention normal-map generation, including animated strips and Lite/Pro variants.

### Characters and objects

- Persistent characters and objects; 1/4/8-direction variants; states; reusable animations; tags; list/get/delete.
- Candidate review and frame promotion for objects; portrait conversion and portrait selection.
- Automatic directional animation and experimental instant-character creation.

### Animation

- Text-driven v2/v3, PixMiniMax, Pro, animation-to-animation, generated subject + animation.
- Skeleton estimation/editing/templates and 18-joint skeleton v3.
- Interpolation, animation editing, outfit transfer, re-pose, and automatic character animation.

### Rotation

- Single-image rotation, camera-view changes, 4/8-direction character/object workflows.
- Pro and v3 eight-direction generation from text, style, concept, or existing sprite.
- Public guidance acknowledges iterative rotation errors and recommends correction rather than promising perfect output.

### Maps, tiles, and environment assets

- Map generation/extension, Map Workshop, top-down and side-scroller tilesets.
- Wang, dual-grid 15-tile, and 3×3 tileset exports.
- Pro material variations, paths, terrain transitions, hex coastlines, building kits, isometric tiles, and map objects.

### UI, fonts, portraits, and dialogue

- Standard/Pro game UI, shape-based panels, UI asset library.
- Pixel-font atlas and TrueType export.
- Portrait/full-body conversion, visemes, talking GIF, and engine-ready lip-sync frame plans.

## VFX system in detail

### Public product workflow

1. Optionally provide a character or animated sprite.
2. Describe the effect and its timing in chat.
3. Refine with more chat and live size, speed, color, and timing controls.
4. Save to My Effects and export.

Examples include fire, explosions, smoke, lightning, energy orbs, magic circles, portals, healing beams, shields, shockwaves, slashes, hit sparks, auras, lighting, and recolors. Browser exports are GIF, APNG, PNG sprite sheet, and game-pack ZIP. Projectile/slash exports support 4, 8, or 16 directions. The product page says slider adjustments and exports do not consume generations.

### `POST /v2/vfx`

Verified request capabilities include description, optional PNG/GIF sprite, sprite frame count/FPS, Lite/Pro artist, saved-effect editing, conversation state, name, and optional game pack. The completed response can include GIF, sheet PNG + JSON, frame durations, pivot/anchor metadata, optional game-pack ZIP, conditional normal map, saved effect ID/edit URL, canvas, FPS, loop, parts, and conversation state.

The API returns `202` with a background job ID. Polling is documented at 5–10 second intervals; usual VFX latency is described as 30–90 seconds. Pricing depends on artist, sprite size, animation, new/change request, prompt, and edit complexity. Charging occurs on delivery, with documented quote-overrun rules.

The website's 4/8/16-direction export claim must not be inferred as a `/vfx` request field; the reviewed `VfxRequest` has no direction-count field.

## Complete API operation groups

| Group | Operations |
|---|---:|
| Getting started | 2 |
| Create Image | 9 |
| Image to Pixel Art | 3 |
| Character Creation | 8 |
| Character Library | 9 |
| Object Creation | 7 |
| Object Library | 6 |
| Animate | 7 |
| Skeleton Animation | 3 |
| VFX | 1 |
| Rotate | 3 |
| Edit | 4 |
| Inpaint | 3 |
| Tilesets | 10 |
| Tiles | 8 |
| Map Objects | 2 |
| Game UI | 5 |
| Portraits & Voice | 7 |
| Fonts | 2 |
| Cleanup | 6 |
| Enhance Prompt | 3 |
| Image to Text | 1 |
| Jobs | 2 |
| Uploads | 2 |
| **Total** | **113** |

Base URL: `https://api.pixellab.ai/v2`. Current machine-readable contract: `https://api.pixellab.ai/v2/openapi.json`.

## Cross-cutting usage systems

### Authentication

Normal API access uses `Authorization: Bearer YOUR_API_TOKEN`. MCP uses the same token at `https://api.pixellab.ai/mcp`. Exceptions exist for selected downloads and ticket-based uploads; integration code must follow each operation's declared security rather than applying assumptions.

### Jobs and concurrency

Most expensive operations are asynchronous. Verified states include `processing`, `completed`, and `failed`; queue position and estimated wait can be present. Cancellation behavior and possible charges depend on whether GPU work has started. No webhook endpoint appears in the reviewed v2 catalogue; polling is the documented pattern.

### Uploads and persistence

Bearer uploads return `upload:<id>` references and expiry metadata. MCP upload tickets are time-limited. Characters, objects, tilesets, Pro tiles, isometric tiles, UI assets, and VFX have resource-specific persistence. Map objects are documented as temporary in the API. There is no generic v2 `projects` or `assets` REST family.

### Exports

Character ZIP/sheet + JSON, object sheet + JSON, tileset layouts, VFX GIF/APNG/sheet + JSON/game pack/normal map, font atlas + TTF, transparent PNG, and deployed Game Builder URLs are documented. Frames are centered without rescaling in character/object sheet exports.

### Errors and limits

Observed response classes include 400, 401, 402, 403, 404, 409, 410, 422, 423, 429, 503, and 529, with operation-specific meanings. No universal requests-per-second or concurrency limit was published in the reviewed OpenAPI. Clients must honor `Retry-After` where provided and use bounded backoff.

## Legal and product constraints relevant to VFX NexgerLab

- PixelLab Terms restrict programmatic usage to the official API and ask parties building their own service or reselling API usage to contact PixelLab.
- Users retain ownership of creations subject to the Terms; model training on generated images is restricted without written permission.
- PixelLab software, branding, algorithms, and assets are not VFX NexgerLab material. VFX NexgerLab must use clean-room original code, design, templates, and documentation.
- PixelLab provider integration is explicitly out of scope; the application uses only its own local engine and never calls the PixelLab API.
- VFX NexgerLab uses BSL 1.1 for original code/design/templates and converts to Apache-2.0 four years after each version's release. Before conversion, the Additional Use Grant allows modification/sharing and development of paid or monetized games, but prohibits selling/commercially redistributing the software or modifications, paid tool/hosted-service use, and competing VFX/development products. Games and rendered assets are not competing products. Third-party dependencies retain their licenses and users own their imported/exported work.

## Design lessons transferred to the specification

1. Preserve original assets, prompts, references, versions, and manual edits non-destructively.
2. Make variation selection, compare, accept/reject, and branching first-class operations.
3. Keep timing, FPS, loop, opacity, transform, layer order, color, and export local and immediate.
4. Use project-level style kits: palette, outline, shading, camera, direction convention, and references.
5. Show editable/frozen mask semantics explicitly.
6. Show provider cost estimates and job/charge states clearly; never hide paid actions behind a generic Generate button.
7. Treat pivot, anchor, direction order, frame durations, behind/front layers, and metadata as core export data.
8. Keep local editing/export available offline with no sign-in.
9. Store credentials only in the main process using OS-backed protection; never expose them to renderer logs or project files.
10. Build English and Thai together, with community translation workflows for additional locales.

## Verified gaps and unresolved items

- Authenticated creator/editor layout, first-run tutorial, actual VFX controls, error recovery, and export fidelity were not exercised.
- Public docs are a work in progress and contain old/new variants and occasional conflicts; direct current pages and v2 OpenAPI take precedence.
- No dedicated `docs/tools/create-vfx` page was found; VFX is covered by the product page, MCP references, and API.
- Some documented web tools do not have same-named v2 REST paths.
- Actual output quality, speed, consistency, APNG/game-pack fidelity, and engine imports were not tested because no generation was run.
- PixelLab API permission for this specific distributed desktop integration remains a release gate.

## Primary official sources

- https://www.pixellab.ai/
- https://www.pixellab.ai/docs
- https://www.pixellab.ai/llms.txt
- https://www.pixellab.ai/llms-full.txt
- https://www.pixellab.ai/pixel-art-vfx-generator
- https://www.pixellab.ai/pixellab-api
- https://api.pixellab.ai/v2/llms.txt
- https://api.pixellab.ai/v2/openapi.json
- https://www.pixellab.ai/docs/ways-to-use-pixellab
- https://www.pixellab.ai/docs/getting-started
- https://www.pixellab.ai/docs/installation
- https://www.pixellab.ai/termsofservice
- https://www.pixellab.ai/privacypolicy
