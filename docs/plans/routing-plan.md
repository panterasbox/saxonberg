# Routing — implementation plan

One traversal skeleton in the kernel, of which routing is one
accumulator; ten hand-written graph walks drained onto it; `media` /
`wheelPassable` / `conditional` denormalised onto the stored edge so a
lane is derivable from the index; a kernel plan value object that
carries directions, cost per axis and assumptions; planning against a
traveller's **knowledge** (the world index, or the player's own map)
with a caller-declared budget whose exhaustion is a stated refusal; a
`route` verb that plans without committing; and a ratchet
(`lint:graph-walks`) that holds the walk count at the residue.
Executes [routing-requirements.md](../requirements/routing-requirements.md).

**Kind:** infra (refactor/sweep in character). **Lead end:** kernel —
the primitive and the index changes land first; the three packs that
call the placeholder (`transport`, `trade-haulage`,
`trade-shopkeeping`) and the three that own a walk (`trade-mining`,
`trade-apiculture`, `energy`) migrate onto it.

⚠ **The justification is consolidation, not capability** (requirements
§ opening). Nothing here is blocked on a router; what is bought is one
honest primitive instead of ten, provably behaviour-preserving for the
four walks players can perceive.

---

## Grounding

Verified by opening files on branch `reqs/routing` at `49d7788bd`
(2026-10-08). Paths are repo-relative.

### The index and its maintenance

- **The projection** — `packages/server/src/mud/platform/idea/LocationGraphRegistry.ts`
  (601 lines). `writeTemplateNode(row, generation)` :400-416 builds a
  node from the **authored row** (`row.data`); `edgesOf(data)` :515-535
  reads exactly six spec fields off `data.exits[dir]`: `destination` →
  `to` + `toPath`, `bidirectional`, `oneWay`, `door`, `edgeMinutes` →
  `minutes`, `kind`. ⚠ It does **not** read `media`, `wheelPassable` or
  `blocked`, and it never touches a live `Exit`. **This is where the new
  per-edge fields get populated** (W5). `travelOf(data)` :545-568 reads
  a stop's `seatIn` + `routes[] {to, fee, departures}` by field name
  (recorded there as a lean on the tpa pack's names).
- Warms **lazily on first read** (`ensureWarm` :106-118, no `onCreate`);
  `rebuild()` idempotent by `generation`; `sweepStaleGenerations`
  :386-392. Reads: `node` :236, `nodesInZone` :242 (indexed),
  `nodesInExtent` :249 (`allNodes()` + JS prefix filter), `pointingAt`
  :255, `interzoneSkeleton` :261, `edgesIntoUnpublished` :267,
  `checkGraph` :283-291 — which passes `GraphInvariants` **only
  `nodes`**, so `destination-is-a-kind` (needs the constructor's `kinds`
  set) is **dead at runtime**. Every public method
  `@CallSecurity(FromTemplate('/platform/idea/api/navigation'))`.
- **The node record** — `packages/server/src/mud/lib/location/PlaceNode.ts`.
  `StoredEdge extends GraphEdge` :51-58 = `door?`, `minutes?`, `kind?`;
  `GraphEdge` (`lib/location/GraphInvariants.ts` :39-52) = `dir`, `to`,
  `toPath?`, `bidirectional?`, `oneWay?`, `slot?`. `fieldMeta` :62-74 is
  eleven plain `{persistent: true}` entries, no marshalling. :156-172
  explains there are deliberately **no finder statics** on it
  (`lint:lib-statics`); the queries are private methods on the registry.
  `NodeTravel` :40-49 = `role`, `boardLabel`, `routes[] {to, fee,
  departures}`.
- **Collection** — `packages/server/src/schema/location_graph.yaml`,
  indexes `identity` (unique), `zone`, `edges.to`, `crossesZone`
  (partial), `published`, `generation`; `reset: keep`. Adding
  non-indexed edge fields needs **no schema change** (`edges` is one
  persistent array field) — but the doc's field description should name
  them (W5; `lint:schema`).
- **The write chokepoint** — `packages/server/src/mud/platform/idea/hooks/DomainHook.ts`.
  `aroundSave` :39-49 projects after the write; `keepGraph` :101-139
  re-projects `extends:` children (cap 32), records findings as
  diagnostics, **swallows every throw**. `ParcelLogic.ts:221` calls
  `reprojectExtent` on a publish flip.
- **The Api + Logic** — `packages/server/src/mud/api/navigation.ts`
  (string-keyed; the file's own comment :133-140 says why `NavigationApi`
  is not on `lint:object-verbs`' exempt list and should not be) and
  `packages/server/src/mud/platform/idea/api/NavigationLogic.ts`
  (`registry()` :31-36 answers `null` before the warm — **a real
  answer**; the map half :196-262 `recordPlace` / `readMap` / `mapNow`
  reads `DocumentApi.readMaps` and **never the registry**; `growMap`
  :286-335 is the growth rule, keyed `(kind, place, dir, toLabel,
  channel)`).

### The player's map — what a map-plan has to work with

- `packages/server/src/mud/lib/location/MapClaim.ts`. `MapClaim` =
  `kind: 'place' | 'edge'`, `place` (the **durable handle**), `label?`
  (row path), `name?`, `group?`, `dir?`, `to?` (handle **iff resident
  at observation**), `toLabel?` (**the destination's template path**,
  always authored), `channel: walked | seen | searched | published`,
  `firstSeen`, `lastSeen`, `recordedBy`. ⚠ **No cost and no kind on an
  edge claim** today. `MapDocument = { locality, claims }`.
- `packages/server/src/mud/lib/location/Cartographer.ts` — the writer.
  `recordPerceived` :171-224 writes one `place` claim + one `edge` claim
  per obvious exit (`to: null`, `toLabel: far`); `recordTraversal`
  :255-296 writes a `walked` edge with `to` when the far side is loaded.
  ⭐ It reads the live `Exit` by structural shape
  (`getDirection`, `getDestinationTemplatePath`) — **it is standing at
  the exit**, so anything the exit answers about itself is earned. It
  imports no `PlaceNode` and no registry.
- ⭐ **The join a map-plan can make**: `SingletonMixin.getDurableHandle()`
  (`lib/stuff/Singleton.ts` :52) returns **the row path** for a
  singleton place, and every graph node is a singleton row
  (`location-graph.md § What is a node`). So an edge claim's `toLabel`
  (a row path) **equals** the far place's `place` handle whenever the
  far place is a template node. That is a string equality inside one
  document, not a join to the index.
- The `map` verb — `packages/server/src/mud/platform/idea/cmd/perception/MapController.ts`;
  its one read is `NavigationApi.readMap(viewerKey, prefix)`; afforded by
  `Avatar.commandContributions.self` (`lib/character/Avatar.ts` :251-257,
  with the reason: reading a map is a **player's** affordance). View at
  `packages/content/platform/content/platform/cmd/perception/map.yaml`
  (`locality` optional, greedy).

### The exit — what is authored and what is gated

- `packages/server/src/mud/lib/boundary/Exitable.ts` `ExitInstruction`
  :250-290: `kind?` (a row path; the kind's `class:` may be an Exit
  subclass), `door?`, `bidirectional?`, `hidden?`, `concealment?`,
  `blocked?`, `oneWay?`, `media?: string[]`, `wheelPassable?`,
  `edgeMinutes?`. **No `conditional`** field exists.
- `packages/server/src/mud/lib/boundary/Exit.ts` `allowsMode` :604-618:
  empty `media` ⇒ the ground pace family (`walk`/`sneak`/`run`); else
  `LocomotionApi.modeOf(name).getMedium() ∈ media` (⚠ sync, and the mode
  singleton must already be live — `LaneCatalogue.induce` :486-497
  loads it first for exactly this reason). `canTraverse` :933-1010:
  `blocked` → `unbuilt` → `unpublished` (`ParcelApi.isPathPublished`,
  sync) → `locked` → `door` → `exitMode` → … fourteen `TraversalGate`
  reasons :65-90. `Exit` stores no kind path on the instance; a kind
  row's `data:` hydrates onto the kind clone (:633-635, :722-733).
- **Exit kinds are rows.** `packages/content/platform/content/platform/idea/exits/passage.yaml`
  (the default, `class: /platform/idea/Exit`, authors nothing);
  `generic-objects/.../stuff/idea/exits/stair.yaml` (`media: [ground]`,
  `wheelPassable: false`). **The ford**:
  `packages/content/terminus/content/world/terminus/delight-road/exits/delight-ford.yaml`
  = `class: /system/transport/idea/FordExit`, `media: [ground]`,
  `wheelPassable: true`, `crossesReach: delight:mouth`,
  `floodThresholdM3S: 12`; named by `ford.yaml:39` (south) and
  `milestone.yaml:29`. The only conditional crossing in the realm.
- `packages/content/transport/src/idea/FordExit.ts` — `refreshCrossing`
  :122-143 (segment-memoised, sets `blocked`); `applyTraversal` :151-154
  refreshes then falls through. ⛔ **`refreshCrossing` is called from
  `LaneCatalogue.induce` :526-533 (duck-typed) and from its own
  `applyTraversal`, and nowhere under `packages/server`.** It is not in
  the projection path and cannot be (the projection reads rows).

### What is being replaced — transport

- `packages/content/transport/src/idea/LaneCatalogue.ts` (546 lines).
  `planRoute(from, to, laneKey)` :189-227: `laneOf` → null; `fromPath`
  not in `lane.adjacency` → null; **unweighted BFS** with a `prev` map;
  `Route.computed(laneKey, nodes, stops)`. `edgeMinutesBetween`
  :238-249 (live exit, else `transport.defaultEdgeMinutes`);
  `static exitBetween` :261-273 (live, `@internal`, deliberately not
  compiled). `compileLane` :417-465: authored `edges[]` → `link`; else
  `induce` :477-546 — a BFS over template-path strings from `d.seeds`,
  `StuffApi.singleton` per node, `MAX_LANE_NODES = 2_000` (:61) **aborts
  the whole walk**, admission = `refreshCrossing` (by shape) →
  `!isBlocked()` → `allowsMode(d.mode)` → `wheeled && isWheelPassable()`
  (`wheeled` is `d.mode === 'wheeled'`, a string compare :498).
  `CompiledLane` :66-80 = `key, name, mode, operator, nodes, adjacency,
  stops, authored`. Cache: one `loading` promise; `invalidateCache()`
  on HMR; no partial invalidation.
- **The four shipped lanes**
  (`packages/content/world-seed/content/stuff/idea/Lane/*.yaml`):
  `city` (mode `walk`, seed `/world/terminus/goods-yards/yard`), `spine`
  (`wheeled`, seed `/world/terminus/wharfside/bank`), `estuary`
  (`sailed`, seed `wharfside/bank`), `ferrow-tram` (authored edges
  adit ↔ pithead-yard, mode `""`). ⚠⚠ **No two lanes share a mode**, and
  an induced lane is by construction the whole component its mode
  reaches from its seed. See *Risks & opens* § AC1.
- `packages/content/transport/src/lib/journey/Route.ts` (91 lines) —
  `laneKey`, `nodes`, `stops`, `provenance`; `authored()` / `computed()`
  differ only in the provenance string; `@internal`. Carries **no cost
  and no directions**.
- `packages/content/transport/src/lib/journey/Journey.ts` — `advance()`
  :226-299 re-validates per leg, then `LaneCatalogue.exitBetween` +
  `isBlocked()`, then `LocomotionApi.engageAround` / `traverseWithDefault`
  and maps any throw to `route-blocked`. `budgetFor` :406-412 =
  `edgeMinutesBetween × modeFactor × loadFactor`. **Execution reads the
  ground live; it never reads the index.** Nothing here changes.
- `packages/content/transport/src/idea/cmd/movement/JourneyController.ts`
  (332 lines). `here` is always the actor's room (:82). `via` is
  **optional** (both args `required: false` in `journey.yaml`).
  `laneFor` :265-277: with `via`, the named lane must contain `here`;
  without, `candidates.find(l => l.nodes.includes(there))` — the **first
  lane in compile order**, `null` when no single lane spans both ends.
  `resolvePlace` :222-243 scopes name resolution to `lanesAt(here)`.
  **The Journey's mode is `lane.mode`** (:123-127); vehicles declare no
  mode (`packages/content/transport/src/lib/Vehicular.ts` — no `mode`
  field; `thing/HaulageRig.ts`, `Barge.ts`, `Coach.ts` likewise).
- **Callers of the catalogue**, exhaustively (grep over `packages/`):
  `JourneyController` (plan + `lanesAt` + `laneOf`), `Journey`
  (`exitBetween`, `edgeMinutesBetween`), `trade-haulage/src/behavior/hauls.ts`
  (`planRoute` :233 as a feasibility pre-check, result discarded, then
  `forceCommand('journey to <path> via <lane>')` :236; lane from
  `ctx.config.lane ?? 'city'`, home leg hard-codes `'city'` :152; a real
  pack→pack import :79-81), `trade-shopkeeping/src/behavior/consigns.ts`
  (`walkTo` :358-391 — singleton at a hard-coded path literal, duck-typed
  `planRoute(from,to,lane) → {nodes}`, lane `'city'`, then **re-derives
  each direction by scanning `room.getExits().entries()`** :378-384 and
  `forceCommand('go <dir>')`; called at :241 and :263-in-a-`finally`),
  `platform/idea/cmd/perception/SurveyController.ts` :222-228 (duck-types
  `lanesAt` only — not a search, untouched), and `residence/src/idea/ResidenceCatalogue.ts`
  (comment-only). ⭐ `trade-shopkeeping/src/behavior/stocks.ts` walks
  authored `ways:` (:39, :113-115, :236) and calls **no** router — it
  stays that way.

### The other walks

- **Family B** — shared `MAX_HOPS = 2`, `EXIT_TAU = 1.0` at
  `packages/server/src/mud/lib/perception/Modality.ts` :90-91, and
  :68-89 records the prior *"per-modality walks, not a generic walker"*
  decision.
  - `packages/server/src/mud/platform/idea/modalities/VisionModality.ts`
    `walkFluxAt(loc, depth, visited, skyFactor)` :306-489 — recursive
    DFS; depth gate **before** the visited mark (:313-316, so a node
    reached at depth 3 is *not* marked and stays reachable at depth ≤ 2
    by another path); legs (a) ambient (b) contents + one level into a
    carried container (c) fixtures (d) boundary anchors (e) doorless
    obvious exits with **five** hazard guards :459-477; cross-scope legs
    buffered into `spill` and merged once by `mergeCapped` :536-556
    (sum clamped to the brightest neighbour's illuminance, per-source
    rescale); area-aware (`readSizeScale` :559). No vacuum gate. Entry
    `walkLight` :96-108 (`signalAt` / `peakSignalAt` :91-94).
  - `SoundModality.ts` `walkAt` :117-209 — mark then `atmosphereBlocks`
    :95-97 → empty acc; depth-0 ambient floor :129-139; (b)(c)(d)(e)
    with `mergeAttenuated` :63-77 inline per child; three hazard guards.
  - `SmellModality.ts` `walkAt` :107-186 — **character-for-character the
    same exit leg as Sound**, `atmosphereBlocks` :103-105 duplicated
    verbatim; `finalize` :189-226 argmax with strict `>` (ties by walk
    order).
  - `packages/server/src/mud/lib/perception/AudienceGather.ts`
    `walkOutward(loc, sourceDb, depth, cumulativeTau, direction, visited,
    out)` :138-224 — **push-down**: emits one `AudienceArrival {sensor,
    db, direction}` per sensor in **pre-order** (:154-158), carries
    `cumulativeTau × tau × PER_HOP_TAU` (`0.01`, :86), two depth gates
    (:147, :160), first-hop direction via `directionThroughBoundary`
    :122-131. Callers `lib/message/Scene.ts` :326 (iterates `out` in
    order, filters by threshold) and `CallController.ts:81`.
  - ⚠⚠ All four thread **one mutable `visited: Set<stuffId>`** through a
    DFS, so neighbour order decides which room is charged at which
    depth — and for the gather, the delivered dB *and* the printed
    compass direction.
  - Duplication to delete: `atmosphereBlocks` + `inlineAtmosphere` in
    **3** copies (Sound, Smell, AudienceGather); Vision's hazard-guard
    block in **4** (`lib/biome/Atmospheric.ts` :894-905 and :972-985 say
    in comments that they copied it).
- **Family C** — `packages/content/trade-mining/src/lib/Working.ts`.
  `airAt()` :650-667: level BFS (`frontier = next`), `seen` marked **on
  enqueue**, `AIR_REACH = 12` (:184) both the bound and the divisor;
  early return at the first `breathes(room)` (:903-914 — ventilated, or
  any neighbour in another zone); reads `getExits()` via
  `destinationsOf` :930 (hidden exits included; throw-guarded). ⚠ Not
  pure: `settleAir` :682-690 writes `_atmosphere`. `refreshAir()`
  :858-874 is the same walk with bound `AIR_REACH * 2`, visit-all,
  `await room.airAt()` per room; called from `MineWarren.ts:518`. Both
  order-independent (depth is what is read; `breathes` reads topology
  and `getVentilated`, not `_atmosphere`).
- **Family D** — `packages/content/trade-apiculture/src/thing/Hive.ts`
  `forageCensus()` :795-890, memoised on a 3600 s stamp. FIFO BFS;
  `visited: Set<Stuff>` (object identity) marked **on dequeue** and
  re-checked on enqueue (:815-816, :868); frontier carries `minutes`;
  `FORAGE_HOP_CAP = 12` (:106) counts **dequeued unique nodes**;
  `rangeMinutes` dial (default 40) is a **cost** cap, applied twice —
  `minutes >= rangeMinutes` stops expansion (:860), `next > rangeMinutes`
  refuses the leg (:872); edge cost `exit.getEdgeMinutes() ?? defaultEdge`
  (:870); `getObviousExits()`; accumulates a `sources` map, a `hives`
  count and a `flowering` list (later mutated by `repayForage` :947).
  Plain BFS, so `minutes` is first-discovered, not cheapest.
- **Family A, the rest** — `packages/content/energy/src/idea/GridCatalogue.ts`
  `bfs(ref, succ)` :579-590 over a compiled successor map, **no
  bound**, mark-on-dequeue, driven all-pairs at compile (:539-541).
  `packages/server/src/mud/lib/location/GraphInvariants.ts`
  `#reachability` :344-394 — per-zone BFS from the derived entrances,
  refuses to leave the zone; `#far(edge)` :396-402 resolves `to` then
  `toPath`. Seven rules, `GRAPH_RULES` :74-82.

### Tests that constrain the rewrite

- `packages/server/src/mud/world/__tests__/logistics-forcing-function.test.ts`
  :83-85 — **source-text**: `expect(code).toMatch(/async function walkTo\(/)`,
  `/forceCommand\(`go \$\{/`, `/planRoute/`. Retiring the identifier
  fails it.
- `packages/content/trade-distilling/src/__tests__/distilling.test.ts`
  :144-157 — a **stub catalogue by shape** (`class TestLaneCatalogue
  extends Idea { planRoute(from, to) }` — two params) so the `consigns`
  hand can walk floor → counter; its own comment says a shape drift
  makes the walk silently stop.
- `packages/server/src/mud/world/__tests__/logistics-corridors.test.ts`
  :102-116 — **re-implements the mode gates** *"mirrored from
  `Exit.allowsMode`"* (`admitsOnFoot`, `admitsWheels`, `admitsBoat`) over
  the YAML rows; `reachable()` :119 is an eleventh walk, in a test.
- `packages/content/transport/src/__tests__/Journey.test.ts` :125 —
  every route is built via `ctx.cat.planRoute(P(0), to, 'road')`;
  `Lane.test.ts` (:50 wheeled lane stops at a wheel-refusing exit, :92
  authored-edge lane needs no exits, :158 two lanes share an edge, :171
  blocked exit off every lane); `Route.test.ts` (:37 authored ≡ computed
  but for provenance, :57 express/local, :112 null not empty, :121
  mints nothing). Fixtures in `transport-fixtures.ts` (`corridor()`,
  `installRooms`, `installRows` over a `PersistApi.find` seam).
- **No tests** for `JourneyController`'s arg handling / `laneFor` /
  `via`, for `hauls.ts`, or for `consigns.ts` behaviour.

### Gates, checked at the instrument

- `lint:object-verbs` (`scripts/check-object-verbs.ts`) — CI-gating at
  **zero**; a public static on an `*Api` under `src/mud/api/` whose
  **first parameter type mentions `Stuff` or a `lib/**`/`platform/**`
  class**. `NavigationApi` is not exempt. ⇒ every new Api method is
  string/plain-data keyed; a traveller profile is plain data.
- `lint:lib-statics` (`scripts/check-lib-statics.ts`) —
  `LIB_STATICS_CEILING = 339` at :217, **zero headroom**. Counts public
  static methods in exported non-`Api` class declarations under the
  kernel's `lib/` and `platform/` and every pack `src/`; a **class-level
  `@internal`** is counted separately and excluded (:309-337, :355-376);
  statics inside a mixin factory's returned class are out of scope.
- `lint:thin-forwarder` — does not flag `return logic().m(...)`.
- `lint:whole-table` (`scripts/check-whole-table.ts`) — a ratchet at
  zero on `.find`/`.filter`/`[0]` immediately after a whole-table read.
  ⚠ The registry's own `nodesInExtent` is a private `allNodes().filter`
  (inside the owner — the gate's stated exemption). A materialised
  adjacency built from `allNodes()` with **no narrowing at the call
  site** is not what it counts, but the materialisation belongs inside
  the registry (D6) for the same reason.
- `lint:drive-scripts` — a drive is born a wire file:
  `packages/wire/tests/<feature>.wire.test.ts` (or `.dirty.`).
- `lint:location-graph` (`scripts/check-location-graph.ts`) — reads
  rows on disk; `CEILINGS` :110-118 (errors `null`, four censused
  questions). Its enumeration and `effectiveRow`/`extendsAny` live in
  `scripts/pack-roots.ts`. The precedent for a ratchet that ships first.
- `lint:unconsumed-seams` — an authored field with no reader outside
  its file is a finding. Every field this build adds has a named reader
  (§ Reachability wiring).
- Also applicable: `lint:imports` (no `fs`/`path`/`yaml`/`../backend`
  in the mudlib; `scripts/` are exempt and already import them),
  `lint:module-scope`, `lint:instanceable`, `lint:schema`,
  `lint:test-bootstrap`, `lint:verb-collisions`, `lint:gates`,
  `lint:mixin-names` (no new kernel mixin here), `lint:field-meta`.
  `lint:family` derives its roster from `package.json`.
- The gym split: `packages/server/vitest.config.ts` `GYM_TESTS` is the
  single source of truth for tests that run under `pnpm test:gym` (own
  CI job) and not `pnpm test`; `scripts/__tests__/*.test.ts` may import
  `scripts/pack-roots.ts`. In-process world standup precedent:
  `packages/content/terminus/src/__tests__/terminus-standup.integration.test.ts`
  (loads seed YAML from disk into the `backend-store` stub, strips
  `cast:`, clones rooms lazily by path). `AppSettings` keys seed from
  `packages/content/platform/content/settings/<area>.yaml` (merge-missing)
  and are read through `AppApi` (`transport.defaultEdgeMinutes` is the
  shape; `AppSettingKeys` in `lib/config/AppSettings.ts` :423).

---

## Plan-level decisions

### D1 · The skeleton is **synchronous over a materialised neighbour function**; callers materialise async first (E1)

Family B's entry points are sync (`signalAt` returns `Light`); family
A's index reads are async; family C's `airAt` is async only because
`settleGas` is. One skeleton cannot be both, and making the walk async
would change family B's call shape across every modality consumer.

**Choice:** `Traversal` is a pure synchronous value class. Its
`neighbours(node, depth)` callback is synchronous and returns an
**ordered** list of `{ node, leg }`. Async callers (`routeBetween`,
`reachFrom`, `costMatrix`, the lane compile) first materialise a
`KnowledgeGraph` — the index's nodes for the world source, or the
claims for the map source — and then walk it synchronously. That is
also exactly the shape of hierarchical search (load a zone's nodes
async, walk them sync), which is deferred (§ Deferred seams) but
costs nothing to keep open. `refreshAir` keeps its per-room `await
room.airAt()` by first collecting the rooms with a sync `reach` and
then awaiting over the result list — identical semantics, since
`airAt` reads topology and `getVentilated`, never the field it writes.

**One skeleton, three orders** (D3), not two skeletons.

### D2 · Where it lives: a `lib/location/` value class with **instance methods**; the index-backed accumulators are the Api's (E2)

`lint:lib-statics` has no headroom; `PlaceNode` has no finder statics
by decision; `lint:object-verbs` refuses an Api static whose first
parameter is a world object — and family B/C/D walk **live places**.

**Choice:**

| piece | where | shape |
|---|---|---|
| the skeleton | `lib/location/Traversal.ts` | one exported class, constructed with a `TraversalSpec<N, R, C>`; **no public statics**; `walk(start)` and `walkFrom(starts)` instance methods |
| the materialised graph | `lib/location/KnowledgeGraph.ts` | `@internal` value class over `{ identity, edges: StoredEdge-shaped[] , published }[]`; its two builders (`fromNodes`, `fromClaims`) are statics on an `@internal` class — counted separately, excluded from the ceiling (the gate's own stated escape) |
| the declared traveller | `lib/location/TravelProfile.ts` | a plain-data interface + a value class with `admits(edge)` — the one place the admission rule is written |
| the plan | `lib/location/RoutePlan.ts` | a plain value object (D8) |
| the three index-backed accumulators | `NavigationApi.routeBetween` / `reachFrom` / `costMatrix` → `NavigationLogic` | string-keyed, plain-data profile, caller-declared budget |

Live-place walks (modalities, the gather, mine air, forage) construct
`Traversal` directly — a pack imports it by package specifier like any
`lib/` substrate (`@saxonberg/server/mud/lib/location/Traversal`). The
requirements say *"one parameterized traversal on `NavigationApi`"*;
read strictly that would put a `Stuff`-first static on the Api, which
`lint:object-verbs` refuses at zero. The primitive is the class; the
Api carries its string-keyed uses. `lint:graph-walks` (D11) is what
makes *"one traversal"* literal: it counts every frontier-loop outside
`Traversal.ts`.

No new subsystem folder: `lib/location/` already owns `PlaceNode`,
`GraphInvariants`, `MapClaim`, `Cartographer`.

### D3 · The visitor contract: pre-order `enter`, post-order `fold`, a `descend` carry, three orders (E3)

Family B needs fold-up with attenuation and **per-node merge policy**
(vision merges all spill once; sound merges per child); the gather
needs push-down with a running product and **pre-order emission**
(`Scene` consumes `out` in order); family C needs visit-all with early
halt; family D needs a carried cost with a three-way heterogeneous
accumulator.

**Choice:** `TraversalSpec<N, R, C>`:

```ts
interface TraversalSpec<N, R, C = void> {
  order: 'depth-first' | 'breadth-first' | 'cheapest-first';
  keyOf(node: N): string;                     // visited identity (stuffId · path · NodeRef)
  neighbours(node: N, depth: number): readonly Leg<N>[];   // ORDERED; the caller's own guards live here
  bound: Bound;                               // D4
  /** carry transform along a leg; return null to refuse the leg (cost caps, admission) */
  descend?(carry: C, leg: Leg<N>, depth: number): C | null;
  /** pre-order. Return a value to short-circuit this node with it (vacuum → empty acc);
   *  return 'halt' to stop the whole walk here (airAt's first breathing room). */
  enter?(node: N, depth: number, carry: C): R | 'halt' | undefined;
  /** post-order: the node's own contribution plus its children's results, in neighbour order */
  fold(node: N, depth: number, carry: C, children: readonly { leg: Leg<N>; result: R }[]): R;
  /** cheapest-first only: the leg cost on the axis being minimised */
  cost?(leg: Leg<N>): number;
  visited?: Set<string>;                      // caller-threaded when a walk shares one across calls
}
interface Leg<N> { node: N; dir?: string | null; tau?: number; minutes?: number | null; edge?: unknown }
```

The skeleton owns exactly: the depth gate **before** the visited mark
(so family B's "unmarked at depth 3" behaviour is preserved), the
visited set, the node-count and cost bounds, the recursion / queue /
priority queue, and the `expanded` count. `fold` runs on every node
the skeleton entered (including leaves, with `children = []`).
`depth-first` recurses in `neighbours` order; `breadth-first` marks
visited **on dequeue** and re-checks on enqueue (family D's and
`induce`'s shape — `airAt`'s mark-on-enqueue yields the same depth per
node, which is all it reads); `cheapest-first` is Dijkstra with a
deterministic tie-break on `keyOf`.

⛔ **No policy in the skeleton.** Hazard guards, atmosphere refusal,
`published`, mode admission — all inside the caller's `neighbours` /
`descend`. The result of `walk()` is `{ result: R, expanded: number,
exhausted: 'nodes' | null, halted?: N }`.

### D4 · Bounds: hops · nodes · cost, and only **nodes** is the budget (E4)

`Bound = { hops?: number; nodes?: number; cost?: number }`, any
combination. `hops` and `cost` are **natural limits** (the walk simply
does not expand past them — `MAX_HOPS`, `AIR_REACH`, `rangeMinutes`);
`nodes` is the **budget**: reaching it sets `exhausted: 'nodes'`, which
every index-backed accumulator turns into the stated refusal
`{ ok: false, reason: 'budget', expanded }` — distinguishable from
`'no-way'`. The budget is a **required** parameter of `routeBetween` /
`reachFrom` / `costMatrix` with no default: *every search spends a
caller-declared budget*. The four per-caller magic numbers survive as
four callers passing their own (`MAX_LANE_NODES`, `FORAGE_HOP_CAP`,
`AIR_REACH`, the grid's node count), and the `route` verb's comes from
an `AppSettings` key `navigation.attendedSearchBudget` (default `400`,
seeded by `platform/content/settings/navigation.yaml`) so the drive
can lower it with `config`.

### D5 · `conditional` is authored on the exit **kind** row and projected like `media` (E5)

The index is a projection of authored rows; whether a ford is flooded
cannot be in it (requirements § *Runtime conditions are not in the
index*). What the row **does** know is that the way is *the kind that
closes*. Deriving that from the kind's `class:` would need the
projection to resolve classes, and a source-text check for
`refreshCrossing` is a heuristic with one implementer.

**Choice:** `ExitInstruction` gains `conditional?: boolean`, applied to
a new `Exit.conditional` field (`isConditional()`), hydrated on the
kind clone like `media`. `delight-ford.yaml` authors `conditional:
true` (one line; the kind, not the two edges that name it). The
projection reads `spec.conditional === true` **or** the named kind
row's effective `data.conditional === true` (`Template.findByPath(kind)`
— one read per kinded edge; kinds are few) and stores
`StoredEdge.conditional`. `lint:location-graph` gains an **error** (not
a ceiling), and it is phrased **by shape only**: a kind row whose class
file overrides `applyTraversal` *and* names `blocked` must declare
`conditional: true`.

⚠⚠ **Deliberately NOT "extends `FordExit`".** An earlier draft named
that class as the primary test with the by-shape rule as a fallback.
`check-location-graph.ts` is a **kernel** gate and `FordExit` is the
**transport pack's** class; a kernel gate enumerating pack classes is
the coupling this repo refuses everywhere else, and the lane compile
already demonstrates the alternative by asking for the refresh protocol
**by shape**. If the by-shape test is sufficient — and it is, because
that is exactly what a conditional exit does — the class name is
redundant as well as coupled. ⭐ A tidal causeway is then caught with no
kernel edit at all, which was the point of putting `conditional` on the
base `Exit` in the first place.

⚠ The honest residue, stated: a conditional exit class that closes by
some other means than `blocked` plans without the caveat until the
shape test is widened. That is a content rule with a gate, which is the
shape this repo accepts for authored facts.

The lane compile's `refreshCrossing` call goes away with `induce` (W7);
`applyTraversal` keeps the ford current for every traverse, which is
where the requirements put the verdict. **The stated behaviour swap:** a
`journey` will now plan over a flooded ford and discover it at the leg,
with the plan having said *"this way crosses the ford at Kestrel; it is
not always passable."*

### D6 · Knowledge sources: the world index materialised **inside the registry**, the map materialised from claims — and the core cannot import the index (E6 half, the firewall)

```ts
type Knowledge =
  | { source: 'world'; extent?: string }              // unattended: a brain, a compile
  | { source: 'map'; maps: readonly MapDocument[] };  // attended: a person's own claims
```

- **World.** `LocationGraphRegistry` gains `graphView(extent?)`: a
  `KnowledgeGraph` built from its nodes, **cached per `generation`**
  (the rebuild already stamps one; a cache keyed on it is dropped by
  every sweep for free). The `extent` filter is a prefix over identity
  — *scoping to an extent is a thing an author may choose*. 124 nodes
  today; the materialisation is one `allNodes()` inside the owner.
- **Map.** `KnowledgeGraph.fromClaims(maps)` builds nodes from `place`
  claims and edges from `edge` claims: `to = toLabel` (D-grounding: a
  singleton handle **is** its row path, so the equality is inside the
  document), `minutes` and `conditional` from the claim when recorded
  (D9), `published` always true (you cannot know otherwise — and an
  unpublished far side is still the live gate's at the traverse).
  Where two claims disagree about one `(place, dir)`, **both edges are
  admitted** and the plan's assumption names the disagreement — a map
  that can be wrong routes over what it believes.
- ⭐⭐ **Structural isolation.** `Traversal.ts`, `KnowledgeGraph.ts`,
  `TravelProfile.ts` and `RoutePlan.ts` are the **core**, and the core's
  import list is gated by `lint:graph-walks`' second check: none of
  them may import `PlaceNode`, `LocationGraphRegistry`, `DocumentApi`,
  `StuffApi` or anything under `api/` — only types from `MapClaim.ts`
  and `GraphInvariants.ts`. `NavigationLogic.routeOnMap(viewerKey, …)`
  is a separate method from `routeBetween(…, { source: 'world' })`;
  the former's only reads are `DocumentApi.readMaps` → `fromClaims` →
  core, and a unit test pins that a map plan completes **with the
  registry absent** (`registry()` → `null`) and with
  `LocationGraphRegistry.prototype.*` never called (spy). The map
  **writer's** precedent (does not import `PlaceNode`) is applied to
  the reader as the requirements ask.

### D7 · Admission is data: `TravelProfile.admits(edge)` is the one admission rule, and the corridors test reads it

```ts
interface TravelProfile {
  mode: string;             // 'walk' | 'wheeled' | 'sailed' | …
  medium: string | null;    // the mode's medium, resolved by the CALLER via LocomotionApi.loadMode
  wheeled?: boolean;        // the residue media cannot express
}
```

`admits(edge)`: `edge.media` empty ⇒ `mode ∈ {walk, sneak, run}`; else
`medium ∈ edge.media`; and `wheeled ⇒ edge.wheelPassable !== false`.
Mirrors `Exit.allowsMode` + `isWheelPassable` exactly, over plain data.
⚠ `blocked` is **not** admission: a blocked authored edge is **dropped
by the projection** (`edgesOf` skips `spec.blocked === true`, W5), the
*dropped-if-blocked* row of the requirements' table. `published` on
the far node is a **knowledge** fact (world source only) — the search
does not enter an unpublished node.

`logistics-corridors.test.ts` replaces its three mirrored predicates
with `new TravelProfile(…).admits(spec)` over the YAML (`ExitSpec` is
`StoredEdge`-shaped for these fields) and its `reachable()` with a
`Traversal` reach — the test's own copy of the walk is the eleventh and
it goes too.

### D8 · The plan value object is the kernel's `RoutePlan`; transport's `Route` **stays** and is built from it (E6)

```ts
interface RouteLeg { from: string; to: string; dir: string; minutes: number | null; conditional: boolean }
interface RouteAssumption {
  kind: 'conditional' | 'stale' | 'unmeasured' | 'disputed';
  leg: number;
  text: string;                                  // the sentence the verb prints
  claim?: { channel: MapChannel; lastSeen: number };   // map source only — the planner's OWN evidence
}
interface RoutePlan {
  source: 'world' | 'map';
  profile: TravelProfile;
  nodes: readonly string[];
  legs: readonly RouteLeg[];
  cost: { minutes: number; legs: number; conditional: number; unmeasured: number };
  assumptions: readonly RouteAssumption[];
}
type RouteOutcome =
  | { ok: true; plans: readonly RoutePlan[]; expanded: number }   // non-dominated set, ≥ 1
  | { ok: false; reason: 'unknown-origin' | 'unknown-destination' | 'no-way' | 'budget' | 'graph-cold';
      expanded: number; breakAt?: { node: string; dir: string; needs: readonly string[] } };
```

`directions` are on the leg (consigns needs them; `Route` has none).
`Route` keeps `laneKey`, `nodes`, `stops`, `provenance` — the stop set
is a lane concept and `Route.test.ts` pins its contract; the Journey
cannot tell computed from authored (AC15n of logistics) and still
cannot. `JourneyController` calls the existing `Route.computed(label,
plan.nodes, stops)` — **no new static** on the pack class.
`Journey.budgetFor` keeps reading the live exit's minutes: execution is
the ground's.

**Non-dominated set (AC12):** three axes — `minutes`, `legs`,
`conditional`. One `cheapest-first` walk per axis (lexicographic
tie-break `minutes` then `legs` then identity), distinct node
sequences kept, dominated ones dropped. ⚠ This is a **subset** of the
Pareto front, stated plainly; a full multi-objective search is not
bought for a realm with three corridors. A fixture diamond (short +
conditional vs long + safe) proves two plans come back.

**Mode break (AC6):** when the mode-admitted search finds no way, run
the same search with every medium admitted (counts against the same
budget); if *that* finds a way, the first leg the profile does not
admit is `breakAt`, and the refusal reads *"the way stops at <node>:
<dir> needs <media>"*. Otherwise `no-way`.

### D9 · A `walked` claim records `conditional` only — a free walk teaches no duration

⚠⚠ **Revised after the lens pass** (requirements § *A route reports cost
in the currency that traveller will pay*). An earlier version recorded
`minutes` too, on the argument that the walker stood at the exit. The
argument does not survive lens 1: ordinary movement is **instantaneous
and free** by deliberate design, so a walker who crossed in zero game
time **did not learn how long the way takes**. `edgeMinutes` is what a
Journey spends, and recording it from a free walk would write a number
the world never charged.

So `recordTraversal` records **`conditional`** on `walked` claims — you
saw that it was a ford — and no duration. `recordPerceived` records
neither (a glance measures nothing). `growMap`'s key is unchanged (the
field is an attribute, not identity).

A map plan therefore costs in **legs**, and every leg is `unmeasured`
for minutes — which is honest and is exactly what a pedestrian is
answered in anyway (D4a). `stale` assumptions cite `channel` +
`lastSeen` (*"assumes the ford is passable — you walked it 40 days
ago"*). ⛔ Nothing in an assumption comes from the index; the unit test
for `routeOnMap` asserts the assumption text is derivable from the
claims alone, with the registry absent.

### D4a · A plan quotes cost in the currency the traveller pays

⭐⭐ The lens pass's one code-changing finding. `logistics.md` keeps
ordinary movement instantaneous and free — *"a player who types `go
north` eleven times crosses the same ground in zero game time"* — and
`edgeMinutes` is spent **only** by a Journey. A plan that answers
*"about forty minutes"* and is then walked for nothing has taught the
player a figure the world declines to collect, and *distance is
duration* is the pedagogy this build rests on.

`RoutePlan` therefore carries every axis it measured, and the
**renderer selects by profile**: a `walk`-profile traveller is answered
in **legs and what is in the way**; a conveyance profile is answered in
**minutes**, because a conveyance pays them. No new field — the plan
already carries cost per axis (D8) — one branch in the `route`
controller and in `journey`'s readout. ⚠ A pedestrian must never be
shown a minutes figure; that is a drive failure, not a cosmetic one.

### D10 · `planRoute` retires outright; both pinning tests move in the same wave (E7)

No deprecated forward. `LaneCatalogue.planRoute` is deleted in W7 with
its three callers migrated and: `logistics-forcing-function.test.ts`
:85 updated to `/NavigationApi\.routeBetween/` (the walk-not-teleport
property it protects is unchanged: `/async function walkTo\(/` and the
`go` match stay); `distilling.test.ts`'s `TestLaneCatalogue` replaced
by `vi.spyOn(NavigationApi, 'routeBetween').mockResolvedValue(…)` — a
**typed** seam that drifts loudly, which is the fix for its own
recorded hazard; `Journey.test.ts` builds its `Route` via
`Route.computed('road', nodes, stops)` directly (the Journey never
cared who made it). `lint:thin-forwarder` is unaffected.

### D11 · `lint:graph-walks` — the detector, the allowlist, the two checks (E8)

`packages/server/scripts/check-graph-walks.ts`, `--lint` CI-gating,
self-enrolled. Walks the kernel `src/mud/**` and every pack `src/**`
(`pack-roots.packSrcFiles`), tests excluded, via the `typescript` AST
(the `check-object-verbs` precedent). **A function body is a walk when
it contains all three:**

1. a frontier — a `for`/`while` loop **or** a call to the enclosing
   function's own name (recursion);
2. a visited set — one identifier receiving both `.has(` and `.add(`
   (or `.set(`) in the body;
3. an adjacency read — any of `getExits(`, `getObviousExits(`,
   `getObviousNeighbours(`, `.edges`, `adjacency.get(`, `succ.get(`,
   `destinationsOf(`, `neighboursOf(`.

Allowlisted: `lib/location/Traversal.ts`. The opening ceiling is **what
the first run measures** — expected to find the ten in the requirements'
census plus whatever the census missed (`FireLogic` :355-362 has a
visited set and a loop and is out of scope by decision; it stays in the
residue **with its reason in the script**). The ceiling may fall and
never rise; W9 lowers it to the residue and lists each remaining site.

**Second check, same script:** the core's import allowlist (D6). A core
module importing anything outside `./GraphInvariants`, `./MapClaim`,
`./TravelProfile`, `./RoutePlan`, `./KnowledgeGraph`, `./Traversal` is
an **error** with no ceiling.

### D12 · The characterization fixture is a gym test over an in-process world, with a committed golden (E9)

Family B's walks are sync functions over live rooms, so the wire tier
cannot reach them; a per-file boot of the whole content tree is too
slow for `pnpm test` and too load-sensitive (the standup's 5 s cliff).

**Choice:** `packages/server/scripts/__tests__/perception-characterization.gym.test.ts`,
added to `GYM_TESTS` (own CI job, not `pnpm test`). It:

- enumerates **every place row** from every pack by class
  (`pack-roots.templateRows` + `effectiveRow` + `extendsAny` over the
  location roots + `composesMixin(SingletonMixin)` — the
  `check-location-graph` derivation, never a path infix), strips
  `cast:` (the standup's move), installs the rows into the
  `backend-store` stub, and clones each place with `StuffApi.singleton`
  (exits resolve neighbours lazily, so the whole realm comes up);
- plants one **probe sensor** (a minimal hearing `Sensor` composer, the
  `AudienceGather` tests' shape) in every place, so the gather has
  something to reach in every neighbour and a direction to print;
- for every place, in sorted-identity order, captures:
  `vision.signalAt` **and** `peakSignalAt` (lux, band, source count and
  colour temperature), `sound.signalAt` (dB, sources), `smell.signalAt`
  (ppm, identity), and `AudienceGather.gather(place, 60)` as an ordered
  list of `{ probeOf, db (3 dp), direction }`;
- compares the whole document to `scripts/__tests__/golden/perception-characterization.json`;
  `--update` (an env flag) rewrites it. The first commit (W1) writes the
  golden from the **unmigrated** walks; W3 must match it byte-for-byte.
  A `beforeAll` with its own budget pays the standup once.

Families C and D are pinned by their own pack suites
(`trade-mining/src/__tests__`, `trade-apiculture/src/__tests__`), which
already assert reach and radius numbers; the requirement's fixture is
family B's.

### D13 · `journey` without `via` plans by the **vehicle's mode** over the whole mode graph; `via` restricts to a named lane; the lane label is derived deterministically

A lane of mode M is M's induced subgraph (Grounding); two lanes of one
mode are either one component or disjoint ones. So *"across more than
one lane of the same mode"* is, structurally, *"over M's whole graph
rather than one compiled lane's node list"*, and the lane name becomes
a **label** on the plan rather than a search scope.

- `VehicularMixin` gains `travelMode: string` (authored; `HaulageRig`
  and `Coach` rows say `wheeled`, `Barge` says `sailed`). The Journey's
  mode comes from the vehicle. (Today it comes from the lane; a lane
  was the only thing that knew.)
- Without `via`: `routeBetween(here, there, profile(vehicle.travelMode),
  { source: 'world' }, budget)`; the **label** is the sorted list of
  lanes (by `key`) whose node set covers consecutive legs — *"along the
  spine, then the city streets"* — the same on every run.
- With `via`: the named lane must contain `here`, and `neighbours` is
  filtered to that lane's node set (the lane as a restriction the
  traveller chose). ⭐ The resolver `resolvePlace` keeps scoping names to
  `lanesAt(here)` — what the roads from here reach is still the honest
  offer.
- `hauls.ts`'s `travel()` drops its discarded `planRoute` pre-check and
  the `via` on the forced command (the verb now plans), keeping
  `ctx.config.lane` as an optional `via`; `knows: <extent>` and
  `searchBudget` become brain config, read into `Knowledge` and the
  budget. The home leg stops hard-coding `'city'`.
- `consigns.ts`'s `walkTo` calls `NavigationApi.routeBetween(here,
  counter, profile('walk'), knowledge, budget)` and walks
  `plan.legs[i].dir` — the direction-rescan goes.

### D14 · The `route` verb is kernel, afforded by `Avatar`, and resolves its destination **against the map only**

`packages/content/platform/content/platform/cmd/movement/route.yaml` +
`platform/idea/cmd/movement/RouteController.ts`, added to
`Avatar.commandContributions.self` beside `map.yaml` (same reason: the
document is the person's). `route to <place> [by <mode>]`; both args
`required: false` (⚠ a required arg with no default fails closed and
silent); the controller refuses a missing destination in words.

The destination is resolved against the actor's **own claims**
(`name`, `label` leaf, `toLabel` leaf, `place` leaf) and nothing else:
a name matching no claim is *"you do not know the way to X"* — the
same refusal as a known name with no claimed path (drive step 4), and
**never** a world lookup. Mode default `walk`; `by wagon` ⇒ `wheeled`,
`by boat` ⇒ `sailed` (a small word table in the controller; the mode
roster is `LocomotionApi.loadMode`'s to validate). Budget from
`navigation.attendedSearchBudget`. Renders to self the plan(s): the
way as directions, the cost line **selected by profile** (D4a), each
assumption; a `budget` refusal says *"I could not work out a way that
far"*; starts nothing. No card (a plan is not a Stuff; `map-slate`'s
renderer owns that).

⚠⚠ **Every place in player-facing output is named by what it calls
itself**, resolved through the registry with the path leaf only as a
fallback — never a template path and **not the bare leaf** either. This
verb consumes template paths and durable handles end to end, which is
precisely the shape that shipped a casualty list printing
`/world/terminus/...` at a player in the identity build. A path or a
raw leaf appearing in `route`'s output is a **drive failure**, not a
cosmetic one.

⭐ **A second form, `route between <a> and <b>`**, answers the cost per
pair and nothing else — it is the typed reader for `costMatrix`
(requirements AC11). It offers **no way to ask for an order**, because
deciding the order is the activity (requirements § *A tour is not
ours*). Without this form the matrix would ship as declared capability
with no reader, which is the failure mode this repo keeps paying for.

### D15 · Scheduled and service legs are refused; the seam is the leg vocabulary, unproduced

`RouteLeg` has no `kind` this build — a vocabulary with one live value
and one imaginary teaches the wrong shape (the `told`/`bought` lesson).
A node's `travel` block is **not** an edge for the search; a plan ends
at the terminal. The requirements' *"a plan may contain a leg that
says take the service"* is recorded in § Deferred seams as the shape it
would take (`fast-travel-slate`).

---

## ⭐⭐ Host placement

| new thing | host | what composing/placing it claims about everything else on that host |
|---|---|---|
| `Traversal` (class) | `lib/location/Traversal.ts` — a value class, never composed, never instanced from a row | nothing about any Stuff; it is `Light`/`Quantity`-shaped substrate |
| `KnowledgeGraph`, `TravelProfile`, `RoutePlan` | `lib/location/` value classes / interfaces | same; `KnowledgeGraph` is `@internal` (its callers are `NavigationLogic` and the registry) |
| `graphView(extent?)` | `LocationGraphRegistry` (private cache, public method gated like its siblings) | the registry already owns every whole-index read; the cache rides `generation` |
| `routeBetween` / `routeOnMap` / `reachFrom` / `costMatrix` | `NavigationApi` → `NavigationLogic` | string-keyed, plain-data profile — the Api's own stated contract (:133-140) |
| `StoredEdge.media` · `wheelPassable` · `conditional` | `PlaceNode` (`edges[]`, persisted inside the existing array field) | every node's edges carry the three; absent = `[]` / `true` / `false`, which is what the row means |
| `ExitInstruction.conditional` → `Exit.conditional` + `isConditional()` | `Exit` (the kernel class every kind row clones) | every exit answers *am I the kind that closes*; default `false`. ⭐ On `Exit`, not on `FordExit`: the projection and the Cartographer read it through the base shape, and a second conditional class (a tidal causeway) needs no kernel edit |
| `getObviousNeighbours()` — the five hazard guards, once | `ExitableMixin` | every Exitable can answer *which live rooms do my obvious exits actually reach* — true of all of them; the guards are facts about exits, not about any one caller. Replaces the 4 copies (3 modalities' leg (e), `Atmospheric` ×2 — those two also want the door-open filter, which stays theirs) |
| `getInlineAtmosphere()` | `AtmosphericMixin` | every Atmospheric already holds `_atmosphere`; the method is the sync read three walks were doing by cast. Replaces 3 copies |
| `MapClaim.minutes?` · `conditional?` | the claim (plain data) — written by `CartographerMixin.recordTraversal` only | a `walked` edge may carry what the walker learned at the exit; `seen` carries neither |
| `VehicularMixin.travelMode` | the transport pack's `lib/Vehicular.ts` (every vehicle class composes it) | every vehicle travels by exactly one declared mode — true of the rig, the coach and the barge |
| `route` verb | `Avatar.commandContributions.self` | reading your map and planning on it is a **player's** act (NPCs do not type); a Cartographer NPC keeps a map and gets no verb — the `map` precedent exactly |
| `navigation.attendedSearchBudget` | `AppSettings` (platform `settings/navigation.yaml`) | an operator dial, not content |

⭐ **The test applied:** no new guard re-narrows a host set. `Exit.conditional`
on the base needs no *"is this a ford"* check anywhere;
`getObviousNeighbours` has no caller-shaped branch; `keepsMaps()` is
untouched. The one place a narrowing *would* have appeared — putting
`travelMode` on `HaulageRig` and branching in `JourneyController` on
vehicle class — is why it is on the mixin.

---

## Convention conformance

- **`props:` / `cast:`** — no new rows with either; the fixture strips
  `cast:` as the standup does. `populates:` is retired and unused here.
- **Locations, not rooms** — every node is a `Location` singleton; no
  `FurnishableRoom` involvement.
- **The five namespace axes** — kernel code under `/platform/…`
  (`RouteController` at `/platform/idea/cmd/movement/RouteController`,
  view at `platform/cmd/movement/route.yaml`); the settings file is
  platform content; the ford's `conditional` is in the locality's own
  kind row under `/world/terminus/…`; `travelMode` on vehicle rows
  under the transport system's root. No pack ships a new root.
- **Module scope declares; lifecycles initialize** — `Traversal` and
  friends are pure classes; the registry's `graphView` cache is built on
  first read; no module-scope execution. `lint:module-scope`.
- **The import boundary** — the mudlib imports nothing from
  `fs`/`path`/`yaml`/`backend`; the lint script and the gym fixture
  live under `scripts/` where those imports are the norm. `lint:imports`.
- **Module categories** — one value class (`Traversal`), two value
  object modules (`RoutePlan`, `TravelProfile`), one `@internal` value
  class (`KnowledgeGraph`), one controller, one command YAML, one lint
  script, one gym test. **No new category, no exported helper
  function, no new Api.** The two shared helpers that *would* have been
  free functions (`getObviousNeighbours`, `getInlineAtmosphere`) are
  methods on the mixins that own the data.
- **Verbs on objects; `XApi.verb(host, …)` never** — the Api's four new
  statics take strings and plain data. `lint:object-verbs` at zero.
- **`lint:lib-statics`** — no new public static on a non-`@internal`
  class; `KnowledgeGraph.fromNodes/fromClaims` sit on an `@internal`
  class. The ceiling stays `339`.
- **Methods are the inter-Stuff contract** — `exit.isConditional()`,
  `room.getObviousNeighbours()`, `loc.getInlineAtmosphere()`,
  `vehicle.getTravelMode()`.
- **Persons key on `getIdentityPath()`** — `viewerKey` for the map read
  is `giver.getIdentityPath()` (the `map` verb's line). `lint:person-keys`.
- **Collections** — none added; `location_graph.yaml`'s `edges`
  description names the three new edge fields (`lint:schema`).
- **Commit hygiene** — stage by name, message from a file, push every
  wave; one MR.

**Gates this build must pass:** `lint:family` in full, with specific
attention to `lint:graph-walks` (new), `lint:location-graph` (one new
error rule), `lint:lib-statics` (unchanged ceiling), `lint:object-verbs`
(zero), `lint:unconsumed-seams` (every new field has a reader),
`lint:verb-collisions` (`route`), `lint:drive-scripts` (the drive is a
wire file), `lint:schema`, `lint:gates` (the new `FromModule` strings),
`lint:test-bootstrap`.

---

## Waves

Every wave lands green on `pnpm test:near` + every touched pack's own
vitest + `pnpm -C packages/server lint:family`, and ends at a commit.
`pnpm test` runs **twice**: before the MR opens and at `/finalize`.

### W0 · `lint:graph-walks` — the census, shipped first and alone

✅ **Done.** Census measured **11**, not the surveyed ten — and the first detector flagged **14**, with three false positives (two MQL dedupe loops over fixed lists; one `.edges` match inside a DOC COMMENT). Sharpening it — a frontier must GROW, adjacency reads off the AST — took it to 11, exactly the independent survey. ⚠ A ratchet set above the real count is a hole in it; those three were three free slots. All pinned as tests.

- **Goal:** the ratchet exists before anything moves, with today's
  count as its ceiling (D11).
- **Files:** `packages/server/scripts/check-graph-walks.ts` (new);
  `packages/server/package.json` `"lint:graph-walks"`;
  `docs/lint-family.md` entry.
- **Acceptance:** the first run lists every site by file:line with the
  three evidence matches; the ceiling is set to that count; the core
  import check is present (an empty allowlist today — the core files
  do not exist yet; the check names them so W2/W6 cannot forget);
  `lint:family --list` shows it.
- **Commit:** `lint(graph-walks): the census — <N> hand-written walks, and a ceiling`

### W1 · The characterization fixture — pinned before the migration

✅ **Done.** 128 places, 77s, own CI job. Three findings, all from its own boot: the **boot union is not optional** (63 of 128 places failed on `unknown form 'woven'` until `FabricCatalogue` was warmed); **`effectiveRow` without `idx.rules` merges everything as `replace`** (Dave's Bar came up with 5 props instead of 25); and **the golden did not reproduce** — `signalAt` samples the live sky factor, so the clock is pinned. `peakLux` being byte-identical across runs is what found it.

- **Goal:** family B's behaviour over every shipped place is a committed
  artifact (D12).
- **Files:** `packages/server/scripts/__tests__/perception-characterization.gym.test.ts`
  (new); `scripts/__tests__/golden/perception-characterization.json`
  (generated); `packages/server/vitest.config.ts` `GYM_TESTS` += 1; a
  probe-sensor fixture beside the gather's tests if none is reusable.
- **Acceptance:** the test enumerates `N` places and asserts
  `expect(places).toBe(N)` (a guard that matches nothing is a passing
  guard — testing.md); the golden has one entry per place with lux /
  peak lux / dB / ppm / gather arrivals **including direction**; a
  second run is byte-identical (determinism of the fixture itself).
- **Commit:** `test(perception): characterize every place's light, sound, smell and gather before the drain`

### W2 · `Traversal` + the two order-independent family-A migrations

✅ **Done** (landed with W3/W4 — a skeleton with no callers is worse than none). 18 tests. `GraphInvariants` counts unchanged (13 unreachable); energy green.

- **Goal:** the skeleton lands with real consumers, not as dead code.
- **Files:** `lib/location/Traversal.ts` (new, D3/D4) +
  `lib/location/__tests__/Traversal.test.ts` (synthetic graphs: all
  three orders; depth gate before the mark; `enter` short-circuit and
  `'halt'`; `descend` refusal; each bound; `exhausted: 'nodes'` vs a
  genuine no-way; deterministic tie-break; a caller-threaded visited
  set); `lib/location/GraphInvariants.ts` `#reachability` →
  `Traversal` breadth-first reach per zone; `energy/src/idea/GridCatalogue.ts`
  `bfs` → `Traversal` reach with `bound.nodes = nodes.size`;
  `lint:graph-walks` ceiling −2 + core allowlist += `Traversal.ts`.
- **Acceptance:** `GraphInvariants` tests and `check-location-graph`
  counts unchanged (`unreachable-from-entrance` still 13);
  energy's suite green; the walk census falls by two.
- **Commit:** `feat(location): Traversal — one skeleton, three orders; the invariants and the grid walk it`

### W3 · Family B drained — four accumulators, one skeleton, the fixture green

✅ **Done.** The golden matches **byte-for-byte**: same lux, peak lux, dB, ppm, and every gather arrival in order with its direction. The prior decision was NARROWED, not overturned. `getObviousNeighbours` replaced **six** copies of the five guards; `atmosphereBlocks` three. ⚠ One stated behaviour change: the gather's guard list was always shorter and now has all five.

- **Goal:** the four perception walks share the frontier and keep their
  physics (requirements § *The skeleton is shared; the accumulators are
  not*).
- **Files:** `lib/boundary/Exitable.ts` (`getObviousNeighbours()` — the
  five guards; a test per guard); `lib/biome/Atmospheric.ts`
  (`getInlineAtmosphere()`; `openingsByKind` / `openExteriorOpenings`
  use `getObviousNeighbours` + their own door filter);
  `platform/idea/modalities/VisionModality.ts` (`walkFluxAt` → a
  `Traversal` depth-first spec: `neighbours` = boundary legs then exit
  legs in today's order; `fold` = legs (a)(a′)(b)(b′)(c) + `mergeCapped`
  over the children; **no** `enter`); `SoundModality.ts` and
  `SmellModality.ts` (`enter` returns the empty acc on vacuum; `fold` =
  own emitters + `mergeAttenuated` per child; Sound's depth-0 floor in
  `fold`); `lib/perception/AudienceGather.ts` (`descend` multiplies the
  carry and fixes the first-hop direction; `enter` emits; `fold` is
  void); `Modality.ts` :68-89 comment rewritten to the narrowed decision.
- **Acceptance:** ⭐ the W1 golden matches **byte-for-byte**; every
  existing modality / gather / Atmospheric test green; `atmosphereBlocks`
  exists **once** (as the mixin method) and the hazard block once;
  ceiling −4 (and the Atmospheric copies, if the detector counted them).
- **Commit:** `refactor(perception): the four walks on Traversal — same lux, dB, ppm and direction, pinned`

### W4 · Families C and D drained

✅ **Done**, no numeric change in either pack. ⭐⭐ The hive found a **real skeleton bug**: with `R = void` every `fold` returns `undefined`, so a `last ?? fold(start,…)` fallback folded the START TWICE — 12 m² of bloom where one cherry stands in 6. A sentinel that collides with a legal result is not a sentinel. Both callers keep their own neighbour reader, each for a stated reason.

- **Files:** `trade-mining/src/lib/Working.ts` (`airAt` → breadth-first
  with `enter` returning `'halt'` at the first `breathes(room)`,
  `bound.hops = AIR_REACH`, result = the halt depth; `refreshAir` →
  reach with `bound.hops = AIR_REACH * 2`, then `await room.airAt()`
  over the reached list; `destinationsOf` stays the neighbour source —
  it reads `getExits()`, deliberately); `trade-apiculture/src/thing/Hive.ts`
  (`forageCensus` → breadth-first, `keyOf = stuffId`, carry = `minutes`,
  `descend` applies **both** of today's inequalities itself and the
  default edge cost, `bound.nodes = FORAGE_HOP_CAP`, `fold` does the
  three-way accumulation into closure state exactly as now).
- **Acceptance:** both packs' suites green with no numeric change;
  ceiling −3.
- **Commit:** `refactor(mining,apiculture): air reach and forage radius on Traversal — same depth, same radius`

### W5 · The edge carries `media`, `wheelPassable`, `conditional`; blocked edges are dropped

✅ **Done.** Read off the edge spec **or its kind row** — reading only the spec would have projected an empty media list for every kinded exit in the realm. ⚠⚠ The core's import gate refused `TravelProfile`'s `import type { StoredEdge }` and was right to; it declares `AdmissibleWay` instead. `lint:lib-statics` bit twice at 340/341 of 339 and both took the compliant path. The new `conditional-kind-undeclared` error was verified to FIRE. All censused counts unchanged.

- **Files:** `lib/location/PlaceNode.ts` (`StoredEdge` += three);
  `platform/idea/LocationGraphRegistry.ts` `edgesOf` (+ the kind-row
  read for `conditional`; skip `blocked`); `lib/boundary/Exitable.ts`
  (`ExitInstruction.conditional`, applied in `_applyExitSpec`);
  `lib/boundary/Exit.ts` (`conditional` field, `isConditional()`,
  `fieldMeta`); `delight-ford.yaml` (`conditional: true`);
  `FordExit.ts` doc; `lib/location/TravelProfile.ts` (new, D7) + test;
  `schema/location_graph.yaml` edge description; `scripts/check-location-graph.ts`
  (the kind-row error rule); `world/__tests__/logistics-corridors.test.ts`
  (D7 — reads `TravelProfile.admits`, reach via `Traversal`).
- **Acceptance:** a projected ford edge reads `conditional: true` on
  both naming edges; a `blocked: true` spec projects no edge (test);
  `lint:location-graph` fails on a copy of the ford kind with the flag
  removed (test of the lint, in `scripts/__tests__`); corridors test
  green with its mirror gone; ⚠ `check-location-graph`'s
  `unreachable-from-entrance` count is **re-pinned at 13** after the
  drop (W2 pinned it before the edge set changed — measured, not
  assumed: there are **zero** authored `blocked: true` specs in all of
  content, so the rule ships exercised only by its own fixture and a
  regression in it would be invisible outside that test); `lint:unconsumed-seams` sees a reader for
  `conditional` (the projection).
- **Commit:** `feat(location-graph): media, wheelPassable and conditional on the stored edge; blocked drops`

### W6 · `routeBetween` · `routeOnMap` · `reachFrom` · `costMatrix` — the core, the two knowledge sources, the firewall

✅ **Done.** 22 + 9 tests. ⭐⭐ The **diamond fixture caught a real bug**: predecessors were recorded on first sight, which is wrong for a cheapest-first walk — all three axes answered the same path. The carry holds the predecessor now, written at dequeue. ⚠ And this file's own documented trap caught me: `this.readMap(...)` is an intra-singleton self-call the `FromModule` gate DENIES.

- **Files:** `lib/location/KnowledgeGraph.ts` (new, `@internal`, D6),
  `lib/location/RoutePlan.ts` (new, D8); `LocationGraphRegistry.ts`
  (`graphView(extent?)`, generation-keyed cache);
  `platform/idea/api/NavigationLogic.ts` (the four methods; the
  mode-break second pass; the per-axis non-dominated set; assumption
  derivation for both sources; `'graph-cold'` when `registry()` is
  null on a world request); `api/navigation.ts` (four statics + type
  re-exports); `scripts/check-graph-walks.ts` core allowlist; tests:
  `NavigationLogic.routing.test.ts` (synthetic index via the registry's
  persistence seam: no-way vs budget; deterministic choice; the diamond
  → two plans; the mode break names the node; `extent` scoping),
  `NavigationLogic.map-routing.test.ts` (**registry absent**; two maps,
  two different plans — AC5; a disagreement yields a `disputed`
  assumption; an unwalked leg is `unmeasured`; the assumption text is
  built from claims only; `LocationGraphRegistry.prototype` spied and
  never called).
- **Acceptance:** all of the above; `lint:object-verbs` zero;
  `lint:lib-statics` 339; `lint:graph-walks` core check green.
- **Commit:** `feat(navigation): routeBetween, routeOnMap, reachFrom, costMatrix — a plan is a hypothesis, and the map path cannot reach the index`

### W7 · Transport, haulage and shopkeeping migrate; `planRoute` retires

✅ **Done.** ⭐⭐⭐ `lint:graph-walks` reaches **ZERO**. ⭐ One unplanned addition, found by asking what `via ferrow-tram` would do: an AUTHORED lane is its own graph (the tramway's ends are joined by a passage authoring no `media`), so `routeOverEdges` is a third knowledge source. `trade-haulage`'s pack→pack import of `LaneCatalogue` is gone entirely.

- **Files:** `transport/src/lib/Vehicular.ts` (`travelMode` + getter +
  `fieldMeta`; the three vehicle rows); `transport/src/idea/LaneCatalogue.ts`
  (`induce` → `NavigationApi.reachFrom(seeds, profile, { source: 'world' },
  { nodes: MAX_LANE_NODES })` building `adjacency` from the reach's
  edges; **delete `planRoute`**; `refreshCrossing` call gone with
  `induce`; `laneLabelFor(nodes)` — the sorted covering lanes);
  `JourneyController.ts` (D13; `laneFor` → restriction; the mode-break
  refusal in words; a `JourneyController.test.ts` for `via` present /
  absent / wrong, deterministic label, mode break — the tests that do
  not exist today); `Journey.test.ts` (route via `Route.computed`);
  `Lane.test.ts` (unchanged expectations — the induced node sets are the
  same sets); `trade-haulage/src/behavior/hauls.ts` (D13; a `hauls.test.ts`
  pinning *plans then drives the verb* and the config seams);
  `trade-shopkeeping/src/behavior/consigns.ts` (D13; the direction
  rescan deleted); `logistics-forcing-function.test.ts` :85;
  `distilling.test.ts` :144-157 (D10); `lint:graph-walks` ceiling −2.
- **Acceptance:** `journey to <stop>` with no lane plans and departs in
  a fixture with two authored-edge lanes of one mode sharing a node (the
  two-lane case AC1 names, provable only in a fixture — § Risks);
  `hauls` and `consigns` suites green; `SurveyController`'s `lanesAt`
  duck still works; the catalogue's problems list still reports an
  unloadable mode.
- **Commit:** `refactor(transport): journey plans by mode over the index; planRoute retired; hauls and consigns walk a RoutePlan`

### W8 · The `route` verb, the budget dial, the earned claim fields

✅ **Done.** 18 controller tests + 3 Cartographer. ⭐⭐⭐ Writing the tests found a design hole: **a map cannot answer `by wagon`** — a claim records the channel, not what you were driving — so it refuses in words and names `journey`. Deferred-and-designed to `map-slate`.

- **Files:** `platform/idea/cmd/movement/RouteController.ts` (new,
  D14) + `__tests__/RouteController.test.ts`;
  `platform/content/platform/cmd/movement/route.yaml` (new);
  `lib/character/Avatar.ts` `commandContributions.self` += the view;
  `platform/content/settings/navigation.yaml` (new) +
  `AppSettingKeys.navigationAttendedSearchBudget`;
  `lib/location/MapClaim.ts` (`minutes?`, `conditional?` on edge
  claims) + `lib/location/Cartographer.ts` `recordTraversal` (D9) +
  its test; `MapController` untouched (it renders no cost — the map
  shows what you know, not a bill).
- **Acceptance:** controller tests — unknown name refused in the *you
  do not know* sentence with **no** registry call; known-but-unconnected
  refused the same way; a plan renders directions, cost with unmeasured
  count, assumptions citing channel + age; a tiny budget yields the
  *could not work out a way that far* sentence; `lint:verb-collisions`
  clean; `help route` renders.
- **Commit:** `feat(navigation): route — ask the way on your own map, and be told what it assumes`

### W9 · The residue, the drive, the docs

✅ **Done.** Ceiling at **zero** with no residue to enumerate. The drive is 14/14 — see § Drive record for the nine failures it opened with and what they were actually about.

- **Files:** `scripts/check-graph-walks.ts` (ceiling → the residue,
  each site listed with its reason — the fire spread; anything found
  that the requirements excluded); `packages/wire/tests/routing.dirty.wire.test.ts`
  (the drive, steps 1–14 as far as the wire reaches — § Test & gate
  strategy); `docs/subsystems/location-graph.md` (the router section:
  the four reads become six; the map-plan; the firewall's reader half;
  `conditional`); `docs/subsystems/logistics.md` § *Routing* (the
  standing decision overturned, in place, with the behaviour swap
  stated); `docs/subsystems/boundary.md` (`conditional`);
  `docs/subsystems/retail.md` + `behavior.md` (the hand **walks**, and
  now walks a plan); `docs/subsystems/perception.md` / `senses.md`
  (the walks ride `Traversal`; the fixture); `docs/lint-family.md`
  (`lint:graph-walks`); `CLAUDE.md` map blurb for `location-graph.md`
  is a one-liner — leave the index line to the sweep;
  `docs/slates/builds/pathfinding-slate.md` → compacted per
  `/compact-slate` at the sweep (not here).
- **Commit:** `drive(routing): <what driving found>` · `docs(routing): the router, the map-plan, the ratchet`

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the skeleton | — | — | — | — | — (a class; `lint:graph-walks` is what makes it the only one) |
| the census | `pnpm lint:graph-walks` | `package.json` script (roster derived) | reads files | — | — |
| the fixture | `pnpm test:gym` | `GYM_TESTS` in `vitest.config.ts` — ⚠ a gym file not in the list runs **nowhere** | the golden JSON | — | — |
| `media` / `wheelPassable` / `conditional` on the edge | — | — | `edgesOf` reads the spec + the kind row; `PlaceNode.edges` persists | the registry warms lazily on first read; **a warm DB needs `rebuildGraph`** (the generation sweep) — the drive's first step | — |
| `conditional` on the exit | — (`look` does not say it; the plan does) | — | `ExitInstruction.conditional` → `Exit.conditional`; `delight-ford.yaml` | kind clone hydration (existing) | ⚠ a kind row missing the flag is a `lint:location-graph` **error** |
| `routeBetween` / `reachFrom` / `costMatrix` | — | — | the registry's `graphView` | **`'graph-cold'`** before the warm — a real answer the callers handle (the brain skips the beat; the compile reports a problem) | required `budget` — ⚠ no default, by decision |
| `routeOnMap` | `route to <place> [by <mode>]` | **`Avatar.commandContributions.self` += `platform/cmd/movement/route.yaml`** — a view nothing affords is dead silently | `DocumentKinds.map` (existing) | — | both args optional; the controller refuses in words; `navigation.attendedSearchBudget` seeded by `settings/navigation.yaml` (merge-missing) |
| `minutes` / `conditional` on a claim | (walking) | `CartographerMixin.recordTraversal` | `MapClaim` | — | — |
| `journey` without a lane | `journey to <stop>` | existing (`VehicularMixin`) | `travelMode` on the three vehicle rows — ⚠ a vehicle row without one refuses *"this vehicle does not say how it travels"* rather than guessing | — | `via` optional (unchanged) |
| the brain's knowledge + budget | — | — | `behaviors[].config.knows` / `searchBudget` / `lane` | — | absent `knows` ⇒ world; absent `searchBudget` ⇒ the brain's own constant |
| the lane label | — | — | derived from compiled lanes, sorted by key | — | — |

---

## Acceptance-criteria coverage

| AC | satisfied by | wave |
|---|---|---|
| 1 · no way named, planned by the conveyance, deterministic label, never a sailed wagon | D13: plan by `travelMode` over the mode graph; label by sorted covering key. ⭐ Requirements restated — *two lanes of one mode* exists nowhere and the criterion no longer asks for it | W7 |
| 2 · what way there is, on foot, owning nothing | `route` over the map | W8 |
| 3 · refused where never been; succeeds after walking | map-only name resolution + `walked` claims | W8 (+ W6) |
| 4 · assumptions from the planner's own evidence | `RouteAssumption.claim` derived from claims; the registry-absent test | W6, W8 |
| 5 · a fuller map plans differently | the two-maps unit test; drive steps 4–5 | W6 |
| 6 · the mode change is named | `breakAt` second pass; `journey`'s refusal | W6, W7 |
| 7 · budget exhaustion is distinguishable | `exhausted: 'nodes'` → `'budget'`; the sentence | W2, W6, W8 |
| 8 · a blocked leg halts at the previous place; no replan | unchanged `Journey.advance`; drive step 9 | — (pinned by `Journey.test.ts` :242) |
| 9 · `map` shows exactly what it showed | `MapController` untouched; `growMap` key unchanged; drive step 10 | W8 |
| 10 · nothing perceivable changes | the W1 golden matched in W3; pack suites in W4 | W1, W3, W4 |
| 11 · costs between stops, typed, no order offered | `costMatrix` + the `route between <a> and <b>` form (D14) — the typed reader, so the criterion is not Api-only | W6, W8 |
| 12 · cost in the currency the traveller pays | D4a: the plan carries every axis, the renderer selects by profile; a pedestrian is never quoted minutes | W6, W8 |
| 12 · incomparable routes both shown | the per-axis non-dominated set; the diamond test; `route` renders each | W6, W8 |
| 13 · the board renders; no route through a timetable | D15; `travel` is not an edge; drive step 13 | W6 |
| 14 · a new mode / NPC knowledge without code | `media:` on the row (existing) + `knows:` in brain config | W5, W7 |

---

## Test & gate strategy

- **Unit (`pnpm test:near`)**: `Traversal` over synthetic graphs (W2);
  `TravelProfile.admits` (W5); the projection's three new fields and
  blocked-drop (W5); `NavigationLogic` routing over a synthetic index
  and over claims with the registry absent (W6); `JourneyController`,
  `hauls`, `consigns`, `RouteController` (W7/W8); the Cartographer's new
  claim fields (W8); the lint scripts' own tests (`scripts/__tests__`,
  W0/W5).
- **Characterization (`pnpm test:gym`)**: the W1 golden; re-run after
  W3 and at every later wave that touches a modality file.
- **Pack suites**: `transport`, `trade-haulage`, `trade-shopkeeping`,
  `trade-distilling`, `trade-mining`, `trade-apiculture`, `energy` —
  each touched pack's own vitest, every wave that touches it.
- **The lint family**: every wave; `lint:graph-walks` is the build's
  own meter and must fall monotonically W2 → W9.
- **The drive** (`packages/wire/tests/routing.dirty.wire.test.ts`,
  W9): step 0 `rebuildGraph` on the warm world (the new edge fields
  need a sweep); steps 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14 over the
  socket, asserting the **envelope** (status + `controller-rejected`
  reason) *and* a state change where one is claimed — ⚠ `refusedFor`
  alone is blind to a verb that was never understood; step 1 as far as
  the realm allows (a lane-less `journey` to a `spine` stop, label
  deterministic across two runs); steps 11 and 12 are **spot checks**
  in a browser session, with the proof being W1/W3 and the pack
  suites. ⭐ **Re-run the drive after every review fix.**
- **`pnpm test`**: once before the MR opens; once at `/finalize`.
  Not between.

---

## Risks & opens

1. ✅ **AC1 / drive step 1 — RESOLVED in the requirements.** The four
   lanes have four modes and an induced lane is its mode's whole
   component, so *"two lanes of the same mode"* had no referent. The
   criterion now reads *"no way named, planned by the conveyance,
   deterministic label, never a sailed wagon"* and the drive runs at
   Wharfside bank, where `spine` and `estuary` both seed. ⚠ Residue:
   the player-visible gain in **today's** content is smaller than the
   requirements originally implied — the real wins are `route` on foot
   (impossible before), the refuse-then-earn pair, determinism, and the
   mode break being named. That is consistent with this being an infra
   build and is stated in the requirements' lens 6.
2. ✅ **AC11 — RESOLVED.** `route between <a> and <b>` (D14) is the
   typed reader, so the matrix does not ship as an Api-only read.
3. **Vehicles gain a declared mode** (`travelMode`). Today the lane
   knows and the vehicle does not; this moves a fact to where it is
   true. Three rows change. If the user prefers the vehicle to stay
   mode-less, `journey` without `via` must pick the mode from the lanes
   at `here` in sorted order — workable but it re-introduces "first in
   some order".
4. **`conditional` is a row flag on the kind** (D5), gated by a lint
   phrased **by shape** — a kind row whose class overrides
   `applyTraversal` and names `blocked`. ✅ The earlier draft named
   `FordExit` in a kernel gate; cut, because a kernel gate must not
   enumerate pack classes. Residue: a conditional class that closes by
   some other means needs the shape test widened. Alternative rejected:
   deriving from the class at projection time (the projection would
   have to resolve class files).
5. ✅ **The map claim grows ONE field — RESOLVED by the lens pass.**
   `minutes` is cut: ordinary movement is free, so a walker who crossed
   in zero game time learned no duration (D9, D4a). `conditional`
   stays — you saw the ford. The map plan costs in legs, which is also
   what a pedestrian is answered in.
6. **The non-dominated set is a per-axis subset** (D8), not a Pareto
   search. Honest for three corridors; a later build with real
   alternatives may want the full front.
7. **The behaviour swap on fords**: `journey` plans over a flooded ford
   and halts at the leg (requirements § *Runtime conditions*). The
   plan's `conditional` assumption is the caveat. Stated, not met in
   review.
8. **`'graph-cold'`**: an NPC beat before the registry warms gets no
   route and skips. Today the lane compile forces the walk at its own
   first read; after W7 the compile's `reachFrom` triggers the lazy
   warm, so in practice the first `journey` warms it. The brains handle
   the answer rather than assuming the warm.
9. **`lint:graph-walks`' detector will over- or under-count on the
   first run** — a census is measured, not guessed. The build records
   what it found; an out-of-scope hit stays in the residue with its
   reason. The detector must not be tuned to hit exactly ten.
10. **Hot reload of `NavigationLogic`** must not lose the `graphView`
    cache — it lives on the registry (the `AddressRegistry →
    AddressLogic` arrangement already used), not on the Logic.
11. **The gym fixture's boot cost** is unmeasured; the standup boots
    six rooms, this boots ~124 plus probes. If it exceeds a few minutes
    it is still correct in `test:gym`; it must never be moved into
    `pnpm test`.
12. **Order-dependence remains**, by decision. The fixture pins it;
    anyone later "tidying" neighbour order in a modality breaks the
    golden, which is the point.

---

## The lens pass over the planned scope

Re-run after the plan was written, because the plan moved the scope
enough to be worth a third pass (the requirements' own pass predates
the grounding). Full entries in
[routing-requirements.md § Lens pass](../requirements/routing-requirements.md).
What it changed, for a build agent who should know which decisions came
from it rather than from the survey:

| finding | lens | lands as |
|---|---|---|
| ⭐⭐ a plan must not quote a walker a duration the world will not charge | 1 pedagogy | **D4a** (new), and **D9** revised to drop `minutes` |
| ⭐ a place is named by what it calls itself, never a path or a bare leaf | 3a immersion | **D14** |
| the build creates a **guide** vacancy (`knows:` makes knowing the way authorable) | 3b participation | recorded for `vocations.md`; nothing built |
| ⭐⭐ `conditional` as a cost axis is a **risk** axis — the first fast-uncertain vs slow-sure choice in the game | 4 values | already in **D8**; named rather than added |
| `published` now severs ways for everybody, not just the owner's doors | 7 governance | recorded; the reverse-edge notification is the only appeal |
| the demand is thin, and the answer is that this consolidates **ten existing callers** rather than seeking new ones | 6 economy | the build's legitimacy argument, written down |

---

## Deferred seams

- **Hierarchical search (HPA\*)** — `Knowledge.source: 'world'` with
  `extent` already materialises one subtree sync after an async load;
  the `interzoneSkeleton` read is the coarse graph. → a tail beside
  `map-slate` when the realm has a fourth corridor.
- **Service legs** — `RouteLeg` grows `kind: 'exit' | 'service'`
  with `{ board: identity, fee, departures }` from `node.travel`, admitted
  only when `departures === null`; timetabled routes stay refused. →
  `fast-travel-slate`.
- **The compute allowance** (unattended search metered to the owner's
  land) — the `expanded` count every outcome carries is the meter's
  input; nothing else is built. → parcel/governance.
- **Containment-graph walks** — `Traversal` is generic over `N`; a
  containment `neighbours` is one function. → a named later wave.
- **Client-side planning over a cached map** — the core's import
  allowlist is the property that lets it move; `KnowledgeGraph.fromClaims`
  + `Traversal` + `RoutePlan` are wire-shippable today. → `map-slate`.
- **`told` provenance** on claims (and therefore *"somebody said"* as an
  assumption source) → accountability, as already filed.
- **The tour / several-stop verb** over `costMatrix` → cargo.

---

## Critical files

Read first, in this order:

1. `docs/requirements/routing-requirements.md` — the closed scope.
2. `docs/subsystems/location-graph.md` — the index, the map, the firewall.
3. `packages/server/src/mud/platform/idea/LocationGraphRegistry.ts` — `edgesOf`, `writeTemplateNode`, `allNodes`, `checkGraph`.
4. `packages/server/src/mud/lib/location/PlaceNode.ts` · `GraphInvariants.ts` · `MapClaim.ts` · `Cartographer.ts`.
5. `packages/server/src/mud/api/navigation.ts` · `platform/idea/api/NavigationLogic.ts`.
6. `packages/server/src/mud/platform/idea/modalities/VisionModality.ts` · `SoundModality.ts` · `SmellModality.ts` · `lib/perception/AudienceGather.ts` · `lib/perception/Modality.ts`.
7. `packages/content/transport/src/idea/LaneCatalogue.ts` · `lib/journey/Route.ts` · `lib/journey/Journey.ts` · `idea/cmd/movement/JourneyController.ts` · `lib/Vehicular.ts` · `idea/FordExit.ts`.
8. `packages/content/trade-haulage/src/behavior/hauls.ts` · `trade-shopkeeping/src/behavior/consigns.ts` (and `stocks.ts`, to leave alone).
9. `packages/content/trade-mining/src/lib/Working.ts` (:640-700, :855-935) · `trade-apiculture/src/thing/Hive.ts` (:790-890) · `energy/src/idea/GridCatalogue.ts` (:530-595).
10. `packages/server/src/mud/lib/boundary/Exit.ts` (:595-625, :933-1010) · `Exitable.ts` (:250-300).
11. `packages/server/scripts/check-location-graph.ts` · `check-object-verbs.ts` · `check-lib-statics.ts` · `pack-roots.ts` — the lint shapes to copy.
12. `packages/content/terminus/src/__tests__/terminus-standup.integration.test.ts` · `packages/server/vitest.config.ts` — the fixture's boot and its home.
13. The three tests that pin the placeholder: `world/__tests__/logistics-forcing-function.test.ts`, `trade-distilling/src/__tests__/distilling.test.ts`, `world/__tests__/logistics-corridors.test.ts`.
14. `packages/content/platform/content/platform/cmd/perception/map.yaml` · `platform/idea/cmd/perception/MapController.ts` — the verb shape `route` copies.

---

## Drive record

Run `2026-10-08` against an **owned** world
(`WIRE_BOOT=1 WIRE_PORT=2017 vitest run tests/routing.dirty.wire.test.ts`),
on a dropped-and-reinstalled `saxonberg_build3`.

**14 of 14 steps pass.** ⚠ The first run was **9 of 14 failing**, and
every one of those failures was worth having.

### ⭐⭐⭐ What it found first, and it was not the product

Nine steps failed with **`I don't understand 'route'.`** — the verb
dead over the socket, with every unit test green. The textbook silent
failure, and the cause was not in the build:

> **The wire runner ATTACHES by default and only boots a world when
> `WIRE_BOOT=1`** (`global-setup.ts`: *"CI always owns its world;
> locally it is opt-in"*), and attach mode's default URL is
> **`http://localhost:2010`** — which in this checkout is **another
> worktree's dev server**. Every refusal was *build-4's world*
> answering, running a tree with no `route` in it. `WIRE_PORT` sets
> the port an OWNED boot uses and does not redirect an attach.

⚠ Three dead ends were walked before that landed, and they are worth
recording because each looked like the answer:

1. **"the store is stale"** — the DB was dropped twice and the verb
   stayed dead. It was never the DB.
2. **"the view is malformed, so the pack install refused it"** —
   `CommandApi.validateCommandView` passes it, and `lint:controller-rows`
   had already caught the one thing that WAS missing (below).
3. **"the affordance is shadowed"** — `collectSelfDefs(PrimaryAvatar)`
   contains `route`, and only `Avatar` affords `map`, so the list that
   serves `map` is the list that serves `route`.

⭐ The instrument that settled it was booting a world **by hand** and
reading its log: `306 command YAML(s) preloaded` and `217 command-view
document(s)` installed, against the wire run's `301`. Same disk, same
code, different world. ⭐⭐ *Validate the instrument before believing
the finding* — the drive was telling the truth about a world, and it
was the wrong world.

### What the gates caught before the drive could

Three omissions, all of which fail **closed and silent**:

- **`lint:controller-rows`** — `RouteController` had no template ROW.
  A controller is an `Idea` the dispatcher clones; without the row the
  verb would have been dead *with every controller test green*. This
  is the gate doing the drive's job earlier and cheaper.
- **`lint:test-content`** (twice) — `/world/` paths in a kernel test,
  once in a fixture and once in a sentence inside a doc comment.
- **`lint:instanceable`** — `_travelMode` as a `fieldMeta` key made
  every row authoring `travelMode:` read as an orphan key the applier
  discards silently. The fix was the NAME, and the ceiling then
  ratcheted **down**, 393 → 390.

### What the live content taught the drive

Two steps were rewritten because the realm is more interesting than
the script assumed, and in both cases **the code was right and the
assertion was wrong**:

- **Step 1.** What affords `journey` at Wharfside bank is a **moored
  barge**, and a barge asked for the market square answers *no road
  from here goes to 'the market square'*. That is AC1 from the other
  side — the mode is the vehicle's, so a sailed hull is never planned
  over a wheeled way — and it is a better test than the one written.
  ⚠ The converse (a hitched wagon told `via estuary` no longer
  sailing) needs a funded session and the haulage flow; it is pinned
  by `JourneyController.test.ts` and `Vehicular.test.ts`.
- **Step 6.** **Wharfside bank is pitch dark and the market square is
  dim**, so a fresh character looking around learns less than the
  script assumed — an unlit place yields no name worth resolving and
  the honest answer to `route to <name>` is *you do not know the way*.
  That is the firewall working. The socket step now asserts what a
  socket can settle; the assumption derivation is pinned in
  `NavigationLogic.map-routing.test.ts` and `RouteController.test.ts`.

⚠ And one defect in the drive file itself: `Session.close()` is
**synchronous**, so `await s.close().catch(…)` threw in `afterAll` and
failed the SUITE while all 14 steps passed. A green run reported as a
failure is the worst kind of noise.

### Steps a socket cannot settle, and where each lives

| step | why not | where it is pinned |
|---|---|---|
| 9 · block a leg mid-journey | needs a wizard shutting a road under a moving journey | `Journey.test.ts:242` — halt at the previous place, no replan |
| 11 · the perception walks unchanged | a socket could spot-check one room | `golden/perception-characterization.json` — 128 places, byte-for-byte, **including printed compass directions** |
| 12 · the pack walks unchanged | same | `trade-apiculture` + `trade-mining` suites, no numeric change |

### Verified by the run

`route` reachable and afforded · no template path or raw leaf in any
output · a place the realm HAS and the player has not found is refused
in words, with **no index read** · a pedestrian is never quoted
minutes · `by wagon` on a map refuses and names `journey` · the budget
refusal is distinguishable from *no way* · `map` still shows only what
the player knows · a TPA terminal is never a routed leg · `route
between <a> and <b>` answers a pair and offers no order · `help route`
renders · bare `route` refuses in words.

---

