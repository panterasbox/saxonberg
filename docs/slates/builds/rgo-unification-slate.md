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
- **maple syrup** — a third, and **confirmed in scope** (user, 2026-09-25:
  *"maple syrup will be in scope when we get to tapping yes"*). So the
  vocabulary has **three** members, not two.

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

## ⚠⚠ The roster is EPOCH-BOUNDED, and that was the oversight

Confirmed 2026-09-25: `docs/roadmap.md` and `docs/vocations.md` contain **zero
mentions** of oil, drilling, petroleum, rubber, plastics, fertilizer, nitrates,
phosphate, guano, sulfur, bauxite or copper. The entire **industrial
extraction epoch is absent from both**, and the `master` worktree walking
tapping → rubber → drilling → oil → plastics is what surfaced it. User:
*"the fact that drilling wasn't even on our roadmap was probably an oversight
even if in the end it ends up being nonblocking."*

⭐⭐ **Why the census missed it, which matters more than the gap.** The census
that closed the roster worked two ways — demand side was *every recipe's
`inputSlots[].category` minus every category some recipe produces*; supply
side was *materials with consumers and no producer*. **Both halves read the
SHIPPED content.** It found `salt` and `sugar` because medieval recipes ask
for them, and it could never have found petroleum because **no shipped recipe
asks for plastic**.

> **A demand-side census is epoch-bounded by construction. It can find a
> missing producer; it cannot find a missing EPOCH.**

**The fix is a forward pass, and lens 5 is already the instrument:** run the
epoch ladder (prehistory · medieval · industrial · modern · future) against
the roster and write down what each epoch *adds*. That converts the
industrial families from unknown-missing to **known-deferred**, which is the
difference between an oversight and a decision.

### ⭐⭐ The through-line: an industrial RGO exists to LIFT a medieval limit

| family | the limit it lifts | is the limit modelled today? |
|---|---|---|
| nitrates · phosphate · guano | soil nitrogen | ✅ soil.md's four reserves + muck → midden → field |
| oil · gas | draft animals and muscle | ⏳ `design/energy` in flight |
| ice → refrigeration | spoilage | ✅ milk keeps hours; cold-chain-slate |
| rubber · sulfur (vulcanization) | sealing and waterproofing | partly |
| copper · bauxite | conductors | ✅ electricity.md |

⭐ **So the accommodation the medieval builds owe the industrial ones is not a
schema change — it is to model the LIMIT honestly.** Fudge soil nitrogen and
fertilizer becomes a number that makes another number go up; model it
honestly and fertilizer is a revolution a player can derive.

### The three concrete accommodations

1. ⭐ **The field interface must admit a RIVAL field** — extraction by A
   reducing what is available to B *elsewhere*. Mining's `Deposit` is not
   rival across locations (your drift does not drain my seam); **forage is**
   (two beekeepers on one range) and an oil reservoir is (two wells on one
   pool — the **rule of capture**). **Forage is the medieval instance, and oil
   inherits it for free** if bees ships it. This is also why the priority
   order below is right on technical grounds and not only on taste.
2. ⚠ **Recovery must be a parameter that can be NONE.** Fishing recovers by
   half-life, forage recovers seasonally, **a reservoir never recovers.**
   Trivial if anticipated; a rewrite if the interface assumes regeneration.
3. ⚠ **Keep the tap honest — a tap is on a LIVING thing's surplus.** Latex is
   a tap; **oil is not** (it neither lives nor regenerates). If `Producing`
   drifts into meaning "extraction with recovery" it swallows the field and
   stops being a claim about anything. The inverse of the usual naming error:
   do not name substrate so broadly that it asserts nothing.

⭐ And `excludability is physics`
([metal-chain-slate](./metal-chain-slate.md)'s own phrasing) is the axis both
forage and oil sit at the non-excludable end of, with mining at the
excludable end. Already named; no work.

### The priority, settled (user, 2026-09-25)

> **Medieval RGOs before foraging. Late-stage RGOs gated ON foraging** — not
> the other way around.

So the industrial families do **not** gate foraging, and foraging's completion
of the derived-field interface is what the later ones build on. ⚠ *Unless* a
modern RGO's design turns out to really affect how the medieval ones are
built — which is what the accommodation list above exists to keep checking.

⚠ **A roadmap line is owed and deliberately NOT taken here.** `roadmap.md` is
a swept index file (CLAUDE.md § Worktrees rule 5), and the envelope build is
finalizing right now, so adding the industrial-epoch entry from a design
branch would race its sweep. **Sweep item: add the industrial extraction
families to the roadmap as known-deferred.**

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
