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
 * here, and the `TemplateApplier` reflects into persistent fields **by name**,
 * so existing `Seed` rows hydrate unchanged.
 *
 * ⚠ This says nothing about whether the thing is *ready* to plant, or
 * whether its named template resolves. Those are state, and state
 * refusals are the ground's (`plantPlanFor`, `sowPlanFor`): a seed naming a missing plant is
 * misconfigured content, not a different kind of thing, and a menu must
 * not freeze that distinction into a greyed-out row. See
 * `docs/slates/builds/affordance-suggestion-slate.md` § 3 on the
 * kind / relation / state axes.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Tooled } from '../craft/Tool';
import type { Growing } from './Growing';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { Quantity } from '../quantity';

/** The parcel's verdict on cultivating somewhere (`Soil.cultivationZoningAt`). */
export interface ZonedAgainst {
  /** The use, in words. */
  summary: string;
  /** The record's sentence. */
  detail: string;
}

/**
 * ⭐ Why a planting was refused (controllers-are-io D11) — a pot's reasons and
 * a sown ground's, one closed list because one verb words them.
 */
export type PlantReason =
  | 'no-ground'
  | 'land-use-forbids-cultivation'
  | 'not-held'
  | 'part-unnamed'
  | 'not-a-part-here'
  | 'other-crop-stands'
  | 'ground-refuses-sowing'
  | 'seed-names-no-plant'
  | 'not-broadcast'
  | 'too-little-seed'
  | 'part-sown'
  | 'ground-full'
  | 'no-soil'
  | 'slot-occupied'
  | 'pot-too-small'
  | 'walked-off';

/** A refused planting: the reason, and what its words need. */
export interface PlantRefusal {
  ok: false;
  reason: PlantReason;
  facts: {
    seed?: Stuff;
    /** The pot or bed. */
    target?: Stuff;
    part?: Stuff;
    standing?: Stuff;
    zoned?: ZonedAgainst;
    /** The ground's own sentence, when it refused. */
    line?: string;
  };
}

/** What a cast's begin words need. */
export interface PlantBegin {
  seed: Stuff;
  part: Stuff | null;
  drill: Stuff | null;
}

/** What came of a planting: one plant in a slot, or a cast over ground. */
export type PlantDone =
  | { kind: 'potted'; plant: Stuff; target: Stuff }
  | { kind: 'sown'; crop: Stuff; part: Stuff | null; phrase: string | null };

/** Public method surface — methods only, per the inter-stuff contract. */
export interface Plantable {
  /** The `/trade/farming/thing/plant/…` template this mints when planted, or null. */
  getGrowsIntoPath(): string | null;
  setGrowsIntoPath(value: string | null): void;
  /**
   * ⭐ kg of this per m² of `crop`: the crop's own broadcast rate, and a
   * drill's share of it when one lays the rows. 0: this is planted one at a
   * time, not broadcast.
   */
  sowingRateFor(crop: Stuff & Growing, drill: (Stuff & Tooled) | null): number;
  /** How much of this there is to spend, kg. */
  seedMassKg(): number;
  /** Spend `kg` of this: mass off, gone at nothing (the `mow` precedent). */
  spendSeed(kg: number): Promise<void>;
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
     * Public because the `TemplateApplier` reflects into persistent fields by
     * name; other Stuff use the method surface.
     */
    public growsIntoPath: string | null = null;

    public getGrowsIntoPath(): string | null {
      return this.growsIntoPath;
    }

    public setGrowsIntoPath(value: string | null): void {
      this.growsIntoPath = value;
    }

    /** See {@link Plantable.sowingRateFor}. */
    public sowingRateFor(crop: Stuff & Growing, drill: (Stuff & Tooled) | null): number {
      const broadcast = crop.getProfile()?.seedRateKgPerM2 ?? 0;
      // ⭐ A drill lays the same crop in rows on its own share of the seed.
      return broadcast * (drill ? drill.getSeedFactor() : 1);
    }

    /** See {@link Plantable.seedMassKg}. */
    public seedMassKg(): number {
      const self = this as unknown as Stuff;
      return MixinApi.isTangible(self) ? self.getMass().rawValue() : 0;
    }

    /** See {@link Plantable.spendSeed}. */
    public async spendSeed(kg: number): Promise<void> {
      const self = this as unknown as Stuff;
      const have = this.seedMassKg();
      const left = have - Math.min(have, kg);
      if (left < 0.01 || !MixinApi.isTangible(self)) {
        await StuffApi.destruct(self);
      } else {
        self.setMass(Quantity.of(Math.round(left * 1000) / 1000, 'kg'));
      }
    }
  };
}
