/**
 * InventoryController — `inventory [<thing>]`: the itemised LEDGER of what
 * something holds (maritime revision 2).
 *
 * ⭐ `look` answers *what is this like?*; `inventory` answers *what
 * exactly does this hold?* — complete and grouped:
 * - yourself (no argument): what you WEAR, what you HOLD, what you CARRY;
 * - a person: what they wear and hold — ⛔ never their pockets or what is
 *   inside their body (`PerceptionApi.visibleContentsOf`, the one rule
 *   `look` reads too, so the two can never disagree);
 * - a container: everything in it if open; a shut one refuses in words.
 *
 * `look in <thing>` is the same ledger ({@link InventoryController.ledger}).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { PerceptionApi } from '../../../../api/perception';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';

interface InventoryModel extends CommandModel {
  target?: MqlOneResult;
}

/**
 * The ledger controller. `ledger` is a public static for exactly two
 * callers — this controller and `LookController` (`look in`) — neither of
 * them author surface (`lint:lib-statics`' caller audit).
 *
 * @internal
 */
export default class InventoryController extends CommandController<InventoryModel> {
  execute(model: InventoryModel, context: CommandContext): void {
    const viewer = context.commandGiver;
    const raw = model.target?.raw ?? '';
    const target = model.target?.stuff ?? (raw === '' ? viewer : null);
    if (target === null) {
      MessageApi.scene(viewer)
        .topic('sense.survey')
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }
    if (!MixinApi.isContainer(target)) {
      const line = target === viewer
        ? Mml.compose`You have no inventory.`
        : Mml.compose`${Mml.actor(target)} holds nothing.`;
      MessageApi.scene(viewer).topic('sense.survey').toSelf(line).send();
      context.note({ kind: 'mixin-missing', mixin: 'ContainerMixin' });
      return;
    }
    const body = InventoryController.ledger(viewer, target);
    if (body === null) {
      MessageApi.scene(viewer)
        .topic('sense.survey')
        .toSelf(Mml.compose`${Mml.actor(target)} is shut.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'shut', detail: target.getPresentation() });
      return;
    }
    MessageApi.scene(viewer).topic('sense.survey').toSelf(body).send();
  }

  /**
   * ⭐ The ledger of what `viewer` may see `target` hold — grouped, and
   * complete (no summary). `null` when `target` is a container that is
   * shut. Shared by `inventory` and `look in <thing>`.
   */
  public static ledger(viewer: Stuff, target: Stuff): Mml | null {
    const v = PerceptionApi.visibleContentsOf(viewer, target);
    if (v.shut) return null;
    const list = (xs: Stuff[]): Mml => Mml.list(xs.map((x) => Mml.thing(x)));
    const lines: Mml[] = [];
    if (viewer === target) {
      if (v.worn.length) lines.push(Mml.compose`You are wearing: ${list(v.worn)}.`);
      if (v.held.length) lines.push(Mml.compose`You are holding: ${list(v.held)}.`);
      if (v.carried.length) lines.push(Mml.compose`You are carrying: ${list(v.carried)}.`);
      if (lines.length === 0) return Mml.compose`\nYou are not carrying anything.\n`;
    } else {
      lines.push(Mml.compose`${Mml.actor(target)}`);
      if (v.worn.length) lines.push(Mml.compose`── Wearing: ${list(v.worn)}.`);
      if (v.held.length) lines.push(Mml.compose`── Holding: ${list(v.held)}.`);
      if (v.carried.length) lines.push(Mml.compose`── In it: ${list(v.carried)}.`);
      if (lines.length === 1) lines.push(Mml.compose`── Nothing you can see.`);
    }
    const body = lines.reduce((acc, line) => Mml.compose`${acc}\n${line}`);
    return Mml.compose`\n${body}\n`;
  }
}
