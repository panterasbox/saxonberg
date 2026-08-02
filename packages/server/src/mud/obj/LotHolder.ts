/**
 * LotHolder — **how titled ground becomes a place**, and the live rooms
 * that result.
 *
 * The provisioning half of selling land; {@link PlatBook} is the
 * catalogue half and names one of these by path. The book says *lot 2,
 * a quarter acre, residential, 4000*; this says *when it sells, a
 * room minted at lot 2's own identity path*.
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
 * two things at once, and minting fixes both without a special case:
 *
 *   1. **Land use** resolved to the district rather than the lot,
 *      because the path was the district's.
 *   2. **An avatar's captured placement** recorded the shared template,
 *      so logging out in your own yard returned you to a fresh clone.
 *      The dorm needs a Warren to avoid this; an identity gets it free.
 *
 * It also takes the room OFF the district's cartesian grid, and that is a
 * consequence rather than a cost: N lots cannot share one coordinate, so
 * a per-lot room was never a grid member. The grid says so itself —
 * `CartesianLocation.addExit` refuses the non-cardinal `lot-1` gate
 * between two rooms in one zone. A yard is reached through a gate.
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
import { MixinApi } from "../api/mixin";
import { ParcelApi } from "../api/parcel";
import { PersistableApi } from "../api/persistable";
import LotGateExit from "./LotGateExit";
import type { Stuff } from "../lib/stuff/Stuff";
import type { Container } from "../lib/spatial/Container";
import type { VetoResult } from "../lib/errors";

const LotHolderBase = SingletonMixin(PostRegistrationMixin(Idea));

export default class LotHolder extends LotHolderBase {
  static persistentFields: string[] = [
    "roomTemplate",
    "streetPath",
    "parentExtent",
  ];

  /**
   * The room template cloned per sold lot. Hinkley's is a yard; another
   * subdivision's might be a dock or a shopfront, which is exactly why
   * this is data rather than a class.
   *
   * It must resolve to a **persistable** room — `FurnishableRoom` or a
   * subclass. A plain `Location` persists nothing it holds and
   * `restoreOrSeed` throws on it.
   *
   * It must ALSO not be a `CartesianLocation`. A per-lot room cannot be a
   * member of the district's shared grid — N lots would occupy one
   * coordinate — and the grid enforces that: `CartesianLocation.addExit`
   * refuses a non-cardinal direction between two rooms in the same zone,
   * which is exactly the `lot-1` gate. A yard is reached through a gate,
   * not by a grid step.
   *
   * @authorable ref:Template
   */
  public roomTemplate: string = "";

  /**
   * The room the lots front onto — the street. Each sold lot gets a
   * {@link LotGateExit} installed here, directioned by its leaf, so
   * `lot-1` walks you in.
   *
   * Data rather than an exit on the street's own template because the
   * street CANNOT author it: there is no one room behind the gate. A
   * subdivision has N lots, each with a room at its own identity path,
   * and a static `north → <the shared room template>` names the template
   * itself — which then materializes as an unowned yard on nobody's lot.
   * Empty = no street wiring (a subdivision reached some other way).
   *
   * @authorable ref:Template
   */
  public streetPath: string = "";

  /**
   * The subdivision's own parcel extent — the parent every sold lot
   * subdivides under. Read at boot to re-install a gate for each lot that
   * has already sold, so an owner can still get home after a restart.
   * Deferred, so no yard materializes until somebody walks in.
   */
  public parentExtent: string = "";

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

  public getStreetPath(): string {
    return this.streetPath;
  }

  public setStreetPath(value: string): void {
    this.streetPath = value;
  }

  public getParentExtent(): string {
    return this.parentExtent;
  }

  public setParentExtent(value: string): void {
    this.parentExtent = value;
  }

  /**
   * Re-hang a gate on the street for every lot that has already sold.
   *
   * The exits are deferred, so this materializes no rooms — it only makes
   * the way home describable and walkable again after a restart. Without
   * it an owner who logs in on the lane has no gate: their yard exists
   * only in `holder_snapshots` and nothing on the street points at it.
   *
   * Failures are logged, never thrown: a subdivision whose street will
   * not resolve is a content error, and a holder that refuses to register
   * over it would take the whole locality down with it.
   *
   * @hook
   */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    if (!this.streetPath || !this.parentExtent) return;
    try {
      const sold = await ParcelApi.childParcelsOf(this.parentExtent);
      for (const parcel of sold) {
        await this.ensureGate(parcel.getExtent());
      }
    } catch (err) {
      console.warn(
        `LotHolder(${this.getTemplatePath()}): could not re-hang lot ` +
          `gates on ${this.streetPath}:`,
        err,
      );
    }
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
   * Hang this lot's gate on the street, unless it is already hanging.
   *
   * Idempotent by direction: re-selling, re-provisioning and the boot
   * re-hang all land here, and only the first installs anything. The exit
   * is deferred, so hanging it materializes no room.
   *
   * A no-op when no street is configured, or when the street does not
   * resolve to something exits can be hung on — the sale still completes,
   * because losing the way in is a smaller failure than losing the title.
   */
  public async ensureGate(lotExtent: string): Promise<void> {
    if (!this.streetPath) return;
    const street = await StuffApi.singleton<Stuff>(this.streetPath);
    if (!MixinApi.isExitable(street) || !MixinApi.isContainer(street)) return;
    const direction = lotExtent.slice(lotExtent.lastIndexOf("/") + 1);
    if (!direction || street.getExit(direction)) return;
    // `createSync` because an Exit IS a Stuff — bare `new` on a Stuff
    // subclass is refused by the framework. The `DormWarren.ensureUnitDoor`
    // shape, exactly.
    const gate = StuffApi.createSync(
      () =>
        new LotGateExit(
          street as Stuff & Container,
          this,
          lotExtent,
          direction,
        ),
    );
    await street.addExit(gate);
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
