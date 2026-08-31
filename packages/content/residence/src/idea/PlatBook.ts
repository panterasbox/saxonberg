/**
 * PlatBook — **what a subdivision has for sale**, and on what terms —
 * now GENERATIVE (residences D10): the authored 40-entry `lots:` roster
 * is retired ("surveyed for a hundred families" is prose, where it
 * always belonged). A lot exists to sell when its number fits under the
 * operator's capacity dial; the plat plan (on the holder) says where it
 * lands.
 *
 * The catalogue half of selling land; {@link LotHolder} is the
 * provisioning half, named here by path. Who actually holds a lot stays
 * the `parcels` collection's business, read through `ParcelApi`.
 */

import { Idea } from "@saxonberg/server/mud/lib/stuff/Idea";
import { SingletonMixin } from "@saxonberg/server/mud/lib/stuff/Singleton";
import { PostRegistrationMixin } from "@saxonberg/server/mud/lib/stuff/PostRegistration";
import { LandUses, type LandUse } from "@saxonberg/server/mud/lib/parcel/LandUse";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ParcelApi } from "@saxonberg/server/mud/api/parcel";
import type { VetoResult } from "@saxonberg/server/mud/lib/errors";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";

/** The holder surface the book consults (capacity + the plan's order). */
interface HolderView {
  capacity(): number;
  nextFreeLeaf(taken: ReadonlySet<string>): string | null;
}

const PlatBookBase = SingletonMixin(PostRegistrationMixin(Idea));

export default class PlatBook extends PlatBookBase {
  static fieldMeta: FieldMeta = {
    label: { persistent: true, authorable: true },
    parentExtent: { persistent: true, authorable: true },
    lotBranch: { persistent: true, authorable: true },
    lotPrefix: { persistent: true, authorable: true },
    priceMinor: { persistent: true, authorable: true },
    areaM2: { persistent: true, authorable: true },
    landUse: { persistent: true, authorable: true },
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

  /** The {@link LotHolder} that stands ground up when a lot sells (an
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

  public getHolderPath(): string {
    return this.holderPath;
  }

  public setHolderPath(value: string): void {
    this.holderPath = value;
  }

  /** The provisioner, resolved live (null when not registered). */
  private holderView(): HolderView | null {
    if (!this.holderPath) return null;
    const holder = StuffApi.findByTemplatePath(this.holderPath);
    if (!holder) return null;
    const h = holder as unknown as Partial<HolderView>;
    return typeof h.capacity === "function" &&
      typeof h.nextFreeLeaf === "function"
      ? (h as HolderView)
      : null;
  }

  /** The operator's capacity (the holder's D10 dial; 40 with no holder). */
  public capacity(): number {
    return this.holderView()?.capacity() ?? 40;
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
    const next = this.holderView()?.nextFreeLeaf(takenLeafs) ?? null;
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
