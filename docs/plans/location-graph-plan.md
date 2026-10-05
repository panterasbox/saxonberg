# The location graph — implementation plan

Executes [location-graph-requirements.md](../requirements/location-graph-requirements.md)
(**kind: feature · leads from: kernel**; first consumers the University
Avenue crossing, the Duncan Hall dorm warren, the Hinkley Hills plat
warren and the TPA departures board). The build makes **a derived,
persisted projection of every location and its exits** (its own
collection, sharded by zone, rebuilt at boot, maintained at the content
write chokepoint), gives every player **a map document per locality they
know** that is written when they perceive a place and **never
re-reconciled against the truth**, puts `published` on the parcel with
the draft-wall / offline-camera split, ships the **five graph invariants
as a lint first and alone**, and fixes the shipped defect that makes a
secret found in one dorm room read as found in all of them.

Branch `reqs/location-graph`, worktree `build-3`.

⚠ Two premises in the inputs are corrected below by grounding, and the
corrections are load-bearing: **holding rooms carry no minted identity**
(§ Grounding G-ID), and **the acting author is `null` inside the forced
arrival `sense`** (§ Grounding G-WRITE). Both change the shape of the fix
and the write path; neither reopens scope.

---

## Grounding

Verified by opening files this cycle (2026-10-04). File paths are
`packages/server/src/mud/` unless they start with `packages/` or
`scripts/`.

### The defect, and the identity read it needs

- **G1 — the defect site.** `lib/boundary/Exit.ts:407`
  `getDiscoveryKey()` returns `` `${this.source.getTemplatePath()}#exit:${this.direction}` `` or
  `undefined` when the source has no template path. It never consults
  identity. Its own doc comment (line 400) says *"`undefined` when the
  source has no durable templatePath (a shared multi-clone room)"*,
  which is not what the code tests — it tests null, not shared. Default
  impl: `lib/concealment/Concealable.ts:140` (the thing's own
  `getTemplatePath()`). `lib/concealment/Hiding.ts:138` overrides to
  `undefined` while hiding. Consumers: `platform/idea/api/PerceptionLogic.ts:972`
  (`MixinApi.isConcealable(target) → target.getDiscoveryKey() ?? null`,
  feeding `hasDiscoveredImpl`/`recordDiscoveryImpl` at 977/985 which
  `viewer.recall/know(DISCOVERY, referent, …)`), and
  `lib/belief/BeliefStore.ts:626` (the `DISCOVERY` realm is exempt from
  the liveness-GC because its referent is a *feature handle*).
- **G2 — the raw identity slot and its gate.** `lib/stuff/Stuff.ts:537`
  `getIdentityPath()` = `raw.#identityPath ?? this.getTemplatePath()` —
  the fallback that hides a collision. `Stuff._identityStampOf(stuff)`
  at line 645 returns the raw slot or `null`, peeling up to 8 proxy
  wrappers (reason recorded in the comment: a proxy-of-a-proxy carries
  no private slot). It is gated by `Stuff.#assertStampGateAllowed` (line
  695) whose allowlist (`#stampGateAllowlist`, line 680) admits
  `mud/api/stuff.ts`, the test-setup helper and `*.test.ts` only. `Exit`
  cannot call it. The registry index deliberately reads the raw slot
  (*"a vessel must never index under the identity it projects"*);
  `platform/agent/sandbox/SandboxAvatar.ts:16` overrides the METHOD
  `getIdentityPath()` to project the real player.
- **G-ID — ⚠⚠ when the slot is stamped, and who has no stamp.**
  `api/stuff.ts:545` computes `identityPath = opts?.asIdentityPath ?? templatePath`
  for the singleton guard, and line 629 stamps `#identityPath` **only
  when `asIdentityPath` was passed**. Three populations follow:
  - **Circulation nodes** of an `OuterWarren` are stamped:
    `lib/location/OuterWarren.ts:499` clones with
    `asIdentityPath: `${this.getParentExtent()}/${nodeId}``.
  - **Holding rooms** (every Duncan Hall dorm room, every Hinkley house
    room, Seznick House's units) are NOT stamped. The keyed model is the
    persistence spine's: `platform/idea/api/PersistableLogic.ts:1180`
    `restoreOrSeedImpl(host, key)` takes `scope = host.getIdentityPath()`
    (= the ROW path, since nothing was minted) and
    `host.setPersistenceKey(key)`; `lib/persistence/Persistable.ts:219`
    `getPersistenceKey(): string | null`. `HoldingWarren.ts:12` says it
    outright: *"each room is a keyed instance of a REAL room row (scope =
    the room row, key = <extent>/<leaf>) — `templatePath` always
    resolves to a row (D17), per-holding uniqueness carried by the
    persistence spine's unique-key guard."*
    `content/eternal-university/src/duncan-hall/idea/DormWarren.ts:184`
    `PersistableApi.restoreOrSeed(programme, key)` with `key` = the unit
    parcel extent; `ParcelRecord.slotOfExtent` (line 391) parses the
    floor/position out of it. **So the slate's "scheme 2 mints
    identity" is wrong**: the per-instance durable handle of a holding
    room is `getPersistenceKey()`, a parcel-extent-shaped path.
  - **Singleton places** (`SingletonCartesianLocation`,
    `SingletonSphericalLocation`, `Offstage`, `VoidLocation`, the
    crossing's `Street` lineage) have no stamp either; their one
    instance IS the row, so the template path is the right key — and
    the current behaviour the bar's secret door relies on.
  - **Lounge satellites** (`lib/location/Warren.ts:365` `spawnMember` →
    `createMemberSerialized`) have no stamp, no key, and compose no
    `SingletonMixin`: `undefined` is their right answer.
- `lib/stuff/Singleton.ts:33` `_mixinName = 'SingletonMixin'`,
  `Mixins.Singleton` at `lib/mixin.ts:311`; `MixinApi.isPersistable` at
  `api/mixin.ts:1585`. Branch predicates on `Stuff` (`isAgent()` at
  `Stuff.ts:1179`; the location/thing/idea siblings beside it — confirm
  the exact names when editing `Exit.ts`).
- Test shape precedents: `lib/boundary/__tests__/Exit.concealment.test.ts`
  (`makeStuff(() => new CartesianLocation())`, a zone, two rooms — ⚠
  these carry **no template path**, so a collision test built that way
  passes today for the wrong reason; the failing-first test must clone
  from a ROW), `lib/concealment/__tests__/Hiding.test.ts` (`makeStuffAtPath`).

### The write chokepoint, the boot, the templates

- **G3 — `DomainHook` is the chokepoint.** `platform/idea/hooks/DomainHook.ts`
  composes `AroundSaveHookMixin(AroundDeleteHookMixin(Idea))`; `aroundSave`
  runs three `TemplateApi.validate*` then `next(doc)`; `aroundDelete`
  validates then `next(id)`. Bound by `platform/idea/hooks/hooks.yaml`
  (collection `content`, ops `save` + `delete`), loaded by
  `backend/PersistenceManager.ts:797 loadHooks()` from
  `backend/AppBootstrap.ts:195`. `api/template.ts:12` states it is the
  chokepoint for direct PM writes AND `Template.save()`. The pack
  installer writes rows with `PersistApi.save(Collections.Content, …)`
  (`platform/idea/api/PackLogic.ts:3333`) — so it trips the hook too.
  `TemplateApi.saveTemplate` has five direct callers (`CmsLogic.ts:637`,
  `CpController.ts:79`, `MvController.ts:82`, `WriteController.ts:170`,
  `SubdivideController.ts:89`) and is NOT the chokepoint.
- **G-BOOT — where a dangling exit crashes.** `lib/boundary/Exitable.ts:612`
  `_applyExitSpec` → `await StuffApi.singleton(spec.destination)` (line
  617) → `api/stuff.ts:483` `throw new Error(`Template not found: …`)`.
  Eager rooms come from each pack's `boot:` list
  (`backend/BootstrapManager.ts:209 run()` → `PackApi.bootManifest()`;
  `packages/content/terminus/pack.yaml:88`), wrapped as *"failed to
  clone"*. `verifyOutboundExits` (line 720) already does lazy mutual-exit
  verification at runtime and `setBlocked(true)`s a one-sided edge with a
  `console.warn` — it is runtime-only, destination-must-be-loaded, and
  tells no author anything.
- **G-ROWS — enumerating locations.** `lib/stuff/Template.ts`:
  `findByPath:452`, `findByClass:492` (unions children that inherit the
  class via `#inheritedMatches`), `findByPathInfix:546`,
  `findWhereDataHas:561` (same union), `findDescendants:577`,
  `ancestorPaths:612`. `_materialize` folds the `extends` chain (cap 32,
  line 409). ⚠ **Place rows are NOT all under a `/location/` segment**:
  `/world/terminus/counting-houses/banking-hall`,
  `/world/terminus/general-store/shop-floor`,
  `/world/terminus/mayfield-row/seznick-house/corridor` predate the path
  pattern. Enumeration must be by CLASS (every row, class checked once
  via `StuffApi.loadClassByPath` + `prototype instanceof Location`, the
  `isMaterialClass` pattern at `platform/idea/MaterialCatalogue.ts:87`),
  never by path infix.
- **Which rows are PLACES and which are KINDS.** `scripts/check-location-classes.ts`
  enumerates the minted roster: `MINTED_ROWS` (3 rows on permissive
  `CartesianLocation`: Hinkley's `lots/road-segment`, the platform
  `venue`, Seznick's `corridor`) and `FURNISHED` (13 rows on
  `FurnishableRoom`, the dorm room included). Its doc: *"An authored
  place — a hub, a hollow, a cookhouse — belongs on
  `SingletonCartesianLocation`."* `DormRoom extends FurnishableRoom`
  (`content/eternal-university/src/duncan-hall/location/DormRoom.ts:48`);
  `Corridor` is a pack class on plain `Location`, minted per floor;
  `Lounge` (`world/lounge/location/Lounge.ts:43`) is cloned per
  satellite. The content-level rule the code already obeys: **a row
  whose effective class composes `SingletonMixin` is one place; every
  other location row is a kind**, reached only through a warren or a
  programme. The lint's `extendsAny(classPath, roots)` (line 92) walks
  `extends` clauses THROUGH mixin calls and resolves pack classes via
  `classFileOf` — reusable for a class-composes-Singleton test on disk.
- **G4 — `PlatPlan` is kernel and stateless.** `lib/location/PlatPlan.ts`:
  `nodeOfSlot:243` (linear `f<n>-r<p>` → `main:<n>`; static → `<key>:1`;
  branched `lot-<n>` → `<road>:<segment>`), `nextFreeSlot:278`,
  `nodesInOrder:315` (⚠ linear is unbounded — enumerates to `maxNodes`),
  `isAuthored:333`, `authoredPathOf:339`, `routeOf:358`,
  `reachableGiven:383`, `predecessorOf:393`, `onwardDirectionOf:409`,
  `gateDirectionOfSlot:431`. `OuterWarren.fieldMeta` (line 112) carries
  `plan`, `capacityKey`, `defaultCapacity`, `parentExtent` as persistent
  + authorable; `getParentExtent():151`, `getPlatPlan():187`.
  `ensureNode` (line 486) uses `authoredPathOf(nodeId)` →
  `StuffApi.singleton(authoredPath)` for an authored node, else clones
  the circulation template with the `asIdentityPath` above. The pack
  rows: `content/hinkley-hills/…/idea/lot-holder.yaml` (`class:
  /system/residence/idea/PlatWarren`, `plan: {shape: branched, roads:
  [{key: lane, segments: 9, frontagesPerSegment: 4, authored: {"1":
  …/location/lane}}, {key: hinkley-court, …, branchesFrom: {road: lane,
  segment: 2, direction: north}}]}`, `parentExtent:
  /world/terminus/hinkley-hills`, `defaultCapacity: 40`);
  `…/duncan-hall/idea/dorm-warren.yaml` (`plan:` at line 15). The
  holding INTERIOR (`floorplan:` on `house-programme.yaml`,
  `/system/residence/idea/HoldingWarren`) is the residence pack's field
  and is not plan topology.
- **G-ZONE.** No zone declares an entrance. `lib/zone/SpatialZone.ts:44`
  fieldMeta: `stocks`, `favours`, `blessingOdds`, `address`, `deposit`,
  `groundCharacter`, `celestialProfile`, `suppressesMagic`. Zone of a
  path is path-based: `api/zone.ts:159 resolveZoneForPath` →
  `ZoneLogic` walks `Template.ancestorPaths` nearest-first for a class
  that `isSpatialZoneClass`. The cardinal rule lives in
  `lib/location/CartesianLocation.ts:85–125` (a non-cardinal direction is
  admitted only when the destination resolves to a different zone,
  path-based). `AppSettings.defaultStartLocation`
  (`lib/config/AppSettings.ts:40`, default `/platform/location/void`) and
  `evacuationFallback` (line 54) are the two global fallbacks;
  `lib/spatial/Container.ts:286` escapes `HasInteractive` occupants to
  the evacuation fallback on a host destruct with no outer.
  `platform/location/VoidLocation.ts` (bootstrap-pinned, refuses
  destruct) and `platform/location/Offstage.ts` (a `SingletonMixin(OffstageMixin(Location))`,
  deliberately not Exitable) are the two shipped "nowhere" rooms.
- **G6 — the Api↔Logic pair.** `api/navigation.ts:56` `NavigationApi`
  (`normalizeDirection:64`, `invertDirection:77`, `directionOffset:88`,
  `isCardinalDirection:95`, `cardinalDirections:100`) forwards via
  `StuffApi.singletonSync('/platform/idea/api/navigation', …)` to
  `platform/idea/api/NavigationLogic.ts` (`extends ApiLogic`,
  `@Unshadowable`, per-method
  `@CallSecurity(FromModule('/api/navigation#NavigationApi'))`). The
  constants live in the Logic; the type re-exports from the Api face.
  Nothing on it takes a `Stuff`.
- **The registry-with-rebuild precedent.** `platform/idea/AddressRegistry.ts`
  + `platform/idea/api/AddressLogic.ts:259 rebuildCoverageIndex()` →
  `lookupRegistry()?.rebuildCoverageIndex()`; `AddressApi.rebuildCoverageIndex`
  at `api/address.ts:204`. Self-warming catalogue precedent:
  `platform/idea/MaterialCatalogue.ts` (`onCreate → warm()`, `canEvict` /
  `canDestruct` vetoes, idempotent via `StuffApi.singleton`), booted by
  `packages/content/platform/pack.yaml:87` with `role: sync-read` and the
  note *"self-warming — no Api.boot"*. `ApiLogic` (`lib/stuff/ApiLogic.ts:26`)
  is residency-exempt by construction.
- **G8 — a collection's ceremony.** `packages/server/src/schema/<name>.yaml`
  (48 today; `parcels.yaml` / `parcel_events.yaml` / `beliefs.yaml` are
  the shape), then `pnpm gen:schema` regenerates
  `lib/persistence/Collections.ts` + `CollectionPolicy.ts` +
  `ResetPolicy.ts`; `scripts/check-schema-docs.ts` (`lint:schema`) asserts
  the six legs (doc ↔ collection ↔ `owner` class with `static
  collectionName = Collections.X` ↔ `ownerModule` file ↔ `subsystem` doc
  file ↔ byte-identical regeneration). Reset verbs: `wipe` · `keep
  {because}` · `wipe-except` (`lib/persistence/SchemaDoc.ts:45`). ⚠
  `docs/subsystems/record-layer.md:216`: *the nightly job does not
  restart the process*, so anything populated at boot is `keep`.
  Record-class precedent: `lib/parcel/ParcelRecord.ts:135` (`extends
  Document`, `collectionName = Collections.Parcels`, `fieldMeta` with
  `{persistent: true}` entries, `findByExtent` statics).

### Publish-state's home

- `lib/parcel/ParcelRecord.ts`: `TitleClaim` (line 71: `extent, holder,
  parentParcel?, landUse?, areaM2?, reach?, feeder?, powerBand?`),
  `fieldMeta` (137–150: thirteen persistent fields), `landUse:216`,
  `feeder:254`, `powerBand:263`, setters `setLandUse:290`,
  `setFeeder:300`, `setPowerBand:315`; `selfHomeOwnerOf:417` (regex
  `^/home/([^/]+)/` → `{kind: 'player', templatePath: '/home/<key>'}`).
  `platform/idea/ParcelRegistry.ts:369 grant(claim)` stamps `record.setLandUse(claim.landUse ?? null)`
  … `setPowerBand(claim.powerBand ?? null)` (383–391), appends a `grant`
  event, `reindex`; `validateClaim:439`. `ParcelApi` (`api/parcel.ts`):
  `ownerOf:76`, `coveringParcelOf:84`, **`coveringParcelOfSync:100`**
  (the sync read `Exit.canTraverse` can use), `citeFeeder:255` (the
  one-field-setter precedent → `ParcelLogic.ts:194` →
  `reg.citeFeeder(extent, feeder)`), `grant:269`, `transfer:280`.
  Pack claims: `packages/content/terminus/pack.yaml:28 requires.title[]`
  rows carry `landUse`/`feeder`/`powerBand` inline — the authoring path
  `published` joins.
- The parcel verb: `packages/content/platform/content/platform/cmd/civics/title.yaml`
  (`controller: /platform/idea/cmd/civics/TitleController`, subcommands
  `list` / `buy` with a `greedy: true` string arg);
  `platform/idea/cmd/civics/TitleController.ts:124` dispatches on
  `model.subcommand ?? 'holdings'`.
- `AccessApi` (`api/access.ts`): `canAtPath(subject, action: TreeAction, path):109`
  (rung 1 a parcel, rung 2 the self-home, rung 3 the state; null fails
  closed), `can(subject, action, resource):123`, `canMutateZone:136`.
  ⚠ `TreeAction`'s member list was not opened this cycle — W3 reads it
  before picking the publish-flip action.
- `Exit.canTraverse` (`lib/boundary/Exit.ts:842`) is sync, reads
  `blocked` → `door` lock → `door` open → `allowsMode`, and its comment
  says the lock gate *"never resolves the destination, so a locked gate
  pointing at an unbuilt/dangling destination path is safe to veto."*
  `TraversalGate` (line 64) is a closed string union of twelve words;
  `TraversalGuard {ok, reason?, gate?, mode?, context?}`.
  `getDestinationTemplatePath():778` is eager (`_destinationPath` or the
  live destination's path). `Exit.fieldMeta:205` declares
  `_destination` as a weak instance ref and `_edgeMinutes` persistent;
  `edgeMinutes` is read off the EXIT (`Exit.ts:164`).

### The player's map, and who may write it

- **G5 — `DocumentKinds`.** `lib/document/DocumentKinds.ts`: closed
  `DOCUMENT_KINDS` const of `{kind, naturalKey, contentDir, ext,
  onVanish}`; `water-right` (`naturalKey: null`, `onVanish: 'keep'`, the
  stated reason), `herd`, `fishery`, `bill-of-lading`,
  `warehouse-receipt`, `instrument`, `rate-card` all on that pattern.
  `packages/server/src/schema/documents.yaml` reset is `wipe-except /
  keep: declared-document-kinds` with a `because` paragraph that names
  the runtime-written record kinds — two axes, both must be satisfied
  (`onVanish` for a vanished pack file; the reset keeps every declared
  kind regardless). `path` index is deliberately non-unique; `kind`
  indexed.
- `api/document.ts`: `read:109`, `list(prefix):117`, `listOfKind:122`,
  `saveRelease:146`, `saveToRegister:173` (gated
  `FromMixin(Mixins.Registrar, {where: caller === args[0]})`),
  `saveAsBusiness:204`, **`saveInstrument(partyKey, path, data):224`**
  gated `FromModule('/platform/idea/api/ContractLogic#ContractLogic')` —
  the derived-owner machine-write precedent; `save:242` (owner from
  context), `delete:255`. `platform/idea/api/DocumentLogic.ts`:
  `isOwnHomePath:56` (keys on `actor.getIdentityPath()`'s basename →
  `/home/<key>`), `gateMutation:72` (self-home ∨ `canAtPath(actor,
  'write-document', path)`), `saveInstrumentImpl:282` (owner =
  `papersBranchOf(partyKey)`, path pinned under it, `kind` pinned,
  find-or-create, `doc.save()`).
- **G-WRITE — ⚠⚠ the arrival `sense` is a forced frame.**
  `lib/spatial/Mobile.ts:721 autoSenseOnArrival()` → `self.forceCommand('sense')`;
  called from `traverse` (line 564), the teleport path (line 670,
  fire-and-forget) and login (`lib/character/Avatar.ts:879`).
  `api/execution-context.ts:523 getActingAuthor()` returns **`null` when
  any frame in the chain is `forced`** (line 527). So a `DocumentApi.save`
  from inside the arrival sense would reach `gateMutation(null, path)` →
  `canAtPath(null, …)` → fail closed. The map write therefore needs a
  derived-owner writer (the `saveInstrument` shape), not the context
  gate.
- Mobile's optional hooks: `canTraverse?(via)`, **`onTraversed?(via)`**
  (`Mobile.ts:94`, invoked at line 519 after the move). `Mobile.traverse`
  (line 385) consults `exit.canTraverse(this, mode)` then the mover /
  source / destination vetoes (`assertVeto`, 424–434).
- The perception moment: `lib/boundary/Exitable.ts:454 obviousExitsFor(viewer)`
  filters `this.exits` by `PerceptionApi.perceives(viewer, exit)`;
  `platform/idea/cmd/perception/SenseController.ts:193` and
  `LookController.ts:238` (bare `look` → `lookAtLocation` when
  `target.stuff === context.location`, line 97) are the two renderers
  that call it. `PerceptionApi` (`api/perception.ts`): `perceives:286`,
  `effectivePerception:321`, `hasDiscovered:334`, `recordDiscovery:344`.
- `lib/description/Perceiver.ts:139` `PerceiverMixin.commandContributions.self`
  affords `look`/`scry`/`locate`/`find`/the single senses/`sense`/
  `assess`/`survey`/`search`/`hide`/`unhide`/`disarm`/`arm`; its
  `fieldMeta` is empty. `lib/character/Avatar.ts:242`
  `Avatar.commandContributions.self` carries the player-only reference
  surfaces (`help`, `wiki`, `press`, `analyze`, `measure`, `readings`,
  `sample`, `trace`). `lib/stuff/Location.ts:11` composes
  `AmbientLit(Adornable(Container(Stuff)))` plus `Atmospheric`,
  `Addressable`, `Visible`, `Perceptible`, `Detailed` (imports 24–31).
- **Localities.** `platform/idea/Locality.ts:126` (`extends Idea`; `_address`
  IS the coverage prefix; `getName():499`, `getAddress():508`). Rows:
  `/platform/idea/Locality/terminus`, `…/terminus-city`, and under
  `/stuff/idea/Locality/`: `university-avenue`, `eternal-campus`,
  `counting-houses`, `hinkley-hills`, `hearts-delight`, `rejection`,
  `moor`, `lantern-waste`, `last-counted-mile`, `narnia`, `cair-paravel`,
  `the-lounge`. `AddressLogic.ts:52 resolveAddressString(scope)` walks
  containment outward to the nearest `Addressable` with a declared
  `_address`, then falls through to the zone's `lookupField('address')`;
  `resolveLocalityFor:140` → `coveringLocalityOf(address)` (longest
  prefix). The crossing's `_address` is
  `terminus/city/university-avenue/crossing`; the arrival gate's is
  `terminus/city/arrival-gate`; Duncan Hall's four rooms share
  `terminus/city/campus/duncan-hall`; Hinkley's lane is
  `terminus/hinkley-hills/lane`.
- **The board.** `platform/idea/cmd/movement/TeleportController.ts:120`
  — bare `teleport` at a node renders `node.renderDepartures(giver)` for
  anyone who `isSensor`, BEFORE any clearance read (the comment at 29:
  *"the order is load-bearing"*). The node is found by shape
  (`asTravelNode`, line 500: `ride` + `renderDepartures` functions).
  `lib/travel/TravelNode.ts:71` is the kernel shape (`renderDepartures`,
  `ride`). `packages/content/tpa/src/lib/FastTravel.ts`: `_routes:250`
  (ref → `{ref, departures, fee}`), `getRoutes():345`,
  `getArrivalRoom():399`, `getDestinationLabel()` (boardLabel, else the
  arrival room's covering locality name — line 425), `renderDepartures:433`.
  Rows: `content/hinkley-hills/…/thing/tpa.yaml` (`class:
  /system/tpa/thing/TpaTerminal`, `seatIn:
  /world/terminus/hinkley-hills/location/arrival`, `routes:`),
  `content/saxonberg-lounge/…/thing/terminal.yaml`.
- **Diagnostics — the author's channel.** `api/diagnostics.ts`
  `DiagnosticApi.record(d: RuntimeDiagnostic):80` (`{path, severity?
  'error'|'warning'|'info', message, channel?}` — `@saxonberg/types:4262`);
  the logic attributes by `ProvenanceApi.authorOf(path)` and delivers to
  the author on the live stream; `errors` verb
  (`platform/idea/cmd/system/ErrorsController.ts`) and the CMS pane read
  the store.
- **The lint sibling + the file walkers.** `scripts/check-location-classes.ts`
  is `lint:locations` (`packages/server/package.json:65`);
  `scripts/pack-roots.ts` exports `packSources`, `classFileOf`,
  `templateRows(serverSrc, contentDir): Map<path, {file, path, pack,
  raw}>`, `effectiveRow(path, rows) → {class, data, chain, error}`,
  `composesMixin`, `declaredFields`. Scripts may import mudlib modules
  (`check-schema-docs.ts` imports `src/mud/lib/persistence/SchemaDoc`).
  `lint:lib-statics` is a ratchet on static methods in `lib/` — a new
  shared rule in `lib/` is an INSTANCE value class, not a static holder.
  `lint:object-verbs` (`scripts/check-object-verbs.ts`) exempts
  `PerceptionApi`, `AccessApi`, `AddressApi`, `MessageApi` et al. but
  NOT `NavigationApi` or `DocumentApi`: every new static on those takes
  strings or plain data first.
- **Wire harness.** `packages/wire/src/harness/index.ts` exports
  `Session` (`play`, `cmd`, `prose`, `query`, `awaitPrompt`, …),
  `uniqueHandle`, `plain`, `declareFile`, `expectOk/Refused/Note`,
  `advanceWorldClock`, `worldClockNow`. Tests at
  `packages/wire/tests/<feature>.wire.test.ts` (`.dirty.` when the world
  does not regenerate what it consumes); `fishing.dirty.wire.test.ts` is
  the shape, including the hand-run restart step recorded in the plan.

### Drive content, verified

- `crossing.yaml` exits `south` → `…/terminal/location/arrival-gate`,
  `west` → `…/counting-houses/avenue-block`, `north` →
  `…/university-avenue/location/campus-gate` with the locked door; the
  arrival gate declares `north` → the crossing back (cross-zone, both
  sides). `hinkley-hills/location/arrival.yaml` declares `west` → the
  lane and the valley road down into town.
- ⚠ **`dormroom.yaml` authors no `exits:`** — the dorm's doors are
  code-installed (`DormDoor`, `FloorStairExit`); `cistern.yaml` is the
  only concealed-looking destination in Duncan Hall and it is the
  drown-here cistern under the steps. Drive step 8 needs a hidden exit
  two dorm rooms share: see § Risks & opens R1.

---

## Plan-level decisions

**D1 — The sanctioned identity read is a two-rung ladder, not one accessor.**
*Question 1.* (a) a new method on `Stuff`, (b) widen the stamp gate,
(c) a `StuffApi` static. **Choice: (a), split in two.**
- `Stuff.getIdentityStamp(): string | null` — public, reads the raw
  `#identityPath` slot with the same peel loop `_identityStampOf` uses
  (factor the loop into a private static both call), ungated. Doc it:
  *the minted instance identity, `null` when none was minted; never
  overridden — a projecting vessel projects through `getIdentityPath()`,
  and the registry keeps reading the gated seam.* `_identityStampOf`
  stays as is (the registry's gated read is unchanged).
- `Location.getPlaceKey(): string | null` (`lib/stuff/Location.ts`) —
  **the durable per-instance handle of a place**:
  `getIdentityStamp()` ?? (`MixinApi.isPersistable(this)` and
  `getPersistenceKey()` non-null → the key) ?? (`MixinApi.isSingleton(this)`
  → `getTemplatePath()`) ?? `null`.
- Why not (b): the gate exists so that only the clone pipeline stamps;
  admitting readers erodes a deliberate seam for one caller. Why not
  (c): object-first on a non-exempt Api, and the ratchet is at 0.
- Projected vs raw: discovery keys the TARGET (an exit's source room),
  not the viewer; the viewer key is `BeliefStore.viewerKey` →
  `getIdentityPath()`, already projected. So the raw slot is right here,
  and a vessel's finds already attribute to the real player.

**D2 — `Exit.getDiscoveryKey()` keys on the place.**
`const key = source.isLocation() ? source.getPlaceKey() : source.getIdentityStamp(); return key ? `${key}#exit:${direction}` : undefined;`
(for a non-Location source — an `ExitableVessel` — the stamp alone;
a vessel's secret door on a template path was never a shipped case).
Consequences, each a test: two `asIdentityPath` clones of one row no
longer share a key; two keyed holding rooms no longer share a key; a
singleton place keeps its template key (the bar's door regression
guard); a lounge satellite yields `undefined`. ⚠ The test **fails first**
only when built from clones of a ROW (`StuffApi.clone(path, undefined,
{asIdentityPath})`), not from `makeStuff(() => new CartesianLocation())`.

**D3 — The node record is `PlaceNode`, a `Document` in `lib/location/`,
collection `location_graph`.** *Question 2.* `lib/location/PlaceNode.ts`
`extends Document`, `collectionName = Collections.LocationGraph`,
`fieldMeta` persistent: `identity` (unique), `template`, `zone`,
`address`, `coords`, `edges[]`, `crossesZone`, `published`, `origin`,
`tpa`, `generation`. It is a RECORD like `ParcelRecord` (which lives in
`lib/parcel/`), not a Stuff; `lint:instanceable`'s invariants read
template `class:` values and template paths, neither of which a record
class has. Schema doc `packages/server/src/schema/location_graph.yaml`:
`owner: PlaceNode`, `ownerModule: /lib/location/PlaceNode`, `subsystem:
location-graph.md` (new), `sandbox: pass` (derived from `content`, which
is `pass`), **`reset: keep`** with the reason *"derived and rebuilt at
boot; the nightly job does not restart the process, so a wipe would
leave every lint, publish gate and board read blind until the next
boot"*. Indexes: `{identity: 1}` unique; `{zone: 1}`; `{'edges.to': 1}`;
`{crossesZone: 1}` partial on `true`; `{published: 1}`; `{generation: 1}`
(the rebuild's sweep of stale rows).

**D4 — What is a node, and what is an edge.**
- A **template node** (`origin: 'template'`) is every row whose
  effective class `instanceof Location` AND composes `SingletonMixin`
  (G-ROWS). `identity` = `template` = the row path. Every other location
  row is a **kind** and is not a node.
- A **plan node** (`origin: 'plan'`) is every circulation node of every
  row whose effective class extends `lib/location/OuterWarren`
  (`PlatWarren`, `BuildingWarren`, `DormWarren` extend it): parse
  `data.plan` with `PlatPlan.parse` (the kernel value object; the data is
  authored on the kernel's `OuterWarren.fieldMeta`), enumerate
  `nodesInOrder(cap)` where `cap` for a linear plan is
  `ceil(defaultCapacity / frontagesPerNode)`; `identity` =
  `authoredPathOf(nodeId)` when the node is authored (the authored row
  then IS the node and the plan contributes its edges), else
  `` `${parentExtent}/${nodeId}` `` — byte-identical to
  `OuterWarren.ensureNode`'s `asIdentityPath`. Edges: the spine
  (`predecessorOf` / `onwardDirectionOf` + the inverse), the branch edge
  (`branchesFrom.direction`), and one **slot stub** per frontage
  (`{dir: gateDirectionOfSlot(slot), to: null, slot, label: <programme
  row>}`) — the holding behind the gate is somebody's house, a warren one
  level down, perceived live and never stored (D8 is why that is enough
  for AC14).
- An **occupancy warren's** satellites are nothing in the graph
  (requirements decision 11) and their exits yield no discovery key (D2).
- **Edges** project from the effective row's `exits:` map:
  `{dir, to: destination, door?, oneWay?, bidirectional?, minutes:
  edgeMinutes?, kind?}`. Code-installed exits are not in rows and are
  not projected. **TPA routes** are a declared second edge kind: a row
  carrying `routes:` and `seatIn:` (read as data, by field name — the
  kernel names no pack class) contributes `tpa: {role: directionality,
  boardLabel, routes: [{to: <destination node's seatIn row>, fee,
  departures}]}` onto the node of its `seatIn` room. They are in the
  graph so the offline boundary's reverse-edge query (D9) can tell the
  Authority its timetable lost a stop.
- `crossesZone` = zone-of-source ≠ zone-of-destination, both path-based
  (`ZoneApi.resolveZoneForPath`). `published` is denormalised from
  `ParcelApi.coveringParcelOfSync(identity)?.isPublished() ?? true`.
  `address` is `data._address ?? null` and is carried as a **grouping
  key** (requirements decision 12), never as display chrome and never as
  a key.

**D5 — The projection and the queries live on `NavigationLogic`; the
state and the warm live on `LocationGraphRegistry`.** `platform/idea/LocationGraphRegistry.ts`
is a `platform/idea/*Registry` singleton on the `AddressRegistry` shape:
`onCreate → rebuild()`, `canEvict`/`canDestruct` vetoes, booted from
`packages/content/platform/pack.yaml` `boot:` with `role: sync-read` and
the note *self-warming — no `Api.boot`* (**Question 4** answered:
neither an operator `boot()` nor `installFrameworkWiring`, which is
framework DI, not a content walk). `rebuild()` is idempotent: it stamps
every projected node with a fresh `generation` and deletes rows of any
other generation — which is what "droppable and rebuildable at any
moment" means in code. It exposes `isWarm()`. `NavigationLogic` gains
(all gated `FromModule('/api/navigation#NavigationApi')`, all
string-keyed): `rebuildGraph()`, `projectRow(path)`, `removeRow(path)`,
`reprojectExtent(extent)`, `nodesInZone(zonePath)`, `node(identity)`,
`pointingAt(identity)`, `interzoneSkeleton()`, `edgesIntoUnpublished()`,
`checkGraph(scope?)`; `NavigationApi` forwards each. ⭐ None takes a
`Stuff`; `lint:object-verbs` stays at 0.

**D6 — Maintenance in `DomainHook` is synchronous, after `next`, and
never fails the save.** *Question 3.* `aroundSave`: validate → `await
next(doc)` → if `NavigationApi.isGraphWarm()`, `await
NavigationApi.projectRow(path)` for the row AND every row that `extends`
it transitively (`PersistApi.find(Content, {extends: path})`, bounded by
the 32 cap — editing a parent changes every child's effective exits) →
`await NavigationApi.checkGraph(path)` and `DiagnosticApi.record` each
finding against the row. Any throw in the projection step is caught,
recorded as a diagnostic on the row, and swallowed: the graph is
derived and self-heals at the next rebuild; losing an author's save to a
derived-store hiccup would be the wrong trade. `aroundDelete`: resolve
the path before `next` (`Template.loadById(id)`), then `removeRow`. The
`isGraphWarm()` check skips the per-row work during pack install at boot
(2,544 saves before the registry warms); the registry's own rebuild
follows in the boot manifest.

**D7 — The lint ships first, over FILES, and shares its rules with the
runtime check.** *Question 7.* `scripts/check-location-graph.ts`
(`lint:location-graph`) walks `templateRows` + `effectiveRow` + the
`extendsAny` class walk, builds plain node/edge data, and runs
`lib/location/GraphInvariants.ts` — an **instance value class**
(`new GraphInvariants(nodes, parcels).findings()`, the `Light`/`Quantity`
category; no statics, so `lint:lib-statics` does not move) over plain
data. `NavigationLogic.checkGraph` feeds it projected nodes. So the lint
needs no projection and "first and alone" holds literally, and there is
one implementation of the five rules. Severities: dangling destination
**error**; `bidirectional: true` not reciprocated **error**; an edge
from a `published` parcel into an unpublished one **error**; a
cross-zone edge declared on one side only **warning, census-ratcheted**;
a singleton place unreachable from any entrance of its zone **warning,
census-ratcheted**; plain asymmetry (an exit with no `oneWay` whose far
side declares no exit back) **info, census-ratcheted**; a destination
that is a KIND row **warning** (today `StuffApi.singleton` would mint a
stray instance of it). Ratchets start at today's counts and may only
fall.

**D8 — A zone's entrances are derived.** The set of nodes in a zone with
an inbound `crossesZone` edge, plus every TPA `seatIn` room in it, plus
`defaultStartLocation` if it lies in the zone. Reachability is a walk
over non-`oneWay`-respecting edges from that set. A zone with no
entrance at all is one finding ("nothing leads here").

**D9 — `published` on the parcel, one boolean, default true.** *Question 6.*
`ParcelRecord.published: boolean = true` (persistent), `isPublished()` /
`setPublished(v)`; `TitleClaim.published?: boolean`;
`ParcelRegistry.grant` → `record.setPublished(claim.published ?? true)`
beside `setPowerBand`; `ParcelRegistry.setPublished(extent, v)` writes
the row AND appends a `parcel_events` event (`publish` / `offline`) so
the chain of title records the flip; `ParcelApi.setPublished(extent, v)`
(the `citeFeeder` precedent) and `ParcelApi.isPathPublished(path):
boolean` (sync, `coveringParcelOfSync`; an untitled path reads
published — there is no parcel to be a wall, and `lint:untitled`
already forbids shipping one). Draft vs offline is not a second field:
a claim authored `published: false` has never been live (nobody is
inside by construction); the VERB that flips a live parcel to `false`
runs the eviction. The graph re-projects the extent on every flip
(`NavigationApi.reprojectExtent`).

**D10 — Draft is a wall in `Exit.canTraverse`; the dangling exit is an
honest edge.** Two words join `TraversalGate`: `'unpublished'` and
`'unbuilt'`. `canTraverse` gains, after the `blocked` gate and before
the lock gate (so a wall reads as a wall, not as a locked door): if
`getDestinationTemplatePath()` is set and
`!ParcelApi.isPathPublished(it)` → `{ok: false, gate: 'unpublished',
reason: "<place> is not open."}` where `<place>` is the live
destination's presentation when resident else the path's leaf — sync,
never resolving the destination (the lock gate's own rule). `Exitable._applyExitSpec`
(line 612) checks `Template.findByPath(spec.destination)` before
`StuffApi.singleton`: when the row is missing it installs a path-only
`Exit` with a transient `unbuilt = true` (no `_destination`, the
`_destinationPath` kept so `look` can still name the direction),
records `DiagnosticApi.record({path: <source row>, severity: 'error',
message: "exit <dir> names <dest>, which does not exist"})`, and returns;
`canTraverse` on an unbuilt exit answers `{gate: 'unbuilt', reason:
"Nothing lies that way yet."}`. The idempotency branch treats an
existing UNBUILT exit as replaceable (destruct + reinstall) so creating
the destination row later heals it on the next hydrate. **This is what
makes AC2 true**: the boot no longer throws from `applyExits`.

**D11 — Offline is a camera: `Tombstone`.** `platform/location/Tombstone.ts`
(`class: /platform/location/Tombstone`; a `Location` with the exit face
`CartesianLocation` has — confirm `Exitable` composition when writing it),
row `packages/content/platform/content/platform/location/tombstone.yaml`
(a KIND: cloned per offlining with `asIdentityPath: `${extent}#tombstone``
and a `dataOverlay` that writes the long description — *the place that
stood here, `<extent>`, was taken offline by `<owner>`; tell them if
you were sent here*). It installs one exit, `out`, by the four-rung
cascade: (1) a published node outside the extent with an edge INTO it
(`NavigationApi.pointingAt` over the extent's nodes, first hit), (2) the
evicted mover's `startLocation`, (3) `defaultStartLocation`, (4)
`evacuationFallback`. `onExited`: when no `HasInteractive` remains,
`StuffApi.destruct(this)`. The eviction (`ParcelRegistry.offline`,
reached through `ParcelApi.setPublished(extent, false)` when the record
was live): for every node under the extent, every resident instance
(`StuffApi.findAllByTemplatePath(identity)`) → every `HasInteractive`
occupant `ContainmentApi.move(occupant, tombstone)`; then for every
published node outside the extent with an edge in, `DiagnosticApi.record({path:
<that row>, severity: 'warning', message: "exit <dir> → <place> lost its
destination: <extent> was taken offline by <owner>"})` — durable,
addressed to the pointing row, delivered to its author on the live
stream and listed by `errors` and the CMS pane. That is "tells the owner
of those exits". ⚠ Slate open 4 (offlining a warren host migrates the
role) stays open; W3 offlines ZONES of template nodes and refuses an
extent whose nodes are all plan nodes with a reason.

**D12 — The flip is `title publish <extent>` / `title offline <extent>`.**
Subcommands on the existing parcel verb (`civics/title.yaml`,
`TitleController` switch), gated on title at the extent through
`AccessApi` (the action word chosen from `TreeAction` in W3 — see
R2). Requirements decision 6 put the flag on the parcel; the parcel's
verb is `title`.

**D13 — The map kind, the path, and the writer.** *Question 5.*
- `DocumentKinds.map = {kind: 'map', naturalKey: null, contentDir:
  'maps', ext: 'yaml', onVanish: 'keep'}` with the `water-right` reason
  written in the comment AND appended to `documents.yaml`'s `because`
  (both axes, G5).
- Path: **`/home/<key>/map/<locality address>`** where `<key>` is the
  owner's `getIdentityPath()` basename (what `isOwnHomePath` keys on)
  and the locality address keeps its slashes (`terminus/city/university-avenue`).
  One document per (player, FINEST covering locality) — and because the
  address tree nests, `map terminus` is `DocumentApi.list('/home/<key>/map/terminus')`:
  a coarser read aggregates by prefix with no join, and copying
  `/home/a/map/terminus/hinkley-hills` hands over nothing else (AC13).
- Writer: **`DocumentApi.saveMap(ownerKey: string, localityAddress:
  string, data)`**, gated `FromModule('/platform/idea/api/NavigationLogic#NavigationLogic')`,
  owner derived from `ownerKey` (`/home/<basename>`), path pinned under
  `/home/<key>/map/`, `kind` pinned — the `saveInstrument` rails, because
  the writer runs inside a forced frame where the context gate must fail
  (G-WRITE). Strings first: `lint:object-verbs` does not fire.
- Document `data`: `{locality, claims: Claim[]}`;
  `Claim = {kind: 'place' | 'edge', place, label?, name?, group?, dir?,
  to?, toLabel?, channel: 'perception' | 'publication' | 'told' |
  'bought', modality?, band, firstSeen, lastSeen, recordedBy}`.
  `place` is the `getPlaceKey()` of the room; `label` its template path;
  `name` its presentation as perceived; `group` its `_address`; `to` the
  destination's place key when resident else `null` with `toLabel` =
  `getDestinationTemplatePath()` (a `DeferredDestinationExit` reads
  *"a space through this door"*). Growth rule: a new observation
  identical in `(kind, place, dir, to, channel)` to the LATEST claim for
  that key bumps `lastSeen`; a differing one appends. Nothing is ever
  removed. `told` and `bought` are vocabulary with **no writer** this
  build (requirements non-goals).

**D14 — The walked channel reads the LIVE room, never the graph.**
Requirements decision 1 says *"the server reads the graph and projects
the nodes that player perceived."* The live room is hydrated from the
same rows the graph is derived from, carries the elastic nodes the graph
does not store (holding rooms, D4), and is what `obviousExitsFor(viewer)`
already filtered through the perception gate — so the walked claim is
built from the room in hand, and the graph's readers stay exactly the
four the slate names: the lints, the publish gate, the router, the
survey act. This keeps the firewall structural (the map writer never
touches `location_graph`), and a second locality needs no graph entry
to be mappable. **Flagged for the user's eye in the handoff.**

**D15 — The perception seams are two optional hooks on `Perceiver`,
implemented by `Avatar`.** `lib/description/Perceiver.ts` interface
gains `onPerceivedPlace?(location: Stuff & Container & Exitable,
perceived: Exit[]): void` and `onReadTimetable?(stops:
PublishedStop[]): void`, both `@hook`s (framework-invoked, optional —
the `Mobile.onTraversed?` shape). `SenseController` and
`LookController.lookAtLocation` call the first right after
`obviousExitsFor(actor)` (the perception moment; the list is already
gated); `TeleportController` calls the second right after
`renderDepartures`. `Avatar` implements both, plus Mobile's
`onTraversed(via)` for the edge you used, and each delegates to
`NavigationApi.recordWalked(observation)` / `recordPublished(viewerKey,
stops)` / `recordTraversal(viewerKey, fromKey, dir, toKey)` with plain
data (strings, numbers) — the Avatar converts Stuff to keys. The band
is `PerceptionApi.effectivePerception(viewer, …)` at the moment; the
modality is left `'vision'` this build (slate open 10 is deferred).
`SandboxAvatar.shouldPersist()` is false → a vessel writes no map (R6).

**D16 — Publication is a shape method on `TravelNode`.**
`lib/travel/TravelNode.ts` gains `publishedStops(): Promise<PublishedStop[]>`
with `PublishedStop = {nodePath, arrivalRoomPath, label}`; `FastTravel`
implements it over `_routes` → `StuffApi.singleton(ref)` →
`getArrivalRoom()` + `getDestinationLabel()`; `asTravelNode` keeps
checking the two existing functions and the controller treats a missing
`publishedStops` as no publication (a network that advertises nothing is
answering honestly). `recordPublished` resolves each arrival room's
place key and locality and writes a `place` claim with `channel:
'publication'`.

**D17 — The `map` verb is the read, and it is an Avatar affordance.**
`packages/content/platform/content/platform/cmd/perception/map.yaml` +
`platform/idea/cmd/perception/MapController.ts`, listed on
`Avatar.commandContributions.self` beside `help`/`wiki`/`press` (players
own `/home`; `Perceiver` is composed on NPCs too). Bare `map`: the
localities you hold a map of. `map <locality>` (one optional `greedy`
string arg — the article defect noted in `instrumentation.md`): the
places grouped by `group` (address) when declared, else by zone, with
each place's edges; a claim is marked `walked` or `published`; where the
latest two claims for one `(place, dir)` disagree, BOTH render with
their `lastSeen` ("you recorded an exit east on <date>; on <later> you
saw none"). A locality with no document: *"You have no map of <X>."*
Renders MML to self via `MessageApi.scene(...).toSelf(...)` — **no card,
no `CardId` edit** (non-goal). AC12 is structural: the controller reads
only `DocumentApi.list` under the actor's own home.

**D18 — A new subsystem doc, not a blurb.** `docs/subsystems/location-graph.md`
is written in W5; the `CLAUDE.md` map line is the sweep's (worktree rule
5). Existing docs touched: `boundary.md` (the two new gates, the unbuilt
edge), `concealment.md` (the discovery key ladder), `parcel.md`
(`published`), `document-store.md` (`map`), `fasttravel.md`
(`publishedStops`), `location.md` (the place key), `lint-family.md`
(the new gate).

---

## ⭐⭐ Host placement

| what | host | what composing it claims |
|---|---|---|
| `getIdentityStamp()` | `Stuff` (`lib/stuff/Stuff.ts`) | every object can say whether an identity was minted for it — true by construction (the slot exists on every Stuff); a null answer is honest, not a gap. Not a capability, a read. |
| `getPlaceKey()` | `Location` (`lib/stuff/Location.ts`) | every PLACE has a durable handle or honestly none. ⚠ Not on `Stuff`: a Thing's handle is a different question (chattel id) and putting the ladder on the root would claim the persistence-key rung for every Persistable Thing. Not on `Exitable`: a vessel is Exitable and is not a place. |
| `unbuilt` (transient) + the `'unpublished'`/`'unbuilt'` gates | `Exit` (`lib/boundary/Exit.ts`) | every exit can be asked whether its far side exists and is open. The publish read is sync and never resolves the destination (the lock gate's own rule). |
| `PlaceNode` record | `lib/location/PlaceNode.ts` (a `Document`) | nothing composes it; `ParcelRecord`'s shape. |
| `GraphInvariants` value class | `lib/location/GraphInvariants.ts` | pure over plain data; imported by a script and by the Logic; no static surface. |
| `LocationGraphRegistry` | `platform/idea/` singleton | the warm + the state; `AddressRegistry`'s shape; residency-vetoed. |
| projection / queries / record / read | `NavigationLogic` + `NavigationApi` | the string-keyed graph home the requirements chose. Nothing object-first. |
| `published` | `ParcelRecord` (one field) + `TitleClaim` | a readiness declaration about content on the record that already carries title, chain-of-title and the path gate. Requirements decision 6 records the debt honestly; nothing else joins the record. |
| `onPerceivedPlace?` · `onReadTimetable?` | `Perceiver` interface (optional `@hook`s) | declaring an optional hook claims nothing of a composer that does not implement it (an NPC perceiver stays a no-op); the only implementer is `Avatar`. ⭐ No guard is needed in `Sense`/`Look`/`Teleport`: they already narrow on `isPerceiver`, and calling an optional member is the `Mobile.canTraverse?` idiom. |
| the three map writers (`onPerceivedPlace`, `onReadTimetable`, `onTraversed`) | `Avatar` (`lib/character/Avatar.ts`) | players own a `/home/<self>` branch; a vessel (`SandboxAvatar`) inherits them and declines via `shouldPersist()`. If an NPC guide ever wants a map, it implements the hooks — a deferred seam, not a guard. |
| `publishedStops()` | the `TravelNode` shape (kernel) · implemented by `FastTravelMixin` (tpa pack) | a travel network can say what it advertises; a node without the method advertises nothing. |
| `Tombstone` | `platform/location/Tombstone.ts` + the kind row | an instanceable Location; `Offstage`/`VoidLocation` are its siblings. Named for what it IS (a marker where a place stood), a noun. |
| `map` verb | `Avatar.commandContributions.self` | the read is the player's; see D17. |
| `title publish` / `title offline` | the existing `title` view + `TitleController` | no new affordance. |

⭐ The test, applied: no site in this plan adds `if (isAvatar(x))` to a
mixin to re-narrow its host. Where the host set is players, the code is
on `Avatar`; where it is places, on `Location`; where it is every
object, on `Stuff` and honest about null.

---

## Convention conformance

Checked against the current tree this cycle.

- **`props:` / `cast:`** — the tombstone row authors neither; unaffected.
- **Locations, not rooms** — `Tombstone` is a `Location`; no `*Room`
  name; `FurnishableRoom` untouched.
- **Path pattern `<root>/<branch>/`** — row `/platform/location/tombstone`;
  view `/platform/cmd/perception/map`; controller
  `/platform/idea/cmd/perception/MapController`; registry
  `/platform/idea/LocationGraphRegistry`; the Logic stays at
  `/platform/idea/api/navigation` (the sanctioned Logic exception).
- **Module categories** — `PlaceNode` (record Document, `lib/`),
  `GraphInvariants` (value object, `lib/`), `LocationGraphRegistry`
  (platform/idea registry singleton), `Tombstone` (platform/location
  class), `MapController` (controller), `map.yaml` (command view),
  `check-location-graph.ts` (lint script). **No new category, no free
  helper, no `eslint-disable`.** The projection's class test is a
  module-private function inside the registry (the `isMaterialClass`
  precedent is module-private too).
- **Module scope declares** — the registry warms in `onCreate`; the
  Api's tail `SecurityApi.decorateApiClass(NavigationApi)` is already
  there.
- **Import boundary (`lint:imports`)** — `lib/` files import only inside
  `src/mud/` (`GraphInvariants` imports nothing; `Exit` adds
  `api/parcel`, `api/diagnostics`; `Exitable` adds `lib/stuff/Template`,
  already a lib import); the script imports `lib/location/GraphInvariants`
  (the `check-schema-docs` precedent); the tpa pack imports the kernel
  by specifier only.
- **Verbs on objects** — `obviousExitsFor`, `getPlaceKey`,
  `publishedStops`, `isPublished` are methods; every new Api static takes
  strings or plain data first; `lint:object-verbs` stays 0.
- **Person keys** — `ownerKey` is `getIdentityPath()`'s basename, never
  a template path (`lint:person-keys`).
- **Collections** — `Collections.LocationGraph` from the generated enum,
  never a literal (`lint:schema`).
- **Lint gates this build must pass**: `lint:schema`, `lint:instanceable`,
  `lint:locations`, `lint:presentation` (a Location-direct class must
  compose `Perceptible` — `Location` imports it at line 29; confirm when
  writing `Tombstone`), `lint:field-meta`, `lint:mixin-names` (no new
  mixin), `lint:object-verbs`, `lint:lib-statics`, `lint:imports`,
  `lint:module-scope`, `lint:gates`, `lint:untitled`,
  `lint:verb-collisions` (`map` is new; `title` gains subcommands),
  `lint:controller-rows`, `lint:arg-kinds`, `lint:binder-models`,
  `lint:thin-forwarder`, `lint:test-bootstrap`, `lint:drive-scripts`,
  `lint:person-keys`, and the new `lint:location-graph` — run as
  `pnpm -C packages/server lint:family`.

---

## Waves

Each wave lands alone, ends at one commit, and is gated by
`pnpm test:near` + the touched pack's vitest + `lint:family`. `pnpm test`
runs twice: before the MR opens, and at `/finalize`.

### W0 · The five invariants are a lint — `build(location-graph W0): the graph invariants are a lint over the rows`

**Implements** D7, D8. **Files:** `lib/location/GraphInvariants.ts`
(+ `__tests__/GraphInvariants.test.ts`), `scripts/check-location-graph.ts`
(+ a test beside it on the `check-untitled-paths` shape),
`packages/server/package.json` (`"lint:location-graph": "tsx
scripts/check-location-graph.ts"` — `lint:family` derives the roster),
`docs/lint-family.md` (one entry).

**What it does.** The script builds plain nodes from `templateRows` +
`effectiveRow`: a row is a place iff its effective class
`extendsAny(cls, LOCATION_ROOTS)` and `composesMixin(…, 'SingletonMixin')`
through the class walk (reuse `check-location-classes.ts`'s `extendsAny`
by export, or lift it into `pack-roots.ts` — lifting is preferred, it is
the second consumer); edges from `data.exits`; zone by `ancestorPaths`
against rows whose class walk reaches the two `ZONE_ROOTS`; parcels and
`published` from every `pack.yaml`'s `requires.title[]` (default true);
TPA `seatIn` rooms as entrances. `GraphInvariants` returns findings
`{rule, severity, path, dir?, detail}`. Ratchet ceilings for the three
census rules are constants in the script with today's counts printed on
first run and recorded in the commit.

**Acceptance.** `pnpm -C packages/server lint:location-graph` green on
the tree as shipped; a unit test shows each of the seven rules firing on
a fixture graph; deleting a destination row in a scratch copy makes the
dangling rule fire naming row + direction. Covers AC1 (the file half),
AC3.

### W1 · A discovery keys on the place — `fix(concealment): a discovery keys on the PLACE, not its lineage`

**Implements** D1, D2. **Files:** `lib/stuff/Stuff.ts`
(`getIdentityStamp`), `lib/stuff/Location.ts` (`getPlaceKey`),
`lib/boundary/Exit.ts` (`getDiscoveryKey`), `lib/boundary/__tests__/Exit.discoveryKey.test.ts`
(new), `docs/subsystems/concealment.md` (the ladder).

**The test, written first and watched fail** (requirements decision 9):
clone a permissive room row twice with `asIdentityPath: 'A'` / `'B'`
(a test-content row under `__tests__` or an existing permissive kind
row), install a `concealment: hidden` exit `north` on each via
`installExit`, `PerceptionApi.recordDiscovery(viewer, exitA)`, assert
`PerceptionApi.hasDiscovered(viewer, exitB) === false`. Expectation
today: `true`. Three more cases: two clones given distinct
`setPersistenceKey` values; a `SingletonCartesianLocation` singleton
whose key equals the template form `<path>#exit:north` (the regression
guard); a clone with no stamp, no key, no Singleton → `undefined`.

**Acceptance.** The new test goes red then green; `Exit.concealment`,
`Hiding`, `Concealable` tests untouched and green. Covers AC8, AC9.

### W2 · The graph — `build(location-graph W2): the world's shape is a collection, rebuilt at boot and kept at the chokepoint`

**Implements** D3, D4, D5, D6, D10's unbuilt half. **Files:**
`packages/server/src/schema/location_graph.yaml` → `pnpm gen:schema`;
`lib/location/PlaceNode.ts`; `platform/idea/LocationGraphRegistry.ts`;
`platform/idea/api/NavigationLogic.ts` + `api/navigation.ts` (the
methods in D5); `platform/idea/hooks/DomainHook.ts` (D6);
`lib/boundary/Exitable.ts` `_applyExitSpec` + `lib/boundary/Exit.ts`
(`unbuilt`, the `'unbuilt'` gate); `packages/content/platform/pack.yaml`
`boot:` entry for `/platform/idea/LocationGraphRegistry` (+ its row
`packages/content/platform/content/platform/idea/LocationGraphRegistry.yaml`
on the `MaterialCatalogue` row's shape); tests:
`platform/idea/__tests__/LocationGraphRegistry.test.ts` (project a
fixture tree: template nodes, a branched plan's circulation nodes and
slot stubs, a TPA block, `crossesZone`, the generation sweep),
`platform/idea/hooks/__tests__/DomainHook.graph.test.ts` (a save
re-projects the row and its children; a projection throw records a
diagnostic and the save still lands), `lib/boundary/__tests__/Exitable.unbuilt.test.ts`
(a missing destination installs an unbuilt exit, records a diagnostic,
and `canTraverse` refuses with `gate: 'unbuilt'`).

**Acceptance.** A fresh boot stands the registry up and
`NavigationApi.nodesInZone('/world/terminus/university-avenue')` returns
the crossing with three edges and `crossesZone: true` on `south`;
`pointingAt(arrival-gate)` includes the crossing; `interzoneSkeleton()`
is small and names the crossing↔gate pair; the hook re-projects a CMS
save within the same request; `checkGraph(path)` on a row with a
dangling exit yields the finding and `errors` lists it; a world with a
dangling exit in content **boots**. Covers AC1 (the runtime half), AC2,
AC11's unbuilt case.

### W3 · Draft is a wall, offline is a camera — `build(location-graph W3): published lives on the parcel; a dark place evicts and says who to tell`

**Implements** D9, D10 (the unpublished gate), D11, D12. **Files:**
`lib/parcel/ParcelRecord.ts` (`published`, `TitleClaim.published`),
`platform/idea/ParcelRegistry.ts` (`grant` stamp, `setPublished` +
event, `offline` eviction), `platform/idea/api/ParcelLogic.ts` +
`api/parcel.ts` (`setPublished`, `isPathPublished`),
`lib/boundary/Exit.ts` (`'unpublished'` gate), `platform/location/Tombstone.ts`
+ `packages/content/platform/content/platform/location/tombstone.yaml`,
`packages/content/platform/content/platform/cmd/civics/title.yaml` +
`platform/idea/cmd/civics/TitleController.ts` (`publish` / `offline`),
`packages/server/src/schema/parcels.yaml` + `parcel_events.yaml`
(document the field and the two event kinds), `docs/subsystems/parcel.md`,
`docs/subsystems/boundary.md`; tests beside each (`ParcelRecord`,
`ParcelRegistry.published`, `Exit.unpublished`, `Tombstone`,
`TitleController`).

**Acceptance.** A pack claim `published: false` makes every exit into
the extent refuse with a reason naming the place and the boot survives;
`title offline <extent>` as the title holder moves a player standing
inside to a tombstone whose description names the extent and its owner,
whose `out` leads to the published room that pointed in, which destructs
when they leave; the pointing row carries a diagnostic naming the lost
destination; `title publish` reopens it and the graph's `published`
follows. Covers AC10, AC11.

### W4 · A map you own, and it can be wrong — `build(location-graph W4): a player owns a map of each locality they know, written when they look and never corrected`

**Implements** D13–D17. **Files:** `lib/document/DocumentKinds.ts` +
`packages/server/src/schema/documents.yaml` (the `because` line);
`api/document.ts` + `platform/idea/api/DocumentLogic.ts` (`saveMap`);
`lib/description/Perceiver.ts` (the two hooks); `lib/character/Avatar.ts`
(the three implementations + the `map.yaml` affordance);
`platform/idea/cmd/perception/SenseController.ts`,
`LookController.ts`, `platform/idea/cmd/movement/TeleportController.ts`
(the three call sites); `lib/travel/TravelNode.ts` (`publishedStops`,
`PublishedStop`); `packages/content/tpa/src/lib/FastTravel.ts`
(implementation); `platform/idea/api/NavigationLogic.ts` +
`api/navigation.ts` (`recordWalked`, `recordPublished`,
`recordTraversal`, `readMap(ownerKey, localityPrefix)`);
`packages/content/platform/content/platform/cmd/perception/map.yaml` +
`platform/idea/cmd/perception/MapController.ts`; `docs/subsystems/document-store.md`,
`fasttravel.md`; tests: `NavigationLogic.map.test.ts` (claim dedupe,
append-on-change, prefix aggregation, the publication claim),
`MapController.test.ts` (no document → "no map of"; disagreement renders
both), `tpa/src/__tests__/FastTravel.publishedStops.test.ts`,
`Avatar.map.test.ts` (a vessel writes nothing; a forced arrival writes).

**Acceptance.** Walking gate → crossing → campus gate then `map
terminus` lists three places and the two edges used and nothing else;
`map hinkley-hills` before going says there is no map; reading the board
puts Hinkley Hills' stop on the map marked published; walling an exit
by wizard leaves the old claim until the next `look`, after which both
render; `eval`-copying `/home/A/map/terminus/hinkley-hills` to `/home/B/…`
lets B `map hinkley-hills`; `lint:object-verbs` still 0. Covers AC4–7,
AC12–18 (AC16 by the declared-kind reset rule; AC17 by D2 + D13's
`getPlaceKey()` null → no claim).

### W5 · The drive, the docs, the slate — `drive(location-graph): <what driving found>` · `docs(location-graph): the subsystem doc`

`packages/wire/tests/location-graph.dirty.wire.test.ts` (it authors a
dangling exit, offlines a zone, walls an exit — `.dirty.`), the ten
steps with their numbering; the hand-run restart (step 1's second half)
recorded here. `docs/subsystems/location-graph.md` written; the slate
compacted to what is left (`/compact-slate`), `map-slate` and
`pathfinding-slate` updated to point at the index.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the graph | — | — | `location_graph.yaml` → `gen:schema`; `PlaceNode.fieldMeta` | **`boot:` entry in `packages/content/platform/pack.yaml`** for `/platform/idea/LocationGraphRegistry` + its row; `hooks.yaml` already binds `DomainHook` | — |
| the lint | `pnpm lint:location-graph` | `package.json` script (roster derived) | reads files | — | — |
| discovery fix | — | — | — | — | — (a read) |
| `published` | `title publish` / `title offline` | existing `title` affordance | `TitleClaim.published` parsed by `ParcelRegistry.grant`; `parcel_events` kinds | claims applied at pack install | one required `greedy` string arg each — ⚠ required with no default fails closed and silent; the subcommand help names the shape |
| the wall | `go <dir>` | — | `ParcelRecord.published` | — | `Exit.canTraverse` |
| the tombstone | — | — | row `/platform/location/tombstone` (a kind; `lint:instanceable` resolves its `class:`) | cloned on demand | — |
| the map write | — (arrival `sense`, `look`, `teleport` board, traverse) | `Perceiver` hooks implemented on `Avatar`; the three call sites | `DocumentKinds.map` (PM creates no natural-key index; reset keeps it) | — | `saveMap`'s `FromModule` gate — ⚠ the Logic's module id must be exactly `/platform/idea/api/NavigationLogic#NavigationLogic` or every write silently refuses; `lint:gates` checks the string |
| the map read | `map [locality]` | **`Avatar.commandContributions.self` gains `platform/cmd/perception/map.yaml`** — a view nothing affords is dead silently | — | — | optional greedy string |
| publication | bare `teleport` | existing | `TravelNode.publishedStops` implemented in `FastTravel` | — | optional method; absent = nothing advertised |

---

## Acceptance-criteria coverage

| AC | wave |
|---|---|
| 1 told which row + direction before restart | W0 (file lint) · W2 (hook → diagnostic → `errors`/CMS) |
| 2 boots with a dangling exit | W2 (D10 unbuilt) |
| 3 non-reciprocal · unreachable · one-sided cross-zone reported | W0 · W2 |
| 4 map = places been + edges used, no more | W4 |
| 5 unvisited locality says so | W4 |
| 6 published knowledge distinguishable | W4 (D16) |
| 7 old claim kept; disagreement visible | W4 (D13 growth rule, D17 render) |
| 8 secret in one instance not in others | W1 |
| 9 ephemeral find does not persist | W1 (`getPlaceKey()` null) |
| 10 offline evicts · refuses naming the place · tells the owner | W3 |
| 11 exit into never-published content refuses, boot survives | W3 (+ W2's unbuilt) |
| 12 nothing crosses the wire unearned | W4 (structural, D17) + drive step 10 |
| 13 copy to another tree, read as own; one locality only | W4 (D13 path) — copied by wizard `eval`; no player verb (non-goal) |
| 14 lot-7 survives reap and re-mint | W4 — the place key is the slot's extent (G-ID); the gate edge from `onTraversed` |
| 15 group by building where declared | W4 (`group` = `_address`, D17) |
| 16 survives the nightly reset | W4 (declared kind → `wipe-except` keeps it; `onVanish: keep`) |
| 17 lounge room is honestly nothing | W1 + W4 (null key → no claim) |
| 18 second locality + second player need no engine change | W4; demonstrated in the drive with Hinkley Hills + a second session |

Nothing unmapped.

---

## Test & gate strategy

- **Unit (Vitest, beside the source):** `GraphInvariants` rules;
  `Exit.discoveryKey` (fails first); `LocationGraphRegistry` projection +
  generation sweep; `DomainHook` re-project + swallow; `Exitable.unbuilt`;
  `ParcelRecord.published` + `grant`; `Exit.unpublished`; `Tombstone`
  cascade + self-destruct; `NavigationLogic` map writes (dedupe, append,
  prefix read); `MapController` render; `FastTravel.publishedStops`;
  `Avatar.map` (vessel writes nothing; forced frame still writes).
  Everything touching the wired runtime imports `test-bootstrap`
  (`lint:test-bootstrap`).
- **Only the drive can prove:** the boot survives a dangling row (hand
  restart, recorded); the live eviction with a player inside; the board
  → map; the wire-payload inspection (step 10) — ⚠ the wire drive is
  not the live drive: step 10 is a browser step, recorded in the plan.
- **Gates:** `pnpm -C packages/server lint:family` after every wave;
  `pnpm test:near` per wave; `pnpm test` exactly twice.

---

## Risks & opens

- **R1 — the dorm's hidden exit (drive step 8).** `dormroom.yaml`
  authors no exits; a shared hidden exit must exist in two rooms of one
  template to drive the fix. Default: the wire drive installs one by
  wizard `eval` (`room.installExit(TemplatePaths.defaultExitKind, {direction:
  'down', destination: …/cistern, concealment: 'hidden'})`) in two
  provisioned rooms — the mechanism under test is the key, not the
  content. Alternative: author `exits: {down: {destination: …/cistern,
  concealment: hidden, hint: …}}` on the row — forty rooms over one
  flooded cistern is a fiction cost. **The user's call; the build
  proceeds on the default and says so in the MR.**
- **R2 — the `TreeAction` for the publish flip.** Not opened this cycle.
  W3 reads the union in `lib/access` and picks the parcel-mutation
  action; if none fits, `AccessApi.can(giver, 'offline', zone)` by
  resource. Never a wizard check.
- **R3 — places with no resolvable locality** write no map claim. The
  W0 lint censuses "a singleton place whose address resolution is
  `none`" as info so the count is visible; the drive rooms all resolve
  (verified addresses above).
- **R4 — the census counts may be large** (plain asymmetry across 197
  edges). Ratchets, not errors; the first run's numbers go in W0's
  commit message.
- **R5 — hook cost at pack install.** `isGraphWarm()` skips the per-row
  work until the registry has warmed once; after that each CMS save is
  one upsert plus a bounded `extends` fan-out.
- **R6 — the holodeck.** A vessel perceiving circle rooms must not write
  real geography; `shouldPersist()` false → no map write. Documents are
  `pass` under the sandbox, so this is the only thing stopping it — a
  test pins it.
- **R7 — `look` spam.** Every bare `look` is a write; the dedupe rule
  (bump `lastSeen`) bounds growth to the number of distinct observations.
- **R8 — the requirements' D1 wording vs D14.** Flagged for the user:
  the walked claim reads the live room, not the graph. Same truth, no
  join, firewall structural.
- **R9 — the slate's "scheme 2 mints identity" is false** (G-ID). The
  plan's ladder covers it; the slate is corrected at compaction.
- **R10 — `nodesInOrder` for a linear plan is unbounded**; the cap from
  `defaultCapacity / frontagesPerNode` must be computed or the
  projection loops to `maxNodes`.
- **R11 — reading `routes:`/`seatIn:` by field name** couples the
  projection to the tpa pack's field names without an import. Recorded
  as a lean; the alternative (a kernel `TravelNode` row shape) is the
  router build's.

---

## Deferred seams

- **Routing** — the five queries + `interzoneSkeleton` are the router's
  inputs; time-varying TPA edges and planning on the player's map →
  `pathfinding-slate` (with slate § 18 attached).
- **`told` / `bought` channels** — vocabulary on `Claim.channel`, no
  writer; attribution of a lie → `location-graph-slate § 9` +
  `accountability.md`.
- **Modality on a claim, coverage, epoch ceiling** → slate §§ 10, 11, 16
  (open 10, open 6).
- **The map market, decay, a copy verb** → slate §§ 12, 17.
- **The renderer and its card** → `map-slate` (unblocked by this build).
- **Structures** — `group` is the attach point; a structure node is one
  more grouping key → `structures-slate`.
- **Offlining a warren host / whole warren** → slate open 4.
- **Occupancy-warren live indexing** — deliberately none; the lean stays
  in the slate.
- **An NPC that keeps a map** — implement the two `Perceiver` hooks on
  the NPC class; nothing else changes.

---

## Critical files

Read first, in this order:

1. `docs/requirements/location-graph-requirements.md` ·
   `docs/slates/builds/location-graph-slate.md` §§ 3–6, 9, 13–16
2. `packages/server/src/mud/lib/boundary/Exit.ts` (`getDiscoveryKey`,
   `canTraverse`, `TraversalGate`) · `lib/boundary/Exitable.ts`
   (`_applyExitSpec`, `obviousExitsFor`, `verifyOutboundExits`)
3. `lib/stuff/Stuff.ts` (`getIdentityPath`, `_identityStampOf`, the
   stamp gate) · `lib/stuff/Location.ts` · `lib/persistence/Persistable.ts`
   · `platform/idea/api/PersistableLogic.ts:1180`
4. `platform/idea/hooks/DomainHook.ts` · `hooks.yaml` ·
   `backend/PersistenceManager.ts:797` · `platform/idea/api/PackLogic.ts:3333`
5. `api/navigation.ts` · `platform/idea/api/NavigationLogic.ts` ·
   `platform/idea/AddressRegistry.ts` + `api/AddressLogic.ts:259` ·
   `platform/idea/MaterialCatalogue.ts` · `backend/BootstrapManager.ts:209`
6. `lib/stuff/Template.ts` (`findByClass`, `_materialize`,
   `ancestorPaths`) · `api/zone.ts:159` · `lib/location/PlatPlan.ts` ·
   `lib/location/OuterWarren.ts:486–520`
7. `lib/parcel/ParcelRecord.ts` · `platform/idea/ParcelRegistry.ts:369` ·
   `api/parcel.ts` · `platform/idea/cmd/civics/TitleController.ts` ·
   `packages/content/platform/content/platform/cmd/civics/title.yaml`
8. `lib/document/DocumentKinds.ts` · `api/document.ts` ·
   `platform/idea/api/DocumentLogic.ts:38–110, 282` ·
   `api/execution-context.ts:523` · `packages/server/src/schema/documents.yaml`
9. `lib/spatial/Mobile.ts:385–570, 721` · `lib/character/Avatar.ts:242,
   879` · `lib/description/Perceiver.ts:100–160` ·
   `platform/idea/cmd/perception/SenseController.ts:150–200` ·
   `LookController.ts:85–120, 230–245` · `platform/idea/cmd/movement/TeleportController.ts:100–125`
10. `lib/travel/TravelNode.ts` · `packages/content/tpa/src/lib/FastTravel.ts:330–470`
11. `scripts/check-location-classes.ts` · `scripts/pack-roots.ts` ·
    `scripts/check-schema-docs.ts` · `scripts/check-object-verbs.ts`
12. `packages/server/src/schema/parcels.yaml` · `beliefs.yaml` ·
    `lib/persistence/SchemaDoc.ts`
13. `packages/wire/tests/fishing.dirty.wire.test.ts` ·
    `packages/wire/src/harness/index.ts`
14. Content: `…/university-avenue/location/crossing.yaml` ·
    `…/terminal/location/arrival-gate.yaml` · `…/duncan-hall/location/dormroom.yaml`
    · `…/hinkley-hills/idea/lot-holder.yaml` · `…/hinkley-hills/thing/tpa.yaml`
    · `packages/content/platform/pack.yaml` · `packages/content/terminus/pack.yaml`

---

## Drive record

*(appended at build time, not at plan time)* — the output of running
the requirements doc's ten-step drive against the running game
(`packages/wire/tests/location-graph.dirty.wire.test.ts`), the hand-run
restart of step 1, the browser inspection of step 10, and what each
found. Precedent: `farming-plan.md § Checkpoint A — the drive record`.
