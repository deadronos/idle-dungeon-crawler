# 013 - Regional Progression and Ascension Direction

**Date:** 2026-03-15
**Status:** Proposed

## Context

The current balance and progression work now treats the shipped dungeon as a **first-region target band of Floors `1-50`** rather than as a forever-global floor ladder.

Within that band, **Floors `30+` are first-region endgame**. Some farming of safer floors for XP and equipment is acceptable before breaching the deeper late-region checkpoints or finishing the region.

If the game later expands into additional towers or regions, a single global floor number and the current Hero Souls layer will not scale cleanly forever:

* future regions may want enemies that are orders of magnitude stronger
* later regions may need new enemy rosters, archetypes, bosses, or mechanics
* the current hero level curve and current Hero Souls upgrades are useful for first-region pacing, but should not be the only answer for every future region

## Proposed Direction

### 1. Treat regions or towers as local floor bands

Each region should own its own local floor range rather than extending a single endless floor ladder.

Examples:

* **Dank Cellar:** Floors `1-50`
* **Forgotten Tunnels:** Floors `1-50`
* later towers or regions can follow the same pattern

Under this model:

* the local floor number communicates intra-region pacing
* the region or tower itself communicates the next macro-difficulty step
* balance targets stay readable instead of forcing global floor numbers to carry all future scaling weight

### 2. Keep the first region generous enough to finish as a self-contained band

The current first-region balance target should support a complete `1-50` experience without expecting one perfectly linear "beat the next floor immediately forever" curve.

The intended interpretation is:

* early and mid-region floors should usually progress with limited friction
* Floors `30+` are endgame for the first region
* some farming of XP and equipment before breaching deeper late-region checkpoints is acceptable

This gives the current balance issues a clearer scope: make the first region feel fair and legible first, then hand future power escalation to future systems instead of overloading today's curves.

### 3. Add Ascension above Hero Souls for cross-region scaling

Hero Souls remain the current prestige layer for retirement, early catch-up, and first-region tuning.

A future **Ascension** layer should sit above Hero Souls to provide a higher-order scaling path for later regions.

Preferred direction:

* Ascension should **amplify or extend** the value of Hero Souls rather than making soul investment feel invalidated
* if Ascension resets region progress or soul-spend state, it should compensate players through conversion, amplification, or new unlock tracks

Candidate Ascension outputs:

* Hero Soul gain amplification
* stronger or extended Hero Soul upgrade tracks
* access to new upgrade categories that do not fit the current Altar of Souls
* talent-cap or build-cap expansion
* future-region unlocks
* cross-region scaling help against stronger enemy stat bands and new enemy families

### 4. Use Insight and other current tuning levers for first-region pacing, not infinite future scaling

The current Insight / XP tuning can and should be rebalanced so that higher first-region levels such as the high 20s, 30s, 40s, and eventually 50 feel reachable in reasonable time spans.

But Insight should not be treated as the sole long-term answer for every future region. First-region pacing and cross-region progression are different layers of the design.

## Consequences

### Positive

* current balance work can target a clear first-region scope (`1-50`)
* late first-region pacing can deliberately allow some farming instead of pretending every deep checkpoint must be beaten immediately
* future content can introduce new region identity, enemy types, and stronger macro scaling without breaking readability
* Ascension provides a cleaner place for future meta-progression than endlessly inflating the current Hero Souls layer

### Tradeoffs

* region transitions will need explicit save, UI, and content-pipeline support
* Hero Souls and Ascension must be messaged carefully so players understand what is kept, reset, amplified, or converted
* future balance validation will need to distinguish first-region assumptions from cross-region assumptions

## Follow-up Direction

This record suggests two major follow-up tracks after the current first-region balance issues are resolved:

1. **Regional progression architecture**
   * define how regions/towers own local floor bands, enemy families, and handoff rules
   * now specified in [015 - Regional Progression Architecture](015-regional-progression-architecture.md)
2. **Ascension meta-progression design**
   * define how Ascension interacts with Hero Souls, scaling, resets, and future-region unlocks
   * tracked in issue `#100`
