# CLAUDE.md — seattle-makers-tools

> Read this fully at the start of every session.

## What this is

<!-- One-liner. Long-form overview, goals, BOM, and decisions live in the
     vault: schmardware-vault/projects/<category>/seattle-makers-tools/_index.md -->

**Started:** 2026-08-27

## Current state

<!-- Where we left off, what's next. Update at the end of each session. -->

Project initialized.

## Logging what you learn

When something comes up that passes **"will this be useful to me in the future?"**, run **`/log`** — it routes the finding onto wiki and project pages in the vault.

Five shapes of yes:

- **Generalizable knowledge** — "here's how to estimate power for LEDs"
- **Tool quirks and patterns** — "here's how to flash a board with CircuitPython"
- **Parameters and paradigms that worked** — "here's a good tolerance for fitting dowels to 3D-printed parts"
- **Pitfalls to avoid** — "when using pygame, don't do X"
- **Project record** — what you used and what it cost

**Everything else stays here.** Mechanism and derivations, how an investigation went, decisions that reversed, constants that only mean something inside this project, this codebase's wiring — that's implementation detail. It belongs in this file under *Implementation notes*, or in a comment next to the code. `/log` will offer to put it here when it doesn't clear the bar.

Write vault entries as **flags, not explanations** — one line, terse enough to scan, specific enough to act on.

Nothing is captured automatically and there is no scratchpad. If `/log` isn't run, the session leaves nothing behind.

Use **`/quiz`** to test yourself on what's accumulated.

## Knowledge base

The vault at `../../../schmardware-vault/wiki/` accumulates findings, preferences, and reusable techniques across projects. **Check it before suggesting hardware/software choices** that might already be covered:

- `wiki/hardware/` — components, materials, tolerances, fabrication, suppliers
- `wiki/software/` — Fusion 360, PlatformIO, CircuitPython, dev tooling
- `wiki/game-dev/` — input, rendering, audio, physics, projection

When a relevant page exists, defer to the user's documented values and conventions. When your work surfaces something new (a measurement, a gotcha, a technique that worked or didn't), run `/log` to route it into the vault.

If the vault isn't reachable (project checked out standalone), proceed without it.
