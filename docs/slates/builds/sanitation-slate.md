# Sanitation slate — litter, impound, and salvage

**Captured 2026-07-31.** Junk objects accumulate — spawned things nobody
would ever claim, left standing for immersion. The residency sweep
already self-evicts the cold tail, but silently; and there is no
player-facing way to tidy the world.

> **Status: direction set, nothing built.** A small system that reuses
> the depot design almost wholesale.

Related: [freight-slate](./freight-slate.md) (**the impound yard is a
depot**), [zoning-slate](./zoning-slate.md) (the dump as a LULU),
[residency.md](../../subsystems/residency.md) (the shipped sweep this
narrates), [chattel.md](../../subsystems/chattel.md),
[retail.md](../../subsystems/retail.md) (`reclaim` already exists),
[crafting.md](../../subsystems/crafting.md) (where the pipeline ends),
[livelihood-slate](./livelihood-slate.md) (the vocation).

## ⚠ The rule that applies first

**Do not give compute a diegetic face.** The standing correction:
compute is a metaresource, honestly labelled, *never* dressed in
fiction — no "ley-lines of Terminus."

**But none of that is needed here**, because:

> **Trash collection is a real municipal service with real diegetic
> reasons.** Cities have litter because people drop things.

**Build sanitation because cities have sanitation.** The memory benefit
is a fact to state plainly **out** of fiction (docs, a video) and never
mention **in** it. That puts sanitation on the **utilities side** of the
line — *money, fully diegetic* — not the allowance side (*meta,
undressed*). **No rule tension at all.**

## ⭐⭐ The classification problem dissolves

There is genuinely no way to tell a valuable object from junk by
inspecting it. That is the wrong question:

> **Abandonment is an ACT, not a property.**

You cannot detect junk. You *can* observe that someone left a thing on
public ground and did not come back — **a fact about behaviour, not
about the object.** Which is exactly how real abandoned-property law
works: municipal codes never ask *"is this valuable,"* they ask
**"has it sat in a public place for N days."**

## ⭐⭐ And you do not destroy it — you IMPOUND it

The whole trick:

> **An unanswerable classification problem becomes a waiting problem —
> and waiting is free.**

Take it to the yard, hold it for a period, let the owner **reclaim** it
for a fee. Nobody claims it? Then it *was* junk — **and the world told
you so, rather than an algorithm guessing.**

**And the impound yard is a depot**
([freight-slate § The depot as a business](./freight-slate.md)) — the
warehouse design with a **different intake rule**:

| Depot piece | Impound use |
|---|---|
| storage + two capacities | the yard fills up |
| the **receipt** | what you present to reclaim |
| the **bailee's duty of care** | the yard answers for loss/damage |
| a fee | the reclaim charge |

`reclaim` already exists as a verb shape (consignment,
[retail.md](../../subsystems/retail.md)). **Almost nothing new.**

### ⭐ The abandonment rule does triple duty

1. it **defines litter**;
2. it **authorizes collection**;
3. and — importantly — **it separates scavenging from theft.**

**On public ground after a period, fair game. Inside your parcel,
never.**

## ⭐⭐ Two legal regimes, and a locality picks

What happens to something valuable that goes unclaimed?

| Regime | Character |
|---|---|
| **finder keeps it** | efficient, and **cruel** |
| **impounded for the owner** | fair, and **expensive** |

A genuine legislative choice with real tradeoffs, and **another Tiebout
dial** — a difference between Terminus and Hinkley Hills that players
would notice and argue about.

## ⭐ The verb is `collect`, never `destroy`

**No player-facing destruction.** Destruction happens at the **far end**
of the pipeline, by the yard, after the hold — **never by hand in the
street.**

Two reasons: unhandled destruction is irreversible and griefable, and
`StuffApi.destruct` stays **the engine's business**.

## ⭐ The scavenger is a genuine entry-level vocation

**No capital, no license, no training — you pick things up.** An honest
low-tier job that most of the world actually has, that happens to serve
the system, and that a new player can start on day one.

Above it: the **licensed municipal service** or the **contracted private
collector** — and **municipal vs. contracted waste collection is a live
political fight**, so the fork is content rather than a coin flip.

## ⭐⭐ The pipeline ends in MATERIALS, not a void

The part that makes it pay for itself:

> **collect → hold → unclaimed → *auction* → salvage → materials →
> crafting**

⭐ **The auction step was missing and is structural** (added
2026-07-31 — see [auction-slate](./auction-slate.md)): **you try to
sell it whole before you break it.** Only what fails to sell gets
scrapped. Better economics, exactly what police and impound auctions
are, and it gives the pipeline a **public, attended terminus** instead
of a quiet teardown.

A broken cart is **timber and iron**. So:

- **junk is an input, not a cost**;
- **scavenging is economically sensible** rather than charity;
- and the loop **closes into the crafting economy** instead of
  terminating in a deletion.

Which is what scrap dealers actually do.

## Two smaller payoffs

- ⭐ **Eviction becomes narrated rather than silent.** Instead of cold
  objects quietly vanishing, **the cart came by** — better immersion
  *and* more honest, because the world visibly maintains itself.
- **The dump is a LULU** — nobody wants it, it sits outside the city,
  and it is the **third instance** of that problem after the abattoir
  and the prison ([zoning-slate](./zoning-slate.md)), with a satellite
  settlement and a weird legacy attached.

## The salvage yard as a business

Third in the sequence after the **turnpike trust** and the **depot**
([freight-slate](./freight-slate.md)), and a **different kind** of
business from both.

### ⭐ The first two sell access; this one transforms

The turnpike sells passage, the depot sells handling and storage. The
salvage yard **buys junk and sells materials** — the first genuinely
*productive* business in the chain. Which changes its economics
entirely:

- **inventory risk** — you buy hoping it is worth breaking;
- **inputs you do not control** — whatever comes in the gate;
- **margin = the spread** between scrap price and material price.

### ⭐⭐ The core skill is ASSAY, not teardown

Real scrap dealers make their money **on the buy, not the break.**

> **The salvage business is an information business wearing a labour
> business's clothes.**

Knowing what is *in* something before taking it apart is the whole
trade — and that is the
[instrumentation](./instrumentation-slate.md) thread landing on
schedule: **an assayer with an instrument reads composition; a novice
sees "a metal bar."** Same readout ladder as the gun and `analyze`.

It also keeps the standing rule clean: **competence buys the
information about what is worth hauling**; skill and labour affect the
*yield*, which is ordinary crafting behaviour.

### ⭐ Three exits, and the third matters most

1. **break for materials** — the default;
2. **resell intact** — when it is worth more whole (rides consignment);
3. **part out** — strip the valuable components, scrap the shell.

The third is how scrapyards actually work, and it produces something
the economy currently lacks entirely:

> **⭐⭐ The salvage yard is where the SECOND-HAND MARKET comes from.**

A cheap source of used components and worn gear — the difference
between *"you cannot afford a sword"* and *"you can afford a chipped
one."* A real economic tier, a genuine newbie affordance, and it makes
**Grade and condition load-bearing** rather than decorative.

### ⭐ Salvage is a lossy loop, and the loss is the POINT

Teardown must return **less** than went in. If it returned everything,
materials would never leave circulation and crafting would have **no
standing demand for raw extraction.**

> **The loss is what keeps mining and farming necessary.**

The § *pipeline* above seen from the economy's side — and it makes the
**yield rate a real balance lever on the whole primary sector.**

### ⭐⭐⭐ The salvage yard is the legitimate face of the fence

*The* real-world crime association, and why scrap dealing is heavily
regulated: **record the seller, hold the item, refuse suspicious
material.** All already expressible:

| Requirement | Existing shape |
|---|---|
| **records** | a **`directive`** — cannot self-execute, so it **forces inspection into existence**, exactly like the turnpike's repair obligation |
| **hold period** | the **impound** shape again |
| **traceability** | **chattel chain-of-title** — a stamped item turning up at a yard is **evidence** |

> **⭐ Which gives police a genuine investigative act: CHECK THE YARD'S
> BOOK.** Not a stat roll — **reading a record that exists.**

**And the thief's countermeasure falls out symmetrically: break it
down.** Once it is materials, it is untraceable. So there is a **race
between identity and scrap** — which is exactly why real metal-theft
law regulates the **intake** rather than the output. *The crime and its
counter both emerge from chattel, with nothing authored.*

A **spectrum, not a binary**: the licensed yard that records everything
→ the yard that does not ask too much → **the fence.** *Same business,
different compliance* — and the Gray already has a fence and pawnshop
waiting.

### ⭐⭐ Three businesses, three monopoly shapes — the arc completes

| Business | Monopoly from | Remedy |
|---|---|---|
| **turnpike** | **geography** | **rate cap** |
| **depot** | **network effect** | **common carrier** (non-discrimination) |
| **salvage / materials** | **vertical integration** | **structural separation** |

A corpo owning the **mines *and* the scrapyards** controls material
supply from both ends — neither a chokepoint nor a network effect.
That is **Standard Oil**, and the remedy is **breaking it up**.

> **Three monopolies, three remedies. A polity that meets all three has
> been taught competition policy by living in it.**

### Rungs, siting, and the second variant

**Rungs:** the **scavenger** with no yard who sells *to* one → the
**licensed yard** with a parcel and a book → the **corpo materials arm**
that buys yards and sets scrap prices.

**Siting** is industrial — ugly, noisy, and a pile — so downstream and
west, and it is the **classic nonconforming use**: there before the
zoning, with houses arriving afterwards
([zoning-slate](./zoning-slate.md)).

**Second variant:** the **breaker's yard** (machines, part-out), the
**ship-breaker** (huge, dangerous, a LULU in its own right), and
**demolition — salvage *in place***, taking a structure apart where it
stands. ⚠ **That last one touches the property/residences build; name
it, leave it to them.**

## The second-hand market

The **fourth** business in the chain — and the one that **cannot be
cornered**, which turns out to be the lesson.

### ⭐⭐⭐ The marquee is the LEMONS PROBLEM

Akerlof's *Market for Lemons* is the canonical used-goods economics: if
buyers cannot tell good from bad they pay only the **average** price,
sellers of good units **withdraw**, quality falls, and the market can
**collapse outright**.

Why it belongs in *this* game specifically:

> **The lemons problem is REAL here, not simulated.** Condition is
> honest kernel data — but **perceiving** it takes competence or an
> instrument.

Most games either show every stat (**no** asymmetry) or randomise
outcomes (**fake** asymmetry). Here a novice genuinely cannot tell a
sound blade from a fatigued one, using **the same perception rule the
world already applies to everything else.**

#### ⭐ Every real-world solution is already a substrate

| Solution | Existing shape |
|---|---|
| **inspection** | the buyer's own competence — **buying becomes a skill check on the BUYER**, not a die roll |
| **certification** | an **appraiser** with a certified instrument — the **third** landing of that hook (press → zoning → here) |
| **warranty** | a **contract with a verifiable condition** ([contract.md](../../subsystems/contract.md)) |
| **reputation** | **renown** — already load-bearing for the depot |
| **return rights** | a legal default a **locality** can set |

**The lemons problem does not need machinery. It needs naming.**

### ⭐⭐ Two axes of asymmetry: condition AND title

Chattel chain-of-title lets a buyer **check provenance**, so *"is this
stolen?"* has an honest mechanic rather than a flag. And the counter
falls out:

> **The stolen-goods discount is emergent** — you pay less for what you
> cannot verify.

The lemons problem applied to **title** instead of **condition**. **Two
asymmetries, one market**, both honest data gated by what the buyer can
see.

### ⚠ The gradient is the whole market

> **If a worn tool works identically to a new one, the new-goods market
> dies. If it is useless, the used market dies.**

It lives in the gradient: **worn works worse in a way you can feel, but
not fatally.** The crafting substrate already carries this as
**keenness vs. condition — two axes, deliberately never collapsed.**

**⭐⭐ And because it is two axes, quality × condition is a 2×2** — so
**a good worn tool can beat a bad new one:**

> **The second-hand market has more interesting decisions in it than the
> new market**, because you trade across two dimensions instead of one.

### ⭐⭐ Buy broken, repair, resell — the ideal newbie business

**Repair is the bridge** between salvage and resale, producing a genuine
triage: **repair** (restore condition) · **part out** (salvage) · **sell
as-is**.

Which yields honest arbitrage — buy broken cheap, repair, sell working:
**low capital, skill-gated, real margin**, and it teaches the whole
economy on the way through. **A better first business than anything
currently available.**

### ⭐⭐ Pawn is the credit face, and it belongs at the bottom

The Gray already has a pawnshop. **Pawn is not a sale** — it is a
**collateralised loan with a redemption period**, the **third instance
of hold-and-redeem** after impound and the warehouse receipt.

More importantly it is **the poor person's bank**: you do not sell your
tools, you pawn them and get them back Friday.

> **Productive credit (the turnpike bond) at the top; consumer credit
> (the pawn ticket) at the bottom.**

Honest about where credit actually sits in an economy — and **a
locality legislating the redemption period and the interest cap decides
whether the pawnshop is humane or predatory.**

### Venues

**salvage yard** (cheapest, worst information) → **pawnshop** →
**consignment shop** (*nearly shipped* — `consign`/`reclaim` exist) →
**auction**, which solves a different problem: not asymmetry but **price
discovery** for unique goods. → **[auction-slate](./auction-slate.md)**
(its own slate: the substrate answer is *contracts, not forums*, and
the silent/live split is the design).

### ⭐⭐ The capstone: this market structurally resists monopoly

Its inventory is **non-fungible and locally sourced.** You cannot
corner a market where **every unit is different** and supply comes from
whoever happens to be selling.

| Business | Monopoly from |
|---|---|
| **turnpike** | geography |
| **depot** | network effect |
| **salvage / materials** | vertical integration |
| **second-hand** | **— none. Uniqueness defends competition.** |

Which teaches the flip side of everything the other three taught:

> **Monopoly needs fungibility and scale. The market that cannot be
> cornered is the one where every item has a history.**

## Open questions (for requirements)

1. **The hold period** — one value, or per-locality (organic law)?
   (Instinct: legislated, since the two regimes above already are.)
2. **What counts as "public ground"** — the parcel walk answers it, but
   confirm the unowned/frontier case (probably: no collection service
   at all out there, which is why the frontier is littered).
3. **Does collection need a licence**, or may anyone scavenge? (The
   informal sector argues for anyone; the municipal contract argues for
   a licence. Possibly both, at different tiers.)
4. **Yard capacity pressure** — what happens when the impound yard is
   full? (Shorten the hold? Refuse intake? Both are real, and both are
   political.)
5. **Salvage yield** — does breaking down a Crafted object return its
   materials at a loss, and is that loss a **Grade**/skill read? (The
   crafting substrate should answer this; do not invent a second
   teardown model.)
6. ⚠ **The interaction with the residency sweep** — sanitation must
   *narrate* eviction, never **replace** it. The sweep is a safety net
   that must keep working where no service covers.
