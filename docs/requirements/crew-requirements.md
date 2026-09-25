# Crew — requirements

**Kind:** feature
**Leads from:** kernel — first consumers are **every service point with a
fulfilling seat** (ten businesses today: the Hearthworks, Dave's Bar, the
market bakery, Hearts-Delight's farm and mill, the brewing / Crowsfoot /
vintner outfits), with **Dave's Bar and the Hearthworks** as the two the
drive walks.

When you order a drink, the game finds a bartender, and then **performs
the recipe itself**. The bartender is not making it. Their knowledge is
not consulted, their competence does not affect the result, and if two
bartenders are present the one who serves you is chosen by sorting
identity paths. This build makes a request go to somebody who can
actually do the thing, and makes the game say who could when nobody
present can.

> **A request goes to somebody who can actually do it — and when nobody
> present can, the game says who could.**

Seeds: [crew-slate](../slates/builds/crew-slate.md), whose 2026-09-25
census and *capability correction* sections this executes. The slate keeps
what this does not take: the push-at-range column (dispatch, the turnout,
the hue and cry), the brain-fact eligibility it needs, and `actsAsOne`.

---

## What already exists

**Almost every verb.** `order`, `menu`, `apply`, `appoint`, `clock on`/
`off`, `quit`, `house roster`, `house stock`, `job`, `tip`, `collect`.
**This build adds no verb at all** — it changes what shipped verbs
consult, and adds authored data.

**A seat already expresses who MAY.** A position carries `fulfills` (the
disciplines an order routed to it is served in), `headcount`, `purchases`,
`requires` (a closed `{gigs, discipline, band}` hiring criterion),
`reportsTo` (an organization's chain, walked nearest-superior-first) and a
compensation basis. `isFulfilling(discipline)` is three conditions, all of
them: on shift · the seat lists the discipline · standing somewhere the
house operates.

**The knowledge ladder is shipped, and one verb is exempt from it.** Every
craft verb shares one gate — *"the can-make deed gate (`requireDeed`) —
the one gate `forge`/`cook`/`make` share"*. And then, in the same doc:

> **`order <item>` … Never knowledge-gated.**

alongside the consequence already flagged beside it: *"a recipe's
discipline is **credited, never gated** — so a wrongly-picked maker crafts
successfully and is credited with a trade they do not practise."*

**Nobody in the realm knows anything.** Across all **70 authored NPC
rows**: 47 carry a `competence:` band, 63 carry behaviours, 44 carry a
costume — and **zero carry any recipe knowledge.** That is why `order` is
exempt: gating it today would close every bar, kitchen and smithy in the
game.

**Competence is authored and unread.** The bar's five are already told
apart — Dave `bartending: expert`; Mara proficient/proficient plus
business-administration; **Remy `mixology: proficient`** (the cocktail
specialist); **Sloane** both competent plus **`awareness`** (the graveyard
shift is the one who notices); Augie `bartending: proficient`. An output's
grade derives from the inputs, the recipe's base grade and the **tools'**
control bands — *"skill embedded in the capital raises the floor"*. The
maker's own band never enters. ⚠ **So a maker earns a Transcript deed from
work their competence did not affect.**

**A dossier already expands a band into deeds.** Each cast row's
`competence:` block is *"evidence, never values: each entry expands into
the same rows a lived history would have written, marked `claim`"*, seeded
once and skipped if any claim exists.

**Arbitration has never fired.** Across 34 employers, **zero** have two
simultaneously-on-shift holders of same-discipline seats. Dave's Bar's four
bartenders are staggered with no overlap (06–14 · 14–22 · 22–06 ·
weekends); the Hearthworks' `kitchen-hand` — `fulfills: [cooking]`,
`requires: {gigs: 2}` — is **unrostered**, so Odo cooks alone. The
tie-break's own comment describes two people who have never stood in a
room together.

⭐⭐ **The one live consequence is the player's.** The tie-break sorts
ascending on identity path; a player's is `/platform/agent/Avatar/<id>` and
every NPC's begins `/world/`. **The first player to join any crew takes
every order, forever, and the staff beside them go silent.**

**And the authors asked for this four times.** `headcount` is authored on
the tailor's shop (2, one filled), the university farm (2, none), the
general store's `hand`, and the Hearthworks' `kitchen-hand` — four seats
meaning *a second pair of hands*, two of which can do nothing if filled.

**Therefore what is genuinely new here is:** consulting whether a person
can do the thing before routing a request to them; seeding what NPCs know
so that gate is survivable; a house-authored rule for the residual case
where two people both can; a refusal that names who could; and enough
authored overlap that any of it happens without a player present.

## Goals

- **`order` consults the maker.** A request is fulfilled by a member who
  knows how, or it is refused — and the refusal names somebody who does,
  when somebody does.
- **What an NPC knows is derived from who they are**, not authored per
  recipe — so a competence band becomes a difference in *what they can
  make* rather than a decorative label.
- **The gate is symmetric.** A newly hired player is refused a drink they
  have not learned, on the same terms as an NPC.
- **A house answers "who serves this" by a rule it authored**, from a
  closed vocabulary, once more than one member can. No tie is ever broken
  by insertion order, authored order or identity path.
- **A player who joins a crew neither starves nor monopolizes** — the
  staff beside them keep working, and the player gets work.
- **The bar has a senior seat a player can hold**, with the other
  bartenders reporting to it and a criterion that refuses honestly.
- **More than one person is on shift somewhere**, so the rule runs in the
  ordinary world and not only under the drive.
- **A wrongly-routed request stops crediting a trade nobody practises.**

## Non-goals

- **Dispatch, the turnout, the hue and cry — the whole push-at-range
  column.** It needs brain-fact eligibility (of 24 kernel and 11 pack
  brains, none declares it can receive an assignment) and content that
  does not exist (no constable brain, no watch department). →
  [crew-slate](../slates/builds/crew-slate.md) + the policing build.
- **The register, the safe, the shift-change hand-off, dismissal.** A
  coherent build, and a *different* one — the bar's money and handovers
  made diegetic. → [daves-bar-slate](../slates/builds/daves-bar-slate.md)
  § the ritual, and [livelihood-slate](../slates/builds/livelihood-slate.md)
  §5.4 for firing. ⚠ It is the better *second* build, because it then has
  a crew to hand off between.
- **`actsAsOne` / the mob.** No pack exists; and policing models the gang
  as *"a Business that commits crimes"*, so it may inherit this substrate
  rather than need its own. → crew-slate.
- **A pipeline** (one order, several actors in sequence: prep → cook →
  plate). A genuinely different primitive that no parameterizing of a
  selector produces. → crew-slate, named and unowned.
- **Cohesion — a set that moves together.** ⚠ Nothing in the game has it;
  building it would be invention, not generalization. → crew-slate.
- **Triage** — a request whose priority reorders the queue. The demand
  side's, and `AttendantMixin` already has a `reception` discipline. →
  [attendant.md](../subsystems/attendant.md).
- **Making the maker's competence affect the OUTPUT.** This build gates
  *whether* they can; the grade seam ("the ceiling stays the skill seam's")
  stays where it is. → [crafting.md](../subsystems/crafting.md)'s deferred
  skill seam.
- **Archetype and temperament rows.** Specialty here is a shipped,
  derived band. → [cast-archetype-slate](../slates/builds/cast-archetype-slate.md).
- **A stocktaking Discipline.** None exists; the count exercises
  appraisal. → advancement's planned Discipline pass.

## Placement

- **Kernel.** The gate belongs beside the other three craft verbs' gate,
  and the routing belongs beside employment. Both are asked by every
  trade and owned by none.
- **The derivation from band to deeds is the dossier's**, where the
  band→Transcript expansion already lives. ⭐ One mechanism for players and
  NPCs: a player earns deeds, an NPC is seeded with the deeds a career
  would have left.
- **A house's rule is content** — one authored word on the business row. ⭐
  A second bar gets a different character with zero code.
- **The overlap and the senior seat are content** — rows in
  `saxonberg-lounge` and `hearthworks`.

## Collisions

- ⚠⚠ **Every venue in the realm, all at once.** Gating `order` touches the
  bar, the Hearthworks, the bakery, the two Hearts-Delight houses and the
  three goods-yard outfits simultaneously. **If the derivation under-seeds,
  the world stops serving.** This is the build's central risk and the
  drive must visit more than one venue.
- **All 97 recipes in thirteen packs**, because the derivation reads each
  recipe's authored `difficulty` against a band. ⚠ A recipe whose
  difficulty was authored carelessly becomes unmakeable by the person whose
  job it is.
- **The bar's five cast** — Mara gains a seat; Remy, Sloane and Augie gain
  nothing authored and are differentiated entirely by what they already
  know. ⚠ Nobody's dossier is rewritten to make the outcome nicer: if the
  bands do not produce sensible behaviour, **the derivation is wrong, not
  the people**.
- **The Hearthworks' `kitchen-hand`** — rostering it is what makes
  arbitration fire without a player. It is also the one seat in the game
  where a single hire turns arbitration on, so it is both the fix and the
  test.
- **Dave's `covers` brain**, which fills a gap by taking *the first
  fulfilling seat in authored order* — the second placeholder this
  retires. ⚠ And Dave covers the bar's weekend 00–10, which is on nobody's
  roster: the owner works the Saturday small hours for free.
- **The players' own knowledge ladder.** Gating `order` symmetrically means
  a hired player meets the deed gate for the first time at a bar rather
  than at a forge. ⚠ Whatever teaches a player to make a drink must exist
  before this ships, or a hired player holds a seat they cannot work.

## Surface decisions

### A request is an intent; fulfillment is the member's act

**Q.** Should some requests carry the act itself — the engine performing
the recipe as the chosen maker, as `order` does today?

**A.** No. A request names what is wanted. The member does it, or cannot.

**Why.** The alternative was proposed and rejected in conversation:
*"requests should always be about intent. response/fulfillment is about
acts. if the current staff of dave bar doesn't actually know how to mix
drinks to satisfy orders thats a gap in my opinion, not a feature."* It is
a gap, and a measured one — `order` is the single craft verb exempt from a
gate the other three enforce, and the exemption exists only because no NPC
knows anything. Keeping the split would have made one verb's unseeded data
into a design principle.

### Eligibility is three questions, and this build answers two

**Q.** What makes a member eligible?

**A.** The **seat** says who *may* (shipped). The **person** says who
*can* — do they know it, how well (this build). The **brain** says whether
they will carry it out when it is not instantaneous (deferred with the
push-at-range column).

**Why.** ⭐⭐ **Capability comes before arbitration and mostly dissolves
it.** Two bartenders and a Negroni is not a tie once knowledge is
consulted — Sloane does not know that one, Remy does — and the refusal can
say so. That is the refusal-as-progression-UI shape rather than a coin
flip, and it shrinks arbitration to the genuine case where both can.

### What an NPC knows derives from their band, seeded as deeds

**Q.** How does 70 NPCs × 97 recipes get authored?

**A.** It does not. The dossier already expands a competence band into the
Transcript rows a lived history would have written; it expands the same
band into **can-make deeds** — the recipes in that discipline at or below
what the band supports, measured against each recipe's own authored
`difficulty`.

**Why.** Authoring the tables is the enumerated-content failure lens 2
names, and it would rot the first time a pack adds a recipe. Deriving keeps
**one mechanism for players and NPCs** — a player earns deeds, an NPC is
seeded with the deeds a career would have left — with no double standard
and no second knowledge model. And it makes `mixology: proficient` versus
`competent` immediately mean something.

⚠ **The failure mode to watch:** the derivation is the whole world's supply
of competence, so a mis-set threshold closes every venue at once. It must
be provable at authoring time, not discovered by a player at a rail.

### The gate applies to players symmetrically

**Q.** A player on shift is a resolvable maker — `crafting.md` flags this
as an inherited open question. Gate them too?

**A.** Yes. Decided in conversation.

**Why.** Otherwise the player is the one actor in the game who can make
anything, which inverts the fiction the moment they take a job and makes
every NPC's limitation look like a bug. A first shift you are not yet
good at is a progression path; a first shift where you outperform the
expert is not. ⭐ And it is lens 6's symmetry test — a criterion that
applies to the staff and not to you is not a criterion.

### The house authors its routing rule, from a closed vocabulary

**Q.** One rule in the engine, or a per-house setting?

**A.** A closed vocabulary, authored per house. Dave's Bar authors
**first-free, then the better specialist, then the junior**.

**Why.** The demand side settled this question already and settled it this
way — a service point's queue picks from `line`, `scrum`, `reception`,
`take-a-number`, `appointment`. An engine-wide law fails lens 2 the moment
a second venue wants a different one; a kitchen brigade is not a rail. And
the rule must be **declared**: a house with a crew and no rule is a
build-time failure, never a silent fall back to whoever is first, because
the silent fallback is the defect being retired.

⚠ **Junior-first is deliberate and has a cost:** the senior gets fewer
orders. That is correct for the fiction — the senior is counting stock —
and it is what makes a new hire's seat real. Recorded as something the
drive must look at rather than assumed away.

### The resolver is handed its candidates; it does not go find them

**Q.** Should reach be a parameter?

**A.** No parameter. The resolver stops computing the set and is handed
one.

**Why.** The shipped resolver reaches into the room's contents, which
silently made *one room* the law — and the police case shows that is not
the rule but a hardcoded acoustic reach. ⚠ But shipping a `reach` enum with
one live value is the vacuous-gate failure this project keeps paying for.
Handing in the set costs nothing, invents nothing, and lets a station or a
whistle supply a different set later instead of rewriting a parameter.

### Seniority is a seat, on the shipped chain

**Q.** Is "senior" a property of a person or a position?

**A.** A position — **head bartender** — with the other bartenders
reporting to it via the existing chain, and its criterion authored in the
existing closed `requires` vocabulary.

**Why.** Everything about authority at work here is a seat the law points
at; advancement says the same from the other end (*"A pantry hand vs a
bottling hand — same brain, same act… **Not** Disciplines. Those are
positions, and positions live on a Business roster."*). ⭐ So a player who
earns the seat inherits the seniority, instead of watching an NPC's
personality outrank them permanently. The bar's own prose already says it:
*"Whoever picks up the next one earns the next nail. Nobody hands it over;
you just start counting."* Mara holds it at boot; the nail is the
player's.

### The build creates its own first consumers

**Q.** Nothing in the world has two qualified people on shift. Ship
anyway?

**A.** No — roster the Hearthworks' `kitchen-hand`, overlap two of the
bar's shifts, and roster the bar's weekend 00–10.

**Why.** ⚠⚠ **Without it the rule runs only under the drive**, which is
the vacuous-gate hazard at the scale of a whole build. Every seat in the
realm was authored as a singleton *because nothing supported anything
else*; the census measures the absence of the mechanism, not of the
demand — and four authored `headcount` seats are the demand in writing.
Cover exists for a gap, not a permanent hole, and a proprietor drawing no
wage on a recurring shift makes the labor line lie.

---

## Lens pass

**1 · Pedagogy.** The Disciplines are `bartending` / `mixology` (whose
split this earns), `recipe-knowledge` (which `mixology` already requires),
and `appraisal` on the stock count. ⭐ What it teaches is that **skill is
what you can do, not a number beside your name** — and it makes the world
derivable in the strong sense: knowing the staff tells you who can serve
you what. Nothing rolls.

**2 · Creative expression.** The ordinary case is one authored word (a
house's rule) and zero authored tables (knowledge derives). The bespoke
case is a house whose rule the vocabulary lacks — the signal to add an
entry, not to write a class. ⚠ The gap: a recipe's `difficulty` becomes
load-bearing for who can make it, and it was authored when it only
affected credit. That is a re-reading of 97 rows, and it is the build's
real authoring cost.

**3 · Immersion & roleplay.** A bartender who does not know your drink and
says so is a person; one who silently makes it perfectly is a vending
machine in an apron. ⭐ And two shipped pieces of prose stop lying — the
empty nail on the office wall becomes a seat, and *"skill embedded in the
capital"* stops being the only skill in the room. No gauge is added: the
refusal is a sentence, not a bar.

**4 · Values.** The choice forced is **whether to learn the thing or
route around it** — take the shift you are not good at yet, or hand it to
whoever is. Standing is conferred by the house (the chart) and by what you
can demonstrably do. ⚠ Junior-first means advancing gets you *fewer*
orders; correct for the fiction, and named as a risk rather than hidden.

**5 · Epochs.** Who can do a thing, and who gets told to do it, are
epoch-invariant: a rail, a brigade, a ward round, a gun crew. ⭐ The axis
the police case exposed — *reach* — is deliberately not parameterized
here, so the medieval and radio-era forms remain one object with a
different candidate set rather than two mechanisms.

**6 · Economy & governance.** It **produces** honest labor allocation and
a reason for training to exist; it **consumes** the time of whoever is not
yet good enough. **Who pays:** the house, in a slower rail; the newcomer,
in refusals. **Was the demand there first:** yes, three times over — the
tie-break's `TODO` in shipped code, four authored `headcount` seats, and a
documented exemption (*"never knowledge-gated"*) that exists only because
the data was missing. ⭐⭐ **Who can be wronged and can they answer:**
three decisions judge a person — can you make this, who serves this order,
who holds the senior seat. Each names its criterion, each refusal says
what lifts it, and **the gate is symmetric between players and NPCs**,
which is the property that makes it a criterion rather than a handicap.

---

## The drive

⚠ **Two venues, not one** — gating `order` touches every venue in the
realm, so a single-venue drive cannot see the risk.

1. Set the clock to a weekday morning. Go to the bar. `order` a simple
   pour from Mara. **Expect it served.** (The floor: the ordinary case
   still works.)
2. `order` the hardest cocktail on the menu from Mara. **Expect** either a
   drink or a refusal — and if a refusal, **expect it to name who can**.
3. Go to the Hearthworks. `order` a dish from Odo. **Expect it served** —
   a second venue, a different discipline, and proof the derivation is not
   bar-shaped.
4. Back at the bar at a shift boundary, with **two bartenders on** (the
   new overlap). `order` a cocktail several times, and a plain pour several
   times. **Expect** the cocktails to reach the stronger mixologist and
   the pours the other, and **expect it not to be the same person every
   time regardless of what was asked**.
5. `apply for bartender`; `clock on`. `order` as a patron via another
   character, or watch a patron order. **Expect the player to be served
   some of the orders and not all of them.** ⚠ Both failures are
   defects: never chosen means the seat is decorative, always chosen means
   the staff went silent.
6. As the new player-bartender, `mix` the hardest cocktail. **Expect a
   refusal naming what you have not learned** — the symmetric gate.
7. Learn it (the knowledge ladder's own path). `mix` again. **Expect it to
   work**, and `order`s for that drink to start reaching you.
8. `apply for head bartender`. **Expect a refusal stating the criterion.**
   Do the stock count; apply again; **expect to hold it**, `house roster`
   to show it, and the chain to show the other bartenders under you.
9. With the head bartender mid-count, have a patron order. **Expect the
   junior to serve it** and the count not to be interrupted.
10. Empty the rail of qualified staff (clock off, off-shift hour).
    `order` anything. **Expect a refusal that says nobody here can, and
    who could** — not silence, and not a drink from nowhere.
11. Visit the bakery and one goods-yard outfit. `order` whatever each
    sells. **Expect both to still work.** ⚠ This step is the
    world-didn't-break check and must not be skipped.

**Cannot be reached by this drive, and must be asserted directly:** the
weekend 00–10 roster; a house authored with a crew and no rule, which must
fail at build time rather than silently picking the first member; and the
derivation's coverage across all 97 recipes.

## Acceptance criteria

- A patron asks for a drink the bartender does not know and is **told who
  does**.
- A patron asks for a drink the bartender does know and **gets it**, at
  every venue that sells anything — the bar, the Hearthworks, the bakery,
  the goods-yard outfits.
- With two bartenders present, **what was ordered decides who serves it**,
  and a patron can predict which by knowing the two bartenders.
- A newly hired player **is served some orders and not all of them**, with
  NPCs of equal or greater competence beside them.
- A newly hired player **is refused a drink they have not learned**, on
  the same terms an NPC is, and can then learn it and make it.
- Nobody is credited with practising a trade they were wrongly routed
  into.
- `house roster` shows a **head bartender**, who holds it, and who reports
  to it; a player who does not meet its criterion is **refused in words
  that state the criterion** and can then satisfy it.
- Somebody other than the owner is on the bar at 03:00 on a Saturday.
- At least one workplace has two people on shift **without a player
  present**.
- ⭐ A house that authors a crew without naming its rule **cannot boot**.

## Cross-references

- [crew-slate](../slates/builds/crew-slate.md) — the census, the matrix, the capability correction, and everything this leaves
- [crafting.md](../subsystems/crafting.md) — the deed gate, `order`'s exemption, the credited-never-gated flag, the deferred skill seam
- [advancement.md](../subsystems/advancement.md) — bands, the Transcript, the specialization test, NPC-and-player symmetry
- [employment.md](../subsystems/employment.md) — seats, `fulfills`, `requires`, `reportsTo`, the roster tick, `covers`
- [identity.md](../subsystems/identity.md) — the dossier as seeded evidence, which the knowledge derivation extends
- [attendant.md](../subsystems/attendant.md) — the demand-side policy vocabulary this copies
- [daves-bar-slate](../slates/builds/daves-bar-slate.md) — the register, safe, hand-off and succession, deliberately the next build
- [policing-slate](../slates/builds/policing-slate.md) — the summon ladder and the reach axis this does not parameterize
- [design-lenses.md](../design-lenses.md) — the pass above
