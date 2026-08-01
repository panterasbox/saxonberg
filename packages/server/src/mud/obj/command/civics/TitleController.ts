/**
 * TitleController — `title` / `title list` / `title buy <lot>`.
 *
 * The player-facing act the property substrate was missing. Every piece
 * of title machinery already shipped — `ParcelApi.subdivide`, `transfer`,
 * `ownerOf`, the chain-of-title log — and none of it had a verb.
 *
 * ## Why a verb of its own, and not `buy`
 *
 * `buy` is retail: it hands over an ITEM off a `PricedOffer` and
 * chattel-stamps it. Land is real property on a different registry
 * (`parcel.md` vs `chattel.md`), so routing it through `buy` would mean
 * a lot behaving like stock on a shelf.
 *
 * And it is deliberately NOT a verb conferred by the Registry counter.
 * The shipped rule is that a commerce object affords only its COMMERCE
 * verbs, and working verbs ride the instrument — so hanging a bespoke
 * land-sale verb off a piece of furniture would be the venue antipattern.
 * `title` is the diegetic word, and one dispatch verb with subcommands is
 * the house pattern (`government`, `office`, `bank`).
 *
 * ## The sale, in order
 *
 * Standing at the Registry → funds check → the money leg through
 * banking's settle chokepoint → `subdivide` the lot out of the suburb
 * (which stamps its land use and area, and refuses an area outside the
 * use's band) → `transfer` the title to the buyer → stand the yard up.
 *
 * The money moves BEFORE the row is written, and the row is written
 * before the ground is stood up. A failed payment therefore leaves no
 * parcel and no yard, which is the property the test pins.
 *
 * ⚠ Inside a sandbox circle this whole path is refused twice over —
 * `subdivide` and `transfer` both carry `assertFieldMutation`, and the
 * `parcels` collection is REFUSE in the PM policy table. A title minted
 * in a holodeck would be a real title.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { AppApi } from '../../../api/app';
import { ParcelApi } from '../../../api/parcel';
import { BankingApi, type Charge } from '../../../api/banking';
import { EmploymentApi } from '../../../api/employment';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { LandUses } from '../../../lib/parcel/LandUse';
import { Money } from '../../../lib/banking/Money';
import { Quantity } from '../../../lib/quantity';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type LotHolder from '../../../domain/terminus/hinkley-hills/LotHolder';

const TOPIC = 'world.narration.action';

/** Where land business is transacted — the city's records counter. */
const REGISTRY_ROOM = '/domain/terminus/registry/office';
/** The suburb the lots are subdivided out of. */
const SUBURB_EXTENT = '/domain/terminus/hinkley-hills';
/** The holder that stands a bought lot's yard up. */
const LOT_HOLDER = '/domain/terminus/hinkley-hills/lot-holder';

/** The lots the plat book offers. Content, deliberately small. */
const PLAT_BOOK = ['lot-1', 'lot-2', 'lot-3', 'lot-4', 'lot-5'] as const;

interface TitleModel extends CommandModel {
  subcommand?: string;
  lot?: string;
}

export default class TitleController extends CommandController<TitleModel> {
  async execute(model: TitleModel, context: CommandContext): Promise<void> {
    switch (model.subcommand ?? 'holdings') {
      case 'list':
        return this.executeList(context);
      case 'buy':
        return this.executeBuy(model, context);
      default:
        return this.executeHoldings(context);
    }
  }

  /** `title` — what ground do I hold, and what may I do on it. */
  private async executeHoldings(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const me = giver.getTemplatePath() ?? '';
    const held: string[] = [];

    for (const lot of PLAT_BOOK) {
      const extent = `${SUBURB_EXTENT}/${lot}`;
      const record = await ParcelApi.coveringParcelOf(extent);
      if (!record || record.getExtent() !== extent) continue;
      const owner = record.getOwner();
      if (owner?.kind !== 'player' || owner.templatePath !== me) continue;
      const use = ParcelApi.landUseOf(extent);
      const area = record.getArea();
      const size = area ? area.tag('lot') : 'an unmeasured piece of ground';
      held.push(
        `${lot} in Hinkley Hills — ${size}, zoned ${use}: ` +
          `${LandUses.summaryOf(use)}.`,
      );
    }

    if (held.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You hold no ground. The city Registry keeps the plat book; Hinkley Hills has lots going.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'holds-nothing',
        detail: 'the actor holds no titled ground',
      });
      return;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You hold:\n${held.join('\n')}`)
      .send();
  }

  /** `title list` — the lots on offer, at the counter that keeps them. */
  private async executeList(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!this.atRegistry(giver)) {
      this.notAtRegistry(context, 'list');
      return;
    }

    const price = Money.of(this.lotPrice());
    const area = Quantity.of(this.lotArea(), 'm²');
    const lines: string[] = [];
    for (const lot of PLAT_BOOK) {
      const extent = `${SUBURB_EXTENT}/${lot}`;
      const record = await ParcelApi.coveringParcelOf(extent);
      const taken = !!record && record.getExtent() === extent;
      lines.push(
        taken
          ? `${lot} — sold.`
          : `${lot} — ${area.tag('lot')}, zoned residential, ${price.render()}.`,
      );
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`The plat book for Hinkley Hills:\n${lines.join('\n')}`,
      )
      .send();
  }

  /** `title buy <lot>` — the whole transaction. */
  private async executeBuy(
    model: TitleModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    if (!this.atRegistry(giver)) {
      this.notAtRegistry(context, 'buy');
      return;
    }

    const lot = this.normalizeLot(model.lot ?? '');
    if (!lot) {
      this.reject(
        context,
        giver,
        Mml.compose`No such lot. The plat book runs lot 1 to lot 5.`,
        'unknown-lot',
        `'${model.lot ?? ''}' is not in the plat book`,
      );
      return;
    }

    const extent = `${SUBURB_EXTENT}/${lot}`;
    const existing = await ParcelApi.coveringParcelOf(extent);
    if (existing && existing.getExtent() === extent) {
      this.reject(
        context,
        giver,
        Mml.compose`${lot} has already been sold.`,
        'already-sold',
        `${extent} already has a title row`,
      );
      return;
    }

    const buyer = giver.getTemplatePath();
    if (!buyer) {
      this.reject(
        context,
        giver,
        Mml.compose`The registrar cannot find you in the book at all.`,
        'no-durable-identity',
        'the actor has no templatePath to hold title with',
      );
      return;
    }

    // The money leg FIRST. A failed payment must leave no parcel row and
    // no yard behind — nothing changes hands until the money has.
    const paid = await this.takePayment(this.lotPrice(), lot);
    if (!paid) {
      this.reject(
        context,
        giver,
        Mml.compose`You can't cover ${Money.of(this.lotPrice()).render()} for ${lot}.`,
        'insufficient-funds',
        `could not settle ${this.lotPrice()} for ${extent}`,
      );
      return;
    }

    // Mint the row, stamping the use and the area — `subdivide` refuses
    // an area outside the use's band, which is zoning doing its one job.
    await ParcelApi.subdivide(
      extent,
      SUBURB_EXTENT,
      { kind: 'group', name: 'hinkley-hills' },
      {
        landUse: 'residential',
        area: Quantity.of(this.lotArea(), 'm²'),
      },
    );
    // …then hand the title over. Two steps, because the chain-of-title
    // log should read "subdivided, then transferred" — which is what
    // actually happened.
    await ParcelApi.transfer(extent, { kind: 'player', templatePath: buyer });

    // Stand the yard up, keyed on the extent we just wrote.
    let firstTime = true;
    const holder = StuffApi.findByTemplatePath<LotHolder>(LOT_HOLDER);
    if (holder) {
      const result = await holder.provisionYard(extent);
      firstTime = result.firstTime;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        firstTime
          ? Mml.compose`The registrar writes the row, blots it, and turns the book around for you to see. ${lot} in Hinkley Hills is yours — a fence, a house, and a bed somebody dug and never planted.`
          : Mml.compose`The registrar writes the row and turns the book around. ${lot} in Hinkley Hills is yours again.`,
      )
      .toPeers(Mml.compose`${Mml.name(giver)} buys a lot in Hinkley Hills.`)
      .send();
  }

  // ── helpers ──

  /** Whether the actor is standing at the Registry counter. */
  private atRegistry(giver: Stuff): boolean {
    if (!MixinApi.isContainable(giver)) return false;
    const here = giver.getContainer();
    return here?.getTemplatePath() === REGISTRY_ROOM;
  }

  private notAtRegistry(context: CommandContext, sub: string): void {
    const giver = context.commandGiver;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`Land changes hands at the city Registry, over the counter, in the book. Not out here.`,
      )
      .send();
    context.note({
      kind: 'controller-rejected',
      reason: 'not-at-registry',
      detail: `title ${sub} requires standing at ${REGISTRY_ROOM}`,
    });
  }

  /**
   * Accept `lot 2`, `lot-2`, `2` — a player types all three, and the
   * plat book is five entries, so being generous costs nothing.
   */
  private normalizeLot(raw: string): string | null {
    const cleaned = raw.trim().toLowerCase().replace(/\s+/g, '-');
    const candidate = /^\d+$/.test(cleaned) ? `lot-${cleaned}` : cleaned;
    return (PLAT_BOOK as readonly string[]).includes(candidate)
      ? candidate
      : null;
  }

  /**
   * Move the money through banking's settle chokepoint, to the Registry's
   * own Business. The Improvement District has no treasury — it is a
   * government that exists on paper — so the city's records office takes
   * the payment on its behalf, which is what a paper government's
   * finances actually look like.
   */
  private async takePayment(amount: number, lot: string): Promise<boolean> {
    let account: string;
    try {
      const business = await EmploymentApi.ensureOperatorAt(REGISTRY_ROOM);
      if (!business) return false;
      account = await EmploymentApi.operatingAccountOf(business);
    } catch {
      return false;
    }
    const charge: Charge = {
      amount: Money.of(amount),
      reason: `title to ${lot}, Hinkley Hills`,
      presented: true,
      payeeAccountId: account,
      category: 'sales',
    };
    try {
      await BankingApi.settle(charge, { kind: 'credential' });
      return true;
    } catch {
      try {
        await BankingApi.settle(charge, { kind: 'cash' });
        return true;
      } catch {
        return false;
      }
    }
  }

  private reject(
    context: CommandContext,
    giver: Stuff,
    line: ReturnType<typeof Mml.compose>,
    reason: string,
    detail: string,
  ): void {
    MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  private lotPrice(): number {
    return this.dial(AppSettingKeys.landLotPriceMinor, 4000);
  }

  private lotArea(): number {
    return this.dial(AppSettingKeys.landLotAreaM2, 1000);
  }

  private dial(key: string, fallback: number): number {
    try {
      const raw = AppApi.setting(key);
      if (raw === '' || raw == null) return fallback;
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) ? n : fallback;
    } catch {
      return fallback;
    }
  }
}
