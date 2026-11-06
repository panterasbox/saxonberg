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
 * kernel's and only the implementation is the pack's*. ⭐ The split shape
 * earned a protocol mixin at controllers-are-io D8a (`./Splittable`, three
 * implementers in three packs) and `split` asks `MixinApi.isSplittable`;
 * `Diggable` has one host and is a property of it: the `dig` controller
 * narrows on the quarry pack's `OpenWorkingMixin` BY NAME (a federated
 * mixin name, not an import), and {@link Diggable} is only the shape it
 * speaks.
 *
 * ## ⭐ Two phases, because the act takes game time
 *
 * A swing is an **engagement**: it runs over game time on the actor's
 * hands, and a barge-in must leave the ground exactly as it was. So the
 * protocol is *plan, then complete*:
 *
 *   1. **{@link Workable.planWork}** — free of side effects. It answers an
 *      `ActPlan` (how long, how hard, the facts the begin words need) or an
 *      `ActRefusal` (a machine reason and the facts). ⭐ **The refusal is
 *      the ground's, not the verb's** — see below; ⭐⭐ and the WORDS are
 *      the verb's (controllers-are-io D4): the ground answers a reason and
 *      the facts, and `dig`/`split` say them.
 *   2. **the plan's `onComplete`** — called once, at completion. This is
 *      where anything is minted, decremented or moved; what it answers
 *      (facts, the credit, the soils) is landed and worded by the verb.
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
 * A landing's facts carry the Discipline ({@link WorkLanding}). That one field is what lets
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
import type { SoilSpec } from '../cleanliness/SoilSpec';
import type { Tooled } from '../craft/Tool';
import type { ActPlan, ActRefusal, AnyActRefusal } from '../craft/ActPlan';

/** How hard a deed the work counts as, when the ground credits one. */
export type WorkDifficulty = 'trivial' | 'easy' | 'standard' | 'hard';

/** The Discipline a worked act asks to be credited. */
export interface WorkCredit {
  discipline: string;
  difficulty: WorkDifficulty;
}

/**
 * ⭐ What every worked or taken act's LANDING carries beside its own facts
 * — the host's answer, landed by the verb and never decided by it.
 */
export interface WorkLanding {
  /**
   * ⭐ The Discipline the GROUND asks to be credited, or `null`. This is
   * what lets a platform verb earn a trade's competence without the verb
   * knowing the trade exists.
   */
  credit?: WorkCredit | null;
  /**
   * ⭐ What the work put on the worker (cleanliness D6) — the GROUND's
   * answer, like the credit: a quarry face's earth muddies hands and feet,
   * a split block dusts the hands, a hive's frames leave nothing.
   */
  soils?: readonly SoilSpec[];
}

/**
 * ⭐ A worked act's plan (controllers-are-io D4): the one `ActPlan` shape,
 * its landing facts carrying the credit and the soils. ⚠ Free of side
 * effects until `onComplete` — nothing is minted or decremented before.
 * The duration and the watts are the GROUND's (D5): granite is roughly
 * twice slate, and the host converts its felt cost through the body.
 */
export type WorkPlan<B, F, X extends AnyActRefusal> = ActPlan<B, F & WorkLanding, X>;

/** The two halves every worked act shares, in one plan. */
export interface Workable<B = unknown, F = unknown, X extends AnyActRefusal = AnyActRefusal> {
  /** What one swing would be, or why not. No side effects. */
  planWork(
    by: Stuff,
    tool: (Stuff & Tooled) | null,
    what: string | null,
  ): Promise<WorkPlan<B, F, X> | X>;
}

/* ───────────────────────────── dig ───────────────────────────── */

/** ⭐ Every reason `dig` is refused — `DigController` words each. */
export type DigRefusal =
  | ActRefusal<'no-face-above'>
  /** A band in the column not yet uncovered (`band`), or drift over rock. */
  | ActRefusal<'under-overburden', { band: string | null }>
  | ActRefusal<'no-such-face', { asked: string }>
  /** The wrong tool, or none (`held` is the tool in hand's name). */
  | ActRefusal<'no-spade', { face: string; held: string | null }>
  | ActRefusal<'no-pick', { face: string; held: string | null }>
  | ActRefusal<'worked-out', { face: string }>
  | ActRefusal<'at-the-water'>
  /** The face changed under the swing. */
  | ActRefusal<'face-changed'>;

/** What `dig`'s begin words need. */
export interface DigBegin {
  face: string;
  /** Earth is stripped; rock is won. */
  earth: boolean;
}

/** What came up. */
export type DigWon =
  /** A load worked free with nothing to mint (a missing row). */
  | { kind: 'load' }
  /** A thing minted (`called` — named before it moved) and where it went. */
  | { kind: 'thing'; called: string; toTip: boolean }
  /** A bulk band, and nothing to carry it in. */
  | { kind: 'spilled' }
  /** A bulk band shoveled into a vessel (`into` — its name). */
  | { kind: 'shoveled'; into: string };

/** What `dig`'s done words need. */
export interface DigDone {
  face: string;
  won: DigWon;
  /** That was the last of this face. */
  last: boolean;
}

/**
 * ⭐ **Ground you can turn over** — the shape `dig` speaks. Answered by an
 * open working (a quarry face, a turbary bank), and — the recorded next
 * consumer — by a `Soil` host, when foraging asks it for what is living in
 * the topsoil.
 *
 * ⚠ The `what` argument is the player's own word and may bind nothing: `dig
 * clay` lands as a raw string because a band is not an object. That is the
 * `fell.yaml` shape and it is why the verb's target is `requires: any`.
 * ⚠ No marker: the one host is narrowed by its mixin's name.
 */
export type Diggable = Workable<DigBegin, DigDone, DigRefusal>;

/* ───────────────────────────── split ───────────────────────────── */

/** ⭐ Every reason `split` is refused — `SplitController` words each. */
export type SplitRefusal =
  /** `SplittableMixin`'s default. */
  | ActRefusal<'not-splittable'>
  /** A hive: no bees, no queen, too few. */
  | ActRefusal<'no-colony'>
  | ActRefusal<'no-queen'>
  | ActRefusal<'too-weak'>
  /** A cheese wheel: cut to nothing, no edge, a wedge that will not come. */
  | ActRefusal<'wheel-spent'>
  | ActRefusal<'no-edge'>
  | ActRefusal<'wedge-failed'>
  /** A block of stone: rubble, nothing to strike with. */
  | ActRefusal<'block-spent'>
  | ActRefusal<'no-striker'>;

/** What is being divided — what `split`'s begin and done words key on. */
export type SplitKind = 'colony' | 'cheese' | 'stone';

/** What `split`'s begin words need. */
export interface SplitBegin {
  kind: SplitKind;
}

/** What `split`'s done words need. */
export type SplitDone =
  | { kind: 'colony' }
  | { kind: 'cheese'; wedge: string; last: boolean }
  | { kind: 'stone'; piece: string | null; last: boolean };

/** The split protocol's answers. */
export type SplitWorkable = Workable<SplitBegin, SplitDone, SplitRefusal>;
