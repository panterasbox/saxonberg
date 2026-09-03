/**
 * FabricCatalogue — the self-warming home of the fabric-form roster.
 *
 * `Construction`'s covering vocabulary has two sources: a closed kernel
 * `as const` for the resist-bearing forms, and template rows for the
 * non-resisting textile ones. Rows cannot stand themselves up, and
 * something template-backed must own the warm — that is this singleton,
 * and the only thing it exists for.
 *
 * ⚠ **The reference-Ideas-inert-at-boot rule.** This has bitten three
 * times: nothing warms the roster, and every read returns null forever.
 * Here the failure would be worse than silent — a garment row authoring
 * `constructionForm: woven` would THROW at hydration, because
 * `Constructed.setConstructionForm` validates against the vocabulary.
 * So the warm is `postRegister`, **never an operator `Api.boot()`**, and
 * eager loading rides the platform pack's `boot:` manifest.
 *
 * ⚠ **Ordering matters and is guaranteed by construction.** The boot
 * manifest is the union of every applied pack's `boot:` list in install
 * order, DFS-sorted; the platform pack installs first, so this warms
 * before any locality room clones its `props:`. A garment cloned after
 * boot (a loadout, a craft, the `clone` verb) is trivially safe.
 *
 * The roster is every root's `idea/fabric/` subtree, filtered to rows
 * whose `class` extends {@link Fabric} wherever it lives — **never an
 * allowlist of roots**, the `MaterialCatalogue.warm()` shape verbatim,
 * so a pack's own fabric class qualifies with no kernel list edit.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import Fabric from './material/Fabric';
import { Construction } from '../../lib/material/Construction';
import type { FabricSpec } from '../../lib/material/Construction';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const FabricCatalogueBase = PostRegistrationMixin(Idea);

export default class FabricCatalogue extends FabricCatalogueBase {
  /** Residency veto — a culled catalogue re-warms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'FabricCatalogue is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * Stand up every authored fabric row and push it into the
   * `Construction` vocabulary. Public so a pack go-live can re-warm;
   * idempotent — `singleton` no-ops rows already live, and the registry
   * is rebuilt wholesale.
   *
   * ⚠ The registry swap happens **after every await**, in one
   * synchronous block, so no frame ever observes a half-empty
   * vocabulary.
   */
  public async warm(): Promise<number> {
    const templates = await Template.findByPathInfix('/idea/fabric/');
    const isFabric = new Map<string, boolean>();
    const specs: FabricSpec[] = [];
    for (const tpl of templates) {
      if (!isFabric.has(tpl.class)) {
        isFabric.set(tpl.class, await isFabricClass(tpl.class));
      }
      if (!isFabric.get(tpl.class)) continue;
      try {
        const row = await StuffApi.singleton<Fabric>(tpl.path);
        specs.push(row.toSpec());
      } catch (err) {
        console.warn(`FabricCatalogue: '${tpl.path}' failed to stand up:`, err);
      }
    }
    Construction.clearFabrics();
    for (const spec of specs) {
      try {
        Construction.registerFabric(spec);
      } catch (err) {
        console.error(
          `FabricCatalogue: fabric '${spec.key}' rejected by the registry:`,
          err,
        );
      }
    }
    console.info(
      `FabricCatalogue: ${Construction.fabricKeys().length} fabric form(s) live ` +
        `(${Construction.fabricKeys().join(', ')})`,
    );
    return Construction.fabricKeys().length;
  }
}

/**
 * Does `classPath` resolve to `Fabric` or a subclass of it?
 *
 * ⚠ The `===` clause is load-bearing and the sibling catalogues do not
 * have it, for a reason worth stating: `MaterialCatalogue` and
 * `FermentProfileCatalogue` filter on `cls.prototype instanceof Base`
 * alone, and that works ONLY because both have a `lib/` abstract base
 * plus a thin `platform/` concrete that rows actually name — so the
 * named class is always a STRICT subclass. `Fabric` is one class that
 * rows name directly, and `Fabric.prototype instanceof Fabric` is
 * false. Copying the predicate without the precondition would have
 * matched nothing, silently, and left every fabric form out of the
 * vocabulary.
 */
async function isFabricClass(classPath: string): Promise<boolean> {
  try {
    const cls = (await StuffApi.loadClassByPath(classPath)) as {
      prototype?: unknown;
    };
    return (
      typeof cls === 'function' &&
      (cls === (Fabric as unknown) || cls.prototype instanceof Fabric)
    );
  } catch {
    return false;
  }
}
