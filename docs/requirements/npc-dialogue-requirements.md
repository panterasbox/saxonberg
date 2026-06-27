# NPC dialogue (Wave 1) — requirements

How players hold conversations with NPCs. This build delivers the
**responder seam** — engaging an NPC (the new `talk to` verb) routes
you to a pluggable responder behind it, and the responder replies
through the ordinary, room-visible speech path — plus the **first
responder: the branching-tree responder**, composed from substrate
that already ships (`PromptApi` choices, the `SustainedEngagement`
framework, and the Scene-composed speech path). Dialogue is
multiplayer-native by construction: the wheel of choices is private to
the chooser, but the resolved line is *spoken aloud* and heard by the
room — **choosing is interior, speaking is exterior.**

**The NPC leads.** You engage; the NPC speaks the first beat (its
guard-selected root node); your response choices follow. A tree is a
deliberate engagement, not a side effect of talking near someone.

This is Wave 1 of the [npc-dialogue
slate](../slates/builds/npc-dialogue-slate.md) and phase 2 of the
[Dave's Bar track](../tracks/daves-bar-track.md) ("they talk"). It
rides the shipped behavior substrate
([behavior.md](../subsystems/behavior.md)) — the responder is a
**brain** in the existing `behaviors:` model — and consumes comms
([comms.md](../subsystems/comms.md)), prompt
([prompt.md](../subsystems/prompt.md)), and activity
([activity.md](../subsystems/activity.md)). The scripted free-text
responder, the LLM front-end, multiplayer participation, and the
relationship/social-graph state layer are explicitly **out of scope**
(later waves / other builds).

## Goals

- **The responder seam exists.** Engaging an NPC routes you to that
  NPC's responder; the responder decides what the NPC says and emits it
  through normal speech that everyone in range perceives. Input
  mechanism may vary by responder mode; the **output never does**
  (always room-visible speech via the Scene composer).
- **The responder is a brain.** Dialogue responders live in the
  existing `behaviors:` data list as a `tree-dialogue` brain whose
  `config` is the tree. No Api-per-NPC, no controller-per-NPC — content
  as templates, logic as a small set of path-resolved strategy modules,
  per the behavior-subsystem precedent.
- **A `talk to` engage verb opens conversations.** A new player-facing
  verb (`talk to <npc>`, alias `converse`) is the deliberate opener for
  tree NPCs. It speaks no player line — it engages — and the NPC leads
  with its root beat. (Directed `say --to` stays plain speech this build
  and becomes the *scripted* responder's handshake in a later wave; the
  `addressed`/`handleMessage` trigger lands then, not now.)
- **The NPC speaks first.** The first dialogue message is always the
  NPC's guard-selected root node — authored, deterministic. Player
  response choices follow.
- **The branching-tree responder ships.** `talk to` a tree-bearing NPC
  opens a conversation: a `SustainedEngagement` on the `voice`+
  `attention` slots **on both participants** (so the NPC's ambient
  cadence brains yield and the engagement reads from both sides), the
  NPC's beat spoken aloud, and the player's response options delivered
  as **private `PromptApi` choices**. Picking a choice makes the
  player's character *speak the authored line aloud*; the NPC replies in
  kind; the tree advances.
- **Conversational NPCs are discoverable.** A tree-bearing NPC
  **affords `talk`** (visible in the verb surface via affordance
  attribution; silent scenery NPCs do not, and `talk to` them declines
  gracefully) and carries a conversational cue in its `look`/examine
  description. Diegetic + systemic, no UI menu of conversation targets.
- **Tree conversations are 1:1 in Wave 1.** The NPC's `voice`/
  `attention` engagement makes a tree a single-driver exchange; a second
  player engaging a busy NPC is declined gracefully ("the barkeep's
  busy with someone"). Others participate by overhearing.
- **The interior/exterior invariant holds.** Other players in the room
  **overhear both halves** of the exchange (the spoken lines) and can
  see the participant is "in conversation" (the observable engagement),
  but never see the choice wheel.
- **A tree authoring format exists** that expresses: nodes (the NPC's
  spoken beat), choices (each carrying the line the player speaks, a
  guard, a target, and optional effects), guard-selected entry, and
  terminal/leave nodes. It is **pure declarative data** on the NPC
  template, validatable at the CMS save-gate.
- **Guards and consequences are a declarative vocabulary.** Guards are
  structured predicates over a fixed fact namespace (ephemeral
  conversation state, regard, trait position, game time/world).
  Consequences are a small **registered effect-verb set** (write
  ephemeral state, apply a regard delta toward the speaker, branch/end,
  emit a line) — extensible by future builds (quest, advancement) without
  reopening the format.
- **Voice from traits, warmth from regard — read-only.** Guards may
  read `TraitApi.positionFor` and `RegardApi.getRegard` so a tree can
  select a warmer entry node or branch for a Gregarious / well-regarded
  NPC. The one *write* is the regard-delta effect (an NPC warming to or
  cooling on the speaker), which **persists** via the belief store even
  though node state does not.
- **Transport-agnostic by contract.** The responder does not branch on
  how it was reached. Wave 1 ships only the **in-person** `talk to`
  entry (acoustic, proximity); the same tree could later be reached by
  an implant entry, which arrives with the remote/`tell` scripted path
  in a later wave. The contract stays transport-agnostic without
  overbuilding a remote-tree UX this build.
- **Graceful exit.** A conversation ends cleanly at a terminal node or
  via an explicit leave path; the engagement is released; disconnect /
  the participant leaving the room aborts it without orphaning state or
  prompts.

## Non-goals

- **Scripted free-text intent matching.** The `intent-dialogue`
  responder (pattern/synonym tables, conditional state rules, NPC-led
  diegetic hooks, graceful redirecting fallbacks) is **deferred to a
  follow-on wave.** Until then the bar cast banters via the existing
  `random-chatter` / `converses` / `idles` brains. The seam this build
  defines must accommodate it as a second brain with no contract change.
  The directed `say --to` handshake, the `addressed`/`handleMessage`
  trigger, and the implant `tell` (remote) entry all land **with** the
  scripted responder, not in this build. (Slate Wave 2.)
- **The LLM responder.** Deferred. Only the responder contract it will
  satisfy (fuzzy front-end → authored intents → deterministic responses)
  is kept in mind; no integration here. (Slate Wave 3.)
- **Persistent per-relationship conversation state.** Ephemeral
  per-conversation scratch state only this build. Durable per-(NPC,
  player) flags / "what you've learned" / quest progress wait for the
  relationship / social-graph build. (Regard is already persistent and
  carries cross-conversation warmth.)
- **Multiplayer tree participation beyond overhearing.** One driver
  drives the tree; others overhear. Party free-text interjection,
  turn-taking, and party-vote-on-a-choice are deferred. (Slate Wave 3.)
- **Speech-triggered responses.** Conversations open only via the
  `talk to` verb this build; neither undirected room chatter nor
  directed `say --to` triggers a tree. Opt-in ambient keyword "barks"
  on overheard speech are deferred.
- **NPC initiative / proactive dialogue depth.** Proactive greetings
  already exist via the `greets` brain; richer unprompted leading is a
  scripted-wave concern.
- **The quest / flag / reputation system.** Consequences may *read*
  world/time/regard/trait facts and apply regard deltas; they do not
  define a quest or flag system. The effect-verb registry is the seam a
  future quest build extends.
- **The comms transport and the emote channel.** Directed speech and
  the acoustic/implant split are owned by comms; emotes by the soul
  path. Dialogue consumes both; it composes with emotes (an NPC may
  frown *and* speak) but does not own them.

## Surface decisions

### Wave scope — trees only

**Q (slate #3): tree-first or scripted-first?** **Trees only this
build.** The branching-tree responder is deterministic, composes
existing substrate (prompt + engagement + say), and ships authored
setpiece quality with **no Eliza risk**. The free-text scripted
responder is higher-value for world texture but is where
"free-text-without-LLM" quality is won or lost; it takes on the harder
authoring discipline and is deferred to its own wave. The Dave's Bar
track's "trees + scripted banter" framing is satisfied for now by the
existing chatter brains providing banter while trees provide the
talk-*to*-the-cast setpieces.

### Where the responder lives — a brain in `behaviors:`

**Q (slate #4).** A `tree-dialogue` brain (path-resolved module under
`lib/behavior/`, `export const brain = class {…}`, the established brain
category) whose spec `config` carries the tree. No new module category,
no Api/controller per NPC. An NPC without a `tree-dialogue` behavior is
not engageable via `talk` (its other brains, e.g. `reacts`/`greets`,
may still fire on the speech witness). The `addressed`/`handleMessage`
trigger that the behavior doc pre-declares is **not** used this build —
it belongs to the scripted responder (see *Entry*, below).

### Conversation state — ephemeral only

**Q (slate #5).** Per-conversation scratch state (current node, beats
covered) owned by the framework for the life of the engagement, gone
when it ends. Re-addressing starts fresh at the guard-selected entry.
Persistent per-relationship state is deferred. Cross-conversation
warmth is carried by **regard** (already persistent in the belief
store), not by a new dialogue store.

### Multiplayer — overhear-only

**Q (slate #9).** One driver drives; everyone in range overhears both
spoken halves and sees the "in conversation" engagement, but never the
wheel. Interjection / turn-taking / vote deferred.

### Entry — a dedicated `talk to` verb; the NPC leads

**Q (slate #6, reframed for trees).** Trees are opened by a new
player-facing **`talk to <npc>`** verb (alias `converse`), not by
directed speech. Rationale: in tree mode the *content* of an opening
line is ignored (matching is the scripted wave), so a free-text opener
would speak a sentence into the room only to have it ignored — a
dishonest "wasted line" — and would make every directed line risk
re-opening a setpiece. A dedicated engage verb reads honestly ("approach
to converse"), is the natural home for the discoverability affordance,
and keeps `say --to` free for roleplay. The NPC speaks first (the
guard-selected root beat); the player's words never enter a tree.

The slate's "directed `--to` is the handshake" applies to the
**scripted** responder (where words get matched); that, and the
`addressed`/`handleMessage` trigger and the implant `tell` entry, land
in that later wave. Undirected room chatter triggers nothing.

### Discoverability — afford `talk` + an examine tell

**Q (slate #8, reframed).** Which NPCs are conversational is signalled
two ways: a tree-bearing NPC **contributes a `talk` affordance** (via
the command-routing affordance-attribution machinery — visible in the
verb surface; silent NPCs do not afford it and decline `talk to`
gracefully), and its `look`/examine text carries a diegetic
conversational cue ("the barkeep catches your eye, ready to chat") —
not a gamey badge. The cast also greets proactively (`greets` brain).
No UI menu of conversation targets.

### Guard / consequence form — declarative vocabulary

**Q (slate #1, the core content surface).** Guards are structured
predicates (`{fact, op, value}`) over a fixed fact namespace —
ephemeral conversation state, regard (`RegardApi`), trait position
(`TraitApi`), and game time / world state. Consequences are a fixed,
**registered effect-verb set**. Both are **pure data** (no expression
parser, no per-conversation code escape) so the whole tree is
CMS-validatable content and matches the `behaviors:`-config grain.
Expressiveness beyond this (computed predicates, scripted beats) waits
for the scripting build; the registry is the seam quest/advancement
extend.

### Effect scope — state + regard + flow, extensible

**Q (slate, effect surface).** A consequence may: write ephemeral
conversation state, apply a **regard delta toward the speaker** (via
`RegardApi.adjustRegard(npc, player, delta)` — the warmth tell, which
persists), branch to a node / end the conversation, and emit a spoken
or emote line. Implemented as a small registered effect-verb set so
future builds add verbs (set quest flag, grant XP, …) without reopening
the authoring format. No quest-flag or item effects this build.

### Entry / exit / engagement model (determined by the grain)

`talk to` a tree-bearing NPC opens a `SustainedEngagement` on the
`voice`+`attention` slots **on both the player and the NPC** (so "X is
deep in conversation with the barkeep" is observable from both sides,
the player is occupied, and the NPC's ambient cadence brains yield, per
the activity model + behavior slot contention). Because the NPC's slots
are held, a tree is **1:1** — a second player's `talk to` on a busy NPC
is declined gracefully. The **entry node is guard-selected** (first
useful guard wins) so regard/trait/time can pick a warm vs neutral
opening. Terminal nodes and an explicit leave path end the engagement
and release the slots on both sides; participant disconnect or either
party leaving the room aborts it (prompts cancelled, ephemeral state
discarded).

## Constraints

- **Content as data, not code.** The tree, its guards, and its
  consequences are declarative data on the NPC template — no
  Api-per-NPC, no controller-per-NPC, no free-floating helper modules.
  Responder *strategy* is a brain (the sanctioned code category). See
  [Module Categories](../../CLAUDE.md) and
  [behavior.md](../subsystems/behavior.md).
- **One output channel.** All NPC replies and all player spoken lines
  ride the Scene composer as ordinary directed speech — never a private
  side-channel, never a modal panel. The interior/exterior invariant is
  load-bearing for multiplayer coherence.
- **The `talk` verb is an ordinary command.** YAML view + controller in
  the appropriate category (social), per
  [command-spec.md](../subsystems/command-spec.md) — not a bespoke
  entry path. The engage targets a perceivable NPC in range; affordance
  attribution makes it discoverable on tree-bearing NPCs.
- **No new global events.** No global event bus is introduced. (The
  later scripted responder's `addressed` trigger will be a
  `SensorMixin.handleMessage` topic predicate, consistent with the
  behavior subsystem's "everything an NPC reacts to it already
  perceives, or it is a timer" rule — but that is a later wave.)
- **Go through the Api layer.** Effects and guard reads use the gated
  facades (`RegardApi`, `TraitApi`, `WorldClockApi`, `MessageApi`/Scene,
  `PromptApi`) — never internal mechanism directly. See
  [antipatterns.md](../antipatterns.md).
- **Prompt cleanup on disconnect.** Tree choices are `PromptApi`
  prompts; `PromptApi.cancelAll` already runs on disconnect — the
  engagement abort path must compose with it so no prompt or engagement
  is orphaned. See [prompt.md](../subsystems/prompt.md).
- **Transport agnosticism.** The responder must not branch on acoustic
  vs implant arrival; comprehension/reach gating (language, hearing) is
  a lower layer the responder ignores.
- **CMS save-gate validation.** A tree's brain path and its
  node/choice/guard/effect references are validated at author time
  (mirroring `validateBehaviorPaths`), so a dangling node target or an
  unknown effect verb is caught on save, not at conversation time.
- **`noUncheckedIndexedAccess` / strict.** Tree traversal over
  author-supplied data must handle missing nodes/choices without
  unchecked indexing.

## Acceptance criteria

- `talk to <tree-npc>` opens a conversation and the NPC's first beat
  (root node) is heard by the room — the NPC speaks first, no player
  line is emitted by the open. `talk to <silent-npc>` declines
  gracefully. Directed `say --to <tree-npc>` does **not** open a tree in
  this build (it is plain speech).
- A tree-bearing NPC affords `talk` (present in its verb surface) and
  its `look`/examine text carries a conversational cue; a silent NPC
  affords neither.
- A second player's `talk to` on an NPC already in a conversation is
  declined gracefully (1:1), and that second player can still overhear
  the ongoing exchange.
- A tree choice is delivered privately to the chooser (a `PromptApi`
  choice), and picking it causes the **player's** character to speak the
  authored line aloud — observable to a second client in the room — and
  the NPC to reply.
- A second player in the room overhears both halves and, via the
  observable engagement, can tell the first player is "in conversation"
  — but receives none of the choice prompts.
- A guard reading regard/trait/time selects a different entry node or
  hides/show a choice (test: same NPC opens warmer at high regard).
- A consequence applies a regard delta toward the speaker; the new
  regard is observable after the conversation ends (persisted) while the
  conversation node state is gone on re-address.
- A terminal/leave node ends the engagement and frees the `voice`/
  `attention` slots **on both participants**; disconnect or either party
  leaving the room mid-conversation cancels the prompts and releases the
  engagement on both sides with no orphaned state; the NPC's ambient
  cadence brains resume afterward.
- The CMS save-gate rejects a tree with a dangling node target or an
  unknown effect verb.
- A subsystem doc exists at `docs/subsystems/npc-dialogue.md` (or a
  clearly-named home) describing the responder seam, the tree format,
  the guard/effect vocabulary, and the deferred seams.
- Tests colocated under `__tests__/` cover the above behaviors.

## Cross-references

- **Seeding slate:** [npc-dialogue-slate.md](../slates/builds/npc-dialogue-slate.md)
- **Track:** [daves-bar-track.md](../tracks/daves-bar-track.md) (phase 2, "they talk")
- **Consumed substrate:**
  [behavior.md](../subsystems/behavior.md) (the brain model + the
  `addressed` seam), [comms.md](../subsystems/comms.md) (directed
  `say --to`, implant `tell`/`dm`), [prompt.md](../subsystems/prompt.md)
  (choice prompts), [activity.md](../subsystems/activity.md)
  (`SustainedEngagement`, `voice`/`attention` slots),
  [messaging.md](../subsystems/messaging.md) (Scene composer)
- **Read-only consumers:** [trait.md](../subsystems/trait.md)
  (voice — `TraitApi`), [belief.md](../subsystems/belief.md) (warmth —
  `RegardApi`)
- **Deferred / related:** scripted + LLM responders, multiplayer
  participation (slate Waves 2–3); relationship state
  ([social-graph-slate.md](../slates/builds/social-graph-slate.md));
  complex guard/effect expressiveness
  ([scripting-slate.md](../slates/builds/scripting-slate.md))
