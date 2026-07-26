# Combat extension hooks — requirements

The **wizard-facing extension grammar for the combat experience**: a
declared, documented set of hook seams through which custom TypeScript
(special weapons, reactive gear, species dynamics, venue responses)
plugs into the combat engine — without reading or touching the engine's
guts, and without the engine accumulating per-dynamic carve-outs. The
model is the movement substrate, which already has this property:
`Mobile.traverse` runs a fixed choreography of veto hooks
(`canTraverse`), witness hooks (`onExited`/`onEntered`), and
self-resolving scan points (`MixinApi.isHazard` →
`cand.resolveTraversal(mover, mode)`), so every movement dynamic —
traps, hiding decay, locks, deferred destinations — is a named method on
the dynamic's own class and the engine never grows a new branch. Combat
has **none** of this today: zero `@hook` tags across
`lib/combat/`/`lib/equipment/`, gear participates only as passive stat
reads, nothing witnesses a fight structurally, and the first barnacle
already exists — the hard-coded
`if (MixinApi.isEnergized(weapon)) ElectricityApi.shockContact(...)`
inside `commitInflict` (`obj/api/CombatLogic.ts`). This build declares
the seams, migrates that branch onto them as proof, and lint-locks the
engine against the next barnacle.

Seeded by the 2026-07 content-extensibility audit (conversation-driven;
no slate file — this doc is the first artifact). Load-bearing context:
[combat.md](../subsystems/combat.md),
[spatial.md](../subsystems/spatial.md) (the traverse choreography),
[hazard.md](../subsystems/hazard.md) +
[residency.md](../subsystems/residency.md) (the "engine informs, object
decides" shape), [electricity.md](../subsystems/electricity.md)
(`EnergizedMixin`, the migrating consumer).

## Goals

- Combat has a **declared extension tier**: a small, named roster of
  `@hook`-tagged seams across three surfaces — **instrument** (wielded
  weapons, shields, worn gear), **participant** (the combatant), and
  **venue** (the location a fight happens in) — at fixed points of the
  beat lifecycle, documented as a choreography the way
  `Mobile.traverse` documents its layers.
- A wizard can build a special weapon (frost brand, poison blade,
  stun baton), reactive armor (cursed shield), a species dynamic
  (venomous bite), or a reactive venue (an arena that bars its gates at
  first blood) by implementing hook methods on **their own class**,
  with zero edits to `CombatLogic` and zero need to understand its
  internals.
- Natural and forged weapons share one abstraction: the innate-attack
  path consults the same instrument seam as the wielded-weapon path.
- **`EnergizedMixin` is migrated onto the instrument seam
  byte-identically** — the `isEnergized` branch is deleted from
  `CombatLogic` and the stun-baton behavior becomes the seam's first
  real consumer, proving the grammar by construction.
- The engine is **lint-locked against carve-out accumulation**: a CI
  check forbids new dynamic-mixin narrowing inside the combat engine
  outside the declared scan points.
- **Determinism survives**: a combat session with no hooks installed is
  bit-for-bit identical to today (gym-pinned), and hooked sessions
  remain deterministic under the same contract.
- The hooks are **visible**: every seam lands in the extension tier of
  the generated author surface (`callable == visible == cared-about`
  extended to wizards).
- Hooks are **shadow-composable**: a shadow over a hook method IS the
  temporary-enchantment/curse substrate (attach = enchant, detach =
  expire) — proven by test, documented as the enchantment story, and
  protected by never marking a hook `@Unshadowable`.
- External systems get a **state-instruction surface**: the gated
  `CombatApi.influence` bridge (stagger / expose / steady) so a future
  spell, script, or director can touch the poise/opening economy — the
  "Effect iff gated Api" prerequisite for battle magic.
- **Innate delivery parity**: a natural attack routes through the same
  delivery split as a weapon — a shock innate (the electric eel) or a
  heat innate works, not just mechanical channels.
- A **species combat vocabulary**: multi-natural-attacks
  (claw/claw/bite), body-derived natural weapon profiles (an ogre
  punches at ogre reach), and species-afforded gambits (a tail affords
  `sweep`) — all authorable `Species` data over existing engine
  vocabularies.

## Non-goals

- **Data-driven dynamic authoring.** This build ships code seams for
  wizards, not authorable effect fields for protowizards. Graduation to
  data happens later, per-shape, once two or three coded dynamics
  converge (the posture recorded in Surface decisions below); the
  consumable/item-effect envelope is the magic-items build's job
  (`docs/slates/builds/magic-items-slate.md`).
- **New gambits, armor forms, channels, or allocation tokens.** The
  closed physics vocabularies stay closed; "growing it means shipping
  the backing Api first" stands.
- **The authoring-track siblings from the same audit** — the vetted
  brain catalog (access.md v2 deferral) and the `scripted-behavior`
  brain (behavior.md deferral). Separate work.
- **Hook audits of other subsystems.** Magic's cast lifecycle and the
  attendant/venue loop have the same missing-witness property; they are
  future siblings that will reuse this grammar, not this scope.
- **An event bus.** No `EventApi` topic for combat transitions —
  these are direct-consumer witness seams, not global cross-cutting
  streams (the established feedback rule: single-consumer seams use
  direct witness hooks / method calls).
- **New veto surfaces.** Combat's veto points already exist and stay
  where they are: the consent handshake (`CombatTerms`), attempt-time
  gambit gating (`CombatApi.eligibilityFor`), and the flee gate. v1
  ships witness + compute hooks only.
- Ranged/thrown, client panes, brain-system changes (the brain seam is
  already clean and untouched).
- **Defense-side compute** (a hook that modifies *mitigation* — reactive
  armor changing what the covering fold returns): that's intervening in
  the materials-response fold, not a combat seam. Named deferral.
- **The worn-gear augment chain** (a totem/ring shaping its wearer's
  strikes): v1 keeps the single-carrier rule (weapon, else the bare
  attacker). The multi-carrier chain over worn `CombatReactive` gear —
  ordered like the covering stack — is the named extension.
- **Ally-aura modifiers** (a banner buffing recovery): poise-math
  territory, the composure/`Sharpness` seam's sibling. Deferred.
  (`CombatApi.influence`'s `steady` covers the *instructed* support
  case; passive standing auras remain deferred.)
- **The material-affinity layer** (every silver item vs lycanthropes,
  material-keyed with no per-item mixin): the read-freely pattern
  covers the per-item form today (a hook reads its own material + the
  target's species and queues consequences); the universal layer is
  the named graduation target once 2–3 material dynamics exist in
  code — an `@authorable` affinity table or the materials-response
  tissue-as-construction deferral, whichever those consumers shape.
- **Battle-magic itself** (casting inside combat — `CastActivity` is
  interrupted by combat today, by design) and any spell consuming
  `CombatApi.influence`: the magic side of the bridge is the magic
  track's build; this build ships only the gated Api.

## Surface decisions

### The grammar is movement's, minus veto

Three hook kinds exist in the codebase (veto / witness / compute +
self-resolving scan). Combat already has its vetoes (terms,
eligibility, flee), so this build ships **witness hooks** (fire-and-
forget notifications) and **compute hooks** (the engine consults the
object and uses the result), at fixed, documented points of the beat
lifecycle. No new veto family.

### Instrument dynamics ride ONE marker mixin

The engine gets exactly one new branch per instrument scan point:
`MixinApi.isCombatReactive(item)` → call the hook. **`CombatReactiveMixin`**
(`lib/combat/`, `Mixins.CombatReactive`) is the hazard-precedent marker:
default no-op hook bodies so overriders compose via `super` (the
`onDestruct` no-op-terminal shape), one mixin the engine scans for,
every dynamic an override on the dynamic's own class. Rejected
alternative: duck-typed method-presence checks (the
`typeof obj.method === 'function'` antipattern) and per-dynamic
`MixinApi.isX` branches (the barnacle this build exists to kill).

### Participant and venue hooks follow the existing no-op / optional-hook precedents

- **Participant hooks live on `CombatantMixin`** as no-op terminals —
  every combatant already composes it, so no new marker is needed and
  NPC≈PC parity is structural.
- **Venue hooks are optional Location hooks** dispatched the way
  `traverse` dispatches `onEntered`/`onExited` on rooms today — present
  → called, absent → skipped. A reactive venue is a Location subclass
  (or future mixin) overriding them; no change to the `Location` base's
  behavior when unimplemented.

### The hook roster

**Instrument** (via `CombatReactiveMixin`):

| Hook | Kind | Fires |
|---|---|---|
| `onWielded` / `onUnwielded` | witness | at arming/disarming — completes the one-sided slot witness chain (`onSlotReleased` exists; the occupancy-side twin does not) |
| `augmentInflict(spec, ctx)` | compute | at `commitInflict`, on the striking instrument, before `ConditionApi.inflict` — returns the (possibly reshaped) `InflictSpec` (any non-`shock` `InsultKind` — the funnel's own vocabulary, heat/tearing included); riders/side-consequences go through the context (below) |
| `onStrikeResolved(ctx)` | witness | on the striking carrier after its exchange resolves, outcome included — a weapon hears its own land/whiff/parried (combo/momentum dynamics) |
| `onStruck(ctx)` | witness | on mitigating gear in the covering stack (shield/armor) when it takes an exchange's consequence |
| `onParry(ctx)` / `onBypassed(ctx)` | witness | at `decideOutcome`, on the guarding instrument |

**Participant** (no-op terminals on `CombatantMixin`):
`onSessionEntered(ctx)` (at open and join — auras, battle-cries),
`onExchangeResolved(ctx)`, `onPoiseBandChanged(ctx)`, `onDowned(ctx)`,
`onDefeated(ctx)`, `onDefeatedFoe(ctx)` (the victor-side twin — fires
on the named killer at resolution, after the victim's `onDefeated`;
on-kill dynamics), `onCoupBegun(ctx)`.

**Venue** (optional Location hooks): `onCombatOpened(ctx)`,
`onBloodDrawn(ctx)` (the existing `BeatIntensity` /
`CombatSession.bloodDrawn` transition — already computed, currently
unwitnessed), `onCombatResolved(ctx)`.

### Innate attacks share the instrument seam

When the striker is unarmed, the innate-attack path consults
`augmentInflict` on the **creature itself** (a `CombatReactive`
creature/species composition). A venomous bite and a poison blade are
the same abstraction with a different carrier.

### One context object; consequences are context-mediated

Every hook takes a single **`CombatHookContext`** (session, beat,
actor/target, gambit, outcome — the read surface the engine itself
uses) so signatures never churn as the engine evolves. Consequences
route through the **context's engine-mediated surface** — eight queue
methods, sized by the three coverage exercises below:

- `attachRider(spec, on?)` — a secondary `InflictSpec`;
- `afflict(condition, on?)` — an authored Condition;
- `introduceToxin(type, amount, on?)` — the bloodstream seam (the
  hazard dart's `Metabolic.introduceToxin`, funneled);
- `adjustReserve(key, delta, on?)` — a reserve drain/restore on either
  participant (lifesteal, smite, adrenaline — the magic Effect union's
  `adjust-reserve` precedent);
- `wearInstrument(on, amount)` — degrade the recipient's wielded gear
  through the `DurableMixin` condition gauge (the rust monster,
  durability play);
- `influence(instruction, on?)` — a `CombatInfluence` instruction
  (stagger/expose/steady) applied through the same economy as
  `CombatApi.influence` (a concussive maul staggers on hit — hooks and
  the external bridge speak one vocabulary);
- `deliverShock(source)` — the electrical delivery;
- `attachFlavor(line)` — a prose line the engine emits through the
  existing narration witness loop after the exchange's own beat (an
  item that whispers/taunts/flares — expressive dynamics without a
  hook-frame `MessageApi` bypass).

The `on?: 'attacker' | 'defender'` recipient (default `defender`) is
constrained to the exchange's own participants — thorn-mail-shaped
dynamics without opening arbitrary targeting. **Uniform drain rule:**
*every* dispatched context is drained — witness hooks carry
consequences too (a fear aura afflicts at `onSessionEntered`).
Consequences on *others* **never** execute in the hook frame;
**self-state mutation is sanctioned** — a hook freely mutates its own
host's state (combo counters, charge gauges, its own wear) directly,
under the determinism contract. Two reasons for the funnel: hooks
must not become a permission bypass (arbitrary mixin code acquiring
`ConditionApi.inflict`-caller standing — the git-workflow "never a
permission bypass" doctrine), and a single drain point keeps every
consequence inside the engine's determinism + accountability
bookkeeping. The Energized migration is the shaping consumer: its hook
requests the shock through the context; the context routes to
`ElectricityApi` from the engine's own frame.

### The coverage exercises sized the surface

The roster and consequence surface were validated across three rounds of
walking candidate dynamics (~40 total) through the seams on paper. Fits cleanly: flaming
blade (heat rider), stun baton, poise-reading rapier, session-hardening
shield (transient state keyed on `ctx.session` — the documented
pattern), gate-barring arena, crowd-reacting colosseum, venomous
innates. Fits *because of* the amendments this exercise produced: thorn
mail (recipient-targeted rider), venom blade (toxin consequence),
whispering/taunting items (flavor consequence), combo weapons
(`onStrikeResolved`), fear auras (`onSessionEntered` + uniform drain).
Deliberately does NOT fit (named deferrals, see Non-goals): dynamics
that modify *mitigation*, worn-gear offense chains, combat vetoes,
ally-aura recovery buffs.

**Round 2** (materials / shadows / instruction-injection / magic /
species) confirmed the shadow-enchantment composition and the
read-freely pattern (a hook reads any participant surface directly —
material, species, poise band — and only *consequences* are
context-mediated: the silver-edge-vs-lycanthrope dynamic is expressible
today), and produced the three scope expansions above: the influence
surface (the firebolt-can't-stagger gap), innate delivery parity (the
electric eel), and the species combat vocabulary (claw/claw/bite, ogre
reach, tail sweep). Deferred with named shapes: the material-affinity
layer, battle-magic, passive auras.

**Round 3** (concepts from NetHack / D&D / BioShock / Witcher / Hades /
Diablo / Mewgenics) audited the trigger × action matrix. Confirmed
working: the floating-eye counter (`afflict` on attacker), artifact
weapons (read-freely), Witcher oils (a consumable-attached timed
shadow), Hades boon stacking (the shadow chain — attach order is the
stacking order), and BioShock environmental combos (**already emergent**
— the electricity conduction walk + fire spread are shipped world
physics; a shock into a wet arena is a free AOE). Produced the last
four amendments: the `adjustReserve` / `wearInstrument` / `influence`
consequence kinds and the `onDefeatedFoe` victor witness. Documented
patterns: **deterministic procs** (every-Nth-hit combo counters,
threshold-conditional reads — never RNG; the poker-not-slots analog of
chance-on-hit) and **self-state mutation** (sanctioned in hooks).
Reinforced deferrals with named examples: Quen → defense-side compute;
corpse-explosion AOE → the geometry-free boundary (use hazards/the
environmental substrates); the sticky curse → the veto family; vorpal
instant-kill → correctly unrepresentable (the contest is the design).

**Demo content (optional, not acceptance-gating):** one or two real
`/obj/` items exercising the widest slice — e.g. a thorn mail
(`onStruck` + attacker-targeted rider + flavor) and a flaming blade
(heat rider + flavor + `onWielded`) — each with a gym cell.

### Hooks are deliberately shadowable — the enchantment substrate

Shadows intercept named methods dispatched through the security proxy;
every hook is exactly that. A temporary enchantment is a shadow over
`augmentInflict`; a curse is a shadow over a participant hook; detach
ends the effect — **zero new machinery**. Consequences: no hook is ever
marked `@Final`/`@Unshadowable`; a shadow body is bound by the same
determinism contract and the same context-mediated consequence rule;
the composition is proven by test and documented as the enchantment
story in combat-hooks.md. (Round-2 coverage: this is how
blessed/cursed/enchanted gear works without a `BUC` engine change.)

### The combat-influence surface

The question: can anything *outside* the engine push state instructions
into a live fight? Actor-intent injection already exists
(`CombatApi.queueGambit`/`defendAlly`/`disengage`/…), but session state
(poise, openings) is unreachable — a firebolt can wound but cannot
stagger, and under "Effect iff gated Api" no stagger spell can ever
exist until this surface does. Decision: a gated
**`CombatApi.influence(combatant, instruction)`** taking a closed
`CombatInfluence` union — v1 kinds **`stagger`** (banded poise
erosion), **`expose`** (open a timed opening window), **`steady`**
(recovery assist — the support twin). Returns `{ok, reason?}`;
`ok: false` when the target isn't in an active session. Instructions
route through the session's existing poise/opening economy (never a
parallel one), are deterministic, and are gated like every other combat
mutator. No consumer ships in this build — the magic/scripting
consumers are their own builds; this is the prerequisite Api.

### Innate delivery parity

The innate-attack path arms only mechanical channels today (the
electric-eel case is a code comment). Decision: a natural attack routes
through the **same delivery split as a weapon** — a shock innate
delivers electrically, a heat innate builds a heat spec, mechanical
innates unchanged. Acceptance example: an electric-eel-shaped creature
lands a shock innate.

### The species combat vocabulary

Three outcome-shaped extensions, all authorable `Species`/`BodyPlan`
data over existing engine vocabularies (no new gambit kinds — that
non-goal stands):

- **Multi-natural-attacks** — `Species.naturalAttacks[]` (authorable)
  supersedes the single `naturalAttackChannel` (which migrates as a
  one-entry fallback, byte-preserving current creatures — pinned).
  Attack variety manifests deterministically (rotation, never a roll).
- **Natural weapon profile** — innate reach/tempo derive from the body
  (`BodyPlan` mass/limb data) instead of defaulting: an ogre punches at
  ogre reach. Derivation constants chosen so current species' pinned
  matchups are byte-preserved.
- **Species-afforded gambits** — an authorable Species list affording
  *existing* gambit kinds (a tailed species affords `sweep`), merged
  into `eligibilityFor` alongside weapon-form affordances.

### The determinism contract is part of the `@hook` contract

Hooks are **synchronous, deterministic, and cheap**: no `await`, no
wall-clock, no randomness, bounded work per beat (they run inside the
real-time session tick). This is stated in each hook's `@hook` TSDoc
and enforced by the gym (below), not by a runtime guard.

### The lint: `check-combat-dynamics`

A `packages/server/scripts/check-combat-dynamics.ts` script (the
`check-inert-weapon` / `check-does-nothing` precedent — script, not
ESLint rule), CI-wired: inside `CombatLogic` (and the `lib/combat/`
engine modules), `MixinApi.is*` narrowing is restricted to an explicit
**physics allowlist** (`isSlotted`, `isConstructed`, `isVitals`,
`isEngaged`, `isWieldable`, `isCombatant`, `isCombatReactive`, … —
finalized during planning from the current call-site inventory). A new
dynamic predicate in the engine fails CI with a pointer to this
grammar. The engine branches on physics; dynamics come through hooks.

### Where the docs live

A new `docs/subsystems/combat-hooks.md` owns the choreography (the
seam-by-seam contract, the determinism rules, the graduation posture),
cross-referenced from combat.md and the CLAUDE.md doc map — combat.md
is already at the size limit of useful.

### Graduation posture (recorded, not scoped)

When two or three coded dynamics converge on a shape (e.g. several
`augmentInflict` overrides that just attach an authored Condition),
that shape graduates to a data-driven mixin with an `@authorable` field
— the magic-`Effect`-union path. The hook grammar is what makes that
fold cheap; this build deliberately does not pre-build any of them.

## Constraints

- **Byte-parity default.** With no `CombatReactive` gear present and no
  venue/participant overrides, every session is bit-for-bit identical
  to pre-hook combat. Gym-pinned (the formation default-preset
  precedent).
- **The Energized migration is byte-identical**, not merely
  behavior-equivalent: same shock, same ordering, same narration.
- **NPC≈PC parity**: every hook fires identically for brain-driven and
  player combatants (a gym invariant already; hooks must not fork it).
- **No new module categories.** The mixin lives in `lib/combat/`; the
  context object is a named value-object there; no free-floating helper
  modules (CLAUDE.md module taxonomy).
- **`@hook` authored once** on the canonical declaration; override
  sites match by name (the projection's existing rule).
- **Inter-Stuff contract**: hooks are methods — consistent by
  construction.
- **Accountability untouched**: hook-originated consequences flow
  through the same `ConditionApi.inflict` funnel, so trauma
  attribution, blame rows, and death causes need no new writers.
- The hook **grammar** carries no magnitudes of its own (dynamics bring
  their own dials). The scope expansions add exactly four dials —
  `combat.influence.*` (stagger light/heavy, steady restore) and
  `combat.natural.largeBodyMassKg` — magnitude-in-dials per doctrine.

## Acceptance criteria

- The full hook roster exists at the named call sites, each
  `@hook`-tagged, and `pnpm docs && pnpm docs:project` shows every seam
  in the author-surface **extension** tier.
- `MixinApi.isEnergized` no longer appears in `CombatLogic`;
  `EnergizedMixin` implements the instrument seam; a pinned gym run
  (stun-baton matchup) is byte-identical across the migration.
- A **test-fixture dynamic** (a test-only `CombatReactive` composition,
  not shipped content) proves each instrument hook fires at its seam,
  and a gym matrix cell running it proves hooked-session determinism
  (two runs, identical transcripts).
- Participant and venue hooks each have a test observing the witness
  fire (session entered, band change, downed, defeated, defeated-foe,
  coup begun; opened, blood drawn, resolved) at the correct lifecycle
  moment.
- `check-combat-dynamics` is CI-wired and red on a seeded violation
  (unit-tested like `check-inert-weapon`).
- A **shadow-composition test**: a shadow attached over a fixture
  weapon's `augmentInflict` reshapes the spec through proxy dispatch;
  detach restores baseline; the shadowed session stays deterministic.
- The round-3 consequence kinds each proven by a fixture: a lifesteal
  drain-and-restore (`adjustReserve` both directions), a rust-monster
  gear degrade (`wearInstrument`, inert bare-handed), a concussive
  stagger (`influence` — same result as the external call), and
  `onDefeatedFoe` firing on both the contest kill and the attrition
  kill.
- `CombatApi.influence` exists, gated, tested for all three kinds,
  `ok: false` outside an active session, deterministic under the gym,
  and routes through the existing poise/opening economy (no parallel
  state).
- An electric-eel-shaped test creature lands a **shock innate** through
  the same delivery split as a weapon.
- Species vocabulary: a multi-attack creature rotates attacks
  deterministically; a large-bodied test species fights at
  body-derived reach (gym cell); a tailed test species is eligible for
  `sweep` bare-handed; existing species (wolf) matchups are
  byte-preserved (pinned).
- `docs/subsystems/combat-hooks.md` exists; combat.md and the CLAUDE.md
  doc map cross-reference it.
- Existing combat suites and the gym parity/convergence/determinism
  matrices stay green.

## Cross-references

- Seed: the 2026-07 content-extensibility audit (this conversation; no
  slate file)
- [docs/subsystems/combat.md](../subsystems/combat.md) — the engine
  this grammar wraps
- [docs/subsystems/spatial.md](../subsystems/spatial.md) — the
  `Mobile.traverse` choreography (the model)
- [docs/subsystems/hazard.md](../subsystems/hazard.md) /
  [residency.md](../subsystems/residency.md) — "engine informs, object
  decides" / no-op-terminal + default-and-veto hook precedents
- [docs/subsystems/electricity.md](../subsystems/electricity.md) —
  `EnergizedMixin`, the migrating first consumer
- [docs/subsystems/call-security.md](../subsystems/call-security.md) —
  why consequences are context-mediated
- [docs/subsystems/materials-response.md](../subsystems/materials-response.md)
  — the CI-lint precedent (`check-does-nothing`)
- Future siblings (not in scope): magic-items slate (the data
  item-effect envelope), the vetted-brain catalog + `scripted-behavior`
  brain (authoring track)
