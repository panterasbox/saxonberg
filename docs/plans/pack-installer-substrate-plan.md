# Pack installer substrate — implementation plan

**Feature branch:** `pack-installer` (waves 0+1 of the content-pack program).
**Requirements:** `docs/requirements/pack-installer-substrate-requirements.md` (closed scope).
**Subsystem baseline:** `docs/subsystems/content-packs.md` (the shipped installer), plus `governance.md`, `grouping.md`, `diagnostics.md`, `persistence.md`.
**Slate anchors:** content-packs-slate A10 (installer model), A17 (record + collisions), A24 (wave ordering), A25 (offices-are-heads); content-pack-units Part C (strategy interface).

This plan is self-contained: a fresh build agent who has read the requirements doc and the four subsystem docs can execute it top to bottom. Every step is independently verifiable and ordered so the tree is green after each.

Conventions that bind every step (from CLAUDE.md):

- All new installer logic lives in module-private functions in `packages/server/src/mud/obj/api/PackLogic.ts`; public `PackLogic` methods carry `@CallSecurity(SecurityPolicies.FromModule('/api/pack#PackApi'))`; `PackApi` (`mud/api/pack.ts`) stays a thin decorated forwarding shell exporting only the class + call-shape types. No new Api, no free-floating helpers, no new module categories.
- All DB writes ride `PersistApi` (`lint:pm`). No new write path skips the chokepoint.
- Every new test touching the wired runtime imports `test-bootstrap` (first import). `pnpm test:near` mid-build; **one** full `pnpm test` before the MR.
- Commit shape: `feat(pack): …` / `refactor(pack): …` / `feat(governance): …` per step; wave 0 is its own leading commit series (per A24, it may even land as its own standalone MR first — the user's call; the plan works either way, and either way no wave-1 code ever speaks the old collection name).

---

## Wave 0 — the `domain` → `content` collection rename

### W0.1 — enum + literals + policies (mechanical)

One commit, `refactor(persistence): rename domain collection to content`.

1. `packages/server/src/mud/lib/persistence/Collections.ts` — `Domain = 'domain'` becomes `Content = 'content'` (member name AND value). Keep a doc comment: "the templates collection; named `domain` before 2026-08 — the `/domain/` *template-path namespace* and the `domain` *command category* are unrelated and unchanged (path renames are wave 4)."
2. Rename every `Collections.Domain` reference → `Collections.Content`. `grep -rn "Collections.Domain"` currently hits ~40 files (8 non-test): `backend/SeederManager.ts`, `backend/BlueprintSeeder.ts`, `backend/AppBootstrap.ts`, `backend/PersistenceManager.ts` (the `COLLECTION_POLICIES` row `[Collections.Content]: { verb: 'pass' }`), `mud/obj/TopicCatalogue.ts`, `mud/obj/hooks/DomainHook.ts`, `mud/obj/api/PackLogic.ts`, `mud/lib/persistence/ResetPolicy.ts`, plus tests.
3. String literals:
   - `mud/lib/stuff/Template.ts:43` — `static collectionName = 'domain'` → `Collections.Content` (import the enum; it's mudlib vocabulary, legal).
   - `mud/obj/hooks/hooks.yaml` — two `collection: domain` entries → `collection: content` (the `DomainHook` **class/template name stays** — it enforces the folder/leaf invariant on the templates collection; renaming the class is not a collection literal and is out of scope).
   - Test stubs: `mud/obj/api/__tests__/PackLogic.test.ts` (`r.__col ?? 'domain'` and any `__col: 'domain'` fixtures) and any other test speaking the literal.
4. **Grep gate (the bar from the requirements):** `grep -rn "'domain'" packages/server/src --include="*.ts"` must return only (a) the migration in W0.2, and (b) non-collection uses — `CommandLogic.ts`'s `DOMAIN_DIR` (the `mud/domain/` source tree) and `CommandDefinition.ts`'s `'domain'` command category. Record the residue list in the commit message.
5. CLAUDE.md's "MongoDB Collections" line for `domain` is an **index-file edit — leave it to the pre-merge sweep** (worktree rule 5), as the requirements allow.

### W0.2 — the idempotent boot-time migration

**Where it lives:** a private method on `backend/PersistenceManager` — `#migrateDomainToContent()` — called from `connect()` **after `this.db` is assigned and strictly before `createIndexes()`**. One-line why: PM owns the connection lifecycle and `connect()` is the only place that is guaranteed to run before *any* collection access — critically including `createIndexes()`, whose `createIndex` on `content` would otherwise auto-create an empty `content` collection and make `renameCollection` fail forever after. The import boundary makes any mudlib home illegal (mudlib may not touch the driver), and a separate `MigrationManager` would be a second lifecycle owner for one call.

Logic (driver-level, `this.db.listCollections().toArray()`):

- `content` exists → **no-op**. If `domain` *also* exists and is non-empty, log one loud `console.warn` naming both (operator condition; never auto-drop, never rename over a live `content`).
- `content` absent, `domain` exists → `await this.db.collection('domain').rename('content')`, one loud `console.info` ("PersistenceManager: renamed collection 'domain' → 'content' (one-time migration)"). Mongo's rename carries the `path` unique index across, so no index rebuild is needed.
- neither exists (fresh DB) → no-op.

To make it testable without Mongo, implement the decision core as a static taking a minimal shim — `PersistenceManager.planDomainRename(names: string[]): 'rename' | 'noop' | 'warn-both'` — with `#migrateDomainToContent` doing the I/O around it (backend classes are not bound by the mud module taxonomy; a private static is fine).

**Tests (W0):**
- `backend/__tests__/PersistenceManager.migration.test.ts` — `planDomainRename` over the four collection-name states; plus an I/O-level test with a faked `db` object (listCollections/collection().rename spies) asserting: rename called exactly once for pre-rename state; never called when `content` exists; two consecutive invocations → second is a no-op (**the two-boot idempotence half for wave 0**).
- Full existing suite green (the ~40-file mechanical rename is the real test).

---

## Wave 1 — the substrate, proven on newbie-wilds

### W1.1 — register `pack_installs`

`feat(pack): pack_installs collection + policy + index`

- `Collections.ts`: `PackInstalls = 'pack_installs'` with a doc comment (installer's per-deployment ledger; written only by `PackLogic`; deliberately its own collection so no contribution kind can ever reach it — the `parcels`-not-in-`content` reasoning, slate A17.1).
- `PersistenceManager.COLLECTION_POLICIES`: `[Collections.PackInstalls]: { verb: 'refuse' }` — installer state is field-real system state; a circle must never write it. (Totality is compile-enforced; the build fails until the row exists.)
- `PersistenceManager.createIndexes()`: unique index `{ packId: 1 }` on `pack_installs`.

**Test:** compile is the totality test; add one line to the migration test file asserting the policy verb is `refuse` (locks the decision against drift).

### W1.2 — kind-strategy extraction (pure refactor)

`refactor(pack): extract the per-kind reconcile strategy`

`reconcileDomain` / `reconcileNameBanks` / `reconcileDescriptorBanks` in `PackLogic.ts` are the same ownership-scoped insert/update/adopt/delete loop three times. Before adding three-way logic (which would otherwise be written three times), extract a module-private strategy — this *is* the content-pack-units Part C interface, kept module-private:

```ts
interface KindStrategy<F> {
  kind: 'domain' | 'name-banks' | 'descriptor-banks';
  collection: Collections;               // TARGET
  recordKeyOf(f: F): string;             // KEY: '/domain/…' | '/name-banks/<key>'
  dbKeyQuery(f: F): Record<string, unknown>;  // {path} | {key}
  rowOf(f: F, packId: string): Record<string, unknown>;
  canonicalBody(rowOrFile): unknown;     // the hash preimage (below)
  flatKeyOf?(f: F): string;              // KEY+COLLISION CLASS — set for both bank kinds
  onChanged?(opts): void;               // GO-LIVE: NameBank.clearCache / DescriptorBank+Appearance
}
```

One module-private `reconcileKind(packId, strategy, files, record, opts)` replaces the three bodies. The descriptor-bank cache-prime and the rehydrate tail stay where they are in `reconcilePack`.

**Record-row key convention (planner's choice):** the record's `rows` map is keyed by the file's content-root-relative path with a leading slash and no `.yaml` (`/domain/newbie-wilds/crossroads/hub`, `/name-banks/common`) — for the domain kind this *is* the template path, and it gives `pack diff <id> <path>` one uniform address for every kind.

Note on scope: the requirements' parenthetical names domain + name-banks, but the governing clause is "three-way for **every shipped kind**"; descriptor-banks is a shipped stamped kind and rides the identical strategy for free, so it is included rather than left as the one two-way straggler.

**Test:** the existing `PackLogic.test.ts` / `PackLogic.topics.test.ts` stay green unchanged — that is the whole verification of this step.

### W1.3 — the install record + rendered-artifact hashing + adoption baseline + per-pack failure isolation

`feat(pack): the pack_installs record and baselines`

**Types** (exported from `mud/api/pack.ts` — call-shape types ride the Api face):

```ts
export interface PackRowBaseline { kind: string; hash: string; body: string; }
export interface PackConflict {
  path: string; kind: string; detectedAt: string;
  baselineHash: string; dbHash: string; packHash: string;
  reason: 'both-changed' | 'deleted-vs-edited';
}
export interface PackInstallRecord {
  packId: string; version: string; appliedAt: string; principal: string;
  status: 'applied' | 'staged' | 'failed';       // 'staged' unwritten this cycle
  failure: { step: string; error: string; file?: string } | null;
  parameters: Record<string, unknown>;            // written {} this cycle
  rows: Record<string, PackRowBaseline>;
  pins: string[];
  conflicts: PackConflict[];
  sideEffects: { kinds: string[] };               // ['quantity'] when that kind ran
}
```

This is A17.1's schema verbatim plus two additive fields, both flagged as planner's choices:

- **`rows[path].body`** — the canonical serialization (the hash's preimage) stored beside the hash. Why: the requirements mandate `pack diff` render **three bodies**, and in the one cell where diff matters most (both-changed) the baseline content is recoverable from nowhere else — not the file (changed), not the DB (changed), not git (a deployment DB is not pinned to a workspace ref). Storing the preimage is the minimal completion of the hash decision; size is bounded by the `content` collection itself (it's the same data, canonically serialized — hundreds of KB worst case, far under the 16 MB doc cap).
- **`conflicts`** — the requirements demand `pack status` list open conflicts without blocking; the record is the "ledger of application" (A10.11), and every reconcile recomputes/clears the list, so it cannot rot into a stored to-do.

**Canonical hashing (planner's choice):** `sha256:` + hex of SHA-256 over the existing `canonical()` function's output (sorted-key, cycle-safe JSON — already in `PackLogic.ts`) applied to the *rendered row content only*:

- domain kind: `canonical({ class, hydratorClass, data })` — never `_id`, `path`, `sourcePack`, timestamps.
- name-banks: `canonical({ given, surname, style })`.
- descriptor-banks: `canonical({ primary, secondary, primaryAxis, secondaryAxis, unidentifiedLong, unidentifiedDetails })`.

`JSON.stringify` drops `undefined` members, so absent-vs-undefined optional fields normalize identically on both the file side and the BSON-round-trip side; there is no timestamp or random input anywhere in the preimage (the "no `Date.now()` drift" constraint). `node:crypto.createHash` imported directly in `PackLogic.ts` — legal, `obj/api/**` is the importing tier.

**Behavior added to `reconcilePack`:**

1. Load the pack's record (`PersistApi.find(Collections.PackInstalls, { packId })`).
2. **No record (the adoption bridge):** run the reconcile exactly as today (two-way replace — "what it just wrote" wins), then write a fresh record whose `rows` baselines are hashes/bodies of each row **as written**, `status: 'applied'`. Emit the one unmissable line: `console.warn("PackApi: pack '<id>' — ONE-TIME adoption baseline normalized over <N> rows (pre-record DB); pre-existing divergence was overwritten; future reconciles are three-way")`. (warn, not info — unmissable is the requirement.)
3. **Record exists:** three-way per W1.4 (this step lands the record write; the state machine is next — the two land as consecutive commits, tests split accordingly).
4. `principal`: `ExecutionContextApi.getActingAuthor() ?? 'bootstrap'` — derived from context, never a parameter (the gated-api-actor rule); boot has no frame → `'bootstrap'`.
5. `sideEffects.kinds` gets `'quantity'` when the quantity file ran (RAM-only kind, exempt from `rows` — the record only notes it ran).
6. **Per-pack failure isolation in `PackLogic.install()`:** wrap each pack's `reconcilePack` in try/catch; on throw, upsert the pack's record with `status: 'failed'`, `failure: { step, error, file? }`, log loudly (`console.error`), and **continue with the remaining packs** — a failed pack boots *without* the pack, it never bricks the boot (A17.1/A10.10). `sync` (one pack, an operator at the keyboard) keeps throwing. `AppBootstrap`'s per-pack log line gains pins/conflicts counts in W1.4.

**Tests** (`mud/obj/api/__tests__/PackLogic.record.test.ts`, the existing stubbed-PersistApi harness extended with a `pack_installs` collection in the in-memory store):
- Fresh store: install writes one record per pack — packId/version from the manifest, `principal: 'bootstrap'`, `status: 'applied'`, `rows` covering every domain + bank file with correct `kind`, `sha256:` hash, and body; quantity noted in `sideEffects` and absent from `rows`.
- Pre-seeded unstamped store (adoption): rows adopted in place (`_id`s preserved — no wipe), baselines equal the file content as written, the one-time `console.warn` fired exactly once (spy).
- Second run: record's `rows` deep-equal (hash stability across invocations), no second normalization line, store hash-identical — **the two-boot idempotence test at the installer level**.
- One pack throwing requires-kernel: its record is `status: 'failed'` with `failure.step === 'requires-kernel'`, zero writes for that pack, sibling packs applied.
- Hash canonicalization: same data with reordered YAML keys hashes identically; changed data changes the hash.

### W1.4 — three-way reconcile + conflicts + pins

`feat(pack): three-way reconcile with conflict surfacing and pins`

Inside `reconcileKind`, for a file whose path has a stamped row and a baseline entry, compute `fileHash`, `dbHash`, `baselineHash` and dispatch the A10.4 machine:

| file vs baseline | DB vs baseline | action |
|---|---|---|
| same | same | nothing |
| changed | same | update row (+ baseline := file), **silently** (reported in `updated`) |
| same | changed | keep the DB — report in new result field `kept` |
| changed | changed, and file == DB | **converged** — baseline := shared hash, conflict (if any) cleared, no write (this is what closes an `--export` round-trip) |
| changed | changed, file ≠ DB | **conflict** — leave the row untouched, upsert a `PackConflict` in the record, land a diagnostic, continue. Never merge, never block. |

Extensions the requirements imply:

- **Vanished file** (stamped row, no file): DB == baseline → delete row + drop baseline (today's behavior, now guarded); DB ≠ baseline → `deleted-vs-edited` conflict (an operator-edited row is never silently deleted).
- **Pinned rows** (`record.pins`) are skipped before any comparison and counted; every reconcile result and every boot/status line reports `N rows pinned, skipped` — pins are loud, every time.
- **Missing baseline for a stamped row** (kind added later, partial older record): treat as adoption for that row — baseline := as-written, counted into a per-pack normalization line.
- Conflicts detected on a previous run that no longer hold (file reverted, row fixed) are **cleared** from `record.conflicts` on every reconcile — the list is recomputed, not accumulated.

**Diagnostic:** one `DiagnosticApi.record({ path: <template path or null>, severity: 'warning', channel: 'pack.<packId>', message: "pack '<id>': conflict at <recordKey> — pack and database both changed since install; run `pack diff <id> <path>` / `pack resolve …`" })` per newly-detected conflict (not re-fired for a persisting one — dedupe against the prior record's conflict set). Explicit channel override, the `sandbox.boundary` precedent. No new notification machinery.

**Result shape:** extend `PackReconcileResult` with `kept: string[]`, `conflicts: string[]`, `pinnedSkipped: number`. Update `AppBootstrap.run`'s per-pack log line and `PackController.format` to include them (conflicts and pins always printed, even when zero conflicts — pins specifically must be reported every time).

**Tests** (`PackLogic.threeway.test.ts`): the full 4-cell matrix **for the domain kind and the name-banks kind separately** (the acceptance criterion demands per-kind cell coverage; descriptor-banks gets one smoke row through the shared strategy), plus: converged both-changed clears the conflict and updates the baseline; conflict leaves the DB row byte-identical, upserts `record.conflicts`, and fires the `DiagnosticApi.record` spy exactly once (and not again on the next run); pinned row skipped with `pinnedSkipped` reported and no diagnostic; vanish×(clean/diverged) both branches.

### W1.5 — the flat-key uniqueness check

`feat(pack): install-set flat-key collision check`

Module-private `assertFlatKeysUnique(packs: {packId, content}[])` in `PackLogic.ts`, run in `install()` **after discovery + content read, before any pack's writes** (and in `sync()` against the synced pack's own set plus the other discovered packs' files):

- The mechanism iterates every `KindStrategy` with a `flatKeyOf` extractor (today: name-banks and descriptor-banks; later kinds — emote verbs, recipe ids — plug in by setting the slot).
- Builds `key → {packId, relFile}` per kind namespace; a second claimant (cross-pack, or a duplicate within one pack) marks the **claiming pack** failed with an error naming the kind, the key, and **both** claimant `(packId, relFile)` pairs. Under W1.3's isolation the offending pack records `status: 'failed'` (`failure.step: 'flat-key'`) with zero writes; earlier packs in the topo order still install. Never first-wins, never silent (A17.2).
- The existing different-pack-stamp refusal in the reconcile stays — the belt to this check's suspenders.

**Tests** (`PackLogic.flatkey.test.ts`): two fixture packs shipping one name-bank key — offending pack aborts pre-write (store snapshot unchanged for it), error text contains pack id, key, both files; the innocent pack applies; a single pack with two files claiming one key also aborts; `sync` of a pack whose key collides with a sibling pack refuses.

### W1.6 — the ops surface in PackLogic/PackApi: plan/apply split, dry-run, diff, resolve, pin

`feat(pack): dry-run, diff, resolve, pin — the ops surface`

**Plan/apply split (planner's choice for how dry-run gets zero-write honesty):** restructure `reconcileKind` into a pure `computeKindPlan(...) → KindPlan` (action list: `insert | update | adopt | delete | keep | conflict | pinned-skip`, each with key, hashes, and the would-be row) and an `applyKindPlan(...)` that performs the writes and record mutation. `install`/`sync` = compute + apply; **dry-run = compute only**. This is one implementation reused three ways instead of a `dryRun` flag threaded through write sites — structurally impossible for dry-run to write.

New `PackApi` statics (thin forwards; matching gated `PackLogic` methods; all module-private work):

- `status(packId?): Promise<PackStatusReport[]>` — joins discovered manifests with `pack_installs` records: status, version, appliedAt, principal, open `conflicts`, `pins` (paths), failure if any. Undiscovered-but-recorded and discovered-but-unrecorded both reported.
- `dryRun(packId): Promise<PackDryRunReport>` — full plan for one pack (per-kind action lists + conflicts + pinned skips), zero writes.
- `diff(packId, path?): Promise<PackDiffReport>` — for one record key (or every conflicted key when `path` omitted): the **three bodies** — `baseline` (from `rows[path].body`), `yours` (canonical serialization of the current DB row), `theirs` (canonical serialization of the file's rendered row) — plus the three hashes. Presentation (the wiki three-body shape) is the controller's job; the Api returns bodies.
- `resolve(packId, path, mode: 'take-pack' | 'keep-pin' | 'export')`:
  - `take-pack` — write the file's row via `PersistApi.save` ($set-by-`_id`), baseline := file hash/body, clear the conflict, then re-hydrate live instances at that path via the existing `rehydrate` tail (and `NameBank.clearCache()` / descriptor cache drops through the strategy's `onChanged`).
  - `keep-pin` — append `path` to `record.pins`, clear the conflict, leave row and baseline untouched (the baseline is now moot — pinned rows never compare). There is **no bare keep** — the Api only speaks `keep-pin`.
  - `export` — serialize the DB row back to the pack's **workspace source file**: resolve the pack root by discovery, write YAML to `<root>/content/<recordKey>.yaml` — domain kind: `{class, hydratorClass?, data}`; bank kinds: the bank body. The conflict **stays open**; the next `sync` observes file == DB (the converged cell) and clears it. `fs.writeFileSync` from `PackLogic` is legal (obj/api tier). Errors (unwritable root in prod) surface as the command's failure.
- `pin(packId, path)` / `unpin(packId, path)` — direct pin management; `pin` outside a conflict is a legitimate proactive claim; `unpin` removes the pin (the next reconcile re-compares — and may immediately surface the conflict the pin was hiding, which is correct).

All record mutations go through one module-private `saveRecord` (PersistApi upsert by `_id`).

**Tests** (`PackLogic.ops.test.ts`): dry-run on a modified fixture pack reports the exact change set and the store is deep-equal before/after (the acceptance criterion's "DB hash-identical"); `status` lists conflicts + pins; `diff` returns three distinct bodies whose hashes match the record's triple; each resolve mode — `take-pack` updates row + baseline + rehydrate spy fired; `keep-pin` records the pin and a following `sync` reports `pinnedSkipped: 1` and touches nothing; `export` writes the expected YAML into a temp fixture pack root and the following `sync` clears the conflict via the converged cell; `pin`/`unpin` round-trip.

### W1.7 — the `pack` verb: subcommands

`feat(pack): pack status/install/sync/diff/resolve/pin verbs`

Rewrite `mud/cmd/author/pack.yaml` on the `errors.yaml` + `office.yaml` precedents (**planner's choice on parsing**: declarative `subcommands:` + `options:` — the engine already has per-subcommand args and boolean/string options; no hand-rolled flag parsing in the controller):

```yaml
verbs: [pack]
controller: /obj/command/author/PackController
validators:
  - /lib/command/validators/requiresPackInstaller   # W1.9 — requiresWizard until then
options:
  dry-run:   { type: boolean, field: dryRun }
  take-pack: { type: boolean, field: takePack }
  keep:      { type: boolean, field: keep }
  pin:       { type: boolean, field: pin }
  export:    { type: boolean, field: export }
subcommands:
  status:  { args: [ {name: packId, required: false} ] }
  install: { args: [ {name: packId, required: true} ] }     # --dry-run only this cycle
  sync:    { args: [ {name: packId, required: false} ] }
  diff:    { args: [ {name: packId, required: true}, {name: path, required: false, greedy: true} ] }
  resolve: { args: [ {name: packId, required: true}, {name: path, required: true, greedy: true} ] }
  pin:     { args: [ {name: packId, required: true}, {name: path, required: true, greedy: true} ] }
  unpin:   { args: [ {name: packId, required: true}, {name: path, required: true, greedy: true} ] }
```

`PackController` grows a dispatch table (the `ErrorsController` shape), one `executeX` per subcommand, all output plain escaped text through the existing `tell` (the diagnostics-build lesson: no nested MML lists). Rules enforced in the controller:

- `install` without `--dry-run` → rejected this cycle ("boot installs; use --dry-run to preview, `pack sync` to apply live") — install-at-runtime-with-writes is `sync`'s job and staging is a non-goal.
- `resolve` demands **exactly one** mode; `--keep` without `--pin` is rejected with the doctrine line ("keeping means claiming: use --keep --pin") — the requirements' "does not exist" cell.
- `diff` renders the three bodies wiki-style: three labeled sections (`— baseline (as installed) —` / `— yours (database) —` / `— theirs (pack file) —`), no machine merge.
- `status` always prints the pin line (`N rows pinned, skipped on last reconcile`) and each open conflict with the copy-pasteable next command.

Verify verb reachability during the build: `author/pack.yaml` is dispatched today without appearing in any `commandContributions` list; if the affordance sweep proves a plain member (non-author, non-wizard) cannot reach it, add `'author/pack.yaml'` to `AuthorMixin`'s `self` list with the `reserve.yaml` comment shape (afforded broadly, authorized by its own validator) — visibility and authorization are separate axes here by design.

**Tests** (`mud/obj/command/author/__tests__/PackController.test.ts`, PackApi stubbed): routing per subcommand; the two controller-enforced rules above; three-body rendering contains all three sections; unknown subcommand → usage.

### W1.8 — office-owned groups

`feat(governance): managed groups ownable by an office`

The bridge from A25, generic (not pack-specific):

- **Sentinel:** `Group.owner` may be `office:<officeKey>` (e.g. `office:prime-minister`). The field, `fieldMeta`, and Document shape are unchanged — it's a string. Document the sentinel in `Group.ts`'s owner doc comment and `groups.yaml`'s header.
- **Resolution home:** `GroupApi.ownsGroup(actor: Stuff, group: Group): Promise<boolean>` (new static on `mud/api/group.ts`, forwarding to a new method on `GroupRegistry` — state stays on the registry singleton, the Api stays thin):
  - plain owner → `group.owner === actor.getTemplatePath()` (today's comparison, centralized);
  - `office:` prefix → `CompactApi.holdsOffice(actor, key)` — which already encodes *absence of a handoff row = founder default* and fails closed with no registry. **Never** a stamped player id, **never** `isFounder` directly.
- **Consumers:** `GroupController`'s four ownership gates (`delete`, `rename`, `role` owner-only; `add`, `remove` owner-or-admin) route through `await GroupApi.ownsGroup(avatar, g)` (OR the existing `roleOf(...) === 'admin'` for the two owner-or-admin gates). `group show` renders an office owner as `owner: office:prime-minister (held by <CompactApi.officeHolderOf(...).label>)`.
- `ManagedGroupProvider.roleOf` is deliberately untouched — roster roles stay roster-based; ownership is a resolution, not a row.

**Tests** (`mud/obj/__tests__/GroupRegistry.owner.test.ts` + controller tests): `ownsGroup` — plain-owner match/mismatch; `office:` owner true/false via stubbed `CompactApi.holdsOffice`; founder-default path (holdsOffice true with no explicit row — stub returns the CompactLogic behavior); after a simulated handoff (stub flips holder) the old holder loses `ownsGroup` and the new gains it **with the Group document unchanged** — the no-data-migration property, asserted on the row. GroupController: office-owned group's `add` admitted for the seat-holder, refused for a non-holder.

### W1.9 — the `pack-installers` committee + `requiresPackInstaller`, and `requiresWizard` dies on `pack`

`feat(governance): pack-installers committee; gate pack on membership`

1. **The structure row** — `mud/config/groups.yaml` (GroupSeeder still runs in waves 0+1 and needs no code change; it already passes `owner` through):

```yaml
  - name: pack-installers
    # The executive's content-operations committee (offices are heads;
    # committees are hands — slate A25). Owned by the PM's OFFICE, not a
    # player: ownership resolves through holdsOffice on read, so handing
    # the PM seat hands this committee with no data migration. Zero
    # members at birth — structure only; the seat-holder appoints via
    # the ordinary `group add`.
    owner: office:prime-minister
    members: []
```

2. **The validator** — `mud/lib/command/validators/requiresPackInstaller.ts`, the exact `requiresGovernor` split-declaration shape (annotated `body` const + `preload` + `Object.assign`; no module-scope statements):
   - `preload(context)`: resolve the giver's templatePath; `const g = (await GroupApi.registry()).managed()` → `findByName('pack-installers')`; return `g?.roleOf(giverPath) != null` (membership keys are avatar templatePaths — the `GroupController.executeAdd` convention). Missing group or no giver → `false` (fails closed).
   - `body`: on false, a **diegetic decline**: `"the pack office does not recognize your commission — installation is the pack-installers committee's work (appointed by whoever holds the Prime Minister's seat)"`.
   - Deliberately **not** `AccessApi.can` (the antipatterns-table staff-gate row): that path resolves *parcel title*, and this committee holds no parcel — the requirements gate on committee membership per se; the validator is the sanctioned home for an axis check (`requiresWizard`/`requiresGovernor` precedents).
   - No `isWizard` anywhere in it, and after this commit `grep -rn "requiresWizard\|isWizard"` over `pack.yaml`, `PackController.ts`, `PackLogic.ts`, `pack.ts`, `requiresPackInstaller.ts` returns nothing — the requirements' constraint, checked literally.
3. **Swap the gate:** `pack.yaml`'s `validators:` list drops `requiresWizard`, gains `requiresPackInstaller` (verb-level — every subcommand is the same install-path surface). Update `PackController`'s header comment and `pack.yaml` help text (who may run it, and how to get appointed).

**Tests:**
- `mud/lib/command/validators/__tests__/requiresPackInstaller.test.ts` — member passes; non-member gets the diegetic decline string; **wizard non-member refused** (stub `AccessApi.isWizard` → true, membership absent — asserts the axis is membership, never wizardness); missing group fails closed.
- **The appointment-ceremony integration test** (colocated with the validator or GroupController tests): seed the office-owned group (as GroupSeeder would); founder-as-default-PM (CompactApi stubbed per the governance contract: no explicit row + isFounder true) drives `group add pack-installers <member>` through `GroupController` → succeeds; the member now passes `requiresPackInstaller.preload`; a stranger fails; simulate `assignOffice('prime-minister', other)` (stub flips `holdsOffice`) → the founder can no longer add, the new holder can, and the Group document was never rewritten. (The live `office assign` online-resolve bug — governance.md § Open — is why this is unit-level; see Risks.)

### W1.10 — the newbie-wilds pack

`feat(pack): newbie-wilds becomes the fourth content pack`

1. **Widen the domain-kind walk** (prerequisite, one commit or folded here): `PackLogic.readContent` currently walks only `content/obj/`. Add `content/domain/` as a second template-kind root — **enumerated roots, not a catch-all glob** (the sibling subdirs `quantity/`, `name-banks/`, `descriptor-banks/` are their own kinds and must never be swept into the template kind). The units slate's "fractal under any root" end-state arrives with wave 4's path surgery; two enumerated roots is this cycle's honest shape. Test: fixture pack with `content/domain/x/y.yaml` reconciles to template path `/domain/x/y`.
2. **Scaffold** `packages/content/newbie-wilds/` mirroring base-library:
   - `package.json`: `{ "name": "@saxonberg/content-newbie-wilds", "version": "0.1.0", "private": true, "type": "module", "description": "The newbie wilds — frontier onboarding zone: crossroads, delve, cast." }`
   - `pack.yaml`: `id: newbie-wilds`, `version: 0.1.0`, `dependsOn: []` (requires-kernel checks *classes*, all kernel-resident — `/obj/Business`, `/obj/NPC`, rooms; the `banksAt: goodkin` / species references are data pointers, not install-order dependencies), short description, plus a README (base-library precedent).
3. **Move the 21 files:** `git mv packages/server/src/mud/seeds/domain/newbie-wilds/<rel> packages/content/newbie-wilds/content/domain/newbie-wilds/<rel>` for all 21 yaml files — content bytes untouched, template paths unchanged (`/domain/newbie-wilds/...`), and the seed tree entry **deleted by the move** (so `SeederManager` can never re-insert them — disjointness by construction). Stage by name, never `add -A` (worktree rule 1).
4. **Workspace registration:** `packages/server/package.json` dependencies gains `"@saxonberg/content-newbie-wilds": "workspace:*"` — discovery reads exactly this (the single source of truth). `pnpm install` to settle the lockfile.
5. `scripts/check-instanceable-placement.ts` needs **no** edit — it auto-discovers every `packages/content/*/content` root (verified).
6. **Adopt path on an existing dev DB** comes free from W1.3: the rows exist unstamped → adopt-in-place ($set-by-`_id`, no wipe), record written, one-time normalization line. Fresh DB: 21 inserts.
7. Update `AppBootstrap.run`'s pack comment block to name the fourth pack.

**Tests** (`PackLogic.newbie-wilds.test.ts`, real pack root via the `packRoots` override — the base-library integration-test precedent): empty store → 21 inserted, record has 21 `domain` baselines; pre-seeded unstamped store (rows built from the real files, distinct `_id`s) → 21 adopted, `_id`s preserved, normalization warn fired; second run → all-zero result, record hashes unchanged. Plus `lint:instanceable` green (it now parses the pack's real YAML).

### W1.11 — docs, gates, suite, drive

`docs(pack): content-packs subsystem update` (+ the pre-merge sweep later per workflow.md):

- `docs/subsystems/content-packs.md`: the `content` collection name; the `pack_installs` record (schema + the body-beside-hash and conflicts-in-record decisions); the three-way policy table; adoption normalization; pins doctrine (`--keep` without `--pin` does not exist); flat-key check; the ops verbs; the `pack-installers` gate + office-owned groups pointer to grouping.md/governance.md; newbie-wilds in the shipped-packs list and Key files.
- `docs/subsystems/grouping.md`: the `office:` owner sentinel + `GroupApi.ownsGroup` (a short section; the committee cross-reference already exists).
- CLAUDE.md collection-list lines (`domain` → `content`, add `pack_installs`): sweep-time (index file).
- Gates: `pnpm lint:gates`, `lint:instanceable`, `lint:imports`, `lint:module-scope`, `lint:pm`, `lint:test-bootstrap` — all green.
- **One** full `pnpm test`.
- **Drive** (not suite): boot against a dev DB, log in, `goto /domain/newbie-wilds/crossroads/hub` (or walk in), confirm the crossroads renders and NPCs (sentry/sellsword/duelist/wolf) are present; run `pack status` as an appointed member. Second boot: confirm no-op (no normalization line, zero-change pack lines).
- Push the branch, open the MR (workflow.md phase 3).

---

## Acceptance-criteria mapping

| Criterion (requirements doc) | Step | Test / verification |
|---|---|---|
| Fresh DB: four packs, four applied records with full baselines; `pack status` lists them | W1.3, W1.10, W1.6 | `PackLogic.record.test.ts` fresh-store case; `PackLogic.newbie-wilds.test.ts`; `PackLogic.ops.test.ts` status; drive check |
| Existing dev DB: one boot = rename + adopt + baselines + one-time line; second boot no-op | W0.2, W1.3, W1.10 | migration two-boot test; record second-run test; newbie-wilds adopt + second-run test; drive check (two boots) |
| Three-way cells test-covered per kind (domain + name-banks) | W1.4 | `PackLogic.threeway.test.ts` — full matrix × both kinds |
| Conflict: in `pack status` + diagnostics store; `diff` three bodies; all three resolve modes covered | W1.4, W1.6, W1.7 | threeway (diagnostic spy, record.conflicts); ops tests (take-pack / keep-pin / export round-trip); controller diff rendering |
| `install --dry-run` reports exact change set, writes nothing | W1.6, W1.7 | ops test store-snapshot equality; controller `--dry-run` routing |
| Appointment ceremony end-to-end; non-member diegetic decline; **wizard non-member refused**; PM handoff transfers power, no data migration | W1.8, W1.9 | validator test (incl. wizard-true/member-false); ceremony integration test; `GroupRegistry.owner.test.ts` handoff-without-row-change |
| Flat-key collision aborts pre-write naming pack, key, both claimants | W1.5 | `PackLogic.flatkey.test.ts` |
| Pins loud (reported every reconcile, recorded) | W1.4, W1.6 | threeway pinned case; ops keep-pin follow-up sync |
| `--export` git round-trip; conflict clears on later sync | W1.6 | ops export test (converged-cell clearance) |
| lint family + full suite green (one run) | W1.11 | CI + one `pnpm test` |
| content-packs.md updated; CLAUDE.md line at sweep | W1.11 + sweep | doc diff |
| Newbie-wilds walkable in a driven session | W1.11 | manual drive, recorded in MR description |
| Grep-clean rename; migration idempotent, never renames over live `content` | W0.1, W0.2 | grep gate; migration tests |
| No new write path skipping PersistApi; `saveTemplate` gap not widened | all | `lint:pm`; every new write in the plan is `PersistApi.save/delete` |

---

## Risks & ordering constraints

- **Rename-first is load-bearing (A24):** W0 lands before any W1 code so no new installer code ever speaks `'domain'`. Enforced by commit order + the grep gate.
- **Migration vs index creation:** `createIndexes()` would auto-create an empty `content` collection and permanently poison the rename. The migration call sits inside `connect()` *before* `createIndexes()` — do not move it to `AppBootstrap` (too late: connect already built indexes).
- **Seeder coexistence:** `SeederManager` runs before `PackApi.install` and is insert-only on the shrunken `seeds/` tree; the newbie-wilds seed files are deleted by the move, so the seeder cannot re-insert what the installer now owns. Disjoint by construction — but the ordering (`SeederManager` → `PackApi.install` → `loadHooks` → per-collection seeders incl. `GroupSeeder`) must not be reshuffled; the pack content is pre-hooks content.
- **Two-boot idempotence** is tested at three layers (migration, record, newbie-wilds) and verified once by driving; a regression here silently re-normalizes operator divergence every boot — the worst failure this build can have.
- **Hash stability:** the preimage is content-only (`class`/`hydratorClass`/`data` or bank body — never `_id`, `sourcePack`, timestamps), key-sorted, `undefined`-normalized. BSON round-trips of YAML-derived plain scalars are stable; the record test's second-run hash-equality is the tripwire. Any future field added to the row shape must be either included in the preimage or excluded deliberately (comment at the `canonicalBody` site).
- **Baseline `body` beside the hash** is a schema extension over A17.1's minimum — flagged for user sign-off during plan review; without it, `pack diff`'s baseline pane is unrenderable in exactly the both-changed cell where it matters.
- **`office assign` online-resolve bug** (governance.md § Open): the live PM-handoff leg of the ceremony can't be driven end-to-end until that bug is fixed, so the handoff criterion is proven at unit level (holdsOffice flip + unchanged Group row). Noted in the MR.
- **Cloned-content rehydrate on `resolve --take-pack` / `sync`:** newbie-wilds rows are cloned rooms/NPCs, not singletons-by-path; `rehydrate` already walks `findAllByTemplatePath`, but live players standing in a re-hydrated room is lightly-trodden ground — restart remains the universal go-live (A10.9); the drive check covers the common case.
- **`--export` file writes** are workspace-only by construction (the resolved pack root); in a dist deployment the write fails loudly — acceptable this cycle (all packs first-party, ops = dev).
- **Verb reachability** (W1.7): confirm a plain committee member can dispatch `pack` before relying on the validator for the refusal tests; add the AuthorMixin affordance line only if driving proves it necessary.

## Critical files for implementation

- `packages/server/src/mud/obj/api/PackLogic.ts` — strategy extraction, record, three-way machine, flat-key check, ops surface (the bulk of the build)
- `packages/server/src/mud/api/pack.ts` — the new Api statics + record/conflict/report call-shape types
- `packages/server/src/backend/PersistenceManager.ts` — the rename migration, `COLLECTION_POLICIES` rows, `pack_installs` index
- `packages/server/src/mud/lib/persistence/Collections.ts` — `Domain`→`Content`, `PackInstalls`
- `packages/server/src/mud/obj/command/author/PackController.ts` (+ `mud/cmd/author/pack.yaml`, `mud/lib/command/validators/requiresPackInstaller.ts`, `mud/config/groups.yaml`) — the verb, its gate, and the committee row
