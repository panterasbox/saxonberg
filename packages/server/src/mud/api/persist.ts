/**
 * PersistApi — the single, call-security-decorated chokepoint over the
 * MongoDB `PersistenceManager`.
 *
 * `PersistenceManager` is an **ungated process singleton**: reaching it
 * via `PersistenceManager.get()` from domain / logic code bypasses the
 * security layer entirely. This facade is the sanctioned surface — all
 * non-framework persistence access flows through here, where it picks up
 * the Api security treatment (`decorateApiClass`).
 *
 * The lockdown is enforced by **`lint:pm`** (`scripts/check-pm-access.ts`,
 * CI-gating): `PersistenceManager.get()` is forbidden everywhere except
 *   - the backend (`backend/**`) — it owns PM's lifecycle (connect /
 *     seed / hooks),
 *   - `api/hot-reload` — the HMR hook-manifest reload (PM lifecycle, not
 *     data),
 *   - this facade, and tests.
 *
 * The anticipated `Document` migration has landed: `lib/persistence/
 * Document` and `lib/stuff/Template` used to hold the last framework
 * carve-out and now route through here, so **the mudlib has no other
 * path to persistence at all**. The import boundary
 * (docs/architecture.md) is what closed it — a mudlib module may not
 * import `backend/` under any justification.
 *
 * This face also owns **encrypt-at-rest** ({@link PersistApi.sealString} /
 * {@link PersistApi.unsealString}), for the same reason: `crypto` is
 * outside `src/mud/`, and `EncryptedStringMarshaller` is the field-level
 * adapter over these two.
 *
 * Caller policy starts permissive — the value is the *single decorated
 * chokepoint* plus the lint, both tightenable later.
 */

import * as crypto from 'crypto';
import { PersistenceManager } from '../../backend/PersistenceManager';
import type {
  BatchWrite,
  FindOptions,
  PersistStats,
} from '../../backend/PersistenceManager';
import { SecurityApi } from './security';
import { TestOnly } from '../lib/security/decorators';
import { Unavailable } from '../lib/errors';

export type { BatchWrite, FindOptions, PersistStats };

/**
 * Stored shape for an encrypted string field. A structured object (not a
 * concatenated blob) so the field stays greppable in Mongo, and the
 * version tag supports a future re-key / algorithm migration.
 */
export interface EncryptedEnvelope {
  /** Format version (for future re-key / algorithm migration). */
  v: 1;
  /** Base64-encoded 12-byte GCM nonce, fresh per seal. */
  iv: string;
  /** Base64-encoded 16-byte GCM authentication tag. */
  tag: string;
  /** Base64-encoded ciphertext. */
  ct: string;
}

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * Decoded 32-byte key, cached after the first successful load. Module
 * scope holds only the `null` initialiser; the load is lazy.
 */
let cachedKey: Buffer | null = null;

/**
 * Load + validate `TOKEN_ENC_KEY` once, lazily. Accepts base64 or hex;
 * both must decode to exactly 32 bytes. Throws a clear, key-free error
 * on absence or wrong length. Lazy so environments that never touch an
 * encrypted field (CI without Twitch, the Google-only suite) boot
 * without the key.
 */
function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.TOKEN_ENC_KEY;
  if (!raw) {
    throw new Error(
      'PersistApi: TOKEN_ENC_KEY is not set — cannot encrypt/decrypt ' +
        'token fields. Set a 32-byte key (e.g. `openssl rand -base64 32`).'
    );
  }
  let key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES && /^[0-9a-fA-F]+$/.test(raw)) {
    const hex = Buffer.from(raw, 'hex');
    if (hex.length === KEY_BYTES) key = hex;
  }
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `PersistApi: TOKEN_ENC_KEY must decode to ${KEY_BYTES} bytes ` +
        `(got ${key.length}). Generate with \`openssl rand -base64 32\`.`
    );
  }
  cachedKey = key;
  return key;
}

/** The Mongo driver's errors that mean the records cannot be reached. */
const OUTAGE_ERRORS: ReadonlySet<string> = new Set([
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoServerSelectionError',
  'MongoNotConnectedError',
  'MongoPoolClearedError',
  'MongoTopologyClosedError',
]);

export class PersistApi {
  /**
   * Drop the memoised `TOKEN_ENC_KEY`, forcing the next seal/unseal to
   * re-read `process.env`. Test-only seam: the key is process-wide
   * config, so the cache is process-wide too, and a suite that mutates
   * the env between cases has to invalidate it.
   *
   * @internal
   */
  static _resetEncryptionKeyForTest(): void {
    cachedKey = null;
  }

  /**
   * Encrypt a string for storage — AES-256-GCM under `TOKEN_ENC_KEY`,
   * with a fresh random IV per call. Plaintext lives only in memory;
   * Mongo only ever sees the {@link EncryptedEnvelope}.
   *
   * The cipher lives here because `crypto` is outside `src/mud/` and
   * only the Api tier may import it (docs/architecture.md § The import
   * boundary). Encrypt-at-rest is a persistence concern, so this is its
   * subsystem's face — `EncryptedStringMarshaller` is the field-level
   * adapter over it. (A standalone `CryptoApi` was considered and
   * rejected; see that marshaller's class docs.)
   */
  static sealString(plaintext: string): EncryptedEnvelope {
    if (typeof plaintext !== 'string') {
      throw new TypeError('PersistApi.sealString expects a string');
    }
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
    const ct = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return {
      v: 1,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ct: ct.toString('base64'),
    };
  }

  /**
   * Inverse of {@link PersistApi.sealString}. Throws a deliberately
   * detail-free error on authentication failure (tampered ciphertext,
   * IV or tag, or the wrong key) — the underlying message could leak
   * key or ciphertext detail.
   */
  static unsealString(envelope: EncryptedEnvelope): string {
    // Resolved OUTSIDE the try: a missing or wrong-length TOKEN_ENC_KEY is
    // an operator error and must keep its own diagnostic. Folding it into
    // the catch below would rebrand "you forgot the env var" as "the
    // ciphertext was tampered with" and send the reader after a phantom
    // data corruption.
    const key = encryptionKey();
    try {
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(envelope.iv, 'base64')
      );
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
      const pt = Buffer.concat([
        decipher.update(Buffer.from(envelope.ct, 'base64')),
        decipher.final(),
      ]);
      return pt.toString('utf8');
    } catch {
      throw new Error(
        'PersistApi: token decryption failed (tampered or wrong key).'
      );
    }
  }

  /** Staged outages left (`failNext`) — a test world's seam, never the game's. */
  static #stagedOutages = 0;

  /**
   * ⭐ Make the next `calls` reads or writes through this door fail as an
   * outage would (failure-model D8) — what a test world stages to see the
   * `unavailable` refusal end to end.
   */
  @TestOnly('Nothing in the game takes the records offline.')
  static failNext(calls = 1): void {
    PersistApi.#stagedOutages = Math.max(0, Math.trunc(calls));
  }

  /**
   * ⭐⭐ Every read and write goes through here (failure-model D8): a lost
   * connection to the records is converted to {@link Unavailable} — *not
   * now, try again*, a refusal the player is told and a script may handle
   * — with the driver's error as its cause. Nothing else is converted: a
   * write conflict or a bad query stays a bug.
   */
  static async #reach<T>(run: () => Promise<T>): Promise<T> {
    if (PersistApi.#stagedOutages > 0) {
      PersistApi.#stagedOutages--;
      throw new Unavailable('the records', { cause: new Error('a staged outage (PersistApi.failNext)') });
    }
    try {
      return await run();
    } catch (err) {
      if (PersistApi.#isOutage(err)) {
        throw new Unavailable('the records', { cause: err, message: err instanceof Error ? err.message : String(err) });
      }
      throw err;
    }
  }

  /** The driver's connectivity failures, by name — and the manager's own "not connected". */
  static #isOutage(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    if (OUTAGE_ERRORS.has(err.name)) return true;
    return err.message.startsWith('PersistenceManager: Not connected');
  }

  /** Whether the Mongo connection is live (the no-op-when-offline guard). */
  static isConnected(): boolean {
    return PersistenceManager.get().isConnected();
  }

  /**
   * Resolve when the database has had nothing in flight for `quietMs`, or
   * `false` after `timeoutMs` — what a test-world clock jump waits on
   * (`TestHarnessApi.advanceClock`) so the next jump does not stack on
   * this one's backlog.
   */
  static whenQuiet(quietMs = 500, timeoutMs = 300_000): Promise<boolean> {
    return PersistenceManager.get().whenQuiet(quietMs, timeoutMs);
  }

  /**
   * The database's numbers: the pool (in use, waiting, how often a
   * request waited and for how long), round trips, and op counts and time
   * per `<op> <collection>` — cumulative since boot except the two
   * right-now pool figures. `/stats` serves it as `db`; see
   * `PersistenceManager.stats()`.
   */
  static dbStats(): PersistStats {
    return PersistenceManager.get().stats();
  }

  /** Documents in `collection` matching `query`, optionally sorted/limited. */
  static async find(
    collection: string,
    query: Record<string, unknown>,
    options?: FindOptions
  ): Promise<Record<string, unknown>[]> {
    return PersistApi.#reach(() => PersistenceManager.get().find(collection, query, options));
  }

  /** The distinct values of `field` across `collection`. */
  static async distinct(collection: string, field: string): Promise<unknown[]> {
    return PersistApi.#reach(() => PersistenceManager.get().distinct(collection, field));
  }

  /** One document by Mongo `_id`, or `null`. */
  static async findById(
    collection: string,
    id: string
  ): Promise<Record<string, unknown> | null> {
    return PersistApi.#reach(() => PersistenceManager.get().findById(collection, id));
  }

  /** Upsert `doc` into `collection`; returns its id. */
  static async save(
    collection: string,
    doc: Record<string, unknown>
  ): Promise<string> {
    return PersistApi.#reach(() => PersistenceManager.get().save(collection, doc));
  }

  /**
   * ⭐ Write many rows of `collection` in ONE round trip — each
   * {@link BatchWrite} keyed (update-or-insert by named fields, or a
   * partial update with `insert: false`), by `_id`, or an insert. Returns
   * the rows written or matched. ⚠ Refused on a collection with an
   * around-save hook (`BatchOnHookedCollectionError`), before anything is
   * sent; the sandbox policy is the same as `save`'s. A `Document` makes
   * its write with `toBatchWrite()`. See `PersistenceManager.saveMany`.
   */
  static async saveMany(
    collection: string,
    writes: readonly BatchWrite[]
  ): Promise<number> {
    return PersistenceManager.get().saveMany(collection, writes);
  }

  /** Delete the document with `id` from `collection`. */
  static async delete(collection: string, id: string): Promise<void> {
    return PersistApi.#reach(() => PersistenceManager.get().delete(collection, id));
  }

  /**
   * Delete every document in `collection` matching `filter`; returns the
   * delete count. Bulk maintenance — skips per-id around-delete hooks
   * (see `PersistenceManager.deleteMany`).
   */
  static async deleteMany(
    collection: string,
    filter: Record<string, unknown>
  ): Promise<number> {
    return PersistApi.#reach(() => PersistenceManager.get().deleteMany(collection, filter));
  }
}

SecurityApi.decorateApiClass(PersistApi);
