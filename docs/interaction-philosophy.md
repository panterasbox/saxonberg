# Interaction philosophy

> **Layer: the platform.** This doc describes the *vertical-agnostic
> platform* — text as the medium, the command line as the unit of
> interaction — not the educational game built on it. Saxonberg's
> game-level essence ("learning as adventure," education at its core)
> lives in [vision.md](./vision.md). The two layers are nested, not in
> tension — reconciled in
> [lenses/essential-experience.md](./lenses/essential-experience.md).

Companion to [design-philosophy.md](./design-philosophy.md). That doc
argues how honestly the engine should *model* the world; this one
argues the two choices that decide how a player *meets* it:

> **The world is rendered as prose and acted on through commands. Both
> are just strings — and that is the point.**

Both choices serve the project's overriding goal — **gamification** —
and neither is tied to any one subject. Education is the first vertical
the platform attacks, but text, the command line, and the AI agents
discussed below are **vertical-agnostic**: change the narrative,
setting, and cast and the same machinery hosts a different domain. The
examples here lean educational because that's the current vertical, not
because the philosophy is about school.

Like its sibling, this is **not a slate**. Nothing here is being
designed; it makes explicit the interaction discipline the client,
command, and messaging subsystems already follow, so future work
inherits the reasoning instead of re-deriving it.

See also:

- [docs/design-philosophy.md](./design-philosophy.md) — the fidelity /
  honesty axis. The two docs are halves of one whole: *model honestly*
  (there) and *meet the world through text and command* (here).
- [docs/standard-model.md](./standard-model.md) — the *structure* of the
  model (the Stuff/mixin particle layer) and the imagined periodic table
  of gamification. Text's universality (here) is the rendering twin of
  the Standard Model's structural universality (there).
- [docs/vision.md](./vision.md) — asserts the text-first, command-as-
  unit-of-interaction commitments that this doc defends, and holds the
  product vision (gamification, the current vertical) this serves.
- [docs/subsystems/command-routing.md](./subsystems/command-routing.md),
  [command-spec.md](./subsystems/command-spec.md),
  [command-parsing.md](./subsystems/command-parsing.md) — the mechanism
  that realizes command-line primacy.
- [docs/subsystems/messaging.md](./subsystems/messaging.md),
  [response-envelope.md](./subsystems/response-envelope.md) — the
  failsafe-string substrate the prose half rests on.

---

## Why text is the medium

Saxonberg is text-first by **decision**, not nostalgia. The MUDs this
engine descends from were text-based because the hardware of the era
gave them no other option — but the limitation was never what made them
worth returning to. The discipline we inherit is to study the
*constraints* those games worked under, not the breakthroughs that
later dated them.

Jesse Schell's distinction is the load-bearing one:

> One of the most concrete ways to keep a sane perspective about
> technology is to understand the difference between foundational and
> decorational technologies. Foundational technologies are the ones
> that make a new kind of experience possible.

Text is **foundational** here; everything layered over it — embedded
video, the adaptive-learning integration, AI-articulated NPCs,
AI illustration — is **decorational**. The test is unforgiving: *the
game has to work as a game with the decorational layer switched off.*
If it only coheres once the video panel is lit or the learning platform
is wired in, the foundation is in the wrong place.

Two reasons the text foundation actively *outperforms* a richer medium
rather than merely costing less:

- **It dodges the uncanny valley.** A friend waving at you when you log
  on reads as a person having an experience. A farmer NPC — coded to
  tend crops on a loop — waving the same 👋 reads as a puppet, and the
  empathy curdles: are you laughing at the farmer, or at the wizard who
  coded him? Prose describing the wave carries the same information
  without impersonating an inner life the NPC doesn't have. Text
  degrades gracefully exactly where graphics fall into the valley.
- **The expressive ceiling is the player's imagination, not the art
  budget.** A graphical RPG has to model and animate every experience
  it wants to depict; a text world describes it and lets the reader
  render it. Schell again: a world that is "consistent and compelling
  … fills the guest's imagination, and mentally, the guest enters the
  world." That same internal consistency is what
  [design-philosophy.md](./design-philosophy.md) demands of the
  physics — and it is what does the immersion work here, bought in
  sentences instead of polygons.

So the prose a player sees is never "just flavor": it is a *rendering*
of a consistent world, and consistency is what the imagination latches
onto.

---

## Text is the universal substrate

The deeper reason to build on text is that it can represent *anything*.
Everything is language or numbers, and between them they cover the whole
world — a smell, a legal argument, a chemical reaction, a feeling, a
floor plan. Almost anything the design wants to model, text can carry.

The catch is not *expressibility* — it's **verbosity**. Text is bounded
not by what it can say but by how much you have to read to say it. You
*could* model sub-room geometry or a crowded battlefield in prose; it
would just be an unreadable wall of text. This is exactly the cost curve
in [design-philosophy.md](./design-philosophy.md)'s fidelity axis: as
fidelity climbs, prose expressivity degrades. The honest boundary is
never "can text represent this" but "is the reading worth it."

That tells you precisely **when graphics win**: *text is serial, vision
is parallel.* A glance at a map delivers fifty spatial relations at
once; prose has to serialize them into fifty clauses. Graphics earn
their keep exactly where the information is inherently parallel or
spatial and serializing it would cost more reading than it's worth —
maps, at-a-glance status, the geometry of a floor plan grasped at a
glance. Everywhere else, text's universality wins. The *decorational*
layer is the designated escape valve for those cases (see the downsides
below).

There's a correspondence hiding in "language or numbers." The
**numbers** are the honest model that
[design-philosophy.md](./design-philosophy.md) governs; the
**language** is the rendering this doc governs. Text can be the
universal substrate *because* underneath it the model is numeric and
honest — the prose is a faithful rendering of a real model, not a
painted-on description. The two docs are the two halves of "language or
numbers."

The same universality scales up from objects to **whole domains**. Just
as text can render any object, it can host any vertical: the engine, the
command line, the agents, and the social layer don't change when you
swap one subject for another — only the narrative, setting, and cast do.
The subject matter is content, not architecture. Text is what keeps the
platform domain-flexible, and gamification — not any one vertical — is
the constant underneath.

---

## Accessible, portable, and minimal

Three practical properties fall out of building on text.

**Literacy is the only floor.** Anyone who can read can play; anyone who
can write can author — and authoring matters, because user-generated
content is meant to be a large part of the world. You don't need to
understand a 3D engine or a physics solver to build a room, an item, or
a quest; you compose prose. Writing *well* used to be the hard part of
that; LLMs now carry most of that load, which lowers the floor further
while leaving the craft available to those who enjoy it.

**Text is the wire contract.** Most of what crosses the connection is
text — a stream of message frames carrying MML strings — so modders and
alternative-client builders can reimplement the interface cheaply
against a legible protocol. Not *all* of it is text (binary assets,
structured metadata payloads, and the transport/auth framing aren't),
but the load-bearing core is.

**Playing is writing practice.** (Added 2026-07-28.) A fourth
property, and the one that makes the medium itself pedagogical: in a
text world, *participation exercises literacy*. Reading the world is
reading comprehension; speaking, emoting, posting to a board, and
describing a room you built are composition — and writing is the one
skill essentially every discipline demands (the essay, the lab note,
the incident report, the argument). Other media consume attention;
this one rehearses the universal skill as a side effect of play. The
LLM caveat cuts both ways and is owned honestly: AI assistance
lowers the authoring floor (above), and a player who delegates all
their prose gets less of this benefit — but conversation, the social
backbone, resists full delegation, so the practice persists where it
matters most. This argument is platform-layer (any vertical benefits
from literate participants) with obvious extra force in the
education vertical.

**The minimal core is a real product, not a fallback.** Strip every
rich-presentation layer and the game still runs: a streamable conduit of
message frames whose MML renders down to plain ANSI/VT100 would let you
play over a 1970s telnet session. Nobody *wants* that — but the fact
that it's *possible* proves text is the backbone and the rest is
decoration. And the proof isn't hypothetical: **mobile is essentially
that minimal core** — a message stream like a chat app, a command bar,
and maybe a button bar. Designing text-first means mobile, low-end
devices, and bad connections come nearly free, because the smallest
surface is the *real* one, not a degraded port.

Two sharpenings of that point (added 2026-07-28). First,
**familiarity**: a text stream with a button bar is not merely
feasible on a phone — it is the *most familiar* mobile interface
shape in existence, a chat app. The minimal surface needs no
learning; people already live in it. Second — and stronger — **the
floor is per-activity, not just per-device.** Some of the richer
cockpit surfaces (the inspection card, the builder, an argument
map) may genuinely be unwieldy on a small screen. But because every
activity reduces to the stream and the command — exploring, combat,
chatting, reading forums, personalizing your home, creating content
— the reliable floor sits under *whatever a session is about*, not
under some designated "mobile-friendly" subset of the game. There
is no session type that is desktop-only; there are only session
types whose decoration you'll enjoy more at a desk.

---

## Text-first is social-first

Games are social; a school is doubly so; and **conversation is the
backbone of social interaction.** Conversation is language and language
is text, so the medium that is literally made of conversation is the
natural substrate for a social world. The non-verbal half of social
presence isn't lost either: gesture and expression fold into text
through the natural-language emote system (see
[emotes-slate.md](./slates/tails/emotes-slate.md)), so the social substrate is
*complete* in text. Everything two participants do to each other
socially — speak, gesture, react — reduces to strings. The ultimate
abstraction, pointed at people instead of objects.

This is a **co-equal pillar**, not a footnote. The reason to lean so
hard on text isn't only that it represents the world cheaply; it's that
text *is* the social fabric. Emphasizing it reinforces the social
component the whole experience depends on.

---

## Why the command line is the unit of interaction

If text is how the world is *rendered*, the command line is how it's
*acted on*. The commitment is exact:

> **Every interaction — typed, clicked, or one day spoken — resolves to
> a command string that one parser executes. The command is the unit of
> interaction; nothing reaches the world except through it.**

A web form does not call a private API; it *composes a command string*
and submits it to the same bus the CLI uses. A side-panel button is a
saved command. This is **command-bus primacy** (see
[client-cockpit-slate.md](./slates/tails/client-cockpit-slate.md)), and the
mechanism is already built — YAML command specs, a unified parser, the
controller dispatch chain. What follows is why it earns the discipline.

**One model, every surface.** The power user at the CLI and the newcomer
clicking a form exercise the *identical* command system. There is no
second code path where the UI can do something the parser can't, and no
drift to police between them. The form is a convenience layer over the
command, never a parallel reality. Consistency isn't maintained by
vigilance; it's structural.

**One source, many artifacts.** Because a command is specified
declaratively (the YAML view in
[command-spec.md](./subsystems/command-spec.md)), the same spec
generates inline usage, the full help page, *and* the dynamic web form.
Author the command once; the help system and the UI fall out of it.
Divergence is impossible because there's nothing to keep in sync.

**A learnability gradient, not a wall.** Forms and the CLI are usually
framed as a tradeoff — power versus approachability. Command primacy
dissolves it: the newcomer fills out a form, sees the command string it
produced echoed in the console, and graduates to typing it. The easy
surface *teaches* the powerful one instead of hiding it. Nobody is
trapped on the beginner path; they're already standing on the on-ramp to
the expert one.

**Actions compose because they're strings.** A gesture that is a string
can be stored, replayed, and chained. Aliases, history, macros, and the
`msh` scripting surface (see
[shell-alias.md](./subsystems/shell-alias.md),
[shell-author.md](./subsystems/shell-author.md)) all fall out of the
same primitive — and so does the future NLP seam: natural language maps
onto the same command models, making conversational and Unix-style input
interchangeable rather than rival systems. Interactivity and automation
share one substrate; the game isn't built twice.

**Accessibility and auditability for free.** A canonical command, and
its canonical prose result, mean screen readers, transcripts, replay,
and logging need no special path — they read the same strings everyone
else does. And because every action is a *visible, attributable* command
on a bus, the call-security and command-routing frames draw their
integrity story from the same place (see
[command-routing.md](./subsystems/command-routing.md)). In a multiplayer
world, "every action is a legible event" is not something bolted on for
moderators; it's the substrate.

This mirrors the prose half exactly. There, every event must carry a
**failsafe string** — whatever rich payload the server also sends, the
player can always read what happened (see
[messaging.md](./subsystems/messaging.md)). Here, every action must be a
command — however rich the UI gesture, it reduces to a string the engine
can parse. Render-to-string and act-through-string are the same
discipline pointed in opposite directions.

### The discipline this imposes

The command is a real ceiling, and that's the point. If a UI gesture
*can't* be expressed as a command, that isn't a reason to open a
side-channel — it's a gap in the command vocabulary, to be fixed at the
command layer. The moment the client reaches past the bus to mutate
state directly, every property above — consistency, help generation,
scriptability, auditability — silently breaks. The rule is the
interaction-side twin of *the game must work with the decorational layer
switched off*: **the UI must work as a command composer, with nothing
underneath it but commands.**

---

## Text is AI-native, on both ends of the loop

Everything above describes a loop a player runs constantly: **perceive**
(read the prose) → **decide** → **act** (issue a command). Both ends of
that loop are text — which is exactly the loop a large language model
runs. LLMs are fluent at reading prose *and* at emitting commands on a
CLI, so the perception channel (MML strings) and the action channel
(command strings) are both native to AI, with no translation layer.

The consequence is the keystone of the whole design:

> **The human interface *is* the AI interface.** There is no separate AI
> adapter or privileged API. An LLM-driven participant perceives through
> the same MML channel, acts through the same command bus, and is gated
> by the same call-security as a human.

This is held as an **aspiration, not a settled guarantee** — agent
capabilities are moving fast and where it lands may shift — but the
stance is attractive for two reasons. It is a **safety and legibility
property**: because every action is a visible, attributable command on
the bus, an agent's behavior is as auditable as a human's *by
construction* — you can watch what a model does, in plain text, and the
security framework neither knows nor needs to know whether a giver is
carbon or silicon. And it is a **parity property**: an agent can't do
anything a sufficiently skilled player couldn't, which is at once a
constraint and a guard rail.

Stack this on the social pillar and a genuinely new capability appears.
Because the social substrate is text and text is AI-native, **AI agents
can be social *participants*, not scripted props** — conversational
presences that occupy roles. A scene can be filled by humans, by agents,
or by any blend, and the system doesn't have to care. That is the worked
example the platform is building toward; the gamified hybrid classroom
in [vision.md](./vision.md) is the current vertical's version of it. The
design constraint it imposes is that **roles must be role-shaped, not
human-or-AI-shaped** — presence, grouping, and dialogue can't assume a
participant is human.

The **scripting layer is the multiplier.** An LLM that can emit only
single commands is a reactive bot; an LLM that can compose scripts is an
*agent* — multi-step automation, authored behavior, emergent action.
"Actions compose because they're strings" becomes "agents compose
because actions are strings." What that scripting layer should actually
be — who it serves (players, content authors, agents), how much language
it is, and where the trust boundary (the `isolated-vm` sandbox) sits for
untrusted player- and AI-authored scripts — is its own design question,
deferred to a future **scripting slate**.

---

## The honest downsides

Text earns its place, but the argument owns its costs.

- **Literacy itself excludes.** The "anyone literate" floor is still a
  floor: pre-literate players, some dyslexic players, and non-native
  speakers are served worse by a wall of text than by a picture. The
  mitigations are real but partial — text-to-speech and AI narration on
  the rendering side, AI translation on the conversational side — and
  worth treating as obligations, not afterthoughts.
- **Text is slow for at-a-glance and spatial information.** The
  serial-vs-parallel cost is genuine; some things a glance conveys
  faster than any sentence. This is *why the decorational layer exists*
  — map panels, models, status visualizations are the escape valve for
  parallel information, layered over (never under) the text substrate of
  record.
- **Some content genuinely wants geometry.** A lab where which beaker
  sits on which burner matters, or a precision spatial puzzle, earns
  opt-in sub-room fidelity (see
  [design-philosophy.md](./design-philosophy.md)). Ranged combat *looks*
  like it belongs here but doesn't — it's modeled as abstract engaged
  relationships, not coordinates (see
  [combat-tactics-slate.md](./slates/deferred-rpg/combat-tactics-slate.md)).

None of these unseat text; they mark where it is *rendered alongside*
something richer. The substrate stays text; the decoration handles the
edges.

---

## The two halves are one commitment

Text and the command line are not two preferences that happen to
coexist; they are a single stance on what a player and a game are to
each other. The world arrives as prose the imagination renders, and the
player acts on it through commands the engine parses. Both are strings.
Both degrade gracefully — prose where graphics hit the uncanny valley,
commands where bespoke UIs would fragment. Both keep the ceiling on
expression set by **imagination, not by an art or interface budget**.
Both carry the social fabric the experience runs on, and both are native
to the AI agents that increasingly share the world. And both rest on the
same honesty the fidelity principle demands: a world worth entering has
to be internally consistent — whether it is being described or being
acted upon.
