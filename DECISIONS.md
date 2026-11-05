# Decisions

## 2026-11-05: Build on vendored pixelfx

**Decision:** Vendor `patch-gg/pixelfx` 0.3.0 at a pinned commit and build the Studio around it.

**Why:** It gives 244 tested, deterministic, DOM-free effects, and it matches the canonical render contract.

**Rejected:** Writing 19 effect families from scratch, because the effort goes to a library that already exists under MIT. Adding pixelfx as a dependency, because it is not on npm and releases need an auditable copy.

**Cost:** BSL does not cover the library. Product value must come from the Studio.

## 2026-11-05: oxlint instead of typescript-eslint

**Decision:** Use oxlint.

**Why:** typescript-eslint 8.72.1 requires TypeScript below 6.1, and the project uses TypeScript 7.

**Rejected:** Pinning an older TypeScript just for linting.

## 2026-11-05: Splash hold rule

**Decision:** The opening effect plays on a fixed timeline. It holds on the settled frame until the app is ready, and skips the remaining hold once it is ready and the wordmark is complete.

**Why:** The app loads almost instantly, so ending the moment it is ready would mean the opening effect never plays.

## 2026-11-05: Same license as MineOffice

**Decision:** Use the MineOffice BSL 1.1 terms: earning money with the software is allowed, and selling it is not.

**Why:** The owner wants one license across the portfolio. It replaces the earlier grant, which named game development and a Competing Product rule.

## 2026-11-05: Characters and maps are deterministic generators

**Decision:** Characters reuse the pixelfx 3D rig, recolored by body region. Maps use seeded noise. AI clients reach both through a local MCP stdio server.

**Why:** PixelLab uses hosted AI models. This app stays offline with no account, so an AI client supplies the intent and the app supplies repeatable output.

**Rejected:** Bundling an image model, because of size, hardware needs, and license risk.

**Cost:** Output has the range of the generators, not of a trained image model. Unknown words are reported, never guessed.

## 2026-11-05: Hand-written MCP transport

**Decision:** Implement newline-delimited JSON-RPC directly.

**Why:** The app needs only initialize, ping, tools/list, and tools/call, in about 60 lines, and the SDK adds a dependency tree to a security-sensitive path.
