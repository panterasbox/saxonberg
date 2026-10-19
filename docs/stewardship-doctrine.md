# Stewardship — the pillar doctrine, the three decay archetypes, and the family status map

> **Status: design synthesis, captured 2026-08-06. Not requirements.** A
> meta-doc *over* the stewardship family, not a build slate. It does four
> things: names a **pillar** the corpus has been circling without stating,
> **unifies** the scattered decay mechanics into three archetypes,
> **interrogates** the "deferred / deliberately not here" verdicts, and
> proposes a **build order** that treats stewardship as a pillar rather than
> a backlog.
> ⭐ **Part 3a (2026-10-17)** adds the positive half — what upkeep is
> *for*, how its price is derived, and what makes paying it worth doing.
>
> Provenance: a "build the typical home and stress-test the models"
> conversation that hit a wall of deferrals, then two corpus surveys — a
> decay/condition **substrate audit** and a care/anti-treadmill
> **philosophy** survey.

See also — the family this sits over:
[stewardship-slate](./slates/builds/stewardship-slate.md) (land use, the
residence ladder, property condition, the Stewardship Discipline) ·
[preservation-slate](./slates/tails/preservation-slate.md) (spoilage — the
keystone) · [disease-slate](./slates/builds/disease-slate.md) (contagion,
hygiene) · [ranching](./slates/builds/ranching-slate.md) ·
[pets-slate](./slates/builds/pets-slate.md) ·
[farming-slate](./slates/builds/farming-slate.md).
Shipped substrates:
[husbandry](./subsystems/husbandry.md) · [smallholding](./subsystems/smallholding.md)
· [crafting](./subsystems/crafting.md) (`Durable`/`Keen`) ·
[vitals](./subsystems/vitals.md) (`Condition`) · [metabolism](./subsystems/metabolism.md)
· [economy-slate § Law 2](./slates/builds/economy-slate.md).
Doctrine anchors: economy-slate **Law 2**, and the ratified
**"presence is never the meter."**

---

## Part 0 — The finding that reframes everything: "deliberately doesn't exist" was "designed, not built"

The home stress-test kept hitting *"deferred"* and *"deliberately not
here"* — which read as a decision that these systems **shouldn't** exist.
That reading is wrong, and the correction is the whole point of this doc:

> ⭐⭐ **A full stewardship *game* is already designed** — across
> `preservation`, `disease`, `stewardship`, `ranching`, `pets`, `farming`
> — and its foundations already **ship** (husbandry's growth clock,
> smallholding's soil, land use, `Durable`/`Keen` wear, the vitals
> `Condition` collection). The furnishing.md *"deliberately not here"* notes
> were **scope-boundary markers pointing at those slates**, never verdicts
> that the systems are unwanted.

What is *genuinely* absent is narrower and sharper than "the stewardship
layer":

> ⭐⭐⭐ **Nothing produces decay for food or rooms.** The only shipped
> entropy is **use-wear** on durable goods and **flux-growth/decay** on
> living plants. Per the substrate audit: *"spoilage has no producer
> anywhere"* — `ptomaine` (the eat-spoiled-food affliction) ships and is
> wired, but nothing turns fresh food toxic over time; and room
> condition / cleanliness / pests ship **nothing at all**.

So the honest status is not "a missing pillar" but **"a designed pillar
whose two producers are unbuilt, and whose pattern has never been named."**
That is a much cheaper, much more actionable place to stand.

---

## Part 1 — There are only THREE decay archetypes (the unification)

The substrate audit's load-bearing result: **there is no unified
condition/entropy substrate** — the word "condition" is overloaded across
item-wear, body-afflictions, and plant-health, each on its own mixin. But
underneath the three *nouns* are three **archetypes**, told apart by one
question: **what starts the clock?**

| # | Archetype | Clock starts at | Time behavior | Restored by | Today |
|---|---|---|---|---|---|
| **1** | **Act-driven** (wear *or* deposition) | **an act** — of use, or of living-in | **no clock — freezes in absence** | a *service* or an *act of care* (`repair`, `sharpen`, `clean`) | ✅ `Durable`/`Keen` (wear); ✅ **room condition** (deposition — `SoilableMixin`, cleanliness build; the byre's stalls the one calendar exception) |
| **2** | **Flux** (a *continuous* natural process) | **an act starts it** (plant, catch, cook), then it runs on its own | **runs over absence** — integrates the *full* gap, logged in or not | **slowed by care, never stopped** (water, cold, salt) | ◐ husbandry + soil **ship**; **food-spoilage is the gap** |
| **3** | **Body-affliction** | **an injury / intake event** | **presence-freezes** (fairness — you don't starve while away) | healing / clearance / treatment | ✅ vitals `Condition` (metabolism/harm) — *except the dying arm, which opts out* |

Two verbatim anchors the audit surfaced, because they are the load-bearing
distinction between archetypes 2 and 3:

- **Archetype 2 runs over absence** (husbandry § clock rule): *"**A plant is
  not a body.** Owned things integrate the full absence… A player away
  three real days comes back to a plant that lived those three days."* No
  far-past guard, no linkdead freeze.
- **Archetype 3 freezes on absence** (metabolism): *"you get hungry from
  playing, never from being away… the game-design fairness constraint
  overrides the physics."* The lone exception is the **dying arm** of
  vitals, which opts out — *"disconnecting [would be] a cure for death."*

> ⭐⭐⭐ **Every stewardship loop in the game is one of these three.** A
> keen blade is 1. A rotting fish, a wilting bouquet, a neglected garden, a
> losing-condition herd are 2. A wound, hunger, food-poisoning are 3. There is
> no fourth kind, and there does not need to be a unified substrate — there
> needs to be a named **pattern**.
>
> ⚠ **Amendment (2026-08-06, from the room-condition build).** Archetype 2's
> *"runs over absence"* holds only for **continuous-natural** decay — a process
> that runs without you (microbes, growth): the fish, the herd, the plant. An
> **act-deposited** decay — dirt, mess, wear, whose driver is *acts* — **freezes
> in absence** (no acts, no change), which is archetype **1**'s shape. So **a
> dirty room is archetype-1-shaped, not archetype 2**: you cook and it greases,
> you leave and it holds. The real classifier of absence-behavior is the
> **driver** (a continuous process vs an act), not the domain — see
> [room-condition-design-pack](./slates/builds/room-condition-design-pack.md).

---

## Part 2 — ⭐⭐⭐ "The condition model" is not a missing system. It's two cheap producers, unnamed.

The phrase **"the condition model"** appears in exactly one doc
(furnishing.md), where it is named as the missing prerequisite that gates
*"what a room's state means"* and *"the `restQuality` aggregation from
bedding freshness and tidiness."* It reads as a big, scary, unbuilt system.

It is not. Ask the archetype question of a dirty room and a spoiling fish:

- Food spoils **because you caught/cooked it** — an act starts a *continuous*
  microbial process that integrates over world-time, slowed by cold/salt.
  **Archetype 2** (husbandry's clock, a new host). Designed:
  [spoilage.md](./subsystems/spoilage.md) (the design pack was absorbed into it).
- A room gets dirty **because you live in it** — you cook and it greases, you
  track mud, you drop crumbs. That is **act-deposited**: it accrues from acts and
  **freezes in absence**, cleared by an act of care. **Archetype-1-shaped** (the
  `Durable` deposition shape) — *not* the continuous archetype-2 clock. Designed:
  [room-condition-design-pack](./slates/builds/room-condition-design-pack.md).

> ⭐⭐⭐ **Neither is a scary new system — but they are two different clocks.**
> Food spoilage is husbandry's **continuous** reconcile clock pointed at food
> (archetype 2, runs over absence — a ~120-line `Freshness` mixin copying
> `Wet.ts`). Room condition is the **event-deposit** `Durable` shape pointed at
> rooms and their contents (archetype-1-shaped, freezes in absence — `Soilable`
> + a room debris field). The *"condition model"* furnishing kept deferring was
> **these two producers, not one**, and both ride shapes the codebase already
> ships. The substrate exists; the producers are the work.

That dissolves the deferral. "We can't do room condition until we build the
condition model" becomes *"the condition model is two producers you already ship — husbandry's
continuous clock for food, the `Durable` deposit-shape for rooms."*

---

## Part 3 — The Law-2 tension, resolved: why a stewardship game is not a chore game

The central objection: **stewardship IS upkeep, and Law 2 bans upkeep** —
*"Never tax absence; never demand scheduled maintenance… no rent on owned
space, no upkeep-or-it-decays,"* the lesson *"learned from the survival-MMO
upkeep treadmill that drives players out."* If the whole pillar is tending
things, does it not violate the doctrine that defines the game?

No — and the philosophy survey shows the corpus already resolved it, four
ways:

1. ⭐⭐ **The true floor is narrower than Law 2.** The *inviolable* rule
   (ratified: *"presence is never the meter"*) is only this: **no mechanic
   may make a player's attendance the thing that staves off loss.** *"The
   bill is paid in engagement + capital, never in showing up."* Everything
   else in Law 2 is the softer, breakable outer shell. **This is the
   permission structure** — a stewardship game may attach consequence to
   acts, to active states, even to engagement-metered liveness; it may
   **never** make logging in the antidote.
2. ⭐ **The clock starts at an act, never at ownership** (preservation
   slate). *"An unharvested crop is not spoiling. A caught fish is."* Owning
   the fish is free; catching it started a clock you chose. That is archetype
   2's whole definition, and it is exactly Law 2's *"you put it in flux"*
   test.
3. ⭐⭐ **Care is FOUGHT, never watched.** (farming slate: *"upkeep should
   be fought — weeds you clear feel like farming — never an HP bar; a fence
   gauge is a chore."*) Tending is an **activity with a read**, not a bar to
   babysit — and **automation delegates the floor at a quality penalty**
   (*"automation raises the ceiling; it never removes the floor… reliability
   at a quality penalty"*). So doing it yourself is *better*, never
   *mandatory* — the anti-treadmill valve.
4. ⭐ **Asymptotic for the self-like; lethal only for opted-into economic
   stakes; never deletion.** (*"A neglected pet leaves you. A neglected
   plant dies."* — the pet asymptotes to *"miserable but alive,"* a **ranch**
   animal dies because livestock is a business you chose, with a **paid**
   mitigation.) Consequence scales with how much you opted in.

> ⭐⭐⭐ **The doctrine line for the whole pillar:** *consequence attaches to
> acts and opted-into active states, never to time-passing or mere
> ownership; care is rewarded through capability, relationship, and the
> thing enduring — never through avoiding a decay bill; and the one thing
> that must never be the meter is the player's presence.*

⚠ **The residual worry to hold** (motivation lens): *"chosen haftas can
still stack into a second job… the exit doors have to stay cheap in
aggregate."* Each loop can be individually consensual and the **sum** still
feel like errands. The governing playtest question is theirs, verbatim:
**"does your character's week feel like freedom or like errands?"** This is
the real design risk of a stewardship pillar — not any single loop, but
their aggregate load — and the exits (automation, asymptotic decay,
paid mitigations) are what keep it on the right side.

### ⭐⭐⭐ The recurring-charge call — utilities are the compute meter's fictional twin

**(Called 2026-08-11.)** The four resolutions above cover *decay*. They say
nothing about **money that recurs** — the power bill, the water rate, the
parcel tax — and a home is where those land. The
[power-utility slate](./slates/builds/power-utility-slate.md) predates this
doctrine by nine days and was never checked against it, so the call was
outstanding.

**It does not need new doctrine.** Law 2 already made this exact ruling once,
for the compute substrate, and the reasoning transfers whole:

> Law 2's surface rule *"no rent on owned space"* was written for in-game
> property and does not straitjacket a genuinely recurring real cost. The
> narrower kernel that governs is **presence is never the meter**: metered by
> **use** (*"the way a torch burns only while lit"*), and **the bill is paid
> in engagement + capital, never in player attendance.**

> ⭐⭐⭐ **So: utilities are the compute meter's fictional twin.** A lit lamp
> burns supply the way a running zone burns compute and a torch burns fuel.
> **An empty house draws nothing** — which is Law 2's *"mere ownership and
> absence cost nothing"* satisfied by the physics rather than by an exemption.

**Three rules, and the third is what makes the first two safe:**

| # | Rule | Admits | Refuses |
|---|---|---|---|
| **1** | ⭐ **Meter on USE — never on connection, never on ownership** | per-unit consumption (kWh, litres); service fees at the point of a service rendered | a fixed **standing/connection charge** (rent on owned space with the serial numbers filed off); an **ad-valorem holding tax** |
| **2** | ⭐⭐ **Dischargeable WITHOUT attendance** | capital, a standing order, an income stream that runs while you are away | any bill whose only antidote is logging in — the inviolable floor, restated for money |
| **3** | ⭐⭐⭐ **Non-payment's ceiling is credit and comfort, NEVER the asset** | *"credit gets harder / you live worse"* | seizure, eviction-for-arrears, loss of the holding ([credit-slate](./slates/builds/credit-slate.md)'s property floor) |

Rule 3 is the load-bearing one. Law 2's real fear is **loss you can only avert
by showing up**; if non-payment can never take the thing, a recurring bill
cannot produce the treadmill Law 2 was written to ban — even in the worst case
of a long absence.

#### ⚠ What this forecloses, deliberately: the land tax

Rule 1 **bans an ad-valorem property tax**, and that is a real cost worth
stating plainly rather than burying. Law 2's text is unambiguous — *"mere
ownership and absence cost nothing," "no rent on owned space"* — and
economy-slate's compute passage goes further: *"no holding-tax is ever
needed; the rival resource self-rations through use."*

So a locality's revenue must come from **consumption, transactions, and
services rendered**, never from holding land. That is a genuine fiscal
constraint (a polity that cannot tax land must tax flow), and it is
*pedagogically richer* than the alternative rather than poorer — but it
**forecloses a land-value tax**, which the land-use and smallholding designs
might otherwise have reached for.

> **Reopening LVT is an amendment to Law 2, not a design detail.** If the
> civics/fiscal-cycle build wants it, that is the door — and it should be
> walked through deliberately, with rules 2 and 3 as the non-negotiable
> guardrails.

#### The structural correction this forces

⚠ [residence-ladder](./slates/tails/residence-ladder-design-pack.md)'s
`propertyCondition` read took four inputs, the fourth being *"premises
standing — utilities paid, tax current."* **That input is removed**, and not
only for Law-2 reasons: it is a **category error**. Condition measures the
state of the *holding*; standing measures the holder's relationship with
creditors. A house is not dilapidated because you are behind on a bill.

The ladder gate is already two-part — *money necessary, condition binding* —
so premises standing simply belongs on the **money half**, where it always
was. Nothing is lost, the Law-2 hole closes for free, and the condition read
gets more honest.

---

## Part 3a — ⭐⭐⭐ The price of comfort: what upkeep is FOR

**(Owner conversation, 2026-10-17, out of the laundry-and-soap design.)**
Part 3 is complete on what upkeep must **never** do. It says nothing on
what upkeep is **for**, how much it should cost, or what makes paying it
worth doing — and that silence is why upkeep is easy to get wrong in
either direction: a treadmill if nothing restrains it, an economy with no
service trades if everything does. The owner's challenge that opened it:
*"taxes aren't fun" is a truism, and it is not true — taxes can be fun if
we do them right.* This part is the positive half.

### The shape: one baseline nobody escapes, then a ladder you opt into

- **The body is the one mandatory upkeep**, because it is always with
  you — hunger, rest, hygiene. It is archetype 3: it accrues from
  **playing**, never from being away. (Assisted care is the exception
  that proves it — somebody else carries the body's upkeep.)
- **Everything else is optional** — clothes, a home, a workplace. The
  **comfort ladder** is opt-in, and climbing it has a price.
- **A welfare floor exists** so nobody is homeless (the dorm first home),
  and **its upkeep is near zero.** Unemployment is its own dial.
- ⭐⭐ **The recluse's exit stays cheap.** A player who wants none of it
  lives plainly and is not punished for it. They defy social norms, and
  the only things that react are the ones whose job is to — a doorman, a
  guest's regard. If refusing the ladder costs more than a plain life,
  the ladder was never optional.

### ⭐⭐⭐ Why upkeep must exist at all: it is somebody's INCOME

Lens 6, and the strongest argument in this part. **Your upkeep is the
cleaner's, the gardener's, the laundress's, the thatcher's and the
chimney sweep's livelihood.** Without upkeep the service vocations have
no customers, and the economy has no service-shaped hole for anybody to
fill. A world with no upkeep is not kinder; it is a world where half the
trades are impossible.

> ⭐⭐⭐ **Taxes are fun when you can see who they feed.** The bill is
> legible as a person, not a sink.

### ⭐⭐ The price is DERIVED, never declared

The real-world rule of thumb is that a property costs roughly **1–4% of
its value a year** to maintain. That is a heuristic, not a law — and the
reasons under it are mechanical, which is what lets us **compute** it
rather than declare a percentage (lens 1):

1. **More of it** — a bigger place has more floor, more glass, more
   chimneys, more garden, more roof.
2. **Finer materials are fussier** — marble, silk, parquet and polished
   brass want specialist care; an earth floor wants fresh rushes.
3. **The standard is part of what you bought** — a mansion kept to a
   cottage standard is no longer a mansion. The comfort tier *is* the
   upkeep tier.
4. **Specialist labour costs more** — the marble man charges more than
   the sweeper.

> **Upkeep = surfaces × each material's care × the standard kept.**
> Every term is already a row or a resolved field: a place's floor
> material (`ground.md`), its walls and roof as layers (the rubber and
> repair builds), glass, textiles. ⚠ **No percentage appears anywhere.**
> The Sims computes bills from household net worth — the right
> *instinct* and the declared version of it; we borrow the instinct and
> derive the number.

### ⭐⭐⭐ The engagement property: never more than you have proven you can afford

The owner's rule — *the game never asks more of you than you have
already proven you can afford* — falls out of the shipped model almost
for free:

- **Act-driven upkeep scales with USE**, and use scales with engagement.
  Dirt and wear come from living in and using a thing (archetype 1), so a
  player who plays less dirties less. The bill shrinks with play, with no
  rule to write.
- **Value scales with demonstrated earnings.** The house was bought with
  money earned at your level of engagement, so a cost proportional to its
  value is a bounded fraction of an income you have already shown.
- **When engagement changes, comfort moves — never ownership.** Part 3
  rule 3 guarantees it. That is the **downsizing** signal, and it is a
  decision rather than a penalty; **upsizing** is the same decision the
  other way.

⚠ **The honest exception — the shell clock.** A holding's shell weathers
**on the calendar** ([holding.md](./subsystems/holding.md) § two clocks),
so it does not scale with engagement: a house you are away from still
weathers. It is safe for three reasons, and all three must hold for any
future calendar-driven upkeep: (a) it reads only as a **band**, never a
number; (b) its floor is **dilapidated, never lost** (rule 3); (c) a
building **opts in** to weathering and a material opts in only when the
realm can supply it (the repair build's two opt-ins, owner 2026-10-16 —
below). The calendar may run over absence only for a **continuous
physical process with a legible local cause** (weather on a roof, damp
in a cold cellar, a garden growing) — **never time-dust**, which
room-condition already excluded.

⚠ **The other exception — the asset you did not earn.** An inheritance,
a gift or a windfall breaks the *"proven"* premise: its upkeep can
outrun the owner's means, and selling up is the honest answer. That is
real history (country houses sold or handed to the National Trust
because heirs could not keep them) and ⭐ it is content: the legend of
the **white elephant**, a gift whose upkeep ruins the recipient and which
cannot be refused. In a polity, **a gift can be a weapon**, and lens 7
should expect someone to use it.

### ⭐⭐ Upkeep may only demand what the economy can supply

Generalised from the repair build's material opt-in (*"a layer of a
material nobody produces and nobody moves to where it is needed must not
demand it — that is a time bomb, not an economy"*):

> **No upkeep may demand a material, a service or a labour the realm
> cannot actually supply** — by a player trade, or by NPCs that make
> enough of it and get it where it is needed. Until the supply exists,
> the demand stays off.

The same rule covers **labour**: an upkeep that only a hired hand can
discharge is a time bomb until hiring a hand onto your own premises
exists ([standing-instructions-slate](./slates/builds/standing-instructions-slate.md)
— *may a player automate labour at all?* is the open question the cleaner
and gardener markets wait on).

### Buying your way out — zorkmids for labour

Part 3's third resolution already allows it: **automation delegates the
floor at a quality penalty.** The hired cleaner, gardener, laundress or
thatcher is that delegation, and the hiring is where the decision lives:
**how often, to what standard, at what wage.** Doing it yourself is
better, never mandatory. ⭐ And the NPC keepers obey the supply rule too —
the repair build's *"the NPC keepers buy what they lay"*: an employer
that cannot buy the materials leaves its building to weather.

### ⭐⭐ What makes upkeep fun — nine principles

1. **Chosen scale.** You picked the size of the bill when you picked the
   size of the life. ⭐ *Agricola*: every child you add raises the
   feeding bill, and the upkeep is exactly what makes every action
   tense — the clearest proof that a tax can be the fun.
2. **A decision inside it** — how often, how well, who does it.
   *RollerCoaster Tycoon*'s per-ride inspection interval (costly vs
   breakdowns); *Theme Hospital*'s handyman priority sliders. **Deciding,
   not complying** (laundry-slate's Graveyard Keeper contrast).
3. **Visible change.** *PowerWash Simulator* — a large hit about nothing
   but cleaning — runs on before-and-after, a completion read and no fail
   state. In text: the window lets the light back in (glass transmission
   is derived), the shirt comes out white, the room's prose changes.
4. ⭐⭐ **It feeds somebody** (above). Upkeep is legible as a person.
5. **It reveals and conceals.** *Unpacking*'s tidying tells you who lives
   there; *Serial Cleaner* / *Viscera Cleanup Detail* clean to hide; the
   laundress knows what is on your clothes.
6. **It can be shared.** *Death Stranding*'s player-maintained roads —
   upkeep as a gift to the commons; *WoW*'s guild bank paying members'
   repairs; the public lavoir. Commons upkeep is participation (lens 3b).
7. **It pays off later and elsewhere, legibly.** *RimWorld*'s room
   cleanliness and sterile tiles driving surgical infection; *Dwarf
   Fortress*'s soap (lye + tallow) cleaning wounds. The crisis you did not
   have is the reward, readable in retrospect.
8. **It never threatens the thing itself.** Comfort and regard fall;
   ownership does not (rule 3).
9. ⭐ **Expression beats nags.** *Red Dead Redemption 2* is both lessons in
   one game: players loved the upkeep that is **expression** (the beard
   that grows, the bath, grooming the horse) and resented the upkeep that
   is a **nag** (guns degrading every few days).

### The survey — borrow and avoid

| | game | the mechanic | take |
|---|---|---|---|
| ✅ | **The Sims** | bills scale with household value; maids for hire; *neat vs slob* as a trait | the scaling (derived, not declared) · tolerance for mess as a **trait** — a slob does not mind your floor |
| ⛔ | **The Sims** | the **repo man** takes furniture for unpaid bills | rule 3 forbids it |
| ✅ | **Kingdom Come: Deliverance** | blood and dirt on clothes change how NPCs treat you; the bathhouse washes you and your clothes | the congruence read + the bathhouse, shipped and liked — ⚠ but as a **doorman's judgment**, never its charisma stat (textiles.md: *engine measures, subject values*) |
| ✅ | **World of Warcraft** | repair cost scales with gear quality; guild-paid repairs | valuable things cost more to keep · upkeep can be collectivised |
| ✅ | **Old School RuneScape** | house servants by tier, on wages | zorkmids for labour, with tiers |
| ✅ | **Albion Online** | housed, fed laborers whose output depends on their comfort | NPC labour that answers to how it is kept |
| ✅ | **Papers, Please** | rent, heat and food every night, for a family | upkeep as **moral drama** — a scene, not a system |
| ⛔ | **Rust** · **ARK** | upkeep scales with base size; unpaid, it **decays** and gets raided | right scaling, wrong penalty |
| ⛔ | **Ultima Online** · **FFXIV** | houses decayed unless the owner **visited**; housing demolished after 45 days away | presence as the meter — the exact failure Law 2 was written against |
| ⛔ | **Tamagotchi** · **Neopets** | neglect guilt on a real-time clock | presence as the meter, aimed at attachment |

### Where it surfaces today

- **Shipped:** the holding's shell clock + `survey` / `maintain`
  ([holding.md](./subsystems/holding.md)); `Durable` / `Keen` wear;
  utilities metered on use (Part 3).
- **In flight:** the repair build — mending by the maker's trade, the
  paid mend as somebody's work, building upkeep layer by layer, the two
  opt-ins.
- **Slated:** room-condition (`Soilable`, debris, `restQuality`) ·
  laundry and soap ([laundry-slate](./slates/tails/laundry-slate.md),
  [rendering-slate](./slates/tails/rendering-slate.md) § 9) · the hired
  hand ([standing-instructions-slate](./slates/builds/standing-instructions-slate.md)).

---

## Part 4 — ⭐⭐ Name the pillar

Stewardship appears in the corpus as **a north-star**, a **player-facing
name** for property-holding, and a **character Discipline** — but it is
**not** stated as a product pillar the way *learning-as-adventure* and
*community* are, and "care" lives only as the pet loop plus the phrase
*"care is the protective force."* The pieces are there; the whole is
unnamed.

> **Proposed: stewardship is Saxonberg's third pillar** — beside
> *learning-as-adventure* and *the living community/economy*.
>
> **The pillar, in one line:** *you hold things — a home, a garden, a herd,
> a workshop, a body, a companion — and tending them well is how you rise.
> The ladder's gate is the **condition of what you already hold**, not
> accumulation.*

The unifying verb is **tend**, and every loop pays out the same way: the
thing **flourishes or endures**, you gain **capability + standing** (never a
multiplier — *"buys precision and access, never a multiplier"*), and it
**gates the next rung** (*"money is necessary and not sufficient; the
binding gate is the condition of what you already hold"*). Anti-hoarding
falls out for free — *"holding more than you can steward is negative-sum."*
This is also why it fits the educational thesis: stewardship is *applied
hours* wearing an apron — you get good at tending by tending, and the game
measures the doing.

---

## Part 5 — The honest family status map, deferrals interrogated

| Loop | Archetype | State | Was the deferral principled or convenient? |
|---|---|---|---|
| Tool / weapon / armor wear | 1 | ✅ **shipped** (`Durable`/`Keen`) | n/a — built |
| Plant growth & health | 2 | ✅ **shipped** (husbandry) | n/a — the archetype-2 exemplar |
| Soil / cultivation | 2 | ✅ **shipped** (smallholding) | n/a |
| Land use (zoning gate) | — | ✅ **shipped** (Hinkley Hills) | n/a |
| Body afflictions / wounds / hunger | 3 | ✅ **shipped substrate**; ⚠ **content may be inert** (Part 6) | principled |
| **Food spoilage / preservation** | **2** | 🔲 **designed, not built** (the *keystone* deferral) | ⚠ **principled once, convenient now** — "one deferral, eight consequences"; if stewardship is a pillar, punting this punts the pillar |
| **Cold storage / fridge / cellar** | 2 | ◐ **authorable today** (`AtmosphericMixin` `Vessel`), inert without spoilage | fine — it waits on spoilage by necessity |
| **Disease / contagion** | 2 | 🔲 **designed** — inherits spoilage's growth term | principled (build spoilage first) |
| **Room condition / cleanliness / pests / tidiness** | **1** | 🔲 **designed** ([room-condition pack](./slates/builds/room-condition-design-pack.md)) | ⚠ **was mis-framed** — act-deposited (archetype-1-shaped), *not* a separate "condition model" |
| Property condition + residence ladder | 2 | 🔲 **designed** ([residence-ladder pack](./slates/tails/residence-ladder-design-pack.md)) | principled (waits on the allowance meter for the *city* rungs; the frontier rung is unblocked) |
| Stewardship Discipline | — | 🔲 **designed**, pure data | trivially cheap; ships with the vanilla discipline pack |
| Ranching / pets / farming | 2 | 🔲 **designed** | principled (wait on land use — now shipped — and spoilage) |
| **The multi-occupant household** | — | 🔲 **designed** ([household pack](./slates/tails/household-design-pack.md)) | new 2026-08-11 — condition is a **commons** once a holding has two occupants |
| **Rain → soil moisture** | **2** | ✅ **SHIPPED 2026-09-02** ([watershed.md](./subsystems/watershed.md); [water pack](./slates/tails/water-design-pack.md)) | ⭐ **drought is now possible for the first time** — `satWater` was always a limiting factor and could never bind; `CultivableMixin` integrates `WeatherApi.precipitationBetween × area` for a sky-exposed bed |
| **The hearth (room ambient)** | **1** | 🔲 **designed** ([hearth & larder](./slates/tails/hearth-and-larder-design-pack.md)) | ⭐ **unblocked**; scoped by thermal's non-goals to one room, no airflow |
| **Compost** | **2** | 🔲 **designed** (same pack) | ⭐ its **consumer already ships** (`feed` + `COMPOST_TAG`); only the producer is missing |
| ⭐ **Patina — the improving axis** | **1** | 🔲 **designed** ([patina pack](./slates/tails/patina-design-pack.md)) | ⭐⭐ **unblocked, and the only loop in the family where care makes a thing BETTER rather than merely un-worse** |
| **Tenancy — holding what you don't own** | — | 🔲 **designed** ([tenancy pack](./slates/tails/tenancy-design-pack.md)) | closed a hole *inside* the ladder's own rented rungs; ⭐ nearly free, because room-condition's attribution constraint **is** the mechanism |

**The verdict on the deferrals** (your instinct, confirmed): each was
locally reasonable *at the time* — every build shipped its slice and punted
the condition-dependent part. But **collectively they have punted the same
system repeatedly, and that system is the pillar.** The thing to rethink is
not any single design decision (the slates are sound) — it is the
**priority**, and the **mis-framing of "the condition model" as a big
unbuilt prerequisite** when it is two cheap producers over shipped shapes.

---

## Part 6 — ⚠ The prerequisite nobody flagged: the affliction content may be inert

The substrate audit surfaced a shipped-but-dead seam that everything in
archetype 3 — and spoilage's payoff — depends on (vitals.md, verbatim):

> *"**The Ideas are not live yet.** Condition seeds are inserted as template
> ROWS and nothing clones them into Ideas at boot, so `findByTemplatePath`
> answers `null` for **every** condition in a running world… authored
> `Condition` behavior is inert: signs, names, progression and
> `toxinBehavior` are all read off an object that isn't there."*

If that is current, then `ptomaine`'s bands, disease behavior, and any
spoilage payoff are reading off a null Idea. **This is the true first
domino**, ahead of any new producer.

> ✅ **VERIFIED, FIXED — and ⚠ STILL LIVE IN PRODUCTION.** (Reconciliation
> pass, 2026-08-11.)
>
> It was real. `ConditionApi.boot()` was written to stand the roster up (15
> singletons), with a real-seed coverage test that drives off the seed files
> on disk rather than a mock — the symptom was that **toxins never cleared
> and alcohol accumulated forever.** It lives on branch
> `fix/condition-ideas-inert`, pushed.
>
> ⚠ **But it is NOT merged.** `AppBootstrap.ts` on `origin/master` still
> calls only `MaterialApi.boot()`. So the first domino has a fix that has
> not fallen: **until that branch lands, spoilage's `ptomaine` payoff cannot
> work in a running world**, and build-order step 1 below is outstanding
> regardless of the code existing.
>
> ⭐ The general pattern this belongs to — *a reference-Idea roster nothing
> warms reads null forever, silently, while tests hand-construct the missing
> object* — has now bitten **three** subsystems (Material, Condition, and
> `CombatFormation`, which is **still broken**: every formation behaves as
> `default`).

---

## Part 7 — Build order (stewardship as a pillar)

> ⭐⭐ **Revised by the reconciliation pass, 2026-08-11.** This order was
> written when everything queued behind spoilage. **Four packs since then
> added three slices that depend on nothing** — they can be built in any
> order, at any time, including first:
>
> | Unblocked now | Needs | Why it is free |
> |---|---|---|
> | ⭐ **Patina** ([pack](./slates/tails/patina-design-pack.md)) | nothing | `Durable`/`Keen`/`Graded`/glob/chattel all ship; **no new verbs** |
> | ~~⭐ **The rain edge**~~ ([water pack](./slates/tails/water-design-pack.md)) | — | ✅ **BUILT 2026-09-02** — it was free exactly as predicted (weather + smallholding both shipped; one edge between them), and the build that took it went well past the edge → [watershed.md](./subsystems/watershed.md) |
> | ⭐ **The hearth** ([hearth & larder](./slates/tails/hearth-and-larder-design-pack.md)) | nothing | thermal's own named Wave-2 follow-on |
>
> **Patina is the one I would put first if the goal is to change how the
> pillar feels** rather than how much of it exists — it is the only loop
> where care makes a thing *better*, and everything else on this list is
> loss-resistance.

1. **Make the `Condition` substrate live** — resolve the inert-Idea gap
   (Part 6). Prerequisite for every archetype-3 payoff and for spoilage's
   `ptomaine` hand-off. ⚠ **The code exists on `fix/condition-ideas-inert`
   and is NOT merged** — this step is "land that branch," not "write it."
2. **Spoilage / preservation** — the ~120-line `Freshness` mixin (archetype
   2), `ThermalMixin` on perishables, the freshness→`ptomaine` override
   rung, salt as the first counterplay. **The keystone**: proves the
   archetype-2 producer pattern, gives the fridge a job, unblocks eight
   downstream things, and is the cheapest instance of the whole thesis.
3. **Cold storage** — the icebox (passive, no power) then fridge/cellar;
   nearly free once spoilage exists. Wakes the icehouse-keeper vocation and
   the agricultural year. See [fridge-design-pack](./slates/builds/fridge-design-pack.md).
3.5. ⭐ **Compost** — the loop-closer, and cheap: `feed` + `COMPOST_TAG` +
   the soil nitrogen reserve **already ship**, so only the producer is
   missing. Worth doing *with* spoilage rather than after it, because it is
   what stops spoilage reading as pure loss. See
   [hearth & larder](./slates/tails/hearth-and-larder-design-pack.md).
4. **Room condition + cleanliness** — the **act-deposited** producer
   (`Soilable` + a room debris field) over rooms and bodies; aesthetic /
   `restQuality` / sanitation ships near-term, the disease/immunity half
   follows disease. See [room-condition-design-pack](./slates/builds/room-condition-design-pack.md).
5. **Disease + hygiene** — inherits spoilage's growth term + `ContagionSpec`;
   "good husbandry is immunity" pointed at bodies, herds, crops, and (via
   room condition) homes.
6. **Property condition + the residence ladder** — the progression spine; the
   ladder gate is *"the condition of what you hold."* Frontier rung first
   (unblocked); city rungs wait on the allowance meter + region parcels. See
   [residence-ladder-design-pack](./slates/tails/residence-ladder-design-pack.md).
6.5. **The multi-occupant household** — condition becomes a commons the
   moment a holding has two occupants; rides the ladder's gate and room
   condition's attribution. See
   [household-design-pack](./slates/tails/household-design-pack.md).
7. **The Stewardship Discipline + the pillar naming** — pure data + a
   product-framing pass.
8. **Ranching / pets / farming** — ride on top, mostly designed.

---

## ⚠⚠ Part 8 — The build-time gotcha every pack in this family shares

**(Reconciliation pass, 2026-08-11. Stated once here rather than repeated in
five packs.)**

> **The seeder is INSERT-ONLY. Editing a seed's `data:` after first boot does
> nothing.**

At least four packs in this family add **fields to existing Material seeds** —
the spoilage-rate constant ([spoilage](./subsystems/spoilage.md)),
`takesPatina` ([patina](./slates/tails/patina-design-pack.md)), and mana
density + conductivity ([mana economy](./slates/builds/mana-economy-design-pack.md)).
On any world that has already booted, **those edits are silent no-ops.** The
material rows exist; the new keys never arrive.

So every one of those builds needs, explicitly in its plan:

1. a **migration** that adds the field to existing rows, **or**
2. a documented **delete-the-rows-and-reboot** reseed, **or**
3. a **derived default** that makes the absent field harmless.

⚠ This fails *quietly* — the field reads `undefined`, the consumer falls back,
and nothing throws. Which makes it the same shape as the family's other
recurring bug (below), and it should be checked at plan time, never
discovered at drive time.

### The sibling failure, and the guard that catches both

This family keeps producing one bug in four costumes: **a producer with no
consumer, a consumer with no producer, a roster nothing warms, and a fact with
no consequence.** Instances found so far — rain that never reaches soil,
compost that nothing makes, `Condition` Ideas nothing stands up, and a season
the world computes and only two `analyze` verbs read.

> ⭐ **The guard is `platform/idea/api/__tests__/ConditionLogic.boot.test.ts`'s shape:
> coverage driven off the seed files ON DISK, not a mock.** Generalising it —
> table-driven across the reference rosters, then a lint — is worth doing
> **before** these builds rather than after, because every one of them adds a
> new roster or a new field that can go quietly missing.

---

## Open questions / forks

1. ⭐⭐ **Priority — promote the pillar now, or keep the current
   sequencing?** The genuine decision. If stewardship is a pillar, steps
   1–3 move to the front of the line rather than staying "keystone
   deferrals."
2. ⚠ **The aggregate-hafta risk** (Part 3). Not a single-loop problem — a
   sum-of-loops problem. Needs a standing playtest metric: *freedom or
   errands?*
3. **Is the "only food spoils, idle gear never rusts" line right for a
   stewardship *pillar*?** *Lean: yes.* Tool-care depth comes from archetype
   1 (use-wear + the maintenance-relationship: `sharpen`/`repair` as a
   fought loop, the armorer as a career) — never from idle-rust, which stays
   banned. Reaching for "maintenance depth" via idle decay would break Law
   2; the archetype split already supplies the depth honestly.
4. **Where the `Freshness` gauge composes** — universal-and-inert on every
   `Thing` (matches `WetMixin`, an authoring-free but per-object field cost),
   or opt-in per class? (preservation slate's own open question.)
5. **Verify Part 6** against the working metabolism toxin path before
   sequencing anything on the affliction half.
