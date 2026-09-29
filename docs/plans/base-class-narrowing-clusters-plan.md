# Base-class narrowing, phase 2b — the clusters

Extends [base-class-narrowing-requirements](../requirements/base-class-narrowing-requirements.md)
on branch `build/narrowing` (MR !303, already open). **Kind:**
refactor/sweep. **Leads from:** kernel; the consumer is every reader of a
`<composition>` panel, and the first thing a player can feel is that a
shop counter, a floor and a hearth stop claiming they can be owned like a
knife and hidden like a knife.

⚠ **Scope note.** The requirements doc lists `Concealable`-on-`Thing`
(register #4) as a non-goal *"because no signal exists in the data to
draw the line automatically."* The owner has since ruled that this is
the reason to do it, not to defer it, and asked for every `Thing`
subclass to be walked template by template. That ruling is the scope of
this plan; nothing else in the requirements doc is reopened.

⭐ **The measurement that makes this pass possible is
`packages/server/scripts/check-composition-census.ts`** (683 classes,
1922 rows, zero load failures). Its header is binding on how its numbers
are read: a zero in list A is one of three things — a misrepresentation,
a content gap, or behaviour with no authored surface — and **only the
first is narrowing**. Every verdict below names which of the three it
is and the file it was decided from.

⚠ **This plan covers the THING branch.** The Idea, Agent and Location
passes follow and cite the CROSS-BRANCH decisions here rather than
re-arguing them. Every plan-level decision is tagged `THING-ONLY` or
`CROSS-BRANCH`.

---

## The waves at a glance — start at W0

| wave | one line | ends at |
|---|---|---|
| **W0** | mint `lib/stuff/Movable` = `Chattel(Concealable(Thing))` + its `platform/thing/Movable` twin; `Thing` root = `Wet(Visible(Detailed(Perceptible(Tangible(Containable(Stuff))))))`; sed every root importer (3 import shapes) onto `Movable`; 78 classes drop their own `DetailedMixin(` wrap; 9 bare rows → the `Movable` twin; `StudioLogic` palette | `build(narrowing W0)` |
| **W1** | 16 kernel immovables back onto `Thing` (`Stock`/`BankCounter` compose `ContainerMixin(Thing)`; `WaterFixture` its own stack) | `build(narrowing W1)` |
| **W2** | 29 pack immovables back onto `Thing`, each pack's vitest green | `build(narrowing W2)` |
| **W3** | `Chattel` off `Creature`, onto `KeptAnimal` + `Livestock` | `build(narrowing W3)` |
| **W4** | docs: the branch diagram, `chattel.md`, `concealment.md`, ~50 `(Thing)` mentions, `Receptacle` docstring; wiki pages `chattel` / `concealable` / `movable` | `docs(narrowing W4)` |
| **W5** | the drive, part E: both inverse panels, the hidden cache, an armed trap, a counter's stamp on the good, a floor refusing `get`, the cat nameable, no person on `wiki chattel` | `drive(narrowing W5)` |
| **W6** | the composition census re-run and its delta in § Drive record | `tools(narrowing W6)` |
| **W7** | `lint:mass` — census-then-ratchet over rows of `Tangible` classes authoring neither `mass` nor `_materialPath` (257 today) | `lint(narrowing W7)` |
| **W8** | the dead keys: 11 `long:` → `longDescription:`, 12 `material:` → `_materialPath:`; invariant 12's ceiling 436 → measured; `look sextant` has a long description (the census fix is `c32cb4db9`, already landed) | `fix(narrowing W8)` |
| **W9** | the naming wave: `FurnaceMixin` → `BurnerMixin`; mint `lib/fire/Firebox` and re-base seven classes; `ToolItem` → `Tool` (without preempting N3) | `refactor(narrowing W9)` |

Every wave lands green on `lint:family` + `pnpm test:near` + each touched
pack's vitest; `pnpm test` once before the MR returns to review.

---

## Grounding

Every fact below was taken by opening the file this cycle, at
`f626b8760` on `build/narrowing`.

### The Thing root and what it claims

- `lib/stuff/Thing.ts:79` —
  `Chattel(Concealable(Wet(Visible(Perceptible(Tangible(Containable(Stuff)))))))`.
  The docstring (`:1-33`) defines the branch as *"the physical-object
  branch: contained somewhere, made of material, describable,
  referenceable by keyword"* — that is the inner five. The comment at
  `:47-56` calls `Chattel`, `Concealable` and `Wet` *"additive attribute
  mixins"* bolted on later.
- `lib/chattel/Chattel.ts:1-25` — its own header says *"Composed at the
  movable-good tier (`Thing`)"*. The tier it names does not exist as a
  class; the root is standing in for it.
- `lib/concealment/Concealable.ts:1-20` — *"Every loose perceivable (a
  `Thing`, a `Creature`/`Character`, an `Exit`) composes it so a designer
  can hide a cache, a secret door, or a lurking creature."*
- `lib/stuff/Stuff.ts:1053-1128` — the branch invariant is enforced by
  **class identity** in the `Stuff` constructor; only
  `lib/stuff/{Thing,Location,Idea,Agent,Shadow}.ts` may register
  (`#branchRegistrationAllowlist`). ⭐ **A new root that does not extend
  `lib/stuff/Thing` cannot be constructed.** So the only shape a
  narrower-than-Thing class can take is a *sibling rung under Thing*,
  which forces the split to be *Thing loses mixins; a subclass regains
  them* — never *a new base beside Thing*.
- `platform/thing/Thing.ts` — the concrete twin; its docstring lists its
  rows as *"a toilet, an anvil, a folded hide, a yard wall, a trough, a
  crumpled ticket stub"* — a mix of fabric and goods. The census lists
  15 rows: `campus-farm/thing/{handcart,trough,yard-wall,hay-barn,byre,midden}`,
  `stuff/thing/fixture/toilet`, `stuff/thing/gear/anvil`,
  `stuff/thing/items/hide-stock`, `newbie-wilds/delve/{reward,hidden-cache}`,
  `university-avenue/thing/gutter-litter`,
  `trade/forestry/thing/{felled-tree,timber}`, `trade/quarrying/thing/piece`.
- **Importers of `lib/stuff/Thing`:** 103 non-test modules and 212 test
  files, counted over **three import shapes** — the package specifier
  (`lib/stuff/Thing`, 97 modules), the relative path from inside `lib/`
  (`'../stuff/Thing'`: `lib/stuff/Vessel.ts`, `lib/boundary/Boundary.ts`,
  `lib/boundary/BoundaryAnchor.ts`, `lib/commerce/Menu.ts`), and ⚠ **the
  platform twin** (`'./Thing'` / `platform/thing/Thing`): `Signpost`,
  `Ladder`, `trade-fishing/Bait`, `trade-haulage/RateBoard`,
  `trade-milling/GristMill`, `residence/DeedDesk`, `water/Shore` extend
  the *twin*, not the root. A sed over one shape misses the other two.
- `lib/boundary/Boundary.ts:60` — `PostRegistrationMixin(Thing)`;
  `platform/thing/Door.ts:71` extends `Boundary`. A door is part of the
  place: `Boundary` stays on the matter root and `Door` needs no edit.
- `platform/idea/api/StudioLogic.ts:81-96` — `PALETTE_BASE_CTORS` names
  `Thing` and `Vessel` as describable bases. A new rung must be added
  there or the studio cannot offer it.

### `ConcealableMixin` — who writes it, who reads it

- **Writers at runtime** (`grep setConcealment(`): `ArmController.ts:114`
  (a deployed trap), `Exit.ts:396,609,611,702,704` (secret doors), and
  `lib/concealment/Hiding.ts` (a Character hiding itself — the
  actor-side band). **Nothing writes it on a generic Thing.** There is no
  `stash`/`bury` verb; `hide.yaml` is self-hiding only.
- **Readers** (`grep isConcealable(`): `LookController.ts:389,562,595`,
  `SearchController.ts:190`, `PerceptionLogic.ts:972,1000,1053,1077`,
  `ArmController.ts:103`. Every reader treats a non-concealable candidate
  as visible (`LookController.ts:562`: `!isConcealable(c) || !c.isConcealed()`).
  ⭐ **Removing the mixin from a class cannot make anything invisible or
  break any reader.**
- **Authored** on exactly 5 Thing rows: the four
  `generic-objects/.../traps/*.yaml` (class `Trap`) and
  `newbie-wilds/delve/hidden-cache.yaml` (class `/platform/thing/Thing`).
  The three other `concealment:` hits (`lounge/location/bar.yaml:101`,
  `delve/corridor-{1,2}.yaml`) are **inline exit data**, not Thing rows.
- Views: zero `requires:` names it (`mixin-census`: views 0 · ctrl 3 ·
  inRows 1).

### `ChattelMixin` — who writes it, who reads it

- **Stamp writers** (`grep stampChattel|\.stamp(|transferChattel`):
  `BuyController` (the bought good), `CheckController` (the checked item),
  `ConsignController` (the listed good), `ContractLogic:1798` (the lent
  item), `NameController:113` (**a kept animal**), `SampleController`,
  `HarvestController` (the crop), `CraftingLogic` (the output),
  `SewController` (the garment), `FellController:323` (the felled trunk),
  `HewController:238` (the lump), quarrying `Working.ts:619` /
  `Block.ts:202` (the piece). **No writer targets a counter, a floor, a
  furnace, a water fixture, a person or a corpse.**
- **Readers on the Creature stack:** `Metabolic.ts:749`
  (`integratesLongAbsence = isChattel(self) && isStamped()` — its comment:
  *"starts mattering the moment livestock exist"*), `feeds.ts:97` (the
  same guard in the brain), `Bonded.ts:424,620,765` (pets — `KeptAnimal`),
  `NameController.ts:112-120` (the kept animal). Every one is true only
  of a kept or herded animal; a person has never been stamped.
- **Readers on containers' contents** (`Container.ts:219`,
  `Adornable.ts:168`, `PersistableLogic.ts:195,498,569`,
  `Stock.ts:184,319`, `Consignment.ts:108`, the brains) narrow on the
  *good*, never on the host.
- `docs/subsystems/chattel.md:138` states the composition point (*"the
  `Thing` tier (the movable-good tier)"*); `:20-40` gives
  `ownerOf = stamp ?? parcel-extent ?? authorOf`, and says a *fixture in
  a let unit* is titled to the parcel through the middle rung. ⚠ That
  sentence is about **furniture** (a chattel whose template sits under a
  parcel), not about floors — see D13's line.

### `Creature` and `KeptAnimal` (for the Chattel move)

- `lib/creature/Creature.ts:147` — `ChattelMixin` is the outermost layer
  of the body stack; `:126-134` records the `Branded` move this build
  already made *"by the same one-line move as Chattel and with the same
  argument"*.
- `lib/creature/KeptAnimal.ts:101-107` — `PersistableMixin(BrandedMixin(
  BehavedMixin(BondedMixin(StatusMixin(PostRegistrationMixin(KeptAnimalBody))))))`.
- `content/trade-ranching/src/agent/Livestock.ts:68-72` —
  `ProducingMixin(HandledMixin(HandlingMixin(BrandedMixin(Creature))))`.
- `platform/agent/Corpse.ts:21` — `extends Creature`. A corpse is never
  stamped (no writer above targets one).
- `lib/creature/__tests__/Creature.branded.test.ts` — the template for
  the Chattel test.

### The other list-A mixins on the Thing branch, judged from their files

| mixin | file | what a zero means there |
|---|---|---|
| `DetailedMixin` | `lib/description/Detailed.ts` (`details` authorable) | an authoring surface with **no runtime writer** (`grep setDetail(` outside the mixin and tests: none); readers `Look/Feel/Sense/SingleSenseControllerBase`, `mql/resolver.ts:650-1095`, `scope-walk.ts:349` all fall through on a non-detailed host |
| `GradedMixin` (via `CraftedMixin`) | `lib/craft/Graded.ts:1-20` | *"every crafted output is graded by the same surface as every graded input"* — the band is **stamped by the craft** (`CraftingLogic.ts:1889,2054,2308`); default `'fair'` |
| `BrandedMixin` | `lib/corpo/Branded.ts` | `_brandKey` authorable; ⚠ **no runtime writer exists** (`grep setBrandKey`: only `CharcoalPit.setBrandsTemplate`, a different field). 0/18 `Bottle`, 0/2 `GradedReceptacle`, 0/4 `Sack`, 4/15 `SpiritBottle` |
| `ThermalMixin` | `lib/thermal/Thermal.ts` | behaviour; W3/W4 of the first plan made it real for carried things; `stampedTemperatureK` is a seed an author may write |
| `TangibleMixin` | `lib/material/Tangible.ts:150-152` | `_materialPath` / `mass` authorable. **0/24 `Seed`, 0/17 `Stock`, 0/15 `SpiritBottle`, 0/11 `ServingVessel`, 0/6 `Menu`, 0/6 `Wand`, 0/7 `TpaTerminal`** — `Seed.ts` sets no mass; a seed weighs 0 kg today |
| `ContainableMixin` | `lib/spatial/Containable.ts` | `fixedInPlace` authorable, default false; 13 classes set it in their constructor (`Chair.ts:26`, `Fitting.ts:41`, `Stock.ts:106`, `WaterFixture`, `Icebox`, `GlassRack`, `IceBin`, `Tap`, fishing `Trap`, `Shore`, `ManaLamp`, `ManaMain`, `TpaTerminal`) |
| `WetMixin` | `lib/wetness/Wet.ts` | list B — derived from material; no authorable field |
| `CirculatingMixin` | `lib/residency/Circulating.ts:1-35` | *"worn by every item class"* — the distribution census; authored on 15/18 bottles, 10/13 crates |
| `DyedMixin` | `lib/material/Dyed.ts` | the dye stack is written by the dyeing trade at the bath; 0/19 garments author one — an undyed coat is honest |
| `AlloyedMixin` | `lib/material/Alloyed.ts:40-60` | *"Metal stock only — `Ingot`, `Casting`, `Bloom`"*; the furnace computes the scalar; its own header already applied the host test |
| `StackableMixin` | `lib/stuff/Stackable.ts` | `quantity` is runtime state with an authorable seed |
| `WearableMixin` on `CutPieces` | `trade-tailoring/src/thing/CutPieces.ts:1-17` | *"`Wearable` before it is wearable, which sounds odd and is exactly right"* — the `cutTo` stamp must survive cut → sew |
| `ToolMixin` on `WateringCan` | `platform/thing/WateringCan.ts` | affords `water` through a class static (`commandContributions`); the row needs no `capabilities` |
| `PlacingMixin` | `lib/spatial/Placing.ts` | `placements` authorable with a default; 1/8 `Fitting` authors it (`meat-hook`), the rest take `on` |
| `PosturedMixin` on `Floor` | `platform/thing/Floor.ts:54-62` | 0/8 author postures; the floor's postures are the mixin's defaults (you can lie on any floor) |
| `Vessel` | `lib/stuff/Vessel.ts:64-140` | `ContainerMixin(Thing)` + a `transmissionFactor` read only by `Haulable.ts:69` and `LoadBearing.ts:176` (`instanceof Vessel`) — a **carried-vessel** role check |

### The instrument the acceptance reads through

- `lib/wiki/components/composition.ts` — the forward panel
  (`kind="template"`) and the inverse (`kind="mixin"`), ungated,
  read-time, never a gate. The inverse needs a wiki page whose subject is
  the mixin: `wiki-starter/content/wiki/main/{atmospheric,branded}.md`
  exist; **no page exists for `ChattelMixin` or `ConcealableMixin`**, so
  the drive's inverse reads need two new pages.
- `packages/wire/tests/base-class-narrowing.dirty.wire.test.ts` — the
  existing drive; `inverse()` (`:113-135`) asserts a positive render
  before any negative; part A reads `wiki backpack` and `wiki branded`.

### Lints and rows that constrain a class move

- `scripts/check-instanceable-placement.ts` invariant 12 — **no orphan
  data key**: a row authoring a key its class no longer declares fails
  CI. So a class losing `Concealable` must have no row authoring
  `concealment`; `hidden-cache.yaml` does, and moves with the mixin.
- Invariant 7 — every instanceable template sits under a branch
  segment; a new twin at `/platform/thing/Movable` satisfies it.
- The platform pack ships six `platform/thing/*.yaml` rows
  (`BoundaryAnchor`, `LightningStrike`, `Ticket`, `UnboundedReceptacle`,
  `reading-record`, `sandbox/*`) — rows that name kernel classes so a
  mechanism can clone rather than construct.

---

## Plan-level decisions

Numbered so waves, commits and the three sibling passes can cite them.

### D1 — the evidence standard (CROSS-BRANCH)

A list-A zero is **narrowing** (reading 1) only when all three hold, each
verified by grep at build time and cited in the commit:

1. **no runtime writer** targets a host of that class (`grep set<Field>(`
   and every stamp/mint path);
2. **no reader needs it there** — controller narrowing, view `requires:`,
   Api narrowing, and a row naming the mixin in a non-`requires:` field
   (`mixin-census` channels 1–7);
3. **the concept is false of what the class IS**, argued from the class
   docstring, not from the count.

Failing (1) or (2) is reading 3 (behaviour). Passing both but the concept
being true of the class is reading 2 (a content gap → a slate line, never
code). The Agent, Location and Idea passes apply this standard and cite
D1.

### D2 — what `Chattel` means and who carries it (CROSS-BRANCH)

*Chattel is per-instance ownable property: something that can be bought,
consigned, lent, stolen, and stamped with a chain of title.* It is
carried by:

- **movable goods** — the `Movable` rung this plan mints (D13);
- **kept and herded animals** — `lib/creature/KeptAnimal` and
  ranching's `Livestock`, the two hosts `Branded` already landed on;

and by nothing else: not persons, corpses or shades (`Creature` loses it
— W3), not immovable matter (a floor, a hearth, a counter — their
ownership is the parcel's, `ParcelApi.ownerOf`, and no stamp path has ever
targeted one), not locations, not ideas. The Agent pass cites this and
does not re-open it; the Location and Idea passes have nothing to do
(neither composes it).

### D3 — what `Concealable` means and who carries it (CROSS-BRANCH)

*Concealable is "its presence may be non-obvious to a viewer."* It is
carried by what can be **placed out of sight** (a movable good — the
`Movable` rung), what can **put itself out of sight** (a `Creature` —
`Hiding.ts` writes the band), and what can be **a secret way** (`Exit`).
It is **not** carried by immovable matter — *you cannot hide a floor, it
is the room* — nor by any `Location`.

⭐ On `Movable` the zero (5 of ~490 rows) is reading **2**, a content gap
with a named mechanism gap behind it: no verb lets a player stash a
good, so the only concealment a good can have is authored. That verb
(`stash`/`bury`, the *player-placed concealment* `concealment.md:164`
defers) is a slate line, not this build. On immovables it is reading
**1**. On `Creature` it is reading **3** (written by `Hiding`). The Agent
pass keeps `Concealable` on `Creature` and cites this.

### D4 — `Thermal` is behaviour and is never narrowed on authoring (CROSS-BRANCH)

`stampedTemperatureK` is a seed; the value moves every tick. Zero rows
authoring it is reading 3 on every host that composes it — `Provision`,
`Plant`, `Bottle`, `Receptacle`, `Vat`, `Firewood`, `Ingot`, `Oven`,
`Cast`, `Extra`, `Fish`. No narrowing on this evidence, on any branch.

### D5 — `Tangible` is mandatory; its zeros are a content gap WITH A GATE (CROSS-BRANCH)

`Tangible` is mandatory on the branch by concept (the owner's criterion,
D13) — a Thing is *made of something* — and its authoring count is
**342/599 (57%)**: **257 rows across 85 Thing classes author neither
`mass` nor `_materialPath`** (measured from the matrix). A seed that
weighs nothing, a shop counter made of nothing, a wand with no mass are
holes the encumbrance walk, `feel`, the material-response grids and the
thermal model all read through silently. That is the failure shape this
repo names as *missing enabling data fails closed and silent*, and the
repo's own pattern for it is **census, then ratchet**
(`docs/lint-family.md § census, then ratchet`; `check-perishable.ts` is
the closest gate in shape).

**Verdict: reading 2, and a gate, not a slate line.** W7 adds
`lint:mass` — for every shipped row whose `class:` composition reaches
`TangibleMixin`, count the rows authoring neither `mass` nor
`_materialPath` (folding `extends:` parents, as the census does); the
count is pinned at today's ceiling by the gate's own test (lint-family.md
item 2: *a ratchet whose own test pins the number*) and may fall, never
rise. The ceiling is measured at W7 time, not copied from this plan.
⚠ No exemption list: a class that legitimately derives mass at runtime
(the Agent pass must check whether `OrganismMixin` derives a body's mass
from its species before counting `Cast` 0/43) is excluded by
**composition** — the gate skips classes reaching `OrganismMixin` if
that check holds — never by name. The Agent and Location passes cite
this; the gate walks every branch, so their zeros are counted the day it
lands.

The named worst offenders (rows ≥ 2): `Seed` 0/24, `Stock` 0/17,
`SpiritBottle` 0/15, `ServingVessel` 0/11, `TpaTerminal` 0/7, `Wand`
0/6, `Menu` 0/6, `Trap` 0/5, `Tariff` 0/4, `Bandage` 0/4, and eighteen
more the gate will print.

### D6 — `Containable.fixedInPlace` is a default, never narrowed (CROSS-BRANCH)

Reading 3 everywhere. Thirteen classes fix themselves in their
constructor; the field exists so a row can override. Nothing to do.

### D7 — `Slotted` / `Posed` / `Postured` zeros are defaults (CROSS-BRANCH)

A body's slots come from its `BodyPlan` (`BodyPlanSlotsMixin`), a floor's
postures from `PosturedMixin`'s defaults, a coach's slots from its class.
Reading 3. The Agent pass cites this for `Cast`/`Extra`/`Fish`
(`Slotted` 0, `Posed` 0).

### D8 — `Detailed` goes with `Perceptible`: onto the Thing root; the count is a content gap (CROSS-BRANCH, ruled)

**The owner's rule (F2, ruled 2026-09-29):** *`Detailed` goes with
anything `Perceptible`; every branch wants `Perceptible` on its base
except Idea; the rows that author no details should mostly have some
written for immersion's sake.* So the 362 rows over 58 Thing classes
authoring no details are **reading 2 — content to write**, not a mixin
to strip, and the mixin's host is the root, not each subclass.

**Why the rule is right, from the file.** `DetailedMixin` is no longer
prose-only: a `Detail` (`Detailed.ts:71-84`) carries **five sense-channel
slots** (`vision/hearing/smell/touch/taste`) and nests; `Tangible`'s
`_detailMaterialPaths` (`Tangible.ts:151`) keys per-part *material*
overrides by the same dotted detail path (`BiomeLogic.ts:695` walks
`hearth.embers`); `feel <thing>.<detail>` takes a touch band off the
part's material. A keyword-addressable thing's parts are the address
space that per-part material, per-sense text and the touch read all
hang off — **you must compose `Detailed` to reach any of it.** The
metadata is a *matter* payload: a material, a temperature, a texture.

**What changes in D13.** The `Thing` root composes
`DetailedMixin` beside `PerceptibleMixin`:
`Wet(Visible(Detailed(Perceptible(Tangible(Containable(Stuff))))))`. The
78 Thing-branch classes that wrap `DetailedMixin(` themselves (listed by
`grep -rl "DetailedMixin(" packages/server/src/mud packages/content/*/src`
minus the seven Location-branch files) **drop the wrap** in W0 — the
mixin machinery de-duplicates fields by key on read
(`mixin.ts:828-879`) so a double wrap does not throw, but it is a second
prototype layer and a second panel entry saying the same thing, and W0
is the moment to remove it. Nothing else changes: every immovable — a
hearth, a floor, a counter — gains the same surface, which is exactly
the immersion case the owner named.

⭐ **The Idea branch is the worked example of this rule, and the
yardstick for how narrow a root should be.** From the same matrix: 460
Idea classes, 1106 rows; **four** compose `PerceptibleMixin`
(`Material` 93/94, `ConsumableMaterial` 70/70, `RadioactiveMaterial`
1/1, `arcana/PotionMaterial` 3/3 — 167 of 168 rows author keywords);
**none** composes `DetailedMixin`. `Perceptible` sits on the one Idea
subclass that earns it — a material you can `analyze` by name — and
nowhere else, and every row uses it. That is not luck; it is what a
well-shaped base looks like, and it is the test the Agent and Location
passes apply to their roots and that D13 applies to `Movable`: **not
"does some row author it" but "is this the subclass that earns it".**

⚠ **The one tension, proposed on, not resolved silently.** Read
strictly, *Detailed goes with Perceptible* would ADD `DetailedMixin` to
`Material` — an addition on the branch that is already clean — while
the owner also said details matter less *"like Idea classes like
Material or Biome."* Checked in the code: **nothing reads a Material's
details** (`grep isDetailed|getDetail` over `platform/idea/material/`,
`MaterialLogic`, the `analyze` path: none), a Material is not `Tangible`
so it has no per-part material to key, no temperature for a touch band,
and no room to be sensed in. Composing it there would be dead surface
today — the very thing this build removes. **Recommendation: the rule is
*Detailed goes with Perceptible on MATTER* (the Thing, Agent and Location
roots); the Idea branch's Perceptible members stay without it until
something reads a material's parts.** ⚠ Flagged as the owner's call (F2b)
because it narrows the owner's sentence by one word; the Idea pass acts
on whichever limb the owner takes.

**What the Agent pass inherits.** `Creature` composes `Perceptible` and
`Visible` (`Creature.ts:135-140`) and **not** `Detailed`; under this
rule its root gains `DetailedMixin` — a body has parts you can look at,
feel and treat. That is the Agent pass's one addition and it cites this
decision. `CartesianLocation` already composes it (`CartesianLocation.ts:66`;
55/94 authored) — the Location pass has nothing to add.

### D9 — `Wet` is a property of ALL matter and stays on the root (CROSS-BRANCH)

`WetMixin` has no authorable field, so authoring cannot judge it and the
owner did not rule on it. Argued on the concept, from
`lib/wetness/Wet.ts` and its call sites:

- **Who writes it.** `WeatherLogic.ts:885-895` — the rain fan-out wets
  *every* wetness-bearing occupant of a sky-exposed room's `getContents()`,
  with no portable/fixed distinction: a bench in a yard, a hearth under an
  open roof, a body, a cloak. `FireLogic.ts:202-210` and
  `ElectricityLogic.ts:358` — immersion (a thing dropped in water, a body
  in a flooded cell) pushes `wet()` on whatever is immersed.
- **Who reads it.** `Combustible.ts:230` — wet fuel will not take (a
  rained-on hearth's fuel is exactly the case; `Turf` composes both);
  `ElectricityLogic.ts:355-363` — a wet body conducts, and the
  `substation/flooded-floor` **Floor row** is the shipped demonstrator's
  medium; `Tangible.getMass():403-412` — absorbed water adds mass
  (organisms carved out); `ThermalRegulation.ts:597`, `Attired.ts:256,669`,
  `Wearable.ts:414` — wet clothing chills a body.
- **Does a floor or a wall being wet mean anything today?** Yes, on two
  channels: a wet floor conducts (the electricity demonstrator is built on
  it) and a wet combustible immovable will not light. Nothing today reads
  a wet wall, but the rain writes it — and a wet wall is *true*, which is
  the whole standard this build holds the panel to.

**Verdict.** Wettability is a property of matter in weather, not of
portability: it belongs on the `Thing` root, beside `Tangible` whose
material it modulates, and composes onto `Creature` for the same reason
(`Creature.ts` stack; the Agent pass keeps it). It is **not** narrowed to
`Movable` — that would make the yard bench dry in the rain and the
flooded floor an insulator — and not a capability a narrower set
composes, because the writer (rain) cannot know which contents to skip
without the guard that is this repo's tell for a wrong host. `Location`
is space, not matter, and never composes it (`architecture.md:836`).
The Agent, Location and Idea passes cite this.

### D10 — `Crafted`/`Graded` are stamped at craft; a recipe-less class is a content gap (CROSS-BRANCH)

`Crafted` carries provenance and grade; both are written by
`CraftingLogic` on output. A class that composes it and has no recipe
today (the eleven instruments on `ToolItem`) is a class whose recipe is a
data file somebody has not written — reading 2, never a class defect.

### D11 — `Branded` on `GradedReceptacle` stays; the bottling stamp is the gap (THING-ONLY)

0/18 bottles carry a mark and **no verb writes one** — the bottling trade
never stamps its own product. That is the archetypal branded good
(`Branded.ts:6`: *"every bottle is truthfully owned"*) with the mechanism
missing. Reading 2 with teeth: the slate gets *"the fill at a branded
still/bottling line stamps `_brandKey`"*. Not narrowing.

### D12 — the behaviour-with-defaults roster (THING-ONLY)

Each of these read zero somewhere and is reading 3 from its own file;
none is touched: `Circulating` · `Sealable` · `VesselKind` (the class
fixes the kind) · `Bulkable` · `Stackable` · `Alloyed` · `Dyed` ·
`Labelled` (players write labels) · `Blessable` (BUC is minted) ·
`LightSource` on a furnace (the fire glows when lit) · `Combustible` ·
`SelfHeating` · `Staling` · `Cultivable` (a pot IS cultivable; the fields
default) · `Fixture` (`seatIn` is optional) · `Placing` · `Postured` ·
`SpaceHeating` · `Wearable` on `CutPieces` (by design, `CutPieces.ts:4`) ·
`Tool` on `WateringCan`/`Tap` (capabilities set by the class).

### D13 — the `Movable` rung: `Thing` becomes the matter root (THING-ONLY, ⚠ flagged F1)

**The split.** `lib/stuff/Thing` keeps what its docstring says a Thing is,
plus the one mixin the owner's rule pairs with `Perceptible` (D8) —
`Wet(Visible(Detailed(Perceptible(Tangible(Containable(Stuff))))))` —
and stays the registered branch root. **F1 ruled 2026-09-29: this is the
split; proceed.** A new `lib/stuff/Movable.ts`
composes `ChattelMixin(ConcealableMixin(Thing))`: *a thing that can be
carried off, and therefore owned and hidden.* Every goods class re-bases
onto `Movable`; every immovable class stays on `Thing`. The concrete
twins are `platform/thing/Thing` (bare immovable matter — a yard wall, a
toilet, a midden) and a new `platform/thing/Movable` (bare goods — an
anvil, a folded hide, a stash pouch).

**The owner's criterion, and the root measured against it.** *Strip
`Thing` to the bare bones; if a mixin is mandatory, that tells you the
whole branch wants it.* The seven, over the whole branch (183 classes,
599 rows, from the same matrix):

| mixin | rows authoring | verdict under the criterion |
|---|---|---|
| `Visible` | 597/599 | mandatory — the branch says so |
| `Perceptible` | 598/599 | mandatory — the branch says so |
| `Tangible` | 342/599 | mandatory by concept (a Thing is made of something); the 257 are a gap with a gate — D5 |
| `Containable` | 8/599 (`fixedInPlace` is its only authorable) | mandatory by concept (a Thing is somewhere) — D6 |
| `Wet` | no authorable field | mandatory by concept (matter in weather) — D9 |
| `Concealable` | 5/599 | not mandatory — D3 |
| `Chattel` | no authorable field, minted at transfer | not mandatory — D2 |

So the root is the five plus `Detailed` (D8 — it goes wherever
`Perceptible` goes, and is the access path to per-part metadata), and
the rung is the two. ⭐ **The one row in the
branch authoring neither `Visible` nor `Perceptible` is
`/platform/thing/BoundaryAnchor`** — `AdornmentMixin(Thing)`
(`lib/boundary/BoundaryAnchor.ts:4-8`), a per-side proxy for a
`Boundary`, one of `CLAUDE.md`'s three `lib/` residents instanced but
never template-stamped. It is a Thing only for `Containable`'s
not-portable veto. A thing that is neither describable nor addressable
is arguably not a Thing at all but an `Idea` carrying `Containable`; that
is a cleaner finding than any authoring count produced, it is filed on
the slate (D17), and it does **not** weaken the case for `Visible`/
`Perceptible` on the root — it is the exception that shows the rule is
load-bearing.

**Why the root loses the mixins rather than a sibling gaining them.**
The branch invariant (`Stuff.ts:1053-1128`) admits no sixth root and
registers by class identity, so an immovable class must trace through
`lib/stuff/Thing`. Mixins cannot be removed by inheritance. Therefore
the root must be the common denominator, and the goods rung is the
subclass. This is also the honest reading: `Chattel.ts` says it is
composed *"at the movable-good tier"* — that tier is what `Movable`
names.

**The line, for every class** — *immovable* iff **all** of: it is never
taken, sold, consigned, lent, stolen or stamped as an instance (no stamp
writer targets it — verified above); its ownership, when it has one, is
the parcel's; it is part of the place rather than something in it.
**Furniture is movable** (a bed, a chair, a table, a footlocker — they
are bought, and the furnishing subsystem persists placed goods by their
chattel stamp: `Container.ts:219`, `Adornable.ts:168`). A self-set
`fixedInPlace` does not make a thing immovable (`Chair.ts:26` fixes a
chair so `get` refuses; it is still chattel).

**F1 — ruled: the honest split.** (Kept for the record.) The honest split
touches every goods class's import (103 modules + 212 tests, one `sed`
over three import shapes)
and ~50 doc lines that write `(Thing)` for a composition. The low-churn
alternative — a new `lib/stuff/Matter.ts` root registered from `Thing.ts`
with `Thing` keeping its current goods meaning — needs a one-line edit to
`#branchRegistrationAllowlist` and leaves the `thing` branch rooted at a
class not called Thing. This plan is written for the honest split; the
alternative was the same edit list inverted; **the owner chose the honest
split and W0 proceeds as written.**

### D14 — `Vessel` is the carried container; immovable containers compose `ContainerMixin(Thing)` directly (THING-ONLY)

`lib/stuff/Vessel` becomes `ContainerMixin(Movable)`. Its one own
member, `transmissionFactor`, is read only while a vessel is carried or
hauled (`Haulable.ts:69`, `LoadBearing.ts:176`), so an immovable
container has no use for the class. `lib/retail/Stock`, `BankCounter`,
`DepotCounter`, `Warehouse`, `CheckRack`, `ConsignmentShelf` compose
`ContainerMixin(Thing)` in their own stack. No `FixedVessel` class: an
empty subclass is what W2 deleted `Bench` for being.

### D15 — `Chattel` off `Creature`, onto `KeptAnimal` + `Livestock` (CROSS-BRANCH; executed here)

The same one-line move as `Branded` (W1 of the first plan), for the same
reason, with the readers verified: `Metabolic.integratesLongAbsence`,
`feeds.ts:97`, `Bonded.ts`, `NameController` are all true only of a kept
or herded animal and stay true. A person, a corpse and a shade stop
advertising that they can be bought. **This is the Agent branch's one
Chattel action and it lands in this build (W3)** so the Agent pass
inherits it done.

### D16 — the wiki pages the drive reads (THING-ONLY)

`wiki-starter/content/wiki/main/chattel.md`, `concealable.md` and
`movable.md`, in the shape of `branded.md` (a `subject.kind: mixin` page
carrying `<composition kind="mixin" of="…"/>`; `movable.md` is a
template-kind page over `/platform/thing/Movable`). Without them the
inverse panel has nothing to render from and part A of the drive cannot
read the claim.

### D17 — content gaps leave as slate lines, never code (THING-ONLY)

Filed at the sweep on `docs/slates/builds/base-class-narrowing-slate.md`:
the mass ceiling `lint:mass` pins and the burn-down it invites (D5 —
the gate is code, the burn-down is content); `pinch-bar` authors no
`capabilities`; the bottling stamp (D11); the `stash` verb (D3);
`BoundaryAnchor` as an `Idea` rather than a Thing (D13); `Persona` (#5)
and `MineRoom` air (#8) unchanged.

---

## The cluster verdicts

Biggest first. *Base* = the seven root layers; their verdict is D2/D3
(narrowed by the split), D4–D9 (kept). Only the class's own layers are
argued per cluster.

| cluster (rows) | class-own layers with a list-A zero | reading | action |
|---|---|---|---|
| `ToolItem` (32) | `Detailed` 0 · `Graded` 0 (via `Crafted`) | 3 / 2 (D8, D10) | **Movable.** No new class. `pinch-bar` capabilities → slate |
| `Provision` (32) | `Thermal` 0 · `Detailed` 0 | 3 (D4, D8) | **Movable.** `Crop` (10) follows |
| `Plant` (25) | `Thermal` 0 · `Detailed` 0 · `Plant` 24/25 | 3 | **Movable** (a pot plant is carried; a standard in the ground is the `Wood`'s — the slot-plant, not an immovable) |
| `Seed` (24) | `Detailed` 0 · `Tangible` 0 | 3 / **2** (D5) | **Movable.** Mass → `lint:mass` (W7) |
| `Garment` (19) | `Dyed` 0 · `Detailed` 1 | 3 (D12) | **Movable** |
| `Bottle` (18) | `Branded` 0 · `Thermal` 0 · `Detailed` 0 | 2 (D11) / 3 | **Movable** (via `GradedReceptacle`). Bottling stamp → slate |
| `Stock` (17) | `Detailed` 0 · `Tangible` 0 | 3 / 2 | **Immovable** — `ContainerMixin(Thing)` (D14). Material → `lint:mass` |
| `Receptacle` (16) | `Thermal` 0 | 3 | **Movable** |
| bare `Thing` (15) | `Concealable` 1/15 · `Tangible` 6/15 | **1 for six rows, 2 for nine** | **Split the rows**: `toilet`, `yard-wall`, `hay-barn`, `byre`, `midden`, `trough` stay `/platform/thing/Thing`; `anvil`, `hide-stock`, `reward`, `hidden-cache`, `gutter-litter`, `timber`, `felled-tree`, `piece`, campus `handcart` → `/platform/thing/Movable` |
| `SpiritBottle` (15) | `Thermal` 0 · `Detailed` 0 · `Tangible` 0 | 3 / 2 | **Movable** (via `Bottle`) |
| `Crate` (13) | `Detailed` 0 | 3 | **Movable** |
| `ServingVessel` (11) | `Graded` 0 · `Thermal` 0 · `Detailed` 0 · `Tangible` 0 | 3 / 2 | **Movable** (via `CraftVessel`) |
| `Vat` (11) | `Graded` 0 · `Thermal` 0 · `Detailed` 0 | 3 | **Movable** — a cask, a carboy, a culture jar are sold and carried; the 1000 L brewing vat is a trade fixture *in law* but nothing in the model distinguishes it, ⚠ see F3 |
| `Weapon` (11) | `Detailed` 0 | 3 | **Movable** |
| `Crop` (10) | as `Provision` | 3 | **Movable** |
| `FurnishableRoom` (10) | — | n/a | Location branch; not this plan |
| `WaterFixture` (9) | `Thermal` 0 | 3 | **Immovable** — re-composes its own stack `UnboundedSource(Thermal(Bulkable(Thing)))` because `Receptacle` is now movable |
| `Fitting` (8) | `Placing` 1/8 · `Detailed` 0 | 3 | **Movable** (a table, a workbench, racking — furniture; a meat-hook is hung) ⚠ F3 |
| `Floor` (8) | `Postured` 0 · `Detailed` 2 | 3 | **Immovable** |
| `TpaTerminal` (7) | `Display` 0 · `Detailed` 0 · `Conduit` 0 · `Slotted` 0 · `Tangible` 0 | 3 / 2 | **Immovable** (self-fixing, `Fixture`, a network node) |
| `Firewood` (6) | `Thermal` 0 | 3 | **Movable** |
| `Menu` (6) | `Detailed` 0 · `Tangible` 0 | 3 / 2 | **Movable** (a card handed over) |
| `Wand` (6) | `Labelled` 0 · `Detailed` 1 · `Tangible` 0 | 3 / 2 | **Movable** |
| `Chair` (5) | `Detailed` 3 · `Slotted` 4 | authored | **Movable** (furniture; self-fixes for `get`) |
| `Chest` (5) | `Detailed` 0 | 3 | **Movable** (a larder, a wardrobe, a pantry chest; ⚠ `necropolis/open-plot` is a grave modelled as a chest — F3) |
| `CraftVessel` (5) | `Graded` 0 · `Thermal` 0 · `Detailed` 0 | 3 | **Movable** |
| `Feeder` (5) | `Detailed` 0 | 3 | **Movable** (a trough you fill and drag) |
| `Ingot` (5) | `Alloyed` 0 · `Thermal` 0 | 3 (D12) | **Movable** |
| `Oven` (5) | `Thermal` 0 · `Placing` 0 | 3 | **Immovable** (a kiln, an oven — built) |
| `Trap` (5) | `Concealable` 4/5 | **authored** — the one class that proves the mixin | **Movable** (armed from a kit, placed) |
| `ConsignmentShelf` (5) | `Detailed` 0 | 3 | **Immovable** — `ContainerMixin(Thing)` |
| `TextileStock` (5) | `Stackable` 0 · `Detailed` 0 | 3 | **Movable** |

**The long tail (≤4 rows, 150 classes)** carries no list-A zero that the
table above has not already judged by mixin (every zero is `Detailed`,
`Graded`, `Thermal`, `Placing`, `Labelled`, `Blessable`, `LightSource`,
`Fixture`, `Slotted`, `VesselKind`, `Bulkable`, `Cultivable`,
`SpaceHeating`, `Alloyed`, `Combustible`, `Staling`, `SelfHeating`,
`Stackable`, `Dyed`, `Wearable` on `CutPieces`, `Tool` on `WateringCan`,
`Atmospheric` on `Coach` — the first plan's row). Their whole action is
the base split. The roster:

**Immovable — stays on `Thing` (51 classes, ~115 rows):**

- kernel `platform/thing/`: `Thing` (twin, 6 rows) · `Floor` · `WaterFixture`
  · `Hearth` · `Forge` · `Oven` · `Campfire` · `Door` (through `Boundary`)
  · `GardenBed` · `JobBoard` · `AttendancePoint` · `Tariff` ⚠F3 ·
  `Signpost` (extends the twin — stays) · `NeonSign` · `Beacon` ·
  `BankCounter` · `LightningStrike` · `sandbox/SandboxCrossing`; kernel
  `lib/`: `lib/boundary/Boundary` · `lib/boundary/BoundaryAnchor` ·
  `lib/retail/Stock` (mechanism; the trade twin follows).
- packs: `trade-shopkeeping/{Stock,ConsignmentShelf}` ·
  `terminus/market/MarketStalls` · `trade-haulage/{DepotCounter,Warehouse,RateBoard}`
  · `residence/DeedDesk` · `trade-ranching/Herdbook` ·
  `trade-mining/ClaimsRegister` · `terminus/university-avenue/CrossingLog`
  · `trade-forestry/Panel` · `water/{Shore,Conduit,StorageNode,ControlStructure}`
  · `arcana/{ManaMain,ManaLamp}` · `tpa/TpaTerminal` ·
  `trade-smelting/SmeltingFurnace` · `trade-fuel/CharcoalPit` ·
  `trade-cooking/{SmokeChimney,SaltingTrough}` ·
  `trade-textiles/{RettingPit,BleachingGreen}` · `trade-farming/ToolRack`
  · `trade-hospitality/{CheckRack,BarStation,Tap}` ·
  `generic-objects/SconceLamp`.

**Movable — re-bases onto `Movable` (137 classes, ~487 rows):** every
other `lib/stuff/Thing` importer, including `Vessel` and through it
`Pack`, `Handcart`, `TipJar`, `Footlocker`, `Coach`, `Barge`,
`HaulageRig`; the furniture (`Chair`, `FoldingChair`, `Fitting`, `Chest`,
`Bed`, `Desk`, `GlassRack`, `Icebox`, `IceBin`, `Tablet`, `Lamp`,
`PortableLight`, `Ladder`); the trade equipment (`Anvil`, `Loom`,
`Still`, `GristMill`, `DyeVat`, `WoadVat`, `DoughTrough`, `Vat`,
`ButcherBlock`, `DryingRack`, `AssayBench` ⚠F3); every good, stock,
crop, tool, weapon, garment, container, plant and paper.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything else on that host |
|---|---|---|
| `lib/stuff/Movable` = `Chattel(Concealable(Thing))` | a new rung under the `Thing` root | *everything on it can be carried off — and therefore owned as an instance and hidden.* True of a seed, a coach and a bed (furniture is bought). Nothing composes onto `Movable` that could not be picked up or dragged by somebody with the strength; "can't pocket a ship" stays a mass gate (`Vessel.ts:6`). |
| `lib/stuff/Thing` (narrowed, + `Detailed`) | the branch root | *everything on it is matter in a place: made of something, describable, addressable — and therefore has parts that can be named, felt and made of their own material (D8) — wettable, contained.* No longer claims ownership or hideability for a floor, a hearth or a counter. ⚠ The test from the project's rules: **if any immovable class needs a guard like `if (MixinApi.isChattel(this))` to behave, it belongs on `Movable`** — write that down as a finding, do not add the guard. |
| `platform/thing/Movable` (twin) | the concrete twin, empty | *a bare good with no other concept* — the nine rows listed above. |
| `lib/stuff/Vessel` = `Container(Movable)` | unchanged file, one import | *a container you can carry or haul.* Its `transmissionFactor` is only read in those two acts. |
| `ContainerMixin(Thing)` in each immovable container's own stack | `lib/retail/Stock`, `BankCounter`, `DepotCounter`, `Warehouse`, `CheckRack`, `ConsignmentShelf` | *a container that is part of the place.* No shared class: the six share one mixin and nothing else. |
| `WaterFixture` = `UnboundedSource(Thermal(Bulkable(Thing)))` | its own file | *an inexhaustible liquid source that is part of the place.* It no longer descends from `Receptacle`, which is a carried liquid holder. |
| `ChattelMixin` (moved) | `lib/creature/KeptAnimal` + `trade-ranching/src/agent/Livestock` | *a kept or herded animal is somebody's property.* Off `Creature`, so `Character`, `Avatar`, `Cast`, `Extra`, `Shade`, `Corpse` stop advertising it. `Fish` and `WorkingAnimal` inherit through `KeptAnimal` — a caught fish is yours, which is what a keepnet says. |
| `ConcealableMixin` | **unchanged** on `Creature` and `Exit`; on `Movable` for things | see D3. |
| `PALETTE_BASE_CTORS.Movable` | `platform/idea/api/StudioLogic.ts:81` | *the studio can offer the goods base.* Not a host — a registry entry. |

Nothing lands on `Stuff`, `Location`, `Idea`, `Agent` or `Character`.

---

## Convention conformance

Checked against the current tree, not recalled:

- **Paths** — `lib/stuff/Movable.ts` is substrate (only inherited);
  `platform/thing/Movable.ts` is the instanceable twin; rows at
  `/platform/thing/Movable` for the nine bare goods. `<root>/<branch>/`
  unchanged everywhere else. The immovable twin keeps the name `Thing`
  (sharing the base's name is the default, `CLAUDE.md § Instanceable`).
- **Module categories** — one new Stuff class in `lib/`, one in
  `platform/thing/`. No Api, no logic singleton, no helper, no new
  category, no `eslint-disable`.
- **Module scope declares** — `Movable.ts` is a `const` composition + a
  class; no statements. `Thing.ts` keeps its one sanctioned
  `_registerTopLevelBranch` tail.
- **Import boundary** — packs import `@saxonberg/server/mud/lib/stuff/Movable`
  by package specifier; the server `exports` map must expose it
  (check `packages/server/package.json` `exports` — the pattern
  `./mud/lib/*` is what `TpaTerminal.ts:31` already resolves through;
  verify with `pnpm -C packages/server lint:imports`).
- **Verbs on objects** — no Api static changes. `lint:object-verbs` stays
  at 0.
- **Inter-Stuff contract** — nothing new reads a field.
- **Kernel mixin names** — none added; `lint:mixin-names` unaffected.
- **props:/cast:** — the moved rows use neither.
- **Gates this build must pass** (all via `lint:family`):
  `lint:instanceable` (invariants 3, 7, 12 — the twin resolves, the rows
  name real classes, no orphan `concealment:` key), `lint:imports`,
  `lint:module-scope`, `lint:field-meta`, `lint:test-bootstrap`,
  `lint:census`, `lint:counters` (`Stock` still the mechanism `retail.md`
  names), `lint:perishable` (`Provision` unchanged), `lint:object-verbs`,
  `lint:locations` (untouched), `lint:drive-scripts`.

---

## Waves

Every wave lands green on `lint:family` + `pnpm test:near` + each
touched pack's own vitest, and ends at a commit. `pnpm test` runs once,
before the MR is re-opened for review.

### W0 — the rung, behaviour-identical

Goal: `Movable` exists and every current composer sits on it, so nothing
observable changes except the six bare-fabric rows.

1. `lib/stuff/Movable.ts`: `const MovableBase = ChattelMixin(ConcealableMixin(Thing)); export default class Movable extends MovableBase { static fieldMeta: FieldMeta = {}; }`
   with the docstring stating D13's line and the two claims. Move the
   `Chattel`/`Concealable` comment block from `Thing.ts:47-56` with it.
2. `lib/stuff/Thing.ts`: drop the two mixins and their imports; docstring
   gains the split paragraph and points at `Movable`.
3. `platform/thing/Movable.ts`: `export default class Movable extends MovableBase {}`
   (the `platform/thing/Thing.ts` pattern). Update `platform/thing/Thing.ts`'s
   docstring: its rows are now only the fabric six.
4. **The mechanical re-base**: every non-test importer of the root
   (103) and every test importer (212) switches to `Movable`, including
   the identifier in the composition. ⚠ **Three import shapes**, and the
   sed must cover all three: `lib/stuff/Thing` (package specifier),
   `'../stuff/Thing'` (inside `lib/`), and the platform twin (`'./Thing'`
   in `platform/thing/`, `platform/thing/Thing` in packs). The twin's
   movable extenders — `Ladder`, `trade-fishing/Bait`,
   `trade-milling/GristMill` — move to `lib/stuff/Movable`; its immovable
   extenders — `Signpost`, `RateBoard`, `DeedDesk`, `Shore` — stay on the
   twin (now bare immovable matter). `lib/boundary/Boundary`,
   `BoundaryAnchor` and `platform/thing/Thing` itself are the three root
   importers that do NOT move. Then `tsc` + `lint:family`. ⚠ Keep the
   import name `Movable`, not an aliased `Thing` — the whole point is
   that the file says what the class is.
5. `StudioLogic.ts:81`: add `Movable` to `PALETTE_BASE_CTORS` between
   `Thing` and `Vessel`.
5a. **`Detailed` onto the root (D8):** `lib/stuff/Thing.ts` composes
   `DetailedMixin` immediately outside `PerceptibleMixin`; the 78
   Thing-branch classes that wrap `DetailedMixin(` themselves drop the
   wrap and the import (`grep -rl "DetailedMixin(" …` minus
   `FurnishableRoom`, `CircleFloor`, `Offstage`, `Lounge`, `Bar`,
   `CartesianLocation`, `Corridor`, `DormRoom` — the Location branch is
   not this plan's). `lib/stuff/Vessel.ts`, `lib/retail/Stock.ts`,
   `lib/commerce/Menu.ts` are in the 78. A class's own docstring that
   says `DetailedMixin(Thing)` is updated to say the root carries it.
   Tests asserting `isDetailed` on a class keep passing; a test asserting
   a bare `Thing` is NOT detailed was asserting the old shape — delete
   and say so.
6. Rows: the nine goods rows named under *bare `Thing`* change `class:`
   to `/platform/thing/Movable`.
7. Tests: `lib/stuff/__tests__/Movable.test.ts` (composes the two, traces
   the Thing branch, `MixinApi.isChattel`/`isConcealable` true);
   `Thing.test.ts` gains *"is neither chattel nor concealable"*.
8. `pnpm -C packages/server composition-census` — `Movable` appears as a
   layer on every goods class; `Thing`'s rows read six.

Acceptance: `lint:family` green; `test:near` green; the census diff
shows only the new layer. Commit:
`build(narrowing W0): the Movable rung — Thing is matter, a good is what you can carry off`.

**✅ W0 DONE.** `lib/stuff/Movable` + `platform/thing/Movable` exist;
`Thing` is `Wet(Visible(Detailed(Perceptible(Tangible(Containable(Stuff))))))`.
309 modules re-based, exactly 78 classes dropped their own `DetailedMixin(`
wrap, 9 rows moved to the `Movable` twin and 6 stayed on `Thing` (the
fabric six: toilet, yard-wall, trough, midden, byre, hay-barn). `tsc`
clean, 57 gates green.

What it cost, and what a re-run should know:

- ⚠⚠ **The plan named three import shapes and there are five.** The two
  it missed are `'../../stuff/Thing'` and `'../../../stuff/Thing'` —
  99 files, almost all `lib/**/__tests__/`, which is the majority of the
  test importers. A first sed over the three named shapes moved 210
  files and left those 99 silently on the narrowed root. `tsc` caught
  them (the fixtures call `stampChattel`), but it caught them **only
  because those fixtures happen to type-check against the mixin**; a
  fixture that merely asked `MixinApi.isChattel` would have flipped
  to `false` with nothing to say so. The robust matcher is *any
  specifier ending `stuff/Thing`*, not an enumeration of prefixes.
- **Two files needed the wrap-drop repaired by hand** — `ManaLamp` and
  `TpaTerminal` wrap `DetailedMixin(` across several lines with a
  trailing comma, so removing the call left a dangling `,` before `)`.
  A parse error, so it failed loudly; noted because a formatter is NOT
  the fix here (`prettier --write` is banned in this repo).
- **The docstrings were the silent half.** The identifier rename
  deliberately skips comments, so ~19 files were left claiming a
  composition their code no longer had (`HazardMixin(DetailedMixin(
  Thing))` on `Trap`). Fixed by rewriting backticked spans that contain
  both `Mixin(` and `Thing`, plus four prose claims that said the root
  composes `Chattel`/`Concealable` (`Trap`, `SandboxCrossing`, `Bottle`,
  `trade-mining/Ore`). ⭐ **A rename that skips comments leaves the
  doc lying, and the doc is the author surface.**
- **One test asserted the module id.** `FromModule.test.ts` pinned
  `ModuleApi.lookup(Thing) === '/lib/stuff/Thing'`; the sed renamed the
  identifier and (correctly) left the string literal alone, so the
  failure is the rename working, not breaking. Repointed at
  `/lib/stuff/Movable`. ⚠ Every other `'/platform/thing/Thing'` string
  in the suite is still right — that class still exists and is still
  instanceable; it is now bare IMMOVABLE matter.
- **The census already shows the split**: `WetMixin` 563 rows / 94
  classes (the root) against `ChattelMixin` 551 / 90 (the rung). The
  12-row, 4-class delta is the six fabric rows plus the classes already
  sitting bare; W1 and W2 are what grow it.

### W1 — the kernel immovables

Goal: the 22 kernel immovable classes (16 edited; `Door`, `Signpost`, `Boundary`, `BoundaryAnchor`, the `Thing` twin and `LightningStrike` already sit on the root after W0 — verify, do not assume) stop claiming ownership and
hideability.

For each (`Floor`, `WaterFixture`, `Hearth`, `Forge`, `Oven`, `Campfire`,
`GardenBed`, `JobBoard`, `AttendancePoint`, `Tariff`, `NeonSign`,
`Beacon`, `BankCounter`, `LightningStrike`, `sandbox/SandboxCrossing`,
`lib/retail/Stock`; `Door`, `Signpost`, `Boundary`, `BoundaryAnchor`
need nothing — W0 left them on the root): switch the import back to
`lib/stuff/Thing`; for `BankCounter` and `Stock`, replace `extends Vessel`
/ `(Vessel)` with `ContainerMixin(Thing)` in their own stack (D14);
`WaterFixture` composes `UnboundedSourceMixin(ThermalMixin(BulkableMixin(Thing)))`
directly and no longer imports `UnboundedReceptacle` (whose two rows —
the urn and the formless vessel — stay movable). `lib/stuff/Vessel.ts`
imports `Movable` (already done by W0's sed; verify).

Per class, before the edit, the build agent runs the D1 checks and cites
them in the commit body: `grep -rn "stampChattel\|setConcealment" ` over
every writer path for a call whose receiver could be that class (none
expected — the grounding found none).

Tests: the classes' own tests (`Floor.test.ts`, `Stock.*.test.ts`,
`BankCounter`, `WaterFixture`) — any fixture asserting `isChattel` on one
of these was asserting the defect; delete the assertion and say so.

Acceptance: `lint:family`, `test:near`, `lint:counters` green; a
composition-census run shows no `ChattelMixin`/`ConcealableMixin` layer
on the 19. Commit:
`build(narrowing W1): sixteen kernel classes that are part of the place`.

### W2 — the pack immovables

Goal: the 29 pack classes in the immovable roster, each in its own pack,
each pack's vitest green.

Same edit as W1 per class. `ConsignmentShelf.ts:23` and `CheckRack.ts:33`
replace `(Vessel)` with `ContainerMixin(Thing)`; `MarketStalls extends
Stock` follows `Stock`; `trade-shopkeeping/src/thing/Stock` follows the
kernel mechanism. `tpa/TpaTerminal`, `arcana/ManaMain`, `arcana/ManaLamp`
keep `FixtureMixin` — it composes over `Containable`, which `Thing`
still has.

Acceptance: `pnpm -C packages/content/<pack> test` for each of the 14
packs touched; `lint:family`. Commit:
`build(narrowing W2): twenty-nine pack classes that are part of the place`.

### W3 — `Chattel` off `Creature` (D15)

1. `lib/creature/Creature.ts:147`: remove `ChattelMixin(` and its import;
   extend the comment at `:126-134` — the same move, the same argument,
   the readers named.
2. `lib/creature/KeptAnimal.ts:101`: `ChattelMixin(BrandedMixin(…))`
   (outermost of the base, beside `Branded`).
3. `trade-ranching/src/agent/Livestock.ts:68`:
   `ChattelMixin(BrandedMixin(Creature))` inside `HandlingMixin`.
4. Tests: `Creature.chattel.test.ts` modelled on `Creature.branded.test.ts`
   — a `Cast`, an `Extra`, a `Corpse` are not chattel; a `KeptAnimal` and
   a `Livestock` are and can be stamped; `NameController.test` and
   `Bonded` tests still pass unchanged (they use kept animals).
5. `docs/architecture.md:850-862` (the `Creature` mixin list) and
   `chattel.md:138-140` say where it lives now.

Acceptance: `test:near` on `lib/creature`, `lib/husbandry`,
`platform/idea/cmd/social`, `trade-ranching`; `wiki chattel` inverse (W4
page) lists no `/platform/agent/` row. Commit:
`build(narrowing W3): Chattel off Creature — a person is nobody's property`.

### W4 — the documentation and the wiki pages

Goal: no doc describes a composition that is no longer true, and the
drive has pages to read.

- `docs/architecture.md:819-838` — the branch diagram gains the
  `Movable` rung under `Thing` and `Vessel` moves under it; the
  space/matter paragraph says *matter* is the root and *goods* the rung.
- `docs/subsystems/chattel.md:138` — *"Composed at the `Movable` tier"*;
  the fixture-in-a-let-unit sentence at `:30-40` says *furniture*.
- `docs/subsystems/concealment.md:124-137` — *"Composed onto `Movable`,
  `Creature` and `Exit`"*, with D3's line written out.
- The ~50 `(Thing)` / `extends Thing` composition mentions across the 24
  docs listed by `grep -rln "(Thing)\|extends Thing" docs/subsystems docs/architecture.md docs/antipatterns.md docs/standard-model.md`
  — each becomes `(Movable)` where the class is a good and stays
  `(Thing)` where it is immovable (`Floor`, `Hearth`, the counters).
  `CLAUDE.md` is left to the sweep (rule 5 — index files are swept, not
  raced).
- `docs/subsystems/spatial.md § Placement` unchanged.
- `wiki-starter/content/wiki/main/chattel.md`, `concealable.md`,
  `movable.md` (D16).

Acceptance: `grep -rn "(Thing)" docs/subsystems` shows only immovable
classes; `wiki chattel`, `wiki concealable`, `wiki movable` render a
non-empty panel in a booted world. Commit:
`docs(narrowing W4): the Movable rung in every doc that drew the tree`.

### W5 — the drive

Extend `packages/wire/tests/base-class-narrowing.dirty.wire.test.ts`
with a part E (the existing parts A–D stay and must still pass):

1. **The panel stops lying, second time.** `inverse(founder, 'chattel')`
   contains `thing/gear/backpack` and `stuff/agent/cat` and
   `ranching/agent/livestock`; does not contain `general-store/counter`,
   `default-floor`, `bank-counter`, or any `/platform/agent/` row.
   `inverse(founder, 'concealable')` contains `traps/deadfall`,
   `delve/hidden-cache` and `stuff/agent/wolf`; does not contain
   `default-floor` or `general-store/counter`.
2. **The hidden cache is still hidden, and still found.** In the delve
   corridor: `look` does not list the pouch; `search` turns it up; `get`
   takes it. (The row moved class in W0 — this is the checkpoint that
   proves the move kept the authored band.)
3. **A trap still arms concealed.** `arm` a trap kit as before; the trap's
   band is not `obvious`.
4. **A counter still sells, and the stamp lands on the good.** `buy` at the
   general store; `look` at the bought item shows a title line; the
   counter's own panel shows no `Chattel`.
5. **A floor still refuses to be taken**, and `feel floor` still answers.
6. **A kept animal can still be named and owned** (`name` on the cat —
   the chattel stamp on `KeptAnimal`).
7. **A person cannot be** — `wiki chattel` inverse, above; and `look` at
   a Cast member shows no title line.
8. Step 0 (`ditch`/`lime`, the herdbook) and parts A–D unchanged.

Acceptance: 8/8 green against a fresh DB with `WIRE_BOOT=1`; the record
appended below. Commit:
`drive(narrowing W5): the second panel, the cache, the counter and the cat`.

### W6 — the measurement, re-run

`pnpm -C packages/server composition-census --json` before and after
(the *before* is
`/tmp/claude-1000/-home-bobalu-play-saxonberg-build-3/a1ba9604-5cdb-4da2-b620-5c70af31aa11/scratchpad/matrix.json`);
append the delta to § Drive record: rows on classes carrying
`Concealable` (was 599 on the Thing branch), on classes carrying
`Chattel`, and the list-A hit count. Commit with W5 or alone:
`tools(narrowing W6): the census after`.

### W7 — `lint:mass`, the ratchet (D5)

Goal: the 257-row mass/material gap stops being able to grow.

1. `packages/server/scripts/check-mass.ts`, in the shape of
   `check-perishable.ts` (header states the rule, the failure mode it
   closes, and what it cannot see) — walk every pack's rows via
   `scripts/pack-roots.ts`, resolve each `class:` through the same
   preload entry `check-composition-census.ts` uses (it is the one tool
   that can walk a composition outside a boot), fold `extends:` parents,
   and count rows whose class reaches `TangibleMixin` and whose effective
   `data` has neither `mass` nor `_materialPath`. Classes reaching
   `OrganismMixin` are skipped **only if** the build agent verifies that
   `OrganismMixin`/`BodyPlan` derives mass (`grep getMass lib/species/Organism.ts`);
   otherwise they count. Print the offenders grouped by class.
2. `package.json`: `"lint:mass": "tsx scripts/check-mass.ts"` — the
   family is derived, so nothing else registers it.
3. The gate's own test pins the ceiling (`lint-family.md` item 2) at the
   number measured when it lands; the ceiling may fall, never rise; a
   fall re-pins it.
4. `docs/lint-family.md`: one entry — what it protects, why a ceiling,
   what it cannot see (a runtime `setMaterial`/`setMass`).

Acceptance: `lint:family --list` shows it; `lint:family` green at the
pinned ceiling; the ceiling and the top-ten offenders in § Drive record.
Commit: `lint(narrowing W7): lint:mass — a thing made of nothing, counted and capped`.

---

## Reachability wiring

Per new capability, the five links — verb · affordance · data · boot · arg gate:

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| `Movable` rung | none (subtraction) | none | nine rows name `/platform/thing/Movable`; 137 classes extend it | `lint:instanceable` proves the class resolves | none |
| immovable `Thing` | none | none | six rows name `/platform/thing/Thing` | same | none |
| `Chattel` on `KeptAnimal`/`Livestock` | `name`, `buy` (existing) | existing | cat, canary, livestock rows unchanged | — | `NameController:112` narrows `isChattel` — still true |
| the wiki pages | `wiki chattel` etc. | — | three `wiki-starter` rows | the pack's `wiki` contribution kind installs them | — |

⚠ The links that fail closed and silent here are two: a row whose
`class:` still names `/platform/thing/Thing` while authoring
`concealment:` (invariant 12 catches it), and a pack class that
re-bases onto `Thing` while a controller in that pack narrows `isChattel`
on it (the D1 grep per class catches it; the wire drive's part D catches
a miss).

---

## Acceptance-criteria coverage

The requirements doc's AC1–AC8 are already covered by the first plan's
W0–W5 and stay green (drive parts A–D). This phase adds, against the
owner's ruling:

| criterion | wave |
|---|---|
| a floor, a hearth, a counter, a furnace no longer claim to be ownable or hideable | W1, W2, W5.1 |
| a knife, a seed, a bed, a coach still do | W0, W5.1 |
| a hidden cache stays hidden and a trap still arms concealed | W5.2, W5.3 |
| a person, a corpse and a shade no longer claim to be property; a kept animal still is | W3, W5.6, W5.7 |
| no doc draws the old tree | W4 |
| nothing that worked stopped working | W5.4, W5.5, W5.8 |

---

## Test & gate strategy

- **Unit:** `Movable.test.ts`, `Thing.test.ts` (negative),
  `Creature.chattel.test.ts`, the per-class tests W1/W2 touch. Each
  touched pack's own vitest.
- **Lints:** `lint:family` at every wave (the roster is derived; the
  gates named under § Convention conformance are the ones that can
  fire). `lint:mass` is census-then-ratchet: its own test pins the
  ceiling, so a content wave that fixes rows re-pins it downward.
- **Only the drive proves:** the panel's public claim (W5.1), the
  authored band surviving a row's class move (W5.2), the stamp landing
  on the good and not the counter (W5.4).
- `pnpm test` exactly once, before the MR goes back to review, and at
  `/finalize`. Never between waves; never in the background.
- A green full run stays valid until a source file changes —
  `git status --short | grep -vE '^.. (docs/|CLAUDE\.md|.*\.md$|packages/content/)'`.

---

## Risks & opens

- **The `sed` in W0 is the whole risk of W0.** It must change the
  import path *and* the identifier in `const XBase = …(Thing)` and
  `extends Thing`; a file that imports `Thing` under an alias
  (`import ThingBase from`) needs a hand edit — `platform/thing/Thing.ts`
  is the one known. Run `tsc` before `lint:family`; a class that ends up
  extending an undefined identifier fails at type-check, not at boot.
- **A test that stamps chattel on a `class X extends Thing` fixture** —
  32 test files reference `stampChattel`/`setConcealment`/`isChattel`/
  `isConcealable`; W0's sed moves every test importer to `Movable`, so
  they keep passing. A test that then asserts something about a *bare*
  `Thing` being chattel is asserting the defect; delete and say so.
- **`instanceof Vessel` on an immovable container** — none is carried or
  hauled, so `Haulable.ts:69` / `LoadBearing.ts:176` never see one. If a
  test hauls a warehouse, the test is wrong.
- **`Metabolic.integratesLongAbsence`** — true only when stamped; a
  Cast was never stamped, so W3 is byte-identical for people. Asserted
  in `Creature.chattel.test.ts`.
- **The furniture line (F3 — ruled: stays as planned).** Furniture and
  trade equipment are `Movable`, posted boards and built structure are
  `Thing`. The owner's reason is a system that does not exist yet
  (assembly/disassembly — § Deferred seams); the classes on the line are
  listed there so that conversation starts from a list.
- **`Plant`** — an `oak-standard` in the `Wood` is a slot-plant of an
  immovable ground, but the *class* is what a pot plant is too. It stays
  `Movable`; the ground's own persistence, not the plant's chattel stamp,
  is what keeps a standard where it is (`forestry.md § the four
  representations`). If the Location pass finds a reader that needs a
  standard to be non-chattel, that is a `Wood` finding, not a `Plant`
  one.
- **Stop and ask** only for: a class where the D1 grep finds a writer
  this grounding did not (none expected). F1 and F3 are ruled; F2b
  (`Detailed` on `Material`) is the Idea pass's to carry to the owner.

---

## Deferred seams

Each leaves as a line on `docs/slates/builds/base-class-narrowing-slate.md`
at the sweep:

- **`stash`/`bury` — player-placed concealment on a `Movable`** (D3).
  The mechanism (`setConcealment` + `PerceptionApi.hideLevelFor`) exists;
  the verb does not.
- **The bottling stamp** (D11): the fill at a branded still or bottling
  line writes `_brandKey`.
- **The mass burn-down under `lint:mass`** (D5) and `pinch-bar`'s capabilities.
- **`BoundaryAnchor` as an `Idea`** — the one Thing that is neither
  describable nor addressable (D13).
- **A trade-fixture rung** — if the owner wants the brewing vat, the
  anvil and the loom to be *removable fixtures* (owned by the business,
  never by a person), that is a `Movable` subclass or a chattel-owner
  rule, not a third root.
- **The 362 rows with no details** (D8): content to write, class by
  class, for immersion — a content wave, not this build; the owner's
  own words are the brief (*"most of the places that don't author
  details we probably should be writing some in"*).
- **`Detailed` on `Material`** (D8, F2b): only if something starts
  reading a material's parts; the Idea pass owns the answer.
- ⭐ **N3 — an affordance that is data.** A command view declares
  `affordedBy: capability:<kind>`; the `capabilities:` a `Tool` row
  already authors (31/32) then confers the verbs, and `Anvil`, `Loom`,
  `Whetstone`, `SewingTool`, `Muddler`, `Strainer`, `SoilKit`,
  `TimberSet`, `AssayKit`, `ScutchingBoard`, `SpinningTool`,
  `CuttingTool`, `MendingTool`, `Spade` (×2), `PrescriptionPad`,
  `Splint`, `SurgicalKit`, `SutureKit`, `Syringe`, `SurveyInstrument`
  and the rest of the 24 static-only classes become rows over `Tool`.
  The classes with a body (`Rod`, `Trap`, `AssayBench`, `LoadDevice`,
  `HouseholdersKit`) survive. Touches `CommandLogic`'s collection walk
  (`command.ts:1437`) and the verb-collision ladder. The owner has it;
  not asked for now.
- ⭐ **Assembly / disassembly — the fourth answer to movable/immovable
  (F3, owner 2026-09-29).** *"We are going to want 'assembly' to be a
  system on top of 'crafting' but we've only designed the latter. Once
  assembly ships it may make sense to make the assembled item unmovable
  but the pieces movable — and then we'd also need disassembly."* This
  build keeps furniture and trade equipment on `Movable` (status quo,
  preempts nothing). The seam: an *assembled* thing may become immovable
  while its *pieces* stay movable, which is neither the root nor the
  rung but a state transition between them — and would revisit, at
  least, `Fitting` (table · counter · workbench · racking · bench),
  `Vat` (the installed brewing/dye/retting vats vs a carboy), `Chest`
  (the necropolis `open-plot`), `AssayBench` (the city row already
  authors `fixedInPlace: true`), `Tariff`, `Chair`/`Bed`/`Desk`
  (furniture that self-fixes), `Loom`, `Anvil`, `Still`, `GristMill`,
  `ButcherBlock`, `DryingRack`. Not designed here; the design
  conversation starts from that list and from `crafting.md`.
- **The Agent, Location and Idea passes** cite D1–D10 and D15 and act on
  their own clusters.

---

## The second pass — one thing or two, and what it is called

⭐ **The owner's framing, which this section executes:** *this build is
as much about naming things as it is about refactoring taxonomies.* Two
new census modes (`--cotenancy`, `--siblings`, commits `713b07d00` /
`640504769`) ask what the first pass could not — do rows sharing a
class deserve to, and do classes sharing a signature share a concept.
Every verdict below is argued from the class docstring and the rows,
never from the signature, and the ruled decisions above (F1, F2, F2b,
F3) are not disturbed.

### The instrument defect the pass found — FIXED at `c32cb4db9`

`--siblings` built its signature from `MixinApi.getPersistenceContributors`
(`check-composition-census.ts:228`), which drops every layer with no
persistent field and no `captureSlice` (`api/mixin.ts:879`). Four
behaviour-only mixins (`ManualBuild`, `NutritionLabel`, `UnboundedSource`,
`Palatable`) and `SingletonMixin` were invisible to it, and it
manufactured four twin pairs: `Ingot`/`Casting`, `ServingVessel`/`Dish`
(a parent/child, besides), `Receptacle`/`UnboundedReceptacle`,
`CartesianLocation`/`SingletonCartesianLocation`. **Fixed by the
coordinator in `c32cb4db9`** — the signature now comes from
`queryMixins`, which walks the real chain — and re-run this cycle: all
four pairs are gone. What survives with an empty body on the Thing
branch is `Exit`/`SandboxCrossingExit` (twins of `lib/` bases) and
`Thing`/`DeedDesk`, both judged below; the three empty `Propertied`
singletons (`EmotiveESPModality`, `TasteModality`, `VerbalESPModality`)
and the empty `Biome`/`MaturationProfile` twins are the Idea pass's.
Every "false twin" verdict below is therefore confirmed by the
instrument, not only by this plan's reading of the source.

### The owner's own example: Oven · Forge · Hearth, and the mixin that is misnamed

Grounded (`Oven.ts:27`, `Forge.ts:17`, `Hearth.ts:1-60`, `Lamp.ts:1-16`,
`lib/fire/Furnace.ts:1-18`, `lib/thermal/SpaceHeating.ts:1-30`):

```
Forge  = Furnace( LightSource( Reserved( Thermal(                    Thing  ))))
Oven   = Furnace( LightSource( Reserved( Thermal( Placing( Container(Thing) )))))
Hearth = SpaceHeating( Furnace( LightSource( Reserved( Thermal( Placing(Thing) )))))
Lamp   = Furnace( LightSource( Detailed( Reserved( Thermal(          Thing  )))))
```

**Are they exactly the same? No — and the model already says how they
differ, through mixins, not classes.** `ContainerMixin` *is* "holds what
it heats" (an oven is a chamber; `Hearth.ts`: *"NOT `Container`: a hearth
is not a chamber you put things inside, and that is the whole difference
between it and an oven"*). `SpaceHeatingMixin` *is* "warms the
enclosure" (`SpaceHeating.ts`: *"a forge heats what you put IN it; a
hearth heats where you stand"* — and *"never compose this on
`FurnaceMixin`"*, for exactly the wrong-host reason). `PlacingMixin` is
"a pot stands on it." The three share **no base class; they share
`FurnaceMixin`**, and the distinctions the owner drew are carried
honestly where they are.

⭐ **So the misnamed thing is the MIXIN.** `FurnaceMixin` means *a
fuel-and-air-driven body pinned hot while lit, with a fuel reserve that
drains against game time and a burnout edge* (`Furnace.ts:1-9`). That is
true of a `Lamp` (`Lamp.ts:4`: *"a lamp is a small furnace with a light
on it"* — which is the tell: the sentence has to apologise for the
name), of a campfire, of a charcoal clamp, and none of those is a
furnace. A furnace is one *kind* of housing for the thing the mixin
models.

**Naming finding N1 — `FurnaceMixin` → `BurnerMixin`.** The burner is
the part of any fuelled appliance that is lit: a lamp has a burner, a
forge has a burner, a hearth's grate is one, a stove's ring is one. It
names the mechanism and not one housing, it is the word an author
reaches for (*"is it lit? feed the burner"*), and it survives from a
Roman brazier to a gas ring (lens 5). Alternative considered:
`FuelledMixin` — true but adjectival, and it names the reserve rather
than the fire. **N1 RULED 2026-09-29: `BurnerMixin`.** The rename is
W9's.

**Is a common superclass missing?** Today five classes compose the same
four-layer core — `Forge` IS the core with dials; `Oven`, `Hearth`,
`Lamp`, `Still` (`Tool(…)`), `SmeltingFurnace` and `CharcoalPit`
(`Container(…)`) each restate it. The owner's third-name question has an
answer: **`Firebox`** — the chamber in which the fuel of any furnace,
stove, oven, kiln or lamp burns; the part every one of them has and the
name none of them is. `lib/fire/Firebox = Burner(LightSource(Reserved(Thermal(Thing))))`,
substrate, only inherited; `Forge = Firebox` + dials; `Oven =
Container(Placing(Firebox))`; `Hearth = SpaceHeating(Placing(Firebox))`;
`Lamp = Firebox` + dials; `Still = Tool(Firebox)`; `SmeltingFurnace` /
`CharcoalPit = Container(Firebox)`. ⚠ Composition order is load-bearing
(`Lamp.ts:14`: `Furnace` outermost so its `getEmittedFlux` wraps
`LightSource`'s); `Container`/`Placing`/`SpaceHeating` override neither
`getTemperature` nor `getEmittedFlux`, so moving them outside the core
changes nothing the build cannot prove with `Furnace.test.ts` +
`Hearth`/`Oven` tests. Lens 2 decides it: a new fuelled appliance kind (a
boiler, a brazier class) becomes `X(Firebox)` — one line — instead of
restating four layers in the right order. **N2 RULED 2026-09-29: mint
`Firebox`** — the owner called it the thing they suspected was missing.
W9. The owner flagged this as *"another
vector we need to scan for"* — the scan is the `--siblings` mode with
the W8 fix, run over mixin *cores* rather than whole signatures.

### The sibling groups, one by one

| group | one thing or two? | argued from | call it | touch? |
|---|---|---|---|---|
| `Ingot` · `Casting` (+`Bloom`) | **two** — authored stock that is a by-hand build vessel vs the material-agnostic solid a pool leaves when it freezes | `Ingot.ts:1-19` (`ManualBuild`), `Casting.ts:1-13` (*"the generic, material-agnostic sibling of `Ingot`"*), `Bloom.ts` (*"Not `extends Ingot`. A bloom is not a bar"*) | names right | **no** — false twin (instrument); `Bloom` argues its own separateness |
| `ServingVessel` · `Dish` (+`CraftVessel`) | **two** — what a portion reaches a mouth in vs the plated output form with honest macros | `ServingVessel.ts` (the palate is *"the whole content of this class"*), `Dish.ts` (*"NutritionLabel — that is the entire delta"*) | names right; the three-rung ladder `CraftVessel → ServingVessel → Dish` is the design | **no** — false twin |
| `PlantPot` · `GardenBed` (+`Panel`) | **two, and only after D13** — both docstrings say the one structural difference is portability, and until this build it was a mass gate (`GardenBed.ts`: *"you cannot pick one up because it is heavy, not because of its class"*). With `PlantPot` on `Movable` and `GardenBed` on `Thing` the difference is now composed; the census will stop pairing them | `PlantPot.ts:1-10`, `GardenBed.ts:1-25`, `Panel.ts` | names right; the shared concept is already a mixin (`Cultivable`), so no superclass is missing | **no** |
| `Receptacle` · `UnboundedReceptacle` (+`WaterFixture`, `Potion`) | **two** — bounded vs inexhaustible; `Potion` is a preset (constructor defaults); `WaterFixture` leaves the family in W1 | `Receptacle.ts`, `UnboundedReceptacle.ts:1-12`, `Potion.ts:1-18` | ⚠ `Receptacle.ts:9-11` justifies its name against a description of `Vessel` (*"an enterable, portable-by-shape container — a boat / wagon"*) that has been false since the first phase (`Vessel` is a bag, a till, a coach); the docstring is corrected in W4, the name stays | **no** (docstring only) |
| `Exit` · `SandboxCrossingExit` (twins of `lib/boundary/Exit`, `lib/sandbox/SandboxCrossingExit`) | **the platform-twin pattern**, not siblings — empty by construction (`CLAUDE.md § split it`) | `platform/idea/Exit.ts:1-12` | names right | **no** — the census should exclude a twin of a `lib/` base from the siblings list (W8) |
| `SingletonCartesianLocation` · `CartesianLocation` | same — twins of `lib/` bases; the real pair differs by `SingletonMixin`, which the instrument cannot see | both `platform/location/*.ts` docstrings | names right (*the permissive holds the unmarked name*) | **no** |
| near-miss `SingletonCartesianLocation ⊂ AuthoredWorking, MineRoom` | **not a missing superclass** — `AuthoredWorking extends WorkingMixin(SingletonCartesianLocation)` already; `MineRoom` deliberately sits on the *permissive* base (`MineRoom.ts`: *"a working is a KIND of place minted many times"*) | `AuthoredWorking.ts`, `MineRoom.ts` | — | **no** — Location pass cites |
| `Thing` · `DeedDesk` · `BoundaryAnchor` | **three** — `DeedDesk` is a *marker class*: its presence IS the `title` verb's venue predicate (`DeedDesk.ts:1-6`), a legitimate zero-code concept (the class is the predicate); `BoundaryAnchor` is D13's finding (arguably an `Idea`); `Thing` is the twin | docstrings | names right | **no** |

**The `ToolItem` group (26 classes, statics distinguish).** Not twins —
`Anvil` and `Loom` differ only by `static commandContributions`
(`Anvil.ts`, `Loom.ts`: two statics, no other body). The design question
the marking produced is answered below.

### ⭐ The taxonomy is being shaped by where an affordance is allowed to live — is that right?

**Yes, that is what is happening, and it is half right.** The mechanism:
a verb affordance is a class static (`api/command.ts:1437-1445`:
`commandContributions` is *"a static"*, collected by walking the class
chain and unioning); a row's `commandContributions:` is dead silently
(the residences build's finding, in memory and in `command-spec.md`).
So *every kind of tool that affords a different verb set must be a
class*, and 24 of 26 tool classes exist for that reason alone.

Half right because the **capability** half already lives in rows:
`ToolMixin.capabilities` is authored on 31/32 `ToolItem` rows, recipes
gate on it by kind, and a second loom at a higher `rate` is a row
(`Loom.ts`: *"a flying shuttle or a power loom would be two more, at
higher `rate`"*). The verb half is the one that cannot be. Lens 2, tier
1: **a new trade's instrument today needs a pack class** — a
`SewingTool.ts` whose whole body is one static — which is the ordinary
case requiring code. That is the substrate failing the lens, and 24
empty-but-for-a-static classes are the receipt.

**What the fix would be (a design, not this build):** let a command
view declare what *capability* affords it — `affordedBy: capability:
weave` beside the existing `requires:` — so the `capabilities:` a row
already authors confers the verbs, and `Loom`, `Anvil`, `Whetstone`,
`SewingTool` … collapse into `ToolItem` rows. The class survives only
where it has a body (`Rod`, `Trap`, `AssayBench`, `LoadDevice`,
`HouseholdersKit`). It is the same move `instrumentation.md` already made
for `measure`/`analyze` (*"a trade adds a reading with no platform file
changed and no new verb"*), applied to the crafting verbs. ⚠ Flagged
(**N3**) — it touches `CommandLogic`'s collection walk and the
verb-collision ladder, and it is the owner's call whether an affordance
may be data at all; the owner's own rule (*a verb lives with the pack
whose content affords it*) is preserved either way, because the
capability row lives in that pack.

### Co-tenancy — the seams, with the three readings

| class | seam | reading | verdict |
|---|---|---|---|
| `ToolItem` | `longDescription` 22/32 vs **`long` 10/32** | **dead key** — `VisibleMixin` declares no `long` (`grep` over `Visible.ts` fieldMeta: none); the Hydrator discards it; **every shipped instrument renders with no long description** (`balance.yaml` authors `long:` and nothing else) | fix the rows (W8) |
| `Crop` | `_materialPath` 7/10 vs **`material` 3/10** | dead key (the grain chain's finding, still present on `madder-root`, `weld-bundle`, `woad-leaf`) | fix the rows (W8) |
| `Bottle` | `censusKey`+`regionTarget`+`container` 14/18 | **reading 3** — the 14 are *stocked products* (`Circulating`'s distribution fields, `Circulating.ts:1-8`); the 4 (`mixer-bottle`, `can`, `sack`, `kitchen-salt`) are *packaging you fill*. One class, two roles; a row not in circulation authors no census. Not two kinds of bottle | no |
| `Vat` | `mass` 6/11 | **reading 2** — the rows WITH mass are the installed vats and the carboy alike; the five without (`culture-jar`, `starter-crock`, `cask`, the two jars) are the D5 gap, not the owner's installed-vs-carboy question, which is F3's assembly seam | `lint:mass` |
| `Provision` | `gradeBand` 15/32 | reading 3 — graded produce vs ungraded by-products (`offal`, `slag`, `bone`) | no |
| `ToolItem` | `epoch` 2/32 | reading 3 — the two forestry tools author the epoch the land-use covenant reads (`Tooled.ts:40-48`); the rest are pre-epoch | no |
| `Cast` | `name` 33/43 | reading 3 — the shipped `Cast`/`Extra` rung distinction (`identity.md`); ⚠ the ten unnamed `Cast` rows may be `Extra`s on the wrong rung — **Agent pass** verifies each | Agent pass |
| `SingletonCartesianLocation` | 2 shared keys / 94 | expected — every row is a different place; the seams (`_address` 43, `cast` 40) are what a place has or has not | Location pass |
| `ConsumableMaterial` | `toxicity` 57/70 | Idea pass; likely reading 2 (a food with no toxicity row is a food that cannot poison) | Idea pass |
| `Stock` | `purchasing` 2/17 | reading 3 — two counters also buy | no |

### ⭐⭐ The unknown-key gate: it already exists, and the two dead keys are inside its ceiling

The coordinator's premise — *no gate checks a row's keys against its
class's `fieldMeta`* — is not so: **invariant 12 of
`check-instanceable-placement.ts:49-56,275-276,415-427,488-507`** is
exactly that gate, census-then-ratchet, ceiling **436**, only under the
standard hydrator, printing its inventory with `--orphans`. Run this
cycle: `orphan data keys 436/436`; the inventory contains
**`data.long` × 11** (every instrument row) and **`data.material` × 12**.
The gate could not fail on them because they were counted into the
ceiling the day it landed. So the answer to *in or out* is: **the gate
is in — it has been in — and this build's job is the first burn-down
and re-pin.**

**W8 — the dead-key burn-down (this build).** Rename `long:` →
`longDescription:` on the 11 instrument rows and `material:` →
`_materialPath:` on the 12 crop rows (verify each value resolves to a
material row — `lint:census`); re-pin `ORPHAN_DATA_KEY_CEILING` to the
new count (≤ 413); the drive gains a checkpoint that `look sextant`
renders a long description. ⚠ The rest of the inventory is the next
burn-down and is **named here so it is not lost**: `chemistry` 48,
`alternateNames` 45, `address` 41, and a 38-row family (`weight`,
`durable`, `audience`, `affordance`, `actor`) — each either a dead key or
a field a custom hydrator should own; the slate gets the list with the
`--orphans` command beside it.

### Naming table

| current | proposed | why | status |
|---|---|---|---|
| `FurnaceMixin` (`lib/fire/Furnace.ts`, `Mixins.Furnace`, `isFurnace`) | **`BurnerMixin`** | it models the lit, fuelled body — true of a lamp, a clamp, a campfire; "furnace" names one housing and `Lamp.ts` has to apologise for it | **N1 RULED** — W9 |
| *(none)* — the four-layer core restated by 7 classes | **`Firebox`** (`lib/fire/Firebox`, substrate) | the chamber every furnace, stove, oven, kiln and lamp has and none is; the common superclass the owner suspected | **N2 RULED** — W9 |
| `ToolItem` | **`Tool`** | `Item` names nothing (the `Prop` lesson, `platform/thing/Thing.ts:16-27`); the mixin file is `Tooled.ts` so the class file `platform/thing/Tool.ts` collides with nothing, and a twin sharing its concept's name is the default | **N4 RULED** — W9; ⚠ `Tool` stays a class the 24 static-only tools COULD collapse into (N3), never one that assumes they have |
| `Receptacle` | keep | its docstring's reason is stale, its name is not | W4 docstring |
| `PlantPot` · `GardenBed` | keep | D13 makes the pair honest | — |
| `Ingot` · `Casting` · `Bloom` | keep | three things, each argued in its own file | — |
| `ServingVessel` · `Dish` · `CraftVessel` | keep | the ladder is the design | — |
| `DeedDesk` | keep | a marker class; the name is the predicate | — |
| the 24 static-only tool classes | collapse into `Tool` rows **if N3 lands** | an affordance that is data makes a tool a row | **N3 — RULED a design, not this build**; deferred seam |

### What nobody should touch, and why

- **`Bloom`** — its docstring is a requirement (*a bloom is not a bar*)
  and the class is how the rule stays data.
- **`Dish`, `ServingVessel`, `CraftVessel`** — each rung is one mixin and
  one sentence; collapsing any pair reintroduces a defect the docstring
  names (a table knife you taste; a plate nobody washes).
- **`MineRoom` vs `AuthoredWorking`** — the permissive/singleton split is
  the persistence rule (`MineRoom.ts`: keyed instances over the
  permissive base), not a missing superclass.
- **The platform twins** (`Exit`, `SandboxCrossingExit`,
  `CartesianLocation`, `SingletonCartesianLocation`, `Thing`, `Movable`)
  — empty by construction; a census that lists them as siblings is
  reporting the pattern.
- **`SpaceHeating` onto `FurnaceMixin`** — `SpaceHeating.ts:16-21` says
  why in the repo's own words.

### Waves added by this pass

- **W8 — the dead-key burn-down.** The 23 row renames (`long:` →
  `longDescription:` on the 11 instrument rows; `material:` →
  `_materialPath:` on the 12 crop rows, each value verified against a
  material row by `lint:census`); `ORPHAN_DATA_KEY_CEILING` 436 → the
  measured count (≤ 413); a drive checkpoint that `look sextant` renders
  a long description. The census instrument half of the old W8(b) is
  **already done — `c32cb4db9`** — cite it, do not redo it. Commit:
  `fix(narrowing W8): eleven instruments get their long description back`.
- **W9 — the naming wave (N1 · N2 · N4, all ruled).**
  (a) `lib/fire/Furnace.ts` → `lib/fire/Burner.ts`; `FurnaceMixin` →
  `BurnerMixin`, `_mixinName`, `Mixins.Furnace` → `Mixins.Burner`,
  `MixinApi.isFurnace` → `isBurner`, every composer and narrowing
  (`grep -rn "FurnaceMixin\|isFurnace\|Mixins.Furnace"`), `fire.md` /
  `thermal.md` / the `Lamp.ts` docstring that no longer apologises.
  (b) `lib/fire/Firebox.ts` = `BurnerMixin(LightSourceMixin(ReservedMixin(ThermalMixin(Thing))))`,
  substrate; re-base `Forge` (= `Firebox` + dials), `Oven`
  (`Container(Placing(Firebox))`), `Hearth` (`SpaceHeating(Placing(Firebox))`),
  `Lamp` (`Firebox` + dials), `Still` (`Tool(Firebox)`), `SmeltingFurnace`
  and `CharcoalPit` (`Container(Firebox)`); the existing furnace / hearth
  / oven / lamp tests prove the order is preserved (a doused lamp is
  dark; a lit forge does not warm the room; a hearth does).
  (c) `platform/thing/ToolItem.ts` → `platform/thing/Tool.ts`, class
  `Tool`; the 26 subclasses' imports and `extends`, the 32 rows' `class:`
  (`/platform/thing/ToolItem` → `/platform/thing/Tool`), the tests, the
  docs (`crafting.md`, `instrumentation.md`, `CLAUDE.md` left to the
  sweep). ⚠ **N3 guard:** `Tool` gains no static, no capability→verb
  table, nothing that assumes the 24 have collapsed; it is the class
  they could collapse into later.
  Acceptance: `lint:family` (`lint:instanceable`, `lint:mixin-names`,
  `lint:census`), `test:near` over `lib/fire`, `platform/thing`, the
  packs that compose the mixin (`trade-distilling`, `trade-smelting`,
  `trade-fuel`); the composition panel reads `Burner` on a lamp and
  `Firebox` under a hearth. Commit: `refactor(narrowing W9): Burner is
  the fire, Firebox is the chamber, and a Tool is a tool`.

### What remains open — the complete list

- **N3** — an affordance that is data (`affordedBy: capability:<kind>`
  on a command view), the design that would collapse the 24 static-only
  tool classes into `Tool` rows. **Ruled a design, not this build**; it
  lives under § Deferred seams with the sketch and the 24 receipts, and
  W9(c) is written so as not to preempt it.
- **F2b** — `Detailed` on `Material`. Recommendation stands (no: nothing
  reads a material's parts; the rule is *Detailed goes with Perceptible
  on matter*); rides to the Idea pass.
- **The Agent pass** — the ten unnamed `Cast` rows (co-tenancy `name`
  33/43): each is either a `Cast` awaiting a name or an `Extra` on the
  wrong rung.
- Nothing else. F1, F2, F3, N1, N2, N4 are ruled and recorded above.

---

## Critical files

Read first, in this order:

1. `docs/requirements/base-class-narrowing-requirements.md` · this plan · `docs/plans/base-class-narrowing-plan.md` (the first phase; its § Drive record)
2. `packages/server/scripts/check-composition-census.ts` (the header) · `scripts/check-mixin-census.ts` (the seven channels)
3. `packages/server/src/mud/lib/stuff/Thing.ts` · `platform/thing/Thing.ts` · `lib/stuff/Stuff.ts:1040-1130` (the branch invariant) · `lib/stuff/Vessel.ts`
4. `packages/server/src/mud/lib/chattel/Chattel.ts` · `lib/concealment/Concealable.ts` · `lib/concealment/Hiding.ts`
5. `packages/server/src/mud/lib/creature/Creature.ts:120-160` · `lib/creature/KeptAnimal.ts:80-110` · `packages/content/trade-ranching/src/agent/Livestock.ts`
6. `packages/server/src/mud/lib/retail/Stock.ts:1-110` · `platform/thing/BankCounter.ts` · `platform/thing/WaterFixture.ts` · `platform/thing/UnboundedReceptacle.ts`
7. `packages/server/src/mud/platform/idea/api/StudioLogic.ts:78-96`
8. `packages/server/scripts/check-instanceable-placement.ts:1-60`
9. `packages/server/src/mud/lib/wiki/components/composition.ts` · `packages/content/wiki-starter/content/wiki/main/branded.md`
10. `packages/wire/tests/base-class-narrowing.dirty.wire.test.ts`
11. `docs/architecture.md:819-870` · `docs/subsystems/chattel.md` · `docs/subsystems/concealment.md:110-170` · `docs/subsystems/furnishing.md`
12. `docs/slates/builds/base-class-narrowing-slate.md § The defect register`

---

## Drive record

*(appended at build time)*
