# Heart's Delight — the locality (design, staging)

> **Target seeds:** a new pack, `packages/content/hearts-delight/` ·
> `content/world/hearts-delight/**` · a `Locality` row at
> `world-seed/.../Locality/hearts-delight.yaml` · ⚠ it must claim its own
> namespace root if it ships any `src/` (`classFileOf` resolves by longest
> prefix).
>
> **Retire when:** the valley is in YAML — the Locality, the crossroads,
> the packing house, the co-op hall, the pump house, the tower, the depot,
> the road house, two farmsteads, and the cast.
>
> **Status: design, conversation-settled 2026-09-03. NOTHING EXISTS
> TODAY** — only the hydrology (`Watercourse/delight`). ⭐ The Stage B gate
> is CLEARED (residences Waves 0–5 shipped); B0 re-grounds first.
> ⚠⚠ But see § 1 — **winter does not exist for plants**, and this town is
> a calendar.
> Rationale: [towns-slate](../slates/builds/towns-slate.md); mechanics:
> `farming-slate` + `husbandry.md` + `smallholding.md` + `watershed.md`.

---

## 0. The sources

**Cannery Row** (primary) · **Mark Twain** · *Field of Dreams* ·
*Children of the Corn*. And the real history of the valley this is: old
Sunnyvale, before the orchards were paved.

| source | what it contributes |
|---|---|
| **Cannery Row** | ⭐⭐⭐ **the tone, and it is a correction.** The cannery is the *setting*, not the subject — the book is about the people living in its shadow. Affectionate about a place that is half a dump. Funny on top, melancholy underneath. |
| **Twain** | the register, and the licence to be **funny**. Small-town ceremony made out of nothing. ⭐ And the valley **lags** — rural places run a generation behind, which is a texture, not a deficiency. |
| **Field of Dreams** | ⭐ **the foreclosure, not the ghosts.** A farm inherited, mortgaged, one bad drying season from gone. |
| **Children of the Corn** | one thing only: ⭐ **the countryside is legible to insiders and opaque to outsiders.** A visitor cannot read the valley. Not sinister. |

### ⚠ Chinatown is the wrong reference, and it is the obvious one

The best water-rights film ever made, and it needs a **conspiracy** —
someone steals the water so the valley can be bought cheap. Heart's
Delight needs **nobody to do anything wrong**, which is both truer and
worse. Do not reach for it.

---

## 1. ⚠⚠ Readiness: winter does not exist for plants

The **clock** has seasons — `DefaultCalendar` is 360 days / 12 months /
4 seasons, `CelestialApi.seasonFor` is pure, and weather already biases
its transitions by `SEASON_BIAS`.

But husbandry says it plainly: *"the honesty test — **no bloom, no season
of readiness**"*, and *"with no global season, supply arrives in
**pulses**."*

> ⭐⭐ **The world knows it is winter. The crop does not.**

And `farming-slate` lists **winter first** among what is genuinely
unbuilt, while arguing to keep it *hard*: without a season where
production stops, you eat fresh forever and salt, smoke and cold storage
have no reason to exist.

⭐ **This is the reason to build the valley, not a reason to defer it.**
Farming-slate says greenhouses are what winter is for; a fruit valley is
what a *season* is for. Heart's Delight is the content that justifies the
substrate.

Symmetry across the three towns: Rejection needs the `stocks:` inertness
fixed, Hinkley needs `knock` + the storage rule, **the valley needs
winter.** One piece of substrate each.

---

## 2. What kind of place it is

**A name that was an advertisement, and came true, and is quietly
stopping.**

The valley was **sold**. Somebody drew it, wrote a name on it no local had
ever used, and put it in front of people who wanted land: *artesian water
— you drill and it comes up on its own.* It was true. The wells flowed
without a pump, the flats turned out to be deep alluvium, and within a
generation this was the most productive ground in the realm.

Now the wells need pumping. Nobody has decided that is a problem.

### ⭐⭐ The tone (and this is where I had it wrong)

Not a postcard with a problem. **Warm and shabby.** Cannery Row's valley
has a **demimonde** — the people who came for the pack and stayed, the
ones living in the shed off-season, the ones who are simply *around*. The
orchards are genuinely beautiful and there are people asleep in the
packing house, and both are the same town.

Tonally distinct from its siblings by design: **Rejection is
deadpan-grim, Hinkley is paranoid, the valley is warm, comic and shabby**,
with the sadness underneath rather than over the top.

**Normal here, shocking elsewhere:** eating another family's fruit off the
tree without asking · a six-week job being your whole year's income ·
knowing to the day whose water right is senior to yours.
**Shocking here, normal elsewhere:** wasting water · taking the spot
price · picking green.

---

## 3. ⭐⭐⭐ How towns form — the founding sequence

This is the town's lesson, and the real mechanism is wonderfully mundane.
**Seven steps, in order, and every one is a thing you can walk to:**

1. **The water.** Artesian ground. *That is why anyone farmed here.*
2. **The land.** Halloran held it first, on a grant, with a right nobody
   had to give him.
3. ⭐ **The rail.** Halloran gives the right-of-way — so the stop goes on
   **his** land rather than anywhere else. The town's location is a gift
   with a motive (§ 4).
4. **The shipping point.** Fruit is perishable and the stop is where it
   can leave, so the packing house goes at the stop.
5. **The store.** People are at the stop, so somebody sells to them.
6. ⭐⭐⭐ **The name.** They apply for a post office and are told the name
   is taken.
7. **The map.** Now it exists.

⭐ Walk depot → store → packing house and you have walked the town's
formation in order. Von Thünen made personal, with no exposition at all.

### The name

The town was **Halloran**. Then a clerk somewhere said there is already a
Halloran in this realm — pick another.

So they picked a **sales pitch.** *Heart's Delight* was what the land
agents were calling the valley; nobody local had ever said it. It stuck,
and then it came true, and now it is the name. ⭐ The old-timers still say
Halloran's.

⭐⭐ **Halloran gave the land, the town took his name for it, and a postal
clerk took it back.** Funny, slightly sad, and it is the *exact* Rejection
theme — legitimacy is granted elsewhere — in a comic register instead of a
bleak one.

> ⭐⭐⭐ And the engine already enforces the post office's rule:
> `AddressRegistry` — **"One Locality per prefix — a duplicate claim is an
> authoring error."** The founding joke is a hard invariant.

---

## 4. ⭐⭐⭐ Why Halloran gave the land

Why does a man give away the best of his ground for a right-of-way?

**Because he had been cut off.**

A generation before the valley, Halloran came **over the pass** with a
party that made it, and then went back into the mountains in winter for a
party that had not. Somebody who has been on the wrong side of a mountain
in snow understands what a rail line *is* in a way nobody else in the
valley does. He did not give the land out of charity or speculation — he
gave it because he knew what it costs to be unreachable.

> **The town exists because its founder had been trapped.**

The rail is one man's answer to the worst thing that ever happened to him,
and the town he made out of it is the most comfortable, least dramatic
place in the realm, **and nobody knows why it is there.**

### The geography already agrees

Rejection is at the **headwaters** — the high country, the snowpack, the
pass. The valley is the middle reach. So the road Halloran came down is
the same valley road that now carries ore to the city, and the mountains
that nearly killed him are where the mine is. ⭐ One line on the map
carrying the watershed, the freight route and the founding.

### ⭐⭐ Why the realm needs this

Rejection Act I is a town discovering it has **no mechanism** for trouble
on nobody's claim. Act III is a town discovering its charter does not
cover the people who need it.

The valley was founded by a man who went back over the pass for strangers
with **no mechanism at all** — just people who decided to. That is the
collective action problem *solved*, once, by nobody in particular, before
any of these institutions existed, sitting forgotten under the pleasantest
town in the realm.

Without it the three towns are three flavours of institutional failure.

⚠ **Leave the cannibalism alone.** The historical party's fame is a thing
this game has no use for. The usable half is *a party trapped over a
winter, and a relief that went back.* It needs almost no detail — it needs
to be **true in the world and unremembered in the town.**

### How it surfaces: findable, unremembered, ⭐ and published by a player

Not a quest. A **document** — the depot's railroad paperwork, the co-op's
oldest minute book, the post-office correspondence about the name. The
same shape as Delia holding Prentice's name in a filing cabinet.

⭐⭐⭐ **And then the wiki.** The lore is not revealed by the game; it is
**recovered by a player and published**, with `provenance` recording who
found it. After that the town knows. Doing history as a permanent,
attributed mark on the world — which is the best available use of that
subsystem and exactly right for a game whose product is applied hours.

### ⭐⭐ The last Halloran works the pack

There is still a Halloran, and he is **seasonal labor** — six weeks in the
packing house on ground his family gave away the best of, with no idea,
and maybe a vague family sense that they "used to have more."

Cannery Row precisely: marginal people carrying a history nobody is
reading. It lands on the two-entry-points structure, and it is the
sharpest version of *the town forgot* — **the person who is the evidence
is right there, stacking trays.**

---

## 5. ⭐⭐⭐ The water tower

Ask anyone from the valley to name a landmark and they say **the water
tower painted as a can of peaches.**

Mechanically it is two shipped systems composed and no new code: a
`StorageNode` (water — Hinkley's tank is already one) wearing a
`BrandedMixin` mark (corpo, resolve-on-read). It is what you see from the
road before you see the town, and it should be the valley's arrival image.

Thematically it is almost too good: **the town's water is held in a
container shaped like the thing the water becomes.** Water → fruit → can →
the tower holding the water. And the mark on it is not the town's. It is
the buyer's.

### ⭐⭐ Three artifacts, one theme

- **the name** — assigned by a postal clerk
- **the tower** — wearing a buyer's brand
- **the land** — sold, one owner at a time

Heart's Delight's identity, its landmark and eventually its ground all
turn on somebody else's decision, **and nobody in the story does anything
wrong.**

---

## 6. Geography and the room map

⭐ **The valley does not nucleate.** Mining camps cluster at the adit and
suburbs cluster on the lane; an agricultural district is *spread* —
farmsteads on their own ground, and a crossroads where the road, the rail
and the water happen to meet. **Do not build a main street. Build a
crossroads plus a scatter.**

The Delight runs its length: spring 720 m → **the flats, 180 m** (240 km²
catchment — *"the diversion fight, when it comes, is here"*) → mouth 35 m,
joining the Kestrel at the confluence.

```
   ▲ upstream — REJECTION (and what it puts in the water)
   │        ↑ the pass Halloran came over
   │
   │   the upper bench (thin soil, JUNIOR rights) ── Avila's ten acres
   │        │                                          └─ his own well
   │   ═════╪═════════ the valley road ══════════════════════▶ Terminus
   │        │
   │   the crossroads:  the depot ── the packing house ── the store
   │        │           the co-op hall ── Rovere's ── ⭐ THE TOWER
   │        │           (⭐ the Hendy site: rail frontage, empty)
   │        │
   │   the flats (deep alluvium, SENIOR rights) ── Furtado's apricots
   │        │                                    └─ the head gate
   │   the pump house + the town well ── the drying yards
   ▼ the Delight ──▶ the confluence ──▶ TERMINUS
```

| room | what it is |
|---|---|
| **the crossroads** | where the road, the rail spur and the ditch meet. The town, such as it is. |
| **the packing house** | the big shed. Grading tables, tray stacks, a scale, a timekeeper's window. Empty ten months a year. |
| **the drying yards** | acres of wooden trays on trestles, in the open. ⭐ The most weather-exposed asset in the realm. |
| **the co-op hall** | a long table, a blackboard with this week's pool price, the pooling ledger, and ⭐ minute books going back to the founding. |
| **the pump house** | the town well, the engine, and Terada's notebook. |
| ⭐ **the tower** | the peach can. `StorageNode` + a brand. |
| **the depot** | the loading dock, stacked with empty trays. ⭐ And the railroad's own paperwork. |
| **Rovere's** | the road house. Six tables. Full for three weeks a year. |
| **the store** | dry goods, tools, twine, and **the post office**. |
| **Furtado's** | a farmstead on the flats — house, yard, drying ground, head gate. |
| **Avila's** | a farmstead on the upper bench — smaller, newer, a well he sank himself. |
| ⚠ **the Hendy site** | ⭐ **a yard with rail frontage and no building.** See § 10. |

---

## 7. ⭐⭐ The calendar IS the town

Nothing else matters as much. It is four places a year, and a build that
ships it as one place has missed it.

| season | what the valley is | who is here |
|---|---|---|
| **Bloom** (~3 wks) | a postcard. People come up from the city to look at it. Rovere's full, nobody working. | everyone + visitors |
| **Thinning & the water** | the anxious season. Irrigation begins; the head gate matters; a dry year is decided now. | growers |
| **The drying season** | trays in the open, and ⭐ **rain is a disaster** — the first place weather costs real money | growers + hands |
| **The pack** (~6 wks) | a factory. All hours, two hundred hands, the depot never stops. | everyone + migrants |
| **The off-season** (~5 mo) | empty. The shed locked, the trays stacked. ⚠ An agricultural district in February is one of the loneliest places there is — Steinbeck has that under the comedy too. | the permanent few |

⭐ **Seasonal employment is a labor pattern nothing else in the game has.**
Rejection runs year-round cores; Terminus runs businesses; the packing
house hires two hundred for six weeks and nobody for forty-six. That one
fact generates glut, migrant labor, off-season debt and the whole argument
for a co-operative — with no new mechanics beyond a roster that can be
seasonal.

**Money arrives once a year, in a lump, at the end of the pack.**
Everything else is credit against it. ⭐ The valley runs on a single annual
settlement, which is why the store carries everyone and why a bad drying
season is not an inconvenience but a **solvency event.**

---

## 8. Water — the doctrine, and the tragedy

**Water is the subject.** Not weather — *water*, and the distinction is
the town's whole sophistication. Weather is what happens; water is what
you are entitled to. Everyone here knows their priority date the way
people elsewhere know their age.

⭐ **Prior appropriation: first in time, first in right.** In a dry year
the senior right takes its full allocation and the junior takes
*nothing* — not proportionally less. ⚠ **Never written as villainy.** It
is the rule working exactly as designed, producing a decent person on the
flats irrigating while a decent person on the bench watches his trees die.

> ⭐⭐⭐ **And that is the mechanism of the tragedy: the doctrine on the
> river pushes the late arrivals to the aquifer, and the aquifer has no
> doctrine at all.**

Groundwater is unallocated. So the juniors drill, every one of them
behaving rationally, and the ground goes down. That is what happened in
the valley this is modelled on, and it is the best piece of teaching here.

### ⭐⭐ Nobody takes the valley. The valley sells.

Rejection loses to a **buyer** — a corpo picking up distressed claims
after a crisis. The valley must not lose the same way, because the true
story is worse:

> **Nobody paved the valley. Everybody sold, individually, for a good
> price, and the aggregate was paving paradise.**

Heart's Delight loses to **the price of land**, one owner at a time, each
making a decision that is correct for them. Which is the *same shape as
the subsidence*: individually rational, collectively ruinous, no villain.

⭐ So the valley has **one theme expressed twice** — in water and in land —
and the two mechanisms teach each other.

---

## 9. ⭐⭐⭐ The civic triptych

Rejection and Hinkley are two failure modes of civic life. The valley
completes the set, differently:

| town | its institution | the failure |
|---|---|---|
| **Rejection** | none | needs public authority and cannot get it |
| **Hinkley Hills** | a special district | has public authority and will not use it |
| **Heart's Delight** | ⭐ **a co-operative** | **private ordering that works — in the wrong domain** |

The Growers' Association is a genuinely functioning institution with **no
legal authority whatsoever**: it allocates market power, sets a pool
price, disciplines its members, does real work. Ostrom's territory —
self-organization without a state. It exists because a single grower has
no bargaining power against a single buyer, which is the historical reason
(Sunsweet, Sunkist, Blue Diamond all founded on exactly that).

And then:

> ⭐⭐⭐ **They built an institution for the wrong commons.**

The co-op solves *market power*. The thing killing the valley is the
**aquifer** — a physical commons — and a marketing co-op has no instrument
for it. **Institutions are shaped by their founders' problem, and they do
not adapt.**

### ⭐⭐ Each town holds the institution the next one needs

- **Hinkley's special district** is precisely what the valley needs for
  water.
- **The valley's co-operative** is precisely what Rejection's tutworkers
  need for labor.
- **Rejection's charter fight** is precisely what would make Hinkley's
  District real.

**And none of them talk.** Not contrived — institutions are local and
problems are not.

---

## 10. The economy

**In:** equipment · trays · twine · coal · capital (against next year's
crop) · ⭐ **seasonal hands**, from the city and from Rejection's
off-cores.
**Out:** ⭐ **food** — dried and packed fruit, preserves. The only town
that feeds the city.
**Made and consumed here:** almost nothing. This is an export valley.
**Scarce:** water (in a dry year, absolutely) · trays and shed capacity
(in the pack, absolutely) · nothing at all in February.

⚠ **Everything is timed.** Fruit is worthless unless graded and moved
inside a window, and the drying yards are that window made physical. Which
is why von Thünen puts the cannery *here* rather than in the city:
perishable, high-value, short window → **preserve, or be close.**

### ⭐ Two entry points, and they are class-marked

- **Arrive with capital** → buy ground, become a **grower**. A long loop:
  seasons, trees, a water right, a place in the pool.
- **Arrive with nothing** → take **the pack**. A short loop: six weeks,
  hard, paid in a lump, then nothing.

They do not easily become each other, which is the real agricultural
economy — and it is genuinely different from the other two towns, where
everyone is roughly a peer.

⭐ It also connects the towns physically: a Rejection miner on off-cores
can work the pack. Two labor markets meeting on the valley road.

⚠ **The valley's labor story is NOT a repeat of Rejection's.** Mining
labor is a union of the employed with something to withhold. Farm labor is
**migrant, seasonal, and historically written out of labor law entirely**
— the Delano strike happened outside the NLRA because farmworkers were
excluded from it. Different problem, different instrument, worth having
both.

### ⭐ Hendy: the site, not the building

Joshua Hendy Iron Works built **mining machinery** — stamp mills, ore
crushers, hoists — and moved into the valley because San Francisco burned.
So a works here gives the valley a **direct** relation to Rejection: the
valley builds the machines the mine runs on.

⚠ **But not yet.** `trade-smithing` already ships forge/hammer/quench/
sharpen, so a village smith can make a pick; an ironworks is justified by
the thing a smith *cannot* make — a hoist, a pump, a stamp mill — and
metal-chain Stage A shipped none of those. **Hendy's real customer is the
pump, and the pump does not exist.**

⭐ **So author the site and no building**: a yard by the depot with rail
frontage, obviously waiting for something. Costs a room, commits nothing,
and when the mine goes below the water table the works arrives *in
response to an event* rather than as furniture — and players watch a farm
valley acquire an industry, which is the first beat of the arc that ends
in the orchards being paved.

**Terminus relation.** The valley feeds the city and takes its capital,
equipment and market. ⭐ And it sits *between* Rejection and Terminus on
the water, so the ore town's fouling arrives here first and the city's
aqueduct to Cold Fell was cut to run *past* it. **The valley is downstream
of a polity that does not govern it and upstream of a polity that does not
answer to it** — which is why a river authority is the one institution
that would follow the second hierarchy.

---

## 11. The cast

All new. Names carry across the map — a *family* name means something
here and does not in Rejection, which is the cleanest cultural contrast in
the realm.

**Amadeu Bettencourt — packing-house foreman.**
Runs the shed and, for six weeks a year, decides who works: two hundred
want a place and he has a hundred and forty. Nineteen years of it, without
ever pretending it is fair or pretending it is his fault. Off-season he
maintains the machinery alone in an empty building.
*Dispositions:* `fairness +60`, `diligence +70`, `compassion +35`,
`sociability −25`.
*Routine:* **seasonal.** The pack: 04:00–20:00 daily. Off-season:
09:00–14:00, alone.
*Affords:* ⭐ the hiring gate (a real scarce thing to want) · the grading
tables · the seasonal roster.

**Ilaria Massone — secretary, the Delight Growers' Association.**
Keeps the pool. Explains, patiently and repeatedly and to anyone, why you
should take the average rather than gamble on the spot price — and she is
right, and about a third of the valley does not do it. Chalks the week's
price on the board herself. ⭐ She also keeps the minute books, which go
back to the founding and which nobody has read.
*Dispositions:* `fairness +80`, `patience +75`, `worldview +55`,
`humility +40`.
*Routine:* the hall 08:00–17:00 through thinning and the pack; three days
a week otherwise. Board updated 08:00.
*Affords:* the pooling ledger · ⭐ the price board (a public, honest,
readable market signal) · membership as a real choice with a real cost ·
⭐ the founding record.

**Osamu Terada — the pumpman.** ⭐⭐ *the town's instrument.*
Keeps the town well and the engine. Eleven years ago he began writing down
the standing water level every month because nobody asked him to and he
wanted to know. He now has eleven years of readings and a conclusion he
has told four people, none of whom did anything.
⚠ Not a prophet. **A competent technician with a good dataset and no
authority.**
*Dispositions:* `diligence +85`, `honesty +75`, `patience +50`,
`boldness −45`.
*Routine:* the pump house 06:00–18:00 daily, **year-round** — ⭐ the only
non-seasonal job in the valley, because water has no season. Reads the
well on the first of the month.
*Affords:* ⭐⭐ **the notebook** — a readable object whose eleven-year trend
*is* the common-pool lesson, delivered as evidence rather than narration.

**Perpétua Furtado — the flats. Apricots. Third generation.**
Holds the best ground and the oldest right on it; her grandmother's
priority date is forty years senior to anyone on the bench. In a dry year
she irrigates and they do not. She knows, does not enjoy it, and would not
give it up — the right *is* the farm and the farm is three generations.
⭐ Write her **decent.** The doctrine hurts precisely because the holder of
the senior right is not a villain.
*Dispositions:* `constancy +75`, `generosity +55`, `fairness +50`,
`humility +30`.
*Routine:* dawn–dusk in season; at the head gate at first light on an
irrigation day. Off-season: pruning, and Rovere's on Sunday.

**Gil Avila — the upper bench. Ten acres of prunes, and a well.**
Came late and bought what was left: thin soil, a junior right, no surface
water in a dry year. So he sank a well, like everyone on the bench, and it
worked, and his pump runs a little longer every year than it did the year
before. He has noticed. He has not connected it to anything and would
resent the suggestion. ⭐ And he is mortgaged against next year's crop.
⭐⭐ **The tragedy's mechanism wearing a face** — an entirely rational man
taking the only option the doctrine leaves him.
*Dispositions:* `ambition +60`, `boldness +55`, `trust −40`,
`worldview −35`.
*Routine:* dawn–dusk in season; **takes shed work in the pack**, which the
flats families do not; Rovere's most evenings.

**Bia Rovere — the road house.**
Six tables, and for three weeks in bloom every one is full of people from
the city who have come up to look at the trees. The rest of the year it is
the valley's one room with a fire. Strong views about visitors, served
beautifully.
*Dispositions:* `sociability +70`, `honesty +55`, `generosity +45`,
`temperance −30`.
*Routine:* 11:00–23:00; through bloom, 08:00–01:00.
*Affords:* the public room · ⭐ bloom tourism (a *demand* event that is not
agricultural) · lodging for migrants · the room where the bench and the
flats actually meet.

**⭐⭐ Halloran — the last one, and he works the pack.**
The founder's descendant, seasonal labor in the packing house on ground
his family gave away the best of. No idea. Maybe a vague family sense that
they "used to have more." ⚠ Give him no gravity in the prose — he is
another hand at the tables, and the weight is entirely in what the player
finds out and can tell him.
*Dispositions:* `sociability +50`, `constancy +40`, `ambition −35`,
`curiosity +30`.
*Routine:* the pack only. Off-season: absent, or at Rovere's.

**the timekeeper (unnamed, seasonal).**
Sits in the packing-house window for six weeks recording hours for two
hundred people. ⭐ Functional cast, deliberately minor, and the seam any
labor build needs: **where seasonal hours become money.**

---

## 12. Hooks

| if you are building… | Heart's Delight has / will have |
|---|---|
| ⭐ **winter** | the consumer that justifies it. A valley is what a season is *for* |
| **farming Stage B** | the whole functional half; titled rural ground at scale; the field-room |
| ⭐ **seasonal labor** | a roster that hires 140 for six weeks and 0 for forty-six; the timekeeper's window; migrants who arrive and leave |
| **water rights** | priority dates, a senior holder, a junior holder, a head gate, and **no adjudicator** |
| ⭐⭐ **groundwater / subsidence** | Terada's eleven-year notebook; the aquifer as the *unregulated* resource; `elevation` as the readout |
| **preservation / spoilage** | the drying yards, the pack window, the cannery |
| **weather with stakes** | rain in the drying season — the first place weather costs money |
| **co-operatives** | the pool, the ledger, the price board, and a live disagreement about joining |
| ⭐ **institutional design** | the third leg of the triptych: private ordering that works, in the wrong domain |
| **freight** | the depot, the rail spur, a perishable cargo with a clock |
| **tourism / demand events** | bloom — three weeks of city visitors |
| **credit / foreclosure** | one annual settlement; the store carries everyone; Avila is mortgaged |
| ⭐⭐ **the wiki + provenance** | a founding nobody remembers, findable in three places, **published by a player and attributed** |
| **corpo marks** | ⭐ the tower — a `StorageNode` wearing a buyer's brand |
| **addressing** | ⭐ the post-office joke *is* `AddressRegistry`'s one-Locality-per-prefix rule |
| **the river authority** | the valley is where the need is felt: fouled from upstream, bypassed from downstream |

---

## 13. Open forks

- **How subsidence couples.** Pedagogy settled, readout exists
  (`elevation`, an inherited zone field); the function from cumulative
  draw to elevation is unwritten. ⚠ Slow, visible, **player-caused** —
  never a scripted timer.
- **Does the pool actually pay better?** It must be *genuinely arguable* —
  average versus variance, not a right answer with a wrong alternative.
- **Who arbitrates a water call?** Nobody, today. The first real dry year
  is the event that demands an answer.
- **Where do the migrants come from and go?** Rejection's off-cores is one
  answer; the city another; a fourth town a third.
- **Is there a school?** Unlike Rejection the valley has *families*, so
  probably yes and probably one room. Deferred.
- **When does Hendy arrive?** Gated on the pump. And its arrival is the
  first beat of the valley losing to land price, which is an ending, not a
  phase.
