# The location graph — implementation plan

Executes [location-graph-requirements.md](../requirements/location-graph-requirements.md)
(**kind: feature · leads from: kernel**; **one build in two stages**).
**Stage A — instance addressing** (executes
[instance-addressing-slate](../slates/builds/instance-addressing-slate.md)):
the uniqueness invariant scans by the ROW so it covers stamped keyed
hosts, a row can be enumerated honestly, the durable per-instance handle
gets its sanctioned name (`<row>#<key>`) and `Exit.getDiscoveryKey()`
reads it, `asIdentityPath` is validated against a namespace the family
declares, the market stall keys on its pitch, and the chattel pin's scope
stops diverging from the record's. **Stage B — the graph, and the map you
own** (executes `location-graph-slate`): a derived, persisted projection
of every location and its exits (its own collection, sharded by zone,
rebuilt at boot, maintained at the content write chokepoint), a **map
document per locality a player knows** written when they perceive a place
and **never re-reconciled against the truth**, `published` on the parcel
with the draft-wall / offline-camera split, and the **five graph
invariants as a lint first and alone**. First consumers: the University
Avenue crossing, the Duncan Hall dorm warren, the Hinkley Hills plat
warren and the TPA departures board.

Branch `reqs/location-graph`, worktree `build-3`. Requirements as of
commit `1cbda954a` (decision 9a rewritten — *iff THE NAME is durable*;
the guest and corpse mints carved out as named non-goals).

**Wave numbering:** Stage A is `A0…A4`, Stage B is `B0…B4`. Every A-wave
lands before any B-wave. The first draft of this plan numbered Stage B
`W0…W5`; `W0→B0`, `W2→B1`, `W3→B2`, `W4→B3`, `W5→B4`, and **`W1` is
deleted** — its work is Stage A's (`A1`), on a different footing (see
§ Plan-level decisions D1/D2, superseded).

⚠ Four premises in the inputs are corrected below by grounding, and the
corrections are load-bearing: **holding rooms carry no minted identity**
(§ Grounding G-ID), **the acting author is `null` inside the forced
arrival `sense`** (§ Grounding G-WRITE), **the slate's census of six
mint sites is thirteen, in five shapes** (§ Grounding G-MINT, with the
census verdicts), and ⚠⚠ **`SandboxAvatar` does NOT override
`getIdentityPath()`** — `Stuff.ts:528` and `sandbox.md` describe the
override as if it were this class's, and the wire body is additionally
stamped with the identity it projects, which is the one thing
`Stuff.ts` says the index must never see (§ Grounding G-WIRE, DA8,
wave A3). None reopens scope.

⛔ **CORRECTED AT BUILD TIME (2026-10-05).** The second half of that
fourth premise is wrong: `lib/character/Avatar:710` **already
overrides `getIdentityPath()` for the whole family**, so the wire body
inherits the projection and the stamp was never what carried it. A3's
note records how the sabotage check found it and why RA4's ordering
hazard never existed. The class-level claim stands (`SandboxAvatar`
itself overrides nothing); the causal claim does not.

⭐⭐ **A2 is a census-and-ratchet, not a shape validator.** The gate's
question is *every mint site names what keys on its identity* (its own
durable record · another record that references it · a lookup that must
resolve to this instance — ⚠ never the mint's own uniqueness probe,
which is circular). The census is done (G-MINT): **eleven of thirteen
sites are justified; the guest and the corpse are not, and both are
named non-goals** this build leaves alone. So A2 installs the rule and
the meter and **unmints nothing** — the honest outcome; the count falls
per-site, by whoever owns the site.

⚠ **The DB cost of this build is the stall's records and nothing else.**
Stage A re-keys the market stall counter (A3): its `holder_snapshots` rows
(scope under `/world/terminus/market/thing/stall/`) and the `chattel`
places under them are dropped on the dev DB (policy: no migrations; a
rename is a drop). **No warren record moves, no avatar record moves, no
holding room is re-keyed**, and the circulation nodes whose identity shape
changes in A2 have no records at all. The build must not drop anything
wider.

---

## Grounding

Verified by opening files this cycle (2026-10-04). File paths are
`packages/server/src/mud/` unless they start with `packages/` or
`scripts/`.

### Stage A — the index, the scan, the mints, the stall

- **G-IDX — the registry's keying, and the trie under it.**
  `api/stuff.ts:230` `#updateIndexes` keys `byTemplatePath` on
  `Stuff._identityStampOf(obj) ?? obj.getTemplatePath()` (*"deliberately
  the raw slot, never the overridable method — a sandbox vessel projects
  another identity and must not index there"*). The index is a
  `PathTrie<Stuff>` (`lib/collections/PathTrie.ts:53`) with `insert:61`,
  `remove:75`, `exact:89`, **`glob:107`**, `longestPrefix:126`,
  `longestPrefixPath:136`, `clear:151`. The reads: `findByTemplatePath`
  (`:1438`, `exact`, throws *"expected singleton, found N"* at `:1445`),
  `findAllByTemplatePath` (`:1456`, bare `exact`), `findByPathGlob`
  (`:1497`, `glob` — backs the MQL path seed `api/mql/resolver.ts:336,778`
  and five catalogue reads), `singleton` (`:698`, `exact`, throws on >1),
  `singletonSync` (`:915`), and the clone pipeline's singleton guard
  (`:545–548`, `exact(asIdentityPath ?? templatePath)`).
  `_reindexTemplatePath` (`:1474`) skips an identity-stamped object. The
  stamp is written at `:629–631` only when `asIdentityPath` was passed.
  **⭐ Requirements decision 9b: none of this keying changes.** The
  singleton guardrail, `singleton()`, the glob seed and every
  `findByTemplatePath(<stored identity key>)` round-trip (≈180 non-test
  callers, e.g. `BankingControllerBase.ts:104`, `EmploymentLogic.ts:420,597,778`,
  `ContractLogic.ts:1454`, `PartyLogic.ts:268,319`, `CombatLogic.ts:1388`,
  `HouseController.ts:114,219`) keep resolving through `exact()`
  exactly as today.
- **G-SCAN — the needle is the defect.** `platform/idea/api/PersistableLogic.ts:146`
  `liveKeyed(scope, key)` and `:155` `assertUniqueKey(scope, key, host)`
  both scan `StuffApi.findAllByTemplatePath(scope)`. The callers that
  pass a host's own scope pass **`host.getIdentityPath()`**: `captureImpl:903→913`,
  `materializeImpl:944→953`, `restoreOrSeedImpl:1187`. For a stamped
  host that bucket holds only itself, which the scan skips at `:157`. The
  callers that pass a stored scope already pass the ROW: `cloneHost:881`
  (a `{ref, key}` whose `ref` is `good.getTemplatePath()` — `captureItem`
  writes `templatePath: good.getTemplatePath()` at `:511`) and
  `overlayOwnedGoods:1030` (`keyed.templatePath`). The record's `scope`
  field stays `getIdentityPath()` everywhere (`:903, :944, :1187`); only
  the scan's needle is wrong.
- **G-ROW — what a row read must return, from its 22 callers.** Non-test
  `findAllByTemplatePath` callers, classified by what they pass:
  - **rows** (want every instance, stamped or not): `backend/BootstrapManager.ts:226`
    (boot-manifest rows), `platform/idea/modalities/{Sound,Vision,Smell}Modality.ts:196,469,174`
    + `lib/perception/AudienceGather.ts:199` (an exit's destination row,
    `.length === 0`), `PersistableLogic.ts:147,156` (the needle),
    `platform/idea/api/BankingLogic.ts:1857` (`COIN_PATH`),
    `lib/persistence/Persistable.ts:318` (`reseedCast` — *"an instance
    anywhere suppresses the re-mint"*), `ContractLogic.ts:181` (a bench
    row standing in many venues), `:601` (an exemplar of a kind row),
    `platform/idea/cmd/perception/SurveyController.ts:241` (*"a shared
    fixture row stands in many places"*), `platform/idea/cmd/author/CloneController.ts:162`,
    `PackLogic.ts:3352` (holder organization rows → `singleton`).
  - **identities / stored scopes** (want the exact bucket): `platform/idea/cmd/charactergen/ChronicleController.ts:206`
    (`id`), `BankingLogic.ts:1892` (`scope` of a record), `ContractLogic.ts:912`
    (`issuer.templatePath`, a stored key), `lib/belief/BeliefStore.ts:636`
    (a referent's liveness), **`ConditionLogic.ts:567,570`** (the
    corpse identity collision probe — ⚠ a read that filtered the exact
    hit out would mint duplicate corpse identities).
  - ⚠ **go-live rehydration** — `PackLogic.ts:2979,2985` and
    `CmsLogic.ts:645` call `TemplateApi.restoreFromTemplate(inst)` on
    every instance in the bucket. Today a stamped clone (a stall counter,
    a corpse, a circulation node) is skipped silently; widening this to
    stamped clones would re-hydrate every minted instance from the seed
    row's data on a CMS save — the *"go-live hydration RESETS live coin
    stacks"* hazard class. **These three stay on the exact read, by
    name.**
  So the row read must be `exact(path) ∪ glob(path + '/**').filter(o => o.getTemplatePath() === path)`:
  an identity passed in still returns its exact hit (nothing nests under
  an identity), a row returns its unstamped clones plus its row-prefixed
  stamped ones, and `/platform/agent/Avatar` returns nothing (avatars'
  `getTemplatePath()` is `/platform/agent/PrimaryAvatar` — the family is
  rostered, `PlayerApi.registerAvatar / unregisterAvatar /
  findAvatarByPlayerId`, requirements AC3).
- **G-MINT — thirteen `asIdentityPath` sites, five shapes, and the
  census verdicts.** Every non-test caller (`grep -rn asIdentityPath
  --include='*.ts'`, 2026-10-04). The census question (requirements 9a,
  Stage A goals): *what keys on this identity?* — the instance's own
  durable record · another record that references it · a lookup that must
  resolve to this instance. ⚠ The mint's own uniqueness probe does **not**
  qualify (circular).

  | site | identity shape | row | what keys on it | verdict |
  |---|---|---|---|---|
  | `platform/idea/cmd/charactergen/EmbodyController.ts:724` · `platform/idea/api/PlayerLogic.ts:503,581` · `backend/TestHooks.ts:328` | `/platform/agent/Avatar/<pid>` — re-derivable from `playerId` | `/platform/agent/PrimaryAvatar` | accounts (`bank_ledger`), chronicle, transcript, grants, the snapshot's owner — the whole identity-keyed ledger set | **justified** (own record + referenced) |
  | `platform/idea/api/ConditionLogic.ts:681` (the shade) | `/platform/agent/ShadeAvatar/<pid>` — re-derivable | `/platform/agent/ShadeAvatar` | the same ledgers, attributing to the same person | **justified** |
  | `content/terminus/src/market/idea/cmd/StallController.ts:119` (the counter) | `${STALL_SEED}/<leaf>` | `/world/terminus/market/thing/stall` | its own `holder_snapshots` record (`restoreOrSeed`); `operatingLocations` / `counterPath` round-trips (`findByTemplatePath`) | **justified** (own record + lookup) — re-keyed by A4 |
  | `StallController.ts:141` (the house) | `${STALL_BUSINESS_SEED}/<leaf>` | `/trade/shopkeeping/idea/business/stall` | its operating account (`getAccountPath()` = identity, `Business.ts:339`); employment records' `organizationPath` | **justified** (referenced) |
  | `platform/idea/api/PartyLogic.ts:226` (`rec.path`) · `:358` | `/platform/idea/party/<uuid>` — not re-derivable, but **recorded** | `/platform/idea/Party` | its own `PartyRecord.path`; members' `activePartyPath` | **justified** (own record) |
  | `lib/location/OuterWarren.ts:499` (`ensureNode`) | `${parentExtent}/${nodeId}` — **re-derivable** from the plan + the extent | the warren's circulation row (Hinkley `lots/road-segment`; Duncan's `Corridor`) | a parked character's snapshot records it as `place.container` (`capturePlacement`, `PersistableLogic.ts:221`) | **justified** (referenced) — ⭐ 9a's worked case: ephemeral as an object, durably named; **shape unchanged** |
  | `platform/idea/api/ScriptLogic.ts:69` | `${parcel}/_eval` (`EvalController.ts:93`) — re-derivable from the jurisdiction | `/platform/idea/EvalScript` | `findByTemplatePath(path)` reads the previous scratch back to destroy it (`:66`) — a genuine lookup, not a mint-time probe | **justified** (lookup) |
  | `platform/idea/api/SandboxLogic.ts:355` (the wire body) | `actor.getIdentityPath()` — the REAL player's path, re-derivable | `/platform/agent/sandbox/SandboxAvatar` | the identity-keyed ledgers attribute in-circle acts to the player | **justified as a projection, wrong as a stamp** — DA8 / A3 moves the projection to the method and stops the stamp |
  | `platform/idea/Login.ts:309` (the guest) | `${Avatar.TEMPLATE_PATH_PREFIX}guest-<uuid>` (`:285`) — random | `/platform/agent/PrimaryAvatar` | nothing: unrecorded, `shouldPersist()` false | ⛔ **unjustified — named non-goal.** On the login path; its purpose is avoiding a throwaway template row; touching char-gen opportunistically is how a cheap build becomes expensive. The census RECORDS it; it is the first entry the ratchet is allowed to fall by. |
  | `ConditionLogic.ts:622` (`corpseIdentityFor:557`) | `${TemplatePaths.mortalityCorpse}/<deceased identity, slash-stripped>/<gameSecond>[-n]` | `/stuff/agent/Corpse` (`lib/paths.ts:155`) | only its own ordinal probe (`findAllByTemplatePath(base).length === 0`, `:567,570`) — circular; `reembody` never reads the corpse; belief's naming path is gated on `isPersona` (composed on `Character`, not `Creature`) | ⛔ **unjustified — named non-goal, reconciled with build-1** (`reqs/second-tier`, the carcass chain, which multiplies the mint to every non-player death and adds no reader). The slate keeps their counter-argument as a *reason to keep*, not a reader. ⭐ `corpseIdentityFor` is **byte-identical** to its pre-W0 form on that branch, so A0's probe move races nothing — the build does not go looking for a conflict. |

  Eleven justified, two carved out. `asIdentityPath` is typed `string`
  (`api/stuff.ts:438,476`); nothing validates it. ⭐ A **row-prefixed**
  identity (shade, corpse, stall, tombstone) is what requirements 9b
  calls *individuation handles row-prefixed by construction* — the prefix
  read finds them; a **family-prefixed** one (the Avatar family, the
  party) is continuity and is rostered or recorded; the circulation node
  and the eval scratch are **parcel-relative** and re-derivable. None of
  the three is a defect; the census question is the gate, not the shape.
- **G-STALL — the stall's manager and its book.** `content/terminus/src/market/thing/MarketStalls.ts:23`
  `extends Stock` (kernel `lib/retail/Stock.ts:99` composes
  `PersistableMixin`; `fieldMeta` `stockLines`, `purchasing` persistent;
  `onCreate:211` → `reset()`); one field `rentMinor`; affords
  `world/terminus/market/cmd/stall.yaml` to `peers`. Row
  `content/terminus/content/world/terminus/market/stalls.yaml` (`class:
  /world/terminus/market/thing/MarketStalls`, `rentMinor: 5`), placed by
  `square.yaml:74 props: [/world/terminus/market/stalls]` on a
  `/platform/location/Street` (`square.yaml:19`). `StallController.rent`
  (`:81–160`): `renterKey = giver.getIdentityPath()`, `ids =
  identitiesOf(renterKey)`, `findByTemplatePath(ids.counter)`,
  `hasRecord(ids.counter, renterKey)`, `clone(STALL_SEED, …,
  {asIdentityPath: ids.counter})`, **`restoreOrSeed(counter, renterKey)`**
  (`:120` — the key is the Avatar identity path), `setBusinessPath(ids.house)`,
  `capture(counter, renterKey)`; the house is re-minted with
  `appointingAuthority: {kind: 'entity', path: renterKey}` and
  `operatingLocations: [ids.counter]`; `give-up` (`:171`) finds the
  counter the same way. The seed row `thing/stall.yaml` (`class:
  /trade/shopkeeping/thing/Stock`) documents the renter-identity shape in
  its own comment. ⚠ **Not verified this cycle:** how a `props:` fixture
  on a non-Persistable `Street` has its own record restored after a
  restart (`persistence.md:914` says `applyProps` is a uniform no-op and
  holders seed) — A3 reads `seedBornWith` / `applyProps` before placing
  the pitch book; see § Risks RA1.
- **G-PIN — the pin's scope.** `platform/idea/api/ChattelLogic.ts:243`
  `pinOf(good, place)` returns `{scope: good.getTemplatePath(), key:
  good.getPersistenceKey()}`; the record it must find was written by
  `captureImpl` under `scope = host.getIdentityPath()` (`PersistableLogic.ts:903`).
  Consumer: `platform/idea/api/ResidencyLogic.ts:818` `pinNow()` →
  `PersistableApi.standUpKeyed(pin.scope, pin.key)` →
  `cloneHost(scope, key)` (`:870`: `liveKeyed(scope, key) ?? clone(scope)`
  then `materializeImpl`). Both pinned classes today (`KeptAnimal.ts:112`,
  `Plant.ts:51`) are unstamped, so identity ≡ row and the divergence is
  latent; ⚠ for a stamped keyed host neither scope alone works —
  `clone()` needs the row, the record needs the identity (§ Risks RA5).
- **G-WIRE — the wire body is filed under the identity it projects.**
  `SandboxLogic.ts:340–360` clones `/platform/agent/sandbox/SandboxAvatar`
  with `asIdentityPath: actor.getIdentityPath()` (*"the REAL identity:
  every ledger keys on it"*), then `PersistableApi.forkRuntimeState(actor,
  body)`. Because `SandboxAvatar` has no `getIdentityPath()` override
  (G2), the projection is carried **entirely by the raw stamp** — so the
  wire body and the parked field body share one exact bucket while a
  circle is open, which is exactly what `Stuff.ts:536`'s comment forbids,
  and `findByTemplatePath('/platform/agent/Avatar/<pid>')` throws
  *"expected singleton, found 2"* for that player mid-visit unless the
  field body is unregistered (`SandboxLogic.ts:350`: *"the parked body
  keeps the slot"* — the `PlayerApi` slot, not the index). ⛔ **Order
  matters for the fix**: the override must land BEFORE the stamp is
  removed. Removing the stamp alone attributes in-circle acts to the wire
  body — the promise `sandbox.md` makes hardest, and the field body's
  displacement has cost three production failures before (a channel post
  dying for everyone, the `online` resolver denied, `isConnected` making
  a player unreachable by entering their own circle). "Vessel" also
  names `lib/stuff/Vessel.ts` (a bag, a chest, a cart); the sandbox's
  good name is **wire body** (`sandbox.md:3`); the "projection vessel"
  wording sits at `Stuff.ts:528`, `SandboxAvatar.ts:2`, `Avatar.ts:1598`.
- **G-HANDLE — the handle already exists, unnamed.** `PersistableLogic.ts:972`
  `placeIdOf(host)`: `scope = getIdentityPath()`, `key` only when
  `isPersistenceKeyExplicit()`, returns `` key ? `${scope}#${key}` : scope ``
  with the recorded reason (a keyless host's stashed key is scope-derived,
  so folding it in would give one room two identities either side of its
  first capture). Public as `PersistableApi.placeIdOf(host)`
  (`api/persistable.ts:181`); callers `overlayOwnedGoods:1003` and
  `ChattelLogic.followCustody:205`. `Exit.getDiscoveryKey` (`lib/boundary/Exit.ts:407`)
  already joins with `#` (`<source>#exit:<dir>`). The key surface:
  `lib/persistence/Persistable.ts` `getPersistenceKey:219`,
  `setPersistenceKey(key, explicit = true):223`,
  `isPersistenceKeyExplicit:235`, `capturesAtShutdown:227` (*"never
  established"* when `_persistenceKey === null`).
- **Who composes `PersistableMixin`** (so who can carry a key): kernel
  `Plant`, `FurnishableRoom` (every dorm/house room), `KeptAnimal`,
  `Avatar`, `Stock`; packs `HoldingWarren`, `Field`, `Panel`, `MineRoom`,
  `MineWarren`, `Turbary`, `Wood`, `StorageNode`, `TpaTerminal`,
  `CheckRack`, `OpenWorking`, `ConsignmentShelf`. **Not** `Location`
  (`lib/stuff/Location.ts:161` composes `Addressable(AmbientLit(Atmospheric(Adornable(Container(Visible(Detailed(Perceptible(Stuff))))))))`),
  not `CartesianLocation`, not `SingletonCartesianLocation`
  (`SingletonMixin(…)`, `:26`), not `Lounge` (`world/lounge/location/Lounge.ts:37`).
  So the bar's singleton room has no key and no stamp and must still
  yield a handle (its row) — the regression guard — while a lounge
  satellite (no key, no stamp, no Singleton) must yield none.
- **`restoreOrSeed` callers and their key shapes** (the rule *a key is
  relative to its manager*): `content/residence/src/idea/HoldingWarren.ts:351`
  (`roomKeyOf(leaf):230` = `` `${holdingKey()}/${leaf}` ``, `holdingKey():225`
  = the warren's OWN persistence key), `BuildingWarren.ts:125`,
  `PlatWarren.ts:198`, `content/eternal-university/src/duncan-hall/idea/DormWarren.ts:184`,
  `content/trade-mining/src/idea/MineWarren.ts:332` + `ShoreController.ts:134`
  (`warren.memberKeyOf(cell)`), and the stall (`:120`). Plants and named
  animals key on a bare `uuid()` (no manager).
- **MQL's path seed.** `api/mql/resolver.ts:336` (`case 'path'`:
  `findByPathGlob(node.pattern)`, falling back to the Template record for
  a glob-free path *"so verbs can act on a template that has no live
  clones (e.g. `destruct /platform/agent/Avatar/foo`)"*) and `:778`
  (`part.startsWith('/')`). ⚠ A path seed is given identities as well
  as rows, so whatever backs it must keep the exact hit (G-ROW's
  definition does).
- **Lints that already touch this ground.** `scripts/check-person-keys.ts`
  (`lint:person-keys`): *"deliberately a literal, not a classifier"* —
  the `kind: 'player'` owner literal fed by `getTemplatePath()`; ratchet
  at 0. `scripts/check-identity.ts` (`lint:identity`) is the Cast/Extra
  gate, unrelated. ⚠ No ratchet over mint sites: they scale with content
  (a pack minting its own individuated things), and a ratchet over a
  content-scaling figure refuses an author for doing it right. The
  runtime assertion at the mint is the gate.

### The defect, and the identity read it needs

- **G1 — the defect site.** `lib/boundary/Exit.ts:407`
  `getDiscoveryKey()` returns `` `${this.source.getTemplatePath()}#exit:${this.direction}` `` or
  `undefined` when the source has no template path. It never consults
  identity or key. Its own doc comment (line 400) says *"`undefined` when
  the source has no durable templatePath (a shared multi-clone room)"*,
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
  the default that hides a collision, and ⭐ the default the requirements
  keep (non-goal). `Stuff._identityStampOf(stuff)` at line 645 returns
  the raw slot or `null`, peeling up to 8 proxy wrappers. It is gated by
  `Stuff.#assertStampGateAllowed` (line 695) whose allowlist
  (`#stampGateAllowlist`, line 680) admits `mud/api/stuff.ts`, the
  test-setup helper and `*.test.ts` only. **It stays gated where it is.**
  *Was an identity minted* needs no new surface:
  `getIdentityPath() !== getTemplatePath()`.
  ⚠⚠ `platform/agent/sandbox/SandboxAvatar.ts:16`'s doc comment says the
  class *"overrides `getIdentityPath()`"* to project the real player, and
  `Stuff.ts:528` repeats it. **It does not**: the class overrides
  `shouldPersist` (`:46`), `startAutoSave` (`:51`),
  `announceSessionPresence` (`:63`), `onLinkdead` (`:74`), `toString`
  (`:83`) and nothing else (G-WIRE). `Stuff.ts` imports `ProxyApi`, `SecurityApi`,
  `ModuleApi` — not `MixinApi`; a handle on `Stuff` must not narrow on
  mixins from the root (DA3 is built as per-mixin rungs for this reason).
- **G-ID — ⚠⚠ when the slot is stamped, and who has no stamp.**
  `api/stuff.ts:545` computes `identityPath = opts?.asIdentityPath ?? templatePath`
  for the singleton guard, and line 629 stamps `#identityPath` **only
  when `asIdentityPath` was passed**. Four populations follow:
  - **Circulation nodes** of an `OuterWarren` are stamped
    (`lib/location/OuterWarren.ts:499`) — ephemeral as objects, durably
    NAMED (G-MINT; requirements 9a's worked case). Their stamp stays.
  - **Holding rooms** (every Duncan Hall dorm room, every Hinkley house
    room, Seznick House's units) are NOT stamped. The keyed model is the
    persistence spine's: `restoreOrSeedImpl(host, key)` (`:1180`) takes
    `scope = host.getIdentityPath()` (= the ROW path, since nothing was
    minted) and `host.setPersistenceKey(key)`. `HoldingWarren.ts:12`
    says it outright: *"each room is a keyed instance of a REAL room row
    (scope = the room row, key = <extent>/<leaf>) — `templatePath` always
    resolves to a row (D17), per-holding uniqueness carried by the
    persistence spine's unique-key guard."* `DormWarren.ts:184` keys the
    programme on the unit parcel extent; `ParcelRecord.slotOfExtent`
    (line 391) parses the floor/position out of it. **So the slate's
    "scheme 2 mints identity" is wrong**: the per-instance durable handle
    of a holding room is **row + key** — requirements decision 9.
  - **Singleton places** (`SingletonCartesianLocation`,
    `SingletonSphericalLocation`, `Offstage`, `VoidLocation`, the
    crossing's `Street` lineage) have no stamp and no key; their one
    instance IS the row, so the row is the right handle — the behaviour
    the bar's secret door relies on.
  - **Lounge satellites** (`lib/location/Warren.ts:365` `spawnMember` →
    `createMemberSerialized`) have no stamp, no key, and compose no
    `SingletonMixin`: `undefined` is their right answer (requirements
    9a).
- `lib/stuff/Singleton.ts:33` `_mixinName = 'SingletonMixin'`,
  `Mixins.Singleton` at `lib/mixin.ts:311`; `MixinApi.isPersistable` at
  `api/mixin.ts:1585`. Branch predicates on `Stuff` (`isAgent()` at
  `Stuff.ts:1179` and siblings).
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
  the circulation template with `asIdentityPath: `${parentExtent}/${nodeId}``
  (its comment: *"Identity per instance is what makes them
  distinguishable in the registry, and it is what carries them past the
  singleton guard"*). The pack rows:
  `content/hinkley-hills/…/idea/lot-holder.yaml` (`class:
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
  ⚠ `TreeAction`'s member list was not opened this cycle — B2 reads it
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
  `lint:object-verbs` (`scripts/check-object-verbs.ts:50 EXEMPT_APIS`)
  exempts `StuffApi`, `PersistableApi`, `PerceptionApi`, `AccessApi`,
  `AddressApi`, `MessageApi` et al. but NOT `NavigationApi` or
  `DocumentApi`: every new static on those takes strings or plain data
  first.
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
  drown-here cistern under the steps. Drive step 1 needs a hidden exit
  two dorm rooms share: see § Risks & opens R1.
- The lounge satellite for drive step 2: `world/lounge/location/Lounge.ts`,
  spawned by `Warren.spawnMember` on first landing, reaped when empty —
  a second visit is a fresh instance with the same row and no handle.

---

## Plan-level decisions

### Superseded — kept for the reasoning, not the code

**D1 — SUPERSEDED (2026-10-04).** *Was:* a two-rung ladder —
`Stuff.getIdentityStamp(): string | null` (a new public read of the raw
`#identityPath` slot) plus `Location.getPlaceKey(): string | null`
(stamp ?? explicit persistence key ?? Singleton's template path ?? null).
*Why cut:* (1) *was an identity minted* is `getIdentityPath() !==
getTemplatePath()` — no new surface, cannot drift, and the raw-slot read
stays gated for the index's use alone; (2) the durable per-instance handle
**already exists** as `placeIdOf`'s `` `${scope}#${key}` ``
(`PersistableLogic.ts:973`, guarded on `isPersistenceKeyExplicit()`) and
`Exit`'s own key already uses the `#` joiner — what was missing is a
sanctioned NAME, not a ladder; (3) a handle on `Location` claimed the
persistence-key rung for places only, when goods, plants and animals carry
keys too. What survives of D1's reasoning: the handle is the TARGET's (an
exit's source), never the viewer's — the viewer key is
`BeliefStore.viewerKey` → `getIdentityPath()`, already projected, so a
vessel's finds attribute to the real player.

**D2 — SUPERSEDED (2026-10-04).** *Was:* `Exit.getDiscoveryKey()` =
`source.isLocation() ? source.getPlaceKey() : source.getIdentityStamp()`.
*Why cut:* it rode D1, and its vessel special case dissolves once the
handle is on every object (DA3). The four test cases D2 named survive
verbatim in A1. The requirements' decision 9 now states the rule D2 was
groping for: **the discovery key reads the HANDLE, and the handle is row
plus decoration, joined with `#` so substance and decoration stay
separable** — a `/` join pretends the decoration is a path segment and
loses the row, which is why `smallholding.md`'s synthesized
`<lotExtent>/<leaf>` channel shipped and was deleted.

### Stage A

**DA1 — The uniqueness scan's needle is the ROW.** *Requirements 9b.*
`assertUniqueKey(scope, key, host)` and `liveKeyed(scope, key)` keep
their signatures and their callers; inside, the scan is
`StuffApi.findAllByTemplatePath(host.getTemplatePath() ?? scope)` for
`assertUniqueKey`, and `liveKeyed`'s callers already pass the row
(G-SCAN) — it gains a one-line doc comment saying so, and a defensive
`scope` is accepted as either (the row read returns an identity's exact
hit, DA2). **The record's `scope` field does not change** (`:903, :944,
:1187` still write `getIdentityPath()`); the registry's keying does not
change. Consequence: a second live stall counter keyed on an occupied
pitch THROWS at `restoreOrSeed`, where today it silently stands up a
duplicate (AC4).

**DA2 — One row read, one identity read, both on `StuffApi`; the
singleton read is untouched.** *Requirements 9b; the slate's open 1 and
3 answered.*
- `findAllByTemplatePath(row): Stuff[]` **becomes what its name says**:
  `[...exact(row), ...glob(row + '/**').filter(o => o.getTemplatePath() === row)]`,
  de-duplicated — ⚠ **the filter is scoped to the glob half only**; an
  earlier spelling of this line applied it to the whole union, which
  would have dropped an identity's exact hit (the corpse probe below is
  the case that found it). Unstamped clones, keyed-unstamped warren rooms
  and row-prefixed stamped clones (the stall, a corpse, the tombstone)
  all return; an identity passed in returns its exact hit because nothing
  nests under an identity; a continuity family's
  namespace (`/platform/agent/Avatar`) returns nothing, by design — the
  family is rostered on `PlayerApi` (AC3's second half; a doc line, no
  code).
- `findByIdentityPath(path): Stuff[]` — **new**, the honest name for the
  bare `exact()` bucket: one hit for a minted identity, N for unstamped
  clones sharing the template fallback. The three go-live rehydration
  sites (`PackLogic.ts:2979,2985`, `CmsLogic.ts:645`) move to it **by
  name and with a comment** — widening them would re-hydrate every
  minted instance from the seed on a CMS save (G-ROW). The identity
  callers in G-ROW (`ChronicleController:206`, `BankingLogic:1892`,
  `ContractLogic:912`, `BeliefStore:636`, `ConditionLogic:567,570`) move
  to it — ⚠⚠ **and for `ConditionLogic:567,570` this is MANDATORY, not
  honesty.** The corpse's ordinal probe asks
  `findAllByTemplatePath(<a minted identity>).length === 0`; with the
  row filter applied to the whole union the exact hit is **dropped**,
  because a corpse's template path is the corpse ROW and never the
  identity it was stamped with — the probe reports "free" for a taken
  identity and **two deaths in one game-second collide**, the precise
  hazard the `∪ exact` form exists to prevent. Scoping the filter to the
  glob half (above) removes the hazard by construction, and the probes
  move anyway: a probe for an IDENTITY must not depend on how a ROW read
  scopes its filter. A0 moves both probes to `findByIdentityPath`
  **before** redefining the row read, and a test pins a second death in
  the same game-second getting its ordinal. ⭐ `corpseIdentityFor` is
  byte-identical on `reqs/second-tier` (G-MINT), so this races nothing.
  ⭐ The general shape, worth stating because the filter is load-bearing:
  **the row filter is correct for a row and wrong for an identity**, which
  is why the two reads have to be two names rather than one tolerant
  function.
- `findByTemplatePath` (singleton-or-throw), `singleton`, `singletonSync`,
  the clone guard and `findByPathGlob` are **not touched**. The
  requirements record why: splitting or widening them would break the
  singleton guardrail and every stored-key round-trip for nothing.
- MQL's path seed (`resolver.ts:336, 778`): a **glob-free** pattern
  routes through `findAllByTemplatePath` instead of `findByPathGlob`, so
  `/world/terminus/market/thing/stall` names every counter and
  `/…/dormroom` every room (the wizard's drive-step-3 read); a pattern
  with glob characters is unchanged. The `destruct
  /platform/agent/Avatar/foo` fallback is unaffected (exact hit kept).
  ⭐ The user's `/foo/bar*` spelling is NOT added: with the trie's glob
  it means *sibling names starting with bar*, and giving it a second
  meaning is a grammar decision for the slate. No player-facing
  addressing surface changes (non-goal).

**DA3 — The durable handle is `getDurableHandle(): string | null` on
`Stuff`, built as per-mixin RUNGS, never a ladder that narrows.**
*Requirements 9, 9a; the slate's open 2.* Three rungs, each contributed
by the host that owns the fact, each deferring with `super` when its
condition is false:
- `Stuff.getDurableHandle()` (base): `const row = this.getTemplatePath();
  if (!row) return null; const id = this.getIdentityPath(); return id !==
  row ? id : null;` — a minted identity is a durable NAME by 9a (*an
  identity exists iff the name is durable — re-derivable or recorded*),
  whether or not the instance persists: a circulation node is reaped and
  re-minted and its handle is the same string both times, which is what
  lets a parked character's record find it again. An unstamped instance
  has no handle unless a mixin says otherwise.
- `PersistableMixin` overrides: `this.isPersistenceKeyExplicit() ?
  `${this.getTemplatePath()}#${this.getPersistenceKey()}` :
  super.getDurableHandle()` — **row + decoration**, the `placeIdOf`
  rule with the row where `placeIdOf` had the scope (identical for every
  keyed host but the stall, whose records are dropped anyway — see A3).
- `SingletonMixin` overrides: `super.getDurableHandle() ?? this.getTemplatePath()`
  — the one instance IS the row (the bar's door regression guard).
Precedence falls out of composition: `Persistable` always sits above
`Stuff`, so keyed beats stamped; `Singleton` fills only a null. ⭐⭐ The
two durabilities of 9a each have their own mechanism here and must not
be conflated — **the NAME decides whether to stamp** (the base rung reads
it), **the KEY (`isPersistenceKeyExplicit()`) decides whether there is a
`<row>#<key>` handle** (the Persistable rung reads it). Conflating them is
what produced the four-rung ladder this plan deleted. ⭐ No
`MixinApi.isX` in `Stuff.ts` (G2: it does not import `MixinApi`, and a
root class narrowing on its own mixins is the shape to fear), no
`if (isLocation)` anywhere. `placeIdOf(host)` becomes
`host.getDurableHandle() ?? host.getIdentityPath() ?? ""` — byte-identical
for every host but the stall; `PersistableApi.placeIdOf` stays as the
spine's name for *the room identity a `place` names* and documents that
it is the handle. ⚠ The task's premise that *"`undefined` for ephemera
falls out because an identity exists iff durable"* is only true WITH the
base rung's `id !== row` test: `getIdentityPath()` keeps defaulting to the
template (non-goal), so a lounge satellite's identity IS its row and the
handle must read that as *none* explicitly. That is the whole of the
base rung, and it is why the rung exists. The lounge satellite fails 9a
on both legs (not re-derivable — a fresh clone per landing — and
recorded nowhere), so `null` is its honest answer and `stuffId` covers
it.

**DA4 — `Exit.getDiscoveryKey()` keys on the handle.** *Requirements 9.*
`const h = this.source?.getDurableHandle(); return h ? `${h}#exit:${this.direction}` : undefined;`
— uniform for a Location or an `ExitableVessel` source. Consequences,
each a test (D2's four, kept): two keyed holding rooms of one row no
longer share a key (`<row>#<extentA/leaf>#exit:down` ≠
`<row>#<extentB/leaf>#exit:down`); two `asIdentityPath` clones of one
row no longer share a key; a `SingletonCartesianLocation` keeps
**byte-identical** `<row>#exit:<dir>` (the bar's door, and every
`DISCOVERY` belief already written); a lounge satellite yields
`undefined`. ⚠ The test **fails first** only when built from clones of a
ROW with `restoreOrSeed` / `asIdentityPath`, not from
`makeStuff(() => new CartesianLocation())`. `Concealable`'s default
(`:140`, a Good's own template path) is NOT changed: a concealed good is
individuated by its chattel id, a different question and a different
build.

**DA5 — Every mint site names what keys on its identity: a CENSUS at
the site and a RATCHET over the unjustified count; continuity's declared
namespace is asserted at the mint.** *Requirements 9a (the name test),
9d (continuity declares), the Stage A goals; the slate's opens 4–6.*
⭐⭐ Not a shape validator: a validator over the five shapes would codify
thirteen improvisations and give every one of them a passing grade. The
census QUESTIONS them, and its count is meant to go DOWN.
- **The marker, at the site.** Every production `asIdentityPath:` carries
  an adjacent structured comment, the live registry the
  `eslint-disable -- <reason>` convention already uses:
  `// identity-keyed-by: own-record | referenced | lookup | none — <what>`
  (e.g. `// identity-keyed-by: referenced — a parked character's
  snapshot records this node as its container`). A pack adds its own
  marker beside its own mint; **no kernel list is edited** when a pack
  mints (the rule a pack must never need a kernel edit).
- **The gate.** `scripts/check-identity-mints.ts` (`lint:identity-mints`;
  `lint:family` derives the roster) walks the kernel tree and every
  pack's `src/` (`pack-roots.ts`), finds each `asIdentityPath:` outside
  tests, and reports: a site with no marker is an **error**; a site
  marked `none` is **unjustified** and counted; the unjustified count is
  **ceilinged at today's two** (the guest, the corpse — both named
  non-goals) and may only fall. The vocabulary is closed; `probe` is not
  in it, by design — a mint's own uniqueness probe (`corpseIdentityFor`)
  cannot justify the mint it serves. The census table in G-MINT is the
  first run's output and goes in A2's commit message.
- **The continuity assertion** (9d, kept from the earlier draft but as
  the mint-time check, not the gate). A class that declares
  `static readonly identityNamespace: string | readonly string[]` (found
  by walking the prototype chain, so a family declares once) has every
  `asIdentityPath` asserted against it in `StuffApi.#cloneInner`
  (`:545`, beside the singleton guard that reads the same string) —
  `StuffApi.clone('<row>'): identity '<path>' is outside <Class>'s
  declared namespace`. Declared by `lib/character/Avatar.ts`
  (`TemplatePathPrefixes.avatar` — the abstract root, so `PrimaryAvatar`,
  `ShadeAvatar`'s shade path does NOT inherit a wrong prefix: `ShadeAvatar`
  declares its own `/platform/agent/ShadeAvatar/`; `SandboxAvatar` and
  the guest inherit the family's) and `platform/idea/Party.ts`
  (`/platform/idea/party/`). A class that declares nothing is not asserted
  — the census is its gate. `TEMPLATE_PATH_PREFIX` keeps its name.
- **Nothing changes shape.** The circulation node's `${parentExtent}/${nodeId}`
  is re-derivable and referenced (9a's worked case) and stays
  byte-identical; the eval scratch's `${parcel}/_eval` stays; the stall's
  stamps are re-derived from its new key in A4 (DA6) but the shape class
  is the same. Stage B's D4 derives the circulation identity through
  **`PlatPlan.nodeIdentityOf(nodeId, extent)`** (an instance method on
  the kernel value object, which `OuterWarren.ensureNode` also calls), so
  there is one computer of the string, not two — the method is a move of
  the existing formula, not a new shape.
- **A2 unmints nothing, and says so.** Eleven sites are justified; the
  two that are not are carved out by the requirements (non-goals) and
  recorded in the census as the ceiling. Unminting is per-site, by
  whoever owns the site (the guest → `instance-addressing-slate`; the
  corpse → the carcass-chain build). The acceptance is *the rule and the
  meter exist and the meter reads 2*, not a reduction.

**DA6 — The stall is keyed by its PITCH, relative to the square's
fixture; the discriminator is written once.** *Requirements 9c.* The
manager is the `MarketStalls` fixture (G-STALL). It gains `pitches`
(persistent, authorable; `stalls.yaml` authors `pitches: 12`) and a
**lets book** `lets: Record<string, string>` (pitch → renter identity
path; persistent, not authorable), with `pitchOf(renterKey): string |
null`, `allocatePitch(renterKey): string | null` (lowest free, `null`
when full → `stall rent` refuses *"The square has no free pitch."*) and
`releasePitch(renterKey)`. The counter's **key** is
`` `${fixture.getTemplatePath()}/${pitch}` `` (e.g.
`/world/terminus/market/stalls/3` — the `HoldingWarren` shape, the
manager's own durable address as the prefix). The two **identities**
derive from the same key with its leading slash stripped (the corpse's
nesting, the corpse precedent): counter `${STALL_SEED}/world/terminus/market/stalls/3`,
house `${STALL_BUSINESS_SEED}/world/terminus/market/stalls/3`. One
helper, `StallController.idsFor(fixture, pitch)`, replaces
`identitiesOf(renterKey)`; `rent` resolves the renter's pitch from the
book (or allocates), `give-up` releases it; **who rents it** lives where
it belongs — the house's `appointingAuthority`. `hasRecord(ids.counter,
key)` keeps the *"a stall packed away by a restart is theirs"* rule. The
book is persisted on the fixture's own record (`PersistableApi.captureHostOf(fixture)`
after every write); ⚠ whether a `props:` fixture on a non-Persistable
`Street` materializes its own record at boot is unverified (G-STALL) —
A3's first act is to read `applyProps`/`seedBornWith`, and if the fixture
comes up bare, `MarketStalls.onCreate` restores-or-seeds itself under
the scope-derived key (the singleton-fixture shape `cloneHost` already
uses). The drive's restart (step 3) proves it. **DB cost:** the stall's
records only (header).

**DA7 — The chattel pin's scope is the record's scope.** `ChattelLogic.pinOf`
(`:247`) reads `good.getIdentityPath()` where it read
`getTemplatePath()`, matching `captureImpl`'s `scope` so the pin roll's
`standUpKeyed(pin.scope, pin.key)` looks where the record was written.
For both pinned classes today identity ≡ row, so no pin moves. ⚠
`cloneHost(scope, key)` still needs a ROW to `clone()` when the host is
not live; for a stamped keyed host the pin would need to carry both —
recorded as RA5, not built (no pinned class is stamped).

**DA8 — The wire body projects the player's identity through the
METHOD and stops stamping it; the override lands first.** *Promoted from
RA4 (G-WIRE).* Two steps, in this order, in one wave (A3):
1. `SandboxAvatar.getIdentityPath()` **override** returning the real
   identity — the parked player's `/platform/agent/Avatar/<playerId>`,
   derived from the `playerId` the overlay already lands before
   `onCreate` (`SandboxLogic.ts:357`) via `Avatar.getTemplatePath(playerId)`
   (the family's identity formula; misnamed, unchanged). This makes the
   doc comments at `SandboxAvatar.ts:16` and `Stuff.ts:528` TRUE, and
   every identity-keyed ledger (belief viewer key, chronicle, transcript,
   grants, chattel stamps, snapshot owner) keeps attributing in-circle
   acts to the player, because they all read the method.
2. `SandboxLogic.ts:355` **stops passing `asIdentityPath`**. The wire
   body is then an unstamped clone of `/platform/agent/sandbox/SandboxAvatar`,
   filed under its row; the raw slot is empty; `_identityStampOf` returns
   `null`; the parked field body is the only object in the player's
   identity bucket. The census marker at the site is removed with the
   mint.
⚠ Removing the stamp without step 1 attributes in-circle acts to the
wire body's ROW — `sandbox.md`'s hardest promise broken for every
circle visitor, silently. The test pins both halves: with a circle open,
`findByIdentityPath(playerIdentity).length === 1` and it is the field
body; `body.getIdentityPath() === actor.getIdentityPath()`;
`BeliefStore.viewerKey(body)` equals the player's. `forkRuntimeState`
(`PersistableLogic.ts:1309`) is read in the wave for any raw-slot
dependence. **The rename rides this wave:** "projection vessel" →
"wire body" at `Stuff.ts:528`, `SandboxAvatar.ts:2`, `Avatar.ts:1598`
(the `CLAUDE.md` wording, if any, is the sweep's — worktree rule 5).

### Stage B

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
  **`plan.nodeIdentityOf(nodeId, parentExtent)`** = `` `${parentExtent}/${nodeId}` ``,
  byte-identical to today's `ensureNode` string and the same method
  `OuterWarren.ensureNode` now calls (DA5), so the two strings cannot
  drift. Edges: the spine (`predecessorOf` /
  `onwardDirectionOf` + the inverse), the branch edge
  (`branchesFrom.direction`), and one **slot stub** per frontage
  (`{dir: gateDirectionOfSlot(slot), to: null, slot, label: <programme
  row>}`) — the holding behind the gate is somebody's house, a warren one
  level down, perceived live and never stored (D8 is why that is enough
  for AC16).
- An **occupancy warren's** satellites are nothing in the graph
  (requirements decision 11) and their exits yield no discovery key (DA4).
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
makes AC6 true**: the boot no longer throws from `applyExits`.

**D11 — Offline is a camera: `Tombstone`.** `platform/location/Tombstone.ts`
(`class: /platform/location/Tombstone`; a `Location` with the exit face
`CartesianLocation` has — confirm `Exitable` composition when writing it),
row `packages/content/platform/content/platform/location/tombstone.yaml`
(a KIND: cloned per offlining with `asIdentityPath: `${TOMBSTONE_ROW}/${extent stripped}``
— re-derivable from the extent, and `pointingAt`'s diagnostics reference
it; its census marker reads `identity-keyed-by: referenced` — and
a `dataOverlay` that writes the long description — *the place that
stood here, `<extent>`, was taken offline by `<owner>`; tell them if
you were sent here*). It installs one exit, `out`, by the four-rung
cascade: (1) a published node outside the extent with an edge INTO it
(`NavigationApi.pointingAt` over the extent's nodes, first hit), (2) the
evicted mover's `startLocation`, (3) `defaultStartLocation`, (4)
`evacuationFallback`. `onExited`: when no `HasInteractive` remains,
`StuffApi.destruct(this)`. The eviction (`ParcelRegistry.offline`,
reached through `ParcelApi.setPublished(extent, false)` when the record
was live): for every node under the extent, every resident instance
(**`StuffApi.findAllByTemplatePath(identity)` — the row read, so keyed
rooms under a template node come too**) → every `HasInteractive`
occupant `ContainmentApi.move(occupant, tombstone)`; then for every
published node outside the extent with an edge in, `DiagnosticApi.record({path:
<that row>, severity: 'warning', message: "exit <dir> → <place> lost its
destination: <extent> was taken offline by <owner>"})` — durable,
addressed to the pointing row, delivered to its author on the live
stream and listed by `errors` and the CMS pane. That is "tells the owner
of those exits". ⚠ Slate open 4 (offlining a warren host migrates the
role) stays open; B2 offlines ZONES of template nodes and refuses an
extent whose nodes are all plan nodes with a reason.

**D12 — The flip is `title publish <extent>` / `title offline <extent>`.**
Subcommands on the existing parcel verb (`civics/title.yaml`,
`TitleController` switch), gated on title at the extent through
`AccessApi` (the action word chosen from `TreeAction` in B2 — see
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
  `/home/a/map/terminus/hinkley-hills` hands over nothing else (AC15).
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
  **`place` is the room's `getDurableHandle()`** (DA3) — a keyed room's
  `<row>#<extent/leaf>`, a circulation node's identity, a singleton's
  row; **a room with no handle writes no claim** (AC19: the lounge is
  honestly nothing); `label` its template path; `name` its presentation
  as perceived; `group` its `_address`; `to` the destination's handle
  when resident else `null` with `toLabel` = `getDestinationTemplatePath()`
  (a `DeferredDestinationExit` reads *"a space through this door"*).
  Growth rule: a new observation identical in `(kind, place, dir, to,
  channel)` to the LATEST claim for that key bumps `lastSeen`; a
  differing one appends. Nothing is ever removed. `told` and `bought`
  are vocabulary with **no writer** this build (requirements non-goals).

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
data (strings, numbers) — the Avatar converts Stuff to handles. The band
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
handle and locality and writes a `place` claim with `channel:
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
no `CardId` edit** (non-goal). AC14 is structural: the controller reads
only `DocumentApi.list` under the actor's own home.

**D18 — A new subsystem doc, not a blurb.** `docs/subsystems/location-graph.md`
is written in B4; the `CLAUDE.md` map line is the sweep's (worktree rule
5). Existing docs touched — Stage A: `persistence.md` (the scan's
needle, `findAllByTemplatePath`'s semantics, the handle naming
`placeIdOf`), `chattel.md` (the pin's scope), `concealment.md` (the
discovery key), `holding.md § Identity` (the sentence *"the registry
indexes on identity ?? template so every existing lookup is
byte-identical"* gains *"and a row is enumerated by prefix"*),
`identity.md` or `architecture.md` (the `identityNamespace`
declaration + the `identity-keyed-by` marker), `antipatterns.md` (one
entry: *asking the registry for an identity when you mean every instance
of a row*), `lint-family.md` (`lint:identity-mints`). Stage B: `boundary.md`
(the two new gates, the unbuilt edge), `parcel.md` (`published`),
`document-store.md` (`map`), `fasttravel.md` (`publishedStops`),
`location.md` (the handle; `nodeIdentityOf`), `lint-family.md` (the two
new gates), `sandbox.md` (the method override; *wire body* throughout).

---

## ⭐⭐ Host placement

| what | host | what composing it claims |
|---|---|---|
| `getDurableHandle()` base rung | `Stuff` (`lib/stuff/Stuff.ts`) | every object can say whether it has a durable per-instance handle, and honestly says `null` when it is one of an unbounded many. A read, not a capability; it narrows on nothing (G2: `Stuff.ts` does not import `MixinApi`). |
| `getDurableHandle()` keyed rung | `PersistableMixin` (`lib/persistence/Persistable.ts`) | a keyed host's handle is row + decoration. Composing `Persistable` already claims *this thing has a `(scope, key)` record*; the rung states the same fact as a string. The stall, every dorm room, every plant and named animal get it for free. |
| `getDurableHandle()` singleton rung | `SingletonMixin` (`lib/stuff/Singleton.ts`) | the one instance IS the row. True of every Singleton by definition — the mixin exists to say so. |
| `identityNamespace` static | the FAMILY root that owns a continuity namespace: `lib/character/Avatar.ts` (abstract), `platform/agent/ShadeAvatar.ts`, `platform/idea/Party.ts` | a class that declares one says *my minted identities live here* and every subclass inherits the claim (`SandboxAvatar`, `PrimaryAvatar`, the guest). ⭐ Not on `Stuff` with a default: a default namespace would admit every mint everywhere. A class that declares nothing is gated by the census, not the assertion. |
| the continuity assertion | `StuffApi.#cloneInner` (`api/stuff.ts`) | the clone pipeline is the only minter (the stamp gate already says so); the check sits beside the singleton guard that reads the same string. |
| the `identity-keyed-by` marker | each mint SITE (a structured comment) | the site that mints names its reader; a pack's site is the pack's to mark. The lint reads sites, never a kernel list. |
| `lint:identity-mints` | `scripts/check-identity-mints.ts` | a census-then-ratchet over unjustified mints (ceiling 2, falls only). |
| `getIdentityPath()` override | `SandboxAvatar` (`platform/agent/sandbox/SandboxAvatar.ts`) | the wire body projects the person it is worn by — the one class whose identity is somebody else's, and the override the docs already claim exists. Nothing else overrides the method. |
| `findAllByTemplatePath` (row read) · `findByIdentityPath` | `StuffApi` (`api/stuff.ts`) | the registry's two honest reads. Object-verbs-exempt Api; strings first. |
| the scan's needle | `PersistableLogic.assertUniqueKey` / `liveKeyed` (`platform/idea/api/PersistableLogic.ts`) | module-private functions already; the fix is inside them. |
| `pitches` · `lets` · `allocatePitch`/`releasePitch`/`pitchOf` | `MarketStalls` (`content/terminus/src/market/thing/MarketStalls.ts`) | the square's fixture is the stall's MANAGER and keeps the book of lets — the `PlatBook` shape one level down. ⚠ Not on kernel `Stock`: a shop counter does not let pitches; not on `StallController`: a controller holds no state. |
| `nodeIdentityOf(nodeId, template, extent)` | `PlatPlan` (`lib/location/PlatPlan.ts`, instance method) | the plan already owns every other node-derived string (`nodeOfSlot`, `authoredPathOf`, `routeOf`); a second computer of the identity (the registry) is what the single home prevents. Instance, not static (`lint:lib-statics`). |
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

⭐ The test, applied: no site in this plan adds `if (isAvatar(x))` or
`if (isLocation(x))` to re-narrow a host set. The handle's rungs each
live on the host that owns the fact; where the host set is players, the
code is on `Avatar`; where it is places, on `Location`; where it is every
object, on `Stuff` and honest about null.

---

## Convention conformance

Checked against the current tree this cycle.

- **`props:` / `cast:`** — `stalls.yaml` gains `pitches:`; the tombstone
  row authors neither; `square.yaml`'s `props:` is untouched.
- **Locations, not rooms** — `Tombstone` is a `Location`; no `*Room`
  name; `FurnishableRoom` untouched.
- **Path pattern `<root>/<branch>/`** — row `/platform/location/tombstone`;
  view `/platform/cmd/perception/map`; controller
  `/platform/idea/cmd/perception/MapController`; registry
  `/platform/idea/LocationGraphRegistry`; the Logic stays at
  `/platform/idea/api/navigation` (the sanctioned Logic exception). The
  stall's identities stay under their seed rows (DA6).
- **Module categories** — `PlaceNode` (record Document, `lib/`),
  `GraphInvariants` (value object, `lib/`), `LocationGraphRegistry`
  (platform/idea registry singleton), `Tombstone` (platform/location
  class), `MapController` (controller), `map.yaml` (command view),
  `check-location-graph.ts` and `check-identity-mints.ts` (lint
  scripts, the sanctioned category); every other Stage A change lands in
  an existing class, mixin, Api or Logic. **No new category, no free
  helper, no `eslint-disable`.**
- **Module scope declares** — the registry warms in `onCreate`; the
  Api's tail `SecurityApi.decorateApiClass(NavigationApi)` is already
  there; `identityNamespace` is a static field declaration, not a
  statement.
- **Import boundary (`lint:imports`)** — `lib/` files import only inside
  `src/mud/` (`GraphInvariants` imports nothing; `Exit` adds
  `api/parcel`, `api/diagnostics`; `Exitable` adds `lib/stuff/Template`,
  already a lib import; `Stuff.ts` adds nothing — DA3's base rung uses
  only its own methods); the scripts import
  `lib/location/GraphInvariants` (the `check-schema-docs` precedent);
  packs import the kernel by specifier only (`MarketStalls` already
  does).
- **Verbs on objects** — `getDurableHandle`, `obviousExitsFor`,
  `publishedStops`, `isPublished`, `allocatePitch` are methods; every
  new Api static takes strings or plain data first, and the two
  `StuffApi` reads take paths; `lint:object-verbs` stays 0.
- **`lint:lib-statics`** — `PlatPlan.nodeIdentityOf` is an instance
  method; no new static method in `lib/` (`identityNamespace` is a
  field).
- **Person keys** — `ownerKey` is `getIdentityPath()`'s basename, never
  a template path; the stall's house keeps `appointingAuthority.path =
  renterKey` (an identity path) (`lint:person-keys`).
- **`_mixinName` widening** — no new mixin.
- **Collections** — `Collections.LocationGraph` from the generated enum,
  never a literal (`lint:schema`).
- **Lint gates this build must pass**: `lint:schema`, `lint:instanceable`
  (the tombstone row's `class:`; DA5's identities are stamps, not rows),
  `lint:locations`, `lint:presentation`, `lint:field-meta` (`MarketStalls`'s
  two new fields; `PlaceNode`'s), `lint:mixin-names`,
  `lint:object-verbs`, `lint:lib-statics`, `lint:imports`,
  `lint:module-scope`, `lint:gates` (`saveMap`'s `FromModule` string),
  `lint:untitled`, `lint:verb-collisions` (`map` is new; `title` gains
  subcommands), `lint:controller-rows`, `lint:arg-kinds`,
  `lint:binder-models`, `lint:thin-forwarder`, `lint:test-bootstrap`,
  `lint:drive-scripts`, `lint:person-keys`, `lint:census` (D17's
  `asTemplatePath` stays retired; `asIdentityPath` is the channel) and
  the two new gates `lint:identity-mints` and `lint:location-graph` — run as
  `pnpm -C packages/server lint:family`.

---

## Waves

⚠ **Build note on commit granularity (2026-10-04).** A0, A1 and A2 share
two files — `api/stuff.ts` (A0's two reads, A2's continuity assertion)
and `platform/idea/api/ConditionLogic.ts` (A0's probe moves, A2's corpse
marker) — so splitting them into three commits would have required
staging partial files and produced three commit messages that each
described work the commit did not contain. They landed as **one commit
naming all three waves**, verified together (typecheck clean, 70 new
tests, both sabotage checks, the whole lint family). From A3 on the
waves touch disjoint files and get a commit each.

Each wave lands alone, ends at one commit, and is gated by
`pnpm test:near` + the touched pack's vitest + `lint:family`. `pnpm test`
runs twice: before the MR opens, and at `/finalize`. Stage A (A0–A4)
lands before Stage B (B0–B4).

### A0 · The scan keys on the row, and a row can be enumerated — ✅ DONE

> **Note (2026-10-04).** Shipped as planned. Two findings worth carrying:
>
> ⭐⭐ **A continuity family is out of the row read's reach in BOTH
> directions**, not just one. The plan's acceptance predicted
> `findAllByTemplatePath('/platform/agent/Avatar')` → empty (nothing is
> cloned from the family path). What the test found is that
> `findAllByTemplatePath('/platform/agent/PrimaryAvatar')` — the LINEAGE
> — is **also empty**, because an avatar is filed under
> `/platform/agent/Avatar/<pid>`, and neither string is a prefix of the
> other. This is the two patterns pointing opposite ways, met in code:
> individuation nests under the row so a prefix read finds it;
> continuity does not and the register is the only answer. The first
> draft of the test asserted the lineage read returned 2 and was wrong,
> not the code. Pinned, documented on the read itself, and in
> `persistence.md` / `antipatterns.md` with *do not widen the read to
> chase them*.
>
> **Sabotage-verified:** reverting the needle to `scope` turns 2 of the
> 5 uniqueness tests red; the 3 that stay green are the unstamped cases,
> which is exactly the population the old needle got right — *a vacuous
> assertion looks like a passing one*.
>
> ⚠ `assertUniqueKey`'s throw message now names the ROW, not the record
> scope; `liveKeyed` gained only a comment (every caller already passed
> a row). The record's `scope` field is untouched everywhere.

**Original wave spec** — `fix(persistence): the uniqueness scan keys on the ROW; findAllByTemplatePath enumerates a row honestly`

**Implements** DA1, DA2. **Files:** `api/stuff.ts` (`findAllByTemplatePath`
redefined; `findByIdentityPath` new; doc comments on both and on
`findByTemplatePath` saying which question each answers),
`platform/idea/api/PersistableLogic.ts` (`assertUniqueKey`'s needle;
`liveKeyed`'s comment), `platform/idea/api/PackLogic.ts:2979,2985` +
`platform/idea/api/CmsLogic.ts:645` (→ `findByIdentityPath`, with the
go-live comment), the five identity callers in G-ROW (→
`findByIdentityPath`), `api/mql/resolver.ts:336,778` (glob-free →
`findAllByTemplatePath`), `docs/subsystems/persistence.md`
(§ `assertUniqueKey`, § `(scope, key)`), `docs/antipatterns.md` (one
entry), `docs/subsystems/holding.md § Identity` (one sentence).
Tests: `api/__tests__/stuff.registry.test.ts` (new or beside the
existing registry tests): a kind row cloned twice bare and twice with
row-prefixed `asIdentityPath` → `findAllByTemplatePath(row)` returns four,
`findByIdentityPath(row)` two, `findByIdentityPath(identityA)` one,
`findByTemplatePath(identityA)` the same one, `findByTemplatePath(row)`
**still throws** on two; `findAllByTemplatePath('/platform/agent/Avatar')`
is empty with two avatars minted; `platform/idea/api/__tests__/PersistableLogic.uniqueKey.test.ts`:
two stamped clones of one row `restoreOrSeed`'d with the same key —
the second **throws** (red today: the needle was the stamp); two
unstamped with the same key still throw; different keys do not.

**Acceptance.** The tests above go red-then-green where marked; every
existing `findAllByTemplatePath` caller's own test stays green
(`reseedCast`, the modalities, `BootstrapManager`); MQL `/world/terminus/market/thing/stall`
in a test resolves every counter. Covers AC3 and AC4's uniqueness half.

### A1 · The durable handle, and a discovery keys on it — ✅ DONE

> **Note (2026-10-04).** Shipped as planned, three rungs, no ladder.
>
> ⚠ **The one thing the plan got wrong, and it is a trap worth naming.**
> The `SingletonMixin` rung needs `getTemplatePath()`, and the mixin's
> `TBase extends MixinConstructor` has instance type `object`, so the
> obvious fix is to tighten the constraint to `MixinConstructor<Stuff>`.
> That is wrong: `SingletonMixin` is composed ON TOP of other mixins
> whose instance type is not yet a full `Stuff` (`lib/npc/Cast.ts`
> composes it over `NamedMixin(...)`), so the constraint breaks every
> composition site rather than the mixin — 20 of 22 typecheck errors
> were that cascade in `Cast`, `Gus`, `Realtor` and `Katie`. The house
> idiom is the cast (`this as unknown as Stuff`), which
> `capturesAtShutdown` two methods away already uses. The comment at the
> site says so, because the tightening looks like an improvement.
>
> **Sabotage-verified:** reverting `getDiscoveryKey` to the lineage turns
> 5 of 7 red, and the 2 that stay green are the singleton regression
> guard and the unbound clone — i.e. the fix changes exactly the two
> populations it claims to and nothing else.
>
> `placeIdOf` is now a one-liner forwarding to the handle, byte-identical
> for every host but a stamped-and-keyed one (the stall alone).

**Original wave spec** — `build(stuff): the durable handle is row + decoration; a discovery keys on the handle, not the lineage`

**Implements** DA3, DA4, DA7. **Files:** `lib/stuff/Stuff.ts`
(`getDurableHandle` base rung, doc'd as the three-rung contract),
`lib/persistence/Persistable.ts` (keyed rung; the interface gains the
method), `lib/stuff/Singleton.ts` (singleton rung), `platform/idea/api/PersistableLogic.ts:972`
(`placeIdOf` → handle ?? identity) + `api/persistable.ts:181` (doc),
`lib/boundary/Exit.ts:407` (`getDiscoveryKey`), `platform/idea/api/ChattelLogic.ts:247`
(`pinOf` scope), `docs/subsystems/concealment.md`, `chattel.md`,
`persistence.md` (`placeIdOf` names the handle). Tests:
`lib/stuff/__tests__/Stuff.durableHandle.test.ts` (a bare clone → null;
a row-prefixed stamp → the identity; a `restoreOrSeed`'d clone →
`row#key`; a stamped AND keyed clone → `row#key`; a
`SingletonCartesianLocation` → its row), `lib/boundary/__tests__/Exit.discoveryKey.test.ts`
(**written first, watched fail**: two clones of a permissive room row
`restoreOrSeed`'d with keys A/B, a `concealment: hidden` exit `down` on
each via `installExit`, `PerceptionApi.recordDiscovery(viewer, exitA)`,
assert `hasDiscovered(viewer, exitB) === false` — today `true`; plus the
`asIdentityPath` pair, the singleton regression guard asserting the
byte-identical `<row>#exit:down`, and the keyless-unstamped →
`undefined` case), `platform/idea/api/__tests__/ChattelLogic.pin.test.ts`
(the pin's scope equals the scope `capture` wrote; green today for the
unstamped classes, and a stamped keyed fixture shows the two agree).

**Acceptance.** The discovery test goes red then green; `Exit.concealment`,
`Hiding`, `Concealable`, `ResidencyPin` tests untouched and green;
`placeIdOf` byte-identical for every host in the existing chattel tests.
Covers AC1, AC2, AC19's handle half.

### A2 · Every mint names what keys on it — ✅ DONE

> **Note (2026-10-04).** The census reads exactly what the plan
> predicted: **13 sites — 8 `own-record`, 2 `referenced`, 1 `lookup`,
> 2 `none`**, meter at 2 (the guest, the corpse), and **nothing was
> unminted**, by design.
>
> ⚠ **The plan's "thirteen" needed one correction.** There are **14**
> `asIdentityPath:` sites in the tree; the fourteenth is
> `src/backend/TestHooks.ts`, which is outside the scan root (the mudlib
> + pack `src/`, inherited from `check-person-keys`). It mints through
> the same `PlayerLogic` formula and carries a marker for the reader,
> uncounted. So thirteen is the right census number and fourteen is the
> right site count.
>
> ⚠⚠ **A pinned literal on `identityNamespace` breaks the class chain.**
> `static readonly identityNamespace = TemplatePathPrefixes.avatar` infers
> the literal type, which makes `ShadeAvatar`'s own declaration an
> incompatible static override (`TS2417`). Widened to `: string` on all
> three, with the reason at the site — the same failure the `_mixinName`
> statics are widened for, and a family's namespace is overridable by
> definition.
>
> `PlatPlan.nodeIdentityOf(nodeId, parentExtent)` landed as planned and
> `OuterWarren.ensureNode` calls it; the string is unchanged, proven by a
> test that also pins re-derivability across a reap.

**Original wave spec** — `build(stuff): every identity mint names what keys on it; the unjustified count is a ratchet at two`

**Implements** DA5. **Files:** `scripts/check-identity-mints.ts` (+ a
test beside it on the `check-person-keys` shape) and
`packages/server/package.json` (`"lint:identity-mints"`); the
`identity-keyed-by` marker at all thirteen sites in G-MINT (eleven with
their reader, the guest and the corpse `none —` with the carve-out
reason and the slate pointer); `api/stuff.ts` (`#cloneInner` continuity
assertion + `#identityNamespaceOf(ctor)` prototype walk);
`lib/character/Avatar.ts`, `platform/agent/ShadeAvatar.ts`,
`platform/idea/Party.ts` (`identityNamespace`); `lib/location/PlatPlan.ts`
(`nodeIdentityOf(nodeId, extent)`) + `lib/location/OuterWarren.ts:499`
(calls it; string unchanged); `docs/subsystems/identity.md` or
`architecture.md`, `lint-family.md`. Tests: the lint's own (a fixture
tree with a marked site, an unmarked site → error, a `none` site →
counted, a `probe` word → rejected as not in the vocabulary);
`api/__tests__/stuff.identityNamespace.test.ts` (each declared family's
shipped shape passes; a mint outside a declared prefix throws; a class
with no declaration is not asserted); `PlatPlan.nodeIdentityOf` returns
today's string.

**Acceptance.** `pnpm -C packages/server lint:identity-mints` green on
the tree with the meter reading **2 unjustified (guest, corpse)** —
recorded in the commit message as the first census; every existing
clone-with-identity test green (embody, login guest, party, corpse,
shade, wire body, stall, eval, warren); the throw cases red-then-green.
⭐ **A2 unmints nothing, by design**: it installs the rule and the meter;
the count falls per-site by whoever owns the site. The corpse's probe
move already happened in A0 and races nothing.

### A3 · The wire body projects through the method — ✅ DONE

> **Note (2026-10-05). ⚠⚠ The plan's premise was HALF WRONG, and the
> sabotage check is what caught it.**
>
> G-WIRE and DA8 say the projection *"is carried entirely by the raw
> stamp"* because `SandboxAvatar` has no `getIdentityPath()` override,
> and prescribe adding one. The first half is true; the second is not.
> **`lib/character/Avatar:710` already overrides `getIdentityPath()` for
> the whole family** — its own docblock says *"the identity thread, for
> the whole family and in one place"*, deriving from `playerId` — so the
> wire body inherits the projection, exactly as the shade does. The
> override I added per the plan was a duplicate of the thing that
> override exists to prevent.
>
> ⭐ **How it was caught:** removing my new override and re-running the
> wave's own test left **all 7 green**. A test that cannot fail when you
> delete the code it is supposed to be testing is testing something
> else. Grounding then found the family override two files away.
>
> ⭐⭐ **So RA4's ordering hazard never existed.** The plan said *"the
> override must land BEFORE the stamp is removed, or in-circle acts
> attribute to the wire body's row for every visitor."* Removing the
> stamp alone was always safe, because the family override was already
> there. The wave therefore reduces to **one line deleted** plus the
> docs that were describing a non-existent override.
>
> **What shipped:** the `asIdentityPath` mint is gone from
> `SandboxLogic` (the wire body is now filed under its own row, so the
> player's identity bucket holds only the parked field body and
> `findByTemplatePath('/platform/agent/Avatar/<pid>')` no longer throws
> *expected singleton, found 2* mid-visit); `SandboxAvatar` carries a
> comment saying **where the override actually is**, because its absence
> there reads as a bug; `Stuff.getIdentityPath`'s docblock and
> `Avatar.getIdentityPath`'s are both corrected — the latter now says
> out loud that it is what makes the wire body's projection work and
> why removing the stamp was safe. *projection vessel* → *wire body* at
> all three sites.
>
> ⚠ The census meter is still **2**: one justified site removed, none
> added.
>
> ⚠ A fixture trap found on the way, now commented at the site:
> `Stuff._stampTemplatePath` does **not** re-key the registry index
> (only `Stuff.setTemplatePath` does, via `_reindexTemplatePath`). A
> fixture that stamps after registering leaves the body filed NOWHERE —
> so an assertion about the player's index bucket passes against an
> empty bucket for the wrong reason. `stampTemplatePathForTest`
> unregisters and re-registers, which is what production's
> stamp-before-register ordering achieves.

**Original wave spec** — `fix(sandbox): the wire body projects the player through getIdentityPath(), and is no longer filed under the identity it projects`

**Implements** DA8. **Files, in this order:** `platform/agent/sandbox/SandboxAvatar.ts`
(the `getIdentityPath()` override; the header comment → *wire body*),
THEN `platform/idea/api/SandboxLogic.ts:355` (drop `asIdentityPath`;
drop its census marker), `lib/stuff/Stuff.ts:528` + `lib/character/Avatar.ts:1598`
(*projection vessel* → *wire body*), `docs/subsystems/sandbox.md` (the
override is real now; *wire body* throughout). Tests:
`platform/agent/sandbox/__tests__/SandboxAvatar.identity.test.ts` —
with a circle open: `findByIdentityPath(playerIdentity)` has exactly one
member and it is the field body; `body.getIdentityPath() ===
actor.getIdentityPath()`; `Stuff._identityStampOf(body)` is `null` (a
`*.test.ts` may call the gated seam); the belief viewer key, a chronicle
deed and a grant check made from inside the circle all attribute to the
player. The existing sandbox crossing tests stay green.

**Acceptance.** The test above red-then-green; `lint:identity-mints`
meter still 2 (one justified site removed, no unjustified added); the
holodeck wire tests green. No AC of its own — this is the registry
invariant `Stuff.ts` already states, made true.

### A4 · A stall is keyed by its pitch — ✅ DONE

> **Note (2026-10-05).**
>
> ⚠⚠ **RA1 is ANSWERED, and the hazard was real.** A `props:` fixture on
> a non-`Persistable` `Street` is established by **nobody**:
> `Stock.onCreate` only calls `reset()`, and
> `capturesAtShutdown()` answers false while `_persistenceKey === null`,
> so such a fixture **neither captures nor restores**. Left alone the
> lets book would have come up empty after every restart, the next
> renter would be allocated pitch 1, and `hasRecord` would hand them the
> first keeper's counter. `MarketStalls.onCreate` now materializes its
> own keyless record (one fixture per row, so the scope-derived owner is
> the right key) and every write to the book captures it.
>
> ⛔⛔ **A SECOND defect of the same shape, in my own A4 design, found by
> the test.** Once the record is the PITCH's, `give-up`'s
> capture-the-emptied-counter became wrong: the record outlived the let,
> so the next renter of that pitch was handed the previous keeper's
> counter — their short description, their keywords — and `hasRecord`
> told them the rent was already paid. The same clobber the invariant
> exists to stop, arriving from the other side. **`give-up` deletes the
> pitch's record** (`PersistableApi.deleteAllFor(ids.key)` — the owner
> IS the pitch key, so it is one record). A given-up pitch remembers
> nothing; what the keeper had is in their hands.
>
> ⭐ **The square now has a fixed number of spots.** `pitches: 12` on
> `stalls.yaml`, `allocatePitch` lowest-free (so a given-up pitch is
> re-let before the square grows), and `stall rent` refuses
> `square-full` **before any money moves** — every later refusal
> releases the pitch it took, or a refusal would leave a pitch let to
> somebody holding no stall. Before this a square let out as many
> stalls as it was asked for.
>
> ⚠⚠ **A fixture that models ONE axis cannot test a two-axis rule.** The
> suite's `stubSeeds` stamped the minted identity *as the template
> path*, so every counter looked like a clone of its own identity and a
> read enumerating the seed ROW found nothing. That is why the stall was
> invisible to the invariant in the test as well as in production. The
> stub stamps both axes now, and with it the uniqueness test
> **sabotage-verifies**: reverting A0's needle turns it red, which is
> the proof that the market stall — never once covered before — is
> covered.
>
> ⭐⭐ **`lint:on-create` refused the first shape, and it was right.**
> The restore started life in `MarketStalls.onCreate` (what the plan
> prescribed) and tripped the ceiling at 82/81. The gate's message names
> the alternative — *state the world remembered goes on a
> `hydrationSource`* — and so does the clone pipeline's own comment at
> the call site: sources run between the content step and the hook
> *"so that nothing has to read a collection from inside a lifecycle
> hook to get it."* Two gates and a code comment all saying the same
> thing is not worth arguing with. The fixture declares
> `hydrationSource { name: 'holder_snapshots', required: false }` and a
> `hydrateFromSource` that materializes its own record, mapping any
> failure to `unreachable` rather than throwing (a throw unregisters the
> half-built object, which would take the market square out of the world
> rather than leaving it bookless). The `onCreate` is gone and the
> ceiling is back at 81.
>
> ⚠ **`pitches` is authored, NOT persistent** — found while wiring the
> restore. Persisting it would mean a captured `12` overwriting an
> author's edit to `20` at the next boot: the
> `props:`-edit-never-reaches-a-booted-world failure in a new hat. Only
> `lets` is state.
>
> ⭐ **A side effect worth naming:** the restore also brings back
> whatever was CONSIGNED on the square's own stall, which nothing
> restored before — the fixture was established by nobody, so the
> market's produce vanished at every boot. A fix, not a regression, and
> the reason the record is the whole host's rather than the book's
> alone.
>
> ⚠⚠ **`lint:lib-statics` caught the hydration source too — and the
> GATE was the thing that was wrong.** `hydrateFromSource` has to be a
> public static read by name (`StuffApi.#hydrateFromSources` finds it
> with `hasOwnProperty`), so there is no compliant alternative shape to
> fold it into. The gate's own doc says its framework allowlist *"is
> found by grepping the framework for reflective access"* — and that
> grep yields ten names while the list carried seven, two of them
> missing (`hydrateFromSource`, `hydrateSlice`, both added by the
> hydration build) and one of them stale (`restoreSlice`, which the
> framework never reads by that name). That is this file's own
> documented failure class: *a ratchet with a hole in it*. The list is
> re-derived now, with the derivation recorded at the site, and the
> count came back to **337 — exactly the ceiling**, so nothing rose and
> the ceiling did not move.
>
> ⚠ **Two more gates caught my own tests, both fairly.**
> `lint:test-content`: three KERNEL tests named `/world/...` paths as
> fixtures, which couples a kernel contract to one locality's content —
> they are synthetic `/test/**` rows now, with the reason at the site,
> and the drive is where the real dorm rooms get walked.
> `lint:test-bootstrap`: the census lint's own test touches the wired
> runtime and needed the import.
>
> **DB cost, measured rather than assumed:** `0` rows. The targeted
> delete (`holder_snapshots` scoped under the stall seed, `chattel`
> placed there) matched nothing in `saxonberg_build3` — nobody has
> rented a stall in this dev DB — so the re-key cost nothing. The house
> seed's records were left alone and are also 0; `bank_ledger` is never
> touched (money is conserved; a write-off is never a silent delete).
>
> 10 stall tests green, 142 across the terminus pack.

**Original wave spec** — `fix(market): a stall is keyed by its PITCH on the square, not by who rents it`

**Implements** DA6. **Files:** `content/terminus/src/market/thing/MarketStalls.ts`
(`pitches`, `lets`, `fieldMeta`, the three methods, the own-record
restore if G-STALL's check requires it), `content/terminus/src/market/idea/cmd/StallController.ts`
(`idsFor(fixture, pitch)`; `rent` / `give-up` through the book; the
*no free pitch* refusal), `content/terminus/content/world/terminus/market/stalls.yaml`
(`pitches: 12`), `thing/stall.yaml` (the comment), `cmd/stall.yaml`
(help: *"rents the next free pitch"*), `docs/subsystems/retail.md` or
the market's own doc line. Tests: `content/terminus/src/__tests__/StallController.test.ts`
(two renters → two counters with different handles `${STALL_SEED}#<fixture>/1`
and `/2`, two houses, two accounts; the first renter's `stall` after a
simulated restart resolves the SAME pitch from the book; a full square
refuses; `give-up` frees the pitch and the next renter takes it).
**Dev DB:** the build deletes `holder_snapshots` rows whose `scope`
starts `/world/terminus/market/thing/stall/` and `chattel` rows whose
`place` starts the same, and nothing else — stated in the commit
message.

**Acceptance.** AC4 end to end in a unit test; the wire drive's step 3
(two sessions rent; each keeper's counter answers for its keeper; the
hand restart; the first keeper's `stall` reopens pitch 1). Covers AC4.

### B0 · The five invariants are a lint — ✅ DONE

> **Note (2026-10-05).** Shipped as seven rules (the plan's own list was
> seven; "the five invariants" is the slate's older count).
> `lib/location/GraphInvariants.ts` is the instance value class both
> callers share; `scripts/check-location-graph.ts` runs it over the rows.
>
> **First run: 124 places, 199 edges.** Errors all 0. Questions, and
> these ARE the ceilings — measured, not padded, because a ceiling above
> the real count is a hole in the ratchet: `cross-zone-one-sided` 1 ·
> `unreachable-from-entrance` 13 · `asymmetric-edge` 4 ·
> `destination-is-a-kind` 2.
>
> ⚠⚠ **A premise correction the first run forced, and it is the wave's
> main finding.** The requirements' AC7 and this plan's D7 both ask for
> *"a `bidirectional: true` edge the far side does not reciprocate"* as
> an **error**. That shape does not exist. `Exitable._applyExitSpec`
> calls `addBidirectionalExit`, which **installs the reverse** — so such
> an edge is reciprocal by construction, and the far side declaring
> nothing is the correct authoring. The rule written the plan's way
> flagged Duncan Hall's front doors on its first run, whose row says in
> a comment exactly why it is right: *"authored once with
> `bidirectional: true` … the steps' back-exit is installed from here
> rather than duplicated on the steps template."*
>
> So the rule is re-aimed at the conflict that genuinely exists —
> **both sides declaring the same pair bidirectional**, which asks the
> engine to install the pair twice — and renamed
> `bidirectional-both-sides`. The one-sided edge AC7 was reaching for is
> `asymmetric-edge`, a census: a singly-authored exit is `oneWay: true`
> at runtime by default, so a one-way passage is legitimate content an
> author must be able to ship. **AC7 is satisfied in substance** (a
> one-sided edge IS reported to its author) and its wording was wrong
> about the mechanism.
>
> ⚠⚠ **`unreachable-from-entrance` has false positives BY
> CONSTRUCTION**, recorded at the site rather than worked around: this
> gate reads rows, and **code-installed exits are not in rows** (a
> warren's hub exits, `DormDoor`, `FloorStairExit`), so a zone reached
> only through a code-installed door reads as entrance-less. Eleven of
> the thirteen are that. The rule still earns its place — the count may
> not GROW — and the first run's two real findings
> (`/world/terminus/market/offstage` unreachable, and two exits naming
> KIND rows that `StuffApi.singleton` would mint a stray instance of)
> were news.
>
> ⭐ `extendsAny` + `normalizeClassPath` **lifted into `pack-roots.ts`**
> at this second consumer, per the plan, and the dead local copy removed
> from `check-location-classes` (which still passes).
>
> ⚠ A fixture correction: Seznick House's `corridor` LOOKS like a place
> and is one of the three rows on the permissive `CartesianLocation` —
> a kind, minted per floor. The first draft of the lint's test asserted
> it was a place; the fact is pinned the right way round now.
>
> 19 + 11 tests. Typecheck clean.

**Original wave spec** — `build(location-graph B0): the graph invariants are a lint over the rows`

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
dangling rule fire naming row + direction. Covers AC5 (the file half),
AC7.

### B1 · The graph — ✅ DONE

> **Note (2026-10-05).** The collection, the record, the registry, the
> query surface, the write chokepoint and the unbuilt edge. Four
> departures from the plan, every one of them forced by something real.
>
> ⚠⚠ **1. There is NO `onCreate`; the registry warms LAZILY on the
> first graph read.** `lint:on-create` refused a ninth catalogue
> `onCreate` (82/81) — and asking the gate's question showed the eager
> warm was buying nothing: **nothing reads the graph at boot.** The
> traversal gate's publish check goes through `ParcelApi`, not the
> graph; the invariant check, the re-projection and the router's
> queries are all later events. So an eager walk of every content row
> at boot was work for no reader, which is the *opposite* of the
> reference-Ideas-inert problem a warm exists to solve.
> `ReadingCatalogue` is the documented precedent for the lazy half.
> The boot entry stays so the registry EXISTS for `NavigationLogic` to
> find; the warm is guarded so a burst of first reads builds once.
>
> ⚠⚠ **2. `PlaceNode` carries NO finder statics**, which the plan
> implied by citing `ParcelRecord`'s shape. `lint:lib-statics` refused
> seven new statics on a non-Api class (344/337), and the gate's
> question gave the better placement: the registry is this record's
> ONLY consumer, so a public finder surface was offering reads nobody
> outside performs. The queries are private methods on the registry
> over the inherited `Document.find`; the record keeps only
> `toGraphNode()`, an instance method because it is a fact about the
> row rather than a lookup of rows.
>
> ⚠⚠ **3. The unbuilt exit is a narrow CATCH, not a pre-check.** The
> plan's D10 says to check `Template.findByPath(spec.destination)`
> before `StuffApi.singleton`. Shipped that way first, and it broke six
> boundary suites on `PersistenceManager.get(...).isConnected is not a
> function` — because it made exit installation depend on a reachable
> store, which is the same hazard a live server hits during early boot,
> and it adds a round-trip per authored exit on the hydration hot path
> (199 edges). Now it catches the ONE message `StuffApi.clone` throws
> for a missing row and rethrows everything else: a failure inside a
> destination's own `onCreate` is a different fault and must stay loud.
> The happy path costs nothing.
>
> ⚠⚠ **4. No slot stubs for plan nodes**, departing from D4. A stub is
> `{to: null, slot}`: every invariant skips it by definition, the
> router cannot route over an edge with no destination, and a player's
> map of lot-7 is carried by the HANDLE (B3), not by a stub. So a stub
> has **no reader**, and shipping declared data with no consumer is the
> dead-capability failure this repo keeps paying for. When the router
> wants frontages it adds them with the thing that reads them. A plan
> node's `template` is the WARREN's row, not the circulation class —
> the `plan:` is authored on the warren, so that is what an author
> would go and edit.
>
> ⭐⭐ **A real bug the tests found: `Date.now()` is not a generation
> counter.** Two rebuilds inside one millisecond — a boot that rebuilds
> twice, a CMS save storm, a test — collide, and **a colliding
> generation sweeps NOTHING**, because every stale row's stamp equals
> the new one. The sweep then silently keeps nodes for rows that have
> stopped being places, which is precisely what the generation exists
> to prevent. It is `Math.max(Date.now(), this.generation + 1)` now.
>
> ⚠⚠ **Two proxy-boundary traps, both of them CLAUDE.md's written
> rules, both hit anyway.** (a) `#`-private METHODS are unreachable
> through the call-security proxy — inside a dispatched method `this`
> IS the proxy, so `this.#keepGraph(...)` throws *Receiver must be an
> instance of class DomainHook*. Every `#` method in the registry and
> the hook is `private` now. (b) An intra-singleton self-call trips the
> gate: `onCreate` calling the gated `rebuild()` arrives as a call from
> the registry rather than from `NavigationLogic` and is DENIED.
> `NavigationLogic`'s own module-private `normalize` exists for exactly
> this reason and says so; the gated face now forwards to an ungated
> `rebuildImpl`.
>
> ⚠ A test-harness trap worth keeping: the registry's suite had to teach
> its PM stub to match a **dotted path into an array** (`edges.to`),
> which is what Mongo does and what that index is for. A flat
> `d[k] === v` comparison silently returns nothing, which reads as
> *nobody points here* — a passing-looking test for a query that does
> not work.
>
> ⚠ `published` landed on `ParcelRecord` here rather than in B2, because
> B1's projection denormalises it. The FIELD is B1's; the verb, the
> eviction and the tombstone remain B2's.
>
> The subsystem doc was written here rather than at B4: `lint:schema`
> requires it the moment the collection exists, and it was right to.
>
> 15 + 8 + 7 tests; 254 across the touched neighbourhood. Typecheck
> clean, `lint:family` 66/66.

**Original wave spec** — `build(location-graph B1): the world's shape is a collection, rebuilt at boot and kept at the chokepoint`

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
fixture tree: template nodes, a branched plan's circulation nodes via
`nodeIdentityOf` and slot stubs, a TPA block, `crossesZone`, the
generation sweep), `platform/idea/hooks/__tests__/DomainHook.graph.test.ts`
(a save re-projects the row and its children; a projection throw
records a diagnostic and the save still lands), `lib/boundary/__tests__/Exitable.unbuilt.test.ts`
(a missing destination installs an unbuilt exit, records a diagnostic,
and `canTraverse` refuses with `gate: 'unbuilt'`).

**Acceptance.** A fresh boot stands the registry up and
`NavigationApi.nodesInZone('/world/terminus/university-avenue')` returns
the crossing with three edges and `crossesZone: true` on `south`;
`pointingAt(arrival-gate)` includes the crossing; `interzoneSkeleton()`
is small and names the crossing↔gate pair; a plan node's `identity`
equals the live circulation node's `getIdentityPath()`; the hook
re-projects a CMS save within the same request; `checkGraph(path)` on a
row with a dangling exit yields the finding and `errors` lists it; a
world with a dangling exit in content **boots**. Covers AC5 (the runtime
half), AC6, AC13's unbuilt case.

### B2 · Draft is a wall, offline is a camera — ✅ DONE

> **Note (2026-10-05).** `TitleClaim.published` + the `grant` stamp,
> `ParcelRegistry.setPublished` + the two new chain-of-title event kinds,
> `ParcelApi.setPublished`, the eviction, `Tombstone` + its row, and
> `title publish` / `title offline`.
>
> ⭐ **R2 is answered: the action is `write-template`.** `TreeAction`'s
> union was not opened at plan time; `write-template` is the authority
> to change what the rows at a path SAY, which is exactly what declaring
> them live is. An author holds title to their extent, so they already
> hold it. ⛔ No wizard check anywhere.
>
> ⭐⭐ **`publish` / `offline` are TITLE EVENTS.** The chain of title is
> what the register is for — *who held this, and what did they declare
> about it, when* — and taking content down is one of the louder things
> a holder can do to ground. A register that recorded a transfer but not
> that would be telling half the story. For both kinds `from` and `to`
> are the holder: nothing changed hands, which is the honest record.
>
> ⭐ **The eviction lives in `ParcelLogic`, not the registry**, because
> it needs the graph: `nodesInExtent` to find who is standing there and
> `pointingAt` (the reverse-edge query, which is why `{'edges.to': 1}`
> is an index) to find whose content just lost a destination. The
> registry stays the record's keeper. `NavigationApi.nodesInExtent` was
> added for it.
>
> ⚠ **Only a LIVE extent going dark evicts**, and that is the whole of
> the difference between the field's two lives: draft content has never
> been live, so nobody is inside it by construction. Reading the prior
> value needs the EXACT extent — `coveringParcelOf` is longest-prefix,
> so a child of an already-dark parcel would otherwise read as *was
> live* and evict people its parent already evicted.
>
> ⭐⭐ **A real robustness bug the tests found**: `AppApi.setting` throws
> on a cold cache, and the throw was escaping into `standTombstone`'s
> catch — so with settings unwarmed **no tombstone was minted at all**,
> and the evicted went nowhere. The exit cascade's settings rungs are a
> nicety, not a precondition: a tombstone with no way out is far better
> than no tombstone, because by the time that code runs the people have
> already been moved. Each rung is now individually defensive.
>
> ⚠ **Three gates caught me again, all fairly.** `lint:presentation`:
> the tombstone row's `shortDescription: "a bare marker"` begins with an
> article, which is the register's job — stripped. `lint:lib-statics`:
> `Tombstone.identityFor` was one new static over the ceiling, and the
> gate's question gave the better placement — *which identity does a
> tombstone for this extent answer to* is a question the OFFLINING
> asks, and the offlining is the only asker, so the formula moved to
> `ParcelLogic` and **the test moved to the guarantee it buys** (offline
> the same ground twice, one marker stands) rather than the string.
> `lint:test-content`: two kernel tests named locality paths; synthetic
> `/test/**` now.
>
> ⚠ Slate open 4 (offlining a warren HOST migrates the role) stays open,
> as the plan said. What shipped offlines extents of template nodes.
>
> 13 + 7 + 4 tests. Typecheck clean.

**Original wave spec** — `build(location-graph B2): published lives on the parcel; a dark place evicts and says who to tell`

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
follows. Covers AC12, AC13.

### B3 · A map you own, and it can be wrong — ✅ DONE

> **Note (2026-10-05).** The `map` document kind, the derived-owner
> writer, the claim shape, the growth rule, the three perception seams,
> `publishedStops`, and the `map` verb.
>
> ⚠⚠ **AC11 needed a second mechanism the plan did not have**, and this
> is the wave's main finding. D13's growth rule handles *the far side
> changed* — two claims for one direction, both rendered. But the COMMON
> case is an exit being **walled up**, and that records **nothing at
> all**: the player saw no east exit, so there is no second claim to
> disagree with the first. AC11 would have been unmet for the shape it
> was actually written about.
>
> ⭐ The fix needed no new state. The PLACE claim is the *I looked here
> at T* record, so **an edge older than the latest look at its place is
> an edge that was not there last time anybody looked** — and the
> renderer says so (*"recorded 2d ago; not seen when you last
> looked"*). Nothing is merged, nothing is deleted, and the staleness is
> derivable from two timestamps the document already carries.
>
> ⚠⚠ **`toLabel` had to join the dedupe key**, also found by a test.
> D13's key is `(kind, place, dir, to, channel)`, but `to` is **null for
> anything not resident** — so east→yard and east→cellar keyed the same,
> and the second observation silently BUMPED the first instead of
> appending. That erases the disagreement the whole model exists to
> preserve, which is the one failure mode this build cannot have.
>
> ⭐⭐ **The forced frame is why `saveMap` exists at all**, exactly as
> G-WRITE predicted: arrival auto-senses through `forceCommand`, and
> `getActingAuthor()` is `null` inside a forced frame, so the ordinary
> context gate would fail closed for the most important write this kind
> has. `saveMap` is the fifth ownership bypass, on `saveInstrument`'s
> rails, gated to `NavigationLogic`.
>
> ⭐ **`PublishedStop` is the machine-readable half of a board.**
> `renderDepartures` is prose for a player; `publishedStops()` is the
> same facts with **no viewer and no clearance** — a station you are not
> registered for is still one you have heard of. Optional on the shape,
> so a network that advertises nothing answers honestly; and a route
> whose node will not resolve is skipped rather than throwing, because
> one bad row must not erase the board.
>
> ⚠ The place hook fires **in the dark too**: you cannot describe a
> pitch-black room, but you have been there and can feel the ways out. It
> also fires when a room has NO exits — the place was perceived either
> way.
>
> ⚠ A TS narrowing trap: hoisting `obviousExitsFor` out of its
> `if (hasExits)` block lost the aliased type-predicate narrowing. The
> ternary keeps it.
>
> ⚠ `mapClaimKey` was removed from `lib/location/MapClaim.ts` before it
> shipped — a free exported helper in `lib/` is drift by definition, and
> the dedupe key is the writer's business anyway.
>
> ⚠ `lint:controller-rows` caught the missing `MapController.yaml`: a
> view whose controller row resolves to nothing answers
> `controller-error` **every time, for everybody, forever**, while its
> controller tests stay green because they instantiate the class
> directly. Exactly the silent-failure class the five reachability links
> exist for.
>
> 12 + 13 tests; 414 across the perception/Avatar neighbourhood.
> Typecheck clean, `lint:family` 66/66.

**Original wave spec** — `build(location-graph B3): a player owns a map of each locality they know, written when they look and never corrected`

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
append-on-change, prefix aggregation, the publication claim, **a null
handle writes no claim**), `MapController.test.ts` (no document → "no
map of"; disagreement renders both), `tpa/src/__tests__/FastTravel.publishedStops.test.ts`,
`Avatar.map.test.ts` (a vessel writes nothing; a forced arrival writes).

**Acceptance.** Walking gate → crossing → campus gate then `map
terminus` lists three places and the two edges used and nothing else;
`map hinkley-hills` before going says there is no map; reading the board
puts Hinkley Hills' stop on the map marked published; walling an exit
by wizard leaves the old claim until the next `look`, after which both
render; `eval`-copying `/home/A/map/terminus/hinkley-hills` to `/home/B/…`
lets B `map hinkley-hills`; a lounge satellite visit writes nothing;
`lint:object-verbs` still 0. Covers AC8–11, AC14–20 (AC18 by the
declared-kind reset rule; AC19 by DA3's null handle → no claim; AC16 by
the handle being the slot's `row#<extent/leaf>` and the circulation
node's plan identity, both of which survive a reap).

### B4 · The drive, the docs, the slate — `drive(location-graph): <what driving found>` · `docs(location-graph): the subsystem doc`

`packages/wire/tests/location-graph.dirty.wire.test.ts` (it rents two
stalls, authors a dangling exit, offlines a zone, walls an exit —
`.dirty.`), the **twelve** steps with their numbering; the two hand-run
restarts (step 3's stall reopening; step 4's boot with a dangling exit)
recorded here; step 12's browser inspection recorded here.
`docs/subsystems/location-graph.md` written; `instance-addressing-slate`
and `location-graph-slate` compacted to what is left (`/compact-slate`),
`map-slate` and `pathfinding-slate` updated to point at the index.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the row read · the identity read | — (MQL `/path` seed for a glob-free path) | — | — | — | — (reads) |
| the uniqueness scan | — | — | — | — | fires inside `restoreOrSeed` / `capture` / `materialize`; its THROW is the observable |
| the handle · the discovery key | `search` (existing) | existing | — | — | — (a read) |
| the census | `pnpm lint:identity-mints` | `package.json` script (roster derived) | the `identity-keyed-by` marker at each site | — | ⚠ an unmarked site is an ERROR, not a count — a new mint with no marker fails the family |
| the continuity assertion | — | — | `identityNamespace` statics on `Avatar`, `ShadeAvatar`, `Party` | — | ⚠ fires at every `clone` of a DECLARING class with `asIdentityPath`: a wrong prefix is a boot failure for the party warm and a login failure for avatars — loud by design; A2's table test keeps it from being a surprise |
| the wire body's identity | `enter` (existing sandbox verb) | existing | — | — | the `getIdentityPath()` override is what the ledgers read; the test pins it |
| the stall's pitch | `stall rent` / `stall give-up` (existing) | existing (`MarketStalls.commandContributions.peers`) | `stalls.yaml` `pitches:`; `lets` persisted on the fixture's record | the fixture comes up with the square (`props:`) — ⚠ its own record must materialize (RA1) | existing subcommands |
| the graph | — | — | `location_graph.yaml` → `gen:schema`; `PlaceNode.fieldMeta` | **`boot:` entry in `packages/content/platform/pack.yaml`** for `/platform/idea/LocationGraphRegistry` + its row; `hooks.yaml` already binds `DomainHook` | — |
| the lint | `pnpm lint:location-graph` | `package.json` script (roster derived) | reads files | — | — |
| `published` | `title publish` / `title offline` | existing `title` affordance | `TitleClaim.published` parsed by `ParcelRegistry.grant`; `parcel_events` kinds | claims applied at pack install | one required `greedy` string arg each — ⚠ required with no default fails closed and silent; the subcommand help names the shape |
| the wall | `go <dir>` | — | `ParcelRecord.published` | — | `Exit.canTraverse` |
| the tombstone | — | — | row `/platform/location/tombstone` (a kind; `lint:instanceable` resolves its `class:`); its mint carries an `identity-keyed-by: referenced` marker | cloned on demand | — |
| the map write | — (arrival `sense`, `look`, `teleport` board, traverse) | `Perceiver` hooks implemented on `Avatar`; the three call sites | `DocumentKinds.map` (PM creates no natural-key index; reset keeps it) | — | `saveMap`'s `FromModule` gate — ⚠ the Logic's module id must be exactly `/platform/idea/api/NavigationLogic#NavigationLogic` or every write silently refuses; `lint:gates` checks the string |
| the map read | `map [locality]` | **`Avatar.commandContributions.self` gains `platform/cmd/perception/map.yaml`** — a view nothing affords is dead silently | — | — | optional greedy string |
| publication | bare `teleport` | existing | `TravelNode.publishedStops` implemented in `FastTravel` | — | optional method; absent = nothing advertised |

---

## Acceptance-criteria coverage

All twenty, from the requirements doc as of commit `6a4560e5a`.

| AC | wave |
|---|---|
| 1 secret in one instance not in others | A1 (DA3 + DA4); drive step 1 |
| 2 ephemeral find does not persist | A1 (null handle); drive step 2 |
| 3 every instance of a shared row, stamped included; a continuity family answers from its register | A0 (`findAllByTemplatePath`; the MQL seed); `PlayerApi`'s roster unchanged — a doc line; drive step 3 |
| 4 two stalls → two counters, stock, takings; a stored key resolves | A0 (the needle) + A4 (the pitch); `findByTemplatePath(ids.counter)` untouched; drive step 3 |
| 5 told which row + direction before restart | B0 (file lint) · B1 (hook → diagnostic → `errors`/CMS) |
| 6 boots with a dangling exit | B1 (D10 unbuilt); drive step 4's restart |
| 7 non-reciprocal · unreachable · one-sided cross-zone reported | B0 · B1; drive steps 5, 6 |
| 8 map = places been + edges used, no more | B3; drive step 7 |
| 9 unvisited locality says so | B3; drive step 8 |
| 10 published knowledge distinguishable | B3 (D16); drive step 9 |
| 11 old claim kept; disagreement visible | B3 (D13 growth rule, D17 render); drive step 10 |
| 12 offline evicts · refuses naming the place · tells the owner | B2; drive step 11 |
| 13 exit into never-published content refuses, boot survives | B2 (+ B1's unbuilt); drive step 11 |
| 14 nothing crosses the wire unearned | B3 (structural, D17) + drive step 12 (browser) |
| 15 copy to another tree, read as own; one locality only | B3 (D13 path) — copied by wizard `eval`; no player verb (non-goal) |
| 16 lot-7 survives reap and re-mint | B3 — the handle is the slot's `row#<extent/leaf>` (DA3) and the lane's identity is re-derivable from plan + extent (`nodeIdentityOf`, 9a's worked case); the gate edge from `onTraversed` |
| 17 group by building where declared | B3 (`group` = `_address`, D17) |
| 18 survives the nightly reset | B3 (declared kind → `wipe-except` keeps it; `onVanish: keep`) |
| 19 lounge room is honestly nothing | A1 (null handle) + B3 (no claim) |
| 20 second locality + second player need no engine change | B3; demonstrated in the drive with Hinkley Hills + a second session |

Nothing unmapped. A2 (the census + the continuity assertion) and A3
(the wire body) have no AC of their own: A2 is the *every mint site names
what keys on it* Stage A goal, proven by the meter reading 2 and the
rule refusing an unmarked site; A3 makes the invariant `Stuff.ts`
already states true.

---

## Test & gate strategy

- **Unit (Vitest, beside the source) — Stage A:** the registry reads
  (`findAllByTemplatePath` row semantics incl. the identity-passed case;
  `findByIdentityPath`; `findByTemplatePath` still throws on two); the
  needle (stamped keyed collision THROWS — red today); `getDurableHandle`
  per rung; `Exit.discoveryKey` (fails first); the pin's scope; the census lint's
  own tests + the continuity assertion (declared families pass, a wrong
  prefix throws, an undeclaring class is not asserted);
  `PlatPlan.nodeIdentityOf`; the wire body (one member in the player's
  bucket; the method projects; the ledgers attribute to the player);
  `StallController` two renters + book survival + full square +
  `give-up`. **Stage B:** `GraphInvariants`
  rules; `LocationGraphRegistry` projection + generation sweep (plan
  node identity == live identity); `DomainHook` re-project + swallow;
  `Exitable.unbuilt`; `ParcelRecord.published` + `grant`;
  `Exit.unpublished`; `Tombstone` cascade + self-destruct;
  `NavigationLogic` map writes (dedupe, append, prefix read, null handle
  → no claim); `MapController` render; `FastTravel.publishedStops`;
  `Avatar.map` (vessel writes nothing; forced frame still writes).
  Everything touching the wired runtime imports `test-bootstrap`
  (`lint:test-bootstrap`).
- **Only the drive can prove:** a second dorm room's door still hidden
  after the first is found (step 1 — the two prior escapes of this bug
  class were found live); the lounge re-visit (step 2); the stall's
  pitch surviving a hand restart (step 3); the boot surviving a dangling
  row (step 4, hand restart, recorded); the live eviction with a player
  inside (step 11); the board → map (step 9); the wire-payload
  inspection (step 12) — ⚠ the wire drive is not the live drive: step 12
  is a browser step, recorded in the plan.
- **Gates:** `pnpm -C packages/server lint:family` after every wave;
  `pnpm test:near` + the terminus pack's vitest (A4) per wave;
  `pnpm test` exactly twice.

---

## Risks & opens

### Stage A

- **RA1 — ✅ ANSWERED 2026-10-05, and the hazard was real.** Nothing
  establishes a `props:` fixture on a non-`Persistable` street, so the
  book would have come up empty at every boot; `MarketStalls.onCreate`
  materializes its own keyless record. A second defect of the same
  shape was found in A4's own design (a pitch-keyed record outliving
  its let hands the next renter the last keeper's counter) and `give-up`
  deletes the record now. See A4's note. *Original text:*

- **RA1 — the pitch book's survival (A4).** G-STALL did not verify how a
  `props:` fixture on a non-Persistable `Street` gets its own record
  back at boot (`persistence.md:914`: `applyProps` is a no-op; holders
  seed). If the fixture comes up bare, the book is empty after a
  restart, the next `stall rent` allocates pitch 1 to a stranger, and
  `hasRecord(ids.counter, key)` RESTORES THE FIRST KEEPER'S COUNTER TO
  THEM — the clobber the invariant exists to stop, by another door. A3's
  first act is to read `seedBornWith`/`applyProps` and the Stock's own
  record path; the fix if needed is `MarketStalls.onCreate` restoring
  its own record under the scope-derived key. The hand restart in drive
  step 3 is the proof; **A4 does not land without it.**
- **RA2 — the census's ceiling is a judgment, and judgments drift.** The
  `identity-keyed-by` vocabulary is closed (`own-record | referenced |
  lookup | none`) so a site cannot justify itself with a new word; but a
  site can MIS-mark (`referenced` with nothing referencing it). The lint
  cannot see that; review can. The G-MINT table is the audit of record
  for the thirteen; a fourteenth is a review question, which is the
  marker's job.
- **RA3 — two individuation forms coexist, and 9d says one.** Keyed
  individuation is `row#key` (the handle); stamped individuation is
  `row/decoration` (the corpse, the stall, the tombstone, the
  circulation node). The requirements' 9d says *individuation never
  mints*; the shipped sites do, and moving them onto the persistence
  spine (a record per corpse) is not this build. Requirements 9a now
  separates the two mechanisms — the name decides the stamp, the key
  decides the handle — so a stamped individuation that is re-derivable
  or recorded is legitimate on its own terms. **Recorded as a lean in
  `instance-addressing-slate` at compaction, not resolved here.**
- **RA4 — the wire body (PROMOTED to wave A3; DA8).** The hazard is the
  ORDER: the method override must land before the stamp is removed, or
  in-circle acts attribute to the wire body's row for every visitor. A3's
  file list is ordered and its test pins both halves. ⚠ Any
  `_identityStampOf`-shaped reader that was relying on the wire body
  being stamped (grounding found none — the index is the only raw-slot
  reader) would surface in the holodeck wire tests, which run in A3.
- **RA5 — `standUpKeyed` cannot mint a stamped keyed host.** `cloneHost(scope, key)`
  needs a ROW to `clone()` and the record's scope is the identity; for a
  stamped keyed host the pin would have to carry both. No pinned class
  is stamped today; DA7 fixes the scope and records this.
- **RA6 — go-live rehydration deliberately stays exact.** `PackLogic`/`CmsLogic`
  move to `findByIdentityPath` BY NAME so a future reader does not
  "fix" them onto the row read and re-hydrate every minted stall from
  its seed on a CMS save. The comment at each site says why.
- **RA8 — the guest and the corpse are left alone ON PURPOSE.** The
  census marks both `none` and the ratchet starts at 2. A build agent
  reading "unjustified" as "fix it" is the risk; the markers' text names
  the carve-out and the destination (the slate; the carcass-chain
  build), and A2's acceptance says *unmints nothing*.
- **RA7 — the `/foo/bar*` spelling.** DA2 routes a glob-free MQL path
  through the row read and leaves `*`'s meaning alone. If the user
  wants a trailing `*` to mean *the row and everything minted under it*,
  that is a grammar change for the slate (`mql-grammar.md`), one line in
  `resolver.ts`.

### Stage B

- **R1 — the dorm's hidden exit (drive step 1).** `dormroom.yaml`
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
  B2 reads the union in `lib/access` and picks the parcel-mutation
  action; if none fits, `AccessApi.can(giver, 'offline', zone)` by
  resource. Never a wizard check.
- **R3 — places with no resolvable locality** write no map claim. The
  B0 lint censuses "a singleton place whose address resolution is
  `none`" as info so the count is visible; the drive rooms all resolve
  (verified addresses above).
- **R4 — the census counts may be large** (plain asymmetry across 197
  edges). Ratchets, not errors; the first run's numbers go in B0's
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
- **R9 — the slate's "scheme 2 mints identity" is false** (G-ID), and
  its "six mint sites" is thirteen (G-MINT). Corrected at compaction.
- **R10 — `nodesInOrder` for a linear plan is unbounded**; the cap from
  `defaultCapacity / frontagesPerNode` must be computed or the
  projection loops to `maxNodes`.
- **R11 — reading `routes:`/`seatIn:` by field name** couples the
  projection to the tpa pack's field names without an import. Recorded
  as a lean; the alternative (a kernel `TravelNode` row shape) is the
  router build's.

---

## Deferred seams

- **Stamped individuation onto the spine** — the corpse, the tombstone,
  the circulation node and the stall counter mint `row/decoration`
  identities; 9d's *individuation never mints* would have each be a
  keyed instance (`restoreOrSeed`) with a `row#key` handle and no stamp.
  Promote at the third consumer → `instance-addressing-slate`.
- **A pin that can mint a stamped keyed host** (RA5) → `chattel.md`'s
  pin section, when a pinned class is first stamped.
- **The guest mint** (unjustified, carved out) → `instance-addressing-slate`,
  the first entry the ratchet falls by. **The corpse mint** → the
  carcass-chain build (`reqs/second-tier`), then the slate if they keep
  it.
- **`/foo/bar*` as an MQL spelling for a row's instances** (RA7) →
  `mql-grammar.md`.
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

1. `docs/requirements/location-graph-requirements.md` (as of
   `6a4560e5a`) · `docs/slates/builds/instance-addressing-slate.md` ·
   `docs/slates/builds/location-graph-slate.md` §§ 3–6, 9, 13–16
2. **Stage A:** `api/stuff.ts` (`#updateIndexes:230`, `#cloneInner:545–631`,
   `singleton:698`, `findByTemplatePath:1438`, `findAllByTemplatePath:1456`,
   `_reindexTemplatePath:1474`, `findByPathGlob:1497`) ·
   `lib/collections/PathTrie.ts` · `lib/stuff/Stuff.ts` (`getIdentityPath:536`,
   `_identityStampOf:645`, the stamp gate `:677–720`) ·
   `lib/stuff/Singleton.ts` · `lib/persistence/Persistable.ts:95–240` ·
   `platform/idea/api/PersistableLogic.ts` (`liveKeyed:146`,
   `assertUniqueKey:155`, `cloneHost:870`, `captureImpl:901`,
   `materializeImpl:942`, `placeIdOf:972`, `restoreOrSeedImpl:1180`) ·
   `platform/idea/api/ChattelLogic.ts:190–250` · `platform/idea/api/ResidencyLogic.ts:800–830` ·
   `api/mql/resolver.ts:328–340, 772–780` · every G-MINT site ·
   `platform/agent/sandbox/SandboxAvatar.ts` + `platform/idea/api/SandboxLogic.ts:330–370` ·
   `scripts/check-person-keys.ts` (the lint shape to copy) ·
   `content/terminus/src/market/thing/MarketStalls.ts` +
   `idea/cmd/StallController.ts` + `content/world/terminus/market/{square,stalls,thing/stall,cmd/stall}.yaml` ·
   `lib/location/OuterWarren.ts:480–520` · `lib/location/PlatPlan.ts`
3. `packages/server/src/mud/lib/boundary/Exit.ts` (`getDiscoveryKey:400`,
   `canTraverse`, `TraversalGate`) · `lib/boundary/Exitable.ts`
   (`_applyExitSpec`, `obviousExitsFor`, `verifyOutboundExits`)
4. `platform/idea/hooks/DomainHook.ts` · `hooks.yaml` ·
   `backend/PersistenceManager.ts:797` · `platform/idea/api/PackLogic.ts:2979, 3333`
5. `api/navigation.ts` · `platform/idea/api/NavigationLogic.ts` ·
   `platform/idea/AddressRegistry.ts` + `api/AddressLogic.ts:259` ·
   `platform/idea/MaterialCatalogue.ts` · `backend/BootstrapManager.ts:209`
6. `lib/stuff/Template.ts` (`findByClass`, `_materialize`,
   `ancestorPaths`) · `api/zone.ts:159`
7. `lib/parcel/ParcelRecord.ts` · `platform/idea/ParcelRegistry.ts:369` ·
   `api/parcel.ts` · `platform/idea/cmd/civics/TitleController.ts` ·
   `packages/content/platform/content/platform/cmd/civics/title.yaml`
8. `lib/document/DocumentKinds.ts` · `api/document.ts` ·
   `platform/idea/api/DocumentLogic.ts:38–110, 282` ·
   `api/execution-context.ts:523` · `packages/server/src/schema/documents.yaml`
9. `lib/spatial/Mobile.ts:385–570, 721` · `lib/character/Avatar.ts:242,
   603, 879` · `lib/description/Perceiver.ts:100–160` ·
   `platform/idea/cmd/perception/SenseController.ts:150–200` ·
   `LookController.ts:85–120, 230–245` · `platform/idea/cmd/movement/TeleportController.ts:100–125`
10. `lib/travel/TravelNode.ts` · `packages/content/tpa/src/lib/FastTravel.ts:330–470`
11. `scripts/check-location-classes.ts` · `scripts/pack-roots.ts` ·
    `scripts/check-schema-docs.ts` · `scripts/check-object-verbs.ts` ·
    `scripts/check-person-keys.ts`
12. `packages/server/src/schema/parcels.yaml` · `beliefs.yaml` ·
    `holder_snapshots.yaml` · `chattel.yaml` · `lib/persistence/SchemaDoc.ts`
13. `packages/wire/tests/fishing.dirty.wire.test.ts` ·
    `packages/wire/src/harness/index.ts`
14. Content: `…/university-avenue/location/crossing.yaml` ·
    `…/terminal/location/arrival-gate.yaml` · `…/duncan-hall/location/dormroom.yaml`
    · `…/hinkley-hills/idea/lot-holder.yaml` · `…/hinkley-hills/thing/tpa.yaml`
    · `packages/content/platform/pack.yaml` · `packages/content/terminus/pack.yaml`

---

## Drive record

*(appended at build time, not at plan time)* — the output of running
the requirements doc's twelve-step drive against the running game
(`packages/wire/tests/location-graph.dirty.wire.test.ts`), the hand-run
restarts of steps 3 and 4, the browser inspection of step 12, and what
each found. Precedent: `farming-plan.md § Checkpoint A — the drive record`.
