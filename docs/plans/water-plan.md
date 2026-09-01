# Water — implementation plan

Builds [water-requirements.md](../requirements/water-requirements.md)
(D1–D19). Nine waves, kernel and one capability pack.

The build's spine is one edge repeated at two scales: **precipitation
integrates into a place**. Once for soil (a bed fills from the sky) and
once for a watershed (a reach fills from its catchment). Everything else
— conveyance, storage, rights, contamination — hangs off having a real
quantity of water in a real place.

---

## Grounding (verified this cycle; file refs current at plan time)

| Fact | Where | Consequence for the plan |
|---|---|---|
| `weatherAt(timeS, locality)` is **pure and sync** | `api/weather.ts:92` | the precipitation integral is an exact segment walk, replayable over any absence |
| precipitation is a **descriptor**, not a rate: `none` / `rain` / `storm` / `snow` | `WeatherLogic.ts:454,492` | **a rate per type must be authored** — W1's one new number |
| `Cultivable.waterSoil(litres): number` — *"pour water in, returns litres actually absorbed (headroom-capped)"* | `lib/husbandry/Cultivable.ts:144` | the soil consumer already exists; the rain edge is a caller, not a model |
| `getLandRequirementM2()` ships | same, `:124` | mm × m² = litres with no invented field |
| `Zone.lookupField<T>()` reads its **own value sync** and is async only on the ancestor-miss path | `lib/zone/Zone.ts:129` | not a constraint: elevation is never on a hot path (P0) |
| `Cultivable` reads `self.lastAmbientK` — a cached scalar the thermal system writes | `lib/husbandry/Cultivable.ts:533` | the shipped pattern for a sync consumer needing chain-resolved data |
| `WeatherApi.deviationFor` takes a **pre-resolved** `Locality` | `api/weather.ts` | the second shipped pattern — push the resolve to the async caller |
| `BiomeLogic.resolvePressureFor` / `traceResolvePressureFor` | `platform/idea/api/BiomeLogic.ts:236,334` | the single site for D4's derive-from-elevation fallback |
| gravity ships as `AtmosphericTrace<Quantity<'m/s²'>>`, authorable, per-detail overridable | `lib/biome/Atmospheric.ts:125,154` | `g` is a read, not a constant |
| `DocumentApi.save` / `read` / `list(prefix)` / `listOfKind`, plus a bespoke `saveRelease` | `api/document.ts:71–139` | a water right is `save`; seniority is `list(prefix)` + sort; `saveRelease` is the precedent for a kind with its own validated save |
| `lint:census` clause (d) fails on a new path-valued `data` field | `scripts/check-template-census.ts` | **every new content field this build adds must be censused in the same commit** (P7) |
| two proprietor-absent public-infrastructure `Business` seeds ship | `fasttravel.md:204`, `employment.md:343` | the river authority needs no new institution type |

---

## Plan-level decisions

### P0 — Elevation is a COLD-PATH input, compiled into ordinals and constants

The first draft of this plan said elevation had to be cached per
consumer because `Zone.lookupField` is async and reconciles are sync.
That over-generalized from one true fact to a build-wide constraint, and
it was wrong. **Nothing needs elevation on a hot path.**

| Consumer | Needs | Resolved at |
|---|---|---|
| reach ordering | elevation | **content load** — a one-time pass, already async |
| conduit gravity-vs-pump | Δh | **construction / validation** — a build act, already async |
| `measure altitude` | elevation | **a verb** — already async |
| flow (the hot sync path) | the **ordinal** + declared catchment | — |
| contamination decay | ordinals | — |
| hydro output `ρ·g·Δh·Q` | Δh **fixed per structure** × live `Q` | Δh computed once at construction |

So elevation is *compiled* into two artifacts — **reach ordinals** and
**per-structure Δh constants** — in contexts that are already
asynchronous, and every runtime read is an integer compare or a scalar
multiply. `lookupField` stays exactly as it is; no `lookupFieldSync`, no
materialization stamp, and **no boot warming** (the pattern that has
failed in this codebase three times: nothing warms the roster, it reads
null forever, silently).

⚠ **What the discipline still applies to: the rain edge.** `Cultivable`
needs its covering **locality** on a sync reconcile. That is the supply
pack's own case and it has two shipped precedents — `lastAmbientK` (a
cached scalar another system writes) and `deviationFor` (a pre-resolved
`Locality` passed in). Whichever W1 picks, the ref gets **its own
checkpoint**: until it resolves, the stamp does not advance, so the
first successful resolve integrates the full backlog. **Unresolved must
never read as zero.**

### P1 — Kernel takes the physics; a `water` capability pack takes the works

The split follows arcana's membership test — *a capability pack holds
what other packs' content names*.

**Kernel** (every pack's content is affected by these, and they edit
shipped subsystems): zone elevation · the precipitation integral on
`WeatherApi` · the pressure fallback · the rain→soil edge.

**`water` pack** (`packages/content/water/src/`): `Watercourse`,
`Conduit`, `ControlStructure`, `StorageNode`, the `water-right`
document kind's validated save, and the build's own verbs.

The kernel never imports the pack. Where it must read a watercourse it
goes by shape or by MQL class name — the `HoldingView` seam the
residences build just established.

### P2 — The integral is designed ONCE, on `WeatherApi`, with two consumers

`WeatherApi.precipitationBetween(t0, t1, locality): Quantity<'mm'>` — a
pure segment walk summing `overlap × rate(type)`, with a segment cap for
long gaps.

It is weather's own data, so it lives on weather's face, and **both**
consumers call it: `Cultivable` multiplies by `getLandRequirementM2()`
for litres into a bed; the watershed multiplies by catchment area for
inflow to a reach. Designing it around one consumer and generalizing
later is the trap the requirements exist to avoid.

Snow accumulates rather than running off: the same walk, gated on the
segment's temperature, produces a pack depth that melts back into the
integral above freezing.

### P3 — Wave order is set by what each wave makes *provable*

Not by dependency alone. W1 ships an edge with an observable
consequence (a bed fills from the sky) before any of the watershed
exists, because it proves the integral end to end at the cheapest
possible scale. Elevation lands next because direction derives from it,
and nothing about a watercourse is meaningful before it.

### P4 — Reaches are ordinals until content puts a structure on one

`Watercourse` holds nodes, connections, control-point elevations and
catchment. `reachOf(place)` returns an ordinal. A `ControlStructure` or
a conduit **intake** is what makes a reach an addressable object, and
those are content decisions, not engine ones.

The ordinal is recomputed on content load (identity) and compared as an
integer at runtime (state).

### P5 — Monotonicity is structural, not checked

Control-point elevations are authored; intermediate reaches
**interpolate**. An uphill reach is unrepresentable. The only assertion
left is *source above mouth*, at parse, naming the offending points.

### P6 — Tests: kernel synthetic, content beside content

`lint:test-content` forbids kernel tests naming `/world/`. Every kernel
wave tests over `/test/**` fixtures; the Terminus watershed's own
assertions live in the locality pack. This bit the residences build
twice and the rule is now enforced.

### P7 — ⚠ Every new content field lands censused in the same commit

`lint:census` clause (d) now **fails** on a `data` key holding
path-shaped values that `refsOf` does not read. This build adds several
(`watercourse`, `intake`, `delivery`, `feeds`, `controls`), so each wave
that adds a field also teaches the census to read it. The gate exists
because a rename once cost the census 322 of its 462 refs silently; this
build will not be the thing that re-blinds it.

### P8 — The authority is a `Business`, and which one is content

The build supports three ownership forms (office · concession ·
cooperative) and ships none as canon. Terminus's works get an authored
owner in W8, and that choice is reversible content.

---

## Waves

### W0 — Grounding + the pack cut
**Files:** `packages/content/water/` (pack manifest, title claim,
`src/`); `docs/subsystems/watershed.md` skeleton.
**Proves:** the pack installs empty; `lint:untitled` and
`lint:instanceable` stay green.

### W1 — The precipitation integral + rain reaches soil
**Create:** `WeatherApi.precipitationBetween` + the authored rate table
(`rain`, `storm` precipitate; `snow` accumulates; `none` zero).
**Modify:** `Cultivable` gains the sky edge — resolve the covering
locality on the shipped pattern (P0), integrate on reconcile, call the
shipped `waterSoil`. The locality ref carries its **own checkpoint**.
**Proves:** a bed fills from the sky; a replay over the same interval
gives the same litres; a three-day absence integrates exactly; an
unresolved locality reads **unknown**, not dry, and back-fills on first
resolve. **Drought becomes possible for the first time.**

### W2 — Elevation as a zone field + the pressure fallback
**Modify:** `Zone` gains `elevation`; `BiomeLogic.resolvePressureFor`
falls back to deriving from it, authored value still winning.
**Proves:** elevation resolves through the ancestor walk with override;
`measure altitude` agrees with the zone; `coords.z` does **not**
contribute (the stairwell-is-not-a-waterfall test).

### W3 — `Watercourse`: topology authored, direction derived
**Create:** `Watercourse` (pack `Idea`) + the reach ordinal + catchment
declaration; `reachOf(place)`.
**Proves:** upstream/downstream agrees with elevation; a mouth above its
source fails at parse naming the control points; a lake is one node; a
terminus has nothing downstream; a distributary and a tributary use one
structure.

### W4 — Flow: the second consumer of the integral, plus snowpack
**Create:** flow at a reach = catchment integral − upstream draw +
snowmelt.
**Proves:** an upstream intake reduces flow below it; a full game year
produces a **spring rise and a late-summer low**; snow below freezing
accumulates and releases on melt.

### W5 — `Conduit`: the conveyance ladder
**Create:** `Conduit` (intake reach → delivery extent, capacity, owner,
state) + the closed six failure states + `analyze` on a source.
**Proves:** feasibility derives from Δh; a lift needs a pump and the
pump draws power; capacity refuses with `overdrawn`; delivery resolves
by longest-prefix extent; a sewer is the same object reversed.

### W6 — Storage + control structures
**Create:** `StorageNode` (reservoir · tower · cistern) and
`ControlStructure` (dam · headgate · weir).
**Proves:** a tower fills against Δh at an energy cost, supplies head,
and its **level survives a restart** (the build's one genuinely stateful
thing); a dam redistributes flow in time; a headgate in space; a canal
is a watercourse with a control at its head.

### W7 — Rights
**Create:** the `water-right` document kind + a validated save;
allocation by seniority; the per-window quota on the right.
**Proves:** prior appropriation records, dated and transferable;
riparian derives from parcel ownership with **no record**; both answer
one allocation query; an over-subscribed reach serves in seniority
order and the junior goes short; a quota refusal exposes no other
holder's draw.

### W8 — Contamination + the counterplay ladder
**Create:** contaminant level + kind on a water body; decay by kind;
`boil`; treatment as a conduit attribute; the toxin route through
metabolism.
**Proves:** an organic load decays downstream and a persistent one does
not; drinking fouled water doses; boiling prevents; an intake above an
outfall is clean and below it is not — **derived from terrain, authored
by nobody**.

### W9 — The three basins, the aqueduct, the drive, and the docs
**Create:** the home basin's watercourse through Terminus (the
Confluence, the falls, Hinkley's supply on the slope), the neighbouring
drainage, and the high empty third basin **over the ridge from
Rejection** (D20); the inter-basin aqueduct (D22); the works' owner
(P8); `watershed.md`; CLAUDE.md's one-line map entry.

⚠ **Authors no towns.** Rejection and Heart's Delight do not exist as
content and belong to their own locality builds — this wave lays the
water they will sit on and asks one declared field of them (D21).
**Proves:** the live drive — walk upstream (the valley IS the road,
D21), survey with an altimeter, find the outfall above the intake, and
see the season turn the flow down. Two localities in one basin resolve
an upstream/downstream relation; two in different basins resolve none.

---

## Risks

**1. ⚠⚠ The silent unresolved ref (P0), now scoped to the rain edge
alone.** Still the highest risk in the build, but a much smaller
surface than the first draft assumed.
Its failure is invisible and its tests pass, because a test that
hand-constructs the cached value never exercises the unresolved path.
Mitigation: every cached ref gets an explicit *unresolved* state with a
test that asserts it reads unknown and back-fills — written **before**
the happy path.

**2. Integrating from `t=0`.** Snowpack is a stateful integral over
weather history. Without a cap, a long-dormant place replays years.
Mitigation: the segment cap is part of W1, not deferred to W4.

**3. Over-modelling conveyance.** The pull toward pipe networks is
strong and the requirements forbid it. The test at review: *does this
add a node between an intake and a delivery?* If yes, it is out of
scope.

**4. Two elevations.** `coords.z` and zone elevation must never be
added together by accident outside the one documented expression. W2
ships the test that pins it.

## Critical files

- `api/weather.ts` + `platform/idea/api/WeatherLogic.ts` — the integral
- `lib/zone/Zone.ts` — elevation, and the async walk that forces P0
- `lib/husbandry/Cultivable.ts` — the first consumer, and `waterSoil`
- `platform/idea/api/BiomeLogic.ts` — the pressure fallback
- `api/document.ts` — the right, and `saveRelease` as its precedent
- `scripts/check-template-census.ts` — P7, every wave
