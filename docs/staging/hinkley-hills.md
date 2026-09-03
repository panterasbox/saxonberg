# Hinkley Hills — the locality (design, staging)

> **Target seeds:**
> `packages/content/hinkley-hills/content/world/terminus/hinkley-hills/**`
> (new: `agent/`, `location/`; amend `location/lane.yaml` to render lot
> facades) · `world-seed/.../Locality/hinkley-hills.yaml`.
>
> **Retire when:** the shop, the District office, the hall and the old
> place exist as rooms with cast; the lane renders facades; the six
> residents are in YAML with their routines.
>
> **Status: design, conversation-settled 2026-09-02.** Rationale in
> [towns-slate](../slates/builds/towns-slate.md); tenure mechanics in
> `residence.md` / `holding.md` / `smallholding.md`. This is the
> **content bible.**

---

## 0. The sources, and what each is for

**The 'Burbs** · **Edward Scissorhands** · **Blue Velvet** ·
**Pleasantville**. Themes, never cast — no Klopeks, no Ray Peterson.

| source | what it contributes |
|---|---|
| **The 'Burbs** | the engine: **idle attention**, and the escalation ladder · ⭐ and its ending, which is a mess on purpose — *they shot an alternate, guilty in both, and the same ending plays if they were innocent.* It was never about the Klopeks. |
| **Blue Velvet** | ⭐⭐⭐ **curiosity as complicity.** Jeffrey chooses to look and is implicated by looking. The picket fence and the thing under the lawn are the same town. |
| **Edward Scissorhands** | ⭐ **the crowd that adores and the crowd that hunts are the same crowd**, and the switch is fast. Also: the weird one lives *above* the subdivision, and is a gardener. |
| **Pleasantville** | the suburb **defends its sameness**; difference reads as threat. |

⭐ Hinkley has no acts. It has a **loop** — which is the right shape for a
suburb, because nothing happens in a suburb, things *accumulate*.

---

## 1. What kind of place it is

**A sales pitch that has not yet come true.**

Nine years old, surveyed for a hundred families, and has nine.
Everything was built for the town it was going to be: a lane graded for
traffic that does not exist, a tank sized for a suburb, signs in
confident capitals. Not a ruin, not a boomtown — a **speculative
subdivision**, the most ordinary and least-written kind of place, and its
comedy and its pathos are one fact.

⭐ **It is the exact inverse of Rejection.** Nobody chose Rejection;
*everybody* chose Hinkley. Every resident is here on purpose, at cost, for
a reason they can articulate — the only town where you can ask somebody
why they live there and get a real answer.

### ⭐⭐ The engine is idle attention

Rejection's engine is exhaustion: the work is the thing and nobody has
spare capacity. Hinkley is the inverse — **not enough to do and too much
to look at.** That is *The 'Burbs* precisely (Ray takes a week off and the
entire plot follows), and it is the honest condition: you own a house, the
garden is watered, and there are two hours before the train.

> ⭐⭐⭐ **So Hinkley's content is other people.** Not a trade, not a
> resource, not a verb. It is the one locality whose play surface is the
> **social graph** — which ships in full and currently has almost nothing
> to point at.

**Tone register.** Neighbourly, faintly boosterish, polite in the specific
way of people who will be seeing each other for thirty years and have not
decided how much they like each other. Everyone knows everyone's business
and pretends not to.

**Normal here, shocking elsewhere:** knowing what your neighbour paid ·
walking into a garden that is not yours to look at it · a nine-person
institution with a charter, minutes and a clerk.
**Shocking here, normal elsewhere:** a fence built without telling anyone ·
letting a garden go · not coming to the meeting.

---

## 2. The two halves

| | |
|---|---|
| **Functional (shipped)** | 40 generative lots · the plat plan · the keyed house programme · the garden bed · the standpipe · the District tank · `title buy` |
| **Support (this doc)** | the shop at the stop · the District office · the hall · **the facades** · the old place · six residents |

⚠ **Fourteen files ship and three are authored rooms**; everything a
player touches is a keyed mint, architecturally excellent and identical
from house to house. And **zero NPCs live here.**

---

## 3. Geography and the room map

The **shoulder**: a hundred metres above the city on the basin's edge,
valley dropping away east. The rail comes up from town and stops. The lane
runs west along the contour; lots hang off it north and south, which is
why the gate ring is cardinal.

```
   ┌────┬────┬────┬────┬────┐        (north side)
   │ 2  │ 4  │ 6  │ 8  │ 10 │
 ══╧════╧════╧════╧════╧════╧══  Hinkley Lane ──▶ west (segs 2–9 minted)
   │ 1  │ 3  │ 5  │ 7  │ 9  │        └─ Hinkley Court off seg. 2
   └────┴────┴────┴────┴────┘        (south side)
      │
   ⭐ THE OLD PLACE — ground the plat surveyed AROUND
      │
   the stop ── the shop ── the District office ── the hall
      │
      ▼ the rail down to Terminus
```

**Shipped (3 authored):** arrival (the stop) · lane · the `lots` zone.
**Minted per sale:** yard → hall → kitchen / living / bedroom; road
segments as frontage sells.

| new | what it is |
|---|---|
| **the shop** | one room at the stop. Stocks what the rail brought. Bo Kettleby's. |
| **the District office** | a desk, a filing cabinet, the tank's reading book, a framed plat. Delia Prosser's. |
| **the hall** | twenty chairs, a stove, the plat book on the wall. Used four times. |
| ⭐ **the old place** | Prentice's. Not a lot — it predates the lane. Front visible from the road; **the back is not visible from anywhere.** |
| ⭐⭐ **the facades** | *not a room* — the mechanism rendering each sold lot's owner-authored exterior + sign into the lane. |

### ⭐⭐⭐ The facades are the highest-value single addition in the realm

Hinkley is the only ground a player owns and **the street shows nothing.**
You cannot name your house, describe its outside, hang a sign, or have a
neighbour see from the lane what you did — and the entire nature of a
suburb is that it is *visible from the street.*

Minimum viable: one owner-authored `longDescription` per lot + a sign,
rendered as `details:` on the lane at that lot's gate. One field and one
render pass, and the most mechanically sophisticated locality in the game
stops being a set of identical interiors.

---

## 4. Culture

**The plat.** The organising object — a drawing of a hundred houses that
mostly are not there, hanging in the hall, the office and the shop.
⭐ **The town's identity is a document about its own future**, which is
what a subdivision is.

**Infrastructure ahead of demand.** A 400 m³ tank for nine houses. A lane
graded for traffic. A District with a charter, a clerk and four meetings in
nine years. Nothing is broken; everything is *oversized*, and the residents
are quietly proud of it in a way they would deny.

**The commute.** Hinkley produces nothing; its income is Terminus wages, so
the town **empties at 06:00 and refills at 18:00.** Stand on the lane at
noon and it is silent. That daily emptying is the most legible fact about
the place and should be visible.

**Gardens are the local currency of standing.** No aristocracy, no
poverty — only what you have done with your quarter-acre. ⭐ Renown here is
**horticultural**, and it is the only place in the realm where that is
true.

**Pleasantville's contribution: the town defends its sameness.** Once the
facades exist, the street has opinions about what you author.
⚠ **Guardrail: people judge, the system never does.** No mechanical
penalty for painting your house strangely, no gauge, no dinged score. The
NPCs have views and the District cannot touch it — so a player who authors
something odd gets exactly what Prentice gets: talk, and nothing else.
Which teaches it by putting you in his position with nothing enforced.

**The year.** Terminus's workweek plus the growing season. Two local
dates: **the District's annual meeting** (badly attended) and **the day the
tank is read** (monthly, by Delia, in a book nobody else has opened).

---

## 5. ⭐⭐ The Death Man

The neighbours call him **the death man**. It is a kids' name for a
stranger and that is exactly right: **nobody in Hinkley knows what he is
actually called**, which is why they gave him one.

He looks like something out of a bad dream, drives a heavy old car, and
hauls big bags of potting soil at odd hours. His front is neglected. His
back garden — ⭐ which no one has seen — is beautiful.

### ⭐⭐⭐ DECIDED: he is permanently ambiguous

Not *innocent and you were the maniac*. Not *guilty and you were right*.
**Unresolved, forever, and that is fine** — because The 'Burbs shot an
alternate ending, the Klopeks were guilty in both, and the same ending
plays if they were innocent. It was never about the Klopeks.

⚠ **The ambiguity cannot live in the ground.** This is an AGPL repo; a
player can read the content. Hide a body in the YAML and someone finds it
in an afternoon; hide *nothing* and someone confirms that too.

> ⭐⭐⭐ **So: you can resolve the ground. You can never resolve the man.**

Dig the whole garden. Find nothing a court would care about. It changes
nothing — he is still at the window, still has not spoken to a neighbour in
nine years, still buying forty bags of soil a month, and you know no more
than on day one. **The evidence question closes; the actual question was
never the evidence question.** Nothing is hidden in the source, so there is
nothing to spoil.

⭐ **And he never explains himself.** Not menacingly — he simply does not.
Every dialogue path either declines or answers so literally it tells you
nothing. A real kind of person, and maddening in exactly the productive
way.

### The stewardship inference — and ⚠ what does not exist yet

⚠ **There is no stewardship score.** Land use *shipped* (Hinkley built
it); the allowance cascade is an inert field; and the slate's own table
says the **Stewardship** layer — *how well you meet your obligations* — is
**absent**. No Stewardship Discipline is in the shipped roster.

And when it lands, keep two things apart:

- **Stewardship** is designed as a **Discipline** — a fact about a
  *person*, derive-on-read from what they have exercised.
- **Condition** is a fact about a *property*, and it is the only thing
  visible from the street.

> ⭐⭐ **The street can only see condition, and it infers the person.**

A run-down front supports the inference *careless man*, and the inference
is false because he has spent all of his care on the back. Not a broken
gauge — **a true measurement carrying a false conclusion**, which is how
prejudice actually operates. It also puts the lane on the wrong side of
the measurement doctrine: the engine measures, the subject values, the
polity imposes — and the neighbours are running an unlicensed layer-2 move
on somebody else's reading.

### ⭐ The role, not the secret

A hidden garden as a *reveal* breaks the moment one player digs and posts
it. So:

> **The weird house is a condition a player can enter.**

Let your front go, keep your back beautiful, and *you are the weird
house.* Once facades render owner-authored exteriors **and** condition,
what the street knows about you is partly authored and partly measured,
and the two can disagree. Prentice stops being a puzzle and becomes the
**demonstration of a state you will later occupy yourself.**

⚠ **He is never dangerous and the game never teases that he is** — a game
that rewards paranoia teaches the opposite of what this one is for. But
the second-variant problem is real: if the weird house is always nothing,
players learn to ignore it. So the general rule for every weird house
after this one:

> ⭐ **It always has something, and it is never a crime.** A man grieving.
> A woman running a business she is not zoned for. Someone hiding poverty.
> A back garden that is a memorial. Each a genuine reason for privacy, each
> real to find, and finding it is always an intrusion.

### ⭐⭐⭐ Blue Velvet: the record of your pursuit *is* the content

Jeffrey finds the ear and **chooses** to investigate. He gets in the
closet. He is implicated by watching, and he is not absolved.

Which answers how an unresolvable mystery is satisfying:

> **The mystery is never the content. The record of your pursuit is.**

You will never learn whether there is anything under the roses. You will
absolutely learn what you were willing to do to find out — and so will
everyone else, because Hattie was on her step and the belief propagated
and your standing in a **nine-person scope** moved.

Not an anticlimax: it is the measurement doctrine's own property. *The
feed hides the measurement; the mirror shows you.* ⭐⭐ **Hinkley is the
mirror town** — the one locality where what you get at the end is a file
on yourself. It needs no new mechanics: `accountability_events`, belief
and renown already keep it. The game is already writing the file; it just
has nothing worth opening it over.

### ⭐⭐ The ladder, and every rung is a shipped subsystem

| rung | subsystem | who sees |
|---|---|---|
| **notice** | perception | — |
| **theorize** | ⭐ **belief** — a theory about a neighbour *is* a per-viewer identity memory | — |
| **share** | the social graph — your theory becomes someone else's belief | everyone, eventually |
| **judge** | renown, per-scope — ⭐ in a nine-person scope every opinion is a measurable fraction | — |
| **surveil** | concealment · `HidingMixin` · motion degrades · the `wary` brain | Hattie |
| **trespass the yard** | parcel title — ⭐ **no lock involved** | Hattie, Prentice |
| **dig** | cultivation on ground you do not hold — the loudest thing you can do | everyone |

⭐⭐⭐ **Hinkley needs almost no new mechanics. It needs a reason to point
the existing ones at people.** No quest chain is authored: the rungs are
systems, the costs are social, and the top is unresolvable.

### ⭐⭐ Scissorhands: the decent path is free and socially expensive

The neighbourhood women adopt Edward as a novelty and hunt him within the
week. **The crowd that adores and the crowd that hunts are the same
crowd.**

> ⭐⭐⭐ **The kind, obvious, human move is available and free, and it
> costs you socially.**

Just knock. Introduce yourself. Ask about the roses. Nobody has in nine
years — not because it is hard, but because doing it *publicly marks you.*
If a player is ever shown that garden legitimately, the lane's attitude to
**the player** changes and you become the weird one by association. Same
nine-person renown scope, same mechanism, no new code.

So the town offers two ladders: the decent one nobody climbs because it is
socially expensive, and the escalation everyone is already on because it
is free.

### ⭐ Delia has his name

The title record is in her filing cabinet, in the office nobody visits.
**Harold Prentice.** Utterly ordinary, sitting in a drawer for nine years.
Learning it is a rung on the ladder — and it is the rung that goes *down*
the escalation rather than up.

And a quiet legal fact: **he was here before the subdivision.** The plat
surveyed *around* him. He predates the lane, predates the District, and
holds title nobody granted him — which makes him harder to touch than
anyone on the lane realizes.

---

## 6. The District — the road not taken

⭐⭐⭐ **Rejection has no institution and needs one. Hinkley has one and
will not use it.** Two failure modes of civic life, one road apart.

The stewardship doctrine's own line does the work:

> **Zoning governs use, never self-expression.** Governance is reserved
> for the commons + shared rules only — **never your couch.**

That **forbids the HOA.** The neighbours cannot reach Prentice through
law, so the grievance has no legitimate channel and they invent an
illegitimate one. Meanwhile the District sits there: chartered, with a
clerk, with powers nobody has counted, never once asked.

> ⭐⭐ **The razor: the District can act on what you DO, never on what you
> look like.**

The mob is right that there is no channel — and the reason there is no
channel is that their grievance is not legitimate.

### ⭐⭐⭐ Which is what the potting soil is for

They think it is a body. There is a mundane explanation available: he
**sells cuttings**, quietly, out of a residential lot — a genuine land-use
violation and the one thing about him the District *can* act on.

And that explanation **rules nothing out.** It just hands the District
something actionable and the mob a pretext.

> **You cannot get a man for being strange, so you get him for the thing
> his fence is four inches over.**

Regulatory capture at the smallest possible scale — exactly how it works,
and the same theme as Rejection's Act III (a legitimate instrument used
for a purpose it was not for) at nine-house scale.

---

## 7. The open-door question

### ⭐⭐⭐ The Bethesda ambiguity does not exist here

`ownerOf(item)` is a **total function**: `stamp ?? parcel-extent ??
authorOf`, and it never returns *nobody*. A good in a Hinkley house falls
under that lot's parcel extent and belongs to the lot's owner **with no
stamp required.**

In Skyrim the fork on the table is nobody's until the game flags your
hand. Here every movable object already has an owner, computed, with no
special case. So *can you take things from an NPC's home* was never a
policy question.

⭐⭐ **Taking is easy; disposal is the hard problem** — and it is the
*designed* problem: policing-slate already names the fence as "laundering
provenance — the chattel chain is their actual problem." **The
anti-exploit is the ledger, not the lock.**

A home here is also not a set: furnishing is owner-based persistence and a
room's contents are the owner's estate slice. Walking into an NPC's house
is walking into their **property record**.

### The policy: closed to the wire, open to the fiction

**The door is not the mechanism. Witness is.** Unlike a single-player RPG
the owner may be *home*, and NPCs with residences are home on a schedule
you can learn. An NPC who finds you inside forms a **belief**, their
**regard** drops, the graph **propagates** it, and `accountability_events`
records it. Visibility is real rather than simulated, and the consequence
is a person's opinion rather than a bounty number.

A lock is therefore a **delay and a signal**, not a gate. The interesting
play is never picking it — it is being found inside, or being let in.

⭐ And the teachable: **locks and title are already separate systems**
(`credential.md` keys, `parcel.md` ownership) where every other game fuses
them. So **an unlocked door is not permission** — which is most of
trespass law, and no game says it.

### Three pieces

1. ⚠ **`knock` does not exist and should.** Same door, different outcome
   per subject — a reason to build regard with an NPC that is not a quest.
   **⭐ Direction rule: regard is the INPUT to the door, never the
   output.** Knocking *spends* standing; it must never earn it, or players
   will stand there spamming it.
2. ⭐ **Locks are locality characterization, not global policy.**
   **Rejection does not lock** (hue-and-cry town: nothing worth taking and
   the town would know within the hour). **Hinkley locks everything**
   (strangers with property, nobody home by day — the shipped house
   programme already ships the door `locked: true` to the lot's keyway).
   Terminus varies by district. **You learn a town's theory of trust by
   trying a handle.**
3. **NPC homes hold almost nothing**, which is honest *and* closes the
   faucet. What is there is owned by the total chain, so taking it is
   provably theft with a chain of title.

### The exploits

| worry | answer |
|---|---|
| serial house-clearing | nothing worth taking · total ownership · real witnesses with real perception |
| waiting until they are on shift | ⭐ **that is burglary and it is fine.** Model it. The house is empty, the goods traceable, and Hattie is on her step |
| reputation farming by knocking | the direction rule |
| ⚠⚠ **NPC house as free storage** | **UNSOLVED.** Stash goods somewhere you pay no upkeep on. Needs a rule before this ships |

---

## 8. The cast

⚠ **Currently zero.** All six are new. Three commute, two do not, one
works here.

> ⭐ The trio is arranged so the lane is **observed at every hour with only
> three people**: one leaves before dawn, one returns near midnight, one
> never leaves. Every arrival is witnessed by somebody.

**Hattie Whitfield — lot 1, retired, ⭐ the recruiter.**
Home all day, every day, in the oldest house *on the lane*. She has watched
the subdivision fail to happen for nine years and finds it neither
surprising nor sad. Knows every arrival, every delivery, how long every
visitor stayed.
⭐⭐ **She tells you about the death man on your first day and walks you up
the first two rungs.** Not malicious — bored, and generous with it, which
is worse. She is also the reason a nine-house street feels observed, and
the natural first holder of any neighbourly obligation (watering while you
are away, taking in a delivery, noticing you have not come back).
*Dispositions:* `curiosity +70`, `sociability +65`, `honesty +60`,
`humility −35`.
*Routine:* always in. Front step 07:00–09:00 and 17:00–19:00 — exactly
when everyone passes.

**Harold Prentice — the old place. ⭐ "the death man."**
Predates the lane. Neglected front, a beautiful back garden nobody has
seen, a heavy old car, and bags of potting soil at hours that invite
comment. Answers no questions and explains nothing. ⚠ Never written as
menacing, never written as sympathetic — **written as opaque**, and the
prose must sustain both readings permanently.
*Dispositions:* deliberately **unauthored** — ⭐ nothing in the content
should let a player resolve him by reading a field.
*Routine:* home almost always. Out at odd hours with the car. Back garden
mid-morning.

**Delia Prosser — lot 3, District clerk.** *(does not commute; the office
is here)*
The District's one paid officer at a salary that is a rounding error.
Keeps the minute book of a body that has met four times, the tank's reading
book, and the plat. Scrupulous, under-occupied, and waiting nine years for
the District to be asked to do something. ⭐ She holds the title record —
**she knows his name.** And she is the road not taken: the legitimate
channel, with a desk, that nobody has ever walked into with a grievance.
*Dispositions:* `diligence +80`, `fairness +70`, `patience +60`,
`ambition −30`.
*Routine:* office 09:00–16:00 weekdays. Reads the tank on the first of the
month at 07:00 and writes it up the same evening.

**Bo Kettleby — the shop at the stop.** *(lives behind the shop)*
Sells what the rail brought, so his stock is a running commentary on the
valley's season. Talks to everyone twice a day by structural necessity and
is therefore the **information network** — who is behind on what, who has
been down to the city twice this week, who has stopped buying seed.
*Dispositions:* `sociability +75`, `generosity +50`, `honesty +40`,
`temperance −25`.
*Routine:* 05:30–19:30 daily; busiest at the two commuter tides.

**Rosalind Ng — lot 6, clerk at the counting-houses. The early one.**
Down on the 06:00, back on the 18:00, nine years without a gap. Bought lot
6 with her own savings before the District existed and regards this as the
central fact of her life. Growing something on the north bed she will not
discuss and which is clearly a competition entry.
*Dispositions:* `diligence +75`, `constancy +70`, `ambition +55`,
`sociability −40`.
*Routine:* leaves 05:50, returns 18:10; garden 18:30–20:00. Absent all day.
*Affords:* ⭐ the **commuter demonstration** · a neighbour whose garden is
better than yours · the first horticultural rivalry.

**Teodoro Sandoval — lot 5, compositor at the press. The late one.**
Works the evening forme; his is the last light on the lane, most nights
around 23:00. Sleeps until ten. He and Rosalind live opposite each other
and have met perhaps forty times in nine years, and both are scrupulously
friendly about it.
*Dispositions:* `curiosity +65`, `sociability +45`, `worldview +40`,
`diligence +35`.
*Routine:* leaves 13:30, returns 23:05. Awake 10:00–13:00 and 23:00–01:00.
*Affords:* the **press seam** (news reaches Hinkley with him, before the
ticker) · a lit window at an hour nothing else is lit.

### ⚠ Wiring notes

- Their houses are the **same keyed programme** a player buys into — no
  bespoke rooms. Lots 1, 3, 5, 6 taken; the player buys from 7 up.
- Commute = the `shifts` brain with a **residence** rather than an
  `Offstage`, with the walk to the stop rendered; the rail leg may stay a
  teleport. The *visible* half is the lane and the platform.
- ⚠ Prove the residency/eviction interaction first (towns-slate D13):
  Hattie and Prentice are at home, off-camera, on slow cadences — the exact
  profile at risk of a silent cold-tail eviction.

---

## 9. The economy

**In:** everything — food, goods, seed, coal, news.
**Out:** ⭐ **labor.** Hinkley exports people daily and imports their wages
back the same evening. Nothing else leaves.
**Made and consumed here:** garden produce, and it does not scale — the
`residential` land use admits a bed and refuses a field, which is the whole
economic difference between here and the valley.
**Scarce:** water (a *head* problem, not a rights problem — the tank, not a
main) · frontage · time (two hours a day to the train).

**Terminus relation.** Total dependence, entirely one-sided: the city does
not know Hinkley exists. ⭐ **The Tiebout point made concrete** — a second
polity a short walk away, with different rules and a different tax on your
attention, so leaving is a real option long before anyone writes a law
worth leaving over.

---

## 10. Hooks

| if you are building… | Hinkley has / will have |
|---|---|
| **owner expression** | ⭐ the facades — the only place a player's authored text is public |
| **the social graph** | ⭐⭐ the one locality whose *play surface* is belief/regard/renown, with six people to point it at |
| **renown at small scope** | nine people — every opinion a measurable fraction |
| **stewardship / condition** | ⚠ **absent today.** Hinkley built land use; it is the natural place to build the condition layer — and ⭐ the distinction *condition is the property, Discipline is the person* |
| **trespass & the open door** | ⭐ the ladder: knock → watch → yard → dig, each rung a shipped subsystem with its own witness profile |
| **`knock`** | ⚠ does not exist; wanted here first. Regard is the input, never the output |
| **burglary / the fence** | empty houses on a knowable schedule, traceable goods, and a witness who never leaves |
| **civics / capture** | a real chartered body with unexercised powers, a clerk who will explain them, and ⭐ a pretext waiting to be used |
| **utilities & metering** | the tank, the standpipe, the monthly reading book, a stated buffer (400 m³ = outage tolerance) |
| **commuting / transit** | the rail, two tides a day, three NPCs demonstrating it |
| **horticulture as standing** | gardens are the status currency; Rosalind is the rival |
| **delivery / post** | Hattie takes in parcels; Bo knows what came up on the train |
| **the press** | Teodoro brings the evening edition up before the ticker |
| **land value / lot variation** | ⚠ **gap** — lot *N* is identical to lot *M* today |
| **tenancy** | ⚠ **not here.** Hinkley is title-only; lodging is Rejection, leases are Mayfield Row |

---

## 11. Open forks

- ⚠⚠ **NPC house as free storage.** The one unsolved exploit in the
  open-door design. Needs a rule before any of it ships.
- **Does the District ever get used?** The town's tragedy is that it does
  not, and a *player* is the first to walk in with a grievance. The bleaker
  and funnier alternative: the nursery complaint is what wakes it up.
- **Does the player get an inciting object?** Blue Velvet starts with the
  ear — something *found*, not something Hattie tells you. The Hinkley
  version is something you turn up digging your own first bed. Cheap, and
  makes the pull self-generated. ⚠ Possibly one gothic touch too many for a
  place whose point is that nothing happens.
- **Do lots differ?** No aspect, soil variance, corner or view today. One
  authored variation axis makes lots *comparable* and gives land value
  something to be a function of.
- **What is above a quarter-acre?** The ladder stops at the lot.
- **Does the subdivision ever fill?** The dial says 40. If it fills, the
  town's whole character inverts — and that should be a *player* outcome.
- **Hinkley Court.** The plat branches a court off segment 2 and nothing
  has been said about it. The cheapest place to put a second character of
  neighbourhood.
