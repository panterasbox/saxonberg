/**
 * BodyCapacity — **what a body can still do**, as a closed vocabulary.
 *
 * ⭐⭐ The axis this whole build turns on. A wound in this game costs you a
 * *capacity*, not a number: a broken hand costs you `manipulation`, a
 * severed leg costs you `locomotion`, a spine cut costs you both because
 * the nerve that reaches them runs through it. There is no hit-point total
 * anywhere and there is not going to be one — "how hurt am I" is derived on
 * every read, and this is the vocabulary that derivation answers in.
 *
 * Two closed tuples, no behavior:
 *
 * - {@link BODY_CAPACITIES} — the six things a body does. A `BodyPart`
 *   points at them from two sides: `governs` (an organ RUNS this — one
 *   brain, and consciousness is gone with it) and `serves` (a limb is FOR
 *   this — two legs, and one is a hobble rather than a halt).
 * - {@link FUNCTION_BANDS} — how well, read at the surface. The internal
 *   scalar is continuous; nothing outside `VitalsMixin` ever sees it,
 *   because a band is what a person can actually perceive and act on.
 *
 * ⚠⚠ **Named `BodyCapacity`, never `Capability` or `Capacity`.** Both
 * words are taken and load-bearing: `Archetype.CapabilitySlot` is the
 * character-sheet axis, and `SlotSpec.capacity` is how many things fit in a
 * slot. A third meaning for either would be the kind of collision that only
 * shows up as a confused reader six months out.
 *
 * ⚠ **`clearance` ships with a read and no multiplier.** `capacity()`
 * answers it and `assess` shows it; scaling toxin clearance by it is
 * pharma's build, not this one. It is here because a liver that governs
 * nothing is a liver nothing can wound meaningfully — the capacity is what
 * makes the organ worth authoring.
 *
 * The `Channel.ts` / `Grade` / `ToolCapability` precedent: a closed tuple,
 * its type, and a thin static holder. Behavior lives on `VitalsMixin`.
 */

/**
 * The six things a body does, and can stop doing.
 *
 * - **`consciousness`** — being awake and available at all. Governed by the
 *   brain; nothing serves it.
 * - **`locomotion`** — getting yourself somewhere. Served by the legs.
 * - **`manipulation`** — holding, wielding, working. Served by the hands.
 * - **`circulation`** — moving blood. Governed by the heart.
 * - **`respiration`** — moving air. Governed by the lungs.
 * - **`clearance`** — processing what is in the blood. Governed by the
 *   liver. The pharma seam.
 */
export const BODY_CAPACITIES = [
  'consciousness',
  'locomotion',
  'manipulation',
  'circulation',
  'respiration',
  'clearance',
] as const;

/** One of {@link BODY_CAPACITIES}. */
export type BodyCapacity = (typeof BODY_CAPACITIES)[number];

/**
 * How well a part or a capacity still works, ordered worst-last so an
 * `indexOf` comparison reads as severity.
 *
 * ⭐ **Four bands, not a percentage**, because a band is what a person can
 * perceive and act on: *"my hand is impaired"* is a fact you can plan
 * around, and *"my hand is at 0.63"* is a number off a screen this game
 * does not have. The continuous scalar exists inside `VitalsMixin` and
 * never leaves it.
 */
export const FUNCTION_BANDS = ['full', 'impaired', 'failing', 'lost'] as const;

/** One of {@link FUNCTION_BANDS}. */
export type FunctionBand = (typeof FUNCTION_BANDS)[number];

/**
 * ⚠ **No `BodyCapacities` static holder, deliberately** — unlike `Channels`
 * and `Grade`, which this module otherwise copies.
 *
 * The four obvious statics (`isBodyCapacity`, `isFunctionBand`, `worse`,
 * `atLeast`) are all honest type-level value-statics, and `lint:lib-statics`
 * still refuses them: the non-Api static census is a **census-then-ratchet**
 * whose ceiling may fall and may never rise while the sweep runs. That is
 * the gate working as designed, and the answer is to fold rather than to
 * raise the ceiling.
 *
 * So the vocabulary is the two tuples and their types, and the two things
 * that would have been statics live where they are used:
 *
 * - **validation** — `BodyPlan.setBodyParts` checks membership against the
 *   tuple directly, which is one `includes` and no indirection;
 * - **band ordering** — `FUNCTION_BANDS` is ordered worst-last, so `worse`
 *   is `indexOf` and `atLeast` is `<=`, both inline on `VitalsMixin` where
 *   the function axis lives.
 *
 * If a third consumer ever needs the ordering, it goes on `VitalsMixin` as
 * an instance method, not back here as a static.
 */
