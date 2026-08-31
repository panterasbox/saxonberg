# Schema docs — requirements

The persistence layer is **undocumented where it matters and unlinked
everywhere**. A collection's name, its sandbox policy, its reset
disposition and its indexes live in four different TypeScript files;
what the collection is *for* lives almost nowhere; and there is no path
from a collection to the `Document` class that writes it or the
subsystem doc that owns it.

This build gives every collection **one authored YAML doc in the repo**,
makes the four tables **derive from it**, binds collection ↔ class ↔
subsystem doc with a **build gate**, and **projects the whole thing into
the help system** so a player can read how the persistence layer works.

> **The motivation is pedagogy, not tidiness.** Every decision below
> follows from *a person should be able to read this*. Moving four
> tables into YAML is the means; the help topic is the end.

**What these docs are not.** They are **not a content pack** — a pack
cannot create a Mongo collection, and there is no want here for runtime
extensibility: the set of collections is closed and repo-owned. They are
**not seed files** — they seed no data, they describe what the code
already writes. They are repo files loaded at boot, exactly as
`hooks.yaml` already is.

Seeded by
[persistence-architecture-slate](../slates/tails/persistence-architecture-slate.md)
§ *Wave 4*, whose rulings this doc closes. Rides the shipped
[persistence](../subsystems/persistence.md) layer,
[help](../subsystems/help.md) (the harvest model), and
[content-packs](../subsystems/content-packs.md) (the boot ordering).

## What the inventory found

Measured against the live tree, 2026-08-31:

| | count | state |
|---|---|---|
| Collections | 48 | the vocabulary, hand-written |
| `COLLECTION_POLICIES` | 48 | **complete**, machine-readable, in TS |
| `RESET_DISPOSITIONS` | 48 | **complete**, and every `keep` already carries a `because:` |
| `createIndexes()` | 82 static + 3 text + 2 derived loops | one 700-line method |
| Collections with any prose | **4 of 48** | in `Collections.ts` TSDoc |
| Collections in CLAUDE.md's list | **28 of 48** | orientation only |
| `Document` classes | 52 | 11 name their collection with a bare **string literal** |

⭐ **The policy is not the problem — the description is.** Two of the
four tables are already complete data in the wrong language. What does
not exist anywhere is *what this collection is and why*.

## Goals

- **One authored schema doc per collection**, in the repo, carrying what
  code cannot say: purpose, invariants, the reason each index exists,
  the owning class, the owning subsystem doc.
- **The four tables derive from it.** `Collections`,
  `COLLECTION_POLICIES` and `RESET_DISPOSITIONS` are **generated and
  committed**; the authored indexes are **loaded and applied** at boot.
- **The link is real and checked.** A gate binds collection ↔ schema doc
  ↔ `Document` class ↔ subsystem doc, and fails when any leg is missing
  or disagrees.
- **A player can read it.** A third help projector turns every schema
  doc into a `HelpTopic`, with the field list **harvested from the
  class**, not restated.
- **The 11 bypasses end.** Every `static collectionName` names
  `Collections.X`.

## Non-goals

- **Not a content pack, and packs still cannot create collections.**
  Nothing here widens what a pack may declare.
- **No field list in the doc** (D3) and **no per-field prose** — the
  latter has no home until `fieldMeta` grows one, and that is a separate
  conversation.
- **No history block** (D9). Git is the record.
- **No schema *validation*.** These docs describe; they do not enforce
  document shape at write time. Mongo-side JSON Schema validators are
  out of scope.
- **No migration machinery.** The standing rule holds: a rename is a DB
  drop.
- **Wave 3 of the persistence slate** (marshallers/hooks/Hydrator as
  path-resolved modules) is untouched and independent.

## Surface decisions

### D1 — One YAML per collection, in the repo, loaded as `hooks.yaml` is

`packages/server/src/schema/<collection>.yaml`, one file per collection,
read at boot by `PersistenceManager` with `readFileSync` + `YAML.parse`
against a default path resolved from `import.meta.url` — the shape
`loadHooks` already uses for `mud/platform/idea/hooks/hooks.yaml`.

The mechanism needs no invention and no new module category: it is an
existing PM responsibility gaining a second manifest.

```yaml
collection: bank_ledger
owner: LedgerEntry              # the Document class, or `none`
subsystem: banking.md           # the doc that owns the concept
summary: The money system of record.
purpose: |
  Every movement of money, append-only. `bank_accounts` and
  `bank_supply` are rebuildable caches OVER this; if they disagree,
  this wins.
invariants:
  - Only `BankingApi.postTransaction` writes here.
  - A ledger leg may never cross currencies.
sandbox: stamp
reset:
  verb: keep
  because: the money supply is the world's memory of who earned what
indexes:
  - keys: { account: 1, at: -1 }
    why: the statement read — one account, newest first
  - keys: { txId: 1 }
    unique: true
    why: the idempotency key postTransaction writes against
```

⚠ **A missing file is an error, not a default.** Boot fails loudly
naming the collection. The gate (D6) catches it long before boot, but
the runtime must not paper over it — a collection nobody described is
exactly the state this build exists to end.

### D2 — `Collections` is GENERATED from the docs and committed

`pnpm gen:schema` reads `src/schema/*.yaml` and emits
`mud/lib/persistence/Collections.ts`, `COLLECTION_POLICIES` and
`RESET_DISPOSITIONS`. The emitted files are **committed**, and
`lint:schema` regenerates and diffs.

**Why generate rather than parse at runtime.** `Collections` is the one
piece used in **type** position — `Record<Collections, …>`,
`PersistApi.find(Collections.X, …)` across ~50 files. A runtime-parsed
vocabulary trades a whole class of compile-time error for a boot-time
one. Generation keeps both: one authored source, and a typo is still a
build failure. This is the **lint-family pattern applied to data** —
author the data, derive the checkable form, gate that they agree.

The generated files carry a header saying so and naming the generator.

### D3 — The doc does NOT carry the field list

`fieldMeta` on each `Document` class is what the `Hydrator` actually
reflects on. A YAML restating it would be **two copies of one sentence**,
and the copy that drifts is the one nobody executes.

The help projector **harvests** fields from the owner class's
`fieldMeta` (`persistent`, `marshaller`, `instruction`, `globIdentity`,
`ref`, `lifetime` are already there and already structured).

⚠ **Accepted consequence:** per-field prose — *what does `circleScope`
mean on this collection* — has no home in this build. `fieldMeta`
growing a `description` is the obvious later move and is explicitly not
attempted here.

### D4 — Authored indexes move; DERIVED indexes stay derived

`createIndexes()` is not a flat table, and treating it as one would be
wrong. It holds three kinds:

| kind | count | disposition |
|---|---|---|
| **Authored** — a static key spec on one collection | 82 | → the schema doc's `indexes:` |
| **Text** — via `ensureTextIndex`, which drops and recreates on shape change | 3 | → the doc, with `text: true`; the drop-and-recreate behaviour stays in PM |
| **Derived** — a loop over *another vocabulary* | 2 | **stays computed** |

The two derived loops are the `circleScope` partial index over every
STAMP collection, and the `{ kind, data.<naturalKey> }` partial-unique
index per `DOCUMENT_KINDS` entry. These are **consequences of another
declaration**, not authored facts; writing them out per collection would
be the same duplication D3 refuses.

⭐ The circleScope loop gets *better*: it currently reads
`STAMP_COLLECTIONS`, which will now be **derived from the docs'
`sandbox:` field** — so declaring a collection `stamp` in its doc is
what gives it the index.

### D5 — Both policy tables move, and `because:` comes with them

`sandbox:` and `reset:` become fields on the schema doc; the two TS
tables are generated (D2). `RESET_DISPOSITIONS`' existing `because:`
strings **migrate verbatim** — they are already the prose this build
wants, written for the wrong audience.

The `wipe-except` disposition keeps its shape; the doc carries it
whole.

### D6 — `lint:schema` — the gate that makes the link real

CI-gating, no exemption list. It asserts:

1. Every schema doc names a collection, and every collection has exactly
   one schema doc. Neither set has an extra.
2. Regenerating produces byte-identical `Collections.ts` and both policy
   tables (D2).
3. Every `static collectionName` in the tree is `Collections.X`, never a
   string literal — **this fails on 11 classes today** and is the first
   thing the build fixes.
4. Every doc's `owner` names a real `Document` subclass whose
   `collectionName` is that collection; `owner: none` is legal and means
   *nothing but `PersistApi` writes here*, which must then be true.
5. Every doc's `subsystem` resolves to a real file under
   `docs/subsystems/`.
6. Every doc has a non-empty `summary` and `purpose`.

### D7 — A third help projector, harvesting like the other two

`HelpCatalogue` already **harvests, never registers**. This adds a third
projector beside commands and api.

- `@saxonberg/types`: `HelpKind` gains `'collection'`;
  `HelpSource.subdivision` gains `'persistence'`.
- Topic id `collection.bank_ledger`; title the collection name; summary
  the doc's `summary`.
- Body is composed from `purpose`, `invariants`, the **fields harvested
  from `fieldMeta`** (D3), the indexes with their `why`, and the two
  policies **rendered in plain words** — *"survives the nightly reset,
  because …"*, not `{ verb: 'keep' }`.
- Relations: `see-also` to the owner class's existing `api`/`mixin`
  topic where one exists.
- ⚠ **Spoiler flag `false`** for every collection topic, consistent with
  the capability floor this cycle.

### D8 — The 11 bypasses end

`User`, `Group`, `Channel`, `Blueprint`, `StoredDocument`,
`PersistedRecord`, `ParcelEvent`, `DescriptorBank`, `GoogleProfile`,
`TwitchProfile`, `KickProfile` name their collection with a bare string.
Each becomes `Collections.X`. Mechanical, and D6.3 keeps it that way.

Test-fixture classes (`'boxes'`, `'widgets'`, `'test_wallets'`) are
**exempt and stay literals** — they name collections that are not in the
vocabulary and must not be.

### D9 — No history block; git is the record

Considered and declined. These are repo files, so git already gives a
history, and an authored `history:` would be a fifth thing to keep in
sync for a reader who is better served by *what this collection is* than
by how it got that way.

## Constraints

- ⚠ **Boot ordering.** The schema load must complete before
  `createIndexes()`, which is inside `connect()` — i.e. before
  `PackApi.install()`, `loadHooks` and `BootstrapManager`. The loader
  may therefore depend on **nothing** in the mudlib.
- ⚠ **The import boundary.** The generated `Collections.ts` lives under
  `mud/lib/persistence/` and must stay import-clean — it is a pure
  value module, and the *loader* (which reads files) lives in
  `backend/` where `fs` is legal. `lint:imports` gates this.
- **`Collections` stays a TS enum**, not a const object or a string
  union — the tree consumes it in type position and the build changes
  where it is *authored*, not what it *is*.
- **Idempotent generation.** `gen:schema` run twice produces the same
  bytes; the ordering of generated entries is deterministic (source
  order in the docs directory, which is alphabetical by filename).
- **No behavioural change at runtime.** After this build the same
  indexes exist, the same sandbox policy applies and the same reset
  disposition holds for all 48 collections. The generated tables must be
  **byte-equivalent in meaning** to the ones they replace, and the
  build proves it by generating from docs authored *out of* the current
  tables and diffing.

## Acceptance criteria

1. `packages/server/src/schema/` holds **48 YAML docs**, one per
   collection, each with a non-empty `summary` and `purpose`.
2. `pnpm gen:schema` emits `Collections.ts`, `COLLECTION_POLICIES` and
   `RESET_DISPOSITIONS`; running it on a clean tree changes nothing.
3. `pnpm lint:schema` passes, and is wired into `.gitlab-ci.yml`'s lint
   job — **verified by reading the CI file, not by habit.**
4. Deleting a schema doc fails `lint:schema`; adding a collection to a
   doc that no class writes fails it; changing a `collectionName` to a
   string literal fails it. Each proved by a test that makes the change
   and asserts the failure.
5. A boot with a schema doc missing fails loudly, naming the collection.
6. **A fresh boot on an empty database produces the same indexes as
   before.** Proved by dumping `listIndexes()` for all 48 collections
   before and after and diffing — the criterion that makes D4 safe.
7. `help bank_ledger` (or the equivalent id) returns a topic whose body
   names the owning class, the invariants, every index with its reason,
   and both policies in plain words — driven **live over a real
   socket**, not asserted from a unit test.
8. The fields in that topic come from `LedgerEntry.fieldMeta`; adding a
   persistent field to the class changes the help topic with **no edit
   to the schema doc**.
9. No `static collectionName` outside `__tests__` is a string literal.
10. Full suite green; all CI lints green.

## Cross-references

[persistence-architecture-slate](../slates/tails/persistence-architecture-slate.md)
§ Wave 4 (the rulings) ·
[persistence.md](../subsystems/persistence.md) ·
[help.md](../subsystems/help.md) (the harvest model + the projector
precedent) · [content-packs.md](../subsystems/content-packs.md) (boot
ordering) · [architecture.md](../architecture.md) (module categories —
this build adds no new one)
