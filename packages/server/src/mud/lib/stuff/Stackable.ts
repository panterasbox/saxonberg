/**
 * StackableMixin — fungible-stack substrate.
 *
 * A `Stackable` Stuff carries an integer `quantity` and is treated by
 * the framework as if it were `quantity` separate instances at the
 * contract surface (`drop 5 coins`, "30 coins are here"), while
 * storing only one row. Operational reference:
 * `docs/subsystems/stacks.md`. The bulk-form extension story lives in
 * `docs/slates/tails/bulkable-slate.md`.
 *
 * Three guarantees:
 *
 *   1. **One Stuff, N units.** A stack of 30 coins is one Stuff with
 *      `quantity: 30`, not 30 sibling Stuffs. Split on transfer when
 *      taking fewer than the whole; merge on arrival when a mergeable
 *      sibling already lives in the destination.
 *   2. **Quantity is part of identity.** Stacks render with their count
 *      (`30 coins`); ordinal MQL (`coin:[2]`) does NOT index into a
 *      stack's units.
 *   3. **Non-globs are unaffected.** A non-Stackable rose still
 *      resolves exactly as it does today.
 *
 * The mixin's surface is methods only (per the inter-stuff contract);
 * the persistent `quantity` field is reflected into by the Hydrator.
 *
 * Composition constraints (G6):
 *   - `Stackable ⊥ Container` — stacks aren't containers. A subclass
 *     that composes both throws at first registration via the
 *     `__validateComposition__` hook on `MixinApi.assertComposable`.
 *   - `stackIdentityFields ⊂ persistentFields` — stack-identity fields
 *     must round-trip through hydration; runtime-only fields would
 *     diverge after a reload. Enforced in the same hook.
 *
 * Stack identity via `stackIdentityFields`:
 *   Two stacks merge iff (a) same template path, (b) neither side has
 *   shadows or adornments, (c) equal values for every field in the
 *   union of both classes' `static stackIdentityFields`. Subclasses
 *   extend the parent's list:
 *     `static stackIdentityFields = [...Coin.stackIdentityFields, 'mintMark']`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from './Stuff';
import type { AnyConstructor } from '../../api/mixin';
import { Mixins } from '../mixin';
import { MixinApi } from '../../api/mixin';
import { ShadowApi } from '../../api/shadow';
import { StuffApi } from '../../api/stuff';
import { Final, Unshadowable } from '../security/decorators';
// eslint-disable-next-line no-restricted-imports -- the F1 object face: a stack's split()/absorb() forward into the stack logic singleton exactly as the api/glob facade does (the Combustible/Energized precedent)
import { StackableLogic } from '../../platform/idea/api/StackableLogic';
import { Appearance } from '../identification/Appearance';
import {
  MqlSubscriptionApi,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';

/** Public shape added by StackableMixin. */
export interface Stackable {
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
   * adornments on either side, every stack-identity field equal. A
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
   * Witness on the source after `split` produces a new Stuff. No-op
   * terminal so subclasses can `super.onSplit(splitoff)`.
   */
  onSplit(splitoff: Stuff): void;

  // The stack face (F1) — forwards into StackableLogic.
  /** Split `n` units off into a new Stuff (whole-stack returns this). */
  split(n: number): Promise<Stuff & Stackable>;
  /** Fold `absorbed` into this stack; destructs the absorbed Stuff. */
  absorb(absorbed: Stuff & Stackable): void;

  /**
   * Witness on the surviving stack after `StackableApi.merge` absorbs
   * another. No-op terminal so subclasses can
   * `super.onMerged(absorbed)`.
   */
  onMerged(absorbed: Stuff): void;
}

export function StackableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  class StackableMixin extends Base {
    static _mixinName = 'StackableMixin';

    /**
     * Stack size. Persisted by name; default 1. Template authoring
     * sets the initial value in YAML `data:` and the Hydrator reflects
     * it in here.
     */
    public quantity: number = 1;

    /**
     * Subset of `persistentFields` that defines stack identity. Two
     * stacks of the same templatePath merge iff every field listed
     * here has equal values on both sides.
     *
     * Default `[]` means strict template-fungibility — every instance
     * of the host class merges with every other (modulo shadows /
     * adornments).
     */
    static fieldMeta: FieldMeta = {
      quantity: { persistent: true, authorable: true },
    };

    /**
     * Live-query subscribable field. `dependsOnFields` defaults to
     * `['quantity']` (descriptor name = source field name), so
     * `FieldChangedEvent { field: 'quantity' }` from `setQuantity`
     * triggers re-projection automatically.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'quantity',
        read: (stuff) => (stuff as unknown as Stackable).getQuantity(),
      },
    ];

    /**
     * One-time composition check, run by `MixinApi.assertComposable`
     * the first time a concrete class is registered.
     *
     * Enforces:
     *   - `Stackable ⊥ Container` — stacks aren't containers.
     *   - `Stackable ⊥ Singleton` — singletons are one-instance-per-
     *     templatePath; splitting would need a second instance at
     *     the same path and `StuffApi.clone` would refuse it.
     *   - `stackIdentityFields ⊂ persistentFields` — identity fields
     *     must survive save/load.
     */
    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      if (MixinApi.hasMixin(ctor, Mixins.Container)) {
        throw new Error(
          `${name} composes StackableMixin and ContainerMixin; ` +
            `stacks cannot be containers.`
        );
      }
      if (MixinApi.hasMixin(ctor, Mixins.Singleton)) {
        throw new Error(
          `${name} composes StackableMixin and SingletonMixin; ` +
            `stacks split into siblings at the same templatePath, ` +
            `which SingletonMixin rejects.`
        );
      }
      const idFields = MixinApi.getAllStackIdentityFields(ctor);
      if (idFields.length === 0) return;
      const persisted = new Set(MixinApi.getAllPersistentFields(ctor));
      for (const f of idFields) {
        if (!persisted.has(f)) {
          throw new Error(
            `${name}: stackIdentityFields entry '${f}' is not in ` +
              `persistentFields. Stack-identity fields must round-trip ` +
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
          `StackableMixin.setQuantity: quantity must be a positive integer (got ${n})`
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
      const self = this as unknown as Stuff & Stackable;
      if (other === (self as unknown as Stuff)) return false;
      if (!MixinApi.isStackable(other)) return false;
      if (other.getTemplatePath() === null) return false;
      if (self.getTemplatePath() !== other.getTemplatePath()) return false;
      if (hasAnyShadow(self) || hasAnyShadow(other)) return false;
      if (hasAnyAdornment(self) || hasAnyAdornment(other)) return false;
      /*
       * ⭐⭐ A TITLED lot does not merge.
       *
       * The chattel rule is "a stack cannot bear title; a lot of one
       * can" — which is only safe while merging cannot equate two
       * identities. That is this line. A one-unit stack somebody has
       * put up for sale is a THING with an owner in the registry;
       * folding it into another stack would silently destroy a title.
       *
       * ⚠ Reads the id, not the mixin: an untitled stack merges exactly
       * as it always did, so nothing about ordinary fungible goods
       * changes.
       */
      if (titled(self) || titled(other)) return false;

      // Union of both classes' stackIdentityFields. Equal values required
      // for every field. Reads through the public getter pattern (per
      // the inter-stuff contract); falls through to property access for
      // fields that don't expose a getter (the typical case for
      // stack-identity scalars — bare persisted fields).
      const aFields = MixinApi.getAllStackIdentityFields(
        self.constructor as AnyConstructor
      );
      const bFields = MixinApi.getAllStackIdentityFields(
        other.constructor as AnyConstructor
      );
      const all = new Set([...aFields, ...bFields]);
      for (const f of all) {
        if (readStackField(self, f) !== readStackField(other, f)) return false;
      }

      // ── The identification vetoes (magic-items D27/D28) ──
      //
      // These live HERE rather than in `stackIdentityFields` because
      // identity fields must be a subset of *persistent* fields (the
      // framework enforces it at registration), and neither of these
      // facts is a stored scalar: rendered appearance is DERIVED, and a
      // label's effect is a refusal rather than a difference.

      // A player LABELLED this one on purpose. Folding it into a stack
      // would throw away information they created.
      if (
        (MixinApi.isLabelled(self) && self.isLabelled()) ||
        (MixinApi.isLabelled(other) && other.isLabelled())
      ) {
        return false;
      }

      // Two items of the same class at different points in a transition
      // window LOOK different, and things that look different must not
      // silently become one pile. The window is self-healing: once a
      // stack passes its flip point the merge-on-arrival ripple folds it
      // into the already-flipped stack on next contact.
      if (MixinApi.isIdentifiable(self) && MixinApi.isIdentifiable(other)) {
        const gen = Appearance.currentGeneration();
        if (
          self.renderAppearance(gen.generation, gen.progress) !==
          other.renderAppearance(gen.generation, gen.progress)
        ) {
          return false;
        }
      }
      return true;
    }

    public canSplit(n: number): boolean {
      if (!Number.isInteger(n) || n < 1) return false;
      if (n > this.getQuantity()) return false;
      const self = this as unknown as Stuff & Stackable;
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

    // ------- the stack face (F1) — forwards into StackableLogic -------

    /**
     * Split `n` units off this stack into a new Stuff (whole-stack
     * short circuit returns this). Runs `canSplit`; `placeDirect`s the
     * splitoff (silent on movement — subdividing matter already there).
     * Sealed — the split/absorb pair owns quantity conservation; the
     * `canSplit`/`canMergeWith` veto seams stay the extension points.
     */
    @Final
    @Unshadowable
    public async split(n: number): Promise<Stuff & Stackable> {
      return stackLogic().split(this as unknown as Stuff & Stackable, n);
    }

    /**
     * Fold `absorbed` into this stack (the survivor): increments this
     * quantity, destructs the absorbed Stuff, fires `onMerged`. Emits
     * no movement events. Sealed with `split` — one conservation pair.
     */
    @Final
    @Unshadowable
    public absorb(absorbed: Stuff & Stackable): void {
      stackLogic().merge(this as unknown as Stuff & Stackable, absorbed);
    }
  }

  return StackableMixin;
}

/** Resolve the HMR-able StackableLogic singleton (the stack mechanics). */
function stackLogic(): StackableLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/stackable',
    () => new StackableLogic(),
  );
}

/** Does this good carry a chattel id — i.e. has somebody titled it? */
function titled(stuff: Stuff): boolean {
  const asChattel = stuff as unknown as { getChattelId?(): string };
  // ⚠ `?? ''` — a DESTROYED Stuff's inert surface returns undefined from
  // every no-op'd method, and a merge check can legitimately run against
  // one that a caller still holds a strong ref to.
  return typeof asChattel.getChattelId === 'function'
    ? (asChattel.getChattelId() ?? '').length > 0
    : false;
}

/**
 * "Any shadow attached?" — used by the canMerge / canSplit defaults.
 * A stack carrying a shadow has per-instance state that breaks
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
 * Stacks typically don't compose Adornable; this guard catches the
 * unusual case.
 */
function hasAnyAdornment(stuff: Stuff): boolean {
  if (!MixinApi.isAdornable(stuff)) return false;
  return stuff.getFixtures().length > 0;
}

/**
 * Read a stack-identity field. Prefers `getX()` if present (per the
 * inter-stuff contract — methods are the surface), falls back to
 * direct property access. The fallback covers the common case of
 * bare-persisted scalars that don't have a custom getter on the
 * host (a `tarnished: boolean` field on Coin has no `getTarnished`
 * by default).
 */
function readStackField(stuff: Stuff, name: string): unknown {
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  const getter = (stuff as unknown as Record<string, unknown>)[`get${cap}`];
  if (typeof getter === 'function') {
    return (getter as (...args: unknown[]) => unknown).call(stuff);
  }
  return (stuff as unknown as Record<string, unknown>)[name];
}
