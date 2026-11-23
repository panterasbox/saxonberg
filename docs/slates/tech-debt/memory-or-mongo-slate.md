# Memory or Mongo — one rule for what the game server keeps

> **Status: UNBUILT** — opened 2026-11-23 (owner, in naming-overhaul
> review, when `GroupMemberMixin` was folded into `ContactsMixin`: *"a
> cache isn't a capability … hopefully we can come up with a single
> unified solution that gives us easy dials to turn if we need to
> rebalance the db vs gameserver split"*).
> **Left:** all of it — the census below is a first grep, the shape is a
> proposal to argue with, and every open question is open.
> **Size:** a conversation, then likely a build.

## The question

Every piece of state the world reads lives in Mongo, in the game server's
RAM, or both. Today each subsystem decides that for itself, in code, and
none of those decisions can be turned without editing the subsystem. The
owner's ask is **one mechanism with dials**: a declaration of what a thing
wants kept, one runtime that keeps it, and one place to rebalance when
the box gets tight (RAM) or the database gets slow (connection waits,
latency, the Atlas bill).

The two failure directions this has already paid for:

- **Too little resident.** db-performance (!636) measured 21 connection
  waits at pool 24, most of them per-act reads of `documents` and
  `beliefs` — data that barely changes, re-read on every act.
- **Too much resident.** The 4 GB heap and the cold boot
  (test-world-lifecycle); idle 3 GB worlds starving sibling builds; the
  residency sweep exists because a loaded world never forgot anything.

## Today — the census (first grep, 2026-11-23; verify before designing)

At least six shapes, each with its own answer to *when is it read, when
is it current, when is it let go*:

| shape | example | read | kept current by | let go |
|---|---|---|---|---|
| **Live Stuff + residency** | rooms, goods, NPCs | on use (load-on-use doctrine) | it IS the state; `holder_snapshots` on save | `ResidencyLogic` sweep (idle 30 min, 60 s tick), vetoed by `canEvict` (~79 implementers) |
| **Document catalogues** | `ReasonCatalogue`, `ShapeCatalogue`, `MaterialCatalogue` (31 `*Catalogue.ts`, 16 over `DocumentCatalogue`) | first use (`ensure`/`need`/`peek` doors) | a CMS/pack write invalidates (`clearAll`, HMR) | never — a known path stays known |
| **Login-time resident read** | your managed groups (`ContactsMixin.refreshGroups`) | at session start | the group's change hook | the body's destruct |
| **Per-person store on the body** | `BeliefStore` (`_beliefs` map), contacts, wardrobe | with the body (snapshot) | write-through | with the body |
| **Registries of live wiring** | subscriptions, reactions, stream relays, world clocks | as they are made | they are the state | as they are cancelled |
| **No resident copy at all** | ledgers (`bank_ledger`), participation/renown events, `beliefs` reads that miss | every read | — | — |

⚠ Some of these are not caches (a registry of live subscriptions is the
state itself; a ledger must not be cached by the side of its
chokepoint). Sorting **cache** from **state** is the first job.

## A shape to argue with

1. **A declared residency class per record kind** — on the document
   kind declaration (naming-overhaul made kinds declarations with
   traits; residency could be one more trait) and on the collection's
   schema doc (`src/schema/<collection>.yaml`, already the one authored
   home per collection). Something like `resident: always | on-use |
   session | never`, plus how it stays current (`invalidate-on-write` ·
   `change-hook` · `ttl`).
2. **One runtime** that honors the declaration: one memory map, one
   invalidation path (every write already funnels — documents through
   `DocumentLogic`'s write funnel, records through their classes), one
   eviction policy, one `/stats` view of what is resident and what it
   costs.
3. **The dials** in one place — app settings (`config`), read at boot
   and changeable live: a byte or entry budget per class, the idle
   window, and a per-kind override (*keep `reason` always; let `belief`
   fall to on-use under pressure*).
4. **Live Stuff stays residency's.** A Stuff is not a cached record; the
   sweep and `canEvict` keep owning it. The unified mechanism is for
   records and documents read *by* Stuff.

## Lens pass (first cut)

- **6 economy** — this is the hosting bill: RAM on the Lightsail box
  versus Atlas connections and reads. A dial is the honest way to price
  that trade instead of freezing one answer into code.
- **5 continuity** — the declaration survives refactors; a hand-written
  cache is lost with the code that wrote it (the groups cache had to
  move once already).
- **2 creative expression** — a pack author ships a kind and says how it
  is read; no kernel code for an ordinary case.
- **1 pedagogy / 3 / 4 / 7** — nothing player-facing, except that a
  stale cache is a fiction that betrays itself (3a): whatever the dial,
  a write must be seen by the next read.

## Open questions

- Is the document-kind **trait** the right home, or the schema doc, or
  both (documents vs collection records — two stores, one rule)?
- What counts as "current" per class: strict (invalidate on every
  write, single server), or bounded staleness (`ttl`) — and is there ever
  more than one game server, which decides whether write-invalidation
  is enough?
- How does it meet **eager residency** (`eager-residency-slate`: who may
  keep a *thing* loaded, the two tiers of account, the degradation
  order)? One budget for both, or two?
- Does `beliefs` (db-performance § 3's per-act reads) become the first
  consumer? It is the measured hot spot.
- Does the per-person resident read (groups at login) generalize to
  "session" residency — read at enter, dropped at leave — for every
  person-keyed record?
- What does `/stats` show, and what alarm says *rebalance*?

## Cross-references

- [db-performance-slate](./db-performance-slate.md) — the measured waits
- [eager-residency-slate](./eager-residency-slate.md) — who may keep a thing loaded
- [crowded-rooms-slate](./crowded-rooms-slate.md) · [world-scan-perf-slate](./world-scan-perf-slate.md)
- [residency.md](../../subsystems/residency.md) · [persistence.md](../../subsystems/persistence.md) · [document-store.md](../../subsystems/document-store.md) · [contacts.md](../../subsystems/contacts.md)
- Memory: *load on use, never search, never boot*; *no class readies its Api*
