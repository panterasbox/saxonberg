/**
 * MQL handlers — live query substrate inbound surface.
 *
 * Three top-level message types share this file because they all
 * route into `MqlSubscriptionApi`. Substrate-level validation
 * (duplicate ids, parse, focus + cardinality cross-checks) runs
 * inside the Api; these handlers do only structural payload
 * shape-checks and bail silently on mismatch.
 *
 * If ops climb past ~5 (pause / resume / history-replay / …),
 * fold into a discriminated `{ type: 'mql', op: '...' }` envelope
 * — see `README.md`.
 */

import { MqlSubscriptionApi } from '../../mud/api/mql-subscription';
import { SHELF_SUBSCRIPTION } from '../../mud/lib/connection/Cards';
import type {
  MqlSubscribeMessage,
  MqlUnsubscribeMessage,
  MqlQueryMessage,
} from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handleMqlSubscribe: InboundHandler = (ctx, message) => {
  const payload = message.payload as MqlSubscribeMessage | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;

  /*
   * ⭐⭐ **The client cannot name a CARD here, and that is AC 1 enforced
   * by the protocol.** A card exists because a command caused the server
   * to push it, so there is nothing for a client to ask for. What
   * remains is exactly one CHROME subscription — the widget shelf's
   * `self` figures, which is not a card (no pinned-ness, no lifetime)
   * and whose whole shape still comes from the server's own catalogue.
   */
  if (payload.chrome === 'self') {
    MqlSubscriptionApi.handleSubscribe({
      interactive: ctx.interactive,
      subscriptionId: payload.subscriptionId,
      query: SHELF_SUBSCRIPTION.query,
      cardinality: SHELF_SUBSCRIPTION.cardinality,
      fields: SHELF_SUBSCRIPTION.fields,
    });
    return;
  }

  if (
    typeof payload.query !== 'string' ||
    (payload.cardinality !== 'one' && payload.cardinality !== 'many')
  ) {
    return;
  }
  MqlSubscriptionApi.handleSubscribe({
    interactive: ctx.interactive,
    subscriptionId: payload.subscriptionId,
    query: payload.query,
    cardinality: payload.cardinality,
    fields: payload.fields,
    detailKey: payload.detailKey,
    focusDependent: payload.focusDependent,
    locationDependent: payload.locationDependent,
  });
};

export const handleMqlUnsubscribe: InboundHandler = (ctx, message) => {
  const payload = message.payload as MqlUnsubscribeMessage | undefined;
  if (!payload || typeof payload.subscriptionId !== 'string') return;
  MqlSubscriptionApi.handleUnsubscribe(
    ctx.interactive,
    payload.subscriptionId,
  );
};

export const handleMqlQuery: InboundHandler = (ctx, message) => {
  const payload = message.payload as MqlQueryMessage | undefined;
  if (!payload || typeof payload.queryId !== 'string') return;
  // ⚠ NOT card-aware, deliberately. A one-shot query is not a card: it
  // has no lifetime, nothing durable refers to it, and giving it a
  // catalogue name would imply a persistence it does not have.
  if (
    typeof payload.query !== 'string' ||
    (payload.cardinality !== 'one' && payload.cardinality !== 'many')
  ) {
    return;
  }
  MqlSubscriptionApi.handleQuery({
    interactive: ctx.interactive,
    queryId: payload.queryId,
    query: payload.query,
    cardinality: payload.cardinality,
    fields: payload.fields,
    detailKey: payload.detailKey,
  });
};
