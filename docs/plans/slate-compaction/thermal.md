# Slate-compaction pass — thermal batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list:
`docs/subsystems/thermal.md` only. Line numbers below are the ORIGINAL
slate file's. Code evidence grepped 2026-09-20 against
`packages/server/src/mud/**` and `packages/content/**`; nothing was
classified on the slate's own status-block claims.

Batch-wide evidence used repeatedly: `lib/thermal/Thermal.ts`
(`ThermalMixin`, `restamp`, `depositHeat`, conductivity dials) ·
`lib/thermal/ThermalRegulation.ts` (`effectiveAmbient`, wet-bulb, wind
chill, heat-load shed) · `lib/thermal/Meltable.ts` (the latent-heat
plateau, `reconcilePhase`) · `platform/thing/Campfire.ts` (Furnace +
LightSource + Postured warming-slot + Reserved fuel composition) ·
`lib/slot/Postured.ts` (`warmth` slot attribute) · `lib/slot/Attired.ts`
+ `lib/slot/Wearable.ts` (`getClo`, `bodyInsulation`, per-part surface
weighting) · `platform/idea/api/FireLogic.ts` + `docs/subsystems/fire.md`
(combustion, smoke, ventilation, bellows, fire spread — all owned there)
· `docs/subsystems/weather.md` (wind now procedurally driven — supersedes
the slate's "weather seam" stub) · `docs/subsystems/biome.md` +
`docs/subsystems/quantities.md` (conductivity column, `clo`, `m/s` wind —
all already documented there) · `platform/idea/Condition.ts` (frostbite
as a wound type, cold channel) · no hits anywhere for `radiant` (generic
hot-object contribution), `bask`, `crushed loft` / loft compression, or a
garment composing `ThermalMixin` (its own thermal mass) — confirmed
unbuilt.

---

## docs/slates/tails/thermal-slate.md — 717 → 265 · Status PARTIAL → PARTIAL

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### No sub-room geometry → microclimates are occupied, not located` —
  the outdoor/warming-slot half (SkyExposed split, `Postured` log-seats
  carrying `warmth` + `restQuality`, capacity = huddle limit) — code:
  `platform/thing/Campfire.ts`, `lib/slot/Postured.ts:79,110-123`,
  `lib/thermal/ThermalRegulation.ts:473-481` → inserted at
  `thermal.md § The warming slot — outdoor proximity without geometry`
  (after *Q10*, 16 lines). The indoor-bump half and the generic
  any-hot-object-radiates half stayed unbuilt — kept below.
- `## Honest scope (the abstraction)` — lumped capacitance / tabulated
  effective `R` / single-barrier-single-wall — code matches
  `lib/thermal/Thermal.ts` dials + `τ = R·C` section already in
  `thermal.md` → inserted as `thermal.md § Honest scope (the
  abstraction)` between *Dials* and *Non-goals* (9 lines). Also resolves
  slate Open Question 4 (`R` granularity: tabulated/lean, as built).

### Doc correction (code proves a statement false)
- `thermal.md § Non-goals` listed **"phase change / latent heat"** as a
  non-goal, but the very same doc's `§ Phase change (the fire build)`
  section (and `lib/thermal/Meltable.ts`) describes it fully shipped —
  the Non-goals line predates the fire build and was never updated.
  Removed the two words from the list; no other edit.

### Cut (SHIPPED · DOCUMENTED)
- `## What exists vs. what this adds` (28 lines) — code: `lib/thermal/Thermal.ts`, `lib/vitals/Vitals.ts` (`coreTemperature`); doc: `thermal.md` intro + `§ ThermalMixin`. Replaced with a 3-line pointer.
- `## The `Thermal` capability` + `## The cooling model` + `## The vessel case — sealing, refilling, mixing (the thermos)` (117 lines) — code: `lib/thermal/Thermal.ts` (`ThermalMixin`, `restamp`, `τ=R·C`), `platform/thing/Flask.ts`/`Receptacle.ts`; doc: `thermal.md § ThermalMixin — the generic capability`, `§ Cached-ambient`, `§ τ = R·C`, `§ The thermos (Flask)` — all more precise than the slate (actual field names, the furnace-couple re-stamp trigger the slate didn't anticipate). Replaced with a 7-line pointer.
- `## The living body — thermoregulation (Option C)` intro + dead-band table + *Why this shape* bullets + *Reconcile-friendly* + *Structure vs dials* (61 lines) — code: `lib/thermal/ThermalRegulation.ts`; doc: `thermal.md § ThermalRegulationMixin — the living body (Option C)`. The "why" bullets are dispersed rather than concentrated (the *starving = cold* cliff is verbatim at `thermal.md:162-163`; the setpoint/fever tie is `§ Non-goals`' fever line; insulation-embodiment is the *Worn insulation* section) — judged sufficient, not re-graduated as one block. Replaced with a 7-line pointer.
- `### Cold-blooded species` — dead-band-is-endotherm intro, Q10 bullets, thermal-inertia/torpor/death-when-hot bullets, closing substrate-cost paragraph (~40 lines) — code: `ThermalRegulation.ts` strategy split, `thermal.md § Q10 (the metabolism edit)`, `reconcileThermalCascade` torpor branch. Only the *Behavioral regulation* bullet (no code anywhere) survives, promoted to its own kept paragraph.
- `### Insulation / clothing` — intro + R-formula/worn-slots/feels-like/too-much-jacket bullets + the v1-body-wide-scalar paragraph (~55 lines) — code: `lib/slot/Attired.ts` (`bodyInsulation`, per-part Meeh's-law weighting), `lib/slot/Wearable.ts` (`getClo`); doc: `thermal.md §§ Worn insulation is SURFACE-WEIGHTED PER PART…`, *The internal heat load*. The v1-scalar paragraph is superseded — the shipped version is per-part, strictly better than either v1 option offered.
- `### Wind, humidity, and the weather seam` entire subsection (46 lines) — code: `Atmospheric.ts` (`wind` field), `ThermalRegulation.ts` (wind-chill/heat-index/wet-bulb reads), `lib/slot/Wearable.ts` (`windproofing`); doc: `thermal.md` (wind-chill/heat-index/wet-bulb throughout `ThermalRegulationMixin`), `biome.md` (wind as an atmospheric property), `quantities.md` (`m/s`, `clo`, `W/(m·K)`).
- `### A fire is a Thermal object kept hot by combustion` + its table (18 lines) — code: `lib/fire/Furnace.ts`, `platform/thing/Campfire.ts`; doc: `thermal.md §§ The furnace couple`, *The firebox stays pinned*; `fire.md`.
- the shipped half of `### No sub-room geometry…` (outdoor/warming-slot paragraphs, ~20 lines — the indoor-bump bullet and the *General resolution* paragraph were kept, not cut) — code as in the Graduated entry above; now doc: `thermal.md § The warming slot`.
- `### The composite — a survival-systems hub` (all six bullets, 18 lines) — code: `ReservedMixin` on `Campfire`, `FireLogic.ts` (air supply / smoke), `LightSourceMixin`, the `heat`-channel burn hook (already in `thermal.md § Senses`), `requiresHeatK` (crafting.md); doc: `fire.md` owns combustion/smoke/bellows, `thermal.md` owns touch=burn. "Social attractor" is an emergent consequence of the warming slot, not a separate mechanism — no doc statement needed.
- `### v1 vs tiers` (12 lines) — redundant with *Build order* (below) and `thermal.md § Non-goals`; its one live nugget (indoor bump) is kept in the *No sub-room geometry* remainder above, and "radiant directionality… obviated by the slot model" is self-superseding text, not a design item.
- the reserve-clamp explanation + table + "So phase change = …" paragraph in `## Phase change / ice` (26 lines) — code: `lib/thermal/Meltable.ts` (`getMeltingPointK`, `getLatentHeatOfFusion`, the accumulator); doc: `thermal.md § Phase change (the fire build)` — matches almost line for line, more precisely (real method names).
- `## Extensions to existing substrate` (24 lines) — code: `race.md`'s `Material.thermalConductivity`, `BiomeApi.conductivityOf`, `Atmospheric.ts` wind field, `quantity.ts`'s `'clo'` union member; doc: `biome.md:323-324,365,410`, `quantities.md`'s Thermal-build paragraph (documents `clo`, `m/s`, `W/(m·K)`, `J/(kg·K)` by name) — both outside my write-list, already complete, no handoff needed.
- `## Surface (methods, the contract)` (10 lines) — code: `ThermalMixin.getTemperature/getContentsTemperature/getSurfaceTemperature`; doc: `thermal.md §§ ThermalMixin — the generic capability` (states all three explicitly).
- `## Consumers` (16 lines) — pure summary of sections already cut above with their own pointers.
- Open questions 1–6 (24 lines) — see the Graduated + Cut entries above; folded into one summary paragraph with a pointer per item.
- `## Build order` (17 lines) — all three waves shipped; folded to a 3-line pointer.
- the stale second status block (`> **Status: SHIPPED 2026-06 — graduated to…**`, 6 lines) and the `Audit (2026-06-07)` line (2 lines) — history; the canonical block above already says the same, more currently.

### Superseded — cut
- the *weather seam* paragraph inside the former `Wind, humidity, and the weather seam` subsection ("flagged, not designed here… a weather subsystem that does not exist") — by `weather.md`: the weather subsystem now exists, procedurally drives `wind` (and humidity/temp/pressure per locality), which is exactly the biome-reads/weather-drives relationship the paragraph asked for. Folded into the subsection-level cut above (no separate pointer needed — `weather.md` isn't in my write-list and the slate no longer names the seam).
- the `## Phase change / ice` section's opening paragraph ("A cold drink with no ice is nothing new… Newton's smooth exponential has no plateau") — by the shipped `MeltableMixin`; the "why it was deferred" framing no longer applies. Folded into the section-intro rewrite.
- the closing "Still deferred — but a known build… not an open unknown" sentence — by the same shipped engine; rewritten in place (not a design loss, connective tissue only) to "None of the four are built as content/behavior…", preserving the still-true half (condensation unbuilt).

### Kept (UNBUILT)
- `## The `Thermal` capability…` section's replacement carries no new design — nothing kept here, fully shipped.
- **Behavioral thermoregulation** (basking/shade/burrow-seeking for ectotherms) — kept as its own paragraph under *The living body*. No code (`bask` — zero hits); ties to npc-behavior, unclaimed.
- **Local frostbite half** — kept as a pointer paragraph under *Insulation / clothing*; the remaining work (weather-driven, per-region) is explicitly `physiology-slate § Part 7g`'s, not re-designed here.
- **Deferred wrinkles** (crushed loft; a garment's own thermal mass) — kept verbatim as one paragraph (wet-collapse, the third item in the original, did ship — paragraph kept whole per the no-split rule, noted).
- **The generic radiant read** (any hot `Thermal` object, not just an authored warming-slot fixture) — kept, its own paragraph under *Heat sources*. No `radiant` hit anywhere in `lib/thermal/`.
- **The indoor room-ambient convection bump** — kept, its own paragraph; `thermal.md`'s own Non-goals section already flags it as a follow-on, but names no design — this slate is the design's actual home.
- **Microclimates beyond the campfire** (sun-spot, shade-spot, uncapped per-detail zones) — kept as the *General resolution* paragraph's survivor.
- **Sauna / steam room** — kept whole (no content anywhere; `grep -rl sauna` empty).
- **Phase-change consumers** (iced drink + dilution, cold storage / ice economy, freezing content, condensation) — kept as the bullet list; the *engine* they'd ride on is shipped, but none of the four exist as content or bulk-transfer behavior.
- **Open question 7's "Leans"** (the fold/clo derive-from-the-same-fabric-properties argument, the proposed monotonicity test, the textiles-slate/this-slate ownership split) — kept; this is forward design the injury build deliberately deferred, not a shipped decision. Trimmed only the parts of Q7's prose that `thermal.md § Non-goals` already states (the RESOLVED headline).
- `## What this slate does NOT cover` — kept verbatim (scope boundary, still accurate).

### Uncertain — kept
*(none — every item above was either confirmed built via a grep hit, or confirmed absent via a grep miss)*

### Handoff (belongs in a doc outside my list)
*(none — every SHIPPED·UNDOCUMENTED item found belonged in `thermal.md` itself; items shipped-and-documented elsewhere — `biome.md`, `quantities.md`, `weather.md`, `fire.md` — were already complete, so nothing needed writing there)*

### Status block
- Left: *sauna/steam rooms · per-region frostbite · object-to-object conduction · inter-room ventilation · the indoor room-ambient convection bump · heated vehicle cabins* (6 items, 3 of which — object-to-object conduction, inter-room ventilation, heated vehicle cabins — named no design anywhere in the body; they are `thermal.md § Non-goals`' deliberate non-goals, each with its own one-line why, so I dropped them from Left rather than carry a bare backlog nub with no home) → *the generic hot-object radiant read · the indoor room-ambient convection bump · microclimates beyond the campfire · sauna/steam room content · behavioral thermoregulation · worn-gear wrinkles · phase-change consumers · weather-driven per-region frostbite (tracked at physiology-slate) · the clo/covering-fold reconciliation* (9 items, every one backed by a body section).
- Size: *a tail* → *a tail* (unchanged — everything remaining is small/opportunistic, several explicitly owned by other slates).
- Status: *PARTIAL* → *PARTIAL* (unchanged — substrate shipped, real surface remains).
