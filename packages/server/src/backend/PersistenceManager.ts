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

/**
 * MongoDB collections enum.
 */
export enum Collections {
  Users = 'users',
  GoogleProfiles = 'google_profiles',
  TwitchProfiles = 'twitch_profiles',
  Domain = 'domain',
  Emotes = 'emotes',
  Groups = 'groups',
  Channels = 'channels',
  Beliefs = 'beliefs',
  Chronicles = 'chronicles',
  Transcripts = 'transcripts',
  DispositionEvents = 'disposition_events',
  ForumSubjects = 'forum_subjects',
  ForumBoards = 'forum_boards',
  ForumEntries = 'forum_entries',
  ForumVotes = 'forum_votes',
  ForumEvents = 'forum_events',
  RenownEvents = 'renown_events',
  Renown = 'renown',
  ParticipationEvents = 'participation_events',
  Participation = 'participation',
  ProducerEvents = 'producer_events',
  Producer = 'producer',
  AuthoringEvents = 'authoring_events',
  Positions = 'positions',
  Recipes = 'recipes',
  Documents = 'documents',
  BankLedger = 'bank_ledger',
  BankAccounts = 'bank_accounts',
  BankSupply = 'bank_supply',
}

/**
 * Operations a hook can wrap.
 */
export type HookOperation = 'save' | 'delete';

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
   * Private constructor (singleton pattern).
   */
  private constructor() {}

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
      const doc = await collection.findOne({ _id: objectId });

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
   * @returns Array of matching documents
   */
  public async find(
    collectionName: string,
    query: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    const collection = this.getCollection(collectionName);

    try {
      const docs = await collection.find(query).toArray();

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
    const slot = `${collectionName}:delete`;
    await this.withSlot(slot, collectionName, 'delete', async () => {
      const hooks = this.deleteHooks.get(slot) ?? [];
      const terminal = (idArg: string): Promise<void> =>
        this.persistDelete(collectionName, idArg);
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
   * Terminal delete: the actual MongoDB deletion.
   */
  private async persistDelete(collectionName: string, id: string): Promise<void> {
    const collection = this.getCollection(collectionName);
    try {
      const objectId = new ObjectId(id);
      await collection.deleteOne({ _id: objectId });
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

      // Twitch Profiles: unique index on twitchUserId (the stable Helix
      // identifier the returning-login resolve keys on).
      await this.getCollection(Collections.TwitchProfiles).createIndex(
        { twitchUserId: 1 },
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

      // Recipes: unique recipeId for catalogue resolve.
      await this.getCollection(Collections.Recipes).createIndex(
        { recipeId: 1 },
        { unique: true }
      );

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
      // and the warm() load shape (scope is always the cooperative-wide '*').
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
      // load), indexed on `owner` / `bankPath` (identity resolution).
      await this.getCollection(Collections.BankAccounts).createIndex(
        { accountId: 1 },
        { unique: true }
      );
      await this.getCollection(Collections.BankAccounts).createIndex({
        owner: 1,
      });
      await this.getCollection(Collections.BankAccounts).createIndex({
        bankPath: 1,
      });

      // Bank supply: the single-row running money-supply headline
      // (rebuildable from the ledger). One row — no index needed.

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
