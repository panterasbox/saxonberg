# Slate-compaction pass — fire batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list:
`docs/subsystems/fire.md` only. Line numbers below are the ORIGINAL
slate file's. Code evidence grepped 2026-09-20 against
`packages/server/src/mud/**` and `packages/content/**`; nothing was
classified on the slate's own status-block claims.

Batch-wide evidence used repeatedly: `lib/fire/{Combustible,Burning,
Furnace}.ts`, `lib/thermal/Meltable.ts`, `lib/material/Material.ts`
(the six new `Quantity` props — confirmed present with field
marshallers + tests), `platform/idea/api/FireLogic.ts` (spread tick,
oxygen leg, smoke/CO, `heatContents`/`restampHeated`), `api/fire.ts`
(`FireApi`), `packages/content/hearthworks/**` (the demonstrator zone),
`platform/idea/cmd/device/{ignite,douse}.yaml`,
`platform/idea/api/CraftingLogic.ts` + `platform/idea/cmd/crafting/
{HeatController,BoilController}.ts` (the `reachableHeatK`/
`requiresHeatK` seam — **consumed**, not inert) — and recipe rows in
`trade-smelting`, `trade-smithing` (implied via mining/forestry
recipes), `trade-mining`, `trade-forestry`, `trade-cooking`/
`trade-baking`, all keying `requiresHeatK`. No hits anywhere for
`arson`, `fire brigade`/`FireBrigade`, `insurance` (fire-specific), a
glassmaking pack, `LEL`/`UEL`/flammability limit, cross-room smoke
drift, or a vision-obscuring smoke read — confirmed unbuilt. `fire.md`
itself already carries D1–D9 as explicit surface decisions with code
citations, so the slate's entire design body (everything except the
"fire service" tail) restates decisions the doc already states, in
more words and with no code citations.

---

## docs/slates/builds/fire-combustion-slate.md — 547 → 128 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Intro framing (`the next frontier-physics build…`, `Fire is the
  marquee element…`, `Scope posture: build the whole system in one
  go`) (lines 13–40, ~28 lines) — the decision to build combustion as
  one maximal build is realized; doc: `fire.md` header paragraph
  ("Built for its own sake — the electricity → mundane-`conduct`
  precedent…").
- `## What is already shipped (do NOT rebuild)` (lines 42–77, 36
  lines) — pre-existing Thermal/harm/materials-response/wetness/bulk/
  respiration/light/electricity substrate this build was going to
  consume; code: `lib/thermal/Thermal.ts`, `ConditionApi.inflict`,
  `WetMixin`, `EnergizedMixin`; doc: `fire.md` §§ 1–5 name every one of
  these as the substrate each layer reads.
- `## The honest core — the fire triangle` + Andy-Weir pillars 1 & 2 +
  the measurement/inquiry surface (lines 78–150, 73 lines) — the
  ignition-energy-balance design (thermal inertia + water latent heat)
  and the stoichiometry → complete/incomplete → smoke/CO design; code:
  `lib/fire/Combustible.ts` (`tryAutoignite`, wetness-adjusted
  threshold), `platform/idea/api/FireLogic.ts` (oxygen leg, `air`
  Reserve, smoke/CO fill); doc: `fire.md` § 3 "Ignition is a derivable
  energy balance (D3)" and § 4 "The oxygen leg + complete/incomplete
  (D5)".
- `## The spine decision (for requirements)` (lines 152–180, 29 lines)
  — `Combustible`/`Burning`/gated driver/spread-via-contact-and-open-
  boundaries decisions; code: `lib/fire/Combustible.ts`,
  `lib/fire/Burning.ts`, `api/fire.ts`; doc: `fire.md` § 3 "The
  combustion driver" + § 4 "Spread (D1/D6)".
- `## The Material additions (real, tabulated)` (lines 182–206, 25
  lines) — the six `Quantity` props; code: `lib/material/Material.ts`
  lines 353–420 (verified: `autoignitionTemperature`,
  `heatOfCombustion`, `meltingPoint`, `latentHeatOfFusion`,
  `boilingPoint`, `latentHeatOfVaporization`, all with field
  marshallers + `Material.test.ts` assertions); doc: `fire.md` § 1.
- `## The high-heat materials physics — what crafting will stand on`
  (lines 208–255, 48 lines) — phase change / furnace family / inert
  heat-seam design; code: `lib/thermal/Meltable.ts`, `lib/fire/
  Furnace.ts`, `Thermal.ts:202,458` (`reachableHeatK`); doc: `fire.md`
  § 5 "Phase change + the furnace family" + "The crafting seam (D9) —
  consumed".
- `## Scope — build the whole system (everything but the recipes)`
  incl. the 4-phase breakdown + demonstrators (lines 257–295, 39
  lines) — realized; code: `packages/content/hearthworks/**`
  (woodshed / sealed cellar / smithy — matches "a burning woodshed", "a
  sealed-room CO death", "a working forge" verbatim); doc: `fire.md` §
  "Content".
- `## Couplings, and the cut` table (lines 296–317, 22 lines) — every
  "yes" row is realized (see above); the "stretch"/"deferred"/"named,
  not built" rows are bare names with no elaboration beyond what
  `fire.md § Deferred` already carries at equal fidelity (electricity
  Joule→fire, burning-DoT, wildfire/arson/brigade) — see *Cut (bare
  name, equal fidelity)* below for the three that aren't the fire
  service. One row (**"actual crafting recipes… NOT built"**) is
  **SUPERSEDED by the code** — see below.
- `## Dealbreakers / constraints (by precedent)` (lines 318–340, 23
  lines) — code: as cited per bullet above; doc: `fire.md` §
  "Constraints honored" restates every one of these five bullets
  (presence-freeze, no-parallel-damage-path, real-Quantities-banded,
  Api-layer, no-new-module-categories) near-verbatim.
- `## Open questions (requirements-carryable)` (lines 342–390, 49
  lines) — resolved one-for-one against `fire.md`'s D-numbers:
  *Burning representation* → D3/§3 (`Combustible`+`Burning`+`FireLogic`,
  fuel-as-Reserve, exactly the leaned option); *Ignition kinetics* →
  D3 (`tryAutoignite` threshold-cross + thermal-inertia gate via
  `depositHeat`, `ignite()` as the deliberate path); *Spread mechanics*
  → D1/D6 (`FireApi.onFireTick`, open-boundaries-only, no scheduler-tick
  question left open — resolved to presence-gated `WorldClockRegistry
  .every`); *Consumption end-state* → D4 (`charMaterialPath` /
  `hasBurnedThrough`); *Smoke* (the CO/asphyxiation half) → D5
  (`smoke` atmosphere tag, `contaminant` fold); *Oxygen coupling depth*
  → D5, resolved to the fuller model (air `Reserve`, ventilation,
  bellows), not the v1 stub; *Wet coupling magnitude* → the `ΔT_wet`
  formula (§3); *Extinguish surface* → "the three extinguishers" (§3);
  *Phase-change representation* → D7 (bidirectional `reconcilePhase`,
  molten pool as `Bulkable`, `Casting` clone on solidify); *Furnace
  generalization* → D8 (`FurnaceMixin`, `Campfire` refactored onto it
  byte-identically, `Forge`/`Kiln`/`Oven`); *heat-as-crafting-control
  seam* → D9, **consumed**, not merely confirmed-inert. Two
  sub-questions remain genuinely open at bare-name fidelity — see
  *Cut (bare name, equal fidelity)*.
- `## Cross-references` (lines 392–430, 39 lines) — a navigation list
  now duplicated by `fire.md`'s own "Cross-references" section, which
  points to the same six docs; the `crafting.md` line's claim ("No
  recipe built here") is superseded — see below.

### Superseded — cut
- Couplings-table row `actual crafting recipes (cooking / smelting /
  smithing / kiln) | the deferred line — NOT built` and the
  `crafting.md` cross-reference's "No recipe built here" — by the
  crafting-branches build. `trade-smelting`, `trade-smithing` (via
  mining/forestry rows), `trade-mining`, `trade-forestry`,
  `trade-cooking`, `trade-baking` all ship recipe rows keying
  `requiresHeatK`, read by `CraftingLogic`'s heat gate
  (`platform/idea/api/CraftingLogic.ts:2108-2135`) and the by-hand
  `HeatController`/`BoilController`. Only **glassmaking** has no pack
  at all (confirmed: no `glass*` pack under `packages/content/`) — see
  the doc fix below.

### Cut (bare name, equal fidelity — no design content beyond the name)
- *burning-DoT as a combat weapon*, *vision-obscuring smoke +
  cross-room drift*, *flammability limits (LEL/UEL)*, and the *magic
  taxonomy hook* open question — each appeared in the slate only as a
  one-line mention (a table cell or an open-question bullet) with zero
  elaboration; `fire.md § Deferred` already names all four at the same
  bare fidelity ("fire as a combat weapon / burning-DoT",
  "vision-obscuring smoke (the fog→visibility seam); cross-room smoke
  drift", "flammability limits (LEL/UEL)", "the magic Fire school
  (actuates this channel)"). Nothing beyond the name existed to lose.
  Dropped from the new status block's `Left` for the same reason — the
  body no longer discusses them and the doc already carries the
  backlog item.

### Kept (UNBUILT)
- `## The fire service — making fire survivable in a property game` in
  its entirety (lines 433–547, 115 lines, unedited) — no code anywhere
  for a fire brigade, insurance, arson-as-crime, curfew-as-fire-code,
  or the Tiebout-risk-tolerance framing; this is the slate's entire
  remaining live design and it is the only body content that survives
  the pass.

### Doc fix (statement the code proves false)
- `fire.md § Deferred` said *"The crafting recipes (cooking / smelting
  / smithing / glassmaking — the downstream consumer of this
  substrate)"* — false for cooking/smelting/smithing (all shipped,
  cited above) and internally inconsistent with the same doc's own
  "The crafting seam (D9) — **consumed**" section three paragraphs
  above it. Narrowed to name only the actual remaining gap
  (glassmaking). See diff in `docs/subsystems/fire.md`.

### Status block
- Status: PARTIAL → PARTIAL (unchanged — the fire service is still a
  real, unbuilt remainder)
- Left: *the brigade, prevention, and fire insurance · arson-as-crime ·
  map-scale wildfire · burning-DoT as a combat weapon ·
  vision-obscuring smoke + cross-room drift · flammability limits
  (LEL/UEL)* → *the fire brigade (bucket-brigade → volunteer →
  paid-service ladder) · fire-code/prevention/inspection · fire
  insurance (incl. the moral-hazard/arson tie) · map-scale wildfire ·
  arson-as-crime + investigation · the Tiebout risk-tolerance framing*
  (narrowed to what the kept section actually elaborates; the three
  bare-name items — burning-DoT, vision-smoke/drift, LEL/UEL — moved to
  *Cut (bare name, equal fidelity)* above, since `fire.md § Deferred`
  already carries them and the slate body no longer does)
- Size: a build → a build (the fire service is genuinely build-sized:
  a new district-scoped activity, an insurance industry dependency, a
  crime + investigation type)

### Handoff (belongs in a doc outside my list)
None. Everything cut from this slate is already documented in
`fire.md` (in my write list). The fire service's dependencies
(insurance-as-its-own-industry, the enforcement slate's
true/honest-error/lie triad, the zoning-slate emission model) are
named in the kept section itself as pointers to other **slates**, not
subsystem docs — no doc outside my list needs an insert.
