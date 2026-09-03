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
 * `PlatWarren` instance (the residence pack’s), and this controller enumerates the holders
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
import { LandUses, type LandUse } from '../../../../lib/parcel/LandUse';
import { Money } from '../../../../lib/banking/Money';
import { Quantity } from '../../../../lib/quantity';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MqlApi } from '../../../../api/mql';
import { AppApi } from '../../../../api/app';
import { Lock } from '../../../../lib/lock/Lock';
import { OuterWarren } from '../../../../lib/location/OuterWarren';
import { Currency } from "../../../../lib/banking/Currency";

const TOPIC = 'act.deed';

/**
 * The catalogue / provisioner surfaces this verb consumes — STRUCTURAL,
 * because the concrete `PlatBook` / `PlatWarren` classes ship in the
 * `residence` capability pack and the kernel imports no pack code.
 * MQL's `[class.PlatBook]` filter selects by class-lineage NAME (the
 * `matchesClass` prototype walk), so the shapes below are the method
 * contract the verb actually reads; the duck-check in `books()` keeps a
 * name collision from reaching a method call.
 */
interface PlatBookShape extends Stuff {
  getLabel(): string;
  getParentExtent(): string;
  getPriceMinor(): number;
  getAreaM2(): number;
  getLandUse(): LandUse;
  getHolderPath(): string;
  extentFor(raw: string): string | null;
  /** Sold ∪ next-free — the GENERATIVE listing (D10; no roster). */
  lotExtents(): Promise<string[]>;
}

/** The provisioning half a book names by path (`residence/idea/PlatWarren`). */
interface PlatWarrenShape extends Stuff {
  provision(lotExtent: string): Promise<{ room: Stuff; firstTime: boolean }>;
  ensureGate(lotExtent: string): Promise<void>;
  /** Which side of the road the lot's gate is on — the buyer has to be
   *  told, or a cardinal gate is a guessing game. Optional: a
   *  provisioning model with no ring simply says nothing. */
  gateDirectionFor?(lotExtent: string): string | null;
}

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
  private books(): PlatBookShape[] {
    const matches = MqlApi.resolveMany('world:[class.PlatBook]', {
      commandGiver: null,
      scope: 'world',
    });
    return matches.stuff.filter(
      (s): s is PlatBookShape =>
        typeof (s as Partial<PlatBookShape>).lotExtents === 'function' &&
        typeof (s as Partial<PlatBookShape>).getHolderPath === 'function',
    );
  }

  /**
   * The provisioner a book names, or null when it names none (an offer
   * with nothing behind it is a content bug, and the sale says so rather
   * than taking the money).
   */
  private holderFor(book: PlatBookShape): PlatWarrenShape | null {
    const path = book.getHolderPath();
    if (!path) return null;
    return StuffApi.findByTemplatePath<PlatWarrenShape>(path) ?? null;
  }

  /** `title` — what ground do I hold, and what may I do on it. */
  private async executeHoldings(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const me = giver.getIdentityPath() ?? '';
    const held: string[] = [];

    for (const book of this.books()) {
      const where = book.getLabel();
      for (const extent of await book.lotExtents()) {
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
    if (!this.atDeedDesk(giver)) {
      this.notAtDesk(context, 'list');
      return;
    }

    const lines: string[] = [];
    for (const book of this.books()) {
      const price = Money.of(book.getPriceMinor(), Currency.compact());
      const area = Quantity.of(book.getAreaM2(), 'm²');
      const use = book.getLandUse();
      lines.push(`${book.getLabel()}:`);
      for (const extent of await book.lotExtents()) {
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
    if (!this.atDeedDesk(giver)) {
      this.notAtDesk(context, 'buy');
      return;
    }

    // Which subdivision sells it? The holders are the plat books; this
    // controller knows none of them by name.
    const raw = model.lot ?? '';
    let book: PlatBookShape | null = null;
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

    const buyer = giver.getIdentityPath();
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

    // The ASCENT GATE (residences P10/D6): acquiring the next rung
    // reads the condition of what the actor already holds and refuses
    // below the shipped threshold — money necessary, condition binding.
    // Holding nothing passes (the gate compares you to your record).
    const ascent = await this.ascentRefusal(buyer);
    if (ascent) {
      this.reject(context, giver, Mml.compose`${ascent}`, 'ascent-condition', ascent);
      return;
    }

    // The district must have an owner to subdivide under (inherited by
    // the minted lot — the book knows no locality and neither does this
    // verb; a second subdivision's owner rides its own parcel row).
    const district = await ParcelApi.coveringParcelOf(book.getParentExtent());
    const districtOwner = district?.getOwner() ?? null;
    if (!districtOwner) {
      this.reject(
        context,
        giver,
        Mml.compose`The district has no owner of record to subdivide under.`,
        'no-district-owner',
        `${book.getParentExtent()} has no covering parcel owner`,
      );
      return;
    }

    // The money leg FIRST. A failed payment must leave no parcel row and
    // no room behind — nothing changes hands until the money has.
    const price = book.getPriceMinor();
    const paid = await this.takePayment(price, extent, giver);
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
      districtOwner,
      book.getAreaM2(),
      1,
      book.getLandUse(),
    );
    // …then hand the title over. Two steps, because the chain-of-title
    // log should read "subdivided, then transferred" — which is what
    // actually happened.
    await ParcelApi.transfer(extent, { kind: 'player', templatePath: buyer });

    // Key the house and hand the buyer the key (D7 — the dorm's
    // provision sequence, relocated to the sale chokepoint): a fresh
    // keyway on the lot's parcel row, a physical brass key in hand plus
    // an implant-keychain entry. The house door checks the KEY, never
    // identity; a resale-less re-provision re-keys.
    const keyway = Lock.mintKeyway();
    await ParcelApi.setKeyway(extent, keyway);
    try {
      await Lock.issueKey(giver, keyway, 'pin-tumbler');
    } catch (err) {
      console.warn(`TitleController: key issue failed for ${extent}:`, err);
    }

    // Stand the ground up, keyed on the extent we just wrote — the
    // book's own provisioner, whatever model it implements. BEST-EFFORT:
    // the title is real whatever the ground does (an offer with a broken
    // provisioner is a content bug the sale must not amplify by taking
    // the money AND throwing).
    const holder = this.holderFor(book);
    let firstTime = true;
    if (holder) {
      try {
        firstTime = (await holder.provision(extent)).firstTime;
        // …and hang the gate off the street, so there is a way in.
        // Outside `provision` on purpose: that method is the `@hook` a
        // different provisioning model replaces wholesale, and the way
        // in must survive the replacement.
        await holder.ensureGate(extent);
      } catch (err) {
        console.warn(
          `TitleController: provisioning ${extent} failed (title stands):`,
          err,
        );
      }
    }
    const leaf = extent.slice(extent.lastIndexOf('/') + 1);
    const where = book.getLabel();
    // Which side of the road it is on. A gate used to be directioned by
    // the lot leaf, so the deed named the way in by naming the lot; now
    // the gate is a compass point and the deed has to say which.
    const side = holder?.gateDirectionFor?.(extent) ?? null;
    const gate = side ? ` The gate is on the ${side} side.` : '';

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        firstTime
          ? Mml.compose`The registrar writes the row, blots it, and turns the book around for you to see. ${leaf} in ${where} is yours.${gate}`
          : Mml.compose`The registrar writes the row and turns the book around. ${leaf} in ${where} is yours again.${gate}`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} buys a lot in ${where}.`)
      .send();
  }

  // ── helpers ──

  /**
   * Whether the actor stands at a deed counter — the room contains a
   * `DeedDesk` fixture (residences P6: the venue is the DESK, never a
   * room constant, so the Registry and the realty office — and any
   * future records office — are populated rows, no code). Matched by
   * class-lineage name (the concrete class ships in the residence
   * pack; the kernel imports no pack code).
   */
  private atDeedDesk(giver: Stuff): boolean {
    if (!MixinApi.isContainable(giver)) return false;
    const here = giver.getContainer();
    if (!here || !MixinApi.isContainer(here)) return false;
    return here.getContents().some((c) => {
      let proto = Object.getPrototypeOf(c) as {
        constructor?: { name?: string };
      } | null;
      while (proto?.constructor) {
        if (proto.constructor.name === 'DeedDesk') return true;
        proto = Object.getPrototypeOf(proto) as typeof proto;
      }
      return false;
    });
  }

  private notAtDesk(context: CommandContext, sub: string): void {
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
      detail: `title ${sub} requires standing at a deed desk`,
    });
  }

  /**
   * The ascent gate's read (P10): the condition of every residential
   * holding the buyer already has; a band below the shipped threshold
   * refuses, reason named. Null = pass.
   */
  private async ascentRefusal(buyer: string): Promise<string | null> {
    let min = 0.5;
    try {
      const raw = Number.parseFloat(
        AppApi.setting('residence.ascent.minCondition'),
      );
      if (Number.isFinite(raw) && raw > 0) min = raw;
    } catch {
      /* cold cache — the shipped default */
    }
    for (const record of await ParcelApi.heldUnitsOf(buyer)) {
      const extent = record.getExtent();
      let cond: { condition: number; band: string } | null = null;
      try {
        cond = await OuterWarren.conditionOf(extent);
      } catch {
        cond = null;
      }
      if (cond && cond.condition < min) {
        const leaf = extent.slice(extent.lastIndexOf('/') + 1);
        return (
          `The registrar looks over your record and shakes their head: ` +
          `the home you already hold (${leaf}) is ${cond.band}. Put your ` +
          `own house in order first.`
        );
      }
    }
    return null;
  }

  /**
   * Move the money through banking's settle chokepoint, to the Registry's
   * own Business. The Improvement District has no treasury — it is a
   * government that exists on paper — so the city's records office takes
   * the payment on its behalf, which is what a paper government's
   * finances actually look like.
   */
  private async takePayment(
    amount: number,
    extent: string,
    giver: Stuff,
  ): Promise<boolean> {
    let account: string;
    try {
      const here = MixinApi.isContainable(giver)
        ? giver.getContainer()
        : null;
      const venue = here?.getTemplatePath();
      if (!venue) return false;
      const business = await EmploymentApi.ensureOperatorAt(venue);
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
