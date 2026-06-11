# MultiLocation substrate (Wave 1) + rudimentary lounge — requirements

> Promotes [docs/slates/multilocation-slate.md](../slates/multilocation-slate.md)
> (Wave 1 — the social-elastic case) and the substrate half of
> [docs/slates/lounge-slate.md](../slates/lounge-slate.md) (Wave 1 — flavor
> and the bar deferred). **Built in parallel with char-gen**
> (`feature/char-gen-wave1`, separate worktree) and kept file-disjoint from
> it. Load-bearing claims were verified against source while drafting.
>
> **Design note — supersedes both the earlier "singleton commons" *and* the
> anchor/`WarrenRegistryApi`/validator-clause framing.** Two **Location**
> templates; "host" is a **runtime role**; the Warren is a **coordinator, not a
> containment tier** (members stay roots). Landing uses a new **`startLocation`
> spawn-instruction** resolved at hydration — the `container` field is **never**
> abused to name a Warren (a Warren isn't a container). The `LoungeWarren` is a
> **singleton** (multi-lounge deferred), lazily instantiated; no anchor, no
> `WarrenRegistryApi`. Resolution is **recover-and-warn** (a non-singleton
> `startLocation`/`container` target warns + clones a fresh instance rather than
> denying; the validator softens deny→warn); rooms self-register with their
> Warren, which **owns** the relationship.

## Overview

A **MultiLocation** is one room *template* with many *live instances* that
coordinate as a group: the graph **buds** new instances when it fills and
**merges** them back when it empties. The owner of each graph is a **`Warren`**
— an incorporeal `Idea` (identity + state, no physical presence).

This build delivers, together:

1. **The `Warren` substrate** — the generic elastic-graph machinery, proven by
   a trivial test consumer.
2. **A rudimentary lounge** — a `LoungeWarren` over **one** lounge-room
   template, with base least-full routing (no flavor), as the universal login
   landing. New avatars land here.

The defining constraints of this design:

- **Exactly two Location templates** end-state: the **lounge room** template
  and **Dave's Bar**. Nothing else. No `Commons` class, no separate satellite
  template.
- **"Host" is a runtime role**, not a type. Every lounge room — whichever is
  currently acting as the commons *and* every satellite — is a clone of the
  *one* lounge template. The Warren designates exactly one live instance as
  **host**.
- **The Warren is a coordinator, not a container.** Member instances are
  ordinary root `Location`s (`getContainer()` → `null`); the Warren tracks them
  in its own set and consults that set for routing/landing. Modeling the Warren
  as a *containment tier above `Location`* (so you'd be "inside the lounge") is
  a deferred evolution — see Non-goals.
- **Only the two room templates + the Warren *definition* persist.** The
  `LoungeWarren` is a **singleton `Idea`** — seeded so its class is resolvable,
  but its *instance* is **lazy** (created on first landing via the normal
  singleton mechanism). Every room instance is a runtime clone, gone on restart
  and recreated on the next first-landing. No persistent room, no bootstrap step.

Everything that makes the lounge *characterful* — pizza-topping flavor,
matchmaking, Dave's Bar contents, drinks — is out (see Non-goals).

---

## Goals

### The `Warren` substrate (server engine)

- **`Warren` (abstract base) class** — extends `Idea` (sibling to `Zone`),
  **runtime-only / never persisted**. The base stays multi-instance-capable
  (the dungeon will want many); **`LoungeWarren` composes `SingletonMixin`**
  (multi-lounge deferred per the user's call). It owns the *mechanism*:
  - **The member set** — `addMember`/`removeMember`/`hasMember`/`getMembers`
    (collections.md Set shape), with R2.3 prune-on-read.
  - **Host designation + migration** — tracks which member is the **host**;
    keeps exactly one host alive once the graph is non-empty; on a forced
    host destruction (HMR reload, error), **migrates** the role to a surviving
    member and re-points the dependent wiring. *This is the heart of the
    Warren's job.*
  - **`spawnMember`** — `StuffApi.clone(<lounge template>)` a runtime instance,
    register it in the set, stamp the `WarrenMember` back-ref, wire its hub exit.
  - **`reapMember`** — destruct a member, tear down its (and the host-side)
    exits, clean refs. **Never reaps the host** (it migrates or keeps the last
    one).
  - **Exit-wiring helper** + **`teardown`** + **ref discipline** (R2.2 paired,
    R2.3 prune-on-read).
  - **`getHost()`** — the reusable placement kernel: return the current host
    instance, creating the first instance (which *becomes* host) if the lounge
    is empty. Both avatar sign-in and (future) item-spawn-into-the-lounge call
    it.
- **`LoungeWarren` (concrete) class** — extends `Warren`; supplies the *policy*:
  `admit`/routing (least-full), star `attachmentFor`, the role catalog +
  thresholds, the diegetic cues, **and the population reconcile loop**. The
  class we actually build.
- **Two member-side mixins:**
  - **`WarrenMember`** — the generic, **optional** Pattern-B back-ref carrier
    (`getWarren()`/`setWarren()`, R2.4 cleanup, `isWarrenMember` marker). A
    `Location` is a member by virtue of the Warren's *set*, not this mixin;
    compose it only when you need the location-side back-ref. The back-ref is
    Warren-owned (`addMember`/`removeMember` are the sole writers).
  - **`LoungeMixin`** — the lounge room's own, **lounge-specific** mixin
    (requires `WarrenMember`): the declared-warren self-register, the population
    witnesses, the over-capacity re-seat dispatch, and the home for **deferred
    flavor**. Host-ness is a runtime role the Warren tracks (`warren.getHost()`),
    not a flag here. (Recall save-delegation rides `WarrenMember.getWarren()`
    from `snapshotToTemplate` — no extra hook here.)

### The rudimentary lounge (content + wiring)

- **The lounge room template** — *one* persistent `Location` template at
  `/domain/lounge/lounge` (a leaf under the existing `/domain/lounge` FolderZone),
  composing `LoungeMixin(WarrenMember(…))` + `Exitable` + `Visible` + `Detailed`. Plain
  `Location` (no coordinate mixin / spatial zone — a social pocket). All lounge
  instances are clones of this.
- **`LoungeWarren`** — the concrete Warren over that template: base least-full
  routing, budding/merging proven over real cloned instances, the host role.
- **Dave's Bar — a singleton external-neighbor shell (second template).** A
  persistent room one **north** exit off the **host**, never a member, never
  reaped. Shell only (description + the exit). Validates the never-reap-non-
  member path. **Deferred:** Dave the NPC, drinks, `sit`, the menu.
- **A working exit out (placeholder)** — a plain door from the **host** to the
  existing campus entry (`/domain/eternal/duncan-hall/lobby`), so the lounge is
  not a dead end. Explicit placeholder for the TPA terminal (fast-travel).
- **Host-only fixtures** — the Dave's exit and the campus exit live on the
  **host** instance (wired by the Warren when it designates/ migrates the host),
  not on every clone. Satellites reach them by walking to the host (star hub).

### Landing (a `startLocation` spawn-instruction — `container` stays honest)

The key honesty constraint: **`container` only ever names an actual container.**
A Warren isn't a container, so it must never appear in `container`. Landing uses
a distinct, honestly-named spawn instruction instead.

- **A new `startLocation` instruction field** (additive; sibling to the existing
  `container` instruction). It holds the *durable* spawn reference — a singleton
  room **or** a Warren. `applyStartLocation(ref)` resolves it at hydration: a
  **Warren** → `getHost()` → move; a **singleton room** → move there; a
  **non-singleton room** → **warn + clone a fresh instance + place there**
  (recover-and-warn, below). It sets the **real** runtime container (an ordinary
  root `Location`); `container`/`applyContainer` are not reused.
- **Recover-and-warn resolution (engine-wide, both fields).** Non-singleton
  targets do **not** error or deny — both `applyStartLocation` *and*
  `applyContainer` log a warning and `clone()` a fresh instance rather than
  letting `StuffApi.singleton` throw. The save-time `validateSingletonContainerTarget`
  deny **softens to a non-blocking warning**. A **self-registering room** heals
  into its Warren (next bullet); a non-self-registering clone is an orphan +
  warning (the accepted "fails quietly, QA catches it" tradeoff). This applies
  to `container` engine-wide — char-gen-safe (its avatar uses a singleton-room
  container, resolved unchanged).
- **Rooms self-register; the Warren owns the relationship.** The lounge-room
  template declares its Warren (`warren: <path>`, a construction *seed* consumed
  once in `postRegister` → `addMember`). The **Warren owns** the live Pattern-B
  pair (`addMember`/`removeMember` are the sole writers; reads use the runtime
  back-ref, never the declared path). The declared path can **initiate** a
  membership but never **override** one: on mismatch (declared Warren ≠ the
  Warren that actually owns the room) the **owner wins + warn**; the
  single-warren guard rejects a re-home. So a stray clone heals, and there is no
  two-way sync to keep consistent.
- **Repoint via `startLocation` only.** Change the seed avatar
  (`seeds/obj/Avatar/seed.yaml`) to declare `data.startLocation: <Warren>` (drop
  `container`). **`DEFAULT_STARTING_LOCATION_PATH` / `config/constants.ts` is NOT
  repointed** — it's the container-typed *evac* fallback (`Container.cleanupOnDestruct`),
  which would destruct stranded players if it resolved to a non-container Warren.
  Spawn (`startLocation`) and evac (the constant) are now separate concerns; the
  app-settings doc ([game-config-slate](../slates/game-config-slate.md)) splits
  them cleanly later.
- **Recall via the back-ref (`WarrenMember` delegates).** On logout, a lounge
  room — which holds the `WarrenMember` back-ref to its Warren — reports its
  *durable* location as the **Warren**, so the avatar persists
  `startLocation: <Warren>`, not the transient clone. Recall re-resolves →
  `getHost()` → a live instance (your old one if alive, else the host). Never
  names a non-container; never resolves into a dead instance.
- **Then the post-arrival reconcile runs** — the host's `onContainableAdded`
  re-seats the newcomer to a satellite if over capacity (the admit seam, below).
- **Unify the kernel, separate the operations.** Avatar sign-in and (future)
  item-spawn-into-a-Warren share only `getHost()`. The *operations* stay
  separate: avatars use `startLocation` (recall + save-delegation, session-
  shaped); items would use the `populates`/spawn family (content-shaped),
  reusing `getHost()`. **Item-spawn-into-a-Warren is deferred** — built later as
  its own instruction over the same kernel, not retrofitted now.

---

## Non-goals (deferred)

- **The flavor system** — toppings, the tag-set setting, matchmaking `route`,
  `seedMember` synthesis, the order console.
- **Group co-location routing** and the **re-seat affordance**.
- **Clever distribution / live rebalancing** — v1 is least-full-seat + reap-empty
  only; no balancing of live crowds, no interest-aware placement. Iterate the
  (swappable) strategy from observed player behavior, not now.
- **Dave's Bar contents** — the NPC, drinks, `sit`, the menu (the *room shell*
  is in).
- **Fast-travel / TPA** — the placeholder exit stands in; waits until after
  char-gen merges (it touches login-routing).
- **Effectful drinks / vitals, cocktails, employment, the economy.**
- **The procedural-spatial Warren family** (dungeon, desert) — only ensure the
  role/cardinality + override seams *admit* them; don't build the generator.
- **★ The Warren as a containment *tier*** — modeling member Locations as
  *inside* the Warren (so `loungeInstance.getContainer()` → the Warren, and you
  "reside in the lounge"). This is a **fundamental change to the containment
  root model** (today `Location` is always a root; this makes it optionally
  contained by a Warren — affecting `getRootContainer`, perception/scope walks,
  MQL scope resolution game-wide). Deferred by the *grow-on-evidence* principle:
  one consumer doesn't justify making the engine's containment root polymorphic.
  If it ever earns in (with the dungeon/desert as added evidence), the rule is:
  the Warren tier is **optional** (only Warren-managed Locations have it) and
  **always modeled as a Warren** when present. **v1: the Warren is a
  coordinator, not a container.**

---

## Surface decisions

### Two Location templates; "host" is a runtime role
The lounge is *one* room template; Dave's Bar is the other. Every lounge
instance is a clone of the lounge template. **Host-ness is runtime state the
Warren assigns** to one instance — there is no `Commons` class, no
`SingletonMixin`, no separate satellite template. This is the user's defining
constraint: uniform clones, role assigned by the coordinator.

### The Warren is a coordinator, not a containment tier (option (a))
Member instances stay **root** `Location`s (`getContainer()` → `null`); the
Warren tracks membership in its own Pattern-B set and *consults* it for routing
and landing. It is **not** a container and introduces **no new tier** above
`Location`. (Option (b) — Warren-as-tier — is a deferred, game-wide evolution;
see Non-goals.) Consequence: "where am I" answers with the room, as today; the
Warren's existence is invisible to the containment model.

### Singleton, lazy `LoungeWarren` — resolved via the normal singleton mechanism
`LoungeWarren` composes `SingletonMixin`: there is one lounge Warren, resolvable
by `StuffApi.singleton(<warren path>)`, which **lazily** creates the instance on
first access. The Warren `Idea` is *seeded* (so its class is resolvable at
save-time and the singleton resolver can find/create it), but its *instance* and
all room instances are runtime — restart wipes them; the next first-landing
recreates. Singleton-ness drops the whole `WarrenRegistryApi`/anchor-map idea
(no need to map many Warrens). Multi-lounge is deferred (the abstract base stays
multi-instance-capable for the dungeon).

### Landing via `startLocation` — `container` is never abused
The avatar's spawn is the new **`startLocation` instruction**, *not* `container`
(a Warren isn't a container, so it never appears in `container`).
`applyStartLocation(ref)` resolves the singleton Warren → `getHost()` → move; the
avatar's real `container` ends up an ordinary root `Location`. The field +
`applyStartLocation` live **directly on `Avatar`** (no mixin — only avatars have a
spawn location), not in the connection/enter flow; `Avatar.ts` is a
shared-but-mergeable edit vs char-gen. `container`/`applyContainer`
aren't *reused* — but both appliers adopt the same **recover-and-warn** policy
(non-singleton → warn + fresh clone), and `validateSingletonContainerTarget`
softens deny→warn. Recall rides the `WarrenMember` back-ref (the room reports its
durable location as the Warren on save).

### Host survival: never-reap-the-last + migrate on forced destruction
Normal case: the host is **never reaped** — when the lounge empties it collapses
to the single host instance, which stays until restart. Robust case: if the host
instance is force-destroyed (HMR reload, error), the Warren **migrates** the role
to a surviving member, re-pointing the satellites' hub exits and the host-only
fixtures (Dave's exit, campus exit) onto the new host. This migration is base
Warren mechanism.

### Budding/reaping: simplest tunable strategy, reversible — it's an unproven UX bet
The elastic lounge bets that *several rooms with a healthy headcount* beats *one
buzzing megaroom* — and that's unproven (players may prefer the megaroom's buzz, or
find splitting isolating). So v1 is the **simplest strategy** with the personality
in a few knobs:
- **Two levers only:** seat arrivals **least-full**; **reap** rooms that fall below
  the merge watermark (drain stragglers, then collapse after a grace). **Bud** a
  fresh room when all eligible rooms are at the bud threshold. The Warren **never
  rebalances a live crowd** (no yanking people mid-conversation) — tuning shapes
  *future* distribution, not instant rebalancing.
- **The band is the personality:** `budThreshold N` (bud-high prevents spam) +
  `mergeWatermark M` (merge-low prevents dead rooms), `M ≪ N` for hysteresis. Steady
  state ≈ `[M, N]` per room. Generous defaults (N≈10–12, M≈3); tests override small.
- **Knobs are tunable + headed to `GameConfig`** (runtime, no deploy — see
  [game-config-slate](../slates/game-config-slate.md)); v1 ships them as code
  constants (no GameConfig dependency).
- **Flatten-to-one-room is a config path:** N high + M=0 ⇒ no bud/merge ⇒ one room
  (old-MUD megaroom). "Elastic off" is a setting, the safe fallback if the UX is bad.
- **The strategy is swappable policy** (`admit`/`reconcile` on `LoungeWarren`) — iterate
  the algorithm from observed behavior without touching the substrate.
- **Spam also has a client-side answer** ([console-filtering](../slates/console-filtering-slate.md)):
  filtering tames a megaroom even with splitting off. Splitting + filtering are
  complementary, not either/or.
- **Don't build clever balancing now** — observe real players first; the substrate's
  value is being tunable, reversible, and swappable while we learn.

### Bud = clone the lounge template
`StuffApi.clone(<lounge template>)` per instance — the authored room description
comes for free, and the instance is runtime (no per-instance template doc, never
persisted). First clone → host; subsequent → satellites; all one template.

### `LoungeWarren` is the concrete class; the base stays minimal
The base owns *mechanism* (member set, host designation+migration, spawn/reap,
exit-wiring, teardown, ref discipline, landing resolution); `LoungeWarren` owns
*policy* (routing, topology, thresholds, cues, the reconcile loop). Default
behavior into `LoungeWarren`; pull up only obvious mechanism. Grow the base on
evidence (the dungeon/desert), not foresight. Base shape: an **abstract class**
(concrete mechanism + abstract policy hooks), not a bare interface.

### The admit seam: post-arrival reconcile in `onContainableAdded`
Keep the move contract clean — *veto is the only way to block a move; otherwise
it completes.* The arrival to the host completes normally; the host's
**`onContainableAdded`** then does a clean follow-up `move(actor, satellite)`
when over capacity. No veto, no redirect flag, no `#moveCore` change. Runs
synchronously before `Avatar.enter`'s `sense`, so the player perceives once, in
the final room. (A pre-move redirect would need a veto — which *throws*, breaking
`applyContainer` — or a silent yield, which muddies the contract.)

### Diegetic budding/merging
Budding/merging emit in-world cues ("a new doorway opens" / "a doorway eases
shut") rather than silent topology changes.

### Where it lives
- **Engine:** a new `lib/multilocation/` subsystem — `Warren.ts`,
  `LoungeWarren.ts`, `WarrenMember` + `LoungeMixin`, the lounge-room class, `__tests__/`.
- **Content:** the **two** templates under `/domain/lounge` (the lounge room +
  Dave's Bar), in the pre-seeded `'lounge'` FolderZone.
- **No new Api** — the Warren orchestrates `StuffApi`, `ContainmentApi`,
  `Exitable`, `ScheduleApi`. Methods-only inter-Stuff contract.

---

## The `Warren` / `LoungeWarren` boundary (triangulated against future consumers)

To avoid drawing the base/subclass seam wrong, sketch the *likely* future
consumers and let their differences locate the line. **We build only
`LoungeWarren` now** — foresight to place the seam, not a license to build the
base generically.

### Three candidate consumers

| Axis | Lounge (building) | Procedural dungeon | Expanding desert |
|---|---|---|---|
| **Members** | one template, homogeneous clones | multi-role catalog, heterogeneous, generated | homogeneous tiles, coordinate-positioned |
| **Topology** | star to host | generated graph | coordinate grid |
| **Bud trigger** | population (host hits N) | exploration / generation | movement to the frontier |
| **Merge/reap trigger** | emptiness (drain → grace); host never reaped | bulk teardown at end of run | proximity (far tiles reclaimed) |
| **Routing (`admit`)** | least-full | place at run start | implicit in traversal |
| **Host** | one member designated host (migratable) | per-run coordinator | frontier coordinator |
| **Graph lifetime** | indefinite, breathes | bounded per run | indefinite, tiles transient |

### What's base mechanism vs `LoungeWarren` policy

- **Base `Warren` = mechanism:** the member set; **host designation +
  migration**; `spawnMember`/`reapMember`; exit-wiring; `teardown`; ref
  discipline; landing resolution. Concrete, shared by all consumers. *What /
  where / when* is policy.
- **`LoungeWarren` = policy:** `admit`/routing, topology (`attachmentFor`),
  `seedMember`, the role catalog + thresholds, the cues, **and the population
  reconcile loop.**

### The load-bearing findings (carried from the design pass)

- **The reconcile loop is `LoungeWarren`, not base.** Lounge/desert are
  population/proximity-reactive (breathing graphs); the dungeon is
  generate-once/teardown-once and never reconciles on population. A base that
  owned the loop would force a heartbeat on the dungeon.
- **Reconstitution strategy is policy, not base.** `LoungeWarren` comes up empty
  and grows from arrivals; a registry-projecting consumer (the dorm hallway)
  rebuilds from persisted data. The base guarantees only "non-persisted graph
  that reconstitutes."
- **Host designation/migration *is* base mechanism** — every consumer with a
  host needs "keep exactly one alive; migrate on loss." (Newly elevated under
  the host-as-role design.)

### Boundary markers — where the line runs

- **Actor-multilocation (one actor, many rooms) is a different subsystem.** The
  Warren is *one room-template in many instances*, not *one actor in many rooms*
  (telepresence). Don't reach for it to put an actor in N places.
- **Player housing — the line cuts *through* it.** A dorm's **rooms** are
  persistent, each its own student-authored template, never reaped → not Warren
  members. But the **hallway / circulation** that routes residents to whatever
  rooms have been provisioned **is** a Warren: ephemeral members + the
  persistent rooms as **external neighbors**, plural and dynamic. This surfaces
  **external-registry-driven attachment** (provisioning-triggered) and a graph
  that **conforms to durable persisted data** rather than transient live state —
  axes the lounge/dungeon/desert trio don't have. Seam implication: keep the
  external-neighbor/attachment mechanism open to a plural, registry-driven set;
  build the single-neighbor (Dave's) case now, don't foreclose the plural one.
- **Confirming case — a scaling lecture hall** mirrors live content into every
  section, but that **content-sync is a layered concern** (a broadcaster
  targeting `getMembers()`), not a Warren responsibility. Reinforces the thin
  base.

---

## Constraints

### char-gen isolation (hard requirement)
Touch no file `feature/char-gen-wave1` edits. Its footprint: `backend/*`,
`obj/Login.ts`, `lib/command/CommandGiver.ts`, `lib/character/*`,
`lib/species/Species.ts`, `obj/command/{Enroll,Play}Controller.ts`,
`cmd/{enroll,play}.yaml`, `packages/types/src/index.ts`, the client shell.
This build's footprint: a new `lib/multilocation/` subsystem, three seeds under
`seeds/domain/lounge/` (room template, Dave's, the Warren `Idea`), the
save-delegation seam in `api/template.ts` and the recover-and-warn helper used by
`applyContainer` (`lib/spatial/Containable.ts`) — both char-gen-clean, engine-wide
— and **three shared-but-mergeable files**: `lib/mixin.ts` (the `Mixins` registry:
`WarrenMember`/`LoungeMixin`), **`obj/Avatar.ts`** (`startLocation` instruction +
`applyStartLocation`; char-gen edits only its `commandContributions`), and
**`api/stuff.ts`** (the `StuffApi.resolveOrCloneForPlacement` helper — kept on the
existing Api per "no new Api"). All expected non-adjacent → clean merge (verify at
MR). Plus the one disjoint seed change: `seeds/obj/Avatar/seed.yaml`
(`startLocation`). `DEFAULT_STARTING_LOCATION_PATH` / `config/constants.ts` is
**not** touched (the evac fallback). char-gen's singleton-room container resolves
unchanged.

### Verified ground truth (to re-confirm at plan time)
- `Idea` is a top-level branch; `Zone extends Idea`, multi-instance — so
  `Warren extends Idea` fits.
- `Location` is a root spatial container (`getContainer()` → `null` for rooms).
  Member instances stay roots (option (a)).
- Instruction fields dispatch to `apply<Field>` at hydration (Phase 2). The new
  `startLocation` instruction → `applyStartLocation`; it resolves the singleton
  Warren and calls `getHost()` + `ContainmentApi.move`. `container`/
  `applyContainer` stay as-is. (Plan must verify the hydrator dispatches the new
  instruction and pick `applyStartLocation`'s home.)
- `StuffApi.singleton(<warren path>)` lazily creates the singleton `LoungeWarren`
  (needs a seeded `Idea` template + `SingletonMixin`).
- `StuffApi.clone(/domain/lounge/lounge)` yields a runtime instance carrying the
  template's data; `StuffApi.destruct` reaps. Room instances are clones, never
  persisted back; the room template is **not** singleton (repeated clones OK).
- `addBidirectionalExit` wires hub/external exits; `ScheduleApi.schedule` for
  reap-grace; `ContainmentApi.move` is the movement chokepoint (untouched — the
  admit seam uses the existing `onContainableAdded` observer).
- The `'lounge'` group + `/domain/lounge` FolderZone are bootstrap-seeded; the
  two templates inherit `ownerGroup` via the zone walk.

### Engineering constraints
- **Module categories** — `Warren`/`LoungeWarren` are Stuff classes; the
  `WarrenMember` + `LoungeMixin` + lounge-room class are mixin/class files (register in
  `Mixins`). No free-floating helpers. No new Api by default.
- **Pattern-B refs** — Warren↔member back-refs non-persisted; R2.2 paired,
  R2.3 prune-on-read.
- **Idempotent restart** — nothing persists but the two templates; the Warren +
  instances reconstitute lazily on first landing.
- **Concurrency** — `admit`/reconcile/host-migration safe under concurrent
  arrivals/departures (no double-bud, no reaping mid-admit, no two hosts).
- **No "Saxonberg" in identifiers.** Tests colocated, Vitest.

---

## Acceptance criteria

1. **Quiet landing.** First landing lazily creates the singleton Warren + first
   instance (the host); a freshly-created avatar (`data.startLocation = <Warren>`)
   resolves via `applyStartLocation` → `getHost()` → lands in that host. Under
   capacity N, arrivals stay in the host. The avatar's `container` is the host
   (a root Location); the Warren never appears in `container`.
2. **Budding.** Arrivals past **N** bud a fresh clone of the lounge template,
   wire a bidirectional hub exit host↔satellite (walkable both ways), emit the
   cue, and seat the newcomer least-full.
3. **Merging.** A satellite below **M** drains toward the host and is reaped
   after the grace; **the host is never reaped.** No thrash across M↔N.
4. **Restart rebuild.** After restart, no instances exist; the first landing
   recreates the Warren + a fresh host. No persisted instance docs; only the two
   templates persist.
5. **Recall.** A player who quit in the lounge persisted `startLocation = <Warren>`
   (via the `WarrenMember` back-ref's save-delegation), and resumes via
   `applyStartLocation` → `getHost()` → a live instance, never a dead one.
6. **The exits work.** From the **host** you can walk to the campus entry
   (placeholder) and back, and **north** to Dave's Bar and back. Satellites
   reach them via the host.
7. **Char-gen handoff.** The starting-location repoint is in effect; **no
   char-gen-owned file is modified**; `constants.ts` + `seed.yaml` merge cleanly.
8. **Host as a runtime role.** Exactly **two** Location templates exist (room +
   Dave's; the Warren is an `Idea`, not a Location). The host
   is an ordinary lounge instance the Warren designated; `getMembers()` includes
   it; it carries the host-only exits. A forced host destruction **migrates** the
   role to a survivor (exits re-wired), leaving the lounge functional.
9. **Coordinator, not container.** A lounge instance is a **root** `Location`
   (`getContainer()` → `null`); the Warren is not in its containment chain.
10. **Ref hygiene.** Reaping a member and tearing down the Warren leave no
    dangling Pattern-B refs (R2.2/R2.3); `getMembers()` reflects reality after
    each mutation, including an out-of-band destruct.
11. **Substrate independence.** The base `Warren` is exercised by a trivial
    non-lounge test consumer (a bare template + bud), proving it stands alone.
12. **Dave's survives the churn.** Across repeated bud/merge cycles, Dave's Bar
    (external neighbor) is never reaped, drained, or pulled into the member set.
13. **Single sense on redirect.** When the host is full, the newcomer is
    re-seated to a satellite via the host's `onContainableAdded` *before*
    `Avatar.enter`'s `sense` — one perception, in the satellite.
14. **Recover-and-warn + ownership.** A non-singleton `startLocation`/`container`
    target **warns and clones a fresh instance** (no error, no save-time deny); a
    cloned `LoungeRoom` **self-registers** with its declared Warren and joins
    (first → host). The **Warren owns** the relationship: a room declaring Warren
    X while already in Y's set is **rejected by the single-warren guard, stays in
    Y, and warns**; reads use the runtime back-ref, never the declared path.

---

## Open questions for planning

1. **`applyStartLocation`'s home + hydrator dispatch** — *resolved by the plan*:
   directly on `Avatar` (only avatars spawn/recall; no mixin); the Hydrator
   auto-dispatches any new instruction field. Save-delegation rides
   `isWarrenMember` + `getWarren()` in `snapshotToTemplate` (no extra hook).
   `Avatar.ts` is shared-but-mergeable vs char-gen (its `commandContributions`).
2. **Member-side mixin split** — *resolved*: generic optional `WarrenMember`
   (back-ref only) + lounge-specific `LoungeMixin` (the consumer). No `isHost`
   flag; the Warren tracks the host (`getHost()`). Remaining: confirm
   `LoungeMixin`'s composition-constraint on `WarrenMember` is enforced.
3. **Host migration scope** — what exactly transfers (hub exits, Dave's exit,
   campus exit, landing-pointer); and whether v1 ships migration or only
   never-reap-the-last (with migration as the forced-destruction path).
4. **Thresholds** — *resolved (see "Budding/reaping" surface decision)*: tunable
   `budThreshold`/`mergeWatermark`/`reapGraceMs`, generous defaults (N≈10–12, M≈3),
   tests override small, code constants now → `GameConfig` later, flatten-to-one-room
   via config. Remaining: the actual default values (a tuning call, not a blocker).
5. **Population signal** — what fires reconcile (containment witness on
   instances vs. internal counter); prefer event-driven.
6. **Paths** — the room template at `/domain/lounge/lounge`, Dave's at
   `/domain/lounge/bar`, and the Warren `Idea` seed path (the
   `startLocation` reference). Confirm the FolderZone `/domain/lounge` admits an
   `Idea` leaf (folder/leaf invariant is SpatialZone-only).

---

## Cross-references

- [multilocation-slate.md](../slates/multilocation-slate.md),
  [lounge-slate.md](../slates/lounge-slate.md) — design sources.
- [ref-shapes.md](../ref-shapes.md) — Pattern-B refs + R2.x.
- [zone.md](../subsystems/zone.md), [spatial.md](../subsystems/spatial.md),
  [boundary.md](../subsystems/boundary.md) — Idea/Zone, Location/containment,
  exits.
- [access.md](../subsystems/access.md) — the `'lounge'` group + `/domain/lounge`
  FolderZone.
- `feature/char-gen-wave1` plan — the parallel build this stays disjoint from.
