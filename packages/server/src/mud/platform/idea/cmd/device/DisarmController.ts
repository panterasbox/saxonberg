/**
 * DisarmController — `disarm <trap>`: defuse a hazard you have found.
 *
 * **Found-gated (the honest-fog rule):** you can only disarm a trap you
 * have already *discovered* (`PerceptionApi.hasDiscovered`) — you must
 * perceive it to defuse it, and a trap you haven't spotted reads as "you
 * don't see that" (never a leak that a hidden trap is there). A trap
 * already sprung or already disarmed needs nothing.
 *
 * The act is a short, costed {@link HazardActivity} holding the disarmer's
 * `hands` slot for `hazard.disarmSeconds` game-time and resolving at
 * completion (the `search` precedent) — so a barge-in mid-work aborts it
 * and the trap stays live. On completion it flips the hazard to
 * `disarmed` and mints an `awareness`-graded `ActSignature` deed (the act
 * is *graded by* the disarmer's awareness competence).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Hazard } from '../../../../lib/hazard/Hazard';
import type { AbortReason } from '@saxonberg/types';
import { MqlApi } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { PerceptionApi } from '../../../../api/perception';
import { AdvancementApi } from '../../../../api/advancement';
import { SchedulerApi } from '../../../../api/scheduler';
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { Mml } from '../../../../api/mml';
import { HazardActivity, HAZARD_DISARM_TYPE } from '../../../../lib/hazard/HazardActivity';

const TOPIC = 'act.deed';

/** `hazard.disarmSeconds` fallback (game-seconds). */
const DEFAULT_DISARM_SECONDS = 5;

interface DisarmModel extends CommandModel {
  target?: MqlOneResult;
}

export default class DisarmController extends CommandController<DisarmModel> {
  async execute(model: DisarmModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const target = model.target;

    if (target === undefined || (target.stuff === null && !target.raw)) {
      this.reject(actor, context, Mml.compose`Disarm what?`, 'missing-target');
      return;
    }
    if (target.stuff === null) {
      this.reject(
        actor,
        context,
        Mml.compose`You don't see any '${target.raw}' to disarm.`,
        'empty-result',
      );
      return;
    }

    const hazard = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff & Hazard => MixinApi.isHazard(s),
    );
    if (!hazard) {
      this.reject(
        actor,
        context,
        Mml.compose`That isn't something you can disarm.`,
        'not-a-hazard',
      );
      return;
    }

    const trap = hazard as unknown as Stuff;

    // Found-gate: you must have discovered it to defuse it. Anything not
    // yet discovered reads as "you don't see that" — no leak.
    if (!PerceptionApi.hasDiscovered(actor, trap)) {
      this.reject(
        actor,
        context,
        Mml.compose`You don't see any '${target.raw}' to disarm.`,
        'not-found',
      );
      return;
    }

    if (!hazard.isArmed()) {
      this.reject(
        actor,
        context,
        Mml.compose`It has already been dealt with.`,
        'not-armed',
      );
      return;
    }

    // Warm the `awareness` band so the completion's graded deed reads a
    // live competence snapshot.
    await PerceptionApi.preloadForSenseGate(actor);

    const durationMs = this.disarmSeconds() * 1000;
    const onComplete = (): void => {
      // Re-check: another party may have sprung / defused it meanwhile.
      if (!hazard.isArmed()) return;
      // The disarm interaction (state flip + narration) is a side effect of
      // the hazard's identity, so it lives on the hazard interface. The
      // controller owns only the actor-side command machinery — here,
      // crediting the graded deed. Fire-and-forget (the onComplete is sync);
      // a disconnected Transcript must not surface as an unhandled rejection.
      hazard.disarmBy(actor);
      void AdvancementApi.recordDeed(actor, {
        discipline: 'awareness',
        difficulty: 'standard',
        outcome: 'success',
      }).catch(() => {});
    };

    // No engagement capacity (bare fixture / sessile actor) → resolve now
    // (the SearchActivity degenerate-fallback pattern).
    if (!MixinApi.isEngaged(actor)) {
      onComplete();
      return;
    }

    const activity = new HazardActivity({
      actor,
      type: HAZARD_DISARM_TYPE,
      durationMs,
      slots: ['hands'],
      onComplete,
      onAbort: (_reason: AbortReason): void => {
        MessageApi.scene(actor)
          .topic(TOPIC)
          .toSelf(Mml.compose`Your work on the trap is interrupted.`)
          .send();
      },
      host: trap,
    });

    const result = SchedulerApi.start(activity);
    if (
      result.ok &&
      (result.status === 'started' || result.status === 'replaced')
    ) {
      context.note(result.note);
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You set to work disarming ${Mml.thing(trap)}.`)
        .toPeers(
          Mml.compose`${Mml.actor(actor)} sets to work on ${Mml.thing(trap)}.`,
        )
        .send();
      return;
    }
    if (result.ok && result.status === 'completed-sync') {
      return; // onComplete already ran (incl. its own render)
    }
    if (!result.ok && result.reason === 'engagement-conflict') {
      this.reject(
        actor,
        context,
        Mml.compose`Your hands are busy with something else.`,
        'engagement-conflict',
      );
      return;
    }
    this.reject(
      actor,
      context,
      Mml.compose`You can't disarm it just now.`,
      'start-rejected',
    );
  }

  private reject(
    actor: Stuff,
    context: CommandContext,
    line: Mml,
    reason: string,
  ): void {
    MessageApi.scene(actor).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  private disarmSeconds(): number {
    try {
      const raw = AppApi.setting(AppSettingKeys.hazardDisarmSeconds);
      if (raw === '' || raw == null) return DEFAULT_DISARM_SECONDS;
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_DISARM_SECONDS;
    } catch {
      return DEFAULT_DISARM_SECONDS;
    }
  }
}
