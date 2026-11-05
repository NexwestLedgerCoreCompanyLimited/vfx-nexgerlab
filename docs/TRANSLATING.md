# Translating

Catalogs are in `src/renderer/src/locales/<locale>/`, with one JSON file per namespace: `common`, `editor`, `timeline`, `export`, `settings`, `composer`, `effects`, `errors`, and `help`.

1. Open a translation request with the issue form.
2. Copy `en/` to your locale and translate the values. Keep the keys and `{{placeholders}}` unchanged.
3. Add the locale to `src/renderer/src/locales/manifest.json`.
4. Add font notices to `THIRD_PARTY_NOTICES.md` if your language needs a new font.
5. Run `npm run test:i18n`.

A language ships only with full coverage and a named reviewer. List the change under Translations in the changelog.
