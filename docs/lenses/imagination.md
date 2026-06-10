# Lens: Imagination

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Layer interrogated: the platform** (the text medium is platform-
> level), with heavy game-level consequences.

## The lens

Every game leans on the player's imagination to fill what the game
itself doesn't render — and a designer can decide *how much* to ask for
and *how much help* to give. Communicate too little and the player is
lost; communicate too much and there's no room left for them to
imagine, which is its own kind of poverty. The questions: what does my
game ask the player to imagine? What do I give them to spark it? And am
I leaving them room, or doing all the imagining for them?

> **From the book.** Schell frames it as a *balance* — "the balance
> between detail and imagination" — and his rule of thumb is to "use a
> little detail to get a lot of imagination." A few well-chosen details
> recruit the mind to do the rest (chess lets you "control all the
> members of a royal army," a fantasy "tied to reality by a thin
> thread"); the lens's pointed pair of questions is "what details
> *inspire* imagination?" versus "what details *stifle* it?" Because, he
> says, "the imagination of the player is where the gameplaying
> experience takes place," giving it good raw material and room does work
> no art budget can match.[^aogd-im]

## Why our design prompts it

Because this lens is the entire case for the medium.
[interaction-philosophy.md](../interaction-philosophy.md) states it
outright: "the expressive ceiling is the player's imagination, not the
art budget," and (quoting Schell) a consistent, compelling world "fills
the guest's imagination, and mentally, the guest enters the world." A
text game doesn't *depict*; it *evokes and lets the reader render*. The
Imagination lens isn't one consideration among many here — it's the
foundation the whole text-first decision rests on.

## What the design answers

- **Text dodges the uncanny valley by handing rendering to the reader.**
  The farmer-NPC-wave argument
  ([interaction-philosophy.md](../interaction-philosophy.md)): prose
  describing a wave carries the information without impersonating an
  inner life, so the imagination supplies the life. Graphics fall into
  the valley exactly where text degrades gracefully.
- **Consistency is the fuel.** Both philosophy docs converge here: the
  honest, internally-consistent model is *what the imagination latches
  onto*. "The two docs are the two halves of 'language or numbers'" —
  the numbers (honest model) make the language (prose) a faithful
  render, not painted-on flavor. Every honesty investment in
  [design-philosophy.md](../design-philosophy.md) pays an imagination
  dividend.
- **The engine gives the imagination good raw material.** The five-sense
  perception substrate ([senses.md](../subsystems/senses.md)) with
  `<sense>`-tagged MML, the prose-templating layer
  ([prose.md](../subsystems/prose.md)), and the Scene composer feed
  multi-sensory, perspective-correct detail — more for the imagination
  to work with than sight alone.
- **Layered presentation keeps the evocation honest.** Players get
  evocative prose; students can pull canonical numbers via `analyze` /
  instruments ([design-philosophy.md](../design-philosophy.md)). The
  imagination renders the scene; the instrument pins the fact.

## Tensions & risks

- **Verbosity is the hard ceiling — and it's the imagination ceiling
  too.** [interaction-philosophy.md](../interaction-philosophy.md): text
  is bounded "not by what it can say but by how much you have to read."
  Over-describe and you both exhaust the reader *and* leave the
  imagination no room — the same wall from two sides. The fidelity axis
  (more detail = worse prose) is, read through this lens, "more detail =
  less imaginative room." The craft is Schell's: evoke with a few
  details, don't specify exhaustively.
- **Unguided imagination collides with pedagogical precision.** For an
  educational game, a student imagining a molecule, an anatomy, or a
  reaction *wrong* is a real failure mode — and free imagination invites
  exactly that. The layered-presentation seam is the resolution (prose
  evokes; `analyze`/instruments pin down), but it has to be reached for;
  prose alone can mislead as easily as it inspires.
- **Decoration can shrink imagination.** AI illustration
  ([vision.md](../vision.md)) is decorational — and showing a scene can
  *replace* the imaginative render rather than support it, dragging the
  experience back toward the uncanny valley the text was chosen to
  avoid. More picture can mean less imagination.

## Implications

1. **Make "leave room to imagine" an explicit prose-authoring
   discipline.** Evoke, don't exhaustively specify. The verbosity
   ceiling and the imagination ceiling are the same line; authoring to
   it is a craft skill worth stating, not assuming.
2. **Use the layered seam to hold imagination and precision together.**
   Prose for the imaginative render, `analyze`/instruments for the
   exact fact — so an educational scene can be evocative *and* unable
   to mislead. Reach for the instrument layer wherever imagining-wrong
   would teach-wrong.
3. **Write an AI-illustration policy from this lens.** Decoration must
   *support* the render, not replace it; guard against over-showing
   (imagination-shrink + uncanny valley). The bar: does the image give
   the imagination more to work with, or do the work for it?
4. **Bank consistency as imagination budget.** Every honesty investment
   is an imagination dividend; this is the concrete payoff of
   [design-philosophy.md](../design-philosophy.md)'s discipline and a
   reason to keep paying it.

---

[^aogd-im]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #51, the Lens of Imagination**
    (p. 244), which appears as "Balance Type #12: Detail vs. Imagination"
    in the game-balance chapter ("Game Mechanics Must Be in Balance").
    "Use a little detail to get a lot of imagination" and the chess
    "royal army" example are Schell's. 3rd-edition print pagination; lens
    number stable across editions.
