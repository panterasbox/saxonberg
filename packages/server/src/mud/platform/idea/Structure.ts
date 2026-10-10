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
 * - **height** — `heightM` is what a horizon reads of it as a target.
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
import type { FieldMeta } from '../../lib/mixin';

export const STRUCTURE_CLASS_PATH = '/platform/idea/Structure';

export default class Structure extends PersistableMixin(
  EngagedMixin(PositionedMixin(NamedMixin(SingletonMixin(Idea))))
) {
  static fieldMeta: FieldMeta = {
    extent: { persistent: true, authorable: true },
    entrance: { persistent: true, authorable: true },
    outsideDescription: { persistent: true, authorable: true },
    heightM: { persistent: true, authorable: true },
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
}
