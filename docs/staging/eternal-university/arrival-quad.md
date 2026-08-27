# University Avenue — the crossing (Gus's room): build spec (staging)

> **Status:** build spec — reframed 2026-07-12. **Supersedes** the
> 2026-06-06 "bus stop / one-room-one-exit-to-campus" frame below and the
> stale "TPA terminal lives in this room" assumption (the Terminus terminal
> is now its **own built branch across the street** — see
> `/world/terminus/terminal/`). This doc is the **build-integration layer**
> over the already-written per-object sheets (`objects/*.md`) and the Gus
> character sheet (`npcs/crossing-guard.md`); it does not restate them.
>
> **Filename note:** `arrival-quad.md` is legacy. The room is a **city
> street**, not a campus quad — kept the filename only to preserve inbound
> references from the object/character sheets. Rename later if we do a
> staging sweep.
>
> **Scope law:** ONE room, and everything inside it. Campus interior,
> terminal interior, downtown/market/financial districts, the bank, and the
> entire census-murder narrative (the other `npcs/` + `experiences/` files)
> are **OUT**.

---

## 1. What the room is

One segment of **University Avenue** — a normal city street, and the
busiest crossing in Terminus, because the **TPA terminal empties onto it**.

- **Busy with transients, still of locals.** The crowd is **real player
  traffic** churning through the fast-travel hub — we **render no crowd**,
  model no ambient passers-by; the players supply the busyness. The city's
  own inhabitants have no reason to be here (their life is downtown, out of
  scope), so the street is loud with strangers and empty of neighbors.
  **Passage, not dwelling.** That stillness-under-the-churn is the one
  quality players *can't* supply, so it's what we author.
- **Gus is the single fixed presence** — the still point in a room defined
  by everyone leaving. His "stateless, every meeting is the first" design
  and his "guards a crossing no *local* uses" premise stop being quirks and
  become *true* at a transit hub.

### The design law for this room

This is a **second integrating vertical** (the Dave's-Bar pattern, for the
public-street / civic / device systems). Two rules:

1. **Exercise every subsystem we honestly can** in one room (see §6).
2. **No dead props. Every "off" state is a real condition on a working
   object.** Gus's watch genuinely winds and keeps time; if it's stopped,
   that's a modeled depleted-mainspring condition with a reason — not a
   fake. The thermos really holds hot coffee and really opens; Gus not
   opening it is *behavior*. The chair really seats; his not sitting is
   *behavior*.

---

## 2. Geometry & exits (AS BUILT — supersedes the stale E/W frame below)

> **Corrected geometry (as shipped, 2026-07-13).** University Avenue runs
> **east–west**; the **Gate/TPA terminal is SOUTH**, the **campus is NORTH**
> (per `terminus-city.md` §2). The earlier "east=terminal / west=campus"
> wording in this section was the stale frame and is replaced by the below.

- **Room:** `/world/eternal/university-avenue/crossing` — a
  `CartesianLocation` in the `university-avenue` `CartesianZone` (renamed
  from `plaza`; `primaryKeyword: crossing`, `shortDescription` stays
  `University Avenue`).
- **`south`** → `/world/terminus/terminal/arrival-gate` — **BUILT**. The
  terminal fronts the crossing to the south; players spill out of the
  arrival gate and cross **north**. Cardinal, cross-zone, reciprocal (the
  terminal side was re-cardinaled to `north`→here; the arrival alcove was
  swapped with the dead Departure Gate C so it fronts the avenue).
- **`north`** → the **university gate** (the EU campus) — **DEFERRED**. A
  **closed + locked `Door`** (`LockableMixin`; a real impassable boundary,
  not flavor). The lock vetoes traverse *before* destination resolution, so
  the destination may point at the unbuilt campus stub safely. Gus
  soft-walls it ("the gate's for the gown — not yet").
- **`west`** → the existing **bank** — **TEMPORARY reachable placeholder**
  (not destroyed, not rehomed) until downtown Terminus gives it a
  financial-district home.
- **`east`** → the avenue continues — an **unbuilt stub**, soft-walled
  in-fiction by Gus (no real exit that way).
- **Gus guards the S→N crossing** — the traverse from the terminal (south)
  to the campus gate (north). His ritual fires on the **south-side
  arrival** (the crossing itself).
- The old **`north → bank`** exit is **dropped** (north is now the locked
  campus gate; the bank moved to the west stub).

---

## 3. Object roster → subsystem → build bucket

Buckets: **DROP-IN** (concrete exemplar exists) · **COMPOSE** (new content
class over live substrate) · **NEW-PRIMITIVE** (a genuine new seam — see §4).

| Object | What it really does | Subsystem(s) | Bucket | Sheet |
|---|---|---|---|---|
| **Gus** | living NPC: paces, greets, runs the crossing ritual | Character + behavior + npc-dialogue + belief + vocal + soul + vitals + traits | COMPOSE (seed) | `npcs/crossing-guard.md` |
| **Thermos** | holds hot coffee (bulk), seals, keeps heat; opens; drinkable | `Flask` = Thermal+Sealable+Bulkable; Branded; Metabolism | **DROP-IN** (`Flask.ts`) | `objects/thermos.md` |
| **Pocket watch** | keeps + shows game-time; winds; runs down → stops | Wieldable Thing + **mainspring Reserve** + **game-time render** | COMPOSE + **NEW-PRIM** (render) | `objects/pocket-watch.md` |
| **Whistle** | emits a heard sound to the room | **Audible** object-sound seam | **NEW-PRIM** | `objects/whistle.md` |
| **STOP paddle** | held/raised in the ritual | Wieldable + Slottable (hand) | COMPOSE | `objects/stop-paddle.md` |
| **Camp chair** (the relief's) | really seats — Gus won't use it (behavior) | Postured furniture (`Floor` pattern) | **DROP-IN** | `objects/camp-chair.md` |
| **Crossing-log** | written tally of who crossed | Thing + read/write; seam → chronicle | **DROP-IN** | `objects/crossing-log.md` |
| **Public bench** | `sit` | Postured furniture | **DROP-IN** | — (new) |
| **Lamppost** | lights at dusk / extinguishes at dawn | LightSource + **Switchable** + clock-driven | COMPOSE + **NEW-PRIM** (Switchable) | — (new) |
| **Crossing beacon** | walk/stop state, toggled | Propertied state + **Switchable** + verb | COMPOSE + **NEW-PRIM** (Switchable) | — (new) |
| **Litter bin** | holds discarded things | Container | **DROP-IN** | — (new) |
| **Gutter litter** (ticket stub, flyer) | takeable; readable | Spatial take/drop + Detailed | **DROP-IN** | — (new) |
| **Street sign** ("University Avenue") | readable fixture | Adornment + Detailed | **DROP-IN** | — (new) |
| **Posters** (on the lamppost) | readable fixture | Adornment + Detailed | **DROP-IN** | — (new) |
| **Plane trees** (in grates) | examinable; sky-exposed | Detailed + Atmosphere | **DROP-IN** | — (new) |
| **Shuttered shopfronts / dark windows** | the physical "still of locals"; won't open | Boundary/Window (closed) + Detailed | **DROP-IN** | — (new) |
| **Terminal facade** (east) | the mouth players emerge from | Detailed (the exit is the real thing) | **DROP-IN** | — (new) |
| **Clock tower** (on the terminal, across the street) | shows accurate civic time — the foil that makes Gus's watch visibly drift | accurate `Timekeeping` fixture + a live plaza `tower` detail | COMPOSE (thin, once `Timekeeping` exists) | `objects/clock-tower.md` |
| **University gate + wall** (west) | closed, locked | `Door` + **LockedMixin** + Detailed | **DROP-IN** + lock add | — (new) |
| **The sky / weather** | real city sky; live weather | SkyExposed + Weather + Biome/Atmosphere | **DROP-IN** (running) | — (new) |
| **Gus's hi-vis uniform** | worn | `Garment` (Wearable) | **DROP-IN** | (in Gus sheet) |
| **Badge No. 001** | worn, readable, self-signed | Adornment/worn + Detailed | **DROP-IN** | (in Gus sheet) |

**The drift-reveal (watch vs tower).** The one deliberate reach across the
street: the terminal's **clock tower** (`objects/clock-tower.md`) shows
accurate civic time, and the plaza carries a live **`tower` detail** that
reads it. A player who looks at the tower and then (rarely) at Gus's watch
sees the two disagree — his watch's drift made legible with no UI. The tower
is the accurate `Timekeeping` sibling of Gus's drifting watch: two
Authorities, two clocks (Teleport keeps perfect time; Crossing keeps his
own). This is the **sole sanctioned exception** to "terminal is OUT" — it's
the plaza's reveal, mounted opposite.

---

## 4. The three new primitives (prerequisite builds)

Small, honest, **reusable** — the primitives this room *earns*. Build these
first; then every object above composes cleanly.

1. **Game-time render** — no in-world object currently *displays* the clock
   (Sundial/Sextant only *measure*). Build a `Clock`/`Watch` whose `examine`
   renders `WorldClockApi.getNow()` via `DefaultCalendar`. Pairs with a
   **`'mechanical'` mainspring `Reserve`** (`ReservedMixin` is proven
   non-biological by `Campfire.ts`): the spring depletes, `wind` refills it,
   and at zero the watch **stops** and shows its stop-time. This *is* the
   "Gus doesn't wind his watch" condition — real, not a fake prop.
2. **`AudibleMixin` / object-sound seam** — speech is creature-only; nothing
   lets an *object* emit a heard event. Build the seam: a scene with
   `meta.acousticDb` + a hearing modality routed through `MessageApi` to
   spatial sensors. Gus's whistle is the first driver; reusable for bells,
   alarms, doorbells. (The most substantial of the three.)
3. **`Switchable`** — a generic toggleable-state mixin (`light.md` deferred
   it). One build, two consumers here: the **lamppost** (on/off) and the
   **beacon** (walk/stop), plus every future device.

**Plus a hair:** **`LockedMixin`** over `Door` — the west gate is *locked*,
not merely shut. Small override; enforced on traverse.

---

## 5. The interaction / activity web

A visit, end to end, all in-room:

1. Player spills out of the terminal (**east**). Gus's **witness** brain
   fires the **crossing ritual**: whistle sounds (**Audible**), STOP paddle
   up (**Wieldable**), "hold" to traffic that isn't there, he walks them
   across with total gravity, "mind the kerb," and marks them in the
   **crossing-log**. Because arrivals are constant, this is the room's pulse.
2. They can **`talk to gus`** (dialogue tree), **`sit`** on the bench — or on
   his forbidden camp chair, to his quiet scandal (a small **regard**
   flicker), **`examine`** the fabric and his props (the **watch** shows the
   real game-time, *or* stands stopped; the **thermos** reads warm),
   **`take`** the gutter ticket-stub, **`read`** the sign and posters.
3. They try the **west** gate → **locked `Door`** + Gus's in-character
   soft-wall ("gate's for the gown, not yet").
4. They cross back **east** → counted out.
5. Underneath it all: **weather** and the **day/night lamppost** run
   continuously; Gus — **stateless** — greets every stranger fresh, because
   at a transit hub every face genuinely is a new one.

Reactions ride the ritual (players can `react` to Gus's performance); the
ritual itself is a short **engagement** (activity substrate).

**Two load-bearing rules on the ritual** (full detail in
`npcs/crossing-guard.md` *The movements*): (1) **tally is a deed, the ritual
is a performance — decoupled** — the crossing-log mark fires on the witnessed
arrival, never on the ritual finishing, so an aborted performance never loses
the count; (2) **the busy-hub case** — one Gus can't run N rituals at once, so
simultaneous arrivals queue and then **batch** ("the lot of you — mind the
curb"), while the tally still fires per-arrival. The whistle-beat is the first
driver of the **Audible** primitive; its pinned v1 contract lives in
`objects/whistle.md`.

---

## 6. Systems exercised (the integrating-vertical inventory)

Each lit by a *real* object or interaction above — no forcing:

spatial · location · zone · **boundary** (west gate, shopfronts) ·
**posture** (bench, chair) · **light** (lamppost) · **time** + **celestial**
(day/night, the watch) · **weather** + **biome** + **atmosphere** (the sky) ·
**thermal** (thermos, feel) · **bulk** (coffee) · **metabolism** (drink) ·
**vitals** (Gus, player) · **reserve** (mainspring; standing endurance) ·
**encumbrance** (carrying the picked-up litter) · **senses** + **perception**
(look, feel, **listen** to the whistle) · **messaging** · **belief /
recognition** (Gus's stateless memory) · **regard** (the chair gag) ·
**emotes / soul** + **reactions** (the ritual) · **comms / vocal** (talk) ·
**behavior** (Gus's brains) · **npc-dialogue** · **activity / engagement**
(the ritual) · **locomotion** (the crossing) · **fasttravel** (the east
arrival) · **detailed** · **adornment** (sign, posters, badge) ·
**embodiment** (worn uniform, wielded paddle) · **slot** · **media** (object
illustrations) · **prose** (templated descriptions) · **traits /
disposition** (Gus's personality drives the dialogue) · **corpo / brand**
(the branded thermos) · **address** (the room's `_address`) · **help** (verb
topics).

**Deliberately NOT exercised (honest scoping, with reasons):**
banking (the bank moved downtown), crafting / forums / chat / grouping /
contacts / social presence / scripting (not street-physical),
**employment** (Gus is *self-appointed* — the "Authority" is not official, so
he is on no roster: a real in-fiction condition, not an oversight),
renown / influence / participation (no natural driver here).

---

## 7. Suggested build order

1. **Primitives:** game-time render (+ mainspring `Reserve`), `AudibleMixin`
   sound seam, `Switchable`, `LockedMixin`.
2. **Object classes (compose):** `Watch`, `Whistle`, `Paddle`, `Lamp`,
   `Beacon`; `Thermos` (Flask is ready), bench + camp chair (Floor pattern),
   litter bin + litter, sign/posters (adornments), the locked west gate,
   crossing-log; Gus's uniform (`Garment`) + badge.
3. **Room seed:** flesh out `plaza.yaml` — fabric details, place the objects,
   confirm exits, `SkyExposed` + biome + `_address`.
4. **Gus:** Character seed + brains (idle / witness / soft-wall) + dialogue
   tree + stateless recognition; seed him wearing the uniform, wielding the
   paddle, carrying watch / thermos / whistle / crossing-log.
5. **The ritual:** wire the crossing ritual as an engagement; reactions ride
   it.
6. **Verify live:** walk it — arrive from the lounge, cross under Gus, exercise
   every object.

---

## Appendix — the superseded 2026-06-06 frame (kept for history)

The prior draft treated this as a **single room with one exit to campus and
no city around it** ("down the avenue is pure haze; crossing = taking the
gate exit; the TPA terminal lives in this room"). That is retired: the
Terminus terminal is its own built branch **across the street** (east), the
campus gate is **west**, and the avenue continues north/south to real (if
unbuilt) neighbors. An even earlier full-campus sprint (Campus Gate, Tanelorn
Walk, the Quad, BOB the statue, the storefronts, `dawnstone`, the biomes, the
greeter) was purged 2026-06-06 as past-the-gate content written solo and
never reviewed; its keepable concepts live in
`docs/slates/builds/eternal-university-slate.md`.
