# World-scan slate (tail — the prohibition, the gate and the index all shipped)

> **Status: PARTIAL** — the `world` seed refused everywhere, the
> executive's exception, one mixin-composition index, the seventeen call
> sites rewritten, and two ratchet gates all shipped (MR !252) →
> [mql.md](../../subsystems/mql.md); compacted 2026-09-19 (ledger:
> `docs/plans/slate-compaction/mql.md`)
> **Left:** MQL grammar for the specialized rosters (D5, "later if at
> all") · an active-mixin selector `[active.X]` if anything ever wants one
> (Q1's residue)
> **Size:** a tail

**Captured 2026-09-01** as a performance inventory. **Decided
2026-09-08**: the remedy is not only "make `world:` cheap" — it is a
**prohibition plus a gate**, and it extends to a second surface with the
same shape, Api methods that hand back their whole backing table.

> Where the shipped truth lives now:
> [mql.md § The registry-read grant](../../subsystems/mql.md) ·
> [command-routing.md § The `world` arm](../../subsystems/command-routing.md) ·
> [governance.md § What else the seat confers](../../subsystems/governance.md) ·
> [call-security.md § `FromTemplateMethod`](../../subsystems/call-security.md) ·
> [slot.md § The occupancy back-reference](../../subsystems/slot.md) ·
> [antipatterns.md § An Api May Not Hand Back Its Table](../../antipatterns.md).

**Provenance — two conversations:**

> **2026-09-01 — User: "any inventory on anything that's doing mql
> queries with 'world' … things that do a full scan of every stuff item
> in the game. we have to get rid of that shit or somehow make it
> performant."**
>
> **2026-09-01 (the crux): "even if we index mixin.X, depending on what
> X is the scan could still be really expensive."**
>
> **2026-09-08: "we need to deal with anything that's doing world-based
> MQL queries … we've basically got to prohibit it across the board. And
> let's gate 'world' as a predicate to only things being run by the
> prime-minister or something. it should not be possible for just
> anything to do full table scans against the stuff runtimes."**
>
> **2026-09-08 (the shape of the fix): "I don't want some ever growing
> bag of indices on the stuff table especially ones that only apply to a
> specific slice of the taxonomy. but if like 15 or 17 are all just
> mixin checks, that probably tells us we should be indexing on mixin
> composition. for the specialized check's I'd rather apis keep their own
> indexes and offer their own APIs for operating over those indexes …
> with maybe some optional MQL grammar later on if there are some common
> use cases we want to be queryable."**
>
> **2026-09-08 (the second surface): "any Api class that's returning back
> full copies of it's tables/lists … it shouldn't just expose its
> internal data structures for anyone. same problem, different causes."**

**Sits on:** [mql.md](../../subsystems/mql.md) (the `world` seed + system
mode — **read first**), [antipatterns.md](../../antipatterns.md)
(§ Bespoke Object-Search Algorithms — ⚠ **this build inverts it**),
[lint-family.md](../../lint-family.md) (census-then-ratchet),
[employment.md](../../subsystems/employment.md) (the roster two of the
worst sites should be reading),
[augmentation.md](../../subsystems/augmentation.md) (the active-vs-composed
mixin question), [content-packs.md](../../subsystems/content-packs.md)
(⚠ a pack cannot ship an Api — Part 3 D2).

---

## Part 0 — ⚠⚠ The doctrine reversal

*Shipped and documented — the inverted entry and its ⚠⚠ history paragraph at
[antipatterns.md § Bespoke Object-Search Algorithms](../../antipatterns.md);
the gate's reversal at [lint-family.md § `lint:world-scan`](../../lint-family.md).*

---

## Part 1 — ⭐⭐ The crux: indexing `mixin.X` is a PARTIAL fix

*Shipped and documented — [antipatterns.md § Bespoke Object-Search
Algorithms](../../antipatterns.md): *ask the owner* first, the index only for a
population that is *global AND selective*.*

---

## Part 2 — The inventory, triaged

*History — all sixteen sites are remediated: the pair list in `api/stuff.ts`
(`RegistryWideReaders`), `ResidenceCatalogue` for the three residence reads
([residence.md](../../subsystems/residence.md)), the occupancy back-reference
([slot.md § The occupancy back-reference](../../subsystems/slot.md)), the
`LocomotionMode` path glob, `decoyNameFor` on the pair list, the shutdown
capture. Verified against `design/slate-compaction`, 2026-09-19.*

---

## Part 3 — ⭐ The decisions (2026-09-08)

### D1 — ONE new registry index, and it is mixin composition

*Shipped — `StuffApi.findByMixin` over `#indexes.byMixin`, composed-only, the
`queryMixins` memo per constructor; the why (axis of the substrate, no
`byClassName`, the rejected event bus) is now at [mql.md § The registry-read
grant](../../subsystems/mql.md) (*Why one index*).*

### D2 — Specialized slices: the cheapest rung that answers the question

*Shipped — the ladder is [antipatterns.md § Bespoke Object-Search
Algorithms](../../antipatterns.md) *INSTEAD 1–3* (owner · anchor/path glob ·
index; `allModes` is the glob). ⚠ Rung 2's *filled at `postRegister`* did NOT
ship for the pack case — the `ResidenceCatalogue` derives from the ROW's shape
and is lazy, never warmed, because institution classes span packs and a push
cannot be inherited from a base the pack does not own
([residence.md § `ResidenceCatalogue`](../../subsystems/residence.md)). The
water allowlist entry is gone ([lint-family.md](../../lint-family.md)).*

### D3 — Two gates, because there are two failure modes

*Shipped — the seed is refused for everyone (`MqlPermissionError`, naming the
anchored alternatives; `docs/mql-grammar.md` § *There is no `world` seed*); the
engine's wide reads moved to `StuffApi.findByMixin` behind the
`RegistryWideReaders` pair list — [mql.md § The registry-read
grant](../../subsystems/mql.md).*

### D3a — ⭐⭐ Building `FromTemplateMethod` is in this build's scope

*Shipped — `SecurityPolicies.FromTemplateMethod`, documented with the frame
mechanics, the nearest-dispatched-frame doctrine, the five fail-closed
conditions and the optional module term at [call-security.md § The calling
function](../../subsystems/call-security.md).*

*Gate B (what) — superseded by the code: for engine code the shape gate is the PARAMETER TYPE
of `StuffApi.findByMixin` (you name a mixin, so an unindexed read is not
expressible — [antipatterns.md](../../antipatterns.md)); for the seat, any
shape resolves and the `registry-scan` note says what it cost
([mql.md](../../subsystems/mql.md)).*

### D3b — ⭐⭐ The second arm: the Prime Minister may type it

*Shipped in the reviewed shape — the grant is an ambient environment fact,
asked of the executive once per refused dispatch:
[mql.md § The registry-read grant](../../subsystems/mql.md) (the two rejected
shapes; no subscriptions), [governance.md § What else the seat
confers](../../subsystems/governance.md), [command-routing.md § The `world`
arm](../../subsystems/command-routing.md) (catch, ask, retry; the
`registry-scan` note).*

### D4 — The second surface: an Api may not hand back its table

*Shipped and documented — [antipatterns.md § An Api May Not Hand Back Its
Table](../../antipatterns.md) (the three tests), [lint-family.md §
`lint:whole-table`](../../lint-family.md) (ratchet at 0).*

### D5 — MQL grammar for the specialized slices: later, if at all

A D2 index stays behind its owner's method surface. **If** a common
queryable pattern emerges, it can be lifted into MQL then — as a new
seed or filter namespace with an index behind it, never as a scan. Not
speculative work now.

### ⛔ Rejected — a global event bus that pushes objects into caches

*Graduated — the two reasons are now at
[mql.md § The registry-read grant](../../subsystems/mql.md) (*Why one index*).*

---

## Part 4 — Remediation order

*History — all eleven steps landed in MR !252 (see the Part 2 pointer).*

---

## Part 5 — The rule this leaves behind

*Shipped and documented — [lint-family.md § `lint:world-scan`](../../lint-family.md)
(*you may not be handed the world*), [antipatterns.md § Bespoke Object-Search
Algorithms](../../antipatterns.md) (*the rule now*), and § *An Api May Not Hand
Back Its Table* beside it.*

---

## Lens pass

*Done at requirements: the authored cases `world:` served are routed to
anchored seeds and path globs —
[mql-grammar.md § There is no `world` seed](../../mql-grammar.md).*

---

## Open questions

1. *Q1 resolved — composed-only, named in [mql.md § The registry-read grant](../../subsystems/mql.md)
   (`StuffApi.findByMixin`). Residue: an active-mixin selector `[active.X]` is a
   separate operator if anything ever wants one — nothing does today.*
2. *Q2 resolved — two arms by two bases: code by `FromTemplateMethod`
   ([call-security.md § The calling function](../../subsystems/call-security.md)),
   the seat by `CompactApi.readWorldAs` in the binder's catch-and-retry
   ([command-routing.md § The `world` arm](../../subsystems/command-routing.md)).*
3. *Q3 resolved — neither class: the catalogue derives from the ROW's shape
   (`data.parentExtent`) — [residence.md § `ResidenceCatalogue`](../../subsystems/residence.md).*
4. *Q4 resolved — both landed on the `RegistryWideReaders` pair list
   (`takeCensus`, `holdsAnyPublishingPosition`; `api/stuff.ts`).*
5. *Q5 resolved — n = 1,785 with nobody logged in; recorded at
   [antipatterns.md § Bespoke Object-Search Algorithms](../../antipatterns.md).*
6. *Q6 resolved — [lint-family.md § `lint:whole-table`](../../lint-family.md)
   (method name + immediate narrowing; self-receiver exempt; ceiling 0).*

---

## What this slate does NOT cover

- *The raw-`getAllObjects` allowlist — documented at
  [lint-family.md § `lint:world-scan`](../../lint-family.md) and in
  `scripts/check-world-scan.ts`'s header; the water entry is gone.*
- *The `flat` seed — superseded: there is no such seed. `candidatesForFlat` is
  a candidate builder over an array, and the one `getAllObjects` path through
  it WAS the `world` scope keyword, now `wholeRegistry()` in `mql/resolver.ts`.*
- **Api surface/depth normalization** —
  [api-normalization-slate](./api-normalization-slate.md) measures the
  layer on different axes and does not overlap D4.
- *MQL subscription re-resolve cost — resolved: `world:` is refused on every
  subscribing surface for everyone, the seat included*
  ([mql.md § The registry-read grant](../../subsystems/mql.md),
  [governance.md § What else the seat confers](../../subsystems/governance.md)).
