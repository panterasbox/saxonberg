# Adjoining systems (working doc)

A scoped catalog of physics-and-perception subsystems we haven't
yet drafted, but that bear on the embodiment + locomotion slates
already in flight. Each one is the kind of "stress test" we did
when locomotion caught the passthrough-mode issue and the
vehicular-mode gap.

This is a navigation doc, not a slate. Each entry is short — what's
missing, what it stresses in the existing design, and which other
entries it pulls on. Each can graduate into its own slate when we
take it up.

Ordered by priority — most foundational gaps first, peripheral
nice-to-haves later. Priority is reviewable, not load-bearing;
reorder as judgment shifts.

See also:

- [docs/subsystems/slot.md](./subsystems/slot.md),
  [embodiment.md](./subsystems/embodiment.md),
  [posture.md](./subsystems/posture.md),
  [conveyance.md](./subsystems/conveyance.md) — slot substrate,
  body-side affordances, posture, conveyance (shipped).
- [docs/slates/locomotion-slate.md](./slates/locomotion-slate.md) — mode
  singletons, verb controllers, four consumer dives (traps,
  pathfinding, detection, validation).
- [docs/slates/mixin-slate.md](./slates/mixin-slate.md) — broader mixin slate;
  some entries here are deferred from there.

---

## Priority order

Tier 1 — highest leverage; likely to surface real holes in current
slates:

1. [Time and sustained actions](#1-time-and-sustained-actions-graduated) — **GRADUATED to [activity-slate.md](./slates/activity-slate.md)**
2. [Sound propagation as a physics channel](#3-sound-propagation-as-a-physics-channel-graduated) — **GRADUATED to [sound-slate.md](./slates/sound-slate.md)** (also spun out the cross-cutting [subsystems/quantities.md](./subsystems/quantities.md), shipped)
3. [Collisions, blocking, and pushing](#2-collisions-blocking-and-pushing-graduated) — **GRADUATED to [collision-slate.md](./slates/collision-slate.md)** (also spun out [design-philosophy.md](./design-philosophy.md))
4. [Recognition, disguise, and strangers](#5-recognition-disguise-and-strangers-graduated) — **GRADUATED to [recognition-slate.md](./slates/recognition-slate.md)** (also spun out [social-graph-slate.md](./slates/social-graph-slate.md), [communication-policy-slate.md](./slates/communication-policy-slate.md), [identification-slate.md](./slates/identification-slate.md))

Tier 2 — extends established patterns; can land after Tier 1
without churn:

5. [Scent and persistent traces](#4-scent-and-persistent-traces)
6. [What's actually visible in a room](#6-whats-actually-visible-in-a-room)
7. [Memory of observed events](#7-memory-of-observed-events)
8. [The activity layer](#10-the-activity-layer)

Tier 3 — peripheral / further-out / forcing-function for content:

9. [Multi-actor coordination](#8-multi-actor-coordination)
10. [Persistent location state](#9-persistent-location-state)
11. [Heat as a physics channel](#11-heat-as-a-physics-channel)
12. [The pedagogical seam](#12-the-pedagogical-seam)

(Numbering preserves the order in which these were first surfaced
in conversation, for cross-reference. The priority tiers above are
the working order.)

---

## 1. Time and sustained actions — GRADUATED

**Status**: graduated to its own slate at
[docs/slates/activity-slate.md](./slates/activity-slate.md). The activity
framework, engagement-slot model for concurrent activities,
cancel semantics, and transaction-style completion validation
all live there. Forward-compatibility with isolation noted;
runtime constraints captured separately in
[docs/runtime-model.md](./runtime-model.md).

Original framing kept here for cross-reference:

Every verb in the design today is atomic — `walk west` happens in
one tick, slot occupancy changes immediately, traps fire at
endpoints. But real movement has duration; climbing a 100ft cliff,
swimming a wide river, sneaking across a long room are not single
ticks.

**Stresses**: locomotion slate's `Mobile.traverse(target, mode)`
(does it become an `Activity` that starts, advances, completes, can
be interrupted?); embodiment slate's slot occupancy (mid-traversal,
which slot does the actor occupy?); detection (sneaker is detectable
mid-corridor, not just at endpoints); trap subsystem (when does the
trap fire — start, completion, continuous risk?); pathfinder (cost
becomes time, ETA is meaningful).

**Pulls on**: #2, #3, #4, #8, #10. This was the most leveraged
single conversation; downstream slates now consume the activity
framework's hooks.

---

## 2. Collisions, blocking, and pushing — GRADUATED

**Status**: graduated to its own slate at
[docs/slates/collision-slate.md](./slates/collision-slate.md). The conversation
also surfaced the broader spatial-fidelity philosophy, captured
at [docs/design-philosophy.md](./design-philosophy.md): bag-of-
stuff rooms by default, opt-in finer fidelity (regions, range
bands, geometry) for content that earns it, layered presentation
(prose by default, `analyze` and instruments for physics).
Multi-axis capacity (volume + weight + count + rule
simultaneously) is documented as the canonical container shape.

Original framing kept here for cross-reference:

A guard stands in the doorway. You `walk east`. What happens? "You
can't go that way" is wrong — the doorway is available; the body
in it is the issue. Pushing? Permission? Just-fail-with-a-different-
message?

**Stresses**: locomotion validation surface (mode-vs-target was
clean; mode-vs-occupant is new); slot model (is "standing in a
doorway" a slot? probably not — it's containment + posture); the
Postured-as-slot-provider question.

**Pulls on**: #1 (collisions during sustained actions are
different), #6 (a hidden actor isn't a collision until detected).

---

## 3. Sound propagation as a physics channel — GRADUATED

**Status**: graduated to its own slate at
[docs/slates/sound-slate.md](./slates/sound-slate.md). The conversation also
spun out a cross-cutting [docs/subsystems/quantities.md](./subsystems/quantities.md)
capturing the `Quantity<T>` pattern (real-units-underneath,
friendly-tags-on-top, instruments-reveal) — sound is the second
consumer after light, and the pattern generalizes to every
future physics channel and quantitative property. The
pedagogical seam (real dB SPL, real species hearing ranges,
real acoustic impedance, scientific instruments as in-world
Stuff, the `analyze` verb family) is woven through the sound
slate as a first-class concern.

Original framing kept here for cross-reference:

Light propagates through Boundaries (windows, open doors) via the
existing substrate. We have `MotionEvent` for detection-of-motion.
What we don't have: **persistent sound** (a fountain, a forge, a
music box) and sound *propagating through* walls, doors, windows
the way light does.

**Stresses**: Boundary substrate (does it generalize from "light
conduit" to "physics-channel conduit"?); detection (is "I hear
someone moving in the next room" the same machinery as "I hear the
fountain"?); the `LightApi.lightAt` shape (does `SoundApi.soundAt`
mirror it cleanly, or are sound's properties different enough to
need its own walk?).

**Pulls on**: #4 and #11 (channel-pattern reuse, now via
`Quantity<T>` and channel-keyed Conduit transmissivity).

---

## 4. Scent and persistent traces

A scent trail. Bloodstains on the floor. Footprints in snow. All
**temporal physics**: footprints decay; scent fades; bloodstains
linger until cleaned. Tracking dogs follow scent.

**Stresses**: locomotion slate (does every locomotion event leave
a trace by default? configurable per-mode?); whether traces are
Stuff, properties, or a separate trace-store; MotionEvent payload
(events might need to *deposit* something, not just fire); decay
machinery (does this share infrastructure with #9?).

**Pulls on**: #1, #3, #9.

---

## 5. Recognition, disguise, and strangers — GRADUATED

**Status**: graduated to its own slate at
[docs/slates/recognition-slate.md](./slates/recognition-slate.md), with three
sibling slates spun out from the social-game / multi-user-scale
discussion:

- [docs/slates/social-graph-slate.md](./slates/social-graph-slate.md) —
  buckets (friends/foes/custom), notification policies,
  attention-management rendering. Strangers go *more*
  ambiguous in crowded rooms so people who matter stand out.
- [docs/slates/communication-policy-slate.md](./slates/communication-policy-slate.md)
  — trust-tiered moderation; recognition is a security
  primitive. Sandboxed-zone NPCs default to emote-only;
  friends bypass filters; foes are dropped; authority
  overrides for warnings.
- [docs/slates/identification-slate.md](./slates/identification-slate.md) —
  parallel pattern for *items*: blue potion → potion of
  healing after `read scroll of identify`. The pedagogical
  seam runs deepest here (chemistry experiments ARE
  identification).

The four slates compose: recognition is foundational; social-
graph builds buckets/notifications on top; communication-policy
reads buckets + recognition for trust tiers; identification
applies the same memory-of-perception pattern to items.

Persistence stress noted across all four — long-term per-player
memory at scale (thousands of records) requires fine-grained
record access patterns the current `Persistable` shape doesn't
yet support. Flagged for persistence-layer follow-on.

Original framing kept here for cross-reference:

You walk into a tavern. You see a hooded figure (you don't know
it's Bob). You see Sarah (you recognize her). The thief takes off
his hood — now you see Bob. Recognition is a per-viewer state, not
a property of the named.

**Stresses**: DescribeApi v2 (mentioned in roadmap); perception
subsystem (`canSee` is yes/no, but recognition is a third state);
the Witness/memory question (#7) — how does "I have met Bob"
persist?; shadows (hood as a perceptual shadow on the host's
display name).

**Pulls on**: #7 (recognition requires memory). Item-id
graduated as well (originally not in the 12 items, surfaced
during the discussion).

---

## 6. What's actually visible in a room

You enter a room. You see the room's contents — yes. Adornments
(portrait on the wall) — yes. The bag in the corner is visible,
but is the dagger inside the *open* bag? The closed chest? The
seatbelt's `seatbelt:1` slot — is the seatbelt visible "in" the
seat? The contents of an Adornment?

**Stresses**: `look` semantics; the slot substrate (do slots
expose their occupants to perception queries by default, or
opt-in?); per-Adornable visibility rules; the Concealing /
Searchable mixins from slates/mixin-slate.md.

**Pulls on**: #5 (recognition), #3 (audible-but-not-visible).

---

## 7. Memory of observed events

Bob saw you steal the bread three rooms ago. Now Bob is the
witness. NPCs need to remember things — who they've met, what
they've seen, when.

**Stresses**: Witness pattern from events.md (does it persist, or
just react?); the memory store's shape (per-NPC structured log,
queryable how?); information-sharing between NPCs (gossip layer);
player-side memory (do players also have a memory store, or do
they rely on chat log?).

**Pulls on**: #5, #1 (events have timestamps, so this needs the
time model).

---

## 8. Multi-actor coordination

Two people lift a heavy log together. A team carries a stretcher.
A choir sings together. A mechanism requires two people pulling
levers simultaneously.

**Stresses**: the slot substrate (a "log being lifted" has two
`carrier:left` and `carrier:right` slots — feels right);
verb dispatch (is `lift log` a single-actor verb that requires
another actor too? race conditions, synchronization); pathfinding
(can the team find a coordinated route?). Pedagogical relevance —
group projects are a Saxonberg use case.

**Pulls on**: #1 (coordinated actions inherently have duration).

---

## 9. Persistent location state

The room remembers: bloodstain on the floor since the duel last
week, soot on the ceiling since the candle smoked, the floorboard
loose since someone pried it up.

**Stresses**: location's contents-list is for Stuff, but
bloodstains aren't really Stuff (no mass, no agency, no
portability). Are they Adornments? Properties? A separate
`LocationState` bag? Bears on Adornable — adornments are usually
intentional decorations, but bloodstains aren't.

**Pulls on**: #4 (scent / footprints are similar), #1 (decay over
time).

---

## 10. The activity layer

Reading a 200-page book. Building a wall stone-by-stone.
Performing surgery. Brewing a potion. None of these are
locomotion, but they share the same time/interruption shape.

**Stresses**: not its own slate yet, but every long-form game uses
one; the prompt-stack on the roadmap is part of the answer; events
from events.md likely the substrate; interruption semantics (your
reading is interrupted by an attack — does the book remember your
page?). May fold cleanly into #1's framework.

**Pulls on**: #1 (this might *be* the framework #1 produces).

---

## 11. Heat as a physics channel

We have Light. We don't have Heat. A forge radiates warmth; a
fire warms a room; cold seeps in through a cracked window; ice
melts to water.

**Stresses**: same physics-channel shape as #3 (Light/Sound); state
of matter from slates/mixin-slate.md (frozen / molten); Boundary
substrate again. `Combustible` / `Lightable` / `Burning` are
deferred mixins that depend on this.

**Pulls on**: #3, the existing Boundary substrate.

---

## 12. The pedagogical seam

Saxonberg's audience is academic. A student in a chemistry lab
needs to *do* chemistry — combine substances, measure quantities,
observe reactions. Probably not a substrate gap so much as a
forcing function for which mixins land first.

**Stresses**: Material's `composition` (already shipped) +
`Combinable` from slates/mixin-slate.md + an `educate` event hook for
tracking what the student demonstrated. Worth a 10-minute
stress-test against what we have to confirm we haven't painted
ourselves into a corner.

**Pulls on**: #10 (lab activities have duration), #8 (lab partner
collaborations).

---

## Working method

For each entry we tackle:

1. Pose the question in concrete terms (a worked scenario, like
   the seatbelt car or the horse-as-conveyance).
2. Walk through the design space.
3. Surface tensions and design issues against the existing slates.
4. Decide: fold into existing slate, draft new slate, or defer
   with a flag in this doc.
5. Update relevant slates' open-questions lists.

Same flow that produced the embodiment + locomotion slates.
