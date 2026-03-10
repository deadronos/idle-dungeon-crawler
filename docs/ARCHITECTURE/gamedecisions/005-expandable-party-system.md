# 005 - Expandable Party System

**Date:** 2026-03-10
**Status:** Proposed

## Context

The currently accepted party model in [001 - Player Classes and Party System](001-player-classes.md) assumes that every run begins with a fixed trio: one player-selected leader plus the remaining two classes as auto-filled companions.

Issue [#4](https://github.com/deadronos/idle-dungeon-crawler/issues/4) proposes a different progression loop:

* The player should begin with a single adventurer.
* Additional party slots should be earned over time rather than granted immediately.
* New adventurers should be recruited after a slot is unlocked instead of appearing automatically at character creation.

This proposal shifts party composition from a static starting-state decision into a long-term progression system. That impacts character creation, the upgrade shop, run persistence, balance expectations, and the existing assumptions captured in [004 - Progression, Leveling, and Scaling](004-progression-and-scaling.md).

## Proposed Decision

We propose replacing the fixed three-hero starter party with an expandable party system that begins with one hero and grows through permanent progression.

### Starting Party and Party Cap

* Character creation starts a new run with exactly **one** custom hero: the player chooses the name and class of the party leader.
* The active party capacity begins at **1**.
* The long-term target cap for the first implementation is **5** active heroes.
* Duplicate classes are allowed once the party grows beyond the original Warrior / Cleric / Archer trio.

### Party Slot Expansion

Additional party slots are unlocked through a combination of progression milestones and gold spending.

* A slot cannot be purchased until the player has reached the required milestone floor at least once.
* Reaching the milestone alone is not enough; the player must also pay gold in the shop to permanently unlock the slot.
* Unlocked slots persist across wipes.

The initial proposed slot ladder is:

| Unlocks Capacity | Milestone Floor Reached | Gold Cost |
| --- | --- | --- |
| 2 heroes | Floor 5 | 60 |
| 3 heroes | Floor 10 | 180 |
| 4 heroes | Floor 20 | 500 |
| 5 heroes | Floor 35 | 1200 |

These numbers are **provisional** and should be treated as playtesting targets rather than final balance commitments.

### Recruitment

Unlocking a slot increases capacity, but it does not automatically grant a new hero.

* New heroes are recruited from the **Upgrade Shop**.
* The player chooses the recruit's class when recruiting.
* Recruits join the active party immediately if there is open capacity.
* Recruits benefit from the current persistent meta upgrades at the time they are added.
* The first implementation should use generated default names for recruits rather than introducing free-form naming inside the shop flow.

### Persistence Through Wipes

This proposal keeps the current wipe loop as a run reset, not a full roster reset.

After a party wipe:

* Floor resets to `1`.
* Unspent gold resets to `0`.
* All current party members are restored for the next run.
* Hero levels remain intact.
* Purchased persistent upgrades remain intact.
* Unlocked party slots remain intact.
* Recruited heroes remain in the active party.

To support milestone-gated slot unlocks, the game should track the highest floor reached as persistent progression state.

### Relationship to Existing Decisions

If this proposal is accepted and implemented, it will amend the following accepted decisions:

* [001 - Player Classes and Party System](001-player-classes.md) — specifically the assumption that every run begins with a balanced three-hero starter party.
* [004 - Progression, Leveling, and Scaling](004-progression-and-scaling.md) — specifically the definition of persistent progression and the role of the shop in party growth.

Until implementation is complete and this decision is accepted, those earlier records remain the source of truth for shipped behavior.

### First-Version Scope Boundaries

The first version of this system should intentionally stay narrow:

* No inactive bench or reserve roster.
* No new hero classes.
* No free-form recruit naming in the shop.
* No prestige-system redesign beyond preserving unlocked slots and recruited heroes.

## Consequences

* **Easier:** The player gains a clearer sense of long-term growth because party expansion becomes a visible reward path rather than a one-time starting grant.
* **Easier:** The Upgrade Shop becomes a more meaningful strategic hub because it now governs both stat upgrades and roster growth.
* **Difficult:** Early-game balance must be re-tuned for solo starts so the first few floors remain survivable and rewarding.
* **Difficult:** Encounter generation and roster UI may need to scale beyond the current assumptions that naturally fit a three-hero party.
* **Difficult:** Tests and state management become more complex because party size is now dynamic and persistent across wipes.
