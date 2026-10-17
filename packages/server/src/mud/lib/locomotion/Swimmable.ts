/**
 * SwimmableMixin — host capability: "I let an actor in scope engage
 * swim mode."
 *
 * Composes on `Stuff`. Typical hosts: pond / river / sea Locations,
 * water-filled rooms, swimmable containers. Difficulty gates per-instance
 * success against an actor's `SWIMMING_CAPABILITY_PROP`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Propertied } from '../stuff/Propertied';
import { type Enablement } from './Enablement';
import { Property } from '../stuff/Propertied';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../mixin';
import { LocomotionApi } from '../../api/locomotion';

/**
 * Property an actor sets to expose its current swimming capability.
 * Default (unset) is treated as 1.
 */
export const SWIMMING_CAPABILITY_PROP = Property.of<number>('swimming');

/** Who is in a swimmable place's water, and how cold it is. */
export interface Immersion {
  mediumTag: 'water';
  temperatureK: number;
}

export interface Swimmable extends Enablement {
  /**
   * ⭐ Is `occupant` IN this place's water (storage-and-ice D10)? Derived
   * from SUPPORT: an occupant is immersed unless the place's floor is
   * holding it up (it holds the floor's ground slot). A place with no
   * floor immerses everyone. `null` when not immersed.
   */
  immersionOf(occupant: Stuff): Immersion | null;
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
      difficulty: { persistent: true, authorable: true },
    };

    public axes: string[] = [];
    public difficulty: number | null = null;

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

    public getDifficulty(): number | null {
      return this.difficulty;
    }
    public setDifficulty(value: number | null): void {
      LocomotionApi.assertEnablementDifficulty(value, 'Swimmable.setDifficulty');
      this.difficulty = value;
    }

    public immersionOf(occupant: Stuff): Immersion | null {
      const floor = (this as unknown as { getFloor?(): Stuff | null }).getFloor?.() ?? null;
      if (floor !== null && MixinApi.isFloor(floor) && floor.supports(occupant)) return null;
      return { mediumTag: 'water', temperatureK: this.waterTemperatureK() };
    }

    /** @hook The water's temperature. Base: the place's own (last-integrated) air. */
    public waterTemperatureK(): number {
      const own = (this as unknown as { getOwnTemperatureK?(): number | null }).getOwnTemperatureK?.();
      return typeof own === 'number' && own > 0 ? own : 288;
    }

    public canBeEngagedBy(actor: Stuff): boolean {
      if (this.difficulty === null) return true;
      if (!MixinApi.hasMixin(actor, Mixins.Propertied)) return false;
      const cap =
        (actor as Stuff & Propertied).getProp(SWIMMING_CAPABILITY_PROP) ?? 1;
      return cap >= this.difficulty;
    }
  };
}
