/**
 * StatuteReading — the shared body of a reading taken against a POLITY's
 * declared measure (review R2-D9): a cask's capacity against the tun, a
 * brick's size against the statute brick. Both were the same rule written
 * twice.
 *
 * Three facts, one copy each:
 *
 *   - **the standard** is the innermost polity over the reader's place that
 *     declares it (its `standards:` rows), else the realm default the
 *     reading supplies;
 *   - **off standard** is a measure more than 5 % from it, said in words;
 *   - **of record** is the reader holding the `gauger` seat of the innermost
 *     polity that seats one — the one whose measure counts here.
 *
 * ⭐⭐⭐ Competence resolves DETAIL and never ACCESS (instrumentation.md),
 * and an office is no different: anyone with the rule reads the figure;
 * the seat adds standing, never the number.
 *
 * ⚠ Substrate, never instanced: each concrete reading is a pack's row.
 */

import Reading from './Reading';
import { MixinApi } from '../../api/mixin';
import { GovernmentApi, type GovernmentDescriptor } from '../../api/government';
import type { Stuff } from '../stuff/Stuff';

/** One declared standard, in a unit, and whose it is. */
export interface StatuteStandard {
  /** The declared values by key (`cask` → 25, or `brick-length` → 9 …). */
  values: Record<string, number>;
  /** The unit every value is declared in. */
  unit: string;
  /** Whose statute — a polity's name, or `the realm`. */
  where: string;
}

/** Where a statute reading stands: the polities over it, and who gauges. */
export interface StatuteJurisdiction {
  /** The polities over the reader's place, innermost first. */
  chain: readonly GovernmentDescriptor[];
  /** The innermost polity that seats a gauger, or `null`. */
  gauging: GovernmentDescriptor | null;
  /** Does the reader hold that polity's gauger seat? */
  ofRecord: boolean;
}

/** The seat key a polity names its gauger by. */
const GAUGER_SEAT = 'gauger';
/** How far from the standard a measure may be before it is off it. */
const OFF_STANDARD_FRACTION = 0.05;

export default abstract class StatuteReading extends Reading {
  /** The polities over `actor`'s place, who gauges there, and whether `actor` does. */
  protected async jurisdictionOf(actor: Stuff): Promise<StatuteJurisdiction> {
    const place = this.placeOf(actor);
    const chain = place && MixinApi.isContainer(place) ? await GovernmentApi.subjectTo(place) : [];
    const gauging = chain.find((g) => g.seats.some((s) => s.key === GAUGER_SEAT)) ?? null;
    const ofRecord = gauging !== null && (await GovernmentApi.holdsSeat(actor, gauging.key, GAUGER_SEAT));
    return { chain, gauging, ofRecord };
  }

  /**
   * The innermost polity's declared standard: the first that declares
   * EVERY one of `keys` in one unit (out of `units`, when given), else
   * `null` (the reading falls back to its realm default).
   */
  protected declaredStandard(
    chain: readonly GovernmentDescriptor[],
    keys: readonly string[],
    units?: readonly string[],
  ): StatuteStandard | null {
    for (const gov of chain) {
      const rows = keys.map((k) => gov.standards.find((s) => s.key === k));
      if (rows.some((r) => r === undefined)) continue;
      const unit = rows[0]!.unit;
      if (rows.some((r) => r!.unit !== unit)) continue;
      if (units !== undefined && !units.includes(unit)) continue;
      const values: Record<string, number> = {};
      keys.forEach((k, i) => (values[k] = rows[i]!.value));
      return { values, unit, where: gov.name };
    }
    return null;
  }

  /** ⭐ True, over, or short of the standard — the ONE 5 % line. */
  protected standing(measured: number, standard: number): 'true' | 'over' | 'short' {
    const off = standard > 0 ? measured / standard - 1 : 0;
    if (Math.abs(off) <= OFF_STANDARD_FRACTION) return 'true';
    return off > 0 ? 'over' : 'short';
  }
}
