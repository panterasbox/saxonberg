/**
 * KickWebhookVerifier — signature verification against a synthetic
 * keypair (RSA-PKCS1v15/SHA256 over `messageId.timestamp.rawBody`),
 * the one-refetch key-rotation hedge, the replay window (both skews),
 * the at-least-once dedup ring, and the malformed-header outcomes.
 */

import { describe, it, expect, vi } from 'vitest';
import { createSign, generateKeyPairSync } from 'crypto';
import {
  KickWebhookVerifier,
  type KickEventHeaders,
} from '../KickWebhookVerifier';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const PUBLIC_PEM = publicKey.export({ type: 'spki', format: 'pem' }) as string;

const { publicKey: wrongPublic } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const WRONG_PEM = wrongPublic.export({
  type: 'spki',
  format: 'pem',
}) as string;

const NOW = Date.parse('2026-07-28T12:00:00Z');

function sign(messageId: string, timestamp: string, body: Buffer): string {
  return createSign('RSA-SHA256')
    .update(
      Buffer.concat([Buffer.from(`${messageId}.${timestamp}.`, 'utf8'), body])
    )
    .sign(privateKey, 'base64');
}

function delivery(
  overrides: Partial<KickEventHeaders> & { body?: Buffer } = {}
): { headers: KickEventHeaders; body: Buffer } {
  const body = overrides.body ?? Buffer.from('{"content":"hi"}', 'utf8');
  const messageId = overrides.messageId ?? '01J0EXAMPLEULID';
  const timestamp =
    overrides.timestamp ?? new Date(NOW - 5_000).toISOString();
  return {
    headers: {
      messageId,
      timestamp,
      signature: overrides.signature ?? sign(messageId, timestamp, body),
      eventType: overrides.eventType ?? 'chat.message.sent',
      eventVersion: overrides.eventVersion ?? '1',
    },
    body,
  };
}

function makeVerifier(pem: string | null = PUBLIC_PEM): {
  verifier: KickWebhookVerifier;
  fetchKey: ReturnType<typeof vi.fn>;
} {
  const fetchKey = vi.fn(async () => pem);
  return {
    verifier: KickWebhookVerifier.forTest({ fetchKey, now: () => NOW }),
    fetchKey,
  };
}

describe('KickWebhookVerifier', () => {
  it('accepts a valid signed delivery', async () => {
    const { verifier } = makeVerifier();
    const d = delivery();
    expect(await verifier.verify(d.headers, d.body)).toBe('ok');
  });

  it('multi-byte UTF-8 body verifies byte-exactly', async () => {
    const { verifier } = makeVerifier();
    const body = Buffer.from('{"content":"héllo — ⚡ \n\t"}', 'utf8');
    const d = delivery({ body });
    expect(await verifier.verify(d.headers, d.body)).toBe('ok');
  });

  it('rejects a tampered body (bad-signature)', async () => {
    const { verifier } = makeVerifier();
    const d = delivery();
    const tampered = Buffer.from('{"content":"evil"}', 'utf8');
    expect(await verifier.verify(d.headers, tampered)).toBe('bad-signature');
  });

  it('rejects a garbage signature after the one key re-fetch', async () => {
    const { verifier, fetchKey } = makeVerifier();
    const d = delivery({ signature: 'AAAA' });
    expect(await verifier.verify(d.headers, d.body)).toBe('bad-signature');
    // Cold cache: the first attempt had no key, so one fetch; the retry
    // used the same fetched key.
    expect(fetchKey).toHaveBeenCalledTimes(1);
  });

  it('key rotation: stale cached key → re-fetch → ok', async () => {
    let served = WRONG_PEM;
    const fetchKey = vi.fn(async () => served);
    const verifier = KickWebhookVerifier.forTest({ fetchKey, now: () => NOW });

    // Warm the cache with the wrong key (delivery fails end-to-end).
    const bad = delivery({ messageId: '01JROTATEA' });
    expect(await verifier.verify(bad.headers, bad.body)).toBe(
      'bad-signature'
    );

    // The key "rotates" server-side; the next delivery re-fetches once
    // and verifies.
    served = PUBLIC_PEM;
    const good = delivery({ messageId: '01JROTATEB' });
    expect(await verifier.verify(good.headers, good.body)).toBe('ok');
  });

  it("returns 'no-key' when no key can be fetched at all", async () => {
    const { verifier } = makeVerifier(null);
    const d = delivery();
    expect(await verifier.verify(d.headers, d.body)).toBe('no-key');
  });

  it('rejects a stale timestamp (and a future-skewed one)', async () => {
    const { verifier } = makeVerifier();
    const past = delivery({
      messageId: '01JSTALEPAST',
      timestamp: new Date(NOW - 3600_000).toISOString(),
    });
    expect(await verifier.verify(past.headers, past.body)).toBe('stale');

    const future = delivery({
      messageId: '01JSTALEFUT',
      timestamp: new Date(NOW + 3600_000).toISOString(),
    });
    expect(await verifier.verify(future.headers, future.body)).toBe('stale');
  });

  it('deduplicates a replayed messageId', async () => {
    const { verifier } = makeVerifier();
    const d = delivery({ messageId: '01JREPLAYED' });
    expect(await verifier.verify(d.headers, d.body)).toBe('ok');
    expect(await verifier.verify(d.headers, d.body)).toBe('duplicate');
  });

  it('rejects missing headers / unparseable timestamp as malformed', async () => {
    const { verifier } = makeVerifier();
    const d = delivery();
    expect(
      await verifier.verify({ ...d.headers, signature: '' }, d.body)
    ).toBe('malformed');
    expect(
      await verifier.verify({ ...d.headers, messageId: '' }, d.body)
    ).toBe('malformed');
    expect(
      await verifier.verify(
        { ...d.headers, timestamp: 'not-a-date' },
        d.body
      )
    ).toBe('malformed');
  });
});
