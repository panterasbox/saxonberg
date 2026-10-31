# Cordage — implementation plan

Executes [cordage-requirements.md](../requirements/cordage-requirements.md)
(kind: feature; lead: content — `trade-cordage` + the Wharfside ropewalk;
the kernel's part is rope as a line with two ends and a rope at an exit).
Builds rope as ONE kernel thing whose use is where its ends are tied, the
knots as joint rows, the rope tied off at a drop + the belay, rot and tar,
hemp as a farming crop, the ropework Discipline, the ropewalk and its drive.
Worktree: `build-2`, branch `reqs/cordage`, `WIRE_PORT=2013`; dev DBs are
dropped with `pnpm --filter @saxonberg/server reset:db` (no migration, ever —
rows just change class).

## Grounding

Verified by opening files on 2026-10-26 (post river merge).

**The line that exists.**
- `packages/content/trade-diving/src/thing/Lifeline.ts` — `PullableMixin(TossableMixin(Tool))`;
  persistent `kind: 'line'|'hose'`, `lengthM` (default 20); runtime `_end`
  (a minted `LineEnd`) + `_tugs`; methods `makeFast/castOff/getOnEnd/getHolder/
  tossTo→heaveTo/personWithinReach/tugBy/lastSignal/pullBy→landPull` (the
  haul: HAUL_LIMIT_KG 80, PULL_MPS 0.6, AirBag lift, `WaterPlace.deliverOut`).
  `commandContributions` environment+peers = `platform/cmd/inventory/pull.yaml`.
- `trade-diving/src/thing/LineEnd.ts` — `TetherEndMixin(Good)`; `_line` live
  ref, `_lashedTo`, `attachTo/getLine/tetheredTo/getHolder/getLashedTo/lashTo/
  followLoad/tug`; contributes `trade/diving/cmd/diving/{tug,lash}.yaml`
  (environment). `attachTo` renames itself for a hose.
- Kernel protocol mixins, all `lib/spatial/`: `Pullable.ts` (`pullBy(puller, sense)`
  → `PullOutcome` with `takes`), `Tossable.ts` (`tossTo(thrower, who)`),
  `TetherEnd.ts` (`tetheredTo()`; river W16: *"the line as a whole is cordage's
  to model"*). Registered in `lib/mixin.ts` (`TetherEnd` l.351, `Pullable` l.657,
  `Tossable` l.660) and `api/mixin.ts` (`isTetherEnd` l.1331).
- Rows: `trade-diving/content/trade/diving/thing/{lifeline,painter,hose,line-end}.yaml`
  (all `class: /trade/diving/thing/Lifeline` but line-end; jute material; lifeline
  20 m "tarred rope", painter 15 m "manila … eye spliced", hose 25 m rubber),
  `terminus/content/world/terminus/wharfside/water/thing/heaving-line.yaml` (15 m,
  in `bank.yaml` `props:`). Consumers of the rows: dive counter
  (`wharfside/diving/thing/counter.yaml`: lifeline par 2, hose par 1), the tender
  (`wharfside/diving/agent/tender.yaml` `props: [/trade/diving/thing/lifeline]`),
  `trade-diving/src/behavior/tends.ts` l.38 (`instanceof Lifeline`),
  `trade-diving/src/thing/AirPump.ts` l.57–62 (`instanceof Lifeline && kind==='hose'`),
  `trade-diving/src/idea/cmd/diving/TugController.ts` (`instanceof LineEnd`),
  `LashController.ts` (`LineEnd | AirBag` → `gear.lashTo(giver, load)`),
  Rejection's put-in `rejection/content/world/terminus/rejection/put-in/thing/counter.yaml`
  (painter par 3, price 2), `water/src/location/BankPatch.ts` l.50–66 (lining:
  `MixinApi.isTetherEnd(held)` → `tetheredTo()`), `water/src/idea/ReachWarren.ts`
  l.1213 `lineBoatTo`. Wire: `packages/wire/tests/{river-b,underwater}.dirty.wire.test.ts`.
- Diving's tests: `trade-diving/src/__tests__/{Lifeline,AirPump,Bell,Gear}.test.ts`.
- `AirBag.ts` l.72 `lashTo(by, load)`; contributes `trade/diving/cmd/diving/lash.yaml`.

**Verbs nearby.**
- `cut`: `platform/content/platform/cmd/crafting/cut.yaml` (target greedy object,
  tools declared, options for/tight/generous) → `platform/idea/cmd/crafting/CutController.ts`
  (dumb; asks `Cuttable.cutPlan(req)` then `CutPlanner.cutPlanFor`; `lib/craft/Cuttable.ts`
  defines `CutRequest{actor,tools,raw,options}` / `CutPlan` / `CutRefusal`). No length arg.
- `splice`: `energy/content/system/energy/cmd/energy/splice.yaml` + `energy/src/idea/cmd/energy/SpliceController.ts`
  (`LineAccess.isCut()/splice()`), afforded by `LineAccess.ts` (environment+peers `LINE_VERBS`).
- `dip`: `trade-chandlery/content/trade/chandlery/cmd/chandlery/dip.yaml` (`verbs: [dip, melt]`,
  args `solid` then `pot`) → `DipController.ts` (CraftController, recipe `candle`
  + `melt-wax`; `model.solid` l.83–100); afforded only by `trade-chandlery/src/thing/DipPot.ts`
  (environment+peers). Row `dip-pot.yaml` (`category: dip-pot`, `interiorBulk`, 2 L).
- `climb`: `platform/cmd/movement/climb.yaml` → `ClimbController.ts`; `lib/locomotion/Climbable.ts`
  (`axes`, `difficulty`, `canEngageAxis`, `canBeEngagedBy`), `Enablement.ts` (the contract),
  `platform/idea/api/LocomotionLogic.ts` `findEnablementHost` l.608 (**the actor's container
  and its contents only**), `engageHost` l.555 (capability then encumbrance veto),
  `checkEnablementScope` l.535 (returns a `TraversalGuard`, host not carried).
  `platform/thing/Ladder.ts` composes `ClimbableMixin(Good)` and affords `climb` (environment+peers).
  Exit media→mode table `lib/boundary/Exit.ts` l.218 (`vertical: 'climb'`).
  `lib/spatial/Mobile.ts` traverse order l.400–460 (gates → `beforeTraverse` → `engageAround`
  → move l.531 → hooks `onExited/onEntered/onTraversed` l.1061–1066).
- `throw`/`pull`: `platform/cmd/inventory/{throw,pull}.yaml` (recipient string `to`; pull `requires: any`).
- `tug`/`lash`: `trade/diving/cmd/diving/{tug,lash}.yaml`.
- `sell`: `platform/cmd/retail/sell.yaml` (a line with `buys: true`; `lib/retail/Stock.ts`
  `StockLine.buys` l.104, `bidFor(itemTemplatePath)` l.282 — **per row, not per instance**).
- `competence`: `platform/cmd/charactergen/competence.yaml` (bands by Discipline).
- `lint:verb-collisions` (`packages/server/scripts/check-verb-collisions.ts`): two views
  may not claim one word; allowlist is a to-do, not an amnesty.

**Falls.** `lib/hazard/Hazard.ts` `applyDrop` l.524: `ContainmentApi.move(mover, below)` +
`ConditionApi.inflict(mover, { mechanism: 'blunt', site, energy })` with `site =
this.delivery.resolveSite(mover)` (`lib/hazard/HazardDelivery.ts` l.141, `HazardDelivery.from`
l.202) and energy from dial `hazard.dropFallEnergy` (fallback 4). The Sunken Delve:
`newbie-wilds/content/world/newbie-wilds/delve/corridor-2.yaml` (props `/stuff/thing/traps/spike-pit`,
`down` exit `concealment: hidden` → `pit-below`), `pit-below.yaml` (`up` plain exit, "a rough
scramble"; props lime-seep). `generic-objects/.../traps/spike-pit.yaml` (`trigger: traversal`,
one-shot, point energy 3 to torso/feet). No post, ring or bollard at the lip.

**Joints.** `platform/idea/Joint.ts` (`key/label/portability/instrument/competence/reversible/
strength/structuralRecovery/fastenerRecovery/tightenable/needsFlat/failure`; closed
`JOINT_FAILURES = slack|sprung|parted|split`), `JointCatalogue.ts` (warms by class, lazy,
`warmed(key)`/`peek(key)`). Twelve rows (`platform/idea/Joint/*.yaml`, coopering, tailoring
`stitched`, carpentry `pegged`); no knot.

**Fiber chain.** `trade-textiles`: `cmd/textiles/{spin,scutch}.yaml`; `ScutchController.ts`
mints `LINE_ROW=/trade/textiles/thing/line`, `TOW_ROW`, `SHIVE_ROW` with grade carried but
**no material carry** (l.195–215: clone, `setQuantity`, `setGrade`, move — the hemp straw would
scutch into *flax line* of linen); refuses unless material `hasTag('fibre')` (l.13); `SpinController.ts`
carries the input material (`carryFibre` l.229, module-local) and sets `yarnCount`; `TextileStock.ts`
= `StackableMixin(CraftedMixin(Good))` + `yarnCount`. Rows `thing/{line,tow,yarn,retting-pit,
scutching-board,spinning-wheel,bowstring}.yaml`; `idea/maturation/retting.yaml`
(`inputCategory: retting`, `productMaterial: …/textile/linen`; `MaturationProfile.forMaterial`
l.761 matches by tag, two matches = authoring error, lowest key wins); `idea/Discipline/textiles.yaml`
(under the pack root). Farming: `trade-farming/content/stuff/idea/species/plantae/…/linaceae/linum/
usitatissimum.yaml` (`_parentCladePath: /stuff/idea/species/plantae` — no family/genus rows needed),
`trade/farming/thing/{seed,plant,crop}/flax*.yaml` (plant profile; sheaf = `GradedReceptacle` of
`interiorMaterial: /trade/farming/idea/material/flax-straw`, tags `fibre-stock, retting`).
Materials: `base-library/content/stuff/idea/material/textile/{linen,jute,canvas,…}.yaml`
(`hardness`/`toughness` MPa / MJ·m⁻³; linen 5/3, jute 6/2); no hemp anywhere
(`grep hemp` hits only canvas prose and a malt sack). Pitch/wood-tar:
`trade-fuel/content/stuff/idea/material/bulk/{pitch,wood-tar}.yaml` (no `tags`).
No plant `variety` field exists (`Plant.ts`/`Species.ts`): a variety IS a second plant row on one species.

**Wet.** `lib/wetness/Wet.ts` `WetMixin` (`getWetness/getWetnessBand/wet(delta)/soakUp/
reconcileWetness/dryingHours`); wetted by `WeatherLogic.ts` l.1357 (rain on occupants) and
`WaterPlace.ts` l.855/939 (`mover.wet(1)` / things in the water); `Tangible.getMass` reads it.

**Load.** `lib/encumbrance/LoadBearing.ts` `getBorneBurden()` l.314, `getStrainCeiling()` l.428,
`getLoadRatio()` l.436.

**Engagements.** `lib/activity/Engaged.ts` (`EngagementSlot = body|hands|attention|voice`),
`lib/vitals/TendingEngagement.ts` (a `SustainedEngagement` on `attention` with `onStart/onAbort/
getHost`, started with `SchedulerApi.start`).

**Advancement.** `lib/advancement/Advancement.ts` `creditSignature(signature, opts)` l.468,
`creditDeed` l.499, `competenceBandFor(discipline)` l.536; Discipline rows
`platform/content/platform/idea/Discipline/*.yaml` (diving, swimming… 40 of them; textiles ships
its own under `/trade/textiles`). Fields `key/channel/label/iscedf/description/requires/
specializes/synergizes/conferrals`.

**Readings.** `lib/instrument/Reading.ts` — a Reading ROW's class answers three `@hook` rungs
(trained eye l.466, instrument l.484, bench l.502); `analyze`/`measure` are flat over rows any pack
ships (`trade-mining/src/idea/reading/DipReading.ts` precedent).

**Places.** `lib/location/Location.ts` `extent` (persistent, authorable l.84; `setExtent`
positive meters; `getLinearExtent()` falls back to the zone's `cellSize`); rows author it
(`hearts-delight/…/creamery/location/floor.yaml: extent: 5`, `newbie-wilds/…/longmeadow.yaml: 12`).
Wharfside: `terminus/content/world/terminus/wharfside.yaml` (CartesianZone; header: *"the
proto-industrial west bank are the city track's"*), `wharfside/bank.yaml` (`Quay`; exits
north/west→`valley-road/towpath`/south/east/aboard/tinkers/northwest/southeast/southwest/down/
river/basin/divers/lavoir — every compass point taken), `valley-road/towpath.yaml` (exits east→bank,
west→…). Venue pattern: `wharfside/diving.yaml` (sub-zone) + `diving/location/shop.yaml` (Locale,
`enclosure`/`roof`, props counter, cast) + `diving/idea/outfit.yaml` (Business: positions with
`fulfills`, rosterSlots station+schedule, `banksAt: goodkin`, `offstage`, `operatingLocations`
incl. the counter path) + `diving/thing/counter.yaml` (`/trade/shopkeeping/thing/Stock`:
`serverPositionKeys`, `businessPath`, `stockLines` par, `prices`) + `diving/agent/*.yaml`
(Cast, `extends: /stuff/agent/costume/student`, `competence:`, `props:`, `behaviors:`).
Titles: `terminus/pack.yaml` `requires.title` one parcel per district (`/world/terminus/wharfside/
chandlery` etc.); `boot:` only for houses whose NPCs act unobserved.

**Packs.** A pack imports the kernel by `@saxonberg/server/mud/...` and another pack typed by
`@saxonberg/content-<pack>/src/...` (e.g. `trade-ice/src/idea/cmd/ice/ScrapeController.ts` →
`@saxonberg/content-water/src/thing/IceSheet`; `trade-apiculture` → ranching's `src/lib/Handled`),
declared in the pack's `package.json` `dependencies` (`trade-diving/package.json`). `pack.yaml`
carries `id/root/description/requires{groups,title}/boot`. Server `exports` map
`packages/server/package.json` l.7–16 (`lib/*`, `api/*`, `platform/{thing,idea,agent,location}/*`;
`platform/idea/api/*` and hooks null).

**Wire.** `packages/wire/tests/<flow>[.dirty].wire.test.ts`; harness `packages/wire/src/harness/
index.ts` exports `Session, uniqueHandle, plain, declareFile({file, packs, dirtyReason}),
expectOk/expectRefused/expectNote, advanceWorldClock, worldClockNow, installedPacks`; a dirty file
exports `DIRTY_REASON` (`docs/testing.md` l.894). `river-b.dirty.wire.test.ts` is the shape to copy
(`outfitted()` funds via `reserve override` as `founder`; `morning()` moves the season).

**Quantities.** `lib/quantity.ts` unit union has `'m' | 'km' | 'cm' | 'mm'` (l.56).
**Stacks.** `lib/stuff/Stackable.ts` `getQuantity/setQuantity/canMergeWith/canSplit/absorb`.
**Lint roster** (`pnpm -C packages/server lint:family --list`) — see § Convention conformance.

## Plan-level decisions

Limb that chose in brackets: L1 pedagogy · L2 expression · L3 immersion/participation ·
L6 economy · C = CLAUDE.md convention · P = nearest shipped pattern.

- **D1 — Rope is the kernel's.** Composers (diving, water/transport via the painter, cordage,
  the kernel's own `climb`) have no common pack ancestor [C: *substrate goes to the kernel when its
  composers have no common pack ancestor*; river W16]. Three kernel classes: abstract
  `lib/spatial/Line.ts` (= `PullableMixin(TossableMixin(Good))`: `lengthM`, the two ends, heave/
  tug/pull — `Lifeline.ts` moved verbatim, `kind` dropped, `static END_ROW` + `@hook endWords()`),
  instanceable `platform/thing/Rope.ts` (extends `Line` + Climbable/Wet/Tieable/Spliceable/Dippable;
  fiber, diameter, strength, knots, chafe, rot, tar, marks, coil) and `platform/thing/LineEnd.ts`
  (= `TieableMixin(TetherEndMixin(Good))`, row `/platform/thing/line-end`) with
  `platform/thing/RopeEnd.ts` (= `ClimbableMixin(LineEnd)`, row `/platform/thing/rope-end`) — the
  rope's end, minted by `Rope`; the hose keeps minting a plain `LineEnd` [host test: Climbable on
  every line's end would need a hose guard → the rope's end is its own class].
- **D2 — The hose is `trade-diving/src/thing/Hose.ts extends Line`** (row `hose.yaml` →
  `class: /trade/diving/thing/Hose`). `Lifeline.ts`, `LineEnd.ts`, `line-end.yaml` are deleted.
  `AirPump.ts` tests `instanceof Hose`; `tends.ts` finds `instanceof Rope` (kernel import).
- **D3 — Rows re-class, no migration.** `lifeline.yaml` and `heaving-line.yaml` → `class:
  /platform/thing/Rope` (hemp, tarred, 20 m / 15 m, `diameterMm: 14`), and ⭐ **so does
  `painter.yaml`, in place** (15 m hemp, `splicedEye: true`, coiled — the owner's call 2026-10-26:
  re-class it like the other two, no move, no new `rejection` dependency). All three keep their
  paths (the tender's `props:`, the dive counter, the put-in counter and `bank.yaml` are
  unchanged). DBs are dropped.
- **D4 — Length, mass, cut.** `lengthM` + `diameterMm` persistent; mass DERIVED
  (`getMass()` override on `Rope`: `λ = ρ·φ·π(d/2)²` with packing `φ = 0.6`, × `lengthM`, × 1.15
  tarred; `Tangible` wetness still applies). `cut`: `Rope` implements `Cuttable.cutPlan`; the
  kernel `cut.yaml` gains a trailing positional `length` (string, greedy; target loses `greedy`,
  multi-word targets quote) and `CutRequest.length: string | null`; the rope parses `10`, `10 m`,
  `10 meters`. Two ropes whose lengths sum; marks, fiber, diameter, tar, rot, chafe copy to both;
  knots stay with the end they were on. **No merge** — `canMergeWith` is not composed; the join is
  `splice` [requirements]. If the binder cannot bind a trailing string after a non-greedy object,
  fall back to `options: length` (`cut rope --length 10`) and say so in the drive record.
- **D5 — `twist`, one verb, the stage from the input** [L1]. `twist <stock…> [--yarns n]
  [--length m] [--mark <color>] [on <jack>]` in `trade-cordage`. Yarn (any `TextileStock` with
  `yarnCount > 0`) → a **strand** (a `Rope` row `/trade/cordage/thing/strand`, `stage: strand`);
  strands (≥ 3 `Rope`s with `stage: strand`) → **rope** (`/trade/cordage/thing/rope`, `stage:
  rope`). Numbers: yarn tex = 1653.5 / count (the linen lea); strand λ = n·tex·1.1 g/m; rope λ =
  Σ strand λ × 1.15; `d = 2·√(λ / (π·ρ·φ))`; yarn length per skein = count × 274 m × mass_lb.
  Length = `--length` else min(walk, what the yarn allows); **refused when `--length` > the walk**:
  *"The walk is 300 m long; a rope cannot be laid longer than it."* The walk = the room the jack
  stands in, `getLinearExtent()`. The alternating lay is told in the look, never chosen.
- **D6 — Strength derived, fiber from the material** [L1]. `breakingKg = tenacityMPa × π(d/2)²
  / 9.81`, `tenacityMPa = material.toughness × dial cordage.tenacityMPaPerToughness (25)` —
  hemp (toughness 4) 100 MPa > flax (3) 75 > jute (2) 50; 12 mm hemp ≈ 1.1 t, 6 mm ≈ 280 kg.
  Effective = breaking × min over joints(factor × dressing) × (1 − chafe) × (1 − rot). Read in
  words by bands (a child / a man / a man and his load / a horse / an ox and more).
- **D7 — Knots are platform Joint rows** `/platform/idea/Joint/{bowline,clove-hitch,sheet-bend,
  reef-knot,splice}.yaml` (`portability: hand`, `competence: null`, `strength` = the share kept
  .6/.6/.5/.45/.9, `reversible: freely` ×4 / `never` for the splice, `failure`: `JOINT_FAILURES`
  gains `spilled` and `slipped`) [P: `friction`/`glued`; they ship with the kernel because the kernel
  verb `tie` needs them]. The TRIGGER is the rope's, keyed on the row key (a closed five):
  reef **spills** when the climber's borne burden ≥ dial `cordage.unevenLoadKg` (10); clove hitch
  **slips** on a shock (a caught fall or a jerk); no roll. **Dressing** = the tier's `ropework`
  band at tie-time: novice .8 · competent .9 · proficient/master 1.0, stored on the knot record
  [L1 + AC11]. A green hand's bowline keeps .48, a practised .6, every time.
- **D8 — `tie`/`lash`/`untie` are kernel verbs** over a kernel protocol mixin
  `lib/spatial/Tieable.ts` (`tieTo(by, load, knotKey) / untieBy(by)` → `TieOutcome`) [C: verbs live
  with what affords them; the rope is kernel; collision rung 1 unify]. Views
  `platform/cmd/inventory/tie.yaml` (`verbs: [tie, lash]`, args `gear` inventory, `load` reachable
  `to`, option `with <knot>`) + `untie.yaml`; dumb controllers. Implementers: `Rope` (its FIXED end,
  to a fixture → anchor; to a person → `makeFast`), `LineEnd` (its free end, today's `lashTo`),
  diving's `AirBag` (today's `lashTo`). Diving's `lash.yaml` + `LashController.ts` are deleted;
  `tug.yaml` + `TugController.ts` move to `platform/cmd/inventory/` (the end that affords it is
  kernel now). Knot default: bowline; `with reef knot` etc. by row label.
- **D9 — `splice` unified**: kernel `platform/cmd/crafting/splice.yaml` + `SpliceController`
  over `lib/spatial/Spliceable.ts` (`spliceBy(by, other: Stuff | null)`); energy's view +
  controller deleted, `LineAccess` composes it (`other === null` → repair). Rope: `splice <a> to <b>`
  (same stage, in reach) → one rope, lengths sum, a `splice` joint on the record (.9), marks union
  (*"a splice shows both"*). A splice is cut out, never untied.
- **D10 — `coil`**: kernel `platform/cmd/inventory/coil.yaml`; `coiled` persistent, cleared by
  cut/tie/untie/splice; `tossTo` refuses an uncoiled rope over 5 m (*"coil it first"*); the look
  reads coiled/flaked. Engaged step `lengthM / 2` s.
- **D11 — The rope at a drop, both rooms, through the shipped walk** [L2]. `tie rope to <fixture>`
  in a room with a `down` exit admitting `vertical` hangs the rope: the `RopeEnd` is moved into that
  exit's destination (`anchorPath` + `hungVia` persistent, reconciled on load). `Rope.getAxes()` =
  `['down']` while hung, `RopeEnd.getAxes()` = `['up']` (delegating to its rope) — `findEnablementHost`
  finds each in its own room, unchanged. Both contribute `platform/cmd/movement/climb.yaml`
  (environment+peers) like `Ladder`. **Kernel seam:** `Enablement` gains optional
  `@hook afterEnabledTraverse(actor, direction, exit)`; `checkEnablementScope` returns the host on the
  ok-guard (`TraversalGuard` ok variant gains `host?`), and `Mobile.traverse` calls it after
  `onTraversed`. Rope's hook: chafe `+= dial cordage.chafePerUse (0.06) × load/strength`; derive
  hold: `load = climber.getMass() + getBorneBurden()` vs effective strength → part; reef trigger →
  spill; else the look reads *scuffed at the lip · fraying · a few yarns parted · about to go*
  [AC6]. A **part** splits the rope (the stub stays tied, the rest falls to the bottom room); a
  **spill** drops the whole rope below. The **fall** = `Hazard.applyDrop`'s two lines, on the rope:
  move the climber to the bottom room (the end's room) if they are not there, `ConditionApi.inflict`
  blunt at `hazard.dropFallEnergy` with `HazardDelivery.from({channel:'blunt', energy}).resolveSite`.
  Minimum hang length dial `cordage.minHangM` (3). A fixture = any non-agent `Containable` here;
  anchors never fail (deferred).
- **D12 — The belay is a kernel engagement** `lib/locomotion/BelayEngagement.ts`
  (`SustainedEngagement`, slots `hands`+`attention`, host = the belayer) + view
  `platform/cmd/movement/belay.yaml` (`belay <person>` / `belay off`) [placement: the rope affords it
  and the rope is kernel — a kernel class cannot name a pack view; ⚠ differs from the requirements'
  "trade-cordage: … the belay"]. Preconditions: the belayer holds a rope whose free end is fast to
  the person (`tie rope to <person>` → `makeFast`), both within one room of each other. The hold:
  `turns = fixture in the belayer's room ? 3 : 1`; `holdKg = min(ropeEffective, strainCeiling ×
  e^(0.3·2π·turns))` told in words (*round the post three times — it would hold a horse*). On a fall
  the rope asks `BelayEngagement.catches(climber, shockKg)` where `shockKg = (mass + burden) ×
  dial cordage.fallFactor (3)`: caught → the climber is set down in the belayer's room unhurt
  (*the rope comes up taut; you hang, and are hauled in*); the clove hitch slips on that shock;
  else the fall [AC7]. Ends by `belay off`, by walking away (abort), by the rope being cast off.
- **D13 — Rot and tar.** Rope composes `WetMixin`; `rot` + `rotAt` persistent, reconciled on
  every strength read: `+ dial cordage.rotPerWetDay (0.03) × wetness` per elapsed game day while
  `!tarred` [P: reconcile-on-read].
  ⚠ **Re-check against sugar's `Kinetics` (merged 2026-10-27, `lib/material/Kinetics.ts` +
  `Kinetic.ts`)** before writing a bespoke clock: it is the kernel's one mechanism for *what a
  substance does by itself over time, read in words* (staling, inversion, freshness's family), as
  `kinetics:` on the MATERIAL row. Rot is that shape with a **wetness** driver beside temperature.
  ⭐ Prefer making rope rot its next consumer (a `rot` change on the fiber materials, the rate gated
  by the good's wetness and stopped by `tarred`) — extending Kinetics with a moisture term if it has
  none — over a rope-only `rot`/`rotAt`. Record which, and why, in the plan. Tarring = `dip <rope> in <pot>` through a kernel protocol mixin
  `lib/craft/Dippable.ts` (`dipInto(by, pot)`): `DipController` first asks a `Dippable` solid and
  returns, else the candle path (≈ 8 lines); the rope checks the pot's slot material `hasTag('tar')`
  (`pitch.yaml` + `wood-tar.yaml` gain `tags: [tar]`) → `tarred: true`, darker, heavier [AC8].
  The ropewalk's tar pot is a chandlery `DipPot` row with pitch in it (phase ignored, like the
  dip-pot's "kept hot" — recorded).
- **D14 — Hemp is farming's, one species, the variety is the plant row** [L2]. Species
  `…/magnoliopsida/rosales/cannabaceae/cannabis/sativa.yaml`; `plant/hemp.yaml` (the fiber variety:
  taller, `daysToStage {14,45,110}`, `nutrientDraw: 12`), `seed/hemp.yaml`, `crop/hemp-sheaf.yaml`,
  `idea/material/hemp-straw.yaml` (tags `fibre-stock, retting-hemp` — NOT `retting`, so the two
  profiles never both match). Base-library `textile/hemp.yaml` (hardness 6, toughness 4, tags as
  jute's). Textiles: `idea/maturation/retting-hemp.yaml` (`inputCategory: retting-hemp`,
  `productMaterial: …/textile/hemp`); `ScutchController.finish` carries the slot's material onto
  line/tow through a new `TextileStock.adoptFibre(material)` (spin's `carryFibre` folded into the
  class and reused). Smoking adds `plant/cannabis.yaml` on the same species later.
- **D15 — The rogue's yarn** = `marks: string[]` persistent, laid at the strand stage (`--mark
  red`), copied by cut, unioned by splice. Hidden from `look`'s long description while both ends are
  whipped/spliced; a CUT end shows it (`look` of a cut rope: *"a red yarn in the heart at the cut
  end"*); the close look is **`analyze rope`** over a cordage Reading row
  `/trade/cordage/idea/reading/lay.yaml` + `src/idea/reading/LayReading.ts` (trained-eye rung: fiber,
  lay, diameter, the strength bracket by band, the marks) [P: instrumentation; no `look --close`].
- **D16 — `ropework` Discipline ships with the platform**
  (`/platform/idea/Discipline/ropework.yaml`, `channel: skill`, `requires: [recipe-knowledge]`,
  `synergizes: [textiles, diving]`, `conferrals: []`) because the kernel verbs credit it
  (`creditSignature({discipline:['ropework']})` on tie/splice/twist; the `ActSignature` shape per
  `lib/advancement/ActSignature.ts`) and `lint:openings` demands a shipped row for a `fulfills`.
- **D17 — The ropewalk** at `/world/terminus/wharfside/ropewalk/` reached from
  `valley-road/towpath.yaml` by a new `ropewalk` exit (every compass point off the bank is taken;
  the towpath runs west along the bank): zone `wharfside/ropewalk.yaml` + `location/walk.yaml`
  (Locale, `extent: 300`, enclosure/roof), `agent/ropekeeper.yaml` (Cast, ropework proficient),
  `idea/outfit.yaml` (Business, position `keeper` `fulfills: [ropework]`, station the walk, `banksAt:
  goodkin`), `thing/counter.yaml` (Stock: hemp-line par 6, hemp-yarn par 6, rope coil par 2 with
  `buys: true`, `/trade/diving/thing/painter` par 2), `thing/tar-pot.yaml` (chandlery `DipPot`, pitch), the jack placed in
  `props:`. Title parcel in `terminus/pack.yaml` (industrial, off-grid). **Sold by the meter**
  (the owner, 2026-10-26: *coils are fine*):
  coils of authored length (50 m) priced ×50; **buy-back by length and soundness** through one
  kernel seam — `@hook Good.worthFactor(): number` (default 1; `Rope` = `lengthM / 50 × (1 − chafe)
  × (1 − rot)`), read by `SellController` on the bid [L6; `bidFor` is per row today].
- **D18 — `trade-cordage` pack** (`/trade/cordage`, title `/compact/trade`): `src/thing/RopeJack.ts`
  (`Tool`, capability `ropelaying`, affords `twist`), `src/idea/cmd/cordage/TwistController.ts`,
  `src/idea/reading/LayReading.ts`; rows `thing/{jack,strand,rope,hemp-line,hemp-yarn}.yaml`,
  `cmd/cordage/twist.yaml`, `idea/cmd/cordage/TwistController.yaml`, `idea/reading/lay.yaml`.
  Depends on `trade-textiles` (yarn typed), `trade-chandlery` (the pot row's class), server, platform.
- **D19 — The drive is `packages/wire/tests/cordage.dirty.wire.test.ts`** (buys, cuts, springs the
  pit, ties ropes that stay, moves the clock — none of it reproduced).

## ⭐⭐ Host placement

| new thing | host | what composing it claims |
|---|---|---|
| `Line` (abstract, `lib/spatial/`) — `lengthM`, two ends, heave/tug/pull | base of `Rope` and `Hose` only | nothing else is a line; `Pullable`/`Tossable` stay protocol mixins on it |
| `Rope` (`platform/thing/`) — fiber via material, `diameterMm`, `stage`, `tarred`, `chafe`, `rot/rotAt`, `marks`, `coiled`, `anchorPath/hungVia`, knot records | the one rope class; rows in diving, cordage, terminus | every rope can be climbed when hung, wets, is tied, spliced, dipped, cut — all true of rope and of nothing the hose needs |
| `LineEnd` / `RopeEnd` (`platform/thing/`) | the hose's end / the rope's end | Climbable lives on `RopeEnd` only — a hose end is never a way up |
| `TieableMixin` (`lib/spatial/`) | `Rope`, `LineEnd`, diving `AirBag` | a thing whose end is made fast to a load; no state, each host answers |
| `SpliceableMixin` (`lib/spatial/`) | `Rope`, energy `LineAccess` | one `splice`; the thing decides |
| `DippableMixin` (`lib/craft/`) | `Rope` | a thing CHANGED by a dip (the candle is MADE by one and stays the recipe path) |
| `Enablement.afterEnabledTraverse` (optional hook) | `ClimbableMixin` default no-op; `Rope`/`RopeEnd` override | ladders and cliffs keep ignoring it |
| `BelayEngagement` (`lib/locomotion/`) | the belayer (`Engaged`) | an engagement, not a field on anybody |
| `Good.worthFactor()` hook | `Good` default 1; `Rope` overrides | a per-instance scale on a house's bid; no other good changes |
| knot Joint rows, `ropework` Discipline | platform rows | the kernel verbs can name them; `competence: null` on the knots |
| hemp species/plant/seed/sheaf/straw | `trade-farming` rows | one species, the plant row is the variety |
| `textile/hemp` material | `base-library` (commons, beside linen/jute) | — |
| `retting-hemp` profile; `TextileStock.adoptFibre` | `trade-textiles` | scutch/spin carry any fiber; flax unchanged |
| `RopeJack`, `TwistController`, `LayReading`, strand/rope/hemp-line/hemp-yarn rows | `trade-cordage` | a second ropewalk is rows (the jack row + a walk) |
| the lip post | `newbie-wilds` row `delve/thing/lip-post.yaml` (`/platform/thing/Thing`, `fixedInPlace`) in `corridor-2` `props:` | — |

No guard re-narrows a host set: the only `kind` switch (`line|hose`) is gone with D1/D2.

## Convention conformance (checked at plan time)

- `props:`/`cast:` on places (`corridor-2`, `shop.yaml`, `bank.yaml`) — the ropewalk uses them.
- Locale/Location — `walk.yaml` is a `/platform/location/Locale` (interior; no `PersistentLocation`:
  nobody furnishes it).
- Paths: kernel rows `/platform/<branch>/…`, cordage `/trade/cordage/<branch>/…`, commons material
  `/stuff/idea/material/textile/hemp`, venue `/world/terminus/wharfside/ropewalk/…`; controllers at
  `<root>/idea/cmd/<category>/<Name>Controller`, views at `<root>/cmd/<category>/<verb>`.
- Module scope declares; no `onCreate`; no new catalogue (knots ride `JointCatalogue`, the reading
  `ReadingCatalogue`, the profile `MaturationProfile.all()`).
- Import boundary: packs import kernel by `@saxonberg/server/mud/...`, textiles by
  `@saxonberg/content-trade-textiles/src/thing/TextileStock` (declared in `package.json`).
  `rejection` and `terminus` gain `@saxonberg/content-trade-cordage`.
- Verbs on objects: no new Api, no logic singleton, no free helper; every act is a method on the
  rope/end/bag/line-access; controllers are dumb.
- Mixin names: `Tieable`, `Spliceable`, `Dippable` added to `Mixins` + `MixinApi.isX`
  (`lint:mixin-names`); the pack ships none.
- American English in all new prose and identifiers (`fiber`, `meter`, `color`); shipped tag strings
  (`fibre`, `fibre-stock`) are data and stay.
- No new Mongo collection, no migration, no `isWizard`.
- Gates this build must pass (run as `pnpm -C packages/server lint:family`): `instanceable` (no
  `/lib/` rows; Rope in `platform/thing`), `imports`, `module-scope`, `mixin-names`, `mass` (every
  new thing row carries `_materialPath`), `verb-collisions` (lash/tug/splice move, never double-claim),
  `self-contributions`, `instrument-args` (`twist` declares `jack`; `tie` declares nothing it hunts),
  `shopfronts` (counter `businessPath` ↔ Business `operatingLocations` incl. the counter), `openings`
  (keeper seat stations the walk; `banksAt`; `fulfills: [ropework]` keys a shipped row), `untitled`
  (the ropewalk parcel), `reachability` (every row placed: props/stock/mint), `template-scans`,
  `world-scan`, `object-verbs`, `lib-statics`, `on-create`, `presentation`, `placement-words`,
  `unconsumed-seams` (every new `@hook` has an overrider), `test-bootstrap`.

## Waves

Each wave: `pnpm test:near` + the touched packs' `pnpm test` + `lint:family` green, one commit,
push. The full suite only at code-complete and at `/finalize` (`tools/suite`).

### ⭐⭐ Ordering — wait for CERAMICS before W1 (the owner, 2026-10-28)

✅ **Ceramics merged 2026-10-30 and is merged into this branch** (`aa64c2181`). The four items
below were re-grounded the same day; **the amendments that follow them supersede D7, D13 and D17
where they disagree.** `/build` may start.

What ceramics brings, and what each changes here:

1. ⭐ **Faces and coats + `dip` promoted to the kernel** (`lib/material/Faced.ts`,
   `lib/craft/DipPlanner.ts`, `platform/cmd/crafting/dip.yaml` with `melt` as its alias,
   `platform/idea/cmd/crafting/DipController.ts`; the bath plans the dip and a bath whose material
   `laysCoat` lays a coat). ⇒ **Re-plan D13 onto it before writing it**: tarring is pitch laying a
   coat on the rope's face; a rope whose face carries a tar coat does not rot. The kernel
   `Dippable` protocol and the 8-line branch in the chandlery's `DipController` are DROPPED (that
   controller's role moves to the kernel). Record the re-plan as a D13 amendment.
2. **Pitch and tar moved** to `base-library` (`stuff/idea/material/bulk/{pitch,wood-tar,coal-tar}.yaml`).
   Re-point every path this plan cites; whether they still need `tags: [tar]` falls out of item 1
   (a coat names its material).
3. **Two new Joint rows**, `dry-laid` and `slip` (label *"slipped"*). D7's clove-hitch failure word
   `slipped` would read the same as the slip joint's label in one vocabulary — pick a failure word
   that does not (e.g. `slid`), or confirm the two never meet in one sentence, against the merged
   `JOINT_FAILURES` list.
4. **Retail's `Stock` refactor** (`Stock.counterFor`, which stall sells a line). D17's
   `Good.worthFactor()` buy-back seam lands in the same code — build it against the merged `Stock`.

#### Re-grounded after ceramics (2026-10-30) — amendments

- **D13′ — tarring is a coat.** `dip <rope> in <tar tub>` through the kernel `dip`
  (`platform/cmd/crafting/dip.yaml`, `DipController`, the bath plans: `lib/craft/DipBath.ts`). The
  tar tub is a **`/platform/thing/GlazeTub`** row (the coat-laying bath — the brickfield's
  `ash-glaze-tub.yaml` is the pattern) holding pitch; the chandlery's `DipPot` plans a CANDLE and is
  the wrong bath. `base-library/.../bulk/pitch.yaml` (and `wood-tar.yaml`) gain `laysCoat: true` and a
  tag named for what they DO — `waterproofing` — not `tar`. The coat lands on the rope's `outside`
  face (`lib/material/Faced.ts`; Faced composes on every good, so `Rope` has faces already).
  ⚠ Faced FUSES a coat by heat (the glaze's `kinetics` reference); pitch instead SETS as it cools
  below its 320 K melting point — check Faced's set path for a coat with no fuse and extend it by
  one rung if needed (record). Rot is stopped while the outside face's outermost coat is set and its
  material has `waterproofing`. **Dropped:** the kernel `Dippable` protocol, the chandlery
  `DipController` branch (that file is gone — the controller is the kernel's), the `DipPot` tar-pot
  row, `tags: [tar]`, and `Rope.tarred` as stored state (it is read off the face). The rope reads
  darker and heavier with the coat's mass.
- **D7′ — failure words.** `JOINT_FAILURES` (`platform/idea/Joint.ts:42`) is still
  `slack · sprung · parted · split`; ceramics' new `slip` joint is labeled *"slipped"*. The clove
  hitch working loose under a jerk is the shipped **`slack`** — no new word; the reef knot adds
  only **`spilled`**.
- **D17′ — buy-back.** `Stock.bidFor(itemTemplatePath)` is still per row (`lib/retail/Stock.ts:340`,
  read at l.592 and l.673 after ceramics' `counterFor` refactor), so the `Good.worthFactor()` seam
  stands, applied where those two callers take the bid.
- **Paths:** pitch, wood tar and coal tar are `packages/content/base-library/content/stuff/idea/material/bulk/`.
- Also from ceramics: `dip` has `melt` as its alias; `ring` moved from diving to
  `platform/cmd/perception/ring.yaml` (W0's diving retrofit leaves it alone). Diving's `lash.yaml` and
  `tug.yaml` are still the pack's — W0 moves them as planned.

#### Sibling builds in flight at 2026-10-30 — check before the waves they touch

- **The soak harness (build-4, `build/soak-harness`).** When it lands: ⛔ a blocking wire drive may
  not jump the clock more than ONE game day (`TestHarnessApi.advanceClock` refuses before moving
  anything); a span belongs in a `<feature>.soak[.dirty].wire.test.ts` run by `pnpm wire:soak`.
  ⇒ **W6 splits the drive**: steps 1–13, 15–17, 19 (+7a) stay in the blocking
  `cordage.dirty.wire.test.ts`; **step 14 (rot over days) and step 18 (hemp's season)** go to
  `cordage.soak.dirty.wire.test.ts`. Wet the ropes with **`pinWeather('rain', …)`** (the harness's
  staging route; in-world `testharness weather pin rain`) instead of walking them to the Delight ford —
  the ford fallback stands only if the harness has not landed. ⇒ **W7's timing step** in the potash
  drive must also stay under a day per jump, or go to a potash soak file; check how the soak build
  left the potash drive's own jumps (`advanceWorldClock(duration)`, `potash.dirty.wire.test.ts`
  l.290). If the harness has NOT landed when W6 runs, write the drive as planned and note the split
  as owed.
- **Field population (build-1, `reqs/cover`, MR !480).** A field crop becomes a population over
  authored patches; it rewrites the wheat and barley `plant/` and `seed/` rows, adds `patch.yaml`,
  and moves `plant` to a platform view. Flax is untouched. ⇒ **W4: if !480 has merged, author hemp in
  the shape wheat now has** (the field-crop rows and patches), not flax's older one; if not, copy
  flax and let whichever lands second reconcile. Re-ground D14 against whichever is on master.

### W0 — rope is the kernel's line with two ends (D1, D2, D3, D8 part, D19 prep) ✅
> **Done.** `Line` (lib/spatial) moved from `Lifeline`; `Rope`/`LineEnd`/`RopeEnd` kernel; `Tieable`
> protocol; kernel `tie`(`lash`)/`untie`/`tug`; diving `Hose`; rows re-classed in place. **Decided:**
> **D20** — the haul's air-bag lift asks the kernel `Buoy` protocol (new `@hook liftKg(depthM)`, AirBag
> overrides) so the kernel line never names diving's `AirBag`. **D21** — the tender's `tends` brain finds
> any `Line`, not only a `Rope`, so a hard-hat diver's tender still hauls the hose. `tie` takes the knot
> as a `with` preposition arg, not an option. The wire re-runs of `underwater`/`river-b` are folded
> into the W6 drive boot (one world, not three).
Files: new `lib/spatial/Line.ts` (from `Lifeline.ts`), `lib/spatial/Tieable.ts`,
`platform/thing/{Rope,LineEnd,RopeEnd}.ts` (Rope minimal: fiber/diameter/length, strength read,
`tieTo` to a person = `makeFast`, `tieTo` to a fixture = anchor record, `untieBy`), rows
`platform/content/platform/thing/{line-end,rope-end}.yaml`, views `platform/cmd/inventory/{tie,untie,
tug}.yaml` + controllers `platform/idea/cmd/inventory/{Tie,Untie,Tug}Controller.ts` (+ their
`.yaml` controller rows under `platform/idea/cmd/inventory/`); `lib/mixin.ts`, `api/mixin.ts`.
Diving: delete `Lifeline.ts`, `LineEnd.ts`, `line-end.yaml`, `cmd/diving/{tug,lash}.yaml`,
`idea/cmd/diving/{Tug,Lash}Controller.ts`; add `src/thing/Hose.ts`; `hose.yaml` class;
`lifeline.yaml` → Rope (hemp, 20 m, 14 mm, tarred); `painter.yaml` → Rope in place (15 m, spliced eye; the river's lining and `river-b.dirty` must stay green); `AirBag.ts` composes Tieable
(`tieTo` = old `lashTo`), contributes `platform/cmd/inventory/tie.yaml`; `AirPump.ts`, `tends.ts`,
tests (`Lifeline.test.ts` → kernel `lib/spatial/__tests__/Line.test.ts` + `trade-diving/src/__tests__/
Hose.test.ts`). Terminus `heaving-line.yaml` → Rope. Base-library `textile/hemp.yaml`.
Acceptance: `Line.test.ts` green (heave, tug signals, pull/landPull, makeFast/castOff); diving suite
green; `pnpm wire` runs `underwater.dirty` and `river-b.dirty` green (throw line / pull line / tug /
lash → `tie` still answer on a `Rope`); `lint:family` green.
Commit: `build(cordage W0): rope is the kernel's line with two ends; the hose is diving's`.

### W1 — a rope is a length with a strength (D4, D6, D7, D9, D10, D13, D15 part) ✅
> **Done.** Rope: derived mass, `breakingKg`/`effectiveKg`, knot records dressed by `ropework`
> band (credited), `cutPlan`/`spliceBy`/`coilPlan`, marks + cut ends, rot reconcile, tar off the face.
> Kernel `Spliceable` + `splice` (energy's pole answers it), `coil`, `cut … at <length>`. **Decided:**
> **D22** — the cut length rides a preposition (`cut rope at 10 m`), not a trailing positional: the
> binder allows only prepositional args after a greedy target (`validateArgOrder`); `at` left the tool
> prepositions (no caller used it). **D13″** — rot keeps its own reconcile (`rot`/`rotAt`), NOT Kinetics:
> Kinetics has no moisture driver and is integrated by `ThermalMixin` over a temperature trajectory;
> rot's driver is wetness (window mean of before/after drying). Extending Kinetics with a second
> driver is a kernel design → deferred seam. **D23** — Faced gains one rung, `coolCoats(atK)`: a wet coat
> whose material has no heat-set law and melts above `atK` sets as it cools (pitch, 320 K). Pitch
> and wood tar author `laysCoat: true`, `coatWord: tarred`, tag `waterproofing`; the lifeline row
> authors a set pitch coat. **D24** — knot strength is captured on the knot record at tie-time (no
> cold-catalogue read on every strength read). A plain `/platform/thing/rope` row is what a cut
> piece of an unrowed rope is minted as. Rope rows author no `mass:` (derived).
Files: `platform/thing/Rope.ts` (mass derivation, `cutPlan`, `spliceBy`, `coil`, knot records +
dressing, `effectiveKg()`, words, `marks`, `rot` reconcile + `WetMixin`, `dipInto`), `lib/craft/
Cuttable.ts` (`CutRequest.length`), `cut.yaml` (+ `length`), `CutController.ts` (passes it),
`lib/spatial/Spliceable.ts`, `lib/craft/Dippable.ts`, views `platform/cmd/crafting/splice.yaml`,
`platform/cmd/inventory/coil.yaml` + controllers; `platform/idea/Joint.ts` (`spilled`, `slipped`),
`JointCatalogue.ts` (validation), rows `platform/idea/Joint/{bowline,clove-hitch,sheet-bend,
reef-knot,splice}.yaml`, `platform/idea/Discipline/ropework.yaml`; energy: delete `splice.yaml` +
`SpliceController.ts`, `LineAccess.ts` composes Spliceable and contributes the kernel view;
chandlery `DipController.ts` (Dippable branch); trade-fuel `pitch.yaml`/`wood-tar.yaml` tags.
Tests: `platform/thing/__tests__/Rope.test.ts` — d² strength, fiber order hemp>flax>jute, cut sums
and copies marks, no merge, splice .9 + marks union, knot factors × dressing, reef/clove triggers
(unit, via the rope's `loadCheck`), rot grows wet-untarred only, tar stops it, coil gates the toss;
energy tests still green; chandlery test still green.
Acceptance: all of the above + `lint:family`; `help tie`, `help splice`, `help coil` resolve.
Commit: `build(cordage W1): length, strength, knots, cut and splice, rot and tar`.

### W2 — the rope at a drop and the belay (D11, D12) ✅
> **Done.** `Enablement.afterEnabledTraverse` (default no-op on Climbable/Swimmable/Flyable);
> `TraversalGuard.host` rides the ok guard (`engageHost` → `canTraverseExit` past haulage) and
> `Mobile.traverse` calls the hook inside the engagement after `crossExit`. Rope hangs on a tie
> round a fixture beside a `down` exit with `vertical` media (≥ `cordage.minHangM`): the
> `RopeEnd` is minted into the bottom room; `Rope` axes `['down']`, `RopeEnd` `['up']` (fixed in place
> while hung). `takeClimb`: reef spill (burden ≥ dial) → whole rope down; load > effective → part
> (1 m stub stays, the rest falls); else chafe. The fall asks the climber's belays first, then
> moves them to the bottom + blunt at `hazard.dropFallEnergy`. `BelayEngagement` (hands+attention)
> links itself on the rope; capstan `e^(0.3·2π·turns)` with a fixed thing in the belayer's room;
> a clove hitch round the climber is not held. Delve: `lip-post` prop; corridor-2 `down`
> `media: [vertical]`; pit-below `up` `[ground, vertical]`. **Decided:** **D25** — the belay rope is a
> declared arg (`belay <person> with <rope>`, default `reachable:[mixin.TieableMixin]`) per
> `lint:instrument-args`. **Known limit:** the hung end is runtime — after a restart the rope is
> still the way down but the end (the way up) is not re-minted until it is untied and re-tied.
Files: `lib/locomotion/Enablement.ts` (+ optional hook), `Climbable.ts` (default no-op),
`lib/boundary/Exit.ts` (`TraversalGuard` ok `host?`), `platform/idea/api/LocomotionLogic.ts`
(`checkEnablementScope` returns the host), `lib/spatial/Mobile.ts` (call after `onTraversed`),
`Rope.ts`/`RopeEnd.ts` (hang on tie, `getAxes`, chafe/part/spill, the fall, climb affordance),
`lib/locomotion/BelayEngagement.ts`, `platform/cmd/movement/belay.yaml` + `BelayController.ts`;
newbie-wilds `delve/thing/lip-post.yaml`, `corridor-2.yaml` (`props:` + post; `down: media:
[vertical]`), `pit-below.yaml` (`up: media: [ground, vertical]` — the scramble never strands).
Tests: `Rope.climb.test.ts` — tied + hung → axes both rooms; chafe per use; part → climber in the
bottom room with a blunt wound; reef spills loaded; belayed fall caught (climber in belayer's room,
no wound), unbelayed dropped; clove hitch slips on the catch; `LocomotionLogic` test that the hook
fires once per enabled traverse and never for a walk.
Acceptance: tests + `lint:family`; `pnpm wire` `reachability`/`platform-smoke` still green.
Commit: `build(cordage W2): the rope at a drop climbs both ways, chafes, parts; the belay`.

### W3 — `trade-cordage`: twist, the lay reading, the Discipline moves (D5, D15, D16, D18) ✅
> **Done.** Pack scaffold (root package.json + pnpm-lock; discover count 71). `RopeJack`
> (Tool, `ropelaying`, affords `twist`) plans the twist: yarn (a `TextileStock` with a count) → a
> strand (`n·tex·1.1`), ≥ 3 strands → a rope (Σ × 1.15), `d = 2√(λ/πρφ)`, never longer than the walk
> (the jack's room's `getLinearExtent`); `--mark` lays the rogue's yarn. `LayReading` is
> `analyze lay <rope>` (plan said `analyze rope`: a reading names its CHANNEL first). Rows: jack,
> strand, rope (50 m coil), hemp line, hemp yarn (count 6), rigging knife, `lay` reading. **Decided:**
> **D26** — the pack's rows are placed by W5 (the counter/props), so `lint:reachability` is run once at
> W5 for W3–W5 together rather than red at W3. Kernel `Rope.addMark`/`hasCutEnd`/`holdsWordsNew` added
> (a pack never writes a rope's fields).
Files: `packages/content/trade-cordage/{pack.yaml,package.json,tsconfig.json,vitest.config.ts}`
(copy `trade-chandlery`'s), `src/thing/RopeJack.ts`, `src/idea/cmd/cordage/TwistController.ts`,
`src/idea/reading/LayReading.ts`, rows under `content/trade/cordage/`: `thing/{jack,strand,rope,
hemp-line,hemp-yarn}.yaml`, `cmd/cordage/twist.yaml`, `idea/cmd/cordage/TwistController.yaml`,
`idea/reading/lay.yaml`; `Rope.ts` credits `ropework` on tie/splice; `TwistController` credits it.
Register the pack wherever shipped packs are listed (`SAXONBERG_PACKS`
default / `docs/subsystems/content-packs.md` table — builder greps `trade-chandlery` for every
registration site).
Tests: `trade-cordage/src/__tests__/twist.test.ts` — yarn → strand → rope stages; `--yarns` →
thicker → stronger; the walk cap refusal names the length; `--mark` laid, `analyze rope` reports it,
`look` does not until cut; hemp line twists like bought line.
Acceptance: pack suite + `lint:family` (`verb-collisions` clean: `twist` is new, `lay` untouched).
Commit: `build(cordage W3): trade-cordage — twist at the walk, the lay read, the walk lays rope`.

### W4 — hemp on the farm, through the pit and the board (D14)
Files: `trade-farming/content/stuff/idea/species/…/rosales/cannabaceae/cannabis/sativa.yaml`,
`trade/farming/thing/{seed,plant,crop}/hemp*.yaml`, `trade/farming/idea/material/hemp-straw.yaml`;
`trade-textiles/content/trade/textiles/idea/maturation/retting-hemp.yaml`,
`src/thing/TextileStock.ts` (`adoptFibre`), `src/idea/cmd/textiles/{Scutch,Spin}Controller.ts`;
the seed on whichever counter sells flax seed (`grep -rl 'seed/flax' packages/content/*/content`).
Tests: farming rows census (one species, the plant row names it); textiles — scutched hemp straw
mints hemp line + tow (material hemp, words "hemp"), flax still linen; `retting-hemp` matches hemp
straw only.
Acceptance: farming + textiles suites, `lint:family` (`perishable`/`mass` on the new rows).
Commit: `build(cordage W4): hemp — one plant, the fiber variety; the pit and the board take it`.

### W5 — the Wharfside ropewalk (D17)
Files: `terminus/content/world/terminus/wharfside/ropewalk.yaml`, `ropewalk/location/walk.yaml`
(+ `offstage.yaml`), `ropewalk/agent/ropekeeper.yaml`, `ropewalk/idea/outfit.yaml`,
`ropewalk/thing/{counter,tar-pot}.yaml`, `valley-road/towpath.yaml` (exit), `terminus/pack.yaml`
(parcel; no `boot:` — the keeper acts only when somebody is there), `terminus/package.json`
(cordage, chandlery); kernel `lib/stuff/Good.ts` (`worthFactor` hook), `platform/idea/cmd/retail/
SellController.ts` (reads it), `Rope.worthFactor`.
Tests: terminus census (the rows resolve; `lint:openings`/`shopfronts`/`untitled` are the test);
`SellController` unit: a 10 m cut sells for a fifth of the coil.
Acceptance: `lint:family`; a boot of the world with `SAXONBERG_PACKS` incl. `trade-cordage` stands
the walk up (`pnpm dev:server` once, `look` from the towpath, PID-killed after).
Commit: `build(cordage W5): the Wharfside ropewalk — the walk, its keeper, its counter`.

### W6 — the drive, the docs
Files: `packages/wire/tests/cordage.dirty.wire.test.ts`; `docs/subsystems/cordage.md` (new: rope,
knots, the rope at a drop, the belay, rot/tar, the ropewalk, the numbers and dials); updates to
`underwater.md` (the lifeline is a rope; `tug`/`lash` moved), `river.md` (the painter is a rope),
`textiles.md` (hemp, `adoptFibre`), `assembly.md` (knots as joints, the two failure words),
`locomotion.md` (`afterEnabledTraverse`, the belay), `hazard.md` (the rope's fall reuses `drop`),
`energy.md`/`crafting.md` (`splice`/`cut` now kernel protocols), `content-packs.md` (pack table row),
`farming`/`smallholding.md` (hemp). `CLAUDE.md` map line left to the sweep. The drive record goes
at the end of this plan.
Acceptance: the drive passes 19 + 7a; the full suite (`tools/suite`) at code-complete; MR opens READY.
Commit: `build(cordage W6): the drive and the docs`.

### W7 — carried: potash-on-sugar's remainder (the owner, 2026-10-28: *roll it into cordage*)

Sugar's build landed the mandatory half (`bc60d11a5`: lye's own `solidsKgPerL`, one dissolved-solids
fold, the pot casting at saturation off the plateau). Two items are left, both in
[potash.md](../subsystems/potash.md) § *Still open*, and this build's drive world is the one that
proves them:

1. **Ash percolates.** `/trade/fuel/thing/Ash` composes kernel `PercolatingMixin`
   (`lib/material/Percolating.ts`, sugar D3, whose header names the hopper as its second consumer).
   Water or lye poured into the hopper is put on its heaps (`receivePercolant`, the hopper sharing
   the litres by heap mass); each heap's `onPercolated(from, to)` gives up `alkali × (to − from)`
   into the hopper's liquor (the same hardness waste and `ContentsTitle` rule `Hopper.leach` applies
   today), and at reach 1 the heap is spent ash where it sits. `percolatesInto()` must answer the
   hopper for a heap IN it (today it answers a mould's drain or a placement host — extend the kernel
   rule by one rung: the holder when the holder is bulk-bearing, or override on `Ash`; record which).
   `Hopper.matchProfile` stops destroying ash; `spend()`/`spending` go; the `lye-leach` maturation
   profile is kept or retired by what the percolation leaves it to do (record which). The second
   pass (lye poured back through fresh ash) keeps working. `percolationDays()` on Ash: half a game
   day, today's leach time, so the drive's waits hold.
2. **The equal-potash timing checkpoint** in `packages/wire/tests/potash.dirty.wire.test.ts`: the
   weak lye that gives the same potash as the strong one takes MORE boiling hours, not only more wood
   (potash AC 5's time half, true under the fire's power limit since sugar W1a).
3. `docs/subsystems/thermal.md` § *Note — the potash build*: the pot no longer keeps its own count
   (it reads the plateau and casts at saturation); `potash.md` § *Still open* closes.

Acceptance: trade-chandlery, trade-fuel, trade-potash vitest green; the potash drive at its recorded
12/13 (step 11 remains the glass's) plus the new timing step; a heap in a hopper reads as spent ash
only once the water is through it. Commit: `build(cordage W7): potash-on-sugar's remainder — ash
percolates, the boil's time half`.

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| tie / lash / untie | `platform/cmd/inventory/{tie,untie}.yaml` | `Rope`, `LineEnd`, `AirBag` statics (environment+peers) | knot Joint rows (platform) | `JointCatalogue` warms lazily by class | `gear` scope inventory `requires: any`; `load` reachable, `to`, `greedy`; `with` option string |
| tug | `platform/cmd/inventory/tug.yaml` | `LineEnd` static (environment) | — | — | `line` inventory |
| cut a length | kernel `cut.yaml` (+ `length`) | already everyone's | — | — | target non-greedy; `length` greedy string last |
| splice | `platform/cmd/crafting/splice.yaml` | `Rope` + `LineAccess` statics | — | — | `target` reachable `requires: any`; `other` `to` optional |
| coil | `platform/cmd/inventory/coil.yaml` | `Rope` static | — | — | inventory/reachable |
| dip (tar) | chandlery `dip.yaml` (unchanged) | `DipPot` (the tar pot IS one) | pitch/tar `tags: [tar]` | — | `solid` first positional; the rope answers `Dippable` |
| climb on the rope | `platform/cmd/movement/climb.yaml` | `Rope` + `RopeEnd` statics | exits with `vertical` media | — | `target` = the exit |
| belay | `platform/cmd/movement/belay.yaml` | `Rope` static (environment+peers) | — | — | `person` reachable `requires: OrganismMixin`; `off` word |
| twist | `trade/cordage/cmd/cordage/twist.yaml` | `RopeJack` static (environment+peers) | strand/rope rows, hemp-line/yarn rows | the pack in `SAXONBERG_PACKS` | `stock` objects inventory `requires: any`; `jack` default `reachable:[capability.ropelaying]` |
| analyze rope (lay) | platform `analyze` | — | `/trade/cordage/idea/reading/lay.yaml` | `ReadingCatalogue` warm | the reading's subject predicate = `instanceof Rope` |
| ropework competence | `competence` | — | `/platform/idea/Discipline/ropework.yaml` | Discipline catalog | — |
| hemp crop | `sow`/`harvest`/the pit/`scutch`/`spin` | existing | species/plant/seed/sheaf/straw rows; `retting-hemp` profile; seed on a counter | — | material tags `fibre-stock` → `retting-hemp` → `fibre` |
| the ropewalk | — | towpath exit | zone + walk + outfit + counter + keeper + jack + tar pot; parcel | none (not booted) | — |
| the Delve post | — | `corridor-2` `props:` | `lip-post.yaml` | — | — |

⚠ Each link fails closed and silent: the builder greps `[dispatch]` in `.wire/server.log` for
`unknown-verb` / `no-such-command-shape` at every step of the drive.

## Acceptance-criteria coverage

| AC | wave |
|---|---|
| 1 rope from bought hemp line / from grown hemp | W3 / W4 + W5 |
| 2 reads fiber, length, strength; thicker is stronger | W1, W3 |
| 3 no rope longer than the walk, refusal says why | W3 |
| 4 cut, coil, splice, tie, untie | W0, W1 |
| 5 five knots per row; reef spills under uneven load | W1, W2 |
| 6 climbable both ways; chafes; frays before parting; parts/spills drop | W2 |
| 7 belayed caught, unbelayed falls | W2 |
| 8 wet untarred weakens; tarred does not | W1 (drive W6) |
| 9 lifeline / heaving line / painter are rope; shipped acts work; hose stays a hose | W0 |
| 10 rogue's yarn hidden/shown/carried | W1, W3 |
| 11 competence moves; practised knots hold more, every time | W1, W3 |

## Test & gate strategy

Unit: `Line.test.ts`, `Rope.test.ts`, `Rope.climb.test.ts`, `LocomotionLogic` hook test,
`twist.test.ts`, textiles hemp carry, farming hemp census, `SellController` worth, energy +
chandlery + diving suites unchanged-green. Only the drive proves: the binder shapes (`cut rope 10
m`, `tie rope to post with bowline`, `belay <person>`), the affordances, the pit, the keeper, the
clock (rot), the season (hemp), and the words on the card. Gates: `lint:family` every wave;
`pnpm test` twice (code-complete alongside review; `/finalize`). Wire: `WIRE_PORT=2013 pnpm wire
cordage` (and `underwater`, `river-b` after W0).

## Risks & opens

- **`cut rope 10 m` binding** (D4): a non-greedy object followed by a greedy string positional is
  the plan; if the binder refuses it, the `--length` option is the fallback and the drive says so.
- **`Mobile.traverse` carrying the enablement host** (D11): the guard flows through
  `LocomotionApi.canTraverseExit` → `Mobile.traverse`; read `Mobile.ts` l.400–560 before touching it.
  The hook must fire for climb only (modes with an `enablementMixin`).
- **The Delve** (W2/W6): entering `corridor-2` springs the spike pit on the first traversal (torso
  3-energy point wound). The drive springs it with a `founder` session first; the delve may be dark
  (buy `wand-of-glowlight` at the dive counter); `corridor-2`'s `down` is `hidden` — the drive
  `search`es before `climb down`. Pit-below's `up` keeps `ground` so a fall never strands.
- **Wetting for AC8** (W6): drop both ropes into a wadeable water place (the Delight ford,
  `/world/terminus/delight-road/ford`) — `WaterPlace.ts` l.939 wets things in it; confirm it
  re-wets on each tick or that `reconcileWetness` does not dry a submerged rope; then
  `advanceWorldClock('5 days')` and `look` from the ford.
- **Readings** (D15): confirm in `instrumentation.md` how a Reading row names its subject before
  writing `LayReading`; fallback is a `details:`-style derived detail on the rope (`look rope lay`).
- **`Stock.bidFor` is per row** (D17): the `worthFactor` seam is small but kernel; the sweep may
  want it on `Good` as `@hook` with an `unconsumed-seams` overrider (the rope).
- **The Discipline and the belay are kernel, not cordage** (D12, D16) — a placement the
  requirements worded otherwise; the reason is the import rule (a kernel class cannot name a pack
  view) and `lint:openings`. If the owner wants the belay in the pack, the rope would have to be
  afforded by a cordage fixture, which contradicts "your own body".
- **Sugar's merge (2026-10-27)** also brought `get X from Y` (the drive may use it) and a
  persistence fix: a field named like a method is captured by its predicate — name Rope's
  persistent fields (`coiled`, `tarred`, …) so they do not shadow `isCoiled()`/`isTarred()`.
- Anchors never fail; drop depth vs rope length is a dial, not geometry; the tar pot's pitch is
  assumed liquid; `fibre` tag spelling stays.

## Deferred seams

- Anchor strength (a ring in rotten mortar) → `cordage-slate` §4.
- Shock-load elasticity (nylon's stretch) and wire rope → `plastics-slate`, `cannery-and-bottling-slate`.
- Who answers for a parted rope → `accountability.md` / `cordage-slate` §7 (the rope's knot
  record already names the tier by identity path).
- Block and tackle, capstan, windlass → `machines-slate`.
- Oakum, binding a person → `prison-slate`.
- The ropewalk's own spinning (a wheel on the walk) → rows later; `spin` already works there.
- A second water for wetting (the lavoir trough) → cleanliness.

## Critical files

`docs/requirements/cordage-requirements.md` · `docs/subsystems/{underwater,river,locomotion,
hazard,assembly,textiles,instrumentation,retail,employment,content-packs,testing}.md` ·
`packages/content/trade-diving/src/thing/{Lifeline,LineEnd,AirBag,AirPump}.ts` ·
`packages/server/src/mud/lib/spatial/{Pullable,Tossable,TetherEnd,Mobile}.ts` ·
`lib/locomotion/{Climbable,Enablement}.ts` · `platform/idea/api/LocomotionLogic.ts` ·
`lib/boundary/Exit.ts` · `lib/hazard/{Hazard,HazardDelivery}.ts` · `lib/craft/Cuttable.ts` ·
`platform/idea/cmd/crafting/{Cut,ManualBuild}Controller.ts` · `platform/idea/{Joint,JointCatalogue}.ts`
· `lib/wetness/Wet.ts` · `lib/encumbrance/LoadBearing.ts` · `lib/activity/Engaged.ts` ·
`lib/vitals/TendingEngagement.ts` · `lib/advancement/{Advancement,ActSignature}.ts` ·
`lib/instrument/Reading.ts` · `lib/retail/Stock.ts` · `platform/idea/cmd/retail/SellController.ts` ·
`packages/content/trade-textiles/src/{thing/TextileStock,idea/cmd/textiles/Scutch,Spin}*.ts` ·
`packages/content/trade-chandlery/src/{thing/DipPot,idea/cmd/chandlery/DipController}.ts` ·
`packages/content/energy/src/{thing/LineAccess,idea/cmd/energy/SpliceController}.ts` ·
`packages/content/terminus/content/world/terminus/wharfside/{bank,diving}.yaml` + `diving/**` ·
`packages/content/newbie-wilds/content/world/newbie-wilds/delve/{corridor-2,pit-below}.yaml` ·
`packages/wire/tests/river-b.dirty.wire.test.ts` · `packages/wire/src/harness/index.ts`.

## Drive record

*(appended at build time)*
