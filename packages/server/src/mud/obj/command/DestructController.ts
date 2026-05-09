/**
 * DestructController — destruct a runtime instance or template.
 *
 * Positional `<target>` is `type: object` so the matcher resolves it
 * via MQL (drilled-and-broad scope). The MQL path-atom extension
 * (step 2) lets a bare path like `/obj/Avatar/foo` resolve to a
 * Template with no live clones — the destruct then removes the
 * template doc itself.
 *
 * `-f` routes to `StuffApi.forceDestruct` (admin-gated; v1 stub
 * always denies).
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
import { StuffApi } from '../../api/stuff';
import { DescribeApi } from '../../api/describe';

interface DestructModel extends CommandModel {
  target?: MqlOneResult;
  mql?: string;
  force?: boolean;
}

export class DestructController extends CommandController<DestructModel> {
  execute(model: DestructModel, context: CommandContext): CommandResult {
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(context, `no match for ${target?.raw ?? '?'}`);
    }
    const stuff = target.stuff;
    const name = DescribeApi.getDisplayName(stuff, '?');
    try {
      const fn = model.force ? StuffApi.forceDestruct : StuffApi.destruct;
      fn(stuff);
      this.tell(context, `\ndestructed ${name} (${stuff.stuffId})\n`);
      return { success: true, summary: `destructed ${name}` };
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }
}
