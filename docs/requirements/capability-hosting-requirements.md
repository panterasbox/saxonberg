# Capability hosting — requirements

Realizes the next augmentation wave: the **three-base capability model**
and the **aether-as-host** refactor converged on in design, and the
reserved Wave-2 item in
[augmentation.md](../subsystems/augmentation.md) — *"move AetherMixin off
Avatar onto the host Stuff itself; verb dispatch routes through the
augment."*

Today a capability takes one of two shapes: a mixin composed natively on
the actor (`AetherMixin` → comms, composed on `Avatar`, gated active by
the cranial implant's `confers()`), or a mixin composed on a
slotted/carried `Thing` (`TravelCredentialMixin` → the card and the
implant, found by `ContainmentApi.findReachable`). This build introduces
the unifying third shape and the substrate to support it:

> A **capability is a mixin bundle manifestable around three bases** — a
> corporeal **`Thing`** (carried), an incorporeal **`Idea`** (an *update*
> hosted on aether attunement), or **intrinsically** on a Creature /
> species — and **one reachability scan finds it in any form.**

`AetherMixin` demotes from a comms-carrying mixin to the aether **host**:
attunement is the conferred (implant) or intrinsic (species) capability
whose *payload is a host* that aether Ideas (updates) plug into.
Attunement is universal — no quality tiers; the medium's intensity
(fields/lines) is a deferred consumer, not part of this build. Comms and
the travel credential become hosted updates; the physical `TravelCard`
(and a future radio) are their corporeal twins.

Seeding slate: [augmentation-slate.md](../slates/tails/augmentation-slate.md).
Load-bearing context: [augmentation.md](../subsystems/augmentation.md)
(confers/isActive substrate), [fast-travel.md](../subsystems/fast-travel.md)
(`TravelCredentialMixin` / `findReachable` as-built),
[comms.md](../subsystems/comms.md) + [messaging.md](../subsystems/messaging.md)
(`AetherMixin` / `dm` / reception-gating).

## Goals

- A capability **mixin composes around `Idea`** (an *update*) as cleanly
  as it composes around `Thing` today — the same mixin, carrying its own
  state and behavior, on either base.
- An update can be **hosted** on an aether-attuned entity through a
  **hosting relation distinct from corporeal containment** (the as-built
  deliberately omits `ContainableMixin` from `Idea`; updates must not be
  forced through `Container`/`Containable`).
- **`AetherMixin` is the host.** Attunement is conferred by the cranial
  implant (exactly as today) or **intrinsically by the actor's species**;
  when active it hosts a set of capability updates. AetherMixin **no longer
  carries the comms transmission capability.**
- **A species can intrinsically activate a gated mixin** — the *innate*
  leg of conferral. `getActiveMixins` unions conferral names from **both**
  slot augments **and** the actor's species, so an entity of a
  born-attuned species has `AetherMixin` active with **no implant** — the
  same innate⊕acquired union the sensorium already does for bodyplan
  senses and `defaultModeFor` does for locomotion. Completes the
  three-base model's *intrinsic* base for gated-mixin activation.
- **Comms (`dm`/`chat`) is a default-installed update**, hosted on
  attunement — the capability you ship with, proving the host/update
  split. Transmission routes *through* the hosted comms update, acting on
  behalf of its operator (its host).
- **The travel credential is an update**, with the physical `TravelCard`
  as its corporeal `Thing` twin — proving the Thing/Idea symmetry for a
  *stateful possession* capability (the registered-node set).
- **One reachability scan** finds a capability whether it is carried as a
  `Thing` (card), hosted as an update on an attuned host (the implant on
  self, or a carried attuned `Thing`), or composed intrinsically on the
  actor — by adding the **self leg** and the **descend-into-host leg** to
  `ContainmentApi.findReachable`.
- A capability **update cannot exist unhosted** — the diegetic anchor
  ("otherwise everything would be everything") enforced as a structural
  invariant **on the hosting relation, NOT on the `Idea` base** (which
  must stay free-standing-capable for Biome / Zone / every Controller).
- The existing **augment-contribution walks generalize** from
  slot-occupants to also include a host's hosted updates, so an update's
  grants (modalities, verbs, command contributions) reach their consumers
  the same way a slotted augment's do — no parallel resolution path.

## Non-goals

Each deferred surface the substrate must *enable* but not deliver:

- **Slot scarcity / capacity-expanders.** The cranial-capacity-1
  accretion pain is its own cycle (augmentation-slate Q5: regional aug
  slots + `_grantsSlots`). Attunement is universal; this build doesn't
  touch slots.
- **Aether medium quality.** Fields vs. lines, intensity, coverage /
  brownout. Belongs with the aether-line/delivery + weather notes. Hosted
  software is binary-available here; the off-grid card-vs-implant
  trade-off rides the deferred medium build.
- **Runtime acquisition / the clinic verb.** Updates ship
  default-installed. The "install an update at runtime" flow waits for
  content that acquires a *second* update — but the substrate must not
  preclude it (a host must be able to gain/lose an update post-spawn).
- **Content.** The physical aether **radio** (an attuned `Thing` hosting
  comms for the un-implanted), **anatomical augs** (gill / ocular) and
  their body-plan slots, and the **rich attuned-species content + its
  char-gen exposure**. The substrate supports all of these; only a
  throwaway **test species** (a born-attuned near-human sibling) is
  authored here, purely to exercise the intrinsic-conferral path.
- **Garment layering** — unrelated axis, its own slate.
- **Implant failure / power / jamming / spoofing** (augmentation-slate
  Wave 3). The baseline stays hardened.

## Surface decisions

### Capability lives on the update (not an activator flag)

A hosted update **carries** the capability — its mixin, state, and
behavior — the same way the `TravelCard` carries `TravelCredentialMixin`
and its registered set today. It is **not** a flag that merely confers a
latent mixin already composed on the actor. This is what delivers the
Thing/Idea symmetry: one mixin, two bases, identical state surface. The
consumer interrogates (possession: read the update's state) or operates
(behavior: invoke the update, which acts on behalf of its host).

### Hosting is a new relation, distinct from containment

`AetherMixin` (the host) holds a **collection of hosted update `Idea`s**.
This is a dedicated hosting relation — **not** `Container`/`Containable`.
Rationale: `Idea` is bare `Stuff` with no `ContainableMixin` by design,
and is used pervasively for free-standing singletons (Biome, Zone,
Controllers); making Ideas Containable, or routing updates through
corporeal containment, pollutes that split. The host is **any
AetherMixin-active entity** — an actor via conferral, or a `Thing` (the
future radio) via intrinsic composition — so the relation lives on
`AetherMixin`, not on the actor class.

### AetherMixin's residual = attunement + ESP perception

After the split, `AetherMixin` keeps: the host (the hosted-update
collection) and the **ESP perception modalities** (`verbal-esp`,
`emotive-esp`) — being attuned means you can *sense* the aether, which is
what reception-gating checks. It loses: the `tell` transmission method
and the `dm`/`reply`/`broadcast`/`chat` command contributions, which move
to the comms update. Net: **attunement = perceive the aether + host
software; the comms update = transmit on it.** Reception-gating is
unchanged (an unattuned recipient lacks `verbal-esp` and drops the
frame); a recipient who is attuned but lacks the comms update still
*receives* dms, they just can't *send*.

### Species intrinsic conferral (the innate leg)

A `Species` declares an **`innateMixins`** set (authored data, the mirror
of `AugmentMixin.confers()`). `getActiveMixins` /
`collectAugmentConferralNames` union conferral names from **both** the
actor's slot augments **and** its species, so a gated mixin is active when
composed AND (an augment confers it **OR** the species confers it). Home
is **`Species`, not `BodyPlan`** — attunement is a species trait, not a
physical sensory port, and a born-attuned species shares an existing
bodyplan (per `Species`'s own "capability divergence among species sharing
a body plan" rationale). Scope: this **activates a gated mixin already
composed on the shared class** (e.g. `AetherMixin`); it does **not**
compose a new mixin onto an instance — the compose-everything-gated vs.
per-species-subclass question is deferred (no current capability needs it).

### Reachability: add the self leg and the host-descent leg

`ContainmentApi.findReachable` gains two cases on top of today's
slot-occupants → carried → location walk:
1. **Self** — `predicate(actor)` (the intrinsic leg: a capability
   composed directly on the actor/species).
2. **Descend into hosts** — for any AetherMixin-active host encountered
   (the actor itself, or a found attuned `Thing` like a radio), also test
   its hosted updates.

One scan, all three manifestations. Order keeps "on your person first."

### The must-be-hosted invariant is on the relation, not on `Idea`

A capability update has **no independent existence**: it is a member of a
host's hosted set, with a back-reference to its host, and its lifecycle is
bound to that host (orphaning is illegal / destroys it). The invariant
lives on the hosting relation / the hosted-update category — **`Idea`
itself is untouched**, so Biome/Zone/Controller free-standing Ideas keep
working. Updates are created *into* a host, never cloned to a location.

### Grants and verbs route through the existing contribution walks

The update's grants reach consumers by **generalizing the surfaces that
already aggregate slotted-augment contributions** — `getActiveMixins` /
`collectAugmentConferralNames`, the `PerceptionApi.sensorium` modality
walk, and the command-source affordance walk — to include a host's hosted
updates alongside its slot occupants. No new resolution Api. Comms verb
dispatch uses the hosted update as `commandSource`; the update's `tell`
sends from `getHost()` (the operator). This is the reserved "verb
dispatch routes through the augment" pattern, made concrete for an update.

### Default loadout and the travel-credential conversion

`Avatar.installDefaultLoadout` keys off **whether the avatar is attuned by
any source**: it installs the cranial implant **unless the species is
already born-attuned**, then **injects the default updates** — comms and
the travel credential — into the host either way (so a born-attuned avatar
skips the implant but still ships with comms + the campus credential on
its native attunement). The idempotency guard keys off "already hosts a
comms update," not "cranial occupied." The `TravelCard`
remains a separately-cloneable `Thing`. The implant-hosted travel
credential becomes a `TravelCredentialMixin`-around-`Idea` update; the
**born-with University Avenue floor and session-durable persistence are
preserved**; the terminal's check is unchanged in intent — it reads the
registered set off whichever credential the generalized `findReachable`
returns (hosted update, or carried card).

## Constraints

- **Do not add the must-be-hosted invariant to `Idea`.** It would break
  Biome, every Zone, and every Controller (all free-standing Ideas).
- **Do not make `Idea` Containable** or route updates through
  `Container`/`Containable`. The hosting relation is separate by design.
- **Extend, don't mint.** Reuse `findReachable`, `getActiveMixins` /
  `collectAugmentConferralNames`, the sensorium walk, and command-source
  affordance. No parallel `isXActive` predicates, no new registry, no new
  Api unless an existing surface genuinely can't host the method (per the
  no-new-Apis / no-premature-registries project rules).
- `CommsMixin` and `TravelCredentialMixin` must compose around `Idea` as
  well as their current bases — verify neither assumes corporeal features
  (material, containment, keyword/Perceptible).
- **Reception-gating preserved**: `dm` frames still drop for the
  unattuned; the `verbal-esp` sensorium gate continues to ride attunement.
- **`@RequiresActive` / uniform `isActive` predicate convention
  preserved**; build-time-only checks still use `hasMixin` directly.
- **Fast-travel behavior preserved**: existing fast-travel tests stay
  green; born-with floor authorizes the lounge→campus hop with no card
  and no registration.
- A host must be able to **gain and lose an update after spawn** (so the
  deferred clinic flow is not precluded), even though no verb exercises it
  in this build.

## Acceptance criteria

- The same capability mixin, composed around `Idea` (update), `Thing`
  (card), and intrinsically on the actor, is each found by a single
  `findReachable` call. Tests cover all three legs and the search order.
- A capability update orphaned from its host cannot persist or exist
  (invariant test); a free-standing `Idea` (e.g. a Biome-shaped test
  double) is unaffected — no hosting requirement imposed.
- `dm` succeeds for an attuned actor carrying the default comms update;
  fails to transmit when the comms update is absent though attunement is
  present; an unattuned recipient still drops the frame (reception gate).
- An avatar of the **born-attuned test species** (no implant) has
  `AetherMixin` active, hosts the default comms + travel updates, and can
  `dm` — proving the intrinsic-conferral leg and the loadout's
  attuned-by-any-source branch. An ordinary species with no implant stays
  inert (no comms).
- The terminal credential check passes via the **hosted travel update**
  (no card) and via a **carried card** (no update); the born-with
  University Avenue floor still authorizes lounge→campus. Existing
  fast-travel + augmentation test suites stay green.
- `AetherMixin` no longer exposes the comms transmission capability;
  `tell` / `dm`-family contributions live on the comms update; an
  update's `_grantsModalities` / command contributions reach the
  sensorium and command-source walks through the host.
- Subsystem docs updated to the new truth:
  [augmentation.md](../subsystems/augmentation.md) (the host/update model
  + reachability generalization), [comms.md](../subsystems/comms.md)
  (comms-as-update), [fast-travel.md](../subsystems/fast-travel.md)
  (credential-as-update + card twin). The three-base capability model is
  documented in one place.

## Cross-references

- **Seeding slate:** [augmentation-slate.md](../slates/tails/augmentation-slate.md)
  — Q5 (slot scarcity, deferred here) and the reserved-wave note.
- **Subsystem docs:** [augmentation.md](../subsystems/augmentation.md),
  [fast-travel.md](../subsystems/fast-travel.md),
  [comms.md](../subsystems/comms.md),
  [messaging.md](../subsystems/messaging.md),
  [senses.md](../subsystems/senses.md) (sensorium modality consumption),
  [command-routing.md](../subsystems/command-routing.md) (command-source
  affordance), [templates.md](../subsystems/templates.md) (Idea base,
  clone/lifecycle), [race.md](../subsystems/race.md) (Species / BodyPlan —
  the intrinsic-conferral home).
- **Antipatterns:** [antipatterns.md](../antipatterns.md) — augment
  modeling (declare-mixins-not-grants), no-new-Apis, no-premature-registry.
- **Deferred siblings** (substrate enables, not built here): aether radio
  + anatomical augs + the **rich attuned-species content/char-gen
  exposure** (this slate's later waves; the substrate + a throwaway test
  species ship here); aether medium quality (aether-line/delivery +
  weather); runtime acquisition / clinic; garment layering (own slate);
  aug slot scarcity (own cycle).
