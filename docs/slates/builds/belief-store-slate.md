# Belief store — the per-viewer knowledge substrate (working slate)

Working slate for the shared substrate *under* recognition,
identification, explored-map memory, and item-ID: a per-viewer model of
what each character believes about the world, distinct from the world's
objective truth. Recognition was the first realm; mapping NetHack-style
item identification and explored-map memory onto it generalized it into
this.

This is the spine. Its realms are designed in their own slates —
[recognition-slate](./recognition-slate.md),
[identification-slate](./identification-slate.md),
[map-slate](./map-slate.md) (the memory half). The
[recognition build](../../requirements/recognition-requirements.md) is
the cycle that forces this spine into existence (realms #1–2).

---

## Principle

A character's belief store is their **subjective, partial,
possibly-stale, possibly-wrong model of objective server state.** The
server holds truth; each viewer holds a thin lens over it. The unifying
axis across every realm is **belief vs. truth** — what a viewer holds
can:

- **lag** truth (your map after a wall's moved),
- be **withheld** (a disguise hides a face you know),
- be **absent** (you've not learned it yet),
- be **wrong** (a faked name, a cursed item believed uncursed).

Crucial framing: **the store is a thin annotation layer over live
referents, not a standalone dataset.** Each entry is a reference into the
world (`templatePath` / `stuffId`) plus a small "what I know" note;
the referent's actual details are read **live** at use time, never
snapshotted — which is why staleness mostly evaporates.

---

## The shape

One per-viewer keyed bag on the `Character`:

```
knowledge: Map<`${realm}:${referent}`, payload>

know(realm, referent, payload)     // learn (upsert)
recall(realm, referent): payload   // read
forget(realm, referent)            // targeted forget
forgetRealm(realm)                 // forget a whole kind
```

- **`realm`** namespaces a kind of knowledge — a naming convention, not
  a registry.
- **`referent`** is a world key: `templatePath` (durable; works for
  singletons, which is most referents) or `stuffId` (session-ephemeral).
- **payload** is thin and per-realm.

The store is **dumb CRUD.** All per-realm intelligence — triggers,
render, forget policy, client-vs-server — lives in the **consumers**,
never in a registered strategy object. No realm registry.

---

## Realm landscape

| Realm | Referent (key) | Payload | Consumer (where) | How belief fails |
|---|---|---|---|---|
| `recognition` (who) | subject `templatePath` | `knownAs` (**value**) | naming + targeting — **server** | withheld (disguise), wrong (faking) |
| `identification` (what kind) | type sig (`templatePath`+appearance) | `typeKnown` (**flag**) | naming — **server** | misID |
| `item-instance` (BUC/enchant) | the item (see keying crack) | known facets `{buc, enchant, charges}` (**flags**) | item render + verbs — **server** | believed-wrong (cursed→"uncursed") |
| `map` (where I've been) | room `templatePath` | presence (**flag**) | map UI — **client-render, server-store** | stale topology (rare) |
| `place` (this room's name) | room `templatePath` | `knownAs` (**value**) | room naming — **server** | like recognition, for rooms |
| `affect` (regard + trauma) | subject / hazard / place `templatePath` | disposition / bucket + (later) scalar | social-graph + reputation + npc-behavior — **server** | it's *opinion*, not truth |
| `watch-for` (wanted-profile) | a **feature-pattern** (not a templatePath) | resolved identity + alert | notoriety / recognition-by-description — **server** | false positive (matches the wrong person) |

Three notes on the table. **The `recognition` realm's subject includes
unique Named *items*** (artifacts — recognizing Excalibur is the same
axis as recognizing a person, renown and all), not just actors.
**`watch-for` is the one realm keyed by a feature-pattern, not a
referent** — it's the substrate run *backwards* (features → identity), a
second resolver in the naming step; see the
[reputation slate](./reputation-slate.md) for how notoriety drives it.

And **the `affect` realm is "feeling *toward* a referent," of which
`regard` (toward a person) and *anchored trauma* (dread of a hazard, of a
place, of a monster-type — Darkest-Dungeon-style) are the two flavors —
one realm, same shape.** Anchored trauma **rides recognition**: you fear
what you can identify, so a feared figure in disguise doesn't trigger
until revealed, and **forgetting *is* treatment** (the amnesia/`forget`
op clears a phobia — the DD sanitarium; heavily-reinforced affect resists
GC = a "locked" quirk). But note **trauma is a *consumer* spanning three
substrates, only one of which is the belief store:** the `affect` realm
here (anchored fears), the **Reserve** substrate (acute "composure"
meter; afflictions = conditions when it bottoms, like vitals bands), and
a **persona/traits** layer (free-floating quirks — Kleptomaniac, Brave).
Player trauma must stay **soft diegetic friction** (composure drain,
scarier rendering, shaking-hands prose), never a control-override; NPC
trauma drives the behaviour brain freely. All deferred — captured so the
`affect` realm's second consumer is on record.

---

## Payload rule: flag by default, value only for planned divergence

Default payload is a **known-flag** ("I've learned this facet"); the
actual value is **read live** off the referent. This dodges staleness
even for *changing* facets — a wand's charges decrement, you just read
live, nothing to reconcile.

A facet graduates from flag to a **stored believed-value** only when
belief must *diverge* from truth:

- `knownAs` (recognition / place) is a value because **nicknames +
  faking** are planned divergence.
- `buc` / `enchant` are flags until **misidentification** content lands;
  then the divergent ones become values.
- map presence is a flag *forever* — "visited" can't diverge.

Thin by default; thickens exactly where a real future consumer needs
belief ≠ truth, with no restructure (a field's type changes; the bag
doesn't).

---

## Keying — and the one crack

`templatePath` gives durable identity for **singletons** (avatars, named
NPCs, rooms), and the singleton-vs-generic split falls out for free:
generic clones *share* a `templatePath`, so they're inherently
type-level, not instance-level (you remember "city guards", not *that*
guard).

The crack is **non-singleton mutable instances** — most items. Fifty
longswords share `/obj/weapon/longsword`, and `stuffId` is
runtime-ephemeral, so per-instance item knowledge (the BUC/enchant of
*this* sword) has **no durable key by default.** Two resolutions:

- **Session-only** (key on `stuffId`, resets on reboot) — acceptable
  while world-*instance* persistence is itself unsolved.
- **Durable item-instance identity** (a serial id) — but that's a
  **world-state-persistence** capability, not a belief-store one.

The crack is a *dependency, not a flaw*: the spine is unchanged; it
co-arrives with item persistence + BUC content.

---

## Forgetting

A record slides a spectrum — **stranger → familiar-but-unnamed →
named** — and forgetting walks it back down. Two depths, both trivial
CRUD:

- **Partial** — clear a payload field (`knownAs`→null = "I know the
  face, can't place the name"; this *reuses* the stranger-with-history
  state — an old `firstSeen` with a null name even renders "a familiar
  face").
- **Total** — delete the record (fresh stranger next time).

Three forces push a record down:

- **Recency-pruning** — GC long-unseen records (the v1 mechanism;
  diegetically this *is* forgetting).
- **Lazy liveness-GC** — an entry whose referent no longer resolves
  (template / stuff gone) is orphaned; drop it on hydrate/access, no
  sweep.
- **Decay** (gradual fade) — v2. **Amnesia** (deliberate, instant) —
  content; targets `(realm, key)`, which is exactly why the scroll can
  hit *specific* memories, not "whatever's oldest."

Emergent and free: forgetting **competes with re-learning triggers.**
Amnesia of an absent / dark / disguised subject sticks; amnesia of
someone actively broadcasting (id-aug) or wearing a name badge refills
on the next encounter. *You can't forget someone who keeps telling you
who they are.*

---

## Triggers — many feed the one store

Learning is a set of triggers writing the same sink. There is **no
provenance tag** on the record: nothing in v1 reads "how I learned this"
(the trust/skepticism layer that eventually would is v2 — added there,
next to its reader, not speculatively now).

- **Explicit** — the `introduce` verb (self / third-party), `read scroll
  of identify`.
- **Ambient / broadcast** — the aether **id-aug** (broadcasts identity
  to attuned receivers; anonymity is the `identity.broadcast` setting),
  **visual identifiers** (badge / sigil / uniform — the sight-channel
  twin), **fame** (pre-known to all, no consent), **pre-seeded
  acquaintance** (char-gen seeds your cohort / family / mentor).
- **Overheard / lookup** — overheard use of a name, dossier / scry — v2.

The inversion this enables: in any networked, populated area, ambient
triggers make recognition **just work** (ambient-known by default), so
the manual / dramatic machinery — disguise, going dark, the wilderness
stranger — becomes the *exception*, which is exactly where it's
interesting.

(Recognition-axis trigger detail lives in the recognition requirements;
the id-aug / anonymity axes are still open — see open questions.)

---

## Querying — no datalake

The real access patterns are **point-get** (the naming step) and
**realm-scan** (the map = every `map:` key) — both trivial on an
in-memory map. Rich cross-cutting queries ("all guards I know", "nearest
room I know with a forge") **ride MQL** with belief as a *predicate* over
the already-queryable world — no bespoke engine, because the store is
references *into* that world. The one genuinely datalake-shaped need —
cross-player analytics ("how many players know NPC X") — is the separate
**OLAP / BI firehose** (a different, append-only access pattern, never
read at runtime), explicitly out of scope.

---

## BUC — the stress test (it holds)

NetHack identification maps cleanly because it's the *same two axes*:
**item-type** = the `identification` (type) realm; **item-instance**
(this object's BUC / enchant / charges) = the `recognition` (instance)
realm, applied to objects. The render weaves them exactly like people —
`"a blue potion"` → `"a potion of healing"` (type) → `"a blessed +1
potion of healing"` (instance facets) — with BUC/enchant as
**viewer-relative belief decorations in the (B) viewer-aware step** (only
the knower sees "blessed"), *not* `getPresentation` affixes. The forget
asymmetry falls out correctly: forgetting a **type** is global (all blue
potions revert), forgetting an **instance** is local. The only snag is
the keying crack above — a dependency, not a structural break. Result:
the bag carries the whole NetHack model with no rework.

---

## NPC viewers — same store, cost aligned to value

NPCs are `Character`s, so they carry the **same belief store** as players
— recognition is symmetric, no separate NPC-memory system. (The
notoriety-hunting caravan guard holding a wanted-profile *is* NPC
memory.) NPC memory is high-value: it's the substrate under greetings,
grudges, gossip, recognition-gated reactions — the personality. The
resource worry resolves on the **singleton/generic split** already in the
keying section, which lands cost *inversely* to volume:

- **Named / singleton NPC viewers** (Gus, the bartender) have a durable
  `templatePath` → they hold **durable, persisted** per-record memory.
  Few of them, and they're exactly the ones worth remembering *for*. High
  value, low volume — pay it.
- **Generic / interchangeable NPC viewers** (one of fifty guards, a
  spawned mob) share a `templatePath` → no durable identity, so their
  memory is **session-ephemeral by construction** (keyed on the throwaway
  `stuffId`, GC'd on despawn) or simply never populated. Many of them,
  near-zero cost. The wasteful case (a persistent store per mob) isn't the
  default — there's no durable key to persist it against.

**Most "NPC knowledge" isn't per-NPC at all — it's shared.** Fame,
notoriety, wanted-profiles, common reputation are stored **once on the
subject** (or a shared guild bulletin / `Group`) and *read* by every NPC,
not individually remembered. The bandit-hunting guard reads the
circulated profile + the subject's global notoriety; he keeps no personal
record. Only *genuinely personal, learned-by-this-NPC* facts go in
per-NPC memory (the bartender remembers *your* usual). This is the
human/cultural split — you personally remember friends; "everyone knows"
the famous outlaw through shared culture, not individual recollection —
and it slashes per-NPC volume for the dramatic cases to near nothing.

Lazy hydration means only **active, loaded** NPCs pay anything; dormant
ones cost zero. Even the large case (≈100 named NPCs each remembering
≈1000 players) is ~100k thin records — nothing for Mongo, pruned further
by recency. The one genuinely expensive shape ("how many NPCs know player
X") is the cross-viewer analytics already walled off as the OLAP / BI
non-goal.

Rule of thumb: **named NPCs remember (persistent, few); generic NPCs
don't (or session-only); reputation lives in shared global state every
NPC reads.** The same split that gives instance-vs-type recognition for
free gives "which NPCs deserve a memory" for free. The one thing to
watch — a beloved, long-lived, heavily-trafficked named NPC accumulating
a real store — is the intended cost (it's the NPC you most want to pay
for); if it bites, the lever is per-realm pruning, possibly tuned more
aggressively for NPC viewers than player ones.

## Persistence

Lean by construction — tiny payloads, references not copies, lazy
liveness-GC + recency-pruning bounding volume. When we come to it the
lever is "how aggressively to prune," not "how to shrink fat records."
Tuning deferred; the shape is already lean.

### Account-deletion cleanup — a platform contract, not a per-collection chore

A per-player collection (own space, cheap saves) trades away the "free"
cleanup you'd get from nesting the data on the player document — but that
"free" is an illusion that taxes *every* save (doc bloat, the 16 MB cap,
whole-doc rewrites — the `ContactsMixin` anti-precedent). Own-collection is
right; the cleanup is a **rare, cheap, indexed** operation, not a reason to
nest. Two layers, because the failure mode is **silent orphans of personal
data** (GDPR / right-to-erasure — real PII via OAuth, not just tidiness):

1. **Eager cascade** — every per-player collection keys docs by
   `viewerId`/`playerId` **indexed on it** (this store already does); account
   deletion fires the existing PM `aroundDelete` hook on the account Document,
   which runs `deleteMany({ viewerId })` per owned collection. Prompt,
   compliant, one indexed delete at a rare event.
2. **Viewer-liveness GC backstop** — the *viewer-side* analog of the
   referent-liveness GC above: a sweep purging records whose `viewerId` no
   longer resolves to a live account. Catches anything a subsystem's cascade
   forgot to wire — the one bug you can't afford with personal data.

This is **not recognition's to invent** — it's the contract of the generic
"lazily-hydrated per-player keyed working set" capability this build forces
into the persistence layer (see
[persistence-architecture-slate](../tails/persistence-architecture-slate.md)).
A collection stood up *through* that capability registers its purge by
construction, so you can't make player-keyed storage without declaring how
it's erased. The belief store **consumes** the cascade; it must only stay
cascade-ready (owner-keyed + indexed — it is). Same rails clean up NPC viewer
data (keyed by the NPC's `templatePath`; content-deletion or referent-GC
collects it; generic NPCs never persist).

---

## Open questions

1. **id-aug axes** — reception = receiver attunement (so unattuned
   zones/populations revert to manual) vs. innate? disguise =
   orthogonal (aether and visual are independent layers) vs. an
   aether-pierces-the-hood "received-ID" flag? *Leaning attunement +
   orthogonal; unconfirmed.*
2. **Amnesia content in v1** — the symmetric thin trigger on the forget
   path (mirroring `read scroll of identify` on the learn path) vs.
   later content.
3. **Durable item-instance identity** — the keying crack; defer with
   item persistence + BUC content.
4. **`place` realm** — its own realm vs. folding into
   recognition-applied-to-rooms + map.

---

## What this slate does NOT cover

- **Per-realm content / triggers** — each realm's own slate
  (recognition, identification, map). This slate is the shared spine
  only.
- **Misidentification / nicknames / faking / decay** — the divergence +
  fading content; v2. The spine is forward-shaped for them via the
  flag→value rule.
- **Cross-player analytics** — the OLAP / BI firehose; a separate
  subsystem on the dispatch event spine.
- **World-instance persistence** — the durable item-instance identity
  the BUC keying needs is a persistence capability, designed elsewhere.

---

## Cross-references

- **Realms:** [recognition-slate](./recognition-slate.md),
  [identification-slate](./identification-slate.md),
  [map-slate](./map-slate.md) (memory half),
  [social-graph-slate](./social-graph-slate.md)
- **Consumers:** [npc-behavior-slate](./npc-behavior-slate.md) (NPC
  viewers reading their memory to drive greetings / grudges / gossip)
- **Requirements:**
  [recognition-requirements](../../requirements/recognition-requirements.md)
  (realms #1–2 — the build that forces this spine)
- **Subsystems:** [mql](../../subsystems/mql.md) (belief as a query
  predicate), [augmentation](../../subsystems/augmentation.md) (the
  id-aug), [persistence](../../subsystems/persistence.md) (the record
  collection + the deferred item-instance identity),
  [perception](../../subsystems/perception.md) (the visibility gate the
  naming step calls)
