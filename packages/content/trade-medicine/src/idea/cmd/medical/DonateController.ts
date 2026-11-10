/**
 * DonateController — `donate <bag> [at <window>]` (blood build D8).
 *
 * The gift act: a bag of blood goes into the window's bank. ⭐ The bank
 * answers (`DonationBank.receiveGift`, controller-liquidity W13): it files
 * the unit, writes the custody deed, and — when a PLAYER gives THEIR OWN
 * blood — credits the gift (the disposition signature and the renown
 * reaction). This controller tells the giver what happened, in the right
 * words: their blood, or a unit they carried for somebody else (C15 — it
 * used to say "your blood" for anyone's).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { DonationBank } from '@saxonberg/server/mud/lib/commerce/DonationBank';

const TOPIC = 'act.deed';

interface DonateModel extends CommandModel {
  bag?: MqlOneResult;
  window?: MqlOneResult;
}

export default class DonateController extends CommandController<DonateModel> {
  async execute(model: DonateModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const bag = model.bag?.stuff as Stuff | undefined;
    if (!bag || !MixinApi.isBulkable(bag)) {
      return DonateController.fail(context, 'Donate what? Hold a bag of blood.', 'no-bag');
    }
    let unit;
    try {
      unit = bag.getBulk().getPayload()?.blood;
    } catch {
      unit = undefined;
    }
    if (!unit) {
      return DonateController.fail(context, 'That is not a unit of blood.', 'not-blood');
    }
    const window = model.window?.stuff as (Stuff & DonationBank) | undefined;
    if (!window || !MixinApi.isDonationBank(window)) {
      return DonateController.fail(context, 'There is no blood window here to give to.', 'no-window');
    }

    const gift = await window.receiveGift(bag, giver);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.fromMarkup(
          Mml.escape(
            gift.ownBlood
              ? 'You give your blood to the window. It is taken, labelled, and set in the cold.'
              : 'You hand the unit in at the window. It is taken, labelled, and set in the cold.',
          ),
        ),
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} donates a unit of blood.`)
      .send();
  }

  protected static fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
