/**
 * Forum subscription handlers — the document-change observer's inbound
 * surface. `forum-subscribe` / `forum-unsubscribe` route into
 * `ForumSubscriptionApi`; structural payload shape-checks only (the Api
 * does the substrate-level validation + error envelopes).
 */

import { ForumSubscriptionApi } from '../../mud/api/forum-subscription';
import type {
  ForumSubscribeMessage,
  ForumUnsubscribeMessage,
} from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handleForumSubscribe: InboundHandler = (ctx, message) => {
  const payload = message.payload as ForumSubscribeMessage | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;
  const scope = payload.scope;
  if (
    !scope ||
    (scope.kind !== 'index' &&
      scope.kind !== 'board' &&
      scope.kind !== 'thread') ||
    typeof scope.id !== 'string'
  ) {
    return;
  }
  // Guard the async handler: a rejection here would otherwise surface as
  // an unhandled rejection (which the server treats as fatal).
  ForumSubscriptionApi.handleSubscribe({
    interactive: ctx.interactive,
    subscriptionId: payload.subscriptionId,
    scope,
  }).catch((err) => {
    console.error("forum-subscribe handler error:", err);
  });
};

export const handleForumUnsubscribe: InboundHandler = (ctx, message) => {
  const payload = message.payload as ForumUnsubscribeMessage | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;
  ForumSubscriptionApi.handleUnsubscribe(ctx.interactive, payload.subscriptionId);
};
