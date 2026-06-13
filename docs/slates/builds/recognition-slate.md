# Recognition slate (working doc)

Working slate for the per-viewer perception of identity — who
the viewer recognizes, who's a stranger, who's disguised, and
how the world's display names compose around all of that. The
core mechanism that recognizes Bob as Bob (or as "a hooded
figure," or as "the tall stranger from yesterday").

This is the substrate. Three sibling slates build on it:

- [docs/slates/social-graph-slate.md](../builds/social-graph-slate.md) —
  buckets, notifications, attention-management rendering.
- [docs/slates/comms-slate.md](../tails/comms-slate.md) — the
  trust-tiered moderation concern now lives in the comms slate's
  moderation section, built on recognition + buckets.
- [docs/slates/identification-slate.md](../builds/identification-slate.md) —
  the parallel pattern for items.

See also:

- [docs/roadmap.md](../../roadmap.md) — DescribeApi v2 entry. This
  slate is the concrete design for that work.
- [docs/subsystems/embodiment.md](../../subsystems/embodiment.md) —
  disguise as a Wearable mixin with a perceptual shadow.
- [docs/subsystems/perception.md](../../subsystems/perception.md) —
  viewer-aware-query pattern. Recognition is the hardest
  per-viewer state to date.
- [command-routing.md § Affordance attribution](../../subsystems/command-routing.md)
  — recognition's trigger verbs can be afforded by different source
  objects (a "face memory" skill, a "scrying mirror" instrument, a
  "facial-recognition HUD" implant). Each is just a source of a
  different class landing through `pushCommandSource`; the source
  object — not a category enum — decides how the read renders.
- [docs/adjoining-systems.md](../../adjoining-systems.md) — this
  slate graduates entry #5.

---

## Principle

Recognition is **per-viewer state about other actors**. The
target Stuff isn't different across viewers; how each viewer
perceives it is. Three concerns interlock:

1. **Recognition** — has the viewer met the target? Do they
   know the name?
2. **Disguise** — is the target actively obscuring identity?
3. **Salient features** — what's noticeable about the target
   to a viewer who doesn't recognize them?

These compose into the **DescribeApi v2 pipeline**, which is
the framework's answer to "what does viewer V see when
perceiving target T?"

---

## The DescribeApi v2 pipeline

> **Naming / home (refinement below):** this pipeline is homed on
> `PerceptionApi.describe(viewer, target)`; the name "DescribeApi" **retires**,
> its self-presentation half becoming the `Stuff.getPresentation()` instance
> method. See *Self-presentation vs. viewer-perception* below for the A/B
> split and where each pipeline step lands.

Every perception-rendering call routes through this pipeline:

```
1. Visibility gate — is T perceivable to V?
   • LightApi (light propagation)
   • concealment / Stealthing
   • containment-scope reachability
   → if no: return null

2. Resolve T's presented identity
   • collect active disguise effects on T
   • compute: T's true features minus disguise-covered ones
   • if disguise overrides face: identity is masked behind
     disguise's appearsAs

3. Recognition lookup
   • V.knownPeople.get(T)
   • If T is in store AND not disguised beyond recognition:
       use stored knownAs
   • Else: generate salient-feature description from
     uncovered features

4. Bucket-keyed verbosity (attention-management)
   • V.socialGraph determines T's bucket(s)
   • Bucket's display policy shapes the rendering:
       full name, feature-string, count-only, etc.

5. Decoration
   • state tags: wielded, sleeping, sitting, mounted
   • status flags: poisoned, glowing, on fire
   • posture

6. Combine: identity + bucket-policy + decoration → MML
```

Step 4 is where social-graph integration happens; the bucket
substrate is detailed in [social-graph-slate.md](../builds/social-graph-slate.md).

**Globbable contributes to the identity side**, not decoration.
When the target carries the `Globbable` mixin, the count enters the
noun phrase produced by step 2/3 ("30 coins" vs "a coin"), and step
5's decorations wrap that identity intact ("30 burning coins", not
"burning 30 coins"). The mixin exposes `getQuantity()` + the host's
singular `getDisplayName()` and optional `getPluralForm()`;
pluralization runs through `GrammarApi`. Globbable doesn't know
about viewer state — DescribeApi v2 negotiates recognition,
perception, and bucket-verbosity, then asks Globbable for the
data it needs to build the count-bearing identity. See
[subsystems/glob.md § Display rendering](../../subsystems/glob.md#display-rendering--describeapiformatname).

---

## Self-presentation vs. viewer-perception — `getPresentation()` and the DescribeApi split

"DescribeApi" conflated **two concerns**. Splitting them homes each correctly
("polymorphic step on the class, orchestration on the Api" — cf.
`Zone.lookupField` vs `ZoneApi`):

- **(A) Self-presentation** — *"what's this object's display string?"* Its
  name (`Named`) **or** `shortDescription`, + **status** (if it's a
  `StatusMixin` agent), + **viewer-independent** affixes (wielded, count,
  posture). The object describing *itself*; polymorphic over its mixins; the
  contract surface other Stuff wants — and what most of the ~76 legacy
  `getDisplayName` callers actually need (a label for a message, not a
  perception negotiation). → **an instance method on `Stuff`:
  `getPresentation()`** (renamed from `getDisplayName` — "Name" wrongly
  implied `Named`, but the string is name-*or*-shortDescription + status +
  affixes). **No `viewer` param** — viewer-relativity lives wholly in (B).

- **(B) Viewer-perception** — *"what does viewer V see perceiving target
  T?"* Recognition lookup, disguise resolution, bucket verbosity — a stateful
  negotiation between two parties. → **the Api**, entry point
  **`PerceptionApi.describe(viewer, target)`** (the pipeline above). It calls
  `target.getPresentation()` as its baseline, then layers the viewer-relative
  steps.

So **the name "DescribeApi" retires**: self-presentation → `getPresentation()`
on Stuff; the viewer pipeline → `PerceptionApi.describe`.

**How the pipeline steps split across A/B:**

| Pipeline step | Home |
|---|---|
| 2. presented identity (disguise-applied) | `getPresentation()` baseline; disguise **shadows it** (target state — viewer-independent) |
| 3. recognition lookup (known vs salient) | **(B)** PerceptionApi — viewer-relative |
| 4. bucket verbosity | **(B)** PerceptionApi — viewer-relative |
| 5. decoration | **splits** — viewer-independent tags (wielded, count, posture, status) ride `getPresentation()`; viewer-relative collapsing (bucket counts) is (B) |

**Affix mechanism.** The viewer-independent decorations compose via the
**`MarkupAugmenter` pattern** — a `static`-on-mixin contributor collected by a
`MixinApi` walker (mirroring `getAllMarkupAugmenters`), each nullable and
ordered (prefix count, postfix state). `Globbable`'s count is one such
contributor on the **identity side** (decorations wrap it intact — "30 burning
coins"), so the old `DescribeApi.formatName` **folds into `getPresentation()`**
as a Globbable affix rather than a standalone method.

### `StatusMixin` — the settable activity-status (new)

The one genuinely new piece. An **agent** mixin holding a **settable
activity-status** string — the second half of the simple public surface
**`{{name}} {{status}}`** (e.g. "Gus, **the crossing guard, watching the empty
road**"). It feeds the decoration slice of `getPresentation()`.

- **Settable three ways:** a player **`status`** command; an NPC's **behavior
  brains** at runtime (the `idles` / `greets` brains set it as a side effect —
  idle → "watching the empty road," greeting → "seeing a newcomer across");
  or a **static default** for the many NPCs whose status never changes.
- **Distinct from the slate's "status flags"** (step 5: poisoned / glowing /
  on fire), which are **derived** from effects/conditions. StatusMixin's
  status is **authored/set**. Both land in decoration, different sources —
  don't merge them into one field.
- **The value may grow structured** (a Liquid template against behavior
  context) without changing the dumb **Name + Status** public API. The seam
  stays simple; the implementation needn't.

This is a near-term, buildable refactor (the `getPresentation()` rename + the
affix walk + `StatusMixin`) that the larger viewer-perception pipeline (B)
then sits on top of.

---

## The recognition store — viewer-side

```ts
interface RecognitionRecord {
  knownAs: string;          // 'Bob' or 'the tall stranger I saw yesterday'
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  bucket?: string;          // social-graph integration
  trustTier?: number;       // comms-slate moderation integration
  notes?: string;           // optional richer context
}

viewer.knownPeople: Map<Stuff, RecognitionRecord>
```

Crucial nuance: **strangers are tracked too.** First sight of an
unknown actor creates a record with `knownAs` derived from
salient features. Repeat encounters update the existing record
(`lastSeen` advances; `notes` may enrich). When introduction
finally happens, the existing record's `knownAs` upgrades from
`'the tall stranger I saw yesterday'` to `'Bob'`.

This means **same-Stuff = same record**, regardless of how many
times encountered. The viewer always recognizes "the same
person I saw before" even before learning their name.

### What populates the store

| Trigger | Effect |
|---|---|
| First perception of unknown target | New record; `knownAs` from salient features |
| Repeat perception | Existing record's `lastSeen` updated |
| Introduction (sender says "I'm Bob") | `knownAs` upgraded to introduced name |
| Third-party identification (v2) | Trusted source's identification propagates |
| Voice/scent recognition (v2) | Different sensory channel triggers update |

For v1: explicit introduction + repeat-perception. Defer
third-party and multi-modal.

### Persistence

This store grows large for long-term players. Persistence
considerations:

- Per-record write granularity (not whole-store fsync).
- Lazy hydration — load records on first reference per session.
- LRU in-memory caching with write-through to disk.
- Optional pruning policy for years-old untouched records.

The current Document/Stuff split persists recognition records on
the `Document` track (CRUD via `PersistenceManager`), which is
whole-document; recognition needs finer access patterns. This
is flagged for the persistence-layer follow-on.

---

## Disguise — Wearable with a perceptual shadow

A Disguise capability composes onto Wearables:

```ts
interface DisguiseEffect {
  appearsAs: string;             // 'a hooded figure'
  disguiseStrength: number;      // 0..1; thoroughness
  appliesToFeatures: string[];   // 'face' | 'body' | 'voice' | 'all'
}
```

Examples:

| Item | appearsAs | Covers |
|---|---|---|
| Hood | "a hooded figure" | face |
| Heavy cloak | "a cloaked figure" | face, body |
| Magic illusion | "a tall human in fine robes" | all |
| Guard uniform | "a guard" | (overlay, not full disguise) |

While worn, the Disguise Wearable shadows the wearer's
`getPresentedIdentity()` — the method DescribeApi v2 calls in
step 2. The shadow framework runs through the call-security
pipeline already shipped.

Multiple disguise items compose: hood + cloak stacks
feature-coverage masks (face from hood; body from cloak; voice
from neither, so still recognizable by speech).

Recognition gating: if face is covered, viewers who recognize
by face cannot fire recognition. (V2 voice/scent recognition
bypasses face disguise — see open questions.)

---

## Salient-feature description generation

For unrecognized (or beyond-recognition-due-to-disguise) targets,
DescribeApi v2 step 3b generates a description from the target's
visible data:

```ts
function describeSalientFeatures(target, coveredFeatures): string {
  const parts = [];

  // Body plan + species (unless body covered)
  if (!coveredFeatures.has('body'))
    parts.push(speciesDescriptor(target));

  // Most distinctive Wearable
  const visible = mostNotableWearable(target);
  if (visible) parts.push(`in ${visible.shortDescription}`);

  // Wielded (if visible)
  const wielded = target.getOccupant('hand:right');
  if (wielded) parts.push(`carrying ${wielded.shortDescription}`);

  // Distinctive features (scars, eye color, etc.)
  const features = target.distinctiveFeatures ?? [];
  if (features.length) parts.push(`with ${features.join(', ')}`);

  return parts.join(', ');
}
```

Output: *"a tall human in a black cloak, carrying a longsword,
with a scar through one eyebrow."*

Authors curate `distinctiveFeatures` per NPC for vividness.
Player avatars populate from character creation. Salient features
are stable per-target — every viewer sees the same features (it's
the recognition state that varies).

---

## MQL handling for unrecognized actors

Players need to refer to strangers without names:

- `talk to tall-stranger`
- `talk to red-cloaked-stranger`
- `give coin to first-stranger`

The salient-features description generates feature-keyed handles
that MQL resolves. This probably works with existing MQL grammar
(filter expressions in `[]`, predicate registry); confirmed
during requirements phase.

Player-set nicknames (v2): a `name X as Y` verb that updates the
viewer's recognition record's `knownAs`. Substrate already
supports this; verb / UX deferred.

---

## Worked scenarios

### Scenario A — first meeting, then introductions

```
> look
You see:
  Sarah is at the bar.
  A tall human in a black cloak, carrying a longsword, is by
  the door.
  A short dwarf with a red beard is sitting at the table.

> say "Hello, I'm Mara."
[IntroductionEvent fires; listeners update knownPeople: Mara → 'Mara']

> [Sarah says "I'm Sarah."] [Mara records: Sarah → 'Sarah']
> [the tall human says "I'm Bob."] [Mara records: Bob → 'Bob']

> look
You see:
  Sarah is at the bar.
  Bob is by the door.
  A short dwarf with a red beard is sitting at the table.
```

Bob and Sarah recognized. Dwarf still rendered by salient
features.

### Scenario B — Bob puts on a hood

```
> [Bob wears the hood; DisguiseEffect activates, covers 'face']

> look
You see:
  Sarah is at the bar.
  A hooded figure is by the door.
  A short dwarf with a red beard is sitting at the table.
```

Bob's recognition record persists; the disguise prevents the
lookup from connecting "this presented appearance" to "Bob."
When Bob removes the hood, recognition fires again.

### Scenario C — busy room with social buckets

```
> [Mara has bucket-rules: friends=highlight, classmates=show,
>  others=count]

> look
You see your friend Bob and your classmate Sarah by the door.
The dwarf with the red beard is at a corner table.
(13 other students are here, plus 47 others.)
```

Bucket-keyed verbosity (DescribeApi step 4) collapses unknown
actors into counts. The 13/47 are MQL-queryable. See
[social-graph-slate.md](../builds/social-graph-slate.md) for the
bucket mechanism.

---

## What this stresses for existing slates

### DescribeApi v2 (roadmap)

This slate **IS** the design for DescribeApi v2's recognition /
disguise composition. Roadmap entry can reference here as the
target.

### Perception subsystem

`PerceptionApi.describe(viewer, target)` is the entry point.
Composes through the pipeline; consults recognition store,
disguise shadows, salient-features. Already aligned with the
viewer-aware-query pattern.

### Embodiment slate

Disguise as Wearable adds one mixin (`Disguise`) and the
shadow-on-`getPresentedIdentity` mechanism. Small extension to
the affordance-mixin set.

### Social graph (sibling slate)

Step 4 of the pipeline reads bucket data. Recognition stores
bucket assignments on the record (or viewer's social-graph
component holds the assignment). Either works; lean storing
on recognition record for locality.

### Persistence framework

Long-term recognition state at scale stresses the current
whole-document `Document`-track shape. Flagged for
persistence-layer follow-on.

### MQL

Feature-based stranger references (`tall-stranger`,
`red-cloaked-stranger`) need MQL to resolve them. Probably
works with existing grammar; confirm in requirements.

---

## Open questions

1. **Recognition triggers v1** — explicit introduction +
   repeat-perception, both on. Voice/scent triggers defer.
2. **Strangers tracked across encounters** — yes (lean).
   Same-Stuff means same record.
3. **Memory decay** — defer; v1 persistent.
4. **Disguise sophistication** — feature-by-feature coverage
   (face/body/voice as separate). v1 ships hood + heavy cloak.
5. **Voice/scent recognition** — defer to v2.
6. **Salient-feature generation** — algorithmic with author-
   tunable templates per species/Wearable.
7. **Player-set nicknames** (`name X as Y`) — substrate ready;
   verb defer to v2.
8. **MQL feature-references** — confirm during requirements;
   flag if grammar needs extension.
9. **NPC recognition** of players — symmetric. NPCs have the
   same `knownPeople` shape; behavior layer reads it for
   greetings, gates, gossip.
10. **Pets / animals** with recognition — opt-in per species
    (dogs and horses do; insects don't).
11. **Multi-viewer perception of an introduction** — yes,
    propagates to all listeners in earshot.
12. **Faking identity** ("I'm Carl") — recorded as Carl in v1;
    suspicion mechanic v2.
13. **Recognition by description match** — guard told to look
    for "tall human with a scar" later sees one. Behavior-layer
    territory; not framework substrate.
14. **Cross-character recognition** for one player's avatars —
    if a player has multiple avatars, do their recognition
    stores share? Lean per-avatar; player-level recognition is
    a separate concept (account-level).

---

## Build order

**Wave 1** — substrate.

- `RecognitionRecord` + `viewer.knownPeople: Map` shape.
- `RecognitionApi` (`recognizes`, `knownAs`, `record`,
  `introduce`).
- `IntroductionEvent` fired by `say` controller; listeners
  record.
- DescribeApi v2 pipeline (5 steps, no bucket-verbosity yet).

**Wave 2** — disguise.

- `Disguise` mixin on Wearable.
- `DisguiseEffect` shadow on `getPresentedIdentity`.
- First content: hood, heavy cloak.

**Wave 3** — salient features + MQL integration.

- `describeSalientFeatures` algorithm.
- Author-tunable per-species templates.
- `distinctiveFeatures` field on character creation.
- MQL feature-keyed handles for unknown actors.

**Wave 4** — bucket-keyed verbosity (post social-graph slate).

- DescribeApi v2 step 4: bucket rendering policy.
- Counts / aggregation for unbucketed strangers.

**Adjacent / future**:

- Voice/scent recognition (cross-cuts sound slate).
- Player nicknames.
- Memory decay.
- Recognition-by-description-match (NPC behavior layer).

---

## What this slate does NOT cover

- **Buckets / friends / foes** — social-graph slate.
- **Trust-tiered moderation** — comms slate (moderation section).
- **Item identification** — identification slate (parallel
  pattern).
- **NPC behavior** that consumes recognition state (gates,
  gossip, greeting). Behavior-layer territory.
- **Multi-account / multi-character recognition** sharing.
- **Persistence-layer redesign** for fine-grained record
  access. Flagged but not designed here.
