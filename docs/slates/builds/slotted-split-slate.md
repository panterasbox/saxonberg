# Slotted split slate — the substrate is doing three jobs

**Captured 2026-09-04**, out of the textiles MR (!236) after a run of
host-placement corrections in that build.

> **User: "SlottedMixin has grown into quite a beast. We recently broke
> up BulkableMixin into a few different pieces since it was doing a few
> different jobs. does SlottedMixin need the same treatment?"**

> **Status: BUILT 2026-09-06 on `design/mixin-depth`** (off
> `design/textiles`; merges together with !236). `AttiredMixin` composes
> on `Creature`; the nine covering reads left `Slotted`; the narrowing
> sites moved to `MixinApi.isAttired`.
> ⚠⚠ **A "TypeScript inference ceiling" claimed by a 2026-09-04 revision
> of this slate is RETRACTED — see the retraction section. It was a
> measurement error, and the numbers that made it look measured came
> from a probe that never compiled. The real cause was a two-token
> typing bug; the bisection that found it is recorded below.**

Related: [slot.md](../../subsystems/slot.md) (**the shipped substrate —
read it first**), [embodiment.md](../../subsystems/embodiment.md)
(`Wearable`/`Wieldable`, the verbs),
[textiles.md](../../subsystems/textiles.md) (the covering ladder, `clo`,
conspicuity — **the consumer that grew this file**),
[bulk.md](../../subsystems/bulk.md) (**the precedent**:
`UnboundedSourceMixin` split off `Bulkable`),
[concealment.md](../../subsystems/concealment.md) +
[stealth.md](../../subsystems/stealth.md) (`concealmentOffset`,
`attentionFactor`), [mixins.md](../../subsystems/mixins.md) (composition
order, `_mixinName`), [persistence.md](../../subsystems/persistence.md)
(`SlottedSlice`).

---

# ⭐⭐ The finding: nine of ten composers are not bodies

`SlottedMixin` is **1330 lines** — nearly double the 737-line
`Bulkable.ts` that was already judged too big.

The Bulkable split's own stated test is the one to apply. `Bulkable.ts`
says `UnboundedSourceMixin` is

> *"a separate, narrow capability — composed only on source fixtures;
> the base substrate knows nothing about it."*

So: who composes `SlottedMixin`?

**Chair · Floor · PlantPot · GardenBed · Campfire · ManaLamp ·
TpaTerminal · Bed · Adornable · Creature**

⭐⭐ **Only `Creature` is a body.** The other nine carry
`bodyInsulation()`, `wornStack()`, `windproofing()`,
`concealmentOffset()` and `wouldLayerViolate()` for nothing. A garden
bed has a whole-body insulation read. A mana lamp has a worn stack. A
door — through `Adornable` — can be asked its windproofing.

That is the same failure `Bulkable` had, at a worse ratio.

# The three jobs

| | what | ~lines |
|---|---|---|
| **A. Slot substrate** | the slot universe (`getSlotNames`/`getSlotSpec` + the three override patterns), the occupancy map, `occupy`/`vacate`/`vacateAll`/`vacateSole`/`occupyAll`, `canOccupy`, `findOpenSlotFor`, `resolveSlot`, `walkOccupants`, `tryReleaseFromSlots`, `captureSlice` | ~930 |
| **B. Covering stack** | `wornStack`, `coveringAt`, `outermostAt`, `wouldLayerViolate` | ~210 |
| **C. Derived body physics** | `insulationAt`, `bodyInsulation`, `windproofing`, `concealmentOffset`, `attentionFactor`, `impressionAugmenter`, `impressionClauses`, `conspicuityOf`, `depthOf`, `bodyPlanOf`, the four wetness/wear dials | ~190 |

**B and C are one concern** — C is entirely derived from B — and they are
**contiguous in both blocks**: methods at 706–917, module helpers at
375–561.

## ⭐ The clincher: the extracted half owns its dependencies

Checked every import against those two regions. **Eight of eleven are
used only by B+C:**

`PerceptionApi` · `Quantity` · `AppApi`/`AppSettingKeys` · `Impression`
· `GRADE_BANDS` · `Durable` · `Branded` · `BodyPlan`

The three that appeared to escape turned out to be B+C as well — the
interface declarations for `insulationAt`/`bodyInsulation`, and the
`subscribableFields` block for `'worn'`. Only `Mixins` and `MixinApi`
are genuinely shared, and those are the slot substrate's own validation
and narrowing.

⭐ **A split where the extracted piece takes two-thirds of the imports
with it is a real seam, not a line-count cut.** This is the single
strongest signal in the whole finding, and it is what distinguishes this
from "the file is long."

# The shape

**`AttiredMixin`** in `lib/slot/Attired.ts`.

⚠ **NOT `Covering`, and the first draft of this slate had that wrong.**
Every read here routes through the host's `BodyPlan` and answers empty
without one (`coveringAt` asks `plan.getSlotsCovering()`), so a
tablecloth or a tarpaulin has no body parts and the machinery cannot
serve it — `Covering` promises a generality the code refuses. It would
also collide: `Construction.isCoveringForm()` already means something
narrower and different (is this construction FORM covering-shaped), a
property of an item's material rather than of a host wearing things. I
had cited that collision as an argument FOR the name; it is an argument
against.

⚠ `Worn` is unavailable for a second reason: **`worn` already means
DEGRADED** in the same file (`WORN_BELOW`, `RAGGED_BELOW`, the
impression's `band: 'worn'`). `Attired` covers clothes AND armour —
"battle attire" — which `Clothed` strains at for a hauberk, and unlike
`Dressed` it does not collide with medical's shipped `dress`.

- **Composed by `Creature`** — settled, and on the user's argument
  rather than mine. Horses and dogs wear barding; `Corpse extends
  Creature` and a corpse is exactly what you loot clothes off; and
  decisively `BodyPlanSlotsMixin`, which SUPPLIES the body parts these
  reads key on, is already at the Creature tier. Putting the reads a
  tier above their own data source (on `Character`) was the wrong shape
  regardless of the compiler, and two variants would be worse than
  either.
- `Slotted` keeps A and stops importing eight modules.
- `Wardrobe.ts` (114 lines) already sits beside it as the saved-set
  half, so the folder shape is established.

⚠ **`Slotted` stays the prerequisite.** `Attired` reads the occupancy
map; it composes ON `Slotted`, it does not replace it. A body is both.

# ⚠ The one genuine coupling: `fireWornChange`

`occupy` / `vacate` / `vacateSole` — the **generic** primitives — call a
private `fireWornChange()` that fires an MQL field event literally named
`'worn'`. A body concept, fired from the substrate every chair uses.

**Proposed fix:** the base fires **`'occupants'`**; `Attired`'s
`subscribableFields` entry for `'worn'` declares
`dependsOnFields: ['occupants']`.

⭐ The projected wire field stays `worn`, so **nothing client-side
moves** — this is a rename of the dependency key, not of the card
projection. See [mql-subscription.md](../../subsystems/mql-subscription.md).

# ⭐ The real cost is caller-side narrowing, and it is mostly tests

Measured, not estimated — call sites for the nine B+C reads:

| | production | tests |
|---|---|---|
| all nine reads | **13** | **46** |

Each becomes `MixinApi.isAttired(x)` where it is now `isSlotted(x)`.
(The 55 `isSlotted` sites tree-wide are mostly about real slot
occupancy and do not move.)

⚠⚠ **Expect the test fixtures to be the work.** This is the Api OO
sweep's lesson verbatim: *a fixture without the mixin fails
STRUCTURALLY once narrowing moves caller-side.* 46 of 59 sites are
fixtures that will need `AttiredMixin` added to their composition, and
they will fail loudly rather than subtly — which is the good case, but
it is the bulk of the diff.

**Persistence is not a complication.** `SlottedSlice` records occupancy
by **position** (indices into the container slice), is body-neutral, and
stays with the base.

# Why this is not in !236

Everything else that MR landed was a **defect** — a false claim, a lying
sentence, a verb on the wrong host, a kernel bug inverting the tool
ladder. This is not. Nothing is broken; the structure is wrong, which is
a different and less urgent thing.

And !236 already carries textiles, the equip verbs, `measure figure`,
the subtractive colour model, the tooling fix and the maturation rename.
A 400-line kernel mixin split with a 59-site narrowing migration
deserves its own review, not a seventh commit on somebody else's MR.

# Open questions

- **Does `Attired` want its own persistence?** Today none of B+C is
  persisted (occupancy re-inits on hydrate; players re-dress each
  session). If that ever changes it should change in `Attired`, not in
  the slot substrate.
- **Do `concealmentOffset` / `attentionFactor` belong here at all?**
  They are stealth reads derived from covering. Keeping them with the
  covering stack is right *today* because that is their only input —
  but if posture or light ever feed them, they want their own home
  rather than a third tenant.
- **Is `Adornable` a fourth job?** It overrides the slot universe
  (Pattern C, live fixture keying) and composes `Slotted` directly. It
  is not covering, so it is out of scope here — but it is the other
  non-body consumer worth a second look.
- **Does the impression line move cleanly?** `impressionAugmenter` is a
  `markupAugmenters` static. Statics on a subclass **shadow** the base's
  rather than merging (mixins union; base classes shadow — the
  `SewingTool`/`MendingTool` finding), so check the composition
  direction before assuming it just travels.

# ⚠⚠⚠ RETRACTED 2026-09-06: there is NO inference ceiling

**An earlier revision of this section claimed `Creature` sat on
TypeScript's inference ceiling and that the split was therefore
blocked. That was WRONG, and it was asserted with a table of numbers
that made it look measured.** The claim is retracted in full.

## What the valid measurements say

Re-run with a probe that actually compiles:

| probe added to `CreatureBase` | calls | members | `Avatar` collapses |
|---|---|---|---|
| nothing (baseline) | 20 | — | **0** |
| an EMPTY mixin | 21 | 0 | **0** |
| a mixin with twenty methods | 21 | 20 | **0** |

⭐⭐ **A synthetic mixin of the same depth AND the same surface as
`AttiredMixin` compiles clean.** Depth is not a constraint here.
Accumulated member surface is not a constraint here. `Creature` has
headroom.

## ⚠⚠ How the wrong answer happened — worth more than the finding

The retracted claim rested on one experiment: *"an empty do-nothing
mixin collapses `Avatar` too, so it is the call COUNT and nothing about
the code."* **That probe never compiled** — the generator that wrote it
omitted the `MixinConstructor` import, so `Creature.ts` failed, `Avatar`
lost its base, and the resulting cascade was read as proof of a ceiling.

⚠⚠⚠ **A broken file in the lineage and a genuine limit produce the
IDENTICAL signature** — a few hundred *"Type 'Avatar' is missing the
following properties from type 'Stuff'"* — because both leave `Creature`
with an unusable base. The cascade is not diagnostic. **Read the errors
in the files YOU changed before forming any theory about the compiler.**
That check takes one `grep` and would have caught this four times.

⚠ The same failure mode had already fired twice in the same session and
was not generalised from: tsgo was first measured at *"0 errors in
3.4s"* and reported as a fix when 119 config errors had aborted it
before checking, and two other `Attired` runs were declared ceiling hits
without ever being checked for file-level errors.

## ⭐⭐⭐ The actual cause: a pinned literal on a mixin static

`AttiredMixin` declared

```ts
static _mixinName: 'AttiredMixin' = Mixins.Attired;
```

Both halves of that line pin the static to a **literal type** — the
annotation obviously, and `= Mixins.Attired` too, because `Mixins` is
declared `as const`. (An earlier revision "fixed" this by dropping the
annotation and keeping `Mixins.Attired`, which changes nothing. That
no-op fix is why the theory kept getting discarded.)

Every other composed class in the chain carries `_mixinName: string`
(a bare `= 'FooMixin'` initializer widens). A pinned literal therefore
makes the class **static side** incompatible with every outer mixin and
every test fixture that declares its own name — **TS2417 × 20**. And
because `Base` is a type parameter, TypeScript **defers** that check to
instantiation, so nothing is reported at the mixin. It surfaces
hundreds of files away as `AvatarBase` collapsing to `never` (TS2507)
plus ~440 bogus *"Avatar is missing the following properties from
Stuff."*

**The fix is `static _mixinName = 'AttiredMixin';`** — 1151 errors → 20,
and the 20 were the expected `isSlotted`→`isAttired` sites.

⚠ `Mixins.Publisher`, `Mixins.Forkable` and `Mixins.Cultivable` use the
same pinned form. They compile today only because nothing downstream
happens to re-declare the name against them — they are the same
landmine, and worth a sweep.

## The bisection that found it

One variable per run, from the known-GOOD end toward the failing one.
Every run validated the instrument with a planted error and was checked
for errors in the changed files **first**.

| probe | change from the row above | result |
|---|---|---|
| baseline | planted error, no probe | instrument OK, **0** |
| P1 | bare mixin in a separate file | **0** |
| P2 | + exported `interface` | **0** |
| P3a | + the `Mixins` value import | **0** |
| P3b | + `static _mixinName = 'ProbeMixin'` (widens) | **0** |
| P3c | + `static _mixinName: 'ProbeMixin' = 'ProbeMixin'` | **440** |
| P5 | + `fieldMeta`, + `isProbe` 3-way predicate | **440** (same) |

So: the separate file, the import, the interface, the registry entry,
the 3-way predicate, `fieldMeta`, member surface and chain depth are all
eliminated **by measurement**, not by argument.

⭐ **The methodological finding is the durable one.** Going from the
*failing* end and guessing produced five wrong diagnoses across two
sessions. Going from the *passing* end, one variable at a time, found it
in six runs.

## Four real typing bugs found on the way (all fixed, all worth knowing)

Each was invisible until the checker named it, and none of them was the
collapse:

1. `wornStack()` read `this.slots` — `SlottedMixin`'s **private** map.
2. The ladder comparator was a private method, unreachable once methods
   carried a `this:` annotation (**a `this:` annotation REPLACES the
   class type**, so the class's own privates go out of scope).
3. A missing `SlotSpec` import after absorbing `BodyPlanSlots`.
4. Under `TBase extends MixinConstructor<Stuff & Slotted>`, `this` does
   not see the `Slotted` surface inside the class body at all.

## What survives

- **The seam itself.** Nine of ten `Slotted` composers are not bodies;
  the extracted half takes eight of eleven imports with it. Unaffected.
- **`Attired` on `Creature`**, on the user's argument — barding,
  `Corpse extends Creature`, and `BodyPlanSlots` living at that tier.
- **`Sexed` → `Organism`** shipped separately and stands on its own:
  `Organism` already declared `getSex()` and delegated to a mixin that
  read back into the species. ⚠ Its commit message cites the retracted
  ceiling as a second motive; the merge is right regardless.

⚠ **What does NOT survive: "composition depth is a budgeted resource."**
That rule was invented to rationalise a measurement error. Do not apply
it.

# What this deliberately does NOT propose

- **No change to the slot model.** `SlotSpec`, capacity, `accepts`, the
  three override patterns, colon-positional names — all untouched.
- **No new verbs, no wire change.** The `worn` projection keeps its
  name.
- **Not a rename of `Slotted`.** Unlike the maturation case, the base's
  name is still exactly right for what is left: it exposes slots.
