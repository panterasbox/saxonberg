# Hydration framework — implementation plan

Executes [hydration-framework-requirements.md](../requirements/hydration-framework-requirements.md)
(seeded by [hydration-framework-slate](../slates/builds/hydration-framework-slate.md)).
**Kind:** refactor/sweep, with one feature-shaped defect repair (the
Studio discards the data it collects). **Lead end:** kernel — the clone
pipeline and the persistence spine; three kernel consumers and one pack
consumer run before the MR.

What the code gets: one abstract root (`HydrationLayer`) that the standard
hydrator and four new layers extend; a plural `hydratorClass` on the row,
merged `by-entry` under `extends:`; a default data layer that runs whenever
a row has data and is never author-named; a `HydrationApi`/`HydrationLogic`
pair that drives the layers at mint, at go-live and on a lazy fault, stamps
what ran onto the host, and reports what nobody applied; a go-live mode that
skips `birthOnly` fields (the coin); the snapshot restore as a layer, which
collapses the body of record's ordering dance; a `seed` field kind that
retires two hand-written once-guards; a `lint:post-register` ratchet; and a
content sweep that deletes 1,528 copies of one line.

> ⚠ **Read § Where the plan departs from the requirements first.**
> Grounding found two places the requirements' survey was coarser than
> the code: the "two pack mixins that finish hydrating by hand" are one
> derive and one order-dependent arming step, so the pack placement proof
> is a different pack's hook; and keyed persistable hosts cannot name the
> snapshot layer on their row (their key arrives after the clone), so the
> keyed re-entry runs the same layer through an explicit seam. Neither
> reopens product scope.

---

## Grounding

Verified 2026-10-01 at `59465f95d` (detached, `build-3`), by opening the
files. Paths are repo-relative under `packages/server/src/mud/` unless
stated; line numbers are current at plan time. The grounding survey at the
scratchpad (`grounding.md`) is folded in; what this section adds is marked
**+**.

### The three drivers

1. **The clone pipeline** — `api/stuff.ts:555–612`. Step 6 resolves the
   effective `template.hydratorClass` via `StuffApi.singleton`, `null` when
   absent, in which case *no hydration step runs and `data` is ignored*
   (its own comment). Step 7 constructs, stamps zone + templatePath +
   optional identity (`opts.asIdentityPath`, `:600–607`), merges
   `opts.dataOverlay` over `template.data`, and calls
   `#registerAndInit(obj, hydrator ? o => hydrator.hydrate(o, data) : null, context)`.
   `#registerAndInit` (`:898–960`): scope stamp → `ProxyApi.wrap` →
   `register` → `ExecutionContextApi.run(StuffApi, proxy, 'constructor', …)`
   wrapping **hydrate then `postRegister`** → on throw, `unregister` and
   rethrow → `Events.StuffCreated`. ⭐ Hydration already runs after
   registry insertion with both identity axes stamped — the slate's Q1
   has no obstacle.
2. **`TemplateLogic.restoreFromTemplate`** — `platform/idea/api/TemplateLogic.ts:432–451`.
   Hardcodes `PersistentHydrator.templatePath`, ignoring the row's own
   `hydratorClass`, and runs the full `hydrate(stuff, tpl.data)`. Callers:
   `CmsLogic._writeContent` (`CmsLogic.ts:573–632`, every live instance at
   the path) and `PackLogic.rehydrate` (`PackLogic.ts:2968–2985`, counts
   instances → the `rehydrated` figure `pack sync` prints).
3. **`PersistableLogic.restoreState`** — `PersistableLogic.ts:671–760`.
   (1) merges every `fields` slice, drift-guards to
   `getAllPersistentFields`, hydrates through the `PersistentHydrator`
   singleton; (2) container slice; (3) anatomy preload + Slotted re-occupy;
   (4) every contributor's own `restoreSlice` (today: `Estate`).
   `materializeImpl` (`:937–958`): `optedOutOfPersistence` → scope =
   `host.getIdentityPath()` → key = explicit ?? stashed ?? `ownerOfScope` →
   `stashKey` → `assertUniqueKey` → `findByScopeAndOwner` → `restoreRecord`
   → `reseedCast`. **+** `restoreOrSeedImpl` (`:1258`) and `standUpKeyed`
   (`:1264`) are the keyed re-entry drivers; eight callers in packs
   (`residence` ×3, `eternal-university` ×1, `trade-mining` ×2, `terminus`
   ×1 — grep `restoreOrSeed(` under `packages/content/*/src`).

### `Hydrator` today

- `lib/stuff/Hydrator.ts` — a one-method **interface**; no runtime class.
- `platform/idea/persistence/PersistentHydrator.ts` — `extends Idea
  implements Hydrator`, the only implementer. `static readonly templatePath
  = TemplatePaths.persistentHydrator` (`lib/paths.ts:75`). Phase 1
  (persistent fields, marshaller un-marshal, `set<Pascal>` then bracket) and
  Phase 2 (instruction fields, `apply<Pascal>` required). Both loops
  `if (!(field in data)) continue` — an undeclared data key is never
  visited and never reported.
- Its row: `packages/content/platform/content/platform/idea/persistence/PersistentHydrator.yaml`
  — `class: /platform/idea/persistence/PersistentHydrator`, `data: {}`, no
  `hydratorClass` (the recursion terminator). **+** The same row is seeded
  for unit tests in `packages/server/src/test-bootstrap.ts:66–76`
  (`KERNEL_CONTENT_ROWS`), and five sibling rows there name it as
  `hydratorClass`.
- **+** `backend/BootstrapManager.ts:36,157` —
  `SecurityApi._registerBoundaryExemptBase(PersistentHydrator)`: a clone
  inside a circle must be able to call the field-resident hydrator
  instance (found live: every in-circle clone silently skipped hydration
  without it). Every layer needs this exemption.
- ⚠⚠ **Three call-security gates key on the hydrator's module id**:
  `platform/thing/Coin.ts:88–91` (`CoinQuantityMutators`, on
  `setQuantity`, `@Final @Unshadowable` — the cash conservation gate),
  `platform/thing/CraftVessel.ts:84–87`, `lib/craft/Serviceable.ts:48–51`
  (`SoiledWriters`). Each is
  `FromModule('/platform/idea/persistence/PersistentHydrator', {includeSubclasses: true})`
  + `FromTemplate('/platform/idea/persistence/*Hydrator')`. A denial
  throws. `lint:gates` (`scripts/check-gate-strings.ts`) resolves every
  non-glob `FromModule` string and every `FromTemplateMethod` pair.

### The chain-composed framework that already exists

`MixinApi.getPersistenceContributors(ctor)` — `api/mixin.ts:837–900`,
type `PersistenceContributor` at `:254–271`. Concrete-class-first walk,
keyed on the layer's OWN `_mixinName` (else `c.name`), `fields` = own
`fieldMeta` entries with `persistent: true`, `captureSlice`/`restoreSlice`
as own statics. Driven only by `PersistableLogic`. Seven mixins declare a
slice. ⚠ `captureState` runs a layer's `captureSlice` OR its `fieldMeta`,
never both (Avatar build D14).

**+** `MixinApi.getAllFieldMeta` (`api/mixin.ts:770–800`) merges
per-field, nearest layer wins per property — a new `FieldMetaEntry`
property is visible to every reader with no aggregator change.
`FieldMetaEntry` lives in `lib/mixin.ts:90–175` (`ref`, `lifetime`,
`inverse`, `authorable`, `authorPicker`, `runtimeState`, `spoiler`, plus
`persistent`, `instruction`, `inherit`, `stackIdentity`).
`scripts/check-field-meta.ts --lint` validates entry shape.

### The seven candidate hooks

Measured on the method declaration: **82 implementations, 40 whose body
loads state, 7 that are finishing-hydration or seeding.**

| file | body | limb |
|---|---|---|
| `lib/npc/Cast.ts:158–176` | super → `hydrateBeliefs()` (self-call; the method is `SelfOnly`, `BeliefStore.ts:632`) → `_seedDossier()` (`:185–248`: prologue → `seedChronicleClaims`, renown → `RenownApi.seedTo`, competence → `creditSignature`; each guarded by "any `claim` row exists") | hydration + seeding |
| `lib/behavior/Behaved.ts:195–207` | super → `_teardownBehaviors` → `_wireBehaviors` → `_seedDispositions` (`:214–222`, `seedTraitClaims`, guarded the same way; `seedTraitClaims` is `SelfOnly`, `lib/trait/Dispositioned.ts:374`) | structural + seeding |
| `lib/husbandry/Bonded.ts:396–435` | super → `SpeciesApi.preloadAnatomy(self)` in try/catch → born-hungry satiation | hydration (reference row) + initial state |
| `lib/character/Avatar.ts:759–767` | `stampContext` → `installDefaultLoadout` → `chainPostRegister` → `rescheduleCalendarPing` — the vessel sequence | structural |
| `platform/agent/PrimaryAvatar.ts:89–165` | `stampContext` → `PlayerApi.registerAvatar` → `hasRecord ? (chain → materialize → reconcileMortalState → loadout) : (loadout → chain → capture)` — the `slot 'cranial' is full` dance | spine restore |
| `lib/command/CommandGiver.ts` | `collectSelfDefs` → `pushCommandSource` | structural |
| `packages/content/trade-mining/src/lib/Working.ts:402–409` | super → `airAt()` — a walk over the exit graph | **derive** (see § departures) |

**+** `isGuest` is stamped by `stampContext` from the clone **context**
(`Avatar.ts:721–725`), not by the overlay; `playerId` rides the overlay
because it is a declared field (`Avatar.ts:354–360`, and `:339`'s own
note: *hydration Phase 1 runs BEFORE `postRegister`*). `shouldPersist()`
reads `isGuest` (`:702–704`). The guest clone is
`platform/idea/Login.ts:303–309`
(`{ user, isGuest: true }, { dataOverlay, asIdentityPath }`); the login
clone is `PlayerLogic.materializeAvatar` (`:572–585`) and the estate
stand-up `standUpForEstate` (`:495–510`), both `asIdentityPath`.

**The 33 that stay** (roster warming): 22 `*Catalogue`, `AddressRegistry`,
`ChattelRegistry`, `ParcelRegistry`, `CentralBank`, `EmploymentEngine`,
`PresenceRelay`, `PressBoard`, `PartyRoster`, 3 `*Standings`, the 4
wardens.

**+ The pack hooks** (`grep -rl postRegister packages/content/*/src`,
22 files, non-test): catalogues/registries (`DyestuffCatalogue`,
`WaybillRegistry`, `WatercourseCatalogue`); structural completion
(`ManaMain.seatSelf`, `TpaTerminal.seatSelf/armSupply/armNetwork/armTimetable`,
`CheckRack.seatSelf`, `DormWarren`/`BuildingWarren`/`PlatWarren`
provisioning, `Field.installFieldReserves`, `Wood.installWoodReserves`,
`ToolRack.reset`, `LineAccess` catalogue ref, `Realtor` effect
registration, `Shore.refresh`); one seed (`Herdbook` files its herd into
`HerdRegistry` once, `:156–174`); and one reference-row read —
`energy/src/thing/FuelStore.ts:74–92`, which reads the covering
Locality's `fuelPerStreetNight` into `_litresPerStreet`, defaulting when
the locality does not resolve. `GridPowered` (`energy/src/lib`) says in
its own header it resolves on first READ, *never at postRegister* — a
lazy layer written by hand. `ManaPowered.armSupply` (`arcana/src/lib/ManaPowered.ts:142–147`)
is called by `TpaTerminal.postRegister` after `seatSelf`.

### BeliefStore — two routes

`lib/belief/BeliefStore.ts`: `viewerKey(viewer)` (`:352–366`, module-local)
— row 1 keyed persistable host → `null` (its own record via
`captureSlice`); row 2 minted identity → `getIdentityPath()`; row 3
`Singleton` → identity; row 4 → `null` (memory only). `captureSlice`
(`:441`) returns `{beliefs: []}` when `viewerKey !== null`; `restoreSlice`
(`:454`) installs via `loadBelief` (ungated, `:608`), *deliberately not*
`hydrateBeliefs()` (`SelfOnly`). `persistenceActive()` is module-local
(`:321`); `PersistApi.isConnected()` exists (`api/persist.ts:175`).
Composers: `lib/creature/KeptAnimal.ts:95` and
`lib/character/Character.ts:115`.

### Content corpus

1,970 rows; **1,528 name `hydratorClass`, one distinct value** (re-counted
this cycle); 68 `extends:` children; 0 rows with non-empty data and no
hydrator. **+** 51 rows carry `prologue:` or `dispositions:` (lounge 5,
terminus 30, rejection 6, hearthworks 2, trade-haulage 3, hearts-delight
3, eternal-university 1, newbie-wilds 1); 49 rows name a `Cast`-family
class; 2 rows name `KeptAnimal`
(`generic-objects/content/stuff/agent/cat.yaml`,
`trade-mining/content/trade/mining/agent/canary.yaml`); 6 rows carry a
comment citing *invariant 5* (`platform` ×3, `transport`, `water`,
`residence`). The coin row
(`generic-objects/content/stuff/thing/Coin.yaml`) authors `quantity: 1`;
`Stackable.quantity` is `{ persistent: true, authorable: true }`
(`lib/stuff/Stackable.ts:127–129`). `mana-lamp.yaml` authors no
`mainsRef`.

### The authoring surfaces

- `write` — `content/platform/content/platform/cmd/shell/write.yaml:38–45`
  (`--hydrator` string, *"pass empty string to omit"*);
  `platform/idea/cmd/shell/WriteController.ts:142–184` (`DEFAULT_CONTENT_HYDRATOR`
  unless `--extends`; `--hydrator ''` → undefined; class-schema check).
- `cat` — `CatController.ts:150–176`: prints the hydrator line only
  `if (tpl.hydratorClass)`.
- `cp`/`mv` carry `tpl.own.hydratorClass` raw.
- CMS — `CmsLogic.ts:573–632` edits `data` only, re-submits
  `existing.own.{class,hydratorClass,extends}`; ships `templateMeta`
  (`types/src/index.ts:4043`, `client/src/store/cmsSlice.ts:29`), unrendered.
- Studio — `StudioLogic.ts:865`:
  `saveTemplate(path, { class: classPath, data: input.data ?? {} })`. No
  hydrator → the data is discarded.
- The gate — `TemplateLogic.enforceCodeFieldGate` (`:183–236`): no
  Avatar author → allow; wizard → allow; else delta on the RAW row;
  `folderScaffold` = no brains + standard-or-absent hydrator + folder
  class. `CodeNamingFields.FIELDS` (`lib/stuff/CodeNamingFields.ts:39`).

### `Template` and `extends:`

`lib/stuff/Template.ts`: `TemplateOwn`/`TemplateSpec` (`:52–67`,
`hydratorClass?: string`), `fieldMeta.hydratorClass: { persistent: true }`
(`:131`), effective `readonly hydratorClass?: string` (`:164`),
`toDocument` writes `own.hydratorClass ?? null` (`:250`), `#inherit`
(`:255–300`) walks ancestor-first with nearest-stated-wins for `class` and
`hydratorClass`, then merges `data` per the effective class's
`fieldMeta.inherit`. `scripts/pack-roots.ts` `effectiveRow` (`:587–677`)
is the lint-side copy of the same walk.

### Pack install

`PackLogic.ts`: `DomainFile.hydratorClass?: string` (`:115`, parsed at
`:973`); `assertClassesResolve` (`:1189–1210`) resolves `class` and
`hydratorClass` alike through `resolveClassFile`;
`reportUnreferencedClasses` (`:1373–1409`); the domain preimage
`{class, extends, hydratorClass, data}` (`:1584–1630`, `canonicalBody`
normalises absent/undefined; `exportBody`).

### Lints

`scripts/check-instanceable-placement.ts` — invariants 4 (`:371–373`), 5
(`:377–391`), 6 (`:393–398`), 12 (`:433+`, only `if (hyd === STANDARD_HYDRATOR)`,
`ORPHAN_DATA_KEY_CEILING = 393` at `:297`). 60 `lint:*` scripts;
`lint:family` derives the roster. No `lint:post-register`.
`scripts/check-object-verbs.ts` keeps `EXEMPT_APIS` (`:50+`) for the
framework-lifecycle Apis (`PersistableApi`, `StuffApi`, `TemplateApi` —
*"template re-hydration = lifecycle"*); the census is zero and CI-gating.
`lint:lib-statics` ratchets public statics on `lib/` + `platform/` +
pack `src/` classes (ceiling 337); statics inside a mixin factory's
returned class are out of scope.

### Diagnostics

`DiagnosticApi.record({ path, severity?, message, stack?, channel? })`
(`api/diagnostics.ts:80`; `RuntimeDiagnostic` at `types/src/index.ts:4214`).
Nothing in the hydration path writes one.

### Settled elsewhere — not re-derived

`postRegister` under hot reload traced safe (2026-09-24). The
`props:`/`cast:`/`costume:` once-flags cover INSTRUCTION fields only. The
hydrator reads `persistent`, never `authorable`. `extends:` is shipped and
resolved at read.

---

## Where the plan departs from the requirements

1. **The pack placement proof is `energy`'s `FuelStore`, not the two
   hooks the requirements counted.** `Working.postRegister → airAt()` is a
   walk over the exit graph that re-settles on `refreshAir` — a derive,
   limb four, and it stays. `ManaPowered.armSupply` is reference-row
   hydration, but the only host that calls it is `TpaTerminal`, whose hook
   orders it after `seatSelf`; moving it ahead of the seat is a TPA
   question this build has no drive for. `FuelStore.postRegister` is the
   clean case: a reference-row read with a declared default, in a system
   pack, order-independent. It becomes `/system/energy`'s own layer (W6)
   and is the acceptance criterion's proof. The TPA case leaves as a seam.
2. **Keyed persistable hosts do not declare the snapshot layer on their
   row.** Their key arrives from the establishing context after the clone
   (`restoreOrSeed`), so at mint the layer has nothing to look up. The
   same layer runs for them through an explicit seam
   (`HydrationApi.applyLayer`) from `restoreOrSeedImpl`, so a named pet
   and a `Cast` both reach their memory through one framework, which is
   what drive step 5 asserts. The row-declared form serves hosts whose
   key is derivable at mint — a minted identity or a singleton scope — the
   body of record first.
3. **`Avatar.enter`'s `hydrateBeliefs()` stays this build.** It is the
   same pattern as `Cast`'s, but it sits on the login path beside the
   snapshot layer, and one login-path change per build is the risk
   budget. Deferred seam.

---

## Plan-level decisions

**D1 — A layer is an `Idea` singleton with a row, under one abstract root.**
`lib/stuff/HydrationLayer.ts` (`abstract class HydrationLayer extends Idea`)
replaces the `Hydrator` interface; `PersistentHydrator` extends it and
keeps its path. Concrete kernel layers live in the new cluster
`platform/idea/hydration/` (four classes: `SnapshotLayer`, `BeliefLayer`,
`SeedLayer`, `SpeciesLayer`) with rows at `/platform/idea/hydration/<Name>`
(`data: {}`, no `hydratorClass`). A pack's layer lives at
`<pack>/src/idea/hydration/<Name>.ts` with a row at
`/<root>/idea/hydration/<Name>`. Resolution is `StuffApi.singleton` — the
exact shape the hydrator has today, so HMR, the in-flight cycle guard and
the sandbox boundary exemption all carry over. ⭐ **A layer's row path
equals its class path** (the mirror convention; the `*Logic` exception
does not apply), which is what lets `assertClassesResolve` and
`lint:gates` keep resolving it. This is not a new module category: an
abstract root in `lib/` plus instanceable `Idea`s in `platform/idea/`.
The non-goal (un-homing strategy objects into lazy modules) is untouched.

**D2 — The layer contract is instance members, not statics.**
```ts
abstract class HydrationLayer extends Idea {
  abstract declaration(): LayerDeclaration;  // { source, required, eager, goLive }
  abstract apply(host: Stuff, data: Readonly<Record<string, unknown>>, ctx: LayerContext): Promise<LayerResult>;
}
type LayerSource = { kind: 'row' | 'snapshot' | 'collection' | 'reference'; name: string };
type LayerResult = { status: 'applied'; consumed: string[] } | { status: 'skipped'; reason: string } | { status: 'unreachable'; reason: string };
type LayerContext = { mode: 'mint' | 'go-live' | 'ensure' | 'explicit'; context: unknown /* the clone bag */; key?: string };
```
`LayerDeclaration`, `LayerSource`, `LayerResult`, `LayerContext` are the
types `HydrationLayer.ts` exports beside the class (the one-concept rule).
Instance members so `lint:lib-statics`' ceiling does not move; a layer is
stateless, so these are constants. `required` and `eager` are
declarations, not defaults — the abstract method forces every layer to
say both.

**D3 — The row declares layers, plural; the effective value is always a list.**
`TemplateOwn.hydratorClass?: string | string[]` (raw, as written);
effective `readonly hydratorClass: readonly string[]` (never undefined).
`Template.fieldMeta.hydratorClass` gains `inherit: 'by-entry'`; `#inherit`
merges the lists by the shipped by-entry algebra (a bare string is its own
key: parent's entries in order, child's duplicates substituted in place,
new entries appended). `toDocument` writes the raw value. `effectiveRow`
in `scripts/pack-roots.ts` mirrors it. The pack preimage normalises to
array-or-undefined so a stored bare string and a filed one-element list
hash identically. A child unsetting an inherited layer is the legibility
slate's open question; not this build's.

**D4 — The default data layer is implicit and unnameable.**
`HydrationLogic.plan(template, data)`: if `Object.keys(data).length > 0`
the plan begins with `PersistentHydrator`; then each declared layer in
list order, with `PersistentHydrator`'s path dropped from the declared
list if present (the transitional state between W1 and W5; after W5 the
lint forbids it). A row whose effective class extends `HydrationLayer`
plans nothing (the terminator; the in-flight guard remains the backstop).

**D5 — `HydrationApi` + `HydrationLogic` drive every path that fills an object.**
`api/hydration.ts` (ends `SecurityApi.decorateApiClass(HydrationApi)`) over
`platform/idea/api/HydrationLogic.ts` (row `/platform/idea/api/hydration`,
`extends ApiLogic`, methods gated `FromModule('/api/hydration#HydrationApi')`).
Surface:
- `plan(template, data): HydrationPlan` — the resolved, ordered layer
  list with declarations;
- `applyAtMint(host, template, data, context)` — called from the clone
  pipeline's `#registerAndInit` closure, inside the constructor frame,
  before `postRegister`; runs every eager layer in plan order, interprets
  each result against its declaration (optional + unreachable → skipped;
  required + unreachable → throw naming the layer; the pipeline's existing
  catch unregisters), records pending lazy layers, stamps the record (D6),
  reports unapplied keys (D11);
- `applyAtGoLive(host, template)` — `restoreFromTemplate`'s body; runs the
  plan's layers whose declaration says `goLive: true` in go-live mode;
- `ensure(host)` — runs the host's pending lazy layers once, serialised
  per host; the fault site for a lazy layer, called by a mixin's own async
  read seam;
- `applyLayer(host, layerPath, ctx)` — runs one layer explicitly
  (`mode: 'explicit'`, with `key`), for the keyed re-entry;
- `describe(spec | template, data): HydrationLine[]` — what `cat`, `write`
  and the CMS header print: each layer's name, source, eager/required, the
  data keys the default layer will apply, the keys nobody will, and the
  layers the class **advertises** but the row does not name (D12);
- `recordOf(host): HydrationRecord | null`.
`HydrationApi` joins `EXEMPT_APIS` in `check-object-verbs.ts` under the
existing *"template re-hydration = lifecycle"* note — mandate (b), the
`PersistableApi` precedent. `StuffApi.clone` step 6 becomes a
`HydrationApi.plan` call; `#registerAndInit`'s `hydrate` closure becomes
`o => HydrationApi.applyAtMint(o, template, data, context)`; the
`create()` path passes `null` as today.

**D6 — The hydration record is a framework stamp on `Stuff`.**
A hard-private `#hydration: HydrationRecord | null` slot on `Stuff`
(`{ applied: {layer, consumed}[], skipped: {layer, reason}[], pending: string[] }`),
written through a caller-allowlisted seam `Stuff._stampHydration` (only
`/platform/idea/api/HydrationLogic`), read through
`getHydrationRecord()`. Same shape as `#templatePath` / `#zone`. Host
placement reasoning is in § Host placement.

**D7 — Layer identity and the three gates: the gate strings do not change.**
The only layer that writes a gated field is `PersistentHydrator`: the
default layer IS it, go-live IS it in a mode, and `SnapshotLayer`'s field
pass delegates to `restoreState`, which calls its `hydrate`. A new layer
reaches a host through the host's **public methods**; where a method is
`SelfOnly` the layer uses the shape `restoreSlice` already uses
(`loadBelief`) or the host gains a public applier whose body makes the
privileged calls as self-calls. Where a layer genuinely needs admission to
a gated method, the arm is **by template and calling function** —
`FromTemplateMethod('/platform/idea/hydration/<Layer>', 'apply')` — never a
module glob; `lint:gates` resolves the pair. A pack layer writing
`quantity` or `soiled` is denied, which is the gate doing its job. The
`Coin` comment's *"there is no runtime class to gate on"* becomes false
and is updated; the arms are not widened to `HydrationLayer` (a
value-bearing write admitted to every layer anybody ships is the wrong
direction).

**D8 — Unreachability and requiredness are the layer's declaration, the framework's interpretation.**
A layer returns `unreachable` when its source is closed (Mongo not
connected — `PersistApi.isConnected()`; a reference row that does not
resolve). `required: false` → recorded as skipped, the clone proceeds.
`required: true` → the clone fails, the error names the layer and the row.
Every test run and all of early boot are the optional case; the layer says
so, not an early return.

**D9 — Lazy is a recorded pending set faulted by `ensure`.**
`eager: false` → not run at mint; listed in `record.pending`;
`HydrationApi.ensure(host)` runs them once. No shipped layer is lazy in
this build (the two examples the requirements name are both eager, and
`GridPowered` stays hand-lazy); a test layer proves the mechanism. A sync
read cannot be served by a lazy layer, which is why `SpeciesLayer` is
eager.

**D10 — Go-live skips `birthOnly` fields; only the data layer runs at go-live.**
`FieldMetaEntry.birthOnly?: true` — *hydrated when the instance is minted,
never pushed by go-live*. `PersistentHydrator.apply` in `go-live` mode
skips both phases for a `birthOnly` field (the instruction once-flags
stay as they are; `props`/`cast`/`costume` do not need the flag). The
field's owner declares it: `Stackable.quantity` — the generalisation of
*an author who edits the list and wants it applied re-clones*, now stated
for a value field. Why not a per-row opt-out: the hazard is a property of
the FIELD wherever it is authored (a scrip's quantity, a lime crate's),
and a row-level switch would have to be remembered on every row that
authors a stack. Why not diff-based go-live: it would stop the coin reset
but would still write a changed authored `quantity` onto stacks still at
the old value — minting with no ledger leg. `goLive: true` is declared by
`PersistentHydrator` alone; snapshot, belief, seed, species and the pack
layer declare `false`, so go-live cannot re-read a snapshot, re-seed a
ledger or re-warm a species. `pack sync`'s `rehydrated` stays a count of
HOSTS the go-live pass touched; its help text says so.

**D11 — A data key no layer consumed is reported, twice.**
At mint: `unapplied = keys(data) − ∪ consumed` → one
`DiagnosticApi.record({ path: templatePath, severity: 'warn', channel: 'hydration', message })`
per `(templatePath, key-set)` per process (a `Set` on `HydrationLogic`;
the topic rows `TopicCatalogue` parses directly would otherwise warn on
every clone). At write: `WriteController` and `StudioLogic.createTemplate`
call `HydrationApi.describe(spec)` and surface the unapplied keys as a
note on the envelope (`ctx.note({ kind: 'warning', … })` — the existing
note kinds; not a refusal, because a key a catalogue reads directly is a
legitimate authoring act). `cat` prints the same lines.

**D12 — A mixin may advertise the layer that fills it; the row still decides.**
`static hydrationLayers?: readonly string[]` on a mixin's returned class
(`BeliefStoreMixin`, `BondedMixin`, `BehavedMixin`, `CastMixin`; out of
`lint:lib-statics`' scope by its own rule). `MixinApi.getAdvertisedLayers(ctor)`
walks the chain. `describe` prints *advertised, not declared* for any
advertised layer the row omits. This is not chain composition — nothing
runs because of it — it is how the silent-omission class becomes visible
at the two authoring moments. The seed kind additionally gets a lint
(D15), because there the omission is decidable from the row alone.

**D13 — The seed kind is a field flag and a required applier.**
`FieldMetaEntry.seed?: true`. `SeedLayer` (`source: {kind:'row'}`, eager,
optional in the sense that a closed ledger skips, `goLive: false`) walks
`getAllFieldMeta(ctor)` for `seed` entries present in `data` and calls
`host.seed<Pascal>(value)`; absence of the applier throws (the Phase-2
rule). The applier owns its idempotence (the ledger's own "a claim already
exists" read), which is ledger-specific and stays; the framework owns the
rest: mint-only, after the data layer, never at go-live, recorded. Fields:
`Behaved.dispositions` → `seedDispositions(seeds)`; `Cast.prologue` →
`seedPrologue(lines)`, `Cast.renown` → `seedRenown(claims)`,
`Cast.competence` → `seedCompetence(claims)` (the three channels
`_seedDossier` writes, each keeping its own guard). The appliers are
public, gated `AnyOf(SelfOnly, FromTemplateMethod('/platform/idea/hydration/SeedLayer', 'apply'))`;
their bodies' inner calls (`seedTraitClaims`, `seedChronicleClaims`,
`RenownApi.seedTo`, `creditSignature`) are self-calls, as today.

**D14 — The belief and species layers call the hosts' method surface.**
`BeliefLayer` (`source: {kind:'collection', name:'beliefs'}`, eager,
optional, `goLive: false`): applies iff `MixinApi.isBeliefStore(host)` and
`host.getBeliefViewerKey() !== null` (a new public method on the mixin
exposing the module-local `viewerKey`); reads
`BeliefDocument.find({ viewerId })` and installs via `host.loadBelief`
— the `restoreSlice` shape, so `hydrateBeliefs()` keeps its `SelfOnly`
gate untouched. `SpeciesLayer` (`source: {kind:'reference', name:'species'}`,
eager, **required**, `goLive: false`): applies iff `isOrganism(host)` and a
`_speciesPath` is set; `await SpeciesApi.preloadAnatomy(host)` then
`StuffApi.findByTemplatePath(speciesPath)` — null is `unreachable`, which
with `required` fails the clone naming the row and the species path.
Missing ancestor clades stay tolerated inside `preloadAnatomy`. ⚠ The
tolerance was the bug; a row naming a species that does not exist should
not clone.

**D15 — The lints.** `lint:instanceable`: 4 → every entry of the plural
list names a row that is a layer row (carries `data: {}` and no
`hydratorClass`); 5 → no row names `PersistentHydrator` (from W5), and no
child restates an entry its parent supplies; 6 → **retired** (the state it
guarded cannot occur); 12 → applies to every row with data (the same
population as before; ceiling 393 holds, re-measured); **13 (new)** → a
data block carrying a `seed`-flagged key on a row whose effective list
names no `SeedLayer` (the orphan-data class, for the one kind the row
alone decides). `lint:post-register` (new, `scripts/check-post-register.ts`):
walks kernel `src/mud/**` and every pack `src/**` (via `pack-roots.ts`),
finds `postRegister(` **method declarations** (never docstring mentions),
and reports two counts against two ceilings — implementations and bodies
matching the state-loading predicate (`\.find\(|findByScope|hydrate|rebuildIndex|warm\(|restore|load|singleton\(`
over the method body; the build records the exact regex in the script and
cites the census it produced). ⚠ Measured by this script at W0 and gated
at **its** numbers; the requirements' 82/40 are the expectation, the
script's output is the truth. The walker is one exported function with
named predicates, so the eager-residency slate's never-fault predicate
(`standUpKeyed|placedIn` callers) is a third predicate on the same
census, not a second script — the requirements' *"whichever lands second
reads the first's"*. The ratchet test asserts the invariant (at or below
the ceiling, above zero), never the number, and carries a positive fixture.
`lint:field-meta --lint` learns `seed` and `birthOnly`.

**D16 — The snapshot layer, and the body of record's hook.**
`SnapshotLayer` (`source: {kind:'snapshot', name:'holder_snapshots'}`,
eager, optional, `goLive: false`): applies iff `isPersistable(host)`, not
`optedOutOfPersistence`, and the host's key is derivable at mint —
`getIdentityPath() !== getTemplatePath()` (a minted identity) or the class
composes `SingletonMixin`; otherwise `skipped: 'no key at mint'`. Body =
`materializeImpl(host, ctx.key)` — the existing function, so
`stashKey`/`assertUniqueKey`/`restoreRecord`/`reseedCast` are untouched —
returning `applied` when a record was found, `skipped: 'no record'`
otherwise. `restoreOrSeedImpl` runs the restore half through
`HydrationApi.applyLayer(host, SNAPSHOT_LAYER, { key })` so the record
shows it. For the guest ordering, `isGuest` becomes a declared field on
`Avatar` (`{ persistent: true, runtimeState: true }`) and rides the
guest overlay beside `playerId` — `Avatar.ts:339`'s reasoning applies
verbatim; `stampContext` keeps setting it. The PrimaryAvatar seed row
(`/platform/agent/PrimaryAvatar`) declares `hydratorClass: [/platform/idea/hydration/SnapshotLayer]`.
`PrimaryAvatar.postRegister` becomes: `stampContext` → `registerAvatar` →
`if (restored) reconcileMortalState(spineKey)` → `installDefaultLoadout`
→ `chainPostRegister` → `if (spineKey && !restored) capture`, where
`restored = HydrationApi.recordOf(this)?.applied.some(a => a.layer === SNAPSHOT_LAYER)`.
⭐ The ordering is now a property of the plan — `[data, snapshot]`, then
the hook — and the invariant the framework states is *every eager layer
completes before `postRegister` begins*, so the loadout never asks
whether a restore happened: it is idempotent against one (the occupancy
guard) and runs after any. The `slot 'cranial' is full` branch has no
code to live in.

**D17 — Layers and the spine's capture: never both.** A `HydrationLayer`
declares no `fieldMeta` and no `captureSlice`; it is not a persistence
contributor and never appears in a record's `state`. `lint:post-register`'s
sibling check in the same script refuses a `HydrationLayer` subclass with
either (the Avatar build's D14, stated for layers). A layer that restores
a slice (`SnapshotLayer`) delegates to the spine; it does not become one.

**D18 — The gate: sets, and the scaffold rule.** `enforceCodeFieldGate`
compares the raw lists as sets; a create with no list passes; naming or
changing an entry is `hydratorClass` on the violation list; `folderScaffold`
requires an empty own list. The baseline stays the RAW row. The
protowizard door stays open and widens: the Studio names nothing and its
data applies.

---

## ⭐⭐ Host placement

| what | host | what composing/declaring it claims |
|---|---|---|
| `HydrationLayer` (abstract) | `lib/stuff/HydrationLayer.ts`, extends `Idea` | A layer is a stateless, row-backed singleton; nothing instances the root (`lint:instanceable` 1 holds by construction). Claims nothing about any other Stuff. |
| `PersistentHydrator`, `SnapshotLayer`, `BeliefLayer`, `SeedLayer`, `SpeciesLayer` | `platform/idea/persistence/` (stays) and `platform/idea/hydration/` (new cluster, four classes) | Instanceable `Idea`s; each claims only what its `apply` guard says (`isBeliefStore`, `isOrganism`, `isPersistable`). ⭐ The guard is on the LAYER choosing whether a host is its business, not on a host narrowing a mixin — the layer is the strategy, the host is the subject. |
| `FundingLayer` | `packages/content/energy/src/idea/hydration/FundingLayer.ts`, row `/system/energy/idea/hydration/FundingLayer` | A pack layer; claims the host is a `FuelStore`. Proves the placement test with no kernel edit. |
| the hydration record (`#hydration` + seam + `getHydrationRecord()`) | `Stuff` | Every Stuff can say what filled it; `create()`d objects say nothing. Not a capability — provenance of the clone, like `#templatePath`. **No guard re-narrows it.** The *Freshness off every Thing* shape does not apply: a stamp confers no behaviour. |
| `birthOnly` | `FieldMetaEntry`; declared on `Stackable.quantity` | Every stack's quantity is birth-only under go-live — a crate of limes edited live keeps its live count, exactly as its contents do. The flag is the field owner's; `Coin` inherits it. |
| `seed` | `FieldMetaEntry`; declared on `Behaved.dispositions`, `Cast.prologue`, `Cast.renown`, `Cast.competence` | Each owner already owns the field and the applier that writes its ledger; the flag names the kind. |
| `seedDispositions()` | `BehavedMixin` | Every Behaved host can seed its dispositions; a non-`Dispositioned` host's applier returns (today's guard, unchanged). |
| `seedPrologue()` / `seedRenown()` / `seedCompetence()` | `CastMixin` | The three channels `_seedDossier` wrote, split by field; each keeps its own `isPersona`/`isAdvancing` check. |
| `getBeliefViewerKey()` | `BeliefStoreMixin` | A method over the module-local `viewerKey`; the mixin already owns the rule. |
| `static hydrationLayers` | `BeliefStoreMixin`, `BondedMixin`, `BehavedMixin`, `CastMixin` | Advertisement only. |
| `isGuest` as a declared field | `Avatar` (abstract root, beside `playerId`) | The family's one `isGuest`; captured as `false` on every non-guest record (harmless), never captured for a guest (`shouldPersist` is false). |
| `HydrationApi` / `HydrationLogic` | `api/hydration.ts` / `platform/idea/api/HydrationLogic.ts` | A per-subsystem Api (hydration gets `docs/subsystems/hydration.md`), not a per-feature one. |

**Rejected hosts.** A `HydratedMixin` for the record (the row names the
layers, so no class could know to compose it — the guard would be "does
the row name a layer", which re-narrows). The snapshot restore as a hook
on `PersistableMixin` (that is the D1 auto-drive the residence build
retired, for the keyed-host reason). The species warm as a side effect of
`setSpecies` on `OrganismMixin` (eager by construction, but it is exactly
the un-declared, un-reportable shape the requirements reject, and it would
make a missing species row a silent default on every organism in the
game).

---

## Convention conformance

Checked at plan time, against the current tree:

- **`props:`/`cast:`** — untouched; the once-flags stay the instruction
  side's guard. `populates:` stays retired (invariant 10).
- **Locations, not rooms** — no location classes touched.
- **The five axes and `<root>/<branch>/`** — `/platform/idea/hydration/<Name>`,
  `/platform/idea/api/hydration`, `/system/energy/idea/hydration/FundingLayer`;
  controllers unchanged. A layer row's path mirrors its class path.
- **Module scope declares** — only `SecurityApi.decorateApiClass(HydrationApi)`
  at a module tail; the layer rows warm lazily via `singleton`.
- **Import boundary (`lint:imports`)** — layers import `lib/**` and
  `api/**` facades only; `HydrationLogic` writes diagnostics through
  `DiagnosticApi`.
- **Module categories** — no new one: an abstract `lib/` root, `platform/idea/`
  Ideas, an Api + logic singleton, a lint script. **No free helper**:
  `viewerKey` stays module-local behind a method; the lint walker is a
  script-local function.
- **Verbs on objects** — the seed appliers and `getBeliefViewerKey` are
  host methods; `HydrationApi`'s subject-first methods are framework
  lifecycle (mandate b), listed in `EXEMPT_APIS` with the note.
- **Inter-Stuff contract** — layers call methods; the bracket-assign
  carve-out stays `PersistentHydrator`'s alone.
- **Member privacy** — `#hydration` on `Stuff` is case 2 (shielded from
  the proxy, written by a seam), the `#templatePath` precedent.
- **No new Mongo collection**; `lint:schema` untouched.
- **Gates this build must pass**: `lint:family` (every gate), with named
  attention to `lint:instanceable` (rewritten invariants), `lint:gates`
  (the new `FromTemplateMethod` pairs), `lint:field-meta` (two new
  properties), `lint:lib-statics` (no new public statics on layer
  classes — instance members), `lint:object-verbs` (`HydrationApi` in
  `EXEMPT_APIS`), `lint:module-scope`, `lint:imports`, `lint:mixin-names`
  (no new kernel mixin), `lint:counters`, `lint:test-bootstrap`, and the
  new `lint:post-register`.

---

## Waves

Each wave is independently landable and ends at one commit
(`build(hydration W<n>): …`). Commit messages from a file, never `-m`.

### W0 — The census gate and the two field flags

**Goal.** Gate the hook count before anything moves; teach `fieldMeta`
the two words the build needs. **Implements** D15 (the ratchet), the
`FieldMetaEntry` half of D10 and D13.

**Files.** New `packages/server/scripts/check-post-register.ts` (+
`__tests__` with a positive fixture); `package.json` `lint:post-register`;
`lib/mixin.ts` (`seed?: true`, `birthOnly?: true` with doc comments);
`scripts/check-field-meta.ts` (the known-property list).

**Acceptance.** `pnpm -C packages/server lint:post-register` prints the
census (expected 82 / 40; the script's numbers are gated) and exits 0;
`lint:family --list` shows it; the test proves the gate fires on a fixture
that adds a loading hook; `lint:field-meta` accepts the two flags.

### W1 — The framework: root, Api, plural row, mint and go-live

**Goal.** One framework drives mint and go-live; the row is plural; the
default layer is implicit; the coin hole is closed. Content untouched (the
1,528 explicit declarations are tolerated and deduped — D4). **Implements**
D1–D8, D10, D11 (the mint half), D17.

**Files.** New `lib/stuff/HydrationLayer.ts`; delete `lib/stuff/Hydrator.ts`
(update its importers: `api/stuff.ts`, `PersistentHydrator.ts`);
`platform/idea/persistence/PersistentHydrator.ts` (extends the root;
`declaration()`; `apply` with mode, `birthOnly` skip, `consumed`); new
`api/hydration.ts` + `platform/idea/api/HydrationLogic.ts` + the platform
row `content/platform/idea/api/hydration.yaml` (follow `PersistableLogic`'s
row and its `ApiLogic` registration exactly); `lib/paths.ts`
(`TemplatePaths.hydrationLogic`, `.snapshotLayer`, `.beliefLayer`,
`.seedLayer`, `.speciesLayer`); `lib/stuff/Stuff.ts` (`#hydration`, the
seam, `getHydrationRecord`); `lib/stuff/Template.ts` (D3; `inherit: 'by-entry'`;
raw/effective types; `#inherit`); `api/stuff.ts` (step 6/7 →
`HydrationApi.plan` / `applyAtMint`); `TemplateLogic.restoreFromTemplate`
→ `applyAtGoLive`; `PersistableLogic.restoreState` (unchanged call into
`PersistentHydrator` — now `apply` in `mint` mode with no record stamp;
confirm the gate arms still see `PersistentHydrator`); `lib/stuff/Stackable.ts`
(`birthOnly: true` on `quantity`); `platform/thing/Coin.ts` (comment);
`backend/BootstrapManager.ts:157` (`_registerBoundaryExemptBase(HydrationLayer)`
— the build verifies the exemption is `instanceof`-shaped; if it is
class-identity, register each layer); `PackLogic.ts` (`DomainFile.hydratorClass:
string | string[]`, parse at `:973`, `assertClassesResolve` resolves each
entry as a ROW reference against the install set + the DB, preimage
normalisation, `exportBody`, `reportUnreferencedClasses` reads lists);
`scripts/pack-roots.ts` `effectiveRow` (by-entry merge; `hydratorClass:
string[]`); `scripts/check-instanceable-placement.ts` (4, 5, 6 retired, 12
over every row with data; 13 placeholder lands in W3); `test-bootstrap.ts`
(`KERNEL_CONTENT_ROWS`: the `hydration` logic row; the hydrator row stays;
the five `hydratorClass` lines there may stay until W5); `scripts/check-object-verbs.ts`
(`EXEMPT_APIS` + note); `types/src/index.ts:4043` and
`client/src/store/cmsSlice.ts:29` (`hydratorClass?: string[]`).

**Tests.** `lib/stuff/__tests__/HydrationLayer.test.ts` (a test layer per
declaration: required-unreachable fails the clone and unregisters;
optional-unreachable is skipped and stamped; lazy is pending then
`ensure`d once; plan order = `[default, …declared]`; the default layer
runs iff data is non-empty; a layer row plans nothing).
`lib/stuff/__tests__/Template.extends.test.ts` (by-entry merge of lists;
a bare string raw value; `toDocument` writes raw).
`platform/idea/persistence/__tests__/PersistentHydrator.goLive.test.ts`
(a live stack at 500, `restoreFromTemplate` on the coin row → still 500;
a `name` edit still lands; instruction once-flags unchanged).
`TemplateLogic.restoreFromTemplate` with a row naming a custom layer runs
it iff `goLive`. `PackLogic` preimage: a stored bare string and a filed
one-element list reconcile as unchanged. The three gate suites (`Coin`,
`CraftVessel`, `Serviceable`) still pass through the framework.

**Acceptance.** `pnpm test:near` + `lint:family` green; a clone through
the pipeline with explicit `hydratorClass: PersistentHydrator` behaves
byte-for-byte as before; a clone with data and no `hydratorClass` now
hydrates; the coin go-live unit test passes; `getHydrationRecord()` on a
clone lists the default layer with its consumed keys.

### W2 — The authoring surfaces and the gate

**Goal.** Having your data applied stops being a code-trust decision; an
author can read what fills a row and is told what will be discarded.
**Implements** D11 (the write half), D12, D18.

**Files.** `TemplateLogic.enforceCodeFieldGate` (set compare; scaffold
rule); `WriteController.ts` (drop `DEFAULT_CONTENT_HYDRATOR`; `--hydrator`
parses a comma-separated list, empty = none; call `describe` and note
unapplied keys); `write.yaml` (`--hydrator` text: *additional layers*; the
empty-string sentence goes); `CatController.ts` (print the `describe`
lines: every layer in order with source/eager/required and inheritance
annotation per entry; `hydration: none` when the plan is empty;
*advertised, not declared* lines); `StudioLogic.createTemplate` (unchanged
call — add the `describe` note to the committed disposition's message);
`CmsLogic` (`templateMeta.hydration: string[]` — the describe lines — beside
`hydratorClass`; the client type carries it, no UI change required);
`api/mixin.ts` (`getAdvertisedLayers`); `lib/stuff/CodeNamingFields.ts`
(doc: the field names *additional* layers).

**Tests.** `TemplateLogic.codeGate.test.ts` extended: a protowizard
CREATE with a data block and no list is allowed; naming a layer is
refused; a child inheriting a list is allowed; a wizard may name any.
`StudioLogic` create test: a protowizard's form data is on the clone.
`WriteController` test: a row whose keys the class does not declare gets
the warning note; a row whose keys it declares gets none. `CatController`
test: the three outputs (layers listed; none; advertised-not-declared).

**Acceptance.** Drive steps 1–3's unit-level halves pass; `cat` on the
coin row reads `hydration: data (keywords, mass, quantity) → PersistentHydrator`
(wording the build chooses, the three facts fixed).

### W3 — The three kernel consumers

**Goal.** `Cast`'s memory, the seeding kind and the kept animal's species
reach their state through the framework; the three hooks shrink.
**Implements** D13, D14, D15's invariant 13.

**Files.** New `platform/idea/hydration/BeliefLayer.ts`, `SeedLayer.ts`,
`SpeciesLayer.ts` + their three platform rows under
`content/platform/content/platform/idea/hydration/`; `lib/belief/BeliefStore.ts`
(`getBeliefViewerKey()`; `static hydrationLayers`); `lib/behavior/Behaved.ts`
(`dispositions: { …, seed: true }`; `_seedDispositions` → public
`seedDispositions(seeds)` with the D13 gate; the hook keeps teardown +
wire; `static hydrationLayers`); `lib/npc/Cast.ts` (`prologue`/`renown`/
`competence` gain `seed: true`; `_seedDossier` splits into three public
appliers; **the `postRegister` override is deleted**; `static
hydrationLayers`); `lib/husbandry/Bonded.ts` (the warm goes; born-hungry
stays; `static hydrationLayers`); `scripts/check-instanceable-placement.ts`
(invariant 13 — `declaredFields` already parses `fieldMeta` from source;
extend it to read the `seed` flag); `scripts/check-post-register.ts`
ceilings lowered to the new census. **Content (this wave, ~100 rows):**
the 51 seed rows and the 49 `Cast`-family rows get
`hydratorClass: [/platform/idea/hydration/BeliefLayer, /platform/idea/hydration/SeedLayer]`
(a Cast row that has no seed fields names only `BeliefLayer`; the dressed
children of `/stuff/agent/costume/student` may take it from the parent if
the parent's class composes BeliefStore — it is an `Extra`, so it does
not; declare on each child), replacing their `PersistentHydrator` line;
`cat.yaml` and `canary.yaml` get `[/platform/idea/hydration/SpeciesLayer]`.
A small script under the scratchpad does the edit (effective class →
mixins → advertised layers; seed keys in data → SeedLayer); the lint
checks the seed half.

**Tests.** `BeliefLayer.test.ts` (a singleton Cast re-cloned after its
records are written reads them; an `Extra` is skipped with reason;
Mongo closed → skipped, not thrown). `SeedLayer.test.ts` (clone, destruct,
re-clone: one set of claims; a seed key with no applier throws naming the
field; go-live does not run it). `SpeciesLayer.test.ts` (a cat answers
`feedingStyle`/`biddability`/`handlingRange` from its row immediately
after clone; a row naming a missing species fails to clone with the
layer's name in the error). `Cast`/`Behaved`/`Bonded` existing suites
updated for the moved calls.

**Acceptance.** `lint:post-register` census falls (Cast and Bonded leave
the state-loading set; Cast leaves the implementation set); invariant 13
passes on the tree; `pnpm test:near` + every touched pack's vitest green.

### W4 — The snapshot layer and the body of record

**Goal.** The spine's restore is a layer; the relog-after-restart path
has no ordering branch. ⚠ The login path — own wave, own commit, driven
before the next wave starts. **Implements** D16.

**Files.** New `platform/idea/hydration/SnapshotLayer.ts` + row;
`PersistableLogic.ts` (`materializeImpl` returns whether a record was
found; `restoreOrSeedImpl` routes the restore through
`HydrationApi.applyLayer`; `materialize` Api unchanged for `Avatar.restore`);
`lib/character/Avatar.ts` (`isGuest` in `fieldMeta`); `platform/idea/Login.ts`
(overlay carries `isGuest: true`); `platform/agent/PrimaryAvatar.ts`
(the D16 hook; the `hasRecord` call and the two branches go); the
PrimaryAvatar seed row (`ROW_TEMPLATE_PATH`, in the platform pack —
the build locates it by the constant) declares `[SnapshotLayer]`;
`scripts/check-post-register.ts` ceiling lowered.

**Tests.** `lib/persistence/__tests__/persistence-spine.test.ts`
extended: fresh signup → record captured with the implant; returning
login → gear restored, no `occupy` throw, loadout re-provisioned once;
guest → no record read, no record written; `standUpForEstate` → restored
without a session. `restoreOrSeed` tests: the record shows the snapshot
layer under `mode: 'explicit'`.

**Acceptance.** The wire relog (logout → login in one boot) passes;
**and the browser relog across a real server restart passes before W5
begins** (recorded in the drive record).

### W5 — The content sweep

**Goal.** 1,528 rows stop naming a hydrator and behave exactly as before;
the lint forbids the line. **Implements** D4's end state, D15's invariant 5.

**Files.** Every `hydratorClass: /platform/idea/persistence/PersistentHydrator`
line in `packages/content/**/*.yaml` not already converted in W3/W4
(a one-line `sed`/script over the tree, run from the scratchpad, staged
by name); the 6 "invariant 5" row comments; the doc-comment mentions in
`platform/thing/Door.ts:44`, `Window.ts:22`, `lib/instrument/Reading.ts:18`,
`platform/idea/Placement.ts:16`, `api/stuff.ts:380`, `Template.ts:162`;
`test-bootstrap.ts` (the five lines); `check-instanceable-placement.ts`
(invariant 5's new first shape: the default layer may not be named);
`scripts/check-template-census.ts` if it reads the field.

**Acceptance.** `lint:instanceable` passes with 0 explicit default-layer
names; `grep -r '^hydratorClass:' packages/content | grep PersistentHydrator`
is empty; a fresh-DB boot installs every pack (the reconcile sees ~1,4xx
content changes once, on a DB installed before this wave — a dev DB is
dropped, never migrated); ⭐ **`pnpm test` runs here once — this is the
pre-MR full run** if W6/W7 touch no source after it; otherwise it runs
after W7. The suite is the "behaves exactly as before" proof.

### W6 — The pack exemplar

**Goal.** A pack gives its own mixin's host a hydration layer, from its
own pack, naming its own source, with no kernel change. **Implements**
the placement test.

**Files.** New `packages/content/energy/src/idea/hydration/FundingLayer.ts`
(`source: {kind:'reference', name:'locality.publicLightingFunding'}`,
eager, optional, `goLive: false`; `apply` = the body of
`FuelStore.postRegister:76–92`, via a public `setLitresPerStreet` or the
existing field surface) + row
`packages/content/energy/content/system/energy/idea/hydration/FundingLayer.yaml`;
`energy/src/thing/FuelStore.ts` (the hook keeps `super` only — delete the
override if nothing remains); `hearts-delight/…/public-works/thing/store.yaml`
declares `[/system/energy/idea/hydration/FundingLayer]` (confirm
`hearts-delight` already `requires` `energy`; if not, that is the manifest
line the pack rung demands and it is content, not kernel); the energy
pack's vitest.

**Acceptance.** `assertClassesResolve` resolves the pack row from the
pack's `src/`; the store's `_litresPerStreet` reads the locality's rate
after clone; the kernel diff for this wave is **empty** (the proof).

### W7 — Docs and the drive

**Goal.** The subsystem is documented where the next build will look, and
the drive is a wire file that has been run.

**Files.** New `docs/subsystems/hydration.md` (the framework: what a layer
is, the declaration, the plan, the record, mint vs go-live vs ensure vs
explicit, the seed kind, the four limbs of post-registration work, the
gate shapes, the pack rung); `templates.md` (the clone pipeline steps 4/6/9
and the Hydrator contract → pointer; `hydratorClass` is plural and names
additional layers); `persistence.md` (Avatar on the spine: the ordering
paragraph → the plan; `restoreOrSeed` through the seam); `lifecycle.md`
(the hydrate step); `access.md` (the gate's set rule; the scaffold rule);
`studio.md` (the defect and its fix); `cms.md` (go-live is a mode;
`templateMeta.hydration`); `content-packs.md` (a pack layer; `hydratorClass`
entries are row references); `docs/lint-family.md` (`lint:post-register`;
invariants 4/5/6/12/13); `docs/antipatterns.md` (a loading `postRegister`
→ a layer); `CLAUDE.md` index line and `roadmap.md` are left to the sweep
(worktree rule 5). `docs/slates/builds/hydration-framework-slate.md` is
retired at `/finalize`, not here. **The wire file:**
`packages/wire/tests/hydration-framework.dirty.wire.test.ts` (dirty — it
writes rows, clones NPCs and names an animal).

**Acceptance.** The wire drive passes; the drive record below is filled
in from a run, with counts.

---

## Reachability wiring

Each link fails closed and silent; each is named with its wave.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| plural `hydratorClass` | `write --hydrator a,b` (W2) | n/a | the row (W1); `extends` merge by-entry (W1) | the layer singletons warm on first clone via `singleton` — nothing to boot; `HydrationLogic` row + `ApiLogic` residency exemption (W1) | the code-field gate compares sets (W2) |
| the default layer | none | none | runs iff data non-empty (W1) | the hydrator row + the boundary exemption on the root (W1) | the gate no longer sees it (W2) |
| `BeliefLayer` / `SeedLayer` / `SpeciesLayer` | none | n/a | **the ~100 rows that name them (W3)** — a layer nothing names never runs; invariant 13 + the advertised-not-declared line catch omissions | rows under `/platform/idea/hydration/` in the platform pack (W3) | n/a |
| `SnapshotLayer` | none | n/a | the PrimaryAvatar seed row (W4); keyed hosts via `applyLayer` (W4) | its row (W4); `isGuest` on the guest overlay (W4) | n/a |
| go-live mode | the CMS save, `pack sync` | n/a | `birthOnly` on `Stackable.quantity` (W1) | n/a | n/a |
| the diagnostic | `errors` | n/a | channel `hydration` (W1) | `DiagnosticApi.startRouter` already runs | n/a |
| `cat`'s layer lines | `cat` (W2) | existing | `describe` (W2) | n/a | n/a |
| `FundingLayer` | none | n/a | the store row (W6) | the energy pack's row (W6); `hearts-delight requires energy` | n/a |
| `lint:post-register` | `pnpm lint:post-register` | derived into `lint:family` by `package.json` (W0) | n/a | n/a | n/a |

---

## Acceptance-criteria coverage

| requirements' criterion | wave | proof |
|---|---|---|
| Studio data lands on the clone | W1 + W2 | `StudioLogic` create test; browser drive step 1 |
| An author reads what fills a row; "nothing" reads as nothing | W2 | `CatController` test; wire step 2 |
| Told at write time when data nobody applies | W2 | `WriteController` test; wire step 3 |
| A value-bearing row edit leaves live values alone; nobody's money changes | W1 | `PersistentHydrator.goLive` test; browser step 8 (CMS save on the coin row) |
| NPC memory and kept-animal memory survive a restart by one route | W3 + W4 | `BeliefLayer` test; `restoreOrSeed` record test; wire steps 4–5 (destruct + re-stand-up); browser restart |
| A newborn kept animal answers about its feeding/handling/biddability | W3 | `SpeciesLayer` test; wire step 6 (`offer` to a fresh cat is not `no-hand-rung`) |
| Authored history appears exactly once across re-clones and reboots | W3 | `SeedLayer` test; wire step 7 |
| Relog after restart: worn and carried things as left | W4 | spine test; wire step 9 (logout/login); browser restart |
| A pack author ships a layer with no kernel change | W6 | the empty kernel diff; energy vitest |
| 1,528 rows stop naming a hydrator and behave as before | W5 | the full suite; `lint:instanceable` |

Nothing in the requirements is unmapped.

---

## Test & gate strategy

- **Unit** (per wave, above). The ratchet tests assert the invariant,
  not the number. The lint tests carry positive fixtures.
- **Wire** — `hydration-framework.dirty.wire.test.ts`, the drive. What a
  socket can settle: steps 2, 3, 4 (destruct the singleton Cast and
  re-`singleton` it — the exact thing a restart does to a Cast — then
  `look` reads the remembered regard), 5 (handle a cat, name it, destruct
  and `standUpKeyed`), 6, 7 (clone twice with a destruct between; count
  claim rows through the chronicle read), 9 (logout, login, `inventory`).
  What it cannot: **step 1** (the Studio form is REST + browser), **step
  8** (the CMS save is REST; `write` does not go live), and the **real
  restart** behind 4, 5 and 9. Those are the browser drive, recorded in
  the drive record with the transcript; the unit tests above are their
  code-level halves (`StudioLogic` create; `restoreFromTemplate` on a live
  stack; the spine relog test).
- **Lints** — `lint:family` after every wave; the named gates in
  § Convention conformance.
- **The full suite** — exactly twice: before the MR opens (after the last
  source-touching wave) and at `/finalize`. Everything between is
  `pnpm test:near` + the touched packs' vitest (`energy`, `generic-objects`,
  `trade-mining`, `saxonberg-lounge`, `terminus`, `platform`) + `lint:family`.
  A green run stays valid until a source file changes; check with the
  `git status` filter in `CLAUDE.md` before re-running.

---

## Risks & opens

1. **The login path** (W4). Mitigated by its own wave, the spine test, and
   the rule that the browser relog across a restart runs before W5. If the
   browser relog fails, the wave is re-planned in place; W1–W3 stand.
2. **`SpeciesLayer` is required.** Any shipped row naming a species that
   does not resolve will now fail to clone, loudly. The build fixes the
   row, never downgrades the declaration; the suite and the drive find them.
3. **The sandbox boundary exemption.** `_registerBoundaryExemptBase` is
   read before writing W1: if it keys on class identity rather than
   `instanceof`, each layer registers; a wire body minted inside a circle
   with no loadout is the symptom to watch (it was found live once).
4. **`lint:lib-statics`.** Layer declarations are instance members so the
   ceiling does not move; `static hydrationLayers` sits inside mixin
   factories, out of scope by the lint's own rule. If the build finds the
   ceiling moved, that is a static that should have been an instance
   member, not a ceiling to raise.
5. **A dev DB installed before W5** sees ~1,4xx content changes at the
   next boot. Policy: drop and reboot; there are no users and no
   migrations.
6. **`TopicCatalogue`'s ~161 directly-parsed rows** would warn at every
   clone without the per-process dedupe (D11); the dedupe is the mitigation,
   and if those rows are never cloned the point is moot — the build checks.
7. **Logic-singleton rows in unit tests.** `HydrationLogic` must be
   reachable the way `PersistableLogic` is in suites that bypass Mongo; the
   build follows that precedent exactly rather than adding a seeding path.
8. **Two copies of the inheritance walk** (`Template.#inherit` and
   `scripts/pack-roots.ts effectiveRow`) now both merge a list. A test
   asserts they agree on a fixture chain (the *two copies of one sentence*
   rule).
9. **Things the user may want to see** (the build does not stop for
   them; they are recorded here and in the MR): `HydrationApi` as a new
   per-subsystem Api rather than a `TemplateApi` face; `HydrationApi` on
   `EXEMPT_APIS`; `isGuest` becoming a declared field; the advertisement
   static (D12).

---

## Deferred seams

Each is an attach point, not a stub; the slate it leaves as is named.

- **`Avatar.enter`'s `hydrateBeliefs()`** → declare `BeliefLayer` on the
  PrimaryAvatar row and retire the enter-time call. Leaves as a line in
  [persistence-architecture-slate](../slates/builds/persistence-architecture-slate.md).
- **`TpaTerminal`'s `armSupply` → a `/system/tpa` or `/system/arcana`
  `MainsLayer`**, once `seatSelf`'s ordering against it is understood.
  Leaves as a line in the fasttravel subsystem's open list (the build
  adds it to `docs/subsystems/fasttravel.md § open` or the tpa slate if one
  exists).
- **`Herdbook`'s self-filing** → `seed: true` on `herdId` with a
  `seedHerdId` applier. A pack row naming the kernel `SeedLayer`; leaves
  as a line in the ranching doc's open list.
- **The never-fault predicate** on the same census walker →
  [eager-residency-slate](../slates/builds/eager-residency-slate.md) W0,
  which now reads *add a predicate to `check-post-register.ts`*.
- **Keyed hosts declaring the snapshot layer at mint** (a `persistenceKey`
  in the clone context) → the residence slate; eight callers today, none
  needs it.
- **The value-bearing marker beyond `quantity`** (`denomination`, scrip,
  bearer credentials) → [money-integrity-slate](../slates/builds/money-integrity-slate.md)
  open question 2, now with `birthOnly` as the mechanism to extend.
- **Lazy layers with a production consumer** (`GridPowered`'s first-read
  meter is the shipped hand-written one) → the energy subsystem's open
  list.
- **Moving `PersistentHydrator` into `platform/idea/hydration/`** (three
  gate strings, `lib/paths.ts`, the test rows) → whenever those gate
  strings are next touched; recorded in `hydration.md`.

---

## Critical files

Read first, in this order:

1. `docs/requirements/hydration-framework-requirements.md`
2. `packages/server/src/mud/api/stuff.ts` (`clone` :555–612, `#registerAndInit` :898–960)
3. `packages/server/src/mud/platform/idea/persistence/PersistentHydrator.ts`
4. `packages/server/src/mud/lib/stuff/Template.ts` (:40–70, :255–300, :368–430)
5. `packages/server/src/mud/platform/idea/api/TemplateLogic.ts` (:183–236, :432–451)
6. `packages/server/src/mud/platform/idea/api/PersistableLogic.ts` (:671–760, :937–958, :1246–1300)
7. `packages/server/src/mud/platform/agent/PrimaryAvatar.ts` (:80–165) and `lib/character/Avatar.ts` (:330–360, :715–770)
8. `packages/server/src/mud/lib/npc/Cast.ts` (:150–250), `lib/behavior/Behaved.ts` (:190–225), `lib/husbandry/Bonded.ts` (:385–435), `lib/belief/BeliefStore.ts` (:320–470, :625–645)
9. `packages/server/src/mud/platform/thing/Coin.ts` (:60–100), `CraftVessel.ts` (:70–90), `lib/craft/Serviceable.ts` (:35–55)
10. `packages/server/src/mud/platform/idea/api/PackLogic.ts` (:110–120, :965–980, :1189–1210, :1373–1409, :1580–1630, :2968–2985)
11. `packages/server/scripts/check-instanceable-placement.ts`, `scripts/pack-roots.ts` (:587–677), `scripts/check-object-verbs.ts` (:40–60), `scripts/check-field-meta.ts`
12. `packages/server/src/mud/platform/idea/cmd/shell/WriteController.ts` (:135–190), `CatController.ts` (:145–180), `platform/idea/api/StudioLogic.ts` (:850–880), `CmsLogic.ts` (:573–632)
13. `packages/server/src/test-bootstrap.ts` (:55–110); `backend/BootstrapManager.ts` (:150–160)
14. `packages/content/energy/src/thing/FuelStore.ts` (:70–95)
15. `docs/subsystems/templates.md`, `persistence.md § The self-persistence spine`, `lifecycle.md`, `access.md § The code-trust lockdown`, `docs/lint-family.md`
16. `packages/wire/tests/template-inheritance.wire.test.ts` (the shape of a drive that names what it cannot assert)

---

## Drive record

*(appended at build time, not at plan time)* — the output of running the
requirements' nine-step drive against the running game: the wire file's
run (count, each failure), and the browser transcript for steps 1, 8 and
the real-restart halves of 4, 5 and 9. Precedent:
`farming-plan.md § Checkpoint A — the drive record`.
