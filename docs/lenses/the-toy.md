# Lens: The Toy

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Fresh pass, entry 3 (2026-07-28), revised in place.** Re-read from
> the book and re-run against the game as it now stands — the prior
> entry's "latent toy" tensions have largely been *built* since it was
> written; this revision re-tests. Original in git history.
>
> **Layer interrogated: the game**, with a platform-layer coda — the
> authoring stack is a toy *factory*, which is a platform property.

## The lens

Stop thinking about whether your game is fun to play, and start
thinking about whether it is fun to play *with*. Two questions: **if
the game had no goal, would it be fun at all?** And: **when people see
it, do they want to start interacting with it before they even know
what to do?** A ball is a toy; baseball is the game built on it. If
the thing isn't fun before the goals go on, the goals are propping up
something hollow.

> **From the book.** The lens sits among the prototyping tips ("build
> the toy first"): make sure your toy is fun to play with before you
> design a game around it — you may be surprised by what makes it fun,
> and whole new games become apparent. *Lemmings* began as "a little
> world with lots of little creatures walking around doing different
> things" — the game came after the toy proved fun. David Jones, on
> *Grand Theft Auto*: it "was not designed as Grand Theft Auto. It was
> designed as a medium … a living, breathing city that was fun to
> play" — then they borrowed the game from Pac-Man ("the dots are the
> little people … the ghosts are policemen"). Build toy first and the
> game is "fun on two levels," each supporting the other. Schell names
> **two ways to use the lens**: retrofit toylike qualities onto an
> existing game, or — "the braver way" — invent toys before knowing
> what games will be played with them, as a "divining rod" for games
> you'd never otherwise find.[^aogd-toy]

## Why our design prompts it

Because the GTA quote is nearly a description of this project. A
living, breathing city that is fun to play — Terminus, the campus, the
wilds — built as a *medium*, with the games discovered on top rather
than scripted in. "The game stands alone" asks whether the game works
without the vertical; the Toy asks the sharper question — whether the
world works without *goals*. Saxonberg has real skin in that
question: between authored arcs, the goals are the players' own, and
the world must be fun to inhabit with nothing assigned. (Quests
exist and are wanted in quantity — authored narrative arcs are how
the diegesis tells the world's story — but the toy test is about
the hours *between* them, and a world that's only fun mid-quest
fails it.)

## What the design answers

### Q1 — strip the goals: is it fun to mess with?

The prior entry named three toys and worried they were latent. The
built game answers louder:

- **The physics went from latent to pokeable.** Fire you can light,
  smother, or let burn through a door left open; brine pools that
  electrocute; the thermos and the campfire; weather that fills
  puddles that conduct; liquids you pour, mix, spill, and drink;
  wet firewood that genuinely won't light. The toy loop — *poke it,
  see, form a theory, poke again* — is now the shipped behavior of
  half a dozen interlocking channels, and the emergent interactions
  (metal armor worsens shock; a closed door is a firebreak) are
  exactly the "surprised by what makes it fun" payoffs Schell
  predicts.
- **The legibility surfaces made the toy handleable.** The old fear —
  "the sandbox is a great toy only if you know `analyze` exists" —
  produced a discipline in the meantime: the *mandatory legibility
  surface* (analyze previews that match outcomes, pips on items, the
  check-does-nothing lint). The toy now ships with its own handles.
- **By-hand crafting is a toy inside a game.** The manual build —
  pour, stir, shake, strain, garnish — is fun to *do* regardless of
  the order ticket; off-spec experiments mint generic results instead
  of failing. Bartending is a fidget toy with an economy attached.
- **Scripting is the purest toy in the design.** Commands compose
  into programs; the prompt is an interpreter; demonstration capture
  turns *doing* into *automation*. It has no goal at all — it is
  entirely "fun to play with," and it converts players into makers,
  which feeds the next section.
- **The social fabric got autonomous.** NPC brains (idlers,
  wanderers, patrollers, greeters, reactors, dialogue trees, brains
  that visibly express traits), reactions, emotes — the world is
  worth poking when no other player is on. The prior entry's
  "NPC liveliness is toy-critical" implication was *built*.

**Verdict: Q1 passes on design** — with the honest caveat that
*nothing has been playtested*, and toy-ness is precisely the property
you cannot verify from architecture.

### Q1's inversion — where are the games?

Schell's warning runs one way (games hollow without a toy under
them); Saxonberg's risk runs the *other* way: a magnificent toy with
the games left as an exercise. The design's answer is that the games
are **player-authored and world-supplied, not scripted**: livelihood
(a job, a business, a craft), mastery (Disciplines and bands),
property (the dorm → apartment ladder), standing (renown, influence,
office), combat consented into. And for the education vertical, the
**curriculum is the game built on the toy** — coursework and
credentials are the goal-structure, the world is the ball. That is
"fun on two levels" restated as the whole product thesis: the toy
must be fun *so that* the vertical's game has something true to
stand on.

### Q2 — does it invite interaction on sight?

Still the structural fight of the medium, and the prior entry was
right to call it the biggest threat. What's shipped since: every
clickable previews the command it will type (the ghost command line),
the inspection pane surfaces what's around you, prompt wheels make
choices tangible, the cockpit's affordances are the "pick me up" that
a bare prompt can't say. What hasn't happened: a single stranger
sitting down in front of it. **Q2 is unproven and unprovable until
playtest.**

## Tensions & risks

- **Toy-ness is the one claim architecture can't settle.** Every
  system above *should* be fun to poke; none has been poked by a
  person who didn't build it. The lens converts directly into a
  playtest protocol (below) — until then, Q1's "pass" is a design
  verdict, not an experience verdict.
- **Q2 remains structural.** Text does not invite manipulation by
  existing. The mitigations are real and shipped; whether they fire
  in the first 30 seconds of a stranger's attention is the single
  most important unknown in the project.
- **A toy without playmates is a bad toy.** Goal-free fun leans on
  presence — other players, live NPCs. Brains and the lounge fight
  the cold start, but server-emptiness still fails the lens no
  matter how good the substrate is.

## Implications

1. **"Build the toy first" becomes "playtest the toy first."** The
   first playtest protocol should be goal-free: hand a stranger the
   world with no instructions and *watch what they touch* — Q2
   measured directly, and Schell's "surprised by what makes it fun"
   harvested deliberately. What testers poke unprompted is data no
   design review can produce; it should steer which toys get surfaced
   hardest.
2. **The authoring stack is the "braver way" institutionalized**
   (platform-layer coda): scripts, blueprints, the CMS, dorm
   personalization are toys players build before anyone knows what
   games they enable — Schell's divining rod, running continuously
   inside the product. The platform's bet is that player-built toys
   become the games we didn't design.

   **The NetHack accretion thesis** (named 2026-07-28): NetHack is
   what it is because years upon years of different devs each coded
   one unique experience in — "the DevTeam thinks of everything" is
   accreted human ingenuity, not a content budget. Dissolving the
   player/maker line aims at the same accretion **over much shorter
   timespans** — but by a different method, because our discipline
   forbids NetHack's (hand-coded pairwise special cases). The honest
   models are the base chemistry set; the community/polity adds
   **nouns** (items, materials, rooms, brains, scripts, recipes) and
   the physics supplies the **verbs** for free — a player-authored
   brass lantern participates in fire, shock, thermal mass, and
   wetness without its author writing any of it. NetHack accreted
   *rules*; we accrete *content over fixed honest rules* — so
   contributions compose instead of colliding — with governed
   rule-growth reserved for the wizard tier, and the trust ladder +
   producer standing making the accretion safe *and paid*.
3. **The GTA anecdote is the education-vertical pitch in miniature.**
   A world built as a medium, proven fun, then given its game — ours
   is the curriculum. When explaining the product to education
   stakeholders, this is the lens to reach for: the toy is why the
   game part works ([study-com-strategy.md](../study-com-strategy.md):
   fun is the carrier).
4. **Keep the legibility discipline as toy policy.** Analyze-preview
   parity, pips, does-nothing lints — these are what make an honest
   model *handleable*. Any new channel ships with its handles or it
   isn't a toy, it's plumbing.
5. **A passed Toy is still the best ethical insurance there is** —
   the more fun with no goals and no rewards, the less temptation
   toward manufactured urgency. Unchanged, and now co-stated with the
   high-stakes guardrail: the game's stakes stay borrowed, its fun
   stays its own. See [Transformation](./transformation.md).

---

[^aogd-toy]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #17, the Lens of the Toy**,
    from the prototyping-tips chapter ("Build the Toy First"; the
    toys-vs-games distinction is Chapter 4's). Re-read from the
    author's Google Play edition, 2026-07. The two questions, the two
    ways to use the lens, and the *Lemmings* / *Grand Theft Auto*
    accounts (David Jones: "designed as a medium … a living, breathing
    city"; "GTA came from Pac-Man") are Schell's; all analysis ours.
