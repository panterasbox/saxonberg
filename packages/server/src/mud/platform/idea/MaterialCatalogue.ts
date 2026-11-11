/**
 * MaterialCatalogue — the one door every material read goes through,
 * reached as `MaterialApi.materials()` (load-on-use W8).
 *
 * ⭐ **A material loads when something reaches it**, never at boot, by one
 * of four doors (load-on-use D2):
 *
 *   (a) **its holder** — a thing's own material (`Tangible._materialPath`,
 *       a bulk slot's) is an `identity:constituent` field, so the template
 *       applier loads it before the setter runs, on mint, go-live and
 *       restore;
 *   (b) **a relation on a row** — a material's melt product, a mixture's
 *       parts, a profile's product — is declared `identity:constituent` on
 *       the citing field (or loaded by the citing document's `afterRead`),
 *       so the related row loads with its citer;
 *   (c) **an act** — a runtime-chosen path (a smelt's product, a water
 *       draw) is loaded by the act that names it ({@link ensure}), and a
 *       runtime FIELD that carries material paths (a bulk payload's
 *       makeup, a face's coats) loads them through its restoring setter
 *       ({@link ensureCited}) — the act that wrote it held the rows;
 *   (d) **the roster** — the few reads that ask for every material (the
 *       wiki's listing, a pattern's metals) await {@link ensureRoster}.
 *
 * The sync read is {@link need}: a non-empty path nothing loaded throws
 * `DocumentNotResidentError`, never "no material" ({@link peek} for a read
 * that may honestly miss). Reached by `singletonSync` with no `onCreate`
 * (the document catalogues' shape, D13); the roster state is the CLASS's,
 * so a catalogue stood up again (a suite's `clearAll`) reads the same one.
 *
 * The roster is every root's `idea/material/` subtree, filtered to rows
 * whose `class` extends `Material` wherever it lives — never an allowlist
 * of roots (a pack's `/system/arcana/idea/material/PotionMaterial`
 * qualifies).
 */

import { Idea } from '../../lib/stuff/Idea';
import Material from '../../lib/material/Material';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import { DocumentNotResidentError, type VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';

/** A runtime value's keys that name a material ({@link MaterialCatalogue.ensureCitedIn}). */
const MATERIAL_KEYS = /^(material|materialPath|madeFrom|glue|becomes)$/;

/** Every root's material subtree — the warm's infix (no list of roots). */
const MATERIAL_INFIX = '/idea/material/';

const MaterialCatalogueBase = Idea;

export default class MaterialCatalogue extends MaterialCatalogueBase {
  /**
   * Shared vocabulary nobody holds title to: `smell`, `taste`, `analyze`
   * and every craft act read materials inside a circle (load-on-use W0).
   */
  static boundaryRole: BoundaryRole = 'commons';

  /**
   * The one roster load for the process — `#` (CLAUDE.md special case 3):
   * the CLASS's, so it outlives any instance, and nothing outside these
   * methods may reset it.
   */
  static #rosterLoad: Promise<number> | null = null;
  /** Whether the roster has stood in this process — the roster read's guard. */
  static #stood = false;

  /**
   * ⭐ Load the material at `path` — at once when it is live, else its row
   * (and its `extends:` ancestors) stood up. The act's door (D2 c). Throws
   * when the row does not exist.
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
   * ⭐ The restore door for a runtime field that carries material paths (a
   * bulk payload's makeup, a face's coats, an assembly's parts): every
   * cited path that is not live is loaded. `undefined` when all are — the
   * runtime case, where the act that wrote the field held the rows — so a
   * setter returns it with no promise to dangle. The load never rejects
   * (the `ensureConstituent` contract): a row that will not stand is a
   * warning here and a loud cold read at the first sync reader.
   */
  public ensureCited(paths: Iterable<string | null | undefined>): Promise<void> | undefined {
    const cold = [...new Set([...paths].filter((p): p is string => !!p && !this.peek(p)))];
    if (cold.length === 0) return undefined;
    return Promise.all(cold.map((p) => StuffApi.ensureConstituent(p))).then(() => undefined);
  }

  /**
   * {@link ensureCited} over every material a runtime VALUE names — a bulk
   * payload's makeup and `madeFrom`, a face's coats, an assembly's part
   * `material`s and joint `glue`, a fuel bed's charges: every path-shaped
   * string under a key that names a material (`material`, `materialPath`,
   * `madeFrom`, `glue`, `becomes`), at any depth. A part's `template` (a
   * thing's row) is never one.
   */
  public ensureCitedIn(value: unknown): Promise<void> | undefined {
    const out: string[] = [];
    const walk = (v: unknown, key: string | null, depth: number): void => {
      if (depth > 8 || v === null || v === undefined) return;
      if (typeof v === 'string') {
        if (key !== null && MATERIAL_KEYS.test(key) && v.startsWith('/')) out.push(v);
      } else if (Array.isArray(v)) {
        for (const x of v) walk(x, key, depth + 1);
      } else if (typeof v === 'object') {
        for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, k, depth + 1);
      }
    };
    walk(value, null, 0);
    return this.ensureCited(out);
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
  public peek(path: string | null | undefined): Material | null {
    if (!path) return null;
    const m = StuffApi.findByTemplatePath<Material>(path);
    return m instanceof Material ? m : null;
  }

  /**
   * ⭐ Stand the whole roster up once per process — what a ROSTER read's
   * async parent awaits (D2 d). A per-row read never needs it.
   */
  public ensureRoster(): Promise<number> {
    MaterialCatalogue.#rosterLoad ??= this.warm().catch((err: unknown) => {
      MaterialCatalogue.#rosterLoad = null;
      throw err;
    });
    return MaterialCatalogue.#rosterLoad;
  }

  /**
   * Every authored material, live — the roster read (the wiki's listing, a
   * pattern's metal). Read before the roster stood, it throws rather than
   * answering with whatever happened to be loaded.
   */
  public roster(): Material[] {
    if (!MaterialCatalogue.#stood) {
      throw new DocumentNotResidentError('material roster', '/platform/idea/MaterialCatalogue');
    }
    return StuffApi.findByPathGlob<Material>(`/**${MATERIAL_INFIX}**`).filter(
      (m): m is Material => m instanceof Material,
    );
  }

  /** Every authored material carrying `tag` (exact-string match). */
  public byTag(tag: string): Material[] {
    return this.roster().filter((m) => m.hasTag(tag));
  }

  /**
   * Mark the roster stood with what is already live — a suite's harness,
   * which has no rows to read (`MaterialApi`'s `@TestOnly` seam is the only
   * caller).
   */
  @CallSecurity(SecurityPolicies.FromModule('/api/material#MaterialApi'))
  public standRosterAsLive(): void {
    MaterialCatalogue.#stood = true;
    MaterialCatalogue.#rosterLoad = Promise.resolve(0);
  }

  /**
   * Stand up every authored Material row as a live singleton. Public so a
   * pack go-live can re-warm (idempotent — `singleton` no-ops rows already
   * live). Returns the count stood.
   */
  public async warm(): Promise<number> {
    const templates = await Template.findByPathInfix(MATERIAL_INFIX);
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
        console.warn(`MaterialCatalogue: '${tpl.path}' failed to stand up:`, err);
      }
    }
    MaterialCatalogue.#stood = true;
    console.info(`MaterialCatalogue: ${stood} material singleton(s) live`);
    return stood;
  }

  /** Residency veto — the roster's home; never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'MaterialCatalogue is a system singleton; never destructed',
    };
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
