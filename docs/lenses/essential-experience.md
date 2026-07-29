# Lens: Essential Experience

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Fresh pass, entry 2 (2026-07-28), revised in place.** Re-read from
> the book and re-run against the game as it now stands — a
> near-fully-designed whole, nothing playtested. The two ratified
> essence sentences (2026-06-09) are **carried forward and re-tested
> below**; the original ratification record is in git history.

## The lens

Stop thinking about your game and start thinking about the experience
of the player. Three questions: **what experience do I want the player
to have? What is essential to that experience? How can my game capture
that essence?** The mechanics, story, and world are not the experience
— they are the means. Say the essence in a sentence, and point at any
feature and say how it serves that sentence, or admit that it doesn't.

> **From the book.** The snowball-fight example is the method in
> miniature: to deliver "it was so cold," you don't need real snow —
> art (puffs of breath), sound (a whistling wind), *or a rule*
> (snowballs pack better bare-handed, but freezing hands force gloves
> on) can each carry the essence, even if "that might not have really
> happened." Two worked examples follow the lens box. **Wii Sports
> baseball**: the team couldn't simulate all of baseball in time, so
> they cut the non-essential (nine innings, stealing bases) and spent
> everything on the one unique thing — swinging the controller.
> **James Bond 007 (Chris Klug)**: prior spy RPGs felt like war games;
> Klug invented Hero Points — a spendable budget that *alters dice
> rolls* — deliberately bending probability to deliver the essence of
> a Bond film. And the closing warning: separating the experience from
> the game tells you "which elements of the game you can safely change
> and which ones you cannot"; without a named essence "you are just
> wandering in the dark."[^aogd-ee]

## Why our design prompts it

Because we are building **two things at once**, each with its own
essential experience, and it is dangerously easy to ask the lens about
one while answering for the other. The two things — the third is
downstream — are:

1. **The platform.** An abstract gamification engine, vertical-
   agnostic by design ([standard-model.md](../standard-model.md), the
   two philosophy docs).
2. **The game (Saxonberg).** The first thing built on the platform —
   educational at its core ([vision.md](../vision.md)): "learning as
   adventure."
3. **A vertical's product (future).** What an adopter ships when they
   point the platform at their domain. Out of scope here, but it's why
   the platform's essence must stay abstract.

The lens's job is to keep the two essences from contaminating each
other — game truths must not harden into platform substrate, and the
platform's vertical-agnosticism must not talk the game out of being
wholeheartedly educational.

## What the design answers

> **Status: both essence sentences ratified 2026-06-09; re-tested
> 2026-07-28 against the designed game. Verdict: both hold — the
> systems grew *into* the sentences. The re-test surfaced one strain,
> resolved by ratifying a fifth platform clause (2026-07-28, below).**

### The platform's essence

> **Real effort, recognized — your doing is seen, what you become is
> earned, what you make persists, you do it among others who remember
> you, and the world itself honors what you understand.**
>
> *(Fifth clause ratified 2026-07-28; the four-clause original was
> ratified 2026-06-09.)*

The 2026-07 re-test, clause by clause, against systems that mostly
did not exist when the sentence was ratified:

- **"Your doing is seen."** Now literal machinery: the witness loop,
  reactions keyed to acts, the accountability ledger (who harmed
  whom, on what terms), renown's reception signal (being heard),
  provenance's authoring ledger. Seen — and *recorded, attributably*.
- **"What you become is earned."** Advancement's derive-on-read
  competence over evidenced acts; the chronicle's claim/deed
  provenance split; conferral gating capability on demonstration;
  traits accreting from what you actually did. There is no bought or
  granted becoming anywhere in the design.
- **"What you make persists."** Ratified as a sentence about dorm
  rooms; the design made it property law — the persistence spine,
  chattel ownership with chain-of-title, parcel title, the maker's
  mark on crafted goods, consignment surviving relogs. The clause
  held so well it became an economy.
- **"Among others who remember you."** Belief/recognition (per-viewer
  identity memory), regard, the social graph, parties, the
  accountability ledger again — memory of you is a *substrate
  property* now, not a community hope.
- **"The world itself honors what you understand"** (the ratified
  fifth clause). The honesty discipline felt as play: `analyze`
  reveals the real model; the wet-firewood problem is derivable from
  latent heat; metal armor genuinely worsens shock; the sky can be
  read because the weather grammar is real. Recognition by reality,
  not by others — the clause the first four only gestured at.

**Verdict: holds.** The sentence predicted the buildout.

### The game's essence

> **Learning as adventure — you grow into who you become by mastering
> a field, in a university world that makes that growth feel like a
> story worth being in.**

Re-test: the University content (campus, char-gen, dorm residence,
Duncan Hall), the advancement Catalog as the game's own internal
taxonomy, the credential seam as the *external enrichment* — the
internal/external split stands exactly as ratified: the game is
educational with zero vertical inputs; external mastery raises only
the ceiling. **Verdict: holds.**

### The strain, and its resolution (ratified 2026-07-28)

The 2026-07 re-test found one experience the designed game delivers
everywhere that the four-clause sentence carried only implicitly:
**the world yields to understanding** — the Andy Weir experience,
the honesty discipline *felt as play*, the experience the
[infinite-inspiration](./infinite-inspiration.md) entry named as the
one we most want to share. "What you become is earned" gestures at
it, but that clause is about recognition of effort by *others*; this
is *reality complying with comprehension*.

**Resolution: the fifth clause was ratified** — *"and the world
itself honors what you understand"* — making the honesty-experience
explicit platform essence. Consequence for the next vertical: the
clause is only satisfiable by a vertical whose models are honest
(reality-shaped or rigorously self-consistent). A vertical that
can't honor understanding can ride the first four clauses, but it
gets a lesser product — the fifth clause is now the stated bar.

### The Bond problem, and our answer

Klug's Hero Points are the lens's sharpest challenge to us: he
delivered essence by *bending the simulation* — the exact move our
honesty discipline forbids. If essence and honesty ever conflict,
which wins?

The design's answer, visible now across many shipped systems, is that
we split the stack: **the model stays honest; the presentation is
where we spend the Bond move.** Combat computes deterministic physics
underneath and narrates an *arc* on top (beat-rotated phrasing,
escalation, the earned "crit" that is really an opening); vitals are
real liters surfaced as felt bands, never numbers; competence is a
Bayesian estimate surfaced as words. Layered presentation is Hero
Points without the lie — the experience-shaping happens in the
rendering, and `analyze` will still tell you the truth. This also
answers Schell's "what can you safely change": prose, narration,
bands, pacing — freely; the honest model — never. That partition *is*
our essence, stated operationally.

### The Wii Sports check

Their move — cut the non-essential (nine innings) to perfect the
unique thing (the swing) — is our Principle 1 (smallest fidelity
content needs) seen from the essence side. Our "swing the controller"
is the honest model revealed through play; bag-of-stuff rooms, banded
displays, and deferred sub-room geometry are our nine innings. The
check for any new slate: is this fidelity spend on our swing, or on
somebody's ninth inning?

## Tensions & risks

- **The conflation is the default failure, and it recurs.** The
  original entry caught itself reading vision.md against the
  philosophy docs as a *disagreement*; they speak for different
  layers. Every lens entry must state which layer it interrogates.
  (Discipline carried forward; the orienting docs remain
  layer-labeled and point here.)
- **Leakage in both directions.** Game truths (guilds, campus,
  calendar) must not harden into platform substrate; platform
  agnosticism must not make the game wishy-washy about school. The
  substrate-vs-content discipline is this lens's enforcement arm.
- **An essence about recognition of effort is one keystroke from a
  dark pattern** — at both layers, and sharper when the effort being
  shaped is a student's real study habit. The
  [Transformation](./transformation.md) lens remains this one's
  mandatory companion; the education-track work restates it as the
  high-stakes guardrail (no manufactured urgency; the avatar borrows
  its stakes).
- **A ratified essence can calcify.** This re-test passed; the next
  one might not, and the sentence must lose if the lived game
  contradicts it. Playtesting — which nothing has had — is where the
  essence meets its first real evidence.

## Implications

1. **Both essence sentences re-affirmed against the designed game,
   and the platform sentence extended** (2026-07-28): the fifth
   clause — *the world itself honors what you understand* — is
   ratified. Docs that quote the platform essence should carry the
   five-clause form from here on.
2. **The layer discipline stands**: every lens entry states its
   layer; the orienting docs stay labeled and point here.
3. **The presentation/model split is the standing answer to
   essence-vs-honesty conflicts** — spend Bond moves in rendering,
   never in the model. New systems inherit this partition by default.
4. **The Wii Sports question joins the slate checklist** alongside
   Infinite Inspiration's audit question: *name the essence this
   fidelity spend serves; if it's a ninth inning, defer it.*
5. **Pair permanently with [Transformation](./transformation.md)** —
   unchanged, and now load-bearing for the education vertical.

---

[^aogd-ee]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #2, the Lens of Essential
    Experience**, Chapter 2, "The Designer Creates an Experience"
    (re-read from the author's Google Play edition, 2026-07). The
    three questions, snowball-fight routes, Wii Sports baseball and
    James Bond 007 Hero Points examples, and the "safely change /
    wandering in the dark" framing are Schell's; both essence
    sentences and all analysis are ours.
