/**
 * AssayController — `assay <samples> [at <bench>]`.
 *
 * ⭐⭐ **The mill's shape.** Hand the samples over, pay, and go: the world
 * clock carries the fire, and the papers are there when you come back. No
 * engagement, no standing and watching — the point of an assay is that it
 * is the part of prospecting you are NOT doing while it happens.
 *
 * ⭐ I/O over the instrument's own protocol ({@link Assaying.assayPlanFor},
 * controller-liquidity W9): the kit and the bench differ in time, fee and
 * ceiling, and those, the queue, the house's assayer, the fee and the papers
 * are the instrument's. This file binds the instrument and words the answer.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import {
  ASSAYING_MIXIN,
  type Assaying,
  type AssayRefusal,
  type AssayTaken,
} from '../../../lib/Assaying';

type Composed = ReturnType<typeof Mml.compose>;

const TOPIC = 'act.deed';

interface AssayModel extends CommandModel {
  samples?: MqlManyResult;
  bench?: MqlOneResult;
}

export default class AssayController extends CommandController<AssayModel> {
  async execute(model: AssayModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const bound = model.bench?.stuff ?? null;
    if (!bound || !MixinApi.isActive(bound, ASSAYING_MIXIN)) {
      // ⚠ Names A BENCH and a kit, never a PLACE — a trade controller that
      // named a locality's content would be wrong in a second world. And
      // deliberately not "nothing here…", which a drive reads as a parse miss.
      AssayController.decline(
        context,
        Mml.compose`Nothing within reach could run an assay. It wants an assay bench, or an assayer’s kit of your own.`,
        'no-bench',
      );
      return;
    }
    const instrument = bound as Stuff & Assaying;
    const plan = await instrument.assayPlanFor(giver, model.samples?.stuff ?? []);
    if (!plan.ok) {
      AssayController.decline(context, AssayController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose``,
      onRefused: (r) => AssayController.refusalWords(r),
      onDone: (d) => AssayController.takenWords(d, giver),
    });
  }

  protected static decline(context: CommandContext, prose: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /** ⭐ Every reason the instrument will not take the batch (D4). */
  protected static refusalWords(r: AssayRefusal): Composed {
    switch (r.reason) {
      case 'no-samples':
        return Mml.compose`Assay what? A sample is a piece you took and noted — \`sample\` first.`;
      case 'no-room':
        return Mml.compose`You are nowhere to leave them.`;
      case 'cannot-pay':
        return r.facts.assayer
          ? Mml.compose`${Mml.actor(r.facts.assayer)} names a price of ${String(r.facts.fee)} and you cannot meet it. Your samples stay in your hands.`
          : Mml.compose`The price chalked by the bench is ${String(r.facts.fee)}, and you cannot meet it. Your samples stay in your hands.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  protected static takenWords(d: AssayTaken, giver: Stuff): { self: Composed; peers?: Composed } {
    if (d.kind === 'queued') {
      return {
        self: Mml.compose`The slate has ${String(d.ahead)} ahead of you. Yours goes on when the fire is free — roughly ${AssayController.hours(d.seconds * (d.ahead + 1))}.`,
      };
    }
    return {
      self: d.fixed
        ? Mml.compose`You set ${String(d.count)} in the bins and light the muffle. ${AssayController.hours(d.seconds)}, and you need not stand over it.`
        : Mml.compose`You set your kit up and start the first of ${String(d.count)}. ${AssayController.hours(d.seconds)}, and slower than a proper bench.`,
      peers: Mml.compose`${Mml.actor(giver)} sets samples to assay.`,
    };
  }

  /** Game-time in the words a person uses. */
  protected static hours(seconds: number): string {
    const h = seconds / 3600;
    if (h < 1) return `${Math.round(seconds / 60)} minutes`;
    if (h < 2) return 'about an hour';
    return `about ${Math.round(h)} hours`;
  }
}
