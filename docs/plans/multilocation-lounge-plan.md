# MultiLocation substrate (Wave 1) + rudimentary lounge — implementation plan

> Plan for [docs/requirements/multilocation-lounge-requirements.md](../requirements/multilocation-lounge-requirements.md) — the **landing-refined** design (two Location templates; host-as-runtime-role; Warren-as-coordinator; singleton lazy `LoungeWarren`; **landing via a new `startLocation` instruction**; recall via **save-delegation**; **recover-and-warn resolution** for both `container` and `startLocation` — a non-singleton target warns + clones a fresh instance rather than denying, the save-time validator softens deny→warn, and self-registering rooms heal into their Warren). Produced against verified codebase ground truth read this session. Build-ordered phases A–F; resolves the 6 open questions.
>
> **Supersedes the prior plan's landing mechanism entirely.** Dropped: the anchor/template split, `WarrenRegistryApi`, the `applyContainer` resolver branch, the `validateSingletonContainerTarget` anchor clause. The Warren is now a **singleton seeded `Idea`** resolved via `StuffApi.singleton`; the avatar's spawn is a **distinct `startLocation` field** with its own `applyStartLocation` applier; recall persists `startLocation: <Warren>` through a save-delegation hook in `TemplateApi.snapshotToTemplate`. **Kept:** clone semantics, the Exitable teardown asymmetry fix, the Spawner/Spawned Pattern-B precedent, the post-arrival reconcile admit seam, host-as-runtime-role, two templates, host migration.

---

## 0. Verified ground truth (re-read from source this session)

Each fact below was read from the file cited; the load-bearing ones (★) shape the design.

- **★ The Hydrator auto-dispatches `apply<Field>` for ANY declared instruction field — no per-field wiring.** `PersistentHydrator.hydrate` Phase 2 (`lib/persistence/PersistentHydrator.ts:119-136`) iterates `MixinApi.getAllInstructionFields(backing.constructor)`; for each field present in `data` it calls `target['apply' + pascalCase(field)](value)`, throwing if the applier is missing. `getAllInstructionFields` (`api/mixin.ts:667-681`) walks the prototype chain unioning every `static instructionFields` array. **Consequence: declaring `static instructionFields = ['startLocation']` directly on `Avatar` auto-registers it; `data.startLocation: <ref>` in the seed "just works" → `applyStartLocation(ref)` fires at clone time.** No Hydrator change, no mixin. (Confirms requirements §3a; resolves the hydrator half of Q1.)

- **`exits` is the live precedent for an instruction field** (`Exitable.ts:192` `static instructionFields = ['exits']` → `applyExits`). Same machinery `startLocation` will use.

- **Resolution policy: recover-and-warn, not deny (both `container` and `startLocation`).** `container` is an instruction field on `ContainableMixin` (`Containable.ts:145`); `applyContainer` (`Containable.ts:321-331`) is its sole production caller; `startLocation` is an additive sibling field + applier. **Both appliers resolve the same way:** *singleton location* → reuse the one instance; *Warren* → `getHost()`; *non-singleton location* → **log a warning and `clone(ref)` a fresh instance, then place there** (instead of `StuffApi.singleton` throwing on >1). The **save-time `validateSingletonContainerTarget` deny softens to a non-blocking warning (or drops)** — resolution now degrades gracefully rather than failing. A freshly-cloned self-registering room (see Decision: Room self-registration) heals into its Warren; a non-self-registering clone is an orphan + a warning (the accepted "fails quietly, QA catches it" tradeoff). This applies engine-wide to `container`, not just the lounge; **char-gen-safe** (char-gen's avatar uses a singleton-room container, resolved unchanged).

- **★ `StuffApi.singleton(path)` lazily creates the instance** (`stuff.ts:388-405`): returns the cached instance if exactly one exists; otherwise `clone(path)`s from the template doc; throws if >1 exists. **So a seeded Warren `Idea` template at `/domain/lounge/warren` (class `/lib/multilocation/LoungeWarren`) is resolved/created lazily by `StuffApi.singleton('/domain/lounge/warren')`.** `SingletonMixin` (`lib/stuff/Singleton.ts`) is a pure marker — its only effect is the `clone()` pre-flight (`stuff.ts:298-311`) blocking a *second* clone of the path. `LoungeWarren composes SingletonMixin` ⇒ exactly one Warren instance, lazily born on first landing.

- **★ An `Idea` leaf under `/domain/lounge` (a FolderZone) is valid.** The folder/leaf invariant (`template.ts:95-128`, `validateFolderLeafSave`) only forbids placing children *under a leaf*; it checks every ancestor is `isFolderClass`. `/domain/lounge` is a FolderZone (`AccessRegistry.ts:51`), so any leaf under it — `lounge` (Location), `bar` (Location), `warren` (Idea) — is admitted. The folder/leaf rule is class-agnostic about the leaf's kind; the SpatialZone-only invariant (`zone.ts:105-115`) governs `Stuff.zone` stamping, not leaf admission.

- **★ Save-delegation seam: `Avatar.save()` → `TemplateApi.snapshotToTemplate` hardcodes `data.container` from the live container ref** (`template.ts:280-315`): `containerPath = stuff.getContainer()?.getTemplatePath() ?? null`, then `data.container = containerPath`. For recall to persist `startLocation: <Warren>` (not the transient clone's `container`), this capture must consult a delegation hook. **`api/template.ts` is NOT a char-gen file** → the *save-delegation* seam lives there, not in `Avatar.ts`. (`Avatar.ts` is still edited — separately and mergeably — to add the `startLocation` field + `applyStartLocation`; see Q1.)

- **`Idea`** (`lib/stuff/Idea.ts`) is a bare top-level branch, multi-instance, nothing forces persistence. `Warren extends Idea` fits.

- **`StuffApi.clone(path)` yields a runtime, never-persisted instance** stamped with `templatePath` + zone, hydrated from `template.data`. `clone('/domain/lounge/lounge')` gives a live room carrying the authored description; never written back. The room template is **not** singleton ⇒ repeated `clone`s each yield a distinct instance, and it must **never** be reached via `singleton` (>1 ⇒ throw).

- **★ Exit teardown on reap is asymmetric (HIGH-risk).** `ExitableMixin.onDestruct` (`Exitable.ts:671-690`) destructs the destructing room's own outbound exits and sets the *inverse* (host→reaped member) to **blocked** — it does NOT remove or destruct that inverse. `removeExit(direction)` (`Exitable.ts:288-294`) deletes the map entry but does not destruct the `Exit`. **`reapMember`/`migrateHost` must explicitly `host.removeExit(dir)` AND destruct the orphaned host-side `Exit`** or the host accrues blocked dead exits + leaked Exit objects across cycles (AC 10).

- **`addBidirectionalExit(other, direction, opts)`** (`Exitable.ts:380`) creates both Exit objects and wires inverses; non-cardinal labels need `opts.opposite`.

- **★ `applyExits` resolves destinations via `StuffApi.singleton`** (`Exitable.ts:468-524`). **Any `data.exits` in the room template would be wired onto every clone.** Host-only fixtures (north↔Dave's, placeholder→campus) must therefore NOT live in the room template's `data.exits`; the Warren wires them imperatively onto the host (and re-wires on migration).

- **The admit seam is a post-move follow-up.** `#moveCore` (`api/containment.ts`) commits `setContainer`, then fires `onContainableAdded`/`onMoved`. A `move` chained from the host's `onContainableAdded` is a clean fresh move after the outer commit — **no `#moveCore` change**. `Avatar.enter` (`obj/Avatar.ts:248-298`) validates `getContainer()` then `autoSenseOnArrival()` (298), running *after* the spawn applier — so a re-seat inside the applier's move precedes the first `sense` ⇒ single perception (AC 13).

- **`Spawner`/`Spawned`** (`lib/stuff/Spawner.ts`, `Spawned.ts`) is the symmetric Pattern-B precedent: transient back-ref + back-pointer set, R2.4 `cleanupOnDestruct` → owner's untrack chokepoint, R2.3 self-heal in the getter, atomic singular-owner hand-off. **Model the `WarrenMember` back-ref + the Warren's member set on it.**

- **`MixinApi.isHasInteractive(obj)`** (`api/mixin.ts:494`) — population counts count `HasInteractive` only. **`ScheduleApi.schedule`/`cancel`** — the reap-grace timer. **`Location` is a root container** — members stay roots (AC 9).

- **★ `DEFAULT_STARTING_LOCATION_PATH` has a RUNTIME consumer with container semantics — repointing it to a Warren breaks evacuation.** `Container.cleanupOnDestruct` (`Container.ts:147-160`) evacuates orphaned `HasInteractive`s to `StuffApi.findByTemplatePath(DEFAULT_STARTING_LOCATION_PATH)`, expecting a live `Stuff & Container`; if it doesn't resolve, the player is **destructed**. A Warren `Idea` is not a Container. **The prior plan's "repoint the constant → Warren" is WRONG.** Resolution (Decision E): the evac fallback and the spawn pointer are now *different concerns* — keep `DEFAULT_STARTING_LOCATION_PATH` (the evac fallback) the lobby; introduce `startLocation` as the *spawn* reference in `seed.yaml`.

- **★ char-gen footprint (re-derived from the live `merge-base..origin/feature/char-gen-wave1` diff, NOT the stale requirements list).** char-gen touches `obj/Avatar.ts` and `lib/spatial/Container.ts` — **but only their `commandContributions.self` arrays**. It does NOT touch `Avatar.save`, `snapshotToTemplate`, `applyContainer`, or `Container.cleanupOnDestruct`'s evac body. It touches `lib/mixin.ts` (adds `Persona` to `Mixins` — additive, non-adjacent). It does **NOT** touch `api/template.ts`, `api/mixin.ts`, `lib/boundary/Exitable.ts`, `lib/persistence/*`, `obj/AccessRegistry.ts`, `config/constants.ts`, or `seeds/obj/Avatar/seed.yaml`.

---

## 1. Architecture summary

```
seed.yaml: data.startLocation = /domain/lounge/warren   (a Warren ref — NOT a container)
                       │  Hydrator Phase 2 auto-dispatch (instruction field)
                       ▼
   applyStartLocation(ref)   [on Avatar — no mixin]
        look up ref's class (from its template doc) → dispatch:
          Warren-class    → singleton(ref).getHost() → move(self, host)   [lazy: 1st instance = host]
          singleton room  → singleton(ref)           → move(self, room)
          non-singleton   → WARN + clone(ref)        → move(self, freshClone)   [self-registering room heals]
                       │ (lounge case: ref is the Warren)
   host.onContainableAdded → over-capacity? clean follow-up move(self, satellite)   (admit seam)

   RECALL: Avatar.save() → snapshotToTemplate → isWarrenMember consult:
     room.getWarren() present? → data.startLocation = '/domain/lounge/warren' (+ drop data.container)
     else → data.container = <room path>   (unchanged behavior)
```

- **Two persisted Location templates**: `/domain/lounge/lounge` (cloneable) + `/domain/lounge/bar` (shell). Plus one persisted **`Idea`**: `/domain/lounge/warren` (singleton Warren *definition*; instance lazy).
- **`Warren extends Idea`** — abstract base, multi-instance-capable, runtime-only/lazy. Mechanism: member set; host designation + migration; `spawnMember`/`reapMember`; hub exit-wiring (+ asymmetry teardown); host-fixture wiring; `getHost()` kernel; teardown; ref discipline.
- **`LoungeWarren extends Warren composes SingletonMixin`** — concrete policy: least-full `admit`, star `attachmentFor`, thresholds, cues, the reconcile loop, `createMember` (clone the room template), `wireHostFixtures`. Singleton ⇒ one lounge.
- **`startLocation` lives directly on `Avatar`** (no mixin — only avatars have a spawn/recall location): a `static instructionFields` entry + an `applyStartLocation` method, using a shared recover-and-warn resolution helper (Decision Q1).
- **`WarrenMember`** (generic, optional, Phase A) — the Pattern-B back-ref carrier (Spawned-shaped); `getWarren`/`setWarren`; R2.4 cleanup; `isWarrenMember` marker. Compose only when you need the location-side back-ref; the Warren's set is the membership truth.
- **`LoungeMixin`** (lounge-specific, Phase B; requires `WarrenMember`) — population witnesses, the over-capacity re-seat dispatch when host, the declared-warren self-register, + deferred flavor.
- **`LoungeRoom`** — `ExitableMixin(DetailedMixin(VisibleMixin(LoungeMixin(WarrenMember(Location)))))`. No `SingletonMixin`/coordinate/zone.
- **No `WarrenRegistryApi`, no anchor, no new Api** — singleton resolution is the whole lookup. The only shared-infra seam is the `isWarrenMember` consult in `snapshotToTemplate` (reusing the back-ref).

---

## 2. Resolved decisions (the 6 open questions)

### Q1 — `applyStartLocation`'s home + hydrator dispatch + save-delegation home

**Hydrator dispatch: automatic** (ground truth ★1). `static instructionFields = ['startLocation']` + an `applyStartLocation` method in the avatar chain ⇒ Phase 2 dispatches it. No Hydrator edit.

**`applyStartLocation`'s home: directly on `Avatar`** — only avatars have a
spawn/recall location (NPCs/items are placed by content via `container`/`populates`;
item-spawn-into-a-Warren is the deferred path with its own instruction). One
consumer ⇒ **no mixin**. `Avatar` declares `static instructionFields = ['startLocation']`
+ an `applyStartLocation` method:

```ts
// obj/Avatar.ts — additive: instruction field + applier
async applyStartLocation(ref: string): Promise<void> {
  // Resolve the target's class from its template (the clone pipeline already does
  // this — build-verify the exact API; e.g. the ctor for Template.findByPath(ref).class).
  const cls = await StuffApi.classForRef(ref);                  // StuffApi already resolves classes for clone
  if (MixinApi.hasMixin(cls, Mixins.Warren)) {                  // Warren → host (startLocation-only branch)
    ContainmentApi.move(this, await (await StuffApi.singleton<Warren>(ref)).getHost());
    return;
  }
  ContainmentApi.move(this, await StuffApi.resolveOrCloneForPlacement(ref)); // singleton→reuse | non-singleton→warn+clone
}
```

- **How the helper dispatches (singleton-ness is a *class* property, not an instance count):** `StuffApi.resolveOrCloneForPlacement(ref)` resolves the target's **class** from its template — `Template.findByPath(ref).class` → the constructor (the clone pipeline already does this resolution; `classForRef` extracts it) — then checks `MixinApi.hasMixin(ctor, SingletonMixin)` (a *static* marker check, no instance). **Singleton class → `StuffApi.singleton(ref)`** (the one instance, clone-if-absent); **non-singleton class → warn + `StuffApi.clone(ref)`** (a fresh instance — we never `singleton()` a non-singleton, which would throw on >1). A Warren class composes `SingletonMixin` too, so `applyStartLocation`'s Warren branch (`hasMixin(cls, Warren)` → `singleton(ref).getHost()`) sits in front of the helper. **No template at `ref`** → nothing to clone → warn + fail to the evac fallback (not a silent orphan).
- **The helper is shared** by `applyStartLocation` and `applyContainer` — not duplicated. The save-time validator softens deny→warn. Self-registering rooms heal; everything else degrades to an orphan + warning, never a hard error.
- **This eliminates the prior composition-site risk.** No mixin to thread through the avatar chain (which crosses char-gen's `Character`); `Avatar.ts` declares the field directly. The cost: `Avatar.ts` is edited — but char-gen touches only its `commandContributions` array, so this is a **non-adjacent, mergeable** edit (same tier as `lib/mixin.ts`). **Gate (Phase C test):** `getAllInstructionFields(Avatar).includes('startLocation')`.

**Save-delegation home: an `isWarrenMember` consult in `TemplateApi.snapshotToTemplate`** (`api/template.ts`, char-gen-clean). Replace the hardcoded container capture (`template.ts:280-315`) — using the *existing* `WarrenMember` back-ref, no new capability mixin:

```ts
const env = stuff.getContainer();
if (env && MixinApi.isWarrenMember(env) && env.getWarren()) {
  data.startLocation = env.getWarren()!.getTemplatePath();   // the Warren's path
  delete data.container;                                      // not the transient clone
} else if (MixinApi.isContainable(stuff)) {
  /* original data.container path, byte-identical */
}
```

- **No `getDurableContainer`/`DurableLocated`** — durable-recall comes for free from being a `WarrenMember` (which any Warren-member room composes for its back-ref). The check is the existing `isWarrenMember(env)` + `getWarren()`.
- **Default behavior byte-identical** for any non-Warren-member container (`isWarrenMember` false). Synchronous `getTemplatePath()` ⇒ preserves the snapshot's pre-await ordering.
- Next login: `data.startLocation` present ⇒ `applyStartLocation` → `getHost()` (AC 5); `data.container` absent ⇒ `applyContainer` doesn't fire.

### Q2 — Two mixins: generic `WarrenMember` (optional back-ref) + lounge-specific `LoungeMixin`

**`WarrenMember`** (generic substrate mixin, `lib/multilocation/`, **Phase A**) — the
**optional back-ref carrier**:
- `getWarren()` / `setWarren()` (Pattern-B, Spawned-shaped, R2.3 self-heal).
- R2.4 `cleanupOnDestruct` → `warren.removeMember(this)`; the `isWarrenMember` marker.
- **Optional**: a `Location` can be a Warren member (tracked in the Warren's set — the
  set is the truth) **without** composing it. Compose it only when you need the
  location-side back-ref (the single-warren guard, "which Warren am I in", the
  durable-recall hook). `Warren.addMember` sets the back-ref **iff**
  `isWarrenMember(m)`; a plain-`Location` member just lives in the set.
- The back-ref is **owned by the Warren** (`addMember`/`removeMember` are the sole
  writers; reads use `getWarren()`, never a declared path) — see Q2b.

**`LoungeMixin`** (lounge-specific mixin, `lib/multilocation/Lounge.ts`, **Phase B**) —
a *consumer* of the back-ref, **requires `WarrenMember`** (composition constraint):
- The declared `warren` path (Pattern-A template field) + `postRegister`
  self-registration (`(await StuffApi.singleton(warrenPath)).addMember(this)`) — the
  construction seed, consumed once.
- The population witnesses → `warren.notifyPopulationChange(this)`; the over-capacity
  re-seat dispatch in `onContainableAdded` (if `getWarren()?.getHost() === this` and
  `HasInteractive` over capacity → `warren.admitArrival`).
- The home for **deferred lounge flavor** — almost all of which is later.
- (Recall save-delegation needs nothing here — it rides `WarrenMember.getWarren()`
  from `snapshotToTemplate`; see Q1.)
- **No `isHost` flag** — host-ness is `warren.getHost()`.

The runtime predicates the substrate needs are capabilities — `isWarren` (the
resolver), `isWarrenMember` (conditional back-ref in `addMember`, and the save-delegation consult) — not an "is-lounge" check. The `Warren` base never imports the lounge.

### Q2b — Relationship ownership: **the Warren owns; the declared path can initiate but never override**
The declared `warren` path threads the affiliation room→Warren *and* the member set threads it Warren→room. To avoid a two-way-sync problem, **the Warren is the single owner**: `Warren.addMember`/`removeMember` are the **sole writers** of the Pattern-B pair, enforce the single-warren guard, and designate the host; reads always use the runtime back-ref, so the declared path is **inert after construction**. Normal Warren-driven bud and the stray-clone heal **converge on `addMember`** (the room always *triggers*; the Warren always *owns*). **On mismatch, the Warren wins + warn:** a room declaring X that is already in Y's set is **rejected by the guard, stays in Y, warns**; a room with runtime ref Y but declared X (a Warren grabbed it) keeps Y + warns; a declared X that disclaims/isn't a Warren → orphan + warn. **The declared path initiates a new membership; it never re-homes an owned member.**

### Q3 — Host designation + migration: **ship migration; base mechanism**
Warren tracks `#hostMember`. **Designation:** first `spawnMember` → host; Warren imperatively wires host-only fixtures (north↔Dave's, placeholder→campus; NOT in the room template). **Never-reap-the-last:** `reapMember` refuses the host. **Migration (forced destruction):** pick a survivor; tear down dead-host hub exits + satellite-side inverses; **`removeExit` + destruct orphaned host-side exits** (asymmetry fix); re-point all satellite hub exits to the new host; re-wire Dave's + campus; update `#hostMember`. Triggered from the `WarrenMember`.s R2.4 `cleanupOnDestruct` → `removeMember` → `if (was host && survivors) migrateHost()` (robust against any destruct path; AC 8).

### Q4 — Thresholds: **a small tunable surface, generous defaults, flatten-to-one-room is a config** (it's an unproven UX bet)

The thresholds *are* the lounge's personality, and we have no idea yet how
players will react to growing/shrinking rooms (they may prefer one buzzing
megaroom). So treat the distribution as **the simplest tunable strategy, built to
fail safe and tune cheap** — don't over-engineer balancing for unobserved behavior.

- **The knobs:** **`budThreshold` N** (room over N → bud; "too crowded"),
  **`mergeWatermark` M** (room under M → drain + reap; "too dead"; `M ≪ N` for
  hysteresis), **`reapGraceMs`**. Steady state keeps rooms in the `[M, N]` band —
  bud-high prevents spam, merge-low prevents lonely dead rooms.
- **Defaults:** generous for real use (e.g. N≈10–12, M≈3); tests **override**
  small (N=2, M=1, grace flushable via a `ScheduleApi` handle) so bud/merge fire fast.
- **v1 home = `static readonly` on `LoungeWarren`, designed to migrate to
  `GameConfig`** (the app-settings doc — [game-config-slate](../slates/game-config-slate.md))
  so they become **runtime-tunable, no deploy**. The lounge doesn't *depend* on
  GameConfig (it ships parallel to char-gen with code constants); the migration is
  a trivial later swap. (GameConfig slate open-Q5 already lists these.)
- **★ Flatten-to-one-room is a config path, not a rewrite:** N very high + M=0 ⇒
  no budding, no merging ⇒ one room (the old-MUD megaroom). "Elastic off" is a knob
  — the safe fallback if the splitting UX is bad.
- **The strategy is swappable** — `admit`/`reconcile` are `LoungeWarren` *policy*;
  if least-full proves dumb, swap the algorithm without touching the substrate.
- **No live rebalancing** of healthy rooms — the Warren only seats arrivals
  (least-full) and reaps near-empty rooms (drain stragglers); it never yanks a live
  crowd to balance. Tuning shapes *future* distribution, not instant rebalancing.
- **Spam also has a client-side answer** ([console-filtering-slate](./console-filtering-slate.md)):
  mute/filter/collapse the firehose. Splitting (server) + filtering (client) are
  complementary; filtering tames a megaroom even if splitting is turned off.

### Q5 — Population signal: **event-driven via the `LoungeMixin` witnesses, microtask-coalesced** (no poll; reconcile re-reads `isHasInteractive` occupancy at run time).

### Q6 — Paths: **room `/domain/lounge/lounge`, Dave's `/domain/lounge/bar`, Warren `Idea` `/domain/lounge/warren`** — all valid leaves under the `/domain/lounge` FolderZone (ground truth ★). `startLocation` references the Warren path.

### Decision E (new) — `startLocation` is a *distinct* pointer; `DEFAULT_STARTING_LOCATION_PATH` stays the evac fallback
The constant is the container-typed evac fallback in `Container.cleanupOnDestruct` (would destruct stranded players if it resolved to a non-Container Warren). So:
- **`DEFAULT_STARTING_LOCATION_PATH` value stays the lobby** (evac/void fallback) — **untouched** by this build. (Removes one of the prior plan's two shared files.)
- **The spawn pointer is `seeds/obj/Avatar/seed.yaml`'s `data.startLocation: /domain/lounge/warren`** (replacing `data.container`). `seed.yaml` is char-gen-clean ⇒ disjoint, not merely mergeable.
- Optional: a comment-only note in `config/constants.ts` that spawn now rides `startLocation`.

---

## 3. Build-ordered phases

### Phase A — `Warren` abstract base + `WarrenMember` (optional back-ref) + trivial test consumer
**Goal:** the substrate mechanism, proven standalone (AC 11). **Depends on:** nothing. **Blocks:** B, C.
**Files created:** `lib/multilocation/Warren.ts`, `WarrenMember.ts`, `__tests__/Warren.test.ts`, `__tests__/WarrenMember.test.ts`.
**Files changed:** `lib/mixin.ts` (register `WarrenMember` — additive; Risk 10); `api/mixin.ts` (`isWarrenMember`, `isWarren` — char-gen-clean).  (`LoungeMixin` lands in Phase B with `LoungeRoom`.)

```ts
abstract class Warren extends Idea {
  addMember(m): void; removeMember(m): boolean; hasMember(m): boolean; getMembers(): (Stuff & Container)[]; // R2.3 prune
  getHost(): Promise<Stuff & Container>;            // first instance if empty — the reusable kernel
  protected designateHost(m): Promise<void>; protected migrateHost(): Promise<void>;
  protected spawnMember(): Promise<Stuff & Container>; protected reapMember(m): void; // host-side removeExit+destruct
  protected wireHubExit(m): Promise<void>; protected unwireHubExit(m): void;
  notifyPopulationChange(room): void; teardown(): void; static cleanupOnDestruct(stuff): void;
  protected abstract createMember(): Promise<Stuff & Container & WarrenMember>;
  abstract admitArrival(host, actor): Promise<void>;
  protected abstract attachmentFor(m): { direction: string; opposite?: string };
  protected abstract reconcile(): Promise<void>; protected abstract wireHostFixtures(host): Promise<void>;
}
// WarrenMember (Phase A) — the generic OPTIONAL back-ref carrier
interface WarrenMember {
  getWarren(): Warren | null; setWarren(w: Warren | null): void;
}
static cleanupOnDestruct(stuff): void;  // getWarren()?.removeMember(self) — triggers migration if host
// LoungeMixin (Phase B) — lounge-specific, requires WarrenMember; adds the
// witnesses, the re-seat dispatch, self-register, + deferred flavor (recall rides WarrenMember.getWarren).
```

**Trivial consumer:** `TestOverflowWarren` (in-test) — bare bud factory, least-full `admitArrival`, no-op `reconcile`/`wireHostFixtures`. **Tests:** bud/wire/drain/reap, host never reaped (AC 11, 3, 2); set ops + R2.3 prune (AC 10); R2.2/R2.4 symmetric pair (AC 10); single-warren guard rejects + warns (AC 14); host `getExits()` baseline after reap (AC 10); migration on forced host destruct (AC 8); `getHost()` on empty creates+designates (AC 1 mech).

### Phase B — `LoungeRoom` + `LoungeWarren` (policy + reconcile, singleton)
**Depends on:** A. **Blocks:** C, D.
**Files created:** `lib/multilocation/Lounge.ts` (`LoungeMixin` — requires `WarrenMember`; witnesses, re-seat dispatch, self-register, deferred-flavor slot; register in `lib/mixin.ts`); `LoungeRoom.ts` (`ExitableMixin(DetailedMixin(VisibleMixin(LoungeMixin(WarrenMember(Location)))))`, no `SingletonMixin`/coordinate/zone); `LoungeWarren.ts` (`SingletonMixin(Warren)`); `__tests__/LoungeWarren.test.ts`, `LoungeRoom.test.ts`, `Lounge.test.ts`.
**Signatures:** `WARREN_PATH`/`LOUNGE_TEMPLATE`/`BAR_PATH`/`CAMPUS_PATH`; the tunable knobs `budThreshold` (default ≈10–12)/`mergeWatermark` (≈3)/`reapGraceMs` as `static readonly` (Q4; tests override small; → `GameConfig` later); `createMember()`→`StuffApi.clone<LoungeRoom>(LOUNGE_TEMPLATE)`; `admitArrival` (**simplest v1 strategy: least-full eligible, bud if all ≥ N**); `attachmentFor` (star, cardinal pool); `reconcile` (bud-high / merge-low-drain-reap; **no live rebalance**); `wireHostFixtures` (Dave's+campus+cues); `occupants` (`isHasInteractive`); `eligibleRooms`.
**Tests:** quiet stays in host (AC 1); 3rd arrival buds clone + bidi hub exit + cue + least-full (AC 2); clone carries description (AC 6 pre); drain→reap, no thrash (AC 3); reap clears set+back-ref+host-side exit (AC 10); host never reaped (AC 3); singleton (2nd `singleton(WARREN_PATH)` → same instance).

### Phase C — Seeds + `applyStartLocation` (on `Avatar`) + recover-and-warn + save-delegation
**Depends on:** A, B. **Blocks:** D, E.
**Files created:** `seeds/domain/lounge/lounge.yaml` (**no `data.exits`**); `bar.yaml` (`SingletonMixin` shell, no exit back to lounge, no NPC/drinks); `warren.yaml` (`class: /lib/multilocation/LoungeWarren`); `__tests__/startLocation.test.ts`, `lounge-walkability.test.ts`.
**Files changed:** `api/stuff.ts` (`StuffApi.resolveOrCloneForPlacement` + `classForRef` — the shared recover-and-warn resolution; folded into existing `StuffApi`, **not a new Api**); **`obj/Avatar.ts`** (add `startLocation` to `instructionFields` + `applyStartLocation` — non-adjacent/mergeable vs char-gen); `api/template.ts` (the `isWarrenMember` consult in `snapshotToTemplate`; soften `validateSingletonContainerTarget`'s deny → a non-blocking warning); **`lib/spatial/Containable.ts`** (`applyContainer` uses the same recover-and-warn helper — engine-wide); `LoungeMixin.postRegister` self-registration via the declared `warren` path.
**Tests:** `applyStartLocation(WARREN_PATH)` → singleton Warren → `getHost()` → host; avatar `container` is the host (root), Warren never in `container` (AC 1); `applyStartLocation(<singleton room path>)` → that room; **non-singleton target → warns + clones a fresh instance + places there** (both `startLocation` and `container`); a cloned `LoungeRoom` **self-registers** with its declared Warren (heals into the graph; first → host) (AC 14); the single-warren guard **rejects + warns** when a room declaring X is already in Y's set (Q2b); **`getAllInstructionFields(Avatar)` includes `startLocation`** (the auto-dispatch gate); `snapshotToTemplate` of an avatar in a lounge room writes `data.startLocation` + omits `data.container` (AC 5 mech); ordinary-room avatar still writes `data.container` byte-identically (regression); walk host→campus and host→Dave's and back (AC 6); `/domain/lounge/*` → `'lounge'` owner; Dave's never a member, survives churn (AC 12); all three leaves save under the FolderZone (Q6).

### Phase D — Integration: live landing + admit seam + restart + recall + churn + single-sense
**Depends on:** A, B, C. **Blocks:** E.
**Files created:** `__tests__/landing.integration.test.ts`, `restart-rebuild.integration.test.ts`.
**Tests:** fresh avatar (`startLocation=WARREN_PATH`) self-places into the lazily-created host (AC 1 live); at N, next arrival → host `onContainableAdded` → follow-up move → satellite, single sense (AC 2, 13); restart (teardown) → next landing recreates Warren via `singleton` + fresh host, no persisted instance docs (AC 4); recall: saved `startLocation` → `getHost()` → live instance, never dead (AC 5); `LoungeRoom.getContainer()` null, Warren not in chain (AC 9); churn leaves host+Dave's untouched, `getExits()` baseline (AC 10).

### Phase E — Char-gen landing repoint (one disjoint shared file)
**Depends on:** C. **Blocks:** nothing.
**Files changed:** `seeds/obj/Avatar/seed.yaml` — replace `data.container: …lobby` with `data.startLocation: /domain/lounge/warren` (drop `container`). **`config/constants.ts` value UNCHANGED** (stays the lobby — evac fallback; optional comment-only note). Touch **no** char-gen file; `seed.yaml` is char-gen-disjoint.
**Tests:** fresh avatar from the updated seed self-places into the host (AC 1+7); `Container.cleanupOnDestruct` still evacuates a stranded player to the (unchanged) lobby (the ★ regression guard); empty `git diff` over char-gen's set (AC 7).

### Phase F — Concurrency / no-two-hosts / idempotent-restart hardening
**Depends on:** A–D. Gates merge.
**Files created:** `__tests__/concurrency.test.ts`.
**Tests:** burst of N+1 landings → one Warren (singleton + `#inFlightClonePaths`), one host, one bud (AC 1/2 + Risk 7/8); concurrent first `singleton(WARREN_PATH)` → identical instance (Risk 7); forced host destruct mid-admit → exactly one host (AC 8); repeated teardown→rebuild idempotent, no orphans/two-hosts (AC 4).

---

## 4. Testing plan summary (AC → phase)

| AC | Phase(s) |
|---|---|
| 1 Quiet landing (lazy Warren+host via `startLocation`) | B, C, D, E |
| 2 Budding | B, D |
| 3 Merging (host never reaped) | B |
| 4 Restart rebuild (2 Location templates + Warren Idea) | C, D, F |
| 5 Recall via save-delegation → `getHost()` | C, D |
| 6 Exits (campus + Dave's via host) | C |
| 7 Char-gen handoff (seed repoint, no char-gen file) | E |
| 8 Host runtime role + migration | A, F |
| 9 Coordinator, not container | D |
| 10 Ref hygiene + host-side exit teardown | A, B, D |
| 11 Substrate independence | A |
| 12 Dave's survives churn | C, D |
| 13 Single sense on redirect | D |
| 14 Recover-and-warn + ownership (incl. single-warren guard) | A (guard), C (clone+self-register+warn) |

All colocated under `lib/multilocation/__tests__/`, Vitest.

---

## 5. Risks / things to verify during build

1. **`startLocation` on `Avatar.ts` (LOW — was HIGH).** Declaring `startLocation` directly on `Avatar` (no mixin) removes the prior composition-site risk. The only residual concern: `Avatar.ts` is now a shared-but-mergeable file (char-gen edits its `commandContributions`; this edits `instructionFields` + adds `applyStartLocation`). Keep the inserts non-adjacent to char-gen's lines; clean merge. Gate: a Phase-C test asserting `getAllInstructionFields(Avatar).includes('startLocation')`.
2. **Resolution dispatch by class (MEDIUM — build-verify the seam).** `resolveOrCloneForPlacement` dispatches on `hasMixin(classForRef(ref), SingletonMixin)`. Confirm at build: (a) `MixinApi.hasMixin` works on a **constructor** (not just an instance) — CLAUDE.md says it does; (b) the exact way to get the constructor from `Template.findByPath(ref).class` (the clone pipeline already resolves this — reuse it). Test the three branches (Warren / singleton room / non-singleton room) + the **no-template-at-ref** path (warn + evac fallback, not a silent clone-of-nothing).
3. **Save-delegation must not regress ordinary saves (HIGH).** The `isWarrenMember` consult must be byte-identical for non-Warren-member containers and preserve the snapshot's synchronous-prefix-before-first-await ordering (the hook is a synchronous getter). Regression test both an ordinary-room avatar and an `onDestruct` fire-and-forget save.
4. **`DEFAULT_STARTING_LOCATION_PATH` evac correctness (HIGH — corrects the prior plan).** Do NOT repoint the constant to the Warren; it's the container-typed evac fallback. Keep its value the lobby. Test: a stranded `HasInteractive` still evacuates to a live Container, not destructed.
5. **Host-side exit teardown on reap AND migration (HIGH).** `reapMember`/`migrateHost` must `host.removeExit(dir)` AND destruct the orphaned host-side `Exit`. Regression: `getExits()` baseline across cycles (AC 10).
6. **Host migration correctness (HIGH).** Atomically pick a survivor, tear down dead-host hub exits + inverses, re-point all satellite hub exits, re-wire Dave's+campus, update `#hostMember`; `getHost()` reflects the new host; exactly one host under force-destruct racing a landing.
7. **Lazy singleton-Warren race (MEDIUM).** Two first-landings calling `singleton(WARREN_PATH)` must yield one Warren — guarded by `StuffApi.#inFlightClonePaths` + `SingletonMixin`. Concurrent test → identical instance.
8. **Concurrency: no double-bud / reap-mid-admit / two hosts (MEDIUM).** Coalesce reconcile; atomic member-set mutation; reap timer re-checks at fire time; admit follow-up must not race a reap of the target. Burst test → one bud.
9. **`applyExits` host-fixture leakage (MEDIUM).** Host-only fixtures must NOT be in `lounge.yaml`'s `data.exits`. Verify a fresh satellite has only its runtime hub exit.
10. **Shared-but-mergeable files (MEDIUM — isolation flag).** This build edits **three** files char-gen also touches: `lib/mixin.ts` (we add `WarrenMember`/`LoungeMixin` to `Mixins`; char-gen adds `Persona`), `obj/Avatar.ts` (we add `startLocation`/`applyStartLocation`; char-gen edits `commandContributions`), and **`api/stuff.ts`** (we add `StuffApi.resolveOrCloneForPlacement`/`classForRef`; char-gen also touches it). All expected non-adjacent ⇒ clean merge, but **verify non-adjacency at MR time** for each. *Helper-home build-decision:* StuffApi is the no-new-Api home (it owns `singleton`/`clone`/class-resolution); the alternative — a char-gen-clean new resolution Api — was rejected to honor "no new Api," accepting `api/stuff.ts` as shared-mergeable.
11. **Idempotent restart (MEDIUM).** Teardown destructs instances; the Warren `Idea` persists as a definition only; next landing rebuilds via `singleton`; no per-instance room docs after churn (AC 4).
12. **Zone-less rooms + cross-zone campus exit (LOW).** `LoungeRoom`/Dave's zone-less so `CartesianZone.deriveExit` doesn't fight explicit exits; verify the cross-zone campus exit traverses.
13. **Population counting + diegetic cues (LOW).** `isHasInteractive` only; cues via `MessageApi.scene`; don't fire to an empty room or double-fire under the debounce.

### Critical files for implementation
- `lib/persistence/PersistentHydrator.ts` — Phase 2 auto-dispatch (confirms `startLocation` "just works"; no edit).
- `api/template.ts` — `snapshotToTemplate` (save-delegation seam) + `validateSingletonContainerTarget` (soften deny → non-blocking warning); char-gen-clean.
- `lib/spatial/Containable.ts` — `applyContainer` uses the shared recover-and-warn resolution helper (non-singleton → warn + fresh clone), engine-wide; `container` field unchanged; char-gen-clean.
- `obj/Avatar.ts` — add `startLocation` to `instructionFields` + the `applyStartLocation` method (shared-but-mergeable vs char-gen's `commandContributions`).
- `lib/boundary/Exitable.ts` — `addBidirectionalExit`/`removeExit`/asymmetric `onDestruct` + `applyExits`-via-`singleton`; char-gen-clean.
- `lib/spatial/Container.ts` — `cleanupOnDestruct`'s `DEFAULT_STARTING_LOCATION_PATH` evac consumer (the corrected repoint constraint); char-gen touches only its `commandContributions`.
- `lib/stuff/Spawned.ts` (+ `Spawner.ts`) — the symmetric Pattern-B / R2.x precedent.
