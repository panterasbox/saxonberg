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
 * - **which places stand on which** — `storeys`, a small tree of
 *   relations (rubber build, 2026-10-17): each storey is an extent prefix
 *   (membership is the longest one) and may stand `on:` another. No
 *   storeys means one implicit storey.
 *
 * ⭐⭐ **It IS made of materials — but not as a Thing is** (the owner,
 * paint requirements, 2026-10-31). A structure is an Idea, so what it is
 * made of is a BILL: the materials it takes to erect and later to
 * maintain (the construction slate's). What it is NOT is a container of
 * walls: walls and roofs belong to the places (`enclosure:`, `roof:` on
 * each member's own row) — a place decides what bounds it alone, and
 * `lint:envelope` refuses a Structure row that authors an envelope. Its
 * OUTSIDE is its own (the coat, the weathering and the fabric — the
 * capability mixins the platform twin composes). A lone hut is complete
 * with no structure; a structure with no member places (a castle on the
 * horizon) is still a structure.
 *
 * ⭐⭐ **The landing** — where the structure meets the weather (paint
 * build, 2026-10-31). A structure is not a Thing or a Location, so a
 * player engages it from a place that touches it: *a place that does not
 * hold its own air, with an exit into a member that is enclosed or is the
 * structure's entrance* ({@link isLandedAt}). Derived, never authored —
 * the street before a house, a quay with a ship alongside, a courtyard
 * open to the sky. A closet holds air; a sailed ship's berth has nothing
 * alongside.
 *
 * ⛔ It does not name an address (member rooms keep their own), and it is
 * not a Parcel (a parcel is title in a gated collection; a structure is
 * content anybody holding the ground may author).
 *
 * This is the BASE (`lib/`): membership, entrance, height, storeys and
 * the landing, with no `Singleton` — so a holding can mint one building
 * per `(scope, key)`. The platform twin (`platform/idea/Structure`) is the
 * default building every row names: one row, one structure, and the
 * outside's capabilities. A ruin or a monument is a class over this base
 * that composes none of them.
 */

import { Idea } from '../stuff/Idea';
import { NamedMixin } from '../description/Named';
import { VisibleMixin } from '../description/Visible';
import { PerceptibleMixin } from '../description/Perceptible';
import { DetailedMixin } from '../description/Detailed';
import type { FieldMeta } from '../mixin';
import type { EvictionContext } from '../stuff/Stuff';
import type { VetoResult } from '../errors';
import type { StoreySpec } from '../spatial/Enclosed';
import type { Stuff } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import type Exit from '../boundary/Exit';

export default class Structure extends DetailedMixin(
  VisibleMixin(PerceptibleMixin(NamedMixin(Idea))),
) {
  static fieldMeta: FieldMeta = {
    extent: { persistent: true, authorable: true },
    entrance: { persistent: true, authorable: true },
    landmark: { persistent: true, authorable: true },
    heightM: { persistent: true, authorable: true },
    storeys: { persistent: true, authorable: true },
  };

  /** Template-path prefix: every Location row under it is a member. */
  protected extent = '';
  /** The member room you enter by — aboard a ship, the deck. */
  protected entrance: string | null = null;
  /** Featured on a horizon — opt-in emphasis, not visibility. */
  protected landmark = false;
  /** Its height as a TARGET, metres (a tower's top, a ship's truck). */
  protected heightM = 0;
  /** Which of its places stand on which — relations only. */
  protected storeys: StoreySpec[] = [];

  public getExtent(): string { return this.extent; }
  public setExtent(value: string): void { this.extent = (value ?? '').replace(/\/+$/, ''); }

  public getEntrance(): string | null { return this.entrance; }
  public setEntrance(value: string | null): void { this.entrance = value ?? null; }

  public isLandmark(): boolean { return this.landmark; }
  public setLandmark(value: boolean): void { this.landmark = value === true; }

  public getHeightM(): number { return this.heightM; }
  public setHeightM(value: number): void { this.heightM = Number(value) || 0; }


  public getStoreys(): readonly StoreySpec[] { return this.storeys; }
  public setStoreys(value: StoreySpec[] | null): void {
    this.storeys = (value ?? []).map((s) => ({
      ...s,
      extent: (s.extent ?? '').replace(/\/+$/, ''),
    }));
  }

  /**
   * The storey a member place belongs to — the longest storey `extent`
   * prefix of its path, on a segment boundary — or `null` for the
   * implicit storey (no storeys authored, or a member under none of
   * them, which stands on the ground).
   */
  public storeyOf(locationPath: string): StoreySpec | null {
    let best: StoreySpec | null = null;
    for (const s of this.storeys) {
      const ext = s.extent;
      if (ext === '') continue;
      if (locationPath !== ext && !locationPath.startsWith(`${ext}/`)) continue;
      if (best === null || ext.length > best.extent.length) best = s;
    }
    return best;
  }

  /** The storeys that stand `on:` the storey keyed `key`. */
  public storeysStandingOn(key: string): StoreySpec[] {
    return this.storeys.filter((s) => s.on === key);
  }

  /** The storey keyed `key`, or `null`. */
  public storeyByKey(key: string): StoreySpec | null {
    return this.storeys.find((s) => s.key === key) ?? null;
  }

  /**
   * The RESIDENT member places of a storey — a sync read of the template
   * index under its extent, never a search of the content tree. A member
   * belongs to the storey only if that storey is its longest prefix (the
   * loft's extent may sit inside the ground floor's).
   */
  public membersOf(key: string): Stuff[] {
    const storey = this.storeyByKey(key);
    if (storey === null || storey.extent === '') return [];
    const out: Stuff[] = [];
    const candidates = [
      ...StuffApi.findAllByTemplatePath(storey.extent),
      ...StuffApi.findByPathGlob(`${storey.extent}/**`),
    ];
    for (const s of candidates) {
      if (s.isDestroyed()) continue;
      const path = s.getTemplatePath();
      if (!path || this.storeyOf(path)?.key !== key) continue;
      out.push(s);
    }
    return out;
  }

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
   * ⭐⭐ Is `room` a LANDING of this structure — a place where it meets the
   * weather (paint build, 2026-10-31)? One rule, read off what is
   * standing: the room does not hold its own air, and one of its exits
   * leads into a member that is enclosed or is this structure's entrance —
   * or has this structure lying alongside it (a ship at a quay). A closet
   * holds air; a neighbour's parlour is a member of another structure; a
   * sailed ship's berth has nothing alongside. A member courtyard open to
   * the sky passes: it is a landing of its own building.
   *
   * Sync over resident rooms — a non-entrance member that is not standing
   * does not count until something stands it up (`NavigationApi.
   * structuresLandedAt` does, by following the exits' authored paths).
   */
  public isLandedAt(room: Stuff): boolean {
    if (!MixinApi.isAtmospheric(room) || room.exposure().holdsAir()) return false;
    if (!MixinApi.isExitable(room)) return false;
    for (const exit of room.getExits().values()) {
      if (this.landsBy(exit)) return true;
    }
    return false;
  }

  /** Does `exit` lead into this structure the way a landing needs? */
  protected landsBy(exit: Exit): boolean {
    const alongside = exit.alongsideNow();
    if (alongside !== null) return alongside.stuffId === this.stuffId;
    const far = exit.peekDestination();
    const path = (far?.getIdentityPath() ?? far?.getTemplatePath()) || exit.getDestinationTemplatePath();
    if (!path || !this.hasMember(path)) return false;
    if (this.entrance !== null && path === this.entrance) return true;
    return far !== null && MixinApi.isAtmospheric(far) && far.exposure().holdsAir();
  }

  /**
   * The landings standing NOW: resident places one exit from a resident
   * member that pass {@link isLandedAt}. A ship's quay is found from the
   * quay's side (its exit answers who is alongside), not from here.
   */
  public landingsNow(): Stuff[] {
    const ext = this.extent;
    if (ext === '') return [];
    const seen = new Set<string>();
    const out: Stuff[] = [];
    const members = [...StuffApi.findAllByTemplatePath(ext), ...StuffApi.findByPathGlob(`${ext}/**`)];
    for (const m of members) {
      if (m.isDestroyed() || !MixinApi.isExitable(m)) continue;
      for (const exit of m.getExits().values()) {
        const far = exit.peekDestination();
        if (far === null || seen.has(far.stuffId)) continue;
        seen.add(far.stuffId);
        if (this.isLandedAt(far)) out.push(far);
      }
    }
    return out;
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
