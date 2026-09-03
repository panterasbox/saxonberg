/**
 * DyestuffCatalogue — the self-warming home of the dyestuff roster.
 *
 * ⚠⚠ The **reference-Ideas-inert-at-boot** rule, which has bitten three
 * times: rows cannot stand themselves up, `dye` reads them
 * synchronously, and without a warm every read returns null forever and
 * the whole trade silently does nothing.
 *
 * `postRegister`, **never an operator `Api.boot()`** — an
 * operator-shaped warm does not belong on a consumer surface. Eager
 * loading rides this pack's own `boot:` manifest, which is what a pack
 * declares instead of asking the kernel to list it.
 *
 * The `FermentProfileCatalogue` / `FabricCatalogue` shape verbatim,
 * including the ⚠ `cls === Dyestuff` clause: those two filter on
 * `cls.prototype instanceof Base` alone and that works ONLY because
 * each has a `lib/` abstract base plus a thin concrete that rows name.
 * `Dyestuff` is one class rows name directly, and
 * `Dyestuff.prototype instanceof Dyestuff` is false.
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Dyestuff from './Dyestuff';

const DyestuffCatalogueBase = PostRegistrationMixin(Idea);

export default class DyestuffCatalogue extends DyestuffCatalogueBase {
  /** Residency veto — a culled catalogue re-warms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'DyestuffCatalogue is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * Stand up every authored dyestuff row. Public so a pack go-live can
   * re-warm; idempotent — `singleton` no-ops rows already live.
   *
   * ⚠ Harvested by **path infix** across every root, never an allowlist
   * of roots: a chemical-industry pack shipping synthetic alizarin
   * joins this roster without a line changing here.
   */
  public async warm(): Promise<number> {
    const templates = await Template.findByPathInfix('/idea/dyestuff/');
    const isDyestuff = new Map<string, boolean>();
    let stood = 0;
    for (const tpl of templates) {
      if (!isDyestuff.has(tpl.class)) {
        isDyestuff.set(tpl.class, await isDyestuffClass(tpl.class));
      }
      if (!isDyestuff.get(tpl.class)) continue;
      try {
        await StuffApi.singleton(tpl.path);
        stood++;
      } catch (err) {
        console.warn(`DyestuffCatalogue: '${tpl.path}' failed to stand up:`, err);
      }
    }
    console.info(`DyestuffCatalogue: ${stood} dyestuff(s) live`);
    return stood;
  }
}

/** Does `classPath` resolve to `Dyestuff` or a subclass of it? */
async function isDyestuffClass(classPath: string): Promise<boolean> {
  try {
    const cls = (await StuffApi.loadClassByPath(classPath)) as {
      prototype?: unknown;
    };
    return (
      typeof cls === 'function' &&
      (cls === (Dyestuff as unknown) || cls.prototype instanceof Dyestuff)
    );
  } catch {
    return false;
  }
}
