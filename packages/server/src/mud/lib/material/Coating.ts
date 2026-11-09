/**
 * CoatingMixin — *it lays a COAT.*
 *
 * A bath of it lays a coat, the word a look uses for it, how fast a set coat
 * weathers, and — when it is one — its pigment and its glue.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasCoating(m)` and never on a material's kind.
 */

import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/**
 * ⭐ A material as a PIGMENT (paint build D8) — the dyestuff row's shape,
 * on the material because a pigment is SUSPENDED, not dissolved: what of
 * each channel it gives back, how much of what is under it a coat hides,
 * and how well it stands the sun (`1` never fades).
 */
export interface PigmentSpec {
  transmitR: number;
  transmitG: number;
  transmitB: number;
  hidingPower: number;
  lightfastness: number;
}

/**
 * ⭐ A material as a GLUE (paint build D11): the strength of a set line
 * (`0..1`), whether it comes apart and how (`never`, or heat to `heatK`
 * and steam), how well it stands the damp (`1` waterproof), and the
 * temperature it lets go at.
 */
export interface AdhesiveSpec {
  strength: number;
  reversible: 'never' | { heatK?: number; steam?: boolean };
  resistsDamp: number;
  softensAtK?: number;
}

export interface Coating {
  getLaysCoat(): boolean;
  setLaysCoat(value: boolean): void;
  getCoatWord(): string;
  setCoatWord(value: string): void;
  getWeatheringMPerGameYear(): number;
  setWeatheringMPerGameYear(value: number): void;
  getPigment(): PigmentSpec | null;
  setPigment(value: PigmentSpec | null): void;
  getAdhesive(): AdhesiveSpec | null;
  setAdhesive(value: AdhesiveSpec | null): void;
}

export function CoatingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class CoatingMixin extends Base implements Coating {
    static _mixinName = 'CoatingMixin';

    static fieldMeta: FieldMeta = {
      // A bath of this lays a coat (a glaze slip) — what `dip` reads.
      laysCoat: { persistent: true, authorable: true },
      // The word a look uses for a sound coat of this — "glazed", later
      // "painted", "tarred", "varnished". Absent reads "coated".
      coatWord: { persistent: true, authorable: true },
      // ⭐ How fast a SET coat of this thins where the weather reaches it,
      // meters per game year (paint build D5). Absent: never weathers — a
      // glaze, a tar. A painter learns it by what peels.
      weatheringMPerGameYear: { persistent: true, authorable: true },
      // ⭐ This is a PIGMENT: its color suspended in a binder, how well it
      // hides what is under it, how it stands the sun (paint build D8).
      pigment: { persistent: true, authorable: true },
      // ⭐ This is a GLUE: how strong its line, whether heat and steam undo
      // it, how it stands the damp (paint build D11). Measured facts.
      adhesive: { persistent: true, authorable: true },
    };

    /** A bath of this lays a coat — a glaze slip (what `dip` reads). */
    protected laysCoat = false;
    public getLaysCoat(): boolean {
      return this.laysCoat;
    }
    public setLaysCoat(value: boolean): void {
      this.laysCoat = value === true;
    }

    /** What a look calls a thing with a sound coat of this: *It is glazed …*. */
    protected coatWord = '';
    public getCoatWord(): string {
      return this.coatWord !== '' ? this.coatWord : 'coated';
    }
    public setCoatWord(value: string): void {
      this.coatWord = typeof value === 'string' ? value.trim() : '';
    }

    /** Meters a set coat of this loses per game year in the weather (`0`: never). */
    protected weatheringMPerGameYear = 0;
    public getWeatheringMPerGameYear(): number {
      return this.weatheringMPerGameYear;
    }
    public setWeatheringMPerGameYear(value: number): void {
      const n = Number(value);
      this.weatheringMPerGameYear = Number.isFinite(n) && n > 0 ? n : 0;
    }

    /** This material as a pigment, or `null` when it is none. */
    protected pigment: PigmentSpec | null = null;
    public getPigment(): PigmentSpec | null {
      return this.pigment;
    }
    public setPigment(value: PigmentSpec | null): void {
      if (value === null || typeof value !== 'object') {
        this.pigment = null;
        return;
      }
      const unitOf = (v: unknown, d: number): number => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d;
      };
      this.pigment = {
        transmitR: unitOf(value.transmitR, 1),
        transmitG: unitOf(value.transmitG, 1),
        transmitB: unitOf(value.transmitB, 1),
        hidingPower: unitOf(value.hidingPower, 0.5),
        lightfastness: unitOf(value.lightfastness, 1),
      };
    }

    /** This material as a glue, or `null` when it is none. */
    protected adhesive: AdhesiveSpec | null = null;
    public getAdhesive(): AdhesiveSpec | null {
      return this.adhesive;
    }
    public setAdhesive(value: AdhesiveSpec | null): void {
      if (value === null || typeof value !== 'object') {
        this.adhesive = null;
        return;
      }
      const unitOf = (v: unknown, d: number): number => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d;
      };
      const rev = value.reversible;
      const spec: AdhesiveSpec = {
        strength: unitOf(value.strength, 0.7),
        reversible:
          rev !== null && typeof rev === 'object'
            ? {
                ...(Number(rev.heatK) > 0 ? { heatK: Number(rev.heatK) } : {}),
                ...(rev.steam === true ? { steam: true } : {}),
              }
            : 'never',
        resistsDamp: unitOf(value.resistsDamp, 0),
      };
      if (Number(value.softensAtK) > 0) spec.softensAtK = Number(value.softensAtK);
      this.adhesive = spec;
    }
  };
}
