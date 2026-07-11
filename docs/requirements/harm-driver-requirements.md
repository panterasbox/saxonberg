# Harm driver — requirements

The harm driver is the first **injury** driver over the vitals
substrate: the piece that lets an external insult wound a body, makes
that wound progress or heal over game-time, and lets a wound kill.
Vitals ([vitals.md](../subsystems/vitals.md)) shipped the *models* — the
`Trauma` value, the anatomy, the death/consciousness seams, the
`TRAUMA_BEHAVIOR` table skeleton (every entry no-op) — and explicitly
parked the *behaviors*: "condition progression / the bleed tick, the
death-watcher driver, … the `inflict` producer seam." This build fills
in that parked wave. It is the fourth instance of the established driver
pattern (metabolism / thermal / respiration) and the keystone on the
combat critical path, but it **stands alone without any combat loop,
weapon, or armor**: a body becomes woundable by ordinary hazards, and a
non-combat **medic** loop (assess → treat, skill-gated) becomes playable
before combat exists.

Seeding material is scattered — there is no dedicated harm slate. It is
drawn from the vitals substrate's own labeled seams
([vitals.md § What's deferred](../subsystems/vitals.md) and
`lib/vitals/Condition.ts` / `Vitals.ts`), the driver precedent
([metabolism.md](../subsystems/metabolism.md),
[respiration.md](../subsystems/respiration.md)), and the downstream
consumer's expectations
([combat-slate.md](../slates/deferred-rpg/combat-slate.md) — the
`combat.body.trauma` bridge, the sentience-keyed severity spine).

## Goals

- **`inflict` producer.** A gated primitive `inflict(target, { mechanism,
  site, energy })` that builds a `Trauma` and lands it through the
  existing `afflict()` door. It is the single seam every harm source
  (this build's hazard, later combat, later environmental hazards) calls;
  combat reuses it unchanged.
- **Live trauma behavior.** The five closed `TraumaType` entries carry
  real behavior instead of no-op — with **laceration → bleed** as the
  flagship: a bleeding laceration drains `bloodVolume` on a recurring
  tick until dressed, healed, or lethal.
- **Wound progression & natural healing** over game-time, on
  `ScheduleApi.recurring` (re-armed on hydrate, never persisted), with
  the same presence-freeze (linkdead / far-past) the other drivers honor.
- **Death by wound.** A bleed that floors `bloodVolume` stamps its own
  cause and calls `applyDeath('exsanguination')`, reusing the seam
  metabolism and respiration already use — driving the existing
  consciousness readout (`conscious → unconscious → dead`) for free along
  the way.
- **Fracture impairs affordances.** A fracture at a `body.*` site greys
  the affordances that site's slot enables, via the existing
  `canOccupy` / slot machinery — the exact limb-impairment seam combat's
  affordance-recompute expects.
- **Assessment.** An `assess <target>` verb: a perception-gated readout
  of a body's condition band and wounds (full fidelity on self,
  perception-gated on others), with treater competence optionally
  sharpening detail.
- **Skill-gated treatment with a tangible dressing.** A `treat` / `bind`
  / `dress` surface whose outcome quality is fed by the treater's
  competence in an authored **medicine `Discipline`**. Dressing a bleed
  **consumes a dressing item** — any item bearing the `DressingMixin`
  capability (`Bandage` is the canonical concrete one; gauze / a clean rag
  could carry it too at lower quality). It sets the wound `dressed`,
  arresting the bleed; the item's dressing quality × the treater's
  competence grades the outcome (how fast it clots/heals, how well it
  holds). Treatment **mints an `ActSignature`** into the treater's
  Transcript. Treating wounds is a non-combat skill vertical — the "safe,
  repeatable advancement engine" applied to medicine.
- **The dressing is removable, and premature removal reopens the wound.**
  An `undress` / remove-dressing action takes the bandage off (the
  bandage is spent, not recovered). A wound removed **before it has
  clotted** (severity still above a clot threshold) starts bleeding
  again; once clotted it is safe to remove and continues healing to
  clear. This is how a player *knows* they're healed: `assess` a dressed
  wound reads "dressed / bleeding controlled" but **hides precise
  severity behind the dressing** (competence can judge through it);
  removing the dressing reveals the true state — safe if clotted,
  re-bleeding if not.
- **A live demonstrator hazard.** A sited **floor hazard** (broken glass)
  fires on movement/presence through the room and inflicts a laceration
  through `inflict` to a **foot** part — **gated by foot coverage**
  (barefoot cuts; any footwear protects in v1). Reachable in shipped
  content, it proves the full loop in-world: step on glass → bleed +
  limp → assess → treat-or-die.
- **A harm subsystem doc** at `docs/subsystems/harm.md`, cross-linked
  from vitals.md, documenting the driver and the `inflict` contract.

## Non-goals

- **Combat resolution.** No attack verbs, poise gauge, gambits, consent /
  terms handshake, blame ledger, `combat.body.*` events, or per-exchange
  offensive `ActSignature`. Those are the combat build
  ([combat-slate.md](../slates/deferred-rpg/combat-slate.md)); harm only
  provides the substrate combat writes *into* and the `inflict` door it
  calls.
- **Poise / session-scoped combat state.** Poise is combat's transient
  gauge and never touches the body; harm owns only lasting consequence.
- **The materials-response severity function.** v1 severity is
  **magnitude-only**: `mechanism` is *recorded* on the trauma but does
  not yet meet material resistance. "Damage type is explicitly not the
  model" — no `type → number` table. The
  `mechanism × material × construction` response function lands in
  [materials-response-slate.md](../slates/deferred-rpg/materials-response-slate.md)
  and slots in later as the severity function, reading the per-part
  tissue Materials already modeled.
- **The coverage *degree*.** v1 gates the hazard on a **binary
  coverage-presence** check (is the site covered by *any* worn item);
  the *degree* of mitigation — canvas vs. leather vs. steel-toe, thin
  soles a shard punches through, layered coverage, `SlotSpec.covers`
  curves — defers with materials-response. Coverage-presence is a
  boolean over existing embodiment machinery; it introduces no
  Construction/Material-resistance model.
- **Limb severing.** `avulsion` stays a recognized `TraumaType` but its
  part-promotion (marking a `BodyPart` missing, cascading slot-disable +
  presentation) defers; in v1 it behaves as a severe laceration.
- **Diagnostic instruments.** `assess` is a perception readout, not a
  tool-mediated measurement; stethoscope / measure-on-patient instruments
  stay deferred (vitals.md's "instruments" line).
- **New global events.** Harm flips the existing consciousness/death
  seams and stays event-free, exactly like the other drivers. No new
  world-events; combat's event layer is combat's build.
- **Disease / poison / affliction content, contagion, postmortem
  fidelity, reserve drain/replenish producers.** All remain deferred
  vitals applications.
- **The instrument and medicine first-aid branches.** Only the
  **dressing** branch (consumables) is built. Durable **instruments**
  (suture/splint/tourniquet — the fracture-setting path) and **medicines**
  (antiseptic/analgesic/antidote) are named seams, not built: no
  `DressingMixin` sibling mixins in v1; instruments will ride crafting's
  `ToolMixin`, medicines the bulk/metabolism substrate.
- **Fuller consumable-crafting / medical supply chain.** The `Bandage`
  is a simple authored consumable; sourcing it (crafting bandages,
  first-aid kits as containers, sterility/quality tiers) is not in scope —
  v1 stocks bandages as shipped content.
- **Metabolism-coupled healing.** v1 healing is a plain game-time
  severity decay; healing faster when fed/rested (the protein-healing
  vitals seam) stays deferred.

## Surface decisions

### The producer is `inflict`, gated, inflicter-from-context

`inflict(target, { mechanism, site, energy }) → outcome` builds a
`Trauma` and calls `afflict()`. It lives on a new **`HarmApi`** + a
**`HarmLogic`** logic singleton (the gated producer module category —
`inflict` is a powerful primitive that must not be callable by arbitrary
content). The **inflicter is derived from execution context**
(`getActingAuthor`-style), never a caller-supplied parameter — per the
gated-Api actor-from-context rule. This keeps attribution un-spoofable
and ready for combat's blame ledger without harm itself owning blame.

### Severity is magnitude-only; mechanism is a recorded tag

`energy` maps to `Trauma.severity` through a simple v1 magnitude
function. `mechanism` is stored on the trauma for the future but has **no
severity interaction yet** — the honest deferral of materials-response.
This is deliberately *not* a damage-type table (the antipattern
vitals.md names).

### Progression rides `ScheduleApi.recurring`, not engagement emission

Condition.ts is explicit: wound behavior targets `ScheduleApi.recurring`,
the handle is **not persisted** and is **re-armed on hydrate**. A
bleeding laceration arms a recurring tick that drains `bloodVolume`;
resolution (dressed / healed / dead) cancels it. This matches the
metabolism/thermal reconcile discipline, not respiration's
engagement-bound drain (harm is not an engagement the actor is "doing").

### Harm stamps its own death, reusing the seam

On a lethal floor, harm calls `setCauseOfDeath('exsanguination')` +
`setLifecycleState('dead')` via the same `applyDeath` shape metabolism
(`'starvation'`) and respiration (`'asphyxiation'`) use. There is **no
separate general "death-watcher"** — each driver stamps its own cause.
The derived `getConsciousness()` handles the `unconscious` waypoint for
free.

### Treatment is skill-gated; harm is the first non-combat advancement
consumer

Treatment outcome quality is graded by the treater's competence in an
authored **medicine `Discipline`** (a small Catalog addition, the Dave's
Bar seed precedent). Treatment acts mint `ActSignature` evidence into the
Transcript, gated by outcome — consuming the built advancement API,
reshaping nothing in it. A novice can stop a bleed poorly; an expert
treats cleanly. This makes a **medic a playable non-combat career**.

### First aid is a capability taxonomy; v1 builds the dressing branch

First-aid items fall in three mechanical classes: **dressings**
(consumable, spent on use — bandage/gauze/rag), **instruments** (durable,
wear-on-use — suture/splint/tourniquet), and **medicines** (substance,
applied/ingested — antiseptic/analgesic/antidote). v1 lights up **only
dressings**, via a new **`DressingMixin`** capability (in `lib/vitals/`,
registered in `Mixins`, narrowed by `MixinApi.isDressing`) carrying
`dressingQuality` + single-use. `Bandage` = `DressingMixin(Thing)` is the
first concrete item. `treat` gates on `MixinApi.isDressing`, **not**
`instanceof Bandage` — any dressing-capable item qualifies. The instrument
and medicine branches are named-but-deferred seams (instruments will ride
crafting's `ToolMixin` durable-good pattern; medicines the bulk/metabolism
substrate); no mixins for them in v1.

### The dressing is a tangible consumable with a clot gate

Dressing a bleed consumes a dressing item (a simple authored consumable —
applying it spends it via `StuffApi.destruct`; removing it does not
recover it) and sets the wound's `dressed` state, which suppresses the
bleed while the wound heals. The `Trauma` carries a **clot threshold** (a
`HARM_DEFAULTS` severity level): while dressed, severity decays; below
the threshold the wound has **clotted** (safe to remove). `undress`
clears `dressed` — and if severity is still **above** the clot threshold,
re-arms `bleeding` (the wound reopens). The bandage is modeled as a
consumable-into-state, **not** as a worn item occupying the wound's
coverage slot (which would entangle with the coverage-presence check and
the embodiment slot system) — a distinct apply/remove verb pair, not
`wear`/`remove`. Bare-handed care (with no bandage) may clean/reduce
severity but cannot durably arrest a bleed; a bandage is required for
that. Rates (clot threshold, dressed heal rate) live in `HARM_DEFAULTS`.

### `assess` is perception-gated, competence-sharpened

`assess <target>` reads the vitals condition surface through the
perception / recognition layer: full fidelity on one's own body, banded
and perception-gated on others (aligning with combat's "your own vitals
full fidelity / others perception-gated" rule). Treater competence may
sharpen the *detail* of the readout (novice: "bleeding badly"; expert:
site + severity), a light advancement consumer. A **dressed** wound reads
as "dressed / bleeding controlled" and **hides precise severity behind
the dressing** — a high-competence assessor can judge through it, but the
honest way to see whether it has clotted is to `undress` and look. This
is the loop that answers "how do I know I'm healed."

### The demonstrator is a movement-triggered floor hazard

A sited floor hazard (broken glass) in shipped content fires on a target
moving through / entering the room and inflicts a laceration through
`inflict` to a foot part — proving the flagship bleed loop live and
giving the medic something real to treat. The movement/presence trigger
(not "handle the object") is what makes coverage legible: your feet meet
the floor. It is a **one-off demonstrator room class** overriding the
`onEntered` hook — deliberately **not** a reusable `HazardMixin`: a
capability mixin buys nothing here (no multi-host reuse, no consumer
narrows on it, no composition), and the environment-harms-you space is
already claimed body-side by thermal/respiration. The reusable
abstraction is `inflict` itself; any hazard/trap taxonomy is a separate
future build over that seam. Constraints: it calls `inflict` (not
`afflict` directly), resolves a foot `site`, and is reachable in-world.

### Coverage is a binary presence check (degree deferred)

The hazard resolves the target's foot part and asks the existing
embodiment/slot machinery whether that part is covered by *any* worn
item (`SlotSpec.bodyPart` couples slot↔part). **Barefoot → exposed →
laceration lands; any footwear → covered → no cut.** This is a boolean,
not a mitigation curve — the *degree* of protection is materials-response
(see non-goals). The split mirrors severity: presence now, material
curve later. Including it keeps the demonstrator sensible (shoes must
matter) at near-zero cost.

### Laceration imposes a severity-gated locomotion penalty

Beyond the systemic bleed, a laceration at a locomotor site (a foot/leg)
imposes a **severity-gated locomotion penalty** — a limp: a traversal
endurance drain / speed penalty scaling with severity, composed in at the
existing `LocomotionApi` seam (the same seam encumbrance uses for its
locomotion veto + traversal drain; the move substrate stays agnostic).
This is distinct from fracture's affordance impairment: the bleed's limp
is a graded movement cost, not a slot-disable. It clears as the wound is
dressed/heals. (Chosen over keeping laceration systemic-only for
game-feel — a foot wound should hobble you — and because the penalty seam
already exists.)

### Per-type behavior roster (v1)

- **laceration** — flagship: `onset` sets `bleeding`; `tick` drains
  `bloodVolume` while bleeding-and-undressed and decays severity while
  dressed; `dress` (consumes a bandage) sets `dressed`, arrests bleed;
  `undress` clears `dressed` and re-arms `bleeding` iff severity is still
  above the clot threshold; the wound clears when severity reaches zero.
  At a locomotor site, also imposes a severity-gated locomotion penalty
  (the limp) via the `LocomotionApi` seam, cleared on dress/heal.
- **contusion** — mild, self-resolving over time; no bleed.
- **fracture** — impairs the site's affordances via `canOccupy`/slot;
  slow natural heal.
- **burn** — real behavior (severity, pain/impair, slow heal). Wiring a
  *live* burn producer is optional/opportunistic (the existing thermal
  scalding `burn` hook is a cheap second producer); the required live
  producer is the sharp hazard.
- **avulsion** — behaves as a severe laceration; limb-severing deferred.

## Constraints

- **No stored health scalar.** All readouts stay derived every call
  (vitals' load-bearing rule); harm adds trauma to the derived picture,
  never a cached HP.
- **Presence-freeze parity.** Linkdead / far-past gaps integrate nothing
  and re-stamp, exactly as metabolism/respiration/thermal do — zero work
  for absent players.
- **Rates in a `*_DEFAULTS` const-object**, playtest-tuned, not plan
  decisions or engine invariants (the driver convention).
- **Go through the Api layer.** Wounds are added via `HarmApi.inflict`
  (which calls `afflict()` internally); nothing outside constructs a
  `Trauma` and calls `afflict()` directly. Death via the `applyDeath`
  seam, not a raw `setLifecycleState`.
- **Module categories.** New surface fits the fixed taxonomy: `HarmApi`
  (`api/harm.ts`) + `HarmLogic` (`obj/api/HarmLogic.ts`); trauma behavior
  stays in `lib/vitals/Condition.ts`; verbs are YAML view + controller in
  the perception category (`assess`) and a treatment category; the
  medicine `Discipline` is authored Catalog data; `DressingMixin` is a
  capability mixin in `lib/vitals/` (registered in `Mixins`, predicate
  `MixinApi.isDressing`); `Bandage` = `DressingMixin(Thing)` is concrete
  content at `/obj/Bandage.ts`; the demonstrator is a **one-off room
  class** in the domain area (`domain/<area>/`, the `domain/lounge/`
  precedent) overriding `onEntered` — **no new mixin**. No free-floating
  helpers.
- **`TraumaType` stays closed-but-extensible** — grow additively; no open
  string union.
- **Locomotion and coverage compose over existing seams.** The limp
  rides the `LocomotionApi` penalty seam (move substrate stays agnostic,
  as with encumbrance); coverage-presence is a read over the existing
  embodiment/slot machinery. Neither introduces a new subsystem nor
  pulls materials-response forward.
- **Combat forward-compat.** The `inflict` signature and the trauma
  behaviors must satisfy what `combat.body.trauma` will need (inflicter,
  mechanism, site, severity, first-blood detectability, limb-impair
  affordance recompute) so combat wraps this surface without reshaping
  it.

## Acceptance criteria

- `HarmApi.inflict(target, { mechanism, site, energy })` exists, is
  gated, derives the inflicter from context, and produces a `Trauma`
  afflicted on the target. Tests cover a rejected un-gated call.
- A bleeding laceration drains `bloodVolume` on a recurring tick;
  untreated to the floor, the target dies with cause
  `'exsanguination'`, passing through `unconscious` first. Tests cover
  the full bleed→death path and the presence-freeze (no drain while
  linkdead / across a far-past gap).
- The recurring tick handle is not persisted and is re-armed on hydrate
  (test: a re-loaded bleeding body resumes draining).
- A fracture at a site impairs that site's slot-enabled affordances;
  clearing/healing it restores them. Test covers the impair + restore.
- `assess <target>` returns a perception-gated condition/wound readout —
  full on self, gated on others. Test covers the self-vs-other fidelity
  split.
- `treat`/`bind`/`dress` consumes a dressing item (gated by
  `MixinApi.isDressing`, not `instanceof Bandage`; `Bandage` is the test
  item), sets the wound `dressed` and arrests the bleed, with quality
  graded by dressing quality × the treater's medicine competence, and
  mints an `ActSignature` into the treater's Transcript. Tests cover: the
  dressing item is consumed; a low-vs-high competence outcome difference;
  the Transcript write.
- **Dressing removal + clot gate:** `undress` on a wound still above the
  clot threshold re-arms `bleeding` (reopens); on a clotted wound it is
  safe and the wound continues healing to clear. A dressed wound heals to
  zero severity and auto-clears from the conditions. Tests cover the
  premature-removal reopen, the safe-removal-after-clot, and the
  heal-to-clear.
- **Dressed wounds hide detail in `assess`:** a dressed wound's precise
  severity is gated behind the dressing (revealed on `undress` or to a
  high-competence assessor). Test covers the dressed-vs-undressed readout
  difference.
- The demonstrator floor hazard inflicts a laceration through `inflict`
  when a barefoot target moves through the room, reachable in shipped
  content; an integration test drives step → bleed → treat → arrested
  and step → bleed → (untreated) → death.
- **Coverage gate:** a barefoot target is cut; a shod target (foot slot
  occupied by any worn item) is not. Test covers both.
- **Limp:** an active foot laceration imposes a severity-gated
  locomotion penalty via the `LocomotionApi` seam that scales with
  severity and clears on dress/heal. Test covers the penalty applied and
  cleared.
- `contusion`, `burn`, and `avulsion` carry non-no-op behavior;
  `avulsion` behaves as a severe laceration (sever deferred, documented).
- `docs/subsystems/harm.md` exists, documents the `inflict` contract and
  the driver, and is cross-linked from `vitals.md`; the deferred
  materials-response severity seam and the deferred avulsion sever are
  named at their sites.

## Cross-references

- Seeding seams: [vitals.md](../subsystems/vitals.md) (the parked
  `inflict` seam, Trauma, anatomy, death/consciousness seams),
  `lib/vitals/Condition.ts` + `lib/vitals/Vitals.ts` (the surfaces this
  build fills in).
- Driver precedent: [metabolism.md](../subsystems/metabolism.md),
  [respiration.md](../subsystems/respiration.md),
  [thermal.md](../subsystems/thermal.md) (reconcile-on-read, death seam,
  presence-freeze, `*_DEFAULTS`).
- Skill-gated treatment: [advancement.md](../subsystems/advancement.md)
  (`Discipline` Catalog, Transcript, `ActSignature`, competence bands).
- Assessment gating: [perception.md](../subsystems/perception.md),
  [belief.md](../subsystems/belief.md) (viewer-aware, perception-gated
  readouts).
- Scheduling: [activity.md](../subsystems/activity.md)
  (`ScheduleApi.recurring`).
- The limp + coverage couplings:
  [locomotion.md](../subsystems/locomotion.md) /
  [encumbrance.md](../subsystems/encumbrance.md) (the `LocomotionApi`
  penalty seam the limp rides) and
  [embodiment.md](../subsystems/embodiment.md) /
  [slot.md](../subsystems/slot.md) (the worn-coverage presence check).
- Downstream consumer: [combat-slate.md](../slates/deferred-rpg/combat-slate.md)
  (the `combat.body.trauma` bridge, sentience-keyed severity, the
  affordance-recompute expectation) — harm provides the substrate; combat
  is a later build.
- Deferred severity function:
  [materials-response-slate.md](../slates/deferred-rpg/materials-response-slate.md).
- Gated-Api rule: project memory — gated APIs derive the acting principal
  from context, never a parameter.
