/**
 * KickWebhookVerifier — signature verification + replay defense for Kick
 * webhook deliveries. Every inbound POST is verified BEFORE any parsing
 * or dispatch (the route's security invariant):
 *
 *  1. header presence (`malformed` on any gap / unparseable timestamp);
 *  2. RSA-PKCS1v15/SHA256 over the period-joined
 *     `messageId.timestamp.rawBody` against Kick's published public key
 *     (fetched via `KickClient.fetchPublicKey`, cached; ONE
 *     re-fetch-and-retry on failure — the key-rotation hedge);
 *  3. timestamp within the `kick.replayWindowSec` window (both past and
 *     future skew);
 *  4. message-id dedup (Kick delivers at-least-once): a TTL ring keyed
 *     on the ULID, FIFO-bounded by `kick.dedupMaxSize`.
 *
 * Only `'ok'` dispatches. `'duplicate'` is still acked 200 by the route
 * (redelivery is not an error; acking stops retries). Nothing here logs
 * a body, signature, or token.
 */

import { createVerify } from 'crypto';
import { KickClient } from './KickClient';
import { AppApi } from '../mud/api/app';
import { AppSettingKeys } from '../mud/lib/config/AppSettings';

/** The five Kick delivery headers the verifier consumes. */
export interface KickEventHeaders {
  messageId: string;
  timestamp: string;
  signature: string;
  eventType: string;
  eventVersion: string;
}

export type KickVerifyResult =
  | 'ok'
  | 'malformed'
  | 'bad-signature'
  | 'stale'
  | 'duplicate'
  | 'no-key';

export class KickWebhookVerifier {
  private static instance: KickWebhookVerifier;

  private readonly fetchKey: () => Promise<string | null>;
  private readonly now: () => number;

  private keyPem: string | null = null;
  /** messageId ULID → expiry epoch-ms. Insertion-ordered (FIFO evict). */
  private readonly dedup = new Map<string, number>();

  private constructor(opts?: {
    fetchKey?: () => Promise<string | null>;
    now?: () => number;
  }) {
    this.fetchKey =
      opts?.fetchKey ?? (() => KickClient.get().fetchPublicKey());
    this.now = opts?.now ?? (() => Date.now());
  }

  public static get(): KickWebhookVerifier {
    if (!this.instance) this.instance = new KickWebhookVerifier();
    return this.instance;
  }

  /** Test-only factory over an injected key source + clock. */
  public static forTest(opts: {
    fetchKey: () => Promise<string | null>;
    now?: () => number;
  }): KickWebhookVerifier {
    return new KickWebhookVerifier(opts);
  }

  /**
   * Verify one delivery. See the header comment for the check order and
   * outcome vocabulary.
   */
  public async verify(
    headers: KickEventHeaders,
    rawBody: Buffer
  ): Promise<KickVerifyResult> {
    const { messageId, timestamp, signature } = headers;
    if (!messageId || !timestamp || !signature) return 'malformed';
    const ts = Date.parse(timestamp);
    if (!Number.isFinite(ts)) return 'malformed';

    // Signature over the byte-exact period-joined payload. Only the
    // rawBody is untrusted bytes; the two header components are ASCII.
    const payload = Buffer.concat([
      Buffer.from(`${messageId}.${timestamp}.`, 'utf8'),
      rawBody,
    ]);
    const sigOk = await this.verifySignature(payload, signature);
    if (sigOk !== 'ok') return sigOk;

    // Replay window — both directions (a far-future timestamp is as
    // suspect as a stale one).
    const windowMs = this.replayWindowSec() * 1000;
    if (Math.abs(this.now() - ts) > windowMs) return 'stale';

    // At-least-once dedup on the ULID.
    this.evictDedup();
    const seen = this.dedup.get(messageId);
    if (seen !== undefined && seen > this.now()) return 'duplicate';
    this.dedup.set(messageId, this.now() + this.dedupTtlSec() * 1000);
    return 'ok';
  }

  /**
   * RSA-PKCS1v15/SHA256 against the cached key, with ONE
   * re-fetch-and-retry on failure (rotation hedge). `no-key` when no key
   * can be fetched at all.
   */
  private async verifySignature(
    payload: Buffer,
    signature: string
  ): Promise<'ok' | 'bad-signature' | 'no-key'> {
    if (this.keyPem && this.checkSig(payload, signature, this.keyPem)) {
      return 'ok';
    }
    // Cached key absent or failed — re-fetch once and retry.
    const fresh = await this.fetchKey();
    if (!fresh) return this.keyPem ? 'bad-signature' : 'no-key';
    this.keyPem = fresh;
    return this.checkSig(payload, signature, fresh) ? 'ok' : 'bad-signature';
  }

  private checkSig(payload: Buffer, signature: string, pem: string): boolean {
    try {
      return createVerify('RSA-SHA256')
        .update(payload)
        .verify(pem, signature, 'base64');
    } catch {
      return false;
    }
  }

  /** Drop expired dedup entries; FIFO-evict above the size cap. */
  private evictDedup(): void {
    const now = this.now();
    for (const [id, expiry] of this.dedup) {
      if (expiry <= now) this.dedup.delete(id);
    }
    const cap = this.dedupMaxSize();
    while (this.dedup.size >= cap) {
      const oldest = this.dedup.keys().next().value;
      if (oldest === undefined) break;
      this.dedup.delete(oldest);
    }
  }

  // ---- dials (AppSettings with seeded-literal fallbacks) -----------------

  private replayWindowSec(): number {
    return this.dial(AppSettingKeys.kickReplayWindowSec, 300);
  }

  private dedupTtlSec(): number {
    return this.dial(AppSettingKeys.kickDedupTtlSec, 900);
  }

  private dedupMaxSize(): number {
    return this.dial(AppSettingKeys.kickDedupMaxSize, 4096);
  }

  private dial(key: string, fallback: number): number {
    try {
      const raw = AppApi.setting(key);
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    } catch {
      return fallback;
    }
  }
}
