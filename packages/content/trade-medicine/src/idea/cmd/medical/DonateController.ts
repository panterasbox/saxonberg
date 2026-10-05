/**
 * DonateController — `donate <bag> [at <window>]` (blood build D8).
 *
 * The gift act: a bag of blood goes into the window's bank, and — when a
 * PLAYER gives THEIR OWN blood — the gift earns standing. The asymmetry is
 * the requirement's: an NPC giving is plumbing (no credit); giving
 * somebody else's unit earns nothing (the donor already earned it).
 *
 * ⭐ The credit is three ledgers: the custody deed (written by
 * `receiveGift` — the chronicle record, tagged blood/gift), the
 * disposition signature (generosity always; compassion when the gifted lot
 * was SHORT — a named shortage answered), and a public renown reaction
 * folded by a scheduled recompute (D10).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { RenownApi } from '@saxonberg/server/mud/api/renown';
import { ScheduleApi } from '@saxonberg/server/mud/api/schedule';
import {
  BLOOD_GIFT_SIGNATURE,
  BLOOD_GIFT_RENOWN,
} from '@saxonberg/server/mud/lib/vitals/Blood';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { DonationBank } from '@saxonberg/server/mud/lib/commerce/DonationBank';

const TOPIC = 'act.deed';
/** How long after the gift the renown fold runs (the seedTo shape). */
const FOLD_DELAY_MS = 1500;

interface DonateModel extends CommandModel {
  bag?: MqlOneResult;
  window?: MqlOneResult;
}

export default class DonateController extends CommandController<DonateModel> {
  async execute(model: DonateModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const bag = model.bag?.stuff as Stuff | undefined;
    if (!bag || !MixinApi.isBulkable(bag)) {
      return this.fail(context, 'Donate what? Hold a bag of blood.', 'no-bag');
    }
    let unit;
    try {
      unit = bag.getBulk().getPayload()?.blood;
    } catch {
      unit = undefined;
    }
    if (!unit) {
      return this.fail(context, 'That is not a unit of blood.', 'not-blood');
    }
    const window = model.window?.stuff as (Stuff & DonationBank) | undefined;
    if (!window || !MixinApi.isDonationBank(window)) {
      return this.fail(context, 'There is no blood window here to give to.', 'no-window');
    }

    // Capture BEFORE the gift — once it lands the lot is no longer short.
    const wasShort = window.shortLots().includes(unit.type);

    await window.receiveGift(bag, giver);

    // ⭐ The standing credit: only a PLAYER giving their OWN blood (D8).
    const ownBlood = unit.donorIdentityPath === giver.getIdentityPath();
    if (MixinApi.isHasInteractive(giver) && ownBlood) {
      await this.creditGift(giver, window, wasShort);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape('You give your blood to the window. It is taken, labelled, and set in the cold.')))
      .toPeers(Mml.compose`${Mml.actor(giver)} donates a unit of blood.`)
      .send();
  }

  /** Mint the disposition + renown credit for a player's own-blood gift. */
  private async creditGift(
    giver: Stuff,
    window: Stuff,
    wasShort: boolean,
  ): Promise<void> {
    const valence = wasShort
      ? BLOOD_GIFT_SIGNATURE.named
      : BLOOD_GIFT_SIGNATURE.routine;
    if (MixinApi.isAdvancing(giver)) {
      // creditSignature's D9 graft fans the valence into the trait ledger.
      await giver.creditSignature(
        { discipline: [], dispositionValence: [...valence] },
        { kind: 'deed', tags: ['blood', 'gift'] },
      );
    }
    const giverId = giver.getIdentityPath();
    if (!giverId) return;
    const source = this.windowBusinessPath(window) ?? giverId;
    await RenownApi.append({
      subject: giverId,
      source,
      kind: 'reaction',
      signal: { emote: BLOOD_GIFT_RENOWN.emote, tags: ['blood', 'gift'] },
      locality: null,
    });
    // Append alone moves nothing — fold it (the seedTo shape, D10).
    ScheduleApi.schedule(FOLD_DELAY_MS, () => {
      void RenownApi.recompute();
    });
  }

  /** The operating business of the window (the renown source), or null. */
  private windowBusinessPath(window: Stuff): string | null {
    const path = window.getIdentityPath() ?? window.getTemplatePath();
    const business = path ? EmploymentApi.businessAt(path) : null;
    return business?.getTemplatePath() ?? null;
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
