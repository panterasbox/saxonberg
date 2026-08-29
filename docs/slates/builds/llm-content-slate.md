# LLM-driven content slate (working doc)

> **Status: model set — one director, riding the bus, authoring scripts.**
> How LLMs drive *content* at runtime — NPC behavior and ambient atmosphere
> alike. Fills [npc-behavior-slate](./npc-behavior-slate.md)'s open Q7 (the
> deferred "LLM brain") with an actual architecture: a **single director
> agent** that **forces the cast** through the normal command bus, is
> **stateless** (all locality lives in the prompt), and expresses
> multi-stage behavior by **authoring scripts** in the language the
> [scripting slate](../tails/scripting-slate.md) defines. The director and the
> ambient narrator are the **same agent**.

Working slate for **LLM-driven content** — the runtime use of a language
model to perform NPCs and narrate ambient scenes. It is *not* about
LLM-assisted authoring (that's [authoring-intelligence-slate](./authoring-intelligence-slate.md)),
and it does not redefine the brain ladder (that's
[npc-behavior-slate](./npc-behavior-slate.md)) — it specifies the topmost
rung the behavior slate left open.

The load-bearing decisions:

1. **The LLM rides the bus, never the client.** The WebSocket command
   pipeline is already structured: commands in, `DispatchResponseEnvelope`
   frames out. The client is a *rendering* of that bus. An LLM plugs in at
   the structured layer (verbs ⇄ envelopes), never by driving the React
   cockpit. See [command-routing.md](../../subsystems/command-routing.md),
   [response-envelope.md](../../subsystems/response-envelope.md).

2. **One director, not per-NPC brains.** The LLM is **never wired to a
   specific entity.** There is a single **director** (= the ambient
   **narrator** — the same agent) that decides what happens in a scene and
   **forces** the relevant entities to do it. Ambient narration and NPC
   dialogue are the *same mechanism*: the scene's intelligence, narrating the
   environment and performing the cast. This refines npc-behavior's implicit
   per-NPC-LLM-brain reading.

3. **Force decouples authority from attribution.** The director is the
   giver-of-record; the *attributed actor* is whoever it directs. So one
   director produces output attributed to Gus, to a nameless drunk, to the
   room — all issued by the single agent. **`force` is still verb-dispatch as
   the target** (on the bus, gated, attributed) — *not* a method backdoor —
   so each forced action is **bounded by the target's own permissions** (the
   director can `force`-`say` Gus, can't `force`-`eval` him; Gus is no
   developer). This is the eval/no-backdoor line, intact.

4. **Giver granularity = attribution granularity.** Ambient is unattributed
   → one shared giver (the narrator/director), locality only in the prompt.
   An NPC is *somebody* → its lines are attributed, but the director still
   performs it via force. The only hard line that survives is **player vs
   cast**: the director may force any NPC / object / room, **never a player
   avatar.** Players are the only true self-actors; everything else is cast.

5. **The LLM is stateless; context is the only local thing.** The Messages
   API is a pure function of `(system + messages)`. There is no per-entity
   "agent" holding state — there is a stateless model and the context you
   assemble. So you never multiply *agents*; you assemble per-scene
   **context** (the active cast's personas + memory, loaded as **data on the
   entities**, plus the witnessed observations). The narratorial **voice**
   (system prompt) is universal → it's the cached prompt prefix shared across
   the whole game; per-scene context is the variable suffix. Literary
   instinct (one voice) and cost structure (one cached prefix) agree.

6. **Locations are neither sensors nor givers — they participate via seams,
   not by changing what they are.** Input rides the existing **Witness
   pattern** (object-local hooks, shadow-installable — see `api/event.ts`);
   a Location is already a Container and witnesses events inside itself.
   Output rides the director's **force** authority (no per-location giver,
   no proxy bound to each room). The location stays a plain location.

See also:

- [npc-behavior-slate.md](./npc-behavior-slate.md) — the brain ladder
  (canned → tree → intent → scripted → **LLM**) and the `Behaved` substrate.
  This slate is that ladder's top rung, realized. Its open Q7 ("LLM brain —
  when it lands + its contract") is answered here.
- [npc-dialogue-slate.md](../tails/npc-dialogue-slate.md) — the deferred LLM
  speech front-end; the director is its generalization to all behavior.
- [scripting-slate.md](../tails/scripting-slate.md) — **the medium.** The director
  expresses multi-stage / scheduled behavior by *authoring scripts* in the
  scripting language, not by emitting a tool-call per beat. This slate says
  *who drives and how*; that slate says *in what language*.
- [rejection-slate.md](./rejection-slate.md) — **the exemplar.** A mining
  town with three LLM-driven residents and eleven mute ones; the worked
  context-window example and the "dumb but immersive" tiering live there.
- [biome.md](../../subsystems/biome.md) — the weather/atmosphere push that is
  one trigger source for ambient director beats (`EventApi` broadcast).
- [authoring-intelligence-slate.md](./authoring-intelligence-slate.md) —
  **distinct**: LLM-for-*authoring* (completions/validation), not runtime
  performance. They share the scripting language as a surface.

---

## Why not the obvious alternatives

- **Driving the client (computer-use).** Reverse-engineering structure out of
  pixels you already had as structure one layer down. The bus is the layer.
- **An `Interactive`-like driver object.** `Interactive` (the connection) and
  `HasInteractive` (the holder it drives) are about *human WebSocket
  connections* — they carry sockets, users, client-UI state, frame counters.
  An LLM-driven entity has none of that. The director is **not** an
  `Interactive`; it's a separate kind of driver that goes nowhere near the
  connection substrate.
- **Per-NPC LLM agents.** N independent brains can't hear each other think;
  one director performing the whole cast gives coherent chemistry (banter,
  callbacks, group dynamics) — the showrunner model. Also avoids N× context.
  ⚠ **Qualified 2026-08-29:** this holds for *performance* and is retained,
  but it does **not** deliver structural **knowledge asymmetry** — a single
  director reads every character's block and can leak across them. See
  § *Knowledge asymmetry* for the case that needs isolated calls, and the
  hybrid that keeps the showrunner for everything else.
- **A tool-menu of pre-canned reactions.** Caps the LLM to what was
  anticipated — the opposite of why you'd use one. Bound the **affordances**
  (what's possible in the world), free the **expression** (what to do/say).
  See the scripting slate for where that line actually lives (the grammar).

---

## The model

### The director loop (the LLM rung)

- **Trigger / cadence is the game's call.** No always-listening LLM (too
  expensive). A cheap salience gate (rule-based or a tiny model) decides when
  a scene is worth a director beat; the engine batches observations until
  then. The director is the LLM rung of `Behaved`, invoked when a beat
  *warrants* LLM-grade orchestration — rote solo behavior (Gus winds his
  watch at noon) stays on the cheaper rungs.
- **Scope per active scene.** One director *authority*, but each turn is
  scoped to one locality's **active cast** — same shape as ambient. Context
  grows with who's in the beat, not world population; personas/memory load on
  demand.
- **A turn:** assemble {universal voice} + {this scene's cast + witnessed
  observations} → the director decides → it **forces** the cast (and/or
  narrates the environment) → results + new observations feed the next beat.

### Where the pieces live

| Concern | Home |
|---|---|
| The narratorial **voice** | one universal system prompt (cached prefix) |
| A character's **persona + memory** | **data on the entity**, loaded into the beat when in the active cast |
| The **observations** | per-scene witness buffer (Witness pattern) + biome/event broadcasts |
| **Authority** to act | the single director giver (force-bounded by each target's perms) |
| **Attribution** | the forced target (the room for unattributed ambient) |
| Multi-stage / scheduled behavior | a **script** the director authors — see [scripting-slate](../tails/scripting-slate.md) |

### MCP boundary

- **Runtime driving (NPCs / ambient): no MCP.** It's all in-process; the
  server calls its own verb dispatch directly. Wrapping that in MCP is
  overhead to talk to yourself.
- **MCP earns its place only across a boundary** — external clients reaching
  *into* the game: a builder using Claude Desktop to author content, a dev
  tool, or (later) splitting LLM orchestration into its own service. The
  trigger is "does an external client need a way in?" — a future question,
  not now.

---

## Distinctness: the four axes

*Answers open Q2 (persona/memory shape on entities).* The observed failure
mode of LLM NPCs is that they all sound like the same helpful assistant in
different hats — because they're handed the same oversized context and the
same objective. **Distinctness is a property of the context, not of the
prompt.** Persona prose ("you are a gruff blacksmith") is a costume over one
distribution and wears off within a few hundred tokens.

So a character's block is assembled from four axes, each already a shipped
subsystem — no new authored personality field:

| Axis | What it is | Rides |
|---|---|---|
| **Knows** | perception-scoped context — what it can sense and recall, never world state | [perception](../../subsystems/perception.md), [belief](../../subsystems/belief.md) realms, [concealment](../../subsystems/concealment.md), [light](../../subsystems/light.md), the [record layer](../../subsystems/record-layer.md) |
| **Is** | trait vector × regard toward *this specific speaker* × current vitals | [trait](../../subsystems/trait.md) (17 opposed pairs), belief/regard, [renown](../../subsystems/renown.md) |
| **Wants** | a job, a shift, stock, a debt — something to lose | [employment](../../subsystems/employment.md), [contract](../../subsystems/contract.md), [banking](../../subsystems/banking.md), [activity](../../subsystems/activity.md) |
| **Can** | its verb list **is** its tool schema | `augmentation.getActiveMixins`, affordance attribution |

Every row is a number or a data source. Nobody writes "gruff."

Two consequences:

- **The context block is a perception query, never a state dump.** This is an
  integrity requirement, not flavor — a character whose block contains ground
  truth will leak it, and a barkeep who knows you're disguised because the
  context said so breaks [belief](../../subsystems/belief.md)'s disguise
  exactly the way a client-side cheat breaks combat (**A8**, server-authoritative
  everything).
- **Feed beliefs, not facts.** The most characterful thing an NPC can be is
  *confidently wrong*, and the belief store is built for it — beliefs diverge
  from truth and rumour mutates as it propagates. This is substrate almost
  nobody else has.

### Over-helpfulness is cured mechanically, not by prompting

An assistant-tuned model wants to serve the player. The fix is that the
character has a shift to work and the engagement framework can simply end the
conversation — [activity](../../subsystems/activity.md) slot contention
already models "busy." An NPC who walks off because its cadence trigger fired
is more in character than any instruction could make it.

### The line that cannot be crossed

[uncertainty.md](../../uncertainty.md) bans **resolutional** randomness and
**A6/A10** forbid a die between a choice and its outcome. A language model is
a sampler, so: **it generates, it never resolves.** It decides what a
character says and raises; it does **not** decide whether the lock opens, the
trade clears, or the character was persuaded. Output is a *proposal* routed
through the ordinary dispatcher, which may refuse it — the same
librarian-not-judge line the constitution series draws.

That constraint is also the security bound: players will type injection
attempts at NPCs, and the ceiling on what one can be talked into is whatever
`force` already permits for that target. Con artistry becomes gameplay; it
never becomes code-trust.

---

## Knowledge asymmetry — where the director model needs help

*Refines decision #2 and open Q4.* The showrunner model is right about
**performance** and wrong about **knowledge**. One director assembling one
scene context reads every character's block at once, so an NPC holding
information whose leakage breaks a mechanic — a disguise, a concealed item, a
secret, a sensor only they can read — has no *structural* guarantee of
keeping it. Prompt discipline is not a mechanism.

**The hybrid:**

- **Director by default.** Ensemble scenes, banter, ambient narration, extras
  — one call, one cached prefix, coherent chemistry. Unchanged.
- **Isolated per-character call when knowledge asymmetry is load-bearing.**
  The character's block is assembled alone and no other character's block is
  in the window. Triggered by the mechanics that already exist: an active
  disguise, a concealment band, a per-viewer belief divergence, or an
  instrument/sensor whose reads are private to one entity.

The partition lives in the **data layout** either way; the isolated call is
what makes it enforceable rather than instructed. This keeps decision #2's
cost and chemistry win for the ~90% case and buys honest fog for the rest.

---

## Funding: sponsorship, not player budgets

The obvious funding model — each player buys a token budget, or supplies
their own API key, for smarter NPCs — is **barred by an eternity clause**:

> **Art. I §2 — No money buys advantage.** Real money may fund the world and
> earn a *voice* in its governance; it may never purchase in-world currency,
> property, or any gameplay advantage.

A paying player who gets a conversational NPC while a non-paying player gets
a canned tree has bought gameplay advantage. Unamendable except by founding
anew (Art. X §4). No packaging fixes it.

**Invert who the money attaches to.** A patron funds *the NPC's* inference,
and that NPC is articulate **for everyone who talks to her**. Same money,
same cost relief, benefit non-excludable — which is real money funding the
world, exactly what Art. I §2 permits, earning capital-chamber standing
through machinery that already exists. It is also the better pitch for a
patronage-driven community:
*adopt Rhonda; she stays sharp while she's sponsored*, and if sponsorship
lapses she narrows for everyone at once, which is legible and fair.

**The parity floor that makes any paid layer legal:** everything an LLM
character can say must be reachable through the deterministic path — the tree
responder, a `read` on an instrument, an authored line. **The tree must be
complete, not a degraded stub.** That buys three things at once: the paid
layer changes texture rather than outcomes; the game is fully playable with
no API key configured; and budget exhaustion becomes graceful narrowing
instead of an NPC going mute mid-scene. The honest target is that *the floor
is good*, not that the ceiling is hidden — a regular will notice the
difference, they just cannot learn anything a free player cannot.

**Against bring-your-own-key**, if it is ever revisited:

- Custody of user API keys is a liability class the project does not
  currently carry (the encrypted-at-rest pattern exists for OAuth tokens in
  `twitch_profiles` / `kick_profiles`, but a leaked key is the user's money).
- Proxying or reselling inference has commercial-terms implications — read
  them before building, do not assume.
- "Paste your API key" is the least diegetic possible surface.
- ⭐ **Decisive, and checkable before any build: prompt caching is
  per-organization.** The stable identity prefix is the bulk of a
  character's token weight and the volatile delta is small. One operator key
  caches that prefix once and every player reads it; N players with N keys
  means N cold caches for the same block, every session. BYO-key can
  plausibly cost **more in aggregate** than paying centrally — which inverts
  the whole reason for it. Measure this first; if it holds, the branch closes
  on economics and the rest never needs litigating.

If per-player budgets are ever built anyway, two rules: **meter in abstract
units, never tokens** (the moment a player can do arithmetic they ration
their own conversation, which is the opposite of immersion), and prefer a
flat subscription with a soft cap over a meter.

---

## Cost shape

*Answers open Q6.* The blow-up is never per-call price; it is fan-out — N
characters × every utterance. Three levers in order:

1. **Gate with the witness triggers already shipped.** Most NPCs should not
   be listening, which is also realistic. A design decision, not an
   optimisation — and the same gate as open Q1's salience question.
2. **Tier the models.** A small fast model for "does this concern me?"
   routing and ambient chatter; a frontier model for a named character in a
   real conversation.
3. **Cache the identity block.** Caching is prefix-match, so the layout is
   stable-first / volatile-last: identity + standing orders + lexicon cached,
   perception delta fresh. Verify with `usage.cache_read_input_tokens` rather
   than assuming. To inject world events mid-conversation, append a
   `{"role": "system"}` entry to `messages[]` instead of editing the
   top-level system prompt — it preserves the cached prefix and is the
   injection-safe operator channel, which matters when players type at the
   thing.

Offline work — overnight reflection, rumour propagation, restock decisions —
goes through the Batch API at half price. Background characters can have a
day's ambient lines generated overnight against *yesterday's real events*:
static at runtime, zero latency, still about today.

Order-of-magnitude for three live characters in one locality with gating:
roughly **$0.50–$1 per player-hour** at frontier pricing, materially less
with a small model routing. ⚠ Back-of-envelope — the first experiment exists
to replace it with a measurement.

---

## The first experiment

Deliberately **not** the content build. **One LLM brain on one existing
Dave's Bar NPC**, operator-funded, no budget system, no metering, no
sponsorship. [Dave's Bar](./daves-bar-slate.md) is built and the libations
build gave it a real supply chain, so there is state worth talking about
today.

What it is for: does perception-scoped context actually produce distinct
behaviour; can the model drive the dispatcher without breaking it; what does
an hour really cost. Every expensive decision above is de-risked by that one
number. The [Rejection](./rejection-slate.md) town is then a content build
done because it is wanted — not a prerequisite.

---

## Open questions

1. **Salience gate** — what tips a locality from "rote, lower-rung" into
   "warrants a director beat," and how the active-cast set is assembled.
2. **Persona/memory shape on entities** — ✅ **answered** by § *Distinctness:
   the four axes* (knows / is / wants / can, each a shipped subsystem).
   Still open: cross-scene consistency — the rule is that anything a
   character asserts is written back as a belief/chronicle row so the
   *record*, not the model's memory, is the source of truth.
3. **Extra ↔ principal graduation** — when a directed extra (the nameless
   drunk) becomes a named character with persistent persona.
4. **Director ↔ `Behaved` integration** — the director as the `llm-brain`
   rung vs. a scene-level service that fronts the shared narrator; how it
   composes with per-NPC lower-rung brains running concurrently. Partly
   addressed by § *Knowledge asymmetry* (director by default, isolated call
   when asymmetry is load-bearing).
5. **Content filtering / safety** — the generated text passes through engine
   output; where the filter sits; prompt-injection bounds (force is already
   capability-bounded + player-excluded).
6. **Cost / cadence model** — ✅ **answered in shape** by § *Cost shape*
   (witness gating, model tiering, prefix caching, Batch for offline).
   Open: the actual numbers, which the first experiment produces.
7. **Sponsorship mechanics** — how an NPC's sponsored/unsponsored state is
   held, displayed, and degraded; whether it reads as a capital-chamber
   contribution for standing purposes.

---

## What this slate does NOT cover

- **The brain ladder / `Behaved` / triggers / engagement** →
  [npc-behavior-slate.md](./npc-behavior-slate.md).
- **The scripting language itself** → [scripting-slate.md](../tails/scripting-slate.md).
- **LLM-assisted authoring** → [authoring-intelligence-slate.md](./authoring-intelligence-slate.md).
- **The Claude API mechanics** (models, tool use, caching, statelessness) —
  platform detail, not engine design.
