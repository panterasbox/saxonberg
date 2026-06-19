# Forums slate (working doc)

> **Status: unifying decision made; Part-0 substrate + Part-1 (popularity)
> are the near-term build, Part-2 (structure) is designed-for but deferred.**
> This slate **consciously overrides** the prior factoring in which the
> *social forum* was a chat facet ([delivery-slate](./delivery-slate.md) § L2)
> and the *argument-map* was declared **not a forum**
> ([argument-map-slate](./argument-map-slate.md)). The new thesis: **one forum
> primitive with a per-board `organizer` axis** — `'popularity'` boards rank
> by votes; `'structure'` boards are organized by argument logic and **votes
> sense but never order**. Same substrate, dialed per board. The override
> *preserves* the deliberation-ungameability principle (it lives in the
> `organizer: 'structure'` mode), it does not discard it.

Working slate for the **forums** subsystem — durable, addressable,
multi-author boards that ride the aether implant. The governing claim:
**popularity forums and structured-argument deliberation are two organizers
over one board primitive, not two subsystems.** What separates them is the
*organizer* (how sibling entries are ordered and how votes are interpreted),
not the bones (persistence, audience, access, threading, command surface).

See also (this slate supersedes the *factoring* of the first two; it does not
discard their content — it absorbs it as organizer modes):

- [delivery-slate.md](./delivery-slate.md) § *Layer 2 — comms* — the prior
  home of the **social forum** as a chat facet. **Superseded:** the forum is
  now a first-class primitive, not a `Channel` facet — but it keeps everything
  that section established: rides the aether/implant transport, binds a
  `GroupRef` audience via `GroupApi`, carries a `world.forum.*` engine `Topic`
  (L0), and the per-surface override layer (L1+) generalizes here.
- [argument-map-slate.md](./argument-map-slate.md) — the **structure
  organizer** in full. **Superseded only in framing:** the argument-map is no
  longer "not a forum" — it is the `organizer: 'structure'` specialization of
  this primitive. Its data model (typed claim-graph), its six load-bearing
  principles (structure-organizes, dissent-is-a-node, reputation-blind, …),
  and its scale open-problems (claim dedup, map-summarization) all carry over
  **unchanged** and remain the authoritative spec for that organizer.
- [cooperative-slate.md](./cooperative-slate.md) § *The feedback substrate* +
  § *Deliberation* — the **why**: the three-surface taxonomy
  (social forum / polling / deliberation), "steal Reddit's interface, reject
  Reddit's threat model," and the resolving principle **votes surface,
  behavior pays** that governs the popularity organizer.
- [docs/subsystems/chat.md](../../subsystems/chat.md) — the structural
  precedent: `Channel` = `Document` + `ChannelCatalogue` singleton `Idea` +
  `ChatApi`/`ChatLogic` split + `groupRef`. Forums copy these bones; the one
  inversion is **entries persist** (chat messages are an ephemeral 200-ring;
  forum entries are the point and are Documents).
- [docs/subsystems/grouping.md](../../subsystems/grouping.md) — the `GroupRef`
  + `GroupApi` facade every board binds for audience/roles (provider-agnostic:
  managed Group / MQL / contacts).
- [docs/subsystems/comms.md](../../subsystems/comms.md) +
  [docs/subsystems/augmentation.md](../../subsystems/augmentation.md) — the
  aether host ⊕ hosted-update relation the forum capability rides (DM-style:
  a hosted capability on the universal aether implant; `findReachable`
  host-descent; `Species.innateMixins` conferral).
- [docs/subsystems/reactions.md](../../subsystems/reactions.md) — the
  `commandId` gutter / message-id substrate the thread-tree threading rides,
  and the emote-aggregation reaction layer entries reuse.
- [docs/subsystems/chronicle.md](../../subsystems/chronicle.md) — the
  append-only ledger precedent (dumb store / smart consumers) the
  **`forum_events`** log follows; the tamper-evident archive shape.

---

## The spine

1. **One primitive, two organizers; one hierarchy.** The structure is
   **`Board → Thread → Post`** in *both* organizers: a **Board** is a
   long-lived venue/category holding many **Threads**; a **Thread** is one
   discussion unit (a *submission* in popularity, a *proposal/bill* in
   structure) — the root of a tree; a **Post** is a node in that tree (a
   *comment* / a *claim*). (In the data model all three are `Entry` rows — a
   Thread is a root Entry, a Post a child Entry; same table, different depth.)
   The `organizer` axis on the board decides how a thread's posts are ordered
   and how votes are read:
   - `organizer: 'popularity'` → votes **order** siblings (hot / new / top);
     posts collapse to a strict reply-tree; the Reddit shape.
   - `organizer: 'structure'` → the **typed edge graph organizes**; votes are
     advisory sensing only and never reorder; the Kialo / argument-map shape.
2. **Surfaces link through a Subject — 1–4 of four, at board *or* thread
   grain.** A subject lights up **any non-empty subset of four surfaces**, at
   most one each: **popularity forum** + **argument forum** (the two `Board`
   organizers) and **free chat** + **rules-of-order chat** (the two `Channel`
   procedures) — so a subject may hold both organizers and/or both chat
   procedures at once. They are **sibling manifestations of a shared `Subject`**
   — none nests in another. A `Subject` is a thin Document: identity (title) +
   an audience `GroupRef` (kept *separate* from identity) + the set of lit
   manifestations + a **grain** + lifecycle. Each surface resolves at the
   subject's grain — a **venue** (board-grain `Board`/`Channel`) or a
   **promoted topic** (thread-grain: a `Thread` on a parent board + a
   thread-scoped `Channel`). That lets a **body** be a venue Subject (a board +
   a general chat) while **each bill** is a topic Subject (a Thread + its own
   chat, plus — being a bill — an argument forum + a rules-of-order chat): one
   venue, unified debate, yet per-bill surfaces. Two lifecycle classes: **standing**
   (gossip / a guild / a legislature — long-lived) and **ephemeral** (a bill /
   event — spun up on a trigger, archived on completion; many can share one
   *audience* yet stay distinct subjects). Standing body-subjects ⊃ ephemeral
   bill-subjects, related by the thread living on the body's board.
3. **The organizer is the only divergence.** Persistence, addressing,
   audience (`GroupRef`), access (aether implant), per-surface override,
   threading, the command surface, the Catalogue — all shared **Part 0**. A
   popularity board and a deliberation board differ in *one field* and the
   ordering/vote logic that keys off it.
4. **Ungameability is preserved, not discarded.** The cooperative slate's
   fear — "in a gamified polity any ranking decays to exploit" — is answered
   exactly as before: deliberation boards run `organizer: 'structure'`, where
   there is no vote-ranking to capture. Popularity ranking is confined to
   boards that opted into it, where it drives **discovery only** (votes
   surface, behavior pays).
5. **Forums ride the aether implant (DM-style).** Participation is a hosted
   capability on the universal aether implant — the same host that carries
   comms — reached via `findReachable` host-descent, conferred by implant or
   `Species.innateMixins`. A board is an aether board; there is no external
   store (delivery-slate's diegesis + bus-primacy calls hold).
6. **Entries are durable Documents.** Unlike chat's default ephemeral ring,
   the board, every entry, and the edge structure persist (their own
   collections). The board is the archive — and for structure boards, the
   **legislative history** the argument-map slate requires. Chat gains an
   opt-in `logged` retention so an ephemeral subject's synchronous debate is
   captured into the archive too (below).
7. **Votes surface; behavior pays.** Cooperative-slate inheritance for the
   popularity organizer: cheap stated signal (votes) drives sorting/discovery
   and is **never** wired to standing/money in v1; anti-snowball (hide early
   scores), context-scope per board, trust-weighting deferred to the social
   graph.

---

## Part 0 — the board substrate (the shared bones)

The common substrate the user named "part zero." Most of it is **reuse**, not
new construction — the genuinely-new surface is small.

### Data model

- **`Subject`** (`Document`, `forum_subjects` collection) — the **linking
  spine**. Fields: `title` (identity, addressing key), `groupRef` (audience +
  roles, via `GroupApi`, **separate from identity** — many ephemeral subjects
  may share one audience ref yet stay distinct subjects), `lifecycleClass`
  (`'standing' | 'ephemeral'`), `state` (`'active' | 'archived'`), the **lit
  manifestations**, and `owner`. A subject lights up **1–4 of the four
  surfaces** (at most one each): **popularity forum** (`Board`
  organizer=popularity), **argument forum** (`Board` organizer=structure),
  **free chat** (`Channel` procedure=free), **rules-of-order chat** (`Channel`
  procedure=rules) — `{ surface, ref }`. Each resolves at the subject's
  **grain** (`'venue'` board-grain or `'topic'` thread-grain — a topic-grain
  forum is a `Thread` on a parent board). This lets a *body* be a venue Subject
  (a board + a general chat) while *each bill* is a topic Subject (a Thread +
  its own chat — and, being a bill, an argument forum + a rules-of-order chat).
  The
  Subject owns the à-la-carte light-up and the **archive cascade** (flip
  `state` → each manifestation goes read-only: a board locks, a thread locks,
  a chat seals its log). For ephemeral subjects the lifecycle is *driven
  externally* (a bill's proposal Document tells the Subject when it's on the
  floor / passed); the forum substrate just exposes mint / light-up / archive
  for the governance layer to call.
- **`Board`** (`Document`, `forum_boards` collection) — a long-lived
  **venue/category** that holds many Threads. Fields: `subject` ref (the
  *body*-subject it belongs to — Legislature, a guild council, or a gossip
  subject — for audience; **every board belongs to a subject**, even a lone
  gossip board, so the Subject is the universal root), `organizer`
  (`'popularity' | 'structure'`), `name`,
  `description`, and a thin **per-surface override** bag (pins, board-local
  bans, mods-beyond-rank, config) — `effective = projected(subject.groupRef) ±
  override`, empty 99% of the time (generalizes chat's projection+override
  beyond chat). **A structure Board is a venue (e.g. the legislative Floor)
  holding many bill-Threads — not one-board-per-bill.**
- **`Entry`** (`Document`, `forum_entries` collection) — a node in a board's
  tree. Fields: `board` ref, `parent` ref (null = **root Entry = a Thread**),
  `kind` + typed `relation` to parent, `author`, `body`, `createdAt`,
  `editedAt`, an optional **`subject` ref** (a root Entry/Thread may *be* a
  bill-subject's manifestation), `lifecycle state` (a thread locks on
  archive), versioning hooks. A **root Entry is a Thread** — a *submission*
  (popularity) or a *proposal/bill* (structure); its **children are Posts** —
  *comments* / *claims*. The `relation` is where the organizers diverge:
  popularity uses a single implicit `reply` (strict tree); structure uses the
  typed argument edges (`supports` / `objects-to` / `responds-to`) from the
  argument-map slate, **graph not strict tree** (a claim reused under multiple
  parents → DAG; open whether to permit reuse). **The substrate stores typed
  edges generically; the organizer interprets them.**
- **Chat surface** — the existing `Channel`, extended to carry a `subject`
  ref, a **`retention`** policy (`'ring'` default, the ephemeral 200-buffer of
  today; `'logged'` — every frame persisted to a `chat_log` collection), and a
  **`procedure`** mode (`'free'` default; `'rules-of-order'` — a recognized-
  speaker / motion-and-second discipline for digital deliberation). Ephemeral
  subjects default chat to `logged` (so the synchronous floor debate is
  captured complete and sealed into the archive) and may opt into
  `rules-of-order`; standing high-volume chat stays `ring` / `free`. (Chat-
  subsystem extensions, not new machinery; `procedure` is a parked surface
  policy — design deferred.)
- **`forum_events`** (`Document`, append-only, indexed by `subject` / `thread`)
  — the **durable event log**: one row per mutation (`post-created`,
  `vote-cast`, `claim-attached`, `thread-locked`, …). Chronicle-shaped (dumb
  store / smart consumers, silent append). Every mutation **dual-writes** —
  update the current-state Document, then `record` the event (append this row
  **and** fire a transient `ForumEventFired` on `EventApi`). The row is the
  **tamper-evident audit trail** + the **archive / legislative history** — the
  **durable twin, not the live feed** (the live feed is the `EventApi` fire; the
  engine re-resolves current-state docs). CRUD docs remain the source of truth;
  the log is a faithful mirror, not a rebuild source (see Client architecture
  § Reads).
- **`SubjectCatalogue`** (singleton `Idea` at `/obj/SubjectCatalogue`,
  `PostRegistrationMixin`) — named after its **root entity** the way
  `ChannelCatalogue` / `SoulCatalogue` / `TopicCatalogue` are (chat's `Channel`
  splits here into Board + Subject; the catalogue indexes the identity root).
  Warms subjects from Mongo at `postRegister` (mirrors `ChannelCatalogue`),
  indexes subjects by title and boards by name, lazy-loads each subject's
  boards and their entry trees. Owner of the runtime view; the Documents are
  the source of truth.

### Subjects, surfaces & lifecycle

The relationship between chat and forums **is** the Subject: a subject lights
up its manifestations **à la carte**, at whatever grain fits — a whole board,
a single thread, a chat — never nested inside each other. Two lifecycle
classes share the one model:

- **Standing** (gossip; a guild; a legislature) — long-lived; the audience
  `groupRef` is durable; manifestations persist until disbanded. A standing
  *body* typically manifests as a **venue Board** (+ maybe a general chat).
- **Ephemeral** (a bill on the floor; a scheduled event) — minted on a
  trigger, archived on completion. An ephemeral subject typically manifests as
  a **Thread on a body's venue board** (+ its own chat). Many share one
  *audience* (the whole legislature) yet stay distinct subjects, so 50
  simultaneous bills don't cross-link.

**The bill, worked through.** A bill is its **own ephemeral Subject** — so its
chat rides on the same subject as its deliberation — but its deliberation
manifests as a **Thread on the body's standing venue board, not a board of its
own** (a structure board roots *each thread* at a proposal; the board holds
many). Debate is therefore **unified**: one venue (the legislative Floor), all
live bills concurrent threads, everyone argues as equals (the houses weight
the later *vote*, not the deliberation — argument-map's contribute-as-equals /
decide-by-weight). On the floor the bill-subject lights up its **Thread
(structure) + a `logged` chat** (optionally `rules-of-order`). On passage the
subject flips `archived`: the thread locks into the legislative history, the
chat log seals read-only beside it.

This nests cleanly — a standing **body-subject** ⊃ many ephemeral
**bill-subjects**, related by each bill-thread living on the body's board. The
**guild / dev-team case is the same shape, smaller audience**: the body has its
own venue board (`ref: guild`), its bills are threads on it. You essentially
**never need one-board-per-bill** — the difference between a guild and the
legislature is the audience ref and which venue, not the hierarchy. (The
substrate still *permits* a subject to bind a whole board for an oddball
"dedicated space" case; it's just not the default.)

```
Subject "Legislature"  (standing; ref: all citizens)
 ├─ Board "Floor"  (organizer: structure)          ← the venue
 │   ├─ Thread: Tax Reform Act ──┐  each bill-thread is ALSO
 │   ├─ Thread: Water Rights Act │  its own ephemeral Subject
 │   └─ … (live + archived)      │
 └─ chat "Legislature general"   ▼
        Subject "Tax Reform Act"  (ephemeral; ref: all citizens)
         ├─ thread:  ↑ that Thread on the Floor board (organizer: structure)
         │              proposal (root) → objection → rebuttal; support
         └─ chat:    "Tax Reform debate"  (logged; rules-of-order optional)
            archive → lock thread + seal chat

Subject "Gossip"  (standing; ref: open/all)
 ├─ Board  organizer: popularity   (many submission-threads)
 └─ chat   retention: ring
```

### Surfaces

- **`ForumsApi`** (`mud/api/forums.ts`, thin gated facade) + **`ForumsLogic`**
  (`obj/api/ForumsLogic.ts`, HMR-able singleton at `/obj/api/forums`) — the
  chat split exactly. Logic resolves the Catalogue, mediates board/entry CRUD,
  vote application, tree reads.
- **The aether capability** — a `ForumsMixin` hosted-update riding
  `AetherHostedMixin` on the existing aether implant (CommsUpdate precedent):
  resolves `getHost()`, gates on `MixinApi.isAether(operator)`, contributes
  the `forum` verb via `commandContributions`. *(Resolved: a **distinct
  `ForumsUpdate`** = `ForumsMixin(AetherHostedMixin(Idea))`, sibling to
  `CommsUpdate`, hosted on the existing aether implant — **not** a separate
  physical implant; **born-with** via the Avatar loadout's `hostUpdate`,
  alongside comms + travel-credential.)*
- **Notifications over aether** — replies to your entries / activity on
  boards you follow arrive as ESP frames (`world.forum.*` Topic), gated by the
  attunement modality (emote-reception precedent); an offline digest on next
  attune.
- **Command surface** — a `forum` verb with **subcommand fallthrough** (the
  `chat.yaml` pattern): `forum list / make / follow / post / reply / read /
  vote / …`, bare `forum <board> …` falls through. Subcommand set diverges
  slightly by organizer (a structure board exposes `argue`/`object`, a
  popularity board exposes `vote`/sort).

### What's actually new vs. reused

| Concern | Status |
|---|---|
| Transport (aether implant) | **reused** (comms) |
| Audience + roles (`GroupRef`/`GroupApi`) | **reused** (grouping) |
| Engine `Topic` genre | **new genre** `world.forum.*`, existing mechanism |
| Threading / gutter message-id | **reused** (reactions) |
| Catalogue + Api/Logic split | **new instances**, established pattern (chat) |
| Per-surface override | **generalized** from chat |
| **`Subject` linking entity + lifecycle/archive cascade** | **new** (the spine) |
| **Persistent board + entry-tree Documents** | **new** (the real substrate work) |
| **Async-browse views + organizer ordering** | **new** |
| **Chat `logged` retention + `chat_log` collection** | **new** (chat extension) |
| Reactions on entries | **reused** (reactions) |
| **Writes: command string + structured body side-channel** | existing `command` inbound + optional `fields` payload (no string-less path) |
| **Reads: forum document-change observer** (listens on `EventApi`) | **new** (forum-scoped; MQL-sub's pattern, none of its code; MQL untouched) |
| **`forum_events` append-only log** (durable twin: audit + archive) | **new** (forum-owned; `chronicle` pattern) |
| **`ForumEventFired` live notify** | **reused bus** (`EventApi`; new event class) |
| Bus primacy / validators / response envelope | **reused** (command dispatch chain) |

---

## Client architecture (the GUI is the hard part)

The forum GUI is the most complex UI in the product after wiki/CMS. Governing
decision: **the GUI and CLI are co-equal clients of one shared layer — server
owns data + action semantics, client owns layout** (the established
server-owns-draft / client-owns-layout principle). The GUI is **not** built on
the CLI — no synthesizing command strings, no scraping text output. Three
structured channels by concern, plus the CLI as a parallel string client.

### Shell IA — a primary view *inside* the cockpit (diegetic, not a tool)

Forums are in-fiction (aether boards), so they live **inside the game cockpit**,
not as a leave-the-game tool. The client shell has no router — a
`connectionPhase` machine + a terminal-centric cockpit (Frame / LeftColumn
[TabStrip + Terminal + CommandBar] / 360px InspectionPane). The forum is **not**
a new phase (that hides the terminal/command-bar — a context switch out of the
game). It is a **new primary-view axis inside `in-world`**: a `mainView:
'terminal' | 'forum'` switch renders `Terminal` or `ForumView` in the LeftColumn
slot, while **Frame + CommandBar persist** and the **right column is
view-sensitive** (terminal → InspectionPane; forum → the chat sidecar). **Live
awareness persists** — scene says/emotes/DMs surface as a peek while you read.
Navigation is **verb-driven** (`forum` / `forum <board>` flips `mainView` +
target) and click-driven. This encodes the diegetic split: **forum = in-cockpit
view; out-of-fiction tools (CMS / wiki / settings) = a separate phase/overlay.**
(The existing `TabStrip` is filter-tabs and stays *inside* the Terminal view —
a different axis.)

### Writes — command string canonical + a structured body side-channel

Mutations ride the **command bus** (bus primacy), and the **command string is
the canonical channel**: the GUI builds **real command strings** (verb +
selectors), so every action stays scriptable / aliasable / replayable and
legible to future string-riding capabilities (scripting). Exposing the command
spec so the client constructs real strings *is the point* — we don't undermine
it with a string-less dispatch path.

- For input that can't sit on a command line (a multi-line post **body**, form
  fields), the string carries an **optional structured payload** — HTTP
  method+path vs body. Wire: the existing `{ type:'command', payload:{ text,
  fields? } }`; `text` is always present and parsed normally; `fields` fills
  only **YAML-designated body-typed args**, overlaid after the parse, then the
  same resolve → validate → controller → envelope chain runs.
- **Sparingly, never a replacement.** Only body-bearing verbs (post/reply/edit)
  declare a side-channel arg; `vote`/`follow`/sort/navigate are plain strings.
  **No string-less dispatch path is exposed** to clients
  (`CommandApi.assembleFromStructured`'s string-less mode stays an internal/test
  helper, not a client inbound).
- **The CLI** uses the raw-string path → tokenizer → the *same* controllers;
  the GUI builds the same strings (+ body payload). Char-gen's
  `enroll species elf` string-building is the **intended** pattern, not a hack —
  only its free-text fields would ever use the side-channel.

### Reads — a forum document-change observer, fed by a dedicated event *log*

Forum content is Document-backed; the live MQL subscription is **Stuff-only**
(it observes the world-tree, a *different* domain). Forums need a
**document-change observer** — `ForumSubscriptionRegistry`. It is its own
thing: it shares only the **observer pattern** with MQL-sub, **none of its
code**, and **MQL-sub is not touched**. (*Latent abstraction, deliberately
deferred:* there's a generic "observe a Mongo collection for changes" layer to
be had — forums is instance #1 and likely not the only future watcher — but we
don't build the generic version now, with no second consumer to shape the seam;
the forum instance is kept clean to seed it later. This is **not** a generalized
MQL engine and **not** a shared forums/wiki/CMS engine — CMS/wiki are
request-response authoring/reference, *not* live subscribers.)
- **The trigger (the in-process `EventApi` bus).** The observer does **not**
  detect change by instrumenting every Document setter, **nor by tailing
  Mongo**. A mutation **fires a transient `ForumEventFired` on `EventApi`** and
  the observer listens (`EventApi.on`) — the same shape by which
  `fireFieldChange` → `EventApi.fire` drives MQL-sub (a *parallel* observer,
  not a shared one). Forum event kinds: `post-created`,
  `vote-cast`, `claim-attached`, `thread-locked`, ….
- **The durable twin (`forum_events`).** The *same* mutation also **appends a
  faithful row** to the append-only **`forum_events`** collection. This is the
  **audit/tamper-evident trail** *and* the **archive itself** (the legislative
  history) — the **`chronicle` pattern** (append-only ledger, dumb store /
  smart consumers), satisfying the already-committed tamper-evident-archive
  requirement (cooperative-slate + argument-map-slate). It is **not** the live
  feed — it's read only for history / backfill / audit.

**Persist-then-fire; neither causes the other.** `Document.save()` fires no
event (chronicle appends silently; no change-stream anywhere) and `EventApi`
events persist nothing (transient, microtask fan-out). So the mutation emits
**both explicitly** via one `record(event)` helper: append the durable row,
then fire the transient event. The write isn't a side-effect of the event (not
event-sourced) and the event isn't a side-effect of the write (no tail).

**Source of record: CRUD docs as truth + the log alongside** (not full
event-sourcing). A mutation **updates the current-state Document** (the truth
the GUI reads), then `record`s the event (durable row + live fire). The log is
a faithful mirror, not the rebuild source.

- Reads therefore = **subscription** (live deltas on the viewed set: a board's
  thread list, a thread's posts, vote counts — the engine **re-resolving
  current-state docs** when a `ForumEventFired` lands) **+ structured query**
  (navigate / paginate / lazy-load a subtree or a large claim-graph, over the
  current-state docs). Both structured; neither scrapes CLI text.

### Notify — aether push frames

New activity (replies, votes on your post) arrives as `world.forum.*` ESP
frames over the aether attunement modality (Part 0); the GUI surfaces them as
live notifications, the CLI as inline lines.

---

## Part 1 — the popularity organizer (cycle 1)

The Reddit-shaped board. `organizer: 'popularity'`.

- **Vote axis** — per-entry persisted weighted-signal store (entity-scoped on
  `entryId`; **not** the ephemeral act-scoped `ReactionRegistry`, which keys on
  `commandId` and persists nothing — different substrate, same philosophy).
  Up/down (or single-up — open).
- **Ordering** — votes order siblings: hot / new / top / controversial sorts.
  Reply tree as plain `reply` edges.
- **Cooperative-slate defenses** (inherited, scoped to v1):
  - **Discovery-only wiring** — votes drive sorting/discovery; **never** wired
    to producer standing or co-op money in v1 (that's the co-op build).
  - **Anti-snowball** — hide early scores, dampen rich-get-richer (newcomer
    fairness is structural here, not cosmetic).
  - **Context-scope** — normalize per board; don't rank a cozy board and a
    brutal one on one axis.
  - **Trust-weighting** — *deferred* (needs the social graph); v1 ships flat
    one-account-one-vote with the seam designed in.
  - Design against the Reddit diseases: agreement-as-quality, pile-ons,
    single-thumb conflation of "I agree" / "well-made" / "my tribe."

---

## Part 2 — the structure organizer (deferred; designed-for)

`organizer: 'structure'` **is** the argument-map. The full spec lives in
[argument-map-slate.md](./argument-map-slate.md) and carries over unchanged;
folded into the forum primitive it means:

- **Grain** — a structure **Board is a venue** (the legislative Floor, a guild
  council) holding **many proposal-Threads**; one bill = one Thread, each
  rooted at its proposal. Not one-board-per-bill. The bill is its own
  ephemeral Subject binding that thread + a chat (see Part 0).
- **Typed claim-graph** as the per-thread entry model — `claim` / `pro` /
  `con` / `rebuttal` nodes, `supports` / `objects-to` / `responds-to` edges,
  rooted at a version-controlled proposal (tree by default, DAG on claim reuse
  — open).
- **Structure organizes; votes sense-not-order** — navigation is structural
  (walk the logic), contribution is attach-a-typed-node, dissent is a
  permanent node never buried. Polling may sense agreement on claims
  (advisory), never ranks them.
- **Reputation-blind** — arguments evaluated by support/objection, never by
  author renown (the safe arrow is conduct → reputation, never reputation →
  authority).
- **Inherits the scale open-problems** — claim dedup/canonicalization
  (assisted curation), integrity-grade map-summarization, automated
  convergence-detection, mass-scale bad-faith moderation, proposal
  version-control + map re-anchoring. The v1 small-scale slice (bare
  claim-tree, time-box convergence, GroupRef audience) is the buildable cut.

The point of the unification: this organizer **inherits Part 0 for free** —
persistence, the aether board, `GroupRef` audience, the command surface, the
Catalogue. Only its L2 artifact (claim-graph) and L3 interaction
(navigate/attach) are organizer-specific.

---

## How this overrides the prior factoring (reconciliation)

For the record, since this slate moves two settled designs:

- **delivery-slate § L2 — "forums are facets, not new subsystems."** The
  facet framing dissolves the forum into the chat `Channel`; we promote it to
  a first-class primitive instead. Everything else that section established is
  retained verbatim (aether transport, `GroupRef`, `world.forum.*` Topic,
  per-surface override). Net change: the forum gets its own `Board`/`Entry`
  Documents + Catalogue rather than riding `Channel`. **Also reversed:** that
  section's *"there is no 'Subject' entity"* call — it held for standing
  subjects (subject ≈ backing group) but breaks once many ephemeral subjects
  (bills) share one audience, so a thin `Subject` Document is reinstated as the
  linking spine. And chat gains an opt-in `logged` retention (delivery-slate
  had chat as ring-only) so ephemeral debates archive complete.
- **argument-map-slate — "deliberately distinct from forums; not a forum."**
  The *distinctness* is real and preserved — it's now the `organizer:
  'structure'` mode, with its own L2/L3 and all six principles intact. What
  changes is only that it shares Part 0's bones with popularity boards instead
  of standing alone. The ungameability rationale is satisfied by the organizer
  field, not by a separate subsystem boundary.

Both source slates get a one-line supersession pointer at their top; their
*content* remains the authoritative organizer-level spec.

---

## Build sequencing

- **Cycle 1 (now):** Part 0 substrate + Part 1 popularity organizer.
  Branch `feature/forums-build` off `origin/master`. The `organizer` field and
  the typed-edge storage ship from day 1 (so structure boards are a later
  *organizer*, not a later *schema migration*).
- **One genuinely-generic piece lands in cycle 1:** the **body side-channel**
  (any verb may declare a body-typed arg filled by the `command` payload's
  optional `fields` — benefits any post-like surface; command strings stay
  canonical, no string-less path). The **forum document-change observer** and
  the **`forum_events` log** are **forum-scoped**, not shared infra (the
  "generic collection-watch" abstraction is acknowledged but deferred — no
  second consumer yet; CMS/wiki are request-response, not live subscribers).
- **Cycle 2+ (deferred):** the structure organizer's small-scale slice
  (per argument-map-slate § *Buildable now*), then its scale machinery.

---

## Open questions

*Resolved 2026-06-17:* the chat ↔ forum link is an **explicit `Subject`
entity** (not bare co-projection); ephemeral debates **persist their chat**
(`logged` retention, sealed into the archive); the hierarchy is
**`Board → Thread → Post`**; a bill = a **Thread on a body's standing venue
board** (not one-board-per-bill), with the bill its own ephemeral Subject
binding that thread + a chat (subjects manifest at board *or* thread grain);
debate is **unified** per body. The chat **`procedure`** mode
(`free` / `rules-of-order`) is a parked surface policy (design deferred). The
**client architecture** is settled: GUI + CLI co-equal clients; **writes** via
canonical **command strings** + an optional structured **body side-channel**
(`{text, fields}`; no string-less path); **reads** via a **forum-scoped
document-change observer** (`ForumSubscriptionRegistry` — MQL-sub's pattern,
none of its code, MQL untouched; a generic collection-watch abstraction is
acknowledged but deferred) that **listens on the in-process `EventApi` bus** and
re-resolves current-state docs, fed by a forum-owned append-only **`forum_events`
log** (chronicle-shaped — the durable audit trail + archive, not the live feed;
CRUD docs stay the source of truth, dual-write); **notify** via aether frames.

- **Subscription query/pagination model** — the Document-subscription
  substrate must serve both *live deltas on a viewed set* and *navigate /
  paginate / lazy-load* (deep post-trees, large claim-graphs). What's the
  query shape, the subtree-fetch boundary, and how do live deltas compose with
  paged windows? (The argument-map's scale problems — dedup, summarization —
  bear on this.)

- **Procedure mode (`rules-of-order`)** — the digital deliberation discipline
  (recognized speaker, motion/second/amend). Parked: vocabulary + enforcement
  TBD; default `free`.
- **Lifecycle trigger / governance seam** — the substrate exposes mint /
  light-up / archive; *who calls it.* Standing subjects lit manually (a verb);
  ephemeral subjects (bills) lit + archived by the legislative lifecycle (the
  cooperative build). Defining that API is in scope; wiring the governance
  caller is deferred.
- **Chat-log bounds** — does a `logged` chat have any cap / pruning; can a
  standing subject opt into `logged`; archived-log storage/retention.
- **Subject addressing** — `title` uniqueness + namespacing (a guild's
  "general" vs a global one); how a Subject is named/found vs. its surfaces.
- **Vote shape** — up/down vs single-up for popularity boards; what (if
  anything) the structure organizer's advisory sensing records on claims.
- **Implant granularity** — distinct `ForumsUpdate`/implant vs. the forum
  capability folded onto the existing comms implant (lean: same universal
  implant).
- **Read gate** — does reading require the implant capability (DM-style, the
  chosen aether model) or only attunement (so anyone attuned can lurk,
  posting needs the capability)? The hybrid is attractive for a public square.
- **Root-entry shape** — a `thread` flag/kind on the root `Entry` vs. a
  distinct root type; link-vs-text submission distinction for popularity
  boards.
- **Reactions on entries** — entries are persisted, reactions are act-scoped
  ephemeral; what's the right bridge (a persisted reaction-summary on the
  entry vs. live aggregation).
- **A full surface doc** — graduates to `docs/subsystems/forums.md` once
  cycle 1 ships.
