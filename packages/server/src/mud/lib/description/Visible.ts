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
import type { Stuff } from '../stuff/Stuff';
import { augmentMarkup } from '../../api/mml';

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
  /**
   * Long description with every contributing mixin's
   * `markupAugmenters` applied — detail keys wrapped in `<detail>`
   * MML when the host composes Detailed, exit names wrapped in
   * `<exit>` when (future) Exitable contributes, language masks
   * applied when (future) Language contributes, etc. Plain Visible
   * hosts (no contributors) return `getLong()` unchanged.
   *
   * Same affordance-annotated text feeds both the `look` prose
   * composer and the `longDescription` subscription projection, so
   * the terminal scrollback and the inspection pane see identical
   * clickable wrappers around the same anchors.
   *
   * `viewer` is threaded through to augmenters that need per-recipient
   * decisions (language gating, spoiler hiding). Augmenters that
   * don't care just ignore it.
   */
  getMarkupLong(viewer: Stuff): string;
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
        // `getMarkupLong(viewer)` is the host-level affordance-
        // annotated long description. The substrate's
        // `augmentMarkup` helper walks every contributing mixin's
        // `static markupAugmenters` and folds them through the raw
        // text — Detailed wraps detail keys in `<detail>` today;
        // future mixins (Exitable's direction auto-link, Language's
        // unknown-tongue masking) plug in via the same slot. Plain
        // Visible hosts contribute nothing and the wrap is a no-op.
        name: 'longDescription',
        read: (stuff, viewer) =>
          (stuff as unknown as Visible).getMarkupLong(viewer),
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

    /**
     * Affordance-annotated long description — see the interface
     * docstring for the augmenter pipeline contract. Calls
     * `augmentMarkup` with the host (`this`) and the supplied
     * `viewer`; every contributing mixin's augmenters run in
     * parent-first → child-last order.
     */
    getMarkupLong(viewer: Stuff): string {
      return augmentMarkup(this.getLong(), this as unknown as Stuff, viewer);
    }
  };
}
