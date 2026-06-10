# Lens: The Player

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Layers interrogated: both** — the platform must serve any vertical's
> players; the game serves students (and a demo audience).

## The lens

You are not designing for yourself. The Lens of the Player asks you to
hold the actual audience in mind constantly: who are they, what do they
already like, what do they expect, what will delight them, and — the
part designers skip — who is being served *badly*? Real empathy means
modeling players unlike you, including the ones your medium quietly
excludes.

> **From the book.** "Stop thinking about your game, and start thinking
> about your player," Schell says: ask "what do they like? What don't
> they like? Why? What do they expect to see in a game?" and only *then*
> "if I were in their place, what would I want to see?" The designer
> "should always be … an advocate for the player" — empathy as a working
> tool used constantly, not a one-time persona exercise. And the sharper
> move beyond imagining them: "even more useful is watching them play
> your game."[^aogd-pl]

## Why our design prompts it

Because the audience is specific, double, and partly excluded —
each of which this lens insists you face. The
[onboarding](../slates/onboarding-slate.md) and
[char-gen](../slates/char-gen-slate.md) slates name the players outright;
[interaction-philosophy.md](../interaction-philosophy.md) names, with
unusual honesty, the players the text medium serves *worse*.

## What the design answers

- **The audience is named.** Learners plus an investor-demo audience;
  first-timers arriving with zero prior knowledge; the whole intake is
  built to be "welcoming, forgiving, low-friction"
  ([char-gen](../slates/char-gen-slate.md)). The design knows who's at
  the door.
- **Player-type difference is built in.** The lounge flavor tags
  (competitive / explorer / cozy / roleplay / chaos / builder /
  lone-wolf — [lounge](../slates/lounge-slate.md)) are essentially
  self-selected player types, used to seat you with compatible people.
  The design assumes players differ and routes on it.
- **The "player" may be an agent.** Roles are role-shaped, not
  human-shaped ([interaction-philosophy.md](../interaction-philosophy.md));
  an LLM participant perceives and acts through the same channels. An
  unusual, forward extension of who "the player" can be.
- **The exclusions are owned, not hidden.** "Literacy itself excludes" —
  pre-literate players, some dyslexic players, non-native speakers are
  "served worse by a wall of text," and the doc names the mitigations
  (text-to-speech, AI narration, AI translation) as "obligations, not
  afterthoughts."

## Tensions & risks

- **Two audiences can distort each other.** The onboarding serves
  "learners + investor-demo audience" at once. The demo wants to
  *impress fast*; the learner wants *forgiving depth*. The "you're in
  for anything" spectacle serves both, but demo-impressiveness can quietly
  bend priorities toward the dazzle a learner doesn't need. Keep
  straight which audience each decision is for.
- **Students aren't a monolith, and the tags only cover play-style.**
  Age, subject, and skill-level vary enormously; the flavor tags sort
  *how you like to play*, not *what you're ready to learn*. The empathy
  the lens demands has to extend to learning-level, which nothing
  currently models internally (the optional external sensor would).
- **The exclusion mitigations sit in the decorational layer — and that
  collides with a core rule.** TTS, AI narration, and translation are
  exactly the "decorational" layer the platform says the game must work
  *without* ([interaction-philosophy.md](../interaction-philosophy.md)).
  Taken literally, that means the base game excludes the very players
  this lens says to serve. Accessibility can't be optional decoration if
  the empathy is real.
- **Minors are players.** Designing for children changes consent,
  safety, and tone wholesale (the [Transformation](./transformation.md)
  overlap). "Student" quietly includes "child," and that has to be
  faced, not averaged away.

## Implications

1. **Separate the two audiences in design reasoning.** For each feature,
   ask whether it serves the *learner* or the *demo-evaluator*, and
   don't let demo-impressiveness distort the learner experience. The
   spectacle can serve both; forgiving depth is for the learner and must
   not be sacrificed to the pitch.
2. **Exempt accessibility from decorational-optionality.** Decide
   explicitly that the literacy-exclusion mitigations are *not* optional
   decoration — they're obligations the platform's own doc already calls
   them. This is a genuine tension with "works without decoration" and
   deserves a stated resolution, not silence.
3. **Extend empathy past play-style to learning-level.** The flavor-tag
   system is a good model of designing for differing players; the same
   care is owed to differing *readiness*, which the standalone game must
   handle without the external sensor.
4. **Name "child" inside "student."** Where the audience includes
   minors, make it explicit and route the consequences to
   [Transformation](./transformation.md) rather than
   letting an averaged "student" hide them.

---

[^aogd-pl]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #19, the Lens of the Player**
    (p. 131), from the chapter "The Game Is Made for a Player."
    "An advocate for the player" and "even more useful is watching them
    play your game" are Schell's. 3rd-edition print pagination; lens
    number stable across editions.
