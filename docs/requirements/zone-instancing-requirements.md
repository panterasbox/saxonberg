# Zone instancing — requirements

**Kind:** refactor/sweep (cross-cutting architecture with a player-visible
result: copies of a place are separate places).
**Leads from:** kernel. **First consumer:** the holdings — Hinkley Hills'
sold lots, Hearts Delight's farmstead, Duncan Hall's dorm units and Seznick
House's let units — and the navigation map, which already records each copy
as itself ([navigation-server-requirements](./navigation-server-requirements.md),
S15, on its own branch). Ships of a kind (the smack), the authored ships and
moving water follow in the same build.

Seeded by [zone-instancing-slate](../slates/engine/zone-instancing-slate.md).
A place that the game makes many copies of — a house on a lot, a dorm room,
a smack's decks, the patch of river around a drifting boat — is today a set
of rooms in **one shared zone** (the zone of the row every copy is made
from), with positions the game makes up per copy and stores on no map. So
the world cannot tell house A from house B, every copy's ways out are
exempt from the rules every other way obeys, and the map has to work
around it. This build makes **each copy a zone of its own**, named by
whoever makes the copies, and retires the workaround.

## What already exists

- **Copies, and who makes them.** Five kinds of copy exist, each made by
  a "warren" (the thing that manages a family of places):
  - **holdings**: a house on a sold lot (Hinkley Hills), the farmstead
    (Hearts Delight), a dorm unit (Duncan Hall), a let unit (Seznick
    House) — all made from a holding plan, named by the parcel they
    stand on;
  - **ships of a kind** (the smack), named by their registry serial;
  - **authored ships** (the Hesper, the Corrigan, the Kittiwake, the
    Ostrander), which are not copies at all: each is its own zone,
    written by hand, and the ship machinery adopts her rooms;
  - **reach patches** (the river within hail of a boat) and **sea
    patches** (the water beside a stopped ship), made per drift and
    never kept.
- **A mine is the counter-example.** Its cut cells sit on its own zone's
  grid, one mine, one zone. It is untouched.
- **A corridor that grows** (the dorm's floors, a plat's lanes) is a
  place in its parent's zone, laid one step from its neighbor. It is
  not a copy and is untouched.
- **The map** (`map`, `map <locality>`) shows what you have perceived,
  grouped by locality and building. The navigation-server build, in
  flight, records a room in a copy under **the copy's name** — the same
  name this build gives the copy's zone — so neither build migrates
  anything for the other.
- **The identity rule** ([ref-shapes.md](../ref-shapes.md)): what kind
  a thing is comes from its row; which one it is comes from the name its
  maker mints. Every player's body already works this way.

**Therefore what is genuinely new here is:** a zone can have copies, each
named by its maker; a room in a copy belongs to the copy's zone; and the
special case built around their absence ("frames") goes away.

## Goals

- **Each copy is its own zone**, named by the warren that made it,
  under a naming rule that warren declares. Two houses on two lots are
  two zones; two smacks are two zones.
- **A room in a copy has real positions on its copy's grid.** A copy's
  rooms are laid out by the plan author with positions like every other
  place, not invented at run time.
- **Ways inside a copy obey the same rules as ways anywhere**, and the
  way out of a copy is an ordinary way from one zone to another.
- **The pattern is one capability any warren can take on**: naming its
  copies, waking and sleeping a whole copy, and joining the copy's
  entrance to the world. A new kind of copy needs rows, not code.
- **What can be copied is declared in content.** A zone row says that
  its copies are made by a warren, and of which kind; a warren row says
  which zone it copies, how copies are named and where they join. Only
  *which copies exist right now* is run-time knowledge.
- **The world's index of places records copies** as they are made and
  removes them when they are destroyed, so the whole graph of zones can
  still be asked about, and the firewall between that index and players
  is unchanged.
- **One shape for "a ship".** The authored ships become single copies of
  their kind, so every ship a player boards is the same kind of thing and
  answers the same commands.
- **Copies survive a restart under the same names.** A house, a dorm
  unit and a ship come back as themselves.

## Non-goals

- **The navigation map's display of copies** →
  [navigation-server-requirements](./navigation-server-requirements.md)
  (S15). This build supplies the zone that build's claims already name.
- **Mines and growing corridors** → nowhere, deliberately. A mine is one
  zone; a corridor grows on its parent's grid. Neither is a copy.
- **Copying a whole locality or district** (instanced dungeons, a second
  Terminus) → nowhere yet. This build copies the zones warrens already
  copy rooms from; a bigger copy can reuse the capability later and
  would be its own slate.
- **Where a copy joins the world changing at run time for anything but a
  ship** (moving a house to another lot) → nowhere, deliberately. A
  holding is joined where its parcel is.
- **Changes to what a player can do in a house, a dorm or on a ship.**
  Every verb answers as it does today; the drive proves it.

## Placement

Kernel. The zone machinery, the capability a warren takes on and the
index are the platform's; the warrens that take it on live where they
already live (the residence system, the platform's ships, the water
system). Their rows gain the declarations.

The second-instance test: **a new kind of copy needs zero code** — a zone
row that says it is copied, a warren row that says how — and a second
copy of an existing kind needs nothing at all.

## Collisions

- **Hinkley Hills, Hearts Delight, Duncan Hall, Seznick House** — every
  holding plan's room rows gain authored positions (they carry none
  today, by design). Every sold lot, dorm unit and let unit stands up in
  its own zone instead of its neighborhood's.
- **The smack and the four authored ships** — the smack's decks become a
  zone per serial. The authored ships stop being hand-written zones and
  become copies of their kind; their people, cargo and berths must come
  through unchanged (harbors' berth roll, mooring lines, charters and
  bills).
- **The Kestrel and the Greywater** — reach and sea patches become
  short-lived copies.
- **The edge rules** — the special exemption for a way into or out of a
  copy goes away; every way out of a copy is a way between zones, which
  the rules already treat as a threshold.
- **The navigation-server build** (in flight, MR !585) — its claims name
  a copy by the same path this build mints as the copy's zone (agreed
  2026-11-16). A dorm unit's single room today shares its name with its
  copy; the room is renamed, never the copy, so the map's names hold.

## Surface decisions

### A copy is named by its maker **[DECIDED — the owner, in the slate]**
The warren that makes a copy names it under a rule it declares — the
parcel a holding stands on, a ship's kind and serial. The name is the
copy's identity; the row it is made from is its kind.

### What a copy inherits **[DECIDED here — lens 3a]**
A copy takes its own settings from its row, and everything it does not
set — government, weather, sky, the ground's character — from **where it
stands**: a house on a Hinkley lot answers to Hinkley's government and
weather, not to wherever the plan was filed. *Immersion chose: a house
cannot belong to the folder its plan lives in.*

A **ship** moves, so where she stands keeps changing. Her own settings
come from her kind; what is around her (weather, government, the water)
is read from where she lies, as it is today. Her zone itself is filed
under her kind, so her name does not change when she sails.

### The authored ships become copies of their kind **[DECIDED here — lens 5]**
The Hesper and the others are single copies of their kind, named as
every ship is. *Continuity chose: one thing a player sees as a ship must
answer the same commands, whoever made it.* What is authored about each
(her name, her rooms' furnishing, where she lies at boot) stays authored.

### Moving water becomes short-lived copies **[DECIDED here — lens 1]**
A reach or sea patch is a copy of its kind made for one drift and never
kept. Nothing about a patch is worth recording: the map records the river
or the sea and the position on it, never the patch (agreed with the
navigation-server build). *Pedagogy chose: you learn the river, not the
water that happened to be around you.*

### What is kept, and what is not **[DECIDED here]**
A copy's zone keeps nothing of its own; its maker makes it again when it
wakes. Holdings, dorm units and ships are kept (their names already
survive a restart); patches are not. *The record of which copies exist
lives with the things that already keep it — the parcel book, the ship
register — so the only run-time knowledge is which ones are awake.*

### A sleeping copy is still on the map
A copy is removed from the world's index when it is **destroyed**, never
when it sleeps. A house nobody is in still stands.

### What the checks can still prove **[DECIDED — the owner, in the slate]**
The checks cannot list the copies — they exist only at run time — so
they check what content says: every zone row that claims to be copied
has a warren that copies it, and every naming rule resolves.

## Lens pass

1. **Pedagogy.** The map stops lying: two houses are two places, and a
   player learning the lane learns each house. A river is learned as a
   river. No Discipline is added; navigation's existing ones read
   truer.
2. **Creative expression.** The ordinary case gets easier: a plan author
   gives rooms positions like everywhere else, and a new kind of copy is
   rows. The bespoke case (an authored ship) stays authored, as a copy.
3. **Immersion & participation.** A house answers to the government and
   weather of the lot it is on. A copy's door out obeys the same rules as
   any door. Nothing new to roleplay; the fiction stops contradicting
   itself (two houses at the same spot).
4. **Values.** None forced. The owner decided the architectural price
   (the zone graph is partly run-time) and how narrow to keep it.
5. **Continuity.** One shape for a ship; any later kind of copy (a
   caravan, a train car) takes the same capability. ⚠ Gap: a ship
   changing epochs (sail to steam) is a new kind, not a changed copy —
   unaddressed and not needed yet.
6. **Economy.** Produces and consumes nothing. Indirectly, a lot's house
   now unambiguously belongs to that lot, which is the plat book's
   premise.
7. **Governance.** A copy inherits the jurisdiction it stands in, so
   whose law applies in a house is the lot's, derivably. No new
   judgment of a person.

## The drive

Paces: `instant` · `short` · `staged`. No `span` step; the build has no
clock-driven outcome. All steps are blocking.

1. `staged` — Two lots on Hinkley Hills are sold to two characters, and
   each house is standing.
2. `instant` · player — The first character walks from the lane into
   their house and through every room. `look` in each room reads as it
   does today, and every way inside the house is where the plan says it
   is.
3. `instant` · player — The second character does the same in the house
   next door. `map hinkley-hills` (or the locality's name) lists the two
   houses as two places, each with its own rooms; neither house's rooms
   appear under the other.
4. `instant` · player — In a house, a wizard's zone read names that
   house's own zone (named for its lot), not the neighborhood's, and
   names the lot's government and weather as the house's.
5. `short` · player — A character steps out of their front door onto the
   lane. The way out is ordinary: no refusal, no new message.
6. `staged` — A student is admitted to a Duncan Hall dorm unit; they walk
   in, `look`, and walk out to the corridor. Their unit is its own zone.
7. `staged` — A smack is staged at a quay; a character boards her and
   walks her decks. A second smack beside her is a different zone; the
   first's rooms are not the second's.
8. `instant` · player — The character boards the Hesper. Everything
   harbors shipped answers as before: the gangway, the berth roll, `pay
   office`, `charter`. She is a copy of her kind, named as a ship.
9. `short` · player — A character casts off in a boat on the Kestrel and
   drifts. The water around them reads as before; `map` records the
   river and the position, never the patch.
10. `short` · staged — Restart the world. Each house, the dorm unit, the
    smack and the Hesper come back under the same names, with the same
    rooms; the characters' maps still match them.

## Acceptance criteria

- Two copies of the same plan are two places on a player's map, and a
  wizard reads two zones, each named by its maker.
- A house's rooms answer to the government and weather of its lot.
- Every way in and out of a copy behaves as any way does; a player sees
  no change crossing it.
- A plan's rooms carry positions written by the author; nothing invents
  a room's position at run time.
- Every ship a player can board — written by hand or made from a kind —
  is the same kind of thing, and everything harbors shipped (berths,
  lines, dues, charters, the gangway) still works on each.
- A drifting boat's water reads as before, and the map never records a
  patch.
- After a restart, every kept copy returns under the same name with the
  same rooms, and players' maps still match.
- A new kind of copy can be added with rows only.

## Cross-references

- Seeding slate: [zone-instancing-slate](../slates/engine/zone-instancing-slate.md)
- Subsystems: [zone.md](../subsystems/zone.md) ·
  [holding.md](../subsystems/holding.md) · [ship.md](../subsystems/ship.md)
  · [harbor.md](../subsystems/harbor.md) · [river.md](../subsystems/river.md)
  · [location-graph.md](../subsystems/location-graph.md) ·
  [boundary.md](../subsystems/boundary.md) · [ref-shapes.md](../ref-shapes.md)
- In flight: [navigation-server-requirements](./navigation-server-requirements.md)
  (MR !585, S15 — the copy's name)
