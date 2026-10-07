/**
 * SingletonMixin — class-level marker enforcing one-instance-per-templatePath.
 *
 * Composing this mixin declares: "every templatePath that resolves to this
 * class produces at most one live instance at a time." Enforcement fires in
 * `StuffApi.clone()` as a pre-flight check: if a live instance already exists
 * for the requested templatePath and the resolved class composes
 * `SingletonMixin`, the second clone throws before construction starts.
 *
 * Independent of `StuffApi.singleton(path)`. The Api method is the
 * cache-or-clone tool (works on any class); this mixin is the safety net
 * that prevents direct `clone()` from producing duplicates for classes that
 * shouldn't have any.
 *
 * Use cases:
 *   - Zones (each zone template is a unique world entity).
 *   - Content-author leaves that should be unique-by-path (e.g., a singleton
 *     `TownSquare extends CartesianLocation`).
 *
 * No fields and no `persistentFields`. The `_mixinName` is what
 * `MixinApi.hasMixin` matches against. It carries exactly one method,
 * {@link Singleton.getDurableHandle}, which states the mixin's own
 * claim as a string — see below.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from './Stuff';

export interface Singleton {
  /**
   * The singleton rung of the durable-handle contract
   * ({@link Stuff.getDurableHandle}): **the one instance IS the row**,
   * so the row path is a durable name for it.
   *
   * True of every Singleton by definition — the mixin exists to say so
   * — which is why the rung belongs here rather than in a ladder that
   * narrows on mixins from somewhere else. It only ever fills in a
   * `null`: a Singleton that also carries a minted identity or an
   * explicit key keeps the answer the rung above it gave.
   *
   * ⭐ This is the regression guard for every `DISCOVERY` belief already
   * written against a singleton place — the bar's secret door keeps its
   * byte-identical `<row>#exit:<dir>` key.
   */
  getDurableHandle(): string | null;
}

export function SingletonMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SingletonMixin extends Base implements Singleton {
    static _mixinName = 'SingletonMixin';

    getDurableHandle(): string | null {
      // ⚠ The `as unknown as Stuff` casts are this file's price for
      // `TBase extends MixinConstructor` (instance type `object`).
      // Tightening the constraint to `MixinConstructor<Stuff>` is the
      // obvious-looking fix and it is wrong: `SingletonMixin` is
      // composed ON TOP of other mixins whose instance type is not yet
      // a full `Stuff` (`lib/npc/Cast.ts` composes it over
      // `NamedMixin(...)`), so the constraint breaks every composition
      // site rather than the mixin. The house idiom for mixin bodies
      // that need Stuff surface is the cast.
      const self = this as unknown as Stuff;
      const base = (
        super.getDurableHandle as unknown as
          | (() => string | null)
          | undefined
      )?.call(self);
      return base ?? self.getTemplatePath();
    }
  };
}
