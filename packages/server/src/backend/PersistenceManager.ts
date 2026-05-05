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
import YAML from 'yaml';

/**
 * MongoDB collections enum.
 */
export enum Collections {
  Users = 'users',
  GoogleProfiles = 'google_profiles',
  Domain = 'domain',
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
   * `(collection, operation)` slots are currently executing.
   */
  private activeSlots: Set<string> = new Set();

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

      console.log('PersistenceManager: Connecting to MongoDB...');

      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
      });

      await this.client.connect();

      this.db = this.client.db(dbName);

      console.log(`PersistenceManager: Connected to MongoDB database '${dbName}'`);

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
      console.log('PersistenceManager: Disconnected from MongoDB');
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
    this.activeSlots.clear();
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
  public async save(collectionName: string, document: any): Promise<string> {
    return this.dispatchSave(collectionName, document);
  }

  /**
   * Find a document by MongoDB _id.
   *
   * @param collectionName - Collection name
   * @param id - MongoDB _id (string or ObjectId)
   * @returns Document or null if not found
   */
  public async findById(collectionName: string, id: string): Promise<any | null> {
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
  ): Promise<any[]> {
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
    console.log(
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
    if (this.activeSlots.has(slot)) {
      throw new HookReentryError(collectionName, 'save');
    }
    this.activeSlots.add(slot);
    try {
      const hooks = this.saveHooks.get(slot) ?? [];
      const terminal = (doc: Record<string, unknown>): Promise<string> =>
        this.persistSave(collectionName, doc);
      let next = terminal;
      for (let i = hooks.length - 1; i >= 0; i--) {
        const hook = hooks[i]!;
        const continuation = next;
        next = (doc) => hook(collectionName, doc, continuation);
      }
      const id = await next(document);
      // Post-save dispatch tail. Pre-bootstrap saves (the bootstrap
      // pipeline itself) are silently dropped by EventApi.
      const { EventApi } = await import('../mud/api/event');
      const { Events } = await import('../mud/api/event-types');
      EventApi.emit(Events.PersistenceFlushed, {
        collection: collectionName,
        count: 1,
      });
      return id;
    } finally {
      this.activeSlots.delete(slot);
    }
  }

  /**
   * Walk the registered delete hooks for `collectionName`, then perform
   * the MongoDB delete. Re-entry into the same slot throws.
   */
  private async dispatchDelete(collectionName: string, id: string): Promise<void> {
    const slot = `${collectionName}:delete`;
    if (this.activeSlots.has(slot)) {
      throw new HookReentryError(collectionName, 'delete');
    }
    this.activeSlots.add(slot);
    try {
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
    } finally {
      this.activeSlots.delete(slot);
    }
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

      console.log('PersistenceManager: Indexes created successfully');
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
