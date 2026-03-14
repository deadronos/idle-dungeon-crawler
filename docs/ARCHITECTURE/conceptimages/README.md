# Concept Images

This folder contains the current visual baseline for the **Idle Dungeon Crawler** UI.

Use these screenshots as the canonical reference when reviewing future changes to:

- visual theme
- layout and spacing
- component styling
- panel hierarchy and information density
- overall screen composition

## Current baseline set

These images were captured from the running app at a desktop viewport of `1600×1200`.

- `001-character-creation.png` — initial hero creation screen
- `002-dungeon-view.png` — main dungeon gameplay view with the bottom-anchored, resizable `Log` panel visible and floating combat callouts active near unit portraits
- `003-shop-sanctum-upgrades.png` — upgrade shop, `Sanctum Upgrades` tab
- `004-shop-altar-of-souls.png` — upgrade shop, `Altar of Souls` tab
- `005-dungeon-events-view.png` — main dungeon gameplay view with the bottom-anchored `Events` panel visible and combat outcomes like `Dodge` surfaced inline
- `006-dungeon-hover-tooltip.png` — dungeon gameplay view with the entity hover tooltip expanded, showing grouped attributes and elemental resistances without truncation

## Naming convention

Keep files ordered and descriptive using this pattern:

`001-description.png`

Examples:

- `005-mobile-menu.png`
- `006-settings-modal.png`

## Maintenance notes

When the intended UI changes materially:

1. Re-capture the affected screen states from the running app.
2. Replace or extend the screenshot set so it reflects the newest approved working UI.
3. Update this README so the file list and descriptions stay accurate.
4. Compare proposed UI changes against the current baseline before finalizing visual adjustments.

## Scope

The current set covers the distinct top-level screens and tab states presently available in the app:

- character creation
- dungeon view with `Log`
- dungeon view with `Events`
- shop overview via `Sanctum Upgrades`
- shop prestige view via `Altar of Souls`
- entity hover details in the dungeon roster
