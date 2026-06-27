# Implementation Plan: NPC behavior Wave 1

Contract: [npc-behavior-requirements](../requirements/npc-behavior-requirements.md).
Seeding slate: [npc-behavior-slate](../slates/builds/npc-behavior-slate.md).
Substrate consumed: [activity](../subsystems/activity.md),
[hot-reload](../subsystems/hot-reload.md), [cms](../subsystems/cms.md),
[location](../subsystems/location.md), [time](../subsystems/time.md).

## 0. Grounding summary (what the codebase actually gives us)

Verified against the build-1 worktree:

- **`Character`** (`lib/character/Character.ts`) composes `CommandGiver → Mobile → Engaged → Soul → Vocal → Perception → Perceiver → Sensor → Gendered → Persona → Status → BeliefStore` over `Creature`. It is `abstract`. No `NPC` subclass exists. `EngagedMixin` is already on every Character.
- **Emission is `this`-based for speech/emote.** `VocalMixin.say/whisper/shout` (`lib/message/Vocal.ts`) emit with `this` as the speaker (`vocalEmit(this, …)`). `SoulMixin.emote/emoteFree` (`lib/social/Soul.ts`) the same. So a brain emits by calling `host.say(...)` / `host.emote(...)` — **the actor is the receiver, never an argument.** No `getActingAuthor` lookup is needed for these.
- **Locomotion takes an explicit `actor`** — `LocomotionApi.traverseWithDefault(actor, exit)` / `engageAround(actor, …)` (`api/locomotion.ts` → `obj/api/LocomotionLogic.ts`). The logic methods are gated `AnyOf(FromModule('mud/api/locomotion#LocomotionApi'), SelfOnly)`. Calling through the **Api facade** satisfies `FromModule`, so locomotion is reachable from any frame regardless of ambient command.
- **`SchedulerApi.start(engagement)`** (`api/scheduler.ts`) → mutates `EngagedMixin._setEngagement`, which is `@CallSecurity(ApiOnly)`. The scheduler already wraps its own timer callbacks in `ExecutionContextApi.runRoot(SchedulerApi, 'fire', …)`. A brain *calling* `SchedulerApi.start` from a `ScheduleApi.recurring` callback is already inside a `runRoot(ScheduleApi, 'fire', …)` frame, and `SchedulerApi.start` is an Api static — the `_setEngagement` `ApiOnly` gate is satisfied by SchedulerApi being the caller. This is the only emission path that touches an `ApiOnly` mutator.
- **`ScheduleApi.recurring(intervalMs, fn, opts?)`** (`api/schedule.ts`) wraps every fire in `ExecutionContextApi.runRoot(ScheduleApi, 'fire', …)` via `planRun`. Supports `initialDelayMs` and `fixed-delay`/`fixed-rate`. **There is no built-in jitter** — we add jitter ourselves (per-fire re-schedule, see §4).
- **`EventApi.on(EventClassOrName, listener, {filter, until})`** (`api/event.ts`) supports class-or-name subscription with a pre-dispatch `filter` and an `until` auto-unsubscribe. Listeners run in a fresh `EventDispatch` frame.
- **Arrival/departure**: the only bus event is `Events.StuffFieldChanged` (`'stuff.fieldChanged'`, payload `{target, field, oldValue, newValue}`) — fires on `container` changes. Object-local **witness hooks** also exist: `Container.onContainableAdded/onContainableRemoved` and `Containable.onMoved(from, to)` (`lib/spatial/Container.ts`, `lib/spatial/Containable.ts`), fired from `ContainmentApi.move`.
- **Witnessed-emote: NO event exists.** There is no `ReactionFiredEvent`, no emote bus event, no `addressed`/`CommandDispatched`/speech event anywhere. Emotes go out as Scene frames (`world.expression.emote` topic) with no bus emission. **This is the single biggest under-specification — see §4 + §11 Risks.**
- **Reactability gap for NPC speech**: `vocalEmit` captures a reactable act only `if (commandId)` from `getCurrentCommandContext()`. Under a `runRoot` frame there is **no `commandId`** (only `causingCommandId`). So NPC ambient speech/emote is emitted and perceived normally, but is **not registered as a reactable act**. Acceptable for Wave 1 (reactions are player-driven); note it for traits/dialogue downstream.
- **Path resolution**: `StuffApi` has private `#validateClassPath` (allows `/lib/`, `/obj/`, `/domain/`) and `#resolveAbsoluteClassPath` (logical → absolute `.ts`/`.js`). Public surface: `StuffApi.loadClassByPath(classPath)` — but it resolves the **basename-derived export name** (`className`), not an arbitrary export. **A brain's concept-export is `brain`, not the basename.** So `loadClassByPath` cannot be reused as-is. We need a small new Api method (§2).
- **HMR re-resolve precedent**: `HotReloadApi.getCurrentExport(absPath, exportName)` — used by every api↔logic singleton (`MaterialLogic`, `LocomotionLogic`, `WorldClockLogic`, …) and `StuffApi.clone`. This is exactly the re-resolve seam for brains.
- **Hydration**: `static persistentFields = [...]` (e.g. `Persona.ts`, `Sexed.ts`), two-phase `PersistentHydrator` (Phase 1 property fields via `setX`/bracket-assign; Phase 2 instruction fields via required `applyX`). `behaviors:` should be a **property field** (raw spec array persists as-is). `postRegister` super-chain precedent is `CommandGiverMixin.postRegister` (`lib/command/CommandGiver.ts:251`).
- **WorldClock**: `WorldClockApi.getNow(): Quantity<'s'>`; `Calendar.decompose(t) → {year, month, day, weekday, hour, minute}` (`lib/time/Calendar.ts`). `weekday` is 0-based. This is the shift-guard read.
- **CMS save-gate**: `CmsLogic._writeContent` (`obj/api/CmsLogic.ts`) parses JSON `data`, then `gateContentWrite`, then `saveTemplate`. The brain-path validation lands here, after parse / before save, server-side only. No React surface.
- **Content**: `domain/lounge/{Lounge,Bar,LoungeWarren,LoungeTerminal,LoungeMixin}.ts` + `seeds/domain/lounge/*.yaml` exist as bare shells. `bar.yaml` is description-only. Human species + biped body plan are ready. Bar fixtures, the five cast NPCs, the off-stage holding location are **not authored**.

---

## 1. Build sequence (what must land before what)

```
Phase A  Brain descriptor contract + module category       (types only, no runtime dep)
   │
Phase B  Path-resolve / lazy-load / re-resolve mechanism    (depends on A's export name)
   │
Phase C  BehavedMixin + NPC class + Mixins registry         (depends on B)
   │
Phase D  Trigger wiring (cadence + event) inside Behaved    (depends on C)
   │
Phase E  Slot contention (claims/requiresFree, preempt)     (depends on D + descriptor)
   │
Phase F  The seven canned brains                            (depends on A–E; brains are leaves)
   │
Phase G  CMS save-gate brain-path validation                (depends on B; parallelizable after B)
   │
Phase H  Content authoring under domain/lounge/             (depends on C + F)
   │
Phase I  Tests + docs                                       (throughout; final sweep at end)
```

Phases A–E are the engine. F is parallelizable per-brain once A–E land (each brain is an independent leaf module). G can start as soon as B lands. H needs C (the NPC class) and the brains it references (F). The `shifts` brain (F) and the off-stage location + fixtures (H) are co-dependent — author the location shell first, then `shifts`, then wire the schedule data.

---

## 2. Phase B — Path resolution, lazy-load, per-invocation re-resolve

**This is the load-bearing HMR seam.** The contract (slate §2, requirements "Path-resolution") is: logical brain path `/lib/behavior/patrols` → absolute fs → `HotReloadApi.getCurrentExport(absPath, 'brain')`, re-resolved **every fire**, never captured at spawn.

**Reuse vs. new method.** `StuffApi.loadClassByPath` resolves the *basename* export, not `brain`. `#validateClassPath` / `#resolveAbsoluteClassPath` are private. So:

- **Add one new public method to `StuffApi`** (it owns the logical→absolute resolver and is already the home of `loadClassByPath`):

  ```ts
  // api/stuff.ts — new public static, mirrors loadClassByPath but
  // resolves a caller-named export, and does NOT fall back to a bare
  // import-by-basename (brains export `brain`, not a class named after the file).
  static resolveExport(classPath: string, exportName: string): unknown | null
  ```

  It calls `#validateClassPath` (reuse — gives us the `/lib/` prefix guard + `..` rejection for free), `#resolveAbsoluteClassPath` (reuse — the same logical→absolute mapping `clone` uses), then `HotReloadApi.getCurrentExport(absPath, exportName)`, with a lazy `HotReloadApi.reload(absPath)` on a registry miss (mirroring `clone`'s self-warm), and returns `null` on frozen/unresolvable. Synchronous if the path is already in the registry; brains are warmed once at wire time (Phase D), so per-invocation re-resolve is a synchronous registry hit.

  **Why on `StuffApi`, not a free-floating helper**: module-category discipline (CLAUDE.md) forbids free-floating helpers; the logical-class-path resolver is `StuffApi`'s concept; `Behaved` consuming it through the Api boundary is the sanctioned path. This keeps the framework runtime doing exactly one thing — "follow the reference it was handed" — and never enumerating.

- **`BehavedApi` decision (judgment call, flagged)**: the requirements say "respect module categories; no free-floating helpers." The resolve mechanism itself belongs on `StuffApi` (it's path resolution). But the brain-*invocation* wrapper (resolve → check null → call the entry contract inside the right frame) is behavior-subsystem logic. **Recommendation: keep it as a private method on `BehavedMixin`** (`_resolveBrain(path)` / `_fireBrain(spec, event)`), not a new Api — there is no cross-subsystem caller for it, so a `BehavedApi` would be a premature surface. If a second consumer appears (dialogue Wave 2 resolving responders), graduate to `BehavedApi` then. This is the no-premature-Api instinct.

**HMR correctness invariants** (requirements "HMR correctness"):
- No `instanceof` / class-identity check anywhere on the resolution path (the brain is a plain object descriptor, compared by nothing — just invoked).
- Re-resolve per invocation: `Behaved` stores only the **path string** in its live wiring, and calls `_resolveBrain(path)` at the top of every cadence fire / event handler. Editing a brain → `HotReloadApi.reload` → next fire picks up new code.
- Accept the documented activity-HMR caveat: a brain that registers a `SustainedEngagement` pins emission closures + field shape to construction (same as RespirationDrain). Brains should keep emission closures thin delegates back into the brain entry (re-resolved), mirroring `RespirationDrain` delegating to `RespirationMixin`.

---

## 3. Phase A — The brain descriptor contract (new sanctioned module category)

**A brain module** lives at `lib/behavior/<name>.ts`; its **sole concept-export** is `export const brain = { … }`. This both marks the module and carries metadata (slate "surface decisions", open-question 2).

Proposed descriptor shape (types live in `lib/behavior/brain.ts` — the category's type home; NOT free-floating, it's the category definition):

```ts
// lib/behavior/brain.ts — the brain category contract
import type { Stuff } from '../stuff/Stuff';
import type { EngagementSlot } from '../activity/Engaged';
import type { MessageFrame } from '@saxonberg/types';

export interface BrainContext {
  host: Stuff;                 // the NPC (or reactive-scenery host) — the actor
  config: Record<string, unknown>;
  // Present for witness (perception) triggers: the frame the host
  // perceived, plus the resolved subject when recoverable (emote/speech
  // via meta.commandId→actInfo; arrival via room-inspection).
  perceived?: { frame: MessageFrame; subject?: Stuff };
  trigger: { source: 'cadence' | 'witness'; raw: string };
}

export interface BrainDescriptor {
  name: string;                          // display name (CMS palette)
  description?: string;
  configSchema?: BrainConfigSchema;      // per-brain config shape (future config-form)
  claims: ReadonlySet<EngagementSlot> | readonly EngagementSlot[];
  requiresFree: ReadonlySet<EngagementSlot> | readonly EngagementSlot[];
  // The entry contract the framework invokes when a wired trigger fires.
  // Async-friendly. Returns void; emission is the side effect.
  // General enough for a dialogue responder: `event` carries the
  // triggering payload (a future `addressed` event for tree-dialogue).
  act(ctx: BrainContext): void | Promise<void>;
}
```

**Why this shape generalizes to a dialogue responder** (downstream seam, requirements "Seams"): `act(ctx)` receives `perceived` (the witness frame + resolved subject — a future `addressed`/spoken-to brain reads the speech frame + speaker), `config` (the tree reference / rules), and `host`. A `tree-dialogue` brain reads `ctx.perceived.frame` + `ctx.perceived.subject`, walks the tree from `config.tree`, and emits `host.say(...)`. Nothing in the contract forecloses it. **Keep `act` the only behavioral export and keep `claims`/`requiresFree` brain-declared** (not author-set) so the spec stays `{ brain, trigger, config }`.

**Traits seam** (requirements "Seams"): brains read `host` and emit through channels that can later carry a disposition valence. Leave the read-point obvious — a brain's `act` is the natural place a future traits build inserts `TraitsApi.read(host)` to bias emission-pool sampling. Do not build it; document the seam in `behavior.md`.

**Module-category registration** (acceptance): add "Brains" to CLAUDE.md's Module Categories table (path `lib/behavior/<name>.ts`, marker `export const brain`, no class, no registry). Document fully in the new `docs/subsystems/behavior.md`.

---

## 4. Phase D — Trigger wiring (cadence + event)

A trigger is a thin selector over two sources (requirements "Triggers"). `Behaved` parses the spec's `trigger` string at wire time and installs the right substrate.

**Cadence** (`cadence:Ns` → jittered recurring):
- Parse `cadence:8s` → base interval ms.
- **Jitter (we must add it — `ScheduleApi.recurring` has none)**: schedule via a small `Behaved._scheduleJittered(baseMs, fn)` that uses `ScheduleApi.schedule` recursively, each fire drawing `delay = base * (1 ± jitterFraction)` (default ±25%). This gives true per-fire jitter so a room of NPCs never ticks in lockstep (acceptance: "Cadence triggers are jittered"). The callback already runs inside `runRoot(ScheduleApi,'fire',…)` — the frame brains need.
- **Presence-gating (requirements "Jitter / cost")**: at the top of every cadence fire, `Behaved` (before invoking the brain) checks whether the host's room has a perceiving audience (walk the container's contents for any `SensorMixin` holder, via `MixinApi.isSensor`). If none, **skip the tick** (cheap return) to avoid burning cycles in an empty bar. Put this gate in `Behaved` (uniform, before `act`) so every ambient cadence brain gets it free; `shifts` opts out (it must run with no audience to migrate offstage cast). **Recommendation: a `presenceGated` flag on the descriptor**, default `true`, `shifts` sets `false`. This is a small addition to the descriptor not named in requirements — flagged.

**ALL event triggers ride the `SensorMixin.handleMessage` perception
witness — ZERO new emissions and ZERO global-event subscriptions of our
own.** (Design correction history: a new global `EmotePerformed` event
was rejected as hot-path overkill; then arrival/departure-via-`Events.
StuffFieldChanged` was also rejected — a global-bus subscription running
every NPC's listener on every world container change is exactly the
reliance the witness preference exists to avoid. Everything an NPC reacts
to, it already *perceives*.)

`BehavedMixin` overrides `SensorMixin.handleMessage` (the documented
"NPCs override for AI processing" hook), super-chaining
(`super.handleMessage(frame)`) so default delivery is preserved. On each
perceived frame it dispatches to brains whose trigger matches the frame
`topic`. Only wired on `MixinApi.isSensor` hosts (Character/NPC; reactive
scenery may not be a Sensor).

- **witnessed-emote / witnessed-speech (`reacts`)** → frame topic
  `world.expression.emote` / `world.speech.*`. The acting subject is
  recovered via `frame.meta.commandId → ReactionApi.actInfo(commandId)`
  (the existing renown "speaker-recover" seam) when a `commandId` is
  present (player-originated acts have one; NPC ambient acts under
  `runRoot` do not, so NPC→NPC reactions are silently skipped in Wave 1 —
  acceptable).
- **`arrival` / `departure` (`greets`)** → frame topic
  `world.narration.movement`. The host already perceives the movement
  frame as a room peer. **The "who" problem:** `MessageFrame.meta` carries
  no structured actor and movement is not in the reactable-act registry,
  so the frame signals "someone moved near me" but not who. Resolved
  **witness-side, no producer touch (Option A)**: on a movement frame,
  `greets` inspects the host's room contents against a small per-host
  "seen" set (runtime state on the host); the delta is the arriver(s),
  filtered to players. Departure frames prune the set. (Rejected
  alternative — Option B: enrich movement frames with `meta.actor` in
  `Mobile.ts` + the `meta` type; cleaner read but a cross-subsystem touch.
  Revisit if directed greets need it.)
- **`addressed` / `given` are deferred** (requirements Non-goals) — not
  wired. `addressed` lands in dialogue Wave 2 as another `topic` predicate
  on the same `handleMessage` witness (the speech frame already arrives;
  dialogue adds the directed-`--to` discrimination).

**Friendly-alias → witness predicate** (the resolved sub-question): a
small table in `lib/behavior/brain.ts` (part of the category) — every row
is a frame-`topic` predicate over `handleMessage`, not a bus subscription:
```
'arrival'    → handleMessage  (topic=world.narration.movement; room-inspect delta = arriver)
'departure'  → handleMessage  (topic=world.narration.movement; room-inspect delta = leaver)
'emote'      → handleMessage  (topic=world.expression.emote, subject≠host)
'speech'     → handleMessage  (topic=world.speech.*, subject≠host)   // available; reacts uses emote
```
There is intentionally **no raw `EventApi.on` passthrough** in the Wave 1
alias set — keeping the canned-brain trigger surface entirely
witness-based. (A future brain that genuinely needs a non-perceptual
trigger can subscribe to a bus event explicitly, but that is an
author-by-author opt-in, not a path the framework offers by default.)

**Framework-internal event we inherit (not ours):** when `wanders` /
`patrols` register a `SustainedEngagement`, the activity scheduler itself
subscribes to `Events.StuffDestructed` for host-cleanup (shipped
behavior). We add no subscription.

**State-as-guard**: never a third trigger. A brain reads `WorldClockApi` (decomposed via `Calendar`) inside `act` and no-ops outside its hours. `shifts` is the canonical example; `patrols` with `activeHours` config the secondary.

**Live wiring is runtime-only** (requirements "Runtime-only live state"): the `ScheduleHandle`s and `Subscription`s `Behaved` installs are stored in a runtime-only field (mirror `EngagedMixin._engagements` — NOT in `persistentFields`). On reboot/re-clone, `postRegister` re-installs everything from the persisted `behaviors:` spec data.

---

## 5. Phase C — BehavedMixin + NPC class + registry

**`lib/behavior/Behaved.ts`** — `BehavedMixin`, branch-agnostic (composes on any Stuff base):
- `static _mixinName = 'BehavedMixin'`.
- `static persistentFields = ['behaviors']` — the raw spec array `[{brain, trigger, config}, …]` persists as-is (property field, Phase 1 hydration; **not** an instruction field — no `applyBehaviors`, because wiring is a postRegister concern not a hydrate concern, and wiring needs the host fully constructed + registered).
- Runtime-only live state: `private _behaviorWiring: { handle?: ScheduleHandle; sub?: Subscription }[]` (mirrors `_engagements`).
- `postRegister(context)` — **super-chained** (the `CommandGiverMixin` precedent verbatim: read `Base.prototype.postRegister`, `await sup.call(this, context)` if present, then do our work). Our work: cancel any existing wiring (idempotency), then for each spec in `this.behaviors`, parse the trigger, install cadence schedule or event subscription that calls `this._fireBrain(spec, event?)`.
- `_fireBrain(spec, event?)`: re-resolve `spec.brain` via `StuffApi.resolveExport(spec.brain, 'brain')` (Phase B) → if `null`, log + skip (a deleted brain degrades gracefully, never crashes the NPC). Build `BrainContext`. Apply slot contention (Phase E). Invoke `descriptor.act(ctx)` inside the frame (cadence fires already have `runRoot`; event handlers run in `EventDispatch` frames — locomotion's `FromModule` is satisfied by the Api facade regardless, and `say`/`emote` are `this`-based with no gate, so event-frame emission is fine).
- A teardown hook (on destruct / re-hydrate) that cancels all live wiring before re-installing — so CMS go-live (`restoreFromTemplate` re-hydrate) and re-clone don't leak duplicate schedules/subscriptions. Hook on the destruct witness + cancel-then-install at the top of `postRegister`. **Flag**: verify `restoreFromTemplate` re-runs `postRegister` (or whether `Behaved` needs a dedicated re-hydrate signal) — open implementation detail.

**`lib/character/NPC.ts`** — thin: `export class NPC extends BehavedMixin(Character) {}`. Keeps `Behaved` off player `Avatar` and off base `Character`. Cast templates set `class: /lib/character/NPC`. `Character` is `abstract`; `NPC` is concrete (it's cloned). Match the export shape `StuffApi.clone` expects (basename export `NPC`, plus default if the clone path needs it — verify against `Avatar.ts`).

**`lib/mixin.ts`** — add `Behaved: 'BehavedMixin'` to the `Mixins` registry (acceptance).

**Composition validation**: `Behaved` requires nothing structurally (branch-agnostic). Slot contention is gated behind `MixinApi.isEngaged(host)` — only applied when the host composes `EngagedMixin` (Character does; reactive-scenery Thing/Location does not). No `assertComposable` rule needed.

---

## 6. Phase E — Engagement-slot contention

The decision the requirements explicitly hand the planner: **do canned brains register as Engagements (real slot occupancy) or a lighter slot-claim?**

**Recommendation: brains that perform durative/sustained motion register a real `SustainedEngagement`; purely-instantaneous brains use a lightweight claim check, not a registration.** Grounding:
- `wanders`/`patrols` are genuinely "the actor is doing something with its body over time" — they register a `SustainedEngagement` (claims `body`) via `SchedulerApi.start`, exactly like `RespirationDrain`. This gives them real slot occupancy in the `EngagedMixin` map, so the framework's existing concurrency rule ("two engagements co-occupy iff slot sets disjoint") and the `preconditions-changed` abort do the contention for free — no new arbitration code.
- `idles`/`random-chatter`/`greets`/`reacts` are instantaneous emissions (a say, an emote) — they do NOT occupy a slot over time. For them, "claims `voice`/`attention`" means a **momentary check**, not a registration: before emitting, `Behaved` checks `SchedulerApi.getEngagementBySlot(host, slot)` for the slots the brain `requiresFree`; if occupied by a cadence engagement and this is an event trigger, **preempt** (cancel the cadence engagement with `'preconditions-changed'`), emit, done. There's nothing to register because the act is instant.

**The worked case (wander-pauses-on-arrival)**:
1. `wanders` (cadence) registers a `SustainedEngagement` claiming `body`, `requiresFree: attention`.
2. An `arrival` event fires `greets` (event trigger). `greets` claims `attention` momentarily.
3. **Witness-preempts-cadence default**: because `greets` is witness-triggered and the wander engagement `requiresFree: attention`, `Behaved` cancels the wander engagement with `'preconditions-changed'` → wander pauses.
4. `greets` emits (`host.say` / `host.emote`).
5. The next `wanders` cadence fire re-registers the engagement (re-resolved brain), `attention` now free → resumes. (**Judgment call**: Wave 1 resume = next-tick re-start, not a suspended-engagement resume. Simpler and rides existing cadence. Document it.)

**Default policy is purely structural**: witness triggers preempt cadence triggers; no priority numbers (requirements). Implement as: in `_fireBrain`, if `trigger.source === 'witness'` and a slot in `descriptor.requiresFree` is occupied by an engagement originating from a cadence behavior, cancel it. Cadence engagements are the only registered engagements brains create, and witness brains don't register, so "occupied by a cadence engagement" ≡ "occupied by any behavior engagement." Tag the engagement `type` with the brain name (`'wander'`, `'patrol'`) for clarity.

This grounds contention entirely in the shipped `EngagedMixin`/`SchedulerApi` reality with no new arbitration subsystem — exactly the slate's intent.

---

## 7. Phase F — The seven canned brains

Each is `lib/behavior/<name>.ts` exporting `const brain`. Config shapes + claims/requiresFree + substrate:

| Brain | Trigger | claims | requiresFree | Substrate | Config shape |
|---|---|---|---|---|---|
| **`idles`** | cadence | — | — | `host.emote` / `host.emoteFree` / `host.say` via a **mixed-emission sampler** | `{ pool: Array<{ kind:'emote'\|'verb'\|'free'\|'sequence', value, weight? }> }` — samples one entry per fire (Gus's idle-business shape) |
| **`random-chatter`** | cadence | `voice` | — | `host.say` | `{ lines: string[], jitter? }` |
| **`wanders`** | cadence | `body` | `attention` | `SchedulerApi.start(SustainedEngagement)` → `LocomotionApi.traverseWithDefault(host, exit)` random valid exit | `{ avoid?: paths[], activeHours? }` |
| **`patrols`** | cadence | `body` | `attention` | as wanders but ordered `route` | `{ route: string[] (room path-refs), activeHours? }` — "contains refs ≠ is a ref": route is inline data whose elements are path-refs |
| **`greets`** | `arrival` (handleMessage witness) | `attention`(momentary) | — | `host.say` / `host.emote` to the arriver (room-inspect delta vs per-host seen-set) | `{ lines: string[] }` |
| **`reacts`** | `emote` (handleMessage witness) | `attention`(momentary) | — | `host.emoteFree` / `host.say` reacting to the perceived actor (via `meta.commandId`→`actInfo`) | `{ reactions: Array<{ to: verb, respond }> }` |
| **`shifts`** | cadence | — | — | WorldClock/day-of-week guard → `LocomotionApi.traverseWithDefault`/`teleport` migrate; `presenceGated:false` | `{ schedule: Array<{ days:number[], hours:[start,end], state:'on-shift'\|'off-shift-day'\|'fully-off', station? }>, behindBar, railStool, offstage }` |

**`idles` claims nothing** (not `voice`) — instant ambient emissions yield to nothing, block nothing (judgment call, flagged).

**`shifts` detail** (requirements "Content scope"): cadence trigger (e.g. `cadence:60s`) + a guard reading `WorldClockApi.getNow()` → `Calendar.decompose` → `{weekday, hour}`. It looks up the host's `schedule` config for the current slot and computes desired `state`:
- **on-shift** → ensure host is behind the bar (`station`/`behindBar`); work behaviors (the other specs — `idles`/`random-chatter` flavored "wiping the rail") run wherever the NPC is.
- **off-shift-day** → migrate to a `railStool` location as a patron; patron behaviors (`idles`/`random-chatter`) run from the same spec list.
- **fully-off** → migrate to the `offstage` holding location (no audience there, hence `presenceGated:false` so migration still fires).
Migration is `LocomotionApi.traverseWithDefault` along a path, or `Mobile.teleport` for offstage moves with no exit (verify). `shifts` is **presence/migration only** — NOT the till-count/reconcile ritual (Non-goal).

**Per-invocation re-resolve note for engagement-registering brains**: `wanders`/`patrols` register a `SustainedEngagement` whose emission closure must be a thin delegate (re-resolve the brain inside, à la `RespirationDrain` → `RespirationMixin`), so emission-closure-pinning (the activity HMR caveat) doesn't defeat brain HMR. Concretely: the engagement's `ScheduledEmission.event` calls back into `Behaved._fireBrain` (which re-resolves), not a captured brain reference.

---

## 8. Phase G — CMS save-gate brain-path validation

**Location**: `CmsLogic._writeContent` (`obj/api/CmsLogic.ts`), after JSON parse / before `saveTemplate`. Server-side only, no React surface (requirements "No build-2 collision").

**Logic**: if parsed `data.behaviors` is an array, for each entry with a `brain` string, validate it resolves: call `StuffApi.resolveExport(entry.brain, 'brain')` (the Phase B method — single source of truth for "does this brain path resolve") and reject with `CmsError('invalid', 'unresolvable brain path: <path>')` if `null`. This is the "References validated at the save-gate" half (the other half is resolution-time validation in `Behaved._fireBrain`). Acceptance: "an unresolvable brain path is rejected at the CMS save-gate."

**Minimal touch**: ~10 lines in one private method, plus a module-private `validateBehaviorPaths(data)` helper in `CmsLogic.ts` (homed with the surface, not free-floating — mirrors the existing module-private `gateContentWrite`). Coordinate if `CmsLogic.ts` is contended with build-2.

---

## 9. Phase H — Content authoring under domain/lounge/

All under `domain/lounge/` (classes) + `seeds/domain/lounge/` (seed YAML), per the placement rule. Engine code stays in `lib/`.

**The five cast NPCs** — `seeds/domain/lounge/npc/{mara,remy,sloane,augie,dave}.yaml`, each:
```yaml
class: /lib/character/NPC
hydratorClass: /lib/persistence/PersistentHydrator
data:
  shortDescription: Mara
  species: /lib/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens
  behaviors:
    - { brain: /lib/behavior/shifts, trigger: cadence:60s, config: { schedule: [...], behindBar: ..., railStool: ..., offstage: ... } }
    - { brain: /lib/behavior/idles, trigger: cadence:9s, config: { pool: [...] } }
    - { brain: /lib/behavior/random-chatter, trigger: cadence:20s, config: { lines: [...] } }
    - { brain: /lib/behavior/greets, trigger: arrival, config: { lines: [...] } }
    # Mara: wiping the rail; Remy: holding court (more chatter); etc.
```
Acceptance: "a content author builds an NPC entirely from data with no new code." No per-NPC class is needed — `NPC` + behavior data only. (A thin archetype class is a future combo; Wave 1 ships none.)

**Bar fixtures** — minimal, reuse existing mixins (`Surfaced` for the rail/bar surface to wipe + back-bar; `Slotted`/`Postured` for rail stools). Likely `domain/lounge/BarFixtures.ts` or extend `Bar.ts`; seed under `seeds/domain/lounge/`. The rail surface is what `idles`/work-flavor emotes reference ("wipes the rail"); stools are where off-shift-day cast sit. Wire into the existing `bar.yaml` shell.

**Off-stage holding location** — `domain/lounge/Offstage.ts` (or a bare `Location`) + `seeds/domain/lounge/offstage.yaml`. A holding pen, not connected by a player-traversable exit; `shifts` migrates fully-off cast here (likely `teleport`, since no diegetic exit). Not a Warren member.

**Seeding wiring**: confirm how `seeds/domain/lounge/*.yaml` get registered (the lounge seeder) and add the npc/ + fixtures + offstage entries.

---

## 10. Phase I — Tests + docs

**Tests** (acceptance criteria, one per):
- `Behaved` wiring + per-invocation re-resolve — drive `postRegister`, assert schedule/subscription installed; assert `_fireBrain` calls `StuffApi.resolveExport` every fire (spy).
- HMR re-resolve — the headline test: wire a brain, fire once, `HotReloadApi.reload(brainAbsPath)` with edited code, fire again, assert new behavior (mirror `api/__tests__/singleton-sync.test.ts` against an on-disk fixture brain).
- Each canned brain (`idles`, `random-chatter`, `wanders`, `patrols`, `greets`, `reacts`, `shifts`) — unit, with a stub host.
- Slot contention — register `wanders` (body, requiresFree attention), fire `arrival`→`greets` (attention), assert wander engagement cancelled `'preconditions-changed'`, assert next cadence re-starts it.
- Cadence jitter — assert successive intervals vary within the jitter band (no lockstep across two hosts).
- Event-trigger firing — arrival/departure via `StuffFieldChanged`; witnessed-emote via the new `EmotePerformed` event.
- Shift presence resolution — drive the WorldClock test seam across day/hour boundaries; assert host migrates behindBar / railStool / offstage.
- CMS save-gate — `CmsLogic.write` with an unresolvable brain path → `CmsError('invalid')`.
- Call-security frame — assert a cadence brain calling `host.say` / `LocomotionApi.traverseWithDefault` / `SchedulerApi.start` from the `runRoot` frame succeeds (no `SecurityError`).
- Demo/integration — clone the bar + cast, advance the clock, assert scheduled cast present + emitting through perception.

**Docs**:
- New `docs/subsystems/behavior.md` — source of truth: the brain category + descriptor contract, path-resolve/re-resolve/HMR, trigger model + alias table, slot contention (event-preempts-cadence, the worked case), the canned-brain table, the call-security frame story, the traits + dialogue seams, the new `EmotePerformed` event, the reactability gap.
- CLAUDE.md — doc-map entry for `behavior.md`; **Module Categories table** gains "Brains" (`lib/behavior/<name>.ts`, `export const brain`, no class/registry).
- `docs/subsystems/activity.md` — note NPC behavior as its **first behavior consumer** (alongside respiration as first engagement producer).
- `lib/mixin.ts` `Mixins` registry includes `Behaved` (also an acceptance item).
- If `EmotePerformed` lands, note it in `emotes.md`.

---

## 11. Architectural risk points

1. **Call-security frame for NPC emission** (real risk, investigated):
   - **Low-risk for say/emote**: `say`/`whisper`/`shout`/`emote`/`emoteFree` are `this`-based instance methods with **no `@CallSecurity` gate** — any frame can call `host.say(...)`. Actor is the receiver, never passed. No `getActingAuthor` involved.
   - **Low-risk for locomotion**: `LocomotionApi.traverseWithDefault`/`engageAround` gated `FromModule(locomotion#LocomotionApi)` — satisfied via the Api facade, regardless of ambient command.
   - **The one real gate**: `SchedulerApi.start` → `EngagedMixin._setEngagement` (`ApiOnly`). Satisfied because `SchedulerApi` is the caller and `ApiOnly` = `FromModule('mud/api/**')`. The brain calls `SchedulerApi.start` (an Api static); the chain is clean. The cadence callback's `runRoot(ScheduleApi,'fire',…)` frame provides the root.
   - **Event-handler frame**: listeners run in `EventDispatch` frames; say/emote ungated, locomotion via facade fine, `SchedulerApi.start` from an `EventDispatch` frame still satisfies `ApiOnly`. **Verify in a test.** Low residual risk.
   - **Reactability gap**: NPC ambient speech/emote under `runRoot` has no `commandId`, so not captured as a reactable act. Acceptable Wave 1; documented.

2. **All event triggers are witness-based** (`SensorMixin.handleMessage`) — no new emissions AND no global-event subscriptions of our own. `reacts` (emote/speech) recovers the actor via `meta.commandId → ReactionApi.actInfo`; NPC-originated acts under `runRoot` carry no `commandId`, so NPC→NPC reactions are silently skipped in Wave 1 (player acts resolve fine). `greets` (arrival/departure) perceives the movement frame and resolves "who" by room-contents inspection against a per-host seen-set (Option A — no producer touch). The only inherited event is the activity scheduler's own `StuffDestructed` host-cleanup subscription for `wanders`/`patrols` engagements.

3. **HMR re-resolve correctness**: the whole value prop. Risk is accidental brain-reference capture. Mitigation: store only path strings; re-resolve every fire; engagement emission closures delegate back through `_fireBrain`. No `instanceof`. Covered by the HMR test + hot-reload non-regression static test.

4. **Presence-gating to avoid empty-room ticks**: cost scales audience × cadence. Mitigation: `Behaved` presence-gates cadence brains by default (skip when no `Sensor` audience); `shifts` opts out. The `EmotePerformed` emit should itself be audience-gated.

5. **Jitter**: `ScheduleApi.recurring` has none — self-implement per-fire jitter. Risk of lockstep if forgotten. Covered by the jitter test.

6. **Go-live re-wiring**: CMS content save re-hydrates live clones via `restoreFromTemplate`. `Behaved` must cancel-then-reinstall idempotently so a save doesn't double-schedule. **Verify whether `restoreFromTemplate` re-runs `postRegister`** or whether `Behaved` needs a re-hydrate hook — open implementation detail.

7. **Offstage migration with no exit**: `shifts` moving cast to a roomless holding pen may need `Mobile.teleport` rather than `traverseWithDefault` (needs an `Exit`). Verify.

---

## 12. Downstream seams left clean

- **Traits**: `act(ctx)` is the obvious read-point for `TraitsApi.read(host)`; emission channels can later carry a disposition valence on the same act-signature. Don't build; document.
- **npc-dialogue Wave 2**: `BrainDescriptor.act(ctx)` takes `event` carrying a triggering payload — general enough for a `tree-dialogue`/`intent-dialogue` responder consuming a future `addressed` event. The trigger alias table is open (raw event-kind passthrough), so `addressed` slots in by adding one alias + the speech-interception event, both deferred. `claims`/`requiresFree` stay brain-declared (`tree-dialogue` will claim `attention`+`voice`).

---

## 13. Dev workflow & isolation (path-based)

The isolate → verify → broadcast workflow for editing a live brain
**falls out of the path-resolution grain** — it is not separate
machinery. The same brain code at two different paths is two independent
hot-reload registry entries, so "which path the spec points at" *is* the
isolation boundary, and "which path you reload" *is* the broadcast scope.

**What Wave 1 delivers (manual, using existing prefixes):**

- `#validateClassPath` already permits `/lib/`, `/obj/`, `/domain/`. A
  work-in-progress brain can live at a content-area path —
  e.g. `/domain/lounge/behavior/patrols-wip` — which is a *different*
  registry key than the canonical `/lib/behavior/patrols`.
- **Isolate**: spawn a throwaway test NPC whose spec names the WIP path;
  edit + `reload` the WIP path; iterate. Live NPCs referencing the
  canonical path are untouched (different key, re-resolved independently
  per fire).
- **Broadcast / publish**: once verified, copy the WIP module to the
  canonical `/lib/behavior/patrols` and `reload` *that* path. Every live
  NPC re-resolving the canonical path picks up the new code on its next
  fire — no spec edits, no re-spawn.
- **The publish model is "swap the code behind a stable path"**: NPC
  specs always reference the canonical path; publishing changes the
  *code at* that path, not the spec. So broadcast needs no per-NPC spec
  changes.

**The deferred polished workflow (NOT this lane):** the lease-scoped
author **sandbox** (`/home/<author>/...` writable, own registry key),
the **holodeck** (isolated test world), and the **drafts → staging →
publish gate** (the "law == code" forums-review pipeline) are explicitly
deferred in the CMS slate ("lease model / holodeck / op-log / publish
gate all deferred"; CMS currently "writes HEAD directly, no versioning")
and belong to the access + authoring-intelligence builds, not
npc-behavior. They drop in later with zero brain changes because the
three steps above are already path-driven.

**The load-bearing constraint this imposes on Wave 1:** brain resolution
must stay **purely path-driven** — `Behaved` only ever follows the path
string in the spec. No site may hardcode "brain X lives at
`/lib/behavior/X`", and no registry may assume a single canonical path
per brain-name. Honoring this is what lets the sandbox/holodeck/publish
machinery land later for free. (Documented in `behavior.md` as the dev
workflow + the isolation seam.)

---

## Under-specified items where the planner made a judgment call (flagged)

1. **Witnessed-emote substrate**: requirements name it but no emote event exists. **Recommendation: add `Events.EmotePerformed` + emit from `Soul.ts`** (touch outside `lib/behavior/`).
2. **`BehavedApi` vs. private mixin methods**: brain-invocation stays private on `BehavedMixin`; only the path-resolve mechanism goes on `StuffApi.resolveExport`. No premature Api.
3. **`presenceGated` descriptor flag** (default true; `shifts` false) — a descriptor field not named in requirements, needed for the presence-gating cost constraint.
4. **`idles` claims nothing** (not `voice`).
5. **Slot resume = next-tick re-start**, not a suspended-engagement resume.
6. **Engagement registration boundary**: only `wanders`/`patrols` register real `SustainedEngagement`s; instant brains use momentary slot-checks.
7. **Offstage move mechanism** (`teleport` vs `traverse`) — verify at impl.
8. **`restoreFromTemplate` → `postRegister`** re-run assumption for CMS go-live re-wiring — verify at impl.

---

## Critical files

**Create:**
- `packages/server/src/mud/lib/behavior/brain.ts` — `BrainDescriptor`/`BrainContext` contract + trigger alias table (the category type home)
- `packages/server/src/mud/lib/behavior/Behaved.ts` — `BehavedMixin` (wiring, re-resolve, contention, presence-gate)
- `packages/server/src/mud/lib/behavior/{idles,random-chatter,wanders,patrols,greets,reacts,shifts}.ts` — the seven brain leaves
- `packages/server/src/mud/lib/character/NPC.ts` — `NPC = BehavedMixin(Character)`
- `packages/server/src/mud/domain/lounge/{BarFixtures,Offstage}.ts` + `seeds/domain/lounge/{npc/*,fixtures,offstage}.yaml` — content

**Modify:**
- `packages/server/src/mud/api/stuff.ts` — `StuffApi.resolveExport(classPath, exportName)`
- `packages/server/src/mud/lib/mixin.ts` — `Mixins.Behaved`
- `packages/server/src/mud/obj/api/CmsLogic.ts` — `_writeContent` save-gate brain-path validation
- `seeds/domain/lounge/bar.yaml` — wire fixtures
- `docs/subsystems/behavior.md` (new), `CLAUDE.md` (doc-map + Module Categories), `docs/subsystems/activity.md` (first consumer note)

**No `Soul.ts` / `Events.EmotePerformed` touch** — witnessed-emote rides
the `SensorMixin.handleMessage` perception witness (override in
`Behaved.ts`); arrival/departure consume the existing `StuffFieldChanged`
bus. Zero new global emissions.
