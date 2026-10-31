/**
 * ShellMixin — ⭐⭐ *I have a fabric that holds while my coat does, wears
 * once it is gone, and can be mended* (paint build D5/D13, 2026-10-31).
 *
 * The fabric is what is under the paint: sills, putty, pointing, boards.
 * It is the residence shell's condition, moved to the kernel so every
 * building has one — a shop, a barn, a ship's hull, a home — and changed
 * in one way the requirements asked for: **the fabric wears only while the
 * coat is gone.** A building kept painted stays sound; one left alone
 * loses its coat to the weather first ({@link WeatheringMixin}) and then
 * its fabric, at `0.5 / structure.weather.daysToWorn` per game day (the
 * shipped slope).
 *
 * The bands are the shipped five, no gauge. The cause line is read off
 * the COAT, because the coat is what a passer-by sees going.
 *
 * `maintain` mends the fabric ({@link mendFabric}) and leaves the coat —
 * laying a coat is `paint`'s. Requires {@link WeatheringMixin}.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Faced } from '../material/Faced';
import type { Weathering } from '../material/Weathering';
import { Paint } from '../material/Paint';
import { AppApi } from '../../api/app';
import { WorldClockApi } from '../../api/worldclock';
import { AppSettingKeys } from '../config/AppSettings';
import { MixinApi } from '../../api/mixin';
import type { MarkupAugmenter } from '../../api/mml';

/**
 * ⭐ What a look says of the fabric — nothing while it is sound, else the
 * band and its cause: *"Its fabric is weathered — the paint is going."*
 */
const shellAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter || !MixinApi.isShell(host)) return text;
  const band = host.conditionBand();
  if (band === 'sound') return text;
  const cause = host.conditionCause();
  const line = `Its fabric is ${band}${cause ? ` — ${cause}` : ''}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
};

/** The five condition bands — banded prose, no gauge (residence P10). */
const CONDITION_BANDS: Array<[number, string]> = [
  [0.9, 'sound'],
  [0.7, 'weathered'],
  [0.5, 'worn'],
  [0.25, 'shabby'],
  [0, 'dilapidated'],
];

const GAME_DAY_S = 86_400;

function dial(key: string, fallback: number): number {
  try {
    const n = Number.parseFloat(AppApi.setting(key) ?? '');
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

export interface Shell {
  /** Walk the weather and wear the fabric for the time it stood bare; the fabric, `0..1`. */
  reconcileFabric(): number;
  /** sound · weathered · worn · shabby · dilapidated — reconciled first. */
  conditionBand(): string;
  /** Why it is in that shape, read off the coat — or `null` when sound and coated. */
  conditionCause(): string | null;
  /** The maintenance act's restore: the fabric sound again, stamped now. The coat is untouched. */
  mendFabric(): void;
  /** The fabric, `0..1`, without reconciling. */
  getFabric(): number;
  /** Set the fabric (`0..1`) — authored, staged or restored. */
  setFabric(value: number): void;
  /** The game-second the fabric was last reconciled to (`0`: never). */
  getFabricStampS(): number;
  /** Restamp the fabric clock — a staging seam. */
  setFabricStampS(s: number): void;
}

export function ShellMixin<TBase extends MixinConstructor<Stuff & Faced & Weathering>>(Base: TBase) {
  class ShellMixin extends Base implements Shell {
    static _mixinName = 'ShellMixin';
    static markupAugmenters: MarkupAugmenter[] = [shellAugmenter];

    static fieldMeta: FieldMeta = {
      fabric: { persistent: true, authorable: true, runtimeState: true },
      fabricStampS: { persistent: true, runtimeState: true },
    };

    /** The slice — only when the host keeps its coats (a staged ship's hull resets, paint D7). */
    static captureSlice(host: Stuff): { fields: Record<string, unknown> } {
      const self = host as unknown as Faced & { fabric: unknown; fabricStampS: unknown; };
      if (!self.persistsCoats()) return { fields: {} };
      return { fields: { fabric: self.fabric, fabricStampS: self.fabricStampS } };
    }

    /** The fabric, `0..1` — sound at 1. */
    public fabric = 1;
    /** Game-second of the last fabric reconcile (`0`: never — the first read stamps). */
    public fabricStampS = 0;

    constructor(...args: any[]) {
      super(...args);
      if (typeof (this as unknown as Weathering).reconcileWeather !== 'function') {
        throw new TypeError('ShellMixin composes over WeatheringMixin only');
      }
    }

    public getFabric(): number {
      return this.fabric;
    }

    public setFabric(value: number): void {
      const n = Number(value);
      this.fabric = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
    }

    public getFabricStampS(): number {
      return this.fabricStampS;
    }

    public setFabricStampS(s: number): void {
      this.fabricStampS = Number.isFinite(s) && s > 0 ? s : 0;
    }

    public reconcileFabric(): number {
      const now = WorldClockApi.getNow().rawValue();
      const weathering = this as unknown as Weathering;
      const wasBare = weathering.coatGone();
      const bareAtS = weathering.reconcileWeather();
      if (this.fabricStampS <= 0) {
        this.fabricStampS = now;
        return this.fabric;
      }
      const from = this.fabricStampS;
      this.fabricStampS = now;
      if (!(now > from) || !weathering.coatGone()) return this.fabric;
      const bareFrom = wasBare ? from : Math.max(from, bareAtS ?? now);
      const days = dial(AppSettingKeys.structureWeatherDaysToWorn, 45);
      const perSecond = 0.5 / (days * GAME_DAY_S);
      this.fabric = Math.max(0, this.fabric - (now - bareFrom) * perSecond);
      return this.fabric;
    }

    public conditionBand(): string {
      const c = this.reconcileFabric();
      for (const [floor, band] of CONDITION_BANDS) {
        if (c >= floor) return band;
      }
      return 'dilapidated';
    }

    public conditionCause(): string | null {
      const faced = this as unknown as Faced;
      const weathering = this as unknown as Weathering;
      const top = faced.getCoats('outside')[0];
      if (top !== undefined && top.state === 'wet') {
        const sets = top.paint ? new Paint(top.paint).binder()?.getKinetics()?.airSet()?.getSets() : null;
        return sets === 'oxidation'
          ? 'the new oil is still curing, faintly warm to the hand'
          : 'the new coat is still wet';
      }
      if (top !== undefined && top.state === 'run') return 'the last coat ran in the rain and never set right';
      if (top !== undefined && top.state === 'crazed') return 'the last coat crazed in the frost';
      if (weathering.coatGone()) {
        return this.fabric >= 0.9
          ? 'the paint has gone; the bare wood is taking the weather'
          : 'the paint has gone; rain has gotten into the sills';
      }
      if (weathering.coatThin(dial(AppSettingKeys.structureCoatThinM, 0.00001))) {
        return 'the paint is going; weather is starting to find the seams';
      }
      return this.fabric >= 0.9 ? null : 'the sills and putty want seeing to';
    }

    public mendFabric(): void {
      this.reconcileFabric();
      this.fabric = 1;
      this.fabricStampS = WorldClockApi.getNow().rawValue();
    }
  }
  return ShellMixin;
}
