/**
 * SubjectControllerBase — what the `subject` subcommands share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun): owning a subject's identity + audience binding.
 * Surfaces (chat / forum) light up separately via `chat on` / `forum on`.
 * `make` is `SubjectMakeController`, `list` is `SubjectListController`.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

export interface SubjectModel extends CommandModel {
  name?: string;
  group?: string;
  open?: boolean;
}

export abstract class SubjectControllerBase extends CommandController<SubjectModel> {
  protected static fail(context: CommandContext, detail: string, reason: string): void {
    SubjectControllerBase.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  protected static send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(body)
      .send();
  }
}
