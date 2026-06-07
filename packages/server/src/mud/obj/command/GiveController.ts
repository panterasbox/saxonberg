/**
 * GiveController — hand an item from the actor's inventory to a
 * recipient Agent. The item lands in the recipient's general
 * inventory (their Container) — NOT a hand slot, per the "hand
 * slots are for activities, not storage" rule in
 * `docs/subsystems/embodiment.md`.
 *
 * The field-level `mustBeAgent` validator already gated the
 * recipient as an `Agent`. Agents in v1 (Character / Avatar)
 * compose Container, so the move target is well-formed without an
 * extra mixin probe. A future Agent that for some reason didn't
 * compose Container would surface as a programmatic-contract
 * failure in ContainmentApi.move.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';

interface GiveModel extends CommandModel {
  item: MqlOneResult;
  recipient: MqlOneResult;
}

export class GiveController extends CommandController<GiveModel> {
  execute(model: GiveModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const item = model.item.stuff;
    const recipient = model.recipient.stuff;

    if (!item) {
      MessageApi.scene(giver)
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`You don't have any '${model.item.raw}'.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'item',
        query: model.item.raw,
      });
      return;
    }
    if (!recipient) {
      MessageApi.scene(giver)
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`You don't see any '${model.recipient.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'recipient',
        query: model.recipient.raw,
      });
      return;
    }

    if (!MixinApi.isContainer(recipient)) {
      // Defensive: the mustBeAgent validator passed, so the
      // recipient is an Agent. Agents compose Container in v1; this
      // throw protects against future Agent subclasses that drop
      // the mixin without realizing they break `give`.
      throw new Error(
        `GiveController: recipient ${recipient.stuffId} is an Agent but not a Container`,
      );
    }

    ContainmentApi.move(
      item as Stuff & Containable,
      recipient as Stuff & Container,
    );

    MessageApi.scene(giver)
      .topic('world.perception.inventory')
      .toSelf(Mml.compose`You give ${Mml.item(item)} to ${Mml.name(recipient)}.`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} gives ${Mml.item(item)} to ${Mml.name(recipient)}.`,
      )
      .send();
    // Recipient's own scene-message for receipt. Separate Scene so
    // the recipient gets their own envelope frame.
    MessageApi.scene(recipient)
      .topic('world.perception.inventory')
      .toSelf(Mml.compose`${Mml.name(giver)} gives you ${Mml.item(item)}.`)
      .send();
  }
}
