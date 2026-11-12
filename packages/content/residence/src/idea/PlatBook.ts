/**
 * PlatBook — **what a subdivision has for sale**, and on what terms —
 * now GENERATIVE (residences D10): the authored 40-entry `lots:` roster
 * is retired ("surveyed for a hundred families" is prose, where it
 * always belonged). A lot exists to sell when its number fits under the
 * operator's capacity dial; the plat plan (on the holder) says where it
 * lands.
 *
 * The catalogue half of selling land; {@link PlatWarren} is the
 * provisioning half, named here by path. Who actually holds a lot stays
 * the `parcels` collection's business, read through `ParcelApi`.
 */

import { Idea } from "@saxonberg/server/mud/lib/stuff/Idea";
import { SingletonMixin } from "@saxonberg/server/mud/lib/stuff/Singleton";
import { LandUses, type LandUse } from "@saxonberg/server/mud/lib/parcel/LandUse";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ParcelApi } from "@saxonberg/server/mud/api/parcel";
import { BankingApi, type Charge } from "@saxonberg/server/mud/api/banking";
import { BoundaryApi } from "@saxonberg/server/mud/api/boundary";
import { EmploymentApi } from "@saxonberg/server/mud/api/employment";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { Money } from "@saxonberg/server/mud/lib/banking/Money";
import { Lock } from "@saxonberg/server/mud/lib/lock/Lock";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { VetoResult } from "@saxonberg/server/mud/lib/errors";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";
import { Ascent, type AscentRefusal } from "../lib/Ascent";
import PlatWarren from "./PlatWarren";

/**
 * Why a land sale refused (`PlatBook.sell`). Every one is decided BEFORE the
 * money moves, so a refusal leaves the buyer's money where it was
 * (controller-liquidity C1).
 */
export type SaleRefusal =
  | "unknown-lot"
  | "already-sold"
  | "no-durable-identity"
  | "ascent-condition"
  | "no-district-owner"
  | "zoning"
  | "insufficient-funds";

/** What `PlatBook.sell` answers: the lot that is now yours, or why not. */
export type SaleAnswer =
  | {
      ok: true;
      extent: string;
      /** A first provisioning (`false` = the ground was already there). */
      firstTime: boolean;
      /** The compass side of the road the lot's gate hangs on, if known. */
      gateSide: string | null;
    }
  | {
      ok: false;
      reason: SaleRefusal;
      detail: string;
      /** The price asked, in minor units (for the refusal's words). */
      priceMinor: number;
      /** The holding that failed the ascent gate (`ascent-condition`). */
      ascent?: AscentRefusal;
    };

/** The lock fitted to a sold lot's door. */
const LOT_LOCK_TECH = "pin-tumbler" as const;

const PlatBookBase = SingletonMixin(Idea);

export default class PlatBook extends PlatBookBase {
  static fieldMeta: FieldMeta = {
    label: { persistent: true, authorable: true },
    parentExtent: { persistent: true, authorable: true },
    lotBranch: { persistent: true, authorable: true },
    lotPrefix: { persistent: true, authorable: true },
    priceMinor: { persistent: true, authorable: true },
    areaM2: { persistent: true, authorable: true },
    landUse: { persistent: true, authorable: true },
    lotWaterSource: { persistent: true, authorable: true },
    holderPath: { persistent: true, authorable: true, authorPicker: 'Template' },
  };

  /** What to call this subdivision — "Hinkley Hills". */
  public label: string = "";

  /** The district extent lots are subdivided OUT of. */
  public parentExtent: string = "";

  /**
   * The branch lots hang off, between the district and the leaf —
   * `…/hinkley-hills` + `lots` + `lot-1`. Load-bearing: one authored
   * zone at `<parentExtent>/<lotBranch>` puts every lot's room across
   * the cartesian boundary. Empty flattens to `parentExtent/<leaf>`.
   */
  public lotBranch: string = "lots";

  /** The slot-leaf prefix (`lot-` → `lot-7`). Generative D10: any
   *  `<prefix><n>` with n ≤ the capacity is offered. */
  public lotPrefix: string = "lot-";

  /** Price of one lot, in minor units. */
  public priceMinor: number = 0;

  /** Declared area of one lot, in m². */
  public areaM2: number = 0;

  /** The land use a sold lot is stamped with (validated on set). */
  public landUse: LandUse = "residential";

  /**
   * ⭐ Where a sold lot takes its water (water-supply D1): `none` — an
   * unserviced lot until a plumber's service run cites a main — or a
   * supply path, or `''` to inherit the district's citation.
   */
  public lotWaterSource: string = "";

  /** The {@link PlatWarren} that stands ground up when a lot sells (an
   *  identity path — the book is reference data). */
  public holderPath: string = "";

  /** A load-bearing process-lifetime singleton is never culled. */
  public canEvict(): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  public getLabel(): string {
    return this.label || this.parentExtent;
  }

  public setLabel(value: string): void {
    this.label = value;
  }

  public getParentExtent(): string {
    return this.parentExtent;
  }

  public setParentExtent(value: string): void {
    this.parentExtent = value;
  }

  public getPriceMinor(): number {
    return this.priceMinor;
  }

  public setPriceMinor(value: number): void {
    this.priceMinor = Math.max(0, value);
  }

  public getAreaM2(): number {
    return this.areaM2;
  }

  public setAreaM2(value: number): void {
    this.areaM2 = Math.max(0, value);
  }

  public getLotBranch(): string {
    return this.lotBranch;
  }

  public setLotBranch(value: string): void {
    this.lotBranch = value.replace(/^\/+|\/+$/g, "");
  }

  public getLotPrefix(): string {
    return this.lotPrefix;
  }

  public setLotPrefix(value: string): void {
    this.lotPrefix = value;
  }

  public getLandUse(): LandUse {
    return this.landUse;
  }

  public setLandUse(value: LandUse | string): void {
    this.landUse = LandUses.parse(value);
  }

  public getLotWaterSource(): string {
    return this.lotWaterSource;
  }

  public setLotWaterSource(value: string): void {
    this.lotWaterSource = typeof value === "string" ? value.trim() : "";
  }

  public getHolderPath(): string {
    return this.holderPath;
  }

  public setHolderPath(value: string): void {
    this.holderPath = value;
  }

  /**
   * Has `extent` sold? A title row at exactly that extent — the parcel
   * registry is the book of record, the plat book only offers.
   */
  public async isSold(extent: string): Promise<boolean> {
    const existing = await ParcelApi.coveringParcelOf(extent);
    return existing !== null && existing.getExtent() === extent;
  }

  /**
   * ⭐ **Sell a lot to whoever is acting**, over `desk` — the whole land
   * sale, check-then-act (controller-liquidity W13, C1):
   *
   *  1. every refusal first — an offered lot, unsold, a buyer with a
   *     durable identity, the ascent gate ({@link Ascent}), a district
   *     owner to subdivide under, and the registry's own area/zoning
   *     checks (`ParcelApi.subdivisionRefusal`);
   *  2. the money leg, through banking's settle chokepoint, to the venue
   *     the desk stands in (credential, then cash);
   *  3. the writes — subdivide, the water citation, the transfer, the
   *     keyway and the buyer's key;
   *  4. the ground, best-effort (the title is real whatever the ground
   *     does — an offer with a broken provisioner is a content bug the sale
   *     must not amplify by throwing after taking the money).
   *
   * The title goes to `buyer`; the money is drawn by the settle chokepoint
   * from whoever is acting (a purchase for somebody else is a gift).
   */
  public async sell(extent: string, buyer: Stuff, desk: Stuff): Promise<SaleAnswer> {
    const price = this.priceMinor;
    const refuse = (
      reason: SaleRefusal,
      detail: string,
      ascent?: AscentRefusal,
    ): SaleAnswer => ({ ok: false, reason, detail, priceMinor: price, ascent });

    if (!this.governs(extent)) {
      return refuse("unknown-lot", `${extent} is not a lot this book offers`);
    }
    if (await this.isSold(extent)) {
      return refuse("already-sold", `${extent} already has a title row`);
    }
    const buyerPath = buyer.getIdentityPath();
    if (!buyerPath) {
      return refuse("no-durable-identity", "the buyer has no identity to hold title with");
    }
    const ascent = await new Ascent().refusalFor(buyerPath);
    if (ascent) {
      return refuse("ascent-condition", `${ascent.extent} is ${ascent.band}`, ascent);
    }
    // The district must have an owner to subdivide under (inherited by the
    // minted lot — a second subdivision's owner rides its own parcel row).
    const district = await ParcelApi.coveringParcelOf(this.parentExtent);
    const districtOwner = district?.getOwner() ?? null;
    if (!districtOwner) {
      return refuse("no-district-owner", `${this.parentExtent} has no covering parcel owner`);
    }
    const zoning = await ParcelApi.subdivisionRefusal(
      extent,
      this.parentExtent,
      this.areaM2,
      this.landUse,
    );
    if (zoning) return refuse("zoning", zoning.detail);

    // The money leg. Nothing changes hands until the money has.
    if (!(await this.takePayment(extent, desk))) {
      return refuse("insufficient-funds", `could not settle ${price} for ${extent}`);
    }

    // Mint the row, stamping the use and the area the subdivision declares;
    // then the lot's water posture (water-supply D1); then hand the title
    // over — two steps, so the chain of title reads "subdivided, then
    // transferred", which is what happened.
    await ParcelApi.subdivide(
      extent,
      this.parentExtent,
      districtOwner,
      this.areaM2,
      1,
      this.landUse,
    );
    if (this.lotWaterSource !== "") {
      await ParcelApi.citeWaterSource(extent, this.lotWaterSource);
    }
    await ParcelApi.transfer(extent, { kind: "player", templatePath: buyerPath });

    // Key the house and hand the buyer the key (D7): a fresh keyway on the
    // lot's row, a brass key in hand plus an implant-keychain entry. The
    // door checks the KEY, never identity.
    const keyway = BoundaryApi.mintKeyway();
    await ParcelApi.setKeyway(extent, keyway);
    try {
      await new Lock(keyway, LOT_LOCK_TECH).issueKeyTo(buyer);
    } catch (err) {
      console.warn(`PlatBook: key issue failed for ${extent}:`, err);
    }

    // Stand the ground up — the book's own provisioner, whatever model it
    // implements — and hang the gate off the street. The gate is outside
    // `provision` on purpose: that method is the `@hook` a different
    // provisioning model replaces wholesale, and the way in must survive it.
    const holder = this.provisioner();
    let firstTime = true;
    if (holder) {
      try {
        firstTime = (await holder.provision(extent)).firstTime;
        await holder.ensureGate(extent);
      } catch (err) {
        console.warn(`PlatBook: provisioning ${extent} failed (title stands):`, err);
      }
    }
    return {
      ok: true,
      extent,
      firstTime,
      gateSide: holder?.gateDirectionFor(extent) ?? null,
    };
  }

  /** The book's provisioner as the class it is, or null. */
  private provisioner(): PlatWarren | null {
    if (!this.holderPath) return null;
    const holder = StuffApi.findByTemplatePath<Stuff>(this.holderPath) ?? null;
    return holder instanceof PlatWarren ? holder : null;
  }

  /**
   * Move the price through banking's settle chokepoint, to the Business
   * operating the room the desk stands in. The district has no treasury —
   * it is a government on paper — so the records office takes the payment
   * on its behalf.
   */
  private async takePayment(extent: string, desk: Stuff): Promise<boolean> {
    let account: string;
    try {
      const here = MixinApi.isContainable(desk) ? desk.getContainer() : null;
      const venue = here?.getTemplatePath();
      if (!venue) return false;
      const business = await EmploymentApi.ensureOperatorAt(venue);
      if (!business) return false;
      account = await EmploymentApi.operatingAccountOf(business);
    } catch {
      return false;
    }
    const charge: Charge = {
      amount: Money.of(this.priceMinor, BankingApi.compactCurrency()),
      reason: `title to ${extent}`,
      presented: true,
      payeeAccountId: account,
      category: "sales",
    };
    try {
      await BankingApi.settle(charge, { kind: "credential" });
      return true;
    } catch {
      try {
        await BankingApi.settle(charge, { kind: "cash" });
        return true;
      } catch {
        return false;
      }
    }
  }

  /** The operator's capacity (the holder's D10 dial; 40 with no holder). */
  public capacity(): number {
    return this.provisioner()?.capacity() ?? 40;
  }

  /**
   * The full extent for a lot leaf, or null when this book does not
   * offer it. Accepts `lot 2`, `lot-2` and `2` alike — GENERATIVE: any
   * number from 1 up to the capacity is a real offer (D10: minted at
   * sale, no roster).
   */
  public extentFor(raw: string): string | null {
    const cleaned = raw.trim().toLowerCase().replace(/\s+/g, "-");
    const candidate = /^\d+$/.test(cleaned)
      ? `${this.lotPrefix}${cleaned}`
      : cleaned;
    const n = this.lotNumberOf(candidate);
    if (n === null || n < 1 || n > this.capacity()) return null;
    return this.extentOfLeaf(candidate);
  }

  /**
   * The listing set: every SOLD lot ∪ the next free one — the window a
   * buyer reads (`title list` / the realty window). The roster is gone;
   * what exists is what sold plus what the plan offers next.
   */
  public async lotExtents(): Promise<string[]> {
    // ⭐ Load on use: the book names its holder, so the listing stands it
    // up rather than reading only one something else happened to load
    // (a plat that is not booted listed nothing — tracts build W4).
    if (this.holderPath && !this.provisioner()) {
      try {
        await StuffApi.singleton(this.holderPath);
      } catch (err) {
        console.warn(`PlatBook: holder '${this.holderPath}' did not stand up —`, err);
      }
    }
    const sold: string[] = [];
    const takenLeafs = new Set<string>();
    for (const child of await ParcelApi.childParcelsOf(this.parentExtent)) {
      const extent = child.getExtent();
      if (!this.governs(extent)) continue;
      sold.push(extent);
      takenLeafs.add(extent.slice(extent.lastIndexOf("/") + 1));
    }
    sold.sort(
      (a, b) => (this.lotNumberOf(leafOf(a)) ?? 0) - (this.lotNumberOf(leafOf(b)) ?? 0),
    );
    const next = this.provisioner()?.nextFreeLeaf(takenLeafs) ?? null;
    if (next && this.lotNumberOf(next) !== null) {
      sold.push(this.extentOfLeaf(next));
    }
    return sold;
  }

  /** The branch lots hang off. */
  public lotsExtent(): string {
    return this.lotBranch
      ? `${this.parentExtent}/${this.lotBranch}`
      : this.parentExtent;
  }

  private extentOfLeaf(leaf: string): string {
    return `${this.lotsExtent()}/${leaf}`;
  }

  private lotNumberOf(leaf: string): number | null {
    if (!leaf.startsWith(this.lotPrefix)) return null;
    const n = Number(leaf.slice(this.lotPrefix.length));
    return Number.isInteger(n) ? n : null;
  }

  /** Whether `extent` is a lot this book offers — by prefix + cap
   *  (generative), never a roster. */
  public governs(extent: string): boolean {
    const prefix = `${this.lotsExtent()}/`;
    if (!extent.startsWith(prefix)) return false;
    const n = this.lotNumberOf(extent.slice(prefix.length));
    return n !== null && n >= 1 && n <= this.capacity();
  }
}

function leafOf(extent: string): string {
  return extent.slice(extent.lastIndexOf("/") + 1);
}
