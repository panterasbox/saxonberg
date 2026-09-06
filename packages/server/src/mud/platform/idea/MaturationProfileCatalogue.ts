/**
 * MaturationProfileCatalogue — the self-warming home of the ferment
 * profile roster (the Discipline/Recipe catalogue shape, and the
 * boot()-retirement direction: an operator-shaped warm does not belong
 * on a consumer Api).
 *
 * `postRegister` stands up every authored {@link MaturationProfile} row as
 * a live singleton so the SYNC reads (`MaturationProfile.forMaterial` /
 * `.byKey`, driven from `MaturingMixin.reconcileFerment`) hit from
 * the first frame — the reference-Ideas-inert-at-boot rule. The roster
 * is every root's `idea/maturation/` subtree, filtered to rows whose
 * `class` extends `MaturationProfile` wherever it lives — never an
 * allowlist of roots. Eager loading rides the platform pack's `boot:`
 * manifest (role `sync-read`), NOT an AppBootstrap sequencer line.
 *
 * Holds NO state and keeps NO index — the queries live as statics on
 * `MaturationProfile` (a stateless glob over the live population, so
 * there is no cache to invalidate and HMR/go-live cannot leave a stale
 * roster). This singleton exists for exactly one reason: rows cannot
 * stand themselves up, and something template-backed must own the
 * warm.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import MaturationProfile from '../../lib/maturation/MaturationProfile';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const MaturationProfileCatalogueBase = PostRegistrationMixin(Idea);

export default class MaturationProfileCatalogue extends MaturationProfileCatalogueBase {
  /** Residency veto — the roster's warm; a culled catalogue re-warms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'MaturationProfileCatalogue is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * Stand up every authored profile row as a live singleton. Public so
   * a pack go-live can re-warm (idempotent — `singleton` no-ops rows
   * already live). Returns the count stood.
   */
  public async warm(): Promise<number> {
    const templates = await Template.findByPathInfix('/idea/maturation/');
    let stood = 0;
    const isProfile = new Map<string, boolean>();
    for (const tpl of templates) {
      if (!isProfile.has(tpl.class)) {
        isProfile.set(tpl.class, await isProfileClass(tpl.class));
      }
      if (!isProfile.get(tpl.class)) continue;
      try {
        await StuffApi.singleton(tpl.path);
        stood++;
      } catch (err) {
        console.warn(
          `MaturationProfileCatalogue: '${tpl.path}' failed to stand up:`,
          err,
        );
      }
    }
    console.info(`MaturationProfileCatalogue: ${stood} maturation profile(s) live`);
    return stood;
  }
}

/** Does `classPath` resolve to a class extending `MaturationProfile`? */
async function isProfileClass(classPath: string): Promise<boolean> {
  try {
    const cls = (await StuffApi.loadClassByPath(classPath)) as {
      prototype?: unknown;
    };
    return typeof cls === 'function' && cls.prototype instanceof MaturationProfile;
  } catch {
    return false;
  }
}
