# World-scan — implementation plan

Executes [world-scan-requirements](../requirements/world-scan-requirements.md)
(seeded by [world-scan-perf-slate](../slates/tails/world-scan-perf-slate.md),
whose D1–D5 + D3a/D3b are the settled design and are **not re-litigated
here**). **Kind:** refactor/sweep + infra (one call-security policy, two
build gates, one response note). **Leads from:** kernel — the first
consumer is the seventeen `world:` call sites that already exist.

What the code needs: one registry index on mixin composition; a
`FromTemplateMethod` policy; the `world` seed refused everywhere except two
narrow, gated entries (the engine's index-answerable reads, and the Prime
Minister's typed query with a cost note); every remaining registry-wide
question rewritten to ask its owner (the money paths, the per-tick brain,
the item back-reference, the residence catalogue, the D4 named questions);
two lint gates; the antipattern doc inverted in the same wave as the
refusal; and a wire-file drive.

Slate decisions are cited as **D1–D5**; this plan's own decisions continue
the numbering as **D6–D20** so waves and commits can cite either.

---

## Grounding

Verified this cycle by opening files. Line numbers are as of
`design/world-scan` @ `f4763b71e` (even with `origin/master`); the enclosing
**function names** are the durable anchors.

### The registry

- `packages/server/src/mud/api/stuff.ts:84` — `static #indexes = { byId:
  Map<string, Stuff>, byTemplatePath: PathTrie<Stuff> }`. **Two indexes,
  nothing else.** `#updateIndexes(obj, 'add'|'remove')` (`:134`) is the
  single register/unregister chokepoint; it keys the trie on
  `Stuff._identityStampOf(obj) ?? obj.getTemplatePath()`.
- `stuff.ts:1312 getAllObjects()` walks `byId.values()`, liveness-checks
  the **raw** target (`ProxyApi.unwrap(obj).isDestroyed()` — enumeration
  must not count as a dispatch-touch) and lazily drops destroyed entries.
  `:1276 findByPathGlob()` is trie-backed. `:1294 findTemplatesByPath()`
  is an O(N) walk on path-atom miss (not this build's).
- `register()` (`:884`) calls `MixinApi.assertComposable(ctor)` then
  `#updateIndexes(obj,'add')`. `postRegister` fires **after** register (the
  hook doc in `lib/stuff/PostRegistration.ts`).
- ⚠ Correction to the earlier grounding note: `Template extends Document`
  (`lib/stuff/Template.ts:43`), **not** `Stuff` — the registry holds live
  instances only; template *rows* are hydrated into instances at boot.
  **n = 1,785** live objects at a populated boot with nobody connected
  (`GET /stats`, `Server.ts`).

### The MQL `world` seed

- `api/mql/resolver.ts:323` direct seed: `if (w === 'world') return
  matchesFromStuff(StuffApi.getAllObjects())`. `:633` scope path:
  `candidatesForFlat(StuffApi.getAllObjects(), …)`. `:693` `world` is in
  `NAMED_SEED_KEYWORDS` (mid-chain intersect path).
- Chain resolution: `resolveQuery → resolveSublist → resolveChain` (`:171–
  196`): seed first (`resolveSeed`), then `applyChainOp` per op. Bracket
  filters are applied **after** the seed, per object: `:1312`
  `hasMixinByLowercaseName` (→ `MixinApi.queryMixins(ctor)`, compares
  `_mixinName.toLowerCase()`), `:1314` `matchesClass` (prototype-chain walk on
  `constructor.name`, so it matches subclasses). Both are **pure functions of
  the constructor**.
- AST (`api/mql/types.ts:256–330`): `ChainNode { head: ChainElement; rest:
  ChainOp[] }`; `world:[mixin.X]` is `head = KeywordsNode{words:['world']}`,
  `rest[0].element = { kind: 'bracket-filter', expr: { kind: 'truthy'|'has',
  atom: { kind: 'namespaced', namespace: 'mixin', key } } }`.
- `api/mixin.ts:252 queryMixins()` — **not memoized**; walks the prototype
  chain every call. `hasMixin(host)` (`:331`) also consults shadows; the
  resolver's filter is **composed-only** (constructor walk) today.
- `MqlContext.commandGiver: null` = code-only system mode (`types.ts:41`);
  a caller-supplied argument, not a gate. `MqlPermissionError(message,
  operator)` exists (`types.ts:80`); **no resolver path throws it**;
  `MqlSubscriptionRegistry.ts:360,483,855` already classify it as
  `'permission'` for the wire.
- `api/mql.ts` — `MqlApi.resolveOne/resolveMany` are **sync** statics
  forwarding to `MqlLogic` (`platform/idea/api/MqlLogic.ts`, template
  `/platform/idea/api/mql`, per-method `FromModule('/api/mql#MqlApi')`).
  `MqlLogic` imports `resolveWithQuantity` from `api/mql/resolver` directly
  — sanctioned ("the logic singleton is the Api's own implementation").
- The resolver is **synchronous** end to end.

### The seventeen live sites (all `commandGiver: null`, `scope: 'world'`)

| # | site (function) | filter | note |
|---|---|---|---|
| 1 | `backend/AppBootstrap.ts:333 shutdown` | `[mixin.PersistableMixin]` | cold; **a backend class, no Stuff frame** |
| 2 | `platform/idea/cmd/charactergen/RecordControllerBase.ts:112 findBody` | `[mixin.OrganizationMixin]` | player path (`record` verb); label/path fuzzy match |
| 3 | `platform/idea/cmd/civics/TitleController.ts:129 books` | `[class.PlatBook]` | kernel naming a pack class by string; duck-typed `PlatBookShape` |
| 4 | `platform/idea/api/AttendantLogic.ts:106 allPoints` | `[mixin.AttendantMixin]` | private method; reached via `this.` from the lease sweep + disconnect |
| 5 | `platform/idea/api/PressLogic.ts:173 holdsAnyPublishingPositionImpl` | `[mixin.PublisherMixin]` | free fn, called from the method at `:456` |
| 6 | `platform/idea/api/BankingLogic.ts:311 findBranchOf` | `[mixin.BankMixin]` | free fn; callers at `:279, :334, :747, :2087` — **find-one by `getBank()` key** |
| 7 | `platform/idea/api/LocomotionLogic.ts:141 allModes` | `[class.LocomotionMode]` | all 11 rows under `/platform/idea/LocomotionMode/` (platform pack only) |
| 8 | `platform/idea/api/MagicLogic.ts:1753 execMisidentify` | `[mixin.IdentifiableMixin]` | free fn from `:1142`; builds the whole list, takes `[0]` |
| 9 | `platform/idea/api/EmploymentLogic.ts:187 holdersByPositionImpl` | `[mixin.EmployedMixin]` | **money-adjacent**: who holds one org's positions |
| 10 | `EmploymentLogic.ts:310 allBusinessesImpl` | `[mixin.BusinessMixin]` | cached in `businessCache`; `findBusiness(pred)` at `:837` does `.find` over it (callers `businessAt :1094`, `:1132`, `businessOfProprietor :1181`) |
| 11 | `EmploymentLogic.ts:772 flowSplitsForImpl` | `[mixin.EmployedMixin]` | **money path** (wage/tip remittance) |
| 12 | `lib/command/CommandController.ts:102 resolveScreen` | `[mixin.DisplayMixin]` | base-class method on every controller; the `mind` (Aether) rung after the `reachable` rung |
| 13 | `lib/slot/Slottable.ts:149 occupiedSlots` | `[mixin.SlottedMixin]` | "who holds one item" — the **CPU-pin path** (`Metabolic.ts:1400–1430` documents it; short-circuited, scan still there) |
| 14 | `lib/residency/Census.ts:90 takeCensus` | `[mixin.CirculatingMixin]` | static on a lib class; called from `ResidencyLogic.takeCensus` (`:758`) AND from `runSpawnSweep` (free fn) which the clock callback at `:745` calls **directly** |
| 15 | `lib/behavior/maintains.ts:116 holdingsUnder` | `[class.HoldingWarren]` | **a BRAIN** — `Behaved.ts:436 descriptor.act(ctx)` is a plain call, not a dispatch; per NPC per cadence |
| 16 | `lib/location/OuterWarren.ts:374 admitFor` (static) | `[class.OuterWarren]` | called from `PersistableLogic.ts:216` (log back in where you logged out) |
| 17 | `content/terminus/src/realty/agent/Realtor.ts:87 offers` (static) | `[class.PlatBook]` | pack; terminus already depends on `@saxonberg/content-residence` |

- `api/mixin.ts:1689` mentions `world:[mixin.GlobbableMixin]` in a **doc
  comment only** (the dev reload recipe) — not a call site.
- `Employment` records live **on the actor only** (`Organization.hire`
  `lib/employment/Organization.ts:322` → `actor._upsertEmployment(record)`);
  the organization keeps the authored roster (`getRosterAssignments`) and
  positions, **no live-hire set**. `EmployedMixin` is composed on
  `lib/character/Character.ts:110` (every Character). `employments` is a
  plain persistent field (`Employed.ts:224`, `fieldMeta.employments:
  {persistent, runtimeState}`), written by `_upsertEmployment`
  (`:328`) and by persistence restore.
- `Slotted.slots` is private; **every** occupancy goes through
  `Slotted.occupy/vacate` (`lib/slot/Slotted.ts:364–470`; `occupyAll`
  `:481` loops `this.occupy`; `vacateAll :467`; both witnesses
  `onSlotOccupied`/`onSlotReleased` are optional methods on the candidate).
  Slotted has `captureSlice` (`:692`) and **no `restoreSlice`** — restore
  re-occupies from the candidate side (`Login.ts:306 avatar.occupyAll`,
  `PersistableLogic.ts:602, :957`). Both `cleanupOnDestruct`s exist
  (`Slottable.ts:103` vacates from every host; `Slotted.ts:713`).
- `OuterWarren` (`lib/location/OuterWarren.ts:99`, kernel, abstract)
  keeps `_holdingsByKey: Map<string, MemberStuff>` (`:125`) and has
  `holdingFor(key)` but no all-holdings read. Subclasses: residence pack's
  `BuildingWarren`, `PlatWarren` (`SingletonMixin(PostRegistrationMixin(
  OuterWarren))`) **and** eternal-university's `DormWarren`
  (`content/eternal-university/src/duncan-hall/idea/DormWarren.ts:42`,
  also directly over `OuterWarren`) — **institution classes span packs.**
  `HoldingWarren extends InnerWarren` (residence); `MineWarren extends
  HoldingWarren` (trade-mining). Institution rows: `dorm-warren.yaml`,
  `seznick-house/building.yaml`, `hinkley-hills/idea/lot-holder.yaml`;
  programme rows: `dorm-programme`, `unit-programme`, `house-programme`;
  one `PlatBook` row (`hinkley-hills/idea/plat-book.yaml`). **All four
  institution + plat-book rows author `data.parentExtent`** (the only rows
  in the content tree that do). `Template.findWhereDataHas(field)`
  (`lib/stuff/Template.ts:197`) queries `templates` by `data.<field>
  $exists`; `findByClass(classPath)` is exact-match.
- `admitFor`'s comment: *every institution boots as a producer* (pack
  `boot:` lists in eternal-university / terminus / hinkley-hills).
- Catalogue precedents: `content/transport/src/idea/LaneCatalogue.ts`
  (singleton `Idea`, `canEvict`/`canDestruct` vetoes, async self-loading
  `index()`, `invalidateCache()` on HMR, row `content/system/transport/idea/
  LaneCatalogue.yaml` = `class:` + `data: {}`, **no `boot:` entry**;
  reached by `StuffApi.singleton(PATH)` from callers, kernel-side by path +
  duck shape — the `TravelNode` precedent). `content/water/src/idea/
  WatercourseCatalogue.ts:570 worldScan` is the **allowlisted
  `getAllObjects()` shape scan** (`typeof w.withdrawalM3S === 'function'`)
  whose header says "a capability pack cannot ship a mixin (no `lib/`)" —
  **that ban was lifted** (CLAUDE.md § a capability pack has a `lib/` of
  its own). `Conduit` (`water/src/thing/Conduit.ts:96`) is
  `DetailedMixin(SwitchableMixin(Thing))`; the three conduit rows are in
  terminus wharfside.
- The residence pack (`packages/content/residence`, root
  `/system/residence`, title claim `/system/residence`) has `src/idea/`
  {BuildingWarren, FrontDoorExit, HoldingWarren, KeyedDoorExit,
  LotGateExit, PlatBook, PlatWarren, UpstairsExit, cmd}, `src/thing/`, no
  `src/behavior/`, **no catalogue**. Pack brains precedent:
  `content/trade-haulage/src/behavior/hauls.ts` named by rows as
  `brain: /trade/haulage/behavior/hauls`. The `maintains` brain is named by
  `eternal-university/…/agent/katie.yaml:80` and
  `terminus/…/mayfield-row/agent/walter.yaml:42` as
  `/lib/behavior/maintains`; its test is
  `lib/behavior/__tests__/maintains.test.ts`.

### Call security

- `lib/security/SecurityPolicies.ts` — `resolveTemplatePath(caller)`
  (`:97`, reads `getTemplatePath()`; null for a non-Stuff), `FromTemplate`
  (`:141`, `PathPatternApi.matches`), `resolveModuleId` (`:118`),
  `SecurityPolicies` table at `:521`. Policies are `{ name, allows(caller,
  target, method, args?) }`, sync or async.
- ⭐ **Where the policy runs relative to the frame push — verified, and it
  corrects the slate's `frames[n-2]` framing.** Static Api wrapper
  (`api/security.ts:525–552 #wrapStaticDescriptor`): `caller =
  ExecutionContextApi.getCurrentTarget()` → `policy.allows(...)` →
  **then** `#pushFrame()`. Instance gate (`#securityGate :1219` →
  `#proceed :1370`): same order — the callee's frame is pushed in step 4
  *after* the policy passed. So **at policy time the top frame IS the
  caller's own frame**: `getCallStack()[n-1].target === caller` (by
  construction — `caller` was read from that frame) and
  `[n-1].method` is the function the caller is currently executing. The
  slate's "frame one below the top" describes the same frame as seen from
  inside the callee. `CallFrame = { caller, target, method, timestamp,
  kind?, metadata? }` (`api/execution-context.ts:92`); `runRoot` plants
  `kind: FrameKind.Root` frames (`:855`); scheduled callbacks run under
  `runRootGuarded` (`api/schedule.ts:148`).
- Consequence: **a free function inherits the frame of the nearest
  dispatched method** above it; a brain's `act()` inherits the NPC's
  behaviour-tick frame; a timer callback that calls a free function
  directly sits on a Root frame. Only a method dispatched through the
  proxy (any `this.x()` inside a singleton counts — `this` is the proxy)
  has its own `(target, method)` frame.
- § the intra-singleton self-call gotcha (call-security.md:584): a gated
  `this.x()` inside a singleton is denied by `FromModule(own Api)`; the
  sanctioned shapes are a module-private free function, or
  `AnyOf(FromModule(own Api), SelfOnly)`. Re-entering **through one's own
  Api static** from a free function is legal (the static frame's target
  is the Api class, which `FromModule(own Api)` admits).
- Narrow-entry precedent for a gated **static** Api method:
  `StuffApi.forceDestruct` (`api/stuff.ts:948`,
  `@CallSecurity(FromModule('/platform/idea/cmd/author/DestructController'))`).
- `scripts/check-gate-strings.ts:45` `POLICY_CALL =
  /\b(?:FromModule|FromController)\(\s*['"]([^'"]+)['"]/g` — a
  `FromTemplateMethod` string is **invisible to `lint:gates` today**.
- Policy tests live in `lib/security/__tests__/` (`FromModule.test.ts`,
  `FromClassFromMixin.test.ts`, `SecurityPolicies.test.ts`).

### The office and the binder

- `api/compact.ts:117 holdsOffice(subject, officeKey): Promise<boolean>` —
  async, derived per check. `AccessRegistry.isWizard/isArchwizard` fall
  back to `holdsPrimeMinister` (`AccessRegistry.ts:256, :289`) — the
  wizard axis takes no new consumers.
- `platform/idea/api/CommandLogic.ts:1054 resolveModel` is `public async`,
  gated `CommandApiCallers`; six `MqlApi.resolveMany/resolveOne(raw,
  {commandGiver: giver, scope})` calls in two scope loops (`:1131, :1175,
  :1188, :1287, :1323, :1336`), each inside a `try` that turns a throw
  into `context.note({kind:'mql-error', field, stage:'resolve', detail})`
  + `{result:'failed'}`. The YAML `scope:` list is expanded through
  `ShellApi.expandVariables` (`$focus`). No shipped view declares
  `scope: world`; 154 of 529 views take a query-typed arg.
- `CommandContext.note(n: Note)` / `setStatus` (`api/command.ts:155`);
  `autoEscalationFor` table in `api/command.ts`; framework-note prose in
  `lib/command/CommandGiver.ts` (`proseForFrameworkNote`). The client
  renders no per-kind prose for `mql-error` (grep: none) — the text a
  player reads is the server's.
- `governance.md § ⚠ Open: office assign cannot find an online player` —
  the only handoff verb (`office assign`, arg `scope: "online"`) is
  reported broken; the e2e helpers run as the founder as an INTERIM.

### Response envelope + types

- `packages/types/src/index.ts:802` — the `Note` union (26 members); no
  cost/warning shape. `MqlErrorNote { kind:'mql-error'; field; stage;
  detail }` at `:539` is the closest sibling. `@saxonberg/types` `main`
  is `./src/index.ts` — **no build step** between a type edit and the
  server seeing it. Wire frames: `'mql-subscribe'` (`:1036`),
  `'mql-query'` (`:1347`), `'mql-subscription-error'` (`:1710`).

### Lints

- 30 `lint:*` scripts in `packages/server/package.json` (`:35–65`);
  `lint:family` derives the roster. `lint:pm` = **PersistenceManager**.
- `scripts/check-world-scan.ts` — regex `\bStuffApi\.getAllObjects\s*\(`,
  ALLOWLIST of 4 files, walks kernel + every pack `src/` via
  `scripts/pack-roots.ts`. ⚠ Its header prescribes `world:[mixin.X]` as
  the fix. `scripts/check-pm-access.ts` — the "forbid a mechanism outside
  sanctioned files" shape (`ALLOW_PREFIX` + `ALLOW_EXACT`, tests exempt).
- `scripts/check-drive-scripts.ts` — ratchet at 0; a drive is born a wire
  file.

### The wire harness

- `packages/wire/src/harness/session.ts` — `Session.open(handle, {
  startLocation?, wizard? })`; a fixed handle reopens the same character
  (`Session.open('founder')` is used by `platform-smoke.wire.test.ts:48`
  — the founder holds the PM seat by founder default); `cmd(text) →
  { status, notes, said(), … }`; `query(mql, {cardinality, fields})`
  sends an `'mql-query'` frame; `queryOne`. There is **no subscribe
  helper** — a standing-query step sends a raw `'mql-subscribe'` frame
  and awaits `'mql-subscription-error'`. `assertions.ts`: `expectOk`,
  `expectRefused`, `expectNote(result, kind, {reason?})`, `expectNoNote`,
  `detailOf`. `declareFile({ file, packs })`. Scripts: `pnpm -C
  packages/wire wire` / `wire:clean` / `wire:dirty`.

### D4 census (this cycle's; scripts in the planning scratchpad)

245 collection-returning public methods; 83 unkeyed; **six** defects:
`StuffApi.getAllObjects` · `ParcelApi.allRecords` (read by
`AccessRegistry.heldExtents:227` — every parcel row per access check —
and `water/WaterRightRegistry.riparianRightsOn:278`) ·
`ParcelApi.groupOwnerRefs` (**no callers**) · `WikiRegistry.allPages`
(`WikiController.executeList:729` filters by namespace; four internal
report reads `backlinks/wanted/orphans/dangling`) · `LaneCatalogue.allLanes`
(only caller `lanesAt:154` filters by node) · `HerdRegistry.all`
(`ranching/DraftController.ts:55` → `pickHerd` finds by id/name).
Caller-side defect on a fine surface: `PlayerApi.getAllAvatars()` —
`StreamLogic.ts:383` `.find` by name/presentation, `:647` `.find` by
user id, `PresenceLogic.ts:92` `.filter` connected, `MqlGroupProvider.ts:38`
`[0]` as an arbitrary viewer. **False positives of a signature-only
reading**: `BankingApi.accountsOf()` and `ContractApi.activeClaims()` —
keyed via execution context. `ParcelRegistry` already warms a `PathTrie`
of every record at `postRegister` (`rebuildIndex :719`) and maintains it
at `:564, :592–594, :724`; `ParcelOwner` kinds are `group | player |
organization` (`ParcelRecord.ts:58`); parcels carry `reach`
(`ParcelRecord.ts:230`). `wiki` collection has a `{namespace, slug}`
index (`schema/wiki.yaml:30`). `HerdRegistry` is a document-tree
registry (`DocumentApi.list(HERD_PREFIX)`) with `read(herdId)`.

---

## Plan-level decisions

Slate **D1–D5** stand as written. The following close the engineering
forks.

### D6 — the mixin index lives in `StuffApi.#indexes.byMixin`; the read is gated to the resolver

- `stuff.ts`: `#indexes.byMixin: Map<string, Set<Stuff>>` keyed by the
  **lowercased** `_mixinName`, maintained inside `#updateIndexes` (add:
  one `Set.add` per composed mixin; remove: one `Set.delete` per mixin)
  from `MixinApi.lowercasedMixinNames(obj.constructor)`. Invalidation by
  construction; no separate lifecycle.
- New static `StuffApi.findByMixin(name: string): Stuff[]` — the bucket
  with the same raw-target liveness filter + lazy `#updateIndexes(obj,
  'remove')` as `getAllObjects`. **Gated**
  `@CallSecurity(FromTemplate('/platform/idea/api/mql'))`: only code running
  inside an `MqlLogic` method frame (i.e. the resolver) may read it. A
  public ungated `findByMixin` would be a second door beside the one this
  build closes.
- `api/mixin.ts`: memoize `queryMixins` on a `WeakMap<AnyConstructor,
  readonly MixinClass[]>`; add `lowercasedMixinNames(ctor): ReadonlySet<
  string>` (its own `WeakMap`); `#hasMixinOnConstructor` reads the memo.
  HMR makes a reloaded class a fresh key — nothing to invalidate.
- **Composed-only semantics are asserted by a test** (slate open Q1,
  recommended answer taken): a shadow-granted / augment-conferred mixin
  does not put an object in the bucket, and `world:[mixin.X]` through the
  gated entry does not return it. `mql.md` names the semantics.
- ⛔ No `byClassName`, no other bucket. The test for any future registry
  index stays: *does it describe every object, or one feature?*

### D7 — two narrow gated entries on `MqlApi`; the seed refuses everywhere else

- `MqlApi.resolveWorldIndexed(query, ctx): MqlMany` — the **code arm**.
  `@CallSecurity(RegistryWideReaders)` where `RegistryWideReaders =
  AnyOf(...FromTemplateMethod pairs)` is declared **in `api/mql.ts` beside
  the method** so widening the set is a visible diff. Gate B is absolute
  here: the query must be `world` at chain head immediately followed by a
  `[mixin.X]` bracket filter (further ops allowed after it); anything else
  throws `MqlPermissionError(…, 'world')`.
- `MqlApi.resolveWorldForSeat(query, ctx): MqlMany & { scan: RegistryScan }`
  — the **seat arm**. `@CallSecurity(FromTemplateMethod('/platform/idea/api/
  command', 'resolveModel'))` — exactly one admitted function, the binder.
  Any `world` shape resolves; the return carries `scan = { scanned,
  indexed, shape }`. ⭐ "Permitted-with-warning" is therefore a **method
  identity bound to a policy**, never a caller-supplied flag.
- Both forward to `MqlLogic.resolveWorldIndexed / resolveWorldForSeat`
  (gated `MqlApiCallers` like every other method) which call
  `resolveWithQuantity(query, ctx, mode)` with a third, **pipeline-internal**
  argument `mode: 'indexed' | 'seat'`. `MqlApi.resolveOne/resolveMany`
  never pass it. `MqlContext` is untouched.
- `RegistryScan` is exported from `api/mql/types.ts` and re-exported by
  `api/mql.ts`.
- **Subscriptions need no code**: `MqlSubscriptionRegistry` resolves through
  `MqlApi.resolveOne/Many`, so `world:` on a subscription (or an
  `mql-query`) is refused for everyone — PM included — and already
  classifies as `'permission'`. A test pins it.

### D8 — `FromTemplateMethod` reads the TOP frame, fails closed on five conditions

`lib/security/SecurityPolicies.ts`, exported on the `SecurityPolicies`
table:

```ts
FromTemplateMethod(templateGlob: string, methodName: string,
                   opts?: { module?: string }): SecurityPolicy
```

`allows(caller)`:

1. `resolveTemplatePath(caller)` null → **deny** (not a cloned Stuff).
2. `!PathPatternApi.matches(path, templateGlob)` → deny.
3. `stack = ExecutionContextApi.getCallStack()`; `top = stack[n-1]`;
   `!top || top.target !== caller` → deny (attribution mismatch — cannot
   happen through the two dispatch sites, kept as the documented guard).
4. `top.kind === FrameKind.Root` → deny (a root frame's `method` is a
   synthetic label, never a dispatched function).
5. `top.method !== methodName` → deny.
6. `opts.module` given and `!PathPatternApi.matches(resolveModuleId(caller),
   opts.module)` → deny. The module term is a **disambiguator only**.

The template term accepts a glob (like `FromTemplate`) because a base-class
method lives on many templates (`resolveScreen` on every controller); the
narrowest honest term is then a glob over the templates that inherit it.
⚠ Consequence recorded as doctrine: **an un-dispatched caller inherits the
nearest dispatched frame** — a free function called from a permitted method
is admitted (that is how `flowSplitsForImpl` qualifies), and a brain's
`act()` is attributed to the NPC's tick and can never qualify (nothing lists
an NPC template). This is the correction the call-security-pass slate needs
and the plan's answer to open engineering question 7: **`maintains` can
never hold this gate, and does not need to — it reads the residence
catalogue (D13).**

### D9 — the refusal is the resolver's; the index path is the chain resolver's

- `api/mql/resolver.ts`: a module-private run slot `let registryMode:
  'indexed' | 'seat' | null` + `let scan: RegistryScan | null`, set by
  `resolveWithQuantity` for the duration of one synchronous run
  (save/restore in `try/finally`, so a nested `MqlApi.resolveMany` from
  inside a predicate runs with mode `null`). Module scope *declares* the
  `let`; the assignment happens at call time — conformant.
- Every `world` site (`resolveKeywordSeed :323`, `candidatesForScope :633`,
  the mid-chain intersect via `NAMED_SEED_KEYWORDS :693`) throws
  `MqlPermissionError` when `registryMode === null`, with the AC2 message:
  *"'world' is not available here — anchor the query (reachable, here,
  person, inventory, online) or use a /path glob."*
- `resolveChain`: when `head` is `world` and `rest[0]` is a `bracket-filter`
  on `mixin.<key>`, seed from `StuffApi.findByMixin(key)` and record
  `scan = { scanned: bucket.length, indexed: true, shape: 'world:[mixin.
  <key>]' }`; the filter op still applies (idempotent). Otherwise: mode
  `'indexed'` → throw `MqlPermissionError` naming the index-answerable
  shape; mode `'seat'` → `getAllObjects()` with `scan = { scanned: n,
  indexed: false, shape }`. The scope-keyword path (`scope: 'world'`) is
  never index-answerable: `'indexed'` throws, `'seat'` scans + records.
- `resolveWithQuantity` returns `{ matches, quantity, scan? }`.

### D10 — the seat arm lives in the binder, catch-and-retry

`CommandLogic.resolveModel`: the six resolve calls collapse onto one
module-private helper `resolveScoped(raw, giver, scope, cardinality,
context)` that calls `MqlApi.resolveMany/resolveOne`, catches
`MqlPermissionError` with `operator === 'world'`, and — if
`await CompactApi.holdsOffice(giver, 'prime-minister')` (checked at most
once per `resolveModel` call, memoized in a local) — retries through
`MqlApi.resolveWorldForSeat(raw, { commandGiver: giver, scope })` and emits
`context.note({ kind: 'registry-scan', field, scanned, indexed, shape })`.
A non-holder gets the existing `mql-error` note (the refusal text is the
error's message) and `{ result: 'failed' }`. The helper is a free function
called from `resolveModel`, so the seat entry sees the `resolveModel` frame.
⛔ No flag on `MqlContext`; ⛔ no `isWizard`/`isArchwizard`.

### D11 — the note

`packages/types/src/index.ts`:

```ts
export interface RegistryScanNote {
  kind: 'registry-scan';
  field: string;      // the YAML field the query bound
  scanned: number;    // objects read
  indexed: boolean;   // false ⇒ the whole registry was walked
  shape: string;      // the leading fragment, e.g. "world:[class.door]"
}
```

Appended to the `Note` union (append-only, per-kind-frozen). No entry in
`autoEscalationFor` — the status stays whatever the command earns. Prose
in `proseForFrameworkNote` (`lib/command/CommandGiver.ts`): *"Registry
read: <scanned> objects for `<field>` (<indexed ? 'indexed' : 'unindexed
shape ' + shape>)."* `response-envelope.md` gains the row. Run the client
typecheck after the union change.

### D12 — Employment: the business's live roster is a per-organization memo owned by the employment logic, filled once from the index and maintained at every employment write

- `EmploymentLogic` keeps `employeesByOrganization: Map<orgPath, Set<
  identityPath>>` (runtime; lost on logic reload; **memo, never warmed**).
- `EmploymentLogic.employeesOf(organization): readonly string[]` (public,
  `EmploymentApiCallers`) — on a miss, fills the org's set with one
  `MqlApi.resolveWorldIndexed('world:[mixin.EmployedMixin]', …)` filtered
  by `getEmployment(orgPath)`; the pair `('/platform/idea/api/employment',
  'employeesOf')` admits it. `EmploymentApi.employeesOf` forwards;
  `Organization.employees()` forwards to the Api (verbs on objects).
- Maintenance: `EmployedMixin.employments` becomes an accessor pair over a
  backing `_employments` field (the Hydrator's Phase-1/Phase-2 dispatch and
  the persistence spine both land on the setter), and the setter calls
  `employmentLogic().noteEmployments(this)` — a new logic method gated
  `FromMixin('EmployedMixin', { where: caller is args[0] })` — which adds
  the actor's identity path to every org set that is **already present** in
  the memo (an absent set will be filled from the index on first read).
  `_upsertEmployment`/`_removeEmployment` write through the setter.
- Readers: `holdersByPositionImpl` and `flowSplitsForImpl` iterate
  `EmploymentApi.employeesOf(org)` (re-entering through the own Api from
  a free function, the sanctioned shape), resolve each key with
  `StuffApi.findByTemplatePath(key)` (identity-keyed trie, O(1)) and skip
  non-live actors — **exactly today's population** (today's scan sees live
  actors only). The `exited`/authored-roster union logic is unchanged.
- `findBusiness(pred)` is replaced by two keyed memos in the logic —
  `businessByLocation: Map<path, BusinessStuff>` and `businessByProprietor`
  — built from `allBusinesses()` (index-answerable, selective; pair
  `('/platform/idea/api/employment', 'allBusinesses')`) and rebuilt once on
  a miss (today's rebuild-and-retry, kept). `businessAt` /
  `businessOfProprietor` read the maps.
- `RecordControllerBase.findBody` moves to `EmploymentLogic.findOrganization(
  needle): Stuff | null` (+ `EmploymentApi.findOrganization`), taking
  `needleOf`/`namesItself`/`labelOf` with it; pair `('/platform/idea/api/
  employment', 'findOrganization')`. The controller calls the Api.

### D13 — the residence catalogue derives its roster from the rows that declare `parentExtent`; the `maintains` brain moves into the residence pack

- `content/residence/src/idea/ResidenceCatalogue.ts`, path
  `/system/residence/idea/ResidenceCatalogue`, row
  `content/residence/content/system/residence/idea/ResidenceCatalogue.yaml`
  (`class:` + `data: {}`, no `hydratorClass`, no `boot:` — lazily stood up
  by `StuffApi.singleton`, the LaneCatalogue shape with `canEvict` /
  `canDestruct` vetoes and `invalidateCache()`).
- **Population, rung 3 (memo, never warm):** the memo is a list of ROW
  PATHS from `Template.findWhereDataHas('parentExtent')` (four rows today;
  the only rows in the tree that author it), kept as a `PathTrie<string>`
  keyed by `parentExtent` plus a flat list. Every read resolves paths to
  live instances with `StuffApi.findByTemplatePath(path)` (O(1)) and
  partitions by `instanceof OuterWarren` (kernel import) /
  `instanceof PlatBook`. ⭐ Why rows-by-shape and not rows-by-class:
  institution classes span packs (`DormWarren` is eternal-university's,
  directly over the kernel `OuterWarren`), so `Template.findByClass` over
  the residence pack's own classes would miss it, and a push at
  `postRegister` cannot be inherited from a base the pack does not own.
  Live-only resolution preserves today's answers exactly (the `world`
  scan saw live instances only). A read that finds no institution
  covering its key rebuilds the memo once and retries (the
  `findBusiness` shape) so a row authored at runtime is found.
- Reads (all async, self-loading): `institutions()`, `institutionCovering(
  key)` (longest `parentExtent` prefix: `key === parent ||
  key.startsWith(parent + '/')`), `holdingsUnder(extent)` (every covering
  institution's `holdings()` whose `holdingKey()` equals or is under
  `extent`), `platBooks()`.
- Kernel change: `OuterWarren.holdings(): MemberStuff[]` — the live,
  non-destroyed values of `_holdingsByKey`. `OuterWarren.admitFor(key)`
  keeps its signature and callers (`PersistableLogic:216`) and is
  re-implemented over `institutionCovering(key)` reached **by path + duck
  shape** (`ResidenceCatalogueView` beside the existing `HoldingView` /
  `WarrenMemberView` shapes in `OuterWarren.ts`) — the `TravelNode`
  precedent: the kernel meets a pack over a path-addressed singleton and a
  shape, never an import. `TitleController.books()` does the same with
  `platBooks()` (its `PlatBookShape` duck type stays). `Realtor.offers()`
  imports the catalogue (terminus already depends on content-residence).
- **The brain moves:** `content/residence/src/behavior/maintains.ts`
  (`/system/residence/behavior/maintains`), its test to
  `content/residence/src/behavior/__tests__/`, and the two rows
  (`katie.yaml:80`, `walter.yaml:42`) repointed. `holdingsUnder(extent)`
  becomes `await catalogue.holdingsUnder(extent)` on an imported
  `ResidenceCatalogue`. The kernel file is deleted. Reason: the brain is
  residence-specific (holdings, the householder's kit) and moving it
  removes the kernel→pack string dependency entirely instead of trading
  `class.HoldingWarren` for a catalogue path string (the farms-brain
  precedent).

### D14 — Slottable carries the occupancy back-reference; `Slotted.occupy/vacate` maintain it under a participant contract

- `SlottableMixin` gains `_occupancy: Map<Stuff & Slotted, Set<string>>`
  (runtime only). Two sealed mutators, `_noteOccupied(host, slot)` and
  `_noteReleased(host, slot)`, gated `FromMixin('SlottedMixin', { where:
  (caller, _t, _m, args) => caller.stuffId === args[0].stuffId })` — the
  host writing its own relationship, the Party exemplar.
- `Slotted.occupy` calls `candidate._noteOccupied(this, slot)` right after
  the set insert and before the witnesses; `vacate` calls `_noteReleased`
  right after the delete. `occupyAll` / `vacateAll` / `transferOccupancy`
  already route through these two.
- `occupiedSlots()` returns a copy of `_occupancy`; the `world` query and
  the "promote to an inverse index" note go. `Metabolic.currentRestQuality`'s
  short-circuit stays (still correct, now merely cheap).
- Lifetime: declare `_occupancy` in `fieldMeta` as `{ ref: 'instance',
  lifetime: 'symmetric', inverse: 'slots' }` with `Slotted.slots` declared
  as the inverse, **if** the merged-metadata validator accepts the cross-
  class pair (ref-shapes.md § Declaring it); otherwise leave both
  undeclared with a comment citing the two existing `cleanupOnDestruct`
  walks (`Slottable.ts:103`, `Slotted.ts:713`) that already clear both
  sides through `vacate`. Record which in this plan.

### D15 — every remaining registry-wide read is ONE named method on its owner, and the pair list names those methods

The `RegistryWideReaders` policy in `api/mql.ts`:

| pair (template, method) | what it reads | how the frame is reached |
|---|---|---|
| `/platform/idea/api/persistable`, `captureAtShutdown` | `[mixin.PersistableMixin]`, once at shutdown | new `PersistableLogic.captureAtShutdown(): Promise<number>`; `AppBootstrap.shutdown` calls `PersistableApi.captureAtShutdown()` (the loop at `AppBootstrap.ts:333–360` moves in) |
| `/platform/idea/api/attendant`, `allPoints` | `[mixin.AttendantMixin]` | already a method reached by `this.` from the sweep + disconnect |
| `/platform/idea/api/banking`, `branchOf` | `[mixin.BankMixin]` | new method + module memo `Map<bank, Stuff & Bank>`; the free fn `findBranchOf` returns the memo hit or re-enters `BankingApi.branchOf(bank)` on a miss |
| `/platform/idea/api/employment`, `allBusinesses` · `employeesOf` · `findOrganization` | D12 | |
| `/platform/idea/api/press`, `holdsAnyPublishingPosition` | `[mixin.PublisherMixin]` | the free fn is called from the method; any other caller of the free fn re-enters via `PressApi` |
| `/platform/idea/api/residency`, `takeCensus` · `spawnNow` | `[mixin.CirculatingMixin]` via `Census.takeCensus` | ⚠ `installSpawnSweep`'s clock callback (`:745`) currently calls the free fn `runSpawnSweep()` directly — a Root frame — and must call `ResidencyApi.spawnNow()` instead, or the sweep is silently denied |
| `/platform/idea/api/magic`, `decoyNameFor` | `[mixin.IdentifiableMixin]` | new method `decoyNameFor(signature): string`; `execMisidentify` calls `MagicApi.decoyNameFor` |
| `/platform/idea/cmd/**`, `resolveScreen` | `[mixin.DisplayMixin]` | glob: a base-class method inherited by platform controllers; a pack controller needing it widens the glob visibly |
| `/system/*/idea/*Catalogue`, `worldScan` | a system pack catalogue's one index read (today: water, D16) | the one **convention-shaped** pair: any system pack's catalogue may read the index from a method named `worldScan`, so a new pack needs no kernel edit; Gate B bounds it to index-answerable shapes |

Every LOGIC_PATH string is verified against its `api/<feature>.ts`
constant at build time (`lint:gates`, D18).

### D16 — `LocomotionLogic.allModes` is a path glob; the water catalogue's shape scan becomes two pack mixins and an indexed read

- `allModes()` → `StuffApi.findByPathGlob('/platform/idea/LocomotionMode/*')`
  filtered `instanceof LocomotionMode` (rung 1; identical population).
- Water: `content/water/src/lib/Withdrawing.ts` (`WithdrawingMixin`) and
  `content/water/src/lib/Discharging.ts` (`DischargingMixin`) declare the
  `withdrawalM3S(natural) / getReachRef()` and `dischargeLoad() /
  getDischargeReach()` surfaces the shape scan duck-types today; `Conduit`
  (and any other withdrawer/discharger the build finds by grepping for
  those method names) composes them. `WatercourseCatalogue.worldScan`
  reads `MqlApi.resolveWorldIndexed('world:[mixin.WithdrawingMixin]')` and
  `…DischargingMixin` — still per call, never memoised (the file's own
  reasoning stands). The `getAllObjects` allowlist drops to three homes.
  ⚠ Water pack files import the kernel by package specifier only.

### D17 — D4 named questions, and the whole-table gate is consumer-side

- `ParcelRegistry`: `byOwner: Map<ownerKey, Set<ParcelRecord>>` and
  `byReach: Map<reach, Set<ParcelRecord>>` maintained beside `coverage` in
  `rebuildIndex` and at every `coverage.insert/remove` site; `ownerKey` =
  `player:<templatePath>` / `organization:<templatePath>` /
  `group:<ref ?? name>`. New `ParcelApi.extentsHeldBy(subject, admits:
  (owner: ParcelOwner) => Promise<boolean>): Promise<string[]>` — walks the
  **distinct owners** once each (bounded by holders, not parcels) and
  unions their extents; `AccessRegistry.heldExtents` passes its existing
  `subjectIsOwnerMember` as the predicate. New `ParcelApi.parcelsOnReach(
  reachRef)` for `WaterRightRegistry`. **Delete** `allRecords` and
  `groupOwnerRefs` (Api + Logic + Registry).
- `WikiRegistry.allPages` → private `pages(includeDeleted)` (the four
  reports keep it as their honest whole-corpus input); public
  `pagesIn(namespace)` over a new `WikiPage.findByNamespace(ns)` (the
  `{namespace, slug}` index); `WikiController.executeList` uses it.
- `HerdRegistry.all` → private; public `named(name)` and `isEmpty()`;
  `DraftController` uses `read(id)` / `named(name)` / `isEmpty()`.
- `LaneCatalogue`: `CompiledIndex.byNode: Map<path, CompiledLane[]>` filled
  in the compile; `lanesAt(path)` reads it; `allLanes` deleted unless a
  wholesale consumer exists (grep the pack's tests).
- `PlayerLogic`/`PlayerApi`: `findAvatarByName(name)` (name or
  presentation, today's contract, walked inside the owner),
  `findAvatarByUserId(userId)` (a `Map` maintained in
  `registerAvatar/unregisterAvatar`), `connectedAvatars()`. `StreamLogic`
  ×2, `PresenceLogic.onlineImpl` switch. `MqlGroupProvider.members` passes
  `commandGiver: null` (the `online` seed resolves in system mode) and
  returns `[]` on a resolver error — recorded as a judgment call: the
  arbitrary-viewer behaviour it replaces was never a contract.
- `scripts/check-whole-table.ts` (`lint:whole-table`): forbids the
  **consumer** shape — a whole-collection read narrowed at the call site:
  `/\.(all[A-Z]\w*|getAll\w*|all)\(\)\s*\)?\s*(\.stuff)?\s*\.(find|filter|
  some|every|flatMap)\(/` and the same followed by `[0]` — across kernel +
  every pack `src/` (tests exempt), **zero findings**, with a
  `EXEMPT: Array<{ file, reason }>` that ships empty. Not a count. The
  definition-side judgment (does it grow with the world; is it keyed via
  context) stays a review call, per the requirements.

### D18 — the two gates and `lint:gates`

- `check-world-scan.ts` gains a second pattern, `/["']world:\[/` and
  `/scope:\s*["']world["']/`, with its own ALLOWLIST: `api/mql.ts`,
  `api/mql/resolver.ts`, and the D15 owner files (AttendantLogic,
  BankingLogic, EmploymentLogic, PressLogic, `lib/residency/Census.ts`,
  MagicLogic, PersistableLogic, `lib/command/CommandController.ts`,
  `water/src/idea/WatercourseCatalogue.ts`). Header rewritten: the
  sanctioned fix is the owner's question or, for an index-answerable
  global population, `MqlApi.resolveWorldIndexed` from a named method in
  the pair list. The `getAllObjects` allowlist drops the water entry.
- `check-gate-strings.ts`: `POLICY_CALL` learns `FromTemplateMethod\(\s*
  ['"](tpl)['"]\s*,\s*['"](method)['"]`; for a non-glob template under
  `/platform/idea/api/<feature>` it resolves the class file by the Logic
  convention (`platform/idea/api/<Feature>Logic.ts`) and asserts
  `public (async )?<method>\(` exists; globs skip as today. A mistyped
  pair fails closed silently at runtime — this is what makes it visible.
- Name nothing `lint:pm`.

### D19 — the doc inversion lands in W6 with the refusal

`docs/antipatterns.md § Bespoke Object-Search Algorithms` is rewritten
around the slate's Part 5 rule (*you may not be handed the world; you may
ask it a question*): BAD = a `getAllObjects()` loop, **a `world:` query
from anywhere**, `allX().find(...)`; INSTEAD = the owner's keyed question,
or — for a selective global population you genuinely want all of — an
index-answerable `world:[mixin.X]` through `MqlApi.resolveWorldIndexed`
from a method named in the pair list. A sibling § *An Api may not hand
back its table* records D4's three tests and the keyed-without-a-key
caveat. `docs/mql-grammar.md` drops `world` from the seed table and the
fixed-pool list, rewrites the two `world:[class.DormWarren]:members` /
`world:[mixin.PersistableMixin][address=…]` examples over a `/path` seed,
drops "Doors anywhere in the world", and adds one line: the Prime Minister
may type `world:` and is told what it cost.

### D20 — the drive is `packages/wire/tests/world-scan.dirty.wire.test.ts`

`.dirty.` because the seat-handoff step mutates the PM office (restored in
`afterAll`, but not something the world regenerates). Contents in § Test &
gate strategy.

---

### D21 — a per-reader cost table behind the one gated entry, read out at `/stats`

⭐ **The requirement this closes** (user, at the plan checkpoint): *"I
would want them to be individually optimizable at a time of our choosing,
when we get enough players to merit more of these indexes."* D15 gives the
**seam** — every comprehensive read is one named method, so any one can
gain an index later without a caller moving. It does not give the
**signal**: `resolveWorldIndexed` returns a plain `MqlMany`, so the nine
engine readers emit nothing, and "when to index" would be answered by a
profiler after a complaint — which is exactly how the metabolism defect
was found.

⚠ **Growth is not uniform across the nine, which is why a per-reader
table and not one global counter.** Five are bounded by **authored**
content (attendant · bank · publisher · display · the water catalogue) —
they grow when we ship, not when people play. Three grow with **player
activity**: `CirculatingMixin` (items in circulation), `IdentifiableMixin`
(the decoy pool), and `PersistableMixin` (everything, but once and cold at
shutdown). `EmployedMixin` was the fourth; W1 retires it to roster reads.
**Those first two are the ones to watch**, and a table is what lets that
claim be checked rather than believed.

**The design.** The gate already resolves the caller's
`(templatePath, method)` pair to decide admission, so the identity is in
hand at zero extra cost. `MqlLogic` records into a field:

```ts
// platform/idea/api/MqlLogic.ts — instance state on the singleton
private registryReads = new Map<string, RegistryReadStat>();
// RegistryReadStat = { calls, returned, maxReturned, lastAt }
```

incremented in `resolveWorldIndexed` (key = `"<template>#<method>"`) and in
`resolveWorldForSeat` (key = `"seat"`, so a person's costly queries are
visible in the same table rather than only in their own response).

**The read-out** is one new Api static forwarding to the logic —
`MqlApi.registryReadStats(): readonly RegistryReadStat[]` (`RegistryReadStat`
exported from `api/mql/types.ts`, re-exported by `api/mql.ts`) — surfaced
on the existing dev endpoint in `services/Server.ts:171`, beside
`objects` and `uptime`:

```ts
res.json({ connections, objects, uptime, registryReads: MqlApi.registryReadStats() });
```

⭐ **`/stats` is chosen because it needs no new authority question.** It
already reports the registry's size ungated; the read counts are the same
class of fact. ⚠ **Explicitly NOT a verb** — a verb would need a seat, and
inventing one for a diagnostic is how this build's Gate A went wrong four
times.

**Accepted limits, stated so nobody reports them as bugs:**

- The counters are **process-local and reset on restart**, and on an HMR
  reload of the logic singleton. They answer *"what is this server doing
  now"*, not *"what happened last month"*. ⚠ A durable series would be a
  new collection, which is forbidden — if it is ever wanted it is a slate
  line, not a widening here.
- They count **admitted** reads. A denied caller is a gate failure and
  belongs in the diagnostics store, not the cost table.
- `maxReturned` is the load-bearing column, not `calls`: an indexed read
  of a broad category is what the requirements name as the future risk,
  and category size is the thing the requirements say must be
  **re-measured, never assumed**.


## ⭐⭐ Host placement

| new thing | host | what composing/placing it claims | why not elsewhere |
|---|---|---|---|
| `byMixin` index | `StuffApi.#indexes` (kernel registry) | every registered Stuff is in one bucket per composed mixin — the type axis, describing the whole population | a bucket per class/feature is the rejected "bag of indices" |
| `queryMixins` memo, `lowercasedMixinNames` | `MixinApi` statics (`WeakMap` per constructor) | mixin composition is a pure function of the constructor | per-object memo would be wrong (augment/shadow) and wasteful |
| `FromTemplateMethod` | `lib/security/SecurityPolicies.ts` | a policy is a value object; sibling of `FromTemplate` | the only home for policies |
| `resolveWorldIndexed` / `resolveWorldForSeat` + `RegistryWideReaders` | `MqlApi` statics (+ `MqlLogic` methods) | the registry-wide read is MQL's; the narrow entry carries its policy at the definition site | a permission field on `MqlContext` is caller-supplied |
| registry mode + scan slot | `api/mql/resolver.ts` module-private `let`s | pipeline-internal state for one sync run | anything on `MqlContext` leaks to every caller |
| the seat check | `CommandLogic.resolveModel` (free helper in the same file) | the one place a player's raw MQL enters; async | the resolver is sync; `holdsOffice` is async |
| `RegistryScanNote` | `packages/types` `Note` union | wire surface; append-only | — |
| `employeesByOrganization` memo, `employeesOf`, `noteEmployments`, `businessByLocation/Proprietor`, `findOrganization` | `EmploymentLogic` (+ Api forwards; `Organization.employees()` verb) | the employment subsystem owns who works where; the memo is lost on reload and re-derived from the index | on `OrganizationMixin` it would survive reload but be wrong after an avatar restore until re-enrolled; the logic is the one place every write already funnels |
| `employments` accessor pair | `EmployedMixin` | every write path (hire, roster materialization, hydrate, spine restore) fires the setter | the Hydrator/spine land on the setter by name (CLAUDE.md § per-field invariants) |
| `_occupancy` + `_noteOccupied/_noteReleased` | `SlottableMixin` (every wearable, wieldable, mountable, sittable, plant, implant…) | **every Slottable already participates in occupancy**; the map is the inverse of a relationship every one of them can be in — no guard re-narrows the host set | on `Slotted` it is the existing forward map; on `Wearable`/`Posed` it would miss wielded/mounted/planted occupants |
| `ResidenceCatalogue` | residence pack `src/idea/` singleton `Idea` | the residence system's rows (institutions + plat books) are its; a pack ships no Api | requirements' placement; a kernel roster would re-import the smell |
| `OuterWarren.holdings()` | kernel `lib/location/OuterWarren.ts` | a read of the institution's own map | — |
| `ResidenceCatalogueView` duck shape | kernel `OuterWarren.ts` / `TitleController.ts` | the kernel meets the pack over path + shape | an import would be kernel→pack |
| `maintains` brain | residence pack `src/behavior/` | the beat is residence-specific | in the kernel it names pack objects by string |
| `WithdrawingMixin` / `DischargingMixin` | water pack `src/lib/` | a withdrawer/discharger declares it; composers today: `Conduit` (+ whatever the grep finds) | the ban on pack `lib/` is lifted; a kernel mixin would be substrate with a single-pack composer set |
| `byOwner` / `byReach` maps, `extentsHeldBy`, `parcelsOnReach` | `ParcelRegistry` (+ `ParcelApi`) | the registry already owns the coverage trie and every write | `AccessRegistry` would be a second table |
| `pagesIn`, `findByNamespace` | `WikiRegistry` / `WikiPage` | the wiki owns its corpus | — |
| `named`, `isEmpty` | `HerdRegistry` (ranching pack) | — | — |
| `byNode`, `lanesAt` | `LaneCatalogue` | — | — |
| `findAvatarByName/ByUserId`, `connectedAvatars` | `PlayerLogic` (+ `PlayerApi`) | the player registry owns the concurrency-bounded roster | — |
| `branchOf` + memo | `BankingLogic` | — | — |
| `decoyNameFor` | `MagicLogic` | — | — |
| `captureAtShutdown` | `PersistableLogic` (+ `PersistableApi`) | the Api orchestrates; a backend class has no frame | `AppBootstrap` cannot hold a template-keyed gate |
| `lint:whole-table`, extended `lint:world-scan`, `lint:gates` | `packages/server/scripts/` | — | — |

**The narrowing test, applied:** no new mixin is composed onto a base
class this build; `_occupancy` goes on the mixin whose every composer is
already a party to the relationship; the two water mixins go on the
classes that implement the surface today and nowhere else.

---

## Convention conformance (checked at plan time)

- **`props:` / `cast:`** — no row designations change; the two brain rows
  change only `behaviors[].brain`.
- **Locations, not rooms** — no new location classes.
- **Path pattern** — `/system/residence/idea/ResidenceCatalogue`,
  `/system/residence/behavior/maintains`, `/system/water/lib/Withdrawing`
  (no template row for a pack mixin; `lint:instanceable` is about template
  paths and is not fired).
- **Module scope declares; lifecycles initialize** — the resolver's run
  slots are `let` declarations assigned at call time; the `WeakMap` memos
  are `const` value construction; no new module-scope statements.
- **Import boundary (`lint:imports`)** — packs import the kernel by
  specifier only (`@saxonberg/server/mud/…`); the residence brain imports
  the catalogue relatively; nothing under `src/mud/` imports outside it.
  `MqlLogic` importing `api/mql/resolver` is already sanctioned.
- **Module categories** — no new category: one Idea (catalogue), two
  mixins in a pack `lib/`, one brain moved, Api statics + Logic methods,
  one policy factory in the decorator/policy home, two scripts. **No new
  exported free helper, no new `eslint-disable`.** `resolveScoped` in
  `CommandLogic.ts` is module-private.
- **Verbs on objects** — `Organization.employees()`, `OuterWarren.
  holdings()`, catalogue reads; no `XApi.verb(host, …)`; `lint:object-verbs`
  stays at zero.
- **Inter-Stuff contract** — readers use `getEmployment()`, `holdings()`,
  `holdingKey()`; the back-reference mutators are methods under a
  participant contract.
- **Api ↔ Logic split** — every new Api static forwards to a Logic method;
  the gated static entries follow `forceDestruct`.
- **No new Mongo collection; no migrations.**
- **Gates this build must pass**: `lint:family` (all 30 → 31 with
  `lint:whole-table`), in particular `lint:gates` (learns the new policy),
  `lint:world-scan` (two patterns), `lint:object-verbs`, `lint:imports`,
  `lint:module-scope`, `lint:instanceable` (the catalogue row), `lint:census`
  (the repointed brain rows), `lint:test-bootstrap`, `lint:drive-scripts`
  (0), `lint:test-content`.

---

## Waves

Order is the requirements' order: hot/repeated callers first (money →
per-tick brain → item back-reference), the index after them, the door
last. Every wave ends at a commit `build(world-scan W<n>): …`, passes
`pnpm test:near` + each touched pack's `vitest` + `pnpm -C packages/server
lint:family`, and is landable on its own (behaviour identical to master
until W6).

### W1 — the money paths read the owner (D12) — ✅ DONE

- `EmploymentLogic`: `employeesByOrganization` memo; `employeesOf`,
  `noteEmployments`, `findOrganization`; keyed memos replacing
  `findBusiness`; `holdersByPositionImpl` / `flowSplitsForImpl` iterate
  `EmploymentApi.employeesOf(org)`. ⚠ Until W6 the cold fill uses
  `MqlApi.resolveMany('world:[mixin.EmployedMixin]', …)` (still legal);
  W6 swaps the one call to `resolveWorldIndexed`.
- `EmployedMixin.employments` accessor pair; `_upsertEmployment` /
  `_removeEmployment` through the setter.
- `EmploymentApi.employeesOf`, `findOrganization`; `Organization.employees()`.
- `RecordControllerBase.findBody` → `EmploymentApi.findOrganization`.
- Tests: `lib/employment/__tests__` + `platform/idea/api/__tests__/
  Employment*` — a hire is visible in `employeesOf` immediately; a
  restored actor (set `employments` via the setter) is visible; a logic
  reload (fresh singleton) re-derives the same set; `flowSplitsFor` pays
  the same splits as before on the existing fixtures.
- Acceptance: wage settlement and `holdersOf` answer identically; no
  `world:` string remains in `EmploymentLogic` except the one cold-fill.
- Commit: `build(world-scan W1): wages and holders read the business roster, not the world`.

**Done.** Notes for whoever reads this next:

- ⚠ **The witness had to become a METHOD, not a call out of the setter.**
  `noteEmployments` is gated on *the actor writing its own relationship*
  (`FromMixin('EmployedMixin', where caller is args[0])`), and **an
  accessor is not a dispatched frame** — a bare
  `employedLogic().noteEmployments(this)` inside the `employments` setter
  is attributed to whoever did the assigning (a test, the Hydrator) and
  denied. The setter now calls `this._noteEmploymentChange()`, a real
  method, which gives the call the actor's own frame. Eleven tests failed
  on exactly this before the fix; it is the same "who is the caller of an
  un-dispatched function" fact D8 turns into a policy.
- ⭐ **The fill fills EVERY organization, not just the one asked for**,
  and flips a `rostersFilled` flag. A per-organization fill would rescan
  for each new organization, and an organization with genuinely nobody
  would rescan on every read (an empty set is indistinguishable from a
  miss). With the flag, absent-after-fill means empty.
- The fill is a module-private **free function** (`fillRosters`) called
  from `employeesOf`, not a private method: a private method still
  dispatches through the instance proxy and would push a frame of its own
  name, and W6 gates the registry read on the pair (template,
  `employeesOf`). `buysForImpl` likewise now takes the business list from
  its calling method so the read happens under the `allBusinesses` frame.
- `findBusiness(predicate)` is gone; `businessByLocation` /
  `businessByProprietor` are filled by the same enumeration and read by
  key, with today's rebuild-and-retry on a miss.
- `RecordControllerBase.findBody` moved to `EmploymentLogic.
  findOrganization`, and `labelOf` with it as `organizationLabel` (one
  definition, the controller forwards) — otherwise the label dispatch
  would have been copied into two kernel modules.

### W2 — the residence catalogue; the per-tick brain reads it (D13) — ✅ DONE

- `ResidenceCatalogue.ts` + row; `OuterWarren.holdings()`; `admitFor` over
  `institutionCovering` by path + shape; `TitleController.books()` and
  `Realtor.offers()` over `platBooks()`; brain moved to
  `content/residence/src/behavior/maintains.ts` with its test; `katie.yaml`
  / `walter.yaml` repointed; kernel `lib/behavior/maintains.ts` deleted.
- Tests: residence pack vitest — `institutionCovering` longest-prefix;
  `holdingsUnder` returns only live holdings under the extent; a cold
  catalogue (fresh instance) re-derives from rows; `platBooks()` live-only.
  Moved brain test passes unchanged in intent. `lint:census` on the two
  rows.
- Acceptance: `title list`, the realtor's offers, log-back-in-inside-a-
  holding and the property-minder beat behave as before; no
  `class.OuterWarren` / `class.HoldingWarren` / `class.PlatBook` string
  anywhere in `src/`.
- Commit: `build(world-scan W2): the residence catalogue — admitFor, title, the realtor and the maintains brain read it`.

**Done.** Notes:

- The catalogue derives from `Template.findWhereDataHas('parentExtent')`
  as planned; `institutionsCovering(key)` sorts **longest extent first**
  so a building inside a district answers before the district.
- `holdingsUnder(extent)` consults **every** institution, not only the
  covering one — an extent may name a district containing several, and
  the holding's own key is the ownership test. Four institutions ship,
  so it is a walk over four maps. This is exactly equivalent to the
  brain's old filter and does not depend on `institutionsCovering`.
- ⚠ **Three test fixtures had to learn the roster exists**, and each
  failure was silent-and-empty rather than loud: `TitleVerb.test.ts` (its
  store mock answered flat equality only, so the `$exists` query on a
  dotted key returned nothing and `title list` was correct-looking and
  empty — it now has a `matches` helper), `Realtor.test.ts` (no store
  mock at all: `Template.find*` threw "Not connected"), and the moved
  brain test. That is the D13 risk in miniature: a roster nothing
  populates reads empty forever.
- The moved brain test now stands a stand-in **institution** holding
  stand-in programmes, with the roster's REAL `holdingsUnder` running
  between them — so the extent filter is still under test where it now
  lives.
- `Realtor`'s duck-typed `BookShape` is gone: `platBooks()` returns
  `PlatBook`, which terminus already imports.

### W3 — the item back-reference (D14) — ✅ DONE

- `Slottable._occupancy` + the two gated mutators; `Slotted.occupy/vacate`
  call them; `occupiedSlots()` reads the map; decide and record the
  `fieldMeta` lifetime declaration.
- Tests: `lib/slot/__tests__` — occupy/vacate/occupyAll/transferOccupancy
  keep the map exact; host destruct clears the candidate's entry; candidate
  destruct clears the host; a non-Slotted caller of `_noteOccupied` is
  denied; `getOccupiedHost` unchanged.
- Acceptance: equip/unequip/sit/stand/mount/rest paths unchanged; no
  `world:` in `Slottable.ts`.
- Commit: `build(world-scan W3): Slottable carries its occupancy — no world walk per rest tick`.

**Done.** ⭐ **D14's open `fieldMeta` question is decided: neither side is
declared.** The forward map `Slotted.slots` is not in `fieldMeta` either
— it is private, transient runtime state — so the pair is not a
persistent live-ref relationship and the R2.1–R2.4 rules do not govern
it. Both sides are already cleared by destruct through the same `vacate`
chokepoint (`Slottable.cleanupOnDestruct` vacates the candidate from
every host; `Slotted.cleanupOnDestruct` vacates every occupant), and the
comment on `_occupancy` cites both walks.

The back-reference is written *before* the witnesses fire on both sides,
so a witness that asks `getOccupiedHost()` sees the claim it is being
told about. `Metabolic.currentRestQuality`'s short-circuit stays and its
comment is rewritten: the inverse lookup is now a map read, and the
short-circuit is kept because standing on nothing is the common case and
costs one field read.

### W4 — the index and the memo; `allModes` by glob (D1, D6, D16 first half) — ✅ DONE

- `MixinApi` memo + `lowercasedMixinNames`; `StuffApi.#indexes.byMixin` +
  gated `findByMixin`; `resolveChain` seeds `world:[mixin.X]` from the
  bucket (**for every caller at this wave** — same answers, no scan);
  `LocomotionLogic.allModes` by path glob.
- Tests: `api/__tests__/stuff*` — register/unregister keep buckets exact;
  destroyed objects drop lazily; `findByMixin` denied outside an `MqlLogic`
  frame; composed-only (a shadow-granted mixin is not bucketed); the
  resolver's `world:[mixin.X]` result equals the pre-index result on a
  fixture (assert set equality); `allModes` returns the 11 modes.
- Acceptance: `pnpm test:near` green; measured: `world:[mixin.X]` no longer
  calls `getAllObjects` (spy).
- Commit: `build(world-scan W4): one registry index — mixin composition; queryMixins memoized; allModes by glob`.

**Done.** Notes:

- `indexedWorldSeed(node)` in `resolver.ts` recognizes the one
  index-answerable shape (head `world`, `rest[0]` a `[mixin.X]` bracket
  filter, `truthy` or `has`). The filter op still runs afterwards and is
  idempotent, so **the answer is identical** — asserted as set equality
  against the walk-and-filter in `mixin-index.test.ts`, which is the
  claim the whole build rests on.
- `queryMixins` now returns a copy of a `WeakMap`-memoized list; a caller
  that mutates the result cannot corrupt the memo (tested).
- ⚠ The `findByMixin` gate is `FromTemplate('/platform/idea/api/mql')`
  today. In W6 the resolver still reaches it under an `MqlLogic` frame,
  so this stays — but note the gate names the TEMPLATE, not the method:
  the method-level narrowing is `RegistryWideReaders` on the two `MqlApi`
  entries, one layer out.
- A shadow is itself a registered `Stuff`, so a shadow that composes a
  mixin appears in that bucket **as itself** — which is what the pre-index
  walk did too. What composed-only means is that the shadow's HOST is not
  bucketed, and that is what the test pins.

### W5 — every other reader becomes a named question (D15, D16 water, D17)

- `PersistableLogic.captureAtShutdown` + `AppBootstrap` call;
  `BankingLogic.branchOf` + memo; `MagicLogic.decoyNameFor`;
  `ResidencyLogic.installSpawnSweep` callback → `ResidencyApi.spawnNow()`;
  water's two mixins + `worldScan` on the index (via `resolveMany` until
  W6); `ParcelRegistry` maps + `extentsHeldBy` / `parcelsOnReach`;
  `AccessRegistry.heldExtents` and `WaterRightRegistry` rewritten; delete
  `allRecords` / `groupOwnerRefs`; `WikiRegistry.pagesIn` +
  `WikiPage.findByNamespace`; `HerdRegistry.named/isEmpty`;
  `LaneCatalogue.byNode`; `PlayerApi` three questions + the four callers;
  `MqlGroupProvider` null giver.
- `scripts/check-whole-table.ts` + `lint:whole-table` in `package.json`;
  drop the water entry from `check-world-scan`'s `getAllObjects` allowlist.
- Tests: each owner's suite; `lint:whole-table` at zero; a test that the
  spawn sweep still runs through the clock callback.
- Acceptance: no `.find/.filter/[0]` over a whole read anywhere;
  `lint:family` green with 31 gates.
- Commit: `build(world-scan W5): named questions for parcels, wiki, herds, lanes, avatars, banks, decoys, shutdown; lint:whole-table`.

### W6 — the door (D3a, D3b, D7–D11, D18, D19). Two commits, one wave.

**W6a — the primitive.** `FromTemplateMethod` in `SecurityPolicies.ts` +
`lib/security/__tests__/FromTemplateMethod.test.ts`: admitted from the
named method of a stamped singleton; denied from a sibling method; denied
from a free function under a Root frame (`ExecutionContextApi.runRoot(null,
'x', …)`); denied from inside another Stuff's method frame (the brain
shape); the glob template term; the module disambiguator (a wrong module
denies); static-wrapper and instance-gate paths both covered.
`lint:gates` extension. Commit `build(world-scan W6a): FromTemplateMethod —
trust by template + function`.

**W6b — the refusal, the two entries, the seat arm, the note, the docs.**
Resolver mode slots + refusal + scan record; `MqlApi.resolveWorldIndexed /
resolveWorldForSeat` + `RegistryWideReaders` + `MqlLogic` methods; every W1–
W5 owner's one call switched to `resolveWorldIndexed`; `CommandLogic.
resolveModel` `resolveScoped` helper with the office check; `RegistryScanNote`
in `packages/types` + prose + client typecheck; **the D21 cost table**
(`registryReads` on `MqlLogic`, incremented in both entries;
`MqlApi.registryReadStats()`; `registryReads` added to the `/stats`
payload in `services/Server.ts`); `check-world-scan` second
pattern + header rewrite; docs: `antipatterns.md` inverted, `mql-grammar.md`
stripped, `mql.md` (the seed, the two entries, index-answerable, composed-
only), `call-security.md` (policy table row + the top-frame correction +
the "re-enter through your own Api for a named frame" recipe),
`lint-family.md` (two gates + `lint:gates`), `response-envelope.md` (the
note), `governance.md` + `access.md` (what the seat now confers; the second
`holdsOffice` consumer), `employment.md`, `holding.md`, `residence.md`,
`watershed.md`, `logistics.md`, `locomotion.md`, `parcel.md`, `wiki.md`,
`behavior.md` (the brain's new home), `docs/subsystems/content-packs.md`
(the `worldScan` convention pair).
Tests: resolver — `world` throws `MqlPermissionError('world')` via
`resolveMany` for a giver and for `null`; `resolveWorldIndexed` admits
`world:[mixin.X]` and refuses bare / `class.` / `prop.` / `address` /
scope-keyword shapes; `resolveWorldForSeat` returns `scan` for all of
them; the static gates deny an unlisted caller; `MqlSubscriptionRegistry`
returns `'permission'` for a `world:` subscribe and `mql-query`; binder —
holder resolves + gets the note, non-holder gets `mql-error` with the
alternatives text and `{result:'failed'}`, the check runs at most once
per `resolveModel`; every `world`-typed arg on a sample of the 154 views
refuses identically; **D21 — the table keys on the admitted pair, counts
`calls`/`returned`/`maxReturned`, records the seat arm under `seat`, and
is absent for a denied call.**
Commit `build(world-scan W6b): the world seed refused; two gated entries;
the Prime Minister's typed query reports its cost; a per-reader cost
table; the antipattern doc inverted`.

### W7 — the drive, the full suite, the MR

- Author `packages/wire/tests/world-scan.dirty.wire.test.ts` (§ Test &
  gate strategy). Run `pnpm -C packages/wire wire`; run `pnpm test` once
  (the pre-MR moment); append the **drive record** below, including the
  re-measured `n` and the per-category `scanned` counts the seat notes
  report; push; open the MR.
- Commit `drive(world-scan): <what driving found>`.

---

## Reachability wiring

Per new capability, the four links (verb · affordance · data · boot),
each of which fails closed and silent:

| capability | verb | affordance | data | boot |
|---|---|---|---|---|
| the PM's `world:` query | none new — any of the 154 query-arg views | the seat: `CompactApi.holdsOffice` at bind time (founder by default) | — | `/compact/executive` is a platform `boot:` entry already (governance.md § Seat-held title); `holdsOffice` needs nothing else |
| the cost note | — | emitted by the binder | `RegistryScanNote` in `@saxonberg/types` (no build step) + prose in `CommandGiver.ts` | — |
| the residence catalogue | — | reached by path (`StuffApi.singleton`) from `admitFor`, `TitleController`, `Realtor`, the brain | the row `content/system/residence/idea/ResidenceCatalogue.yaml` — **without it `singleton(path)` cannot clone** | none needed (lazy) |
| the moved brain | the `maintain` verb (unchanged) | `behaviors[].brain: /system/residence/behavior/maintains` on `katie.yaml` and `walter.yaml` — ⚠ a stale path resolves to `null` and the NPC silently idles; `lint:census` + drive step 13 catch it | the rows | the NPCs already boot |
| the water mixins | — | composed on `Conduit` (+ grep hits) — an implementer that does not compose is silently invisible to the river; the drive's wharfside checks + the water pack tests catch it | — | — |
| the mixin index | — | every `register()` | — | — |
| `FromTemplateMethod` pairs | — | the pair list in `api/mql.ts`; a mistyped template or method **fails closed silently** — `lint:gates` (D18) is the catch | — | — |
| the D21 cost table | — | incremented inside both gated entries, so **every admitted read is counted by construction** — there is no second place to forget | — | ⚠ process-local: it resets on restart and on an HMR reload of `MqlLogic`. Read it from a server that has been up a while, or the numbers mean nothing |

---

## Acceptance-criteria coverage

| AC | satisfied by |
|---|---|
| 1 — no typed input from an ordinary character reads the whole world, on any query-arg view or live surface | W6b: resolver refusal (D9) covers every `resolveOne/Many` caller — the binder's 154 views, `mql-query`, `mql-subscribe`, scope-as-MQL, `EmoteGrammar`, `MqlGroupProvider`; drive 1–3 |
| 2 — the refusal names the alternative; the game continues | D9 message text via the existing `mql-error` path; drive 1 |
| 3 — the PM's query runs and reports cost; gained/lost with the seat, no restart | D10 (`holdsOffice` per bind) + D11; drive 4 + the handoff step |
| 4 — no standing world query for anyone | D7 (subscriptions route through `resolveMany`); W6b subscription test; drive 3 + 5 |
| 5 — drive steps 6–14 unchanged | W1–W5 preserve populations exactly (live-only, same filters); the wire suite + drive 6–14 |
| 6 — rest/recovery no longer stalls | W3; drive 15 |
| 7 — an author's ordinary questions still answerable | W6b: the `mql-grammar.md` rewrite shows each former `world:` example over `/path` or an anchored seed; the lens-2 check is recorded in the drive record (the `:members` keyed locator and the doors-in-my-extent case — `heldExtents` + `/path` globs) |
| 8 — guidance inverted; a new instance is visible and deliberate | D18 gates + D19 docs, same commit as the refusal |

Unmapped: none.

---

## Test & gate strategy

- **Unit** (per wave, above): policy tests; resolver mode/refusal tests;
  index exactness + composed-only; binder tests with `holdsOffice`
  stubbed both ways; roster memo tests; back-reference tests; catalogue
  tests (residence pack vitest); the D17 owners' suites.
- **Lints**: `lint:family` after every wave; new `lint:whole-table`;
  extended `lint:world-scan` and `lint:gates`.
- **`pnpm test`** exactly twice: before the MR (W7) and at `/finalize`.
  Everything between is `test:near` + touched packs' vitest + the family.
- **The drive** — `packages/wire/tests/world-scan.dirty.wire.test.ts`,
  `declareFile({ packs: ['platform', 'residence', 'eternal-university',
  'terminus', 'world-seed', …as needed] })`:

  **The door.**
  1. `p = Session.open(uniqueHandle('scan'))`; `p.cmd('look world:[mixin.Door]')`
     → `expectNote(r, 'mql-error')`, `detailOf` contains `reachable`;
     status `declined`; a following `look` is `ok` (nothing hangs).
  2. Same query on two more views incl. one pack verb (e.g. `analyze
     world:[mixin.Door]` from water, `buy world:[mixin.Door]`) → same note.
  3. Send a raw `{ type: 'mql-subscribe', payload: { query: 'world:[mixin.
     Door]', … } }` frame → await `'mql-subscription-error'` with
     `kind: 'permission'`; also `p.query('world:[mixin.Door]')` rejects.
  4. `founder = Session.open('founder')`; `founder.cmd('look world:[mixin.
     Door]')` → `ok`, `expectNote(r, 'registry-scan')` with `indexed: true`;
     `founder.cmd('look world:[class.Door]')` → `registry-scan` with
     `indexed: false`, `scanned > 1000` (record the number — this is the
     re-measured `n`).
  5. Founder repeats step 3 → still refused.
  6. Handoff: `founder.cmd('office assign <p.handle> prime-minister')`; then
     `p` repeats step 1 → `ok` + note; `founder` repeats step 1 → refused;
     `afterAll` hands the seat back (`office vacate` / re-assign to the
     founder). ⚠ If `office assign` reproduces the documented "No such
     player" defect, the build records it in the drive record, marks this
     `it` `todo` with the governance.md pointer, and AC3's handoff half
     rests on the binder unit test — and says so in the MR.

  **What the plumbing carries** — reuse where a wire file already
  exercises the site (cite it in the drive record) and add a checkpoint
  here where none does:
  7. wages + tips: `work.dirty.wire.test.ts` (take a job, work a shift,
     get paid) — rerun and cite; add a `tip` checkpoint here if absent.
  8. wear / wield / sit / stand / rest: `wear`, `wield`, `sit`, `stand`,
     `rest` in a furnished room; assert each `ok` and that a `rest` in a
     chair reports the same recovery note/prose shape as before; time the
     round-trip of ten `rest`/`stand` cycles (< the harness timeout,
     server responsive).
  9. `walk`/`run`/`sneak` between two rooms: all three `ok`, `here`
     changes, the movement mode differs (`locomotion` note or prose).
  10. served at a counter (`order` at Dave's Bar) and `bank` at a branch
      (`balance`): `ok`.
  11. a carried screen and one not carried (`watch … on <screen>`): `ok`
      / the documented refusal.
  12. `title list` (a subdivision's lots) → `ok`, non-empty.
  13. log out inside a holding and log back in: open a session for a
      handle whose start location is a dorm room, `p.close()`, reopen the
      same handle → `queryOne('here')` is the dorm room, not the front door.
  14. the property-minder: after N game-hours (advance via the founder's
      clock verb if one exists, else wait the cadence), `errors` shows no
      brain throw and Katie is back at her desk (`queryOne('/world/eternal/
      duncan-hall/agent/katie')` location).
  15. `press` (the press room) and `wiki search <term>` → `ok`.
  16. repeat 8–9 twenty times → no dispatch timeout.

---

## Risks & opens

- **The `office assign` defect** (governance.md, open since 2026-08-02)
  can block the handoff half of AC3 in the drive. Not in this build's
  scope to fix unless trivial; the plan says what to do (drive step 6).
  ⚠ Needs the user's eye: accept "unit-proven, drive-`todo`" for that
  half if the defect reproduces.
- **A denied legitimate reader fails closed and silent** — the exact class
  of bug the requirements call out. Mitigations: every reader is a named
  method (D15); `lint:gates` resolves each pair (D18); the spawn-sweep
  callback rerouted (W5); the drive's plumbing half. The build should grep
  for every `MqlApi.resolveWorldIndexed(` call and confirm the enclosing
  frame by reading the call path, not the file.
- **`$focus` set to a `world:` fragment** (`focus world:[mixin.X]`) would
  make every subsequent command's scope chain throw. Check
  `FocusController` refuses to store a `world` fragment (it resolves at
  set time → the refusal fires there); if it does not, add the check.
- **The residence catalogue's rows-by-shape derivation** (`parentExtent`)
  is a shape, not a class. ⚠ Needs the user's eye: the alternative (a
  kernel-side institution roster on a location Api) contradicts the
  requirements' placement; the plan chose the pack per requirements and
  the shape because institution classes span packs.
- **The cost table is only as good as the uptime behind it** (D21).
  Process-local counters on a freshly-booted server read as zero, which
  looks exactly like "nothing scans" — the opposite of the finding. The
  drive record should note the server's uptime beside the table.
- **Category sizes must be measured, never assumed**: the seat note's
  `scanned` for `world:[mixin.X]` shapes reports each bucket's size; the
  drive record lists them for Employed, Slotted, Circulating, Identifiable,
  Publisher, Display, Bank, Attendant, Business, Organization, Persistable.
- **`employments` as an accessor pair**: confirm the persistence spine's
  default slice restore fires the setter (persistence.md; a bracket
  assign through an accessor pair on the prototype does). If it bypasses,
  enrol from `EmployedMixin`'s `restoreSlice` instead and record it.
- **Client exhaustiveness**: adding a `Note` member may break an
  exhaustive switch in `packages/client`; run its typecheck in W6b.
- **MqlGroupProvider's null giver** is a small semantic change for group
  ids that used giver-anchored seeds against an arbitrary viewer — noted
  as a judgment call; revert to `PlayerApi.connectedAvatars()[0]`-free
  only if a shipped group id depends on it (grep `groups` content).
- **`LaneCatalogue.allLanes` / `WikiRegistry` report reads** — deleting a
  public method a pack test uses breaks that pack's suite; grep before
  deleting.

---

## Deferred seams

Each leaves as a slate line, not a plan section:

- **`FromIdentity`, pack-contributed gate participants, `@Audited`** —
  [call-security-pass-slate](../slates/builds/call-security-pass-slate.md);
  this build proves `FromTemplateMethod` and records the top-frame
  correction there.
- **The `flat` seed** (also `getAllObjects`) and any future `world:`
  subscription — [world-scan-perf-slate § What this slate does NOT cover].
- **MQL grammar for specialized rosters** — slate D5.
- **Active-mixin selector** (`[active.X]`) — slate open Q1, composed-only
  hardened here.
- **A `PlatBook` stood up on demand** by `title list` (today live-only) —
  a residence-slate line if the second subdivision wants it.
- **`Template.findByClassLineage`** — if a second pack needs a rows-by-
  class-lineage derive, promote the residence catalogue's shape query.

---

## Critical files

Read first, in this order:

1. `docs/requirements/world-scan-requirements.md`,
   `docs/slates/tails/world-scan-perf-slate.md`
2. `packages/server/src/mud/api/mql/resolver.ts` (`resolveChain`,
   `resolveKeywordSeed`, `candidatesForScope`, `hasMixinByLowercaseName`),
   `api/mql.ts`, `platform/idea/api/MqlLogic.ts`, `api/mql/types.ts`
3. `api/stuff.ts` (`#indexes`, `#updateIndexes`, `getAllObjects`,
   `forceDestruct`), `api/mixin.ts` (`queryMixins`, `hasMixin`)
4. `lib/security/SecurityPolicies.ts`, `api/security.ts`
   (`#wrapStaticDescriptor`, `#securityGate`, `#proceed`),
   `api/execution-context.ts` (`CallFrame`, `getCallStack`, `runRoot`)
5. `platform/idea/api/CommandLogic.ts` (`resolveModel`), `api/compact.ts`
6. `platform/idea/api/EmploymentLogic.ts`, `lib/employment/Employed.ts`,
   `lib/employment/Organization.ts`
7. `lib/slot/Slottable.ts`, `lib/slot/Slotted.ts`, `lib/metabolism/
   Metabolic.ts` (`currentRestQuality`)
8. `lib/location/OuterWarren.ts`, `lib/behavior/maintains.ts`,
   `content/residence/src/idea/{PlatBook,HoldingWarren,PlatWarren}.ts`,
   `content/transport/src/idea/LaneCatalogue.ts` (the catalogue shape)
9. `content/water/src/idea/WatercourseCatalogue.ts` (`worldScan`),
   `content/water/src/thing/Conduit.ts`
10. `platform/idea/ParcelRegistry.ts`, `platform/idea/AccessRegistry.ts`
    (`heldExtents`), `platform/idea/WikiRegistry.ts`,
    `content/trade-ranching/src/idea/HerdRegistry.ts`,
    `platform/idea/api/PlayerLogic.ts`
11. `packages/server/scripts/check-world-scan.ts`, `check-pm-access.ts`,
    `check-gate-strings.ts`, `pack-roots.ts`
12. `packages/types/src/index.ts` (`Note`), `lib/command/CommandGiver.ts`
    (`proseForFrameworkNote`), `api/command.ts` (`autoEscalationFor`)
13. `packages/wire/src/harness/{session,assertions,registry}.ts`,
    `packages/wire/tests/platform-smoke.wire.test.ts`,
    `packages/wire/tests/work.dirty.wire.test.ts`
14. `docs/subsystems/mql.md`, `call-security.md`, `lint-family.md`,
    `response-envelope.md`, `governance.md`, `access.md`, `ref-shapes.md`
    (§ Declaring it), `docs/antipatterns.md` § Bespoke Object-Search
    Algorithms, `docs/mql-grammar.md`, `docs/testing.md` § Two tiers

---

## Drive record

*(appended at build time)*
