/**
 * The one subscription wire (navigation-server D1): `subscribe` and
 * `unsubscribe`, for every source. The source is named by its template
 * path and loaded on use by `SubscriptionApi`, which refuses a path whose
 * class does not compose `SubscriptionSourceMixin` before standing it up.
 *
 * ⭐ The protocol is read-only: a subscription keeps a copy current; it
 * never writes what a client asks it to (README § no generic write
 * channel).
 */

import type {
  SubscribeMessage,
  UnsubscribeMessage,
  SubscriptionPauseMessage,
  SubscriptionResumeMessage,
} from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handleSubscribe: InboundHandler = (ctx, message) => {
  const payload = message.payload as Partial<SubscribeMessage> | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;
  if (typeof payload.source !== 'string' || payload.source.length === 0) {
    ctx.interactive.sendEnvelope({
      type: 'subscription-error',
      subscriptionId: payload.subscriptionId,
      reason: 'source',
      detail: 'source required',
    });
    return;
  }
  // Guard an async open: a rejection here would otherwise surface as an
  // unhandled rejection (which the server treats as fatal).
  const opened = ctx.interactive.subscribe(payload.subscriptionId,
    payload.source,
    payload.params,
  );
  if (opened instanceof Promise) {
    opened.catch((err) => {
      console.error('subscribe handler error:', err);
    });
  }
};

export const handleUnsubscribe: InboundHandler = (ctx, message) => {
  const payload = message.payload as Partial<UnsubscribeMessage> | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;
  ctx.interactive.cancelSubscription(payload.subscriptionId);
};

/**
 * ⭐ The client says a subscription it holds is not on screen (crowded-rooms
 * D4) — a card scrolled away, minimized, behind a `full` card, or the tab
 * hidden. One fact, one source: the server never infers it.
 */
export const handleSubscriptionPause: InboundHandler = (ctx, message) => {
  const payload = message.payload as Partial<SubscriptionPauseMessage> | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;
  ctx.interactive.pauseSubscription(payload.subscriptionId);
};

/** ⭐ …and on screen again: one fresh result at `rev` 0, then deltas. */
export const handleSubscriptionResume: InboundHandler = (ctx, message) => {
  const payload = message.payload as Partial<SubscriptionResumeMessage> | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;
  ctx.interactive.resumeSubscription(payload.subscriptionId);
};
