# NPC dialogue slate (tail)

> **Status: PARTIAL** — wave 1 shipped 2026-06: the responder seam
> (`talk to` → a pluggable brain), the branching-tree responder, the
> pure-data tree format + CMS save-gate, `InstanceContributor`,
> auto-introduce → [npc-dialogue.md](../../subsystems/npc-dialogue.md)
> **Left:** the scripted free-text `intent-dialogue` responder
> (pattern/synonym tables + the `addressed`/`handleMessage` trigger + the
> implant `tell` entry; NPC-led hooks, conditional state rules, graceful
> redirects) · mode-mixing (banter ↔ setpiece over shared state) ·
> undirected `say` as an opt-in bark trigger · NPC initiative depth · the
> LLM front-end · persistent per-relationship state · multiplayer tree
> participation beyond overhearing
> **Size:** a wave

Working slate for **NPC dialogue** — talking *with* the world's
inhabitants, from a barkeep's banter to a quest-giver's branching
setpiece. It sits on top of the communication substrate: players address
NPCs through the ordinary speech path, and NPCs answer through it too.

*The responder seam shipped → [npc-dialogue.md](../../subsystems/npc-dialogue.md)
§ The responder seam (`talk to` → a pluggable brain's `open`; choosing is
interior, speaking is exterior).*

Two anti-goals, both born from the design discussion:

- **Not interrogation.** The `ask <npc> about <keyword>` idiom puts the
  burden of conversational structure on the *player* (guess the live
  nouns). That's the dated feel. The NPC carries the structure; the
  player just talks.
- **Not a modal minigame.** A BioWare/Mass-Effect dialogue *wheel* is
  single-player UX — if you freeze in a menu while three other players
  share the room, the shared space breaks. We keep branching dialogue
  but make it multiplayer-coherent (below).

See also:

- [comms-slate.md](../tails/comms-slate.md) — the transport this rides:
  directed speech (`say --to <npc> …`), the acoustic-vs-implant split
  (in-person barkeep = acoustic `say`; remote dispatcher = implant DM),
  the `whisper`/`tell` reclassification. Dialogue *consumes* directed
  speech; it doesn't define it.
- [emotes-slate.md](../tails/emotes-slate.md) — the parallel expression
  channel; NPCs emote through the same `SoulMixin` path. Dialogue +
  emotes compose (an NPC frowns *and* speaks).
- [docs/slates/language-slate.md](../tails/language-slate.md) — comprehension
  gating on acoustic NPC speech (`Vocal.speechLanguage`); a translation
  implant dissolves it.
- [docs/slates/senses-slate.md](../tails/senses-slate.md) — acoustic reach for
  in-person dialogue (who hears the exchange) — the hearing channel of
  the unified perception substrate (absorbed the sound slate).
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) /
  [docs/subsystems/command-routing.md](../../subsystems/command-routing.md)
  — the Scene composer + dispatch the speech output and addressed-input
  flow through.
- [docs/design-philosophy.md](../../design-philosophy.md) — immersion;
  "conversation, not interrogation" is Principle 2 (model honestly)
  applied to social interaction.

---

## Principle

1. **Conversation, not interrogation.** The NPC carries the
   conversational structure — it leads, volunteers hooks in its own
   prose, and reacts gracefully. The player just talks. No keyword
   hunting.
2. **Through the framework, not a minigame.** Input is the ordinary
   speech path (or prompts); output is always **room-visible speech**.
   No modal panel that excludes the rest of the room.
3. **One output, swappable brains.** Every responder mode emits the same
   thing — the NPC speaking, heard by everyone in range. The *brain*
   (tree / scripted / LLM) is a pluggable strategy behind that.
4. **Mode-mixable per NPC.** A single NPC can banter via free text and
   escalate into a branching setpiece for a key beat, then drop back.

---

## Architecture: the responder seam

*Shipped → [npc-dialogue.md](../../subsystems/npc-dialogue.md) § The responder
seam. ⚠ The shipped input is `talk to <npc>` → `open`; the diagram's
`say --to` entry is the unbuilt `addressed` path.*

---

## The three responder modes

| Mode | Player input | Best for |
|---|---|---|
| **Branching tree** | choice-prompts during a `voice` engagement | authored setpieces — quest-givers, negotiations, interrogations, story beats, tutorials, consequential choices |
| **Scripted conversation** | free-text `say --to` + intent match | ambient/exploratory NPCs, world texture, the bulk of the world |
| **LLM** *(deferred)* | free text → model | open-ended; lands as a fuzzy front-end over authored content |

### Branching tree (Mass-Effect-style, MUD-native)

*Shipped → [npc-dialogue.md](../../subsystems/npc-dialogue.md) § The tree
format, § The conversation engagement (both-sides slot hold; the room
overhears, never sees the wheel).*

*Multiplayer participation* (beyond overhearing) is a fork: base = one
driver drives, others overhear; richer = party members interject via
free-text mid-scene (mode-mixing), turn-taking, or a party vote on a
choice. Lean: ship driver-drives + overhear; layer participation later.

### Scripted conversation (the workhorse)

Free-text directed speech in; an authored brain that **leads, matches
intent generously, and degrades gracefully**:

- **The NPC leads, hooks live in the fiction.** No topic list — the
  barkeep *talks* ("'Road dust on you. Bad time to travel, what with the
  bandits on the north pass.'"), handing you threads to pull. Discovery
  is diegetic, not a UI affordance.
- **Intent matching, not keywords.** "got any ale?" / "I'll have a
  drink" / "pour me one" hit one intent via authored patterns/synonyms.
- **Conditional state rules.** Responses key on (matched intent, world/
  quest/relationship state); highest-priority rule fires and may apply
  effects. A reactive state machine of conversational beats — branching
  in the NPC's leading prose + state, never in player-facing options.
- **Graceful, redirecting fallbacks.** A miss never dead-ends with
  "Huh?" — it deflects in character and hands back a thread.

**The honest crux:** free-text-without-LLM is where quality is won or
lost. The keyword era was lame but *predictable*; free text risks the
Eliza failure (you type something sensible, the matcher whiffs,
immersion dies). This tier's quality rides entirely on generous
matching + graceful redirects + the NPC leading hard enough that players
mostly *respond to offered threads* (high match rate) rather than cold-
query (low match rate). A lazily-authored scripted NPC feels *worse*
than a clean tree, not better. That authoring discipline is the real
cost of "responsive but not LLM."

### LLM (deferred)

The natural future shape isn't "replace everything with a model" — it's
**LLM as the fuzzy front-end** (free text → one of the *authored*
intents) with **authored, deterministic responses** on the back. Free-
text feel + graceful matching from the model; the NPC's actual words,
facts, and effects stay author-controlled — bounded risk, no
hallucinated lore. Same responder contract, so it drops in without
reworking anything.

---

## Conversation state

A responder may track per-conversation state (beats covered, current
node) and per-relationship state (disposition, what you've learned, quest
flags). **Trees and scripted rules read/write the same state**, so a
mode-mixing NPC stays coherent — the banter knows what happened in the
setpiece and vice versa. Storage shape + lifetime (ephemeral per-
conversation vs persistent per-relationship) is an open question.

---

## Worked scenarios

### A — barkeep banter (scripted)

`say --to barkeep got any ale?` → intent matched → "'Aye, copper a
mug.'" Then he leads: "'You headed north? Mind the pass.'" You free-text
back; misses redirect ("'Can't say, friend — but the ale's cold.'").
Whole exchange is room-visible; your party can chime in.

### C — mixed-mode NPC

The barkeep banters (scripted) until you say something that trips the
quest hook; he escalates into a branching engagement for the contract
negotiation, then drops back to banter — state shared across both, so he
remembers the deal afterward.

### D — remote NPC (implant transport)

`tell dispatcher status?` reaches the dispatcher over the implant
(comms): same scripted responder, different transport — private, distance-
free, not room-visible. Dialogue is transport-agnostic; the responder
doesn't care whether the words arrived acoustically or by implant.

---

## Open questions

*(Q1, Q3, Q4, Q8 resolved and shipped: the tree format → npc-dialogue.md
§ The tree format; tree-first; responders are brains under `behaviors:`;
discoverability via `InstanceContributor` + authored prose cue →
§ Discoverability.)*

2. **Scripted intent-matching mechanism.** Pattern/synonym tables,
   pre-LLM NLP depth, the fallback model. *This is the crux of whether
   the workhorse feels alive or lame.*
5. **Conversation state** — storage + lifetime (ephemeral per-
   conversation vs persistent per-relationship), and how it links to a
   future relationship/social-graph system.
6. **Does undirected `say` trigger NPCs?** *Lean: directed (`--to`) is
   the handshake that triggers a response; undirected room chatter may
   trip ambient keyword "barks" as an opt-in, but isn't addressed.*
7. **NPC initiative.** Proactive greetings, ambient prose, leading
   without being prompted — how much and how authored.
9. **Multiplayer tree participation** — driver-only vs free-text
   interjection vs party-vote. *Lean: overhear-only v1.*
10. **LLM hybrid** — when it lands and the exact front-end contract.
    Deferred; the responder seam already accommodates it.

---

## Build order

Indicative; final cut at requirements. Depends on comms shipping
directed speech first.

*Wave 1 shipped → [npc-dialogue.md](../../subsystems/npc-dialogue.md).*

**Wave 2 — scripted conversation.** The free-text intent-matching
responder: pattern/synonym matching + conditional state rules + NPC-led
hooks + graceful fallbacks + conversation state. The workhorse for world
texture; the harder authoring discipline.

**Wave 3 / future.** The LLM front-end hybrid (fuzzy match → authored
responses); multiplayer tree participation; richer relationship state +
social-graph links; ambient barks / NPC initiative depth.

---

## What this slate does NOT cover

- **The comms transport** — directed speech, acoustic vs implant, the
  `whisper`/`tell` split → [comms-slate.md](../tails/comms-slate.md). Dialogue
  consumes it.
- **The emote channel** → [emotes-slate.md](../tails/emotes-slate.md). NPCs
  emote through that; dialogue composes with it but doesn't own it.
- **Prompt + engagement substrate internals** — consumed from prompt.md
  / activity.md, not redefined.
- **LLM integration internals** — deferred; only the responder contract
  it will satisfy is specified.
- **The quest / flag / reputation system** — responders read it; it's
  defined elsewhere.
- **The relationship / social-graph system** — conversation state may
  link to it later; not defined here.
