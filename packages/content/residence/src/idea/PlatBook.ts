/**
 * PlatBook — **what a subdivision has for sale**, and on what terms.
 *
 * The catalogue half of selling land. It answers the questions a buyer
 * standing at a records counter asks: which lots exist here, how big is
 * one, what will it be zoned, what does it cost. It knows nothing about
 * what physically appears when a lot is bought — that is
 * {@link LotHolder}'s job, named here by path.
 *
 * ## Why the two are separate objects
 *
 * They are the same size today and they will not stay that way. The
 * catalogue grows *outward* as land becomes a market — terms, dynamic
 * offers, demand-priced lots, auctions — while provisioning grows
 * *inward* and is the piece most likely to be replaced wholesale: the
 * current shape clones one shared room template per lot and keys it,
 * and the likely successor mints a template per residence instead.
 *
 * Keeping them apart means that replacement is a **new `LotHolder`
 * subclass and a one-line seed edit**, with nothing in the book, the
 * `title` verb or the parcel layer touched. Fused, the same change would
 * reach into the object that also owns pricing.
 *
 * ## Holding the terms, not the title
 *
 * A plat book records what is *offered*. Who actually holds a lot is the
 * `parcels` collection's business and is read through `ParcelApi` — this
 * class deliberately has no opinion, so there is exactly one answer to
 * "who owns this ground" and it is the gated one.
 *
 * See [docs/subsystems/smallholding.md] and [docs/subsystems/parcel.md].
 */

import { Idea } from "@saxonberg/server/mud/lib/stuff/Idea";
import { SingletonMixin } from "@saxonberg/server/mud/lib/stuff/Singleton";
import { PostRegistrationMixin } from "@saxonberg/server/mud/lib/stuff/PostRegistration";
import { LandUses, type LandUse } from "@saxonberg/server/mud/lib/parcel/LandUse";
import type { VetoResult } from "@saxonberg/server/mud/lib/errors";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";

const PlatBookBase = SingletonMixin(PostRegistrationMixin(Idea));

export default class PlatBook extends PlatBookBase {
  static fieldMeta: FieldMeta = {
    label: { persistent: true, authorable: true },
    parentExtent: { persistent: true, authorable: true },
    lotBranch: { persistent: true, authorable: true },
    lots: { persistent: true, authorable: true },
    priceMinor: { persistent: true, authorable: true },
    areaM2: { persistent: true, authorable: true },
    landUse: { persistent: true, authorable: true },
    holderPath: { persistent: true, authorable: true, authorPicker: 'Template' },
  };

  /**
   * What to call this subdivision — "Hinkley Hills". A plain label
   * rather than `NamedMixin`: proper names belong to characters, and
   * this is a record, not somebody.
   */
  public label: string = "";

  /**
   * The district extent lots are subdivided OUT of — the parcel row that
   * already exists, and that a sold lot becomes a child of.
   */
  public parentExtent: string = "";

  /**
   * The lot leaf names this subdivision sells. Leaves, not full extents:
   * the extent is `parentExtent/<lotBranch>/<leaf>`, so a book cannot
   * accidentally offer ground its district does not cover.
   */
  public lots: string[] = [];

  /**
   * The branch lots hang off, between the district and the leaf —
   * `…/hinkley-hills` + `lots` + `lot-1`.
   *
   * It exists to keep the lots in a **zone of their own**, and that is
   * load-bearing rather than tidiness. A street is a cartesian grid, and
   * a cartesian zone admits a non-cardinal exit (the `lot-1` gate) only
   * across a zone boundary — correctly, because a lot is not a grid cell
   * of the street: N lots cannot share one coordinate. One authored
   * `FolderZone` template at `<parentExtent>/<lotBranch>` puts every lot
   * on the far side of that boundary, with no per-lot template row.
   *
   * Empty flattens it back to `parentExtent/<leaf>` for a subdivision
   * whose district is not a grid.
   */
  public lotBranch: string = "lots";

  /** Price of one lot, in minor units. */
  public priceMinor: number = 0;

  /** Declared area of one lot, in m². */
  public areaM2: number = 0;

  /**
   * The land use a sold lot is stamped with. Validated against the closed
   * vocabulary on the setter, so a typo fails at seed time rather than
   * reading as `wild` — and therefore as "nothing may be grown here" —
   * much later and much less obviously.
   */
  public landUse: LandUse = "residential";

  /**
   * The {@link LotHolder} that stands ground up when a lot here sells.
   * A path rather than a live ref (an identity ref): the book is reference
   * data, and naming the mechanism keeps the two swappable.
   */
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

  public getLots(): string[] {
    return [...this.lots];
  }

  public setLots(value: string[]): void {
    this.lots = [...value];
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

  /** Trailing/leading slashes are stripped — the branch is one segment,
   *  and an authored `/lots/` would double the separator in every extent. */
  public setLotBranch(value: string): void {
    this.lotBranch = value.replace(/^\/+|\/+$/g, "");
  }

  public getLandUse(): LandUse {
    return this.landUse;
  }

  public setLandUse(value: LandUse | string): void {
    this.landUse = LandUses.parse(value);
  }

  public getHolderPath(): string {
    return this.holderPath;
  }

  public setHolderPath(value: string): void {
    this.holderPath = value;
  }

  /**
   * The full extent for a lot leaf, or null when this book does not
   * offer it. Accepts `lot 2`, `lot-2` and `2` alike — a player types
   * all three, and a plat book is a handful of entries.
   */
  public extentFor(raw: string): string | null {
    const cleaned = raw.trim().toLowerCase().replace(/\s+/g, "-");
    const candidate = /^\d+$/.test(cleaned) ? `lot-${cleaned}` : cleaned;
    if (!this.lots.includes(candidate)) return null;
    return this.extentOfLeaf(candidate);
  }

  /** Every lot extent this book offers, in authored order. */
  public lotExtents(): string[] {
    return this.lots.map((l) => this.extentOfLeaf(l));
  }

  /** The branch lots hang off — `<parentExtent>/<lotBranch>`, or the
   *  district itself when no branch is configured. */
  public lotsExtent(): string {
    return this.lotBranch
      ? `${this.parentExtent}/${this.lotBranch}`
      : this.parentExtent;
  }

  private extentOfLeaf(leaf: string): string {
    return `${this.lotsExtent()}/${leaf}`;
  }

  /** Whether `extent` is a lot this book offers. */
  public governs(extent: string): boolean {
    return this.lotExtents().includes(extent);
  }
}
