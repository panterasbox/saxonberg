/**
 * KickWebhookRoutes — supertest against a minimal Express app with the
 * route mounted exactly as Server does (route-local raw body, NO global
 * json parser before it). Signs deliveries with a synthetic keypair via
 * a `KickWebhookVerifier.forTest` instance swapped in through the
 * singleton seam.
 *
 * Proves: verified POST → 200 + one `handleInbound`; tampered body →
 * 401 + no dispatch; replayed messageId → 200 + dispatch ONCE;
 * non-chat event → 200 + no dispatch; unconfigured reader → 404;
 * multi-byte UTF-8 body → byte-exact verification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { createSign, generateKeyPairSync } from 'crypto';
import { KickWebhookRoutes } from '../KickWebhookRoutes';
import { KickWebhookVerifier } from '../KickWebhookVerifier';
import { KickRelayReader } from '../KickRelayReader';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const PUBLIC_PEM = publicKey.export({ type: 'spki', format: 'pem' }) as string;

function makeApp(): Express {
  const app = express();
  // Mirror Server: the webhook route mounts BEFORE any body parser.
  KickWebhookRoutes.setup(app);
  app.use(express.json());
  return app;
}

let seq = 0;
function signedPost(
  app: Express,
  body: string,
  over?: { messageId?: string; tamper?: string; eventType?: string }
) {
  const messageId = over?.messageId ?? `01JTEST${++seq}`;
  const timestamp = new Date().toISOString();
  const signature = createSign('RSA-SHA256')
    .update(Buffer.from(`${messageId}.${timestamp}.${body}`, 'utf8'))
    .sign(privateKey, 'base64');
  return request(app)
    .post(KickWebhookRoutes.PATH)
    .set('Kick-Event-Message-Id', messageId)
    .set('Kick-Event-Message-Timestamp', timestamp)
    .set('Kick-Event-Signature', signature)
    .set('Kick-Event-Type', over?.eventType ?? 'chat.message.sent')
    .set('Kick-Event-Version', '1')
    .set('Content-Type', 'application/json')
    .send(over?.tamper ?? body);
}

const CHAT_BODY = JSON.stringify({
  broadcaster: { user_id: 123 },
  sender: { user_id: 456, username: 'fan' },
  content: 'nice',
});

describe('KickWebhookRoutes', () => {
  let handleInbound: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    handleInbound = vi.fn();
    vi.spyOn(KickRelayReader, 'get').mockReturnValue({
      isConfigured: () => true,
      handleInbound,
    } as unknown as KickRelayReader);
    vi.spyOn(KickWebhookVerifier, 'get').mockReturnValue(
      KickWebhookVerifier.forTest({ fetchKey: async () => PUBLIC_PEM })
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a valid signed chat delivery → 200 + handleInbound(parsed)', async () => {
    const res = await signedPost(makeApp(), CHAT_BODY);
    expect(res.status).toBe(200);
    expect(handleInbound).toHaveBeenCalledTimes(1);
    expect(handleInbound.mock.calls[0]![0]).toMatchObject({
      content: 'nice',
    });
  });

  it('a tampered body → 401, no dispatch', async () => {
    const res = await signedPost(makeApp(), CHAT_BODY, {
      tamper: CHAT_BODY.replace('nice', 'evil'),
    });
    expect(res.status).toBe(401);
    expect(handleInbound).not.toHaveBeenCalled();
  });

  it('a replayed messageId → 200 both times, dispatch ONCE', async () => {
    const app = makeApp();
    const messageId = '01JREPLAYME';
    const first = await signedPost(app, CHAT_BODY, { messageId });
    const second = await signedPost(app, CHAT_BODY, { messageId });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(handleInbound).toHaveBeenCalledTimes(1);
  });

  it('a non-chat event type is acked but not dispatched', async () => {
    const res = await signedPost(makeApp(), CHAT_BODY, {
      eventType: 'channel.followed',
    });
    expect(res.status).toBe(200);
    expect(handleInbound).not.toHaveBeenCalled();
  });

  it('unconfigured transport → 404 (dormant, no info leak)', async () => {
    vi.spyOn(KickRelayReader, 'get').mockReturnValue({
      isConfigured: () => false,
      handleInbound,
    } as unknown as KickRelayReader);
    const res = await signedPost(makeApp(), CHAT_BODY);
    expect(res.status).toBe(404);
    expect(handleInbound).not.toHaveBeenCalled();
  });

  it('a multi-byte UTF-8 body verifies byte-exactly', async () => {
    const body = JSON.stringify({
      broadcaster: { user_id: 123 },
      sender: { user_id: 456, username: 'fan' },
      content: 'héllo — ⚡ tabs\tand\nnewlines',
    });
    const res = await signedPost(makeApp(), body);
    expect(res.status).toBe(200);
    expect(handleInbound).toHaveBeenCalledTimes(1);
  });
});
