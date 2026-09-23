# Chat / comms / forums — cluster-merge ledger

Cluster: **chat / comms / forums**. Files: `docs/slates/tails/chat-slate.md`
(355 lines) · `docs/slates/tails/comms-slate.md` (314) ·
`docs/slates/tails/forums-slate.md` (252) ·
`docs/slates/tails/argument-map-slate.md` (143). Procedure:
`.claude/skills/compact-slate/SKILL.md` § *The cluster-merge pass*. Prior
compaction (not repeated here): `docs/plans/slate-compaction/chat.md`
(chat + comms), whose *Uncertain* section listed the four overlaps this
pass resolves; forums + argument-map were compacted in an earlier batch.
Originals saved under the scratch dir `orig/` for diffing.

**Scope: duplicated OPEN design only.** `language-slate.md` is outside
the cluster and untouched — pointers only.

## Ownership — no single canonical

The four files have four subjects, so there is no one canonical file.
Per the coordinator's rule (*the file whose subject it is owns the
item*), ownership was decided per duplicated item:

| duplicated open item | owner | why |
|---|---|---|
| regional / zone-scoped channels | **chat-slate** | a channel kind; chat's *Binding → a place (zone/room)* axis already names it |
| the guild-chat worked scenario | **chat-slate** | a group-projected channel; comms' version adds only shipped detail |
| per-channel `retention` (+ the `ordered` chat procedure that rides the same paragraph) | **chat-slate** | `retention` is a key of chat's channel config block; `Channel.procedure` is a field on `Channel` (chat.md § Since forums cycle-1) |
| the conversation primitive (DM / group / channel as one routing shape) | **comms-slate** | comms is the transport; chat's *ad-hoc* row and *See also* cite it |
| language gating on the implant (the (ii) encoded-cognition lean) | **comms-slate** | transport property; chat Q1 is a distinct follow-on question (*does the lean apply to channels*) and already cites comms; `language-slate` holds comprehension itself |
| the trust-tiered policy / recognition-as-security | **comms-slate** | spans all families; chat's moderation items are the channel-side override layer, a different mechanism |
| the argument organizer's scale problems | **argument-map-slate** | forums-slate names it *the authoritative spec for that organizer* |

Verified against code/docs while deciding: `Channel.subject` and
`Channel.procedure: 'open' | 'ordered'` **shipped** (the flag; `'ordered'`
behavior deferred — `packages/server/src/mud/lib/social/Channel.ts:36-40,
99-100`, `ChannelCatalogue.ts:622-644`, chat.md § Since forums cycle-1,
forums.md § The four surfaces l.76-77). `retention: 'logged'`,
`chat_log`, any zone-scoped channel: **no code**
(`ChannelCatalogue.history` is a 200-frame runtime ring; chat.md l.262
*"persistent history retention … stays deferred"*). **No moderation
slate exists** (`find docs -iname '*moderat*'` → manifesto images only).

---

## docs/slates/tails/comms-slate.md — secondary for the channel-shaped items · 314 → 314

### Conservation table

| secondary heading / item | outcome |
|---|---|
| Title, status block, framing paragraph, *The load-bearing decisions shipped* pointer paragraph, *See also* | KEPT — spine. Status block re-stamped below. |
| `## Principle` — 3 *Frictionless baseline* | KEPT — comms' own (the implant baseline vs `augmentation-slate`, outside the cluster). |
| `## Acoustic family — say / whisper / shout` — whisper redacted form · dynamic-reach shout · `### Directed acoustic speech` pointer | KEPT — comms' own (acoustic transport; nothing in chat/forums/argument-map designs it). |
| `## Implant family — tell/DM, chat channels` — the DM/group/channel routing table | KEPT — **comms owns the conversation primitive**. chat-slate's *ad-hoc (DM/group)* row (§ The generative axes) and its *See also* say *"the comms conversation primitive"* — a citation, not a second copy; chat-slate untouched on this. |
| … — *Thoughts willed into existence → attribution is the trust boundary* | KEPT — comms' own (spoofing / hardened baseline). |
| … — *Language still applies (lean)* — the (i)/(ii) fork, lean (ii) | KEPT — **comms owns language-on-the-implant**. chat-slate Q1 (*does the comms (ii) lean apply to channels?*) is a distinct follow-on question that already cites this lean — KEPT there; not a duplicate. `language-slate.md` (outside the cluster) owns comprehension itself; pointer only, untouched. |
| `## The implant dependency` (universal baseline · DM on-ramp · hardened guarantee) | KEPT — comms' own; the prior pass's Uncertain note (only Avatars carry an implant) stands. |
| `## Provenance & UI` pointer | KEPT — already a shipped pointer. |
| `## NPC reachability` | KEPT — comms' own (npc-dialogue seam). chat-slate's *See also → npc-dialogue* line is a citation. |
| `## Moderation` — the expression-policy gate spans all families | KEPT — comms' own. Cross-pointers recorded, nothing moved: `emotes-slate.md § Moderation: emote-only mode & the tightness guarantee` / `§ The expression policy is a shared comms gate` (l.382–431) hold the gate's design; `emotes.md` l.116–122 record that the gate and the `enum` slot kind were **deferred** when emotes shipped; `social-graph.md § Deferred` l.502 (*a `foes` policy governs display de-emphasis + notification suppression only; dropping speech from a feed is a comms concern*). chat-slate's moderation items are a different mechanism (the channel-side override layer — see chat's table below). |
| `### Trust-tiered policy (deferred)` (recognition as a security primitive · the stranger→acquaintance→trusted gradient · malicious zone NPCs · the authority floor · the dropped emote-safe-mode) | KEPT — comms' own; no other file in the cluster carries it. |
| `## Worked scenarios` — *Order a drink* · *Shout across the map* · shipped pointers (*Room chat*, *DM a friend*) · *Remote NPC* | KEPT — comms' own. |
| … — **Guild chat (implant channel)** — *"post to `[Guild]` → all tuned members receive it as an attributed thought; renders with the channel chip"* | **DUPLICATE → chat-slate § Worked scenarios, *Guild chat (group-projected)***. Chat's version carries the open half (guild join → projection at mentions-only, the officer mute via the override layer); comms' only extra details — attributed-thought delivery and the channel chip — both **shipped** (chat.md § Posting; message-rendering.md), so nothing open moved. Cut, replaced by a one-line pointer. |
| `## Open questions` Q1 *Addressing* | KEPT — comms' own (DM handle acquisition). |
| … Q2 resolved pointer | KEPT — already resolved. |
| … **Q3 Regional channels** — *"A channel scoped to a zone (a bridge between acoustic locality and implant networks)? Worth considering."* | **MOVED, verbatim → chat-slate § Open questions, new Q6** (labelled *Absorbed from comms-slate — Open questions Q3*). Chat's *Binding → a place (zone/room)* axis and the *zone* entry of its kinds table already name the item, but only as a table cell — comms' framing (*the bridge between acoustic locality and implant networks*) is the detail chat lacked, so it moved rather than being dropped. A one-line *moved* pointer stays at Q3 (numbering untouched). |
| … Q4 *Language × implant (i) vs (ii)* | KEPT — comms' own (restates the § Implant family lean; an internal echo, not a cross-file duplicate — left alone, out of scope). |
| … **Q5 Persistence/history** — *"Channel logs / DM history as an implant storage capability … Lifetime?"* | KEPT, **overlap recorded**. Mixed at item granularity: the *channel logs* half overlaps chat-slate's `retention` (§ The channel config block, § History — and now the absorbed forums `logged` retention); the *DM history* half is comms' own. One item cannot be split below paragraph granularity, so it stays whole; `Left` keeps *persistent history lifetime (Q5)*. The coordinator may want chat's `retention` design to answer the channel half when either is taken to requirements. |
| … Q6 resolved · Q9 resolved | KEPT — resolved pointers. |
| … Q7 *Interception/privacy* · Q8 *Directed-say multi-target* | KEPT — comms' own. |
| `## Build order` (Wave 1 / Wave 2 shipped pointers · Wave 3 depth · Adjacent) | KEPT — spine. ⚠ Wave 3's indicative list still says *"regional channels"*; left as written (an indicative build list, not a design section) — the Q3 pointer says where it went. |
| `## What this slate does NOT cover` | KEPT — spine. Its *moderation control plane* bullet and chat-slate's are twin disclaimers pointing at a slate that **does not exist** — see *For the coordinator*. |
| `## Once shaped into formal requirements` | KEPT — spine (the *conversation primitive* and *language (ii) lean* bullets are comms' own). |

Not retired: the KEEP body is nearly the whole file.

### Re-stamp — comms-slate.md

- **Status:** PARTIAL → PARTIAL.
- **Left:** dropped *regional channels* (moved to chat). Everything else
  unchanged — every remaining item still has a body section.
- **Size:** a wave → a wave.

---

## docs/slates/tails/forums-slate.md — secondary for the chat-surface extensions · 252 → 246

### Conservation table

| secondary heading / item | outcome |
|---|---|
| Title, status block, framing paragraph, *See also* (delivery · argument-map · cooperative · chat.md · grouping · comms/augmentation · reactions · chronicle) | KEPT — spine. The *argument-map-slate* entry names that file *the authoritative spec for that organizer* — forums ↔ argument-map only **cite** each other; nothing moves between them. Status block re-stamped below. |
| `## The spine` — 2 *Surfaces link through a Subject* | KEPT — forums' own (the Subject model). It names *rules-of-order chat* as one of four surfaces; that is the Subject's view of the surface, not the chat-side design of the discipline, which moved (next row). |
| … — 6 *Entries are durable Documents* (ends *"Chat gains an opt-in `logged` retention … (below)"*) | KEPT — forums' own. Its *(below)* now lands on the pointer line in § Data model, which says where the design went. |
| `## Part 0` › `### Data model` — **`Subject`** bullet | KEPT — forums' own. |
| … — **Chat surface** bullet — *the existing `Channel`, extended to carry a `subject` ref, a `retention` policy (`'ring'` … `'logged'` → `chat_log`), and a `procedure` mode (`'free'` / `'rules-of-order'`) …* (10 lines) | **MOVED, verbatim → chat-slate § The channel config block, new `### Absorbed from forums-slate — Chat surface (`retention: 'logged'` + `procedure`)`**. Duplicated open item: per-channel `retention` — chat-slate designs it as a ring depth (*"the implant's storage depth"*), forums as a `'ring' \| 'logged'` policy with a `chat_log` collection; same config key, two answers → the differing detail moves to the owner (channel config is chat's). Mixed paragraph, kept whole per paragraph granularity: `Channel.subject` and the `procedure` flag **shipped** (`lib/social/Channel.ts:36-40,99-100`; chat.md § Since forums cycle-1; forums.md § The four surfaces — vocabulary since renamed `'open' \| 'ordered'`), so the absorbed block carries a one-paragraph label stating that and naming the open remainder (`logged` + `chat_log`; the ordered discipline). A one-line pointer stays in forums. |
| `### Subjects, surfaces & lifecycle` (standing/ephemeral · *The bill, worked through* · the tree diagram) | KEPT — forums' own. Mentions *a `logged` chat (optionally `rules-of-order`)* as what a bill-subject lights up — the consumer's requirement on the surface, not the surface design; stays. |
| `### Surfaces` — *Notifications over aether* | KEPT — forums' own (`world.forum.*` frames). Observed, not acted on: near-duplicates `## Client architecture › ### Notify — aether push frames` **inside the same file** — an internal echo outside this pass's scope (only argument-map's internal duplicate was assigned); flagged below. |
| `## Client architecture` › `### Reads — a forum document-change observer` (the latent collection-watch abstraction) | KEPT — forums' own. |
| … `### Notify — aether push frames` | KEPT — see the *Surfaces* row. |
| `## Open questions` — *Subscription query/pagination model* (cites *the argument-map's scale problems — dedup, summarization*) | KEPT — forums' own; the argument-map mention is a citation. |
| … — **Procedure mode (`rules-of-order`)** — *"the digital deliberation discipline (recognized speaker, motion/second/amend). Parked: vocabulary + enforcement TBD; default `free`."* | **MOVED, verbatim → chat-slate § Open questions, new Q7** (labelled *Absorbed from forums-slate*; continuation indent 2→3 for the numbered list, words untouched). It is the open question of the moved Chat-surface design. Pointer left in place. |
| … — *Lifecycle trigger / governance seam* | KEPT — forums' own. |
| … — **Chat-log bounds** — *"does a `logged` chat have any cap / pruning; can a standing subject opt into `logged`; archived-log storage/retention."* | **MOVED, verbatim → chat-slate § Open questions, new Q8** (same labelling). Pointer left in place. |
| … — resolved pointers (Subject addressing · Vote shape · Implant granularity · Read gate) | KEPT — already resolved. |
| … — *Root-entry shape* · *Reactions on entries* · *A full surface doc: done* | KEPT — forums' own. |

Not retired: the KEEP body is the whole board design.

### Re-stamp — forums-slate.md

- **Status:** PARTIAL → PARTIAL.
- **Left:** dropped *chat `logged` retention + `chat_log`* and *the
  rules-of-order (`procedure: 'ordered'`) chat discipline* (both moved to
  chat). Remaining: *the ephemeral bill lifecycle + archive cascade + the
  governance trigger · notifications over aether · the latent
  collection-watch abstraction · the subscription query/pagination model
  · root-entry shape · reactions on entries* — each has a body section.
- **Size:** a wave → a wave.

---

## docs/slates/tails/argument-map-slate.md — internal duplicate only · 143 → 137

Cross-file: forums-slate cites this file as authoritative for the
organizer and copies none of its design; nothing moves in either
direction. The assigned internal duplicate:

### Conservation table

| heading / item | outcome |
|---|---|
| Title, status block, framing, *See also*, `## The spine`, `## Mechanics`, `## Reading the map` (+ `### The explorer is plural`) | KEPT — untouched. |
| `## The hard problems (the open work)` — dedup/canonicalization · map-summarization · convergence-detection · moderation of bad-faith claims · proposal version-control · editing & refactoring (6 items) | KEPT — the fuller of the two lists; every `Left` item maps to it. |
| `## Open problems — deferred to scale` — 5 bullets + *A full surface doc: done* | **DUPLICATE → § The hard problems (the open work)**, same file. Item-by-item: *dedup (assisted curation)* ⊂ hard-problems item 1; *integrity-grade summarization (grounded, drillable, reproducible)* ⊂ item 2; *convergence-detection (+ the anti-railroad minimum)* ⊂ item 3 (*the anti-railroad floor*); *mass-scale moderation (the curation pipeline)* ⊂ item 4 (*the curation problem* — the only lexical difference, *pipeline* vs *problem*, carries no design detail); *version-control + re-anchoring* ⊂ item 5. Cut; replaced with a one-line pointer that keeps the *surface doc: done → forums.md § The argument organizer* link. |

### Re-stamp — argument-map-slate.md

- **Status / Left / Size:** unchanged (PARTIAL · the same eight items · a
  wave) — every `Left` item still corresponds to § The hard problems or
  § Reading the map (*the plural-lens explorer*, *the vote consumer* →
  § Mechanics).

---

## docs/slates/tails/chat-slate.md — owner of the channel-shaped items · 355 → 395

### What it absorbed

- `### Absorbed from forums-slate — Chat surface (`retention: 'logged'` +
  `procedure`)` — new labelled subsection at the end of § The channel
  config block: a 7-line label (what shipped / what is open, with doc
  pointers) + the 10-line forums bullet **verbatim**.
- § Open questions **Q6** — comms Q3 *Regional channels*, verbatim, under a
  one-line *Absorbed from comms-slate* label.
- § Open questions **Q7 / Q8** — forums' *Procedure mode (`rules-of-order`)*
  and *Chat-log bounds*, verbatim (list-continuation indent 2→3), under a
  one-line *Absorbed from forums-slate* label.

Verbatim check (scripted, against the saved originals): the Chat-surface
bullet and Q3 are byte-identical; Q7/Q8 are word-identical and differ
only in the continuation indent.

### Its own sections that were overlap candidates — all KEPT, untouched

| chat-slate item | why it stays as is |
|---|---|
| § The generative axes — the *ad-hoc (DM/group) … the comms conversation primitive* row; *See also → comms-slate (the conversation primitive)* | citations of comms' primitive, not a second design. |
| § Open questions Q1 *Channel language gating* | a follow-on question to comms' (ii) lean (*does it apply to channels?*), already citing it; `language-slate` is outside the cluster. |
| § Projection + override · § Roles & permissions (the override layer) · § Hard problems (*Moderation override*, *Spam / rate-limiting*) · § Message model (edit-trail deferred) · Q4 | the channel-side moderation mechanism — chat's own; comms' trust-tiered policy is a different mechanism (sender→receiver familiarity), so neither duplicates the other. |
| § What this slate does NOT cover — *the moderation control plane* | twin of comms' disclaimer; both KEPT (spine). |
| § Worked scenarios — *Guild chat (group-projected)* | the surviving copy (comms' was the duplicate). |

### Re-stamp — chat-slate.md

- **Status:** PARTIAL → PARTIAL.
- **Left:** gained *regional channels (a zone-scoped channel — Q6,
  absorbed from comms)* and *`retention: 'logged'` + `chat_log` and the
  `ordered` procedure's discipline (the chat-surface extensions absorbed
  from forums, with their bounds/vocabulary questions Q7–Q8)*. Every
  `Left` item has a body section; every open body section is represented.
- **Size:** a wave → a wave (two more per-item additions to the same
  config-block wave; nothing that changes the cycle shape).

---

## For the coordinator

1. **Ownership call worth a glance — the ordered chat procedure.** It
   moved to chat with the `retention` bullet it shares a paragraph with,
   because `Channel.procedure` is a `Channel` field and chat.md documents
   it. The alternative reading — that it is a forums surface (forums.md
   § The four surfaces lists `ordered-chat`, and the forums build shipped
   the flag) — is defensible. If you prefer it in forums, the move is a
   single subsection + two questions to put back; the pointers name them.
2. **`chat_log` as a new Mongo collection.** The absorbed forums design
   persists `logged` chat to a `chat_log` collection. The standing rule
   (*no new Mongo collections; parcel-local persistence = the document
   tree*) postdates that text. Not edited (moved verbatim); requirements
   should reconcile it.
3. **The moderation control plane has no slate.** chat-slate, comms-slate
   and emotes-slate each defer to it (*"the moderation subsystem"*), and
   comms' `Left` carries *the moderation control plane + the trust-tiered
   policy*. Three slates point at an empty address. Either a slate gets
   minted or comms' *Trust-tiered policy* section is declared its seed.
4. **Two internal echoes left alone (outside the assignment):** comms Q4
   restates § Implant family's language lean; forums `### Surfaces ›
   Notifications over aether` ≈ `### Notify — aether push frames`.
5. **comms Q5** stays whole though its *channel logs* half now overlaps
   chat's `retention` design twice over (chat's own + the absorbed forums
   `logged`). One item, not splittable below paragraph grain.

Nothing retired; no links re-pointed (no file removed; no anchored
inbound links to any moved heading — checked with grep). `language-slate.md`,
`social-graph.md`, `emotes.md`, `emotes-slate.md` untouched.

## `git diff --stat` (self-check, this cluster's files only)

```
docs/slates/tails/argument-map-slate.md |  14 +--
docs/slates/tails/chat-slate.md         |  42 +++++++-
docs/slates/tails/comms-slate.md        |  12 +--
docs/slates/tails/forums-slate.md       |  28 +++---
docs/plans/slate-compaction/cluster-chat.md  (new)
```

Other paths in `git status` on this worktree belong to sibling cluster
agents (mortality, client, law, kitchen) and were not touched by this
pass. Line totals: 355+314+252+143 = 1,064 → 395+314+246+137 = 1,092
(+28: the two absorbed-block labels and the pointer lines; no design
text was cut — every removed line was a duplicate or a verbatim move).
