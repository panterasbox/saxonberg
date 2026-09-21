# Slate-compaction ledger — weather

Batch key: **weather**. Slate: `docs/slates/tails/weather-slate.md`.
Writable subsystem doc: `docs/subsystems/weather.md` only. Any
graduation belonging elsewhere (biome.md, watershed.md, thermal.md,
soil.md, time.md, electricity.md, magic.md) is recorded in *Handoff*
below, never written into that doc.

## Findings (code-verified before any cut)

- `WeatherApi.precipitationBetween` / `segmentsBetween`
  (`packages/server/src/mud/platform/idea/api/WeatherLogic.ts`) are
  SHIPPED and match the slate's "## ⚠ The blocking gap" design almost
  exactly: sync, pre-resolved-`Locality`-keyed, exact segment walk,
  tail-capped at `PRECIPITATION_MAX_SEGMENTS`, the `Math.ceil(t1S/L)-1`
  exclusive-boundary fix, replay-against-present-authorship semantics.
  Already documented in weather.md's `precipitationBetween` section —
  the slate's whole "blocking gap" section is SHIPPED · DOCUMENTED.
  One nuance is NOT yet in weather.md: a **scope-tier** pin is invisible
  to the integral (locality-tier only) — graduated below.
- `lib/husbandry/Soil.ts` already calls `WeatherApi.precipitationBetween`
  — the farming/husbandry ∫weather integral is at least partially
  SHIPPED, contradicting the slate's "all designed, none built" line for
  farming. Kept as **Uncertain** (farming-slate.md is a different batch's
  file; not mine to edit).
- `lib/fire/Combustible.ts#wetPenaltyK` reads `MixinApi.isWet` /
  `getWetness()` and its own comment says *"the wet-firewood the weather
  tail deferred, now derived."* **weather.md's "Still-deferred seams"
  list is factually wrong** to still list "wet firewood / the fire
  coupling" as deferred — fixed (code-proves-false exception; see the
  edit below).
- `runStormFanout` and `runBoundaryFanout`
  (`WeatherLogic.ts`) both iterate `ConnectionApi.getAllInteractives()`
  only. **weather.md's storm-lightning bullet says "An empty scope is a
  harmless-but-heard flash" — this is false**: an unvisited scope is
  never iterated, so no strike (heard or not) is ever minted there.
  Fixed (code-proves-false exception).
- No reconcile-on-read exists anywhere for `Floor` surface bulk
  (`hasSurfaceBulk`) or `AmbientLit.getWeatherDimFactor` — both are
  written **only** inside the presence-gated `runBoundaryFanout`. The
  slate's "push/pull fault line" findings (puddle never catches up;
  cloud-dim stamp goes stale) are confirmed accurate and undocumented in
  weather.md. Graduated below.
- `Grid.ts` (`lib/magic/Grid.ts`) still comments *"storm has a
  Discipline leaf but no v1 spell (a weather-pin write Api…)"* — the
  slate's "no weather write Api" claim is still true. Graduated as a
  weather.md deferred-seam bullet (this gap is weather's own, even
  though its consumer is magic's).
- `storm.attractorBias` (`AppSettings.ts` / `content/settings/storm.yaml`)
  is declared and never read anywhere else in the tree — still a dead
  dial, confirmed by grep.
- `LocomotionMode.costMultiplier` still has no production reader
  (content YAML + tests only) — the travel/crafting/combat "genuinely
  zero coupling" claim still holds.
- `Locality._climateLean` / `leanOf` / `pickWeighted` are exactly as
  weather.md's Wave-2 "Procgen (climate-lean-shaped)" paragraph already
  states — the slate's "correction" block re-derives information the
  doc already carries. No content yaml sets `climateLean` yet (still
  unauthored), which the doc doesn't need to state since it's a content
  gap, not a code gap.

## `docs/slates/tails/weather-slate.md` — 502 → 189 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Two historical status blocks ("Header corrected 2026-07-31", "Status:
  Wave 1 SHIPPED 2026-06") + the original framing paragraph + the
  "Already anticipated by the substrate" note (29 lines) — history;
  superseded by the canonical status block + weather.md's own intro.
- `## The split: atmospheric STATE (biome) vs atmospheric DYNAMICS
  (weather)` (14 lines) — code: `WeatherLogic.ts`; doc: weather.md
  opening paragraph ("Weather is to biome what metabolism/thermal are
  to vitals...") states the identical decision.
- `## How weather is produced — procedural, NEVER simulated` (23 lines)
  — code: `WeatherLogic.ts` (`weatherAt`, the grammar tables); doc:
  weather.md section "Why procedural, not simulated" (graduated below) +
  section The grammar + section Determinism.
- `## Locality — the addressing namespace, NOT zones` (54 lines) — code:
  `WeatherLogic.ts` (`localitySeed`, `AddressApi.resolveLocalityFor`);
  doc: weather.md section Locality binding (D1), graduated with the "why
  the address tree" rationale below.
- "Felt directly" paragraph of `## What's on the menu` (6 lines) — code:
  `WeatherLogic.ts` Wave-2 fan-outs; doc: weather.md section Wave-2
  consequences + thermal.md.
- `## Consumers (why it'll get built)` (10 lines, two of three bullets
  shipped, third redundant with the later "Status of the designed
  consumers" line in the same slate) — doc: weather.md section Wave-2
  consequences.
- The "Correction to a common assumption" ClimateLean block (13 lines)
  — code: `WeatherLogic.ts` (`leanOf`, `pickWeighted`,
  `Locality._climateLean`); doc: weather.md section Wave-2 / Precedence,
  already states it — replaced with a 7-line pointer (kept, not a pure
  cut, since the surrounding "Correlated risk" section still needs the
  fact to make its own point).
- `## The push/pull fault line` (30 lines) — code: verified by reading
  `runBoundaryFanout` / `runStormFanout` / `AmbientLit` /
  `Bulkable`/`BulkableLogic` (no reconcile-on-read exists for surface
  bulk or the weather-dim stamp anywhere outside the fan-out); doc:
  graduated into weather.md section Wave-2 consequences (the pull/push
  intro sentence + the puddle/light bullets) below.
- `## The blocking gap — no time-parameterised resolve` (133 lines) —
  code: `WeatherApi.precipitationBetween` / `segmentsBetween`
  (`WeatherLogic.ts`) implement exactly this design (locality-keyed,
  exact segment walk, tail-capped, the `Math.ceil` exclusive-boundary
  fix, replay-against-present-authorship); doc: weather.md's
  `precipitationBetween` section already states nearly all of it
  verbatim — replaced with a 6-line pointer.
- The `analyze weather`/Barometer opening paragraph of `## Forecasting`
  (5 lines) — doc: weather.md section Read surface (D6).
- `## Smaller findings worth keeping` (17 lines, all five items) — code-
  verified individually (see Findings above); all five now graduated
  into weather.md (section Known quirks — new; section Wave-2
  consequences; section Still-deferred seams) — replaced with a 7-line
  pointer paragraph.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- "Why never a simulation" chaos rationale -> inserted at weather.md new
  section "Why procedural, not simulated" (11 lines).
- "Why the address tree, not zone geometry" + "NOT the planetary
  version" -> inserted at weather.md section Locality binding (D1)
  (15 lines).
- Push/pull architecture principle + the puddle-has-no-reconcile /
  cloud-dim-stale-stamp findings -> inserted at weather.md section
  Wave-2 consequences (intro paragraph + two bullet appends, ~20 lines
  total).
- Scope-tier-pin-invisible-to-the-integral nuance -> inserted at
  weather.md's `precipitationBetween` section (6 lines).
- "No weather write Api" (confirmed still true via `lib/magic/Grid.ts`
  comment) -> inserted as a new weather.md section Still-deferred seams
  bullet (6 lines) — genuinely UNBUILT, but the *gap itself* is
  weather's own and belongs in weather's backlog register rather than
  only the slate.
- "measure altitude skewed by storms" + "`storm.attractorBias` dead
  dial" -> inserted as weather.md section Known quirks (new
  subsection, 9 lines).

### Fixed (code proves the doc wrong — logged, not a normal insert)
- weather.md's storm-lightning bullet said "An empty scope is a
  harmless-but-heard flash." **False** — `runStormFanout` iterates
  `ConnectionApi.getAllInteractives()` only, so an unvisited scope is
  never entered and no strike (heard or not) is ever minted there.
  Corrected in place.
- weather.md's section Still-deferred seams listed "wet firewood / the
  fire coupling — needs the Fire noun..." as still deferred. **False**
  — it shipped as `Combustible.wetPenaltyK()`
  (`lib/fire/Combustible.ts`), confirmed reading
  `MixinApi.isWet`/`getWetness()`, comment says so explicitly. Removed
  from the deferred list; a one-line "no longer deferred" note added
  instead.

### Kept (UNBUILT)
- `## Dealbreakers` — see *Doctrine* below (not UNBUILT backlog, but not
  cut either).
- `## The family coupling` (minus the graduated ClimateLean paragraph)
  — the legibility finding ("weather is very nearly imperceptible": no
  front-arrival event, no scene message, no `look up` surface — verified
  absent by grep, not superseded by `legibility-slate.md`, which never
  mentions weather), the exogenous/shared/forecastable/correlated
  table, the correlated-risk hedges (preservation, mining), and the
  seasonal-labour loop. All still genuinely unbuilt.
- `## Forecasting` (minus the shipped opening) — the three missing
  stakes (reason to care, skill differentiation, inferential bridge)
  and the "information good" aether tie-in. Verified: `presageFront`
  is still a plain boolean with no proficiency gate anywhere in
  `WeatherLogic.ts`.
- `## The rule every family consumer must honour` — Dealbreaker 2
  restated + the consumer status list. Kept whole (see Uncertain below
  for the one contradiction found in it).

### Uncertain — kept
- The consumer-status line "all designed, none built... farming
  (integral-weather, GDD)" — looked for `WeatherApi` usage in
  `packages/content` and `packages/server/src/mud/lib/husbandry`;
  found `lib/husbandry/Soil.ts` already calls
  `WeatherApi.precipitationBetween`. So the farming/husbandry
  integral-weather integral is at least partially SHIPPED, not merely
  designed. Not resolved here because `farming-slate.md` is a different
  batch's file (out of my writable list) and the true state of the
  *farming build* (as opposed to the substrate it will eventually use)
  is uncertain from this side alone — flagged for the coordinator to
  reconcile against whichever agent compacts `farming-slate.md`.

### Doctrine
- `## Dealbreakers` (all 5) — the standing design constraints for any
  future weather consumer (no sim/tick/stored state; nothing may depend
  on weather; stay a thin driver; no global-coordinate dependency; soft
  game-time/ambient rules). Not a backlog item, not shipped-and-
  documented (weather.md states the *what* it produced but not this
  operational checklist for FUTURE builders) — kept verbatim, left out
  of the `Left` list.

### Status block
- Left: `fog -> visibility · snow depth · vector wind · moving fronts ·
  a weather-pin write Api (it blocks the storm Discipline) · the
  economic family coupling (correlated risk, seasonal labour)` ->
  `fog -> visibility · snow depth · vector wind · moving fronts · a
  weather-pin write Api ... · the legibility gap (no front-arrival
  event / scene message / look up surface) · forecasting's missing
  stakes (reason to care, skill differentiation, inferential bridge) ·
  the economic family coupling (correlated risk + its hedges, seasonal
  labour)`. Grew to make explicit two items (legibility, forecasting
  stakes) that were in the body but unrepresented in the old header.
- Size: `a wave` -> `a wave` (unchanged — the remaining design is real
  but rides another build, most likely the legibility work or the
  husbandry family, not its own cycle).
- Status: `PARTIAL` -> `PARTIAL` (unchanged — substrate shipped, the
  family-coupling surface + legibility gap remain).

### Handoff (belongs in a doc outside my writable list)
- -> `farming-slate.md` (or `docs/subsystems/husbandry.md` /
  `docs/subsystems/soil.md`, whichever the farming batch owns):
  `lib/husbandry/Soil.ts` already calls `WeatherApi.precipitationBetween`
  — the weather-slate's own claim that farming's integral-weather
  integral is merely "designed, unbuilt" is stale for at least the
  soil-substrate half of it. Reconcile farming-slate.md's status
  against this.
- -> `docs/subsystems/magic.md` / `docs/subsystems/magic-items.md` (the
  Storm Discipline's consumer side): no action needed from me — the
  magic batch's own compaction pass already recorded that the Storm
  spell needs a gated weather-write Api that does not exist (confirmed
  independently here via `lib/magic/Grid.ts`'s own comment). The
  write-Api gap itself is now tracked on the weather side in
  weather.md section Still-deferred seams.
