/**
 * ClimbableMixin — host capability: "I let an actor in scope engage
 * climb mode."
 *
 * Composes on `Stuff`. Typical hosts: ladders, ropes, vines, cliff
 * faces. Locations can compose Climbable too (a cliff-zone Location
 * is climbable everywhere within it).
 *
 * Difficulty is an RPG-mechanical knob — the substrate doesn't enforce
 * a scale. `canBeEngagedBy` compares `actor.CLIMBING_CAPABILITY_PROP`
 * (default 1) against `host.difficulty` (when non-null).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Propertied } from '../stuff/Propertied';
import { type Enablement } from './Enablement';
import { Property } from '../stuff/Propertied';
import { MixinApi } from '../../api/mixin';
import { LocomotionApi } from '../../api/locomotion';
import { Mixins } from '../mixin';

/**
 * Property an actor sets to expose its current climbing capability.
 * Default (unset) is treated as 1.
 */
export const CLIMBING_CAPABILITY_PROP = Property.of<number>('climbing');

// Climbable's exported interface extends the shared Enablement contract;
// no Climbable-specific methods. Authors interact via the shared shape;
// the mixin name (ClimbableMixin) communicates which mode this hosts.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Climbable extends Enablement {}

export function ClimbableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class ClimbableMixin extends Base implements Enablement {
    static _mixinName = 'ClimbableMixin';
    static fieldMeta: FieldMeta = {
      axes: { persistent: true },
      difficulty: { persistent: true },
    };

    /** @authorable */
    public axes: string[] = [];
    /** @authorable */
    public difficulty: number | null = null;

    public getAxes(): readonly string[] {
      return this.axes;
    }
    public setAxes(value: string[]): void {
      LocomotionApi.assertEnablementAxes(value, 'Climbable.setAxes');
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
      LocomotionApi.assertEnablementDifficulty(value, 'Climbable.setDifficulty');
      this.difficulty = value;
    }

    public canBeEngagedBy(actor: Stuff): boolean {
      if (this.difficulty === null) return true;
      if (!MixinApi.hasMixin(actor, Mixins.Propertied)) return false;
      const cap =
        (actor as Stuff & Propertied).getProp(CLIMBING_CAPABILITY_PROP) ?? 1;
      return cap >= this.difficulty;
    }
  };
}
