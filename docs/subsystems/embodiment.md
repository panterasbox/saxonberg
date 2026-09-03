# Embodiment

Body-side affordances on the slot substrate. `Wearable` and
`Wieldable` are specialized `Slottable` mixins that carry per-body-
plan slot claims and the corresponding `fitsSlot` test.

## The Cast

| Name | Location | Role |
|---|---|---|
| `Wearable` | `lib/slot/Wearable.ts` | Body-slot claim for clothing / armor |
| `Wieldable` | `lib/slot/Wieldable.ts` | Body-slot claim for weapons / held items |

Both compose on `Stuff & Slottable & Containable` — wearables and
wieldables live in inventory before being worn / wielded.

## Per-body-plan claims

Each Wearable / Wieldable carries `slotClaims: Record<string, string[]>`,
where the key is a body-plan template path and the value is the
ordered list of slot names this item claims on that body plan.

```yaml
# Boots template
slotClaims:
  /idea/race/bodyplan/biped:    ['foot:left', 'foot:right']
  /idea/race/bodyplan/quadruped: ['hoof:fore-left', 'hoof:fore-right',
                                   'hoof:hind-left', 'hoof:hind-right']
```

A body plan that doesn't appear in `slotClaims` is ineligible —
`fitsSlot` returns false.

`WearableMixin.getClo()` is the thermal insulation a worn garment
contributes. ⚠⚠ **It is DERIVED and the field is gone** (textiles): a
wool coat is warm because wool conducts at 0.04 W/mK and its form traps
air, not because somebody typed a number, and an authored `clo` silently
overrode the whole thermal model. It reads material density and
conductivity, the construction form's loft, the garment's mass, and its
own `slotClaims` (so a garment states its clo with no wearer). See
[thermal.md](./thermal.md) § *Worn insulation*.

### ⭐ The covering stack — one walk, on the wearer

`SlottedMixin` answers about its own slots:

| method | answers |
|---|---|
| `wornStack()` | everything worn, outermost-first (`Wearable` occupants only — a sheathed sidearm is *slotted*, not worn) |
| `coveringAt(part, {includeHeld})` | the covering over one body part, outermost-first |
| `outermostAt(part)` | which layer takes a deposit — the soiling seam |
| `insulationAt(part)` / `bodyInsulation()` | clo over a part / surface-weighted over the body |
| `windproofing()` | how well the outermost layer breaks a wind |
| `wouldLayerViolate(candidate)` | the ladder refusal |

⭐⭐ **Three logic singletons hand-rolled the same outside-in walk** —
the trauma covering walk, the struck-site armor stack and the conduction
walk — and all three now call `coveringAt`. Each already holds the host,
so the call *drops* a parameter rather than adding an Api hop. ⚠ There is
no covering-stack Api and there must not be: a covering read is one host
answering about its own slots, which is none of the four mandates
`check-object-verbs` allows.

**The ordering rule, in one comparator:** *form sets the band; wear-order
breaks ties inside a band.* Bands are `Construction.getLayerDepth()`
(padded 0 · quilted 1 · hide 2 · mail 3 · plate 4, and a fabric's own
`layerBand` on the same ladder); anything with no covering form sorts
innermost. Wear order is slot insertion order, and the persistence spine
re-wears through `occupyAll` in the captured order, so it is **durable
with no new field**.

⚠ `WearController` refuses only the **inversion** — a low band outside a
high one, i.e. a shirt over plate, with a `layer-order` note.
Shirt-vs-coat is not refused: both are band 0, which goes on first is
the player's call, and its consequence is being cold.

⚠⚠ **Covering slots need `capacity` > 1 and did not have it.** Every
wear slot defaulted to 1, so a body could hold exactly one torso garment
— the shipped gambeson and the shipped hauberk could never be worn
together, and the entire outside-in model had nothing to walk. The
biped's and quadruped's covering slots now carry `capacity: 4` (shirt,
gambeson, mail, surcoat). It is a cap rather than unbounded because
"wear forty shirts" would otherwise be free insulation.

## `fitsSlot` overrides

`Slottable` ships a default `fitsSlot(host, slot) => true`.
`WearableMixin` and `WieldableMixin` override it: walk
`host → species → bodyPlan` via `SpeciesApi.tryGetBodyPlanPath`,
then check `slotClaims[bodyPlanPath].includes(slot)`. The host's
`Slotted.canOccupy` calls this after the slot-side mixin check
passes, so the candidate gets the final say.

Subclasses override `fitsSlot` for richer rules (a magic boot that
only fits Elven feet, etc.).

## Multi-slot atomicity

A wearable claiming multiple slots (boots → both feet, longbow →
both hands) uses `occupyAll` in the controller — either
every slot is claimed or none. Failure surface names the blocked
slot. Removal vacates every claimed slot.

## Wearable + Wieldable overlap

Some objects (gauntlets, bracers) compose both. Each side declares
its own `slotClaims`. The verb selects the mode: `wear gauntlet`
invokes the Wearable side; `wield gauntlet` invokes the Wieldable
side. No umbrella mixin.

## Verbs

| Verb | Action |
|---|---|
| `wear <X>` | `occupyAll` on `X.slotClaims[actor.bodyPlanPath]` |
| `remove <X>` | Vacate every claimed slot |
| `wield <X>` | Same shape as `wear` for held positions |
| `unwield <X>` | Same shape as `remove` |

Validators per verb (the controllers fail-fast on type narrows that
shouldn't be reachable post-validator; user-facing rejection lives in
these):

- All four verbs: verb-level `requiresAnimate`, `requiresSlotted`
  (the actor's body needs slots to claim into).
- `wear` / `wield`: target-level `mustBeInInventory`,
  `mustBeWearable` / `mustBeWieldable`.
- `remove` / `unwield`: same target-level shape — `mustBeWearable` /
  `mustBeWieldable` is sufficient for "this is a wearable kind of
  thing"; the controller's own per-slot scan surfaces "you aren't
  wearing that" when nothing actually vacated.

## Hand slots are for activities, not storage

A design rule the shipped verbs already obey, written down so
future verb design doesn't drift:

> **Body slots model active commitments. Ambient inventory
> models possession. The two are distinct destinations.**

`wield`, `wear`, `mount`, posture-bearing seats — all occupy
slots, because each represents a body-level commitment: the
hand is being used for this sword right now, the torso is
being clothed by this shirt right now. Releasing the
commitment (`unwield`, `remove`, `dismount`, `stand`) frees
the slot.

`get`, `drop`, `give`, future `put`/`take` — all move items
in and out of the actor's general `Container`. This is the
"on your person" abstraction: pack, belt, sheath, pouch are
all narrative flavors of the same ambient-inventory slot. The
model deliberately does not author backpacks-as-slots; if a
container-on-the-body is meaningful, it's a Stuff worn in a
slot whose contents are still ambient inventory addressing.

The corollary that matters for verb design: **receiving an
item never requires a free body slot.** A character dual-
wielding two swords can still be given a spellbook — it goes
into ambient inventory, and they can `wield` it later if they
free a hand. The realism is preserved where it pays off (you
can't actually hold three swords); the friction is removed
where it didn't (handing someone a book shouldn't depend on
their combat loadout).

Future activity verbs that need a body slot for the duration
of the activity (cooking grabs a hand for the spoon; reading
grabs `attention` for the book) compete with `wield` /
`wear` / posture for slot occupancy — that's the right
tension, and the engagement framework already supports it.
See [activity.md § Engagement slots](./activity.md).

## Cross-references

- [slot.md](./slot.md) — substrate.
- [race.md](./race.md) — BodyPlan's `slots: SlotSpec[]` declaration.
- [command-spec.md](./command-spec.md) — verb authoring.
