# Hydration — implementation plan

Executes [hydration-requirements.md](../requirements/hydration-requirements.md)
(seeded by [hydration-framework-slate](../slates/builds/hydration-framework-slate.md),
whose central framing the requirements reject). **Kind:** refactor/sweep,
with one feature-shaped defect repair (the coin reset on go-live) and one
shipped-defect repair (an NPC's memory sat unread). **Lead end:** kernel —
the clone pipeline and the persistence spine.

What the code gets, in one paragraph: `hydratorClass` leaves the row
vocabulary and the engine (a row with `data:` gets its data applied, full
stop); 1,528 rows lose one line; the content step is renamed
`TemplateApplier`, gains a third phase (`seed<Field>`) and a go-live mode
that skips `birthOnly` fields (the coin); hydration — filling an instance
from what the world remembered — stays the class-composed
`PersistenceContributor` framework it already is, with `restoreSlice`
renamed `hydrateSlice`, a contributor allowed to **name a source that is
not `holder_snapshots`**, and a **driver in the clone pipeline that runs
it whether or not the host has a record**; `BeliefStore` is the first
consumer and `Cast`'s hook override is deleted; the kept animal's species
warm goes back to the read path; `cat`/`write`/the Studio say what will
fill a row in; **`PostRegistrationMixin` retires and the hook becomes a
terminal `onCreate` on `Stuff`**; `lint:on-create` ratchets the hook census.

> ⚠ **Read § What the previous cut got wrong first**, then § Where the
> plan flags the requirements. The first stops review re-proposing a
> unified layer framework; the second holds one drive step that the code
> cannot satisfy as literally written.

---

## What the previous cut got wrong, and why

The first plan (commit `22e17992c`) built one abstract `HydrationLayer`
root with six members — the standard hydrator, a snapshot layer, a belief
layer, a seed layer, a species layer and a pack layer — declared on the
row as a plural `hydratorClass`, merged under `extends:` by entry, driven
by a new `HydrationApi`/`HydrationLogic` pair, stamped onto `Stuff` as a
record.

**It was wrong because five of the six were alike and one was not, and
the plan's own decisions proved it.** D4 (the default data layer is
implicit and unnameable), D7 (the gate strings do not change because the
only layer that writes a gated field is the hydrator), D10 (only the data
layer runs at go-live) and D17 (a layer is *never* a persistence
contributor) all existed to hold `PersistentHydrator` apart from the other
five *inside a family that claimed they were the same*. A family that
needs four rules to exempt one member is not a family.

The real axis is **authored versus remembered**, and it splits three ways
(the requirements' table): **A** the row's own `data:` (keyed on the
template path, no capture side) · **B** somebody else's row by path ·
**C** what the world remembered about *this instance* (keyed on identity,
may be absent at first mint, **has a capture counterpart**). A is the
applier; C is the contributor framework; **B is not hydration at all** —
`SpeciesApi.preloadAnatomy` is an idempotent shared warm with nine callers
(`PerceptionLogic.ts:232`, `LocomotionLogic.ts:132`, `Avatar.ts:1224`,
`PersistableLogic.ts:741`, `Gus.ts:97`, `requiresAnimate.ts:53`,
`ButcherController.ts:134`, the Api itself), and `Bonded.postRegister` is
a tenth. A required species layer would have changed clone-time failure
for every organism in the game to add one call. Deleted.

Two more things the first cut got wrong and this one does not repeat:
**a row-declared layer can be omitted silently** (the dead
`commandContributions:` failure class), which composition cannot; and
**an instance-level hydration record on `Stuff`** served a question
nobody asks — the author's question is about the *row*, and the body of
record no longer needs `restored` once the spine restore stays where it
is.

---

## Grounding

Verified 2026-10-01 at `22e17992c` on `reqs/hydration-framework`
(`build-3`), by opening the files. Paths are under
`packages/server/src/mud/` unless stated; line numbers are current at
plan time.

### The content step today

- **The clone pipeline** — `api/stuff.ts:559–612`. Step 6 resolves
  `template.hydratorClass` via `StuffApi.singleton`, `null` when absent
  (*"no hydration step runs at all — `data` is ignored"*, its own
  comment). Step 7 constructs, stamps zone + templatePath + optional
  identity, merges `opts.dataOverlay` over `template.data`, and calls
  `#registerAndInit(obj, hydrator ? o => hydrator.hydrate(o, data) : null, context)`.
  `#registerAndInit` (`:903–960`): scope stamp → `ProxyApi.wrap` →
  `register` → one `ExecutionContextApi.run(StuffApi, proxy, 'constructor', …)`
  frame around **hydrate then `postRegister`** → on throw `unregister` and
  rethrow → `Events.StuffCreated`. ⭐ Inside that frame a call on the
  proxy is a self-call (`SecurityPolicies.ts:65–68`: `SelfOnly` is
  `caller === target`), which is why `Cast.postRegister` may call the
  `SelfOnly` `hydrateBeliefs()`.
- **`PersistentHydrator`** — `platform/idea/persistence/PersistentHydrator.ts`,
  `extends Idea implements Hydrator`, the only implementer in the tree
  (grep `implements Hydrator|extends PersistentHydrator`: one hit). Phase 1
  (persistent fields: marshaller un-marshal, `set<Pascal>` else bracket)
  and Phase 2 (instruction fields: `apply<Pascal>` required). Both loops
  `if (!(field in data)) continue` — an undeclared key is never visited
  and never reported. `static readonly templatePath = TemplatePaths.persistentHydrator`
  (`lib/paths.ts:75`). `lib/stuff/Hydrator.ts` is the one-method
  interface. The row:
  `packages/content/platform/content/platform/idea/persistence/PersistentHydrator.yaml`
  (`data: {}`, no `hydratorClass` — the recursion terminator). The
  directory also holds the two marshallers, which are persistence-shaped;
  the applier is not.
- **The three other drivers of the same singleton.**
  `TemplateLogic.restoreFromTemplate` (`:435–451`) hardcodes
  `PersistentHydrator.templatePath` and runs `hydrate(stuff, tpl.data)`
  — the go-live path, called by `CmsLogic._writeContent` (`:573–632`,
  every live instance at the path) and `PackLogic.rehydrate`
  (`:2968–2985`, the `rehydrated` count `pack sync` prints).
  `PersistableLogic.restoreState` (`:671–777`) step (1) runs the record's
  drift-guarded field slice through `hydrator.hydrate` (`:702–705`) — a
  **restore**, which must never skip a `birthOnly` field.
- ⚠⚠ **Three call-security gates key on the hydrator's module path**:
  `platform/thing/Coin.ts:88–91` (`CoinQuantityMutators` on `setQuantity`),
  `platform/thing/CraftVessel.ts:84–87`, `lib/craft/Serviceable.ts:48–51`
  (`SoiledWriters`). Each is
  `FromModule('/platform/idea/persistence/PersistentHydrator', {includeSubclasses: true})`
  + `FromTemplate('/platform/idea/persistence/*Hydrator')`. `lint:gates`
  (`scripts/check-gate-strings.ts:46,61`) resolves every non-glob
  `FromModule` string and every `FromTemplateMethod` pair; a plain
  `FromTemplate` glob is **not** resolved (`:273–275`), so the glob arm
  is unchecked today. `backend/BootstrapManager.ts:36,157` registers the
  class as a boundary-exempt base (a circle clone must reach the
  field-resident singleton; found live).
- **Where the name appears.** 1,537 YAML files under `packages/content`
  carry `hydratorClass`; **1,528 rows name one value**
  (`/platform/idea/persistence/PersistentHydrator`), the rest are the
  comments. Source: `Template.ts` (`:54,65,131,164,192–202,219–230,250,267–281`),
  `PackLogic.ts` (`:115,973,1198,1378,1584–1627`), `TemplateLogic.ts`
  (`:25,105–113,184–236,448`), `CmsLogic.ts` (`:431,618`),
  `WriteController.ts` (`:84,99,142–184`), `CatController.ts` (`:159–165`),
  `CpController`/`MvController` (carry `own.hydratorClass`),
  `lib/stuff/CodeNamingFields.ts:39`, `test-bootstrap.ts:68–104`,
  `scripts/pack-roots.ts` (`:436,577–677,848–870`),
  `scripts/check-instanceable-placement.ts` (`:18–20,64–71,300,354–398,436–449,553–555`),
  `scripts/check-ground.ts:249,308`, `scripts/check-template-census.ts:17`
  (comment), `scripts/__fixtures__/field-meta-golden.json`,
  `types/src/index.ts:4043`, `client/src/store/cmsSlice.ts:29`; doc
  comments in `Door.ts:44`, `Window.ts:22`, `Reading.ts:18`,
  `Placement.ts:16`, `api/stuff.ts:380`, `api/access.ts`,
  `AccessRegistry.ts`. **Test fixtures: 47 kernel test files + 19 pack
  test files** pass `hydratorClass` in a row literal (grep
  `--include='*.test.ts'`); every one becomes a TS excess-property error
  when the type drops the field — the mechanical bulk of W2.
- **The gate.** `TemplateLogic.enforceCodeFieldGate(classPath, data, hydratorClassPath, existing)`
  (`:184–236`): no Avatar author → allow; wizard → allow; else a delta on
  the RAW row; `folderScaffold` = no brains + standard-or-absent hydrator
  + folder class; violations `class` / `hydratorClass` / `behaviors[].brain`.
  ⚠ **A create with `class` set is refused for every non-wizard**
  (`codeGate.test.ts:104`, *"rejects a non-wizard introducing a class on a
  fresh path"*); the sanctioned protowizard route is the class-less child
  (`:118`). `StudioLogic.createTemplate` (`:834–866`) **requires
  `classPath`** (`:849–851`) and saves `{ class: classPath, data }` — so
  a protowizard's Studio create is refused on `class` today, before the
  hydrator field is ever considered. See § flags, item 1.
- **Invariants.** `check-instanceable-placement.ts`: 4 (`:371–373`,
  resolves the field), 5 (`:377–391`, redundant own/child restatement),
  6 (`:393–398`, data with no hydrator), 12 (`:436–449`, orphan data keys
  only `if (hyd === STANDARD_HYDRATOR)`, ceiling 393 at `:297`), 10
  (`:430`, the retired `populates:` key — the precedent for a retired-key
  invariant). `check-field-meta.ts:523` `KNOWN_PROPS`.

### Hydration today — the contributor framework

- `MixinApi.getPersistenceContributors(ctor)` — `api/mixin.ts:837–900`,
  type `PersistenceContributor` at `:254–271`
  (`key`, `fields`, `captureSlice?`, `restoreSlice?`): a prototype-chain
  walk reading **own** statics by `hasOwnProperty`. The only driver is
  `PersistableLogic.restoreState` step (4) (`:770–777`), which runs a
  contributor's `restoreSlice` **only when the record carries its slice**
  — so a host with no record, or a contributor whose state is not in the
  record, is never driven. That is the whole original defect.
  `restoreSlice` sites: `lib/chattel/Estate.ts:275` (+ doc at `:81,176`),
  `lib/belief/BeliefStore.ts:454`, `lib/spatial/Container.ts:182` and
  `lib/slot/Slotted.ts:700` (doc only — handled by the explicit passes),
  `lib/persistence/PersistenceSlice.ts:26,267–289` (`RestoreContext`),
  `ChattelLogic.ts:409,438` (doc), tests `KeptAnimalPersistence.test.ts`,
  `belief/__tests__/persistence.test.ts`, `Estate.test.ts`. (The user's
  seven includes `Adornable`/`Floor`; the build greps and renames every
  hit — the list above is what this grep found.)
- **`BeliefStore`** — `viewerKey(viewer)` (`:352–366`, module-local):
  row 1 keyed persistable host → `null` (its own record via
  `captureSlice`); row 2 minted identity → `getIdentityPath()`; row 3
  `Singleton` → identity; row 4 → `null` (memory only). `captureSlice`
  (`:441`) emits `{beliefs: []}` when `viewerKey !== null`; `restoreSlice`
  (`:454`) installs via `loadBelief` (ungated, `:608`), deliberately not
  `hydrateBeliefs()` (`SelfOnly`, `:632–639`: `persistenceActive()` →
  `viewerKey` → `BeliefDocument.find({viewerId})` → `loadBelief`).
  `Avatar.enter` calls `hydrateBeliefs()` at `Avatar.ts:864`. Composers:
  `lib/creature/KeptAnimal.ts:95`, `lib/character/Character.ts:115`.
- **The two routes to memory today.** A `Cast` (singleton, no record):
  `Cast.postRegister` (`lib/npc/Cast.ts:158–176`) → `hydrateBeliefs()` →
  the `beliefs` collection. A **kept animal** (named → keyed persistable):
  the residency pin (`ResidencyLogic.ts:818`, `standUpKeyed`) →
  `cloneHost` (`PersistableLogic.ts:865–884`: clone → `setPersistenceKey`
  → `materializeImpl`) → `restoreRecord` → `restoreState` (4) →
  `BeliefStore.restoreSlice`. The keyed re-entry `restoreOrSeedImpl`
  (`:1175–1198`) has eight pack callers (`residence` ×3,
  `eternal-university` ×1, `trade-mining` ×2, `terminus` ×1).
- **The spine's body of record** — `PrimaryAvatar.postRegister`
  (`:89–165`): `stampContext` → `registerAvatar` → `hasRecord ?
  (chain → materialize → reconcileMortalState → loadout) : (loadout →
  chain → capture)`. **Untouched by this build.**

### The seven candidate hooks, and the census

Measured by method declaration (a regex over `postRegister\s*\(` on
non-test `.ts`, excluding the `postRegister?:` type shape): **84**
implementations at plan time (the requirements say 82; W1's script is
the truth). Of the state-loading ones, the seven the ruling touches:

| file | body | limb |
|---|---|---|
| `lib/npc/Cast.ts:158–176` | super → `hydrateBeliefs()` → `_seedDossier()` (`:185–248`: prologue → `seedChronicleClaims` if no `claim` row; renown → `RenownApi.seedTo` (idempotent by construction); competence → `creditSignature` if no `claim` row) | hydration + seeding → **deleted** |
| `lib/behavior/Behaved.ts:195–207` | super → `_teardownBehaviors` → `_wireBehaviors` → `_seedDispositions` (`:214–222`; `seedTraitClaims` is `SelfOnly`, `Dispositioned.ts:374`) | structural + seeding → **structural stays** |
| `lib/husbandry/Bonded.ts:396–435` | super → `SpeciesApi.preloadAnatomy(self)` in try/catch → born-hungry → home | reference warm + initial state → **warm leaves** |
| `lib/character/Avatar.ts:759–767` | the vessel sequence | structural |
| `platform/agent/PrimaryAvatar.ts:89–165` | the spine dance | spine restore — stays |
| `lib/command/CommandGiver.ts` | `collectSelfDefs` → `pushCommandSource` | structural |
| `trade-mining/src/lib/Working.ts:402–409` | `airAt()` over the exit graph | derive — stays |

The seed fields: `Behaved.dispositions` (`:126`,
`{ persistent: true, authorable: true }`), `Cast.prologue`/`competence`/`renown`
(`:115–117`, same shape). `FieldMetaEntry` lives in `lib/mixin.ts:90–175`;
`MixinApi.getAllFieldMeta` merges nearest-layer-wins per property, so a
new entry property is visible everywhere with no aggregator change.

The species dials `Bonded` reads through `getSpecies()` (live-only):
`biddability` (`:381`), `feedsBy` (`:450–453`), `handlingRange` (`:463`),
olfactory acuity (`:687`). The async callers that precede those reads:
`platform/idea/cmd/inventory/OfferController.ts`,
`lib/husbandry/OfferEngagement.ts`,
`platform/idea/cmd/social/{Call,Pet,Stay,Name}Controller.ts`,
`lib/behavior/{feeds,follows,homes}.ts`.

### The coin

`generic-objects/content/stuff/thing/Coin.yaml` authors `quantity: 1`;
`Stackable.quantity` is `{ persistent: true, authorable: true }`
(`lib/stuff/Stackable.ts:127–129`). Go-live runs Phase 1 over every live
stack and resets it to one.

### Settled elsewhere — not re-derived

`postRegister` under hot reload traced safe (2026-09-24). The
`props:`/`cast:`/`costume:` once-flags cover instruction fields only.
`extends:` is shipped and resolved at read; `Template.#inherit`
(`:255–300`) and `scripts/pack-roots.ts effectiveRow` (`:587–677`) are
its two copies. `DiagnosticApi.record({ path, severity?, message, channel? })`
(`api/diagnostics.ts:80`). `StuffApi` already holds static `#` state
(`#indexes`, `#cloneStackALS`, `#pendingSingletons`, `:164–208`) and
already lazy-imports `./persistable` for one read (`:702`).

---

## Where the plan flags the requirements

Nothing here reopens product scope; each is a place the code and the
requirements' wording do not meet, recorded so the build does not decide
it silently.

1. ⚠ **Drive step 1 cannot pass for a protowizard *through the Studio* by
   deleting `hydratorClass`.** The Studio's create requires `classPath`
   and the gate refuses `class` on a create for every non-wizard — the
   code-trust rule this build must not weaken (requirements § Governance:
   *nothing here may become a new reason to ask whether someone is a
   wizard*, and its inverse). The acceptance criterion's wording — *a
   non-wizard can author a row that applies data, with no exemption
   anywhere in the gate* — is satisfiable and planned: the class-less
   child (`write --extends <vetted row>` with data) applies its data
   after W2, and a **wizard's** Studio create (which discards data today)
   carries it. The plan drives step 1 as *a protowizard authors a
   data-bearing child and clones it; a wizard creates through the Studio
   and clones it*. **The user's call:** if step 1 must be a protowizard
   in the Studio form, the Studio's `CreateTemplateInput` needs an
   `extends` field (a `based on` picker, `types/src/index.ts` +
   `StudioLogic.createTemplate` + `TemplateForm.tsx`) — small, content-
   authoring-shaped, not in the requirements. Not planned.
2. **Lazy hydration has no shipped consumer.** The requirements' second
   live example of "faulted on first read" is `GridPowered`, which reads
   a Feeder/Locality **reference row** — kind B by this doc's own table,
   not remembered state. The `eager` declaration ships as the
   requirements say, proven by a test contributor; the build must not
   invent a production lazy consumer to justify it.
3. **"One route" for the NPC and the kept animal means one framework
   with two declared halves on one mixin.** A keyed host's beliefs ride
   its own record (`captureSlice`/`hydrateSlice`); a singleton's ride the
   `beliefs` collection (`hydrateFromSource`). Both halves are declared
   on `BeliefStoreMixin`, both are found by one walk, and the mixin says
   which applies (`viewerKey`). The requirements' sentence is satisfied
   at the level that matters — nothing outside the mixin knows there are
   two sources — and not at the level of "one Mongo collection", which
   the belief store's own doctrine forbids (row 1: *a host that persists
   itself must not also write here*).
4. **`Avatar.enter`'s `hydrateBeliefs()` stays this build**, and after W5
   an avatar's beliefs are read **twice per login** — once at mint by the
   source driver, once at `enter`. Both load into one keyed map;
   idempotent, one extra round-trip. The retirement is a deferred seam.
5. **The pack placement proof is a test, not a production mixin.** No
   pack mixin declares a slice today (grep `restoreSlice` under
   `packages/content/*/src`: zero), and no pack has remembered state in a
   non-`holder_snapshots` source. Composition satisfies the criterion by
   construction; the proof is a pack-side vitest with a fixture mixin.
6. **The census is the script's number.** 84 by this plan's regex, 82 by
   the requirements'. W1 gates what W1 measures, on the renamed hook.
7. **The requirements' non-goal on `postRegister`-as-terminal is
   superseded.** The requirements send it to the lifecycle-signals slate;
   the user has since approved it for this build and settled the name
   (`onCreate`). D12/W0 build it; the requirements doc's non-goal line
   is stale and the sweep should drop it.

---

## Plan-level decisions

**D1 — `hydratorClass` is deleted from the row vocabulary and the engine;
the applier runs iff `data` is non-empty.**
`TemplateOwn`/`TemplateSpec` lose the field; `Template.fieldMeta` loses
the entry; the effective field, `setOwn`, `fromDocument`, `toDocument`
and `#inherit`'s nearest-stated-wins arm for it all go. `StuffApi.clone`
step 6 becomes: `Object.keys(data).length > 0 ? singleton(applier) : null`
— the applier's own row has `data: {}`, so cloning the applier plans no
applier (the terminator holds by construction; the in-flight cycle guard
stays as the backstop). `DomainFile.hydratorClass`, its parse,
`assertClassesResolve`'s arm, `reportUnreferencedClasses`'s read and the
preimage key go from `PackLogic`; the preimage becomes `{class, extends,
data}`, so **every row's hash changes once at the W2 boot** (a dev DB is
dropped, never migrated) and the W3 deletion of the dead key changes
nothing further. `effectiveRow` in `scripts/pack-roots.ts` drops the
field; `check-ground.ts` drops its read; the CMS stops shipping it in
`templateMeta`; `cp`/`mv` stop carrying it. The reasoning is the
requirements': the field has had one value for the project's life and
zero rows use the opt-out, so it expresses a choice nobody has made.

**D2 — The content step is `TemplateApplier`, flat at
`platform/idea/TemplateApplier.ts`, row `/platform/idea/TemplateApplier`.**
Still an `Idea` singleton resolved by `StuffApi.singleton` — the non-goal
(re-homing into a path-resolved lazy module, persistence-architecture
Wave 3) is respected, and HMR, the sandbox boundary exemption and the
gate shapes carry over unchanged in kind. Flat rather than clustered
because `platform/idea/persistence/` holds the two marshallers, which are
persistence-shaped, and the applier is not (the CLAUDE.md default: flat
unless 3+ cohesive classes). `lib/stuff/Hydrator.ts` (the interface) is
deleted; `api/stuff.ts` imports the class type. `TemplatePaths.persistentHydrator`
→ `TemplatePaths.templateApplier`. The three gates become
`FromModule('/platform/idea/TemplateApplier', {includeSubclasses: true})`
+ `FromTemplate('/platform/idea/TemplateApplier')` — **exact, not a
glob**, so the template arm names one row (the old `*Hydrator` glob was
unresolvable by `lint:gates` and admitted a family nobody shipped).
`BootstrapManager` registers `TemplateApplier` as the boundary-exempt
base. `KERNEL_CONTENT_ROWS` carries the applier's row. The old row YAML
is deleted and the new one added in the platform pack. ⭐ **Sequenced
after the content sweep (W4 after W3)**: once no row names it, the rename
touches ~12 source files and one YAML, not 1,528.

**D3 — Three phases, three modes; seeding is phase three.**
`TemplateApplier.apply(host, data, { mode })` with
`mode: 'mint' | 'go-live' | 'restore'`:

| phase | selects | dispatch | mint | go-live | restore |
|---|---|---|---|---|---|
| 1 property | `persistent` fields | `set<Field>` else bracket | all | all but `birthOnly` | all |
| 2 instruction | `instruction` fields | `apply<Field>` (required) | all | all (the once-flags stay the appliers' own) | — |
| 3 seed | `seed`-flagged fields | `seed<Field>` (required) | all | — | — |

`restore` is `restoreState` step (1)'s call (a record's field slice;
instruction and seed fields never appear in it, so phases 2 and 3 are
skipped by selection, not by special case). The applier owns ordering and
once-ness (mint only, after phase 1, never at go-live or restore); **the
ledger keeps its own idempotence** (`_seedDossier`'s "any `claim` row
exists" reads and `RenownApi.seedTo`'s count-what-is-there) because a
re-clone after a destruct is a new mint and only the ledger knows the
history is already there. Fields: `Behaved.dispositions` →
`seedDispositions(seeds)`; `Cast.prologue` → `seedPrologue(lines)`,
`Cast.renown` → `seedRenown(claims)`, `Cast.competence` →
`seedCompetence(claims)` — each a public method whose body is the
channel `_seedDossier`/`_seedDispositions` wrote, keeping its own
`isPersona`/`isAdvancing`/`isDispositioned` check and its own guard;
their inner privileged calls (`seedTraitClaims`, `seedChronicleClaims`,
`creditSignature`) are self-calls as today because the applier runs
inside the constructor frame. The `seed<Field>` methods are gated exactly
as the shipped `apply<Field>` appliers are (`applyProps`/`applyCast`/
`applyDetails` are public and ungated; the build matches that, not a new
policy). A seed-flagged field is **also** a property field (phase 1
keeps `this.prologue` on the instance for `getRenownClaims()` et al.);
`seed: true` adds phase 3, it does not replace phase 1. A seed key with no
`seed<Field>` throws naming the field (the Phase-2 rule). `FieldMetaEntry.seed?: true`.

**D4 — Go-live skips `birthOnly` fields; the field's owner declares it.**
`FieldMetaEntry.birthOnly?: true` — *applied when the instance is minted,
never pushed by go-live*. Declared on `Stackable.quantity`
(`lib/stuff/Stackable.ts:127`); `Coin` inherits it. Why not a per-row
opt-out: the hazard is a property of the FIELD wherever it is authored (a
scrip's quantity, a lime crate's), and a row-level switch would have to be
remembered on every row that authors a stack. Why not diff-based go-live:
it would stop the reset but still write a changed authored `quantity`
onto stacks at the old value — minting with no ledger leg. `pack sync`'s
count stays a count of hosts the go-live pass touched; the word becomes
*re-applied*.

**D5 — A data key nobody will apply is reported, at mint and at the
authoring moments; the advertisement static is cut.**
At mint, after phase 3: `unapplied = keys(data) − (persistent ∪ instruction ∪ seed)`
→ one `DiagnosticApi.record({ path: templatePath, severity: 'warn', channel: 'template', message })`
per `(templatePath, key-set)` per process (a `Set` on the applier; the
~161 rows `TopicCatalogue` parses directly would otherwise warn on every
clone). At write/cat/create: **`TemplateApi.describeFill(spec | path)`**
→ `TemplateLogic`, returning the lines every surface prints — the keys
phase 1/2/3 will apply, the keys nobody will, and the remembered sources
the effective class's contributors declare (D8), with *nothing* stated
explicitly when all three are empty. One method, four readers
(`CatController`, `WriteController`, `StudioLogic.createTemplate`,
`CmsLogic`'s `templateMeta`), so the sentence has one copy. The resolve
is `StuffApi.resolveClassFor(path)` (exists) → `MixinApi.getAllFieldMeta`
+ `getPersistenceContributors`; no new Api. The previous cut's
`static hydrationLayers` advertisement is **cut**: it existed so a row
omitting a layer could be told; with no row declaration there is nothing
to omit, and `describeFill` reads composition directly.

**D6 — The code-trust gate loses the field; no exemption anywhere.**
`enforceCodeFieldGate(classPath, data, existing)`; `folderScaffold` = no
brains + folder class; the violation list is `class` / `behaviors[].brain`;
`CodeNamingFields.FIELDS` drops to two. The baseline stays the RAW row.
The drift-guard test and `codeGate.test.ts:218,313` lose their
hydrator cases. The surface shrinks; nothing is carved.

**D7 — Hydration is the contributor framework; the pair reads
capture / hydrate.**
`PersistenceContributor.restoreSlice` → `hydrateSlice`; the static on
every declaring mixin; `RestoreContext` → `HydrateContext` in
`lib/persistence/PersistenceSlice.ts`; `restoreState` step (4) and the
doc comments. Mechanical, folded into W5 so the rename and the new
contract land in one commit a reviewer reads once. Nothing about what a
slice may contain changes (estate-nesting slate's).

**D8 — A contributor may declare a source that is not the record, with
two declared properties.**
On a mixin's returned class, beside `captureSlice`/`hydrateSlice`:

```ts
static hydrationSource: HydrationSource = { name: 'beliefs', required: false, eager: true };
static async hydrateFromSource(host: Stuff, ctx: HydrateContext): Promise<HydrateOutcome>;
// HydrationSource = { name: string; required: boolean; eager: boolean }
// HydrateOutcome  = { status: 'hydrated' } | { status: 'skipped'; reason: string } | { status: 'unreachable'; reason: string }
```

`PersistenceContributor` gains `source?: HydrationSource & { hydrate: typeof hydrateFromSource }`,
read by `getPersistenceContributors` the way the slice hooks are (own
statics, `hasOwnProperty`). The types live in `PersistenceSlice.ts`
beside `HydrateContext` (the one-concept rule: the module that defines
the contributor's I/O). **`required`**: an `unreachable` outcome
(Mongo not connected — `PersistApi.isConnected()`; the source absent)
is a recorded skip when `false`, a thrown clone failure naming the mixin
and the row when `true`. Every test run and all of early boot are the
`false` case, and a mixin saying so is what stopped being invisible.
**`eager`**: run at mint (`true`) or faulted on first read (`false`). The
two are declarations, not defaults — the static shape forces every
source to say both. A **pack** mixin declares the same two statics and
is driven by the same walk with no kernel edit (the placement test).

**D9 — The driver lives in the clone pipeline and needs no record.**
`StuffApi.#registerAndInit` gains one step between the applier and
`onCreate` (post-W0), inside the same constructor frame:
`await this.#hydrateFromSources(proxy, context)` — for each contributor
of the host's class with a `source`: `eager` → run it and interpret the
outcome per D8 (a throw propagates to the existing `unregister` catch);
not eager → add its key to `static #pendingHydration: WeakMap<Stuff, Set<string>>`.
`StuffApi.ensureHydrated(host)` runs a host's pending sources once,
serialised per host — the fault site a lazy mixin's own async read seam
calls (`StuffApi` is on `lint:object-verbs`' `EXEMPT_APIS` as framework
lifecycle; nothing new is added there). Why `StuffApi` and not the spine:
the clone pipeline is already the hydrate-then-`onCreate` driver, the
walk is `MixinApi`'s, and routing every clone through
`PersistableLogic` would make the `/platform/idea/api/persistable` row a
dependency of every unit suite that clones anything. Why no instance
record on `Stuff` (the previous D6): its only readers were the body of
record's `restored` (unneeded — the spine restore does not move) and an
instance-level "what filled me" nobody asks; the author's question is
row-level and `describeFill` answers it. A `create()`d object has no
template and runs no sources, as today. ⭐ The invariant the pipeline now
states: **every eager source completes before `onCreate` begins**,
so a hook may rely on remembered state being present.

**D10 — `BeliefStore` is the first consumer; `Cast`'s `onCreate` override is
deleted.**
`BeliefStoreMixin` declares `hydrationSource = { name: 'beliefs', required: false, eager: true }`
and `hydrateFromSource(host)`: `viewerKey(host) === null` → `skipped`
(*'rides its own record'* for a keyed host — at mint, before any key is
stashed, a to-be-named animal is row 4 and skips too, so nothing loads
twice; `materialize` then fills it from its record through
`hydrateSlice`); `!persistenceActive()` → `unreachable`; else
`BeliefDocument.find({viewerId})` → `loadBelief` → `hydrated`. The body
is one module-local `loadFromCollection(host)` that `hydrateBeliefs()`
also calls, so there is one copy of the read; `hydrateBeliefs()` keeps its
`SelfOnly` gate for `Avatar.enter` (flag 4). `Cast`'s `onCreate` loses
both calls (the belief read is the driver's, the dossier seed is phase
3) and **the override is deleted**. The kept-animal route is byte-for-byte
unchanged and is now the same framework's other half (flag 3).

**D11 — The species read goes back to the read path.**
`Bonded`'s `onCreate` loses the `preloadAnatomy` call (born-hungry and
home stay — initial state, limb four). The warm is called **beside the
reads that need it**: at each async entry that precedes a dial read —
`OfferController` (before `offerRung`/`feedsBy`), `OfferEngagement`,
`CallController`/`StayController` (biddability), `PetController`
(`handlingRange`), `NameController` if it reads a dial, and the `feeds`/
`follows`/`homes` brains' `act` (acuity, feeding) — the same
`await SpeciesApi.preloadAnatomy(animal)` the nine callers use, idempotent
and cheap after the first. The build enumerates by grepping `getSpecies()`
in `Bonded.ts` and following each read to its async caller; the test is
drive step 6's unit half (a cat cloned fresh, the offer verb, the right
rung). ⚠ `preloadAnatomy`'s tolerance of a missing species row stays —
it is the shared substrate's contract, and the previous cut's "a row
naming a missing species should not clone" leaves with the layer that
would have enforced it.

**D12 — `PostRegistrationMixin` retires; the hook is a terminal `onCreate`
on `Stuff`.** (User-approved; supersedes the requirements' non-goal that
sent it to the lifecycle-signals slate — recorded in § flags, item 7.)
`Stuff` gains `onCreate(context?: unknown): Promise<void> | void {}`, a
terminal no-op carrying the `@hook` contract that lives on the
`PostRegistration` interface today (`lib/stuff/PostRegistration.ts:30–42`).
The justification is `docs/antipatterns.md` § *Cast-Chain to super for an
Optional Inherited Method* (`:1692`), whose own test is whether the hook
is *universal to the root class's purpose*: every Stuff is registered,
more universally than it is destructed, and `onDestruct` already ships as
exactly this terminal (`Stuff.ts:1259–1275`). Deleted: the file, the
interface, `Mixins.PostRegistration` (`lib/mixin.ts:261`; `lint:mixin-names`
reads the const), `MixinApi.isPostRegistration` (`api/mixin.ts:1141`), and
the mixin at its **78 composition sites**. Renamed: the hook at every
declaration site (84 at plan time), the two dispatch sites, and
`createSync`'s option `deferPostRegister` → `deferOnCreate`
(`api/stuff.ts:814,828`; callers `CardLogic.ts:68`, `WorldClockLogic.ts:91`);
`Avatar.chainPostRegister` → `chainOnCreate` (`Avatar.ts:736–740`, and
its caller `PrimaryAvatar.ts:132`). The **eight** mixins doing the
defensive `const sup = (Base.prototype as {…}).postRegister; if (typeof sup === 'function') await sup.call(this, context)`
dance — `CommandGiver`, `Cast`, `PublicLighting`, `Persistable`, `Bonded`,
`Mobile`, `Behaved`, `trade-mining/Working` (the user counted six; grep
`Base.prototype as` ∩ `postRegister` finds eight) — become
`await super.onCreate(context)`, which TypeScript now accepts because
`Stuff` declares it; that is the antipattern's own BAD→GOOD, so the wave
removes a documented antipattern, not only a mixin. ⭐ It also removes a
shipped failure class outright: `KeptAnimal.ts:98–103` records that the
mixin's non-chaining no-op, composed anywhere but innermost, **shadowed
every layer inside it** (`Bonded.postRegister` never ran on a live
animal) — with the terminal on `Stuff` there is no layer to shadow and
no ordering to get wrong.

⚠⚠ **The guardrail.** `isPostRegistration` has two call sites and only
one is dispatch. `api/stuff.ts:946` (`#registerAndInit`) becomes an
unconditional `await proxy.onCreate(context)`. **`api/stuff.ts:828`
(`createSync`) is a guardrail that THROWS** when the class composes the
mixin, because `createSync` cannot await. A terminal makes the predicate
always true and would throw on every `createSync` — taking
`singletonSync` and every lazy logic-singleton resolver (`api/persistable.ts:48`
et al.) with it. It becomes a comparison against the terminal, **on the
raw object, not the proxy**: `raw.onCreate !== Stuff.prototype.onCreate`,
where `raw` is already in scope before `ProxyApi.wrap` (`:815–827`) — the
proxy's get trap returns an intercepting wrapper for callables
(`api/proxy.ts:163–244`), so identity through the proxy is not the
prototype's and the build verifies this with a test rather than
assuming it. The new predicate is *more* accurate than the mixin, fixing
two live defects: a class that composes the mixin **without overriding**
is refused by `createSync` today for no reason; a class that overrides
**without composing** passes the guardrail *and never has its hook
called*. ⭐ The second case was checked against the real list: 17 files
declare the hook without composing the mixin; seven are mixins (the host
composes it) and one is the mixin itself; the **nine concrete classes** —
`lib/location/CartesianLocation.ts`, `platform/location/SphericalLocation.ts`,
`world/lounge/location/Lounge.ts`, `platform/agent/Gus.ts`,
`platform/agent/PrimaryAvatar.ts`, `platform/agent/ShadeAvatar.ts`,
`trade-farming/src/location/Field.ts`, `trade-forestry/src/location/Wood.ts`,
`terminus/src/realty/agent/Realtor.ts` — are **all reached today**: the
six locations descend from `Location`, which composes the marker at its
base (`Location.ts:169`); `Gus` → `Cast` → `NPC` and `Realtor` → `NPC`
(`NPC.ts:38`); the two avatars descend from `Avatar` (`Avatar.ts:168`).
No shipped defect of that shape exists; the wave's test pins all nine so
one cannot appear.

**The name.** `onCreate` matches `Events.StuffCreated` (`'stuff.created'`),
which `#registerAndInit` emits three lines after the hook on both paths,
and whose sibling is `Events.StuffDestructed` — so `created`/`destructed`
is the shipped vocabulary and `onCreate`/`onDestruct` the matching hook
pair. Rejected: `postRegister` (~80 uses of `post` in the tree and every
one is the transitive verb — `postTransaction`, `postThread`, `postGig`,
`postToChannel` — so it reads *post a register*); `onHydrate` (this build
reserves *hydrate* for remembered state, and this hook is where the
non-hydration residue lives); `onClone` (fires from `create()` too, which
has no template); `onAdmitted` (`admit` is call-security vocabulary, 120
uses); `onMinted`/`onInducted` (synonyms for a word the event vocabulary
already had). Accepted cost: the name does not encode that the data is
already applied; no candidate does (the honest one is `postHydrate`-shaped
and the word is reserved), so it is no worse than today.

**D13 — Four limbs; the hook census is gated where it lands.**
`lint:on-create` (new, `scripts/check-on-create.ts`): walks
kernel `src/mud/**` and every pack `src/**` (`pack-roots.ts`), finds
`onCreate(` **method declarations** (never docstring mentions; `Stuff`'s
terminal is excluded, as a destruct census would exclude `onDestruct`'s), and
reports two counts against two ceilings — implementations, and bodies
matching the state-loading predicate
(`\.find\(|findByScope|hydrate|rebuildIndex|warm\(|restore|load|singleton\(`
— the build records the exact regex in the script and cites the census it
produced). Gated at **the script's** W1 numbers. The walker is one
script-local function with named predicates, so the eager-residency
slate's never-fault predicate is a third predicate on the same census,
not a second script. The ratchet test asserts the invariant (at or below
the ceiling, above zero), never the number, with a positive fixture.
Ceilings fall at W4 (Cast leaves the loading set), W5 (Cast leaves the
implementation set) and W6 (Bonded leaves the loading set). The 33
roster-warming hooks and the structural-completion hooks are named
legitimate and untouched; the observation that 20 `*Catalogue` classes
implement one hook each goes in the docs wave as a line for the next
pass, not as work.

**D14 — The lints.**
`lint:instanceable`: **4, 5, 6 retire** (each guards a state that cannot
occur); 12 applies to every row with data (the same population — zero
rows had data and no hydrator; ceiling 393 holds, re-measured); **13
(new)**: `hydratorClass` is a retired row key, refused wherever it
appears (the `populates:` invariant-10 shape). `lint:field-meta`'s
`KNOWN_PROPS` learns `seed` and `birthOnly`; the golden fixture
regenerates without `Template.hydratorClass`. `lint:gates` resolves the
three new `FromModule` strings. `lint:lib-statics`: `hydrationSource`/
`hydrateFromSource` sit inside mixin factories' returned classes, out of
scope by the lint's own rule; `TemplateApplier` keeps one public static
(`templatePath`, renamed from the hydrator's — no net change).

**D15 — The pack placement proof is a pack-side test.**
`packages/content/energy/src/__tests__/hydration-source.test.ts` (energy
already ships `src/lib/`; any pack with a vitest that imports
`test-bootstrap` would do — the build may pick `trade-mining` instead
and says which): a fixture mixin with `captureSlice`/`hydrateSlice` and a
`hydrationSource` over an in-test store, composed on a fixture class,
cloned, captured, hydrated, and driven at mint with no record. The kernel
diff for the wave is empty; that is the proof. No production pack mixin
is converted (flag 5).

---

## ⭐⭐ Host placement

| what | host | what composing/declaring it claims |
|---|---|---|
| `TemplateApplier` | `platform/idea/TemplateApplier.ts`, extends `Idea`; row `/platform/idea/TemplateApplier` | A stateless row-backed singleton; the clone pipeline's one content step. Claims nothing about any Stuff: it introspects the host's `fieldMeta`. |
| `birthOnly` | `FieldMetaEntry`; declared on `Stackable.quantity` | Every stack's quantity is birth-only under go-live — a crate of limes edited live keeps its live count, as its contents do. The flag is the field owner's; `Coin` inherits it. No guard re-narrows it. |
| `seed` | `FieldMetaEntry`; declared on `Behaved.dispositions`, `Cast.prologue`, `Cast.renown`, `Cast.competence` | Each owner already owns the field and the ledger it writes; the flag names the kind. |
| `seedDispositions()` | `BehavedMixin` | Every Behaved host can seed its dispositions; a non-`Dispositioned` host's applier returns (today's guard, unchanged — it is the ledger's absence, not a host narrowing). |
| `seedPrologue()` / `seedRenown()` / `seedCompetence()` | `CastMixin` | The three channels `_seedDossier` wrote, split by field; each keeps its `isPersona`/`isAdvancing` check. |
| `hydrationSource` + `hydrateFromSource` (the contract) | `PersistenceContributor` (`api/mixin.ts`) + types in `lib/persistence/PersistenceSlice.ts` | A contributor may say where its remembered state lives. Composing a mixin that declares one claims *this host has remembered state in that source* — true of every `BeliefStore` host by the mixin's own `viewerKey` rule, which decides per host whether that source applies. |
| `hydrationSource` / `hydrateFromSource` (the instance) | `BeliefStoreMixin` | `KeptAnimal` and `Character` already compose it for exactly this state. ⭐ No new host composes `BeliefStore`. |
| the driver, `#pendingHydration`, `ensureHydrated` | `StuffApi` | The clone pipeline fills a thing in; no object carries a record of it. |
| `describeFill` | `TemplateApi` → `TemplateLogic` | A row's question, answered by the row subsystem. |
| the `preloadAnatomy` calls | the verbs and brains that read a dial (D11) | Each caller warms what it is about to read — the nine-caller precedent, not a lifecycle. |

**Rejected hosts.** A `HydrationLayer` root with the applier as a member
(§ what went wrong). A record on `Stuff` (D9). A `HydratedMixin` (the
guard would be "does the class declare a source", which re-narrows). The
species warm as a side effect of `setSpecies` on `OrganismMixin` (eager by
construction, but a lifecycle in disguise; the requirements place it on
the read path). The driver in `PersistableLogic` (D9).

---

## Convention conformance

Checked at plan time against the current tree:

- **`props:`/`cast:`** — untouched; the once-flags stay the instruction
  side's guard. `populates:` stays retired (invariant 10 — and invariant
  13 copies its shape for `hydratorClass`).
- **Locations, not rooms** — no location classes touched; the location
  family's base-level hook is untouched (requirements § Collisions).
- **The five axes and `<root>/<branch>/`** — `/platform/idea/TemplateApplier`
  mirrors `platform/idea/TemplateApplier.ts`; no new root, no new
  cluster.
- **Module scope declares** — nothing new at module scope; the applier
  row warms lazily via `singleton`.
- **Import boundary (`lint:imports`)** — `StuffApi` writes diagnostics
  through `DiagnosticApi` (a lazy import if a cycle appears, the
  `./persistable` precedent at `:702`); `BeliefStore` already imports
  `BeliefDocument` and `PersistApi`.
- **Module categories** — no new one: one instanceable `Idea` renamed,
  one marker mixin deleted,
  one lint script, two static hooks on existing mixins, one Api method on
  an existing Api. **No new Api, no logic singleton, no free helper**:
  `loadFromCollection` and `viewerKey` are module-local behind methods;
  the lint walker is script-local.
- **Verbs on objects** — the seed appliers are host methods;
  `StuffApi.ensureHydrated(host)` is framework lifecycle under the
  existing `EXEMPT_APIS` entry (no list edit).
- **Inter-Stuff contract** — the bracket-assign carve-out stays the
  applier's alone; the belief hook calls `loadBelief`.
- **Member privacy** — `#pendingHydration` on `StuffApi` is Api-layer
  static state, `#` by the layer rule.
- **No new Mongo collection**; `lint:schema` untouched.
- **Gates this build must pass**: `lint:family` (every gate), with named
  attention to `lint:instanceable` (4/5/6 retired, 12 widened, 13 new),
  `lint:gates` (the three renamed strings), `lint:field-meta` (two new
  properties, regenerated golden), `lint:lib-statics` (no new public
  static on a `platform/` or `lib/` class), `lint:object-verbs` (census
  stays zero), `lint:module-scope`, `lint:imports`, `lint:mixin-names`
  (one kernel mixin retired, none added), `lint:test-bootstrap`, `lint:counters`, and the
  new `lint:on-create`.

---

## Waves

Each wave is independently landable and ends at one commit
(`build(hydration W<n>): …`, message from a file, never `-m`). The
pre-MR full suite runs once, after the last source-touching wave.

### W0 — `onCreate`: the terminal on `Stuff`, the mixin retired ✅ DONE

> **Landed.** 96 composition sites stripped (the plan said 78 — the grep
> at plan time missed the test fixtures that compose the marker on a
> fixture class), the hook renamed at every declaration and call site
> across 364 files, `PostRegistration.ts` / `Mixins.PostRegistration` /
> `MixinApi.isPostRegistration` deleted, the dispatch in
> `#registerAndInit` made unconditional, and the `createSync` guardrail
> moved onto `raw.onCreate !== Stuff.prototype.onCreate`.
>
> **Three corrections to the plan, found by doing it:**
>
> 1. ⚠ **Seven defensive chains, not eight.** The plan's eighth was
>    `lib/spatial/Mobile.ts`, whose `Base.prototype as` dance is on
>    `onSlotReleased`, not the hook — `Mobile` declares no `onCreate` at
>    all. The seven that converted to a plain `await super.onCreate()`
>    are `CommandGiver`, `Cast`, `Bonded`, `PublicLighting`,
>    `Persistable`, `Behaved` and `trade-mining/Working`.
> 2. ⚠⚠ **A scripted strip that collapses newlines eats `//` comments.**
>    Removing `PostRegistrationMixin(…)` by brace-matching and
>    re-joining the inner expression turned `Avatar.ts`'s 20-line
>    composition — which carries four explanatory comment blocks between
>    the mixin calls — into one 1,078-character line where everything
>    after the first `//` was commented out. `tsc` caught it as a
>    syntax error one line later; a `//`-free file would have been
>    silently mangled. The block was rewritten by hand. ⭐ The general
>    lesson for the W2/W3 scripted sweeps: **a text transform that
>    reflows lines is unsafe in a tree with line comments** — delete
>    whole lines or match within one line, never re-join.
> 3. The nine concrete classes that declared the hook without composing
>    the marker need no roster test any more: the dispatch is
>    unconditional, so "reached through the pipeline" is true by
>    construction for every class. `Stuff.onCreate.test.ts`'s second
>    case (*an override is called with NO mixin composed at all*) is
>    that proof, and it is stronger than nine clones would be.
>
> `pnpm build` type-clean across every package.


**Goal.** Every Stuff has an `onCreate` hook that bottoms out on `Stuff`;
nothing composes a marker to get it; the chain is plain `super`. One
wave, one commit — the retirement and the rename touch the same
declaration sites and splitting them makes the diff unreadable. Placed
first so the census script (W1) is named for the final hook and no
later wave writes a line this wave would then rename. It shares no
commit with the `TemplateApplier` rename (W4). **Implements** D12.

**Files.** `lib/stuff/Stuff.ts` (the terminal + `@hook` block, beside
`onDestruct`); delete `lib/stuff/PostRegistration.ts`; `lib/mixin.ts:261`;
`api/mixin.ts:1141` (+ its import); `api/stuff.ts` (`:381` doc, `:786–804`
doc, `:814` option, `:828–836` the guardrail on `raw`, `:946` the
dispatch); `CardLogic.ts:68`, `WorldClockLogic.ts:91` (`deferOnCreate`);
`lib/character/Avatar.ts:730–767` (`chainOnCreate`, the override's name
and comments), `PrimaryAvatar.ts:89–165` (name, `chainOnCreate` call,
comments — **no logic change**); the 78 composition sites (strip the
factory call and the import; where a comment explains *why* the mixin is
composed — `Boundary.ts:51`, `Biome.ts:52`, `ExitableVessel.ts:79`,
`SandboxCrossing.ts:66`, `Location.ts:119`, `KeptAnimal.ts:98–103`,
`NPC.ts:15`, `FuelStore.ts:50` — the comment becomes *why this class
overrides `onCreate`*, and `KeptAnimal`'s ordering warning is deleted
because the hazard no longer exists); the 84 declaration sites (rename;
the eight defensive-chain mixins → `await super.onCreate(context)`); the
`Stateless by construction (no PostRegistrationMixin)` doc line on ~20
logic singletons → *no `onCreate` override*; `FurnishableRoom.ts:104`,
`Lounge.ts:36`, `Bar.ts:40`, `SphericalLocation.ts:26`, `CircleFloor.ts:26`,
`CartesianLocation.ts:50`, `Offstage.ts:22`, `DormRoom.ts:31`,
`Corridor.ts:23` (the *NOT composed here* comments go);
`packages/content/transport/content/system/transport/thing/coach.yaml:10`
(the composition comment); the 132 test files that name the hook or the
mixin (a scripted rename from the scratchpad, staged by name; fixtures
that compose the mixin on a test class drop the factory); the ~113
doc files are **not** swept here — W8 rewrites the subsystem docs that
own the concept (`lifecycle.md`, `templates.md`, `behavior.md`,
`bootstrap.md`, `address.md`, `access.md`, `banking.md`, `biome.md`,
`boundary.md`) and the sweep's `CLAUDE.md` line names the rename; stale
mentions elsewhere are the sweep's grep.

**Tests.** `lib/stuff/__tests__/Stuff.onCreate.test.ts`: a bare `Stuff`
subclass clones with no override; a three-layer mixin chain where every
layer calls `super.onCreate` runs all three in order; a layer that
forgets `super` is the only way to shadow (asserted, as documentation).
`api/__tests__/stuff.test.ts`: **the guardrail** — `createSync` of a
class with no override succeeds; of a class that overrides it throws
with the new message; `singletonSync` on a logic singleton (`ApiLogic`
descendant with no override) still resolves; `deferOnCreate: true`
bypasses as before. **The nine**: one clone per concrete class family
(`CartesianLocation`, `SphericalLocation`, `Lounge`, `Gus`,
`PrimaryAvatar`, `ShadeAvatar`, `Field`, `Wood`, `Realtor`) asserting a
spy on its `onCreate` was reached through the pipeline. `lint:mixin-names`
passes with the const gone.

**Acceptance.** `grep -rn "postRegister\|PostRegistration" packages/server/src packages/server/scripts packages/content/*/src packages/types packages/client`
is empty; `pnpm test:near` + every touched pack's vitest + `lint:family`
green; `createSync`/`singletonSync` work (the guardrail test); the nine
concrete classes verified reached.

### W1 — The census gate and the two field flags ✅ DONE

> **Landed.** `scripts/check-on-create.ts` + `lint:on-create` (derived
> into `lint:family` by `package.json`, no list to edit), `seed?: true`
> and `birthOnly?: true` on `FieldMetaEntry`, both taught to
> `check-field-meta`'s `KNOWN_PROPS` + `TRUE_ONLY`.
>
> ⭐ **The census is 82 implementations / 38 state-loading.** The plan
> predicted 84/40 and the requirements 82; the script is the truth, as
> D13 said it would be, and 82 is what the ceiling is set to. The
> ceilings fall at W4 (Cast leaves the loading set), W5 (Cast leaves the
> implementation set) and W6 (Bonded leaves the loading set).
>
> The script is importable (the `process.argv[1]` CLI guard, the
> `check-menu-staff` precedent) so its test can read the ceilings
> without running the gate. The test asserts the invariant and the two
> discriminations the regex makes — declaration versus call site versus
> docstring mention — the last being the exact defect the slate's first
> census script shipped.


**Goal.** Gate the hook count before anything moves; teach `fieldMeta`
the two words the build needs. **Implements** D13 (the gate), the
`FieldMetaEntry` halves of D3 and D4.

**Files.** New `packages/server/scripts/check-on-create.ts` (+
`scripts/__tests__/check-on-create.test.ts` with a positive fixture);
`package.json` `lint:on-create`; `lib/mixin.ts` (`seed?: true`,
`birthOnly?: true`, doc comments); `scripts/check-field-meta.ts`
(`KNOWN_PROPS`).

**Acceptance.** `pnpm -C packages/server lint:on-create` prints the
census and exits 0; `lint:family --list` shows it; the test proves the
gate fires on a fixture that adds a loading hook; `lint:field-meta`
accepts the two flags.

### W2 — The applier is automatic: `hydratorClass` leaves the engine ✅ DONE

> **Landed.** The field is gone from `TemplateOwn`/`TemplateSpec`/
> `Template.fieldMeta`/the effective field/`setOwn`/`fromDocument`/
> `toDocument`/`#inherit`, from the clone pipeline, from `PackLogic`'s
> `DomainFile`+parse+`assertClassesResolve`+`reportUnreferencedClasses`+
> preimage+`exportBody`, from `CmsLogic`'s `templateMeta` and round-trip,
> from `write`/`cat`/`cp`/`mv`, from `CodeNamingFields`, from
> `types/src/index.ts` and `cmsSlice.ts`, from `test-bootstrap`'s
> `KERNEL_CONTENT_ROWS`, and from 66 test files' row literals.
>
> ⚠⚠ **The one defect this wave nearly shipped, and the plan's wording
> is what caught it.** D1 says the gate is `Object.keys(data).length > 0`
> where `data` is the MERGED value; the code resolved the hydrator at
> step 6 and merged `opts.dataOverlay` at step 7. Gating on
> `template.data` alone would have dropped the overlay for every caller
> whose row is `data: {}` — and five production callers pass one
> (`Login`'s guest body, `EmbodyController`, `ConditionLogic` ×2,
> `SandboxLogic`, the market `StallController`). That is the retired
> field's own failure mode, re-created. **The merge moved above the
> resolve.**
>
> ⚠ **The recursion terminator changed kind.** It was declared (the
> applier's row named no hydrator); it is structural now (the applier's
> row has `data: {}`). `stuff.test.ts` drives both arms: the empty row
> terminating with no guard needed, and the row given data re-opening
> the cycle so the guard is still *seen* to fire. Without the second
> case the guard would have become untested the day the field left.
>
> ⭐ **The gate shrank with no carve-out.** `codeGate.test.ts`'s
> "changing the hydratorClass" case retires WITH the field, replaced by
> one asserting the violation vocabulary is exactly `class` and
> `behaviors[].brain`. The "smuggling a non-standard hydrator under a
> folder class" arm goes too: with no applier to smuggle, a folder class
> with no behaviors IS the scaffold the carve-out exists for.
>
> Invariants 4/5/6 retired, 12 widened (same population — zero rows had
> data without the standard hydrator), 13 added in invariant 10's shape.


**Goal.** A row with data gets its data; the field is gone from the
type, the pipeline, the pack installer, the gate, the authoring verbs,
the CMS and the lints. Content still carries the dead key (the engine
ignores it; W3 deletes it). **Implements** D1, D6, D14's retirements.

**Files.** `lib/stuff/Template.ts` (every line § grounding lists);
`api/template.ts` (doc); `api/stuff.ts` (step 6 → data-non-empty; `:380`
doc); `platform/idea/api/TemplateLogic.ts` (`saveTemplate`'s spec; the
gate — D6; `restoreFromTemplate` unchanged this wave); `PackLogic.ts`
(`DomainFile`, parse, `assertClassesResolve`, `reportUnreferencedClasses`,
the preimage + `exportBody`); `CmsLogic.ts` (`:431` templateMeta, `:618`
round-trip); `WriteController.ts` (`DEFAULT_CONTENT_HYDRATOR`, `--hydrator`
parsing, the save) + `write.yaml` (`hydrator:` option and the three
sentences); `CatController.ts` (the hydrator lines go; `cat`'s
"what fills this row" line lands in W7); `CpController`/`MvController`;
`lib/stuff/CodeNamingFields.ts`; `scripts/check-instanceable-placement.ts`
(4, 5, 6 retired; 12 over every row with data; `STANDARD_HYDRATOR` goes;
header comment); `scripts/pack-roots.ts` (`effectiveRow`, the export at
`:870`); `scripts/check-ground.ts`; `scripts/check-template-census.ts`
(comment); `scripts/__fixtures__/field-meta-golden.json` (regenerate);
`types/src/index.ts:4043`; `client/src/store/cmsSlice.ts:29`;
`test-bootstrap.ts` (`KERNEL_CONTENT_ROWS` type + the five lines);
**the 47 + 19 test files** whose row literals carry the key (a scripted
line deletion from the scratchpad, staged by name); `codeGate.test.ts`
(`:218`, `:313` lose their hydrator halves; `:104` and `:118` unchanged);
`StudioLogic.test.ts` (a create with data → the clone carries it).

**Tests.** `Template.extends.test.ts` + `pack-roots.extends.test.ts`:
the chain resolves `class` and `data` with no third field. `stuff.test.ts`:
a clone with data and no key applies it; a clone with `data: {}` resolves
no applier; the applier's own row clones with no recursion.
`PackLogic.record.test.ts`: a stored row with the key and a filed row
without reconcile as **changed** once (the preimage dropped a key) and
unchanged thereafter. The three gate suites (`Coin`, `CraftVessel`,
`Serviceable`) pass untouched (the strings have not moved yet).

**Acceptance.** `pnpm test:near` + `lint:family` green; a protowizard's
class-less child with data clones with the data (the W2 half of drive
step 1); a wizard's Studio create carries its data; `grep -rn hydratorClass packages/server/src packages/server/scripts packages/types packages/client` is
empty outside doc comments.

### W3 — The content sweep ✅ DONE

> **Landed.** 1,528 `hydratorClass:` lines deleted across 51 packs by one
> whole-line `sed` (never a reflow — W0's lesson). ~20 rows whose
> COMMENTS discussed having or lacking an applier were rewritten by hand
> rather than stripped: several explained a real hazard, and the honest
> edit says the hazard is structurally gone, not that it never existed.
> Three keep the old field name deliberately, as history.
>
> `grep -rn '^\s*hydratorClass:' packages/content` is empty.
>
> ⚠⚠ **Two defects found by verifying, both of them tests that had
> stopped testing anything:**
>
> 1. `stuff.test.ts`'s *"a callback scheduled INSIDE a clone tree is a
>    fresh root"* case armed its two concurrent clones from inside the
>    APPLIER ROW LOOKUP. With the applier resolved only when there is
>    data, its fixture row (`data: {}`) never reached that branch, so
>    `later` was empty and the test asserted nothing — a **vacuous
>    assertion that looks exactly like a passing one**. Its row now
>    carries data deliberately, with a comment saying why.
> 2. The same describe needed a `StuffApi.clearAll()` per case:
>    `singleton()` short-circuits on a cached instance, so an applier
>    left registered by the previous case meant the next one never
>    looked its row up. Two of the three cases in that block were
>    passing for the wrong reason.
>
> ⚠ **And a process note worth keeping: W0 was committed with three TS
> errors in its own new test file** (`override` on a member of a mixin
> class-expression, which has no base to override). The `tsc --noEmit`
> that reported clean had been launched BEFORE that file was written.
> *Verify after the last edit, not after the last big edit* — the fix
> rides W2's commit.


**Goal.** No row anywhere names a hydrator; the lint keeps it so.
**Implements** D14's invariant 13.

**Files.** Every `hydratorClass:` line in `packages/content/**/*.yaml`
(a one-line `sed` over the tree from the scratchpad, staged by name —
1,528 rows across 51 packs); the 12 rows whose comments discuss having or
lacking a hydrator (`home.yaml`, `Party.yaml`, `passage.yaml`,
`ShadeAvatar.yaml`, `SandboxAvatar.yaml`, `LaneCatalogue.yaml`,
`EvalScript.yaml`, `shears.yaml`, `lounge/idea/warren.yaml`, `void.yaml`,
`dorm-warren.yaml`, `dorm-themes.yaml` — the comment loses its subject);
the doc-comment mentions in `Door.ts:44`, `Window.ts:22`, `Reading.ts:18`,
`Placement.ts:16`, `access.ts`, `AccessRegistry.ts`;
`check-instanceable-placement.ts` (invariant 13).

**Acceptance.** `grep -rn '^\s*hydratorClass:' packages/content` is
empty; `lint:instanceable` passes with 13 live; a fresh-DB boot installs
every pack. ⭐ A dev DB installed before W2 is **dropped**, not migrated.

### W4 — `TemplateApplier`: the name, the third phase, the go-live mode

**Goal.** The content step is named for what it does, seeds as a phase,
and never pushes a value-bearing field by going live — the coin is fixed.
**Implements** D2, D3, D4.

**Files.** `git mv platform/idea/persistence/PersistentHydrator.ts platform/idea/TemplateApplier.ts`
(class, header, the two-phase comment → three phases + modes); delete
`lib/stuff/Hydrator.ts`; `lib/paths.ts:75`; the row (`git mv` the YAML to
`content/platform/idea/TemplateApplier.yaml`, `class:` updated);
`api/stuff.ts` (import; the closure passes `{ mode: 'mint' }`);
`TemplateLogic.restoreFromTemplate` (`{ mode: 'go-live' }`);
`PersistableLogic.restoreState` (`{ mode: 'restore' }`; the import);
`platform/thing/Coin.ts:80–91`, `CraftVessel.ts:70–87`,
`lib/craft/Serviceable.ts:38–51` (the two arms, exact strings, comments —
the *"interface with no runtime class"* sentence goes);
`backend/BootstrapManager.ts:36,157`; `test-bootstrap.ts` (the applier's
row path and class); `lib/stuff/Stackable.ts:127` (`birthOnly: true`);
`lib/behavior/Behaved.ts` (`dispositions: { …, seed: true }`;
`_seedDispositions` → public `seedDispositions(seeds)`; the hook keeps
teardown + wire); `lib/npc/Cast.ts` (`prologue`/`renown`/`competence`
gain `seed: true`; `_seedDossier` splits into three public appliers; the
hook keeps only `hydrateBeliefs()` until W5); `PackLogic.rehydrate` + the
`pack sync` help text (the word); `scripts/check-on-create.ts`
ceiling (loading set −1: Cast); doc-comment mentions of the old name
(`Marshaller.ts:27–56`, `mixin.ts:656,724,765,1938`, `Detailed.ts:222`,
`Sealable.ts:19`, `DoorBearing.ts:40`, `check-field-meta.ts:51`).

**Tests.** `platform/idea/__tests__/TemplateApplier.test.ts` (the three
phases in order; a seed key with no `seed<Field>` throws naming the
field; go-live runs phases 1–2 and skips `birthOnly`; restore runs phase 1
only and does not skip `birthOnly`). `TemplateApplier.goLive.test.ts` (a
live stack at 500, `restoreFromTemplate` on the coin row → still 500; a
`keywords` edit still lands; the instruction once-flags unchanged).
`Cast`/`Behaved` suites: clone, destruct, re-clone → one set of claims;
go-live seeds nothing. The three gate suites pass through the renamed
strings; `lint:gates` resolves them.

**Acceptance.** `pnpm test:near` + every touched pack's vitest +
`lint:family` green; the coin go-live test passes; `grep -rn PersistentHydrator packages`
is empty.

### W5 — Hydration: the pair, the source, the driver, the first consumer

**Goal.** The contributor framework reads capture/hydrate, a contributor
may name its own source, the clone pipeline drives it with no record,
and an NPC remembers you across a restart through it. **Implements**
D7, D8, D9, D10, D15.

**Files.** `api/mixin.ts` (`PersistenceContributor.hydrateSlice`,
`.source`; `getPersistenceContributors` reads the two new statics);
`lib/persistence/PersistenceSlice.ts` (`HydrateContext`, `HydrationSource`,
`HydrateOutcome`); the rename at every `restoreSlice` site § grounding
lists (`Estate`, `BeliefStore`, `Container`/`Slotted` comments,
`ChattelLogic` comments, `PersistableLogic.restoreState` (4), the three
tests); `api/stuff.ts` (`#hydrateFromSources`, `#pendingHydration`,
`ensureHydrated`; the `#registerAndInit` order comment); `lib/belief/BeliefStore.ts`
(`loadFromCollection`; the two statics; `hydrateBeliefs` delegates);
`lib/npc/Cast.ts` (**the `onCreate` override is deleted**);
`scripts/check-on-create.ts` ceilings (implementations −1); the
pack-side test (D15).

**Tests.** `lib/stuff/__tests__/hydration-source.test.ts` (a fixture
contributor per declaration: required + unreachable fails the clone and
unregisters; optional + unreachable is skipped; lazy is pending then
`ensureHydrated` runs it once; an eager source completes before
`onCreate` observes it). `belief/__tests__/persistence.test.ts`
extended: a singleton `Cast` destructed and re-`singleton`'d after its
records are written reads them at mint with no `onCreate` involved;
an `Extra` skips with reason; Mongo closed → skipped, not thrown; a named
animal still restores its beliefs from its record (`KeptAnimalPersistence.test.ts`
unchanged in behaviour). The pack test (D15).

**Acceptance.** `pnpm test:near` + `energy` (or the chosen pack) vitest +
`lint:family` green; `lint:on-create` census falls; the kernel diff
attributable to the pack proof is empty.

### W6 — The species read goes back to the read path

**Goal.** A newborn kept animal answers about its own feeding, handling
and biddability because the verb that asks warms what it reads.
**Implements** D11.

**Files.** `lib/husbandry/Bonded.ts:396–418` (the warm and its comment
go; born-hungry and home stay); the callers D11 names, each gaining
`await SpeciesApi.preloadAnatomy(animal)` before its first dial read;
`scripts/check-on-create.ts` ceiling (loading set −1: Bonded).

**Tests.** `Bonded` suite: a cat cloned fresh, then `offer` → the rung
is the species' hand rung, not `no-hand-rung`; `call`/`stay` on a fresh
collie reads biddability; a brain tick on a fresh animal reads acuity.
Assertions that can fail (a drive checkpoint must be able to fail — the
previous defect passed every refusal-shaped assertion).

**Acceptance.** `pnpm test:near` + `lint:family` green; drive step 6's
unit half.

### W7 — The authoring surfaces

**Goal.** An author can read what will fill a row in, and is told at
write time what nobody will apply. **Implements** D5.

**Files.** `api/template.ts` + `TemplateLogic.ts` (`describeFill`);
`platform/idea/TemplateApplier.ts` (the mint-time unapplied-key
diagnostic + the per-process `Set`); `CatController.ts` (the lines after
`data:`/`inherited:`: `applies: …`, `unapplied: …`, `remembers: …`, or
`fills: nothing`); `WriteController.ts` (`describeFill(spec)` →
`ctx.note({ kind: 'warning', … })` listing unapplied keys — not a
refusal, because a key a catalogue reads directly is a legitimate
authoring act); `StudioLogic.createTemplate` (the describe lines in the
committed disposition's message); `CmsLogic.ts` (`templateMeta.fill: string[]`
in place of the dropped field; `types/src/index.ts`, `cmsSlice.ts` carry
it; no UI change required); `docs` for the `errors` channel name.

**Tests.** `CatController` test: the three outputs (applies + remembers;
unapplied; nothing). `WriteController` test: a row whose keys the class
does not declare gets the note; a row whose keys it declares gets none.
`TemplateApplier` test: one diagnostic per `(path, key-set)` per
process. `StudioLogic` test: the message names the applied keys.

**Acceptance.** Drive steps 2–3's unit halves pass; `cat` on the coin
row reads `applies: keywords, mass, quantity (quantity: birth-only)`
and `remembers: nothing` (wording the build chooses, the facts fixed).
⭐ **`pnpm test` runs here once — the pre-MR full run** — if W8 touches
no source.

### W8 — Docs and the drive

**Goal.** The next build finds the three kinds where it looks, and the
drive is a wire file that has been run.

**Files.** `docs/subsystems/templates.md` (§ The Template Class loses
the field; § The Clone Pipeline steps 4/6/9 → *the applier runs iff data*;
§ The Hydrator Contract → **§ The TemplateApplier** — three phases, three
modes, `birthOnly`, `seed`, the unapplied-key report; § Restore-from-
template → go-live mode; § Failure Modes); `persistence.md` (§ Per-mixin
composition: `captureSlice`/`hydrateSlice`/`hydrationSource`/
`hydrateFromSource`, the two declared properties, the mint-time driver;
§ The self-persistence spine's `restoreState` numbering; the `:110,312,446,
657,923,961` mentions); `lifecycle.md` (the clone sequence: applier →
sources → `onCreate`; the terminal on `Stuff`; the four limbs of
post-registration work; `PostRegistrationMixin` retired);
`access.md § The code-trust lockdown` (two fields; the scaffold rule);
`studio.md` (the defect and its fix by deletion; flag 1's residue);
`cms.md` (go-live is a mode; `templateMeta.fill`); `content-packs.md`
(the reconcile preimage; a pack mixin's remembered state); `hot-reload.md
§ Hydrators` (→ the applier); `belief.md` (the source; `Cast` reads at
mint); `husbandry.md`/`pets.md` (the warm is the verb's);
`docs/lint-family.md` (`lint:on-create`; invariants 4/5/6 retired,
12 widened, 13); `docs/antipatterns.md` (a loading `onCreate` → a
source or a phase; `:1462–1470` constant name; the `Hydrator` subclass
passages → cross-field invariants are the class's); the lifecycle-signals
and persistence-architecture slates get their one line each (deferred
seams below). `CLAUDE.md`'s index line and `roadmap.md` are left to the
sweep (worktree rule 5); `hydration-framework-slate.md` retires at
`/finalize`. **The wire file:** `packages/wire/tests/hydration.dirty.wire.test.ts`
(dirty — it writes rows, clones NPCs and names an animal).

**Acceptance.** The wire drive passes; the drive record below is filled
in from a run, with counts; the browser halves are transcribed.

---

## Reachability wiring

Each link fails closed and silent; each is named with its wave.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the applier runs on data | none | none | runs iff `data` non-empty (W2) | the applier's row in the platform pack + `KERNEL_CONTENT_ROWS` + the boundary exemption (W2/W4) | the gate no longer sees a field (W2) |
| `seed<Field>` | none | n/a | `seed: true` on the four fields (W4) — a flag nobody declares seeds nothing, silently; the `Cast`/`Behaved` re-clone tests are the catch | n/a | n/a |
| `birthOnly` | the CMS save, `pack sync` | n/a | `birthOnly: true` on `Stackable.quantity` (W4) | n/a | n/a |
| a contributor's source | none | n/a | **the two statics on the mixin (W5)** — a mixin that declares neither is never driven; `describeFill`'s `remembers:` line is how an author sees it | nothing to boot: the walk reads the class | n/a |
| the driver | none | n/a | `#registerAndInit`'s new step (W5) — runs for every clone; a `create()`d object runs none | n/a | n/a |
| the belief read at mint | none | n/a | `BeliefStore`'s statics (W5); `viewerKey` decides per host | `PersistApi.isConnected()` — closed → skipped | n/a |
| the species warm | `offer`/`call`/`stay`/`pet`, the brains | existing | the call beside each read (W6) | n/a | n/a |
| the diagnostic | `errors` | n/a | channel `template` (W7) | `DiagnosticApi.startRouter` already runs | n/a |
| `cat`'s fill lines, `write`'s note | `cat`, `write` (W7) | existing | `describeFill` (W7) | n/a | n/a |
| `onCreate` | none | n/a | the override on the class (W0) — a class that forgets `super.onCreate` shadows its inner layers; the chain test documents it | n/a | n/a |
| `lint:on-create` | `pnpm lint:on-create` | derived into `lint:family` by `package.json` (W1) | n/a | n/a | n/a |
| invariant 13 | `pnpm lint:instanceable` | derived | the retired-key check (W3) | n/a | n/a |

---

## Acceptance-criteria coverage

The requirements' eleven criteria, each to a wave and a proof.

| criterion | wave | proof |
|---|---|---|
| Studio data lands on the clone | W2 | `StudioLogic` create test (a wizard's create carries data; a protowizard's class-less child carries data); browser drive step 1 as § flags 1 states it |
| An author reads what fills a row; "nothing" reads as nothing | W7 | `CatController` test; wire step 2 |
| Told at write time when data nobody applies | W7 | `WriteController` test; wire step 3 |
| A value-bearing row edit leaves live values alone; nobody's money changes | W4 | `TemplateApplier.goLive` test; browser step 8 (CMS save on the coin row while holding coins) |
| NPC memory and kept-animal memory survive a restart, by one framework | W5 | `persistence.test.ts` (Cast at mint; animal from its record — both through `getPersistenceContributors`); wire steps 4–5; browser restart |
| A newborn kept animal answers about feeding/handling/biddability | W6 | `Bonded` tests; wire step 6 (`offer` to a fresh cat is not `no-hand-rung`) |
| Authored history appears exactly once across re-clones and restarts | W4 | `Cast`/`Behaved` re-clone tests; wire step 7 |
| Relog after restart: worn and carried things as left | — (untouched path) | the spine suite unchanged; wire step 9; browser restart — the regression proof for a path this build does not move |
| A pack author's mixin with remembered state is captured and hydrated with no kernel change | W5 | the pack-side test; the empty kernel diff |
| **No row anywhere names a hydrator**, and every one of the 1,528 behaves as before | W2 + W3 | invariant 13; the grep; the full suite; the wire drive |
| A non-wizard can author a row that applies data, with no exemption anywhere in the gate | W2 | `codeGate.test.ts:118` + a new case: the child's data is applied on clone; the gate's violation list has two entries and no hydrator arm |

Nothing in the requirements is unmapped.

---

## Test & gate strategy

- **Unit** (per wave, above). The ratchet test asserts the invariant,
  not the number. Lint tests carry positive fixtures. Every assertion
  behind a drive step is one that can fail (the `no-hand-rung` lesson).
- **Wire** — `hydration.dirty.wire.test.ts`, the drive. What a socket can
  settle: steps 2, 3, 4 (destruct the singleton `Cast` and re-`singleton`
  it — the exact thing a restart does to a `Cast` — then `look` reads the
  remembered regard), 5 (handle a cat, name it, destruct and
  `standUpKeyed`), 6, 7 (clone twice with a destruct between; count
  claim rows through the chronicle read), 9 (logout, login, `inventory`).
  What it cannot: **step 1** (the Studio form is REST + browser), **step
  8** (the CMS save is REST; `write` does not go live), and the **real
  restart** behind 4, 5 and 9. Those are the browser drive, recorded in
  the drive record with the transcript; the unit tests above are their
  code-level halves.
- **Lints** — `lint:family` after every wave; the named gates in
  § Convention conformance.
- **The full suite** — exactly twice: before the MR opens (after W7, or
  after W8 if W8 touches source) and at `/finalize`. Everything between
  is `pnpm test:near` + the touched packs' vitest (`generic-objects`,
  `trade-mining`, `saxonberg-lounge`, `terminus`, `platform`, the W5
  pack) + `lint:family`. A green run stays valid until a source file
  changes; check with the `git status` filter in `CLAUDE.md` before
  re-running. A narrowed run is never reported as the suite.

---

## Risks & opens

1. **The 66 test fixtures (W2).** A scripted deletion of one key from
   row literals across 47 kernel + 19 pack test files; the risk is a
   fixture that asserts on the field (`Template.extends.test.ts`,
   `pack-roots.extends.test.ts`, `PackLogic.record.test.ts`,
   `codeGate.test.ts`) rather than merely carrying it — those four are
   edited by hand and named above.
2. **The preimage change (W2).** Every row reconciles as changed once at
   the first boot after W2 — ~1,970 content changes, each re-applying
   data to live singletons through go-live. On a dev DB this is a drop
   and reboot; the acceptance check is that the second boot reports zero.
3. **The gate strings (W4).** Three gates plus `lint:gates`; a typo
   bricks a relog (`Serviceable.ts:43–47` is the record of exactly that).
   The three gate suites run after the rename and the wire relog (step 9)
   is driven in the same wave.
4. **The mint-time belief read (W5).** One Mongo round-trip per
   `BeliefStore` host clone with a durable key — every `Cast` singleton,
   every avatar body. `viewerKey` row 4 (an `Extra`, a stray) costs
   nothing. If boot time moves measurably (the ±6% floor), the eager
   declaration on `BeliefStore` is the dial, not the framework.
5. **`SelfOnly` from a static hook.** `hydrateFromSource` is a static
   called inside the constructor frame, where a call on the proxy is a
   self-call — but `ensureHydrated` runs outside that frame. The hook
   therefore calls the ungated `loadBelief`, never `hydrateBeliefs()`;
   the build keeps it that way for every source it writes.
6. **`StuffApi` → `DiagnosticApi` import.** If it cycles, the lazy-import
   precedent at `stuff.ts:702` applies; the diagnostic is written by the
   applier (an `Idea`), not by `StuffApi`, which keeps the pipeline's
   import list unchanged.
7. **The login path is not touched** — the previous plan's largest risk
   evaporates with the snapshot layer. The one login-path change is the
   second belief read (flag 4), which is additive and idempotent. ⭐
   Said plainly: no wave in this plan edits `PrimaryAvatar.ts`,
   `Login.ts` or `PlayerLogic`.
8. **The `createSync` guardrail (W0).** The one line in this plan that can
   brick boot: a predicate that is always true throws on every
   `createSync`, and `singletonSync` resolves every logic singleton
   through it. The comparison is on `raw`, the test covers both arms and
   `singletonSync`, and the wave is driven (a boot + a login) before W1.
9. **Things the user may want to see** (the build does not stop for
   them; recorded here and in the MR): flag 1's Studio reading; the
   source contract's exact names (`hydrationSource`/`hydrateFromSource`);
   `TemplateApplier` flat in `platform/idea/`; `describeFill` on
   `TemplateApi` rather than a new face; lazy with a test consumer only.

---

## Deferred seams

Each is an attach point, not a stub; the slate it leaves as is named.

- **`Avatar.enter`'s `hydrateBeliefs()`** → retire it (the mint-time
  source read covers it) and with it the `SelfOnly` method. Leaves as a
  line in [persistence-architecture-slate](../slates/builds/persistence-architecture-slate.md).
- **`Herdbook`'s self-filing** → `seed: true` on `herdId` with a
  `seedHerdId` applier — now a pack-only change with no kernel row to
  name. Leaves as a line in the ranching doc's open list.
- **The never-fault predicate** on the same census walker →
  [eager-residency-slate](../slates/builds/eager-residency-slate.md) W0,
  which now reads *add a predicate to `check-on-create.ts`*.
- **The value-bearing marker beyond `quantity`** (`denomination`, scrip,
  bearer credentials) → [money-integrity-slate](../slates/builds/money-integrity-slate.md)
  open question 2, with `birthOnly` as the mechanism to extend.
- **A lazy source with a production consumer** → nothing shipped wants
  one (flag 2); the mechanism waits in `StuffApi.ensureHydrated`. Leaves
  as a line in `persistence.md § Deferred`.
- **The 20 `*Catalogue` hooks that do one job** → the requirements'
  observation, recorded in `lifecycle.md` for the next pass; not a slate
  this build opens.
- **The Studio form's `extends`** → flag 1; the user's call, a line in
  `studio.md § open`.
- **Un-Stuffing the applier** → persistence-architecture Wave 3, now
  cheaper (no row names it, so it need not be author-selectable by path).

---

## Critical files

Read first, in this order:

1. `docs/requirements/hydration-requirements.md`
2. `packages/server/src/mud/api/stuff.ts` (`clone` :559–612, `#registerAndInit` :903–960)
3. `packages/server/src/mud/platform/idea/persistence/PersistentHydrator.ts` (whole file)
4. `packages/server/src/mud/lib/stuff/Template.ts` (:40–70, :180–300)
5. `packages/server/src/mud/platform/idea/api/TemplateLogic.ts` (:95–125, :184–236, :435–451)
6. `packages/server/src/mud/api/mixin.ts` (:254–271, :837–900) and `lib/persistence/PersistenceSlice.ts` (:255–295)
7. `packages/server/src/mud/platform/idea/api/PersistableLogic.ts` (:671–777, :865–892, :937–958, :1175–1198)
8. `packages/server/src/mud/lib/belief/BeliefStore.ts` (:320–470, :600–660), `lib/npc/Cast.ts` (:150–250), `lib/behavior/Behaved.ts` (:190–225), `lib/husbandry/Bonded.ts` (:370–440)
9. `packages/server/src/mud/platform/thing/Coin.ts` (:60–100), `CraftVessel.ts` (:70–90), `lib/craft/Serviceable.ts` (:35–55), `lib/security/SecurityPolicies.ts` (:60–80)
10. `packages/server/src/mud/platform/idea/api/PackLogic.ts` (:110–120, :965–980, :1189–1210, :1373–1409, :1580–1630, :2968–2985)
11. `packages/server/scripts/check-instanceable-placement.ts`, `scripts/pack-roots.ts` (:430–440, :587–677, :848–870), `scripts/check-field-meta.ts` (:520–530), `scripts/check-gate-strings.ts`
12. `packages/server/src/mud/platform/idea/cmd/shell/WriteController.ts` (:45–60, :80–100, :135–190), `CatController.ts` (:145–180), `platform/idea/api/StudioLogic.ts` (:832–880), `CmsLogic.ts` (:425–435, :573–632)
13. `packages/server/src/test-bootstrap.ts` (:55–110); `backend/BootstrapManager.ts` (:30–40, :150–160)
13a. `packages/server/src/mud/lib/stuff/PostRegistration.ts` (whole file), `lib/stuff/Stuff.ts` (:1255–1280), `api/stuff.ts` (`createSync` :786–840), `api/proxy.ts` (:160–250), `lib/creature/KeptAnimal.ts` (:95–105), `docs/antipatterns.md` (:1692–1770)
14. `packages/server/src/mud/platform/idea/api/__tests__/TemplateLogic.codeGate.test.ts` (the create cases)
15. `docs/subsystems/templates.md`, `persistence.md § The self-persistence spine`, `lifecycle.md`, `access.md § The code-trust lockdown`, `belief.md`, `docs/lint-family.md`
16. `packages/wire/tests/template-inheritance.wire.test.ts` (the shape of a drive that names what it cannot assert)

---

## Drive record

*(appended at build time, not at plan time)* — the output of running the
requirements' nine-step drive against the running game: the wire file's
run (count, each failure), and the browser transcript for steps 1 (as
§ flags 1 states it), 8, and the real-restart halves of 4, 5 and 9.
Precedent: `farming-plan.md § Checkpoint A — the drive record`.
