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
import { ShadowChangedEvent } from '../events/ShadowChangedEvent';
import {
  MqlSubscriptionApi,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';

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

    /**
     * Live-query subscribable fields. Each descriptor's
     * `dependsOnFields` defaults to `[descriptor.name]` (descriptor
     * name = source field name), so the `FieldChangedEvent` fires
     * from `setShortDescription` / `setLongDescription` trigger
     * re-projection automatically. The `ShadowChangedEvent` entries
     * cover future hood / disguise shadows that override visible
     * appearance without firing a field change.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'shortDescription',
        read: (stuff) =>
          (stuff as unknown as Visible).getShortDescription(),
        changes: [{ on: ShadowChangedEvent, by: 'target' }],
      },
      {
        // Hosts that compose `DetailedMixin` ship a `getMarkupLong()`
        // method returning the long description with detail-key MML
        // wrappers inline (`<detail key="...">word</detail>`). Prefer
        // that when present so the pane and the look prose see the
        // same affordance-annotated text. Plain `Visible` hosts (no
        // detail map) just return the raw long. Duck-typed lookup —
        // Visible doesn't import Detailed.
        name: 'longDescription',
        read: (stuff) => {
          const v = stuff as unknown as Visible & {
            getMarkupLong?: () => string;
          };
          return v.getMarkupLong
            ? v.getMarkupLong()
            : v.getLongDescription();
        },
        changes: [{ on: ShadowChangedEvent, by: 'target' }],
      },
    ];

    protected shortDescription: string = '';
    protected longDescription: string = '';

    getShortDescription(): string {
      return this.shortDescription;
    }

    setShortDescription(value: string): void {
      this.shortDescription = MqlSubscriptionApi.fireFieldChange(
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
      this.longDescription = MqlSubscriptionApi.fireFieldChange(
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
