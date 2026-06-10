# Lens: Character

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Layer interrogated: the game** (NPCs are content), on platform
> mechanism.

## The lens

Memorable characters have clear, distinct traits; they feel like they
want things; and players form real relationships with them. The lens
asks: what makes each character distinct? What do they want, and does it
show in everything they do? Do they feel *alive* — and do players come
to care?

> **From the book.** Schell's craft point is that characters are built
> from *traits* and revealed through *action and relationship*, not
> description — we learn who someone is by what they do and how they
> treat others. He also warns about the line where a character that
> *almost* feels real becomes unsettling instead of endearing; the goal
> is a character the player believes in, which is not the same as one
> that's technically lifelike.[^aogd-ch]

## Why our design prompts it

Because characters are the project's declared heart — "NPCs are where
the personality lives," carried by a designer with improv and
screenwriting instincts. The NPC slates
([npc-behavior](../slates/npc-behavior-slate.md),
[npc-dialogue](../slates/npc-dialogue-slate.md),
[recognition](../slates/recognition-slate.md)) and named figures like
Dr. Limen, Dave, and Gus make this lens central, not peripheral.

## What the design answers

- **Voice and leadership.** NPCs *lead* dialogue — the barkeep opens
  "Road dust on you. Bad time to travel, what with the bandits on the
  north pass" rather than waiting on keywords
  ([npc-dialogue](../slates/npc-dialogue-slate.md)). Voice — what they
  volunteer and how they say it — is the primary personality surface.
- **Autonomy that reads as life.** Routines and idle business (Gus's
  "idle business" is the worked example), plus engagement slots that
  make an NPC believably *interruptible* — addressing one pauses its
  patrol because its attention is genuinely engaged
  ([npc-behavior](../slates/npc-behavior-slate.md)). Action reveals
  character, exactly as the lens wants.
- **Memorability via salient features.** Unrecognized NPCs are described
  by curated `distinctiveFeatures` — "the tall stranger with a scar
  through one eyebrow" ([recognition](../slates/recognition-slate.md)).
  Distinctness is authored in.
- **Named exemplars carry it.** Dr. Limen (a brain in a jar — "I'm three
  buildings over, in a jar, quite comfortable, thank you"), Dave (warm,
  deliberately blank-slate), Gus (idle business plus the hidden-watch
  secret).
- **Props as character.** Gus's watch — character expressed through an
  object (and a soft diegetic limit), cheap and text-friendly.
- **Text dodges the uncanny valley.** The farmer-NPC-wave argument
  ([interaction-philosophy.md](../interaction-philosophy.md)) is exactly
  Schell's "almost real is unsettling" warning, answered by prose that
  describes rather than impersonates.

## Tensions & risks

- **The richest character mechanism is the most deferred.** LLM and
  scripted "brains" are future waves
  ([npc-dialogue](../slates/npc-dialogue-slate.md)); v1 dialogue is
  canned/tree, which risks the "Eliza failure" the slate itself names.
  The *character ambition outruns the shipped mechanism* — memorability
  in v1 can't bank on the unbuilt LLM.
- **A blank canvas isn't (yet) a character.** Dave is "deliberately
  blank-slate," a surface personality "accretes" onto from interaction.
  That's a real bet, but by Schell's standard a blank NPC is a
  *non-character* until the accretion happens — and that accretion is
  unproven. Good intuition, untested hypothesis.
- **Memorability is authoring work, not automatic.** "The tall stranger
  with a scar" only exists if an author curated the scar. Uncurated NPCs
  are generic by default. A populated campus needs that curation at
  scale — which, without LLM, is human authoring effort the design is
  betting heavily on.

## Implications

1. **Design v1 memorability *within* canned/tree limits.** Since LLM is
   deferred, lean on the levers that work in text today: a strong
   NPC-led opening line, curated salient features, a prop, a routine.
   Don't stake character on the unshipped brain.
2. **Make a minimum memorability checklist for any speaking NPC.** At
   least: one distinctive feature, one volunteered hook (the NPC leads),
   and a want that shows in behavior. This is the
   [Indirect Control](./indirect-control.md) "led-ness" check pointed at
   character.
3. **Lean on props-as-character.** Gus's watch is high-leverage, cheap,
   and text-native — an object can carry personality and secret at once.
   Treat it as a repeatable technique.
4. **Treat the blank-canvas bet as a hypothesis to test.** Does
   personality actually accrete onto a deliberately-blank NPC, or does
   blank stay blank? Worth validating before relying on it for a roster.

---

[^aogd-ch]: Jesse Schell, *The Art of Game Design: A Book of Lenses*
    (CRC Press) — the **Lens of Character** (with the **Lens of Character
    Traits**), from the chapter "Worlds Contain Characters." Cited by
    lens and chapter; page numbers omitted (edition-dependent).
