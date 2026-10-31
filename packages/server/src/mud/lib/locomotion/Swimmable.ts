/**
 * SwimmableMixin — host capability: "I let an actor in scope engage
 * swim mode."
 *
 * Composes on `Stuff`. Typical hosts: the water places (`Pool`, a
 * column's bands).
 *
 * ⭐⭐ **Swimming is a COST, never a check** (underwater D12). Anyone can
 * go into water; what it costs to stay up is paid in effort by the body
 * (the tread beat on `RespirationMixin`), cheaper the better you swim.
 * So there is no difficulty here: `canBeEngagedBy` admits every body,
 * and `difficulty` is the enablement contract's field with nothing to
 * say — a water is not hard to be in, it is hard to stay up in.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type Exit from '../boundary/Exit';
import { type Enablement } from './Enablement';
import { LocomotionApi } from '../../api/locomotion';


export interface Swimmable extends Enablement {
  /** The water's temperature, K. Base: the place's own air. */
  waterTemperatureK(): number;
}

export function SwimmableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class SwimmableMixin extends Base implements Swimmable {
    static _mixinName = 'SwimmableMixin';
    static fieldMeta: FieldMeta = {
      axes: { persistent: true, authorable: true },
    };

    public axes: string[] = [];

    public getAxes(): readonly string[] {
      return this.axes;
    }
    public setAxes(value: string[]): void {
      LocomotionApi.assertEnablementAxes(value, 'Swimmable.setAxes');
      this.axes = value;
    }

    public canEngageAxis(direction: string): boolean {
      if (this.axes.includes('*')) return true;
      return this.axes.includes(direction);
    }

    /** No water is hard to be in; staying up is a cost the body pays. */
    public getDifficulty(): number | null {
      return null;
    }
    public setDifficulty(value: number | null): void {
      LocomotionApi.assertEnablementDifficulty(value, 'Swimmable.setDifficulty');
      if (value !== null) {
        throw new RangeError(
          'Swimmable.setDifficulty: swimming is a cost, not a check — a water has no difficulty',
        );
      }
    }

    /** @hook The water's temperature. Base: the place's own (last-integrated) air. */
    public waterTemperatureK(): number {
      const own = (this as unknown as { getOwnTemperatureK?(): number | null }).getOwnTemperatureK?.();
      return typeof own === 'number' && own > 0 ? own : 288;
    }

    /** Every body may go into the water; what it costs is the body's. */
    public canBeEngagedBy(actor: Stuff): boolean {
      void actor;
      return true;
    }

    /** @hook After a crossing on this host (cordage D11). Default: nothing. */
    public async afterEnabledTraverse(actor: Stuff, direction: string, exit: Exit): Promise<void> {
      void actor;
      void direction;
      void exit;
    }
  };
}
