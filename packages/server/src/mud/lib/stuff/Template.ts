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
 * The folder/leaf invariant on the `content` collection is enforced by
 * `DomainHook` against the `PersistenceManager` chokepoint — see
 * `TemplateApi.validateFolderLeafSave` / `validateFolderLeafDelete`.
 * The Phase Z2 type split is the primary expression of the invariant;
 * the hook is defense-in-depth at the persistence chokepoint.
 */
import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';
import { PersistApi } from '../../api/persist';
import { MixinApi, type AnyConstructor } from '../../api/mixin';
import { ZoneApi } from '../../api/zone';
import { TemplateError } from './TemplateError';
import type { FieldMeta, FieldMetaEntry } from '../mixin';

/**
 * Doc shape we pull off the `content` collection. The `class` field drives
 * which concrete `Template` subclass we materialize.
 */
type DomainDoc = Record<string, unknown> & { class?: unknown };

/**
 * How deep a parent chain may go before we call it a mistake. The value
 * is biome's `BIOME_ANCESTRY_DEPTH_CAP` — the same number for the same
 * reason, now that the two mechanisms are one.
 */
const TEMPLATE_CHAIN_DEPTH_CAP = 32;

/** What the AUTHOR wrote on one row, before any parent is folded in. */
export interface TemplateOwn {
  class?: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
}

/**
 * The row an author means to save. Replaces the positional
 * `(path, class, data, hydrator)` form, which `extends` made unreadable
 * (`(path, null, data, undefined, parent)`).
 */
export interface TemplateSpec {
  class?: string;
  hydratorClass?: string;
  extends?: string;
  data: Record<string, unknown>;
}

/**
 * One entry of a `by-entry` designation list, for the merge. The entry's
 * IDENTITY is `as` when stated, else `template`, else the bare string —
 * which is the whole reason `as` exists (see templates.md).
 */
type ListEntry = string | { template?: unknown; as?: unknown };

/** The identity of a designation-list entry, for `by-entry` merging. */
function entryKey(entry: unknown): string {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    const e = entry as ListEntry as { template?: unknown; as?: unknown };
    if (typeof e.as === 'string') return e.as;
    if (typeof e.template === 'string') return e.template;
  }
  return JSON.stringify(entry);
}

/**
 * The `by-entry` merge: the PARENT's entries in order, an entry whose key
 * a child names replaced **in place** (further parent duplicates of that
 * key dropped), then the child's unmatched entries appended in order.
 *
 * ⭐ In-place substitution is what keeps `onto` working: a prop that
 * lands on another prop reads its target out of the placement map, and
 * the map is built in list order.
 *
 * ⚠ Parent duplicates the child does NOT name are PRESERVED — six
 * same-path stool lines stay six until somebody writes `count`. Silently
 * collapsing them would undress a room.
 */
function mergeEntryLists(parent: unknown[], child: unknown[]): unknown[] {
  const used = new Set<number>();
  const substituted = new Set<string>();
  const out: unknown[] = [];
  for (const p of parent) {
    const key = entryKey(p);
    // A key the child has already substituted: this is a further parent
    // duplicate of it, and the child's single line spoke for all of them.
    if (substituted.has(key)) continue;
    const idx = child.findIndex((c, i) => !used.has(i) && entryKey(c) === key);
    if (idx < 0) {
      out.push(p);
      continue;
    }
    used.add(idx);
    substituted.add(key);
    out.push(child[idx]);
  }
  child.forEach((c, i) => {
    if (!used.has(i)) out.push(c);
  });
  return out;
}

export abstract class Template extends Document {
  static collectionName = Collections.Content;
  static fieldMeta: FieldMeta = {
    path: { persistent: true },
    extends: { persistent: true },
    class: { persistent: true },
    hydratorClass: { persistent: true },
    data: { persistent: true },
  };

  /** Canonical path identifier (e.g. `/platform/agent/Avatar/abc123`, `/narnia/castle`). */
  path: string = '';

  /**
   * The PARENT row's path, or absent. An ordinary row — it passed the
   * same authoring gate this one did, which is why `extends` is not a
   * code-naming field (access.md § The code-trust lockdown).
   *
   * ⚠ Resolved at READ time, never flattened into the stored row: what
   * the author wrote is what `toDocument` writes back, so an edit to a
   * parent reaches every descendant's next clone.
   */
  extends?: string;

  /**
   * Runtime backing class path (e.g. `/platform/agent/Avatar`) —
   * **EFFECTIVE**: the nearest stated value along the parent chain.
   * `readonly` because writing it would flatten the chain; author-side
   * writers go through {@link setOwn} and read {@link own}.
   */
  readonly class: string = '';

  /**
   * Optional `Hydrator` class path — **EFFECTIVE** (the nearest stated
   * value along the chain). When ABSENT, the clone pipeline runs
   * no hydrator and `data` is ignored. Templates that want generic
   * mixin-field copy must opt in by naming
   * `'/platform/idea/persistence/PersistentHydrator'`.
   */
  readonly hydratorClass?: string;

  /**
   * Pure hydration payload (mixin-field values, etc.) — **EFFECTIVE**:
   * the chain merged per each field's declared `inherit` rule
   * (`lib/mixin.ts` `FieldMetaEntry.inherit`).
   */
  readonly data: Record<string, unknown> = {};

  /**
   * **RAW** — exactly what this row states, with nothing inherited. The
   * five authoring surfaces (`saveTemplate` + its delta gate, `cp`,
   * `mv`, the CMS round-trip, `cat`) read this; everything that asks
   * *what does this clone into* reads the effective fields above.
   */
  own: TemplateOwn = { data: {} };

  /** The parent paths, nearest first. Empty for a parentless row. */
  chain: readonly string[] = [];

  /**
   * Declare what this row itself states. The author-side writer —
   * `saveTemplate` and the copy verbs — so that a save can never write
   * an effective value back over an authored one.
   */
  public setOwn(spec: TemplateSpec): void {
    this.own = {
      class: spec.class,
      hydratorClass: spec.hydratorClass,
      data: spec.data,
    };
    this.extends = spec.extends;
    const w = this as unknown as {
      class: string;
      hydratorClass?: string;
      data: Record<string, unknown>;
    };
    w.class = spec.class ?? '';
    w.hydratorClass = spec.hydratorClass;
    w.data = spec.data;
    this.chain = [];
  }

  /**
   * Split the stored doc into RAW (`own` + `extends`) and seed the
   * effective fields with it; `_materialize` folds the chain in after.
   */
  protected override fromDocument(doc: Record<string, unknown>): void {
    super.fromDocument(doc);
    const rawData =
      doc.data && typeof doc.data === 'object' && !Array.isArray(doc.data)
        ? (doc.data as Record<string, unknown>)
        : {};
    this.own = {
      class: typeof doc.class === 'string' ? doc.class : undefined,
      hydratorClass:
        typeof doc.hydratorClass === 'string' ? doc.hydratorClass : undefined,
      data: rawData,
    };
    this.extends = typeof doc.extends === 'string' ? doc.extends : undefined;
    const w = this as unknown as {
      class: string;
      hydratorClass?: string;
      data: Record<string, unknown>;
    };
    w.class = this.own.class ?? '';
    w.hydratorClass = this.own.hydratorClass;
    w.data = rawData;
    this.chain = [];
  }

  /**
   * Write the RAW row. ⭐⭐ **A save never writes an effective value** —
   * this is what makes the chain live rather than a one-time expansion,
   * and it holds for every writer that goes through `Document.save()`:
   * `saveTemplate`, `cp`, `mv`, the CMS, `pack --export`.
   *
   * The three inheritable keys are written as value-or-`null` rather
   * than omitted, because the terminal write is a `$set`: an omitted key
   * would leave a previously-stored value in place, so "this child
   * states no class" has to be said out loud.
   */
  protected override toDocument(): Record<string, unknown> {
    const doc = super.toDocument();
    doc.extends = this.extends ?? null;
    doc.class = this.own.class ?? null;
    doc.hydratorClass = this.own.hydratorClass ?? null;
    doc.data = this.own.data;
    return doc;
  }

  /**
   * Fold `chainDocs` (this row first, then each ancestor) into the
   * effective fields. Nearest statement wins for `class` and
   * `hydratorClass`; `data` merges per the owning field's `inherit`
   * rule.
   *
   * A private INSTANCE method, not a static: `lint:lib-statics` ratchets
   * public statics on non-Api classes and `Template` is a `lib/` class.
   */
  async #inherit(chainDocs: readonly DomainDoc[]): Promise<void> {
    const w = this as unknown as {
      class: string;
      hydratorClass?: string;
      data: Record<string, unknown>;
    };
    // Nearest-stated wins: walk ancestor-first so the child overwrites.
    let cls: string | undefined;
    let hyd: string | undefined;
    for (let i = chainDocs.length - 1; i >= 0; i--) {
      const d = chainDocs[i]!;
      if (typeof d.class === 'string' && d.class.length > 0) cls = d.class;
      if (typeof d.hydratorClass === 'string' && d.hydratorClass.length > 0) {
        hyd = d.hydratorClass;
      }
    }
    w.class = cls ?? '';
    w.hydratorClass = hyd;

    // The merge rules are the EFFECTIVE class's — a field's owner
    // declares how it merges, so a pack field (`routes`) and every
    // Biome field say their own rule with no edit here.
    let meta: Record<string, FieldMetaEntry> = {};
    if (cls) {
      const { StuffApi } = await import('../../api/stuff');
      try {
        const ctor = (await StuffApi.loadClassByPath(cls)) as AnyConstructor;
        meta = MixinApi.getAllFieldMeta(ctor) as Record<string, FieldMetaEntry>;
      } catch {
        // An unresolvable class is the clone pipeline's error to raise,
        // with its own message; here it just means every field merges by
        // the default rule.
        meta = {};
      }
    }

    let merged: Record<string, unknown> = {};
    for (let i = chainDocs.length - 1; i >= 0; i--) {
      const d = chainDocs[i]!;
      const own =
        d.data && typeof d.data === 'object' && !Array.isArray(d.data)
          ? (d.data as Record<string, unknown>)
          : {};
      merged = Template.#mergeData(merged, own, meta);
    }
    w.data = merged;
  }

  /** One ancestor→child step of the data merge. */
  static #mergeData(
    parent: Record<string, unknown>,
    child: Record<string, unknown>,
    meta: Record<string, FieldMetaEntry>,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(parent), ...Object.keys(child)]);
    for (const key of keys) {
      const rule = meta[key]?.inherit ?? 'replace';
      const inChild = key in child;
      const inParent = key in parent;
      if (rule === 'never') {
        if (inChild) out[key] = child[key];
        continue;
      }
      if (!inParent) {
        out[key] = child[key];
        continue;
      }
      if (!inChild) {
        out[key] = parent[key];
        continue;
      }
      const pv = parent[key];
      const cv = child[key];
      if (
        rule === 'by-key' &&
        pv && typeof pv === 'object' && !Array.isArray(pv) &&
        cv && typeof cv === 'object' && !Array.isArray(cv)
      ) {
        out[key] = { ...(pv as object), ...(cv as object) };
        continue;
      }
      if (rule === 'by-entry' && Array.isArray(pv) && Array.isArray(cv)) {
        out[key] = mergeEntryLists(pv, cv);
        continue;
      }
      out[key] = cv;
    }
    return out;
  }

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
    const chainDocs = await Template.#resolveChain(doc);
    // The folder/leaf split is decided by the EFFECTIVE class — a child
    // that states none is the folder its parent is.
    let classPath = '';
    for (let i = chainDocs.length - 1; i >= 0; i--) {
      const c = chainDocs[i]!.class;
      if (typeof c === 'string' && c.length > 0) classPath = c;
    }
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
    await Document.preloadFieldMarshallersFor(
      instance.constructor as AnyConstructor,
    );
    // Reflect persisted fields onto the instance via the hydration seam
    // Document provides. (It's protected, so we cast.)
    (instance as unknown as { fromDocument(d: DomainDoc): void }).fromDocument(
      doc
    );
    if (chainDocs.length > 1) {
      instance.chain = chainDocs
        .slice(1)
        .map((d) => (typeof d.path === 'string' ? d.path : ''));
      await instance.#inherit(chainDocs);
    }
    return instance;
  }

  /**
   * This row's stored doc followed by each ancestor's, nearest first.
   *
   * Reads go through the resident `content` cache (a bare by-path find
   * with no options), so a parent walk is a memory hop — see
   * `PersistenceManager` § the content cache.
   *
   * Fails LOUDLY on all three ways a chain can be wrong: a cycle, a
   * chain deeper than {@link TEMPLATE_CHAIN_DEPTH_CAP}, and a parent
   * that does not exist. A silent parentless materialize would hand the
   * clone pipeline a row with no class and blame the wrong thing.
   */
  static async #resolveChain(doc: DomainDoc): Promise<DomainDoc[]> {
    const chain: DomainDoc[] = [doc];
    const childPath = typeof doc.path === 'string' ? doc.path : '(unsaved)';
    const seen = new Set<string>([childPath]);
    let cursor = doc;
    while (typeof cursor.extends === 'string' && cursor.extends.length > 0) {
      const parentPath = cursor.extends;
      if (seen.has(parentPath)) {
        throw new TemplateError(
          `Template '${childPath}' has a cyclic parent chain: ` +
            `${[...seen].join(' -> ')} -> ${parentPath}`,
        );
      }
      if (chain.length >= TEMPLATE_CHAIN_DEPTH_CAP) {
        throw new TemplateError(
          `Template '${childPath}' has a parent chain deeper than ` +
            `${TEMPLATE_CHAIN_DEPTH_CAP}; the chain starts ` +
            `${chain
              .map((d) => String(d.path))
              .slice(0, 4)
              .join(' -> ')}`,
        );
      }
      const docs = (await PersistApi.find(Template.collectionName, {
        path: parentPath,
      })) as DomainDoc[];
      const parent = docs[0];
      if (!parent) {
        throw new TemplateError(
          `Template '${childPath}' extends '${parentPath}', which does not ` +
            `exist. Create the parent, or drop the 'extends' line.`,
        );
      }
      seen.add(parentPath);
      chain.push(parent);
      cursor = parent;
    }
    return chain;
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
    const docs = (await PersistApi.find(
      Template.collectionName,
      { path }
    )) as DomainDoc[];
    const doc = docs[0];
    if (!doc) return null;
    return await Template._materialize(doc);
  }

  /**
   * Find every Template whose path is in `paths`. Returns instances in
   * the order Mongo provides them (no input-order guarantee). Missing
   * paths are silently absent from the result — callers can compare
   * `result.length` to `paths.length`. Same materialization rule as
   * `findByPath` (each doc lands as its concrete subclass).
   *
   * Sits alongside `findByPath` / `findDescendants` because Template is
   * abstract — the inherited `Document.find` does `new this()` which
   * doesn't apply to abstract bases. Callers needing bulk-by-path
   * (contacts roster name lookup, etc.) reach here instead of touching
   * the persistence chokepoint.
   */
  static async findByPaths(
    paths: readonly string[],
  ): Promise<Template[]> {
    if (paths.length === 0) return [];
    const docs = (await PersistApi.find(
      Template.collectionName,
      { path: { $in: [...paths] } }
    )) as DomainDoc[];
    return Promise.all(docs.map((d) => Template._materialize(d)));
  }

  /**
   * Every Template whose backing `class` is `classPath` — how a
   * catalogue warms BY CLASS rather than by a path prefix, so a second
   * pack shipping (say) a Discipline row under its own root needs no
   * kernel edit (content-packs, the capability rung).
   */
  static async findByClass(classPath: string): Promise<Template[]> {
    const docs = (await PersistApi.find(
      Template.collectionName,
      { class: classPath }
    )) as DomainDoc[];
    const direct = await Promise.all(
      docs.map((d) => Template._materialize(d)),
    );
    return [...direct, ...(await Template.#inheritedMatches(
      (t) => t.class === classPath,
      new Set(direct.map((t) => t.path)),
    ))];
  }

  /**
   * ⚠⚠ **A child that inherits its class is invisible to a raw Mongo
   * query**, and the seven catalogues that warm by class would simply
   * not see it — a roster going quietly short, which this repo has now
   * shipped three times. So {@link findByClass} and
   * {@link findWhereDataHas} UNION their raw hits with every row that
   * names a parent, materialized (and therefore resolved) and kept when
   * the predicate holds of the EFFECTIVE row.
   *
   * One extra query, at boot-warm time, over the rows carrying
   * `extends` — which is a small set by construction and indexed.
   */
  static async #inheritedMatches(
    keep: (t: Template) => boolean,
    already: ReadonlySet<string>,
  ): Promise<Template[]> {
    const docs = (await PersistApi.find(Template.collectionName, {
      extends: { $type: 'string' },
    })) as DomainDoc[];
    const out: Template[] = [];
    for (const d of docs) {
      if (typeof d.path === 'string' && already.has(d.path)) continue;
      const tpl = await Template._materialize(d);
      if (keep(tpl)) out.push(tpl);
    }
    return out;
  }

  /**
   * All Templates whose path begins with `basePath + '/'` — i.e. strict
   * descendants (excludes `basePath` itself).
   */
  /**
   * Every template whose path contains `infix` as a whole run of
   * segments (`'/idea/material/'` → the platform's, the commons' and
   * every trade pack's material rows alike). The root-agnostic sibling
   * of {@link findDescendants}: a reference roster that lives under the
   * same branch in every pack is found by the branch, never by a list
   * of roots.
   */
  static async findByPathInfix(infix: string): Promise<Template[]> {
    const escaped = infix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const docs = (await PersistApi.find(
      Template.collectionName,
      { path: { $regex: escaped } }
    )) as DomainDoc[];
    return Promise.all(docs.map((d) => Template._materialize(d)));
  }

  /**
   * Every template whose `data` block carries `field` — the spawn
   * sweep's candidate query (`censusKey`): a template-derived roster, so
   * a fresh boot can stand a producer's floor at target before any
   * instance of the row exists to copy.
   */
  static async findWhereDataHas(field: string): Promise<Template[]> {
    const docs = (await PersistApi.find(
      Template.collectionName,
      { [`data.${field}`]: { $exists: true } }
    )) as DomainDoc[];
    const direct = await Promise.all(
      docs.map((d) => Template._materialize(d)),
    );
    // Same union as `findByClass`, same reason (see `#inheritedMatches`):
    // the key may be stated only on the parent.
    return [...direct, ...(await Template.#inheritedMatches(
      (t) => field in t.data,
      new Set(direct.map((t) => t.path)),
    ))];
  }

  static async findDescendants(basePath: string): Promise<Template[]> {
    const prefix = basePath.endsWith('/') ? basePath : basePath + '/';
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const docs = (await PersistApi.find(
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
    const doc = (await PersistApi.findById(
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
