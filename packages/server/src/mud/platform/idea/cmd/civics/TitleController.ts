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
 * ## It knows no locality
 *
 * The verb is core; the subdivisions are content. Everything
 * locality-specific — which lots exist, what they cost, how big they are,
 * what stands on one, what use it is stamped with — is authored on a
 * {@link LotHolder} instance, and this controller enumerates the holders
 * rather than knowing any of them. A second subdivision anywhere in the
 * world is a seed file and no change here.
 *
 * The one thing that IS named here is the Registry room: land changes
 * hands over the city's records counter, and that is a fact about
 * Terminus's institutions rather than about any subdivision. When a
 * second records office exists it becomes a `commandContributions` /
 * venue question, not a constant.
 *
 * ⚠ Inside a sandbox circle this whole path is refused twice over —
 * `subdivide` and `transfer` both carry `assertFieldMutation`, and the
 * `parcels` collection is REFUSE in the PM policy table. A title minted
 * in a holodeck would be a real title.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { ParcelApi } from '../../../../api/parcel';
import { BankingApi, type Charge } from '../../../../api/banking';
import { EmploymentApi } from '../../../../api/employment';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { LandUses } from '../../../../lib/parcel/LandUse';
import { Money } from '../../../../lib/banking/Money';
import { Quantity } from '../../../../lib/quantity';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MqlApi } from '../../../../api/mql';
import PlatBook from '../../PlatBook';
import type LotHolder from '../../LotHolder';
import { Currency } from "../../../../lib/banking/Currency";

const TOPIC = 'act.deed';

/** Where land business is transacted — the city's records counter. */
const REGISTRY_ROOM = '/world/terminus/registry/office';

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

  /**
   * Every subdivision with lots to sell. MQL system enumeration (null
   * giver — the plat books are world content, not a viewer's
   * perception), the `LocomotionLogic.allModes` shape.
   */
  private books(): PlatBook[] {
    const matches = MqlApi.resolveMany('world:[class.PlatBook]', {
      commandGiver: null,
      scope: 'world',
    });
    return matches.stuff.filter((s): s is PlatBook => s instanceof PlatBook);
  }

  /**
   * The provisioner a book names, or null when it names none (an offer
   * with nothing behind it is a content bug, and the sale says so rather
   * than taking the money).
   */
  private holderFor(book: PlatBook): LotHolder | null {
    const path = book.getHolderPath();
    if (!path) return null;
    return StuffApi.findByTemplatePath<LotHolder>(path) ?? null;
  }

  /** `title` — what ground do I hold, and what may I do on it. */
  private async executeHoldings(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const me = giver.getTemplatePath() ?? '';
    const held: string[] = [];

    for (const book of this.books()) {
      const where = book.getLabel();
      for (const extent of book.lotExtents()) {
        const record = await ParcelApi.coveringParcelOf(extent);
        if (!record || record.getExtent() !== extent) continue;
        const owner = record.getOwner();
        if (owner?.kind !== 'player' || owner.templatePath !== me) continue;
        const use = ParcelApi.landUseOf(extent);
        const area = record.getArea();
        const size = area
          ? Quantity.of(area, 'm²').tag('lot')
          : 'an unmeasured piece of ground';
        const leaf = extent.slice(extent.lastIndexOf('/') + 1);
        held.push(
          `${leaf} (${where}) — ${size}, zoned ${use}: ` +
            `${LandUses.summaryOf(use)}.`,
        );
      }
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

    const lines: string[] = [];
    for (const book of this.books()) {
      const price = Money.of(book.getPriceMinor(), Currency.compact());
      const area = Quantity.of(book.getAreaM2(), 'm²');
      const use = book.getLandUse();
      lines.push(`${book.getLabel()}:`);
      for (const extent of book.lotExtents()) {
        const leaf = extent.slice(extent.lastIndexOf('/') + 1);
        const record = await ParcelApi.coveringParcelOf(extent);
        const taken = !!record && record.getExtent() === extent;
        lines.push(
          taken
            ? `  ${leaf} — sold.`
            : `  ${leaf} — ${area.tag('lot')}, zoned ${use}, ${price.render()}.`,
        );
      }
    }

    if (lines.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The plat book is empty. Nothing is for sale.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-for-sale',
        detail: 'no PlatBook offers any lots',
      });
      return;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`The plat book:\n${lines.join('\n')}`)
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

    // Which subdivision sells it? The holders are the plat books; this
    // controller knows none of them by name.
    const raw = model.lot ?? '';
    let book: PlatBook | null = null;
    let extent: string | null = null;
    for (const b of this.books()) {
      const candidate = b.extentFor(raw);
      if (candidate) {
        book = b;
        extent = candidate;
        break;
      }
    }
    if (!book || !extent) {
      this.reject(
        context,
        giver,
        Mml.compose`No such lot. Ask for the plat book with \`title list\`.`,
        'unknown-lot',
        `'${raw}' is in no plat book`,
      );
      return;
    }

    const existing = await ParcelApi.coveringParcelOf(extent);
    if (existing && existing.getExtent() === extent) {
      this.reject(
        context,
        giver,
        Mml.compose`That lot has already been sold.`,
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
    // no room behind — nothing changes hands until the money has.
    const price = book.getPriceMinor();
    const paid = await this.takePayment(price, extent);
    if (!paid) {
      this.reject(
        context,
        giver,
        Mml.compose`You can't cover ${Money.of(price, Currency.compact()).render()} for that lot.`,
        'insufficient-funds',
        `could not settle ${price} for ${extent}`,
      );
      return;
    }

    // Mint the row, stamping the use and the area the SUBDIVISION
    // declares — `subdivide` refuses an area outside the use's band,
    // which is zoning doing its one job.
    await ParcelApi.subdivide(
      extent,
      book.getParentExtent(),
      { kind: 'group', name: 'hinkley-hills' },
      book.getAreaM2(),
      1,
      book.getLandUse(),
    );
    // …then hand the title over. Two steps, because the chain-of-title
    // log should read "subdivided, then transferred" — which is what
    // actually happened.
    await ParcelApi.transfer(extent, { kind: 'player', templatePath: buyer });

    // Stand the ground up, keyed on the extent we just wrote — the
    // book's own provisioner, whatever model it implements.
    const holder = this.holderFor(book);
    const { firstTime } = holder
      ? await holder.provision(extent)
      : { firstTime: true };
    // …and hang the gate off the street, so there is a way in. Outside
    // `provision` on purpose: that method is the `@hook` a different
    // provisioning model replaces wholesale, and the way in must survive
    // the replacement. Idempotent, and a no-op for a subdivision with no
    // street configured.
    if (holder) await holder.ensureGate(extent);
    const leaf = extent.slice(extent.lastIndexOf('/') + 1);
    const where = book.getLabel();

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        firstTime
          ? Mml.compose`The registrar writes the row, blots it, and turns the book around for you to see. ${leaf} in ${where} is yours.`
          : Mml.compose`The registrar writes the row and turns the book around. ${leaf} in ${where} is yours again.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} buys a lot in ${where}.`)
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
   * Move the money through banking's settle chokepoint, to the Registry's
   * own Business. The Improvement District has no treasury — it is a
   * government that exists on paper — so the city's records office takes
   * the payment on its behalf, which is what a paper government's
   * finances actually look like.
   */
  private async takePayment(amount: number, extent: string): Promise<boolean> {
    let account: string;
    try {
      const business = await EmploymentApi.ensureOperatorAt(REGISTRY_ROOM);
      if (!business) return false;
      account = await EmploymentApi.operatingAccountOf(business);
    } catch {
      return false;
    }
    const charge: Charge = {
      amount: Money.of(amount, Currency.compact()),
      reason: `title to ${extent}`,
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

}
