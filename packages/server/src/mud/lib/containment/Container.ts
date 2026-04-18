/**
 * ContainerMixin - Adds inventory management
 *
 * Provides:
 * - inventory: Set<any> (items contained)
 * - addToInventory(item): void
 * - removeFromInventory(item): void
 * - hasInInventory(item): boolean
 * - getInventoryContents(): any[]
 *
 * Usage:
 * ```typescript
 * class MyClass extends ContainerMixin(BaseClass) {
 *   // ...
 * }
 * ```
 *
 * Persistence:
 * - NOT auto-persisted (complex type)
 * - Must declare custom persistenceHandler in class
 */

import type { MixinConstructor } from '../mixin-types';

/**
 * Mixin that adds container/inventory properties and methods.
 *
 * Also provides inventory management commands (inventory, get, drop)
 * as "self" commands for any object with ContainerMixin.
 */
/**
 * Public shape provided by ContainerMixin.
 */
export interface Container {
  inventory: Set<any>;
  addToInventory(item: any): void;
  removeFromInventory(item: any): boolean;
  hasInInventory(item: any): boolean;
  getInventoryContents(): any[];
}

export function ContainerMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ContainerMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'ContainerMixin';

    /**
     * Command provider for inventory management commands
     */
    static commandProvider = {
      self: ['inventory.yaml', 'get.yaml', 'drop.yaml'],
      environment: [],
      inventory: [],
      colocated: [],
    };

    /**
     * Note: inventory is a complex type (Set of references).
     * It is NOT included in persistentFields - instead, classes using
     * this mixin must declare a custom persistenceHandler.
     */
    inventory: Set<any> = new Set();

    /**
     * Add an item to the inventory.
     * @param item - Item to add
     */
    addToInventory(item: any): void {
      this.inventory.add(item);
    }

    /**
     * Remove an item from the inventory.
     * @param item - Item to remove
     * @returns True if item was found and removed
     */
    removeFromInventory(item: any): boolean {
      return this.inventory.delete(item);
    }

    /**
     * Check if inventory contains an item.
     * @param item - Item to check for
     */
    hasInInventory(item: any): boolean {
      return this.inventory.has(item);
    }

    /**
     * Get all items in inventory as an array.
     */
    getInventoryContents(): any[] {
      return Array.from(this.inventory);
    }

    /**
     * Alias for getInventoryContents() for consistency with ContainmentApi
     */
    getContents(): any[] {
      return this.getInventoryContents();
    }
  };
}
