/**
 * GlobbableMixin — fungible-stack substrate.
 *
 * A `Globbable` Stuff carries an integer `quantity` and is treated by
 * the framework as if it were `quantity` separate instances at the
 * contract surface (`drop 5 coins`, "30 coins are here"), while
 * storing only one row. Operational reference:
 * `docs/subsystems/glob.md`. The bulk-form extension story lives in
 * `docs/slates/bulkable-slate.md`.
 *
 * Three guarantees:
 *
 *   1. **One Stuff, N units.** A stack of 30 coins is one Stuff with
 *      `quantity: 30`, not 30 sibling Stuffs. Split on transfer when
 *      taking fewer than the whole; merge on arrival when a mergeable
 *      sibling already lives in the destination.
 *   2. **Quantity is part of identity.** Globs render with their count
 *      (`30 coins`); ordinal MQL (`coin:[2]`) does NOT index into a
 *      glob's units.
 *   3. **Non-globs are unaffected.** A non-Globbable rose still
 *      resolves exactly as it does today.
 *
 * The mixin's surface is methods only (per the inter-stuff contract);
 * the persistent `quantity` field is reflected into by the Hydrator.
 *
 * Composition constraints (G6):
 *   - `Globbable ⊥ Container` — globs aren't containers. A subclass
 *     that composes both throws at first registration via the
 *     `__validateComposition__` hook on `MixinApi.assertComposable`.
 *   - `globIdentityFields ⊂ persistentFields` — glob-identity fields
 *     must round-trip through hydration; runtime-only fields would
 *     diverge after a reload. Enforced in the same hook.
 *
 * Glob identity via `globIdentityFields`:
 *   Two stacks merge iff (a) same template path, (b) neither side has
 *   shadows or adornments, (c) equal values for every field in the
 *   union of both classes' `static globIdentityFields`. Subclasses
 *   extend the parent's list:
 *     `static globIdentityFields = [...Coin.globIdentityFields, 'mintMark']`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from './Stuff';
import type { AnyConstructor } from '../../api/mixin';
import { Mixins } from '../mixin';
import { MixinApi } from '../../api/mixin';
import { ShadowApi } from '../../api/shadow';
import {
  MqlSubscriptionApi,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';

/** Public shape added by GlobbableMixin. */
export interface Globbable {
  /** Current stack size. Always a positive integer. */
  getQuantity(): number;

  /**
   * Set the stack size. Throws on `n < 1` or non-integer `n`. To
   * "destroy the last one," go through `StuffApi.destruct`; the
   * mixin never permits a zero-quantity state.
   */
  setQuantity(n: number): void;

  /**
   * Veto seam for merge. Default: same templatePath, no shadows /
   * adornments on either side, every glob-identity field equal. A
   * future shadow that wants to block (or permit) merging overrides
   * this on its shadow layer.
   */
  canMergeWith(other: Stuff): boolean;

  /**
   * Veto seam for split. Default: `1 <= n <= getQuantity()`, no
   * shadows on this, no adornments on this. Shadows that know they
   * split cleanly override to widen.
   */
  canSplit(n: number): boolean;

  /**
   * Witness on the source after `GlobbableApi.split` produces a new
   * Stuff. No-op terminal so subclasses can `super.onSplit(splitoff)`.
   */
  onSplit(splitoff: Stuff): void;

  /**
   * Witness on the surviving stack after `GlobbableApi.merge` absorbs
   * another. No-op terminal so subclasses can
   * `super.onMerged(absorbed)`.
   */
  onMerged(absorbed: Stuff): void;
}

export function GlobbableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class GlobbableMixin extends Base {
    static _mixinName = 'GlobbableMixin';

    /**
     * Stack size. Persisted by name; default 1. Template authoring
     * sets the initial value in YAML `data:` and the Hydrator reflects
     * it in here.
     */
    public quantity: number = 1;

    static persistentFields = ['quantity'];

    /**
     * Live-query subscribable field. `dependsOnFields` defaults to
     * `['quantity']` (descriptor name = source field name), so
     * `FieldChangedEvent { field: 'quantity' }` from `setQuantity`
     * triggers re-projection automatically.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'quantity',
        read: (stuff) => (stuff as unknown as Globbable).getQuantity(),
      },
    ];

    /**
     * Subset of `persistentFields` that defines glob identity. Two
     * stacks of the same templatePath merge iff every field listed
     * here has equal values on both sides.
     *
     * Default `[]` means strict template-fungibility — every instance
     * of the host class merges with every other (modulo shadows /
     * adornments).
     */
    static globIdentityFields: string[] = [];

    /**
     * One-time composition check, run by `MixinApi.assertComposable`
     * the first time a concrete class is registered.
     *
     * Enforces:
     *   - `Globbable ⊥ Container` — globs aren't containers.
     *   - `Globbable ⊥ Singleton` — singletons are one-instance-per-
     *     templatePath; splitting would need a second instance at
     *     the same path and `StuffApi.clone` would refuse it.
     *   - `globIdentityFields ⊂ persistentFields` — identity fields
     *     must survive save/load.
     */
    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      if (MixinApi.hasMixin(ctor, Mixins.Container)) {
        throw new Error(
          `${name} composes GlobbableMixin and ContainerMixin; ` +
            `globs cannot be containers.`
        );
      }
      if (MixinApi.hasMixin(ctor, Mixins.Singleton)) {
        throw new Error(
          `${name} composes GlobbableMixin and SingletonMixin; ` +
            `globs split into siblings at the same templatePath, ` +
            `which SingletonMixin rejects.`
        );
      }
      const idFields = MixinApi.getAllGlobIdentityFields(ctor);
      if (idFields.length === 0) return;
      const persisted = new Set(MixinApi.getAllPersistentFields(ctor));
      for (const f of idFields) {
        if (!persisted.has(f)) {
          throw new Error(
            `${name}: globIdentityFields entry '${f}' is not in ` +
              `persistentFields. Glob-identity fields must round-trip ` +
              `through hydration.`
          );
        }
      }
    }

    public getQuantity(): number {
      return this.quantity;
    }

    public setQuantity(n: number): void {
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(
          `GlobbableMixin.setQuantity: quantity must be a positive integer (got ${n})`
        );
      }
      this.quantity = MqlSubscriptionApi.fireFieldChange(
        this,
        'quantity',
        this.quantity,
        n,
      );
    }

    public canMergeWith(other: Stuff): boolean {
      const self = this as unknown as Stuff & Globbable;
      if (other === (self as unknown as Stuff)) return false;
      if (!MixinApi.isGlobbable(other)) return false;
      if (other.getTemplatePath() === null) return false;
      if (self.getTemplatePath() !== other.getTemplatePath()) return false;
      if (hasAnyShadow(self) || hasAnyShadow(other)) return false;
      if (hasAnyAdornment(self) || hasAnyAdornment(other)) return false;

      // Union of both classes' globIdentityFields. Equal values required
      // for every field. Reads through the public getter pattern (per
      // the inter-stuff contract); falls through to property access for
      // fields that don't expose a getter (the typical case for
      // glob-identity scalars — bare persisted fields).
      const aFields = MixinApi.getAllGlobIdentityFields(
        self.constructor as AnyConstructor
      );
      const bFields = MixinApi.getAllGlobIdentityFields(
        other.constructor as AnyConstructor
      );
      const all = new Set([...aFields, ...bFields]);
      for (const f of all) {
        if (readGlobField(self, f) !== readGlobField(other, f)) return false;
      }
      return true;
    }

    public canSplit(n: number): boolean {
      if (!Number.isInteger(n) || n < 1) return false;
      if (n > this.getQuantity()) return false;
      const self = this as unknown as Stuff & Globbable;
      if (hasAnyShadow(self)) return false;
      if (hasAnyAdornment(self)) return false;
      return true;
    }

    public onSplit(_splitoff: Stuff): void {
      // No-op terminal so subclasses can super.onSplit().
    }

    public onMerged(_absorbed: Stuff): void {
      // No-op terminal so subclasses can super.onMerged().
    }
  };
}

/**
 * "Any shadow attached?" — used by the canMerge / canSplit defaults.
 * A glob carrying a shadow has per-instance state that breaks
 * fungibility; conservative default disqualifies it.
 */
function hasAnyShadow(stuff: Stuff): boolean {
  const map = ShadowApi.getAllShadows(stuff);
  for (const arr of map.values()) {
    if (arr.length > 0) return true;
  }
  return false;
}

/**
 * "Any adornment attached to this stuff as an Adornable host?" —
 * fixtures attached to a coin (somehow) make it instance-distinct.
 * Globs typically don't compose Adornable; this guard catches the
 * unusual case.
 */
function hasAnyAdornment(stuff: Stuff): boolean {
  if (!MixinApi.isAdornable(stuff)) return false;
  return stuff.getFixtures().length > 0;
}

/**
 * Read a glob-identity field. Prefers `getX()` if present (per the
 * inter-stuff contract — methods are the surface), falls back to
 * direct property access. The fallback covers the common case of
 * bare-persisted scalars that don't have a custom getter on the
 * host (a `tarnished: boolean` field on Coin has no `getTarnished`
 * by default).
 */
function readGlobField(stuff: Stuff, name: string): unknown {
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  const getter = (stuff as unknown as Record<string, unknown>)[`get${cap}`];
  if (typeof getter === 'function') {
    return (getter as (...args: unknown[]) => unknown).call(stuff);
  }
  return (stuff as unknown as Record<string, unknown>)[name];
}
