# Agent Instructions

Welcome to the **Idle Dungeon Crawler** project! As an AI agent working on this repository, please adhere to the following guidelines:

## Documentation First

We maintain a strict alignment between our architecture documentation and implementation. Instead of hard-coding extensive technical context here, this document serves as a pointer to the definitive sources of truth.

**Primary Sources of Truth:**
- 📂 **Architecture & Tech Stack:** `docs/ARCHITECTURE/technicaldecisions/`
- 📂 **Game Design & Mechanics:** `docs/ARCHITECTURE/gamedecisions/`

## Core Responsibilities

1. **Read the Docs:** Before proposing major structural or mechanical changes, review the relevant `00X-*.md` decision records in the `docs/ARCHITECTURE/` folder.
2. **Align Implementation:** Keep the codebase and documentation in sync.
3. **Proactive Updates:** 
   - If you modify how a core system works (e.g., combat calculations, new stats, UI layout paradigms), you *must* update the corresponding decision record.
   - If you notice a misalignment between the current implementation and the documentation, surface this discrepancy to the user immediately or propose an update to rectify it.
   - Consider updating documentation alongside every major feature commit.

By adhering to these rules, we ensure the project remains maintainable and understandable as it scales.
