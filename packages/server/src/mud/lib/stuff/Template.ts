/**
 * Template — a CMS asset record. Lives in the `domain` MongoDB collection.
 *
 * Templates describe how to clone game-world objects: a path identifier,
 * the runtime backing class, an optional Hydrator class, and a hydration
 * payload. Cloning happens via `StuffApi.clone(path, context?)`, which
 * loads a Template by path, dynamic-imports the backing class, optionally
 * runs the hydrator over `data`, and runs `postRegister`.
 *
 * Template is a `Document`, not a `Stuff` — like `User` and
 * `GoogleProfile`, it's a record, not a game-world entity (it is the data
 * a game-world Stuff is *cloned from*, never a live entity itself). CRUD
 * goes through the inherited `save`/`delete`/`findById`/`find` surface
 * plus the `findByPath` / `findDescendants` helpers below.
 *
 * **Folder/leaf type split.** `Template` is abstract; concrete
 * subclasses are `ZoneTemplate` (folders — any class extending
 * `Zone`, detected via `ZoneApi.isFolderClass`) and `LeafTemplate`
 * (everything else). The static helpers (`findByPath`,
 * `findDescendants`, `loadById`) discriminate at load time by
 * inspecting the `class` field; callers that hold a `Template` get
 * back the correct subclass without needing to know.
 *
 * The folder/leaf invariant on the `domain` collection is enforced by
 * `DomainHook` against the `PersistenceManager` chokepoint — see
 * `TemplateApi.validateFolderLeafSave` / `validateFolderLeafDelete`.
 * The Phase Z2 type split is the primary expression of the invariant;
 * the hook is defense-in-depth at the persistence chokepoint.
 */
import { Document, preloadFieldMarshallersFor } from '../persistence/Document';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { type AnyConstructor } from '../../api/mixin';
import { ZoneApi } from '../../api/zone';

/**
 * Doc shape we pull off the `domain` collection. The `class` field drives
 * which concrete `Template` subclass we materialize.
 */
type DomainDoc = Record<string, unknown> & { class?: unknown };

export abstract class Template extends Document {
  static collectionName = 'domain';
  static persistentFields = ['path', 'class', 'hydratorClass', 'data'];

  /** Canonical path identifier (e.g. `/obj/Avatar/abc123`, `/narnia/castle`). */
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
   * Materialize a doc as the right `Template` subclass.
   *
   * Folder classes (`Zone` subclasses, per `ZoneApi.isFolderClass`)
   * become `ZoneTemplate`; everything else becomes `LeafTemplate`.
   * The two subclasses share fields and persistence; the type
   * distinction is what lets callers reason about folder-vs-leaf
   * without sniffing `class`.
   *
   * Constructed with a plain `new` — a Template is a `Document`, not a
   * registered Stuff, so there is no `StuffApi.create` and no registry
   * entry to accumulate.
   */
  protected static async _materialize(doc: DomainDoc): Promise<Template> {
    const classPath = typeof doc.class === 'string' ? doc.class : '';
    // Lazy imports to dodge the cycle: ZoneTemplate / LeafTemplate
    // extend Template, but Template needs to construct them. Module
    // initialization order makes the eager form unsafe.
    const isFolder = await ZoneApi.isFolderClass(classPath);
    let instance: Template;
    if (isFolder) {
      const { ZoneTemplate } = await import('./ZoneTemplate');
      instance = new ZoneTemplate();
    } else {
      const { LeafTemplate } = await import('./LeafTemplate');
      instance = new LeafTemplate();
    }
    // Preflight any marshaller singletons for the chosen subclass
    // before the sync `fromDocument` walk, mirroring the pattern in
    // `Document.findById` / `find`. Template subclasses today
    // don't compose marshaller-typed fields, but a future
    // `ZoneTemplate` / `LeafTemplate` extension that does would
    // otherwise hit the sync resolver "not registered" throw inside
    // `fromDocument`.
    await preloadFieldMarshallersFor(instance.constructor as AnyConstructor);
    // Reflect persisted fields onto the instance via the hydration seam
    // Document provides. (It's protected, so we cast.)
    (instance as unknown as { fromDocument(d: DomainDoc): void }).fromDocument(
      doc
    );
    return instance;
  }

  /**
   * Find the Template at `path`, or `null` if none exists.
   *
   * Templates are unique by path (enforced by convention; the folder/leaf
   * invariant prevents duplicates from making sense). Returns the first
   * match if multiple somehow exist. Returns the right concrete subclass
   * (`ZoneTemplate` / `LeafTemplate`) based on the doc's `class` field.
   */
  static async findByPath(path: string): Promise<Template | null> {
    const docs = (await PersistenceManager.get().find(
      Template.collectionName,
      { path }
    )) as DomainDoc[];
    const doc = docs[0];
    if (!doc) return null;
    return await Template._materialize(doc);
  }

  /**
   * All Templates whose path begins with `basePath + '/'` — i.e. strict
   * descendants (excludes `basePath` itself).
   */
  static async findDescendants(basePath: string): Promise<Template[]> {
    const prefix = basePath.endsWith('/') ? basePath : basePath + '/';
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const docs = (await PersistenceManager.get().find(
      Template.collectionName,
      { path: { $regex: `^${escaped}` } }
    )) as DomainDoc[];
    return Promise.all(docs.map((d) => Template._materialize(d)));
  }

  /**
   * Load a Template by `_id` and return it as the right subclass
   * (`ZoneTemplate` / `LeafTemplate`).
   *
   * Distinct from the inherited `Document.findById<T>`: that method
   * is generic over the calling class and does `new this()`, which is
   * illegal on the abstract `Template` base. Concrete subclasses
   * (`ZoneTemplate.findById(id)` / `LeafTemplate.findById(id)`) still
   * work via the inherited generic — call them when you statically
   * know the shape. Use `Template.loadById` when you have only the id
   * and want subclass dispatch.
   */
  static async loadById(id: string): Promise<Template | null> {
    const doc = (await PersistenceManager.get().findById(
      Template.collectionName,
      id
    )) as DomainDoc | null;
    if (!doc) return null;
    return await Template._materialize(doc);
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
