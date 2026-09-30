/**
 * The **worked-act protocol** — *a thing you work at with a tool, a swing
 * at a time* — and the two shapes that speak it.
 *
 * ⭐⭐ **These are declared SHAPES, not mixins, and nothing in the kernel
 * composes them.** `dig` and `split` are the platform's verbs; what they
 * talk to is a pack's. So the kernel declares what it will say and what it
 * expects back, and a pack's working, turbary, block or soil answers. Take
 * every pack away and both verbs still do something correct: they refuse,
 * in words, naming the tool.
 *
 * That is the `TravelNode` seam one subsystem over — *the capability is the
 * kernel's and only the implementation is the pack's* — and it is why
 * there is no `Diggables.of()` static holder beside it. `class TravelNodes`
 * is an empty husk today: its only caller inlined the narrowing, and
 * `lint:lib-statics` sits at a ceiling that may fall and never rise. So
 * each controller carries a module-private narrowing instead.
 *
 * ## ⭐ Two phases, because the act takes game time
 *
 * A swing is an **engagement**: it runs over game time on the actor's
 * hands, and a barge-in must leave the ground exactly as it was. So the
 * protocol is *plan, then complete*:
 *
 *   1. **{@link Workable.planWork}** — synchronous-feeling and free of side
 *      effects. It answers either a {@link WorkPlan} (what will be worked,
 *      how long, what it costs) or a {@link WorkRefusal} (a machine reason
 *      and the sentence the actor reads). ⭐ **The refusal is the ground's,
 *      not the verb's** — see below.
 *   2. **{@link Workable.completeWork}** — called once, at completion, with
 *      the plan's own `token` handed back. This is where anything is minted,
 *      decremented or moved.
 *
 * ## ⭐⭐ Why the TOOL check belongs to the ground
 *
 * The plan for this build split `dig` and `quarry` on the **material
 * class** — earth is dug, rock is quarried. The real constraint is the
 * **tool**, so the split taught the wrong thing. Under one verb the ground
 * states the actual constraint:
 *
 * > *"You would want a pick. That is rock."* · *"A pick will not shift
 * > drift — take a spade to it."*
 *
 * Only the ground knows which of those it is, so the tool arrives in
 * `planWork` and the ground refuses. A controller that pre-checked a
 * capability would have to know what the ground is made of, which is the
 * dependency the whole arrangement exists to avoid.
 *
 * ## ⭐ And the CREDIT belongs to the ground
 *
 * A {@link WorkResult} carries the Discipline. That one field is what lets
 * a **platform** verb earn a **trade's** competence: `dig` credits
 * `quarrying` in a quarry, `agriculture` on a headland and whatever
 * foraging decides in a wood, and the view knows none of their names.
 *
 * ## ⚠ The god-verb test, stated so it can be applied
 *
 * > **If a new digging case needs the CONTROLLER to branch on what kind of
 * > digging it is, it is not `dig`.**
 *
 * That is exactly the test the withdrawn version failed: `dig` shipped once
 * in the fishing build and was **cut in review for hard-coding its yield to
 * a worm**. The mandate is *turn the ground over and see what comes up —
 * the ground decides*, which admits worms, turf, bands, clay and a buried
 * cache, and excludes a grave, a well, a posthole and a foundation: this
 * tree puts excavation-for-a-purpose under its own verb (`ditch`, `sink`,
 * `drive`), because there the product is *a hole that persists and does
 * something* rather than a thing that comes up.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Tooled } from '../craft/Tooled';

/** How hard a deed the work counts as, when the ground credits one. */
export type WorkDifficulty = 'trivial' | 'easy' | 'standard' | 'hard';

/**
 * What one swing will be, if it happens. Free of side effects — nothing is
 * minted or decremented until {@link Workable.completeWork}.
 */
export interface WorkPlan {
  /** Discriminates a plan from a {@link WorkRefusal}. */
  kind: 'plan';
  /**
   * Game-ms one swing takes **here**. The ground prices its own pace:
   * granite is roughly twice slate, and a spade in drift is neither.
   */
  durationMs: number;
  /** Endurance a FRESH body pays, in percentage points. */
  cost: number;
  /** `You <begin> …` — what the actor reads as the work starts. */
  beginSelf: string;
  /** What the room sees as it starts, or `null` for a quiet act. */
  beginPeers?: string | null;
  /**
   * An opaque token the ground hands back to itself at completion — which
   * band, which face, which piece. ⚠ The controller never reads it: it is
   * the ground's own bookkeeping, passed through so nothing has to be
   * re-resolved and so two swings cannot silently work the same thing.
   */
  token: unknown;
}

/** Why not, in the ground's own words plus a reason a note can carry. */
export interface WorkRefusal {
  /** Discriminates a refusal from a {@link WorkPlan}. */
  kind: 'refusal';
  /** The machine reason — the controller's `controller-rejected`. */
  reason: string;
  /** What the actor is told. ⭐ The ground's sentence, never the verb's. */
  prose: string;
}

/**
 * A plan or a refusal, discriminated on `kind`.
 *
 * ⚠ A literal discriminant rather than a `isWorkPlan()` helper: an exported
 * free function in `lib/**` is drift by definition (the export-discipline
 * rule), and `p.kind === 'plan'` narrows in TypeScript with nothing to
 * import.
 */
export type WorkPrognosis = WorkPlan | WorkRefusal;

/** What actually happened, once the swing landed. */
export interface WorkResult {
  /** The line the actor reads. */
  self: string;
  /** What the room sees, or `null`. */
  peers?: string | null;
  /**
   * ⭐ The Discipline the GROUND asks to be credited, or `null`. This is
   * what lets a platform verb earn a trade's competence without the verb
   * knowing the trade exists.
   */
  credit?: { discipline: string; difficulty: WorkDifficulty } | null;
}

/** The two halves every worked act shares. */
export interface Workable {
  /** What one swing would be, or why not. No side effects. */
  planWork(
    by: Stuff,
    tool: (Stuff & Tooled) | null,
    what: string | null,
  ): Promise<WorkPrognosis>;
  /** Do it. Called once, at engagement completion. */
  completeWork(
    by: Stuff,
    tool: (Stuff & Tooled) | null,
    token: unknown,
  ): Promise<WorkResult>;
}

/**
 * ⭐ **Ground you can turn over.** Answered by a working (a quarry face, a
 * turbary bank), and — the recorded next consumer — by a `Soil` host, when
 * foraging asks it for what is living in the topsoil.
 *
 * ⚠ The `what` argument is the player's own word and may bind nothing: `dig
 * clay` lands as a raw string because a band is not an object. That is the
 * `fell.yaml` shape and it is why the verb's target is `requires: any`.
 */
export interface Diggable extends Workable {
  /** Marker: this shape is dug rather than split. Never read for truth. */
  readonly diggable: true;
}

/**
 * ⭐ **A thing too big or too aggregated to use, and dividing it.**
 *
 * Named because the pattern already had a second member before this build:
 * `fell bole` cross-cuts a felled trunk a length at a time under a verb
 * that means something else, as its own view admits (*"Fell a standard with
 * an axe, or cross-cut a felled one"*). A `Stackable` is the third
 * candidate. So the mandate is deliberately wider than stone:
 *
 * > **divide an oversized or aggregated thing into usable units.**
 */
export interface Splittable extends Workable {
  /** Marker: this shape is split rather than dug. Never read for truth. */
  readonly splittable: true;
}
