# Search slate — the viewer half of detection

> **Captured 2026-09-02**, split out of the textiles design session in
> `build-1`. **Status: gap audit + design surface, pre-design.**
>
> The textiles session went looking for what a camouflaged cloak would
> need and found that detection is missing **one thing on two sides**.
> Textiles takes the *target* side (a garment is clothing); this slate
> takes the *viewer* side (a lens is not), plus the spawn-hidden and
> terrain-matching work that has nothing to do with clothes.
>
> **User framing, 2026-09-02:** *"I want searching to be a big part of
> the experience in this game — where we can build tools and magic items
> to increase your searching prowess, and also have some sorta implicit
> search pattern so players don't have to type `search` whenever they
> walk in a new room."*
>
> ⭐ **Read the audit first.** Search is in considerably better shape than
> the session expected, and two of the three things the framing asks for
> already ship. The slate is smaller than it looks.

---

## ⭐ What already ships — audited 2026-09-02

**Concealment is a scale, not a boolean.** `ConcealmentLevel` is a
monotone five-band vocabulary, ordered weakest→strongest:

```
obvious ─ subtle ─ hidden ─ deep ─ buried      (index 0..4)
   0        2        4       7      11         ← AppSettings dials, not code
```

The band *names* live in code; the *magnitude* each demands is
`concealment.level.<band>`, a dial with a seeded-literal fallback. So the
detection curve is tunable without a code edit.

**The resolution rule is already the one the framing describes:**

```
effectivePerception = capacityOf(viewer) + attention + lightConditions
perceives           = effectivePerception ≥ requirementFor(concealment)
```

`capacityOf` is the **`awareness` Discipline** band. It carries **no
conferrals** — `search` / `look` / `disarm` are universally afforded, and
competence only *grades* them. Nothing is gated behind progression.

**Implicit search already exists — twice over:**

1. **Passive hints on entry.** `LookController` renders
   `PerceptionApi.hintsFor` into the room description: anything whose
   `requirement − effectivePerception` falls within a dial surfaces its
   authored `concealmentHint` — *"a draft," "the bookshelf sits oddly"* —
   **never naming the concealed thing** (honest fog). Attention is
   *directed*, and **you never have to type `search` to know something is
   there.**
2. **Movement is an attention axis.** sneak / walk / run carry
   `movement.attention` deltas read by `PerceptionLogic.modeAttention`,
   so *how you move through a room decides what you notice*. Over the
   same concealed trap, a sneaker steps around what a walker is baseline
   on and a runner springs. An implicit search pattern keyed on posture
   rather than on a verb.

**And the rest of the loop is sound:** `search` is a costed engaged act
holding the searcher's `hands` for `concealment.searchSeconds` game-time,
resolving at completion — so a barge-in mid-rummage aborts it and finds
nothing (genuinely ambushable), while `voice` stays free so you can still
talk. No arg = broad-shallow room scan; `search <target>` = narrow-deep.
`look`/`examine` fold into one controller with a cheap `'glance'` depth.
Discovery sticks per-viewer in a `DISCOVERY` belief realm, so **once
found, always seen** — nothing makes you re-search.

> **So of the three things the framing asks for, the implicit search
> pattern largely ships.** What is missing is the *equipment* half — and
> the fact that nothing hidden is ever placed by the world.

---

## ⚠ The gap — one thing, two sides

```
        VIEWER SIDE                          TARGET SIDE
capacity + attention + light        vs      requirementFor(getConcealment())
         ▲                                            ▲
   NO EQUIPMENT TERM                       single AUTHORED field —
   a lens, a ring, goggles,                 no worn contribution
   an ocular augment have
   nowhere to plug in
```

`effectivePerceptionImpl` is literally three terms:

```ts
return capacityOf(viewer) + attention + lightConditionsFor(viewer, target);
```

There is no fourth. **Nothing you can carry, wear, wield or install makes
you better at finding things.** That is the single biggest miss against
the framing, and it is what makes "build tools and magic items to
increase your searching prowess" currently impossible rather than merely
unbuilt.

**Textiles takes the target side** — `getConcealment()` becomes
derive-on-read (authored base + worn covering contributions), which is
the same architectural move it is already making for `clo`. That gives
camouflage and hi-vis. It does **not** give lenses. See
[textiles-slate § Decision 10](./textiles-slate.md).

---

## ⚠⚠ Nothing in the world is ever placed hidden

`setConcealment` has **two callers in the entire tree**: `ArmController`
(arming a trap) and `Exit` (a secret door). Everything else concealed is
**authored by hand on a template row** — the Sunken Delve's caches, the
three trap generics, two lounge rows.

Which means the magic-item distribution channels place nothing hidden.
Both of them:

- **Deliberate placement** — a declared par on a `ResettableMixin`
  holder, topped toward by the reset sweep.
- **Random draw** — the weighted table on the third self-maintenance
  sweep, with rarity **derived** as the inverse of stored labour off
  `PriceList.ts`.

Neither touches concealment, so **every minted item lands `obvious`**.
An item you find is an item that was sitting in plain sight.

⭐ **The design opportunity, in the framing's words** — *"the whole magic
item spawning thing should probably be touched up to spawn things hidden,
where hidden is a scale and your perceptiveness has to overcome less
conspicuous things to see them."* The scale exists; the perceptiveness
comparison exists; only the **stamp at mint** is missing. This is a small
change with a large experiential payoff, and it is the thing that turns
the census from an inventory into a *world worth searching*.

⚠ It also has a real balance edge: an item placed `buried` in a region
nobody searches is a withdrawal from circulation that the census still
counts as stock. Concealment at mint and the census's "reachable now"
definition need to agree, or the random channel will under-inject.

---

## The design surface

### 1. The equipment term — where does it plug in?

`effectivePerception` wants a fourth term. Candidate carriers, all
shipped substrate:

| carrier | example | notes |
|---|---|---|
| a wielded tool | magnifying lens, probe | occupies `hands` — competes with `search` itself holding `hands` ⚠ |
| a worn item | goggles, jeweller's loupe, a ring | rides the covering stack textiles is building |
| an augment | ocular implant | `@RequiresActive`, the three-base capability model |
| a magic item | a ring of seeing | the effect substrate; charge economy applies |
| a consumable | an infusion | metabolism; a *window*, not a permanent gain |

⚠ **The `hands` collision is real** and probably decisive: `search` holds
the searcher's `hands` slot for its duration. A handheld lens therefore
cannot be held *while* searching under the current activity model. Either
the lens is worn/head-mounted, or `SearchActivity`'s slot claim needs
revisiting.

### 2. Is the term additive, or does it change the shape?

Additive (`+ equipmentBonus`) is the cheap answer and matches `attention`
and `lightConditions`. But the interesting instruments are not flat
bonuses:

- a **loupe** should help enormously at narrow-deep and not at all at
  broad-shallow (it magnifies, it does not widen)
- a **lantern** already works, through `lightConditions` — the precedent
  that an instrument can act through an *existing* term rather than a new
  one
- a **detector** attuned to a kind (metal, arcana, life) should not raise
  perception at all — it should answer a *different question*

⭐ That last one suggests the honest model may be **two mechanisms, not
one**: instruments that raise `effectivePerception`, and instruments that
report a *channel* independent of it. The
[instrumentation slate](./instrumentation-slate.md)'s
readings-are-channels / procedures-are-verbs split is very likely the
right frame here, and ⚠ **it should be read before designing this**.

### 3. Terrain-matched concealment (camouflage)

Concealment reads **no biome, no terrain, no backdrop**. So a camouflaged
garment can only be a flat bonus, which is the boring version.

The honest model is a **match** between what you are wearing and what you
are standing in: woodland camo in a desert should be *worse* than plain
cloth. That:

- makes the dyer matter to somebody who is not shopping for looks
- makes camouflage a *decision about where you are going*, not a purchase
- reuses the `Biome` chain resolver rather than inventing terrain

⚠ It means teaching concealment about biome, which is a real dependency
in someone else's subsystem, and is why textiles explicitly defers it.

### 4. Implicit search — what is actually left

Given that hints-on-entry and the movement attention axis already ship,
the remaining candidates are narrower than the framing implies:

- **A standing search posture** — an opt-in mode (like `sneak`) that
  trades pace for a persistent attention bonus, rather than a verb you
  re-type per room. The `LocomotionMode` precedent already exists and
  `sneak` is arguably already this.
- **Hint richness.** Hints today are a single authored
  `concealmentHint` string, else a generic nudge. A room full of
  concealed things emits… what, exactly? Aggregation, ordering and
  suppression are unexamined.
- **Re-search cost.** Discovery is permanent per-viewer, which is right,
  but it means a *thorough* first pass has no ongoing value. Nothing
  rewards searching a place you have already cleared, which may be
  correct.

---

## Open questions

1. **Does the equipment term go on `effectivePerception`, or do
   instruments report channels instead?** See the instrumentation slate.
   This is the fork that decides the size of the build.
2. **Does `SearchActivity` keep its `hands` claim** if handheld
   instruments are a thing? Aborting on barge-in is load-bearing
   (ambushability); the *slot* it claims may not be.
3. **Should concealment-at-mint derive** (from rarity? from the holder?
   from the region?) or be authored per template? Deriving matches the
   "rarity derives; there is no authored rarity table" doctrine.
4. **How does concealment at mint interact with the census's
   reachable-now definition?** A `buried` item is stock nobody can reach.
5. **Does terrain matching belong to concealment or to the garment?** A
   `matchesBiome` read on the covering feels like the garment's business;
   a backdrop term on `effectivePerception` feels like concealment's.
6. **Is there a conspicuity ceiling as well as a floor?** Textiles adds a
   band past `obvious` for hi-vis; whether that generalizes to *any*
   object (a lit brazier, a bright banner) is unexamined.
7. **What does a room full of hints read like?** Unexamined, and it is
   the surface the player actually experiences.

---

## Cross-references

**Direct sibling:** [textiles-slate](./textiles-slate.md) — takes the
target half of the same seam (§ Decision 10), and must be read for what
this slate deliberately does *not* take.

**Likely the governing frame:**
[instrumentation-slate](./instrumentation-slate.md) — ⚠ *check before any
measure/analyze/instrument/augment design*; readings are channels,
procedures are verbs, sensorium and instruments are one continuum.

**Related design:** [discovery-slate](./discovery-slate.md) ·
[field-substrate-slate](./field-substrate-slate.md) (seeded vs derived;
the price of a sample) · [magic-items-slate](../tails/magic-items-slate.md).

**Shipped substrate:**
[concealment.md](../../subsystems/concealment.md) (the gate, the bands,
`search`, the `awareness` Discipline) ·
[stealth.md](../../subsystems/stealth.md) (the actor face) ·
[perception.md](../../subsystems/perception.md)
(`effectivePerception`, the Shadow seam) ·
[belief.md](../../subsystems/belief.md) (the `DISCOVERY` realm) ·
[magic-items.md](../../subsystems/magic-items.md) (§ Distribution — the
two injection channels, the regional census) ·
[locomotion.md](../../subsystems/locomotion.md) (the care↔speed axis) ·
[augmentation.md](../../subsystems/augmentation.md) ·
[biome.md](../../subsystems/biome.md) (the chain resolver terrain
matching would use) ·
[advancement.md](../../subsystems/advancement.md).
