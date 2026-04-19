/**
 * MobileMixin - Adds locomotion capability for creatures and vehicles
 *
 * Provides:
 * - travel(destination: Location, mode?: string): void - High-level locomotion with mode
 *
 * Usage:
 * ```typescript
 * class Avatar extends MobileMixin(SomeBase) {
 *   // ...
 * }
 *
 * avatar.travel(targetLocation, 'walk');  // Walk to location
 * avatar.travel(targetLocation, 'run');   // Run to location
 * avatar.travel(targetLocation);          // Default mode
 * ```
 *
 * The travel() method is for mobile entities (creatures, vehicles).
 * It delegates to ContainmentApi.move() which handles the actual movement.
 *
 * Hierarchy:
 * - travel() - High level (creatures, vehicles) with mode
 * - ContainmentApi.move() - Mid level (any containable) with hooks
 * - setEnvironment()/addToInventory() - Low level (called by move() only)
 */

import type { MixinConstructor } from '../mixin-types';
import type { Location } from '../stuff/Location';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from './Containable';
import { ContainmentApi } from '../../api/containment';

/**
 * Mixin that adds locomotion capability for mobile entities.
 *
 * Base-class constraint: the Base must already produce `Stuff & Containable`
 * instances. A mobile thing that cannot be contained is nonsensical — there
 * is nothing for ContainmentApi.move() to update. Composing MobileMixin
 * onto a Base that hasn't already been through ContainableMixin is a
 * compile error.
 */
export function MobileMixin<TBase extends MixinConstructor<Stuff & Containable>>(Base: TBase) {
  return class MobileMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'MobileMixin';

    /**
     * Travel to a new location with specified mode.
     *
     * This is a high-level method for mobile entities (creatures, vehicles).
     * The mode parameter indicates how travel occurs (walk, run, drive, fly, etc.).
     *
     * Delegates to ContainmentApi.move() for actual containment management.
     *
     * Future enhancements:
     * - Stamina/energy costs based on mode
     * - Different movement speeds
     * - Terrain restrictions by mode
     * - Observer messages ("Alice walks north", "Bob runs south")
     *
     * @param destination - Target location to travel to
     * @param mode - Mode of travel (walk, run, drive, fly, etc.) - default: 'walk'
     */
    travel(destination: Location, mode: string = 'walk'): void {
      // Future: Check if mode is valid (can creature fly? is there a vehicle?)
      // Future: Calculate stamina/energy cost based on mode
      // Future: Check terrain restrictions (can't fly in low ceiling, etc.)

      // Future: Send observer messages based on mode
      // MessageApi.messageContainer(this, `${this.name} ${mode}s away`);

      // Delegate to ContainmentApi for actual movement.
      // The Base constraint enforced by MobileMixin's signature guarantees
      // `this` is Stuff & Containable at every real call site; TypeScript's
      // `this` type inside a mixin body just can't express it, so the cast
      // still needs an `unknown` hop. It's provably safe, not a waiver.
      ContainmentApi.move(this as unknown as Stuff & Containable, destination);

      // Future: Send observer messages at destination
      // MessageApi.messageContainer(this, `${this.name} ${mode}s in`);
    }
  };
}
