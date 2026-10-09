/**
 * DismissController — `dismiss <person>`, ⭐⭐ **the only thing in this
 * trade that stops the meter.**
 *
 * It is worth being clear about how much work this one verb is doing in
 * the design. A well declines along a curve and **nothing announces
 * anything**: no notice fires when the head falls, no warning says the
 * rate is no longer worth the wage. The player watches the gauge, does
 * their own arithmetic, and decides. This is where that decision lands.
 *
 * ⭐ Which is why there is no *crew downs tools* and no *the well is
 * played out* message anywhere in this build. Either would make the
 * decision for them, and the decision **is** the content.
 *
 * ⚠ Settlement comes first: a hand dismissed before being paid loses the
 * hours they had already stood there for, which is the sort of quiet
 * theft a wage ledger exists to prevent. `DrillingOutfit.payOff` keeps
 * that order.
 */

import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  DrillingActController,
  ACT_TOPIC,
  type DrillingModel,
} from './DrillingActController';
import type DrillingOutfit from '../../DrillingOutfit';

/** ⚠ A bound arg is an `MqlOneResult`, never a `Stuff`. */
interface DismissModel extends DrillingModel {
  target?: MqlOneResult;
}

export default class DismissController extends DrillingActController<DismissModel> {
  public async execute(
    model: DismissModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to pay anybody off.`, 'no-place');
      return;
    }
    const hole = await this.wellheadOf(model);
    if (hole === null) {
      this.noHole(context);
      return;
    }
    const outfit = StuffApi.findByTemplatePath<DrillingOutfit>(
      hole.getOutfitPath(),
    );
    if (!outfit) {
      this.decline(context, Mml.compose`There is no outfit here.`, 'no-outfit');
      return;
    }
    if (!(await outfit.hasProprietor(giver))) {
      this.decline(
        context,
        Mml.compose`It is not your rig to pay anybody off from.`,
        'not-proprietor',
      );
      return;
    }

    const who = (model.target?.stuff ?? null) as Stuff | null;
    if (who === null) {
      this.decline(context, Mml.compose`Pay off whom?`, 'no-target');
      return;
    }
    if (!MixinApi.isEmployed(who) || !outfit.employs(who)) {
      this.decline(
        context,
        Mml.compose`${Mml.actor(who)} does not work for you.`,
        'not-employed',
      );
      return;
    }

    await outfit.payOff(who);

    MessageApi.scene(giver)
      .topic(ACT_TOPIC)
      .toSelf(
        Mml.compose`You settle up with ${Mml.actor(who)} and that is the end of it. The beam stops when you stop paying for it, and nothing else will stop it.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} pays ${Mml.actor(who)} off.`)
      .send();
  }
}
