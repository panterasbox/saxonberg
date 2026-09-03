# Hinkley Hills — the locality (design, staging)

> **Target seeds:**
> `packages/content/hinkley-hills/content/world/terminus/hinkley-hills/**`
> (new: `agent/`, `location/` rows for the support half; amend
> `location/lane.yaml` to render lot facades) ·
> `packages/content/world-seed/content/stuff/idea/Locality/hinkley-hills.yaml`.
>
> **Retire when:** the shop, the District office and the hall exist as
> rooms with cast; the lane renders per-lot facades; and the five
> residents are in YAML with their commutes.
>
> **Status: design, pre-requirements.** Rationale in
> [towns-slate](../slates/builds/towns-slate.md); tenure mechanics in
> `residence.md` / `holding.md` / `smallholding.md`. This doc is the
> **content bible.**

---

## 1. What kind of place it is

**A sales pitch that has not yet come true.**

Hinkley Hills is nine years old, surveyed for a hundred families, and has
nine. Everything in it was built for the town it was going to be: a lane
graded for traffic that does not exist, a tank sized for a suburb, signs
in confident capitals. It is not a ruin and it is not a boomtown — it is a
**speculative subdivision**, the most ordinary and least-written kind of
place, and its comedy and its pathos are the same fact.

⭐ **It is the exact inverse of Rejection.** Nobody chose Rejection;
*everybody* chose Hinkley. Every resident is here on purpose, at cost, for
a reason they can articulate — which makes it the realm's only town where
you can simply ask somebody why they live there and get a real answer.

**Tone register.** Neighbourly, slightly formal, faintly boosterish.
People here are polite in the specific way of people who will be seeing
each other for thirty years and have not yet decided how much they like
each other. Everyone knows everyone's business and pretends not to.

**What is normal here that is shocking elsewhere:** knowing what your
neighbour paid; walking into a garden that is not yours to look at it;
a nine-person institution with a charter, minutes and a clerk.

**What is shocking here that is normal elsewhere:** a fence built without
telling anyone; letting a garden go; not coming to the meeting.

---

## 2. The two halves

| | |
|---|---|
| **Functional (shipped)** | 40 generative lots · the plat plan · the keyed house programme (yard/hall/kitchen/living/bedroom) · the garden bed · the standpipe · the District tank · `title buy` |
| **Support (this doc)** | the shop at the stop · the District office · the hall · **the facades** · five residents |

⚠ **Fourteen files ship and three are authored rooms.** Everything a
player touches is a keyed mint, which is architecturally excellent and
experientially identical from house to house. And **zero NPCs live here.**
The suburb has no people at all.

---

## 3. Geography and the room map

Hinkley sits on the **shoulder**: a hundred metres above the city, on the
basin's edge, with the valley dropping away east. The rail comes up from
town and stops. The lane runs west along the contour, and the lots hang
off it north and south — which is why the gate ring is cardinal and why
your house faces the way it does.

```
        (the lots, north side)
   ┌────┬────┬────┬────┬────┐
   │ 2  │ 4  │ 6  │ 8  │ 10 │
 ══╧════╧════╧════╧════╧════╧══  Hinkley Lane ──▶ west (segments 2–9, minted)
   │ 1  │ 3  │ 5  │ 7  │ 9  │        └─ Hinkley Court branches off seg. 2
   └────┴────┴────┴────┴────┘
        (the lots, south side)
              │
        the stop ── the shop ── the District office ── the hall
              │
              ▼ the rail down to Terminus
```

**Shipped (3 authored):** arrival (the stop) · lane · + the `lots` zone.
**Minted per sale:** yard → hall → kitchen / living / bedroom; road
segments as frontage sells.

**New (3 rooms + 1 mechanism):**

| room | what it is |
|---|---|
| **the shop** | one room at the stop. Stocks what the rail brought. Bo Kettleby's. |
| **the District office** | a desk, a filing cabinet, the tank's reading book, and a framed plat. Delia Prosser's. |
| **the hall** | one room, twenty chairs, a stove, the plat book on the wall. Used four times. |
| ⭐ **the facades** | *not a room* — the mechanism that renders each sold lot's owner-authored exterior + sign into the lane. |

### ⭐⭐ The facades are the single highest-value addition in the realm

Hinkley is the only ground a player owns, and **the street currently shows
nothing.** You cannot name your house, describe its outside, hang a sign,
or have a neighbour see from the lane what you did.

The whole nature of a suburb is that it is *visible from the street*.

Minimum viable: one owner-authored `longDescription` per lot + a sign,
both rendered as `details:` on the lane at the lot's gate. That converts
the most mechanically sophisticated locality in the game from a set of
identical interiors into a place with residents, for one field and one
render pass.

---

## 4. Culture

**The plat.** The organising object — a drawing of a hundred houses that
mostly are not there. It hangs in the hall, in the District office, and in
the shop, and everyone has looked at it. ⭐ **The town's identity is a
document about its own future**, which is precisely what a subdivision is.

**Infrastructure ahead of demand.** A 400 m³ tank for nine houses. A lane
graded for traffic. A District with a charter, a clerk and four meetings
in nine years. Nothing here is broken; everything here is *oversized*, and
the residents are quietly proud of it in a way they would deny.

**The commute.** Hinkley produces nothing. Its income is Terminus wages,
which means the town **empties at 06:00 and refills at 18:00** and is
inhabited during the day only by whoever does not go down. That daily
emptying is the most legible fact about the place and should be visible:
stand on the lane at noon and it is silent; stand there at 18:20 and it
is not.

**Gardens as the local currency of standing.** There is no aristocracy and
no poverty here; there is only what you have done with your quarter-acre.
⭐ Renown in Hinkley is **horticultural**, and it is the only place in the
realm where that is true.

**Species.** Whatever the city is — Hinkley self-selected on *wanting a
garden*, not on ancestry. Author it mixed and unremarked, same as
Rejection, for a completely different reason.

**The year.** Terminus's calendar (the workweek) plus the growing season.
Two local dates: **the District's annual meeting** (badly attended) and
**the day the tank is read** (monthly, by Delia, in a book nobody else has
opened).

---

## 5. The cast

⚠ **Currently zero.** All five are new. Three commute, one does not, one
works here.

> ⭐ The trio is chosen so the lane is **observed at every hour with only
> three people**: one leaves before dawn, one comes back near midnight,
> one never leaves. Every arrival on the lane is witnessed by somebody.

**Delia Prosser — District clerk.** *(lot 3, does not commute — the
office is here)*
The Hinkley Hills Improvement District's one paid officer, at a salary
that is a rounding error. She keeps the minute book of a body that has met
four times, the reading book for the tank, and the plat. She is
scrupulous, under-occupied, and has been waiting nine years for the
District to be asked to do something — the tank was the first, and she
wrote it up at a length nobody has read.
⭐ **She is the civic on-ramp.** Any player who wants to *do* governance
starts by asking Delia what the District is allowed to do, and the honest
answer is: more than anyone has tried.
*Dispositions:* `diligence +80`, `fairness +70`, `patience +60`,
`ambition −30`.
*Routine:* office 09:00–16:00 weekdays. Reads the tank on the first of the
month, 07:00, and writes it up the same evening.
*Affords:* the minute book · the tank reading book · the plat · the
District's (unexercised) powers.

**Bo Kettleby — the shop at the stop.** *(lives behind the shop)*
Sells what the rail brought and nothing else, which means his stock is a
running commentary on the valley's season. Talks to everyone twice a day
by structural necessity and is therefore **the town's actual information
network** — he knows who is behind on what, who has been down to the city
twice this week, and who has stopped buying seed.
*Dispositions:* `sociability +75`, `honesty +40`, `generosity +50`,
`temperance −25`.
*Routine:* 05:30–19:30 daily. Busiest at 06:00 and 18:15 — the two
commuter tides.
*Affords:* the retail floor · **the gossip surface** (a legitimate,
diegetic information source) · the seam to Heart's Delight (his produce
comes up the valley).

**Rosalind Ng — the early one.** *(lot 6, clerk at the counting-houses)*
Down on the 06:00, back on the 18:00, five days a week, nine years without
a gap. Bought lot 6 with her own savings before the District existed and
regards this as the central fact of her life. Growing something on the
north bed that she will not discuss and that is clearly a competition
entry.
*Dispositions:* `diligence +75`, `ambition +55`, `constancy +70`,
`sociability −40`.
*Routine:* leaves 05:50, returns 18:10. Garden 18:30–20:00. Absent all day.
*Affords:* ⭐ the **commuter demonstration** — the one NPC whose existence
makes the town's economics visible · a neighbour whose garden is *better
than yours* · the first horticultural rivalry.

**Teodoro Sandoval — the late one.** *(lot 5, compositor at the press)*
Works the evening forme and comes up on the last train; his is the last
light on the lane, most nights around 23:00. Sleeps until ten. Consequence:
he and Rosalind, who live opposite each other, have met perhaps forty
times in nine years, and both are scrupulously friendly about it.
*Dispositions:* `sociability +45`, `curiosity +65`, `worldview +40`,
`diligence +35`.
*Routine:* leaves 13:30, returns 23:05. Awake 10:00–13:00 and 23:00–01:00.
*Affords:* the **press seam** (news arrives in Hinkley with him, hours
before the ticker) · a lit window at an hour nothing else is lit · night
presence on the lane.

**Hattie Whitfield — the one who never leaves.** *(lot 1, retired)*
Home all day, every day, in the first house built on the lane and the only
one older than the District. She has watched the subdivision fail to
happen for nine years and finds this neither surprising nor sad. Knows
every arrival, every delivery, and how long every visitor stayed, and will
tell you without being asked.
⭐ She is the town's **continuous witness** — the reason a nine-house
street feels observed. Also the natural first holder of any neighbourly
obligation a future build needs (watering while you are away, taking in a
delivery, noticing you have not come back).
*Dispositions:* `curiosity +70`, `honesty +60`, `compassion +45`,
`humility −35`.
*Routine:* always in. Front step 07:00–09:00 and 17:00–19:00, which is
exactly when everyone passes.
*Affords:* the witness surface (belief / perception / notify all get a
subject) · custodial neighbourly acts · the town's oral history.

### ⚠ Notes on wiring the commutes

- Their houses are the **same keyed programme** a player buys into — no
  bespoke rooms. Lots 1, 3, 5, 6 are taken; the player buys from 7 up.
- Commute = the `shifts` brain with a **residence** rather than an
  `Offstage`, and the walk to the stop rendered; the rail leg may stay a
  teleport. The *visible* half is the lane and the platform.
- ⚠ Prove the residency/eviction interaction first (towns-slate D13):
  Hattie is at home, off-camera, on a slow cadence — the exact profile at
  risk of a silent cold-tail eviction.

---

## 6. The economy

**In:** everything — food, goods, seed, coal, news.
**Out:** ⭐ **labor.** Hinkley exports people, daily, and imports their
wages back the same evening. Nothing else leaves.
**Made here, consumed here:** garden produce (and it does not scale — the
`residential` land use admits a bed and refuses a field, which is the
whole economic difference between here and the valley).
**Scarce:** water (a *head* problem, not a rights problem — the tank, not
a main) · frontage · time (you lose two hours a day to the train).

**Terminus relation.** Total dependence, in both directions, and entirely
one-sided: the city does not know Hinkley exists. ⭐ **This is the
Tiebout point made concrete** — a second polity a short walk away, with
different rules and a different tax on your attention, so *leaving is a
real option long before anyone writes a law worth leaving over.*

---

## 7. Institutions and the open seats

| institution | what it is | the seat a player could hold |
|---|---|---|
| the Hinkley Hills Improvement District | a chartered special district; charter `""`, no departments, one clerk, four meetings | ⭐ **any of them** — the District has never filled a seat because nobody has asked |
| the plat book | the lot catalogue; generative under the operator's capacity dial | — (mechanism) |
| the shop | sole retail | **shopkeeper** |
| *(none)* | there is no court, no constable, no school | — |

⭐⭐ **The special district is the most under-scrutinised real institution
in American governance, and you have modelled one accurately by
accident.** It has taxing-adjacent powers, a defined boundary, almost no
oversight, and near-zero turnout. Hinkley's civics lesson is **capture** —
not "how do we found a government" (that is Rejection) but "there is
already a government, it has powers nobody has counted, and four people
vote."

---

## 8. Hooks — what a future build can rely on

| if you are building… | Hinkley already has / will have |
|---|---|
| **owner expression / customisation** | ⭐ the facades — the only place a player's authored text is public |
| **neighbours / social graph** | five residents on nine lots, observed at all hours |
| **civics / capture** | a real chartered body with unexercised powers and a clerk who will explain them |
| **utilities & metering** | the tank, the standpipe, the monthly reading book, a head problem with a stated buffer (400 m³ = outage tolerance) |
| **commuting / transit** | the rail, two tides a day, three NPCs demonstrating it |
| **horticulture as standing** | gardens are the local status currency; Rosalind is the rival |
| **delivery / post** | Hattie takes in parcels; Bo knows what came up on the train |
| **land value / lot variation** | ⚠ **gap** — lot *N* is identical to lot *M* today (see forks) |
| **the press** | Teodoro brings the evening edition up before the ticker |
| **tenancy** | ⚠ **not here** — Hinkley is title-only. Lodging is Rejection; leases are Mayfield Row. |

---

## 9. Open forks

- **Do lots differ?** Today they do not: no aspect, no soil variance, no
  corner, no view. One authored variation axis on the plat makes lots
  *comparable*, and therefore worth choosing between — and gives land
  value something to be a function of. Named as a gap, not specified.
- **What is above a quarter-acre?** The ladder stops at the lot. Nothing
  to buy next, nothing to consolidate, no second parcel.
- **Does the District ever levy?** It has the shape of a body that could
  charge for the tank. Nobody has tried, and the first attempt is a
  genuine political event.
- **Does the subdivision ever fill?** The capacity dial says 40. If it
  fills, the town's whole character (oversized, waiting) inverts. That
  should be a *player* outcome, not an authored one.
- **Hinkley Court.** The plat branches a court off lane segment 2 and
  nothing has been said about what it is. Cheapest place to put a second
  character of neighbourhood.
