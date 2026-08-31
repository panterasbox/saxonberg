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
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { AsyncLocalStorage } from 'node:async_hooks';
import YAML from 'yaml';
import { Collections } from '../mud/lib/persistence/Collections';

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
  // The frame store is *what happened to you* — the epistemic shape
  // exactly. A frame delivered inside a circle was genuinely delivered
  // and genuinely read; STAMP would revert your own scrollback out from
  // under you on exit, which is the one thing a record of what you were
  // told must never do. MARK records that it happened in-circle.
  [Collections.PlayerFrames]: { verb: 'pass', mark: true },
  // ── PASS(unmarked): authored truth + the mechanism's own stores ──
  [Collections.Content]: { verb: 'pass' },
  [Collections.Documents]: { verb: 'pass' },
  [Collections.HolderSnapshots]: { verb: 'pass' },
  // The wiki is **authored truth and a communications surface**, so it
  // joins `domain` here rather than failing closed. An article cannot
  // affect advancement, cannot mint anything, and cannot be spent — it
  // is people writing to each other. There is no conflict to contain.
  //
  // The wiki is also strictly LESS powerful than `domain`, which is
  // PASS: a circle session that may edit a room template has no
  // business being refused an encyclopedia edit about one.
  //
  // Neither of the other verbs fits. STAMP would be actively harmful —
  // a scoped page reverting on circle exit is a page an author watched
  // themselves write and then lose, and its scoped revision rows would
  // collide with the unique `{pageId, rev}` index. The epistemic MARK
  // is for "what happened to *you*"; an article is not a personal
  // record.
  //
  // Authorization is unaffected: `WikiRegistry`'s protection ladder
  // resolves through `AccessApi`, which is circle-independent, so a
  // circle grants no editing rights its occupant did not already have.
  [Collections.Wiki]: { verb: 'pass' },
  [Collections.WikiRevisions]: { verb: 'pass' },
  // ── SHADOW(skip): rebuildable caches — skip-and-rebuild ──
  [Collections.BankAccounts]: { verb: 'shadow', mode: 'skip' },
  [Collections.BankSupply]: { verb: 'shadow', mode: 'skip' },
  [Collections.Renown]: { verb: 'shadow', mode: 'skip' },
  [Collections.Participation]: { verb: 'shadow', mode: 'skip' },
  [Collections.Producer]: { verb: 'shadow', mode: 'skip' },
  // ── REFUSE: field-real registries, identity, title, config ──
  [Collections.Users]: { verb: 'refuse' },
  // The pack installer's per-deployment ledger is field-real system state
  // (what was installed, the baselines three-way reconciliation compares
  // against). A circle must never write it.
  [Collections.PackInstalls]: { verb: 'refuse' },
  [Collections.GoogleProfiles]: { verb: 'refuse' },
  [Collections.TwitchProfiles]: { verb: 'refuse' },
  [Collections.KickProfiles]: { verb: 'refuse' },
  // Descriptor banks are immutable authored reference data installed by
  // a content pack — the same posture as name banks. A sandboxed write
  // to them would change what every unidentified item in the world looks
  // like, which is a field-real registry mutation by any reading.
  [Collections.DescriptorBanks]: { verb: 'refuse' },
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
      _qwire();

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
   * Load every `content` row into {@link contentByPath}. Idempotent and
   * concurrency-safe: the first caller issues the query, the rest await
   * the same promise.
   *
   * A row that cannot be structured-cloned is left OUT of the map — it
   * then simply misses and falls through to Mongo, which is the same
   * answer, slower. That keeps an exotic BSON value from turning a
   * performance cache into a correctness bug.
   */
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

  private async ensureContentCache(): Promise<void> {
    if (this.contentByPath !== null) return;
    if (this.contentPreload !== null) return this.contentPreload;

    this.contentPreload = (async () => {
      const docs = await this.getCollection(Collections.Content)
        .find({})
        .toArray();
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
      console.info(
        `PersistenceManager: ${byPath.size} content row(s) resident` +
          (skipped > 0 ? ` (${skipped} uncacheable, read through)` : '')
      );
    })();

    try {
      await this.contentPreload;
    } finally {
      this.contentPreload = null;
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
    if (byPath === null) return;
    const previous = this.contentPathById.get(id);
    if (previous !== undefined) byPath.delete(previous);
    const path = doc.path;
    if (typeof path !== 'string') return;
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
    if (byPath === null) return;
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
   * Create indexes for collections.
   * Called during connection setup.
   *
   * ⚠⚠ **Every index is attempted independently.** This used to be one
   * `try` around the whole list, so the FIRST failure skipped every
   * index after it — and the log said "Error creating indexes" once,
   * which reads like one index failed rather than forty. Found by
   * driving: a text-index conflict on `player_frames` silently skipped
   * the wiki index, the forum index and every sandbox partial index
   * below it. Indexes are optional for correctness and load-bearing for
   * speed, which is precisely the combination that makes a silent skip
   * survive.
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
      // concurrent `PackApi.install` invocations (e.g. two
      // tsx-watch processes racing during dev) double-insert and
      // `BootstrapManager.run` crashes with a duplicate-templatePath
      // error on the next boot. `createIndex` is idempotent — same
      // spec is a no-op; an existing duplicate throws E11000 here,
      // which the outer catch logs without crashing the process,
      // surfacing the admin-fixable condition.
      await this.getCollection(Collections.Content).createIndex(
        { path: 1 },
        { unique: true }
      );

      // Descriptor banks: unique key (the item class) for the
      // appearance resolver's by-key warm.
      await this.getCollection(Collections.DescriptorBanks).createIndex(
        { key: 1 },
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

      // Documents: the path-addressed tree. Releases live here now
      // (`kind: 'release'`) rather than in a collection of their own —
      // they are owner-scoped content with a place, and nobody queries
      // them across jurisdictions. `path` serves find-or-create and the
      // prefix walk; `kind` serves the warm-window rebuild that replaced
      // the retired `bulletins` scan.
      //
      // ⚠ `path` is deliberately NOT unique even though one document per
      // path is the invariant: this collection predates the release move
      // and a unique index that a live row violates fails at BOOT. The
      // invariant is enforced at the write (find-or-create), where a
      // violation is visible and fixable.
      await this.getCollection(Collections.Documents).createIndex({ path: 1 });
      await this.getCollection(Collections.Documents).createIndex({ kind: 1 });
      await this.#createDocumentKindIndexes(
        this.#indexTarget(this.getCollection(Collections.Documents))
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

      // Pack installs: one record per content pack per deployment.
      await this.getCollection(Collections.PackInstalls).createIndex(
        { packId: 1 },
        { unique: true }
      );

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

      // Wiki pages: the current-state rows. The load-bearing one is the
      // NAME index — slugs and aliases share ONE name space within a
      // namespace (a name resolves to at most one page), so the lookup
      // and the collision check are the same query. It is NOT declared
      // unique: `aliases` is an array, so a unique index would be a
      // multikey unique across the whole collection rather than per
      // namespace, and would reject two namespaces legitimately holding
      // the same name. Uniqueness is enforced at the one write
      // chokepoint (`WikiRegistry`), which is also where the refusal can
      // name the holder (criterion 63) instead of surfacing a driver
      // error. `subject.ref` serves the total reverse lookup
      // ("is this documented?" — criterion 6).
      await this.getCollection(Collections.Wiki).createIndex({
        namespace: 1,
        slug: 1,
      });
      await this.getCollection(Collections.Wiki).createIndex({
        namespace: 1,
        aliases: 1,
      });
      await this.getCollection(Collections.Wiki).createIndex({
        'subject.ref': 1,
      });
      await this.getCollection(Collections.Wiki).createIndex({ tags: 1 });

      // Wiki revisions: the append-only edit log, in its own collection
      // so a heavily-edited page never approaches Mongo's 16MB document
      // cap and a page READ never drags its history (criterion 11).
      // `{pageId, rev}` is unique — it is the compare-and-swap token's
      // materialisation, and two rows at one rev would mean a lost edit
      // that history records as having happened.
      await this.getCollection(Collections.WikiRevisions).createIndex(
        { pageId: 1, rev: -1 },
        { unique: true },
      );
      await this.getCollection(Collections.WikiRevisions).createIndex({
        author: 1,
      });

      // Player frames: the record layer's rolling window. `{owner, seq}`
      // is the load-bearing one — it serves the backfill read (newest N
      // for one owner), the `recall` scan, AND the eviction delete
      // (`seq <= high - window`), which is why the window bound costs one
      // indexed range delete rather than a count-and-scan. The TEXT index
      // is what makes `recall` a query instead of a regex crawl.
      await this.getCollection(Collections.PlayerFrames).createIndex({
        owner: 1,
        seq: -1,
      });
      // ⚠ The text index is COMPOUND on `owner` first. Mongo allows one
      // text index per collection, and an equality prefix is the only
      // way a per-owner text search uses it — a bare `{body:'text'}`
      // would scan every player's frames and filter afterwards, which
      // on the highest-volume collection in the system is the whole
      // difference between a query and a crawl.
      //
      // ⚠⚠ The three text indexes and the sandbox partials below sit in
      // their OWN try, because they are last in the list and a failure
      // anywhere above would otherwise skip them silently — which is
      // exactly what happened when a stale text index was found by
      // driving. Per-index isolation for all 80-odd would be a large
      // mechanical rewrite; guarding the tail is the proportionate
      // half, and the catch below now says what a failure costs.
      try {
        await this.ensureTextIndex(Collections.PlayerFrames, {
          owner: 1,
          body: 'text',
        });

      // Wiki + forum text indexes — the other two `recall` corpora.
      // Mongo allows exactly ONE text index per collection, so each is a
      // compound over every field the verb searches.
        await this.ensureTextIndex(Collections.Wiki, {
          title: 'text',
          body: 'text',
        });
        await this.ensureTextIndex(Collections.ForumEntries, {
          title: 'text',
          body: 'text',
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
      } catch (error) {
        // Loud and specific: a text/partial index that fails to build
        // makes `recall` and the circle-scoped reads fall back to a
        // scan, which is slow rather than wrong — the shape of failure
        // nobody notices until the data is large.
        console.error(
          'PersistenceManager: search / sandbox indexes NOT built — ' +
            'text queries and circle-scoped reads will fall back to a ' +
            'collection scan:',
          error
        );
      }

      console.info('PersistenceManager: Indexes created successfully');
    } catch (error) {
      // ⚠⚠ Everything AFTER the failing index is skipped. Worth saying
      // out loud: the old message read like one index failed, and the
      // real cost is every index below it — found by driving, when a
      // stale text index quietly took the wiki index, the forum index
      // and every sandbox partial with it.
      console.error(
        'PersistenceManager: index creation stopped at the first failure ' +
          '— every index declared after it was SKIPPED:',
        error
      );
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
