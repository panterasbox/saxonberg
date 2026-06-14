# Capability hosting — implementation plan

## Overview

This build realizes the **three-base capability model** and the **aether-as-host** refactor. A capability becomes a mixin bundle manifestable around three bases — a corporeal `Thing` (carried), an incorporeal `Idea` (an *update* hosted on aether attunement), or intrinsically on a Creature/species — and **one reachability scan** (`ContainmentApi.findReachable`) finds it in any form.

The work has five structural pillars:

1. **A hosting relation** on `AetherMixin` — a host holds a collection of update `Idea`s, with back-references and host-bound lifecycle, distinct from corporeal containment. The must-be-hosted invariant lives on the relation, never on `Idea`.
2. **The `AetherMixin` split** — residual `AetherMixin` keeps only the host collection + the ESP perception modalities (`verbal-esp`, `emotive-esp`). The `tell`/transmission method, the `dm`/`reply`/`broadcast`/`chat` command contributions, and the DM cohort state move to a new **`CommsMixin`** composed around `Idea` **only** (the comms update). The future radio is an *attuned `Thing` that **hosts** a comms update*, **not** a `Thing` that composes `CommsMixin` — `tell` resolves its operator via `getHost()`, which only a hosted update has.
3. **The travel credential as an update** — `TravelCredentialMixin` (already corporeal-free) composes around `Idea`; the implant injects an `Idea`-based credential update; the physical `TravelCard` stays a cloneable `Thing`.
4. **Generalizing the contribution walks** — `findReachable` (self leg + descend-into-host leg), the `sensorium` modality walk, and the command-source affordance seeding — each extended to include a host's hosted updates alongside its slot occupants. (An *update* doesn't confer a gated mixin — it carries its capability directly, Step 3.2 — but `collectAugmentConferralNames` IS extended for a different reason: to add a **species** conferral source, pillar 5.) No new resolution Api.
5. **The intrinsic leg** — a `Species` innately confers (activates) a gated mixin, so a born-attuned species has `AetherMixin` active with no implant. Completes the three-base model's *intrinsic* base for gated-mixin activation. The innate⊕acquired union mirrors what the sensorium (bodyplan senses ⊕ augment modalities) and `defaultModeFor` (bodyplan default tier) already do. (Step 3.3.)

### Key as-built facts verified (and refinements to the original scope summary)

- **Confirmed:** `Idea` (`lib/stuff/Idea.ts`) is bare `Stuff`, no mixins, no `ContainableMixin`, no must-be-hosted invariant. Used by Biome/Zone/Controller/Topic/EvalScript. Do not touch it.
- **Confirmed:** `AetherMixin` lives at `lib/message/Aether.ts`, composed on `Avatar` at `obj/Avatar.ts:73-75` as `PostRegistrationMixin(HasInteractiveMixin(AetherMixin(ContactsMixin(ShelledCharacter))))`. `_augmentGated = true`, `_grantsModalities = ['verbal-esp','emotive-esp']`, `commandContributions.self = ['social/dm.yaml','social/reply.yaml','social/broadcast.yaml','social/chat.yaml']`, carries `tell(...)` (with inlined `isActive` guard) and runtime cohort state (`_lastInboundDmCohort`, `_lastOutboundDmCohort`).
- **Confirmed:** `TravelCredentialMixin` (`lib/fasttravel/TravelCredential.ts`) is `MixinConstructor<Stuff>`-bound, touches no corporeal feature (no material/containment/Perceptible). It composes cleanly around `Idea` today with **zero refactor**.
- **Confirmed:** `findReachable` (`api/containment.ts:407-433`) scans slot-occupants → carried → location, one flat level each, no self leg, no host-descent.
- **Confirmed:** `getActiveMixins`/`collectAugmentConferralNames` (`api/mixin.ts:267-298, 943-978`) walk only `getAllOccupants()` slot occupants for conferral. `walkAugmentedModalities` (`api/perception.ts:275-297`) consumes `getActiveMixins` + `_grantsModalities`.
- **Confirmed:** `AetherImplant` (`lib/augmentation/AetherImplant.ts`) composes `AugmentMixin(TravelCredentialMixin(SlottableMixin(TangibleMixin(Thing))))`, `confers()→['AetherMixin']`. It currently **carries the travel credential directly on the implant Thing** — this build moves the credential to an `Idea`-based hosted update.
- **Refinement 1 (command-source coupling):** The comms verbs reach a host today via `CommandApi.collectSelfDefs`, which walks the **host's class chain** (`collectBucketDefs(ctor, 'self')`, `api/command.ts:3177-3193`). After the split, `AetherMixin` no longer carries those contributions and `CommsMixin` is composed on an `Idea`, *not* on the host's class chain — so the verbs will NOT appear via `collectSelfDefs`. The plan adds a **hosted-update self-contribution seeding** step (push each hosted update as its own recency source into the host's stack), so `dm`/`reply`/`broadcast`/`chat` surface with the comms update as `commandSource`.
- **Refinement 2 (the absent-comms gate is controller-level):** `requiresVerbalESP` (`lib/command/validators/requiresVerbalESP.ts`) checks `PerceptionApi.canPerceive(giver, 'verbal-esp')` — the sensorium gate, which rides **attunement** (residual `AetherMixin._grantsModalities`). After the split it stays green for any attuned actor regardless of comms-update presence. Therefore the acceptance criterion "fails to transmit when the comms update is absent though attunement is present" must be enforced in `DmController`/`ReplyController`/`BroadcastController`/`ChatController` by looking up the hosted comms update on the host, NOT by the validator. The verb-level validator stays as the attunement early-catch.
- **Refinement 3 (cohort state moves with `tell`):** `ReplyController` reads `speaker.getLastInboundCohort()` and `DmController`/`ReplyController` call `speaker.tell(...)`. These must be re-pointed at the hosted comms update (which now owns `tell` + cohort state), reached via `getHost()`→update or `findReachable`/`commandSource`.

### Privacy note (applies throughout)

Every mixin instance field introduced on a Stuff host (`CommsMixin` cohort state, `AetherMixin` hosted-update collection + back-ref, `AetherHostedMixin` back-ref) MUST be TypeScript `private` (with `_`-prefix where a sibling Api reaches it via cast), never `#`-private — the call-security proxy receiver cannot reach `#` slots from inside mixin methods (CLAUDE.md § Member Privacy hard-constraint 2). Persistent fields stay public for the Hydrator.

---

## Wave 1 — The hosting relation + the hosted-update category

Establishes the structural substrate the rest builds on: a host holds update `Idea`s; each update back-references its host; the must-be-hosted invariant lives on the relation.

### Step 1.1 — `AetherHostedMixin` (the update side of the relation)

New mixin `lib/augmentation/AetherHosted.ts` (subsystem: augmentation owns the host/update model per requirements). Exports `AetherHostedMixin`, marker `_mixinName = 'AetherHostedMixin'`. Composes around `MixinConstructor<Stuff>` so it can sit on an `Idea`.

Surface:
```ts
export interface AetherHosted {
  getHost(): (Stuff & AetherHost) | null;
  setHost(host: (Stuff & AetherHost) | null): void;  // call only via the host chokepoint (Step 1.2)
  isAetherHosted(): boolean;
}
```
- `private _host: (Stuff & AetherHost) | null = null;` — TS-private (proxy receiver). Runtime live-ref, NOT persisted (Pattern B live-ref per `ref-shapes.md`; the update is re-created into its host each session, like the implant).
- The must-be-hosted invariant: `AetherHostedMixin` exposes `onDestruct()` chaining + a `canExistUnhosted(): false` marker the host chokepoint checks. Orphaning (host set to null while the update is still alive and registered nowhere) destroys the update via `StuffApi.destruct`. Concretely the invariant is enforced by `AetherMixin.unhostUpdate` (Step 1.2): removing an update from a host's set, with no re-host, calls `StuffApi.destruct(update)`.

`Idea` is untouched: the invariant is a property of `AetherHostedMixin` + the host chokepoint (Step 1.2), never of the `Idea` base. A free-standing `Idea` (Biome/Zone/Controller) composes no `AetherHostedMixin` and is unaffected.

Register `AetherHosted: 'AetherHostedMixin'` in `lib/mixin.ts`; add `MixinApi.isAetherHosted` predicate in `api/mixin.ts`.

**Tests** (`lib/augmentation/__tests__/AetherHosted.test.ts`):
- A `AetherHostedMixin(Idea)` instance starts unhosted; `setHost` sets the back-ref; `getHost()` returns it.
- A bare `Idea` (Biome-shaped test double) composes no `AetherHostedMixin` and is unaffected — `MixinApi.isAetherHosted(biome) === false`.

### Step 1.2 — The host side: hosting methods on `AetherMixin`

Extend `AetherMixin` (`lib/message/Aether.ts`) — the *residual host* (full split in Wave 2; here we add the host collection + the relation methods so Wave 1 substrate is testable). The host side is plain mixin methods — **no Api facade**, per the project default of mixin methods over new Apis. Add the `AetherHost` interface + storage:
```ts
export interface AetherHost {
  getHostedUpdates(): readonly (Stuff & AetherHosted)[];
  hostUpdate(update: Stuff & AetherHosted): void;      // chokepoint
  unhostUpdate(update: Stuff & AetherHosted): boolean; // chokepoint
  hostsUpdate(update: Stuff): boolean;
}
```
- `private _hostedUpdates: (Stuff & AetherHosted)[] = [];` — TS-private, runtime live-ref collection, NOT persisted (re-injected each session via `installDefaultLoadout`).
- **`hostUpdate(update)`** is the single chokepoint keeping both sides consistent: pushes onto `_hostedUpdates` and calls `update.setHost(this)`, then notifies command routing via `CommandApi.applyHostedUpdateDelta(this, update, 'host')` (Step 2.4). Idempotent. `@Final @Unshadowable`.
- **`unhostUpdate(update)`** removes from `_hostedUpdates`, calls `update.setHost(null)`, notifies `applyHostedUpdateDelta(… 'unhost')`, and — enforcing the must-be-hosted invariant — if the update is now hosted nowhere, calls `StuffApi.destruct(update)`. `@Final @Unshadowable`.
- `AetherHostedMixin.setHost` is a plain method that **only `hostUpdate`/`unhostUpdate` should call**. ⚠️ A hard call-security gate keyed on the *calling mixin* is **not achievable** — `FromModule`/caller-identity resolves the caller to the host's concrete class (Avatar/NPC/radio), never to `AetherMixin` (mixin inner classes aren't `ModuleApi`-stamped, so the proto-walk never matches). Don't build a bespoke seam for it. Consistency instead comes from the sealed (`@Final @Unshadowable`) chokepoint methods being the sole mutators, with the host's `_hostedUpdates` collection — **not** the per-update back-ref — as the **source of truth** for `getHostedUpdates`/`hostsUpdate`/orphan-checks.
- The host collection is gated active by attunement: a host with the collection populated but `AetherMixin` inactive (no implant) hosts nothing usable.
- **Finding a hosted update is not a bespoke method** — it rides `ContainmentApi.findReachable` (the self + host-descent legs from Step 3.1). Callers that need "this actor's comms update" use `ContainmentApi.findReachable(actor, null, MixinApi.isComms)`.

**Tests** (`lib/message/__tests__/Aether.host.test.ts`):
- `hostUpdate(u)` → `u.getHost() === host`, `host.hostsUpdate(u) === true`, `getHostedUpdates()` includes `u`.
- `unhostUpdate(u)` with no other host → `u` is destructed (orphan-invariant test).
- Post-spawn gain/lose: host an update onto an already-registered host, then unhost it.
- Source-of-truth: `getHostedUpdates()`/`hostsUpdate()` read `_hostedUpdates`, so a stray `setHost` can neither forge nor hide membership (there is no hard gate — the chokepoint is the contract).

**Acceptance mapped:** "a capability update orphaned from its host cannot persist or exist" + (with Step 1.1) "a free-standing Idea is unaffected."

### Step 1.3 — No dedicated hosting Api (decision record)

The relation is orchestrated entirely by the `AetherMixin` host methods above (`hostUpdate`/`unhostUpdate` as the consistency chokepoint, owning back-ref + orphan-destruct + command-delta notification) plus `ContainmentApi.findReachable` for lookups. There is **no `AetherHostApi`** — a narrow aether-specific Api was rejected: the codebase defaults to mixin methods over new Apis, and every orchestration concern here sits naturally on the host mixin. If a *second* incorporeal-host concept later appears (a spellbook hosting spell Ideas, a mind hosting memory Ideas), the host methods graduate to a shared `IdeaHost` mixin at that point — not pre-emptively (no premature abstraction).

---

## Wave 2 — The AetherMixin split + `CommsMixin`

Extract transmission into a hosted comms update; residual `AetherMixin` = attunement (host + ESP modalities).

### Step 2.1 — `CommsMixin` (new mixin, the comms capability)

New `lib/comms/Comms.ts` (new subsystem folder `lib/comms/` — comms is a genuine subsystem with its own doc; per CLAUDE.md propose the folder rather than `lib/mixins/`). Exports `CommsMixin`, `_mixinName = 'CommsMixin'`, `MixinConstructor<Stuff>`-bound (composes around `Idea` and `Thing`; no corporeal assumption).

Move verbatim from `AetherMixin` into `CommsMixin`:
- The `tell(target, text, opts?)` method, **with one change**: it sends *on behalf of its host (operator)*. `tell` resolves the operator via `getHost()` (the `AetherHosted` back-ref) and uses the host as the `MessageApi.scene(operator)` speaker, the mention resolver subject, and the cohort owner. The inlined `@RequiresActive('AetherMixin')` guard is replaced by a guard that checks the operator is attuned: `MixinApi.isAether(operator)` (attunement = the ESP modalities; if the operator is unattuned, throw `InactiveCapabilityError`).
  - ⚠️ **Host-routing is load-bearing, not cosmetic** (verified against `lib/message/Aether.ts:159-265`): `MessageApi.scene(host).toSelf(…)` **throws** when the actor isn't a `Sensor` (`Scene.toSelf`, `api/message.ts:141`), and an `Idea` update is not a Sensor — so the self-echo frame MUST be built from the host. The mention resolver (`Mml.perceiverMentionResolver`) **silently no-ops** on a non-containable speaker, so it too must be the host, as must the emitted speaker name. Audit every `this.`/`speaker` reference in the moved `tell` and route the speaker-as-actor and speaker-as-name uses through `getHost()`. Recipient-side per-target logic (`isSensor`/`isAether`/`recordInboundCohort` on each target) is unchanged.
- `_grantsModalities` is NOT moved (modalities stay on attunement / residual AetherMixin).
- The cohort state (`_lastInboundDmCohort`, `_lastOutboundDmCohort`) and `getLastInboundCohort`/`getLastOutboundCohort`/`recordInboundCohort` move to `CommsMixin`. Cohort recording on a recipient now targets the recipient's **hosted comms update**, not the recipient host: `tell` finds the recipient's comms update (via `ContainmentApi.findReachable(recipient, null, MixinApi.isComms)`) and stamps its inbound cohort.
- `commandContributions.self = ['social/dm.yaml','social/reply.yaml','social/broadcast.yaml','social/chat.yaml']` moves to `CommsMixin`. These now flow into the host via the hosted-update self-seeding (Step 2.4), with the comms update as `commandSource`.

`CommsMixin` composes `AetherHostedMixin` implicitly? No — keep them orthogonal: the comms **update class** (Step 2.3) composes both `CommsMixin` and `AetherHostedMixin` around `Idea`. `CommsMixin` itself only needs `getHost()` from the `AetherHosted` surface; it calls it through the host back-ref, so the update class must co-compose `AetherHostedMixin`. Document this as a soft pairing (CommsMixin reads `getHost()`; meaningful only when co-composed with AetherHostedMixin).

Register `Comms: 'CommsMixin'` in `lib/mixin.ts`; add `MixinApi.isComms` in `api/mixin.ts`.

### Step 2.2 — Residual `AetherMixin` (attunement + ESP perception + host)

In `lib/message/Aether.ts`, after extraction, `AetherMixin` keeps:
- `_augmentGated = true`, `_grantsModalities = ['verbal-esp','emotive-esp']` (unchanged — reception-gating rides this).
- The host collection + `AetherHost` surface (from Step 1.2).
- **Removes:** `tell`, the cohort state + accessors, `commandContributions` (the whole static — it had only `self` comms verbs).
- The `Aether` interface shrinks to the `AetherHost` surface; `tell`/cohort methods leave the interface.

`MixinApi.isAether` stays the attunement predicate (composed + conferred). Update `api/mixin.ts` `Aether` import to the trimmed interface.

### Step 2.3 — The comms update class + seed

New Stuff class `lib/comms/CommsUpdate.ts`:
```ts
export default class CommsUpdate extends CommsMixin(AetherHostedMixin(Idea)) {
  static readonly TEMPLATE_PATH = TemplatePaths.commsUpdate;  // '/lib/comms/CommsUpdate'
}
```
Bare `Idea` base — incorporeal, no corporeality, hostable. Add `TemplatePaths.commsUpdate` to `lib/paths.ts`. Seed `seeds/lib/comms/CommsUpdate.yaml` (Hydrator-ready, minimal — the update carries no persistent state in v1; cohort is runtime-only).

### Step 2.4 — Hosted-update self-contribution seeding (command-source generalization)

This is the load-bearing command-routing change (Refinement 1). Generalize the host's `self`-bucket affordance seeding so hosted updates' `commandContributions.self` reach the host's recency stack with the update as `commandSource`.

In `CommandGiverMixin` (`lib/command/CommandGiver.ts`), `_ensureSelfEntry()` / `postRegister` currently push only `collectSelfDefs(this.constructor)` as `'self'`. Add a companion: for each hosted update on the giver (when the giver composes `AetherHost`), collect the update's `self`-bucket defs via `collectBucketDefs(update.constructor, 'self')` and push them as a distinct recency source `pushCommandSource(update, 'self', defs)`. The recency entry's `source` is the update Stuff, so `getAffordances()` resolves `commandSource` to the update — exactly the "verb dispatch routes through the augment" pattern.

To keep `CommandGiver` from importing comms/aether-host directly, add a thin `CommandApi.collectHostedUpdateDefs(host): Array<{ source: Stuff; defs: CommandDefinition[] }>` in `api/command.ts` (the natural home — it already owns `collectBucketDefs` and the contribution machinery). It checks `MixinApi.isAether(host)` (attunement active), walks `getHostedUpdates()`, and returns each update's `self` defs. `CommandGiverMixin` calls it during self-seeding and re-runs it when an update is hosted/unhosted post-spawn.

Wire host/unhost to the recency stack: `AetherMixin.hostUpdate`/`unhostUpdate` (Step 1.2) call into `CommandApi.applyHostedUpdateDelta(host, update, 'host'|'unhost')` (sibling to `applyContainmentDelta`/`applyShadowDelta`) which pushes/pops the update's `self` defs on the host's stack. This makes gain/lose-post-spawn surface/retire the verbs live.

### Step 2.5 — Re-point the comms controllers through the hosted update

In `DmController`, `ReplyController`, `BroadcastController`, `ChatController` (`obj/command/social/`): replace `speaker.tell(...)` / `speaker.getLastInboundCohort()` with a lookup of the operator's hosted comms update, then invoke on the update.

- The afforded path: these verbs are now afforded by the comms update, so `context.commandSource` IS the comms update when dispatched through the recency stack. Controllers read `const comms = MixinApi.isComms(context.commandSource) ? context.commandSource : ContainmentApi.findReachable(speaker, null, MixinApi.isComms)`.
- Absent-comms gate (Refinement 2): if no comms update is found (attuned but update removed), fire the existing `mixin-missing`/`controller-rejected` self-frame ("You have no way to send a thought.") and `note`. This is the acceptance criterion "fails to transmit when the comms update is absent though attunement is present."
- `comms.tell(...)` sends from `getHost()` (the operator). `ReplyController` reads `comms.getLastInboundCohort()`.
- The `requiresVerbalESP` validator stays on the YAML (attunement early-catch); unattuned recipients still drop frames via the unchanged `verbal-esp` reception gate.

**Tests** (Wave 2):
- `lib/comms/__tests__/Comms.test.ts`: a `CommsUpdate` hosted on an attuned actor; `comms.tell(target, msg)` composes a `world.speech.dm` scene from the host with `modality('verbal-esp')`; cohort state lands on the update.
- `lib/message/__tests__/Aether.split.test.ts`: residual `AetherMixin` exposes no `tell`; `_grantsModalities` intact; `isAether` still true for an implanted actor.
- `obj/command/social/__tests__/DmController.test.ts` (extend): dm succeeds for an attuned actor with the comms update; dm refuses (mixin-missing note) when the comms update is unhosted though attunement present; an unattuned recipient drops the frame (reception gate unchanged).
- `lib/command/__tests__/CommandGiver.hostedUpdate.test.ts`: hosting a comms update onto a giver surfaces `dm`/`reply`/`broadcast`/`chat` in `getAffordances()` with `source === the update`; unhosting retires them.

**Acceptance mapped:** "AetherMixin no longer exposes comms transmission; `tell`/dm-family live on the comms update; an update's command contributions reach the command-source walks through the host" + the dm success/absent/reception trio.

---

## Wave 3 — Reachability generalization (`findReachable` self + host-descent legs) + active-mixin generalization (hosted-update modalities + species intrinsic conferral)

> **Build-order note:** Step 3.1 is *foundational*, not late. It depends only on Step 1.2's host methods, and **Wave 2 depends on it at runtime** — `tell`'s cohort-stamp resolves the recipient's hosted comms update via `findReachable`'s host-descent leg, and the controllers' fallback uses it too. **Implement Step 3.1 with Wave 1 / before Wave 2's `tell` + controllers.** The wave numbering here is topical, not a strict build sequence for 3.1.

### Step 3.1 — `findReachable` self leg + descend-into-host leg

In `ContainmentApi.findReachable` (`api/containment.ts:407`), add two cases preserving on-your-person-first order:

1. **Self leg (first):** `if (predicate(actor)) return actor;` — the intrinsic leg (a capability composed directly on the actor/species). Placed first so an intrinsic capability is "on your person." **Scope:** this finds an intrinsic *possession/behavior mixin composed directly on the actor*. It is a **different mechanism** from intrinsic *attunement* — activating a gated mixin via the species is Step 3.3 (the species-conferral union). The two together cover both intrinsic kinds: the self-leg *finds* an intrinsically-composed capability; Step 3.3 *activates* an intrinsically-conferred gated mixin.
2. **Descend-into-host leg:** after the slot-occupants scan, for the actor itself and for any AetherMixin-active host encountered among slot occupants / carried items, also test its hosted updates. Concretely: a helper `scanHost(h)` that, when `MixinApi.isAether(h)`, iterates `getHostedUpdates()` testing `predicate`. Call `scanHost(actor)` (so the implant-hosted comms/credential updates are found on self), and call `scanHost(item)` for each carried item that is an attuned host (the future radio).

Order: self → self's hosted updates → slot occupants (+ each occupant's hosted updates) → carried (+ each carried host's hosted updates) → location. Keeps "on your person first." Guard against an update that is itself the actor (no infinite recursion; one level of host-descent only, matching the existing one-flat-level discipline).

**Guardrail — `findReachable` vs. MQL (do not overuse this helper).** `findReachable` answers exactly one question: *"is there a reachable bearer of capability-**type** X for the engine to route behavior through?"* — keyed on a mixin type, internal, hot-path, first-match, returning a type-narrowed `Stuff & T` the caller acts on directly. It is **not** a query engine. Anything keyed on identity / keywords / properties / user input — argument resolution, author queries, choosing among matches, filtering, or anything that should be live/subscribable — belongs to **MQL**, never here. `findReachable` must stay a thin first-match-by-type-predicate over a **fixed** reachable set: the self leg and the **one-level** host-descent added here are the *last* reach it should grow. The moment a caller wants to filter, pick among results, walk deeper, or get a live result, stop and use MQL — do not teach `findReachable` another leg. (It is a hardcoded subset of MQL's scope-walk; the risk being guarded against is two scope-walks diverging. The host-descent leg is the one edge case — bounded to a single concept and a single level; if every new holding relation started adding its own leg, that is the divergence to refuse.)

**Tests** (`api/__tests__/containment.findReachable.test.ts`, extend):
- **Self leg:** a capability composed intrinsically on the actor is returned by `findReachable(actor, loc, pred)`.
- **Host-descent (self):** a credential update hosted on the actor's attunement is found.
- **Carried-host-descent:** a carried attuned `Thing` (radio test double) hosting a comms update — its update is found.
- **Card (Thing) leg:** a carried `TravelCard` is found (existing behavior preserved).
- **Order:** when both a hosted credential update (on self) and a carried card exist, the hosted-update/self path wins per documented order.

**Acceptance mapped:** "the same capability mixin, composed around Idea, Thing, and intrinsically, is each found by a single findReachable call. Tests cover all three legs and the search order."

### Step 3.2 — `getActiveMixins` / `collectAugmentConferralNames` generalization

The requirements call to generalize the augment-contribution walks to include hosted updates. Today `collectAugmentConferralNames(stuff)` walks only slot occupants for `AugmentMixin.confers()`. Decision: hosted updates do NOT confer gated mixins (the comms update doesn't *activate* a gated mixin — it *carries* the capability directly). So `collectAugmentConferralNames` needs no change for conferral.

But `walkAugmentedModalities` consumes `getActiveMixins(viewer)` for `_grantsModalities`. A hosted update could in principle grant modalities (none do in v1 — comms grants no modality, attunement does). To honor the "generalize the walks" requirement *without minting a parallel path*, extend `walkAugmentedModalities` (`api/perception.ts`) to also union `_grantsModalities` from the host's hosted updates' active mixins:
```ts
// after the host's own active mixins:
if (MixinApi.isAether(viewer)) {
  for (const u of (viewer as AetherHost).getHostedUpdates()) {
    for (const m of MixinApi.getActiveMixins(u)) collect m._grantsModalities;
  }
}
```
This is the single generalization point for modality grants from updates; no update grants modalities in v1, so it's substrate-only (proves symmetry, no behavior change). Guard with a test using a synthetic update declaring `_grantsModalities`.

**Tests** (`api/__tests__/perception.sensorium.augment.test.ts`, extend):
- An attuned actor still has `verbal-esp`/`emotive-esp` from residual `AetherMixin` (regression).
- A synthetic hosted update declaring `_grantsModalities: ['some-modality']` contributes it to the host's sensorium (substrate proof).

### Step 3.3 — Species intrinsic conferral (the innate leg)

The missing innate activation path: a species becomes a conferral source on par with a slot augment.

- **`Species` gains an `innateMixins: string[]`** field (`lib/species/Species.ts`) — authored data, the mirror of `AugmentMixin.confers()`. Add `getInnateMixins()`/`setInnateMixins()` (property pair; a per-field invariant on the setter — dedup/normalize), and add `innateMixins` to `Species.persistentFields`. Field-shape template: `BodyPlan.defaultLocomotionMode`. Home is **`Species`, not `BodyPlan`** (capability divergence among species sharing a bodyplan — per `Species`'s own docstring).
- **Extend `collectAugmentConferralNames`** (`api/mixin.ts:943`) to also union the actor's species `innateMixins`. Reach the species via the same duck-typed structural lookup the function already uses (e.g. `(stuff as { getSpecies?(): { getInnateMixins?(): string[] } | null }).getSpecies?.()?.getInnateMixins?.()`), avoiding an import cycle — mirroring the existing `{ getAllOccupants? }` cast. Result: `getActiveMixins` treats a gated mixin as active when composed AND (an augment confers it OR the species confers it). The species lookup sits inside the lazy conferral collection (run only when a gated mixin is hit, memoized per `getActiveMixins` call), so hot-path cost is one `getSpecies()` templatePath lookup.
- **Throwaway test species seed.** A born-attuned near-human sibling — `seeds/lib/species/animalia/chordata/mammalia/primates/hominidae/homo/sensitivus.yaml` (path is pure content): `_bodyPlanPath: /lib/body-plans/biped`, `innateMixins: ['AetherMixin']`, rest copied from `sapiens.yaml`. Clearly a fixture; the content pass renames/replaces it.
- **Scope limit (document it):** species conferral only *activates a gated mixin already composed on the shared `Creature`/`Avatar` class* (which `AetherMixin` is). It cannot compose a new mixin onto an instance — the compose-everything-gated vs. per-species-subclass question is deferred (nothing needs it yet).

**Tests** (`api/__tests__/mixin.intrinsicConferral.test.ts` + integration):
- Unit: a synthetic actor composing a gated `AetherMixin`, whose species double declares `innateMixins: ['AetherMixin']`, reports `isActive(actor, 'AetherMixin') === true` with NO slot augment; a species declaring nothing → inactive.
- Union: an actor with BOTH a conferring augment and a conferring species → still active (idempotent).
- Integration (`obj/__tests__/Avatar.loadout.test.ts`, extend): an avatar of the test species (no implant) is attuned, hosts comms + travel updates, and `dm` works.

**Acceptance mapped:** "an avatar of the born-attuned test species (no implant) has `AetherMixin` active, hosts the default updates, and can `dm`; an ordinary species with no implant stays inert."

---

## Wave 4 — Travel credential as update + default loadout

### Step 4.1 — Travel credential update class

`TravelCredentialMixin` already composes around any `MixinConstructor<Stuff>` with no corporeal assumption (verified) — **no refactor needed**. The credential update belongs with fast-travel. New `lib/fasttravel/TravelCredentialUpdate.ts`:
```ts
export default class TravelCredentialUpdate
  extends TravelCredentialMixin(AetherHostedMixin(Idea)) {
  static readonly TEMPLATE_PATH = TemplatePaths.travelCredentialUpdate;
}
```
The born-with `UNIVERSITY_AVENUE_NODE` floor and the session-durable `registered` persistence (the `registered` accessor unioning over the floor) ride along unchanged — they're on `TravelCredentialMixin`, base-agnostic. Add `TemplatePaths.travelCredentialUpdate` + seed `seeds/lib/fasttravel/TravelCredentialUpdate.yaml`.

### Step 4.2 — Implant stops carrying the credential; default loadout injects updates

In `lib/augmentation/AetherImplant.ts`: remove `TravelCredentialMixin` from the implant's composition — the implant becomes purely the attunement conferrer:
```ts
const AetherImplantBase = AugmentMixin(SlottableMixin(TangibleMixin(Thing)));
```
`confers()→['AetherMixin']` unchanged.

In `Avatar.installDefaultLoadout()` (`obj/Avatar.ts:432`): ensure the avatar is **attuned by some source**, then inject the default updates. If the species is **not** already born-attuned (check `MixinApi.isAether(this)` before installing anything), `occupy(implant,'cranial')` to confer it; a born-attuned species **skips the implant**. Either way the Avatar is now an `AetherHost`, so inject the two default updates:
```ts
const comms = await StuffApi.clone<CommsUpdate>(CommsUpdate.TEMPLATE_PATH);
(this as unknown as AetherHost).hostUpdate(comms);
const cred = await StuffApi.clone<TravelCredentialUpdate>(TravelCredentialUpdate.TEMPLATE_PATH);
(this as unknown as AetherHost).hostUpdate(cred);
```
- The idempotency guard keys off **"already hosts a comms update"** (not "cranial occupied") — correct for both paths, since a born-attuned avatar never occupies cranial.
- The `Avatar` is the `AetherHost` — it composes `AetherMixin`; once attunement is active (implant **or** species), `getHostedUpdates()`/`hostUpdate` are live, so injection works identically for both paths.
- Born-with floor + session-durable persistence preserved: the credential update is re-cloned each session (same as the implant was), so `registered` resets to the floor each login — exactly the v1 session-durable behavior the requirements preserve.
- `TravelCard` stays a separately-cloneable `Thing` (`/domain/common/tpa/TravelCard`) — untouched.

### Step 4.3 — Terminal credential check reads through generalized `findReachable`

`RegisterController` / `TeleportController` already use `ContainmentApi.findReachable(giver, loc, isTravelCredential)` — with the Step 3.1 host-descent leg, this now returns the hosted credential update (no card) OR the carried card (no update) with no controller change. Verify both controllers compile against the trimmed `Aether`/new surfaces; no logic edit expected.

**Tests** (Wave 4):
- `lib/fasttravel/__tests__/TravelCredentialUpdate.test.ts`: the update is born with the University Avenue floor; `register`/`isRegistered` work; the `registered` round-trip unions over the floor.
- `obj/command/movement/__tests__/RegisterController.test.ts` + `TeleportController.test.ts` (extend): `register` writes to the hosted credential update; `teleport` TPA fork authorizes via the hosted update; the lounge→campus born-with hop works with no card and no registration; and the **carried-card** path still authorizes (no update).
- `obj/__tests__/Avatar.loadout.test.ts` (extend): `installDefaultLoadout` injects a comms update + a credential update into the host; idempotent on re-entry; the implant no longer composes `TravelCredentialMixin`.
- Existing fast-travel + augmentation suites stay green (regression gate).

**Acceptance mapped:** "the terminal credential check passes via the hosted travel update (no card) and via a carried card (no update); born-with floor authorizes lounge→campus; existing fast-travel + augmentation suites stay green."

---

## Wave 5 — Docs sweep (graduate to subsystem docs)

Per `workflow.md` § sweep, update the permanent subsystem docs to the new truth (these are part of the build's acceptance criteria, not deferred to finalize):

- `docs/subsystems/augmentation.md` — document the host/update model (the hosting relation on `AetherMixin` (host methods) + `AetherHostedMixin`, must-be-hosted invariant on the relation not on `Idea`), the reachability generalization (self + host-descent legs), and the **three-base capability model** in one place (the canonical statement). Retire the Wave-2 reserved note ("move AetherMixin off Avatar… verb dispatch routes through the augment") as now-realized, with a history note.
- `docs/subsystems/comms.md` — comms-as-update: `CommsMixin` on `CommsUpdate(AetherHostedMixin(Idea))`, `tell` sends from `getHost()`, the carrier-mixin row in the transports table changes from `AetherMixin` to `CommsMixin` (hosted update); residual `AetherMixin` = attunement + ESP perception.
- `docs/subsystems/fast-travel.md` — credential-as-update (`TravelCredentialUpdate`) + the `TravelCard` Thing twin; the implant no longer carries the credential directly (it confers attunement; `installDefaultLoadout` injects the credential update); `findReachable` now has self + host-descent legs.
- The existing `docs/subsystems/comms.md` is extended, not recreated; reference the new `lib/comms/` folder there.

No test for docs; the finalize skill's doc-sweep checklist covers verification.

---

## Risks, ordering constraints, and requirements-revisit triggers

### Ordering constraints (hard)
- **Wave 1 before Wave 2:** `CommsMixin.tell`/cohort recording and the comms update class depend on `AetherHostedMixin.getHost()` and the `AetherMixin` host methods. Build the relation first.
- **Step 3.1 before Wave 2's `tell`/controllers:** the cohort-stamp and the controller fallback resolve the comms update via `findReachable`'s host-descent leg, so build 3.1 immediately after Step 1.2 (it is foundational despite living in Wave 3).
- **Step 3.3 before Step 4.2's born-attuned path:** the loadout's attuned-by-any-source branch and the test-species integration test depend on species conferral being live.
- **Step 2.4 (self-seeding) before 2.5 (controllers):** controllers rely on the comms update appearing as `commandSource`; without the seeding the verbs never dispatch through the update.
- **Wave 2 before Wave 4:** `installDefaultLoadout` injects the comms update, which requires `CommsUpdate` + the `AetherMixin` host methods to exist.
- **Step 3.1 before 4.3:** the terminal check's host-descent leg must exist before the credential becomes an update, or the implant-hosted credential becomes unreachable and fast-travel tests go red mid-build.
- **Critical sequencing trap:** if Step 4.2 (implant stops carrying `TravelCredentialMixin`) lands before Step 3.1 (host-descent leg) + Step 4.1 (credential update), every avatar loses its credential and the lounge→campus hop breaks. Land 3.1 + 4.1 first, then flip 4.2 atomically with 4.3 verification.

### Risks / hidden couplings
- **The command-source coupling (Refinement 1) is the highest-risk piece.** Comms verbs currently reach hosts purely through class-chain `collectSelfDefs`. The hosted-update self-seeding is genuinely new machinery on the recency stack. If `_ensureSelfEntry`'s lazy-seed path (used by test helpers/`makeStuff` that skip `postRegister`) doesn't also seed hosted updates, tests that construct an avatar directly will see `dm` missing. Mitigation: route hosted-update seeding through the same `_ensureSelfEntry` lazy path, and add `CommandGiver.hostedUpdate.test.ts` covering the no-`postRegister` construction path.
- **`requiresVerbalESP` no longer gates comms-update presence (Refinement 2).** The validator stays green for attuned-but-update-less actors. If a reviewer expects the validator to enforce the absent-comms gate, they'll find it in the controller instead. This is correct per the requirements (attunement = perceive; comms update = transmit) but is a non-obvious split — document it prominently in comms.md and the controller comments.
- **Cohort recording reaches into the recipient's hosted update.** `tell` must `ContainmentApi.findReachable(recipient, null, MixinApi.isComms)` to stamp inbound cohort. A recipient who is attuned but has no comms update receives the dm (reception gate passes) but has nowhere to record the cohort — `reply` then has no cohort. That's acceptable (they can't send anyway), but the `tell` cohort-stamp must null-guard the missing update rather than throw.
- **Live-ref cleanup (ref-shapes R2.x).** The host's `_hostedUpdates` and each update's `_host` are Pattern B live-refs. On host destruct (Avatar logout), the updates must be destructed (they're host-bound). Add `onDestruct` chaining on `AetherMixin` (or the Avatar) to `StuffApi.destruct` each hosted update, mirroring how the implant clone dies with the avatar. Without this, updates leak per session.
- **`Idea` is not a `CommandGiver` and not Containable** — confirmed. The comms update can't itself dispatch; it only *contributes* defs to its host. Don't accidentally make the update a `CommandGiver`.
- **Intrinsic attunement IS built (Step 3.3) — mind the residual limit.** `collectAugmentConferralNames` now unions the actor's species `innateMixins` with slot-augment conferral, so a born-attuned species activates `AetherMixin` with no implant. Residual limit to document: species conferral only *activates a gated mixin already composed on the shared class* — it can't compose a new mixin onto an instance (deferred; nothing needs it). Perf: the species lookup runs inside the lazy conferral collection (only when a gated mixin is encountered, memoized per `getActiveMixins` call), so the cost is one `getSpecies()` templatePath lookup.

### Could force a requirements revisit
- If the recency-stack self-seeding for hosted updates proves to interact badly with schema-delta emission (the `_commandSchemaSubscribed` gate) — e.g. the client double-counts `dm` because both the (now-removed) class-chain contribution and the update contribution fire — the contribution model may need a single canonical source. Verify the residual `AetherMixin` truly removes `commandContributions` so there's exactly one source.
- If a future reviewer wants the must-be-hosted invariant to also block *creating* an unhosted comms/credential update (not just orphaning a hosted one), the `AetherHostedMixin` construction path would need a postRegister guard — currently the invariant is enforced only on unhost. The requirements say "created into a host, never cloned to a location" — the plan enforces this by convention (`installDefaultLoadout` clones-then-hosts in the same step) plus the orphan-destruct, not by a construction-time throw. If that's deemed insufficient, revisit.

## Critical files

- `packages/server/src/mud/lib/message/Aether.ts` — the split (residual host + ESP modalities).
- `packages/server/src/mud/lib/comms/Comms.ts` + `CommsUpdate.ts` — new comms capability + update class.
- `packages/server/src/mud/lib/augmentation/AetherHosted.ts` — the update side of the hosting relation.
- `packages/server/src/mud/api/containment.ts` — `findReachable` self + host-descent legs (also the hosted-update lookup surface — no separate finder Api).
- `packages/server/src/mud/api/command.ts` — hosted-update self-contribution seeding.
- `packages/server/src/mud/api/perception.ts` — modality-walk generalization.
- `packages/server/src/mud/api/mixin.ts` — `collectAugmentConferralNames`/`getActiveMixins` union the species conferral source (Step 3.3) + the hosted-update modality touch-point.
- `packages/server/src/mud/lib/species/Species.ts` — `innateMixins` intrinsic-conferral field.
- `packages/server/src/mud/seeds/lib/species/…/homo/sensitivus.yaml` — throwaway born-attuned test species.
- `packages/server/src/mud/lib/fasttravel/TravelCredentialUpdate.ts` — credential update class.
- `packages/server/src/mud/obj/Avatar.ts` — `installDefaultLoadout` injects updates.
- `packages/server/src/mud/lib/augmentation/AetherImplant.ts` — implant drops the credential, confers attunement only.
- `packages/server/src/mud/obj/command/social/{Dm,Reply,Broadcast,Chat}Controller.ts` — route through the hosted comms update.
