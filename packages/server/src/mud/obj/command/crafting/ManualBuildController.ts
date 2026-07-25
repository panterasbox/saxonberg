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
 * leaves partial matter standing. Not referenced by any YAML — a base
 * class only.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { AbortReason } from "@saxonberg/types";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Builds } from "../../../lib/craft/ManualBuild";
import { MixinApi } from "../../../api/mixin";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { SchedulerApi } from "../../../api/scheduler";
import { ManualBuildStep } from "../../../lib/craft/ManualBuildStep";

const STEP_TOPIC = "world.narration.action";

type Composed = ReturnType<typeof Mml.compose>;

export interface BuildStepOptions {
  /** Game-time the step occupies the `hands` slot, in (game) ms. */
  durationMs: number;
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
> extends CommandController<M> {
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
    if (!MixinApi.isEngaged(giver)) {
      opts.onComplete();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ["hands"],
      durationMs: opts.durationMs,
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
   * Find a reachable build vessel (the shaker/mixing glass) — held first,
   * then in the room — for the verbs that don't name one explicitly
   * (`add`, `stir`, bare `strain`).
   */
  protected findBuildVessel(giver: Stuff): (Stuff & Builds) | null {
    const candidates: Stuff[] = [];
    if (MixinApi.isContainer(giver)) {
      candidates.push(...giver.getContents());
    }
    if (MixinApi.isContainable(giver)) {
      const loc = giver.getContainer();
      if (loc && MixinApi.isContainer(loc)) {
        candidates.push(...loc.getContents());
      }
    }
    for (const c of candidates) {
      if (MixinApi.isBuildVessel(c)) return c;
    }
    return null;
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
