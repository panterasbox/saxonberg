/**
 * Template — a CMS asset record. Lives in the `domain` MongoDB collection.
 *
 * Templates describe how to clone game-world objects: a path identifier,
 * the runtime backing class, an optional Hydrator class, and a hydration
 * payload. Cloning happens via `StuffApi.clone(path, context?)`, which
 * loads a Template by path, dynamic-imports the backing class, optionally
 * runs the hydrator over `data`, and runs `postRegister`.
 *
 * Template is a `Persistable`, not a `Stuff` — like `User` and
 * `GoogleProfile`, it's a record, not a game-world entity. CRUD goes
 * through the inherited `save`/`delete`/`findById`/`find` surface plus
 * the `findByPath` / `findDescendants` helpers below.
 *
 * The folder/leaf invariant on the `domain` collection (Phase 7
 * Decision 12) is enforced by `DomainHook` against the
 * `PersistenceManager` chokepoint, not on this class. See
 * `TemplateApi.validateFolderLeafSave` / `validateFolderLeafDelete`.
 */
import { Persistable } from '../persistence/Persistable';

export class Template extends Persistable {
  static collectionName = 'domain';
  static persistentFields = ['path', 'class', 'hydratorClass', 'data'];

  /** Canonical path identifier (e.g. `/avatar/abc123`, `/narnia/castle`). */
  path: string = '';

  /** Runtime backing class path (e.g. `/obj/Avatar`). */
  class: string = '';

  /**
   * Optional `Hydrator` class path. When ABSENT, the clone pipeline runs
   * no hydrator and `data` is ignored. Templates that want generic
   * mixin-field copy must opt in by naming
   * `'/lib/persistence/PersistentHydrator'`.
   */
  hydratorClass?: string;

  /** Pure hydration payload (mixin-field values, etc.). */
  data: Record<string, unknown> = {};

  /**
   * Find the Template at `path`, or `null` if none exists.
   *
   * Templates are unique by path (enforced by convention; the folder/leaf
   * invariant prevents duplicates from making sense). Returns the first
   * match if multiple somehow exist.
   */
  static async findByPath(path: string): Promise<Template | null> {
    const matches = await this.find({ path });
    return matches[0] ?? null;
  }

  /**
   * All Templates whose path begins with `basePath + '/'` — i.e. strict
   * descendants (excludes `basePath` itself).
   */
  static async findDescendants(basePath: string): Promise<Template[]> {
    const prefix = basePath.endsWith('/') ? basePath : basePath + '/';
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.find({ path: { $regex: `^${escaped}` } });
  }

  /**
   * Generate ancestor paths, nearest first: `/a/b/c` → `['/a/b', '/a']`.
   * Root `/` excluded. Pure path-string utility — does not query.
   */
  static ancestorPaths(path: string): string[] {
    const segments = path.split('/').filter((s) => s.length > 0);
    const ancestors: string[] = [];
    for (let i = segments.length - 1; i > 0; i--) {
      ancestors.push('/' + segments.slice(0, i).join('/'));
    }
    return ancestors;
  }
}
