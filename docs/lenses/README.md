# Design lenses

> ⚠ **Not the project's own five lenses.** The rubric every high-level
> design is interrogated with — pedagogy · creative expression ·
> immersion & roleplay · values · epochs — lives at
> [../design-lenses.md](../design-lenses.md). *That* is the decision
> rule; *this* directory is a borrowed analysis toolkit.

A working set of design analyses, one per file, that look at this
game through Jesse Schell's *lenses* — the small bundles of questions
from *The Art of Game Design: A Book of Lenses*, each of which asks
you to examine the design from one fixed angle.

This sits alongside the three orienting docs — it is the **applied**
companion to the principles they state:

- [design-philosophy.md](../design-philosophy.md) — how honestly the
  world is *modeled* (the fidelity / honesty axis).
- [interaction-philosophy.md](../interaction-philosophy.md) — how a
  player *meets* the world (text + command line). Already argues
  several Schell ideas directly (foundational vs. decorational
  technology; "a consistent and compelling world fills the guest's
  imagination").
- [standard-model.md](../standard-model.md) — what the world is *made
  of* (the particle layer + the imagined periodic table of
  gamification).

Those docs state principles. **The lenses interrogate them.** A lens
entry is allowed to find a principle wanting, to surface a tension two
docs leave unresolved, or to generate a decision the design hasn't
made yet. If an entry only admires the design, it failed.

## On the book and the citations

The lenses are Jesse Schell's, from *The Art of Game Design: A Book of
Lenses* (1st ed. 2008; cited here from the **3rd edition**, CRC Press,
2020). The book collects 110-plus lenses (plus a final, unnumbered
"#∞ Lens of Your Secret Purpose"); we use only the handful our design
actually summons.

His lens cards and his prose are his own and aren't reproduced here.
What the entries do:

- **Name** each lens and **paraphrase its guiding questions** in our
  own words.
- Where the book offers insight *beyond* the bare question — a reframe,
  a principle, a design heuristic — surface it in a short **"From the
  book"** callout that quotes Schell's actual words (the lens's own
  questions, a key phrase, his worked example) and attributes the rest.
  Most people haven't read it, so these callouts are deliberately there
  to carry its wisdom across.
- Each callout carries a **footnote** citing the specific lens by
  **number and name**, its **3rd-edition page**, and the chapter or
  section — all checked against the book. (Page numbers are the
  3rd-edition print pagination, read from the in-book page markers; lens
  numbers are stable across editions.) Where our entry title is a
  *grouping* of several Schell lenses (or names a concept rather than a
  single named lens), the footnote says so.
- Everything after the callout is our own analysis against our own
  design.

None of this substitutes for the book. If the callouts land, read the
original — the lenses are far richer there.

## What counts as "our design"

Everything documented, **whether or not it is built**. Schell's
lenses are design tools; design precedes implementation. A decision
ratified in a slate is as real here as a shipped subsystem. Entries
cite slates, requirements, and philosophy docs as freely as code, and
treat `docs/slates/` as committed design (per the project's
"documented means build" discipline).

## How to read an entry

Every entry follows the same five-part shape:

1. **The lens** — the lens named, its questions paraphrased.
2. **Why our design prompts it** — the specific tension or feature
   that makes *this* lens worth pointing at *this* game. (Not every
   lens earns an entry; these are the ones the design summons.)
3. **What the design answers** — how the current design (built and
   documented) responds to the lens's questions, with citations.
4. **Tensions & risks** — where the lens exposes a soft spot, an
   unresolved disagreement, or a danger.
5. **Implications** — the decisions or work the lens generates. The
   payoff. If a lens surfaces nothing to *do*, it doesn't belong.

## The roster

Curated hard: a lens earns an entry only if our design *actually
prompts it* **and** we have something concrete to say about it **today** —
not the whole deck, and not entries that would only catalogue what isn't
built yet. Lenses that fail that test wait until there's real substance
to write. (Griefing, Meaningful Choices, and the designer's "Secret
Purpose" lens were drafted and then cut on exactly this bar — revisit
them when moderation, progression mechanics, and live-service governance
are actually designed.) Grouped by what they interrogate.

### Framing — what is this, really

- ✍️ **[Essential Experience](./essential-experience.md)** — applied
  at two layers: the **platform's** essence (abstract gamification —
  effort recognized) vs. the **game's** essence (education made epic —
  learning as adventure). The lens's job is keeping the two from
  contaminating each other.
- ✍️ **[Unification](./unification.md)** — does the enormous substrate
  (zones, biomes, time, celestial, senses, light, materials) serve one
  theme, or is some of it engine for its own sake? The platform and game
  themes can pull against each other.
- ✍️ **[Elegance](./elegance.md)** — bag-of-stuff authoring over honest
  per-channel physics: a lot of expressive power from few primitives.
  Purposes-per-element as the test — pointed at the project's own
  over-abstraction tendency.

### The edtech crux — motivation and value

- ✍️ **[Endogenous Value](./endogenous-value.md)** — does in-world
  stuff feel valuable, and does that value *point at* real engagement
  without being a candy shell? Splits into pure-play value (fine
  arbitrary) vs. effort-anchored value (must trace to something real).
- ✍️ **[Motivation](./motivation.md)** — intrinsic vs. extrinsic.
  "Game stands alone" means intrinsic has to carry it; the vertical's
  points are seasoning. Reads the design against Self-Determination
  Theory (autonomy / competence / relatedness) and flags the
  overjustification trap.
- ✍️ **[The Toy](./the-toy.md)** — would the world be fun with no goal
  and no lesson? The sharper version of "stands alone." Surfaces text's
  brutal toy-discoverability problem.
- ✍️ **[Transformation](./transformation.md)** — does the game change
  the people who play it, and is the change one they'd thank you for?
  Gamifying real life is behavior engineering; sensors imply
  surveillance (`standard-model.md` owns this). Is the game good *for*
  the students — especially the minors — playing it? The permanent
  ethics companion to Essential Experience, Motivation, and Indirect
  Control. (Folds in the engagement-vs-outcome honesty test from Schell's
  final lens, "Why am I doing this?")

### The medium — text and the cockpit

- ✍️ **[Imagination](./imagination.md)** — it's a text game; the
  expressive ceiling is the player's mind. Consistency is the
  imagination budget; verbosity is the ceiling; precision vs. evocation
  is resolved by the layered seam.
- ✍️ **[Transparency](./transparency.md)** — the cockpit, inspection
  card, command bar. Does the interface disappear? A CLI's transparency
  is *earned* via the learnability gradient.
- ✍️ **[Feedback](./feedback.md)** — every event carries a failsafe
  string; the response envelope; the scene composer. Strong substrate;
  the open problems are legibility-under-load and text's weak juiciness.

### Onboarding — the first session

- ✍️ **[Interest Curve](./interest-curve.md)** — the spawn → lounge →
  campus arrival → Duncan Hall arc, plotted. Two peaks (awe, then
  agency); the real risk is the post-onboarding handoff cliff.
- ✍️ **[Flow](./flow.md)** — clear goals, challenge matched to skill, in
  the first session. Educational difficulty isn't fully the game's to
  control; the standalone game must hold the channel itself.
- ✍️ **[The Player](./the-player.md)** — who is the student arriving, and
  who is *served worse* by a wall of text? Two audiences (learner +
  demo); accessibility vs. the decorational-optional rule.

### World & character — the strongest material

- ✍️ **[Indirect Control](./indirect-control.md)** — NPCs, diegetic
  constraints, the cockpit's attention-steering: making the player
  *want* what the design needs without rails. (Schell's most-dwelt-on
  indirect-control lever is *characters* — Gus, Dave, Dr. Limen — so the
  NPC-craft material lives here.)
- ✍️ **[The World](./the-world.md)** — coherence of the worldbuilding;
  the un-genred campus as the load-bearing aesthetic choice. Watch
  vertical-agnosticism bleeding the game-world's charm.
- ✍️ **[Curiosity](./curiosity.md)** — "you're in for anything"; the
  brain in a jar; Gus's watch. Every planted question needs a payoff;
  the curiosity→subject bridge is the pedagogical prize.

### Identity

- ✍️ **[The Avatar](./the-avatar.md)** — char-gen as identity, not a
  stat sheet; "depth is earned, not chosen." A "become, don't begin-as"
  avatar that inverts Schell's idealized one.

### Social — just built

- ✍️ **[Community](./community.md)** — grouping, chat, contacts, the
  lounge. Peers as a motivation engine; text-first is social-first.
  Cold-start emptiness is the live risk; the social substrate is ahead
  of the social gameplay. (Friendship and griefing are its
  closely-related neighbors.)

## Sequencing

Essential Experience is drafted first on purpose: the answer to "what
experience are we really making" shapes how every other entry reads. A
lens that finds an element serving the wrong essence is worth more than
one that polishes an element serving the right one.
