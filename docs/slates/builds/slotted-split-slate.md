# Slotted split slate — the substrate is doing three jobs

**Captured 2026-09-04**, out of the textiles MR (!236) after a run of
host-placement corrections in that build.

> **User: "SlottedMixin has grown into quite a beast. We recently broke
> up BulkableMixin into a few different pieces since it was doing a few
> different jobs. does SlottedMixin need the same treatment?"**

> **Status: design conversation, captured. Not requirements.**
> ⚠ Deliberately NOT built in !236 — see *Why this is not in that MR*.

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

# ⚠⚠⚠ MEASURED 2026-09-04: the split is BLOCKED, and the blocker is bigger than the split

**The `Attired` split was built and does not land.** Not because the
design is wrong — it compiles clean in isolation — but because
**`Creature`'s composition is at TypeScript's inference ceiling**, and
adding *any* mixin to that lineage collapses `Avatar` to `never`.

## The measurements

| what was put in the chain | errors | `Avatar` collapses |
|---|---|---|
| nothing (baseline) | 61 — all honest migration | **0** |
| `AttiredMixin` nested in `CreatureBase` | 1167 | 309 |
| `AttiredMixin` on `CharacterBase` instead | 1181 | 316 |
| `AttiredMixin` wrapping the RESOLVED `CreatureBase` const | 1167 | 316 |
| **an EMPTY do-nothing mixin** | **3614** | 316 |
| the same, under **tsgo** (TypeScript 7 Go rewrite) | 1174 | **316** |

⭐⭐ **An empty mixin fails identically to a real one.** It is the call
COUNT, nothing about the code.

⭐⭐ **Two independent compiler implementations fail identically.** This
is not a `tsc` quirk to version out of — it is how TypeScript infers
class-factory mixin chains, and the lineage is past it.

## The lineage

| expression | mixin calls |
|---|---|
| `CreatureBase` | 21 |
| `CharacterBase` (on `Creature`) | 20 |
| `AvatarBase` (on `Character`) | 11 |
| **Agent → Avatar total** | **52** |

⚠ **A named class does NOT reset the budget** — wrapping the already-
resolved `CreatureBase` const failed exactly like nesting inside it. So
splitting a base into named halves buys nothing; only removing calls
does.

## ⚠⚠ This is a LIVE HAZARD, not a curiosity

Today, with no `Attired` anywhere, **the next person to add any mixin to
`Creature` gets 1000+ errors across the whole tree with no obvious
cause** — the errors surface in `Avatar.ts`, in dorm tests, in card
tests, anywhere but the file they edited. Nothing warns. That is the
single most useful thing in this document.

## What was tried and rejected

- **Bun** — does not typecheck at all (strips types); the gate stays
  `tsc` either way. Irrelevant to this.
- **tsgo** — same ceiling, measured. ⭐ But it IS a correct checker once
  `rootDir` is set explicitly (the server tsconfig deliberately omits
  it), and it is dramatically faster than `tsc`. Worth its own look as a
  CI checker; it is not a solution to this.
- **Folding the covering reads into `BodyPlanSlotsMixin`** (zero new
  calls, would work) — rejected: the model is the product, and the
  taxonomy should not bend to a compiler limit.

## ⚠ A METHOD lesson, recorded because it nearly shipped a wrong answer

tsgo was first measured at *"0 errors in 3.4s"* and reported as a fix.
It was not checking: 119 `TS6059` config errors aborted the run before
checking began. **A checker reporting ZERO errors on a tree that also
reports 119 failures is telling you it stopped, not that the code is
clean.** Planting three deliberate type errors — which it did not catch
— is what exposed it. **Validate the instrument before trusting the
measurement**, and do it first rather than fifth.

## The path

**Reduce the count.** Every mixin merged out of the lineage frees a slot
permanently, which is what buys room for the taxonomy rather than for
one mixin. Candidates are concepts split several ways —
`Thermal` + `ThermalRegulation`, `Vitals` + `Metabolic` + `Respiration`.

⭐ And a second question worth asking: `AttiredMixin` has
`fieldMeta = {}` — **zero state, every method a pure derivation** over
the occupancy map. How many of the 52 are stateless like that, and does
a stateless derived-read capability need to be structural at all? That
bumps the verbs-on-objects rule, so it is a design conversation and not
a quick win — but 52 is the number to attack.

# What this deliberately does NOT propose

- **No change to the slot model.** `SlotSpec`, capacity, `accepts`, the
  three override patterns, colon-positional names — all untouched.
- **No new verbs, no wire change.** The `worn` projection keeps its
  name.
- **Not a rename of `Slotted`.** Unlike the maturation case, the base's
  name is still exactly right for what is left: it exposes slots.
