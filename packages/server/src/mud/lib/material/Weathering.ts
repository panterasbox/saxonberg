/**
 * WeatheringMixin — ⭐⭐ *my coats thin where the weather reaches them, and
 * my pigment fades in the sun* (paint build D5, 2026-10-31).
 *
 * Everything weathers. A coat is laid with a thickness; the weather takes
 * it away at the rate its MATERIAL says (`Material.weatheringMPerGameYear`
 * — an oil paint lasts years, a limewash a season or two, a glaze or a tar
 * forever), outermost first, and when a coat is gone the next one meets
 * the world. Two coats last longer than one because there is twice as much
 * to wear through — the arithmetic a painter learns. A coat that set badly
 * (crazed, run) has opened and goes twice as fast.
 *
 * The same walk SETS a wet coat that sets by the air ({@link Faced.
 * airCoats}: a limewash carbonating, an oil oxidizing) and FADES the pigment the sun reaches, by its
 * lightfastness.
 *
 * Reconcile on read: the window since the last look, walked segment by
 * segment off the air at {@link weatherScope} (`BiomeApi.airSegmentsFor`
 * — a wet day and a dry one do opposite things to a wet coat). A long
 * absence integrates the tail the weather walk keeps and stamps forward.
 *
 * Requires {@link FacedMixin} on the host — composed over it, never
 * without it (a compose-time throw, not a runtime guard).
 *
 * ⚠ Composed on a building, a sign board and a painted panel — NOT on
 * every `Good`: a cart's coat wearing in the yard waits for decomposition's
 * exposure clock.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Faced, CoatLayer, FaceName, CoatAir } from './Faced';
import type Material from './Material';
import { Paint } from './Paint';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { BiomeApi } from '../../api/biome';
import { WorldClockApi } from '../../api/worldclock';

/** Game seconds in a game year (the calendar's 360 days). */
const GAME_YEAR_S = 360 * 86_400;

/** How much of the weather a face out under a roof in the open air still meets. */
const SHELTERED_EXPOSURE = 0.3;

/** A coat that set badly has opened: it weathers this many times as fast. */
const OPENED_FACTOR = 2;

/** Sun dose (`0..1`) per game day of full sky light — about a hundred days to fade a lake. */
const SUN_DOSE_PER_DAY = 0.01;

export interface Weathering {
  /**
   * Walk the weather since the last look over this thing's outside: set
   * what the air sets, thin what the weather reaches, fade what the sun
   * reaches. Returns the game-second the outside went BARE in this window
   * (its last coat worn through), or `null` if it did not.
   */
  reconcileWeather(): number | null;
  /**
   * Thin the outside coats over `segments` at `exposure` (`0..1` of the
   * weather reaching them). Returns the seconds into the window at which
   * the last outside coat wore through, or `null`.
   */
  weatherCoats(segments: readonly CoatAir[], exposure: number, skyLight: number): number | null;
  /** Is there no coat left on the outside? */
  coatGone(): boolean;
  /** Is the outside coat worn thin (below `thinM`)? */
  coatThin(thinM: number): boolean;
  /** The game-second the weather was last walked to, or `null`. */
  getWeatheredToS(): number | null;
  /** Restamp the walk (a fresh coat is laid on a reconciled outside). */
  setWeatheredToS(s: number | null): void;
}

function materialAt(path: string): Material | null {
  try {
    return StuffApi.findByTemplatePath<Material>(path) ?? null;
  } catch {
    return null;
  }
}

export function WeatheringMixin<TBase extends MixinConstructor<Stuff & Faced>>(Base: TBase) {
  class WeatheringMixin extends Base implements Weathering {
    static _mixinName = 'WeatheringMixin';

    static fieldMeta: FieldMeta = {
      weatheredToS: { persistent: true, runtimeState: true },
    };

    /** The slice — only when the host keeps its coats (a staged ship's hull resets, paint D7). */
    static captureSlice(host: Stuff): { fields: Record<string, unknown> } {
      const self = host as unknown as Faced & { weatheredToS: unknown; };
      if (!self.persistsCoats()) return { fields: {} };
      return { fields: { weatheredToS: self.weatheredToS } };
    }

    /** Game-second the weather was last walked to (`null`: never — the first look stamps). */
    public weatheredToS: number | null = null;

    constructor(...args: any[]) {
      super(...args);
      if (typeof (this as unknown as Faced).airCoats !== 'function') {
        throw new TypeError('WeatheringMixin composes over FacedMixin only');
      }
    }

    public getWeatheredToS(): number | null {
      return this.weatheredToS;
    }

    public setWeatheredToS(s: number | null): void {
      this.weatheredToS = typeof s === 'number' && Number.isFinite(s) ? s : null;
    }

    /**
     * @hook The place whose air this thing's outside meets — a good's room
     * by default; a building answers one of its landings.
     */
    public weatherScope(): Stuff | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isContainable(self)) return null;
      const where = self.getContainer();
      return where ?? null;
    }

    /**
     * @hook How much of the weather reaches the outside at `scope`: all of
     * it where the rain does, some under a roof in the open air, none
     * indoors. A building's outside is always out in it.
     */
    public weatherExposureAt(scope: Stuff): number {
      const e = BiomeApi.exposureOf(scope);
      if (e === null) return 0;
      if (e.rainReaches()) return 1;
      return e.windEnters() ? SHELTERED_EXPOSURE : 0;
    }

    /** @hook The sky light at `scope`, `0..1` — what fades a pigment. */
    public skyLightAt(scope: Stuff): number {
      return BiomeApi.exposureOf(scope)?.skyLightFraction() ?? 0;
    }

    /** @hook How freely the air at `scope` changes for a coat that wants it, `0..1`. */
    public airChangeAt(scope: Stuff): number {
      if (!MixinApi.isAtmospheric(scope)) return 1;
      const ach = scope.airChangesPerHour();
      return Number.isFinite(ach) ? Math.min(1, Math.max(0, ach / 4)) : 1;
    }

    public reconcileWeather(): number | null {
      const now = WorldClockApi.getNow().rawValue();
      const from = this.weatheredToS ?? now;
      this.weatheredToS = now;
      if (!(now > from)) return null;
      const scope = this.weatherScope();
      if (scope === null) return null;
      const airChange = this.airChangeAt(scope);
      const segments: CoatAir[] = BiomeApi.airSegmentsFor(scope, from, now).map((seg) => ({
        seconds: seg.durationS,
        kelvin: seg.air.tempK,
        rh: Math.min(1, Math.max(0, seg.air.humidityPct / 100)),
        rain: seg.rainMmPerH > 0,
        airChange,
      }));
      const faced = this as unknown as Faced;
      // An oil's heat on a building is said, not felt — a structure has no
      // thermal body (the survey says the new oil is curing).
      faced.airCoats(segments);
      const bareAfter = this.weatherCoats(segments, this.weatherExposureAt(scope), this.skyLightAt(scope));
      return bareAfter === null ? null : from + bareAfter;
    }

    public weatherCoats(segments: readonly CoatAir[], exposure: number, skyLight: number): number | null {
      const face: FaceName = 'outside';
      const self = this as unknown as Faced & { coats: Partial<Record<FaceName, CoatLayer[]>> };
      let coats = [...self.getCoats(face)].map((c) => ({ ...c }));
      if (coats.length === 0) return null;
      let elapsed = 0;
      let bareAt: number | null = null;
      for (const seg of segments) {
        if (!(seg.seconds > 0)) continue;
        // The sun fades the outermost coat's pigment wherever it reaches.
        const top = coats[0];
        if (top !== undefined && top.paint !== undefined && skyLight > 0) {
          top.faded = Math.min(1, (top.faded ?? 0) + (seg.seconds / 86_400) * 0.5 * skyLight * SUN_DOSE_PER_DAY);
        }
        const segYears = (seg.seconds / GAME_YEAR_S) * Math.max(0, exposure);
        let used = 0;
        while (used < segYears && coats.length > 0) {
          const c = coats[0]!;
          if (c.state === 'wet') break;
          const opened = c.state === 'crazed' || c.state === 'run' ? OPENED_FACTOR : 1;
          const rate = (materialAt(c.material)?.getWeatheringMPerGameYear() ?? 0) * opened;
          if (!(rate > 0)) break;
          const yearsToGo = c.thicknessM / rate;
          if (yearsToGo > segYears - used) {
            c.thicknessM -= rate * (segYears - used);
            used = segYears;
            break;
          }
          // This coat wears through partway into the segment.
          used += yearsToGo;
          coats.shift();
          if (coats.length === 0 && bareAt === null) bareAt = elapsed + (used / segYears) * seg.seconds;
        }
        elapsed += seg.seconds;
      }
      self.coats = { ...self.coats, [face]: coats };
      if (coats.length === 0) {
        const rest = { ...self.coats };
        delete rest[face];
        self.coats = rest;
      }
      return bareAt;
    }

    public coatGone(): boolean {
      return (this as unknown as Faced).getCoats('outside').length === 0;
    }

    public coatThin(thinM: number): boolean {
      const coats = (this as unknown as Faced).getCoats('outside');
      if (coats.length === 0) return false;
      const total = coats.reduce((a, c) => a + (c.state === 'wet' ? 0 : c.thicknessM), 0);
      return coats.every((c) => c.state !== 'wet') && total < thinM;
    }

    /** The paint on the outside, if its top coat is one. */
    public outsidePaint(): Paint | null {
      const top = (this as unknown as Faced).getCoats('outside')[0];
      return top?.paint ? new Paint(top.paint) : null;
    }
  }
  return WeatheringMixin;
}
