# Scan sweep — load on use — requirements

**Kind:** refactor/sweep
**Leads from:** kernel (first consumer: the Terminus realm as it stands —
its houses, counters, job board, gazette, registry and realtor, the
Kestrel, the Greywater, Hearts Delight's animals — plus every typed-word
verb: `measure`, `cast`, `help`, `operate`, `put`)

The realm loads content when nothing asked for it and finds content by
searching for it: ~25 template-table scans and 128 boot entries, most of
them there because a question is asked in the direction opposite to the
reference the content authors. This build makes the user's doctrine true
everywhere: **content loads when a player's act forces it, by following
authored references from what is already loaded — never by search, and
never at boot unless the reason is written down and holds.** Unobserved
simulation (shifts, wages, stock, supply between places) catches up when
the place next loads. Seeded by
[scan-sweep-slate](../slates/builds/scan-sweep-slate.md) (Part 2 is the
audit; Part 1 the registry scans).

## What already exists

- **Reconcile-on-read is the house pattern** for everything that changes
  while nobody watches: growth (`husbandry.md`), spoilage, wounds and
  vitals, metabolism, maturation, the fishery's `drawn` (`fishing.md`),
  taps, a voyage's position (`expanse.md`), fire and fuel.
- **A business can already bring itself current** on first contact: `buy`
  and `order` bring a cold house up to now, and *"the proprietor steps
  behind an empty bar when somebody orders"* (`employment.md`).
- **The maritime fix** (on `fix/maritime-lazy`) is the worked example: a
  zone names its structures and loads them with itself; what a place can
  see loads with the place; nothing is booted.
- **The siblings agree**: `eager-residency-slate` (*"everything is lazy
  loaded if we can help it"*), `npc-behavior-slate` (*"simulate what
  someone can see; derive the rest"*), `property-slate` (*"freeze is the
  reconcile-on-read pattern"*), `world-scan-perf-slate` (the `world:`
  prohibition and its gate).
- **What runs unobserved today, and is visible later**: the roster tick
  (who is behind the counter, the closed sign, wages, vacancies); the
  residency spawn and reset sweeps (shelves); and NPC beats that walk
  literal player verbs between places — goods-yard hands consigning to
  the cash-and-carry, Mara posting gigs, the carter hauling, the farmer
  filling the market, the store keeper borrowing and repaying, the
  Gazette printing the price index everyone sees at login.

**Therefore what is genuinely new here is** that *arriving at a place, or
acting at it, is what advances that place's unobserved economy*: a
house's shifts, wages, vacancies, closed sign and openings become true
when you get there; a counter's shelf refills by elapsed time; a place
that receives goods or postings from elsewhere takes in what its
suppliers would have delivered; a river carries what its reach names.
Everything else — lazy vocabularies, the residence reference, the nine
registry scans, the boot ratchet — is invisible except where it closes a
hole (a cold species row lets a collie be butchered today).

## Goals

- **No content is loaded at boot** except the engine's own wardens
  (machinery that arms timers), each with a reason that holds. The
  boot-entry count falls and cannot rise.
- **No content is found by searching the template table.** Every
  question is answered by an authored reference from something already
  loaded; where the reference pointed the wrong way, the place now names
  what is in it.
- **A house is true when you arrive.** Its help-wanted openings, who is
  behind the counter, the closed sign, wages owed and vacated seats are
  correct the first time anybody looks, with nothing booted.
- **A counter's shelf is true when you arrive**: refilled by the time
  since it was last stocked, against its par.
- **Supply between places is derived at the receiving end**: the
  cash-and-carry holds what its suppliers would have consigned; the job
  board shows the gigs its posting houses would have posted; the store
  keeper's credit history is current.
- **Cross-town listings follow references**: the realtor fronts the books
  he names; the price index reads the counters its basket names.
- **The river is honest**: an outfall fouls the reach whether or not its
  room is loaded; a reach holds the species it names.
- **Typed-word dictionaries work on first use** (`measure depth`, `cast
  firebolt`, `help <concept>`) without being booted.
- **No safety gate fails open on a cold row**: an animal's species is
  there whenever the animal is.

## Non-goals

- **An exact event replay of the gap.** Catch-up integrates against
  today's prices and par and records the approximation; exact
  piecewise integration → `reconcile-chains-slate`.
- **Visible NPC journeys between places while nobody watches** (a hand
  seen walking a crate across town) → nowhere, deliberately: supply is
  derived; a player who carries goods still does real work.
- **Who may keep a thing loaded while unobserved (pins, allowances)** →
  `eager-residency-slate`.
- **Whether players may automate labour** → `standing-instructions-slate`.
- **The spawn-distribution design beyond replacing the boot sweep** →
  `spawn-distribution-slate`.
- **Author tooling scans** (the wiki composition page's whole-tree read,
  `ls`) → kept, with the reason written down; they are tools, and a scan
  is their job.
- **New content** (new shops, new rivers) → nowhere; only the references
  existing content needs are authored.

## Placement

Kernel-led. The mechanisms (a place naming what it holds, catch-up on
load, lazy dictionaries, the boot ratchet) are kernel substrate every
pack's content rides; the authored references are content edits in the
packs that own the rows (terminus, hearts-delight, eternal-university,
hinkley-hills, the trades, water, trade-fishing). ⭐ **A second shop, a
second river, a second realtor need zero pack code** — only rows that
name what they hold.

## Collisions

- **`employment.md`'s doctrine** *"a look may not stand a house up"* and
  **`lint:openings`**' rule that an advertising house must be booted —
  **reversed** by this build (ruling 1).
- **The credit slate's drive step 6** (the keeper borrows on her own
  cadence with nobody connected) and **the livelihood slate's** NPC job
  board — preserved by derivation at the receiving end (ruling 2), and
  their docs updated.
- **`spawn-distribution-slate`** describes the recurring spawn sweep this
  build replaces with refill-on-load.
- **The Gazette and `reserve` dashboard** read live counters only today;
  unloaded basket counters silently drop out.
- **Ricky the realtor** (Terminus) fronts every plat book in the city.
- **The Kestrel's water**: readings downstream of the city outfall get
  dirtier when the outfall's room is not loaded (it was silently clean).
- **Hearts Delight's animals** (the collie, ox, ewe, hen) and the bees:
  species rows booted today to keep yields and the sentience gate right.
- **Pack manifests** (`boot:` lists in platform, terminus and 14 others)
  and the docs that claim lint enforcement no gate performs.

## Surface decisions

### 1. Arriving loads the house, and the house catches up to now
`employment.md`'s *"a look may not stand a house up"* is reversed:
loading a room loads the business the room names, and the house brings
itself current (shifts, wages, cover, vacancies, the closed sign) for the
time since it was last current. A glance is not an economic act; arriving
somewhere is, and always was in the fiction — the bar was open whether or
not you watched.

### 2. Work between places reconciles at the RECEIVING end
A place that receives goods or postings from elsewhere takes in, when it
loads, what its sources would have delivered in the gap, following the
reference it already authors (a counter's par lines name their supplier
rooms; a job board names the houses that post to it; the keeper's credit
rides her house). Supply stays independent of concurrency because it is
derived from elapsed time, not walked. *Alternative rejected:* keeping
the ~50 houses booted as an "economy warden" — that is the eager loading
the doctrine forbids.

### 3. Cross-town listings follow authored references
The realtor names the plat books he fronts and loads them when asked; the
price index loads the counters its basket names when it prints.

### 4. The river is honest
An outfall fouls the reach from its row whether or not its room is
loaded. A reach holds the species it names; a reach that names none
stops being given fish by habitat fit — so the reaches that should hold
fish are authored.

### 5. Catch-up approximates against today
Elapsed-time catch-up integrates against current prices and par and says
so; exact replay is `reconcile-chains-slate`'s.

### 6. Typed-word dictionaries are lazy indexes; everything else is a reference
Readings by channel, spells by name, help concepts, operations and
placements stay indexes (user ruling), built on first use. Materials,
biomes, fabrics, schedules, profiles and dyestuffs load with whatever
cites them; an attribute match with no reference (a material's tag to a
schedule) either gains the reference on the material or stays a lazy
index, decided per match by the plan.

### 7. Only engine wardens stay booted, and the count is gated
Every surviving boot entry states why it cannot load on use; the count is
a ceiling that may fall and never rise.

## Lens pass

- **1 Pedagogy.** The economy stays derivable: a shelf, a wage, a
  vacancy is a function of elapsed time and authored par, readable by a
  player who asks why. Nothing here exercises a Discipline; the lens's
  concern is that derivability survives the catch-up — it does, with the
  approximation stated (decision 5).
- **2 Creative expression.** ⭐ The ordinary case becomes *author a row
  that names what it holds* — a room names its business, a reach its
  works and species, a zone its structures — with no boot entry to
  remember and no lint to satisfy. That removes the most common silent
  failure an author meets today (*"a prop nothing warms is a prop that is
  not there"*).
- **3a Immersion.** The world is consistent on arrival: the bar is staffed
  as its hours say, the shelf is as full as the time since restock
  implies, the river as foul as its outfalls make it. A collie can no
  longer be butchered because its species row was cold.
- **3b Participation.** A player who carries goods, takes a haul or posts
  a gig still does work the derivation does not do for them; the job
  board still shows postings to a new player. ⚠ Gap: derived supply means
  no NPC is ever *seen* walking a crate — the visible bustle is thinner.
- **4 Values.** No undecidable choice is forced on a player; the values
  call is the platform's — that a world nobody watches does not burn
  compute (the compute-is-a-metaresource line).
- **5 Continuity.** The mechanism holds across epochs: catch-up is
  epoch-agnostic; a powered counter or a new trade answers the same
  commands.
- **6 Economy.** Production and consumption are unchanged in kind; what
  changes is *when* they are computed. Who pays: the server stops paying
  for ~370k unobserved brain invocations a day (balance-slate's figure).
  The faucets stay faucets (refill-on-load keeps the reset faucet the
  guild slate already questions — not this build's to remove).
- **7 Governance.** No person is judged.

## The drive

On a **freshly reset world**:

1. Boot. ⭐ The boot list holds only engine wardens; no house, counter,
   structure, species or catalogue is in it.
2. A new player walks into the **Hearthworks** for the first time: `look`
   shows **HELP WANTED — kitchen-hand**. `apply kitchen-hand` takes the
   job.
3. Advance the clock a game-day. Walk into the **general store**: the
   keeper (or the proprietor covering) is behind the counter; `look` at
   the counter shows a shelf refilled for the day; `buy` a loaf
   succeeds. After closing hours the counter says nobody is behind it.
4. Walk to the **cash-and-carry**: goods the goods-yard hands would have
   consigned in the gap are on the counter.
5. At a **job board**, `job` lists the gigs Mara's bar would have posted.
6. Read the **Gazette** / news ticker: the price index is computed over
   its whole basket (no counter dropped out), with none of them visited.
7. Talk to **Ricky**: he lists plat books across the city. At the
   **Registry**, `title list` shows the plat book.
8. At the **Kestrel below the city outfall**, without ever visiting the
   outfall: `analyze water` reports it fouled. `fish` at a reach that
   names species bites on one of them.
9. First use after boot of each dictionary: `measure depth` (on water),
   `readings`, `help <a concept>`, `cast` / `spells` (arcana), `operate`
   (infirmary) — each answers correctly first time.
10. At **Hearts Delight**, `butcher collie` is refused (sentience) on a
    cold world; the ewe can be shorn and the hen gives eggs.
11. Log out in a **keyed dorm room**; restart; log back in there.
12. Spot checks of Part 1: `house shop` through a paired screen; `bank`
    at a branch; `press post` as a publisher and refused as a stranger;
    disconnecting while queued at a counter drops the place.
13. The maritime drive still passes 40/40.

## Acceptance criteria

1. A fresh boot loads no house, counter, premises room, structure, sea,
   species row or content catalogue; every remaining boot entry is an
   engine warden with a stated reason.
2. The first `look` in a room whose house advertises shows its opening,
   on a world where that house was never loaded.
3. Who is behind a counter, the closed sign, wages owed and vacancies are
   correct on first arrival after any gap.
4. A counter's shelf after a gap is refilled in proportion to the gap,
   never above par.
5. The cash-and-carry, the job board and the store keeper's books reflect
   their suppliers' and posters' work over the gap without those places
   being visited.
6. The realtor lists every plat book he names; the price index covers its
   whole basket.
7. Water downstream of an outfall reads fouled whether or not the
   outfall's room was ever loaded; a reach bites only species it names.
8. `measure`, `readings`, `help <concept>`, `cast`, `spells` and `operate`
   answer correctly on first use after boot.
9. `butcher` of a sentient animal is refused on a cold world.
10. Logging back in to a keyed room after a restart works.
11. The Part 1 spot checks behave as before.
12. The maritime drive and every other shipped drive still pass.

## Cross-references

- [scan-sweep-slate](../slates/builds/scan-sweep-slate.md) — the audit
  (Part 2) and the registry scans (Part 1)
- [employment.md](../subsystems/employment.md) ·
  [retail.md](../subsystems/retail.md) ·
  [residency.md](../subsystems/residency.md) ·
  [credit.md](../subsystems/credit.md) · [press.md](../subsystems/press.md)
  · [watershed.md](../subsystems/watershed.md) ·
  [fishing.md](../subsystems/fishing.md) ·
  [residence.md](../subsystems/residence.md) ·
  [instrumentation.md](../subsystems/instrumentation.md) ·
  [magic.md](../subsystems/magic.md) · [help.md](../subsystems/help.md) ·
  [race.md](../subsystems/race.md) · [behavior.md](../subsystems/behavior.md)
  · [content-packs.md](../subsystems/content-packs.md)
- `eager-residency-slate`, `reconcile-chains-slate`,
  `spawn-distribution-slate`, `credit-slate`, `livelihood-slate`,
  `npc-behavior-slate`, `standing-instructions-slate`
- The maritime fix on `fix/maritime-lazy` (the worked example)
