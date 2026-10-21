/**
 * PullController — `pull [<thing>] [up|down]` (underwater D19; `haul`
 * until review): ONE verb over the `Pullable` protocol. The thing
 * decides; the verb renders.
 *
 * With nothing named, the one thing on a line within reach. ⭐ A pull
 * that takes time (a diver brought up hand over hand) runs as a timed
 * step on the puller's hands and lands at completion.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { PullOutcome, PullSense } from '../../../../lib/spatial/Pullable';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { MqlApi } from '../../../../api/mql';
import { SchedulerApi } from '../../../../api/scheduler';
import { WorldClockApi } from '../../../../api/worldclock';
import { ManualBuildStep } from '../../../../lib/craft/ManualBuildStep';

interface PullModel extends CommandModel {
  target?: MqlOneResult;
  sense?: string;
}

export default class PullController extends CommandController<PullModel> {
  async execute(model: PullModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    let target: Stuff | null = model.target?.stuff ?? null;
    if (target === null && !model.target?.raw) {
      const reach = MqlApi.resolveMany('reachable', { commandGiver: giver, scope: 'reachable' });
      target = (reach.stuff ?? []).find((s) => MixinApi.isPullable(s)) ?? null;
    }
    if (target === null) {
      const named = model.target?.raw;
      return this.refuse(
        context, 'act.deed',
        named ? `You see no ${named} to pull.` : 'There is nothing here on a line to pull.',
        'nothing-to-pull',
      );
    }
    if (!MixinApi.isPullable(target)) {
      return this.refuse(context, 'act.deed', `You can't pull ${target.getPresentation()}.`, 'not-pullable');
    }
    const word = (model.sense ?? '').trim().toLowerCase();
    if (word !== '' && word !== 'up' && word !== 'down') {
      return this.refuse(context, 'act.deed', 'Pull it up, or down?', 'which-way');
    }
    const sense: PullSense | null = word === '' ? null : (word as PullSense);
    const out = await target.pullBy(giver, sense);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    say(giver, out);
    const takes = out.takes;
    if (takes === undefined) return;
    if (!(takes.realS > 0) || !MixinApi.isEngaged(giver)) {
      land(giver, await takes.finish());
      return;
    }
    const scale = WorldClockApi.getScale();
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: takes.realS * 1000 * (Number.isFinite(scale) && scale > 0 ? scale : 1),
      // ⚠ Never back into this controller: it is destructed when
      // `execute` returns (`lint:completion-this`).
      onComplete: () => {
        // ⚠ Outside any command: an unhandled rejection here would take
        // the server down. Log it; the line stays where it was.
        takes.finish().then((done) => land(giver, done)).catch((err) => {
          console.error('[timed pull] landing failed', err);
        });
      },
    });
    const started = SchedulerApi.start(step);
    if (!started.ok) {
      return this.refuse(context, 'act.deed', 'Your hands are already busy.', 'engagement-conflict');
    }
  }
}

/** What the pull said, to the puller and whoever is here. */
function say(giver: Stuff, out: PullOutcome & { ok: true }): void {
  const scene = MessageApi.scene(giver).topic('act.deed').toSelf(out.self);
  if (out.peers) scene.toPeers(out.peers);
  scene.send();
}

/** How a timed pull came out — landed, or refused at the last by the thing. */
function land(giver: Stuff, done: PullOutcome): void {
  if (done.ok) say(giver, done);
  else MessageApi.scene(giver).topic('act.deed').toSelf(done.line).send();
}
