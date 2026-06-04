/**
 * VisibleMixin - Adds description properties for visible objects
 *
 * Provides:
 * - shortDescription: string (brief description)
 * - longDescription: string (detailed description)
 * - getShort(): string
 * - getLong(): string
 * - look command for examining objects
 *
 * Usage:
 * ```typescript
 * class MyClass extends VisibleMixin(BaseClass) {
 *   // ...
 * }
 * ```
 */

import type { MixinConstructor } from '../mixin';
import type { CommandContributions } from '../../api/command';
import { fireFieldChange } from '../events/FieldChangedEvent';

/**
 * Mixin that adds description properties for visible objects.
 *
 * Visible is pure **target shape** — it owns the description state
 * (`shortDescription` / `longDescription`) and contributes no
 * verbs. The verbs of perception (`look` / `scry` / `locate`) live
 * on `PerceiverMixin`'s `self` bucket; perceivers issue them, and
 * scope resolution at execution time picks any reachable Visible
 * as a target.
 *
 * The earlier shape — Visible adding `look.yaml` on
 * `environment`/`inventory`/`peers` — granted the verb to the
 * looker's stack *because there happened to be a visible thing
 * nearby*, which inverts the contract: actor capability shouldn't
 * come from a target's existence. Compare a `Throne` contributing
 * `sit` on `environment` — that's correct because `sit` only
 * exists as a verb-against-that-specific-target; `look` is a
 * perceiver-side verb that takes any Visible as a target.
 */
/**
 * Public shape provided by VisibleMixin.
 */
export interface Visible {
  getShortDescription(): string;
  setShortDescription(value: string): void;
  getLongDescription(): string;
  setLongDescription(value: string): void;
  getShort(): string;
  getLong(): string;
}

export function VisibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class VisibleMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'VisibleMixin';

    /**
     * Visible is target-shape only — no verb contributions. See the
     * mixin docstring for why `look.yaml` belongs on Perceiver's
     * `self` bucket, not on Visible's target-side buckets.
     */
    static commandContributions: CommandContributions = {
      self: [],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * Persistent fields declared by this mixin.
     * Used by PersistApi for automatic synchronization.
     */
    static persistentFields = ['shortDescription', 'longDescription'];

    protected shortDescription: string = '';
    protected longDescription: string = '';

    getShortDescription(): string {
      return this.shortDescription;
    }

    setShortDescription(value: string): void {
      this.shortDescription = fireFieldChange(
        this,
        'shortDescription',
        this.shortDescription,
        value,
      );
    }

    getLongDescription(): string {
      return this.longDescription;
    }

    setLongDescription(value: string): void {
      this.longDescription = fireFieldChange(
        this,
        'longDescription',
        this.longDescription,
        value,
      );
    }

    /**
     * Get the short description with fallback.
     */
    getShort(): string {
      return this.shortDescription || 'You see nothing special.';
    }

    /**
     * Get the long description with fallback to short, then default.
     */
    getLong(): string {
      return this.longDescription || this.shortDescription || 'You see nothing special.';
    }
  };
}
