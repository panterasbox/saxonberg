/**
 * `ashes` brain — the ash-man's round (potash D17): a sole trader who
 * calls at the town's hearths, rakes them out, BUYS the ash with his own
 * money, and sells it at the chandlery counter like anybody else.
 *
 * ⭐ He pays each heap's owner the counter's own bid (`Stock.bidFor`) and
 * takes title the moment he has paid — the two steps `Stock.buyFrom`
 * makes, at the hearth. At the counter he types `sell`, and is paid the
 * same bid: the round is a LIVING only by volume, never by margin, which
 * is the drive's question (AC 9). ⭐ Nothing here is unavailable to a
 * player: sweep your own hearth and walk the ash in, and you are paid the
 * same. The chandlery stays vacant — he supplies it; he is not its hand.
 *
 * Where it is: the roster tick relocates him from stop to stop
 * (`call: rota`, the tinker's round); a beat at a stop rakes every hearth
 * there with ash past `minKg`; a beat in the counter's room sells what he
 * carries.
 *
 * ⚠ What nobody can be paid for — a hearth whose owner has no account (a
 * commons fixture, a committee) — is taken and SAID, never silently: the
 * scene names it. And he sweeps with his hands, the act the `sweep` verb's
 * controller performs (`Burner.rakeGrate`): a broom is a player's
 * convenience, not the round's gate.
 *
 * config: `{ counter: string, minKg?: number }` — `counter` the house's
 * `Stock` (template path); `minKg` the least ash worth raking (default
 * `potash.round.minKg`, 0.05).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Money } from '@saxonberg/server/mud/lib/banking/Money';
import Stock from '@saxonberg/server/mud/lib/retail/Stock';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

const DEFAULT_MIN_KG = 0.05;

export const brain = class {
  static label = 'ashes';
  static kind: TaskKind = 'work';
  static summary = 'Rakes the hearths on the round, buys the ash for the house at its bid, and lays it on the counter.';
  static discipline = 'retail-sales';
  static claims: readonly EngagementSlot[] = ['hands'];
  static presenceGated = false;
  static ambient = false;

  /** Wanted at a stop with ash to rake, or at the counter with ash in hand. */
  static urgency(ctx: BrainContext): Urgency {
    const room = MixinApi.isContainable(ctx.host) ? ctx.host.getContainer() : null;
    if (!room || !MixinApi.isContainer(room)) return new Urgency('idle');
    const counter = brain.counterOf(ctx);
    if (counter && counter.getContainer() === room) {
      return brain.heapsHeld(ctx.host).length > 0
        ? new Urgency('wanted', 'lays the ash on the counter')
        : new Urgency('idle');
    }
    return brain.ashyBurners(room, brain.minKg(ctx)).length > 0
      ? new Urgency('wanted', 'rakes out the grate')
      : new Urgency('idle');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const hand = ctx.host;
    if (!MixinApi.isContainer(hand) || !MixinApi.isContainable(hand)) return;
    const room = hand.getContainer();
    if (!room || !MixinApi.isContainer(room)) return;
    const counter = brain.counterOf(ctx);
    if (!counter) return;
    if (counter.getContainer() === room) {
      // ⭐ Back at the counter: sell it, with the verb anybody uses.
      if (!MixinApi.isCommandGiver(hand)) return;
      for (let i = brain.heapsHeld(hand).length; i > 0; i -= 1) await hand.forceCommand('sell wood ash');
      return;
    }

    const account = await BankingApi.primaryAccountIdOf(hand.getIdentityPath() ?? '');
    for (const burner of brain.ashyBurners(room, brain.minKg(ctx))) {
      if (!MixinApi.isBurner(burner)) continue;
      const { ash } = await burner.rakeGrate(hand);
      let unpaid = 0;
      for (const heap of ash) {
        if (!(await brain.buy(heap, counter, account, hand))) unpaid += 1;
        if (MixinApi.isContainable(heap)) ContainmentApi.move(heap, hand as unknown as Stuff & Container);
      }
      MessageApi.scene(hand)
        .topic('act.deed')
        .toPeers(
          unpaid > 0
            ? Mml.compose`${Mml.actor(hand)} rakes out ${Mml.thing(burner)} and bags the ash. There is nobody here to pay for it.`
            : Mml.compose`${Mml.actor(hand)} rakes out ${Mml.thing(burner)}, bags the ash and leaves a few coins for it.`,
        )
        .send();
    }
  }

  /**
   * Pay the heap's owner the counter's bid from his own account, and take
   * title. False when there was nobody to pay (it is taken either way).
   */
  private static async buy(heap: Stuff, counter: Stock, account: string | null, buyer: Stuff): Promise<boolean> {
    if (!MixinApi.isChattel(heap)) return false;
    const owner = await heap.chattelOwner();
    const bid = counter.bidFor(heap.getTemplatePath() ?? '');
    let paid = false;
    // A person or a firm is paid; a group (a committee) has nobody to pay.
    const ownerKey = owner && 'templatePath' in owner ? owner.templatePath : null;
    if (ownerKey && account && bid !== null && bid > 0) {
      const to = await BankingApi.primaryAccountIdOf(ownerKey);
      if (to && to !== account) {
        try {
          await BankingApi.payTerms(account, to, Money.of(bid, BankingApi.compactCurrency()), `ash round: ${heap.getPresentation()}`);
          paid = true;
        } catch {
          paid = false;
        }
      }
    }
    await heap.transferChattel(buyer);
    return paid;
  }

  private static counterOf(ctx: BrainContext): (Stock & Stuff & Containable) | null {
    const path = ctx.config.counter;
    if (typeof path !== 'string') return null;
    // ⚠ LIVE ONLY — a brain never mints a fixture a room's `props:` owns.
    const c = StuffApi.findByTemplatePath(path);
    return c instanceof Stock && MixinApi.isContainable(c) ? (c as Stock & Stuff & Containable) : null;
  }

  private static heapsHeld(host: Stuff): (Stuff & Containable)[] {
    if (!MixinApi.isContainer(host)) return [];
    return (host.getContents() as (Stuff & Containable)[]).filter((s) => {
      const m = MixinApi.isTangible(s) ? s.getMaterial() : null;
      return (m?.hasTag('potash') ?? false) && (m?.hasTag('residue') ?? false);
    });
  }

  private static ashyBurners(room: Stuff, minKg: number): Stuff[] {
    if (!MixinApi.isContainer(room)) return [];
    return (room.getContents() as Stuff[]).filter((s) => MixinApi.isBurner(s) && s.getAshKg() >= minKg);
  }

  private static minKg(ctx: BrainContext): number {
    const own = Number(ctx.config.minKg);
    if (Number.isFinite(own) && own > 0) return own;
    try {
      const v = Number(AppApi.setting('potash.round.minKg'));
      return Number.isFinite(v) && v > 0 ? v : DEFAULT_MIN_KG;
    } catch {
      return DEFAULT_MIN_KG;
    }
  }
};
