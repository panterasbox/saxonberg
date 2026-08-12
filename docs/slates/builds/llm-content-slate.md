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

## Open questions

1. **Salience gate** — what tips a locality from "rote, lower-rung" into
   "warrants a director beat," and how the active-cast set is assembled.
2. **Persona/memory shape on entities** — how a character's voice + rolling
   memory are stored (data on the entity) and projected into the beat;
   cross-scene consistency.
3. **Extra ↔ principal graduation** — when a directed extra (the nameless
   drunk) becomes a named character with persistent persona.
4. **Director ↔ `Behaved` integration** — the director as the `llm-brain`
   rung vs. a scene-level service that fronts the shared narrator; how it
   composes with per-NPC lower-rung brains running concurrently.
5. **Content filtering / safety** — the generated text passes through engine
   output; where the filter sits; prompt-injection bounds (force is already
   capability-bounded + player-excluded).
6. **Cost / cadence model** — beat frequency, caching discipline (stable
   voice prefix), model tiering per scene importance.

---

## What this slate does NOT cover

- **The brain ladder / `Behaved` / triggers / engagement** →
  [npc-behavior-slate.md](./npc-behavior-slate.md).
- **The scripting language itself** → [scripting-slate.md](../tails/scripting-slate.md).
- **LLM-assisted authoring** → [authoring-intelligence-slate.md](./authoring-intelligence-slate.md).
- **The Claude API mechanics** (models, tool use, caching, statelessness) —
  platform detail, not engine design.
