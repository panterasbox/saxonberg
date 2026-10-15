/**
 * Structure — the thing that says *these rooms are one building*, seen
 * from outside.
 *
 * The structures slate's justification test — *something must be true of
 * a SET of rooms that no room can decide alone* — and what a Structure
 * owns is exactly that, and only that:
 *
 * - **membership** — every Location row under `extent` (a template-path
 *   prefix: the parcel's coverage shape, so a mansion carved into
 *   sub-zones is still one structure). Declared, never derived from
 *   geometry. Rooms stay roots: a structure COORDINATES, it does not
 *   contain.
 * - **the entrance** — the way in.
 * - **how it looks** — it is `Visible` + `Detailed` like any thing you
 *   look at (the `Species` precedent: an Idea can be seen). Its inside is
 *   its member rooms; there is no second, "outside" description.
 *   `landmark` opts it in to be FEATURED on a horizon (maritime R1) —
 *   whether it can be seen at all is derived, never authored.
 * - **its height** — `heightM`, what a horizon reads of it as a target.
 *
 * ⭐⭐ **A ship is a {@link Ship}: a Structure whose position is a
 * variable** — the subclass adds the position, the voyage, the deck and
 * the crew (maritime review, 2026-10-13). A building carries none of it:
 * the tower never moves, so it has no course, no fix and no snapshot. A
 * building that stands on a sea's rock (a light) has no position of its
 * own either — it is where its rock's node is, and the EXPANSE says so.
 *
 * ⛔ It does not name an address (member rooms keep their own), it is not
 * a Parcel (a parcel is title in a gated collection; a structure is
 * content anybody holding the ground may author), and nothing derives one
 * from `storeys`.
 *
 * Singleton: one row is one structure, keyed by its scope.
 */

import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { DetailedMixin } from '../../lib/description/Detailed';
import type { FieldMeta } from '../../lib/mixin';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import type { VetoResult } from '../../lib/errors';

export const STRUCTURE_CLASS_PATH = '/platform/idea/Structure';

export default class Structure extends DetailedMixin(
  VisibleMixin(PerceptibleMixin(NamedMixin(SingletonMixin(Idea)))),
) {
  static fieldMeta: FieldMeta = {
    extent: { persistent: true, authorable: true },
    entrance: { persistent: true, authorable: true },
    landmark: { persistent: true, authorable: true },
    heightM: { persistent: true, authorable: true },
  };

  /** Template-path prefix: every Location row under it is a member. */
  protected extent = '';
  /** The member room you enter by — aboard a ship, the deck. */
  protected entrance: string | null = null;
  /** Featured on a horizon — opt-in emphasis, not visibility. */
  protected landmark = false;
  /** Its height as a TARGET, metres (a tower's top, a ship's truck). */
  protected heightM = 0;

  public getExtent(): string { return this.extent; }
  public setExtent(value: string): void { this.extent = (value ?? '').replace(/\/+$/, ''); }

  public getEntrance(): string | null { return this.entrance; }
  public setEntrance(value: string | null): void { this.entrance = value ?? null; }

  public isLandmark(): boolean { return this.landmark; }
  public setLandmark(value: boolean): void { this.landmark = value === true; }

  public getHeightM(): number { return this.heightM; }
  public setHeightM(value: number): void { this.heightM = Number(value) || 0; }


  /**
   * Is the room at `locationPath` one of this structure's members? The
   * extent prefix, on a path-segment boundary.
   */
  public hasMember(locationPath: string): boolean {
    const ext = this.extent;
    if (ext === '') return false;
    return locationPath === ext || locationPath.startsWith(`${ext}/`);
  }

  /**
   * ⭐ A structure stands as long as the zone that names it. Nothing boots
   * it (maritime review, 2026-10-14): it loads with that zone, as a room's
   * props load with the room — and a zone holds only its PATH, so one that
   * residency put away under a zone still standing would silently drop
   * off every horizon until nothing reloaded it. The zone is what goes
   * cold; the structure goes with it.
   */
  public override canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'a structure stands while the zone that names it does' };
  }
}
