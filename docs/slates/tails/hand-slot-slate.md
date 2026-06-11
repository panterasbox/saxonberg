# Hand-slot redesign slate (working doc)

Working slate for revisiting the biped body-plan's hand-slot
design. The current shape works for v1 content but has conceptual
tension that will bite as content authoring picks up. This slate
catalogs the problem, sketches candidate redesigns, and parks the
question for a future MR.

This is a **deferred** concern — flagged during locomotion-plan
review but explicitly out of locomotion MR scope. Belongs to the
embodiment substrate, not locomotion.

See also:

- [docs/subsystems/embodiment.md](../../subsystems/embodiment.md) —
  current shape (Wearable + Wieldable, slotClaims, "Wearable +
  Wieldable overlap")
- [docs/subsystems/slot.md](../../subsystems/slot.md) — `Slotted` /
  `Slottable` substrate, `accepts` field on `SlotSpec`
- `seeds/lib/body-plans/biped.yaml` — current biped declaration

---

## Current state

Biped's hand-related slots (from
`seeds/lib/body-plans/biped.yaml`):

```yaml
- { name: hands,          accepts: WearableMixin }   # pair-slot for gloves
- { name: 'hand:left',    accepts: WieldableMixin }  # single, wielded
- { name: 'hand:right',   accepts: WieldableMixin }  # single, wielded
- { name: 'finger:left',  accepts: WearableMixin }   # ring slot
- { name: 'finger:right', accepts: WearableMixin }   # ring slot
```

How it works today:

- **Gloves** (Wearable, pair-shaped) claim the single `hands` slot
  via `Wearable.slotClaims[biped] = ['hands']`.
- **Swords / shields / wands** (Wieldable) claim one of
  `hand:left` / `hand:right`.
- **Gauntlets** (composes Wearable + Wieldable) declare each side's
  `slotClaims` separately: the Wearable side claims `hands`, the
  Wieldable side claims `hand:left` (or wherever). The verb (`wear`
  vs `wield`) selects which side fires. Both can coexist because
  the slot names are disjoint — the substrate isn't modeling "same
  hand, two layers"; it's modeling "two unrelated slots that happen
  to be on the same actor."

For *typical* content (pair-of-gloves, sword-in-right-hand,
shield-in-left), the substrate gets the right answer. The tension
shows up at the edges.

---

## The four tensions

### 1. Asymmetry between Wearable and Wieldable

The same physical region appears as:

- One pair-slot (`hands`) for the Wearable use
- Two singular slots (`hand:left`, `hand:right`) for the Wieldable use

No principle dictates the shape difference. It's "gloves come in
pairs; weapons come in singles" — an authoring convenience
projected onto the slot vocabulary. The substrate's `SlotSpec`
shape doesn't actually care about plural vs singular; the
asymmetry is content-authoring intuition, not type-system
enforcement.

### 2. Single-hand wearables don't fit

The current shape supports:

- A pair of gloves → `hands` slot. ✓
- A single ring on left hand → `finger:left` slot. ✓ (separate
  finger-slot machinery)
- A single sword in right hand → `hand:right` slot. ✓

But it does *not* support:

- A single fingerless glove only on the right hand → no slot
- A wrist-mounted gadget only on the left wrist → no slot
- An asymmetric magical gauntlet only on the off-hand → no slot
- A heater shield strapped to the forearm (worn, not wielded) →
  no slot

A new `wrist:left` / `wrist:right` slot pair could fix the wrist
case, but the broader "single-hand wearable" category has no
home — the only Wearable hand-slot is `hands` (pair).

### 3. Same physical body part, three slot names

A biped's left hand is *one piece of anatomy* that appears in the
slot vocabulary as part of `hands`, `hand:left`, and `finger:left`
simultaneously. The slot system represents these as independent
slots that don't know about each other. That's compositionally
convenient (you can author each independently) but conceptually
noisy.

When future content asks "what's currently on this actor's left
hand?" the answer requires scanning three slots and reasoning
about which one means what.

### 4. Worn-and-wielded-on-same-hand is accidental, not modeled

A knight wearing a gauntlet AND wielding a sword on the same
physical hand: works today *because* the gauntlet's Wearable side
claims `hands` (the pair-slot) while the sword's Wieldable side
claims `hand:right` (the singular). The two claims happen to be
disjoint slots; both slots can be occupied; no conflict.

But the substrate isn't *modeling* layered occupation. It's
modeling two unrelated slot occupations that we observe (with
satisfaction) co-occur on what humans recognize as the same body
part. If we later wanted to gate "you can't wear a thick mitten
AND wield a delicate stylus on the same hand" — which is a real
constraint — the substrate has no way to express it. The two
slots are blind to each other.

---

## Design space — three candidate redesigns

### Option A — Per-hand slots accept a mixin union

Drop the `hands` pair-slot. Each hand is one slot that accepts
either Wearable or Wieldable items. A glove on one hand fills the
slot; a sword on the same hand fills the slot; mutually exclusive
on a per-hand basis. Pair-gloves claim both hands via
`slotClaims = [hand:left, hand:right]`.

```yaml
slots:
  - { name: 'hand:left',  accepts: [WearableMixin, WieldableMixin] }
  - { name: 'hand:right', accepts: [WearableMixin, WieldableMixin] }
```

(Implies a substrate change: `SlotSpec.accepts` becomes
`string | string[]` instead of just `string`. Or introduce a
shared umbrella mixin — see Option C.)

**Pros**:

- Symmetric: one slot shape per hand
- Single-hand wearables fit naturally (single glove → one slot)
- Same physical body part = same slot name (cleaner mental model)

**Cons**:

- Loses worn-AND-wielded coexistence: you can't wear a gauntlet
  AND wield a sword on the same hand because the slot is taken
- Implies broadening `SlotSpec.accepts` semantics (array-of-mixins
  vs single string) — a substrate change with ripple effects
- Pair-gloves need to author multi-slot claims; OK but slightly
  more verbose

**Worked examples under Option A**:

- Pair of gloves: `Wearable.slotClaims[biped] = ['hand:left', 'hand:right']` ✓
- Sword: `Wieldable.slotClaims[biped] = ['hand:right']` (or
  resolved at wield-time) ✓
- Gauntlet worn AND wielded: ✗ can't — same slot
- Single glove: `Wearable.slotClaims[biped] = ['hand:left']` ✓

### Option B — Layered slots per hand

Each hand has *two* slots: an inner "worn" layer and an outer
"held" layer. Glove fills the worn layer; sword fills the held
layer; both can coexist on the same hand.

```yaml
slots:
  - { name: 'hand:left:worn',    accepts: WearableMixin }
  - { name: 'hand:left:held',    accepts: WieldableMixin }
  - { name: 'hand:right:worn',   accepts: WearableMixin }
  - { name: 'hand:right:held',   accepts: WieldableMixin }
```

**Pros**:

- Honest about physical layering — gauntlet + sword on same hand
  legitimately occupy distinct layered slots
- Supports single-hand wearables (worn layer on one hand)
- Symmetric per hand
- Future "you can't wear thick mittens AND wield a delicate
  stylus" constraint becomes expressible (cross-layer interaction
  predicate on the slot pair)

**Cons**:

- Doubles the hand slot count (4 hand slots instead of 3)
- Slot names get longer (`hand:left:worn`)
- Pair-gloves now claim two `:worn` slots; one-handed weapons claim
  one `:held` slot — verbose claims
- The colon-positional naming convention (`hand:left:worn`) deviates
  from the existing two-segment shape (`hand:left`, `mount:1`)

**Worked examples under Option B**:

- Pair of gloves: `Wearable.slotClaims[biped] = ['hand:left:worn', 'hand:right:worn']` ✓
- Sword: `Wieldable.slotClaims[biped] = ['hand:right:held']` ✓
- Gauntlet worn AND wielded:
  Wearable side claims `['hand:left:worn']`, Wieldable side claims
  `['hand:left:held']` — two distinct slots, no conflict ✓
- Single glove: `['hand:right:worn']` ✓

### Option C — Shared `Handheld` umbrella mixin

Introduce a base mixin `HandheldMixin` that both `WearableMixin`
(for hand-wearables) and `WieldableMixin` extend (or compose).
Each hand slot accepts `HandheldMixin`. Items that go on hands
implement Handheld via one of the two paths.

```yaml
slots:
  - { name: 'hand:left',  accepts: HandheldMixin }
  - { name: 'hand:right', accepts: HandheldMixin }
```

**Pros**:

- Symmetric per hand (one slot, one accepts)
- Substrate accepts a single mixin name (no array-of-accepts
  change — minimal substrate ripple)
- Future hand-specific affordances (a "grip" mixin, a
  "finger-holding" mixin) extend HandheldMixin naturally
- Type-safe: only items declaring themselves Handheld can occupy a
  hand slot; a torso-Wearable can't be miscategorized

**Cons**:

- Adds another mixin layer; bigger refactor than Option A
- Existing Wearable / Wieldable items need to compose Handheld too
  (or have it declared as a prerequisite in their mixin chain)
- Still loses worn-AND-wielded coexistence on same hand (one slot
  per hand)
- Doesn't solve the conceptual "same body part, multiple slots"
  problem — `hand:left` is still ONE slot per hand; the layered
  case (gauntlet + sword) still doesn't fit
- May need an *additional* layered shape on top of this for the
  rare worn-AND-wielded case

### Lean (working)

I lean **Option B** (layered slots) — it's the only candidate that
honestly models the physical layering, supports every observed
content case, and makes future cross-layer constraints expressible.
The slot-count growth (3 → 4) is small; the colon-three-segment
naming is a minor convention extension.

Option A is appealing for symmetry but breaks the
gauntlet-and-sword case, which is real content (medieval armor,
fantasy paladin, etc.).

Option C is a half-step toward A — solves the type-safety issue
but doesn't resolve the layering question.

---

## Open questions

1. **Does worn-AND-wielded-on-same-hand actually matter?** If v1
   and near-future content has no gauntlet-and-sword case, Option
   A is the simplest fix. If knights / paladins / fantasy gear is
   meaningful content, Option B is required.
2. **Are wrists distinct from hands?** Currently no wrist slots
   exist. Bracers (worn) and vambraces (worn) belong to wrists,
   not hands. Adding `wrist:left` / `wrist:right` Wearable slots
   might be an independent fix that reduces pressure on the
   hand-slot question (single-hand wearables go on wrists, not
   hands).
3. **Fingers vs. hands**: rings live in `finger:left` /
   `finger:right`. Should there also be `finger:left:1`,
   `finger:left:2`, etc., per finger? (Multiple rings per hand.)
   That's a separate "how granular do digit slots go" question.
4. **Body-plan extensibility**: a tentacle-bearing race has slots
   like `tentacle:1` through `tentacle:N`. Do those follow the
   layered shape too? (`tentacle:1:worn`, `tentacle:1:held`?)
   Probably yes if Option B; consistency matters across body
   plans.
5. **Migration cost**: every authored Wearable / Wieldable's
   `slotClaims` would need updating. Currently a small content
   set; do this before content authoring ramps up.
6. **Validator impact**: `mustBeWearable` / `mustBeWieldable`
   command validators stay the same — they're item-type checks,
   not slot checks. The slot-side `accepts` change is independent.

---

## What this slate does NOT cover

- The `finger` slot vocabulary (rings, etc.) — separate question.
- Non-hand wearables (head, torso, etc.) — not affected.
- The `Wearable.slotClaims[bodyPlanPath]` shape — unchanged across
  all three options; the *values* in `slotClaims` change, but the
  field's shape doesn't.
- Locomotion verbs / modes — entirely orthogonal.
- Tentacle / non-biped body plans — flagged as open question #4.

---

## Suggested next step

If picking this up as an MR:

1. Resolve open questions #1 (gauntlet-and-sword priority) and #2
   (wrists as distinct).
2. Pick Option A vs B (informed by #1's answer).
3. Substrate change: if Option A, extend `SlotSpec.accepts` to
   accept `string | string[]`. If Option B, no substrate change —
   just slot vocabulary growth.
4. Update body plan seeds (biped first; cascade to quadruped,
   sessile, future plans).
5. Update existing Wearable / Wieldable item content with new
   `slotClaims` values.
6. Update `docs/subsystems/embodiment.md` (the "Wearable +
   Wieldable overlap" section reframes around layered slots or the
   simpler mutual-exclusion shape).
7. Tests: every Wearable / Wieldable test that asserts slot names
   needs the new vocabulary.

Estimated scope: medium-sized substrate-and-content MR. Smaller
than embodiment v1 (which built the slot machinery); bigger than
locomotion (which only adds modes + verbs without restructuring
existing data).
