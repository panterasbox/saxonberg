# University Avenue Crossing — Implementation Plan

**Artifact type:** Plan (ephemeral; retired at sweep per `docs/workflow.md`).
**Requirements (authoritative):** `docs/requirements/university-avenue-crossing-requirements.md`.
**Staging content detail:** `docs/staging/eternal-university/arrival-quad.md` (its §2 geometry is STALE — this plan's corrected S→N / E–W geometry wins); per-object sheets under `docs/staging/eternal-university/objects/`; Gus at `docs/staging/eternal-university/npcs/crossing-guard.md`.

All paths below are shorthand rooted at `packages/server/src/mud/` unless written in full. Follow CLAUDE.md module-category discipline: mixins in `lib/<subsystem>/`, thin content classes in `obj/`, verbs = YAML view in `cmd/<category>/` + Controller in `obj/command/<category>/`, every new mixin registered in `lib/mixin.ts`'s `Mixins` map with a `MixinApi.isX` predicate. Single-quote strings by hand; never run `prettier --write`. Colocate Vitest tests in `__tests__/`.

This plan is **phased by dependency**: primitives first (they unblock everything), then object classes, then room seed + geometry wiring, then Gus + gear, then the ritual, then live verify. Each phase is independently reviewable.

---

## Phase 0 — Orientation (read-only, no commits)

Before writing code, confirm these load-bearing facts against the live tree (this plan verified them, but the code moves):

1. **`Exit.canTraverse`** (`lib/boundary/Exit.ts:500-528`) checks `blocked`, then `this.door && !this.door.isOpen()`, returning the veto from `this.door` (already in hand) — **the destination getter is never touched on a veto**. `LocomotionLogic.canTraverseExit` (`obj/api/LocomotionLogic.ts:235`) calls `exit.canTraverse` before any destination work; `Exit.resolveDestination`/`getDestination` are called only from `lib/spatial/Mobile.ts` (runtime traverse, *after* the guard) and `obj/command/author/TeleportController.ts`. **Nothing resolves exit destinations at boot** (the "load cascade" in `arrival-gate.yaml`'s header is driven by `populates:`, not by exit-walking). ⇒ **§5 is safe: a locked north gate may point at an unbuilt/dangling EU path with no sealed-vestibule stub.** (See Phase 3.)
2. **`SoundModality.walkAt`** (`lib/perception/modalities/SoundModality.ts:117-208`) is a **module-private** function returning a `LinearAccumulator` that gathers sound *into* `loc`. The audience-gather fork must invert direction (walk *outward from the source room*). Reuse: `MAX_HOPS`/`EXIT_TAU` (from `lib/perception/modalities/Modality`), `findSoundConduit`, `conduit.transmissivity`, `atmosphereBlocks`, the doored-exit skip + `BoundaryAnchor` cross-boundary branch, the visited-set cycle guard.
3. **`Scene`** (`lib/message/Scene.ts`) delivers `toPeers`/`toContents` only to the actor's single container via `MessageApi.getSensors` (Scene.ts:262-281). It already supports `.meta({ acousticDb })` (Scene.ts:102-105) and `.modality('hearing')`.
4. **`ReservedMixin`** (`lib/reserve.ts`) + **`Campfire`** (`obj/Campfire.ts`) show the non-biological reserve pattern: `ReservedMixin(...)` in the base chain, `setReserve(new Reserve(key, cap, cur, theme, floorEffect))`, `getReserve(key)?.current.rawValue()`, `adjustReserve(key, Quantity.of(delta, unit))`, lazy reconcile against `WorldClockApi.getNow().rawValue()`.
5. **`WorldClockApi.getNow(): Quantity<'s'>`** (`api/worldclock.ts:115`) — note the method is `getNow()`, not `now()`. Calendar formatting lives in `lib/time/DefaultCalendar.ts`.

---

## Phase 1 — The five primitives

Build order within the phase: **1A Timekeeping → 1B Switchable → 1C LockedMixin → 1D Foldable → 1E Audible** (Audible last: it is the largest and the others are quick mirrors of `Sealable` that warm you up on the registry/verb machinery).

Every mixin sub-step ends with the **registry ritual**: add the name to `Mixins` in `lib/mixin.ts`, add a `MixinApi.isX` predicate in `api/mixin.ts` (mirror the existing `isSealable` at `api/mixin.ts:681`), and export the mixin from its module.

### 1A. Timekeeping (`lib/time/`)

**Files to CREATE:**
- `lib/time/Timekeeping.ts` — the capability mixin. Interface:
  ```
  interface Timekeeping { currentReading(): Time | null; }
  ```
  Register as `Mixins.Timekeeping = 'TimekeepingMixin'` + `MixinApi.isTimekeeping`. The mixin supplies only the read contract; it does **not** grant `wind`/`set` (those are object-carried — see below). This is deliberate per `pocket-watch.md` ("not the verb-granting Timepiece mixin that was rightly rejected").
- `lib/time/Time.ts` — a thin minutes-of-day value object **only if** `DefaultCalendar` has no reusable time-of-day type. First check `lib/time/DefaultCalendar.ts` / `lib/time/Calendar.ts` for an existing time-of-day formatter and reuse it; add `Time.ts` only if absent. The reading is **derived on read, never persisted**.
- `lib/time/__tests__/Timekeeping.test.ts`.

**Files to CREATE (classes in `obj/`):**
- `obj/Watch.ts` — `class Watch extends SealableMixin(TimekeepingMixin(DetailedMixin(TangibleMixin(Thing))))` (compose `Sealable` for the hunter lid, `Detailed` for the engraving, `Tangible` for brass). Also compose **`ReservedMixin`** for the mainspring. Persistent fields: `setTo` (minutes), `setAt` (game-seconds, from `WorldClockApi.getNow()`), `rate` (drift multiplier, tunable, default ~0.995). Mainspring reserve: `setReserve(new Reserve('mainspring', Quantity.of(cap,'s'), Quantity.of(cur,'s'), 'mechanical', 'stopped'))` — theme `'mechanical'` (mirror Campfire's `'combustion'`). Methods:
  - `currentReading()`: `lid shut (!isOpen()) → null`; else `setTo + runningElapsed * rate`, formatted. `runningElapsed = min(now - setAt, mainspringCharge-as-elapsed)` — implement the v2 mainspring form from `pocket-watch.md`: lazily consume charge against elapsed game-time (the `Campfire.reconcileFuel` pattern), and **freeze `runningElapsed` when the spring floors** so a fully-unwound watch shows its stop-time. Gus's seed keeps it always-wound so it never freezes (drift only).
  - `wind()`: refill the mainspring reserve to capacity (`setReserve` at full).
  - `setTime(minutes)`: write `setTo` + `setAt = WorldClockApi.getNow()`.
  - `getLong()`: consume `currentReading()` — null → "the lid is shut"; else static prose + formatted reading (dynamic-getLong pattern; `getMarkupLong` recomputes each look).
  - **Seed already-wrong:** seed `setAt` in the past so drift shows on the first look.
- `obj/ClockTower.ts` — `class ClockTower extends TimekeepingMixin(VisibleMixin(Thing))`. `currentReading()` = `WorldClockApi.getNow()` formatted via `DefaultCalendar` directly — no `setTo`/`setAt`/`rate`, no mainspring, never drifts, effectively never null. Home is `obj/` (it is a fixture seeded on the terminal exterior, not a `Location` in v1).
- `obj/__tests__/Watch.test.ts`, `obj/__tests__/ClockTower.test.ts`.

**Verbs — object-carried `wind` / `set`** (mirror `Thermometer`'s `commandContributions.inventory: ['perception/measure.yaml']`, `obj/instrument/Thermometer.ts:16`):
- CREATE `cmd/device/wind.yaml` and `cmd/device/set.yaml`. **`device` is an APPROVED new command category** (owner sign-off) = "operating a built object or mechanism"; it hosts all the crossing's device verbs (`wind`/`set`/`switch`/`toggle`/`fold`/`unfold`/`blow`/`tally`) and every future switchable/timepiece/foldable. (`lock`/`unlock` stay in the existing `boundary` category.) Add `device` to CLAUDE.md's command-category list at finalize. `set watch 4:00` takes an explicit time arg only (no source-sync). Each YAML names its Controller.
- CREATE `obj/command/device/WindController.ts`, `obj/command/device/SetController.ts` — resolve the target `Watch` from the actor's inventory, call `wind()` / `setTime(parse(arg))`, emit a self frame. Reject if no windable/settable watch in hand.
- `Watch` declares `static commandContributions = { self: [], inventory: ['device/wind.yaml', 'device/set.yaml'], environment: [], peers: [] }`.
- Tests: `obj/command/device/__tests__/WindController.test.ts`, `SetController.test.ts`.

**Test coverage (acceptance):** read (lid open → drifted reading; lid shut → null); drift (reading diverges from `WorldClockApi.getNow()` after seeded past `setAt`); wind-to-stop (drain mainspring → `currentReading()` freezes at stop-time; `wind` → resumes); tower reads true time and never drifts.

### 1B. Switchable (`lib/boundary/`)

Mirror `SealableMixin` (`lib/spatial/Sealable.ts`) exactly, renaming the axis on/off.

**Files to CREATE:**
- `lib/boundary/Switchable.ts` — `interface Switchable { isOn(): boolean; setOn(v: boolean): void; switchOn(): void; switchOff(): void; }`, `persistentFields = ['on']`, boolean guard in `setOn`. Register `Mixins.Switchable = 'SwitchableMixin'` + `MixinApi.isSwitchable`.
- Verb (**global, gated by the capability**, like `open`/`close` are gated by `Sealable`): CREATE `cmd/device/switch.yaml` (verbs `[switch, toggle]`, optional `on|off` subcommand/arg) + `obj/command/device/SwitchController.ts`. The controller targets any `Switchable` in scope, toggles or sets to the requested state, emits self + peers frames. Look at how the `open`/`close` controllers resolve a `Sealable` target for the exact scope/rejection shape (grep `cmd/boundary/` for the open/close YAML + controller).
- `lib/boundary/__tests__/Switchable.test.ts`, `obj/command/device/__tests__/SwitchController.test.ts`.

Consumers are built in Phase 2 (Lamppost = `LightSource + Switchable`, clock-driven; Beacon = `Propertied/Switchable` walk↔stop).

### 1C. LockedMixin (`lib/boundary/`)

**Files to CREATE:**
- `lib/boundary/Locked.ts` — `interface Lockable { isLocked(): boolean; setLocked(v: boolean): void; lock(): void; unlock(): void; }`, `persistentFields = ['locked']`, boolean guard. Register `Mixins.Lockable = 'LockableMixin'` (match the naming of the interface you expose) + `MixinApi.isLockable`.
- Compose it onto **Door**: change `lib/boundary/Door.ts:70` `const DoorBase = SealableMixin(Boundary);` → `const DoorBase = LockableMixin(SealableMixin(Boundary));`. Confirm no persistent-field key collision (`locked` vs `open` — distinct, fine).

**Files to EDIT — the traverse veto (`lib/boundary/Exit.ts`):**
- In `Exit.canTraverse` (Exit.ts:500-528), add a **lock gate before the closed-door gate** so a locked door reports "locked" not "closed":
  ```
  if (this.door && MixinApi.isLockable(this.door) && this.door.isLocked()) {
    return { ok: false, gate: 'locked', reason: `The ${this.door.getPresentation()} is locked.` };
  }
  ```
  Add `'locked'` to the `TraversalGate` union (Exit.ts:56-67). This runs entirely off `this.door` — **the destination is never resolved**, confirming §5.
- Verbs (**global, gated by `Lockable`**): CREATE `cmd/boundary/lock.yaml` + `unlock.yaml` and `obj/command/boundary/LockController.ts` / `UnlockController.ts` (alongside the existing `cmd/boundary/` open/close). For the crossing v1 the gate is seeded permanently locked and Gus soft-walls it, so a key/credential model is **out of scope** — `lock`/`unlock` can be admin/no-key verbs or deferred; build only what the acceptance test needs (traverse veto + examine reads locked). Keep the surface minimal; note the key model as future.

**Tests:** `lib/boundary/__tests__/Locked.test.ts` (state), and a traverse-veto test (locked door → `canTraverse` returns `{ ok:false, gate:'locked' }` with a **dangling/unresolvable destination path** still safe — assert `getDestination` is never called / that an unloaded dest path does not throw during the veto).

### 1D. Foldable (`lib/slot/`)

Home is **beside `lib/slot/Postured.ts`** (NOT a new `lib/foldable/`). Mirror `Sealable`.

**Files to CREATE:**
- `lib/slot/Foldable.ts` — `interface Foldable { isFolded(): boolean; setFolded(v: boolean): void; fold(): void; unfold(): void; }`, `persistentFields = ['folded']`. Register `Mixins.Foldable = 'FoldableMixin'` + `MixinApi.isFoldable`.
- **Gate `sit` on folded state:** a folded chair cannot be sat. Check `lib/slot/Postured.ts` for where the sit slot is offered / where `sit` resolves the posture host, and have it refuse when the host `isFoldable() && isFolded()`. Prefer a hook the Postured host consults (e.g. `Postured` checks `MixinApi.isFoldable(this) && this.isFolded()` before granting the slot) over editing the `sit` controller directly.
- Verbs (**global, gated by `Foldable`**): CREATE `cmd/device/fold.yaml` + `unfold.yaml` and `obj/command/device/FoldController.ts` / `UnfoldController.ts`. Emit self + peers; reject folding an occupied chair (someone in the sit slot).
- `lib/slot/__tests__/Foldable.test.ts`, controller tests.

**Tests:** state toggle; folded chair refuses `sit`; unfolded chair accepts `sit`.

### 1E. Audible — discrete-event cross-room push (`lib/perception/` + `lib/message/`)

This is the largest primitive. **Reuse all shipped physics**; add only the audience-gather walk, the push delivery mode, the live `acousticDb` wire, and the `AudibleMixin` facade.

**(a) Audience-gather walk — `lib/perception/AudienceGather.ts` (CREATE):**
A function that, given a **source location** and a **source dB**, walks outward and returns `Array<{ sensor: Stuff & Sensor; db: number; direction: string | null }>`.

- Fork the traversal shape of `SoundModality.walkAt` (SoundModality.ts:117-208) but **invert the accumulation**: instead of summing sub-room sound into a parent accumulator, carry an **attenuation factor** (linear, starting 1.0) outward from the source and, at each reached room, emit one `(sensor, deliveredDb)` per hearing sensor where `deliveredDb = sourceDb + 10*log10(cumulativeTau)`.
- Reuse verbatim: `MAX_HOPS` depth cap, the `visited` cycle guard, `atmosphereBlocks` (vacuum stops the walk), the doored-exit skip (`if (exit.getDoor()) continue;`) with the `BoundaryAnchor` cross-boundary branch computing `conduit.transmissivity(...)` for doored/windowed boundaries, and `EXIT_TAU` for doorless exits. A **closed** door's `SoundConduit.transmissivity` returns 0 (Door.ts:221-230), so it blocks — an **open** door returns 1, passing. This gives the acceptance test's "closed door blocks, open door passes" for free.
- **Direction cue:** track the first-hop exit direction from the source room and carry it as the arrival's `direction` (e.g. reached-from-the-north → "from the north"). The zero-hop (same-room) case has `direction = null`.
- Enumerate sensors per room via `MessageApi.getSensors(room)`.
- CREATE `lib/perception/__tests__/AudienceGather.test.ts`: source room delivers to same-room + adjacent rooms; attenuation increases with hops; closed door blocks; louder source reaches farther; `MAX_HOPS` caps depth.

**(b) Push delivery mode — `Scene.toAudible` + `MessageApi.sendAudible` (EDIT):**
- EDIT `lib/message/Scene.ts`: add `toAudible(body, opts)` producing an `AudienceFrame` with `recipientKind: 'audible'`. In `send()` add an `'audible'` case that:
  1. resolves the source location (`this.#actor.getContainer()`),
  2. reads the source dB from `this.#extraMeta.acousticDb` (stamped via `.meta({ acousticDb })`),
  3. calls the audience-gather walk,
  4. for each `(sensor, db, direction)` **drops below the hearing threshold** (`DEFAULT_HEARING_THRESHOLD_DB` — promote the constant from `ListenController` to a shared `lib/perception/` constant so both consume it),
  5. builds a **per-recipient directional, attenuated body** — a small MML composer that reads the arrival's `direction`/`db` band (e.g. same-room → the full body; adjacent faint → "From the north, a faint whistle."). The `modality('hearing')` stamp on the frame lets the existing `SensorMixin.filterMessage` sensorium gate drop recipients with no hearing (acceptance: "a sensor with no hearing does not receive it").
  6. dispatches via `MessageApi.sendMessage(sensor, frame)` — the same chokepoint `Scene.send` already uses (Scene.ts:254).
- EDIT `api/message.ts` **only if** a gated convenience wrapper is wanted (`MessageApi.sendAudible`); per the requirements' "no new Api" constraint, prefer routing entirely through `Scene.toAudible` + the existing `MessageApi.getSensors`/`sendMessage`. If you add a `MessageLogic` helper, keep it a thin routing primitive (parallel to `getSensors`) and re-export through `MessageApi`; end with `SecurityApi.decorateApiClass` already present at `api/message.ts:196`.
- `Scene.test.ts` / `MessageApi` tests: `toAudible` fans one frame per gathered hearing sensor with attenuated bodies; threshold drop; no-hearing sensor excluded.

**(c) Wire `acousticDb` live (EDIT — no code needed for Vocal, but confirm):**
`Vocal` already stamps `meta.acousticDb` (Vocal.ts:152). The new consumer is `Scene.toAudible` (b.2). No change to `Vocal` is required for the crossing; the wire is "the push mode now *reads* the field the speech verbs already stamp." (Optional stretch: route `say`/`shout` through `toAudible` for cross-room speech — **out of scope**; leave `Vocal` on `toPeers`.)

**(d) `AudibleMixin` emit facade — `lib/perception/Audible.ts` (CREATE):**
- `interface Audible { emit(opts: { db: number; character: string; description?: string; timbreHook?: string }): void; }`. `emit` composes `MessageApi.scene(this).topic(<a new sound topic>).modality('hearing').meta({ acousticDb: opts.db }).toAudible(<body from character/description>).send()`. Register `Mixins.Audible = 'AudibleMixin'` + `MixinApi.isAudible`.
- CREATE the sound topic leaf under `seeds/lib/messaging/Topic/` (follow the `TopicCatalogue` convention referenced in `api/message.ts:70-82`; grep an existing `world.perception.*` topic seed for shape).
- `lib/perception/__tests__/Audible.test.ts`.

**Pinned per-object contract:** `objects/whistle.md` — `AudibleMixin.emit` carries `{ source, spl ~110 dB, description "a sharp whistle", modality: hearing, timbre-hook (cork pea → rough trill) }`. Whistle is the first driver (Phase 2).

**Acceptance (Audible):** `blow whistle` delivers an unbidden heard frame to hearing sensors in-room **and adjacent rooms**, attenuated + directional; closed door on the path blocks (open/doorless passes); threshold + `MAX_HOPS` respected; no-hearing sensor excluded; louder `acousticDb` reaches farther.

---

## Phase 2 — Object classes (compose over substrate)

All are thin `Thing` subclasses in `obj/` unless noted. Most are DROP-IN/COMPOSE. Colocate a small test per non-trivial class; the trivially-thin ones (Paddle) can be covered by their seed loading in an integration test.

| Class | File | Composition | Notes |
|---|---|---|---|
| **Watch**, **ClockTower** | (Phase 1A) | — | already built |
| **Whistle** | `obj/Whistle.ts` | `AudibleMixin + WearableMixin + DetailedMixin + TangibleMixin(Thing)` | carries `blow`; neck slot; `Detailed` cork pea. |
| **StopPaddle** (class `Paddle`) | `obj/Paddle.ts` | `WieldableMixin + DetailedMixin + TangibleMixin(Thing)` | no carried verb, no movement gate; `Detailed` face + sheeting (visual only). |
| **Thermos** | `obj/Thermos.ts` | `extends Flask` (`obj/Flask.ts` = Thermal+Sealable+Bulkable) + `DetailedMixin` | coffee bulk; sealed keeps hot. Metabolism drink-effect deferred (Gus never opens). |
| **CrossingLog** | `obj/CrossingLog.ts` | `DetailedMixin + TangibleMixin(Thing)` | carries `tally`; persistent `marks: Array<number|null>` (+ starting count); `getLong()` renders total + recent tail in Gus-time. **Discards identity — store `when` only, never `who`** (loud comment). |
| **Chair** / **FoldingChair** | `obj/Chair.ts` | `Chair = PosturedMixin + DetailedMixin + TangibleMixin(Thing)`; `FoldingChair extends Chair` + `FoldableMixin` | real sit slot; per-detail materials (aluminum frame / canvas seat). |
| **Bench** | `obj/Bench.ts` or reuse `Chair` | `PosturedMixin + Detailed + Tangible(Thing)` | public sit. |
| **Lamppost** (class `Lamp`) | `obj/Lamp.ts` | `LightSourceMixin + SwitchableMixin + DetailedMixin(Thing)` | on/off via Switchable; day/night driven by a `WorldClockApi` schedule (see below). |
| **Beacon** | `obj/Beacon.ts` | `SwitchableMixin + PropertiedMixin + DetailedMixin(Thing)` | walk↔stop = on/off surfaced with walk/stop prose. |
| **LitterBin** | `obj/LitterBin.ts` | `ContainerMixin + Detailed + Tangible(Thing)` | holds litter. |
| Gutter litter, street sign, posters, plane trees, shopfronts, terminal facade | seeds + `Detailed`/`Adornment` | — | mostly room details / adornments (Phase 3); takeable litter is a real `Thing`. |
| Gus's **vest** (Garment) + **badge** (Adornment) | `seeds/.../` over `Garment`/`Adornment` | — | worn gear (Phase 4). |

**Object-carried verbs:**
- `blow` → `cmd/device/blow.yaml` + `obj/command/device/BlowController.ts`; `Whistle` declares `commandContributions.inventory: ['device/blow.yaml']`. Controller resolves the `Audible` whistle in hand and calls `emit({ db: ~110, character: 'whistle', description: 'a sharp whistle', timbreHook: 'rough trill' })`.
- `tally` → `cmd/device/tally.yaml` + `obj/command/device/TallyController.ts`; `CrossingLog` declares `commandContributions.inventory: ['device/tally.yaml']`. Controller:
  1. `resolveReadableTimepiece(actor)` — **v1 fallback** (per `crossing-log.md`): scan the actor's own carried/worn items for `MixinApi.isTimekeeping(x)`, return the first with non-null `currentReading()`. Fold this into the controller (or a `Timekeeping`-side static), **not** a free-floating helper.
  2. Append `currentReading()` (or `null`) to `marks`. **Never store identity.**
  Test the edge matrix from `crossing-log.md` (lid open → timed; lid shut → untimed tick; no timepiece → untimed tick).

**Lamppost day/night:** register a `WorldClockApi.cron`/`onDate`/`every` schedule (host-bound to the lamp so it auto-cancels on destruct — `api/worldclock.ts:194-240`) that calls `switchOn()` at dusk / `switchOff()` at dawn. Keep the dawn/dusk thresholds simple (celestial profile or a fixed hour); the acceptance criterion is only "toggles on/off and is clock-driven."

---

## Phase 3 — Room seed + geometry wiring

### 3A. Rename + reframe the room

- **RENAME** `seeds/domain/eternal/university-avenue/plaza.yaml` → `.../crossing.yaml`. Set `primaryKeyword: crossing`; keep `shortDescription: University Avenue`. Rewrite `longDescription` to the corrected S→N frame (terminal fronting south, campus gate north, avenue continuing E–W) — city-street prose, "busy with transients, still of locals," render no crowd.
- Add `SkyExposed` + biome + live weather (copy the pattern from an existing sky-exposed EU/outdoor room — grep `SkyExposed`/`_atmosphere`/biome in `seeds/domain/eternal/`), and an `_address` under the University Avenue locality (mirror `arrival-gate.yaml:_address: terminus/arrival-gate`).
- **Exits (corrected geometry):**
  - `south` → `/domain/terminus/terminal/arrival-gate` (replaces the old `east`).
  - `north` → the locked campus gate: declare a `door:` on this exit referencing a new locked `Door` template, `destination:` = the reserved EU campus-entry path (dangling is safe — Phase 0 fact 1). Seed the Door **closed + locked** (`open: false`, `locked: true`).
  - `west` → `/domain/eternal/university-avenue/bank` (the temp reachable bank; replaces the old `north → bank`).
  - `east` → **no exit** (soft-walled by Gus in dialogue; the paddle does not gate movement, and there is no real exit that way — per `crossing-guard.md`'s "no-exit, flavor over description"). If a stub exit object is wanted for a blocked message, seed it `blocked: true`; otherwise omit and let Gus's `blocked:down-avenue` line carry it.
- **`populates:`** the room with: bench, camp chair (FoldingChair, deployed), thermos-on-the-chair, lamppost, beacon, litter bin + gutter litter, street sign, posters (on the lamppost), plane trees, shopfront/terminal-facade details, the clock-tower fixture reference, and Gus (Phase 4). Follow the `populates:` shape from `seeds/domain/lounge/bar.yaml:85` (`{ template, onto }` / bare path / `{ template, into: <host> }`).

### 3B. The dynamic `tower` detail (drift-reveal)

- In `crossing.yaml`'s `details:` block add a `tower` detail whose description **dynamically** resolves the ClockTower fixture by path and renders its live `currentReading()` (the `getMarkupLong`-recompute pattern the watch uses). This is a cross-object *read*, not cross-room perception. Check how existing dynamic details are authored (grep `details:` with a computed description, or a detail that reads another object) — if seeds only support static detail strings, implement the dynamic read on the room class or via a small `Detailed` sub-feature override on the `CartesianLocation` subclass. **Flag:** confirm the seed layer supports a computed detail description; if not, the minimal path is a room-class override that composes `currentReading()` into the `tower` detail's long text.

### 3C. Clock-tower fixture on the terminal exterior

- CREATE `seeds/domain/terminus/terminal/clock-tower.yaml` (class `/obj/ClockTower`) — the sanctioned single exception to "terminal interior is out." Seed it as an exterior fixture readable from the crossing via the `tower` detail. No cross-room perception; the detail reads it by path.

### 3D. Terminal reorientation (requirements §4) — swap the arrival alcove to the north frontage

The terminal now sits **south** of the E–W avenue, so its north frontage must open onto the crossing. Requirements §4 was **relaxed** (owner sign-off): terminal rooms MAY be moved. The clean move is a **position swap between the arrival alcove and dead Departure Gate C** — Gate C is authored out-of-service (`departure-gate-c.yaml`), so relegating it to the back is thematically free, and every exit stays grid-opposite.

**Current grid** (verified):
- `hall.yaml` (0,0,0): `north`→gate-c, `south`→arrival-gate, `east`→gate-a, `west`→gate-b, `up`→office.
- `arrival-gate.yaml` (0,−1,0): `north`→hall, `west`→plaza.
- `departure-gate-c.yaml` (0,+1,0): `south`→hall (dead gate; `populates` departure-terminal-c).

**Target grid** (north→south: crossing · arrival-gate · hall · gate-c):

| File | EDIT |
|---|---|
| `arrival-gate.yaml` | coords `y:-1` → **`y:+1`**; exits become `north` → `/domain/eternal/university-avenue/crossing` and `south` → `/domain/terminus/terminal/hall` (was `north`→hall, `west`→plaza). |
| `hall.yaml` | swap: `north` → **arrival-gate** (was gate-c), `south` → **gate-c** (was arrival-gate). East/west/up unchanged. |
| `departure-gate-c.yaml` | coords `y:+1` → **`y:-1`**; exit `south`→hall becomes **`north`→hall**. `populates` departure-terminal-c unchanged (it seats into gate-c regardless of position; no fast-travel disruption). |
| `crossing.yaml` | `south` → `/domain/terminus/terminal/arrival-gate` (Phase 3A). |

**Prose updates (same edits):**
- `arrival-gate.yaml` — it's now the **north** frontage: the concourse lies **south** (behind), the avenue doorway faces **north** onto the crossing, and across the avenue stands the university gate. Rewrite the `longDescription` + the `avenue`/`plate` details from the old "concourse to the north / doorway to the west onto University Avenue" to this orientation.
- `hall.yaml` — "an arrival alcove yawns to the **south**" → **north**; "Above the arch to the arrival gate, the Authority's seal" (the arrival arch is now the north wall); the departures-board/east-west gate prose stays; gate-c is now off the **south**.
- `departure-gate-c.yaml` — header/comment "the hall lies one cell **south**" → **north**.

**Test:** an integration test loading the terminal + crossing zones and asserting: `crossing.south` ↔ `arrival-gate` (reciprocal `arrival-gate.north` → crossing); `arrival-gate.south` ↔ `hall.north`; `hall.south` ↔ `gate-c.north`; `crossing.north` is a locked Door whose traverse vetoes with `gate:'locked'`; `crossing.west` → bank; and the old `plaza`/`north→bank`/`east→arrival-gate` edges are gone.

---

## Phase 4 — Gus + his gear (100% content)

Gus is a `Character`/NPC **seed** (mirror `seeds/domain/lounge/npc/dave.yaml` and the same-zone `.../university-avenue/npc/teller.yaml`). No new code.

**CREATE `seeds/domain/eternal/university-avenue/npc/gus.yaml`:**
- Class `/lib/npc/NPC` (or `/lib/character/...` if he needs a Crafter-like surface — he does not; NPC suffices). `_speciesPath` = homo sapiens (as teller.yaml). `name: Gus`, `primaryKeyword: gus`, warm folksy `shortDescription`/`longDescription` from the sheet.
- `StatusMixin` status "the crossing guard, watching the empty road" if the class composes it (confirm; behavior-driven status per the sheet). `Detailed` sub-features: `badge`, `vest`, `face`, `hands` (from the sheet).
- **`behaviors:`** list (data, `{ brain, trigger, config }`) mirroring dave.yaml/teller.yaml brain paths — verify the actual brain template paths under `/lib/behavior/` (`greets`, `idles`, `reacts`, `intent-dialogue`). Encode from `crossing-guard.md` *Behavior spec*:
  - `idles` on a cadence with the mixed pool (paces / paddle-check sequence / polish / `blow whistle` / mutters / anecdote).
  - `greets` on `arrival` → the greet-ritual sequence.
  - `reacts` on the crossing-in event → `see-across` (the ONLY tally path).
  - `reacts` on ignored/beeline, depart, and `blocked:down-avenue` (the east soft-wall line).
  - `intent-dialogue` on `addressed` with the canned keyword→line rules (help/lost, why/no-traffic).
  - **Verify the real event-trigger names** against the shipped npc-behavior substrate (the sheet flags `crossing-traversal` / `blocked:down-avenue` as aliases to pin at build). Grep the behavior brains for the trigger vocabulary they accept.
- **Stateless recognition (load-bearing):** configure his belief/recognition to **forget** per-interactor (no per-conversant memory). Grep the NPC/behavior/belief config keys for the "decline memory"/"stateless" flag and set it. This is the feature, not a bug — every meeting is the first. **Do NOT** wire him as a live/agentic NPC.

**Gear seeding (⚠ verify the mechanism — the one gear-seeding unknown, resolve FIRST in Phase 4):** no existing seed uses `wearing:`/`wielding:` keys (grep confirms). To place worn/wielded gear on an NPC:
- CREATE gear templates: `seeds/.../obj/vest.yaml` (Garment), `badge.yaml` (Adornment), `whistle.yaml`, `paddle.yaml`, `pocket-watch.yaml`, `thermos.yaml`, `crossing-log.yaml`.
- Stock them into Gus and set worn/wielded state. **Determine the supported path:** check `PersistenceSlice.ts` (it captures worn gear by index) and how `populates:`/`into:` places items — likely `populates: [{ template: .../vest, into: <gus> }]` plus a wear/wield step. If seeds cannot express worn/wielded state declaratively, the minimal path is a `PostRegistration` hook on a thin Gus subclass, or a seed-time wear call. Grep for any NPC that boots already wearing/wielding an item; if none exists, this is a small new seeding pattern to establish (note it in the embodiment/messaging subsystem doc at finalize).
- Behavior invariants (content): Gus **never sits** (no `sit` in his pool), **never opens the thermos** (no `open` on it), **never folds** the chair, **never `set`s** the watch (winds it daily → drift). These are behavior over real capabilities.

**Tests:** a seed-load test asserting Gus boots wearing the vest/badge and wielding the paddle, carrying watch/thermos/whistle/crossing-log; and a stateless-recognition test (two interactions from the same actor both greet fresh).

---

## Phase 5 — The ritual (engagement) + tally decoupling

Per `arrival-quad.md` §5 / `crossing-guard.md` *The movements*: the ritual is a short **engagement** (activity substrate / `EngagedMixin`); reactions ride it.

- **Wire the crossing ritual** as an engagement fired by Gus's `greets`/`reacts` brains on the **witnessed south-side arrival** (the `east`-in event in the sheet maps to the corrected **south**-in — the terminal is now south). Use the shipped activity/engagement substrate (grep `EngagedMixin`/`activity` for how an NPC begins/ends a scripted engagement; the sheet's `sequences:` are `ScheduledEmission` beats).
- **Tally-as-deed decoupling (load-bearing):** the crossing-log `tally` fires on the **witnessed arrival itself**, in the `reacts`/perception handler — **not** on the ritual sequence completing. An aborted performance still tallies. Implement so the tally emission is independent of the greet-ritual `ScheduledEmission` chain.
- **Batch rule:** simultaneous arrivals **batch one performance** ("the lot of you — mind the curb") but **tally per-arrival**. Because one Gus has one voice/attention slot, the arrival handler enqueues arrivals; the performance dedupes/batches while each arrival still appends its own mark. Verify the async dispatch/engagement bookkeeping doesn't double-fire or drop marks under concurrent arrivals.
- **Reactions ride the ritual:** players can `react` to Gus's performance — confirm the reaction substrate captures the ritual's reactable acts (the `ReactionApi.noteReactableAct` pattern in `Vocal.ts:177-182` is the model; Gus's emotes/says during the ritual should be reactable).

**Cross-cutting risks to watch (call out in the MR):**
- **Async dispatch / engagement bookkeeping** for batched simultaneous arrivals — the tally must fire exactly once per arrival regardless of batching.
- **Stateless-recognition config** — confirm Gus genuinely forgets (belief configured to not persist per-interactor).
- **Temp bank exit vs Gus's east soft-wall** — the bank is now `west` (reachable), and `east` is the soft-walled stub; ensure Gus's `blocked:down-avenue` reaction points at `east` (not the now-real `west` bank exit).
- **Terminal reciprocal** — the §4 fix touches `arrival-gate.yaml` + `hall.yaml` prose/coords; keep it bounded and verify no departure-gate regression.

**Tests:** tally fires per witnessed arrival (decoupled — abort the ritual mid-sequence, assert the mark persists); two simultaneous arrivals → one batched performance but two marks; departure (south-out) does **not** tally.

---

## Phase 6 — Live verify (the walk)

Run the server and walk the full vertical (mirror the acceptance list). Use the project's run/verify skill.

1. Arrive into the terminal, walk out `arrival-gate` → into the crossing (the witnessed south-side arrival). Gus's ritual fires: **whistle heard via Audible**, paddle raised, escort; crossing-log gets **one tally**.
2. `look tower` → true civic time; `examine watch` (if reachable) → drifted time; `wind` refills mainspring; drain to zero → watch shows stop-time.
3. `blow whistle` in the crossing → heard in-room and in `arrival-gate` (adjacent), attenuated + directional; a closed door on the path blocks; a louder source reaches farther.
4. Lamppost toggles on/off (and day/night); beacon toggles walk/stop.
5. Try `north` → **locked-gate veto** message; `examine gate` reads closed + locked.
6. `fold`/`unfold` the camp chair; `sit bench`; confirm Gus never sits, never opens the thermos.
7. Fixtures: examine/read/take street sign, posters, plane trees, shopfronts, terminal facade, litter bin + gutter litter, dynamic `tower` detail; room is `SkyExposed` with live weather + `_address`.
8. Cross back **south** → courteous see-off, **no tally**.

**Full suite stays green** (`vitest`, typecheck).

---

## Subsystem-doc updates (finalize-phase — FLAG, do not write now)

At sweep (`/finalize`), graduate knowledge into `docs/subsystems/`:
- `time.md` — the `Timekeeping` capability (`currentReading()`), `Watch` drift + mainspring `Reserve`, `ClockTower` accurate sibling, `wind`/`set`.
- the perception/messaging doc (`messaging.md` + `senses.md`/`perception.md`) — **Audible**: the audience-gather walk, `Scene.toAudible` push mode, the now-live `acousticDb` wire, `AudibleMixin`.
- `boundary.md` — **Switchable** + **LockedMixin** (+ the `Exit.canTraverse` `'locked'` gate).
- `posture.md`/`slot.md` — **Foldable** (fold/unfold, sit-gating).
- Correct `arrival-quad.md` §2 to this geometry (staging doc).
- Note the new NPC gear-seeding pattern (if established in Phase 4) in the embodiment/messaging doc.
- Add the **`device`** command category to CLAUDE.md's category list (File Naming Conventions + command-routing).

Then retire this plan + the requirements doc per `docs/workflow.md`.

---

### Critical files for implementation
- `packages/server/src/mud/lib/perception/modalities/SoundModality.ts` — fork `walkAt` into the audience-gather (Audible).
- `packages/server/src/mud/lib/message/Scene.ts` — add the `toAudible` push delivery mode.
- `packages/server/src/mud/lib/boundary/Exit.ts` — add the `'locked'` traverse gate (§5); confirms dangling-destination safety.
- `packages/server/src/mud/lib/reserve.ts` (+ `obj/Campfire.ts`) — the mainspring `Reserve` pattern for `Watch`.
- `packages/server/src/mud/seeds/domain/terminus/terminal/arrival-gate.yaml` (+ `hall.yaml`, and the renamed `.../university-avenue/crossing.yaml`) — the §4 reciprocal geometry fix.
