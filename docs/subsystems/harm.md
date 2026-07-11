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

## The `inflict` producer

`HarmApi.inflict(target, { mechanism, site, energy }) → InflictOutcome`
(`api/harm.ts` → the gated `HarmLogic` singleton at `/obj/api/harm`) is the
**single seam every harm source calls** — this build's floor-glass hazard,
and later combat. It builds a `Trauma`, lands it through the existing
`VitalsMixin.afflict()` door, runs the trauma's `onset`, and arms the
recurring wound-tick.

- **Gated producer.** `inflict` is a powerful primitive that must not be
  callable by arbitrary content. `HarmLogic.inflict` carries
  `@CallSecurity(FromModule('/api/harm#HarmApi'))` — only the `HarmApi`
  facade forwards in; trusted producers (the hazard, later combat) reach it
  through the Api. The inflicter is un-spoofable, so `HarmApi.inflict`
  itself stays reachable (the `BulletinApi`/`ProvenanceApi` precedent).
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

## The wound-tick driver

A recurring `ScheduleApi.recurring(HARM_DEFAULTS.TICK_INTERVAL_MS, …)` on
`HarmLogic`, armed per-body by `inflict`. The **drain is computed in
game-time** (`WorldClockApi.getNow()`), so it freezes with a paused clock
and honors presence — the tick fires on a real timer, but integrates only
game-time elapsed.

- **Presence-freeze parity.** The per-fire integration copies
  `Metabolic.reconcileMetabolism` verbatim: first-touch stamp, linkdead
  re-stamp (`isHasInteractive && isLinkdead`), `elapsed <= 0` guard, and
  the far-past guard (`MAX_REASONABLE_GAP_SEC`, 4h — a logout/relog gap
  integrates nothing). Zero work for absent players.
- **The handle is NEVER persisted.** It lives in an in-memory
  `Map<stuffId, {handle, stamp}>` on the singleton (keyed on the live
  `stuffId`, unique per instance). The *bleeding trauma* persists (in
  `VitalsMixin.conditions`); the tick handle does not.
- **Re-arm on hydrate.** A body coming live re-arms via
  `HarmApi.rearmWoundTicks(host)` (idempotent, no-op without active
  trauma), called from `Avatar.enter()` (players) and `NPC.postRegister`
  (NPCs). A bare `Creature`/`Character` without `PostRegistrationMixin`
  won't auto-re-arm — a documented degenerate; the proof body is an Avatar.
- **Death by exsanguination.** After ticking, if `bloodVolume` is at/below
  its `survivableMin`, harm stamps its own death —
  `setCauseOfDeath('exsanguination')` + `setLifecycleState('dead')`
  (idempotent-guarded, the metabolism/respiration shape; there is **no**
  shared `applyDeath` helper) — and cancels the tick. The
  `conscious → unconscious` waypoint needs no code: `getConsciousness()`
  already reads a low `bloodVolume` as `unconscious`.

## The couplings — limp + coverage

- **The limp** (`Vitals.drainForLimp`) is a severity-gated `endurance`
  drain summed over active locomotor (`body.leg.*`, incl. `.foot`)
  laceration/avulsion wounds, composed in at
  `LocomotionLogic.engageAround` alongside the encumbrance drain — the
  universal self-powered traverse chokepoint. Conveyance riders and
  raw/forceMove traverses skip it structurally. Eases as the wound heals.
  Distinct from fracture's slot-disable (that's a read; this is a movement
  cost).
- **Coverage-presence** (`HarmApi.isSiteCovered(host, partKey)`) is a
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
  dressing (`StuffApi.destruct`), calling the trauma's `resolve` (sets
  `dressed`, arrests the bleed), and re-arming the tick so the dressed
  wound heals to clear. Outcome quality = the dressing's `dressingQuality`
  × the treater's `medicine` competence band; difficulty is derived from
  the wound (a world-measurement, not a tag). A graded outcome mints an
  `ActSignature` (`AdvancementApi.recordDeed`) into the treater's
  Transcript — consuming the advancement API, reshaping nothing in it.
- **`undress`** (a distinct verb from the wearable-slot `remove`) is the
  clot gate's other half: calls `reopen` (a premature removal above
  `CLOT_SEVERITY` re-arms the bleed; after clot it is safe) and re-arms the
  tick. The bandage is spent, not recovered.
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
`HarmApi.isSiteCovered`, and cut a barefoot foot through `inflict` (never
`afflict` directly). Config (mechanism / energy / foot sites) is class
constants. Reachable in shipped content — a walkable `west` exit from
Dave's Bar (`seeds/domain/lounge/glass-alley.yaml`), with two `Bandage`s
stocked so the treat loop is playable in-world. Proves the full loop: step
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
