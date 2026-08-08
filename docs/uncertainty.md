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
| **alignment / religion** | absorb Part 3; fix the `fortune` line |
| **combat · banking · advancement · renown · hazard** | no change; banking stays category-0 forever |

---

[^lens]: The four questions, the judgment-vs-fate framing, the deal/play
    alternation method and Perry's triad come from Jesse Schell, *The Art
    of Game Design: A Book of Lenses*, 3rd ed., **Lens #41, Skill vs.
    Chance** — read and analysed in
    [lenses/skill-vs-chance.md](./lenses/skill-vs-chance.md), which is
    this document's parent. The Diablo 3 settlement diagnosis and the
    stalls/exchange rule are ours, from
    [economy-slate.md](./slates/builds/economy-slate.md).
