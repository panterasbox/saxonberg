/**
 * MovingZoneMixin — ⭐⭐ **the zone of a place that moves** (river D38).
 *
 * The principle, decided with the founder: *no location's and no vessel's
 * zone ever changes. A moving place's zone is its own, with a fixed
 * identity for the place's life, and that zone's STATE follows the place.*
 *
 * So there is one moving zone per moving place, minted with it and reaped
 * with it. It holds ONE place (adopted at birth through the zone's own
 * `addLocation`, the only writer of a room's zone), and it answers the
 * position-dependent geography — `elevation`, `address`, the climate
 * levers, `horizon` — off the place's CURRENT frame position, through the
 * frame's own `siteAt` (D44): a river's line, the sea's chart, or any
 * frame to come — the zone never knows which. Every other field
 * walks to the ancestor as any zone's does (the kind row's chain).
 *
 * Every zone reader keeps working with no change of its own: they read the
 * zone's getters (`readField` prefers `get<Field>()`), and the getters are
 * what this overrides. A moving zone stores nothing: its state is derived
 * on every read.
 *
 * ⚠ One zone per place, never per course: `lookupField` has no asker, so
 * two patches at different kilometers need two zone objects.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { SpatialZone } from './SpatialZone';
import type { LocationZone } from './LocationZone';
import type Place from '../stuff/Place';
import type { Stuff, EvictionContext } from '../stuff/Stuff';
import type { VetoResult } from '../errors';
import type { Positioned } from '../expanse/Positioned';
import type { FrameSite } from '../expanse/Frame';

export interface MovingZone {
  adopt(place: Place & Positioned): void;
  getPlace(): (Place & Positioned) | null;
}

export function MovingZoneMixin<TBase extends MixinConstructor<SpatialZone & LocationZone>>(
  Base: TBase,
) {
  return class MovingZoneMixin extends Base implements MovingZone {
    static _mixinName: string = 'MovingZoneMixin';

    static fieldMeta: FieldMeta = {
      _place: { ref: 'instance', lifetime: 'weak' },
    };

    /** The one place this zone is the zone of (runtime; minted together). */
    private _place: (Place & Positioned) | null = null;

    /**
     * Take the place this zone was minted for — through the zone's own
     * `addLocation`, so the place is stamped by its zone and by nothing
     * else.
     */
    public adopt(place: Place & Positioned): void {
      const prior = place.getZone();
      if (prior !== null && (prior as unknown) !== (this as unknown)) {
        (prior as unknown as LocationZone).removeLocation(place);
      }
      this._place = place;
      (this as unknown as LocationZone).addLocation(place);
    }

    public getPlace(): (Place & Positioned) | null {
      const p = this._place;
      return p !== null && !(p as unknown as Stuff).isDestroyed() ? p : null;
    }

    /**
     * ⭐ The geography where the place is now, from whatever frame it is in
     * (D44) — a river's line, the sea's chart, or any frame to come.
     */
    private siteNow(): FrameSite | null {
      const place = this.getPlace();
      const pos = place?.framePos() ?? null;
      return pos === null ? null : place!.peekFrame()?.siteAt(pos) ?? null;
    }

    /** The elevation where the place is now. */
    public getElevation(): number | null {
      return this.siteNow()?.elevation ?? super.getElevation();
    }

    /** The address of the ground where the place is now. */
    public getAddress(): string | null {
      return this.siteNow()?.address ?? super.getAddress();
    }

    public getLatitude(): number | null {
      return this.siteNow()?.latitude ?? super.getLatitude();
    }

    public getContinentality(): number | null {
      return this.siteNow()?.continentality ?? super.getContinentality();
    }

    public getClimateOffsetK(): number | null {
      return this.siteNow()?.climateOffsetK ?? super.getClimateOffsetK();
    }

    /** A moving place's sightables are its frame's, never a zone's list. */
    public getHorizon(): string[] | null {
      return null;
    }

    /** A moving zone stays while it holds its place. */
    public canEvict(context: EvictionContext): VetoResult {
      if (this.getPlace() !== null) return { ok: false, reason: 'holds a moving place' };
      return (super.canEvict as (c: EvictionContext) => VetoResult)(context);
    }
  };
}
