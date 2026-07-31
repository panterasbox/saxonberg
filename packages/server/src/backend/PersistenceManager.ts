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
 * and side-effects (e.g. the folder/leaf invariant for `Collections.Domain`,
 * Phase 7 Decision 12) attach via `registerHook`. See PHASE_9_PERSISTENCE_HOOKS.md.
 *
 * This is a singleton - only one instance exists per application.
 */

import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { AsyncLocalStorage } from 'node:async_hooks';
import YAML from 'yaml';
import { Collections } from '../mud/lib/persistence/Collections';

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
 * Per-collection sandbox write disposition (docs/subsystems/sandbox.md):
 *
 *   - `stamp`  — the write proceeds with `circleScope` stamped on the row;
 *     field reads exclude stamped rows; exit discards them. The material
 *     ledgers: the game genuinely runs in-circle, then reverts.
 *   - `refuse` — circle context may not write here at all (field-real
 *     registries, identity, title, config). Throws.
 *   - `pass`   — the write is identity-real and persists (authored truth,
 *     the epistemic ledgers). `mark: true` additionally records the scope
 *     on the row (the epistemic wire mark) without ever filtering reads.
 *   - `shadow` — rebuildable caches. `mode: 'skip'` silently skips the
 *     terminal write from circle context (readers derive live from their
 *     event ledgers in-circle). `mode: 'overlay'` is specified as the
 *     labeled attach point but not built — no collection needs it today.
 */
export type CollectionPolicy =
  | { verb: 'stamp' }
  | { verb: 'refuse' }
  | { verb: 'pass'; mark?: boolean }
  | { verb: 'shadow'; mode: 'skip' | 'overlay' };

/**
 * The total policy table — `Record<Collections, …>` makes totality a
 * COMPILE error: a new collection cannot ship without a policy row (fails
 * closed at build time, not at an audit). Verified writer-by-writer in
 * docs/subsystems/sandbox.md; keep the two in sync.
 */
export const COLLECTION_POLICIES: Readonly<
  Record<Collections, CollectionPolicy>
> = {
  // ── STAMP: the material gameplay ledgers — run in-circle, revert ──
  [Collections.BankLedger]: { verb: 'stamp' },
  [Collections.Transcripts]: { verb: 'stamp' },
  [Collections.RenownEvents]: { verb: 'stamp' },
  [Collections.ParticipationEvents]: { verb: 'stamp' },
  [Collections.DispositionEvents]: { verb: 'stamp' },
  // ── PASS(mark): the epistemic ledgers — persist, wire-marked ──
  [Collections.Chronicles]: { verb: 'pass', mark: true },
  [Collections.Beliefs]: { verb: 'pass', mark: true },
  [Collections.AuthoringEvents]: { verb: 'pass', mark: true },
  [Collections.AccountabilityEvents]: { verb: 'pass', mark: true },
  [Collections.Diagnostics]: { verb: 'pass', mark: true },
  // ── PASS(unmarked): authored truth + the mechanism's own stores ──
  [Collections.Domain]: { verb: 'pass' },
  [Collections.Documents]: { verb: 'pass' },
  [Collections.HolderSnapshots]: { verb: 'pass' },
  // ── SHADOW(skip): rebuildable caches — skip-and-rebuild ──
  [Collections.BankAccounts]: { verb: 'shadow', mode: 'skip' },
  [Collections.BankSupply]: { verb: 'shadow', mode: 'skip' },
  [Collections.Renown]: { verb: 'shadow', mode: 'skip' },
  [Collections.Participation]: { verb: 'shadow', mode: 'skip' },
  [Collections.Producer]: { verb: 'shadow', mode: 'skip' },
  // ── REFUSE: field-real registries, identity, title, config ──
  [Collections.Users]: { verb: 'refuse' },
  [Collections.GoogleProfiles]: { verb: 'refuse' },
  [Collections.TwitchProfiles]: { verb: 'refuse' },
  [Collections.KickProfiles]: { verb: 'refuse' },
  [Collections.Emotes]: { verb: 'refuse' },
  [Collections.NameBanks]: { verb: 'refuse' },
  [Collections.Groups]: { verb: 'refuse' },
  [Collections.Channels]: { verb: 'refuse' },
  [Collections.Parties]: { verb: 'refuse' },
  [Collections.ForumSubjects]: { verb: 'refuse' },
  [Collections.ForumBoards]: { verb: 'refuse' },
  [Collections.ForumEntries]: { verb: 'refuse' },
  [Collections.ForumVotes]: { verb: 'refuse' },
  [Collections.ForumEvents]: { verb: 'refuse' },
  [Collections.ProducerEvents]: { verb: 'refuse' },
  [Collections.Positions]: { verb: 'refuse' },
  [Collections.Recipes]: { verb: 'refuse' },
  [Collections.Bulletins]: { verb: 'refuse' },
  [Collections.Parcels]: { verb: 'refuse' },
  [Collections.ParcelEvents]: { verb: 'refuse' },
  [Collections.Contracts]: { verb: 'refuse' },
  [Collections.ContractEvents]: { verb: 'refuse' },
  [Collections.Chattel]: { verb: 'refuse' },
  [Collections.ChattelEvents]: { verb: 'refuse' },
  [Collections.AppSettings]: { verb: 'refuse' },
  [Collections.WorldState]: { verb: 'refuse' },
  [Collections.OfficeHolders]: { verb: 'refuse' },
  // Audit-flipped from provisional PASS (2026-07-30): blueprint dedup
  // OVERWRITES an existing global catalogue row's identity fields on a
  // signature hit — field-visible mutation, so it fails closed. The CMS
  // publish path is unaffected (the acting avatar resolves to the parked
  // field body, whose scope is null). media_assets' only writer is the
  // offline illustrate CLI; no circle path should ever reach it.
  [Collections.Blueprints]: { verb: 'refuse' },
  [Collections.MediaAssets]: { verb: 'refuse' },
};

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
    return this.dispatchSave(collectionName, document);
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

    try {
      const objectId = new ObjectId(id);
      const filter = this.composeScopeReadFilter(collectionName, {
        _id: objectId,
      });
      const doc = await collection.findOne(filter);

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
    const collection = this.getCollection(collectionName);

    try {
      const filtered = this.composeScopeReadFilter(collectionName, query);
      let cursor = collection.find(filtered);
      if (options?.sort) cursor = cursor.sort(options.sort);
      if (options?.limit != null) cursor = cursor.limit(options.limit);
      const docs = await cursor.toArray();

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
   *   `<src>/mud/obj/hooks/hooks.yaml`.
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
   * Resolve the default hooks.yaml location relative to this module.
   * `src/backend/PersistenceManager.ts` → `src/mud/obj/hooks/hooks.yaml`.
   * Works in both ts-source (tsx) and built-dist layouts.
   */
  private defaultHookManifestPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidate = join(here, '../mud/obj/hooks/hooks.yaml');
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

        return String(document._id);
      } else {
        const result = await collection.insertOne(document as Parameters<typeof collection.insertOne>[0]);
        return result.insertedId.toString();
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
    } catch (error) {
      console.error(
        `PersistenceManager: Error deleting document from ${collectionName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create indexes for collections.
   * Called during connection setup.
   */
  private async createIndexes(): Promise<void> {
    try {
      // Google Profiles: unique index on googleId
      await this.getCollection(Collections.GoogleProfiles).createIndex(
        { googleId: 1 },
        { unique: true }
      );

      // Google Profiles: index on email
      await this.getCollection(Collections.GoogleProfiles).createIndex(
        { email: 1 }
      );

      // Users: index on googleProfileId
      await this.getCollection(Collections.Users).createIndex(
        { googleProfileId: 1 }
      );

      // Users: index on twitchProfileId (the second provider FK).
      await this.getCollection(Collections.Users).createIndex(
        { twitchProfileId: 1 }
      );

      // Users: index on kickProfileId (the third provider FK).
      await this.getCollection(Collections.Users).createIndex(
        { kickProfileId: 1 }
      );

      // Twitch Profiles: unique index on twitchUserId (the stable Helix
      // identifier the returning-login resolve keys on).
      await this.getCollection(Collections.TwitchProfiles).createIndex(
        { twitchUserId: 1 },
        { unique: true }
      );

      // Kick Profiles: unique index on kickUserId (the stable identifier
      // the returning-login resolve keys on).
      await this.getCollection(Collections.KickProfiles).createIndex(
        { kickUserId: 1 },
        { unique: true }
      );

      // Domain: unique index on `path` — every Template doc carries a
      // `path` field, and the seeder + boot-time clone pipeline both
      // assume it is one document per path. Without this index,
      // concurrent `SeederManager.run` invocations (e.g. two
      // tsx-watch processes racing during dev) double-insert and
      // `BootstrapManager.run` crashes with a duplicate-templatePath
      // error on the next boot. `createIndex` is idempotent — same
      // spec is a no-op; an existing duplicate throws E11000 here,
      // which the outer catch logs without crashing the process,
      // surfacing the admin-fixable condition.
      await this.getCollection(Collections.Domain).createIndex(
        { path: 1 },
        { unique: true }
      );

      // Emotes: unique verb + alias index for verb-resolve hot path.
      await this.getCollection(Collections.Emotes).createIndex(
        { verb: 1 },
        { unique: true }
      );
      await this.getCollection(Collections.Emotes).createIndex({ aliases: 1 });

      // Name banks: unique key for the char-gen suggester's by-key resolve.
      await this.getCollection(Collections.NameBanks).createIndex(
        { key: 1 },
        { unique: true }
      );

      // Recipes: unique recipeId for catalogue resolve.
      await this.getCollection(Collections.Recipes).createIndex(
        { recipeId: 1 },
        { unique: true }
      );

      // Blueprints: unique blueprintId (durable key, catalogue resolve) +
      // unique signature (the structural dedup key — two authors composing
      // the same particles collide to one blueprint).
      await this.getCollection(Collections.Blueprints).createIndex(
        { blueprintId: 1 },
        { unique: true }
      );
      await this.getCollection(Collections.Blueprints).createIndex(
        { signature: 1 },
        { unique: true }
      );

      // Bulletins: unique bulletinId for the edit/retract address + the
      // window/archive de-dup. The compound { realm, kind, publishedAt:-1 }
      // serves the REST archive query (realm/kind filter, recency-desc page).
      await this.getCollection(Collections.Bulletins).createIndex(
        { bulletinId: 1 },
        { unique: true }
      );
      await this.getCollection(Collections.Bulletins).createIndex({
        realm: 1,
        kind: 1,
        publishedAt: -1,
      });

      // Groups: queryable owner / member shape (Phase 2B).
      await this.getCollection(Collections.Groups).createIndex({ owner: 1 });
      await this.getCollection(Collections.Groups).createIndex({ memberIds: 1 });

      // Channels: name unique + memberIds (for "channels I'm in"
      // lookups) + kind (Phase 3).
      await this.getCollection(Collections.Channels).createIndex(
        { name: 1 },
        { unique: true }
      );
      await this.getCollection(Collections.Channels).createIndex({
        memberIds: 1,
      });
      await this.getCollection(Collections.Channels).createIndex({ kind: 1 });

      // Parties: durable-party records (PartyRecord; ad-hoc parties are
      // live Ideas only, never written). `path` (the party Idea's
      // templatePath) is the durable join key; `name` unique for the
      // clash check; `memberIds` for the "durable crews I'm on" read.
      await this.getCollection(Collections.Parties).createIndex(
        { path: 1 },
        { unique: true }
      );
      await this.getCollection(Collections.Parties).createIndex(
        { name: 1 },
        { unique: true }
      );
      await this.getCollection(Collections.Parties).createIndex({
        memberIds: 1,
      });

      // Beliefs: per-viewer identity-memory working set (one doc per
      // {viewerId, realm, referent}). Indexed on `viewerId` so a
      // session's lazy-hydrate (`BeliefDocument.find({ viewerId })`) and
      // the future per-player cleanup cascade (`deleteMany({ viewerId })`)
      // are O(rows-for-this-viewer), not a full scan.
      await this.getCollection(Collections.Beliefs).createIndex({
        viewerId: 1,
      });
      // Reverse direction: "all beliefs held *toward* subject X" — the
      // regard realm's renown / Sybil-keystone data path ("what does the
      // community feel about Bob"). Additive; no consumer reads it yet.
      await this.getCollection(Collections.Beliefs).createIndex({
        realm: 1,
        referent: 1,
      });

      // Chronicles: per-character append-only identity ledger (one doc
      // per entry). Indexed on `owner` so an owner-scoped read
      // (`ChronicleEntry.find({ owner })`) and the future per-player
      // cleanup cascade (`deleteMany({ owner })`) are
      // O(rows-for-this-owner), not a full scan.
      await this.getCollection(Collections.Chronicles).createIndex({
        owner: 1,
      });

      // Transcripts: per-character append-only evidence ledger (one doc
      // per sub-check). Indexed on `owner` so the owner-scoped read
      // (`TranscriptEntry.find({ owner })`, which the derive-on-read
      // Competence estimator and the self-view consume) and the future
      // per-player cleanup cascade are O(rows-for-this-owner).
      await this.getCollection(Collections.Transcripts).createIndex({
        owner: 1,
      });

      // Disposition events: per-character append-only disposition-valenced
      // -act ledger (one doc per sub-check) — the sibling of the Transcript
      // that the derive-on-read trait-position reads. Indexed on `owner` so
      // the owner-scoped read (`DispositionEntry.find({ owner })`) and the
      // future per-player cleanup cascade are O(rows-for-this-owner).
      await this.getCollection(Collections.DispositionEvents).createIndex({
        owner: 1,
      });

      // Forum subjects: the linking spine. A board-subject's `title` is a
      // flat-global handle (unique, case-insensitive via a collation), so
      // `SubjectCatalogue.resolveByTitle` and the `make`-on-taken-name
      // guard are O(1). A thread-subject's handle is board-scoped, so
      // `parentSubject` is indexed for the board-scoped resolve + the
      // "threads promoted under this board" reverse read.
      await this.getCollection(Collections.ForumSubjects).createIndex(
        { title: 1 },
        { unique: true, collation: { locale: 'en', strength: 2 } }
      );
      await this.getCollection(Collections.ForumSubjects).createIndex({
        parentSubject: 1,
      });

      // Forum boards: resolved board-by-subject (a Subject's
      // popularity-forum manifestation points at the Board, and the
      // reverse "board for this subject" read is owner-scoped).
      await this.getCollection(Collections.ForumBoards).createIndex({
        subject: 1,
      });

      // Forum entries: the reply tree. `board` scopes a board's threads;
      // `parent` scopes a thread's posts (null = thread roots).
      await this.getCollection(Collections.ForumEntries).createIndex({
        board: 1,
      });
      await this.getCollection(Collections.ForumEntries).createIndex({
        parent: 1,
      });

      // Forum votes: one row per (entry, voter) — unique compound index
      // enforces one-account-one-vote per entry; `entry` alone serves the
      // aggregate recompute.
      await this.getCollection(Collections.ForumVotes).createIndex(
        { entry: 1, voter: 1 },
        { unique: true }
      );

      // Forum events: the append-only audit/archive log. Indexed on each
      // dependency key so the Wave 3 subscription's history/backfill reads
      // (and the deferred audit tooling) are scoped, not full scans.
      await this.getCollection(Collections.ForumEvents).createIndex({
        subject: 1,
      });
      await this.getCollection(Collections.ForumEvents).createIndex({
        board: 1,
      });
      await this.getCollection(Collections.ForumEvents).createIndex({
        thread: 1,
      });
      await this.getCollection(Collections.ForumEvents).createIndex({
        entry: 1,
      });

      // Renown events: append-only, scope-tagged signal log (one doc per
      // signal). Indexed on `subject` (the hot read partition) and
      // `{ subject, at }` (the decay-ordered slice the recompute walks),
      // so both stay O(rows-for-this-subject), not a full scan.
      await this.getCollection(Collections.RenownEvents).createIndex({
        subject: 1,
      });
      await this.getCollection(Collections.RenownEvents).createIndex({
        subject: 1,
        at: 1,
      });

      // Renown standings: the materialized per-{subject, scope} aggregate
      // (a rebuildable cache). Indexed on `{ subject, scope }` — the
      // recompute's upsert key and the warm() load shape.
      await this.getCollection(Collections.Renown).createIndex({
        subject: 1,
        scope: 1,
      });

      // Participation events: append-only active-bucket log (one doc per
      // (subject, bucket)). Indexed on `subject` (the recompute group) and
      // `{ subject, bucket }` (the per-append dedup lookup), so both stay
      // O(rows-for-this-subject), not a full scan.
      await this.getCollection(Collections.ParticipationEvents).createIndex({
        subject: 1,
      });
      await this.getCollection(Collections.ParticipationEvents).createIndex({
        subject: 1,
        bucket: 1,
      });

      // Participation standings: the materialized per-subject aggregate (a
      // rebuildable cache). Indexed on `{ subject, scope }` — the upsert key
      // and the warm() load shape (scope is always the Compact-wide '*').
      await this.getCollection(Collections.Participation).createIndex({
        subject: 1,
        scope: 1,
      });

      // Producer events: append-only attributed-engagement log (one doc per
      // (author, actor, bucket)). Indexed on `author` (the routing key + the
      // recompute group) and `{ author, actor, bucket }` (the per-append
      // dedup lookup), so both stay O(rows-for-this-author).
      await this.getCollection(Collections.ProducerEvents).createIndex({
        author: 1,
      });
      await this.getCollection(Collections.ProducerEvents).createIndex({
        author: 1,
        actor: 1,
        bucket: 1,
      });

      // Producer standings: the materialized per-author aggregate (a
      // rebuildable cache). Indexed on `{ subject, scope }` — the upsert key
      // and the warm() load shape (subject is the author, scope the '*').
      await this.getCollection(Collections.Producer).createIndex({
        subject: 1,
        scope: 1,
      });

      // Authoring events: the append-only authorship ledger (one doc per
      // authoring act; nothing overwritten). Indexed on `path` (derive the
      // author of a content path) and `author` (a creator's body of work).
      await this.getCollection(Collections.AuthoringEvents).createIndex({
        path: 1,
      });
      await this.getCollection(Collections.AuthoringEvents).createIndex({
        author: 1,
      });

      // Accountability: the append-only harm-attribution ledger (one doc
      // per attribution act; nothing overwritten). The generalized home of
      // combat's former blame ledger — combat + traps both produce here.
      // Indexed on `victim` (derive who is to blame) and `sessionId` (a
      // producer's whole chain of rows).
      await this.getCollection(Collections.AccountabilityEvents).createIndex({
        victim: 1,
      });
      await this.getCollection(Collections.AccountabilityEvents).createIndex({
        sessionId: 1,
      });

      // Positions: held conviction, one doc per (subject, stock, target).
      // Indexed on `{ subject, stock, target }` (the upsert / positionOf key)
      // and `{ stock, target }` (the tally read over every holder).
      await this.getCollection(Collections.Positions).createIndex({
        subject: 1,
        stock: 1,
        target: 1,
      });
      await this.getCollection(Collections.Positions).createIndex({
        stock: 1,
        target: 1,
      });

      // Bank ledger: the append-only system of record (one doc per transfer
      // leg). Indexed on `fromAccount` / `toAccount` (the per-account replay
      // + reads), `kind` (the supply / report scans), and `at` (time-ordered
      // slices) — the `renown_events` block, two-sided for double-entry.
      await this.getCollection(Collections.BankLedger).createIndex({
        fromAccount: 1,
      });
      await this.getCollection(Collections.BankLedger).createIndex({
        toAccount: 1,
      });
      await this.getCollection(Collections.BankLedger).createIndex({ kind: 1 });
      await this.getCollection(Collections.BankLedger).createIndex({ at: 1 });

      // Bank accounts: the materialized account registry + balance (a
      // rebuildable cache). Unique on `accountId` (the ledger key + warm()
      // load), indexed on `owner` / `bank` (identity resolution — the
      // {owner, bank} institution key; the legacy `bankPath` index is
      // retired with the field).
      await this.getCollection(Collections.BankAccounts).createIndex(
        { accountId: 1 },
        { unique: true }
      );
      await this.getCollection(Collections.BankAccounts).createIndex({
        owner: 1,
      });
      await this.getCollection(Collections.BankAccounts).createIndex({
        bank: 1,
      });

      // Bank supply: the single-row running money-supply headline
      // (rebuildable from the ledger). One row — no index needed.

      // Parcels: the real-property title registry (one doc per titled
      // extent, the rebuildable current-state cache). Indexed on `extent`
      // (the coverage-index key + the seed/mutation upsert lookup) and
      // `parentParcel` (the sparse-hierarchy child scan).
      await this.getCollection(Collections.Parcels).createIndex({
        extent: 1,
      });
      await this.getCollection(Collections.Parcels).createIndex({
        parentParcel: 1,
      });

      // Parcel events: the append-only chain-of-title log (one doc per
      // title event; nothing overwritten — the `renown_events` shape).
      // Indexed on `extent` (the lineage readout for a title).
      await this.getCollection(Collections.ParcelEvents).createIndex({
        extent: 1,
      });

      // Diagnostics: the author-diagnostics store (runtime / compile rows,
      // rotated by TTL). Indexed on `{channel, ts}` (tail-by-channel),
      // `{author, ts}` (the "my content's errors" / `--mine` read), and
      // `{path, versionId}` (the compile supersede). The TTL index on
      // `expiresAt` (first-of-kind in this repo) lets Mongo evict rows with
      // no cron — `expireAfterSeconds: 0` means "at the instant `expiresAt`".
      await this.getCollection(Collections.Diagnostics).createIndex({
        channel: 1,
        ts: -1,
      });
      await this.getCollection(Collections.Diagnostics).createIndex({
        author: 1,
        ts: -1,
      });
      await this.getCollection(Collections.Diagnostics).createIndex({
        path: 1,
        versionId: 1,
      });
      await this.getCollection(Collections.Diagnostics).createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );

      // Holder snapshots: the persistence-spine engine-of-record (one doc
      // per host `scope` × `owner`). Indexed on `scope` (materialize loads
      // every record scoped to a host) and `owner` (the account-deletion
      // cascade, a keyed delete). The compound `{ scope, owner }` serves
      // the single-record capture upsert.
      await this.getCollection(Collections.HolderSnapshots).createIndex({
        scope: 1,
      });
      await this.getCollection(Collections.HolderSnapshots).createIndex({
        owner: 1,
      });
      await this.getCollection(Collections.HolderSnapshots).createIndex(
        { scope: 1, owner: 1 },
        { unique: true },
      );

      // Contracts: the gig current-state rows (the chattel/parcel shape —
      // one writer, all reads async finders, no registry Stuff). Unique on
      // `contractId` (the escrow account + event chain key), indexed on
      // `state` and `boardPath` (the board browse + claimant scans).
      await this.getCollection(Collections.Contracts).createIndex(
        { contractId: 1 },
        { unique: true },
      );
      await this.getCollection(Collections.Contracts).createIndex({
        state: 1,
      });
      await this.getCollection(Collections.Contracts).createIndex({
        boardPath: 1,
      });

      // Contract events: the append-only gig event chain (nothing
      // overwritten — the `chattel_events` shape; money legs live in
      // `bank_ledger`, linked by txId). Indexed on `contractId` (the chain
      // readout) and `at` (time-ordered slices).
      await this.getCollection(Collections.ContractEvents).createIndex({
        contractId: 1,
      });
      await this.getCollection(Collections.ContractEvents).createIndex({
        at: 1,
      });

      // Sandbox: partial circleScope index on every STAMP collection —
      // serves circle-side $or reads and exit's deleteMany({circleScope})
      // while costing nothing for the (overwhelming) unscoped majority.
      // Partial beats sparse: same storage win, clearer semantics.
      for (const stampCollection of STAMP_COLLECTIONS) {
        await this.getCollection(stampCollection).createIndex(
          { circleScope: 1 },
          { partialFilterExpression: { circleScope: { $exists: true } } }
        );
      }

      console.info('PersistenceManager: Indexes created successfully');
    } catch (error) {
      console.error('PersistenceManager: Error creating indexes:', error);
      // Don't throw - indexes are optional for basic functionality
    }
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
