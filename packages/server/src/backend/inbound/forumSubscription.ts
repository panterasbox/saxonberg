/**
 * Forum subscription handlers — the document-change observer's inbound
 * surface. `forum-subscribe` / `forum-unsubscribe` route into
 * `ForumsApi`; structural payload shape-checks only (the Api does the
 * substrate-level validation + error envelopes).
 */

import { ForumsApi } from '../../mud/api/forums';
import type {
  ForumSubscribeMessage,
  ForumUnsubscribeMessage,
} from '@saxonberg/types';
import { FORUM_SCOPE_KINDS } from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handleForumSubscribe: InboundHandler = (ctx, message) => {
  const payload = message.payload as ForumSubscribeMessage | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;
  const scope = payload.scope;
  /*
   * ⚠⚠ **A SECOND copy of the scope vocabulary, and it drifted.**
   *
   * Adding `subjects` to `ForumSubscriptionScope` and to the registry's
   * own validation was not enough: this shape-check listed the kinds
   * literally, did not know the new one, and **returned silently**. The
   * client opened a `subjects` subscription, the server dropped the
   * message on the floor without an error envelope, and the rail sat on
   * its empty state saying "no subjects you can see yet" — which is a
   * sentence that reads exactly like the truth.
   *
   * Found by driving: the subject existed, the rail claimed it did not.
   * Nothing failed, because the failure WAS the silence.
   *
   * The list is derived from the type's own vocabulary now, so a fifth
   * kind cannot be admitted upstream and dropped here.
   */
  if (!scope || typeof scope.id !== 'string') return;
  if (!(FORUM_SCOPE_KINDS as readonly string[]).includes(scope.kind)) return;
  // Guard the async handler: a rejection here would otherwise surface as
  // an unhandled rejection (which the server treats as fatal).
  ForumsApi.handleSubscribe({
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
  ctx.interactive.cancelForumSubscription(payload.subscriptionId);
};
