# Recognition slate (working doc)

> **Status: PARTIAL** — the belief store, viewer-aware `describe`,
> `introduce` and disguise shipped 2026-06 →
> [belief.md](../../subsystems/belief.md)
> **Left:** player-set nicknames (`name X as Y`) · memory decay ·
> voice/scent recognition · algorithmic salient-feature generation
> (author-tunable per-species templates) · MQL compound feature-handles
> · richer disguise content (heavy cloak / full illusion) · faking
> identity + a suspicion mechanic (v1 has no way to give a false name at
> all) · cross-character recognition sharing · the aether id-aug ambient
> trigger
> **Size:** a wave

Working slate for the per-viewer perception of identity — who
the viewer recognizes, who's a stranger, who's disguised, and
how the world's display names compose around all of that. The
core mechanism that recognizes Bob as Bob (or as "a hooded
figure," or as "the tall stranger from yesterday").

This is the substrate. Three sibling slates build on it:

- [docs/slates/social-graph-slate.md](../tails/social-graph-slate.md) —
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

## What this stresses for existing slates

### MQL

Feature-based stranger references (`tall-stranger`,
`red-cloaked-stranger`) need MQL to resolve them. Probably
works with existing grammar; confirm in requirements.

---

## Open questions

3. **Memory decay** — defer; v1 persistent.
4. **Disguise sophistication** — feature-by-feature coverage
   (face/body/voice as separate) shipped (`Disguisable`/`getDisguise`,
   belief.md § Disguise). Only a **hood** ships as content; a heavy
   cloak / full illusion do not.
5. **Voice/scent recognition** — defer to v2.
6. **Salient-feature generation** — algorithmic with author-
   tunable templates per species/Wearable.
7. **Player-set nicknames** (`name X as Y`) — substrate ready;
   verb defer to v2.
8. **MQL feature-references** — confirm during requirements;
   flag if grammar needs extension.
- NPC recognition of players resolved: symmetric, shipped —
  `keepsPersonalRegard()` / `Cast.postRegister` hydration (belief.md §
  Persistence, the `viewerKey` four-viewer table).
- Pets / animals with recognition resolved: shipped, opt-in per
  species — see [pets.md § Belief, recognition,
  age](../../subsystems/pets.md#belief-recognition-age).
- Multi-viewer perception of an introduction resolved: yes, shipped —
  `IntroduceController` writes every recipient in the scene's sensor
  set (belief.md § Recognition triggers).
12. **Faking identity** ("I'm Carl") — ⚠ contradicted by what shipped:
    `IntroduceController` resolves self-introduction from
    `actor.getName()` (your own true proper name) with no way to
    supply a different one, so v1 doesn't record a fake name at all —
    it's not "recorded as Carl," it's not possible. The suspicion
    mechanic and any faking mechanism are still fully open.
13. **Recognition by description match** — guard told to look
    for "tall human with a scar" later sees one. Behavior-layer
    territory; not framework substrate.
14. **Cross-character recognition** for one player's avatars —
    if a player has multiple avatars, do their recognition
    stores share? Lean per-avatar; player-level recognition is
    a separate concept (account-level).

---

## What this slate does NOT cover

- **Buckets / friends / foes** — social-graph slate.
- **Trust-tiered moderation** — comms slate (moderation section).
- **Item identification** — identification slate (parallel
  pattern).
- **NPC behavior** that consumes recognition state (gates,
  gossip, greeting). Behavior-layer territory.
- **Multi-account / multi-character recognition** sharing.
- Fine-grained per-record persistence resolved: shipped as the
  `beliefs` collection, one Document per `{viewerId, realm, referent}`
  (belief.md § Persistence) — no longer whole-document.
