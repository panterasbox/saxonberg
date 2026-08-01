/**
 * LotHolder — **a subdivision's plat book**: the lots it has to sell, and
 * the keyed room that stands on each one once sold.
 *
 * Holding title to a lot is a **platform** concept, not a Hinkley Hills
 * one. Any locality that subdivides ground and sells it needs exactly
 * this — a list of what is on offer, a price, and a room per sold lot
 * keyed so that title and durable state share an identity. So the CLASS
 * lives here in `/obj/`, and each subdivision seeds its own **instance**
 * with its own data, the way `/obj/Plant` is the class and
 * `/obj/plant/carrot` is a carrot.
 *
 * `SingletonMixin` is one-instance-per-templatePath, so a holder per
 * subdivision is exactly what composing it means.
 *
 * ## The data IS the subdivision
 *
 * Everything locality-specific is authored — `parentExtent`, `lots`,
 * `roomTemplate`, `priceMinor`, `areaM2`, `landUse` — so a second
 * subdivision anywhere in the world is a seed file and no code. The
 * `title` verb reads all of it off whichever holder governs the ground,
 * rather than knowing any of it.
 *
 * ## Keyed on the PARCEL EXTENT
 *
 * Not on a player id and not on a slot number: on the extent the
 * `parcels` row is keyed by. Title and durable state therefore share one
 * identity — the row that says you own the ground and the record that
 * remembers what is growing on it are the same key. Sell the lot and the
 * garden goes with it, because there is nothing else it could do.
 *
 * The standing-up itself is one call to `PersistableApi.restoreOrSeed` —
 * the keyed-holder ground pattern, shared with `DormWarren.admit`. This is
 * its second consumer, and the reason it lives on the spine rather than in
 * the dorm.
 *
 * ## Not boundary-exempt, and it should not be
 *
 * Content, so the sandbox's ordinary scope compare applies (the exempt
 * list is an enumeration of framework registries; `DormWarren` is likewise
 * absent from it). A new module category fails closed, which is the right
 * default for a thing that mints rooms.
 *
 * See [docs/subsystems/smallholding.md] and [docs/subsystems/parcel.md].
 */

import { Idea } from "../lib/stuff/Idea";
import { SingletonMixin } from "../lib/stuff/Singleton";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { StuffApi } from "../api/stuff";
import { PersistableApi } from "../api/persistable";
import { LandUses, type LandUse } from "../lib/parcel/LandUse";
import type { Stuff } from "../lib/stuff/Stuff";
import type { VetoResult } from "../lib/errors";

const LotHolderBase = SingletonMixin(PostRegistrationMixin(Idea));

export default class LotHolder extends LotHolderBase {
  static persistentFields: string[] = [
    "label",
    "parentExtent",
    "lots",
    "roomTemplate",
    "priceMinor",
    "areaM2",
    "landUse",
  ];

  /**
   * What to call this subdivision in the plat book — "Hinkley Hills".
   * A plain label rather than `NamedMixin`: proper names belong to
   * characters, and this is a record, not somebody.
   *
   * @authorable
   */
  public label: string = "";

  public getLabel(): string {
    return this.label || this.parentExtent;
  }

  public setLabel(value: string): void {
    this.label = value;
  }

  /**
   * The district extent lots are subdivided OUT of — the parcel row that
   * already exists, and that a sold lot becomes a child of.
   *
   * @authorable
   */
  public parentExtent: string = "";

  /**
   * The plat book: the leaf names this subdivision has to sell. Leaf
   * names, not full extents — the extent is `parentExtent/<leaf>`, so a
   * subdivision cannot accidentally sell ground it does not govern.
   *
   * @authorable
   */
  public lots: string[] = [];

  /**
   * The room template cloned per sold lot. Hinkley's is a yard; another
   * subdivision's might be a dock or a shopfront, which is exactly why
   * this is data.
   *
   * @authorable ref:Template
   */
  public roomTemplate: string = "";

  /** Price of one lot, in minor units. @authorable */
  public priceMinor: number = 0;

  /** Declared area of one lot, in m². @authorable */
  public areaM2: number = 0;

  /**
   * The land use a sold lot is stamped with. Validated against the closed
   * vocabulary on the setter, so a typo fails at seed time rather than
   * reading as `wild` — and therefore as "nothing may be grown here" —
   * much later and much less obviously.
   *
   * @authorable
   */
  public landUse: LandUse = "residential";

  /** Live rooms by lot extent — the process-lifetime cache. */
  private _roomsByLot = new Map<string, Stuff>();

  /** A load-bearing process-lifetime singleton is never culled. */
  public canEvict(): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  // ── the plat book ──

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

  public getRoomTemplate(): string {
    return this.roomTemplate;
  }

  public setRoomTemplate(value: string): void {
    this.roomTemplate = value;
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

  public getLandUse(): LandUse {
    return this.landUse;
  }

  public setLandUse(value: LandUse | string): void {
    this.landUse = LandUses.parse(value);
  }

  /**
   * The full extent for a lot leaf, or null when this subdivision does
   * not sell it. Accepts `lot 2`, `lot-2` and `2` alike — a player types
   * all three, and a plat book is a handful of entries.
   */
  public extentFor(raw: string): string | null {
    const cleaned = raw.trim().toLowerCase().replace(/\s+/g, "-");
    const candidate = /^\d+$/.test(cleaned) ? `lot-${cleaned}` : cleaned;
    if (!this.lots.includes(candidate)) return null;
    return `${this.parentExtent}/${candidate}`;
  }

  /** Every lot extent this subdivision offers, in authored order. */
  public lotExtents(): string[] {
    return this.lots.map((l) => `${this.parentExtent}/${l}`);
  }

  /** Whether `extent` is a lot this subdivision governs. */
  public governs(extent: string): boolean {
    return this.lotExtents().includes(extent);
  }

  // ── standing the ground up ──

  /**
   * The live room for `lotExtent`, materialized if needed, plus whether
   * this was a FIRST provisioning (`true`) or a re-entry to ground
   * already worked. The sale uses that to decide how to describe it.
   */
  public async provision(
    lotExtent: string,
  ): Promise<{ room: Stuff; firstTime: boolean }> {
    const cached = this._roomsByLot.get(lotExtent);
    if (cached && !cached.isDestroyed()) {
      return { room: cached, firstTime: false };
    }
    const room = await StuffApi.clone<Stuff>(this.roomTemplate);
    const restored = await PersistableApi.restoreOrSeed(room, lotExtent);
    this._roomsByLot.set(lotExtent, room);
    return { room, firstTime: !restored };
  }

  /** The live room for a lot if one is standing, else null. */
  public liveRoomFor(lotExtent: string): Stuff | null {
    const cached = this._roomsByLot.get(lotExtent);
    return cached && !cached.isDestroyed() ? cached : null;
  }
}
