# Ships and harbors slate — craft, berths, and life aboard

> **Status: UNBUILT** — designed 2026-10-19 with the owner, high level; the
> drill-downs follow. The maritime build shipped `Ship` (a Structure with a
> position — the *Hesper*), a singleton `Boat` (the dinghy), `launch` /
> `recover`, `AboardExit` / `AshoreExit`, and the barge; no harbor exists →
> [expanse.md](../../subsystems/expanse.md). Supersedes
> [navigable-water-slate](./navigable-water-slate.md) § 7a where they differ.
> **Left:** boats in water rooms only, ships alone in the field · boats as
> minted, Durable, chattel assemblies with capacity and derived draught ·
> the expanse Warren budding sea rooms where ships stop · *a ship is always
> alongside a room* — exits wired on arrival, unwired on departure, named
> for her, transient · singleton and minted as one `(scope, key)` model ·
> `Ship extends Structure` + `Named`, owning her floorplan, keyed rooms,
> whole-ship dormancy and condition · a Structure row naming its warren ·
> ship registers per government, flags, the flag state's law · craft
> ARCHETYPES (the shipped venue archetype) and media by parts · harbors —
> anchor vs alongside, berths on quays, the harbormaster, mooring by
> `course` · leaks, the pump, swamping, sinking to the bed as her own wreck ·
> life aboard by tenure · boatbuilding under carpentry · the pack map
> **Size:** a build — and several; the drill-downs decide

**Sits on:** [expanse.md](../../subsystems/expanse.md) ·
[residence.md](../../subsystems/residence.md) (`(scope, key)`,
`DeferredDestinationExit`) · [holding.md](../../subsystems/holding.md)
(`HoldingWarren`, floorplan, keyed rooms, whole-holding dormancy, the shell
clock) · [location.md](../../subsystems/location.md) (Warrens) ·
[civics.md](../../subsystems/civics.md) · [corpo.md](../../subsystems/corpo.md)
(marks) · [content-packs.md](../../subsystems/content-packs.md) (the
`archetype` document kind) · [assembly.md](../../subsystems/assembly.md) ·
[underwater-slate](./underwater-slate.md) (and build-4's plan: the
`ColumnWarren`, D7 neighbours, D9 sinking) · [river-slate](./river-slate.md)
§ 10 · [construction-slate](./construction-slate.md) ·
[decomposition-slate](./decomposition-slate.md) ·
[wellbeing-slate](./wellbeing-slate.md) · the sleep slate (cleanliness
branch).

---

## 0. Where it stood, and the faulty assumptions (2026-10-19)

A survey of what shipped found:

1. **Three boat models** — a launched `Boat` detaches and holds a position at
   sea; the barge moves room to room; the river and underwater slates put a
   boat inside the water's room. A launched boat can never land; `Boat` is a
   **singleton** (one row, one boat — none can be bought or built) and not
   `Durable`.
2. **"The hull may be assumed"** — nothing hosts a hull, yet upkeep, sinking,
   draught, capacity and repair all need one.
3. **A ship's rooms do not persist** — deck and hold are non-persistable, so
   cargo and wear vanish on restart.
4. **Ships are realm content only** — the *Hesper*'s crew is appointed by the
   PM office; no owner, title or registry; § 7a's "title in the parcel's
   shape" conflated the code-maintenance axis with fictional ownership.
5. **The berth was argued on a false premise** — § 7a: *the way aboard must
   not be an exit* because *"a ship's interior is minted per ship"*; ships
   turned out authored, and exits shipped. A landing finds its sea through ONE
   authored ship; with several alongside, the first wins.
6. **"No berths to let"** — right for the water-holder; it left berths, dues
   and moorings with no owner anywhere.
7. Small: going ashore at the-pool lands you **in the water**; *"sails on with
   nobody aboard"* is one watch at load; haulage's verb `ship` will collide
   with the noun; stale prose (logistics D5's *hull plus a warren*, § 7f's
   *hull row*).

**What holds**: *a boat is a thing you are in, a ship a place you are aboard*;
the hull-as-Thing refusal; stations as `Chamber`s (*the station is where the
gear is*); draught derived from the holds; one `Ship` across frames (river
slate); the berth as the liveaboard's address.

## 1. ⭐⭐⭐ Boats and ships — where each can be **[DECIDED]**

> **A boat is one space and a Thing; a ship is many spaces and a Structure.**
> ⚠ *Corrected the same day (§ 17): "only ships enter the open field" was too
> strict — a boat crosses the field the way a ship does (positioned under way,
> a Thing in a budded room when stopped).*
> ⛔ **Never a Location inside a Location; never a Thing standing in for a
> Structure.**

- A multi-room craft (a narrowboat: cabin and deck) is **a small ship** — you go
  *aboard*.
- A ship in a river or harbor is **alongside** a room, never in it; the room's
  `look` mentions her as a **derived line** read from the frame, never a Thing.

### The expanse Warren — the sea's own rooms

The owner rejected *water that belongs to a ship* (*"what are you actually
modelling here… how do you know if it's starboard or portside"*):

- **The expanse buds surface-water rooms where ships stop** — a third Warren
  consumer beside the river's stretches and the column's bands; reaped when
  empty. Each is a water place citing the sea there (sea state, depth, fish,
  a column below).
- ⭐ **Keyed to a cell of about hailing distance**, not to a ship, so **ships
  stopped near each other share one room** — their boats row between them; a
  rendezvous is ordinary co-presence.
- **A ship hove to drifts with the band's set, and the room with her**; anchored
  holds both. You need only have stopped, never to have anchored.
- **`launch`, `recover` and over the side** move between her deck and that room.
- ⭐ **`course` is refused while her own boats or people are in the water** —
  *"the dinghy's still in the water, and Tam's swimming off the starboard
  quarter — recover them first, or `course … leaving them`."* Nobody is
  stranded by forgetting; leaving someone is a deliberate act the
  accountability ledger records. Only her own count.

### ⭐⭐⭐ A ship is always alongside a room

| water | the rooms | how she moves |
|---|---|---|
| the expanse (or a lake you cannot see across) | budded where she stops | a course across the field; under way she is alongside nothing |
| a river | the `RiverWarren`'s stretches + authored places | the river voyage — a distance along |
| ⭐ a fully authored water (a mere, a basin, a canal, a lagoon) | the authored water places | **room to room through their water exits**; her position IS which room she is alongside; admission = her draught against the room's `depthM`, her beam against an exit's width |

**Exits come and go with her** (*"putting 'aboard' on every water place for a
ship that's not there 90% of the time is stupid"*): arriving alongside, she
**wires** an exit on that room **named for her** (`hesper`) to her deck, and
`over the side` / `ashore` on her deck back; leaving, she **unwires** them —
the Warren's shipped `wireHubExit` / `unwireHubExit`. Restart-safe (her
position persists; the water loads its attached craft, which re-wire). The
semantic-exit zone check passes (two authored zones). ⚠ **Transient** — never
written to the per-player map (*"maps never name a ship"*). **Two ships in one
room are two exits**, each named for her — no prompt, no "first wins".
Rafting (deck to deck) is a deliberate act (§ 6).

**No new spatial object**: one changing field (her position — a coordinate, a
distance, or a room), exits that resolve late, and the water knowing its
ships.

## 2. ⭐⭐ Singleton and minted — one model **[DECIDED]**

Residence's D1: *"One identity, no modes: `(scope, key)` … a singleton is just
the degenerate case … there is no singleton-vs-multi branch."*

- **Boats** — an authored named boat (the ferryman's punt, the dinghy) is a
  singleton; a **kind** (a rowboat, a coracle) is cloned many times, **keyed
  by its chattel id**. `Boat` loses its singleton marker; owned boats ride
  chattel and the estate. Boats become **`Durable`**, **assemblies** (hull +
  propulsion, the river slate), with **capacity** and **draught derived from
  load** (an overloaded boat rides low and swamps).
- **Ships** — an authored ship (the *Hesper*) is a singleton; a **ship kind**
  is a **floorplan** instanced many times. Holding's **`HoldingWarren`** is
  the shape, deliberately *not* a singleton: *"one live instance per holding,
  all sharing one row and separated by their persistence key"*, a
  **`floorplan`** of `[{ leaf, room, exits, entry, door }]` naming real room
  templates, **`wake()`** standing every room up as a keyed instance, and
  **whole-holding dormancy**. So: **a generic ship class whose rows are kinds
  with a floorplan blueprint (no content scan), each ship a keyed instance**
  — her own rooms, cargo, wear and name; **whole-ship dormancy**; holding's
  per-instance **`shellCondition` is her hull condition** (W7's `maintain`,
  the shell clock).
- ⭐ **`Ship extends Structure` and composes `Named`** (*"so we're both
  right"*): membership, the outside look, position and voyage from Structure;
  her name from `Named`; and the Ship **owns her floorplan instance** —
  **one coordinator per ship** (two objects claiming one set of rooms would be
  the refused hull in another form). Everything that names her — a room's look
  (*"the Kittiwake's great cabin"*), the wired exit, the horizon — asks the
  ship through membership.
- ⚠ **Structure membership becomes `(extent, key)`** — extent prefix alone
  cannot tell two brigs apart.
- ⚠ **For the plan**: `Warren` is an abstract base, not a mixin, so the Ship
  cannot extend both; holding's floorplan, keyed-instance and dormancy
  behaviour must be lifted into something the Ship composes.
- ⭐ **A Structure row may name the warren that stands its rooms up** — the
  relationship is **authored, forward** (*"we need some relationship between
  Structure and Warren that's expressible by the content creators"*): a ship
  kind names its floorplan; a building may name the warren of homes inside it;
  an authored singleton names none.
- The zone worry dissolves: the **zone is the kind's**, authored once;
  instances differ by key, as dorm rooms do.

## 3. Ownership, registers and flags **[DECIDED]**

- ⭐ **A ship registry** — title by name, with **shares** possible (British
  law's sixty-fourths). Not a Parcel (structures-slate), and not parcel title
  (the code-maintenance axis).
- **The owner is separate from the house that runs her**: the owner hires the
  master, the master the crew (employment, shipped). Today's `house` is the
  second.
- **How you get one**: buy from the holder (transfer); commission from a yard
  (construction); claim an abandoned one (decomposition's abandoned property);
  inherit (the estate). Until construction, **ships are bought as minted stock
  from a yard** — a stocked line.
- ⭐⭐ **Flags** (*"ships generally sail under one flag but different
  sovereignties have different flags"*): **each government keeps a ship
  register**, a ship is on **one at a time** (her **flag state**);
  re-flagging is a transfer; **the flag state's law applies aboard at sea**
  (civics' derive-on-read jurisdiction answering for a place in no locality),
  **both** the port's and the flag's in harbor; **flags of convenience** —
  a polity can compete for registrations (lens 4 and 7); **an unregistered
  ship is stateless** and unprotected.
- **The flown flag is a Thing; the registered flag a record** — false colours
  (a ruse of war), striking colours (surrender), and the horizon reads the
  flown flag at signal range. **A flag is a government's brand row** (the corpo
  subsystem's marks).
- **Hooks**: letters of marque (privateering); navigation acts and
  flag-differential duties.

## 4. ⭐⭐ Archetypes, and media by parts **[DECIDED]**

*"Two fishing vessels have the same capabilities even if they have different
layouts and structure."*

The libations build shipped **`archetype` as a document kind** — `{ archetypeId,
label, industry, capabilities: [{ key, needs, default? }] }`, describing
itself and materializing a test venue, **no runtime enforcement**: a venue is
anything whose stations satisfy it. So:

> **A vessel kind = a layout (floorplan or fittings) × the archetype(s) it
> implements.** The archetype is the purpose; any layout that satisfies it is
> valid. Boats and ships alike; authored singletons declare theirs too.

| archetype | capabilities (any layout) |
|---|---|
| fishing | a hold that keeps fish, a gear station, hauling gear, propulsion, a helm |
| cargo | hold capacity, cargo handling (a derrick, or hatches a quay crane reaches), a helm |
| passenger | seating or berths, shelter |
| research | sounding and sampling, a laboratory, a dredge |
| rescue | crew seats, a launch from shore, carrying a casualty |
| whaling | davits with whaleboats, the try-works, the cutting-in stage |
| pleasure | seating, shelter, a view |

The archetype is what the world reads — the harbormaster's fish quay, a
haulage contract wanting *cargo*. The needs vocabulary grows vessel words
(propulsion, steering, hold capacity, berths, hauling gear), still closed.

⭐⭐ **`Structure` has three kinds — the plain building, the `Ship`, and the
`ConstructionSite` — and all three implement archetypes** (an inn, a bakery,
a warehouse; a fishing vessel; a shipyard slip), lifting archetypes from the
venue's room to the Structure.

⭐ **Hovercraft** (*"so stupid which is also why it's awesome"*) — the stress
test: **what a craft can travel over comes from its parts** — a hull (water),
wheels or runners (ground), ⭐ **a skirt and a lift fan** (any flat surface:
water, ice, mud, sand, marsh), a keel (deep water). The boat/vehicle line
dissolves into parts; the shipped `Boat`, coach and barge converge. A
hovercraft drives up the beach; a big one comes alongside a beach as readily
as a quay. Its earlier rung could be an **arcane levitation skiff**, priced by
canon.

## 5. The craft catalogue — by purpose

Singletons are **institutions afloat**; minted craft are **property**.

| purpose | craft |
|---|---|
| carrying | the coaster or packet (a kind; the *Hesper* its singleton) · the lighter · the barge (horse-drawn on the towpath) · the ferry (a singleton on its crossing) · the wherry · ⭐ the **bumboat** (a shop afloat, selling to ships at anchor) |
| taking from the water | the fishing boat, then the smack · the whaler and her whaleboats · ⭐ the **dredger** (keeps channels deep — a public-works gig) |
| ⭐ knowing the water | the **university's research vessel** (soundings, sampling, dredging, currents — and **charts that publish to the location graph**: the survey makes the sea known) · the **training ship** (*the university only teaches*: seamanship taught aboard) |
| leisure and spectacle | ⭐ the **punt** · the excursion boat (tourism) · ⭐ **racing** (the regatta, a rowing eight) · ⭐ the **state barge** (ceremony) · ⭐ the **showboat** (a theatre afloat; possibly a floating studio) |
| service and the state | the pilot cutter · ⭐ the **lifeboat** (rescue — drowning is the most rescuable death) · ⭐ the **lightship** · the revenue cutter and the smuggler's lugger · the gunboat (at-sea mechanics) |
| living and ending | the narrowboat and houseboat · ⭐ the **hulk** (warehouse, quarantine, ⚠ prison) · ⭐ the **funeral boat** (mortality's passage, a rite) · ⭐ the **iceboat** (winter on Hollow Mere's sheet) · the submarine (underwater's trench) · ⭐ the **hovercraft** |

## 6. ⭐⭐ Harbors **[DECIDED]**

### At anchor, or alongside

| | at anchor | alongside |
|---|---|---|
| she is alongside | a water room | ⭐ **a quay room** — land |
| ashore | by boat, or a waterman | ⭐ **by the gangway** — her `ashore` wired to the quay |
| cargo | lightered, slow | ⭐ worked across the quay — why quays exist |
| cost | nothing, or anchorage dues | berth dues |

⭐ **A berth is a quay's capacity**: a quay room's **length** against ships'
lengths; a **berth feature** on the quay citing whichever ship is moored there
(§ 7a's design, finally housed). Berths are **counted** (the quay is full —
anchor in the roads and wait), **assigned**, ⭐ **leased** (residence's tenure;
a berth held thirty years), **charged** (dues), and ⭐ **the liveaboard's
address** (*your post goes to the berth*).

### Mooring, the harbormaster, ownership

- **No new verb**: **`course <quay or berth>` moors her**; any other course
  unmoors; ⭐ **rafting** is `course <ship>` to a ship already moored, wiring
  deck to deck if her master allows.
- **A public landing** is first come; **a harbor** assigns — **`hail`** the
  harbor office, ⭐ the **harbormaster** (a seat, NPC or player) assigns a
  berth or sends you to the roads; **a leased berth** is its holder's.
- The harbormaster keeps the **queue**, charges **dues** (banking's Terms),
  and **refuses entry on a posted criterion** — draught, ⭐ **quarantine** (the
  yellow flag), unpaid debt, an enemy flag — with an appeal (lens 7).
- **Ownership is adjacent, never nested**: the water's holder holds the water
  (navigable § 5 stands); **quays and berths** belong to a **harbor
  authority**, private wharf owners or the town.
- **The bar and the tide** — a deep ship crosses only near high water (tides +
  draught), so the queue moves with the moon.

### What else a harbor holds

**Piers and jetties** (quays you walk out along) · ⭐ **the slipway** (`launch`
from shore — a boat dragged down into the water room; hauling out the reverse
— a boat reaches the water **without a ship**) · ⭐ **the boathouse** (shelter:
a stored boat is off decomposition's exposure clock; a beached one weathers) ·
⭐ **the careening hard** (beach her at high water, work her bottom at the ebb)
· **the quay crane** (underwater's hoist) · **the ship's chandler** (Wharfside's
chandlery gains ship stores) · **the customs house** (a hook) · **the
lighthouse** (shipped: Gannet Rock) · **the ferry** (the ferryman pattern) ·
the making trades (§ 10).

## 7. ⭐⭐ Leaks, swamping and sinking **[DECIDED]**

- **A leak is the hull's condition read as water** — worn caulking (the `coat`
  sealant's decay), a holed plank, a sprung joint — at a rate by the damage and
  depth below the waterline, into **the bilge** (the lowest room, or the boat).
- **The pump** (shipped; the *Hesper* carries one) moves it over the side at
  the crew's power — ⭐ *a leaky ship is a pumping job*.
- **Swamping** — derived freeboard (draught from load) against the wave height
  (the expanse's sea state, a river's rapid). Not a roll.
- ⭐⭐ **Sinking** — build-4's plan supplies the pieces (the `ColumnWarren`'s
  bands keyed `<surface>/<band>`; D7's authored neighbours beside a band; D9's
  *sinking goes to the bed band*):
  - **A sunk ship is alongside the bed band** of the column at her position —
    the same exit-wiring: the bed band gets *the wreck of the Kittiwake* to her
    deck.
  - ⭐ **Her rooms become her scene, no new rooms** — water is a state of any
    place, so each of her rooms becomes a water place at its depth; the
    wreck at the bottom IS the ship, her cargo in her hold, title intact.
  - ⭐ **Air pockets** — a sealed upper compartment holds trapped air (build-4's
    air pocket, Boyle).
  - From that moment her materials are on decomposition's exposure clock.
  - ⭐ **Sinking takes time** — the bilge rises, rooms flood from the lowest up,
    and when buoyancy is gone she goes down; **anyone still aboard goes down
    with her, in rooms now at depth**, and can swim out up the column on the
    breath model. Anyone off before is in the surface room with the boats and
    the lifeboat.
  - **On the expanse her position becomes a node** — *the wreck of the
    Kittiwake* — with a surface room the expanse Warren buds over her and a
    column down to her. ⚠ A node **minted at runtime** (nodes are authored rows
    today) — the plan's question. **Nobody knows she is there until someone
    charts her** (a claim, per the location graph).
  - **In a river or lake** she lies at the bed of the stretch or room — ⭐ **in a
    river an obstruction** (blocks a ship by admission, snags a boat, fouls a
    line).
  - **Boats are just Things** — they sink to the bed band with what is in them.
- **Getting her back**: beach her on the hard; pump her dry; salvage her.

## 8. ⭐⭐ Life aboard, by tenure **[DECIDED]**

| who | each stay | where aboard | what defines it |
|---|---|---|---|
| the commuter (the ferry) | minutes, twice a day | deck in fair weather, saloon in foul | routine, the timetable, fog and tide, the regulars; time against the bridge's toll |
| the fare | an hour | the boat, the deck | the view, the boatman |
| the day fisherman | dawn to dusk | the deck, at the gear | the catch, the tide, the market |
| ⭐ the packet passenger | days | cabin or steerage, the saloon at meals | seasickness, boredom, the captain's table — and class aboard |
| the merchant sailor | weeks to months | ⭐ **the forecastle** (*before the mast*), the deck on watch, aloft | the watch system, wages, a sea chest |
| the officer, the master | the voyage | **aft** — the cabin, the quarterdeck | command, navigation, the log |
| the scientist | an expedition | the laboratory, the deck | work and long idle passages |
| ⭐ the lightship keeper | weeks on, weeks off | below, the lamp | rotation, isolation, the relief boat |
| the bargee family | permanent, moving | one small cabin | children raised aboard, no fixed address |
| ⭐ the houseboat dweller | permanent, moored | the cabin, the deck as a garden | a home on water — damp, cold, mooring fees, the berth as address |

What falls out of shipped and designed work:

1. ⭐⭐ **The voyage happens while you sleep** — sleep is logout and the voyage
   is held by the ship, so a passenger boards, takes a cabin, logs out, and
   wakes at the destination; the cabin's rest quality (hammock vs berth) decides
   how. **Travel time stops being a tax.**
2. ⭐ **Seasickness, and where you stand** — the expanse's sea state against
   eyes and inner ear: worse below (no horizon), eased on deck watching it;
   **sea legs** over days (adaptation) — a wellbeing discomfort.
3. ⭐ **Watches break sleep** — the sleep pressure model under four-on,
   four-off: sailors never get a full night, derived.
4. ⭐ **The ship's geography is social** — forecastle and quarterdeck, steerage
   and saloon; regard reads where you berth.
5. **Living aboard costs comfort** — damp (the wet law), cold (the hull
   conducts to the water).
6. **Below decks, the air** — a crowded steerage fouls (respiration's CO₂); ⚠
   historically fatal on emigrant and slave ships — recorded, never a mechanic
   of coercion.

## 9. Boatbuilding **[DECIDED]**; ships wait on construction

- **A boat is an assembly; building one is carpentry** — the bill (keel,
  strakes, frames, thwarts, oars or mast) from forestry's wood column; ⭐ oak
  frames, larch or cedar planks (chosen for exposure — decomposition's material
  choice); **clinker** (overlapping, riveted) or **carvel** (edge to edge,
  caulked) as joints; ⭐ **caulking is the `coat` sealant** (oakum and pitch from
  the fuel trade), which **wears** — so the caulker's upkeep and the leaking
  boat are one mechanism; `repair` replaces a plank or re-caulks.
- **The boatbuilder is a carpentry discipline**; a player-built boat is a kind's
  instance with **its maker on it**.
- **Ships** are bought as minted stock until **construction**
  ([construction-slate](./construction-slate.md)) — where **the shipyard slip
  is a site kind**, the floorplan the blueprint, the hull her rooms' envelope
  elements, and **the launch a change of position** (alongside the slip →
  alongside the water).

## 10. The pack map **[DECIDED]**

| axis | pack | takes on |
|---|---|---|
| how the world works | `/system/water` ✅ | the expanse Warren; water rooms knowing their ships; tides (underwater build) |
| | `/system/transport` ✅ | ⭐ the watercraft and harbor mechanism — minted Durable boats; **berths, moorings, slipways** as fixtures; davits; mooring by `course` |
| | the kernel | `Ship` (floorplan, keyed rooms, `(extent, key)` membership); **civics' ship registers** and the flag state's law |
| who makes | ⭐ **`trade-seafaring`** (new) | the mariner's trade — crews, masters, mates, the watch, seamanship and navigation (pilotage its discipline), shipping businesses, the sailor's labour market |
| | `trade-haulage` ✅ | ⭐ widened to **carrying by any conveyance** — the **lighterman**, **stevedores and porters**, sea freight as hauls, the **waterman** and **the ferryman** (London's watermen and lightermen were one guild) |
| | `trade-fishing` ✅ | the fleet's boats, the fish quay and market |
| | `trade-diving` (build-4) | harbor works below the waterline |
| | `trade-carpentry` ✅ | ⭐ **the boatbuilder** |
| | `trade-textiles` / `trade-tailoring` ✅ | the ropewalk (cordage), the sailmaker |
| | `trade-chandlery` / `trade-fuel` ✅ | ship's stores; tar and pitch for caulking |
| | *(later)* `trade-whaling` | parked in navigable-water § 7 |
| where | ⭐ **a harbor district** (`/world/terminus/harbor`, new — the Hearthworks precedent) | the port of Terminus: quays and piers with berths, the harbormaster's office, slipway, boathouse, careening hard, crane, customs house, ⭐ **the sailortown** (taverns, boarding houses, the seamen's mission), the fish quay, the ferry stairs |
| | `terminus` ✅ | Wharfside and the estuary, joined to the harbor |
| | Waponi Woo (build-1), Gannet Rock, Hollow Mere | a quay with berths; the lighthouse keeper's seat; the authored-lake case |
| who owns | `/corpo/<line>` | a shipping line — the *Hesper*'s owners |

**Not packs**: the harbormaster, customs officer and lighthouse keeper are
**seats**; quarantine is a harbormaster power plus medicine; mudlarking is
foraging (parked); smuggling is emergent (customs + concealment); ⚠ **crimping
and the press gang are never a mechanic** — coercion goes on the accountability
ledger.

## 11. ⚠ Notes to sibling builds and shipped content

- **build-1 (sugar, `reqs/sugar`)** — carry on through **W5**; **hold W6 (the
  voyage)** until the harbor lands: (1) **Waponi Woo's landing** is an `aboard`
  exit hard-wired to the *Hesper*'s deck (`oneWay`) — it becomes **a quay with
  berths**; (2) **the crew's home leg is the-pool node**, where going ashore puts
  you **in the water** — the home port becomes **the harbor**; (3) **D13 (the
  hold persists by re-class)** is right and generalizes to every ship's rooms.
- **build-4 (underwater)** — insulated (it defers all craft); its bell is a
  vessel Thing in the water's room, the craft size rule. No change.
- **Shipped content** — the *Hesper*'s landings become berths; `Boat` loses its
  singleton marker; going ashore at the-pool gains a dry landing; the stale
  prose (logistics D5, navigable § 7f, the structures slate's retired
  `structures:` list, § 5a's old Shore path) is corrected at the sweep.

## 12. The lens pass (2026-10-19)

1. **Pedagogy** — buoyancy, draught and freeboard; leak against pump;
   construction sequencing and load paths; the ship's geography as class;
   seasickness and sea legs; watches breaking sleep; flag-state law; lofting,
   clinker vs carvel, why caulking wears.
2. **Expression** — floorplans and archetypes for ships, buildings and sites;
   kinds minted by the many, singletons as institutions; a sunk ship's own rooms
   as her wreck; the site as content; the hovercraft proving parts decide the
   medium.
3. **Immersion** — the ferry's regulars, sleeping through a passage, steerage's
   foul air, the scaffold and the saw pit, the wreck with her cargo still in her
   hold. **Participation** — seafaring, watermen and lightermen, the
   harbormaster, the pilot, the shipwright, boatbuilder and caulker, the
   builder, architect and labourer, the lifeboat crew; *can the polity do
   something we didn't want?* — flags of convenience, quarantine, jerry-building.
4. **Values** — ⚠ crimping and the press gang, steerage and emigrant ships,
   prison hulks, collapse: **coercion is never a mechanic**; stranding someone is
   a deliberate, recorded act, never an accident of forgetting.
5. **Continuity** — oar → sail → steam; the same `course`, `maintain`, `repair`;
   the hovercraft and the levitation skiff fill the same parts slots.
6. **Economy** — ships give freight somewhere to go; berths, dues and moorings
   get an owner; construction becomes every material trade's largest customer;
   ⚠ ships are bought as minted stock until construction ships.
7. **Governance** — ship registers per government; the harbormaster's
   refusals; quarantine; building codes; customs and privateering as hooks —
   each a criterion and an appeal when designed.

**Altitude** — *invariant*: never a Location inside a Location; never a hull
Thing; one coordinator per ship; a ship is always alongside a room; coercion
never a mechanic. *Grain*: the sea-room cell size, berth lengths, leak rates.
*Title*: the *Hesper*, the port of Terminus, the university's ship.

## 13. The drill-downs (next sessions)

**Packs**: `trade-seafaring`; haulage's widening; the harbor district; the
shipping line. **Harbor**: the harbormaster's day; quarantine; pilots and the
bar; customs and smuggling; slipways and careening; the sailortown. **Craft**:
each archetype's capabilities; the university's ship; the lifeboat; the punt;
the hovercraft. **Life aboard**: seasickness and sea legs; the watch system;
the ship's social geography; the passenger's voyage; the liveaboard.
**Ownership**: the registry, shares, flags, re-flagging. **At sea** (the first
cut): the voyage's weather, combat, whaling's chase.

## 14. Open (for the plan)

1. Lifting holding's floorplan, keyed-instance and dormancy behaviour into
   something `Ship` composes (`Warren` is a base class).
2. Structure membership by `(extent, key)`.
3. A runtime-minted expanse node for a wreck.
4. The sea-room cell size (grain).
5. Where the ship registry lives (a civics document tree per government — no
   new collections).

## 15. ⭐⭐ Drill-down: `trade-seafaring` (2026-10-19)

### The crew, and why a ship needs one **[DECIDED]**

- ⭐ **Manning decides performance** — a ship under way needs hands at her
  **stations**: the helm (unsteered, she yaws and drifts with the set), sails
  or oars (too few hands, she cannot make full sail), the pumps (a leak gains),
  the lookout (the deck's sight only), the galley (wellbeing, scurvy), the
  bosun's work (tarring, splicing — decomposition's upkeep). **A ship kind
  declares her complement**; the archetype says which stations exist; **an
  under-manned ship is slower, steers worse and leaks faster** — derived.
- **The crew is employment, shipped**: ⭐ **ranks are positions** (master, mate,
  bosun, cook, able and ordinary seaman, boy) with seats; ⭐ **the watch is the
  rota** (`call: rota` — larboard and starboard, four on and four off; the
  roster tick puts the watch on deck — where *watches break sleep* comes from);
  ⭐ **the articles are a contract** (the contract subsystem's clauses and
  escrow — terms, wage or share, desertion forfeiting pay).
- ⭐ **Pay is wages or a LAY** — merchant crews by the month; fishing and whaling
  by **a share of the catch** (the boy 1/200, the master 1/12). **The share is
  defined once**, a payment term on the articles, for seafaring, fishing, diving
  and whaling (the underwater slate: *proven before whaling needs it*).

### The cook **[DECIDED]**

Ships carried cooks for **necessity** (salt meat and biscuit inedible raw; the
galley stove **the only fire allowed aboard** — the fire subsystem's spread
makes the cook a safety post; fuel and water rationed through one kitchen) and
**morale** (the Potemkin mutiny began over maggoty meat). ⭐ **The ship's cook
is the wellbeing design's proving ground** — captive diners, months of the same
stores, scurvy, and the crew's wellbeing feeding **manning**. The cook's
competence turns preserved stores into meals whose taste and variety are
derived (plum duff on Sundays as ritual variety); rations and **the purser**
are lens 4. **NPC crew discontent may go as far as desertion in port**,
derived from wellbeing and felt as manning; **refusal and mutiny** — the crew
judging the master, lens 7 at sea — are deferred to governance. The galley cook
as a vocation is recorded in [guild-slate](./guild-slate.md); the three-star
other end in [wellbeing-slate](./wellbeing-slate.md) § 8.

## 16. Drill-down: seafaring continued, and the mariners' guild (2026-10-19)

### From boy to master **[DECIDED]**

- **⭐ `seamanship` is a new discipline** (ropework, sail, the helm, boat
  handling, anchoring and mooring) beside the shipped **navigation** and
  **command**.
- **The ladder** — boy → ordinary → **able seaman** (*can hand, reef and
  steer* — a seamanship band) → bosun or mate → master — as positions whose
  seats want bands; ⭐ **the refusal is the progression UI** (the shipping
  master says what is missing).
- **⭐ The master's certificate is a credential issued by the flag state**
  (Britain from 1850, after wrecks traced to incompetent masters), the
  register checking it before she sails; the guild **examines and vouches**.
  Flags of convenience then also mean lax certification — the real problem.
- **⭐ The shipping office** — articles signed **before a shipping master**, a
  public official at a counter in the harbor district; the crew list filed
  with the register. ⚠ **The crimp** (drink, the advance stolen, a sailor
  delivered to a ship) is the accountability ledger's — **never a mechanic**.
- **The sailor ashore** — paid off as the articles settle; the sailortown
  until the next ship.

### The mariners' guild — the guild model's proving case

The [guild slate](./guild-slate.md) had a dormant **Watermen** charter
(fishing, pilotage, diving); this session moved the ground (seafaring a trade;
watermen and lightermen in haulage). History offers two institutions — **a
mariners' guild** in the Trinity House shape (masters, mates, pilots; **public
functions** — lights, buoys and pilot licensing as polity contracts, the
Landwrights pattern; mutual aid across ports; an almshouse) and **the
watermen** (the Company of Watermen and Lightermen — a livelihood guild over
haulage: fares, licensing who may ply, apprenticeship). Whether one or two is
open.

What the mariners' guild must DO — most of the guild model: ⭐ **the mystery
is the sea's knowledge** — its pilot books and charts, kept in **the map room**
(designed in the guild slate: a living chart members feed and read); ⭐ **the
call is distress** — a ship in trouble raises the shout, members are called
(the lifeboat, rescue); ⭐ **the mark is recognition in any port** — a sailor
stranded abroad is helped at the hall; the board posts berths; the budget is
seamanship primary, navigation and command secondary; the hall stands in the
harbor district with its chart room and almshouse; public work maintains
lights and buoys and licenses pilots.

**Branches** — a branch is another hall (a chapter); in a landlocked realm the
formation rule (*a guild forms where a discipline meets demand*) says **no
branch by default — or a recruiting office**, since many sailors came from
inland; a thin branch dies of ordinary economics.

The classics, answered by the guild slate: **the Free Company** (fighters —
contract arms, the school, marshal's writs), **unlisted, under seal**
(rogues — stealth, locks, appraisal), **the Chorus** (bards — performance,
tips, venues, the stream's stage), **no magic guild** (verbs are university
faculties; each guild's mystery is a magic noun).

## 17. ⭐⭐ The stories — lens 2's audit, and what it changed (2026-10-19)

*"There are so many great stories that take place at sea or in harbor towns…
what stories do we want our seafarers to tell?"* Lens 2's real test is
**can an author make THESE with no code**:

| story | needs | |
|---|---|---|
| **The Count of Monte Cristo** — the *Pharaon* into Marseille, the owner making Dantès captain, false denunciation, the island prison, the escape sewn into a corpse's sack and thrown into the sea, the treasure, Morrel ruined by lost ships | the managing owner hiring the master; courts; ⭐ surviving being thrown in (buoyancy, breath, cold); a shipowner ruined (shares, insurance) | ✅ but the courts |
| **Treasure Island** | ⭐ a treasure map is an authored Chart; the shipping office; ⭐ **marooning is `course … leaving them`**; `dig` | ✅ but mutiny |
| **Moby-Dick** | ⭐ Ishmael haggling his **lay**; command and loyalty; a coffin as a lifebuoy (buoyancy) | ✅ the harbor; the chase is whaling's |
| **Robinson Crusoe** | ⭐ raiding the wreck before she breaks up — **the wreck as her own rooms** | ✅; survival leans on foraging |
| ⭐ **Lord Jim** — an officer abandons a ship full of pilgrims | **leaving people is a deliberate, recorded act** — the stranding refusal IS the story's moral | ✅ the strongest validation |
| **Titanic** | the ship's social geography; sinking takes time; ⭐ **boat capacity derived — *not enough boats* is arithmetic** | ✅ |
| ⭐ **Whisky Galore** | title survives sinking; salvage; customs | ✅ |
| **Captains Courageous** | man overboard; the ladder; the fishing lay | ✅ |
| **Peter Grimes** | accountability; regard; the town's talk | ✅ |
| **Jaws** | seeded fauna + an authored cast; tourism; governance against safety | ✅ |
| **Billy Budd** | ⚠ the press gang — never a mechanic | ✅ as authored narrative; ⛔ as a system players wield |
| **The Ancient Mariner** | ⭐ superstition — *mysticism as a correlation, never a mechanism* | ✅ as culture |
| **Swallows and Amazons**, **The Wind in the Willows** | leisure boating on a lake and a river | ✅ |
| **Huck Finn**, **The African Queen** | rivers | ✅ the river slate |
| ⚠ **Mutiny on the Bounty**'s open launch, **Kon-Tiki**, survivors rowing for land, **The Old Man and the Sea** | ⚠ **a boat crossing the open field** | ⛔ under § 1 as first written → **corrected below** |

**The corpus mostly validates the design** — marooning, Lord Jim, the wreck as
her rooms, the lay, class aboard, slow sinking and too few boats all come from
decisions made for other reasons. **Known gaps, parked**: mutiny (governance),
courts, foraging, whaling's chase.

### ⭐ Boats cross the field like ships **[DECIDED]**

A *carried* room was refused (*"it makes the boat a carnival ride — you just sit
there while the environment changes around you"*). Instead **a boat in the open
field is treated exactly like a ship there**: **under way it holds a position**
(as the shipped `Boat` already does — *"they sort of already do, they just have
to ride on the ship"*); **stopped, the sea Warren buds the room and the boat is a
Thing in it**; under way again it leaves and the room is reaped if empty.
Everyone aboard is inside the boat throughout. **It is not a ride, because the
work is theirs** — the crew's rowing (exertion) or sail sets the speed, the helm
holds the course, and **an open boat's freeboard against the sea state means
bailing or swamping**, derived; an open boat is exposed (rubber: `none`
overhead). The stranding refusal applies. Bligh's launch — hunger, rationing,
bailing, navigation — is the boat's own physics. The constraints hold: never a
Location inside a Location, never a hull Thing.

### The sea is bounded; rooms bud only at ENCOUNTERS **[DECIDED]**

*"Is it infinite or bounded?"* — **bounded by the expanse's own extent** (its
chart region, nodes and bands), and **rooms are budded at encounters, not across
the sea**: a stopped craft is a one-craft encounter, two ships hove to share one
(the cell rule), everywhere else is field. The count of rooms is the count of
things happening at sea now.

**The geography a chase runs on already ships**: **bands** (set, fog, races, sea
state, and **`stock`** — ⭐ *a whaling ground is a band*), **nodes** (rocks,
shoals, islands, wrecks), **depth and bottom** per band, **sight** by curvature
with fog in the bands. **The principle for close quarters**: when things in the
field must interact at close range, the field buds a room for the encounter.
⚠ **A MOVING encounter** (the tow — a boat dragged behind a running whale) is
parked with whaling's *chain of engagements and tether graph* (navigable § 7c):
*"whaling will have to work out the specifics."*

### Shipping as a business **[DECIDED]**

Ruled by the lenses (*"I'd let the lenses speak for me on this one"*); the
stories lean on it (Monte Cristo's Morrel, Moby-Dick's lay):

- **Ownership in shares** (the registry's sixty-fourths; income split by share
  through banking).
- **Three roles** — the **owners**; ⭐ the **managing owner** (*the ship's
  husband* — the house that runs her: cargoes, the master, the bills); the
  **master** (often a shareholder).
- **Three earnings** — ⭐ **the liner** (a scheduled service sailing *full or
  not* — the Black Ball Line, 1818; a timetable the `published` map channel
  reads); **the tramp** (any cargo, haulage's market); ⭐ **the charter** (hiring
  the whole ship — the university's research vessel).
- ⭐ **The sea's financial instruments** — **insurance** began here (Lloyd's,
  1680s: underwriters take shares of a ship's risk; the premium is their
  judgement, never an engine gauge); ⭐ **general average** (Rhodian law: cargo
  jettisoned to save the ship is a loss **every owner shares in proportion** —
  derivable); ⭐ **bottomry** (a loan secured on the ship, **repaid only if she
  arrives** — credit's Terms with a verifiable arrival condition).
- **The voyage is the accounting unit** — freight and fares in; wages or the
  lay, provisions, dues, upkeep and insurance out; profit to the shares.

### The mariners' guild and the watermen — two charters **[DECIDED]**

*"With guilds I feel like two is better than one most of the time."* History
had two institutions: **Trinity House** (1514 — master mariners and pilots;
public functions: pilot licensing, lighthouses and buoys, examining masters,
almshouses) and **the Company of Watermen and Lightermen** (1555 — the river's
boatmen; licensing who may ply for hire, regulated fares, seven-year
apprenticeship). The guild slate's own rules: *the grain of a guild is a
career* (deep-sea and river are two careers, two trades); *wings, never forks*
is for flavours of one vocation, not two vocations. So: **the mariners' guild
lives** (the proving case — public functions, the map room, the call to
distress, recognition in any port); **the watermen's charter ships as a RUIN**
— a shuttered Watermen's Hall in the harbor district, its charter readable on
the wall, teaching the other shape (apprenticeship, licensing, a granted
monopoly) by archaeology, reopenable when the river has the traffic.
