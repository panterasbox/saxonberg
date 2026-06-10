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
  } from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { StuffApi } from '../../api/stuff';
import { DescribeApi } from '../../api/describe';
import { AccessApi } from '../../api/access';
import { Zone } from '../../lib/zone/Zone';

interface DestructModel extends CommandModel {
  target?: MqlOneResult;
  force?: boolean;
}

export class DestructController extends CommandController<DestructModel> {
  async execute(model: DestructModel, context: CommandContext): Promise<void> {
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(context, `no match for ${target?.raw ?? '?'}`);
    }
    const stuff = target.stuff;
    const giver = context.commandGiver;

    // Zone targets route to canMutateZone (role-gated on the
    // primary ownerGroup); everything else uses the slice walk.
    // Both force and non-force branches go through the same gate;
    // force only differs in the action string for the audit trail.
    const allowed = stuff instanceof Zone
      ? await AccessApi.canMutateZone(giver, stuff)
      : await AccessApi.can(
          giver,
          model.force ? 'force-destruct' : 'destruct',
          stuff,
        );
    if (!allowed) {
      return this.fail(
        context,
        "you don't have permission to destruct that",
        'access-denied',
      );
    }

    const name = DescribeApi.getDisplayName(stuff);
    try {
      const fn = model.force ? StuffApi.forceDestruct : StuffApi.destruct;
      fn(stuff);
      this.tell(context, `\ndestructed ${name} (${stuff.stuffId})\n`);
      return;
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('system.shell.author')
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
