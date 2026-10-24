# Harbors, ships and owners — requirements

**Kind:** feature
**Leads from:** kernel (first consumer: the Port of Terminus, built in this
build — the *Hesper* berthed, a yard selling ship kinds, a sinking driven at
the port; then Waponi Woo's jetty, converted here after sugar merges)

A ship today is a one-off: the *Hesper* and the *Ostrander* are authored
singletons, reached only by hard-wired one-way `aboard` exits, owned by
nobody, and unsinkable. Nothing moors, nothing berths, nothing is registered,
and a second ship at the same landing is "first wins". This build gives the
sea a **port** (quays with counted berths, a harbormaster, mooring by
`course`), makes ships and boats **things people own** (ship kinds built many
times from one floorplan, owned boats, a register of title by shares under a
flag), and makes a hull **something that wears out** (leaks, pumping,
swamping, and a ship that sinks slowly to the bottom and lies there as her own
wreck). It is the first build out of
[ships-and-harbors-slate](../slates/builds/ships-and-harbors-slate.md)
(§1 alongside, §2 one model, §3 registers and flags, §6 and §18 harbors, §7
leaks and sinking), compacted against the river build on 2026-10-24.

## Staging — one build, two review rounds

**Stage A — the harbor** (the port, berths, mooring, the harbormaster, the
tide's window, dues, the shipping news, Waponi Woo's quay). It runs on the
ships that exist today — the *Hesper* and the *Ostrander* — so it stands on
its own. **Stage B — the boats** (ship kinds built from a floorplan, the yard,
owned boats, the register of shares under a flag, leaks, sinking, the wreck).
B's ships berth through A, never the other way round.

⭐ **The MR opens when Stage A is complete and driven**, for the first review
round; Stage B continues as commits on the same branch and is reviewed as a
second round. One branch, one MR, one merge — the user reviews the harbor and
the boats separately, never both at once.

## What already exists

A player can already (survey 2026-10-24):

- **Sail**: `course` to a node or, on a river, a landing or the bar; `anchor`;
  `hail` a sail in sight (it only signals). Crossing the bar between the
  Kestrel and the Greywater. The bar pilot (Nell Abery, the harbor works).
- **Use boats**: `launch` / `recover` between a ship's deck and the water
  beside her; `paddle`; `pull` a swamped boat upright; carry one round an
  obstacle. Boats have a hull (length, beam, draft, freeboard, capacity) and
  swamp when a wave tops their freeboard. A water place appears beside a ship
  that has stopped at sea, shared by ships within hail.
- **Refuse to strand anyone**: `course` refuses while her own people are in
  the water, unless she leaves them deliberately — and that is recorded.
- **Stand on a quay**: Wharfside's bank is a quay (a street beside water);
  the estuary mouth, the towpath, the woodyard and Gannet Rock have one-way
  `aboard` exits hard-wired to one ship each.
- **Own and trade**: buy from a stocked line at a counter; chattel title on a
  movable; land title and its `transfer`; a business with positions and seats;
  government seats; corpo brands (a mark a flag can be).
- **Hold a home**: holdings stand up a floorplan of keyed rooms per instance,
  sleep whole when empty, and wear on a shell clock that `maintain` resets.
- **Pump a fluid** (a well, a bellows) with `pump`; **bail** a bore hole.
- **Go under**: water is a state of any place; the column below deep water;
  things that sink go to the bed; breath, buoyancy, swimming up.
- **Disciplines**: navigation (explicitly not seamanship, not pilotage),
  carpentry, swimming, diving.

Therefore what is genuinely new here is: **a port** (berths counted by quay
length, a harbormaster you hail, mooring by `course`, a way aboard named for
each ship that comes and goes with her, dues, the tide's window at the bar,
the shipping news); **many ships from one kind** (each her own rooms, cargo,
name and condition, asleep when nobody is aboard); **owned boats** that ride
lower as they are loaded; **a register** of title in shares under one flag;
**a yard** selling ship kinds; and **the hull's decline** — leaks, the bilge,
pumping and bailing, swamping, sinking slowly, and the wreck as the ship
herself on the bottom.

## Goals

- A seagoing ship comes in over the bar, is given a berth or sent to the
  roads by the harbormaster, and lies **alongside a quay** with a way aboard
  named for her; leaving, the way goes with her. Two ships at one quay are two
  ways, by name.
- **A quay holds as many ships as its length allows**; a full quay sends the
  next to the anchorage. A deep ship crosses the bar only in the high-water
  window, so the queue moves with the tide.
- **The harbormaster is a seat**: an NPC keeps the routine; a player who holds
  it decides on posted criteria, and the refusal says which.
- **Dues are derived and paid**: berth dues by the ship's size, at posted
  rates, to the harbor's own account.
- **The port's arrivals and departures are public** — the shipping news.
- **A ship kind is built many times**: each ship of a kind has her own rooms,
  cargo and name; a ship nobody is aboard sleeps whole and wakes as she was;
  everything survives a restart.
- **A player can own a ship**: buy one from the yard; she is entered in a
  government's register in the buyer's name; **title is held in shares**
  (sixty-fourths) that can be sold; she flies **one flag at a time**, can be
  re-flagged, and **the flag state's law applies aboard at sea**.
- **A player can own a boat**: bought, owned, sold like any good; she rides
  lower as she is loaded and an overloaded boat swamps.
- **A hull wears**: neglected caulking leaks into the bilge; the crew pumps a
  ship and bails a boat; left alone the water rises, rooms flood from the
  lowest up, and she sinks — slowly enough for the people aboard to act.
- **A sunk ship is her own wreck**: on the bottom where she went down, her
  rooms under water, her cargo in her hold, her title intact; divers can go
  down to her; nobody knows where she lies until someone charts her.
- **Waponi Woo's jetty becomes a quay with berths** (after sugar merges), and
  the *Hesper*'s and *Ostrander*'s hard-wired `aboard` exits become berths.

## Non-goals

- **A boat crossing the open sea** (Bligh's launch, rowing for land) — a boat
  under way at sea needs a sea place the boat drives →
  [ships-and-harbors-slate](../slates/builds/ships-and-harbors-slate.md) § 17
  (contradicted by the river build's *boats are never positioned*; reconcile
  there).
- **Crews, the watch, master and mate, the mariners' guild, shipping as a
  business** → the slate § 15–17 (`trade-seafaring`, the next build).
- **Insurance, general average, bottomry** → the slate § 17.
- **Pilots as an arrival step, quarantine, customs and smuggling** → the slate
  § 19 (the shipped bar pilot stays as it is).
- **The sailortown, the lifeboat, the research ship, passengers and cruises**
  → the slate § 20–23.
- **Boatbuilding and shipbuilding** — ships are bought as minted stock from the
  yard until construction ships the slip → the slate § 9 and
  [construction-slate](../slates/builds/construction-slate.md).
- **Salvage law** (raising a wreck, salvors' rights) → the slate § 7 *getting
  her back*; this build keeps title intact on the bottom and nothing more.
- **Craft archetypes and media by parts** (the hovercraft) → the slate § 4.
- **Life aboard by tenure** (seasickness, watches breaking sleep, class aboard)
  → the slate § 8.
- **Rafting** (deck to deck) and **the careening hard, slipway and boathouse**
  → the slate § 6, *what else a harbor holds*.
- **Dragging anchors, fire and explosion in a crowded harbor** → the slate § 18.

## Placement

- **The port** is a place: a new **harbor district** of the Terminus realm at
  the estuary mouth, beside the bar (`/world/terminus/harbor`), joined to the
  estuary. Wharfside stays the river quay; the *Ostrander* berths there.
- **The harbor authority** is the city's existing **harbor works** (a
  committee-appointed business): the harbormaster is a **second seat** there,
  beside the pilot's; dues are paid to the harbor works' account.
- **Berths, mooring, and owned boats** are transport's (`/system/transport`) —
  how craft lie alongside places, true wherever there is water and a quay.
- **The sea's places that know their ships, the bottom a wreck lies on**, are
  water's (`/system/water`).
- **Ships built from a floorplan, the register, title in shares, the flag**
  are the kernel's — a register is a government's, beside its seats.
- **The yard** is a seller in the harbor district selling ship kinds as a
  stocked line; its kinds are rows.
- ⭐ **The second-instance test**: a second port (Waponi Woo's, a mere's
  landing) is **rows only** — quays with lengths, a seat, posted rates; a
  second ship kind is **rows only** — a floorplan of existing rooms; a second
  government's register needs no code.

## Collisions

- **The *Hesper*** (lies at the bar; one-way `aboard` from the estuary mouth
  and Gannet Rock) → berthed at the new port; Gannet Rock's ledge keeps a
  landing for boats. Her hold becomes persistent like any ship's rooms.
- **The *Ostrander*** (one-way `aboard` from Wharfside, the woodyard, the falls
  landing) → berths at Wharfside; the woodyard and falls landing become berths
  she comes alongside.
- **The estuary mouth** (*a craft lies here to put people ashore*) — the port
  sits beside it; the mouth stays a landing.
- **The-pool node** (going ashore there puts you in the water) — the harbor is
  where a ship goes ashore dry.
- **Waponi Woo** (sugar's, on its branch): its jetty and the hard-wired
  `aboard` become a quay with berths — **after sugar merges** (decided: sugar
  first).
- **The harbor works** (Nell Abery, the pilot; the harbor board) gains the
  harbormaster's seat.
- **The Hesper's bilge pump** (a wearing tool prop today) becomes the pump
  that works her bilge.
- **Verbs**: `hail` (signal a sail) now also reaches a harbor office;
  `course` now moors; `pump` now works a bilge pump; `bail` (drilling's bailer
  down a bore) now bails a boat — one act, two targets; `register` is the TPA
  terminal's (a ship's register is read, not a new verb); `ship` is
  haulage's carriage verb (no ship verb is added); `transfer` (land title) is
  how shares change hands, if it is the honest verb — the plan decides.
- **The canoes at the put-in** (three free kind boats) — stay free hire; the
  boat shed sells owned boats beside them.

## Surface decisions

### Mooring has no new verb
`course <quay>` moors her alongside it; any other course unmoors; the way
aboard on the quay is **named for her** (`go hesper`) and her deck gains the
way ashore. Decided in the slate (§ 6); a ship alongside is mentioned by the
quay's `look` as a derived line, never as a thing in the room.

### Berths are a quay's length
A quay's **authored length** against each ship's length says how many fit;
the quay is full when they do not. Berths are **counted** and **assigned**
this build; **leased berths** (a berth held for years, the liveaboard's
address) are not — they wait for life aboard (§ 8).

### The harbormaster decides on posted criteria
An arrival `hail`s the harbor office: a berth by length and kind, or the
roads; **refusals name the criterion** (no berth long enough, draught over the
bar until the flood, unpaid dues). An NPC holds the seat by default; a player
appointed to it makes the calls, and the appeal is to the harbor works'
appointing committee.

### The tide's window at the bar
A ship whose draught exceeds the water over the bar at the time waits for the
flood — derived from the shipped tide and her draught, never rolled.

### Ship kinds and singletons are one model
An authored named ship (the *Hesper*) is a kind built once; a ship kind (a
smack, a brig) is built as many times as it is bought; each is named, has her
own rooms and condition, and sleeps when nobody is aboard.

### Title is a register entry in shares, under one flag
Each government keeps a ship register. A ship is entered in one register at a
time (her **flag state**); her title is **64 shares**, held by one or many;
shares are sold between people; re-flagging moves her to another register.
**At sea, the law aboard is the flag state's**; in harbor, both the port's and
the flag's. An unregistered ship is stateless. The flown flag is a thing on
her (a government's brand) and can differ from the register — false colors
are possible and readable as such by anyone who checks the register.

### A boat is owned like any good
Bought at the boat shed, carried in your title, sold or given; her draught
deepens and her freeboard falls with what is in her; overloaded, she swamps.

### Leaks are the hull's condition, read as water
Caulking wears like any sealant; a worn or holed hull lets water into the
bilge at a rate by the damage. Pumping (a ship) or bailing (a boat) moves it
out at the worker's effort. Nothing is rolled: neglect is visible, measurable
(sounding the well), and its consequence is time.

### Sinking takes time, and the wreck is the ship
The bilge rises; rooms flood from the lowest up; when she can no longer float
she goes down. People still aboard are in rooms now under water and can swim
up the column. The wreck **is the ship** — the same rooms, at depth, cargo in
the hold, title intact — at the bottom where she sank; in a river she becomes
an obstruction. Nobody knows where she lies until someone charts her.

## Lens pass

1. **Pedagogy** — buoyancy, draught and freeboard (load against the water
   line); leak rate against pump rate (a tank-filling problem with a bad
   ending); the tide's window (draught against the water over the bar);
   capacity as geometry (berths from length). Disciplines: navigation
   (shipped); **seamanship** is the gap — the plan decides whether pumping,
   mooring and handling a boat exercise it or it waits for `trade-seafaring`.
2. **Creative expression** — ordinary case with no code: a new port, quay,
   ship kind or register is rows. Bespoke without breaking: an authored ship
   (the *Hesper*) is one kind built once; the yard's catalogue is a stocked
   line anyone can extend.
3. **Immersion** — a quay full of named ships, the shipping news, a ship that
   goes down slowly while people decide what to save. **Participation** — the
   harbormaster's seat is a job a player can hold; shipowning in shares lets a
   town own a ship together; *can the polity do something we didn't want?* —
   flags of convenience (a polity competing for registrations), a
   harbormaster who refuses on a posted criterion nobody expected.
4. **Values** — stranding someone remains a deliberate, recorded act; the
   register is public, so false colors can be found out; nobody is pressed or
   crimped (crews are the next build, coercion never a mechanic).
5. **Continuity** — oar, sail and steam answer the same `course`, `pump`,
   `repair`; the same berth takes a sailing brig and a steamer.
6. **Economy** — produces: berth dues for the harbor works, a yard's sales,
   pumping and caulking work, wreck diving. Consumes: ships, pitch and oakum
   (caulking). Who pays: shipowners, in dues and upkeep. Was the demand there
   first: yes — sugar's voyage is held for berths, and freight has nowhere to
   land. ⚠ Ships are minted stock until construction ships.
7. **Governance** — the harbormaster judges PEOPLE: criterion posted (length,
   draught at the tide, dues owed), appeal to the harbor works' committee,
   entrenchment: tier C (the polity's). The register's law aboard is the flag
   state's: who can register a ship is each government's own rule.

## The drive

### Stage A — the harbor

**A1 — the port**
1. On the *Hesper* lying at the bar, the master `hail`s the harbor office: the
   harbormaster answers with a berth at a named quay (or the roads, and why).
2. `course <quay>`: she comes in and lies alongside. On the quay, `look` names
   her alongside; the quay's ways include `hesper`. On her deck, `ashore`
   leads to the quay.
3. A second ship comes alongside the same quay: two ways, each named for its
   ship. A third, too long for what is left, is sent to the roads by the
   harbormaster, and says so.
4. A deep ship at low water is told to wait for the flood; at high water she
   comes in.
5. Leaving: `course <somewhere>` — the way named for her is gone from the
   quay. The dues are charged to her owner's account and appear in the harbor
   works' books.
6. Read the shipping news: her arrival and departure are there.

**A2 — sugar's island** (sugar merges before this build starts; driven
with Stage A)
7. The *Hesper* sails to Waponi Woo, hails, berths alongside its quay; ashore
    by the way named for her; home again to her berth at Terminus.

### Stage B — the boats

**B1 — owning a ship**
8. At the yard, `buy` a ship of a kind (a smack): she is yours, named, lying
   at the yard's quay; the register lists her in your name, 64 shares, under
   Terminus' flag.
9. A second player buys another of the same kind: her rooms are hers; what you
   leave in your hold is not in hers.
10. Sell 16 shares to the second player; the register shows both owners.
11. Re-flag her to another government's register; her flown flag can be
    changed separately, and the register still tells the truth.
12. At sea, ask what law applies aboard: the flag state's. In harbor: both.
13. Leave her; she sleeps; restart the server; come back: she is where you
    left her, with what you left in her.

**B2 — owning a boat**
14. Buy a rowboat at the boat shed; she is yours. Load her: she rides lower
    (`look` says so); overload her in a chop and she swamps.

**B3 — the hull's decline**
15. Aboard an old ship whose caulking is worn, sound the well: there is water
    in the bilge, rising.
16. `pump` the bilge pump: the level falls while you work; stop, and it rises.
17. Let it go: the lowest rooms flood, then the next; you are told she is
    settling; she goes down.
18. Still aboard, you are in her rooms under water; swim up the column to the
    surface.
19. A diver goes down to her: the wreck is the ship — her rooms, her cargo in
    the hold — and she is still in your name in the register.
20. A leaking boat: `bail` keeps her up; stop, and she sinks to the bottom
    with what is in her.
21. `repair` the caulking on a sound ship: the leak stops.

## Acceptance criteria

- A ship moored at a quay is reached by a way named for her and by nothing
  else; when she leaves, that way is gone from the quay and from the deck.
- Two ships at one quay are two ways; a quay never takes more ships than its
  length allows, and the ship turned away is told why.
- A ship too deep for the bar is refused until the flood and admitted after
  it, without anyone changing anything but the time.
- The harbormaster's refusals name the posted criterion; a player holding the
  seat can make the call the NPC would otherwise make.
- Berth dues for a stay appear in the owner's account and the harbor works'.
- Two ships of one kind keep separate cargo, condition and names, and both are
  as they were after a restart.
- The register names every ship's owners by shares and her flag state; a sale
  of shares changes it; nobody but a shareholder can sell shares.
- Aboard at sea, the law in force is the flag state's.
- An owned boat changes hands like any good, and her freeboard reading falls
  as she is loaded until she swamps.
- A leaking ship left alone sinks; pumped, she does not; nothing in the outcome
  is random.
- The people aboard a sinking ship have time to act; anyone still aboard ends
  up under water in her rooms and can reach the surface.
- A sunk ship's rooms, cargo and title are intact on the bottom, reachable by
  diving, and not on anyone's map until charted.
- After sugar merges, Waponi Woo is reached by berthing, not by a hard-wired
  exit.

## Cross-references

- Seeding slate: [ships-and-harbors-slate](../slates/builds/ships-and-harbors-slate.md)
  (§ 1, 2, 3, 6, 7, 18; compacted 2026-10-24)
- [construction-slate](../slates/builds/construction-slate.md) (the slip;
  ships bought as stock until then)
- Subsystems: [expanse.md](../subsystems/expanse.md) ·
  [river.md](../subsystems/river.md) · [holding.md](../subsystems/holding.md) ·
  [residence.md](../subsystems/residence.md) · [chattel.md](../subsystems/chattel.md) ·
  [assembly.md](../subsystems/assembly.md) · [pump.md](../subsystems/pump.md) ·
  [underwater.md](../subsystems/underwater.md) · [civics.md](../subsystems/civics.md) ·
  [employment.md](../subsystems/employment.md) · [retail.md](../subsystems/retail.md) ·
  [corpo.md](../subsystems/corpo.md) · [location-graph.md](../subsystems/location-graph.md)
- In flight: sugar (`reqs/sugar`, build-1) — merges first; its held voyage
  wave meets this build at Waponi Woo.
