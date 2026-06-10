# Lens: Elegance

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Layer interrogated: the platform** (the substrate's combinatorial
> design), with a note for the game.

## The lens

Elegance is doing the most with the least. The test is concrete: count
the elements in your design, and count the *purposes* each one serves.
An elegant element pulls many duties at once; an inelegant design has a
separate part for every job. The questions: what are my elements? How
many purposes does each serve? Could a few elements be merged into one
that does all their jobs — or is a single element strained across too
many?

> **From the book.** Schell makes the test literal: list your elements,
> then "count up" the purposes of each "to give the element an 'elegance
> rating.'" Elements with one or two purposes are candidates to combine
> or remove; elements with several should be pushed to take on even more.
> The classics are "masterpieces of elegance" — few elements, many
> purposes each. But he guards the other flank in the very next breath:
> "there is such a thing as honing a thing down too far." The lens would
> straighten the leaning tower of Pisa — "it might be elegant, but it
> would be boring; it would have no character." Monopoly's hat and
> battleship serve no mechanical purpose and are beloved anyway. Elegance
> is a force to *balance against character*, not to maximize
> blindly.[^aogd-el]

## Why our design prompts it

Because elegance is the platform's explicit architectural bet.
[standard-model.md](../standard-model.md): a shallow spine of kinds
crossed with a wide library of composable traits, so "a torch, a
lantern, and a glowing sword aren't three classes — they're three
combinations." Mixins are described as bonds; "composition *is* the
chemistry." The capacity model in
[design-philosophy.md](../design-philosophy.md) is the same instinct:
"the engine imposes typed shape; authors compose semantics." The whole
substrate is a wager that few primitives yield enormous range — which is
the definition of elegance, and therefore the thing to hold the lens to.

## What the design answers

The platform scores well on purposes-per-element, in several places:

- **Mixins.** Each models one concern and bonds into endless compounds.
  One `LightSource` mixin serves torches, lanterns, glowing swords,
  windows, the sun. High purposes-per-element by construction.
- **Everything is Stuff.** One base class gives every entity identity,
  lifecycle, security, persistence, and an event surface — one element,
  universal duty ([standard-model.md](../standard-model.md)).
- **`Quantity<U>`.** A single substrate serves light (lux/Kelvin),
  material (kg/m³), mass, time — one element, many subsystems.
- **The command string.** The single most elegant element in the
  design: one primitive (a string on a bus) yields the CLI, web forms,
  side-panel buttons, the help system, aliases, macros, the scripting
  surface, the future NLP seam, *and* the AI-agent interface
  ([interaction-philosophy.md](../interaction-philosophy.md)). Author
  the command once; a dozen artifacts fall out. That is elegance at its
  most extreme.
- **Text itself.** One medium renders any object, any domain, any
  vertical.

## Tensions & risks

- **Elegance is purposes-per-element, not abstraction-per-element — and
  this project conflates them at its peril.** Adding an abstraction
  *feels* like elegance (it looks clean) but often adds an element
  without adding purposes — the exact failure the project's own
  "stop adding abstraction" discipline names ("N=2 isn't a class;
  'what are we naming?' with no answer = drop the tag"). A registry
  where a constant would do is *inelegant*: one more element, no more
  purposes. The mixin/composition aesthetic is seductive precisely
  because over-abstraction wears elegance's clothes.
- **Uniformity is not the same as elegance.** "Everything is Stuff" and
  "every channel has honest physics" are *uniform*, but the per-channel
  physics is a lot of machinery. Uniform machinery is only elegant if
  each piece serves many purposes; a uniform pile is still a pile. The
  honest-physics substrate has to keep earning its part count (the
  [Unification](./unification.md) theme-orphan audit is the same
  concern from the theme side).
- **The elegance is author-facing, paid for by engine complexity.**
  Bag-of-stuff authoring is elegant *for authors*; the engine making it
  so is not simple. This is a good trade — but it means "elegant" is
  true at the surface and false underneath, and the trade is only worth
  it while the surface simplicity is real.
- **Schell's counter-warning: don't hone away the character.** The lens
  has a blind spot Schell names himself — "there is such a thing as
  honing a thing down too far." A text world lives on authored detail
  that serves *no mechanical purpose*: a flavor line, an odd NPC habit,
  the leaning-tower tilt. By a naive purposes-per-element count those
  read as dead weight to cut. They are the opposite — the charm that
  makes the world worth being in, which the project's own "props real or
  cut" and "worldbuilding is dwelling" instincts already prize. The
  merge-or-cut rule belongs to *mechanism*; pointed at the texture that
  gives a place its feel, elegance becomes the enemy of character —
  exactly the over-correction Schell flags with the straightened tower
  of Pisa.

## Implications

1. **Adopt purposes-per-element as the literal elegance test, and point
   it at the project's over-abstraction tendency.** The
   "what are we naming?" check *is* this lens: a proposed abstraction
   earns its place only if it adds purposes, not just structure. An
   element serving one purpose is a merge-or-cut candidate.
2. **Protect author-and-player-facing simplicity as the real product.**
   Engine complexity is acceptable *only* as long as it buys surface
   simplicity. When a subsystem complicates both the engine and the
   authoring surface, the trade has failed.
3. **Audit for both failure modes.** One-purpose elements (cut or
   merge) *and* abstractions that add an element without adding purposes
   (the project's signature risk). Elegance is lost in either
   direction.
4. **For the game layer, elegance means few mechanics with deep
   consequences** — a concern that lands when the RPG/progression rules
   are designed (currently deferred). Note it as future; don't
   manufacture mechanical elegance ahead of the mechanics.

---

[^aogd-el]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #49, the Lens of Elegance**
    (p. 241), from the game-balance chapter (section "Elegance"). The
    "elegance rating" (count purposes per element) and the
    leaning-tower-of-Pisa / Monopoly-tokens counter-warning are Schell's;
    that counter-warning leads directly into his **Lens #50, the Lens of
    Character** (p. 243), about a game's charm rather than its NPCs.
    3rd-edition print pagination; lens number stable across editions.
