# Heart's Delight — the locality (design, staging)

> **Target seeds:** a new pack, `packages/content/hearts-delight/` ·
> `content/world/hearts-delight/**` · a `Locality` row at
> `world-seed/content/stuff/idea/Locality/hearts-delight.yaml` ·
> ⚠ it must claim its own namespace root (`classFileOf` resolves by
> longest prefix) if it ships any `src/`.
>
> **Retire when:** the valley is in YAML — the Locality, the crossroads,
> the packing house, the co-op hall, the pump house, the road house, the
> two farmsteads, and the seven cast.
>
> **Status: design, pre-requirements. NOTHING EXISTS TODAY** — only the
> hydrology (`Watercourse/delight`). ⭐ **The Stage B gate is CLEARED:**
> `roadmap.md` and `farming-plan.md` §Stage B both say it waits on
> residences Waves 0–5, and those shipped. B0 re-grounds first.
> Rationale: [towns-slate](../slates/builds/towns-slate.md);
> mechanics: `farming-slate` + `husbandry.md` + `smallholding.md` +
> `watershed.md`.

---

## 1. What kind of place it is

**A name that was an advertisement, and came true, and is quietly
stopping.**

Heart's Delight was **sold**. Somebody drew a valley, wrote a name on it
that no local had ever used, and put it in front of people who wanted
land: *artesian water — you drill and it comes up on its own.* And it was
true. The wells flowed without a pump, the flats turned out to be alluvial
and deep, and within a generation this was the most productive ground in
the realm.

Now the wells need pumping. Nobody has decided this is a problem.

⭐ **It is the pleasantest town in the realm sitting on the thing that
will undo it, and the mechanism is legible to anyone who reads the well.**
It is not doomed — it is doomed *if the players over-draft*, which is a
completely different and much better proposition.

**Tone register.** Warm, unhurried, generous with time in a way the other
two towns are not — and **seasonal**, which is the real characterisation:
in bloom the valley is a postcard, in the pack it is a factory, and in
February it is empty. The same people, four different towns.

**What is normal here that is shocking elsewhere:** eating another
family's fruit off the tree without asking; a six-week job being your
whole year's income; knowing to the day whose water right is senior to
yours.

**What is shocking here that is normal elsewhere:** wasting water; taking
the spot price; picking green.

---

## 2. The two halves

| | |
|---|---|
| **Functional** | orchards + fields on the flats · the perennial/fruit cycle (Stage A substrate) · irrigation off the Delight · groundwater |
| **Support** | the packing house · the drying yards · the growers' co-operative · the pump house · the depot · the road house |

⚠ **Author both halves in one build.** Heart's Delight is the one town
whose support half is richer than its functional half; shipping orchards
and coming back later builds the least interesting third of it.

---

## 3. Geography and the room map

⭐ **The valley does not nucleate.** Mining camps cluster at the adit and
suburbs cluster on the lane, but an agricultural district is *spread* —
farmsteads on their own ground, and a crossroads where the road, the rail
and the water happen to meet. Do not build a main street. Build a
**crossroads plus a scatter**.

The Delight runs the length of it: spring at 720 m, **the flats at
180 m** (240 km² of catchment — where the diversion fight will be), mouth
at 35 m joining the Kestrel at the confluence. Rejection is upstream.
Terminus is at the mouth.

```
   ▲ upstream — REJECTION (and what it puts in the water)
   │
   │   the upper bench (thin soil, junior rights) ── Avila's ten acres
   │        │                                          └─ his own well
   │   ═════╪═══════════ the valley road ═══════════════════════▶
   │        │                                                   Terminus
   │   the crossroads:  the depot ── the packing house ── the store
   │        │           the co-op hall ── Rovere's (the road house)
   │        │
   │   the flats (deep alluvium, senior rights) ── Furtado's apricots
   │        │                                    └─ the head gate
   │   the pump house + the town well
   ▼ the Delight ──▶ the confluence ──▶ TERMINUS
```

| room | what it is |
|---|---|
| **the crossroads** | where the road, the rail spur and the ditch meet. The town, such as it is. |
| **the packing house** | the big shed. Grading tables, tray stacks, a scale, a timekeeper's window. Empty ten months a year. |
| **the drying yards** | acres of wooden trays on trestles, in the open. ⭐ The most weather-exposed asset in the realm. |
| **the co-op hall** | the growers' association. A long table, a blackboard with this week's pool price, and the pooling ledger. |
| **the pump house** | the town well, the engine, and Terada's notebook. |
| **the depot** | the loading dock on the packing house, stacked with empty trays. |
| **Rovere's** | the road house. Six tables. Full for three weeks a year. |
| **the store** | dry goods, tools, twine, and the mail. |
| **Furtado's** | a farmstead on the flats — house, yard, drying ground, head gate. |
| **Avila's** | a farmstead on the upper bench — smaller, newer, with a well he sank himself. |

---

## 4. Culture

### ⭐⭐ The calendar IS the town

Nothing else about Heart's Delight matters as much as this. It is four
places a year, and a build that ships it as one place has missed it.

| season | what the valley is | who is here |
|---|---|---|
| **Bloom** (~3 weeks) | a postcard. People come up from the city to look at it. Rovere's is full; nobody is working. | everyone, plus visitors |
| **Thinning & the water** | the anxious season. Irrigation begins; the head gate matters; a dry year is decided now. | growers only |
| **The drying season** | trays out in the open, and ⭐ **rain is a disaster** — the first place in the realm where weather costs real money | growers + hands |
| **The pack** (~6 weeks) | a factory. The packing house runs all hours; two hundred hands; the depot never stops. | everyone + migrants |
| **The off-season** (~5 months) | empty. The shed is locked. People live on what the pack paid. | the permanent nine |

⭐ **Seasonal employment is a labor pattern nothing else in the game
has.** Rejection runs year-round cores; Terminus runs businesses; the
cannery hires two hundred for six weeks and nobody for forty-six. That
single fact generates glut, migrant labor, off-season debt, and the whole
argument for a co-operative — none of which need new mechanics beyond a
roster that can be seasonal.

### The other cultural spine

**Water is the subject.** Not weather — *water*, which is a different
thing and the distinction is the town's whole sophistication. Weather is
what happens; water is what you are entitled to. Everyone here knows their
own priority date the way people elsewhere know their age.

**Senior and junior.** ⭐ **Prior appropriation**: first in time, first in
right. In a dry year the senior right takes its full allocation and the
junior right takes nothing — not proportionally less, *nothing*. This is
not villainy and must never be written as villainy. It is the rule
working exactly as designed, and it produces a decent person on the flats
irrigating while a decent person on the bench watches his trees die.

⭐⭐ **And that is the mechanism of the tragedy**: the doctrine on the
river pushes the late arrivals to the aquifer, and *the aquifer has no
doctrine at all*. Groundwater is unallocated. So the juniors drill, and
every one of them is behaving rationally, and the ground goes down. That
is what actually happened in the valley this town is modelled on, and it
is the best piece of teaching in the slate.

**The pool.** The co-op's answer to a different problem: a single grower
has no bargaining power against a single buyer. Sell into the pool and
take the season average; sell on your own and take your chances. ⭐ It is
an economics argument that a character delivers as a *sales pitch*, and
players will genuinely disagree about it, which is the point.

**Species and names.** The valley's register is the most distinct of the
three towns: it was settled by families who came together and farmed the
same ground for three generations. Names carry across the map —
Bettencourt, Furtado, Avila, Massone, Rovere, Terada — and the fact that
a *family* name means something here, and does not in Rejection, is the
cleanest cultural contrast in the realm. Species mixed, but along
**family** lines rather than the individual mixing of the mining camp.

**Money.** Once a year, in a lump, at the end of the pack. Everything else
is credit against it. ⭐ **The whole valley runs on a single annual
settlement**, which is why the store carries everyone and why a bad
drying season is not an inconvenience but a catastrophe.

---

## 5. The cast

All seven are new.

**Amadeu Bettencourt — packing-house foreman.**
Runs the shed and, for six weeks a year, decides who works. Two hundred
people want a place and he has a hundred and forty, and he has done this
for nineteen years without ever pretending it is fair or pretending it is
his fault. Off-season he maintains the machinery alone in an empty
building.
*Dispositions:* `fairness +60`, `diligence +70`, `compassion +35`,
`sociability −25`.
*Routine:* **seasonal.** The pack: 04:00–20:00 daily. Off-season:
09:00–14:00, alone, in the shed.
*Affords:* ⭐ the hiring gate (a real scarce thing to want) · the grading
tables · the timekeeper's window · the seasonal roster.

**Ilaria Massone — secretary, the Delight Growers' Association.**
Keeps the pool. Explains, patiently and repeatedly and to anyone, why you
should take the average rather than gamble on the spot price — and she is
right, and about a third of the valley does not do it. Chalks the week's
pool price on the board herself.
*Dispositions:* `fairness +80`, `patience +75`, `worldview +55`,
`humility +40`.
*Routine:* the hall 08:00–17:00 through thinning and the pack; three days
a week otherwise. Board updated 08:00.
*Affords:* ⭐ the pooling ledger · the price board (a public, honest,
readable market signal) · membership as a real choice with a real cost ·
the counterpart to Rejection's co-op — that one distributes *labor*, this
one aggregates *market power*.

**Osamu Terada — the pumpman.** ⭐⭐ *the town's instrument*
Keeps the town well and the engine. Eleven years ago he started writing
down the standing water level every month, because nobody asked him to and
he wanted to know. He now has eleven years of readings in a notebook and a
conclusion he has told four people, none of whom did anything.
He is not a prophet and must not be written as one. He is a **competent
technician with a good dataset and no authority.**
*Dispositions:* `diligence +85`, `honesty +75`, `patience +50`,
`boldness −45`.
*Routine:* the pump house 06:00–18:00 daily, year-round — ⭐ the only
non-seasonal job in the valley, because the water does not have a season.
Reads the well on the first of the month.
*Affords:* ⭐⭐ **the notebook** — a readable object whose eleven-year
trend *is* the common-pool lesson, delivered as evidence rather than as
narration · the engine · the town well · the subsidence hook.

**Perpétua Furtado — the flats, apricots, third generation.**
Holds the best ground in the valley and the oldest water right on it. Her
grandmother's priority date is 40 years senior to anyone on the bench, and
in a dry year that means she irrigates and they do not. She is fully aware
of this, does not enjoy it, and would not give it up — because the right
is the farm, and the farm is three generations.
⭐ Write her **decent**. The doctrine hurts precisely because the person
holding the senior right is not a villain.
*Dispositions:* `constancy +75`, `fairness +50`, `generosity +55`,
`humility +30`.
*Routine:* dawn–dusk in season, at the head gate at first light on an
irrigation day. Off-season: pruning, and Rovere's on Sunday.
*Affords:* the senior right (and the head gate that expresses it) · the
best fruit and the highest grade · the oldest orchard · the model
smallholding a player learns from.

**Gil Avila — the upper bench, ten acres of prunes, and a well.**
Came late and bought what was left: thin soil, a junior right, and no
surface water in a dry year. So he sank a well, like everyone else on the
bench, and it worked, and it has kept working, and his pump runs a little
longer every year than it did the year before. He has noticed. He has not
connected it to anything and would resent the suggestion.
⭐⭐ **He is the tragedy's mechanism wearing a face** — an entirely
rational person taking the only option the doctrine leaves him.
*Dispositions:* `ambition +60`, `boldness +55`, `trust −40`,
`worldview −35`.
*Routine:* dawn–dusk in season; the pack at the shed (he takes shed work,
which the flats families do not); Rovere's most evenings.
*Affords:* the junior right · a private well · ⭐ the bench-vs-flats
argument, which is the valley's live political conflict · the second
opinion on every water question.

**Bia Rovere — the road house.**
Six tables, and for three weeks in bloom every one of them is full of
people from the city who have come up to look at the trees. The rest of
the year it is the valley's one room with a fire. She has strong views
about visitors and serves them beautifully.
*Dispositions:* `sociability +70`, `temperance −30`, `honesty +55`,
`generosity +45`.
*Routine:* 11:00–23:00; through bloom, 08:00–01:00.
*Affords:* the valley's public room · bloom-season tourism (⭐ a *demand*
event that is not agricultural) · lodging for migrants and visitors · the
room where the bench and the flats actually meet.

**the timekeeper (unnamed, seasonal).**
Sits in the packing-house window for six weeks and records hours for two
hundred people. ⭐ Functional cast, deliberately minor, and the seam any
future labor build needs: **the place where seasonal hours become money.**
*Routine:* the pack only. Otherwise absent from the world.

---

## 6. The economy

**In:** equipment · trays · twine · coal · capital (against next year's
crop) · ⭐ **seasonal hands**, from the city and from Rejection's
off-cores.
**Out:** ⭐ **food** — dried fruit, packed fruit, preserves. The only town
that feeds the city.
**Made here, consumed here:** almost nothing. This is an export valley.
**Scarce:** water (in a dry year, absolutely) · trays and shed capacity
(in the pack, absolutely) · nothing at all in February.

⚠ **Everything is timed.** Fruit is worthless unless graded and moved
inside a window; the drying yards are the window made physical. This is
why von Thünen puts a cannery here rather than in the city: perishable,
high-value, short window → **preserve, or be close.**

**Terminus relation.** The valley feeds the city and takes its capital,
its equipment and its market. ⭐ And it sits *between* Rejection and
Terminus on the water — so the ore town's fouling arrives here first, and
the city's aqueduct to Cold Fell was cut to run *past* it. Neither of
those is the valley's decision, and neither of those is anyone's to
appeal to. **The valley is downstream of a polity that does not govern it
and upstream of a polity that does not answer to it**, which is why a
river authority is the one institution that would follow the second
hierarchy.

---

## 7. Institutions and the open seats

| institution | what it is | the seat a player could hold |
|---|---|---|
| the Growers' Association | a marketing co-op: pool, average, ledger | ⭐ **member** (the real choice) · **secretary** |
| the packing house | seasonal employer; ~140 places for ~200 wanters | **hand** · **grader** · **timekeeper** · **foreman** |
| the water rights record | prior appropriation: priority dates, seniority | — (a *record*, not an office; ⭐ nobody adjudicates it) |
| the town well | the pump house, the engine, the notebook | **pumpman** |
| *(none)* | ⚠ **no government row**, deliberately | — |

⭐ Heart's Delight ships **no `Government`**, like Rejection — but its
civics lesson is a third thing again. Rejection charters *from nothing*;
Hinkley *captures an empty shell*; the valley **faces the commons**: a
resource nobody can fence, a doctrine that allocates the river and not the
aquifer, and no institution whose jurisdiction matches the problem.

---

## 8. Hooks — what a future build can rely on

| if you are building… | Heart's Delight has / will have |
|---|---|
| **farming Stage B** | the whole functional half; titled rural ground at scale; the field-room |
| **seasonal labor** | ⭐ a roster that hires 140 for six weeks and 0 for forty-six; the timekeeper's window |
| **water rights** | priority dates, a senior holder (Furtado), a junior holder (Avila), a head gate, and no adjudicator |
| **groundwater / subsidence** | ⭐⭐ Terada's eleven-year notebook; the aquifer as the *unregulated* resource; `elevation` as the readout |
| **preservation / spoilage** | the drying yards, the pack window, the cannery |
| **weather with stakes** | rain during the drying season — the first place weather costs money |
| **co-operatives** | the pool, the ledger, the price board, and a live disagreement about whether to join |
| **freight** | the depot, the rail spur, a perishable cargo with a clock |
| **tourism / demand events** | ⭐ bloom — three weeks of city visitors, a non-agricultural demand shock |
| **credit** | one annual settlement; the store carries everyone; a bad drying season is a solvency event |
| **the river authority** | the valley is where the need is felt: fouled from upstream, bypassed from downstream |

---

## 9. Open forks

- **How subsidence couples.** The pedagogy is settled and the readout
  (`elevation`, an inherited zone field) exists; the function from
  cumulative draw to elevation is unwritten. ⚠ It must be **slow, visible,
  and player-caused** — never a scripted timer.
- **Does the co-op pool actually pay better?** It should be *genuinely
  arguable* — average versus variance, not a right answer with a wrong
  alternative.
- **Who arbitrates a water call?** Nobody, today. That is the design, and
  the first real dry year is the event that demands an answer.
- **Migrant labor.** Where do the pack's two hundred hands come from, and
  where do they go in February? Rejection's off-cores is one answer; the
  city is another; a third town is a third.
- **Is there a school?** Unlike Rejection, the valley has *families*, so
  the answer is probably yes and it is probably one room. Deferred.
- **The name.** Somebody wrote it on a plat as an advertisement. ⭐ Who,
  and are they still alive, and does anyone in the valley know? A very
  cheap piece of lore with a lot of leverage.
