/**
 * LotHolder — **how titled ground becomes a place**, and the live rooms
 * that result.
 *
 * The provisioning half of selling land; {@link PlatBook} is the
 * catalogue half and names one of these by path. The book says *lot 2,
 * a quarter acre, residential, 4000*; this says *when it sells, a
 * `TitledRoom` cloned from X, keyed on the lot's parcel extent*.
 *
 * ## Why this is its own object
 *
 * Because it is the piece most likely to be replaced wholesale. The
 * current shape clones ONE shared room template per lot and tells the
 * clones apart with a persistence key; the likely successor mints a
 * template **per residence** instead, at which point the template path
 * becomes the identity and no key is needed at all.
 *
 * Separated, that replacement is a new subclass of this class and a
 * one-line edit to a plat book's `holderPath` — nothing in the book, the
 * `title` verb or the parcel layer moves. Fused into the catalogue, the
 * same change would reach into the object that also owns pricing.
 *
 * `SingletonMixin` is one-instance-per-templatePath, so a holder per
 * subdivision is exactly what composing it means.
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
 * the keyed-holder ground pattern, shared with `DormWarren.admit`. This
 * is its second consumer, and the reason it lives on the spine rather
 * than in the dorm.
 *
 * ## ⚠ The ceiling of the shared-template shape
 *
 * Every clone carries the same `templatePath`, so anything identifying a
 * room BY PATH gets the district rather than the lot. The land-use gate
 * therefore prefers the room's persistence key. An avatar's captured
 * placement still does not — logging out in your own yard and back in
 * would land you in a freshly cloned one, which the dorm dodges by being
 * a `WarrenMember` and a lot cannot. Minting a template per residence
 * dissolves both; see [docs/subsystems/smallholding.md].
 *
 * ## Not boundary-exempt, and it should not be
 *
 * Content, so the sandbox's ordinary scope compare applies (the exempt
 * list is an enumeration of framework registries; `DormWarren` is
 * likewise absent from it). A new module category fails closed, which is
 * the right default for a thing that mints rooms.
 */

import { Idea } from "../lib/stuff/Idea";
import { SingletonMixin } from "../lib/stuff/Singleton";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { StuffApi } from "../api/stuff";
import { PersistableApi } from "../api/persistable";
import type { Stuff } from "../lib/stuff/Stuff";
import type { VetoResult } from "../lib/errors";

const LotHolderBase = SingletonMixin(PostRegistrationMixin(Idea));

export default class LotHolder extends LotHolderBase {
  static persistentFields: string[] = ["roomTemplate"];

  /**
   * The room template cloned per sold lot. Hinkley's is a yard; another
   * subdivision's might be a dock or a shopfront, which is exactly why
   * this is data rather than a class.
   *
   * It must resolve to a **persistable, non-singleton** room —
   * `/obj/TitledRoom` or a subclass. A plain `CartesianLocation` persists
   * nothing it holds and `restoreOrSeed` throws on it.
   *
   * @authorable ref:Template
   */
  public roomTemplate: string = "";

  /** Live rooms by lot extent — the process-lifetime cache. */
  private _roomsByLot = new Map<string, Stuff>();

  /** A load-bearing process-lifetime singleton is never culled. */
  public canEvict(): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  public getRoomTemplate(): string {
    return this.roomTemplate;
  }

  public setRoomTemplate(value: string): void {
    this.roomTemplate = value;
  }

  /**
   * The live room for `lotExtent`, materialized if needed, plus whether
   * this was a FIRST provisioning (`true`) or a re-entry to ground
   * already worked. The sale uses that to decide how to describe it.
   *
   * The override point for a different provisioning model: a subclass
   * that mints a template per residence replaces this method and nothing
   * else.
   *
   * @hook
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
