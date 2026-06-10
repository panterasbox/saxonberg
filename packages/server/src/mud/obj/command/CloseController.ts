/**
 * CloseController — close any Sealable the player can reach.
 *
 * Phase 7+: target is pre-resolved through MQL by the dispatcher;
 * the controller reads `model.target.stuff` directly.
 *
 * Two resolution shapes can arrive:
 *
 *   - **Direct hit on a Sealable** — `target.stuff` is the Sealable
 *     itself (a chest, a door matched by keyword like
 *     `close oak door`).
 *   - **Direction match** — `target.stuff` is the actor's current
 *     location and `target.via.exit` is the exit the actor named.
 *     The door is fetched from `via.exit.getDoor()`. This is the
 *     canonical `close north` shape.
 *
 * The YAML wires `canReach` so MQL queries that resolve to remote
 * Sealables fail validation before reaching the controller.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';
import { MqlApi, type MqlOneResult } from '../../api/mql';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Sealable } from '../../lib/spatial/Sealable';

interface CloseModel extends CommandModel {
  target?: MqlOneResult;
}

export default class CloseController extends CommandController<CloseModel> {
  execute(model: CloseModel, context: CommandContext): void {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`Close what?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'close what?',
      });
      return;
    }
    if (target.stuff === null) {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You don't see any '${target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: target.raw,
      });
      return;
    }

    // Direct hit (close oak) → target.stuff; direction match
    // (close north) → via.exit.getDoor(). MqlApi.effectiveTarget
    // tries both and returns the first Sealable. The arrow
    // wrapper preserves MixinApi as `this` for the internal
    // hasMixin lookup.
    const sealable = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff & Sealable => MixinApi.isSealable(s),
    );
    if (!sealable) {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You can't close that.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-sealable',
        detail: "can't close that",
      });
      return;
    }

    if (!sealable.isOpen()) {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`It is already closed.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-closed',
        detail: 'already closed',
      });
      return;
    }

    sealable.close();

    MessageApi.scene(commandGiver)
      .topic('world.narration.action')
      .toSelf(Mml.compose`You close ${Mml.object(sealable as unknown as Stuff)}.`)
      .toPeers(
        Mml.compose`${Mml.name(commandGiver)} closes ${Mml.object(sealable as unknown as Stuff)}.`,
      )
      .send();

    return;
  }
}
