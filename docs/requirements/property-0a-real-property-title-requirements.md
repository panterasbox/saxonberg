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
- **Author ≠ owner (fully un-fused).** Ownership is a transferable **title** distinct
  from the immutable `authoring_events` ledger. **Default title is publicly held (the
  state — `'core'` in 0a); the author is NOT the default owner** — authoring confers
  *credit*, never *title*. No data migration (untitled content → state = today's
  core-decided behavior).
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

### 2. The Zone ownership fields are removed (corrected post-Terminus)

**Q:** Deprecate-in-place or remove? **A:** Remove them. **Corrected against current
code:** the Terminus merge (`ec5e5353`) changed the field set and the writer, so the
removal is larger than first budgeted. Delete **three** fields — `ownerGroup`,
`accessGroups`, **and `ownerGroupName`** — the getters/setters, `validateGroupRef`, and
the **three-entry** `Zone.persistentFields`. Also retire the now-data-driven writer +
resolver machinery in `AccessRegistry`: `effectiveOwnerRef`, `resolveOwnerGroupName`,
`cachedOwnerNameRefs`, and the `ensureAuthorGroups` template-`data` scan. **There is no
`seedLoungeSlice`** — the per-area boot hooks were deleted; ownership is currently
data-driven from a `data.ownerGroupName` seed field + lazy mint-or-find, all of which
this build replaces. **Why:** keeping dead fields (or a live ownership source inside
`domain`) invites drift and — per the security constraint below — is exactly the
spoof vector 0a exists to close.

### 3. `ownerOf` resolution — title / self-home / **state** (default = publicly held; author is NOT the default)

**Q:** How is ownership resolved for an arbitrary path, and what's the *default*?
**A (governance decision):** a total **three-rung** chain:
1. **Explicit parcel title** — longest-prefix over parcel `extents` (the coverage index).
2. **Self-home identity** — a path under `/home/<key>/` → that player (the implicit
   default parcel, no row), mirroring the shipped `DocumentLogic` base case.
3. **The state (public default)** — everything else is **publicly held**: `{kind:'group',
   name:'core'}` (the `'core'` universe-root group is the state placeholder in 0a; a
   dedicated state/treasury principal is a governance-build refinement).

**The author rung is removed.** Authoring gives **credit** (the immutable
`authoring_events` provenance ledger, for attribution / producer-influence), **never
title.** You own only what you hold title to; untitled content is the state's. This is
the *full* un-fusing of owner from author (correcting the earlier "owner defaults to
author" — the state is the default, not the author). It's also **migration-free and
byte-identical**: untitled content → state (`core`) = today's core-decided behavior.

**Access vs. title.** `ownerOf` answers *title* (who owns). **Access** (`can`) dispatches
on the title owner: **explicit title / self-home → the holder** (group membership, or
player identity match); **state-owned → the state's governance**, which in 0a is the
existing `core`/wizard gate — a seam the future **PM/legislature-doled-access** model
refines (the PM is the superuser who doles out access from that position). So `can` uses
the **same three-rung chain — no author rung** — and there is no authored-content access
change (this closes plan risk R2a).

**Owners are *typed principals*.** `ownerOf` returns a discriminated `ParcelOwner` —
`{kind:'group', …}` or `{kind:'player', templatePath}`; `AccessApi.can`/`canMutateZone`
dispatch on the kind (group → `GroupApi` membership/`'owner'`-role; player → identity
match). Group owners preserve today's exact membership semantics.

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

### 7. Seeded ownership = explicit `parcels` seed rows; migration covers lounge + Terminus (corrected)

**Q:** Where does seeded (infrastructure) ownership live, and what migrates?
**A (two corrections against current code):**

- **Ownership is declared as explicit `parcels` seed rows — never on the zone seed, never
  in `domain`.** `ownerGroupName` is removed from the zone seeds entirely (not kept as an
  authoring surface). This is the **secure** choice and the only one forward-compatible
  with the content-pack/mod future: when content becomes untrusted (anyone authors a
  pack), ownership declared *inside* content is a supply-chain spoof — so ownership must
  be assigned through a gated channel (platform `parcels` seeds + the gated `ParcelApi`),
  which content/packs cannot forge. (Chosen over harvesting `ownerGroupName` from the zone
  seed, which would keep an access-control source inside the editable `domain` collection.)
- **The lounge is NOT the only stamped zone.** Migration covers **lounge** (`/lib/lounge`
  + `/domain/lounge`, group `lounge`) **AND the Terminus terminal** (`/domain/terminus/terminal`,
  group `terminus`, a **spatial `CartesianZone`** — the first spatial-zone ownership, which
  validates the "parcel = FolderZone *or* spatial zone" model). `crossroads` (newbie-wilds)
  is intentionally unowned. `accessGroups` is used by zero seeds (see the Constraints note).
  Seeding is idempotent (upsert-iff-absent keyed on `extent`); no world-wide data sweep.

**Why:** seeding is transitional (it will be replaced by content packs), so the small
"a parcel seed row per owned area" cost is temporary — and it's the shape that carries
over unchanged to the pack world.

### 8. Compute allowance is out of scope

**Q:** Any allowance in 0a? **A:** The `allowance` field may exist on the row as an
**inert seam** only; no metering, budgeting, attribution, or degradation. **Why:** 0a
is title-only; the compute economy is Phase 1 and needs its own design pass.

## Constraints

- **THE GOVERNING INVARIANT — access-check data lives only in a collection that
  content-authoring cannot reach.** Anything relied on for an access decision must be
  **unspoofable and un-manipulable by content edits**. Ownership is therefore **never
  declared *in* content** — not on a zone seed, not in a content pack — and is written
  **only** by the gated `ParcelApi` (subdivide/transfer) + gated platform `parcels` seeds.
  This is the *reason* 0a exists (move ownership out of the editable `domain` collection),
  and it must survive the content-pack/mod future, where content is untrusted by
  construction and ownership-in-content would be a supply-chain spoof.
- **`accessGroups` (the flat-union multi-group ACL) is consciously dropped, not lost.**
  No seed uses it, so removal is byte-identical today; the multi-group / secondary-access
  capability is restored later by 0b's `grants[]` seam. This is a deliberate deletion to
  be re-provided, not an accident.
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
- **Chain-of-title (append-only, never overwrite):** `transfer` and `subdivide` append a
  title event to an append-only `parcel_events` log (the `bank_ledger`/`renown_events`
  pattern); the current `owner` is the rebuildable state. A test asserts a transferred
  parcel's prior owner is still recoverable from the log — so ownership *lineage* is
  preserved (the real-estate-metagame provenance seam, slate §L). Rebuild-from-log +
  the lineage readout are deferred consumers; 0a only writes the trail.
- **`AccessApi.can` repointed:** reads the `parcels` registry; the `AccessRegistry`
  read-sites (`can`, `canMutateZone`, `ensureAuthorGroups`) consult `ParcelApi`; the
  data-driven writer/resolver machinery (`effectiveOwnerRef`, `resolveOwnerGroupName`,
  `cachedOwnerNameRefs`, the `ensureAuthorGroups` template-`data` scan) is retired; all
  **three** `Zone` ownership fields (`ownerGroup`, `accessGroups`, `ownerGroupName`) +
  their `persistentFields` entries + `validateGroupRef` are gone; no seed carries
  `ownerGroupName`.
- **Lounge + Terminus regression (load-bearing):** `AccessApi.can` / `canMutateZone`
  decisions over `/domain/lounge` + `/lib/lounge` (group `lounge`) **and
  `/domain/terminus/terminal` (group `terminus`, a `CartesianZone`)** are byte-identical
  after migration — a regression test asserts identical authorize/deny outcomes for
  representative callers (member / non-member / `'owner'`-vs-`'member'`-role / null-NPC
  subject) against the pre-migration path; parcel seeding is idempotent (two `postRegister`
  runs → one row per owned zone). A one-time audit of the **deployed** `domain` collection
  for stray `data.accessGroups` / nested differing `ownerGroup` gates the "byte-identical"
  claim (Risk R1 in the plan).
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
