/**
 * IceActController — the shared shape of `scrape` and `groove` (storage-and-ice
 * D19). ⚠ Dumb: it takes the room's floor — the water pack's `IceSheet` —
 * asks it for its plan of this act (its own method: `groovePlan` /
 * `scrapePlan`; one
 * host each, so a method and not a protocol — controller-liquidity D14),
 * and words what comes back. The sheet decides: it refuses an actor it is
 * not holding up, a patch that is open, a plough with no horse. A base
 * class only.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActPlan } from '@saxonberg/server/mud/lib/craft/ActPlan';
import IceSheet, {
  type GrooveDone,
  type GrooveRefusal,
  type ScrapeDone,
  type ScrapeRefusal,
} from '@saxonberg/content-water/src/thing/IceSheet';
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

/** The two ice acts: what each lands as, and every reason it refuses. */
export interface IceActs {
  groove: { done: GrooveDone; refusal: GrooveRefusal };
  scrape: { done: ScrapeDone; refusal: ScrapeRefusal };
}
export type IceVerb = keyof IceActs;

export abstract class IceActController<V extends IceVerb> extends CommandController<IceActModel> {
  /** ⭐ The sheet's plan of this act — its own method; the sheet decides. */
  protected abstract planOn(
    sheet: IceSheet,
    actor: Stuff,
    tool: Stuff,
    patch: string | null,
  ): ActPlan<undefined, IceActs[V]['done'], IceActs[V]['refusal']>;
  /** The capability the act's tool offers. */
  protected abstract capability(): string;
  /** ⭐ The words for every reason the sheet refuses this act (D4). */
  protected abstract refusalWords(out: IceActs[V]['refusal']): string;
  /** What the actor reads when it is done. */
  protected abstract doneWords(facts: IceActs[V]['done']): string;
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
    if (!(floor instanceof IceSheet)) {
      return this.refuse(context, ICE_TOPIC, 'There is no ice here to work.', 'no-ice');
    }
    // ⭐ An instant act: it lands now, inside the command frame.
    const out = await this.planOn(floor, actor, tool, model.patch?.trim() || null).onComplete();
    if (!out.ok) return this.refuse(context, ICE_TOPIC, this.refusalWords(out), out.reason);
    MessageApi.scene(actor)
      .topic(ICE_TOPIC)
      .toSelf(Mml.compose`${this.doneWords(out.facts)}`)
      .toPeers(this.peersLine(actor))
      .send();
  }
}
