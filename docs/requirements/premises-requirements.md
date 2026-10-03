# Premises — what a holding obliges you to

**Kind:** feature
**Leads from:** kernel (first consumers, all shipped content: the
Duncan Hall dorm rooms, the Seznick House / Mayfield Row let units, the
Hinkley Hills lots, and the Terminus street lamps)

A holding in Saxonberg costs nothing today. A dorm room is free, a let
unit is free forever, a bought lot is a single payment and then silence,
and the street lamps the town lights every sunset are paid for by the
realm because no town has an account to pay from. This build gives a
holding its **obligations** — rent, upkeep and metered supply — and gives
non-payment a consequence that is not eviction.

⭐ **The sentence the build exists for:** *a life sim means upkeep.* Not a
treadmill, and not a tax on existing — a cost of living, with a market
that reaches every income level and a floor that catches you.

Executes `stewardship-slate` step 5 (*"Premises + utilities — obligations,
on the money side. **Now the next thing**: a lease with no money leg is the
ladder's biggest remaining fiction"*) and the billing half of
`power-utility-slate`. Bounded throughout by
`stewardship-doctrine.md § The recurring-charge call`.

---

## What already exists

**The ladder is built and it is free.** Three rungs ship and all three are
reachable: a granted dorm room at Duncan Hall (Katie's intake), a let unit
at Seznick House (Walter's dialogue, the `lease` verb), and an owned house
on a Hinkley Hills lot (`title buy lot <n>`, 4000 minor against a char-gen
stipend of 20 — *"land is earned"*). `holding.md` names the gap itself:
*"**rent as a recurring charge** — a lease is a grant with no money leg."*
Seznick House's own programme row says *"Holdings owes the shell — the term
rent will later pay for."*

**The obligation vocabulary already exists, in words, without money.**
Every holding carries an upkeep term — `institution-all`, `landlord-shell`,
`owner-all` — that says *who owes* the upkeep. `survey` reads it aloud to
the player today, beside the shell's condition band. `maintain` restores
the shell; the `maintains` brain performs the term on a cadence (Katie on
the dorms, Walter on the Seznick shell). The deferred `hoa-shell` term is
already in the vocabulary and is waiting on *"the body that collects for
it."*

**Condition is a live clock with one consequence.** `shellCondition`
(0..1, reconciled on read) slides sound → weathered → worn → shabby →
dilapidated over `residence.weather.daysToWorn` (45 game-days), read
**only ever as a band, never a number**. Its one existing consequence is
the **ascent gate**: `title buy` and `lease` read the condition of every
residential holding you already hold and refuse below 0.5, naming the
band — *"the rung above is earned by keeping the rung you have."*

**The meter is a boundary, not a counter.** `ParcelApi.powerOf(path)`
answers `{band, feeder, parcel}` by longest prefix; `feeder` and
`powerBand` are authored claim fields. Consumption *resolves* to the
covering parcel. **Nothing anywhere accumulates it.**

**The cut already works.** The cold-storage build landed the sever/splice
cut as the grid's one state, and the grid remembers it: cut the avenue and
the lamps go dark and a fridge begins to warm.

**Settlement is one primitive.** `BankingApi.settle(charge, method)` takes
a `Charge` of `amount + payee + reason`, with the method a parameter —
on-ledger or cash. It already carries a **remittance split** whose own
comment says the seam is *"reusable for service fees / tips / a later sales
tax."* `pay`, `buy`, `tip`, `title buy` and the TPA fare all run through
it.

**Nothing recurring is charged to anybody.** The only recurring money legs
in the world are the sunset street-lighting appropriation (treasury →
supplier), the treasury perpetual, and a shop's restock beat. No bill, no
statement, no standing order, no due date exists — `credit.md` is explicit
that for a loan there is *"No due date, ever."*

**Disengagement already takes your estate, and money has nothing to do with
it.** `credit.md § The three estate states` — **active → dormant →
escheated**, *"derived from **absence** and nothing else."* Dormancy
freezes outflows, vacates a seat, closes a shop, and a login lifts it.
Escheat transfers player-held titles up the title tree, revokes use-grants
(the dorm, a let unit), and leaves the balance with the treasury as
unclaimed property that is **reclaimable forever**.

**No authority can charge anyone.** Eight Compact offices ship, every one
founder-default; their total power is mint, appropriate, set a reserve dial
and assign a seat. Three fictional governments ship, of which Terminus City
is wired with a Registry and a Magistrate. Sales tax exists but is
*seller-collected and ungoverned*. ⚠⚠ And no Locality holds an account at
all: `TREASURY_PATH` is `/compact/treasury`, so civics.md records that v1
reads as *"the realm appropriates for Terminus's lamps"* rather than
*"Terminus pays its own bill"* — **"the build's one recorded softening."**

**Therefore what is genuinely new here is:** a charge that recurs at all; a
quantity of supply that accrues rather than merely resolving; a bill a
player can read; a standing order that pays it without them; a consequence
ladder for arrears that stops short of the asset; and a town with a
treasury of its own.

---

## Goals

- **A holding's obligations are terms with money on them.** Rent, upkeep
  and supply are three rows of one vocabulary, not three features — and
  the payee of each reads off structure that already exists (the
  title-holder, the term-holder, the supply-holder).
- ⭐⭐ **A second rent level needs zero code.** When this ships, the whole
  housing market — a rooming house, subsidised housing, a penthouse — is
  authorable as rows. This is the build's real acceptance test.
- **Supply is metered on use, so an empty house draws nothing** — by the
  physics, not by an exemption.
- **A player can read what they owe and why**, and can arrange to pay it
  while they are not here.
- **Non-payment costs you credit, comfort and progression — never the
  thing you hold.** Losing an estate stays what it already is: a
  consequence of disengagement, on a clock that a login resets.
- **Keeping a place up pays for itself**, because a worn shell loses more
  heat and therefore burns more supply.
- **A town pays its own bills** from its own treasury.
- **Stewardship becomes a Discipline** that buys precision and access,
  never a multiplier.

## Non-goals

- **Any charge on ownership** — an ad-valorem property tax, rates, a
  standing or connection fee. ⛔ Refused by
  `stewardship-doctrine.md § The recurring-charge call` rule 1, which
  states that reopening a land tax *"is an amendment to Law 2, not a design
  detail."* **Destination: nowhere, deliberately** — unless that amendment
  is argued on its own.
- **Eviction, seizure or forfeiture for arrears.** ⛔ Doctrine rule 3.
  **Destination: nowhere, deliberately.** The estate ladder in `credit.md`
  already ends a tenancy, on absence.
- **Taxing production** — an output tax, floor-buys, quota administration.
  **Destination:** the polity-paper engine on `launch-worklist.md § 1.5`
  and `livelihood-slate § 7.3`.
- **The compute allowance meter and the cascade.** A different scarcity —
  `stewardship-slate` is emphatic that *"utilities are **money** and fully
  diegetic; allowance is **meta** and stays undressed. Two scarcities,
  never conflated."* **Destination:** `stewardship-slate` steps 6–7 and
  `scarcity-slate`, which also carries the stated dependency that the
  political layer *"needs a second city to be alive."*
- **Zoning, rezoning and nonconforming use.** No land use changes after a
  grant or a sale in this build. **Destination:** `stewardship-slate`
  step 7 and `zoning-slate`.
- **The ranching head ceiling and the pets companion ceiling.** Blocked on
  their own merits: nothing grazes yet (`ranching.md` — *"the cascade has
  no INPUT"*), and a biting over-draw cap contradicts a shipped test
  asserting the land draw is inert. **Destination:** `stewardship-slate`
  and `development-slate`, which flags the contradiction as unresolved.
- **The leash law and animal control.** **Destination:**
  `sanitation-slate`, whose own header says the impound yard with
  creatures in it *is* animal control and *"anyone starting an
  animal-control build starts here, not in pets."*
- **The utility's ownership fork** (office vs corpo vs co-op) — *"genuinely
  open; decides who employs the linemen and who answers for outages."*
  Not needed: the payee is whoever holds the supply, so a utility can be
  any of the three as content. **Destination:**
  `power-utility-slate`.
- **Outage propagation, gas as a second commodity, hydro generation, the
  lineman rotation, street lighting's goods leg.** **Destination:**
  `power-utility-slate`.
- **Valuation and resale.** **Destination:** `property-slate` Phase 3 and
  `auction-slate`.
- **Authoring the market's low end** — a rooming house, subsidised
  housing, the shelter, the soup kitchen. Deliberately content, and cheap
  *because* the residence builds were structural. **Destination:** the
  content pass that follows this build.
- **A dunning clock, a due date, or a deadline that fires.** **Destination:**
  nowhere, deliberately — see surface decision 3.

---

## Placement

**Kernel**, with its content in the packs that already own the places.

The obligation and its settlement belong to the kernel because three
unrelated hosts consume them: a university dorm, a landlord's building and
a town's grid. The upkeep-term vocabulary is already kernel, and this build
is the money half of a vocabulary that ships.

The accruing supply quantity is kernel for the same reason — the parcel
meter is already a kernel citation on the parcel record, and water is the
named sibling commodity (*"design once, instantiate per utility"*).

The **rates, the amounts and who collects them are content**: a term on a
programme row, a price on a plat book, a supplier on a locality. ⭐ The
placement test the build must pass: **a second rent level, a second
utility and a second landlord all need zero kernel code.**

The Stewardship Discipline is a pure-data row, under the existing
`agriculture` node whose own file comment already reserves the place —
*"the first agricultural node in ranching's animal husbandry,
**stewardship's land care**."*

---

## Collisions

- **Duncan Hall / Katie.** The dorm becomes free *because enrolment says
  so*, not because nothing charges. Katie's intake is the surface that
  states the term. ⚠ `residence.md` records an existing authorization
  defect — her dispatch is gated by a validator she cannot pass — which
  this build must not depend on and should not silently inherit.
- **Seznick House / Mayfield Row / Walter.** The `lease` verb gains the
  money leg its own programme row anticipates. Walter is Mayfield
  Holdings' agent, so the payee is a business that already exists.
- **Hinkley Hills.** An owner pays no rent and no rates — only supply, and
  only what they use. ⚠ The district is *"the thinnest government in the
  game — no departments, no treasury, no seats"*, and its lots are
  `off-grid` by declaration, so it is the deliberate case where almost
  nothing is owed. That is a feature: the frontier is cheap.
- **Terminus City.** The wired government, the Registry, the Magistrate —
  and the body that gets the treasury it has been missing.
- **The street lamps.** The shipped public service and the first thing a
  town treasury pays for out of its own account.
- **The ascent gate.** Already reads condition across every held unit.
  This build gives it a second cause: a landlord who is not being paid
  stops performing the shell term.
- **The grid cut.** Already the one grid state. This build gives it a
  second cause besides a severed line.
- **`survey` and `wallet`.** The two existing reads a player uses for
  "what do I hold" and "what have I got". The bill belongs where they are,
  not in a new verb if one is avoidable.
- **The estate ladder.** Dormancy already refuses outflows *including a
  settled charge's payer*, so a dormant account cannot pay a bill — which
  must not become a back door to losing a holding.

---

## Surface decisions

### 1. Non-payment never takes the holding — absence already does

**The question.** Rent has to be worth paying and poverty has to bite, but
`stewardship-doctrine.md` rule 3 refuses *"seizure, eviction-for-arrears,
loss of the holding"* by name.

**The answer.** No amendment, because the game already has the mechanism
and it is keyed on the right thing. `credit.md`'s **active → dormant →
escheated** ladder is *"derived from absence and nothing else"*, and
escheat already revokes a dorm grant and a let unit and passes a title up
the tree. **So disengagement takes an estate and money never does.**

What arrears cost instead is exactly what rule 3 admits — credit and
comfort — and three of the four levers already ship:

| lever | mechanism | state |
|---|---|---|
| the supply is **cut** | the grid's sever/splice state | shipped |
| **credit gets harder** | the lending ladder is gated on your own ledger | shipped |
| **progression stalls** | the landlord stops performing the shell term → condition slides → the ascent gate refuses the next rung | shipped (both halves) |
| the arrear is **named** | a debt with a creditor by name, as a refused wage already is | the precedent ships |

⭐ **You keep the flat. You do not get the house.** Rent is worth paying
because paying it buys progression, and low-income living is the market's
low end rather than a penalty.

**The reasoning, in the user's words:** *"I recently played Dune Awakening
and quit because I lost my base for not paying my taxes, that sucked and I
stopped playing."* And the thing this deliberately avoids: *"not that I
want a game full of homeless people just because they're rent dodging."*
Rent-dodging must not manufacture homelessness.

### 2. The dorm is free while you are enrolled

**The question.** What does the tutorial rung cost a player who cannot yet
earn?

**The answer.** Nothing, and enrolment is the term — not a clock. The
university exists to teach you what you need to play, and real knowledge
through the mechanics; when you have consumed that content you should be
ready to go and earn enough to get a real place. **No time limit for now.**

⭐ This makes the tutorial rung expire on *content consumed* rather than on
a timer, and it leaves the length to the curriculum build to decide when
there is a curriculum to measure. The `institution-all` term is already the
vocabulary for "the institution owes everything."

### 3. Periods, not deadlines — no due date fires

**The question.** When is a bill due?

**The answer.** Never, in the sense of a deadline that does something. A
charge accrues, names the stretch it covers so a player can read what they
owed for it, and surfaces when anyone looks — the same shape `credit.md`
already rules for a loan, where default is *"revealed, never scheduled"*
and there is *"No due date, ever."* Arrears accumulate; nothing fires on a
date.

A **standing order** pays it while you are away, which is what satisfies
doctrine rule 2 (*"dischargeable without attendance"*) — and with decision
1 in place, there is no cliff for it to protect you from anyway.

### 4. The bill is a number; the consumption is not

**The question.** This project reads in words nearly everywhere — condition
is bands only, the Arrival Note is read *"in words, no digits."*

**The answer.** Money stays numeric, because you cannot pay *some* — and
`wallet` and `house pnl` already print figures. **Usage does not.** A
player reads that the draughty place is costing them more; they never read
a kWh. That keeps the no-gauge reading rules intact where they apply and
concedes the one place they cannot.

### 5. Every town gets a treasury

**The question.** Who collects, and from what account?

**The answer.** The payee reads off existing structure in all three cases —
the title-holder for rent, the term-holder for upkeep, the supply-holder
for supply. And a locality gets an account of its own, because the
supply-holder is often the town and today no Locality holds one.
`civics.md` already names this as *"the build's one recorded softening"*,
and without it *"Terminus pays its own bill"* stays a fiction.

### 6. Keeping the place up is how you use less

**The question.** `stewardship-slate` leaves *"condition's exact
consequence ladder"* open — what a dilapidated house actually does.

**The answer.** It loses heat, so it burns more supply, so it costs more
money. `thermal.md`'s own naming argument records that **shell** is
`holding.md`'s word for condition and weathering while **enclosure** is the
thermal fabric — the same object named twice, deliberately. So a worn shell
is a worse enclosure.

⚠ Note the direction, because the doctrine forbids the other one: the same
doctrine call **removed** *"premises standing — utilities paid, tax
current"* from the condition read as a category error — *"A house is not
dilapidated because you are behind on a bill."* Standing must not affect
condition. **Condition affecting consumption is the opposite arrow**, and
it is precisely rule 1's admitted form: you pay for what you use, and a
well-kept place uses less.

---

## Lens pass

1. **Pedagogy** — **Stewardship** is the dominant Discipline: keeping a
   place is a skill, and the band buys precision and access (a better read
   on what a property needs) and never a multiplier. Secondary:
   `business-administration` and `finance`, which the paperwork acts
   already credit. ⭐ What is *derivable* is the whole of it — the bill is
   consumption × a posted rate, the heat loss is the enclosure, the
   condition is the calendar. Nothing here is a hidden number. The real
   lesson is the one the design argues for: **upkeep is the price of
   holding something, and neglect is a slow cost rather than a sudden
   one.**
2. **Expression** — the ordinary case needs no code: a landlord is a
   business with a rate on a row, and a whole housing market at every
   income level is authorable without touching the kernel. The bespoke
   case is the term vocabulary — an `hoa-shell` where a body collects for
   common parts, an institution that pays everything, an owner who pays
   their own way. ⭐ This is the build whose output is *other people's
   content being cheap*, which is why the acceptance test is "a second
   rent level needs zero code."
3a. **Immersion** — the fiction must not betray itself in two specific
   places. An **empty house must draw nothing**, or the world is charging
   you for existing; that holds by the physics rather than by a rule. And
   a town lighting its streets must **pay from its own account**, or the
   fiction says "Terminus" while the money says "the realm" — which is the
   softening this build closes.
3b. **Participation** — a landlord is a real role a player can hold, with
   a real decision (the rate) and a real obligation (the shell). ⭐ Can the
   polity do something we did not want? Yes, and it is the interesting
   kind: a town can set a supply rate that drives residents to the
   frontier, where the lots are `off-grid` and almost nothing is owed.
   Tiebout sorting, with the cheap option already authored.
4. **Values** — the undecidable choice this forces is **what a floor is
   worth**. The design answers that poverty must be *livable and visible*
   rather than *punitive*: relief exists as content, the market reaches
   down, and nothing you own can be taken for being poor. ⚠ The gap,
   written down rather than papered over: the floor is *asserted* in this
   build and *authored* in the next one, so between the two the mechanism
   bites before the shelter exists. The build must not ship a consequence
   whose floor is missing.
5. **Continuity** — the obligation survives the epoch because it is a
   term, not a technology: `institution-all` and `landlord-shell` say
   nothing about electricity. The lamp-oil epoch meters a `FuelStore` and
   the electric epoch meters a feeder, and the same commands answer in
   both — *what do I owe, who do I owe it to, how do I arrange to pay.*
6. **Economy** — it **consumes** supply and labour (the shell is kept up by
   somebody) and **produces** a demand floor that does not depend on how
   many people are logged in. Who pays: a tenant pays a landlord, an owner
   pays a utility, an institution pays for its students. ⭐ Was the demand
   there first? Yes — the street lamps have been burning and billing the
   wrong body since the energy build, and the Seznick programme row has
   been promising *"the term rent will later pay for"* since residences
   shipped.
7. **Governance** — ⚠ this is the thin heading and the finding. Nothing
   here **judges a person**: a rate is posted, a bill is arithmetic, and
   the one consequence that touches a person's standing (credit gets
   harder) is already derived from their own ledger rather than decided
   about them. So there is no criterion to name and no appeal to build —
   *provided* the build holds that line. ⚠⚠ The moment a locality can set
   a rate *for a particular holder*, or forgive one, that is a judgment
   and it needs a criterion, an appeal and an entrenchment tier. **Keep
   rates impersonal in this build**; discretionary relief is the
   governance build's problem, with the whole apparatus that implies.

---

## The drive

Nine steps. Run against the live game before the MR opens.

1. **A new player's dorm is free, and says why.** Enrol, take a dorm room
   from Katie, and read `survey`. It names the term — the institution owes
   everything — and says the room is free while you are enrolled. `wallet`
   shows nothing owed.
2. **A let unit costs money, and the rate came from a row.** Take a
   Seznick House flat through Walter. `survey` names rent, the amount and
   who is owed. Nothing was typed into the engine to make that number —
   it is on the programme row.
3. **You can pay it, and you can arrange to pay it.** Settle the rent
   once by hand. Then set a standing order, and confirm from the read that
   it will be paid without you.
4. **An empty place draws nothing.** Leave the flat with everything
   switched off for a stretch of game time. The supply charge for that
   stretch is zero — not small, zero.
5. **Then use something.** Switch on the light, run the fridge, and read
   the bill for the next stretch. It is more than zero, it names what it
   covers, and it reads in plain language rather than as a meter figure.
6. **A draughty place costs more.** Compare the same usage in a `sound`
   holding and a `shabby` one. The shabby one bills more, and the read
   says so in words — the connection between keeping the place up and
   what you pay is legible without a number.
7. **Stop paying, and lose comfort rather than the roof.** Let the rent go
   unpaid. In order: the arrear is named with its creditor; the supply is
   cut, so the lamps go dark and the fridge warms; the landlord stops
   maintaining the shell and the condition band slides; and `title buy` or
   a second `lease` is refused by the ascent gate, naming the band. ⭐ You
   are still in the flat. Confirm it: walk in, and the door opens.
8. **An owner owes no rent and no rates.** On a Hinkley lot, `survey`
   names only upkeep and supply. There is no rates line and no tax line
   anywhere, and the `off-grid` lot's supply charge is nothing.
9. **Terminus pays for its own lamps.** At sunset the lighting settles
   from the city's own treasury, and the treasury read shows the town's
   balance falling — not the realm's.

---

## Acceptance criteria

Observable from outside the code.

1. A player in a dorm room is told, in words, that the room is free while
   they are enrolled, and owes nothing.
2. A player in a let unit can read what rent they owe, to whom, and for
   what stretch of time.
3. A player can settle a charge by hand, and can leave a standing order
   that settles it while they are not playing.
4. A holding with nothing running accrues **zero** supply charge over any
   length of absence.
5. A holding with something running accrues a charge that a player can
   read, in plain language, without a meter figure.
6. The same usage in a worn holding costs more than in a sound one, and
   the player can tell that from the read alone.
7. A player who never pays keeps their holding. They can walk in through
   their own door after arbitrarily long arrears.
8. A player who never pays experiences, in order and legibly: a named
   arrear, a cut supply, a sliding condition band, and a refused ascent to
   the next rung.
9. Nothing a player **owns** is taken from them for non-payment, ever, by
   any path.
10. An owner-occupier's read shows no rates and no property tax, because
    neither exists.
11. A town's own treasury balance falls when its streets are lit.
12. A second landlord, a second rent level and a second metered commodity
    can each be added by authoring rows, with no engine change. ⭐ The
    build is not done until someone demonstrates this by adding one.
13. A `shabby` holding and a `sound` one differ only in the figures and
    the words, never in which commands answer.

---

## Cross-references

**Seeding slates** — `stewardship-slate` (primary; step 5) ·
`money-recirculation-slate` (⭐ created by this conversation — rent to an
NPC landlord manufactures a concentration point, so this build owes that
slate's **backstop** and only the backstop) ·
`power-utility-slate` (the billing half) · `property-slate` (the parent;
the two-scarcities rule) · `tenancy-design-pack` (owns the rent economics
this consumes) · `residence-ladder-design-pack` (the premises money half) ·
`credit-slate` (the property floor)

**Doctrine** — `stewardship-doctrine.md § The recurring-charge call` (the
three rules this build is bounded by; ⭐ *not* amended) ·
`economy-slate` (Law 2) · `measurement.md § Layer 3` (an imposition that
cannot be enumerated cannot be amended)

**Subsystem docs** — `holding.md` (the terms, the shell clock, the ascent
gate, the deferred seams) · `residence.md` · `smallholding.md` ·
`parcel.md` · `banking.md` (settlement, the conservation chokepoint) ·
`credit.md` (the three estate states, the property floor) ·
`civics.md` (jurisdiction; the missing locality treasury) ·
`energy.md` (the meter as the boundary; the cut) · `thermal.md` (the
enclosure, and why *shell* is the other name for it) ·
`watershed.md` (water as the sibling commodity) · `advancement.md`

**Deliberately not consumed** — `zoning-slate` · `scarcity-slate` ·
`sanitation-slate` · `development-slate` · `legal-code-slate` ·
`policing-slate`. Each owns a non-goal above.
