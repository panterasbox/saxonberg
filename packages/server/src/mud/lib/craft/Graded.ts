/**
 * GradedMixin — a host that carries an ordinal quality {@link Grade}.
 *
 * The grade is the **first quality band** crafting works in: a stocked input
 * (a working spirit bottle) carries one, so the choice flows through to a
 * craft's output (`with <brand>` substitution → a better or worse result).
 *
 * **Persistence vs contract.** The durable shape is the band *word*
 * (`gradeBand: string`, stable + human-readable in seeds), reached by the
 * persist accessor pair `getGradeBand`/`setGradeBand` — what the Hydrator
 * dispatches `set<Field>` into. The **inter-Stuff contract** is the
 * value-object surface `getGrade(): Grade` / `setGrade(Grade)` — other Stuff
 * read quality as a `Grade`, never the raw string.
 *
 * {@link CraftedMixin} composes this so every crafted output is graded by the
 * same surface as every graded input.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Grade } from './Grade';

export interface Graded {
  /** The persisted band word (e.g. `'fine'`). Host/persist surface. */
  getGradeBand(): string;
  setGradeBand(value: string): void;
  /** The quality grade as a value-object. The inter-Stuff contract. */
  getGrade(): Grade;
  setGrade(value: Grade): void;
}

export function GradedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class GradedMixin extends Base implements Graded {
    static _mixinName = 'GradedMixin';

    static fieldMeta: FieldMeta = {
      gradeBand: { persistent: true, authorable: true },
    };

    /**
     * The band word; default `'fair'` (a neutral middle).
     */
    public gradeBand: string = 'fair';

    getGradeBand(): string {
      return this.gradeBand;
    }

    setGradeBand(value: string): void {
      if (!Grade.isBand(value)) {
        throw new RangeError(
          `GradedMixin.setGradeBand: unknown grade band '${value}'`,
        );
      }
      this.gradeBand = value;
    }

    getGrade(): Grade {
      return Grade.of(this.gradeBand);
    }

    setGrade(value: Grade): void {
      this.gradeBand = value.getBand();
    }
  };
}
