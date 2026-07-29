# Lens: Infinite Inspiration

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Fresh pass, entry 1 (2026-07-28).** First entry written against
> the game as it now stands — dozens of shipped subsystems, a
> near-fully-designed whole, nothing playtested. Earlier lens entries
> predate most of the design; their fate is under review.

## The lens

Stop looking at your game, and stop looking at games like it. Look
everywhere else. Two questions: **what experience have I had that I
want to share with others?** — and **in what small way can I capture
the essence of that experience and put it into my game?**

> **From the book.** Schell frames the lens with the juggler who
> changed his approach to creativity: an unremarkable-looking man at a
> juggling convention doing moves nobody could copy — one learned from
> a ballet, one from a flock of geese taking off from a lake, one from
> a paper punch machine. Other jugglers get their tricks from each
> other, he says; that can make you good, never distinct. When someone
> across the gym apes the ballet move, it just looks dumb — "they can
> copy my moves, but they can't copy my inspiration." The lens's
> epigraph is Ram Dass: when you know how to listen, everybody is the
> guru. Schell pairs this lens explicitly with Essential Experience:
> Infinite Inspiration finds the beautiful experience out in the
> world; Essential Experience distills it into the game.[^aogd-ii]

## Why our design prompts it

Because this lens, running unnamed, **is the honest-model theory.**
The design-philosophy discipline — model the cause honestly, in real
units, and let consequences fall out — is the Lens of Infinite
Inspiration institutionalized as substrate policy. Most games get
their tricks from each other: HP bars, XP curves, status-effect tags,
mana pools — moves copied from other jugglers. Saxonberg's bleeding
came from hematology, its thermos from Newton's cooling, its shock
from Ohm's law, its competence from Bayesian knowledge tracing, its
weather from meteorology, its armor from materials science. The
subsystem docs read like a curriculum because that's where the
inspiration came from.

And the sharpened form of the lens — the formulation this entry
canonizes:

> **Draw inspiration from how reality is modeled *to the average
> learner*, and inspiration is near infinite — because you're
> describing everything.**

Not raw reality (bottomlessly deep, unauthorable) but reality **as
taught**: the textbook layer, the intro course, the USDA table, the
clinical reference range, the field guide. That corpus:

- **covers everything** — every discipline humans teach is a shelf of
  world-models waiting to be world;
- **is already leveled** — course tiers are fidelity tiers, which is
  Principle 1's "smallest fidelity content needs" handed to us
  pre-graded;
- **is already dataset-shaped** — Principle 4's authoring-as-ingestion
  exists because reality-as-taught arrives in schemas;
- **and is somebody's product catalog** — for the education vertical,
  a learning platform's subject taxonomy is literally an index of
  inspirations. Every course catalog is a content roadmap.

The juggler's boast is the moat claim in miniature. A competitor can
copy the *move* ("status effects, all the way down" is public the
day the video ships). They can't cheaply copy the *inspiration*,
because the inspiration is the real model — and the real model is
what generates the emergent interactions that make the move worth
copying. Copied bleeding is a tag with a timer. Inspired bleeding is
blood volume, oxygen transport, and consciousness — and it composes
with drowning and altitude for free.

## What the design answers

### Platform layer

**Q1 — the experience to share:** *understanding something real, and
having the world yield to that understanding.* The Andy Weir
experience: you reason from principles and reality complies. The
moment the textbook diagram becomes operative.

**Q2 — the small way it's captured:** make the world's causes real so
that understanding is *power*. `analyze` reveals the same model the
course teaches; a learner's real knowledge transfers into the world,
and the world's behavior teaches back. The pedagogical seam is the
capture mechanism — one engine, prose for players, physics for
students.

The invented sciences extend the lens rather than break it: magic
draws from the *method* of science — conservation, fields,
measurement, falsifiability — not from other games' mana systems
(mana is content, never an engine word). Inspiration from
"everywhere else" includes the shape of inquiry itself.

### Game layer

**Q1:** *becoming someone who knows* — the university experience:
arriving nobody, picking a field, being changed by study, and having
a community register the change.

**Q2:** the campus, the majors, the registrar, the dorm you decorate,
the guilds keyed to a subject taxonomy, the conferral that fires when
real mastery lands. Vision.md drew from the lived university, not
from other games' hub towns — the game-layer application of the same
lens.

## Tensions & risks

- **"Small way" is the load-bearing phrase.** The lens asks for the
  *essence*, captured small — Schell's snowball-fight rule: you don't
  need real snow to deliver "it was so cold." Inspiration-from-reality
  without that clause collapses into simulation-for-its-own-sake.
  Principle 1 (smallest fidelity content needs) is our standing
  defense; this lens is where it gets its philosophical warrant.
- **We do still speak other games' language.** NetHack's consumable
  identification, CK3's trait roster, MUD conventions — real
  influences, some of them move-shaped. The working discipline:
  import the *question* a game answered (recognizability, opposed
  dispositions), re-derive the answer from the honest substrate, and
  when we keep a move for legibility's sake, keep it knowingly.
  Contrast-with-convention (HP bars) is vocabulary, not theft — but
  this lens is the standing audit: for any new mechanic, ask *where
  did this actually come from?*
- **Near-infinite inspiration is near-infinite scope.** The lens
  removes the idea shortage; it does nothing about finishing.
  Systems-over-content and never-half-grown are the governors that
  keep an infinite library from becoming an infinite backlog.

## Implications

1. **Canonize the learner-model formulation.** It belongs in
   [design-philosophy.md](../design-philosophy.md) beside Principle 4
   as the *inspiration corollary*: reality-as-taught is the
   inspiration library; curricula are content roadmaps. (Not yet
   applied — proposal.)
2. **It's the purest "why us" for the education-video track.** "You
   can copy the moves; you can't copy the inspiration" is the moat
   argument stated as a story, and the juggling anecdote's structure
   (show three moves, name three non-game sources) is practically a
   video format: show bleeding/thermal/shock, name hematology/
   thermodynamics/Ohm's law.
3. **The partner taxonomy is an inspiration index.** For the vertical
   product, the mapping runs both directions: their courses feed our
   Disciplines (the credential seam), and their catalog *suggests our
   next subsystem*. The lens turns a content-licensing question into
   a design-pipeline question.
4. **Standing audit question for new slates:** what is this
   subsystem's non-game inspiration, named in one line? Every slate
   that can't answer is drawing from other jugglers.

---

[^aogd-ii]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #13, the Lens of Infinite
    Inspiration**, from the chapter "The Game Begins with an Idea"
    (read from the author's Google Play edition, 2026-07). The
    juggler anecdote, the Ram Dass epigraph, the two questions, and
    the pairing with Essential Experience are Schell's; the
    learner-model formulation and all analysis are ours.
