/**
 * TitleBuyController — `title buy <lot>`: the land sale, the whole
 * transaction.
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
 * The subdivisions are content. Everything
 * locality-specific — which lots exist, what they cost, how big they are,
 * what stands on one, what use it is stamped with — is authored on a
 * `PlatWarren` instance (the residence pack’s), and this controller enumerates the holders
 * rather than knowing any of them. A second subdivision anywhere in the
 * world is a seed file and no change here.
 *
 * The venue is the DESK (residences P6), bound off the view: a second
 * records office is a populated row and no change here.
 *
 * ⚠ Inside a sandbox circle this whole path is refused twice over —
 * `subdivide` and `transfer` both carry `assertFieldMutation`, and the
 * `parcels` collection is REFUSE in the PM policy table. A title minted
 * in a holodeck would be a real title.
 */

import { TitleBookControllerBase, type TitleBookModel } from './TitleBookControllerBase';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { BankingApi, type Charge } from '@saxonberg/server/mud/api/banking';
import { BoundaryApi } from '@saxonberg/server/mud/api/boundary';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Money } from '@saxonberg/server/mud/lib/banking/Money';
import { CirculationWarren } from '@saxonberg/server/mud/lib/location/CirculationWarren';
import { Lock } from '@saxonberg/server/mud/lib/lock/Lock';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import PlatBook from '../../PlatBook';
import PlatWarren from '../../PlatWarren';

const TOPIC = 'act.deed';

export default class TitleBuyController extends TitleBookControllerBase {
  async execute(model: TitleBookModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const desk = this.deskOf(model, context, 'buy');
    if (!desk) return;

    // Which subdivision sells it? The holders are the plat books; this
    // controller knows none of them by name.
    const raw = model.lot ?? '';
    let book: PlatBook | null = null;
    let extent: string | null = null;
    for (const b of await this.booksAt(desk)) {
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
      this.reject(context, Mml.compose`${ascent}`, 'ascent-condition', ascent);
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
        Mml.compose`You can't cover ${Money.of(price, BankingApi.compactCurrency()).render()} for that lot.`,
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
    // ⭐ The lot's water posture, as the book declares it (water-supply D1):
    // an unserviced lot reads `none` until a plumber's service run cites a
    // main for it.
    const lotWater = book.getLotWaterSource();
    if (lotWater !== '') await ParcelApi.citeWaterSource(extent, lotWater);
    // …then hand the title over. Two steps, because the chain-of-title
    // log should read "subdivided, then transferred" — which is what
    // actually happened.
    await ParcelApi.transfer(extent, { kind: 'player', templatePath: buyer });

    // Key the house and hand the buyer the key (D7 — the dorm's
    // provision sequence, relocated to the sale chokepoint): a fresh
    // keyway on the lot's parcel row, a physical brass key in hand plus
    // an implant-keychain entry. The house door checks the KEY, never
    // identity; a resale-less re-provision re-keys.
    const keyway = BoundaryApi.mintKeyway();
    await ParcelApi.setKeyway(extent, keyway);
    try {
      await new Lock(keyway, 'pin-tumbler').issueKeyTo(giver);
    } catch (err) {
      console.warn(`TitleBuyController: key issue failed for ${extent}:`, err);
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
          `TitleBuyController: provisioning ${extent} failed (title stands):`,
          err,
        );
      }
    }
    const leaf = extent.slice(extent.lastIndexOf('/') + 1);
    const where = book.getLabel();
    // Which side of the road it is on. A gate used to be directioned by
    // the lot leaf, so the deed named the way in by naming the lot; now
    // the gate is a compass point and the deed has to say which.
    const side = holder?.gateDirectionFor(extent) ?? null;
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

  /**
   * The provisioner a book names, or null when it names none (an offer
   * with nothing behind it is a content bug, and the sale says so rather
   * than taking the money).
   */
  private holderFor(book: PlatBook): PlatWarren | null {
    const path = book.getHolderPath();
    if (!path) return null;
    const holder = StuffApi.findByTemplatePath<Stuff>(path) ?? null;
    return holder instanceof PlatWarren ? holder : null;
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
        cond = await CirculationWarren.conditionOf(extent);
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
      amount: Money.of(amount, BankingApi.compactCurrency()),
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
}
