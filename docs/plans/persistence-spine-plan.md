# Persistence spine — implementation plan

Universal self-persistence substrate for `packages/server/src/mud/`.
Generalizes the Avatar-only `snapshotToTemplate` mechanism into one
per-mixin-composed capture/restore model shared by avatars, rooms, and
vessels, routed through call-security as the owning principal and
reconstituting items through the gated clone path. Executes the closed
requirements at [persistence-spine-requirements.md](../requirements/persistence-spine-requirements.md).

## Build status (2026-07-11)

**Landed (phases 1–6 + tests + docs):** the universal substrate is built,
green, and regression-free.

- `PersistedRecord` + `holder_snapshots` collection + slice vocabulary.
- `PersistableMixin`, `MixinApi.getPersistenceContributors` / `isPersistable`,
  the gated `PersistableApi` / `PersistableLogic` (capture / materialize /
  hasRecord / deleteAllFor) with the principal-frame allowlist entry, the
  drift guard, gated `StuffApi.clone` reconstitution, and the `Container` /
  `Slotted` `captureSlice` hooks.
- The residency `canEvict` capture-then-permit-cull seam + the durable
  await-capture-before-destruct in `ResidencyLogic`.
- 16 acceptance tests
  (`lib/persistence/__tests__/persistence-spine.test.ts`) covering every AC
  **except** the Avatar gear round-trip; `persistence.md` extended.

**Deferred to a follow-up (phases 7–8), and a plan correction:**

- The **Avatar migration** (§6 below) is session-critical and needs one
  net-new substrate capability the generic path doesn't yet have —
  capturing a *host's own* placement (its container, with the `WarrenMember`
  recall reconciliation `snapshotToTemplate:380–392` does) into its own
  record and re-placing it on materialize — plus a **guest-skip** gate on
  `PersistableMixin` and a **self-owner** (`owner = scope`) derivation for a
  `HasInteractive` host. It wants live login/logout/autosave validation.
- **Plan correction to §6 step 4 / phase 8:** the pair is **not** retired
  together. `restoreFromTemplate` is **not** Avatar-only — `CmsLogic` and
  `PackLogic` call it to re-hydrate live clones from an edited template
  (content go-live). Only **`snapshotToTemplate`** (the snapshot direction)
  is Avatar-only in production and can be retired, after the Avatar
  migration; `restoreFromTemplate` stays.

## 0. Grounding verified against current code

- Avatar persist-back: `obj/Avatar.ts:298` `save()` → `TemplateApi.snapshotToTemplate(this)` then `tpl.save()`; guest guard at `:302`; autosave timer `startAutoSave()` at `:613` (guest guard `:614`); `onDestruct()` fire-and-forget save at `:694`. `restore()` at `:317` → `TemplateApi.restoreFromTemplate`.
- The general substrate being retired: `obj/api/TemplateLogic.ts:318` `snapshotToTemplate` (sync field-snapshot at `:329-337`, marshaller resolution + save-delegation `startLocation`/`container` reconciliation at `:363-392`), `:400` `restoreFromTemplate` (delegates to `PersistentHydrator.hydrate`). This is the ONLY consumer of that pair; Avatar migrates off and the pair is deleted.
- Per-mixin field aggregation already exists: `MixinApi.getAllPersistentFields(ctor)` and `getAllFieldMarshallers(ctor)` (`api/mixin.ts:352`), walking the `_mixinName`-marked chain. The Persistable composition mirrors this exactly.
- Residency sweep: `obj/api/ResidencyLogic.ts:105` `runEvictionSweep`; asks `obj.canEvict({idleMs, reason})` on the proxy at `:131`; eviction is `StuffApi.destruct` at `:136`.
- The relational veto being changed: `lib/spatial/Container.ts:109` `canEvict` vetoes while `getContents().length > 0`; `Container.cleanupOnDestruct` at `:151` evacuates-or-destroys direct contents (fires most-derived-first in the destruct walk). `Containable.canEvict` at `lib/spatial/Containable.ts:159`.
- Gear that is lost today: `ContainerMixin.contents` (protected `Set`, `Container.ts:259`, not persisted) and `SlottedMixin.slots` (`Map<string,Set<Slottable>>`, `lib/slot/Slotted.ts:182`, explicitly `not persisted` per `:20`). Worn items are `Wearable`/`Slottable` Containables that sit in the avatar's Container contents AND occupy a body-plan slot (`lib/equipment/Garment.ts`, `Pack.ts`; a `Creature` is `ContainerMixin(...SlottedMixin(...))`, `lib/creature/Creature.ts:94-106`). So capturing Container contents captures the item; a Slotted slice records which slot it wears.
- Document nested-JSON storage: `Document.toDocument` copies a field with no marshaller as-is (`lib/persistence/Document.ts:172` `doc[field] = value`), so an opaque `state: Record<string,unknown>` round-trips through Mongo without a marshaller — exactly how `StoredDocument.data` works (`lib/document/StoredDocument.ts:46`).
- Owner-from-context precedent: `DocumentLogic` derives owner via `ExecutionContextApi.getActingAuthor()` (`obj/api/DocumentLogic.ts:30`), never a parameter.
- Clone/materialize primitives: `StuffApi.clone(templatePath, context)` (`api/stuff.ts:240`), `StuffApi.singleton`, `StuffApi.destruct` (`:742`). Seeding: `PopulatesMixin.applyPopulates(specs)` async Phase-2 (`lib/stuff/Populates.ts:93`).
- "Run as principal" mechanism: the call stack is ALS-backed (`api/execution-context.ts`). `FrameKind.Command` (`:70`) frames carry the giver as `target`; `getActingAuthor()` (`:341`) returns the single consistent command giver; `AccessApi.can(giver, …)` and the clone/code-trust gates resolve authority against it. Frame planting is allowlist-gated (`:141`): `/mud/api/` is allowed, `/mud/obj/api/` is NOT — a logic singleton that plants frames needs a narrow reviewed allowlist entry (the pattern already used for `EventSubscriptions`/`SchedulerRegistry` at `:153`).

## 1. Module structure (taxonomy — no new categories)

Everything lands in the existing `lib/persistence/` subsystem plus the standard Api/logic pair and one collection. Nothing here requires a new Module Category (CLAUDE.md §Module Categories); no free-floating helpers.

| File | Category | Purpose |
|---|---|---|
| `lib/persistence/Persistable.ts` | **Mixin** | `export function PersistableMixin`, marker `_mixinName = 'PersistableMixin'`. The host capability: marks a Stuff as a persistence **host** (singleton, keyed by `templatePath`), owns the `canEvict` capture-then-permit posture and the capture-on-destruct hook, and carries the per-mixin capture/restore *default*. |
| `lib/persistence/PersistedRecord.ts` | **Stuff class (Document)** | `class PersistedRecord extends Document`, `collectionName = 'holder_snapshots'`, `persistentFields = ['scope','owner','state']`. The `{scope, owner, state}` envelope. Static finders `findByScope(scope)`, `findByOwner(owner)`, `deleteByOwner(owner)`. |
| `lib/persistence/PersistenceSlice.ts` | **Named value-object / types** | The slice type vocabulary (`MixinSlice`, `ContentEntry`, `Placement`, `CaptureSnapshot`) — the one concept this module defines. Kills the `types.ts` reflex. |
| `api/persistable.ts` | **Api** | `PersistableApi` — thin gated forwarding shell; `capture` / `materialize` / `hasRecord` / `deleteAllFor`. Ends with `SecurityApi.decorateApiClass(PersistableApi)`. Lives in `/mud/api/` so it is already frame-mutator-allowlisted. |
| `obj/api/PersistableLogic.ts` | **Api logic singleton** | `@internal class PersistableLogic extends ApiLogic`; registers at `/obj/api/persistable`; methods gated `FromModule('/api/persistable#PersistableApi')`. Owns the real capture/restore/compose/store logic + the per-mixin composition walk. `ApiLogic` makes it residency-exempt. |

**Per-mixin hook contract** (the surface a contributing mixin declares — mirrors `getAllPersistentFields`): a mixin *may* declare

```ts
static captureSlice?(host: Stuff): MixinSlice;              // sync read through the host's own getters
static restoreSlice?(host: Stuff, slice: MixinSlice): Promise<void>;   // writes through gated mutators
```

The framework walk (`PersistableLogic.composeCapture` / `composeRestore`) enumerates the `_mixinName`-marked chain via a new `MixinApi.getPersistenceContributors(ctor)` (sibling of `getAllPersistentFields`, `api/mixin.ts`). For any mixin that declares **no** `captureSlice`, the default is "serialize your declared `persistentFields` (via `getAllFieldMarshallers`)" — reusing the exact machinery in `TemplateLogic.snapshotToTemplate:329-379`. `ContainerMixin` and `SlottedMixin` override with custom slices (below). This keeps the override a per-mixin hook, not a new field-declaration mechanism (requirements §Constraints).

**Flag for sign-off:** the only taxonomy-adjacent decisions are (a) the **Api name** — I propose `PersistableApi`/`PersistableLogic`; it must not be confused with the existing `PersistApi` (`api/persist.ts`, the raw PM facade). Alternatives: `SnapshotApi`, `HolderApi`. (b) a **narrow frame-mutator allowlist entry** for `PersistableLogic` (see §3). Both are called out explicitly for the user; nothing else risks a new module category.

## 2. The record + per-mixin composition

### Envelope (`PersistedRecord`)

```
PersistedRecord extends Document {
  scope:  string                       // the singleton host's templatePath — identity + base to clone
  owner:  string                       // whose content (a principal templatePath, or 'core') → cascade key
  state:  Record<string, MixinSlice>   // per-mixin; the owner's directly-held content + the host's own state
}
collectionName = 'holder_snapshots'
```

`state` is stored as opaque JSON (no marshaller — `Document.toDocument:172` copies it as-is, the `StoredDocument.data` precedent). The store and the cascade never inspect a mixin's internals; only `PersistableLogic` builds/consumes `state`.

### Slice types (`PersistenceSlice.ts`)

```ts
type MixinSlice = { fields: Record<string, unknown> }        // default: declared persistentFields, marshalled
              | ContainerSlice | SlottedSlice;

interface ContainerSlice { contents: ContentEntry[]; }
type ContentEntry =
  | { templatePath: string; state: Record<string, MixinSlice>; placement: Placement }  // non-host item, recurses
  | { ref: string; placement: Placement };                                             // nested host → reference

interface Placement {
  restingOn?: string;                    // Surfaced host, by content-tree position (path-of-indices) or templatePath
  slot?: { plan: string; slot: string }; // worn/equipped — see SlottedSlice
}
interface SlottedSlice { occupancy: Record<string /*slotKey*/, number[] /*content indices*/>; }
```

- **`ContainerMixin.captureSlice`** walks `getContents()` (`Container.ts:259`), emitting one `ContentEntry` per direct Containable. A non-host item nests `{templatePath, state, placement}`, recursing `composeCapture` through sub-containers; a **nested host** (`MixinApi.isPersistable(item)`) emits `{ref: item.getTemplatePath(), placement}` — not absorbed, because it persists itself. `restoreSlice` clones each entry via the gated path (§3) and re-places it.
- **`SlottedMixin.captureSlice`** reads `getAllOccupants()` (`Slotted.ts:207`) and records, per slot key, the **positions** (indices into the Container slice) of the worn items — no instance id. `restoreSlice` runs after the Container slice restores, resolves each index back to the freshly-cloned item, and re-wears it through the gated slot mutator (`SlotApi`/`Wearable`). This is the "custom capture (a Container's recursion; a shadow-holder's offload) lives where it belongs" acceptance case, and it fixes the gear-lost-on-logout gap.
- **Default slice** (every other mixin, e.g. `Graded`, `Propertied`, `Named`): declared `persistentFields` marshalled to stored form. This is the `Container + Graded + Propertied` per-mixin-composition AC.

No instance ids anywhere: a host is identified by `scope` (`templatePath`); content is distinguished by position in the tree (requirements §record shape). Declared-state capture, never a template diff (requirements §"Declared state, not a template diff") — restore clones the base (class + template defaults) and applies the captured declared state through each mixin's restore path.

## 3. The security path (the crux)

All capture/restore runs **through the call-security proxy as the owning principal**, never as raw hydration on the unwrapped target.

**Deriving the principal.** Never a parameter. For an **avatar** scope the principal is the host itself. For a **room/host** scope the principal is `record.owner` resolved to a live Stuff via `StuffApi.singleton(record.owner)`; `owner` is computed at capture from `ParcelApi.ownerOf(scope)` (`AccessApi`/parcel title, the `DocumentLogic.selfHomeOwnerOf` precedent, `access.md`/`parcel.md`) → principal `templatePath`, falling back to the host's own `templatePath` (self-owned fixtures) or a `'core'` sentinel. This is how **room-scope decomposes by owner without a possession field** (possession is deferred): each principal's property lives inside a **nested host it owns** (its avatar, its chest), captured as a reference under its own `owner`; loose room fixtures capture under the room's parcel owner. The by-owner decomposition rides host boundaries + parcel title, not a chattel field.

**Running as the principal.** `PersistableLogic` plants a `FrameKind.Command` frame whose `target` is the principal (a synthetic `CommandContext` via `CommandApi.createCommandContext` so `getActingAuthor()`/`getCurrentCommandGiver()` resolve to it), then performs capture-reads / restore-writes inside it. Every gated getter/mutator, every `StuffApi.clone`, and the code-trust lockdown (`access.md`) then see exactly the principal's live authority — an illegitimate mutation is rejected on restore exactly as it would be live. Frame planting requires a **narrow, reviewed frame-mutator allowlist entry** for `PersistableLogic` (`api/execution-context.ts:141`, the `SchedulerRegistry`/`EventSubscriptions` precedent at `:153`) — this is the single reviewed security touchpoint, called out for sign-off. (Alternative if the user prefers zero `obj/api` allowlist growth: plant the frame in the already-allowlisted `api/persistable.ts` shell and forward the body to the Logic. Slightly fatter shell; I lean to the allowlist entry as more honest.)

**Item reconstitution is gated.** Restore never raw-instantiates. Each `ContentEntry` is re-created via `StuffApi.clone(entry.templatePath, ctx)` under the principal frame; the record only names a `templatePath` + declared field slices, so it can never inject `class`/`hydratorClass`/`brain` (those come from the *template*, not the record) nor conjure a template the principal could not legitimately clone. `composeRestore` refuses any `state` key that is not a declared `persistentField` of the cloned class (a drift guard mirroring the code-trust lockdown), and applies each field through the mixin's gated setter (`PersistentHydrator`'s Phase-1 `set<Field>` shape, `persistence.md`), never bracket-writing the raw target.

**Engine-of-record, no player write path.** `holder_snapshots` is written only by `PersistableLogic` (via `PersistedRecord.save()`, `Document` being the sanctioned low-level boundary, `lint:pm`-allowlisted). There is **no verb, controller, or Api** that writes it; the record is reachable only through `PersistableApi`'s gated methods (methods-only inter-stuff contract). The forged/tampered-record AC is covered by (1)+(2): even a hand-written record restores only what the principal could legitimately clone and mutate.

**Atomic-per-scope restore.** `PersistableLogic.restore` stages the whole scope (clone tree + mutations) and commits placement only after the full tree reconstitutes without error; a mid-tree failure destructs the partial clones and leaves the prior record untouched (block partial-splice manipulation, requirements §Constraints). Capture snapshots synchronously before the first `await` (the `snapshotToTemplate:329` invariant) so concurrent triggers each write a valid full snapshot.

## 4. The eviction / materialize seam

**canEvict — capture-then-permit-cull.** `canEvict` is synchronous and cannot itself `await` a save, so capture rides the destruct choreography, not the veto. Two coordinated changes:

1. `ContainerMixin.canEvict` (`Container.ts:109`) gains a single capability check: `if (getContents().length > 0 && !MixinApi.isPersistable(this)) return {ok:false}; return super.canEvict(context)`. A persistable host with contents now falls through the contents-count veto (other layers — `HasInteractive` for a live Avatar, `WarrenMember` — still apply via `super`, so an in-session avatar never culls).
2. `PersistableMixin.cleanupOnDestruct(stuff)` runs **before** `Container.cleanupOnDestruct` (most-derived-first; `PersistableMixin` composed **outermost**). It synchronously snapshots the live content tree + declared state into a `CaptureSnapshot` (before Container evacuates/destroys, `Container.ts:151`), then fire-and-forgets the async `PersistableApi.capture`-persist tail — the exact `Avatar.onDestruct:694` pattern the codebase already sanctions. This makes eviction safe: the record is written, then contents cull.

Routine triggers (autosave, explicit logout, reload) call `PersistableApi.capture(host)` and **await** it fully; the destruct-time capture is the eviction backstop.

**Materialize.** `PersistableApi.materialize(host)` (called from a persistable host's `postRegister` after clone) loads every `PersistedRecord` with `scope = host.getTemplatePath()` (one per owner) and restores each as its owner (§3). Restoring a `ContentEntry` clones the item and re-places it; restoring a `{ref}` **follows the reference** — materialize the nested host by cloning `ref` and calling `materialize` on it (load *its* records) — reconstructing the tree by walking references (requirements §record shape).

**Seed-then-persist gate.** First materialization has no record → seed. `PersistableMixin` overrides `applyPopulates(specs)` (composed outside `PopulatesMixin`, `Populates.ts:93`): `if (await PersistableApi.hasRecord(this.getTemplatePath())) { /* skip seed */ await PersistableApi.materialize(this) } else { await super.applyPopulates(specs); await PersistableApi.capture(this) /* first record */ }`. Thereafter the record is authoritative and `populates` never re-runs (no seed duplication). A holder with no record and no Persistable re-seeds every materialization, exactly as today (regression-preserved).

**Universal "load my persistent contents" on location materialize.** For hosts, `materialize` is the postRegister hook above. For a **non-persistable** location it is a no-op (no records scoped to it) — correct: your carried things persist via your avatar (a host), your placed things via your home (a host). No change to plain-room behavior.

## 5. Host vs content + singleton identity

- **Hosts are singletons keyed by `templatePath`** (`scope`). An avatar, an authored home/room, a unique host chest. No per-instance ids, no instance registry.
- **Non-host content nests** in its host's record, distinguished by position in the content tree. Three identical content chests in a room are three `ContentEntry`s differentiated by position + their own captured per-instance state (name, contents) — the identical-clones-differentiate AC, no instance id.
- **A nested host is a reference** `{ref, placement}` — never absorbed; it persists itself, keyed to its own `templatePath`. Moving a host chest between hosts is a normal live move; each host persists whatever it currently holds, so the chest's record stays keyed to the chest (contents travel with it) and only the referencing parent's record changes — the two-hosts-compose AC.
- **Host boundary:** a host's record captures directly-held content down to the next host; recursion stops at a nested host (emit a ref).
- **Teardown policy for a host referencing nested hosts:** dropping/destroying a referrer **does not** delete referenced hosts' records — each nested host's record is keyed to its own `scope` and survives independently, re-materializing when its `templatePath` is next cloned. The destruct path never cascade-deletes referenced-host records (so it can't orphan one). The **only** record delete is the account-deletion cascade (§7). This is the simplest policy that satisfies "must not orphan a referenced host's record"; the alternative (cascade-destroy referenced hosts on teardown) is rejected for v1 because a singleton host is re-materializable and cascade risks deleting a shared host still referenced elsewhere.

## 6. Avatar migration (session-critical, staged)

Staged so login / logout / autosave never regress; the old path is removed only after the universal path is green for Avatar in this same build.

1. **Substrate first, no Avatar changes.** Land §1–§5 and prove round-trip on a generic Persistable test consumer. Avatar still uses `snapshotToTemplate`.
2. **Make Avatar Persistable.** Add `PersistableMixin` outermost on `AvatarBase` (`Avatar.ts:81`). Avatar's scope = its per-player `templatePath` (`/obj/Avatar/<playerId>`), owner = self. Its record's `state` carries: the default slices (declared fields across the Character chain — the same fields `snapshotToTemplate` captured), the **Container slice** (carried inventory — new), and the **Slotted slice** (worn/embodiment gear — new, the fix). The durable-location capture (`data.startLocation` Warren reconciliation vs `data.container`, `TemplateLogic.snapshotToTemplate:380-392`) moves into `PersistableLogic` as a `Containable` default-slice concern (or an explicit placement field on the avatar's own record) — preserve the Warren-member save-delegation behavior exactly.
3. **Rewire Avatar methods, keep guards.** `Avatar.save()` (`:298`) → `if (this.isGuest) return; await PersistableApi.capture(this);` (guest guard preserved — the single point that makes zero-guest-persistence hold across autosave/onDestruct/client-state, `:302`). `Avatar.restore()`/`enter()` (`:317`/`:351`) → `PersistableApi.materialize(this)` / restore. `startAutoSave` (`:613`) and `onDestruct` (`:694`) untouched in shape — they still call `save()`. Guests: `startAutoSave` keeps its `:614` isGuest early-return.
4. **Prove, then retire.** With login/logout/autosave + gear round-trip green, delete `TemplateLogic.snapshotToTemplate` (`:318`) and `restoreFromTemplate` (`:400`), their `TemplateApi` forwarders, and the CLAUDE.md/`persistence.md`/`templates.md` references. Confirm no remaining references (the AC: "removed and no longer referenced").

## 7. Consumers + tests

**Authored consumers** (test fixtures under the persistence subsystem's `__tests__`, plus one authored persistable room class):
- A **persistable room** — `PersistableMixin(Location + Container + Populates)` singleton with a `populates` seed loadout.
- A **generic content chest** — a `Container` `Thing` (NOT persistable) carrying per-instance state (`Named` + `Propertied`), nested in the room.
- A **host chest** — `PersistableMixin(Container Thing)`, a singleton with its own `templatePath`, to exercise the host-reference boundary.
- **Avatar** — fields + gear, via the migration.

**Tests (one per acceptance criterion):**
1. Round-trip: capture → store → evict → materialize → restore preserves declared state.
2. Per-mixin composition: a `Container + Graded + Propertied` object restores each slice independently; `Container` recursion + `Slotted` custom slice covered.
3. Avatar no-naked-login: logout then login restores fields **and** worn/carried gear; assert `snapshotToTemplate`/`restoreFromTemplate` are gone (grep-style reference check).
4. Room + nested content chest: contents (incl. nested) survive eviction and reassemble; the shell re-clones from template.
5. Identical content chests differentiate: two chests from one template restore distinct names/contents onto distinct clones, by position, no instance id.
6. Two hosts compose: room record holds a `{ref}` to the host chest; the chest's own record holds its contents; materialize reconstructs by following the ref; moving the chest re-keys only the referrer.
7. Room decomposes by owner: two principals' property in one room restore each as its own owner.
8. Security: a forged record cannot inject an un-clonable/un-placeable item, cannot set `class`/`hydratorClass`/`brain`, cannot bypass a gated setter; `holder_snapshots` has no player-reachable write path.
9. Eviction seam: a persistable holder-with-contents evicts (capture-then-cull); a non-persistable holder-with-contents still vetoes; an empty room still re-clones fresh (regression).
10. Seed-then-persist: a persistable holder seeds once, does not duplicate seed on subsequent materializations.
11. Account deletion: `PersistableApi.deleteAllFor(owner)` removes every `owner=<player>` record.
12. Non-persistable regression: existing residency/eviction behavior unchanged.

**Docs:** extend `docs/subsystems/persistence.md` (or add a sibling) with the self-persistence substrate, the per-mixin record, the security model, and the Avatar per-player-template retirement (sweep-phase, per workflow.md §5).

## 8. Phasing (ordered, reviewable commits)

1. `feat(persistence): PersistedRecord + holder_snapshots collection` — the Document class, `Collections.HolderSnapshots = 'holder_snapshots'` in `backend/PersistenceManager.ts` with `owner` + `scope` indices, finders. Isolated, testable alone.
2. `feat(persistence): Persistable mixin + per-mixin composition walk` — `PersistableMixin`, `PersistenceSlice` types, `MixinApi.getPersistenceContributors`, default slice = declared fields (reuse `snapshotToTemplate` field/marshaller logic). No security/eviction yet; unit-test compose in isolation.
3. `feat(persistence): PersistableApi/Logic capture+restore through call-security` — the gated pair, principal-frame planting, **the narrow frame-mutator allowlist entry** (the reviewed-risk commit — small, self-contained, easy to audit), gated `StuffApi.clone` reconstitution, atomic-per-scope restore. Security tests (#8) here.
4. `feat(persistence): Container + Slotted custom slices` — nesting, host-reference `{ref}`, worn-gear slice. Tests #2, #5, #6.
5. `feat(residency): persistable canEvict capture-then-permit-cull` — the `ContainerMixin.canEvict` capability check + `PersistableMixin.cleanupOnDestruct` capture-on-destruct + `materialize` postRegister hook + seed-then-persist `applyPopulates` override. Tests #4, #9, #10, #12 (the regression guard is load-bearing here).
6. `feat(persistence): account-deletion cascade` — `deleteAllFor` + test #11.
7. `refactor(avatar): migrate Avatar onto the persistence spine` — §6 steps 2–3 (gear now persists), keeping `snapshotToTemplate` alive. Tests #3 (gear round-trip) green.
8. `refactor(persistence): retire snapshotToTemplate/restoreFromTemplate` — §6 step 4 deletion + reference sweep. The risky Avatar cut is isolated in its own commit, after the universal path is proven, so it is trivially revertable.
9. `docs(persistence): document the self-persistence substrate` — sweep-phase.

The two risky pieces are de-risked by isolation: the **call-security routing** is a single small commit (3) with the allowlist entry auditable on its own; the **Avatar migration** is split into "add new path" (7) and "delete old path" (8), so login/logout/autosave are validated on the new path before the old one is removed.

## Resolved decisions (user-approved 2026-07-11)

1. **Api name — RESOLVED: `PersistableApi`/`PersistableLogic`.** (Not `SnapshotApi`/`HolderApi`; kept distinct from the existing `PersistApi`.)
2. **Frame-planting home — RESOLVED: the narrow reviewed frame-mutator allowlist entry for `PersistableLogic`** in `execution-context.ts` (the `SchedulerRegistry`/`EventSubscriptions` precedent). Not the shell-planting alternative.
3. **Restore-principal — RESOLVED: the planner's host-reference reading.** Self-owned + `'core'`-owned scopes restore under the host/system principal; player-owned nested content is a **host reference** that materializes with that player's own host, so an offline player's avatar is never force-materialized to restore room content. This is the v1 semantics of "restored as that principal."

## Pre-build review notes (2026-07-11 — address during build)

Surfaced in a final review before implementation. (1)–(2) are
correctness/security requirements the build MUST satisfy; (3)–(5) are
guidance + honest limits.

1. **Durable eviction — await the capture in the residency sweep; do not
   rely on fire-and-forget.** `cleanupOnDestruct`'s fire-and-forget persist
   (the `Avatar.onDestruct` pattern) is safe for Avatar only because
   autosave (every 5 min) is a backstop — but **rooms/chests have no
   autosave**, so a dropped eviction write is silent, un-backstopped data
   loss. `ResidencyLogic.runEvictionSweep` is already async, so it should
   **`await PersistableApi.capture(host)` before `StuffApi.destruct`** for a
   persistable host. Keep the sync `cleanupOnDestruct` snapshot as a
   backstop for non-sweep destructs. Net: eviction/logout/reload are
   durable; only a hard crash mid-session (before any capture) loses
   since-last-capture changes — accepted, since crash-durability is outside
   the requirements' "eviction / logout / reload" scope and there is no
   per-mutation capture in v1.

2. **Restore must NOT reuse the Hydrator's bracket-assign fallback for
   setterless fields — that bypasses call-security.** The security model is
   "restore writes through gated mutators as the principal." A persistent
   field with no `set<Field>` method, restored via the Hydrator's Phase-2
   bracket-assign fallback, would write the raw target and skip the gate —
   reintroducing exactly the hydration bypass this build closes. Policy:
   **player-content fields must restore through a gated setter (no setter →
   not restorable as player content); bracket-assign is permitted only for a
   host's own trusted state under the host/system principal.** The drift
   guard must enforce this, not only the `class`/`hydratorClass`/`brain`
   fields.

3. **"Room decomposes by owner" (AC #7) is real only via per-owner nested
   hosts, not loose items.** Without the deferred possession field, a loose
   item dropped in a room has no owner signal, so it captures under the
   **room's parcel owner** — correct for a single-owner room, wrong for a
   genuinely shared room. Structure test #7 with each principal owning a
   **nested host** (their chest/avatar) whose reference decomposes cleanly;
   do **not** try to satisfy #7 with two principals dropping *loose* items
   in one room. Genuinely-loose per-owner property in a shared room awaits
   possession (0b).

4. **v1 payoff scope — set expectations.** The concrete player-facing win is
   **no-naked-login** (gear + inventory persist across logout) plus
   **authored-room persistence**. Players cannot create persistent *host*
   containers at runtime — a host needs a singleton `templatePath` (an
   authored template); a runtime-minted generic chest is *content*, not a
   host. "Your home remembers your stuff" needs **tenure** to give players
   their own host homes (deferred). v1 proves the mechanism end-to-end; the
   home payoff lands with tenure.

5. **Build landmines to watch:**
   - **Marshaller round-trip.** The opaque `state` JSON stores *marshalled*
     field forms; restore must *un-marshal* before applying through the
     setter. Add a test that round-trips a rich marshalled field (a
     `Quantity`) and asserts identity — this is where structured values
     silently corrupt.
   - **Single materialize.** Fire materialize exactly once per host —
     reconcile the `applyPopulates` seed-then-persist branch with the
     `postRegister` hook so a host does not double-load.
   - **Known residency flake.** The full-suite LoungeWarren bud-reap timer
     race is a known non-deterministic flake, NOT a regression from this
     build — re-run isolated; don't chase it.

## Cross-references

- Requirements: [persistence-spine-requirements.md](../requirements/persistence-spine-requirements.md)
- Subsystem docs: [residency.md](../subsystems/residency.md), [persistence.md](../subsystems/persistence.md), [document-store.md](../subsystems/document-store.md), [call-security.md](../subsystems/call-security.md), [access.md](../subsystems/access.md), [templates.md](../subsystems/templates.md)
