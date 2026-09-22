# Fishing — requirements

**Kind:** feature
**Leads from:** content — the substrate is composition of shipped
systems; the content (two waters, six species, one trade) is the build.

Fishing is the third extraction vertical and the restful one: what a
person does on a dock while they talk. It is **the stock on a reach and
what you do about it** — a body of water the river system already
describes holds fish because they belong there, and a person with a rod,
a pot or a net takes some, then keeps, eats, sells or releases what they
took. This build ships the loop at two waters that already stand in the
world and proves that a third water needs no code. Seeded by
[fishing-slate](../slates/builds/fishing-slate.md) (rewritten 2026-09-18);
the deep is [underwater-slate](../slates/builds/underwater-slate.md)'s
and stays there.

⭐ The standing frame, from the user: **most authors want to say "here's
my body of water — put the appropriate fish in it for me."** The fish
farm is the rare case. So the population is *derived*, never tabled, and
an author who writes a stream in prose gets fish in it by citing the
river.

---

## What already exists

At the level a player would recognize:

- **The river.** The Kestrel is authored from its headwaters to the
  estuary — the gorge no boat has been up, the falls, the confluence
  ninety metres wide, the estuary at sea level — and so are the
  Holloway, the Delight and Cold Fell. The river knows its own flow by
  season, where it is navigable, and what has been poured into it
  ([watershed.md](../subsystems/watershed.md)).
- **The boat.** The Terminus estuary is *"the realm's one water lane"* —
  three rooms a barge works between the confluence and the sea, the
  towpath and the reach being the same ground read by two lanes
  ([logistics.md](../subsystems/logistics.md)). `swim` and `sailed` are
  ways of moving. The fishing slate's "boat wave" is mostly already
  built; fishing *from* a moving barge is a follow-on (§ Non-goals).
- **Two waters a player can stand beside today:** wharfside's *bank at
  the confluence*, next to the city's intake and its outfall; and the
  Weeping Moor's storm-lashed heath, which *"pools the rain into shallow
  meres"* and sits on the **Holloway** — a second, unrelated basin the
  water pack authored precisely to be unrelated. (⚠ The moor's *weeping
  chamber* is the indoor-rain demonstrator, reachable only by teleport —
  not a pool anyone fishes.)
- **Everything downstream.** `butcher` with a yield table (cleaning a
  fish is butchery), the kitchen, `cure` / `dry` / `smoke`, spoilage as a
  clock with contamination as an event, the pathogens, the market with
  its stalls and the general store's counter, the bank two doors from
  the water, `find … mine`.
- **The individual.** A kept animal — the bond, the species dials, an
  animal that decides whether to take food, the promotion by naming, and
  what loads it after a restart ([pets.md](../subsystems/pets.md)).
- **The pattern.** A stock that is a filed record rather than a pen of
  objects, from which an individual materializes when engaged — the
  herdbook ([ranching.md](../subsystems/ranching.md)); the stand
  (forestry, in flight).
- **The register.** The vocations register lists the *fisher* as
  designed; the trade roster **reserves the Discipline name `fishing`**
  — *"add with the fishing slate"* — ISCED 0831.
- ⚠⚠ **`cast` is the mages' verb.** A second view on it would shadow
  the first silently (the consequence build's finding; a gate refuses it
  now). The fishing verb is **`fish`**.
- **Nothing aquatic exists:** no fish species, no fish material, no
  fishable water, no rod, bait, pot or net, no fishmonger, no fishing
  Discipline. `gather` is ranching's word for eggs and fleece.

**Therefore what is genuinely new here is:** the fishery record on a
reach and the habitat each species declares to derive it; the `fish` act
— the wait, the bite as the fish's decision, the landing contest; `set`
and `lift` on a pot and a net; the tackle as tools with epochs; one
fish-flesh material; the fishable feature a room cites a reach through;
the fishmonger and the fisher at the bank; the Discipline; a fish you
can keep.

---

## Goals

- **A person standing at the confluence can take a fish from it** with
  a rod and bait, watch the water refuse or give, land a fighter or lose
  it, and hold something that is a real creature with a size, a
  quality, and a clock running on it.
- **The water holds what belongs in it, unauthored.** The confluence's
  fish are the confluence's because it is wide, brackish and slow; the
  moor's are the Holloway head's because it is cold, high and thin. No
  one writes a table for either. A third water is a room citing a reach.
- **Every authored watercourse holds fish, unasked.** The Delight past
  Heart's Delight's millsite, the Holloway through Rejection, Cold Fell
  above the aqueduct — each has reaches, and each reach has a record the
  moment the species declare their habitats. A locality that never
  mentioned fishing has fish, and a room there that cites its reach can
  fish them. That is the zero-code claim proved by a place that did not
  opt in.
- **The stock is finite and recovers.** A net fished hard empties a
  reach in an afternoon; left alone, it comes back over game time. The
  commons lesson is reachable by one person with one net.
- **What you take has four fates** — keep, eat, sell, release — and
  each is real: a kept fish is a kept animal in a bowl; an eaten one is
  food that spoils and, taken from the wrong water, sickens; a sold one
  is coin when a buyer takes it off the fishmonger's shelf; a released
  one is back in the record.
- **Reading the water is competence.** A novice sees water; a
  practised fisher reads what a reach holds, in bands and words, never a
  number — the *fishing* Discipline, credited by what you land.
- **Somebody already fishes the confluence.** An old fisher stands at
  the bank — a person, not a role — who reads the water in a mentor's
  mouth (*eels run on the ebb; the big one lies under the far bank*) and
  who draws from the same record you do, so a reach you net out is a
  reach he finds empty, and he says so. The commons with a face.
- **The sturgeon is in the confluence** — rare, deep, a fight worth the
  contest, a deed the chronicle holds, and ⭐ **a royal fish**: the
  landmark catch that, by every law this world will have, is not yours.

## Non-goals

- **The underwater regime** — places below the surface, diving, the
  ascent → [underwater-slate](../slates/builds/underwater-slate.md).
- **The spear** — stalking and striking a fish is hunting's act, wet or
  dry → [hunting-slate](../slates/builds/hunting-slate.md).
- **Fishing from the barge** — a fishable feature on a vehicle that is a
  room that moves → the fishing slate's boat follow-on.
- **Tide** — the estuary's salinity swinging with the moon, the flats
  opening and closing, the cutoff → the fishing slate; it waits on a
  tide clock the water pack has not built.
- **Aquaculture** — the stocked pond, the override with ownership → the
  fishing slate's tail (and the pets seam for a garden pond).
- **The home aquarium** — the tank whose water the keeper must control:
  the nitrogen cycle, water changes, the test kit, the maintenance
  service, disease → the fishing slate § 12, a follow-on build. ⭐ What
  THIS build owes it: every parameter a tank will one day hold is
  already reported by a wild reach, every species already declares its
  tolerances against the same words, and the read names the one factor
  that limits a fish — so the aquarium build never reopens the wild
  water.
- **The food web** — bait fish feeding predators within the record → the
  fishing slate's later wave; v1's record is flat.
- **The fishery right and the covenant rows** — *no nets above the
  falls*, the royal fish as law → the land-use covenant build (forestry's
  first customer; fishing its second). Until then **the water polices
  itself by running out**, the wood's rule.
- ⭐ **The named apex** — the sturgeon as an *individual* in the record
  with a chronicle of his own: who hooked him, who lost him, the fisher
  talking about *him*. The one that got away as the same fish, older.
  Wanted; not this build → the fishing slate's tail. v1's sturgeon is a
  species slot in the record and a deed when landed.
- **The open sea** — one abstract reach, nowhere, deliberately.
- **Crustaceans beyond the crab, mollusks, cephalopods, eels beyond the
  one, weed** — data over the shipped engine → the slate's noun wave.
- **Fish-borne parasites as their own conditions** — the shipped
  pathogens and the toxin dose carry v1 → the disease slate.

## Placement

- **The trade:** a new **`trade-fishing`** pack at `/trade/fishing/` —
  the tackle, the pot and the net, the fishmonger's business, the
  Discipline, the verbs a fisher's instruments confer. A trade is
  mechanism; a locality is expression.
- **The species** live in the commons with every other species; the
  **fish-flesh material** is one row in the closed material vocabulary
  (lean protein and oil — its properties differ from stew-meat; species
  differ by grade and prose, never by material).
- **The waters** are the localities' — wharfside's bank cites the
  Kestrel's confluence, the moor's heath cites the Holloway's head. No
  new watercourse row is needed for v1; a still pond, when one is
  authored, is a one-reach watercourse row of its own.
- **The people** are terminus's: the **fishmonger** is a market
  business on the baker's shape (appointed by the market's committee,
  one position, banks at Goodkin, a keeper on a shift with a trigger);
  the **fisher at the bank** is a named person of wharfside with a brain
  that fishes and a few things to say. The trade pack ships the brain
  and the dialogue's mechanism; the locality ships the man.
- **No corpo.** A corpo is a mark and capital; a self-employed fisher
  and a committee-appointed stall point up at nobody. The smokehouse
  mark, the salt-cod route and a fishers' co-op arrive with the
  commercial wave.
- **The record on a reach** and the fishable feature are substrate two
  trades read (fishing now, hunting later) with no common pack ancestor
  — kernel-shaped; the plan decides where the state sits.
- ⭐ **The test: a second instance needs no code.** The moor heath *is*
  the second instance, and the build fails if it needs one.

## Collisions

- **Wharfside's bank at the confluence** — the room stands, with the
  city intake, the aqueduct house and the **outfall** as neighbours. The
  fishable feature lands here, and so does the fisher — the first person
  to live in the room; the barge passes both of them. ⭐ The outfall is a
  gift: the reach below it carries the city's contamination, the record
  reads it, and a fish taken there carries the dose — no author writes
  "the water is foul here."
- **Heart's Delight's millsite** — the millrace is on the Delight's
  `flats` reach. The room gains nothing in this build; the reach holds
  fish regardless, and the drive proves it there. If the millers want
  their own bank, it is one line.
- **The estuary's three rooms** — the barge lane. The build touches
  none of them; the estuary reach's record exists whether or not anybody
  fishes from a room that cites it.
- **The Weeping Moor's stormy heath** — the newbie moor's outdoor room,
  on the Holloway. It gains a fishable feature citing the head reach;
  nothing else there changes.
- **The general store** — sells a rod, a pot, a net, bait, and a bowl.
  The counter is already there; these are rows.
- **The market** — the fishmonger's stall and its keeper, a business.
- **The kitchen and the smokehouse** — cooking, curing and smoking a
  fillet are the existing verbs on a new material; the yield table for
  `butcher` gains the fish's parts.
- **Hinkley Lane's stray** — offal from a cleaned fish is food a stray
  would take. The lane's producer gap closes as a side effect if a
  fisher walks up the hill; not a goal.

---

## Surface decisions

### The population is derived; `stocks:` is the visible override

A species declares its habitat — temperature, salinity, current, depth,
substrate, season, its role (bait, predator, apex). A reach has a
composition the river already computes. The record is the fit, scaled by
a capacity, with a stock level that draws down and recovers. An author
who wants pike where pike do not belong writes one line, and that line
shows in the prose. **Chosen by lens 1:** the distribution is derivable
because it is computed from the principles a player can learn.

### The record lives on the reach; a pond is a one-reach watercourse

Fish move; ground does not. The stock keys on the reach the river
already names, so the commons is natural (a reach nobody owns) and the
farm is the same record on a reach somebody holds. A still pond, when
one is authored, is a watercourse row with a name and an elevation and no
flow; v1 authors none. *Alternative considered:* the bordering ground
(forestry's answer for the stand) — rejected because a fish is not
rooted.

### The verb is `fish`; `cast` stays with the mages

`fish` at a fishable feature, optionally naming the bait. `set` and
`lift` for a pot and a net. `reel` and `slack` inside the contest
(`give` is the inventory verb). `look`
at the water is the read.

### The bite is the fish's decision

Reused from pets: the animal appraises what is offered against its
hunger, the water's conditions and the presentation, and takes or
refuses — never a roll of the player's. Weather (the pre-storm feed),
the hour (dawn and dusk), the season and the bait all move the fish's
answer. **Every refusal is silence** — the line stays slack; the water
does not explain.

### The landing contest is small, and fires only on a fighter

A hooked fish worth the beat fights: `reel` gains line and raises
strain, `slack` bleeds strain and cedes line; it lands when it tires and
is lost if the strain snaps the tackle or slack throws the hook. Small
fish land themselves. Losing a big one is a story — you keep your tackle
and learn what the reach holds. Deterministic per seed.

### Reading the water is `look`, banded by competence

No instrument. A novice's `look` says what the water is; a practised
fisher's says what it holds — *"there are eels in this water, and
something large"* — in words, never counts. The instrumentation slate is
untouched.

### The tackle is a tool ladder with epochs

Hand, rod-and-line, pot, net ship medieval. The reel, the fly, the trawl
are later epochs that arrive as tools, so the covenant has something to
read when it lands. A rod wears with use like any tool.

### Traps and nets draw passively and cap at the boring reward

`set` a pot or a net at a feature; it takes from the record on a
game-clock tick while you are elsewhere; `lift` it. No skill beat, no
competence credit. **The net is non-selective and draws hard** — it is
the one thing in v1 that can empty a reach, which is the point.

### Depletion and recovery are the stock's own clock

A reach lightly fished holds; a reach netted daily thins, then empties;
left alone it comes back over game days. Renewable, not
strip-and-re-prospect — the restful vertical's tone. *Alternative
considered:* mining's finite-deplete — rejected as the wrong friction.

### The catch's four fates

- **Keep** — a small fish put into a bowl of water is a kept animal:
  unnamed and free at first, fed by hand (crumbs on the surface — a
  carp comes up for the hand it knows, a goldfish never bonds). ⭐ **A
  fish cannot follow you home, so the naming gate is the other route
  home the pets build already has:** kept and fed in one place for three
  game days, its home is your bowl, and it can be named. Named, it is
  yours: titled, keyed, and standing on your shelf after a restart.
- **Eat** — clean it (`butcher`: fillet, roe, offal, bone, skin), cook
  it, or eat it raw and take the dose. A fillet spoils on the shipped
  clock; salt and smoke arrest it.
- **Sell** — the fishmonger's stall takes a fresh fish on consignment
  at your ask, as the general store takes anything, and refuses what
  has turned; when a buyer takes it the coin reaches you less the
  stall's commission. Nobody is paid until somebody buys: coin
  circulates; there is no faucet.
- **Release** — `release` puts it back in the record. A released
  sturgeon is a deed.

### The sturgeon is the apex, and a royal fish

Rare, deep in the confluence, a fight at the top of the contest. Landing
one is a chronicle deed; releasing one is another. `look` names it *a
royal fish*. **Nothing stops you keeping it today** — the covenant that
makes it the crown's is a later build, and until then the chronicle
remembers you took it, which is how a law gets its first case.

### Bait is bought, or caught

Buy worms off the general store's floor, or fish a baitfish out of the
water. Bait is a stance: worms for the bottom feeders, a caught baitfish
for the predators. ⚠ **Digging worms out of the ground is not fishing's
act** — it is foraging's, and it waits for that build (`discovery-slate`);
the `dig` verb this build first shipped was withdrawn in review (plan
D24).

### The Discipline is `fishing`

ISCED 0831, the roster's reserved name. Credited by what you land and by
reading the water; competence widens the read and steadies the contest.
Bands only. Cooking and butchery downstream credit their own.

### The fisher at the bank draws from the record

He is a person (a `Cast`, not a role-filler), he fishes on his own
cadence from the same record a player does, and he answers `talk` with
what the water holds in the words a practised read would use. He is
there so the commons has a face and the pedagogy has a mentor; he is not
a quest-giver and confers nothing. When the reach is empty he says so —
and nothing else about who emptied it.

### Every watercourse's reaches hold fish

The record derives wherever a reach exists, so the Delight, the Holloway
and Cold Fell have fish from the day the species rows land. A locality
opts *in* to fishing by citing a reach from a room; it cannot opt out of
having fish, any more than it can opt out of having flow.

### Where v1 lives

The confluence bank at wharfside (brackish, slow, wide, beside the
outfall — the rich water) and the moor's stormy heath on the Holloway's
head (cold, high, thin — the second instance, on a basin authored to be
unrelated). Six species by habitat: brown trout (the moor),
eel (the estuary's trap fish), grey mullet (the confluence's rod fish),
carp (slow water — and the one you keep), shore crab (the pot), the
sturgeon.

---

## Lens pass

1. **Pedagogy.** The Discipline is `fishing`, and the derivable claim is
   the build's spine: *where fish are* is computed from temperature,
   flow, salinity, depth and season the river already knows, so a player
   who has learned real freshwater ecology is right without a wiki. Fish
   sicken below an outfall because concentration is real. ⚠ Gap: the
   tide is not built, so the estuary's richest lesson (salt water running
   up on the flood) waits.
2. **Creative expression.** The ordinary case is one line — a room
   cites a reach — and the moor heath proves it. The bespoke case is a
   `stocks:` override, visible in the prose. Nobody generates water.
3. **Immersion.** The wait you chat through; a bite that is the fish's;
   a fight you can lose; a fillet that turns by morning; the outfall's
   fish that make you sick and never say why. ⚠ The pets lesson stands:
   no sentence the model does not back — *"the water runs fast today"*
   is a flow read or it is not written.
4. **Values.** Two forced choices: **keep, eat, sell or release** what
   you took; and **rod or net** on a commons — one person with a net can
   empty the confluence and the next fisher finds it empty. Standing: the
   chronicle for the landmark catch, the market for the monger, no
   fishing level anywhere. The royal fish is the polity's first fishery
   question, asked before the polity can answer it.
5. **Epochs.** Rod, pot, net, weir — medieval. The reel, the fly, the
   trawler are tools with epochs; the mechanism (a stock, a draw, a
   recovery) holds from a Roman fish-sauce works to a factory ship.

---

## The drive

Run at the end of the build, before the MR opens. One player, two
sessions; a wizard may skip game-days where a step says so.

**At the general store**
1. `buy rod`, `buy bait`, `buy pot`, `buy net`, `buy bowl`. Each is a
   real thing in hand; `look rod` names no number.

**At the bank at the confluence**
2. `look` — the water reads: the confluence, its width, the outfall
   downstream. A novice's read says nothing of what it holds.
3. `fish with worm` — the wait begins; `say` works during it; the line
   stays slack for a while and nothing explains why.
4. A bite: a small mullet **lands itself** — *"a grey mullet, a hand and
   a half long"* in hand; `look mullet` gives a size in words and no
   number.
5. `fish` again until a fighter takes: the contest opens; `reel` twice
   fast → the line **snaps** — the fish is gone, the rod is not, and the
   message says what the reach holds, not what you did wrong.
6. `fish` again; this time `reel` / `slack` patiently → landed.
7. `release mullet` — it is gone from hand; `look` at the water reads
   the same.
8. `set pot` — the pot is in the water; walk to the market and back
   (a game-hour, skipped by wizard); `lift pot` → a shore crab, or
   nothing, and nothing says which was luck.
9. `set net`; `lift net` → several fish at once; repeat four times →
   the fourth lift is thin, the fifth is **empty**, and a practised
   `look` reads *fished out*. `talk fisher` → he says the water is
   empty, and nothing about you. Skip three game-days → `look` reads
   the water recovering; `lift net` gives fish again; `talk fisher` →
   *eels run on the ebb* — the read, in his mouth, before yours can see
   it.
10. `fish` at the room **below the outfall** → a fish; `look` at it says
    nothing; `eat` it raw → within the hour, sick, with the ordinary
    signs and no line naming the water.

**At the market**
11. `consign mullet --ask 4` at the fish stall → listed; a second
    character `buy mullet` → the consignor's balance rises by the ask
    less the commission (`bank` shows both legs).
12. Hold a second fish a game-day (skipped) → `look` reads it turned;
    `consign` → refused as turned; `butcher` it anyway → fillet, offal;
    `smoke` the fillet → it keeps.

**At the moor's heath** (second session, started there)
13. `look` — the meres on the heath, the Holloway's head; `fish with
    worm` → a brown trout, and **no mullet, no crab, no eel**: the
    Holloway's record is the Holloway's, and no table was written for it.

**At Heart's Delight's millsite** (a third session, started there)
13b. Nobody authored fishing here. `fish with worm` from the millrace's
    bank → a trout or nothing, honestly drawn from the Delight's `flats`
    reach — a locality that never mentioned fish has them, with **no
    change to its pack**.

**The kept fish**
14. Back at the confluence: `fish` until a small carp; `put carp in
    bowl` (the bowl filled from the district tank) → it lives; `look
    carp` reads unnamed; `offer crumbs to carp` → it comes up for them.
15. Three game-days of feeding (skipped) → `name carp Barnaby` → **ok**;
    before the three days → *"it has not chosen you"*. `find … mine` →
    *Barnaby*, and never where he is. Restart the server → Barnaby is in
    his bowl.

**The sturgeon**
16. (Wizard biases the reach's draw.) `fish` → the contest at full
    fight; land it → `look sturgeon` reads *a royal fish*; the chronicle
    holds the deed; nothing stops you keeping it.

**The four links**, walked for each of `fish`, `set`, `lift`, `reel`,
`slack`, `release`: the verb exists; the feature or tool affords it; the
species and material rows are present; the fishery record is live at
boot with nobody having fished.

---

## Acceptance criteria

Observable from outside the code.

- A person with a rod and bait at the confluence bank can wait, be
  refused in silence, land a small fish without a contest, and lose or
  land a fighter through `reel` / `slack`.
- No number is ever shown for a fish's size, a reach's stock, a fisher's
  competence or a rod's condition — bands and words only.
- A practised reader at a water is told the one factor that limits a
  species there, in words (*too warm for trout this month*), and it is
  the same factor a keeper will one day read off a tank; the moor's
  water reads soft and cold, the confluence's hard and slow.
- The confluence and the moor's heath hold **different species with no
  table authored for either**; Heart's Delight's millrace, whose pack
  was not touched, yields fish from the Delight's own reach.
- The fisher at the bank fishes the confluence on his own, reads the
  water aloud when asked, and reports it empty after a net has emptied
  it — without naming who did it.
- The fishmonger is appointed by the market's committee, keeps a shift,
  and can be replaced through `appoint` like any other position.
- A reach netted repeatedly empties within an afternoon of game time and
  recovers over game days; `look` by a practised fisher reads both.
- A fish taken below the outfall carries the city's contamination; eaten
  raw it sickens the eater; nothing on the fish or in the water says so.
- The fish stall lists a fresh fish on consignment and refuses a turned
  one; a buyer's coin reaches the consignor less the commission; a
  fillet spoils on the shipped clock and keeps when smoked or salted.
- A small carp kept and fed in a bowl for three game days can be named,
  is listed by `find … mine` without a place, and is in its bowl after a
  server restart; before three days, naming is refused as *not chosen*.
- The sturgeon exists in the confluence's record, reads as a royal fish,
  and its catch and its release are chronicle deeds.
- `cast` still casts spells.
- Every one of the drive's steps was run against a live game and
  recorded.

## Cross-references

- Seeding slates: [fishing-slate](../slates/builds/fishing-slate.md) ·
  [underwater-slate](../slates/builds/underwater-slate.md) (out of scope,
  designed) · [authored-vs-procedural](../slates/builds/authored-vs-procedural-slate.md)
  · [hunting-slate](../slates/builds/hunting-slate.md)
- Subsystem docs: [watershed.md](../subsystems/watershed.md) ·
  [ranching.md](../subsystems/ranching.md) · [pets.md](../subsystems/pets.md)
  · [spoilage.md](../subsystems/spoilage.md) · [logistics.md](../subsystems/logistics.md)
  · [crafting.md](../subsystems/crafting.md) · [retail.md](../subsystems/retail.md)
  · [chronicle.md](../subsystems/chronicle.md) · [advancement.md](../subsystems/advancement.md)
- In flight: forestry (build-1) — tools carry epochs; the land-use
  covenant that will read them.
