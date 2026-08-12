# Uncertainty — provenance, luck, and the honest abstraction

**Status: design constraint.** This document authors the *rules of
uncertainty*: where randomness may enter the world, where it may never,
what may be built and sold on top of it, and what "luck" and "mysticism"
are allowed to mean here. It is a peer of
[arcane-science.md](./arcane-science.md) (which constrains what magic may
claim) and [compact-political-science.md](./compact-political-science.md)
(which constrains what the polity may claim). It changes no mechanic
today. It explains the ones we have and tells authors what they may
author next.

It exists because the game shipped a radical answer — a bit-for-bit
deterministic combat session, no die roll anywhere on a resolution path —
and then kept proposing systems (astrology, almanacs, insurance, pharma,
fishing) whose whole subject matter is variance. Those are not in
conflict, but only once you stop asking *"deterministic or not?"* and
start asking *"where in the causal chain does the arbitrariness sit?"*

---

## The hard rule

> **Roll to decide what the world IS. Never roll to decide what your
> action DID.**

Or, in the vocabulary already used in
[the skill-vs-chance lens](./lenses/skill-vs-chance.md): **the dice are
in the deal, never in the play.**

This does not replace the existing doctrine — *uncertainty must be
epistemic or environmental, never aleatory in resolution* — it names the
half that was always licensed and never written down. The lens already
said **"the world deals; every play is skill."** The deal side needed
rules; this is them.

---

# Part 1 — The four provenances

Every uncertain thing in the game comes from exactly one of these. The
first three are legal. The fourth is banned.

| # | Kind | Where it comes from | Verdict |
|---|---|---|---|
| **1** | **Epistemic** | You do not know — hidden minds, combat fog, an unidentified potion, a seam you haven't read | ✅ **the preferred depth** |
| **2** | **Environmental** | A *function* of world state — the weather field, moon phase, biome character, accumulated stock | ✅ **and forecastable, which makes it an economy** |
| **3** | **Generative** | A die rolled **once**, when a thing enters the world — spawn, BUC, procgen, a name | ✅ **it becomes a fact, not an outcome** |
| **4** | **Resolutional** | A die between your choice and its result — to-hit, damage, crit, a skill check | ❌ **banned** |

The distinguishing question for 3 vs 4 is **not** "is there a die?" but
**"did the die fire because I acted?"** A dagger that was cursed when it
was minted is a category-3 fact about the world you can investigate,
price, and be fooled by. A dagger that *becomes* cursed at the moment you
swing it is category 4 and forbidden.

## ⭐ Seeded, not drawn

Where categories 2 and 3 can be a **hash of stable inputs** rather than a
live `Math.random()`, they must be. This buys three things:

1. **Reproducible tests** — the property the gym rides.
2. **An auditable world** — a wizard can answer "why did that happen?"
3. ⭐⭐ **A regularity that is in principle discoverable by a player who
   keeps records.**

That third one is the pedagogical whole ballgame. **Drawn randomness is
noise forever. Seeded randomness is a law nobody has found yet** — and a
law nobody has found yet is the raw material of every science, every
almanac, and every vocation this document licenses.

[weather.md](./subsystems/weather.md) is the exemplar and should be read
as the reference implementation: `weatherAt(time, locality)` is a pure
deterministic function, no stored state, no tick — **so tomorrow is
computable today.** That single property is what makes an almanac a
product instead of a wiki dump.

## What determinism cannot teach

The honest cost of a no-variance world, stated plainly, because it is the
strongest argument for licensing category 2 and 3 at all:

**A fully deterministic world cannot teach inference.** Sampling,
replication, error bars, controls, confidence, the difference between a
correlation and a cause — none of it has anything to bite on. We teach
thermodynamics honestly today; we cannot currently teach statistics
honestly, because there is nothing to infer *through*.

Two verticals expose this sharply, and both are open questions rather
than settled ones:

- ⚠ **Pharma as the first credence good.** A remedy with a deterministic
  effect is not a credence good — one trial settles it. The intended
  lesson (*"this remedy works" is false here, and here is how you would
  establish that*) needs noise to be a **discovered** result rather than a
  **stipulated** one.
- ⚠ **Insurance.** Over a deterministic hazard field, insurance is not
  risk-pooling — it is arbitrage against people who haven't done the
  arithmetic. That is coherent, and the insurance slate already leans
  into "the inverted information business," but it means shipping
  actuarial science with the actuary removed.

**The open decision** is therefore not *"may we have randomness"* but
*"do we want one variance-bearing channel, and does it sit at world
processes — yield, deposition, onset, efficacy — rather than at
actions."* This document's recommendation is **yes, exactly one, seeded,
at world processes.** It is not yet decided.

---

# Part 2 — Luck

## Luck is not a stat

NetHack's Luck is a hidden modifier on resolution — **category 4**, and
therefore banned on the same grounds as a to-hit roll. It is also
precisely what the religion doctrine already refuses: *worship is a
mirror, not a vending machine… you can't farm a god*
([story-bible.md](./story-bible.md)).

> **We can have full moons without having Luck.**

## The two honest reframes

**Luck as exposure, not modifier.** Derived-on-read, like a Competence
band: *how much of your outcome you left to the world.* Plant one crop
and you are exposed; diversify and you are not. That is portfolio theory,
it is real, it is measurable from the ledgers we already keep — and it
makes the almanac-maker a seller of **variance reduction**, which is what
almanacs actually sold.

**Luck as content-only superstition.** Zero mechanical backing. NPCs
believe it, the wiki argues about it, and a player who keeps records can
**disprove** it. Same method, opposite answer from the astrology case —
which is exactly the pairing [discovery-slate](./slates/builds/discovery-slate.md)
already builds with pharma.

Both are compatible; neither requires a Luck field on anything.

---

# Part 3 — Mysticism and the gods

The astrology answer already in `discovery-slate.md` is the general form
of the entire religion question, and it is better than we credited:

> **Creatures active at the full moon leave things at the full moon.**
> The correlation is real and mediated by **behaviour, not physics** —
> ecology, not astrology. The astrologer's forecasts work; their account
> of *why* is wrong.

Generalized, this is the rule that lets religion carry real weight
without spending a second exemption from the
[arcane-science](./arcane-science.md) budget:

> ⭐⭐⭐ **Mysticism is not a mechanism. It is the name people give a
> correlation they cannot yet explain.**

Most of what the real world calls religion is the residue left after
determinism explained the rest. Here that residue maps onto **the
not-yet-explained**, never **the un-caused**. Gods stay mythic, never
embodied, never a die. Omens are simultaneously **real and mundane** —
and *"a correct prediction does not validate the explanation"* is
arguably the single most important idea in scientific literacy, obtained
for free.

⚠ **The essentialism guard.** A moon that modifies **the world** is
ecology. A moon that modifies **people** is astrology-as-essentialism —
the exact thing [mind-slate](./slates/builds/mind-slate.md) bans (*"ADHD
casters are good at Fire" is astrology*). Periodic terms attach to
places, seasons, and populations. Never to a character sheet.

## ⭐⭐ Why a god may not be the RNG

The tempting move is to let divine favour *be* the random term — the
gaps in causality are where gods have always lived. It is a trap, and
the reason is worth stating because it is not the obvious one.

**The god-of-the-gaps position is understood to be the weakest available
one, and the people who say so loudest are theologians** — a god who
lives in gaps dies as they close.[^gaps] That is a direct warning to a
world like ours, which is unusually good at closing gaps. If divine
favour is a term in an equation:

1. **Someone will test it.** We ship a wiki, forums, an observation
   ladder and players who keep logs. *"Does patronizing Eir improve
   mending outcomes"* is answerable in-world, by playing, in week three.
2. **Both answers are bad.** Yes → a vending machine, and *"you can't
   farm a god"* is dead. No → we have publicly established that the gods
   do nothing, and worship is cosmetic.
3. **The mystery is consumed either way.**

> ⭐⭐⭐ **A testable god is a temporary god.**

## Where the numinous lives instead

Three homes, none of which need a die:

1. ⭐⭐⭐ **The gap is in the EXPLANATION, not the causality.** The moon
   really does correlate with what you find. Whether that is Pan's
   favour or nocturnal ecology is **a question the world does not
   answer**, because the mechanism is exposed nowhere. Two players
   observe the same true regularity and disagree about its cause,
   permanently, without either being lied to. **The world publishes data
   and withholds explanation** — which is the actual epistemic situation
   of both science and faith.
2. **Irreducible complexity, not irreducible randomness.** Enough
   deterministic interacting parts and the world is *practically*
   unpredictable while remaining *in principle* knowable. Weather is the
   historical case — chaos theory came out of a weather model. Surprise
   is the raw material of awe, and determinism supplies it.
3. **The gods are other people.** What players experience as fate is
   usually the stranger who showed up. This is the honest reading of
   resonance (Part 6, finding 1): it changes **who helps you**, not what
   you roll.

> **Determinism all the way down, and the mystery survives — because
> knowing *that* is not knowing *why*.**

---

# Part 3b — ⭐⭐⭐⭐ Frameworks as research programmes

Part 3 is philosophy until it cashes out in something a player does.
This section is the cash-out, and it is deliberately honest about the
parts that are load-bearing and unbuilt.

> **The full mechanical design is
> [tradition-slate.md](./slates/builds/tradition-slate.md)** — objects,
> verbs, the worked scene, and the failure analysis. This section holds
> only the rules that constrain it.

⚠ **This was first written as a religion mechanic and that was wrong.**
Stress-tested against what players actually want from faith, it serves
**one** want — inheriting an account of how the world works — and none of
the other seven (congregation, visible practice, proselytizing, apostasy,
founding your own, ritual, felt power). The substrate is sound but
general: it is a **Tradition** — a craft school, a medical tradition, a
guild's lore, a naturalist's method, *or* a faith. **Religion is one
consumer, not the owner**, and what religion additionally needs is a
different substrate this codex does not design. Full scoring in the
slate's failure analysis.

## ⚠ Correction — a corpus of false claims cannot exist here

This section's first pass proposed that a framework is a corpus of
claims *some true, some false, with nothing marking which*, and that
authoring convincing false ones was the central content job. **The
[inquiry](./slates/builds/inquiry-slate.md) design refutes that**: its
predict gate checks a player's number for a novel case against the real
evaluator, so *you cannot publish a falsehood that survives
verification*. An authored false claim about the world dies on the first
prediction anyone runs — permanently, for everybody.

The correction is a **split**, not a retreat.

## Law vs Tenet

| | **Law** — positive | **Tenet** — normative |
|---|---|---|
| says | *what the world does* | *what matters; what is worth doing* |
| adjudicated by | **the sim**, via the predict gate | **nothing, ever** |
| can be false | yes — and it dies on verification | category error |

A tradition making **positive** claims is picking a fight with the
evaluator and loses — the god-of-the-gaps failure with a build date. A
tradition making **normative** claims makes no prediction, so nothing can
refute it. ⭐⭐ This is the **positive/normative split the Compact course
already grades on**, pointed at religion instead of politics.

> **Your patron is not a buff. It is an inherited research programme.**

A framework is therefore *(a)* a set of normative tenets and *(b)* an
**attention order over the shared `Law` catalog** — which questions this
account thinks are worth asking first. Everyone's laws are the same and
true; what differs is **who gets to them first**, and order is worth
money because the first discoverer publishes.

> **Distinctness is not what you receive. It is what you get to first.**

⚠ **The bright line.** A framework may never alter perception, capability
or outcome. A patron that lets you *see* more is the vending machine
wearing a hat, and it is category 4 by the back door. A framework may
organize and surface what you have **already** observed (presentation,
the [banding rule](./subsystems/advancement.md)'s shape) — nothing more.

## ⭐⭐ Atheism is a position, not an absence

In most games the atheist is the player who declined the buff. Here the
naturalist is a **methodological stance with its own corpus** — the
world's regularities are ecology, geology and traffic, and claims
without a mechanism are suspect.

⚠⚠ **The naturalist corpus must contain false entries too**, or the game
is an atheism tract and fails its own propaganda test. The honest form
of naturalist error is the **false negative**: a real correlation
dismissed for lack of a mechanism. That is not manufactured balance —
it is the actual history of science (handwashing, continental drift,
stones falling from the sky).[^falseneg] A naturalist who is
*sometimes* the last to accept a true thing is historically accurate
**and** dramatically better than one who is simply right.

## What adjudicates what

| Question | Settled by |
|---|---|
| *is this relationship real?* | **the sim**, via inquiry's predict gate — never a vote |
| *why does it hold?* | ⭐ **nothing.** The mechanism is exposed nowhere; the argument is permanent and honest |
| *what should I do about it?* | the player, from their tenets |

Forums and the wiki **host** the first two arguments; they adjudicate
neither ([deduction-slate](./slates/builds/deduction-slate.md)'s hard
line — *truth is shown, not argued or voted*).

⚠ **The real dependency:** all of this rides an **inquiry substrate that
is designed and not built.** Objects, verbs and the failure analysis are
in [tradition-slate.md](./slates/builds/tradition-slate.md), which adds no
new collection and no new Api — but is worth nothing without inquiry
underneath it.

## The superstition ladder

Superstition is the **input** to this system, not its enemy:

| Rung | Where it lives |
|---|---|
| **the rumour** | an NPC says it; players repeat it |
| **the record** | a player keeps a log |
| **the claim** | published to the wiki |
| **the contest** | someone replicates — and confirms or refutes |

That is the scientific method as a **social** process. Which flips an
instinct: **a false rumour in the world is content, not a content bug.**

⚠ **The pairing guard — in its corrected form.** The rule is *not* "author
false claims." It is that the catalog of investigable relationships must
include **null candidates**: relationships that look worth testing and
turn out flat. Nothing in the data marks them; **the evaluator is the
only oracle**, so there is no truth table to datamine and the only way to
learn is to measure — which is the activity. This preserves the
pharma/astrology pairing (*same method, opposite answers*) without
requiring a lie anywhere in the content.

That also supplies the symmetric error model: the naturalist's
characteristic failure is the **false negative** (dismissing a real law
for want of a mechanism — the actual history of science), the devout's is
the **false positive** (investigating a null one — the actual history of
divination). Both are productive; a refutation is publishable. **Neither
stance is the right one**, which is what the propaganda test requires.

The payoff is a story no scripted quest supplies: **the player who runs
a controlled experiment and disproves a beloved ritual has done
something socially costly.** That shape is Galileo's, and it is only
available in a world where the ritual might have been true.

## ⚠⚠ Where this dies

Full analysis in [tradition-slate.md](./slates/builds/tradition-slate.md).
The one that belongs in the codex because it constrains *every* system
here, not just religion:

> ⭐⭐⭐⭐ **Claims should be about what the world COMPUTES, not what an
> author STIPULATED.** A stipulated fact gets datamined once and dies. A
> computed one moves, goes stale, and must be re-established — the
> property that makes [the almanac a recurring
> product](./slates/builds/discovery-slate.md) and the null-law model
> undatamineable.

The load-bearing risk specific to tradition is that **attention order is
worth exactly what being first is worth** — which depends on credibility,
the teachable-good price gap, and almanac staleness, none of which are
built. If being first is worth little, tradition is cosmetic.

## ⚠ No spokesperson

A world may carry a thesis about determinism and meaning. It may not
**state** one. The delivery rule, borrowed from the
[Compact course's propaganda test](./compact-political-science.md):
**the design should be the argument, never make it.** No NPC explains
that free will is compatible with a deterministic world; the players
have that argument themselves, from opposite corpora, and the world
declines to referee.

---

# Part 4 — ⭐⭐⭐⭐ The abstraction law

Licensing variance has a consequence that must be handled in the same
breath, because it is how good economies die:

**Variance creates risk. Risk creates two markets — one for information
(the almanac) and one for risk-transfer (insurance). Both are, by
construction, abstractions that let you skip the activity.** So a
proposal to add variance *in order to* make a science playable is also a
proposal to manufacture the substrate for a bypass.

The precedent is already ours. From
[economy-slate.md](./slates/builds/economy-slate.md):

> The thing that poisoned Diablo 3's auction house was never the price
> list — it was **instant, anonymous, fire-and-forget settlement.** List
> it, walk away, trade with the faceless market, sort by cheapest.
> **Build the stalls, never the cross-stall search-and-sort. Build the
> handshake, not the exchange.**

Generalized past markets:

> ⭐⭐⭐⭐⭐ **An abstraction of an activity is legitimate while it still
> costs somebody the activity. It becomes poison when it costs nobody
> anything.**

## The test, run

| Abstraction | Who pays the activity cost | Verdict |
|---|---|---|
| **The almanac** | the publisher — who may read the world *only as a player can, one place at a time, by going there*, and whose survey **goes stale** | ✅ **the model case** |
| **A player stall** | the owner stocked, priced and placed it; the buyer travelled | ✅ |
| **Cross-stall search-and-sort** | nobody | ❌ |
| **A Luck stat** | nobody | ❌ |
| **The astrologer who kept records** | the astrologer | ✅ |
| **Insurance with a named underwriter + an adjuster who goes and looks** | both parties | ✅ |
| **"Crop insurance, 5%, buy it now," auto-paying on a trigger** | nobody | ❌ |

## ⭐⭐ What is insurable — derived from Part 1

The provenance codex answers this directly, which is the best evidence
that it is a real model and not merely a tidy one:

- **Categories 2 and 3 are insurable.** The world's variance — hail,
  blight, fire, the vein that ran thin — is a loss. Transferring it is a
  legitimate business.
- **Category 1 is not.** Epistemic uncertainty *is the game*. Buying your
  way out of not-knowing is buying your way out of playing.

> **You may insure a loss. You may never insure an ignorance.**

⚠ **The open frontier** is another player's choice — theft, betrayal,
a raid. It is epistemic (a hidden mind) but it is also a genuine loss,
and insuring it is transfer rather than skill-substitution. Defensible;
undecided. Flagged rather than resolved.

---

# Part 5 — The slate checklist questions

Two questions join the slate checklist. The first already existed as the
lens's implication; the second is new.

1. **Where does uncertainty in this system come from — hidden minds,
   world state, a birth roll, or dice?** Category 4 must be re-derived as
   an epistemic contest or an honest environmental input. Categories 2
   and 3 must justify why they are drawn rather than seeded.
2. **What abstraction will players build on top of this, and who pays the
   activity cost when they do?** If the answer is "nobody," the
   abstraction is the Grand Exchange in a costume, and the system needs a
   friction — a place, a person, a decay, or an adjuster.

---

# Part 6 — The audit

## What the engine does today

Verified 2026-08-07 against `packages/server/src/mud`. Fifteen files
contain `Math.random` outside tests; **none is on a resolution path.**

| Subsystem | Category | State |
|---|---|---|
| **combat** | 1 (fog, deterministic) | ✅ clean — lint-level tests assert no `Math.random` on `AimResolution`, `RangeBand`, `DeliveryProfile` |
| **hazard** | deterministic delivery | ✅ clean |
| **crafting · husbandry · smallholding · metabolism · thermal · advancement · banking** | none | ✅ RNG-free |
| **weather** (the field) | 2, seeded | ✅ the exemplar |
| **magic-items** (`Blessing.draw`) | 3, injectable roll | ✅ legal — a birth fact |
| **residency** (`SpawnTable`) | 3, injectable roll | ✅ legal |
| **behavior brains** (idles, chatter, wander, greets, reacts) | 3 / flavour | ✅ legal — but see the variety note below |
| **weather** (the lightning strike) | 3, **drawn** | ⚠ **inconsistent — see below** |

## ⚠ Findings

1. **`story-bible.md` carries a latent category-4 commitment.** In
   resonance with your patron, *"the world tilts your way — **fortune**,
   omens, the sense of being carried."* That is either a hidden modifier
   (category 4, and it contradicts *"you can't farm a god"* three
   paragraphs later) or it means resonance changes **what you notice and
   who helps you** — attention, regard, opportunity surfacing. It should
   say the second, explicitly. **Fix regardless of where the rest of this
   document lands.**
2. **The weather strike is drawn, not seeded.** `WeatherLogic.ts:708`
   falls back to `Math.random()` for the per-scope lightning roll, while
   `weather.md` promises *"the same `(time, locality)` always yields the
   same weather."* The field is deterministic; the strike is not. Hashing
   `(segment, scope)` makes it consistent with its own doc **and makes
   storms forecastable — which is directly the almanac product.**
3. **NPC strategic variety is a first-class cost of the no-RNG
   doctrine.** In a world without dice, a brain that cycles three tactics
   is a memorization exercise. Already noted in the lens; restated here
   because every new judged arena inherits it.

## What each planned system needs

| System | What the codex asks of it |
|---|---|
| **pharma / medicine** | ⭐ decide the variance question **before** speccing — the credence-good lesson degrades from *statistical* to *stipulated* without it |
| **insurance** | ⭐ state on purpose whether it is a risk business or an information business; apply Part 4's underwriter + adjuster shape either way |
| **discovery / foraging / mining** | already correct — label the astrological timing term **category 2** so nobody later "improves" it into a draw |
| **mana economy** (celestial node) | already correct — category 2, periodic, predictable |
| **fishing** | spec against this codex rather than inheriting genre defaults |
| **alignment / religion** | absorb Parts 3 + 3b; fix the `fortune` line; ⚠ **Tradition covers only the inherited-account want** — congregation, practice, apostasy and player-founded faiths need a substrate nobody has designed |
| **inquiry** | ⭐⭐ **the load-bearing dependency for Part 3b.** Its `Law` catalog + predict gate is what makes a tradition mechanical rather than cosmetic; add **null candidates** to the catalog scope, and ⚠⚠ **answer whether the catalog is player-enumerable** — Tradition is worthless if it is a menu |
| **wiki / forums** | they **host** the why-argument, never settle it — the deduction hard line applies to tradition as much as to murder |
| **combat · banking · advancement · renown · hazard** | no change; banking stays category-0 forever |

---

[^gaps]: The "god of the gaps" critique is most forcefully made from
    *inside* theology — Charles Coulson is generally credited with the
    phrase (1950s), Dietrich Bonhoeffer argued the position in *Letters
    and Papers from Prison*, and Henry Drummond made an earlier version
    in the 1890s. ⚠ **Attributions worth re-checking before this doc is
    cited anywhere public** — per the arcane-science audit rule, the
    confident-sounding passages are where the errors hide.

[^falseneg]: Semmelweis on puerperal fever, Wegener on continental
    drift (rejected largely for want of a mechanism, which mantle
    convection later supplied), and the 18th-century academies on
    meteorites. ⚠ Same audit caveat as above — the shape of the claim
    is sound, the specifics deserve a source check before they carry
    weight.

[^lens]: The four questions, the judgment-vs-fate framing, the deal/play
    alternation method and Perry's triad come from Jesse Schell, *The Art
    of Game Design: A Book of Lenses*, 3rd ed., **Lens #41, Skill vs.
    Chance** — read and analysed in
    [lenses/skill-vs-chance.md](./lenses/skill-vs-chance.md), which is
    this document's parent. The Diablo 3 settlement diagnosis and the
    stalls/exchange rule are ours, from
    [economy-slate.md](./slates/builds/economy-slate.md).
