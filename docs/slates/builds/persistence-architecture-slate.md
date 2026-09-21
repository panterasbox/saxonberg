# Persistence architecture rethink slate (working doc)

> **Status: PARTIAL** — Waves 1-2 and Wave 4 shipped (`Document` vs
> `Stuff`, the neutral core, `Persistable` deleted; the schema docs) →
> [persistence.md](../../subsystems/persistence.md)
> **Left:** Wave 3 — un-Stuff `PersistentHydrator`, the marshallers and
> `platform/idea/hooks/` (`DomainHook` + `hooks.yaml`) into path-resolved,
> lazy, re-resolved modules on the shipped brain pattern (verified
> unstarted 2026-08-08: `PersistentHydrator` still `extends Idea`) · Wave
> 4's tail — per-field prose on `fieldMeta`, Mongo-side JSON Schema
> validators (see Wave 4 below)
> **Size:** a build (Wave 3) · a tail (Wave 4's tail)

Working slate for the **persistence architecture** — a deliberate rethink
prompted by realizing that *most* of what a platform persists (auth records,
dialogue trees, loot tables, quest defs, lesson content, analytics/event logs,
leaderboards, chat history, audit trails, mail, achievements) is **plain
document data with no game-entity behavior**, while the genuine game-world
entities (rooms, items, NPCs, avatars) are the minority. Today's architecture
has that backwards. Three `Persistable` inhabitants is the cheap moment to fix
it — before dozens of document collections accrue.

The load-bearing decisions (1-4 shipped — `Document`/`Stuff` split,
`Document`'s zero Stuff overhead, the value-like/identity-like
distinction, the extracted neutral core — see
[persistence.md](../../subsystems/persistence.md), decision 5 is Wave 3
and still open):

5. **The one real Stuff-coupling (marshallers + hooks + Hydrator) is for HMR
   — and converges with the path-resolved "brain" model.** These are
   *stateless strategy objects* made Stuff only to ride the clone/HMR
   machinery. They want to become **path-resolved, lazy, re-resolved code
   modules** — the same pattern as NPC brains ([behavior.md](../../subsystems/behavior.md)
   — the pattern is now shipped and load-bearing; copy it, don't re-derive
   it). Highest-effort piece; defer and scope separately; it pulls the same
   direction as the discovery thread.

See also:

- [docs/subsystems/persistence.md](../../subsystems/persistence.md) — the
  **shipped** design this slate produced: the `Document`/`Stuff` two-track
  split, `PersistenceManager`, around-hooks, the marshaller framework, the
  scalar-default rule, the schema docs (Wave 4). The old `Persistable
  extends Idea` hybrid this slate replaced no longer exists in the tree.
- [docs/subsystems/templates.md](../../subsystems/templates.md) — the clone /
  hydrate pipeline; `Template` becomes a `Document` (it's data that clones
  into Stuff). `snapshotToTemplate` / `restoreFromTemplate` persist-back.
- [docs/subsystems/state-model.md](../../subsystems/state-model.md) — Avatar
  self-contained persist-back; Avatar = Stuff whose `Document` is its
  per-entity Template.
- [docs/slates/npc-behavior-slate.md](../builds/npc-behavior-slate.md) — a consumer:
  shared dialogue trees are `Document`s in their own collection (not `domain`,
  not inline). The marshaller/hook → path-resolved-module convergence is the
  same model as this slate's brains.
- [docs/slates/access-slate.md](../tails/access-slate.md) — document access control
  binds at the **Api / collection / lease layer** (the access slate's
  "bind at the core, not per-object"), so `Document` losing the per-object
  shadow gate loses nothing — it moves to where it belonged.

---

## Principle, the model, and the reassignments — SHIPPED

`Document` vs `Stuff` (the two-track table), the five principles, the
`User`/`GoogleProfile`/`Template` → `Document` reassignments, and the
audit that grounded the blast radius are all built and stated in
[persistence.md](../../subsystems/persistence.md) (the opening two
tracks, § Why is `Document` NOT a Stuff). Code-verified: `User extends
Document` (`lib/identity/User.ts`), `GoogleProfile extends Document`
(`lib/identity/GoogleProfile.ts`), `Template extends Document`
(`lib/stuff/Template.ts`), and no `class Persistable extends Idea`
remains in the tree (only the unrelated, later `PersistableMixin`
self-persistence spine — see persistence.md's own § below).

### Blast radius

| Change | Effort | Note |
|---|---|---|
| Delete `Persistable` | **low–medium** | 3 subclasses, none Stuff-reliant; CRUD surface lifts onto `Document` almost verbatim. Touch points: `Application.ts` (`StuffApi.create(() => new User())` → `new User()`), drop the `delete`→`StuffApi.destruct` cascade, `Template._materialize`'s `StuffApi.create` → `new`. Update substrate-flavored tests. |
| Extract the neutral core | **low–medium** | The static prototype-walks move as-is; the one seam to thread is marshaller resolution (`StuffApi.findByTemplatePath`/`singleton`), injected since marshallers stay Stuff (until un-Stuffed). |
| Convert `Template` → `Document` | **low** | Pure data carrier; removes the registry-accumulation leak. The clone *target* stays Stuff. |
| Un-Stuff marshallers / hooks | **medium–high** | The only place Stuff-ness is load-bearing (HMR, not game semantics). Becomes the path-resolved-module pattern. **Defer / scope separately** — the other three proceed without touching it. |

---

## Open questions — all six resolved by the shipped build

Q1 (marshaller-resolution seam) → the injected resolver
(`setDocumentMarshallerResolver`, persistence.md § Marshaller Framework
§ Resolution). Q2 (does the CMS pipeline serve a non-domain `Document`
collection) → yes: the document-store tree (`StoredDocument extends
Document`, [document-store.md](../../subsystems/document-store.md),
[cms.md](../../subsystems/cms.md)'s unified three-backend tree). Q3 (defer or bundle
the un-Stuffing) → deferred, as Wave 3 below. Q4 (naming) → `Document`,
shipped. Q5 (access control surface) → the Api/collection/lease layer,
confirmed (persistence.md § Why is `Document` NOT a Stuff). Q6
(`stuffId`-equivalent) → no; `Document` carries no such field.

---

## Build order

Waves 1 and 2 (the neutral core + `Document`; reassign + delete
`Persistable`) shipped — see persistence.md.

**Wave 3 (separate, deferred) — un-Stuff marshallers / hooks / Hydrator.**
Re-home them as **path-resolved, lazy, re-resolved code modules** (the brain
pattern), replacing the clone-from-template + `singleton`/`findByTemplatePath`
HMR scheme. Scope and justify on its own; not a prerequisite for Waves 1–2.

---

## What this slate does NOT cover

- **The clone/hydrate pipeline internals** → [templates.md](../../subsystems/templates.md);
  the *target* of a clone stays Stuff and is unaffected. Only the Template
  *descriptor* un-Stuffs.
- **The path-resolved-module mechanism** (marker/discovery/HMR) →
  [npc-behavior-slate.md](../builds/npc-behavior-slate.md) + the registry-aversion
  principle; Wave 3 reuses it, doesn't redefine it.
- **Document access control / leases** → [access-slate.md](../tails/access-slate.md);
  consumed (bind at the Api/collection layer), not redefined.
- **MongoDB schema / indexing** — `createIndexes` is orthogonal to Stuff-ness;
  no change needed beyond per-collection indexes for new Document kinds.

---

## Wave 4 (proposed 2026-08-31) — the schema as loaded content

✅ **BUILT — the schema-docs build, 2026-08-31** (`design/schema-docs`).
The want (externalize the DB schema into YAML, generate the vocabulary,
project it into help), the two settled questions (`Collections` stays a
generated-not-parsed vocabulary because it's used in type position; the
field list is harvested from `fieldMeta`, never restated), and what
shipped (one authored YAML per collection, `pnpm lint:schema`, the third
help projector) are all in
[persistence.md § Collections, and the schema docs that describe
them](../../subsystems/persistence.md). Code-verified: `packages/server/src/schema/*.yaml`
(48 docs), `scripts/gen-schema.ts`, `pnpm -C packages/server lint:schema`.
Two tail items were deliberately left open — below.

### The tail Wave 4 left

Two attach points, deliberately not built and not stubbed. Both are
recorded in [persistence.md § What a schema doc does NOT
carry](../../subsystems/persistence.md); they live here because they are
design space, not documentation.

- **Per-field prose.** The schema doc carries no field list — the help
  projector harvests it from `fieldMeta`, so the fields cannot drift.
  The cost is that *what does `circleScope` mean on this collection*
  has nowhere to live. `FieldMetaEntry` gaining a `description` is the
  obvious next move, and the projector would render it with **no
  schema-doc change and no projector change** — the attach point is
  already the right shape. The open question is scope: `fieldMeta` is
  declared on ~200 classes, so "add a description" is a sweep, and the
  interesting half is deciding which fields deserve one rather than how
  to store it.

- **Mongo-side JSON Schema validators.** The schema docs *describe*;
  they do not enforce document shape at write time. Deriving a Mongo
  `$jsonSchema` validator from `fieldMeta` is mechanically close and
  strategically not: a validator rejects existing rows, which is the
  one place this repo's "no migrations, drop the DB" rule stops being
  free. It wants its own conversation.
