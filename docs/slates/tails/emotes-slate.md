# Emotes slate (working doc)

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

The substrate decision: **emoting is a capability on the being
(`SoulMixin`, parallel to `VocalMixin`), driven by a content-authored
emote catalog and the existing `ProseApi` grammar.** ("Soul" is the
arcane MUD term of art for the emote/feelings feature — an LPMud
lineage. We use it for the capability/subsystem; individual catalog
records are `Emote`.) The catalog *access* surface is `SoulApi`
(sanctioned — a persistence-backed catalog with no natural Stuff host);
beyond it, default to the mixin method and
direct calls. The emote *catalog* is content, not code: one controller +
one capability method + N authored definitions, never one
controller/YAML per emote.

---

## What's already solved (don't relitigate)

The source essay agonizes over machinery Saxonberg has since shipped.
Consciously out of scope to redesign:

- **Message buffer + topic classification.** Today: `MessageFrame`
  carries `body` (the failsafe prose) + `topic` + `payload` +
  `meta`; the client subscribes per-topic. The essay's "every event
  needs a human-readable string + a topic + optional metadata" *is*
  the shipped frame.
- **The hierarchy agony** (`public.politics.emote` — political emotes,
  or emotes on the politics channel?) is **dissolved.** Saxonberg split
  the one overloaded string into two orthogonal axes: `topic` (subject)
  + `tags` (facets like `audience:witness`). The essay's grudgingly-
  considered "tags / meta-topics" alternative is what got built.
- **Actor / audience / target view split.** `Scene.toSelf()` /
  `.toPeers()` / `.toTarget()` / `.toContents()`, each auto-stamping an
  `audience:` tag. The four-message social grammar is the composer's
  native shape.
- **Pronoun / possessive grammar.** `ProseApi` + the `pronoun` /
  `possessive` / `cap` / `article` filters, driven by `Gendered`.
- **Anti-spoofing.** The essay requires free-form emotes to begin with
  the actor's name "so players can't spoof game-generated messages."
  **Moot** — frames carry `<name stuff-id>` attribution and `audience:`
  tags; a player literally cannot emit a frame impersonating an NPC
  arrival. That constraint is dropped.

The live question is narrowly *emotes*: the capability, the catalog, the
grammar shape, the dynamic-verb seam, and the three presentation/social
layers on top.

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
| **0/1. Trunk** | `SoulMixin` capability + the emote catalog + ProseApi grammar + dynamic-verb resolution + free-form `emote`. *The whole feature, in text.* | `lib/social/` (proposed) + catalog (home TBD) + `obj/command/EmoteController.ts` |
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

Emoting is a being's act, so it's a mixin method on the being, exactly
mirroring `VocalMixin.say`. The name `SoulMixin` is the MUD term of art
— on LPMud-lineage muds the emote/feelings subsystem is "the soul." The
interface is `Soul` (matching the `VocalMixin`→`Vocal` convention: a
being with a `Soul` can express). Individual catalog records are `Emote`
(below) — *not* `Soul`, to avoid colliding with this capability
interface. Composes onto `Character` (every Avatar + NPC) and any
animate being that should express. The method takes a resolved `Emote`
plus optional target and customization:

```ts
export interface Soul {
  emote(emote: Emote, opts?: EmoteOptions): void;
}

interface EmoteOptions {
  target?: Stuff & Sensor;   // directed: a resolved ref, not free text
  fills?: Record<string, SlotValue>;  // user-supplied slot values (typed; see Typed slots)
}
```

(`fills` generalizes the single "adverb" customization: an emote's
grammar declares named, *typed* slots, and the user supplies values for
them. The typing is what makes moderation tractable — see below.)

`emote()` composes a `Scene` the same way `say()` does — `toSelf` for
the actor, `toPeers`/`toContents` for witnesses (the same
Containable-wins scope rule), `toTarget` for a directed recipient —
then `.payload({...}).send()`. Scene auto-stamps command attribution.
The *only* difference from `say()` is that the prose comes from the
catalog entry's grammar rather than a fixed `"You say, …"` template, and
the topic differs (below).

**Why a mixin, not an Api, not per-emote controllers:** emoting is new
per-being behavior that composes uniformly onto every being kind —
exactly a mixin's job. The catalog is *data*, so it needs no code per
entry. This honors the standing rules: no Api-for-content, no
per-content controllers, no premature registry.

> **Naming/placement decision:** `lib/social/` as a new subsystem
> folder (emotes, and later reactions, cluster as "social expression,"
> distinct enough from raw `lib/message/` plumbing). Alternative: fold
> `SoulMixin` into `lib/message/` beside `Vocal`. *Lean: new
> `lib/social/`* — it gives reactions and any future social mechanics a
> home — but this is a propose-a-new-subsystem call and wants explicit
> sign-off (per the module-taxonomy rule). Mixin name `SoulMixin` is the
> MUD term of art (LPMud "the soul"); the marker is `_mixinName =
> 'SoulMixin'`. Terminology split: **`Soul`** = the capability/subsystem
> (`SoulMixin` / `interface Soul` / `SoulApi`); **`Emote`** = an
> individual catalog record and the act (`class Emote`, the `emote()`
> method, the `emote` verb).

### The catalog is content — its own Mongo collection

The vocabulary is large and open (the `bogleg` story is the whole
point: emotes accrete from the community). So this is **one
`EmoteController` + one `emote()` method + N data records** — never one
YAML/controller per emote, and **never a cloned `Idea` per emote.** An
`Emote` record is *pure declarative data*: a verb, its grammar, an
optional glyph, an optional gate, optional aggregation tags. Crucially,
**emotes carry
no behavior** — unlike a Vitals affliction (progression/resolution code)
or a trauma (a behavior table). That "data, no behavior" property is the
decisive fact for catalog home: there's no code to attach and no
world-object to instantiate, so the heavy Template→Stuff clone/Hydrator
pipeline (the `domain` collection, folder/leaf invariants, per-instance
registration) is pure overkill.

**Decision: the catalog is its own MongoDB collection (`emotes`),** on
the lightweight **`Document` track** ([persistence.md](../../subsystems/persistence.md))
— the same record track as `users` / `google_profiles` / `Template`, not
the world-object track. `Emote` records are catalogue documents, queried
by verb/alias, *not* instantiated as live world Stuff.

Two payoffs this buys over a flat data file (the alternative we
considered and dropped):

- **Runtime authoring.** A wizard mints a new `Emote` in-game and it's
  immediately usable — no redeploy. This is *exactly* the `bogleg`
  accretion story made mechanical: the community grows the lexicon
  live. (A flat file needs an edit + deploy for every new emote.)
- **Indexed lookup on the hot path.** The dynamic-verb resolver
  (below) hits the catalog on potentially every command; a collection
  with an index on verb/aliases (cached in memory — see *access
  pattern*) is the natural fit.

An `Emote` record, shape-sketch (mirroring the `User extends Document`
pattern in persistence.md):

```ts
class Emote extends Document {
  static collectionName = 'emotes';
  static persistentFields = [
    'verb', 'aliases', 'grammar', 'echo', 'emoji', 'requires', 'tags',
  ];

  verb: string = '';        // canonical: 'smile'  (indexed)
  aliases: string[] = [];   // 'bog', 'boglegged' → 'bogleg'  (indexed)
  grammar: EmoteGrammar = {}; // the prose templates (below)
  echo: boolean = false;    // default: does this also echo to the actor's room? (see Echo)
  emoji?: string;           // Layer 2 — optional glyph
  requires?: string;        // Layer 3 — entitlement predicate key
  tags: string[] = [];      // Layer 4 — aggregation grouping ('affirmative')
}
```

`EmoteGrammar` is the four-permutation grammar matrix (below) plus each
dynamic slot's declared content-kind (`literal` / `entity` / `enum` /
`free`, see *Typed grammar slots*) — the only non-scalar field; persisted
as a sub-document. Whether an emote has *any* `free` slot is derivable
from the grammar (and worth denormalizing onto the record for fast
"allowed in strict mode?" filtering).

Records ride the **`Document` base** (`Emote extends
Document`, `static collectionName = 'emotes'`) — they get
`find`/`findById`/`save`/`delete` for free and `PersistenceManager`
stays generic (no catalog-specific bloat in it). The grammar/glyph/gate
fields are `persistentFields`.

**Access pattern.** Reads dominate (every emote command resolves a
verb); writes are rare (an author minting an `Emote`). So a
**`SoulCatalogue` singleton Stuff** (`/obj/SoulCatalogue`, sibling to
`TopicCatalogue`) owns the **verb→`Emote` index loaded at bootstrap
(`Emote.find({})`) and refreshed write-through** on mint/edit — Mongo is
the system of record, the catalogue's in-memory cache is the hot path.
**`SoulApi`** is the thin caller-facing facade over that singleton:
`SoulApi.resolve(verb)` for the dispatcher, `SoulApi.mint(...)` /
`SoulApi.all()` for authoring and help, each a 1:1 delegate to the
catalogue. The Api holds no state of its own; the catalogue Stuff is the
live state (mirroring `TopicCatalogue` + the topic Api exactly). It's a
*justified* registry (the standing "no premature registries" rule wants a
present-day need; the every-command lookup + runtime authoring + the
several-thousand-record scale supply it). `SoulApi` ends with
`SecurityApi.decorateApiClass(SoulApi)` per convention.

### The grammar reduction (author less than the essay implies)

The essay names four permutations — non-directed, directed, custom
non-directed, custom directed — each with actor/audience/target views.
Naively that's ~10–12 strings per emote, brutal at catalog scale. It
collapses hard, because **the actor token renders differently per
audience for free**: the self frame renders the actor as "you," the
peer/target frames render it as the name. That's exactly how
`VocalMixin` already produces "You say, …" vs "Bobalu says, …" from one
intent. So an author supplies at most **four** templates (the
directed × custom matrix), each written once with an `{{ actor }}`
token, and the self/peer/target renderings fall out of the Scene split:

```yaml
# the 'smile' entry's grammar
plain:           "{{ actor }} smile{{ s }}."                 # smile
directed:        "{{ actor }} smile{{ s }} at {{ target }}." # smile iffy
custom:          "{{ actor }} smile{{ s }} {{ adverb }}."    # smile happily
customDirected:  "{{ actor }} smile{{ s }} {{ adverb }} at {{ target }}."
```

Rendered for the self frame, `{{ actor }}`→"You", `{{ s }}`→"" →
*"You smile happily at Iffy."* For peers, `{{ actor }}`→`<name>Bobalu</name>`,
`{{ s }}`→"s" → *"Bobalu smiles happily at Iffy."* The verb-agreement
token (`{{ s }}`/conjugation) is the one English wrinkle; a small
`ProseApi` filter or a `verbForm` helper handles the you-vs-third-person
conjugation so authors don't write both. Pronoun/possessive filters
already exist for grammar that reaches into the target (`{{ target |
possessive }} hand`).

> Open sub-decision: how much to auto-derive. A fully-defaulting scheme
> (author gives only the bare verb + its third-person form; the four
> templates synthesize) makes mass authoring cheap but limits oddball
> grammar; an all-explicit scheme is verbose but unconstrained. *Lean:
> sensible defaults with per-entry override* — most emotes take the
> default shape, weird ones (`bogleg at the concept`) override.

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

`smile iffy happily` arrives with `smile` as the verb — which is **not**
a registered YAML command. Everything else in the trunk is content +
existing composer; *this* is the genuinely new plumbing, and it lives in
command-routing. Two approaches:

- **(A) Fallback resolver.** On an otherwise-unknown verb, the
  dispatcher calls `SoulApi.resolve(verb)` before emitting "huh?"; a hit
  dispatches to `EmoteController` with the matched `Emote` + parsed
  target/adverb. Clean, scales to thousands (no schema flood), but
  emotes don't appear in client autocomplete unless separately
  surfaced.
- **(B) Bulk schema registration.** Every emote registers a synthetic
  command schema via `system.commands.added`, flowing through the
  normal dispatch + autocomplete path. Uniform, but floods schema
  delivery with hundreds-to-thousands of verbs.

*Lean: (A) as the dispatch path, with an optional curated-common-subset
surfaced as schemas (B) for autocomplete/help.* The free-form `emote`
verb (below) *is* a normal YAML command and needs no fallback.

### Free-form `emote` (the "emote" emote)

The degenerate catalog entry: a single emote whose grammar is just
"actor + custom string." `emote shuffles a deck of cards.` →
*"Bobalu shuffles a deck of cards."* This is the canonical LP-lineage
free-form emote. It's a normal YAML verb (`emote.yaml` + a thin
controller, or `EmoteController` with a free-form flag), structurally
identical to `SayController`, on the expression topic. Verb: **`emote`**
(the term of art for the free-form case; `pose` is the MUSH-side word
and a poorer fit for a soul-lineage design), with `:` as the idiomatic
single-char prefix alias. The essay's "must start with the actor's name
to prevent spoofing" constraint is dropped — attribution is structural.

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

Emotes are *expression*, distinct from `world.speech.*` (dialogue) and
from `world.narration.action` (whose `message.ts` TODO scopes it to
state-change narration like open/close). *Lean: a dedicated
`world.expression.emote`* (or `world.social.emote`), so Layer 4
reactions and per-channel filters have a clean handle. Adding a topic
constant is trivial; picking the namespace now avoids a retrofit. The
client adds it to `renderTopics`.

### Reach: emotes ride the ESP channel (don't overthink it)

"Smile at Iffy across the world" just works. Emotes are perceived over a
universal **ESP channel** — an empathic sense every being has — so an
emote reaches its audience whether they're in the room or remote, with
**no per-sense or per-medium gating**. A smile in a pitch-dark room is
still felt; a wave to a friend a continent away lands. No modality, no
"can you see it," no device required. They're emotes — they're meant to
be fun. (Worldbuilding: that "ESP channel" is the baseline **implant**'s
neural layer — cybernetic in mechanism, ESP in feel — the same substrate
that carries DM/chat. See [comms-slate.md](../tails/comms-slate.md) /
[augmentation-slate.md](../tails/augmentation-slate.md). It stays ungated and always-on
for emotes by design; the implant is the *explanation* for the magic,
never a constraint on it.)

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

Emotes are flat data, so bootstrap is flat too — *not* the
template/Hydrator/clone path. **One seed file** (`seeds/social/emotes.yaml`,
a list of records), and a small boot step (`SoulApi.seed()`, after
`PersistenceManager.connect`) that **idempotently upserts by `verb`**
(insert-if-missing, never clobbering community-minted entries), then
`SoulApi.load()` builds the index. Add `emotes` indexes (unique `verb`,
plus `aliases`) to `PersistenceManager.createIndexes()`. This is the
**first seeded `Document` catalog** (`users`/`google_profiles` are
runtime-only) — a small new pattern, deliberately lighter than the
`domain` template machinery; no hook needed in v1.

**Starter roster** — ~40 general-purpose social emotes; content teams +
runtime minting grow it from there:

- greetings/courtesy: wave, bow, curtsy, salute, greet, beckon
- affirm/deny: nod, shake, shrug
- joy/warmth: smile, grin, laugh, chuckle, giggle, beam, cheer, clap
- affection: hug, kiss, pat, cuddle, wink
- displeasure/sadness: frown, scowl, glare, sigh, groan, pout, cry
- surprise/confusion: gasp, blink, gape, facepalm, ponder
- playful: smirk, snicker, poke, tease, dance, highfive
- abstraction: `bogleg` (+ aliases `bog` / `boglegged` / `almightybogleg`)
- free-form: `emote` / `:`

A handful double as **living tests** of the grammar: `smile`
(directed + custom), `bow` (`entity` slot), `dance` (`enum` manner slot),
`emote` (`free` slot + the moderation gate), `bogleg` (abstraction +
aliases). Excludes posture verbs (sit/stand/kneel/lie — state changes,
not emotes) and anything that's really `say`.

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
[capability-magic-slate.md](../deferred-rpg/capability-magic-slate.md) (deferred).
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

`react 113 ;agree` attaches an emote to message `113` (a numeric id in
the buffer gutter); the client aggregates reactions into per-emote
counters with collapse/expand, optionally grouping by a tag
(`affirmative` folds `agree`/`ok`/`nod` into one 👍). Keyboard-first:
a `react` command, not a mouse-only button (consistent with
"all actions resolve to single command lines").

**Scoping recommendation: reactions is its own feature cycle.** It is a
*generic message affordance* — you'd want to react to a `say`, a combat
hit, or a system event, not only an emote. It *depends on* the emote
vocabulary (the thing you react *with*) but its plumbing is independent
and heavier:

- **message-id surfacing** — every buffer-rendered frame needs a
  stable, addressable id (`Interactive.nextFrameId` is the ordering
  primitive to build on); the gutter id is new client + wire surface.
- **a `react` verb** — `react <id> ;<emote>`, resolving the emote
  through the same catalog.
- **client aggregation UI** — counters, expand/collapse, the
  rate-limited "expanded reactions" throttle the essay describes.
- **per-user aggregation settings** — when to auto-collapse, whether
  to always aggregate (Discord-style), which dimensions to group on
  (emote / tag / actor), tag→group maps.

The essay is itself uncertain here ("any implementation is only as good
as adoption"), and the design space (what loss is acceptable in
aggregation) is large and subjective. Carve it out: this slate
*specifies the hook* (emotes carry aggregation `tags`; the topic is
filterable), and the **[reactions slate](../tails/reactions-slate.md)** owns the
rest (the scale-first design: a reaction is an emote-at-a-message +
batched aggregate-delta broadcast). Including it in "everything" means it
ships — just not in the same cycle as the trunk.

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

- **Not state changes.** Emotes mutate zero world state — they are
  pure expression. This is the clean line against the **posture**
  subsystem (`sit` / `stand` / `kneel` / `lie`), which *does* change
  state (occupancy, `Posed`). "Bow" the expression is an emote even
  though it rhymes with a posture; a posture verb that happens to emit
  narration is still not an emote. If an action changes the world, it's
  not an emote.
- **Not dialogue.** `say` / `tell` carry words (`world.speech.*`);
  emotes carry acts (`world.expression.*`). Free-form `emote` blurs the
  line intentionally but stays on the expression topic.
- **Not a client chat decoration.** The expression originates in the
  world (a being's `emote()` call), not as client-side markup on a chat
  line. The client *renders* it (and may enrich with a glyph); it does
  not author it.

---

## Worked scenarios

### Scenario A — catalog emote, directed + custom

- `smile iffy happily`. Verb `smile` misses the YAML registry → emote
  fallback resolver → `EmoteController` with the `smile` entry, target
  Iffy, adverb "happily."
- `emote()` composes a Scene on `world.expression.emote`:
  - self: *"You smile happily at Iffy."*
  - peers: *"Bobalu smiles happily at Iffy."*
  - target (Iffy): *"Bobalu smiles happily at you."*
- All three fall out of one `customDirected` template via the actor/
  target token rendering per audience.

### Scenario B — free-form emote

- `emote shuffles a deck of cards.` (or `:shuffles a deck of cards.`). Normal YAML verb →
  free-form controller → *"Bobalu shuffles a deck of cards."* to self
  and peers. No catalog lookup; attribution structural.

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

- `react 113 ;agree` attaches `agree` to message 113; the client folds
  it (and any `ok`/`nod`, via the `affirmative` tag) into an aggregated
  👍 counter on that line.

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

- A new `Scene` producer (`SoulMixin.emote`) and a new topic
  (`world.expression.emote`). No change to the composer or delivery
  chokepoint. Add the topic constant to `MessageApi.Topics` and the
  client `renderTopics`. `toTarget` (already present) gets first real
  heavy use for the directed-target view.

### Prose

- Emote grammar *is* `ProseApi`. Needs one small addition: an
  English **verb-agreement** helper/filter (you-form vs third-person:
  "smile" / "smiles") so an author writes one template per permutation,
  not two. Pronoun/possessive filters already cover target grammar.

### Command routing / parsing

- The **dynamic-verb fallback** (unknown verb → emote catalog) is the
  one new dispatch seam. Parsing must bind the emote's declared slots
  from the input (`verb <entity> <slot-values…>`), validating each
  against its kind (an `enum` slot accepts only its vocabulary; a `free`
  slot is the sanitized/gateable text). Decide how emotes interact with
  the scope try-list and `system.commands.*` schema delivery (the
  curated-subset question).

### Persistence / MongoDB

- A new **`emotes` collection** via `Emote extends Document`
  (alongside `users` / `google_profiles` / `domain`) — add it to the
  `Collections` enum; CLAUDE.md's "MongoDB Collections" list gains an
  entry at graduation. **No changes to `PersistenceManager`** — `Emote`
  uses the inherited `Document` CRUD. The `SoulCatalogue` singleton
  (new, in `obj/`) loads the verb→`Emote` index at bootstrap and
  refreshes it write-through on mint/edit; `SoulApi` (new, in `api/`)
  thin-wraps it. No touch to the Template→Stuff clone pipeline.

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

1. **Catalog home.** *Resolved.* Its own MongoDB `emotes` collection on
   the lightweight `Document` track — not the Template→Stuff clone
   pipeline (overkill for behaviorless data), not a flat file (a live
   collection enables runtime emote-minting, the `bogleg` accretion
   story). `Emote extends Document` (`collectionName = 'emotes'`),
   keeping `PersistenceManager` generic. A **`SoulCatalogue` singleton
   Stuff** owns the load/lookup/mint surface + a bootstrap-loaded,
   write-through verb→`Emote` index; **`SoulApi`** is the thin facade
   over it. Open only at the detail level for the build:
   exact `SoulApi` method names and the index-refresh hook on mint/edit.
2. **Mixin placement / new subsystem.** `lib/social/` (new) vs folding
   into `lib/message/`. *Lean: `lib/social/`* (gives reactions a home),
   pending the propose-a-subsystem sign-off.
3. **Free-form verb.** *Resolved: `emote` as the word (LP term of art;
   `pose` is the MUSH word and a poorer fit) + `:` as the idiomatic
   single-char prefix alias.*
4. **Grammar auto-derivation depth.** Fully-defaulting (author gives
   only verb forms) vs all-explicit templates. *Lean: defaults with
   per-entry override.*
5. **Dynamic-verb dispatch: fallback resolver vs bulk schema
   registration.** *Lean: fallback resolver + curated-subset schemas
   for autocomplete.*
6. **Emote topic name.** `world.expression.emote` vs `world.social.*`
   vs reuse `world.narration.action`. *Lean: dedicated
   `world.expression.emote`.*
7. **Customization model.** *Resolved: typed, named slots* (`literal` /
   `entity` / `enum` / `free`) rather than one free-text blob — the
   moderation foundation. Open at the detail level: the exact slot-kind
   taxonomy (is `enum` enough, or do we want pattern/length-bounded
   `free` sub-kinds?) and the input syntax for binding multiple slots.
8. **Verb-agreement mechanism.** A `ProseApi` filter, a `verbForm`
   field per entry, or a tiny conjugation helper. *Lean: a filter +
   an optional explicit-irregular override field.*
9. **Honorary entitlement model.** Predicate-on-entry vs access-tree
   (couples to Q1). *Lean: predicate seam now, source deferred.*
10. **Reactions: same cycle or own slate?** *Lean: own slate* — generic
    message affordance, heavier client work, depends on but is separate
    from the emote trunk. This slate specifies only the hook
    (aggregation `tags` + a filterable topic).
11. **Combat/scheduled NPC emote authoring.** How do scripts pick
    emotes (by verb string vs a typed handle)? *Lean: resolve by verb
    string through the same catalog the player path uses — one door.*
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
17. **Reach.** *Resolved: emotes ride a universal ESP channel —
    perceived near or far, no medium/sense gating.* Remote/channel reach
    is just an audience-routing question owned by the comms subsystem;
    emote v1 ships in-room (`toPeers`). No modality, by design.

---

## Build order

Indicative waves; final cut decided at requirements. Reactions (Layer
4) is split out to its own slate/cycle per Q10.

**Wave 1 — the trunk (the whole feature in text).**

- `SoulMixin.emote()` on `Character`, parallel to `VocalMixin`.
- `Emote extends Document` (`emotes` collection) + the `SoulCatalogue`
  singleton (the bootstrap-loaded, write-through verb→`Emote` index) +
  `SoulApi` (the thin facade: `resolve`/`mint`/`all`) + the
  `EmoteGrammar` record shape.
- **Bootstrap**: `seeds/social/emotes.yaml` + `SoulApi.seed()` (idempotent
  upsert by `verb`) + `SoulApi.load()`; `emotes` indexes in
  `PersistenceManager.createIndexes()`. Seed the ~40-emote starter roster
  (see *Bootstrap & the starter roster*).
- The verb-agreement `ProseApi` helper; the four-template grammar with
  per-audience actor/target rendering; **typed slots** (`literal` /
  `entity` / `enum` / `free`) declared in `EmoteGrammar` + per-kind
  input validation.
- Emotes ride the **ESP channel** — perceived regardless of distance, no
  medium gating. v1 delivers the co-present audience (`toPeers`); remote/
  channel audiences come from the comms subsystem later (routing only).
- Reserve the **echo** model: the catalog `echo` field + the
  `social.emote.echo` setting (echo reuses the normal grammar — no
  special template). The echo *routing* (performance-to-local-room when
  an emote is remote) lands with comms; in-room v1 has performance =
  transmission, so nothing to echo yet.
- The dynamic-verb fallback resolver in command routing + typed-slot
  binding from input.
- `emote` / `:` free-form emote (normal YAML verb).
- **Moderation primitives** (tightness is load-bearing, so it's Wave 1):
  the shared `resolveExpressionPolicy(actor, channel)` gate consulted by
  `say` / `tell` / the emote path; the `free` / `strict` levels; the
  strict-mode structural rule (no `free` slot, no free-form `emote`); a
  sanitizer call site on `free` paths (stub denylist acceptable). The
  control plane is out (deferred to the moderation subsystem).
- `world.expression.emote` topic + client subscription (text rendering).
- `EmoteController` + tests: directed/non-directed × plain/custom render
  correctly to self/peers/target; NPC emote routes identically;
  unknown-non-emote verb still errors; **strict emote-only mode blocks
  `say`/`tell`/free-form `emote`/`free` slots and admits only
  literal+entity+enum output (passes with an empty denylist)**.

**Wave 2 — emoji / hybrid (Principle 3).**

- Optional `emoji` field + payload delivery.
- `social.emote.render` setting (text/emoji/both, per channel, player-
  vs-NPC source distinction).
- Client glyph rendering per setting.

**Wave 3 — honorary / entitlement gating.**

- `requires` predicate seam (the record field) + dispatch-time check +
  declined-note path.
- The badge-glyph-only-with-entitlement guarantee.

**Adjacent / future (own slate):**

- **Reactions / aggregation** — message-id surfacing, the `react` verb,
  client aggregation UI, per-user aggregation settings, tag→group maps.
  This slate ships the hook (`tags` + filterable topic); the reactions
  slate ships the machine.
- **Comms subsystem** (its own slate, [comms-slate.md](../tails/comms-slate.md)):
  conversations/channels/DMs — the *routing* that says who's in a remote
  emote's audience. Emotes ride the ESP channel and always come through;
  comms just supplies the membership.
- Entitlement *sources* (achievements / roster / enrollment that grant
  honorary emotes).
- Emote chaining / scripting, if a real need surfaces.
- **Moderation control plane** (its own slate): moderator verbs to set
  emote-only mode, scope/duration assignment, audit logging, the shared
  sanitizer implementation + denylist, and entity-name moderation. The
  emote slate ships the *enforcement primitives* these drive.

---

## What this slate does NOT cover

- **Reactions/aggregation machinery** — its own slate (the hook lives
  here; the engine does not). See Layer 4 / Q10.
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
  ([capability-magic-slate.md](../deferred-rpg/capability-magic-slate.md)).
- **Posture / physical actions that change state** — `sit`/`stand`/
  `kneel`/`lie` are the posture subsystem; emotes mutate no state.
- **Dialogue** — `say`/`tell` (`world.speech.*`) are speech, not
  emotes.
- **The comms substrate** — conversations/channels/DMs and remote
  audience-routing → [comms-slate.md](../tails/comms-slate.md). Emotes ride the
  ESP channel (no medium physics); comms only answers "who's in the
  conversation."
- **Client buffer/threading architecture beyond the gutter id** the
  reactions hook implies — general buffer redesign is out of scope.
- **A general per-message metadata/aggregation framework** beyond the
  emote `tags` hook — if a broad message-tagging system is wanted, it's
  its own design.

---

## Once shaped into formal requirements

This slate boils down to:

- `SoulMixin` (interface + composition targets), parallel to
  `VocalMixin`; the `emote()` Scene composition (self/peers/target on
  `world.expression.emote`).
- The `Emote` record shape + `EmoteGrammar` (incl. **typed slots**:
  `literal` / `entity` / `enum` / `free`); the four-permutation grammar
  with per-audience actor/target token rendering; the verb-agreement
  helper.
- Reach: emotes ride the **ESP channel** (perceived near or far, no
  gating); v1 delivers the co-present audience, remote/channel routing
  deferred to comms.
- The **echo** model: canonical ESP audience (self/target/peers) +
  optional local-room echo controlled per-end via layered defaults
  (catalog `echo` field + `social.emote.echo` setting + a rare sender
  override); echo reuses the normal grammar (no special view). Routing
  deferred to comms; the record/setting hooks are reserved in v1.
- `Emote extends Document` (`emotes` collection + `Collections` enum
  entry, no `PersistenceManager` changes), the `SoulCatalogue` singleton
  (the bootstrap-loaded write-through verb→`Emote` index), and `SoulApi`
  (the thin facade: `resolve`/`mint`/`all`).
- The dynamic-verb resolution seam in command routing (+ the
  autocomplete-subset question) and typed-slot binding from input.
- The free-form `emote` / `:` verb.
- Bootstrap: the `seeds/social/emotes.yaml` seed + `SoulApi.seed()`
  (idempotent upsert) + index creation; the ~40-emote starter roster.
- **Moderation primitives:** the shared `resolveExpressionPolicy(actor,
  channel)` gate (consumed by `say`/`tell`/emote), the `free`/`strict`
  levels, the strict-mode structural guarantee, and the sanitizer call
  sites on `free` paths (implementation + control plane deferred to the
  moderation subsystem).
- Layer 2: the `emoji` field + payload + the `social.emote.render`
  setting (per-channel, player-vs-NPC) + client rendering.
- Layer 3: the entitlement-predicate seam + dispatch gate + badge
  guarantee (source deferred).
- The Layer-4 hook only: aggregation `tags` on entries + a filterable
  topic (reactions machinery → its own slate).
- Tests gating: every render permutation; NPC parity; gated-emote
  decline; per-setting emoji serialization; unknown-non-emote verbs
  still error; **strict emote-only mode admits only literal+entity+enum
  output and blocks say/tell/free-form/`free`-slots — verified with an
  empty denylist (structural, not filter-dependent)**.

The reactions machine, the comms substrate (channels/DMs/media — the
remote reach), the entitlement sources, the moderation control plane,
and any emote chaining wait for their own work.
