# NPC dialogue slate (working doc)

> **Status: direction set, internals open.** Captures how players hold
> conversations with NPCs. The architecture is decided (one speech
> output, swappable responder "brains," through the command framework);
> the authoring formats and the intent-matching depth are the open work.

Working slate for **NPC dialogue** — talking *with* the world's
inhabitants, from a barkeep's banter to a quest-giver's branching
setpiece. It sits on top of the communication substrate: players address
NPCs through the ordinary speech path, and NPCs answer through it too.

The load-bearing decision: **dialogue runs through the command framework
with a uniform, room-visible speech output and a *pluggable responder*
behind each NPC — it is not a separate single-player menu minigame.**
Addressing an NPC delivers your utterance to that NPC's responder; the
responder decides what to say and emits it via normal speech everyone in
range hears. The responder's *brain* is swappable — a branching tree, a
scripted free-text conversation, or (later) an LLM — but the interface a
player uses and the output others perceive never change. This is what
keeps dialogue multiplayer-native and lets content grow from simple to
sophisticated without changing how players talk.

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
- [docs/subsystems/prompt.md](../../subsystems/prompt.md) /
  [prompt-stack-slate.md](../tails/prompt-stack-slate.md) — `PromptApi` choice
  prompts. **The branching-tree mode is built on these** (the choices
  are prompts, private to the chooser).
- [docs/subsystems/activity.md](../../subsystems/activity.md) — the
  engagement framework. **"In conversation" is a `SustainedEngagement`**
  on the `attention`/`voice` slots — an observable world state, which is
  what makes a branching dialogue non-modal.
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

```
player addresses NPC                     NPC responder (pluggable brain)
  ─ say --to barkeep "got any ale?"  ──▶   • branching tree
  ─ (or a tree choice-prompt)              • scripted conversation
                                           • LLM (deferred)
                                                   │
                                                   ▼
                                         emits reply via normal speech
                                         (Scene → room-visible say;
                                          acoustic in-person / implant remote)
```

The seam: **addressing an NPC delivers the utterance (or choice) to its
responder; the responder replies through the speech path.** Uniform on
both ends — only the brain differs. The input mechanism varies by mode
(free-text directed say vs choice-prompt); the *output* never does.

A key invariant from the comms model: **choosing is interior, speaking
is exterior.** Whatever private mechanism a player uses to form their
half (a free-text line, a wheel choice) stays private; the *resolved
line is spoken aloud* and heard by the room. That single split is what
makes even a branching wheel multiplayer-safe.

---

## The three responder modes

| Mode | Player input | Best for |
|---|---|---|
| **Branching tree** | choice-prompts during a `voice` engagement | authored setpieces — quest-givers, negotiations, interrogations, story beats, tutorials, consequential choices |
| **Scripted conversation** | free-text `say --to` + intent match | ambient/exploratory NPCs, world texture, the bulk of the world |
| **LLM** *(deferred)* | free text → model | open-ended; lands as a fuzzy front-end over authored content |

### Branching tree (Mass-Effect-style, MUD-native)

Predetermined both sides; the player navigates authored choices with
real consequences. It decomposes into **substrate that already exists**,
which is what makes it non-modal:

- **Choosing = a prompt.** The wheel is `PromptApi` choice-prompts
  delivered to the chooser, per-Interactive. Private.
- **Being in it = an engagement.** A `SustainedEngagement` on
  `attention`/`voice`, so *"Bobalu is deep in conversation with the
  barkeep"* is an observable state — others see you're occupied without
  seeing your options.
- **Output = room-visible `say`.** Picking a choice makes your character
  *speak the authored line aloud*; the NPC replies in kind. The room
  hears the whole exchange.

So others **spectate by overhearing** — your party watches you sweet-talk
the guard, hearing both halves, never seeing your wheel. The "menu" was
only ever a problem when treated as the *output*; the output is speech.

Cost is low: it's **composition** of prompt + engagement + speech. The
genuinely new surface is the *authoring format* (nodes, choices, guards,
consequences, which line each choice speaks).

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

### B — quest-giver setpiece (tree)

You trigger the quest → a `voice` engagement opens; choice-prompts offer
your authored responses. You pick "Threaten him." → your character
*says* the line aloud; the NPC recoils and replies; the tree branches; a
reputation effect applies. Your party, present, overhears the whole
negotiation and sees you were "in conversation" — but never your wheel.

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

## What this stresses

- **Comms** — supplies directed speech (`say --to`) as input and the
  speech path as output; the acoustic/implant transport choice.
- **Prompt substrate** — choice-prompts for the tree mode (per-
  Interactive, private).
- **Activity/engagement** — the `SustainedEngagement` (attention/voice)
  that makes "in conversation" observable and non-modal.
- **Messaging** — replies ride the Scene composer like any speech.
- **Language / sound** — acoustic dialogue is comprehension- and reach-
  gated; the responder is agnostic to that layer.
- **Quest / world state** — responders *read* flags/reputation; the
  quest system itself is consumed, not defined here.
- **Module taxonomy** — dialogue content (trees, rules, hooks) is *data
  on the NPC* (templates), with a small set of responder *strategy*
  implementations; **not** an Api or controller per NPC. Fits the
  content-as-templates + HMR-controller precedents.

---

## Open questions

1. **Branching-tree authoring format.** Node/choice/guard/consequence
   shape, and how it shares conversation state with the scripted-rule
   format so a mixed NPC is coherent. The core new content surface.
2. **Scripted intent-matching mechanism.** Pattern/synonym tables,
   pre-LLM NLP depth, the fallback model. *This is the crux of whether
   the workhorse feels alive or lame.*
3. **Wave order: tree-first or scripted-first?** *Lean tree-first —
   it's deterministic, composes existing substrate, and ships authored
   quality with no Eliza risk; scripted is higher-value for world
   texture but higher-risk.* A real call.
4. **Where responder logic lives** (module category). *Lean: content as
   templates on the NPC + a few responder strategy classes; no Api-per-
   NPC.*
5. **Conversation state** — storage + lifetime (ephemeral per-
   conversation vs persistent per-relationship), and how it links to a
   future relationship/social-graph system.
6. **Does undirected `say` trigger NPCs?** *Lean: directed (`--to`) is
   the handshake that triggers a response; undirected room chatter may
   trip ambient keyword "barks" as an opt-in, but isn't addressed.*
7. **NPC initiative.** Proactive greetings, ambient prose, leading
   without being prompted — how much and how authored.
8. **Discoverability rendering.** How hooks surface in NPC prose so they
   read as conversation, not a disguised menu.
9. **Multiplayer tree participation** — driver-only vs free-text
   interjection vs party-vote. *Lean: overhear-only v1.*
10. **LLM hybrid** — when it lands and the exact front-end contract.
    Deferred; the responder seam already accommodates it.

---

## Build order

Indicative; final cut at requirements. Depends on comms shipping
directed speech first.

**Wave 1 — the seam + branching trees.** The responder framework (the
pluggable seam: address → responder → speech) + the branching-tree
responder, composed from `PromptApi` (choices) + the engagement
framework (the observable "in conversation" state) + `say` (output) +
the tree authoring format. De-risked (deterministic, reuses substrate),
ships authored setpiece quality immediately.

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

---

## Once shaped into formal requirements

This slate boils down to:

- The **responder seam**: address-NPC → pluggable responder → room-
  visible speech; the uniform input/output contract; the interior-
  choosing / exterior-speaking invariant.
- The **branching-tree responder** as a composition of `PromptApi` +
  the `SustainedEngagement` (attention/voice) + `say`, plus its
  authoring format (nodes/choices/guards/consequences/spoken lines).
- The **scripted-conversation responder**: intent matching, conditional
  state rules, NPC-led diegetic hooks, graceful redirecting fallbacks.
- **Conversation/relationship state** shared across modes; its storage +
  lifetime.
- The **mode-mixing** contract (one NPC, banter ↔ setpiece, shared
  state).
- Transport-agnostic operation (acoustic in-person, implant remote),
  consuming comms.
- The deferred **LLM front-end** contract (fuzzy match → authored
  responses).
- Tests gating: a directed utterance reaches the responder and a reply
  is heard by the room; a tree choice is private but its spoken line is
  public; an engaged NPC reads as "in conversation" to others; a
  scripted miss redirects in-character; a mixed NPC's banter reflects
  setpiece state.

Multiplayer tree participation, the LLM hybrid, ambient initiative, and
the relationship-system links wait for their own waves.
