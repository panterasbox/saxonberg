# Records-as-documents slate — a Stuff whose only job is a record

> **Status: PARTIAL** — the principle is written
> ([antipatterns.md § A Stuff whose only job is to hold a record](../../antipatterns.md))
> and its first case shipped: `platform/idea/BerthRoll` → the
> `berth-roll` document kind (harbors review 1, MR !511) →
> [document-store.md](../../subsystems/document-store.md)
>
> ✅ `Harbor`'s `book` + `hails` → onto `HarborBook`, and `HireBook`'s
> duplicate `hires` → removed (both fixed in !511, harbors review 2).
> **Left:** `ReachWarren`'s
> persisted `stops` index — derive it or file it · the census question
> (a gate, or not)
> **Size:** a tail

**Captured 2026-11-03**, from reviewing `BerthRoll extends
PersistableMixin(Idea)` on the harbors branch. The owner's rule:

> **A record that nothing targets, that has no behavior beyond
> add/remove/list/read, and that need not be a live object, is a
> DOCUMENT, not a Stuff.**

The four-question test (targetable · behavior · runtime participant ·
invariants on the object), the two document shapes (system-written
records behind a register-shaped transport; owner-scoped content under
the parcel-title gate) and the one exception (a fixture players use that
keeps its own book) are in antipatterns.md and are not restated here.

⚠ The folder is `tails/` because the size is: the scan found **no open
violation** beyond the one already fixed, and two borderline cases, each
a wave at most. That is the honest answer, not a reason to find more.

## The scan

Swept 2026-11-03 on `reqs/harbors`: every class composing
`PersistableMixin` in `packages/server/src/mud/**` and every
`packages/content/*/src/**` (35 composing files, 114 files touching it),
every `Registrar`, every kernel `*Registry`, every file declaring a
`runtimeState` field, and every `restoreOrSeed` / `setPersistenceKey`
caller (the keyed-mint sites).

### Verdicts

| class | what it keeps | written / read by | targeted? behavior? | verdict |
|---|---|---|---|---|
| ~~`platform/idea/BerthRoll`~~ | which ships lie at one landing | the ship on make-fast / cast-off; the landing on first use | nothing named it; add/remove/list only | **VIOLATION — fixed**: `berth-roll` document, `DocumentApi.saveBerth` gated `FromMixin(Voyaging)` with caller = the ship (!511) |
| `transport/idea/Harbor` | authored quays/rates/seat/office **+ runtime `book` (assignments, made-fast, dues paid-through) and `hails`** | `answerHail`, `admit`, `madeFast`, `release`, `settleDues`, `onPaid`; read by `HarborOffice`, `HarborBook`, `berth` | **No verb names it** — `hail office`, `pay office`, `pay book`, `berth … at` all reach it through `HarborOffice` / `HarborBook`. Real behavior and invariants: posted criteria in order, room by length, lapse, dues accrual | **BORDERLINE** — tests 2 and 4 hold, so it is not a record-only Stuff; but the persisted half sits on the one object no verb reaches, while a fixture named *the berth book* exists and holds nothing. The exception's tell, exactly. ✅ **Fixed in !511** (review 2): the record (lines, debts, dues stamped paid, hails) is `HarborBook`'s, persistable; `Harbor` keeps only its posted rules, names its book forward (`book:`), and composes no `PersistableMixin` |
| `water/idea/ReachWarren` (`stops`) | an index of river stops holding something, by `(course, km, side)` | the warren when a stop takes something; read when water drifts past a position | the warren is a real runtime mechanism (mints, moves, merges, reaps patches) | **BORDERLINE** — the HOST is right; the persisted `stops` list is an add/list index of facts the stops' own `holder_snapshots` rows (keyed by position) already hold. Derivable, or a document — not a warren field |
| `platform/thing/HullBook` | the hulls on the stocks + the ones sold | `buy` at it; the yard | targeted (`buy`), `ForSale`, refuses a sold slot | **FINE** — the exception: a fixture that keeps its own book |
| `platform/thing/HireBook` | rates + the hires out | `rent` at it; the boat strikes her line on return | targeted (`rent`), the venue the day is paid to | **FINE** — the exception. ⚠ Its `hires` is a second copy of the boat's own hire record ("so its `look` can name the boats out"): that is [*Two records of one fact*](../../antipatterns.md), not this rule. ✅ **Fixed in !511** (review 2): the boat's hire is the only record — the book keeps only its rates, persists nothing, and reads its boats out (and overdue) off the live boats of the kinds its `rates` name whose hire names it (`hiresOut`); a boat not standing is not on the page until she is |
| `platform/thing/CharterBook` | authored rates + `payTo` | `charter` at it | targeted | **FINE** — not persistable; the charter is the ship's record |
| `transport/thing/HarborBook`, `transport/location/HarborOffice` | nothing of their own (`harbor:` ref) | `berth`, `pay`, `hail` | targeted, `Payable`, `Hailable` | **FINE** — but see `Harbor`: the book belongs here. ✅ **Fixed in !511**: the book now keeps the harbor's record |
| `platform/idea/ShipRegister` | nothing — `government:` only; entries are `ship` documents | `enter` (the ship, about herself); `entries`, `entryNamed`, `isNameTaken` | a `Registrar`: the principal its transport checks (`caller === register`) | **FINE** — already the document shape; the Idea is the keeper, not the record |
| pack `Registrar`s — `HerdRegistry`, `BoreRegistry`, `FisheryRegistry`, `WaterRightRegistry`, `BodyRegister`, `RateCardRegistry`, `WaybillRegistry` | records are documents | the registrar | call-security principal | **FINE** — the model this rule generalizes |
| `platform/idea/PersistentBusiness` | a cap table | `sellUnits`, `giveUnits`, `transfer … shares`; a smack's company minted `(seed, serial)` | a Business: seats, roster, payee; the table refuses a sale without consent | **FINE** — tests 2–4. A minted company is keyed, but it is not minted to hold data: it holds her master's seat |
| `platform/idea/Ship` | her voyage, charter, company, register line | the ship | boarded, named, chartered, sailed | **FINE** |
| `platform/location/Hold` | her cargo (contents) | stow / unstow | a room | **FINE** |
| `platform/location/PersistentShore` · `PersistentLocation` · `PersistentLocale` | contents + place state | the place | places | **FINE** |
| `FloorplanWarren` → `ShipWarren` (`shortOf`), `HoldingWarren`, `MineWarren` (`carved`); `CirculationWarren` → `PlatWarren`, `BuildingWarren`, `DormWarren` | the plan's geometry + what has been carved/shortened | the warren | mint, wire and reap rooms | **FINE** — `carved` is what EXISTS (the mine's map), not a list about other things |
| `water/idea/ColumnWarren` | nothing of its own | — | mints and reaps bands | **FINE** — holds no record; `Persistable` serves its members' capture |
| `water/lib/WreckSite` (on `SeaStop` / `ReachStop`) | `wrecks` — ships lying under the stop | the stop when a ship goes down | the stop is a place kept for its contents anyway; the record wires the ways down to her | **FINE** — the same *fact* as a berth roll, but on a host already kept, and it drives exits |
| `Stock` / `MarketStalls` / `ConsignmentShelf` / `CheckRack` / `Stockpile` | shelf, consignment, custody ledgers | `buy`, `consign`, `reclaim`, `get`/`put` | targeted fixtures | **FINE** — the exception |
| `TpaTerminal`, `Wellhead`, `StorageNode`, `IceSheet`, `ScrewPress`, `Die`, `Clay`, `Corpse` | physical state | verbs at them | targeted things | **FINE** |
| `Field`, `Tract`, `Wood`, `Panel`, `PermanentBed`, `Plant`, `HouseTray`, `MineRoom`, `AuthoredWorking`, `OpenWorking`, `Turbary`, `Band`, `ReachStop`, `SeaStop`, `DormRoom`, `Compartment` | ground, growth, contents | the world | places and fixtures | **FINE** |
| `Avatar` / `PrimaryAvatar`, `KeptAnimal` | a body | the spine | agents | **FINE** |
| `platform/idea/Party` | `durable` flag; members in `PartyRecord` | the `party` verb | targeted group, combat `sideOf` | **FINE** — ref-shapes' own exemplar of a *purpose Document* |
| kernel `*Registry` singletons (`ParcelRegistry`, `ChattelRegistry`, `OfficeRegistry`, `GroupRegistry`, …) | nothing — records are Mongo `Document` rows | their Apis | gated fronts | **FINE** on this rule. ⚠ `office_holders` and `descriptor_banks` are **collections that should be kinds** — the 2026-09-03 collection audit, tracked in [document-store-tiering](./document-store-tiering-slate.md) and elsewhere; a different question (collection vs kind), not this one (Stuff vs record) |
| `platform/idea/Locality` (`_lighting*`) | a runtime cache | the lighting tick | — | **FINE** — not persistable; nothing kept |

**Counts:** 1 violation (fixed, !511) · **0 open** · 2 borderline ·
everything else fine (≈ 50 classes across 27 rows).

## What is left, by migration shape

### 1 · `Harbor`'s book — onto the fixture, or a document (a wave) — ✅ fixed in !511 (fixture shape)

Two shapes, and the rule picks between them:

- **Onto `HarborBook`** — the exception shape. The book is *"the berth
  book on the harbor office's desk"* in its own docstring; `berth` and
  `pay book` already act on it. Make it `Persistable`, move `book` +
  `hails` + the criteria that read them (`answerHail`, `admit`,
  `madeFast`, `release`, dues) onto it; `Harbor` keeps only what is
  authored (quays, rates, seat, office, exempt, roads) and stops
  composing `PersistableMixin`. ⚠ Cost: `HarborOffice` answers `hail` and
  `pay office` and would forward to the book instead of the harbor; a
  port with two desks would need one book to be THE book.
- **A `harbor-book` document** — path-keyed under the harbor's own
  branch, written by `Harbor` through the register transport (it already
  satisfies *the owner is a prefix of the keeper's template path*:
  `/world/terminus/harbor/idea/harbor` keeps `/world/terminus/harbor/…`).
  Rubric check: path-addressable ✓, grows with ships not acts (hails
  lapse) ✓, no CAS ✓, no secondary key ✓, titled owner ✓.

⭐ Lens 2 (creative expression) decides: a second port is a row in both,
but only the fixture shape lets an author put the book where a player can
`look` at it without a second object forwarding — and the book is the
harbor's whole fiction. **Fixture first**; the document is the fallback
if a port wants a book with no desk.

### 2 · `ReachWarren.stops` — derive it, else file it (a tail)

The stops are already `holder_snapshots` rows keyed by position. If the
spine can list a row's keys by prefix, the index is derivable and the
field goes ([*A registry caching a fact its members already hold*](../../antipatterns.md)).
If it cannot, a `reach-stops` document under `/system/water` written by
the warren. ⚠ Check first what `PersistableApi` exposes — do not add a
spine read for one consumer without asking whether `SeaWarren` (which
re-finds its stops by `standUpKeyed`) is the second.

### 3 · The census question (decide; maybe nothing)

A gate in the census-then-ratchet shape would count `PersistableMixin`
composers on the `idea` branch with no `commandContributions`, no
`Registrar`, no `Payable`/`Hailable`/warren base — today **1**
(`Harbor`). ⚠ That is a predicate approximating four judgment questions;
per [lint-family.md](../../lint-family.md) a gate is earned by a
population that grows, and this one has grown by exactly one
(`BerthRoll`) in the project's life. Recommendation: **no gate**; the
antipatterns entry and review are enough until a second case appears.

## Ordering

1 then 2 then 3. Item 1 rides the next transport or institutions build
that touches the harbor; item 2 rides the next water build. Neither
blocks anything.
