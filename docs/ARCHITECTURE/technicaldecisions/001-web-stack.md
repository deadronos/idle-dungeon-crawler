# 001 - Web Stack Selection

**Date:** 2026-03-10
**Status:** Accepted

## Context

We needed a technology stack for building a browser-based incremental/idle game. The game requires complex state management (managing resources, upgrades, timers, and multiple entities), frequent UI updates (ATB bars, damage numbers), and the ability to handle very large numbers (typical of idle games).

## Decision

We chose the following specific web stack:

1. **Vite + React (TypeScript):** React's component-based architecture is ideal for the complex UI of an RPG, allowing us to build reusable components like `EntityRoster` and `CombatLog`. TypeScript provides essential type safety, crucial for managing the complex game state and ensuring entities adhere to specific shapes (see `Entity` interface). Vite provides an extremely fast development server and optimized production builds.
2. **State Management (React Context, for the current prototype):** The current implementation uses React's built-in Context API (`gameState.tsx`) combined with `useState(INITIAL_STATE)` and a custom `useGame` hook. This has kept the prototype simple while preventing prop-drilling, and the core game loop currently runs in a `setInterval` inside a `useEffect` within the provider. However, because ATB and resource bars update on every tick, this provider has become the primary scaling pressure point. We expect to migrate hot simulation state to `zustand` once the prototype expands beyond a single-hero party and simple auto-attacks. See [002 - State Management Evolution](002-state-management-evolution.md).
3. **decimal.js:** Idle games often quickly scale past the safety limits of standard JavaScript Numbers (Number.MAX_SAFE_INTEGER). We adopted `decimal.js` for all core values related to stats, health, damage, gold, and experience to prevent overflow errors and precision loss as numbers grow exponentially.
4. **Tailwind CSS v4 + shadcn/Base UI + CSS Variables:** The current UI stack uses Tailwind utility classes for most layout and visual styling, shadcn/Base UI primitives for reusable components, and CSS variables in `:root` for theme tokens. This combination has proven faster for iterating on the game's panel-heavy RPG UI while still preserving a coherent dark-theme token system.
5. **Vitest + Testing Library:** We use Vitest for unit, component, and integration tests, paired with Testing Library and `jsdom` for React-focused verification. We intentionally do not maintain automated end-to-end browser tests yet; manual in-browser verification is sufficient for the current prototype stage.

## Consequences

- **Easier:** Rapid UI development, strict type enforcement prevents many runtime errors related to stat calculations, and `decimal.js` future-proofs the game's economy. Tailwind plus component primitives also makes it faster to iterate on the dense battle UI.
- **Difficult:** The current `GameState` context is a prototype-friendly but increasingly noisy place to run a high-frequency simulation. The ATB loop updates state 20 times a second, so a richer combat model would cause more React work than necessary unless state subscriptions become more selective. Iterating deeply nested arrays within the state (like `party` and `enemies`) also requires careful copying to maintain immutability.
