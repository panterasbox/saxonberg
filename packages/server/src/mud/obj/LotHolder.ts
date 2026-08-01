/**
 * LotHolder — **how titled ground becomes a place**, and the live rooms
 * that result.
 *
 * The provisioning half of selling land; {@link PlatBook} is the
 * catalogue half and names one of these by path. The book says *lot 2,
 * a quarter acre, residential, 4000*; this says *when it sells, a
 * `TitledRoom` minted at lot 2's own identity path*.
 *
 * ## Why this is its own object
 *
 * Because it is the piece most likely to be replaced wholesale: it is
 * the one that says *what physically appears*, and every future model —
 * multi-room floorplans, player-chosen blueprints, prefab catalogues —
 * changes only that. Separated, such a change is a subclass of this class
 * and a one-line edit to a plat book's `holderPath`; nothing in the
 * catalogue, the `title` verb or the parcel layer moves. Fused, it would
 * reach into the object that also owns pricing.
 *
 * `SingletonMixin` is one-instance-per-templatePath, so a holder per
 * subdivision is exactly what composing it means.
 *
 * ## The room gets an IDENTITY, not a copy
 *
 * A lot's room is minted at `<lotExtent>/<leaf>` through
 * `StuffApi.clone`'s `asTemplatePath` channel — the identity doctrine's
 * *minted singleton with a scheme-derived key*. The shared template is
 * the SOURCE; lot 2's yard is its own place.
 *
 * That is not bookkeeping. Sharing one templatePath across N lots broke
 * three things at once, and minting fixes all three without a special
 * case:
 *
 *   1. **Land use** resolved to the district rather than the lot,
 *      because the path was the district's.
 *   2. **An avatar's captured placement** recorded the shared template,
 *      so logging out in your own yard returned you to a fresh clone.
 *      The dorm needs a Warren to avoid this; an identity gets it free.
 *   3. **The room could not be cartesian at all** — `CartesianLocation`
 *      is singleton-shaped, so N clones of one path collide. With
 *      distinct identities it stays cartesian, which is what keeps the
 *      zone's `cellSize²` light denominator correct.
 *
 * Title and durable state still share one identity, because the mint is
 * derived FROM the parcel extent. Sell the lot and the garden goes with
 * it, because there is nothing else it could do.
 *
 * The standing-up itself is one call to `PersistableApi.restoreOrSeed` —
 * the keyed-holder ground pattern, shared with `DormWarren.admit`. This
 * is its second consumer, and the reason it lives on the spine rather
 * than in the dorm.
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
   * It must resolve to a **persistable** room — `/obj/TitledRoom` or a
   * subclass. A plain `CartesianLocation` persists nothing it holds and
   * `restoreOrSeed` throws on it. Being singleton-shaped is fine and
   * intended: each lot's room is minted at its own identity path.
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
   * The override point for a different provisioning model — a multi-room
   * floorplan, a player-chosen blueprint — replaces this method and
   * nothing else.
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
    // MINT AN IDENTITY rather than sharing the source template's. The
    // room is a singleton-shaped cartesian room, so lot 2's yard has to
    // BE lot 2's yard — `asTemplatePath` is the identity-doctrine channel
    // for exactly this (templatePath = identity; instance for minted
    // singletons with scheme-derived keys).
    //
    // It also buys three things the shared-template shape got wrong: land
    // use resolves per lot from the path, an avatar's captured placement
    // returns them to THEIR yard rather than a fresh clone, and the
    // persistence scope is already unique.
    const room = await StuffApi.clone<Stuff>(this.roomTemplate, {
      asTemplatePath: this.identityFor(lotExtent),
    });
    const restored = await PersistableApi.restoreOrSeed(room, lotExtent);
    this._roomsByLot.set(lotExtent, room);
    return { room, firstTime: !restored };
  }

  /**
   * The minted identity path for a lot's room: the lot's parcel extent
   * plus the source template's leaf, so `…/lot-2` + `yard` reads
   * `…/lot-2/yard`. Scheme-derived, so it is stable across restarts and
   * derivable by anything holding the extent.
   */
  public identityFor(lotExtent: string): string {
    const leaf = this.roomTemplate.slice(
      this.roomTemplate.lastIndexOf("/") + 1,
    );
    return `${lotExtent}/${leaf || "room"}`;
  }

  /**
   * Release every live room this holder is standing.
   *
   * It UNREGISTERS them rather than merely dropping the map: a minted
   * room occupies its identity path, so forgetting one while leaving it
   * registered would leave two live instances at that path the moment the
   * lot is provisioned again — which the persistence spine correctly
   * refuses ("two live instances … would clobber one record").
   *
   * A process-lifetime holder outlives a test's world, so a suite that
   * stands the world up repeatedly needs this.
   *
   * @internal
   */
  public forgetLiveRooms(): void {
    for (const room of this._roomsByLot.values()) {
      if (!room.isDestroyed()) StuffApi.unregister(room);
    }
    this._roomsByLot.clear();
  }

  /** The live room for a lot if one is standing, else null. */
  public liveRoomFor(lotExtent: string): Stuff | null {
    const cached = this._roomsByLot.get(lotExtent);
    return cached && !cached.isDestroyed() ? cached : null;
  }
}
