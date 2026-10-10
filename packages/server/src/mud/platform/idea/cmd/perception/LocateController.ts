/**
 * LocateController — report the containment chain of `<target>`,
 * outermost zone last (read inside-out, like a path).
 *
 * ⭐ At sea there is no chain worth the name, so it answers with the
 * RECKONING — and says that is what it is (maritime D11). `locate` is a
 * perception verb: reporting what you perceive rather than the truth is
 * already its contract, so the true position is never printed.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ExpanseApi } from '../../../../api/expanse';

interface LocateModel extends CommandModel {
  target?: MqlOneResult;
}

export default class LocateController extends CommandController<LocateModel> {
  async execute(model: LocateModel, context: CommandContext): Promise<void> {
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(context, `no match for ${target?.raw ?? '?'}`);
    }
    const chain: string[] = [];
    let cursor: Stuff | null = target.stuff;
    while (cursor) {
      chain.push(cursor.getPresentation());
      const next: Stuff | null = MixinApi.isContainable(cursor)
        ? cursor.getContainer()
        : null;
      const prior = cursor;
      cursor = next;
      if (cursor === null) {
        const zone = prior.getZone();
        if (zone && !chain.includes(zone.getPresentation())) {
          chain.push(zone.getPresentation());
        }
      }
    }
    const display =
      chain.length > 1
        ? `in: ${chain.slice(1).join(' > ')}`
        : '(no containing context)';
    const atSea = await this.reckoningOf(target.stuff, context.commandGiver);
    this.tell(
      context,
      `\n${chain[0]}\n${display}\n${atSea ? `${atSea}\n` : ''}`,
    );
    return;
  }

  /**
   * The reckoning of the craft `target` is aboard, in the reader's words,
   * or `null` ashore. Never the true position.
   */
  private async reckoningOf(target: Stuff, reader: Stuff): Promise<string | null> {
    const root = MixinApi.isContainable(target) ? target.getRootContainer() ?? target : target;
    const craft = await ExpanseApi.craftAt(root.getTemplatePath() ?? '');
    if (!craft || !MixinApi.isVoyaging(craft)) return null;
    const reckoned = craft.reckonedNow();
    const plot = craft.getPlot();
    if (reckoned === null) return null;
    const band = MixinApi.isAdvancing(reader)
      ? await reader.competenceBandFor('navigation')
      : 'untrained';
    const bracket = plot ? plot.statedBracket(craft.reckoningUncertaintyNm(), band) : 'exactly';
    return `at sea, by reckoning: ${reckoned.toString()} — ${bracket}.`;
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('sense.survey')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
    return;
  }
}
