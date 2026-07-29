# Lens: Skill vs. Chance

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Fresh pass, entry 9 (2026-07-28), net-new** — second of the
> systems-first sequence. This is the combat doctrine's home lens
> ("poker, not slots"), read against the shipped combat loop and the
> wider resolution rules of the world.
>
> **Layer interrogated: the game's resolution rules**; the doctrine
> extracted is platform-grade.

## The lens

Four questions: **are my players here to be judged (skill) or to take
risks (chance)? Skill tends to be more serious than chance — is my
game serious or casual? Are parts of my game tedious — would chance
enliven them? Do parts feel too random — would skill or strategy give
players more control?**

> **From the book.** Games of skill are "systems of judgment that
> determine which player is the best" — athletic contests, serious;
> games of chance are relaxed, casual, "much of the outcome is up to
> fate." The right mix is an audience question (Lens #19: the Player —
> German board-gamers famously tolerate less chance than American
> players). The classic balancing method is **alternation**: dealing a
> hand is pure chance, playing it is pure skill — tension and
> relaxation in rhythm. And designer David Perry's addictive-design
> triad rides with the lens: players should at all times be
> "exercising a skill, taking risks, and working a
> strategy."[^aogd-svc]

## Why our design prompts it

Because combat shipped with a radical answer — **zero new
randomness**, a bit-for-bit deterministic session — and the rest of
the world quietly follows the same rule (no resolution anywhere rolls
a die). Schell's questions are the right cross-examination of that
choice: where did the chance *go*, what replaced its functions
(leveling, variety, relaxation), and does the answer hold for every
audience the game wants?

## What the design answers

### Q1 — Judged, emphatically — but risk survived the purge of chance

The players are here to be judged: competence is measured
(bands-not-numbers), the gym proves contested win-rates, NPC≈PC
parity means the judgment is honest. But Perry's triad still passes,
because **risk was never the same thing as randomness**. The
overextend economy, the feint that cracks your own guard if read,
the gambit that exposes you on a whiff — risk here is *exposure to
an opponent's choice*, not to a die. The doctrine, extracted:

> **Uncertainty must be epistemic or environmental, never aleatory
> in resolution.** Your swing never misses because of a roll; you
> lose because the other mind out-read you (epistemic — CombatFog,
> hedged by your own sharpness) or because the world was against you
> (environmental — rain, dark, encumbrance). Poker's tension comes
> from hidden information and reading people, not from physics; we
> kept poker's uncertainty and deleted the shuffle.

### Q2 — Serious, and honestly so — with casual decoupled from chance

Schell pairs casual with chance; the design breaks the pairing. This
is a serious, skill-judged game *where the judgment is kind* (bands,
ZPD difficulty-gating, no public numbers) — and the casual register
exists but is built from **low stakes, not randomness**: the toy
layer, goal-free play, social hours at the bar, authoring. A player
seeking relaxation here isn't handed dice; they're handed a world
that doesn't judge them until they step into a judged arena
(consent gates on combat, opt-in employment). Casual = stakes-free,
not fate-ruled. For a game whose core is education — a system of
judgment by definition — making the judgment honest *and elective*
is the whole trick.

### Q3 — Tedium: answered by automation and natural variance, never dice

Schell's remedy for tedium is sprinkled chance. Ours is structural:
**scripting** (the tedious composes into a program — tedium is a
prompt away from being automated), **no grind by design**
(competence advances on evidenced quality with dedup, not
repetitions), and **natural variance** — no two fires, fights, or
market days are identical because the shared state differs, without
any injected roll. Where the world does "deal a hand," it deals
honestly: procgen weather, who's online, what the vein contains.
The alternation method exists here at *world tempo*, not turn tempo
— **the world deals; every play is skill.** Reading the rock is the
skill; the seam's contents were dealt.

### Q4 — Too random is not our corner; too *solved* is

Nothing rolls, so "add control" is moot — the exposure is opposite:
a deterministic, learnable system risks going stale when solved.
This already happened once, and the design already answered it: the
gym proved the always-parries turtle dead, and the experience pass
added the feint and the fog — *epistemic* depth layered onto
unchanged deterministic physics. That is the standing pattern:
*when determinism goes stale, deepen the hidden-information game;
never reach for dice.* The related exposure is NPC opponents — in a
no-RNG world, an NPC without strategic variety is a memorization
exercise; the brain layer carries more weight here than in games
where dice fuzz the difference.

### The leveling function chance used to serve

One thing chance does in other games that nothing does here: let
weaker players sometimes beat stronger ones. The design's honest
substitutes are consent and terms (you choose your fights and their
stakes), the ZPD (judged practice at your level), formations and
parties (the weak stand with the strong), and ambush/preparation
(position beats raw band). What it deliberately refuses is the
pity-roll. For an honesty-first educational game that's coherent —
but it means matchmaking-by-consent is load-bearing for newcomer
experience, and playtesting should watch exactly there.

## Tensions & risks

- **Audience narrowing is real.** Schell's audience question cuts:
  a no-dice, judged world selects for players who want judgment.
  The toy layer and consent gates are the counterweight — the
  casual register must stay genuinely stakes-free, or the game is
  only for the serious.
- **Determinism raises the solved-game ceiling permanently.** The
  feint/fog build answered the first staleness; there will be a
  second (every deterministic system develops a meta). The pattern
  is set — deepen epistemics, never add RNG — but it implies
  ongoing design spend wherever players optimize.
- **The world's "deals" must stay legible as world, not as dice.**
  Environmental uncertainty reads as fair only while its causes are
  perceivable (weather has a sky, the vein has strata). An
  environmental input whose cause is hidden is experientially a
  die roll — the emergence-ships-with-narration rule guards this.
- **NPC strategic poverty shows more without RNG.** A brain that
  cycles three tactics is transparent in a deterministic world.
  The combatant/wary/converses brains carry real experiential
  load; their variety budget deserves respect.

## Implications

1. **The uncertainty-provenance rule joins the slate checklist**
   (eighth question): *where does uncertainty in your system come
   from — hidden minds, world state, or dice?* Aleatory resolution
   is banned; a proposed roll must be re-derived as either an
   epistemic contest or an honest environmental input.
2. **"When stale, deepen epistemics" is the anti-meta playbook** —
   codified from the feint/fog precedent: staleness in any
   deterministic system (combat, markets, mining) is treated as
   missing hidden-information depth, never as missing variance.
3. **Consent-and-terms is the leveling mechanism** — protect it as
   such. Anything that pressures players into judged contests above
   their band (social pressure, economic necessity) erodes the
   substitute for chance's mercy; the chosen-hafta rule applies to
   stakes, not just time.
4. **Perry's triad is a session-quality probe for playtests:** in
   any recorded session, was the player exercising skill, taking
   risks, and working a strategy? Long stretches failing all three
   mark either missing toy value or missing stakes — data for where
   design spend goes next.
5. **Budget NPC strategic variety as a first-class cost** of the
   no-RNG doctrine — every judged arena an NPC serves needs its
   brain to present genuine strategic alternatives, reviewed
   whenever a new gambit or system enters.

---

[^aogd-svc]: Jesse Schell, *The Art of Game Design: A Book of
    Lenses*, 3rd ed. (CRC Press, 2020) — **Lens #41, the Lens of
    Skill vs. Chance**, from the game-balance chapter (read from the
    author's Google Play edition, 2026-07). The four questions, the
    judgment-vs-fate characterization, the audience note, the
    deal/play alternation method, and David Perry's
    skill/risk/strategy triad are Schell's; all analysis ours.
