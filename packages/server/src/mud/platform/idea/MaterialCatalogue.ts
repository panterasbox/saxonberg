/**
 * MaterialCatalogue — the self-warming home of the authored material
 * roster (the FermentProfileCatalogue shape; the boot()-retirement
 * direction: an operator-shaped warm does not belong on a consumer Api).
 *
 * `postRegister` stands up every authored `Material` row as a live
 * singleton so the sync resolve-on-read seams (`Tangible.getMaterial`,
 * the bulk slots' material reads, `Combustible`'s autoignition read,
 * composition expansion) hit from the first frame of live play — the
 * reference-Ideas-inert-at-boot rule. Those readers use the SYNC
 * `StuffApi.findByTemplatePath`, which returns only already-live
 * instances — and nothing else ever stood materials up in a running
 * server (tests hand-construct theirs), so without this warm every
 * live material read was null: nothing could ignite, melt, or resolve
 * a composition.
 *
 * The roster is every root's `idea/material/` subtree, filtered to rows
 * whose `class` extends `Material` wherever it lives — the kernel's
 * `/platform/idea/material/*` or a pack's
 * (`/system/arcana/idea/material/PotionMaterial`) — never an allowlist
 * of roots (folder rows are `FolderZone`s owned by the zone substrate).
 * Eager loading rides the platform pack's `boot:` manifest (role
 * `sync-read`), NOT an AppBootstrap sequencer line.
 *
 * Holds NO state and keeps NO index — the queries live on `Material`
 * and its readers over the live population. This singleton exists for
 * exactly one reason: rows cannot stand themselves up, and something
 * template-backed must own the warm.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import Material from '../../lib/material/Material';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

const MaterialCatalogueBase = PostRegistrationMixin(Idea);

export default class MaterialCatalogue extends MaterialCatalogueBase {
  /** Residency veto — the roster's warm; a culled catalogue re-warms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'MaterialCatalogue is a system singleton; never destructed',
    };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warm();
  }

  /**
   * Stand up every authored Material row as a live singleton. Public so
   * a pack go-live can re-warm (idempotent — `singleton` no-ops rows
   * already live). Returns the count stood.
   */
  public async warm(): Promise<number> {
    const templates = await Template.findByPathInfix('/idea/material/');
    let stood = 0;
    const isMaterial = new Map<string, boolean>();
    for (const tpl of templates) {
      if (!isMaterial.has(tpl.class)) {
        isMaterial.set(tpl.class, await isMaterialClass(tpl.class));
      }
      if (!isMaterial.get(tpl.class)) continue;
      try {
        await StuffApi.singleton(tpl.path);
        stood++;
      } catch (err) {
        console.warn(
          `MaterialCatalogue: '${tpl.path}' failed to stand up:`,
          err,
        );
      }
    }
    console.info(`MaterialCatalogue: ${stood} material singleton(s) live`);
    return stood;
  }
}

/** Does `classPath` resolve to a class whose prototype chain includes `Material`? (The `ZoneApi.isFolderClass` precedent.) */
async function isMaterialClass(classPath: string): Promise<boolean> {
  try {
    const cls = (await StuffApi.loadClassByPath(classPath)) as {
      prototype?: unknown;
    };
    return typeof cls === 'function' && cls.prototype instanceof Material;
  } catch {
    return false;
  }
}
