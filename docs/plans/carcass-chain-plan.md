# The carcass chain — implementation plan

Executes [carcass-chain-requirements.md](../requirements/carcass-chain-requirements.md)
(as revised 2026-10-04: *One kind of death, and one kind of body*).
**Kind:** content, with one reconciliation slice in the engine — now two
kernel waves, the first of which is the build's riskiest.
**Leads from:** content. Two new capability packs (`trade-tanning`,
`trade-chandlery`), rows in five shipped packs, and a kernel slice whose
first consumer is the Hearts Delight flock in this same build.

What is being built: **every death that is not a player's mints a
corpse and the dead thing stops being an object**; one slaughter instead
of two (a kill that leaves that corpse, and the kitchen's `butcher`
taking it apart); species-declared yields that scale with size and
condition; a hide that rots on the shipped clock and tans in a pit
against the bark and water it is standing in; bark off a felled oak;
one candle recipe over two feedstocks; bone meal into the soil and a
dog loaf out of the oven; a flock in the valley; three vacant seats at
Wharfside.

> **Revision 2026-10-04.** The first draft of this plan found that a
> beast dying through `ConditionApi.die` is flipped to `dead` in place
> and keeps every mixin it had, and paid for it with six dead-target
> guards (the retired D14). The user reopened the requirement: *"I didn't
> mean to imply beasts and humans were different … any NPC, they all
> mint corpses."* The reasoning the plan records: the realm **shows a
> thing's capabilities**, so the two kinds of death read as two kinds of
> object — one body with a long list of things it can no longer do, one
> bare body — with no explanation for the asymmetry; and a corpse's
> lifecycle is genuinely a different lifecycle (it cools, decays, is
> forensic, is never alive again), not a beast's minus some verbs.
> Lossiness is accepted on purpose: *"I'd kinda prefer some continuity
> there even if it means the corpse isn't lossless."* D1 and W0 are the
> result; D14 is gone.

---

## Grounding

### Reconciled against master, 2026-10-04

Eight merges landed after this plan was minted. **Seven are docs-only**
(the wizardry, wizardry-curriculum, mcp-authoring, attribution,
llm-economy, illustration and client-governance design branches, plus
seventeen new or rewritten slates). Nothing in them touches this build's
ground: `object-taxonomy` is blueprints and signatures, `scarcity` is
metering, `labor-standing` is credit routing, `illustration` is the image
pipeline. No new slate claims tanning, chandlery, slaughter or feed.

**One merge touched code, and it is in this build's own file** —
`fix/2026-10-03-ordered-maker`, +29 lines in `CraftingLogic`'s
`applyBulkOutput`. Three facts about it, each checked:

1. **No conflict.** It is in the *bulk* output arm; W1 changes the
   *tangible* arm. Different functions.
2. **W1's premise re-verified on the merged tree.** `applyTangibleOutput`
   still has `if (!primary && !bulkOnly) throw … "resolved with no
   matched item input and no 'outputMaterial'"`, with
   `bulkOnly = !primary && authoredMaterial.length > 0`. So a bulk-only
   input with no authored material still throws, which is exactly what
   W1 fixes and what W6's one dip recipe needs.
3. ⭐ **It is the precedent W1 should cite**, because it is the same class
   of fix in the same file. Its own comment: *"The fix is not invented
   here. `mintVessel` — the MANUAL-build path in this same file —
   already carries the identical branch with the identical comment. Two
   mint paths, and only one of them stamped the liquid; this is the other
   one agreeing."* W1 is two paths disagreeing about deriving a
   material; say so in its commit the same way.

⭐ **And it hands D3 a small gift.** That fix names `render-tallow`
explicitly as one of the 22 bulk-output recipes on the authored path, so
a crock of tallow now **names who rendered it**. D3 changes that recipe's
input from `meat` trimmings to `suet` and is unaffected by the change —
but the chandler's feedstock now arrives with a maker on it, which is
worth one line in the drive.

⚠ **One known defect to route around, not fix.** `illustration-slate`
lists *"the `props:`/`cast:` stable read (a defect fix)"* as outstanding.
W8 places content with `props:` and `cast:`. If a placement reads
unstably, that is a known upstream fault with an owner — record it and
move on rather than chasing it.


Everything below was verified by opening the file this cycle. Paths are
repo-relative from `/home/bobalu/play/saxonberg/build-1`.

### The death path — what it does today, and what the mint already is

- `packages/server/src/mud/api/condition.ts:275` — `ConditionApi.die(host, cause, spec?)`
  forwards to `ConditionLogic.die`. No visible gate on the Api static;
  three callers: `lib/vitals/Vitals.ts:929` (`expireDying`, fire-and-forget
  from a sync reconcile), `lib/species/Organism.ts:339` (old age, from a
  beat), `platform/idea/api/CombatLogic.ts:3884` (`killImpl` — the cull
  and the coup).
- `packages/server/src/mud/platform/idea/api/ConditionLogic.ts:304-420` —
  `dieImpl`. Sync prefix: idempotency guard, `relieve(dying)`,
  **the split** (`playerBodyOf(host)` — structural, never `instanceof`),
  the accountability row, the circle branch; then at ~388 the `!player`
  branch: `setCauseOfDeath` + `setLifecycleState('dead')` +
  `markDeceasedAt`, under the comments *"nothing to walk away → this Stuff
  simply stops. Unchanged, zero new machinery, and what every NPC and
  beast does"* (~366) and *"The body stays in the world as a corpse.
  Never `StuffApi.destruct` here"* (~389). ⚠ **Both comments become false
  and are rewritten in W0, not left.** Async tail: `recordDeathDeed`, and
  `divideBody` for a player.
- `divideBody` (~445-640) is player-coupled: `stopAutoSave`, the material
  slices, the arc, the drain, `save`, **the corpse mint**, the shade,
  `markForRevert` + `destruct`, the sockets. The reusable part is
  `mintCorpseFrom(body, material, cause, nowS)` (588-650): clones
  `/stuff/agent/Corpse` with a `dataOverlay` (`shortDescription: body of
  <presentation>`, `register: definite`, `_speciesPath`, `causeOfDeath`,
  `diedAtGameSec`) and `asIdentityPath: corpseIdentityFor(body, nowS)`,
  throws if the clone is not `Vitals`, pours `adoptMaterialState(material)`
  (gated to this choreography; **no `mergeSlice_` counterpart — that
  absence is what makes a corpse un-reanimatable**), moves the loadout
  onto the corpse, lays it where the body fell.
  `MATERIAL_FORK_SLICES = ['Vitals','Trauma','CauseOfDeath','Anatomy']`
  (`lib/vitals/Vitals.ts:144`); `forkSlice_<name>()` on `Vitals`.
- `corpseIdentityFor` (~530-585) already reasons about NPCs: *"under D7
  an `Extra` keeps its own identity, so two dead sentries genuinely share
  the first half"*; a body with no identity path gets no minted identity.
- `packages/content/generic-objects/content/stuff/agent/Corpse.yaml` —
  `class: /platform/agent/Corpse`, `keywords: [body]`, `lifecycleState: dead`.
  `platform/agent/Corpse.ts` is `class Corpse extends Creature {}`.
- `lib/creature/Creature.ts:145+` — `Postmortem(Concealable(LoadBearing(Container(Containable(Disguisable(Perceptible(Visible(Exerting(ThermalRegulation(Thermal(Respiration(…Metabolic…Vitals…Reserved…)))))))))))))`.
  So a `Corpse` already has `sinceDeath()`, a `Container` for the
  loadout, `Thermal` (algor mortis), reserves and metabolism machinery.
  **Not** `Named`, not `Producing`, not `Handling`, not `Bonded`, not
  `Behaved`, not `Contaminable`.
- `Creature.getMass()` (`:549-620`) — an authored/stored mass wins; else
  `species.massAt(getAgeDays())`; `withBodyComposition` adds flesh/lean
  deltas only when those reserves exist. `Organism.getAgeDays()` =
  `(diedAt ?? now) − bornAt`; `bornAt` is `persistent, authorable`
  (`lib/species/Organism.ts:148`); `setLifecycleState('dead')` stamps
  `diedAt`. ⚠ A fresh `Corpse` clone has `bornAt 0` → `massAt(0)` is a
  newborn's mass — **the mint must stamp `mass` and `bornAt`**.
- `lib/persistence/Persistable.ts:150-160, 215, 243, 340-360` —
  `markForRevert()` is on the mixin (not only on Avatar): it folds into
  `shouldPersist()`, and `cleanupOnDestruct` (the capture-on-destruct
  backstop) returns when `shouldPersist()` is false. `PersistableApi`
  has `deleteAllFor(owner)` and `hasRecord(scope, key)` but no per-host
  delete.
- `platform/idea/ChattelRegistry.ts` `release(chattelId)` — **deletes the
  `ChattelRecord` row** and appends a terminal `released` event;
  `ChattelMixin.onDestruct` (`lib/chattel/Chattel.ts:282`) calls it.
  `ResidencyLogic.pinNow()` (`:770-810`) stands pinned animals up from
  `ChattelApi.pinned()` — the chattel rows. ⭐ So destructing a named pet
  removes it from the pin roll by shipped machinery; its old snapshot
  becomes an orphan row, harmless.
- `platform/idea/SchedulerRegistry.ts:400-418` — every engagement
  subscribes to `Events.StuffDestructed` for its host and terminates
  itself `'host-destroyed'` (one of the five framework abort reasons,
  `lib/activity/Engaged.ts:57-63`).
- `api/security.ts:1445-1485` — **a destroyed Stuff is INERT**: any
  method call through the proxy is a no-op returning `undefined`, never a
  throw (*"an in-flight async that captured it before destruct, a
  broadcast iterating a set … a scheduled tick that hadn't been
  cancelled"*). `api/proxy.ts:195-215` — a `ref: 'instance'` slot holding
  a destroyed Stuff reads `null` and self-heals.
- `lib/behavior/Behaved.ts:308` — `onDestruct` tears down the brains.
- Combat: `CombatLogic.ts:3820-3850` — the cull is
  `killImpl(victim) → endWith(session, "death") → runResolutionConsumers → return`,
  all synchronous; `endWith` (~3590-3635) narrates and **`session.resolve(outcome)`**
  — one death resolves the session for every party. `CombatLogic` has
  zero `isDestroyed()` checks; it has never needed one because the only
  destructing death (a player's) happens in `die`'s async tail, after
  combat's synchronous code has returned.
- `raids.ts:60-115` (the fox) — kills by `ConditionApi.inflict` (the
  dying window), then `StuffApi.destruct(carried)` on the first bird
  **while it is still in the window**. ⚠ The one shipped place that
  destructs a body `die` may later run on; the choreography must
  re-check `host.isDestroyed()` after every `await`.
- `platform/idea/api/__tests__/ConditionLogic.die.test.ts:90` pins
  *"death is NOT destruction — the body persists as a corpse"* and `:198`
  *"refuses a non-organism and a corpse without throwing"* — both written
  against the same-object behaviour and **rewritten in W0**.
- Docs asserting the old behaviour: `docs/subsystems/race.md:32-45`
  (*"NPCs, creatures, beasts — unchanged: the same Stuff becomes the
  corpse"*), `docs/subsystems/mortality.md:309-320` (*"The doctrinal
  split … the same Stuff stops. Unchanged, zero new machinery"*), and
  `mortality.md:243-260` (the corpse section's framing). W0 rewrites them.

### The lifecycle read sites, walked (the coordinator's 52 → 60 by my grep, 24 files, 16 non-test)

Every non-test file reading `isDead()` / `isAlive()` / `isLivingBody()` /
`lifecycleState`, and whether W0 changes it:

| file | what it reads | changes? |
|---|---|---|
| `lib/respiration/Respiration.ts:389`, `lib/metabolism/Metabolic.ts:649`, `lib/thermal/ThermalRegulation.ts:342` | `isLivingBody()` to stop living processes | **no** — a `Corpse` row is `dead`, so they stop on it exactly as on a flipped body |
| `lib/vitals/Vitals.ts:2514, 2835, 2855` | `!isDead()` before `beginDying` | **no** — runs on the living body |
| `lib/mortality/Postmortem.ts:186, 208` | `isDead()` to run the decay clock | **no** — the Corpse is the dead body it runs on; `diedAtGameSec` rides the overlay |
| `lib/species/Organism.ts:83-88, 332-343` | the predicates; `reconcileSenescence` → `die('old age')` | **no** read change; the old-age caller is a `die` caller and gets the new behaviour free |
| `lib/husbandry/Growing.ts:1221-1239` | `setLifecycleState('dead')` directly (plants) | **no** — plants have no `Vitals`, `dieImpl` returns at `isVitals`, the plant path stays the explicit exception `mortality.md` already names |
| `api/species.ts:93` | `isAnimate` by lifecycle | **no** — a Corpse is inanimate |
| `platform/idea/species/Species.ts` | `lifecycleStates` vocabulary | **no** |
| `platform/idea/api/CombatLogic.ts:3471-3476, 5214` | skip dead occupants; `coupEligible` | **no** read change; ⚠ see Risks for the destruct timing |
| `platform/idea/api/ConditionLogic.ts` | the transition | **yes — W0** |
| `lib/character/Avatar.ts`, `platform/agent/PrimaryAvatar.ts`, `platform/agent/ShadeAvatar.ts`, `lib/mortality/MortalArc.ts` | the player arc | **no** — the player branch is untouched |
| `trade-cooking/…/ButcherController.ts` | `isOrganism && isDead()` | **no** read change; now always a `Corpse` — W3 confirms `sinceDeath`, species, contamination |
| `trade-farming/…/PloughController.ts:149` | skips dead occupants | **no** — a corpse in the field is skipped |
| `trade-ranching/src/behavior/raids.ts:90,97,111` | `isAlive()` prey filter; destructs the carried bird | **no code change in raids**; W0's choreography tolerates the destruct-mid-window race (see W0) |
| `trade-fishing/…/ReleaseController.ts:45` | `fish.isDead()` | **behaviour change, no edit**: a fish never stays a dead `Fish` now, so the `isDead()` arm is unreachable; `remaining <= 0` still fires; a corpse does not bind as a fish. Record in the pack's doc. |
| `trade-fishing/src/agent/Fish.ts` (`ContaminableMixin(KeptAnimal)`) | — | **knock-on**: a dead fish becomes a `Corpse`, which was not `Contaminable` — fishing D20 (the outfall's load rides onto the fillet) would be lost. **W0 composes `ContaminableMixin` on `Corpse` and the mint transfers the load.** |
| `trade-medicine/…/PostmortemReading.ts:81-84` | `isPostmortem && isVitals && isOrganism && isDead` | **no** — a Corpse satisfies all four |
| `trade-apiculture/src/lib/Colony.ts:525` | deliberately never `'dead'` | **no** — no `Vitals`, never reaches `die` |
| `transport/src/lib/journey/Journey.ts:387-388` | `driver.isDestroyed()` then `!isAlive()` | **no** — a dead driver is now caught by the first check; passengers are the vehicle's contents, not a held list |

### The two butcheries

- `packages/content/trade-ranching/src/idea/cmd/ranching/ButcherController.ts` —
  module-level `YIELDS` (stew-meat .42 · offal .12 · tallow .05 · hide .07
  · bone .12), `finish = clamp01(0.55 + (flesh − 30)/90)` on meat only,
  `instanceof Livestock` guard, `HerdRegistry.returnHead` + tally
  decrement, `StuffApi.destruct(animal)`, credits `STOCKMANSHIP`
  (exported from `HandleController.ts`). Docstring and the view's help
  claim *"bone and horn"*; no horn row exists.
- `…/cmd/ranching/butcher.yaml` — arg `requires: HandlingMixin` (admits
  the sheepdog; the controller re-narrows). `…/idea/cmd/ranching/ButcherController.yaml` — the row.
- `packages/content/trade-ranching/src/agent/Livestock.ts` —
  `ProducingMixin(HandledMixin(HandlingMixin(ChattelMixin(BrandedMixin(Creature)))))`;
  `commandContributions.peers` = return · butcher · breed · milk · shear ·
  gather; `bindToHerd`, `getHerdId()`, `getHeadIndex()`. **Not `Named`.**
- `packages/content/trade-ranching/src/lib/Handled.ts` —
  `workedOver(actor): HandleReport`; `HandleController.ts` is resolve →
  send → credit. The precedent.
- `packages/content/trade-cooking/src/idea/cmd/crafting/ButcherController.ts` —
  extends `CraftController`; gate order today: not-a-carcass → `preloadAnatomy`
  → sentient → blade → `getButcheryYield()`; `ageAtKill(sinceDeath)`;
  `GUT_FLORA`; `transferContaminationTo` from a `Contaminable` body;
  `DISCIPLINE = 'butchery'`; `destruct(body)`. ⚠ A **live** animal is
  refused *"is not a carcass"* before anything about it is read.
- `…/cmd/crafting/butcher.yaml` — `verbs: [butcher, dress]`; `body` arg `requires: any`.
- `platform/idea/species/Species.ts:44` — `ButcheryYield { cut; units }`;
  field `butcheryYield` (769, authorable); `getButcheryYield()` (975) has
  one reader. `adultMass` (605), `massAt` (1188), `feedingStyle` (751).
  Yield authors: six fish, `wolf.yaml` (3+1), `hog.yaml` (6+2+2), the
  pony (12+3) — abstract counts. The five farm species under
  `trade-ranching/content/stuff/idea/species/animalia/chordata/…`
  (`bovidae/ovis/aries` 70 kg, `bovidae/bos/taurus` 550 kg,
  `suidae/sus/domesticus` 120 kg, `carnivora/canidae/canis/familiaris` 20 kg
  with `feedingStyle: [bowl, ground, hand]`, `aves/galliformes/phasianidae/gallus/domesticus`)
  author **no** yield.
- `packages/server/scripts/check-verb-collisions.ts` — `KNOWN_COLLISIONS`
  carries `butcher` and `dress`; fails on a NEW collision and on a listed
  one that is **healed and not deleted**. `slaughter` and `tan` are unclaimed.

### The carcass products and their rows

- `trade-ranching/content/trade/ranching/thing/hide.yaml` — `Provision`,
  mass 25, **`_materialPath: …/organic/leather`**; `leather.yaml`
  tags `[organic, leather, hide, once-living, flexible]` — ⭐ the `hide`
  tag is what the jerkin matches, which is why it *"gets a raw skin"*.
- `…/thing/tallow.yaml` — "pail of fat", keywords `[fat, tallow, suet, pail]`,
  material `animal-fat` (tags `[food, fat, rendering, once-living]` —
  `fat` is the cooking MEDIUM tag, so raw suet fries today). `…/thing/bone.yaml`.
- `trade-cooking/content/recipes/render-tallow.yaml` — slot `category: meat`,
  bulk into `tallow-crock` (`CraftVessel`, `category: tallow-crock`),
  `outputMaterial: …/material/tallow` (tags `[liquid, food, fat, cooking-fat, rendered]`).
- `trade-tailoring/content/recipes/leather-jerkin.yaml` — `{category: hide, kind: item, minGrade: fair}`,
  `toolCapabilities: [mending]`, `discipline: tailoring`.
- `generic-objects/…/items/offal.yaml` / `stew-meat.yaml` — Provisions;
  `offal` edible; `bone` material `edibility: false` → **a dog will not eat bone**.
- `trade-dyeing/…/material/tannin.yaml` — a mordant, no producer. Untouched.

### The item-side clocks (the tanpit decision rests here)

- `platform/thing/Provision.ts` — its own comment: *"WaterActivity beside
  Freshness, NOT folded into it … only one of them is true of a hide or a
  plank … the split is what lets a tannery dry a skin without claiming
  it ferments."*
- `lib/material/WaterActivity.ts` — per-instance `moisture`/`solute`;
  the passive arm reconciles the ITEM against its environment.
- `lib/material/Freshness.ts` — composed on `Provision` only;
  `lint:perishable` fails any row whose material rots on a class that
  does not reach it. No exemption list.
- `trade-cooking/…/DryController.ts` — `dry` puts the cut where the air
  is and narrates a prospect (*"a hide … qualif[ies] the day somebody
  ships one"*). `PreserveController.ts` resolves ONE fixed `recipeId()`;
  `cure.yaml` claims `[cure, salt]`, `requires: any`; `salt-cure.yaml`
  slot `category: meat`, `cure: { solute: 0.55 }`.
- `CraftingLogic.ts:1570-1600` — the tangible arm carries microbial load
  and applies `recipe.getCure()`.

### Maturation — why it is NOT the tanpit's host

- `lib/maturation/Maturing.ts:421-429` throws without `BulkableMixin`;
  the transform is `setBulkMaterial('interior', product)`. One batch per
  vessel keyed to the interior material.
- `lib/maturation/MaturationProfile.ts:47-59` — `chemical` has zero rows
  and no `requiresStrain` analogue.
- `docs/subsystems/maturation.md:300-309` names the gap: *"ripening a
  DISCRETE thing … has no mechanism."*
- `platform/thing/Vat.ts` — not a Container. `platform/thing/CraftVessel.ts` —
  `Contaminable(Serviceable(VesselKind(Crafted(Thermal(Bulkable(Container(Good)))))))`,
  exported. `Container.ts` has no size/mass acceptance rule.

### Crafting facts the candle and the salt depend on

- `CraftingLogic.ts:1442-1530` `applyTangibleOutput`: a bulk-only
  tangible **throws unless `outputMaterial` is authored**.
- `CraftingLogic.ts:2256, 2885` — `findByKeyword(ref) ?? getRecipe(ref)`;
  `RecipeCatalogue.ts` — `getRecipe`, `findByKeyword`, `allRecipes()`.
- `resolveMaker` passes `getDiscipline() || undefined`;
  `Employed.isFulfilling(undefined)` (`lib/employment/Employed.ts:426-451`)
  passes any on-shift seat.
- `CraftController.ts:46-73` `requireDeed`; `crafting.md:1108-1160`: a
  recipe with no `discipline`/`difficulty` is ungated. `MakeController.ts:60` calls it.
- `trade-apiculture/content/recipes/candle.yaml` — `discipline: apiculture`,
  `difficulty: easy`, item slot `category: wax`. ⚠ **`grep candle packages/wire/tests/`
  is empty** — no drive has ever made one; a player cannot.
  `trade-apiculture/src/__tests__/recipes.test.ts:117-125` asserts the row.
- `trade-apiculture/…/thing/beeswax-cake.yaml` — an ITEM (0.15 kg).
  Tallow is BULK. ⭐ The two feedstocks have different shapes.
- `generic-objects/…/thing/candle.yaml` — `Lamp`, three beeswax welds,
  `lit: false`, named by exactly one row. The `/platform/thing/Candle`
  class the task mentioned is **already retired** (`light.md:916-918`;
  only test-local fixtures bear the name).
- `lib/description/Visible.ts:325-332` — `getShortDescription()` renders
  the stored stem; no material templating. `lib/perception/SmellSource.ts:38-43`
  — `odorIdentity` + concentration; a `smell` verb ships.
- Milling: `quern.yaml` is a `GristMill` with a fixed `productMaterial`
  and `capabilities: [millstone]`; `crush-comb.yaml` proves an item-only
  input fills a bulk output at `outputPortionL`.

### Forestry

- `trade-forestry/src/idea/cmd/forestry/FellController.ts` —
  `dropStandard(giver, room, woodMaterialPath, seedPath)` mints a bole,
  four logs, a seed; stamps and captures. `src/lib/Stand.ts:102-117` —
  `StandSpecies { speciesPath, name, woodMaterialPath, seedPath, standing, capacity, incrementPerYear }`;
  `setMix` (275-281). The mix is authored per Wood row
  (`rejection/…/hanging-wood/oak-clearing.yaml`). `timber.yaml` is a `Good`.

### Feeding, soil, pets

- `platform/idea/cmd/bulk/FeedController.ts` — source must carry
  `compost`; credits **nitrogen** at 10 pts/L. `lib/husbandry/Soil.ts:175-190`
  has the organic-matter work-in face. Reserves: moisture · nitrogen ·
  organicMatter · structure.
- `lib/behavior/feeds.ts` — eats off the **ground** when `feedsBy('ground')`;
  below `steady` only when every person present is known.
- `trade-ranching/…/agent/farm-dog.yaml` — `WorkingAnimal` (= `HandledMixin(KeptAnimal)`:
  `Named`, `Bonded`, `Behaved`, `Persistable`, `Chattel`). **Cast by nobody.**
  No authored `KeptAnimal` row has a `name:`; `NamedMixin.fieldMeta.name`
  is authorable.
- `platform/idea/cmd/social/NameController.ts:61-110` — naming needs
  `hasChosen`; `pets.wire.test.ts:133` asserts `name` refuses a cat that
  never followed.
- `lib/husbandry/Producing.ts:489-500, 995` — `seedState` starts every tap
  at `standing: 0`; `DraftController` seeds flesh and handling, never taps.

### The world

- Heart's Delight (`packages/content/hearts-delight/`, README forbids
  code, no `boot:` section yet): `location/farmstead-yard.yaml`
  (`props: [farm-shelf]`, `cast: [farmer]`), `idea/farm-business.yaml`
  (`farmer` seat, `fulfills: [cooking]`), `agent/farmer.yaml` (Odell Quist).
- Wharfside (`terminus/content/world/terminus/wharfside/`): `bank.yaml`,
  the dyehouse (zone + `idea/outfit`, `agent/dyer`, `location/floor`,
  `thing/counter`), the mill, `thing/city-outfall.yaml`, `thing/river-edge.yaml`.
  `terminus/pack.yaml:84` claims the district `landUse: industrial`;
  `:106-107` boot the dyehouse as producers. Water source precedent:
  `trade-brewing/…/standpipe.yaml` (`WaterFixture`). The bakery:
  `terminus/…/market/bakery.yaml` + `thing/bread-counter.yaml` (a `Stock`
  with `stockLines` + `prices`). Rows that exist for the yard and the
  knacker: `trade-cooking/…/thing/butcher-block.yaml`, `cook-pot.yaml`;
  `trade-haulage/…/thing/works-board.yaml`.
- Employment: `Position.requires` closed to `{gigs, discipline, band}`;
  bands `untrained · novice · competent · proficient · expert`;
  `lint:openings` arm 3; the tailor's outfit is the exemplar.
- Disciplines are rows at `<root>/idea/Discipline/<key>.yaml`; `leatherwork`
  is unminted (`trade-roster-slate.md:161`, 0723).
- Packs: `trade-apiculture` is the scaffold to copy. The server's
  `exports` map admits `./mud/lib/*`, `./mud/api/*`,
  `./mud/platform/{thing,idea,agent,location}/*`. `trade-farming` has
  **no `content/recipes/` directory** (verified: `archetypes/ stuff/ trade/`).
- The drive tier: `packages/wire/tests/<feature>.dirty.wire.test.ts`;
  harness (`packages/wire/src/harness/index.ts`) exports `Session`,
  `declareFile`, `uniqueHandle`, `expectOk`, `expectRefused`, `expectNote`,
  `advanceWorldClock`, `worldClockNow`, `isOwnedTestWorld`.

---

## Plan-level decisions

**D1 — One kind of death, one kind of body; `slaughter` is a kill.**
`ConditionLogic.die`'s non-player branch mints a `Corpse` exactly as the
player branch does and **destructs the dead thing**. Animals and NPCs are
not distinguished; the discriminator stays `playerBodyOf` (a player
IDENTITY — a linkdead player still divides, per the absent-body
doctrine). The corpse carries what a dead body has — species, mass, the
condition it died in, cause, time, the material slices, its load of
contamination, its keywords — and drops what belonged to the living
thing (a herd place, a tap's standing, a bond, a job). Lossy on purpose.
`slaughter <animal>` is then `ConditionApi.die(animal, 'slaughtered')`
and nothing else lethal; the book write follows (D1's ordering below);
the kitchen's `butcher` takes the corpse apart. AC2 and AC14 are met by
construction: a fight, a fox, old age and a slaughter all leave the one
object, and the one object composes none of a living animal's verbs.

*Ordering inside `die` (the non-player branch):* sync prefix unchanged
(`setCauseOfDeath`, `setLifecycleState('dead')` — so a read on the same
tick sees a dead body and `diedAt` is stamped — `markDeceasedAt`, the
accountability row) **plus `markForRevert()` when the host is
`Persistable`** (so no capture can write a dead body in the one-await
window; the player path does the same); async tail: `recordDeathDeed`,
then take the slices, mint the corpse (D16), then
`await StuffApi.destruct(host)`. **After every `await`, `if (host.isDestroyed()) return`**
— the fox destructs a bird it has put in the dying window, and the
expiry may run `die` on it later.

*Ordering in `slaughter`:* read `herdId`, `headIndex`, flesh and handling
off the LIVE animal (it will not exist afterwards) → `await die` → write
the book through the registry (`returnHead(…, { note: 'slaughtered', flesh, handling })`
+ tally − 1). A failed write leaves a dead head still marked `drafted` in
the book — over-counted by one, recoverable, nothing alive lost; the
reverse order would leave a live animal out of the book if the kill
failed. `Livestock.leaveBook()` from the first draft is **dropped**: the
animal is gone by the time the book is written, and the registry's
`returnHead` is already a method on the object that owns the book.

**D2 — The yield shape: a fraction line beside the count line.**
`ButcheryYield` becomes `{ cut; units; fraction?; conditioned? }`. No
`fraction` = the shipped count shape (fish, wolf, hog, pony unchanged).
With `fraction`: `kg = liveKg × fraction × finish`, `finish` the shipped
`clamp01(0.55 + (flesh − 30)/90)` when `conditioned` (default) else 1
(hide, bone); `units` is how many pieces, each `kg/units`. The
arithmetic is `Species.dressOut({ liveKg, fleshPct }): DressedLine[]`;
the kitchen applies skill and the floor-of-one. The corpse supplies
`liveKg` (its stamped mass) and `fleshPct` (its stamped
`conditionAtDeath`, D16).

**D3 — Suet is not tallow, and raw fat does not fry.**
`tallow.yaml` → `suet.yaml` ("lump of suet", keywords `[suet, fat, leaf, kidney]`);
`animal-fat` drops the `fat` tag and gains `suet`; `render-tallow`'s
slot becomes `category: suet`. The two frying recipes read the rendered
tallow's own `fat` tag and are untouched.

**D4 — The tanpit: the HIDE reconciles against the pit it is in.**
Unchanged from the first draft; see Host placement. Maturation is not
used; no `MaturationProfile` field is added.

**D5 — Bark is a felling fact on the stand's mix entry.**
`StandSpecies.barkPath?: string | null` beside `seedPath`; the oak entry
at `oak-clearing.yaml` authors `/trade/forestry/thing/bark`; `dropStandard`
mints `BARK_BUNDLES_PER_STANDARD = 4` bundles summing to
`BARK_FRACTION_OF_BOLE = 0.08` of the bole (≈ 13 kg each). Rejected: a
`Species` field (the wood and the seed already live on the mix entry;
promoting all three is forestry's own open design).

**D6 — One candle: a bulk dip, material derived, no Discipline.**
Bulk slot `category: candle-stock` (`measureL: 0.12`, `requiresHeatK: 340`),
`outputApplication: tangible`, `outputMaterial: ''`, **no `discipline`,
no `difficulty`** (the only way a player can make one). `beeswax` and
`tallow` gain `candle-stock`; `melt-wax` turns the cake into bulk in a
`dip-pot`. The candle row moves to `/trade/chandlery/thing/candle`
naming the pack's `Candle extends Lamp` (+ `SmellSourceMixin`) whose
descriptions derive from the material. Kernel slice: the tangible arm
derives material from the primary bulk input when `outputMaterial` is
empty and no item matched.

**D7 — Two packs, scaffolded from `trade-apiculture`.** `trade-tanning`
(`/trade/tanning`; `lib/Tanning.ts`, `thing/Hide.ts`, `thing/Tanpit.ts`,
`idea/cmd/tanning/TanController.ts`) and `trade-chandlery`
(`/trade/chandlery`; `thing/Candle.ts`). Both added to
`packages/server/package.json`; `pnpm install`. The hide ROW stays
ranching's and names tanning's CLASS (the fleece precedent), so
`trade-ranching/package.json` gains `@saxonberg/content-trade-tanning`.

**D8 — The named refusal is a decision in both verbs, before the data.**
Order on a LIVE target in `slaughter` and in the kitchen's `butcher`:
sentient → **named** (`MixinApi.isNamed(t) && t.getName() !== ''` —
*"That is <Name>. You named it, and it is not meat."*) → species yield
empty (*"That is not something you slaughter/butcher."*) → (butcher only)
alive with a yield (*"It is alive. If you mean to kill it, say so."*).
`Livestock` is not `Named`; a `KeptAnimal` is. Heart's Delight authors
Quist's dog **with a name** (Moss) and casts the ranching row unnamed —
AC4 and AC5 need two animals.

**D9 — Retiring the two collision lines.** W2 deletes the ranching
`butcher.yaml` and the `butcher:` allowlist line together; W3 drops
`dress` and the `dress:` line together.

**D10 — Bone meal is a ground BULK, made beside a millstone, worked in as
organic matter.** `trade-farming` ships `bone-meal` (material, tags
`[granular, solid, compost, feed, bone-meal, slow-amendment]`) and the
recipe (item `bone` ×1 → bulk 4 L into an empty `sack`, `toolCapabilities: [millstone]`).
`FeedController` gains one branch: `slow-amendment` credits
**organicMatter**. The dog loaf (`trade-baking`: bran 0.5 L · offal ×1 ·
bone-meal 0.2 L · `cooking-fat` 0.1 L, oven heat, `baking`/`easy`;
`dog-loaf` Provision; `dog-bread` material) takes it as bulk.

**D11 — The flock is a row, the killing place is prose and a block.**
`hearts-delight/thing/flock-book.yaml` (`Herdbook`, `delight-flock`,
`ovis/aries`, `tally: 12`, holder the farm business, home the parcel) on
the yard's `props:` with a `boot:` entry; the yard gains cooking's butcher
block and a sentence.

**D12 — Three premises, three vacant seats, no new Cast.** Tannery
(two tanpits, a `WaterFixture` leat, a shelf; `tanner` seat `requires:
{discipline: leatherwork, band: novice}`), knacker's yard (butcher
block, cook pot, hearth, tallow crock, haulage works-board — the knacker
collects by posting a haulage job; `knacker` seat `requires: {discipline:
butchery, band: novice}`), chandlery (hearth, dip-pot, a counter `Stock`;
`chandler` seat, **no requirement**). Zone + floor + outfit as the
dyehouse; floors and outfits are `boot:` producers; exits from the bank.

**D13 — `leatherwork` is minted by the tanning pack** (skill, iscedf 0723,
`synergizes: [textiles, tailoring]`). `tan` credits it; the jerkin stays `tailoring`.

**D14 — DELETED (2026-10-04).** It read *"a dead animal answers no
ranching verb"* and paid for the same-object death with six guards. A
`Corpse` composes neither `ProducingMixin`, `HandlingMixin` nor
`BondedMixin`, so `milk`/`shear`/`gather`/`handle`/`return`/`breed`
cannot bind it and nothing has to say no. **No guard survives on its own
merits**: the only one that looked tempting — `TapActController`
refusing a dead Organism — would be a check against a host set that can
no longer contain one. The number is kept so earlier citations stay
readable.

**D15 — The tanning numbers are constants on the mixin**, not a profile row.

**D16 — What the corpse carries, and where it lives.** The mint
(`mintCorpseFrom`, extracted from `divideBody` into the shared tail)
stamps through the existing `dataOverlay`: `shortDescription` (as today),
`register`, `_speciesPath`, `causeOfDeath`, `diedAtGameSec`, **`mass`**
(the body's full `getMass()` — a fresh clone would otherwise derive a
newborn's), **`bornAt`** (so `getAgeDays()` is the age at death and
`race.md:735`'s claim stays true), **`conditionAtDeath`** (the `flesh`
reserve at the moment of death, or `null` — a stamped number, never a
reserve: *"a dead animal's condition cannot change"*), and **`keywords`**
(the row's `[body, corpse, carcass]` ∪ the dead thing's own, so `butcher
ewe` and `look clerk` both find the body). Then `adoptMaterialState`
(unchanged), the loadout, the place, and
`body.transferContaminationTo(corpse)` when both are `Contaminable`.
Two kernel-class edits make that possible: `platform/agent/Corpse` gains
`conditionAtDeath: number | null` (persistent) with `getConditionAtDeath()`,
and composes `ContaminableMixin`.

---

## ⭐⭐ Host placement

| what | host | what composing it claims about every other composer |
|---|---|---|
| the non-player corpse mint | `ConditionLogic.die`'s shared async tail (extracted from `divideBody`) | Claims: every `Vitals` body that dies and carries no player identity becomes a `Corpse` and is destructed. Plants (no `Vitals`) never reach `die`; colonies never flip. The player branch keeps its own choreography above the shared mint. |
| `Corpse.conditionAtDeath` | `platform/agent/Corpse` (kernel concrete) | A fact about a corpse — the condition a body died in — on the one class that IS a corpse. Not on `PostmortemMixin` (which rides every living `Creature`) and not a reserve (a reserve reconciles; this must not). A player's corpse carries it too, harmlessly. |
| `ContaminableMixin` on `Corpse` | `platform/agent/Corpse` | Claims every corpse can carry a silent population — true of a carcass in the sun — and is what lets the fish's outfall load survive the species-wide change. `CraftVessel` composes the same mixin for the same reason (a surface load). |
| `TanningMixin` (`/trade/tanning/lib/Tanning`) | **`/trade/tanning/thing/Hide` only** | Nothing else composes it. NOT `Provision`, NOT `Good`. The reconcile asks *"is my container a Tanpit with liquor covering me?"* — a condition read, never a host narrowing. |
| `Hide` = `Tanning(Crafted(WaterActivity(Freshness(Thermal(Good)))))` | pack class, named by ranching's row | Freshness needs Thermal beneath; Crafted carries the band the pit writes and the jerkin reads; WaterActivity is salting. **Not** `Provision`: a hide is not food. `lint:perishable` is satisfied because `rawhide` rots and the class reaches `FreshnessMixin`. |
| `Tanpit extends CraftVessel` | pack class | Container (hides and bark go IN), Bulkable (water), Thermal, Crafted/VesselKind/Serviceable/Contaminable (washable). Rejected `Vat`: `MaturingMixin` is a false claim over plain water, and it is not a Container. The `tan` affordance static lives here. |
| `ButcheryYield.fraction?` / `.conditioned?` + `Species.dressOut()` | `Species` (kernel data Idea) | Additive and optional; count rows unchanged; `dressOut` is read by the kitchen, so `lint:unconsumed-seams` does not rise. |
| `StandSpecies.barkPath?` | the Wood row's `mix` entry | A stand fact beside `seedPath`. |
| `Candle extends Lamp` + `SmellSourceMixin` | pack class, one row | Only candles smell of what they are made of. |
| the named refusal | **no field** — reads kernel `NamedMixin` on whatever bound | `KeptAnimal` composes `Named`; `Livestock` does not; people are caught by `sentient` first. |
| `slow-amendment` branch | `FeedController` + a material TAG | A universal rule about matter. |
| tangible-from-bulk material derivation | `CraftingLogic.applyTangibleOutput` | Universally true; the loaf still authors bread. |
| `PreserveController.recipeFor(target)` | `trade-cooking`'s controller base | Among recipes sharing the subclass's cure axis, prefer the one whose item slot the named target satisfies; default unchanged. Cooking learns no tanning word. |

### The tanpit decision, in full (D4) — unchanged

The shipped mechanism with a different feedstock is **not** maturation;
it is `WaterActivityMixin` — an item's own state advancing against the
thing it is sitting in. Tanning is per-hide state driven by a condition
the pit holds.

- **(a) hides as bulk** — rejected: bulk has no identity; *"pour a hide"*.
- **(b) extend maturation to items** — rejected: one batch per vessel
  keyed to the interior material; what changes is each item, what
  depletes is the liquor; the cheese-wheel generalization for the wrong
  first consumer.
- **(c) the hide reconciles on read; the pit is the condition** — chosen.
- **(d) an engagement** — rejected; weeks, and it holds the hands.

The mechanism (dials in one `TANNING` table, labelled playtest-tuned):
`strength = min(1, barkKg / (litres × 0.05))`; `coverage = min(1, litres / (hideKg × 4))`;
rate `strength × coverage / 21` per game day; frozen (`< 275 K`) stalls;
no Arrhenius term. Over-strength (`> 2× full`) writes `_tanWorst` down;
past `tannage 1.0` an unpulled hide loses a band per 0.3. At `≥ 1`:
material `rawhide → leather`, mass × 0.45, band to the Crafted face,
`pit.consumeBark(hideKg × 1.2)`. Pulled early it stays rawhide at
partial tannage, still rots, and `look` says which (*thin* vs *not long
enough*). `tan <hide> [in <pit>]` is `dry`'s twin; `put hide in pit`
also tans; `get hide from pit` is the judgement. No reagent gate on
`MaturationProfile`: maturation is not the host, and the gate is
intrinsic (no bark → strength 0, and `look pit` says so).

---

## Convention conformance

Checked at plan time against the current tree:

- `props:` / `cast:` on every room row; `SingletonCartesianLocation`
  inside a `CartesianZone` sub-zone per premises; no `FurnishableRoom`.
- Paths: controllers at `<root>/idea/cmd/<category>/<Name>Controller.ts`
  with a row beside them; views at `<root>/cmd/<category>/<verb>.yaml`.
  New category `tanning` (`tan`); `slaughter` in ranching's `ranching`.
- Module scope declares; packs import the kernel by specifier only; no
  pack imports another pack's class (ranching's row names tanning's class by path).
- Verbs on objects: `Hide.reconcileTanning` / `tanReport()`,
  `Tanpit.liquorStrength()` / `covers()` / `consumeBark()`,
  `Species.dressOut()`, `HerdRegistry.returnHead()`,
  `Corpse.getConditionAtDeath()`. No `XApi.verb(host, …)`, no free
  helpers, no new module category, no new `eslint-disable`.
- Pack mixin: `static _mixinName = 'TanningMixin'` + `static _mixinRefusal`.
- Rows author `mass` + `_materialPath`; a `Lamp` row authors `lit:`; no
  `\"`-opened scalars; every path-valued field resolves; nothing names
  `/lib/`; new roots claimed.
- The whole family runs every wave: `pnpm -C packages/server lint:family`.

---

## Waves

Each wave ends at one commit, lands independently, and runs
`pnpm test:near` + every touched pack's own `vitest run` + `lint:family`.

### W0 — One kind of body (kernel) — ⚠ the build's riskiest wave

Goal: every non-player death mints a corpse and destructs the dead
thing; every comment and doc that said otherwise is rewritten.

Files:

1. `packages/server/src/mud/platform/idea/api/ConditionLogic.ts`
   - Extract from `divideBody` into module-private helpers the two
     reusable steps: `materialSlicesOf(body)` (the `MATERIAL_FORK_SLICES`
     loop) and the enlarged `mintCorpseFrom(body, material, cause, nowS)`
     (D16: `mass`, `bornAt`, `conditionAtDeath`, merged `keywords`,
     contamination transfer). `divideBody` keeps calling them; its
     step (b)/(f) comments survive unchanged.
   - The `!player` branch: sync prefix as today **plus**
     `if (MixinApi.isPersistable(host)) host.markForRevert()`; async
     tail: `await recordDeathDeed(host, cause)`; `if (host.isDestroyed()) return`;
     `const corpse = await mintCorpseFrom(host, materialSlicesOf(host), cause, nowS)`;
     `if (host.isDestroyed()) return`; `await StuffApi.destruct(host)`.
   - **Rewrite the two comments** (~366 *"ONE RULE, TWO MECHANISMS …
     nothing to walk away → this Stuff simply stops"* → the rule is now
     *one body: a corpse, however it died; what varies is whether an
     identity walks away*; ~389 *"The body stays in the world as a
     corpse. Never `StuffApi.destruct` here"* → *the body is replaced by
     a corpse in the tail; the sync flip is what a same-tick reader
     sees*). Rewrite `divideBody`'s docstring opening to say it is the
     player's specialization of the shared mint.
2. `packages/server/src/mud/platform/agent/Corpse.ts` — compose
   `ContaminableMixin`; add `conditionAtDeath: number | null = null`
   (`fieldMeta` persistent) + `getConditionAtDeath()` / `setConditionAtDeath()`.
   Docstring: what a corpse carries and what it deliberately does not.
3. `packages/content/generic-objects/content/stuff/agent/Corpse.yaml` —
   `keywords: [body, corpse, carcass]`; a comment that this row is now
   every non-player death's body, not only a player's.
4. Docs in the same commit (they assert the old truth and a reader of
   the branch must not be misled): `docs/subsystems/race.md:32-45` and
   `docs/subsystems/mortality.md:243-260, 309-330` — one body, two
   choreographies; the `ConditionLogic.die.test.ts` names.
5. Tests (`platform/idea/api/__tests__/ConditionLogic.die.test.ts`
   rewritten + new cases):
   - a `Creature` with `Vitals` and no player identity: after `die`, the
     original is `isDestroyed()`, exactly one `Corpse` stands where it
     stood, with its `_speciesPath`, `mass` (equal to the body's full
     `getMass()` at death), `bornAt`, `conditionAtDeath`, `causeOfDeath`,
     `diedAtGameSec`, the merged keywords, and the body's loadout;
     `sinceDeath()` runs on the corpse; `adoptMaterialState` carried the
     wound map (the forensic record — the existing `:96` assertion,
     moved onto the corpse);
   - a `Contaminable` body's load is on the corpse;
   - the sync prefix still flips the lifecycle and stamps the cause on
     the same tick (`:77` unchanged);
   - idempotency: a second `die` on the destroyed body is a no-op;
   - **the fox race**: a body destructed between the sync prefix and the
     tail (`StuffApi.destruct` racing the awaited clone) mints no corpse
     and throws nothing;
   - a `Persistable` + `Chattel` body (a `KeptAnimal` fixture): after
     `die`, `shouldPersist()` was false before destruct (no capture
     written), its chattel id is released, and `ChattelApi.pinned()` no
     longer lists it;
   - an engaged body: its engagement terminates `host-destroyed` (the
     `SchedulerRegistry` subscription) — assert the abort note;
   - a `Behaved` body: `_teardownBehaviors` ran (no beat fires after);
   - the player branch is byte-for-byte unaffected (the existing player
     tests pass unchanged).
   - `CombatLogic` tests: the cull on a non-sentient combatant resolves
     the session, and the victim is a corpse on the next tick with no
     error logged (`endWith` runs before the destruct, by construction).

What proves this wave beyond its tests: **W9's drive**, checkpoints for
AC14 (a dead ewe offers nothing — `shear body` and `handle body` fail to
bind; `look` at it lists no living affordance) and AC15 (a drafted ewe
killed in a fight leaves a body and the session ends with no
`controller-error`; the unnamed collie killed mid-errand leaves a body
and an `engagement-cancelled` note of `host-destroyed`, not a stuck
brain).

Acceptance: `lint:family` green; `lint:gates` (the `adoptMaterialState`
gate still names its one caller); the suite's death tests green.
Commit: `build(carcass W0): one kind of body — every death that is not a player's mints a corpse`.

#### ✅ W0 — DONE

What landed, and the three things that were not in the plan:

1. ⚠⚠ **A real defect the plan did not predict: the destroyed guard had
   to come FIRST.** `dieImpl`'s guards ask the host questions, and a
   destroyed Stuff answers every question with `undefined` rather than
   throwing (the inert proxy). So `host.isDead()` reads falsy on a body
   that has already been replaced, the guard falls through, and the next
   line crashes on `getConditions().find`. It was harmless before this
   build because the only destructing death was a player's; the
   idempotency test is what caught it. `if (host.isDestroyed()) return`
   is now line one of the transition, documented at the site and in
   `mortality.md`.
2. ⭐ **The mint is lossy in one more way than D16 listed, and it is
   fine**: a `Corpse` has no `flesh` reserve of its own, so the corpse's
   reserves stay at template defaults and nothing re-adds a
   body-composition delta on top of the stamped mass. Verified by
   reading `forkSlice_Vitals` — the Vitals slice carries vital signs and
   blood genotype, **no reserves** — so the stamp survives intact. This
   is why `conditionAtDeath` is a stamped number rather than a reserve
   and the two decisions reinforce each other.
3. ⭐⭐ **The test cost was one shared helper, not eight copies.**
   `lib/mortality/__tests__/corpse-mint-test-helpers.ts`
   (`installCorpseMintStub()`) stands in for the corpse template and
   **applies the `dataOverlay`** — a bare `new Corpse()` stand-in would
   have made every assertion about what a corpse carries vacuous, which
   is the whole substance of this wave. Seven files install it
   (`ConditionLogic.die`, `ConditionLogic.bleed`, `Metabolic.cascade`,
   `Respiration`, `Vitals.dying-disconnect`, `dying-per-driver`,
   `CombatLogic` ×2). It stamps a distinct path per body because
   `byTemplatePath` throws on two live objects at one path, and it goes
   through `makeStuffAtPath` because `Stuff._stampTemplatePath`'s caller
   allowlist refuses a helper that is not `test-setup` or a `*.test.ts`.
4. ⚠ **Two combat `afterEach`es now drain the microtask queue before
   restoring mocks.** A cull is driven from a *synchronous* `it` while
   `ConditionApi.die` is fire-and-forget, so the mint can still be in
   flight when the test body returns — restoring the stub out from under
   it surfaced as an unhandled Mongo rejection attributed to whichever
   test happened to be running. `await new Promise(r => setTimeout(r, 0))`
   is the fix, commented at both sites.

Rewritten, not left: the two `ConditionLogic` comments, `divideBody`'s
docstring opening (it is now explicitly *the player's specialization of
the shared mint*), `race.md`'s `death ≠ destruction` passage,
`mortality.md` § The doctrinal split → **§ One body, two
choreographies** (with the stamp table and the two ⚠ subsections), and
the `Corpse.yaml` header.

Tests: `ConditionLogic.die` 17/17 (nine of them new), and 88 across the
nine death-touching suites with **zero unhandled errors** — the state
`test:near` was in before this wave was finished.

### W1 — The reconciliation slice (kernel)

1. `platform/idea/species/Species.ts` — `ButcheryYield` gains
   `fraction?` / `conditioned?`; `setButcheryYield` validates;
   `dressOut({ liveKg, fleshPct })`.
2. `platform/idea/api/CraftingLogic.ts` `applyTangibleOutput` — when
   `!primary` and `authoredMaterial` is empty, take `matched[0]?.material`;
   throw only when that is null too.
3. `platform/idea/cmd/bulk/FeedController.ts` — `slow-amendment` →
   organicMatter via `Soil`'s work-in face (`Soil.ts:175-190`); `compost`
   unchanged; help text gains a sentence.
4. Tests: `dressOut` (count line untouched; fraction × finish;
   `conditioned: false` ignores flesh); tangible-from-bulk; FeedController slow-amendment.

Acceptance: `lint:family` green; `unconsumed-seams` ≤ 19.
Commit: `build(carcass W1): the reconciliation slice — yield shape, bulk-made tangibles, bone into the soil`.

#### ✅ W1 — DONE

1. ⚠⚠ **The `feed` ordering had to change, and this is the wave's one
   real finding.** The plan said *"`FeedController` gains one branch"*. It
   needed a **reordering**: the headroom check ran before the source was
   resolved and was keyed on nitrogen, so a field with rich nitrogen and
   starved organic matter would have refused a sack of bone meal with
   *"the soil is already rich"* — a true sentence about the wrong reserve,
   and the most plausible way for this feature to ship dead. The material
   is now resolved first, the target reserve chosen from its tags, and the
   headroom read off **that** reserve. Pinned by a test that is the reason
   the file is worth reading (`⚠ rich nitrogen does NOT refuse an
   amendment the ground wants`), plus its mirror.
2. ⭐ **A slow amendment needs ground deep enough to improve**, and the
   refusal says which thing it cannot take (`no-amendment-reserve`): a
   `Field` seeds all four soil reserves in code, a garden-bed row authors
   two. So bone meal works on a field and is honestly refused by a
   windowsill, which is right.
3. ⭐ **D10's phosphorus correction holds up in the code**:
   `Soil.addOrganicMatter` already credits *a little nitrogen now and most
   of it later*, which is exactly what ground bone does in a field. No
   fifth reserve, and the shipped face says the true thing.
4. `Species.dressOut` carries `finishFactor` — the dressing curve lifted
   verbatim out of the retired stockyard controller, where it was a module
   constant beside a hardcoded table. ⭐ The tests pin that **the curve
   saturates**: `finish` clamps at 1, so everything past about flesh 93
   dresses the same and the dial's real question is *did you get it to
   finished at all*. `setButcheryYield` now **throws** on a share outside
   `(0, 1]` — `fraction: 40` would otherwise dress a 70 kg ewe out at
   2,800 kg of meat and nothing would say a word.
5. The tangible-from-bulk derivation cites `fix/2026-10-03-ordered-maker`
   as its precedent, in the same file and in the same words. ⭐ Its test
   file **also proves D6's premise before W6 needs it**: an ungated recipe
   (no discipline, no difficulty) with `makerMode: 'self'` resolves a
   maker and dips a candle, so a player with no trade can make one. An
   earlier draft of that test passed while every case declined
   `no-maker`, which is the shape of a test that proves nothing — the
   refusal case now asserts its reason.

⚠ **`unconsumed-seams` reports 18 against a ceiling of 19 and says the
ratchet can fall.** Left alone until W9: W3 consumes `dressOut` and
`getConditionAtDeath`, so the number moves again and ratcheting twice
would be noise. **W9 must lower `SEAM_CEILING`.**

Tests: 318 green across species, bulk, husbandry and the three
`CraftingLogic` suites — `Species.dressOut` 15 new, `FeedVerb` 7 new,
`CraftingLogic.dipped` 5 new.

### W2 — Ranching: one slaughter

Under `packages/content/trade-ranching/`:

- `src/idea/cmd/ranching/SlaughterController.ts` (new) — resolve target;
  D8 refusals on the live animal; read `herdId`/`headIndex`/flesh/handling
  **before** the kill; `await ConditionApi.die(animal, 'slaughtered')`;
  if `herdId` was set, `registry.returnHead(herdId, index, { note: 'slaughtered', flesh, handling })`
  + tally − 1 (the registry via `StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH)`);
  scene (*"It is quick. <It> goes down where it stood, and what is left
  is a body."* / peers); credit `STOCKMANSHIP`, `standard`.
- `content/trade/ranching/cmd/ranching/slaughter.yaml` (new) —
  `verbs: [slaughter]`; `target` `requires: HandlingMixin` (the dog must
  BIND so the refusal can be said); help says it leaves a body and
  `butcher` takes it apart with a blade.
- `content/trade/ranching/idea/cmd/ranching/SlaughterController.yaml` (new).
- **Delete** the ranching `ButcherController.ts`, `butcher.yaml`,
  `ButcherController.yaml`; `Livestock.commandContributions.peers`
  swaps `butcher.yaml` → `slaughter.yaml`. **No dead guards anywhere**
  (D14 deleted); `ReturnController`/`HandleController`/`BreedController` untouched.
- Species yields (`content/stuff/idea/species/…`): `ovis/aries` —
  stew-meat `{fraction: .40, units: 12}`, offal `{.10, 2}`, suet `{.04, 1}`,
  hide `{.08, 1, conditioned: false}`, bone `{.12, 2, conditioned: false}`;
  `bos/taurus` — .42/12 · .12/3 · .05/2 · .07/1 · .12/4; `sus/domesticus` —
  .50/12 · .12/3 · suet .08/2 · hide .06/1 · bone .10/2; `gallus/domesticus`
  — stew-meat `{units: 2}`, offal `{units: 1}`; `canis/familiaris` — **none**,
  with the comment that the absence is the refusal.
- `tallow.yaml` → `suet.yaml`; `base-library/…/animal-fat.yaml` tags;
  `trade-cooking/content/recipes/render-tallow.yaml` slot `category: suet` (D3).
- `packages/server/scripts/check-verb-collisions.ts` — delete the `butcher:` line.
- `pack.yaml` — `boot:` sync-read entries for the five farm species.
- Tests: rewrite `carcass-rows.test.ts` to walk the five species rows'
  `butcheryYield[].cut`; `slaughter.test.ts` — a drafted head dies and a
  `Corpse` with its herd's species and the head's mass/condition stands in
  its place; the book says `slaughtered` and the tally fell; a stubbed
  failing write leaves the corpse standing and the head `drafted`; the
  named and no-yield refusals; the dog binds.

Acceptance: `lint:verb-collisions`, `lint:controller-rows`, `lint:census`, pack suite.
Commit: `build(carcass W2): slaughter is a kill — the corpse is the join, the stockyard's butcher retired`.

### W3 — Cooking: `butcher` reconciled

Under `packages/content/trade-cooking/`:

- `ButcherController.ts` — reorder for a live target (D8); on a dead
  body: `species.dressOut({ liveKg: body.getMass().rawValue(), fleshPct })`
  where `fleshPct = body instanceof Corpse ? body.getConditionAtDeath() ?? 55 : 55`
  (import `Corpse` from `@saxonberg/server/mud/platform/agent/Corpse`);
  fraction lines mint `units` clones each `setMass(kgEach × (0.5 + 0.5 skill))`.
  Keep `ageAtKill(sinceDeath)`, `spillGut`, the block, the destruct.
  Update the *"today the only one is a fish"* comment: every corpse is
  `Contaminable` now.
- `butcher.yaml` — `verbs: [butcher]`; help: *"A live animal is slaughtered, not butchered."*
- `PreserveController.ts` — `recipeFor(target)`; `CureController` names its axis `solute`.
- `check-verb-collisions.ts` — delete the `dress:` line.
- Tests: live named / live unyielding / live yielding refusals; a 70 kg
  ewe's corpse yields twelve joints ≈ 0.40 × 70 × finish; a cow's yields
  more (AC3); a corpse carrying contamination passes it to the cuts;
  `recipeFor` picks a target-matching salt recipe.

Acceptance: `lint:verb-collisions`, pack suite.
Commit: `build(carcass W3): butcher takes the animal's own yield off its corpse, and dress is nobody's`.

### W4 — `trade-tanning`

Unchanged from the first draft's W3: scaffold from `trade-apiculture`;
server manifest + `pnpm install`; `base-library/…/organic/rawhide.yaml`
(tags `[organic, skin, rawhide, once-living]`, **not** `hide`;
`spoilActivationEnergy: 70000`, `waterActivity: 0.98`); `Tanning.ts`,
`Hide.ts`, `Tanpit.ts`; `TanController.ts` + row + `tan.yaml` (`hide`
`requires: TanningMixin`; `pit` declared with an MQL default and
narrowed to `Tanpit`); `tanpit.yaml`, `Discipline/leatherwork.yaml`,
`recipes/salt-hide.yaml` (`category: rawhide`, `cure: { solute: 0.55 }`,
output the hide row, `keywords: [salt-hide]`, no discipline);
`trade-ranching/…/thing/hide.yaml` → `class: /trade/tanning/thing/Hide`,
material rawhide; `trade-ranching/package.json` + tanning. Tests: the
clock, the refusals, `salt-hide` lowers `a_w`, the row/class walk.

Acceptance: `lint:instanceable`, `lint:perishable`, `lint:mixin-names`,
`lint:untitled`, `lint:instrument-args`, `lint:controller-rows`, pack suite.
Commit: `build(carcass W4): trade-tanning — the hide tans against the pit it stands in`.

### W5 — Forestry: bark

Unchanged from the first draft's W4: `barkPath` on `StandSpecies` +
`setMix`; `dropStandard` mints four bundles (and `fellPlantedTree` passes
`entry?.barkPath ?? null`); `thing/bark.yaml` (`Good`, oak-bark, 13 kg)
+ `stuff/idea/material/organic/oak-bark.yaml`; the oak-clearing entry.
⚠ Merge master first — the forestry pack is moving in a sibling build.
Tests: oak drops four, ash drops none (AC9).

Acceptance: `lint:census`, `lint:mass`, forestry suite.
Commit: `build(carcass W5): an oak gives its bark`.

### W6 — `trade-chandlery`

Unchanged from the first draft's W5: scaffold; `Candle.ts`; the candle
row moved (`shortDescription: candle` fallback stem; `lit: false`, fuel,
12 lm / 1900 K); `dip-pot.yaml`; `recipes/candle.yaml` + `melt-wax.yaml`;
`candle-stock` + appearance edits on `beeswax` and `tallow`; delete the
generic-objects row, the apiculture recipe and its test block. ⚠ Read
`MakeController.ts` in full first (the catalogue path, and how `with
<brand>` steers the bulk pick). Tests: one row, two materials; ungated;
`melt-wax` fills a dip-pot.

Acceptance: `lint:light-sources`, `lint:census`, `lint:descriptors`, both suites.
Commit: `build(carcass W6): trade-chandlery — one dip, two fats`.

### W7 — Bone and the dog loaf

Unchanged from the first draft's W6 (with the `content/recipes/` directory
created in `trade-farming`): `bone-meal` material + recipe; `dog-bread`
material, `dog-loaf` row, `dog-bread` recipe; a bread-counter line and
price. ⚠ Read `BakeController.ts` first; if `bake` is deed-gated the
drive `order`s the loaf.

Acceptance: `lint:census`, `lint:perishable`, packs' suites.
Commit: `build(carcass W7): bone goes to the field and the dog gets a loaf`.

### W8 — The world: the valley and the city's edge

Unchanged from the first draft's W7: the flock book, Moss
(`extends: /trade/ranching/agent/farm-dog`, `name: Moss`), the unnamed
collie cast, the butcher block, yard prose, hearts-delight `boot:` +
deps; the three Wharfside premises with vacant seats, boot producers,
exits from the bank; terminus deps.

Acceptance: `lint:openings`, `lint:dossiers`, `lint:light-sources`,
`lint:census`, `lint:kept-animals`, `lint:mass`, `lint:menu-staff`.
Commit: `build(carcass W8): the valley raises a flock; three vacant seats at Wharfside`.

### W9 — The drive, the suite, the MR

- `packages/wire/tests/carcass-chain.dirty.wire.test.ts` — the
  requirements' twenty steps plus **AC14 and AC15 checkpoints** (see
  W0), each able to FAIL. Clock jumps via `advanceWorldClock` under
  `isOwnedTestWorld()`: ~120 game days after the draft (wool), ~25 after
  `tan`, ~8 for the green hide left to rot.
- `grep -ln "butcher\|isDead\|body of" packages/wire/tests/*.ts` and
  update any drive that typed `butcher` at a live head or asserted a
  dead NPC object.
- Run it, fix what it finds, append the record, `pnpm test` once, push, open the MR.

Commit: `drive(carcass): <what driving found>`.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the corpse (every non-player death) | — (the transition) | — | `/stuff/agent/Corpse` row (generic-objects, which every killable pack already depends on) | the clone resolves the row on demand | — |
| `slaughter` | `trade/ranching/cmd/ranching/slaughter.yaml` | `Livestock.commandContributions.peers` | controller row; species `butcheryYield` rows | farm species resident (ranching `boot:`) | `requires: HandlingMixin` — stock AND the dog bind |
| `butcher` (reconciled) | cooking's view | a `bladed` construction in reach | species rows; `Species.dressOut`; `Corpse.conditionAtDeath` | `preloadAnatomy` in the controller | `body: requires: any` |
| `tan` | `trade/tanning/cmd/tanning/tan.yaml` | `Tanpit.commandContributions` | `TanController.yaml`; `tanpit.yaml`; `rawhide`; the hide row's class | the tannery yard is a boot producer | `hide: requires: TanningMixin`; `pit` declared with an MQL default |
| salting a hide | cooking's `cure`/`salt` | born-with | `salt-hide.yaml` + `recipeFor` | catalogue warm | `requires: any` |
| the candle | platform `make` / `order` | born-with (verify in `MakeController`) | two recipes; `candle-stock` tags; the row | catalogue warm | none, and no deed gate |
| bark | forestry `fell` | the stand | `barkPath`; `bark.yaml`; `oak-bark` | the clearing is live content | none |
| bone to soil | platform `feed` | born-with | `bone-meal` tags | — | `mustHaveBulkSlot` |
| the dog loaf | `bake` / `order` | the oven / the baker's seat | recipe + rows + price | the bakery is live | — |
| the flock | `draft` | `Herdbook.commandContributions` | `flock-book.yaml` | hearts-delight `boot:` producer | — |
| the seats | `apply` | `LookController` prints openings | three outfits with `headcount` | terminus `boot:` producers | closed `requires` vocabulary |
| the dog eats | the `feeds` brain | `BehavedMixin` on `WorkingAnimal` | `feedingStyle` includes `ground` | the yard is live | — |

---

## Acceptance-criteria coverage

| AC | waves |
|---|---|
| 1 alive → worn jerkin | W2 · W3 · W4 · shipped tailor · W9 proves |
| 2 same act, same object, same skill, same clock | **W0** (every death leaves the one `Corpse`) · W2 · W3 |
| 3 condition and species pay off | W1 (`dressOut`) · W2 (rows) · W3 (reads the corpse's stamp) |
| 4 `butcher` a farm dog refused | W2 (no yield) · W3 (live-target order) · W8 (the unnamed collie) |
| 5 a named animal refused differently | W2 + W3 (D8) · W8 (Moss) |
| 6 green hide rots; salted travels | W4 |
| 7 two candles, same command | W6 (+ W1's derivation) |
| 8 the fleece spins and weaves | W8 · shipped `shear` → `TextileStock` · shipped textiles |
| 9 oak gives bark, birch does not | W5 |
| 10 the dog eats a baked loaf | W7 · W8 · shipped `feeds` |
| 11 nothing a carcass produces has nowhere to go; no false claim | W2 (horn claim deleted) · W4 (hide) · W7 (bone, offal) · W3 (meat) · D3 (suet) |
| 12 three jobs vacant, takeable | W8 · W9 takes the chandler's |
| 13 `dress` means nothing twice | W3 |
| **14 a dead animal is a body, not a disabled animal** — sheep, shopkeeper and player alike | **W0** by construction (a `Corpse` composes none of a living thing's verbs; the player's corpse is the same class) · W9's checkpoint |
| **15 killing something mid-anything leaves a body and no wreckage** | **W0** (the `host-destroyed` abort, the resolved session, the inert destroyed proxy, the fox race test) · W9's two checkpoints (mid-fight, mid-errand); mid-journey by unit test only (a journey's driver check already catches a destroyed driver) |

No criterion is unmapped.

---

## Test & gate strategy

- **Unit, per wave**: listed inside each wave. W0's are the ones that
  matter most and they are enumerated above.
- **Only the drive can prove**: the five reachability links per
  capability; `make candle` for a player; the dog eating after the
  player leaves; the flock book filing; the three openings on `look`;
  **AC14's affordance list on a dead body and AC15's two kills**.
- **Gates by wave**: W0 `lint:gates`, `lint:field-meta`, `lint:census`
  (the row edit); W1 `lint:unconsumed-seams`; W2 `lint:verb-collisions`,
  `lint:controller-rows`, `lint:census`; W3 `lint:verb-collisions`; W4
  `lint:instanceable`, `lint:perishable`, `lint:mixin-names`,
  `lint:untitled`, `lint:instrument-args`, `lint:imports`; W5 `lint:census`,
  `lint:mass`; W6 `lint:light-sources`, `lint:descriptors`; W7
  `lint:perishable`; W8 `lint:openings`, `lint:dossiers`, `lint:kept-animals`,
  `lint:menu-staff`; W9 `lint:drive-scripts`.
- `pnpm test` runs **twice**: before the MR opens and at `/finalize`.

---

## Risks & opens

1. ⚠⚠ **Object identity now changes at every non-player death.** What
   protects the paths that have never seen it: (a) the inert
   destroyed-object proxy (`security.ts:1445` — a stale ref's method call
   returns `undefined`, never throws); (b) `SchedulerRegistry` terminates a
   destructed host's engagements `host-destroyed`; (c) `Behaved.onDestruct`
   tears down brains; (d) `Chattel.onDestruct` releases the record, which
   removes a pet from the pin roll; (e) `Persistable.markForRevert()`
   stops the dead capture; (f) `endWith` resolves a combat session before
   `die`'s tail destructs anyone; (g) `Journey` checks `isDestroyed()`
   before `isAlive()`. **What the build must check**, beyond W0's tests:
   `grep -rn "isDestroyed()" packages/server/src/mud/platform/idea/api/CombatLogic.ts`
   is zero — confirm every post-kill read of a victim happens inside the
   synchronous resolution (it does today by construction; a test pins
   it); brains that hold a target across beats (`herds`, `raids`,
   `follows`) re-resolve or null-check their target each beat; the
   `CombatGraph`'s edges to a destroyed combatant are dropped with the
   session. **What the drive covers**: AC15's two kills.
2. **The fox race** (a body destructed while in the dying window; `die`
   later runs on it): closed by the `isDestroyed()` re-checks after each
   `await` in the tail, pinned by a W0 test.
3. **A corpse where a Cast stood**: the room's `cast:` list re-mints the
   living shopkeeper on its next clone, exactly as it would have replaced
   a lingering dead object before. Recorded; not this build's.
4. **Orphan snapshots**: a destructed named pet's `holder_snapshots` row
   survives (nothing reads it once the chattel record is gone).
   `PersistableApi.deleteAllFor` exists if the sweep wants tidiness —
   a deferred seam, not a correctness problem.
5. **`make` and the catalogue** — confirm before W6 (first draft's risk 1).
6. **`bake` for a player** — the drive `order`s if gated (risk 2).
7. **Wool on a fresh draft is zero** — the drive jumps the clock (risk 3).
8. **The far-past guard and the 120-day jump** — draft, jump, act within
   one session (risk 5).
9. **Hide class move**: a hide is no longer a `Provision`; anything
   enumerating Provisions as food loses a thing that was never food.
10. **Rebase hazard on forestry** — merge master before W5.
11. **The knacker's "bring him" step** — a 70 kg carcass cannot be
    carried; the yard's works-board is how a knacker collects; the drive
    proves AC2 where the animal fell and visits the yard for AC12.
12. **`candle-stock` on tallow makes every tallow crock a candle source** — intended.
13. **`check-mass` ceiling** — every new Tangible row authors mass and material.
14. ⚠ **User question**: the tanner and knacker seats require `band:
    novice` in a Discipline a new player cannot yet hold; the chandler's
    is the one the drive takes. Drop to `{ gigs: 0 }` for day-one
    takeability — a row edit.
15. **A corpse's `keywords` merge** (D16) puts a person's name-keywords
    on their body (`look clerk` finds the body of the clerk). Intended;
    recorded because it is a visible change on the player path too.

---

## Deferred seams

- **A corpse does not remember it was named.** The mint carries no name
  stamp, so a dead pet's body is not refused by D8. → `pets-slate`.
- **Tap standing at draft.** → `ranching-slate`.
- **Orphan `holder_snapshots` rows after a pet's death** — a
  `PersistableApi.retire(host)` or a sweep over records with no chattel
  row. → the residency/persistence slate.
- **The pit's liquor as the dyer's tannin.** → `rendering-slate`.
- **`requiresReagent` on the `chemical` maturation arm** — the first
  `chemical` consumer decides. → `rendering-slate § 9`.
- **Promote the stand's felling facts onto `Species`.** → `forestry-slate`.
- **Horn, glue, gelatin, kibble, soap, droving, the shambles, the
  tanpit's effluent** — already assigned by the requirements.
- **The knacker as a collection round.** → `logistics-slate`.
- **The `BulkPayload` tannin field** — if a third liquor consumer wants concentration.

---

## Critical files

Read these first, in this order:

1. `/home/bobalu/play/saxonberg/build-1/docs/requirements/carcass-chain-requirements.md`
2. `/home/bobalu/play/saxonberg/build-1/CLAUDE.md`
3. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/idea/api/ConditionLogic.ts` (304–700: `dieImpl`, `playerBodyOf`, `divideBody`, `corpseIdentityFor`, `mintCorpseFrom`)
4. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/agent/Corpse.ts`, `lib/creature/Creature.ts` (140–180, 536–625), `lib/vitals/Vitals.ts` (144, 400–430), `lib/species/Organism.ts` (140–240, 325–350)
5. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/lib/persistence/Persistable.ts` (150–160, 215, 243, 340–360), `platform/idea/ChattelRegistry.ts` (`release`), `platform/idea/api/ResidencyLogic.ts` (770–810), `platform/idea/SchedulerRegistry.ts` (400–418), `api/security.ts` (1445–1485)
6. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/idea/api/__tests__/ConditionLogic.die.test.ts`
7. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/idea/api/CombatLogic.ts` (3590–3640 `endWith`, 3820–3920 the cull/coup/`killImpl`)
8. `/home/bobalu/play/saxonberg/build-1/packages/content/trade-ranching/src/behavior/raids.ts` (60–115)
9. `/home/bobalu/play/saxonberg/build-1/packages/content/trade-ranching/src/idea/cmd/ranching/ButcherController.ts` (to delete), `HandleController.ts` + `src/lib/Handled.ts` (the precedent), `src/agent/Livestock.ts`, `src/idea/HerdRegistry.ts`, `src/thing/Herdbook.ts`
10. `/home/bobalu/play/saxonberg/build-1/packages/content/trade-cooking/src/idea/cmd/crafting/ButcherController.ts`, `PreserveController.ts`, `DryController.ts`
11. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/idea/species/Species.ts` (36–60, 740–800, 1176–1200)
12. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/thing/Provision.ts`, `CraftVessel.ts`, `Lamp.ts`; `lib/material/WaterActivity.ts`, `Freshness.ts`
13. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/idea/api/CraftingLogic.ts` (1442–1530, 1560–1600, 2250–2260); `platform/idea/cmd/crafting/MakeController.ts`, `CraftController.ts`
14. `/home/bobalu/play/saxonberg/build-1/packages/content/trade-forestry/src/idea/cmd/forestry/FellController.ts`, `src/lib/Stand.ts`
15. `/home/bobalu/play/saxonberg/build-1/packages/content/trade-apiculture/` (the scaffold)
16. `/home/bobalu/play/saxonberg/build-1/packages/content/terminus/content/world/terminus/wharfside/dyehouse/`, `goods-yards/oilworks/`, `terminus/pack.yaml`; `packages/content/hearts-delight/`
17. `/home/bobalu/play/saxonberg/build-1/packages/server/scripts/check-verb-collisions.ts`
18. `/home/bobalu/play/saxonberg/build-1/packages/wire/tests/taps.dirty.wire.test.ts`, `packages/wire/src/harness/index.ts`
19. `/home/bobalu/play/saxonberg/build-1/docs/subsystems/mortality.md`, `race.md` (26–48), `ranching.md`, `maturation.md` (§ Generalization notes), `spoilage.md` (§ The water state), `content-packs.md` (§ The capability rung, § The boot union), `employment.md` (§ The opening)

Docs the sweep will touch: `mortality.md` and `race.md` (W0 does the
load-bearing passages in-commit; the sweep does the rest), `ranching.md`
(slaughter, the corpse), `crafting.md` (tangible-from-bulk),
`forestry.md` (bark), `spoilage.md` (the hide), `light.md` (the
candle's home), `fishing.md` (a dead fish is a corpse), a new
`docs/subsystems/tanning.md`, `content-packs.md`'s pack count, and the
`CLAUDE.md` verb-category line. `rendering-slate` and `textiles-slate`
get their stale lines corrected.

---

## Drive record

*(appended at build time, not at plan time — the output of running
`packages/wire/tests/carcass-chain.dirty.wire.test.ts` against the
running game: the command, the count, and what each failure was.
Precedent: `farming-plan.md § Checkpoint A`.)*
