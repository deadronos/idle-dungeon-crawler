# 015 - Regional Progression Architecture

**Date:** 2026-03-26
**Status:** Accepted

## Context

[004 - Progression, Leveling, and Scaling](004-progression-and-scaling.md) now treats the shipped dungeon as a **first-region** progression band with a target range of Floors `1-50`.

[013 - Regional Progression and Ascension Direction](013-regional-progression-and-ascension-direction.md) established the higher-level direction that future content should move away from one endless global floor ladder and instead let each region or tower own its own local floor band.

Issue `#99` requires the next layer of specificity:

* define the region or tower data model
* define how a run hands off from one region to the next
* define how local floor ranges interact with macro difficulty progression
* define how region-specific enemies, bosses, milestones, and visuals fit into that model
* define how late first-region farming fits into region completion without forcing first-region balance to pretend it supports infinite global scaling

This issue does **not** implement Ascension, change current first-region slot gates, or rebalance first-region XP/Insight.

## Decision

### 1. Regions own local floor bands and replace the infinite global ladder as the main content container

Future post-50 content should be authored as **regions** (or towers that use the same runtime model), each with its own local floor range.

The canonical first examples are:

* **Dank Cellar:** Floors `1-50`
* **Forgotten Tunnels:** Floors `1-50`
* future Region `3+` content should continue using the same pattern

The local floor number communicates where the player is **inside that region**. The region itself communicates the next macro-difficulty step.

That means the player-facing progression model becomes:

* `Region 1 / Floor 1-50`
* `Region 2 / Floor 1-50`
* `Region 3 / Floor 1-50`
* and so on

instead of one endlessly increasing global floor index.

### 2. Region content should be defined through an explicit region-definition model

Each region should be authored from a single region-definition record. The exact runtime field names can evolve, but the model should carry these concepts:

* `id`
* `name`
* `order`
* `localFloorStart` and `localFloorEnd` (currently expected to be `1` and `50`)
* `backgroundAsset` or equivalent visual theme identifier
* `enemyRoster` / enemy-family pool
* `bossFloorRules`
* `milestoneDefinitions`
* `completionFloor`
* `nextRegionId` or equivalent unlock target

Minimum expected milestone definitions per region:

* party-capacity or structural unlock checkpoints, if that region uses them
* equipment-tier or economy checkpoints, if that region uses them
* major boss checkpoints
* region-completion checkpoint

This keeps future regions data-driven enough to own their own:

* stronger stat bands
* different enemy rosters
* different bosses
* different structural milestones
* different art/background presentation

without forcing those differences to be inferred from a giant global floor number.

### 3. Runtime progression should track region and local floor separately

The live run model should stop treating "current floor" as the only progression coordinate.

At minimum, runtime and save-safe progression should be able to answer:

* which region the player is currently in
* which local floor they are currently on inside that region
* the highest local floor cleared for each unlocked region
* which regions are unlocked or completed

If a derived "global depth" number is ever useful for analytics or internal sorting, it should remain an internal convenience value rather than the primary authored pacing surface.

The canonical player-facing progression state should therefore be:

* `currentRegionId`
* `currentRegionFloor`
* per-region completion/unlock progress

not a forever-global `Floor 137` style expectation.

### 4. Macro difficulty progression happens at the region boundary, not by stretching first-region formulas forever

Local floors still handle **intra-region** pacing:

* floor-to-floor encounter count changes
* local enemy stat growth
* local boss cadence
* local milestone timing

The **region transition** handles the next macro jump:

* stronger baseline enemy stat bands
* new enemy families and encounter scripts
* region-specific boss packages
* new milestone structures
* new reward tables or progression incentives

This means Region `2` does **not** need to pretend it is just "global Floor `51+`" with the same first-region assumptions scaled upward forever.

Instead, Region `2` can restart its local pacing at Floor `1` while still being materially harder than Region `1` because the region-definition itself owns a stronger baseline.

### 5. First-region completion unlocks the next region, but does not invalidate first-region farming

Clearing a region's completion floor should unlock the next region in the sequence.

For the current planned path, that means:

* clearing **Dank Cellar Floor `50`** unlocks **Forgotten Tunnels**
* the player may then choose to enter Forgotten Tunnels at its local Floor `1`

However, unlocking the next region should **not** remove access to the completed region.

Late first-region farming remains valid after completion for goals such as:

* finishing first-region Hero Soul plans
* farming XP on safer Floors `30+`
* farming first-region equipment or gold before attempting Region `2`
* smoothing the transition for players who unlock the next region before they feel ready to push it immediately

The handoff rule is therefore:

1. finish the current region's completion checkpoint
2. unlock the next region
3. allow the player to select between the completed region and the newly unlocked region
4. preserve per-region highest-floor progress independently

This keeps first-region balance focused on delivering a complete and farmable `1-50` experience rather than pretending the player must instantly abandon Region `1` the moment Region `2` unlocks.

### 6. Milestones are region-local, not globally inherited forever

Milestones should be authored within each region's own floor band.

That means Region `2` may:

* reuse a similar `10/20/30/40/50` boss cadence
* use different structural unlock floors entirely
* omit certain first-region milestone types
* introduce new region-specific gates or rewards

The important rule is that milestone meaning comes from:

* the **region definition**
* the **local floor within that region**

not from "every global Floor `28`-like checkpoint must mean the same thing forever."

This keeps Issue `#89`'s first-region slot-gate tuning separate from future-region architecture. Region `2+` may choose their own structural gates without retroactively forcing a first-region rebalance in this issue.

### 7. Visuals should also be region-owned

Backgrounds and other environmental presentation should map to the active region-definition rather than to raw floor depth.

That keeps the content pipeline aligned with the progression model:

* **Dank Cellar** owns its current background and visual identity
* **Forgotten Tunnels** owns its already-prepared Region `2` background
* future Region `3+` content should add its own background/theme assets through the same region-definition hook

This avoids a later mismatch where gameplay transitions become region-based but the visual pipeline still assumes one endless dungeon backdrop.

## Consequences

### Positive

* first-region balance can stay focused on a complete, farmable `1-50` experience
* post-50 content gains a clean content container for stronger enemy bands, new rosters, and new bosses
* regional visuals, rewards, milestones, and encounter families can all travel together in one authored definition
* save/UI work can distinguish "where am I now?" from "what have I completed before?" on a per-region basis

### Tradeoffs

* progression persistence must store per-region progress rather than only one floor index
* UI flow will need an eventual region-selection surface after a new region is unlocked
* balance validation must distinguish first-region assumptions from second-region assumptions even when both use local Floors `1-50`

## Follow-up Alignment

This decision clarifies the intended order of future work:

1. **Implement region-aware progression/runtime support**
   * add explicit region definitions and per-region progress tracking
   * move encounter/background/milestone lookup to the active region-definition
2. **Implement region handoff UX**
   * expose newly unlocked regions without removing access to completed ones
3. **Design Ascension separately**
   * Ascension remains the higher-order meta-progression layer discussed in [013 - Regional Progression and Ascension Direction](013-regional-progression-and-ascension-direction.md)
   * this record intentionally does not define Ascension resets, rewards, or conversion rules
