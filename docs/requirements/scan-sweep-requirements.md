# Scan sweep — load on use — requirements

**Kind:** refactor/sweep
**Leads from:** kernel (first consumer: the Terminus realm as it stands —
its houses and their help-wanted signs, the registry and the realtor, the
Kestrel, Hearts Delight's animals, the keyed dorm rooms — plus every
typed-word verb: `measure`, `readings`, `cast`, `spells`, `help`,
`operate`, `put`)

The realm finds content by searching for it (~25 template-table scans)
and loads content nobody asked for (128 boot entries), mostly because a
question is asked in the direction opposite to the reference the content
authors. This build makes the user's doctrine true for **loading**:
**content loads when a player's act forces it, by following authored
references from what is already loaded — never by search, and never at
boot unless the reason is written down and holds.** Seeded by
[scan-sweep-slate](../slates/builds/scan-sweep-slate.md) (Part 2 the
audit, Part 1 the registry scans).

⚠ **Revised 2026-10-14 (review).** The first draft drifted into
simulating the NPC economy — counters refilling by elapsed time, supply
derived between places, Gazette editions. That is a different design and
was **cut** to
[unobserved-economy-slate](../slates/builds/unobserved-economy-slate.md).
Houses whose NPCs act while nobody is present stay booted, each with a
reason that points there.

## What already exists

- **The maritime fix** (`fix/maritime-lazy`) is the worked example: a
  zone names its structures and loads them with itself; what a place can
  see loads with the place; nothing is booted.
- **A room already names what loads with it**: `props:` and `cast:` stand
  up the things placed in it when it loads. What is missing is the same
  for things that are not *contained* — an Idea such as a business, a
  structure or an institution.
- **Identity references** ([ref-shapes.md](../ref-shapes.md)) — a path
  string to a singleton row — re-resolve on read and answer *nothing* if
  the target was never loaded. That nothing is the hole every boot-warmed
  catalogue patches.
- **A counter already stocks itself when it stands up**, and a house can
  already bring itself current on first contact (`buy` / `order`).
- **The location graph** is the one sanctioned index: a record of the
  world's shape that routing reads without loading content.

**Therefore what is genuinely new here is** that a place names the
non-contained things that stand with it, a row loads the singletons it is
*made of* when it loads, a relation is resolved when an act follows it,
and a reverse question is answered by flipping the reference — so the
scans and most of the boot entries go. The visible changes are small and
honest: a house's opening shows the first time you look with the house
never booted; the river below an outfall reads fouled whether or not the
outfall was ever loaded; a cold world no longer lets a collie be
butchered.

## Goals

- **No content is found by searching the template table**, outside a
  short list of sanctioned homes (the location graph, author tooling,
  typed-word dictionaries, and what the unobserved economy keeps), each
  with its reason. The count can fall and never rise.
- **Nothing is booted to answer a question.** What remains booted is the
  engine's own wardens and the houses and premises the unobserved economy
  keeps running, each with its reason. The count can fall and never rise.
- **A place names what stands with it** — a room or a zone, whichever the
  relation belongs to — and it loads when the place loads.
- **A row loads the singletons it is made of** (its material, biome,
  species) when it loads, so a synchronous question about it never meets
  a cold row.
- **A relation is resolved when an act follows it** (a treasury, an
  organization, a business's premises), never pre-loaded.
- **A house's opening is visible the first time anybody looks**, with the
  house never booted.
- **The river is honest**: an outfall fouls the reach from its row; a
  reach holds the species it names.
- **Cross-town listings follow references**: the realtor fronts the books
  he names; the price index reads the counters its basket names.
- **Typed-word dictionaries work on first use** without being booted.
- **No safety gate fails open on a cold row.**
- **Nothing new is persisted that an existing record already holds.**

## Non-goals

- **The NPC economy while nobody is online** — whether NPC trade, gigs,
  credit, deliveries and the Gazette run unobserved, and how (against the
  location graph's record) → `unobserved-economy-slate`. Its houses and
  premises stay booted with reasons pointing there.
- **The residency spawn and reset sweeps** (the faucet) → the same slate;
  their template read stays, allowlisted with that reason.
- **Who may keep a thing loaded while unobserved (pins, allowances)** →
  `eager-residency-slate`.
- **Author tooling scans** (the wiki composition page, `ls`) → kept,
  allowlisted with the reason: a scan is a tool's job.
- **New content** → nowhere; only the references existing content needs
  are authored.

## Placement

Kernel-led. The mechanisms (a place naming what stands with it, rows
loading what they are made of, lazy dictionaries, the two ratchets) are
kernel substrate; the authored references are content edits in the packs
that own the rows. ⭐ **A second shop, a second river, a second realtor
need zero pack code** — only rows that name what they hold.

## Collisions

- **`employment.md`'s** *"a look may not stand a house up"* and
  **`lint:openings`**' rule that an advertising house must be booted —
  reversed for loading: the house stands with its place and loads with it.
- **The Kestrel's water**: readings downstream of the city outfall get
  dirtier when the outfall's room was never loaded (silently clean today).
- **Hearts Delight's animals** and the bees: species rows booted today to
  keep yields and the sentience gate right.
- **Pack manifests** (`boot:` lists in platform, terminus and 14 others)
  and the docs that claim lint enforcement no gate performs.
- **The unobserved economy's houses** stay booted — untouched except for
  their reasons.

## Surface decisions

### 1. A place names what stands with it
A room or a zone names the non-contained things that stand with it — a
business, a structure, an institution — and they load when it does,
alongside `props:` and `cast:`. It is one list on any place, not a field
per kind and not zones only: the author puts it where the relation
belongs (a shop room names its house; a district zone names its tower).

### 2. Two kinds of identity reference
- **A constituent** — what the holder is made of (its material, its
  biome, its species) — loads **with** the holder, because questions
  about the holder are answered synchronously.
- **A relation** — something the holder points at (a treasury, an
  organization, its premises, its proprietor) — is resolved **when an act
  follows it**, at that moment. Loading a business must never load its
  rooms.
- A path to a row that is **not** a singleton is a *kind* (what a harvest
  yields, what a bow shoots), not an identity: nothing loads; minting
  from it is an act.
- A provenance claim (`sampledAt`) is never resolved.

### 3. Arriving loads the house, and it is current
Loading a room loads the business that stands with it, and the house is
current as of now through the catch-up it already has. A glance is not an
economic act; arriving somewhere is.

### 4. Cross-town listings follow authored references
The realtor names the plat books he fronts; the price index loads the
counters its basket names when it computes.

### 5. The river is honest
An outfall fouls the reach from its row whether or not its room is
loaded. A reach holds the species it names; the reaches that should hold
fish are authored.

### 6. Typed-word dictionaries are lazy indexes
Readings by channel, spells by name, help concepts, operations and
placements stay indexes (user ruling), built on first use, never booted.
An attribute match with no reference (a material's tag to a schedule)
stays a lazy index.

### 7. Persistence policy
1. Persist only what cannot be derived from an existing record (the
   ledger, the clock, the row).
2. State is captured with its host — the nearest persistable ancestor —
   never as a record of its own.
3. Losing unpersisted state when a thing unloads is legitimate: it comes
   back as its row says.
4. A captured record lives exactly as long as its host's identity: it is
   deleted when the host is destroyed, and never migrated.

### 8. What stays booted, and why
The engine's own wardens, and the houses and premises the unobserved
economy keeps running (→ `unobserved-economy-slate`). Every other entry
goes. The count is a ceiling that may fall and never rise.

## Lens pass

- **1 Pedagogy.** No Discipline is exercised; derivability is unchanged.
- **2 Creative expression.** ⭐ The ordinary case becomes *author a row
  that names what stands with it* — no boot entry to remember, no lint to
  satisfy. It removes the commonest silent failure an author meets
  (*"a prop nothing warms is a prop that is not there"*).
- **3a Immersion.** The world is consistent on arrival: a house's opening
  is there the first time you look; the river is as foul as its outfalls
  make it; a cold species can no longer let a collie be butchered.
- **3b Participation.** Unchanged — the economy is untouched by this
  build.
- **4 Values.** The platform's call: a world nobody watches does not load
  or search for content it does not need.
- **5 Continuity.** Epoch-agnostic: a reference is a reference.
- **6 Economy.** Untouched by design (→ `unobserved-economy-slate`).
- **7 Governance.** No person is judged.

## The drive

On a **freshly reset world**:

1. Boot. The boot list holds only engine wardens and the unobserved
   economy's houses and premises, each with its reason; no catalogue,
   structure, sea, species row or advertising-only house is in it.
2. A new player walks into a house that advertises and is not booted:
   `look` shows its **HELP WANTED** line; `apply` takes the job.
3. Talk to **Ricky**: he lists the plat books he names. At the
   **Registry**, `title list` shows the plat book.
4. The Gazette / news ticker's price index covers its whole basket.
5. At the **Kestrel below the city outfall**, with the outfall never
   visited: `analyze water` reports it fouled. `fish` at a reach that
   names species bites on one of them.
6. First use after boot of each dictionary: `measure depth`, `readings`,
   `help <a concept>`, `cast` / `spells`, `operate` — each answers
   correctly first time.
7. At **Hearts Delight**, `butcher collie` is refused on a cold world;
   the ewe can be shorn and the hen gives eggs.
8. Log out in a **keyed dorm room**; restart; log back in there.
9. Part 1 spot checks: `house shop` through a paired screen; `bank` at a
   branch; `press post` as a publisher and refused as a stranger;
   disconnecting while queued at a counter drops the place.
10. The maritime drive and every other shipped drive still pass.

## Acceptance criteria

1. A fresh boot loads no content catalogue, structure, sea, species row,
   organization or advertising-only house; every remaining boot entry is
   an engine warden or an unobserved-economy house/premises with a stated
   reason.
2. The first `look` in a room whose house advertises shows its opening on
   a world where that house was never loaded.
3. The realtor lists every plat book he names; the price index covers its
   whole basket.
4. Water downstream of an outfall reads fouled whether or not the
   outfall's room was ever loaded; a reach bites only species it names.
5. `measure`, `readings`, `help <concept>`, `cast`, `spells` and `operate`
   answer correctly on first use after boot.
6. `butcher` of a sentient animal is refused on a cold world.
7. Logging back in to a keyed room after a restart works.
8. The Part 1 spot checks behave as before.
9. Every shipped drive still passes.

## Cross-references

- [scan-sweep-slate](../slates/builds/scan-sweep-slate.md) — the audit
  (Part 2) and the registry scans (Part 1)
- [unobserved-economy-slate](../slates/builds/unobserved-economy-slate.md)
  — what was cut, and the location graph as its record
- [ref-shapes.md](../ref-shapes.md) — identity vs instance references
- [employment.md](../subsystems/employment.md) ·
  [residency.md](../subsystems/residency.md) ·
  [persistence.md](../subsystems/persistence.md) ·
  [watershed.md](../subsystems/watershed.md) ·
  [fishing.md](../subsystems/fishing.md) ·
  [residence.md](../subsystems/residence.md) ·
  [instrumentation.md](../subsystems/instrumentation.md) ·
  [magic.md](../subsystems/magic.md) · [help.md](../subsystems/help.md) ·
  [race.md](../subsystems/race.md) ·
  [content-packs.md](../subsystems/content-packs.md) ·
  [location-graph.md](../subsystems/location-graph.md)
- `eager-residency-slate`, `spawn-distribution-slate`
- The maritime fix on `fix/maritime-lazy` (the worked example)
