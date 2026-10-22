/**
 * PullController — `pull [<thing>] [up|down]` (underwater D19; `haul`
 * until review): ONE verb over the `Pullable` protocol. The thing
 * decides; the verb renders.
 *
 * With nothing named, the one thing on a line within reach. ⭐ A pull
 * that takes time (a diver brought up hand over hand) runs as a timed
 * step on the puller's hands and lands at completion.
 *
 * ⭐ Anything in water that is not itself on a line — a swimmer, a body,
 * an oar going by — is the WATER's to give up (river D22, review): the
 * name is asked of each water within the puller's reach (here, the water
 * their boat floats on, one way off), the way a thrown line finds who it
 * is thrown to; `reachable` cannot see the water below a bank.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { PullOutcome, PullSense } from '../../../../lib/spatial/Pullable';
import type { WaterPlace } from '../../../../lib/location/WaterPlace';
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
    const named = (model.target?.raw ?? '').trim();
    let target: Stuff | null = model.target?.stuff ?? null;
    if (target === null && named === '') {
      const reach = MqlApi.resolveMany('reachable', { commandGiver: giver, scope: 'reachable' });
      target = (reach.stuff ?? []).find((s) => MixinApi.isPullable(s)) ?? null;
      if (target === null) {
        return this.refuse(context, 'act.deed', 'There is nothing here on a line to pull.', 'nothing-to-pull');
      }
    }
    if (target === null || !MixinApi.isPullable(target)) {
      // Not on a line: whatever water it is in gives it up, by hand.
      const inWater = target !== null && MixinApi.isContainable(target) ? target.getContainer() : null;
      if (target !== null && inWater !== null && MixinApi.isWaterPlace(inWater)) {
        return this.run(context, giver, await inWater.pullOut(target, giver));
      }
      for (const water of watersWithinReach(giver)) {
        const load = water.loadNamed(giver, named);
        if (load === null) continue;
        return this.run(context, giver, await water.pullOut(load, giver));
      }
      if (target !== null) {
        return this.refuse(context, 'act.deed', `You can't pull ${target.getPresentation()}.`, 'not-pullable');
      }
      return this.refuse(context, 'act.deed', `You see no ${named} to pull.`, 'nothing-to-pull');
    }
    const word = (model.sense ?? '').trim().toLowerCase();
    if (word !== '' && word !== 'up' && word !== 'down') {
      return this.refuse(context, 'act.deed', 'Pull it up, or down?', 'which-way');
    }
    const sense: PullSense | null = word === '' ? null : (word as PullSense);
    return this.run(context, giver, await target.pullBy(giver, sense));
  }

  /** Say what the pull did, and run it on the puller's hands if it takes time. */
  private async run(context: CommandContext, giver: Stuff, out: PullOutcome): Promise<void> {
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

/**
 * The waters a puller can get a hand into: the one they are in, the one
 * their boat floats on, and any one way off. Each answers for its own reach.
 */
function watersWithinReach(giver: Stuff): Array<Stuff & WaterPlace> {
  const out: Array<Stuff & WaterPlace> = [];
  const add = (x: unknown): void => {
    const s = x as Stuff | null;
    if (s && MixinApi.isWaterPlace(s) && !out.includes(s)) out.push(s);
  };
  const at = MixinApi.isContainable(giver) ? (giver.getContainer() as unknown as Stuff | null) : null;
  if (at === null) return out;
  add(at);
  if (MixinApi.isContainable(at)) add(at.getContainer());
  if (MixinApi.isExitable(at)) for (const { dest } of at.getObviousNeighbours()) add(dest);
  return out;
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
