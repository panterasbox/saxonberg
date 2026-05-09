/**
 * OrganismMixin — biological identity for an actor or in-world Thing.
 *
 * Composing this mixin says: "this Stuff is a member of a species and
 * carries the biological state that follows from that — age, lifecycle
 * state, optionally sex." Avatars compose it via Character (so every
 * player is an Organism). Plant-Things, NPC-fauna, and similar in-world
 * Stuff compose it on their own concrete class.
 *
 * Detached tissue is NOT an Organism. The apple-on-the-ground case is
 * Tangible (made of fruit-flesh) but not Organism — its parent tree is
 * the organism, the apple is bulk material. (See race.md.)
 *
 * **Cross-reference shape (LOCKED).** `_speciesPath` is the persistent
 * field; `getSpecies()` resolves on each call via
 * `StuffApi.findByTemplatePath`. HMR-safe; no instance cache.
 *
 * Sex delegation: `getSex()` checks `MixinApi.isSexed(this)` and
 * delegates to the SexedMixin surface when composed. Hosts that don't
 * compose `SexedMixin` (e.g. v1 plants) get `null`.
 */

import type { MixinConstructor } from '../mixin';
import { StuffApi } from '../../api/stuff';
import type { Species } from './Species';

export interface Organism {
  getSpecies(): Species | null;
  setSpecies(value: Species | null): void;
  getAge(): number;
  setAge(value: number): void;
  getLifecycleState(): string;
  setLifecycleState(value: string): void;
  getSex(): string | null;
}

export function OrganismMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class OrganismMixin extends Base {
    static _mixinName = 'OrganismMixin';
    static persistentFields = ['_speciesPath', 'age', 'lifecycleState'];

    /**
     * Path to the Species singleton this organism belongs to. Resolved
     * lazily on each getSpecies() call so HMR replacement is observed
     * immediately.
     */
    public _speciesPath: string | null = null;

    /**
     * Years (or species-appropriate units; v1 doesn't enforce). 0 at
     * birth/clone-time. Aging is deferred to follow-on builds.
     */
    public age: number = 0;

    /**
     * Current lifecycle state — one of the species' valid set
     * (`'alive'`, `'dead'`, `'undead'`, `'powered'`, `'unpowered'`,
     * `'destroyed'`). Initial value lives on the leaf template's
     * `data` per slate. Empty default keeps unhydrated test fixtures
     * trivially constructable.
     */
    public lifecycleState: string = '';

    public getSpecies(): Species | null {
      if (!this._speciesPath) return null;
      return StuffApi.findByTemplatePath<Species>(this._speciesPath) ?? null;
    }

    public setSpecies(value: Species | null): void {
      this._speciesPath = value?.getTemplatePath() ?? null;
    }

    public getAge(): number { return this.age; }
    public setAge(value: number): void { this.age = value; }

    public getLifecycleState(): string { return this.lifecycleState; }
    public setLifecycleState(value: string): void { this.lifecycleState = value; }

    /**
     * Sex default — `null` for biology-only organisms (v1 plants,
     * Constructa, raw Animalia without SexedMixin). When the host
     * composes `SexedMixin` (Item 7), that mixin's `getSex()` shadows
     * this default through the standard mixin override chain.
     */
    public getSex(): string | null {
      return null;
    }
  };
}
