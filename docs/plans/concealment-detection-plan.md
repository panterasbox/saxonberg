# Concealment & detection substrate + traps — implementation plan

Implements [concealment-detection-requirements.md](../requirements/concealment-detection-requirements.md).

Branch: `feature/concealment-detection` (off current master).

> **Framing.** This build adds the exploration/perception layer the RPG has been missing — **whether a thing is *there* at all**, resolved per-viewer — by giving every perceivable a single `concealment` level (subsuming the dead-end `Exit.hidden`), resolving it against a viewer's *effective perception* deterministically, and landing a per-viewer **discovery** as a new belief realm. It leans entirely on shipped substrate: the perception viewer-aware pattern (`VisionModality`), the belief store (`BeliefStoreMixin`), the activity framework (`DurativeActivity`/`EngagedMixin`), `ConditionApi.inflict` + the covering stack, and the locomotion traverse seam. **Traps are the flagship first consumer** — a `HazardMixin` in `lib/hazard/` finally generalizes the `GlassAlley` one-off (`onEntered → inflict`, explicitly *"NOT a `HazardMixin`"*) into a real armed→sprung hazard substrate whose delivery *is* the weapon grammar and whose trigger *is* the traverse. A new **care↔speed movement axis** (`sneak`/`walk`/`run`) rides the existing `LocomotionMode` machinery as the risk-dial at the trap seam. The staged shape: the gate goes live end-to-end first (MR-A), then traps + the care↔speed axis + the demonstrator consume it (MR-B).

Every claim below is grounded in the real code (`file:line`). Follows the substrate rhythm: **pure value-objects / vocabularies unit-tested standalone, couplings integration-tested through the headless harness, validated by a live run through the demonstrator.** Style: **match each file's existing quotes** (`lib/perception/` and `lib/boundary/` double-quoted; check per file); **never run prettier**.

---

## Design resolutions (the load-bearing investigations)

These are the calls the requirements left to the planner (§ "Surface decisions" fixes the axes and defers the code shape). Each is grounded and carries a one-line rationale.

### D1 — Concealment representation: a `ConcealableMixin` + a `ConcealmentLevel` vocabulary; `Exit.hidden` is *subsumed*, not paralleled

**Finding.** `Exit.hidden` is a `protected boolean` (`lib/boundary/Exit.ts:264`, `isHidden()`/`setHidden()` at `:281-282`) excluded by `Exitable.getObviousExits()` (`lib/boundary/Exitable.ts:344-347`, `if (!exit.isHidden()) result.push(exit)`). `setHidden` has **zero non-test callers** — confirmed. The one real hidden-exit in content is `seeds/domain/lounge/bar.yaml:68-70` (`north → office`, `hidden: true`), whose own comment calls it *"a SEALED inner sanctum, reachable by no one … a `search`-reveals-hidden mechanic … is the deferred follow-up"* — the exact dead-end this build closes. Perceivables span `Exit` (an `Idea`), `Container`, `Thing`, `Creature`, and `Detailed` hosts — **no single base class** covers them.

**Decision.** A **`ConcealableMixin`** (`lib/concealment/Concealable.ts`, the `PropertiedMixin`/`VisibleMixin` category — a mixin in the subsystem folder that owns the concern) carrying one authored field, `concealment: ConcealmentLevel`, with the method surface `getConcealment()` / `setConcealment()` / `isConcealed()` (`level !== 'obvious'`). Composed onto the perceivable base classes (`Thing`, `Creature`/`Character`, `Container`, the `Detailed` host) so every loose perceivable can carry a level, defaulting `obvious` (backcompat: an un-authored thing is fully visible). **`Exit` subsumes its boolean into the same vocabulary** by composing `ConcealableMixin` (mixins compose onto `Idea` — `LocomotionMode extends SingletonMixin(PropertiedMixin(Idea))`, `LocomotionMode.ts:76`, is the precedent) and re-deriving `isHidden()` as `getConcealment() !== 'obvious'`; `ExitOptions.hidden: true` maps to a mid level at construction (`concealment.hiddenDefaultLevel` dial). `getObviousExits()` keeps working (it reads `isHidden()`), but the *reveal path* now exists.

- **`ConcealmentLevel`** — a named vocabulary + validation array (`lib/concealment/ConcealmentLevel.ts`, the `NoiseLevel`/`ShadowQuality` category): `'obvious' | 'subtle' | 'hidden' | 'deep' | 'buried'` (5 monotone bands; `obvious` = 0 = not concealed). Each band's *effective-perception requirement* is an AppSettings dial (`concealment.level.*`), so magnitudes never live in code.

**Rationale.** One representation subsumes five ideas and the exits-only flag (the slate's one-gate thesis); a trap-local flag would be rebuilt verbatim for secret doors and caches (the rejected half-grown outcome). Mixin-on-`Idea` is a shipped pattern, so `Exit` joins cleanly rather than growing a parallel field.

### D2 — The gate extends the existing `PerceptionApi`/`PerceptionLogic`; resolution is an explicit call at the enumeration seams (not a new Api, not a new Shadow)

**Finding.** The neighborhood already carries a clean, precedented split: **`PerceptionApi`/`PerceptionLogic`** owns the *sensory* face — `signalAt`, `perceiveAt`, `canPerceive`, `sensorium`, and notably **`preloadForSenseGate(actor)`** (`api/perception.ts:90-167`); **`RecognitionApi`/`RecognitionLogic`** owns the *identity* face over belief — `describe`/`recognizes`/`learnIdentity` (`api/recognition.ts:92-157`), the presence-vs-identity axis belief.md draws (`:323-329`, an **explicit** entry point, *not* a shadow). `VisionModality.canSee(viewer, target, detail)` (`lib/perception/modalities/VisionModality.ts:146`) threads the per-viewer Shadow seam via `viewer.canSeeOverride(...)`. The MQL `visible` predicate is a **placeholder** whose comment says *"A real perception subsystem will refine this (light levels, concealment, etc.)"* (`api/mql/predicates.ts:75-83`).

**Decision.** **No new Api.** Detection *is* concealment-gated perception — the presence face is `PerceptionApi`, not a fourth module. Add the surface to the existing **`PerceptionApi`** → **`PerceptionLogic`** pair (`api/perception.ts` / `obj/api/PerceptionLogic.ts`), siblings of `canPerceive`/`perceiveAt`:

- `perceives(viewer, target, attention?): boolean` — the core gate: **discovered-in-belief OR `effectivePerception(viewer, target, attention) ≥ concealmentRequirement(target)`**. Pure, deterministic, monotone.
- `effectivePerception(viewer, target, attention)` — `capacity` (the viewer's band in the new Discipline via `AdvancementApi.bandFor`, mapped to a number by dials) **+** `attention` (passive baseline vs. active-search bonus vs. care↔speed mode modifier) **+** `conditions` (light band from `VisionModality.perceivedBand`, which threads the viewer's Shadow seam — this is how darkness/night-vision enter). No RNG.
- `hasDiscovered(viewer, target)` / `recordDiscovery(viewer, target)` — the discovery-belief read/write sink, writing to the store's new `DISCOVERY` realm **through the belief store** exactly as `RecognitionLogic` writes identity records (D3). It lives on `PerceptionApi` (the presence face), not `RecognitionApi` (the identity face).
- `resolveSearch(viewer, scope, opts)` — the active-search resolver (D5): walk the scope's candidates, `recordDiscovery` each newly-cleared one, return what was found.
- `hintsFor(viewer, scope)` — passive-hint candidates (a hidden-but-close thing, `requirement − effectivePerception ≤ concealment.hintCutoff`).

The gate consumes the existing per-viewer perception (`VisionModality`, and through it the Shadow seam) as its *conditions* input; the gate **itself** is an explicit Api call, not a new shadow — belief.md-consistent.

**The async-snapshot risk is already solved here.** The `capacity` band read is `async` (`AdvancementApi.bandFor`) but the enumeration seams are sync — and `PerceptionLogic.preloadForSenseGate(actor)` is exactly the per-command preload-and-snapshot seam for this. Extend it to also warm the actor's `awareness` band so `perceives` stays sync; no new preload machinery.

**Rationale.** "Go through the existing Api layer / don't proliferate modules" — detection is a perception refinement (the `isVisible` placeholder's own reserved comment), so it belongs on `PerceptionApi`, whose `preloadForSenseGate` even pre-solves the sync boundary. A new `DetectionApi` would gate an operation the perception face already owns. The only belief-side change is the `DISCOVERY` realm const on `BeliefStore` (data on the store — D3), not a new module.

### D3 — The discovery world-fact belief realm: a new `DISCOVERY` realm keyed on `templatePath`, flag payload

**Finding.** `BeliefStoreMixin` (`lib/belief/BeliefStore.ts`) is a realm-namespaced bag keyed `` `${realm}:${referent}` `` on `referent.getTemplatePath()` (`:158`, `:40`), realms are string consts (`RECOGNITION`/`IDENTIFICATION`/`REGARD`, `:65/:71/:82`), the payload rule is *"flag by default, value only for planned divergence"* (`:85-92`), and persistence falls out for free via `BeliefDocument` in the `beliefs` collection (`belief.md:272-304`). belief.md names **place-memory** as an explicit future realm (`:318`, *"a future realm, alongside the shipped recognition / identification / regard trio"*).

**Decision.** Add a **`DISCOVERY` realm const** to `BeliefStore.ts` — *"viewer V has found feature F"* — keyed on the concealed thing's `templatePath`, payload a bare `found: true` flag (add `found?: boolean` to `BeliefPayload`, `:85`). Reads/writes go through `PerceptionApi.hasDiscovered`/`recordDiscovery` (D2). Persistence, per-viewer isolation, no-inherit, and the lazy liveness-GC are inherited unchanged. This is the **world-fact cut** of place-memory (a found *feature*), distinct from room-familiarity place-memory (still deferred).

**Rationale.** Reuse the store, don't duplicate; `templatePath` keying is already durable and gives per-viewer-per-thing resolution that sticks (the requirement "you don't re-search a found secret"). *Keying caveat:* a concealed thing must have a durable `templatePath` — authored singleton content does (the whole demonstrator); generic multi-clones don't, which is exactly the player-placed-concealment case the requirements defer. Flagged in D9.

### D4 — Honest fog lands at the enumeration seams; the wire-shape is asserted

**Finding.** A concealed-and-undiscovered thing must be *absent from the viewer's world at the server* (`requirements` constraint 1). The enumeration seams that build a viewer's world:
- room contents — `LookController.visibleContents` filter (`obj/command/perception/LookController.ts:164-171`), `SenseController` (`:189`);
- exits — `Exitable.getObviousExits()` (`lib/boundary/Exitable.ts:344`);
- targeting — MQL `scope-walk.pushDirect` (`api/mql/scope-walk.ts:176`) + the `visible` predicate placeholder (`api/mql/predicates.ts:79`);
- the client wire — the MQL projection (`obj/api/MqlSubscriptionLogic.ts`, `projectFields`).

**Decision.** Route each of these through `PerceptionApi.perceives(viewer, target)`:
- `LookController`/`SenseController`: add a `PerceptionApi.perceives(actor, item)` clause to the `visibleContents` filter.
- Exits: `getObviousExits()` already drops `isHidden()`; add a viewer-aware overload consulted by the perception paths (`look`/scope-walk/vision-propagation) — an exit is listed iff `!isConcealed() || hasDiscovered(viewer, exit)`. (The viewer-blind `getObviousExits()` stays for the physics walks that don't have a viewer; see the honest-fog scope note below.)
- MQL: replace the `isVisible` placeholder body with the concealment-aware check (its comment already reserves this).
- Wire: `projectFields` filters concealed-undiscovered targets out of the projection.

**Honest-fog scope (a deliberate v1 boundary).** The gate applies at the **vision/contents/targeting/wire** enumerations. The acoustic/olfactory propagation walks (`SoundModality`/`SmellModality`/`AudienceGather`, which iterate `getObviousExits()`+`getContents()`) are **not** gated on concealment in v1 — a concealed thing that makes a noise is a *hint channel*, not a leak, and cross-modal concealment (silence discipline) is the reserved stealth consumer. Noted so a reviewer doesn't read it as a gap.

**Test.** A **wire-shape assertion** (`__tests__/concealment/honest-fog.test.ts`): construct a concealed item + a low-perception viewer, run the `look` + MQL-projection paths, assert the concealed thing's `stuffId`/`displayName` appears in **no** emitted frame or projection payload; `recordDiscovery`; assert it now appears. This is the `nothing-is-pure-client` proof.

**Rationale.** One predicate, every seam — the callable==visible invariant. Asserting the wire (not just the render) is what makes "the client never receives hidden data" a test, not a hope.

### D5 — `search` is a scoped, costed `DurativeActivity`; `examine` is its thin instantaneous variant

**Finding.** The engaged-act substrate is `DurativeActivity` (`api/scheduler.ts`) + `EngagedMixin` (`lib/activity/Engaged.ts:87`); the exemplar is `Coup` (`lib/combat/Coup.ts:57`) — holds an `EngagementSlot` for a game-time `duration`, `onComplete`/`onAbort`, interruptible, driven by `SchedulerApi.start`/`cancel` via `SchedulerRegistry`. Competence read is `AdvancementApi.bandFor(owner, discipline)` → `CompetenceBandName` (`api/advancement.ts:120`, bands-only). No `search`/`examine` verb exists (`cmd/perception/` has only `look.yaml`).

**Decision.**
- **`SearchActivity implements DurativeActivity`** (`lib/concealment/SearchActivity.ts`, the `Coup` clone) — holds a light engagement slot for `concealment.searchSeconds` game-time, interruptible (ambushable mid-rummage — the requirement), `onComplete` = `PerceptionApi.resolveSearch(actor, scope, { activeBonus })`.
- **`search [<target>]`** verb (`cmd/perception/search.yaml` + `obj/command/perception/SearchController.ts`, perception category). No arg = **broad-shallow** room-scope scan; `search <container|detail>` = **narrow-deep** into that scope (a depth bonus, `concealment.searchDepthBonus`). Competence-graded via `AdvancementApi.bandFor(actor, 'awareness')` (D6). Emits discovered secrets + passive hints for the still-hidden-but-close.
- **`examine <target>`** — the instantaneous close-inspection variant: a thin controller that applies a one-shot active-perception bump (no engagement window), folding into the same `PerceptionApi.resolveSearch` at a smaller bonus. (Cheap; ships to satisfy "search / examine" in the criteria without a second activity type.)

**Rationale.** Reuse the activity framework verbatim (the requirement forbids a parallel "searching system"); the scope *is* the MQL target; broad-shallow vs. narrow-deep is a depth-bonus term, not two mechanisms.

### D6 — A new `awareness` perception Discipline, seeded as data

**Finding.** A Discipline is a pure-data leaf Idea (`lib/advancement/Discipline.ts:76`) authored under `seeds/lib/advancement/Discipline/<key>.yaml` (16 exist), scanned by `DisciplineCatalogue` at boot; `channel: skill|knowledge|conditioning`; band read via `AdvancementApi.bandFor`; `conferrals` band-gate verbs.

**Decision.** Seed **`seeds/lib/advancement/Discipline/awareness.yaml`** (`key: awareness`, `channel: skill`, label "Awareness", describing perception/attention/searching). It grades `effectivePerception` capacity (D2), `search` (D5), and `disarm` (D7). Optional `conferrals` reserved (no band-gated verb needs it in v1 — `search`/`disarm` are universally afforded, competence only *grades* them). No code — pure seed. (Single Discipline, not a split "perception vs. searching" — the slate treats them as one contest's two faces.)

**Rationale.** The requirement says a perception/awareness Discipline *as data*; one seed file, zero code, is the whole cost.

### D7 — Traps: a self-resolving `HazardMixin` + a `HazardDelivery` value-object; the mixin owns its resolution (no Api); trigger fires in `Mobile.traverse`

**Finding.** `GlassAlley` (`domain/lounge/GlassAlley.ts`) overrides `onEntered(mover, exit)` (`:76`) → `ConditionApi.inflict(mover, { mechanism: 'edge', site, energy })` picking a foot site from the mover's anatomy (`:78`), config as class constants, *explicitly not a `HazardMixin`* (`:8-16`) — **a plain Stuff method calling the gated `inflict` Api directly, with no dedicated gate of its own.** That is the precedent: a trap resolves *itself*. The traverse seam: `Mobile.traverse(exit, mode)` (`lib/spatial/Mobile.ts:340`) has **the mode in hand**, fires `onEntered` on the destination post-move (`:461` via `callTraverseHook`, `:815`), and pre-move vetoes `canEnter`/`canExit`/`canTraverse` (`:382-393`). Combat's disengage hooks the *pre-move* gate in the controller (`LocomotionControllerBase.ts:124`). `ConditionApi.inflict(target, spec)` (`api/condition.ts:137`) resolves the covering stack so **armor mitigates for free** (`condition.ts:124-135`); `EnergyInflictSpec` = `{ mechanism, site, energy, shieldFacing? }` (`:54`); the electricity `shock` channel is shipped (`ShockInflictSpec`, `:83`). Toxins ride metabolism (`lib/metabolism/Metabolic.ts` `ToxinTag`/`setToxinBurdens`).

**Decision.** **No `HazardApi`/`HazardLogic`.** A hazard is self-contained (`armed→sprung` on itself) — no shared state, no registry, no cross-trap coordination — so there is nothing for a `*Logic` singleton to own; the resolution lives **on the mixin**, and the *powerful* steps it orchestrates are each already gated Apis (`ConditionApi.inflict`, `PerceptionApi.perceives`, the locomotion/posture Apis). Gating an orchestrator over already-gated primitives is the redundant layer. This generalizes `GlassAlley.onEntered` exactly. Two pieces, the taxonomy landed as **descriptor fields + one value-object**, zero per-archetype subclass:

1. **`HazardMixin`** (`lib/hazard/Hazard.ts`, the flagship mixin) — state + descriptors **and its own resolution**, composed onto a deployable `Trap` Stuff (and composable onto a `Location`/`Exit`/`Container` for the other loci). Authored fields:
   - `hazardState: 'armed' | 'sprung'` (one-shot v1; `disarmed` is a third terminal state) — the **State** axis.
   - `trigger: 'traversal' | 'interact'` (open descriptor; `'proximity'|'timer'|'remote'` reserved values, unhandled) — the **Trigger** axis. Locus is implicit in the host type (deployable/location/boundary/container/detail) — the **Locus** axis, free.
   - `delivery: HazardDelivery` — the **Delivery** axis (below).
   - `traverseConsequence: 'none' | 'pin' | 'trip' | 'drop'` — the movement veto/redirect, resolved through the locomotion consequence ladder.
   - `concealment` — via `ConcealableMixin` (D1), the **Concealment** axis.
   - Method surface: `isArmed()` / `getDelivery()` / `getTrigger()` / `getTraverseConsequence()` (accessors), `disarm()` (state), and the two self-resolvers:
     - **`resolveTraversal(mover, mode)`** — the mover has entered this hazard's locus. **Avoid** iff `PerceptionApi.hasDiscovered(mover, this)` OR `PerceptionApi.perceives(mover, this, modeAttention(mode))` OR this is a **ground** hazard and `mode.getMedium()` is `air`/`water` (fly/swim clears). **Else spring:** `ConditionApi.inflict(mover, this.getDelivery().toInflictSpec(mover))` (+ metabolism toxin introduction if the delivery carries a toxin), apply `traverseConsequence` (pin = immobilize/encumbrance veto, trip = `prone` posture, drop = a **forced traverse** to the location below through the existing locomotion path), set `sprung` **before** any forced traverse (the drop-reentrancy guard).
     - **`resolveInteract(actor)`** — the interact-touch trigger, called from the `open`/pull/grab verbs when this armed interact-hazard is the target.
   - `spring()`/state mutation is mixin-internal (sealed `@Final @Unshadowable` as the pattern warrants); the two resolvers are the external method surface `Mobile.traverse`/`OpenController` call.
2. **`HazardDelivery`** (`lib/hazard/HazardDelivery.ts`, the pure value-object — the `WeaponProfile` category) — the `Construction × Material × Channel → InflictSpec` producer: `{ channel: Channel, energy: number, siteSelector: string[], toxin?: ToxinTag, range: 'contact' }`. `toInflictSpec(mover): InflictSpec | null` picks a site from `siteSelector` against the mover's anatomy (the `GlassAlley` FOOT_SITES pattern, `:78`) → an `EnergyInflictSpec` (or a `ShockInflictSpec` for the electrified-floor point). A **reserved `range` field** (`'contact'` only; `'ranged'` is the future-build seam). Pure, unit-testable standalone.

**Hook point.** From `Mobile.traverse` at the post-move `onEntered` site (`Mobile.ts:456-462`), scan the entry's candidates with `MixinApi.isHazard` (the destination if it's a hazard host, deployable contents composing `HazardMixin`, the traversed `exit` if a hazard) and call `hazard.resolveTraversal(mover, mode)` on each armed traversal-triggered one — mover + mode in hand. This fires on every *walked/ridden/conveyed* entry but **not** teleport (which uses `autoSenseOnArrival`, a different path) — the GlassAlley `onEntered` semantics, generalized. `Mobile.traverse` reaching a `Trap` through its `resolveTraversal` **method** satisfies the inter-Stuff methods-only contract — no field-shaped bypass.

**Reconciliation with "where disengage hooks."** Disengage is the *pre-move combat gate* in the controller (`LocomotionControllerBase.ts:124`); the trap is the *on-entry consequence* in `Mobile.traverse`. Both are "the traverse seam," opposite ends of the same act. Avoiding a trap means the mover still *completes the move* but doesn't spring it (the requirement's "step around it") — so post-move resolution is correct; no pre-move veto is needed for v1's pin/trip/drop (all are post-entry consequences).

**`disarm`** — `disarm <trap>` (`cmd/device/disarm.yaml` + `obj/command/device/DisarmController.ts`, the `device` category = "operating a mechanism") — gated to a **found** trap (`PerceptionApi.hasDiscovered` — you must perceive it to defuse it), competence-graded via `awareness`, a short `DurativeActivity` (`concealment.disarmSeconds`) → `trap.disarm()`.

**Rationale.** The mixin owns state + resolution (the GlassAlley precedent, generalized); the powerful steps each go through their existing gated Api, so no new gate is earned. Delivery-as-value-object gives the weapon-grammar reuse (armor mitigates for free, toxin via metabolism, shock free) and the reserved ranged seam, with zero per-kind subclass — the taxonomy's whole point.

### D8 — care↔speed axis: two new `LocomotionMode` singletons + verbs + a `pace` setting; the detection modifier is an AppSettings dial

**Finding.** `LocomotionMode` is a singleton Idea with per-mode fields (`speed`, `noiseLevel`, `costMultiplier`, `medium`, `LocomotionMode.ts:80-141`), seeded per mode (`seeds/lib/locomotion/walk.yaml`). `Exit.media: ['ground']` **already admits any ground mode** via `allowsMode` (`Exit.ts:363-370`), so new ground modes need no exit re-authoring. Modes are chosen per-traverse by verb controllers (`LocomotionControllerBase` subclasses) or the `movement.defaultMode` setting (`LocomotionApi.defaultModeFor`, `api/locomotion.ts`).

**Decision.**
- Seed **`seeds/lib/locomotion/sneak.yaml`** and **`run.yaml`** (medium `ground`, bracketing `walk`: sneak `speed < 1` + `noiseLevel: quiet`; run `speed > 1` + `noiseLevel: loud`). The `noiseLevel`/self-concealment side is authored-as-data but its observer-detection is the reserved stealth consumer (no test asserts others-can't-see-a-sneaker).
- **Verbs** `sneak`/`run` (`SneakController`/`RunController` extends `LocomotionControllerBase`, overriding `modeName()` — the shipped one-line pattern) **and** a **`pace` setting** (`movement.pace` → resolved by `defaultModeFor`) so a player can set a persistent default. Both surfaces, minimal cost.
- The **detection modifier** is *not* a mode seed field — it's an AppSettings dial map read by `PerceptionLogic`: `movement.attention.sneak` (+), `movement.attention.run` (−), walk = 0. `HazardMixin.resolveTraversal` passes `modeAttention(mode)` into `PerceptionApi.perceives`.

**Rationale.** "Two more singletons, not a new model" (the requirement's own line) — the substrate already carries per-mode attributes and per-traverse mode selection. Keeping the *magnitude* in AppSettings (not the seed) honors "all tunables are dials" and lets the gym tune the risk-dial without re-seeding.

### D9 — The demonstrator is a self-contained, un-asserted, non-fast-travel zone

**Finding.** The GlassAlley failure (harm.md:231-239): *every real content host broke a standup/fast-travel invariant* — a cross-domain exit fails the terminus standup's isolated boot; the lounge landing **asserts its exit count** (`domain/lounge/__tests__/landing.integration.test.ts:190`); the TPA terminals pull rooms into the **fast-travel cascade** (`FastTravelMixin`, `lib/fasttravel/FastTravel.ts`). So the host must (a) not be a fast-travel node and (b) not have an asserted exit count.

**Decision.** Build the demonstrator as its **own standalone zone** (`domain/traps/`, a fresh sphere) — a vestibule → trapped corridor → far room — reached by a **single ordinary ground exit** from a host chosen *specifically* for tolerating a new exit. The candidate is a **generic lounge-warren member room** (Warren members are runtime clones, not exit-count-asserted — `LoungeWarren`) or, if that carries its own assertion, a new plain exit whose source is confirmed assertion-free at build time. The demonstrator zone composes **no `FastTravelMixin`** and is **not** in any TPA boot manifest. See § The demonstrator for the confirm-the-host build gate (the top build risk).

**Rationale.** A purpose-built room that stands up cleanly is the explicit requirement; re-homing onto real content is the exact mistake harm.md documents.

---

## Phasing

Two MRs at the gate/consumer seam. **MR-A = Phases 1–3** (the concealment gate live end-to-end — secret doors, caches, search, honest fog; independently valuable and testable). **MR-B = Phases 4–6** (traps + care↔speed + the demonstrator, all consuming the gate). One branch, staged commits; split into two MRs if review latency warrants.

Paths below are rooted at `packages/server/src/mud/` unless noted.

---

### Phase 1 — The concealment gate primitive

**Outcome (Goal: "every perceivable carries a `concealment`"; criterion: "the concealment gate is general").** Every perceivable can carry a level; `Exit.hidden` is subsumed. No viewer-facing behavior change yet — this is the substrate.

**New files:**
- `lib/concealment/ConcealmentLevel.ts` — named vocabulary + validation array (`CONCEALMENT_LEVELS`), `obvious…buried`, and the band→requirement projection helper (reads the dials). *Named value-object / vocabulary.*
- `lib/concealment/Concealable.ts` — `ConcealableMixin` (`_mixinName = 'ConcealableMixin'`), field `concealment`, methods `getConcealment`/`setConcealment`/`isConcealed`, `persistentFields += ['concealment']`. *Mixin.*

**Edited files:**
- `lib/mixin.ts` — register `Mixins.Concealable`; `MixinApi.isConcealable` narrow (mirrors the existing `isVisible`/`isContainer` pattern).
- `lib/boundary/Exit.ts` — compose `ConcealableMixin`; map `ExitOptions.hidden → concealment` at construction; re-derive `isHidden()` from `getConcealment()`; keep `setHidden` as a thin forward (backcompat) plus the new `setConcealment`.
- The perceivable base classes that should carry a level — `lib/spatial/Thing.ts` (or `Tangible`), `lib/creature/Creature.ts`/`Character`, `lib/spatial/Container.ts` — compose `ConcealableMixin`. (Confirm the minimal composition points at build; default `obvious` keeps every existing seed inert.)

**Design calls:** D1.

**Tests:** `lib/concealment/__tests__/ConcealmentLevel.test.ts` (vocabulary + monotone band→requirement), `lib/concealment/__tests__/Concealable.test.ts` (mixin get/set/default), `lib/boundary/__tests__/Exit.concealment.test.ts` (`hidden:true` ⇒ `isConcealed()`, level round-trips, `getObviousExits` still drops it).

**AppSettings dials added:** `concealment.level.subtle`, `concealment.level.hidden`, `concealment.level.deep`, `concealment.level.buried` (obvious = 0 implicit), `concealment.hiddenDefaultLevel` (the `Exit.hidden` migration target).

**Risks/ordering:** none upstream. Composing `ConcealableMixin` onto shared bases risks touching many seeds' hydration — mitigate by defaulting `obvious` and adding `concealment` to `persistentFields` only where authored. Verify the `Exit` mixin-on-`Idea` composition doesn't perturb the persistence/hydrator path (`LocomotionMode` is the proof it's safe).

---

### Phase 2 — Detection resolution + the discovery belief realm + honest fog live

**Outcome (Goals: "perception resolves concealment per-viewer, deterministically"; "found → per-viewer belief"; criteria: "gates perception per-viewer, client never sees hidden data"; "deterministic-given-effort"; "found → per-viewer belief").** The gate goes live server-authoritative.

**New files:** none — the detection surface extends the existing `PerceptionApi`/`PerceptionLogic` pair (D2).

**Edited files:**
- `api/perception.ts` + `obj/api/PerceptionLogic.ts` — add `perceives`/`effectivePerception`/`hasDiscovered`/`recordDiscovery`/`hintsFor` (and, Phase 3, `resolveSearch`); own the `concealment.*`/`detection.*`/`movement.attention.*` dial reads. Extend `preloadForSenseGate(actor)` to warm the actor's `awareness` band so `perceives` stays sync (the async-boundary fix).
- `lib/belief/BeliefStore.ts` — add `export const DISCOVERY`; add `found?: boolean` to `BeliefPayload`; extend the `know` upsert to carry the flag (the flag-by-default path is already there for `typeKnown`).
- `obj/command/perception/LookController.ts` (`:164-171`) + `SenseController.ts` (`:189`) — add `PerceptionApi.perceives(actor, item)` to the `visibleContents` filter.
- `lib/boundary/Exitable.ts` (`:344`) — a viewer-aware `obviousExitsFor(viewer)` consulted by the perception paths (concealed exit shown iff discovered); the viewer-blind `getObviousExits()` stays for the physics walks.
- `api/mql/predicates.ts` (`:79`) — replace the `isVisible` placeholder body with the concealment-aware check (its comment reserves exactly this).
- `api/mql/scope-walk.ts` (`pushDirect`, `:176`) — gate candidates on `PerceptionApi.perceives`.
- `obj/api/MqlSubscriptionLogic.ts` (`projectFields`) — omit concealed-undiscovered targets from the wire projection.
- `docs`/tests references only.

**Design calls:** D2, D3, D4. **Determinism:** the whole resolution is a pure function of (band, attention, light, concealment) — no `Math.random`, monotone to a ceiling set by capacity vs. concealment.

**Tests:**
- `obj/api/__tests__/PerceptionLogic.detection.test.ts` — the resolution: `perceives` true/false across the level ladder; **deterministic** (same inputs → same result; more attention finds monotonically more; repeat past the ceiling never flips — the anti-slots proof).
- `lib/belief/__tests__/BeliefStore.discovery.test.ts` — discovery persists per-viewer; second viewer doesn't inherit; re-record is idempotent.
- `__tests__/concealment/honest-fog.test.ts` — **the wire-shape assertion** (D4): concealed thing absent from every frame + the MQL projection until `recordDiscovery`, present after.

**AppSettings dials added:** `concealment.passiveBaseline`, `detection.capacityPerBand` (the `CompetenceBandName → number` mapping — a small keyed set or one scale dial).

**Risks/ordering:** depends on Phase 1. The `capacity` band read is `async` (`AdvancementApi.bandFor` returns a Promise) but the enumeration seams (`look`, scope-walk, projection) are largely sync — **resolve via the perception face's own precedent**: extend `PerceptionLogic.preloadForSenseGate(actor)` (already called per-command, `api/perception.ts:167`) to also warm the actor's `awareness` band, so `perceives` reads a cached snapshot and stays sync. This is the one place the detection-on-`PerceptionApi` fold pays off directly (no new preload machinery); watch it, but it's a solved shape, not open design.

---

### Phase 3 — Passive hints + active `search`/`examine` + the awareness Discipline + the reveal path

**Outcome (Goal: "passive noticing + active search"; criteria: "passive noticing hints; active search finds", "found → per-viewer belief").** The player-facing detection loop; the `bar → office` sealed door gains its reveal.

**New files:**
- `lib/concealment/SearchActivity.ts` — `SearchActivity implements DurativeActivity` (the `Coup` clone). *Named value-object / activity.*
- `cmd/perception/search.yaml` + `obj/command/perception/SearchController.ts` — the `search [<target>]` verb. *Command YAML + Controller.*
- `cmd/perception/examine.yaml` + `obj/command/perception/ExamineController.ts` — the instantaneous variant. *Command YAML + Controller.*
- `seeds/lib/advancement/Discipline/awareness.yaml` — the perception/awareness Discipline (D6). *Seed data.*

**Edited files:**
- `obj/api/PerceptionLogic.ts` — `resolveSearch` + `hintsFor` bodies; the active-search / depth / examine bonuses.
- `obj/command/perception/LookController.ts` — emit passive **hints** (`PerceptionApi.hintsFor`) in the room render ("the bookshelf sits oddly," "a draft") so attention is directed.
- `seeds/domain/lounge/bar.yaml` (`:68-70`) — raise the `north → office` exit from `hidden: true` to an authored `concealment` level with a hint, closing the documented dead-end (the office becomes *discoverable*, the acceptance "a hidden exit is now discoverable" on real content).
- command discovery wiring (register the two verbs in the perception category).

**Design calls:** D5, D6.

**Tests:** `obj/command/perception/__tests__/search.test.ts` (search discovers a concealed thing in scope; broad vs. narrow scope; competence grades the outcome; the activity is interruptible — an abort mid-search leaves it undiscovered), `__tests__/concealment/hints.test.ts` (a hidden-but-close thing hints; a buried one doesn't), an integration test that `search` reveals the bar office door and `go north` then works.

**AppSettings dials added:** `concealment.searchBonus`, `concealment.searchDepthBonus`, `concealment.searchSeconds`, `concealment.hintCutoff`, `concealment.examineBonus`.

**Risks/ordering:** depends on Phase 2. The `search` engagement slot choice (`body` vs. a lighter `hands`/`focus`) affects what interrupts it — pick the slot that makes "ambushable mid-rummage" true without blocking speech.

*(MR-A boundary — the gate is live: concealment, per-viewer detection, honest fog, search, the real-content reveal.)*

---

### Phase 4 — Traps: the hazard substrate over `inflict`, triggered at the traverse

**Outcome (Goal: "traps as the flagship consumer"; criterion: "traps work over the `inflict` seam, triggered at the traverse").** The `GlassAlley` one-off becomes a real substrate.

**New files:**
- `lib/hazard/Hazard.ts` — `HazardMixin` (state + trigger + delivery + traverseConsequence descriptors). *Mixin.*
- `lib/hazard/HazardDelivery.ts` — the pure `Construction × Material × Channel → InflictSpec` value-object with the reserved `range` seam. *Named value-object.*
- `lib/hazard/Trap.ts` — a deployable `Trap` Stuff (composes `HazardMixin` + `ConcealableMixin` + `Visible`/`Detailed`), the authored-data host for the taxonomy. *Stuff class.*
- `cmd/device/disarm.yaml` + `obj/command/device/DisarmController.ts` — the `disarm` verb. *Command YAML + Controller.*

*(No `api/hazard.ts` / `obj/api/HazardLogic.ts` — the resolution lives on `HazardMixin`; the powerful steps it orchestrates are already-gated Apis. D7.)*

**Edited files:**
- `lib/mixin.ts` — register `Mixins.Hazard`; `MixinApi.isHazard`.
- `lib/spatial/Mobile.ts` (`:456-462`) — at the post-move `onEntered` site (mode in hand), scan the entry's candidates with `MixinApi.isHazard` and call `hazard.resolveTraversal(mover, mode)` on each armed traversal-triggered one.
- `obj/command/boundary/OpenController.ts` — call `hazard.resolveInteract(actor)` when opening an armed interact-hazard (the trapped-chest trigger).
- *(optional, late)* `domain/lounge/GlassAlley.ts` — migrate the glass-underfoot onto an authored `HazardMixin`/`Trap` as proof the one-off is retired; keep behavior byte-identical (a `Trap` with `trigger: traversal`, `delivery: { channel: 'edge', energy: 2, siteSelector: FOOT_SITES }`). Low-risk; skippable if it perturbs the GlassAlley integration test.
- metabolism — a bloodstream **toxin-introduction** seam for `delivery.toxin` (a dart injects past digestion). Confirm whether `Metabolic.setToxinBurdens` / an `absorb` path already suffices; if not, a small gated add. Flagged in D10.

**Design calls:** D7. The taxonomy lands as **descriptor fields on `HazardMixin` + the one `HazardDelivery` value-object** — no per-archetype subclass; the classic kinds (pit / spiked-pit / dart / scythe / deadfall / snare / tripwire / trapped-chest / electrified-floor) are authored points in the axis space.

**Tests:** `lib/hazard/__tests__/HazardDelivery.test.ts` (pure: channel×energy→InflictSpec, site selection, shock branch, reserved range). `lib/hazard/__tests__/Hazard.resolve.test.ts` — the criterion's six required cases over `HazardMixin.resolveTraversal`/`resolveInteract`: **armor-mitigation** (booted vs. bare through the covering stack), **avoid-when-found**, **spring-when-not**, **fly-clears-ground**, **disarm** (found-gated), **veto/redirect** (pin/trip/drop through the locomotion ladder). Plus a toxin-dart test (metabolism burden rises).

**AppSettings dials added:** `hazard.pinSeconds`, `hazard.dropFallEnergy` (the pit-fall blunt on drop), `hazard.disarmSeconds`. (Per-trap *wound* energies stay authored content data — a trap's energy is authored like a weapon's, not a global dial; only the global consequence constants are dials.)

**Risks/ordering:** depends on Phase 2 (`perceives`/`hasDiscovered`). The **`drop` consequence** (forced traverse to the location below) needs a "below" target — model it as an authored redirect exit on the trap/room, not geometry. Reentrancy: `resolveTraversal` firing a `drop` invokes another `Mobile.traverse` — guard against a trap-triggers-trap loop (the destination-of-drop should be safe, and springing sets `sprung`).

---

### Phase 5 — The care↔speed movement axis

**Outcome (Goal: "locomotion is the headline trap trigger, gated by a care↔speed axis"; criterion: "the care↔speed axis changes the trap outcome").**

**New files:**
- `seeds/lib/locomotion/sneak.yaml`, `seeds/lib/locomotion/run.yaml` — the two modes. *Seed data.*
- `cmd/movement/sneak.yaml` + `obj/command/movement/SneakController.ts`; `cmd/movement/run.yaml` + `obj/command/movement/RunController.ts` (extend `LocomotionControllerBase`, override `modeName()`). *Command YAML + Controllers.*

**Edited files:**
- `obj/api/PerceptionLogic.ts` — `perceives` reads the `movement.attention.*` modifier for the passed mode.
- `lib/hazard/Hazard.ts` — `resolveTraversal` passes `modeAttention(mode)` into `perceives` (already receives `mode`).
- `LocomotionApi.defaultModeFor` chain / `movement.pace` setting wiring (`api/locomotion.ts`) — the `pace` setting selects sneak/walk/run as the default.
- command discovery wiring.

**Design calls:** D8.

**Tests:** `lib/hazard/__tests__/Hazard.carespeed.test.ts` — over the **same** concealed trap at fixed inputs: **sneak avoids, walk baseline, run springs**, deterministic. No test asserts others-can't-see-a-sneaker (the deferred stealth consumer).

**AppSettings dials added:** `movement.attention.sneak`, `movement.attention.run` (walk = 0, implicit).

**Risks/ordering:** depends on Phase 4. Confirm `Exit.media: ['ground']` admits `sneak`/`run` with no seed edits (it should, per `allowsMode`); a corridor authored `media: ['ground']` is enough.

---

### Phase 6 — The demonstrator zone + live validation

**Outcome (criterion: "a reachable trapped-corridor demonstrator"; content-discipline check).**

**New files (a fresh `domain/traps/` sphere):**
- The zone + rooms: a **vestibule**, the **trapped corridor**, a **far room** (`domain/traps/*.ts` + `seeds/domain/traps/*.yaml`), composing no `FastTravelMixin`.
- Three authored `Trap` points (zero new classes): **spike pit** (`trigger: traversal`, `delivery: { channel: point, … }`, `traverseConsequence: drop`, ground → `fly` clears); **step-dart** (`trigger: traversal`, `delivery: { channel: point, toxin }`); **pressure-plate blade** (`trigger: traversal`, `delivery: { channel: edge }`, `traverseConsequence: trip`).
- A **secret exit** (concealed `Exit`) — a shortcut, with an obvious alternate through-route.
- A **hidden cache** (concealed `Container`) — a bonus, with an obvious reward elsewhere.
- The **entrance exit** from the confirmed assertion-free, non-fast-travel host (D9).

**Design calls:** D9. **Content discipline (non-negotiable):** the far room is reachable by a **plainly-visible exit** through the corridor — traps *wound/redirect* but don't hard-block (a baseline mover survives; `drop` lands somewhere recoverable). The secret exit and cache are extras. The demonstrator test asserts a zero-`awareness` mover can reach the far room without discovering any secret (no critical content behind a perception wall).

**Tests:** `domain/traps/__tests__/trapped-corridor.integration.test.ts` — the whole loop: sneak-avoids / walk-springs / run-springs a trap; armor mitigates; `fly` clears the pit; `search` reveals the secret exit + cache; `disarm` a found trap; **the content-discipline assertion** (an obvious path exists). Plus a **live run** through the demonstrator (the `verify` skill) as the integration proof.

**Risks/ordering:** **the top build risk is the entry host** (D9 / the GlassAlley lesson). Before wiring the entrance, confirm the chosen source room has no exit-count assertion and is not a fast-travel node; if none is safe, the entrance is a wizard/`go`-reachable seed and the live run reaches it explicitly. Do not degrade a tested content area for the demo.

*(MR-B boundary — traps, care↔speed, and the reachable demonstrator.)*

---

## The demonstrator

A purpose-built `domain/traps/` zone — vestibule → **trapped corridor** → far room — placed per D9: its **only** cross-zone exit lands from a room confirmed (at build time) to be **not** a fast-travel node and **without** an asserted exit count, and the zone composes **no** `FastTravelMixin` and appears in **no** TPA manifest (the three ways GlassAlley broke: cross-domain standup boot, the landing's exit-count assertion, the fast-travel cascade — all avoided by construction). The corridor authors **three distinct points** in the trap axis-space with **zero new classes**: a **spike pit** (traversal + point + `drop`; `fly` clears), a **step-dart** (traversal + point + toxin via metabolism), a **pressure-plate blade** (traversal + edge + `trip`). It also holds a **secret exit** (concealed `Exit`, a shortcut) and a **hidden cache** (concealed `Container`, a bonus). **Every secret has an obvious alternative** — the far room is reachable by a visible exit through the corridor; traps wound/redirect but never hard-gate; the secret exit and cache are pure upside. The content-discipline invariant is a test assertion, not a hope.

---

## AppSettings dials

New `*.` keys (each added to `config/app-settings.yaml` **and** the `AppSettingKeys` const in `lib/config/AppSettings.ts:30`; the `backend/__tests__/AppSettingsSeeder.test.ts` asserts specific keys — add assertions for the notable new ones. There is **no** strict numeric count test, but `AppSettingKeys` must stay in sync — that is the "key-count move"):

| Phase | Keys |
|---|---|
| 1 | `concealment.level.subtle`, `concealment.level.hidden`, `concealment.level.deep`, `concealment.level.buried`, `concealment.hiddenDefaultLevel` |
| 2 | `concealment.passiveBaseline`, `detection.capacityPerBand` |
| 3 | `concealment.searchBonus`, `concealment.searchDepthBonus`, `concealment.searchSeconds`, `concealment.hintCutoff`, `concealment.examineBonus` |
| 4 | `hazard.pinSeconds`, `hazard.dropFallEnergy`, `hazard.disarmSeconds` |
| 5 | `movement.attention.sneak`, `movement.attention.run` |

Per-trap **wound energies** are authored content data (a trap's energy is authored like a weapon's), **not** dials — only global consequence constants are dials.

---

## Docs to write at build/finalize

- **New subsystem docs:** `docs/subsystems/concealment.md` (the gate — `ConcealableMixin`/`ConcealmentLevel`, the detection surface added to `PerceptionApi`/`PerceptionLogic`, the `DISCOVERY` belief realm, `search`/`examine` + the `awareness` Discipline, honest-fog seam list, the care↔speed *detection* side) and `docs/subsystems/hazard.md` (traps — the self-resolving `HazardMixin`, `HazardDelivery` grammar, the trigger/locus/delivery/concealment/state axes, the `Mobile.traverse` hook, `disarm`, the reserved ranged/interact-extended seams, the demonstrator).
- **Updated docs:** `boundary.md` (`Exit.hidden` subsumed + reveal path), `belief.md` (the `DISCOVERY` realm, the world-fact cut of place-memory), `locomotion.md` (`sneak`/`run` + the care↔speed detection wiring; the `noiseLevel` self-hiding side still reserved), `perception.md` (concealment is now the real refinement of the `isVisible` placeholder), `harm.md` (GlassAlley re-homed onto `HazardMixin`), `advancement.md` (the `awareness` Discipline). The **doc-map** entry in `CLAUDE.md` + an **architecture.md** entry for the new subsystems.
- **Slate ticks:** in `docs/slates/deferred-rpg/concealment-detection-slate.md`, mark **Thesis 1 (one gate)** and **Thesis 3 (searching)** realized; name **Thesis 2 (the actor-face stealth)** and **the knowledge economy** deferred with their seams.
- **Retire** `docs/plans/concealment-detection-plan.md` + `docs/requirements/concealment-detection-requirements.md` at the pre-merge sweep (the `/finalize` step).

---

## Sequencing & MR shape

**One branch** `feature/concealment-detection`, staged commits at the six phase seams. **Recommended split into two MRs** at the gate/consumer boundary: **MR-A (Phases 1–3)** ships the concealment gate live end-to-end (secret doors, caches, `search`, honest fog, the real bar-office reveal) — independently reviewable and valuable; **MR-B (Phases 4–6)** ships traps, the care↔speed axis, and the demonstrator, all consuming the gate. Phase order is a hard dependency chain: 1 → 2 → 3, then 4 → 5 → 6 (4 depends on 2's `perceives`; 5 on 4; 6 on all).

---

## Open risks for the builder

1. **The async band read at sync enumeration seams (Phase 2).** `AdvancementApi.bandFor` is `async`; `look`/scope-walk/projection are largely sync. Resolve by extending the perception face's own `PerceptionLogic.preloadForSenseGate(actor)` to warm the `awareness` band, so `perceives` reads a cached snapshot and stays sync — no new preload machinery. Still the build's most likely friction point, but a solved shape now that detection rides `PerceptionApi`.
2. **The demonstrator entry host (Phase 6 / D9).** Confirm the source room is assertion-free and non-fast-travel *before* wiring the entrance — the exact GlassAlley failure. If none is safe, reach the zone via `go`/wizard seed for the live run.
3. **Composing `ConcealableMixin` onto shared bases (Phase 1).** Verify it doesn't perturb hydration for the many existing seeds; default `obvious` and add to `persistentFields` only where authored. Confirm the `Exit` mixin-on-`Idea` composition against the `LocomotionMode` precedent.
4. **The bloodstream toxin seam (Phase 4).** A dart injects *past* digestion — confirm `Metabolic.setToxinBurdens` / an `absorb` path suffices, or add a small gated introduce-toxin method. Don't reinvent metabolism.
5. **`drop` reentrancy (Phase 4).** A forced traverse re-enters `Mobile.traverse` → `resolveTraversal`; guard against trap-triggers-trap loops (the drop destination should be safe; springing sets `sprung`).
6. **Genuine ambiguity — the discovery-vs-place-memory realm boundary.** I chose a distinct `DISCOVERY` realm for found *features*, treating belief.md's named "place-memory" (room familiarity) as still-future and adjacent. If the builder finds place-memory wants to ship together, they're one realm; I've kept them separate to hold scope. Flagging rather than silently merging.
7. **Honest-fog cross-modal scope.** v1 gates vision/contents/targeting/wire; a concealed thing's *sound/smell* propagation is a hint channel, not gated. If a reviewer reads that as a leak, it's a documented v1 boundary (the silence-discipline consumer is deferred stealth), not an oversight.
