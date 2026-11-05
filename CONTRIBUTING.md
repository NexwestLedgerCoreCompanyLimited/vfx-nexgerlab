# Contributing

## Setup

```bash
npm ci
npm run dev
```

## Checks

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:e2e
```

## Rules

- Use Conventional Commits.
- Write the failing test first.
- Keep user-visible text in `src/renderer/src/locales`, in both English and Thai.
- Do not edit `src/engine/pixelfx/` without recording the change in its `PATCHES.md`.
- Never add accounts, analytics, or network calls.

Contributions are accepted under BSL 1.1, including its Change License. Translation requests use the issue form; see `docs/TRANSLATING.md`.
