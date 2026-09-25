# RGO unification slate — promote at the third consumer, not at the end

> **Status: UNBUILT** — the RGO roster is nearly closed (mining · farming ·
> ranching · fishing · forestry · water shipped; extraction added
> quarrying/salt/coal-peat in MR !291; **apiculture is the last family**), and
> every one of them rolled its own version of the same few shapes.
> **Left:** ⭐ `ProducingMixin` (the tap) promoted out of `trade-ranching`'s
> pack lib into the kernel · a home for the pin walk (`stepOutwardForPin`,
> copied 3×) · the **sweetener vocabulary** decided once across sugar, honey
> and maple · and — **held deliberately** — the derived-field interface, which
> waits for foraging
> **Size:** several waves, landed **between** builds rather than as one build

> **Captured 2026-09-25.** User direction, and it reorders the RGO path:
>
> > *"I'd rather stay ahead of unification when we can. unification is
> > basically tech debt."*
>
> The retired extraction/RGO-census slate had scheduled a **terminal
> unification pass** after every RGO family shipped. That is by construction
> interest payment on debt taken on deliberately, so the sequence changes:
> **promote each shared primitive at the moment its third consumer is real,
> as its own small increment.**

Substrate: [field-substrate-slate](../tails/field-substrate-slate.md) (the
field half) · [ranching.md § The taps](../../subsystems/ranching.md) ·
[apiculture-slate](./apiculture-slate.md) ·
[dairy-slate](./dairy-slate.md) ·
[discovery-slate](./discovery-slate.md) (foraging, the case that completes
the field interface).

---

## The rule, and its limit

The repo already states the promotion trigger, in `CLAUDE.md`: substrate goes
to the kernel **"when its composers have no common pack ancestor"**, and
**"a third pack wanting a mixin without depending on its owner is the signal
to promote it."** Not *count them up later*.

⚠ **The limit is real and is why the pass was originally scheduled late.**
The census argued the **hive is the one genuinely new shape** among the
remaining RGOs, so a field interface unified before seeing it would be
unified around the easy cases. `lint-family.md` says the same from the other
side: *"driving it lower would mean unifying mechanisms that really are
distinct."*

> **The discipline: promote when the third consumer is real and in hand; hold
> when the hardest case is still hypothetical.**

## The promotion queue

### 1. ⭐⭐ The tap — `ProducingMixin` → kernel · READY

`ProducingMixin` lives at `packages/content/trade-ranching/src/lib/Producing.ts`
— a pack lib. A **tap** is a recurring, non-lethal draw on a living thing's
surplus, rate-limited by the organism's condition, with a neglect behaviour.
`ranching.md § The taps` already ships three behaviours:

| | behaviour | neglect |
|---|---|---|
| **milk** | expire | she dries off for that lactation — a slope, not a cliff |
| **eggs** | accrue | they spoil in the nest past what a clutch holds |
| **wool** | continuous | a worse fleece, and a hot sheep |

**Three consumers are now real:** ranching (milk · eggs · wool), forestry
(**maple sap · rubber latex** — in design in the `master` worktree as of
2026-09-25), apiculture (**honey** — a surplus drawn from a living colony).

⭐ **Maple sap is seasonal-continuous, latex is continuous-with-recovery, and
honey is accrue-then-expire — all three fit that table without extending
it**, which is the strongest available evidence that the primitive is real
rather than a compression trick.

⚠ The tapping build is the forcing event, so **this wants doing before it
lands**, not after.

### 2. The pin walk — a home for `stepOutwardForPin` · READY

Copied **three times** already;
[field-substrate-slate](../tails/field-substrate-slate.md) lists *"a home for
the pin walk"* under **Left**. The hive's forage range would be the fourth
copy. Three is past any reasonable threshold.

### 3. ⚠⚠ The sweetener vocabulary · READY, and cheapest right now

Three builds need a sweetener taxonomy and none of them owns it:

- **sugar** — `category: sugar` is consumed by simple-syrup, mojito and
  old-fashioned, and **produced by nothing** (the census's one unresolved
  demand root after salt shipped).
- **honey** — [apiculture-slate](./apiculture-slate.md) settles one half
  negatively: **honey must NOT satisfy `category: sugar`**, or bees alone
  close the sugar root and the sugar chain loses its demand case. It is also
  true that honey syrup and simple syrup are different drinks.
- **maple syrup** — the tapping design in the `master` worktree makes a third.

**Three builds each inventing their own category is the duplicate-ground
hazard the slates index warns about.** It is a vocabulary, not a mechanism,
so it costs nothing to settle now and gets expensive the moment two builds
guess differently.

### 4. ⏸ The derived-field interface · HELD

Every shipped field is **seeded** (weather, `Deposit`, `GroundCharacter`).
Foraging's stock is the first **derived** one, and it is the case that
completes the interface — so unifying the seeded fields without it would bake
in the wrong shape.

⭐ Sequencing consequence recorded in the apiculture slate: **whoever ships
first defines the interface.** Bees should ship its nectar availability *as*
the first derived field, **deliberately**, with foraging named as its declared
second consumer — the way the field pattern was validated before (weather,
then `Deposit`, then `GroundCharacter`).

## ⭐ The operational form

**One small promotion increment per primitive, landed between builds.** Not a
big unification build at the end, and **not smuggled inside a feature build
either** — smuggling turns a content build into a kernel refactor with a
content build attached, which is the shape that goes long. Each promotion is
independently landable and proves itself against its existing consumers
immediately.

⭐ The project is already doing this elsewhere: **template inheritance was
pulled up into its own build** because it had come up three times in a week.
Infrastructure landing as its own increment, ahead of the content that needs
it, is the same move.

## The RGO path, as it now stands

1. ✅ **ground** → **extraction** (MR !291: quarry/salt/coal-peat)
2. ⏳ **envelope** (in flight, `design/envelope` — enclosures) → **template
   inheritance** (its own build)
3. **the tap promotion** + **the sweetener vocabulary** (small, between
   builds)
4. **apiculture** (+ sugar) — the last RGO family, and the new shape
5. **foraging** — the first derived field, which completes the field
   interface; keep it adjacent and do not pad the gap with trade builds
6. **hunting**

**The standing rule is unchanged: all RGOs before foraging/hunting.**

## ⚠ Cross-session coordination (2026-09-25)

The `master` worktree session is designing **tapping — maple syrup and
rubber**. Two overlaps, both named above and both worth carrying to them
directly:

1. **The tap primitive** is shared, and their build is what makes the
   `ProducingMixin` promotion unavoidable. If their build lands first it
   forces the promotion early.
2. **The sweetener vocabulary** — maple is the third sweetener.

## Open questions

1. Does the tap promotion carry the three **neglect behaviours** as a closed
   vocabulary, or does a pack declare its own?
2. Does honey's "surplus you may take, and the colony dies if you take more"
   fit the tap, or is it a fourth behaviour?
3. Who owns the sweetener vocabulary — the commons (`/stuff`), or a
   `sweetener` category on the recipe side only?
4. Does the pin walk's home want to be the same module as the field
   interface, or is it independent substrate that ships earlier?
