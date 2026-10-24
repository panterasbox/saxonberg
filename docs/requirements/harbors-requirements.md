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
tide's window, dues, Waponi Woo's quay). It runs on the ships that exist
today — the *Hesper* and the *Ostrander* — and two regulars it authors, so it stands on
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
each ship that comes and goes with her, dues, the tide's window at the bar);
**many ships from one kind** (each her own rooms, cargo,
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
- **The harbor keeps its own record** of who lies alongside which quay, since
  when, and what she owes — what berths, dues and the harbormaster read.
- **A ship kind is built many times**: each ship of a kind has her own rooms,
  cargo and name; a ship nobody is aboard sleeps whole and wakes as she was;
  everything survives a restart.
- **An owned ship answers to her owners**: a majority of shares names her
  managing owner, the managing owner names her master, and the master (and
  whoever the master permits) has the helm. Her gangway is the master's to
  open — closed to strangers until opened.
- **A ship's hull weathers like a house's shell** — one clock for every
  structure, read in the same bands, restored by the same upkeep; on a ship a
  worn hull leaks.
- **A player can own a ship**: buy a smack from the yard and name her as she
  is entered in Terminus City's register; **title is held in shares**
  (sixty-fourths) that can be sold; she flies **one flag at a time**, and **the
  flag state's jurisdiction applies aboard at sea**.
- **A player can own a boat**: bought, owned, sold like any good; she rides
  lower as she is loaded and an overloaded boat swamps. **Or hire one** from
  the put-in's outfitter by the day.
- **Handling a craft is seamanship**: mooring, pumping and handling a ship or
  boat exercise a new **seamanship** Discipline (the seafaring build deepens
  it with crews and the watch).
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
- **The shipping news, ships overdue, and declaring a destination on
  clearing** → the slate § 18 — ⭐ cut deliberately: nothing a player does
  today consumes them, and a public feed of players' movements is the kind of
  thing that waits for real players to design and build.
- **Pilots as an arrival step, quarantine, customs and smuggling** → the slate
  § 19 (the shipped bar pilot stays as it is).
- **The sailortown, the lifeboat, the research ship, passengers and cruises**
  → the slate § 20–23.
- **Bigger ship kinds (a brig, a pleasure sloop) and crews** — the yard sells
  one kind, the smack, small enough to sail alone → `trade-seafaring` (the
  slate § 15), which makes crew size matter.
- **A second register** — only Terminus City keeps one this build; any polity
  that chooses to open a registry later is content, and re-flagging is driven
  then → the slate § 3.
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

- **The port** is a place: a new **harbor district** of the Terminus realm,
  ⭐ **inside the bar** on the Kestrel's estuary (`/world/terminus/harbor`),
  joined to the estuary. Its layout: the **Town Quay** (room for about three
  ships, the harbor office on it), the **Fish Quay** (one), the **Harbor
  Stairs** (a public landing for boats), and **the roads** outside the bar as
  the anchorage, reached by boat. Wharfside stays the river quay; the
  *Ostrander* berths there.
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
- **Today's ships get owners**: the *Hesper* and **two new regulars** (authored
  in Stage A, of different lengths, with NPC masters — the port's traffic)
  belong to a new **shipping line** (a corpo); the *Ostrander* belongs to the
  **city** (a public river service). Today's *Hesper's company* business is
  how the line runs her.
- **The Hesper's bilge pump** (a wearing tool prop today) becomes the pump
  that works her bilge.
- **Verbs**: `hail` (signal a sail) now also reaches a harbor office;
  `course` now moors; `pump` now works a bilge pump; `bail` (drilling's bailer
  down a bore) now bails a boat — one act, two targets; `register` is the TPA
  terminal's (a ship's register is read, not a new verb); `ship` is
  haulage's carriage verb (no ship verb is added); `transfer` (land title) is
  how shares change hands, if it is the honest verb — the plan decides.
- **The canoes at the put-in** (three free kind boats) — become **Ada Fenn's
  hire boats**, by the day; her boat shed also sells owned boats.

## Surface decisions

### The port is inside the bar
Lens 1: a harbor sits inside a bar because the bar shelters it from the sea,
and the price of the shelter is the tide — a ship whose draught exceeds the
water over the bar waits for the flood. Mooring is a course to a quay on the
estuary, the way a river ship comes alongside a landing.

### Owners, the managing owner, the master
Lens 1 (the historical shape, decided in the slate § 17) and lens 7 (the
criterion is named): a majority of shares names the managing owner, who names
the master; the master, and whoever the master permits, takes the helm. A sole
owner holds all three. Nobody else can set her course.

### The gangway is the master's
Lens 4 (a ship is property; walking aboard uninvited is trespass) and lens 2
(enable, never impose): the master opens her to the public, to named people,
or to nobody. A newly bought ship admits only her owners and master.

### One weathering clock for houses and ships
The owner's rule: **whatever the rule, it works the same way as residences.**
A ship's hull is her shell — the same clock (it runs while she sleeps), the
same bands, the same upkeep act and the same terms of who owes it. What the
band MEANS differs by kind: a worn house reads worn; a worn hull leaks. A
sleeping ship's leak catches up when she is next looked at (lens 1): a
neglected ship at her berth has **settled onto the shallow harbor bottom** and
can be pumped out; at anchor in deep water she would have sunk.

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
An authored named ship (the *Hesper*) is a kind built once; a ship kind (the
smack) is built as many times as it is bought; each is named, has her own
rooms and condition, and sleeps when nobody is aboard. ⭐ The yard sells **one
kind this build, the smack** — small enough to sail single-handed, which is
historically honest; the deep ship the bar's tide bites on is one of Stage A's
authored regulars, a coaster with an NPC company.

### A ship is named at registry, uniquely in that register
Lens 1 (real registers refuse a second ship of a name in the same register):
the buyer names her as she is entered; a name already in the register is
refused; the same name may sail under another flag.

### Title is a register entry in shares, under one flag
A government keeps a ship register **if it chooses to** (lens 2 and the rule
*enable authors, never impose*; lens 7 — who may register is the polity's
own call) — this build, **Terminus City**, at the harbor office. A ship is
entered in one register at a time (her **flag state**); her title is **64
shares**, held by one or many; ⭐ shares are sold by a **consented sale paid
in the same act** — the price moves with the shares or nothing moves (lens 4:
neither side can be cheated); a gift is a sale at nothing. **At sea, the
jurisdiction aboard is the flag state's** (readable with `government`); in
harbor, both the port's and the flag's. An unregistered ship is stateless. The flown flag is a thing on
her (a government's brand) and can differ from the register — false colors
are possible and readable as such by anyone who checks the register.

### A boat is owned like any good — or hired
Bought at the boat shed, carried in your title, sold or given; her draught
deepens and her freeboard falls with what is in her; overloaded, she swamps.
The put-in's canoes are **the outfitter's hire boats** (lens 6: someone
pays): hired **by the day**, kept as many days as you pay for (the clock runs
at 12×), returned to her.

### The harbor clears a ship to sail once her dues are paid
Lens 1 (real ports cleared a ship only once her dues were paid) and lens 7
(the posted criterion is *dues owed*; the appeal is the harbor works'
committee): dues accrue per day alongside at posted rates by her length;
`course` out of the harbor is refused until her managing owner has paid.

### The harbor keeps hours
Lens 1 and lens 3a (the port has a day): a ship hailing while the
harbormaster is off shift is told to lie in the roads until the office opens.

### Upkeep is `maintain`
The owner's rule (the same as residences): re-caulking a hull is the same
upkeep act as keeping a house, done with a **caulker's kit** (pitch and oakum).

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
   (shipped) and ⭐ **seamanship**, new here — mooring, pumping and handling a
   craft exercise it (decided by this lens: otherwise the build exercises
   none); the seafaring build deepens it.
2. **Creative expression** — ordinary case with no code: a new port, quay,
   ship kind or register is rows. Bespoke without breaking: an authored ship
   (the *Hesper*) is one kind built once; the yard's catalogue is a stocked
   line anyone can extend.
3. **Immersion** — a quay full of named ships, a ship that
   goes down slowly while people decide what to save. **Participation** — the
   harbormaster's seat is a job a player can hold; shipowning in shares lets a
   town own a ship together; *can the polity do something we didn't want?* —
   flags of convenience (a polity competing for registrations), a
   harbormaster who refuses on a posted criterion nobody expected.
4. **Values** — stranding someone remains a deliberate, recorded act; the
   register is public, so false colors can be found out; nobody is pressed or
   crimped (crews are the next build, coercion never a mechanic).
5. **Continuity** — oar, sail and steam answer the same `course`, `pump`,
   `maintain`; the same berth takes a sailing ship and a steamer.
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
3. A second ship (one of the line's two regulars) comes alongside the same quay: two ways, each named for its
   ship. A third, too long for what is left, is sent to the roads by the
   harbormaster, and says so.
4. The deep regular (the coaster) at low water is told to wait for the flood; at high water she
   comes in.
5. Leaving before the dues are paid: `course` is refused, naming the dues.
   Pay them; `course <somewhere>` — the way named for her is gone from the
   quay; the dues are in the harbor works' books.
6. Hail at night: lie in the roads until the office opens.

**A2 — sugar's island** (sugar merges before this build starts; driven
with Stage A)
7. The *Hesper* sails to Waponi Woo, hails, berths alongside its quay; ashore
    by the way named for her; home again to her berth at Terminus.

### Stage B — the boats

**B1 — owning a ship**
8. At the yard, `buy` a smack and name her as she is registered (a name
   already in the register is refused): she lies at the yard's quay; the
   register lists her in your name, 64 shares, under Terminus' flag.
9. A second player buys another of the same kind: her rooms are hers; what you
   leave in your hold is not in hers. The second player cannot go aboard yours
   until you open her, and cannot set your course.
10. Sell 16 shares to the second player at a price both accept; the money and
   the shares move together; the register shows both owners.
11. At sea, `government`: Terminus City, her flag state.
12. Leave her; she sleeps; restart the server; come back: she is where you
    left her, with what you left in her. Come back after weeks of game time:
    her hull reads worn and she has settled at her berth; pump her out.

**B2 — owning a boat**
13. Buy a rowboat at the boat shed; she is yours. Load her: she rides lower
    (`look` says so); overload her in a chop and she swamps.
14. Hire a canoe from Ada Fenn for two days; paddle off; return it; the hire
    is two days' money.

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
21. `maintain` her hull with a caulker's kit: the leak stops, and the hull
    reads sound. Mooring, pumping and handling her have counted toward
    seamanship.

## Acceptance criteria

- A ship moored at a quay is reached by a way named for her and by nothing
  else; when she leaves, that way is gone from the quay and from the deck.
- Two ships at one quay are two ways; a quay never takes more ships than its
  length allows, and the ship turned away is told why.
- A ship too deep for the bar is refused until the flood and admitted after
  it, without anyone changing anything but the time.
- The harbormaster's refusals name the posted criterion; a player holding the
  seat can make the call the NPC would otherwise make.
- Berth dues for a stay appear in the owner's account and the harbor works';
  a ship cannot clear the harbor with dues owing.
- A ship hailing out of office hours is sent to the roads until it opens.
- A ship's name is unique in her register; a sale of shares moves the money
  and the shares together or not at all.
- A hired canoe costs one day's hire per day kept.
- Mooring, pumping and handling a craft record seamanship.
- Only her master (or whoever the master permits) can set an owned ship's
  course; a stranger cannot go aboard a ship whose master has not opened her.
- A ship's hull and a house's shell weather on the same clock and read in the
  same bands; a neglected ship is found settled at her berth, not vanished.
- Two ships of one kind keep separate cargo, condition and names, and both are
  as they were after a restart.
- The register names every ship's owners by shares and her flag state; a sale
  of shares changes it; nobody but a shareholder can sell shares.
- Aboard at sea, the jurisdiction in force is the flag state's.
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
