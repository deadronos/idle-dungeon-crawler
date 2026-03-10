# 001 - Web Stack Selection

**Date:** 2026-03-10
**Status:** Accepted

## Context
We needed a technology stack for building a browser-based incremental/idle game. The game requires complex state management (managing resources, upgrades, timers, and multiple entities), frequent UI updates (ATB bars, damage numbers), and the ability to handle very large numbers (typical of idle games).

## Decision
We chose the following specific web stack:
1.  **Vite + React (TypeScript):** React's component-based architecture is ideal for the complex UI of an RPG, allowing us to build reusable components like `EntityRoster` and `CombatLog`. TypeScript provides essential type safety, crucial for managing the complex game state and ensuring entities adhere to specific shapes (see `Entity` interface). Vite provides an extremely fast development server and optimized production builds.
2.  **State Management (React Context):** We opted to use React's built-in Context API (`GameState.tsx`) combined with `useState(INITIAL_STATE)` and a custom `useGame` hook instead of a heavy external library like Redux. This keeps the data flow simple while preventing excessive prop-drilling. The core game loop runs in a `setInterval` within a `useEffect` inside the provider.
3.  **decimal.js:** Idle games often quickly scale past the safety limits of standard JavaScript Numbers (Number.MAX_SAFE_INTEGER). We adopted `decimal.js` for all core values related to stats, health, damage, gold, and experience to prevent overflow errors and precision loss as numbers grow exponentially.
4.  **Vanilla CSS & CSS Variables:** We chose direct CSS over preprocessors or tailwind for complete control over styling, relying heavily on CSS variables (`--bg-dark`, `--accent-gold`, etc.) defined in `:root` to enforce a consistent, premium dark theme and allow for easy future theming.

## Consequences
*   **Easier:** Rapid UI development, strict type enforcement prevents many runtime errors related to stat calculations. The use of `decimal.js` future-proofs the game's economy.
*   **Difficult:** The GameState context can become a bottleneck if not careful; the ATB loop updates state up to 20 times a second, which requires careful management to prevent React from re-rendering the entire DOM tree unnecessarily. Iterating deeply nested arrays within the state (like `party` and `enemies`) requires careful copying to maintain immutability.
