/**
 * FractionScheduleCatalogue — the singleton that serves the
 * `fraction-schedule` documents (how a still's run divides into cuts, how
 * crude divides into fractions; any pack's `content/fraction-schedules/`),
 * reached as `BulkableApi.fractionSchedules()`. What a schedule IS:
 * `lib/fractionation/FractionSchedule.ts`.
 *
 * ⭐ A still matches a schedule by its charge's TAG inside a SYNC
 * reconcile, so a `FractionatingMixin` host loads the whole kind once per
 * process in `onCreate` ({@link ensureAll}); a schedule's product, residue
 * and fraction materials load with it. Nothing boots it.
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import FractionSchedule from '../../lib/fractionation/FractionSchedule';
import type Material from '../../lib/material/Material';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';

export default class FractionScheduleCatalogue extends DocumentCatalogue<FractionSchedule> {
  /** A reference catalogue everyone reads — the still's `pour`/`cut` inside a circle (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'fraction-schedule';

  private everything: Promise<void> | null = null;

  /** Validate a schedule document at `path` (the installer's validator too); throws naming what is wrong. */
  public parse(data: Record<string, unknown>, path: string): FractionSchedule {
    const schedule = new FractionSchedule(path);
    try {
      schedule.applyData(data);
    } catch (err) {
      throw new Error(`fraction schedule '${path}': ${(err as Error).message}`);
    }
    return schedule;
  }

  /** A run's product, residue and every fraction's material load with the schedule. */
  protected override async afterRead(s: FractionSchedule): Promise<void> {
    const { MaterialApi } = await import('../../api/material');
    const paths = [s.getProductMaterial(), s.getResidueMaterial(), ...s.getFractions().map((f) => f.material ?? '')];
    for (const path of paths) if (path) await MaterialApi.materials().ensure(path);
  }

  /** ⭐ Every schedule, read once for the process — what a still awaits in `onCreate`. */
  public ensureAll(): Promise<void> {
    return (this.everything ??= (async () => {
      await this.all();
      for (const s of this.resident()) await this.afterRead(s);
    })().catch((err: unknown) => {
      this.everything = null;
      throw err;
    }));
  }

  /**
   * The schedule matching `material` — by the charge's TAGS against each
   * resident schedule's `inputCategory`. Two matches is an AUTHORING error,
   * warned and resolved deterministically (lowest key wins). `null` ⇒ the
   * host holds matter it cannot run (a still full of water).
   */
  public forMaterial(material: Material): FractionSchedule | null {
    const matches = this.resident()
      .sort((a, b) => a.getKey().localeCompare(b.getKey()))
      .filter((s) => {
        const category = s.getInputCategory();
        return category.length > 0 && material.hasTag(category);
      });
    if (matches.length > 1) {
      console.warn(
        `FractionScheduleCatalogue.forMaterial: material '${material.getTemplatePath()}' ` +
          `matches ${matches.length} schedules (${matches.map((s) => s.getKey()).join(', ')}) — ` +
          `authoring error; using '${matches[0]!.getKey()}'`,
      );
    }
    return matches[0] ?? null;
  }
}
