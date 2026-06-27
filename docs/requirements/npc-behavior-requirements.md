# NPC behavior (Wave 1) — requirements

Wave 1 of the **NPC behavior** build: the automation layer behind
non-player `Character`s. It introduces a branch-agnostic **`Behaved`**
mixin that runs a declarative **`behaviors:` data-spec list**, plus a
set of **canned "brains"** — path-resolved, lazy-loaded, hot-reloadable
code modules that decide *what* an NPC emits while the NPC emits through
the channels we already have (speech, emote, locomotion, activity). It
is the **first real consumer** of the shipped-but-inert
[activity framework](../subsystems/activity.md), and the floor the whole
social world (and Dave's Bar) stands on.

The forcing function is the Dave's Bar demo: **walk into the bar at any
game-time and the currently-scheduled cast is visibly alive** — Mara
wiping the rail, Remy holding court, people moving and chattering — and
*who you meet changes with the clock*.

Seeded by [npc-behavior-slate](../slates/builds/npc-behavior-slate.md)
(model set, Wave 1 specified) and sequenced by
[daves-bar-track](../tracks/daves-bar-track.md) phase 1. The slate
resolved most open questions; this doc records the four remaining
build-shaping decisions and closes scope.

## Goals

- **A branch-agnostic `Behaved` mixin** that, at spawn, reads a host's
  `behaviors:` data-spec list (`{ brain, trigger, config }` entries),
  **path-resolves + lazy-loads** each brain, and **wires** each spec to
  its trigger substrate. Re-wires on every clone/reboot from the
  persisted spec data; live wiring itself is runtime-only.
- **Brains are path-resolved, lazy-loaded, marker-discovered code
  modules** under `lib/behavior/`, referenced by path string in a spec,
  **re-resolved per invocation** so editing a brain hot-reloads into a
  live NPC's *next action* with no re-spawn. No central registry.
- **The Wave 1 canned brain set**, each a path-resolved module:
  `idles` (a cadence sampler over a mixed emote/verb emission pool),
  `random-chatter`, `wanders`, `patrols`, `greets`, `reacts`, and
  `shifts` (time-of-day/day-of-week presence + migration).
- **Two trigger sources**: **cadence** (jittered, via
  `ScheduleApi.recurring`) and **event** (via `EventApi.on` —
  arrival/departure and witnessed-emote in Wave 1). State is a **guard**
  in brain code parameterized by config (e.g. a game-clock read for
  shift hours), never a third trigger source and never a condition DSL.
- **Engagement-slot contention** honored: each brain **declares**
  `claims` + `requiresFree` slots in its descriptor (not author-set);
  concurrent behaviors arbitrate through the existing `EngagedMixin`
  slot map; **event-triggered behaviors preempt cadence-triggered** ones
  by default (no priority numbers in v1).
- **A thin `NPC` class** (`Character` + `Behaved`) the cast templates
  use, keeping `Behaved` off player Avatars and off base `Character`.
- **The cast authored as content**: all five — Mara, Remy, Sloane,
  Augie, Dave — as `NPC` templates with behavior specs and shift
  schedules, plus the minimal bar fixtures their behaviors act against
  (a rail/bar surface to wipe, the back-bar, rail stools) and an
  off-stage holding location for off-duty cast.
- **Shift rotation**: the on-shift bartender is present and working
  behind the bar; the off-shift-day cast member appears as a **patron at
  the rail** (the warmth tell); fully-off cast are off-stage. Presence
  resolves from the game clock (time-of-day) and day-of-week.
- **Demo milestone**: walking into Dave's Bar shows the scheduled cast
  visibly alive through ordinary perception, and the cast composition
  shifts as game-time advances.

## Non-goals

- **The behavior spec-list editor / brain path-picker / config-form
  UI** — deferred to Wave 2 alongside the dialogue-tree widget (depends
  on the authoring-intelligence layer; overlaps the in-flight CMS build).
  Wave 1 authors NPCs + behavior specs as **hand-written YAML** through
  the existing CMS Monaco code editor. The *only* editor-side touch is
  **backend brain-path validation at the save-gate** (no UI). See
  [authoring-intelligence-slate](../slates/builds/authoring-intelligence-slate.md).
- **Dialogue brains** (`tree-dialogue`, `intent-dialogue`) and the
  dialogue-tree editor → [npc-dialogue Wave 2](../slates/builds/npc-dialogue-slate.md).
- **The `addressed` / spoken-to trigger and its speech-interception
  seam** → npc-dialogue Wave 2, where the responder brain consumes it.
  No speech event exists today and building the seam here would duplicate
  dialogue's work. Wave 1's `greets`/`reacts` key off arrival and
  witnessed-emote events, not off being spoken to.
- **The `scripted-behavior` brain** (the code-tier/script tail, gated on
  host isolation) and the **`llm-brain`** → later waves.
- **Traits / the personality layer, stress / the composure reserve** →
  the separate **traits** build, which *consumes* this one (the brains
  will read traits). This build leaves the seam; it does not build it.
- **Engaged-activity bar tasks** — the inventory clipboard, recipe-making,
  the shift-**change** till-count/reconcile **ritual**, glassware
  cycling/bussing → crafting + scripting waves. (Wave 1 ships shift
  *rotation* = presence/migration only; the in-room "count out the till"
  choreography is **not** in scope.)
- **The `guards` brain + the locomotion `'blocked'` block-substrate
  seam**, and **combat/defend** brains → Wave 3+ / RPG-deferred.
- **Scene-composer recognition-crowd aggregation** ("a couple of
  patrons") — unneeded; the Wave 1 cast are named NPCs.
- **State-triggers as a third source**, a **condition DSL**, and
  **per-slot capacity** for multi-limbed bodies — explicitly out per the
  slate.
- **Authored reactive-scenery content** (a murmuring door, a bubbling
  fountain). The mixin is branch-agnostic so a `Thing`/`Location` *can*
  carry behaviors; Wave 1 ships no such authored content.

## Surface decisions

### Brains are a new, explicitly-sanctioned module category

A brain is **neither a Stuff, an Api, a mixin, nor a controller** — it is
a **plain code module at a path under `lib/behavior/` whose single
concept-export is `export const brain = { … }`**, a descriptor object
that *both* marks the module as a brain *and* carries its metadata.
CLAUDE.md forbids inventing module categories without sign-off; the slate
designs this shape and the build adopts it, so it is recorded here as a
**sanctioned new category**. The `export const brain` descriptor is the
module's one concept-export (consistent with export discipline — it is
not a free-floating helper). Acceptance includes adding the category to
CLAUDE.md's Module Categories table and documenting it in a new
`docs/subsystems/behavior.md`.

The descriptor carries, at minimum: a display `name`, an optional
`description`, a `configSchema` (the per-brain config shape — also the
future config-form schema), the engagement-slot declaration `claims` +
`requiresFree`, and the brain's **entry contract** (the function the
framework invokes when a wired trigger fires, given `{ host, config,
event }` and able to emit). The exact contract shape is the planner's to
finalize; it must be general enough to also host a future dialogue
responder brain (npc-dialogue Wave 2).

### Path-resolution, lazy-load, re-resolve (no registry)

Resolution reuses existing infrastructure: a logical brain path
(`/lib/behavior/patrols`) maps to an absolute filesystem path via the
same logical→absolute class-path mapping `StuffApi.clone` uses, and the
module is loaded + **re-resolved per invocation** via
`HotReloadApi.getCurrentExport(absPath, 'brain')` (the
`LOGIC_CLASS_FILE` + `getCurrentExport` precedent from the Api↔logic
singletons). **`Behaved` wires by path-reference and re-resolves on each
fire — it must never capture a brain reference at spawn**, or HMR cannot
propagate. The framework runtime does exactly one thing: **follow the
reference it was handed** (resolve, load, re-resolve). It never
enumerates and never consults a catalog — enumeration/discovery is an
authoring-time (CMS) concern, deferred. References are validated at
**resolution time** (loads or errors) and at the **save-gate**, never via
a global walk.

### Triggers: cadence | event, state-as-guard, friendly aliases

A trigger is a thin selector over the two sources, not its own
extensible vocabulary:

- **`cadence:Ns`** → a jittered recurring schedule via
  `ScheduleApi.recurring` (wall-clock; default jitter so a room of NPCs
  doesn't tick in lockstep). Game-time conditions ("at night", "my
  shift") are **guards inside the brain** that read `WorldClockApi`, not
  a new trigger kind.
- **event-kind** → `EventApi.on`, with friendly aliases for the Wave 1
  common cases: **`arrival`** / **`departure`** (containment-change
  events / `onContainableAdded`-`onMoved` witness), and witnessed-emote.
  `addressed` / `given` are **deferred** (addressed → dialogue Wave 2).

The extensibility surface is the **event system** (fire a new event
class → a brain subscribes), not a trigger registry.

### Engagement slots: brain-declared, event-preempts-cadence

Slots are the existing abstract capacity axes (`body`/`hands`/
`attention`/`voice`) on `EngagedMixin` (agent-only; reactive-scenery
hosts have none). Each brain **declares** `claims` + `requiresFree` in
its descriptor (author picks a brain; the contention wiring comes along —
the spec stays `{ brain, trigger, config }`). Direct contention is on
`claims`; cross-slot yielding rides `requiresFree` + the framework's
`preconditions-changed` abort. **Default policy: event-triggered
behaviors preempt cadence-triggered ones**; no explicit priority numbers
in v1. The worked case: `wanders`/`patrols` claim `body`, require
`attention` free; an arrival-triggered `greets`/`reacts` grabs
`attention` → the patrol's precondition breaks → it pauses → resumes when
`attention` frees.

### Host: a thin `NPC` class

`BehavedMixin` is written **branch-agnostic** (composes on any Stuff
base), but Wave 1 composes it via a new **thin `NPC` class**
(`Character` + `Behaved`) in `lib/character/`. Cast templates set
`class: /lib/character/NPC`. This keeps automated behavior off player
Avatars (the slate's lean) and off base `Character`, while leaving the
mixin available for later `Thing`/`Location` reactive scenery.

### Editor: deferred to hand-written YAML + save-gate validation

Per the editor-scope decision: no behavior-editing UI in Wave 1.
Authoring is hand-written YAML through the existing CMS code editor.
Backend **brain-path validation at the save-gate** is the only
editor-side addition (a content save naming an unresolvable brain path is
rejected). The spec-list form, brain path-picker, and config-forms land
in Wave 2 with the authoring-intelligence layer.

### Content scope: full cast + shift rotation (presence, not the till ritual)

All five cast members authored as `NPC` templates over the existing
human species (`/lib/species/animalia/.../sapiens`) + biped body plan.
**Shift rotation** is a `shifts` brain (cadence trigger + game-clock /
day-of-week guard reading `WorldClockApi`) that migrates an NPC between:
**on-shift** (working behind the bar — work behaviors), **off-shift-day**
(present at a rail stool **as a patron** — patron behaviors: `idles` /
`random-chatter`), and **fully-off** (moved to an off-stage holding
location). The schedule is config data on each cast member. The
shift-*change* in-room ritual (count-out, reconcile, hand-off, deposit)
is **not** in scope — that is a later scripting-wave choreography.

### Behavior data flow + HMR constraint

`behaviors:` is a **persistent field on `Behaved`** (data persists;
resolved brains + live wiring are runtime-only). The Hydrator populates
it; `Behaved` wires in a **`postRegister`** hook (super-chained, the
`CommandGiverMixin` precedent) — resolve brains by path, install cadence
schedules + event subscriptions. On reboot/re-clone the host re-wires
from the persisted specs. Brains are re-resolved by path **per
invocation**, never captured at spawn.

## Constraints

- **Module taxonomy.** `BehavedMixin` → `lib/behavior/Behaved.ts` (mixin,
  no `Mixin` suffix in filename, `_mixinName` marker, added to the
  `Mixins` registry in `lib/mixin.ts`). Brain modules →
  `lib/behavior/<name>.ts` (the new sanctioned brain category). `NPC`
  class → `lib/character/NPC.ts`. No free-floating helper modules; the
  brain descriptor `const` is the module's sole concept-export.
- **Bar content placement.** The cast NPCs are **part of the lounge** —
  all new Dave's Bar content (the cast classes/templates, bar fixtures,
  the off-stage holding location) lives under **`domain/lounge/`** beside
  the existing `Lounge.ts` / `Bar.ts` / `LoungeWarren.ts`, with seeds
  under `seeds/domain/lounge/` (e.g. `domain/lounge/npc/` + matching
  seed YAML). The `Behaved`/brain *engine* code stays in `lib/`; only the
  authored *content* lives under `domain/lounge/`.
- **Go through the Api layer / emission is uniform.** Brains emit only
  through existing surfaces: speech via `VocalMixin`
  (`say`/`whisper`/`shout`), emotes via `SoulMixin`
  (`emote`/`emoteFree`, resolving catalog emotes through `SoulApi`),
  movement via `LocomotionApi.traverseWithDefault` / `engageAround`,
  durative work via `SchedulerApi.start`. No new emission channel.
- **Execution-context + call-security.** Trigger callbacks run with no
  ambient command frame; they must run inside the
  `ScheduleApi.recurring` / `ExecutionContextApi.runRoot` wrapper so
  gated emission Apis see a valid frame. The **acting NPC is derived
  from execution context, never passed as an argument** — the gated-Api
  rule ([gated-api-actor-from-context], and the `getActingAuthor`
  precedent). Confirm each emission path the brains use is reachable from
  a scheduler-rooted frame.
- **HMR correctness.** No `instanceof` / class-identity checks on the
  brain-resolution path (the hot-reload non-regression invariant).
  Re-resolve per invocation; accept the documented activity-HMR caveats
  (emission closures + field shape pin to construction).
- **Jitter / cost.** Per-tick cost scales audience × cadence (the
  reactions-flush cost model). Cadence triggers jitter by default; brains
  **should** be presence-gated (skip ambient ticks when the room has no
  perceiving audience) to avoid burning cycles in an empty bar.
- **Runtime-only live state.** Live engagements, timers, and event
  subscriptions are not persisted (mirrors `EngagedMixin._engagements`);
  a server restart drops them and `postRegister` re-installs from
  `behaviors:` data.
- **No build-2 collision.** Lane 1 adds no CMS React surface; the only
  CMS touch is server-side save-gate brain-path validation in
  `CmsLogic`. Coordinate if that file is contended.

## Seams left for downstream

- **Traits (next build).** Traits derive from a ledger of
  disposition-valenced acts riding the same act-signature as advancement.
  Wave 1 emits through channels that can later carry a disposition
  valence; keep the brain entry contract and emission paths from
  foreclosing it. Brains read traits in the next build — leave the
  read-point obvious, do not build it.
- **npc-dialogue Wave 2.** The `tree-dialogue` / `intent-dialogue`
  responders are brains in the same `behaviors:` model; the `addressed`
  trigger + speech-interception seam land there. The brain entry contract
  must be general enough to host a dialogue responder.

## Acceptance criteria

- A content author builds an NPC entirely from data — a YAML template
  (`class: /lib/character/NPC`, a `behaviors:` spec list) — with **no new
  code**, and it spawns into the bar running its behaviors.
- **Editing a brain module hot-reloads into a live NPC** without
  re-spawn — the NPC's next action runs the new code (covered by a test
  driving `HotReloadApi.reload` + a re-resolve).
- **Concurrent behaviors contend via engagement slots**: a cadence
  behavior pauses when an event-triggered behavior claims a slot it
  requires free, and resumes afterward (event-preempts-cadence).
- **A new brain dropped at a path under `lib/behavior/`** is usable by
  path-reference with **no central registry edit**; an unresolvable brain
  path is rejected at the CMS save-gate.
- **Cadence triggers are jittered** (no lockstep across a room of NPCs);
  **event triggers** fire on arrival/departure and witnessed-emote.
- **Shift rotation** observable: the on-shift bartender works behind the
  bar; the off-shift-day member sits at the rail as a patron; fully-off
  members are absent; the cast composition changes with the game clock +
  day-of-week.
- **Demo**: walking into Dave's Bar shows the scheduled cast visibly
  alive (Mara wiping the rail, Remy holding court, ambient
  movement/chatter) through ordinary perception.
- Tests cover: `Behaved` wiring + per-invocation re-resolve; each canned
  brain (`idles`, `random-chatter`, `wanders`, `patrols`, `greets`,
  `reacts`, `shifts`); slot contention; HMR re-resolve; cadence jitter;
  event-trigger firing; shift presence resolution.
- **Docs**: a new `docs/subsystems/behavior.md` is the source of truth
  for the subsystem; CLAUDE.md's doc-map *and* Module Categories table
  are updated (brains as a sanctioned category); `activity.md` notes its
  first behavior consumer; the `Mixins` registry includes `Behaved`.

## Cross-references

- **Seeding slates**:
  [npc-behavior-slate](../slates/builds/npc-behavior-slate.md),
  [daves-bar-slate](../slates/builds/daves-bar-slate.md)
- **Track**: [daves-bar-track](../tracks/daves-bar-track.md) (phase 1)
- **Substrate docs**: [activity](../subsystems/activity.md) (the consumed
  framework), [hot-reload](../subsystems/hot-reload.md) (path-resolved
  re-resolve), [location](../subsystems/location.md) (the lounge/bar +
  Warren), [time](../subsystems/time.md) (`WorldClockApi` shift guards),
  [emotes](../subsystems/emotes.md) / [comms](../subsystems/comms.md) /
  [messaging](../subsystems/messaging.md) (emission), [call-security](../subsystems/call-security.md)
  (scheduler-rooted frames, gated-actor-from-context)
- **Downstream**: [npc-dialogue-slate](../slates/builds/npc-dialogue-slate.md)
  (Wave 2 brains + `addressed`), npc-behavior-slate § Traits (the next
  build), [authoring-intelligence-slate](../slates/builds/authoring-intelligence-slate.md)
  (the deferred editor)
