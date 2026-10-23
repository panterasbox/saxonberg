/**
 * Ship — ⭐ **a {@link Structure} whose position is a variable** (maritime
 * review, 2026-10-13).
 *
 * A building and a ship are both *these rooms are one building*; what a
 * ship adds is everything that follows from the building MOVING, and none
 * of it belongs on a tower:
 *
 * - **the position and the voyage** — `expansePosition` (Positioned) and,
 *   under way, the voyage triple (Voyaging; see `Voyage`), held as a
 *   sustained engagement (Engaged) and outliving the process
 *   (Persistable: a ship's position, course and plot survive a restart);
 * - **heights aboard** — `deckHeightM` / `mastheadHeightM`, what a horizon
 *   reads of an OBSERVER on her; `heightM` (the truck) stays the
 *   Structure's, what others read of her as a target;
 * - **the house** — the Business whose roster mans her (her outfit), so
 *   the lookout is a SEAT read off the shipped roster;
 * - **who and what is aboard** — the Voyaging hooks (`aboard`,
 *   `watchRoom`, `gearAboard`, `sightHeightFor`).
 *
 * ⭐ *Is it a ship?* is `instanceof Ship` (and *does it voyage?* is
 * `MixinApi.isVoyaging`, which a boat answers too) — never a guard on a
 * field (`deckHeightM === null` once stood in for this on every
 * Structure).
 */

import Structure from './Structure';
import { PositionedMixin } from '../../lib/expanse/Positioned';
import { EngagedMixin } from '../../lib/activity/Engaged';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import { VoyagingMixin } from '../../lib/expanse/Voyaging';
import { MovingMixin } from '../../lib/expanse/Moving';
import { Template } from '../../lib/stuff/Template';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { WorldClockApi } from '../../api/worldclock';
import type { Container } from '../../lib/spatial/Container';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { HullNow } from '../../lib/expanse/Voyaging';
import type { CourseRequest, CraftStop } from '../../lib/expanse/Frame';
import type { StartResult } from '../../api/scheduler';
import ExpanseNode from './ExpanseNode';
import type { Positioned } from '../../lib/expanse/Positioned';

/** A ship's hull (river D28): how deep she floats, how wide, how long. */
export interface ShipHull {
  draftM: number;
  beamM: number;
  lengthM: number;
}

/** Water density, kg/m³ — what a laden hull displaces. */
const RHO = 1000;

/** The position key of the seat that sees further (maritime D13). */
const LOOKOUT_POSITION = 'lookout';

export const SHIP_CLASS_PATH = '/platform/idea/Ship';

export default class Ship extends PersistableMixin(
  VoyagingMixin(MovingMixin(EngagedMixin(PositionedMixin(Structure)))),
) {
  static fieldMeta: FieldMeta = {
    deckHeightM: { persistent: true, authorable: true },
    mastheadHeightM: { persistent: true, authorable: true },
    house: { persistent: true, authorable: true, ref: 'identity:relation' },
    hull: { persistent: true, authorable: true },
    aground: { persistent: true },
    holed: { persistent: true },
    overboard: { persistent: true },
  };

  /**
   * ⭐ Who went over her side and has not come back aboard (river D30):
   * identity paths. Her `course` refuses while any of them is still in the
   * water, unless the master leaves them deliberately.
   */
  protected overboard: string[] = [];

  /** Somebody went over her side (the deck's way into the water says so). */
  public noteOverboard(who: Stuff): void {
    const id = who.getIdentityPath() ?? who.getTemplatePath();
    if (id && !this.overboard.includes(id)) this.overboard.push(id);
  }

  /**
   * Her own people still in the water: of those who went over her side,
   * whoever is alive and in a water place now. Anybody aboard again, ashore
   * or gone is let go of.
   */
  public async peopleInTheWater(): Promise<Stuff[]> {
    const still: Stuff[] = [];
    const keep: string[] = [];
    for (const id of this.overboard) {
      const who = StuffApi.findByIdentityPath<Stuff>(id)[0] ?? null;
      if (who === null || who.isDestroyed()) continue;
      if (MixinApi.isOrganism(who) && !who.isAlive()) continue;
      const room = MixinApi.isContainable(who) ? who.getContainer() : null;
      if (room === null || !MixinApi.isWaterPlace(room)) continue;
      keep.push(id);
      still.push(who);
    }
    this.overboard = keep;
    return still;
  }

  /** The master sails without them, on purpose: they are no longer hers to wait for. */
  public leaveThem(): void {
    this.overboard = [];
  }

  /** Her hull's numbers (river D28); `null` for a ship nobody measured. */
  protected hull: ShipHull | null = null;
  /** Hard aground — no course takes her anywhere until she floats (D28). */
  protected aground = false;
  /** Holed on a snag — stopped, taking water (D29). */
  protected holed = false;

  public getHull(): ShipHull | null { return this.hull ? { ...this.hull } : null; }
  public setHull(v: ShipHull | null): void { this.hull = v ? { ...v } : null; }
  public isAground(): boolean { return this.aground; }
  public isHoled(): boolean { return this.holed; }
  public setAground(v: boolean): void { this.aground = v === true; }
  public setHoled(v: boolean): void { this.holed = v === true; }

  /** An observer's eye height on deck, meters. */
  protected deckHeightM = 0;
  /** An observer's eye height at the masthead, meters; `null` for none. */
  protected mastheadHeightM: number | null = null;
  /** The Business row whose roster mans her; `null` for none. */
  protected house: string | null = null;

  public getDeckHeightM(): number { return this.deckHeightM; }
  public setDeckHeightM(value: number): void { this.deckHeightM = Number(value) || 0; }

  public getMastheadHeightM(): number | null { return this.mastheadHeightM; }
  public setMastheadHeightM(value: number | null): void {
    this.mastheadHeightM = value === null || value === undefined ? null : Number(value);
  }

  public getHouse(): string | null { return this.house; }
  public setHouse(value: string | null): void { this.house = value ?? null; }

  /** Her height as a target — the truck. */
  override getTargetHeightM(): number {
    return this.getHeightM();
  }

  /**
   * How high `observer`'s eye is, aboard her.
   *
   * ⭐⭐ The lookout is a SEAT (maritime D13): the masthead height is
   * granted to whoever holds the house's `lookout` position **on shift**,
   * read off the shipped roster, and the deck height to everyone else. So
   * appointing somebody lookout makes her see further with nothing about
   * her having changed.
   */
  override sightHeightFor(observer: unknown): number {
    const deck = this.deckHeightM;
    const house = this.house;
    if (house === null || this.mastheadHeightM === null) return deck;
    const who = observer as Stuff;
    if (!who || !MixinApi.isEmployed(who)) return deck;
    const job = who.getEmployment(house);
    if (job?.positionKey === LOOKOUT_POSITION && job.status === 'on-shift') {
      return this.mastheadHeightM;
    }
    return deck;
  }

  /** Runtime cache of the member room rows (the extent's descendants). */
  private memberPaths: Promise<string[]> | null = null;

  /** The member rooms that are resident now. */
  private async liveMembers(): Promise<(Stuff & Container)[]> {
    if (this.memberPaths === null) {
      const ext = this.getExtent();
      this.memberPaths = ext === ''
        ? Promise.resolve([])
        : Template.findDescendants(ext).then((ts) => ts.map((t) => t.path));
    }
    const out: (Stuff & Container)[] = [];
    for (const p of await this.memberPaths) {
      const s = StuffApi.findByTemplatePath<Stuff>(p);
      if (s && s.isPlace() && MixinApi.isContainer(s)) out.push(s);
    }
    return out;
  }

  /** Everyone standing in a member room — told what the water does. */
  override async aboard(): Promise<Stuff[]> {
    const out: Stuff[] = [];
    for (const room of await this.liveMembers()) {
      for (const x of room.getContents()) if (MixinApi.isOrganism(x)) out.push(x);
    }
    return out;
  }

  /** The entrance — the deck the watch is kept on. */
  override async watchRoom(): Promise<(Stuff & Container) | null> {
    const entrance = this.getEntrance();
    if (!entrance) return null;
    try {
      const s = await StuffApi.singleton<Stuff>(entrance);
      return MixinApi.isContainer(s) ? s : null;
    } catch {
      return null;
    }
  }

  /** What her rooms carry that is not people — cargo, stores, fuel, kg. */
  public async cargoKg(): Promise<number> {
    let kg = 0;
    for (const room of await this.liveMembers()) {
      for (const x of room.getContents()) {
        if (MixinApi.isOrganism(x) || !MixinApi.isTangible(x)) continue;
        if ((x as unknown as { isFixedInPlace?(): boolean }).isFixedInPlace?.() === true) continue;
        const m = x.getMass().rawValue();
        if (Number.isFinite(m)) kg += m;
      }
    }
    return kg;
  }

  /** Runtime: her cargo as last weighed (the sync hull read uses it). */
  private weighedKg = 0;

  /**
   * ⭐ Her hull as she floats now (D28): the draft deepens with what she
   * carries — put cargo ashore and she comes up.
   */
  override hullNow(): HullNow {
    const h = this.hull ?? { draftM: 1.2, beamM: 6, lengthM: 30 };
    const extra = this.weighedKg / (RHO * h.lengthM * h.beamM * 0.7);
    return { draftM: h.draftM + extra, beamM: h.beamM, lengthM: h.lengthM };
  }

  /** Weigh her before a course is worked out (the frame reads the hull sync). */
  override async steer(req: CourseRequest): Promise<StartResult | { refused: string }> {
    // ⭐ A ship on the ground has no watch to notice the river rising (the
    // drive found her aground for good): asked for a course, she first sees
    // whether she floats now — the water up, or her lightened.
    if (this.aground && !(await this.floatIfShePasses())) {
      return { refused: 'She is hard aground. Lighten her, wait for the water, or kedge her off.' };
    }
    if (this.holed) return { refused: 'She is holed and taking water; she goes nowhere until she is patched.' };
    this.weighedKg = await this.cargoKg();
    return super.steer(req);
  }

  /**
   * ⭐ The stop her course came to (D28, D29): aground and holed are
   * states she keeps (persisted); a river's mouth puts her out onto the sea.
   */
  override async onStop(stop: CraftStop): Promise<string> {
    if (stop.reason === 'aground') this.aground = true;
    if (stop.reason === 'holed') this.holed = true;
    if (stop.reason === 'mouth') {
      const frame = await this.liveFrame();
      const sea = frame !== null && MixinApi.isLineFrame(frame) ? frame.mouthOnSea() : null;
      if (sea !== null) {
        const node = await StuffApi.singleton<Stuff>(sea.node).catch(() => null);
        const at = node instanceof ExpanseNode ? node.getExpansePosition() : null;
        if (at !== null) {
          this.placeAt({ frame: 'chart', at }, WorldClockApi.getNow().rawValue(), sea.expanse);
          (await this.liveFrame())?.adopt(this as never);
          return `${stop.words} She is out over the bar, and lies at ${node!.getPresentation()}. The next course is the sea's.`;
        }
      }
    }
    return stop.words;
  }

  /**
   * ⭐ Off the sea and onto a river (D29): at the mouth node a river names,
   * she leaves the chart for the river's line, at its mouth.
   */
  public enterRiver(line: string, course: string, mouthKm: number, across: number): void {
    this.placeAt({ frame: 'line', at: { course, km: mouthKm, across } }, WorldClockApi.getNow().rawValue(), line);
  }

  /** Floated off: the water came up, or she was lightened (D28). */
  public async floatIfShePasses(): Promise<boolean> {
    if (!this.aground) return true;
    const frame = await this.liveFrame();
    const pos = this.getLinePosition();
    if (frame === null || !MixinApi.isLineFrame(frame) || pos === null) return false;
    this.weighedKg = await this.cargoKg();
    const depth = await frame.depthAt(pos, WorldClockApi.getNow().rawValue());
    if (depth !== null && depth > this.hullNow().draftM) {
      this.aground = false;
      return true;
    }
    return false;
  }

  /** The Durable gear on deck — what an unattended watch wears. */
  override async gearAboard(): Promise<Stuff[]> {
    const deck = await this.watchRoom();
    return deck ? deck.getContents().filter((x) => MixinApi.isDurable(x)) : [];
  }
}
