/**
 * MaterialCatalogue — the self-warming home of the authored material
 * roster (the MaturationProfileCatalogue shape; the boot()-retirement
 * direction: an operator-shaped warm does not belong on a consumer Api).
 *
 * `onCreate` stands up every authored `Material` row as a live
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
import Material from '../../lib/material/Material';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import { DocumentNotResidentError, type VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';

const MaterialCatalogueBase = Idea;

export default class MaterialCatalogue extends MaterialCatalogueBase {
  /**
   * Shared vocabulary nobody holds title to: `smell`, `taste`, `analyze`
   * and every craft act read materials inside a circle (load-on-use W0).
   */
  static boundaryRole: BoundaryRole = 'commons';

  /** Whether {@link warm} has run in this process — the roster's guard. */
  private warmed = false;

  /**
   * ⭐ Load the material at `path` — at once when it is live, else its row
   * (and its `extends:` ancestors) stood up. The async door: a setter that
   * cites a material returns this, an act that names one awaits it
   * (load-on-use D2). Throws when the row does not exist.
   */
  public async ensure(path: string): Promise<Material> {
    const live = this.peek(path);
    if (live) return live;
    await StuffApi.ensureConstituent(path);
    // `ensureConstituent` returns without awaiting a load already in
    // flight; `singleton` coalesces onto it.
    if (!this.peek(path)) await StuffApi.singleton(path);
    return this.need(path);
  }

  /**
   * The live material at `path` — throws `DocumentNotResidentError` when
   * nothing loaded it (load-on-use D1: cold means loud). An empty path is
   * a caller's "no material" and is not this door's question.
   */
  public need(path: string): Material {
    const m = this.peek(path);
    if (!m) throw new DocumentNotResidentError('material', path);
    return m;
  }

  /** The live material at `path`, or `null` — a read that may honestly miss. */
  public peek(path: string): Material | null {
    if (!path) return null;
    const m = StuffApi.findByTemplatePath<Material>(path);
    return m instanceof Material ? m : null;
  }

  /**
   * Every authored material, live — the roster read (the wiki's listing, a
   * pattern's metal). Its async parent awaits
   * `StuffApi.ready(TemplatePaths.materialCatalogue)` first; read cold, it
   * throws rather than answering with whatever happened to be loaded.
   */
  public roster(): Material[] {
    if (!this.warmed) {
      throw new DocumentNotResidentError('material roster', '/platform/idea/MaterialCatalogue');
    }
    return StuffApi.findByPathGlob<Material>('/**/idea/material/**').filter(
      (m): m is Material => m instanceof Material,
    );
  }

  /** Every authored material carrying `tag` (exact-string match). */
  public byTag(tag: string): Material[] {
    return this.roster().filter((m) => m.hasTag(tag));
  }

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

  public override async onCreate(_context?: unknown): Promise<void> {
    await this.ensureRoster();
  }

  /** The one in-flight roster warm, shared by every caller (coalesced). */
  private rosterLoad: Promise<number> | null = null;

  /**
   * ⭐ Stand the whole roster up once per process — what a ROSTER read's
   * async parent awaits (the `DirtCatalogue.ensureKernel` shape). A
   * per-row read never needs it: {@link ensure} loads one row.
   */
  public ensureRoster(): Promise<number> {
    this.rosterLoad ??= this.warm();
    return this.rosterLoad;
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
    this.warmed = true;
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
