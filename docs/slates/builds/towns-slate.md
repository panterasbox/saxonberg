# Towns slate — the realm outside Terminus

> **Captured 2026-09-02**, design session in the `master` worktree while
> textiles (`design/textiles`), TPA reform (`design/tpa-reform`) and
> cooking (`build/cooking`) were in flight.
> **Status: decided direction, pre-requirements.**
>
> This slate owns **the towns as places to live** — the half of each
> settlement that is not its industry, the trade relation that binds the
> three to Terminus, and the question of whether NPCs get homes.
>
> It deliberately does **not** own the industries themselves.
> [rejection-slate](./rejection-slate.md) +
> [metal-chain-slate](./metal-chain-slate.md) +
> [mining-slate](./mining-slate.md) own the mine.
> [farming-slate](./farming-slate.md) owns the orchard and the field.
> [property-slate](./property-slate.md) +
> [residence-ladder-design-pack](./residence-ladder-design-pack.md) own
> title and tenure. This slate owns **what those industries make of the
> people who work in them**, which is the part nobody has written.

Substrate: [watershed](../../subsystems/watershed.md) ·
[mining](../../subsystems/mining.md) ·
[smallholding](../../subsystems/smallholding.md) ·
[husbandry](../../subsystems/husbandry.md) ·
[residence](../../subsystems/residence.md) ·
[holding](../../subsystems/holding.md) ·
[employment](../../subsystems/employment.md) ·
[behavior](../../subsystems/behavior.md) ·
[address](../../subsystems/address.md) ·
[residency](../../subsystems/residency.md) ·
[retail](../../subsystems/retail.md) ·
[civics](../../subsystems/civics.md)

**Content for all three towns is staged under `docs/staging/`** — the
cast rosters, routines, room maps, culture and per-town build hooks. Those
are drafting docs and are deleted once they graduate into YAML; the design
rationale stays here.

Siblings: [freight](./freight-slate.md) · [delivery](./delivery-slate.md) ·
[cooperative](./cooperative-slate.md) ·
[campus-grounds](./campus-grounds-slate.md) ·
[cast-archetype](./cast-archetype-slate.md) ·
[household-design-pack](./household-design-pack.md) ·
[tenancy-design-pack](./tenancy-design-pack.md) ·
[preservation](./preservation-slate.md) ·
[zoning](./zoning-slate.md) · [saxonberg-city](./saxonberg-city-slate.md)

---

## ⭐ The frame: every town is two halves

> **The functional half is why the town exists. The support half is what
> the work does to the people who do it.**

This is economic base theory, and naming it matters because it makes the
"creative" half *non-arbitrary*. The basic sector exports — ore, fruit,
labor. The non-basic sector exists to serve the people the basic sector
employs. A mining town has a boarding house because miners are single men
on rotation. A fruit valley has a packing house because fruit rots.

So the generator for each town's second half is **one question**, and it
is not "what would be cool here":

> *What does this work do to the people who do it?*

That constraint is what makes the support half both **teachable** (it is
real economic geography, not decoration) and **expressive** (the answer
is different in every town, and the difference is character).

⚠ **Both halves are content, but they are not the same KIND of work.**
The functional half is mostly mechanism and mostly shipped — it wants
substrate, brains and gates. The support half is mostly rooms, cast and
prose, and it wants almost no engine work at all. That asymmetry is why
this slate is cheap relative to its payoff, and why it can be cut into
per-town slices that ship independently.

---

## ⭐⭐ The realm geometry — Terminus is the clearing house

The relation that was missing from every prior locality doc:

> **The towns do not trade with Terminus. They trade with each other
> THROUGH Terminus.**

| town | sends the city | takes from the city |
|---|---|---|
| **Rejection** | ingots — the input to every tool, rig, fixture and fitting | tools, timber, food, wages, and *people* (nobody is born there) |
| **Hinkley Hills** | nothing material — **labor**, and demand | everything; its income *is* Terminus wages |
| **Heart's Delight** | food — the only town that feeds the city | equipment, capital, the market, seasonal hands |

Rejection's storekeeper sells food grown in the valley. The valley's
cannery buys tin smelted at Rejection. **They never meet.** Terminus is
the room they meet in — which is what makes the market square
load-bearing rather than scenery: it is not where you shop, it is where
the realm clears.

Three ways the city is already the centre in **shipped** content, none of
them said out loud until now:

- **Capital.** Rejection's businesses declare `banksAt: goodkin` — the
  counting-houses. Every town's money is in a Terminus vault. That is not
  a convenience; it is why a river authority would ever have teeth, since
  the institution that can freeze an account can settle a diversion
  fight.
- **Entry.** The only arrival terminal is in Terminus
  (`/world/terminus/terminal/thing/arrival-terminal`). Every player lands
  in the city; every other town is somewhere you *choose* to go. The
  towns are destinations, never origins.
- **Knowledge.** The university is in the city. Every Discipline the
  towns exercise gets **credentialed** somewhere else.

⭐ So the city holds the money, the door and the schooling; the towns hold
the ground, the ore and the food. That is a real political geometry, and
it is the reason Terminus — founded by people who wanted no governing —
ends up governing anyway without ever passing a law.

### The second geometry, and it is deliberately misaligned

`Locality/rejection.yaml` already says this and it is the best sentence in
the content tree: the **address tree is political containment**
(`terminus/rejection`), the **watershed is hydrological ordering**
(Rejection → Heart's Delight → Terminus). Terminus governs its own streets
and has no say over what Rejection puts in the water.

| | Rejection | Hinkley Hills | Heart's Delight |
|---|---|---|---|
| economy | extraction | tenure | cultivation |
| the resource is a… | **stock** — finite, depletes | **space** — fixed, subdividable | **flow** — renewable, seasonal |
| contested good | the seam; the coppice | frontage | **water** |
| on the river | headwaters — *fouls* | side slope — *head problem* | the flats — *diverts* |
| polity | **none** — unchartered | inherited paper District (charter `""`) | **none** — declared absent |
| its road to a polity | **charter from nothing** | **capture an empty shell** | **face the commons** |

⭐⭐ **That last row is the whole civics curriculum**, and it is three
different lessons rather than three instances of one. It is also entirely
latent in shipped rows — nothing below needs to be invented, only built.

---

## Rejection — extraction

> ⭐ **Worked out in full 2026-09-02** — the sources, the three acts, the
> cast and the charter decision are staged under `docs/staging/`. This
> section holds only what a *slate* should: the decisions and why.

**Functional half (shipped).** The Ferrow, four businesses, the grade
chain end-to-end to the ingot, the damps and the canary, the register.
39 files, no TypeScript.

**The gap.** Eight surface rooms and **all eight are workplaces.** There
is nowhere in Rejection to *be* that is not work.

### The sources are a sequence, not a blend

**Perfection, Nevada** (*Tremors*) · **Deadwood** · **Matewan** — one per
act, each a different lens, each causing the next, and none of it
requiring anyone to decide to be a villain.

| act | lens | what it leaves behind |
|---|---|---|
| **I — Tremors** | survival | the town has no mechanism for unowned ground |
| **II — Deadwood** | civics | a charter, worth what Terminus says it is worth |
| **III — Matewan** | political economy | who the charter covers, and who it does not |

### ⭐⭐ The geology carries Act I

**A mine manufactures soft ground** — broken waste and fine tailings
dumped downslope, over the placer gravels the first prospectors washed. So
the lode is in rock and the town sits above unconsolidated fill. Two
consequences:

- ⭐⭐⭐ **The safe place is down the adit.** The mine — dust, damps,
  falls, the thing the creed is built around fearing — is where you *run*.
  Everything they know is backwards.
- ⭐⭐ **The spoil bank is nobody's claim.** The habitat is a by-product of
  the industry, on the one ground the town has no owner for. The Act I
  problem, stated as geography.

And the creed **blinds them first**: a mining camp already has a category
for *the ground took him*, so the first three deaths are filed — honestly,
correctly, by a competent surgeon — as ordinary industrial accidents.

### ⭐⭐ Val and Earl are the labor question

Handymen. Not on any roster, no claim, no wage rate, and no Institute
subscription because casual labour cannot afford a check-off. Every job in
Rejection has an owner — the co-op owns the face, the fuel yard the clamp,
the smelter the furnace. **They do the work with no owner**: clearing
spoil, digging ditch, hauling the dead.

> *Who is responsible for the work nobody employs anyone to do?*

The labor plot, stated without a strike in it — and it pays off in Act III,
because **they cannot strike.** Nobody employs them; there is nothing to
withhold from. The town's one weapon does not fit the two people most
exposed, and the charter's first real test is whether it covers a man with
no employer.

### The support half, derived

- **the Ferrow Institute** — ⭐ the load-bearing new room. A real
  institution: a wage check-off funding the library, the reading room, the
  mutual-aid fund and the meeting hall. The town's school, its insurance,
  and the room it charters itself in. One room, three acts.
- **the Tallow** — the public house, and ⭐ per Deadwood the publican is
  the most powerful person in town: he holds **the slate**, which is every
  man's tab and therefore every man's business. *Whoever holds the debt is
  the government until there is one.*
- **the print shop** — the register says who owns what; the paper says it
  **happened**. And in Act III it is the only detector, because police
  catch what someone saw and journalists catch what is in the books.
- **the Rest** — lodging. ⚠ Not the first rental market (Mayfield Row
  ships that); the rung *below* a lease — a bed by the week, no
  instrument, no term.
- **the infirmary**, **the sharpening shop**, **the spoil bank**, **the
  Row**.

### ⭐⭐⭐ The charter is only worth what Terminus says it is worth

The pressure to charter is **not internal**. Rejection's titles are
honoured by a book only Rejection respects, and its money already banks at
goodkin, in a city that owes it nothing. The town organises so there is
something for a larger power to ratify.

So the charter is a **petition, not a victory**: what they build is *de
facto* authority, real inside Rejection and worth nothing at its edge. An
unrecognized sheriff can arrest a man in Rejection and cannot follow him
to Terminus. ⭐⭐ And **nothing that happens in Rejection is cognizable
anywhere that matters** — which is not colourful lawlessness, it is *why
men get sent there.*

**The knife:** you cannot purchase what nobody owns, and enclosure
requires title. **Terminus recognizes the charter because the corpo needs
clean title to buy.** Legitimacy granted for the purpose of making the
town sellable, handed over by the people who intend to take it. They win
Act II; that is how they lose Act III.

**And the counterweight:** ⭐ Rejection is where the game shows you *why
the Compact exists* — a polity whose legitimacy is entirely at another's
discretion, which is what nearly every real polity is. The fiction may be
bleak precisely because the platform is not. ⚠ Never said in-world.

### The Pinkertons

The pattern already ships in `policing-slate` as *predator and instrument*
— a corpo that wants a strike broken **hires muscle rather than sending
its own**, for deniability. Three facts:

1. **Private force has capacity and no authority.** Authority comes from
   an office; hired men are just men.
2. ⭐⭐ **The frightening one is the deputized one.** Baldwin-Felts agents
   at Matewan were sworn as deputy sheriffs. Your alignment model already
   names that pole **capture**.
3. ⭐ **Rejection has no office to capture, which is worse.** With no law
   they break nothing — and no one has standing to refuse, because
   standing is a thing an office confers.

**The Pinkertons are the reason you need a sheriff**, and the corpo would
prefer the town stayed unchartered. The interests invert cleanly.

⭐ Policing mode: Rejection runs **the hue and cry** (the frontier, per
policing-slate's Tiebout axis) against Terminus's **Peelers**. Two
arguments about law, one road between them, felt by walking.


## Hinkley Hills — tenure

**Functional half (shipped).** 40 generative lots, the plat plan, the
keyed house programme, the garden bed, the District tank. 14 files, of
which **three are authored rooms** — everything a player touches is a
keyed mint.

**The gap, and it is the biggest single-room win in the realm.** Hinkley
is the only ground a player owns, and **the street shows nothing.** You
cannot name your house, write its exterior, hang a sign, or have a
neighbour see from the lane what you did. A suburb's entire nature is that
it is *visible from the street*.

⭐ **One authored `longDescription` per lot, plus a sign, rendered into the
lane** is the highest-leverage addition in this slate. It converts the
most mechanically sophisticated locality in the game from a set of
identical interiors into a place with residents.

**The support half**, derived — dwelling produces nothing, so Hinkley is a
**dormitory suburb** and the rail link is not connective tissue but its
actual economic base:

- **The shop at the stop.** One general store. A round trip to town for
  flour is the entire friction of living here; the shop converts "remote"
  from a tax into a choice.
- **The District office.** A desk for the paper institution that just got
  its first real job (the tank, D27). Today the District has charter `""`,
  no seats, and nowhere to meet.
- **The hall.** What a subdivision builds when it decides it is a place
  rather than a plan. The plat book on the wall.
- **The nursery / seed merchant.** The garden suburb's own supply, and the
  seam to Heart's Delight — planting stock arrives from the valley.

**Character.** Everything is slightly too big for the population: a 400 m³
tank for nine houses, a lane surveyed for a hundred families, signs in
confident letters. It is the **speculative subdivision** — infrastructure
built ahead of demand, waiting to be right. Specific, real, quietly funny,
and already in the shipped prose.

**The other gap.** The ladder (dorm → lot → house → garden) is real and
then stops. Nothing above a quarter-acre, and lot *N* is indistinguishable
from lot *M* — no aspect, no corner, no soil variance, no view. ⭐ One
authored variation axis on the plat makes lots comparable, and therefore
worth choosing between.

---

## Heart's Delight — cultivation

**It does not exist.** No Locality row, no zone, no rooms. What ships is
its **hydrology**: `Watercourse/delight` — spring 720 m → *the alluvial
flats, 180 m, 240 km²* → mouth 35 m, joining the Kestrel at the
confluence. The flats node's own comment: *"the diversion fight, when it
comes, is here."*

⭐⭐ **Its gate is cleared.** `roadmap.md` and `farming-plan.md` §Stage B
both say Heart's Delight waits on residences Waves 0–5 landing on master.
Those landed — `HoldingWarren`, `PlatPlan`, `HoldingProgramme`, D17
identity and the LotHolder rework are all *in shipped Hinkley content*.
Stage B is unblocked today; **B0 re-grounds** and is mandatory.

### It is Sunnyvale, and the real history is the design

The Valley of Heart's Delight was the Santa Clara Valley, c. 1890–1960:
the largest fruit-growing and packing region in the world — apricots,
prunes, cherries, pears — sold to settlers on its **artesian** water. You
drilled and it came up on its own. Then it didn't, so they pumped. Then
the ground sank: roughly thirteen feet of subsidence in San Jose by 1969.
Then the orchards were paved.

That is a complete, true, mechanically-modellable arc, and it hands the
town its whole character.

**The support half**, derived — fruit is seasonal, perishable, and
worthless unless graded and moved inside a window:

- **The packing house / cannery.** The characteristic institution, and
  mechanically a **new economic shape**: a *seasonal* employer. Rejection
  runs year-round shifts; Terminus runs businesses; a cannery hires
  everyone for six weeks and nobody for forty-six. ⭐ Nothing in the game
  has that labor pattern, and it is the one that makes migrant work,
  glut, and off-season debt legible.
- **The drying yards.** Apricots on trays in the sun. A transform whose
  only inputs are **sunlight and space**, which the shipped thermal and
  weather models can drive honestly — and where **rain during drying
  season is a disaster.** ⭐ The first place weather has real money on it.
- **The growers' co-operative.** Sunsweet, Sunkist and Blue Diamond were
  all founded to solve one problem: a single grower has no bargaining
  power against a single buyer. ⭐ It is Rejection's co-op **inverted** —
  that one distributes *labor*, this one aggregates *market power* — and
  joining it is a real choice with a real cost. See
  [cooperative-slate](./cooperative-slate.md).
- **The pump house.** ⭐⭐⭐ **Subsidence is a common-pool tragedy that
  renders as a number going down.** Zones already carry an inherited
  `elevation` field; the water model already has storage and rights. Each
  grower's individually rational pumping lowers the ground for everyone —
  not a scripted doom, only doomed **if the players over-draft**. This is
  the single best pedagogical object in the slate and it is nearly free.
- **The depot and the blossom road houses.** Fruit leaves by rail; people
  came to look at the valley in bloom.

**Character.** The pleasantest town in the realm — sunlit, prosperous,
seasonal — sitting on the thing that will undo it, with the mechanism
legible to anyone who reads the well.

⚠ **Author both halves at once.** Heart's Delight is the one town whose
support half is richer than its functional half; shipping orchards and
coming back later would build the least interesting third of it.

---

## The connective tissue — goods and services in and out

This is not a separate feature. It is what makes the three towns
*necessary* rather than arbitrary, and the realm layout is **already von
Thünen** — nobody has cashed it:

- heavy, low-value, loses mass on processing → **process at the source.**
  Rejection smelts on site rather than shipping ore. Already true, already
  right, and it happened by good instinct rather than by rule.
- perishable, high-value, short window → **preserve, or be close.** Heart's
  Delight gets the cannery and the drying yards for exactly this reason.
- residential outbids agriculture near the centre → **Hinkley is the near
  ring** and grows gardens, not fields.

All three follow from one condition: **transport costing something.**
[freight-slate](./freight-slate.md) has direction set, teamster/drover
designed, wainwright flagged as a gap, and says explicitly that it is the
slate which pulls locomotion-as-activity. That is the build which turns
the map into an argument.

### ⭐ The depot — one room per town, and it is the character piece

The concrete deliverable: **a depot in each town** — the single room where
goods enter and leave. Same function, three rooms that could not look less
alike, each saying what its town is in one `look`:

| town | the depot is… |
|---|---|
| Rejection | a weighbridge and a tally board at the adit mouth |
| Hinkley Hills | a rail platform with a shelter and a noticeboard |
| Heart's Delight | a loading dock on the packing house, stacked with empty trays |

`consign` already works ([retail](../../subsystems/retail.md)), so the
depot rides shipped substrate and needs **no new verb**.

### The valley road

Today every town is a TPA spoke off Terminus — Rejection has *no inbound
exit wired at all*, Hinkley has a rail stop. The watershed is the only
thing that genuinely relates the three, and it is invisible because you
never travel along it.

⭐ **Make the Delight valley the road.** Rejection upstream, Heart's
Delight the middle reach, Terminus at the mouth. One road down one valley
and the fouling becomes something you *walk past*: you leave the pithead,
you follow the water that leaves it, you see what it does to the flats,
you arrive at the city drinking it. Hinkley stays on the side slope,
looking down at all of it, which is why it has a tank.

That converts three separate demonstrations of a water model into a single
legible argument, for one build's worth of rooms.

⚠ It does **not** remove TPA. Fast travel stays the default; the road is
what a hauler uses and what a player walks once.

---

## NPC residence — the interrogation

### The cost is already paid

**28 NPCs. Total. In the whole game.** 8 Terminus, 7 Rejection, 5 Lounge,
4 wilds, 2 Hearthworks, 2 university. Not hundreds.

And **the mechanism already ships.** `lib/behavior/shifts` is a two-state
machine driven off the employment roster: `on-shift` → the workplace,
`off-shift` → `Offstage`, a **no-exit holding room**, moved by `teleport`.
Six NPCs run it today.

Now read what an `Offstage` room already says
(`hearthworks/location/offstage.yaml`):

> *A low back room behind the cookhouse: a cot, a row of pegs heavy with
> aprons, a bench with a whetstone and a bowl of cold stew on it. Where
> the Hearthworks' people are when they are not at the forge or the
> hearth.*

⭐⭐ **That is already a home.** It is already written as one. It has no
address, no door, and is not anywhere — and that is the entire delta. The
roster tick, the presence poll and the off-shift migration are **already
being paid for**.

### The question splits in two, with different answers

**"Should NPCs have homes?" — Yes, and it is nearly free.**

Turn `Offstage` from a void into a real room with a door and an address:
Berta lives above the cookhouse, the storekeeper lives behind
Provisioning, the collier sleeps at the fuel yard because he has not had a
full night in a decade. One exit per NPC, **zero traversal.**

⭐ It is also **historically exact** — live-above-the-shop is how
essentially all pre-industrial urban labor worked, and it is the pattern
the content already stumbled into. You get: you can knock, you can find
someone off-shift, everyone has a place. Most of the immersion, almost
none of the cost.

**"Should NPCs commute?" — Mostly no.**

The throughput cost is small: ~28 NPCs × 2 trips × 15–25 transitions is
about a hundred traversals a day-cycle. Cheap.

⚠ **The real risk is not CPU, it is that you convert a total function into
a partial one.** `teleport` cannot fail. A walk can — blocked, locked,
intercepted, stuck — twice a day, unwatched, forever.

And the benefit is conditional in a way that matters: **an NPC walking
home through rooms nobody is standing in is a tree falling in a forest.**
You pay the cost and get nothing. The immersion only lands *when
observed*.

Which gives the governing rule:

> ⭐⭐ **Commuting is a character trait, not a world rule.**

Live-above-the-shop is the default because it is *true*. The commuter is
the exception, and the exception is the interesting part: the
counting-house clerk who takes the rail up to Hinkley every evening
because he bought lot 7 and is going to make something of it. One NPC, the
commute is his whole personality, and you meet him on the platform. You do
not pay 28× for a texture you need three times.

### The props/cast split does the sorting

⭐ **Props never get homes.** They are minted fresh; a prop with a
residence is a category error, and the designation already declares which
is which. **Cast** gets a home. A handful of cast get a commute. See
[cast-archetype-slate](./cast-archetype-slate.md) — a `residence` is a
natural archetype axis, and `commutes` is a deviation on it.

### ⭐ Where to spend the commuting budget: Hinkley Hills only

The strongest argument for any of this is the one that has nothing to do
with routine: **it instantly gives you neighbours.** A player who buys lot
7 and finds lot 6 belongs to somebody — with a name, a shift, a job in the
city and a light on at 22:00 — has a relationship the engine handed them
for free. Every social substrate shipped (belief, regard, contacts,
notify, reactions) currently has almost nobody to point at outside a
workplace.

So put four or five cast in lots on the lane. They work in Terminus, take
the rail down at 06:00 and back at 18:00, and their houses are the **same
keyed programme** a player buys into. Then:

- the empty subdivision has *some* families, which makes "surveyed for a
  hundred, got one" land as poignant rather than as unbuilt;
- the rail stop is a place where people are, at two predictable times;
- a player's house has a street on it;
- Hinkley's dormitory-suburb economics become **visible** — you can watch
  the town empty out in the morning.

Highest-value version of the idea, at roughly a sixth of the cost of doing
it everywhere.

### ⚠⚠ The residency hazard to prove before building

`canEvict` is overridden on ~20 classes and **every one of them is a
singleton or catalogue** (`ResetWarden`, `MaterialCatalogue`,
`Interactive`, `HelpCatalogue`, …). **No agent class overrides it.** An
NPC idle at home in a room no player visits is a cold-tail eviction
candidate by the default rule.

What appears to save it: the security gate refreshes `lastTouched` on the
raw target **on every successful dispatch**, so a beating brain keeps its
own host warm. Which means the profile most at risk is precisely the one
this slate creates — ⚠ **an NPC whose only brain is `shifts` at a slow
cadence, asleep at home, off-camera.** And it would fail *silently*, at
03:00.

⭐ **Prove this before authoring homes, not after.** It is a one-test
question and the answer decides whether "cast gets a home" needs a
`canEvict` veto on the cast designation.

---

## The teaching venues are not towns

Hearthworks, the Practicum and the Drowned Substation declare **no
address at all** — no Locality, no prefix, no room-level `_address` — and
sit at roots beside `terminus`. They look like orphan towns and are not:
the Hearthworks business row says *"a teaching venue never closes"*, both
positions confer `MakerMixin` on a 24/7 roster.

⭐ They are **teaching venues without a campus**, which is exactly what
[campus-grounds-slate](./campus-grounds-slate.md) is for. Re-homing them
there is that slate's work, not this one's — but it is worth naming here
because it is what leaves the town question clean: **three towns, not
six.**

⚠ The Weeping Moor is a different case — it holds a root prefix
deliberately, in the *other* basin, and `Locality/moor.yaml` explains why.
Leave it.

---

## Decisions

- **D1 — Every town is two halves, and the support half is derived.** The
  generator is *what does this work do to the people who do it*, not
  free invention. Non-negotiable: it is what keeps the character half
  teachable.
- **D2 — Terminus is a clearing house, not a trading partner.** The towns
  trade with each other through it. Content that has Rejection selling
  directly to Heart's Delight is wrong.
- **D3 — The address tree and the watershed stay misaligned.** Already
  shipped doctrine (`Locality/rejection.yaml`); this slate depends on it.
- **D4 — Each town reaches its polity by a different road.** Rejection
  charters from nothing; Hinkley captures an empty shell; Heart's Delight
  faces the commons. Do not converge them on one civics mechanism.
- **D5 — Heart's Delight ships both halves in one build.** Its support
  half is richer than its functional half.
- **D6 — Rejection's support half is a lodging house first.** ⚠ Not the
  first rental market — Mayfield Row ships that. The lodging house is the
  *instrument-free* rung: a bed by the week, no lease, no term. The
  ladder is dorm → lodging → lease → lot.
- **D7 — Hinkley's support half is a facade, then a civic room.** The
  owner-authored exterior + sign rendered into the lane comes before the
  hall.
- **D8 — One depot per town**, riding shipped `consign`. No new verb.
- **D9 — The valley road is authored; TPA stays.** The road is what a
  hauler uses and what a player walks once, not a replacement for fast
  travel.
- **D10 — NPCs get homes; `Offstage` becomes a real addressed room with a
  door.** Cheap, historically exact, and most of the payoff.
- **D11 — Commuting is a character trait, not a world rule**, and the
  budget is spent in Hinkley Hills.
- **D12 — Props never get a residence.** Structural, off the shipped
  designation.
- **D13 — Prove the residency/eviction interaction before authoring
  homes.** ⚠ Silent failure mode.
- **D14 — ⭐⭐⭐ Rejection's charter is only worth what Terminus says it is
  worth.** *De facto* authority is the town's to take; *de jure* is
  Terminus's to grant, discretionarily, by an office a player can hold.
  A player in Rejection petitions, a player in Terminus decides, the corpo
  lobbies the seat and the town has nothing to lobby with.
  ⚠ Design against both degenerate ends — always-decline is a treadmill,
  always-grant has no tension.
- **D15 — Act I is a hazard, not a boss.** The rule is *you cannot be on
  soft ground*; the creature needs no stats. This is the accurate
  adaptation — *Tremors* is a terrain-and-logistics film, not a fight
  film. A fought graboid needs a **scale layer** (multi-cell occupancy,
  submergence) that does not exist; deferred, and worth building on its
  own merits later.
- **D16 — Private force has capacity and no authority.** Authority comes
  from an office. The frightening agent is the *deputized* one, and
  Rejection has no office to deputize into — which is worse, not safer.
- **D17 — Rejection runs the hue and cry; Terminus runs Peelers.** The
  policing slate's aesthetic arc is a Tiebout axis; two arguments about
  law with one road between them.

---

## Grounding (verified 2026-09-02, at `053c891a2`)

- **13 Locality rows ship.** Heart's Delight is not among them and has no
  content of any kind; only `Watercourse/delight` exists.
- **Content volume:** Rejection 39 files, Hinkley Hills 14, Hearthworks
  12, Practicum 7, Moor 4, Substation 4.
- **Rejection**: 8 surface rooms, all workplaces; 8 workings rooms; the
  Hush; 7 cast; 4 businesses. No `_governmentKey` (deliberate).
- **Hinkley Hills**: 3 authored rooms (stop, lane, + the lots zone);
  everything else keyed-minted from `house-programme`. `_governmentKey:
  hinkley-hills`. Tank is the District's first job (D27).
- **28 agent rows total** across all packs.
- **`shifts` brain** = `on-shift → workplace` / `off-shift → Offstage`,
  via `teleport`, not presence-gated, `ambient = false`.
- **`Offstage`** is `/platform/location/Offstage`, no `Exitable`,
  materialized on demand by `singletonOrClone`.
- **Shift schedules**: only the Lounge, the budget, the general store and
  the counting-houses have non-24/7 rosters. Rejection and Hearthworks are
  24/7, so their `Offstage` rooms are **never used in practice**.
- **`canEvict` overrides**: ~20, all singletons/catalogues; **no agent
  class**. `lastTouched` refreshed by the security gate on every
  successful dispatch.
- **Hearthworks / Practicum / Substation**: zero `_address` declarations
  anywhere in their trees.
- **Stage B gate**: `roadmap.md:27` + `farming-plan.md:28` name residences
  Waves 0–5; those shipped. ⚠ Both docs still read as though it is
  pending — fix at sweep time.
- **`banksAt: goodkin`** on Rejection's fuel-yard and provisioning
  businesses.
- **Only TPA arrival terminal**: `/world/terminus/terminal/thing/arrival-terminal`.
- **Combat readiness**: ships a 1v1 poise session + cycle 2's N-party
  melee (threat graph, focus-fire, `defend`, fleeing); ranged bands
  `close·reach·near·far` **derived from the room's real extent in
  metres**. `HazardMixin` is armed→sprung, triggered by the locomotion
  traverse, delivery through the weapon grammar, detection gated by
  concealment. ⚠ **No representation for a creature bigger than the
  room**, no multi-cell occupancy, no submergence state. One shipped
  monster (the wolf, `naturalAttackChannel: point`).
- **The Ferrow `stocks:` table** ships three species as taxonomy only
  (`Gryllus tenebrarum`, `Rattus fodinae`, `Subterracavia pallida`) with
  no creature rows — a prey pyramid with the top missing, and
  ⚠ **inert as shipped, failing silently**.
- **`policing-slate`** already carries the Pinkerton pattern (*predator
  and instrument* — a corpo hires rather than sends), the doctrine line
  *organized crime is governance without license, corpo malfeasance is
  license without accountability*, the press as the only detector for
  ledger crime, and the aesthetic arc as a Tiebout axis (frontier = hue
  and cry, Terminus = Peelers).
- **Mayfield Row** ships the lease tier: Walter, `lease`/`unlease`, the
  Seznick House unit programme; Ricky fronts `title buy`.

---

## Sequencing

Rough order, each independently shippable:

0. ⭐ **Rejection Act I — the hunt** (GREENLIT 2026-09-02). Hazard-shaped,
   buildable on shipped substrate, and it seeds Acts II/III mechanically:
   a town that has just lost six people and cannot work its own ground is
   a town that sells cheap. Needs the `stocks:` inertness fixed in the
   same wave.
1. **Heart's Delight** (both halves) — the gate is clear, it completes the
   spine, and it is the only *new* town. Biggest, and B0 re-grounds first.
2. **Hinkley facade + neighbours** — the owner-authored exterior, the sign
   in the lane, four or five commuting cast in lots. Small, and it is the
   highest immersion-per-line in the slate.
3. **Rejection's support half** — boarding house, public house, sharpening
   shop, infirmary, hall. Mostly rooms and cast.
4. **Homes everywhere** — `Offstage` → addressed rooms with doors, after
   D13's proof.
5. **Depots + the valley road** — cheap to author, inert until freight
   makes travel cost something, and a good room either way.
6. **Freight** — pulls the whole von Thünen payoff. Its own build.

⚠ Steps 2–5 are each far smaller than a normal build cycle. They are
candidates for riding another build's branch rather than opening one.

---

## What this slate does not answer

- **How the polities actually get chartered.** D4 names three roads and
  builds none. That is [civics](../../subsystems/civics.md) +
  [legal-code](./legal-code-slate.md) work.
- **The river authority.** Named as the one institution following the
  hydrological hierarchy; nobody has designed it.
- **Subsidence as a mechanism.** The pedagogy is identified and the field
  (`elevation`) exists; the coupling from draw to elevation is unwritten.
- **Seasonal employment.** The cannery needs a labor pattern the
  employment engine does not have.
- **Whether lots vary.** D7's sibling — an aspect/soil/corner axis on the
  plat is named as a gap and not specified.
- **The wood contest.** Flagged in shipped Rejection content, unwired,
  and it belongs to whoever builds Rejection's second half.
