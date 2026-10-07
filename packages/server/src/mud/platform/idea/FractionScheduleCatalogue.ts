/**
 * FractionScheduleCatalogue — the self-warming home of the fraction
 * schedule roster (the `MaturationProfileCatalogue` shape, verbatim, and
 * for the same reason).
 *
 * `onCreate` stands up every authored {@link FractionSchedule} row as a
 * live singleton so the SYNC reads (`FractionSchedule.forMaterial` /
 * `.byKey`, driven from `FractionatingMixin.reconcileRun`) hit from the
 * first frame — ⚠ **the reference-Ideas-inert-at-boot rule, which this
 * repo has now broken three separate times.** A schedule row nothing
 * warms matches nothing, so a charged still would simply never start a
 * run, with no error anywhere.
 *
 * The roster is every root's `idea/fractionation/` subtree, filtered to
 * rows whose `class` extends `FractionSchedule` wherever it lives —
 * never an allowlist of roots, which is what lets a trade pack ship a
 * schedule. Eager loading rides the platform pack's `boot:` manifest
 * (role `sync-read`).
 *
 * Holds NO state and keeps NO index — the queries are statics on
 * `FractionSchedule` over the live population, so there is no cache to
 * invalidate and HMR cannot leave a stale roster.
 */

import { Idea } from '../../lib/stuff/Idea';
import FractionSchedule from '../../lib/fractionation/FractionSchedule';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const FractionScheduleCatalogueBase = Idea;

export default class FractionScheduleCatalogue extends FractionScheduleCatalogueBase {
  /** Residency veto — the roster's warm; a culled catalogue re-warms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'FractionScheduleCatalogue is a system singleton; never destructed',
    };
  }

  public override async onCreate(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * Stand up every authored schedule row as a live singleton. Public so
   * a pack go-live can re-warm (idempotent — `singleton` no-ops rows
   * already live). Returns the count stood.
   */
  public async warm(): Promise<number> {
    const templates = await Template.findByPathInfix('/idea/fractionation/');
    let stood = 0;
    const isSchedule = new Map<string, boolean>();
    for (const tpl of templates) {
      if (!isSchedule.has(tpl.class)) {
        isSchedule.set(tpl.class, await isScheduleClass(tpl.class));
      }
      if (!isSchedule.get(tpl.class)) continue;
      try {
        await StuffApi.singleton(tpl.path);
        stood++;
      } catch (err) {
        console.warn(
          `FractionScheduleCatalogue: '${tpl.path}' failed to stand up:`,
          err,
        );
      }
    }
    console.info(
      `FractionScheduleCatalogue: ${stood} fraction schedule(s) live`,
    );
    return stood;
  }
}

/** Does `classPath` resolve to a class extending `FractionSchedule`? */
async function isScheduleClass(classPath: string): Promise<boolean> {
  try {
    const cls = (await StuffApi.loadClassByPath(classPath)) as {
      prototype?: unknown;
    };
    return (
      typeof cls === 'function' && cls.prototype instanceof FractionSchedule
    );
  } catch {
    return false;
  }
}
