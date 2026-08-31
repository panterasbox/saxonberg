/**
 * PersistenceManager - MongoDB singleton with collection-level hook system.
 *
 * Responsibilities:
 * - MongoDB connection management
 * - CRUD operations (save, findById, find, delete)
 * - Collection management
 * - Error handling and retry logic
 * - Connection pooling
 * - Hook registry: middleware-style around-save / around-delete chains
 *   bound to specific (collection, operation) slots, registered by an
 *   administrative manifest at boot.
 *
 * PM is collection-agnostic: it ships with no hooks baked in. Validations
 * and side-effects (e.g. the folder/leaf invariant for `Collections.Content`,
 * Phase 7 Decision 12) attach via `registerHook`. See PHASE_9_PERSISTENCE_HOOKS.md.
 *
 * This is a singleton - only one instance exists per application.
 */

import {
  MongoClient,
  Db,
  Collection,
  ObjectId,
  type IndexSpecification,
  type CreateIndexesOptions,
} from 'mongodb';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { AsyncLocalStorage } from 'node:async_hooks';
import YAML from 'yaml';
import { Collections } from '../mud/lib/persistence/Collections';
import {
  COLLECTION_POLICIES,
  type CollectionPolicy,
} from '../mud/lib/persistence/CollectionPolicy';
import { SchemaDoc } from '../mud/lib/persistence/SchemaDoc';

// ─────────────────────────────────────────────────────────────────────
// The query trace — `SAXONBERG_QUERY_TRACE=1`.
//
// Counts every Mongo op at the chokepoint and attributes it to a chain
// of caller frames, then dumps a table ranked by time-in-Mongo every
// 30 s and on SIGUSR2. Off by default; one boolean test per op when it
// is off, a captured stack per op when it is on.
//
// It exists because a CPU profile is the wrong instrument for this
// process: a boot that is 96% *waiting* shows up as 76% idle, and the
// profile names no query. What you need is the count, the collection,
// and who asked — which is what this prints. The measurement that found
// the content cache: 8 168 ops and 259 s in Mongo across a 270 s boot,
// 7 500 of them by-path reads of a 991-row collection.
//
// Frames inside the persistence and call-security plumbing are skipped,
// so the chain starts at the first line that made a *decision* to read.
// Async frames make the tail approximate — the head is reliable.
// ─────────────────────────────────────────────────────────────────────
const _qtraceOn = process.env.SAXONBERG_QUERY_TRACE === '1';
type _QRow = { n: number; ms: number };
const _qstats = new Map<string, _QRow>();
let _qwired = false;

const _QPLUMBING = [
  'PersistenceManager.ts',
  '/api/persist.ts',
  'Document.ts',
  'security.ts',
  'proxy.ts',
  'execution-context.ts',
  'module.ts',
  'node:internal',
];

function _qcaller(): string {
  const stack = new Error().stack ?? '';
  const frames: string[] = [];
  for (const line of stack.split('\n').slice(2)) {
    if (_QPLUMBING.some((p) => line.includes(p))) continue;
    const m = line.match(/([^()\s/\\]+\.ts):(\d+):\d+/);
    if (!m) continue;
    const f = `${m[1]}:${m[2]}`;
    if (frames[frames.length - 1] === f) continue;
    frames.push(f);
    if (frames.length === 3) break;
  }
  return frames.length > 0 ? frames.join(' < ') : '?';
}

function _qrec(op: string, coll: string, keys: string, t0: number): void {
  const key = `${op} ${coll} {${keys}} ← ${_qcaller()}`;
  const row = _qstats.get(key) ?? { n: 0, ms: 0 };
  row.n += 1;
  row.ms += performance.now() - t0;
  _qstats.set(key, row);
}

function _qdump(label: string): void {
  const rows = [..._qstats.entries()].sort((a, b) => b[1].ms - a[1].ms);
  const totN = rows.reduce((a, r) => a + r[1].n, 0);
  const totMs = rows.reduce((a, r) => a + r[1].ms, 0);
  const lines = [
    `── query trace (${label}) — ${totN} ops, ${(totMs / 1000).toFixed(1)}s in Mongo ──`,
  ];
  for (const [k, v] of rows.slice(0, 40)) {
    lines.push(
      `${String(v.n).padStart(7)}  ${(v.ms / 1000).toFixed(1).padStart(7)}s  ` +
        `${(v.ms / v.n).toFixed(1).padStart(6)}ms  ${k}`
    );
  }
  console.info(lines.join('\n'));
}

function _qwire(): void {
  if (_qwired || !_qtraceOn) return;
  _qwired = true;
  Error.stackTraceLimit = 40;
  setInterval(() => _qdump('interval'), 30_000).unref();
  process.on('SIGUSR2', () => _qdump('SIGUSR2'));
}

/**
 * The MongoDB collection-name vocabulary.
 *
 * Defined in the mudlib (`mud/lib/persistence/Collections`) because it is
 * vocabulary, not mechanism, and mudlib records name their own collection.
 * Re-exported here so PM's own surface — `COLLECTION_POLICIES` is a total
 * `Record<Collections, …>` — keeps one import site for the driver side.
 */
export { Collections };

/**
 * Operations a hook can wrap.
 */
export type HookOperation = 'save' | 'delete';

/**
 * The typed slice of Mongo find options PM's surface speaks.
 */
export interface FindOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  /**
   * Rows to skip before the first returned one.
   *
   * Added for the record layer's window trim, which asks a question no
   * other caller has: *what is the sequence number of my Nth-newest
   * row?* — one indexed lookup that turns "keep the newest N" into a
   * single range delete instead of a count-and-scan.
   */
  skip?: number;
}

/**
 * Around-save hook signature. The hook receives the doc plus a `next`
 * callback that performs (or further dispatches) the actual write.
 */
export type AroundSaveFn = (
  collection: string,
  doc: Record<string, unknown>,
  next: (doc: Record<string, unknown>) => Promise<string>
) => Promise<string>;

/**
 * Around-delete hook signature. The hook receives the doc id plus a `next`
 * callback that performs (or further dispatches) the actual delete.
 */
export type AroundDeleteFn = (
  collection: string,
  id: string,
  next: (id: string) => Promise<void>
) => Promise<void>;

/**
 * Thrown when a hook (or anything called from a hook) re-enters a PM
 * operation against the same `(collection, operation)` slot it is currently
 * executing. Loud failure beats a silent loop.
 */
export class HookReentryError extends Error {
  constructor(collection: string, operation: HookOperation) {
    super(
      `PersistenceManager: hook re-entry detected on (${collection}, ${operation}). ` +
        `A hook attempted a ${operation} against ${collection} from inside its own dispatch.`
    );
    this.name = 'HookReentryError';
  }
}

/**
 * Thrown when a write from circle-scoped context hits a REFUSE-classified
 * collection — the sandbox containment doctrine's "no ungoverned durable
 * mutation" made loud. The scope in the message identifies the offending
 * circle for the receipt trail.
 */
export class SandboxWriteRefusedError extends Error {
  constructor(collection: string, scope: string, operation: string) {
    super(
      `PersistenceManager: ${operation} on '${collection}' refused from ` +
        `circle scope '${scope}' — this collection holds field-real state ` +
        `that a sandbox session may not mutate.`
    );
    this.name = 'SandboxWriteRefusedError';
  }
}

/**
 * The sandbox write-disposition surface, defined in the mudlib
 * (`mud/lib/persistence/CollectionPolicy`) beside the collection
 * vocabulary it is total over. Re-exported here so the driver side keeps
 * one import site for the surface it speaks.
 */
export { COLLECTION_POLICIES };
export type { CollectionPolicy };

/**
 * One index this deployment declares — what `createIndexes()` will issue,
 * and where it came from.
 *
 * Exists as a named shape because the PLAN and the ISSUING are worth
 * separating: the plan is pure and testable, the issuing is I/O with
 * per-index error handling. It also answers an operator question the old
 * 570-line method could not — *what indexes does this build declare?* —
 * without connecting to anything.
 */
export interface PlannedIndex {
  collection: string;
  keys: Record<string, 1 | -1 | 'text'>;
  options: CreateIndexesOptions;
  /** Routed through `ensureTextIndex` rather than a bare `createIndex`. */
  text: boolean;
  /**
   * `authored` — an `indexes[]` entry in a schema doc.
   * `derived` — a consequence of another declaration (the `circleScope`
   * partial on every STAMP collection).
   */
  source: 'authored' | 'derived';
  /** The authored reason, or the derivation's own.  */
  why: string;
}

/**
 * The five STAMP collections — the set that carries scoped rows, gets the
 * partial `circleScope` index, and participates in read filtering + exit
 * discard. Derived from the table so it can't drift.
 */
const STAMP_COLLECTIONS: ReadonlySet<string> = new Set(
  (Object.keys(COLLECTION_POLICIES) as Collections[]).filter(
    (c) => COLLECTION_POLICIES[c].verb === 'stamp'
  )
);

/**
 * The SHADOW(skip) collections — field-truth-only caches whose reads get
 * the residual field-side filter (defensive: no scoped row should ever
 * exist here, and the filter guarantees stale residue never surfaces).
 */
const SHADOW_COLLECTIONS: ReadonlySet<string> = new Set(
  (Object.keys(COLLECTION_POLICIES) as Collections[]).filter(
    (c) => COLLECTION_POLICIES[c].verb === 'shadow'
  )
);

/**
 * The ambient-scope resolver — installed by
 * `BootstrapManager.installFrameworkWiring()` (the `_registerShadowApi` /
 * `setDocumentMarshallerResolver` precedent) so PM stays import-clean of
 * the mud layer. Returns the current circle scope (a parcel path) or
 * `null` for field/system work — the installer maps the omni sentinel to
 * `null` before it reaches PM. Pre-wiring boots see the default `null`
 * resolver (correct: boot is system work).
 */
export type ScopeResolver = () => string | null;

/**
 * Shape of an entry in `hooks.yaml`.
 */
interface HookManifestEntry {
  collection: string;
  operation: HookOperation;
  template: string;
}

interface HookManifest {
  hooks: HookManifestEntry[];
}

/**
 * PersistenceManager - Singleton for MongoDB operations.
 */
export class PersistenceManager {
  private static instance: PersistenceManager;

  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connectionUri: string = '';
  private databaseName: string = 'saxonberg';

  /**
   * The resident `content` cache — path → row, plus the id → path
   * reverse index a write needs to find the entry it is replacing.
   *
   * ⭐ **The whole collection lives here.** `content` is the authored
   * world: ~1 000 rows totalling well under a megabyte, read-mostly,
   * and read by path thousands of times a boot (the clone pipeline's
   * template load, and the zone walk's one read per ancestor). Every
   * one of those was a serialized ~30 ms round trip against a
   * collection small enough to hold whole.
   *
   * **Invalidation is by construction, not by enumeration.** Every
   * write to every collection lands in `persistSave` / `persistDelete`
   * / `deleteMany` on this object, so the cache is updated at the same
   * chokepoint that writes — there is no list of CMS, pack-install,
   * go-live or hot-reload call sites to keep in sync, and adding a new
   * writer cannot forget to invalidate. It follows that the cache is
   * only as authoritative as this process's exclusivity over the
   * collection: a SECOND process writing `content` against the same
   * database would not be seen. One process per database is the
   * deployment (see docs/deployment.md), and the four-database rule
   * keeps the dev worktrees apart.
   *
   * `content` is a sandbox `pass` collection — `composeScopeReadFilter`
   * leaves its queries untouched — so a cached row is the same row
   * every reader would have got, in every scope.
   */
  private contentByPath: Map<string, Record<string, unknown>> | null = null;
  private contentPathById: Map<string, string> = new Map();

  /** In-flight preload, so N concurrent first-readers issue one query. */
  private contentPreload: Promise<void> | null = null;

  /**
   * Writes that landed while the preload query was in flight, replayed
   * onto the map the moment it exists. `doc === null` is a delete.
   */
  private contentPending: Array<{
    id: string;
    doc: Record<string, unknown> | null;
  }> | null = null;

  /**
   * Bumped by every {@link dropContentCache}. A preload that finishes
   * after a drop is holding a snapshot of a collection that has since
   * changed underneath it, and must throw its result away rather than
   * install it.
   */
  private contentGeneration = 0;

  /**
   * Hook registry keyed by `${collection}:${operation}`.
   */
  private saveHooks: Map<string, AroundSaveFn[]> = new Map();
  private deleteHooks: Map<string, AroundDeleteFn[]> = new Map();

  /**
   * Active dispatch slots — for re-entry detection. Tracks which
   * `(collection, operation)` slots are currently executing *within a
   * single dispatch chain*.
   *
   * Carried in AsyncLocalStorage rather than a single global `Set`: the
   * guard exists to catch a hook that, from inside its own dispatch,
   * triggers another save/delete against the SAME slot (genuine
   * re-entry — an infinite hook loop). Because dispatch is async (it
   * awaits the hook chain and the Mongo round-trip), a global set would
   * also flag two INDEPENDENT concurrent operations on the same
   * collection — e.g. two simultaneous logins each saving `users` — whose
   * awaits interleave, throwing a spurious `HookReentryError` on the
   * second. ALS scopes the active set to one async dispatch tree: nested
   * (re-entrant) dispatch inherits the parent's set and is still caught;
   * concurrent independent dispatch gets its own and proceeds.
   */
  private activeSlotsALS: AsyncLocalStorage<Set<string>> =
    new AsyncLocalStorage<Set<string>>();

  /**
   * The installed ambient-scope resolver (see {@link ScopeResolver}).
   * Defaults to "no scope" so pre-wiring boots and tests behave exactly
   * as before the sandbox build.
   */
  /**
   * The authored schema docs, by collection — loaded by `connect()`
   * before `createIndexes()`, which is driven from them.
   */
  private schemaDocs: Map<string, SchemaDoc> = new Map();

  private scopeResolver: ScopeResolver = () => null;

  /**
   * Private constructor (singleton pattern).
   */
  private constructor() {}

  /**
   * Install the ambient-scope resolver. Called once from
   * `BootstrapManager.installFrameworkWiring()`; tests may stub.
   */
  public setScopeResolver(resolver: ScopeResolver): void {
    this.scopeResolver = resolver;
  }

  /**
   * Get the singleton instance.
   */
  public static get(): PersistenceManager {
    if (!this.instance) {
      this.instance = new PersistenceManager();
    }
    return this.instance;
  }

  /**
   * Connect to MongoDB.
   *
   * @param uri - MongoDB connection URI (from env var MONGODB_URI)
   * @param dbName - Database name (default: 'saxonberg')
   */
  public async connect(uri: string, dbName: string = 'saxonberg'): Promise<void> {
    if (this.client) {
      console.warn('PersistenceManager: Already connected to MongoDB');
      return;
    }

    try {
      this.connectionUri = uri;
      this.databaseName = dbName;

      console.info('PersistenceManager: Connecting to MongoDB...');

      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
      });

      await this.client.connect();

      this.db = this.client.db(dbName);

      console.info(`PersistenceManager: Connected to MongoDB database '${dbName}'`);
      _qwire();

      // ⚠ Order matters: the index driver reads the schema docs, so the
      // load has to complete first. It depends on nothing in the mudlib,
      // which is what lets it run this early in the boot.
      this.loadSchemaDocs();

      // Create indexes
      await this.createIndexes();
    } catch (error) {
      console.error('PersistenceManager: Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB.
   */
  public async disconnect(): Promise<void> {
    this.dropContentCache();
    if (!this.client) {
      return;
    }

    try {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.info('PersistenceManager: Disconnected from MongoDB');
    } catch (error) {
      console.error('PersistenceManager: Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get a MongoDB collection.
   *
   * @param collectionName - Name of the collection
   * @returns MongoDB Collection instance
   */
  public getCollection(collectionName: string): Collection {
    if (!this.db) {
      throw new Error('PersistenceManager: Not connected to MongoDB');
    }

    return this.db.collection(collectionName);
  }

  /**
   * Register an around-save or around-delete hook against a
   * `(collection, operation)` slot.
   *
   * Multiple hooks may register against the same slot — they execute in
   * registration order, each receiving `next` to invoke the rest of the
   * chain (terminating in the actual MongoDB write).
   *
   * Today this is privileged only by convention (CODEOWNERS on the
   * manifest file). When the call security framework lands it becomes
   * formally privileged.
   */
  public registerHook(
    collection: string,
    operation: 'save',
    hook: AroundSaveFn
  ): void;
  public registerHook(
    collection: string,
    operation: 'delete',
    hook: AroundDeleteFn
  ): void;
  public registerHook(
    collection: string,
    operation: HookOperation,
    hook: AroundSaveFn | AroundDeleteFn
  ): void {
    const key = `${collection}:${operation}`;
    if (operation === 'save') {
      const list = this.saveHooks.get(key) ?? [];
      list.push(hook as AroundSaveFn);
      this.saveHooks.set(key, list);
    } else {
      const list = this.deleteHooks.get(key) ?? [];
      list.push(hook as AroundDeleteFn);
      this.deleteHooks.set(key, list);
    }
  }

  /**
   * Drop all registered hooks (for testing).
   */
  public clearHooks(): void {
    this.saveHooks.clear();
    this.deleteHooks.clear();
    // No active-slot set to clear: the re-entry guard's set lives in
    // AsyncLocalStorage, scoped to each in-flight dispatch tree and
    // released when that dispatch settles (the finally in `withSlot`).
  }

  /**
   * Save a document (insert or update).
   * If document has _id, updates it; otherwise inserts new document.
   *
   * Dispatches through any registered around-save hooks for this
   * collection. Hooks may transform the doc, short-circuit, or wrap the
   * operation. The terminal `next` performs the MongoDB upsert.
   *
   * @param collectionName - Collection name
   * @param document - Document to save
   * @returns MongoDB _id (as string)
   */
  public async save(
    collectionName: string,
    document: Record<string, unknown>
  ): Promise<string> {
    if (!_qtraceOn) return this.dispatchSave(collectionName, document);
    const _t0 = performance.now();
    const out = await this.dispatchSave(collectionName, document);
    _qrec('save', collectionName, '', _t0);
    return out;
  }

  /**
   * The distinct values of `field` across `collectionName` (the
   * blueprint catalogue's class enumeration). Read-only.
   */
  public async distinct(collectionName: string, field: string): Promise<unknown[]> {
    const _t0 = _qtraceOn ? performance.now() : 0;
    const out = (await this.getCollection(collectionName).distinct(
      field
    )) as unknown[];
    if (_qtraceOn) _qrec('distinct', collectionName, field, _t0);
    return out;
  }

  /**
   * Find a document by MongoDB _id.
   *
   * @param collectionName - Collection name
   * @param id - MongoDB _id (string or ObjectId)
   * @returns Document or null if not found
   */
  public async findById(
    collectionName: string,
    id: string
  ): Promise<Record<string, unknown> | null> {
    const collection = this.getCollection(collectionName);
    const _t0 = _qtraceOn ? performance.now() : 0;

    try {
      const objectId = new ObjectId(id);
      const filter = this.composeScopeReadFilter(collectionName, {
        _id: objectId,
      });
      const doc = await collection.findOne(filter);
      if (_qtraceOn) _qrec('findById', collectionName, '_id', _t0);

      if (doc) {
        // Convert _id to string for consistency
        return {
          ...doc,
          _id: doc._id.toString(),
        };
      }

      return null;
    } catch (error) {
      console.error(`PersistenceManager: Error finding document by id in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find documents matching a query.
   *
   * @param collectionName - Collection name
   * @param query - MongoDB query object
   * @param options - Optional sort / limit (the typed slice of the driver's
   *   find options the logic layer is sanctioned to use)
   * @returns Array of matching documents
   */
  public async find(
    collectionName: string,
    query: Record<string, unknown>,
    options?: FindOptions
  ): Promise<Record<string, unknown>[]> {
    // The resident `content` cache answers a bare by-path read — the
    // clone pipeline's hot query — without touching the network. An
    // `options` (sort/limit/skip) read is not one it serves.
    if (this.contentCacheEngaged(collectionName) && options === undefined) {
      await this.ensureContentCache();
      const cached = this.cachedContentFind(query);
      if (cached !== null) return cached;
    }

    const collection = this.getCollection(collectionName);
    const _t0 = _qtraceOn ? performance.now() : 0;

    try {
      const filtered = this.composeScopeReadFilter(collectionName, query);
      let cursor = collection.find(filtered);
      if (options?.sort) cursor = cursor.sort(options.sort);
      if (options?.skip != null) cursor = cursor.skip(options.skip);
      if (options?.limit != null) cursor = cursor.limit(options.limit);
      const docs = await cursor.toArray();
      if (_qtraceOn)
        _qrec('find', collectionName, Object.keys(query).join(','), _t0);

      // Convert _id to string for each document
      return docs.map((doc) => ({
        ...doc,
        _id: doc._id.toString(),
      }));
    } catch (error) {
      console.error(`PersistenceManager: Error finding documents in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete every document matching `filter`.
   *
   * A bulk maintenance operation (compile-row supersede, scoped-row
   * discard): it does NOT dispatch through the per-id around-delete hook
   * chain — hooks are per-document lifecycle witnesses and a bulk filter
   * has no per-document identity to hand them — but it DOES reserve the
   * `(collection, delete)` slot, so a hook that bulk-deletes its own
   * collection from inside its own dispatch still fails loudly.
   *
   * @returns The number of documents deleted.
   */
  public async deleteMany(
    collectionName: string,
    filter: Record<string, unknown>
  ): Promise<number> {
    // Sandbox policy seam: a scoped context bulk-deletes only its own
    // rows on STAMP collections; REFUSE refuses; SHADOW skips; PASS
    // passes (identity-real bulk deletes, e.g. the compile-row
    // supersede). Field/system contexts pass the filter untouched — the
    // discard path composes its own `{circleScope}` filter.
    const scope = this.scopeResolver();
    let effectiveFilter = filter;
    if (scope !== null) {
      const policy =
        COLLECTION_POLICIES[collectionName as Collections] ?? undefined;
      if (!policy) {
        throw new SandboxWriteRefusedError(
          collectionName,
          scope,
          'deleteMany (unclassified collection)'
        );
      }
      switch (policy.verb) {
        case 'refuse':
          throw new SandboxWriteRefusedError(
            collectionName,
            scope,
            'deleteMany'
          );
        case 'stamp':
          effectiveFilter = { ...filter, circleScope: scope };
          break;
        case 'shadow':
          if (policy.mode === 'skip') return 0;
          break;
        case 'pass':
          break;
      }
    }
    const slot = `${collectionName}:delete`;
    return this.withSlot(slot, collectionName, 'delete', async () => {
      const collection = this.getCollection(collectionName);
      try {
        const result = await collection.deleteMany(effectiveFilter);
        // A bulk filter names no ids to evict — drop the cache whole and
        // let the next reader repopulate it.
        if (collectionName === Collections.Content) this.dropContentCache();
        return result.deletedCount ?? 0;
      } catch (error) {
        console.error(
          `PersistenceManager: Error bulk-deleting from ${collectionName}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Delete a document by MongoDB _id.
   *
   * Dispatches through any registered around-delete hooks for this
   * collection. The terminal `next` performs the MongoDB delete.
   *
   * @param collectionName - Collection name
   * @param id - MongoDB _id (string or ObjectId)
   */
  public async delete(collectionName: string, id: string): Promise<void> {
    return this.dispatchDelete(collectionName, id);
  }

  /**
   * Load and register hooks from a manifest YAML file.
   *
   * Each entry clones the named template via `StuffApi.clone()`, narrows
   * with `MixinApi.isAroundSaveHook` / `isAroundDeleteHook`, and registers
   * the resulting hook against the named `(collection, operation)` slot.
   *
   * Fails loudly on missing template, malformed YAML, or a template whose
   * cloned object doesn't compose the required hook capability.
   *
   * @param yamlPath - Optional override; defaults to
   *   `<src>/mud/platform/idea/hooks/hooks.yaml`.
   */
  public async loadHooks(yamlPath?: string): Promise<void> {
    const path = yamlPath ?? this.defaultHookManifestPath();
    const raw = readFileSync(path, 'utf-8');
    const manifest = YAML.parse(raw) as HookManifest;
    if (!manifest || !Array.isArray(manifest.hooks)) {
      throw new Error(
        `PersistenceManager.loadHooks: malformed manifest at ${path}`
      );
    }

    const { StuffApi } = await import('../mud/api/stuff');
    const { MixinApi } = await import('../mud/api/mixin');
    const { Stuff } = await import('../mud/lib/stuff/Stuff');

    for (const entry of manifest.hooks) {
      if (!entry.collection || !entry.operation || !entry.template) {
        throw new Error(
          `PersistenceManager.loadHooks: malformed entry in ${path}: ${JSON.stringify(entry)}`
        );
      }

      const hook = (await StuffApi.clone(entry.template)) as InstanceType<typeof Stuff>;

      if (entry.operation === 'save') {
        if (!MixinApi.isAroundSaveHook(hook)) {
          throw new Error(
            `PersistenceManager.loadHooks: template ${entry.template} does not compose AroundSaveHookMixin`
          );
        }
        this.registerHook(entry.collection, 'save', (c, doc, next) =>
          hook.aroundSave(c, doc, next)
        );
      } else if (entry.operation === 'delete') {
        if (!MixinApi.isAroundDeleteHook(hook)) {
          throw new Error(
            `PersistenceManager.loadHooks: template ${entry.template} does not compose AroundDeleteHookMixin`
          );
        }
        this.registerHook(entry.collection, 'delete', (c, id, next) =>
          hook.aroundDelete(c, id, next)
        );
      } else {
        throw new Error(
          `PersistenceManager.loadHooks: unknown operation '${entry.operation}' in ${path}`
        );
      }
    }
    console.info(
      `PersistenceManager: Loaded ${manifest.hooks.length} hook binding(s) from ${path}`
    );
  }


  /**
   * Load every authored schema doc from `src/schema/`.
   *
   * The second manifest PM reads at boot, in exactly the shape
   * `loadHooks` established: a path resolved from `import.meta.url`,
   * `readFileSync`, `YAML.parse`. It depends on nothing in the mudlib
   * beyond the pure {@link SchemaDoc} value object, which is what lets it
   * run before `createIndexes()` — i.e. before `PackApi.install`,
   * `loadHooks` and `BootstrapManager`.
   *
   * ⚠⚠ **A missing doc is an error, not a default.** A collection nobody
   * described is precisely the state the schema docs exist to end, so the
   * boot fails naming it rather than papering over it. `pnpm lint:schema`
   * catches this long before a boot does; the runtime check is what makes
   * the gate load-bearing rather than advisory.
   *
   * @param dir Optional override; defaults to `<src>/schema`.
   */
  public loadSchemaDocs(dir?: string): void {
    const directory = dir ?? this.defaultSchemaDir();
    const docs = new Map<string, SchemaDoc>();
    for (const file of readdirSync(directory).sort()) {
      if (!file.endsWith('.yaml')) continue;
      const raw = YAML.parse(readFileSync(join(directory, file), 'utf-8'));
      const doc = SchemaDoc.parse(raw, file);
      if (doc.collection !== file.replace(/\.yaml$/, '')) {
        throw new Error(
          `PersistenceManager.loadSchemaDocs: ${file} declares collection ` +
            `'${doc.collection}' — the filename must be the collection name`
        );
      }
      docs.set(doc.collection, doc);
    }

    // Set equivalence, both directions. Either half being wrong means
    // something is undescribed or something described does not exist.
    const known = new Set<string>(Object.values(Collections));
    const undescribed = [...known].filter((c) => !docs.has(c)).sort();
    if (undescribed.length > 0) {
      throw new Error(
        `PersistenceManager.loadSchemaDocs: no schema doc for ` +
          `${undescribed.join(', ')} — every collection needs one at ` +
          `src/schema/<collection>.yaml`
      );
    }
    const unknown = [...docs.keys()].filter((c) => !known.has(c)).sort();
    if (unknown.length > 0) {
      throw new Error(
        `PersistenceManager.loadSchemaDocs: schema doc(s) for ` +
          `${unknown.join(', ')} name no collection in the vocabulary — ` +
          `run \`pnpm gen:schema\``
      );
    }

    this.schemaDocs = docs;
    console.info(
      `PersistenceManager: Loaded ${docs.size} schema doc(s) from ${directory}`
    );
  }

  /**
   * Resolve the default schema directory relative to this module.
   * `src/backend/PersistenceManager.ts` → `src/schema/`. Works in both
   * ts-source (tsx) and built-dist layouts, like the hook manifest.
   */
  private defaultSchemaDir(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidate = join(here, '../schema');
    return isAbsolute(candidate) ? candidate : join(process.cwd(), candidate);
  }

  /** The authored doc for one collection, or `null` before `connect()`. */
  public schemaDocFor(collection: string): SchemaDoc | null {
    return this.schemaDocs.get(collection) ?? null;
  }

  /** Every authored doc, in collection-name order. */
  public allSchemaDocs(): SchemaDoc[] {
    return [...this.schemaDocs.values()];
  }

  /**
   * Resolve the default hooks.yaml location relative to this module.
   * `src/backend/PersistenceManager.ts` → `src/mud/platform/idea/hooks/hooks.yaml`.
   * Works in both ts-source (tsx) and built-dist layouts.
   */
  private defaultHookManifestPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidate = join(here, '../mud/platform/idea/hooks/hooks.yaml');
    return isAbsolute(candidate) ? candidate : join(process.cwd(), candidate);
  }

  /**
   * Walk the registered save hooks for `collectionName`, then perform the
   * MongoDB upsert. Re-entry into the same slot throws.
   */
  private async dispatchSave(
    collectionName: string,
    document: Record<string, unknown>
  ): Promise<string> {
    // Sandbox policy seam: one resolver call; `null` (the overwhelmingly
    // common case) falls straight through to today's path with no
    // allocation and no policy lookup.
    const scope = this.scopeResolver();
    if (scope !== null) {
      const policy =
        COLLECTION_POLICIES[collectionName as Collections] ?? undefined;
      if (policy) {
        switch (policy.verb) {
          case 'refuse':
            throw new SandboxWriteRefusedError(collectionName, scope, 'save');
          case 'stamp':
            document.circleScope = scope;
            break;
          case 'pass':
            if (policy.mark) document.circleScope = scope;
            break;
          case 'shadow':
            // skip-and-rebuild: the terminal cache write is a documented
            // no-op from circle context — readers derive live from their
            // event ledgers instead. The returned id is a local receipt,
            // never a durable identifier.
            if (policy.mode === 'skip') {
              return document._id != null
                ? String(document._id)
                : new ObjectId().toString();
            }
            break;
        }
      }
      // An unknown collection name (not in the enum) written from circle
      // context fails closed — the totality guarantee has no row to
      // consult, and silence would be an escape hatch.
      if (!policy) {
        throw new SandboxWriteRefusedError(
          collectionName,
          scope,
          'save (unclassified collection)'
        );
      }
    }
    const slot = `${collectionName}:save`;
    return this.withSlot(slot, collectionName, 'save', async () => {
      const hooks = this.saveHooks.get(slot) ?? [];
      const terminal = (doc: Record<string, unknown>): Promise<string> =>
        this.persistSave(collectionName, doc);
      let next = terminal;
      for (let i = hooks.length - 1; i >= 0; i--) {
        const hook = hooks[i]!;
        const continuation = next;
        next = (doc) => hook(collectionName, doc, continuation);
      }
      return next(document);
    });
  }

  /**
   * Reserve a dispatch `slot` for the duration of `body`, scoped to the
   * current async dispatch tree (see `activeSlotsALS`). Genuine re-entry
   * into the same slot from within `body` (a hook re-saving its own
   * collection) throws `HookReentryError`; independent concurrent
   * dispatch on the same slot runs in its own store and is unaffected.
   */
  private async withSlot<T>(
    slot: string,
    collectionName: string,
    operation: 'save' | 'delete',
    body: () => Promise<T>
  ): Promise<T> {
    const existing = this.activeSlotsALS.getStore();
    const active = existing ?? new Set<string>();
    if (active.has(slot)) {
      throw new HookReentryError(collectionName, operation);
    }
    const run = async (): Promise<T> => {
      active.add(slot);
      try {
        return await body();
      } finally {
        active.delete(slot);
      }
    };
    // A top-level dispatch establishes the tree's store; nested
    // (re-entrant) dispatch inherits it via getStore().
    return existing ? run() : this.activeSlotsALS.run(active, run);
  }

  /**
   * Walk the registered delete hooks for `collectionName`, then perform
   * the MongoDB delete. Re-entry into the same slot throws.
   */
  private async dispatchDelete(collectionName: string, id: string): Promise<void> {
    // Sandbox policy seam (mirror of dispatchSave): a scoped context may
    // delete only rows carrying its OWN scope on STAMP collections (the
    // terminal filter composes `circleScope`), REFUSE refuses, PASS
    // passes (identity-real deletes, e.g. belief forget), SHADOW skips.
    const scope = this.scopeResolver();
    let scopeGuard: string | null = null;
    if (scope !== null) {
      const policy =
        COLLECTION_POLICIES[collectionName as Collections] ?? undefined;
      if (!policy) {
        throw new SandboxWriteRefusedError(
          collectionName,
          scope,
          'delete (unclassified collection)'
        );
      }
      switch (policy.verb) {
        case 'refuse':
          throw new SandboxWriteRefusedError(collectionName, scope, 'delete');
        case 'stamp':
          scopeGuard = scope;
          break;
        case 'shadow':
          if (policy.mode === 'skip') return;
          break;
        case 'pass':
          break;
      }
    }
    const slot = `${collectionName}:delete`;
    await this.withSlot(slot, collectionName, 'delete', async () => {
      const hooks = this.deleteHooks.get(slot) ?? [];
      const terminal = (idArg: string): Promise<void> =>
        this.persistDelete(collectionName, idArg, scopeGuard);
      let next = terminal;
      for (let i = hooks.length - 1; i >= 0; i--) {
        const hook = hooks[i]!;
        const continuation = next;
        next = (idArg) => hook(collectionName, idArg, continuation);
      }
      await next(id);
    });
  }

  /**
   * Compose the sandbox read filter for `collectionName` into `query`
   * (Decision F, docs/subsystems/sandbox.md):
   *
   *   - STAMP collections: field context gets the residual predicate
   *     `circleScope: {$exists: false}` (existing indexes still drive the
   *     query — the predicate only filters scoped residue); circle
   *     context gets `$or: [field rows, own-scope rows]` (global ∪ own).
   *   - SHADOW(skip) collections: both contexts get the field-side
   *     residual filter — the caches are field truth only, and stale
   *     scoped residue must never surface.
   *   - PASS / REFUSE collections: NO injection, ever (the checkable
   *     inertness criterion).
   *
   * A query that already names `circleScope` or `$or` is passed through
   * untouched — the discard path composes its own scope filter.
   */
  private composeScopeReadFilter(
    collectionName: string,
    query: Record<string, unknown>
  ): Record<string, unknown> {
    const isStamp = STAMP_COLLECTIONS.has(collectionName);
    const isShadow = !isStamp && SHADOW_COLLECTIONS.has(collectionName);
    if (!isStamp && !isShadow) return query;
    if ('circleScope' in query || '$or' in query) return query;

    const scope = this.scopeResolver();
    if (isStamp && scope !== null) {
      // circle context: global ∪ own-scope
      return {
        ...query,
        $or: [
          { circleScope: { $exists: false } },
          { circleScope: scope },
        ],
      };
    }
    // field context on STAMP, any context on SHADOW: field rows only
    return { ...query, circleScope: { $exists: false } };
  }

  /**
   * Whether the resident cache may answer for `collectionName`.
   *
   * Two conditions, and both are load-bearing:
   *
   * - **A live connection.** The cache is a property of one process
   *   owning one database; a `PersistenceManager` with a stubbed
   *   collection and no `db` (every unit test) reads through, so no
   *   test inherits another's cached rows.
   * - **The sandbox policy is still `pass`.** A cached row is one row
   *   for every reader; that is only true while `content` is neither
   *   STAMP nor SHADOW. Should the policy ever change, the cache
   *   disengages itself rather than serving one circle's row to
   *   another.
   */
  private contentCacheEngaged(collectionName?: string): boolean {
    if ((collectionName ?? Collections.Content) !== Collections.Content)
      return false;
    if (this.db === null) return false;
    return (
      !STAMP_COLLECTIONS.has(Collections.Content) &&
      !SHADOW_COLLECTIONS.has(Collections.Content)
    );
  }

  /**
   * Load every `content` row into {@link contentByPath}. Idempotent and
   * concurrency-safe: the first caller issues the query, the rest await
   * the same promise.
   *
   * A row that cannot be structured-cloned is left OUT of the map — it
   * then simply misses and falls through to Mongo, which is the same
   * answer, slower. That keeps an exotic BSON value from turning a
   * performance cache into a correctness bug.
   *
   * ⚠ A write that lands WHILE the preload query is in flight is not in
   * the snapshot the query returns, and has no map to fold itself into
   * — so it is buffered and replayed once the map exists. Without that,
   * a row written in the window between issuing `find({})` and
   * assigning the map would be invisible for the life of the cache.
   *
   * ⚠ A *bulk delete* in that same window cannot be replayed — its
   * filter names no ids — so it bumps a generation instead, and a
   * preload that finishes on a stale generation discards its snapshot
   * rather than installing rows the delete has already removed.
   */
  private async ensureContentCache(): Promise<void> {
    if (this.contentByPath !== null) return;
    if (this.contentPreload !== null) return this.contentPreload;

    this.contentPending = [];
    const generation = this.contentGeneration;
    this.contentPreload = (async () => {
      const docs = await this.getCollection(Collections.Content)
        .find({})
        .toArray();
      // A bulk delete landed while this query was in flight: the rows it
      // removed are still in this snapshot. Discard it — the next reader
      // preloads again against the collection as it now stands.
      if (this.contentGeneration !== generation) return;
      const byPath = new Map<string, Record<string, unknown>>();
      const pathById = new Map<string, string>();
      let skipped = 0;
      for (const raw of docs) {
        const doc = { ...raw, _id: raw._id.toString() } as Record<
          string,
          unknown
        >;
        const path = doc.path;
        if (typeof path !== 'string') continue;
        try {
          structuredClone(doc);
        } catch {
          skipped += 1;
          continue;
        }
        byPath.set(path, doc);
        pathById.set(doc._id as string, path);
      }
      this.contentByPath = byPath;
      this.contentPathById = pathById;
      // Replay anything written under us, in the order it was written.
      const pending = this.contentPending ?? [];
      this.contentPending = null;
      for (const w of pending) {
        if (w.doc === null) this.noteContentDelete(w.id);
        else this.noteContentSave(w.doc, w.id);
      }
      console.info(
        `PersistenceManager: ${byPath.size} content row(s) resident` +
          (skipped > 0 ? ` (${skipped} uncacheable, read through)` : '')
      );
    })();

    try {
      await this.contentPreload;
    } finally {
      this.contentPreload = null;
      this.contentPending = null;
    }
  }

  /**
   * The cached answer to `find(content, { path })`, or `null` when this
   * query is not one the cache can answer.
   *
   * A MISS is an answer: the map holds the whole collection, so an
   * absent path means an absent row. That matters more than the hits —
   * the zone walk asks for ancestor paths that mostly do not exist, and
   * every one of those used to be a round trip to learn nothing.
   */
  private cachedContentFind(
    query: Record<string, unknown>
  ): Record<string, unknown>[] | null {
    const byPath = this.contentByPath;
    if (byPath === null) return null;
    const keys = Object.keys(query);
    if (keys.length !== 1 || keys[0] !== 'path') return null;
    const path = query.path;
    if (typeof path !== 'string') return null;
    const doc = byPath.get(path);
    return doc === undefined ? [] : [structuredClone(doc)];
  }

  /**
   * Fold a written row into the cache. Handles the re-path case (a
   * `mv` in the content tree keeps the `_id` and changes the `path`)
   * by evicting whatever path that id held before.
   */
  private noteContentSave(doc: Record<string, unknown>, id: string): void {
    const byPath = this.contentByPath;
    if (byPath === null) {
      // Mid-preload: the snapshot in flight predates this write.
      this.contentPending?.push({ id, doc });
      return;
    }
    const previous = this.contentPathById.get(id);
    if (previous !== undefined) byPath.delete(previous);
    const path = doc.path;
    if (typeof path !== 'string') {
      // A row with no path is one the cache cannot address; forget the
      // id too, or the index keeps pointing at a path it no longer has.
      this.contentPathById.delete(id);
      return;
    }
    const stored = { ...doc, _id: id };
    try {
      structuredClone(stored);
    } catch {
      // Uncacheable: drop the entry so reads fall through to Mongo.
      this.contentPathById.delete(id);
      return;
    }
    byPath.set(path, stored);
    this.contentPathById.set(id, path);
  }

  /** Evict the row `id` held. */
  private noteContentDelete(id: string): void {
    const byPath = this.contentByPath;
    if (byPath === null) {
      this.contentPending?.push({ id, doc: null });
      return;
    }
    const path = this.contentPathById.get(id);
    if (path !== undefined) byPath.delete(path);
    this.contentPathById.delete(id);
  }

  /**
   * Drop the cache whole. The answer for a bulk delete (whose filter
   * names no ids to evict) and for disconnect.
   */
  private dropContentCache(): void {
    this.contentByPath = null;
    this.contentPathById = new Map();
    this.contentPending = null;
    this.contentGeneration += 1;
  }

  /**
   * Terminal save: the actual MongoDB upsert.
   */
  private async persistSave(
    collectionName: string,
    document: Record<string, unknown> & { _id?: unknown }
  ): Promise<string> {
    const collection = this.getCollection(collectionName);

    try {
      if (document._id) {
        const id =
          typeof document._id === 'string'
            ? new ObjectId(document._id)
            : (document._id as ObjectId);

        // Strip _id before $set — MongoDB rejects updates that touch it.
        const updateDoc: Record<string, unknown> = { ...document };
        delete updateDoc._id;

        await collection.updateOne({ _id: id }, { $set: updateDoc });

        const savedId = String(document._id);
        if (this.contentCacheEngaged(collectionName))
          this.noteContentSave(document, savedId);
        return savedId;
      } else {
        const result = await collection.insertOne(document as Parameters<typeof collection.insertOne>[0]);
        const savedId = result.insertedId.toString();
        if (this.contentCacheEngaged(collectionName))
          this.noteContentSave(document, savedId);
        return savedId;
      }
    } catch (error) {
      console.error(
        `PersistenceManager: Error saving document to ${collectionName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Terminal delete: the actual MongoDB deletion. When `scopeGuard` is
   * set (a scoped delete on a STAMP collection), the filter composes
   * `circleScope` so a circle can only ever delete its own rows.
   */
  private async persistDelete(
    collectionName: string,
    id: string,
    scopeGuard: string | null = null
  ): Promise<void> {
    const collection = this.getCollection(collectionName);
    try {
      const objectId = new ObjectId(id);
      const filter: Record<string, unknown> =
        scopeGuard !== null
          ? { _id: objectId, circleScope: scopeGuard }
          : { _id: objectId };
      await collection.deleteOne(filter);
      if (this.contentCacheEngaged(collectionName)) this.noteContentDelete(id);
    } catch (error) {
      console.error(
        `PersistenceManager: Error deleting document from ${collectionName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create ONE text index, replacing a differently-shaped one.
   *
   * ⚠⚠ **Mongo allows exactly one text index per collection**, and
   * `createIndex` on a second SHAPE does not merge or no-op — it throws
   * `CannotCreateIndex`, which (before the per-index isolation below)
   * aborted every remaining index in the whole boot.
   *
   * Found by driving: a dev database carrying an older `{body:'text'}`
   * on `player_frames` rejected the compound `{owner:1, body:'text'}`,
   * and the failure was survivable-looking — the server booted, and
   * `recall` quietly fell back to its bounded scan **forever**. A search
   * that silently stops using its index is exactly the kind of
   * degradation nothing complains about.
   *
   * ⭐ Dropping and recreating is safe here in a way it would not be for
   * a unique or a TTL index: a text index is a pure derived structure
   * over data that is still there, so the rebuild costs time and
   * nothing else.
   */
  private async ensureTextIndex(
    collection: string,
    spec: Record<string, 1 | -1 | 'text'>
  ): Promise<void> {
    const coll = this.getCollection(collection);
    try {
      await coll.createIndex(spec);
      return;
    } catch (error) {
      const code = (error as { code?: number }).code;
      // 67 CannotCreateIndex (a second text index) / 85
      // IndexOptionsConflict (same name, different shape).
      if (code !== 67 && code !== 85) throw error;
    }
    const existing = await coll.indexes();
    for (const index of existing) {
      const isText = Object.values(index.key ?? {}).includes('text');
      if (!isText || !index.name) continue;
      console.warn(
        `PersistenceManager: replacing text index '${index.name}' on ` +
          `${collection} — its shape no longer matches what the code asks ` +
          `for, and a stale one makes every text query silently fall back.`
      );
      await coll.dropIndex(index.name);
    }
    await coll.createIndex(spec);
  }

  /**
   * Declared document kinds: one `{kind, data.<naturalKey>}` unique index
   * per flat-key kind, partial on the kind so path-keyed kinds and
   * free-form kinds never collide. Lazy import: the vocabulary is
   * import-free today, but PM must never statically import mudlib models
   * — the cycle risk is structural, not current.
   */
  async #createDocumentKindIndexes(coll: {
    createIndex(spec: Record<string, unknown>, opts?: Record<string, unknown>): Promise<unknown>;
  }): Promise<void> {
    const { DOCUMENT_KINDS } = await import('../mud/lib/document/DocumentKinds');
    for (const spec of Object.values(DOCUMENT_KINDS)) {
      if (spec.naturalKey === null) continue;
      await coll.createIndex(
        { kind: 1, [`data.${spec.naturalKey}`]: 1 },
        { unique: true, partialFilterExpression: { kind: spec.kind } }
      );
    }
  }

  /** The driver collection narrowed to the one call the kind indexes need. */
  #indexTarget(coll: Collection): {
    createIndex(spec: Record<string, unknown>, opts?: Record<string, unknown>): Promise<unknown>;
  } {
    return {
      createIndex: (spec, opts) =>
        coll.createIndex(spec as IndexSpecification, opts as CreateIndexesOptions),
    };
  }

  /** Test seam for `#createDocumentKindIndexes`. Not used at runtime. */
  async runDocumentKindIndexesForTest(coll: {
    createIndex(spec: Record<string, unknown>, opts?: Record<string, unknown>): Promise<unknown>;
  }): Promise<void> {
    return this.#createDocumentKindIndexes(coll);
  }

  /**
   * Build every index the world needs. Called from `connect()`, after
   * `loadSchemaDocs()`.
   *
   * This used to be 570 lines of hand-written `createIndex` calls. It is
   * now a driver over three sources, and the split is the design:
   *
   *   1. **Authored** — every `indexes[]` entry in every schema doc. The
   *      key spec and its options are data; the reason it exists is prose
   *      beside them, which is the half that used to live only in a
   *      comment nobody could read from in-game.
   *   2. **Text** — an authored index with `text: true`, routed through
   *      {@link ensureTextIndex}, whose drop-and-recreate-on-conflict
   *      recovery is BEHAVIOUR and stays here.
   *   3. **Derived** — the two loops over another vocabulary: the
   *      `circleScope` partial index on every STAMP collection, and the
   *      `{ kind, data.<naturalKey> }` partial-unique index per declared
   *      document kind. These are consequences of another declaration,
   *      not authored facts; writing them out per collection would be the
   *      duplication the schema docs refuse.
   *
   * ⭐ Declaring `sandbox: stamp` in a doc is now what gives a collection
   * its `circleScope` index — `STAMP_COLLECTIONS` derives from
   * `COLLECTION_POLICIES`, which is generated from the docs. No list.
   *
   * ⭐⭐ **Every index is attempted independently.** The predecessor wrapped
   * the whole list in one `try`, so the FIRST failure skipped every index
   * after it — found by driving, when a stale text index on
   * `player_frames` silently took the wiki index, the forum index and
   * every sandbox partial with it. Per-index isolation was called "a large
   * mechanical rewrite" while the calls were written out by hand; over a
   * loop it is free, so the hazard is gone rather than documented.
   * Indexes are optional for correctness and load-bearing for speed,
   * which is exactly the combination that makes a silent skip survive.
   */
  private async createIndexes(): Promise<void> {
    let built = 0;
    const failures: string[] = [];

    const attempt = async (
      label: string,
      run: () => Promise<unknown>
    ): Promise<void> => {
      try {
        await run();
        built += 1;
      } catch (error) {
        failures.push(label);
        console.error(
          `PersistenceManager: index ${label} NOT built — the queries it ` +
            `serves will fall back to a collection scan:`,
          error
        );
      }
    };

    for (const index of this.plannedIndexes()) {
      const label = `${index.collection} ${JSON.stringify(index.keys)}`;
      if (index.text) {
        await attempt(label, () =>
          this.ensureTextIndex(index.collection, index.keys)
        );
        continue;
      }
      await attempt(label, () =>
        this.getCollection(index.collection).createIndex(
          index.keys as IndexSpecification,
          index.options
        )
      );
    }

    // The other derived loop: one `{kind, data.<naturalKey>}`
    // partial-unique index per declared document kind. It stays outside
    // the plan because the vocabulary is a lazy import — PM must never
    // statically import a mudlib model, and the cycle risk is structural
    // rather than current.
    await attempt('documents (declared kinds)', () =>
      this.#createDocumentKindIndexes(
        this.#indexTarget(this.getCollection(Collections.Documents))
      )
    );

    if (failures.length === 0) {
      console.info(`PersistenceManager: ${built} indexes created successfully`);
    } else {
      console.error(
        `PersistenceManager: ${built} indexes built, ${failures.length} ` +
          `FAILED (${failures.join('; ')}). Every other index was still ` +
          `attempted.`
      );
    }
  }

  /**
   * Every index this deployment declares, in a stable order: the authored
   * ones from the schema docs, then the derived `circleScope` partials.
   *
   * Pure — no I/O, no connection. `createIndexes()` issues it; a test can
   * assert it; an operator can print it.
   */
  public plannedIndexes(): PlannedIndex[] {
    const plan: PlannedIndex[] = [];

    for (const doc of this.schemaDocs.values()) {
      for (const index of doc.indexes) {
        const options: CreateIndexesOptions = {};
        if (index.unique) options.unique = true;
        if (index.collation) {
          options.collation =
            index.collation as unknown as CreateIndexesOptions['collation'];
        }
        if (index.expireAfterSeconds !== undefined) {
          options.expireAfterSeconds = index.expireAfterSeconds;
        }
        if (index.partialFilterExpression) {
          options.partialFilterExpression = index.partialFilterExpression;
        }
        plan.push({
          collection: doc.collection,
          keys: { ...index.keys },
          options,
          text: index.text === true,
          source: 'authored',
          why: index.why,
        });
      }
    }

    // ⭐ Derived from the sandbox policy, which is generated from the same
    // docs — so declaring `sandbox: stamp` is what gives a collection its
    // `circleScope` index. There is no list to keep in step.
    for (const collection of STAMP_COLLECTIONS) {
      plan.push({
        collection,
        keys: { circleScope: 1 },
        options: {
          partialFilterExpression: { circleScope: { $exists: true } },
        },
        text: false,
        source: 'derived',
        why:
          'serves circle-side $or reads and exit\'s ' +
          'deleteMany({circleScope}) while costing nothing for the ' +
          '(overwhelming) unscoped majority. Partial beats sparse: same ' +
          'storage win, clearer semantics.',
      });
    }

    return plan;
  }

  /**
   * Check if connected to MongoDB.
   */
  public isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  /**
   * Get the database instance (for advanced operations).
   */
  public getDatabase(): Db | null {
    return this.db;
  }
}
