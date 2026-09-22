# Slate-compaction pass — mining batch ledger

Five slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `mining.md` only.
Line numbers below are the ORIGINAL file's (snapshots of the originals were
taken before any edit). Evidence paths are under `packages/content/` and
`packages/server/src/mud/` unless stated.

What the batch found, in one paragraph: **Stage A is real and larger than
the slates' own stamps admit.** `trade-mining` (Deposit · MineWarren ·
Working · Ore · six acts incl. `stake` · three survey channels · ten
recipes · two species · two brains), `trade-fuel` (the clamp, `char`),
`trade-smelting` (`smelt` with the carbon regime, five recipes) and the
`rejection` venue (66 rows, zero TypeScript — the pithead, the adit, three
authored galleries, the four type rows, four businesses, the Hush as a
natural chamber, a coppice and a smelter) all ship; `trade-smithing` has 14
recipes including the arms the metal-chain slate audited as uncraftable;
`JobBoard` shipped in the kernel; forestry became its own pack. Nothing
below the water table ships (grep: `hoist`/`pump`/`drainage`/`roast`/
`tribute pitch`/`LiftMixin`/`Organization`-as-district/`seismic`/`dirt
dragon`/`whelp`/`Rhonda`/`Barmaster`/`Gnometown`/`eternal steel` — 0 files
each outside comments). The sampling slate is almost entirely unbuilt.

---

## docs/slates/builds/mining-slate.md — 1743 → 1069 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block + the *STAGE A SHIPPED* block + *where code disagrees, code wins* (12–53, 42 lines) — history; doc: `mining.md` throughout (the four corrections are all stated there: `InnerWarren`, metres, locality type rows, per-face depletion on the room)
- `## The mine as space` → paras *shared elastic Warren / residency cull* · *two actions, extraction vs advancement* · *seeded, lazy, deterministic* (132–162, 31) — code: `trade-mining/src/idea/MineWarren.ts` (`extends InnerWarren`, keyed members, `carve`), `src/lib/Working.ts` (`facesOf`, `commandContributions` for `hew`/`drive`/`sink`/`raise`/`shore`), `src/idea/Deposit.ts` (`seedFor`, `sampleAt`); doc: `mining.md § The governing split`, `§ Three-tier room identity`, `§ The geology field`, `§ The acts are labour` (graduated below). The *regenerate on the breathe cycle* sentences are the Superseded half (below)
- `#### Smell` → *some bad air smells* + *nose and bird are complementary* (560–568, 9) — code: `src/behavior/reads-air.ts`, `platform/idea/api/BiomeLogic.ts` (`blackdamp`, `stinkdamp`); doc: `mining.md § Air` (*the canary is not redundant with a nose; blackdamp is odourless*). The *third job for the water table* para (570–573) is KEPT — the sulfide zone is unbuilt
- `#### The friendly ones are instruments that can die` (630–647, 18) — code: `src/agent/PitPony.ts`, `trade/mining/agent/pit-pony.yaml` + `canary.yaml`, `reads-air.ts`; doc: `mining.md § Air`, `§ The trade/locality line` (*the two functional species*), `§ The producer beat`
- `## Materials, metallurgy & money` → *Money is fiat, not commodity-backed* + *Deflation protection = active CB policy* (906–916, 11) — code: `lib/banking/` (the ledger + the Governor-gated `reserve mint`); doc: `banking.md § two-tier money / the CB faucet`, `governance.md § The one wired consumer: the Governor controls the central bank`. The *why* (a gold standard would make mining gold = minting money) is handed off below
- `## Economics & balance` → bullets *Production, not minting* · *It closes the loop* · *No NPC vendor faucet* (956–968, 13) — code: `rejection/…/thing/assay-counter.yaml` is a `ConsignmentShelf` (the buyer consigns, never mints), the four businesses carry no endowment (`mining.md`'s content assertion), `lib/banking/__tests__/money-integrity`; doc: `banking.md § the conservation chokepoint`, `mining.md § What Stage A does NOT cover` (the acceptance-criterion para), `vocations.md` l.137 (*the smelter buys its ore out of REVENUE*)
- `## The mine's machinery` → the *Graduated 2026-08-31* provenance note (1025–1030, 6) — history
- `### ⭐⭐ Coordinate architecture — ONE 3D CartesianZone` (1032–1061, 30) — code: `rejection/…/world/rejection/ferrow.yaml` (`CartesianZone`, `cellSize: 10.0`), `lib/zone/SpatialZone.ts` (`deposit` field), `Working.metresOf`; doc: `mining.md § The geology field` (*the deposit speaks METRES*, the `deposit:` on the shared parent zone), `§ The governing split`. The `SphericalZone` retraction is history
- `### Persistence — three states, player-controlled` (1063–1076, 14) — code: `MineWarren.promote`/`demote`/`tierOf`, `Working.getTier` (`spine` when unwarrened); doc: `mining.md § Three-tier room identity`
- `### Two acts — mine a vein vs carve a heading` (1078–1090, 13) — code: `HewController.ts`, `DriveController.ts` (`paceForGround(DRIVE_MS, face.hardnessMPa)`), `WinzeController.ts`; doc: `mining.md § The acts are labour` (graduated)
- `### The geology field, and what is behind the wall` (1106–1119, 14) — code: `Deposit.ts` (`features.pins`, `seededFeatureAt`), `rejection/…/idea/deposit/ferrow.yaml` (the `hush-mouth` pin, `vug`/`seep`); doc: `mining.md § The geology field`, `§ Features, and the chamber seam` (graduated)
- `### ⭐⭐⭐ Surveying — zero new verbs` incl. *one instrument per parameter*, *what it reads like*, *where competence meets knowing where to dig*, *what is actually new to build* (1210–1311, 102) — code: `src/idea/cmd/perception/MeasureStrikeController.ts`, `MeasureDipController.ts`, `AnalyzeGroundController.ts`, `SurveyChannelController.ts`, `src/thing/instrument/SurveyInstrument.ts`, the `strike`/`dip` stanzas on `platform/cmd/perception/measure.yaml` + `ground` on `analyze.yaml`, `trade/mining/idea/Discipline/geology.yaml`, `thing/miners-dial.yaml` · `compass.yaml` · `assay-kit.yaml`; doc: `mining.md § Surveying — three layers, not one` (competence buys resolution never outcome; dip unobtainable at the surface; per-viewer DISCOVERY beliefs; the survey record as an asset)
- `### ⭐⭐ Faces & dig-sites — the ten-direction model` (1313–1342, 30) — code: `Working.facesOf` (ten directions, `blockedFaces`, `workedFaces`), `Working.recordWinning`; doc: `mining.md § The face model, and support`
- `### ⭐⭐⭐ Ground support` → *the user's ruling* · *the thing that spans rooms is the SUPPORT* · *sub-room geometry is the face model* · *the consequence of neglect* (1360–1436, 77) · *Stability is derive-on-read … a threshold, never a roll* (1450–1460, 11) — code: `src/thing/TimberSet.ts` (a `Durable` `ToolItem`), `Working.stabilityAt`/`supportHere`/`groundTelegraph`, `MiningActController.ts` (refusal off the same threshold), `src/idea/cmd/mining/__tests__/support.test.ts`; doc: `mining.md § The face model, and support` (stability `f(span, ground, support, water)` and a THRESHOLD; support a condition-weighted sum over standing sets; a fall blocks a FACE never a room; the free telegraph rides the same number). Kept: *Reading the ground* (sounding, `measure convergence` — unbuilt), *The timberman* (unbuilt), *What is deliberately deferred*
- `### The cell size, and why there is no per-heading cap` (1529–1562, 34) — code: `ferrow.yaml` `cellSize: 10.0`, `DriveController` (`carve` of ONE cell), `TimberSet`; doc: `mining.md § The acts are labour` (graduated)
- `### ⭐⭐⭐ Room identity — nothing mints a room template` (1564–1588, 25) — code: `MineWarren.ts` (`<claimExtent>/<cell>` keys, `restoreOrSeed`), `src/location/MineRoom.ts` (one class, four locality rows); doc: `mining.md § Three-tier room identity`
- `### What actually persists — three sparse things` (1590–1613, 24) — code: `MineWarren.carved` (persistent ledger), `Working.workedFaces` (on the room), `MineRoom` `PersistableMixin`; doc: `mining.md § Three-tier room identity`, `§ The face model` (*per-face depletion is state about the ROOM*). The *seal-and-reap is the ledger's GC* para is the Superseded half (below)
- `### Addressing a working — build-2 already shipped the locator` (1615–1638, 24) — code: `api/mql/` (`:members`, the `key`/`address` atoms); doc: `mql-grammar.md` l.374–442, `mql.md § :members and the keyed-member locator`. ⚠ The claim *the survey address IS the Locality address* is NOT shipped for workings — a carved room has no `address` (see Uncertain)
- `### Two primitives` → the `JobBoard` bullet (1665–1668, 4) — code: `platform/thing/JobBoard.ts`, `rejection/…/thing/pithead-board.yaml`; doc: `contract.md` l.313 (`JobBoard`, the board as the pool's visibility surface). `LiftMixin` bullet KEPT
- `## Open` → *A first-come register compares EXTENTS* (1734–1740, 7) — code: `MineWarren.overlappingClaim`; doc: `mining.md § Title` (verbatim)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## The core act — an engaged activity, not a minigame` (89–98, 10) + `### Two acts` + `### The cell size` (above) + the *no deed gate* decision (also metal-chain's) — code: `MiningActController.ts` l.10–16 (*None of these acts carries a deed gate, and that is a decision … a test reads the four views*), `DriveController.ts` (`DRIVE_MS`, `DRIVE_COST` endurance, `paceForGround`), `WinzeController.ts` (the vertical medium as a VALUE) → inserted at `mining.md § The face model, and support` as `### The acts are labour` (19 lines)
- `### Seal-and-reap` (see Superseded) + the cull rule the code actually has — code: `MineWarren.abandon` (Held keeps its record via `PersistableApi.capture`; Provisional `markForRevert` + ledger entry deleted), `MineWarren.reconcile` (never Held, never occupied) → inserted at `mining.md § Three-tier room identity` as `### Reap is per cell, and Held ground sleeps` (15 lines)
- `### The geology field, and what is behind the wall` + the Hush rows — code: `Deposit.features` (pins as a flat record; `seeded` rules), `rejection/…/world/rejection/hush.yaml` (`SphericalZone`, *the grid represents what LABOUR CUT*), `hush/gallery.yaml`, `ferrow/hush-mouth.yaml` (`AuthoredWorking` singleton, both sides of the seam explicit) → inserted at `mining.md § The geology field` as `### Features, and the chamber seam` (19 lines)
- `#### ⭐⭐ The fine/coarse split: why the assay shed is a room` — KEPT in the slate (it sits inside a section whose siblings are unbuilt) but the decision is undocumented: code `lib/perception/Light.ts:157 REQUIRED_BAND_FOR_DETAIL` (`fine: bright`), `VisionModality.ts:175` → inserted at `mining.md § Surveying` (8 lines). Recorded here so the reviewer knows the slate paragraph and the doc paragraph now coexist; cutting the slate copy is left to the cluster pass since the surrounding subsection is a mixed keep
- metal-chain's `## The ore body is finite` (its 403–423) closes this slate's *Seam model* open — code: no regeneration path anywhere in `trade-mining` (depletion only accrues via `recordWinning`; nothing refills); `Ore.onSplit` (*a sample off a pooled lot assays as the lot*) → inserted at `mining.md § Ore, grade and the smelt` as `### The body is finite` (15 lines)

### Superseded — cut
- `## The mine as space` → *Shared commons … regenerate on the breathe cycle … renewable shared resource … sink a few arbitrary shafts* (191–197, 7) — by the code and metal-chain 2026-08-31: the ore body is FINITE (`mining.md § The body is finite`); `sink` shipped as a climbed winze, not a shaft. One-line note left under the heading
- `## Specialization — judgment, not damage` (761–775, 15) — by the code: competence buys resolution and the availability of an inference, never outcome (`mining.md § Surveying`); no act is competence- or deed-gated (`§ The acts are labour`); the Disciplines shipped as `geology` + `mining` (`trade/mining/idea/Discipline/`), not *Prospecting/Hewing/Deep-delving*; *cut cleaner — preserve Grade* contradicts *competence never touches the ground*. Heading + note left
- `### The Ferrow Delving (Terminus realm)` tier list (845–872, 28) — by the shipped venue: the `rejection` pack's 66 rows (see the rejection ledger). Heading + note left
- `### Seal-and-reap — the long-term-richness engine` (1092–1104, 13) — by the code: per-cell cull, no articulation-point seal, no wall Boundary, no re-driving into refreshed ore → `mining.md § Reap is per cell`, `§ The body is finite`. Heading + note left
- `### The Deposit Idea — the geology field, concretely` (1121–1208, 88) — by the shipped row shape: class `/trade/mining/idea/Deposit` (a trade class, not `/platform/idea/Deposit`), keys `host`/`meanGrade`/`gangue`/`halo`/`alongFrom`/`features.pins` as a record, `depletion` as boxes with `scale` — `rejection/…/idea/deposit/ferrow.yaml`; doc `mining.md § The geology field`. The three gaps closed: `base-library/…/rock/slate.yaml` exists (`hardness: 90`), `granite.yaml` has `hardness: 200`, grade is `Ore.grade`. Heading + note left
- `## Open` → *Seam model [OPEN, LEAN finite]* (1709–1712, 4) — CLOSED finite (metal-chain § The ore body is finite → `mining.md § The body is finite`). Replaced by a struck one-line entry in the same list style as the cave-in item above it

### Kept (UNBUILT)
- `## The governing principle` · `## Where the play lives — four layers` (frame; layers 2 and 4 partly unbuilt)
- `## The mine as space` → *Navigable without being a maze* (shaft backbone, minimap, hoist shortcut) · *Depth is time — Eternal steel*
- `## The mine as a place` (all) — town-below, the folk, Gnometown, the flagship pattern
- `## The deep-law` (all) · `## The dangers of the deep` (all — see Uncertain) · `## The deep ecology` → the roster by band (crawlers, spiders, olms, moths, the apex — see Uncertain)
- `### Light, and the sensorium` → *Light follows the tier* (see Uncertain) · *Rejection's light is biological* (self-marked NOT SHIPPED) · *fine/coarse split* (see Graduated) · *the sensorium stops being flavour* · *losing your light is disabling* (see Uncertain)
- `### The other senses` (all but the two smell paras): knocking as localization, silence as information, touch/heft, taste, the aether-underground ruling
- `### The ecology as built` → *the hostile ones are CONCEALMENT content* · *the ambient ones are load-bearing* · *v1 scope — seven species* (mixed: pale crawler unbuilt; see Uncertain) · *the apex is deferred*
- `## The Ordinance mirror` · `## The automation tail` · `## The mirror & the paradox` · `## Mechanic → aesthetic` · `## The worked exemplar` → the temporal-mirror revision + *Delving 9*
- `## Materials, metallurgy & money` → the value principle (see Uncertain), extraction as a family of techniques (placer/salt/quarry), salt, gold
- `## Economics & balance` → matter/compute cycles, the danger as a sink, the mine as a Business, professions self-correct, the two executive offices (Resource Governor unbuilt), balance is policy [OPEN]
- `### Cave-ins — two tracks` (the collapse rules stand for when it lands) · `### Ground support` → *Reading the ground* (sounding the back, `measure convergence`) · *The timberman* · *What is deliberately deferred*
- `### Barren is the default` (see Uncertain) · `### The byproduct stream` · `### Operating rhythm` (see Uncertain) · `### Ore theft` · `### The solo rungs never touch the Warren` (the costean rung) · `### Two primitives` → `LiftMixin` · `### Archaeology` · `### Resolved knobs` (the called lift, hydration, life-gradient) · `## Open (residual)`

### Uncertain — kept
- `## The dangers of the deep` names *chokedamp*/*firedamp*/the *safety lamp*; the shipped vocabulary is `blackdamp`/`stinkdamp` (`BiomeLogic.ts`) and there is no flammable gas or lamp fuel at all (`PortableLight` is on/off). Kept verbatim; requirements should adopt the shipped names
- `## The deep ecology` and `#### v1 scope` say the glowcap is *cultivated by the folk for light* and *underground fungus farming is nearly free*; `mining.md § The trade/locality line` records that the word *cultivated* was removed everywhere — the fixture and jar are `PortableLight`s composing no `GrowingMixin`. Kept because the ecology section is unbuilt; flagged as contradicted
- `#### Light follows the tier` — Spine lit by fixtures ships (`glowcap-fixture` in `cage-bottom`/`timbered-drift`/`winze-head`); *Held = fixtures YOU installed and maintain* is unverified (no light-placement act found in `trade-mining`); Provisional dark holds by absence. Kept
- `#### Losing your light is disabling, not lethal` — whether `hew`/`shore` refuse in the dark was not verified (no light check found in `MiningActController`); kept
- `### Barren is the default` — the default is shipped (`Deposit.sampleAt`: *barren ground is the default and the common case*) and *negative knowledge still sells* is documented (`mining.md § Surveying`), but *informative dud* and *legible in hindsight* have no code I could point at. Kept whole
- `### Operating rhythm` — shifts ship (`coop-business.yaml` rosters 24/7) and the `delves` brain is the NPC floor; *stoppages are content, not locks* is unbuilt. Kept
- `## Materials, metallurgy & money` → *value = application × scarcity … metallurgy is a craft supply-chain, transform-only, Grade weakest-link* — the metallurgy clause was superseded by metal-chain (the smelt is composition physics) and that slate's own *What this supersedes* section is now cut. Kept inside the mixed paragraph; the ledger records the supersession here instead
- `## Economics & balance` → *the seam regeneration rate is the throttle (the "central bank of matter")* and *Eternal steel is hard-finite* contradict the finite ore body (no regeneration exists to throttle). Kept inside the unbuilt Resource-Governor design; requirements must reconcile
- `### Resolved knobs` → *vertical transit is a called lift* — unbuilt (`adit` → `cage-bottom` is a plain exit; no `LiftMixin`); *the water butt is the last safe water* — no such row found; kept as unbuilt
- The cut `### Addressing a working` claimed *the survey address IS the Locality address*; workings carry no `address` (`MineRoom.ts` has no naming code; `hanging-wood.yaml` and the road rooms are the only addressed rows in the pack). The survey-address design survives only in metal-chain § *You name what you make…*, which is kept there
- A code observation for requirements, not asserted in the doc: a **Provisional** working's `workedFaces` are forgotten with the room on `abandon` (only Held ground's depletion is durable), so the finite-body rule has a leak at the Provisional tier — hew, walk away, let it cull, re-drive, fresh ore. Recorded here; `mining.md § The body is finite` states the decision, not the leak
- Overlaps for the cluster pass: the deep-law's Moot/Barmaster ↔ metal-chain § *The commons* (the district as an `Organization`); dirt dragons/whelps ↔ rejection-slate § *Dirt dragons*; the timberman/hoist toll ↔ metal-chain § *The funding*; the costean rung ↔ metal-chain § *The trade is collective*

### Handoff (belongs in a doc outside my list)
- → `banking.md § two-tier money` (beside the CB faucet), verbatim from the cut § Materials, metallurgy & money:

  > **Money is fiat, not commodity-backed [DECIDED].** Coin is CB-issued,
  > conservation-controlled, *never a worth on a good* — deliberately **not**
  > gold-backed, because commodity-backing means *mining gold = minting money* =
  > the gold-faucet we forbade. So **gold is a commodity / store-of-value — Mammon's hoard
  > — not the currency;** you *sell* mined gold for circulated coin like any good.
  >
  > **Deflation protection = active CB monetary policy [DECIDED].** Conservation = *no
  > unauthorized faucet*, **not a fixed supply.** As mining/crafting grow real goods, the
  > **CB mints to match real output** (target stable prices — modern central
  > banking); deflation is prevented by policy, a **governance lever** (the
  > CB-governor office; see *§ Economics*).

### Status block
- Left: *everything below the water table — shaft/hoist/pump · the drainage commons + hoist toll · sulfides and roasting · collapse entrapment + the rescue clock · the deep ecology, apex and Hush cast · tribute pitches + the setting-day auction · high-grading as an offence* → *everything below the water table — shaft/hoist/pump (`LiftMixin`, the called cage) · the drainage commons + hoist toll · sulfides and roasting · collapse entrapment + the rescue clock + the timberman + sounding/convergence · the deep ecology, apex and Hush cast · tribute pitches + the setting-day auction · high-grading as an offence · the costean/test-pit rung · the town-below, the deep folk and the deep-law · the sensorium underground (knocking, taste, the lamp-as-tool) · the byproduct stream · the Ordinance / Delving 9 temporal mirror · archaeology · the automation yield-cap · the Resource Governor office + tuning* (the body wins: eight unbuilt sections were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/metal-chain-slate.md — 1354 → 744 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the stale *Captured / Status: decided design, pre-requirements* lines (12–15, 4) + the *STAGE A SHIPPED* block (23–52, 30) — history; the framing para (16–22, *this slate owns the supply chain*) is KEPT
- `## Where the chain breaks today [SHIPPED STATE]` (81–97, 17) — the shelf is gone (no `iron-ingot` under `world-seed`/`terminus`); both GAP links shipped: `vocations.md` l.119/125/137/275 now read **shipped** for miner, prospector, smelter and collier
- `## The shape: three packs, not one` (101–117, 17) — code: `packages/content/trade-mining`, `trade-fuel`, `trade-smelting` (+ `rejection`); doc: `mining.md` (the four-pack table at the top)
- `## Fuel is the trade` → *the clamp is a furnace and declines for its own reason* bullet (185–190, 6) — code: `trade-smelting/src/idea/cmd/smelting/SmeltController.ts` l.208–220; doc: `mining.md § Fuel — pyrolysis, and the clamp` (graduated)
- `## Ore is already modelled` + `### Correction — no new primitive was half right` + `### A live inaccuracy this closes` (214–274, 61) — code: `trade-mining/src/thing/Ore.ts` (`grade`, not `GradedMixin`), `base-library/…/alloy/bronze.yaml` (copper 0.88 + tin 0.12, *the fractions SUM TO ONE*), `element/tin.yaml`; doc: `mining.md § Ore, grade and the smelt`
- `## The smelt is physics` → the intro through *lean ore honestly makes a worse sword* (280–298, 19) · `### Carbon is the one number` → the intro + the bloomery/blast/steel table (301–311, 11) · *composition in, composition out … no class per metal* (325–329, 5) — code: `SmeltController.ts` (`T_REDUCE`, `meltingPointOf(carbon)`, the bloom/pig/steel regime), `src/thing/Bloom.ts` (`slagFraction`, `consolidate`); doc: `mining.md § Ore, grade and the smelt` (*the smelt's yield is chemistry*; *above copper the KIND is thermodynamics*), `crafting.md` l.833–886 (consolidation, the quench lesson, `AlloyedMixin` stock). Kept for context under the retained `### Carbon` heading: *Two consequences* with the smithing-verbs bullet (shipped) beside the flux bullet (unbuilt — see Uncertain)
- `## Prospecting: real geology over a fixed truth` → the uncertainty framing + staining/float/gossan/assay ladder (373–393, 21) — code: `MeasureStrikeController.ts` (*faint float, and a suggestion of a line*), `Deposit.surfaceReadingAt`/staining, `AnalyzeGroundController.ts` (the oxide-cap inference); doc: `mining.md § Surveying`. *Placer is parked* (395–399) KEPT
- `## The mine's geometry` → `### RETRACTED: SphericalZone` + `### The model the bible resolved` (429–465, 37) · *ore grade is a composition fraction per cell* (469–470, 2) · *the exit-naming ruling relayed to build-3* (475–479, 5) — code: `ferrow.yaml` `CartesianZone`, `Working.metresOf`; doc: `mining.md § The geology field`, `§ The governing split`. The *spoil is loose ground dirt dragons need* bullet (471–474) KEPT (unbuilt)
- `## Exit naming` → the *coordination note: build-3 has not built Stage B* (652–655, 4) — history; farming shipped `plot [<name>]` (`trade-farming/content/trade/farming/cmd/farming/plot.yaml`)
- `## The deposit is zoned` → *the country rock is authored* + *iron, if it wants a home, is the distal fringe* (1011–1019, 9) — code: `ferrow.yaml` (`stratigraphy` slate over granite; goethite/siderite bands `alongFrom: 75`), `Deposit.bandAt(z, along)`; doc: `mining.md § Zonation has TWO axes` (*iron is a WALK rather than a shaft*)
- `## The demand side` → the 2026-08-31 audit (1079–1104) + *the structural point* (1105–1110) (32) · **A. Tools** + **B. Arms and armor** (1114–1128, 15) · *on the governing rule* (1138–1141, 4) — code: `trade-mining/content/recipes/` (10: pick, pick-head, pick-haft, shovel, pinch-bar, sledge, tongs, timber-set, miners-dial, assay-kit), `trade-forestry/content/recipes/` (felling-axe, billhook), `trade-fuel` (charcoal), `trade-smelting` (5), `trade-smithing/content/recipes/` (14: sword · dagger · mace · flail · spear · warhammer · shield · mail-hauberk · breastplate · belt-knife · table-knife · cook-pot · fire-poker · smiths-hammer); doc: `crafting.md § The knowledge ladder`, `mining.md § The trade/locality line` (*the tool recipes*). The structural point is handed off below. **C. Domestic and building metal** KEPT (locks/lamps/nails unmakeable — no recipe)
- `### Recipe scope` → *the gating half was already decided* + *does the set form a ladder* + *Wave A* + *Wave B* (1147–1228, 82) — code: the recipe rosters above (18 + 14, matching the slate's counts exactly); doc: `crafting.md § The knowledge ladder, generalized (open canon, earned shorthand)`. `#### Two things ruled OUT` → *stock forms* KEPT; *any new gating — hew/drive must not acquire a deed* (1235–1239, 5) cut — code: `MiningActController.ts` l.10–16; doc: `mining.md § The acts are labour`
- `## The build's shape — what must ship together` (1243–1272, 30) — code: the four packs + `trade-mining/src/behavior/delves.ts`; doc: `mining.md § The producer beat` (graduated). Heading + note left
- `## What this supersedes` (1276–1298, 23) — history; every target is cut or superseded elsewhere in this ledger. The last bullet's *a buyer is just another Business seeded by CB lending* is itself superseded: `vocations.md` l.137 — *the smelter buys its ore out of REVENUE, which is what removed the deferred CB-lending dependency*
- `## Open` → the ten struck-through closed items (1304–1351, 48) — all marked CLOSED in the original; one-line note left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## ⭐⭐ Fuel is the trade; charcoal is a product` → the trade's shape, `### The reason fuel is structural, not merely upstream` (*charcoal is the reducing agent*), `### The one craft: pyrolysis` (123–159, 37) — code: `trade-fuel/src/thing/CharcoalPit.ts` (`FurnaceMixin`, the draught band → ash/brands/charcoal), `src/idea/cmd/fuel/CharController.ts` (a watched engagement, read at completion), `content/recipes/charcoal.yaml`, `SmeltController.ts` l.208–220 (the clamp refusal) → inserted at `mining.md` as a new `## Fuel — pyrolysis, and the clamp` (20 lines) between § Ore and § Title. `mining.md` previously said only *the coppice, the burn, the charcoal* in its pack table
- `## The ore body is finite` (403–423, 21) — code: no regeneration path in `trade-mining`; `Ore.onSplit` → inserted at `mining.md § Ore, grade and the smelt` as `### The body is finite` (15 lines; shared with the mining slate's *Seam model* close)
- `## Who owns what` → `### Open 1 was not a contradiction` (898–921, 24) — the shipped shape: code `trade-mining/src/idea/cmd/mining/HewController.ts` l.12/198/276 (*on tutwork the business keeps the ore; on your own ground, the actor*), `rejection/…/idea/coop-business.yaml` (the hewer on the roster, *on tutwork at the face*), `fringe-outfit.yaml` (`wageRate: 0`, `purchases: true`), `platform/agent/Extra.ts` l.4 → inserted at `mining.md § Title` as `### Whose ore it is` (15 lines). The three-layers table + *who owns the shaft* KEPT (the shaft is unbuilt)
- the *no deed gate on labour* decision (1235–1239, above) → folded into `mining.md § The acts are labour`

### Superseded — cut
- `### The coppice is the fuel trade's own capital` (192–200, 9) — by the code: forestry IS a fourth pack (`packages/content/trade-forestry`), the fuel yard's coppice is `/trade/forestry/thing/Panel` (`rejection/…/thing/fuel-yard-panel.yaml`), and the rotation is one game year → `forestry.md § The panel — the coppice, and it remembers being cut`. Heading + note left
- `## The mine's geometry` → `### And the difference from farming is principled` (481–491, 11) — by the code: farming's fields are NOT spherical (`trade-farming/src/location/Field.ts` has no radius/tangent packing; `soil.md` `Field` + `plot`), so the contrast is stale. Note left
- `## Exit naming in a spherical zone` → the spherical framing: *the problem as first posed*, the engine's position, `### The distinction that gives cardinals back` (573–599, 27) — by the grid (the slate's own parenthetical says the ruling survives on either substrate). The ruling itself (`### You name what you make…`, `### What distinguishes one void…`) KEPT — the derived survey address for a working is unbuilt. Note left
- `## The deposit is zoned` → `### Correction — this section originally put iron at the top` (986–1001, 16) — by the shipped zonation: `mining.md § Zonation has TWO axes` states supergene-down + magmatic-along as orthogonal facts. Note left

### Kept (UNBUILT)
- `## The governing rule` (frame) · `### What the metallurgy build left here` → the coppice/`chars`-brain bullet (see Uncertain) · `### Coal is parked`
- `### Carbon is the one number` → *Two consequences* (the flux bullet — see Uncertain)
- `## The ladder: start at copper` (whole — the bronze rung and the roast gate are unbuilt; the Cornwall correction is the why for tin-at-depth)
- `## Prospecting` → *Placer / panning is parked*
- `## The mine's geometry` → *the geometry is the mass accounting; spoil is loose ground*
- `## The trade is collective` (all: the capital ladder, private workings in a shared deposit, geometry-is-state/contribution-is-events, development/production/dead work)
- `## Exit naming` → *You name what you make; you number what you find* · *What distinguishes one void from another is geology* (the survey address)
- `## Beneficiation` (all) · `## The commons` (all — the four goods, the layer correction, the district as an `Organization`, the funding, tutwork and tribute, formed not forming, the arc)
- `## Who owns what` → the three layers, *who owns the shaft is the entire arc* + the three counters
- `## The deposit is zoned` → the Stage C needs, *tin's home*, the corrected stack, the roasting gate, the lapse, what it costs, the two rejected homes, the moor as monopoly-breaker
- `## The demand side` → **C. Domestic and building metal** · `#### Two things ruled OUT` → *stock forms*

### Uncertain — kept
- `### What the metallurgy build left here` → bullet 1 says the coppice's *yield waits on forestry's rotation compression, since `daysToStage.mature: 2500` is ≈208 real days*; `forestry.md` l.220 now says **the rotation is ONE GAME YEAR** and `vocations.md` l.124 *six smelts a panel a year*. The yield half looks resolved; the `chars` producer brain is still absent (`trade-fuel/src/` has no `behavior/`). Kept as one paragraph; requirements should re-check the rotation number
- `### Carbon` → *Flux stops being a recipe ingredient* — no `limestone` material and no flux input on `smelt` (`SmeltController` reads ore + fuel only; `gangue: quartz` on the lode and a `slag` row exist). Unbuilt; added to `Left` as *sulfides, roasting and flux*
- `## The ladder` → the copper row says the oxide cap is *gated by your eyes* (shipped) and the sulfide beneath *by roasting* (unbuilt) — the table is kept whole; the bronze row is the Stage C item
- `## The trade is collective` → *the foreman is an employment Position with a hiring right* — the co-op's `appointingAuthority` is the onsetter (`coop-business.yaml`), which is the shipped shape of this; the tramway/pump rows are unbuilt. Kept whole
- `### Who owns the shaft` → *bulk ore is decoupled (ore-pass → skip → surface tipple)* — no ore-pass or skip exists; `cage-bottom.yaml` describes one in prose only. Kept as unbuilt
- Overlaps for the cluster pass: `§ The commons` ↔ mining-slate `§ The deep-law` (Moot/Barmaster vs a district `Organization`); `§ Beneficiation` → *tailings are terrain* ↔ rejection `§ Dirt dragons`; the survey address ↔ the mining slate's cut `§ Addressing a working`

### Handoff (belongs in a doc outside my list)
- → `crafting.md § The knowledge ladder` (or beside the recipe rosters), verbatim from the cut § The demand side:

  > ### ⭐⭐ The structural point
  >
  > > **The ingot is not the only faucet. Every finished good is one too.** A
  > > metal-chain build that stops at the ingot **moves** the faucet without
  > > closing it. The recipe layer is not a follow-on — it is the half that
  > > makes this build economic rather than scenic.

### Status block
- Left: *Stage B, below the water table — shaft/hoist/pump · the drainage commons + the hoist toll · sulfides and roasting · collapse, entrapment, rescue · the deep ecology + the Hush cast · tribute pitches and setting-day · high-grading as an offence* → *Stage B, below the water table — shaft/hoist/pump · the drainage commons, the district as an Organization + the hoist toll · sulfides, roasting and flux · beneficiation (the dressing floor + tailings) · the survey address for a working · tutwork/tribute pitches and setting-day · the tin rung + the alloy regime (Stage C) · coal → coke (the arc payload) · placer + the Weeping Moor stream-tin district · domestic + building metal (locks, lamps, nails) · stock forms · the `chars` producer brain · who owns the shaft (the buyout arc)*. Dropped from this slate's `Left`: *collapse/entrapment/rescue*, *the deep ecology + the Hush cast*, *high-grading as an offence* — this body holds none of those sections; the mining and rejection slates do and their `Left` carries them
- Size: a build → a build

---

## docs/slates/builds/rejection-slate.md — 597 → 440 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the *STAGE A SHIPPED* block (22–50, 29) — history; doc: `mining.md`. The *merged design / Placement DECIDED / three jobs* framing (13–20) KEPT
- `## Placement` → *Decided 2026-08-29: the outskirts of Terminus* + *What this buys* (102–117, 16) — code: `rejection/content/world/rejection/kestrel-road/*.yaml` (the walked approach, `_address: terminus/rejection/road/…`), `hanging-wood.yaml` (`address: terminus/rejection/hanging-wood`), `location.yaml` (`cellSize: 10.0`), the pack's `requires.title` parented on `/world/rejection`; doc: `mining.md` (the pack table: `/world/rejection`), `content-packs.md` (the venue pack). *What it costs, and the fix* (119–138) KEPT — see Uncertain
- `## The venue` → the *Graduated 2026-08-31* provenance note + the git pointer to the draft room prose (397–405, 9) — the rooms are authored now (`ferrow/cage-bottom.yaml`, `timbered-drift.yaml`, `winze-head.yaml` carry full `longDescription`s)
- `### The cast` (functional roster) → *pit boss / claims registrar* (527, 1) · *the Veshko buyer* · *the onsetter* · *the pit pony* · *the canary* (530–536, 7) — code: `rejection/…/agent/registrar.yaml`, `buyer.yaml` (`archetype: ore-buyer`), `onsetter.yaml`, `trade-mining/content/trade/mining/agent/pit-pony.yaml` + `canary.yaml` (+ `reads-air.ts`); doc: `mining.md § Air`, `§ The trade/locality line`, `§ The producer beat`. *The old prospector* and *deep fauna* KEPT
- `### Objects still needing a scoping pass` → *Materials to seed: slate, quartz, oxide-copper ore, sulfides* (557–558, 2) — code: `base-library/…/rock/slate.yaml`, `mineral/quartz.yaml`, `mineral/malachite.yaml`, `mineral/chalcopyrite.yaml`; doc: `mining.md § The geology field`
- `## Open` → 1 (placement resolved) · 1b (the Hinkley/Rejection pairing — answered YES: `mining.md § Title` *the split estate falls out of the path split*, and metal-chain § *The commons*, kept) · 2 (ownership — closed, graduated to `mining.md § Whose ore it is`) · 3 (graduating the content bible — done, the file was deleted and its machinery shipped) (575–588, 14). Items 4–7 KEPT

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- the shipped **Hush** (see Superseded) → its mechanism went into `mining.md § Features, and the chamber seam` (listed under the mining slate's graduations; the code is this pack's `hush.yaml`, `hush/gallery.yaml`, `ferrow/hush-mouth.yaml`)

### Superseded — cut
- `## The merge — what this replaces` (73–97, 25) — by the shipped venue: one locality, the town Rejection and the mine the Ferrow (`pack.yaml` description, `ferrow.yaml` *the Ferrow diggings*); the *two inherited contradictions … both SETTLED* para is history. Heading + note left; the temporal mirror survives in its own section
- `### The authored spine` — the diagram, the five surface rooms, the three Upper Galleries, the four procedural types, the Hush capstone (452–520, 69) — by the `rejection` pack's rows: `location/pithead-yard.yaml` · `claims-office.yaml` · `assay-shed.yaml` · `provisioning.yaml` · `the-dry.yaml` · `adit.yaml` (+ `smelter.yaml`, `fuel-yard.yaml`, `old-workings.yaml`, `hillside.yaml`, `fringe-claim.yaml`, `far-fringe.yaml`); `ferrow/cage-bottom.yaml` · `timbered-drift.yaml` · `winze-head.yaml` (`AuthoredWorking`); `ferrow/face.yaml` · `junction.yaml` · `stope.yaml` · `fall.yaml` (`MineRoom`). ⚠ **The Hush shipped in a different shape**: a *natural chamber* — `hush.yaml` is a `SphericalZone`, `hush/gallery.yaml` a fluted cavern that *smells of nothing whatsoever*, reached from the `hush-mouth` pin — not the Wire-Deep / pre-Fallow / Ordinance-mirror capstone. Note left naming both; the pre-Fallow payload stays in `Left`

### Kept (UNBUILT)
- `## Placement` → *What it costs, and the fix* (jurisdictional isolation, Val's goal, why the city is safe) · *The highland lore mostly survives*
- `## The reframe that runs the town` (all — tiers 2–3 are unbuilt; see Uncertain) · `## The cast` (Val, Earl, Rhonda — no such rows; the pack's `Cast` rows are registrar, buyer, onsetter, collier, smelterman, storekeeper) · `## Dirt dragons` + `### The life cycle` · `## The real science is the payoff` · `## The economy` · `## The temporal mirror` · `## Worked example — Rhonda's context window` · `## The payoff`
- `## The venue` → `### The charter, and the history` · `### The cast` → the old prospector, deep fauna · `### The arcs` (mixed: the tutorial and the winze gate ship as rooms; the faultline and Hush arcs do not) · `### Objects still needing a scoping pass` (mixed: the tribute-pitch mechanism, the readable inscription, powder, the windlass are unbuilt) · `### Two bible opens that are venue calls`
- `## Open` 4–7

### Uncertain — kept
- `## Placement` → *the claim field lies outside Terminus's declared jurisdiction … an engine state*: NOT implemented as stated — every Rejection row addresses under `terminus/rejection/…`, there is no Rejection `Locality`/`Government` row, and `civics.md` l.130 has `terminus-realm` as the root jurisdiction, so the claim field is inside the realm's chain. Kept verbatim; flagged as contradicted for requirements
- `## Placement` → *The highland lore mostly survives … House Ferrow's blazon over the lintel, the Widening lapse*: the played-out oxide zone ships (`old-workings.yaml`, the `depletion` box *the old men had this ground first*) but no house-mark/blazon row exists (grep `house-mark|blazon|Widening` in the pack → only the deposit row's comment). Kept
- `## The reframe` → tier 0 and tier 1 are shipped in shape (`Cast`/`Extra` rows with `idles` brains, `delves` for the hands) but the *prose template over live state* (the storekeeper's stock line) was not found on `storekeeper.yaml`; tiers 2–3 (Batch API, live model calls) have no provider in `packages/server/src` (grep `@anthropic-ai|anthropic` → 0). Kept as unbuilt; overlaps `llm-content-slate` — cluster pass
- `### The cast` → the roster intro still says *these are the mine's own functional roster* over two surviving bullets; not rewritten
- `## Open` item 4 names `JobBoard` as not existing — it does (`platform/thing/JobBoard.ts`, the `pithead-board` row); `LiftMixin` does not. Kept as one mixed paragraph
- Overlaps for the cluster pass: dirt dragons ↔ mining-slate § *The deep ecology* (the apex); the seismic commons ↔ metal-chain § *The commons*; the governance surface ↔ metal-chain § *So the district is an Organization*

### Handoff
- none

### Status block
- Left: *everything below the water table — shaft, hoist, pump · the drainage commons + the hoist toll and district · sulfides and roasting · collapse entrapment, the rescue clock and cascade · the deep ecology, the apex and the Hush cast · tribute pitches and the setting-day auction · high-grading as an OFFENCE (needs an adjudicator)* → *… · the deep ecology, the apex (dirt dragons, whelps, firedrakes) and the pre-Fallow Hush · the speaking cast (Val, Earl, Rhonda) + the LLM tiers over the mute town · the seismic network, hazard-pay clauses and claim-price risk premia · the Veshko buyout arc (the temporal mirror) · jurisdictional isolation of the claim field · tribute pitches and the setting-day auction · high-grading as an OFFENCE (needs an adjudicator) · the on-site governance surface · the old prospector* (the body wins: the cast, the seismic economy, the arc and the jurisdiction design were unrepresented)
- Size: a build → a build

---

## docs/slates/tails/field-substrate-slate.md — 334 → 243 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the *STAGE A SHIPPED (metal chain, 2026-09-02)* block (14–32, 19) — history; doc: `mining.md § The geology field`
- `## The shape, already shipped twice` (61–82, 22) — doc: `weather.md` l.109 (`localitySeed`), `mining.md § The geology field`, `soil.md § Ground character — the third seeded field`. One pointer note left
- `## Where a field lives — three layers` + `### The seed is DERIVED FROM IDENTITY` + `### The precedence ladder` + `### The invariant that makes overrides safe` (138–197, 60) — code: `trade-mining/src/idea/Deposit.ts` (`seedFor` — *`WeatherLogic.localitySeed`'s exact rule*; `sampleAt` folds pin over lean over procedural), `trade-farming/src/idea/GroundCharacter.ts` (`seedFor`), `platform/idea/api/WeatherLogic.ts`; doc: `mining.md § The geology field` (the three layers; *no seed is stored anywhere: rename the mine and its ore moves*; *one resolved read, and no raw branch*), `weather.md § the address-derived seed`. Heading + note left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none (the geology instance's doc already carries this slate's three-layer statement; `mining.md § Features, and the chamber seam` now also records that the mine's pins are a flat record, which answers the slate's *where does the pin walk live* aside)

### Superseded — cut
- none

### Kept (UNBUILT)
- `## The inversion: rooms as subtractions` · `## Two kinds of field` · `## The rules` · `## Field or distribution?` · `## The law: the price of a sample` + `### The corollary: survey, not map` — **doctrine text with no doc home** (grep `total function|distribution … draw|price of a sample` in `uncertainty.md`, `measurement.md` → nothing); kept whole pending `Open` 1 (the user's graduate-to-doctrine call). `uncertainty.md § Seeded, not drawn` and `lib/Seeded.ts`'s docstring quote the pattern's slogan but not its rules
- `## The register` (see Uncertain) · `## Open` 1–4 (see Uncertain)

### Uncertain — kept
- `## Open` 2 — *ANSWERED: a shared SHAPE, not shared code … A `FieldApi` factoring the thirty lines would have bought nothing* is now **contradicted by the code**: `packages/server/src/mud/lib/Seeded.ts` (2026-09-14) factored `mix`/`unit` out of the four module-private copies (`WeatherLogic`, `GroundCharacter`, `Deposit`, `HeadSeed`) precisely because *if one drifts, two subsystems disagree about the same address*. Kept verbatim because the *invariant transfers, the grammar does not* half still holds; the answer needs re-writing by whoever takes `Open` 1
- `## Open` 3 — the pin walk: `stepOutwardForPin` still has exactly ONE copy (`WeatherLogic.ts:297`); `BiomeLogic` has its own `stepOutward`; `Deposit` and `GroundCharacter` use flat lookups. The `Left` entry says *now copied three times* — I count one named copy plus biome's sibling; left as written
- `## Open` 4 — partly answered: `soil.md § Ground character` states *seeded and derived compose, by multiplication* (character × reserves); the foraging-over-terrain seam the question actually names is unbuilt (`discovery-slate`). Kept
- `## The register` → *Air at depth — designed, just not called a field*: shipped in a different shape — air is a **topology** walk (`Working.airAt`: shortest carved distance to a room that breathes), not a function of `z`; the row is stale. *The water table — needed*: `Deposit.waterTable` + `waterAt(z)` ship as the oxide/sulfide boundary and a wetness gradient; the drainage-commons half is unbuilt (Stage B). *The pre-Fallow aether … the Hush is a feature seed*: the Hush shipped as an authored **pin** to a natural chamber, not a seeded feature. Kept as one table; flagged
- `## The rules` 3 cites *tin below −180 m*; the shipped Ferrow row has no tin band (Stage C). Illustrative, kept
- Overlap for the cluster pass: `discovery-slate` (the derived column)

### Handoff
- none

### Status block
- Left: unchanged — *the water table (adit boundary + oxide/sulfide, one field two systems) · foraging stock as the first DERIVED field · the seeded × derived composition seam · a home for the pin walk (`stepOutwardForPin`, now copied three times) · the pre-Fallow aether feature seed · the graduate-to-top-level-doctrine call (user's)*. Every remaining section is either doctrine awaiting that call or one of these items; nothing was unrepresented
- Size: a wave → a wave (nothing here is its own cycle; each item rides mining Stage B, discovery, or the doctrine decision)

---

## docs/slates/builds/sampling-and-labs-slate.md — 318 → 316 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the second status line `> **Status: design conversation, captured. Not requirements.**` (18–19, 2) — the one-status-block rule; the canonical block above it stands

### Graduated · Superseded
- none

### Kept (UNBUILT)
- everything else: Part 0 (the verdict), Part 1 (samplability splits the roster), Part 2 (three tiers), Part 3 (the sample object + integrity), Part 4 (the mining slate amended), Part 5 (the capital ladder + the lab as a place), Part 6 (the tedium levers), Part 7 (what it answers upstream), Open 1–7, *What this slate does NOT cover*. Grep: no `Sample` class, no provenance field, no lab room, no hand lens / streak plate / hardness kit, no assayer position, no `salting` mechanic anywhere in `packages/server/src` or `packages/content` (the `salted`/`salting` hits are cooking's `salt-cure`)

### Uncertain — kept
- `## Open` 1 (verb naming) is **answered by the shipped shape, not by a decision**: there is no `assay` verb. The field tier is `measure strike`/`dip` + `analyze ground`; the grade read is `analyze chemistry` with the assayer's kit, whose capability string is `assay-scale` (`trade-mining/content/trade/mining/thing/assay-kit.yaml`; the mining archetype's `assay` need is `{ tool: assay-scale }`). So the bench act already has its name and the field verb never claimed `assay`. Kept because the split itself (lab-bound bench instruments) is unbuilt
- `## Open` 3 (what is a sample, as an object) is half-answered by `Ore.onSplit` — a sample is a split-off `Stackable` quantity of the ore row carrying the lot's grade (`mining.md § The body is finite`); the provenance stamp is the missing half. Kept
- Part 1's *ten shipped instrument classes* is now eleven (`platform/thing/instrument/Hydrometer.ts` landed since); the status block repeats *the ten instruments*. Not rewritten — a count, not a design
- Part 3's *the assay furnace, spectrometer, etc. that don't exist yet* — the shipped `assay-kit` row describes *a small furnace with a bellows the size of a purse* in prose; it is a `ToolItem` capability, not a bench instrument. Kept
- Overlaps for the cluster pass: `instrumentation-slate` (the parent: the three gates, certification), `discovery-slate` (identification and poisoning are one act)

### Handoff
- none

### Status block
- Left: unchanged — *the sample object + its provenance field · bench instruments and the campus lab as a place · the hand-tool middle tier (lens, streak plate, hardness kit) · the certified assayer vocation · salting as a commitable fraud · sample integrity/chain-of-custody*
- Size: a build → a build

---

## The subsystem doc — `docs/subsystems/mining.md` — 487 → 618 (+131)

Seven inserts, all additive, none replacing an existing sentence:

| where | what | lines |
|---|---|---|
| `§ Three-tier room identity` → new `### Reap is per cell, and Held ground sleeps` | the cull rule (`abandon`/`reconcile`), why no seal sweep | 15 |
| `§ The geology field` → new `### Features, and the chamber seam` | pins as a flat record, seeded pockets, the Hush as its own `SphericalZone`, authored chambers only | 19 |
| `§ Surveying` → closing para | why the assay shed is a surface room (`REQUIRED_BAND_FOR_DETAIL`) | 8 |
| `§ The face model, and support` → new `### The acts are labour` | engagements paced by hardness; `drive` mints one cell (no per-heading cap; timber is the durable cap); winze climbed not walked; no deed gate | 19 |
| `§ Ore, grade and the smelt` → new `### The body is finite` | no regeneration, coppice-vs-vein, `Ore.onSplit` | 15 |
| new `## Fuel — pyrolysis, and the clamp` (before § Title) | the one craft, the draught band, charcoal as the reducing agent, the clamp's refusal, the Panel | 20 |
| `§ Title` → new `### Whose ore it is` | co-op vs independents, tutwork keeps the ore, the fringe outfit, no shaft ⇒ no throat | 15 |
| new `## The producer beat` (before § What Stage A does NOT cover) | `delves` + `reads-air`, supply not a function of concurrency, every act a player verb | 15 |

No existing statement in `mining.md` was found false by the code, so none was edited.

---

## Calibration notes for the coordinator

1. **The three Stage-A slates carried an identical 30-line "STAGE A SHIPPED" block** (mining/metal-chain/rejection) plus their original pre-build status paragraph — three status blocks each. All cut; each keeps the canonical block plus one framing paragraph with content of its own.
2. **`Left` disagreed with the body in all three big slates, in both directions.** The mining slate's `Left` omitted eight unbuilt sections (the deep folk, the sensorium, the byproduct stream, archaeology…); the metal-chain slate's `Left` claimed three items (*collapse/rescue*, *the deep ecology + Hush cast*, *high-grading*) its body does not hold at all — they were pasted from the mining slate's stamp. Fixed to the body in each case.
3. **"Shipped in a different shape" recurs six times here**: seal-and-reap → a per-cell cull; the Hush capstone → a natural chamber; the coppice-inside-fuel → its own forestry pack; the `Deposit` YAML → a trade class with different keys; the spherical exit-naming → a grid; the `SphericalZone` mine → retracted by the slate itself before the build. Each has a one-line note naming the doc section that describes what actually shipped.
4. **Two kept sections contradict shipped decisions and are flagged, not cut**: the rejection slate's *the claim field lies outside Terminus's jurisdiction* (every row addresses under `terminus/rejection/…`), and the field-substrate slate's Open 2 (*a shared shape, not shared code* — `lib/Seeded.ts` factored the arithmetic six weeks later). Both go to requirements with the flag.
5. **One graduation left a duplicate on purpose**: the fine/coarse light paragraph is now in `mining.md § Surveying` AND still in the mining slate, because its slate subsection is a mixed keep (the biological-light design around it is unbuilt). The cluster pass should cut the slate copy.
6. **A code observation the doc does not assert**: a Provisional working's depletion is forgotten with the room, so the finite-body rule leaks at that tier. Recorded under the mining slate's Uncertain for requirements; I did not put an unverified consequence into the subsystem doc.
