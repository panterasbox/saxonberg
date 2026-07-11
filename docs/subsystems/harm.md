# Harm

The **injury driver** over the [vitals](./vitals.md) substrate: the piece
that lets an external insult wound a body, makes that wound progress or
heal over game-time, and lets a wound kill. Vitals shipped the *models*
(the `Trauma` value, the anatomy, the death/consciousness seams, the
`TRAUMA_BEHAVIOR` table skeleton with every entry no-op); harm fills in the
parked *behaviors*. It is the fourth instance of the established driver
pattern ([metabolism](./metabolism.md) / [thermal](./thermal.md) /
[respiration](./respiration.md)) and the keystone on the combat critical
path, but it **stands alone without any combat loop, weapon, or armor**: a
body becomes woundable by ordinary hazards, and a non-combat **medic** loop
(assess → treat, skill-gated) is playable before combat exists.

## `ConditionApi` — the condition-surface facade

The gated facade over the whole vitals **condition** surface — inflicted
trauma + afflictions, the one home for inflicted status effects on a body
(`api/condition.ts` → the gated `ConditionLogic` singleton at
`/obj/api/condition`). Reserves (endurance) and transient combat flags are
NOT conditions and stay out. Beyond the `inflict` producer (below) it
forwards the plain condition mutators — `afflict(target, condition)` /
`relieve(target, condition)` — and a query `conditionsOf(target)`, each a
thin gated pass-through to the body's own `VitalsMixin` method (a no-op /
empty for a non-`Vitals` target). It is deliberately **bounded**: internal
drivers (metabolism, respiration) keep calling the body methods directly;
the Api ADDS a facade, it does not re-route them.

## The `inflict` producer

`ConditionApi.inflict(target, { mechanism, site, energy }) → InflictOutcome`
is the **single seam every harm source calls** — this build's floor-glass
hazard, and later combat. It builds a `Trauma`, lands it through the
existing `VitalsMixin.afflict()` door, runs the trauma's `onset`, and stamps
the reconcile-on-read `tickedAt` anchor (see below — no arming).

- **Gated producer.** `inflict` is a powerful primitive that must not be
  callable by arbitrary content. `ConditionLogic.inflict` carries
  `@CallSecurity(FromModule('/api/condition#ConditionApi'))` — only the
  `ConditionApi` facade forwards in; trusted producers (the hazard, later
  combat) reach it through the Api. The inflicter is un-spoofable, so
  `ConditionApi.inflict` itself stays reachable (the
  `BulletinApi`/`ProvenanceApi` precedent).
- **Inflicter from context.** The inflicter's durable `templatePath` is
  derived from `ExecutionContextApi.getActingAuthor()` (command-frame giver
  when non-forced + single-consistent, else the REST acting-author stamp,
  else `undefined`) — **never a caller-supplied parameter** (the gated-Api
  actor-from-context rule). Recorded on `Trauma.inflictedBy` for combat's
  future blame ledger; harm records attribution without owning blame.
- **Severity is magnitude-only.** `energy → severity` through a v1 linear
  dial (`HARM_DEFAULTS.SEVERITY_PER_ENERGY`). `mechanism` is the physical
  vocabulary (`sharp`/`blunt`/`crushing`/`thermal`/`tearing`), mapped
  bijectively to `TraumaType` by a small switch (sharp→laceration,
  blunt→contusion, crushing→fracture, thermal→burn, tearing→avulsion) and
  **recorded raw on `Trauma.mechanism`** — but it does **NOT modulate
  severity yet**. This is deliberately *not* a `type → number` damage-type
  table (the antipattern vitals.md names). ► **Deferred seam — the
  materials-response severity function** (`mechanism × material ×
  construction`, reading the per-part tissue Materials) slots in later at
  the `severityFromEnergy` site.

## The five trauma behaviors

Live in `lib/vitals/Condition.ts`, co-located with the `Trauma` value in
the closed `TRAUMA_BEHAVIOR: Record<TraumaType, TraumaBehavior>` roster.
The interface is `onset` / `tick(host, t, elapsedSec)` / `resolve` (the
*dress* action) / `reopen` (the *undress* action) / `describe`. Rates live
in the `HARM_DEFAULTS` const-object (the driver `*_DEFAULTS` convention).

- **laceration** (flagship) — `onset` opens the bleed (`bleeding = true`);
  `tick` while bleeding-and-undressed drains `bloodVolume`
  (`BLEED_PER_SEC · severity · elapsedSec`; an open bleed does **not**
  self-clot — you must dress it), and once dressed OR clotted-open decays
  severity toward clear (fast while `dressed`, slow otherwise). The **clot
  gate**: `resolve` (dress) sets `dressed`, arrests the bleed; `reopen`
  (undress) clears `dressed` and re-arms `bleeding` iff `severity >
  HARM_DEFAULTS.CLOT_SEVERITY` (below it the wound has clotted, safe to
  remove). The gate is a pure boolean-flag machine on the `Trauma` value —
  no dependency on the `DressingMixin`, the `Bandage`, or the verbs (those
  are the consumers that call `resolve`/`reopen`).
- **contusion** — mild, self-resolving severity decay; no bleed.
- **fracture** — a slow natural heal. **The impairment is a derived read**,
  not a tick effect: `Vitals.isSlotImpairedByTrauma(slot)` folds into
  `Slotted.canOccupy` alongside the anatomy gate, so a fracture at a slot's
  `bodyPart` above `FRACTURE_IMPAIR_SEVERITY` greys that slot's
  affordances — and healing/clearing the fracture restores them with no
  separate un-impair step.
- **burn** — real behavior: severity + a slow heal at its own rate.
- **avulsion** — behaves as a **severe laceration** (floors severity via
  `AVULSION_SEVERITY_FLOOR`, bleeds, shares the clot gate). ► **Deferred
  seam — the limb-sever / part-promotion** (mark the `BodyPart` missing,
  cascade slot-disable + presentation) lands at `AVULSION_BEHAVIOR.onset`
  when the sever build arrives; v1 stops at the severe bleed.

## The wound driver — reconcile-on-read

Wound progression is **reconcile-on-read**, exactly like its sibling
drivers (`Metabolic.reconcileMetabolism` / `ThermalRegulation` /
`Respiration`) — **not** a recurring push tick. There is **no
`ScheduleApi.recurring`, no in-memory tick-handle map, and no re-arm
seam**. The driver lives on the body itself:
`VitalsMixin.reconcileConditions()`, a private method run at the top of the
reads that must reflect the current bleed — `getVitalSign('bloodVolume')`,
`getConditionBand`, `getConsciousness`, `getConditions`.

- **The stamp persists, not a handle.** Each active `Trauma` carries a
  persisted game-time `tickedAt` anchor (rides the `VitalsMixin.conditions`
  collection). `inflict` stamps it at onset; every read advances it. A body
  coming live simply resumes from its last stamp on the next read — nothing
  to re-arm, no `Avatar.enter` / `NPC.postRegister` touch. (The old
  `HarmApi.rearmWoundTicks` seam is **gone**; `NPC` reverts to the bare
  `BehavedMixin` `postRegister`.)
- **Per-trauma integration.** For each active trauma,
  `reconcileConditions` computes the in-session game-time elapsed since its
  `tickedAt`, calls `TRAUMA_BEHAVIOR[t.type].tick(host, t, elapsedSec)`,
  then relieves any wound healed to (near) zero severity and re-stamps.
- **Presence-freeze parity.** The integration copies the
  `reconcileMetabolism` discipline: first-touch stamp, linkdead re-stamp
  (`isHasInteractive && isLinkdead`), `elapsed <= 0` guard, and the
  far-past guard (`MAX_REASONABLE_GAP_SEC`, 4h — a logout/relog gap
  integrates nothing). Cheap no-op when no world clock runs (unit tests
  stay idle) or no trauma is active. A `_reconcilingConditions` reentrancy
  guard keeps the vital-sign reads the method performs from re-triggering
  it.
- **Death by exsanguination.** After integrating, if `bloodVolume` is
  at/below its `survivableMin`, harm stamps its own death —
  `setCauseOfDeath('exsanguination')` + `setLifecycleState('dead')`
  (idempotent-guarded, the metabolism/respiration shape; there is **no**
  shared `applyDeath` helper). The `conscious → unconscious` waypoint needs
  no code: `getConsciousness()` already reads a low `bloodVolume` as
  `unconscious`.

## The couplings — limp + coverage

- **The limp** (`Vitals.drainForLimp`) is a severity-gated `endurance`
  drain summed over active locomotor (`body.leg.*`, incl. `.foot`)
  laceration/avulsion wounds, composed in at
  `LocomotionLogic.engageAround` alongside the encumbrance drain — the
  universal self-powered traverse chokepoint. Conveyance riders and
  raw/forceMove traverses skip it structurally. Eases as the wound heals.
  Distinct from fracture's slot-disable (that's a read; this is a movement
  cost).
- **Coverage-presence** (`ConditionApi.isSiteCovered(host, partKey)`) is a
  **binary** read: resolves the body plan's `getSlotsCovering(partKey)`
  (the `covers` edge — NOT `bodyPart`; the `feet` slot couples to the foot
  parts via `covers`) and returns true iff a covering slot holds a worn
  (`Wearable`) occupant. No materials / degree — the mitigation *curve*
  defers with materials-response.

## The medic vertical

Harm is the **first non-combat advancement consumer**. A new `medical`
command category plus `assess` in `perception`.

- **Dressing is a capability, not a class.** `DressingMixin` (`lib/vitals/`,
  `Mixins.Dressing` + `MixinApi.isDressing`, the `ToolMixin` pattern)
  carries a 0..1 `dressingQuality` and is **single-use**. `Bandage =
  DressingMixin(Thing)` (`obj/Bandage.ts`, the `Coin`/`BrandedBottle`
  precedent) is the canonical concrete one; any dressing-capable item
  (gauze, a rag) qualifies. `treat`/`undress` gate on `isDressing`, **never
  `instanceof Bandage`**. The instrument (splint/suture → `ToolMixin`) and
  medicine (→ bulk/metabolism) first-aid branches are named-but-deferred
  seams — no sibling mixins in v1.
- **`treat` / `bind` / `dress`** (`cmd/medical/`, `mustHaveDressing`
  validator) dresses a body's worst bleeding wound, consuming a reachable
  dressing (`StuffApi.destruct`) and calling the trauma's `resolve` (sets
  `dressed`, arrests the bleed); the dressed wound heals to clear on the
  next read (reconcile-on-read — no tick to re-arm). Outcome quality = the
  dressing's `dressingQuality`
  × the treater's `medicine` competence band; difficulty is derived from
  the wound (a world-measurement, not a tag). A graded outcome mints an
  `ActSignature` (`AdvancementApi.recordDeed`) into the treater's
  Transcript — consuming the advancement API, reshaping nothing in it.
- **`undress`** (a distinct verb from the wearable-slot `remove`) is the
  clot gate's other half: calls `reopen` (a premature removal above
  `CLOT_SEVERITY` re-opens the bleed; after clot it is safe). A re-opened
  bleed drains again on the next read (reconcile-on-read — no tick to
  re-arm). The bandage is spent, not recovered.
- **`assess`** (`cmd/perception/`) is a perception-gated readout, not a
  tool-mediated measurement (no stethoscope — deferred). Full fidelity on
  one's own body; banded + competence-sharpened on others (novice reads
  the qualitative gist, proficient+ reads precise severity). A **dressed**
  wound reads "bleeding controlled" and **hides precise severity behind the
  dressing** — an expert can judge through it, else `undress` and look.
  This is the loop that answers "how do I know I'm healed."
- **medicine `Discipline`** — an authored Catalog leaf
  (`seeds/lib/advancement/Discipline/medicine.yaml`, `key: medicine`,
  ISCED-F `0913`).

## The demonstrator — GlassAlley

A **one-off demonstrator room class** (`domain/lounge/GlassAlley`),
deliberately **NOT a reusable `HazardMixin`** — a capability mixin buys
nothing here (no multi-host reuse, no consumer narrows on it, no
composition; the reusable abstraction is `inflict` itself). It overrides
`onEntered(mover, exit)` (the `Mobile.traverse` presence trigger — NOT a
teleport arrival): resolve a foot site from the mover's own anatomy (a
non-biped matches none → graceful no cut), gate on
`ConditionApi.isSiteCovered`, and cut a barefoot foot through `inflict`
(never `afflict` directly). Config (mechanism / energy / foot sites) is
class constants. Reachable in shipped content — a walkable `down` exit (a
service stair) off the **Terminus Terminal hall**
(`seeds/domain/terminus/terminal/hall.yaml` → `/domain/lounge/glass-alley`,
which declares its own `up` back-exit), with two `Bandage`s stocked so the
treat loop is playable in-world. Proves the full loop: step
on glass → bleed + limp → assess → treat-or-die. A real hazard/trap
taxonomy is a separate future build over the same seam.

## Deferred (named seams)

- **Materials-response severity function** — mechanism × material ×
  construction, at the `severityFromEnergy` site
  ([materials-response-slate.md](../slates/deferred-rpg/materials-response-slate.md)).
- **Coverage degree** — the mitigation curve (canvas vs. leather vs.
  steel-toe); v1 is binary presence.
- **Avulsion sever / part-promotion** — at `AVULSION_BEHAVIOR.onset`.
- **Combat resolution** — attack verbs, poise, blame ledger,
  `combat.body.*` events, offensive `ActSignature`
  ([combat-slate.md](../slates/deferred-rpg/combat-slate.md)); harm
  provides the substrate combat writes into and the `inflict` door it
  calls.
- **Instrument + medicine first-aid branches**, fuller consumable-crafting
  supply chain, metabolism-coupled healing.

## Cross-references

- [vitals.md](./vitals.md) — the substrate: `Trauma`, anatomy, the
  death/consciousness seams harm drives
- [metabolism.md](./metabolism.md) / [respiration.md](./respiration.md) /
  [thermal.md](./thermal.md) — the driver precedent (reconcile,
  presence-freeze, death seam, `*_DEFAULTS`)
- [advancement.md](./advancement.md) — the `Discipline` / Transcript /
  `ActSignature` the medic vertical consumes
- [locomotion.md](./locomotion.md) / [encumbrance.md](./encumbrance.md) —
  the `LocomotionApi` seam the limp rides
- [slot.md](./slot.md) / [embodiment.md](./embodiment.md) — the worn-
  coverage presence check
- [combat-slate.md](../slates/deferred-rpg/combat-slate.md) — the
  downstream consumer
