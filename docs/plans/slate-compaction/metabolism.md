# Metabolism — compaction ledger

Batch key: **metabolism**. Slate: `docs/slates/tails/metabolism-slate.md`.
Subsystem doc I may insert into: `docs/subsystems/metabolism.md` only.
Anything belonging elsewhere goes to Handoff, never written there.

Context carried in from the task: MR !269 (`build/nutrition-fitness`) is
open, on a different branch, and NOT reflected in this branch's code —
verified against `master`'s checked-out tree only. The known three-way
away-recovery disagreement (furnishing.md vs `Metabolic.reconcileMetabolism`
vs metabolism.md l.~177) is tracked in `docs/plans/slate-compaction/physiology.md`
and is NOT resolved here; the slate section that touches it is kept and
flagged Uncertain, with the exact code evidence recorded below.

## Verification method

Read `packages/server/src/mud/lib/metabolism/Metabolic.ts` (1548 lines),
`docs/subsystems/metabolism.md`, `docs/subsystems/thermal.md`,
`docs/subsystems/magic-items.md`, `packages/server/src/mud/lib/magic/Caster.ts`,
`packages/server/src/mud/lib/slot/Postured.ts`, and the metabolism
condition seeds under `packages/content/platform/content/platform/idea/Condition/metabolism/`.
Grepped for: `scurvy`, `nutrientAmounts`, `hangover`, `USDA`, `restQuality`
+ `SlotSpec`, `coupledConsumers`, `manaDraught`, `waste`/`privy`.

## Headline findings (beyond a straight ✅-marker audit)

1. **`restQuality` shipped on `PosturedMixin` (the specialized host), not
   on `SlotSpec`** as the slate's "Rest quality" subsection designed —
   metabolism.md says so explicitly. SUPERSEDED by the code.
2. **Coupled recovery was generalized from one consumer to N**
   (`coupledConsumers()`, a `@hook`) — magic-items D10 made `mana` the
   second consumer. This is undocumented in metabolism.md itself (only
   magic-items.md documents the consumer side) — **graduated** below.
   This is also how "magic ingestion" (the slate's deferred seam)
   actually shipped: a mana draught is ordinary carbohydrate/water that
   feeds the SAME coupled-recovery keystone a caster's mana already
   drains — no new ingest-routing target was needed. SUPERSEDED, in a
   more elegant shape than designed.
3. **The thermal two-port coupling (heat-out via Q10 basal multiplier,
   fuel/water-in via shiver-burns-satiation/sweat-burns-hydration) is
   fully shipped** — in `thermal.md` (`ThermalRegulationMixin`), outside
   my insert scope, but metabolism.md already cross-references it
   (`thermalMultiplier()`). Cut with pointer, no graduation needed here.
4. **Basal drain is flat-per-mass (linear), not Kleiber `mass^0.75`** —
   resolves the slate's open question. Undocumented decision —
   **graduated** below.
5. **Scurvy / wired nutrient deficiencies remain genuinely UNBUILT** —
   no `scurvy` hit anywhere in `Metabolic.ts`; metabolism.md's own
   "Inert seams" section confirms this is still deferred. Matches the
   slate's own `Left` claim.
6. **No USDA/FoodData sourcing found** — the real-nutrition-data
   pipeline open question is still genuinely open.
7. **No "well-fed" buff, no waste/privy mechanic, no hangover condition,
   no bulk-source/communal eating** anywhere in code — all remain
   UNBUILT as the slate claims.

## `docs/slates/tails/metabolism-slate.md` — 649 → 358 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Duplicate narrative status block (`> **Status (2026-06):**...`, 16 lines) — code: (n/a, historical prose); doc: canonical status block kept per "one status block" rule.
- `## Principle` (full section) — code: `lib/metabolism/Metabolic.ts` reserve table + coupled-recovery design; doc: `metabolism.md` §§ intro / *Coupled recovery — the keystone*.
- `## The flows` (full section) — code: `Metabolic.ts` `reconcileMetabolism`/`integrateSlice` step order; doc: `metabolism.md` § *Composition + the lazy time drive* (the 4-step slice order matches exactly).
- `## Coupled recovery — the mechanics` bullets "Rate-limited, not instant" + "Draws both tanks" — code: `coupledRecovery()`, `RECOVERY_HYDRATION_COST`/`RECOVERY_SATIATION_COST`; doc: `metabolism.md` § *Coupled recovery — the keystone* ("Hydration is the tighter leash").
- `### Rest quality — bed vs. floor` bullets ("So: Floor/Bed", numbers 1.3×/2.5×) — code: `lib/slot/Postured.ts`; doc: `metabolism.md` § *Coupled recovery — the keystone* (near-identical numbers).
- `## Intake — ingest, digestion buffer...` — main paragraph + bullet list (ingest→buffer, overeating free, sip/drink free) — code: `Metabolic.ts` `ingest`/`ingestSolid`, `solidVolume`/`liquidVolume`; doc: `metabolism.md` § *The digestion buffer*.
- Intake section's "Vomiting is the stomach's reject valve" + closing "What the buffer routes into..." paragraphs — code: `Metabolic.vomit()`; doc: `metabolism.md` § *`vomit` + antidote*.
- `## The cascade — floor-effects become conditions` (full section) — code: `Metabolic.reconcileCascade()`, `seeds/lib/metabolism/conditions/*.yaml`; doc: `metabolism.md` § *The cascade — metabolism as the first condition-driver*.
- `## The time-drive — lazy on read...` (full section) — code: `Metabolic.reconcileMetabolism()` doc comment ("Integrate elapsed in-session game-time..."); doc: `metabolism.md` § *Composition + the lazy time drive*.
- `Presence, sleep...` bullets "Active play" + "Linkdead" — code: `Metabolic.ts` lines ~596-601 (`isLinkdead()` freeze); doc: `metabolism.md` § *The in-session clock + presence freeze*.
- `Presence, sleep...` closing "connection seam is two signals..." paragraph — code shows metabolism reads presence directly, receives nothing pushed; doc: `metabolism.md` § *The in-session clock + presence freeze* ("zero connection-layer work"). Classed as superseded-in-shape, not a plain cut (see Superseded below).
- `Phase 2 — Nutrients` bullet "Macros route to the energy economy" — code: `Metabolic.ts` `routeTag()` static switch; doc: `metabolism.md` § *The digestion buffer* (`water→hydration, carb/sugar→fast satiation, fat→slow satiation, protein→inert tissue-repair seam`, verbatim match).
- `Phase 2 — Nutrients` trailing "(Per-consumable amount vs per-player rate is settled above...)" — redundant cross-reference to a paragraph kept elsewhere in the slate; no information lost.
- `Phase 2 — Toxicity` bullets "Dose × potency...", "Two timescales...", "vomit/purge window...", "Antidote → treatment" — code: `Metabolic.ts` toxin-burden math (`burden += absorbed × potency / bodyMass`), `applyAntidote()`; doc: `metabolism.md` §§ *Toxin burdens*, *`vomit` + antidote*. The antidote item also resolves the slate's own open question ("confirm it's callable" — yes, `ResolutionSpec` seam, no verb needed).
- `Demand-driven seams` bullets "Oxygen" + "Healing" — code: `Metabolic.spo2Throttle()` (returns 1.0), inert protein pool; doc: `metabolism.md` § *Inert seams* (near-verbatim).
- `Demand-driven seams` bullet "Temperature — two ports" — code: `packages/server/src/mud/lib/thermal/*` (`ThermalRegulationMixin`, cold-stress spends satiation/shiver, heat-stress spends hydration/sweat), `Metabolic.thermalMultiplier()`; doc: `thermal.md` §§ *`ThermalRegulationMixin`*, and `metabolism.md`'s own basal-drain bullet already cross-refs it. Fully shipped, both ports.
- `## The fun trap — confirmed by measurement` — measured-numbers paragraph + "Two consequences" bullets — code: `METABOLIC_DEFAULTS`; doc: `metabolism.md` § *Rates* (same 4.6h/6.9h/47× figures, same "tune the exertion end" conclusion). Reframe paragraph ("what is still missing...") kept — see Kept below.
- `## The fun trap` (second, original genre-critique section) — its thesis (tune basal invisible, bite only at margins) is exactly what the measured Rates section now proves shipped; doc: `metabolism.md` § *Rates*.
- `## Scope / dependencies / sequencing` paragraphs "In — Phase 1", "In — Phase 2", "Seams" — code + doc: the whole of `metabolism.md` (both waves + the `vomit`+antidote seam resolution). "Depends on" / "Sequence" paragraphs cut as moot build-history (the build completed; sequencing has no forward design value).
- `## Open questions` — "Recovery's fuel/water split" (code: `RECOVERY_HYDRATION_COST=0.7 > RECOVERY_SATIATION_COST=0.5`, proportional `hydrationThrottle`; doc: § *Coupled recovery — the keystone* + § *Rates*), "Reconcile granularity over a gap with mixed activity" (code: `STEP_SEC`/`MAX_STEPS` sub-stepping; doc: § *Composition*), "Digestion buffer magnitudes" — the one-vs-two-volumes question (code: `solidVolume`/`liquidVolume`; doc: § *The digestion buffer*), "Where the flow logic lives" (doc states outright "There is no `MetabolismApi`"), "Collapse's exact incapacitation" (code: `seeds/.../Condition/metabolism/collapse.yaml` — `observableSigns: [collapsed, unable-to-rise]`, gated via `requiresConscious`; doc: §§ *The cascade*, *`requiresConscious`*).

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Open questions` — "Basal ∝ body mass exponent" (Flat-per-mass vs Kleiber `mass^0.75`) — code: `Metabolic.basalDrain()`, `massFactor = self.getMass().rawValue() / D.REFERENCE_MASS_KG` (linear, no exponent) — → inserted at `metabolism.md` § *Composition + the lazy time drive* (basal-drain list item), 4 lines.
- Coupled recovery's generalization from one consumer to N (`coupledConsumers()` `@hook`) is documented on the *magic* side (`magic-items.md`) but not on metabolism's own page — → inserted at `metabolism.md` § *Coupled recovery — the keystone*, 9 lines. This is also what resolves the slate's "magic ingestion" deferred item (see Superseded).
- The permanent "waste material is not a mechanic" decision (`## Scope`'s "Cut" paragraph) had no home in the subsystem doc — → inserted as new `metabolism.md` § *Deliberately not modeled*, 6 lines.

### Superseded — cut (shipped in a different shape)
- `### Rest quality — bed vs. floor` — designed as a `restQuality` field on the posture-bearing `SlotSpec`; shipped instead as a field on `PosturedMixin` (the specialized host) — by `metabolism.md` § *Coupled recovery — the keystone* ("not on `SlotSpec`... the `Vessel.transmissionFactor` pattern").
- `Demand-driven seams`' "Magic ingestion" bullet — designed as mana/`charge` riding the ingest tag-routing pathway with a magic-reserve/condition payload; shipped instead as mana becoming the coupled-recovery keystone's second consumer (magic-items D10), with a mana draught being ordinary carbohydrate/water — by `magic-items.md` § *Mana recovery spends satiation and hydration* + the new `metabolism.md` graduation above.
- The `> Spoilage is a separate, deferred concern` callout in `Phase 2 — Toxicity` — spoilage shipped as its own subsystem, with the exact toxicity-socket coupling this box anticipated — by [spoilage.md](../../subsystems/spoilage.md) and `metabolism.md` § *Ptomaine is no longer authored per row*.
- `Presence, sleep...`'s "connection seam is two signals metabolism receives" paragraph — designed as metabolism receiving pushed pause/resume + sleep flags from the connection layer; shipped instead as metabolism reading `isLinkdead()` directly, with **no sleep flag existing at all** — by `metabolism.md` § *The in-session clock + presence freeze* ("zero connection-layer work").

### Kept (UNBUILT)
- `## Coupled recovery — the mechanics` bullet "Conversion isn't free — the loss is body heat" — verified still a named, unwired seam: `thermal.md` itself says "**Exertion as a heat load** joins the list: `absorbHeatLoad` is the attach point and nothing calls it from the body's own work yet."
- `## Intake` (retitled "per-individual rates (still open)") — the "Per-consumable vs per-player" paragraph — no per-individual metabolic rate exists in code beyond mass-linear scaling; still open design guidance for a future feature.
- `Phase 2 — Nutrients` bullet "The nutrient ledger" — no open keyed per-body nutrient-tracking structure exists anywhere (only `Material.nutrientAmounts`, a per-item data field feeding `NutritionLabel` + macro routing, not a persistent per-body ledger).
- `Phase 2 — Nutrients` bullet + blockquote "Micronutrients: full ledger, curated consequences" (scurvy) — confirmed zero hits for `scurvy`/deficiency anywhere in `Metabolic.ts`; `metabolism.md` § *Inert seams* itself confirms this is still deferred.
- `Phase 2 — Toxicity` bullet "Curated named toxins" (kept whole because "forageables... ties to identification" is unbuilt — no berry/mushroom identification content found — even though alcohol/venom/lead within the same bullet are shipped; paragraph-granularity rule).
- `## The fun trap` reframe paragraph ("What is still missing is the *point* of it" — ambient-civilization vs expedition-scarcity) — no fountain/tap-vs-wilderness water-scarcity mechanic found; genuinely still just a design idea.
- `## Add the upside — the buff economy [PROPOSED]` (full section, doctrine + open questions) — verified no "well-fed"/nutrition-quality buff anywhere in code or content.
- `## Physics vs. game design` — kept as **Doctrine** (see below), not UNBUILT backlog.
- `## Scope`'s remaining "Genuinely still out" items — oxygen/breathing coupling (spo2 hardcoded to 1.0), per-individual metabolic rates, rich micronutrient consequences beyond scurvy, all numeric tuning.
- `## Other still-open items` (hangover, fuller-stomach-slows-absorption, bulk-source/communal eating) — these only ever existed as status-block phrases with no body section in the original slate (`git show HEAD:...` confirms); given a minimal body home here rather than left as orphaned Left-list claims. Verified unbuilt: no `hangover` hit anywhere in the codebase; no fuller-stomach/bulk-source mechanism found.
- `## Open questions` — "(Phase 2) Nutrient ledger storage" and "(Phase 2) Real-nutrition-data pipeline" — both genuinely open; no USDA/FoodData sourcing found anywhere in the repo.

### Uncertain — kept
- `## Presence, sleep, and the in-session clock`'s "Voluntary logout = sleep" bullet — looked for `sleep`, `restQuality` + logout, `integratesLongAbsence` in `Metabolic.ts`; found the **opposite** shipped: `MAX_REASONABLE_GAP_SEC` far-past guard drops any gap for a body nobody owns, and `metabolism.md` states outright "there is no sleeping player body and no away-recovery." This is exactly the three-way disagreement the task flagged (furnishing.md vs `Metabolic.reconcileMetabolism` vs metabolism.md l.~177), tracked in `docs/plans/slate-compaction/physiology.md`. Kept per the "kept-but-contradicted goes in Uncertain, always" calibration rule; not resolved here.

### Doctrine — kept, labelled
- `## Physics vs. game design` — a methodology thesis (structure=physics vs rates=dials, plus the one deliberate fairness-over-physics override) rather than a backlog item or a fresh shipped decision; largely restates already-cut content in argument form. Coordinator to decide its home (a subsystem doc's *Why*, `docs/design-philosophy.md`, or leave in slate).

### Handoff (belongs in a doc outside my list)
- None. The one candidate graduation outside metabolism.md scope — the `coupledConsumers()` consumer-side story (mana as second consumer) — is **already documented** in `docs/subsystems/magic-items.md` § *Mana recovery spends satiation and hydration*; nothing further needed there.

### Status block
- Left: `wired nutrient deficiencies (scurvy) · hangover · chronic-toxin leaching content · magic ingestion (potions) · fuller-stomach absorption · bulk-source eating · per-individual rates` → `wired nutrient deficiencies (scurvy) · nutrient-ledger storage shape · real-nutrition-data pipeline · hangover · chronic-toxin leaching content (lead) · forageable identification content · fuller-stomach absorption coupling · bulk-source/communal eating · per-individual rates · the buff-economy proposal (nutrition upside) · the ambient-civilization-vs-expedition water-scarcity reframe · away-recovery on voluntary logout (contradicts the shipped far-past guard)` — net: dropped *magic ingestion* (superseded/shipped); added the buff-economy proposal, the water-scarcity reframe, the away-recovery contradiction, nutrient-ledger storage shape, and the real-nutrition-data pipeline, all of which were live body content not previously surfaced in the status line.
- Size: `a tail` → `a tail` (unchanged — the remaining items are scattered small/opportunistic; the buff-economy proposal is explicitly noted in-body as riding the guild build, not requiring its own cycle here).

## Subsystem doc changes (`docs/subsystems/metabolism.md`)

Three inserts, all within my assigned scope:
1. § *Coupled recovery — the keystone* — the `coupledConsumers()` N-consumer generalization + pointer to `magic-items.md` (9 lines).
2. § *Composition + the lazy time drive* — the flat-vs-Kleiber basal mass-scaling decision (4 lines).
3. New § *Deliberately not modeled* — the waste-material "never a mechanic" doctrine note (6 lines).

No existing sentence in `metabolism.md` was edited or removed; all three are pure insertions at existing section boundaries.
