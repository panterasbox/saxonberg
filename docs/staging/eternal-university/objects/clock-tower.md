# Object — the Terminus terminal clock tower (staging)

> **Status:** staging draft (full object spec). Added 2026-07-12.
> **Belongs to:** the **Terminus terminal** (the TPA station), `east` across
> the street from Gus's room — *not* Gus, and not the plaza. It earns its
> keep by being **seen from** Gus's room.
> **Target seed paths:**
> - `ClockTower` (or a `Timekeeping` clock-face fixture) → `mud/obj/`,
>   seeded onto the terminal exterior under `/domain/terminus/terminal/`.
> - The plaza's live **`tower` detail** → the `plaza.yaml` `details:` block
>   (a dynamic description that reads the tower's `currentReading()`).
> **Depends on:** the **`Timekeeping`** capability + `Watch`
> (`pocket-watch.md`) — the tower is its **accurate sibling**; the
> **`WorldClockApi`** (ground truth) + `DefaultCalendar` (format).
> **Retire when:** the accurate-clock class + the terminal seed + the plaza
> `tower` detail are cemented. Then delete.
>
> The station clock — a genre convention of transit terminals — chosen for
> one reason: it is the **accurate foil that makes Gus's watch visibly
> drift**, with zero UI. Two clocks across a street, disagreeing.

A civic clock face high on the Terminus terminal, readable from across
University Avenue. Where Gus's pocket watch keeps *his own* drifted time, the
tower keeps *the* time — the standard the whole station runs on.

---

## Why it exists — the drift, made legible

Gus's watch drifts (it runs but is never `set`; see `pocket-watch.md`). A
drift no one can *check* is invisible. The tower is the check: posted
opposite him, showing true civic time, it turns the watch's error from a
hidden field into something a player can **see** — by looking at the tower,
then (if they ever get a look at it) at Gus's watch, and doing the
subtraction themselves. No tell, no overlay; just two faces that don't agree.

It stays a **deep cut** on purpose: Gus's watch is on his person (room-scope
`get` only, no `steal` verb), so you rarely get a look at it. The
tower-vs-watch discrepancy rewards a close examiner; it is never shoved at
anyone — of a piece with the hidden **AUGUSTUS** and the sourceless sky.

---

## The two Authorities, two clocks

The theme the object carries, never stated: the **Teleport** Authority
(institutional, civic, precise) keeps perfect time on a tower everyone can
see; the **Crossing** Authority (one self-appointed man) keeps drifting
personal time on a watch he hides his name inside. Institutional-accurate vs
personal-wrong, posted across a street from each other. The tower is *truth*;
Gus's watch is *the lie* — which is the whole reveal, and it rhymes straight
into the badge/watch identity pairing.

---

## Form — the accurate `Timekeeping` sibling

This is the second consumer of the `Timekeeping` capability, and the
**accurate** implementation `pocket-watch.md` named ("an accurate watch is a
*different class*, not a `rate=1` variant"):

- Composes **`Timekeeping`** — `currentReading(): Time | null`, but
  implemented as **`WorldClockApi.now()` directly** (formatted via
  `DefaultCalendar`). **No `setTo`/`setAt`/`rate`, no mainspring** — it cannot
  drift and cannot wind down. It is the civic reference.
- Composes **`Visible`** — the tower/face as seen from the street.
- **Never `null` in practice** (a tower face isn't lidded); the contract
  keeps the `| null` return only so it satisfies the same read-seam as the
  watch. (A future dark-night / fog case could return `null` under the
  distant-perception model — see v2.)

It proves the capability's whole point: **one read-contract composed onto a
drifting pocket watch and an accurate civic tower at once** — heterogeneous
classes, one `MixinApi.hasMixin(x, Timekeeping)` read. (And `pocket-watch.md`
foresaw the tower specifically as *a `Location`* — the enterable bell-tower —
which is the v2 below.)

---

## How the drift-reveal is wired (v1 — no distant-perception engine needed)

The honest catch: reading a clock in *another room* (the terminal, a
different zone) from Gus's room is exactly the **sight-scope /
distant-landmark perception** the `tally` v1 deferred — and it's unbuilt. The
minimal v1 sidesteps it with an **authored dynamic detail**, not a general
engine:

- The tower is a `Timekeeping` fixture at a known path on the terminal.
- The plaza carries a **`tower` detail** whose description is **dynamic**: it
  resolves the tower object by path and renders its live `currentReading()`
  — the same `getMarkupLong`-recompute pattern the watch's own dial uses.

So from the plaza:
- `look tower` → *"across the street the terminal clock reads **4:12**"* (true
  time, pulled live each look).
- a look at Gus's watch, if you ever get one → *"**4:07**"* (drifted).
- the player subtracts.

No cross-room perception of the *player* — just a live cross-object *read*
from an authored detail. Buildable the moment `Timekeeping` exists.

---

## Ties — the station's civic time

The tower is the terminal's authoritative clock, so it's the natural face of
the **departures board's** civic time (the fast-travel timetable already
rides `WorldClockApi`). One accurate reference for the whole station; Gus's
drift is the single local exception to it, ten feet away.

---

## Scope note

This steps one foot across the street into the **terminal** (a second
location, a different zone) — a deliberate, small relaxation of the
"one room" boundary. Justified because the tower is **not terminal content
for its own sake**: it's the plaza's drift-reveal that happens to be mounted
on the building opposite. It stays in service of Gus's room.

---

## What this surfaces (build list)

- **The accurate `Timekeeping` class** (`ClockTower` / clock-face fixture) —
  `currentReading() = WorldClockApi.now()`, no drift. A **thin second
  consumer** of the `Timekeeping` mixin already built for the watch.
- **The plaza `tower` detail** — a dynamic description resolving the tower and
  rendering its live reading (the drift-reveal seam).
- *(reuses)* `Timekeeping`, `WorldClockApi`, `DefaultCalendar`, `Visible`, the
  global `look`, and the dynamic-`getLong` pattern the watch establishes.

---

## What degrades / v2

- **v1 (ships with the watch):** the accurate face + the plaza dynamic detail.
  The drift-reveal works in full. **Do not** hardcode a static "the clock
  reads X" string — that's the exact flavor-only fake the props-real rule
  forbids, and since `Timekeeping` is being built for the watch anyway, the
  live face is nearly free.
- **v2 (deferred):** the **tower as an enterable `Location`** (a climbable
  bell tower — the `pocket-watch.md` "a clock tower is a `Location`" case);
  and the **general distant-landmark perception** system (readable faces /
  skylines from adjacent rooms) that retires the authored plaza detail in
  favor of a real "you can see the tower from here" mechanism.

---

## Open dials

1. **Perfectly accurate, or a hair of civic drift?** *Lean perfect* — it's
   the reference against which Gus is wrong; a second drift muddies the
   reveal.
2. **The hour-chime.** A clock tower that **chimes the hour** would be a
   natural **second consumer of the `AudibleMixin`** primitive (after Gus's
   whistle) — a real heard event across the avenue. *Banked* — nice, not
   needed for the reveal; light it up once Audible lands.
3. **Face vs enterable tower** — *v1 face; v2 Location* (above).
4. **12h vs 24h face** — cosmetic; match whatever `DefaultCalendar` renders,
   and keep it consistent with Gus's watch so the comparison is clean.
