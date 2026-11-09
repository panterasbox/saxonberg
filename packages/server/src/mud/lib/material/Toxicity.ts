/**
 * ToxicityMixin — *it POISONS.*
 *
 * The toxins it carries. Its own capability: a third of the toxic rows are
 * not food.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasToxicity(m)` and never on a material's kind.
 */

import type { ToxinTag } from '../metabolism/Metabolic';
import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/** What a face gives its contents (ceramics M7). */
export interface LeachSpec {
  /** The toxin type, as metabolism names it (`lead` — the Condition row's `toxinType`, not its name). */
  toxin: string;
  /**
   * mg per litre per game-day against VINEGAR (pH 2.4, the acid a lead-
   * release test uses); other contents scale by their acid attack
   * (`Material.acidAttack`, from their pH).
   */
  mgPerLPerDay: number;
}

export interface Toxicity {
  getLeaches(): readonly LeachSpec[];
  setLeaches(value: LeachSpec[] | null): void;
  getToxicity(): readonly ToxinTag[];
  setToxicity(value: ToxinTag[]): void;
}

export function ToxicityMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ToxicityMixin extends Base implements Toxicity {
    static _mixinName = 'ToxicityMixin';

    static fieldMeta: FieldMeta = {
      toxicity: { persistent: true, spoiler: 1, spoilerName: 0 },
      // ⭐⭐ What a face of this gives the contents it holds, per litre per
      // day against vinegar, scaled by their acid attack. `spoiler: 1` — the
      // lead in a glaze is the thing nobody tells you.
      leaches: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    };

    /**
     * Per-consumable toxin doses — `{type, amount}[]`. `type` is the toxin
     * (and its `Condition` key, e.g. `'alcohol'`); `amount` is the dose
     * per serving (see {@link servingKg}; mg for solids / derived for
     * liquids). The per-body rate
     * params (absorption, clearance, potency, severity bands) live on the
     * toxin's `Condition` seed, NOT here — the same amount-vs-rate split as
     * nutrients. A list of flat objects → default-applier round-trip (the
     * `composition` precedent), no marshaller.
     */
    protected toxicity: ToxinTag[] = [];

    public getToxicity(): readonly ToxinTag[] { return this.toxicity; }
    public setToxicity(value: ToxinTag[]): void {
      if (!Array.isArray(value)) {
        throw new TypeError('Material.setToxicity: expected a ToxinTag[]');
      }
      for (const entry of value) {
        if (
          entry === null ||
          typeof entry !== 'object' ||
          typeof entry.type !== 'string' ||
          typeof entry.amount !== 'number' ||
          !Number.isFinite(entry.amount) ||
          entry.amount < 0
        ) {
          throw new TypeError(
            'Material.setToxicity: each entry must be ' +
              '{ type: string, amount: finite number >= 0 }',
          );
        }
        if (
          entry.labileAtK !== undefined &&
          (typeof entry.labileAtK !== 'number' ||
            !Number.isFinite(entry.labileAtK) ||
            entry.labileAtK <= 0)
        ) {
          throw new TypeError(
            "Material.setToxicity: 'labileAtK' must be a finite temperature " +
              'in kelvin above zero when present',
          );
        }
      }
      // ⚠ The rebuild is per-FIELD, not a spread, so an unknown key on an
      // authored row can never sneak in — which means a new `ToxinTag` field
      // must be added HERE too or it is silently dropped at the setter. That
      // is exactly what happened to `labileAtK` on its first run: the
      // applier and every caller went through this line, so a cooked bean
      // kept its lectin and nothing anywhere said why.
      this.toxicity = value.map((e) => ({
        type: e.type,
        amount: e.amount,
        ...(e.labileAtK !== undefined ? { labileAtK: e.labileAtK } : {}),
      }));
    }

    /**
     * ⭐⭐ What a face of this material gives the contents it holds: a toxin,
     * at `mgPerLPerDay` × the contents' `acidAttack()` × days (ceramics M7).
     * Lead glaze leaches lead; ash glaze nothing.
     */
    protected leaches: LeachSpec[] = [];
    public getLeaches(): readonly LeachSpec[] {
      return this.leaches;
    }
    public setLeaches(value: LeachSpec[] | null): void {
      this.leaches = (Array.isArray(value) ? value : []).filter(
        (l) => l && typeof l.toxin === 'string' && l.toxin !== '' && l.mgPerLPerDay > 0,
      );
    }
  };
}
