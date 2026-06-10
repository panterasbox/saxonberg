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

> **From the book.** Schell frames elegance as a balance to chase
> deliberately: the most elegant games are built from a *small* number
> of elements that each serve a *large* number of purposes, so the game
> feels rich without feeling complicated. He points at the classics —
> few rules, vast depth — and the trap is the inverse: piling on
> elements to add features until the design sags under its own part
> count.[^aogd-el]

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

[^aogd-el]: Jesse Schell, *The Art of Game Design: A Book of Lenses*
    (CRC Press) — the **Lens of Elegance**, from Schell's treatment of
    game balance. Cited by lens; chapter pointer approximate; page
    numbers omitted (edition-dependent).
