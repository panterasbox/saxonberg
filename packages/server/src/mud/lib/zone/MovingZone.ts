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
 * frame's kernel protocol (`LineFrame` on a river). Every other field
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
import type { LineFrame } from '../expanse/LineFrame';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';

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

    /** The frame the place is on now, and where. */
    private frameNow(): { frame: Stuff & LineFrame; km: number } | null {
      const place = this.getPlace();
      const pos = place?.getLinePosition() ?? null;
      const line = place?.getLine() ?? null;
      if (!pos || !line) return null;
      const frame = StuffApi.findByTemplatePath<Stuff>(line);
      if (!frame || !MixinApi.isLineFrame(frame)) return null;
      return { frame, km: pos.km };
    }

    /** The water's elevation where the place is now. */
    public getElevation(): number | null {
      const at = this.frameNow();
      return at ? at.frame.elevationAtKm(at.km) : super.getElevation();
    }

    /** The address of the ground that drains to where the place is now. */
    public getAddress(): string | null {
      const at = this.frameNow();
      return (at ? at.frame.localityAddressAt(at.km) : null) ?? super.getAddress();
    }

    public getLatitude(): number | null {
      const at = this.frameNow();
      return (at ? at.frame.climateSiteAt(at.km)?.latitude : null) ?? super.getLatitude();
    }

    public getContinentality(): number | null {
      const at = this.frameNow();
      return (at ? at.frame.climateSiteAt(at.km)?.continentality : null) ?? super.getContinentality();
    }

    public getClimateOffsetK(): number | null {
      const at = this.frameNow();
      return (at ? at.frame.climateSiteAt(at.km)?.climateOffsetK : null) ?? super.getClimateOffsetK();
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
