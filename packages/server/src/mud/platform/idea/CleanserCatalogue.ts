/**
 * CleanserCatalogue — the singleton that serves the `cleanser` documents
 * (what you wash WITH: `soap`, `lye`, `/trade/potash/cleansers/potash`, any
 * pack's `content/cleansers/`), reached as `MaterialApi.cleansers()`. What a
 * cleanser IS: `lib/cleanliness/Cleanser.ts`.
 *
 * ⭐ A cleanser is named by the MATERIAL that is one (cleanliness B50):
 * `Material.setCleanser(path)` returns {@link ensure}, so the document is
 * resident whenever the material is, and the wash reads it with `need`.
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import {
  CLEANSER_ACTIONS,
  DAMAGE_EFFECTS,
  type CleanserAction,
  type CleanserDamage,
  type CleanserDescriptor,
} from '../../lib/cleanliness/Cleanser';

export default class CleanserCatalogue extends DocumentCatalogue<CleanserDescriptor> {
  /** A reference catalogue everyone reads — `wash` inside a circle (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'cleanser';

  /** Validate a cleanser document at `path` (the installer's validator too); throws naming what is wrong. */
  public parse(data: Record<string, unknown>, path: string): CleanserDescriptor {
    const why = (r: string): never => {
      throw new Error(`cleanser '${path}': ${r}`);
    };
    const agent = typeof data.agent === 'string' ? data.agent : '';
    if (!agent) why('no agent');
    const action = String(data.action ?? '');
    if (!(CLEANSER_ACTIONS as readonly string[]).includes(action)) {
      why(`action '${action}' is not one of ${CLEANSER_ACTIONS.join('|')}`);
    }
    const damages: CleanserDamage[] = [];
    for (const r of Array.isArray(data.damages) ? (data.damages as Array<Partial<CleanserDamage>>) : []) {
      if (!r || typeof r.fibreTag !== 'string' || !r.fibreTag) why('a damage names no fibreTag');
      if (!(DAMAGE_EFFECTS as readonly string[]).includes(String(r.effect))) {
        why(`damage effect '${String(r.effect)}' is not one of ${DAMAGE_EFFECTS.join('|')}`);
      }
      damages.push({
        fibreTag: r.fibreTag as string,
        effect: r.effect as CleanserDamage['effect'],
        aboveK: typeof r.aboveK === 'number' ? r.aboveK : null,
      });
    }
    const num = (v: unknown, fallback: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? v : fallback;
    return {
      key: path.slice(path.lastIndexOf('/') + 1),
      agent,
      action: action as CleanserAction,
      damages,
      hardWaterPenalty: data.hardWaterPenalty === true,
      softens: data.softens === true,
      consumesPerWash: Math.max(0, num(data.consumesPerWash, 0)),
      skinHarshness: Math.max(0, Math.min(1, num(data.skinHarshness, 0))),
      ambient: data.ambient === true,
    };
  }
}
