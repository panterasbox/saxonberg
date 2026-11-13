/**
 * GiveController — hand an item from the actor's inventory to a
 * recipient Agent. The item lands in the recipient's general
 * inventory (their Container) — NOT a hand slot, per the "hand
 * slots are for activities, not storage" rule in
 * `docs/subsystems/embodiment.md`.
 *
 * The field-level `requires: class:Agent` already gated the
 * recipient as an `Agent`. Agents in v1 (Character / Avatar)
 * compose Container, so the move target is well-formed without an
 * extra mixin probe. A future Agent that for some reason didn't
 * compose Container would surface as a programmatic-contract
 * failure in ContainmentApi.move.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { Containable } from '../../../../lib/spatial/Containable';
import { ContainmentApi } from '../../../../api/containment';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

interface GiveModel extends CommandModel {
  item: MqlOneResult;
  recipient: MqlOneResult;
}

export default class GiveController extends CommandController<GiveModel> {
  execute(model: GiveModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const item = model.item.stuff;
    const recipient = model.recipient.stuff;

    if (!item) {
      MessageApi.scene(giver)
        .topic('sense.survey')
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
        .topic('sense.survey')
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
      // Defensive: the `class:Agent` check passed, so the
      // recipient is an Agent. Agents compose Container in v1; this
      // throw protects against future Agent subclasses that drop
      // the mixin without realizing they break `give`.
      throw new Error(
        `GiveController: recipient ${recipient.stuffId} is an Agent but not a Container`,
      );
    }

    // ⭐ A HANDED thing is offered (size and carrying D-W7a): onto them —
    // a hand or a pocket, never routed on to their bag or their feet
    // (`directMove`, owner 2026-11-13) — or nothing changes hands. A body
    // that does not carry takes nothing handed to it (its own answer, read
    // dry); a recipient that is no body takes it plainly.
    if (!MixinApi.isCarrying(recipient) && recipient.arrivalFor(item as Stuff & Containable).kind === 'refuse') {
      this.keptWords(giver, recipient, item, false, context);
      return;
    }
    // **Leaving your inventory means leaving your body first** — the
    // same release gate `remove`/`unwield`/`drop` run. Without it this
    // verb both bypasses a curse and leaves a phantom slot occupant
    // behind (see `Slotted.tryReleaseFromSlots`).
    if (MixinApi.isSlotted(giver) && MixinApi.isSlottable(item)) {
      const release = giver.tryReleaseFromSlots(item);
      if (!release.released) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(
            release.dumpedTau > 0
              ? Mml.compose`You cannot let go of ${Mml.thing(item)} — and it is running hot against your skin.`
              : Mml.compose`You cannot let go of ${Mml.thing(item)}. It has no intention of leaving your hand.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'cursed-will-not-release',
          detail: `${item.getPresentation()} refuses release`,
        });
        return;
      }
    }

    const refused = MixinApi.isCarrying(recipient)
      ? recipient.directMove(item as Stuff & Containable)
      : (ContainmentApi.move(item as Stuff & Containable, recipient as Stuff & Container), null);
    if (refused !== null) {
      // Back where it was let go of: `move` routes it to the giver's free hand.
      ContainmentApi.move(item as Stuff & Containable, giver as unknown as Stuff & Container);
      this.keptWords(giver, recipient, item, refused.reason === 'nowhere-to-carry' && refused.facts.held.length > 0, context);
      return;
    }

    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(Mml.compose`You give ${Mml.thing(item)} to ${Mml.actor(recipient)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} gives ${Mml.thing(item)} to ${Mml.actor(recipient)}.`,
      )
      .send();
    // Recipient's own scene-message for receipt. Separate Scene so
    // the recipient gets their own envelope frame.
    MessageApi.scene(recipient)
      .topic('sense.survey')
      .toSelf(Mml.compose`${Mml.actor(giver)} gives you ${Mml.thing(item)}.`)
      .send();
  }

  /** The recipient had nowhere to take it, and the giver keeps it. */
  private keptWords(giver: Stuff, recipient: Stuff, item: Stuff, full: boolean, context: CommandContext): void {
    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(
        full
          ? Mml.compose`${Mml.actor(recipient)} has nowhere to take ${Mml.thing(item)} — their hands are full. You keep it.`
          : Mml.compose`${Mml.actor(recipient)} has nowhere to take ${Mml.thing(item)}. You keep it.`,
      )
      .send();
    context.note({ kind: 'controller-rejected', reason: 'recipient-hands-full', detail: item.getPresentation() });
  }
}
