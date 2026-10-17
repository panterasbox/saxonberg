/**
 * IceActController — the shared shape of `scrape` and `mark` (storage-and-ice
 * D19). ⚠ Dumb: it takes the room's floor, asks it whether it is a sheet
 * you can work (the water pack's `IceSheet`), and hands the act to the
 * sheet's own method — the sheet refuses an actor it is not holding up, a
 * patch that is open, a plough with no horse. A base class only.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import IceSheet from '@saxonberg/content-water/src/thing/IceSheet';

export const ICE_TOPIC = 'act.deed';

export interface IceActModel extends CommandModel {
  patch?: string;
  tool?: MqlManyResult;
}

export abstract class IceActController extends CommandController<IceActModel> {
  /** The capability the act's tool offers. */
  protected abstract capability(): string;
  /** Perform the act on the sheet. */
  protected abstract perform(sheet: IceSheet, actor: Stuff, tool: Stuff, raw: string | null): { ok: boolean; line: string };
  /** What the peers see. */
  protected abstract peersLine(actor: Stuff): ReturnType<typeof Mml.compose>;

  async execute(model: IceActModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    const tool = (model.tool?.stuff ?? []).find(
      (t) => MixinApi.isTool(t) && t.hasCapability(this.capability()),
    ) as Stuff | undefined;
    if (!tool) {
      return this.refuse(context, ICE_TOPIC, 'You have nothing to do that with.', 'no-tool');
    }
    const room = MixinApi.isContainable(actor) ? actor.getContainer() : null;
    const floor = (room as unknown as { getFloor?(): unknown } | null)?.getFloor?.() ?? null;
    if (!(floor instanceof IceSheet)) {
      return this.refuse(context, ICE_TOPIC, 'There is no ice here to work.', 'no-ice');
    }
    const raw = model.patch?.trim() || null;
    const out = this.perform(floor, actor, tool, raw);
    if (!out.ok) return this.refuse(context, ICE_TOPIC, out.line, 'refused');
    MessageApi.scene(actor)
      .topic(ICE_TOPIC)
      .toSelf(Mml.compose`${out.line}`)
      .toPeers(this.peersLine(actor))
      .send();
  }
}
