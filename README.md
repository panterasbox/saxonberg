# Saxonberg

**Saxonberg turns real-life engagement into a game you play by reading
and typing.** It's a multiplayer, text-first world where the things you
do outside the game — what you learn, practice, and master — become the
engine of adventure inside it.

If you've seen the demo video, this is the substance behind it: what the
world is made of, why it's built on text and honest numbers, and where
it's headed.

---

## The loop

You study or practice something real. The game notices, and your
character grows *in a way that matches what you did* — which unlocks
things you couldn't do before, and the world keeps handing you reasons to
go learn the next thing. Learning feeds play; play motivates learning.
One loop, not a quiz bolted onto a game.

## See it

The same room, read two ways. A player just looks:

```
> look
A fountain stands at the center of the courtyard, water trickling softly.
```

A student points an instrument at it — or flips on the pedagogical seam:

```
> analyze sound here
Source: fountain
  Emitted: 30 dB SPL @ 100–800 Hz
  At your position: 28 dB
Aggregate: 28 dB SPL
Reverberation: 0.6s (living room)
```

Same engine, same fountain — only the rendering changed. The prose was
never flavor painted over a fake; it's a faithful reading of a model that
already holds real decibels, real frequencies, real reverberation. That's
the whole trick, and it generalizes everywhere the engine measures
something: light in lux and color temperature, materials with real
molarity and atomic mass, a creature with its actual species' hearing
range, atmospheres with real pressure and gas mix. In-world instruments —
thermometers, sound meters, pH meters, barometers — and the `analyze`
verb reveal the numbers; everyone else just reads the sentence.

The payoff is that **expertise does real work against real data.** When a
botanist identifies a plant, a chemist extracts a compound from it, or the
two combine to make something neither could alone, the skill is checking
against actual taxonomy and actual chemistry — not rolling against a
flavor-text table.

---

## Two commitments hold it together

Saxonberg makes two stubborn design bets. Together they're why the world
above can be *both* readable and rigorous.

### 1. The model is honest — it's numbers, not vibes

Where the engine models something measurable, it uses **real units and
real math** — and no "0–100" sliders or "1–5 stars" fudge anywhere in the
substrate.

That discipline is the whole pedagogical claim. A chemistry student who
inspects a beaker sees real molarity. A biology student playing a dog has
that species' real hearing range. If the engine lied about physics
*anywhere*, it couldn't teach with a straight face *anywhere*. Authors
still write friendly tags ("a warm room"); the framework maps those to
canonical values and keeps the arithmetic real underneath.

And because the schemas are shaped like reality, they're shaped like the
public datasets that describe reality — so content can be *seeded* from
real sources (taxonomy databases, nutrition data, the periodic table)
rather than invented by hand. Authoring becomes ingestion.

> Even invented sciences — magic — are modeled honestly: internally
> consistent, measurable, with their own conserved quantities and
> instruments. A real channel teaches real facts; an invented one teaches
> the scientific method itself, in a sandbox engineered to be learnable.

### 2. The medium is text — and that's a feature, not nostalgia

Everything you perceive arrives as **prose**; everything you do is a
**command string** one parser executes. Both are just strings, and that
is the point.

Text isn't a retro affectation here — it's chosen because it does things
a richer medium can't:

- **It can represent anything.** A smell, a legal argument, a chemical
  reaction, a feeling. The only real cost is verbosity, so the honest
  question is never "can text say this?" but "is it worth reading?"
- **It dodges the uncanny valley.** A scripted NPC waving an emoji reads
  as a puppet; prose describing the wave carries the same information
  without faking an inner life.
- **The ceiling is your imagination, not an art budget.** A graphical
  world has to animate everything it depicts; a text world describes it
  and lets you render it.
- **It's social to the core.** Conversation is the backbone of a social
  world, conversation is text, and even gesture folds into text through
  the emote system.
- **The minimal core is a real product.** Strip every rich panel and the
  game still runs as a stream of message frames — which is exactly why
  mobile and low-end devices come nearly free.

The two halves rhyme: under the **language** is an honest **numeric**
model. Text can be the universal surface *because* what it renders is
real.

> The world is more than a message console. Graphics earn their keep
> wherever information is parallel — a glanceable map, at-a-glance status —
> and AI-generated illustrations give scenes a warm, storybook feel where
> prose alone would run long. These ride as a *decorational* layer over
> the text, never under it: the test is that the game still works with the
> rich layer switched off. And even there, text earns its keep — the prose
> describing a scene is the prompt that generates its image.

---

## The keystone: the human interface *is* the AI interface

Here's where the two commitments pay off together. The loop a player runs
— **read prose → decide → type a command** — is exactly the loop a large
language model runs. So there's no separate "AI adapter": an AI-driven
character perceives through the same text channel, acts through the same
command bus, and is gated by the same security as a human.

A seminar room, mid-discussion:

```
> say Does anyone have last week's lecture notes?
Priya raises her hand. "I've got them — I'll drop them in the channel."
Devon shrugs. "Mine are a disaster, sorry."
Professor Albright nods. "Good. Let's pick up where we left off."
```

Any of those three might be running on a language model — and nothing in
the engine, the prose, or the command bus knows or needs to know which.

Two things fall out of that:

- **AI characters can be real social participants, not scripted props.** A
  scene — a seminar, a study group, an office hour — can be filled by
  humans, by agents, or any blend, and the system doesn't need to know
  which. That's what lets the *social* experience of school survive at any
  ratio of people to agents: student, TA, and instructor are *roles*, and
  an agent can fill whichever the human cast leaves open.
- **Everything is legible by construction.** Because every action is a
  visible, attributable command on a bus, an agent's behavior is as
  auditable as a person's — in plain text — and an agent can't do anything
  a skilled player couldn't.

The same principle shapes how **combat** works — a launch feature, in
design now. A text world is poor at twitch reflexes and superb at *set a
strategy and watch it unfold*, so a party adopts a **legible tactic** —
one shared formation everyone plays a role in — instead of each player
mashing keys. And because a party can be any blend of people and AI, the
veteran shielding a newer player while they find their feet might be a
friend or an AI tutor, and the engine doesn't distinguish. Coordinated,
readable, social strategy is what this medium does better than a flashy
action game.

---

## The bigger frame: education is the first vertical, not the point

It's worth being precise about what is and isn't "educational" here,
because three different things tend to get blurred:

1. **The platform/engine** (this repository) is **vertical-agnostic.**
   It's a gamification engine — a way to turn any tracked real-life
   signal into play. Nothing in the engine knows what a "course" is. The
   long bet is a small, closed set of engagement primitives (*you did a
   lot* / *you did it consistently* / *you crossed a threshold* / *you did
   it well*) that any domain — a fitness band, a calendar, a codebase, a
   smart toothbrush — could feed.

2. **The content** is **academia-themed**, because our first world is a
   university: Eternal University, the surrounding city, the campus and
   its cast. That theming is *content* sitting on the agnostic engine —
   the same way a fantasy tavern or a sci-fi station would be. Swap the
   narrative, setting, and cast and the engine doesn't change.

3. **Vertical integration** — wiring the game to a *specific* real-world
   product so genuine engagement signals (e.g. an adaptive-learning
   platform's progress) drive in-game advancement — lives on a **separate
   tier of the stack**, layered on top. That's a distinct concern from
   the content being academia-themed; it's the seam where a real consumer
   plugs in.

So: a vertical-agnostic engine, an academia-themed world built on it, and
a separate integration tier where a real product connects. Gamification
is the constant; the subject is content.

---

## How it's built (the short version)

The world is built from a **Standard Model**: a shallow spine of a few
fundamental *kinds* — `Idea`, `Thing`, `Location`, `Vessel`, `Agent` —
crossed with a wide library of composable *traits* (mixins) like
`Container`, `LightSource`, `Wearable`, `Atmospheric`, `Mobile`. A torch,
a lantern, and a glowing sword aren't three classes; they're three
combinations. The metaphor is a chemistry set: a small set of particles,
bonding into endless compounds, with honest units underneath.

Under the hood:

- **TypeScript** end to end, in a `pnpm` monorepo (`packages/server`,
  `packages/client`, `packages/types`).
- **Server:** Node + Express, WebSockets (`ws`), MongoDB.
- **Client:** React + Vite, Zustand, styled-components — a multi-panel
  "cockpit" with a dominant text console and a contextual inspection
  pane.
- **Every UI gesture composes a command string** and submits it to the
  same bus the CLI uses. There is no second code path; a form is a
  convenience layer over the command, never a parallel reality.
- A **call-security framework** (proxies + decorators) mediates every
  interaction between game objects — the foundation for safely running
  user-authored content down the road.

The engine foundations are largely in place; the gamification layer and
the vertical-integration tier are what's ahead. The `docs/` tree is the
real source of truth.

---

## Read more

The narrative starts broad and gets specific:

- **[docs/vision.md](./docs/vision.md)** — the full product vision:
  guilds, dual progression, the campus, social systems, AI.
- **[docs/design-philosophy.md](./docs/design-philosophy.md)** — *model
  honestly*: the fidelity axis and why the numbers are real.
- **[docs/interaction-philosophy.md](./docs/interaction-philosophy.md)** —
  *meet the world through text and command*, and why that's AI-native.
- **[docs/standard-model.md](./docs/standard-model.md)** — what the world
  is made of, and the "periodic table of gamification" we're building
  toward.
- **[docs/architecture.md](./docs/architecture.md)** — the codebase's
  three-layer architecture and conventions.
- **[docs/roadmap.md](./docs/roadmap.md)** — what's built and what's left.
- **[CLAUDE.md](./CLAUDE.md)** — the load-bearing orientation doc, with a
  map into the per-subsystem references under `docs/subsystems/`.

---

## Running it locally

```bash
pnpm install        # install all workspace dependencies
pnpm dev            # run client + server concurrently
```

- Client (Vite): http://localhost:5173
- Server: http://localhost:2010

The server needs a `.env` in `packages/server/` (MongoDB URI, Google
OAuth credentials, session secret) — see
[CLAUDE.md](./CLAUDE.md#environment-variables) for the full list.

```bash
pnpm build          # build all packages
pnpm test           # run the Vitest suites
pnpm lint           # ESLint across the monorepo
```
