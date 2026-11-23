# Body

**A body is its modules, and what it can do follows from what it has.**
The organism-biology build (MR !652, 2026-11) replaced the authored body
plan — a parts list, a ports list, a breathing table, a yield table — with
**body-module documents** composed into a `Body`, and moved every capacity
a species used to declare onto the parts that have it.

Related: [race.md](./race.md) (materials, clades, species), [vitals.md](./vitals.md)
(the body's state), [harm.md](./harm.md) (wounds, the sever, `operate`),
[butchery.md](./butchery.md), [taps.md](./taps.md), [thermal.md](./thermal.md),
[respiration.md](./respiration.md), [senses.md](./senses.md),
[sericulture.md](./sericulture.md).

## Modules and the `Body`

- A **body-module** is a document (`<pack root>/body-modules/<name>`,
  the `body-module` kind): a subtree of parts with RELATIVE keys (`''` is
  the instance's own key), each part's tissues as weights, and — on the
  part — what it is for: `governs` (one brain: MIN), `serves` (two legs:
  MEAN), `sustains` (two kidneys: MAX), `produces` (a gland's tap),
  `gait`, `fill`, `integument`, `regrows`, `breathes`, `senses`. A module
  may also carry its `integument` and its carcass map (`comesOffAs`).
- A **plan** is a list of module instances: `{ module, as: [keys], at,
  innervatedBy?, suppliedBy? }`. `extends:` inherits a plan's list.
- `Body` (lib/species) is the expansion — a value object built by
  `BodyPlan.getBody()` / `bodyWith(deltas)`. Tissue weights become
  **shares of the whole body** that sum to 1 (`lint:anatomy` builds every
  plan and checks it), so one plan serves a canary and an ox.
- Every anatomy question is asked of the body: `Organism.getBody()` →
  `Species.bodyFor(variant)`.

## Variants: sex, castration, stage — and development

- `Species.variants`: `sex.<sex>`, `neutered`, `stage.<stage>`. A form
  overrides the species' own fields BY THEIR NAMES (`commonNames`,
  `biddability`, `handlingRange`, `massFactor`) and adds body deltas
  (`add` a module — an udder, gonads; `scale` — a calf's big head;
  `integument`). Names are read late, so a calf grows into a cow and a
  steer into an ox with nothing re-stamped.
- **Neutered is derived**: male, the `gonads` part lost before
  `matureAt` (`Vitals.partLostAt`). Castration is an operation
  ([harm.md](./harm.md)).
- **Development** (D10): `Species.development` names a plan per life
  stage (`{ plan, massFactor? }`); `planFor(stage)` builds the stage's
  body. The bullfrog is a tadpole, a froglet and a frog; the silkworm a
  larva, a pupa and a moth. `VitalsMixin.reconcileForm` (inside the
  conditions reconcile) carries the body's state across a change of plan:
  deltas on parts the new body lacks go with them, a wound on one passes
  to its nearest kept ancestor, a slot the new plan lacks lets go, the room
  is told. Same object, same identity.

## The body's state: the delta

`VitalsMixin.bodyPartDeltas` records what happened to THIS body: a part
`missing` (with `lostAtAgeDays`, `sealed` by heat or corrosion), its own
wounds. The sever (`ConditionApi.sever`) takes a part and its subtree,
lets go of what its slots held, and mints the part as a thing (a corpse of
its subtree). A part that `regrows: moult` comes back at the species'
moult unless sealed. A row may author `lostParts` (an ox) — seeded through
the delta half, never a sever.

## What the parts give

| capacity | from | read by |
|---|---|---|
| armor, insulation, a coat with a year | `integument` (skin / under / coat; a coat may follow a tap and a `cycle`) | harm, thermal, butchery |
| a tap | a gland's `produces`, `activeIn` a condition | taps, ranching |
| breathing | `breathes: [{ medium, apparatus, intake, volumeL? }]` | respiration (`Body.breathing`) |
| the senses | `senses: [{ modality, media?, watchDeg? }]` | perception (`Body.modalitiesIn`) |
| what comes off | the module's `comesOffAs` | butchery (`Species.dressOut`) |
| gaits | `gait` | locomotion |

⚠ An **unmodelled** body (a plan with no parts) breathes air as a person
does; a body with parts breathes only from its organs.

## Seasons: phenology

`Species.phenology` is a schedule of conditions — `in-season`, `rut`,
`lactating`, `laying`, `denning` — each with a trigger (a daylength band
or the species' `breeding` season, a core temperature, sex, stage at or
past, `entire`, or `event: true`, which only an act brings on).
`VitalsMixin.reconcilePhenology` carries and relieves them from one place,
the thermal reconcile, never a read. See [thermal.md](./thermal.md) and
[taps.md](./taps.md).

## Honesty: `lint:scaling`

Every species with a tissue-bearing body is read against four
square-cube limits (bone, diffusion, flight, heat); one over a limit
says what pays for it (`Species.pays`, shown on the dossier). Ceiling 0.
Never a runtime refusal. See [lint-family.md](../lint-family.md).

## A new animal is rows

The sperm whale (`trade-fishing`): a `cetacean` plan from four modules,
the species, a `Beast` agent, the things it comes off as, and a render
recipe — no source changed.

## Open

- A per-species eye override, which would let a band shift derive from
  an eye's aperture (B36).
- A lone silkworm ageing off its tray; a stack of one (B34).
- Conception and calving (`pregnant` and `with-young` ship as staged
  conditions only).
