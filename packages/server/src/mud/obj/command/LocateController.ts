/**
 * LocateController — report the containment chain of `<target>`,
 * outermost zone last (read inside-out, like a path).
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { DescribeApi } from '../../api/describe';
import type { Stuff } from '../../lib/stuff/Stuff';

interface LocateModel extends CommandModel {
  target?: MqlOneResult;
}

export class LocateController extends CommandController<LocateModel> {
  execute(model: LocateModel, context: CommandContext): CommandResult {
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(context, `no match for target`);
    }
    const chain: string[] = [];
    let cursor: Stuff | null = target.stuff;
    while (cursor) {
      chain.push(DescribeApi.getDisplayName(cursor, '?'));
      const next: Stuff | null | undefined = (
        cursor as unknown as {
          getEnvironment?: () => Stuff | null;
        }
      ).getEnvironment?.();
      const prior = cursor;
      cursor = next ?? null;
      if (cursor === null) {
        const zone = (prior as unknown as {
          getZone?: () => Stuff | null;
        }).getZone?.();
        if (zone && !chain.includes(DescribeApi.getDisplayName(zone, '?'))) {
          chain.push(DescribeApi.getDisplayName(zone, '?'));
        }
      }
    }
    const display =
      chain.length > 1
        ? `in: ${chain.slice(1).join(' > ')}`
        : '(no containing context)';
    this.tell(
      context,
      `\n${chain[0]}\n${display}\n`,
    );
    return { success: true, summary: chain.join(' > ') };
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.locate)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }
}
