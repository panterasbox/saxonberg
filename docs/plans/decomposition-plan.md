# Decomposition — implementation plan

Authored decay made true: a per-part decay state (mechanism + band) that
caps condition, fails through assembly's shipped failure path, costs
metal mass, reads on `look` / `analyze condition` / a new
`analyze soundness`, and is cured by `fit`, `brush` with a wire brush, or
`repair`; plus a history (ordered stays in named environment rows) that
is derived into that state once, when the thing is minted. Executes
[decomposition-requirements](../requirements/decomposition-requirements.md).
**Kind:** feature. **Leads from:** kernel; first consumer is the world's
prose-decayed goods and a bog sword in the Weeping Moor turf bank.

There is NO live decay clock. Nothing in this plan adds a `reconcile*`
method, a timer, a sweep or a read of the world clock for decay. The two
Law 2 tests (`lib/structure/__tests__/Structure.condition.test.ts` "a
durable good out in the rain does not wear";
`packages/content/residence/.../HoldingWarren.test.ts:830`) are not
edited and must stay green at every wave.

Paths: kernel = `packages/server/src/mud/`, content =
`packages/content/`. Every content path uses `/place/` (the rename is in).

## Grounding

Verified by opening the files, 2026-11-28, branch `reqs/decomposition`
at `922b9799e`.

**Condition, parts, failure**

- `lib/material/Durable.ts` — `_condition` (0..1) + `mends`; `wear`,
  `setCondition`, `isBroken` (the `crafting.brokenThreshold` dial, 0.1),
  `getConditionWord` (sound · worn · badly worn · broken);
  `durableAugmenter` prints the word and the last mend. It has a custom
  `static captureSlice` that names its fields by hand
  (`{ condition, mends }`) — a new Durable field that is not added there
  is NOT persisted.
- `lib/craft/Assembled.ts` — `PartLine` (line 143) is a plain record
  (`condition`, `failed`, `count`, `role`, `material`, `mends`, …);
  `parts` is `persistent, runtimeState`. `getParts()` returns
  `billLines()` at defaults until `ensureParts()` materializes (first
  mutating act). Writers of `line.condition`: `wearLine` (1032),
  `replaceMembers` (1066), `restoreAll` (1144), `mendLine` (1273),
  `setCondition` (1339). `failureWordFor` (572) words a failed line;
  `assemblyAugmenter` (482) names failed lines and slack joints only.
  `isOnePiece()` = no bill and no parts; every method is total on it.
  `__validateComposition__` requires `DurableMixin` beneath.
- `platform/thing/Assembly.ts` — `AssembledMixin(CraftedMixin(DurableMixin(Good)))`:
  the generic durable good, one piece when its row has no bill.
- `lib/stuff/Good.ts` composes no `Durable`. Durable hosts today: Tool,
  Weapon, Garment, Shield, Vat, Lamp, Chair, Receptacle, Assembly,
  Barrel, Book, Mould, Oven, PipeRun, Timber, plus pack classes (Brick,
  ClayPart, IronPot, Die, Hoop, Conduit, Boat, …), `Building`, `Ship`.
- NOT Durable: `platform/thing/Bollard` (`PlacingMixin(Good)`), arcana's
  `Ring` and `Wand` (`content/arcana/src/thing/`), trade-smelting's
  `Bell`, `platform/thing/GardenBed`, `PortableLight`.
- Use that wears a part: `content/trade-mining/src/lib/Working.ts:1015`
  — `hew` wears the pick `0.02` on `shock`, and `Assembled.wear` routes a
  `shock` to the line that gives first (the haft). `CraftingLogic.ts:3761`
  wears a `striking` tool `0.01` on `shock`. ⚠ `fell` wears nothing
  (no `.wear(` in `content/trade-forestry/src`), and there is no hatchet
  row anywhere.
- Repair: `platform/idea/api/CraftingLogic.ts` — `mendAssembly` (~4198):
  rung 1 re-forges a FAILED metal line from stock (`mendLine` with
  `reforged: true`) and refuses a failed non-metal line `part-failed`
  (the cure is `fit`); rung 4 mends each worn line to `terms.ceiling`;
  `mendOnePiece` (~4420) mends the whole's own gauge. `unitMassOf(line.template, fallbackKg)`
  is how repair weighs a part.

**Mass, wet**

- `lib/material/Tangible.ts:502` `getMass()` — the one place the wet law
  lives (`dry × (1 + wetness × waterAbsorptionCapacity/100)`), already
  narrowing on other mixins (`MixinApi.isWet`, `hasPorosity`);
  `getDryMass()` returns `_mass`. `mass` is an authored persistent field:
  a go-live re-applies it, so a one-time `setMass` would be undone by a
  pack sync.
- `lib/wetness/Wet.ts` — on every `Thing`; `wet(delta)` raises the
  gauge; it dries on read; bands damp · wet · soaked.

**Materials**

- Capability mixins in `lib/material/` are composed on the KIND classes
  in `platform/idea/material/` (`Metal`, `Wood`, `Fiber`, `HideHorn`,
  `Stone`, `Ceramic`, …); a consumer narrows with `MixinApi.has<Capability>`.
  No per-mechanism susceptibility exists (`Porosity`, `Acidity.corrosiveTo`
  — the attacker's side —, `Coating.weatheringMPerGameYear` are the
  nearest).
- Material rows: iron, copper (`element/`), steel, bronze, brass, the
  cast irons, bloom-iron (`alloy/`), ten woods + `-brash` and
  `charred-oak` children that `extends:` their wood, leather, rawhide,
  paper, board (`organic/`), wool, linen, canvas, hemp, jute
  (`textile/`), the rocks, brick and the fired bodies (`ceramic/`).
  ⚠ There is NO silver row and NO cotton row. There are no family parent
  rows (oak, ash, … are independent rows).
- `FieldMetaEntry.inherit` (`lib/mixin.ts`) supports `by-key`.

**Fade** — `lib/material/Dyed.ts` already owns it: the dye stack,
`bleach(dose)`, and the look line "Dyed X, and washing out." Hosts:
`Garment`, trade-textiles' `ClothBolt`.

**Templates and persistence**

- `platform/idea/TemplateApplier.ts` — three phases; a
  `{ authorable: true, seed: true }` field gets `seed<Field>(value)` in
  phase 3, **mint only** (`go-live` and `restore` skip it). Precedents:
  `Seasoning.seasonedFraction`, `Store.initialLines`.
- `PersistableLogic.restoreItem` (1019) restores a kept good by
  `StuffApi.clone(templatePath)` (a mint — phase 3 RUNS) and then
  `restoreState`, which overlays every captured field. `captureFields`
  stores a declared field even when it is `[]` or `0`. So a restored
  good is seeded and then overwritten by its record.
- Floor stock on a staged place is re-laid from the row at every boot
  (persistence.md § three tiers). `world/moor/turf-bank.yaml`
  (`/trade/quarrying/place/Turbary`) is staged.

**Documents** — a path-addressed vocabulary is a kind row
(`content/platform/content/kinds/<kind>.yaml`, traits `shipped` +
`catalogued`), a value class in `lib/`, and an
`XCatalogue extends DocumentCatalogue<X>` in `platform/idea/` reached
through an Api static (`BulkableApi.pumpMechanisms()`,
`MaterialApi.dirtKinds()`); loaded with `ensure(path)`, read with
`need(path)`. Exemplar: `PumpMechanismCatalogue` +
`lib/pump/PumpMechanism.ts` + `kinds/pump-mechanism.yaml`.

**Readings** — `lib/instrument/Reading.ts`; a channel is a row under
`<root>/idea/reading/` plus a class in `platform/idea/reading/`.
`handTool:` names a Tool capability that the eye rung binds
(`density.yaml` uses `flotation`). `ConditionReading.ts` reads part by
part at proficient. Knives that offer `cutting` are Tools (rigging
knife, stock knife, billhook); `arms/belt-knife` is a Weapon and offers
no capability.

**Brush** — `content/platform/content/platform/cmd/inventory/brush.yaml`
(target `requires: SoilableMixin`; tool default MQL
`capability.brushing or capability.sweeping`),
`platform/idea/cmd/inventory/BrushController.ts` (calls
`Soilable.brushOff`), conferred by `platform/thing/SweepingTool`
(`environment` contribution). `Tool` and `Weapon` are NOT `Soilable`.
`requires:` accepts `A|B` as OR (command-spec.md § requires).

**Maturation** — `lib/maturation/MaturationClock.ts` integrates a
TEMPERATURE curve (`ClockProfile`: stall/happy/damage kelvins) over
temperature samples; `lint:reconcile-chains` counts methods named
`reconcile*` that sample a temperature.

**Names already taken** — `lib/Decay.ts` exports class `Decay`
(exponential relaxation, six importers); `EnvironmentMixin` is the shell
settings keyspace; `Exposure` is construction's face rule.

**The rows to convert** (all opened):

| row | class today | what the prose says |
|---|---|---|
| `terminus/.../wharfside/water/thing/lost-anchor.yaml` | `Good`, iron, 300 kg | "stock rusted to a crust" |
| `platform/content/platform/thing/mooring-ring.yaml` | `Bollard`, iron; props at two landings; no recipe | "rusted orange" |
| `trade-farming/.../thing/plough.yaml` | `Tool` with a bill; ⚠ a recipe output (`recipes/plough.yaml`), props in four localities | "rusted on the other [face]" |
| `rejection/.../place/claims-office.yaml` | a free rack of props (the till cannot take money — the row's own comment) | "hire tools going rusty at the tips" |
| `arcane-library/.../magic/ring-of-veil.yaml` | arcana `Ring`, `materialTags: [silver]`, no `_materialPath` | "tarnished silver" |
| `arcane-library/.../magic/wand-of-firebolt.yaml`, `-cursed.yaml` | arcana `Wand` | "banded … with tarnished brass" |
| `terminus/.../market/thing/curfew-bell.yaml` | smelting `Bell`, fixed | "weathered oak frame" |
| `trade-farming/.../thing/bed/garden.yaml` | `GardenBed`, `fixedGround` | "weathered boards" |
| `rejection/.../thing/glowcap-jar.yaml`, `glowcap-fixture.yaml` | `PortableLight` | "packed with rotted wood" |
| `terminus/.../estuary/reach.yaml`, `lower-towpath.yaml`, `estuary-mouth.yaml`, `rejection/.../kestrel-road/the-pass.yaml` | places | staging, rails, bracket, stakes |

## ⭐⭐ New substrate

Ledger = [decomposition-slate § 8](../slates/engine/decomposition-slate.md).

| # | item | ledger row | note |
|---|---|---|---|
| S1 | `lib/material/DecayMark.ts` — the closed mechanism + band vocabulary and the `DecayMark` value class over a plain `DecayMarkRecord` | *genuinely new* ("a decay state a part can carry"). Searched: `lib/material/`, `lib/craft/`, `PartLine`, `Flawed`/`Integrity` (cracks, a different record), `lib/Decay.ts` (relaxation math, unrelated — hence the name) | instance methods only; no public statics (`lint:lib-statics`) |
| S2 | `lib/material/Degradation.ts` — `DegradationMixin`, a material capability: the `degradation` field and `decayOver(stays)` | "material susceptibility — **new**" | composed on four kind classes (Host placement) |
| S3 | `lib/material/DecayEnvironment.ts` (value class) + `platform/idea/DecayEnvironmentCatalogue.ts` + kind row `decay-environment` + `MaterialApi.decayEnvironments()` | "named environments — **new rows**" | the shipped document pattern (`PumpMechanismCatalogue`); P10 |
| S4 | On `DurableMixin`: seed fields `decay`, `history`; state fields `decayMarks`, `lostKg`; methods `getDecayMarks`, `getLostMass`, `mendCeiling`, `scourDecay`, `seedDecay`, `seedHistory` | "one-piece condition — **generalize**" | no new mixin |
| S5 | On `PartLine`: `decay?`, `lostKg?`; `AssembledMixin` overrides of S4's methods for lines | "per-part condition — **reuse**" / "the bill cannot author state — **generalize**" | no new mixin |
| S6 | `platform/idea/reading/SoundnessReading.ts` + row `reading/soundness.yaml` | "the probe — **new row**" | |
| S7 | `RepairDeclineReason` member `decayed`; reason rows `decayed`, `needs-wire-brush`, `nothing-to-brush` | "mending — **reuse**", "rust removal — **extend**" | |
| S8 | one arm added to `scripts/check-bills.ts` (`lint:bills`): `decay:`/`history:` only on a row whose effective class composes `DurableMixin`, and never on a recipe's output row | *genuinely new* (found in planning, D11) | an arm of an existing gate, not a new gate |

No new Api, no new logic singleton, no new hook with one implementer, no
new verb, no new Mongo collection, no new module category.

**Not reused, against the ledger:** "integrating a rate over an
environment — reuse `MaturationClock`". Declined (D7): its only axis is
temperature and an environment row has none. The row is accounted for,
not followed.

**Generalize-means-the-specific-one-is-gone (P1):** nothing is
generalized into a second surface. `Dyed` keeps fade (D8); `Soilable`
keeps dirt (D9); decay does not copy either.

### P9–P14, per item

| item | P9 predictable from def + help | P10 metadata is a Document | P11 no caller branches on destination | P12 no synonym | P13 fits the host's header sentence | P14 nothing moves or decides invisibly |
|---|---|---|---|---|---|---|
| S1 `DecayMark` | not a command; band words are the ones `look` prints | a closed vocabulary with engine arithmetic behind every member (the `MaturationMechanism` argument) — code, not rows; see Risks 3 | n/a | no existing call words a decay band | `lib/material/` value object | pure |
| S2 `DegradationMixin` | n/a | the DATA is on material rows; the mixin is the reader | consumers narrow `hasDegradation`, never on a material kind | not `Perishability` (food's Arrhenius clock) nor `Acidity.corrosiveTo` (the attacker) | header: *it BREAKS DOWN in its surroundings* | pure |
| S3 `DecayEnvironment` + catalogue + kind | n/a | yes — a document kind, read by path | n/a | not a biome (air, resolved by place); nothing names a burial | value class in `lib/material/` | loaded by the authored reference only |
| S4 Durable fields + methods | `brush` help states what scouring does and needs | n/a | `brush` calls each facet the target HAS (D9); no `isX ? a : b` | `scourDecay` is not `brushOff` (dirt) — different record, different tool gate | Durable's header becomes *the condition axis: worn by use, decayed by authored state, never by the clock* | the seed writes only its own host, once, at mint |
| S5 PartLine fields | n/a | n/a | n/a | n/a | "what actually went in, per line" — a line's decay is the line's | `replaceMembers` clears marks only on a fully replaced line — said in `fit`'s result |
| S6 soundness reading | `readings soundness` prints its `improves`/`stakes`; refusal names the missing blade | the channel is a row | n/a | `condition` reads wear and mends; soundness reads the inside of wood | a `Reading` subclass | reads only |
| S7 reasons | refusals are worded by reason rows | reason rows are documents | n/a | n/a | n/a | n/a |
| S8 lint arm | n/a | n/a | n/a | n/a | `lint:bills` already holds bill-to-class | build-time only |

## Plan-level decisions

**D1 — One-piece decay rides `Durable`; plain `Good` is NOT widened.**
A plain `Good` covers every loaf, coin stack, hide and litter row;
`condition`, `wear`, `isBroken` and a look line would answer "sound" in
silence on nearly all of them (P2's honest-default-no), and a stack has
no single condition. A one-piece thing that an author wants decayed
names a class that already carries condition — `/platform/thing/Assembly`
with no bill is exactly *a monolith is an assembly of one* (repair D4),
and it exists. Three classes gain `DurableMixin` because a converted row
must stay that class: `Bollard` and arcana `Ring` (D12). ⛔ Wands are
OUT (owner, 2026-11-28): see D12's wand row.

**D2 — State is a list of marks beside condition; the mark is a
ceiling.** `DecayMarkRecord = { mechanism, band, scoured? }`. A part's
marks live on `PartLine.decay`; the whole's (a one-piece thing, or the
`whole:` key of a billed one) on `Durable.decayMarks`. Several marks may
sit on one part. Each band carries: the progress it starts at (D7), a
condition ceiling, a lost-metal share, whether it is failure, what
clears it, and its phrases. The table (grain — the build may tune the
numbers, the unit tests pin the outcomes):

| mechanism | band | from | ceiling | lost share | cleared by | look phrase |
|---|---|---|---|---|---|---|
| corrosion | bloom | 0.1 | 0.9 | 0 | scouring | has a bloom of {product} |
| | flaking | 0.3 | 0.6 | 0.03 | scouring | is flaking with {product} |
| | pitted | 0.6 | 0.35 | 0.15 | scouring leaves it `scoured` | is pitted with {product} · scoured: is pitted, the {product} brushed out of it |
| | eaten through | 1.0 | FAILED | 0.5 | — | failure word: eaten through with {product} |
| rot | soft | 0.15 | 0.5 | — | — | has gone soft |
| | punky | 0.5 | 0.15 | — | — | has gone soft (the eye cannot tell depth; the probe can) |
| | rotted through | 1.0 | FAILED | — | — | failure word: rotted through |
| mold | spotted | 0.2 | 0.95 | — | brushing | is spotted with mold |
| | furred | 0.6 | 0.8 | — | brushing | is furred with mold |
| frost | crazed | — | 0.7 | — | — | is crazed by frost |
| | spalled | — | 0.35 | — | — | has spalled |
| | crumbled | — | FAILED | — | — | failure word: crumbled |
| fade | faded / bleached | 0.2 / 0.6 | — | — | `dye` | no mark — D8 |

- **Seeding a mark** sets `line.condition = min(condition, ceiling)`; a
  FAILED band sets `failed = count`, `condition = 0`. On the whole:
  `_condition = min(_condition, ceiling)`, FAILED → `0`.
- **The ceiling holds while the mark stands.** `mendLine`,
  `setCondition`, `restoreAll` (Assembled) and `setCondition` (Durable)
  clamp to the mark's ceiling through ONE private read each
  (`lineCeiling(line)` / `mendCeiling()`). Write-side, because five
  writers are fewer than the readers of `line.condition`.
- **`{product}`** is the material's own word
  (`degradation.corrosion.product`: rust · verdigris · tarnish) — D6.
- ⚠ "The last band is failure" (requirements § What an authored decay
  state is) holds for corrosion, rot and frost. Mold and fade are
  surface mechanisms and never fail a part: lens 1 chose it (a furred
  haft does not break; the world must be derivable). Reported to the
  owner.

**D3 — Authoring syntax; applied by materializing at mint; "once" is the
applier's phase 3.**

```yaml
data:
  history:                      # ordered stays
    - { in: /platform/decay-environments/peat-bog, years: 50 }
    - { in: /platform/decay-environments/dry-shelter, years: 2 }
  decay:                        # explicit state, by part name
    blade: { corrosion: bloom }
    grip:  { rot: soft, mold: spotted }
    whole: { corrosion: pitted }   # the thing itself; the ONLY key on a one-piece thing
```

- Both are `{ authorable: true, seed: true }` on `DurableMixin`
  (`inherit: replace`, the default — a child row's `history` replaces
  its parent's whole). Neither is persistent: the row's authored value
  is never state.
- `seedDecay` / `seedHistory` call `ensureParts()` first — a decayed
  found thing's record is its own from birth — then write marks.
  Order-independent by construction: `seedDecay` REPLACES a named
  part's whole mark set; `seedHistory` skips any part that already has a
  mark and, when it runs first, is overwritten by `seedDecay` on the
  parts it names. Either order gives *the explicit state wins for that
  part*.
- Refusals, all typed throws naming the row, the part and the reason
  (they fail the clone — P3): an unknown mechanism or band; a key that
  is neither a bill part nor `whole`; a bill part named `whole`;
  a mechanism the part's material does not declare (D6: *iron does not
  rot*); a thing or part with no material; `fade` on a host that is not
  `Dyed`; an environment path with no document; `years` not > 0.
- **Once, never re-decayed:** phase 3 runs at `mint` only. A restored
  good is cloned (seeded) and then every captured field overlays it —
  `parts` (already persistent), and `decayMarks` + `lostKg`, which W1
  adds to `Durable.captureSlice` by name. The wet gauge and the dye
  stack are their own mixins' persistent fields and are overlaid the
  same way. A go-live never re-seeds; an author who edits `decay:`
  re-clones (no migrations). W1's restart unit test goes through the
  real applier and `PersistableApi` (never by field assignment).

**D4 — Metal loss is `lostKg`, subtracted in `Tangible.getMass`.**
Seeding a corrosion mark records `lostKg = partKg × lostShare(band)` on
the line (or the whole). `partKg` is what repair already says a part
weighs — `unitMassOf(template) × count`, scaled so the lines sum to the
whole's dry mass (W1 exposes the existing `CraftingLogic.unitMassOf`
through a forwarding `CraftingApi` static if one is not already there;
Api↔Logic split kept). `Tangible.getMass()` and `getDryMass()` subtract
`Durable.getLostMass()` when the host is Durable — the place the wet law
already lives, for the same reason (*corroded matter weighs less* is a
fact about matter, and every reader of mass must see it at once). Not a
one-time `setMass`: `mass` is authored and a go-live would put the metal
back. Nothing lowers `lostKg` but a re-made part: `replaceMembers` on a
fully replaced line and `mendLine` with `reforged: true` (new stock was
drawn) delete the line's `decay` and `lostKg`. `scourDecay` and an
ordinary mend never touch it.

**D5 — Environments are documents.** Kind `decay-environment`
(`content/platform/content/kinds/decay-environment.yaml`, traits
`shipped: { dir: decay-environments }`,
`catalogued: { by: /platform/idea/DecayEnvironmentCatalogue, load: per-path }`,
`titled: { field: name }`). Six rows in
`content/platform/content/decay-environments/`, addressed
`/platform/decay-environments/<key>`; a realm's salt marsh is
`<its root>/decay-environments/salt-marsh.yaml`. Fields, all 0..1:
`wetness`, `oxygen`, `salt`, `acidity`, `sky`, plus `name`,
`description`. `seedHistory` awaits
`MaterialApi.decayEnvironments().ensure(path)` per stay — load on use, by
the authored reference; no boot entry, no roster. Starting values:

| row | wetness | oxygen | salt | acidity | sky |
|---|---|---|---|---|---|
| peat-bog | 1 | 0.02 | 0 | 0.8 | 0 |
| salt-water | 1 | 0.6 | 1 | 0 | 0 |
| fresh-water-silt | 1 | 0.05 | 0 | 0 | 0 |
| damp-ground | 0.6 | 0.7 | 0 | 0.2 | 0 |
| open-air | 0.3 | 1 | 0 | 0 | 1 |
| dry-shelter | 0.03 | 1 | 0 | 0 | 0 |

**D6 — Susceptibility is `DegradationMixin` on four material kinds,
authored row by row.** Field `degradation` (`persistent, authorable,
inherit: 'by-key'`):

```yaml
degradation:
  corrosion: { perYear: 0.04, product: rust }
  rot: { perYear: 0.06 }
  mold: { perYear: 0.05 }
  fade: { perYear: 0.03 }
  frost: {}            # authorable, not derived in this build
```

A mechanism key PRESENT means the material suffers it (the legality test
of D3); `perYear` is progress per game year at a driver of 1; absent
`perYear` means authored-only. `product` is required on `corrosion`.
Rows (starting figures; W0's outcome test is the contract):

- rust: iron 0.04, steel 0.04, bloom-iron 0.04, cast-iron / grey / white
  0.03, sulfurous-iron 0.05;
- verdigris: copper 0.008, bronze 0.006; tarnish: brass 0.008, and a NEW
  `element/silver.yaml` 0.01 (the tarnished ring needs a material; there
  is no silver row today);
- woods (rot / mold): oak 0.02 / 0.04, yew 0.015 / 0.04, elm 0.03 / 0.05,
  pine 0.05 / 0.06, ash 0.06 / 0.06, hazel 0.07 / 0.06, maple 0.07 / 0.06,
  beech 0.08 / 0.07, birch 0.09 / 0.07, willow 0.09 / 0.07;
  `charred-oak` overrides `rot: { perYear: 0.005 }` (the `-brash`
  children inherit through their existing `extends:`);
- leather rot 0.07 / mold 0.08; rawhide rot 0.15 / mold 0.1; paper and
  board rot 0.1 / mold 0.15;
- wool, linen, canvas, hemp, jute: rot 0.05 / mold 0.06 / fade 0.03;
- `frost: {}` on granite, limestone, chalk, slate, gypsum, brick,
  terracotta, earthenware.

No family parent rows are invented: none exist, and the template
taxonomy pass (build-2's queue) owns that tree. The inheritance that is
honest today is used (`by-key` through the existing `extends:`
children). No cotton row is authored — there is no cotton material and
no consumer. Both reported to the owner.

**D7 — The derivation is a closed-form fold on the material; no clock.**
`Degradation.decayOver(stays: { environment: DecayEnvironment; years: number }[]): DecayMarkRecord[]`
— for each mechanism with a `perYear`:
`progress = Σ perYear × environment.driverFor(mechanism) × years`, and
the band is the last one whose `from` ≤ progress. Drivers, instance
methods on `DecayEnvironment`:

- corrosion = `wetness × oxygen × (1 + 3·salt)`
- rot = `oxygen × damp × (1 − acidity) × (1 − 0.7·salt)`, `damp` =
  `wetness` when ≥ 0.2, else 0 (the moisture threshold)
- mold = `oxygen × wetness` when `0.2 ≤ wetness < 0.9`, else 0 (it needs
  damp AIR; nothing molds under water)
- fade = `sky`
- frost = not derived

`MaturationClock` is NOT reused: its `ClockProfile` is a temperature
curve and a stay has no temperature; fitting one would mean authoring
stall/happy/damage kelvins that mean nothing here. The fold has no
state, reads no clock and is not named `reconcile*`, so
`lint:reconcile-chains` cannot see it and nothing can call it twice. The
decay vocabulary's doc comment records the correspondence the slate
noticed (corrosion ~ `chemical`, rot and mold ~ `microbial`, fade ~
`photochemical`) so a later live clock finds it.

Outcomes the W3 unit test pins (the requirements' own table):

| sword (steel blade, leather grip, iron pommel), 50 years | blade | grip |
|---|---|---|
| peat bog | no mark | no mark |
| damp ground | pitted | rotted through (failed) |
| dry shelter | no mark (or bloom) | no mark |

plus: iron 10 years in salt water ≠ 100 years (pitted vs eaten
through); oak 10 years in fresh-water silt = no rot, soaked.

**D8 — Fade is `Dyed`'s; decay does not keep a second record.** An
authored or derived `fade` calls the host's own `Dyed.bleach(dose)`
(faded 0.5, bleached 0.9) at seed and stores no mark; it reads through
`Dyed`'s shipped look line and is cured by `dye` as today. `fade` is
legal only under `whole:` on a `Dyed` host; a derived fade on a host
that is not `Dyed` is skipped (a read that finds nothing). One model per
question.

**D9 — Wire-brushing is `Durable.scourDecay`, called by `brush`; rust is
NOT a dirt deposit.** A `DirtKind` deposit would need `Soilable` on
`Tool`, `Weapon` and `Assembly` (widening three families for one
mechanism) and would keep the rust in two records (the mark's band and
the deposit's load). Instead:

- `scourDecay(tool: { brushing: boolean; scouring: boolean })` on
  Durable (Assembled's override walks the lines too). The MODEL decides:
  with a scouring tool it removes `bloom` and `flaking` marks and sets
  `scoured` on `pitted`; with any brush it removes mold marks; corrosion
  present and no scouring tool answers
  `{ ok: false, reason: 'needs-wire-brush' }`; nothing clearable answers
  `'nothing-to-brush'`. It returns what came off and what stays, per
  part.
- `BrushController` stays dumb: it runs the loose-dirt act when the
  target is `Soilable` and the scour act when it is `Durable` (a chair
  is both and gets both), words the results, and refuses through
  `this.refuse(context, answer)` when neither act did anything. It
  calls each facet the target has; it does not choose between
  primitives (P11).
- View: target `requires: SoilableMixin|DurableMixin`; the tool default
  MQL gains `or capability.scouring`; help gains: *rust, verdigris and
  tarnish come off under a wire brush and nothing softer; mold comes off
  under any brush; pitting stays, and so does the lost weight.*
- The wire brush: `generic-objects/content/stuff/thing/gear/wire-brush.yaml`,
  `class: /platform/thing/SweepingTool`, `capabilities: [scouring]`,
  steel. `SweepingTool` already confers `brush` to whoever holds it.
- Mold's cure is not in the requirements. Lens 1 chose it (surface
  growth brushes off — derivable). Reported.
- The act mutates runtime state, so `finish` captures the host
  (`PersistableApi.captureHostOf(target)`, as the other mutating acts
  do).

**D10 — What scouring buys.** An unscoured corrosion mark caps the mend
(you cannot mend through scale); once `bloom` or `flaking` is gone the
part mends as today. `pitted` keeps its ceiling for good — *no mending
puts the metal back*; a part that fails is re-forged from stock (shipped
rung 1), which is new metal. `repair`'s rung 4 and `mendOnePiece` ask
`mendCeiling` first; at the ceiling they push an unmendable fault with
reason `decayed` and the cure as detail (`brush` / `fit` / `none`).

**D11 — Decay is authored on instance rows, never on a row a recipe
outputs.** The seed runs at every mint, and a craft mints from the
output row: `decay:` on `trade/farming/thing/plough` would deliver every
new plough rusty. So: a kind row that is a recipe output loses its decay
prose and gains nothing; a locality row that `extends:` it carries the
state. S8 enforces both halves at build time, and also refuses
`decay:`/`history:` on a row whose effective class is not Durable (that
key would otherwise be an unapplied key — a diagnostics warning nobody
reads).

**D12 — Which rows are converted, and how.**

| row | disposition |
|---|---|
| lost anchor | `class: /platform/thing/Assembly`; bill `shank` (structural), `stock` (structural), `ring` (fastener), all iron; three part rows beside it (`anchor-shank` 220 kg, `anchor-stock` 60 kg, `anchor-ring` 20 kg, class `Good`); `decay: { stock: { corrosion: pitted } }`; prose loses "its stock rusted to a crust" |
| mooring ring | `Bollard` gains `DurableMixin`; the kind row (no recipe) takes `decay: { whole: { corrosion: bloom } }`; prose loses "and rusted orange" |
| plough | recipe output (D11): `trade-farming`'s row loses "and rusted on the other" and gains no state; NEW `hearts-delight/.../farmstead/thing/old-plough.yaml` `extends:` it with `decay: { share: { corrosion: bloom } }`, and `tract/upper-bench.yaml` props that instead |
| claims-office hire tools | NEW rejection rows `thing/hire-pinch-bar.yaml` (`extends: /trade/mining/thing/pinch-bar`, `decay: { whole: { corrosion: pitted } }`) and `thing/hire-pick.yaml` (`extends: /trade/mining/thing/pick`, `decay: { haft: { rot: punky } }`); both, and `/stuff/thing/gear/wire-brush`, join the rack's `props:`; the room's prose loses "going rusty at the tips" |
| ring of veil | arcana `Ring` gains `DurableMixin`; row gains `_materialPath: /stuff/idea/material/element/silver` and `decay: { whole: { corrosion: bloom } }`; prose loses "tarnished" |
| wand of firebolt (+ cursed) | ⛔ **OUT** (owner, 2026-11-28). The wand class is untouched and its prose keeps "tarnished". Making a wand an assembly opens charge questions nobody has designed (does a broken wand fire; what `salvage` does to the stored charge and bound working; does `fit` keep the working), handed to [magic-items-slate](../slates/engine/magic-items-slate.md) § *Wands as made things*. |
| bog sword (new) | `world-seed/content/world/moor/thing/bog-sword.yaml`, `extends: /stuff/thing/arms/sword`, bill restated with a leather grip, `history: [{ in: /platform/decay-environments/peat-bog, years: 50 }]`, its own prose; a prop of `turf-bank.yaml` |
| curfew bell's oak frame | place fabric (the square's fixture the bell hangs in) — prose stays. "Green at the lip" is patina on bronze, not decay → patina-design-pack |
| garden bed's weathered boards | a `fixedGround` kind — ground, not a good; "weathered" is none of the five mechanisms — prose stays |
| glowcap fixture | place fabric (a niche in the wall) — prose stays |
| glowcap jar | the rotted wood is what the jar HOLDS (the fungus's bed), not a state of the jar — prose stays. ⚠ neither "state" nor "place fabric"; reported |
| estuary staging, rails, bracket; the pass's stakes | place fabric — prose stays |

**D13 — `look`.** A decayed, holding part gets one sentence in
`assemblyAugmenter`, after the failed lines: *The stock is pitted with
rust.* A line whose mark's band IS failure takes its failure word from the
mark (`failureWordFor` checks for a failing band first); a line that
failed by USE keeps its joint's shipped word, and a fully failed line
prints no holding sentence. The whole's marks fold into
`durableAugmenter`'s existing sentence as its cause: *It is badly worn:
pitted with rust.* (the `ConditionReading` building precedent — word,
then why). These are states of the world, printed every look like "The
haft is split"; the teach-once rule is about rule lines and does not
apply. No new perception gate: the lines ride the two shipped augmenters
and are seen exactly when those are.

**D14 — The verb that wears a haft is `hew`, and the tool is a pick.**
No hatchet row exists and no verb wears an axe. `hew` wears the pick
0.02 a blow on `shock`, which `Assembled.wear` routes to the haft. A
punky haft sits at 0.15 and the broken line is 0.1, so it fails on the
third blow through `wearLine`, in the shipped failure word of its joint
(D13: a mark words a failure only when its own band IS the failure).
The drive's "hatchet" is the claims office's hire
pick. Reported.

**D15 — Authored wetness.** `seedHistory` ends by calling
`Wet.wet(lastStay.environment.wetness)` when that is ≥ 0.2. The thing
then dries by the shipped physics once it is somewhere dry — that is
correct (a chest hauled out of the silt does dry) and the drive reads it
at once. No "waterlogged" flag.

**D16 — `analyze soundness`.** Row
`content/platform/content/platform/idea/reading/soundness.yaml`:
`channel: soundness`, `kind: fact`, `scope: [subject]`,
`subjectRequires: [DurableMixin]`, `discipline: appraisal`,
`instrument: ""`, `handTool: cutting`, `eyeCeiling: proficient`.
`SoundnessReading.analyze`: no bound hand tool → decline naming the
route (*press a blade into it — a knife in your hand would tell you*);
no part whose material declares `rot` → decline (*nothing here a blade
would tell you about*); else per such part (the whole, for one piece):
below competent — *sound* or *soft*; competent and above — *sound*,
*soft at the surface* (band soft), *punky: sound outside, rotten
within* (band punky), *rotted through*. `truth()` returns the marks.
⚠ "A blade" is a Tool offering `cutting`; a Weapon knife offers no
capability and does not bind. Reported.

`ConditionReading`: the untrained line adds the whole's cause
(*it is badly worn — pitted with rust*); the proficient part-by-part
line adds the mechanism word (*The haft is badly worn — rot*).

**D17 — The drive is two wire files and one walk.**
`packages/wire/tests/decomposition.wire.test.ts` (clean, repeatable —
stands in the scaffold, wizard-clones testbed twins, destructs them) and
`packages/wire/tests/decomposition-content.dirty.wire.test.ts` (names
the converted world content and takes it; carries the one restart
through the harness's `restartWorld()`). Twins are rows, not `clone`
overrides — `clone` takes none. Detail in Test & gate strategy.

**D18 — Player-facing pages.** `content/platform/content/wiki/guide/decay.md`
(what rusts, rots, molds, fades and spalls; what each cure is; the bog
and the barrow as worked examples; no number restated — transclude);
`brush`'s `help:`; the reading row's `improves`/`stakes`. The subsystem
doc (`docs/subsystems/decay.md`) is written at `/finalize`.

## ⭐⭐ Host placement

| what | host | what composing it claims | P2 check |
|---|---|---|---|
| `decay`, `history` (seed), `decayMarks`, `lostKg`, the four methods | `DurableMixin` | every thing with a condition can carry a decay mark | every Durable host is a material article with a condition; each can honestly be rusted, rotted or spalled. Hosts that will never be authored so carry two empty fields, the cost `mends` already has. No guard re-narrows: legality is the MATERIAL's (`degradation`), not the class's |
| `decay?`, `lostKg?` | `PartLine` | a line can be decayed | a line is a material member; yes |
| `degradation`, `decayOver` | `DegradationMixin` on `Metal`, `Wood`, `Fiber`, `HideHorn` (kind classes in `platform/idea/material/`) and on `Stone`, `Ceramic` | every metal, wood, fibre, hide, stone and fired body breaks down in its surroundings | true of each kind; a noble metal is a row with no `corrosion` key, which is a fact about that metal. NOT on `Material` (gases, water, foods — the mirror failure: "inert" on 300 rows) |
| `DurableMixin` | `Bollard` | a bollard has a condition | a post or ring in the weather; four rows; yes |
| `DurableMixin` | arcana `Ring` | a ring has a condition | a worn metal article; yes. It gains no `repair` verb (that is Assembled's) |
| mass loss | `Tangible.getMass` reading `Durable.getLostMass` | mass knows about lost metal | the wet-law precedent in the same method; `Durable` does not override mass (that would put mass on the wear axis) |
| nothing | plain `Good`, `Thing`, `Material` | — | deliberately untouched (D1) |

Order of composition: `DegradationMixin` is an additive attribute mixin
(order moot).

## Convention conformance

Checked this cycle, not recalled.

- **`props:` / `cast:`** — new placements are `props:` entries (bog
  sword, hire tools, wire brush, old plough). No `container:`, no
  `populates:`.
- **Places** — every new path segment is `/place/`; no "room" in new
  names.
- **Namespace** — kernel classes under `platform/` and `lib/`; platform
  documents at `/platform/decay-environments/…`; commons rows at
  `/stuff/…`; locality instance rows under their `/world/…` locality;
  arcana class changes inside its own `src/`.
- **Module categories** — S1, S3 value classes are *named value-object*
  files in `lib/material/`; S2 a mixin in `lib/material/Degradation.ts`
  (`_mixinName = 'DegradationMixin'`, added to `Mixins`); the catalogue
  an instanceable Idea in `platform/idea/` with its row
  `content/platform/content/platform/idea/DecayEnvironmentCatalogue.yaml`;
  the reading class in `platform/idea/reading/`. No free helper
  function, no `eslint-disable`, no new category.
- **Module scope** — declarations only; band tables are `const` data.
- **Import boundary** — no `fs`/`yaml` import; the catalogue reads
  through `DocumentCatalogue`.
- **Verbs on objects** — `scourDecay`, `mendCeiling`, `decayOver`,
  `driverFor` are instance methods; the one Api addition is the
  catalogue accessor (and the `unitMassOf` forwarder if absent).
- **Methods only between Stuff** — readers use `getDecayMarks()` /
  `getParts()`; no field reads across objects.
- **P3 refuse / skip / throw** — D3's list are typed throws; `brush` and
  `repair` refusals are reason rows; a derived fade on an undyed host
  and a history that derives nothing are skips; nothing defaults in
  silence.
- **P4 no duck typing** — arcana imports the kernel mixins by package
  specifier; readers narrow with `MixinApi.isDurable` / `isAssembled` /
  `hasDegradation` / `isDyed` / `isWet`. No `?.()`.
- **P5 the mixin decides** — the ceiling, what scouring clears, what a
  history derives, and legality all live on the model; `BrushController`
  and `CraftingLogic` ask.
- **P6 persistence per content** — no class gains persistence. Decay
  state is ordinary runtime state on hosts that are already kept by
  their container; the bog sword is floor stock on a staged place by
  that place's existing choice.
- **P7 load on use** — environments by `ensure(path)` at seed; material
  rows are already constituents; nothing boots, nothing searches.
- **P8 names** — `DecayMark` (not `Decay`: taken), `DecayEnvironment`
  (not `Environment`/`Exposure`: taken), `DegradationMixin` (the
  physics, like `Porosity`), `scourDecay` (the remedy's word; `brush`
  stays the one verb).
- **Gates this build must pass:** `lint:family` whole; watch in
  particular `lint:bills` (new arm + new bills), `lint:mixin-names`,
  `lint:mixin-clusters` (Durable, Assembled), `lint:lib-statics`,
  `lint:data-ideas`, `lint:schema` (no change expected),
  `lint:instanceable`, `lint:census`, `lint:reachability` (new rows),
  `lint:arg-kinds` + `lint:view-keys` (brush view), `lint:command-views`,
  `lint:material-kinds`, `lint:reconcile-chains`, `lint:module-scope`,
  `lint:imports`, `lint:wire-content`, `lint:test-bootstrap`, the
  wiki-spoiler audit (new `fieldMeta` entries on Durable — keep them
  BELOW `fieldMeta` consts as Assembled's comment warns).

## Waves

Each wave ends green on `pnpm test:near`, every touched pack's vitest,
and `pnpm -C packages/server lint:family`, and at the named commit.

### W0 — the vocabulary and what materials suffer

Implements D2 (table only), D6.

- NEW `lib/material/DecayMark.ts` — mechanisms, bands, the table, the
  `DecayMark` value class (`ceiling()`, `lostShare()`, `isFailure()`,
  `clearedBy()`, `phrase(product)`), `bandAt(mechanism, progress)` as an
  instance-reachable read (no public statics).
- NEW `lib/material/Degradation.ts` — field + validating
  `setDegradation` (unknown mechanism, missing `product`, negative
  `perYear` throw); `suffers(mechanism)`, `productOf(mechanism)`.
  `decayOver` lands in W3.
- `lib/mixin.ts` (`Mixins.Degradation`), `api/mixin.ts`
  (`hasDegradation`), the six kind classes.
- base-library material rows per D6; NEW `element/silver.yaml`.
- Tests: `lib/material/__tests__/DecayMark.test.ts`,
  `Degradation.test.ts` (through the real applier; `by-key` through
  `charred-oak`); base-library pack vitest.
- Acceptance: every listed material answers `suffers`; iron's product is
  rust, bronze's verdigris, silver's tarnish; nothing reads them yet.
- Commit: `build(decomposition W0): the decay vocabulary and material susceptibility`

### W1 — a part can be decayed, and it behaves

Implements D1, D2, D3 (`decay:` only), D4, D10, D11's lint arm.

- `lib/material/Durable.ts` — `decay` seed field, `decayMarks`, `lostKg`
  (+ both in `captureSlice`), `seedDecay`, `getDecayMarks`,
  `getLostMass`, `mendCeiling`, the clamp in `setCondition`; header
  sentence updated.
- `lib/craft/Assembled.ts` — `PartLine.decay` / `lostKg`; `seedDecay`
  override (part keys, `whole`, validation, `ensureParts`, part masses);
  the clamp in `mendLine` / `setCondition` / `restoreAll`; clearing in
  `replaceMembers` (fully replaced line) and reforge; `failureWordFor`;
  `getLostMass` sum.
- `lib/material/Tangible.ts` — subtract lost mass in `getMass` and
  `getDryMass`.
- `platform/idea/api/CraftingLogic.ts` + `api/crafting.ts` — the
  `decayed` fault in rung 4 and `mendOnePiece`; `RepairDeclineReason`;
  reason row `content/platform/content/reasons/decayed.yaml` (and where
  `repair`'s other reasons are worded, follow that).
- `scripts/check-bills.ts` — the S8 arm, with a test.
- Tests (all through the applier): a row with `decay:` mints decayed;
  the wrong mechanism for a material throws naming it; a punky haft
  fails in three `wear(0.02, 'shock')` and the tool `isBroken`; `fit`
  (`replaceMembers`) restores and clears; a pitted part is lighter by
  its share and a mend does not restore the weight; a mend stops at the
  ceiling and reports `decayed`; a reforge clears mark and loss; ⭐ a
  capture → restore round trip of a repaired thing does NOT come back
  decayed (the real `PersistableApi`, a kept container holding it); a
  go-live on the row changes nothing.
- Acceptance: the Law 2 tests untouched and green.
- Commit: `build(decomposition W1): authored per-part decay that caps, fails and weighs`

### W2 — it reads

Implements D13, D16.

- `Durable.ts` / `Assembled.ts` augmenters; `ConditionReading.ts`.
- NEW `platform/idea/reading/SoundnessReading.ts`, row
  `reading/soundness.yaml`.
- Tests: look lines for holding / failed / whole marks, by material
  word; `ConditionReading` at untrained and proficient;
  `SoundnessReading` with and without a blade, novice vs competent, on a
  part with no rot-prone material.
- Commit: `build(decomposition W2): decay on look, condition and the soundness probe`

### W3 — history derives state, once

Implements D3 (`history:`), D5, D7, D8, D15.

- NEW `lib/material/DecayEnvironment.ts`,
  `platform/idea/DecayEnvironmentCatalogue.ts` + its row, kind row,
  six environment rows, `MaterialApi.decayEnvironments()`.
- `Degradation.decayOver`; `Durable.seedHistory` (+ Assembled override
  per line), the final-stay wetting, the `Dyed.bleach` route.
- Tests: the D7 outcome table; explicit `decay:` beats `history:` for
  the part it names, in both seed orders; a missing environment throws;
  a silt chest is soaked and heavier than its dry twin and carries no
  rot; a derived thing repaired, captured and restored is not re-derived;
  ⭐ a test that advances the world clock a game year over a derived
  sword and reads identical marks (the no-clock pin, beside the two Law 2
  tests, which stay as they are).
- Commit: `build(decomposition W3): environments and the one-time derivation`

### W4 — the wire brush

Implements D9.

- `Durable.scourDecay` (+ Assembled override); `BrushController.ts`;
  `brush.yaml`; reason rows `needs-wire-brush`, `nothing-to-brush`;
  `generic-objects/.../gear/wire-brush.yaml`.
- Tests: bloom and flaking clear, pitted goes `scoured`, `lostKg`
  unchanged; a clothes brush on rust refuses with the reason; mold
  clears under any brush; a chair gets both acts; the view binds a
  `Tool` target and a `scouring` tool by default (through the binder,
  not the controller alone).
- Commit: `build(decomposition W4): brush with a wire brush takes rust off`

### W5 — the world is decayed in fact

Implements D12.

- Class changes: `platform/thing/Bollard.ts`;
  `content/arcana/src/thing/Ring.ts` (⛔ not `Wand.ts`, D12).
- Rows per the D12 table, across terminus, platform, trade-farming,
  hearts-delight, rejection, arcane-library, world-seed,
  generic-objects. Grep `packages/content` for every trimmed phrase
  (B4).
- Twins for the drive in `test-fixtures`, all over kernel classes, under
  `content/world/testbed/thing/decay/`: `sword` (Weapon; bill of three
  testbed part rows — steel blade, leather grip, iron pommel),
  `sword-bog`, `sword-damp`, `sword-dry` (each `extends: sword` + a
  50-year `history`), `bar` (Assembly, iron, 10 kg), `bar-pitted`,
  `chest` (Assembly, oak, 20 kg), `chest-silt` (10 years in
  fresh-water silt). Named in `packages/wire/src/harness/scaffold.ts`.
- Tests: each pack's vitest; a pack-level test that clones every
  converted row and reads its marks.
- Commit: `build(decomposition W5): the anchor, the ring, the hire tools and a bog sword`

### W6 — the drive, the walk, the pages

Implements D17, D18.

- The two wire files, `e2e/tests/decomposition-walk.spec.ts`, the wiki
  page; the Drive record appended below.
- Then, and only then: the one full `pnpm test`, and the MR.
- Commit: `build(decomposition W6): the drive, the walk and the decay guide`

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| an authored state | — (a row key) | — | `decay:` on a row whose class is Durable; S8 fails the build otherwise | applier phase 3 at mint; materials are constituents | — |
| a history | — | — | `history:` + six rows + the kind row + the catalogue's own row | `decayEnvironments().ensure(path)` in the seed | — |
| look | `look` (shipped) | shipped | the two augmenters are mixin statics | — | — |
| `analyze condition` | shipped | global | `condition.yaml` (shipped) | `ReadingCatalogue` (shipped) | `subjectRequires: [DurableMixin]` — the anchor, the ring and the bollard now pass it |
| `analyze soundness` | `analyze` (shipped, channel is a string) | global | `reading/soundness.yaml` + `SoundnessReading` | `ReadingCatalogue` warms every installed row | `subjectRequires: [DurableMixin]`; `handTool: cutting` bound from the `tool` arg's default |
| wire-brushing | `brush` (shipped) | holding a `SweepingTool` — the wire brush's class | `capabilities: [scouring]`; the brush is a prop on the claims rack | the row loads when the rack is staged | target `SoilableMixin|DurableMixin`; tool default MQL gains `capability.scouring` |
| cutting rot out | `fit` (shipped) | `AssembledMixin` contributions (the hire pick is a `Tool`) | a failed line; `pick-haft` sells at the Terminus general store | shipped | shipped |
| mending | `repair` (shipped) | `AssembledMixin` | `mendCeiling` | shipped | shipped |

⚠ The silent links, each with its test: the `captureSlice` field list
(W1 restore test); `decay:` on a non-Durable class (S8); the brush
view's `requires` (W4 binder test); the catalogue's own row (W3 test
resolves an environment through `MaterialApi`, not by constructing the
catalogue).

## Acceptance-criteria coverage

| AC | waves |
|---|---|
| converted goods read their decay part by part, said once | W2, W5 — ⚠ the plough reads it on the Hearts Delight instance, not on the kind (D11); the wand bands are OUT (D12, owner) |
| a rotten part fails under use; `fit` restores | W1, W5 (hire pick), W6 |
| a wire brush clears rust; lighter and pitted; another brush does not | W1 (weight), W4, W6 |
| `analyze soundness` tells punky from sound; a novice reads less | W2, W6 |
| one sword row, three histories, three states; the bog one is in the turf bank | W3, W5, W6 |
| waterlogged is heavier and reads soaked | W3, W6 |
| the same after a restart; nothing repaired is re-decayed | W1, W3 (unit), W6 (the restart) |
| nothing changes across a day in the rain | W3 (unit, a year), W6 (step 10) |

Nothing is unmapped.

## Test & gate strategy

**Unit** — listed per wave. Every seed test goes through the real
`TemplateApplier` and imports `test-bootstrap`; no test assigns `decay`
or `parts` by hand to prove authoring.

**Only the drive can prove:** the restart, the binder + affordance for
`brush` and `analyze soundness`, the anchor under water in its own
light, the turf bank by day and at night.

**The drive.** No soak drive; no step is a span.

`decomposition.wire.test.ts` — clean; `packs: ['platform', 'test-fixtures', 'base-library', 'generic-objects']`
(the wire brush is generic-objects'); stands in the scaffold; clones
twins with the wizard `clone --here` and destructs them.

`decomposition-content.dirty.wire.test.ts` — `packs: ['terminus', 'rejection', 'world-seed', 'trade-mining', 'trade-carpentry', 'trade-cordage', 'trade-diving', 'arcane-library', 'generic-objects', 'test-fixtures', 'water']`;
`DIRTY_REASON`: takes the bog sword and the hire tools, breaks and
re-hafts the pick.

| step | pace | kind | file | how |
|---|---|---|---|---|
| 1 anchor reads rusted | instant | player | content | `arrive` at the Wharfside bed as the underwater drive does (gear + light); `look anchor`, `analyze condition anchor` |
| 2 rust costs metal | instant | staged | clean | clone `bar` and `bar-pitted`; masses read by `eval` (8.5 < 10). content: the anchor weighs under its row's 300 |
| 3 a rotten haft gives way | instant | player (was staged) | content | take the hire pick from the rack; `look`; `hand` a rigging knife; `analyze soundness pick` as a fresh character (soft) and as one staged competent in `appraisal` (punky — `stageStandingHistory` or the transcript staging the repair drive uses); `hew` at the Ferrow face until the haft fails (≤ 3); the pick refuses work |
| 4 rot is cut out | instant | player | content | `hand` a pick-haft; `fit haft to pick`; `look`; `hew` works |
| 5 rust comes off | instant | player | content | take the wire brush and the hire pinch bar from the rack (⚠ taken, not bought — the till cannot sell); `brush bar with clothes brush` refuses by reason; `brush bar with wire brush`; `look` reads pitted and brushed; mass unchanged before/after |
| 6 history derives state | instant | player, then staged | content, clean | content: walk to the turf bank by day, `look`, `get sword`, `look sword`. clean: clone `sword-bog`, `sword-damp`, `sword-dry`; three different reads |
| 7 waterlogged | instant | staged | clean | clone `chest` and `chest-silt`; soaked; heavier |
| 8 one-piece things | instant | player | content | `look` the mooring ring at the Gannet Rock landing; `hand` a ring of veil and `look` it |
| 9 restart | instant | staged | content | holding the re-hafted pick, the brushed bar, the bog sword, and a `sword-damp` whose grip was re-fitted: `restartWorld()` (assert `killed === false`), log in, read all four and the anchor; the damp sword's grip is still the new one |
| 10 no clock | short | staged | clean | pin rain at the testbed plaza; lay `sword-bog` and `sword` out; `testharness clock-advance` one game day; marks, condition and dry mass identical (wetness may differ — that is weather, not decay); unpin |
| 11 light | instant | player | content | step 6 by day; `testharness clock-advance` to night at the turf bank: `look` does not list the sword; with a lantern it does |

All eleven are the **blocking drive**. B2: before trusting green, break
each checkpoint once (remove a `decay:` key, swap the brush, skip the
`fit`) and watch it fail.

**The walk** — `e2e/tests/decomposition-walk.spec.ts`, once, at
code-complete: the claims office (steps 3–5: the rack, `look`, the
probe, `brush` and its refusal, `fit`) and the turf bank (steps 6 and
11). The anchor and the landings stay with the wire drive.

**Gates** — `lint:family` every wave. `lint:wire-content` will count the
content file (a test-only ratchet move; say so in the MR).

**The full suite** — `pnpm test` once at W6 before the MR, and at
`/finalize`. Between, `pnpm test:near` + pack vitests + lints.

## Risks & opens

1. ~~Wands become assemblies~~ — dropped by the owner (D12); the wand
   class and rows are not touched.
2. **`lint:mixin-clusters` on Durable / Assembled.** The new fields are
   co-used with condition and should join that cluster. A reported
   split is evidence, not a ceiling to raise: stop and re-read D2.
3. **Band wording is kernel vocabulary, not rows.** The requirements'
   altitude note calls the bands' wording grain. Rows for it would be a
   second document kind and catalogue for a list whose every member has
   engine arithmetic behind it. If the owner wants realms to re-word
   bands, that is one more kind (`decay-mechanism`) — a contained
   follow-up, since phrases are read through `DecayMark.phrase` alone.
4. **A throwing seed fails the clone, and a failed prop clone is logged
   by its place.** A bad `decay:` in content is loud in the pack vitest
   and in S8 for class errors, but a wrong mechanism-for-material is
   only caught when the row is cloned — W5's clone-every-converted-row
   test is what holds it.
5. **Part masses.** `unitMassOf` falls back to an even split when a part
   row authors no mass. The anchor's parts author theirs; the hire
   pinch bar is one piece. If a converted bill's parts lack masses, the
   loss is approximate — acceptable, and visible in the unit test.
6. **`hew` preconditions.** If the Ferrow face needs a stake or a shift,
   stage it the way `drilling.dirty` / the mining drive does; do not
   weaken `hew`.
7. **The anchor step** is under water; reuse the underwater drive's
   staging verbatim. If its light staging has rotted, that is a finding
   for the record, not a reason to move the anchor.
8. **The bog sword returns at every restart** (floor stock on a staged
   place) while the one a player took persists with them. That is the
   shipped tier; a unique find is stratigraphy-and-finds' question.
9. **Stop and report rather than guess:** any need for a new
   `eslint-disable`, a new module category, a `lint:lib-statics` rise
   (the value classes are designed to need none), or a Law 2 test that
   will not stay green without an edit.

## Deferred seams

| seam | attach point left by this build | leaves as |
|---|---|---|
| the live exposure clock | marks are plain records with an ordered band list; a later reconcile advances a mark's band and continues from the authored state. `DecayEnvironment.driverFor` is the driver it would integrate | [decomposition-slate](../slates/engine/decomposition-slate.md) § 1, § 4 |
| coatings slowing decay | `Faced` coats are untouched; a sealant becomes a factor on the driver | decomposition-slate § 3 |
| organisms, abrasion | a new mechanism is a table entry + a driver + a susceptibility key | decomposition-slate § 2 |
| frost derived | `frost: {}` is already on the stone and brick rows; it needs `perYear` and a freeze–thaw driver | [brickmaking-slate](../slates/trades/brickmaking-slate.md) |
| patina, the bell's green lip, "dark from the peat" | none — prose today | [patina-design-pack](../slates/engine/patina-design-pack.md) |
| family parent material rows | `degradation` is `by-key`, so a parent row can carry a family's figures the day one exists | the template taxonomy pass |
| a Weapon blade as a probe; an axe that wears when it fells | `handTool: cutting` reads Tool capabilities; `fell` calls no `wear` | decomposition-slate § 7 (add at the sweep) |
| ruins, barrows, wrecks; unique finds | rows with a `history`, in a place | [stratigraphy-and-finds-slate](../slates/world/stratigraphy-and-finds-slate.md), [museum-slate](../slates/world/museum-slate.md) |
| three staves of thirty rotted | a mark is on the LINE (the set) | [assembly-slate](../slates/trades/assembly-slate.md) |

## Critical files

Read first, in this order:

1. `docs/requirements/decomposition-requirements.md`,
   `docs/slates/engine/decomposition-slate.md` § 8
2. `packages/server/src/mud/lib/craft/Assembled.ts` (whole)
3. `packages/server/src/mud/lib/material/Durable.ts`
4. `packages/server/src/mud/lib/material/Tangible.ts` (`getMass`, ~480–530)
5. `packages/server/src/mud/platform/idea/TemplateApplier.ts` +
   `docs/subsystems/templates.md` § The TemplateApplier
6. `packages/server/src/mud/platform/idea/api/PersistableLogic.ts`
   (`captureFields` 611, `restoreItem` 1019)
7. `packages/server/src/mud/platform/idea/api/CraftingLogic.ts`
   (`mendAssembly` ~4198, `mendOnePiece` ~4420)
8. `packages/server/src/mud/platform/idea/PumpMechanismCatalogue.ts`,
   `lib/pump/PumpMechanism.ts`,
   `packages/content/platform/content/kinds/pump-mechanism.yaml` (the
   document pattern)
9. `packages/server/src/mud/lib/material/Porosity.ts` (a capability
   mixin), `platform/idea/material/{Metal,Wood,Fiber,HideHorn,Stone,Ceramic}.ts`
10. `packages/server/src/mud/lib/instrument/Reading.ts`,
    `platform/idea/reading/ConditionReading.ts`,
    `packages/content/platform/content/platform/idea/reading/density.yaml`
11. `packages/server/src/mud/platform/idea/cmd/inventory/BrushController.ts`,
    `packages/content/platform/content/platform/cmd/inventory/brush.yaml`,
    `platform/thing/SweepingTool.ts`
12. `packages/server/src/mud/lib/material/Dyed.ts` (`bleach`),
    `lib/wetness/Wet.ts` (`wet`)
13. `packages/content/trade-mining/src/lib/Working.ts` (~1015, the hew wear)
14. The D12 rows; `packages/content/world-seed/content/world/moor/turf-bank.yaml`;
    `packages/content/rejection/content/world/terminus/rejection/place/claims-office.yaml`
15. `docs/testing.md` § The scaffold, § Staging, § One stop, one restart;
    `packages/wire/src/harness/scaffold.ts`;
    `packages/wire/tests/cordage.dirty.wire.test.ts` and
    `client-surface.wire.test.ts` + `client-surface-content.dirty.wire.test.ts`
    (the clean/content split); `e2e/tests/paint-walk.spec.ts`
16. `lib/structure/__tests__/Structure.condition.test.ts:124` — read it;
    never edit it

## Drive record

*(appended at build time)*
