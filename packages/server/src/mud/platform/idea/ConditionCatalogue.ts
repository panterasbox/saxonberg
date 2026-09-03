/**
 * ConditionCatalogue — the self-warming home of the authored condition
 * roster (the FermentProfileCatalogue shape; the boot()-retirement
 * direction: an operator-shaped warm does not belong on a consumer Api).
 *
 * `postRegister` stands up every authored `Condition` row as a live
 * singleton so the sync resolve-on-read seams hit from the first frame
 * of live play — the reference-Ideas-inert-at-boot rule.
 *
 * ⚠ **The gap this warm closes is the material gap, one subsystem
 * over** (see {@link MaterialCatalogue}). Condition seeds are inserted
 * as template ROWS and nothing cloned them into Ideas, so
 * `StuffApi.findByTemplatePath` answered `null` for **every** condition
 * in a running world. Authored behavior — signs, names, progression,
 * `toxinBehavior` — was read off an object that was not there. It
 * failed **silently**: the one hot reader,
 * `Metabolic.resolveToxinBehavior`, returns `null` and its caller does
 * `if (!behavior) continue`, and the toxin suites hand-construct their
 * own `Condition`, so CI was green over a dead subsystem.
 *
 * Warmed whole rather than lazily: the roster is small (~15),
 * reference-data, and read from sync seams that cannot await —
 * including scheduled metabolism ticks, which run behind no validator.
 * Ordered after {@link MaterialCatalogue} on the boot manifest: a
 * condition's signs can name tissue materials.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import { TemplatePathPrefixes } from '../../lib/paths';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

/** The backing class every authored `Condition` row names. */
const CONDITION_CLASS = '/platform/idea/Condition';

const ConditionCatalogueBase = PostRegistrationMixin(Idea);

export default class ConditionCatalogue extends ConditionCatalogueBase {
  /** Residency veto — the roster's warm; a culled catalogue re-warms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'ConditionCatalogue is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * Stand up every authored Condition row as a live singleton. Public
   * so a pack go-live can re-warm (idempotent — `singleton` no-ops rows
   * already live). Returns the count stood.
   */
  public async warm(): Promise<number> {
    const templates = await Template.findDescendants(
      TemplatePathPrefixes.condition,
    );
    let stood = 0;
    for (const tpl of templates) {
      // Leaf rows only — a folder row under the tree belongs to the
      // zone substrate, not to us (the MaterialCatalogue filter).
      if (tpl.class !== CONDITION_CLASS) continue;
      try {
        await StuffApi.singleton(tpl.path);
        stood++;
      } catch (err) {
        console.warn(
          `ConditionCatalogue: '${tpl.path}' failed to stand up:`,
          err,
        );
      }
    }
    console.info(`ConditionCatalogue: ${stood} condition singleton(s) live`);
    return stood;
  }
}
