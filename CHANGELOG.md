# Changelog

All notable changes follow Semantic Versioning. Each release uses these categories as needed: Added, Changed, Fixed, Removed, Security, Documentation, Translations, Migration / Breaking Changes, Known Issues.

## [Unreleased]

## [0.2.0]

### Added

- Characters from a description, with eight animations and 1, 4, 8, or 16 directions.
- 2D top-down, side-scroller, isometric, and 3D voxel maps, with tile painting and Wang tilesets.
- Local MCP stdio server and a Connect AI screen, so AI clients can create effects, characters, tilesets, maps, and projects.
- Import of JPEG, WebP, BMP, AVIF, and Aseprite files.
- Export to animated WebP, Aseprite, and BMP, TGA, and JPEG sequences, and to Tiled JSON, GLB, and OBJ for maps.
- Open project button, the full recent list, and canvas, frame count, and FPS controls in the Studio.

### Changed

- English is now the default language on every system.
- The license now matches MineOffice: earning money with the app is allowed, and selling the app is not.
- Export length follows the timeline.
- New project folders are numbered when a name is taken.

### Fixed

- Custom sprites now really replace the stock character.
- Sprites load as soon as a project opens, so reopened projects keep them in preview and export.
- Export stops and says why if a layer fails or a sprite is missing, instead of writing incomplete files.
- Directional exports line up, and their metadata gives the real pivot.
- Leaving or closing with unsaved work asks first, and an edit made during a save is no longer dropped.
- Export's Back button returns to the screen that opened it.

### Removed

- Save to My Effects in Quick Look, which was lost when you left. It remains in the Studio.

### Security

- Oversized GIF frames, huge option values, and oversized project files are refused, so a shared file cannot crash the app.
- A failed render no longer hangs the app, and a crashed window reloads.
- Full third-party license texts ship with the app.

### Known Issues

- Installers are unsigned, so macOS and Windows show a warning.
- Automatic updates are not available yet.
- Keyframe editing, pivot and crop controls, front and back lanes, UI scale, and shortcut remapping are not built yet.
- Generators are rule-based, so characters and maps do not match the range of an image AI service.
- Formats have not been tested inside real game engines, and Thai copy and usability have not had a human review.

## [0.1.0]

Internal candidate. It was never published.

### Added

- Offline library of 244 pixel art effects from pixelfx, with live tiles, search, and categories.
- Opening effect that can be skipped, is shorter on later launches, and respects reduced motion.
- Quick Look with palettes, speed, backdrops, seeds, and direct export.
- Studio with layers, versions, My Effects, a timeline, an act lane, and undo.
- Local Effect Composer that reads Thai and English, and shows what it could not use.
- Sprite import, attachment, aura, glow, light, and recolor, plus custom sprites as characters.
- Export to sprite sheet + JSON, PNG sequence, GIF, APNG, and game pack ZIP, with 1, 4, 8, or 16 directions and normal maps.

### Translations

- English and Thai interface, including names and descriptions for all 244 effects.

### Known Issues

- Installers are unsigned, so macOS and Windows show a warning.
- Effects that paint on the character include the stock character unless a custom sprite replaces it.
- Automatic updates are not available yet.
- Export format support has not been tested inside real game engines.
- Thai copy and usability have not yet had a human review.
