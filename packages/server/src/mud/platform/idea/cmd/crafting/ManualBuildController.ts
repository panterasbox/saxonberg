/**
 * ManualBuildController — shared base for the manual cocktail-build verbs
 * (`pour`/`add`, `stir`/`shake`, `strain`, `garnish`).
 *
 * Holds the one thing they all share: turning a step into an **engaged
 * activity**. `engageStep` constructs a {@link ManualBuildStep}, starts
 * it through `SchedulerApi` (which owns the `hands` slot + the game-clock
 * timer), and renders the begin / busy / rejected scenes — the per-step
 * effect (debit + bank, record method, mint) is the `onComplete` closure
 * the verb controller supplies, applied **at completion** so a barge-in
 * leaves partial matter standing. Extends {@link CraftController} so the
 * step verbs share the family's decline rendering (and `repair` — an
 * engaged act since the capability-table build — its deed-free gates).
 * Also holds the shared capability-instrument helpers: `bestInstrument`
 * (the best-rated of the tools the binder bound for a kind) and `paceMs`
 * (the conferring kind's work-rate divides the step's base duration).
 * Not referenced by any YAML — a base class only.
 */

import { CraftController } from "./CraftController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlManyResult } from "../../../../api/mql";
import type { AbortReason } from "@saxonberg/types";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Tooled } from "../../../../lib/craft/Tooled";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { SchedulerApi } from "../../../../api/scheduler";
import { ManualBuildStep } from "../../../../lib/craft/ManualBuildStep";

const STEP_TOPIC = "act.deed";

type Composed = ReturnType<typeof Mml.compose>;

export interface BuildStepOptions {
  /** Game-time the step occupies the `hands` slot, in (game) ms. */
  durationMs: number;
  /**
   * ⭐ Metabolic watts the step costs its actor for its duration —
   * REQUIRED, so the compiler is the census of every step verb. Under
   * ~300 W (a walk) it costs no endurance; above, the excess debits, and
   * the body refuses a step that would leave it under the exhaustion
   * floor. See `lib/exertion/Exerting.ts`.
   */
  effortW: number;
  /** Self-prose shown when the step begins. */
  beginSelf: Composed;
  /** Optional peer-prose shown when the step begins. */
  beginPeers?: Composed;
  /** The effect, applied at completion (debit + bank / record / mint). */
  onComplete: () => void;
  /** Optional abort handler; default no-op (nothing was mutated yet). */
  onAbort?: (reason: AbortReason) => void;
}

export abstract class ManualBuildController<
  M extends CommandModel,
> extends CraftController<M> {
  /**
   * Start `opts`'s step as an engaged activity on the giver's `hands`
   * slot. On `started`, narrates the begin scene and rides the
   * engagement-started note; the effect lands when the timer completes.
   * On `completed-sync` (a sub-100ms step), the effect already ran. On a
   * slot conflict, declines diegetically. A giver with no engagement
   * capacity applies the effect immediately (degenerate fallback).
   */
  protected engageStep(context: CommandContext, opts: BuildStepOptions): void {
    const giver = context.commandGiver;
    // The double shift: a body too tired to finish the step does not
    // start it. The mixin owns the one refusal line.
    if (
      MixinApi.isExerting(giver) &&
      !giver.canExert(opts.effortW, opts.durationMs / 1000)
    ) {
      this.declineStep(context, Mml.fromMarkup(giver.exhaustionRefusal()), "too-tired");
      return;
    }
    if (!MixinApi.isEngaged(giver)) {
      opts.onComplete();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ["hands"],
      durationMs: opts.durationMs,
      effortW: opts.effortW,
      onComplete: opts.onComplete,
      onAbort: opts.onAbort,
    });
    const result = SchedulerApi.start(step);

    if (result.ok && (result.status === "started" || result.status === "replaced")) {
      context.note(result.note);
      const scene = MessageApi.scene(giver).topic(STEP_TOPIC).toSelf(opts.beginSelf);
      if (opts.beginPeers) scene.toPeers(opts.beginPeers);
      scene.send();
      return;
    }
    if (result.ok && result.status === "completed-sync") {
      return; // onComplete already ran (incl. its own done scene)
    }
    if (!result.ok && result.reason === "engagement-conflict") {
      MessageApi.scene(giver)
        .topic(STEP_TOPIC)
        .toSelf(Mml.compose`Your hands are busy with something else.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "engagement-conflict",
        detail: "busy",
      });
      return;
    }
    // start-rejected
    MessageApi.scene(giver)
      .topic(STEP_TOPIC)
      .toSelf(Mml.compose`You can't manage that just now.`)
      .send();
    context.note({
      kind: "controller-rejected",
      reason: "start-rejected",
      detail: !result.ok && result.reason === "start-rejected" ? result.error.message : "",
    });
  }

  /**
   * The BEST of the instruments the binder bound for `cap` — the one
   * with the highest work-rate; first wins a tie.
   *
   * ⭐⭐ This is a NARROWING, not a search. The view declares the arg
   * (`default: "reachable:[capability.weaving]"`, `type: objects`) and
   * the binder resolves every reachable thing offering the kind; what
   * is left for the controller is the question no predicate can ask —
   * *which of these is best* — and that is all this does. It used to be
   * `findCapability(giver, cap)`: a walk over the actor's kit and the
   * room, hoisted into this base class so that fourteen controllers
   * across six packs hunted for their instrument through one method
   * `lint:instrument-args` could not see. See that gate's header.
   *
   * ⚠⚠ **Best by rate, not first found, and the difference was a bug in
   * every trade.** First-found with held kit scanned first picked a
   * carried drop spindle over the room's spinning wheel, a sewing kit
   * over the machine, shears over the cutting table: the whole build's
   * tool ladder is "rung zero is portable and bad; rung one is fixed
   * and good", and first-found inverted it — **carrying your cheap tool
   * made you worse off than leaving it at home**, silently, because a
   * slower step is not an error.
   *
   * ⭐ Ties keep binder order, and `reachable` emits held gear first —
   * so held-first survives where the rungs are equal, and nothing moves
   * that the rate does not move.
   *
   * ⚠ Ranked on RATE only. `control` is a separate axis a step may read
   * for quality (see `cut`'s waste), and folding the two into one score
   * would silently trade somebody's cloth for their time.
   */
  protected bestInstrument(
    bound: MqlManyResult | undefined,
    cap: string,
  ): (Stuff & Tooled) | null {
    let best: (Stuff & Tooled) | null = null;
    let bestRate = -Infinity;
    for (const c of bound?.stuff ?? []) {
      if (!MixinApi.isTool(c) || !c.hasCapability(cap)) continue;
      const rate = c.capabilityRate(cap);
      if (rate > bestRate) {
        best = c;
        bestRate = rate;
      }
    }
    return best;
  }

  /**
   * The conferring kind paces the step: `baseMs` divided by the best
   * work-rate the instrument offers across `kinds` (a masterwork anvil
   * paces `hammer`; the `striking` hammer is a requirement, not a
   * pacer). Rate 1 — base duration — when no instrument resolves or it
   * isn't a tool; `capabilityRate` is clamped, so data can't zero it.
   */
  protected paceMs(
    baseMs: number,
    instrument: Stuff | null,
    kinds: string[],
  ): number {
    if (!instrument || !MixinApi.isTool(instrument)) return baseMs;
    let best: number | null = null;
    for (const kind of kinds) {
      if (!instrument.hasCapability(kind)) continue;
      const rate = instrument.capabilityRate(kind);
      best = best === null ? rate : Math.max(best, rate);
    }
    return Math.round(baseMs / (best ?? 1));
  }

  /** Decline diegetically with a one-line scene + a rejection note. */
  protected declineStep(
    context: CommandContext,
    line: Composed,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(STEP_TOPIC).toSelf(line).send();
    context.note({ kind: "controller-rejected", reason, detail: "" });
  }
}
