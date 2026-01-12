/**
 * MortalMixin - Adds health/hitpoints for entities that can be damaged/destroyed
 *
 * Provides:
 * - hp: number (current hitpoints)
 * - maxHp: number (maximum hitpoints)
 * - isDead(): boolean
 * - takeDamage(amount: number): void
 * - heal(amount: number): void
 *
 * Usage:
 * ```typescript
 * class MyClass extends MortalMixin(BaseClass) {
 *   // ...
 * }
 * ```
 *
 * Rationale:
 * - Distinguishes entities with health from invulnerable/incorporeal entities
 * - Applies to: PCs, NPCs, some monsters, possibly destructible objects
 * - Does NOT apply to: Ghosts (if incorporeal), magical barriers, abstract concepts
 * - Works for both living and undead (undead can still be "destroyed")
 */

import type { MixinConstructor } from './types';

/**
 * Mixin that adds health/hitpoint properties and methods.
 */
export function MortalMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class MortalMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'MortalMixin';

    /**
     * Persistent fields declared by this mixin.
     * Used by PersistApi for automatic synchronization.
     */
    static persistentFields = ['hp', 'maxHp'];

    hp: number = 100;
    maxHp: number = 100;

    /**
     * Check if this entity is dead (hp <= 0).
     */
    isDead(): boolean {
      return this.hp <= 0;
    }

    /**
     * Take damage, reducing hp (minimum 0).
     * @param amount - Amount of damage to take
     */
    takeDamage(amount: number): void {
      this.hp = Math.max(0, this.hp - amount);
    }

    /**
     * Heal, increasing hp (maximum maxHp).
     * @param amount - Amount of healing
     */
    heal(amount: number): void {
      this.hp = Math.min(this.maxHp, this.hp + amount);
    }
  };
}
