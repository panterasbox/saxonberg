/**
 * SmellSourceMixin — anything that emits an odor.
 *
 * Mirrors `LightSourceMixin`'s shape: stored emission expressed as
 * ppm concentration + a string odor identity. To stop emitting, set
 * concentration to zero; to start, set it back to a positive value.
 * No `Switchable`, no fuel state, no `light X` verb in v1 — content
 * concerns layered on top of the physics surface.
 *
 * Hosts can be Things (a candle emitting wax + smoke; a cup of
 * coffee; a corpse), Vessels, or Locations. The propagation walk
 * discovers emitters via `getContents()` (contents-side) and
 * `Adornable.getFixtureSmellSources()` (fixture-side), and reads
 * `getEmittedConcentration()` + `getOdorIdentity()` once per
 * emitter.
 *
 * Persistence — scalar-default rule.
 *
 * The emission decomposes into two scalar persistent fields:
 * `emittedConcentration` (number, ≥ 0; ppm) and
 * `odorIdentity` (string). The runtime API is strict on Quantity
 * value objects; setter coercion accepts numeric / string / Quantity
 * input for authoring ergonomics.
 *
 * Witness hook: `setEmittedConcentration` and `setOdorIdentity` fire
 * `onSmellSourceChanged` (the `SmellSourceObserver` contract,
 * declared below) on the immediate environment when the stored
 * value actually changes. v1 fans out to the IMMEDIATE environment
 * only.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { Quantity } from '../quantity';

/** Public shape added by SmellSourceMixin. */
export interface SmellSource {
  getEmittedConcentration(): Quantity<'ppm'>;
  setEmittedConcentration(value: Quantity<'ppm'> | number | string): void;
  getOdorIdentity(): string;
  setOdorIdentity(value: string): void;
}

/**
 * Witness hook fired on a smell source's immediate environment when
 * the stored emission changes. Optional — implement only the host
 * Containers that care. Same shape as `LightSourceObserver`.
 */
export interface SmellSourceObserver {
  onSmellSourceChanged?(
    source: Stuff,
    oldConcentration: Quantity<'ppm'>,
    newConcentration: Quantity<'ppm'>,
    oldIdentity: string,
    newIdentity: string,
  ): void;
}

export function SmellSourceMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SmellSourceMixin extends Base {
    static _mixinName = 'SmellSourceMixin';

    static persistentFields = ['emittedConcentration', 'odorIdentity'];

    /**
     * Backing storage for the emitted ppm scalar.
     * @authorable
     */
    private _emittedConcentration: number = 0;
    /**
     * Backing storage for the odor identity.
     * @authorable
     */
    private _odorIdentity: string = '';

    /**
     * Host-internal accessor pair for the ppm scalar. Hydrator's
     * bracket-assign goes through here so a malformed template
     * (negative, NaN, non-number) crashes loudly.
     */
    protected get emittedConcentration(): number {
      return this._emittedConcentration;
    }
    protected set emittedConcentration(value: number) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new TypeError(
          `SmellSourceMixin.emittedConcentration must be a non-negative ` +
            `finite number, got ${value}`,
        );
      }
      this._emittedConcentration = value;
    }

    protected get odorIdentity(): string {
      return this._odorIdentity;
    }
    protected set odorIdentity(value: string) {
      if (typeof value !== 'string') {
        throw new TypeError(
          `SmellSourceMixin.odorIdentity must be a string, got ${typeof value}`,
        );
      }
      this._odorIdentity = value;
    }

    /** ppm-typed runtime API. Reads the stored scalar each call. */
    getEmittedConcentration(): Quantity<'ppm'> {
      return Quantity.of(this._emittedConcentration, 'ppm');
    }

    /**
     * Strict-shape runtime setter. Accepts a `Quantity<'ppm'>`, a
     * non-negative numeric (interpreted as ppm), or a tag string.
     * Fires the `onSmellSourceChanged` Witness hook when the stored
     * concentration changes.
     */
    setEmittedConcentration(value: Quantity<'ppm'> | number | string): void {
      const ppm = coercePpmInput(value);
      const prev = this._emittedConcentration;
      this._emittedConcentration = ppm;
      if (prev !== ppm) {
        fireOnSmellSourceChanged(
          this as unknown as Stuff,
          Quantity.of(prev, 'ppm'),
          Quantity.of(ppm, 'ppm'),
          this._odorIdentity,
          this._odorIdentity,
        );
      }
    }

    getOdorIdentity(): string {
      return this._odorIdentity;
    }

    setOdorIdentity(value: string): void {
      if (typeof value !== 'string') {
        throw new TypeError(
          `SmellSourceMixin.setOdorIdentity: must be a string, got ${typeof value}`,
        );
      }
      const prev = this._odorIdentity;
      this._odorIdentity = value;
      if (prev !== value) {
        const conc = Quantity.of(this._emittedConcentration, 'ppm');
        fireOnSmellSourceChanged(
          this as unknown as Stuff,
          conc,
          conc,
          prev,
          value,
        );
      }
    }
  };
}

function coercePpmInput(value: Quantity<'ppm'> | number | string): number {
  if (value instanceof Quantity) {
    if (value.unit !== 'ppm') {
      throw new TypeError(
        `SmellSourceMixin: expected Quantity<'ppm'>, got Quantity<'${value.unit}'>`,
      );
    }
    if (value.rawValue() < 0) {
      throw new Error(
        `SmellSourceMixin: emitted concentration must be non-negative, ` +
          `got ${value.rawValue()}`,
      );
    }
    return value.rawValue();
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `SmellSourceMixin: emitted concentration must be a non-negative ` +
          `finite number, got ${value}`,
      );
    }
    return value;
  }
  if (typeof value === 'string') {
    const q = Quantity.parse(value, 'ppm');
    if (q.rawValue() < 0) {
      throw new Error(
        `SmellSourceMixin: emitted concentration must be non-negative, ` +
          `got ${q.rawValue()}`,
      );
    }
    return q.rawValue();
  }
  throw new TypeError(
    `SmellSourceMixin: emitted concentration must be Quantity<'ppm'>, ` +
      `number, or tag string`,
  );
}

/**
 * Fire `onSmellSourceChanged` on the source's immediate environment
 * if the host is Containable and the environment's hook is present.
 * The hook contract is `SmellSourceObserver` (declared above).
 */
function fireOnSmellSourceChanged(
  source: Stuff,
  oldConc: Quantity<'ppm'>,
  newConc: Quantity<'ppm'>,
  oldIdentity: string,
  newIdentity: string,
): void {
  if (!MixinApi.isContainable(source)) return;
  const env = source.getContainer() as Partial<SmellSourceObserver> | null;
  if (!env) return;
  // Optional witness: any environment may opt into the observer
  // contract by defining the hook; no mixin gates it, so a
  // structural presence check is the only available seam.
  const hook = env.onSmellSourceChanged;
  if (typeof hook !== 'function') return;
  hook.call(env, source, oldConc, newConc, oldIdentity, newIdentity);
}
