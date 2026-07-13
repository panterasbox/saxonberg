# University Avenue crossing — requirements

The one street-segment room a first-time player steps into coming out of
the TPA terminal into Terminus, on their way north to the university campus
for onboarding. It is a **stretch of University Avenue** — a normal city
street, the busiest crossing in Terminus because the TPA terminal empties
onto it — held by **Gus**, the self-appointed one-man Crossing Authority.
This is the **second integrating vertical** (the Dave's-Bar pattern, for the
public-street / civic / device systems): one room that exercises as many
shipped subsystems as it honestly can, and **earns five small reusable
engine primitives** on the way. Its governing law: **no dead props — every
"off" state is a real condition on a working object.**

Seeding spec: [`docs/staging/eternal-university/arrival-quad.md`](../staging/eternal-university/arrival-quad.md)
(the build-integration layer over the per-object sheets), the Gus sheet
[`npcs/crossing-guard.md`](../staging/eternal-university/npcs/crossing-guard.md),
the object sheets under `objects/` (`clock-tower`, `pocket-watch`, `whistle`,
`thermos`, `camp-chair`, `stop-paddle`, `crossing-log`), and the corrected
city map in [`docs/staging/terminus-city.md`](../staging/terminus-city.md) §2.

> **Corrected geometry (supersedes the staging spec's §2).** The
> `arrival-quad.md` build spec and the current seeds are on a **stale
> east=terminal / west=campus** frame. Per `terminus-city.md` §2, University
> Avenue runs **east–west**; the **Gate/TPA is south**, the **Campus is
> north**. The room is a street segment: **south** side fronts the terminal,
> **north** side fronts the campus gate, and the avenue continues **east**
> and **west** into more of the city. This doc's geometry is authoritative
> over the staging spec; the staging spec's §2 gets corrected during the
> build.

## Goals

- **The room exists as a lived street segment** at
  `/domain/eternal/university-avenue/crossing` (renamed from `plaza`):
  city-street prose ("busy with transients, still of locals" — the busyness
  is real player traffic through the fast-travel hub; we render no ambient
  crowd), `_address` under the University Avenue locality, `SkyExposed` +
  biome + live weather, and the full fixture set placed and examinable.
- **The four exits are wired to the corrected geometry**: `south` → the TPA
  `arrival-gate` (reciprocal re-cardinaled on the terminal side); `north` →
  the university gate as a **real closed + locked `Door`** (campus
  destination deferred/out of scope); `west` → a temporary reachable exit to
  the existing campus bank (placeholder pending downtown); `east` → the
  unbuilt avenue stub, soft-walled in-fiction by Gus.
- **Gus is alive in the room**: a deliberately **primitive, stateless NPC**
  (canned keyword dialogue, shipped npc-behavior brains) who paces, greets,
  and runs the **crossing ritual** on every south-side arrival — whistle
  blast, STOP paddle raised, grave look at traffic that never comes, escort
  north across the empty avenue, and a by-hand mark in his crossing-log.
- **Every object Gus carries or the street holds is a real working object**
  with a modeled off-state: the thermos genuinely seals hot coffee (he never
  opens it — behavior); the watch genuinely keeps and shows time and drifts
  because he never sets it; the camp chair genuinely folds and seats (he
  never sits — behavior).
- **Five engine primitives are built and reusable**, each earned by a real
  in-room driver:
  1. **Timekeeping** — an in-world object that *displays* game-time. A `Watch`
     (drifts; mainspring `Reserve`; `wind`/`set`) and its accurate sibling
     `ClockTower` (reads `WorldClockApi.now()` directly, cannot drift).
  2. **Audible** — a *discrete-event* object-sound push seam that
     **propagates cross-room**. Steady-state object sound already ships
     (`SoundSourceMixin` + the `SoundModality` walk); the new work is the push
     side: an audience-gather walk (forked from `SoundModality.walkAt`,
     reusing its exit/boundary/attenuation physics) + a new `Scene`/
     `MessageApi` delivery mode that pushes one attenuated, directional frame
     per reached hearing sensor, finally making the inert `acousticDb` seam
     live. Whistle is first driver; reusable for the tower chime, bells,
     alarms, PA.
  3. **Switchable** — a generic two-state toggleable mixin + verb. Lamppost
     (on/off) and crossing beacon (walk/stop) consume it.
  4. **LockedMixin** — a lock state over `Door`, enforced on traverse. The
     north campus gate is *locked*, not merely shut.
  5. **Foldable** — a two-state fold/unfold furniture capability. The camp
     chair is first driver; reusable for dorm/event furniture.
- **The drift-reveal works**: `look tower` renders true civic time; the
  watch (if ever examined) reads a few minutes slow; the two disagree across
  the street with no UI. Wired via a live dynamic `tower` detail in the room
  that reads the clock-tower fixture by path — no cross-room perception.
- **The clock-tower fixture is seeded** on the terminal exterior under
  `/domain/terminus/terminal/` — the one sanctioned exception to "terminal
  interior is out," because it exists *for* this room's reveal.
- **The whole vertical is walkable and verified live** end to end: arrive
  from the terminal, cross under Gus, exercise every object.

## Non-goals

- **The university campus interior** — the north gate's destination. The
  gate is a real locked boundary now; what's behind it lands with the campus
  build (`docs/slates/builds/eternal-university-slate.md`).
- **The TPA terminal interior** — `hall`, departure gates, `office`,
  `arrival-terminal` are already built and stay untouched, save the bounded
  reciprocal-exit fix and the clock-tower fixture (see Surface decisions).
- **Downtown / the bank rehome** — the bank stays reachable via a temporary
  west exit; its real home in a financial district is a future city build
  (`docs/staging/terminus-city.md` §3, the Counting-Houses).
- **The census-murder narrative** — the other `npcs/` and all `experiences/`
  files. Out.
- **Distant-landmark perception** (reading the tower's face from another
  room) — sidestepped by the authored dynamic `tower` detail; the
  scope-modality frontier is deferred.
- **The deferred halves of the props**: caffeine → alertness (metabolism has
  no player-accessible drink here — the thermos is Gus's and never opened, so
  it exercises thermal + bulk + sealable, not metabolism), the whistle's
  stamina × skill blow-model (Gus's blast is a fixed canned emission), and a
  `steal` verb (the watch is protected by being carried — the intended
  safety). Named at their sites, not built.
- **Upgrading Gus to a live/agentic NPC** — he is *designed* primitive and
  stateless. That is the feature, not a limitation.

## Surface decisions

### 1. The bank — keep a temporary reachable exit
The old `north → bank` exit is removed (north is now the locked campus gate).
The existing built bank content (`bank.yaml`, `bank-counter.yaml`,
`npc/teller.yaml`) is **not destroyed and not rehomed**; it hangs off the
**west** avenue stub as a temporary, reachable placeholder until downtown
Terminus gives it a real financial-district home. The **east** stub stays the
pure unbuilt continuation, soft-walled by Gus. (Chosen over deleting the
seeds — throws away working content — and over rehoming now — out of scope.)

### 2. Foldable — build it in this vertical
The camp chair ships as an **honest folding chair** (two states, `fold` /
`unfold` verbs gated by the capability), not a fixed drop-in. Gus never folds
it — the static state is *behavior* over a real capability, per the no-dead-
props law — and the primitive is reusable for dorm/event furniture campus-
wide. Home: alongside `lib/slot/` (posture neighbors); **do not** invent
`lib/foldable/`.

### 3. Room identity — `crossing`
Renamed `/domain/eternal/university-avenue/plaza` →
`/domain/eternal/university-avenue/crossing`; `primaryKeyword: crossing`;
`shortDescription` stays `University Avenue`. Foregrounds Gus's ritual (the
room's defining event) and matches how the staging docs already refer to it.
The rename updates the one inbound reference (`arrival-gate.yaml`'s
destination).

### 4. Terminal reorientation — the arrival alcove becomes the north frontage
The terminal now sits **south** of the E–W avenue, so its north frontage must
open onto the crossing. Terminal rooms **may be moved** to achieve a clean,
grid-opposite layout (owner sign-off — the earlier "no other terminal room is
touched" constraint is lifted). The chosen move: **swap the arrival alcove
with the dead Departure Gate C** so the arrival alcove fronts the avenue to
the north and the out-of-service gate relegates to the back (south) — north→
south becomes crossing · arrival-gate · hall · gate-c. This touches
`arrival-gate.yaml`, `hall.yaml`, `departure-gate-c.yaml`, and `crossing.yaml`
(exits + coords + prose); the operational gates, the office, and all
fast-travel seating are untouched. The invariant: every exit pair is authored
explicitly on both sides and reads grid-opposite in-fiction.

### 5. The north gate — a real locked boundary with a deferred destination
The north exit is a closed + locked `Door`. `LockedMixin` vetoes traverse
**before** destination resolution, so the destination may point at the
reserved (unbuilt) EU campus-entry path without the player ever reaching it.
The planner confirms the engine tolerates a dangling exit destination behind
a locked door; if it does not, a minimal sealed vestibule stub is acceptable
(it is the gate's inner threshold, not campus content). Gus soft-walls it
in-character ("gate's for the gown — not yet").

### 6. Audible — discrete-event cross-room propagation
The Audible seam propagates: a discrete object sound (the whistle blast)
arrives **unbidden** in adjacent rooms, attenuated by distance and blocked by
closed doors. It is built by **reusing the already-shipped acoustic graph**,
not by inventing physics:
- **Reused as-is**: `SoundModality.walkAt`'s traversal (exit-walk +
  `SoundConduit` boundary transmissivity on `Door`/`Window` + linear-domain dB
  attenuation/merge + `MAX_HOPS` depth cap + cycle guard + vacuum block), the
  `Sound` value object, and the `DEFAULT_HEARING_THRESHOLD_DB` per-viewer gate.
- **New**: (a) an *audience-gather* fork of `walkAt` that collects
  `(sensor, attenuated-dB)` pairs across the reached rooms instead of summing
  to a single here-level; (b) a new push delivery mode (`Scene.toAudible` /
  `MessageApi.sendAudible`) that emits one frame per gathered sensor with a
  per-recipient **attenuated, directional** body ("from the north, a faint
  blast") and a per-recipient threshold drop; (c) wiring the currently-inert
  `meta.acousticDb` as the source level the walk consumes.
- **Steady-state is already free**: continuous object sounds (a humming
  lamppost, a ticking clock, distant terminal murmur) compose the
  already-shipping `SoundSourceMixin` and propagate cross-room via `listen`
  today, with no new code — the push seam is only for *discrete events*.
The pinned per-object contract is `objects/whistle.md` (its same-room v1 is
superseded by this cross-room push). Same-room delivery is the degenerate
zero-hop case of the same walk.

### 7. The ritual — tally is a deed, the performance is decoupled
Two load-bearing rules (from `arrival-quad.md` §5 / `crossing-guard.md`): the
crossing-log **mark fires on the witnessed south-side arrival**, never on the
ritual finishing — an aborted performance never loses the count; and
**simultaneous arrivals batch the performance** ("the lot of you — mind the
curb") while the tally still fires **per arrival**. The log records *when*
(in the watch's drifting time) and *not who*.

## Constraints

- **Module-category discipline** ([CLAUDE.md](../../CLAUDE.md)): primitives
  are mixins in the `lib/<subsystem>/` that owns the concern — Timekeeping
  (`Watch`/`ClockTower` classes + `wind`/`set`) in `lib/time/`; Audible — the
  audience-gather walk + the `AudibleMixin` emit facade in `lib/perception/`
  beside `SoundSource`/`SoundModality`, the push delivery mode on `Scene`/
  `MessageApi` (no new dir, no new `Api`); Switchable near boundary;
  `LockedMixin` in `lib/boundary/` beside `Door`; Foldable beside
  `lib/slot/`. New verbs are YAML-view + Controller pairs
  (`tally`, `blow`, `wind`, `set`, `fold`, `unfold`, `switch`/toggle,
  `lock`/`unlock` as needed). **No new module categories, no free-floating
  helpers, no new `Api` unless a genuine gated surface is needed** (Audible
  routes through existing `MessageApi`).
- **The `Mixins` registry** in `lib/mixin.ts` is the single source of truth —
  every new mixin registers there with a `MixinApi.isX` predicate.
- **`NamedMixin` is for proper names only** — Gus is `Named`; every object,
  fixture, and detail uses `Visible.shortDescription`, never a "name".
- **Cross-zone exits are authored explicitly on both sides** (never grid-
  derived); cardinal names are allowed cross-zone.
- **Gus stays primitive**: stateless per-interactor (belief/recognition
  configured to forget), shipped npc-behavior brains only (no live agent),
  canned keyword dialogue (not a branching `npc-dialogue` tree).
- **Object-afforded verbs**: the new device verbs are contributed by the
  objects that bear them (`commandContributions`), gated at the object, so
  they light up only where a real object is present.
- **No dead props**: each off-state (stopped watch, sealed thermos, folded/
  unused chair, off lamppost, stop-state beacon, locked gate) is a modeled
  condition with an in-fiction reason, not flavor text.
- **Style**: single-quoted strings by hand; **never** run `prettier --write`
  (no prettier config in this repo).
- **Security**: new gated surfaces (if any) end with
  `SecurityApi.decorateApiClass`; verbs follow the call-security /
  doc-visibility invariant (`callable == visible == cared-about`).

## Acceptance criteria

- **Geometry**: the room resolves at `/domain/eternal/university-avenue/crossing`
  with `south`→`arrival-gate`, `north`→locked `Door`, `west`→bank (temp),
  `east`→soft-walled stub; the terminal-side reciprocal is authored and reads
  opposite; the old `north→bank` exit is gone.
- **Arrival ritual**: arriving into the crossing from the south triggers Gus's
  ritual observably (whistle heard via Audible, paddle raised, escort). The
  crossing-log tally fires **per witnessed arrival**, decoupled from ritual
  completion (an aborted ritual still tallies; two simultaneous arrivals batch
  one performance but produce two tally marks).
- **Timekeeping / drift-reveal**: `look tower` renders true game-time via
  `WorldClockApi`; `examine`-ing the watch renders a divergent (drifted) time;
  `wind` refills the mainspring `Reserve`; at zero mainspring the watch stops
  and shows its stop-time.
- **Audible (cross-room push)**: `blow whistle` delivers an unbidden heard
  frame to hearing sensors in the room **and in adjacent rooms**, attenuated
  with a directional cue; a **closed** door on the path blocks it (an open
  door / doorless exit passes it); delivery respects the hearing threshold and
  the `MAX_HOPS` depth cap; a sensor with no hearing does not receive it; a
  louder `acousticDb` source measurably reaches farther.
- **Switchable**: the lamppost toggles on/off (and is clock-driven day/night)
  and the beacon toggles walk/stop, both through the shared Switchable surface.
- **LockedMixin**: traversing `north` is vetoed with a locked-gate message; the
  gate reads as closed and locked on examine.
- **Foldable**: the camp chair reports and toggles folded/unfolded via
  `fold`/`unfold`; a player can `sit` the bench; Gus is never seated and never
  opens the thermos (behavior, verified in play).
- **Fixtures**: street sign, posters, plane trees, shuttered shopfronts,
  terminal facade, litter bin + takeable gutter litter, and the dynamic
  `tower` detail are all examinable/readable/takeable as designed; the room is
  `SkyExposed` with live weather and carries an `_address`.
- **Clock-tower fixture** is seeded under `/domain/terminus/terminal/` and the
  room's `tower` detail reads it live.
- **Tests**: unit coverage for each primitive (Timekeeping read + drift +
  wind-to-stop; Audible emit → hearing-sensor delivery + non-delivery;
  Switchable toggle; LockedMixin traverse veto; Foldable state) and for the
  tally-decoupling + batch rules; the full suite stays green.
- **Docs**: each primitive is documented in its subsystem doc (Timekeeping in
  `time.md`; Audible in the messaging/perception doc; Switchable, `LockedMixin`
  in `boundary.md`; Foldable in the slot/posture doc), and `arrival-quad.md`
  §2 is corrected to this geometry. Doc graduation is finalize-phase work.
- **Live verify**: the full walk is exercised in a running server (arrive from
  the lounge/terminal → cross under Gus → examine/use every object → hit the
  locked gate → cross back).

## Cross-references

- **Seeding spec**: `docs/staging/eternal-university/arrival-quad.md`
  (build-integration), `npcs/crossing-guard.md`, `objects/*.md`
  (`clock-tower`, `pocket-watch`, `whistle`, `thermos`, `camp-chair`,
  `stop-paddle`, `crossing-log`), `docs/staging/terminus-city.md` §2 (map),
  `docs/staging/eternal-university/lore-integration-pass.md` ("arriving is
  being counted"; write around *being counted*, not prophecy).
- **Subsystem docs (substrate the primitives build on)**: `time.md`
  (WorldClockApi/DefaultCalendar + `ScheduleApi`), `reserve.md` (mainspring),
  `messaging.md` + `senses.md`/`perception.md` (Audible: reuse
  `SoundModality.walkAt`/`SoundSource`/`SoundConduit`, the
  `DEFAULT_HEARING_THRESHOLD_DB` gate, and the inert `acousticDb` seam),
  `boundary.md` (Door/LockedMixin), `posture.md` + `slot.md` (Foldable),
  `light.md` (lamppost/Switchable), `behavior.md` + `npc-dialogue.md` (Gus),
  `spatial.md`/`location.md`/`zone.md` (room + exits), `weather.md`/`biome.md`/
  `address.md` (atmosphere), `belief.md` (Gus's stateless recognition),
  `activity.md` (the ritual as an engagement), `reactions.md` (react to the
  ritual).
- **Future builds where non-goals land**: `docs/slates/builds/eternal-university-slate.md`
  (campus interior), `docs/staging/terminus-city.md` (downtown / bank rehome).
