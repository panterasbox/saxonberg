/**
 * AnchorController — `anchor`: stop the craft where it is (maritime D6).
 *
 * Leaves the voyage without arriving anywhere. ⛔ It mints no place: the
 * deck's gunwale simply reads the water wherever the craft now lies, which
 * is what makes fishing on open water work. `course` takes you back out.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type Place from '../../../../lib/stuff/Place';
import { MixinApi } from '../../../../api/mixin';
import { ExpanseApi } from '../../../../api/expanse';
import type { AnchorRefusal, Anchoring } from '../../../../lib/expanse/Anchoring';

/**
 * ⭐ The craft decides (controller-liquidity W8): who may take the helm,
 * whether she is under way, whether a killick holds are `Anchoring`'s. This
 * finds the craft — the boat you sit in, else the ship you are aboard — and
 * words the answer.
 */
export default class AnchorController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    // ⭐ A small boat's anchor (river D23): the boat you are sitting in lets
    // go her own — a killick — when she carries one. The act is the same as
    // a ship's; what affords it differs.
    const giver = context.commandGiver;
    const boat = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    let answer = boat !== null && MixinApi.isAnchoring(boat) ? await boat.anchorPlanFor(giver) : null;
    if (answer === null) {
      const craft = await this.craftOf(giver);
      answer = craft !== null ? await craft.anchorPlanFor(giver) : null;
    }
    if (answer === null) {
      return this.decline(context, 'You are not aboard anything that sails.', 'not-aboard');
    }
    if (!answer.ok) return this.declineWith(context, answer);
    const out = await answer.onComplete();
    if (!out.ok) return this.declineWith(context, out);
    MessageApi.scene(giver)
      .topic('act.move')
      .toSelf(
        out.facts.line !== null
          ? Mml.compose`${out.facts.line}`
          : Mml.compose`You let go the anchor. She lies where she is, and the water goes on past her.`,
      )
      .send();
  }

  /** The craft the giver is aboard — their root container's craft. */
  private async craftOf(giver: Stuff): Promise<(Stuff & Anchoring) | null> {
    const root = MixinApi.isContainable(giver) ? giver.getRootContainer() ?? giver : giver;
    // The place is asked (a keyed room's craft is its warren's ship).
    const craft = root.isPlace()
      ? await (root as unknown as Place).craftHere()
      : await ExpanseApi.craftAt(root.getIdentityPath() ?? '');
    return craft && MixinApi.isAnchoring(craft) ? craft : null;
  }

  /** ⭐ Every refusal `anchor` can say. */
  private declineWith(context: CommandContext, r: AnchorRefusal): void {
    switch (r.reason) {
      case 'not-her-master':
        return this.decline(context, 'Only her master takes the helm — charter her, or be appointed to command her.', r.reason);
      case 'not-under-way':
        return this.decline(context, 'You are not under way.', r.reason);
      case 'anchor-drags':
        return this.decline(context, r.facts.line, r.reason);
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  private decline(context: CommandContext, text: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(text)).send();
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
