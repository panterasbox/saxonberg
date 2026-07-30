# The capability-keyed affordance table — implementation plan

This plan drives **one build cycle** and is executed by a **fresh-context build
agent** per [docs/workflow.md](../workflow.md) § Requirements → plan. Read
[docs/requirements/capability-table-requirements.md](../requirements/capability-table-requirements.md)
in full before starting — its Surface decisions are settled answers this plan
implements, not reopens. Subsystem grounding:
[crafting.md](../subsystems/crafting.md),
[command-spec.md](../subsystems/command-spec.md),
[command-routing.md](../subsystems/command-routing.md),
[retail.md](../subsystems/retail.md),
[encumbrance.md](../subsystems/encumbrance.md), and the antipatterns entries
"Working verbs conferred by a venue or commerce object" and the
affordance-is-a-promise doctrine in
[antipatterns.md](../antipatterns.md).

All paths below are relative to `packages/server/src/mud/` unless prefixed.

## Scope at a glance

**Delivered by this build** (fixing phase in parentheses):

- The capability → verb-family **table** in `lib/craft/ToolCapability.ts` +
  `ToolMixin` implementing `InstanceContributor` + the one-site inventory
  walk change (1)
- **Parameterized capability specs** — `(string | CapabilitySpec)[]` with
  `rate` / `control` / per-entry `placement` override, normalized and
  validated on set, round-tripping the Hydrator (2)
- The two parameters **consumed**: engaged step durations divide by the
  conferring instrument's rate (clamped 0.25–10); craft/mint/repair grade
  floors at a control-bearing instrument's band; `analyze` surfaces the
  band (3)
- **Content + retirement**: the sewing-machine seed at the general store;
  `Whetstone`/`Anvil`/`SewingKit` deleted; four seeds reclassed to
  `/lib/craft/ToolItem`; `CookPot`/`CocktailShaker` statics dropped; the
  data-migration note (4)
- Docs sweep + the live-drive machine beat (5)

**Out of scope** (per the requirements' non-goals; attach points under
*Deferred seams*): furnace-family migration, powered variants / supply
gates, batching, per-capability wear, skill-side control
(`deriveAtFixedControl`'s `_control`), runtime affordance recompute on
`setCapabilities`/break, table-as-DB-data, non-Tool hosts.

## Grounding (facts established by reading the real source)

- **The walk seam is exactly as advertised.**
  `obj/api/CommandLogic.ts:2277` is the single class-only inventory push
  (`collectBucketDefs(item.constructor, 'inventory')` inside
  `applyContainmentDeltaImpl`); the `environment`/`peers` push sites
  (lines 2282–2284, 2311–2313) already use `collectBucketDefsForInstance`.
  Shadow (`applyShadowDeltaImpl`, lines 2344–2359) and self/hosted-update
  sites stay class-only — no instance in hand. `instanceBucketFilenames`
  (line 2217) already swallows throws, and `resolveDefs` (line 2180)
  **dedupes filenames** — so statics and an instance-derived duplicate of
  the same list resolve to one contribution. This dedupe is what makes
  Phase 1 land green while the thin classes still exist.
- **The seam contract**: `InstanceContributor` in `api/command.ts:349`
  (`@hook`, "cheap and total"); `lib/behavior/Behaved.ts:155` is the shipped
  precedent, including the **inner-contributor merge pattern** (a shadowing
  implementation must call `Base.prototype.getInstanceContributions` and
  merge — Behaved does this for CasterMixin under it).
- **The tool substrate**: `lib/craft/Tooled.ts` — persisted
  `capabilities: string[]`, `setCapabilities` validates against
  `ToolCapabilities.isCapability` (unknown throws `RangeError`),
  `hasCapability` is broken-gated via `MixinApi.isDurable`. **No consumer
  anywhere calls `getCapabilities()`** (verified by grep) — every read goes
  through `hasCapability`. `lib/craft/ToolCapability.ts` holds the closed
  nine-kind vocabulary + the `ToolCapabilities` static holder.
- **`PersistentHydrator` prefers the accessor**: a seeded `capabilities:`
  value lands via `setCapabilities(value)` (setter-first hydration,
  `lib/persistence/PersistentHydrator.ts:100`), so the setter IS the seed
  validation gate; plain records in the array serialize as JSON — no new
  marshaller, exactly as the requirements constrain.
- **The thin classes** carry exactly the table's initial mapping:
  `Anvil` → hammer/quench/forge/repair/salvage (env + inventory),
  `SewingKit` → repair/salvage (env + inventory), `Whetstone` →
  sharpen (**inventory only** — the carried rule), `CookPot` →
  pour/stir/heat/plate/cook, `CocktailShaker` →
  pour/stir/strain/garnish/serve/mix. `CookPot` and `CocktailShaker` keep
  real behavior (`ManualBuildMixin`); their shaker/pot seeds all author
  `capabilities:` explicitly (`seeds/obj/CookPot.yaml`,
  `seeds/domain/lounge/{shaker,mixing-glass}.yaml`) — so dropping their
  statics is safe once the instance seam is live.
- **Step controllers**: `Hammer`(5000)/`Heat`(4000)/`Stir`(4000)/
  `Pour`(3000)/`Quench`(2500)/`Strain`(2500)/`Plate`(2500) have const
  `*_MS`; `Sharpen` reads the `crafting.keenness.sharpenDurationMs` dial
  (fallback 12000). All engage via `ManualBuildController.engageStep`.
  `HammerController.findCapability` (private) is the reachable-capability
  resolver to promote. `ForgeController`/`CookController` (the one-shots)
  are **not** engaged — no pacing there.
- **Grade compose sites**: `CraftingLogic.ts:738` (`mintFromBuildImpl`) and
  `:962` (`craftImpl`) both already do `grade = grade.max(base)`. Tool
  match in `craftImpl` (lines 940–945) collects `usedTools` per required
  capability. `repairImpl` (line 1014) finds the `mending` tool for soft
  goods, gates metal on reachable heat, and ends `item.setCondition(1)` —
  it composes no grade today. `GRADE_BANDS` =
  poor/fair/fine/exceptional/masterful; `GradedMixin` has
  `setGradeBand` with validation.
- **Test precedents**: `lib/npc/__tests__/talk-affordance.test.ts` is the
  end-to-end `InstanceContributor` test shape (rooms + `ContainmentApi.move`
  + `getAvailableCommands`); `lib/craft/__tests__/CraftMixins.test.ts` holds
  the `ToolMixin` spec tests; the smithing/cooking manual tests advance
  timers by the exact base `*_MS` (rate default 1 keeps them byte-green);
  `domain/hearthworks/__tests__/hearthworks-venues.integration.test.ts`
  lines 252–267 assert `Anvil.commandContributions` /
  `CookPot.commandContributions` directly (the rewrite target);
  `domain/terminus/__tests__/general-store-content.test.ts:68` holds
  `DISCRETE_ITEM_CLASSES` with `/lib/craft/Whetstone` + `/lib/craft/SewingKit`
  entries to remove.
- **Seeds**: `class: /lib/craft/Whetstone` appears **twice** —
  `seeds/domain/hearthworks/whetstone.yaml` AND
  `seeds/domain/terminus/general-store/goods/whetstone.yaml`; plus
  `seeds/domain/hearthworks/anvil.yaml` (Anvil) and
  `seeds/domain/terminus/general-store/goods/sewing-kit.yaml` (SewingKit) —
  **four reclassed rows**, not three. (`seeds/obj/gear/anvil.yaml` is a
  plain `/lib/stuff/Thing` encumbrance prop — untouched.) The store
  counter (`counter.yaml`) prices by template path under `data.prices` and
  stocks via `data.stockLines: [{itemTemplatePath, par}]`.
- **Only comments** reference the thin classes from other TS
  (`SmithyMenu.ts`, `lib/commerce/Menu.ts` doc prose); `SharpenController`
  resolves the whetstone **by capability**, never by class. Deletion is
  clean.
- **Live drive**: `e2e/tests/drive-crafting.spec.ts` (untracked, stays
  untracked) runs two serial scenes — smithy (includes the carried-sharpen
  beat) and cookhouse — spawning avatars directly at venues via
  `openWorldAs(browser, name, { startLocation })`.
- **Migration posture**: `SeederManager` is insert-only
  ([bootstrap.md](../subsystems/bootstrap.md) § seeder — "delete-and-reseed
  for dev, future migration story for production"); stale class bindings on
  a live box are the documented hot-reload hazard
  ([hot-reload.md](../subsystems/hot-reload.md)).

## Findings — gaps between the requirements' assumptions and the source

- **F1 — `repair` is not an engaged step today.** `RepairController`
  extends `CraftController`, has no `*_MS`, and calls `CraftingApi.repair`
  synchronously. The acceptance criterion "machine repair engagement ≈
  base/3" therefore requires repair to *become* engaged, not just paced.
  Resolved in Q1/Phase 3.
- **F2 — four seed rows reclass, not three.** The store's own
  `goods/whetstone.yaml` is also `class: /lib/craft/Whetstone` (see
  Grounding). Phase 4 reclasses all four; the migration note covers all
  four template paths.
- **F3 — `QuenchController` never resolves an anvil** (only Hammer checks
  one). Quench's conferring kind is `anvil`, so its pacing needs its own
  reachable-anvil resolve — rate 1 when absent (quench is deliberately not
  gated on the anvil today; pacing must not add a gate).
- **F4 — no consumer reads `getCapabilities()`**, so its
  kinds-only `readonly string[]` signature survives the spec growth
  unchanged — zero call-site churn outside `Tooled.ts`.
- **F5 — the venue integration test asserts class statics** that Phase 4
  deletes; it is rewritten against the table + a live instance (the
  requirements' own acceptance shape), not merely patched.

## Questions (implementation-shape only; the requirements stay closed)

- **Q1 — How does repair become engaged?** *Recommended:* make
  `ManualBuildController extends CraftController` (both currently extend
  `CommandController`; `CraftController` adds only `declineToScene` + the
  deed gate — no conflict), then rebase `RepairController` on
  `ManualBuildController` (the `SharpenController` precedent for a
  non-build engaged act): resolve the item + the domain pacer, decline
  early on the obvious gates, `engageStep` with
  `durationMs = paceMs(REPAIR_MS, pacer, kinds)` (new
  `const REPAIR_MS = 6000`), and call `CraftingApi.repair` in
  `onComplete` with the existing decline/success narration. `salvage`
  stays instant (the requirements pace *engaged* steps only; salvage
  isn't one and the acceptance doesn't ask). Trade-off accepted: the
  decline-after-engagement case (stock consumed check fails at
  completion) narrates a wasted engagement — same posture as quench's
  "the quench goes wrong".
- **Q2 — Who paces a metal repair?** The requirements name "the `mending`
  instrument paces `repair`", but a metal repair's gate is heat, not a
  tool. *Recommended:* the pacer is the reachable instrument of a kind
  whose family confers `repair` — the `mending` tool for soft goods, the
  reachable `anvil` for metal (repair is in the anvil family); rate 1 when
  neither resolves. This keeps "the conferring kind paces" literal and
  makes a masterwork anvil's rate live data on metal repair too.
- **Q3 — Where does the workpiece-path mint find its control-bearing
  instrument?** `mintFromBuildImpl` resolves no tools; the anvil was
  consulted only during `hammer`. *Recommended:* no wire change — in
  `mintWorkpiece`, when `makerStuff` resolves and has a container, scan
  the container's contents (+ the maker's own inventory) for the
  highest-control tool bearing a kind that confers the minting verb
  (`anvil` for quench), and fold `grade.max(Grade.of(control))`. The
  vessel path is simpler: the vessel itself is `Tooled` — fold its own
  control. Rejected alternative: a `control` field on `BuildMintRequest`
  (a context-derivable fact on the wire — the same smell the
  `makerMode`-not-wire rule exists to prevent).
- **Q4 — What shape does the persisted array keep after normalization?**
  *Recommended:* persist the **authored mixed array** exactly as written
  (strings + spec records), with `setCapabilities` validating every entry
  (unknown kind throws for both forms; `rate` must be a finite positive
  number; `control` a `GRADE_BANDS` member; `placement` one of the two
  values) — and normalize **on read** through a private
  `entryFor(kind): CapabilitySpec | null` helper that
  `hasCapability`/`capabilityRate`/`capabilityControl`/
  `getInstanceContributions` share. Seeds stay byte-stable, the Hydrator
  round-trip is trivially mixed (the acceptance test's literal shape), and
  the arrays are tiny — no memo needed. "Normalized on set" is satisfied
  semantically: a string entry *is* the defaulted spec everywhere behavior
  reads it.

## Design (the settled implementation shapes)

### The table (`lib/craft/ToolCapability.ts`)

The vocabulary module grows each kind's definition — no new module
category (this stays the CLAUDE.md "vocabulary + validation array" shape):

```ts
export type CapabilityPlacement = 'reachable' | 'carried';
export interface CapabilityKindDef {
  /** cmd/ YAML keys the kind confers. */
  verbs: string[];
  placement: CapabilityPlacement;
}
```

| kind | verbs (cmd/ keys, `crafting/…`) | placement |
|---|---|---|
| `shaker`, `mixing-glass` | pour, stir, strain, garnish, serve, mix | reachable |
| `pot` | pour, stir, heat, plate, cook | reachable |
| `anvil` | hammer, quench, forge, repair, salvage | reachable |
| `mending` | repair, salvage | reachable |
| `whetstone` | sharpen | **carried** |
| `striking`, `strainer`, `muddler` | *(none — recipe-side kinds)* | reachable |

Exactly the thin classes' current lists — byte-for-byte. `reachable` maps
to environment + inventory buckets; `carried` to inventory only.
`ToolCapabilities` gains `definitionOf(kind)`, the spec-entry validator,
and the rate clamp constants `RATE_MIN = 0.25` / `RATE_MAX = 10`.

```ts
export interface CapabilitySpec {
  kind: string;
  rate?: number;                    // work-rate multiplier, default 1
  control?: string;                 // GradeBand embedded in the capital
  placement?: CapabilityPlacement;  // per-entry override of the kind default
}
```

### The mixin surface (`lib/craft/Tooled.ts`)

- `capabilities: (string | CapabilitySpec)[]` — same persisted field name.
- `setCapabilities` validates per Q4. `getCapabilities(): readonly string[]`
  keeps returning kinds. `hasCapability(kind)` unchanged (broken-gated).
- New: `capabilityRate(kind): number` — the entry's rate clamped to
  0.25–10, `1` when absent/kindless (total, never throws);
  `capabilityControl(kind): string | null`. Inter-Stuff reads go through
  these, never `.capabilities` (the antipattern table's typeof-probe rule).
- New: `getInstanceContributions(): CommandContributions` — union of the
  table's verbs over the **authored** entries (deliberately NOT
  broken-gated, per the requirements' surface decision), placement per
  entry-override-else-kind-default, merged over any inner contributor
  (the Behaved shadowing pattern, verbatim).

### Pacing (`obj/command/crafting/`)

`ManualBuildController` gains two protected helpers: `findCapability`
(promoted from `HammerController`, unchanged: held first, then room) and

```ts
protected paceMs(baseMs: number, instrument: Stuff | null, kinds: string[]): number
// = baseMs / max(instrument.capabilityRate(k) for k in kinds it has); 1 when not a tool
```

Per-controller conferring kinds: Hammer/Quench → `['anvil']` (Quench adds
its own resolve, F3); Sharpen → `['whetstone']` (the carried stone already
in hand); Pour/Stir → `['shaker','mixing-glass','pot']` (paced by the
resolved **vessel**); Strain → `['shaker','mixing-glass']`; Heat/Plate →
`['pot']` (an ingot workpiece isn't a tool → rate 1); Repair → per Q2.
Secondary requirements (the `striking` hammer) never pace.

### The control floor (`obj/api/CraftingLogic.ts`)

- `craftImpl`: record the matched capability per used tool; after the
  existing `grade.max(base)`, fold `grade.max(Grade.of(control))` per
  control-bearing used tool.
- `mintFromBuildImpl`: vessel path folds the vessel's own control;
  workpiece path per Q3.
- `repairImpl`: after `setCondition(1)`, when the resolved domain
  instrument (Q2) bears control and the item `isGraded`:
  `item.setGradeBand(item.getGrade().max(Grade.of(control)).band())` —
  floor only, never lowers.
- `AnalyzeResponseController` renders a one-line control band for a
  `Tooled` target with any control-bearing entry (bands only — the same
  register as the keenness/condition lines).

### The acceptance content

`seeds/domain/terminus/general-store/goods/sewing-machine.yaml`:
`class: /lib/craft/ToolItem`, `capabilities:
[{ kind: mending, rate: 3, control: fine }]`, `mass: 18`,
`_materialPath: /lib/material/element/iron`, prose to taste. Counter
gains `{ itemTemplatePath: …/sewing-machine, par: 1 }` + price **18**
(the ladder's new ceiling, ~2× the lantern; deliberately inside the
20-credit stipend so the live-drive beat can buy it honestly — big-ticket
*for this ladder*, calibrate upward later with the economy).

## Phase 1 — The table, the instance seam, the inventory consult

Land the substrate with zero behavior change for existing content: the
instance-derived lists duplicate the statics and `resolveDefs` dedupes.

**Files**
- `lib/craft/ToolCapability.ts` — `CapabilityKindDef`, the table,
  `definitionOf`.
- `lib/craft/Tooled.ts` — `getInstanceContributions` (bare-kind entries
  this phase; table-driven buckets, carried/reachable mapping, inner
  merge).
- `obj/api/CommandLogic.ts` — line 2277 →
  `collectBucketDefsForInstance(item, 'inventory')`; update the
  `collectBucketDefsForInstance` doc comment (it names env/peers only).
- `api/command.ts` — `InstanceContributor` doc comment gains the
  inventory bucket.

**Tests**
- `lib/craft/__tests__/CraftMixins.test.ts` extended: kinds → buckets per
  the table; `whetstone` yields inventory-only; verb-less kinds yield
  nothing; a broken tool still contributes (not gated); empty capabilities
  → empty contributions.
- New `lib/command/__tests__/CommandGiver.inventoryInstance.test.ts` (the
  `talk-affordance.test.ts` shape): a `ToolItem`-shaped host with
  data-only `capabilities: ['mending']` moved into a giver's inventory →
  the giver affords `repair`; moved out → gone on the delta; a
  `whetstone`-capability tool present in the *room* affords nothing
  (placement honored at the walk level). This is the CommandGiver
  acceptance coverage.
- Full suite green — the dedupe argument above, verified by the untouched
  crafting/venue suites.

**Commit** — `feat(craft): capability-keyed affordance table + instance-consulting inventory bucket`

## Phase 2 — Parameterized capability specs

**Files**
- `lib/craft/ToolCapability.ts` — `CapabilitySpec`,
  `CapabilityPlacement`, entry validation, `RATE_MIN`/`RATE_MAX`.
- `lib/craft/Tooled.ts` — mixed-array `setCapabilities` (Q4),
  `entryFor` helper, `capabilityRate`, `capabilityControl`,
  per-entry placement override in `getInstanceContributions`.

**Tests** (`lib/craft/__tests__/CraftMixins.test.ts`)
- String shorthand ≡ defaulted spec (`hasCapability`, rate 1, control
  null, kind-default placement — asserted pairwise).
- Unknown kind throws for both entry forms; bad `rate` (0, negative,
  NaN) and unknown `control`/`placement` throw on set.
- Rate clamp: 0.3→0.3, 0.1→0.25, 50→10.
- Placement override: `{ kind: 'whetstone', placement: 'reachable' }`
  yields environment + inventory (the grinding-wheel case);
  `{ kind: 'mending', placement: 'carried' }` yields inventory only.
- Hydrator round-trip: seed a host with a **mixed** array through
  `PersistentHydrator`, capture, re-hydrate — behavior-identical
  (`capabilityRate`/`capabilityControl`/`hasCapability` agree), and the
  persisted field is plain records (no marshaller).

**Commit** — `feat(craft): parameterized capability specs (kind + rate + control)`

## Phase 3 — Rate paces the steps; control floors the grade

**Files**
- `obj/command/crafting/ManualBuildController.ts` — extends
  `CraftController` (Q1); `findCapability` promoted; `paceMs`.
- `obj/command/crafting/{Hammer,Quench,Sharpen,Pour,Stir,Strain,Heat,Plate}Controller.ts`
  — durations paced per the kinds table above (Hammer drops its private
  `findCapability`; Quench adds the anvil resolve, F3).
- `obj/command/crafting/RepairController.ts` — engaged per Q1/Q2,
  `REPAIR_MS = 6000`.
- `obj/api/CraftingLogic.ts` — the three control-floor sites (craft /
  mint / repair) per the Design section.
- `obj/command/perception/AnalyzeResponseController.ts` — the control
  band line.

**Tests**
- New `obj/command/crafting/__tests__/tool-pacing.test.ts` — a rate-3
  anvil completes `hammer` at 5000/3 ms (and not before); a rate-0.5 kit
  is slower than base (honest both directions); an out-of-band authored
  rate paces at the clamp; a non-tool vessel paces at 1; engaged repair:
  base 6000 with a plain kit, ≈ 2000 with the rate-3 machine (the
  acceptance timing), metal repair paced by the anvil's rate (Q2).
- `obj/api/__tests__/CraftingLogic.repair.test.ts` extended — repair with
  a `control: fine` mender floors the item's grade at `fine`; a
  `masterful`-graded item is not lowered; an ungraded durable repairs
  unchanged.
- `obj/api/__tests__/CraftingLogic.branches.test.ts` (or a focused new
  block) — a craft resolving a control-bearing tool floors the output
  grade; the skill-seam ceiling untouched (floor only).
- **Unmodified and green**: `smithing-manual`, `cooking-manual`,
  `manual-build`, `sharpen`, `knowledge-ladder`, `CraftingLogic.*`,
  `craft-served-path` — every existing instrument has no `rate`, so every
  duration and grade is byte-identical.

**Risk.** The Q1 hierarchy change (`ManualBuildController extends
CraftController`) puts the deed-gate helpers in scope of step
controllers — inert (nothing calls them), but confirm no name collisions
at build.

**Commit** — `feat(craft): capability rate paces engaged steps; control floors the grade`

## Phase 4 — The sewing machine; the thin classes retire to data

**Files**
- **Delete** `lib/craft/Whetstone.ts`, `lib/craft/Anvil.ts`,
  `lib/craft/SewingKit.ts`.
- `obj/CookPot.ts`, `domain/lounge/CocktailShaker.ts` — drop the
  `commandContributions` statics (classes + capability defaults stay).
- Reclass to `/lib/craft/ToolItem` (F2):
  `seeds/domain/hearthworks/whetstone.yaml`,
  `seeds/domain/hearthworks/anvil.yaml`,
  `seeds/domain/terminus/general-store/goods/whetstone.yaml`,
  `seeds/domain/terminus/general-store/goods/sewing-kit.yaml`
  (their `capabilities:` rows already carry the kinds; comments updated to
  the data-only story).
- New `seeds/domain/terminus/general-store/goods/sewing-machine.yaml` +
  the counter stock line + price (Design § acceptance content).
- Comment-only cleanups: `domain/hearthworks/SmithyMenu.ts`,
  `lib/commerce/Menu.ts` (both name `lib/craft/Anvil` in prose).

**Tests**
- `domain/terminus/__tests__/general-store-content.test.ts` —
  `DISCRETE_ITEM_CLASSES` drops `/lib/craft/Whetstone` +
  `/lib/craft/SewingKit` (the machine rides the existing
  `/lib/craft/ToolItem` row); the stock/price assertions pick up the
  machine automatically.
- `domain/hearthworks/__tests__/hearthworks-venues.integration.test.ts` —
  the statics assertions (lines 252–267) rewritten: menus still
  commerce-only; a live `ToolItem` instance with `['anvil']` /
  the `/obj/CookPot` template's contributions asserted via
  `getInstanceContributions()` against the table; `Forge` statics
  assertion unchanged.
- New acceptance test (in
  `domain/terminus/__tests__/` or alongside the venue test): hydrate the
  sewing-machine seed — **no class beyond `ToolItem`** — carried by a
  giver it affords `repair`/`salvage`; its `capabilityRate('mending')`
  is 3 and control `fine`; a worn soft good repaired with it grade-floors
  at `fine` (the end-to-end variant story).
- Full suite + `pnpm lint`, `pnpm lint:gates`, `pnpm lint:module-scope`.

**Data migration (goes in the commit body + MR description).** The
seeders are insert-only, so existing DB rows keep
`class: /lib/craft/{Whetstone,Anvil,SewingKit}` and would hydrate against
deleted classes (the stale-class-ref hazard, hot-reload.md). Dev DBs:
delete-and-reseed (the bootstrap.md posture). Live box: before deploying
this build, purge the four template paths' rows (hearthworks whetstone +
anvil, store whetstone + sewing-kit — and any player-held clones stamped
from them) and reseed; the machine row seeds fresh. Document the exact
operator steps in the MR.

**Commit** — `feat(content): the sewing machine ships; thin tool classes retire to seed data`

## Phase 5 — Docs + the live drive

- `docs/subsystems/crafting.md` — replace the thin-class roster + "the
  end state is a capability-keyed affordance table … per-class statics are
  the interim" passage (§ The offer) with the shipped table: kinds →
  verbs/placement, spec parameters, rate/control consumption, the
  refresh-on-next-delta limitation; § Deferred seams updated.
- `docs/subsystems/command-spec.md` § who affords a verb — "the planned
  capability-keyed affordance table" becomes the shipped mechanism.
- `docs/subsystems/command-routing.md` § `InstanceContributor` — the
  inventory bucket now consults instances; `ToolMixin` joins `Behaved` as
  the second shipped consumer.
- `docs/antipatterns.md` § Working verbs conferred by a venue or commerce
  object — the fix's final form points at the table (a seed row's
  `capabilities:` list, zero code).
- **Live drive** (`e2e/tests/drive-crafting.spec.ts`, untracked — extended
  in place, not committed): both existing scenes must pass **unchanged**
  (the smithy scene already proves carried-only sharpen and the anvil
  surface, now data-fed); add scene 3 — *the general store: the machine*:
  spawn at `/domain/terminus/general-store/shop-floor`, `menu`/counter
  shows the machine priced; buy it (the stipend covers the 18-credit
  price by design); `repair`/`salvage` light up carried (the inventory
  instance-consult, live); exercise the family (a `salvage` of a cheap
  soft good does real work; a `repair` attempt narrates diegetically —
  the engaged act's ≈ base/3 timing is asserted by the Phase 3 tests, the
  drive proves the surface); drop the machine → the verbs leave on the
  delta. Screenshots per the house pattern.
- Plan/requirements retirement happens at `/finalize`, not here.

**Commit** — `docs(craft): capability-table docs sweep (crafting, command-spec, command-routing, antipatterns)`

## Deferred seams (attach points, not stubs — extract to slates at sweep)

Runtime affordance recompute on `setCapabilities`/break-repair (the
documented Behaved-shared limitation; surfaces refresh on the next
containment delta) · powered variants / the electric machine's supply
gate (the forge's `requiresHeatK` shape is the socket, electricity
consumer build) · batching (one engagement, N items) · per-capability
wear differentiation + machine-vs-hand advancement evidence · skill-side
control (`deriveAtFixedControl`'s `_control` stays reserved) ·
furnace-family migration (never — appliance mixin, not `Tooled`) · the
grinding wheel (now a free follow-on seed: `whetstone` kind,
`placement: reachable`, heavy — the Phase 2 override test is its proof).

## Critical files

- `obj/api/CommandLogic.ts` — the one-site inventory walk change (the
  substrate risk lives here).
- `lib/craft/ToolCapability.ts` — the table + spec validation everything
  keys on.
- `lib/craft/Tooled.ts` — the spec surface + `getInstanceContributions`.
- `obj/api/CraftingLogic.ts` — the three control-floor sites.
- `obj/command/crafting/ManualBuildController.ts` — the hierarchy change
  + `paceMs` every step controller rides.
