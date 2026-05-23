# Saxonberg 2.0 Roadmap

Forward-looking work, organized by area. The phase numbering from
the legacy `PLAN.md` is no longer load-bearing; treat it as
historical.

This roadmap is a navigation aid. Concrete design lives in slates
under `docs/`; implementation guidance lives in `docs/architecture.md`
and the subsystem references under `docs/subsystems/`. The
[design-philosophy.md](./design-philosophy.md) is the principle
that shapes every slate.

---

## Foundation (shipped)

The substrate is in place. Major shipped surfaces:

- **Auth + persistence** — Google OAuth; `Persistable` track for
  user-data; template/clone track for the Idea hierarchy;
  Marshaller framework for non-default serialization.
- **Standard Model + mixins** — class-factory mixin pattern,
  `Mixins` registry, composition rules; `PropertiedMixin` for
  typed properties.
- **Spatial substrate** — `Stuff` / `Idea` / `Thing` /
  `Location` / `Vessel`, `Cartesian` / `Spherical` zones, exits,
  doors, windows, the Boundary substrate (Adornable +
  Adornment + Conduit), Sealable.
- **Light & Boundary subsystem** — Light value object,
  propagation walk via `LightApi.lightAt`, per-viewer perception
  (`LightApi.canSee`, `perceivedBand`), the Boundary substrate's
  channel-keyed transmissivity readied for future channels.
- **Quantities substrate** — `Quantity<U>` value object,
  per-unit math op table, tag-table registry, YAML-authored
  scales, `<quantity>` Mml emission, marshaller integration.
  Consumed by Light (lux/lumen/Kelvin), Material (kg/m³, g/mol),
  Tangible (kg); future channels (sound, heat) plug in via the
  same shape. See [docs/subsystems/quantities.md](./subsystems/quantities.md).
- **Race / species / organism (v1)** — Material substrate, Clade
  taxonomy, BodyPlan + Species, OrganismMixin, SexedMixin,
  SpeciesApi (kingdoms, lifecycle predicates, `isAnimate`).
  Animacy gating on commands. v1 acceptance roster: Homo
  sapiens, Homo khazadicus, Lithobates catesbeianus,
  Spathiphyllum wallisii, Constructa metallica.
- **Command framework** — YAML view + controller MVC, validators
  (field + verb-level), MQL grammar (pronouns, multi-select,
  chains, filters, focus), per-character aliases (`AliasMixin`).
- **Shell** — `EnvironmentMixin` (settings keyspace),
  `WorkspaceMixin` (`pwd`/`cd`/`ls`/`cat`/`grep`/`write`/
  `mkdir`/`rm`/`cp`/`mv`), `AuthorMixin` (`clone`/`reload`/
  `destruct`/`eval`/`teleport`), `PerceiverMixin` (`look` /
  `scry` / `locate`), prose / liquid templating.
- **Communications** — `Sensor` / `Vocal` / `Mobile` mixins;
  `say` / `tell` controllers; messaging subsystem (MML, scene
  composer, movement-message settings); `MudlogApi`.
- **Event system** — `EventApi` global pub/sub bus, Witness
  pattern, `EventRegistry` Idea bootstrapped via
  `BootstrapManager`. Spatial-mixin lifecycle hooks dispatched
  through `ContainmentApi.move`, `Mobile.traverse`,
  `ConnectionApi`.
- **Module hot-reload** — `HotReloadApi` with module registry,
  dependency graph, admin `reload` verb,
  `StuffApi.clone`-integrated lifecycle.
- **Call security** — proxy interceptor pipeline, decorators,
  policies, `@CallSecurity` / `@Final` / `@Unshadowable`,
  `SecurityApi.decorateApiClass`.
- **Bootstrap + state model** — `BootstrapManager`, unified
  state model (Shadow, PostRegistration), HomeZone for
  per-player namespace at `/home/<playerId>`.
- **Spawn shape (declarative authoring)** — Template
  `environment:` field, `PopulatesMixin`, escape hatch via
  `PostRegistrationMixin`. Working slate at
  [docs/slates/spawn-shape-slate.md](./slates/spawn-shape-slate.md).

See [docs/architecture.md](./architecture.md) for layout and
[docs/subsystems/](./subsystems/) for individual references.

---

## Active design slates

The exploratory design pass. Each slate is a working doc shaped
for review; concrete implementation follows when a slate is
promoted to formal requirements.

### Top-level guidance

- [docs/design-philosophy.md](./design-philosophy.md) — "model
  the smallest fidelity content needs, do it honestly, present
  in layers." Spatial-fidelity axis; ranged-action and capacity
  worked examples.
- [docs/runtime-model.md](./runtime-model.md) — Node event
  loop, timing primitives, wire transmission, multi-client
  reality, isolation tradeoffs. Reference doc consumed by
  slates that schedule work.

### Substrate slates

- **Embodiment subsystem (shipped)** — see
  [docs/subsystems/slot.md](./subsystems/slot.md),
  [embodiment.md](./subsystems/embodiment.md),
  [posture.md](./subsystems/posture.md),
  [conveyance.md](./subsystems/conveyance.md). Slot substrate
  (`Slotted` / `Slottable`); body-side affordances
  (`Wearable`, `Wieldable`); world-side (`Postured`,
  `Mountable`, `Drivable`). Conveyance ripple via
  `Mobile.traverse`. Floor adornments and the
  ground-targeting path for sit/lie/kneel.
- **Locomotion subsystem (shipped)** — see
  [docs/subsystems/locomotion.md](./subsystems/locomotion.md).
  `LocomotionMode` singletons; verb-as-mode dispatch
  (`walk`/`climb`/`swim`/`fly`/`ride`/`drive`); enablement
  mixins (`Climbable`/`Swimmable`/`Flyable`); `LocomotionApi`
  emission walk; four-gate cascade (body-plan, posture,
  exit.canTraverse, enablement). The original locomotion
  slate was retired; forward-looking trap / pathfinder /
  detection / run-as-mode notes live in the subsystem doc's
  Future work section.
- [docs/subsystems/activity.md](./subsystems/activity.md) — Wave 1
  substrate shipped: `SchedulerApi`, `EngagedMixin` on `Character`,
  engagement slots, the five framework-intrinsic abort reasons,
  HMR-aware lifecycle dispatch, `cancel` verb. Locomotion-as-
  activity and host-slot activities deferred — see
  [docs/slates/locomotion-as-activity-slate.md](./slates/locomotion-as-activity-slate.md)
  and
  [docs/slates/host-slot-activities-slate.md](./slates/host-slot-activities-slate.md)
  for the design sketches.
- [docs/slates/sound-slate.md](./slates/sound-slate.md) — sound as the second
  physics channel after light; three source kinds; channel-
  keyed Conduit transmissivity; pedagogical seam threaded
  through (real dB, real Hz, real species hearing ranges,
  acoustic instruments).
- [docs/slates/collision-slate.md](./slates/collision-slate.md) — capacity
  (typed-list-of-constraints), intentional blocking
  (`BlockerBehavior`), pushing (`Pushable` + `PushActivity`).

### Social / perception slates

- [docs/slates/recognition-slate.md](./slates/recognition-slate.md) — per-
  viewer perception state; `DescribeApi v2` pipeline; disguise
  as Wearable shadow; salient-feature rendering.
- [docs/slates/social-graph-slate.md](./slates/social-graph-slate.md) —
  buckets (friends/foes/custom); notification policies;
  bucket-keyed display verbosity (attention-management
  rendering).
- [docs/slates/communication-policy-slate.md](./slates/communication-policy-slate.md)
  — trust-tiered moderation; `MessageGate`; sandboxed-zone
  NPC handling; emote-only / template-only constrained forms.
- [docs/slates/identification-slate.md](./slates/identification-slate.md) —
  parallel pattern for items; experiment-based identification;
  the pedagogical seam at its richest.

### Cross-cutting

- [docs/slates/mixin-slate.md](./slates/mixin-slate.md) — broad mixin slate;
  most affordance mixins now distributed into the substrate
  slates above.
- [docs/slates/verb-provisioning-slate.md](./slates/verb-provisioning-slate.md)
  — verb-acquisition pattern (innate / skill / instrument /
  implant / consumable / ambient). One verb, one controller, N
  provisioning paths each with its own gate and prose flavor.
  Generalizes the instruments-reveal seam from the Quantities
  substrate to skills, cybernetics, transient buffs, and ambient
  effects.
- [docs/slates/bulkable-slate.md](./slates/bulkable-slate.md) —
  bulk-form sibling to globbable. Continuous mass/volume measured
  matter (flour, water, bread). Exploratory; ships when content
  demands. Shares globbable's substrate (placeDirect, MqlQuantity
  union, distribution algorithm). Central design fork: divisibility
  decomposition (single mixin vs Bulkable + Subdivisible).
- [docs/subsystems/response-envelope.md](./subsystems/response-envelope.md)
  — structured machine-channel sibling to MML on every server→client
  message. `outcome.status` + typed `notes`. Universal envelope
  shape for dispatch responses, witnesses, activity pushes, prompts.
  Substrate consumed by globbable, look fallback, MQL disambiguation,
  prompt stack, activity completion. Sibling to state-sync below.
- [docs/slates/state-sync-slate.md](./slates/state-sync-slate.md) —
  parallel wire channel for world state deltas (containment,
  property, slot, lifecycle). Sourced from `EventApi`, filtered
  per-client by perception scope, delivered as `state-delta` frames.
  Deliberately separate from the response envelope so self-actions
  and witnessed actions share one state-delivery code path.
  Implementation deferred to its own working session.
- [docs/adjoining-systems.md](./adjoining-systems.md) —
  catalog of unexplored subsystems (Tier 1 graduated; Tier
  2/3 remain).

---

## v1 punch list — small, concrete remaining items

Tactical work that doesn't need a slate. Pull these in
opportunistically.

- **Interactive prompt stack (Framework 11)** — per-Interactive
  prompt stack (`PromptApi.confirm`, choice, text, MQL-object)
  + matching client UI. Unlocks multi-step workflows
  (disambiguation, character creation, crafting). Medium
  server + small client.
- **MQL disambiguation prompts** — depends on the prompt stack.
  Multi-match cardinality checks turn into UI prompts.
- **MQL sort / named-group operators** (`:sort.X`, `@@group`).
  Add when demand is real.
- **Real authoring-tier permission check** in MQL — replace the
  current admin-flag stub with zone-aware logic. Lands with
  player-authoring work.
- **Markup language semantic tags + client renderer** — extend
  MML with `<command>` / `<direction>` / `<item>` / `<exit>` /
  `<npc>` / `<player>` / `<quantity>` and formal tags
  (`<color>` / `<size>` / `<link>`). Foundation for clickable
  links and richer rendering.
- **Look fallback for non-Visible rooms** — current "You see
  nothing special." reads wrong for plain locations like the
  void.
- **Model piping** (PowerShell-style) — foundational for
  scripting; medium.
- **Utility APIs** — `StringApi`, `TimeApi`, `ObjectApi`,
  `CallstackApi`, `FileApi`, `AssertApi`. Take on demand.
  `MudlogApi` exists but is incomplete.
- **DescribeApi v2** — implements the design from
  [recognition-slate.md](./slates/recognition-slate.md). Composition
  pipeline; `getDisplayParts`; MML-aware output.

---

## Substrate buildout — slate implementation

The major slates each become a wave of work. Suggested order
follows dependency stack:

1. **Quantities** — *shipped*. `Quantity<T>` + per-unit math +
   tag tables. Foundational; everything below uses it. See
   [docs/subsystems/quantities.md](./subsystems/quantities.md).
2. **Embodiment** — slot substrate + first affordance mixins
   (Wearable / Wieldable). Slot capacity + containment-scope
   capacity from collision-slate.
3. **Locomotion** — mode singletons + verb controllers + target
   mixins. Generalizes `Mobile.traverse(target, mode)` from
   `(exit, mode)`.
4. **Activity** — durative-verb framework + engagement slots +
   cancel. Locomotion verbs become activities.
5. **Sound** — channel-keyed Conduit transmissivity (light's
   small migration); SoundApi propagation walk; ambient +
   activity-driven + event sources; `analyze sound` +
   SoundLevelMeter.
6. **Collision** — block validators integrated with locomotion
   pipeline; `Pushable` + `PushActivity`.
7. **Recognition** — per-viewer state + DescribeApi v2 +
   disguise mixin + salient-feature generation.
8. **Social graph** — buckets + notifications + bucket-keyed
   verbosity in DescribeApi step 4.
9. **Communication policy** — `MessageGate` + trust tiers +
   sandboxed-zone NPC handling + constrained forms.
10. **Identification** — item-recognition + analyze verbs +
    instrument-based ID (cross-cuts quantities for
    pedagogical seam).

The recognition family (7-10) ships best as a unit — the four
slates compose tightly, and dispersed shipping creates
hard-to-test partial states.

---

## Race subsystem follow-on

V1 shipped the substrate. Deferred work, sequenced as content
demands:

- **Death / resurrection flow** — state-machine present;
  transition flow not. First content lifecycle event.
- **DietApi + Edible + Portable** — material toxicity authored
  but no consumer reads it. Needs eater-side diet check.
- **Per-Detail materials and tissue authoring** — v1 is
  bulk-only. Needed for tissue-zone seams (eye, wing, hand).
- **Genetics** — alleles, inheritance, mutation, evolution. A
  sub-subsystem of its own.
- **Per-individual variation** — feature mixins for the
  unique-individual layer above species.
- **Sleep / circadian** — per-species rhythm; status mixins
  for sleeping / resting.
- **Aging** — life stages, species lifespans, per-stage
  property changes.
- **Polymorph** — runtime body-plan swap. Slot map
  reconciliation across body-plan changes.
- **Character-creation UI** — currently no UI for picking
  species, sex, gender, body-plan-derived options.

---

## Adjoining systems still in queue

From [docs/adjoining-systems.md](./adjoining-systems.md). Tier
1 graduated to slates; remainder by tier:

**Tier 2** — extends established patterns:

- #4 Scent and persistent traces — temporal physics, parallel
  to sound channel; needs activity emission hooks (deferred
  in activity-slate).
- #6 Visibility-within-room — what's visible at varying
  containment depths; partial absorbance into DescribeApi v2
  via recognition-slate.
- #7 Memory of observed events — partially absorbed by
  recognition + identification's per-viewer stores; broader
  Witness-pattern memory is the unfinished part.
- #10 Activity layer — non-locomotion sustained tasks (read,
  forge, brew); largely covered by activity-slate; specific
  content (a brewing recipe, a reading flow) lands as the
  content asks.

**Tier 3** — peripheral / forcing-function-driven:

- #8 Multi-actor coordination — lift-the-log-together,
  carry-the-stretcher, two-player levers. Stresses
  activity-slate's single-actor model.
- #9 Persistent location state — bloodstains, footprints,
  soot. Temporal traces; pulls on #4.
- #11 Heat as physics channel — third channel after light
  and sound; forces the `PhysicsChannel` generalization.
- #12 Pedagogical seam — largely absorbed by quantities-
  slate; remaining work is content-team integration.

---

## Platform / production

Required for v1.0 ship. Most depend on the substrate slates
landing first.

- **Templates, mods, and isolated-vm sandboxing (Framework
  13)** — mod base class (Content / Capability / Full), mod
  registry, dependency loader, `isolated-vm` integration,
  bridged whitelisted Apis, resource limits (CPU / memory /
  timeout), monitoring hooks. The runtime-model
  [Tier 2 isolation discussion](./runtime-model.md#isolation-options)
  is the framing.
- **Persistence framework upgrade** — fine-grained per-record
  access patterns. Recognition + identification + social-graph
  stores need it; current `Persistable` is whole-document. May
  fold in a parallel "social/memory store" using MongoDB
  collections directly, with its own schema and indices.
- **Idle eviction for Stuff lifecycle** — registry is forever-
  growing. TTL / LRU / proxy-access-hooks design pass needed.
  Subsystems/lifecycle.md § Open Design.
- **Guest accounts** — random-surname generator that bypasses
  Google OAuth. Lower the barrier to first-time exploration.
- **GraphQL admin API** — `type-graphql` schema, resolvers
  over running game state for inspection / dashboards.
- **Production hardening (Phase 10)** — test coverage to >80%,
  integration / E2E flows, sandbox escape tests, MongoDB
  connection pooling, message batching, memory-leak audit,
  load testing, error boundaries, admin commands.
- **Deployment infrastructure** — Docker image, AWS CodeDeploy
  + Parameter Store + Secrets Manager + S3 + EC2; GitLab CI;
  health checks. Old PLAN.md AWS section has the spec.

---

## Client UX

- **Near-term polish** — scroll-to-bottom button, message
  filtering, timestamps, copy / search.
- **Prompt-mode UI** — paired with Framework 11.
- **Markup-tag rendering** — paired with markup language
  extensions.
- **Long-term layout** — split-pane (output + sidebar), tabs,
  mini-map, theming, accessibility, mobile-responsive.
- **Visual map generator** — 3D map from spatial subsystem
  (cf. [design-philosophy.md](./design-philosophy.md) — text
  prose for normal play, optional visualization in client).

---

## Aspirational / long-term

- **Domain mods** — Education (adaptive learning, course /
  quiz events), Retail, others.
- **AI-driven NPCs** — LLM-backed faculty, staff, student NPCs
  as a Capability Mod.
- **Modding marketplace / community content** with the
  sandboxed mod API.
- **In-game scripting** for users (sandboxed).
- **Web forms for complex commands** (crafting UI, character
  sheet) and graphical elements (avatar art, room
  illustrations).
- **LMS integration** — sync, progress tracking, adaptive
  content.
- **Distributed deployment** — sharded zones, cross-server
  social-graph federation.
- **Phase 11+ persistence** — full `Thing` persistence with
  location reconstruction, advanced template diffing.

---

## Suggested order

1. **v1 punch list (parallel; low-effort)** — prompt stack,
   markup tags, look fallback, MQL extensions, utility APIs.
   These land alongside substrate work without blocking it.
2. **Quantities + Embodiment + Locomotion** — substrate that
   unlocks slot-based affordances and mode-driven verbs. The
   biggest authoring leverage.
3. **Activity** — durative verbs become first-class. Sound and
   downstream consume activity hooks.
4. **Sound** — second physics channel; locks in the channel-
   keyed Conduit shape; pedagogical seam first concrete
   instance after light.
5. **Collision** — small; lands alongside or just after
   embodiment. Block-validators extend locomotion's pipeline.
6. **Recognition family** (recognition + social-graph +
   communication-policy + identification) — ship as a unit;
   four slates compose tightly. Persistence-framework upgrade
   probably needs to land alongside.
7. **Race subsystem follow-on slices** — pull as content needs.
   Death / DietApi / tissue probably the early ones; genetics
   later.
8. **Mods + isolated-vm + persistence upgrade** — v1.0 platform
   work. Significant lift; start once substrate feels stable.
9. **Production hardening + deployment** — once mods exist.
10. **Aspirational** — opportunistic.

---

## What got skipped or absorbed

For audit. Items from previous roadmaps that are done, absorbed,
or no longer load-bearing:

- **Phase 5 ("Communications")** — absorbed; `say` / `tell` +
  `Sensor` / `Vocal` shipped.
- **Phase 6 ("Extended Object Model")** — absorbed; `Thing`,
  `Detailed`, `Propertied`, `CartesianLocation` all in tree.
- **Phase 8 ("Advanced API Layer")** — partially shipped; rest
  is the "Utility APIs" punch-list item.
- **Light & Boundary subsystem** — shipped. The Light value
  object, propagation walk, per-viewer perception, and the
  Boundary substrate (Window, Door retrofit) all landed.
- **Race subsystem v1** — shipped. Material substrate, Clade,
  BodyPlan + Species, OrganismMixin, SexedMixin, SpeciesApi,
  animacy gating.
- **Event System** — shipped. EventApi + Witness pattern +
  EventRegistry + lifecycle hooks.
- **Module hot-reload** — shipped. HotReloadApi + admin
  `reload` command + clone integration.
- **AliasMixin** — shipped. Per-character verb aliases.
- **Shell tooling** — shipped. Workspace + Author + Perceiver +
  Environment mixins, the verb suite, HomeZone, spawn-shape.
- **Bootstrap subsystem** — shipped. `BootstrapManager` for
  ordered system-singleton creation.
- **Marshaller framework** — shipped. Custom serialization
  escape hatch.
- **`MarkupApi`** — PLAN.md spec'd a server-side helper class;
  current code calls into `api/mml.ts` directly. Decision
  pending: keep direct or formalize wrapper. Punch-list item.
- **VM2** — settled on `isolated-vm`. No action.
- **Phase 6-8 client features** (split-pane, tabs, mini-map,
  sound) — rolled into "Client UX."
