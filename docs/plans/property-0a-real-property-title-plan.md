# Implementation Plan — Property Phase 0a: real-property title

> Planned against **post-Terminus/stream master** (the current mainline). The
> requirements' blast-radius analysis predated the Terminus merge and is **stale** —
> Part 0 re-derives it, and Part 1 flags the requirements conflicts that need a
> revisit before build. Seeded by
> [property-0a requirements](../requirements/property-0a-real-property-title-requirements.md)
> + [property-slate.md](../slates/builds/property-slate.md) §A–§K.

## Part 0 — Corrected blast-radius (the requirements' analysis is stale)

Re-read the current `AccessRegistry.ts`, `Zone.ts`, `access.md`, and all zone-ownership seeds. **The Terminus merge (`ec5e5353`) invalidated three requirements assumptions:**

**A. There is no `seedLoungeSlice` anymore.** The per-area `seed*Slice` boot hooks were deleted. `AccessRegistry.postRegister` now only seeds the *tag-like* groups (`core`/`wizards`/`streamers`/`archwizards`); "Zone-ownership slices (lounge / Terminus) are NOT seeded here." Ownership is now **data-driven from seed YAML**: a zone declares `data.ownerGroupName: <name>` and the access layer mints-or-finds the group lazily on first read.

**B. There is a THIRD Zone field, `ownerGroupName`, and `persistentFields` has three entries.** `Zone.ts:65` is `static persistentFields = ['ownerGroup', 'accessGroups', 'ownerGroupName']`, with `_ownerGroupName?: string` + `getOwnerGroupName`/`setOwnerGroupName`. Requirements decision #2 ("remove the fields + `persistentFields = ['ownerGroup','accessGroups']`") no longer matches the field set.

**C. There are THREE stamped zones across TWO owner groups, one of them spatial:**
- `/lib/lounge.yaml` → `ownerGroupName: lounge` (FolderZone)
- `/domain/lounge.yaml` → `ownerGroupName: lounge` (FolderZone)
- `/domain/terminus/terminal.yaml` → `ownerGroupName: terminus` (**`/lib/location/CartesianZone`** — a *spatial* zone)
- `/domain/newbie-wilds/crossroads.yaml` → **no owner** (the newbie-wilds build will stamp its own)

`accessGroups` is used by **zero** seeds. Requirements decision #7 ("the lounge is the only stamped zone") is wrong: the Terminus terminal is a second owned area, under a different group, and is the first *spatial-zone* ownership stamp (validating "parcel = FolderZone OR spatial zone" — but the migration is not lounge-only).

**D. The reader/writer set is larger than "AccessRegistry + Zone":**
1. `AccessRegistry.can` — slice walk via `effectiveOwnerRef(zone)` + `zone.getAccessGroups()`.
2. `AccessRegistry.canMutateZone` — via `effectiveOwnerRef`, requires `'owner'` role.
3. `AccessRegistry.ensureAuthorGroups` — **scans every folder Template's `data`** for `ownerGroup` + `ownerGroupName` + `accessGroups`.
4. `effectiveOwnerRef` / `resolveOwnerGroupName` — the new symbolic mint-or-find path (`cachedOwnerNameRefs`).
5. `Zone.ts` getters/setters + `persistentFields` + `validateGroupRef`.
6. `PersistentHydrator` round-trips the three fields.
7. Seed YAML: `data.ownerGroupName` in the three files above.
8. Docs: `access.md` "Ownership on the Zone tree" section.

True blast radius: **AccessRegistry (~5 sites), Zone (fields + hydration), the symbolic-name seed path, three seed YAMLs, and access.md** — not the two-site containment the requirements claimed.

## Part 1 — Conflicts to bounce back to the requirements author

> **RESOLVED 2026-07-11 — requirements updated.** #1 and #2 corrected in the requirements
> (decision #7 → lounge + Terminus; decision #2 → three fields + retire the symbolic
> machinery). #3 **decided: Option B — explicit `parcels` seed rows, ownership never in
> content** (the governing security invariant), NOT harvest-from-seed. §Part 5f and §Part 7
> below reflect Option B. #4 (typed `ParcelOwner`) and #5 (`accessGroups` conscious
> deletion) are now named in the requirements.

1. **CONFLICT — decision #7 "lounge is the only stamped zone" is false.** Migration must cover **lounge (group `lounge`) AND Terminus terminal (group `terminus`)** — two groups, three paths, one a `CartesianZone`. The "Lounge regression" acceptance criterion widens to "lounge + Terminus regression."
2. **CONFLICT — decision #2's field list and "writer is `seedLoungeSlice`" are both stale.** No `seedLoungeSlice`; the writer is the seed-YAML `ownerGroupName` + lazy `resolveOwnerGroupName`. Removal must delete **three** fields + a three-entry `persistentFields`, and retire `effectiveOwnerRef`/`resolveOwnerGroupName`/`cachedOwnerNameRefs` + the `ensureAuthorGroups` template-`data` scan. Strictly more removal than budgeted.
3. **DECIDED — Option B: explicit `parcels` seed rows; ownership never in content.** Rather than harvest `ownerGroupName` from the zone seed (which keeps an access-control source inside the editable `domain` collection), ownership is declared as gated platform `parcels` seed rows and `ownerGroupName` is removed from the zone seeds entirely. This satisfies the governing security invariant (access-check data unspoofable by content edits) and is the only shape forward-compatible with the content-pack/mod future (content is untrusted → ownership-in-content is a supply-chain spoof). The "one seed field" ergonomic cost is trivial + transitional (seeding is being replaced by packs). See §Part 7.
4. **DESIGN GAP — `ownerOf` must return a *typed principal*, not a bare group ref.** The 0a chain introduces **individual** owners (self-home → a player; author fallback → a player templatePath). So `can`/`canMutateZone` must dispatch on owner kind (group → membership/role; player → identity match). Defined as a `ParcelOwner` discriminated union (§3).
5. **MINOR — `accessGroups` (flat-union secondary-groups walk) has no 0a equivalent.** Folded into the future `grants[]` seam (inert in 0a). No seed uses it → dropping is byte-identical, but it *is* a conscious multi-group-ACL removal that 0b's `grants[]` must later restore.

## Part 2 — Module shape (no new categories)

Mirror the **AccessRegistry / AccessLogic / AccessApi** three-tier.

| File | Category | Notes |
|---|---|---|
| `obj/ParcelRegistry.ts` | Stuff singleton (`Idea`+`PostRegistrationMixin`) | Holds the `PathTrie<ParcelRecord>` coverage index + caches. Public methods `@CallSecurity(AnyOf(FromModule('/api/parcel#ParcelApi'), FromTemplate('/obj/api/parcel')))` (copy `AccessRegistry`'s two-caller policy). |
| `obj/api/ParcelLogic.ts` | Api logic singleton | `@internal`, registers at `/obj/api/parcel`, gated `FromModule('/api/parcel#ParcelApi')`; module-private impls (the `AccessLogic`/`DocumentLogic` pattern). |
| `api/parcel.ts` | Api | Thin forwarding shell; ends `SecurityApi.decorateApiClass(ParcelApi)`. |
| `lib/parcel/ParcelRecord.ts` | Named value-object | `extends Document`, `collectionName = 'parcels'`; + the `ParcelOwner` type. New `lib/parcel/` subsystem folder. |
| `seeds/obj/ParcelRegistry.yaml` | seed | `class: /obj/ParcelRegistry`. |
| `cmd/system/subdivide.yaml` + `transfer.yaml` | Command YAML | Category **`system`**. |
| `obj/command/system/SubdivideController.ts` + `TransferController.ts` | Controller | MVC pairs. |

**Boot:** `bootstrap.ts` manifest entry `{ templatePath: '/obj/ParcelRegistry', dependsOn: ['/obj/GroupRegistry'] }` after `/obj/AccessRegistry`. Add `parcelRegistry: '/obj/ParcelRegistry'` to `TemplatePaths` in `lib/paths.ts`. The `parcels` collection exists once `ParcelRecord.collectionName='parcels'` is declared (the `StoredDocument` precedent) — no `PersistenceManager` edit.

## Part 3 — The `parcels` row shape + coverage index

```ts
export type ParcelOwner =
  | { kind: 'group'; name: string }          // symbolic managed-group name ('lounge','terminus')
  | { kind: 'group'; ref: GroupRef }          // explicit managed:<id>
  | { kind: 'player'; templatePath: string }; // an individual (self-home, or a title transferred to a player)

export class ParcelRecord extends Document {
  static collectionName = 'parcels';
  static persistentFields = ['extent','owner','parentParcel','zonePath','grants','allowance'];
  extent = '';            // the path this parcel claims (the coverage key)
  zonePath = '';          // backing Zone's templatePath (== extent in 0a)
  owner: ParcelOwner | null = null;
  parentParcel: string | null = null;  // parent parcel's `extent` (sparse-hierarchy edge)
  grants: unknown[] = [];        // INERT seam (0b lease mechanics)
  allowance: unknown | null = null; // INERT seam (Phase 1 compute economy)
}
```

- **`owner`** carries the discriminated principal; migrated zones → `{kind:'group',name:'lounge'|'terminus'}`, resolved to `managed:<id>` the way `resolveOwnerGroupName` does today → **group-membership byte-identical**.
- **Coverage index:** `PathTrie<ParcelRecord>` inserted under `extent` (copy `AddressRegistry`); resolution = `coverage.longestPrefix(path)[0] ?? null` (`AddressRegistry.coveringLocalityOf` precedent, `PathTrie.longestPrefix`). `parentParcel` stored for O(1) transfer/subdivide bookkeeping (derivable from the trie, but cheap to keep).
- `postRegister` rebuilds the index from the `parcels` collection (idempotent), mirroring `AddressRegistry.rebuildIndex`.

**Chain-of-title — the registry is log-backed (the banking/renown sibling pattern).** A
second append-only collection **`parcel_events`** records every title event
(`{extent, event:'subdivide'|'transfer', from, to, actor, at}`); the `parcels` rows are
the **current-state cache**. In 0a the `owner` field is maintained directly *and* every
mutation appends to `parcel_events` (write the trail now — cheap; rebuild-from-log and the
chain-of-title *readout* are deferred consumers). This preserves ownership lineage so
`transfer` is **never a destructive overwrite** — required for the real-estate metagame's
"once owned by nobility" provenance (slate §L), and it matches `bank_ledger→bank_accounts`
/ `renown_events→renown`. **Collections:** `parcels` (current state) + `parcel_events`
(append-only history) — both write-gated to `ParcelApi` + the seed installer (the
governing security invariant).

## Part 4 — `ownerOf` resolution (the total THREE-rung chain) + self-home

`ParcelLogic.ownerOf(path): Promise<ParcelOwner>` (total) — **governance decision: default
title is publicly held (the state); the author rung is removed** (authoring → credit, not
title — the full un-fusing):
1. **Explicit parcel title** — `coveringParcelOf(path)` longest-prefix; if covered, return its `owner`.
2. **Self-home identity** — `/home/<key>/…` → `{kind:'player', templatePath:'/home/<key>'}`, **no `parcels` row**. Must **generalize, not fork, `DocumentLogic.isOwnHomePath`** (`DocumentLogic.ts:39–42`): extract the `/home/<key>/` rule into `ParcelApi.selfHomeOwnerOf(path)` and rewrite `DocumentLogic.isOwnHomePath` to consume it (one `/home/` rule, kept shared).
3. **The state (public default)** — `{kind:'group', name:'core'}`. `'core'` is the state placeholder in 0a; a dedicated state/treasury principal is a governance-build refinement.

**No `ProvenanceApi.authorOf` rung** — authorship feeds provenance/credit only, never title.
This makes the chain **byte-identical** (untitled content → state = today's core walk) and
**resolves R2a** (no authored-content access change).

## Part 5 — The `AccessApi.can` / `AccessRegistry` repoint

Decision logic stays in the access layer; storage moves to parcels.
- **5a `can`** — replace the zone-tree walk with `owner = await ParcelApi.ownerOf(zoneOf(resource).getTemplatePath())`, then dispatch: `group` → resolve ref (mint-or-find by name) → `GroupApi.isMember`; `player` → identity match. Byte-identical for lounge/Terminus (no `accessGroups` in use → the old flat-union collapses to the single nearest owner + core, which is what `longestPrefix` returns).
- **5b `canMutateZone`** — same substitution; group owner keeps the `'owner'`-role requirement (`GroupApi.roleOf`), player owner = identity match; core fallback preserved.
- **5c `ensureAuthorGroups`** — repoint the template-`data` scan to enumerate **parcel rows** (every group named/reffed by a `group`-kind parcel owner + `core`).
- **5d Retire the symbolic-name machinery** — `effectiveOwnerRef`/`resolveOwnerGroupName`/`cachedOwnerNameRefs`; the mint-or-find-by-name logic **moves** into `ParcelLogic`/`ParcelRegistry` (how a `{kind:'group',name}` owner resolves to a ref).
- **5e `Zone.ts`** — delete `_ownerGroup`/`_accessGroups`/`_ownerGroupName` + accessors + `validateGroupRef`; `persistentFields = []` (or drop). **Preserve `lookupField`/`lookupAncestorField`** (celestial/biome inheritance — orthogonal). Folder/leaf invariant is structural (`prototype instanceof Zone`) → untouched. Hydrator needs no change (it just stops round-tripping ownership).
- **5f Seeds** — remove `ownerGroupName` from the three YAMLs; leave `crossroads.yaml` (unowned).
- **5g `AccessLogic`** — no signature changes; forwards `can`/`canMutateZone`/`isAuthor` unchanged.

## Part 6 — `subdivide` + `transfer` verbs

Category `system`; actor from `ExecutionContextApi.getActingAuthor` (never a parameter).

**`subdivide <name>`:** resolve the giver's governing parcel → gate to parent-parcel owner (refuse non-owner) → mint the child zone via `TemplateApi.saveTemplate(childPath, '/lib/zone/FolderZone', {})` (**`MkdirController.ts:62` precedent**; `/lib/location/CartesianZone` for a spatial carve-out) → write the parcel row (`owner` inherits parent, `parentParcel`, `extent=zonePath=childPath`) → wire the boundary exit (no-op for FolderZone). *Spatial carve-out exit wiring may exceed 0a — ship FolderZone-first, defer spatial (matches the "coordinate-region parcels deferred" non-goal).*

**`transfer <parcel> to <player>` (bilateral consent):** gate to current owner (refuse non-owner giver) → **receiver consent** via `PromptApi.confirm(receiver, "Accept title to <parcel>? (it carries liability)")`; decline/timeout → abort → on accept `ParcelApi.transfer(extent, newOwner)` **appends a `transfer` event to `parcel_events`** (from = current owner, to = newOwner, actor = the acting principal), then updates the current-owner cache row + re-warms the trie — **not a destructive overwrite** (chain-of-title, §Part 3). `subdivide` likewise appends a genesis event. Title-only, **no banking** (`sell` deferred).

Both controllers call `ParcelApi` (the only legitimate caller of `ParcelRegistry`).

## Part 7 — Migration (Option B: explicit `parcels` seed rows, idempotent)

**Ownership is declared as gated platform `parcels` seed rows — never on the zone seed.**
- Author `seeds/obj/parcels/*.yaml` rows (installed through the trusted seed channel into
  the gated `parcels` collection): `/lib/lounge` + `/domain/lounge` → `owner {kind:'group',name:'lounge'}`;
  `/domain/terminus/terminal` → `owner {kind:'group',name:'terminus'}`. `crossroads` gets none (unowned).
- **Remove `ownerGroupName` from the zone seeds entirely** (`/lib/lounge.yaml`,
  `/domain/lounge.yaml`, `/domain/terminus/terminal.yaml`) — ownership no longer lives in
  `domain` in any form.
- `ParcelRegistry.postRegister` loads the `parcels` collection and builds the coverage trie;
  seed rows upsert **iff absent** (find-by-`extent` guard → idempotent; re-run = no-op).
- **No world-wide data migration** — only the three stamped zones; `authoring_events` untouched
  (owner-defaults-to-author needs no migration).
- **Security note:** the `parcels` collection is write-gated to `ParcelApi` + the seed
  installer, exactly like `bank_accounts`/`AccessRegistry` state. Content edits (domain-write,
  future packs) can never reach it — the governing invariant.

## Part 8 — Test plan

**Unit** (reuse `AccessRegistry.test.ts`'s in-memory `PersistenceManager` harness): `ownerOf` each rung (title / self-home-no-row / author / core) + title-overrides-author; hierarchy (nested → closest ancestor; carve-out inheritance); `subdivide` (mints zone+row+parentParcel+boundary; refuses non-owner); `transfer` (consent; refuses non-owner giver; refuses unconsenting receiver via mocked `PromptApi.confirm`); gate coverage (external `ParcelRegistry` caller throws `SecurityError`).

**Load-bearing regression:** **byte-identical `can`/`canMutateZone` decisions** over lounge (`/domain/lounge`, group `lounge`) **and the Terminus terminal** (`/domain/terminus/terminal`, group `terminus`, `CartesianZone`) for representative callers (member / non-member / `'owner'`-vs-`'member'`-role / null-NPC subject) vs. the pre-migration path. Idempotent seeding (run `postRegister` twice → one row/zone). Existing `access` + `zone` suites green (update fixtures that set `ownerGroupName`/`ownerGroup` to seed parcel rows). `pnpm lint:gates` green.

## Part 9 — Sequencing

1. `lib/parcel/ParcelRecord.ts` (+ `ParcelOwner`) — round-trip testable, no deps.
2. `obj/ParcelRegistry.ts` + coverage trie + `postRegister` rebuild — unit-testable, no repoint.
3. `obj/api/ParcelLogic.ts` (`ownerOf` chain) + `api/parcel.ts` + boot manifest + `TemplatePaths` — `ownerOf` tests standalone.
4. Self-home generalization — extract the `/home/<key>/` rule; point `DocumentLogic.isOwnHomePath` at it; document-store suite green.
5. Migration — `postRegister` harvest of the three zones; idempotency test.
6. **The repoint (risky, land last-but-one)** — rewrite `can`/`canMutateZone`/`ensureAuthorGroups`; **land the regression test red first, then the repoint green**; then delete the Zone fields + symbolic machinery + strip seeds. `access`+`zone` suites.
7. Verbs — `subdivide` then `transfer` (consent flow).
8. Docs (finalize) — `docs/subsystems/parcel.md`; update `access.md`/`zone.md`.

Steps 1–5 are independent of the repoint; step 6 is the only one that can regress live behavior (the regression test gates it).

## Part 10 — Risks

- **R1 (highest) — non-byte-identical `can`.** The old walk did a *flat union of every ancestor's* `ownerGroup`+`accessGroups`; the parcel model resolves a *single* nearest owner. Safe only because **no seed uses `accessGroups`** and ownership is single-group-per-subtree. *Mitigation: the widened regression test + a one-time audit of the **deployed** `domain` collection for stray `data.accessGroups` / nested differing `ownerGroup`.*
- **R2 — the individual-owner path is new to `can`** (group-membership was the only prior case). *Mitigation: explicit self-home + author-owned `can` tests.*
- **R2a — RESOLVED (governance decision): the author rung is removed entirely.** Default
  title is **publicly held (the state = `'core'` in 0a)**; authoring → credit, not title.
  So `ownerOf` and `can` both use `title → self-home → state`, with **no author rung** —
  which is **byte-identical** to today (untitled → core) and eliminates the
  authored-content access-change risk. Access to state-owned content is the existing
  `core`/wizard gate in 0a, a seam the future PM/legislature-doled-access model refines.
  (See requirements decision #3.)
- **R3 — re-introducing a boot hook Terminus removed** (the harvest pass). *Mitigation: keep it declarative — harvest the seed field, don't hardcode paths; §Part 1 #3 sign-off.*
- **R4 — spatial carve-out exit wiring** may exceed 0a (the Terminus terminal is a `CartesianZone`). *Mitigation: ship `subdivide` FolderZone-first; defer spatial (matches the deferred non-goal).*
- **R5 — `ensureAuthorGroups` semantics** change if any owned zone lacks a parcel row post-migration. *Mitigation: migration covers every owned zone; `isAuthor` regression test.*
- **R6 — `Zone.persistentFields` removal** surprising a hydrator path. *Mitigation: grep hydrator for hard reads; celestial/biome use `lookupField` (dynamic), not `persistentFields`.*

## Critical files
- `packages/server/src/mud/obj/AccessRegistry.ts` (`can`, `canMutateZone`, `ensureAuthorGroups`, retire `effectiveOwnerRef`/`resolveOwnerGroupName`)
- `packages/server/src/mud/lib/zone/Zone.ts` (field + `persistentFields` removal)
- `packages/server/src/mud/obj/api/DocumentLogic.ts` (self-home base case to generalize)
- `packages/server/src/mud/obj/AddressRegistry.ts` + `lib/collections/PathTrie.ts` (coverage-index precedent)
- `packages/server/src/mud/obj/api/AccessLogic.ts` + `api/access.ts` (the three-tier shape to mirror)
