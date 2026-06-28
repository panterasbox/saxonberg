/**
 * CancelController — the `cancel` verb.
 *
 * Two shapes:
 *   - bare `cancel`        → SchedulerApi.cancelAll(actor).
 *   - `cancel <type>`      → SchedulerApi.cancelByType(actor, type).
 *
 * The argument is a plain string (slate § Cancel semantics —
 * "operates on the actor's `engagements` map, not on world objects").
 * No MQL resolution.
 *
 * No `requiresEngaged` validator: every v1 `CommandGiver` is a
 * `Character`, and every `Character` composes `EngagedMixin`. The
 * validator would always pass; we'd ship dead code. Re-add when a
 * non-Character CommandGiver lands.
 *
 * Wave 1 ships with no v1 activities registered — bare `cancel`
 * narrates "you cancel what you were doing" (a no-op against an
 * empty engagement map); `cancel <type>` against an unknown type
 * emits an `empty-result` note and "you aren't <type>"-style prose.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { SchedulerApi } from '../../../api/scheduler';
import { ScriptApi } from '../../../api/script';

interface CancelModel extends CommandModel {
  type?: string;
}

export default class CancelController extends CommandController<CancelModel> {
  execute(model: CancelModel, ctx: CommandContext): void {
    const giver = ctx.commandGiver;

    // Defensive narrow — Character composes EngagedMixin so this
    // should always succeed for v1 callers. If it doesn't, an
    // unexpected CommandGiver lacks the mixin; emit a structured
    // note and fall through cleanly rather than throw.
    if (!MixinApi.isEngaged(giver)) {
      ctx.note({ kind: 'mixin-missing', mixin: 'EngagedMixin' });
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You can't cancel anything.`)
        .send();
      return;
    }

    const targetType = model.type?.trim();

    if (!targetType) {
      SchedulerApi.cancelAll(giver);
      // Barge-in: stop any running script too (its in-flight engaged step
      // aborts; partial matter stands, no rollback).
      ScriptApi.cancelAll('barge-in');
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You cancel what you were doing.`)
        .send();
      return;
    }

    const before = SchedulerApi.getEngagements(giver).length;
    SchedulerApi.cancelByType(giver, targetType);
    const after = SchedulerApi.getEngagements(giver).length;

    if (before === after) {
      ctx.note({
        kind: 'empty-result',
        field: 'type',
        query: targetType,
      });
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You aren't ${targetType}.`)
        .send();
      return;
    }

    MessageApi.scene(giver)
      .topic('world.narration.action')
      .toSelf(Mml.compose`You stop ${targetType}.`)
      .send();
  }
}
