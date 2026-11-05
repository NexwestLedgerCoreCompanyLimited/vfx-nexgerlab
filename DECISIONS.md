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
