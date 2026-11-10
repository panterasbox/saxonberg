/**
 * ActPlan — ⭐ the ONE vocabulary every act protocol answers in (ceramics
 * review, 2026-10-28; made wordless by controllers-are-io D4): `knead`,
 * `shape`, `carve`, `cut` and `dip` are asked of an object that PLANS the
 * act, and `impress`, `turn` and the hand-worked `stir` of one that DOES it
 * at once; the ground's `dig`/`split`/`hew` and the taps answer in it too.
 *
 * ⭐⭐ **The object answers with a reason and the facts; the controller
 * writes the words.** Nothing here carries `Mml`. An alternate controller
 * may word everything differently and change nothing in the world — that
 * is lens 2's test, and it is why the words moved off the object.
 *
 *  - {@link ActPlan} — an engaged step: how long, how hard, the facts its
 *    begin words need, and the effect at completion (which may still
 *    refuse, when the world changed under the step).
 *  - {@link ActRefusal} — the act refused: a reason, and the facts its
 *    words need.
 *  - {@link ActOutcome} — an act done: the facts its words need.
 *  - {@link ActChoices} — ⭐ the THIRD limb (controller-liquidity D8): the
 *    object cannot decide between several admissible things, so it returns
 *    the set. The controller picks a default, refuses with the list, or
 *    asks — and an alternate controller may do any of the three. The
 *    object never writes the "which one?" sentence and never chooses to
 *    refuse rather than ask: that was the Harvest lesson (the ground wrote
 *    *"Which field? Name one: …"* and no controller could make it ask).
 *
 * ⭐ Each protocol file declares its own CLOSED reason union and facts
 * types, and a consuming controller words them in an exhaustive `switch`
 * with a `never` arm — so the compiler is the census of every refusal a
 * kernel verb can say. ⚠ The union is closed in the protocol file even for
 * a pack host's reasons: a kernel verb's words are the kernel controller's,
 * so a new reason is a kernel edit (or the pack ships its own controller).
 *
 * Every planner may also answer `null` — it has nothing to say about this
 * act — and the controller asks the next candidate, or words a refusal from
 * what is there.
 */

import type { AbortReason } from '@saxonberg/types';

/**
 * A refused act: the machine reason (the `controller-rejected` note's
 * reason, too) and the facts the controller's words need.
 */
export type ActRefusal<R extends string = string, X = undefined> = {
  ok: false;
  reason: R;
} & ([X] extends [undefined] ? { facts?: undefined } : { facts: X });

/** Any refusal — the constraint a generic consumer narrows from. */
export interface AnyActRefusal {
  ok: false;
  reason: string;
  facts?: unknown;
}

/** An act done: the facts the controller's words need. */
export interface ActOutcome<F = undefined> {
  ok: true;
  facts: F;
}

/** What a completion lands as: done, or refused after all. */
export type ActDone<F = undefined, X extends AnyActRefusal = AnyActRefusal> =
  | ActOutcome<F>
  | X;

/**
 * A planned act: an engaged step (`CommandController.engagePlan`).
 *
 * `B` — the facts the begin words need; `F` — the facts the done words
 * need; `X` — the refusals the completion may still return.
 */
export interface ActPlan<
  B = undefined,
  F = undefined,
  X extends AnyActRefusal = AnyActRefusal,
> {
  ok: true;
  /**
   * Game-time the step occupies the hands, ms. ⚠ `0` = the effect runs
   * NOW, inside the command frame — for an act that is a craft resolved
   * from the actor's reach (the chandler's candle).
   */
  durationMs: number;
  /**
   * Metabolic watts the step costs — the ACT's figure (D5). An act priced
   * in felt cost converts it through the body (`wattsForFeltCost`).
   */
  effortW: number;
  /** What the begin words need. */
  facts: B;
  /** The effect, at completion: done (its facts), or refused after all. */
  onComplete: () => ActDone<F, X> | Promise<ActDone<F, X>>;
  /**
   * The step has begun — called once, when the work is actually under way
   * (the engagement started, or the effect is about to run at once), and
   * never for a plan that was turned down before it began (too tired,
   * hands busy). ⭐ The place for a claim the object holds while the act
   * runs (a saw with a log on it — controller-liquidity W11): taking it in
   * the planner would leak it whenever the engage refused.
   */
  onBegin?: () => void;
  onAbort?: (reason: AbortReason) => void;
}

/** Any plan — the constraint a generic consumer narrows from. */
export type AnyActPlan = ActPlan<unknown, unknown, AnyActRefusal>;

/**
 * ⭐ The act could go several ways and the object will not guess: the set
 * of admissible `choices`, the machine reason (why there is a choice), and
 * the facts the controller's words need (a `preferred` member when the
 * object has a default it would take). A consumer answers by asking the
 * object again with its pick — the protocol says how (a part named, the
 * chosen thing asked directly).
 *
 * ⚠ `ok` is the string `'choose'`, so `if (!answer.ok)` does NOT catch it:
 * a consumer narrows `answer.ok === 'choose'` first, and the compiler
 * refuses a choice handed to an engage routine that wants a plan.
 */
export type ActChoices<C, R extends string = string, X = undefined> = {
  ok: 'choose';
  reason: R;
  choices: readonly C[];
} & ([X] extends [undefined] ? { facts?: undefined } : { facts: X });

/** Any choice — the constraint a generic consumer narrows from. */
export interface AnyActChoices {
  ok: 'choose';
  reason: string;
  choices: readonly unknown[];
  facts?: unknown;
}

/**
 * Everything a planner may answer: a plan, a refusal, a choice, or `null`
 * (nothing to say about this act).
 */
export type ActAnswer<
  B = undefined,
  F = undefined,
  X extends AnyActRefusal = AnyActRefusal,
  C extends AnyActChoices = never,
> = ActPlan<B, F, X> | X | C | null;
