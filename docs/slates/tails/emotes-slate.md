# Emotes slate (working doc)

> **Status: PARTIAL** — the emote substrate shipped 2026-06 (`SoulMixin`,
> the `Emote` row + grammar runner, `SoulCatalogue` + `SoulApi`, the
> `expression` pack, the three dispatch paths) →
> [emotes.md](../../subsystems/emotes.md); reactions shipped →
> [reactions.md](../../subsystems/reactions.md)
> **Left:** the Layer-2 client render toggle (`social.emote.render`
> honoured, per channel and per source) · Layer 3 honorary / entitlement
> gating (the `requires` predicate seam) · channel / remote-audience
> emotes (routing over comms) · echo (the `social.emote.echo` setting +
> the routing) · the provenance label on remote emotes · the typed-slot
> taxonomy for moderation (`literal` / `enum`) · the moderation primitives
> (the shared `resolveExpressionPolicy` gate, the `free` / `strict`
> levels, the strict-mode structural guarantee, sanitizer call sites) ·
> the moderation control plane (moderator verbs, per-scope levels +
> duration, the sanitizer implementation + shared denylist, audit +
> appeals, entity-name moderation)
> **Size:** a build

Working slate for **emotes** — diegetic, non-verbal expression between
beings in the world. A player (or an NPC) `smile`s, `wave`s, `bogleg`s,
or free-form `emote`s, and everyone in earshot sees a natural-language
rendering of the act. This is the expressive sibling of speech
(`say` / `tell`): same Scene/audience plumbing, different content
shape and a much larger, content-authored vocabulary.

The load-bearing decision this slate makes: **emotes are
natural-language acts, not UI stickers.** The primary representation of
every emote is a server-rendered prose string composed from
author-supplied grammar (`Bobalu smiles happily at Iffy.`), with the
actor's name attributed structurally. Emoji, where present at all, are
a *per-channel presentation layer* over that prose — never the source
of the expression. This is design-philosophy **Principle 3 (layered
presentation)** applied to social expression: the failsafe prose is the
substrate; the emoji glyph is one view of it, chosen by the *recipient's*
channel settings, not imposed by the sender.

Why this matters and isn't just nostalgia: the project's thesis is
immersion. A friend sending 👋 on login reads as a human agent having a
subjective experience; an anonymous farmer NPC sending 👋 lands in the
uncanny valley — you can't tell if the *farmer* is waving or the
*wizard who coded him* is making a joke, and the empathy that drives
immersion gets muddled. Natural language dodges this entirely
(`The farmer waves at you.` is unambiguously in-fiction) **and** scales
to the hundreds-to-thousands of distinct emotes a world needs, where a
glyph catalog cannot. The natural-language model *is* the v1 spec, not
a fallback for terminals without Unicode.

Provenance: this slate graduates the emote half of an earlier
PantherasBot design essay (`panterasbox/panterasbot/docs:comms.md`,
branch `draft`). That essay predates most of Saxonberg's messaging
substrate; roughly the first half of it (message buffer, topic
taxonomy, audience routing) describes machinery that **already exists
and was built better** (see *What's already solved* below). This slate
keeps only the genuinely emote-specific design and re-grounds it on the
shipped substrate.

See also:

- [docs/subsystems/messaging.md](../../subsystems/messaging.md) — MML,
  the `Scene` composer, `toSelf` / `toPeers` / `toTarget` /
  `toContents`, sensor routing, the lone `MessageApi.sendMessage`
  delivery chokepoint. Emotes are a new `Scene` producer; they invent
  no new delivery plumbing.
- [docs/subsystems/prose.md](../../subsystems/prose.md) — `ProseApi`
  Liquid templating + the Mml-aware filters (`name`, `pronoun`,
  `possessive`, `cap`, `article`). **This is the emote grammar
  engine** — per-emote format strings are ProseApi templates; the
  actor/target pronoun handling already exists.
- [docs/subsystems/response-envelope.md](../../subsystems/response-envelope.md)
  — `Scene.send()` + `ctx.note(...)`; controllers return `void`. The
  emote controller follows `SayController` exactly.
- [docs/subsystems/command-routing.md](../../subsystems/command-routing.md)
  — verb dispatch, the per-giver scope try-list, schema delivery via
  `system.commands.{added,removed,reset}`. The **one genuinely new
  engine seam** this slate needs lives here: resolving an emote verb
  that isn't a registered YAML command.
- [docs/subsystems/command-parsing.md](../../subsystems/command-parsing.md)
  — the tokenizer; how `smile iffy happily` decomposes into
  verb / target / adverb.
- [docs/subsystems/shell-environment.md](../../subsystems/shell-environment.md)
  — the `EnvironmentMixin` settings keyspace. The per-channel
  text/emoji/both render preference is a setting, exactly like
  `pedagogicalSeam`.
- [docs/subsystems/persistence.md](../../subsystems/persistence.md) — the
  **`Document` record track** (`users` / `google_profiles` /
  `Template`) and `PersistenceManager` / the `Collections` enum. The
  emote catalog is its own MongoDB collection on this lightweight track
  — deliberately *not* the Template→Stuff clone pipeline (templates.md),
  which is overkill for behaviorless data.
- [comms-slate.md](../tails/comms-slate.md) — the communication substrate
  (conversations/channels/DMs) that resolves *who* the audience is for a
  remote/channel emote. Emotes are perceived over a universal ESP channel
  with no medium gating; comms only supplies the routing (membership).
- [docs/design-philosophy.md](../../design-philosophy.md) — **Principle 3
  (layered presentation)** is the spine of the emoji layer; **Principle
  2 (model honestly)** frames an emote as an act in the world rather
  than a chat decoration.

---

## Principle

Three claims:

1. **Natural language is the medium; immersion is the reason.** Every
   emote's primary representation is author-supplied prose, attributed
   to the actor structurally (`<name stuff-id=…>`). Natural language
   makes each emote distinct, scales to a huge vocabulary, supports
   abstraction (the `bogleg` lineage — a typo'd `boggle` that became
   its own word, then `bog`, `boglegged`, `almightybogleg`), and keeps
   NPC expression in-fiction instead of in the uncanny valley.

2. **An emote is a diegetic act, not a chat affordance.** Emoting is
   something a *being* does in the world — so the capability lives on
   the being (a mixin method, parallel to `VocalMixin.say`), reachable
   by players, NPCs, combat, and scheduled behaviors alike. It is *not*
   a client-side message decoration bolted onto chat. It mutates no
   world state (this is the clean line against the posture subsystem;
   see *What emotes are NOT*).

3. **Emoji is a presentation layer, chosen by the recipient.** Where an
   emote carries a glyph at all, that glyph is one rendering of the
   prose, selected by the *viewer's* per-channel setting (text / emoji /
   both) — Principle 3, the same engine-calculates-once /
   serialization-differs discipline as the pedagogical seam. The sender
   never forces a glyph onto the reader, and a reader can keep emoji
   from players while suppressing them from NPCs.

*The substrate decision — `SoulMixin` on `Character`, the `Emote` record, `SoulCatalogue` + `SoulApi` — shipped → [emotes.md](../../subsystems/emotes.md).*

---

## Scope & layered design

The user's call is **the full vision** — the whole essay. It is
inherently multi-layered, and the natural-language trunk is the load
bearer: every other layer hangs off it (emoji *renders* a catalog
emote; honorary status *gates* one; reactions *aggregate* emitted
ones). None are coherent until the trunk exists, so the build order is
fixed even though the scope is "all of it."

| Layer | Concern | Lives in |
|---|---|---|
| **0/1. Trunk** | `SoulMixin` capability + the emote catalog + ProseApi grammar + dynamic-verb resolution + free-form `emote`. *The whole feature, in text.* | `lib/social/` (proposed) + catalog (home TBD) + `platform/idea/cmd/EmoteController.ts` |
| **2. Emoji** | Optional glyph per emote; per-channel + per-source render setting (text / emoji / both). | catalog field + payload + an `EnvironmentMixin` setting + client render |
| **3. Honorary** | Entitlement-gated emotes; the glyph as a badge obtainable only with the real emote. | a `requires` predicate on the catalog + an entitlement check at dispatch |
| **4. Reactions** | `react <msgid> ;agree`; aggregation, collapse/expand, tag-grouping. **Recommend its own slate** (it's a generic message affordance, not emote-specific). | message-id surfacing + a `react` verb + client aggregation UI + per-user settings |

Plus one **cross-cutting** concern that isn't a layer: **moderation**
(emote-only mode + typed-slot constraints). It threads through the trunk
(slot typing is part of the grammar) and adds a shared expression-policy
gate; the enforcement primitives are in scope, the moderator control
plane is its own subsystem. See *Moderation* below.

---

## Layer 0/1 — The trunk

### The capability: `SoulMixin`, parallel to `VocalMixin`

*Shipped → [emotes.md § `SoulMixin`](../../subsystems/emotes.md) (`lib/social/Soul.ts`, composed on every `Character`; `emote(emote, { target, fills })` + `emoteFree`; the render/route split).*

### The catalog is content — its own Mongo collection

*Superseded by the code: the catalog is a `documents` row of `kind: 'emote'` (content-packs wave 2), not its own collection; `SoulCatalogue` + `SoulApi` + the `soul` suite shipped → [emotes.md](../../subsystems/emotes.md) § The `Emote` value shape, § `SoulCatalogue` + `SoulApi`, § The `soul` authoring suite.*

### The grammar reduction (author less than the essay implies)

*Superseded by the code: one Liquid template per emote with `{% if %}` for slot presence — no four-permutation matrix; conjugation via pre-bound `s`/`es`/`ies` + an optional `verbForm` override → [emotes.md § The grammar substrate](../../subsystems/emotes.md).*

### Typed grammar slots (the moderation foundation)

Liquid lets the grammar be expressive — multiple named interpolation
points, not just a trailing string. That expressiveness is exactly why
**every dynamic slot must carry a declared content-kind.** A slot is one
of:

| Slot kind | Source | Renders | Injection risk |
|---|---|---|---|
| `literal` | author grammar text | fixed prose | **none** — author-controlled |
| `entity` | a resolved `Stuff & Sensor` ref (target, a thing in scope) | the entity's `<name>` | **low** — bounded by entity-name moderation, never raw user text |
| `enum` | a closed, author-declared vocabulary on the slot (e.g. an approved manner list: `happily`/`sadly`/`warmly`…) | one chosen token | **none** — user picks from a fixed set, supplies no text |
| `free` | arbitrary user text (the old "adverb", the free-form `emote` body) | sanitized user text | **high** — the only true free-text channel |

The "adverb" from earlier is really a *manner* slot, and the better
version of it is an `enum` (a curated adverb vocabulary) rather than
`free` — `smile happily` where `happily` is one of N approved manners is
both expressive *and* injection-proof. `free` slots exist (you can't
pre-enumerate everything, and free-form `emote` is inherently `free`),
but they are the *only* place arbitrary user bytes enter, so they are
the single thing moderation has to gate. An `Emote` record's
`EmoteGrammar` declares each slot's kind (and an `enum` slot's allowed
values); the engine knows, per emote, exactly which slots are `free`.

This typing is the foundation the moderation surface (below) stands on:
because the engine knows every slot's kind, it can structurally
guarantee "no free-text path is open" in locked-down mode — without
trusting a denylist.

### The dynamic-verb seam (the one new engine bit)

*Shipped as (A), inline in `CommandGiver._runChain` — no controller, no synthesized schema → [emotes.md § Dispatch paths](../../subsystems/emotes.md) (a). The autocomplete-subset question was answered by a fetched catalogue, not schemas → § The client read face (`GET /api/emotes`).*

### Free-form `emote` (the "emote" emote)

*Shipped: `emote.yaml` → `EmoteController`; `:` / `;` prefixes via `detectEmotePrefix` in `msh`, falling back to free-form on a catalog miss → [emotes.md § Dispatch paths](../../subsystems/emotes.md) (b), (c).*

### NPCs emote — and the immersion gate

Because the capability is on the being, NPCs, combat, and scheduled
behaviors emote through the *same* `emote()` call. This is what makes
the natural-language thesis pay off: `The farmer waves at you.` is
in-fiction and unambiguous, where a farmer emitting 👋 is the uncanny
valley. The mechanism that protects this is the Layer-2 render setting
being **per-source-class** (player vs NPC), so a reader can allow player
emoji and suppress NPC emoji without the engine special-casing anything
— NPCs simply tend not to carry glyphs, and readers can hard-suppress.

### Topic

*Superseded: the leaf is `act.emote` (one leaf for catalog and free-form; the payload distinguishes), authored as a Topic row → [emotes.md § Topic and modality](../../subsystems/emotes.md).*

### Reach: emotes ride the ESP channel (don't overthink it)

*Paragraph superseded by the code: reach is gated by the `emotive-esp` modality in the recipient's sensorium (the baseline `AetherImplant` confers it to every player), not ungated; a directed target resolves at `scope: 'online'` and crosses rooms → [emotes.md](../../subsystems/emotes.md) § Topic and modality, § Universal ESP target delivery. The audience question below is still open for the channel case.*

So reach reduces to one question: **who's the audience?** — and that's
just routing. The **canonical audience** (the ESP transmission) is the
delivery context's participant set, *not* physical co-presence. The
self / target / peers role-split still applies (you: "You smile at Iffy";
Iffy: "…at you"; peers: "Bobalu smiles at Iffy") — but *who counts as a
peer* depends on the context:

- **In the room** → participants are the room's occupants (`toPeers`
  today).
- **On a channel** → participants are the channel's members.
- **Directed at one remote person, no channel** → just **self + target**
  canonically (no conversation peers — there's no shared space or
  channel). What the participants' *physical rooms* see is a separate,
  optional layer — see **Echo**.

`emote()` composes the act once and delivers it to that audience over the
ESP channel; distance is irrelevant to perception. The membership for
remote/channel cases comes from the **comms subsystem**
([comms-slate.md](../tails/comms-slate.md)); emote v1 ships the in-room case.

### Echo

A remote emote's canonical audience is self + target (+ conversation
peers). **Echo** is the optional extra: does the act *also* reach beings
**physically near a participant**? Bobalu smiles at Iffy a continent
away — do the people standing next to Bobalu perceive it too? It's ESP/
magic, so if they do, they perceive the **whole act** —
*"Bobalu smiles at Iffy"*, target and all — even though Iffy isn't
there. (An emote is not a face-muscle movement that needs its object
present; the ESP channel conveys the target and intent.) Whether echo
fires is optional and situational, and the flexibility lives in
**defaults and settings, never per-message syntax** (typing an audience
matrix every time would be the UX nightmare). Two rules keep it clean:

1. **Each end controls its own echo — never the other's.** The sender
   governs whether *their* room sees them perform it; the receiver
   governs whether *their* room sees them react. Nobody configures the
   far end, so asymmetry (sender echoes, receiver doesn't, or any
   combination) falls out for free, and you decide what your own
   surroundings perceive about you.
2. **Echo is layered defaults, not a prompt.** A **per-emote default**
   on the catalog record (`echo` — a private telepathic nudge → no echo;
   a physical-looking cheer → echo) handles the common case; a **per-user
   setting** (`social.emote.echo` = always / never / per-emote) is a
   set-once standing preference; a single optional **sender-side
   per-message override** covers the rare exception. No matrix.

**The echo reuses the normal directed grammar — no special template.**
Bystanders near Bobalu get the same *"Bobalu smiles at Iffy"* the
canonical peers get; there's nothing to strip or redact, so no per-emote
authoring burden. (Speech is different — `whisper` hides the *words*, so
its room line is "Bobalu whispers something to Iffy"; but that
content-redaction is a `tell` / `whisper` *speech* feature owned by
comms, not an emote-grammar concern.)

Echo is **designed-for, not v1**: in-room, everyone present is already in
the canonical audience, so there's nothing *extra* to echo until remote
audiences exist (comms). v1 reserves the catalog `echo` field + the
`social.emote.echo` setting; the echo *routing* lands with comms.

### Provenance without the hokey prose

How does a reader tell an in-room smile from a channel smile from a
private remote one? **Not** with narrative prefixes — "Over the radio,
Bobalu smiles at you" reads fine once and turns into mechanical
boilerplate by the hundredth time, which is the opposite of immersive.

So **provenance is a *tagged label in the complete string* — the
`[Gossip]` form, carried as a semantic `<chan>` region so it flattens to
the failsafe AND the client can render it as a chip/color/placement.**
Not bare frame-metadata (the string must stay complete — logging/
accessibility/portability), and not hokey narrative ("over the radio…").
The prose stays the clean act with its label: *"[Gossip] Bobalu smiles at
you."* flattens whole; a rich client renders the channel region as a
chip, a distinct private/remote treatment, or per-conversation placement.
The full rendering model — tagged-complete-string → flatten/reflow — is
the [message-rendering slate](../tails/message-rendering-slate.md); the visual
treatment is a client/cockpit concern, not the emote engine's prose.

### Bootstrap & the starter roster

*Superseded: the roster is the `expression` content pack (34 rows at `/expression/emotes/<verb>`, installed by `PackApi.install`, three-way reconciled); no seed file, no `SoulApi.seed()` → [emotes.md § Starter roster](../../subsystems/emotes.md). New emotes are `soul make`d under the soul committee's title.*

---

## Layer 2 — Emoji / hybrid rendering (Principle 3)

Each catalog entry *may* carry an `emoji`. From one command
(`;wave iffy hello`) the system can render three ways:

```
Bobalu waves hello at Iffy.          (text)
Bobalu: @Iffy hello 👋               (emoji)
Bobalu waves hello at Iffy. 👋        (both)
```

Which rendering a reader sees is **their** choice, per channel — an
`EnvironmentMixin` setting (`social.emote.render` = `text|emoji|both`,
keyed per topic/channel), the exact shape of the `pedagogicalSeam`
toggle. The server always sends the failsafe prose in `body` and the
glyph (+ structured bits) in `payload`; the client composes per
setting. This is Principle 3 verbatim: engine composes once,
serialization differs.

Two disciplines fall out of the thesis:

- **Suppressible by source.** The setting distinguishes player vs NPC
  sources (the anti-uncanny-valley lever) — see the farmer 👋.
- **Glyphs are sparse and optional.** Not every emote gets a glyph
  (you can't find a sensible one for `bogleg`), and that's fine — prose
  is always present. The scaling problem ("find an emoji for every
  emote") simply doesn't arise because emoji is the optional layer, not
  the medium.

Mostly client work + a payload field + a setting; cheap server-side.

---

## Layer 3 — Honorary / entitlement-gated emotes

The Twitch-flavored half: some emotes (and especially their glyph
*badges*) denote status or affiliation and are usable only by those
entitled. The essay's insight — **the glyph is the badge, and the only
way to put it in your message is to actually have the emote** — is the
anti-spoof for honorary status.

Modeling: a catalog entry's `requires` names an **entitlement
predicate** checked against the actor at dispatch (a hit on a gated
emote the actor lacks → declined, with a note). Crucially this is an
*entitlement* check (staff status, cohort, course completion,
achievement), **not** the RPG capability system from
[capability-magic-slate.md](../builds/capability-magic-slate.md) (deferred).
For an educational deployment these gates are genuinely useful —
instructor/TA badges, cohort emotes, completion markers — and read as
honors rather than power.

With the catalog as the `emotes` collection, gating is the record's
`requires` field → a pluggable **entitlement predicate** evaluated
against the actor at dispatch. (Authoring access — *who may mint or edit
an `Emote`* — is a separate, ordinary write-permission concern on the
collection, distinct from *who may use* a gated emote.) *Defer the
entitlement **source*** (what grants an entitlement) — model only the
*gate* and the predicate seam; the source is whatever later system
(achievements, roster, enrollment) earns it.

---

## Layer 4 — Reactions / aggregation (recommend its own slate)

*Shipped → [reactions.md](../../subsystems/reactions.md): `react [--to <person>] [--msg <#>] <emote>`, the gutter number → `commandId`, act-scoped tallies, chips grouped by `tags[0]`, per-user controls, the fetched emote picker.*

---

## Moderation: emote-only mode & the tightness guarantee

A first-class use of emotes is **content moderation**. A moderator can
put one player, or everyone, into **emote-only mode** on one or more
channels: they can no longer emit arbitrary text (`say`/`tell` are
blocked), only emotes. The hard requirement: this must be **tight** —
no one can smuggle slurs or other abuse through the emote machinery's
dynamic parts.

### The guarantee is structural, not filter-based

The naïve version of emote-only mode leaks immediately: the free-form
`emote` body and the old free-text "adverb" are arbitrary user text
wearing an emote costume. A denylist over that text is a losing,
adversarial game (leetspeak, homoglyphs, zero-width splits, spacing —
"n​i⁣gger" and a thousand variants).

So the guarantee rests on the **typed slots** (above), not on catching
bad words. An **expression policy** resolved per-actor-per-channel has a
level; the strict moderation level admits **only `literal`, `entity`,
and `enum` slots** and forbids every `free` slot — including the entire
free-form `emote` verb. In that mode:

- `say` / `tell` (free dialogue) → blocked.
- free-form `emote <text>` → blocked (it is wholly `free`).
- catalog emotes with a `free` slot → the slot is rejected/dropped
  (e.g. `smile happily` where `happily` is a `free` adverb fails or
  renders without it).
- catalog emotes whose slots are all `literal` / `entity` / `enum` →
  allowed, rendering only author grammar + resolved entity names +
  closed-vocabulary picks.

**The result: in strict mode, every byte that reaches another player
came from author-controlled grammar, a curated `enum` vocabulary, or a
resolved entity's name — never from raw user input.** That's a
structural guarantee; it holds even if the denylist is empty. This is
the answer to "make sure no one can sneak an n-word through."

### The expression policy is a shared comms gate

Emote-only mode blocks `say`/`tell` too, so the policy gate is *not*
emote-specific — it's a moderation seam **all expression producers
consult** at dispatch (`say`, `tell`, the emote path). This slate
introduces it because emote-only mode is the motivating case, but it's
shaped for shared use: a resolver `resolveExpressionPolicy(actor,
channel)` → a level, checked before any text-emitting command runs. Per
the "per-entity concerns belong on the entity" discipline, the actor (or
their `Interactive`) carries the restriction state; a global mode is the
same check with a universe-level default.

### Free-text sanitization (defense for the non-strict paths)

`free` slots, free-form `emote`, and ordinary `say`/`tell` still exist
in *looser* modes (and a player not in emote-only mode types freely). Where
`free` text is admitted it passes a **sanitizer**: Unicode NFKC
normalize → strip zero-width / combining / control chars → collapse
homoglyph & leetspeak folds → length cap → denylist match. This is
defense-in-depth, **explicitly not a guarantee** (moderation of free
text is adversarial and never perfect) — which is exactly why the strict
mode above doesn't depend on it.

The sanitizer is one helper shared by every free-text channel
(say/tell/emote bodies *and* entity naming — see below). It most
naturally belongs to the **broader moderation subsystem** (its own
future slate), with this slate *consuming* it. v1-of-emotes needs the
structural strict-mode guarantee (which needs no sanitizer) plus a
sanitizer call on the `free` paths it owns; a stub denylist is
acceptable until the moderation subsystem ships the real one.

### The remaining leak: entity names

Strict mode still renders `entity` slots as `<name>`s — so a player who
named their pet, item, or avatar a slur could surface it via `smile
<that thing>`. That's not an emote bug; it's **entity-name moderation**,
a sibling surface that must run names through the *same* sanitizer at
naming time. This slate flags it as a dependency; the naming-moderation
mechanism itself is moderation-subsystem territory.

### What's in scope here vs. the moderation subsystem

This slate owns the **enforcement primitives**: typed slots, the
expression-policy *gate* + levels, the strict-mode structural guarantee,
and the sanitizer *call sites* on emote `free` paths. The **control
plane** — moderator verbs to assign modes, scope (per-player / per-room
/ per-channel / global), duration, audit logging, appeals, the sanitizer
*implementation* and shared denylist, and entity-name moderation — is
the **moderation subsystem** (its own slate). The seam is defined here
so the guarantee holds the moment the control plane can set the level.

---

## What emotes are NOT

*Graduated → [emotes.md § What emotes are vs. what they aren't](../../subsystems/emotes.md) (the not-a-state-change / posture line inserted; not-speech and not-a-client-decoration were already there).*

---

## Worked scenarios

### Scenario A — catalog emote, directed + custom

*Shipped (the adverb binds as a `free` slot; three frames from one template) → [emotes.md § The grammar substrate](../../subsystems/emotes.md).*

### Scenario B — free-form emote

*Shipped → [emotes.md § Dispatch paths](../../subsystems/emotes.md) (b), (c).*

### Scenario C — NPC emote, immersion preserved

- A scripted farmer NPC calls `emote(waveEntry, { target: player })` →
  *"The farmer waves at you."* The player's `social.emote.render` is
  `both` for players but `text` for NPCs, so they see prose only — no
  uncanny 👋 from a coded farmer. Same engine path as a player wave.

### Scenario D — emoji layer, two readers

- Bobalu `;wave iffy hello`. Iffy (setting `both`) sees *"Bobalu waves
  hello at Iffy. 👋"*; a bystander with setting `text` sees *"Bobalu
  waves hello at Iffy."* One emitted Scene, two serializations,
  reader's choice.

### Scenario E — honorary emote

- A non-staff player types a staff-only `;official`. The `requires`
  predicate fails → declined, with a `controller-rejected` note and a
  self-frame ("That emote isn't available to you."). A staff member's
  same command renders with the badge glyph that *only* they can put on
  the wire.

### Scenario F — reaction (future reactions slate)

*Shipped → [reactions.md § The `react` verb](../../subsystems/reactions.md).*

### Scenario G — emote-only mode, abuse attempts blocked

- A moderator puts a disruptive player into strict emote-only mode on
  the local channel. The expression policy now gates every text-emitting
  command:
  - `say you're all <slur>` → **blocked** (free dialogue).
  - `emote thinks <slur>` (free-form) → **blocked** (wholly a `free`
    slot).
  - `smile <slur-as-typed-adverb>` → the `free` adverb is **rejected**;
    at most a plain `smile` renders.
  - `wave iffy` → **allowed**: `literal` grammar + an `entity` ref →
    *"Bobalu waves at Iffy."* No user bytes on the wire.
- The player can still participate (catalog emotes, directed at real
  people) but has no free-text channel at all. The block is structural —
  it would hold with an empty denylist.

---

## What this stresses for existing subsystems

### Messaging

*Shipped; the topic is `act.emote` → [emotes.md § Topic and modality](../../subsystems/emotes.md).*

### Prose

*Shipped as pre-bound `s`/`es`/`ies` variables + `verbForm` → [emotes.md § The grammar substrate](../../subsystems/emotes.md).*

### Command routing / parsing

*Shipped: the inline `_runChain` fallback + `EmoteGrammarRunner.bind` → [emotes.md § Dispatch paths](../../subsystems/emotes.md).*

### Persistence / MongoDB

*Superseded: a `documents` row of `kind: 'emote'`, no `emotes` collection → [emotes.md § The `Emote` value shape](../../subsystems/emotes.md).*

### Shell / environment

- A `social.emote.render` setting (`text|emoji|both`, per channel, with
  a player-vs-NPC source distinction) and a `social.emote.echo` setting
  (`always|never|per-emote` — each end's standing local-echo
  preference). Pure `EnvironmentMixin` keyspace work; mirrors
  `pedagogicalSeam`.

### Client

- Subscribe the new topic; render the payload glyph per setting; (Layer
  4, later) the gutter message-id + aggregation UI. The bulk of Layers
  2 and 4 is client work.

### Capability/entitlement (Layer 3)

- An entitlement-predicate seam, kept distinct from the deferred RPG
  capability system. The *source* of entitlements is deferred.

### The comms subsystem (routing only)

- Remote/channel emotes need an *audience* (who's in the DM / group /
  named channel). That routing is the **comms subsystem**'s job — a
  forward dependency, not a v1 build. There's no medium physics for
  emotes (they ride the ESP channel and always come through); comms just
  answers "who are the recipients." Emote v1 ships in-room (`toPeers`).

### Speech (say/tell) + moderation

- The **expression-policy gate** is shared: `say` and `tell` must also
  consult `resolveExpressionPolicy(actor, channel)` and refuse in
  emote-only mode. That's a small, new pre-dispatch check added to the
  existing `VocalMixin`/`SayController`/`TellController` path — the one
  place this feature reaches into already-shipped verbs.
- The **free-text sanitizer** is a shared dependency (say/tell bodies,
  emote `free` slots, entity naming). It belongs to the future
  moderation subsystem; emotes consume it and ship with a stub until
  then. The strict-mode guarantee does **not** depend on it.

---

## Open questions

1. **Catalog home.** *Resolved → emotes.md § The `Emote` value shape: a `documents` row of `kind: 'emote'` (content-packs wave 2), not its own collection.*
2. **Mixin placement / new subsystem.** *Resolved: `lib/social/` (`Soul.ts`, `Emote.ts`, `EmoteGrammar.ts`).*
3. **Free-form verb.** *Resolved: `emote`, with `:` and `;` as prefixes → emotes.md § Dispatch paths.*
4. **Grammar auto-derivation depth.** *Resolved by the code: one explicit Liquid template per emote with `{% if %}` conditionals → emotes.md § The grammar substrate.*
5. **Dynamic-verb dispatch.** *Resolved: the fallback resolver, inline in `_runChain`; the palette is fetched (`GET /api/emotes`), not registered as schemas → emotes.md § Dispatch paths, § The client read face.*
6. **Emote topic name.** *Resolved: `act.emote` → emotes.md § Topic and modality.*
7. **Customization model.** *Resolved: typed, named slots* (`literal` /
   `entity` / `enum` / `free`) rather than one free-text blob — the
   moderation foundation. Open at the detail level: the exact slot-kind
   taxonomy (is `enum` enough, or do we want pattern/length-bounded
   `free` sub-kinds?) and the input syntax for binding multiple slots.
8. **Verb-agreement mechanism.** *Resolved: pre-bound `s`/`es`/`ies` variables + an optional `verbForm` override → emotes.md § The grammar substrate.*
9. **Honorary entitlement model.** Predicate-on-entry vs access-tree
   (couples to Q1). *Lean: predicate seam now, source deferred.*
10. **Reactions: same cycle or own slate?** *Resolved: own cycle, shipped → reactions.md.*
11. **Combat/scheduled NPC emote authoring.** *Resolved as leaned: a brain calls `ctx.emote(verb)`, which resolves through `SoulApi.resolve` — one door → behavior.md (the brain context helpers).*
12. **Emote-of-emotes / chaining** (`nice ;highfive ;dead`). The essay
    notes each emote is a distinct verb, so chaining doesn't fit the
    model; it leans on emote-language fluency + Unicode-in-customization
    instead. *Lean: no first-class chaining v1; revisit only if a real
    need appears.* (Note: a `free` Unicode customization is gated by the
    same sanitizer/strict-mode rules — chaining doesn't open a side door.)
13. **Expression-policy levels.** How many moderation levels — just
    `free` / `emote-only-strict`, or intermediate (`emote-only-loose`
    that permits sanitized `free` slots but blocks free-form `emote`)?
    *Lean: ship `free` + `strict` v1 (the tight guarantee is the point);
    add intermediate levels if moderators want them.*
14. **Where the policy state lives + scope.** Per-`Interactive` vs
    per-`Avatar`; per-channel vs per-room vs global. *Lean: on the actor
    (Interactive), resolved per-channel, with a universe-level default
    for the global case — but the **control plane that sets it** is the
    moderation subsystem, deferred.*
15. **Sanitizer ownership & shape.** Lives in the moderation subsystem
    (lean) and is consumed here; v1-of-emotes ships a stub denylist
    behind the real call sites. The normalization pipeline (NFKC / strip
    zero-width / homoglyph + leet folds / length cap) is the load-bearing
    part, not the wordlist. *Open: confirm the subsystem boundary at
    requirements.*
16. **Entity-name moderation.** Strict mode still renders entity
    `<name>`s; names must run the sanitizer at naming time or they're a
    leak. *Lean: flag as a hard dependency on the naming surface; the
    mechanism is moderation-subsystem territory, but emotes must not
    claim the strict guarantee until naming is also gated.*
17. **Reach.** *Resolved, in a different shape: reach is gated by the `emotive-esp` modality (universal for players via the baseline implant); a directed target crosses rooms at `scope: 'online'`; the channel audience is still unbuilt (see *Reach* above) → emotes.md § Topic and modality, § Universal ESP target delivery.*

---

## Build order

Indicative waves; final cut decided at requirements. Reactions (Layer
4) is split out to its own slate/cycle per Q10.

**Wave 1 — the trunk (the whole feature in text).**

- *Shipped → [emotes.md](../../subsystems/emotes.md): `SoulMixin.emote()`, the catalogue + `SoulApi`, the `expression` pack, the grammar runner + typed-slot binding (`stuff` / `free` only), ESP target delivery, the `_runChain` fallback, `emote` / `:` / `;`. Not shipped from this wave: the `social.emote.echo` setting and the moderation primitives below.*
- **Moderation primitives** (tightness is load-bearing, so it's Wave 1):
  the shared `resolveExpressionPolicy(actor, channel)` gate consulted by
  `say` / `tell` / the emote path; the `free` / `strict` levels; the
  strict-mode structural rule (no `free` slot, no free-form `emote`); a
  sanitizer call site on `free` paths (stub denylist acceptable). The
  control plane is out (deferred to the moderation subsystem).
- `EmoteController` + tests: directed/non-directed × plain/custom render
  correctly to self/peers/target; NPC emote routes identically;
  unknown-non-emote verb still errors; **strict emote-only mode blocks
  `say`/`tell`/free-form `emote`/`free` slots and admits only
  literal+entity+enum output (passes with an empty denylist)**.

**Wave 2 — emoji / hybrid (Principle 3).**

- `social.emote.render` setting (text/emoji/both, per channel, player-
  vs-NPC source distinction).
- Client glyph rendering per setting.

**Wave 3 — honorary / entitlement gating.**

- `requires` predicate seam (the record field) + dispatch-time check +
  declined-note path.
- The badge-glyph-only-with-entitlement guarantee.

**Adjacent / future (own slate):**

- *Reactions and the comms substrate shipped → [reactions.md](../../subsystems/reactions.md), comms.md, chat.md.*
- Entitlement *sources* (achievements / roster / enrollment that grant
  honorary emotes).
- Emote chaining / scripting, if a real need surfaces.
- **Moderation control plane** (its own slate): moderator verbs to set
  emote-only mode, scope/duration assignment, audit logging, the shared
  sanitizer implementation + denylist, and entity-name moderation. The
  emote slate ships the *enforcement primitives* these drive.

---

## What this slate does NOT cover

- **The moderation control plane** — moderator tooling to *assign*
  emote-only mode (scope, duration, audit, appeals), the shared
  sanitizer *implementation* + denylist, and **entity-name moderation**.
  This slate owns the enforcement primitives (typed slots, the
  expression-policy gate, the strict structural guarantee, sanitizer
  call sites); the control plane is the moderation subsystem.
- **A perfect free-text filter.** Free-text moderation is adversarial
  and never complete; the slate's *guarantee* is structural (strict mode
  admits no user free text), with the sanitizer as defense-in-depth on
  the looser paths only.
- **The entitlement source** for honorary emotes — only the gate is
  modeled; what *grants* an entitlement is deferred.
- **The RPG capability system** — honorary gating is an entitlement
  check, explicitly *not* the deferred capability/magic layer
  ([capability-magic-slate.md](../builds/capability-magic-slate.md)).
- **Posture / physical actions that change state** — `sit`/`stand`/
  `kneel`/`lie` are the posture subsystem; emotes mutate no state.
- **Dialogue** — `say`/`tell` (`world.speech.*`) are speech, not
  emotes.
- **Client buffer/threading architecture beyond the gutter id** the
  reactions hook implies — general buffer redesign is out of scope.
- **A general per-message metadata/aggregation framework** beyond the
  emote `tags` hook — if a broad message-tagging system is wanted, it's
  its own design.

---

## Once shaped into formal requirements

This slate boils down to:

- The **echo** model: canonical ESP audience (self/target/peers) +
  optional local-room echo controlled per-end via layered defaults
  (catalog `echo` field + `social.emote.echo` setting + a rare sender
  override); echo reuses the normal grammar (no special view). Routing
  deferred to comms; the record/setting hooks are reserved in v1.
- **Moderation primitives:** the shared `resolveExpressionPolicy(actor,
  channel)` gate (consumed by `say`/`tell`/emote), the `free`/`strict`
  levels, the strict-mode structural guarantee, and the sanitizer call
  sites on `free` paths (implementation + control plane deferred to the
  moderation subsystem).
- Layer 2: the `emoji` field + payload + the `social.emote.render`
  setting (per-channel, player-vs-NPC) + client rendering.
- Layer 3: the entitlement-predicate seam + dispatch gate + badge
  guarantee (source deferred).
- Tests gating: every render permutation; NPC parity; gated-emote
  decline; per-setting emoji serialization; unknown-non-emote verbs
  still error; **strict emote-only mode admits only literal+entity+enum
  output and blocks say/tell/free-form/`free`-slots — verified with an
  empty denylist (structural, not filter-dependent)**.

The reactions machine, the comms substrate (channels/DMs/media — the
remote reach), the entitlement sources, the moderation control plane,
and any emote chaining wait for their own work.
