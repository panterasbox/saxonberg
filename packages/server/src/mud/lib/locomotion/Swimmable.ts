/**
 * SwimmableMixin — host capability: "I let an actor in scope engage
 * swim mode."
 *
 * Composes on `Stuff`. Typical hosts: pond / river / sea Locations,
 * water-filled rooms, swimmable containers. Difficulty gates per-instance
 * success against an actor's `SWIMMING_CAPABILITY_PROP`.
 */

import type { MixinConstructor } from '../mixin';
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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Swimmable extends Enablement {}

export function SwimmableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class SwimmableMixin extends Base implements Enablement {
    static _mixinName = 'SwimmableMixin';
    static persistentFields = ['axes', 'difficulty'];

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

    public canBeEngagedBy(actor: Stuff): boolean {
      if (this.difficulty === null) return true;
      if (!MixinApi.hasMixin(actor, Mixins.Propertied)) return false;
      const cap =
        (actor as Stuff & Propertied).getProp(SWIMMING_CAPABILITY_PROP) ?? 1;
      return cap >= this.difficulty;
    }
  };
}
