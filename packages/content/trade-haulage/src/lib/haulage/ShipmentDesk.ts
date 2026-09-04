/**
 * ShipmentDeskMixin — **the counter accepts goods for carriage and files
 * the paper.**
 *
 * The trade's own capability, composed by the depot counter. Substrate
 * that is only ever inherited, so it lives in the pack's `lib/` — never
 * instanced, never template-backed, and it does not start `/lib/`, so
 * the *nothing instances `/lib/`* invariant never fires.
 *
 * ## ⚠ Handing goods to a carrier is NOT consigning them
 *
 * Retail's `consign <thing> --ask <coin>` moves custody to a shop and
 * creates a **`ConsignmentListing`**: a priced listing, a commission
 * split, a consignor account paid on resale. Tendering goods here
 * creates a **bill of lading**: a destination, a custody chain, no
 * price, no buyer, no listing. The two share an English word and
 * nothing else — different input, different record, different outcome.
 *
 * ⭐⭐ And overloading one verb would have foreclosed the composition
 * this whole build exists to create: a `--to` that excludes `--ask`
 * makes *"ship it to Rejection and sell it there"* unexpressible, which
 * is the transport spread — the arbitrage. `ship` then `consign` at the
 * far end composes, and that is the point.
 *
 * ## What the desk actually does
 *
 * Custody moves to the carrier's vehicle or its floor; **ownership does
 * not** (custody ≠ ownership — the shipped chattel rule). The bill is
 * what proves the carrier took it, and it is the same paper the gig
 * path and the `hauls` brain file.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Business } from '@saxonberg/server/mud/platform/idea/Business';
import WaybillRegistry, {
  type CarriagePath,
} from '../../idea/WaybillRegistry';

/** Where the trade's registries live. */
export const WAYBILL_REGISTRY_PATH = '/trade/haulage/idea/WaybillRegistry';

/** What a tender produced, or why it was refused. */
export type TenderResult =
  | { ok: true; billPath: string }
  | { ok: false; reason: string };

/** What a desk needs told to accept a consignment for carriage. */
export interface Tender {
  /** The goods — a discrete, chattel-stampable container. */
  goods: Stuff & Containable;
  /** Where they are to go, as a durable location path. */
  destination: string;
  /** Who is sending them — a durable key. */
  shipper: string;
  /** Minor units the shipper declares them worth. Zero = undeclared. */
  declaredValueMinor: number;
  /** How the carriage happened. Defaults to `ship` — a counter tender. */
  via?: CarriagePath;
  /** The route's legs, when one is known (`WaybillRegistry.legsOf`). */
  legs?: readonly string[];
}

export interface ShipmentDesk {
  /** The carrier this desk acts for — a durable business path. */
  getCarrierPath(): string;
  setCarrierPath(value: string): void;
  /** Where accepted goods are held pending carriage; `''` = the desk itself. */
  getHoldPath(): string;
  setHoldPath(value: string): void;
  /** Accept goods for carriage and file the bill. */
  accept(tender: Tender): Promise<TenderResult>;
}

export function ShipmentDeskMixin<
  TBase extends MixinConstructor<Stuff & Container>,
>(Base: TBase) {
  return class ShipmentDeskMixin extends Base implements ShipmentDesk {
    static _mixinName = 'ShipmentDeskMixin';

    static fieldMeta: FieldMeta = {
      carrierPath: {
        persistent: true,
        authorable: true,
        authorPicker: 'Template',
      },
      holdPath: {
        persistent: true,
        authorable: true,
        authorPicker: 'Template',
      },
    };

    /** The carrier whose paper this desk files. Authored per counter. */
    public carrierPath = '';
    /**
     * Where accepted goods wait. Empty means the desk itself holds them,
     * which is right for a small counter and wrong for a depot with a
     * shed — so it is authored rather than assumed.
     */
    public holdPath = '';

    public getCarrierPath(): string {
      return this.carrierPath;
    }
    public setCarrierPath(value: string): void {
      this.carrierPath = value;
    }

    public getHoldPath(): string {
      return this.holdPath;
    }
    public setHoldPath(value: string): void {
      this.holdPath = value;
    }

    /**
     * Accept goods for carriage: move custody, file the bill, hand back
     * its path.
     *
     * ⚠ **Ownership is untouched.** A carrier holds your crate; it does
     * not come to own it, and the bill is what says so. Custody moving
     * without ownership moving is the whole of what bailment is, and it
     * is the shipped chattel rule rather than anything new here.
     */
    public async accept(tender: Tender): Promise<TenderResult> {
      const carrier = await this.resolveCarrier();
      if (!carrier) {
        return {
          ok: false,
          reason: 'this counter acts for no carrier — nobody can take it',
        };
      }
      if (tender.destination.trim() === '') {
        return { ok: false, reason: 'a consignment with no destination is not carriage' };
      }
      const hold = await this.resolveHold();
      if (!hold) {
        return { ok: false, reason: 'there is nowhere here to put it' };
      }

      const goods = tender.goods;
      const what = goods.getPresentation();
      const goodsPath = goods.getTemplatePath() ?? '';
      const howMuch = describeQuantity(goods as unknown as Stuff);

      ContainmentApi.move(goods, hold);

      const registry = await StuffApi.singleton<WaybillRegistry>(
        WAYBILL_REGISTRY_PATH,
      );
      const billPath = await registry.file(carrier, {
        what,
        goodsPath,
        howMuch,
        from: this.hereOf(),
        to: tender.destination,
        shipper: tender.shipper,
        declaredValueMinor: tender.declaredValueMinor,
        legs: [...(tender.legs ?? [])],
        via: tender.via ?? 'ship',
      });
      return { ok: true, billPath };
    }

    /** The place this desk stands in, as a durable path. */
    private hereOf(): string {
      const self = this as unknown as Stuff & Containable;
      if (!MixinApi.isContainable(self)) return '';
      return self.getContainer()?.getTemplatePath() ?? '';
    }

    private async resolveCarrier(): Promise<(Stuff & Business) | null> {
      if (this.carrierPath === '') return null;
      const biz = await StuffApi.singleton<Stuff>(this.carrierPath).catch(
        () => null,
      );
      return biz && MixinApi.isBusiness(biz) ? biz : null;
    }

    private async resolveHold(): Promise<(Stuff & Container) | null> {
      if (this.holdPath === '') {
        const self = this as unknown as Stuff;
        return MixinApi.isContainer(self) ? self : null;
      }
      const shed = await StuffApi.singleton<Stuff>(this.holdPath).catch(
        () => null,
      );
      return shed && MixinApi.isContainer(shed) ? shed : null;
    }
  };
}

/**
 * How much of it there is, said the way the goods themselves would say
 * it: a stack says its count, a bulk vessel says its litres, and one
 * crate says "one".
 *
 * ⚠ Prose, not a number the engine reads. The engine's answer to *how
 * much* is the goods; this is what goes on the paper so a person can
 * argue about it.
 */
function describeQuantity(goods: Stuff): string {
  if (MixinApi.isGlobbable(goods)) {
    return `${String(goods.getQuantity())}`;
  }
  if (MixinApi.isBulkable(goods) && goods.hasInteriorBulk()) {
    const slot = goods.getBulk('interior');
    return `${slot.getAmount().rawValue().toFixed(0)} L`;
  }
  return '1';
}
