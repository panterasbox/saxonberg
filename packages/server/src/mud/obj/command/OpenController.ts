/**
 * OpenController — open any Sealable the player can reach.
 *
 * Phase 7+: target is pre-resolved through MQL by the dispatcher;
 * the controller reads `model.target.stuff` directly. The wrapper
 * also carries `raw` (player-typed text) for no-match messaging.
 *
 * Two resolution shapes can arrive:
 *
 *   - **Direct hit on a Sealable** — `target.stuff` is the Sealable
 *     itself (a chest, a door matched by keyword like
 *     `open oak door`).
 *   - **Direction match** — `target.stuff` is the actor's current
 *     location and `target.via.exit` is the exit the actor named.
 *     The door is fetched from `via.exit.getDoor()`. This is the
 *     canonical `open north` shape.
 *
 * The YAML wires `canReach` so MQL queries that resolve to remote
 * Sealables fail validation before reaching the controller; the
 * controller's own checks handle wrong-type / already-open cases.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MqlApi, type MqlOneResult } from '../../api/mql';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Sealable } from '../../lib/spatial/Sealable';

interface OpenModel extends CommandModel {
  target?: MqlOneResult;
}

export class OpenController extends CommandController<OpenModel> {
  execute(model: OpenModel, context: CommandContext): CommandResult {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      return { success: false, summary: 'open what?' };
    }
    if (target.stuff === null) {
      return {
        success: false,
        summary: `you don't see any '${target.raw}' here`,
      };
    }

    // Direct hit (open oak) → the door is target.stuff;
    // direction match (open north) → the door is via.exit.getDoor().
    // MqlApi.effectiveTarget tries both and returns the first
    // Sealable. The arrow wrapper preserves MixinApi as `this` —
    // the security-gated static needs it for the internal
    // hasMixin lookup.
    const sealable = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff & Sealable => MixinApi.isSealable(s),
    );
    if (!sealable) {
      return { success: false, summary: "can't open that" };
    }

    if (sealable.getIsOpen()) {
      return { success: false, summary: 'already open' };
    }

    sealable.open();

    MessageApi.scene(commandGiver)
      .topic(MessageApi.Topics.world.narration.action)
      .toSelf(Mml.compose`You open ${Mml.object(sealable as unknown as Stuff)}.`)
      .toPeers(
        Mml.compose`${Mml.name(commandGiver)} opens ${Mml.object(sealable as unknown as Stuff)}.`,
      )
      .send();

    return {
      success: true,
      summary: `opened ${DescribeApi.getDisplayName(sealable as unknown as Stuff, 'it')}`,
    };
  }
}
