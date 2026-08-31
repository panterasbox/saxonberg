/**
 * PlantableMixin — a thing that can be put in the ground and will grow
 * into something.
 *
 * The capability the `plant` verb actually needs. It was previously the
 * `Seed` **class**: `PlantController` refused with `seed instanceof
 * Seed`, which pinned planting to one content class and read against
 * the project's own grain — `instanceof` is for the top-level types
 * (`Agent` / `Location` / `Item`) and a few special subclasses, not for
 * ordinary content.
 *
 * ⭐ **What it confers is the answer, not the noun.** `growsIntoPath`
 * names the `/trade/farming/thing/plant/…` template this thing mints when planted. A
 * seed has one. So does a cutting, a tuber, a bulb, a runner — and none
 * of those should have to `extend Seed` to be plantable, inheriting a
 * class whose doc commits to "bought at a store, discrete, never a
 * stack". Composing this instead is what keeps the farming vocabulary
 * from becoming a class hierarchy.
 *
 * ⚠ The field keeps its name. `growsIntoPath` moved from `Seed` to
 * here, and the `Hydrator` reflects into persistent fields **by name**,
 * so existing `Seed` rows hydrate unchanged.
 *
 * ⚠ This says nothing about whether the thing is *ready* to plant, or
 * whether its named template resolves. Those are state, and state
 * refusals stay in the controller: a seed naming a missing plant is
 * misconfigured content, not a different kind of thing, and a menu must
 * not freeze that distinction into a greyed-out row. See
 * `docs/slates/builds/affordance-suggestion-slate.md` § 3 on the
 * kind / relation / state axes.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';

/** Public method surface — methods only, per the inter-stuff contract. */
export interface Plantable {
  /** The `/trade/farming/thing/plant/…` template this mints when planted, or null. */
  getGrowsIntoPath(): string | null;
  setGrowsIntoPath(value: string | null): void;
}

export function PlantableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PlantableMixin extends Base implements Plantable {
    static _mixinName = 'PlantableMixin';

    static fieldMeta: FieldMeta = {
      growsIntoPath: {
        persistent: true,
        authorable: true,
        authorPicker: 'Template',
      },
    };

    /**
     * The `/trade/farming/thing/plant/…` template this mints when planted.
     *
     * Public because the `Hydrator` reflects into persistent fields by
     * name; other Stuff use the method surface.
     */
    public growsIntoPath: string | null = null;

    public getGrowsIntoPath(): string | null {
      return this.growsIntoPath;
    }

    public setGrowsIntoPath(value: string | null): void {
      this.growsIntoPath = value;
    }
  };
}
