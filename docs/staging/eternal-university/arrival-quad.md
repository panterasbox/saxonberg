# EU content — the bus stop (staging)

> **Status:** being designed live, with oversight.
> **Purged (2026-06-06):** the prior draft was a full campus sprint —
> Campus Gate, Tanelorn Walk, the Quad, BOB the statue, the
> ANARCHY INTERDIMENSIONAL storefront, the building frontages, `dawnstone`,
> the `urban` / `eternal-campus-grounds` biomes, the greeter — all written
> solo, never reviewed, and *past the gate* where we aren't yet. Gone. The
> concepts worth keeping live in `docs/slates/builds/eternal-university-slate.md`;
> we design the campus for real when we walk up there.
>
> **Where we are:** the TPA stop on **University Avenue**, in Terminus,
> just outside the campus gate.

## Decided
- **The geometry — one room, one exit.** University Avenue (the stop) is a
  **single `Location`** in the **Terminus zone**, holding the **TPA terminal**
  (arrival point), **Gus**, and **one exit** — the **gate** to campus. **No
  other exits:** it's a standalone landing room with no real Terminus city
  around it for the demo, so **"down the avenue" is pure description** (the
  unfinished, hazy edge — nothing to go to), *not* a blocked exit. Gus's
  "road's not finished" line is flavor over a no-exit, not a soft-wall
  mechanism. The "street" is the room's *described extent* — no sub-room space.
  **"Crossing" = taking the gate exit**; Gus's ritual is theater over that one
  traversal. Two ways in/out (TPA + gate) → **four movements** (see
  `npcs/crossing-guard.md` *The four movements* + `objects/crossing-log.md`
  *What counts*).
- **The gate is an inter-zone exit.** University Avenue is in **Terminus**;
  the campus is the **EU zone** — a *new zone with its own grid*. So the gate
  is a **zone-crossing portal** (built as an inter-zone exit, not an intra-grid
  step — the far side is the EU grid's entry coordinate, not UA's neighbor).
  Its **label is free — cardinal or named** (inter-zone doesn't force
  non-cardinal; a cardinal label is a cosmetic direction over the portal, not a
  grid-continuity claim). *Lean: name it (`gate`/`enter`).* **Destination = the
  EU zone's entry room** — TBD, a campus room, **not** the onboarding lounge.
- **Gus, the crossing guard** — `npcs/crossing-guard.md` *(character,
  dialogue, and behavior spec all worked).*
- **Gus's gear** — watch, whistle, STOP paddle, camp chair, crossing-log,
  thermos — each fully specced in `objects/`.

## To hammer out (the stop's templates — undesigned, no lingering drafts)
- the **TPA terminal** — the fast-travel node you arrive on (its *details*:
  the credential scan, the wire flow; the geometry/role above is decided)
- the **travel credential** — what you scan to use the network
- the **route map**
- the **timetable / street sign** — the stop's signage
- the **haze** — the deferred-city edge of University Avenue

Each gets hammered out together and captured *as decided*, or it doesn't
go in this doc.
