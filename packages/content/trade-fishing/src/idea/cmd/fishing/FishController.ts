/**
 * FishController — `fish [with <bait>] [at <shore>]`: one try at the fish.
 *
 * ⭐ One protocol (controller-liquidity W12): the tool decides what
 * fishing with it means (`TakesFish`) — a rod casts and the wait begins,
 * a spear strikes there and then. The rod is a declared argument the
 * binder resolves (`[capability.angling]` in hand); a striking tool in
 * hand answers when no rod is named. The controller resolves the reach
 * (a bound shore's water, else the Locality's) and says what came of it.
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { FishingController, FISHING_TOPIC } from './FishingController';
import { TAKES_FISH_MIXIN, type TakesFish, type TakeFishRefusal } from '../../../lib/TakesFish';

interface FishModel extends CommandModel {
  rod: MqlOneResult;
  bait?: MqlOneResult;
  shore?: MqlOneResult;
}

export default class FishController extends FishingController<FishModel> {
  async execute(model: FishModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.rod?.stuff as Stuff | undefined;
    // ⭐ The tool named, else one in hand that fishes (a spear).
    const held: Stuff[] = MixinApi.isContainer(giver) ? giver.getContents() : [];
    const tool = named ?? held.find((s) => FishController.fishesWith(s)) ?? null;
    if (tool === null) {
      this.decline(context, 'You have nothing to fish with.', 'no-rod');
      return;
    }
    if (!FishController.fishesWith(tool)) {
      this.decline(context, `You can't fish with ${tool.getPresentation()}.`, 'not-a-rod');
      return;
    }
    const pick = await this.reachFor(giver, model.shore);
    if (pick !== null && !pick.ok) {
      this.decline(context, pick.refusal, pick.reason);
      return;
    }
    const bait = (model.bait?.stuff as Stuff | undefined) ?? null;
    const out = await tool.takeFishBy(giver, { bait, reach: pick?.reach ?? null });
    if (!out.ok) {
      this.decline(context, FishController.refusalText(out), out.reason);
      return;
    }
    const done = out.facts;
    if (done.kind === 'struck') {
      MessageApi.scene(giver)
        .topic(FISHING_TOPIC)
        .toSelf(Mml.compose`You thrust, and the spear comes back with ${Mml.thing(done.fish)} on it.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} thrusts a spear into the water and draws it back.`)
        .send();
      return;
    }
    if (done.note) context.note(done.note);
    MessageApi.scene(giver)
      .topic(FISHING_TOPIC)
      .toSelf(
        done.bait
          ? Mml.compose`You bait the hook with ${Mml.thing(done.bait)} and cast out. The line settles on the water.`
          : Mml.compose`You cast out, bare-hooked. The line settles on the water.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} casts a line out over the water.`)
      .send();
  }

  /** Is `s` a tool you fish with? By the protocol mixin's name. */
  protected static fishesWith(s: Stuff): s is Stuff & TakesFish {
    return MixinApi.hasMixin(s.constructor as never, TAKES_FISH_MIXIN as never);
  }

  /** ⭐ Every refusal a try at the fish can give. */
  protected static refusalText(r: TakeFishRefusal): string {
    switch (r.reason) {
      case 'not-holding':
        return 'You need it in your hand.';
      case 'not-under':
        return 'You would have to be down in the water, where you can see them.';
      case 'no-water':
        return 'There is no water here to fish.';
      case 'nothing-near':
        return 'You thrust, and the spear comes back empty. Nothing came within reach.';
      case 'missed':
        return 'You thrust, and the spear comes back empty.';
      case 'not-engageable':
        return "You can't manage that.";
      case 'already-fishing':
        return 'Your line is already out.';
      case 'no-record':
        return 'There is no water here to fish.';
      case 'engagement-conflict':
        return 'Your hands are busy.';
      case 'start-rejected':
        return "You can't manage that just now.";
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }
}
