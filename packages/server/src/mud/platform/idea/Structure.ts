/**
 * Structure — the thing that says *these rooms are one building*, and
 * whose POSITION IS A VARIABLE.
 *
 * ⭐ A building is a Structure whose position does not change; a ship is
 * one whose position does. **One field is the whole difference.** The
 * structures slate's justification test — *something must be true of a
 * SET of rooms that no room can decide alone* — is passed by a ship six
 * for six (the deck over everything, the stack, vertical fire, a unit of
 * destruction, a unit of description read from outside, the gangway),
 * and where the ship IS is the clearest case: a fact about every one of
 * its rooms decided by none of them.
 *
 * ## What it owns, and only that
 *
 * - **membership** — every Location row under `extent` (a template-path
 *   prefix: the parcel's coverage shape, so a mansion carved into
 *   sub-zones is still one structure). Declared, never derived from
 *   geometry. Rooms stay roots: a structure COORDINATES, it does not
 *   contain.
 * - **the entrance** — the way in (and, aboard, the deck the watch is
 *   kept on).
 * - **the outside description** — authored once, read wherever the
 *   structure is a landmark (`SpatialZone.visibleLandmarks`) and wherever
 *   it is sighted at sea.
 * - **heights** — `heightM` is what a horizon reads of it as a target;
 *   `deckHeightM` / `mastheadHeightM` what it reads of an observer aboard.
 * - **the house** — the Business whose roster mans it (a ship's outfit),
 *   so the lookout is a SEAT, read off the shipped roster.
 * - **the position and the voyage** — `expansePosition` (Positioned) and,
 *   for a craft under way, the voyage triple (see `Voyage`).
 *
 * ⛔ It does not name an address (member rooms keep their own), it is not
 * a Parcel (a parcel is title in a gated collection; a structure is
 * content anybody holding the ground may author), and nothing derives one
 * from `storeys`.
 *
 * Persistable: a ship's position, course and plot outlive the process.
 * Singleton: one row is one structure, keyed by its scope.
 */

import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { NamedMixin } from '../../lib/description/Named';
import { PositionedMixin } from '../../lib/expanse/Positioned';
import { EngagedMixin } from '../../lib/activity/Engaged';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import { VoyagingMixin } from '../../lib/expanse/Voyaging';
import { Template } from '../../lib/stuff/Template';
import { StuffApi } from '../../api/stuff';
import type { Container } from '../../lib/spatial/Container';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';

/** The position key of the seat that sees further (maritime D13). */
const LOOKOUT_POSITION = 'lookout';

export const STRUCTURE_CLASS_PATH = '/platform/idea/Structure';

export default class Structure extends PersistableMixin(
  VoyagingMixin(EngagedMixin(PositionedMixin(NamedMixin(SingletonMixin(Idea)))))
) {
  static fieldMeta: FieldMeta = {
    extent: { persistent: true, authorable: true },
    entrance: { persistent: true, authorable: true },
    outsideDescription: { persistent: true, authorable: true },
    heightM: { persistent: true, authorable: true },
    deckHeightM: { persistent: true, authorable: true },
    mastheadHeightM: { persistent: true, authorable: true },
    house: { persistent: true, authorable: true },
  };

  /** Template-path prefix: every Location row under it is a member. */
  protected extent = '';
  /** The member room you enter by — aboard, the deck. */
  protected entrance: string | null = null;
  /** What it looks like from outside — authored once. */
  protected outsideDescription = '';
  /** Its height as a TARGET, metres (a tower's top, a ship's truck). */
  protected heightM = 0;
  /** An observer's eye height on deck, metres; `null` for a building. */
  protected deckHeightM: number | null = null;
  /** An observer's eye height at the masthead, metres; `null` for none. */
  protected mastheadHeightM: number | null = null;
  /** The Business row whose roster mans it; `null` for a building. */
  protected house: string | null = null;

  public getExtent(): string { return this.extent; }
  public setExtent(value: string): void { this.extent = (value ?? '').replace(/\/+$/, ''); }

  public getEntrance(): string | null { return this.entrance; }
  public setEntrance(value: string | null): void { this.entrance = value ?? null; }

  public getOutsideDescription(): string { return this.outsideDescription; }
  public setOutsideDescription(value: string): void {
    this.outsideDescription = (value ?? '').trim();
  }

  public getHeightM(): number { return this.heightM; }
  public setHeightM(value: number): void { this.heightM = Number(value) || 0; }

  public getDeckHeightM(): number | null { return this.deckHeightM; }
  public setDeckHeightM(value: number | null): void {
    this.deckHeightM = value === null || value === undefined ? null : Number(value);
  }

  public getMastheadHeightM(): number | null { return this.mastheadHeightM; }
  public setMastheadHeightM(value: number | null): void {
    this.mastheadHeightM = value === null || value === undefined ? null : Number(value);
  }

  public getHouse(): string | null { return this.house; }
  public setHouse(value: string | null): void { this.house = value ?? null; }

  /**
   * Is the room at `locationPath` one of this structure's members? The
   * extent prefix, on a path-segment boundary.
   */
  public hasMember(locationPath: string): boolean {
    const ext = this.extent;
    if (ext === '') return false;
    return locationPath === ext || locationPath.startsWith(`${ext}/`);
  }

  /** Its height as a target — the tower's top, the ship's truck. */
  override getTargetHeightM(): number {
    return this.heightM;
  }

  /**
   * How high `observer`'s eye is, aboard this structure.
   *
   * ⭐⭐ The lookout is a SEAT (maritime D13): the masthead height is
   * granted to whoever holds the house's `lookout` position **on shift**,
   * read off the shipped roster, and the deck height to everyone else. So
   * appointing somebody lookout makes the craft see further with nothing
   * about the craft having changed. A structure with no deck height (a
   * building) answers its own height — you look out from the top of it.
   */
  override sightHeightFor(observer: unknown): number {
    const deck = this.deckHeightM ?? this.heightM;
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
      const ext = this.extent;
      this.memberPaths = ext === ''
        ? Promise.resolve([])
        : Template.findDescendants(ext).then((ts) => ts.map((t) => t.path));
    }
    const out: (Stuff & Container)[] = [];
    for (const p of await this.memberPaths) {
      const s = StuffApi.findByTemplatePath<Stuff>(p);
      if (s && s.isLocation() && MixinApi.isContainer(s)) out.push(s);
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
    if (!this.entrance) return null;
    try {
      const s = await StuffApi.singleton<Stuff>(this.entrance);
      return MixinApi.isContainer(s) ? s : null;
    } catch {
      return null;
    }
  }

  /** The Durable gear on deck — what an unattended watch wears. */
  override async gearAboard(): Promise<Stuff[]> {
    const deck = await this.watchRoom();
    return deck ? deck.getContents().filter((x) => MixinApi.isDurable(x)) : [];
  }
}
