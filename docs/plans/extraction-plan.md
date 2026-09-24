# Extraction — implementation plan

Executes [extraction-requirements](../requirements/extraction-requirements.md)
(seeded by [extraction-slate](../slates/builds/extraction-slate.md), whose
eight `Decided` rows are closed and not re-opened here). **Kind: feature.
Leads from: content** — a new trade pack `trade-quarrying` and its
workings lead — **over three kernel prerequisites** (the drying rate, the
`dig` verb, promoted ground improvement), each of which has its first
consumer inside this build. The plan also lands the **first half of the
RGO-interface unification early**, because this build forces it: the
geology field's model leaves the mining trade for a `/system/ground` pack
that mining and quarrying both read (D1).

Written 2026-09-23 against `master` at `2c4f075f7`. Every path below was
opened this cycle.

---

> ## ✅ W0 IS DONE — the ground build shipped it. START AT W1.
>
> **Landed 2026-09-24** (`build/ground`, MR !283). Everything the banner below
> anticipated is in the tree, and then some:
>
> - **`/system/ground` exists** — the 49th pack, holding `Deposit`,
>   `GroundCharacter` **and** `StrataMixin` (the five position reads lifted out
>   of `trade-mining`'s `WorkingMixin`, which composes over it). ⭐ Taking
>   `Strata` there rather than leaving it here is what lets **the quarry read the
>   column without depending on a mine** — so W1 can start as its own banner says.
> - **Every Location has a floor**, minted at `postRegister`, with the five-rung
>   material ladder and the derived ten-word kind.
> - **`dig` has a target.** `floor.getGroundKind()`, `floor.isOnGrade()` and
>   `floor.resolveUnderfoot()` (call it again after a strip) are the seam D9
>   wanted; `StrataMixin` is the pit's.
> - ⚠ **Reuse `earth/clay`** (`base-library`) rather than minting
>   `mineral/clay` — the ground build authored `earth/{loam,sand,clay}`,
>   `organic/peat` and `ceramic/concrete`.
> - ⚠ **A floor row must not author a `floor`/`ground` DETAIL** (it shadows the
>   object and hides the derived reading) and **must carry both words in its own
>   `keywords:`**. `lint:ground` clauses (d) and (f) enforce both.
>
> Read [ground.md](../subsystems/ground.md) before W1. The rest of this banner
> is the reasoning that produced that build, kept because it explains why the
> sequencing is what it is.
>
> ---
>
> **Amended 2026-09-23, after the plan's review.** W0 as written below creates
> `/system/ground` holding only the **geology** half. The review found that
> ground is modelled in **three** vocabularies owned by three different places,
> that **a Location has no material field at all** (180 Location rows; 27 mention
> a floor), and that the kernel already carries two *uninterpreted* citation
> slots for ground (`SpatialZone.deposit` and `.groundCharacter`) because a pack
> cannot add a field to a kernel class.
>
> It also found a probable live defect that has nothing to do with quarrying:
> **`sit`, `lie` and `kneel` all default to the keyword `ground` requiring
> `PosturedMixin`**, `ground` is not a special MQL keyword, **no Location
> composes `PosturedMixin`**, nothing attaches the `default-floor` row, and **the
> dorm room where every new player wakes has no floor.**
>
> **Therefore the ground work is its own build, and it lands FIRST** →
> [ground.md](../subsystems/ground.md). It ships: floors as
> universal Things, the five-rung *underfoot* ladder, the `onGrade` flag on the
> floor rather than the Location, and `/system/ground` holding the column **and**
> the seeded character (so `GroundCharacter` also leaves the farming trade).
>
> **What that does to this plan:**
> - **W0 does not run as written.** ✅ Confirmed landed — treat it as done and
>   start at W1.
> - **`dig` gets easier, not harder** (D9): the ground is already a bindable
>   `Stuff` with a composition and an `onGrade` answer, so `dig` reads the floor
>   instead of inventing a target. ⭐ This was the plan's largest unknown and the
>   ground build removes it.
> - **W1–W7 are unaffected in substance.** W3 gains the floor read as a
>   dependency and loses the need to invent one.
> - Sequencing for the whole roadmap: **ground → extraction → the bees wave on
>   ranching → the RGO-interface unification → foraging/hunting.** The
>   unification shrinks again, because the ground build does its hardest half.
>
> Nothing else in this document is stale. The 21 decisions, the other seven
> waves, the acceptance map and the risks all stand.
>
> ⚠⚠ **That last sentence is no longer true — see § Lens-pass amendments
> immediately below**, which supersedes nine decisions. Read it before W1.

---

## ⭐⭐ Lens-pass amendments (2026-09-24)

**This section is authoritative over the decision bodies it names.** Each
amended decision keeps its original text (so the reasoning survives) with
an `⚠ AMENDED` pointer back here.

Run at the user's instruction after a pre-build read of the plan found
four wrong literals and a gate failure. The design items were then put
through [design-lenses.md](../design-lenses.md); the naming and verb
questions were settled in conversation against the four disambiguation
tools on the table (unify the controller · subcommands · affordance
scoping · rename-or-broaden). ⭐ **Every fork below was decided by lenses
1 and 2, and the deciding limb is named** — the standing rule.

### A1 · One verb: `dig`, not `dig` + `quarry` (supersedes part of D9, D10)

**Decided by lens 1.** The plan split the two verbs on the **material
class** (earth → `dig`, rock → `quarry`). The real constraint is the
**tool**, which both views already declare, so the split taught the wrong
thing. Under one verb the refusals state the actual constraint:

> *"You would want a pick. That is rock."* · *"A pick will not shift
> drift — take a spade to it."*

Lens 2 confirms: a chalk pit, a gravel pit and the saltern face then need
**no new verb**. Zero migration cost — both verbs are new in this build,
so nothing ships them.

⭐ The template is `fell.yaml`, already shipped and already polymorphic
over three target shapes that share no mixin (a bole, a planted standard,
a bare species word that binds nothing). `dig`'s target stays
`requires: any`, declared, gating nothing; the controller narrows.

**`quarrying` is still earned** — the *working* decides the Discipline
credit, never the verb.

### A2 · `dig`'s mandate, and the trap that killed it last time

⚠⚠ **`dig` shipped once already and was withdrawn in review** (the
fishing build, MR !268) — *because the yield was hard-coded to a fishing
worm*. ⚠⚠ **And the requirements doc DID carry this** — *"`dig` was designed and
withdrawn during the fishing build … kept deliberately 'if the shape is
wanted back'"* (§ What already exists). **The plan lost it between phase 1
and phase 2**, keeping only the foraging consumer in § Deferred seams.
That is the interesting failure here, and re-hard-coding the yield as "a
band" would be the same mistake with a different constant.

> ⭐ **The mandate, and it belongs in the view's `description`:** *turn
> the ground over and see what comes up — the ground decides.*

That admits worms, turf, bands, clay and a buried cache. It excludes a
grave, a well, a posthole and a foundation: this tree consistently puts
**excavation-for-a-purpose** under its own verb (`ditch` for drainage,
`sink`/`drive` for workings), because there the product is *a hole that
persists and does something*, not a thing that comes up.

> ⭐⭐ **The guard against `dig` becoming a god-verb, stated as a test:**
> *if a new digging case needs the CONTROLLER to branch on what kind of
> digging it is, it is not `dig`.* That is exactly the test the withdrawn
> version failed.

⭐ What the withdrawn act settled, and this build must keep: the
instrument affords the verb (`digging`); the ground is the argument;
**what comes up is the ground's to say**. The soil ledger is already in
the tree (`SOIL_ORGANIC_MATTER_RESERVE_KEY`, `organicMatterFraction()`);
only `drawOrganicMatter` went away with the cut branch, so foraging adds
**one method** — which is what a clean seam looks like.

### A3 · `Diggable` is an interface only, and the resolution ladder is multi-host

**A gate decides this, not a lens.** D9's `class Diggables { static of() }`
cannot ship: `lint:lib-statics` sits at **exactly 337/337** and counts
every public static on an exported `lib/` class. And the precedent it
cites is gone — `class TravelNodes` in `lib/travel/TravelNode.ts` is an
**empty husk** (private constructor, no members), because
`TeleportController.ts:496` says the narrowing was *"inlined from
`TravelNodes` when this file turned out to be its only caller."*

So: `lib/ground/Diggable.ts` exports **the interface alone**, and
`DigController` carries a module-private `asDiggable()` — the live
pattern.

⭐ **And the ladder must try more than one host**, because extraction's
`Diggable` is answered by a **Location** (the working) while foraging's
will be answered by a **`Soil` host**:

> bound target (if it answers) → **the room** (if it answers) → **the
> room's floor** (every Location has one since the ground build) →
> refuse in words.

Writing that ladder now is what makes the foraging drop-in free instead
of a controller edit.

### A4 · `split` is the block's verb (supersedes D10's block fork)

**Decided by lens 2.** `dig block` is bad English and `quarry block` kept
a whole verb alive to serve one target. `split` is unclaimed, reads, and
— the load-bearing part — **names a shape that already has a second
member**: `fell bole` does this job today under a verb meaning something
else, as its own view admits (*"Fell a standard with an axe, or cross-cut
a felled one"*). A `Stackable` is the third candidate.

> **Mandate:** *divide an oversized or aggregated thing into usable
> units.*

Platform-owned (`platform/cmd/ground/split.yaml`), afforded by the
`Block`. So the unification wave inherits **a named pattern with three
members** instead of three ad-hoc overloads.

### A5 · `fire` is the platform's, on the furnace, and it burns (supersedes D14's act)

**Decided by lens 2, confirmed by lens 5.** D14 afforded `fire` from
`OpenWorkingMixin` and accepted that *"a potter's shed affording `fire`
is the ceramics build's own class"* — which is lens 2's named failure
mode verbatim (*a feature whose second instance requires a kernel edit*).
And the contradicting doctrine is **already written in the kernel**, at
`lib/fire/Furnace.ts:100`:

> *"The fire-appliance verbs are **afforded by the appliance** … a room
> with a furnace affords lighting it, dousing it, working its bellows,
> and bringing a workpiece to its fire."*

`FurnaceMixin` already affords five platform verbs on that principle.
Lens 5 agrees independently: firing a loaded chamber holds from Rome to
New York, and a limekiln, a bread oven and a crucible furnace are one
mechanism on different dials.

So: **`platform/cmd/device/fire.yaml`, `verbs: [fire, burn]`, afforded by
`FurnaceMixin`, and the charge decides what comes out.** The synonym is
not decoration — *"fire the kiln"* ambiguously means *light it*, which
`ignite` owns, and **a lime-burner burns lime**. `drive.yaml`'s
`verbs: [drive, drift]` is the shipped two-word precedent.

⭐ **The recipes do the work.** D14 shipped `burn-lime` and `fire-pot`
*"for the ladder and `help`"* while a bespoke act did the real work;
inverted, `fire` resolves the recipe whose input matches the charge —
lens 2's own worked example (*recipes are the single most expressive
thing for content authors*). D14's reason for avoiding recipes was that
`make` is deed-gated and `order` needs a maker on shift: both true, both
irrelevant, because `fire` is its own verb and neither gate is in its
path. A mixed charge now refuses *"nothing here matches a firing"*
rather than `one-charge-at-a-time`.

`smelt` **stays its own verb** — its chemistry genuinely differs (grade ×
metal fraction, not a recipe constant) and calling lime-burning
"smelting" would be a lens-1 lie. Recorded for the unification wave.

⭐⭐ **Consequence worth stating: `trade-quarrying` ships NO verbs.** It
becomes a Discipline, a location class, a mixin and rows — the shape lens
2 holds up as correct (`trade-hospitality` ships a venue pack with no
`src/` at all), and the next open-air RGO is rows.

### A6 · The drying rack earns a real term (supersedes part of D5, D7)

**Decided by lens 1, shape picked by lens 2.** As planned, the rack was
**arithmetically inert**: `ContainmentApi.placeOn` moves the item into
*the surface's container* — the room — and then stamps `restingOn`, so a
ham on the cookhouse rack and a ham dropped on the cookhouse floor had
the same container and the same air. `dry` resolved a rack arg, played a
line, and changed nothing.

Lens 1 says what it should teach: drying is **surface-limited** — the air
has to reach the water. A ham on a stone floor dries on top and goes off
underneath; cheese sits on slatted shelves; **turf is built into an
openwork lattice rather than a heap for exactly this reason.**

So **exposure is a fraction and the support carries it.** The read is
already there: `getRestingOn()` is `null` for a thing merely dropped in a
room and non-null for a thing on a surface.

- an authored field on the support, default **1.0** (a rack, a hook, a
  slatted shelf);
- lying on bare ground reads one dial, `cure.groundExposure` = **0.35**
  — one face to the air, nothing underneath;
- inside a non-Location container stays **0** (the enclosed case,
  unchanged — the sparse-storage guarantee).

Lens 2: one field plus one dial gives an author a drying rack, a meat
hook, a cheese shelf, a turf stack, a wire line and a bad drying shed out
of **rows**, where the alternative was a list of blessed drying
furniture. Lens 6 throws in the quiet win — **the rack becomes a good
worth buying**, where before it was decoration with no demand.

### A7 · Depletion: the number stays, the lesson moves into a row (supersedes AC 13's first half)

**Decided by lens 1.** The instinct was to shrink the pit so a face works
out. `LIFT_M` 0.5 against `faceRunM` 20 and a 4 m band gives **320 units**
— and that is *correct*: 160 m³ off a 4 × 20 × 2 m face, and a real
quarryman cut a few blocks a day. Shrinking it so one session exhausts it
is the world lying about scale, which is the exact failure lens 1 exists
to catch. **The arithmetic stands.**

Lens 2 supplies the lesson instead: **an author ships an exhausted
working.** So the Rejection quarry zone authors a **second room** — a
played-out working with `wonByBand` seeded at capacity — and AC 13's
first half is observable by walking between two rooms with **zero
grinding and zero new code**.

⚠ Not `old-workings.yaml`: that room is a played-out *copper prospect*
(mineral scrapes in the Ferrow's column, `scale: 0.55`), and a stone
quarry standing in for it would not read. Its own header already calls it
*"the depletion box, standing up as a place"* — the pattern is borrowed,
the room is not.

Lens 6's bonus: a stone quarry's binding constraint was never the stone,
it is **labour and haulage**, which is what logistics wants to teach.

### A8 · The mechanical corrections

Not lens questions — a gate failure and four wrong literals. Fixed
in place:

| what | was | is |
|---|---|---|
| D6's host | `SkyExposedMixin` | **`AtmosphericMixin`** — `SkyExposedMixin` composes onto **`Biome`**, one shared singleton per biome row, so a cached locality path there is right for one place and wrong for every other open-air room in the realm. `AtmosphericMixin` is on `Location` and `Vessel`. Also **non-persistent**: nothing integrates a backlog off it, so Soil's persisted tri-state is unwarranted. |
| D12 `organic/peat` | create it | ⚠ **already shipped by the ground build** — and with **no `fuel` tag and no combustion fields at all**, so W6's `Turf` would not light and D21's whole wet-turf arm would have nothing to read. **Edit the shipped row** to add the fuel column. |
| D12 `mineral/clay` | create it | ⚠ **do not** — reuse `earth/clay` (shipped, tagged `earth`). The top banner already said so; D12's body still said to mint it. |
| D18's parent extent | `'/world/rejection'` | **`/world/terminus/rejection`** (`parentParcel: /world/terminus`) — the plan's literal names a parcel that does not exist. |
| `PackLogic.discover.test.ts` | → 50 | **→ 51** (it is already 50 today; the plan's figure was computed when 48 was current). |

⭐ **Verified sound, so nobody re-opens them:** D14's *"`Forge` and `Kiln`
are byte-identical"* holds (the code is identical; only the doc comments
differ). D5's ~62 % preservation crossing is exact — `0.6 ÷ 0.97 = 0.619`
off `FRESHNESS_DEFAULTS.AW_FLOOR` and `awDefault`. D13's *"latent
photochemical defect"* is real: `reconcileCellarAir` fires for every
mechanism (`Maturing.ts:536`) and a photochemical row exists
(`trade-textiles/…/maturation/bleaching.yaml`), behind a room with an
`air` reserve. `dig` / `quarry` / `fire` / `split` / `burn` are all
genuinely unclaimed. And W3's dependency is real — the ground pack
exports `STRATA_MIXIN` plus all five position reads.

### A9 · Lens 6 on the drying blast radius — an argument FOR the accepted scope

Free air-drying does not make salt-curing pointless, it makes it **a
choice**: drying is free, slow and weather-dependent; salt costs money
and works in a wet week; and because hurdles stack multiplicatively,
doing both still beats either. The plan had a rule where the world now
has a decision. ⚠ Two edges nobody has priced: **a furnace still cannot
be refuelled** (the plan's own risk 7, wider now that a bread oven burns
fuel too), and **retail stock left on a counter now changes state.**

---

## Grounding

Condensed from the grounding brief; every fact was read out of the file
named. Line numbers are current at plan time.

### The geology field, and the one class that carries it

- `packages/content/trade-mining/src/idea/Deposit.ts` (699 lines) —
  `Deposit extends Idea` (no `SingletonMixin`; resolved by
  `StuffApi.singleton(path)` from `Working.resolveDeposit`, Working.ts:665).
  Interfaces: `Point`, `StratumBand { toZ, host }`, `GradeBand`, `Lode`,
  `DepletionBand`, `FeaturePin { feature?, mineral?, grade?, host? }`,
  `DepositFeatures`, `GroundSample { hostPath, hardnessMPa, inLode,
  mineralPath, ganguePath, grade, water, feature }`, `SurfaceReading`,
  `DipReading`. Reads: `sampleAt(at, seed)` (:339; the collar bound
  `const air = at[2] > 0` at :350), `hostAt(z)` (:484 — walks
  `stratigraphy` top-down, deepest band continues), `bandAt`, `waterAt`,
  `getWaterTable()` (:296), `static seedFor(address)` (:324, FNV-1a).
  ⭐ **A stratigraphic column is already modelled**: `stratigraphy[]` of
  `{ toZ, host: <Material path> }`. *A mine wins the lode; a quarry wins
  the host.* Nothing new is needed to describe clay over limestone over
  granite.
- The zone field `deposit` is **kernel**: `lib/zone/SpatialZone.ts:49,153`
  (`getDeposit()/setDeposit()`, a citation string the kernel never
  interprets — the `Locality._reach` contract). Rejection declares it
  once on the region zone (`rejection/content/world/rejection.yaml:46`,
  `deposit: /world/terminus/rejection/idea/deposit/ferrow`, `cellSize: 10`,
  `address: terminus/rejection`) and every sub-zone inherits it by the
  outward walk (`hanging-wood.yaml:6`, `kestrel-road.yaml:13`).
- The venue's row names the CLASS:
  `rejection/content/world/terminus/rejection/idea/deposit/ferrow.yaml` —
  `class: /trade/mining/idea/Deposit`, stratigraphy slate to −60 then
  granite, `waterTable: -45`, lode, four grade bands, one depletion box,
  one feature pin. **The only `Deposit` row in the game.**
- `Deposit` import sites (the migration's whole cost): `Working.ts`,
  `location/__tests__/authored.test.ts`, `behavior/__tests__/reads-air.test.ts`,
  `__tests__/exemplar.test.ts`, `__tests__/fringe.test.ts`, plus the ferrow
  row's `class:`.

### `WorkingMixin` — what a quarry mirrors, and what it does not

`packages/content/trade-mining/src/lib/Working.ts` (730 lines),
`WorkingMixin<TBase extends MixinConstructor<Stuff & Container>>`,
`WORKING_MIXIN = 'WorkingMixin'`.

- Ground-position reads that **any** working needs: `getCell()` (:378),
  `metresOf(cell)` (:388 — reads the zone's `cellSize`), `getDeposit()`
  (:401 — `zone.lookupField('deposit')` → `resolveDeposit`),
  `getGroundSeed()` (:413 — `AddressApi.resolveLocalityFor` →
  `Deposit.seedFor(address)`), `sampleHere()` (:419).
- Mine-only reads: `facesOf()` (:448 — iterates
  `NavigationApi.cardinalDirections()` only; `kind: 'seam' | 'carve-face'`
  by grade; `remaining: FACE_LUMPS(8) − workedFaces[dir]`; **no up/down
  face** — `sink`/`raise` are separate acts), `stabilityAt()` (:489),
  `groundTelegraph()` (:531), `supportHere()` (:551), `airAt()` (:574),
  `refreshAir()` (:621), `getTier()` (:430 — the ONE warren consult,
  `'spine'` when none).
- Persistent fields (:271–290): four prose banks (authorable), `oreRow`
  (authorable), `workedFaces: Record<direction, lumps>`, `blockedFaces`.
- Affordance (:254): `static commandContributions = { self, inventory }`
  naming the five `trade/mining/cmd/mining/*.yaml` views.
- Files that import it: `MineWarren.ts`, `location/{MineRoom,AuthoredWorking}.ts`,
  `idea/cmd/mining/{HewController,DriveController,ShoreController,MiningActController}.ts`
  (`workingOf` narrows with `MixinApi.isActive(room, WORKING_MIXIN)`),
  `behavior/delves.ts`, and five tests.

### The two location classes and the persistence gap

- `trade-mining/src/location/AuthoredWorking.ts` =
  `WorkingMixin(SingletonCartesianLocation)`, `static fieldMeta = {}`;
  **deliberately not `Persistable`** (*"a Held CARVED cell is the thing
  that needs a record"*). ⚠ Therefore `workedFaces` on an authored
  gallery is re-read from the template every boot. A quarry cannot
  accept that (Q2).
- `trade-mining/src/location/MineRoom.ts` =
  `PersistableMixin(WarrenMemberMixin(WorkingMixin(CartesianLocation)))`,
  keyed `<claimExtent>/<cell>` through `restoreOrSeed`.
- ⭐ The durable-singleton precedent is forestry's `Wood`
  (`trade-forestry/src/location/Wood.ts`):
  `PersistableMixin(StandMixin(SoilMixin(ReservedMixin(SingletonCartesianLocation))))`,
  minted through `resolveLanding → StuffApi.singletonOrClone → singleton()`
  (`api/stuff.ts:631,659`) — restore when a `holder_snapshots` record
  exists under the room's template path, else seed from the row and
  capture. `lint:locations` derives cartesian-ness from the `extends`
  chain through the import specifier
  `@saxonberg/server/mud/platform/location/SingletonCartesianLocation`
  (`Wood.test.ts` pins the specifier textually).

### The cross-pack seams that already exist

- ⭐⭐ **Pack-to-pack `src/` imports are sanctioned with the dependency
  line.** `scripts/check-mud-imports.ts:156–158, 210–214`: a
  `@saxonberg/content-<x>/…` import is allowed iff `<x>` is in the
  importer's `package.json` dependencies. Live examples: `tpa` imports
  `@saxonberg/content-arcana/src/lib/ManaPowered` (`TpaTerminal.ts:54`,
  `FastTravel.ts:70`); `trade-smelting` imports
  `@saxonberg/content-trade-mining/src/thing/Ore`; the water pack's
  works are imported by path from three packs. The rung check
  (`content-packs.md § The rung check`, rule 2) additionally requires the
  dependency when a ROW names another pack's class.
- `trade-fishing` chose the *other* shape for the water pack's register:
  a duck-typed `lib/FisheryRead.ts` + `StuffApi.singleton('/system/water/idea/FisheryRegistry')`
  (`idea/Waters.ts:40,73`) — no `src` import at all; the `content-water`
  dependency line exists for ordering and the rung.
- The `/system/` doctrine, verbatim in `packages/content/water/pack.yaml`:
  *"the works, as distinct from the physics… this pack owns what other
  packs' content NAMES… Nothing here is specific to one river."*
  `root: /system/water`, `requires.groups: [{ name: water, owner:
  { office: prime-minister } }]`, `requires.title: [{ extent:
  /system/water, holder: { group: water } }]`.
- A kernel verb reaches pack behaviour through a **declared shape**:
  `lib/travel/TravelNode.ts` — `interface TravelNode { renderDepartures,
  ride }` + `class TravelNodes { static of(stuff) }` (a thin static
  holder, blessed as *"the shape's one operation"*). The doc's own
  caveat: this works when the *capability* is the kernel's and only an
  *implementation* is the pack's.

### Drying today, and the guarantee the fix threatens

- `trade-cooking/src/idea/cmd/crafting/DryController.ts` is
  `recipeId() { return 'air-dry'; }` over `PreserveController.execute`
  (→ `CraftingApi.craft({ recipeRef, makerMode: 'self', target })`).
  `content/recipes/air-dry.yaml`: input `{ slot: meat, category: meat }`,
  `toolCapabilities: []`, `outputTemplate: /trade/cooking/thing/treated-cut`
  (a `Provision`), `cure: { moisture: 0.35 }` — **an instant constant, no
  time, no air.** `dry.yaml` (`verbs: [dry, hang]`, target `requires: any`)
  is afforded by `DryingRack extends Surface` on `peers`
  (`trade-cooking/src/thing/DryingRack.ts`); the rack row stands in
  `hearthworks/…/location/cookhouse.yaml`. `smoke-cure.yaml` authors
  `requiresHeatK: 320` + `cure.moisture: 0.55`; `salt-cure.yaml` authors
  `solute: 0.55` and a **bulk** salt slot `{ category: salt, measureL: 0.2 }`.
  The `food-safety.dirty.wire.test.ts:149` drive checkpoint asserts `dry`
  resolves with `/to dry/`.
- `packages/server/src/mud/lib/material/Cured.ts` (544 lines):
  `CuredMixin` — `_moisture = 1`, `_solute = 0`, `cureClockStamp`,
  reconcile-on-read behind a reentry guard (`getCureState()` :476).
  ⚠⚠ `reconcileCure()` opens `if (this._moisture >= 1) return; // nothing
  to regain; touch nothing` — documented as *the sparse-storage
  guarantee*. Statics on the `Cure` value class: `untreated`,
  `applyTreatment`, `blend` (:240), `equilibriumMoisture(h) = h/100` (:267),
  `advanceMoisture(m, elapsedS, humidityPct, rate = dial(cure.rehydrationPerHour))`
  (:281, **one-way, rising only**), `ambientHumidityOf(host)` →
  `BiomeApi.localHumidityFor`, `phraseFor(cure, bands)` (:333 — the
  four-band worded read already exists). `MixinApi.isCured` exists
  (`api/mixin.ts:1316`). Composed today on exactly one class:
  `platform/thing/Provision.ts:51–55`
  (`Crafted(Composed(Contaminable(Cured(ThermalDose(Freshness(Thermal(Detailed(Thing)))))))`).
- ⚠ `scripts/check-lib-statics.ts` is a **ratchet on world-level statics
  in `lib/`** ("does this static answer a question about the TYPE or the
  WORLD?"). Type-level construction statics are admitted; a new
  world-level static on `Cure` would raise the ceiling and fail the gate.
- `Freshness.ts:301`: `a_w = a_w(material) · moisture · (1 − solute)`;
  floor 0.60; `awDefault` 0.97 — the requirements' ~62 % threshold is
  arithmetic off these.
- Air reads: `BiomeApi.localHumidityFor(scope)` is **sync** and skips the
  weather deviation (`api/biome.ts:184–196`); `resolveHumidityFor` /
  `resolveWindFor` are async. `WeatherApi.weatherAt(timeS, locality)`,
  `precipitationBetween(t0, t1, locality)` and `segmentsBetween(t0, t1,
  locality)` are **sync and pure** but take a `Locality`
  (`api/weather.ts:96–165`); `WeatherDeviation` carries signed
  `temperature / humidity / wind / pressure`
  (`lib/weather/WeatherType.ts:87–96`); `WeatherSample.precipitation` is
  `'none' | 'rain' | 'snow'` (:547). ⭐ The sync-integral precedent is
  `lib/husbandry/Soil.ts:448–512, 600–616`: the host caches the covering
  Locality's template path (`_rainLocalityPath`, runtimeState, resolved
  once asynchronously, left unresolved when unplaced) and calls
  `WeatherApi.precipitationBetween` synchronously in the reconcile.
  `SkyExposedMixin` is `lib/biome/SkyExposed.ts` (`Mixins.SkyExposed`);
  `BiomeApi.isSkyExposed(scope)` is sync. `WeatherLogic`'s boundary
  fan-out (`WeatherLogic.ts:703–747`) restamps thermal contents of
  sky-exposed rooms with presence; **it stamps no humidity or wind**.
- Fire: `lib/fire/Combustible.ts` — ignition point and fuel value come
  from the material (`autoignitionTemperature`, `heatOfCombustion`);
  `getEffectiveAutoignitionK()` (:198) = base + `wetPenaltyK()` (:211,
  reads `WetMixin` saturation × `waterAbsorptionCapacity` × L_vap/c).
  `FireLogic.ignite` refuses `too-wet` (:162); `IgniteController.ts:71`
  renders *"It's too wet to catch."* `ignite.yaml` target
  `requires: CombustibleMixin|FurnaceMixin`. `platform/thing/Firewood.ts`
  = `Combustible(Thermal(Reserved(Thing)))`. ⭐ `Thermal.heatSourceK()`
  (`lib/thermal/Thermal.ts:564–575`) reads `litFurnaceK(self.getContainer())`
  — **a thing inside a lit furnace reads the fire's temperature.**
  Nothing refuels a furnace's `fuel` reserve today (only drains in
  `Combustible.ts:294`, `Furnace.ts:209`); furnace rows ship
  `reserves.fuel` at 100 %.

### Maturation — the closed vocabulary and the Bulkable gate

`lib/maturation/MaturationProfile.ts:42–121`:
`MaturationMechanism = 'microbial' | 'photochemical' | 'chemical'`
(closed, reason stated), `MATURATION_MECHANISMS`, `MaturationLines
{ starting, working, finished, turned, stalled, killed }`,
`MATURATION_LINES: Record<MaturationMechanism, MaturationLines>` (the
totality check is the `Record` type), `setMechanism` refuses an unknown
word (:387). Profile fields: `inputCategory` (matched against the
interior material's TAGS), `ratePerDay`, `stallBelowK/happyK/damageAboveK`,
`productMaterial`, `turnedMaterial/turnDays`, `sealedOnly`, `kind`,
`mechanism`, strain fields.
`lib/maturation/Maturing.ts`: the Bulkable requirement is enforced at
:360; `reconcileFerment()` (:413) is **sync**; `rateAt(profile, tempK)`
(:203) is the temperature ramp; `damageSat` (:215);
`ensureInteriorMaterial(path)` (:734) swaps the interior material and
keeps the amount; `reconcileCellarAir(self, days, converting)` (:136)
drains the room's air whenever a batch converts, **for every mechanism**;
the augmenter picks `MATURATION_LINES[mechanism]` (:304–345).
`platform/thing/Vat.ts`: `Fermenting(Crafted(Sealable(Thermal(Bulkable(Detailed(Thing))))))`,
`category = 'vat'` (rows depart), `setOpen/open/close/onMoved` all
reconcile first (window events, :60–110). `Bulkable` surface includes
`getBulkAmount/setBulkAmount/debitBulk/setBulkMaterial` (`lib/bulk/Bulkable.ts:722–762`).
`base-library/…/material/bulk/salt-water.yaml` tags `[liquid, brine, conductive]`.
The profile catalogue warms by class (`Template.findByClass`) over any
root's `idea/maturation/` subtree — a pack row needs no boot entry.

### Ground improvement, for the promotion

- `trade-farming/src/lib/Improvable.ts` (353 lines): `IMPROVABLE_MIXIN`,
  `IMPROVEMENT_JOBS = ['clearing','draining','liming']`,
  `IMPROVEMENT_BANDS`, `BAND_PHRASE`, `OWING_PHRASE`, `REVERT_PER_GAME_DAY`
  (0.004 / 0.0012 / 0.0006), interface `Improvable` (every method takes
  the `cost: ImprovementCost` as a parameter), `static commandContributions
  { self, inventory }` naming farming's `grub/ditch/lime/plough` views,
  fields `improvementWork` (authorable) + `improvementStamp`; the
  reversion reconcile (no far-past guard); `requiredFor(job, cost)`.
  ⚠ It imports `type { ImprovementCost } from '../idea/GroundCharacter'`
  — the bill type lives in farming's seeded model
  (`GroundCharacter.ts:130–140`: `{ clearing, stonePicking, draining,
  liming, terracing, total }`; `static improvementCost(sample)` :308).
- Composed by exactly one class: `trade-farming/src/location/Field.ts:170`
  `PersistableMixin(WarrenMemberMixin(ImprovableMixin(SwardMixin(FieldGround))))`.
  `Field` declares no `commandContributions` of its own.
- The acts: `trade-farming/src/idea/cmd/farming/FieldWorkController.ts`
  (base — `fieldOf(giver)` narrows the room **structurally** by
  `getGroundSpot` + `progressOn`, resolves the bill from `GroundCharacter`;
  `toolOf(bound, capability)`; `engageAct`; `credit()` → `agriculture`,
  which is a **platform** row `platform/content/platform/idea/Discipline/agriculture.yaml`;
  `LABOUR_PER_ACT = 1`) and five subclasses: `Grub`, `Ditch`, `Lime`,
  `Plough`, `Mow`. Views `trade-farming/content/trade/farming/cmd/farming/{grub,ditch,lime,plough,mow,plot}.yaml`;
  `ditch.yaml`/`grub.yaml` declare the tool arg `default:
  "me:i:[capability.digging]"`, `requires: [ToolMixin]`. `lime` takes
  anything carrying the `liming` material TAG (`LimeController.ts:39`);
  marl (`trade-farming/…/material/mineral/marl.yaml`) answers it today.
- `trade-farming/src/thing/Spade.ts` — `Spade extends ToolItem`, affords
  `plot` on `self` and `measure` on `peers`+`environment`; row
  `spade.yaml` `capabilities: ["digging"]`. Mining's `shovel.yaml` is a
  plain `/platform/thing/ToolItem` with `capabilities: ["digging"]`.
- `soil.md § The split`: *"Not `/system/soil`, yet… Promote when a third,
  non-farming consumer appears."* `GroundCharacter` (the seeded half)
  stays farming's under that rule; this build does not move it.

### Acts, instruments, goods, furnaces

- `trade-mining/content/trade/mining/cmd/mining/hew.yaml` declares **one
  arg, `face: string`** — no instrument. `HewController.ts` reads no tool.
  `pick.yaml` offers `["winning", "striking"]`; `winning` is consumed by
  nothing but the archetype kit slot
  (`trade-mining/content/archetypes/mining.yaml:40`, reported never
  enforced). `scripts/check-capabilities.ts`: *required-never-declared*
  ceiling 0; *declared-never-consumed* is a census ratchet (may fall).
- `MiningActController.ts` (`workingOf`, `decline`, `groundPermits`,
  `paceForGround`, `engageAct`) and forestry's `ManualBuildController.engageStep`
  are the two engaged-act bases; completions are **module functions over
  captured locals** (a controller is destructed when `execute` returns).
- `trade-forestry/src/thing/Bole.ts` — `DetailedMixin(Thing)`,
  `lengthsLeft`, `@Final takeLength()` (mass and count move together),
  `static commandContributions.self: ['trade/forestry/cmd/forestry/fell.yaml']`,
  a `lengthsAugmenter`. Row `bole.yaml` `mass: 675`. `fell.yaml`: target
  `requires: any` (polymorphic — a bare species word binds nothing), axe
  `default: "reachable:[capability.felling]"`, `requires: [ToolMixin]`.
- `trade-mining/src/thing/Ore.ts` = `StackableMixin(Thing)` + `grade`;
  `onMerged`/`onSplit` hooks mass-weight it (`lib/stuff/Stackable.ts:76–290`).
- Recipes match a slot's `category` against the input **material's tags**:
  `trade-smelting/content/recipes/cast-pig-iron.yaml` `{ slot: fuel,
  category: fuel, kind: item, count: 4 }`; `SmeltController.isCharcoal`
  (:689) = material tags include `fuel` AND `carbon`; `isOre` (:674) is
  structural (`metalFractionOf`). `BLOOM_SLAG = 0.3` (:155) is the slag a
  bloom carries; `runCharge` (:377) mints product + slag and
  `setSlagFraction`. `SLAG_ROW = '/trade/smelting/thing/slag'`. Every
  fuel item in the furnace is destructed (:412).
- ⭐ `trade-smelting/src/thing/SmeltingFurnace.ts:28` =
  `ContainerMixin(Forge)` — **the kernel `Forge`/`Kiln` are not
  Containers; the trade ships a thin subclass that holds a charge and
  affords `smelt`** (`environment` + `peers`). `smelt.yaml` declares the
  furnace arg `default: "reachable:[mixin.FurnaceMixin]"`. `platform/thing/Kiln.ts`
  = `Furnace(LightSource(Reserved(Thermal(Thing))))`; row
  `generic-objects/content/stuff/thing/Kiln.yaml` (1200 K, bellows
  ×1.25) — referenced by nothing.
- `MakeController.ts:29–40` is **deed-gated** (`requireDeed`) and runs a
  recipe SCRIPT (`ScriptApi.invoke`); `OrderController.ts:138` resolves
  with `makerMode: 'fulfilling-bartender'` (a maker on shift). Neither
  can fire a kiln for a lone quarrier; `CraftingLogic.ts:2085–2135` is the
  heat gate (`reachableHeatK`, medium cap, `insufficient-heat`).
- `outputApplication` takes `tangible | bulk | edible`. `PlantPot` rows
  are farming's only (`trade-farming/content/trade/farming/thing/pot/*`);
  the class is kernel `platform/thing/PlantPot.ts`.
  `platform/thing/UnboundedReceptacle.ts` exists; rows:
  `generic-objects/…/fixture/water-butt.yaml`, `basin.yaml`.
- Materials in the commons (`base-library/content/stuff/idea/material/`):
  `rock/{granite,slate}` (granite `hardness: 200`, `tags: [rock, igneous,
  …]`), `mineral/{chalcopyrite,goethite,malachite,quartz,siderite}`,
  `caustic/quicklime` (tags `[mineral, caustic, alkali]`, `corrosiveTo`),
  `bulk/{salt-water,water,…}`, `ceramic/ceramic`, `organic/{horn,leather,rubber}`,
  dirs `food/`, `element/`, `wood/`. **Absent:** limestone, coal, halite,
  peat, clay, any overburden/drift. `marl` is `trade-farming`'s.
- Salt: `trade-cooking/content/trade/cooking/idea/material/salt.yaml`
  (`ConsumableMaterial`, `waterActivity: 0.15`, `spoilActivationEnergy:
  60000`, tags `[solid, food, salt, seasoning]`), referenced by exactly
  two rows: `salt-sack.yaml:12` (a `Bottle`, `category: sack`) and
  `kitchen-salt.yaml:24`. The recipe slot `category: salt` is a tag and
  needs no change.
- `stake`: `StakeController.ts:60–160` requires a `ClaimsRegister`
  (`trade-mining/src/thing/ClaimsRegister.ts`, field `warrenPath`,
  affords `stake` on `environment`+`peers`) naming a `MineWarren`,
  parses a 3-number block, `warren.overlappingClaim(from, to)`, then
  `ParcelApi.subdivide(extent, mine, { kind: 'player', templatePath:
  giver.getIdentityPath() })` + `transfer`. `ParcelApi.subdivide(childPath,
  parentExtent, owner, area = 0, storeys = 1, landUse = null)`
  (`api/parcel.ts:144`); `ParcelApi.ownerOf(path)` (:75).

### Places and packs

- Rejection (`packages/content/rejection`, **no `src/`**): depends on
  base-library, generic-objects, platform, trade-forestry, trade-fuel,
  trade-mining, trade-smelting, trade-smithing, transport. Title claims:
  `/world/rejection` (group `rejection`), `kestrel-road` (wild),
  `hanging-wood` (agricultural). `location/old-workings.yaml`:
  `SingletonCartesianLocation`, `coords {2,4,0}`, exits `southwest →
  location/hillside`, `northeast → location/fringe-claim`, prose *"Somebody
  built a wall out of the bigger pieces and then stopped building it."*
  `kestrel-road/tips.yaml` — the spoil bank.
- The Weeping Moor is **`world-seed`'s** (`world-seed/content/world/moor.yaml`
  — `CartesianZone`, `cellSize: 3.0`, no `deposit:`; rooms
  `stormy-heath` (`SingletonCartesianLocation`), `heath-mere`
  (`/system/water/thing/Shore`, `reachRef: holloway:head`), `heath-floor`
  (a `Floor` thing), `weeping-chamber`, `weeping-floor`). `world-seed`
  depends on platform, transport, water; **declares no title** — it rides
  the platform's `/world` claim (its own header says so), so the moor is
  titled.
- The estuary is **`terminus`'s** (`terminus/content/world/terminus/estuary/{estuary-mouth,lower-towpath,reach}.yaml`;
  `reach` has `_address: terminus/city/wharfside/reach`, biome
  `outdoor/baseline`, `media: [ground, water]`). Terminus depends on
  arcana, corpo-goodkin, corpo-vionne, distribution, generic-objects,
  platform, residence, saxonberg-lounge, tpa, trade-baking, trade-brewing,
  trade-distilling, trade-farming, trade-haulage, …
- `props:` is the fixture designation (`hearthworks/…/cookhouse.yaml:37`).
- Pack registration: `pack.yaml` (`id · version · root · description ·
  requires`), `package.json` (`@saxonberg/content-<id>`, `private`,
  `type: module`, workspace deps), `tsconfig.json`, `vitest.config.ts`,
  `content/`, `src/`; the root `package.json` workspace dependency
  (48 `@saxonberg/content-*` lines today); and
  `packages/server/src/mud/platform/idea/api/__tests__/PackLogic.discover.test.ts:63`
  asserts **`toHaveLength(48)`** with ordering claims at :64–110. No
  `boot:` is needed by anything in this build (`Deposit` is resolved by
  `singleton`; the profile catalogue warms by class).
- Disciplines: 68 rows; `mining` (`iscedf: "0724"`, `trade-mining/content/trade/mining/idea/Discipline/mining.yaml`),
  `silviculture` (0821, `specializes: [agriculture]`), `colliery` (0722 —
  the charcoal-burner; **never name coal work `colliery`**). Credits are
  `giver.creditDeed({ discipline, difficulty, outcome })` after
  `MixinApi.isAdvancing(giver)`. Competence-banded reads: the fishing
  `Shore` (`water/src/thing/Shore.ts`, `DEFAULT_READ_DISCIPLINE`,
  `readFor(standing, band)`) is the precedent to copy.
- Verb names: `dig · quarry · fire · burn · strip · win · pare` are
  claimed by no view (`grep '^verbs:'` over every pack); `cut` is
  tailoring's, `hew` mining's. Platform command categories today:
  `author banking boundary bulk charactergen civics combat crafting
  device employment governance inventory medical movement perception
  posture retail shell social stream system work` — no `ground`.
- The lint roster (`packages/server/package.json:36–82`) — the gates this
  build is most exposed to: `lint:imports`, `lint:instanceable`,
  `lint:locations`, `lint:census`, `lint:untitled`, `lint:capabilities`,
  `lint:instrument-args`, `lint:arg-kinds`, `lint:mixin-names`,
  `lint:verb-collisions`, `lint:perishable`, `lint:doneness` (a heated
  recipe with no `maxHeatK` raises a ratchet), `lint:lib-statics`,
  `lint:person-keys`, `lint:module-scope`, `lint:gates`,
  `lint:test-bootstrap`, `lint:drive-scripts`. Run as one:
  `pnpm -C packages/server lint:family`.
- Wire drives live at `packages/wire/tests/<feature>.dirty.wire.test.ts`
  (`forestry.dirty.wire.test.ts` is the nearest shape; exports
  `DIRTY_REASON`).

---

## Plan-level decisions

Numbered so waves and commits can cite them. Where a design lens decided
a fork, the limb is named.

**D1 — `/system/ground` exists.** ⚠⚠ **Amended: the GROUND BUILD creates it,
not this one, and it holds both halves of ground rather than only geology** →
[ground.md](../subsystems/ground.md). The reasoning below is why the
pack must exist and is unchanged; what changed is *who ships it* and *how much it
holds*. Read the banner at the top of this plan first. The original text follows.

**D1 (as originally written) — `/system/ground` exists, and this build creates it.** The geology
field's model leaves `trade-mining` for a capability pack `ground`
(`@saxonberg/content-ground`, `root: /system/ground`). *Why a system and
not a trade dependency:* the deposit **row** a locality authors names the
`Deposit` **class**, and a clay-pit town with no mine must not depend on
the mining trade to say what its ground is made of — *the ground is true
whether or not anyone digs it* (`CLAUDE.md § The five namespace axes`),
exactly as `FisheryRegistry` is the water pack's and not fishing's. What
moves: `Deposit.ts` whole (class + every exported interface) →
`ground/src/idea/Deposit.ts` (`/system/ground/idea/Deposit`); and the
**ground-position reads** extracted from `WorkingMixin` into a new
`ground/src/lib/Strata.ts` — `StrataMixin<TBase extends
MixinConstructor<Stuff & Container>>`, `STRATA_MIXIN = 'StrataMixin'`,
interface `Strata { getCell(); metresOf(cell); getDeposit(); getGroundSeed();
sampleHere(); }`, plus the private `resolveDeposit`. What stays mining's:
prose banks, `oreRow`, `workedFaces`/`blockedFaces` (direction-keyed —
they are the gallery's face model), `facesOf`, `stabilityAt`,
`supportHere`, `groundTelegraph`, `airAt`/`refreshAir`, `getTier`, the
five-act affordance. `WorkingMixin(Base)` becomes `class WorkingMixin
extends StrataMixin(Base)`; its `_mixinName` and `WORKING_MIXIN` are
unchanged, so `MiningActController.workingOf`, `MineWarren`, `delves` and
the tests keep their narrowing. Imports switch to
`@saxonberg/content-ground/src/idea/Deposit` and `…/src/lib/Strata` with
the dependency line (the tpa→arcana shape). The ferrow row's `class:`
becomes `/system/ground/idea/Deposit`; rename ⇒ **drop the dev DB**, no
migration. **What this leaves for the unification wave** (recorded, not
built): the seeded × derived seam (`GroundCharacter` stays farming's
under soil.md's third-consumer rule — the turbary's bill is its own, not
a `GroundCharacter` read); a `Cover` for stand/sward; the pin walk's home;
and whether `Strata` and `Soil` are two faces of one ground object. The
promotion is **W0 and lands alone**, mining behaviour unchanged.

**D2 — The column is the whole model; a band says what winning it
mints.** `StratumBand` gains one optional field, `wins?: string`: a
template-row path (a discrete good) **or** a material path (a bulk good —
recognised by the `/idea/material/` infix). When absent the consumer
applies a default (D6). Bands are **earth or rock by the host material's
tags**: a host tagged `earth` (drift, clay, peat — all new rows) is dug;
anything else is quarried. No new type, no new field on `Deposit` beyond
`wins`.

**D3 — An open working is a place whose wall is a section.** The face set
of an open working is **every band exposed between the surface (z = 0)
and the current floor, plus the floor itself**. There is no `up`: the
column is sampled at `z ≤ 0` only, so the collar rule is structural, and
`quarry up` refuses `no-face-above`. Deepening the floor exposes more
bands; the floor stops at the deposit's water table (`at-the-water` —
below the water is `mining-slate`'s). **Overburden is the earth above the
first rock band**: while the floor is still in earth and no rock is
exposed, the working reads *buried* and `quarry` refuses
`under-overburden` in words that say what to dig. Each act on the floor
band removes one **lift** (`LIFT_M = 0.5`) and mints one unit; an act on
an exposed wall band **retreats** it and mints one unit without deepening.
Depletion is a per-band ledger `wonByBand: Record<hostPath, units>`;
capacity per band = `ceil(thicknessM / LIFT_M) × ceil(faceRunM / LIFT_M)`
where `faceRunM` is authored on the working (default: the zone's cell
size) — how far this pit may retreat a face inside its claim. *Thinning*
and *worked out* read off `remaining/capacity` in words (lens 3: never a
number). Width is prose; depth is one number (slate Decided #7).

**D4 — The working keeps a record; the turbary is the same shape plus
improvement.**
`OpenWorking = PersistableMixin(OpenWorkingMixin(StrataMixin(SingletonCartesianLocation)))`
(the `Wood` composition; minted and restored by `singleton()`; key =
the room's template path). Persistent fields: `floorDepthM`, `wonByBand`,
`faceRunM` (authorable), `spoilTo` (authorable path | null).
`Turbary = PersistableMixin(ImprovableMixin(OpenWorkingMixin(StrataMixin(SingletonCartesianLocation))))`
adding `subsidenceM` (persistent) and the host hook `improvementBill()`
(D8). Peat remaining = `peatThicknessM − floorDepthM − subsidenceM`; the
subsidence reconcile (reconcile-on-read, no far-past guard, the
Improvable shape) advances `subsidenceM` by `SUBSIDE_M_PER_DAY ×
progressOn('draining', bill) × days`. **`ImprovableMixin` is NOT composed
on `OpenWorking`** — ditching a stone pit would have no consequence in
this build (below-the-water is a non-goal) and a verb that does nothing
is `lint:does-nothing`'s antipattern; the requirement's *"you ditch a
road, a yard and a quarry"* is the argument for the kernel home, and the
pit sump is recorded as the seam the mining slate's pump lands on.

**D5 — The drying arm is two-way, gated on exposure, and the guarantee
is restated rather than lost.** ⚠ **AMENDED → § A6:** the exposure gate as written made the rack
arithmetically inert; exposure is now a FRACTION carried by the support. `reconcileCure()` returns without a
write when **nothing would change**: enclosed hosts at `moisture ≥ 1`
(the ration in a pack, the cut in a chest, the sack in a pantry — the
common case), and any host whose air is at equilibrium. *Exposed* means
the host's immediate container is a **Location** (a thing on a floor, or
resting on a surface in a room — `placeOn` moves the item into the
surface's room and stamps `restingOn`); anything inside a non-Location
container (a body's inventory, a sack, a chest, a pot) is enclosed and
never dries. This is honest physics — a ham in a closed sack does not
dry, one on a rack does, a turf stack is built open to the wind — and it
keeps sparseness for carried and stored goods. Exposed hosts dry toward
`equilibriumMoisture(h)` at `cure.dryingPerHour × air.evaporationFactor()`
and re-wet toward it at the shipped `cure.rehydrationPerHour`;
`advanceMoisture` (an existing, counted static) becomes two-way by
gaining an `air` argument — **no new world-level static on `Cure`**
(`lint:lib-statics`). The passive drying of every exposed `Provision`
that follows is the requirements' explicit lift of the prohibition (*"a
damp cellar preserves nothing; a dry loft preserves slowly"*), and the
~62 % crossing is arithmetic off shipped numbers.

**D6 — The shared rate is a value object; the world is read by the
Api.** ⚠ **AMENDED → § A8:** the locality memo hosts on `AtmosphericMixin`,
not `SkyExposedMixin` (which composes onto `Biome`), and is not persisted. `lib/material/Evaporation.ts` — a **named value object** (the `Light`
category): `Evaporation { humidityPct, windMs, tempK }`, constructed with
`new Evaporation(humidityPct, windMs, tempK)` and **carrying no statics at all**
— `scripts/check-lib-statics.ts:48–94` counts *every* public static on an
exported `lib/` class against `LIB_STATICS_CEILING = 337`, type-level or
not, so a construction static would raise the ceiling — with instance
methods
`evaporationFactor(equilibriumRhPct = 100) = max(0, (eq − h) / eq) ×
(1 + windMs / AIR_WIND_REF_MS) × 2^((min(tempK, 373) − 293) / 10)` (the
boil cap: a liquid does not exceed 373 K) and `rewets(): boolean`.
Reading the world is `BiomeApi.airFor(scope): Evaporation` (sync — the
containment walk's authored `_humidity`/`_wind` overrides and biome
defaults, plus the **weather deviation** when the first sky-exposed scope
knows its Locality) and `BiomeApi.airSegmentsFor(scope, t0S, t1S):
AirSegment[]` (sync; piecewise over `WeatherApi.segmentsBetween`; one
segment when indoors or unresolved). To make the weather reachable
synchronously, `SkyExposedMixin` gains `_weatherLocalityPath`
(runtimeState) resolved lazily and once — **the `Soil._rainLocalityPath`
shape verbatim** — and a sync `weatherLocality(): Locality | null`. Both
consumers (the Cured arm, the evaporative profile) read through these two
Api statics; neither computes a rate of its own.

**D7 — `dry` is the hanging act; the instant recipe is retired.** ⚠ **AMENDED
→ § A6:** the rack now carries a real exposure term, so `dry` changes
something.
`DryController` no longer crafts. It places the target on the rack
(`ContainmentApi.placeOn`), requires the target compose `CuredMixin`
(`not-dryable` otherwise), narrates the **drying prospect in words** from
`BiomeApi.airFor(room)` (*"In this air it will take about a week"* —
the time to reach `cure.band.driedAt` at the current factor, via
`GrammarApi.inWords`; *"Nothing will dry in this air"* at equilibrium),
and credits `cooking` (`easy`). `air-dry.yaml` is **deleted** — its
`cure.moisture: 0.35` was the lookup table dressed as physics. The rack
is a declared instrument arg (`default: "reachable:[class.DryingRack]"`,
the `stake.yaml` class-atom shape). `smoke-cure.yaml` and `salt-cure.yaml`
are untouched: smoking is a fire act whose rate the recipe already
denominates in heat, and curing has no moisture arm. The
`food-safety.dirty.wire.test.ts:149` checkpoint's `/to dry/` still
matches the new self-line (*"You hang … up to dry."*).

**D8 — Improvement is promoted whole, and the bill becomes a host
hook.** `lib/ground/Improvable.ts` (kernel): the mixin, `ImprovementCost`
(moved out of `GroundCharacter`), jobs, bands, phrases, reversion rates;
`Mixins.Improvable = 'ImprovableMixin'` + `MixinRefusals.ImprovableMixin:
"{} is not ground anybody could improve"`. The method signatures keep
their `cost` parameter (so `Field`'s callers are untouched), and the
interface gains one **host hook**, `improvementBill(): Promise<ImprovementCost>`
— *what does this ground owe?* — which `Field` answers from
`GroundCharacter.improvementCost(sample)` (farming's seeded model stays
farming's) and `Turbary` answers from its peat (`draining` scales with
peat thickness, `clearing` a small constant for the heather, `liming`
from acid peat, `stonePicking`/`terracing` 0). The three pure-improvement
acts move to the platform: views `platform/cmd/ground/{grub,ditch,lime}.yaml`
(a new **`ground`** category — *working the ground with a spade*; the
CLAUDE.md category list is an index line left to the sweep), controllers
`platform/idea/cmd/ground/{GroundWorkController,GrubController,DitchController,LimeController}.ts`.
`GroundWorkController.groundOf(giver)` narrows the room by
`MixinApi.isImprovable(room)` and calls `room.improvementBill()`; it
credits `agriculture` (a platform row — drainage is land improvement
whoever does it). `plough` and `mow` stay farming's: farming keeps a
thin `FieldWorkController extends GroundWorkController` (imported by
package specifier, the `PreserveController → CraftController` shape)
that adds the sward-shaped `fieldOf()`. ⚠ `Field` must now declare its
own `commandContributions` listing the three platform views **and**
`plough` — a class's own static SHADOWS the composed mixin's (the
`Panel` precedent). ⚠ The pack-registered mixin name becomes the kernel's
(same string; the pack file is deleted, so `lint:mixin-names` sees no
duplicate). **Host-placement claim on `Turbary`:** clearing (scrub on a
moss), draining (the lesson), liming (acid peat) are all honest jobs on
a bog — the fens were reclaimed exactly this way — and a zero bill line
already reads *"this ground wants no …"*. No guard is needed to
re-narrow the host set, which is the test.

**D9 — `dig` is the platform's, afforded by the instrument, and the
ground answers a shape.** ⚠⚠ **AMENDED → § A1, A2, A3:** `dig` absorbs `quarry`;
`Diggables.of` cannot ship (`lint:lib-statics` is at 337/337 and
`TravelNodes` is an empty husk); the ladder is multi-host; and ⚠ `dig`
was WITHDRAWN in review once already — read A2 before writing it. View `platform/cmd/ground/dig.yaml` (`verbs:
[dig]`; `target` object `requires: any`, polymorphic — a bare band word
like `dig clay` binds nothing and lands as `raw`, the `fell.yaml` shape;
`tool` `default: "me:i:[capability.digging]"`, `requires: [ToolMixin]`),
controller `platform/idea/cmd/ground/DigController.ts`. **Affordance:** a
new kernel class `platform/thing/Spade.ts` (`extends ToolItem`,
`commandContributions.self: ['platform/cmd/ground/dig.yaml']`). Farming's
`Spade` becomes `extends` the kernel `Spade` (via
`@saxonberg/server/mud/platform/thing/Spade`) and re-lists `dig` beside
`plot` and `measure` (shadowing); mining's `shovel.yaml` is re-classed to
`/platform/thing/Spade` ("code is shared, content is copied" — the row's
prose is untouched). **The ground's half is a declared shape**,
`lib/ground/Diggable.ts`: `interface Diggable { dig(by: Stuff, tool:
Stuff & Tooled, what: string | null): Promise<DigOutcome> }` and
`class Diggables { static of(stuff): (Stuff & Diggable) | null }` — the
`TravelNode`/`TravelNodes.of` shape, and its test: remove every pack and
`dig` still does something correct (refuses `nothing-to-dig` in words:
*"You turn a spadeful over and put it back. There is nothing here worth
digging."*). Consumers in this build: `OpenWorkingMixin` (spoil, clay)
and `Turbary` (turves); the foraging build's soil draw is the recorded
next consumer. The controller resolves the ground as the bound target if
it answers the shape, else the room the actor stands in; verbs live on
the object (`ground.dig(...)`), the controller narrates and credits.

**D10 — `quarry` is the trade's act, on the mine's shape.** ⚠⚠ **AMENDED → § A1, A4:**
there is no `quarry` verb. Winning a face is `dig`; splitting a block is
`split`. The refusal list survives; the controller is `DigController`'s. View
`trade/quarrying/cmd/quarrying/quarry.yaml` (`verbs: [quarry]`; `target`
object `requires: any` — a `Block` on the floor (split) or a bare band
word (`quarry limestone`) that binds nothing; `tool` `default:
"me:i:[capability.winning]"`, `requires: [ToolMixin]`; `into` object,
optional, `default: "reachable:[mixin.BulkableMixin]"`, `requires:
[BulkableMixin]` — the vessel a bulk band fills). Controller
`trade-quarrying/src/idea/cmd/quarrying/QuarryController.ts` extends a
pack-local `QuarryActController` (the `MiningActController` shape:
`workingOf` narrows by `MixinApi.isActive(room, OPEN_WORKING_MIXIN)`,
`decline`, `paceForGround`, `engageAct` — the third copy of the
engaged-act base, and the forestry doc names the third copy as the
trigger to promote `engageAct` to the kernel: **record it, do not do it
here**). Refusals, each a `controller-rejected` reason: `no-pick`
(*"You would want a pick — something to win rock with."*),
`under-overburden`, `no-such-face`, `not-rock` (*"That is earth; dig
it."*), `worked-out`, `at-the-water`, `no-face-above`, `no-vessel` (a
bulk band with nothing to carry it in), `block-spent`. Afforded by
`OpenWorkingMixin.commandContributions { self, inventory }` naming
`quarry.yaml` **and** `fire.yaml` (D14). Credits `quarrying` with
difficulty by hardness (the `hew` shape).

**D11 — The goods, by shape.** All in `trade-quarrying`:
- `src/thing/Block.ts` — `DetailedMixin(Thing)`, `piecesLeft` (default
  8), `@Final takePiece()`, mass = host density × `BLOCK_M3 = 0.5`
  (granite ≈ 1375 kg — `get block` refuses `too-heavy-to-lift`, emergent
  from mass, the bole's rule), `commandContributions.self: [quarry.yaml]`
  (it affords its own splitting wherever it lies), a pieces augmenter.
  Row `content/trade/quarrying/thing/block.yaml`. `quarry block` mints one
  `piece` (`thing/piece.yaml`, a `Thing` of the block's material, 25 kg)
  and decrements.
- `src/thing/Lump.ts` — `StackableMixin(Thing)`; rows `spoil.yaml`
  (material drift), `clay.yaml`, `limestone.yaml`, `quicklime.yaml`.
  Stacks pool by row, the `Ore` shape without a grade.
- `content/trade/quarrying/thing/coal.yaml` — `class: /platform/thing/Firewood`,
  material `mineral/coal` (tags `[fuel, carbon, mineral, sulfurous]`), so
  it lights (`ignite coal`), drops into every `category: fuel` slot, and
  passes `isCharcoal`.
- `src/thing/Turf.ts` — `CuredMixin(Firewood)` (import
  `@saxonberg/server/mud/platform/thing/Firewood`); row `turf.yaml`,
  material `organic/peat` (tags `[fuel, organic, earth]`; **no `carbon`
  tag** — peat in a bloomery is a later question). Peat tabulates no
  activation energy, so `lint:perishable` is satisfied and a turf
  composes Cured **without** Freshness — the anticipated leather/timber
  case, honest.
- Rock salt is won as **bulk** into the `into` vessel (D10): the band's
  `wins:` names the salt **material**, `BULK_PER_UNIT_L = 2`. A `cure`
  consumes salt as `measureL` from a reachable sack, so every source of
  salt in this build yields bulk in a vessel — one shape, three sources
  (AC 8). No salt item row exists, which is also what keeps
  `lint:perishable` quiet (salt tabulates an activation energy).
- Defaults when a band authors no `wins:`: earth → `spoil` (material
  restamped to the host); rock → `block` (material restamped). The
  authored Rejection column names `wins:` for limestone, coal, clay and
  halite explicitly.
- `spoil` from an overburden lift is moved to the working's `spoilTo`
  room when authored (Rejection: `kestrel-road/tips`), else left on the
  pit floor — either way visible (AC 3). The read says *"thrown to the
  tip"* / *"heaped at the lip"*.

**D12 — Materials go to the commons** ⚠ **AMENDED → § A8:** `organic/peat` is
already shipped (edit it for the fuel column) and `mineral/clay` must NOT
be minted — reuse `earth/clay`. (`base-library/content/stuff/idea/material/`):
`rock/limestone` (tags `[rock, sedimentary, carbonate, flux]`, hardness
~120), `mineral/coal` (`autoignitionTemperature` ~ 700 K,
`heatOfCombustion` 24–30, tags above), `mineral/halite` (tags `[mineral,
evaporite, salt]`), `mineral/clay` (tags `[mineral, earth, clay]`),
`organic/peat` (autoignition ~500 K, heatOfCombustion ~15,
`waterAbsorptionCapacity` large, tags `[fuel, organic, earth]`),
`bulk/drift` (the overburden — tags `[earth, mixture]`). **Salt moves:**
`/trade/cooking/idea/material/salt` → `/stuff/idea/material/food/salt`
(the row verbatim, in `base-library`); `salt-sack.yaml:12` and
`kitchen-salt.yaml:24` updated; a rename ⇒ DB drop. `quicklime` gains
**no** `liming` tag (the requirements' marl/limestone distinction —
recorded as an open for the user, § Risks).

**D13 — `evaporative` is the fourth mechanism.** `MaturationMechanism`
gains `'evaporative'`, `MATURATION_MECHANISMS` and `MATURATION_LINES`
gain their entries (the `Record` type is the totality check; all six
lines authored — `killed` is *boiled dry and burnt to a bitter scale*,
never *rained back*, because rain is a setback, not a death).
`MaturationProfile` gains one field, `productFraction` (authorable,
default 1 — the volume the product occupies per volume of input; brine
→ salt ≈ 0.1). In `reconcileFerment`, the `active` branch for
`mechanism === 'evaporative'`: rate = `profile.ratePerDay ×
BiomeApi.airFor(self).evaporationFactor(BRINE_EQUILIBRIUM_RH = 75)`
(a saturated brine is in equilibrium with ~75 % RH air — solar salt
works in dry weather and not in wet, which is the geography lesson);
the interior **amount falls as it converts** (`amount = A0 × (1 − f ×
(1 − productFraction))`, debited through the Bulkable face — the water
leaves); **rain dilutes**: over the window,
`BiomeApi.airSegmentsFor(room, t0, t1)` carries `rainMmPerH` per
segment, litres added = `mm × apertureM2 / 1000` with `apertureM2 =
(capacityL / 1000)^(2/3)` (a cube's face — stated, not hidden), and `f ←
f × A / (A + rain)` — *the pan goes backwards*. At `f ≥ 1` the interior
swaps to `productMaterial` at `A0 × productFraction`. `reconcileCellarAir`
is called **only for `microbial`** — an evaporating pan does not breathe
(⚠ this also stops a bleaching green draining a room's air, a latent
defect in the photochemical rows; noted in § Risks). The batch stays
keyed on the material path, so the falling amount is not a fresh fill
(the payload rule). The `stalled` read still comes from `stallBelowK`
(273 K — ice).

**D14 — ⭐⭐ A kiln IS an oven: the `Kiln` CLASS is deleted and a kiln
becomes a ROW.** ⚠ **AMENDED → § A5:** the class collapse stands and is
verified; the ACT moves to a platform `fire`/`burn` on `FurnaceMixin`,
recipe-driven. (User's question, 2026-09-23, and the code settles it.)
`platform/thing/Forge.ts` and `platform/thing/Kiln.ts` are **byte-identical**
— the same imports and the same composition
`FurnaceMixin(LightSourceMixin(ReservedMixin(ThermalMixin(Thing))))` — so
the forge/kiln distinction is two class names over one behaviour and a
row's dials. `platform/thing/Oven.ts` differs for a **documented and
correct** reason (`Oven.ts:27-29`): *"`ContainerMixin` INSIDE
`ThermalMixin`: an oven is a chamber you put bread in. A `Forge` and a
`Kiln` are deliberately NOT containers — a forge is a fire you bring a
workpiece to."* ⭐ **That reasoning is right and the classification
contradicts it: you stack ware in a kiln and shut it, so a kiln is on the
OVEN side and the forge is the odd one out.** `Kiln` was cloned from the
wrong parent, and that clone is exactly why it cannot hold a charge.

So: **delete `platform/thing/Kiln.ts`**; retarget the generic
`generic-objects/content/stuff/thing/Kiln.yaml` row's `class:` to
`/platform/thing/Oven` (keeping its 1200 K / bellows ×1.25 — the dials
were always what made it a kiln); ship the limekiln as a **row**,
`content/trade/quarrying/thing/limekiln.yaml`, `class:
/platform/thing/Oven`. **No trade subclass at all.** The difference
between baking bread and calcining limestone stops being a class name and
becomes temperature doing real work, which is lens 1 paying out; and the
once-orphaned generic Kiln row now resolves to a class something else
already uses. ⚠ Record but do not change: `trade-smelting`'s
`SmeltingFurnace = ContainerMixin(Forge)` is the same smell one trade over
— a smelting furnace is also charged — and is a candidate for the same
collapse, on `metal-chain-slate`. ⚠ `Oven` is now narrower than its class
(rows: oven · range · kiln · limekiln); renaming it to a
loaded-chamber name is a separate, purely cosmetic change and is **not**
in this build. **The act is `fire`**
(free), view `trade/quarrying/cmd/quarrying/fire.yaml` (`kiln` arg
`default: "reachable:[mixin.FurnaceMixin]"`, `requires: [FurnaceMixin]`),
`FireController` on `QuarryActController`: the kiln must be lit and hold
≥ the firing's heat (`insufficient-heat` in the smelt's words); it takes
what is **in** the kiln — limestone lumps → quicklime lumps (2 : 1 by
count, ~0.56 × mass: the CO₂ left), clay lumps → one `/stuff/thing/clay-pot`
(a `PlantPot` row shipped by quarrying under `content/stuff/thing/`,
material `ceramic/ceramic` — *hold it, plant in it, look at it*); a mixed
charge refuses `one-charge-at-a-time`; runs as an engagement
(`FIRE_MS = 60_000`), minted in the kiln, credited `quarrying`
(`standard`). Afforded by the working (D10) — *a limekiln stands at a
quarry because you burn lime where you dig the stone*; a potter's shed
affording `fire` is the ceramics build's own class. ⚠ `make` is
deed-gated and script-driven and `order` needs a maker on shift, so
neither is an honest route for a lone quarrier; two recipe rows
(`content/recipes/{burn-lime,fire-pot}.yaml`, `requiresHeatK` 1170 /
1100, `maxHeatK` 1500 for `lint:doneness`, `discipline: quarrying`) are
shipped **for the ladder and `help`** (the `trade-fuel/recipes/charcoal.yaml`
precedent) while the act does the work.

**D14a — ⭐ Quicklime DOES lime a field, and the requirements were wrong
to say otherwise.** (Decided by lens 1 on the user's instruction to settle
it against the lenses.) `soil.md` already carries the seam — `lime` reads
the `liming` tag *"so a kiln's output works the day somebody ships one"* —
and in the world quicklime **is** agricultural lime: more aggressive than
marl, faster, and it costs fuel. The requirements forbade the tag to stop
the kiln becoming a worse marl; the honest model is better than the
prohibition, because marl and quicklime become **a real choice rather than
a rule**: marl is slow and needs no fire, quicklime is fast and burnt, and
lens 6 confirms marl survives as the cheap path. So the quicklime lump row
carries `liming` and `lime` accepts it. ⚠ This reverses a line in
`extraction-requirements.md § Collisions`; the requirements doc is
corrected in the same commit rather than left disagreeing with the plan.

**D15 — Limestone is flux; coal is sulfur.** `SmeltController`: `flux =
contents.filter(isFlux)` (material tag `flux`), destructed with the fuel;
when present, the bloom's trapped slag falls from `BLOOM_SLAG = 0.3` to
`BLOOM_SLAG_FLUXED = 0.12` (product mass and `setSlagFraction` both) and
the tap scene names it (*"the limestone took the gangue off as a running
slag"*); copper's slag line reads *thin and glassy*. **Coal:** if any
fuel item's material carries `sulfurous`, the ferrous product's Graded
face is written down to `poor` (monotone, the doneness `ruined` shape),
the tap scene says why (*"the coal's sulfur is in the iron — hot-short;
it will crack under the hammer"*), and the deed outcome is `partial`.
Coke is `metal-chain-slate`'s and nothing here pretends otherwise.

**D16 — `hew` gains its instrument.** `hew.yaml` gains `tool`
(`default: "me:i:[capability.winning]"`, `requires: [ToolMixin]`,
prepositions `[with, using]`); `HewController` refuses `no-pick` when
the bound tool lacks `winning`. `drive`/`sink`/`raise` are unchanged
(the requirements name `hew` only; a line in the mining slate records
the other three). The archetype kit slot `winning` stays and is now
consumed by two verbs; `lint:capabilities`' declared-never-consumed
count falls by one.

**D17 — `quarrying` is a Discipline, ISCED-F 0724.** Row
`content/trade/quarrying/idea/Discipline/quarrying.yaml`: `key: quarrying`,
`channel: skill`, `iscedf: "0724"` (*ISCED-F 2013: mining and extraction*
— the same field as `mining`; *sharing a code does not argue against a
split*, advancement.md), `specializes: []`, `requires: []`. Credited by
`quarry` (hardness-banded), by `dig` on an open working's band (`easy`),
by `fire` (`standard`); **not** by `ditch` (agriculture). The face read is
banded on it (D3): the viewer's band decides whether the augmenter says
*"some kind of pale rock, with earth over it"* or *"limestone, three yards
of it, a spade's depth of drift on top, and the face is barely touched"*
— the `Shore.readFor` shape.

**D18 — The pit is claimed through the counter people already use.** ⚠ **AMENDED
→ § A8:** the parent extent is `/world/terminus/rejection`.
`ClaimsRegister` gains an authorable field `surfaceWorkings:
Array<{ path, keywords }>` (rejection authors `[{ path:
/world/terminus/rejection/quarry/pit, keywords: [pit, quarry] }]`); `stake <word>`
that matches a keyword takes a **second fork** in `StakeController`:
`ParcelApi.ownerOf(path)` non-null → `already-claimed`; else
`ParcelApi.subdivide(path, '/world/terminus/rejection', { kind: 'player',
templatePath: giver.getIdentityPath() }, 0, 1, 'industrial')` (⚠ § A8 — the
plan's original literal named a parcel that does not exist) and the
record names the holder. Authored rooms have real paths and
longest-prefix resolution answers directly (mining.md § Title) — no
warren, no block. The three-number fork is untouched.

**D19 — Rejection authors the pit as its own zone with its own column.**
`rejection/content/world/terminus/rejection/quarry.yaml` (`CartesianZone`,
`cellSize: 10`, `deposit: /world/terminus/rejection/idea/deposit/quarry-hill` —
the outward walk makes the nearest `deposit` win, so the Ferrow is not
re-authored and the galleries' hardness is untouched),
`quarry/pit.yaml` (`class: /trade/quarrying/location/OpenWorking`,
`coords {0,0,0}`, exit `south → /world/terminus/rejection/location/old-workings`,
`props: [/trade/quarrying/thing/limekiln]`, `spoilTo:
/world/terminus/rejection/kestrel-road/tips`, `faceRunM: 20`, daylight 8000),
`old-workings.yaml` gains `north → /world/terminus/rejection/quarry/pit`, and
`idea/deposit/quarry-hill.yaml` (`class: /system/ground/idea/Deposit`,
no lode, `waterTable: -12`) with the column **drift 0…−1 · clay −1…−2 ·
granite −2…−6 (block) · limestone −6…−9 · coal −9…−10 · halite −10…−12 ·
granite below**. ⚠ Granite over limestone over coal over rock salt in one
hillside is a mineral museum, not a hillside; it is what makes every
drive step reachable at one pit, and a second pit authors an honest
column (AC 17). Recorded in § Risks for the user.

**D20 — The moor and the estuary take rows from their own packs.**
`world-seed` (`moor.yaml` gains `deposit: /world/moor/idea/deposit/heath`;
new `moor/turf-bank.yaml` on `/trade/quarrying/location/Turbary`, exit
from `stormy-heath`; `moor/idea/deposit/heath.yaml` — peat 0…−2.5 (`wins:
/trade/quarrying/thing/turf`), granite below, `waterTable: -2.5`) and
`terminus` (`estuary/thing/tide.yaml` — `/platform/thing/UnboundedReceptacle`
of `salt-water`, placed by `props:` on `estuary-mouth`; two
`/trade/quarrying/thing/salt-pan` rows in `estuary-mouth`'s `props:`;
`estuary/salt-house.yaml` off `lower-towpath` with `props:
[/trade/quarrying/thing/brine-hearth]`) each gain a dependency on
`trade-quarrying` (venue after trade). The pan row is on
`/platform/thing/Vat` (`category: pan`, `interiorCapacity: 40`, open —
`closure` as `Vat` rows author it); the brine hearth is a row on
**`/platform/thing/Oven`** (`burnTemperatureK: 450`) — `Oven` already
composes `ContainerMixin` (`platform/thing/Oven.ts:27–29`, unlike `Forge`
and `Kiln`), so the pan is `put … in` the hearth and its `ThermalMixin`
reads the fire through `Thermal.heatSourceK()`; no new class. The profile row
`content/trade/quarrying/idea/maturation/brine.yaml`: `key: brine`,
`inputCategory: brine`, `mechanism: evaporative`, `ratePerDay: 0.25`,
`productMaterial: /stuff/idea/material/food/salt`, `productFraction: 0.1`,
`stallBelowK: 273`, `happyK: 283`, `damageAboveK: 400`.

**D21 — The wet turf refuses the flame through the shipped seam.**
`Combustible.wetPenaltyK()` gains a second term when the host is Cured:
`ΔT += clamp((moisture − driedAt) / (1 − driedAt), 0, 1) ×
waterAbsorptionCapacity% × L_vap / c` (the same formula shape as the
wet term; `driedAt` = `cure.band.driedAt`, 0.5) — so an as-cut turf
refuses `too-wet`, a *dried* one lights, and the refusal is the shipped
*"It's too wet to catch."* The peat material's `waterAbsorptionCapacity`
is calibrated by a test so the boundary sits at the `dried` band.

---

## Host placement

For every new field, mixin and class: the host, and what composing it
claims about everything else on that host.

| what | host | what composing it claims |
|---|---|---|
| `StrataMixin` (D1) | any `Location` in a deposit-bearing zone: composed by mining's `WorkingMixin` (→ `MineRoom`, `AuthoredWorking`) and quarrying's `OpenWorkingMixin` | *this place stands in the ground and can say what is under and beside it.* True of every room in a zone that cites a deposit; false of nothing that composes it. Host constraint `Stuff & Container`. |
| `StratumBand.wins?` (D2) | the `Deposit` row (a band) | *winning this band mints this.* A pack adding a field to its own class. |
| `OpenWorkingMixin` (D3) | `OpenWorking`, `Turbary` | *the sky is the roof; the wall is a section; the floor drops.* Not on `MineRoom` (a gallery has a back). |
| `floorDepthM`, `wonByBand`, `faceRunM`, `spoilTo` | `OpenWorkingMixin` | state about THIS pit — rides the pit's own record (`Persistable`), the `workedFaces` rule one shape over. |
| `OpenWorking` (class) | `location/` of `trade-quarrying` | one row IS one pit (`Singleton…`), and it keeps a record: a `Persistable` singleton over the singleton base is exactly `Wood`. |
| `Turbary` (class) + `subsidenceM` | `location/` of `trade-quarrying` | an open working whose band is peat and whose ground can be improved. |
| `ImprovableMixin` (D8) | kernel `lib/ground/`; composed by `Field` (farming) and `Turbary` (quarrying) | *this ground can be cleared, drained and limed, and it reverts.* Every job is honest on both hosts; a zero bill line already says *wants no ditch*. **Not** on `OpenWorking` (a job with no consequence). |
| `improvementBill()` hook | the composer (`Field`, `Turbary`) | the ground says what it owes; the kernel never imports a seeded model. |
| `Diggable` (D9) | a **shape**, not a mixin — answered by `OpenWorkingMixin` and `Turbary` | the kernel verb declares what it will talk to; nothing in the kernel composes it, so no kernel host carries a method nothing uses. |
| kernel `Spade` (D9) | `platform/thing/`; farming's `Spade` extends it; the mining shovel row names it | *a spade in hand affords digging anywhere* — and the ground decides what comes up. Not on `ToolItem` (a hammer does not dig). |
| `Evaporation` (D6) | a value object, `lib/material/` | no host. |
| `_weatherLocalityPath` (D6) | `SkyExposedMixin` | *a scope under the sky knows whose weather it is under.* Not on `Location` generally — an indoor room's air is authored, not weathered. |
| the two-way arm (D5) | `CuredMixin` (unchanged host set: `Provision`, now `Turf`) | *exposed matter exchanges water with the air in both directions.* Gated by exposure, not by a host list. |
| `Combustible.wetPenaltyK` cured term (D21) | `CombustibleMixin`, reading `MixinApi.isCured(self)` | *internal water resists ignition as surface water does.* No host change. |
| `'evaporative'`, `productFraction` (D13) | `MaturationProfile` rows; the branch in `MaturingMixin` | the vessel is still the host (`Vat`), the Bulkable gate stands. |
| `Block`, `Lump`, `Turf` | `thing/` of `trade-quarrying` | `Block`: Tangible, Containable, Chattel, affords its split — the bole's claim. `Turf`: a `Firewood` that also has a water state. ⭐ **No kiln class** — the limekiln is a ROW on `/platform/thing/Oven` (D14), and the working affords `fire`. |
| `coal` | a `Firewood` **row** | no new class; the material does the work (`fuel`, `carbon`, `sulfurous`). |
| `surfaceWorkings` (D18) | `ClaimsRegister` | *the counter keeps a book of surface workings open to claim.* Content authors it. |
| `quarrying` Discipline | a row in the trade pack | every RGO trade ships its own. |

The test applied to each: nothing above needs a guard that re-narrows
its host set. The one place a guard was tempting — `ImprovableMixin` on
`OpenWorking` with `ditch` refusing "a pit has no drains to cut" — is
resolved by not composing it (D4).

---

## Convention conformance

Checked at plan time against the current tree, not recalled.

- **`props:`** designates fixtures (`cookhouse.yaml:37`); no `populates:`
  anywhere in this build.
- **Locations, not rooms** — every new place is a `SingletonCartesianLocation`
  descendant; nothing here is a `FurnishableRoom`. `lint:locations` needs
  no roster entry: `OpenWorking.ts`/`Turbary.ts` import the base by the
  specifier the gate reads, and a test pins it textually
  (`Wood.test.ts`'s shape).
- **`<root>/<branch>/`** — `/system/ground/{idea,lib}/…`,
  `/trade/quarrying/{thing,location,idea/cmd/quarrying,idea/Discipline,idea/maturation}/…`,
  views at `/trade/quarrying/cmd/quarrying/*.yaml`; platform views at
  `platform/cmd/ground/*.yaml` with controllers at
  `platform/idea/cmd/ground/*Controller.ts`; commons rows the trade ships
  under `content/stuff/…` (the forestry species precedent).
- **Module scope declares; lifecycles initialize** — no module-scope
  statements in any new file; the Locality cache resolves lazily on first
  read (the `Soil` shape).
- **Import boundary** — packs import the kernel by
  `@saxonberg/server/mud/…` specifiers only; `trade-mining`,
  `trade-quarrying` import the ground pack by
  `@saxonberg/content-ground/src/…` **with** the `package.json`
  dependency line (`lint:imports` pack tier, :210–214); `FromModule`
  gates in pack code are absolute strings (`lint:gates`).
- **No new module category, no free helper, no Api, no logic singleton
  in a pack.** New kernel files fall in existing categories: mixin
  (`lib/ground/Improvable.ts`), named value object (`lib/material/Evaporation.ts`),
  a shape + thin static holder (`lib/ground/Diggable.ts`, the
  `TravelNode` category), Stuff class (`platform/thing/Spade.ts`),
  controllers, command YAML. ⚠ `lib/ground/` is a **new `lib/<subsystem>/`
  folder** (allowed — "propose a new subsystem folder"; the subsystem is
  ground-as-worked, distinct from husbandry's soil). ⚠ `ground` is a
  **new command category** (CLAUDE.md's category list is an index line —
  swept, not raced).
- **Verbs live on objects** — `ground.dig(...)`, `working.win(...)`,
  `block.takePiece()`, `room.improvementBill()`; controllers narrate and
  credit. No `XApi.verb(host, …)`.
- **Persons key on `getIdentityPath()`** — the stake fork (D18).
- **Bound args are `MqlOneResult`, never `Stuff`** — every new controller
  reads `model.x?.stuff`.
- **Instruments are declared args** (`lint:instrument-args`); every object
  arg carries `requires:` (`lint:arg-kinds`); no arg alternation deletes
  a check.
- **Recipes with heat author `maxHeatK`** (`lint:doneness` ratchet).
- **No new Mongo collection; no migration** — two template-path renames
  (`Deposit`, `salt`) ⇒ drop the dev DB once at W0 and once at W5 (or
  once after both if the waves land in one session).
- **Lint gates this build must satisfy:** the whole derived roster,
  `pnpm -C packages/server lint:family`; the ones it will actually touch
  are named in § Test & gate strategy.

---

## Waves

Eight waves, each independently landable at a commit
`build(extraction W<n>): …`. Kernel first (W0–W2), then the trade
(W3–W6), then the drive (W7). Mid-build gating is `pnpm test:near` +
each touched pack's `pnpm -C packages/content/<pkg> test` +
`pnpm -C packages/server lint:family`; the full suite runs once before
the MR.

### W0 — ✅ DONE: the ground build shipped this (see the banner at the top)

> ✅ **Do not execute this wave — it has landed** (`build/ground`, MR !283,
> 2026-09-24). Universal floors, the five-rung underfoot ladder, the `onGrade`
> flag on the floor, and `/system/ground` holding the column, the seeded
> character **and** `StrataMixin`. Read
> [ground.md](../subsystems/ground.md); start at W1. The text below is kept
> because the ground
> build's requirements will reuse most of it verbatim — the pack skeleton, the
> `Deposit` move, the `Strata` extraction, the five mining files that switch
> imports, the ferrow row's `class:` change, the pack-count bump and the DB drop
> are all still exactly right; the ground build simply does more.

### W0 (superseded text) — the ground pack: the field's model leaves the trade (D1)

*Goal:* `/system/ground` exists; `Deposit` and the ground-position reads
live there; mining behaves identically.

Files: `packages/content/ground/{pack.yaml,package.json,tsconfig.json,vitest.config.ts}`
(copy `water`'s; `id: ground`, `root: /system/ground`, `requires.groups:
[{ name: ground, purpose: …, owner: { office: prime-minister } }]`,
`requires.title: [{ extent: /system/ground, holder: { group: ground } }]`;
description states the doctrine: *the ground's model, as distinct from
what anybody does to it — a deposit row is a locality's*),
`ground/src/idea/Deposit.ts` (moved verbatim; `StratumBand.wins?` added
with its docstring), `ground/src/lib/Strata.ts` (extracted from
`Working.ts:378–425` + `resolveDeposit`), `ground/src/__tests__/{Deposit,Strata}.test.ts`
(the ground tests moved out of mining's `authored.test.ts` where they
test the field alone). `trade-mining`: `package.json` gains
`@saxonberg/content-ground`; `Working.ts` composes over `StrataMixin`,
imports `Deposit` types from the ground pack, deletes the moved members;
`exemplar.test.ts`, `fringe.test.ts`, `reads-air.test.ts`, `authored.test.ts`
switch imports. `rejection/…/idea/deposit/ferrow.yaml` `class:` →
`/system/ground/idea/Deposit`; `rejection/package.json` gains
`content-ground`. Root `package.json` gains the workspace dep;
`PackLogic.discover.test.ts` → `toHaveLength(49)` + `trade-mining` after
`ground`, `rejection` after `ground`. `pnpm install` (a new workspace
member). Drop the dev DB.

*Acceptance:* `pnpm -C packages/content/trade-mining test` and
`pnpm -C packages/content/ground test` green; `lint:family` green;
`metal-chain.dirty.wire.test.ts` passes unchanged (the drive that
exercises `hew` and the galleries). Mining's subsystem doc gets one line
pointing at the new home (the rest is the sweep's).

### W1 — the open air dries what you leave in it (D5, D6, D7, D13, D21)

⚠ **Amended by § A6 + A8.** Three changes: the locality memo hosts on
`AtmosphericMixin` (NOT `SkyExposedMixin`, which composes onto `Biome`)
and is not persisted; `CuredMixin`'s exposure is a **fraction** read off
`getRestingOn()` — an authored field on the support (default 1.0) and a
`cure.groundExposure` dial (0.35) for a thing lying on bare ground; and
`DryController` therefore changes something, which it did not as planned.
Add a sixth Cured pin: **the same cut on a rack and on the floor diverge.**

*Goal:* drying is a rate that reads the air; the fourth maturation
mechanism exists; wet fuel refuses the flame. First consumers: the
cookhouse rack (AC 11) now; turves (W6) and pans (W5) later in this
build.

Files: `lib/material/Evaporation.ts` (+ test computing the factor table: 30 %
RH windy summer vs 95 % RH still autumn vs 100 %); `lib/biome/SkyExposed.ts`
(`_weatherLocalityPath` runtimeState + `weatherLocality()`, the Soil
shape); `api/biome.ts` + `platform/idea/api/BiomeLogic.ts`
(`airFor(scope)`, `airSegmentsFor(scope, t0S, t1S)` — sync; the
containment walk over `_humidity`/`_wind` already at `BiomeLogic.ts:302–333`,
plus the deviation from `WeatherApi.weatherAt(now, locality)` /
`segmentsBetween`); `lib/material/Cured.ts` (`advanceMoisture(m, elapsedS,
humidityPct, rate, air?)` two-way; `reconcileCure()` — exposure gate,
segment loop, the restated early return; `cure.dryingPerHour` dial in
`lib/config/AppSettings.ts` + the platform pack's `content/settings/`
seed, default 0.04); `lib/material/__tests__/Cured.test.ts` (pins: (a)
enclosed at moisture 1 → no stamp after a read; (b) exposed in 60 % air
→ moisture falls and a stamp is written; (c) exposed in 100 % air →
nothing written; (d) a dried cut in 90 % air re-wets at the shipped
rate; (e) the ~62 % crossing: a cut dried in 40 % air ends below the
a_w floor, one in 80 % air does not); `lib/fire/Combustible.ts`
(`wetPenaltyK` cured term) + test; `lib/maturation/MaturationProfile.ts`
(`'evaporative'`, lines, `productFraction` field + fieldMeta + accessor);
`lib/maturation/Maturing.ts` (the evaporative branch; `reconcileCellarAir`
gated to microbial) + `lib/maturation/__tests__/Evaporative.test.ts`
(a `Vat` of salt-water under a sky-exposed test room: dry windy days
concentrate, a rain segment dilutes, finished swaps to salt at 0.1 of
the start volume; the same pan inside a lit test furnace converts in
minutes); `trade-cooking`: `DryController.ts` rewritten (D7),
`dry.yaml` (rack arg, help), `content/recipes/air-dry.yaml` deleted,
`__tests__/roster.test.ts` + `kitchen-affordances.test.ts` adjusted;
`docs/subsystems/spoilage.md` — the *"passive arm only ever RAISES"*
paragraph replaced by the exposure rule (a truth changed in this wave,
not deferred to the sweep, because a fresh reader of the doc would
otherwise be told the opposite of what the code does).

*Acceptance:* the five Cured pins; the evaporative test; `test:near`;
`pnpm -C packages/content/trade-cooking test`; `lint:family`
(`lint:lib-statics` unchanged — `Evaporation.of` must classify as type-level; if
the script's classifier counts it, fold construction into `new Evaporation(...)`
rather than raising the ceiling); `food-safety.dirty.wire.test.ts`'s
`dry` checkpoint still passes.

### W2 — ground improvement is the kernel's (D8)

*Goal:* `ImprovableMixin` and the three improvement acts live in the
kernel/platform; farming's `Field` behaves identically; nothing new is
reachable yet (first new consumer: W6).

Files: `lib/ground/Improvable.ts` (moved; `ImprovementCost` moved into
it; `improvementBill()` on the interface); `lib/mixin.ts`
(`Mixins.Improvable`, `MixinRefusals.ImprovableMixin`); `api/mixin.ts`
(`isImprovable`); `platform/idea/cmd/ground/{GroundWorkController,GrubController,DitchController,LimeController}.ts`
(from farming's, `groundOf` narrowed by `isImprovable` + the hook;
`AGRICULTURE` constant kept); platform views
`packages/content/platform/content/platform/cmd/ground/{grub,ditch,lime}.yaml`
+ their controller templates under
`platform/content/platform/idea/cmd/ground/`; `trade-farming`: delete
`src/lib/Improvable.ts`, the three controllers and views; `GroundCharacter.ts`
imports `ImprovementCost` from `@saxonberg/server/mud/lib/ground/Improvable`;
`Field.ts` composes the kernel mixin, implements `improvementBill()`,
declares `static commandContributions` listing the three platform views
+ `plough.yaml`; `FieldWorkController.ts` becomes a thin subclass of the
kernel base keeping `fieldOf()` for `Plough`/`Mow`; farming tests move
with their controllers (`src/idea/cmd/farming/__tests__/` → the kernel's
`platform/idea/cmd/ground/__tests__/`, on synthetic fixtures composing
`ImprovableMixin` — `lint:test-content`).

*Acceptance:* `pnpm -C packages/content/trade-farming test`,
`test:near`, `lint:family` (`lint:mixin-names`, `lint:verb-collisions` —
the views moved, not duplicated); `farmstead.dirty.wire.test.ts` /
`farming.dirty.wire.test.ts` unchanged (they drive `grub`/`ditch`/`lime`
on a field, which still affords them).

### W3 — the open working: the pit, `dig`, `split`, stone and earth (D2–D4, D9–D12 part, D16, D18, D19)

⚠⚠ **Amended by § A1–A4, A7, A8.** There is **no `quarry` verb**: winning
a face is `dig` (platform, polymorphic, the `fell.yaml` shape) and
splitting a block is `split` (platform, afforded by the `Block`). So
`quarry.yaml` and `QuarryController` are not written; `DigController`
carries the refusal list and a module-private `asDiggable()`, and
`lib/ground/Diggable.ts` exports **the interface alone** (`Diggables.of`
fails `lint:lib-statics` at 337/337). ⚠ **Read § A2 first — `dig` was
withdrawn in review once** (MR !268) for hard-coding its yield.

Also: the zone authors a **second, played-out working** (§ A7) so AC 13's
worked-out read is observable without grinding; `organic/peat` is edited
rather than created and `mineral/clay` is not minted (§ A8); and
`OpenWorkingMixin.commandContributions` names `split.yaml` only — **the
trade affords no verb of its own** (§ A5).

*Goal:* a person can stand in a pit above the old workings, read the
face in words, be refused bare-handed, strip the drift with a spade to
the tip, win a block they cannot lift, split it, dig clay, and claim the
ground at the counter.

Files — kernel/platform: `lib/ground/Diggable.ts`; `platform/thing/Spade.ts`;
`platform/cmd/ground/dig.yaml` + `platform/idea/cmd/ground/DigController.ts`
(+ controller template row); `trade-farming/src/thing/Spade.ts` extends
the kernel `Spade` and re-lists `dig`; `trade-mining/…/thing/shovel.yaml`
`class: /platform/thing/Spade`; `hew.yaml` + `HewController.ts` (D16);
`ClaimsRegister.ts` + `StakeController.ts` (D18).
Files — the pack: `packages/content/trade-quarrying/{pack.yaml
(root /trade/quarrying, group quarrying, title /trade/quarrying),
package.json (deps: platform, base-library, generic-objects, ground,
server, types), tsconfig.json, vitest.config.ts}`; `src/lib/OpenWorking.ts`
(`OpenWorkingMixin`, `OPEN_WORKING_MIXIN`, `Band`/`ExposedFace` types,
`exposedBands()`, `faceOf(word)`, `isBuried()`, `remainingIn(band)`,
`floorStop()`, `win(band, by, tool)` / `dig(by, tool, what)` (the
`Diggable` answer), `recordWon`, `deepen`, the read augmenter banded on
`quarrying`, `commandContributions { self, inventory }` = `[quarry.yaml,
fire.yaml]`); `src/location/OpenWorking.ts`; `src/thing/{Block,Lump}.ts`;
`src/idea/cmd/quarrying/{QuarryActController,QuarryController}.ts`;
`content/trade/quarrying/cmd/quarrying/quarry.yaml`;
`content/trade/quarrying/thing/{block,piece,spoil,clay}.yaml`;
`content/trade/quarrying/idea/Discipline/quarrying.yaml` (D17 — the
credits land here, the archetype in W7); materials `rock/limestone`,
`mineral/clay`, `bulk/drift`, `mineral/coal`, `mineral/halite`,
`organic/peat` in `base-library` (all six now so `lint:census` sees
every host the Rejection column cites); tests
`src/__tests__/{OpenWorking,Block,quarry-gates,second-pit}.test.ts`
(`second-pit` hydrates a pit and a column from **literal rows** and wins
a block — AC 17, the `second-wood.test.ts` shape; `quarry-gates` drives
the real YAML through the binder — the `verb-gates.test.ts` shape).
Files — Rejection (D19): `quarry.yaml`, `quarry/pit.yaml`,
`idea/deposit/quarry-hill.yaml`, `old-workings.yaml` exit,
`location/claims-office.yaml`'s register row gains `surfaceWorkings`,
`rejection/package.json` gains `content-trade-quarrying`. Root
`package.json`; `PackLogic.discover.test.ts` → **51** (⚠ it is
already 50 today — § A8), `trade-quarrying` after `ground`, `rejection`
after `trade-quarrying`. `pnpm install`.
⚠ The limekiln row is placed by `props:` here but the `fire` act lands in
W4; until then the kiln is a fixture that lights and holds heat.

*Acceptance:* the pack's suite; `test:near`; `lint:family`
(`lint:capabilities` — `winning` consumed, `digging` consumed by `dig`;
`lint:instrument-args`; `lint:arg-kinds`; `lint:untitled` —
`/trade/quarrying` claimed, `/world/terminus/rejection/quarry` under the town's
claim; `lint:census` — every `wins:`/host/props path resolves;
`lint:locations`); the mining suite still green (the `hew` tool arg).

### W4 — the kiln, the flux, the sulfur (D14, D15, coal + limestone bands)

⚠ **Amended by § A5.** The `Kiln`-class collapse stands (verified). The
act does not: `fire` is **`platform/cmd/device/fire.yaml`,
`verbs: [fire, burn]`, afforded by `FurnaceMixin`** beside
`ignite`/`douse`/`pump`/`heat`/`boil`, and it **resolves the recipe whose
input matches the charge** rather than hard-coding lime and pots. So
`burn-lime` / `fire-pot` stop being shipped "for the ladder and `help`"
and become the mechanism; a mixed charge refuses *"nothing here matches a
firing"*. `FireController` is the platform's, not the trade's.

*Goal:* limestone changes a smelt; coal lights and ruins iron; the kiln
burns lime and fires a pot.

Files: `platform/thing/Kiln.ts` **deleted** + `generic-objects/content/stuff/thing/Kiln.yaml`
`class:` → `/platform/thing/Oven` (D14),
`content/trade/quarrying/thing/{limekiln,coal,limestone,quicklime}.yaml`
(limekiln `class: /platform/thing/Oven`; quicklime tagged `liming`, D14a),
`content/stuff/thing/clay-pot.yaml`,
`content/trade/quarrying/cmd/quarrying/fire.yaml`,
`src/idea/cmd/quarrying/FireController.ts`,
`content/recipes/{burn-lime,fire-pot}.yaml`; `trade-smelting/src/idea/cmd/smelting/SmeltController.ts`
(`isFlux`, `BLOOM_SLAG_FLUXED`, the sulfur read, tap scenes) + its tests;
`base-library` `caustic/quicklime.yaml` unchanged (no `liming`). Tests:
`FireController.test.ts` (lime 2 : 1, pot, mixed charge refuses, cold
kiln refuses), smelting's `flux.test.ts` (same charge with and without
limestone differs in slag fraction), `coal.test.ts` (a sulfurous fuel
writes the grade down and the deed is partial).

*Acceptance:* quarrying + smelting suites; `test:near`; `lint:family`
(`lint:doneness` — both recipes author `maxHeatK`; `lint:perishable` —
`clay-pot` is ceramic on `PlantPot`).

### W5 — salt: the face, the pans, the brine house (D12 salt move, D13 rows, D20 estuary)

*Goal:* three sources, one good, and `cure` runs on salt from any of them.

Files: `base-library/content/stuff/idea/material/food/salt.yaml`
(moved), `trade-cooking/…/thing/{salt-sack,kitchen-salt}.yaml` updated,
the cooking material row deleted (**DB drop**); the Rejection column's
halite band `wins:` the salt material (the band was authored in W3 with
`wins:` pointing at the *new* path — W3's census passes only once W5
lands, so land W3 and W5 in one session or author the halite band in
W5); `trade-quarrying/content/trade/quarrying/thing/{salt-pan,brine-hearth}.yaml`,
`content/trade/quarrying/idea/maturation/brine.yaml`; `terminus`:
`estuary/thing/tide.yaml`, `estuary-mouth.yaml` `props:`,
`estuary/salt-house.yaml`, `lower-towpath.yaml` exit, `package.json`
dependency; `PackLogic.discover.test.ts` ordering (`terminus` after
`trade-quarrying`). Tests: `brine.test.ts` in the pack (the profile row
resolves for salt-water and finishes to salt at 0.1), a smelt-free
`cure-from-quarry-salt.test.ts` in cooking's suite is **not** written —
the drive proves it (AC 8).

*Acceptance:* pack suite; `pnpm -C packages/content/trade-cooking test`
(the salt path); `lint:census`; `lint:untitled` (the salt house under
Terminus's claim — check which `terminus/pack.yaml` extent covers
`/world/terminus/estuary` and add one if none does).

### W6 — the turbary (D4 Turbary, D20 moor, D21)

*Goal:* turf is dug wet, dries at the weather's speed, re-wets in rain,
burns only dry; draining the moss thins the peat and improves the
ground; a cut-over bank stays cut.

Files: `trade-quarrying/src/location/Turbary.ts`, `src/thing/Turf.ts`,
`content/trade/quarrying/thing/turf.yaml`; `world-seed`: `moor.yaml`
(`deposit:`), `moor/turf-bank.yaml`, `moor/idea/deposit/heath.yaml`,
`stormy-heath.yaml` exit, `package.json` (`content-trade-quarrying`,
`content-ground`); `PackLogic.discover.test.ts` ordering. Tests:
`Turbary.test.ts` (draining progress → subsidence → peat thinner; a bank
cut to the water refuses and stays cut across a `singleton()` restore —
the `Wood` restart test shape), `Turf.test.ts` (as-cut refuses `too-wet`;
dried lights; exposed turf dries in dry air and re-wets under a rain
segment).

*Acceptance:* pack suite; `test:near`; `lint:family` (`lint:perishable`
— peat on a non-Freshness class; `lint:locations`).

### W7 — the trade's furniture, and the drive (D17 archetype, help, the wire file)

*Goal:* the trade is a trade; the requirements' 23 steps run against the
running game.

Files: `trade-quarrying/content/archetypes/quarrying.yaml` (needs:
`{ key: winning, needs: { tool: winning }, default: /trade/mining/thing/pick }`
— ⚠ a default naming another trade's row makes quarrying depend on
mining's **content**; prefer no default and let the venue answer, the
`light` slot's lesson), `content/trade/quarrying/wiki/` or help stanzas
as the other trades ship them, `packages/wire/tests/extraction.dirty.wire.test.ts`
(`DIRTY_REASON`: cuts a turbary and a face nothing refills, claims the
pit, consumes charcoal and fuel), the drive record appended to this
plan. Then the single full `pnpm test`, push, MR.

*Acceptance:* every drive step passes or is recorded as a finding with
its fix; the record shows the run (output, count, each failure).

---

## Reachability wiring

Each new capability, its five links. Every one fails closed and silent.

| capability | verb (view) | affordance (a static on a class) | data (rows/materials/recipes) | boot | arg gate (`requires:`) |
|---|---|---|---|---|---|
| `dig` (winning a face, **all** ground) | `platform/cmd/ground/dig.yaml` | `platform/thing/Spade.commandContributions.self`; farming `Spade` re-lists it; the mining shovel row names the class | every band host material; the working's column | none (the Spade is an item you hold) | `target: any` (polymorphic, declared — the `fell.yaml` shape); `tool: [ToolMixin]` + `[capability.digging]` default; the ground answers the `Diggable` **interface**, narrowed by a module-private `asDiggable()` (§ A3) |
| `split` (the block) | `platform/cmd/ground/split.yaml` | `Block.commandContributions.self` | block/piece rows | — | `target: any`; `tool: [ToolMixin]` + `[capability.winning]` |
| ~~`quarry`~~ **retired → `dig`** (§ A1) | — | `OpenWorkingMixin.commandContributions { self, inventory }` names `split.yaml`; the working affords `dig` by the **Spade in your hand**, not by the room | the pit row, the column with `wins:`, block/piece/lump rows | none (`Deposit` resolves by `singleton`) | the `into: [BulkableMixin]` vessel arg moves onto `dig` (a bulk band needs carrying) |
| `fire` / `burn` (§ A5) | `platform/cmd/device/fire.yaml`, `verbs: [fire, burn]` | **`FurnaceMixin.commandContributions.peers`** — beside `ignite`/`douse`/`pump`/`heat`/`boil`, the doctrine already written at `Furnace.ts:100` | `limekiln` row in the pit's `props:`; limestone/clay lumps; quicklime + clay-pot rows; **the two recipes now DO the work** | the kiln's `fuel` reserve ships at 100 % (nothing refuels it — recorded) | `kiln: [FurnaceMixin]`; the charge is read from the furnace's contents, and an unmatched charge refuses in words |
| `hew`'s tool | `hew.yaml` (arg added) | unchanged | pick row offers `winning` | — | `tool: [ToolMixin]` + `[capability.winning]` |
| `grub/ditch/lime` (moved) | `platform/cmd/ground/*.yaml` | `ImprovableMixin.commandContributions`; **`Field` re-lists them** (shadowing); `Turbary` inherits the mixin's | the bill from the host hook | — | `tool: [ToolMixin]` + `[capability.digging]` (grub/ditch); lime's agent by `liming` tag |
| `dry` (rewritten) | `dry.yaml` | `DryingRack` (peers) unchanged | none (recipe deleted); ⭐ the rack row now authors its **exposure** (§ A6) | — | `target: any` (the controller requires Cured); `rack: [class.DryingRack]` |
| `stake pit` | `stake.yaml` unchanged | `ClaimsRegister` unchanged | `surfaceWorkings` on the register row | — | unchanged |
| the pans | `fill`/`pour`/`put` (shipped) | `Vat` (shipped) | pan rows in `estuary-mouth` `props:`; the `tide` receptacle; the `brine` profile row (found by class) | none | — |
| the face read | `look` (shipped) | `OpenWorkingMixin.markupAugmenters` | the prose is derived | — | — |
| `quarrying` | — | — | the Discipline row; `creditDeed` from `dig`/`split`/`fire` — ⭐ credited by the **working**, never by the verb, which is what lets a platform verb earn a trade's Discipline (§ A1) | Discipline catalogue warms by class | — |

Two links that are easy to forget, called out: (1) **`Field` must
re-list the moved views** — without it a field stops affording `grub`
the day W2 lands, and every farming test that calls the controller
directly will still pass; the farming wire drives are what catch it.
(2) **The W3 column cites the W5 salt path** — `lint:census` is the
tripwire; land them together or author the halite band in W5.

---

## Acceptance-criteria coverage

| AC | wave(s) | how it is proven |
|---|---|---|
| 1 — the read, in words, sharper with competence | W3 (read) · W7 (drive step 21) | augmenter test at two bands; drive 2 + 21 |
| 2 — wrong/no tool refused in words | W3 (`dig` on rock bare-handed / with a spade), W3 (`hew`), W6 (`dig` turf) | ⭐ **strengthened by § A1** — with one verb the refusal names the TOOL (*"You would want a pick. That is rock."*) instead of naming another verb. Gate tests; drive 3 |
| 3 — overburden first, waste visible, read changes | W3 | `OpenWorking.test`; drive 4–5 |
| 4 — block too heavy; splitting yields pieces | W3 | `Block.test`; drive 6–7 — the split is **`split block`** (§ A4) |
| 5 — limestone changes the smelt | W4 | `flux.test`; drive 8 |
| 6 — clay → a ceramic object | W4 | `FireController.test`; drive 10 |
| 7 — coal burns; worse iron, and why | W4 | `coal.test`; drive 11 |
| 8 — three salts, all `cure` | W3 (face) · W5 (pans, brine) | drive 12–15 |
| 9 — pan concentrates in dry wind, goes back in rain | W1 (mechanism) · W5 (rows) | `Evaporative.test`; drive 13–14 |
| 10 — turves read wet, dry, re-wet, only dry burn | W1 · W6 | `Turf.test`; drive 16–18 |
| 11 — a ham in a damp place does not dry like one in dry wind | W1 | Cured pins (b)(d)(e) **+ the sixth pin: rack vs floor diverge** (§ A6); drive on the rack vs the moor |
| 12 — draining thins the peat, improves the ground, from upstream | W2 · W6 | `Turbary.test`; drive 19 — ⚠ *"a person upstream can do this to ground they do not hold"*: `ditch` is not title-gated (labour, the farming rule) — so anybody standing in the bank may ditch it; the *upstream* geography is prose in this build (§ Risks) |
| 13 — worked-out face says so; cut-over stays cut | W3 · W6 | ⚠ **re-scoped (§ A7)** — a face is 320 units and that number is CORRECT, so the read is proven by a **second, played-out working authored beside the fresh one** (ledger tests + the restore test), not by grinding a face down. Drive 20 walks between the two rooms. |
| 14 — no face above you | W3 | `quarry up` gate test; drive 23 |
| 15 — `quarrying` on a transcript, by work alone | W3 (credits) · W7 (row shipped in W3, archetype W7) | drive 21 |
| 16 — claimed at the counter, record names the holder | W3 | `title.test` extension; drive 22 |
| 17 — a second pit is rows | W3 | `second-pit.test` from literal rows |

Unmapped: none. One criterion is met more weakly than its sentence
reads — AC 12's *upstream* — and it is surfaced in § Risks rather than
absorbed.

---

## Test & gate strategy

- **Unit (pack and kernel suites):** every decision with arithmetic —
  the `Evaporation` factor table, the five Cured pins, the evaporative pan
  (concentrate / dilute / finish / boil), the cured ignition term's
  boundary at the `dried` band, the column reads (`exposedBands`,
  `isBuried`, capacity, `at-the-water`, `no-face-above`), the block's
  mass and split, the flux and sulfur smelts, the kiln's two charges,
  the subsidence integral, `singleton()` restore of a worked pit and a
  cut bank, the second pit from literal rows, the stake fork.
- **Binder-level gate tests** (`verb-gates.test.ts` shape) for
  `quarry`, `dig`, `fire`, `hew` — the arg gate is invisible to a
  controller test.
- **The drive** proves what tests cannot: that the pit is reachable from
  the town, that a pick in hand is what lights the verb up, that the tip
  fills, that the ham on the cookhouse rack and the cut at the mere
  diverge, that the pans go backwards in a storm, that the transcript
  says `quarrying`. Written as `extraction.dirty.wire.test.ts`, run
  against the running game, its output appended below.
- **Gates touched:** `lint:imports` (pack tier — new dependency lines),
  `lint:instanceable` (nothing instances `/lib/`; pack classes under
  `src/<branch>/`), `lint:locations`, `lint:census`, `lint:untitled`,
  `lint:capabilities` (two counts fall), `lint:instrument-args`,
  `lint:arg-kinds`, `lint:mixin-names` (`Mixins.Improvable`),
  `lint:verb-collisions` (moves, not duplicates), `lint:perishable`,
  `lint:doneness` (`maxHeatK`), `lint:lib-statics` (must not rise),
  `lint:person-keys`, `lint:module-scope`, `lint:gates`,
  `lint:test-bootstrap`, `lint:test-content` (moved farming tests onto
  fixtures), `lint:drive-scripts` (the drive is a wire file). Always the
  whole roster: `pnpm -C packages/server lint:family`.
- **Full suite:** exactly twice — before the MR, and at `/finalize`.

---

## Risks & opens

Things the user should price or decide; the build should not guess at
them silently.

1. ⭐ **DECIDED (user, 2026-09-23): one pit stands, and the density
   problem is a later content pass.** Granite over limestone over coal over
   rock salt in one hillside does fail lens 1's *derivable world* for a
   geologist, and the honest alternative (two or three small rooms with
   honest columns each) is more rows and no more code. The user is planning
   a dedicated content pass to *"address this kind of density problem and
   really build out the content we want to ship with 1.0 for real"*, so the
   build authors one pit and **the spread is that pass's work** — recorded
   on `rejection-slate.md` so the pass finds it. Do not re-litigate it here.
2. ⭐ **RESOLVED → D14a.** Quicklime **does** lime a field: it carries the
   `liming` tag soil.md's seam is waiting for. Lens 1 decided it (quicklime
   is agricultural lime, faster than marl and burnt), and lens 6 confirms
   marl survives as the fuel-free path — so the pair becomes a choice
   instead of a rule. The requirements doc is corrected, not left
   disagreeing.
3. ⭐ **ACCEPTED as scope (user, 2026-09-23: "blast away").** Passive
   drying touches **every exposed `Provision`**, not only the ham — a roast
   on a table dries; a biscuit in dry air reads *dried*. The enclosed case
   (anything in a sack, chest, pack, pot or body) is what keeps the sparse
   store and keeps the blast radius bounded. Build it; do not narrow it to
   the rows this feature needed.
4. **`ImprovableMixin` is not on the stone pit (D4).** The requirements'
   *"you ditch a road, a yard and a quarry"* is honoured as the reason
   for the kernel home, not as a shipped act on `OpenWorking`. If you
   want a pit sump now, it is a wave on `mining-slate`'s pump.
5. **AC 12's *upstream* is geography in prose.** Nothing in the shipped
   watershed couples a ditch in one room to the water table of another;
   the turbary is drained by ditching the bank itself, which anybody may
   do (labour is not title-gated — the farming rule). The externality
   sentence is true in the fiction and not yet in the mechanism; the
   honest home is the watershed's `Conduit`/reach rights, a later wave.
6. ⭐⭐ **RESOLVED, and better than either option on the table → D14.**
   Neither a trade subclass nor a Container edit: **`Forge` and `Kiln` are
   byte-identical**, and `Oven`'s own comment gives the only real
   distinction — *a chamber you load* versus *a fire you bring work to* —
   which puts a kiln on the **oven** side and makes the forge the odd one
   out. The `Kiln` CLASS is deleted; a kiln is a row and the limekiln is a
   row. ⚠ `SmeltingFurnace = ContainerMixin(Forge)` is the same smell one
   trade over and is recorded on `metal-chain-slate`, not changed here.

7. **Nothing refuels a furnace.** Drive step 15's *"the fuel is gone"*
   observes the hearth's own reserve falling while lit; coal and turf
   burn as `ignite`d combustibles and drop into recipe fuel slots, but no
   act puts a lump into a furnace's `fuel` reserve. A `stoke` act is out
   of scope and recorded.
8. ⭐ **RESOLVED (user, 2026-09-23): the value object is `Evaporation`.**
   `Air` collided in the head with the `bulk/air` material and the cellar's
   `air` reserve, and it named the input rather than the thing computed.
   `Evaporation.factor()` says what it is. The `BiomeApi.airFor` /
   `airSegmentsFor` READ names stay — they answer *what is the air here*,
   which is honest.
9. **`reconcileCellarAir` gated to microbial (D13)** also stops a
   bleaching green (photochemical) draining its room's air — a latent
   textiles defect fixed as a side effect. Say if you want it left as is.
10. **`lint:lib-statics` — resolved at plan time, recorded so nobody
    re-litigates it:** the gate counts every public static on an exported
    `lib/` class (`check-lib-statics.ts:48–94`, ceiling 337), so `Evaporation`
    ships with a constructor and no statics, and the two-way arm extends
    the existing `Cure.advanceMoisture` rather than adding a static. The
    ceiling must not rise.
11. **A weather deviation reaches only sky-exposed scopes with a resolved
    Locality (D6).** Indoor racks read authored `_humidity` (or the
    60 % dial); a "damp cellar" is a room that authors its humidity. The
    cookhouse rack will dry at 60 % until somebody authors otherwise.
12. **W3 and W5 are coupled by the salt path** (the halite band's
    `wins:`); the plan says author the halite band in W5 if the waves
    land in separate sessions.
13. **Two DB drops** (Deposit's class path at W0; salt's material path at
    W5) — no migration, ever; the sibling worktrees must know their dev
    DBs need the same drop after pulling.

---

## Deferred seams

Clean attach points this build leaves, and the slate each belongs to.
Deferred design does not live here.

- **The engaged-act base** — `MiningActController.engageAct`,
  `FieldWorkController.engageAct` (now `GroundWorkController`) and
  `QuarryActController.engageAct` are three copies; forestry.md names
  the third copy as the promotion trigger. → `api-normalization-slate`.
- **The pit sump / working below the water** — `floorStop()` is the
  seam a pump lowers. → `mining-slate`.
- **The upstream externality** — a ditch that lowers a neighbour's water
  table rides the watershed's rights records. → `watershed` follow-on
  in `field-substrate-slate`.
- **Foraging's `dig`** — the `Diggable` interface answered by a `Soil`
  host drawing organic matter, with a biome-authored table. →
  `discovery-slate`. ⭐ The seam is genuinely clean:
  `SOIL_ORGANIC_MATTER_RESERVE_KEY` and `organicMatterFraction()` already
  ship, so foraging adds **one method** (`drawOrganicMatter`, which died
  with the cut branch). ⚠ Read § A2 — this verb was **withdrawn in review
  once** (MR !268) for hard-coding its yield.
- **A `stoke` act** for a furnace's `fuel` reserve. → `fire` follow-on
  (`metal-chain-slate` owns coke; the hearth is nobody's yet).
- **Smoke as a rate** — `smoke-cure.yaml`'s `cure.moisture` constant is
  the last instant drying in the tree; the chimney is a hot dry scope
  over the same arm. → `cooking-slate`.
- **`drive`/`sink`/`raise` instruments.** → `mining-slate`.
- **Ceramics, masonry, glass** — `Pottery` affording `fire`, dressed
  ashlar from `piece`, sand as a row on this mechanism. →
  `content-packs-slate` Part 6 / `trade-roster-slate` / the bottling
  build.
- **The unification's second half** — `Strata` × `Soil`, the seeded ×
  derived seam, `GroundCharacter`'s promotion on its third consumer, the
  `Cover`. → `field-substrate-slate`.
- **Peat in a bloomery** (no `carbon` tag today). → `metal-chain-slate`.
- **The hive** (Stage B) — untouched here. → `extraction-slate` Stage B
  / `ranching.md § bees`.

⭐⭐ **Verb findings recorded by the lens pass (2026-09-24), for the
RGO-interface unification — the very next build, whose job this is:**

- **`hew` is `dig` underground.** Same act, same tool capability, and the
  only difference is a roof. Collapsing it is correct by § A1's own
  reasoning and is deliberately NOT done here: it is mining's shipped
  surface, archetype, help and wire tests. → `mining-slate` /
  the unification wave.
- **`split` has three members already.** The `Block` (this build), the
  `Bole` — which does this job today under `fell`, as its own view admits
  (*"Fell a standard with an axe, or cross-cut a felled one"*) — and a
  `Stackable`. The pattern is named so the wave inherits a pattern rather
  than three overloads. → the unification wave.
- **`smelt` is `fire`'s sibling.** Both run a charge in a hot chamber;
  `smelt` keeps its own verb because grade × metal fraction is real
  chemistry and calling calcination "smelting" would be a lens-1 lie —
  but the two want looking at together. → `metal-chain-slate`.
- **`class TravelNodes` is dead code** — an empty exported class (private
  constructor, no members) left behind when its only caller inlined the
  narrowing (`TeleportController.ts:496`). Deleting it is a one-line
  cleanup nobody owns. → `api-normalization-slate`.
- **Excavation-for-a-purpose is its own verb family** (`ditch`, `sink`,
  `drive`), so a grave / well / posthole / foundation is **not** `dig`
  (§ A2) — and it wants a persistent hole that can hold something, a
  shape nothing in the tree has. → unowned; nearest home is
  `discovery-slate`.

---

## Critical files

Read first, in this order.

1. `docs/requirements/extraction-requirements.md` · `docs/slates/builds/extraction-slate.md` (§ Decided)
2. `packages/content/trade-mining/src/idea/Deposit.ts` · `packages/content/trade-mining/src/lib/Working.ts` · `packages/content/trade-mining/src/location/{AuthoredWorking,MineRoom}.ts`
3. `packages/content/water/pack.yaml` · `packages/content/tpa/src/thing/TpaTerminal.ts` (the cross-pack import shape) · `packages/server/scripts/check-mud-imports.ts:144–216`
4. `packages/content/trade-forestry/src/location/Wood.ts` · `packages/content/trade-forestry/src/thing/Bole.ts` · `packages/content/trade-forestry/content/trade/forestry/cmd/forestry/fell.yaml`
5. `packages/server/src/mud/lib/material/Cured.ts` · `packages/server/src/mud/lib/husbandry/Soil.ts:440–620` (the cached-Locality integral) · `packages/server/src/mud/api/biome.ts:160–300` · `packages/server/src/mud/api/weather.ts:90–170` · `packages/server/src/mud/lib/biome/SkyExposed.ts` · `packages/server/src/mud/lib/fire/Combustible.ts:180–230`
6. `packages/server/src/mud/lib/maturation/{MaturationProfile,Maturing}.ts` · `packages/server/src/mud/platform/thing/Vat.ts`
7. `packages/content/trade-farming/src/lib/Improvable.ts` · `packages/content/trade-farming/src/idea/cmd/farming/{FieldWorkController,DitchController}.ts` · `packages/content/trade-farming/src/location/Field.ts:150–200` · `packages/content/trade-farming/src/thing/Spade.ts` · `packages/content/trade-farming/src/idea/GroundCharacter.ts:125–145,300–325`
8. `packages/server/src/mud/lib/travel/TravelNode.ts` (the shape seam) · `packages/content/trade-fishing/src/idea/Waters.ts` (the duck-typed register read)
9. `packages/content/trade-mining/src/idea/cmd/mining/{HewController,MiningActController,StakeController}.ts` · `packages/content/trade-mining/src/thing/ClaimsRegister.ts` · `hew.yaml` · `stake.yaml`
10. `packages/content/trade-smelting/src/idea/cmd/smelting/SmeltController.ts` · `packages/content/trade-smelting/src/thing/SmeltingFurnace.ts` · `packages/server/src/mud/platform/thing/Kiln.ts` · `packages/content/generic-objects/content/stuff/thing/Kiln.yaml`
11. `packages/content/trade-cooking/src/idea/cmd/crafting/{DryController,PreserveController}.ts` · `dry.yaml` · `air-dry.yaml` · `salt-cure.yaml` · `salt.yaml` · `salt-sack.yaml`
12. `packages/content/rejection/content/world/rejection.yaml` · `…/location/old-workings.yaml` · `…/idea/deposit/ferrow.yaml` · `…/kestrel-road/tips.yaml` · `packages/content/world-seed/content/world/moor.yaml` + `moor/*.yaml` · `packages/content/terminus/content/world/terminus/estuary/*.yaml`
12a. ⚠ **`docs/slates/builds/discovery-slate.md § A first forage act,
    designed and withdrawn`** — why `dig` was cut in review, and the three
    things it settled. Read before writing `DigController`. The cut view
    and controller are recoverable from MR !268
    (`packages/content/trade-fishing/…/DigController.ts`).
12b. `packages/server/src/mud/lib/fire/Furnace.ts:95–125` (the
    appliance-affords-the-verb doctrine `fire` rides) ·
    `packages/content/trade-forestry/content/trade/forestry/cmd/forestry/fell.yaml`
    (the polymorphic-target template `dig` copies, reasoning and all) ·
    `packages/server/src/mud/lib/travel/TravelNode.ts` +
    `packages/server/src/mud/platform/idea/cmd/movement/TeleportController.ts:495–505`
    (why `Diggable` is an interface with a local narrowing, not a static holder)
13. `packages/server/src/mud/platform/idea/api/__tests__/PackLogic.discover.test.ts:55–110` · `packages/server/package.json:36–82` (the roster) · `packages/wire/tests/forestry.dirty.wire.test.ts`
14. `docs/subsystems/{mining,forestry,spoilage,maturation,soil,content-packs,advancement}.md`

---

## Drive record

*(appended at build time)* — the output of running the requirements
doc's 23-step drive against the running game, the count, and what each
failure was. Precedent: `farming-plan.md § Checkpoint A`.
