# Property 0a — real-property title — requirements

Phase 0a of the **property** build: the real-property **title** substrate.
It turns the informal `/domain/<team>/` FolderZone-ownership convention into a
first-class, path-resolved **title layer stored separately from the content it
gates**. A *parcel* becomes an ownable, titled extent (a Zone + a title record);
parcels form a sparse hierarchy over the zone tree; ownership is un-fused from
authorship; and titles can be minted and transferred at runtime. This is the
foundation the whole build-order list points up to (pets / ranching / farming /
economy / governance) and it directly unblocks the half-built dorm's long-deferred
per-player gating.

Seeded by [property-slate.md](../slates/builds/property-slate.md) — the design-session
addendum §A–§K and the "Phase re-slice & readiness" closing section scope this slice.
0a is **title only**: no chattel, no persistence generalization, no compute economy.

## Goals

- **A parcel is a first-class titled extent** — always a Zone (a `FolderZone` for
  an area, a spatial zone for a grid), with a title record in a **separate
  `parcels` collection**, resolvable by longest-prefix over the path.
- **Ownership/access data lives in `parcels`, not `domain`.** `AccessApi.can`
  reads the parcels registry; the Zone template no longer carries access controls
  (privilege separation — the collection being gated must not hold its own keys).
- **Parcels form a sparse hierarchy** over the zone tree: a `parentParcel` edge and
  carve-out sub-parcels; a zone with no parcel record inherits its governing parcel
  from the nearest parcel-bearing ancestor.
- **Author ≠ owner.** Ownership is a transferable **title** distinct from the
  immutable `authoring_events` ledger; **owner defaults to author** with no data
  migration.
- **Every player implicitly owns `/home/<self>/`** — the *default parcel*, resolved
  by identity with no `parcels` row (generalizing the shipped `DocumentLogic`
  self-home base case).
- **`ownerOf(path)` is total** — resolves for any path via a defined fallback chain.
- **Titles are minted and moved at runtime, self-serve** — `subdivide` mints a
  sub-parcel; `transfer` moves a title (bilateral consent); both gated to the owner.
- **The lounge migrates with no behavior change** — its `/domain/lounge` +
  `/lib/lounge` ownership moves from Zone-data stamps to parcel rows, and
  `AccessApi.can` decisions over that subtree are byte-identical.
- **The claims-and-grants registry shape ships** (`owner` + a `grants[]` field);
  0a populates and resolves `owner` only.

## Non-goals

Explicitly out of 0a (each lands where noted):

- **Chattel / possession + `PersistableHolder`** → 0b.
- **The lease *mechanics*** (`useRightOf`, the lease verb, revert-on-leave) — the
  `grants[]` field ships as an inert seam; behavior is → 0b.
- **`sell` / payment-coupled transfer + the Contract atomicity** → 0b/later (0a's
  `transfer` is title-only, no banking).
- **Compute allowance metering + runtime degradation** → Phase 1 (the `allowance`
  field may exist on the row as an inert seam only).
- **The sandbox / wardrobe** → a later consumer (downstream of 0a+0b+the release gate).
- **Coordinate-region ("region") parcels** — sub-zone spatial ownership → deferred,
  additive.
- **The Warren-for-dorms revisit** → a `dorm-warren` consumer decision, not 0a.
- **Chattel/inventory persistence, the document-doc room persistence** → 0b (0a does
  not touch persistence).

## Surface decisions

### 1. `parcels` is its own registry + gated Api

**Q:** Where does title/hierarchy logic live? **A:** A new `ParcelRegistry`
singleton (`obj/ParcelRegistry.ts`, an `Idea`+`PostRegistrationMixin`, sibling to
`AccessRegistry`/`GroupRegistry`) backed by the `parcels` collection, behind a gated
`ParcelApi` (`api/parcel.ts`) → `ParcelLogic` (`obj/api/ParcelLogic.ts`). `AccessApi`
keeps the access-*decision* logic and **consults `ParcelApi`** for ownership
resolution; title/hierarchy *storage* moves to `ParcelApi`. **Why:** clean §B
separation — parcels are their own concept (title, hierarchy, later grants/allowance),
and access-decision vs. title-storage are different responsibilities.

### 2. `Zone.ownerGroup`/`accessGroups` are removed

**Q:** Deprecate-in-place or remove? **A:** Remove the fields, the getters/setters,
and `Zone.persistentFields = ['ownerGroup','accessGroups']`. **Why:** the blast-radius
investigation confirmed the *only* readers are inside `AccessRegistry` (the `can`
walk, `canMutateZone`, `ensureAuthorGroups`) and the *only* writer is
`seedLoungeSlice` — all repointed by this build. Keeping dead fields invites drift.

### 3. `ownerOf` resolution order

**Q:** How is ownership resolved for an arbitrary path? **A:** A total fallback chain:
1. **Explicit parcel title** — longest-prefix over parcel `extents` (the coverage index).
2. **Self-home identity** — a path under `/home/<key>/` → that player (the implicit
   default parcel, no row), mirroring the shipped `DocumentLogic` base case.
3. **Provenance author** — `ProvenanceApi.authorOf` (earliest `AuthoringEvent`).
4. **`'core'` root** — the universe-root default.

**Why:** un-fuses owner from author (title overrides, author is the default), and the
self-home case reuses (does not fork) the existing document-store ownership base case.

### 4. The registry ships claims-and-grants; 0a resolves `owner` only

**Q:** Build grants now? **A:** The `parcels` row shape includes `owner` **and** a
`grants[]` field, but 0a only *populates and resolves `owner`* (title). `useRightOf`
and lease mechanics are 0b. **Why:** the shape is the seam (so 0b is additive, no
migration); the behavior is the next slice.

### 5. Verbs = `subdivide` + `transfer` (title-only, bilateral consent)

**Q:** Which verbs, and does `sell` land here? **A:** Two verbs in 0a:
- **`subdivide`** — mints a sub-parcel: create a zone (`FolderZone`/spatial) at a
  fresh path, write a parcel record (`owner`, `parentParcel`, `extents`), wire the
  boundary exit. Gated to the parent-parcel owner (or the frontier/self-home policy).
- **`transfer`** — move a parcel title to another principal; **bilateral consent**
  (receiver must accept, because the title carries liability); gated to the current
  owner.

`sell` (payment-coupled) is **deferred** — it pulls in banking + Contract atomicity,
which must not gate the title primitive. **Why:** keep 0a free of the economy.

### 6. Parcel hierarchy via a coverage index

**Q:** How is the hierarchy resolved? **A:** `parentParcel` on the row + a
**coverage index** over parcel `extents` using the `AddressRegistry`
`PathTrie.longestPrefix` precedent. Resolution of "which parcel governs this path" =
nearest parcel-bearing ancestor. **Why:** reuse the shipped addressing-resolution
pattern; no new mechanism.

### 7. Lounge migration is a re-seed, not a data sweep

**Q:** What migration is needed? **A:** Update `seedLoungeSlice` to write parcel rows
for `/domain/lounge` + `/lib/lounge` (owner = the `'lounge'` group), idempotently.
Per-player gating was never implemented, so **the lounge is the only stamped zone** —
no world-wide data migration. **Why:** minimal, idempotent, and the only pre-existing
ownership stamp.

### 8. Compute allowance is out of scope

**Q:** Any allowance in 0a? **A:** The `allowance` field may exist on the row as an
**inert seam** only; no metering, budgeting, attribution, or degradation. **Why:** 0a
is title-only; the compute economy is Phase 1 and needs its own design pass.

## Constraints

- **No new module categories.** `ParcelRegistry` (singleton `Stuff`), `ParcelApi`
  (thin gated forwarding shell ending in `SecurityApi.decorateApiClass`), `ParcelLogic`
  (`@internal` logic singleton at `/obj/api/parcel`, methods gated
  `FromModule('/api/parcel#ParcelApi')`), and verbs as ordinary YAML+controller pairs.
  See [architecture.md](../architecture.md) and the Module Categories table in CLAUDE.md.
- **Gated Apis derive the acting principal from execution context**
  (`ExecutionContextApi.getActingAuthor`), **never** as a parameter — the actor is
  spoofable if passed. Applies to `subdivide`/`transfer` and any title mutation.
- **Ownership is a relation, not a capability** → it lives in the `parcels` registry,
  **never** a `Possessable`/`Ownable` mixin (the capability-vs-relation guardrail, §I).
- **Ownership lives on the title/claim, never on the instance** (the Warren lesson, §K)
  — resolution keys on the path/registry, not on a live Stuff.
- **`AccessApi` stays the only legitimate caller of `AccessRegistry`**; `ParcelApi` is
  the only legitimate caller of `ParcelRegistry` (narrow-entry, `@CallSecurity` gates).
- **The self-home base case mirrors `DocumentLogic`** — generalize/share the existing
  `/home/<self>/` ownership rule, do not fork a parallel one.
- **Zone field removal must preserve** the folder/leaf invariant, `Zone.lookupField`
  inheritance for the *remaining* fields (celestial/biome defaults), and the
  `PersistentHydrator` round-trip.
- **`lint:gates` must pass** — every `FromModule`/`FromTemplate` string resolves.
- **Backing-class path mirrors template path** for the singleton (`obj/ParcelRegistry.ts`
  → `/obj/ParcelRegistry`); the `*Logic` exception applies (`obj/api/ParcelLogic.ts`
  registers at `/obj/api/parcel`).

## Acceptance criteria

- **Registry + Api exist:** `parcels` collection; `ParcelRegistry` singleton;
  `ParcelApi`/`ParcelLogic` with `lint:gates` green.
- **`ownerOf(path)` is total** and resolves via the four-step chain (title →
  self-home → author → core); unit tests cover each rung, including the self-home
  no-row case and title-overrides-author.
- **Parcel hierarchy:** a nested sub-parcel resolves to the closest parcel-bearing
  ancestor (longest-prefix); tests cover carve-out and inheritance.
- **`subdivide`** mints a zone + parcel row + wires the boundary + sets `parentParcel`;
  refuses a non-owner of the parent; tested.
- **`transfer`** moves a title with bilateral consent; refuses a non-owner giver and an
  unconsenting receiver; tested.
- **`AccessApi.can` repointed:** reads the `parcels` registry; the three
  `AccessRegistry` read-sites (`can` walk, `canMutateZone`, `ensureAuthorGroups`) and
  the writer (`seedLoungeSlice`) no longer read/write `Zone` ownership fields;
  `Zone.ownerGroup`/`accessGroups` + their `persistentFields` entry are gone.
- **Lounge regression:** `AccessApi.can` / `canMutateZone` decisions over `/domain/lounge`
  + `/lib/lounge` are unchanged after migration (a regression test asserts identical
  authorize/deny outcomes for representative callers); `seedLoungeSlice` is idempotent.
- **Self-home:** `ownerOf('/home/<player>/…')` = that player with **no** `parcels` row.
- **Seam fields present-but-inert:** `grants[]` and `allowance` exist on the row shape;
  no 0a code path populates or reads them for behavior.
- **Regression:** the existing `access` and `zone` test suites remain green.
- **Subsystem doc:** a parcel/title subsystem doc exists (e.g. `docs/subsystems/parcel.md`)
  covering the registry, the resolution chain, the hierarchy, the `Zone` field removal,
  and the `subdivide`/`transfer` surface (written at finalize).

## Cross-references

- **Seeding slate:** [property-slate.md](../slates/builds/property-slate.md) — §A
  (parcel = a Zone; the hierarchy), §B (separate collection; author≠owner), §K (dorm =
  implicit default parcel; claims-and-grants shape), and the "Phase re-slice & readiness"
  section (0a scope + the blast-radius risk).
- **Subsystem docs:** [zone.md](../subsystems/zone.md) (FolderZone, `lookupField`,
  `ownerGroup` today) · [access.md](../subsystems/access.md) (`AccessApi.can`,
  `canMutateZone`, the slice-walk) · [address.md](../subsystems/address.md)
  (`AddressRegistry` + `PathTrie.longestPrefix` coverage-index precedent) ·
  [provenance.md](../subsystems/provenance.md) (`authoring_events`, `authorOf` — the
  author-default fallback) · [document-store.md](../subsystems/document-store.md)
  (the `/home/<self>/` self-home ownership base case to generalize) ·
  [governance.md](../subsystems/governance.md) (`office_holders` sparse-default-store
  precedent for the implicit default parcel).
- **Downstream consumers:** the `dorm-warren` slate (0a unblocks its gating; its
  first proof case) · property 0b (chattel & persistence; lease mechanics) · Phase 1
  (compute economy).
