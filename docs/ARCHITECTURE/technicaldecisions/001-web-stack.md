# 001 - Web Stack Selection

**Date:** 2026-03-10
**Status:** Accepted

## Context

We needed a technology stack for building a browser-based incremental/idle game. The game requires complex state management (managing resources, upgrades, timers, and multiple entities), frequent UI updates (ATB bars, damage numbers), and the ability to handle very large numbers (typical of idle games).

## Decision

We chose the following specific web stack:

1. **Vite + React (TypeScript):** React's component-based architecture is ideal for the complex UI of an RPG, allowing us to build reusable components like `EntityRoster` and `CombatLog`. TypeScript provides essential type safety, crucial for managing the complex game state and ensuring entities adhere to specific shapes (see `Entity` interface). Vite provides an extremely fast development server and optimized production builds.
2. **State Management (`zustand` + compatibility provider):** The current implementation uses a provider-backed `zustand` store instance for gameplay state, exposed through selector-friendly hooks in `src/game/store/`. This keeps test isolation and the existing `GameProvider` integration path while allowing components such as the header, combat log, shop, and dungeon panels to subscribe only to the slices they actually render. The ATB loop still runs on a `setInterval`, but the simulation now advances through store actions and pure helpers in `src/game/engine/` rather than a monolithic React state reducer. See [002 - State Management Evolution](002-state-management-evolution.md).
3. **decimal.js:** Idle games often quickly scale past the safety limits of standard JavaScript Numbers (Number.MAX_SAFE_INTEGER). We adopted `decimal.js` for all core values related to stats, health, damage, gold, and experience to prevent overflow errors and precision loss as numbers grow exponentially.
4. **Tailwind CSS v4 + shadcn/Base UI + CSS Variables:** The current UI stack uses Tailwind utility classes for most layout and visual styling, shadcn/Base UI primitives for reusable components, and CSS variables in `:root` for theme tokens. This combination has proven faster for iterating on the game's panel-heavy RPG UI while still preserving a coherent dark-theme token system.
5. **GitHub Pages Compatibility:** The Vite `base` option is set to `/idle-dungeon-crawler/` so that production builds work correctly when served from `https://deadronos.github.io/idle-dungeon-crawler/`. A CI workflow deploys on `v*` tags.
6. **Vitest + Testing Library:** We use Vitest for unit, component, and integration tests, paired with Testing Library and `jsdom` for React-focused verification. We intentionally do not maintain automated end-to-end browser tests yet; manual in-browser verification is sufficient for the current prototype stage.

## Consequences

- **Easier:** Rapid UI development, strict type enforcement prevents many runtime errors related to stat calculations, and `decimal.js` future-proofs the game's economy. Tailwind plus component primitives also makes it faster to iterate on the dense battle UI.
- **Difficult:** `zustand` removes the worst full-tree rerender pressure, but the game still performs frequent immutable updates across `party` and `enemies`. As combat systems multiply, we will need to keep selector boundaries disciplined and continue extracting pure engine helpers to avoid regressing into a giant all-knowing store file.
