/**
 * IceActController — the shared shape of `scrape` and `groove` (storage-and-ice
 * D19). ⚠ Dumb: it takes the room's floor, asks it — a `Cuttable` floor —
 * for its plan of this act (`cutPlan({verb})`, controllers-are-io D8c; the
 * water pack's `IceSheet` answers), lands the instant plan, and words what
 * comes back. The sheet decides: it refuses an actor it is not holding up,
 * a patch that is open, a plough with no horse. A base class only.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CutAnswerFor, CutAnswers } from '@saxonberg/server/mud/lib/craft/Cuttable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import IceMarker from '../thing/IceMarker';

const ICE_TOPIC = 'act.deed';

type Composed = ReturnType<typeof Mml.compose>;

export interface IceActModel extends CommandModel {
  patch?: string;
  tool?: MqlManyResult;
}

/** The two ice acts. */
export type IceVerb = 'groove' | 'scrape';

export abstract class IceActController<V extends IceVerb> extends CommandController<IceActModel> {
  /** The act this controller asks the sheet for. */
  protected abstract verb(): V;
  /** The capability the act's tool offers. */
  protected abstract capability(): string;
  /** ⭐ The words for every reason the sheet refuses this act (D4). */
  protected abstract refusalWords(out: CutAnswers[V]['refusal']): string;
  /** What the actor reads when it is done. */
  protected abstract doneWords(facts: CutAnswers[V]['done']): string;
  /** What the peers see. */
  protected abstract peersLine(actor: Stuff): Composed;

  async execute(model: IceActModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    // ⭐ A hand tool before a draught one: a cutter holding both a hand
    // marker and the plough marks by hand, rather than being refused for
    // having no horse (the pre-merge audit).
    const able = (model.tool?.stuff ?? []).filter((t) => MixinApi.isTool(t) && t.hasCapability(this.capability()));
    const tool = (able.find((t) => !(t instanceof IceMarker) || t.getDraught() === 'hand') ?? able[0]) as Stuff | undefined;
    if (!tool) {
      return this.refuse(context, ICE_TOPIC, 'You have nothing to do that with.', 'no-tool');
    }
    const room = MixinApi.isContainable(actor) ? actor.getContainer() : null;
    const floor = room ? (MixinApi.isAdornable(room) ? room.getFloor() : null) : null;
    if (floor === null || !MixinApi.isCuttable(floor)) {
      return this.refuse(context, ICE_TOPIC, 'There is no ice here to work.', 'no-ice');
    }
    const verb = this.verb();
    const answer = await floor.cutPlan({
      verb,
      actor,
      tools: [tool],
      raw: model.patch?.trim() || null,
      length: null,
      options: {},
    });
    if (answer.verb !== verb) {
      throw new TypeError(`IceActController: the floor answered '${answer.verb}' to a ${verb}`);
    }
    const plan = answer as CutAnswerFor<V>;
    // `not-cuttable` is the floor that is no ice at all (the protocol's default).
    if (!plan.ok) {
      if (plan.reason === 'not-cuttable') return this.refuse(context, ICE_TOPIC, 'There is no ice here to work.', 'no-ice');
      return this.refuse(context, ICE_TOPIC, this.refusalWords(plan), plan.reason);
    }
    // ⭐ An instant act: the plan lands now, inside the command frame.
    const out = await plan.onComplete();
    if (!out.ok) return this.refuse(context, ICE_TOPIC, this.refusalWords(out), out.reason);
    MessageApi.scene(actor)
      .topic(ICE_TOPIC)
      .toSelf(Mml.compose`${this.doneWords(out.facts)}`)
      .toPeers(this.peersLine(actor))
      .send();
  }
}
