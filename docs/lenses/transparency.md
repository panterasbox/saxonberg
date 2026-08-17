# Lens: Transparency

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses* (his neighboring Lens of the Physical
> Interface is referenced as related); questions paraphrased, analysis
> our own.
>
> **Layer interrogated: the platform** (the cockpit + command line are
> platform surface).

## The lens

A good interface *disappears*: the player stops thinking about the
controls and thinks only about the world. Transparency is that
vanishing. Its companion, the physical interface, is everything the
player actually touches — keyboard, panels, buttons — and the mapping
from those to in-world action. The questions: when the player acts, are
they thinking about the world or about the interface? Where does the
interface intrude, and can that intrusion be designed away?

> **From the book.** Schell's standard, set by an Edward Tufte epigraph,
> is blunt: "No matter how beautiful your interface is, it would be
> better if there were less of it." The ideal interface "becomes
> invisible to the player, letting the player's imagination be completely
> immersed in the game world." His tell is in how players *talk*: not "I
> pressed the red button to make her throw a grappling hook" but "I threw
> my grappling hook and started climbing the castle wall." Players
> "project themselves into games and on some level disregard that the
> interface is there at all, unless it suddenly becomes confusing." The
> physical interface — the six mappings between player and game — exists
> to get out of the way.[^aogd-tr]

## Why our design prompts it

Because the interface is unusual and load-bearing: a command line, a
prose stream, and a cockpit of cards. A CLI is famously the *opposite*
of transparent to a newcomer (a blank prompt tells you nothing), yet
[interaction-philosophy.md](../interaction-philosophy.md) bets the whole
interaction model on command primacy. So the question "does this
interface disappear — and for whom?" is sharp and unavoidable here.

## What the design answers

- **The learnability gradient is the transparency mechanism for a CLI.**
  A newcomer fills a web form, sees the command string it produced
  echoed in the console, and graduates to typing it
  ([interaction-philosophy.md](../interaction-philosophy.md)). The
  interface *teaches itself and then steps back* — opacity converted to
  transparency over time rather than hidden behind a wall.
- **One model, every surface.** CLI, web form, and side-panel button all
  compose the same command string. There's no mode confusion, no
  "which interface am I in" — structurally one surface, which is a
  precondition for transparency.
- **The inspection card keeps the world present, not the menu.** A
  persistent MQL-driven cockpit card surfaces the focused thing and the
  room around you ([card-surface.md](../subsystems/card-surface.md)),
  so attention rests on the world rather than on navigating UI.
- **The failsafe string + per-message-type rendering.** The
  `MmlRenderer` and message templates
  ([message-rendering.md](../subsystems/message-rendering.md)) give
  consistent, readable output; themes (including high-contrast) tune the
  glass without changing what's behind it.
- **Restraint as a transparency policy.** The project's own disciplines
  — chip-strips retired, color-conservatism, reserving global input
  gestures — are all refusals to clutter the glass.

## Tensions & risks

- **A CLI is opaque until the gradient kicks in.** Transparency here is
  *earned*, not innate; the first session is the least transparent
  moment, exactly when intrusion hurts most. This is the same
  discoverability gap the [Toy](./the-toy.md) and
  [Flow](./flow.md) lenses hit, viewed from the interface side.
- **Every card is a transparency tax.** The cockpit's value is keeping
  the world present, but each card added is one more thing the eye
  looks *at* instead of *through*. The world-of-record is the text
  stream; cards that compete with it for attention work against
  transparency even when individually useful. (The retired chip strips
  are the precedent for restraint.)
- **The two-surface fluidity has a small seam.** CLI-plus-forms is
  powerful, but "which surface should I use for this?" is itself a
  flicker of interface-awareness — minor, but real, and worth not
  multiplying.

## Implications

1. **Treat the learnability gradient as core transparency
   infrastructure, not an onboarding nicety.** Command-echo and
   form-to-CLI graduation are *how* a CLI becomes transparent; invest
   in them as such, and measure the first session by how fast the
   interface stops registering.
2. **Hold the card budget.** Each cockpit card must justify its
   attention cost by making the world *more* present than its absence
   would — the inspection card's job is to remove queries you'd
   otherwise type, not to add a thing to watch. Default to the
   chip-strips-retired instinct: when in doubt, fewer cards.
3. **Accessibility is transparency for excluded players.** Screen
   readers, transcripts, and themes ride the failsafe-string +
   canonical-command substrate for free
   ([interaction-philosophy.md](../interaction-philosophy.md)) — make
   that a stated benefit, since it's transparency for players the visual
   cockpit can't reach.
4. **Watch the surface seam.** Keep CLI and forms feeling like one thing
   (they compose the same command); don't let them drift into two
   interfaces the player has to choose between.

---

[^aogd-tr]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #62, the Lens of Transparency**
    (p. 274), from the interface chapter ("Players Play Games Through an
    Interface"). The Tufte epigraph and the grappling-hook projection
    example are from p. 274. (Related: Schell's neighboring **Lens #60,
    the Lens of the Physical Interface** — the six player↔game mappings —
    in the same chapter.) 3rd-edition print pagination; lens numbers
    stable across editions.
