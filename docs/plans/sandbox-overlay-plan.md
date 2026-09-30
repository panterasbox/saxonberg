# The sandbox overlay — implementation plan

Executes [sandbox-overlay-requirements.md](../requirements/sandbox-overlay-requirements.md)
(seeded by [avatar-family-slate](../slates/builds/avatar-family-slate.md)
§ Sequencing 2–4). **Kind:** feature. **Lead end:** kernel — the consumer
is the circle every player already has and the shipped verbs that throw
inside it. The build gives the policy table a fifth disposition,
`overlay/copy` (a scoped store that starts empty and is deleted at the
door), moves nine collections plus `holder_snapshots` onto it, retires
`WireBody.shouldPersist()` as the guard on the player's own record,
makes every surviving refusal one in-fiction sentence, and moves the
money after the refusal in `buy` and `title buy`.

> ⚠⚠ **Read § Where the plan departs from the requirements before
> anything else.** Grounding found three things the requirements did not
> know: two of the drive's four rehearsal acts mint a `groups` row (which
> stays refused), the forum/chat catalogues deny in-circle *in memory*
> before the store is ever consulted, and the "one-row copy" of
> `holder_snapshots` must not happen. None reopens product scope; all
> three change what the code has to do, and one changes the drive script.

---

## Grounding

Verified 2026-09-30 on `reqs/avatar-family` at `92e7c377b`, by opening
the files. Paths are repo-relative; line numbers are current at plan
time.

### The policy seam — `packages/server/src/backend/PersistenceManager.ts`

- `SandboxWriteRefusedError` :196–207 (message is engine prose —
  `PersistenceManager: save on 'parties' refused from circle scope …`);
  `SandboxOverlayUnimplementedError` :207–246 (MR !308's backstop).
- `STAMP_COLLECTIONS` :287 and `SHADOW_COLLECTIONS` :298 — each derived
  from `COLLECTION_POLICIES` **by verb alone**.
- `deleteMany` :711–769 — the switch: `refuse` throws, `stamp` composes
  `circleScope`, `shadow/skip` returns 0, `shadow/overlay` throws,
  `pass` passes.
- `dispatchSave` :940–1000 — `stamp` stamps the doc, `pass(mark)`
  stamps, `shadow/skip` returns a receipt id, `shadow/overlay` throws;
  an unclassified collection fails closed.
- `dispatchDelete` :1040–1090 — `stamp` sets `scopeGuard`, which
  `persistDelete` :1352–1375 composes into `{_id, circleScope}`.
- `persistSave` :1318–1350 — ⚠ an update with `_id` does
  `updateOne({_id}, {$set})` **with no scope guard on any verb**: from
  circle context a `stamp` save of a field row's `_id` would re-stamp
  that field row into the circle. Rare on the append-only ledgers; the
  common case on the mutable records this build moves (a `Subject` or
  `Channel` resolved from the world and re-saved from inside).
- `composeScopeReadFilter` :1111–1133 — STAMP circle reads `$or[field,
  own]`; STAMP field reads and SHADOW any-context reads
  `circleScope: {$exists: false}`; a query already naming `circleScope`
  or `$or` passes through (the discard path relies on this).
  `findById` :630 composes the same filter.
- `contentCacheEngaged` :1150–1158 — disengages the resident `content`
  cache if `content` is ever STAMP or SHADOW. ⚠ Keyed on *not those
  two verbs*, so a fifth verb would not disengage it.
- The derived-index loop :1596–1614 — `{circleScope: 1}` partial on
  every `STAMP_COLLECTIONS` member; `PlannedIndex.source: 'derived'`.
- `ensureTextIndex` :1405–1433 — only **text** indexes are
  dropped-and-recreated on a shape conflict; a unique index whose shape
  changes is **not** pruned.
- The scope resolver is installed by `BootstrapManager.ts:139–142`
  (`OMNI_SCOPE` → `null`).
- Imports :34–39 — PM already imports `mud/lib/persistence/{Collections,
  CollectionPolicy, SchemaDoc}`; backend → mud is an allowed direction
  (`check-mud-imports.ts:114` governs `mud/**` only).

### The vocabulary

- `packages/server/src/mud/lib/persistence/CollectionPolicy.ts` —
  **GENERATED** by `packages/server/scripts/gen-schema.ts` (`emitPolicy`
  :208–280 holds the type union and the doc comment as template text).
  Type today: `stamp | refuse | pass{mark?} | shadow{mode:'skip'|'overlay'}`.
- `SchemaDoc.#parseSandbox` :252–304 — `SANDBOX_VERBS = ['stamp',
  'refuse', 'pass', 'shadow']` :76; rejects `mode: overlay` with a
  message naming the fix.
- `packages/server/scripts/check-schema-docs.ts` (`lint:schema`) —
  regenerates and diffs `Collections.ts` / `CollectionPolicy.ts` /
  `ResetPolicy.ts`; its fixture `goodDoc` uses `sandbox: 'pass'`
  (`scripts/__tests__/check-schema-docs.test.ts:37`);
  `gen-schema.test.ts:69–80` renders "the sandbox verbs in their four
  shapes".
- Rationales: the 48 `packages/server/src/schema/*.yaml`. Twelve say
  only *"REFUSE under the sandbox."*: `chattel_events`, `parcel_events`,
  `forum_boards`, `forum_subjects`, `forum_entries`, `forum_votes`,
  `forum_events`, `channels`, `parties`, `contracts`, `contract_events`
  — and `pack_installs` carries no sentence at all (a 13th, not counted
  by the requirements; it stays refused and gets one line).
- `holder_snapshots.yaml` — `sandbox: pass`, `reset: wipe`, indexes
  `{scope}`, `{owner}`, `{scope, owner} unique`, `{writtenAt}`. `scope`
  is the **host** scope (`PersistedRecord.ts:10` — "the host's singleton
  `templatePath`"), not `circleScope`.

### The crossing — `packages/server/src/mud/platform/idea/api/SandboxLogic.ts`

- `STAMP_COLLECTIONS` :93 — a second derivation of the same set.
- `discardScopeImpl` :121–132 — `deleteMany({circleScope})` over
  STAMP_COLLECTIONS; cancels schedules / clock / MQL; calls
  `BankingApi.discardScopeOverlay(scope)` (`BankingLogic.ts:2497`, the
  in-memory per-scope map precedent at :109). Its docstring claims
  totality; it derives from one verb.
- `sweepOrphansImpl` :141–163 — same set, same blind spot.
- `closeSessionImpl` :280–302 — exits every occupant, then discards.
- `enterImpl` :310–425 — the vessel is cloned at :340 under
  `runRootGuarded(…, { circleScope: scope })` with `asIdentityPath:
  actor.getIdentityPath()`; `forkRuntimeState` :359; the park capture
  `actor.save()` :379 in field context; socket transfer under OMNI :387.
- `exitImpl` :436–513 — socket return, `mergeRuntimeState(…,
  EPISTEMIC_MERGE_ALLOWLIST = ['Contacts'])`, then
  `StuffApi.destruct(wireBody)` — **all under `circleScope: OMNI_SCOPE`**
  (:472). Unpark :489 under OMNI.
- `seedCopyImpl` :525–600 — the aperture strips `_chattelId` (:581), so
  a circle copy is never a stamped chattel.
- The circle scope for a personal circle is `/home/<playerId>`
  (`circleScopeFor` :166) — **the same string on every visit**.

### The body — `packages/server/src/mud/platform/agent/`

- `Avatar.postRegister` :696–765 — `spineKey = shouldPersist() ?
  getIdentityPath() : null`; `hasRecord(spineKey, spineKey)`; no
  snapshot → `installDefaultLoadout()` then `capture`; snapshot →
  `materialize` + `reconcileMortalState` + loadout re-provision.
- `Avatar.shouldPersist` :823 — the **guest** gate (`!isGuest &&
  super`). `Avatar.save` :843–854 — guest-guarded, then `capture(this,
  identityPath)`. `Avatar.onDestruct` :1442 — `void this.save()`,
  fire-and-forget. `Avatar.onLinkdead` :1478–1518 — saves.
- `sandbox/WireBody.ts` — `postRegister` runs `super.postRegister({…,
  playerId: undefined})` :117; `shouldPersist() → false` :121;
  `getIdentityPath()` → the real identity :130; `startAutoSave` no-op
  :136; `onLinkdead` :159 routes to the session machinery and does
  **not** save.
- `Shade.ts:99` — `shouldPersist() → false`. **Not touched.**
- `lib/persistence/Persistable.ts:215` — `shouldPersist(): !this._reverting`;
  `markForRevert()` (:150 doc) flips it; `cleanupOnDestruct` :359–370
  captures if `shouldPersist()`. **Not touched** beyond what W3 states.

### The spine — `packages/server/src/mud/platform/idea/api/PersistableLogic.ts`

- `captureImpl` :896–935 — `findByScopeAndOwner(scope, owner) ?? new
  PersistedRecord()`, sets fields, `rec.save()`. `materializeImpl`
  :937–958 mirrors it. Both go through `Document` → `PersistApi`/PM, so
  the read filter applies.
- `assertUniqueKey` :155–169 and `liveKeyed` :146–153 — scan
  `StuffApi.findAllByTemplatePath(scope)`; the registry's
  `byTemplatePath` is keyed **identity ?? template** (`api/stuff.ts:593`),
  so the parked Avatar and its wire body (cloned `asIdentityPath` = the
  same identity) share a bucket. With `shouldPersist()` true on the
  vessel, `assertUniqueKey(identity, identity, wireBody)` finds the
  parked Avatar keyed identically and **throws** — the crossing breaks
  the moment the override is retired unless the invariant learns about
  circle scope.

### The refusal surface

- `packages/server/src/mud/lib/command/CommandGiver.ts` — the three
  `controller-error` sites :885 (`executeCommand`'s outer catch), :1237
  (the detached async body) and :1257 (`_executeOne`); `proseForFrameworkNote`
  :129 renders `Something went wrong in ${controller}: ${detail}`;
  `recordControllerThrow` :167 writes a diagnostic; `emitDispatchResponse`
  :181 fires the `shell.error` scene for framework notes only.
- Caught-and-printed: `ForumController.ts` :166, :194, :255, :274,
  :301, :377, :413, :443; `ChatController.ts` :343, :380, :405, :480;
  `SubjectController.ts` :69 — all `this.fail(context, (err as
  Error).message, '<reason>')`. `CommandController.fail` :147–170
  sends the string as a scene and notes `controller-rejected`.
- **The in-memory guards the requirements did not see.**
  `SecurityApi.assertFieldMutation` (`api/security.ts:1181–1200`) throws
  a `SecurityError` (`policyName: 'SandboxBoundary'`, message *"sandbox
  boundary denied makeSubject: this mutation writes field-visible shared
  state…"*) at: `SubjectCatalogue.ts` :157 `makeSubject`, :217
  `makeThreadSubject`, :354 `deleteSubject`, :375 `renameSubject`;
  `ChannelCatalogue.ts` :499 `promoteAdHocToManaged`, :552
  `createPlayerChannel`, :590 `createBoundChannel`, :626
  `attachChatToSubject`, :655 `disbandPlayerChannel`, :679
  `setAnonymity`, :693 `renamePlayerChannel`; plus `ParcelRegistry`
  (7), `SoulCatalogue` (4), `AddressRegistry` (1), `hot-reload.ts` (2).
  **So `forum make` and `chat make` never reach the store today**: the
  catalogue denies first, in memory, and the player reads the boundary
  sentence, not the `PersistenceManager:` one. The two catalogues hold
  flat-global title maps (`SubjectCatalogue.byTitle` :85,
  `ChannelCatalogue.byName` :120) warmed from field reads at boot.
- `party form --durable` → `PartyLogic.formImpl` :335–376: the Party
  Idea is cloned (circle-born), `persistParty` → `PartyRecord.save()`
  (`parties`), then `ChatApi.createBoundChannel(...)` inside a
  `try { } catch { /* channel optional */ }` — the catalogue deny is
  **swallowed silently** today.
- `chat make` → `createPlayerChannel` → `makeSubject(owner, name, {})`
  → **`mintBackingGroup` → `Group.save()` → `groups`**, which stays
  `refuse`. Curated `forum make` (no `--open`) → the same
  `mintBackingGroup`. `forum make --open`, `subject make --open` and
  `party form` (bound `groupRef`) mint no group.
- `GroupLogic.ts:103, :152` read `groups` by `find`/`findById`;
  `AccessLogic.ts:151` reads membership for group-owned parcels. A
  scoped-only read of `groups` inside a circle would blind a body to its
  own world memberships (a `/studio/<groupId>` circle could not read its
  owner). `groups` therefore cannot be `copy` — confirming D2.
- `DropController.ts:220` and `PutController.ts:292` — `void
  x.followCustody()`. `ChattelLogic.followCustody` :197 early-returns on
  an unstamped good; the aperture strips the stamp; a wire body's
  inventory is circle-born. Unreachable in practice, unhandled if reached.
- `ProducerLogic.ts:353` — `void appendFromEngagement(p).catch(err =>
  console.error(...))`: the silent swallow D8 names.
- `packages/types/src/index.ts:620` — `ControllerErrorNote`; the Note
  union is closed; `controller-rejected.reason` is an open kebab-case
  enum (response-envelope.md § Reasons).

### The money-first sites

- `BuyController.ts` — `buyStock` :137–176: `settleSale` → `handOver` →
  `stampChattel` → `followCustody`; `buyListing` :200–262: the same
  order. `reject(giver, context, line, note)` and `rejectBroke` exist.
- `TitleController.ts` — the sale :290–400: the ascent gate, then
  `takePayment` :512 ("The money leg FIRST"), then `ParcelApi.subdivide`
  (which hits `ParcelRegistry.subdivide`'s `assertFieldMutation` before
  the `parcels` row), `transfer`, `setKeyway`. `reject(context, giver,
  line, reason, detail)` :550.

### The drive harness — `packages/wire/`

- `Session.open(handle, { startLocation, wizard })` (`src/harness/session.ts:261`)
  — any number of sessions per file (identity.dirty opens three);
  `cmd()` :539 returns `{ status, notes, said() }`; `query()` :631 runs
  MQL (`me:i` with `fields`); `expectOk` / `expectRefused` /
  `expectNote(result, kind, { reason })` in `assertions.ts`.
- A test-login character has **no money** (`injury.wire.test.ts:191`);
  `work.dirty.wire.test.ts:132–147` funds one with a `founder` session:
  `reserve override 500 to <handle> "…"`.
- The server log is at `process.env.WIRE_SERVER_LOG` (`runner/boot.ts:125`),
  readable from a test (`harness/world.ts:72` does).
- Wardrobes: `/platform/thing/sandbox/wardrobe` is a `props:` entry of
  `packages/content/terminus/…/seznick-house/location/bedroom.yaml`
  (pack `terminus`), the dorm room, and the generic bedroom archetype.
  An unowned door "opens onto whoever walks through it"
  (`SandboxCrossing.linkForEnterer` :150–159). ⚠ `e2e/tests/sandbox.spec.ts`
  says the lounge has one; the bedroom row's comment says it was moved
  out of the lounge. The wire drive starts Ada in the seznick bedroom.
- Job boards: `packages/content/terminus/content/world/terminus/terminal/thing/job-board.yaml`;
  the syntax that works is `job post deliver torch to <place> for 25`
  (`work.dirty.wire.test.ts:185`).
- `clone` inside your own circle carries no wizard validator
  (`clone.yaml` :14, requirements § What already exists).

---

## Where the plan departs from the requirements

Three findings. Each is an engineering fact the product doc could not
have seen; each is called out here so nobody has to discover it in
review. **None changes a product goal; one changes the drive script.**

**F1 — Two of the four rehearsal acts mint a `groups` row, and `groups`
stays refused.** `chat make <name>` and `forum make <name>` (without
`--open`) both go through `SubjectCatalogue.makeSubject` → `mintBackingGroup`
→ `Group.save()` → `groups` → `SandboxWriteRefusedError`. After this
build they will refuse **in fiction, before anything is half-made**
(the group is minted before the subject row) — honest, and D6-compliant,
but the requirements' drive steps 3 and 4 as written cannot succeed.
The product goal ("open a forum thread, open a channel") is reachable
today with shipped verbs that mint no group: `forum make "Trial by
combat" --open` and `subject make rehearsal-chan --open` + `chat on
rehearsal-chan`. **The plan's drive uses those forms and asserts the
curated forms are refused in fiction** (they are two of the
step-13 sweep). ⚠ This is a change to the drive script, i.e. to the
requirements doc; it is flagged, not absorbed — the requirements owner
should ratify it (or move `groups` to `through`, which is the next
cycle).

**F2 — The forum and chat catalogues deny in memory; copy mode alone
would not make one rehearsal act work.** Every create/rename/delete on
`SubjectCatalogue` and `ChannelCatalogue` carries
`SecurityApi.assertFieldMutation` (Grounding § The refusal surface),
which throws under circle scope before the store is consulted. Moving
`forum_*` and `channels` to copy changes nothing a player can see
unless those two catalogues become **scope-partitioned** — a per-scope
in-memory index with a discard hook, exactly the shape
`BankingLogic.scopedBalanceOverlay` already has. The requirements say
*"nothing hard is required"* of the nine; that is true of the store and
false of the two catalogues in front of it. W2 carries the partition.
It is the largest piece of work in the build that the requirements did
not price.

**F3 — `holder_snapshots` is not copied at the door, for any body.**
The requirements say its copy *"is not empty but O(1)"*. Grounding says
the copy must not happen: if the wire body's `postRegister` found a
scoped row it would `materialize` it — Ada's real inventory, chattel
stamps and all, minted inside the circle — which the seeding aperture
exists to prevent (`seedCopyImpl` strips `_chattelId`) and the fork
allowlist forbids (material slices do not cross). The store for
`holder_snapshots` starts empty like the other nine; the wire body's
own first capture in `postRegister` writes the one scoped row. Every
product-visible claim in the requirements still holds (the guard is
structural; the record survives untouched; the circle forgets), and
what a player sees inside is what they see today (the default loadout).
The park capture stays exactly where it is and is not a copy. The mode
keeps the name `copy` — copy-on-write over an empty base is what the
requirements call *"a scoped read over a copy that begins empty"*.

Two smaller tensions, recorded:

- **D2 vs D3.** D2 keeps `parcel_events` / `chattel_events` refused;
  D3 says they *should* be `stamp`. They cannot be stamped while their
  registries refuse (an event row for a transfer the registry refused
  is a ledger lie), so this build keeps them refused and writes D3 into
  their rationale as the decided successor. Nothing stamps them here.
- **The `_id` guard is a pre-existing hole on `stamp`.** W0 closes it
  for both verbs in one code path (Grounding § persistSave). It is
  named as a finding rather than slipped in.

---

## Plan-level decisions

**D1 — `overlay` is its own verb; `copy` is its only mode; the switch is
exhaustive over the (verb, mode) pair.**
`CollectionPolicy` becomes
`stamp | refuse | pass{mark?} | shadow{mode:'skip'} | overlay{mode:'copy'}`.
Why a verb, not a mode of `shadow`: every consumer keyed on
`verb === 'shadow'` (the SHADOW read filter, `contentCacheEngaged`)
implements *cache-shadow* semantics — field-only reads in both contexts
— which is the **opposite** of what a copy store needs (scoped-only
reads in circle context). A mode under `shadow` would make every one of
those consumers special-case the mode, i.e. re-create the
total-over-the-verb defect on purpose. A verb gets its own row in the
sandbox table, its own derived set, its own read branch.
`through` is **not** declared in the union (MR !308's lesson:
declared-and-unbuilt is the dangerous state); the `mode` field exists
from day one so that adding it later is additive, and every switch arm
ends in a `never`-typed exhaustiveness check so a second mode fails to
**compile** at every write path until it is handled.
`SandboxOverlayUnimplementedError` is deleted — there is no unbuilt
value left for it to guard. `SchemaDoc` rejects any `overlay` mode but
`copy` with a message naming `through` as designed-not-built. YAML:
`sandbox: { verb: overlay, mode: copy }`.

**D2 — The derived sets are generated once and imported everywhere.**
`gen-schema.ts`'s `emitPolicy` emits, beside `COLLECTION_POLICIES`,
four `ReadonlySet<Collections>` constants computed from the table at
module scope (pure value construction — the shape PM uses today):
`STAMP_COLLECTIONS`, `SHADOW_COLLECTIONS`, `COPY_COLLECTIONS`, and
`SCOPED_ROW_COLLECTIONS = STAMP ∪ COPY` — *every collection whose rows
may carry a `circleScope` that exit must sweep* (`pass(mark)` rows
carry the mark and are never swept, by doctrine). PM's two private sets
and `SandboxLogic`'s `STAMP_COLLECTIONS` are deleted in favour of the
imports. One derivation, four consumers (read filter, derived index,
discard, sweep). The gate is a unit test over the whole table
(§ Test & gate strategy), not a lint: there is no census to ratchet,
and the test derives the expectation from *behaviour* — a policy that
writes a scoped row must be in the discard set — so a future mode that
stamps rows and skips discard fails it without anyone listing anything.

**D3 — Copy-mode semantics in PM.**
- `dispatchSave`: stamp `document.circleScope = scope` and pass a
  `scopeGuard` to `persistSave`, which composes `{ _id, circleScope:
  scope }` on the update filter; if `matchedCount === 0` the row is not
  the circle's and the save **throws `SandboxWriteRefusedError`** —
  never a silent no-op, never a hijack. The same guard applies to
  `stamp` (the pre-existing hole).
- `dispatchDelete`: `scopeGuard = scope` (as stamp).
- `deleteMany`: `{ ...filter, circleScope: scope }` (as stamp).
- `composeScopeReadFilter`: circle context → `{ ...query, circleScope:
  scope }` (scoped rows only, over a store that starts empty); field
  context → `circleScope: { $exists: false }`. The pass-through for a
  query already naming `circleScope`/`$or` is unchanged.
- The derived partial index loop runs over `SCOPED_ROW_COLLECTIONS`.
- `contentCacheEngaged` keys on `COLLECTION_POLICIES[Content].verb ===
  'pass'`, so a sixth verb disengages it too.

**D4 — No copy step; the store starts empty for all ten.** See F3. There
is no third phase in the crossing choreography. The requirements'
"hook the copy needs" (the park capture) stays a field-context capture
of the real row and is untouched.

**D5 — `WireBody.shouldPersist()` is retired; the reap is circle work.**
- Delete the override. The vessel's `postRegister` then runs
  `hasRecord` under the circle root (scoped read → false) →
  `installDefaultLoadout` → `capture` → **the one scoped row**, minted
  by the vessel's own first save. `startAutoSave` stays a no-op (a
  vessel needs no periodic backstop; nothing it writes survives the
  door) — the slate's Sequencing 5 owns the rest of that family.
- `assertUniqueKey` / `liveKeyed` compare `getCircleScope()` as well:
  a record's identity is `(scope, owner, circleScope)` after this
  build, so two live hosts keyed identically collide only in the same
  circle scope. This is the invariant becoming correct, not a guard
  around it.
- `exitImpl` reaps the vessel **under `{ circleScope: scope }`**, in a
  root of its own after the OMNI socket-return/merge root, and calls
  `wireBody.markForRevert()` first. Why both: `Avatar.onDestruct` fires
  `void this.save()`; under OMNI that capture lands in **field** context
  and overwrites Ada's real row with the vessel's state (the exact cheat
  the override guarded); under the circle scope it lands scoped but
  races `discardScopeImpl`'s `deleteMany`, and a late orphan row would
  be *the next visit's snapshot* because the scope string is the same on
  every visit. `markForRevert()` is the existing teardown seam (the
  death choreography's, and end-lease's) and removes the write; the
  circle-scoped root makes any other write on the way out scoped.
  Neither is a subclass override.

**D6 — The `holder_snapshots` unique index widens; nothing is renamed.**
`{scope, owner} unique` → `{scope, owner, circleScope} unique`. Mongo
indexes a missing field as `null`, so the old guarantee holds among
field rows and a scoped row is distinct. `scope` is **not** renamed —
that is a data-shape change and belongs to
[estate-nesting-slate](../slates/builds/estate-nesting-slate.md); the
schema doc's `purpose` and the index `why` carry the disambiguating
sentence instead. ⚠ Boot creates indexes and does not prune a unique
index it no longer declares (Grounding § ensureTextIndex): an existing
database keeps `scope_1_owner_1` and the first scoped row violates it.
No migrations: the dev DB is dropped (`pnpm -C packages/server
reset-db`); for the live box the builder checks whether the nightly
`wipe` drops the collection or `deleteMany`s it — if the latter, the
standup runbook in `docs/deployment.md` gets a one-time
`dropIndex('scope_1_owner_1')` line (an operator act, not code).

**D7 — One error type, one sentence, one classifier.**
- `SandboxWriteRefusedError` moves to
  `packages/server/src/mud/lib/sandbox/SandboxWriteRefusedError.ts`
  and **extends `SecurityError`** (`lib/security/errors`) with
  `policyName: 'SandboxBoundary'`. Its `message` **is** the in-fiction
  sentence (`static readonly SENTENCE` — `static readonly` fields are
  excluded from `lint:lib-statics` by its own rules); the technical fact
  rides typed fields `collection`, `scope`, `operation` and `name`.
  PM imports it and re-exports it (the existing import sites — the two
  tests — keep working). `SecurityApi.assertFieldMutation` throws it too
  (a subclass of `SecurityError`, so `singleton.escape.test.ts:60,77`
  still pass). The boundary receipt it emits is unchanged.
- The sentence (**grain** — the builder may tune the words, not the
  shape): *"Nothing in here can hold that. The wire keeps no real
  record — outside, this would have held."* It says what the circle is,
  names no collection, and tells the player where the act works.
- `CommandGiver.ts`: the three catch sites route through one
  module-private `noteThrow(ctx, controllerPath, giver, error)` (the
  file's existing module-private helper pattern). For a
  `SandboxWriteRefusedError` it fires the sentence on `shell.error` to
  the giver and notes `controller-rejected { reason: 'circle-cannot-hold',
  detail: SENTENCE }` — status `declined`, not `error`; no
  `recordControllerThrow` (a refusal is not a bug). Everything else is
  unchanged. **The Note vocabulary does not change**: this is a domain
  refusal, which is what `controller-rejected` is for, and `reason` is
  the documented open enum; a new kind would say "the client needs to
  know this is a circle" and nothing does.
- The caught cases (`Forum`/`Chat`/`SubjectController` `this.fail(ctx,
  err.message, …)`) need **no edits** — the message is the sentence. The
  developer's view is the `name` and the typed fields on the error, and
  the boundary receipt; the trade is stated in the class's docstring.
- Silent shapes: `DropController.ts:220` and `PutController.ts:292` get
  `.catch(err => DiagnosticApi.record({...}))` on the fire-and-forget
  (an author diagnostic; the drop itself succeeded, and the requirements
  permit "silently fine" for the player). `ProducerLogic`'s tap asks
  `PersistApi.circleRefusal(Collections.ProducerEvents)` before
  appending; when refused it records **one diagnostic per scope** (a
  module-private `Set<string>` of reported scopes — the
  `scopedBalanceOverlay` precedent) and skips. The console line goes.

**D8 — The money moves after the refusal, by a pre-check.** The two
sites cannot simply reorder: `TitleController` pays first *because* a
failed payment must leave no parcel row, and `stampChattel` needs a
buyer who has paid. So the refusable write is **asked about**, not
attempted: `PersistenceManager.wouldRefuse(collection): boolean`
(the same resolver + table the write paths use) and
`PersistApi.circleRefusal(collection: Collections): string | null`
(the sentence iff a write would refuse here, else `null`; `api/persist.ts`
is the sanctioned facade and already imports PM). `BuyController`
checks `Collections.Chattel` when `MixinApi.isChattel(item)` before
`settleSale` in both `buyStock` and `buyListing` and rejects with the
sentence + `controller-rejected { reason: 'circle-cannot-hold' }`;
`TitleController` checks `Collections.Parcels` before `takePayment`. In
field context `circleRefusal` returns `null` and the paths are
byte-identical to today. A non-chattel purchase (rations) inside a
circle proceeds and works.

**D9 — The catalogue partitions (F2).** `SubjectCatalogue` and
`ChannelCatalogue` each gain a per-scope partition —
`scopedByTitle: Map<scope, Map<lowerTitle, Subject>>` /
`scopedByName: Map<scope, Map<lowerName, Channel>>` — and their
create paths (`makeSubject`, `makeThreadSubject`, `createPlayerChannel`,
`createBoundChannel`, `attachChatToSubject`) drop `assertFieldMutation`
and index into the ambient scope's partition (`null`/omni → the field
maps, unchanged). **Resolution under circle scope is partition first,
then field** — the union read is required by the shipped Decision N
(comms are seamless across the boundary: a body inside a circle must
still resolve the world's `general` channel). Mutators on an existing
object (`renameSubject`, `deleteSubject`, `renamePlayerChannel`,
`disbandPlayerChannel`, `setAnonymity`) act iff the object is in the
ambient partition; on a world object they keep the deny (and the
store's `_id` guard would refuse them anyway — the two layers agree by
construction). `promoteAdHocToManaged` keeps its guard (ad-hoc channels
are runtime-global; out of scope). Listing (`visibleSubjects`,
`visibleChannels`) includes the ambient partition. Discard:
`SubjectApi.discardScope(scope)` and `ChatApi.discardScope(scope)` — Api
statics forwarding to the Logic, which drops the catalogue's partition
and, for channels, the `history` entries of the dropped ids — called
from `discardScopeImpl` beside `BankingApi.discardScopeOverlay`. Known
edge, accepted: a world forum resolved from inside a circle reads
empty (its entries are field rows; copy reads are scoped-only) — that
is the requirements' own "a scoped read over a copy that begins empty",
and `forum post` to it lands a scoped entry that dies at the door.

**D10 — Rationales.** Nine yaml rows flip to `overlay/copy` with an
`invariants` sentence each ("OVERLAY(copy) under the sandbox: a circle
that starts with none of these is a fine rehearsal, and every one made
inside is deleted at the door"); `parcel_events` / `chattel_events`
stay `refuse` with D3 recorded as the successor; `positions` and
`producer_events` get D8's sentences; `groups`, `office_holders`,
`parcels`, `chattel` add "until read-through lands"; `pack_installs`
gets its missing line. After W2 no `refuse` row is blank.

**D11 — `through`'s attach points (designed, not built).** (1) the
`mode` field on the `overlay` verb; (2) the `never`-checked switch arms
— adding `'through'` to the union fails to compile at every write path
and at `composeScopeReadFilter`; (3) the overlay read branch in
`composeScopeReadFilter` is where the `$match → $sort → $group` shape
goes; (4) the identity key per collection (requirements D4) is a schema
doc field the next build adds — **not added now** (an unread field is
what `lint:unconsumed-seams` exists to refuse); (5) tombstones (D5)
likewise; (6) the catalogues' partition-then-field read is already the
through shape, in memory. These lines go to the avatar-family slate
§ Sequencing 8 at the sweep.

---

## ⭐⭐ Host placement

No new mixin. Two new classes, both substrate; every new field is on the
host that already owns the concern.

| what | host | what composing/adding it claims |
|---|---|---|
| `SandboxWriteRefusedError` (moved, now `extends SecurityError`) | `lib/sandbox/SandboxWriteRefusedError.ts` | it is a boundary refusal, so the dispatcher classifies one type whether PM or `assertFieldMutation` threw it; nothing else changes its meaning |
| `COPY_COLLECTIONS`, `SCOPED_ROW_COLLECTIONS` (+ the two existing sets) | generated `lib/persistence/CollectionPolicy.ts` | vocabulary beside the table it derives from; PM and SandboxLogic import, never re-derive |
| `wouldRefuse(collection)` | `PersistenceManager` (instance method) | the policy question is answered by the object that enforces it |
| `circleRefusal(collection)` | `PersistApi` (static) | the facade already fronting PM; the sentence is spoken by the layer that owns the refusal |
| `scopedByTitle` / `scopedByName` + `discardScope(scope)` | `SubjectCatalogue` / `ChannelCatalogue` (the Ideas that own the flat maps) | the catalogues become scope-aware; the field maps and every field caller are untouched |
| `discardScope(scope)` | `SubjectApi` / `ChatApi` statics → `SubjectLogic` / `ChatLogic` | the discard hook pattern `BankingApi.discardScopeOverlay` already set; SandboxLogic calls three hooks, not one |
| `noteThrow(...)` | module-private in `CommandGiver.ts` | beside `proseForFrameworkNote` / `recordControllerThrow`; not exported, not a category |
| the reported-scope `Set` for the producer tap | module-private in `ProducerLogic.ts` | the `scopedBalanceOverlay` shape; runtime state, never persisted |
| `circleScope` on `holder_snapshots` rows | the row (stamped by PM) — **no field on `PersistedRecord`** | the record class does not know about circles; the store does. The unique index widens; the class does not change |

**What is deliberately NOT placed:** nothing on `Avatar`, nothing on
`Persistable`, nothing on `Shade`, no `Mixins` entry, no new Note kind,
no new collection, no schema-doc field. ⭐ The test from the rules: the
one narrowing this plan adds — `assertUniqueKey` comparing circle
scope — narrows the *invariant's key*, not a host set; if the builder
finds themself writing `if (MixinApi.isWireBody(...))` anywhere, stop:
that is the override coming back under another name.

---

## Convention conformance

Checked at plan time against the tree, not recalled.

- `props:` / `cast:` — no content rows change. The wardrobe rows already
  use `props:`.
- Locations — no location is touched.
- `<root>/<branch>/` — the moved error class lives at the kernel's
  `lib/sandbox/`, substrate only; no template path.
- Module scope declares — the derived sets are `const` pure value
  construction (the shape PM already uses); the two module-private
  `Set`s follow `BankingLogic.scopedBalanceOverlay`. `lint:module-scope`.
- Import boundary — PM (backend) imports `mud/lib/sandbox/…`, which is
  the direction it already uses for `mud/lib/persistence/…`;
  `api/persist.ts` already imports PM; controllers import only Apis and
  `Collections`. `lint:imports`.
- Verbs on objects — no `XApi.verb(host, …)` is added; the two
  discard hooks take a scope string, like the banking one.
  `lint:object-verbs` stays at zero.
- No new module category, no exported helper function, no eslint
  exemption, no new Mongo collection, no new Note kind.
- **Generated files**: `CollectionPolicy.ts` is never edited by hand —
  `gen-schema.ts`'s template text is, then `pnpm gen:schema`.
  `lint:schema` proves the round trip.
- Gates this build must pass, by name: `lint:schema`, `lint:imports`,
  `lint:pm` (`PersistenceManager.get()` appears only in the facade and
  backend), `lint:module-scope`, `lint:lib-statics` (a `static readonly`
  field is excluded; no static *method* on the error class),
  `lint:object-verbs`, `lint:gates` (the `FromModule` strings on the
  two new Logic methods), `lint:envelope` (no vocabulary change),
  `lint:unconsumed-seams` (nothing added that nothing reads),
  `lint:test-bootstrap` (every new test imports it), `lint:drive-scripts`
  (the drive is a wire file, not a script). Run as one:
  `pnpm -C packages/server lint:family`.

---

## Waves

Each wave lands on its own, ends at a named commit, and leaves the
world exactly as it found it until W2 flips the first row.

### W0 — The verb, derived once

**Goal.** `overlay/copy` exists end to end and no collection selects it.
World-inert by construction.

**Implements.** D1, D2, D3, D11.

**Files.**
- `packages/server/scripts/gen-schema.ts` — `emitPolicy`: the union
  (`shadow{mode:'skip'}`, `overlay{mode:'copy'}`), the doc comment
  (drop the !308 warning, describe the five verbs), and the four derived
  `ReadonlySet` exports.
- `packages/server/src/mud/lib/persistence/SchemaDoc.ts` —
  `SANDBOX_VERBS` gains `'overlay'`; `#parseSandbox`: `shadow` takes
  `skip` only; `overlay` takes `copy` only, any other mode fails with a
  message naming `through` as designed-not-built. Delete the !308
  overlay rejection.
- `pnpm gen:schema` → `CollectionPolicy.ts` regenerates (table unchanged
  in content; sets added).
- `packages/server/src/backend/PersistenceManager.ts` — import the
  four sets, delete :287/:298; delete `SandboxOverlayUnimplementedError`;
  `dispatchSave` / `dispatchDelete` / `deleteMany`: `shadow` arm is
  `skip` only; new `overlay` arm (`copy`); each arm block ends in the
  `never` check; `persistSave(collection, doc, scopeGuard)` composes
  `{_id, circleScope}` and throws `SandboxWriteRefusedError` on
  `matchedCount === 0` (stamp and copy); `composeScopeReadFilter`'s copy
  branch; the derived index loop over `SCOPED_ROW_COLLECTIONS`;
  `contentCacheEngaged` by verb; `wouldRefuse(collection)`.
- `packages/server/src/mud/platform/idea/api/SandboxLogic.ts` — delete
  :93; `discardScopeImpl` and `sweepOrphansImpl` iterate
  `SCOPED_ROW_COLLECTIONS`; fix the docstring so it is true.
- Tests: `backend/__tests__/PersistenceManager.sandbox-policy.test.ts`
  — replace the "SHADOW(overlay) — declared, unbuilt" block with a
  `OVERLAY(copy)` block pinning: save stamps + inserts; update of a
  foreign `_id` throws; delete guards; deleteMany composes; circle read
  is `{…, circleScope: SCOPE}`; field read is `$exists:false`; plus the
  **totality test** (D2). `lib/persistence/__tests__/SchemaDoc.test.ts:90`
  inverts (copy parses; `through` fails naming itself).
  `scripts/__tests__/gen-schema.test.ts:69` renders five shapes.
  `api/__tests__/sandbox.test.ts:126` discard covers a copy collection
  (flip a victim's policy in the test as the !308 block did).
  `lib/sandbox/__tests__/escape/durable-write.escape.test.ts` gains the
  overlay probe.

**Acceptance.** `pnpm test:near` green; `lint:family` green; no schema
yaml changed; `grep -rn "SandboxOverlayUnimplementedError"` finds
nothing.

**Commit.** `build(sandbox-overlay W0): the overlay/copy verb, derived once`

### W1 — The refusal, spoken once and before the money

**Goal.** Every surviving refusal is one in-fiction sentence; nothing is
charged before it.

**Implements.** D7, D8.

**Files.**
- New `packages/server/src/mud/lib/sandbox/SandboxWriteRefusedError.ts`
  (extends `SecurityError`; `SENTENCE`; typed fields). Delete the class
  from PM; PM imports + re-exports it. `lib/security/errors.ts` has no
  imports (verified), so PM's import graph does not grow.
- `packages/server/src/mud/api/security.ts:1181` — `assertFieldMutation`
  throws the new class (receipt unchanged).
- `packages/server/src/mud/lib/command/CommandGiver.ts` — `noteThrow`;
  the three sites call it.
- `packages/server/src/mud/api/persist.ts` — `circleRefusal`.
- `BuyController.ts` (both pay paths), `TitleController.ts` (before
  `takePayment`) — the pre-check.
- `DropController.ts:220`, `PutController.ts:292` — `.catch` →
  `DiagnosticApi.record`.
- `ProducerLogic.ts:353` — pre-check + one diagnostic per scope.
- Tests: a dispatcher test (beside the existing `CommandGiver` /
  envelope tests) that a controller throwing `SandboxWriteRefusedError`
  yields `controller-rejected { reason: 'circle-cannot-hold' }`, status
  `declined`, the sentence on `shell.error`, and **no**
  `controller-error`; `BuyController` test with `setScopeResolver(() =>
  SCOPE)` asserting no `settleSale` call and the sentence; the same for
  `TitleController` before `takePayment`; `singleton.escape.test.ts`
  still passes unchanged.

**Acceptance.** `grep -rn "PersistenceManager:" packages/server/src/mud`
finds no player-facing string; `test:near` + `lint:family` green.

**Commit.** `build(sandbox-overlay W1): the refusal spoken once, and never after the money`

### W2 — Nine collections land in the circle; the catalogues partition

**Goal.** A party, an open forum thread with a reply and a vote, an
open channel and a posted job all work inside a circle, none exists
outside it, and all of it is gone at the door.

**Implements.** D9, D10; the first consumers of W0.

**Files.**
- `packages/server/src/schema/{contracts,contract_events,parties,channels,forum_boards,forum_subjects,forum_entries,forum_votes,forum_events}.yaml`
  → `sandbox: { verb: overlay, mode: copy }` + the invariant sentence;
  the eight staying-refused rows get their rationales (D10);
  `pnpm gen:schema`.
- `packages/server/src/mud/platform/idea/SubjectCatalogue.ts`,
  `ChannelCatalogue.ts` — the partitions (D9); `SubjectLogic.ts` /
  `ChatLogic.ts` — `discardScope`; `api/subject.ts` / `api/chat.ts` —
  the forwarding statics; `SandboxLogic.discardScopeImpl` calls both.
- `PartyLogic.formImpl` :366 — the `catch {}` around the bound channel
  stays (a name clash is still optional) but the deny it used to swallow
  no longer exists; verify by test that a durable party formed in-circle
  gets its channel.
- Tests: catalogue partition tests under a planted circle root
  (`ExecutionContextApi.runRootGuarded(…, { circleScope })` as the escape
  battery does): create in-circle → resolves in-circle, not in field;
  a world channel still resolves from in-circle (Decision N); rename of
  a world subject from in-circle refuses; `discardScope` empties the
  partition. Store tests: `PartyRecord`/`Subject`/`Channel`/`ContractRecord`
  saved under scope carry `circleScope`; a field `find` does not return
  them; discard removes them.

**Acceptance.** The in-process tests above; `lint:schema` green after
regeneration; `test:near` + `lint:family` green.

**Commit.** `build(sandbox-overlay W2): nine collections land in the circle; the catalogues partition`

### W3 — The snapshot behind the store

**Goal.** `holder_snapshots` is `overlay/copy`; `WireBody.shouldPersist()`
is gone; Ada's real row cannot be reached by the vessel.

**Implements.** D4, D5, D6.

**Files.**
- `packages/server/src/schema/holder_snapshots.yaml` — `sandbox:
  { verb: overlay, mode: copy }`; the unique index widens to
  `{ scope: 1, owner: 1, circleScope: 1 }` with a `why` that names the
  two meanings of "scope"; the PASS invariant sentence is replaced by
  the copy one; `purpose` gets the disambiguation. `pnpm gen:schema`.
- `packages/server/src/mud/platform/agent/sandbox/WireBody.ts` —
  delete `shouldPersist()` (:120–123) and the comment at :107–109 that
  says the spine is gated off by it. `startAutoSave` stays.
- `PersistableLogic.ts` `assertUniqueKey` / `liveKeyed` — compare
  `getCircleScope()`.
- `SandboxLogic.exitImpl` — `markForRevert()` + a circle-scoped reap
  root after the OMNI root (D5).
- `pnpm -C packages/server reset-db` on the dev database before booting
  (D6); check the `wipe` implementation for the live box and, if needed,
  the runbook line in `docs/deployment.md`.
- Tests: `api/__tests__/sandbox.crossing.test.ts` gains: after
  `enter`, exactly one `holder_snapshots` row carries `circleScope`, and
  the field row's `state`/`writtenAt` are byte-identical to the park
  capture's; `wireBody.save()` inside writes only the scoped row; after
  `exit` no scoped row remains and the field row is still identical;
  a second `enter` finds no snapshot (fresh). A `PersistableLogic` test
  that two live hosts keyed identically in different circle scopes do
  not collide and in the same scope still throw.

**Acceptance.** The tests above; `test:near` + `lint:family` green;
`grep -n shouldPersist packages/server/src/mud/platform/agent/sandbox/WireBody.ts`
is empty.

**Commit.** `build(sandbox-overlay W3): the snapshot behind the store — WireBody.shouldPersist retired`

### W4 — Docs and the drive

**Goal.** The subsystem docs tell the truth; the drive runs and is
recorded.

**Files.**
- `docs/subsystems/sandbox.md` — the policy table gains the OVERLAY
  row (ten collections), the `mode: overlay` blockquote becomes history,
  the discard/indexes bullets say `SCOPED_ROW_COLLECTIONS`, the
  needs-a-guard table marks the two catalogues as partitioned, the
  refusal sentence is documented as the one voice.
- `docs/subsystems/persistence.md` — `holder_snapshots` under the
  sandbox; the widened index; "no copy at the door" stated once.
- `docs/subsystems/response-envelope.md` — one line: `circle-cannot-hold`
  as a `controller-rejected` reason the dispatcher itself emits.
- `docs/subsystems/chat.md` / `forums.md` — the partition, one
  paragraph each.
- The drive: `packages/wire/tests/sandbox-overlay.dirty.wire.test.ts`
  (§ Drive record for the script and why dirty).

**Commit.** `drive(sandbox-overlay): <what driving found>` (and a
`docs(sandbox): …` commit if the doc sweep stands alone).

---

## Reachability wiring

No new verb, so the five links mostly read "not applicable" — the ones
that can fail closed here are the data and boot links.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| copy-mode writes/reads | none new | n/a | the yaml `sandbox:` row → `gen:schema` → `COLLECTION_POLICIES` (a stale generated file is caught by `lint:schema`) | the derived partial index on `SCOPED_ROW_COLLECTIONS` at `createIndexes`; the scope resolver (already installed) | n/a |
| the in-fiction refusal | none new | n/a | none | none | n/a — but ⚠ the classifier must be reached from **all three** catch sites; a fourth site added later would leak `controller-error` again (the dispatcher test pins the three) |
| pay-first | `buy`, `title buy` (existing) | unchanged | none | none | unchanged |
| circle forums / chat / party / job | `forum … --open`, `subject make --open` + `chat on`, `party form --durable`, `job post` (existing) | unchanged; a job needs a board cloned into the circle | the partitions (in memory) + the copy rows | the catalogues warm from **field** reads at boot — verify `warmCache` runs with no scope (it does: boot has no root) | unchanged |
| discard totality | `out` (existing) | — | `SCOPED_ROW_COLLECTIONS` + the three discard hooks | the orphan sweeper (already scheduled) | — |

---

## Acceptance-criteria coverage

| requirements criterion | wave | how it is proved |
|---|---|---|
| A player can hold a rehearsal (party, forum thread + reply + vote, channel, job) | W2 (+W0) | drive steps 2–5; catalogue + store tests. ⚠ With F1: the forum is `--open`, the channel is `subject make --open` + `chat on` |
| Bo never sees any of it | W2 | drive step 6 from a second `Session`; field `find` tests |
| The circle forgets | W2, W3 | drive step 11; discard tests; the `(scope, key, circleScope)` invariant test |
| Ada's real record survives untouched | W3 | drive step 12 (`me:i` + `bank` before/after); the crossing test's byte-identical row |
| No player reads `PersistenceManager`, a controller path, or "Something went wrong" inside a circle | W1 | drive steps 7, 8, 13 assert on `said()`; the dispatcher test |
| No refusal leaves a player poorer | W1 | drive step 7 (`bank` before/after a refused chattel buy); the controller tests |
| No refusal is silent | W1 | drive step 8 + the server-log scan; the producer tap test |
| Every collection that still refuses says why | W2 | `grep -L` over the 17 refuse rows for a sentence beyond "REFUSE under the sandbox." — assert in `lint:schema`? No: a one-off check in the drive record; the rationale is prose |

Unmapped: none. **Changed:** the drive's steps 3 and 4 (F1).

---

## Test & gate strategy

- **Unit (test:near):** PM policy seam (W0), the totality test (W0),
  SchemaDoc/gen-schema (W0), the dispatcher classification (W1), the
  two controllers' pre-checks (W1), the catalogue partitions (W2), the
  store round-trips for the nine (W2), the crossing's snapshot rows and
  the widened uniqueness invariant (W3).
- **Only the drive can prove:** that the catalogue partition and the
  store agree from a real socket; that Bo's seat sees nothing; that the
  server log carries no unhandled rejection; that the caught-and-printed
  controllers print the sentence with no edits.
- **Gates:** `pnpm -C packages/server lint:family` after every wave.
  `pnpm test` exactly twice — before the MR and at `/finalize`.
  ⚠ The `test:near` run for W0 must include
  `packages/server/src/backend/__tests__/` and
  `lib/sandbox/__tests__/escape/` — the changed files are not beside
  every test that pins them.
- **What the gate does NOT catch, stated:** a fourth `controller-error`
  emission site (pinned by test, not lint); a catalogue that later grows
  a flat map without a partition (the doc's needs-a-guard table is the
  review surface).

---

## Risks & opens

1. **F1 needs ratifying.** The drive as planned diverges from the
   requirements' steps 3–4. If the requirements owner instead wants
   `chat make` to work, that is `groups` → `through` and a different
   cycle. **Stop and ask if unclear; do not build a third option.**
2. **`assertUniqueKey` is the crossing's tripwire.** If W3's scope-aware
   comparison is skipped, every `go wardrobe` throws inside
   `postRegister`. The crossing test will catch it; the builder should
   expect it.
3. **The `_id` guard may surface a hidden writer.** Any code that
   re-saves a *world* row from circle context on a stamp/copy collection
   now refuses instead of silently re-stamping. Grep for `.save()` on
   the nine Document classes reached from circle paths (the forum
   `addManifestation` on a world subject is the known one) and confirm
   each is either a circle object or an honest refusal.
4. **The old unique index on a live database** (D6). No migration; the
   dev DB is dropped; the live box is an operator line if `wipe` does
   not drop the collection.
5. **`Decision N` regression risk in D9.** If the union read is
   forgotten, a body inside a circle loses world chat. The partition
   test pins it.
6. **Diagnostics volume** from the producer tap — bounded to one per
   scope by design; if `DiagnosticApi.record` already dedups, the Set
   is redundant and may go.
7. ~~`SecurityError`'s import graph into PM~~ — verified at plan time:
   `lib/security/errors.ts` has **no imports**, so PM importing the
   subclass adds nothing to its graph. Closed.
8. **The e2e sandbox spec** (`e2e/tests/sandbox.spec.ts`) references a
   lounge wardrobe that content moved; not this build's, not a priority
   (memory), but the drive must not start there.

---

## Deferred seams

Clean attach points, each with the slate it leaves as:

- **`through` mode** — D11's six points → avatar-family-slate
  § Sequencing 8 (already the home); at the sweep add the `never`-check
  note and the "identity key is a schema-doc field, add it when it is
  read" line.
- **`parcel_events` / `chattel_events` → `stamp`** once their
  registries overlay (requirements D3) → the same slate, one line.
- **The capture allowlist replacing `shouldPersist()`** (guest gate,
  revert flag, shade) → avatar-family-slate § Sequencing 5 — this build
  leaves `Shade` and `Avatar` overrides untouched and `startAutoSave`
  a no-op on the vessel, and says so there.
- **`promoteAdHocToManaged` in a circle** → sandbox-slate (tails), one
  line: ad-hoc channels are runtime-global and were not partitioned.
- **The `groups` row a curated subject mints** → money-integrity /
  avatar-family (whichever owns `through`): the first collection that
  needs read-through has a player-visible consumer now (F1).
- **`scope` on `holder_snapshots` meaning the host** → estate-nesting-
  slate already owns the record's shape; add the name-collision line.

---

## Critical files

Read in this order.

1. `docs/requirements/sandbox-overlay-requirements.md` — and § Where the
   plan departs, above.
2. `docs/subsystems/sandbox.md` § The write-path policy table, § Read
   filters, discard, indexes, § Exempt-singleton classification (the
   needs-a-guard table).
3. `packages/server/src/backend/PersistenceManager.ts` :196–310,
   :700–770, :930–1135, :1310–1380, :1560–1615.
4. `packages/server/scripts/gen-schema.ts` :195–285;
   `packages/server/src/mud/lib/persistence/SchemaDoc.ts` :70–80,
   :250–305.
5. `packages/server/src/mud/platform/idea/api/SandboxLogic.ts` :85–165,
   :280–520.
6. `packages/server/src/mud/platform/idea/api/PersistableLogic.ts`
   :136–170, :890–960; `packages/server/src/mud/platform/agent/Avatar.ts`
   :685–860, :1440–1520; `…/agent/sandbox/WireBody.ts`.
7. `packages/server/src/mud/platform/idea/SubjectCatalogue.ts`,
   `ChannelCatalogue.ts`; `packages/server/src/mud/platform/idea/api/BankingLogic.ts`
   :100–135, :2495–2500 (the overlay precedent).
8. `packages/server/src/mud/lib/command/CommandGiver.ts` :120–200,
   :870–900, :1225–1270; `packages/server/src/mud/api/security.ts`
   :1175–1200.
9. `packages/server/src/mud/platform/idea/cmd/retail/BuyController.ts`,
   `…/cmd/civics/TitleController.ts` :290–400, :512–560.
10. `packages/server/src/backend/__tests__/PersistenceManager.sandbox-policy.test.ts`,
    `packages/server/src/mud/lib/sandbox/__tests__/escape/*.test.ts`,
    `packages/server/src/mud/api/__tests__/sandbox.crossing.test.ts`.
11. `packages/wire/src/harness/session.ts`,
    `packages/wire/tests/work.dirty.wire.test.ts` (funding + `job post`),
    `packages/wire/tests/identity.dirty.wire.test.ts` (multi-session).

---

## Drive record

*(appended at build time)*

**The script, as the wire file will run it** —
`packages/wire/tests/sandbox-overlay.dirty.wire.test.ts`, `packs:
['terminus', 'world-seed']`. Dirty because funding Ada is a recorded
reserve override that accumulates on the world's ledger every run, and
each run mints new test characters (`DIRTY_REASON` says so).

Two players, as the requirements ask: `ada = Session.open(uniqueHandle('ada'),
{ startLocation: '/world/terminus/mayfield-row/seznick-house/location/bedroom' })`
and `bo = Session.open(uniqueHandle('bo'), { startLocation: <any world
location, e.g. the terminal hall> })`; a third, `founder`, only to fund
Ada (`reserve override 500 to ${ada.handle} "wire: overlay drive"`),
closed immediately. The harness supports any number of sessions per
file; there is no single-session equivalent needed.

Before step 1, record Ada's baseline: `inventoryBefore = await
ada.query('me:i', { fields: ['displayName'] })`, `balanceBefore` from
`bank`, and `logOffset = statSync(process.env.WIRE_SERVER_LOG).size`.

1. `ada: go wardrobe` → `expectOk`; `look` says circle floor / the way
   out is out.
2. `ada: party form rehearsal --durable` → `expectOk`.
3. `ada: forum make "Trial by combat" --open` → ok; `forum post …`,
   `forum reply …`, `forum vote 1 up` → each ok. **(F1)**
4. `ada: subject make rehearsal-chan --open`; `chat on rehearsal-chan`;
   `chat rehearsal-chan hello` → ok. **(F1)**
5. `ada: clone /world/terminus/terminal/thing/job-board --here`; `job post
   deliver torch to <a place> for 25` → ok.
6. `bo: forum list` / `party list` / `chat list` → none of Ada's names
   appear (`said()` does not match).
7. `ada: clone /world/terminus/general-store/counter --here`; `buy torch`
   → `expectRefused`, `expectNote(controller-rejected, { reason:
   'circle-cannot-hold' })`, `said()` has no `PersistenceManager` /
   `Something went wrong` / `/platform/`; `bank` unchanged from the
   in-circle baseline; `me:i` has no torch. (If the cloned counter has
   no stock, the builder records why and uses the seeding aperture —
   `clone <the live counter> --instance` — instead.)
8. `ada: drop <anything carried>` → ok or refused-in-fiction; the log
   from `logOffset` has no `UnhandledPromiseRejection` and no
   `SandboxWriteRefusedError`.
9. `ada: out` → ok; `look` is the bedroom.
10. `ada: party list` / `forum list` / `chat list` → the rehearsal names
    are gone; a world name still present.
11. `ada: go wardrobe` → `look`: no party/forum/channel/clutter from
    step 2–7 (`party show` says none; `forum list` empty of hers).
12. `ada: out`; `me:i` deep-equals `inventoryBefore`; `bank` equals
    `balanceBefore`.
13. The sweep: `chat make refused-chan` (→ `groups`), `forum make
    "Curated" ` (→ `groups`), `title buy …` where a `PlatBook` is
    clonable (→ `parcels`), `consign`/`name` on a carried good (→
    `chattel`), `soul mint …` (`SoulCatalogue` guard) — each
    `expectRefused` + the reason + the `said()` negatives above.

The record — output, count, every failure — goes here when it is run.
