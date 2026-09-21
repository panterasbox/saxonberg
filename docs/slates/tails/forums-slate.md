# Forums slate (working doc)

> **Status: PARTIAL** — Part-0 substrate, Part-1 popularity, and Part-2
> (the `argument` organizer) all shipped across two cycles
> → [forums.md](../../subsystems/forums.md)
> **Left:** the ephemeral bill lifecycle + archive cascade + the governance
> trigger · notifications over aether
> (`world.forum.*` frames + the offline digest) · the latent
> collection-watch abstraction · the subscription query/pagination model ·
> root-entry shape (thread flag vs. distinct type; link-vs-text submission)
> · reactions on entries
> **Size:** a wave

Working slate for the **forums** subsystem — durable, addressable,
multi-author boards that ride the aether implant. The governing claim:
**popularity forums and structured-argument deliberation are two organizers
over one board primitive, not two subsystems.** What separates them is the
*organizer* (how sibling entries are ordered and how votes are interpreted),
not the bones (persistence, audience, access, threading, command surface).

See also (this slate supersedes the *factoring* of the first two; it does not
discard their content — it absorbs it as organizer modes):

- [delivery-slate.md](../builds/delivery-slate.md) § *Layer 2 — comms* — the prior
  home of the **social forum** as a chat facet. **Superseded:** the forum is
  now a first-class primitive, not a `Channel` facet — but it keeps everything
  that section established: rides the aether/implant transport, binds a
  `GroupRef` audience via `GroupApi`, carries a `world.forum.*` engine `Topic`
  (L0), and the per-surface override layer (L1+) generalizes here.
- [argument-map-slate.md](../tails/argument-map-slate.md) — the **structure
  organizer** in full. **Superseded only in framing:** the argument-map is no
  longer "not a forum" — it is the `organizer: 'structure'` specialization of
  this primitive. Its data model (typed claim-graph), its six load-bearing
  principles (structure-organizes, dissent-is-a-node, reputation-blind, …),
  and its scale open-problems (claim dedup, map-summarization) all carry over
  **unchanged** and remain the authoritative spec for that organizer.
- [cooperative-slate.md](../builds/cooperative-slate.md) § *The feedback substrate* +
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
  a hosted capability on the universal aether implant; the reachable
  scan's host-descent (now the MQL `reachable` seed);
  `Species.innateMixins` conferral).
- [docs/subsystems/reactions.md](../../subsystems/reactions.md) — the
  `commandId` gutter / message-id substrate the thread-tree threading rides,
  and the emote-aggregation reaction layer entries reuse.
- [docs/subsystems/chronicle.md](../../subsystems/chronicle.md) — the
  append-only ledger precedent (dumb store / smart consumers) the
  **`forum_events`** log follows; the tamper-evident archive shape.

---

## The spine

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
6. **Entries are durable Documents.** Unlike chat's default ephemeral ring,
   the board, every entry, and the edge structure persist (their own
   collections). The board is the archive — and for structure boards, the
   **legislative history** the argument-map slate requires. Chat gains an
   opt-in `logged` retention so an ephemeral subject's synchronous debate is
   captured into the archive too (below).

---

## Part 0 — the board substrate (the shared bones)

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
- *Chat surface (`retention: 'logged'` + `chat_log`; the `procedure`
  discipline) → moved verbatim to chat-slate § The channel config block ›
  "Absorbed from forums-slate" (cluster pass; the channel config is
  chat's). `Channel.subject` and the `procedure` flag shipped — chat.md
  § Since forums cycle-1, forums.md § The four surfaces.*

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

- **Notifications over aether** — replies to your entries / activity on
  boards you follow arrive as ESP frames (`world.forum.*` Topic), gated by the
  attunement modality (emote-reception precedent); an offline digest on next
  attune.

---

## Client architecture (the GUI is the hard part)

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

### Notify — aether push frames

New activity (replies, votes on your post) arrives as `world.forum.*` ESP
frames over the aether attunement modality (Part 0); the GUI surfaces them as
live notifications, the CLI as inline lines.

---

## Open questions

- **Subscription query/pagination model** — the Document-subscription
  substrate must serve both *live deltas on a viewed set* and *navigate /
  paginate / lazy-load* (deep post-trees, large claim-graphs). What's the
  query shape, the subtree-fetch boundary, and how do live deltas compose with
  paged windows? (The argument-map's scale problems — dedup, summarization —
  bear on this.)

- *Procedure mode (`rules-of-order`) → moved to chat-slate § Open
  questions Q7 (cluster pass).*
- **Lifecycle trigger / governance seam** — the substrate exposes mint /
  light-up / archive; *who calls it.* Standing subjects lit manually (a verb);
  ephemeral subjects (bills) lit + archived by the legislative lifecycle (the
  cooperative build). Defining that API is in scope; wiring the governance
  caller is deferred.
- *Chat-log bounds → moved to chat-slate § Open questions Q8 (cluster
  pass).*
- Subject addressing resolved: forums.md § The Subject layer (`title`
  flat-global for venues, `board/thread` for topics).
- Vote shape resolved: `castVote` toggle; `ForumsLogic.castVote` refuses on
  an ordered board; forums.md § Voting, § The typed claim-graph.
- Implant granularity resolved: `Avatar.installDefaultLoadout` hosts
  `ForumsUpdate`; forums.md § The aether capability.
- Read gate moot: the capability is born-with on every Avatar (`ForumsMixin`
  confers read + post); forums.md § The aether capability.
- **Root-entry shape** — a `thread` flag/kind on the root `Entry` vs. a
  distinct root type; link-vs-text submission distinction for popularity
  boards.
- **Reactions on entries** — entries are persisted, reactions are act-scoped
  ephemeral; what's the right bridge (a persisted reaction-summary on the
  entry vs. live aggregation).
- A full surface doc: done — [forums.md](../../subsystems/forums.md).
