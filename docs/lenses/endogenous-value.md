# Lens: Endogenous Value

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Layers interrogated: both.** Manufacturing value is the platform's
> core trick; anchoring that value to something real is the game's
> burden.

## The lens

Games create their own economies of meaning. A pile of gold, a high
score, a rare drop — these have no value outside the game, yet players
come to care about them intensely. That manufactured caring is
*endogenous value*, and it is one of a game's most powerful forces: it's
what makes the player *want*. The lens asks what players value, how to
make it more valuable, and — the sharp part — whether the things the
game makes valuable line up with the things the game is actually about.
Endogenous value pointed at the wrong target produces players who grind
for a number while the real goal rots.

> **From the book.** Schell (crediting Greg Costikyan, who borrowed the
> word from biology) defines endogenous value as worth "caused by factors
> inside the … system": "things that have value inside the game have
> value only inside the game" — Monopoly money means nothing outside
> Monopoly. His sharp move is to treat it as a gauge: it's "an excellent
> measure of how compelling a game really is," "a direct reflection of
> how much players care about succeeding." The lens asks "What is
> valuable to the players in my game? How can I make it more valuable to
> them? What is the relationship between value in the game and the
> players' motivations?" That last question — value's relationship to
> motivation — is exactly the "anchor" this entry worries about keeping
> intact.[^aogd-ev]

## Why our design prompts it

Because manufacturing endogenous value from real-world effort is
*literally the platform thesis*. [standard-model.md](../standard-model.md)'s
periodic table of gamification is a value-generation grammar: a sensor
emits "this happened," and the mechanics on top turn it into something
the player cares about. "Real life in, game out." The entire bet is
that in-game value will become valuable enough to motivate real
engagement.

And that's also where it gets dangerous. The educational wager is that
in-game value (a skill, a Guild rank) will pull a student toward real
learning. If the in-game value ever floats free of the real value it's
supposed to represent, you get the classic gamification failure — points
chased for points' sake — and the pedagogy quietly dies while the
metrics look great. This lens is how you watch that seam.

## What the design answers

### The platform's answer

The platform's endogenous value is, by construction, **tied to real
effort**. The value isn't minted arbitrarily; it's minted by a *sensor*
reporting a real act ([standard-model.md](../standard-model.md)). And
the "meaning-free events" design — the sensor atom is dumb; "it does
**not** know whether it counts toward your Dentistry skill or your
Literature guild," the interpreters on top assign meaning — is precisely
the value-assignment layer made explicit. One dumb signal of real
effort, many interpreters turning it into in-game worth.

### The game's answer

Saxonberg has a healthy spread of endogenous value, and notably *two
different kinds*:

- **Effort-anchored value** — skills, Guild rank, the major, "depth is
  earned, not chosen" ([char-gen](../subsystems/char-gen.md)).
  Capability is endogenous value you accrue by doing, and (in the
  education vertical) it traces back to real subject mastery. The
  honesty seam matters here: the substrate refuses "0–100 sliders," so a
  "chemistry skill" can be anchored to real chemistry rather than a free
  number. That anchoring is what keeps the value *honest*.
- **Pure-play value** — the dorm room you authored
  ([eternal-university](../slates/builds/eternal-university-slate.md)),
  recognition by NPCs who remember you
  ([recognition](../slates/tails/recognition-slate.md)), emotes, the drinks
  at Dave's bar. The dorm is the clean exemplar: it's valuable purely
  *because you made it* — the onboarding climax. This value answers to
  nothing real and shouldn't have to; ownership and expression are
  meaning enough.

The design intuitively reaches for the strongest endogenous-value move
there is — **authorship** — at the most load-bearing moment (the first
session's climax). You value the room because you built it. That's
endogenous value at its purest and most durable.

## Tensions & risks

- **The two kinds of value must not be confused.** Pure-play value
  (the dorm, an emote) is *fine* arbitrary — it draws its worth from
  ownership and expression. Effort-anchored value (a skill, a Guild
  rank) is *only* legitimate while it traces to the real value it
  represents. If an anchored value silently goes pure-endogenous —
  "study streak" prized for the streak, not the learning — the
  pedagogical claim breaks and nobody notices, because the number still
  goes up. Goodhart's law lives in this gap.
- **The standard gamification layer is the detachment-prone one.**
  [vision.md](../vision.md) adds "achievement tracking, badges, and
  leaderboards" as "additional layers of motivation." These are the
  *most* arbitrary, *least* anchored form of endogenous value — the
  canonical surface where players optimize the metric and abandon the
  goal. They're not wrong to include; they're the ones to watch.
- **Anchoring is work, and it's invisible when skipped.** "A chemistry
  skill maps to real chemistry mastery" is a design *promise*; honoring
  it requires the sensor→skill mapping to actually be faithful. A
  sloppy mapping produces a skill that *looks* anchored but isn't —
  endogenous value cosplaying as real value.

## Implications

1. **Classify every value-bearing element as pure-play or
   effort-anchored, explicitly.** The two have opposite rules:
   pure-play may be arbitrary; anchored must trace to real worth. Make
   the distinction a design-time label so an anchored value can never
   silently float free.
2. **Make the anchor a checked property, not a promise.** For any
   effort-anchored value, there should be a stateable mapping from the
   real act to the in-game worth, and the honesty discipline ("real
   units, no sliders") is the guard. An anchored value with no faithful
   mapping is a bug, not a feature.
3. **Treat badges/leaderboards as the Goodhart watchlist.** Ship them if
   they help, but tag them as the detachment-prone layer and review them
   against "are players optimizing this instead of the goal?"
4. **Lean on authorship as the pure-play value engine.** The dorm is
   the proof that "value because I made it" is the most durable
   endogenous value the game has. More authorship surfaces = more value
   that needs no anchor and never Goodharts.
5. **Hand the detachment question to [Motivation](./motivation.md) and
   [Transformation](./transformation.md).**
   Endogenous value that detaches into pure extrinsic reward is the
   shared boundary with both of those lenses; this lens locates the
   seam, they judge it.

---

[^aogd-ev]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #7, the Lens of Endogenous Value**
    (p. 43), from the game-definitions chapter (section "No, Seriously,
    What Is a Game?"). Schell credits Greg Costikyan for "endogenous"; the
    Monopoly-money and roulette examples are his. (It *is* a separately
    named lens — an earlier version of this note mistook it for an
    unnamed concept in the game-balance chapter; corrected against the
    3rd edition.) 3rd-edition print pagination; lens number stable across
    editions.
