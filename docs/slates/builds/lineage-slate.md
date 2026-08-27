# Lineage slate (working doc)

> **Status: design proposed, nothing built.** A restructure of char-gen
> around a single idea: **you choose a family, not a stat sheet.**
> Everything else — species, aspiration, starting capital, body
> configuration — becomes either a *filter* over that choice or an
> optional refinement behind it.
>
> **Decided in this pass:** no hybrid species (option A below); the
> gallery offers same-species parents; the point budget is spendable on
> body/faculty, banked as starting capital, or spent on rerolls.
>
> Companion: [blood-slate](./blood-slate.md), which consumes the
> endowment category this doc defines.

---

## The gap

Char-gen today collects five **declared** fields — `species`, `sex`,
`name`, `pronouns`, `aspiration` — and nothing else. There is no roll
anywhere in character creation; `husbandry.md` notes even its seed lots
carry *"no inherited variation."*

Two problems with that:

1. **It shows off none of the depth.** A player meets the platform's
   systems at hour twenty, not minute one. The one field that *sounds*
   like depth — `aspiration` — produces exactly two strings
   (`claimSeeds` and `bioSeed`) and touches nothing else.
2. **It produces a character with no world attached.** You arrive
   knowing nobody, from nowhere, having done nothing. Every relationship,
   every competence, every fact about your past has to be built from
   zero — which is also the [antecedents](./antecedents-slate.md)
   problem, arriving from the player side.

---

## ⭐⭐ The story char-gen tells: your majority day

Char-gen has never had a stated fiction. It should, because every piece
of this design already assumes the same one:

> **You are the child of a household in this world. Today you come of age
> and leave it. What you know, you learned there. Who you are, you
> learned there. What you carry, they gave you. Everything after this is
> yours.**

Look at how much it explains that would otherwise need explaining:

| the mechanism | why it makes sense |
|---|---|
| the parent gallery | you have only just left them |
| the antecedents budget | it is **childhood** — a bounded, explainable amount of history, not a whole adult life |
| traits seeded as upbringing | the household you are walking out of |
| starting capital | what your family gave you |
| blood type `untested` | you are young and have never needed a clinic |
| reroll priced against capital | your family's circumstances are what they are |

It is also the platform's own thesis in miniature — **you arrive with a
past you did not choose and a future you do** — and it makes the first
session's implicit goal legible: *become someone.*

---

## ⭐ The four kinds of value

The platform has three and is missing one:

| kind | who sets it | example |
|---|---|---|
| **derived** | nobody — computed from a ledger, never stored | competence, traits, renown |
| **declared** | the player, deliberately | species, name, pronouns |
| ⭐ **endowed** | a process the player does not control | ← **the gap.** blood type |
| **state** | play | wounds, money, location |

**Endowed** is what "genotype" means, and it needs a rule to keep it from
being arbitrary:

> ⭐⭐ **Endow what creates a relationship. Never endow what creates a
> ranking.**

Blood type passes cleanly — pure relationship, no scale, nobody's is
better. A rolled `+2 strength` is the same *category* and fails; an
unchosen rank is the worst of both worlds. The rule also pre-filters
future endowments: metabolic quirks, allergies, and handedness pass
(they cost without ranking); sensory acuity and raw strength do not.

**Genotype is stored; phenotype derives** — the house pattern one level
down, identical in shape to `transcripts → Competence`. See
[blood-slate](./blood-slate.md) § *Blood type* for the worked case.

---

## The gallery

**One screen, one choice: pick a family.** That single act yields
species, genotype, a home locality, an antecedents budget shaped by the
household's trade, chronicle prologue claims, a starting kit, and **two
live relationships**.

⭐ **The payoff that no stat allocation can match: char-gen produces
relationships instead of numbers.** You arrive in the world already known
by two people who have names and an address. That also chips at the
authored-acquaintance gap in
[antecedents-slate](./antecedents-slate.md) — a new character starts with
real edges in the belief store instead of introducing themselves to
everyone.

### ⭐ The parents are unrealized — a record, not an NPC

**DECIDED: living or dead, the parents are never Stuff.** They are
records: referenced by your chronicle, known to other people, holding an
address, confirmable by a third party — and simulated by nobody.

That wants a **path-addressed `Document`**
([document-store.md](../../subsystems/document-store.md)'s third tree):
kind-tagged, durable identity, no residency, no lifecycle cost.

⭐ **The record is the identity; embodiment is optional.** If a parent is
ever realized as an NPC, the Stuff points at the record — the record does
not become the NPC. So "realize her later" is **additive, not a
migration**, and the same person can be referenced by a chronicle entry,
a contract, and a wiki article without any of them caring whether she is
simulated.

⭐⭐ **This generalizes past parents.** An *unrealized person record* is a
primitive the world already needs — the dead, the absent, the historical,
the merely mentioned — and none of them have anywhere to live today.
Concretely: [chronicle.md](../../subsystems/chronicle.md)'s `who` field
is *"entity `templatePath` refs — **inert in v1**,"* and can currently
only point at things that exist as Stuff. **A person record is what makes
`who` mean something.**

### ⭐⭐ The consistency rule

> **Char-gen must not be able to say anything the world cannot later
> confirm.**

The failure this prevents is the standard one for games with rich
character creation: an elaborate creation screen, then you enter the
world and none of it is addressable. Everything you were told was set
dressing — which is worse than a thin char-gen, because it made a
promise.

⭐ And the useful half: **it bounds the schema.** If there is no in-world
way to ask about a field, that field does not belong on the card. The
record's contents are derived from what the world can answer, not from
what char-gen would enjoy saying.

**One record, many renderers, and none of them may invent:** the gallery
grid (choosing), the detail view (committing), the in-game kin/background
read (`chronicle` already renders bio + prologue + timeline; kin is the
natural fourth band), an NPC referring to your family, and the
author/CMS view. Different registers, one source.

### ⭐ It is a form, rendered two ways

The card is **structured underneath and presented above** — the same
split the platform makes everywhere (θ stored / bands shown, evidence
stored / position derived, genotype stored / phenotype expressed).

⭐⭐ **The grid is primary.** The player is comparing a gallery they can
reroll, so the surface must convey at a glance; nine paragraphs cannot be
held in the head, nine rows can. **Oxygen Not Included doesn't give you a
bio, it gives you a grid**, and for the same reason. Prose is for depth,
grids are for *choosing*.

That is not only a UI call — **it constrains the schema**: fixed columns,
**every household fills every slot**, values short and comparable, and
therefore a small field count (six to eight, not fifteen). Variable
richness moves to the detail view where it costs nothing. A rich
heterogeneous record would produce cards that cannot be compared at all.

⭐⭐ **The grid compares outcomes; the detail tells you who they were.**
This is what resolves the pair problem — two parents do not fit a row if
the row is about *people*. What the player is actually comparing is
**starting positions**, so the columns are the *child's* inheritance:

| column | what it is |
|---|---|
| **Trade** | what you grew up around → shapes the antecedents budget |
| **Place** | where you are from → where you start, who knows you |
| **Disposition** | 2–3 pole labels — **what the parents are**, not the child's starting position (`pronouncedFor`'s shape; see the note below) |
| **Knows** | a Discipline or two, banded |
| **Standing** | how the household is regarded, one word |
| **Means** | what they can give you — ⚠ a **type**, never an amount |
| ⭐ **Hook** | typed: a debt, a feud, a shop, a name owed |
| **Status** | living / gone — consequential either way |

One row per household. List-and-detail, because the grid serves the
decision and the detail serves the commitment.

⚠ **CORRECTED 2026-08-25 — the drill-in is stats too, not prose.** An
earlier revision said the detail view gives *"the prose that makes you
care."* It does not:

> **User: "a running game and an actual player doesn't want a novel.
> They want simple stats they can read through quickly and lock in and
> shuffle to find the combinations they're looking for, without giving
> them direct authorial control. It also makes sure pairings are
> balanced."**

⭐ **Four lines, not four paragraphs**: the two names, each parent's
trade and faith, the hook's actual target (*counting-house: Vale &
Sons*), and which one is gone. Prose slows the shuffle to a crawl, and
the shuffle is the mechanic — procgen-over-picking exists so you *don't*
author your background.

⭐⭐ And the second half of that quote is the load-bearing one: **prose
cannot be balanced; a stat block can.** Everything in *The balance
mechanism* below is only possible because every cell is a drawn value
from a closed vocabulary.

### ⭐ Say what the PARENTS are — never label it the child's position

*(Correction, 2026-08-25, from the [narration-slate](./narration-slate.md)
cross-check. The column stays; one phrase goes.)*

An earlier revision of the row above read *"2–3 pole labels → **your
equilibrium**."* That phrasing — not the column — is the problem, and it
is the only part of this screen that hands the player a readout of
themselves.

**Showing the parents' dispositions is fine, and is arguably the best-
founded measurement on the card:**

> ⭐⭐ **Children read their parents better than parents read
> themselves.** Highest-exposure observers, over a lifetime, with no
> stake in the answer. That is the direction the self–other asymmetry
> actually runs — so a child knowing the household is the *strong* case,
> not a leak.

And it is not the child's derivation. *Acts, never axes* protects **your
own position**; your mother's is not yours. Knowing you were raised by
guarded people is an ordinary thing to know — what people are poor at is
knowing **what they became**. ⭐ **That gap is exactly what the
practitioner examines, and it survives with the parents fully legible.**

⚠ Two further reasons the stat-sheet worry does not land here:

- **A roster is complete; this is a highlight.** The column shows
  deviations from the mean — whatever the generator weights as notable —
  which is already `pronouncedFor`'s shape, not a sheet.
- **It is confirmable.** People who knew the household have impressions,
  so the field passes the consistency rule after all. (An earlier draft
  of this correction claimed it failed; that was wrong.)

⭐ **A convergence worth noting:** weighting generator output by
deviation-from-mean is the same principle as
[trait-slate](./trait-slate.md)'s `expressed = equilibrium + deviation`
and `measurement.md` Part 6's *"announce the surprising, not the every."*
**The deviation is the story** arrived here independently, which is
usually a sign it is right.

⭐ **Closed vocabularies are why this is buildable.** ONI's grid works
because its traits are a small icon set; ours would work for the same
reason and we already have it — 17 disposition axes, a finite Discipline
catalogue, a finite locality tree, and a hook vocabulary that has to be
typed anyway. Nothing here needs a new vocabulary to render as icons.

### ⚠ The hook must be typed, or it is decoration

The hook is the field other systems are meant to consume. A debt is
contract-shaped; a feud is a relationship between two person records; a
shop is a place with an address.

**Prose cannot be acted on** — and a hook the world can never act on is
exactly the empty promise the consistency rule exists to prevent. Typed,
it is a quest seed, a contract, a relationship edge, or a property claim,
all of which already have machinery.

#### ⭐⭐ `Hook` is two columns wearing one hat

`debt` · `feud` · `missing` are **obligations**. `holding` · `favour` ·
`apprenticeship` are **openings**. They share one slot, so a card can
draw all-cost — which is exactly how the *forager · herdsman* card in
the worked gallery ended up reading as a punishment.

> **The fix uses structure already present: one hook per parent, and the
> pair may never be two obligations.**

Column count unchanged, and it is diegetic — each parent brings their
own entanglement.

#### ⭐⭐⭐ An obligation is inherited as REGARD, never as a liability

> **User: "we obviously don't want to saddle the player with debt when
> they start."**

Correct, and the design already answers it: **the parents are person
records with their own existence, so the debt is Wen's, not yours.** A
hook is a fact about your *family*.

What you inherit is the **relationship** — a `REGARD` row on the
counting-house teller pointed at you, starting negative. That is
existing machinery: per-viewer regard on the NPC's `BeliefStore`, keyed
to your `templatePath`, and `TraitApi.regardBaseline` supplies a
baseline only when no row exists. Seeding one is a single write.

> ⭐⭐ **An obligation hook costs regard and access, never money.**

Onboarding-safe — nobody duns a new character — and better than a
starting balance: you begin with someone who has a reason to be cool
with you, and **paying your father's note becomes a goal you may opt
into**, never a burden you were handed. Same for `feud`: a hostile edge,
not a debuff.

⭐ The weight table below is unchanged by this. Obligations still debit;
they debit the **social** column instead of the ledger.

### ⚠ Comparable means optimizable — and why that is survivable

A grid is an invitation to solve. ONI players reroll for good duplicants;
it is a known time sink.

⭐ **The grid is safe precisely because the columns are incomparable.**
Trade vs place vs disposition vs hook share no scale, so even with
perfect information there is **no total order** — no best household, only
ones that fit different intentions. In ONI traits carry plus and minus
signs and players compute a score; if ours never can, the grid *informs*
the choice without *solving* it. Rerolls being priced against starting
capital does the rest.

This is the incomparability doctrine finally doing load-bearing work
rather than sitting in a design document.

### ⭐⭐ The balance mechanism — internal weight, visible kinds

The incomparability doctrine says no card is better. Left alone, that is
aspiration rather than a property: `both gone` + `rough` + `feud` is
plainly a heavier card than `steady` + `coin`, and a gallery with good
and bad families turns the shuffle into a hunt for the good ones.

The resolution is the firewall the platform uses everywhere else:

> ⭐⭐⭐ **The generator balances on an internal scalar. The card shows
> only kinds.**

The player cannot compute it — `Means` is a type and never an amount,
hooks are not scored, `Standing` is one word — so there is **no total
order to solve**, and simultaneously **no card that is simply worse.**
Exactly `theta` stored / bands shown, one level up.

⭐ It is also what makes the generator *testable*: net-weight variance
over ten thousand draws is an assertion you can write. You could never
write it against prose.

⚠ **The numbers below are placeholders.** Structure is the deliverable;
calibration waits on a running game, the same posture `Competence` takes
with its BKT constants.

**Means** — asset only

| | | | |
|---|---|---|---|
| `nothing` 0 | `tools` +1 | `stock` +1 | `a name` +2 |
| `credential` +2 | `coin` +2 | `land-share` +3 | |

**Hook** — split by direction (§ *Hook is two columns*)

| obligations | | openings | |
|---|---|---|---|
| `debt` −2 | `feud` −2 | `apprenticeship` +2 | `holding` +2 |
| `missing` −1 | | `favour` +1 | |

**Standing** — `respected` +2 · `steady` 0 · `rough` −1 · `reduced` −2 ·
`notorious` −1 ⭐ (*mixed, not merely low — notorious is high renown with
negative regard, which is different in kind from `rough`*)

**Status** — `living` +1 · `one gone` 0 · `both gone` −1 **+ a Means
upgrade** (below)

**Knows** — +1 per Discipline at `novice`, +2 at `competent`

**Raised** — **0, always.**

> ⚠⚠ **The disposition column must weigh zero**, or the generator has
> **priced personality** — and every argument in this project against
> ranked traits collapses at the one screen where they are most visible.

**Target:** net ≈ 0, ±1 — wide internal variance, narrow net.

#### ⭐⭐ `both gone` carries the estate

Two dead parents means you inherited. As a bare liability it is both
unbalanced *and wrong*: there is nobody else holding the tools, the
herd, or the plot.

**Couple it — `both gone` upgrades Means.** Not a balance patch; it is
what actually happens. The *forager · herdsman* card stops being the
punishment card because it hands you the animals.

#### ⭐ One scalar hides one thing: liquidity

`coin` and `land-share` both weigh high and are not interchangeable —
coin is liquid with a low ceiling, land illiquid with the highest
ceiling in the game. Balance the net and a gallery could still show nine
liquid cards.

So the generator needs **a second, non-scalar constraint on the visible
page**: every gallery spans both liquid and illiquid Means, and more
than one trade family. **Net weight makes cards fair; page composition
makes the shuffle worth doing.**

### Two constraints on generation

⚠ **The pair must read as a plausible household.** Two parents whose
localities and trades make no sense together break immersion faster than
any stat ever could. This is the real procgen constraint, and it is
harder than generating either parent alone.

**Sibling collisions are a procgen quality problem, not a design
problem.** Two players landing the same household should be rare enough
to be a curiosity; the answer is a large enough generative space, not a
claiming mechanic. Cards are **not** consumed on selection — that would
make the gallery a scarce resource and hand early players the good
families.

### ⚠ Truth vs belief — flagged, not built

The card tells the *player* things. Whether the *character* knows them is
a separate question: you know your own mother, but you do not know your
blood type and you may be wrong about your father's standing or his
debts.

So the record has a **truth face and a belief face**, and the belief
store already models exactly that divergence. It is a good story engine
(*he was not who you thought*) and an excellent way to make char-gen feel
like a bait-and-switch if handled carelessly. The seam exists; v1 should
not build on it.

### Controls — ⭐⭐ ONE mechanic: the pin. Filters retire.

An earlier revision listed **filters** ("on the legible axes — locality,
trade, species") *alongside* pinning. Those are the same act:

> ⚠ *"Filter to Terminus"* and *"pin `Place: Terminus`"* do identical
> work. With filters free and pins priced (§ *the price escalates*), the
> escalating cost is meaningless — nobody would ever pay to pin what the
> control beside it narrows for nothing.

> **User: "I didn't realize filters were still a thing. I thought pins
> replaced them. You're right it doesn't make sense to have both."**

**They do.** One dial: *how far have you constrained the draw, and what
does the next roll cost?* A filter was only ever **a pin set before you
had seen a card** — which § *no pin menu* forbids anyway.

#### ⭐⭐⭐ The rule that sorts this out

> **Narrowing the pool is a pin, and it is priced. Reordering the pool
> is free.**

Because a sort **removes nothing**. Every household is still reachable;
you simply meet the relevant part of the pool first. That is not a
constraint and needs no price.

#### ⭐ Which is how aspiration survives — as a SORT, not a filter

*"I mean to be a medic"* now **biases the ordering**: medic-plausible
households come up first, and nothing is locked away. The declaration
still does its onboarding job — a new player who names an intent meets
relevant families on page one — while the pool stays whole and free.

⭐⭐ This is strictly better than the filter version it replaces. A
filter would have hidden households a player might have preferred once
they saw them; a sort cannot.

#### The surviving controls

- **Lock one, reroll the other.** Keep the mother, spin fathers — the
  original form of the pin, and the reason the pin is cheap to build.
- **Pin any position cell you can see**, at the escalating price.
- **Sort by aspiration**, free.
- ⚠ **No filters, and no pin menu.** Both are ways of choosing a value
  you have not been shown, which is the direct-authorial-control failure
  the whole gallery exists to avoid.

#### ⭐ Consequence: species is PINNABLE, and priced

§ *Species — decision A* demotes species to *"a gallery filter, not a
char-gen field."* With filters retired, species is a **pin** — you can
have it, and it costs like anything else.

That resolves the open worry about whether making species selectable
undoes *"the lineage settles what you are"*: **it holds for everyone who
does not spend on it**, and the players who arrive wanting to be an elf
can buy it. ⚠ It also **retires a suggestion floated during this
conversation** — that species be moved to the *unpinnable identity* side
— which would have been a real product regression for no gain now that
the price does the work.

### Reroll is priced, not capped — and the price ESCALATES with pins

You cannot charge money to a character who does not exist yet — so
charge it to the **starting-capital allotment**. Each reroll spends from
the same pool you would otherwise bank.

⭐ No arbitrary cap, no scarcity theater: being picky costs, the way it
does everywhere else.

#### ⚠ The disconnect reset — real, and NOT fatal

The `EnrollmentDraft` is *"a **transient, never-persisted** scratch
object"* on `Login`
([char-gen.md](../../subsystems/char-gen.md)) — deliberately, since it
is what makes *"an abandoned or disconnected char-gen leaves no playable
character and no orphaned template"* true. So a player can disconnect
and restart with a fresh allotment, and no pricing scheme can stop them.

⚠⚠ **An earlier revision of this section concluded from that the price
was worthless — "a tax on players who do not know to reconnect," worse
than no price at all. That was wrong**, on two counts.

**First, the reset is not free, because the draft is transient in
*both* directions:**

> ⭐⭐ **Disconnecting loses your pins too.** The farmer does not get a
> fresh budget — they get a fresh **blank**. Four pins found means four
> pins to find again. That is a genuine trade of accumulated progress
> for allotment, not a free reset.

**Second, the standard was wrong.** The price never had to be a wall:

> **User: "you're not going to prevent people from disconnecting for a
> new pool, but you can tax doing that if you want to discourage it…
> just give people enough zorkmids for maybe a standard deviation or two
> from the norm and most people are gonna be happy with the results. If
> someone really wants to min-max, they can write their Selenium scripts
> to create characters until they get a perfect match — I'm not going to
> try and stop them."**

⚠ Condemning a mechanic because a determined player can defeat it is a
recurring error in this project's design conversations — *"it is
gameable"* is almost never decisive. **A discouragement is a legitimate
design object.**

#### ⭐⭐ The price escalates with the pin count

The dial that makes the whole screen self-limiting:

> ⭐⭐⭐ **A reroll costs more the more cells you have pinned** —
> superlinear, so the first pin is cheap and the fourth is punitive.

Consequences, none of them a tuned cap:

- **Pinning stops being free**, so each pin is a **priced decision**
  rather than a ratchet. The player is always spending to narrow.
- **The allotment lands most players at two or three pins by itself** —
  the *standard deviation or two* falls out of the curve rather than
  being legislated.
- ⭐ It removes the need for a visible pool counter or any other
  "you have narrowed too far" gadget. The cost says it.

⚠ **The old card is discarded on reroll, by design.** *"If they wanted
to keep something they could have pinned it — that's the mechanic; if
they do the cost/benefit and decide not to, that's on them."* Nothing is
ever lost by accident, because a reroll is a deliberate act taken
**after** the chance to pin. Holding candidates would turn the gallery
into a comparison shop, which is the character-sheet-with-extra-steps
failure the pin exists to avoid.

#### ⭐⭐⭐ Some cells are UNPINNABLE — the rule that saves the whole screen

If every cell is pinnable, the player converges on a fully-specified
character and the randomness is pure friction.

> **User: "some things should be unpinnable, like name. This makes it
> feel like you're actually drawing a new character each roll instead of
> character-sheet-with-extra-steps."**

The line:

> ⭐⭐⭐ **You may pin what you are shopping for. You may not pin who
> they are.**

| pinnable — *position* | never pinnable — *identity* |
|---|---|
| trade · place · means · hook · standing · knows | **the names** · the two people themselves |

That maps onto what the card already is: § *It is a form, rendered two
ways* says the columns are **the child's inheritance**, i.e. a starting
position. **Names are not a position; they are the people.**

⭐⭐ **And it is what keeps a narrow pool from ever *reading* as
exhausted.** Two cards with identical pinned position are still visibly
different families, because the names and the parents are redrawn every
time. Even at four pins the gallery never shows nine identical rows —
and the last roll never feels like a confirmation dialog.

#### ⚠⚠ …but household `Means` must never finance the shuffle

> **User: "rerolls cost zorkmids, so the more you personalize the less
> money you start with. That's just coin — but some of these other
> things probably have the same issue."**

The leak is real and it is narrow. If a household's `coin` fed the same
pool rerolls are priced against, then **rerolling to find a `coin`
household finances its own search** — a degenerate loop, and it makes
`coin` strictly best as the only Means convertible into more shuffling.
Incomparability breaks at the root.

One rule closes it:

> ⭐⭐ **Char-gen has exactly one currency — the uniform allotment — and
> it buys exactly three things: body/faculty, banked capital, rerolls.
> Household `Means` is inventory, not currency.**

**Nothing a household gives you is spendable before you exist.** `coin`
arrives *with* you.

Checking the rest of the vocabulary for the same leak: `land-share`,
`tools` and `stock` all convert to money eventually, but only **in-world**,
where that is simply the economy working — they cannot finance the
shuffle because the shuffle is over by then. `a name` and `credential`
never convert. So the leak is `coin`-only, and it is closed by naming
which pool rerolls draw from.

⭐ Worth noting the cost: this makes `coin` the **least exciting** Means
— "you start with some money," liquid and low-ceiling. That is fine, and
probably correct. It is the option for a player who does not want the
household deciding anything for them.

---

## ⭐ One budget, three sinks

Everyone gets the same budget. It goes to **body/faculty**, **starting
capital**, or **patience** (rerolls) — all three priced against each
other, none of them a designer's balance number.

### Body: composition, not magnitude

A single mass slider is a stat. **Fat / muscle / bone at one mass** is a
body:

- **fat** — thermal insulation, energy reserve, famine tolerance
- **muscle** — force, and a markedly higher metabolic burn
- **bone** — fracture resistance, and dead weight

Same total, completely different creature, and no ranking between them.
Incomparability in the species slate's sense, applied *within* a
character.

### ⭐⭐ The world already charges

The reason this does not need invented drawbacks:

| choice | who charges for it |
|---|---|
| more mass | [metabolism](../../subsystems/metabolism.md) — more food, a real economic cost |
| more mass | [thermal](../../subsystems/thermal.md) — Newton cooling; better in cold, worse in heat |
| more mass | [encumbrance](../../subsystems/encumbrance.md), [respiration](../../subsystems/respiration.md) |
| more mass | [vitals](../../subsystems/vitals.md) — more `bloodVolume`, so **you survive a bleed longer** |
| stature | ranged bands, tight spaces, concealment, heat dissipation |

None of those are balance numbers. They are consequences, and players can
smell the difference.

⭐ **And the optimum has to depend on the life.** A high-mass, high-fat
body is excellent in the cold Delve and miserable in a hot biome. A wiki
can tell you the best body *for a given life*; it cannot tell you what
your life will be. **The allocation is a claim about how you intend to
live** — and you can be wrong.

⭐ **The body is public.** Perception and the belief store already
describe characters to each other, so the allocation is a *social fact*,
not a private optimization. People minmax numbers freely; they do not
minmax their appearance in front of others nearly as freely.

**The structural cap:** you can buy a body; you can never buy a
competence. Everything that decides most encounters — competence bands,
gambits, tools, positioning — is earned from evidence and unpurchasable.
Even a perfectly solved body is a modest edge on a substrate, which is
what makes it safe to be generous with the budget.

### Faculty: the mental category already exists

`Species.facultyProfile` is `{depth, serenity, composure}` — an
anatomical casting faculty, species-declared, three bands; mana is a
`Reserve` whose capacity derives from `depth`. So the question is not
"invent mental attributes," it is **does the player move within the
species range**, exactly as with body composition.

⚠ **Faculty must stay capacity, never access.** Per-spell access is a
band gate at cast time on both grid axes — *competence IS access*. If a
configured `depth` ever gated which spells you can cast, you would have
bought progression.

⚠ **Mental capacity is closer to a pure ranking than physical capacity
is**, because nothing obviously charges for it. The clean answer is that
it **shares the one budget with the body** — arcane capacity costs you
tissue — so incomparability lives at the budget level and no drawback
needs inventing.

> Worth checking: `composure` is both a faculty band *and* a trait axis
> (Calm/Wrathful). If that is a deliberate coupling — derived temperament
> modulating innate faculty — it is lovely. If it is a name collision it
> will confuse authors.

### ⭐ Capital: the counter-cyclical pin

Unspent budget banks as **starting capital**. Starting cash already
exists, so this changes an existing faucet's variance, not its category.

⚠ If the conversion floats *with* the money supply you get a feedback
loop: money abundant → points buy more money → more money enters → worse.

⭐ **Invert it and it becomes an automatic stabilizer.** High supply →
points buy *less* cash → new characters take body instead. Scarce money →
points buy more → new characters arrive capitalized. The char-gen faucet
becomes counter-cyclical, run by nothing but the conversion table.
`bank_supply` is already tracked, so the input exists.

It is also the most teachable thing in char-gen: the player who notices
starting cash was better last month has discovered monetary policy
without being taught it.

⚠ Cap per account, and give guests nothing — otherwise registration is a
mint.

---

## Species — decision A: no hybrids

Sixteen `Homo` species ship, of which two — `semieldarinus` (half-elf)
and `semiorcus` (half-orc) — are **hybrids modeled as species rows.**

**The taxonomy is not the problem.** Congeneric hybridization is real:
*H. sapiens* × *H. neanderthalensis* produced fertile offspring, and
non-African humans carry roughly 1–2% Neanderthal ancestry today.

⚠ **A hybrid is not a species** is the problem. A binomial asserts a
population that **breeds true**, which is the one thing a hybrid
definitionally isn't. Symptoms: half-elf × half-elf yields another
`semieldarinus`; half-elf × elf has no row and never can; and sixteen
species is **120 pairs, of which two are authored.**

### Why blending was rejected

The tempting fix — derive hybrids from parent pairs, the way materials
derive blends — **breaks against the direction the species slate is
going.** `innateMixins: ["CasterMixin"]` is already a *capability list*,
not a number: union it and every hybrid strictly dominates, intersect it
and every hybrid is strictly worse. Specials, vocation affinities, and
"where you can go" differences are discrete by nature. **Half a gill is
nothing.**

Building blend machinery now would also pressure species to *stay*
numeric — letting the implementation constrain the design.

### The decision

**A. No hybrids.** Species stay discrete and get maximally distinct. The
gallery offers **same-species parents**. Mixed heritage, if it ever
returns, is narrative and social — never a blended stat line.

Consequences:

- ⭐ **Species becomes a gallery constraint, not a char-gen field** —
  the same demotion aspiration gets. *(Written as "filter"; filters were
  since retired into the one pin mechanic — § Controls. Species is a
  **priced pin**, which preserves the demotion for anyone who does not
  spend on it.)* You say "elf" and get elf-heavy
  households; the lineage settles what you are.
- ⚠ **Store the parent species anyway.** Redundant today, since both
  match. It makes a future mixed-parentage option a *content* change to
  the generator rather than a schema migration. Cheapest insurance in the
  design.
- **Retire the two hybrid rows** — see the migration note below.

> **Considered and not taken:** the gallery showing *mixed-species
> parents with a single-species child* (you are human; your mother was an
> elf). It costs nothing mechanically and preserves the
> belonging-nowhere fiction, which is the most cited reason players want
> half-elves. Recorded here because the door is one generator constraint
> wide, and reopening it requires no engine work — **provided the parent
> species is stored.**

### ⭐⭐⭐ Adoption — the two roles come apart

*(Added 2026-08-25.)* The door left open above — *mixed-species parents
with a single-species child, "the door is one generator constraint
wide"* — has a better key than the one considered.

> **User: "adopted parents is the only way you're gonna get
> mixed-species lineage."**

Correct under decision A, and the schema needs **nothing new**, because
the split already exists:

> **Genotype is inherited. Disposition is learned from.**

| role | supplies |
|---|---|
| **birth** | species, appearance, blood — the endowed axis |
| **raising** | disposition, transcript, trade, place, standing, means, hooks, usually the name |

⭐⭐ **Adoption is not a special case. It is the general case with the
two roles unbound** — normally one household fills both. The *"store the
parent species anyway, cheapest insurance in the design"* note above is
exactly the field this uses.

#### Display: the raising household in the grid; birth lineage rides the cells

Doubling every row to carry two households doubles the scan cost for a
minority case. Don't.

⭐ **Show the raising household. Species and appearance are already
cells — and on an adoption card they simply do not match the
household.** *`smith · shopkeeper | Terminus | Species: khazadicus`*
with two human parents reads as adoption at a glance, without the card
ever using the word. Drill-in names the birth parents, or says unknown.

⭐ An unknown birth parent needs no new mechanic: **`missing` is already
in the hook vocabulary**, defined as *"an unresolved person record."*
This is its best instance, and it turns the hook into a real quest seed
rather than decoration.

#### ⭐⭐ Why this beats the shelved option

The recorded *considered-and-not-taken* was mixed-species **parents** —
*you are human; your mother was an elf*. That smuggles the hybrid
problem back at the fiction layer: **if an elf and a human had you, what
are you?** The entire no-hybrids decision exists because that question
has no honest answer.

> **Adoption deletes the biology instead of finessing it.** A
> `khazadicus` raised by human shopkeepers makes no genetic claim
> whatsoever.

You get the **belonging-nowhere fiction** — the most-cited reason
players want half-elves — at zero taxonomy cost, and the breeding
question never arises.

#### ⚠ It is a constraint you BUY, never a checkbox or a mode

A toggle undoes the species demotion instantly: anyone wanting species X
with household Y takes it, adoption becomes the norm, and species is a
free field again with extra steps.

⭐ Instead, *adopted* is **a constraint on the draw, priced on the same
escalating curve as any other** (§ *the price escalates with the pin
count*). Wanting an adopted `khazadicus` raised in Terminus is three
constraints, and the third one hurts. **That is the whole
discouragement: not a rule against it, a cost for it.**

⚠ Note it is not a *cell* — there is no `Adopted:` column to hold across
draws. It constrains the **shape** of the card, which is exactly what a
filter used to be for; § *Controls* retires that distinction, so a shape
constraint and a value constraint ride one dial and one price.

#### ⭐⭐ Never a mode you "drop into"

**Adoption cards simply appear in the normal gallery, already split.**
You take one or you do not. No flag, no branch, no second flow — the
split is a property of the card, not a state of the UI.

That is also what *a draw, not a checkbox* requires: if it is a draw,
there is nothing to enter. ⭐ And it answers the new-user worry
directly — **a player who never rolls one never learns the feature
exists, and loses nothing.**

#### ⭐⭐⭐ The split is PER-SLOT, not per-card

The shapes are a **count on one axis**, not three cases to author. Each
*raising slot* carries one flag: **did this person also contribute your
biology?**

| | biology | raised you |
|---|---|---|
| ordinary parent | ✅ | ✅ |
| adoptive / step parent | ❌ | ✅ |
| absent birth parent | ✅ | ❌ |

| both raisers biological | **0 blanks** | ordinary |
| one raiser biological | **1 blank** | ⭐ step / blended — *you know half your biology* |
| neither | **2 blanks** | full adoption |

> **User: "I'm just thinking what it means to draw a split father card
> and a singleton mother card. Or do both need to be split for your
> thing to work?"**

**Neither needs the other, and the asymmetric one is the better card.**
A split father with a singleton mother is the **step family**: you have
your mother's whole life and your father's whole body, and neither of
the other halves. That is the sharpest form of *you carry a body you
cannot explain and a life you did not inherit.*

⭐ And you are not selecting two people. **You take the household** (§
*the grid compares outcomes*); a blank is a consequence of the household
you took, not a second choice you make.

#### The blank has THREE states, and belief already models them

> **User: "stepparents… is a little different because you usually know
> your birth parent."**

Exactly — so the absent half is not binary:

| state | you have |
|---|---|
| **unknown** | no record you can reach |
| **known of** | a name, not a life |
| **known** | the full record |

⭐⭐ That is `BeliefStore`'s recognized-vs-identified dissociation —
[belief.md](../../subsystems/belief.md)'s own *"the stranger you keep
seeing"* — pointed at someone you have never met. **Nothing new to
build**, and the step case and the full-adoption case become one reveal
mechanic entered at two different starting points. The record is
authored and stashed; what changes on discovery is your **belief row**,
not the record.

#### Body / life, not genotype / phenotype

⚠ A terminology correction that sharpens the split. *"Phenotype from the
adoptive parents"* cannot work: § *decision A* has **genotype stored,
phenotype derives** — both halves of that pair come from birth. What the
raising household supplies is a **third** thing.

| birth parents | raising household |
|---|---|
| species, appearance, blood — and everything deriving from them | disposition, competence, trade, place, standing, means, hooks, name |

Which makes the unknown halves symmetric, and gives the whole feature
its line: **you carry a body you cannot explain and a life you did not
inherit.**

#### ⭐⭐⭐ Where the game states its opinion on nature vs nurture

> **User: "there's a lot of mystery here still in terms of what we know
> to be nature vs nurture and the game is going to have some opinion on
> that. I'd prefer to confront that head on."**

The mechanics have already committed, and the position is unusually
strong:

| axis | source | mutable |
|---|---|---|
| species · appearance · blood | birth | never |
| disposition | upbringing (claim evidence) | yes — decays, and deeds overwrite |
| competence | upbringing + your own deeds | yes, and never decays |
| position | upbringing | entirely |

> ⭐⭐ **Nature fixes what you ARE. Nurture sets where you START.
> Everything that decides what you DO is earned.**

And the sharp edge: **nature contributes nothing to capability.** No
inherited stat, no inherited disposition, no inherited skill. Species
confers capabilities, but those are *species*, not *parentage* — every
member has them. So the game asserts **biology is not destiny, and not
even advantage**, which is an unusual position for the genre and is
already fully implemented.

> ⭐⭐⭐ **Adoption is what makes that observable instead of asserted.**
> Find your birth mother, learn she was famously wrathful — **and your
> trait ledger does not move.** Not because a rule forbids it, but
> because disposition is seeded by the household that raised you and
> hers was never in your evidence.

The game *demonstrates* its position rather than claiming it — the
[measurement](../../measurement.md) doctrine's *property, not promise*,
applied to nature versus nurture. It is the best pedagogical object in
this whole area.

#### ⚠ The one guardrail: the reveal must not PAY

If finding your birth parents unlocks something mechanically valuable,
adoption becomes a delayed-gratification power path and everyone hunts
it. Under the thesis above it **cannot** pay in capability — but it can
pay in **position**, since a found parent may surface a hook. That is
legitimate **only if the hook is weighted in the balance table like any
other**, never as a bonus for having taken the interesting card.

#### One line on handling

Adopted-ness carries **no mechanical deficit**, and `missing` should
read as a thread to pull rather than a wound. It is a starting position
like any other — which is also what keeps it from becoming the sad card
nobody picks.

### ⚠ Traits from lineage are upbringing, not genes

*"You are greedy because your father was"* is exactly the essentialism
[species-slate](./species-slate.md) fights — and it costs nothing to
avoid, because the trait ledger is already **evidence**-shaped. A seeded
disposition claim reads as *things that happened in that household*.

> **Genotype is inherited. Disposition is learned from.** Same card, two
> mechanisms.

⭐ Under [trait-slate](./trait-slate.md)'s two-value model this acquires a
precise meaning: **seeded claims set your `equilibrium`; your own acts
drive `expressed`.** So the family choice is a permanent baseline rather
than a permanent verdict — sustained contrary behavior moves equilibrium
eventually, and **you can grow out of your upbringing, slowly.** That is
the property an inescapable species field could never have.

#### ⭐⭐ Disposition correlates with CIRCUMSTANCE, never with the trade

The generator has to draw the `Raised` column from *something* or it
reads as noise stapled to a family. It must not be the trade — *"delvers
are guarded"* is the same essentialism one axis over, and
[trade-roster-slate](./trade-roster-slate.md) already bans the identical
move on faith (*"if a player can conclude 'delvers are Cernunnos,' we
have built essentialism"*).

> ⭐ **Draw it from `Standing`, `Status` and the hooks — the household's
> story, not its job.**

A `reduced` household carrying a `debt` plausibly raised you guarded. A
`both gone` household plausibly raised you self-reliant. That is
*hardship shapes people*, which is true and teachable — not *smiths are
a personality type*, which is neither. It is also what makes two
smallholder cards feel like different families.

#### ⚠⚠ What adopting a household actually WRITES — the seeding surface

Three evidence ledgers, all three carrying a `kind: 'deed' | 'claim'`
row discriminator. **The seeding surface is one third built:**

| ledger | seeder | wired to char-gen |
|---|---|---|
| `chronicles` | ✅ `ChronicleApi.seedClaims(owner, {text, order}[])` | ✅ `EnrollController:753` |
| `disposition_events` | ✅ `TraitApi.seedClaims(owner, {disposition, valence}[])` — ⚠ needs a `when` (below) | ❌ NPCs only (`Behaved._seedDispositions`) |
| `transcripts` | ❌ **missing** | ❌ |

⚠ And the one wired third is fed from `aspiration?.claimSeeds` — **the
field this slate retires.** The only live char-gen seeding path hangs
off the thing being replaced.

`TranscriptEntry.kind` already declares `claim` ("*a study / LMS
attestation… no consumer mints claims this increment*"), so the row
supports it and only the seeder is absent.

##### ⭐ Advancement's seeder is shaped differently from the other two

Trait and chronicle seeds are near-copies of their deed rows. A
Transcript row cannot be, because `Competence.derive` **folds** rows
through a Bayesian update — nobody can author *"grew up around a forge"*
as seven rows at difficulty `hard`, outcome `success`.

The authoring unit is a **band**, which is what the roster already
speaks (*"`Knows` band comes from the household"*):

> ⭐⭐ **`AdvancementApi.seedClaims(owner, [{discipline, band}])` is a
> band-to-evidence synthesizer, not a row appender.**

The only place in the platform an estimator runs backwards — which
deserves the flag, but is sound: the rows stay honest evidence, and a
later re-tune re-scores seeded history exactly like everyone else's.

⚠ **The card's `Knows` band is the CHILD's**, not the parent's. Wen is
better at the forge than you are.

##### ⭐⭐⭐ The `when` on a seeded claim — ⚠ DIAGNOSED, NOT FIXED

⚠ **An earlier revision of this section said the opposite and was wrong.**
It claimed seeded claims never decayed. They do — `buildAndSave` sets
`entry.when = fields.when ?? WorldClockApi.getNow().rawValue()` for
**every kind**, and `seedClaims` passes no `when`, so a seed is written
*dated at seed time* and then ages on the 180-game-day half-life like any
deed.

Which inverts which half is broken:

- **The player half is already correct.** A dated upbringing seed fades,
  which is exactly *"you can grow out of your upbringing, slowly."*
- ⚠⚠ **The NPC half is a live bug.** `Behaved._seedDispositions` is
  idempotent — it skips if any `claim` row exists — so nothing ever
  refreshes an authored NPC. **Sloane's authored character fades and
  never comes back.** Every trait test passes throughout, because they
  derive at a fixed `now`.

**The proposed fix** — specified here, deliberately not built, since the
trait ledger has no player-side writer for it to serve yet:

Default `when` **by kind**, matching the sibling ledger (a chronicle
`claim` is likewise always `when: null`):

| kind | default `when` | effect |
|---|---|---|
| `deed` | the clock | an event is always located in time |
| `claim` | **`null`** — timeless | `now - (when ?? now) === 0` ⇒ full weight forever |

…and give `ClaimSeed` an optional `when`, forwarded verbatim, honouring an
**explicit null** (`!== undefined`, not `??`).

⭐ **The design conclusion holds either way, and it is the reason to want
the parameter:**

> **Presence of `when` is the switch between an authored character and a
> lived one.** An NPC omits it and never fades; a char-gen upbringing seed
> dates it birth-relative and ages.

⭐ A property worth keeping: `Competence` has **no decay term** and the
trait estimator does. So a decade on you still know a forge and you are
no longer especially paranoid. **What you were raised *doing* is
permanent; who you were raised to *be* is outgrowable.** Two estimators
built separately, and that fell out of them.

##### The valence dial

Mass thresholds are `defined` ≥ 20, `entrenched` ≥ 60, and mass is
`Σ |valence| · decay`. So a single seed row at 55 lands `defined`; at 70
it lands `entrenched`. **The generator picking a valence is picking how
*fixed* your upbringing made you**, and 60 is the line between *this is
how I was raised* and *this is who I am*. A good dial, and it already
exists.

### The migration

`semieldarinus` and `semiorcus` are **shipped, playable roster entries in
a content pack**, and the seeder is insert-only — editing the rows does
nothing.

⭐ **Unlist before you delete.** Removing them from the char-gen roster
is a config change that stops new half-elves immediately at near-zero
risk. Deleting the `Species` rows is a separate migration with live
characters possibly holding those class refs, and can happen on its own
schedule. See [species-expansion-slate](../tails/species-expansion-slate.md).

---

## Age, aging, and healthspan

Entering on your majority day means the character **has an age**, which
raises the question of what happens to it.

### The slot exists and is inert

`OrganismMixin` already carries `age: number`. `Species` already carries
`lifespanMin` / `lifespanMax` (human 120, half-elf 180, dwarf 400, elf
750). `vitals.md` says the vital profile *"reserves room for a later
age-curve."*

Nothing writes any of it — char-gen's fields are species, sex, name,
pronouns, aspiration. **Age is a declared field that nothing sets and
nothing reads.** Setting an entry age is mostly a matter of finally using
what is there.

### The birthday

A majority day means a **recurring** date, and the world has a clock and
a calendar. That buys a personal, zero-content occasion: a chronicle
beat, an aging tick, and — best — **a reason for the people who know you
to reach out.** *Your mother sent word.* A retention hook that is not a
login bonus, for the price of one date field.

⚠ Its entire value depends on **clock scale.** If a game year passes in a
real week, birthdays are weekly and mean nothing; if a game year is a
real month or more, it is an occasion. Settle the scale before building
anything on the date.

### ⚠⚠ Do not let lifespan bound the player

The trap, and it arrives through a field that already exists and looks
harmless:

> **If aging is real *and* terminal, lifespan becomes the most rankable
> stat in the game.**

An elf gets 750 years of play; a human gets 120. Single scale, strictly
ordered, and **no countervailing cost can exist** — you cannot make "more
playtime" incomparable with "less playtime." It would be the cleanest
violation of the [species slate](./species-slate.md)'s doctrine anywhere
in the design.

**So lifespan describes the world, not the player.** Keep it for NPC
generations, family trees, and *elves remember the founding*. Never put a
clock on a player character.

### ⭐⭐ Healthspan, not lifespan

The model that keeps everything and punishes nobody:

- **Aging is real and brings decline** — the age curve `vitals.md`
  already reserves room for
- **Aging is never terminal for a player character.** You do not lose a
  character to the calendar, ever
- **Longevity work restores vigor, not existence**

The stakes become *quality of life* rather than survival. A longevity
industry still has demand, the distributional politics still bite, and a
player who never touches magic or technology simply plays an **older**
character rather than a deleted one.

It is also the accurate framing: **healthspan vs lifespan is the real
term of art in gerontology**, and life-extension research is
overwhelmingly about the former. The reality-seeded choice and the
player-friendly choice are the same one.

⭐ **Check `reembody` first.** [mortality.md](../../subsystems/mortality.md)
already ships the dying arc, the shade, and `reembody` over the `passage`
floor, and `lifecycleStates: ["alive", "dead", "undead"]` is authored on
the species rows. Death may already not be terminal — in which case
"aged out, start over" was never the real failure mode, and the urgency
behind any longevity exemption drops considerably.

### The longevity industry — noted, not designed

If aging brings decline, something sells the cure, and that is a build of
its own spanning vitals, magic, crafting, and civics. Four things worth
recording now so it is not designed by accident:

- **⚠ Several independent routes, or the ranking just moves.** If
  longevity is bought with magic competence alone, magic becomes the
  meta-stat and everyone becomes a caster or declines. Arcane,
  technological, medical, and institutional (a guild that keeps its
  elders) — each with a different cost profile, none dominant.
- **⭐ Clarke is right about the observer and wrong about the designer.**
  Magic and technology reaching the same outcome should be **two price
  lists for the same miracle**, not one route wearing two hats.
  [arcane-science.md](../../arcane-science.md) gives magic a lawful cost
  structure; technology has a supply chain. Rival economies for one
  result is richer than equivalence.
- **⭐ Maintained, not permanent.** Sell *not dying this year*, not
  immortality. A recurring cost is an economic sink, is reversible, keeps
  the immortal population small enough that *elves remember the founding*
  still lands, and makes longevity **a relationship with an institution**
  — which is content rather than a stat.
- **⚠⚠ The distributional question is the point, not a bug.** A world
  where the rich stay vigorous and the poor decline is loaded, live, and
  exactly the political economy this platform teaches — the direct
  sibling of [blood-slate](./blood-slate.md)'s allocation problem. It
  should be designed **as a policy surface the Compact can legislate**,
  not discovered later as an inequality nobody meant.

---

## Friction — check the funnel first

Auth happens **before** char-gen: signup creates zero avatars, and
`Login` runs the enroll flow once a session exists. There is already a
`mintRandomGuestAvatar` on the guest path, sharing config with char-gen.

**So char-gen abandonment is not a lost signup — it is a registered user
with no character.** Still a real loss, more recoverable, and it means
there is more depth budget available than a registration-funnel framing
suggests.

The shape that gets both goals:

> ⭐ **The gallery is the fast path. Allocation is advanced mode.**

One choice completes a character. Everything else lives behind a
*customize* affordance most players never open, and the minority who do
get the full body/faculty budget.

**Start the A/B work at the gallery**, because the gallery is *content* —
gallery size, reroll pricing, and how discoverable advanced mode is can
all be iterated without shipping code. The allocation system is the
expensive half; let the cheap half measure the appetite first.

---

## ⭐⭐ Build phasing — two cycles, far apart

*(Decided 2026-08-25.)*

> **User: "one right now, with very very simple cards — maybe even just
> shit like eye/skin/hair colour that doesn't actually matter. Then
> later, after we've built out all our content packs for all our
> different trades plus whatever other packs we build for localities,
> we'll come back and do the real procgen algo based on all the
> knowledge of how the trades go. Probably one of the last things we
> build before we go live."**

The split is **shell now, generator later**, and it is the right cut
because every hard part of the generator needs vocabulary that does not
exist yet.

### Two facts that set the estimate

- ⚠ **Appearance is not modeled anywhere.** `Material.appearance` is for
  substances and `DescriptorBank` is for unidentified items; there is no
  eye / hair / skin on a character. Phase-1 "cosmetics" is **new
  substrate**, not free filler.
- ⭐ **The char-gen wire is already built for this.**
  `CharGenFieldState.field` is *"a plain string, not a closed union"*
  with the vocabulary living only in the server's `FIELDS` table, and
  the client is **required to render a field it does not recognize**.
  The forward-compat lesson already landed.
  ⚠ But `CharGenFieldKind` is `'choose-one' | 'text'` and
  `CharGenOption` is a flat `{value, label, description?,
  illustration?}` — a **one-line** option. An eight-column card does not
  fit, so phase 1 adds one kind and one payload.

### Phase 1 — the shell, plus one real inheritance

| in | why |
|---|---|
| **person record `Document`** | the unrealized-person primitive. Needed forever, and what finally makes `chronicle.who` (*"inert in v1"*) mean something |
| **household record** | the pair + shared fields |
| **`kind: 'gallery'` + a row payload** | ordered, server-supplied `{label, value}` cells |
| **gallery UI** — grid, detail, reroll, lock/pin | the expensive UI work, and none of it depends on content |
| **trivial generator** | draws appearance + surname from banks |
| **endowed appearance**, *rendering in descriptions* | the payload — inherited only, no editor (below) |
| **surname inheritance** | `NameBank` already ships |
| **commit path** | adopt → two records + your appearance + your name |

⭐ **Cosmetics are not filler — they are the `endowed` category § *the
four kinds of value* says is missing.** Eye / hair / skin are the same
kind as blood type: inherited, uncontrolled, **relationship not
ranking**. Phase 1 therefore ships a real value class the game keeps,
not a placeholder to throw away.

⚠ **Appearance must actually render** — another player looks at you and
sees it. Inert appearance breaks § *the consistency rule* at the one
screen where that rule matters most. It is also where most of phase 1's
value is: it proves the spine end to end — **draw → adopt → persist →
observable by someone else** — with content that cannot unbalance
anything.

### ⭐⭐ What the phase-1 card actually SHOWS

*(Worked 2026-08-25 against the shipped tree.)* Six cells — **four with
a live consumer today**, two that are honest facts nothing reads yet.

| cell | what it does **today** |
|---|---|
| **Species** | `innateMixins`, `facultyProfile`, description. **Relocating it from a declared field onto the card is the demotion § *decision A* already made** — zero new work |
| **Raised** (2–3 dispositions) | ⭐⭐ `TraitApi.regardBaseline` — trait compatibility sets your **starting regard with every NPC**. Raised guarded, and the barkeep is cooler on you. `TraitApi.seedClaims` already works |
| **Surname** | your name, everywhere. `name_banks` ships |
| **Parents' given names** | the **unpinnable** identity cell (§ *Controls*) |
| **Place** | ⚠ **inert in phase 1** — see below |
| **Looks** (eye / hair / skin) | nothing, and that is the point |

⭐ **This is not a placeholder card.** It carries real capability, real
social position, and real identity — and the two cells it lacks are
exactly the pack-dependent ones.

#### ⚠ `Place` does NOT set where you spawn

An earlier draft had the Place cell drive `startLocation`. **It cannot:
everyone spawns in the lounge, always.** The cell stays anyway, for two
honest reasons — it names **real content you can walk to and confirm
exists** (§ *the consistency rule*), and it is **the phase-2 trade join
key**, so shipping it early is free forward-compat. It should be
described as *where you are from*, never as anything mechanical.

#### What does NOT make phase 1

- ⚠ **Faith / patron.** Expected to be cheap; **it is not built at all**
  — no `Patron` object, no seeds. It is [alignment-slate](./alignment-slate.md),
  unbuilt. (The `patron` hits in the tree are crafting *customers*.)
- **Knows (a Discipline).** Tempting — 23 non-magic Disciplines ship —
  but it needs `AdvancementApi.seedClaims`, the awkward band-to-evidence
  synthesizer (§ *the seeding surface*), **and** without trades *"your
  household knew cooking"* is arbitrary. It is the one cell that
  genuinely requires the vocabulary.

#### What phase 1 does to the five existing char-gen fields

Today: `species · sex · name · pronouns · aspiration`.

| field | phase 1 |
|---|---|
| `species` | **moves onto the card** |
| `aspiration` | becomes the gallery's free **sort** (§ *Controls*) — the demotion, delivered |
| `name` | given name stays declared; **surname comes from the household** |
| `sex` · `pronouns` | unchanged, declared |

#### ⭐⭐ Appearance: describable, never SELECTABLE

> **User: "I dunno what's so bad about `getEyeColor()` — most games
> literally let you set an RGB hex, it's immersive. But obviously you
> don't want to sort people into camps based on eye colour."**

⚠ An earlier draft of this section proposed making appearance
structurally unreadable — no accessor anywhere. **That solves the wrong
problem.** Rendering *"hazel eyes"* in a description is the immersive
thing you want anyway. The harm is not reading one person's eye colour;
it is being able to **enumerate everyone who has it.**

> **Appearance may be described. It may never be *selectable*.**

Two surfaces, and only two:

- ⭐ **No MQL predicate.** `MQL_PREDICATES` is a closed
  `Readonly<Record<>>` behind an `isPredicateName` guard, so appearance
  cannot become a filter by accident — it would take a deliberate edit,
  which is exactly the tripwire wanted.
- **Never a `GroupProvider`.** Also a small closed set.

Nothing else needs restricting. A getter, a stored value, a description
phrase are all fine.

⭐ And the cheapness is the feature: modelling an axis the engine
**structurally cannot act on** makes phase 1 the first shipped instance
of *nature contributes nothing to capability* — stated before anything
is at stake.

#### ⭐⭐ Inherited only — changing it is a GOOD, and its price is a DIAL

Every other game lets you dial your appearance at creation. This one
does not.

> **User: "inherited only. We have a whole cosmetics industry for
> modifying your appearance."**

**There is no appearance editor in char-gen.** You get what the
household gave you; changing it happens **in the world**, as a purchase.

⚠ **Two things this slate briefly claimed and should not.** Both were
mine, neither was asked for:

1. *"This mints the barber"* — that the char-gen rule creates the unmet
   demand that promotes the register's `barber / tailor` **GAP** into a
   vocation. Overreach: whether appearance work is a skilled trade, a
   kiosk, or a luxury industry is **not decided here.**
2. *"Your persona is not a reward"* — a proposed platform commitment
   that appearance must never be economically gated. **Invented.**

> ⭐⭐⭐ **User: "when did I say we didn't want to gate how you look
> behind an economy? Of course it's an economy — it's just one of our
> own design, we completely control scarcity. And we're a platform,
> this sort of thing is a **dial**. Game cosmetics as an industry is
> probably into the hundreds of billions of dollars; of course someone
> will see cosmetics in Saxonberg and see dollar signs. **The platform
> has no opinion on this.**"**

The correct layering, and it is the house one:

| | |
|---|---|
| **platform** | the **mechanism** — appearance is mutable, and there is a way to change it |
| **dial** | price, scarcity, whether it is a trade or a kiosk, whether an operator monetizes it |

Layer 3 at most (see [measurement.md](../../measurement.md) § *the
enumeration of layer 3*), and probably not even that — **the platform
has no opinion on the price of hair dye, the same way it has none on the
price of bread.**

⭐ The consequence for the card is small: **`Looks` is a starting look,
not a permanent trait.** The cell says where you came *from*; the origin
stays true whatever you do to your hair afterwards. Inheritance is about
the **origin**, never about the presentation.

⭐ It also makes appearance a *presented* thing rather than a *given*
one, which the belief layer already models: your current look is **not
evidence of your parentage**, and someone who knew you before knows
something a stranger does not.

⚠ `Looks` is **pinnable and priced** at char-gen like any other cell.
Players will spend real allotment on something with zero mechanical
value — honest, and the alternative (free vanity pins) reopens the
free-narrowing hole § *Controls* just closed.

#### ⭐ The real design question: cosmetics has NO PRODUCTION CHAIN

Not *whether* it costs. This:

> **Nearly every good in Saxonberg gets its scarcity from inputs** — ore
> → metal → tools, crop → grain → bread. **Appearance change has no
> natural input, so its scarcity is purely DECLARED.**

Which is the one thing this economy usually refuses. The fork: either
the price is a straight authored number, or the good is **given** an
input — a pigment, a material, a Discipline — and becomes a real trade
with a supply curve like everything else.

That is a dial too, but it is the dial that decides whether cosmetics is
a **money sink** or a **trade**. Explored in
[cosmetics-slate](./cosmetics-slate.md).

### Phase 2 — the generator, after the packs

Trades / localities / disciplines vocabulary · the locality→trade join
and pair plausibility · disposition + transcript seeding (including the
missing `AdvancementApi.seedClaims` and the `when` fix) · hooks / means /
standing / status · the balance weights · the budget and the pin-cost
curve · body composition · blood type · adoption draw rates.

### ⭐ The three seams that make phase 2 additive

1. **Card cells are an ordered server-supplied list, never named
   client-side.** Phase 1 ships three cells, phase 2 ships eight, client
   unchanged. The same move `CharGenFieldState` already made one level
   up — and that redesign exists precisely because its predecessor
   *"named every field twice."*
2. **The commit path is a list of seeders, not a function.** Phase 1
   registers appearance + name; phase 2 **appends** ledger seeders
   without touching the adopt flow.
3. **Store the two roles separately from day one** — birth and raising
   — even while they always point at the same household (§ *Adoption*).
   Same insurance as *store the parent species anyway*, and the
   difference between phase 2 being a generator change and a schema
   migration.

### ⚠ One copy guardrail

**Phase 1 must not tell the majority-day fiction.** *"What you know, you
learned there. Who you are, you learned there"* is a promise phase 1
cannot keep — nothing is seeded. Shipping that copy over a cosmetic
picker repeats the arrival build's failure: **shipped strings promising
what the product refuses.** Keep phase 1's language to what it does —
you pick where your looks and your name came from.

### What phase 1 deliberately does not prove

Stated so the hard part does not look done: phase 1 de-risks **the
records and the UI**, not **the generator**. Nothing about pair
plausibility, the balance weights, or the seeding surface is exercised.
That is the correct cut — all three need the packs — but **phase 2 is
still where the design risk lives.**

---

## Open questions

1. **Is the gallery a fresh roll or a persistent pool?** Records are
   cheap either way, but a pool means households are finite and real —
   which is what would eventually make siblings, a demography, and
   *realizing* a parent as an NPC coherent rather than ad-hoc.
2. **What is in the hook vocabulary?** It has to be typed, small enough
   to render in a grid cell, and rich enough that every household has a
   distinct one. That tension is the hardest single piece of the
   generator.
3. **What does the budget actually buy in units?** The slate argues for
   real units within a species-declared range; the ranges, and whether
   the species-typical center is the default, are unwritten.
4. **Does anything else become endowed with this build**, or does blood
   type ship alone? Allergies and metabolic quirks pass the rule and
   would each need a consumer.
5. **Can a player see the roll?** Showing it is drama; hiding it makes
   `untested` an invitation. Lean: show the *slot*, not the value.
6. **How much does the household's trade give you?** An antecedents
   budget shaped by the parents is the natural link to
   [antecedents-slate](./antecedents-slate.md), but a childhood spent
   around a trade is not the same as practicing it.
7. **What is the clock scale?** It decides whether a birthday is an
   occasion or weekly noise, and nothing about the date should be built
   before it is settled. ⚠ `setScale` is already known to rescale
   metabolic rates, so this is not a free knob.
8. **What does `reembody` actually cost?** If death is already
   recoverable, the whole framing of aging as a catastrophe is wrong and
   the age model gets simpler, not harder.
9. **Does majority age vary by species?** An elf coming of age at 120
   and a human at 16 is realistic and makes the *gallery* awkward —
   parents and child would sit at wildly different life stages. Possibly
   majority is cultural rather than biological, which is the same answer
   the trait question got.
10. ⭐ **"Household" rather than "parents"?** *(proposed, not decided.)*
    If every card is a mother and a father, that is a narrower fiction
    than this platform usually commits to, and it forecloses an
    orphanage, a guardian, a single parent, an aunt who raised you, a
    workshop that took you in. **The mechanism is identical** — a record
    is a record, and the grid row is already the household rather than
    the pair — so the variety is free characterization. It also softens
    question 9, since a guardian need not be a biological parent at all.

### Added 2026-08-25 (the balance / seeding pass)

11. ⚠⚠ **Does the `Places` column point the wrong way?** The roster puts
    localities on the *trade* row (`smallholder → [hinkley-hills,
    moor]`). The content-pack doctrine says the opposite — *the locality
    is the annex (it knows the trade); the trade is the host (it knows
    no locality); a trade is complete with zero localities installed.*
    Under that rule a locality should declare which trades were raised
    there, or a trade pack installed without its localities carries a
    dangling reference. It is **also** the generator's natural seed
    order: pick the locality first and the *"pair must read as a
    plausible household"* constraint is satisfied by construction rather
    than filtered for. **Raised, not decided** — and lower priority than
    it looks, since early play is Terminus / Hinkley Hills / the wilds
    and everyone is from the same vicinity.
12. **Is 180 game-days the right half-life for a seeded claim?** With
    `when` set (§ *The `when` on a seeded claim*), a 55-valence seed drops
    below `defined` in roughly a game-year and a half. Whether that is
    the right rate at which to outgrow your upbringing is a calibration
    question, and it is entangled with question 7's clock scale.
13. **Are the balance weights right?** The table is placeholders. The
    real question is whether net-≈-0 is even the target, or whether
    deliberate outliers — a genuinely fortunate household, a genuinely
    hard one — are worth having as rare cards.
14. **Does `notorious` need its own treatment?** It is scored −1 with
    `rough`, but it is high renown with negative regard — different in
    kind, not merely lower, and the only Standing value that is
    two-signed.

### Added 2026-08-25 (phasing / adoption / the pin)

15. ⚠ **What is the pin-cost curve, and what happens when you cannot
    afford a reroll at your current pin count?** You are not stuck —
    unpinning brings the price back down, which is itself a decent
    decision to face (no refund, just a cheaper next roll). The
    alternative is that the screen hard-ends and you take what is on it,
    which is simpler and also defensible. **Phase 2**, with the curve.
16. **What are the adoption draw rates?** The pin dissolves the grind
    and unpinnable identity cells keep a narrow pool from reading as
    exhausted, so what is left is purely how often a mismatch should
    surface. Needs the real vocabulary to tune. **Phase 2.**
17. ✅ **Does pinning species undo its demotion?** *Resolved* — filters
    retired, so species is a **priced pin** (§ *Controls*). *"The
    lineage settles what you are"* holds for everyone who does not spend
    on it, and players who arrive wanting an elf can buy it. What is
    left is the curve, which is question 15.
18. **Do birth parents get records, or only a species + appearance
    stamp?** A record makes `missing` a real quest seed; a stamp is
    cheaper and enough for phase 1. **Phase 1 can defer by storing the
    two roles as separate refs that happen to be equal.**
19. **Which appearance axes ship?** Eye / hair / skin is the obvious
    three, but only if `Visible` / `RecognitionApi.describe` render
    them — an axis nothing even *describes* is worse than an absent one.
    ⭐ Note *inert* is not the failure here: the axis is **deliberately**
    unable to decide anything (§ *describable, never selectable*); it
    must merely be **visible**. **Phase 1.**

### Added 2026-08-25 (adoption model / filters retired)

20. ⚠ **Do the slot role-flags ship in phase 1?** They should — every
    phase-1 card sets both flags true and no blank ever appears, but
    retrofitting a slot role onto existing records is a migration while
    shipping the field is free. The same insurance as *store the parent
    species anyway*, which has now paid off twice. **The drawn cases
    (step, full adoption) can arrive whenever the content is worth it,
    with no schema work.**
21. **How is a constraint on card SHAPE priced against one on a cell
    VALUE?** *Adopted* narrows the pool like `Place: Terminus` does, but
    it is not a cell. Same curve, or its own? **Phase 2**, with the
    curve.
22. **Does aspiration-as-a-sort need a second sort axis?** One free
    ordering is enough for onboarding; whether a player can re-sort
    later (by place, by trade) without it becoming a filter in disguise
    is unexamined. ⚠ The test is § *Controls*' rule — **does it remove
    anything?**

⭐ Questions **2** (*the hook vocabulary*) and **6** (*how much the
trade gives you*) are now substantially answered — by
[trade-roster-slate](./trade-roster-slate.md) and by § *the seeding
surface* respectively — and should be closed at requirements time rather
than re-opened.

---

## What this slate does NOT cover

- **The advancement prior itself** — [antecedents-slate](./antecedents-slate.md)
  owns the effort→prior mapping; this doc only supplies a source for it.
- **Blood type mechanics** — [blood-slate](./blood-slate.md).
- **Reproduction in play.** Inheritance here is *backward-looking* only:
  choosing where you came from, never producing children.
- **The longevity industry.** Recorded above as constraints, designed
  nowhere — it spans vitals, mortality, magic, crafting and civics and
  wants its own cycle.
- ⭐ **Generational play** — terminal aging, where your next character is
  your *child* and the gallery becomes your own history rather than
  procgen. It is the compelling road not taken: it makes lineage
  load-bearing instead of decorative, but it needs reproduction in play
  and it re-imports the lifespan-ranking problem with interest. Recorded
  so the choice stays visible.
- **The species roster itself** — which species exist is
  [species-expansion-slate](../tails/species-expansion-slate.md)'s
  question, not this one's.

---

## Cross-references

- [char-gen.md](../../subsystems/char-gen.md) — the `enroll` draft
  machine this restructures, and its **§ Forward compatibility** section:
  what the client rebuild should do *now* so this lands cheaply later
  (keep server-authoritative whole-state re-emit; generalize the
  per-field option arrays into a field list with a renderer `kind`)
- [document-store.md](../../subsystems/document-store.md) — the
  path-addressed tree the person record lives in
- [chronicle.md](../../subsystems/chronicle.md) — the prologue claims,
  and the inert `who` field a person record would finally give meaning
- [belief.md](../../subsystems/belief.md) — the truth-vs-belief seam, and
  the relationships the gallery seeds
- [race.md](../../subsystems/race.md) — `Species`, `Clade`, `BodyPlan`,
  `facultyProfile`
- [species-slate](./species-slate.md) — costs-not-ranks, incomparability,
  and the quality criterion the body budget has to satisfy
- [species-expansion-slate](../tails/species-expansion-slate.md) — the
  roster, and the hybrid-retirement note
- [trait-slate](./trait-slate.md) — equilibrium vs expressed (what a
  seeded claim actually sets), and the shared *deviation, not absolutes*
  narration rule the gallery card follows
- [trait.md](../../subsystems/trait.md) — `dispositions` claim-seeding,
  the upbringing mechanism
- [antecedents-slate](./antecedents-slate.md) — the background prior, and
  the authored-acquaintance gap the gallery partly closes
- [blood-slate](./blood-slate.md) — the first endowed value
- [banking.md](../../subsystems/banking.md) — `bank_supply`, the
  conservation chokepoint the capital sink draws from
- [magic.md](../../subsystems/magic.md) — `facultyProfile`, mana as a
  `Reserve`, competence-is-access
- [vitals.md](../../subsystems/vitals.md) — `OrganismMixin.age`, and the
  age curve the profile reserves room for
- [mortality.md](../../subsystems/mortality.md) — the dying arc, the
  shade, and `reembody`; check what death already costs before designing
  an escape from it
- [time.md](../../subsystems/time.md) — the clock and calendar a birthday
  rides, and the scale its meaning depends on
- [arcane-science.md](../../arcane-science.md) — magic's lawful price
  list, the other half of the two-price-lists framing
