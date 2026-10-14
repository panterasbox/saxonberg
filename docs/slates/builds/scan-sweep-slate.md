# Scan sweep — load on use, ask the scope that holds the answer, never the world

> **Status: UNBUILT.** Part 1 (registry scans) surveyed in the maritime
> build's review (2026-10-13), re-verified against the code 2026-10-14;
> Part 2 (the catalogue and boot audit) audited 2026-10-14 after the
> maritime structures were found booted and catalogued — fixed on
> `fix/maritime-lazy`, which also closed Part 1 item 2.
> **Left:** ⭐ the doctrine written into a gate · Part 2's build order —
> employment's operator flipped onto the room (it runs on every `look`,
> and it is behind ~50 boot entries), stock that refills on load, water
> and fishing named by the reach, residence named by the extent's zone,
> the warm-only vocabularies replaced by references and the typed-word
> ones made lazy · Part 1's remaining nine registry scans · the two
> ratchets (registry-wide readers, boot entries) · the docs that claim
> enforcement no gate performs.
> **Size:** a build — one sweep across a dozen subsystems, bundled to pay
> the full suite once.

*Opened from the maritime review, on the user's ask: "we should do a
survey of anything else that's doing registries or full scans of things
for stupid reasons."*

---

## The rule, and the precedent

**A question has a scope that holds the answer. Ask it.** *Which craft
am I aboard* is the structure catalogue's keyed walk up the room's path;
*what can I see at sea* is that sea's own list; *which business operates
here* is the business index. Reading every object of a kind and
filtering is the shape to remove — not because it is always slow (a
mixin bucket read is cheap while the bucket is small) but because the
cost then grows with the WORLD rather than with the question, and
because a slice of the world is a thing somebody has to be allowed to be
handed (`lint:world-scan`'s header says it plainly).

⭐ The maritime build is the worked precedent (MR !358, B-89/B-90): the
horizon and the weather lean stopped reading every resident `Voyaging`
object; the expanse answers what is on it (`sightables()`); the
boarding exit walks berth → ship → sea → that sea's nodes, once; and
two `RegistryWideReaders` entries were deleted. ⚠ Its first fix — a
`StructureCatalogue` with a keyed index — was itself a content index,
and the 2026-10-14 review removed it: a zone NAMES its structures and
loads them with itself, and what a place can see loads with the place.
⭐ The stronger rule this sweep should hold every fix to: **content
loads when a player's act forces it, by following authored references
— never by search, and never at boot unless the reason is written
down.**

## Build order — the ten defects

Ordered by how often each runs; the first three are per command.

1. ⭐⭐ **The help-wanted sign re-enumerates every business on every
   `look`.** `EmploymentLogic.businessByKey`
   (`platform/idea/api/EmploymentLogic.ts:1484`) treats a MISS as a stale
   memo: it drops the cache and re-reads every business
   (`allBusinesses`). Most rooms have no business, so a miss is the
   ordinary answer, and `LookController.ts:315` (`noticesAt`) asks it
   for the room and each fixture on every look. The same path serves
   `apply`, `wallet` (`WalletController.ts:154`), `order`
   (`OrderController.ts:452`), the access check
   (`AccessRegistry.ts:198`) and `donate` (trade-medicine). ⭐ Fix: the
   location index is maintained on write (a business standing up or
   going away updates it), so *no business here* is an answer, never a
   reason to rescan.
2. ✅ **Fixed on `fix/maritime-lazy` (2026-10-14)** — it now asks the
   seas the traveller's place can see (its `horizon`), each by its own
   nodes. *Was:* **`journey` reads every expanse node in the world** to recognise a
   sea name: `JourneyController.seaNodeNamed`
   (`transport/src/idea/cmd/movement/JourneyController.ts:360`) calls
   `Template.findByClass('/platform/idea/ExpanseNode')` — every node row,
   plus every `extends` row (item 10) — per unrecognised destination.
   The sea already answers by name (`Expanse.nodeByKeyword`); the
   traveller's place says which sea (`ExpanseApi`).
3. **A mind-driven screen tries every display in the world.**
   `CommandController.resolveScreen` (`lib/command/CommandController.ts:90`),
   for an actor with an implant, takes `findByMixin('DisplayMixin')` and
   awaits `mayDrive` on each (the house-shop verbs). The displays a mind
   can drive are the ones PAIRED to the actor — the actor's own records
   should answer, and `mayDrive` should run over that handful.
4. **`branchOf` rescans on a miss.** `BankingLogic.findBranchOf`
   (`BankingLogic.ts:315`) memoises a hit but not a miss, so validating a
   custodian that has no live branch rereads the `BankMixin` bucket every
   time, on a money path. A negative entry, dropped when a branch stands
   up, closes it.
5. **`requiresPublisher` reads every publisher.**
   `PressLogic.holdsAnyPublishingPositionImpl` (`PressLogic.ts:171`) walks
   the `PublisherMixin` bucket per validation. Whether the principal holds
   a publishing position is a question about THEIR employments.
6. **A disconnect walks every attendant point.**
   `AttendantLogic.onPlayerDisconnected` (`AttendantLogic.ts:97`) calls
   `allPoints()` to drop one customer. The points that hold a lease or a
   queue place for that player are few; a customer → points index
   (maintained by lease and queue writes) answers directly. (The idle
   sweep's walk of every point is legitimate — it IS a sweep.)
7. **Residency's spawn sweep walks the whole registry** for
   `Circulating` objects (`ResidencyLogic.ts:458`, `getAllObjects()`)
   where the mixin bucket already holds exactly those.
8. **An MQL path atom with no live clone walks every object.**
   `StuffApi.findTemplatesByPath` (`api/stuff.ts:1637`, reached from
   `api/mql/resolver.ts:388`) is an O(N) walk of `byId` matching `path`,
   ungated. The registry's template-path index, or `Template.findByPath`,
   answers a non-glob path directly.
9. **The wiki's composition page reads the whole template table.**
   `lib/wiki/components/composition.ts:403` —
   `Template.findDescendants('/')` per render. It wants the class →
   rows index the composition question is actually about.
10. ⚠ **The hidden cost under the template finders.**
    `Template.findByClass` and `findWhereDataHas`
    (`lib/stuff/Template.ts:492,561`) union every row carrying `extends`,
    materialised, on EVERY call (`#inheritedMatches`). Its docstring says
    *"one extra query, at boot-warm time"* — true of the catalogues, not
    of the ~18 callers, some of which run at runtime (item 2). Either the
    `extends` set is memoised per process and dropped on a template write,
    or runtime callers are moved to an index.

## Legitimately global — NOT defects

Recorded so the sweep does not chase them: the shutdown capture
(`captureAtShutdown`), the census and the eviction / reset sweeps
(engine self-maintenance over raw targets, deliberately not MQL),
street lighting once a night (`settleStreetLighting`), the presence
fan-outs over ONLINE players, boot warms, and the wizard tools.

## The gate

`lint:world-scan` already refuses bespoke `getAllObjects()` loops and
stray `world:` queries; the sanctioned registry-wide read is
`StuffApi.findByMixin` from a `(template, method)` pair named in
`RegistryWideReaders` (`api/stuff.ts:88`). **12 pairs today.** ⭐ The
proposal is the census-then-ratchet pattern
([lint-family.md](../../lint-family.md)): gate the pair count at 12, so
it may fall and never rise, and let this sweep drive it down — items 3,
4, 5 and 6 each remove a pair. ⚠ The Template finders (item 10) and
`findTemplatesByPath` (item 8) sit outside that list entirely; whether
they want a census of their own runtime callers is the plan's question.

## ⭐⭐⭐ Part 2 — load on use: the catalogue and boot audit (2026-10-14)

### The doctrine, in the user's words

> *"if a Location isn't loaded into memory, it simply doesn't exist to the
> player until something the player does forces it to load. and the set
> of 'something the player does' should be known and visible to the
> player, e.g. 'looking/moving through an exit loads the next room'. … the
> room doesn't load until the point at which the game would have to
> reject the command entirely … if you wanted say, a zone, to eagerly
> load some or all of its internal structures that could make sense …
> I'm inclined to reject anything eager on principle."*

So: **content loads when a player's act forces it, by following AUTHORED
REFERENCES from what is already loaded — never by searching the template
table, and never at boot unless the reason is written down and holds.**
The location graph (`LocationGraphRegistry`) is the one sanctioned index.
A zone loading its own insides is allowed; that is what `structures:` and
a sea compiling its nodes now are.

**Two rulings (user, 2026-10-14):**
1. ✅ **A dictionary looked up by a word the player TYPES** (`cast
   firebolt`, `measure depth`, `help <concept>`) is an acceptable index —
   the command table's shape — **provided it is built lazily** on first
   use, never booted.
2. ✅ **Unobserved simulation reconciles when the place next loads**
   (stock refilling, wages, roster ticks, a voyage) — the house
   reconcile-on-read pattern. Only the engine's own wardens (machinery
   that arms timers, not content) stay booted.

### ⭐⭐ The finding: references point the WRONG WAY

Nearly every catalogue and nearly every eager boot exists because a
question is asked in the direction OPPOSITE to the reference the content
authors. With the reference pointing away from the asker there are only
two answers — scan for it, or keep everything resident so a synchronous
read finds it — and the catalogues are the first and the boot entries the
second.

| question the code asks | reference the content authors |
|---|---|
| which business operates this room? | business → rooms (`operatingLocations`, 61 rows) |
| which products belong at this counter / region? | product → container (`container:`); zone `stocks:` names KEYS |
| what discharges upstream of this reach? | work → reach (`reachRef:`) |
| what species can this water hold? | sea band → species (`stock:`), otherwise derived by habitat over every species |
| which institution owns this keyed room? | institution → extent (`parentExtent`) |
| ~~which structure is this room in?~~ | ✅ flipped: the zone names its structures (`structures:`, 2026-10-14) |

⭐ **Flip the reference so the PLACE names what is in it** — as a room's
`props:` already do and a zone's `structures:` now do — and loading the
place loads its contents: the scan and the boot go together.

### The inventory

**Template-table scans (~25).**
- **World content found by search** — the real violations:
  - `EmploymentLogic.buildOperatorIndex` reads the **whole table**
    (`findDescendants('/')`, `EmploymentLogic.ts:2008`) on a miss, then
    stands the business up (`singletonOrClone`) and runs the roster tick.
    Called per `buy` / `order` / `bank` / settle sale.
  - The live-business memo (`findByMixin('BusinessMixin')`) re-enumerates
    on every miss — every `look` (help-wanted, `noticesAt`) — and is
    *live only*, so **`lint:openings` requires every advertising house to
    be booted** (`check-openings.ts:296-318`).
  - `ResidencyLogic.collectSpawnCandidates`: `findWhereDataHas('censusKey')`
    at boot (`AppBootstrap.ts:221`) and every game day, cloning products
    into regions eagerly (the "sanctioned faucet") — which is why the
    counters are booted.
  - `ResidenceCatalogue`: `findWhereDataHas('parentExtent')` — 4 rows, all
    four booted anyway.
  - `WatercourseCatalogue.loadWorks`: `findByClass` of conduits and control
    structures, to answer upstream outfalls.
  - `FisheryRegistry.readSpecies`: `findByClass(Species)` and **loads every
    habitat species**, re-run every six game hours.
- **Reference vocabularies (12, all booted).**
  - *Warm-only* — Material, Biome, Fabric, FractionSchedule,
    MaturationProfile, Dyestuff: *"rows cannot stand themselves up, and a
    synchronous reader sees only live ones."* Material and biome reads are
    already BY PATH, so a holder loading what it cites is the whole fix;
    `MaterialApi.findByTag`/`findByElement` have no production callers.
  - *Typed-word dictionaries* — Reading (by channel), Spell (by name),
    Help concepts, Placement, Operation, Discipline (by key): ruling 1
    keeps them as lazy indexes.
  - *Attribute matches with no reference at all* — a schedule or profile
    for a material's tag (`forMaterial`), a culture for a strain, a
    dyestuff for a material path: the material should name what it
    feeds, or the match stays a lazy index.
- **Tooling:** the wiki composition page and `ls` scan whole trees; author
  tools, where a scan is arguably the point. `BlueprintCatalogue` reads
  distinct classes (code, not content).

**Boot entries (128 across 16 packs: 42 `sync-read`, 86 `producer`).**

| category | count | why eager | verdict |
|---|---|---|---|
| catalogues read synchronously | 37 | "the Api reads it synchronously" | lazy (ruling 1) or replaced by references |
| species rows read synchronously | 5 | `isSentient` fails OPEN on a cold species | a carcass / animal loads its species with itself |
| engine wardens arming timers | 11 | sweeps, ticks, presence relay | ✅ keep, with reasons |
| cache-warmers and fallbacks | 5 | warm at postRegister | lazy on first use |
| organizations looked up by path | 11 | resolved by templatePath / label | loaded by the reference that names them |
| houses that advertise (`lint:openings`) | 6 | help-wanted reads LIVE houses | flip: the room names its business |
| houses whose hand runs a beat | 21 | a seat resolves over a live house | reconcile on load (ruling 2) |
| premises rooms (stock / cast / opening) | 23 | spawn into the floor's Stock | refill on load (ruling 2) |
| buildings / warrens at postRegister | 4 | install state at postRegister | loaded with their zone |
| props / books that provide a verb | 5 | *"props: never reach a booted world"* | the reader follows a reference |

⚠ Three catalogues already load lazily and are booted anyway (Topic,
Reading, Placement), and `LocationGraphRegistry`'s own boot reason says
*"nothing reads the graph at boot."*

### Build order — Part 2

1. ⭐⭐ **Employment: the room names its operator** (it runs on every
   `look`). The business loads with the room; the help-wanted sign reads
   the business of the room you are in; `ensureOperatorAt`'s whole-table
   scan and the miss-rescan memo go; `lint:openings`' boot rule goes with
   ~50 house and premises boots. Fixtures that already author
   `businessPath` keep following it forward (`Attendant.ts:205`).
   Rosters, wages and shifts reconcile when the house loads (ruling 2).
2. ✂ **Cut to [unobserved-economy-slate](./unobserved-economy-slate.md)** (2026-10-14 review): refilling and inter-place supply are an economy design, not a loading fix. *Was:* **Stock refills on load.** The counter names its lines (`stockLines`
   exists; 6 rows author it) and tops itself up by elapsed time when it
   loads. The boot spawn sweep and the `censusKey` scan go.
3. **Water and fishing: the reach names its works and its species.**
   Contamination is computed from the works' ROWS (exact-path reads), so
   an unloaded outfall still fouls the river; the species class scan goes.
4. **Residence:** the extent's zone names its institution.
5. **Vocabularies:** warm-only catalogues are replaced by holders loading
   what they cite; typed-word dictionaries become lazy indexes
   (ruling 1); attribute matches either gain the reference on the
   material or stay lazy indexes, decided per match in the plan.
6. **Species:** a creature or carcass loads its species with itself, so
   `isSentient` cannot fail open.
7. **Part 1's remaining nine** registry scans (the screen, `branchOf`,
   press, attendant, residency's `Circulating` walk, path atoms, the wiki
   page, the `extends` cost under the template finders).

### The gates

- ⭐ **A ratchet on boot entries** — census-then-ratchet
  ([lint-family.md](../../lint-family.md)): today's 128 is the ceiling,
  it may fall and never rise, and every entry's `reason:` must name why
  the thing cannot load on use. (128 is the count after the maritime fix
  removed four: three structures and the sea.)
- **The `RegistryWideReaders` ratchet** (Part 1, § *The gate*).
- **Fix the docs that claim enforcement no gate performs:**
  `terminus/pack.yaml:131-136` and `eternal-university/pack.yaml:53` say
  `lint:openings` holds entries it never checks (the knackers', tannery's
  and chandlery's six; premises rooms); `content-packs.md:1149-1150` says
  `lint:instanceable` checks boot entries (it reads no `boot:`), and
  `:1145-1148` puts three entries in `world-seed` that live in
  eternal-university and hinkley-hills.

## Open questions

1. ~~Negative caching vs maintained indexes~~ — **answered by Part 2:**
   neither; flip the reference so the place names what is in it.
2. ~~Is the help-wanted sign the right consumer?~~ — **answered:** with
   the room naming its operator, the sign reads one business.
3. **Where stock refill time is kept.** Reconcile-on-load needs a
   "last stocked" stamp on the counter (persisted with the room); the
   plan decides whether it rides the existing snapshot or is derived
   from the clock and the counter's par.
4. **A typed-word index that misses.** Lazy means the first `measure
   <channel>` after boot pays the build; the plan says whether a miss
   rebuilds (a pack installed live) or is final.

## Cross-references

- [employment.md](../../subsystems/employment.md) · [banking.md](../../subsystems/banking.md) · [press.md](../../subsystems/press.md) · [attendant.md](../../subsystems/attendant.md) · [residency.md](../../subsystems/residency.md) · [mql.md](../../subsystems/mql.md) · [wiki.md](../../subsystems/wiki.md) · [templates.md](../../subsystems/templates.md) · [display.md](../../subsystems/display.md)
- [expanse.md](../../subsystems/expanse.md) — the maritime precedent
- [lint-family.md](../../lint-family.md) — census, then ratchet
