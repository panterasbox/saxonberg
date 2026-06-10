# Lens: Indirect Control

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.

## The lens

A game wants the player to do certain things, but a player who feels
*shoved* stops feeling free, and freedom is most of the fun. Indirect
control is the craft of getting players to *want* what the design needs
— to make the steered choice feel like their own idea. Schell catalogs
the levers: **constraints** (offer a bounded set of options and the
player chooses freely within it), **goals** (give them something to
want and they'll move toward it), **interface** (what's easy to do is
what gets done), **visual design / attention** (the eye, and here the
*reading eye*, goes where you lead it), **characters** (an NPC who
wants something pulls the player into wanting it too), and **music /
mood** (here, prose tone).

The questions: what do we want the player to do? Are we *telling* them
to, or making them *want* to? Which lever is doing the work — and is it
invisible, or can the player feel the hand on their back?

> **From the book.** Schell frames the whole problem around the
> *feeling* of freedom: "The feeling of freedom is so important in a
> game that it merits a new lens" (the Lens of Freedom), and he is
> careful to separate *having* freedom of action from *feeling* free.
> Indirect control reconciles the designer's "vision of what they would
> like the players to do" with the player's free will. He catalogs six
> methods — constraints, goals, interface, visual design, characters,
> music/sound — and is candid that the aim is to "coerce players toward
> ideal behavior without impinging on their feeling of freedom." Of the
> six, **characters** are the one he dwells on: make the player
> "actually care about the characters … willingly wanting to obey them,
> protect them, help them," and "you suddenly have an excellent tool to
> control what the player will and will not try to do." He uses the word
> *manipulate*, and his example is *Ico* — the urge to protect the
> princess drives the player with no instruction given. Tellingly, the
> lens card's final question is a conscience check: "Is my design
> inducing desires I'd rather the player *not* have?"[^aogd-ic]

## Why our design prompts it

Two reasons, both structural.

First, the project has a standing allergy to hard rails. The ratified
discipline is **soft, diegetic limits over hard engine limits** —
"favor limits that fall out of existing mechanics," with the canonical
example being that Gus's watch is protected *by being carried*, not by
a `notTakeable` flag. A design that refuses hard limits is, by
definition, betting everything on indirect control. This lens is how
you check whether that bet is actually being paid — or whether "no
rails" has quietly become "no guidance."

Second, NPCs are where the project's energy lives — they're "where the
personality lives," and they're command-givers acting on the same bus
as players. NPCs are Schell's single most powerful indirect-control
lever, and we have a lot of them by design. So the question isn't
*whether* we use indirect control; it's whether we use it
*deliberately* or by accident.

## What the design answers

The design reaches for nearly every lever Schell names, and reaches for
characters hardest.

**Characters as the primary lever.** This is the strong suit.

- The [npc-dialogue](../slates/npc-dialogue-slate.md) design has NPCs
  *lead* — the barkeep opens with "Road dust on you. Bad time to
  travel, what with the bandits on the north pass" rather than waiting
  for the player to guess keywords. The player doesn't hunt a topic
  menu; they follow a thread the NPC volunteered. That is textbook
  indirect control: the NPC plants the want. The slate even names the
  failure mode it's steering around — "the keyword era was lame but
  predictable; free text risks the Eliza failure" — and the answer is
  *authored leadership*, an NPC who hands you the next thing to care
  about.
- NPC **autonomy is itself a control signal**
  ([npc-behavior](../slates/npc-behavior-slate.md)). A guard visibly on
  patrol, an NPC with idle business (Gus's "idle business" is the
  worked example), an NPC who stops patrolling at night — these teach
  the player, without a tutorial line, that NPCs are people with
  routines worth reading, and that the world has rules (day/night)
  worth learning. The player learns *to look* by being given things
  worth looking at.
- NPCs have **their own agendas** that pull players along
  ([affiliation](../slates/affiliation-slate.md)): guild recruiters
  "court students and graduates." You're not handed a "join a guild"
  quest marker; an NPC wants you, and being wanted is a pull.

**Constraints, framed diegetically.** char-gen is "closed choices +
heavy defaults" — a deliberately bounded option set the player chooses
freely *within*. You feel like you're authoring a character; you're
actually picking from a curated menu that keeps you on the welcoming
path. Same move at the dorm: a theme preset offers a direction (a
constraint that suggests) over free-text Details (freedom within it).
The [design-philosophy](../design-philosophy.md) capacity model is the
same shape one layer down — "the engine imposes typed shape; authors
compose semantics" — constraint as a creativity scaffold, not a wall.

**Goals as pull, via curiosity.** The un-genred campus is an
attention-and-curiosity engine: it's "obviously unreal," strangeness
applied as a *finish* over recognizable function, and "you're in for
anything" is the intended first feeling
([eternal-university](../slates/eternal-university-slate.md)). The
design isn't telling you to explore; it's making the world *ask a
question* you want to answer. Dr. Limen — a benign brain in a jar
plumbed into the campus — is the same trick at character scale: a
planted mystery you'll want to pull on.

**Interface as control — the subtle, powerful one.** "What's easy is
what gets done" is doing quiet work everywhere:

- The cockpit's **inspection pane** is attention-steering rendered as
  UI: a persistent right-column cockpit pane that keeps the focused
  thing and the room's contents in front of the player, so the *easy*
  thing to attend to is the thing the design surfaced. Classic visual
  indirect control, adapted to a text game.
- The whole [interaction-philosophy](../interaction-philosophy.md)
  "learnability gradient" is indirect control of *player growth*: a
  newcomer fills out a web form, sees the command string it produced
  echoed back, and "graduates to typing it." Nobody is told to learn
  the CLI; the easy surface is built to *teach* the powerful one. The
  on-ramp is the lever.

**Geography as a control gradient.** Affiliations are scoped by place:
campus affiliations unify (Houses, prosocial), competitive ones
(Corps, rivalry) live "past the gate." New players drift toward safe,
collegial belonging not because a rule forbids faction warfare, but
because the geography and the available affiliations make the prosocial
choice the obvious one. The gate is a soft boundary doing a hard
boundary's job.

## Tensions & risks

- **Indirect control degrades silently into no guidance.** The
  no-hard-rails stance is principled, but indirect control is *work* —
  an NPC has to be authored to lead, a curiosity hook has to be
  planted, an easy path has to be built. Where that authoring isn't
  done, "soft limits" doesn't produce gentle guidance; it produces a
  player standing in an open field with no idea what to want. The risk
  is acute precisely *because* the engine won't catch it: there's no
  rail to hit and no error to throw. A room with no led NPC, no planted
  question, and no surfaced affordance is a dead end that looks fine.
- **The hand can be felt.** The lounge seats you by a matching
  algorithm "framed as hospitality." That's good indirect control *if*
  the frame holds — and a manipulation the player resents the moment it
  doesn't. The same is true of every diegetic constraint: indirect
  control works only while it's invisible. The design needs a way to
  notice when the seams show, and the honest tell is player friction
  ("why am I here, I didn't choose this").
- **Indirect control of *real behavior* is the dark-pattern edge.**
  When the thing you're steering is a click in a game, indirect control
  is craft. When it's a student's study habit, the same lever is
  behavior engineering — the risk `standard-model.md` already owns.
  Making someone *want* to study is the dream; making them *compulsively*
  study because the NPC they're attached to withholds approval is the
  nightmare, and they are the same mechanism aimed differently. Schell
  builds the worry into the lens himself — its final question is "Is my
  design inducing desires I'd rather the player *not* have?" — and he is
  frank that characters let you "manipulate" the player through their
  empathy (his *Ico* example: you protect the princess because failing
  her *feels* bad). He means it as craft; aimed at a real study habit,
  that conscience-check question stops being rhetorical. This lens and
  Responsibility/Transformation share a blade.
- **NPC-led dialogue is a quality cliff, not a slope.** The whole
  characters-as-control strategy rests on NPCs that lead *well*. An NPC
  that leads badly — flat hooks, dead-end misses — is worse than one
  that doesn't lead at all, because it advertises interactivity and
  then fails to deliver it. The slate knows this ("where quality is won
  or lost"); the lens underlines that the entire indirect-control bet
  is hostage to dialogue-authoring quality.

## Implications

1. **Treat "led-ness" as a content-completeness check.** If the design
   relies on NPCs and planted curiosity instead of rails, then a
   room/area isn't done until it can answer "what here makes the player
   *want* the next thing?" That's an authorable, reviewable property —
   a candidate checklist item for area sign-off, parallel to the
   onboarding arc's "no lessons gate progress, only tasks do."
2. **Name the levers in the NPC-authoring guidance.** The behavior and
   dialogue slates have the *mechanism* (brains, leadership, idle
   pools); they don't yet frame it as "this is your indirect-control
   toolkit, here's when to reach for which lever." Authors will build
   better NPCs if the guidance says outright: an NPC's job is often to
   make the player want something.
3. **Add a "is the hand felt?" question to playtesting.** Indirect
   control is the one design category whose failure is invisible to the
   designer (who knows the intent) and visible only to the player (who
   feels shoved or lost). The lounge-seating frame, the campus
   curiosity hooks, and the affiliation gradient should each be tested
   against "did the player feel free?" not just "did the player do the
   thing?"
4. **Keep the soft-limits principle honest by auditing for dead
   fields.** The Gus's-watch principle is right, but it only works when
   the diegetic mechanism actually exists. Periodically check that
   "soft limit" decisions are backed by a real in-world pull, not by an
   absence of design — the difference between "carried, so protected"
   and "nothing stops you and nothing guides you."

---

[^aogd-ic]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #81, the Lens of Indirect
    Control** (p. 353) and **Lens #79, the Lens of Freedom** (p. 343),
    from the indirect-control chapter (opening section "The Feeling of
    Freedom," p. 343). The six methods — constraints, goals, interface,
    visual design, characters, music/sound — are Schell's. The *Ico*
    example and the companion **Lens #80, the Lens of Help** (p. 352)
    come from "Indirect Control Method #5: Characters" (pp. 351–352); the
    "inducing desires I'd rather the player not have" question is the
    final bullet of Lens #81's card. (3rd-edition print pagination; lens
    numbers stable across editions.)
