/**
 * AromaCatalogue — the singleton that serves the `aroma` documents (every
 * smell a nose can read, a tree any pack extends — `/base-library/aromas/
 * smoke/peat-smoke`), reached as `PerceptionApi.aromas()`. What an aroma IS:
 * `lib/perception/Aroma.ts`.
 *
 * ⭐ Named by path; the folder is the tree (documents D14). Loaded on use:
 * a material's setter awaits {@link AromaCatalogue.ensure} for each aroma
 * it names, and a read that finds one not yet resident starts the load,
 * which `smell`, `taste` and `analyze` wait out ({@link AromaCatalogue.settling}).
 * The memory is the class's own and outlives any instance; it is never a
 * roster.
 */

import { Idea } from '../../lib/stuff/Idea';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import type { VetoResult } from '../../lib/errors';
import { StuffApi } from '../../api/stuff';
import { AROMA_PATH_SHAPE, Aroma, type AromaData, type OdorTag } from '../../lib/perception/Aroma';

/** How deep a parent chain may run before a cycle is assumed. */
const MAX_DEPTH = 8;

export default class AromaCatalogue extends Idea {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  // `#` (CLAUDE.md special case 3): the memory is the class's own and must
  // outlive any instance.
  static #known = new Map<string, Aroma>();
  static #loading = new Map<string, Promise<unknown>>();

  /** Whether a string could be an aroma's path (no document is consulted). */
  public isAromaPath(path: unknown): path is string {
    return typeof path === 'string' && AROMA_PATH_SHAPE.test(path);
  }

  /** An aroma's word: the last segment of its path (`/…/aromas/peat-smoke` → `peat-smoke`). */
  public wordOf(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1);
  }

  /** How an aroma reads in a sentence: `/…/aromas/peat-smoke` → `peat smoke`. */
  public phraseOf(path: string): string {
    return this.wordOf(path).replace(/-/g, ' ');
  }

  /**
   * The aroma, synchronously, for a read that cannot wait. One not yet read
   * answers `null` and starts loading; a path with no document records an error an
   * author sees in `errors`, never a quiet loss.
   *
   */
  public resolve(path: string): Aroma | null {
    const found = (AromaCatalogue.#known.get(path) ?? null);
    if (found) return found;
    if (!AromaCatalogue.#loading.has(path)) {
      const load = this.ensure(path)
        .catch((err: unknown) => {
          void import('../../api/diagnostics').then(({ DiagnosticApi }) => DiagnosticApi.record({
            path,
            severity: 'error',
            message: `Aroma '${path}' is named but has no document: ${String(err)}`,
          })).catch(() => {});
        })
        .finally(() => AromaCatalogue.#loading.delete(path));
      AromaCatalogue.#loading.set(path, load);
    }
    return null;
  }

  /** The aroma at `path`, read with its parents; throws naming the path if there is none. */
  public async ensure(path: string, depth = 0): Promise<Aroma> {
    if (!this.isAromaPath(path)) throw new Error(`'${String(path)}' is not an aroma path`);
    const found = (AromaCatalogue.#known.get(path) ?? null);
    if (found) return found;
    if (depth > MAX_DEPTH) throw new Error(`Aroma '${path}': the tree is deeper than ${MAX_DEPTH}`);
    const doc = await (await import('../../api/document')).DocumentApi.read(path);
    if (!doc || doc.getKind() !== 'aroma') {
      throw new Error(`Aroma '${path}' has no aroma document`);
    }
    const data = doc.getData() as AromaData;
    const parentPath = data.parent ?? this.folderParentOf(path);
    const parent = parentPath ? await this.ensure(parentPath, depth + 1) : null;
    return this.remember(path, data, parent);
  }

  /**
   * ⭐ The folder is the tree (documents D14): a child lives in its parent's
   * directory, so its parent is the path one segment up — or none, for a
   * root directly under `aromas/`. An explicit `parent:` is for a parent in
   * ANOTHER pack only; `lint:aromas` refuses one the folder already says.
   */
  public folderParentOf(path: string): string | null {
    const up = path.slice(0, path.lastIndexOf('/'));
    return up.endsWith('/aromas') ? null : up;
  }

  /**
   * Keep an aroma read from its document, its parent already known. The one way
   * an aroma enters the cache: `ensure` calls it, and so does a unit fixture that
   * has no document store behind it. @internal
   */
  public remember(path: string, data: AromaData, parent: Aroma | null): Aroma {
    const row = new Aroma(
      [...(parent?.ancestry() ?? []), path],
      data.threshold ?? parent?.getThreshold() ?? 1,
      data.discipline ?? parent?.disciplineOf() ?? '',
      data.liking ?? parent?.getLiking() ?? null,
    );
    AromaCatalogue.#known.set(path, row);
    return row;
  }

  /** An aroma already read, or `null`; starts nothing. */
  public resolveKnown(path: string): Aroma | null {
    return (AromaCatalogue.#known.get(path) ?? null);
  }

  /** Forget every aroma read (a test starting clean; an installer sync). */
  public forgetAll(): void {
    AromaCatalogue.#known.clear();
  }

  /**
   * Shape-check authored smell tags and load each aroma, so a row naming a path
   * with no aroma fails where it is named. ⚠ Async by design: this is what makes a
   * material's aromas resident once the material is. @internal
   */
  public async resolveOdorTags(value: unknown, owner: string): Promise<OdorTag[]> {
    if (!Array.isArray(value)) {
      throw new TypeError(`${owner} must be a list of { aroma, strength }`);
    }
    const out: OdorTag[] = [];
    for (const [i, raw] of value.entries()) {
      const tag = raw as { aroma?: unknown; strength?: unknown };
      if (!this.isAromaPath(tag?.aroma)) {
        throw new TypeError(`${owner}[${i}]: '${String(tag?.aroma)}' is not an aroma path`);
      }
      if (typeof tag.strength !== 'number' || !(tag.strength > 0)) {
        throw new TypeError(`${owner}[${i}] ('${tag.aroma}') needs a positive strength (OU/kg)`);
      }
      await this.ensure(tag.aroma);
      out.push({ aroma: tag.aroma, strength: tag.strength });
    }
    return out;
  }

  /**
   * Have {@link Aroma.settling} wait for another load a cold read started (a dirt
   * kind on a restored floor, an ingredient of a restored blend), so the first read
   * after a restart does not lose a smell. @internal
   */
  public waitFor(key: string, load: Promise<unknown>): void {
    // Caught first, whatever happens next: a load is never left to reject unheard.
    const caught = load.catch(() => {});
    if (AromaCatalogue.#loading.has(key)) return;
    AromaCatalogue.#loading.set(
      key,
      caught.finally(() => AromaCatalogue.#loading.delete(key)),
    );
  }

  /**
   * Start loading a row a smell read found cold, by path, and have
   * {@link Aroma.settling} wait for it. @internal
   */
  public loadRow(path: string): void {
    // ⚠ Start one load per path. A second cold read must not start another:
    // nothing would catch it, and a rejection nobody catches ends the process
    // (found by the drive: a dirt kind with no row crashed the server).
    if (AromaCatalogue.#loading.has(path)) return;
    this.waitFor(path, StuffApi.singleton(path));
  }

  /** Every load a cold read started, to wait out; `null` when there are none. */
  public settling(): Promise<unknown> | null {
    return AromaCatalogue.#loading.size > 0 ? Promise.all(AromaCatalogue.#loading.values()) : null;
  }

  /** This aroma's path. */

  /** Forget `paths` (every aroma when omitted) — the go-live of an edit. */
  public forget(paths?: readonly string[]): void {
    if (paths === undefined) AromaCatalogue.#known.clear();
    else for (const p of paths) AromaCatalogue.#known.delete(p);
  }

  /** Residency veto — the memory is never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'the aroma catalogue; never culled' };
  }

  /** Singleton refusal. */
  public canDestruct(): VetoResult {
    return { ok: false, reason: 'the aroma catalogue is a system singleton' };
  }
}
