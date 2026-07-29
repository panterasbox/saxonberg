/**
 * KickWebhookRoutes — the inbound receiver for Kick's webhook-delivered
 * events (the first webhook receiver in the streaming stack).
 *
 * Security invariants (see docs/subsystems/streaming.md):
 *  - The route mounts BEFORE the global body parser (byte-exact raw body
 *    is required for signature verification — `express.json()` consumes
 *    the stream irrecoverably) and BEFORE session/passport, so it
 *    structurally cannot touch auth middleware state.
 *  - Verification precedes ALL parsing/dispatch: an unverifiable payload
 *    is dropped with a warn (reason + messageId only — never the body,
 *    signature, or any token).
 *  - `duplicate` is acked 200 (at-least-once redelivery is not an error;
 *    acking stops retries) but never re-dispatched.
 *  - Unconfigured transport → 404 (dormant, no info leak).
 */

import express, { type Express, type Request, type Response } from 'express';
import { KickRelayReader } from './KickRelayReader';
import { KickWebhookVerifier } from './KickWebhookVerifier';

export class KickWebhookRoutes {
  public static readonly PATH = '/webhooks/kick';

  public static setup(app: Express): void {
    app.post(
      KickWebhookRoutes.PATH,
      express.raw({ type: () => true, limit: '256kb' }),
      (req, res) => void KickWebhookRoutes.handle(req, res)
    );
  }

  private static async handle(req: Request, res: Response): Promise<void> {
    if (!KickRelayReader.get().isConfigured()) {
      res.status(404).end();
      return;
    }

    const headers = {
      messageId: req.header('Kick-Event-Message-Id') ?? '',
      timestamp: req.header('Kick-Event-Message-Timestamp') ?? '',
      signature: req.header('Kick-Event-Signature') ?? '',
      eventType: req.header('Kick-Event-Type') ?? '',
      eventVersion: req.header('Kick-Event-Version') ?? '',
    };
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.alloc(0);

    const result = await KickWebhookVerifier.get().verify(headers, rawBody);

    if (result === 'ok') {
      res.status(200).end();
      if (headers.eventType !== 'chat.message.sent') return;
      try {
        const parsed: unknown = JSON.parse(rawBody.toString('utf8'));
        KickRelayReader.get().handleInbound(parsed);
      } catch {
        // Verified-but-unparseable: drop silently (already acked).
      }
      return;
    }

    if (result === 'duplicate') {
      // Redelivery of an already-processed message — ack, no dispatch.
      res.status(200).end();
      return;
    }

    console.warn(
      `KickWebhookRoutes: dropped delivery (${result}) ` +
        `messageId=${headers.messageId || '(none)'}`
    );
    res.status(401).end();
  }
}
