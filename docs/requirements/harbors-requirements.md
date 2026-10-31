# Harbors, ships and owners — requirements

**Kind:** feature
**Leads from:** kernel (first consumer: the Port of Terminus, built in this
build — the *Hesper* berthed, a yard selling ship kinds, a sinking driven at
the port; then Waponi Woo's jetty — sugar merged 2026-10-27)

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
leaks and sinking), compacted against the river build on 2026-10-24, and
reviewed on 2026-10-31 against what merged since (pace, seats, law and order,
guarantees of play, the soak lane) and the cordage build (MR !502).

**Cordage is in flight, not a dependency.** Its MR (!502) is open; this build
neither waits for it nor assumes it lands first. Its whole branch is there to
plan around: where harbors meets rope (her lines, a boat's painter, oakum,
ropework), harbors stands on what master has and is shaped to meet cordage's
rule — whichever of the two merges second reconciles.

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
  carpentry, swimming, diving — and, from cordage, **ropework** (knots).
- **Rope** (cordage, MR !502 — in flight, not yet on master): one rope whose use is where its ends are tied
  (`tie` / `untie`, `coil`, a line heaved only once coiled); the painter is a
  rope; worn and rotted rope sells back for less. The Wharfside heaving line
  is a rope; its bollard is only in the description.
- **Coats on a good** (ceramics): tar and pitch as a coat that sets as it
  cools — a boat's hull among the goods that carry one.

Therefore what is genuinely new here is: **a port** (berths counted by quay
length, a harbormaster you hail, mooring by `course` with her own lines made
fast to the quay's bollards, a way aboard named for each ship that comes and
goes with her, dues, the tide's window at the bar, a ship chandler);
**many ships from one kind** (each her own rooms, cargo,
name and condition, asleep when nobody is aboard); **owned boats** that ride
lower as they are loaded; **a register** of title in shares under one flag;
**a yard** selling ship kinds; and **the hull's decline** — leaks, the bilge,
pumping and bailing, swamping, sinking slowly, and the wreck as the ship
herself on the bottom.

## Goals

- A seagoing ship comes in over the bar, is given a berth or sent to the
  roads by the harbormaster, and lies **alongside a quay**, held by her own
  lines made fast to its bollards, with a way aboard named for her; leaving,
  her lines come in and the way goes with her. Two ships at one quay are two
  ways, by name.
- **A quay holds as many ships as its length allows**; a full quay sends the
  next to the anchorage. A deep ship crosses the bar only in the high-water
  window, so the queue moves with the tide.
- **The harbormaster is a seat**: an NPC keeps the routine and covers any
  shift no player holds; a player who holds it decides within the posted
  criteria — never beyond them — and every refusal cites its criterion.
- **Dues are derived and paid**: berth dues by the ship's size, at posted
  rates, to the harbor's own account.
- **A ship chandler on the Town Quay** sells what a ship consumes: the
  caulker's kit (pitch and oakum) and mooring line.
- **The harbor keeps its own record** of who lies alongside which quay, since
  when, and what she owes — what berths, dues and the harbormaster read.
- **A ship kind is built many times**: each ship of a kind has her own rooms,
  cargo and name; a ship nobody is aboard sleeps whole and wakes as she was;
  everything survives a restart.
- **An owned ship answers to her owners**: a majority of shares names her
  managing owner, the managing owner names her master, and only the master
  has the helm. Her gangway is a door the master locks and unlocks; her keys
  are the master's to hand out.
- **A ship's hull weathers like a house's shell** — one clock for every
  structure, at the same rate, read in the same bands, restored by the same
  upkeep; on a ship a worn hull leaks.
- **A player can own a ship**: buy a smack from the yard and name her as she
  is entered in Terminus City's register; **title is held in shares**
  (sixty-fourths) that can be sold; she flies **one flag at a time**, and **the
  flag state's jurisdiction applies aboard at sea**.
- **A player can own a boat**: bought, owned, sold like any good, with her
  painter; she rides lower as she is loaded and an overloaded boat swamps.
  **Or hire one** from the put-in's outfitter by the day.
- **Handling a craft is seamanship**: mooring, pumping and handling a ship or
  boat exercise a new **seamanship** Discipline that builds on ropework and
  leaves knots to it (the seafaring build deepens it with crews and the
  watch).
- **A hull wears**: a ship's neglected caulking leaks into the bilge; a boat's
  leaks from use and damage; the crew pumps a ship and bails a boat; left
  alone the water rises, rooms flood from the lowest up, and she sinks —
  slowly enough for the people aboard to act.
- **A sunk ship is her own wreck**: on the bottom where she went down, her
  rooms under water, her cargo in her hold, her title intact; divers can go
  down to her; nobody knows where she lies until someone charts her.
- **Waponi Woo's jetty becomes a quay with berths**, and
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
- **Running rigging replaced on a schedule, and the chandler's bulk trade** —
  cordage handed both to the ships build; this build's chandler sells the
  kit and mooring line only, and rigging stays authored → `trade-seafaring`
  (the slate § 15).
- **Picking oakum** (the act, historically forced labor) → the prison slate;
  oakum here is a good the chandler sells.
- **Coir and sisal** (rope that resists seawater) → the cordage slate.
- **Pricing by the real hour instead of the world's day** → the pace build
  (its open question 4); this build's rates are grain.

## Placement

- **The port** is a place: a new **harbor district** of the Terminus realm,
  ⭐ **inside the bar** on the Kestrel's estuary (`/world/terminus/harbor`),
  joined to the estuary. Its layout: the **Town Quay** (room for about three
  ships, the harbor office on it), the **Fish Quay** (one), the **Harbor
  Stairs** (a public landing for boats, where a rescuer can carry someone up
  out of the water), and **the roads** outside the bar as the anchorage,
  reached by boat. Every quay has **bollards** — real fixtures a line is made
  fast to. Wharfside stays the river quay; the *Ostrander* berths there (every
  compass point off its bank is taken, so ways to and from it are named).
- **The ship chandler** is a seller on the Town Quay.
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
  landing for boats. (Her hold is already persistent — sugar did that.)
- **The *Ostrander*** (one-way `aboard` from Wharfside, the woodyard, the falls
  landing) → berths at Wharfside; the woodyard and falls landing become berths
  she comes alongside.
- **The estuary mouth** (*a craft lies here to put people ashore*) — the port
  sits beside it; the mouth stays a landing.
- **The-pool node** (going ashore there puts you in the water) — the harbor is
  where a ship goes ashore dry.
- **Waponi Woo** (sugar's, merged 2026-10-27): its jetty — a plain landing
  with a one-way `aboard` hard-wired to the *Hesper* — becomes a quay with
  berths.
- ⚠ **Sugar's island-sugar loop** (the Sugar House's bounty: a player buys a
  block at the estate, goes aboard the *Hesper* at Waponi Woo, sails her home
  over the bar, delivers it) depends on a player taking her helm. Under this
  build's rule (only her master steers) the loop survives by **charter**
  (below); **sugar's drive step 20 changes to charter her first** — this
  build owns that edit, which lands in sugar's soak drive (the voyage is a
  span step; sugar's whole drive moved to the soak lane).
- **Cordage** (MR !502): its ropewalk is off Wharfside's towpath, up the
  river — no collision with the harbor district. Its heaving line on the
  Wharfside quay steps is a rope with a bollard only in prose; the harbor's
  bollards are real. Its `belay` is the climbing sense; the nautical sense
  (making fast to a pin) is a future seamanship collision, not this build's.
- **The harbor works** (Nell Abery, the pilot; the harbor board) gains the
  harbormaster's seat.
- **Today's ships get owners**: the *Hesper* and **two new regulars** (authored
  in Stage A, of different lengths, with NPC masters — the port's traffic)
  belong to a new **shipping line** (a corpo); the *Ostrander* belongs to the
  **city** (a public river service). Today's *Hesper's company* business is
  how the line runs her — and how she is **chartered**.
- **The Hesper's bilge pump** (a wearing tool prop today) becomes the pump
  that works her bilge.
- **Verbs**: `hail` (signal a sail) now also reaches a harbor office;
  `course` now moors; `pump` now works a bilge pump; `bail` (drilling's bailer
  down a bore) now bails a boat — one act, two targets; `register` is the TPA
  terminal's (a ship's register is read, not a new verb); `ship` is
  haulage's carriage verb (no ship verb is added); `transfer` (land title) is
  how shares change hands, if it is the honest verb — the plan decides.
- **The canoes at the put-in** (three free kind boats) — become **Ada Fenn's
  hire boats**, by the day; her boat shed also sells owned boats. Every boat,
  owned or hired, comes with a painter, and the shed stocks them.

## Surface decisions

### The port is inside the bar
Lens 1: a harbor sits inside a bar because the bar shelters it from the sea,
and the price of the shelter is the tide — a ship whose draught exceeds the
water over the bar waits for the flood. Mooring is a course to a quay on the
estuary, the way a river ship comes alongside a landing.

### Owners, the managing owner, the master
Lens 1 (the historical shape, decided in the slate § 17) and lens 7 (the
criterion is named): a majority of shares names the managing owner, who names
the master (`appoint`); **only the master takes the helm** this build — mates
and helmsmen wait for crews. A sole owner holds all three. Nobody else can set
her course.

### The gangway is the master's — a lockable door with keys
Lens 4 (a ship is property; the lock is the wall — the criminal code has no
trespass, because a system that already prevents the act needs no law), lens
2 (enable, never impose; no new verb) and lens 5 (the new object answers the
same commands): her gangway is a door — `unlock` it and anyone may board,
`lock` it and only those holding her key may; the master hands out keys as a
householder does. A newly bought ship is locked, her key with her owner.
⛔ **A lock refuses boarding, never leaving** — anyone aboard can always go
ashore (the guarantee that you can always leave any place and reach home).

### One weathering clock for houses and ships
The owner's rule: **whatever the rule, it works the same way as residences.**
A ship's hull is her shell — the same clock (it runs while she sleeps), **the
same rate** (the residence setting — today about a game season, some days of
real time, from sound to the worst band),
the same bands, the same upkeep act and the same terms of who owes it. What
the band MEANS differs by kind: a worn house reads worn; a worn hull leaks. A
sleeping ship's leak catches up when she is next looked at (lens 1): a
neglected ship at her berth has **settled onto the shallow harbor bottom** and
can be pumped out; one left untended at anchor in deep water for that long
has sunk — real neglect, longer than a weekend away. Told as states ("after a long
absence"), never as a number of days.

### A boat leaks from use, not the calendar
A boat is a good, not a structure (lens 1, and the economy's rule that a good
decays by what happens to it): she leaks from wear in use and from damage —
a holed hull, a grounding — never from the calendar. Her caulking is a coat
on her hull, like any tarred good's. Only a ship's hull is on the shell
clock.

### The *Hesper* is chartered
Lens 1 (a charter — hiring the whole ship — is how a merchant historically
moved a cargo; the slate § 17), lens 3b (the player stays the carrier, the
hole sugar's economy was built around) and lens 6 (the charterer pays the
line). A **voyage charter** (lens 1: voyage and time charters are both
historical, and a voyage outlasts any fixed few days): it runs **until she
next berths**, and is **billed by the world's days it lasted**; arranged
**aboard her wherever she lies** (her company's hand keeps the book) or at
the line's desk on the Town Quay; **the charterer is her master for the
charter** — the helm is theirs, and so is clearing her dues; when the charter
ends she lies where she berthed, and the next charterer finds her there.
Chartering the line's regulars is the same rows, if the line offers them.

### Mooring has no new verb — and her lines are real rope
`course <quay>` brings her alongside it and **makes her own lines fast to
the quay's bollards**; any other course casts them off and takes them in.
Lens 1 (lines hold a ship alongside, and making fast is seamanship) chose
real lines over a prose abstraction; lens 2 kept the ordinary case at one
command. The lines are rope from her own gear — under cordage's rule, their use is
where their ends are tied (whichever of the two builds lands second makes
them the same rope): a ship with **no line aboard is refused**
("she has no lines to make fast"), and a line cast off a bollard by hand
leaves her unmoored. The way aboard on the quay is **named for her** (`go
hesper`) and her deck gains the way ashore. A ship alongside is mentioned by
the quay's `look` as a derived line, never as a thing in the room.

### Berths are a quay's length
A quay's **authored length** against each ship's length says how many fit;
the quay is full when they do not. Berths are **counted** and **assigned**
this build; **leased berths** (a berth held for years, the liveaboard's
address) are not — they wait for life aboard (§ 8).

### The harbormaster decides on posted criteria
An arrival `hail`s the harbor office: a berth by length and kind, or the
roads; **refusals cite the criterion** (no berth long enough, draught over
the bar until the flood, unpaid dues, the office closed). An NPC holds the
seat by default and covers every shift no player holds; a player appointed to
it makes the calls **within the posted criteria** — *a player's authority is
never more than the NPC's*, so a new criterion is one the harbor works'
committee posts, never one a seat-holder invents at the quay. The appeal is
to that committee, which answers for the NPC as for the player.

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
Bought at the boat shed with her painter, carried in your title, sold or
given; her draught deepens and her freeboard falls with what is in her;
overloaded, she swamps. The put-in's canoes are **the outfitter's hire
boats** (lens 6: someone pays): hired **by the world's day**, kept as many
days as you pay for, returned to her. A painter longer than a few meters is
coiled before it is thrown, as any rope is.

### The harbor clears a ship to sail once her dues are paid
Lens 1 (real ports cleared a ship only once her dues were paid) and lens 7
(the posted criterion is *dues owed*; the appeal is the harbor works'
committee): dues accrue per world's day alongside at posted rates by her
length — including while she sleeps; `course` out of the harbor is refused
until her managing owner has paid. ⛔ **The harbor detains the ship, never
the people**: anyone aboard can always go ashore.

### Rates are grain
Berth dues, the canoe hire and the charter are priced per world's day at
rates their owners post (the harbor works, Ada Fenn, the line) — **grain**,
an author's default to change, not law. The pace design calls pricing per
game day a monetary shock for an owner away a weekend and leaves the
per-real-hour alternative open; that decision is the pace build's, and these
rates follow it.

### The chandler
Lens 6 (caulking and mooring create the demand; cordage handed the chandler
to this build): a seller on the Town Quay with the **caulker's kit** (pitch,
and oakum — a good whose honest source is old rope) and **mooring line**.
Picking oakum is not this build's.

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
she goes down. The last stage — told she is settling — is **encounter pace**,
sized in acts, not seconds: long enough for a person aboard to do several
things (grab what matters, get a boat away, go over the side), because *no
window shall be shorter than the act that answers it*. People still aboard
are in rooms now under water and can swim up the column. Rope in a flooded
hold rots as any wet rope does. The wreck **is the ship** — the same rooms, at depth, cargo in
the hold, title intact — at the bottom where she sank; in a river she becomes
an obstruction. Nobody knows where she lies until someone charts her.

## Lens pass

1. **Pedagogy** — buoyancy, draught and freeboard (load against the water
   line); leak rate against pump rate (a tank-filling problem with a bad
   ending); the tide's window (draught against the water over the bar);
   capacity as geometry (berths from length). Disciplines: navigation
   (shipped), ropework (cordage's — her lines made fast) and ⭐
   **seamanship**, new here, building on ropework — mooring, pumping and
   handling a craft exercise it (decided by this lens: otherwise the build
   exercises none); the seafaring build deepens it.
2. **Creative expression** — ordinary case with no code: a new port, quay,
   ship kind or register is rows. Bespoke without breaking: an authored ship
   (the *Hesper*) is one kind built once; the yard's catalogue is a stocked
   line anyone can extend.
3. **Immersion** — a quay full of named ships, a ship that
   goes down slowly while people decide what to save. **Participation** — the
   harbormaster's seat is a job a player can hold; shipowning in shares lets a
   town own a ship together; *can the polity do something we didn't want?* —
   flags of convenience (a polity competing for registrations), a harbor
   works committee that posts a criterion nobody expected (the seat-holder
   applies it; they never invent one).
4. **Values** — stranding someone remains a deliberate, recorded act; the
   register is public, so false colors can be found out; nobody is pressed or
   crimped (crews are the next build, coercion never a mechanic); a lock or a
   detention holds a ship, never a person — anyone can always go ashore.
5. **Continuity** — oar, sail and steam answer the same `course`, `pump`,
   `maintain`; the same berth takes a sailing ship and a steamer.
6. **Economy** — produces: berth dues for the harbor works, a yard's sales,
   pumping and caulking work, wreck diving, the chandler's trade. Consumes:
   ships, pitch and oakum (caulking), mooring line (cordage's ropewalk). Who
   pays: shipowners, in dues and upkeep. Was the demand there
   first: yes — sugar's voyage is held for berths, and freight has nowhere to
   land. ⚠ Ships are minted stock until construction ships.
7. **Governance** — the harbormaster judges PEOPLE: criterion posted (length,
   draught at the tide, dues owed, office hours), cited in every refusal; the
   seat confers authority, never verbs, and a player's never exceeds the
   NPC's; appeal to the harbor works' committee, which answers for the NPC;
   entrenchment: tier C (the polity's). The register's law aboard is the flag
   state's: who can register a ship is each government's own rule.

## The drive

⛔ **No merge waits on the clock** (workflow.md § No merge waits on the
clock). Every step carries its pace — `instant` · `short` (within a game
day) · `staged` (its state set up with test tools, never waited for) ·
`span` — and whether it asserts the **player**'s experience (player verbs
and player-held tools only) or that nothing broke (**staged** setup is
fine). The **blocking drive** is the merge's exit criterion and holds no
span step; every span step has a staged twin there, and lives in the **soak
drive**, which the soak lane runs after merge. A clock jump runs no brain, so
the regulars' own movements are driven by wizard commands, never waited for.

### Blocking drive

#### Stage A — the harbor

**A1 — the port**
1. *(instant · player)* On the *Hesper* lying at the bar, the master `hail`s
   the harbor office: the harbormaster answers with a berth at a named quay
   (or the roads, and why).
2. *(short · player)* `course <quay>`: she comes in and lies alongside, her
   lines made fast to the quay's bollards. On the quay, `look` names her
   alongside; the quay's ways include `hesper`. On her deck, `ashore` leads
   to the quay.
3. *(short · staged)* A second ship (one of the line's two regulars, moved by
   a wizard `course`) comes alongside the same quay: two ways, each named for
   its ship. A third, too long for what is left, is sent to the roads by the
   harbormaster, and says so.
4. *(short · player)* The deep regular (the coaster) at low water is told to
   wait for the flood; at high water she comes in.
5. *(short · player)* Leaving before the dues are paid: `course` is refused,
   citing the dues — and everyone aboard can still go ashore. Pay them;
   `course <somewhere>` — her lines come in, the way named for her is gone
   from the quay; the dues are in the harbor works' books.
6. *(short · player)* Hail at night: lie in the roads until the office
   opens.
7. *(instant · player)* A ship with no line aboard is refused at the quay:
   she has no lines to make fast.

**A2 — the charter, and sugar's island**
8. *(instant · player)* Aboard the *Hesper* at Waponi Woo, charter her: you
   are her master; `course bar` is yours to give. Without the charter, it is
   refused.
9. *(staged · player — twin of soak S3)* With the chartered *Hesper* staged
   lying off the bar, hail, berth at the Town Quay, clear her dues, go ashore
   by the way named for her: the charter has ended, and its days are in the
   line's books.
10. *(staged · player — twin of soak S3)* Charter her again, staged lying off
    Waponi Woo: she hails and berths alongside its quay; ashore by the way
    named for her — no hard-wired exit remains.

#### Stage B — the boats

**B1 — owning a ship**
11. *(instant · player)* At the yard, `buy` a smack and name her as she is
    registered (a name already in the register is refused): she lies at the
    yard's quay; the register lists her in your name, 64 shares, under
    Terminus' flag.
12. *(instant · player)* A second player buys another of the same kind: her
    rooms are hers; what you leave in your hold is not in hers. The second
    player cannot go aboard yours while her gangway is locked, and cannot set
    your course; hand them her key and they can come aboard (still not take
    the helm). Lock her with them aboard: they can still go ashore.
13. *(instant · player)* Sell 16 shares to the second player at a price both
    accept; the money and the shares move together; the register shows both
    owners.
14. *(short · player)* At sea, `government`: Terminus City, her flag state.
15. *(instant · player)* Leave her; she sleeps; restart the server; come
    back: she is where you left her, with what you left in her.
16. *(staged · player — twin of soak S1)* With her hull staged worn and her
    sleep staged long: she has settled at her berth; her hull reads worn;
    pump her out.

**B2 — owning a boat**
17. *(instant · staged — a chop pinned)* Buy a rowboat at the boat shed,
    painter included; she is yours. Load her: she rides lower (`look` says
    so); overload her in a chop and she swamps.
18. *(instant · player)* Hire a canoe from Ada Fenn for two days: the charge
    is two days' money, taken at hire; paddle off; return it.

**B3 — the hull's decline**
19. *(staged · player — twin of soak S1)* Aboard an old ship whose caulking
    is staged worn, sound the well: there is water in the bilge, rising.
20. *(short · player)* `pump` the bilge pump: the level falls while you work;
    stop, and it rises.
21. *(short · staged — twin of soak S2; the bilge staged near the line)* Let
    it go: the lowest rooms flood, then the next; you are told she is
    settling, with time to act; she goes down.
22. *(instant · player)* Still aboard, you are in her rooms under water; swim
    up the column to the surface.
23. *(instant · player)* A diver goes down to her: the wreck is the ship —
    her rooms, her cargo in the hold — and she is still in your name in the
    register.
24. *(short · player)* A boat holed on a grounding leaks: `bail` keeps her
    up; stop, and she sinks to the bottom with what is in her.
25. *(instant · player)* `maintain` the ship's hull with a caulker's kit
    bought at the chandler: the leak stops, and the hull reads sound.
    Mooring, pumping and handling her have counted toward seamanship.

### Soak drive (the soak lane, after merge)

- **S1** *(span)* A ship left asleep at her berth weathers from sound to worn
  at the house's rate, and is found settled, not vanished.
- **S2** *(span)* A worn ship left at anchor in deep water sinks over that
  absence; pumped, a leaking ship does not sink.
- **S3** *(span)* The two voyages, sailed in full: chartered from Waponi Woo
  home over the bar, and back — and sugar's step 20 with its charter.

## Acceptance criteria

### Stage A — the harbor

- A ship moored at a quay is reached by a way named for her and by nothing
  else; when she leaves, that way is gone from the quay and from the deck.
- A moored ship is held by her own lines made fast to the quay's bollards; a
  ship with no line aboard is refused, and the refusal says so.
- Two ships at one quay are two ways; a quay never takes more ships than its
  length allows, and the ship turned away is told why.
- A ship too deep for the bar is refused until the flood and admitted after
  it, without anyone changing anything but the time.
- The harbormaster's refusals cite the posted criterion; a player holding the
  seat can make the call the NPC would otherwise make, and no call the posted
  criteria do not allow; an NPC covers every shift no player holds.
- Berth dues for a stay appear in the owner's account and the harbor works';
  a ship cannot clear the harbor with dues owing, and nobody aboard her is
  ever kept from going ashore.
- A ship hailing out of office hours is sent to the roads until it opens.
- Waponi Woo is reached by berthing, not by a hard-wired exit.
- The *Hesper*'s helm is refused to anyone without a charter (or the line's
  appointment); a charterer holds it until she next berths and pays for the
  days it lasted, and sugar's island loop is carried home that way.
- The chandler on the Town Quay sells a caulker's kit and mooring line.

### Stage B — the boats

- Two ships of one kind keep separate cargo, condition and names, and both are
  as they were after a restart.
- A ship's name is unique in her register; the register names every ship's
  owners by shares and her flag state; a sale of shares moves the money and
  the shares together or not at all; nobody but a shareholder can sell shares.
- Only her master can set an owned ship's course; with her gangway locked,
  only someone holding her key can go aboard, and anyone aboard can always
  leave.
- Aboard at sea, the jurisdiction in force is the flag state's.
- An owned boat changes hands like any good, and her freeboard reading falls
  as she is loaded until she swamps; she comes with her painter. A hired
  canoe costs one day's hire per day kept. A boat leaks from use and damage,
  never from the calendar.
- A ship's hull and a house's shell weather on the same clock, at the same
  rate, and read in the same bands; a neglected ship is found settled at her
  berth, not vanished; nothing fails over a weekend away.
- A leaking ship left alone sinks; pumped, she does not; nothing in the outcome
  is random.
- The people aboard a sinking ship have time to act — several acts, once
  told she is settling; anyone still aboard ends up under water in her rooms
  and can reach the surface.
- A sunk ship's rooms, cargo and title are intact on the bottom, reachable by
  diving, and not on anyone's map until charted.
- Mooring, pumping and handling a craft record seamanship.

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
- Sugar (merged 2026-10-27, MR !439): its island-sugar loop meets this build
  at Waponi Woo, and its drive step 20 (now in its soak drive) gains the
  charter.
- Cordage (MR !502, in flight — not a dependency): one rope, `tie`, the
  painter, ropework — `docs/subsystems/cordage.md` on its branch
  (`reqs/cordage`).
- Doctrine this review applied: [workflow.md](../workflow.md) § No merge
  waits on the clock · [the pace slate](../slates/builds/pace-slate.md) (encounter and absence paces, *"'Day'
  means the world's day"*, its open question 4) · [the emergency-services
  slate](../slates/builds/emergency-services-slate.md) § seats (*a player's authority is never more than the NPC's*) · the
  [law-and-order slate](../slates/builds/law-and-order-slate.md) (no trespass; the lock is the wall) ·
  [measurement.md](../measurement.md) guarantees of play (you can always
  leave and reach home) · [faces.md](../subsystems/faces.md) (a coat on a
  boat's hull).
