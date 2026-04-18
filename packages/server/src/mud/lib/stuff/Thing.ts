/**
 * Thing - Base class for portable inanimate objects
 *
 * Composition: ContainableMixin(VisibleMixin(Stuff))
 *
 * Provides:
 * - shortDescription, longDescription - Visual descriptions (from VisibleMixin)
 * - environment - What container holds this object (from ContainableMixin)
 * - runtimeId, destroyed - Core object state (from Stuff)
 *
 * Examples of Things:
 * - Weapons (swords, axes, bows)
 * - Potions and consumables
 * - Furniture (chairs, tables)
 * - Books and scrolls
 * - Keys and tools
 * - Generic portable objects
 *
 * Usage:
 * ```typescript
 * const sword = await StuffApi.create(() => new Thing());
 * sword.shortDescription = "a steel longsword";
 * sword.longDescription = "A well-crafted steel longsword with a leather-wrapped hilt.";
 *
 * // Add to avatar's inventory
 * ContainmentApi.move(sword, avatar);
 *
 * // Drop in location
 * ContainmentApi.move(sword, avatar.getEnvironment());
 * ```
 *
 * Note: Thing is the simplest portable object. For objects that need additional
 * behaviors (containers, wearable, etc.), compose additional mixins or extend Thing.
 */

import { Stuff } from './Stuff';
import { VisibleMixin } from '../description/Visible';
import { ContainableMixin } from '../containment/Containable';

// Compose Thing base class with mixins
const ThingBase = ContainableMixin(VisibleMixin(Stuff));

/**
 * Thing class - base for all portable inanimate objects.
 */
export class Thing extends ThingBase {
  /**
   * Persistent fields for this class.
   * Combined with mixin persistentFields for full field list.
   *
   * Thing has no additional persistent fields beyond what mixins provide:
   * - VisibleMixin: shortDescription, longDescription
   * - ContainableMixin: (environment reference, handled separately)
   */
  static persistentFields: string[] = [];

  /**
   * Create a new Thing.
   * Most initialization comes from mixins and Stuff base class.
   */
  constructor() {
    super();
  }
}
